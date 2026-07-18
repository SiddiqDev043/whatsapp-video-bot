"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeIncomingMessage = routeIncomingMessage;
const nlp_1 = require("../utils/nlp");
const rateLimiter_1 = require("../utils/rateLimiter");
const baileysProvider_1 = require("../providers/baileysProvider");
const logger_1 = require("../utils/logger");
const searchCommand_1 = require("./searchCommand");
const nextCommand_1 = require("./nextCommand");
const downloadCommand_1 = require("./downloadCommand");
async function routeIncomingMessage(userId, text) {
    if (!rateLimiter_1.rateLimiter.allow(userId)) {
        await baileysProvider_1.baileysProvider.sendText(userId, '⏳ Terlalu banyak permintaan. Silakan tunggu sebentar sebelum mencoba lagi.');
        return;
    }
    const intent = (0, nlp_1.parseIntent)(text);
    logger_1.logger.debug('Parsed intent', { userId, intent });
    switch (intent.type) {
        case 'search':
            await (0, searchCommand_1.handleSearchCommand)(userId, intent.query);
            break;
        case 'next':
            await (0, nextCommand_1.handleNextCommand)(userId);
            break;
        case 'download':
            await (0, downloadCommand_1.handleDownloadCommand)(userId, intent.index);
            break;
        default:
            await baileysProvider_1.baileysProvider.sendText(userId, [
                'Maaf, saya tidak mengerti perintah itu.',
                '',
                'Contoh perintah yang bisa digunakan:',
                '- "tolong berikan saya drama china"',
                '- "carikan film korea"',
                '- "next" untuk hasil berikutnya',
                '- "download nomor 2" untuk mengunduh video',
            ].join('\n'));
    }
}
//# sourceMappingURL=commandRouter.js.map