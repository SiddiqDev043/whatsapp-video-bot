"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleSearchCommand = handleSearchCommand;
const searchStateService_1 = require("../services/searchStateService");
const messageFormatter_1 = require("../services/messageFormatter");
const baileysProvider_1 = require("../providers/baileysProvider");
const types_1 = require("../types");
const logger_1 = require("../utils/logger");
async function handleSearchCommand(userId, query) {
    try {
        const items = await searchStateService_1.searchStateService.startSearch(userId, query);
        for (const item of items) {
            await baileysProvider_1.baileysProvider.sendText(userId, messageFormatter_1.messageFormatter.formatResultItem(item));
        }
    }
    catch (err) {
        if (err instanceof types_1.BotError && err.code === types_1.ErrorCode.VIDEO_NOT_FOUND) {
            await baileysProvider_1.baileysProvider.sendText(userId, `❌ ${err.message}`);
            return;
        }
        logger_1.logger.error('Search command failed', { userId, query, error: err.message });
        await baileysProvider_1.baileysProvider.sendText(userId, '⚠️ Terjadi kesalahan saat mencari video. Silakan coba lagi.');
    }
}
//# sourceMappingURL=searchCommand.js.map