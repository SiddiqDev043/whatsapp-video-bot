import { searchStateService } from '../services/searchStateService';
import { messageFormatter } from '../services/messageFormatter';
import { baileysProvider } from '../providers/baileysProvider';
import { BotError, ErrorCode } from '../types';
import { logger } from '../utils/logger';

export async function handleSearchCommand(userId: string, query: string): Promise<void> {
  try {
    const items = await searchStateService.startSearch(userId, query);
    for (const item of items) {
      await baileysProvider.sendText(userId, messageFormatter.formatResultItem(item));
    }
  } catch (err) {
    if (err instanceof BotError && err.code === ErrorCode.VIDEO_NOT_FOUND) {
      await baileysProvider.sendText(userId, `❌ ${err.message}`);
      return;
    }
    logger.error('Search command failed', { userId, query, error: (err as Error).message });
    await baileysProvider.sendText(userId, '⚠️ Terjadi kesalahan saat mencari video. Silakan coba lagi.');
  }
}
