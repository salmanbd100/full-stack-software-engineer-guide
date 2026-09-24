---
title: Node.js Performance, Streams and Scaling
part: 5
chapter: 3
slug: nodejs-performance
level: advanced
reading_time: 13
updated: 2026-09-24
tags: [nodejs, performance, profiling, streams, backpressure, cluster, worker-threads]
in_book: true
---

# Node.js Performance, Streams and Scaling {#ch-nodejs-performance}

> Find the real bottleneck with a profile, keep memory flat with streams, and decide whether the fix is a faster loop or more of them.

**In this chapter:** the metrics worth alerting on · where the time really goes · streams and backpressure · worker threads against replicas · what breaks when you fork

## 💡 The Core Idea

Node performance work has a fixed order. **Measure, find the slowest thing, fix that, measure again.**
The intuitive answer is nearly always wrong. Engineers tune their JavaScript, then the profile shows
5 ms of JavaScript and 400 ms waiting on a database with no index. Node is a coordination layer. Most
of its latency belongs to something it called.

Memory follows the same logic. Holding a whole payload costs memory for every request in flight.
**Streaming** handles data in chunks, so memory stays flat as the payload grows.

Scaling is the same question one level up. One process runs JavaScript on one core. **Worker threads
move CPU work off the main thread**, and **replicas run more copies of the server**. They fix
different problems. Pick the wrong one and you get four blocked event loops instead of one.

## How It Works

### Measure the right number

| Metric | Says | Trap |
| ------ | ---- | ---- |
| **p50 latency** | The typical request | Hides the tail entirely |
| **p99 latency** | The worst 1% — where users churn | Needs volume to be stable |
| **Event loop delay** | Whether the loop is blocked | The single best Node health signal |
| **RSS** | Total process memory | Includes buffers outside the heap |
| **Heap used** | V8 objects | Growth across restarts means a leak |

Alert on event loop delay. Above roughly 50 ms, database tuning cannot help. Requests are queued
behind your own code.

**Reporting event loop delay:**

```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval((): void => {
  metrics.gauge('event_loop.p99_ms', histogram.percentile(99) / 1e6);
  histogram.reset();
}, 10_000).unref();
```

To find the bottleneck, use three tools in this order. A **flame graph** from `node --cpu-prof`,
opened in Chrome DevTools, shows where the CPU went. A **pair of heap snapshots**, taken before and
after load, shows what grew. **Slow-query logs** show what the database did. The third is usually where
the answer is.

### Where the time actually goes

| Cost in a 400 ms request | Share | Fix |
| ------------------------ | ----- | --- |
| Unindexed or N+1 queries | 60–80% | Index, batch, or join |
| Serialising a large response | 5–15% | Paginate, select fewer columns, or stream |
| Outbound HTTP with no connection reuse | 5–15% | Keep-alive agent |
| Your JavaScript | Under 5% | Usually not the problem |

The N+1 is the most common single defect. One lookup per post inside a loop costs 1 + N round trips.
One batched query costs two, whatever the page size.

**Batching the author lookup:**

```typescript
const posts = await db.posts.findMany({ take: 20 });
const authors = await db.users.findMany({
  where: { id: { in: [...new Set(posts.map((p) => p.authorId))] } },
});
const byId = new Map(authors.map((a) => [a.id, a]));
```

Without a keep-alive agent, every outbound `fetch` pays a fresh TCP and TLS handshake. That is
30–80 ms across a region. `setGlobalDispatcher(new Agent({ keepAliveTimeout: 30_000 }))` from
`undici` fixes it.

Leaks usually come from an unbounded `Map` cache, a listener added per request, or a timer holding a
closure. Normal growth levels off; a leak keeps rising in a straight line.

## Streams and Backpressure

A buffered response holds the whole body in memory before sending a byte. Ten users each downloading
a 200 MB export need 2 GB. Streamed in 64 KB chunks, the same ten need about 1 MB. That is the
difference between a container that survives and one the scheduler kills.

Streaming also cuts time to first byte. The client starts reading while the server is still working.
This is why an LLM response streams token by token: nobody waits ten seconds for a full answer.

| Type | Direction | Example |
| ---- | --------- | ------- |
| **Readable** | Out of a source | A file read, an HTTP request, a database cursor |
| **Writable** | Into a sink | A file write, an HTTP response |
| **Transform** | Both, coupled | gzip, a CSV encoder, a JSON-lines parser |

**Backpressure** is the sink telling the source to stop. A readable can usually produce faster than a
writable can consume. `write()` returns `false` when the sink's buffer is full. You must wait for
`'drain'` before writing again.

**The manual version, so the mechanism is visible:**

```typescript
async function copy(src: Readable, dst: Writable): Promise<void> {
  for await (const chunk of src) {
    if (!dst.write(chunk)) {
      await once(dst, 'drain'); // Pause the source until the sink catches up.
    }
  }
  dst.end();
}
```

Ignore that return value and the buffer grows without limit. You have brought back the memory problem
streams were meant to solve.

**Streaming a large export with `pipeline`:**

```typescript
app.get('/exports/orders.csv', async (req, res) => {
  res.type('text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');

  const controller = new AbortController();
  res.on('close', (): void => controller.abort()); // The user cancelled the download.

  // A cursor, not a full result set — the query never sits in memory.
  const cursor = db.query(new QueryStream('SELECT * FROM orders'));
  await pipeline(cursor, new CsvTransform(), res, { signal: controller.signal });
});
```

`pipe()` handles backpressure but not errors, so a failed sink leaks the source. `pipeline` from
`node:stream/promises` destroys the whole chain on any failure. It is the correct default.

> ⚠️ Chunk boundaries do not respect your records. A UTF-8 character or a JSON line can be split
> across two chunks. Call `setEncoding('utf8')` on text streams, and have a transform carry the partial
> last line into the next chunk and parse it in `_flush`.

## Using More Than One Core

| Tool | Use for | Cost |
| ---- | ------- | ---- |
| `worker_threads` | CPU-bound JavaScript — parsing, hashing, image work | ~2 ms start, ~5 MB each |
| `child_process.spawn` | An external binary such as `ffmpeg` — never `exec` with user input | ~30 ms start |
| `cluster` | More concurrent requests on one host | One full process per worker |
| Container replicas | More concurrent requests, orchestrated | One container each |

**Pool your workers.** Spawning one per request costs more than the work for anything under about
50 ms. A library such as `piscina` gives a fixed pool sized to `availableParallelism() - 1`, plus a
queue.

### What breaks when you fork

`cluster.fork()` is four lines. The state audit is the real work. Every worker has its own memory, so
anything kept in a variable is now per-worker and inconsistent.

| Breaks | Why | Fix |
| ------ | --- | --- |
| In-memory sessions | Request 2 lands on another worker | Redis, or a signed cookie |
| In-memory rate limit counters | Each worker counts a fraction | Shared counter in Redis |
| `setInterval` cron jobs | Runs N times per tick | One scheduler, or a lock |
| WebSocket rooms | A broadcast reaches one worker's clients | Redis pub/sub adapter |

## When to Use It

| Situation | Choose |
| --------- | ------ |
| Event loop delay is high, requests are few | Worker thread pool — the loop is the bottleneck |
| Event loop is idle, more requests than one core serves | More processes |
| Kubernetes or a serverless platform | Container replicas — the platform already does this |
| Export, download or LLM response over a few MB or seconds | Stream it |
| Small JSON body, or data that must be validated whole | Buffer it — you cannot un-send a bad chunk |

Under an orchestrator, run one process per container. Clustering inside it is usually redundant.

## Common Mistakes

**❌ Optimising JavaScript before looking at the queries.** ✅ Let the profile decide, not intuition.

**❌ Trusting an average.** ✅ Watch p99. A p50 of 40 ms with a p99 of 4 s is a broken service that
looks healthy on a dashboard.

**❌ No client-disconnect guard on a stream.** ✅ Abort on `res.on('close')`. Otherwise the source
keeps reading after the browser has gone.

## 🔑 Key Takeaways

- Measure first, because the bottleneck is in the database far more often than in your JavaScript.
- Event loop delay is the one Node-specific metric worth alerting on.
- Streaming keeps memory flat as payloads grow, and backpressure is what stops a fast source flooding a slow sink.
- Worker threads fix a blocked loop and replicas fix throughput, so they are not substitutes.
- Forking turns every in-memory piece of state into a correctness bug, so audit sessions, counters and cron jobs.

## Interview Questions

**Q: A service's p99 is 3 s while p50 is 30 ms. Where do you look?**

At the shape of the tail, not the average. Either some requests hit a slow path, such as a missing
index that only matters for large tenants, or CPU work or garbage collection blocks the loop now and
then. Event loop delay and per-endpoint percentiles separate the two in minutes.

**Q: What is backpressure, and what happens if you ignore it?**

It is the writable side telling the readable side to slow down. `write()` returns `false`, and the
`'drain'` event lifts it. Ignore it and chunks pile up in the sink's buffer with no ceiling, until the
process is killed. `pipeline` handles it for you; a hand-written loop does not.

**Q: Why stream an LLM response or a large file download instead of sending it whole?**

Two reasons. Time to first byte drops, so the user sees tokens or progress at once. Memory per request
stays at one chunk rather than the whole body, so concurrency does not multiply it. The cost is that
errors can arrive after the status code is sent, so the client must handle a failed stream.

**Q: Worker threads or more processes — how do you choose?**

By what is saturated. If your own CPU work blocks the loop, a worker thread moves it off and one process
is still enough. If the loop is idle and there are more requests than one core serves, add processes.
Adding processes to a blocking handler just multiplies the blocked loops.

**Q: What breaks when you turn on clustering in an app that worked as one process?**

Anything held in memory. Sessions stop resolving because the next request lands on another worker.
Rate limits under-count by a factor of N, `setInterval` jobs run once per worker, and broadcasts reach
one worker's clients. Move that state to Redis or a database.

## What to Read Next

- [Chapter ?? — The Node.js Event Loop, Async and Errors](#ch-event-loop-async) — what "blocking" actually means
- [Chapter ?? — Real-Time and Streaming APIs](#ch-realtime-streaming) — streaming over HTTP and WebSockets
- [Chapter ?? — Indexes, Query Plans, ORMs and Migrations](#ch-indexes) — reading the plan behind the slow query
