"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messageFormatter = void 0;
exports.messageFormatter = {
    /** One formatted block per result, per spec: [n] Judul / Link / Thumbnail. */
    formatResultItem(item) {
        return [
            `[${item.globalIndex}]`,
            `Judul: ${item.title}`,
            `Link: ${item.url}`,
            `Thumbnail: ${item.thumbnail}`,
        ].join('\n');
    },
    formatNoMoreResults() {
        return '❌ Tidak ada hasil tambahan untuk pencarian ini. Coba kata kunci baru.';
    },
    formatSearchIntro(query) {
        return `🔎 Mencari "${query}"...`;
    },
    formatProcessing() {
        return '⏳ Sedang diproses...';
    },
    formatDownloadCaption(title) {
        return `Video berhasil diproses.\nJudul: ${title}`;
    },
    formatFileTooLarge(title, url, sizeMb, maxMb) {
        return [
            `⚠️ Video terlalu besar untuk dikirim lewat WhatsApp (${sizeMb.toFixed(1)}MB, batas ${maxMb}MB).`,
            `Judul: ${title}`,
            `Silakan unduh langsung melalui link berikut:`,
            url,
        ].join('\n');
    },
};
//# sourceMappingURL=messageFormatter.js.map