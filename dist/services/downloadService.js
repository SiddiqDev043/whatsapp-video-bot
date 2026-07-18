"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadService = void 0;
const child_process_1 = require("child_process");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const types_1 = require("../types");
fs_1.default.mkdirSync(config_1.config.downloadDir, { recursive: true });
/**
 * Downloads a single video via yt-dlp. Requires the `yt-dlp` binary to be
 * present on PATH (see Dockerfile). Errors from yt-dlp's stderr are mapped
 * to domain-specific BotError codes so the bot can respond appropriately.
 */
function mapYtDlpError(stderr) {
    const s = stderr.toLowerCase();
    if (s.includes('video unavailable') || s.includes('not available on this app')) {
        return new types_1.BotError(types_1.ErrorCode.VIDEO_NOT_FOUND, 'Video tidak ditemukan atau sudah dihapus.');
    }
    if (s.includes('not available in your country') || s.includes('region')) {
        return new types_1.BotError(types_1.ErrorCode.REGION_RESTRICTED, 'Video ini dibatasi untuk wilayah tertentu.');
    }
    if (s.includes('unable to download') || s.includes('http error') || s.includes('malformed')) {
        return new types_1.BotError(types_1.ErrorCode.BROKEN_LINK, 'Link video rusak atau tidak dapat diakses.');
    }
    return new types_1.BotError(types_1.ErrorCode.DOWNLOAD_FAILED, 'Gagal mengunduh video. Silakan coba lagi nanti.');
}
exports.downloadService = {
    async downloadVideo(videoUrl, videoId) {
        const outputTemplate = path_1.default.join(config_1.config.downloadDir, `${videoId}-%(id)s.%(ext)s`);
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
            const proc = (0, child_process_1.spawn)(config_1.config.ytDlpPath, args);
            let stderr = '';
            proc.stderr.on('data', (chunk) => {
                stderr += chunk.toString();
            });
            proc.on('error', (err) => {
                // e.g. yt-dlp binary not found
                logger_1.logger.error('Failed to spawn yt-dlp', { error: err.message });
                reject(new types_1.BotError(types_1.ErrorCode.DOWNLOAD_FAILED, 'Layanan download sedang bermasalah.'));
            });
            proc.on('close', (code) => {
                if (code !== 0) {
                    logger_1.logger.warn('yt-dlp exited with error', { code, stderr: stderr.slice(-500) });
                    reject(mapYtDlpError(stderr));
                    return;
                }
                const files = fs_1.default
                    .readdirSync(config_1.config.downloadDir)
                    .filter((f) => f.startsWith(`${videoId}-`));
                if (files.length === 0) {
                    reject(new types_1.BotError(types_1.ErrorCode.DOWNLOAD_FAILED, 'File hasil download tidak ditemukan.'));
                    return;
                }
                const filePath = path_1.default.join(config_1.config.downloadDir, files[0]);
                const sizeBytes = fs_1.default.statSync(filePath).size;
                resolve({ filePath, sizeBytes });
            });
        });
    },
    cleanup(filePath) {
        fs_1.default.unlink(filePath, (err) => {
            if (err)
                logger_1.logger.warn('Failed to clean up downloaded file', { filePath, error: err.message });
        });
    },
    exceedsWhatsappLimit(sizeBytes) {
        const mb = sizeBytes / (1024 * 1024);
        return mb > config_1.config.maxWhatsappVideoMb;
    },
    toMb(sizeBytes) {
        return sizeBytes / (1024 * 1024);
    },
};
//# sourceMappingURL=downloadService.js.map