---
title: Search
part: 6
chapter: 0
slug: search
level: intermediate
reading_time: 9
updated: 2026-09-02
tags: [system-design, search, inverted-index, elasticsearch, ranking]
in_book: true
---

# Search {#ch-search}

> Decide when a database `LIKE` stops being enough, and design the index, the ranking and the sync that replace it.

**In this chapter:** why the inverted index exists · analysis and tokenisation · ranking · keeping the index in sync · sharding and replicas · autocomplete

## 💡 The Core Idea

A database index answers "where is the row whose column equals this value". Search answers a different
question: "which documents are *about* this phrase, and in what order of usefulness". The data structure
that makes that fast is the inverted index — instead of mapping a document to its words, it maps every
word to the documents containing it. Ranking then decides the order, and ranking is where most of the
product value lives.

> `WHERE title LIKE '%wireless%'` scans every row and cannot rank the results. That is the whole reason
> a search engine exists.

## How It Works

### The inverted index

```typescript
// Forward: document -> terms.  Inverted: term -> postings list.
interface Posting { docId: string; termFrequency: number; positions: number[] }
type InvertedIndex = Map<string, Posting[]>;

// "wireless headphones" -> intersect the two postings lists, then rank.
function search(index: InvertedIndex, terms: string[]): string[] {
  const lists: Posting[][] = terms.map((t: string) => index.get(t) ?? []);
  if (lists.length === 0) return [];
  const sets: Set<string>[] = lists.map((l) => new Set(l.map((p) => p.docId)));
  return [...sets[0]].filter((id: string) => sets.every((s: Set<string>) => s.has(id)));
}
```

Intersecting two short postings lists is fast regardless of how many documents exist, which is why
search stays sub-100 ms at a hundred million documents while `LIKE` does not.

### Analysis: what turns text into terms

The index does not store words as typed. Every document and every query passes through the same pipeline:

| Stage         | Does                                     | Example                          |
| ------------- | ---------------------------------------- | -------------------------------- |
| Tokenise      | Split on word boundaries                  | `"Wireless Headphones!"` → `wireless`, `headphones` |
| Lowercase     | Remove case sensitivity                   | `Wireless` → `wireless`          |
| Stop words    | Drop very common terms                    | `the`, `and`, `of`               |
| Stemming      | Reduce to a root                          | `running`, `ran` → `run`         |
| Synonyms      | Expand equivalents                        | `laptop` → `laptop`, `notebook`  |

> ⚠️ The query must use the same analyser as the index. A mismatch is the single most common cause of
> "search returns nothing for a term I can see on the page" — the document was stemmed and the query was
> not, so the terms never match.

### Ranking

| Signal            | Means                                                        |
| ----------------- | ------------------------------------------------------------ |
| Term frequency    | The term appears often in this document                      |
| Inverse document frequency | The term is rare across the corpus, so it is discriminating |
| Field boost       | A match in the title counts more than one in the body        |
| Freshness         | Newer documents rank higher, where recency matters           |
| Popularity        | Click-through, purchases, engagement                         |

BM25 is the default relevance function in modern engines and combines the first two with length
normalisation, so a short exact match beats a long document that mentions the term once.

Business signals are usually where the real gains are. A shop that boosts in-stock items and
high-conversion products above pure text relevance will beat a perfectly tuned BM25 every time.

### Keeping the index in sync

Search is a **derived** store. The database is the source of truth, and the index is a projection that
can be rebuilt.

```mermaid
flowchart LR
  W["Write to<br/>primary database"] --> O["Outbox row in the<br/>same transaction"]
  O --> R["Relay reads outbox"]
  R --> Q["Queue"]
  Q --> I["Indexer"]
  I --> S["Search index"]
```

**The outbox pattern: the event is committed with the data, so an index update cannot be lost when the write succeeds.**

| Strategy                     | Lag             | Risk                                        |
| ---------------------------- | --------------- | ------------------------------------------- |
| Dual write in the handler    | Immediate       | The index write can fail after the database commits |
| Outbox plus relay            | Under a second  | More moving parts, but no lost updates      |
| Change data capture from the write-ahead log | Under a second | Operationally heavier; catches every change |
| Periodic full reindex        | Minutes to hours | Fine as a backstop, useless as the primary path |

Always keep a full rebuild path. Mappings change, analysers change, and the ability to reindex from
scratch is what makes those changes safe.

### Sharding and replicas

An index is split into shards for capacity and copied into replicas for read throughput and
availability. A query fans out to every shard, each returns its top N, and a coordinator merges them.

Two consequences worth naming in an interview. The fan-out means **tail latency dominates** — the query
is as slow as its slowest shard. And **shard count is usually fixed at creation**, so over-sharding a
small index wastes memory on every query while under-sharding forces a reindex later.

### Autocomplete

Autocomplete is a different problem from search, and using the search index for it is the usual mistake.
It runs on every keystroke, so the budget is roughly 50 ms and the load is an order of magnitude higher.

| Approach                       | Latency | Good for                                |
| ------------------------------ | ------- | --------------------------------------- |
| Prefix trie in memory          | ~1 ms   | A bounded vocabulary — product names, cities |
| Completion suggester in the engine | ~10 ms | Large corpora with a ranking need   |
| Prefix query on the main index | 50 ms+  | Nothing; it is the fallback that gets shipped by accident |

Cache aggressively — prefix queries are extremely repetitive — and debounce on the client so a fast
typist produces three requests rather than fifteen.

## When to Use It

| Situation                                   | Use                                  | Why                                    |
| ------------------------------------------- | ------------------------------------ | -------------------------------------- |
| Exact lookups and filters, small dataset    | The database, with an index          | A search engine is a second system to run |
| Full-text over a large corpus with ranking  | A search engine                       | Inverted index plus BM25               |
| Fuzzy matching, typo tolerance, synonyms    | A search engine                       | The analysis pipeline is the feature   |
| Semantic "find things like this"            | Vector search alongside keyword search | Embeddings capture meaning, not terms |
| Autocomplete                                | A dedicated prefix structure          | Different latency and load profile     |

## Common Mistakes

**❌ Making search the source of truth**

> Writing to Elasticsearch only, and reading everything from it.

Search engines are optimised for query throughput, not durability. A mapping mistake or a failed
reindex then loses data with no way back.

**✅ Search as a rebuildable projection**

> The database owns the record; the index is populated from an outbox and can be rebuilt from scratch at
> any time.

**❌ Different analysers on index and query**

Results silently disappear for terms the user can see on the page. Configure the analyser once and share
it.

**❌ Reindexing everything on every write**

Reindexing a whole document set because one field changed burns throughput. Update the document; batch
the updates.

## 🔑 Key Takeaways

- The inverted index maps terms to documents, which is what makes ranked full-text search fast at scale.
- Index-time and query-time analysis must match, or matches disappear for reasons nothing logs.
- Search is a derived store: the database owns the truth, and a full rebuild path must always exist.
- Queries fan out to every shard, so tail latency, not average latency, decides how search feels.
- Autocomplete is a separate system with a 50 ms budget, not a prefix query against the main index.

## Interview Questions

**Q: When do you introduce a search engine instead of using the database?**

When the query is full-text and needs ranking, typo tolerance or synonyms, or when `LIKE '%term%'` can no
longer be served from an index and starts scanning. Below a few hundred thousand rows, Postgres full-text
search is usually enough and avoids running a second stateful system.

**Q: How do you keep the search index consistent with the database?**

Treat the index as a projection. Write an outbox row in the same transaction as the data change, relay it
to a queue, and let an indexer apply it — so a successful write can never lose its index update. Accept
sub-second lag, and keep a full reindex job for mapping changes and recovery.

**Q: Search latency is fine on average and terrible at p99. Why?**

Because a query fans out to every shard and waits for the slowest one, so any shard with a hot spot, a
garbage collection pause or a cold cache sets the p99. Look at per-shard latency rather than the
aggregate, check for uneven shard sizes, and consider fewer shards or more replicas.

## What to Read Next

- [Chapter ?? — Caching](#ch-caching) — where repeated queries and prefix lookups should be answered from
- [Chapter ?? — Queues and Asynchronous Work](#ch-message-queues) — the pipeline that keeps the index current
- [Chapter ?? — Choosing a Datastore](#ch-choosing-a-datastore) — where a search engine sits among the other stores
