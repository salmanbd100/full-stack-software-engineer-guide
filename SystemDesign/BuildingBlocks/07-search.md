# Search

## 💡 **Concept**

Full-text search finds documents containing words or phrases across millions of records in milliseconds. A relational database `LIKE '%query%'` performs a full table scan — it does not scale beyond a few hundred thousand rows. Search engines use an **inverted index** to answer text queries in O(log n) instead.

**Use a dedicated search engine when:** users need to search across text fields, you have > 100k documents, or you need relevance ranking.

---

## How Inverted Index Works

```
Documents:
  Doc1: "fast food delivery app"
  Doc2: "food truck festival"
  Doc3: "app for delivery tracking"

Inverted Index:
  "app"      → [Doc1, Doc3]
  "delivery" → [Doc1, Doc3]
  "fast"     → [Doc1]
  "food"     → [Doc1, Doc2]
  "festival" → [Doc2]
  "truck"    → [Doc2]
  "tracking" → [Doc3]

Query: "food delivery"
  → "food" hits [Doc1, Doc2]
  → "delivery" hits [Doc1, Doc3]
  → intersection: Doc1 (highest relevance)
  → union + ranked: [Doc1, Doc3, Doc2]
```

Terms are tokenized, normalized (lowercased, stemmed), and stored with the document IDs that contain them.

---

## Search Ranking

**BM25** (used by Elasticsearch): improves on TF-IDF with document length normalization.

- **TF** — how often the term appears in this document
- **IDF** — how rare the term is across all documents
- Score = TF × IDF, normalized by doc length

**Practical ranking signals:**
- Text relevance (BM25)
- Recency boost (newer content ranked higher)
- Popularity (click-through rate, view count)
- Field boosts (title match > body match)

---

## TypeScript Search Interface

```typescript
interface SearchDocument {
  id: string;
  title: string;
  body: string;
  tags: string[];
  publishedAt: Date;
}

interface SearchQuery {
  text: string;
  filters?: {
    tags?: string[];
    dateRange?: { from: Date; to: Date };
  };
  page?: number;
  pageSize?: number;
}

interface SearchResult<T> {
  hits: Array<{ document: T; score: number }>;
  total: number;
  tookMs: number;
}

interface SearchClient {
  index(document: SearchDocument): Promise<void>;
  bulkIndex(documents: SearchDocument[]): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult<SearchDocument>>;
  delete(id: string): Promise<void>;
}

// Elasticsearch-style query builder
function buildQuery(query: SearchQuery): object {
  return {
    query: {
      bool: {
        must: [{
          multi_match: {
            query: query.text,
            fields: ["title^3", "body", "tags^2"], // title boosted 3×
            type: "best_fields",
            fuzziness: "AUTO",
          },
        }],
        filter: [
          ...(query.filters?.tags
            ? [{ terms: { tags: query.filters.tags } }]
            : []),
          ...(query.filters?.dateRange
            ? [{ range: { publishedAt: {
                gte: query.filters.dateRange.from,
                lte: query.filters.dateRange.to,
              }}}]
            : []),
        ],
      },
    },
    from: ((query.page ?? 1) - 1) * (query.pageSize ?? 10),
    size: query.pageSize ?? 10,
  };
}
```

---

## Elasticsearch Architecture

```
Client
  │
  ▼
┌──────────────────────────────┐
│    Elasticsearch Cluster     │
│                              │
│  ┌────────┐   ┌────────┐    │
│  │ Node 1 │   │ Node 2 │    │  ← master + data nodes
│  │ Shard0 │   │ Shard1 │    │
│  │ Rep1   │   │ Rep0   │    │  ← primary + replica per shard
│  └────────┘   └────────┘    │
└──────────────────────────────┘
```

- **Index:** a collection of documents (analogous to a DB table)
- **Shard:** horizontal partition; each shard is a Lucene instance
- **Replica:** copy of a shard for redundancy and read throughput
- **Rule of thumb:** keep shards 10–50 GB; start with 1 shard per 5M documents

---

## Tool Comparison

| | SQL LIKE | Elasticsearch | Algolia |
|---|---|---|---|
| **Full-text ranking** | None | Excellent (BM25) | Excellent |
| **Latency** | High on large tables | 5–50ms | 1–10ms |
| **Scale** | < 1M rows for text | Billions of documents | Millions of records |
| **Cost** | DB cost only | Self-hosted or managed | SaaS (expensive at scale) |
| **Setup** | None | Medium | Low (SaaS) |
| **Best for** | Small datasets, exact match | Large-scale text search | Fast prototyping, e-commerce |

---

## Autocomplete / Typeahead

```typescript
interface AutocompleteQuery {
  prefix: string;
  limit: number;
  context?: string; // category filter
}

// For < 10ms latency: Redis sorted set with lexicographic prefix scan
async function autocomplete(redis: RedisClient, prefix: string): Promise<string[]> {
  // members stored as: "term\0id", score = 0
  // ZRANGEBYLEX returns lexicographic range
  return redis.zrangebylex("autocomplete", `[${prefix}`, `[${prefix}\xff`, "LIMIT", 0, 10);
}
```

For full autocomplete with Elasticsearch: use `search_as_you_type` field type (edge n-grams generated at index time).

---

## Sync Strategy

| Strategy | How | Latency | Complexity |
|---|---|---|---|
| **Synchronous write** | Write DB + index in same request | 0 | Simple, risk of partial failure |
| **Async via queue** | DB write → SQS → indexer worker | Seconds | Recommended |
| **Change Data Capture** | DB WAL → Debezium → index | Seconds | Complex, most reliable |

> Accept eventual consistency in search. Use async queue sync for most systems.

---

## When to Use

| Scenario | Recommendation |
|---|---|
| < 100k records, exact match | SQL WHERE + index |
| Full-text search, > 100k records | Elasticsearch / OpenSearch |
| E-commerce product search | Elasticsearch or Algolia |
| Autocomplete with < 10ms target | Redis sorted set |
| Log / analytics search | Elasticsearch (ELK stack) |

---

## Common Mistakes

❌ **`LIKE '%term%'` on large tables** — no index helps; every query scans the full table.

❌ **Over-sharding** — 1 shard per document wastes resources. Let shards grow to 10–50 GB.

❌ **Synchronous indexing in the request path** — a slow Elasticsearch response blocks the user. Always index async.

✅ **Denormalize into the search index** — include author name and category in the document to avoid joins at query time.

---

## Real-World Example

An enterprise document portal indexes 10M PDFs and Word documents. Extracted text is stored in Elasticsearch with 5 shards and 1 replica. An SQS-backed worker indexes new documents within 30 seconds of upload. Search returns results in 20–40ms using BM25 ranking boosted by recency. The SQL database is never touched during search.

---

## Key Insight

> Search is a read-optimized, eventually consistent projection of your data. Never force your primary database to serve full-text search at scale. Design search as a separate write target from day one.

**Related:** [Message Queues](./05-message-queues.md) · [Interview: Typeahead](../InterviewQuestions/16-typeahead.md)

---

[← Back to SystemDesign](../README.md)
