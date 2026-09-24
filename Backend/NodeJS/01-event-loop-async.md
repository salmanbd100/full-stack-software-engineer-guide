---
title: The Node.js Event Loop, Async and Errors
part: 5
chapter: 2
slug: event-loop-async
level: intermediate
reading_time: 14
updated: 2026-09-24
tags: [nodejs, event-loop, async, concurrency, errors, express, resilience]
in_book: true
---

# The Node.js Event Loop, Async and Errors {#ch-event-loop-async}

> Explain how one thread serves thousands of connections, name the line that stalls them all, and decide which failures you answer and which you restart for.

**In this chapter:** the loop's phases · microtasks against macrotasks · concurrency that scales · operational against programmer errors · crashing and shutting down cleanly

## 💡 The Core Idea

Node runs your JavaScript on **one thread**. It stays fast because that thread never waits: a
query, a file read or an HTTP call goes to the operating system or a small thread pool, and Node
runs your callback when the result is ready. It is not parallel, just never idle. Two
consequences follow. **Any CPU work you do inline blocks everyone:** one 200 ms JSON parse adds
200 ms to every request in flight. And **one process serves every user**, so an error you cannot
explain means unknown state for all of them. The safe answer is to log it and restart.

## How It Works

The event loop is a fixed cycle of phases, each draining its own queue of callbacks. A server
spends most of its life in **poll**, waiting for I/O. **Timers** runs expired `setTimeout`
callbacks, and **check** runs `setImmediate`.

**The loop's phases:**

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

Two queues sit **outside** the phases and drain after every callback: `process.nextTick` first,
then promise reactions.

**Ordering, from a cold start:**

```typescript
setTimeout((): void => console.log('1 timeout'), 0);
setImmediate((): void => console.log('2 immediate'));
Promise.resolve().then((): void => console.log('3 promise'));
process.nextTick((): void => console.log('4 nextTick'));
console.log('5 sync');

// 5 sync → 4 nextTick → 3 promise → 1 timeout → 2 immediate
// Sync code runs before the loop even starts its first turn.
```

> ⚠️ A recursive `process.nextTick` starves the loop, because its queue never empties. A recursive
> `setImmediate` yields between turns and is safe.

### The thread pool is small and shared

`fs`, `dns.lookup`, `zlib` and `crypto.pbkdf2` share libuv's pool of **four threads**, so a fifth
slow `bcrypt.hash` waits. Sockets do not use the pool. `UV_THREADPOOL_SIZE` raises the limit.

## When to Use It

| You have | Use | Why |
| -------- | --- | --- |
| Independent calls, all must succeed | `Promise.all` | One round trip's worth of latency, not N |
| Independent calls, partial failure is fine | `Promise.allSettled` | You get every result and every reason |
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
```

`Promise.all(ids.map(fetchUser))` with 5,000 ids opens 5,000 sockets and drains the connection
pool. `mapLimit(ids, 10, fetchUser)` opens ten.

## Two Kinds of Error

Every error in a Node service is one of two kinds. The whole design follows from telling them apart.

| Kind | Example | Response |
| ---- | ------- | -------- |
| **Operational** | Row not found, token expired, provider timed out | Answer the request and stay up |
| **Programmer** | Property of `undefined`, broken invariant, bad config key | Log it, then let the process die and restart |

Treat a bug as operational and you serve corrupted responses for hours. Crash, and it restarts in seconds.

**A typed error base:**

```typescript
export class AppError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
    readonly expose: boolean = true, // Safe to show the client?
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
  }
}

export class UpstreamError extends AppError {
  // The client gets a generic message; the log keeps the detail through `cause`.
  constructor(service: string, cause?: unknown) {
    super(`${service} unavailable`, 502, 'upstream_unavailable', false, { cause });
  }
}
```

`status` and `code` let one handler answer every error. `expose` decides at throw time whether the
message is safe to send, because an upstream message may quote a hostname or a connection string.

### One handler for everything

Express sends every error to one four-argument middleware. In Express 5, a rejected promise from
an `async` handler reaches it automatically. In Express 4 it does not, and the request hangs.

**The single error handler, registered after every route:**

```typescript
app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const known = err instanceof AppError ? err : undefined;
  const status = known?.status ?? 500;
  req.log.error({ err, status, requestId: req.id }, 'request failed');

  res.status(status).json({
    error: {
      code: known?.code ?? 'internal_error',
      message: known?.expose ? known.message : 'Internal server error',
      requestId: req.id,
    },
  });
});
```

An unrecognised error defaults to 500 and a generic message. It is a bug, and bugs leak.

### Crashing and shutting down cleanly

An unhandled rejection is a promise that failed with nothing listening. Since Node 15 it crashes
the process by default. Keep that, and add handlers only to log first.

**Process-level handlers and graceful shutdown:**

```typescript
process.on('unhandledRejection', (reason: unknown): void => {
  logger.fatal({ err: reason }, 'unhandled rejection');
  throw reason; // Turns it into an uncaught exception, so there is one exit path.
});

process.on('uncaughtException', (err: Error): void => {
  logger.fatal({ err }, 'uncaught exception');
  shutdown(1);
});

process.on('SIGTERM', (): void => shutdown(0)); // The orchestrator is stopping the container.

function shutdown(code: number): void {
  server.close((): void => process.exit(code));
  setTimeout((): void => process.exit(code), 10_000).unref(); // Backstop.
}
```

> ⚠️ These handlers exist to **log and exit**, never to recover. After an uncaught exception, a
> transaction may be open or a lock held. The next request would see that half-applied state.

## Common Mistakes

**❌ CPU work inline in a request handler.** Building a 200k-row CSV with `map` and `join` takes
400 ms, and every other request waits. **✅ Stream it** so each chunk yields to the loop, or move
it to a worker thread. More than roughly 10 ms of straight-line CPU per request belongs off the loop.

**❌ A `catch` that logs and carries on.** The order was not saved, yet the client gets a 200.
**✅ Translate and rethrow** — `throw new UpstreamError('orders', e)` — so the handler answers it.

**❌ A forgotten `await`.** The error becomes an unhandled rejection after the response is sent.
Turn on `@typescript-eslint/no-floating-promises`.

## 🔑 Key Takeaways

- Node's speed comes from never waiting on its own thread, not from parallelism.
- Microtasks drain after every callback, `process.nextTick` first and promises second.
- Unbounded `Promise.all` over a large list is a self-inflicted denial of service on your database.
- Operational errors get an answer, while programmer errors get a log line and a restart.
- Process-level handlers exist to log and shut down cleanly, never to keep a broken process alive.

## Interview Questions

**Q: Node is single-threaded, so how does it handle 10,000 concurrent connections?**

The JavaScript runs on one thread, but the waiting does not. Node registers each socket with
`epoll` (Linux) or `kqueue` (macOS), and the OS reports which ones are ready. Node runs only those
callbacks, so the limit is file descriptors and memory, not threads.

**Q: What logs first — `setTimeout(fn, 0)` or `setImmediate(fn)`?**

From synchronous code, `setTimeout` usually wins, because **timers** comes before **check**. From
inside an I/O callback, `setImmediate` always wins, because **check** follows **poll**.

**Q: Should you keep the process alive after an `uncaughtException`?**

No. A transaction may be open or a cache half-written, so the state is unknown. Log with full
context, stop accepting connections, let in-flight work finish briefly, then exit non-zero.

**Q: When would you move work to a worker thread instead of making it async?**

Only when the work is CPU-bound, such as parsing, resizing images or hashing. Marking CPU work
`async` changes nothing, because it still runs on the one thread. A worker costs startup time and
message copying, so it pays off only above a few milliseconds per task.

## What to Read Next

- [Chapter ?? — Promises, Async/Await and Errors](#ch-promises-async) — the language-level rules for rejections this chapter builds on
- [Chapter ?? — Node.js Performance, Streams and Scaling](#ch-nodejs-performance) — finding the blocking call, and using every core
- [Chapter ?? — REST Best Practices and Versioning](#ch-rest-best-practices) — the one error shape a client can parse
