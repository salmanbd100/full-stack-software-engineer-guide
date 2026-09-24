---
title: "Choosing a Non-Relational Store: Documents and Redis"
part: 5
chapter: 16
slug: document-databases
level: intermediate
reading_time: 14
updated: 2026-09-24
tags: [nosql, mongodb, documents, schema, modelling, redis, cache, sessions, pubsub, streams]
in_book: true
---

# Choosing a Non-Relational Store: Documents and Redis {#ch-document-databases}

> Say when a document model fits, when Redis fits, and when Postgres is still the answer, and name what each choice costs.

**In this chapter:** what each store trades away · modelling documents from the queries · embed or reference · Redis structures, expiry and eviction · when Postgres wins

## 💡 The Core Idea

A relational database stores each fact once. It rebuilds the shape you need with joins at read time.
The two stores in this chapter give that up, and each gets something back.

A **document database** stores the shape the application reads. A product page with its variants and
images is one fetch, not a four-table join. The price is duplication. If a value is copied into ten
thousand documents, keeping the copies in step is now your job.

**Redis** stores values in memory, under a key, in one thread. Reads take microseconds, and every
command is atomic without locks. The price is that the data must fit in RAM. Also, a crash can lose
the last second of writes.

So the question is never "SQL or NoSQL". It is: what do I read, and what can I afford to lose?

> ⚠️ **Moving target:** the licence, not the API. Redis left open source in 2024, the Valkey fork
> followed, and Redis 8 moved again to AGPL. "We run Redis" may now mean one of several forks. The
> durable principle is that the data structures and their atomic guarantees are the same in all of
> them. Check the licence and the fork before you check the feature list.

## How It Works

| | Relational | Document (MongoDB) | Key-value (Redis) |
| --- | ---------- | ------------------ | ----------------- |
| Unit | Row | Document | Key and a typed value |
| Reads | Any query, joins, a planner | By the shape you designed for | By key only |
| Atomic unit | Transaction | One document | One command |
| Schema | Enforced by the engine | Enforced by you | None |
| Durable | Yes | Yes | Best-effort |

### Documents: model the queries, not the entities

In a relational database you model the data and derive the queries. In a document database you do
the reverse. You **model the queries and derive the documents.** There is no one right schema for a
domain. There is only one that suits your access pattern.

"Schemaless" describes the engine, not your data. Every application has a schema. The only question
is whether it is written down. In MongoDB, write it down as a `$jsonSchema` validator with
`validationLevel: 'strict'`. Then a bad write from a script or an old deployment fails at the engine.
It does not fail later, in whichever service reads it next.

Store money as `Decimal128`, never `double`, because binary floating point makes `0.1 + 0.2` wrong.

**A single-document update is atomic, so the filter is your concurrency guard:**

```typescript
interface Order {
  _id: ObjectId;
  userId: ObjectId;
  status: 'pending' | 'processing' | 'paid' | 'cancelled';
  items: { sku: string; qty: number; unitPrice: Decimal128 }[];
  createdAt: Date;
}

const orders = db.collection<Order>('orders');

// Compare-and-swap with no transaction: the write only lands if the status is still 'pending'.
await orders.updateOne(
  { _id: id, status: 'pending' },
  { $set: { status: 'paid', paidAt: new Date() }, $inc: { attempts: 1 } },
);

// Claim the oldest job in one round trip, with no race between workers.
const claimed = await orders.findOneAndUpdate(
  { status: 'pending' },
  { $set: { status: 'processing', claimedAt: new Date() } },
  { sort: { createdAt: 1 }, returnDocument: 'after' },
);
```

Multi-document transactions exist, but they need a replica set and cost much more. Needing them all
the time means you have modelled tables inside a document store.

### Embed or reference

A post can hold its comments in an array, so one read gets both. Or comments can live in their own
collection with an indexed `postId`. The access pattern decides.

| Signal | Embed | Reference |
| ------ | ----- | --------- |
| Always read together, and the child means nothing alone | ✅ | |
| Small and bounded, such as addresses or variants | ✅ | |
| Grows without limit, such as comments or events | | ✅ |
| Queried alone, or shared by many parents | | ✅ |

The rule for most cases: **embed one-to-few, reference one-to-many.** A user's three addresses embed.
A post's comments do not, because comments have no upper bound.

> ⚠️ A document cannot exceed 16 MB. An embedded array that grows with use will hit that ceiling, and
> it will hit it in production, on your most active record. An array with no natural bound belongs in
> its own collection.

The most useful middle path is the **extended reference**. Copy the two or three fields you always
show, such as `customer: { _id, name }`, and keep the reference for the rest. That removes the join
from the hot read path. The cost is a stale name after a rename, so something must update the copies.

### Redis: in memory, one thread

Two facts explain Redis. **In memory** means microsecond reads and a hard size limit: RAM. **Single
threaded** means every command runs alone, so each one is atomic. That is why counters, locks and
queues live there. It also means one slow command blocks every other client. `KEYS *` on a million
keys stalls the whole server.

| Structure | Holds | Use for |
| --------- | ----- | ------- |
| **String** | Bytes | Cached JSON, counters (`INCR` is atomic), flags |
| **Hash** | Field–value map | A session where you update one field at a time |
| **List** | Ordered, push and pop at both ends | A simple queue |
| **Set** | Unique members | Tags, who is online |
| **Sorted set** | Unique members with a score | Leaderboards, sliding windows, delayed jobs |

**The sorted set does ranking and time windows with one structure:**

```typescript
// Leaderboard: the score is points.
await redis.zAdd('leaderboard', { score: 4820, value: userId });
const top = await redis.zRangeWithScores('leaderboard', 0, 9, { REV: true });

// Sliding window: the score is a timestamp, so trimming old entries is a range delete.
await redis.zRemRangeByScore(`window:${userId}`, 0, Date.now() - 60_000);
const inWindow = await redis.zCard(`window:${userId}`);
```

### Expiry, eviction and durability

**Every key gets a TTL unless you can name the process that deletes it.** A cache with no expiry is a
memory leak. Set the value and the expiry in one command, so a crash cannot leave the key immortal.

**Value and expiry together:**

```typescript
await redis.set(key, JSON.stringify(value), { EX: 300 });
```

When memory is full, the eviction policy decides what goes. Use `allkeys-lru` for a pure cache. Use
`volatile-lru` when permanent keys share the instance, because it only evicts keys that have a TTL.

> ⚠️ The default policy is `noeviction`. A full cache then rejects writes instead of making room. Pick
> the policy on purpose for each instance, and never share one instance between a cache and a queue.
> Under pressure, eviction cannot tell them apart.

For messaging, **Pub/Sub** is fire-and-forget. A subscriber that is offline misses the message. That
is fine for cache invalidation or a WebSocket broadcast. **Streams** keep entries, split them across
a consumer group, and track acknowledgements. Use them for work that must happen.

On durability, append-only persistence can still lose about a second, and replicas copy
asynchronously. So **Redis is not a system of record.** Write anything that must survive to a durable
store first. Redis holds the fast copy.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| One document matches one screen, and the reads are stable | Document store | The join leaves the hot path |
| Attributes vary by record, such as a catalogue with per-category fields | Document store | No sparse columns, no table per type |
| Mostly relational, with a few flexible fields | Postgres `jsonb` | Covers most of why teams reach for MongoDB |
| Relational data, unpredictable queries, reporting | Postgres | Joins and a query planner are the point |
| Money, orders, anything you cannot lose | Postgres | Real transactions and durability |
| Sessions, caches, counters, rate limits, leaderboards | Redis | Microsecond reads, atomic commands |
| Data larger than RAM, or ad-hoc queries | Not Redis | Memory is the limit, and there is no planner |
| A job queue with retries and dead letters | A queue library on Redis | Streams give the primitive, not the framework |

The senior default is Postgres as the system of record, with Redis beside it for speed. Reach for a
document store when the data really is a tree you read whole.

## Common Mistakes

**❌ Modelling the entity diagram in MongoDB.** You get no joins and no read advantage.
**✅ Start from the screens.** List the reads, then shape the documents to serve them.

**❌ `$lookup` on most reads.** Joining collections on every request means the model buys nothing.
**✅ Use a relational database,** or copy the fields you need with an extended reference.

**❌ `KEYS *` in application code.** It blocks the single thread for the whole scan.
**✅ Use `SCAN`,** which walks the keys in small steps, or keep a set of the keys you need to list.

**❌ Treating a Redis lock as a guarantee.** `SET key value NX EX 30` is a lease, not a mutex. If the
holder pauses past the expiry, two processes both think they hold it.
**✅ Use it for best-effort coordination,** and make the protected operation idempotent.

## 🔑 Key Takeaways

- A document store keeps the shape you read, and the price is duplication you must keep in step yourself.
- A single-document update is atomic, so putting the expected state in the filter gives you compare-and-swap.
- Embed one-to-few and reference anything unbounded, because 16 MB is a hard ceiling.
- Redis runs every command atomically on one thread, which also means one slow command stalls every client.
- Redis is not a system of record: give every key a TTL, choose the eviction policy, and keep the truth in Postgres.

## Interview Questions

**Q: When would you choose MongoDB over Postgres?**

When the data is a tree you read whole, the read patterns are known and stable, and one document
matches one screen. A catalogue with different fields per category is the classic case. When queries
are unpredictable, the data is relational, or reporting matters, Postgres wins. Its `jsonb` covers
most of what teams reach for MongoDB to get.

**Q: How do you decide whether to embed or reference?**

By the access pattern and the growth bound. Embed when the child is always read with the parent, has
no identity of its own, and stays small. Reference when it grows without limit, is queried alone, or
is shared. The 16 MB limit turns "unbounded" from a style point into a hard constraint.

**Q: Redis is single-threaded. How is it fast, and what is the risk?**

Everything is in memory, and there is no lock contention or context switching. Each command takes
microseconds. The risk is that one expensive command, such as `KEYS` or a looping Lua script, blocks
every other client. That shows up as a latency spike across the whole application.

**Q: Pub/Sub or Streams?**

Pub/Sub for fan-out you can afford to lose: cache invalidation, presence, WebSocket broadcast.
Streams when the message must be processed. They keep entries, let a consumer group share the load,
and track unacknowledged entries so a crashed worker's messages can be reclaimed.

**Q: A team wants Redis as the only database for a new orders service. What do you say?**

No, and the reason is durability. Even append-only persistence can lose a second, and replicas copy
asynchronously, so an order can vanish on failover. Redis also has no joins or planner for the
reporting orders always need. Keep orders in Postgres and use Redis in front for sessions and hot
reads.

## What to Read Next

- [Chapter ?? — SQL Fundamentals and Schema Design](#ch-sql-fundamentals) — the normalised alternative, stated fairly
- [Chapter ?? — Caching](#ch-caching) — read-through, write-behind and invalidation, built on Redis
- [Chapter ?? — Choosing a Datastore and Replicating It](#ch-choosing-a-datastore) — the decision one level up, with replication and sharding
