const Redis = require('ioredis');
require('dotenv').config();

let redisClient = null;
let isRedisConnected = false;

// Fallback in-memory Sliding Window Store:
// Map<key, Array<timestamp>>
const memoryStore = new Map();

// Periodic cleanup of in-memory store to prevent memory leak
const memoryCleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of memoryStore.entries()) {
    const valid = timestamps.filter(ts => (now - ts) < 3600000); // 1 hour max
    if (valid.length === 0) {
      memoryStore.delete(key);
    } else {
      memoryStore.set(key, valid);
    }
  }
}, 60000);
if (memoryCleanupInterval.unref) {
  memoryCleanupInterval.unref();
}

// Redis Lua script for atomic sliding window rate limiting
// Returns: [allowed (1 or 0), remaining, retryAfterSec]
const SLIDING_WINDOW_LUA = `
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxLimit = tonumber(ARGV[3])
local member = ARGV[4]

local clearBefore = now - windowMs

-- 1. Remove expired timestamps outside the sliding window
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- 2. Count current timestamps in the window
local currentRequests = redis.call('ZCARD', key)

if currentRequests < maxLimit then
  -- Allowed: register current timestamp
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  local remaining = maxLimit - currentRequests - 1
  return { 1, remaining, math.ceil(windowMs / 1000) }
else
  -- Blocked: calculate retryAfter from oldest timestamp in window
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterSec = math.ceil(windowMs / 1000)
  if oldest and #oldest >= 2 then
    local oldestTs = tonumber(oldest[2])
    local diff = (oldestTs + windowMs) - now
    if diff > 0 then
      retryAfterSec = math.ceil(diff / 1000)
    else
      retryAfterSec = 1
    end
  end
  return { 0, 0, retryAfterSec }
end
`;

function initializeRedis() {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD || undefined;

  const options = {
    connectTimeout: 2000,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying continuously if no local redis is running
        return null;
      }
      return Math.min(times * 100, 1000);
    },
    lazyConnect: true
  };

  if (redisPassword) {
    options.password = redisPassword;
  }

  try {
    if (redisUrl) {
      console.log(`[Redis] Connecting via REDIS_URL...`);
      redisClient = new Redis(redisUrl, options);
    } else {
      console.log(`[Redis] Attempting connection to ${redisHost}:${redisPort}...`);
      redisClient = new Redis({
        host: redisHost,
        port: redisPort,
        ...options
      });
    }

    redisClient.on('connect', () => {
      isRedisConnected = true;
      console.log('✅ [Redis] Connected successfully. Using Redis atomic sliding window.');
    });

    redisClient.on('error', (err) => {
      if (isRedisConnected) {
        console.warn('⚠️ [Redis] Connection dropped:', err.message);
      }
      isRedisConnected = false;
    });

    redisClient.on('close', () => {
      isRedisConnected = false;
    });

    // Attempt initial async connection without crashing server if offline
    redisClient.connect().catch((err) => {
      console.log(`ℹ️ [Redis] Not reachable (${err.message}). Using high-performance atomic in-memory sliding window fallback.`);
      isRedisConnected = false;
    });
  } catch (error) {
    console.warn(`[Redis] Initialization note: ${error.message}. Using in-memory fallback.`);
    isRedisConnected = false;
  }
}

// Atomic rate limiting logic: delegates to Redis Lua script or in-memory sliding window
async function checkSlidingWindow({ key, windowSec, maxRequests }) {
  const now = Date.now();
  const windowMs = windowSec * 1000;
  const member = `${now}-${Math.random().toString(36).substring(2, 9)}`;

  if (isRedisConnected && redisClient) {
    try {
      const result = await redisClient.eval(
        SLIDING_WINDOW_LUA,
        1,
        key,
        now,
        windowMs,
        maxRequests,
        member
      );

      const allowed = result[0] === 1;
      const remaining = Number(result[1]);
      const retryAfterSec = Number(result[2]);
      const resetTime = Math.ceil(now / 1000) + retryAfterSec;

      return {
        allowed,
        remaining,
        resetTime,
        retryAfterSec,
        engine: 'redis'
      };
    } catch (err) {
      console.warn(`[Redis] Eval failed (${err.message}), falling back to memory store.`);
    }
  }

  // Fallback: In-memory sliding window algorithm with millisecond precision
  const clearBefore = now - windowMs;
  let timestamps = memoryStore.get(key) || [];
  
  // Filter out timestamps outside window
  timestamps = timestamps.filter(ts => ts > clearBefore);

  if (timestamps.length < maxRequests) {
    timestamps.push(now);
    memoryStore.set(key, timestamps);
    const remaining = maxRequests - timestamps.length;
    return {
      allowed: true,
      remaining,
      resetTime: Math.ceil((now + windowMs) / 1000),
      retryAfterSec: windowSec,
      engine: 'memory'
    };
  } else {
    // Limit exceeded
    const oldest = timestamps[0] || now;
    const diff = (oldest + windowMs) - now;
    const retryAfterSec = Math.max(1, Math.ceil(diff / 1000));
    return {
      allowed: false,
      remaining: 0,
      resetTime: Math.ceil((oldest + windowMs) / 1000),
      retryAfterSec,
      engine: 'memory'
    };
  }
}

function getRedisStatus() {
  return {
    connected: isRedisConnected,
    engine: isRedisConnected ? 'Redis' : 'In-Memory Sliding Window (Fallback)'
  };
}

module.exports = {
  initializeRedis,
  checkSlidingWindow,
  getRedisStatus,
  getRedisClient: () => redisClient,
  _memoryStore: memoryStore // Exported for unit tests
};

