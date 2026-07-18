"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
fs_1.default.mkdirSync(path_1.default.dirname(config_1.config.dbPath), { recursive: true });
exports.db = new better_sqlite3_1.default(config_1.config.dbPath);
exports.db.pragma('journal_mode = WAL');
const SCHEMA = `
CREATE TABLE IF NOT EXISTS search_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS search_sessions (
  user_id TEXT PRIMARY KEY,
  query TEXT NOT NULL,
  page INTEGER NOT NULL DEFAULT 0,
  updated_at INTEGER NOT NULL
);

-- Mapping of global index -> video, per user session. Cleared/replaced when a new query starts.
CREATE TABLE IF NOT EXISTS session_items (
  user_id TEXT NOT NULL,
  global_index INTEGER NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail TEXT NOT NULL,
  duration_text TEXT,
  channel TEXT,
  PRIMARY KEY (user_id, global_index)
);

-- Cache of raw search-provider results per query+page, so "next" and repeated
-- searches don't always hit the network.
CREATE TABLE IF NOT EXISTS search_cache (
  cache_key TEXT PRIMARY KEY,
  payload TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
`;
exports.db.exec(SCHEMA);
logger_1.logger.info('Database schema ready', { path: config_1.config.dbPath });
//# sourceMappingURL=db.js.map