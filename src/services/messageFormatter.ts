import { SearchResultItem } from '../types';

export const messageFormatter = {
  /** One formatted block per result, per spec: [n] Judul / Link / Thumbnail. */
  formatResultItem(item: SearchResultItem): string {
    return [
      `[${item.globalIndex}]`,
      `Judul: ${item.title}`,
      `Link: ${item.url}`,
      `Thumbnail: ${item.thumbnail}`,
    ].join('\n');
  },

  formatNoMoreResults(): string {
    return '❌ Tidak ada hasil tambahan untuk pencarian ini. Coba kata kunci baru.';
  },

  formatSearchIntro(query: string): string {
    return `🔎 Mencari "${query}"...`;
  },

  formatProcessing(): string {
    return '⏳ Sedang diproses...';
  },

  formatDownloadCaption(title: string): string {
    return `Video berhasil diproses.\nJudul: ${title}`;
  },

  formatFileTooLarge(title: string, url: string, sizeMb: number, maxMb: number): string {
    return [
      `⚠️ Video terlalu besar untuk dikirim lewat WhatsApp (${sizeMb.toFixed(1)}MB, batas ${maxMb}MB).`,
      `Judul: ${title}`,
      `Silakan unduh langsung melalui link berikut:`,
      url,
    ].join('\n');
  },
};
