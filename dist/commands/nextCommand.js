"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleNextCommand = handleNextCommand;
const searchStateService_1 = require("../services/searchStateService");
const messageFormatter_1 = require("../services/messageFormatter");
const baileysProvider_1 = require("../providers/baileysProvider");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
async function handleNextCommand(userId) {
    try {
        const items = await searchStateService_1.searchStateService.nextPage(userId);
        for (const item of items) {
            await baileysProvider_1.baileysProvider.sendText(userId, messageFormatter_1.messageFormatter.formatResultItem(item));
        }
    }
    catch (err) {
        if (err instanceof types_1.BotError) {
            if (err.code === types_1.ErrorCode.NO_ACTIVE_SESSION) {
                await baileysProvider_1.baileysProvider.sendText(userId, `ℹ️ ${err.message}`);
                return;
            }
            if (err.code === types_1.ErrorCode.VIDEO_NOT_FOUND) {
                await baileysProvider_1.baileysProvider.sendText(userId, messageFormatter_1.messageFormatter.formatNoMoreResults());
                return;
            }
        }
        logger_1.logger.error('Next command failed', { userId, error: err.message });
        await baileysProvider_1.baileysProvider.sendText(userId, '⚠️ Terjadi kesalahan saat memuat hasil berikutnya.');
    }
}
//# sourceMappingURL=nextCommand.js.map