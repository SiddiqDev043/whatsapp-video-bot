"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadQueue = void 0;
exports.enqueueDownload = enqueueDownload;
const p_queue_1 = __importDefault(require("p-queue"));
const config_1 = require("../config");
const logger_1 = require("./logger");
/**
 * Central queue for heavy operations (video downloads) so the bot never
 * spawns unbounded concurrent yt-dlp processes under load.
 */
exports.downloadQueue = new p_queue_1.default({
    concurrency: config_1.config.downloadQueueConcurrency,
});
exports.downloadQueue.on('active', () => {
    logger_1.logger.debug('Queue tick', {
        size: exports.downloadQueue.size,
        pending: exports.downloadQueue.pending,
    });
});
async function enqueueDownload(task) {
    return exports.downloadQueue.add(task);
}
//# sourceMappingURL=queue.js.map