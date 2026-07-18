"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.videoCacheRepository = void 0;
const db_1 = require("../db");
const getCacheStmt = db_1.db.prepare(`SELECT payload, expires_at FROM search_cache WHERE cache_key = ?`);
const setCacheStmt = db_1.db.prepare(`
  INSERT INTO search_cache (cache_key, payload, expires_at)
  VALUES (@cache_key, @payload, @expires_at)
  ON CONFLICT(cache_key) DO UPDATE SET payload = excluded.payload, expires_at = excluded.expires_at
`);
const deleteExpiredStmt = db_1.db.prepare(`DELETE FROM search_cache WHERE expires_at < ?`);
/** Persistent (survives restarts) cache for raw YouTube search pages, keyed by query+page. */
exports.videoCacheRepository = {
    get(key) {
        const row = getCacheStmt.get(key);
        if (!row)
            return null;
        if (row.expires_at < Date.now())
            return null;
        try {
            return JSON.parse(row.payload);
        }
        catch {
            return null;
        }
    },
    set(key, results, ttlSeconds) {
        setCacheStmt.run({
            cache_key: key,
            payload: JSON.stringify(results),
            expires_at: Date.now() + ttlSeconds * 1000,
        });
    },
    sweepExpired() {
        deleteExpiredStmt.run(Date.now());
    },
};
setInterval(() => exports.videoCacheRepository.sweepExpired(), 10 * 60000).unref();
//# sourceMappingURL=videoRepository.js.map