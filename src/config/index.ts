import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function num(name: string, fallback: number): number {
  const v = process.env[name];
  return v ? Number(v) : fallback;
}

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',

  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'bot.db'),
  authDir: process.env.AUTH_DIR || path.join(process.cwd(), 'data', 'auth'),

  resultsPerPage: num('RESULTS_PER_PAGE', 5),
  searchCacheTtlSeconds: num('SEARCH_CACHE_TTL_SECONDS', 1800),

  downloadDir:
    process.env.DOWNLOAD_DIR ||
    path.join(process.cwd(), 'data', 'downloads'),

  // Naikkan limit default menjadi 500 MB
  maxWhatsappVideoMb: num('MAX_WHATSAPP_VIDEO_MB', 500),

  ytDlpPath: process.env.YTDLP_PATH || 'yt-dlp',

  rateLimitWindowMs: num('RATE_LIMIT_WINDOW_MS', 60_000),
  rateLimitMaxRequests: num('RATE_LIMIT_MAX_REQUESTS', 10),

  downloadQueueConcurrency: num('DOWNLOAD_QUEUE_CONCURRENCY', 2),
};