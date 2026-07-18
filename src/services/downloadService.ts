import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';
import { BotError, ErrorCode } from '../types';

fs.mkdirSync(config.downloadDir, { recursive: true });

interface DownloadResult {
  filePath: string;
  sizeBytes: number;
}

/**
 * Downloads a single video via yt-dlp. Requires the `yt-dlp` binary to be
 * present on PATH (see Dockerfile). Errors from yt-dlp's stderr are mapped
 * to domain-specific BotError codes so the bot can respond appropriately.
 */
function mapYtDlpError(stderr: string): BotError {
  const s = stderr.toLowerCase();
  if (s.includes('video unavailable') || s.includes('not available on this app')) {
    return new BotError(ErrorCode.VIDEO_NOT_FOUND, 'Video tidak ditemukan atau sudah dihapus.');
  }
  if (s.includes('not available in your country') || s.includes('region')) {
    return new BotError(ErrorCode.REGION_RESTRICTED, 'Video ini dibatasi untuk wilayah tertentu.');
  }
  if (s.includes('unable to download') || s.includes('http error') || s.includes('malformed')) {
    return new BotError(ErrorCode.BROKEN_LINK, 'Link video rusak atau tidak dapat diakses.');
  }
  return new BotError(ErrorCode.DOWNLOAD_FAILED, 'Gagal mengunduh video. Silakan coba lagi nanti.');
}

export const downloadService = {
  async downloadVideo(videoUrl: string, videoId: string): Promise<DownloadResult> {
    const outputTemplate = path.join(config.downloadDir, `${videoId}-%(id)s.%(ext)s`);

    return new Promise((resolve, reject) => {
      const args = [
        videoUrl,
        '-f',
        'mp4[height<=720]/best[ext=mp4]/best',
        '-o',
        outputTemplate,
        '--no-playlist',
        '--no-warnings',
      ];

      const proc = spawn(config.ytDlpPath, args);
      let stderr = '';

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        // e.g. yt-dlp binary not found
        logger.error('Failed to spawn yt-dlp', { error: err.message });
        reject(new BotError(ErrorCode.DOWNLOAD_FAILED, 'Layanan download sedang bermasalah.'));
      });

      proc.on('close', (code) => {
        if (code !== 0) {
          logger.warn('yt-dlp exited with error', { code, stderr: stderr.slice(-500) });
          reject(mapYtDlpError(stderr));
          return;
        }

        const files = fs
          .readdirSync(config.downloadDir)
          .filter((f) => f.startsWith(`${videoId}-`));

        if (files.length === 0) {
          reject(new BotError(ErrorCode.DOWNLOAD_FAILED, 'File hasil download tidak ditemukan.'));
          return;
        }

        const filePath = path.join(config.downloadDir, files[0]);
        const sizeBytes = fs.statSync(filePath).size;
        resolve({ filePath, sizeBytes });
      });
    });
  },

  cleanup(filePath: string): void {
    fs.unlink(filePath, (err) => {
      if (err) logger.warn('Failed to clean up downloaded file', { filePath, error: err.message });
    });
  },

  exceedsWhatsappLimit(sizeBytes: number): boolean {
    const mb = sizeBytes / (1024 * 1024);
    return mb > config.maxWhatsappVideoMb;
  },

  toMb(sizeBytes: number): number {
    return sizeBytes / (1024 * 1024);
  },
};
