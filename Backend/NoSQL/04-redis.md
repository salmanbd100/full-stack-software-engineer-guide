---
title: Redis
part: 5
chapter: 0
slug: redis
level: intermediate
reading_time: 8
updated: 2026-09-01
tags: [redis, cache, sessions, pubsub, streams]
in_book: true
---

# Redis {#ch-redis}

> Pick the right Redis data structure for the job, and be explicit about what you lose when the process restarts.

**In this chapter:** the five structures worth knowing · TTL and eviction · pub/sub against streams · persistence and what it costs · when Redis is the wrong tool

## 💡 The Core Idea

Redis is a single-threaded, in-memory data structure server. Two of those words do the work.

**In-memory** means microsecond latency and a hard ceiling: your dataset must fit in RAM, and RAM is
the expensive resource. **Single-threaded** for command execution means every command is atomic
with no locking — which is why Redis is the natural home for counters, locks and queues — and also
means one slow command blocks every other client.

That second point is the one interviews probe. `KEYS *` on a million-key database, or `FLUSHALL`,
or a Lua script with a loop, stops the entire server for its duration.

This chapter covers Redis as a data store. Cache strategy — read-through, write-behind, invalidation —
belongs to [Chapter ?? — Caching](#ch-caching), and rate limiting to
[Chapter ?? — Rate Limiting](#ch-rate-limiting).

## The Structures You Will Actually Use

| Structure | Holds | Use for |
| --------- | ----- | ------- |
| **String** | Bytes, up to 512 MB | Cached JSON, counters (`INCR` is atomic), feature flags |
| **Hash** | Field–value map | An object where you update one field — a session |
| **List** | Ordered, push/pop both ends | A simple queue; `BLPOP` blocks until work arrives |
| **Set** | Unordered, unique | Tags, "who is online", set intersection |
| **Sorted set** | Unique members with a score | Leaderboards, priority queues, time-ordered windows |

The sorted set is the one that separates candidates. Because members are ordered by an arbitrary
score, it does sliding-window counting, delayed job scheduling and ranking with one structure.

```typescript
// A leaderboard, and a sliding window, from the same primitive.
await redis.zAdd('leaderboard', { score: 4820, value: userId });
const top = await redis.zRangeWithScores('leaderboard', 0, 9, { REV: true });
const rank = await redis.zRevRank('leaderboard', userId); // O(log n)

// Sliding window: score is a timestamp, so trimming is a range delete.
await redis.zRemRangeByScore(`window:${userId}`, 0, Date.now() - 60_000);
const inWindow = await redis.zCard(`window:${userId}`);
```

**Hashes for objects you partially update.** Storing a session as one JSON string means a full
read-modify-write to change one field; a hash lets you set one field atomically.

```typescript
await redis.hSet(`session:${sid}`, { userId, role: 'editor', lastSeen: Date.now().toString() });
await redis.expire(`session:${sid}`, 1800); // Sliding expiry: reset on each request.
```

## TTL and Eviction

**Every key gets a TTL unless you can name the process that deletes it.** A cache with no expiry is
a memory leak that eventually triggers eviction of the keys you needed.

```typescript
// Set value and expiry in one command — a separate EXPIRE can be orphaned by a crash.
await redis.set(key, JSON.stringify(value), { EX: 300 });
```

When `maxmemory` is reached, the eviction policy decides what goes:

| Policy | Behaviour | Use for |
| ------ | --------- | ------- |
| `noeviction` | Writes fail with an error | A queue or lock store where losing data is worse than failing |
| `allkeys-lru` | Evicts least-recently-used, TTL or not | A pure cache |
| `volatile-lru` | Evicts only keys with a TTL | Mixed workload — protects permanent keys |
| `allkeys-lfu` | Evicts least-*frequently*-used | Caches with a stable hot set |

> ⚠️ The default is `noeviction`, which surprises people: a cache at `maxmemory` starts rejecting
> writes rather than making room. Choose the policy deliberately for each Redis you run.

Mixing a cache and a queue in one instance is the mistake this table implies. Under memory pressure
the eviction policy cannot tell them apart — run separate instances or separate databases.

## Pub/Sub and Streams

They look similar and have opposite guarantees.

| | Pub/Sub | Streams |
| --- | ------- | ------- |
| Delivery | Fire-and-forget — offline subscribers miss messages | Persisted in the stream, readable later |
| Consumers | Every subscriber gets every message | Consumer groups split work; each message goes to one member |
| Acknowledgement | None | `XACK`, with a pending list for unacknowledged entries |
| Use for | Fan-out that can be lost — cache invalidation, WebSocket broadcast | Work that must be processed — jobs, events |

```typescript
// Streams: durable, with a consumer group so many workers share the load.
await redis.xGroupCreate('orders', 'processors', '0', { MKSTREAM: true });

const entries = await redis.xReadGroup('processors', workerId,
  [{ key: 'orders', id: '>' }], { COUNT: 10, BLOCK: 5000 });

for (const entry of entries?.[0]?.messages ?? []) {
  await handle(entry.message);
  await redis.xAck('orders', 'processors', entry.id); // Unacked entries can be reclaimed.
}
```

Pub/Sub is the right choice for the Socket.IO Redis adapter, because a broadcast that a
disconnected pod missed is not worth replaying. It is the wrong choice for anything a user paid for.

## Persistence

| Mode | Mechanism | Loses |
| ---- | --------- | ----- |
| **RDB** | Periodic point-in-time snapshot | Everything since the last snapshot — minutes |
| **AOF** | Appends every write command | Up to one second with the default `everysec` fsync |
| **Both** | AOF for recovery, RDB for backups | The usual production choice |

Even AOF with `everysec` can lose a second of writes, and a replica acknowledges asynchronously. So
the honest statement is: **Redis is not a system of record.** Anything that must survive is written
to a durable store first, and Redis holds the fast copy.

## When Redis Is the Wrong Tool

| Situation | Why not | Instead |
| --------- | ------- | ------- |
| Data larger than RAM | Memory is the hard limit | Postgres, or a disk-backed store |
| Complex queries, joins, ad-hoc reporting | No query planner, no joins | A relational database |
| The system of record for money or orders | Durability is best-effort | Postgres, with Redis as cache |
| Full-text search with ranking | The search module is limited | A real search engine |
| A queue needing scheduling, retries and dead letters | Streams give the primitive, not the framework | A queue service, or BullMQ on top of Redis |

## Common Mistakes

**❌ `KEYS *` in application code.** It blocks the single thread for the whole scan. Use `SCAN`, which
is cursor-based and incremental — or better, keep a set of the keys you need to enumerate.

**❌ A key with no TTL and no owner.** Name the process that deletes it, or give it an expiry.

**❌ Storing a session as one JSON string and updating `lastSeen` per request.** That is a full
read-modify-write on every request; a hash field update is one command.

**❌ Treating a Redis lock as a correctness guarantee.** `SET key value NX EX 30` is a lease, not a
mutex: if the holder pauses past the expiry, two processes believe they hold it. Use it for
best-effort coordination, and make the protected operation idempotent.

**❌ Pipelining nothing.** Fifty sequential commands are fifty round trips. `MULTI`/`EXEC` or a
pipeline sends them in one.

## 🔑 Key Takeaways

- Single-threaded execution makes every command atomic and makes one slow command a global stall.
- Sorted sets cover leaderboards, sliding windows and delayed scheduling with one structure.
- Every key needs a TTL, and the eviction policy — `noeviction` by default — must be chosen per instance.
- Pub/Sub loses messages by design; Streams persist them and support consumer groups with acknowledgement.
- Redis is not a system of record: AOF can still lose a second, and replication is asynchronous.

## Interview Questions

**Q: Redis is single-threaded — how is it fast, and what is the risk?**

Everything is in memory and there is no lock contention or context switching, so each command takes
microseconds and the thread is never idle. The risk is that one expensive command — `KEYS`, a large
`ZRANGE`, a looping Lua script — blocks every other client for its duration, which shows up as a
latency spike across the whole application.

**Q: Pub/Sub or Streams?**

Pub/Sub for fan-out that can be lost: cache invalidation, presence, WebSocket broadcast. Streams when
the message must be processed — they persist entries, support consumer groups so workers share the
load, and track unacknowledged entries so a crashed worker's messages can be reclaimed. Pub/Sub for
a job queue loses jobs whenever a consumer is restarting.

**Q: How do you cap Redis memory safely?**

Set `maxmemory` well below the machine's RAM, choose an eviction policy that matches the workload —
`allkeys-lru` for a pure cache, `volatile-lru` when permanent keys share the instance — and give
every cache key a TTL. Do not mix a cache and a queue in one instance, because eviction cannot tell
them apart under pressure.

## What to Read Next

- [Chapter ?? — Caching](#ch-caching) — the strategies and invalidation patterns this chapter deliberately leaves out
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the atomic token bucket built on these primitives
- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — where a cache belongs in a request path
