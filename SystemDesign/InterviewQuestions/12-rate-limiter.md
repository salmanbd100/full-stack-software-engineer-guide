# Design Rate Limiter

## How to Open This Answer

"I'll design a distributed rate limiter that protects APIs from abuse. The core decisions are which algorithm to use — token bucket vs sliding window — where to enforce limits, and how to keep state consistent across many API servers using Redis."

## Problem Statement

A rate limiter sits in front of your API and blocks requests that exceed a configured quota. It must add < 5ms of overhead, work correctly across dozens of load-balanced servers, and fail safely when its state store is unavailable. Different users, tiers, and endpoints need different limits.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Block requests when a user exceeds their quota; return HTTP 429
- Support limits per user ID, IP address, and API key
- Configurable rules — different limits per endpoint and user tier (free/paid/enterprise)
- Return standard rate limit headers (`X-RateLimit-Remaining`, `Retry-After`)
- Support multiple time windows simultaneously (per-minute and per-hour)

### Non-Functional (pick 3-4)

- Overhead < 5ms per request — the rate check must not slow down the API
- Works distributed — limits enforced across all API servers, not per-server
- Fail-open — if the rate limiter's state store is down, allow requests rather than blocking everyone
- 1M requests/second throughput at peak

## A — Architecture

### High-Level Diagram

```
Client Request
      │
API Gateway / Middleware
      │
 Rate Limiter
      │
  ┌───┴──────────────────┐
  │                      │
Redis Cluster          Rules DB
(counters,             (PostgreSQL)
 sliding windows)      (limit configs
      │                  per tier/endpoint)
      │
  ┌───┴──────────────────┐
  │                      │
Allow (2xx)           Reject (429)
pass to API           Return headers +
service               Retry-After
```

The rate limiter runs as middleware in the API Gateway (e.g., Kong plugin, Nginx module, or an Express middleware). On each request, it reads the applicable rule from a local in-memory config cache (refreshed every 60 seconds from PostgreSQL), then checks and increments counters in Redis using an atomic Lua script. The result is returned in < 5ms. If Redis is unreachable, the middleware fails open.

> Place the rate limiter at the API Gateway, not inside individual microservices. Centralizing enforcement prevents limits from being bypassed by internal service-to-service calls and avoids duplicating Redis logic everywhere.

## D — Data Model

```typescript
interface RateLimitRule {
  ruleId: string;
  endpoint: string;          // e.g. '/api/search' or '*' for global
  tier: 'free' | 'paid' | 'enterprise' | 'anonymous';
  limitPerMinute: number;
  limitPerHour: number;
  limitPerDay: number;
}

interface RateLimitState {
  key: string;               // e.g. 'rl:user:abc:2024011012' (window key)
  count: number;
  windowStartMs: number;
  expiresAt: number;         // Unix ms — Redis TTL mirrors this
}

interface RateLimitDecision {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;           // Unix timestamp when window resets
  retryAfterSeconds?: number; // present only when allowed = false
}

interface RateLimitHeaders {
  'X-RateLimit-Limit': number;
  'X-RateLimit-Remaining': number;
  'X-RateLimit-Reset': number;   // Unix timestamp
  'Retry-After'?: number;        // seconds, only on 429
}
```

Storage notes (plain text):
- rate_limit_rules: PostgreSQL — read rarely, cached in-memory on each API server with 60s TTL
- Redis key schema for sliding window: `rl:{dimension}:{id}:{windowBucket}` where `windowBucket = Math.floor(Date.now() / windowMs)`
- Redis key schema for token bucket: `rl:tb:{id}` — a Hash with fields `tokens` and `last_refill`
- All Redis keys have TTL set to 2× the window duration so expired windows self-clean

## I — Interface (APIs)

```typescript
// This is middleware — not a REST API. TypeScript interface for the core check function:

interface RateLimiter {
  check(request: IncomingRequest): Promise<RateLimitDecision>;
}

interface IncomingRequest {
  userId?: string;
  apiKey?: string;
  ipAddress: string;
  endpoint: string;
  userTier: RateLimitRule['tier'];
}

// Admin API: GET /admin/rate-limit/rules — list all rules
interface ListRulesResponse {
  rules: RateLimitRule[];
}

// Admin API: POST /admin/rate-limit/rules — create or update a rule
interface UpsertRuleRequest {
  endpoint: string;
  tier: RateLimitRule['tier'];
  limitPerMinute: number;
  limitPerHour: number;
}

// Admin API: GET /admin/rate-limit/status/:userId — inspect current usage
interface UserRateLimitStatus {
  userId: string;
  tier: string;
  windows: Array<{
    window: 'minute' | 'hour' | 'day';
    used: number;
    limit: number;
    resetsAt: string;
  }>;
}
```

## O — Optimizations & Trade-offs

### 1. Algorithm Comparison

| Algorithm | Accuracy | Memory | Burst Handling | Best For |
|---|---|---|---|---|
| Fixed Window Counter | Low — 2× burst at boundary | O(1) | Allows 2× burst at window edges | Simple internal tools |
| Sliding Window Log | High — exact | O(requests) | No burst | Strict audit use cases |
| Token Bucket | Medium | O(1) | Allows controlled burst | APIs with legitimate burst traffic |
| Sliding Window Counter | High — ~99% | O(1) | Smoothed, no hard boundary | Production APIs |

✅ Use Sliding Window Counter for production. It approximates accuracy with O(1) memory.

### 2. Sliding Window Counter Implementation

```typescript
async function checkSlidingWindow(
  key: string, limit: number, windowMs: number
): Promise<RateLimitDecision> {
  const now = Date.now();
  const currentBucket = Math.floor(now / windowMs);
  const previousBucket = currentBucket - 1;
  const elapsedInWindow = now % windowMs;

  const currentKey = `rl:${key}:${currentBucket}`;
  const previousKey = `rl:${key}:${previousBucket}`;

  // Atomic: increment current, read previous
  const [prevCount, currCount] = await redis.pipeline()
    .get(previousKey)
    .incr(currentKey)
    .exec()
    .then(results => [Number(results[0][1] ?? 0), Number(results[1][1])]);

  // Set TTL on first request in this window
  if (currCount === 1) {
    await redis.pexpire(currentKey, windowMs * 2);
  }

  // Weight previous window by how much of it overlaps current window
  const previousWeight = 1 - elapsedInWindow / windowMs;
  const weightedTotal = currCount + prevCount * previousWeight;

  const allowed = weightedTotal <= limit;
  return {
    allowed,
    limit,
    remaining: Math.max(0, Math.floor(limit - weightedTotal)),
    resetAt: Math.floor((currentBucket + 1) * windowMs / 1000),
    retryAfterSeconds: allowed ? undefined : Math.ceil((windowMs - elapsedInWindow) / 1000),
  };
}
```

### 3. Token Bucket — Atomic Lua Script

Token bucket in Redis must be atomic. Use a Lua script — Redis executes it as a single transaction.

```typescript
const TOKEN_BUCKET_SCRIPT = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillPerMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local lastRefill = tonumber(data[2]) or now

local elapsed = now - lastRefill
tokens = math.min(capacity, tokens + elapsed * refillPerMs)

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)
  return {1, math.floor(tokens)}
else
  return {0, 0}
end
`;

async function checkTokenBucket(
  userId: string, capacity: number, refillPerSecond: number
): Promise<RateLimitDecision> {
  const refillPerMs = refillPerSecond / 1000;
  const [allowed, remaining] = await redis.eval(
    TOKEN_BUCKET_SCRIPT, 1, `rl:tb:${userId}`,
    capacity, refillPerMs, Date.now()
  ) as [number, number];

  return { allowed: allowed === 1, limit: capacity, remaining, resetAt: 0 };
}
```

### 4. Distributed Rate Limiting — Shared Redis vs Local Counter

| Approach | Accuracy | Latency | Complexity |
|---|---|---|---|
| Each server has local counter | Low — N servers = N× limit | 0ms overhead | Simple |
| Shared Redis (centralized) | High — exact within ~1ms race | 2–5ms per request | Moderate |
| Redis + local approximation | Medium — ~5% overage OK | 0.5ms avg | Moderate |

✅ Use shared Redis for correctness. The 2–5ms overhead is acceptable since rate limiting is done before business logic.

❌ Don't use local counters — a user can make N × limit requests by hitting each server exactly `limit` times.

### 5. Failure Handling and Response Headers

```typescript
async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  let decision: RateLimitDecision;

  try {
    const rule = getRuleForRequest(req);  // from in-memory config cache
    decision = await checkSlidingWindow(`user:${req.userId}`, rule.limitPerMinute, 60_000);
  } catch (err) {
    // Redis is down — fail open to preserve availability
    console.error('Rate limiter Redis error:', err);
    return next(); // allow request
  }

  res.setHeader('X-RateLimit-Limit', decision.limit);
  res.setHeader('X-RateLimit-Remaining', decision.remaining);
  res.setHeader('X-RateLimit-Reset', decision.resetAt);

  if (!decision.allowed) {
    res.setHeader('Retry-After', decision.retryAfterSeconds!);
    return res.status(429).json({
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Retry in ${decision.retryAfterSeconds}s.`,
    });
  }

  next();
}
```

| Failure Mode | Fail Open | Fail Closed |
|---|---|---|
| Behavior when Redis is down | Allow all requests | Block all requests |
| Impact | Some abuse slips through | All users are blocked |
| Preferred for | Public APIs, user-facing products | Internal billing / security systems |

✅ Fail open for user-facing APIs. Prefer availability over perfect enforcement.

## Common Follow-up Questions

**Q: What's the boundary burst problem in fixed window counters?**

If the limit is 100/minute, a user can send 100 requests at 10:00:59 and 100 more at 10:01:00 — 200 requests in 2 seconds, all within their "per-minute" limits. Sliding window counter eliminates this by weighting the previous window's count proportionally.

**Q: How do you enforce limits across multiple dimensions simultaneously?**

Check all dimensions in parallel and deny if any fails. For example: check `rl:ip:{ip}` (IP limit), `rl:user:{id}` (user limit), and `rl:endpoint:{path}` (endpoint limit) concurrently with `Promise.all`. Return 429 if any check fails. Include which limit was hit in the response body.

**Q: How would you implement tiered rate limits (free vs paid)?**

Store the tier in the JWT or look it up from a user service (cached in Redis for 5 minutes). Load the matching `RateLimitRule` from the in-memory config cache. Apply that rule's limits. No additional Redis keys needed — just different limit values for the same counter key.

**Q: How do you prevent Redis from becoming a bottleneck at 1M req/s?**

Use Redis Cluster with sharding by key prefix. Rate limit keys already shard well — `rl:user:{userId}` distributes uniformly. Add a local in-process cache with a 100ms TTL as a first layer. Under steady traffic, the local cache absorbs 80%+ of checks; Redis only sees bursts and first-requests.

---

[← Back to InterviewQuestions](../README.md)
