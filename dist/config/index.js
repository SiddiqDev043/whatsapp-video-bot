"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
function num(name, fallback) {
    const v = process.env[name];
    return v ? Number(v) : fallback;
}
exports.config = {
    nodeEnv: process.env.NODE_ENV || 'development',
    logLevel: process.env.LOG_LEVEL || 'info',
    dbPath: process.env.DB_PATH || path_1.default.join(process.cwd(), 'data', 'bot.db'),
    authDir: process.env.AUTH_DIR || path_1.default.join(process.cwd(), 'data', 'auth'),
    resultsPerPage: num('RESULTS_PER_PAGE', 5),
    searchCacheTtlSeconds: num('SEARCH_CACHE_TTL_SECONDS', 1800),
    downloadDir: process.env.DOWNLOAD_DIR ||
        path_1.default.join(process.cwd(), 'data', 'downloads'),
    // Naikkan limit default menjadi 500 MB
    maxWhatsappVideoMb: num('MAX_WHATSAPP_VIDEO_MB', 500),
    ytDlpPath: process.env.YTDLP_PATH || 'yt-dlp',
    rateLimitWindowMs: num('RATE_LIMIT_WINDOW_MS', 60000),
    rateLimitMaxRequests: num('RATE_LIMIT_MAX_REQUESTS', 10),
    downloadQueueConcurrency: num('DOWNLOAD_QUEUE_CONCURRENCY', 2),
};
//# sourceMappingURL=index.js.map