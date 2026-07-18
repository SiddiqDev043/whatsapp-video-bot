import { db } from '../db';
import { YoutubeVideoResult } from '../../types';

const getCacheStmt = db.prepare(`SELECT payload, expires_at FROM search_cache WHERE cache_key = ?`);
const setCacheStmt = db.prepare(`
  INSERT INTO search_cache (cache_key, payload, expires_at)
  VALUES (@cache_key, @payload, @expires_at)
  ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at
`);
const deleteExpiredStmt = db.prepare(`DELETE FROM search_cache WHERE expires_at < ?`);

/** Persistent (survives restarts) cache for raw YouTube search pages, keyed by query+page. */
export const videoCacheRepository = {
  get(key: string): YoutubeVideoResult[] | null {
    const row = getCacheStmt.get(key) as { payload: string; expires_at: number } | undefined;
    if (!row) return null;
    if (row.expires_at < Date.now()) return null;
    try {
      return JSON.parse(row.payload) as YoutubeVideoResult[];
    } catch {
      return null;
    }
  },

  set(key: string, results: YoutubeVideoResult[], ttlSeconds: number): void {
    setCacheStmt.run({
      cache_key: key,
      payload: JSON.stringify(results),
      expires_at: Date.now() + ttlSeconds * 1000,
    });
  },

  sweepExpired(): void {
    deleteExpiredStmt.run(Date.now());
  },
};

setInterval(() => videoCacheRepository.sweepExpired(), 10 * 60_000).unref();
