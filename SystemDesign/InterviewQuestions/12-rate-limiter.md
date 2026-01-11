# Design Rate Limiter

## 💡 **Problem Statement**

Design a scalable rate limiting system that prevents abuse and ensures fair resource allocation across API requests.

**Core Functionality:**
- Limit requests per user/IP/API key
- Return 429 (Too Many Requests) when limit exceeded
- Distributed rate limiting across multiple servers
- Support different rate limit rules (per endpoint, per user tier)

**Real-World Examples:**
- **Stripe API**: 100 requests/sec per API key
- **Twitter API**: 900 requests/15 min per user
- **GitHub API**: 5,000 requests/hour authenticated, 60/hour unauthenticated
- **CloudFlare**: 10,000 requests/sec per domain

**Why Rate Limiting?**
- **Prevent DoS attacks**: Stop malicious users from overwhelming system
- **Cost control**: Limit resource usage per customer (API calls = cost)
- **Fair usage**: Prevent one user from consuming all resources
- **Service stability**: Maintain consistent performance for all users

---

## Requirements

### 💡 **Functional Requirements**

| Priority | Requirement | Details |
|----------|-------------|---------|
| **P0** | Throttle requests | Block requests exceeding limit |
| **P0** | Per-user limits | Different limits per user ID/IP/API key |
| **P1** | Rate limit rules | Configurable rules (100/min, 5000/hour, etc.) |
| **P1** | Multiple dimensions | Limit by IP, user ID, API key, endpoint |
| **P2** | Tiered limits | Different limits for free/paid/enterprise |
| **P2** | Rate limit headers | Return remaining quota in HTTP headers |

### 💡 **Non-Functional Requirements**

| Requirement | Target | Reasoning |
|-------------|--------|-----------|
| **Latency** | < 5ms overhead | Rate check shouldn't slow down API |
| **Availability** | 99.99% | Failure should fail-open (allow requests) |
| **Scalability** | 1M requests/sec | Handle high throughput |
| **Accuracy** | 99.9% | Small overages acceptable under load |
| **Distributed** | Multi-server support | Work across load-balanced servers |

---

## Rate Limiting Algorithms

### 💡 **Algorithm Comparison**

| Algorithm | Pros | Cons | Use Case |
|-----------|------|------|----------|
| **Token Bucket** | Smooth traffic, allows bursts | Complex implementation | APIs with burst needs |
| **Leaky Bucket** | Constant output rate | No burst support | Smooth traffic shaping |
| **Fixed Window** | Simple, low memory | Boundary issues (burst at edge) | Simple rate limiting |
| **Sliding Window Log** | Accurate | High memory (stores timestamps) | Strict enforcement |
| **Sliding Window Counter** | Good accuracy, low memory | Approximation | **Best for most cases** |

---

## Algorithm #1: Token Bucket

### 💡 **How It Works**

```
Bucket: Holds tokens (max capacity = rate limit)
- Tokens added at fixed rate (refill rate)
- Each request consumes 1 token
- If no tokens available → reject request
- Allows bursts up to bucket capacity

Example: 10 requests/second, bucket size 10
- Bucket fills at 10 tokens/sec
- User can burst 10 requests instantly
- Then limited to 10/sec refill rate
```

**Visual:**
```
Bucket (Max: 10 tokens)
┌────────────────────┐
│ 🟢🟢🟢🟢🟢🟢🟢🟢      │  8 tokens available
└────────────────────┘
         ↑
   Refill: +10/sec

Request arrives → Take 1 token
If tokens > 0: Allow request
If tokens = 0: Reject request (429)
```

**Implementation:**

```javascript
class TokenBucket {
  constructor(capacity, refillRate) {
    this.capacity = capacity;  // Max tokens
    this.tokens = capacity;    // Current tokens
    this.refillRate = refillRate; // Tokens per second
    this.lastRefill = Date.now();
  }

  // Refill tokens based on time elapsed
  refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // seconds
    const tokensToAdd = timePassed * this.refillRate;

    this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  // Try to consume a token
  allowRequest(tokens = 1) {
    this.refill();

    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    return false;
  }
}

// Usage
const limiter = new TokenBucket(10, 10); // 10 tokens max, refill 10/sec

if (limiter.allowRequest()) {
  // Process request
} else {
  // Return 429 Too Many Requests
}
```

**Pros:**
- ✅ Allows burst traffic (good UX)
- ✅ Memory efficient (just counter + timestamp)
- ✅ Simple to implement

**Cons:**
- ❌ Can allow bursts that overwhelm downstream services
- ❌ Requires precise timestamp synchronization

---

## Algorithm #2: Fixed Window Counter

### 💡 **How It Works**

```
Time divided into fixed windows (e.g., 1-minute windows)
- Each window has a counter
- Increment counter per request
- If counter > limit → reject
- Reset counter at window boundary

Example: 100 requests/minute
- Window 1: 10:00:00 - 10:00:59
- Window 2: 10:01:00 - 10:01:59
```

**Problem: Boundary Burst**
```
10:00:50 - 10:00:59: 100 requests (allowed)
10:01:00 - 10:01:09: 100 requests (allowed)
→ 200 requests in 20 seconds! (2x limit)
```

**Implementation:**

```javascript
class FixedWindowCounter {
  constructor(limit, windowSizeMs) {
    this.limit = limit;
    this.windowSize = windowSizeMs;
    this.counter = 0;
    this.windowStart = Date.now();
  }

  allowRequest() {
    const now = Date.now();

    // Check if window has expired
    if (now - this.windowStart >= this.windowSize) {
      // Reset window
      this.counter = 0;
      this.windowStart = now;
    }

    // Check limit
    if (this.counter < this.limit) {
      this.counter++;
      return true;
    }
    return false;
  }
}

// Usage
const limiter = new FixedWindowCounter(100, 60000); // 100 req/min
```

**Pros:**
- ✅ Very simple
- ✅ Low memory (single counter)
- ✅ Easy to implement in Redis

**Cons:**
- ❌ Boundary burst problem (2x rate at window edges)
- ❌ Not accurate for burst traffic

---

## Algorithm #3: Sliding Window Log

### 💡 **How It Works**

```
Store timestamp of each request
- On new request, remove timestamps older than window
- Count remaining timestamps
- If count < limit → allow

Example: 100 requests/minute
- Store last 100 request timestamps
- Remove timestamps > 1 min old
- If < 100 timestamps → allow
```

**Implementation:**

```javascript
class SlidingWindowLog {
  constructor(limit, windowSizeMs) {
    this.limit = limit;
    this.windowSize = windowSizeMs;
    this.log = []; // Store request timestamps
  }

  allowRequest() {
    const now = Date.now();
    const windowStart = now - this.windowSize;

    // Remove old requests outside window
    this.log = this.log.filter(timestamp => timestamp > windowStart);

    // Check if under limit
    if (this.log.length < this.limit) {
      this.log.push(now);
      return true;
    }
    return false;
  }
}
```

**Pros:**
- ✅ Very accurate
- ✅ No boundary burst problem

**Cons:**
- ❌ High memory usage (stores every timestamp)
- ❌ Expensive to maintain large logs
- ❌ Not practical for high-traffic APIs

---

## Algorithm #4: Sliding Window Counter (✅ BEST)

### 💡 **How It Works**

Hybrid approach: Fixed windows + weighted count from previous window

```
Current window + (Previous window * overlap %)

Example: 100 req/min, current time 10:00:30

Previous window (10:00:00-10:00:59): 80 requests
Current window (10:01:00-10:01:59): 30 requests

Overlap: 50% into current window
Weighted count: 30 + (80 * 0.5) = 30 + 40 = 70 requests

Remaining: 100 - 70 = 30 requests allowed
```

**Implementation:**

```javascript
class SlidingWindowCounter {
  constructor(limit, windowSizeMs) {
    this.limit = limit;
    this.windowSize = windowSizeMs;
    this.currentWindow = { count: 0, start: Date.now() };
    this.previousWindow = { count: 0 };
  }

  allowRequest() {
    const now = Date.now();
    const currentWindowStart = this.currentWindow.start;
    const elapsed = now - currentWindowStart;

    // Check if we need to roll window
    if (elapsed >= this.windowSize) {
      // Move to new window
      this.previousWindow = { count: this.currentWindow.count };
      this.currentWindow = { count: 0, start: now };
    }

    // Calculate weighted count
    const previousWeight = 1 - (elapsed / this.windowSize);
    const weightedCount =
      this.currentWindow.count +
      this.previousWindow.count * Math.max(0, previousWeight);

    // Check limit
    if (weightedCount < this.limit) {
      this.currentWindow.count++;
      return true;
    }
    return false;
  }
}
```

**Pros:**
- ✅ Good accuracy (~99%)
- ✅ Low memory (only 2 counters)
- ✅ No boundary burst problem
- ✅ Smooth traffic distribution

**Cons:**
- ❌ Slightly complex logic
- ❌ Approximation (not 100% accurate)

**✅ Best choice for production systems**

---

## Distributed Rate Limiting

### 💡 **Problem**

Multiple API servers behind load balancer - need shared rate limit state

**Naive approach (Won't work):**
```
Server 1: User makes 50 requests ✅
Server 2: User makes 50 requests ✅
Server 3: User makes 50 requests ✅
→ Total: 150 requests (limit was 100!)
```

**Solution: Centralized Redis Cache**

```
All servers share Redis for rate limit state

┌─────────┐      ┌─────────┐      ┌─────────┐
│ Server1 │      │ Server2 │      │ Server3 │
└────┬────┘      └────┬────┘      └────┬────┘
     │                │                │
     └────────────────┼────────────────┘
                      │
                      ▼
            ┌──────────────────┐
            │  Redis Cluster   │
            │  Rate Limit Data │
            └──────────────────┘

Key format: ratelimit:{userId}:{window}
Value: request count
TTL: window duration
```

### 💡 **Redis Implementation**

**Sliding Window Counter with Redis:**

```javascript
const Redis = require('ioredis');
const redis = new Redis();

async function isRateLimited(userId, limit, windowMs) {
  const now = Date.now();
  const currentWindow = Math.floor(now / windowMs);
  const previousWindow = currentWindow - 1;

  const currentKey = `ratelimit:${userId}:${currentWindow}`;
  const previousKey = `ratelimit:${userId}:${previousWindow}`;

  // Use Redis pipeline for atomic operations
  const pipeline = redis.pipeline();
  pipeline.get(previousKey);
  pipeline.incr(currentKey);
  pipeline.pttl(currentKey);

  const results = await pipeline.exec();

  const previousCount = parseInt(results[0][1] || 0);
  const currentCount = parseInt(results[1][1]);
  const ttl = parseInt(results[2][1]);

  // Set TTL if first request in window
  if (ttl === -1) {
    await redis.pexpire(currentKey, windowMs * 2); // 2x for overlap
  }

  // Calculate weighted count
  const elapsed = now % windowMs;
  const previousWeight = 1 - (elapsed / windowMs);
  const totalRequests = currentCount + previousCount * Math.max(0, previousWeight);

  return totalRequests > limit;
}

// Usage in API
app.use(async (req, res, next) => {
  const userId = req.user.id || req.ip;
  const isLimited = await isRateLimited(userId, 100, 60000); // 100/min

  if (isLimited) {
    return res.status(429).json({
      error: 'Too Many Requests',
      retryAfter: 60
    });
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', 100);
  res.setHeader('X-RateLimit-Remaining', /* calculate */);
  res.setHeader('X-RateLimit-Reset', /* timestamp */);

  next();
});
```

**Redis Lua Script (Atomic Operation):**

```lua
-- Token bucket in Redis (atomic)
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(data[1]) or capacity
local last_refill = tonumber(data[2]) or now

-- Refill tokens
local time_passed = now - last_refill
local tokens_to_add = time_passed * refill_rate
tokens = math.min(capacity, tokens + tokens_to_add)

-- Try to consume token
if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)
  return 1  -- Allow
else
  return 0  -- Deny
end
```

---

## Architecture

### 💡 **Production System Design**

```
┌──────────────────────────────────────────────────────────┐
│                       Clients                            │
└────────────────────────┬─────────────────────────────────┘
                         │
                         ▼
                 ┌──────────────┐
                 │ Load Balancer│
                 └──────┬───────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
  ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ API      │    │ API      │    │ API      │
  │ Server 1 │    │ Server 2 │    │ Server 3 │
  └─────┬────┘    └─────┬────┘    └─────┬────┘
        │               │               │
        └───────────────┼───────────────┘
                        │
        ┌───────────────┴───────────────┐
        │                               │
        ▼                               ▼
  ┌───────────────┐            ┌──────────────┐
  │ Redis Cluster │            │  Rules DB    │
  │ (Rate Limits) │            │ (PostgreSQL) │
  │               │            │              │
  │ - User counts │            │ - Rate rules │
  │ - Timestamps  │            │ - User tiers │
  └───────────────┘            └──────────────┘
```

### 💡 **Rate Limit Rules**

**Rules Table (PostgreSQL):**

```sql
CREATE TABLE rate_limit_rules (
    rule_id SERIAL PRIMARY KEY,
    endpoint VARCHAR(255),
    tier VARCHAR(50),         -- 'free', 'paid', 'enterprise'
    limit_per_second INT,
    limit_per_minute INT,
    limit_per_hour INT,
    limit_per_day INT,
    created_at TIMESTAMP
);

-- Examples
INSERT INTO rate_limit_rules VALUES
    (1, '/api/search', 'free', 1, 20, 1000, 10000),
    (2, '/api/search', 'paid', 10, 300, 10000, 100000),
    (3, '/api/search', 'enterprise', 100, 6000, 100000, 1000000);
```

---

## Deep Dives

### 💡 **1. Rate Limit Headers (RFC 6585)**

**Standard HTTP Headers:**

```http
HTTP/1.1 200 OK
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640995200
Retry-After: 60

HTTP/1.1 429 Too Many Requests
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1640995260
Retry-After: 60
Content-Type: application/json

{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Try again in 60 seconds."
}
```

### 💡 **2. Multi-Tier Rate Limiting**

**Different limits for different dimensions:**

```javascript
const rateLimits = {
  perIP: { limit: 1000, window: 3600000 },      // 1K/hour per IP
  perUser: { limit: 10000, window: 3600000 },   // 10K/hour per user
  perAPIKey: { limit: 5000, window: 3600000 },  // 5K/hour per API key
  perEndpoint: { limit: 100, window: 60000 }    // 100/min per endpoint
};

async function checkAllLimits(req) {
  const checks = await Promise.all([
    isRateLimited(`ip:${req.ip}`, rateLimits.perIP),
    isRateLimited(`user:${req.user.id}`, rateLimits.perUser),
    isRateLimited(`key:${req.apiKey}`, rateLimits.perAPIKey),
    isRateLimited(`endpoint:${req.path}`, rateLimits.perEndpoint)
  ]);

  return checks.some(limited => limited);
}
```

### 💡 **3. Handling Redis Failures**

**Fail-open strategy (prefer availability):**

```javascript
async function isRateLimited(userId, limit, window) {
  try {
    return await checkRedisRateLimit(userId, limit, window);
  } catch (error) {
    console.error('Redis rate limit check failed:', error);

    // FAIL OPEN: Allow request if Redis is down
    // Alternative: FAIL CLOSED (deny all requests)
    metrics.increment('rate_limiter.redis_failure');
    return false; // Allow request
  }
}
```

---

## Trade-offs

### 💡 **Key Design Decisions**

| Decision | Chosen | Alternative | Trade-off |
|----------|--------|-------------|-----------|
| **Algorithm** | Sliding Window Counter | Token Bucket | Better accuracy vs allows bursts |
| **Storage** | Redis | Local memory | Distributed vs lower latency |
| **Failure mode** | Fail-open | Fail-closed | Availability vs security |
| **Granularity** | Per-user + Per-IP | Per-user only | Better protection vs complexity |
| **Accuracy** | ~99% | 100% | Performance vs perfect accuracy |

### 💡 **Performance Optimization**

| Optimization | Benefit | Trade-off |
|--------------|---------|-----------|
| **Local cache** | Reduce Redis calls | Slight inaccuracy |
| **Batch updates** | Lower Redis load | Delayed updates |
| **Lua scripts** | Atomic operations | Complexity |
| **Connection pooling** | Reuse connections | Memory usage |

---

## Summary

### 💡 **Key Takeaways**

**Algorithm Choice:**
- **Production:** Sliding Window Counter (best balance)
- **Simple APIs:** Fixed Window Counter
- **Burst traffic:** Token Bucket
- **Strict enforcement:** Sliding Window Log

**Architecture:**
- **Redis for distributed state** (sub-5ms latency)
- **Fail-open on errors** (prefer availability)
- **Multi-tier limits** (IP + User + Endpoint)
- **Rate limit headers** (good API UX)

**Interview Focus:**
- Explain 3-4 algorithms with trade-offs
- Discuss distributed challenges
- Redis implementation details
- Failure handling (fail-open vs fail-closed)

---

[← Back to SystemDesign](../README.md)
