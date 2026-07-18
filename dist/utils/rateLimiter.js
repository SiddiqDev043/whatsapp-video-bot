"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.RateLimiter = void 0;
const config_1 = require("../config");
/**
 * In-memory sliding-window rate limiter, keyed per WhatsApp JID.
 * For multi-instance deployments, back this with Redis instead (see cache/cacheService.ts note).
 */
class RateLimiter {
    constructor(windowMs = config_1.config.rateLimitWindowMs, maxRequests = config_1.config.rateLimitMaxRequests) {
        this.windowMs = windowMs;
        this.maxRequests = maxRequests;
        this.buckets = new Map();
    }
    /** Returns true if the request is allowed, false if the user should be throttled. */
    allow(userId) {
        const now = Date.now();
        const bucket = this.buckets.get(userId) ?? { timestamps: [] };
        bucket.timestamps = bucket.timestamps.filter((t) => now - t < this.windowMs);
        if (bucket.timestamps.length >= this.maxRequests) {
            this.buckets.set(userId, bucket);
            return false;
        }
        bucket.timestamps.push(now);
        this.buckets.set(userId, bucket);
        return true;
    }
    /** Periodic cleanup to avoid unbounded memory growth. Call on an interval. */
    sweep() {
        const now = Date.now();
        for (const [userId, bucket] of this.buckets.entries()) {
            bucket.timestamps = bucket.timestamps.filter((t) => now - t < this.windowMs);
            if (bucket.timestamps.length === 0)
                this.buckets.delete(userId);
        }
    }
}
exports.RateLimiter = RateLimiter;
exports.rateLimiter = new RateLimiter();
setInterval(() => exports.rateLimiter.sweep(), 5 * 60000).unref();
//# sourceMappingURL=rateLimiter.js.map