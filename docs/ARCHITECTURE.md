# Platform Architecture & Engineering Decisions

## 1. System Overview

**RateFlow** is an enterprise-grade API Rate Limiting and Real-time Traffic Analytics Platform designed to safeguard microservices, enforce tiered rate limit policies, and provide transparent traffic visibility.

```
                              ┌─────────────────────────────────────────┐
                              │            Incoming Request             │
                              │ (Headers: X-API-KEY / Client IP / Auth) │
                              └────────────────────┬────────────────────┘
                                                   │
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │     Rate Limiter Middleware       │
                                 └─────────────────┬─────────────────┘
                                                   │
                          ┌────────────────────────┴────────────────────────┐
                          ▼                                                 ▼
             ┌─────────────────────────┐                       ┌─────────────────────────┐
             │       Redis Node        │                       │   In-Memory Fallback    │
             │   Atomic Lua Script     │  ◄── (If offline) ─── │  Atomic Sliding Window  │
             └────────────┬────────────┘                       └────────────┬────────────┘
                          │                                                 │
                          └────────────────────────┬────────────────────────┘
                                                   │
                                     [ Is Quota Exceeded? ]
                                      /                  \
                                     /                    \
                               [ YES ]                    [ NO ]
                                 /                          \
                                ▼                            ▼
                  ┌───────────────────────────┐    ┌───────────────────────────────────┐
                  │   HTTP 429 Rate Limited   │    │      Pass to Target API Route     │
                  │  Retry-After: N seconds   │    │  (e.g., /api/v1/data, /search...) │
                  └─────────────┬─────────────┘    └─────────────────┬─────────────────┘
                                │                                    │
                                └──────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │      Traffic Logger & Metrics     │
                                 │  - Circular Ring-Buffer (Instant) │
                                 │  - Batch Persistence (Asynch)     │
                                 └─────────────────┬─────────────────┘
                                                   │
                                                   ▼
                                 ┌───────────────────────────────────┐
                                 │      MySQL / PostgreSQL / SQLite  │
                                 │   Clients, Keys, Policies, Logs   │
                                 └───────────────────────────────────┘
```

---

## 2. Rate Limiting Algorithms & The Sliding Window Choice

### Why Not Fixed Window? (The Boundary Burst Vulnerability)
In a **Fixed Window Counter**, time is divided into static chunks (e.g., 12:00:00 - 12:01:00).
- If a client with a limit of 100 req/min sends 100 requests at 12:00:59, and 100 requests at 12:01:01, the system sees:
  - 100 requests in Window 1 (Allowed)
  - 100 requests in Window 2 (Allowed)
- **Result:** The client successfully executed **200 requests within a 2-second window**, exceeding system capacity by 2x.

### Why The Sliding Window Log / Counter?
Our implementation utilizes a **Sliding Window Log** backed by a Redis Sorted Set (`ZSET`):
1. Each request adds a member with the current millisecond timestamp as its score.
2. Expired timestamps (`now - windowMs`) are evicted before evaluating quota (`ZREMRANGEBYSCORE`).
3. The remaining elements are counted (`ZCARD`).
4. If `count < limit`, the request passes; otherwise, the client is blocked and informed of the exact remaining seconds until the oldest request leaves the sliding window.

---

## 3. Concurrency & Race Condition Elimination

### The Race Condition in Naive Implementations
In distributed systems, high concurrent traffic exposes race conditions when performing multi-step operations:

```
Thread A: GET count (returns 49, limit is 50)
Thread B: GET count (returns 49, limit is 50)
Thread A: INCR (count becomes 50) -> Allows Request
Thread B: INCR (count becomes 51) -> Allows Request (Quota Exceeded!)
```

### The Solution: Atomic Redis Lua Scripts
Redis executes Lua scripts **atomically in a single thread**:
- No other command or script can interleave between `ZREMRANGEBYSCORE`, `ZCARD`, and `ZADD`.
- All operations execute in an isolated transaction in memory.
- Concurrency testing confirms **zero over-admission** under heavy bursts.

```lua
-- Atomic Lua Script executed in Redis
local key = KEYS[1]
local now = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])
local maxLimit = tonumber(ARGV[3])
local member = ARGV[4]

local clearBefore = now - windowMs

-- 1. Remove expired timestamps
redis.call('ZREMRANGEBYSCORE', key, '-inf', clearBefore)

-- 2. Count current elements
local currentRequests = redis.call('ZCARD', key)

if currentRequests < maxLimit then
  -- Allowed
  redis.call('ZADD', key, now, member)
  redis.call('PEXPIRE', key, windowMs)
  return { 1, maxLimit - currentRequests - 1, math.ceil(windowMs / 1000) }
else
  -- Blocked
  local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
  local retryAfterSec = math.ceil(windowMs / 1000)
  if oldest and #oldest >= 2 then
    local diff = (tonumber(oldest[2]) + windowMs) - now
    if diff > 0 then retryAfterSec = math.ceil(diff / 1000) end
  end
  return { 0, 0, retryAfterSec }
end
```

---

## 4. Multi-Tenant Tiered Rate Limiting

RateFlow supports multiple policies mapped to API Keys or Clients:

| Tier | Window | Max Requests | Burst Allowance | Target Use Case |
|---|---|---|---|---|
| **Enterprise** | 60 seconds | 200 req | 250 req | Production High Throughput |
| **Standard** | 60 seconds | 60 req | 75 req | Normal Production Traffic |
| **Free Tier** | 60 seconds | 20 req | 25 req | Developer Trial / Sandbox |
| **Strict Burst** | 10 seconds | 5 req | 5 req | Rate Limit Testing & Microbursts |
| **Anonymous IP** | 60 seconds | 30 req | 30 req | Unauthenticated Traffic Fallback |

### Response Headers Enforced
Conforming to standard IETF RateLimit and RFC 6585 specifications:
- `X-RateLimit-Limit`: Maximum requests permitted in the window.
- `X-RateLimit-Remaining`: Number of requests remaining in the active window.
- `X-RateLimit-Reset`: UNIX timestamp when the window resets.
- `X-RateLimit-Policy`: The active policy applied.
- `X-RateLimit-Engine`: Underlying storage engine (`Redis` or `Memory`).
- `Retry-After`: (On HTTP 429) Exact seconds the client must wait.

---

## 5. High-Throughput Analytics & Low-Latency Architecture

To ensure analytics collection does not bottleneck API throughput:
1. **Asynchronous Non-Blocking Logging**: The `trafficLogger` hooks into `res.on('finish')` and never blocks the response payload.
2. **In-Memory Ring-Buffer**: Keeps the latest 100 requests in an active memory buffer for sub-millisecond dashboard updates.
3. **Batch DB Flushes**: Database writes are queued and flushed in periodic batches every 1.5 seconds, drastically reducing SQL IOPS.
4. **API Key Cache**: API key metadata is cached in-memory with a 30-second TTL to avoid database reads on every incoming API call.

