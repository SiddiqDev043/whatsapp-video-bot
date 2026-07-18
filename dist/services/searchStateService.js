"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchStateService = void 0;
const searchRepository_1 = require("../database/repositories/searchRepository");
const youtubeService_1 = require("./youtubeService");
const types_1 = require("../types");
exports.searchStateService = {
    /** Starts a fresh search: resets global index counter for this user and fetches page 0. */
    async startSearch(userId, query) {
        searchRepository_1.searchRepository.startNewSession(userId, query);
        const rawResults = await youtubeService_1.youtubeService.searchPage(query, 0);
        return searchRepository_1.searchRepository.appendItems(userId, rawResults);
    },
    /** Continues the last search for a user ("next"). */
    async nextPage(userId) {
        const session = searchRepository_1.searchRepository.getSession(userId);
        if (!session) {
            throw new types_1.BotError(types_1.ErrorCode.NO_ACTIVE_SESSION, 'Belum ada pencarian aktif. Silakan cari terlebih dahulu, contoh: "carikan drama china".');
        }
        const nextPageIndex = session.page + 1;
        const rawResults = await youtubeService_1.youtubeService.searchPage(session.query, nextPageIndex);
        searchRepository_1.searchRepository.advancePage(userId, nextPageIndex);
        return searchRepository_1.searchRepository.appendItems(userId, rawResults);
    },
    getItemByGlobalIndex(userId, globalIndex) {
        const item = searchRepository_1.searchRepository.getItemByIndex(userId, globalIndex);
        if (!item) {
            throw new types_1.BotError(types_1.ErrorCode.INVALID_INDEX, `Nomor ${globalIndex} tidak ditemukan di riwayat pencarian Anda. Pastikan nomor sudah pernah muncul di hasil pencarian.`);
        }
        return item;
    },
};
//# sourceMappingURL=searchStateService.js.map