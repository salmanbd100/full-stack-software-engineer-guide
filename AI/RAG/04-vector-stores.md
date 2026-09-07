---
title: Vector Stores
part: 7
chapter: 0
slug: vector-stores
level: advanced
reading_time: 11
updated: 2026-09-07
tags: [ai, rag, vector-database, pgvector, hnsw, indexing, sql]
in_book: true
---

# Vector Stores {#ch-vector-stores}

> Start with the database you already run, know what an approximate index actually trades away, and recognise the point where a dedicated store earns its operational cost.

**In this chapter:** what a vector store really is · pgvector versus dedicated · exact and approximate search · HNSW and IVFFlat · the costs nobody forecasts · when to move

## 💡 The Core Idea

A vector store does one thing: given a query vector, return the *k* nearest stored vectors, quickly.
Everything else it offers — metadata filtering, hybrid search, namespaces — is a database feature that a
database already has.

Which is why the honest default is **the database you already operate.** A Postgres extension makes
vectors a column type, and a column type inherits your backups, your migrations, your access control,
your transactions and your on-call runbook. A dedicated store starts all of that again from scratch, and
the recall improvement that justifies it does not arrive until the corpus is large.

> Adding a vector database is adding a stateful production dependency. The bar for that is higher than
> benchmark numbers.

## How It Works

### Exact against approximate

With no index, a similarity query compares the query vector to every row. It is exactly right, and it is
`O(n)`.

| | Exact (brute force) | Approximate (ANN) |
| --- | --- | --- |
| Recall | 100% | 95–99%, tunable |
| Speed at 10k vectors | Fast enough | Unnecessary |
| Speed at 10M vectors | Unusable | Milliseconds |
| Behaviour under filters | Predictable | Degrades; filter interaction is the hard part |

**Under about 100,000 vectors, exact search on a normal database is usually fine** — often a few tens of
milliseconds. Reaching for an approximate index before that is buying a recall loss you did not need.

### The two index types you will meet

| | HNSW | IVFFlat |
| --- | --- | --- |
| Structure | A navigable graph of neighbours | Clusters, searched by nearest centroids |
| Build time | Slow | Fast |
| Memory | High — the graph is resident | Lower |
| Query speed | Faster | Good |
| Incremental inserts | Handles them well | Degrades; needs rebuilding as data shifts |
| Needs data before building | No | Yes — clusters are learned from existing rows |

HNSW is the usual choice for a corpus that keeps growing. IVFFlat suits a large, static corpus where
build time and memory matter more than the last few points of recall.

```sql
-- pgvector: a column, an index, and a query. Note the operator picks the distance function.
CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL,
  heading     text,
  content     text NOT NULL,
  embedding   vector(1536)
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (tenant_id);

SELECT id, heading, content
FROM chunks
WHERE tenant_id = $2                    -- filter and vector search in one planner decision
ORDER BY embedding <=> $1               -- cosine distance
LIMIT 20;
```

That query is the argument for pgvector in six lines: the permission filter, the similarity search and
the transactional data live in one engine, and the planner decides how to combine them. In a separate
vector store, the same requirement becomes two systems and a consistency problem.

> ⚠️ **An approximate index plus a selective filter is where recall quietly collapses.** The index walks
> a graph built over all rows; if very few of them match the filter, the search can exhaust its candidate
> budget before finding enough matching neighbours. It returns fewer or worse results and reports no
> error. Test recall with your real filters, not on unfiltered queries.

### What a dedicated store actually buys

| Buys | Costs |
| --- | --- |
| Scale past tens of millions of vectors | A second stateful system to run and pay for |
| Purpose-built filtering and namespaces | Data split across two stores; no joins, no transactions |
| Managed sharding and replication | Sync pipeline, and the drift when it fails |
| Built-in hybrid search and reranking | Another vendor in the request path |

The unglamorous cost is the sync. Documents live in one database, vectors in another, and something has
to keep them agreed. Every deletion, every permission change, every re-index is now a distributed
operation, and the failure mode — a chunk that still exists in the index after the document was deleted —
is confidently cited to a user.

### The costs nobody forecasts

- **Storage is bigger than the text.** A 1536-dimension float32 vector is 6 KB. A million chunks is 6 GB
  of vectors, before the index, which for HNSW can add as much again.
- **HNSW wants memory.** The graph performs when resident. A store that swaps is slower than the exact
  search it replaced.
- **Re-embedding is a rebuild.** Changing the embedding model invalidates every vector, so budget a full
  re-embed and a switchover rather than a migration.
- **Dimensions are a cost lever.** Several current embedding models support shortened dimensions with a
  small recall loss — a 3× storage and memory saving is available if the eval says the loss is
  acceptable.

## When to Use It

| Situation | Store |
| --- | --- |
| Under ~100k chunks, Postgres already in production | pgvector, exact search first |
| 100k–5M chunks, Postgres in production | pgvector with HNSW |
| Tens of millions, or vector-heavy workload dominates | A dedicated store |
| Heavy metadata filtering, multi-tenant | pgvector — the planner handles both together |
| Prototype or a demo | An in-memory array; do not install anything |
| Already running a search cluster | Its vector support, before adding a third system |

That last row is worth saying out loud. A team already operating a full-text search cluster usually has
vector search available in it, and using it avoids a new dependency entirely.

## Common Mistakes

**❌ Installing a vector database for 20,000 chunks**

> Exact search over 20,000 rows in Postgres is milliseconds. The dedicated store adds an operational
> burden to solve a problem that did not exist.

**❌ Benchmarking recall without your filters**

> Unfiltered ANN recall looks excellent. Add a selective tenant filter and it can fall sharply, silently.

**❌ Forgetting the index does not update itself for free**

> IVFFlat degrades as data shifts away from the clusters it learned. It needs periodic rebuilds, and
> nothing alerts you.

**✅ Keep vectors next to the data they belong to for as long as you can**

> One store means one backup, one permission model, one transaction, and no sync pipeline to go wrong.

## 🔑 Key Takeaways

- A vector store returns *k* nearest vectors; everything else it offers is ordinary database functionality.
- Exact search is fine below roughly 100,000 vectors — approximate indexes trade recall you may not need to spend.
- HNSW suits growing corpora and wants memory; IVFFlat builds faster but degrades as data shifts.
- Approximate search plus a selective filter is where recall collapses silently — test with real filters.
- A dedicated store adds a second stateful system and a sync pipeline; the deleted-but-still-indexed document is its signature failure.

## Interview Questions

**Q: pgvector or a dedicated vector database?**

pgvector until the scale genuinely demands otherwise, because it makes vectors a column in a database I
already back up, migrate, secure and know how to operate. Metadata filtering and similarity search end up
in one planner decision instead of two systems and a sync pipeline. I would move to a dedicated store at
tens of millions of vectors, or when vector search is the dominant workload and is starting to interfere
with transactional traffic.

**Q: What does an approximate index give up?**

Exactness. It walks a structure that finds most of the true nearest neighbours rather than all of them,
typically 95 to 99 per cent recall, in exchange for turning a linear scan into something sub-linear. The
part people miss is the interaction with filters: if a query filters down to a small subset, the index
can exhaust its search budget before finding enough matching neighbours, so recall drops well below the
headline number and nothing reports an error.

**Q: HNSW or IVFFlat?**

HNSW for a corpus that keeps growing, because it handles incremental inserts well and queries faster,
at the price of a slow build and a lot of memory. IVFFlat when the data is large and static and memory
matters, accepting that its clusters are learned from the data as it was, so it needs periodic rebuilds
as the distribution shifts. If I had to pick one without knowing the workload, HNSW.

**Q: What breaks when you switch embedding models?**

Everything in the index. Vectors from two models are not comparable, so the similarity numbers keep
working while meaning nothing — a silent failure rather than an error. The migration is a full re-embed
into a parallel index, an evaluation of both on the same golden set, and a switchover. It is also why the
embedding model is a more consequential choice than it first appears: changing it costs a rebuild every
time.

**Q: What are the real operating costs of a separate vector store?**

Storage and memory first — a 1536-dimension float32 vector is about 6 KB, so a million chunks is six
gigabytes before the index, and HNSW can roughly double that in resident memory. Then the sync pipeline,
which is the one that causes incidents: documents live in one system and vectors in another, so deletions
and permission changes become distributed operations, and a chunk left behind after its document was
removed gets retrieved and cited with complete confidence.

## What to Read Next

- [Chapter ?? — Retrieval](#ch-retrieval) — the query patterns this store has to serve
- [Chapter ?? — Evaluating Retrieval](#ch-evaluating-retrieval) — measuring the recall an index actually delivers
- [Chapter ?? — Ingestion and Chunking](#ch-ingestion-and-chunking) — what gets written into it
