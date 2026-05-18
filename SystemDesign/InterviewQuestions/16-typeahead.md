# Design Typeahead (Autocomplete)

## How to Open This Answer

"I'll design a typeahead service that returns ranked suggestions within 100ms as the user types. My focus areas are the trie-based prefix index, a top-k cache for hot queries, and the async pipeline that refreshes suggestions from real search logs."

## Problem Statement

Users expect instant suggestions as they type in a search box. The system must return the top-k most relevant completions for any prefix in under 100ms. At Google or Twitter scale this means serving billions of prefix queries per day with stale-tolerant but high-quality ranking.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Return top 5–10 suggestions for a given prefix string
- Rank suggestions by query frequency and recency
- Update suggestion index as new searches are logged
- Support per-user personalisation (recent searches surfaced first)
- Debounce client requests — only fire after 200ms of inactivity

### Non-Functional (pick 3-4)

- p99 latency ≤ 100ms end-to-end (including network round-trip)
- Handle 100k suggestion requests per second at peak
- Eventual consistency on index updates is acceptable (lag ≤ 10 minutes)
- 99.99% availability — users must always get *some* suggestions

## A — Architecture

### High-Level Diagram

```
Browser / App
     │  (debounced keystroke, every 200ms)
     ▼
  CDN / Edge Cache  ──── cache hit ──▶  return cached suggestions
     │ cache miss
     ▼
Load Balancer
     │
     ▼
Suggestion Service (stateless, horizontally scaled)
     │              │
     ▼              ▼
 Redis Cache    Trie Service
 (top-k per     (prefix lookup,
  prefix)        in-memory trie)
                    │
                    ▼
              Search Log Store  ◀── async pipeline
              (Kafka → Spark/Flink → periodic trie rebuild)
```

The Suggestion Service first checks Redis for the prefix key. On a cache miss it queries the Trie Service, stores the result in Redis with a 10-minute TTL, then returns. A separate async pipeline consumes search logs from Kafka, computes top-k per prefix using a stream processor, and rebuilds the trie every 10 minutes. This decouples read latency from write complexity.

### Request Data Flow

1. User types "new y" — client waits 200ms debounce timer.
2. Client sends `GET /v1/suggest?q=new+y` to nearest CDN edge node.
3. CDN checks its cache — hit returns immediately (sub-10ms).
4. CDN miss forwards to Load Balancer → Suggestion Service instance.
5. Suggestion Service looks up `prefix:new y` key in Redis cluster.
6. Redis hit: returns cached top-k array. Redis miss: query Trie Service.
7. Trie Service walks trie from root to node at "new y" in O(7) steps.
8. Returns merged list of up to 10 suggestions sorted by score.
9. Suggestion Service writes result to Redis with 10-minute TTL.
10. Response returns to client — total round-trip ≤ 80ms.

### Index Update Data Flow

1. User submits search query "new york pizza" — `POST /v1/log` fires.
2. Suggestion Service writes log event to Kafka topic `search-logs`.
3. Flink stream processor consumes events, increments frequency counters.
4. Every 10 minutes: Flink emits updated top-k per prefix to S3 snapshot.
5. Batch coordinator calls `POST /internal/trie/rebuild` on Trie Service.
6. Trie Service loads snapshot, builds new trie in background thread.
7. Atomic pointer swap replaces old trie — zero downtime.
8. Old trie GC'd after all in-flight requests complete.

## D — Data Model

```typescript
// A node in the in-memory trie
interface TrieNode {
  children: Map<string, TrieNode>;
  // top-k suggestions sorted by score at this node
  suggestions: Suggestion[];
  isEndOfWord: boolean;
}

interface Suggestion {
  query: string;
  score: number;       // composite: frequency * recency_weight
  lastSeenAt: Date;
}

// Persisted query frequency record (rebuilt by batch pipeline)
interface QueryFrequency {
  query: string;
  count: number;       // rolling 30-day count
  updatedAt: Date;
}

// Redis cache entry (serialised as JSON string)
interface PrefixCacheEntry {
  prefix: string;
  suggestions: Suggestion[];
  cachedAt: Date;      // TTL enforced by Redis EXPIRE
}
```

## I — Interface (APIs)

```typescript
// GET /v1/suggest?q=<prefix>&limit=<n>&userId=<id>
interface SuggestRequest {
  q: string;           // prefix typed by user, e.g. "new yo"
  limit?: number;      // default 10, max 20
  userId?: string;     // optional, enables personalisation
}

interface SuggestResponse {
  prefix: string;
  suggestions: Array<{
    query: string;
    score: number;
  }>;
  servedFrom: "cache" | "trie";   // useful for observability
}

// POST /v1/log  — called after user submits a search
interface SearchLogRequest {
  query: string;
  userId: string;
  timestamp: string;   // ISO 8601
}
interface SearchLogResponse {
  accepted: boolean;
}

// POST /internal/trie/rebuild  — triggered by batch job
interface TrieRebuildRequest {
  snapshotPath: string;   // S3 path to new frequency snapshot
}
interface TrieRebuildResponse {
  nodesLoaded: number;
  durationMs: number;
}

// GET /internal/health
interface HealthResponse {
  status: "ok" | "degraded";
  trieVersion: string;
  redisPingMs: number;
}
```

## O — Optimizations & Trade-offs

### Scaling concerns

| Concern | Problem | Solution |
|---|---|---|
| Hot prefixes | "a", "th", "the" hit millions of times/sec | Pre-warm Redis on startup; short TTL (10 min) still serves stale from cache |
| Trie memory | Full English trie ~1–2 GB RAM | Keep only top-1M queries; shard trie by first character across nodes |
| Index freshness | Viral query ("earthquake 2026") not appearing | Run micro-batch every 1 min for high-velocity queries alongside 10-min full rebuild |
| Personalisation | Per-user trie is infeasible | Merge global top-k with user's recent 10 searches client-side |
| Cold start | New region has empty Redis | Load trie snapshot from S3; Redis populated lazily on first miss |

### Pitfalls

| Pitfall | Verdict |
|---|---|
| Rebuilding trie on every search log write | ❌ Too expensive — use async batch pipeline |
| Returning exact-match only | ❌ Miss prefix suggestions — walk all trie subtrees |
| No debounce on client | ❌ Floods service with every keystroke |
| Caching at CDN with long TTL | ✅ Great for top prefixes; use `Cache-Control: max-age=60` |
| Separate suggestion score per language/locale | ✅ Shard trie by locale to keep top-k relevant |

> The trie gives O(L) lookup where L is prefix length. The real work is maintaining a ranked top-k list at *every* node — store only top 10 suggestions per node, updated during batch rebuild.

### Ranking algorithm

The score for each suggestion is a composite of frequency and recency:

```typescript
function computeScore(query: QueryFrequency): number {
  const now = Date.now();
  const ageMs = now - query.updatedAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  // Exponential decay: halve weight every 7 days
  const recencyWeight = Math.pow(0.5, ageDays / 7);

  return query.count * recencyWeight;
}
```

A trending query from yesterday outscores an older query with 10x more historical volume. This ensures viral queries surface quickly without polluting long-term suggestions.

See [../Scalability/caching-strategies.md](../Scalability/caching-strategies.md) for Redis TTL patterns and [../BuildingBlocks/message-queues.md](../BuildingBlocks/message-queues.md) for the Kafka log pipeline.

## Common Follow-up Questions

**Q: How do you handle spelling corrections (did you mean…)?**
A: Run a separate spell-check service using edit-distance (BK-tree). Merge its results with trie suggestions. Only show corrections when trie returns fewer than 3 results.

**Q: How do you prevent offensive or banned queries from surfacing?**
A: Maintain a blocklist in Redis. Filter suggestions against it before returning. Refresh the blocklist every minute via a pub/sub event.

**Q: What if the trie service crashes mid-rebuild?**
A: Keep the previous trie in memory until the new one is fully loaded. Use blue/green swap — build new trie in background, atomically replace pointer, then GC old trie.

**Q: How do you scale to multiple languages?**
A: Partition the trie cluster by locale (`en`, `ar`, `zh`). Route requests to the correct shard based on the `Accept-Language` header.

**Q: Why not use Elasticsearch for prefix search?**
A: ES prefix queries work but add 10–30ms overhead and require a cluster per region. An in-memory trie with Redis L1 cache is simpler and 5–10x faster for this narrow use case.

**Q: How do you handle multi-word prefixes like "new york p"?**
A: Index the full query string as a single trie path — the trie already handles spaces as characters. Store top-k completions at the node for "new york p" so lookup is still O(L). Multi-word matching is no different from single-word at the trie level.

### Capacity Estimation (quick numbers to state in the interview)

| Metric | Estimate |
|---|---|
| DAU | 500 million |
| Searches per user per day | 5 |
| Total search events per day | 2.5 billion |
| Suggestion requests per search | ~8 keystrokes | 
| Peak suggestion QPS | ~230k |
| Average response size | 500 bytes |
| Peak outbound bandwidth | ~115 MB/s |
| Unique prefixes to cache | ~10 million (top queries cover 95%+ of traffic) |
| Redis memory for top prefixes | ~5 GB (10M × 500 bytes) |
| Trie in-memory size (top-1M queries) | ~1–2 GB per Trie Service node |

State these numbers confidently — they justify the caching and sharding decisions that follow.

### Trie vs Alternative Approaches

| Approach | Latency | Memory | Update Cost | Best For |
|---|---|---|---|---|
| In-memory trie | ≤ 2ms | Medium (1–2 GB) | Batch rebuild | General-purpose autocomplete |
| Redis sorted sets (prefix range) | ≤ 5ms | Medium | Low (streaming) | Simpler systems, fewer prefixes |
| Elasticsearch prefix query | 10–30ms | High | Real-time indexing | Full-text search, not pure autocomplete |
| PostgreSQL `LIKE 'prefix%'` | 50–200ms | Low | Immediate | Dev environments only |

The trie wins on read latency. Its weakness is rebuild time — a full English trie with 1M entries takes 30–60 seconds to build. Use incremental updates for high-velocity queries to bridge the gap between full rebuilds.

---
[← Back to InterviewQuestions](../README.md)
