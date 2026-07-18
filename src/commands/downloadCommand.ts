import { searchStateService } from '../services/searchStateService';
import { downloadService } from '../services/downloadService';
import { messageFormatter } from '../services/messageFormatter';
import { baileysProvider } from '../providers/baileysProvider';
import { enqueueDownload } from '../utils/queue';
import { BotError, ErrorCode } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';

export async function handleDownloadCommand(userId: string, globalIndex: number): Promise<void> {
  let item;
  try {
    item = searchStateService.getItemByGlobalIndex(userId, globalIndex);
  } catch (err) {
    if (err instanceof BotError) {
      await baileysProvider.sendText(userId, `❌ ${err.message}`);
      return;
    }
    throw err;
  }

  await baileysProvider.sendText(userId, messageFormatter.formatProcessing());

  try {
    const { filePath, sizeBytes } = await enqueueDownload(() =>
      downloadService.downloadVideo(item.url, item.videoId),
    );

    if (downloadService.exceedsWhatsappLimit(sizeBytes)) {
      await baileysProvider.sendText(
        userId,
        messageFormatter.formatFileTooLarge(
          item.title,
          item.url,
          downloadService.toMb(sizeBytes),
          config.maxWhatsappVideoMb,
        ),
      );
      downloadService.cleanup(filePath);
      return;
    }

    await baileysProvider.sendVideoFile(userId, filePath, messageFormatter.formatDownloadCaption(item.title));
    downloadService.cleanup(filePath);
  } catch (err) {
    if (err instanceof BotError) {
      await baileysProvider.sendText(userId, `❌ ${err.message}`);
      return;
    }
    logger.error('Download command failed', { userId, globalIndex, error: (err as Error).message });
    await baileysProvider.sendText(userId, '⚠️ Gagal memproses video. Silakan coba lagi nanti.');
  }
}
