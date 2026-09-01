---
title: Node.js Performance
part: 5
chapter: 0
slug: nodejs-performance
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [nodejs, performance, profiling, caching, memory]
in_book: true
---

# Node.js Performance {#ch-nodejs-performance}

> Find the actual bottleneck with a profile instead of a guess, and fix the three things that are usually wrong.

**In this chapter:** measuring before changing · where the time really goes · caching with a correct key · memory leaks · HTTP-level wins

## 💡 The Core Idea

Node performance work has a reliable order, and almost every wasted week comes from skipping the
first step. **Measure, find the slowest thing, fix that, measure again.**

The reason this matters more in Node than elsewhere is that the intuitive answer is nearly always
wrong. Engineers optimise their JavaScript, and the profile shows 5 ms of JavaScript and 400 ms
of waiting on a database that has no index. Node is a coordination layer; most of its latency
belongs to something it called.

## How It Works

### Measure the right number

| Metric | Says | Trap |
| ------ | ---- | ---- |
| **p50 latency** | The typical request | Hides the tail entirely |
| **p99 latency** | The worst 1% — where users churn | Needs volume to be stable |
| **Event loop delay** | Whether the loop is blocked | The single best Node health signal |
| **RSS** | Total process memory | Includes buffers outside the heap |
| **Heap used** | V8 objects | Growth across restarts means a leak |

Event loop delay is the metric to alert on. If it sits above ~50 ms, no amount of database tuning
will help, because requests are queued behind your own code.

```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval((): void => {
  metrics.gauge('event_loop.p99_ms', histogram.percentile(99) / 1e6);
  histogram.reset();
}, 10_000).unref();
```

### Find the bottleneck

Three tools, in the order you should reach for them:

1. **A flame graph** — `node --cpu-prof app.js`, then open the `.cpuprofile` in Chrome DevTools.
   Wide bars are where the CPU went. This finds the accidental `JSON.parse` of a 3 MB payload.
2. **A heap snapshot pair** — take one, apply load, take another, compare in DevTools. Anything
   whose retained size grows across both is a leak candidate.
3. **Database query logs with timings** — `log_min_duration_statement` in Postgres, the profiler
   in MongoDB. This is where the answer usually is.

Time the boundaries in code so the profile is not the only signal:

```typescript
async function timed<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    metrics.histogram(`op.${name}.ms`, performance.now() - start);
  }
}
```

### Where the time actually goes

In a typical request that takes 400 ms, the split is usually close to this:

| Cost | Share | Fix |
| ---- | ----- | --- |
| Unindexed or N+1 queries | 60–80% | Index, batch, or join |
| Serialisation of a large response | 5–15% | Paginate; select fewer columns |
| Outbound HTTP with no connection reuse | 5–15% | Keep-alive agent |
| Your JavaScript | Under 5% | Usually not the problem |

**The N+1, which is the most common single defect:**

```typescript
// ❌ 1 + N round trips
const posts = await db.posts.findMany({ take: 20 });
for (const post of posts) {
  post.author = await db.users.findUnique({ where: { id: post.authorId } });
}

// ✅ 2 round trips, regardless of page size
const posts = await db.posts.findMany({ take: 20 });
const authors = await db.users.findMany({
  where: { id: { in: [...new Set(posts.map((p) => p.authorId))] } },
});
const byId = new Map(authors.map((a) => [a.id, a]));
```

**Reuse sockets on outbound calls.** Without an agent, every `fetch` pays a TCP and TLS
handshake — 30–80 ms across a region.

```typescript
import { Agent, setGlobalDispatcher } from 'undici';
setGlobalDispatcher(new Agent({ keepAliveTimeout: 30_000, connections: 128 }));
```

## Caching

Caching is the largest available win and the easiest to get subtly wrong. The key must contain
**everything the response varies by** — tenant, locale, permissions, version.

```typescript
async function cached<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit) as T;

  const value = await fn();
  // Set with expiry in one command; a separate EXPIRE can be orphaned by a crash.
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  return value;
}

// Tenant and locale are in the key, so no cross-tenant leak is possible.
const page = await cached(`catalogue:v2:${tenantId}:${locale}:${pageNo}`, 300, load);
```

Three rules:

- **Version the key** (`v2` above). A shape change with the old key serves stale objects that no
  longer parse.
- **Always set a TTL.** A cache with no expiry is a memory leak with a nicer name.
- **Guard the stampede.** When a hot key expires, every request misses at once. A short lock, or
  serving stale while one request refreshes, prevents the pile-up.

## Memory Leaks

Four causes account for nearly all of them:

| Cause | Looks like | Fix |
| ----- | ---------- | --- |
| Unbounded `Map` or array as a cache | Heap grows, never falls | `lru-cache` with `max` |
| Listener added per request | `MaxListenersExceeded` warning | `once`, or remove on cleanup |
| Timer holding a closure | Heap grows in steps | `clearInterval`, and `.unref()` |
| Closure capturing a large buffer | Retained size on a small object | Slice out what you need |

```typescript
// ❌ Grows for the life of the process
const sessions = new Map<string, Session>();

// ✅ Bounded, with eviction
const sessions = new LRUCache<string, Session>({ max: 10_000, ttl: 30 * 60_000 });
```

## Common Mistakes

**❌ Optimising JavaScript before looking at the queries.** The profile decides, not intuition.

**❌ Benchmarking with `--inspect` attached or `NODE_ENV` unset.** The inspector changes
optimisation decisions, and many frameworks — Express view caching among them — only enable
their fast paths when `NODE_ENV=production`.

**❌ Trusting an average.** A p50 of 40 ms with a p99 of 4 s is a broken service that looks
healthy on a dashboard.

**❌ Compressing in the application when a proxy is already doing it.** You pay the CPU twice and
the loop stalls on `zlib` for large responses.

## 🔑 Key Takeaways

- Measure first: the bottleneck is in the database far more often than in your JavaScript.
- Event loop delay is the one Node-specific metric worth alerting on.
- N+1 queries and missing connection reuse are the two most common real defects.
- A cache key must contain every dimension the response varies by, and every entry needs a TTL.
- Unbounded maps, per-request listeners and forgotten timers cause almost every leak.

## Interview Questions

**Q: A service's p99 is 3 s while p50 is 30 ms. Where do you look?**

At the tail's shape rather than the average. Either a subset of requests hits a slow path — a
missing index that only matters for large tenants — or the event loop is blocked periodically by
CPU work or garbage collection, queueing everything behind it. Event loop delay and per-endpoint
percentiles separate the two in minutes.

**Q: How do you confirm a memory leak rather than normal growth?**

Compare two heap snapshots taken under steady load, an interval apart, and look for constructors
whose retained size grows in both. Normal growth plateaus as caches fill; a leak keeps a straight
line. RSS alone is not proof, because buffers and native allocations live outside the heap.

**Q: When is caching the wrong fix?**

When the underlying query is slow because of a missing index — the cache hides a 2 s query until
it expires, and the stampede on expiry is worse than the original. Also when correctness demands
freshness, or when the key would need so many dimensions that the hit rate approaches zero.

## What to Read Next

- [Chapter ?? — Scaling a Node Process](#ch-scaling-node) — using every core, and moving CPU work off-thread
- [Chapter ?? — Indexes and Query Plans](#ch-indexes) — reading the plan behind the slow query
- [Chapter ?? — Redis](#ch-redis) — the cache this chapter assumes
