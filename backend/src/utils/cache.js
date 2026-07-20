/**
 * cache.js — Lightweight TTL cache for job API responses (Step 13).
 *
 * Uses Redis when REDIS_URL is configured AND the optional `ioredis`
 * package is installed; otherwise falls back to an in-process TTL Map so
 * the app works out-of-the-box with zero extra infrastructure.
 *
 * Default TTL: 30 minutes (matches the scraper refresh interval), so cached
 * job lists never go more stale than the underlying data.
 */

const DEFAULT_TTL_SECONDS = Number(process.env.CACHE_TTL_SECONDS) || 1800; // 30 min
const MAX_MEMORY_ENTRIES = 500;

let redis = null;
let redisReady = false;

// Try to connect to Redis only if explicitly configured.
if (process.env.REDIS_URL) {
  try {
    const { default: IORedis } = await import("ioredis");
    redis = new IORedis(process.env.REDIS_URL, {
      lazyConnect: false,
      maxRetriesPerRequest: 2,
    });
    redis.on("ready", () => {
      redisReady = true;
      console.log("[Cache] Connected to Redis.");
    });
    redis.on("error", (err) => {
      redisReady = false;
      console.warn("[Cache] Redis error, falling back to memory:", err.message);
    });
  } catch (err) {
    console.warn(
      "[Cache] REDIS_URL set but `ioredis` is not installed. " +
        "Run `npm i ioredis` to enable Redis. Using in-memory cache for now."
    );
  }
}

// In-memory fallback store: key -> { value, expiresAt }
const memoryStore = new Map();

function memoryGet(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key, value, ttlSeconds) {
  // Simple size cap with oldest-first eviction.
  if (memoryStore.size >= MAX_MEMORY_ENTRIES) {
    const oldestKey = memoryStore.keys().next().value;
    if (oldestKey) memoryStore.delete(oldestKey);
  }
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Get a cached JSON value by key, or null on a miss.
 */
export async function cacheGet(key) {
  if (redis && redisReady) {
    try {
      const raw = await redis.get(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      // fall through to memory
    }
  }
  return memoryGet(key);
}

/**
 * Store a JSON-serializable value with a TTL (seconds).
 */
export async function cacheSet(key, value, ttlSeconds = DEFAULT_TTL_SECONDS) {
  if (redis && redisReady) {
    try {
      await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
      return;
    } catch {
      // fall through to memory
    }
  }
  memorySet(key, value, ttlSeconds);
}

/**
 * Wrap an async producer with cache-aside semantics.
 */
export async function cacheWrap(key, ttlSeconds, producer) {
  const cached = await cacheGet(key);
  if (cached !== null && cached !== undefined) {
    return cached;
  }
  const fresh = await producer();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

export const CACHE_TTL_SECONDS = DEFAULT_TTL_SECONDS;
