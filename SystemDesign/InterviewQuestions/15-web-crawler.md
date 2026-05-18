# Design Web Crawler

## How to Open This Answer

"I'll design a distributed web crawler — covering the URL frontier, politeness constraints, duplicate detection, and horizontal scale-out. The core challenge is crawling billions of pages without overwhelming servers or re-crawling the same content."

## Problem Statement

A production-grade web crawler must discover, fetch, and store billions of web pages continuously. It must respect `robots.txt`, avoid duplicate work, and distribute load across a large worker fleet — all while keeping the URL frontier prioritised by freshness and authority.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Seed URLs are accepted; the crawler follows outbound links recursively
- `robots.txt` is fetched and obeyed for every domain before crawling
- Each URL is crawled at most once per recrawl cycle (duplicate detection)
- Crawled HTML is stored for downstream consumers (indexers, scrapers)
- Crawl priority is configurable: fresh pages and high-authority domains first

### Non-Functional (pick 3-4)

- Scale: crawl 1 billion pages per day (~11,500 pages/second)
- Politeness: no more than 1 request per second per domain
- Freshness: high-priority pages recrawled within 24 hours
- Fault tolerance: worker crashes do not lose URLs or cause duplicates

## A — Architecture

### High-Level Diagram

```
  SEED INPUT
  ┌──────────────────┐
  │  Seed URL List   │
  │  (S3 batch file  │
  │   or API)        │
  └────────┬─────────┘
           │
           ▼
  ┌──────────────────────────────────────────────────────┐
  │                  URL FRONTIER                        │
  │                                                      │
  │  ┌────────────────┐    ┌──────────────────────────┐ │
  │  │ Priority Queue │    │  Per-Domain Delay Queue  │ │
  │  │ (Redis ZSet,   │    │  (rate limiter: 1 req/s  │ │
  │  │  scored by     │───▶│   per domain)            │ │
  │  │  priority)     │    └──────────────────────────┘ │
  │  └────────────────┘                                  │
  └────────────────────────────┬─────────────────────────┘
                               │  dispatch URL
                    ┌──────────▼──────────┐
                    │   Crawler Workers   │  (stateless, horizontally scaled)
                    │   (K8s pods)        │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼──────────────────┐
              ▼                ▼                   ▼
  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  robots.txt   │  │  HTTP Fetcher    │  │  Duplicate       │
  │  Cache        │  │  (follows        │  │  Detector        │
  │  (Redis TTL)  │  │   redirects,     │  │  (Bloom filter + │
  │               │  │   TLS)           │  │   SHA-256 store) │
  └───────────────┘  └────────┬─────────┘  └──────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │  Link Extractor     │  parses HTML, extracts hrefs
                   └──────────┬──────────┘
                              │
              ┌───────────────┼─────────────────┐
              ▼               ▼                  ▼
  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────┐
  │  Raw Page     │  │  URL Normaliser  │  │  Crawl State DB  │
  │  Store        │  │  + Filter        │  │  (last_crawled,  │
  │  (S3/GCS)     │  │  → back to       │  │   content_hash)  │
  │               │  │    frontier      │  │  (Cassandra)     │
  └───────────────┘  └──────────────────┘  └──────────────────┘
```

Workers are fully stateless. All shared state (frontier, crawl history, robots cache) lives in distributed stores. This allows horizontal scale-out by simply adding more worker pods. The frontier separates a global priority queue from per-domain delay queues to enforce politeness without blocking other domains.

## D — Data Model

```typescript
interface FrontierUrl {
  url: string;
  normalizedUrl: string;          // scheme-lower, path-normalised, fragment stripped
  domain: string;
  priority: number;               // 0–100, used as Redis ZSet score
  depth: number;                  // hops from a seed URL
  discoveredAt: Date;
  scheduledAfter: Date;           // enforces per-domain crawl delay
  sourceUrl: string | null;       // the page that linked here
}

interface CrawlRecord {
  normalizedUrl: string;
  contentHash: string;           // SHA-256 of response body
  lastCrawledAt: Date;
  httpStatus: number;
  contentType: string;
  rawStoragePath: string;        // e.g. s3://crawl-bucket/2024/01/15/{hash}.gz
  outboundLinkCount: number;
  nextCrawlAfter: Date;          // adaptive: popular pages crawled more often
  crawlAttempts: number;
  errorMessage: string | null;
}

interface RobotsTxtEntry {
  domain: string;
  fetchedAt: Date;
  expiresAt: Date;               // Robots TTL — re-fetch daily
  disallowedPaths: string[];
  crawlDelaySeconds: number;     // from Crawl-delay directive
  sitemapUrls: string[];
}

interface DomainCrawlBudget {
  domain: string;
  pagesCrawledToday: number;
  dailyBudget: number;           // configurable per domain
  lastCrawledAt: Date;
  nextAllowedAt: Date;           // rate limiter checkpoint
}
```

## I — Interface (APIs)

```typescript
// 1. Submit seed URLs to start or expand a crawl
// POST /api/v1/crawler/seeds
interface SeedSubmitRequest {
  urls: string[];
  priority: number;    // 0–100
  recrawlIntervalHours: number;
  tags: string[];      // e.g. ["news", "ecommerce"] for filtering
}
interface SeedSubmitResponse {
  accepted: number;
  rejected: number;      // already in frontier or malformed
  rejectedUrls: string[];
}

// 2. Get crawl status for a URL
// GET /api/v1/crawler/status?url=
interface CrawlStatusResponse {
  url: string;
  status: "queued" | "in_progress" | "completed" | "failed" | "excluded";
  lastCrawledAt: Date | null;
  nextScheduledAt: Date | null;
  contentHash: string | null;
  rawStoragePath: string | null;
  httpStatus: number | null;
}

// 3. Get frontier stats (ops dashboard)
// GET /api/v1/crawler/stats
interface FrontierStatsResponse {
  queueDepth: number;
  activeWorkers: number;
  pagesPerSecond: number;
  uniqueDomainsQueued: number;
  crawledToday: number;
  errorRatePct: number;
}

// 4. Pause or resume crawling for a domain
// PUT /api/v1/crawler/domains/:domain/policy
interface DomainPolicyRequest {
  action: "pause" | "resume" | "ban";
  reason: string;
  dailyBudget?: number;
  crawlDelaySeconds?: number;
}

// 5. Retrieve raw page content from storage
// GET /api/v1/crawler/pages?url=
interface RawPageResponse {
  url: string;
  contentType: string;
  crawledAt: Date;
  httpStatus: number;
  rawHtmlBase64: string;    // gzip-compressed, base64-encoded
  contentHash: string;
}
```

## O — Optimizations & Trade-offs

### Scaling Concerns

| Concern | Naive Approach | Production Approach |
|---|---|---|
| URL deduplication | DB lookup per URL | Bloom filter (false positive ~0.1%) + hash store |
| Politeness | Single global queue | Per-domain delay queues in Redis |
| robots.txt overhead | Fetch per request | Domain-keyed Redis cache, 24-hour TTL |
| Worker coordination | Shared DB lock | Kafka partition-per-domain assignment |
| Near-duplicate content | Store all pages | SimHash fingerprint — discard if Hamming dist < 3 |

### URL Frontier: BFS vs. DFS

> BFS discovers broad coverage quickly and respects crawl budgets naturally. DFS risks going infinitely deep on a single site.

| Strategy | Pros | Cons |
|---|---|---|
| BFS (FIFO queue) | Broad coverage, predictable depth | Lower priority for important pages |
| DFS (LIFO stack) | Deep traversal of a site | Ignores other sites for long periods |
| Priority queue | ✅ Best of both — authority-aware | More complex queue management |

Recommended: priority queue scored by (PageRank estimate × freshness signal).

### Duplicate Detection with Bloom Filters

> A Bloom filter with 10 billion entries and 1% false positive rate uses ~12 GB of RAM — far cheaper than a DB lookup per URL.

- ❌ `SELECT COUNT(*) FROM crawl_records WHERE url = ?` per URL — too slow at 11,500 URLs/s
- ✅ Bloom filter check (in-memory, ~1 µs) → on negative, insert into DB

### Content-Level Deduplication

- ❌ Store all fetched pages — terabytes of near-duplicate mirrors and boilerplate
- ✅ SHA-256 content hash: skip storing if hash already seen. SimHash for near-dupes.

### Adaptive Recrawl Scheduling

| Page Type | Recrawl Interval |
|---|---|
| News / breaking content | 15–60 minutes |
| E-commerce product pages | 24 hours |
| Wikipedia / reference | 7 days |
| Archived/static pages | 30+ days |

Signal: if `contentHash` unchanged on last 3 consecutive crawls, double the interval.

## Common Follow-up Questions

**Q: How do you handle infinite crawl traps?**
Enforce a maximum crawl depth per seed (e.g., depth 10). Detect URL pattern cycles with regex (e.g., `?page=1&page=2&page=3…`). Normalise URLs to collapse tracking parameters before frontier insertion.

**Q: How do you scale to 1 billion pages per day?**
Horizontal worker scaling: 11,500 pages/second ÷ ~10 pages/second per worker = ~1,150 workers. Partition the frontier by domain hash across Kafka topics. Each worker consumes one partition, guaranteeing politeness without coordination overhead.

**Q: How do you handle `robots.txt` at scale?**
Cache per domain in Redis with a 24-hour TTL. On cache miss, fetch `robots.txt` before the first URL for that domain. If the fetch fails, apply conservative defaults (allow all, 1 req/s). Store parsed rules — not raw text — to avoid re-parsing overhead.

**Q: What happens when a worker crashes mid-crawl?**
Kafka offset is not committed until the worker successfully fetches, stores, and inserts outbound links. On crash, the message is redelivered to another worker. Idempotency: `CrawlRecord` upsert on `normalizedUrl` means re-crawling the same URL is safe.

**Q: How do you prioritise crawling fresh content over stale content?**
Use a Redis sorted set (`ZADD`) with the score being `priority × (1 / hours_since_last_crawl)`. High-authority domains that haven't been crawled recently float to the top. Sitemaps with `<lastmod>` dates boost priority for recently modified pages.

---
[← Back to InterviewQuestions](../README.md)
