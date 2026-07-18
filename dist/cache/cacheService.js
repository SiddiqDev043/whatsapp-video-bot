"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheService = exports.CacheService = void 0;
class CacheService {
    constructor() {
        this.store = new Map();
    }
    get(key) {
        const entry = this.store.get(key);
        if (!entry)
            return undefined;
        if (entry.expiresAt < Date.now()) {
            this.store.delete(key);
            return undefined;
        }
        return entry.value;
    }
    set(key, value, ttlSeconds) {
        this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
    delete(key) {
        this.store.delete(key);
    }
    sweep() {
        const now = Date.now();
        for (const [key, entry] of this.store.entries()) {
            if (entry.expiresAt < now)
                this.store.delete(key);
        }
    }
}
exports.CacheService = CacheService;
exports.cacheService = new CacheService();
setInterval(() => exports.cacheService.sweep(), 5 * 60000).unref();
//# sourceMappingURL=cacheService.js.map