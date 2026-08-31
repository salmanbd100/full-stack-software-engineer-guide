---
title: Rate Limiting
part: 5
chapter: 0
slug: rate-limiting
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-31
tags: [backend, api, rate, limiting]
in_book: true
---

# Rate Limiting {#ch-rate-limiting}

> Implement an algorithm that matches your traffic shape, and make the counter correct across every instance.

**In this chapter:** fixed window and its boundary burst · sliding window counter · token bucket · atomic counting in Redis · what to key on · headers and failure modes

## 💡 The Core Idea

Rate limiting caps how much work one caller can ask of you in a window of time. It protects capacity, contains abuse, keeps third-party bills predictable and enforces pricing tiers.

The framing that scores in an interview: rate limiting is not about blocking bad actors, it is about **fairness under contention**. A limit that keeps one buggy client from starving everyone else is doing its job even when nobody is attacking you.

This chapter implements the limiter. Where it sits in the stack, how rules are stored per tier, and what it costs at a million requests a second belong to [Chapter ?? — Design a Rate Limiter](#ch-design-rate-limiter).

## How It Works

Every algorithm answers the same question — has this caller had too much? — and they differ in what they remember.

| Algorithm | Memory | Accuracy | Bursts | Use when |
| --------- | ------ | -------- | ------ | -------- |
| **Fixed window** | O(1) per key | Poor | 2× at boundaries | Simple internal APIs |
| **Sliding window log** | O(requests) | Exact | None | Low volume, strict fairness |
| **Sliding window counter** | O(1) | Good | Slight | ✅ Sensible production default |
| **Token bucket** | O(1) | Good | Controlled | ✅ Public APIs, variable request cost |
| **Leaky bucket (queue)** | O(queue) | Exact | None — smooths output | Protecting a fragile downstream |

**Short answer for most APIs: token bucket.** It allows a genuine burst — which is what real clients look like, since a page load fires eight requests at once — while holding the long-run average, and it extends naturally to "this endpoint costs 10, that one costs 1".

### Fixed Window and Its Boundary Problem

Count requests per calendar window and reset at the boundary.

```typescript
interface Window {
  count: number;
  resetAt: number;
}

class FixedWindow {
  private readonly keys = new Map<string, Window>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const window = this.keys.get(key);

    if (!window || now >= window.resetAt) {
      const fresh: Window = { count: 1, resetAt: now + this.windowMs };
      this.keys.set(key, fresh);
      return { allowed: true, remaining: this.limit - 1, resetAt: fresh.resetAt };
    }

    window.count += 1;
    return {
      allowed: window.count <= this.limit,
      remaining: Math.max(0, this.limit - window.count),
      resetAt: window.resetAt,
    };
  }
}
```

The flaw, and you should be able to draw it:

```text
limit = 100 per minute

12:00:59  ████████████████ 100 requests   ← fills window 1
12:01:00  ████████████████ 100 requests   ← window resets, fills window 2
          200 requests in ~1 second
```

**A client gets 2× the limit across any boundary.** For a limit that exists to protect capacity, that is the exact moment it fails.

> ⚠️ **The in-memory version is also wrong on more than one instance.** Four pods with a local `Map` means the effective limit is 4× what you configured — and it drifts as pods scale.

### Sliding Window Counter

**Sliding window log** stores a timestamp per request and counts what falls inside the trailing window. Exact, and memory grows with traffic — a client at 10k requests a minute costs 10k timestamps.

**Sliding window counter** is the practical compromise: keep the current window's count plus the previous window's, and weight the previous one by how much of it still overlaps.

```typescript
class SlidingWindowCounter {
  private readonly keys = new Map<string, { prev: number; curr: number; startedAt: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  check(key: string): boolean {
    const now = Date.now();
    const state = this.keys.get(key) ?? { prev: 0, curr: 0, startedAt: now };

    // Roll the window forward if we've crossed a boundary.
    const elapsed = now - state.startedAt;
    if (elapsed >= this.windowMs) {
      state.prev = elapsed < this.windowMs * 2 ? state.curr : 0; // gap → previous is stale
      state.curr = 0;
      state.startedAt = now - (elapsed % this.windowMs);
    }

    // Weight the previous window by the fraction still inside our lookback.
    const overlap = 1 - (now - state.startedAt) / this.windowMs;
    const estimate = state.prev * overlap + state.curr;

    if (estimate >= this.limit) {
      this.keys.set(key, state);
      return false;
    }

    state.curr += 1;
    this.keys.set(key, state);
    return true;
  }
}
```

Two counters per key, O(1), and no 2× boundary burst. It can be off by a few percent when traffic is uneven inside a window — an acceptable trade that Cloudflare made for the same reason.

### Token Bucket

A bucket holds up to `capacity` tokens and refills at `refillPerSec`. Each request spends tokens equal to its cost; an empty bucket means rejection.

```typescript
interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

class TokenBucket {
  private readonly buckets = new Map<string, Bucket>();

  constructor(
    private readonly capacity: number,     // burst size
    private readonly refillPerSec: number, // sustained rate
  ) {}

  /** `cost` lets an expensive endpoint consume more of the budget. */
  consume(key: string, cost = 1): { allowed: boolean; retryAfterSec: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key) ?? { tokens: this.capacity, lastRefillMs: now };

    // Continuous refill — fractional tokens matter, don't floor this.
    const elapsedSec = (now - bucket.lastRefillMs) / 1000;
    bucket.tokens = Math.min(this.capacity, bucket.tokens + elapsedSec * this.refillPerSec);
    bucket.lastRefillMs = now;

    if (bucket.tokens >= cost) {
      bucket.tokens -= cost;
      this.buckets.set(key, bucket);
      return { allowed: true, retryAfterSec: 0 };
    }

    this.buckets.set(key, bucket);
    return { allowed: false, retryAfterSec: Math.ceil((cost - bucket.tokens) / this.refillPerSec) };
  }
}
```

**Two dials, two meanings** — this is the part interviewers probe:

| Dial | Controls | Example |
| ---- | -------- | ------- |
| `capacity` | How large a burst you tolerate | 100 → a page firing 100 calls succeeds |
| `refillPerSec` | The sustained rate | 10/s → 600 a minute long-run |

**Cost-based limiting is the senior move.** `GET /users/me` and `POST /reports/export` are not the same request. Charge tokens by real cost — for GraphQL, by query complexity — so one endpoint cannot be used to bypass a limit tuned for another. See [Chapter ?? — GraphQL](#ch-graphql) for how complexity is scored.

**Leaky bucket** is the queue-shaped sibling: requests wait and drain at a fixed rate instead of being rejected. Use it when a downstream system has a hard rate cap you must not exceed — you are smoothing your own output, not policing a caller.

## When to Use It

| Traffic shape | Algorithm | Reason |
| ------------- | --------- | ------ |
| Public API, clients burst legitimately | Token bucket | Burst allowed, average held |
| Requests vary wildly in cost | Token bucket with per-endpoint cost | One dial covers both |
| Steady traffic, want simple correctness | Sliding window counter | O(1) and no boundary spike |
| You must not exceed a downstream cap | Leaky bucket | Smooths output rather than rejecting |
| Internal service, abuse is not a concern | Fixed window | Cheapest thing that works |

## Counting Across Instances

Multiple instances need one shared counter, and the check must be **atomic** — read, refill and write in one step, or two concurrent requests both see the last token.

```typescript
// Redis Lua runs atomically: no other command interleaves.
const TOKEN_BUCKET = `
  local tokens_key = KEYS[1]
  local capacity     = tonumber(ARGV[1])
  local refill_rate  = tonumber(ARGV[2])   -- tokens per second
  local now          = tonumber(ARGV[3])   -- milliseconds
  local cost         = tonumber(ARGV[4])

  local state = redis.call('HMGET', tokens_key, 'tokens', 'ts')
  local tokens = tonumber(state[1]) or capacity
  local last   = tonumber(state[2]) or now

  local elapsed = math.max(0, now - last) / 1000
  tokens = math.min(capacity, tokens + elapsed * refill_rate)

  local allowed = 0
  if tokens >= cost then
    tokens = tokens - cost
    allowed = 1
  end

  redis.call('HMSET', tokens_key, 'tokens', tokens, 'ts', now)
  -- TTL = time to refill a full bucket, so idle keys expire themselves.
  redis.call('PEXPIRE', tokens_key, math.ceil(capacity / refill_rate * 1000))

  return { allowed, math.floor(tokens) }
`;

async function consume(key: string, cost = 1): Promise<{ allowed: boolean; remaining: number }> {
  const [allowed, remaining] = (await redis.eval(TOKEN_BUCKET, {
    keys: [`rl:${key}`],
    arguments: ["100", "10", String(Date.now()), String(cost)],
  })) as [number, number];

  return { allowed: allowed === 1, remaining };
}
```

**Why Lua and not `INCR` plus `EXPIRE`:** those are two round trips. If the process dies between them you get a key with no TTL that blocks the caller forever. Lua makes the whole decision one atomic operation.

> ⚠️ **Every request now costs a Redis round trip.** At high volume, add a local pre-check: keep a small per-instance allowance and only consult Redis when it is exhausted. You trade exactness for latency — usually the right call, but say it out loud rather than pretending Redis is free.

**In practice, use the library.** `express-rate-limit` with a Redis store is battle-tested:

```typescript
import { rateLimit, MINUTE } from "express-rate-limit";
import { RedisStore } from "rate-limit-redis";

const limiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 100,
  standardHeaders: "draft-8", // combined `RateLimit` header (RFC draft)
  legacyHeaders: false,       // drop X-RateLimit-*
  ipv6Subnet: 56,             // one IPv6 /56 = one client, not 2^72 keys
  store: new RedisStore({ sendCommand: (...args: string[]) => redis.sendCommand(args) }),
  keyGenerator: (req) => req.apiKeyId ?? req.ip!, // see below
});

app.use("/api", limiter);
```

## What to Key On

The limit is only as good as the identity behind it.

```typescript
function rateLimitKey(req: Request): string {
  if (req.apiKeyId) return `key:${req.apiKeyId}`; // most specific, most trustworthy
  if (req.userId) return `user:${req.userId}`;    // survives IP changes on mobile
  return `ip:${req.ip}`;                          // last resort
}
```

| Key | Strength | Weakness |
| --- | -------- | -------- |
| **API key / client id** | Exact, ties to a billing tier | Only for authenticated traffic |
| **User id** | Follows the user across networks | Attacker can register more accounts |
| **IP** | Always available | Shared by NAT, corporate and mobile carriers; trivially rotated with IPv6 |

**`X-Forwarded-For` is client-controlled unless a proxy you trust rewrote it.** Blindly reading the first value lets anyone forge a fresh identity per request. Set Express's `trust proxy` to the number of proxies you actually run, and never more.

```typescript
app.set("trust proxy", 1); // exactly one trusted proxy in front of us
```

Layer the limits: per user or key for fairness, per IP as a coarse backstop for unauthenticated traffic, a global ceiling for load shedding, and **separate strict limits on login, password reset and OTP** — otherwise the general limit is a perfectly good credential-stuffing budget.

## Response Headers and Failure

Tell the client exactly what happened so it can back off intelligently instead of hammering you.

```typescript
res.status(429).set({
  "Retry-After": "42",                       // seconds — the one every client understands
  "RateLimit-Policy": "100;w=60",            // 100 requests per 60s window
  "RateLimit": "limit=100, remaining=0, reset=42",
}).json({
  type: "https://docs.example.com/errors/rate-limit",
  title: "Too Many Requests",
  status: 429,
  detail: "Limit of 100 requests per minute exceeded. Retry in 42 seconds.",
});
```

Send the headers on **successful** responses too. A client that can see `remaining=3` slows itself down; a client that only learns about the limit at `429` cannot. And keep `429` for "you sent too much" — `503` means the service itself is in trouble, and conflating them misleads every retry policy downstream.

**When Redis is unreachable, fail open loudly:**

```typescript
export const limit: RequestHandler = async (req, res, next) => {
  try {
    const { allowed, remaining } = await consume(rateLimitKey(req));
    res.set("RateLimit", `limit=100, remaining=${remaining}`);
    if (!allowed) return res.status(429).set("Retry-After", "60").json({ title: "Too Many Requests" });
    return next();
  } catch (err) {
    // ✅ Fail open, but make the failure loud — a silent dead limiter is the real risk.
    req.log.error({ err }, "rate limiter unavailable, allowing request");
    metrics.increment("ratelimit.unavailable");
    return next();
  }
};
```

Rejecting everything turns a limiter outage into an API outage. Keep a cheap in-process limiter as a fallback so you degrade to approximate limiting rather than none.

## Common Mistakes

❌ **A counter in a local `Map` behind several instances.** The effective limit is N× the configured one.
✅ Share the counter, and make the decision atomic in one round trip.

❌ **`INCR` then `EXPIRE` as two calls.** A crash between them leaves a key with no TTL that blocks the caller forever.
✅ One Lua script, one atomic decision.

❌ **Reading the first `X-Forwarded-For` value.** Anyone can forge a new identity per request.
✅ Set `trust proxy` to the real hop count and key on identity where you have it.

❌ **One limit for every endpoint.** Too generous for a report export, too strict for a dashboard.
✅ Charge tokens by cost, and give auth endpoints their own strict limit.

❌ **Enforcing a new limit on day one.** Real traffic is burstier than anyone predicts.
✅ Run in monitor mode for a week and log what *would* have been blocked.

> ⚠️ **Rate limiting is not DDoS protection.** A volumetric attack saturates your bandwidth before your middleware runs — that is a CDN and WAF job. Conflating the two is a common interview stumble.

## 🔑 Key Takeaways

- Token bucket is the default for public APIs because it tolerates a real burst while holding the long-run average.
- Fixed window allows 2× the limit across a boundary, which is precisely when the limit mattered.
- Distributed counting is only correct if read, refill and write happen atomically — one Lua script, not two commands.
- Key on the strongest identity available, and treat `X-Forwarded-For` as untrusted unless a proxy you own rewrote it.
- Fail open with an alert: a limiter outage should not become an API outage.

## Interview Questions

**Q: Token bucket or leaky bucket?**

Token bucket for API rate limiting: tokens accumulate while a client is idle, so a real burst — a page load firing ten requests — succeeds while the average holds at the refill rate. Leaky bucket queues requests and drains at a fixed rate, so output is perfectly smooth but no burst is allowed. I would use leaky bucket when I am the client protecting a downstream system with a hard cap, and token bucket when I am the server policing callers.

**Q: What is wrong with fixed window?**

Boundary bursts. A client can send the full limit at 12:00:59 and the full limit again at 12:01:00, so it gets 2× the intended rate in about a second. Sliding window counter fixes it with two counters and a weighted overlap — still O(1) memory, no boundary spike, and a few percent of inaccuracy when traffic is uneven inside the window.

**Q: How do you count correctly across many servers?**

Shared state in Redis with the whole decision in a Lua script, so read-refill-write is atomic. `INCR` plus `EXPIRE` as separate calls can leave a key without a TTL if the process dies in between. At high volume I would add a per-instance local allowance to cut round trips and accept slight over-admission, and set each key's TTL to the bucket's full-refill time so idle keys clean themselves up.

**Q: What do you key on, and why is IP a poor choice?**

API key or user id when the caller is authenticated, IP only as a fallback. An office behind NAT shares one address, mobile carriers rotate them, and an IPv6 client has effectively unlimited addresses — which is why you key on a /56 subnet rather than a single address. And `X-Forwarded-For` is forgeable unless a proxy you control rewrote it, so `trust proxy` must be set to the real hop count.

**Q: Should every endpoint share one limit?**

No. A limit tuned for `GET /me` is far too generous for a report export and far too strict for a dashboard that legitimately fires twenty calls. I use cost-based token consumption so expensive work spends more budget, plus separate tight limits on login, reset and OTP endpoints — a general 100-a-minute limit is a workable credential-stuffing budget otherwise.

## What to Read Next

- [Chapter ?? — Design a Rate Limiter](#ch-design-rate-limiter) — where to enforce it, tiered rules, and the numbers at a million requests a second
- [Chapter ?? — The API Gateway Pattern](#ch-api-gateway-pattern) — the edge layer that usually owns the coarse limits
- [Chapter ?? — GraphQL](#ch-graphql) — why one request is not one unit of work, and how complexity scoring fixes it
