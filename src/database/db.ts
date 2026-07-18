import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from '../utils/logger';

fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

export const db = new Database(config.dbPath);
db.pragma('journal_mode = WAL');

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

db.exec(SCHEMA);
logger.info('Database schema ready', { path: config.dbPath });
