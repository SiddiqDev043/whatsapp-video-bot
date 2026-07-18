"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.youtubeService = void 0;
const youtube_sr_1 = require("youtube-sr");
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const videoRepository_1 = require("../database/repositories/videoRepository");
const types_1 = require("../types");
function cacheKey(query) {
    return `yt-search:${query.toLowerCase().trim()}`;
}
async function fetchAndCacheBatch(query) {
    const key = cacheKey(query);
    const cached = videoRepository_1.videoCacheRepository.get(key);
    if (cached) {
        logger_1.logger.debug('YouTube search cache hit', { query });
        return cached;
    }
    logger_1.logger.info('Searching YouTube', { query });
    const raw = await youtube_sr_1.YouTube.search(query, { limit: 30, type: 'video' });
    const results = raw
        .filter((v) => v.id && v.title)
        .map((v) => ({
        videoId: v.id,
        title: v.title,
        url: v.url ?? `https://www.youtube.com/watch?v=${v.id}`,
        thumbnail: v.thumbnail?.url ?? '',
        durationText: v.durationFormatted,
        channel: v.channel?.name,
    }));
    if (results.length === 0) {
        throw new types_1.BotError(types_1.ErrorCode.VIDEO_NOT_FOUND, `Tidak ditemukan hasil untuk "${query}"`);
    }
    videoRepository_1.videoCacheRepository.set(key, results, config_1.config.searchCacheTtlSeconds);
    return results;
}
exports.youtubeService = {
    /**
     * Returns the requested page (0-based) of results for a query, each page
     * sized `config.resultsPerPage`. Throws BotError(VIDEO_NOT_FOUND) if the
     * page is beyond available results.
     */
    async searchPage(query, page) {
        const batch = await fetchAndCacheBatch(query);
        const start = page * config_1.config.resultsPerPage;
        const slice = batch.slice(start, start + config_1.config.resultsPerPage);
        if (slice.length === 0) {
            throw new types_1.BotError(types_1.ErrorCode.VIDEO_NOT_FOUND, 'Tidak ada hasil tambahan. Coba kata kunci pencarian yang baru.');
        }
        return slice;
    },
};
//# sourceMappingURL=youtubeService.js.map