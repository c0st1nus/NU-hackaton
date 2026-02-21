import Redis from "ioredis";
import { config } from "../lib/config";

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
});

redis.on("error", (err) => {
  console.error("Redis connection error:", err);
});

/**
 * Atomically get the current Round Robin counter value and increment it.
 * Returns the value BEFORE incrementing (so the caller uses it as-is for index % 2).
 */
export async function getAndIncrementRR(key: string): Promise<number> {
  // INCR returns the value AFTER incrementing, so subtract 1 to get the "before" value.
  const after = await redis.incr(`rr:${key}`);
  return after - 1;
}

// Stats cache — invalidated after each processing run (TTL 60 sec)
export async function cacheStats(data: object, keySuffix = "global"): Promise<void> {
  await redis.set(`cache:stats:${keySuffix}`, JSON.stringify(data), "EX", 60);
}

export async function getCachedStats(keySuffix = "global"): Promise<object | null> {
  const raw = await redis.get(`cache:stats:${keySuffix}`);
  return raw ? JSON.parse(raw) : null;
}

export async function invalidateStatsCache(): Promise<void> {
  const keys = await redis.keys("cache:stats:*");
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
