"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("./database/db"); // ensures schema is initialized on boot
const baileysProvider_1 = require("./providers/baileysProvider");
const commandRouter_1 = require("./commands/commandRouter");
const logger_1 = require("./utils/logger");
async function main() {
    logger_1.logger.info('Starting WhatsApp video bot...');
    baileysProvider_1.baileysProvider.setIncomingHandler(async (userId, text) => {
        await (0, commandRouter_1.routeIncomingMessage)(userId, text);
    });
    await baileysProvider_1.baileysProvider.start();
}
main().catch((err) => {
    logger_1.logger.error('Fatal error during startup', { error: err.message, stack: err.stack });
    process.exit(1);
});
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled promise rejection', { reason });
});
process.on('uncaughtException', (err) => {
    logger_1.logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});
//# sourceMappingURL=index.js.map