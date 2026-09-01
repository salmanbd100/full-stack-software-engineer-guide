---
title: The Event Loop and Async Node
part: 5
chapter: 0
slug: event-loop-async
level: intermediate
reading_time: 10
updated: 2026-09-01
tags: [nodejs, event-loop, async, concurrency]
in_book: true
---

# The Event Loop and Async Node {#ch-event-loop-async}

> Explain how one thread serves thousands of connections, and name the exact line that will stall all of them.

**In this chapter:** the loop's phases · microtasks against macrotasks · concurrency patterns that scale · what blocking looks like in production

## 💡 The Core Idea

Node runs your JavaScript on **one thread**. It stays fast because almost nothing your code
waits for is done by that thread. A database query, a file read, an HTTP call — Node hands each
one to the operating system or to a background thread pool, then goes back to running other
work. When the result is ready, the operating system tells Node, and Node runs your callback.

So Node is not fast because it is parallel. It is fast because it is never idle while waiting.
The corollary is the thing interviewers are actually testing: **any CPU work you do inline is
work nobody else can do anything during.** One 200 ms JSON parse is 200 ms of latency added to
every other request in flight.

## How It Works

The event loop is a fixed cycle of phases. Each phase has its own queue of callbacks, and the
loop drains that queue before moving on.

| Phase | Runs | You see it as |
| ----- | ---- | ------------- |
| **timers** | `setTimeout`, `setInterval` callbacks whose time has passed | Scheduled work |
| **pending callbacks** | Some system-level callbacks, mostly TCP errors | Rarely |
| **poll** | I/O completions — sockets, file reads, DNS | Where a server spends its life |
| **check** | `setImmediate` callbacks | "Run right after this I/O phase" |
| **close** | `close` handlers on sockets and streams | Cleanup |

```mermaid
flowchart LR
  A["timers"] --> B["pending callbacks"]
  B --> C["poll (I/O)"]
  C --> D["check (setImmediate)"]
  D --> E["close handlers"]
  E --> A
```

**One turn of the event loop. Between every arrow, Node drains the microtask queue.**

### Microtasks beat everything

Two queues sit **outside** the phases and are drained after every single callback, not once per
phase:

1. `process.nextTick` — Node's own queue, drained first
2. Promise reactions (`.then`, `await` resumption) — drained second

That ordering is the classic interview question.

**Ordering, from a cold start:**

```typescript
setTimeout((): void => console.log('1 timeout'), 0);
setImmediate((): void => console.log('2 immediate'));
Promise.resolve().then((): void => console.log('3 promise'));
process.nextTick((): void => console.log('4 nextTick'));
console.log('5 sync');

// 5 sync → 4 nextTick → 3 promise → 1 timeout → 2 immediate
```

Synchronous code finishes first because the loop has not started a turn yet. Then `nextTick`,
then promises, then the loop begins and hits **timers** before **check**.

> ⚠️ A recursive `process.nextTick` starves the loop completely — the queue is drained until
> empty, and it never becomes empty. Recursive `setImmediate` yields between turns and is safe.

### The thread pool is small and shared

`fs`, `dns.lookup`, `zlib` and `crypto.pbkdf2` do not use the OS event notification system.
They run on libuv's thread pool, which defaults to **four threads**. Four concurrent
`bcrypt.hash` calls will queue the fifth. Sockets do not use the pool, so ordinary HTTP and
database traffic is unaffected.

```typescript
// Raise it before any async work starts — it is read once, at first use.
process.env.UV_THREADPOOL_SIZE = '8';
```

## When to Use It

Concurrency shape matters more than syntax. These are the four you should be able to reach for
without thinking.

| You have | Use | Why |
| -------- | --- | --- |
| Independent calls, all must succeed | `Promise.all` | One round trip's worth of latency, not N |
| Independent calls, partial failure is fine | `Promise.allSettled` | You get every result plus every reason |
| Several sources, first answer wins | `Promise.race` | Timeouts and hedged requests |
| A large list, one shared downstream | Bounded pool | Protects the database from your own fan-out |

**Bounded concurrency — the pattern most people get wrong:**

```typescript
async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;

  // `limit` workers share one cursor, so at most `limit` calls are ever open.
  const worker = async (): Promise<void> => {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await fn(items[index]);
    }
  };

  await Promise.all(Array.from({ length: limit }, worker));
  return results;
}

const users = await mapLimit(ids, 10, (id: string) => fetchUser(id));
```

`Promise.all(ids.map(fetchUser))` with 5,000 ids opens 5,000 sockets and exhausts the
connection pool. The version above opens ten.

## Common Mistakes

**❌ CPU work inline in a request handler**

```typescript
app.post('/report', (req, res) => {
  const csv = rows.map(toCsvLine).join('\n'); // 400 ms for 200k rows
  res.type('text/csv').send(csv);
});
```

**✅ Stream it, or move it off-thread**

```typescript
app.post('/report', (req, res) => {
  res.type('text/csv');
  // Each chunk yields to the loop, so other requests interleave.
  Readable.from(rows).pipe(new CsvTransform()).pipe(res);
});
```

Anything over roughly 10 ms of straight-line CPU per request belongs in a worker thread or a
stream. See [Chapter ?? — Scaling a Node Process](#ch-scaling-node) for the worker route.

**❌ `await` in a loop over independent work**

```typescript
for (const id of ids) {
  results.push(await fetchUser(id)); // N sequential round trips
}
```

**✅ Fan out, then bound it**

```typescript
const results = await mapLimit(ids, 10, fetchUser);
```

**❌ Synchronous file and crypto calls on the hot path.** `fs.readFileSync`,
`crypto.randomBytes` with a large size, and `JSON.parse` on a multi-megabyte body all block.
Read config synchronously at boot; never per request.

**❌ A forgotten `await` on a promise-returning call.** The function returns before the work
finishes, errors surface as an unhandled rejection, and the request has already been answered.
Turn on `@typescript-eslint/no-floating-promises`.

## 🔑 Key Takeaways

- Node's speed comes from never waiting on its own thread, not from parallelism.
- Microtasks — `process.nextTick`, then promises — drain after every callback, before the loop's next phase.
- The libuv thread pool defaults to four threads and is shared by `fs`, `zlib` and `crypto`.
- Unbounded `Promise.all` over a large list is a self-inflicted denial of service on your database.
- More than ~10 ms of inline CPU per request is a latency tax on every other request in flight.

## Interview Questions

**Q: Node is single-threaded, so how does it handle 10,000 concurrent connections?**

The JavaScript runs on one thread, but the waiting does not. Node registers interest in each
socket with the OS notification system (`epoll` on Linux, `kqueue` on macOS) and returns to the
loop. The OS reports which sockets are ready; Node runs only those callbacks. Memory per idle
connection is small, so the limit is file descriptors and memory rather than threads.

**Q: What logs first — `setTimeout(fn, 0)` or `setImmediate(fn)`?**

From synchronous code, `setTimeout` usually wins, because the loop reaches the **timers** phase
before the **check** phase. From inside an I/O callback, `setImmediate` always wins, because
**check** comes immediately after **poll** and the loop has to complete a full turn to get back
to timers. The reliable statement is the phase order, not a fixed answer.

**Q: `process.nextTick` or `Promise.resolve().then` — does the difference matter?**

`nextTick` drains entirely before any promise reaction, so it is higher priority. It exists for
library authors who need to run after the current operation but before anything else observes
state. In application code, prefer promises: recursive `nextTick` starves the event loop, and
recursive promise chains do not.

## What to Read Next

- [Chapter ?? — Streams and Buffers](#ch-streams-buffers) — how to process data that does not fit in memory
- [Chapter ?? — Scaling a Node Process](#ch-scaling-node) — worker threads, clustering, and using every core
- [Chapter ?? — Node.js Performance](#ch-nodejs-performance) — finding the blocking call before a user does
