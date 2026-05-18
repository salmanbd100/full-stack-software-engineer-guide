# Design URL Shortener

## How to Open This Answer

"I'll design a URL shortening service like Bitly or TinyURL. The system is extremely read-heavy — 100:1 redirect-to-creation ratio — so caching and fast redirect are the top priorities. ID generation strategy and redirect type are the key design decisions."

## Problem Statement

A URL shortener converts long URLs into short 7-character codes and redirects users instantly when they visit the short link. The system handles ~100M new URLs per day and ~10B redirects per day. Redirects must complete in under 100ms, and short links must never break.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Shorten a long URL to a unique 7-character code
- Redirect visitors from the short URL to the original long URL
- Support custom aliases (e.g., `short.ly/my-brand`)
- Set expiration dates on short links
- Track click analytics — total clicks, geographic breakdown, referrers

### Non-Functional (pick 3-4)

- Redirect latency < 100ms — delay directly hurts user experience
- 99.99% availability — a broken short link is a critical failure
- 100:1 read/write ratio — optimize heavily for reads
- Durable — short links must never disappear unless explicitly expired

## A — Architecture

### High-Level Diagram

```
Browser / Client
      │
   CDN Edge
   (top 10% hottest URLs cached here)
      │ cache miss
      │
   Load Balancer
      │
  API Servers (stateless)
      │
  ┌───┴──────────────┐
  │                  │
Redis Cache        ID Generator
(hot URLs,         (Snowflake)
 95%+ hit rate)
  │
  │ cache miss
  ▼
Cassandra
(url_mappings table)
      │
   Kafka (async)
      │
  ClickHouse
  (analytics)
```

On URL creation, the API server generates a Snowflake ID, encodes it as Base62, writes to Cassandra, and caches it in Redis. On redirect, the request hits the CDN first (for hot URLs), then Redis, then Cassandra on a miss. Analytics events are written to Kafka asynchronously — the redirect response never waits for analytics.

> 301 vs 302 is the most common follow-up question. Use 302 so every redirect hits your server and is tracked. Use 301 only if you want browsers to cache and skip analytics.

## D — Data Model

```typescript
interface UrlMapping {
  shortCode: string;       // 7-char Base62 — partition key
  longUrl: string;
  userId?: string;         // null for anonymous
  isCustom: boolean;
  createdAt: Date;
  expiresAt?: Date;        // null = never expires
  urlHash: string;         // SHA-256 of longUrl — for dedup check
}

interface ClickEvent {
  eventId: string;
  shortCode: string;
  clickedAt: Date;
  ipAddress: string;
  country: string;
  city: string;
  userAgent: string;
  referrer: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

interface AnalyticsSummary {
  shortCode: string;
  totalClicks: number;
  uniqueVisitors: number;
  period: 'day' | 'week' | 'month';
  topCountries: Array<{ country: string; clicks: number }>;
  topReferrers: Array<{ source: string; clicks: number }>;
}
```

Storage notes (plain text):
- url_mappings: Cassandra — partition key = `short_code`, O(1) lookup; write throughput of 1,150/sec is trivial for Cassandra
- click_events: ClickHouse — columnar, optimized for aggregations over time-series data; ingested from Kafka
- url_hash index: secondary table in Cassandra `(url_hash → short_code)` for deduplication on creation
- Redis: key = `url:{shortCode}`, value = longUrl string, TTL = 24 hours; LRU eviction policy

## I — Interface (APIs)

```typescript
// POST /api/v1/shorten — create a short URL
interface ShortenRequest {
  longUrl: string;
  customAlias?: string;
  expiresAt?: string;  // ISO 8601
}
interface ShortenResponse {
  shortUrl: string;      // e.g. https://short.ly/8M0kX
  shortCode: string;
  longUrl: string;
  createdAt: string;
  expiresAt?: string;
}

// GET /:shortCode — redirect (the hot path)
// HTTP 302 Found — Location: https://original-long-url.com/...
// Response headers include Rate-Limit and cache-control headers

// GET /api/v1/analytics/:shortCode?period=7d
interface AnalyticsResponse {
  shortCode: string;
  totalClicks: number;
  uniqueVisitors: number;
  clicksByDate: Array<{ date: string; clicks: number }>;
  topCountries: Array<{ country: string; clicks: number }>;
  topReferrers: Array<{ source: string; clicks: number }>;
}

// DELETE /api/v1/urls/:shortCode — deactivate a short link
interface DeleteResponse {
  shortCode: string;
  deleted: boolean;
}
```

## O — Optimizations & Trade-offs

### 1. ID Generation — Base62 via Snowflake

```typescript
const BASE62 = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

function encodeBase62(num: bigint): string {
  if (num === 0n) return '0';
  let encoded = '';
  while (num > 0n) {
    encoded = BASE62[Number(num % 62n)] + encoded;
    num = num / 62n;
  }
  return encoded;
}

// 7-char Base62 = 62^7 = 3.5 trillion unique codes
// At 100M URLs/day → 35,000 days = 96 years of capacity
```

| Approach | Pros | Cons |
|---|---|---|
| MD5 hash + truncate | Deterministic | Collisions, needs collision check |
| Random string | Simple | Collision check needed, not sortable |
| Base62(Snowflake ID) | No collisions, sortable, compact | Requires ID service |

✅ Use Base62-encoded Snowflake ID. Snowflake gives unique IDs across distributed servers without coordination at query time. See [../BuildingBlocks/](../BuildingBlocks/) for Snowflake internals.

### 2. Redirect Type — 301 vs 302

| Aspect | 301 Permanent | 302 Temporary |
|---|---|---|
| Browser caches redirect | Yes — subsequent clicks skip your server | No — every click hits your server |
| Analytics accuracy | ❌ Cached clicks are invisible | ✅ Every click is tracked |
| CDN behavior | CDN caches and serves | CDN does not cache |
| SEO | Passes link equity | Does not pass link equity |

✅ Use 302 for analytics-enabled links. Use 301 only for internal redirects where analytics is irrelevant.

### 3. Caching — Three Layers

```typescript
async function redirect(shortCode: string): Promise<string> {
  // Layer 1: CDN edge cache (Cloudflare) — top 10% hottest links, ~80% hit
  // Layer 2: Redis application cache — ~95% hit rate across all links
  const cached = await redis.get(`url:${shortCode}`);
  if (cached) {
    publishClickEvent(shortCode);  // fire-and-forget
    return cached;
  }

  // Layer 3: Cassandra — only ~5% of redirects reach DB
  const row = await cassandra.execute(
    'SELECT long_url, expires_at FROM url_mappings WHERE short_code = ?',
    [shortCode]
  );
  if (!row || (row.expires_at && row.expires_at < new Date())) {
    throw new NotFoundError();
  }

  await redis.setex(`url:${shortCode}`, 86_400, row.long_url);
  publishClickEvent(shortCode);
  return row.long_url;
}
```

❌ Don't serve analytics synchronously in the redirect path — adds 50ms+ latency.
✅ Publish click events to Kafka, return the redirect immediately. ClickHouse consumers process events in batch.

### 4. Custom Aliases — Collision Check

```typescript
async function createShortUrl(longUrl: string, customAlias?: string): Promise<string> {
  const shortCode = customAlias ?? encodeBase62(snowflake.generate());

  if (customAlias) {
    const exists = await cassandra.execute(
      'SELECT short_code FROM url_mappings WHERE short_code = ?', [customAlias]
    );
    if (exists.rowLength > 0) throw new Error('Alias already taken');
  }

  await cassandra.execute(
    'INSERT INTO url_mappings (short_code, long_url, url_hash, created_at) VALUES (?, ?, ?, ?)',
    [shortCode, longUrl, sha256(longUrl), new Date()]
  );
  return shortCode;
}
```

### 5. Scaling Pitfalls

| Pitfall | Fix |
|---|---|
| ❌ URL creation hits DB directly — 1,150 writes/sec is fine, but dedup check causes a read per write | ✅ Cache `hash:{urlHash}` in Redis; dedup check hits cache, not DB |
| ❌ Hot URLs cause Redis stampede on TTL expiry | ✅ Probabilistic early revalidation — refresh cache when TTL < 10% remaining |
| ❌ Analytics writes slow down redirect path | ✅ Kafka decouples — redirect returns in < 20ms, analytics processes asynchronously |

## Common Follow-up Questions

**Q: How do you prevent abuse — someone shortening a malware URL?**

On creation, run the long URL through a blocklist service (Google Safe Browsing API). If flagged, reject the request. For already-created links found to be malicious, update a Redis blocklist key `blocked:{shortCode}`. The redirect path checks this key before returning the URL.

**Q: How do you handle URL expiration at scale?**

Store `expiresAt` in Cassandra. On redirect, check expiration and return 404 if expired. For cleanup, run a daily Cassandra TTL scan or use Cassandra's native `TTL` column feature — rows auto-delete on expiration. Proactively evict expired Redis keys with a background job.

**Q: How do you scale ID generation across multiple servers?**

Each API server runs its own Snowflake generator with a unique machine ID (assigned at startup via ZooKeeper or a simple Redis counter). Snowflake IDs are generated locally — no network call needed. This means ID generation adds zero latency.

**Q: What if Redis goes down? Does the whole redirect system fail?**

No — fall through to Cassandra. Redirect latency spikes from ~5ms to ~50ms, but the system stays available. This is a planned degradation path. See [../BuildingBlocks/](../BuildingBlocks/) for cache fallback patterns.

---

[← Back to InterviewQuestions](../README.md)
