# Rate Limiting

## Overview

Rate limiting caps how much work one caller can ask of you in a window of time. It protects capacity, contains abuse, keeps third-party bills predictable, and enforces pricing tiers.

Interviewers like this topic because it touches algorithms, distributed state, and failure modes in one question — and because the naive answer (a counter in a `Map`) breaks the moment you run two instances.

> **The framing that scores:** rate limiting is not about blocking bad actors, it's about **fairness under contention**. A limit that keeps one buggy client from starving everyone else is doing its job even when nobody is attacking you.

## Table of Contents

- [Choosing an Algorithm](#choosing-an-algorithm)
- [Fixed Window and Its Boundary Problem](#fixed-window-and-its-boundary-problem)
- [Sliding Window](#sliding-window)
- [Token Bucket](#token-bucket)
- [Distributed Rate Limiting with Redis](#distributed-rate-limiting-with-redis)
- [What to Key On](#what-to-key-on)
- [Response Headers](#response-headers)
- [Production Concerns](#production-concerns)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Choosing an Algorithm

| Algorithm | Memory | Accuracy | Bursts | Use when |
| --------- | ------ | -------- | ------ | -------- |
| **Fixed window** | O(1) per key | Poor | 2× at boundaries | Simple internal APIs |
| **Sliding window log** | O(requests) | Exact | None | Low volume, strict fairness |
| **Sliding window counter** | O(1) | Good | Slight | ✅ Sensible production default |
| **Token bucket** | O(1) | Good | Controlled | ✅ Public APIs, variable request cost |
| **Leaky bucket (queue)** | O(queue) | Exact | None — smooths output | Protecting a fragile downstream |

**Short answer for most APIs: token bucket.** It allows a genuine burst (which is what real clients look like — a page load fires eight requests at once) while holding the long-run average, and it extends naturally to "this endpoint costs 10, that one costs 1".

## Fixed Window and Its Boundary Problem

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

🔴 **The flaw, and you should be able to draw it:**

```
limit = 100 per minute

12:00:59  ████████████████ 100 requests   ← fills window 1
12:01:00  ████████████████ 100 requests   ← window resets, fills window 2
          200 requests in ~1 second
```

A client gets 2× the limit across any boundary. For a limit that exists to protect capacity, that's the exact moment it fails.

> ⚠️ **The in-memory version is also wrong on more than one instance.** Four pods with a local `Map` means the effective limit is 4× what you configured — and it drifts as pods scale.

## Sliding Window

**Sliding window log** stores a timestamp per request and counts what falls inside the trailing window. Exact, and memory grows with traffic — a client at 10k requests/minute costs 10k timestamps.

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

## Token Bucket

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
| `refillPerSec` | The sustained rate | 10/s → 600/minute long-run |

> ✨ **Cost-based limiting is the senior move.** `GET /users/me` and `POST /reports/export` are not the same request. Charge tokens by real cost — for GraphQL, by query complexity — so one endpoint can't be used to bypass a limit tuned for another. See [GraphQL](./02-graphql.md#protecting-the-endpoint).

**Leaky bucket** is the queue-shaped sibling: requests wait and drain at a fixed rate instead of being rejected. Use it when a downstream system has a hard rate cap you must not exceed — you're smoothing your own output, not policing a caller.

## Distributed Rate Limiting with Redis

Multiple instances need one shared counter, and the check must be **atomic** — read, refill, and write in one step, or two concurrent requests both see the last token.

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

interface Decision {
  allowed: boolean;
  remaining: number;
}

async function consume(key: string, cost = 1): Promise<Decision> {
  const [allowed, remaining] = (await redis.eval(TOKEN_BUCKET, {
    keys: [`rl:${key}`],
    arguments: ["100", "10", String(Date.now()), String(cost)],
  })) as [number, number];

  return { allowed: allowed === 1, remaining };
}
```

**Why Lua and not `INCR` plus `EXPIRE`:** those are two round trips. If the process dies between them you get a key with no TTL that blocks the caller forever. Lua makes the whole decision one atomic operation.

> ⚠️ **Every request now costs a Redis round trip.** At high volume, add a local pre-check: keep a small per-instance allowance and only consult Redis when it's exhausted. You trade exactness for latency — usually the right call, but say it out loud rather than pretending Redis is free.

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
| **IP** | Always available | Shared by NAT/corporate/mobile carriers; trivially rotated with IPv6 |

🔴 **`X-Forwarded-For` is client-controlled unless a proxy you trust rewrote it.** Blindly reading the first value lets anyone forge a fresh identity per request. Set Express's `trust proxy` to the number of proxies you actually run, and never more.

```typescript
app.set("trust proxy", 1); // exactly one trusted proxy in front of us
```

**Rate limit by identity, layered:**

- **Per user or key** — the fairness limit, tuned to the pricing tier.
- **Per IP** — a coarse backstop for unauthenticated traffic.
- **Global** — a load-shedding ceiling protecting the service itself.
- **Per sensitive endpoint** — login, password reset, and OTP need their own strict limits, or the general limit becomes a credential-stuffing budget.

## Response Headers

Tell the client exactly what happened so it can back off intelligently instead of hammering you.

```typescript
res.status(429).set({
  "Retry-After": "42",                     // seconds — the one every client understands
  "RateLimit-Policy": '100;w=60',           // 100 requests per 60s window
  "RateLimit": 'limit=100, remaining=0, reset=42',
}).json({
  type: "https://docs.example.com/errors/rate-limit",
  title: "Too Many Requests",
  status: 429,
  detail: "Limit of 100 requests per minute exceeded. Retry in 42 seconds.",
});
```

| Header | Meaning |
| ------ | ------- |
| `Retry-After` | Seconds (or an HTTP date) to wait. Send this always |
| `RateLimit` | Current draft standard: `limit`, `remaining`, `reset` in one header |
| `X-RateLimit-*` | The legacy trio. Still widely consumed — keep it only for existing clients |

> ✨ **Send the headers on successful responses too.** A client that can see `remaining=3` can slow itself down. A client that only learns about the limit at 429 cannot.

**429 vs 503:** 429 means *you* sent too much — a well-behaved client retries later. 503 means the *service* is in trouble. Don't return 429 for a capacity problem you caused.

## Production Concerns

**Fail open or fail closed?** When Redis is down:

| Choice | Consequence |
| ------ | ----------- |
| **Fail open** (allow) | Availability preserved; the limiter is gone exactly when load may be highest |
| **Fail closed** (reject) | One Redis outage becomes a full API outage |

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

**Default to fail open with an alert**, and keep a cheap in-process limiter as a fallback so you degrade to approximate limiting rather than none.

**Where to enforce it:**

```
CDN / WAF        ← volumetric floods; blocks traffic before it costs you anything
   ↓
API gateway      ← per-key quotas, global ceilings, one place to configure
   ↓
Application      ← business rules: per-tier, per-endpoint cost, per-account quotas
```

Push crude limits as far out as you can — a request rejected at the edge costs nothing. Keep rules that need business context (which plan, which account, how expensive this query is) in the app, where that context exists.

> 🔴 **Rate limiting is not DDoS protection.** A volumetric attack saturates your bandwidth before your middleware runs. That's a CDN and WAF job. Be clear about the distinction — conflating them is a common interview stumble.

**Roll limits out in monitor mode first.** Log what *would* have been blocked for a week. Real traffic is burstier than anyone predicts, and the first limit you pick is usually too tight for one legitimate integration.

## Interview Questions

**Q1: Token bucket or leaky bucket?**

Token bucket for API rate limiting: tokens accumulate while a client is idle, so a real burst — a page load firing ten requests — succeeds, while the average holds at the refill rate. Leaky bucket queues requests and drains at a fixed rate, so output is perfectly smooth but no burst is allowed. I'd use leaky bucket when I'm the client protecting a downstream system with a hard cap, and token bucket when I'm the server policing callers.

**Q2: What's wrong with fixed window?**

Boundary bursts. A client can send the full limit at 12:00:59 and the full limit again at 12:01:00, so it gets 2× the intended rate in about a second. Sliding window counter fixes it with two counters and a weighted overlap — still O(1) memory, no boundary spike.

**Q3: How do you rate limit across many servers?**

Shared state in Redis, with the whole decision in a Lua script so read-refill-write is atomic. `INCR` plus `EXPIRE` as separate calls can leave a key without a TTL if the process dies in between. At high volume I'd add a per-instance local allowance to cut round trips and accept slight over-admission, and set the key's TTL to the bucket's full-refill time so idle keys clean themselves up.

**Q4: Redis is down — allow or reject?**

Fail open, loudly. Rejecting everything turns a limiter outage into an API outage, which is a worse failure than temporarily unlimited traffic. I'd alert on it, keep an in-process limiter as a degraded fallback, and only fail closed for endpoints where abuse is more expensive than downtime — payments or SMS sending, for example.

**Q5: What do you key on?**

API key or user id when the caller is authenticated, IP only as a fallback. IP is unreliable: an office behind NAT shares one, mobile carriers rotate them, and an IPv6 client has effectively unlimited addresses — which is why you key on a /56 subnet rather than a single address. And `X-Forwarded-For` is forgeable unless a proxy you control rewrote it, so `trust proxy` must be set to the real hop count.

**Q6: Which headers, and which status?**

429 with `Retry-After`. Plus the standard `RateLimit` header carrying limit, remaining, and reset — on successful responses too, so clients can self-throttle before they hit the wall rather than discovering it on a rejection.

**Q7: All endpoints, same limit?**

No. A limit tuned for `GET /me` is far too generous for a report export, and far too strict for a dashboard that legitimately fires twenty calls. I use cost-based token consumption so expensive work spends more budget, plus separate tight limits on auth endpoints, since a general 100/minute limit is a perfectly good credential-stuffing budget.

**Q8: Is rate limiting DDoS protection?**

No. Your middleware only runs after the request reaches your server, so a volumetric flood exhausts bandwidth and connections first. DDoS is handled upstream by a CDN or WAF with anycast capacity. Rate limiting handles application-layer abuse and fairness — a different problem at a different layer.

## Summary

**Checklist:**

- [ ] Token bucket (or sliding window counter) — not fixed window
- [ ] Shared state in Redis, decision atomic in Lua
- [ ] Keyed on API key or user id; IP only as fallback
- [ ] `trust proxy` set to the real number of proxies
- [ ] IPv6 keyed by subnet, not single address
- [ ] Cost-weighted limits for expensive endpoints
- [ ] Strict separate limits on login, reset, and OTP endpoints
- [ ] `429` with `Retry-After` and `RateLimit` headers, on every response
- [ ] Fail open, with an alert and a local fallback limiter
- [ ] Rolled out in monitor mode before enforcing
- [ ] A global ceiling for load shedding, separate from per-client limits

**Best practices:**

1. **Limit by cost, not by count** — one request is not one unit of work.
2. **Identity beats address** — key on who the caller is whenever you know.
3. **Make the limit visible** — headers on success, not just on rejection.
4. **Enforce at the edge, decide in the app** — cheap blocks outside, business rules inside.

---

[← Versioning](./03-versioning.md) | [API Index](./README.md) | [Documentation →](./05-documentation.md)
