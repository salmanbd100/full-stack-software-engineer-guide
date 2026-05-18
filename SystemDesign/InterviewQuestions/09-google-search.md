# Design Google Search

## How to Open This Answer

"I'll design Google Search — covering the web crawler, inverted index, PageRank-style link analysis, query processing, and result ranking. This system indexes billions of pages and answers 8.5 billion queries per day."

## Problem Statement

Google Search must crawl the entire web continuously, maintain a fresh inverted index, and return ranked results in under 200 ms. The web contains an estimated 5.5 billion indexed pages, and the system processes 99,000 queries per second at peak.

## R — Requirements

### Functional (pick 4-5 that matter most)

- A web crawler discovers and fetches new and updated pages continuously
- An indexer extracts terms and builds an inverted index across all pages
- A ranking pipeline scores results using signals including link authority and relevance
- The query processor returns the top-K results for a user query in under 200 ms
- Popular queries are cached to avoid full index traversal on every request

### Non-Functional (pick 3-4)

- Latency: P99 query response under 200 ms globally
- Scale: 99,000 queries/second, 5.5 billion indexed documents
- Freshness: breaking-news pages indexed within minutes; general pages within days
- Availability: 99.999% — even brief outages affect billions of users

## A — Architecture

### High-Level Diagram

```
  CRAWL PIPELINE
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  URL Frontier ──▶ Crawler Workers ──▶ Raw Page Store    │
  │  (priority queue)   (distributed)      (GCS / Colossus) │
  │       ▲                                      │          │
  │       │ extract links                        │ parse    │
  │       └──────────────────────────────────────┘          │
  └──────────────────────────────────────────────────────────┘
                                │
                        ┌───────▼────────┐
  INDEX PIPELINE        │  Doc Processor │
  ┌─────────────────────┤  (Mapreduce /  │
  │                     │   Dataflow)    │
  │  Inverted Index     └───────┬────────┘
  │  Builder ◀──────────────────┘
  │  (sharded by term)
  │  stored in Bigtable
  └──────────────────────────────────────────┐
                                             │
  SERVING PIPELINE                           │
  ┌────────────────────────────────────────┐ │
  │                                        │ │
  │  Query Frontend ──▶ Query Processor    │ │
  │  (spell-correct,    (fan-out to index  │─┘
  │   tokenise,          shards, merge,
  │   expand)            top-K select)
  │                           │
  │                    ┌──────▼──────┐
  │                    │  Ranker     │
  │                    │ (PageRank + │
  │                    │  ML signals)│
  │                    └──────┬──────┘
  │                           │
  │                    ┌──────▼──────┐
  │                    │ Result Cache│  (Memcache, keyed by query hash)
  │                    └─────────────┘
  └────────────────────────────────────────┘
```

The architecture splits into three independent pipelines: crawl, index, and serve. The crawl pipeline runs continuously, feeding raw HTML into distributed storage. The index pipeline (batch + incremental) transforms raw HTML into an inverted index sharded by term across thousands of machines. The serving pipeline answers live queries by fanning out to index shards in parallel, merging postings lists, and applying a multi-signal ranker.

## D — Data Model

```typescript
interface CrawledPage {
  url: string;
  contentHash: string;    // SHA-256 of body — skip reindex if unchanged
  fetchedAt: Date;
  httpStatus: number;
  contentType: string;
  rawHtml: string;        // stored in object storage, not in DB
  outboundLinks: string[];
  crawlDepth: number;
  canonicalUrl: string;
}

interface IndexedDocument {
  docId: number;           // compact integer for postings list efficiency
  url: string;
  title: string;
  snippet: string;         // pre-computed 160-char summary
  pageRankScore: number;   // iteratively computed link authority
  indexedAt: Date;
  language: string;
  contentSignals: {
    wordCount: number;
    titleTerms: string[];
    bodyTerms: string[];
    anchorTerms: string[];   // text from inbound links — strong relevance signal
  };
}

// Inverted index entry — one row per term in Bigtable
interface PostingsEntry {
  term: string;              // lowercased, stemmed
  docId: number;
  termFrequency: number;     // occurrences in document
  fieldWeights: {
    title: number;
    body: number;
    anchor: number;
    url: number;
  };
  positions: number[];       // for phrase queries ("new york")
}

interface QueryLog {
  queryHash: string;
  rawQuery: string;
  userId: string | null;
  region: string;
  resultsReturned: number;
  latencyMs: number;
  recordedAt: Date;
  clickedDocId: number | null;
}
```

## I — Interface (APIs)

```typescript
// 1. User-facing search — the only public API
// GET /search?q=&lang=&region=&page=&safe=
interface SearchRequest {
  q: string;
  lang: string;         // e.g. "en"
  region: string;       // e.g. "US"
  page: number;         // 1-based
  safeSearch: "off" | "moderate" | "strict";
}
interface SearchResponse {
  query: string;
  correctedQuery: string | null;   // "did you mean …"
  totalEstimated: number;
  results: SearchResult[];
  knowledgePanel: KnowledgePanel | null;
  searchTimeMs: number;
}

interface SearchResult {
  docId: number;
  url: string;
  title: string;
  snippet: string;
  siteLinks: Array<{ title: string; url: string }>;
  cachedUrl: string | null;
  rankScore: number;   // internal, stripped before sending to client
  freshness: "breaking" | "recent" | "evergreen";
}

interface KnowledgePanel {
  entityType: "person" | "place" | "organization" | "concept";
  name: string;
  description: string;
  attributes: Record<string, string>;
  imageUrl: string | null;
  sourceUrl: string;
}

// 2. Crawler submits discovered URLs to the frontier (internal)
// POST /internal/crawler/urls
interface UrlSubmitRequest {
  sourceUrl: string;
  discoveredUrls: Array<{ url: string; anchorText: string }>;
  crawlPriority: number;   // 0–100, higher = crawl sooner
}

// 3. Indexer signals a doc is ready for serving (internal)
// POST /internal/index/documents
interface IndexDocumentRequest {
  docId: number;
  url: string;
  postingsEntries: PostingsEntry[];
  pageRankScore: number;
  indexedAt: Date;
}

// 4. Cache lookup for a query (internal)
// GET /internal/cache/query?hash=
interface CachedQueryResponse {
  hit: boolean;
  results: SearchResult[] | null;
  cachedAt: Date | null;
  ttlSeconds: number;
}
```

## O — Optimizations & Trade-offs

### Scaling Concerns

| Concern | Naive Approach | Production Approach |
|---|---|---|
| Index size (5.5B docs) | Single server index | Sharded by term across 1000s of machines |
| Query latency | Sequential shard scan | Parallel fan-out + scatter-gather merge |
| Duplicate content | Index everything | SimHash near-duplicate detection before index |
| Crawl politeness | Unlimited fetch rate | `robots.txt` + per-domain rate limiter |
| Freshness for news | Crawl on schedule | Real-time ping / sitemap update hooks |

### Inverted Index Sharding Strategy

> The inverted index is sharded by term — all postings for a given term live on the same machine. A query fans out to all shards in parallel and merges the top-K results.

- ❌ Sharding by document ID — every query hits every shard (full scatter-gather)
- ✅ Sharding by term — queries for rare terms hit few shards; common terms cached

### Ranking Signals

| Signal | Weight | Notes |
|---|---|---|
| TF-IDF relevance | High | Classic information retrieval score |
| PageRank (link authority) | High | Iterative convergence across link graph |
| Anchor text | Medium | Inbound link text is a strong title proxy |
| Click-through rate (CTR) | Medium | Learned from query log |
| Freshness | Variable | Boosted for news queries, neutral for evergreen |
| User location | Low | Geo-sensitive queries ("pizza near me") |

### Popular Query Caching

> 15% of queries account for 85% of traffic (power law). Caching results for the top 10M queries in Memcache eliminates full index traversal for most traffic.

- ❌ No cache — 99,000 full index fan-outs per second
- ✅ Memcache keyed by `(normalised_query, region, lang)` with 5-minute TTL

### Crawl Politeness vs. Freshness Tension

- ❌ Crawl every site as fast as possible — sites block the crawler, legal risk
- ✅ Per-domain crawl budget: rate limit by `Crawl-Delay` in `robots.txt`; prioritise sitemaps

See [../Scalability/](../Scalability/) for distributed queue patterns and [../BuildingBlocks/](../BuildingBlocks/) for inverted index deep-dives.

## Common Follow-up Questions

**Q: How does PageRank work at web scale?**
PageRank is an iterative algorithm: each page distributes its score equally to all pages it links to. After ~50 iterations, scores converge. At web scale, this runs as a distributed MapReduce/Dataflow job on the link graph. The graph itself is stored in a columnar format (Dremel-style) — too large for adjacency list DBs.

**Q: How do you keep the index fresh for breaking news?**
A dedicated "freshness" crawler monitors RSS feeds, sitemaps, and `IndexNow` pings from publishers. Pages flagged as breaking news bypass the standard crawl queue and go through an expedited index pipeline within minutes.

**Q: How do you handle near-duplicate content across the web?**
SimHash: each document is hashed into a 64-bit fingerprint based on term frequency. Documents within Hamming distance 3 are considered near-duplicates. Only the canonical version is indexed; others are discarded during the doc processing stage.

**Q: How does spell correction work?**
A statistical language model trained on the query log scores candidate corrections. "Did you mean" triggers when the correction score exceeds a threshold and the original query has very few results. Noisy channel model: P(correction | misspelling) ∝ P(correction) × P(misspelling | correction).

**Q: How would you add personalised results?**
Store a user interest vector derived from click history. At query time, re-rank the top-100 results by dot product with the user vector. Apply after the base ranker so personalisation adjusts but does not override authoritative results.

---
[← Back to InterviewQuestions](../README.md)
