"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.baileysProvider = exports.BaileysProvider = void 0;
const baileys_1 = __importStar(require("@whiskeysockets/baileys"));
const pino_1 = __importDefault(require("pino"));
const qrcode_terminal_1 = __importDefault(require("qrcode-terminal"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
fs_1.default.mkdirSync(config_1.config.authDir, { recursive: true });
class BaileysProvider {
    constructor() {
        this.sock = null;
        this.onIncoming = null;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.isConnecting = false;
    }
    setIncomingHandler(handler) {
        this.onIncoming = handler;
    }
    async start() {
        if (this.isConnecting)
            return;
        this.isConnecting = true;
        try {
            const { state, saveCreds } = await (0, baileys_1.useMultiFileAuthState)(config_1.config.authDir);
            const credsPath = path_1.default.join(config_1.config.authDir, 'creds.json');
            const hasSession = fs_1.default.existsSync(credsPath);
            if (hasSession) {
                logger_1.logger.info('Session found. Logging in automatically.');
            }
            else {
                logger_1.logger.info('Session not found. Waiting for QR login.');
            }
            const baileysLogger = (0, pino_1.default)({
                level: config_1.config.nodeEnv === 'production'
                    ? 'warn'
                    : 'info',
                base: undefined,
                timestamp: false,
            });
            this.sock = (0, baileys_1.default)({
                auth: state,
                logger: baileysLogger,
                printQRInTerminal: true,
                browser: baileys_1.Browsers.macOS('Desktop'),
                markOnlineOnConnect: false,
                syncFullHistory: false,
                generateHighQualityLinkPreview: false,
            });
            this.sock.ev.on('creds.update', async () => {
                await saveCreds();
                logger_1.logger.info('Session saved.');
            });
            this.sock.ev.on('connection.update', (update) => {
                void this.handleConnectionUpdate(update);
            });
            this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
                if (type !== 'notify')
                    return;
                for (const msg of messages) {
                    if (!msg.message ||
                        msg.key.fromMe) {
                        continue;
                    }
                    const userId = msg.key.remoteJid;
                    if (!userId)
                        continue;
                    const text = this.extractText(msg);
                    if (!text)
                        continue;
                    if (this.onIncoming) {
                        try {
                            await this.onIncoming(userId, text);
                        }
                        catch (err) {
                            logger_1.logger.error('Unhandled error while processing incoming message', {
                                userId,
                                error: err.message,
                            });
                        }
                    }
                }
            });
        }
        catch (err) {
            logger_1.logger.error('Failed to initialize Baileys socket', {
                error: err.message,
                stack: err.stack,
            });
        }
        finally {
            this.isConnecting = false;
        }
    }
    async handleConnectionUpdate(update) {
        const { connection, lastDisconnect, qr, } = update;
        logger_1.logger.info('connection.update', {
            connection,
            hasQr: !!qr,
        });
        if (qr) {
            logger_1.logger.info('===================================================');
            logger_1.logger.info('SCAN QR CODE BELOW USING WHATSAPP');
            logger_1.logger.info('WhatsApp -> Linked Devices -> Link a Device');
            logger_1.logger.info('===================================================');
            qrcode_terminal_1.default.generate(qr, {
                small: true,
            });
        }
        if (connection === 'open') {
            this.reconnectAttempts = 0;
            logger_1.logger.info('Login successful. WhatsApp connection established.');
            return;
        }
        if (connection !== 'close') {
            return;
        }
        const disconnectError = lastDisconnect?.error;
        const statusCode = disconnectError?.output
            ?.statusCode;
        const shouldReconnect = statusCode !==
            baileys_1.DisconnectReason.loggedOut;
        logger_1.logger.warn('Connection closed', {
            statusCode,
            shouldReconnect,
        });
        if (statusCode ===
            baileys_1.DisconnectReason.badSession) {
            logger_1.logger.error('Session corrupt. Clearing auth session.');
            fs_1.default.rmSync(config_1.config.authDir, {
                recursive: true,
                force: true,
            });
            fs_1.default.mkdirSync(config_1.config.authDir, {
                recursive: true,
            });
            this.reconnectAttempts = 0;
            return;
        }
        if (!shouldReconnect) {
            logger_1.logger.error('Logged out from WhatsApp.');
            return;
        }
        if (this.reconnectAttempts >= 5) {
            logger_1.logger.error('Reconnect limit reached.');
            return;
        }
        const delayMs = Math.min(5000 *
            2 **
                this.reconnectAttempts, 60000);
        this.reconnectAttempts++;
        logger_1.logger.warn('Reconnect attempt scheduled', {
            attempt: this.reconnectAttempts,
            delayMs,
        });
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
        }
        this.reconnectTimer =
            setTimeout(() => {
                void this.start();
                this.reconnectTimer =
                    null;
            }, delayMs);
    }
    extractText(msg) {
        const m = msg.message;
        if (!m)
            return null;
        return (m.conversation ||
            m.extendedTextMessage
                ?.text ||
            m.imageMessage
                ?.caption ||
            m.videoMessage
                ?.caption ||
            null);
    }
    async sendText(userId, text) {
        if (!this.sock) {
            throw new Error('WhatsApp socket not initialized');
        }
        await this.sock.sendMessage(userId, {
            text,
        });
    }
    async sendVideoFile(userId, filePath, caption) {
        if (!this.sock) {
            throw new Error('WhatsApp socket not initialized');
        }
        const stats = fs_1.default.statSync(filePath);
        const sizeMb = stats.size /
            (1024 * 1024);
        logger_1.logger.info('Preparing upload', {
            filePath,
            sizeMb: sizeMb.toFixed(2),
        });
        // <=100MB -> VIDEO
        if (sizeMb <= 100) {
            logger_1.logger.info('Sending as VIDEO');
            await this.sock.sendMessage(userId, {
                video: {
                    url: filePath,
                },
                mimetype: 'video/mp4',
                caption,
            });
            logger_1.logger.info('Video sent successfully');
            return;
        }
        // >100MB -> DOCUMENT
        logger_1.logger.info('Sending as DOCUMENT');
        await this.sock.sendMessage(userId, {
            document: {
                url: filePath,
            },
            mimetype: 'video/mp4',
            fileName: path_1.default.basename(filePath),
            caption: `${caption}\n\n📦 File dikirim sebagai dokumen karena ukuran ${sizeMb.toFixed(2)} MB.`,
        });
        logger_1.logger.info('Document sent successfully');
    }
}
exports.BaileysProvider = BaileysProvider;
exports.baileysProvider = new BaileysProvider();
//# sourceMappingURL=baileysProvider.js.map