# Node.js Performance {#ch-node-performance}

> Find the actual bottleneck before changing anything, because it is rarely where you expect.

**In this chapter:** profiling and flame graphs · blocking the loop · the database, where the time usually is · caching · memory leaks · HTTP-level wins

## 💡 Measure, Then Fix

Most Node "optimization" work targets the wrong thing. Developers micro-tune loops while a missing database index costs 400 ms per request.

The order that actually pays:

| Priority | Area                          | Typical win     |
| -------- | ----------------------------- | --------------- |
| 🔴 **1** | Stop blocking the event loop  | Seconds         |
| 🔴 **2** | Fix N+1 and missing indexes   | Hundreds of ms  |
| ⚠️ **3** | Cache what's expensive        | Tens to hundreds of ms |
| ⚠️ **4** | Parallelise independent I/O   | Tens of ms      |
| ✅ **5** | V8 and JS micro-tuning        | Microseconds    |

> Nobody has ever fixed a slow Node service by rewriting a `for` loop. Profile first — the bottleneck is rarely where you assume.

---

## Find the Bottleneck

**Event loop delay** is the first metric to check. If it's high, nothing else matters.

```typescript
import { monitorEventLoopDelay } from "node:perf_hooks";

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();

setInterval(() => {
  logger.info({ p99Ms: h.percentile(99) / 1e6, meanMs: h.mean / 1e6 }, "loop delay");
  h.reset();
}, 30_000);
```

Single-digit ms is healthy. Sustained triple digits means requests are queueing behind CPU work.

**Then get a CPU profile.** The blocking function sits at the top of the flame graph.

```bash
node --cpu-prof --cpu-prof-dir=./profiles app.js   # load it in Chrome DevTools
```

**Time individual operations** with `perf_hooks`:

```typescript
import { performance } from "node:perf_hooks";

const start = performance.now();
const rows = await db.query(sql);
logger.info({ ms: performance.now() - start, rows: rows.length }, "query");
```

> ⚠️ Benchmark against production-shaped data. A query that's fast on 100 rows can be catastrophic on 10 million.

---

## Don't Block the Event Loop

One synchronous CPU burst stalls **every** concurrent request on that process.

```typescript
// ❌ 200 ms of CPU — every other request waits 200 ms
app.post("/hash", (req, res) => {
  const hash = crypto.pbkdf2Sync(req.body.password, salt, 600_000, 32, "sha256");
  res.json({ hash: hash.toString("hex") });
});

// ✅ Async version runs on libuv's thread pool
app.post("/hash", async (req, res) => {
  const hash = await promisify(crypto.pbkdf2)(req.body.password, salt, 600_000, 32, "sha256");
  res.json({ hash: hash.toString("hex") });
});
```

Common blockers, all easy to miss: `JSON.parse` on multi-MB payloads, `*Sync` file APIs, `sort()` on huge arrays, and backtracking regexes.

🔴 **Regex backtracking is a denial-of-service vector.** `/^(a+)+$/` against a crafted string runs for years.

```typescript
// ❌ Nested quantifier — exponential on failure
const bad = /^(\s*\w+)+$/;

// ✅ Bound the input, keep the pattern linear
if (input.length > 256) throw new ValidationError("too long");
```

For genuine CPU work, use [worker threads](./01-event-loop-async.md) or [clustering](./08-clustering.md).

⚠️ **`UV_THREADPOOL_SIZE` defaults to 4.** File I/O, DNS, and `pbkdf2`/`bcrypt` share those four threads. Heavy hashing plus file reads will contend — raise it toward your core count.

---

## Database: Where the Time Actually Goes

**Always pool connections.** Opening a TCP connection and authenticating per query costs more than the query.

```typescript
const pool = new Pool({
  max: 20,                       // roughly cores × 2–4, and within the DB's limit
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000, // fail fast rather than queue forever
});
```

⚠️ Pool size is not "bigger is better." Every connection costs memory on the database, and beyond its capacity you just move the queue.

**Kill N+1 queries** — usually the single biggest win in a CRUD service:

```typescript
// ❌ 1 + N round trips
const posts = await db.posts.findAll();
for (const post of posts) {
  post.author = await db.users.findById(post.authorId);   // N queries
}

// ✅ 2 round trips
const posts = await db.posts.findAll();
const authors = await db.users.findByIds(posts.map((p) => p.authorId));
const byId = new Map(authors.map((a) => [a.id, a]));
posts.forEach((p) => { p.author = byId.get(p.authorId); });
```

> `Map` lookup is O(1); scanning an array inside the loop would just move the N+1 from the database into your CPU.

Also: select only the columns you need, paginate with a cursor rather than `OFFSET`, and index every column you filter or sort on.

---

## Caching

```text
Request ──▶ in-process Map ──▶ Redis ──▶ Database
            ~0.001 ms          ~1 ms      ~10-100 ms
```

**In-process** is fastest but is per-instance and dies on restart. Use it for small, hot, rarely-changing data — and always bound it:

```typescript
import { LRUCache } from "lru-cache";

const cache = new LRUCache<string, Config>({ max: 1_000, ttl: 60_000 });
```

🔴 **An unbounded `Map` used as a cache is a memory leak.** It only ever grows.

**Redis** is shared across instances and survives restarts — the right default above a single process. See [Redis](../NoSQL/06-redis.md).

⚠️ **Guard against cache stampede.** When a hot key expires, every concurrent request misses at once and they all hit the database together. De-duplicate in-flight loads:

```typescript
const inFlight = new Map<string, Promise<User>>();

function loadUser(id: string): Promise<User> {
  const existing = inFlight.get(id);
  if (existing) return existing;                       // reuse the pending request

  const p = db.users.findById(id).finally(() => inFlight.delete(id));
  inFlight.set(id, p);
  return p;
}
```

---

## Memory Leaks

Node's heap grows until the process is OOM-killed. The four usual causes:

| Cause | Fix |
| --- | --- |
| Unbounded cache or array | LRU with a `max` |
| Listeners added per request | `removeListener`, or `once` |
| Timers never cleared | `clearInterval` on shutdown |
| Closures holding big objects | Narrow the captured scope |

```typescript
// ❌ Adds a listener on every request — leaks, then warns at 11
app.use((req, _res, next) => {
  emitter.on("event", () => handle(req));
  next();
});
```

> A `MaxListenersExceededWarning` is almost always a real leak, not a limit to raise.

**Confirm before you hunt:** take two heap snapshots under load, minutes apart, and compare in Chrome DevTools. Objects that grew between snapshots and are still retained are your leak.

```typescript
import { writeHeapSnapshot } from "node:v8";
process.on("SIGUSR2", () => writeHeapSnapshot());   // trigger on demand in prod
```

---

## HTTP-Level Wins

```typescript
import compression from "compression";
app.use(compression());        // 70-80% smaller JSON responses
```

**Reuse outbound connections** — without keep-alive every call to an internal service pays a fresh TCP and TLS handshake:

```typescript
import { Agent } from "undici";
const agent = new Agent({ keepAliveTimeout: 30_000, connections: 128 });
```

**Always set a timeout on outbound calls.** A dependency that hangs will exhaust your pool and take you down with it:

```typescript
await fetch(url, { signal: AbortSignal.timeout(3_000) });
```

---

## Interview Q&A

**Q: How do you find a performance problem in production?**
A: Start with metrics, not code — event loop delay, p99 latency per route, and memory over time. Loop delay points at CPU blocking, so capture a CPU profile during a stall. Flat loop delay with slow endpoints points at I/O, so trace the downstream calls. The mistake is jumping straight to profiling before you know whether the bottleneck is CPU or I/O.

**Q: Your API is slow only under load. Why?**
A: Something is serialising. Usual suspects: a connection pool too small, so requests queue for a connection; CPU work blocking the loop, which only shows once concurrency rises; or a downstream service without a timeout, holding connections open. Load-test with the pool and loop delay both instrumented, and it's usually obvious which.

**Q: How do you detect a memory leak?**
A: Watch heap-used over time — a leak trends up and never recovers after GC, unlike normal sawtooth. Then compare two heap snapshots taken minutes apart under load, and look at the retainers of whatever grew. Caches without eviction and per-request event listeners cover most cases.

**Q: When does clustering help and when doesn't it?**
A: It helps when you're CPU-bound on a multi-core box — four workers use four cores. It doesn't help when you're I/O-bound waiting on a database, because the bottleneck is the database, and it can hurt by multiplying your connection count. Measure loop delay first: high means CPU-bound and clustering will help.

**Q: Where does caching go wrong?**
A: Invalidation and stampede. Stale data is worse than slow data for anything users act on, so pick a TTL you can defend. On expiry of a hot key, every request misses simultaneously and hammers the origin — de-duplicate in-flight loads or use a short random TTL jitter.

---

## Best Practices

✅ Profile before optimising — measure the bottleneck, don't guess
✅ Track event loop delay as a first-class production metric
✅ Pool database connections; size deliberately
✅ Batch queries to kill N+1
✅ Bound every cache with an LRU and a TTL
✅ Set timeouts on every outbound call
✅ Raise `UV_THREADPOOL_SIZE` if you do heavy hashing or file I/O
❌ Don't use `*Sync` APIs on a request path
❌ Don't use a plain `Map` as an unbounded cache
❌ Don't micro-optimise JavaScript before fixing I/O and queries

---

[← Previous: Error Handling](./04-error-handling.md) | [Next: Security →](./06-security.md)
