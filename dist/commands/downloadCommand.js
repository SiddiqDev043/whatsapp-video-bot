"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleDownloadCommand = handleDownloadCommand;
const searchStateService_1 = require("../services/searchStateService");
const downloadService_1 = require("../services/downloadService");
const messageFormatter_1 = require("../services/messageFormatter");
const baileysProvider_1 = require("../providers/baileysProvider");
const queue_1 = require("../utils/queue");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
const config_1 = require("../config");
async function handleDownloadCommand(userId, globalIndex) {
    let item;
    try {
        item = searchStateService_1.searchStateService.getItemByGlobalIndex(userId, globalIndex);
    }
    catch (err) {
        if (err instanceof types_1.BotError) {
            await baileysProvider_1.baileysProvider.sendText(userId, `❌ ${err.message}`);
            return;
        }
        throw err;
    }
    await baileysProvider_1.baileysProvider.sendText(userId, messageFormatter_1.messageFormatter.formatProcessing());
    try {
        const { filePath, sizeBytes } = await (0, queue_1.enqueueDownload)(() => downloadService_1.downloadService.downloadVideo(item.url, item.videoId));
        if (downloadService_1.downloadService.exceedsWhatsappLimit(sizeBytes)) {
            await baileysProvider_1.baileysProvider.sendText(userId, messageFormatter_1.messageFormatter.formatFileTooLarge(item.title, item.url, downloadService_1.downloadService.toMb(sizeBytes), config_1.config.maxWhatsappVideoMb));
            downloadService_1.downloadService.cleanup(filePath);
            return;
        }
        await baileysProvider_1.baileysProvider.sendVideoFile(userId, filePath, messageFormatter_1.messageFormatter.formatDownloadCaption(item.title));
        downloadService_1.downloadService.cleanup(filePath);
    }
    catch (err) {
        if (err instanceof types_1.BotError) {
            await baileysProvider_1.baileysProvider.sendText(userId, `❌ ${err.message}`);
            return;
        }
        logger_1.logger.error('Download command failed', { userId, globalIndex, error: err.message });
        await baileysProvider_1.baileysProvider.sendText(userId, '⚠️ Gagal memproses video. Silakan coba lagi nanti.');
    }
}
//# sourceMappingURL=downloadCommand.js.map