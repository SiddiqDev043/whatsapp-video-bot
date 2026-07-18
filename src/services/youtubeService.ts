import { YouTube } from 'youtube-sr';
import { config } from '../config';
import { logger } from '../utils/logger';
import { videoCacheRepository } from '../database/repositories/videoRepository';
import { YoutubeVideoResult, BotError, ErrorCode } from '../types';

function cacheKey(query: string): string {
  return `yt-search:${query.toLowerCase().trim()}`;
}

async function fetchAndCacheBatch(query: string): Promise<YoutubeVideoResult[]> {
  const key = cacheKey(query);
  const cached = videoCacheRepository.get(key);
  if (cached) {
    logger.debug('YouTube search cache hit', { query });
    return cached;
  }

  logger.info('Searching YouTube', { query });
  const raw = await YouTube.search(query, { limit: 30, type: 'video' });

  const results: YoutubeVideoResult[] = raw
    .filter((v) => v.id && v.title)
    .map((v) => ({
      videoId: v.id as string,
      title: v.title as string,
      url: v.url ?? `https://www.youtube.com/watch?v=${v.id}`,
      thumbnail: v.thumbnail?.url ?? '',
      durationText: v.durationFormatted,
      channel: v.channel?.name,
    }));

  if (results.length === 0) {
    throw new BotError(ErrorCode.VIDEO_NOT_FOUND, `Tidak ditemukan hasil untuk "${query}"`);
  }

  videoCacheRepository.set(key, results, config.searchCacheTtlSeconds);
  return results;
}

export const youtubeService = {
  /**
   * Returns the requested page (0-based) of results for a query, each page
   * sized `config.resultsPerPage`. Throws BotError(VIDEO_NOT_FOUND) if the
   * page is beyond available results.
   */
  async searchPage(query: string, page: number): Promise<YoutubeVideoResult[]> {
    const batch = await fetchAndCacheBatch(query);
    const start = page * config.resultsPerPage;
    const slice = batch.slice(start, start + config.resultsPerPage);

    if (slice.length === 0) {
      throw new BotError(
        ErrorCode.VIDEO_NOT_FOUND,
        'Tidak ada hasil tambahan. Coba kata kunci pencarian yang baru.',
      );
    }
    return slice;
  },
};
