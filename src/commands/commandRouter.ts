import { parseIntent } from '../utils/nlp';
import { rateLimiter } from '../utils/rateLimiter';
import { baileysProvider } from '../providers/baileysProvider';
import { logger } from '../utils/logger';
import { handleSearchCommand } from './searchCommand';
import { handleNextCommand } from './nextCommand';
import { handleDownloadCommand } from './downloadCommand';

export async function routeIncomingMessage(userId: string, text: string): Promise<void> {
  if (!rateLimiter.allow(userId)) {
    await baileysProvider.sendText(
      userId,
      '⏳ Terlalu banyak permintaan. Silakan tunggu sebentar sebelum mencoba lagi.',
    );
    return;
  }

  const intent = parseIntent(text);
  logger.debug('Parsed intent', { userId, intent });

  switch (intent.type) {
    case 'search':
      await handleSearchCommand(userId, intent.query as string);
      break;
    case 'next':
      await handleNextCommand(userId);
      break;
    case 'download':
      await handleDownloadCommand(userId, intent.index as number);
      break;
    default:
      await baileysProvider.sendText(
        userId,
        [
          'Maaf, saya tidak mengerti perintah itu.',
          '',
          'Contoh perintah yang bisa digunakan:',
          '- "tolong berikan saya drama china"',
          '- "carikan film korea"',
          '- "next" untuk hasil berikutnya',
          '- "download nomor 2" untuk mengunduh video',
        ].join('\n'),
      );
  }
}
