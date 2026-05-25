import { Redis } from "ioredis";

class MemoryLRU {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize: number;
  constructor(maxSize = 500) { this.maxSize = maxSize; }

  get<T>(key: string): T | null {
    const e = this.store.get(key);
    if (!e) return null;
    if (Date.now() > e.expiresAt) { this.store.delete(key); return null; }
    this.store.delete(key);
    this.store.set(key, e);
    return e.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds: number): void {
    if (this.store.size >= this.maxSize) {
      const oldest = this.store.keys().next().value;
      if (oldest !== undefined) this.store.delete(oldest);
    }
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }
}

let redis: Redis | null = null;
const memory = new MemoryLRU();

if (process.env.REDIS_URL) {
  redis = new Redis(process.env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  redis.connect().catch(() => { redis = null; });
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (redis) {
      try { const r = await redis.get(key); return r ? JSON.parse(r) as T : null; } catch { return null; }
    }
    return memory.get<T>(key);
  },
  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (redis) {
      try { await redis.set(key, JSON.stringify(value), "EX", ttlSeconds); } catch { /* non-fatal */ }
      return;
    }
    memory.set(key, value, ttlSeconds);
  },
};
