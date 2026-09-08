---
title: Node.js Performance and Scaling
part: 5
chapter: 0
slug: nodejs-performance
level: advanced
reading_time: 10
updated: 2026-09-08
tags: [nodejs, performance, profiling, cluster, worker-threads]
in_book: true
---

# Node.js Performance and Scaling {#ch-nodejs-performance}

> Find the real bottleneck with a profile instead of a guess, then decide whether the fix is a faster loop or more of them.

**In this chapter:** the metrics worth alerting on · where the time really goes · memory leaks · worker threads against replicas · what breaks when you fork

## 💡 The Core Idea

Node performance work has a reliable order, and almost every wasted week comes from skipping the
first step. **Measure, find the slowest thing, fix that, measure again.**

The reason this matters more in Node than elsewhere is that the intuitive answer is nearly always
wrong. Engineers optimise their JavaScript, and the profile shows 5 ms of JavaScript and 400 ms of
waiting on a database with no index. Node is a coordination layer; most of its latency belongs to
something it called.

Scaling is the same question one level up. One process runs JavaScript on one core, and there are
two ways to use the other fifteen — **worker threads move CPU work off the main thread**, and
**replicas run more copies of the whole server**. They fix different problems, and reaching for the
second when you needed the first just gives you four blocked event loops instead of one.

## How It Works

### Measure the right number

| Metric | Says | Trap |
| ------ | ---- | ---- |
| **p50 latency** | The typical request | Hides the tail entirely |
| **p99 latency** | The worst 1% — where users churn | Needs volume to be stable |
| **Event loop delay** | Whether the loop is blocked | The single best Node health signal |
| **RSS** | Total process memory | Includes buffers outside the heap |
| **Heap used** | V8 objects | Growth across restarts means a leak |

Event loop delay is the metric to alert on. Above roughly 50 ms, no amount of database tuning helps,
because requests are queued behind your own code.

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

Three tools, in the order you should reach for them. **A flame graph** — `node --cpu-prof app.js`,
then open the `.cpuprofile` in Chrome DevTools; wide bars are where the CPU went, and this is what
finds the accidental `JSON.parse` of a 3 MB payload. **A heap snapshot pair** — one, then load, then
another, compared. And **database query logs with timings** — `log_min_duration_statement` in
Postgres, the profiler in MongoDB. The third is where the answer usually is.

### Where the time actually goes

In a typical 400 ms request the split is usually close to this:

| Cost | Share | Fix |
| ---- | ----- | --- |
| Unindexed or N+1 queries | 60–80% | Index, batch, or join |
| Serialisation of a large response | 5–15% | Paginate; select fewer columns |
| Outbound HTTP with no connection reuse | 5–15% | Keep-alive agent |
| Your JavaScript | Under 5% | Usually not the problem |

**The N+1, which is the most common single defect.** A `findUnique` per post inside the loop costs
1 + N round trips; one batched query costs two, whatever the page size:

```typescript
const posts = await db.posts.findMany({ take: 20 });
const authors = await db.users.findMany({
  where: { id: { in: [...new Set(posts.map((p) => p.authorId))] } },
});
const byId = new Map(authors.map((a) => [a.id, a]));
```

Without a keep-alive agent, every outbound `fetch` pays a fresh TCP and TLS handshake — 30–80 ms
across a region. One line fixes it: `setGlobalDispatcher(new Agent({ keepAliveTimeout: 30_000,
connections: 128 }))` from `undici`.

### Memory leaks

Four causes account for nearly all of them.

| Cause | Looks like | Fix |
| ----- | ---------- | --- |
| Unbounded `Map` or array as a cache | Heap grows, never falls | `lru-cache` with `max` |
| Listener added per request | `MaxListenersExceeded` warning | `once`, or remove on cleanup |
| Timer holding a closure | Heap grows in steps | `clearInterval`, and `.unref()` |
| Closure capturing a large buffer | Retained size on a small object | Slice out what you need |

Normal growth plateaus as caches fill; a leak keeps a straight line.

## Using More Than One Core

| Tool | Use for | Cost | Data transfer |
| ---- | ------- | ---- | ------------- |
| `worker_threads` | CPU-bound JavaScript — parsing, hashing, image work | ~2 ms start, ~5 MB | Structured clone, or `SharedArrayBuffer` with zero copy |
| `child_process.spawn` | An external binary — `ffmpeg`, `pdftk` | ~30 ms start | Streams over stdio |
| `cluster` | More concurrent requests on one host | One full process per worker | Shared listening socket |
| Container replicas | More concurrent requests, orchestrated | One container each | Nothing shared |

> ⚠️ `child_process.exec` runs its argument through a shell, so any user-controlled value in that
> string is a command injection. Use `spawn` with an argument array — the shell is never involved.

**Pool your workers.** Spawning one per request costs more than the work for anything under about
50 ms, and 200 concurrent requests would mean 200 threads and a gigabyte of memory. `piscina` gives
you the standard shape: a fixed set of workers sized to `availableParallelism() - 1`, and a queue.
Always `terminate()` a worker you are finished with, or the process never exits.

### What breaks when you fork

`cluster.fork()` is four lines. The state audit is the work — every worker is a separate process
with separate memory, so anything you kept in a variable is now per-worker and inconsistent.

| Breaks | Why | Fix |
| ------ | --- | --- |
| In-memory sessions | Request 2 lands on another worker | Redis, or a signed cookie |
| In-memory rate limit counters | Each worker counts a fraction | Shared counter in Redis |
| In-memory cache | N caches, N stampedes, N× memory | Shared cache, or accept per-worker |
| `setInterval` cron jobs | Runs N times per tick | One scheduler, or a lock |
| WebSocket rooms | A broadcast reaches one worker's clients | Redis pub/sub adapter |

Whatever forks the workers must also replace them, and each must drain before it exits:

```typescript
process.on('SIGTERM', (): void => {
  server.close((): void => process.exit(0));               // Stop accepting, drain.
  setTimeout((): void => process.exit(1), 15_000).unref(); // Backstop for a stuck request.
});
```

## When to Use It

| Situation | Choose |
| --------- | ------ |
| Event loop delay is high, requests are few | Worker thread pool — the loop is the bottleneck |
| Event loop is idle, more requests than one core serves | More processes |
| Kubernetes or a serverless platform | Container replicas — the platform already does this |
| Bare metal or a VM you own, with many cores | `cluster`, or a process manager in cluster mode |
| Long-running background jobs | A separate worker service with a queue, not the web process |

Under an orchestrator, clustering inside the container is usually redundant and makes resource
limits harder to reason about. One process per container gives per-instance metrics, independent
restarts, and CPU limits the scheduler can honour.

## Common Mistakes

**❌ Optimising JavaScript before looking at the queries.** The profile decides, not intuition.

**❌ Trusting an average.** A p50 of 40 ms with a p99 of 4 s is a broken service that looks healthy
on a dashboard.

**❌ Benchmarking with `--inspect` attached or `NODE_ENV` unset.** The inspector changes optimisation
decisions, and many frameworks only enable their fast paths in production mode.

**❌ Sizing workers with `os.cpus().length`.** It reports the host's cores, so in a container limited
to half a CPU it might say 64. `availableParallelism()` respects the cgroup limit.

**❌ Not replacing dead workers.** Without an `'exit'` handler, capacity silently halves after a few
crashes and the service just looks "a bit slow".

## 🔑 Key Takeaways

- Measure first: the bottleneck is in the database far more often than in your JavaScript.
- Event loop delay is the one Node-specific metric worth alerting on.
- N+1 queries and missing connection reuse are the two most common real defects.
- Worker threads fix a blocked loop; replicas fix throughput. They are not substitutes.
- Forking turns every in-memory piece of state into a correctness bug — audit sessions, counters, caches and cron.

## Interview Questions

**Q: A service's p99 is 3 s while p50 is 30 ms. Where do you look?**

At the tail's shape rather than the average. Either a subset of requests hits a slow path — a
missing index that only matters for large tenants — or the event loop is blocked periodically by CPU
work or garbage collection, queueing everything behind it. Event loop delay and per-endpoint
percentiles separate the two in minutes.

**Q: Worker threads or more processes — how do you choose?**

By what is saturated. If the event loop is blocked by your own CPU work, a worker thread moves that
work off the loop and one process is still enough. If the loop is idle and you simply have more
requests than one core can serve, add processes. Adding processes to a blocking handler just
multiplies the blocked loops.

**Q: What breaks when you turn on clustering in an app that worked fine as one process?**

Anything held in memory. Sessions stop resolving because the second request lands on a different
worker, rate limits under-count by a factor of N, in-memory caches multiply, `setInterval` jobs run
once per worker, and WebSocket broadcasts reach only the clients on one worker. Move that state to
Redis or a database.

## What to Read Next

- [Chapter ?? — The Event Loop and Async Node](#ch-event-loop-async) — what "blocking" actually means
- [Chapter ?? — Indexes and Query Plans](#ch-indexes) — reading the plan behind the slow query
- [Chapter ?? — Redis](#ch-redis) — where the state that cannot stay in memory goes
