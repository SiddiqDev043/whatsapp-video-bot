import PQueue from 'p-queue';
import { config } from '../config';
import { logger } from './logger';

/**
 * Central queue for heavy operations (video downloads) so the bot never
 * spawns unbounded concurrent yt-dlp processes under load.
 */
export const downloadQueue = new PQueue({
  concurrency: config.downloadQueueConcurrency,
});

downloadQueue.on('active', () => {
  logger.debug('Queue tick', {
    size: downloadQueue.size,
    pending: downloadQueue.pending,
  });
});

export async function enqueueDownload<T>(task: () => Promise<T>): Promise<T> {
  return downloadQueue.add(task) as Promise<T>;
}
