import { config } from '../config';

interface Bucket {
  timestamps: number[];
}

/**
 * In-memory sliding-window rate limiter, keyed per WhatsApp JID.
 * For multi-instance deployments, back this with Redis instead (see cache/cacheService.ts note).
 */
export class RateLimiter {
  private buckets = new Map<string, Bucket>();

  constructor(
    private windowMs = config.rateLimitWindowMs,
    private maxRequests = config.rateLimitMaxRequests,
  ) {}

  /** Returns true if the request is allowed, false if the user should be throttled. */
  allow(userId: string): boolean {
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
  sweep(): void {
    const now = Date.now();
    for (const [userId, bucket] of this.buckets.entries()) {
      bucket.timestamps = bucket.timestamps.filter((t) => now - t < this.windowMs);
      if (bucket.timestamps.length === 0) this.buckets.delete(userId);
    }
  }
}

export const rateLimiter = new RateLimiter();
setInterval(() => rateLimiter.sweep(), 5 * 60_000).unref();
