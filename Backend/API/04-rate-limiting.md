# Rate Limiting

## Overview

Rate limiting is a technique to control the amount of incoming requests to an API within a specific time window. It prevents abuse, ensures fair resource allocation, and protects against DoS attacks.

**Key Principle:** Limit the number of requests a client can make to protect server resources and ensure service availability for all users.

---

## 🎯 Why Rate Limit?

### 1. Prevent Abuse & DoS Attacks
```javascript
// Without rate limiting:
// Attacker sends 10,000 requests/second → Server crashes

// With rate limiting:
// Attacker limited to 100 requests/minute → Attack ineffective
```

### 2. Fair Resource Allocation
- Ensure all users get fair access
- Prevent one user from consuming all resources
- Support tiered pricing (free vs premium users)

### 3. Cost Control
- Reduce infrastructure costs
- Control third-party API usage costs
- Predictable resource consumption

### 4. Business Model Enforcement
```javascript
// Free tier: 100 requests/hour
// Pro tier: 10,000 requests/hour
// Enterprise: Unlimited
```

---

## 📐 Rate Limiting Algorithms

### 1. Fixed Window Counter

**How it works:** Count requests in fixed time windows (e.g., per minute). Reset counter at window boundary.

**JavaScript (In-Memory):**
```javascript
class FixedWindowRateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // clientId -> { count, resetTime }
  }

  isAllowed(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId);

    // No record or window expired
    if (!client || now > client.resetTime) {
      this.clients.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    // Within window, check count
    if (client.count < this.maxRequests) {
      client.count++;
      return true;
    }

    // Rate limit exceeded
    return false;
  }

  reset(clientId) {
    this.clients.delete(clientId);
  }
}

// Usage
const limiter = new FixedWindowRateLimiter(100, 60000); // 100 req/min

app.use((req, res, next) => {
  const clientId = req.ip;

  if (!limiter.isAllowed(clientId)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((limiter.clients.get(clientId).resetTime - Date.now()) / 1000),
    });
  }

  next();
});
```

**Python (FastAPI):**
```python
from fastapi import FastAPI, Request, HTTPException
from datetime import datetime, timedelta
from collections import defaultdict

app = FastAPI()

class FixedWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients = {}  # client_id -> {count, reset_time}

    def is_allowed(self, client_id: str) -> tuple[bool, int]:
        now = datetime.now()

        if client_id not in self.clients or now > self.clients[client_id]['reset_time']:
            self.clients[client_id] = {
                'count': 1,
                'reset_time': now + timedelta(seconds=self.window_seconds)
            }
            return True, 0

        client = self.clients[client_id]
        if client['count'] < self.max_requests:
            client['count'] += 1
            return True, 0

        retry_after = int((client['reset_time'] - now).total_seconds())
        return False, retry_after

limiter = FixedWindowRateLimiter(100, 60)  # 100 req/min

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = request.client.host
    allowed, retry_after = limiter.is_allowed(client_id)

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={"Retry-After": str(retry_after)}
        )

    response = await call_next(request)
    return response
```

**Pros:**
- ✅ Simple to implement
- ✅ Memory efficient
- ✅ Fast lookups

**Cons:**
- ❌ Burst at window boundaries (spike at reset)
- ❌ Unfair: User who waits gets same limit as user who spammed

**Time Complexity:** O(1)
**Space Complexity:** O(n) where n = number of unique clients

**Example Problem:**
```
Window: 00:00 - 00:59 (100 requests allowed)

User sends:
- 99 requests at 00:59:50
- 100 requests at 01:00:01
= 199 requests in 11 seconds! (Burst at boundary)
```

---

### 2. Sliding Window Log

**How it works:** Store timestamp of each request. Count requests in the last N seconds by checking timestamps.

**JavaScript:**
```javascript
class SlidingWindowLogRateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // clientId -> [timestamps]
  }

  isAllowed(clientId) {
    const now = Date.now();
    const timestamps = this.clients.get(clientId) || [];

    // Remove timestamps outside the window
    const validTimestamps = timestamps.filter(ts => now - ts < this.windowMs);

    if (validTimestamps.length < this.maxRequests) {
      validTimestamps.push(now);
      this.clients.set(clientId, validTimestamps);
      return true;
    }

    return false;
  }

  getRetryAfter(clientId) {
    const timestamps = this.clients.get(clientId) || [];
    if (timestamps.length === 0) return 0;

    const oldestTimestamp = Math.min(...timestamps);
    return Math.ceil((this.windowMs - (Date.now() - oldestTimestamp)) / 1000);
  }
}

// Usage
const limiter = new SlidingWindowLogRateLimiter(100, 60000); // 100 req/min

app.use((req, res, next) => {
  const clientId = req.ip;

  if (!limiter.isAllowed(clientId)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: limiter.getRetryAfter(clientId),
    });
  }

  next();
});
```

**Python:**
```python
from datetime import datetime, timedelta
from collections import defaultdict

class SlidingWindowLogRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.clients = defaultdict(list)  # client_id -> [timestamps]

    def is_allowed(self, client_id: str) -> tuple[bool, int]:
        now = datetime.now()
        window_start = now - timedelta(seconds=self.window_seconds)

        # Remove timestamps outside window
        self.clients[client_id] = [
            ts for ts in self.clients[client_id]
            if ts > window_start
        ]

        if len(self.clients[client_id]) < self.max_requests:
            self.clients[client_id].append(now)
            return True, 0

        # Calculate retry after
        oldest_ts = min(self.clients[client_id])
        retry_after = int((self.window_seconds - (now - oldest_ts).total_seconds()))
        return False, retry_after
```

**Pros:**
- ✅ Accurate rate limiting
- ✅ No burst at boundaries
- ✅ Fair distribution

**Cons:**
- ❌ Memory intensive (stores all timestamps)
- ❌ Slower (need to filter old timestamps)

**Time Complexity:** O(n) where n = requests in window
**Space Complexity:** O(n × m) where n = clients, m = requests per client

---

### 3. Sliding Window Counter (Hybrid)

**How it works:** Combine fixed window counters with weighted calculation based on time elapsed in current window.

**JavaScript:**
```javascript
class SlidingWindowCounterRateLimiter {
  constructor(maxRequests, windowMs) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
    this.clients = new Map(); // clientId -> { prevCount, prevTime, currCount, currTime }
  }

  isAllowed(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId) || {
      prevCount: 0,
      prevTime: now - this.windowMs,
      currCount: 0,
      currTime: now,
    };

    // Check if we need to rotate windows
    if (now - client.currTime >= this.windowMs) {
      client.prevCount = client.currCount;
      client.prevTime = client.currTime;
      client.currCount = 0;
      client.currTime = now;
    }

    // Calculate weighted count
    const timeInCurrentWindow = now - client.currTime;
    const timeInPreviousWindow = this.windowMs - timeInCurrentWindow;
    const previousWindowWeight = timeInPreviousWindow / this.windowMs;

    const estimatedCount =
      client.prevCount * previousWindowWeight + client.currCount;

    if (estimatedCount < this.maxRequests) {
      client.currCount++;
      this.clients.set(clientId, client);
      return true;
    }

    return false;
  }
}

// Usage
const limiter = new SlidingWindowCounterRateLimiter(100, 60000);

app.use((req, res, next) => {
  const clientId = req.ip;

  if (!limiter.isAllowed(clientId)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
});
```

**Pros:**
- ✅ Memory efficient (only 2 counters)
- ✅ Smooth rate limiting
- ✅ Fast O(1) lookups

**Cons:**
- ❌ Approximate (not 100% accurate)
- ❌ Can allow slightly more than limit in edge cases

**Time Complexity:** O(1)
**Space Complexity:** O(n) where n = number of unique clients

---

### 4. Token Bucket

**How it works:** Bucket holds tokens. Each request consumes a token. Tokens refill at a constant rate. If bucket is empty, request is denied.

**JavaScript:**
```javascript
class TokenBucketRateLimiter {
  constructor(capacity, refillRate, refillIntervalMs) {
    this.capacity = capacity; // Max tokens
    this.refillRate = refillRate; // Tokens added per interval
    this.refillIntervalMs = refillIntervalMs;
    this.clients = new Map(); // clientId -> { tokens, lastRefill }
  }

  isAllowed(clientId, cost = 1) {
    const now = Date.now();
    const client = this.clients.get(clientId) || {
      tokens: this.capacity,
      lastRefill: now,
    };

    // Refill tokens based on time elapsed
    const timePassed = now - client.lastRefill;
    const refillCount = Math.floor(timePassed / this.refillIntervalMs) * this.refillRate;

    client.tokens = Math.min(this.capacity, client.tokens + refillCount);
    client.lastRefill = now;

    // Try to consume tokens
    if (client.tokens >= cost) {
      client.tokens -= cost;
      this.clients.set(clientId, client);
      return true;
    }

    this.clients.set(clientId, client);
    return false;
  }

  getRetryAfter(clientId, cost = 1) {
    const client = this.clients.get(clientId);
    if (!client) return 0;

    const tokensNeeded = cost - client.tokens;
    const intervalsNeeded = Math.ceil(tokensNeeded / this.refillRate);
    return Math.ceil((intervalsNeeded * this.refillIntervalMs) / 1000);
  }
}

// Usage: 100 tokens, refill 10 tokens every 1 second
const limiter = new TokenBucketRateLimiter(100, 10, 1000);

app.use((req, res, next) => {
  const clientId = req.ip;

  // Different endpoints can have different costs
  const cost = req.path.includes('/expensive') ? 10 : 1;

  if (!limiter.isAllowed(clientId, cost)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: limiter.getRetryAfter(clientId, cost),
    });
  }

  next();
});
```

**Python:**
```python
from datetime import datetime, timedelta
import math

class TokenBucketRateLimiter:
    def __init__(self, capacity: int, refill_rate: int, refill_interval_seconds: int):
        self.capacity = capacity
        self.refill_rate = refill_rate
        self.refill_interval_seconds = refill_interval_seconds
        self.clients = {}  # client_id -> {tokens, last_refill}

    def is_allowed(self, client_id: str, cost: int = 1) -> tuple[bool, int]:
        now = datetime.now()

        if client_id not in self.clients:
            self.clients[client_id] = {
                'tokens': self.capacity,
                'last_refill': now
            }

        client = self.clients[client_id]

        # Refill tokens
        time_passed = (now - client['last_refill']).total_seconds()
        refill_count = int(time_passed / self.refill_interval_seconds) * self.refill_rate
        client['tokens'] = min(self.capacity, client['tokens'] + refill_count)
        client['last_refill'] = now

        # Try to consume tokens
        if client['tokens'] >= cost:
            client['tokens'] -= cost
            return True, 0

        # Calculate retry after
        tokens_needed = cost - client['tokens']
        intervals_needed = math.ceil(tokens_needed / self.refill_rate)
        retry_after = intervals_needed * self.refill_interval_seconds
        return False, retry_after

# Usage
limiter = TokenBucketRateLimiter(capacity=100, refill_rate=10, refill_interval_seconds=1)
```

**Pros:**
- ✅ Allows bursts (up to capacity)
- ✅ Smooth refill
- ✅ Different costs for different operations
- ✅ Memory efficient

**Cons:**
- ❌ More complex to implement
- ❌ Need to tune capacity and refill rate

**Time Complexity:** O(1)
**Space Complexity:** O(n)

**Use Case:** APIs where some operations are more expensive than others (e.g., search costs 10 tokens, get user costs 1 token).

---

### 5. Leaky Bucket

**How it works:** Requests enter a bucket (queue). Requests are processed at a constant rate. If bucket is full, new requests are rejected.

**JavaScript:**
```javascript
class LeakyBucketRateLimiter {
  constructor(capacity, leakRate) {
    this.capacity = capacity; // Max queue size
    this.leakRate = leakRate; // Requests processed per second
    this.clients = new Map(); // clientId -> { queue, lastLeak }
  }

  isAllowed(clientId) {
    const now = Date.now();
    const client = this.clients.get(clientId) || {
      queue: [],
      lastLeak: now,
    };

    // Leak (process) requests
    const timePassed = (now - client.lastLeak) / 1000; // seconds
    const requestsToLeak = Math.floor(timePassed * this.leakRate);

    if (requestsToLeak > 0) {
      client.queue.splice(0, requestsToLeak);
      client.lastLeak = now;
    }

    // Try to add new request
    if (client.queue.length < this.capacity) {
      client.queue.push(now);
      this.clients.set(clientId, client);
      return true;
    }

    this.clients.set(clientId, client);
    return false;
  }

  getRetryAfter(clientId) {
    const client = this.clients.get(clientId);
    if (!client || client.queue.length === 0) return 0;

    // Time until one slot frees up
    return Math.ceil(1 / this.leakRate);
  }
}

// Usage: Capacity 100, leak 10 requests/second
const limiter = new LeakyBucketRateLimiter(100, 10);

app.use((req, res, next) => {
  const clientId = req.ip;

  if (!limiter.isAllowed(clientId)) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: limiter.getRetryAfter(clientId),
    });
  }

  next();
});
```

**Pros:**
- ✅ Smooth request processing
- ✅ Predictable output rate
- ✅ Protects downstream services

**Cons:**
- ❌ Doesn't allow bursts
- ❌ Requests queued (not rejected immediately)
- ❌ More complex

**Time Complexity:** O(1) for add, O(n) for leak
**Space Complexity:** O(n × m)

**Use Case:** Rate limiting API calls to external services with strict rate limits.

---

## 🔥 Algorithm Comparison

| Algorithm | Memory | Accuracy | Allows Bursts | Complexity | Best For |
|-----------|--------|----------|---------------|------------|----------|
| **Fixed Window** | Low | Poor | Yes (at edges) | Simple | Simple apps |
| **Sliding Window Log** | High | Perfect | No | Complex | High accuracy needs |
| **Sliding Window Counter** | Low | Good | Minimal | Medium | Production apps |
| **Token Bucket** | Low | Good | Yes (controlled) | Medium | Variable request costs |
| **Leaky Bucket** | Medium | Perfect | No | Complex | Smooth output required |

---

## 🌐 Distributed Rate Limiting with Redis

For multi-server deployments, use Redis for shared state.

**JavaScript (with Redis):**
```javascript
const redis = require('redis');
const client = redis.createClient();

class RedisFixedWindowRateLimiter {
  constructor(maxRequests, windowSeconds) {
    this.maxRequests = maxRequests;
    this.windowSeconds = windowSeconds;
  }

  async isAllowed(clientId) {
    const key = `rate_limit:${clientId}`;
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / this.windowSeconds);
    const windowKey = `${key}:${window}`;

    // Increment counter
    const count = await client.incr(windowKey);

    // Set expiration on first request
    if (count === 1) {
      await client.expire(windowKey, this.windowSeconds * 2);
    }

    return count <= this.maxRequests;
  }

  async getRemainingRequests(clientId) {
    const key = `rate_limit:${clientId}`;
    const now = Math.floor(Date.now() / 1000);
    const window = Math.floor(now / this.windowSeconds);
    const windowKey = `${key}:${window}`;

    const count = await client.get(windowKey) || 0;
    return Math.max(0, this.maxRequests - count);
  }
}

// Middleware
const limiter = new RedisFixedWindowRateLimiter(100, 60);

app.use(async (req, res, next) => {
  const clientId = req.ip;

  const allowed = await limiter.isAllowed(clientId);
  const remaining = await limiter.getRemainingRequests(clientId);

  // Add rate limit headers
  res.set({
    'X-RateLimit-Limit': '100',
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(Date.now() / 1000 / 60) * 60,
  });

  if (!allowed) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
});
```

**Redis Token Bucket (Lua Script for Atomicity):**
```javascript
const refillTokensScript = `
  local key = KEYS[1]
  local capacity = tonumber(ARGV[1])
  local refill_rate = tonumber(ARGV[2])
  local refill_interval = tonumber(ARGV[3])
  local cost = tonumber(ARGV[4])
  local now = tonumber(ARGV[5])

  local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
  local tokens = tonumber(bucket[1]) or capacity
  local last_refill = tonumber(bucket[2]) or now

  -- Refill tokens
  local time_passed = now - last_refill
  local refill_count = math.floor(time_passed / refill_interval) * refill_rate
  tokens = math.min(capacity, tokens + refill_count)

  -- Try to consume
  if tokens >= cost then
    tokens = tokens - cost
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 1
  else
    redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
    redis.call('EXPIRE', key, 3600)
    return 0
  end
`;

async function isAllowedTokenBucket(clientId, cost = 1) {
  const key = `rate_limit:token_bucket:${clientId}`;
  const now = Date.now();

  const allowed = await client.eval(
    refillTokensScript,
    1,
    key,
    100,   // capacity
    10,    // refill_rate
    1000,  // refill_interval (ms)
    cost,
    now
  );

  return allowed === 1;
}
```

**Python (with Redis):**
```python
import redis
import time
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

class RedisFixedWindowRateLimiter:
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds

    def is_allowed(self, client_id: str) -> tuple[bool, int]:
        key = f"rate_limit:{client_id}"
        now = int(time.time())
        window = now // self.window_seconds
        window_key = f"{key}:{window}"

        # Increment counter
        count = redis_client.incr(window_key)

        # Set expiration on first request
        if count == 1:
            redis_client.expire(window_key, self.window_seconds * 2)

        remaining = max(0, self.max_requests - count)
        return count <= self.max_requests, remaining

limiter = RedisFixedWindowRateLimiter(100, 60)

@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    client_id = request.client.host
    allowed, remaining = limiter.is_allowed(client_id)

    response = await call_next(request) if allowed else None

    if not allowed:
        raise HTTPException(
            status_code=429,
            detail="Too many requests",
            headers={
                "X-RateLimit-Limit": "100",
                "X-RateLimit-Remaining": "0",
                "Retry-After": "60"
            }
        )

    response.headers["X-RateLimit-Limit"] = "100"
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    return response
```

---

## 📊 Rate Limiting Best Practices

### 1. Return Proper Headers

```javascript
app.use(async (req, res, next) => {
  const clientId = req.ip;
  const limit = 100;
  const remaining = await getRemainingRequests(clientId);
  const resetTime = getWindowResetTime();

  // Standard rate limit headers
  res.set({
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': resetTime.toString(), // Unix timestamp
  });

  if (remaining <= 0) {
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

    return res.status(429)
      .set('Retry-After', retryAfter.toString())
      .json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        limit,
        retryAfter,
      });
  }

  next();
});
```

### 2. Different Limits for Different Tiers

```javascript
const RATE_LIMITS = {
  free: { requests: 100, window: 3600 },      // 100/hour
  basic: { requests: 1000, window: 3600 },    // 1000/hour
  pro: { requests: 10000, window: 3600 },     // 10000/hour
  enterprise: { requests: 100000, window: 3600 }, // 100k/hour
};

app.use(async (req, res, next) => {
  const user = req.user; // From auth middleware
  const tier = user?.tier || 'free';
  const limits = RATE_LIMITS[tier];

  const limiter = new RateLimiter(limits.requests, limits.window * 1000);

  if (!await limiter.isAllowed(user.id)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      tier,
      limit: limits.requests,
      upgrade: tier === 'free' ? '/pricing' : null,
    });
  }

  next();
});
```

### 3. Different Limits for Different Endpoints

```javascript
const endpointLimits = {
  '/api/search': { requests: 10, window: 60 },     // Expensive: 10/min
  '/api/users': { requests: 100, window: 60 },     // Normal: 100/min
  '/api/auth/login': { requests: 5, window: 300 }, // Sensitive: 5/5min
};

app.use((req, res, next) => {
  const limits = endpointLimits[req.path] || { requests: 60, window: 60 };
  const limiter = new RateLimiter(limits.requests, limits.window * 1000);

  if (!limiter.isAllowed(req.ip)) {
    return res.status(429).json({ error: 'Too many requests' });
  }

  next();
});
```

### 4. Identify Clients Properly

```javascript
function getClientId(req) {
  // Priority: API Key > User ID > IP Address
  if (req.headers['x-api-key']) {
    return `api_key:${req.headers['x-api-key']}`;
  }

  if (req.user?.id) {
    return `user:${req.user.id}`;
  }

  // Handle proxies - get real IP
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.ip;

  return `ip:${ip}`;
}

app.use((req, res, next) => {
  const clientId = getClientId(req);
  // Use clientId for rate limiting
});
```

### 5. Graceful Degradation

```javascript
app.use(async (req, res, next) => {
  try {
    const allowed = await limiter.isAllowed(req.ip);

    if (!allowed) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    next();
  } catch (error) {
    // If rate limiter fails (Redis down), allow request but log error
    console.error('Rate limiter error:', error);
    next(); // Fail open - allow request
  }
});
```

---

## 🎤 Common Interview Questions

### Q1: Explain the difference between token bucket and leaky bucket algorithms.

**Answer:**

| Aspect | Token Bucket | Leaky Bucket |
|--------|--------------|--------------|
| **Metaphor** | Bucket holds tokens; requests consume tokens; tokens refill at constant rate | Bucket is a queue; requests enter bucket; leak (process) at constant rate |
| **Bursts** | Allows bursts up to bucket capacity | No bursts - smooth output |
| **Processing** | Immediate (if tokens available) | Queued and processed at fixed rate |
| **Rejection** | When bucket empty | When bucket (queue) full |
| **Use Case** | API rate limiting | Protecting downstream services |

**Token Bucket Example:**
```javascript
// 100 token capacity, refill 10/second
// Can handle burst of 100 requests instantly
// Then limited to 10 requests/second
```

**Leaky Bucket Example:**
```javascript
// Queue capacity 100, leak 10/second
// Requests queued, processed at exactly 10/second
// No bursts - smooth output
```

**Interview Tip:** Token bucket is more common for APIs because it allows bursts (good UX) while maintaining average rate. Leaky bucket is better for protecting downstream services that can't handle bursts.

---

### Q2: How would you implement distributed rate limiting across multiple servers?

**Answer:**

**Use Redis as shared state:**

**Approach 1: Simple Counter (Fixed Window)**
```javascript
// Pros: Simple, fast
// Cons: Boundary burst problem
const key = `rate_limit:${clientId}:${Math.floor(Date.now() / 60000)}`;
const count = await redis.incr(key);
await redis.expire(key, 120); // 2 minutes TTL
return count <= maxRequests;
```

**Approach 2: Sorted Sets (Sliding Window Log)**
```javascript
// Pros: Accurate
// Cons: Memory intensive
const key = `rate_limit:${clientId}`;
const now = Date.now();
const windowStart = now - windowMs;

// Remove old entries
await redis.zremrangebyscore(key, 0, windowStart);

// Count entries in window
const count = await redis.zcard(key);

if (count < maxRequests) {
  await redis.zadd(key, now, `${now}-${Math.random()}`);
  await redis.expire(key, Math.ceil(windowMs / 1000) * 2);
  return true;
}

return false;
```

**Approach 3: Lua Script for Atomicity (Token Bucket)**
```lua
-- Token bucket in Lua for atomic operations
local tokens = redis.call('GET', KEYS[1])
if not tokens then
  tokens = capacity
end

-- Refill logic...
-- Consume logic...

redis.call('SET', KEYS[1], tokens)
return tokens >= cost and 1 or 0
```

**Considerations:**
- ✅ Use Redis pipeline/transaction for atomicity
- ✅ Set appropriate TTL to avoid memory leaks
- ✅ Handle Redis failures gracefully (fail open)
- ✅ Use Redis cluster for high availability
- ❌ Don't use local caching (defeats distributed purpose)

**Interview Tip:** Mention that distributed rate limiting trades simplicity for scalability. For single-server apps, in-memory is faster. For multi-server, Redis is standard.

---

### Q3: How do you rate limit authenticated vs unauthenticated users?

**Answer:**

**Strategy:**

```javascript
function getRateLimitConfig(req) {
  // Authenticated users: by user ID
  if (req.user) {
    return {
      clientId: `user:${req.user.id}`,
      limits: {
        free: { requests: 1000, window: 3600 },
        pro: { requests: 10000, window: 3600 },
      }[req.user.tier],
    };
  }

  // Unauthenticated: by IP (stricter limits)
  return {
    clientId: `ip:${req.ip}`,
    limits: { requests: 100, window: 3600 },
  };
}

app.use(async (req, res, next) => {
  const config = getRateLimitConfig(req);
  const limiter = new RateLimiter(config.limits.requests, config.limits.window * 1000);

  if (!await limiter.isAllowed(config.clientId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: req.user
        ? 'Upgrade your plan for higher limits'
        : 'Sign up for higher rate limits',
      upgrade: !req.user ? '/signup' : null,
    });
  }

  next();
});
```

**Best Practices:**
- ✅ **Unauthenticated (IP-based)**: Strict limits (e.g., 100/hour)
- ✅ **Authenticated**: Higher limits (e.g., 1000/hour)
- ✅ **Premium users**: Even higher limits (e.g., 10000/hour)
- ✅ **Sensitive endpoints** (login, signup): Very strict (e.g., 5/15min)

**IP-Based Challenges:**
- Multiple users behind NAT/proxy share same IP
- Solution: Use `X-Forwarded-For` header carefully, combine with other signals

---

### Q4: What HTTP status code and headers should you return when rate limiting?

**Answer:**

**Status Code:** `429 Too Many Requests`

**Required Headers:**
```javascript
res.status(429).set({
  // How many requests allowed
  'X-RateLimit-Limit': '100',

  // How many requests remaining
  'X-RateLimit-Remaining': '0',

  // When the limit resets (Unix timestamp)
  'X-RateLimit-Reset': '1704067200',

  // How many seconds to wait before retry
  'Retry-After': '60',
}).json({
  error: 'Too many requests',
  message: 'You have exceeded the rate limit. Please try again in 60 seconds.',
});
```

**Standard Headers:**
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets
- `Retry-After`: Seconds to wait before retry (HTTP standard)

**Example Response:**
```json
{
  "error": "Too many requests",
  "message": "Rate limit exceeded. Try again in 60 seconds.",
  "limit": 100,
  "remaining": 0,
  "reset": 1704067200,
  "retryAfter": 60
}
```

**Interview Tip:** Mention that these headers help clients implement intelligent retry logic (exponential backoff).

---

## ✅ Key Takeaways

1. **Choose algorithm based on requirements:**
   - Fixed window: Simplest, but allows boundary bursts
   - Sliding window counter: Good balance (production default)
   - Token bucket: Allows controlled bursts, variable costs
   - Leaky bucket: Smooth output, queue-based

2. **Use Redis for distributed systems** - Shared state across servers

3. **Return proper headers** - `X-RateLimit-*` and `Retry-After`

4. **Different limits for different users/endpoints** - Tiered pricing, sensitive endpoints

5. **Identify clients properly** - API key > User ID > IP address

6. **Fail gracefully** - If rate limiter fails, fail open (allow request)

7. **Monitor and adjust** - Track rate limit hits, adjust limits based on usage

8. **Time Complexity:** Most algorithms are O(1) except sliding window log O(n)

---

[← Back: API Versioning](./03-versioning.md) | [Next: API Documentation →](./05-documentation.md)
