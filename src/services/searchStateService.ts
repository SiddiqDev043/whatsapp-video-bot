import { searchRepository } from '../database/repositories/searchRepository';
import { youtubeService } from './youtubeService';
import { SearchResultItem, BotError, ErrorCode } from '../types';

export const searchStateService = {
  /** Starts a fresh search: resets global index counter for this user and fetches page 0. */
  async startSearch(userId: string, query: string): Promise<SearchResultItem[]> {
    searchRepository.startNewSession(userId, query);
    const rawResults = await youtubeService.searchPage(query, 0);
    return searchRepository.appendItems(userId, rawResults);
  },

  /** Continues the last search for a user ("next"). */
  async nextPage(userId: string): Promise<SearchResultItem[]> {
    const session = searchRepository.getSession(userId);
    if (!session) {
      throw new BotError(
        ErrorCode.NO_ACTIVE_SESSION,
        'Belum ada pencarian aktif. Silakan cari terlebih dahulu, contoh: "carikan drama china".',
      );
    }
    const nextPageIndex = session.page + 1;
    const rawResults = await youtubeService.searchPage(session.query, nextPageIndex);
    searchRepository.advancePage(userId, nextPageIndex);
    return searchRepository.appendItems(userId, rawResults);
  },

  getItemByGlobalIndex(userId: string, globalIndex: number): SearchResultItem {
    const item = searchRepository.getItemByIndex(userId, globalIndex);
    if (!item) {
      throw new BotError(
        ErrorCode.INVALID_INDEX,
        `Nomor ${globalIndex} tidak ditemukan di riwayat pencarian Anda. Pastikan nomor sudah pernah muncul di hasil pencarian.`,
      );
    }
    return item;
  },
};
