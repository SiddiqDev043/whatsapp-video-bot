import "./server";
import './database/db'; // ensures schema is initialized on boot
import { baileysProvider } from './providers/baileysProvider';
import { routeIncomingMessage } from './commands/commandRouter';
import { logger } from './utils/logger';

async function main() {
  logger.info('Starting WhatsApp video bot...');

  baileysProvider.setIncomingHandler(async (userId, text) => {
    await routeIncomingMessage(userId, text);
  });

  await baileysProvider.start();
}

main().catch((err) => {
  logger.error('Fatal error during startup', { error: err.message, stack: err.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason });
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught exception', { error: err.message, stack: err.stack });
});
