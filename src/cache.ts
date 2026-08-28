import { Redis } from "ioredis";
import { env } from "./config/env.js";

export interface Cache {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string, ttlSeconds: number): Promise<void>;
  close(): Promise<void>;
}

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

class MemoryCache implements Cache {
  private readonly store = new Map<string, MemoryEntry>();

  async get(key: string): Promise<string | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.store.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
  }

  async close(): Promise<void> {
    this.store.clear();
  }
}

class RedisCache implements Cache {
  constructor(private readonly redis: Redis) {}

  async get(key: string): Promise<string | undefined> {
    const value = await this.redis.get(key);
    return value ?? undefined;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, value, "EX", ttlSeconds);
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }
}

/** Redis-backed when REDIS_URL is set; falls back to an in-process Map so the app runs without Redis. */
export async function createCache(): Promise<Cache> {
  if (!env.REDIS_URL) {
    return new MemoryCache();
  }

  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await redis.connect();
  return new RedisCache(redis);
}

/** Exposed for the session manager, which needs a raw Redis handle rather than the string cache. */
export async function createRedisClient(): Promise<Redis | undefined> {
  if (!env.REDIS_URL) return undefined;
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
  await redis.connect();
  return redis;
}
