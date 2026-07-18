import { db } from '../db';
import { SearchResultItem } from '../../types';

interface SessionRow {
  user_id: string;
  query: string;
  page: number;
  updated_at: number;
}

interface ItemRow {
  user_id: string;
  global_index: number;
  video_id: string;
  title: string;
  url: string;
  thumbnail: string;
  duration_text: string | null;
  channel: string | null;
}

const upsertSessionStmt = db.prepare(`
  INSERT INTO search_sessions (user_id, query, page, updated_at)
  VALUES (@user_id, @query, @page, @updated_at)
  ON CONFLICT(user_id) DO UPDATE SET
    query = excluded.query,
    page = excluded.page,
    updated_at = excluded.updated_at
`);

const getSessionStmt = db.prepare(`SELECT * FROM search_sessions WHERE user_id = ?`);

const insertItemStmt = db.prepare(`
  INSERT INTO session_items (user_id, global_index, video_id, title, url, thumbnail, duration_text, channel)
  VALUES (@user_id, @global_index, @video_id, @title, @url, @thumbnail, @duration_text, @channel)
  ON CONFLICT(user_id, global_index) DO UPDATE SET
    video_id = excluded.video_id, title = excluded.title, url = excluded.url,
    thumbnail = excluded.thumbnail, duration_text = excluded.duration_text, channel = excluded.channel
`);

const getItemStmt = db.prepare(`SELECT * FROM session_items WHERE user_id = ? AND global_index = ?`);
const getMaxIndexStmt = db.prepare(`SELECT MAX(global_index) as maxIdx FROM session_items WHERE user_id = ?`);
const clearItemsStmt = db.prepare(`DELETE FROM session_items WHERE user_id = ?`);
const insertHistoryStmt = db.prepare(`INSERT INTO search_history (user_id, query, created_at) VALUES (?, ?, ?)`);

export const searchRepository = {
  /** Starts a brand-new search session for a user, wiping previous index mapping. */
  startNewSession(userId: string, query: string): void {
    clearItemsStmt.run(userId);
    upsertSessionStmt.run({ user_id: userId, query, page: 0, updated_at: Date.now() });
    insertHistoryStmt.run(userId, query, Date.now());
  },

  /** Advances the page counter for "next" without touching the query. */
  advancePage(userId: string, newPage: number): void {
    const session = getSessionStmt.get(userId) as SessionRow | undefined;
    if (!session) return;
    upsertSessionStmt.run({ user_id: userId, query: session.query, page: newPage, updated_at: Date.now() });
  },

  getSession(userId: string): { query: string; page: number } | null {
    const row = getSessionStmt.get(userId) as SessionRow | undefined;
    if (!row) return null;
    return { query: row.query, page: row.page };
  },

  /** Appends newly fetched results to the user's global index mapping, returning the assigned indices. */
  appendItems(userId: string, results: Omit<SearchResultItem, 'globalIndex'>[]): SearchResultItem[] {
    const currentMax = (getMaxIndexStmt.get(userId) as { maxIdx: number | null }).maxIdx ?? 0;
    const items: SearchResultItem[] = results.map((r, i) => ({ ...r, globalIndex: currentMax + i + 1 }));

    const insertMany = db.transaction((rows: SearchResultItem[]) => {
      for (const item of rows) {
        insertItemStmt.run({
          user_id: userId,
          global_index: item.globalIndex,
          video_id: item.videoId,
          title: item.title,
          url: item.url,
          thumbnail: item.thumbnail,
          duration_text: item.durationText ?? null,
          channel: item.channel ?? null,
        });
      }
    });
    insertMany(items);
    return items;
  },

  getItemByIndex(userId: string, globalIndex: number): SearchResultItem | null {
    const row = getItemStmt.get(userId, globalIndex) as ItemRow | undefined;
    if (!row) return null;
    return {
      globalIndex: row.global_index,
      videoId: row.video_id,
      title: row.title,
      url: row.url,
      thumbnail: row.thumbnail,
      durationText: row.duration_text ?? undefined,
      channel: row.channel ?? undefined,
    };
  },
};
