import { Redis } from "ioredis";
import { config } from "../config.js";

// Simple in-memory LRU cache used when Redis is not configured (local dev)
class MemoryLRU {
  private store = new Map<string, { value: unknown; expiresAt: number }>();
  private readonly maxSize: number;

  constructor(maxSize = 2000) {
    this.maxSize = maxSize;
  }

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    // Refresh position (LRU: move to end)
    this.store.delete(key);
    this.store.set(key, entry);
    return entry.value as T;
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

if (config.REDIS_URL) {
  redis = new Redis(config.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 2 });
  redis.connect().catch(() => {
    redis = null;
  });
}

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (redis) {
      try {
        const raw = await redis.get(key);
        return raw ? (JSON.parse(raw) as T) : null;
      } catch {
        return null;
      }
    }
    return memory.get<T>(key);
  },

  async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
    if (redis) {
      try {
        await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      } catch {
        // Redis write failure is non-fatal
      }
      return;
    }
    memory.set(key, value, ttlSeconds);
  },

  isRedis(): boolean {
    return redis !== null;
  },
};
