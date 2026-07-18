import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  proto,
  Browsers,
} from '@whiskeysockets/baileys';

import pino from 'pino';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import path from 'path';

import { config } from '../config';
import { logger } from '../utils/logger';

fs.mkdirSync(config.authDir, { recursive: true });

export type IncomingHandler = (
  userId: string,
  text: string
) => Promise<void>;

export class BaileysProvider {
  private sock: WASocket | null = null;
  private onIncoming: IncomingHandler | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private isConnecting = false;

  setIncomingHandler(handler: IncomingHandler): void {
    this.onIncoming = handler;
  }

  async start(): Promise<void> {
    if (this.isConnecting) return;

    this.isConnecting = true;

    try {
      const { state, saveCreds } =
        await useMultiFileAuthState(config.authDir);

      const credsPath = path.join(
        config.authDir,
        'creds.json'
      );

      const hasSession = fs.existsSync(credsPath);

      if (hasSession) {
        logger.info(
          'Session found. Logging in automatically.'
        );
      } else {
        logger.info(
          'Session not found. Waiting for QR login.'
        );
      }

      const baileysLogger = pino({
        level:
          config.nodeEnv === 'production'
            ? 'warn'
            : 'info',
        base: undefined,
        timestamp: false,
      });

      this.sock = makeWASocket({
        auth: state,
        logger: baileysLogger,

        printQRInTerminal: true,

        browser: Browsers.macOS('Desktop'),

        markOnlineOnConnect: false,
        syncFullHistory: false,
        generateHighQualityLinkPreview: false,
      });

      this.sock.ev.on(
        'creds.update',
        async () => {
          await saveCreds();
          logger.info('Session saved.');
        }
      );

      this.sock.ev.on(
        'connection.update',
        (update) => {
          void this.handleConnectionUpdate(
            update
          );
        }
      );

      this.sock.ev.on(
        'messages.upsert',
        async ({ messages, type }) => {
          if (type !== 'notify') return;

          for (const msg of messages) {
            if (
              !msg.message ||
              msg.key.fromMe
            ) {
              continue;
            }

            const userId =
              msg.key.remoteJid;

            if (!userId) continue;

            const text =
              this.extractText(msg);

            if (!text) continue;

            if (this.onIncoming) {
              try {
                await this.onIncoming(
                  userId,
                  text
                );
              } catch (err) {
                logger.error(
                  'Unhandled error while processing incoming message',
                  {
                    userId,
                    error:
                      (err as Error).message,
                  }
                );
              }
            }
          }
        }
      );
    } catch (err) {
      logger.error(
        'Failed to initialize Baileys socket',
        {
          error: (err as Error).message,
          stack: (err as Error).stack,
        }
      );
    } finally {
      this.isConnecting = false;
    }
  }

  private async handleConnectionUpdate(
    update: {
      connection?: string;
      lastDisconnect?: {
        error?: Error;
      };
      qr?: string;
    },
  ): Promise<void> {
    const {
      connection,
      lastDisconnect,
      qr,
    } = update;

    logger.info(
      'connection.update',
      {
        connection,
        hasQr: !!qr,
      }
    );

    if (qr) {
      logger.info(
        '==================================================='
      );
      logger.info(
        'SCAN QR CODE BELOW USING WHATSAPP'
      );
      logger.info(
        'WhatsApp -> Linked Devices -> Link a Device'
      );
      logger.info(
        '==================================================='
      );

      qrcode.generate(qr, {
        small: true,
      });
    }

    if (connection === 'open') {
      this.reconnectAttempts = 0;

      logger.info(
        'Login successful. WhatsApp connection established.'
      );

      return;
    }

    if (connection !== 'close') {
      return;
    }

    const disconnectError =
      lastDisconnect?.error as
        | (Error & {
            output?: {
              statusCode?: number;
            };
          })
        | undefined;

    const statusCode =
      disconnectError?.output
        ?.statusCode;

    const shouldReconnect =
      statusCode !==
      DisconnectReason.loggedOut;

    logger.warn(
      'Connection closed',
      {
        statusCode,
        shouldReconnect,
      }
    );

    if (
      statusCode ===
      DisconnectReason.badSession
    ) {
      logger.error(
        'Session corrupt. Clearing auth session.'
      );

      fs.rmSync(
        config.authDir,
        {
          recursive: true,
          force: true,
        }
      );

      fs.mkdirSync(
        config.authDir,
        {
          recursive: true,
        }
      );

      this.reconnectAttempts = 0;
      return;
    }

    if (!shouldReconnect) {
      logger.error(
        'Logged out from WhatsApp.'
      );
      return;
    }

    if (
      this.reconnectAttempts >= 5
    ) {
      logger.error(
        'Reconnect limit reached.'
      );
      return;
    }

    const delayMs = Math.min(
      5000 *
        2 **
          this.reconnectAttempts,
      60000
    );

    this.reconnectAttempts++;

    logger.warn(
      'Reconnect attempt scheduled',
      {
        attempt:
          this.reconnectAttempts,
        delayMs,
      }
    );

    if (this.reconnectTimer) {
      clearTimeout(
        this.reconnectTimer
      );
    }

    this.reconnectTimer =
      setTimeout(() => {
        void this.start();

        this.reconnectTimer =
          null;
      }, delayMs);
  }

  private extractText(
    msg: proto.IWebMessageInfo
  ): string | null {
    const m = msg.message;

    if (!m) return null;

    return (
      m.conversation ||
      m.extendedTextMessage
        ?.text ||
      m.imageMessage
        ?.caption ||
      m.videoMessage
        ?.caption ||
      null
    );
  }

  async sendText(
    userId: string,
    text: string
  ): Promise<void> {
    if (!this.sock) {
      throw new Error(
        'WhatsApp socket not initialized'
      );
    }

    await this.sock.sendMessage(
      userId,
      {
        text,
      }
    );
  }

  async sendVideoFile(
    userId: string,
    filePath: string,
    caption: string
  ): Promise<void> {
    if (!this.sock) {
      throw new Error(
        'WhatsApp socket not initialized'
      );
    }

    const stats =
      fs.statSync(filePath);

    const sizeMb =
      stats.size /
      (1024 * 1024);

    logger.info(
      'Preparing upload',
      {
        filePath,
        sizeMb:
          sizeMb.toFixed(2),
      }
    );

    // <=100MB -> VIDEO
    if (sizeMb <= 100) {
      logger.info(
        'Sending as VIDEO'
      );

      await this.sock.sendMessage(
        userId,
        {
          video: {
            url: filePath,
          },
          mimetype:
            'video/mp4',
          caption,
        }
      );

      logger.info(
        'Video sent successfully'
      );

      return;
    }

    // >100MB -> DOCUMENT
    logger.info(
      'Sending as DOCUMENT'
    );

    await this.sock.sendMessage(
      userId,
      {
        document: {
          url: filePath,
        },
        mimetype:
          'video/mp4',
        fileName:
          path.basename(
            filePath
          ),
        caption:
          `${caption}\n\n📦 File dikirim sebagai dokumen karena ukuran ${sizeMb.toFixed(
            2
          )} MB.`,
      }
    );

    logger.info(
      'Document sent successfully'
    );
  }
}

export const baileysProvider =
  new BaileysProvider();