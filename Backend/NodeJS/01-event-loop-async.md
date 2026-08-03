# Event Loop & Async Programming

## 💡 One Thread, Thousands of Connections

Node.js runs your JavaScript on **one thread**. It still serves tens of thousands of concurrent connections, because it almost never *waits*.

When you read a file or query a database, Node hands the work to the operating system and moves on. The **event loop** is what picks your callback back up once that work finishes.

> The rule that explains every Node performance problem: **waiting is free, thinking is not.** I/O costs you nothing while it's in flight. CPU work blocks every other request on that process.

---

## The Event Loop

Each turn of the loop runs six phases in order. Each phase has its own queue of callbacks.

```
   ┌─────────────▶ timers            setTimeout, setInterval
   │                 │
   │                 ▼
   │              pending callbacks  deferred system errors (e.g. TCP)
   │                 │
   │                 ▼
   │              idle, prepare      internal only
   │                 │
   │                 ▼
   │              poll               ◀── new I/O arrives here
   │                 │                   (loop can BLOCK here)
   │                 ▼
   │              check              setImmediate
   │                 │
   │                 ▼
   └───────────── close callbacks    socket.on("close")
```

| Phase       | Runs                          | You'll be asked about  |
| ----------- | ----------------------------- | ---------------------- |
| **timers**  | Expired `setTimeout`/`setInterval` | Why timers are "at least", never "exactly" |
| **poll**    | I/O callbacks — most of your code | Where Node idles when there's nothing to do |
| **check**   | `setImmediate` callbacks      | `setImmediate` vs `setTimeout(fn, 0)` |
| **close**   | Cleanup handlers              | Rarely                 |

⚠️ **A timer is a threshold, not a promise.** `setTimeout(fn, 100)` means "not before 100 ms." If a callback in an earlier phase is busy for a second, your timer fires late. Node cannot interrupt running JavaScript.

---

## Microtasks Beat Everything

Between **every** phase — and after every individual callback — Node drains two extra queues:

1. **`process.nextTick`** queue
2. **Promise** microtask queue (`.then`, `await`)

`nextTick` drains completely first, then promises.

```typescript
console.log("1 sync");

setTimeout(() => console.log("5 timer"), 0);
setImmediate(() => console.log("6 immediate"));

Promise.resolve().then(() => console.log("4 promise"));
process.nextTick(() => console.log("3 nextTick"));

console.log("2 sync");

// 1 sync → 2 sync → 3 nextTick → 4 promise → 5 timer → 6 immediate
```

**Read the order as a rule:** all synchronous code → all `nextTick` → all promises → then the loop advances a phase.

🔴 **A recursive `nextTick` starves the loop entirely.** The queue must empty before the loop moves on, so it never does:

```typescript
// 🔴 The process is now permanently deaf to I/O and timers
function loop(): void {
  process.nextTick(loop);
}

// ✅ setImmediate yields — the loop completes a full turn between calls
function yielding(): void {
  setImmediate(yielding);
}
```

> Interview-ready: "`nextTick` runs before promises and before the loop advances. `setImmediate` runs in the check phase, so it yields to I/O. Prefer `setImmediate` for anything recursive."

### `setTimeout(fn, 0)` vs `setImmediate`

In the **main module** the order is genuinely nondeterministic — it depends on how long the process took to start relative to the 1 ms timer floor.

Inside an **I/O callback** it is always deterministic:

```typescript
import { readFile } from "node:fs";

readFile("data.txt", () => {
  setTimeout(() => console.log("timer"), 0);
  setImmediate(() => console.log("immediate")); // ✅ always first
});
```

We're in the poll phase, and `check` comes immediately after poll — while `timers` requires wrapping around to the next turn.

---

## Async Patterns

| Pattern         | Use it for                            |
| --------------- | ------------------------------------- |
| **Callbacks**   | Legacy APIs, event emitters           |
| **Promises**    | Combining concurrent work             |
| **async/await** | Everything you write today            |

Error-first callbacks still appear in older APIs. Wrap them once rather than nesting:

```typescript
import { promisify } from "node:util";
import { readFile } from "node:fs/promises"; // ✅ already promise-based
```

### Sequential vs concurrent — the mistake that matters

```typescript
// ❌ 900 ms — each await blocks the next, for no reason
const user = await fetchUser(id);        // 300 ms
const orders = await fetchOrders(id);    // 300 ms
const prefs = await fetchPrefs(id);      // 300 ms

// ✅ 300 ms — independent work starts together
const [user, orders, prefs] = await Promise.all([
  fetchUser(id),
  fetchOrders(id),
  fetchPrefs(id),
]);
```

> Only chain `await` when a later call genuinely needs an earlier result. This is the single most common async code-review finding.

### Choosing a combinator

| Method                 | Settles when            | Rejects when          | Reach for it                       |
| ---------------------- | ----------------------- | --------------------- | ---------------------------------- |
| `Promise.all`          | All fulfil              | **Any** rejects (fast) | All-or-nothing work                |
| `Promise.allSettled`   | All settle              | Never                 | Fan-out where partial success is OK |
| `Promise.race`         | First settles           | If first settles as rejection | Timeouts                   |
| `Promise.any`          | First **fulfils**       | Only if all reject    | Fallback across mirrors            |

```typescript
interface Report { userId: string; ok: boolean }

// A failed email shouldn't abort the other 999
const results = await Promise.allSettled(users.map(sendEmail));

const report: Report[] = results.map((r, i) => ({
  userId: users[i].id,
  ok: r.status === "fulfilled",
}));
```

⚠️ **`Promise.all` rejects fast but does not cancel.** The other promises keep running — they're just unobserved. Use `AbortSignal` when you actually need to stop the work:

```typescript
const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });
```

### Don't fan out without a limit

```typescript
// ❌ 50,000 concurrent connections — you DoS your own database
await Promise.all(ids.map(fetchRecord));

// ✅ Bounded concurrency
async function pooled<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    out.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
  }
  return out;
}

const records = await pooled(ids, 20, fetchRecord);
```

---

## Blocking the Event Loop

Blocking is not only long loops. These are all synchronous and all stop every request on the process:

- `JSON.parse` on a large payload
- `fs.readFileSync`, `crypto.pbkdf2Sync`
- A catastrophic-backtracking regex on user input
- `array.sort()` on hundreds of thousands of items

```typescript
// ❌ Every other request on this process waits
app.get("/report", (_req, res) => {
  res.json(buildHeavyReport()); // 4 seconds of CPU
});
```

**Fixes, in the order to consider them:**

| Situation                    | Fix                                     |
| ---------------------------- | --------------------------------------- |
| CPU work in a request        | **Worker thread** — keeps the loop free |
| Work that can be deferred    | **Queue** it, return `202 Accepted`     |
| Many CPU-bound requests      | **[Clustering](./08-clustering.md)** across cores |
| Separate binary or script    | **[Child process](./07-child-processes.md)** |

```typescript
import { Worker } from "node:worker_threads";

function runOffThread<T>(file: string, data: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(file, { workerData: data });
    worker.on("message", resolve);
    worker.on("error", reject);
    worker.on("exit", (code) => {
      if (code !== 0) reject(new Error(`Worker exited with ${code}`));
    });
  });
}
```

> Worker threads share memory and are cheap to talk to — right for CPU work. Child processes are isolated — right for running *other programs*. See [Child Processes](./07-child-processes.md).

**Measure it** — Node tells you when the loop is stalling:

```typescript
import { monitorEventLoopDelay } from "node:perf_hooks";

const h = monitorEventLoopDelay({ resolution: 20 });
h.enable();
setInterval(() => console.log("p99 lag (ms)", h.percentile(99) / 1e6), 10_000);
```

Healthy is single-digit milliseconds. Sustained triple digits means users are queueing.

---

## Interview Q&A

**Q: How does a single-threaded runtime handle 10,000 connections?**
A: The connections are almost always *waiting*, not computing. Node registers interest in each socket with the OS (`epoll`/`kqueue`) and runs a callback only when data is actually ready. Cost per idle connection is a few KB, versus roughly a megabyte for a thread stack in a thread-per-request server. It fails badly the moment requests need real CPU, because there's one thread to share.

**Q: Is Node.js really single-threaded?**
A: Your JavaScript is. The runtime is not — libuv keeps a thread pool (4 by default, `UV_THREADPOOL_SIZE`) used for file I/O, DNS lookups, and some crypto. Network I/O doesn't use the pool at all; it's handled by the OS event notification system.

**Q: `process.nextTick` vs `setImmediate`?**
A: `nextTick` runs before the loop advances and before promise microtasks; `setImmediate` runs in the check phase of the next turn. `nextTick` has higher priority despite the name suggesting otherwise. Recursive `nextTick` starves I/O; recursive `setImmediate` doesn't. Default to `setImmediate`.

**Q: Why did `setTimeout(fn, 100)` fire after 3 seconds?**
A: Something blocked the loop. Timers only fire when the loop reaches the timers phase, and Node can't interrupt running JavaScript. The timer is a minimum delay, never a guarantee.

**Q: How do you find a blocked event loop in production?**
A: Track loop delay with `monitorEventLoopDelay` and alert on the p99. To find the culprit, capture a CPU profile (`--cpu-prof` or Clinic Flame) during the stall — the blocking synchronous frame sits at the top.

---

## Best Practices

✅ Use `Promise.all` for independent work — don't `await` in sequence out of habit
✅ Bound your concurrency when fanning out over a large list
✅ Move CPU work to worker threads; move deferrable work to a queue
✅ Prefer `setImmediate` over `process.nextTick` for recursion
✅ Monitor event loop delay as a first-class production metric
✅ Always attach `error` handlers — an unhandled rejection terminates the process by default
❌ Don't use `*Sync` file or crypto APIs on a request path
❌ Don't treat `setTimeout` delays as accurate
❌ Don't `await` inside a `for` loop when the iterations are independent

---

[← Back to NodeJS](./README.md) | [Next: Streams & Buffers →](./02-streams-buffers.md)
