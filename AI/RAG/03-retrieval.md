---
title: Embeddings, Vector Stores and Retrieval
part: 7
chapter: 14
slug: retrieval
level: advanced
reading_time: 15
updated: 2026-09-24
tags: [ai, rag, embeddings, vectors, cosine-similarity, vector-database, pgvector, hnsw, retrieval, hybrid-search, reranking, bm25, typescript]
in_book: true
---

# Embeddings, Vector Stores and Retrieval {#ch-retrieval}

> Turn text into vectors, keep them in the database you already run, and find the passages that answer the question.

**In this chapter:** what a vector is and what its score means · pgvector against a dedicated store · keyword, vector and hybrid search · reranking and choosing *k* · filters and query rewriting

## 💡 The Core Idea

An embedding turns text into a fixed-length list of numbers: a **point in space**. Nearness means
similar meaning. "Cancel my subscription" and "how do I close my account" land close together, although
they share no important word. Keyword search matches strings. Embedding search matches meaning.

Documents become points once, at ingestion; a query becomes one per request. Embeddings blur exact
tokens — an error code, a function name — so keyword search still matters. **Production retrieval runs both.** Its job is not to answer, but to get the answer into the window, ranked high.

## How It Works

### A vector is a point, and direction is what matters

No single number in a vector means anything you can read; the **geometry** carries the meaning.
Cosine similarity measures the angle between two vectors, not the distance between their tips. So two
documents saying the same thing at different lengths still count as close.

**Embedding three phrases and comparing them**

```typescript
import { cosineSimilarity, embedMany } from "ai";

declare const EMBEDDING_MODEL: string;

const { embeddings } = await embedMany({
  model: EMBEDDING_MODEL,
  values: ["cancel my subscription", "how do I close my account", "reset my password"],
});

cosineSimilarity(embeddings[0], embeddings[1]); // ~0.85 — same intent
cosineSimilarity(embeddings[0], embeddings[2]); // ~0.55 — both account admin, different jobs
```

**The scores are ranks, not probabilities.** A score of 0.82 does not mean 82% relevant, and unrelated
text sits near 0.1 in one model and 0.7 in another. Only the **ordering** means something, so take the
top *k*, or measure a threshold on your own labelled queries.

### One model on both sides

Vectors from two models cannot be compared, so query and documents share one model, and changing it
means re-embedding everything. Many models also take an input type (query or document); getting it
backwards costs recall silently. Store the model name and version beside every vector.

### Where the vectors live: start with Postgres

A vector store returns the *k* nearest vectors to a query vector. The rest — filters, namespaces — is
ordinary database work. pgvector makes a vector a column type, which inherits your backups, migrations,
access control and transactions. The documentation assistant keeps its chunks in the Postgres it already runs.

**The chunks table, an index and a filtered query in pgvector**

```sql
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
ORDER BY embedding <=> $1               -- the operator picks the distance: cosine
LIMIT 20;
```

The permission filter, the similarity search and the data sit in one engine. With no index, the query
compares against every row. That is exact, and `O(n)`. **Under about 100,000 vectors, exact search is
usually fine** — tens of milliseconds. An approximate (ANN) index turns the scan into milliseconds at
ten million rows, and gives up a little recall, typically 1–5% of the true neighbours. **HNSW**, a graph
of neighbours, suits a growing corpus but builds slowly and wants memory. **IVFFlat**, learned clusters,
builds fast but degrades as data shifts, so it needs rebuilds.

> ⚠️ **An approximate index plus a selective filter is where recall quietly collapses.** The index walks
> a graph built over all rows. If few rows match the filter, the search runs out of candidates before it
> finds enough matches. It returns fewer or worse results and reports no error. Test recall with your
> real filters.

### What a dedicated store costs

A dedicated vector database buys scale past tens of millions of vectors and managed sharding. It costs a
second stateful system, with no joins or transactions across the two. The unforecast cost is the
**sync**: every deletion and permission change becomes a distributed operation. When sync fails, a chunk survives its
deleted document and gets cited to a user with full confidence. Storage is the other surprise. A
1536-dimension float32 vector is 6 KB, so a million chunks is 6 GB before the index, and HNSW can
double that in memory. Shortened dimensions cut this, if your eval says the recall loss is acceptable.

The assistant's **re-embed job** runs when a page changes: it deletes the page's old chunks and writes
new ones in one transaction. Changing embedding model is the same job over every page, into a parallel
index, followed by a switchover once both indexes have been scored on the same questions.

> ⚠️ **Moving target:** vendor lists date fast, and pgvector keeps narrowing the gap — quantised vector
> types and index improvements land every few releases. The principle holds: an approximate index buys
> speed with recall, and a benchmark without your filters measures neither.

### Three search modes, three blind spots

| Mode | Finds | Misses | Cost |
| --- | --- | --- | --- |
| **Keyword (BM25)** | Exact terms, codes, names, rare words | Paraphrase, synonyms | Cheap, no embedding call |
| **Vector** | Meaning, paraphrase, other languages | Identifiers, numbers, negation | An embedding call per query |
| **Hybrid** | Both | Little; it inherits both recalls | Two searches plus fusion |

Negation is the forgotten blind spot: "deployments that do **not** use the cache" embeds close to its
opposite. Numbers and dates embed badly too, so they belong in metadata filters.

### Hybrid search, and merging the two lists

BM25 scores are unbounded and cosine scores are not, so normalising them is brittle. **Reciprocal rank
fusion** uses ranks instead, and there is nothing to calibrate.

**Reciprocal rank fusion over a keyword list and a vector list**

```typescript
declare const q: string;
declare function keywordSearch(query: string, limit: number): Promise<string[]>;
declare function vectorSearch(query: string, limit: number): Promise<string[]>;

function fuse(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...score].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

const merged = fuse([await keywordSearch(q, 50), await vectorSearch(q, 50)]).slice(0, 20);
```

A document both lists rank highly rises above one only a single list liked.

### Reranking and choosing *k*

The retriever optimises for **recall**; the reranker optimises for **precision**. A vector search compares two embeddings computed apart, so the document never sees the query. A
cross-encoder reranker reads query and passage **together** and scores the pair. It is far more
accurate, and it cannot be precomputed. It adds 100–400 ms and a per-document charge. Skip it when the
corpus is small enough that the top five already hold the answer.

Each chunk passed on costs window space and tokens, and adds noise. So **retrieve wide and cheap, rerank
narrow, send few**: fuse two top-50 lists, rerank 20, pass 5. The assistant reranks to `k = 5`.

### Filters are access control

If users may see different documents, the filter **is** the access control. It has to run inside the
search, not after it.

**Pre-filtering by tenant and role inside the engine**

```typescript
import { embed } from "ai";

declare const index: { query(q: object): Promise<unknown[]> };
declare const userQuery: string;
declare const user: { tenantId: string; roles: string[] };

const hits = await index.query({
  vector: await embed(userQuery),
  topK: 50,
  filter: { tenantId: user.tenantId, visibility: { $in: user.roles } }, // pre-filter, in the engine
});
```

Filtering in application code fails twice: if all 50 are hidden the user gets nothing, and whoever
raises the limit to "fix" it makes a leak possible.

### Query rewriting

The user's words are often not the corpus's words. Two fixes help:

- **Rewriting** turns "and what about the other one?" into a standalone question using the history.
  Without it, follow-ups retrieve noise — the most common multi-turn RAG bug.
- **Multi-query expansion** searches two or three phrasings and fuses the results, buying recall.

> ⚠️ Both add a full model round trip before retrieval starts. The assistant rewrites through its small,
> fast model. Measure whether the recall gain is worth the latency on your traffic.

## When to Use It

| Situation | Design |
| --- | --- |
| Under ~100k chunks, Postgres in production | pgvector, exact search first |
| 100k–5M chunks | pgvector with HNSW |
| Tens of millions, or vector search dominates the load | A dedicated store |
| Technical docs full of codes and names | Hybrid, weighted toward keyword |
| Large corpus, ambiguous questions | Hybrid plus reranking |
| Multi-tenant or role-scoped documents | Pre-filter in the engine, always |
| Conversational assistant | Query rewriting, or follow-ups fail |

To know whether any of these changes helped, measure recall@k on a golden set. That is
[Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals).

## Common Mistakes

**❌ Hard-coding a similarity threshold**

> `if (score > 0.75)` does not carry across models, corpora or query types. Take the top *k*, or
> measure the cut-off on your own labelled queries.

**❌ Changing the embedding model without re-embedding**

> The store now holds two incompatible geometries. Results look plausible and are poor. Re-embed
> everything into a parallel index, then switch reads over.

**❌ Raising *k* to fix a ranking problem**

> More chunks means more cost, more noise and a worse answer. Rerank instead.

**✅ Log the model version with every vector, and the retrieved chunks with every request**

> When an answer is wrong, the first question is whether the right passage was retrieved at all. Those
> two records turn that question into a five-minute check.

## 🔑 Key Takeaways

- An embedding is a point where nearness means similar meaning, and its similarity scores are ranks, not probabilities.
- Query and documents must share one embedding model, so changing it is a full re-embed into a parallel index.
- Keep vectors in the database you already run until scale forces a move, because a second store brings a sync pipeline that fails silently.
- Keyword and vector search fail on opposite queries, so run both, fuse by rank and rerank a wide candidate set down to a few.
- Permission filters run inside the search engine, and conversational queries are rewritten into standalone ones before retrieval.

## Interview Questions

**Q: What does a cosine similarity of 0.82 tell you?**

That this pair is more similar than a pair scoring 0.6 in the same model and corpus, and nothing more.
It is not a probability and not comparable across models. Unrelated text can score 0.7 in one model and
0.1 in another. Any absolute cut-off has to be calibrated on labelled examples from the real corpus.

**Q: pgvector or a dedicated vector database?**

pgvector until scale really demands otherwise. It makes vectors a column in a database I already back
up, migrate and secure, and filtering and similarity become one planner decision. A dedicated store adds
a second system and a sync pipeline, whose signature failure is a deleted document still being cited. I
would move at tens of millions of vectors, or when vector load starts to hurt transactional traffic.

**Q: Vector, keyword, or both?**

Both, in almost every production system, because they fail on different queries. Vector search handles
paraphrase and misses error codes; keyword search does the reverse. I would fuse by rank rather than
normalise scores, and on a tiny corpus start with one until the eval shows which queries fail.

**Q: What does a reranker do that the retriever cannot?**

It reads the query and the passage together. A vector search compares embeddings computed apart, which
makes it fast and precomputable but limits its precision. A cross-encoder scores the pair directly: more
accurate, never precomputed. So retrieve fifty cheaply, rerank twenty, send five.

**Q: How do you scope retrieval to what a user may see?**

Filter inside the search engine as part of the query, using tenant and role fields stored on each chunk
at ingestion. Filtering afterwards returns fewer results than asked for, and puts access control in
application code where someone will widen the limit. With an approximate index, I would also test recall
under that filter, because selective filters are where it collapses.

## What to Read Next

- [Chapter ?? — Ingestion and Chunking](#ch-ingestion-and-chunking) — what you embed decides what you can find
- [Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals) — recall@k, and how to know any of this helped
