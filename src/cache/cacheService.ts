/**
 * Simple in-memory TTL cache used for hot-path lookups (e.g. session state)
 * that don't need to survive a restart. The SQLite-backed search_cache table
 * (see database/repositories/videoRepository.ts) is the durable cache.
 *
 * To scale horizontally across multiple bot instances, swap this
 * implementation for a Redis client (ioredis) behind the same interface.
 */
interface Entry<T> {
  value: T;
  expiresAt: number;
}

export class CacheService<T = unknown> {
  private store = new Map<string, Entry<T>>();

  get(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: T, ttlSeconds: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  delete(key: string): void {
    this.store.delete(key);
  }

  sweep(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.expiresAt < now) this.store.delete(key);
    }
  }
}

export const cacheService = new CacheService();
setInterval(() => cacheService.sweep(), 5 * 60_000).unref();
