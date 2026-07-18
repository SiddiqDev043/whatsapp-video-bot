import { searchStateService } from '../services/searchStateService';
import { messageFormatter } from '../services/messageFormatter';
import { baileysProvider } from '../providers/baileysProvider';
import { BotError, ErrorCode } from '../types';
import { logger } from '../utils/logger';

export async function handleNextCommand(userId: string): Promise<void> {
  try {
    const items = await searchStateService.nextPage(userId);
    for (const item of items) {
      await baileysProvider.sendText(userId, messageFormatter.formatResultItem(item));
    }
  } catch (err) {
    if (err instanceof BotError) {
      if (err.code === ErrorCode.NO_ACTIVE_SESSION) {
        await baileysProvider.sendText(userId, `ℹ️ ${err.message}`);
        return;
      }
      if (err.code === ErrorCode.VIDEO_NOT_FOUND) {
        await baileysProvider.sendText(userId, messageFormatter.formatNoMoreResults());
        return;
      }
    }
    logger.error('Next command failed', { userId, error: (err as Error).message });
    await baileysProvider.sendText(userId, '⚠️ Terjadi kesalahan saat memuat hasil berikutnya.');
  }
}
