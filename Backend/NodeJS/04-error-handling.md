---
title: Error Handling in Node
part: 5
chapter: 0
slug: nodejs-error-handling
level: intermediate
reading_time: 9
updated: 2026-09-01
tags: [nodejs, errors, express, resilience]
in_book: true
---

# Error Handling in Node {#ch-nodejs-error-handling}

> Draw the line between a failure you answer and a failure you restart for, and put every error on one path.

**In this chapter:** operational against programmer errors · a typed error base · one Express handler · process-level handlers · retries that do not amplify

## 💡 The Core Idea

Every error in a Node service is one of two kinds, and the whole design follows from telling
them apart.

An **operational error** is an expected outcome of talking to the world: the row is not there,
the token expired, the payment provider timed out. You handle it, you answer the request, the
process stays up.

A **programmer error** is a bug: reading a property of `undefined`, a broken invariant, a
mistyped config key. There is no sensible recovery, because you no longer know what state the
process is in. The correct response is to log it with full context and let the process die so the
supervisor replaces it.

Treating the second kind as the first is how a service ends up serving corrupted responses for
hours instead of restarting in two seconds.

## How It Works

### A typed error base

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

export class NotFoundError extends AppError {
  constructor(resource: string, cause?: unknown) {
    super(`${resource} not found`, 404, 'not_found', true, { cause });
  }
}

export class UpstreamError extends AppError {
  // expose: false — the client gets a generic message, the log gets the detail.
  constructor(service: string, cause?: unknown) {
    super(`${service} unavailable`, 502, 'upstream_unavailable', false, { cause });
  }
}
```

Two fields carry the weight. `status` and `code` let one handler answer every error without a
chain of `instanceof` checks. `expose` decides whether the message is safe to send — an
`UpstreamError` message may quote a connection string, and a 500 must never leak it.

### Preserve the cause

`cause` is the standard way to keep the original error without swallowing it.

```typescript
try {
  await stripe.charges.create(payload);
} catch (err) {
  throw new UpstreamError('stripe', err); // Original stack is still reachable.
}
```

Log the whole chain, not just the top error — walk `err.cause` until it is no longer an
`Error` and record each `name: message` pair. A 502 whose cause is `ECONNREFUSED` is a different
incident from one whose cause is a 401.

### Narrowing `unknown`

Under `useUnknownInCatchVariables` — on by default with `strict` — a `catch` binding is
`unknown`. Narrow it once, in a helper, rather than casting at every site.

```typescript
function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  // A rejected promise can carry a string, a number, or nothing at all.
  return new Error(typeof value === 'string' ? value : JSON.stringify(value));
}
```

## One Handler for Everything

Express funnels every error into a four-argument middleware. In Express 5, a rejected promise
from an `async` handler reaches it automatically; in Express 4 it does not, and an unwrapped
`async` handler drops the request on the floor.

```typescript
app.use((err: unknown, req: Request, res: Response, _next: NextFunction): void => {
  const e = toError(err);
  const app = e instanceof AppError ? e : undefined;
  const status = app?.status ?? 500;

  // One log line per failed request, with the correlation id the client can quote.
  req.log.error({ err: chain(e), status, requestId: req.id }, 'request failed');

  res.status(status).json({
    error: {
      code: app?.code ?? 'internal_error',
      message: app?.expose ? e.message : 'Internal server error',
      requestId: req.id,
    },
  });
});
```

Three rules make this work:

- **Register it last**, after every route and every other middleware.
- **Never send a response twice** — check `res.headersSent` if any earlier code might have
  started streaming.
- **Default to 500 and a generic message.** An unrecognised error is a bug, and bugs leak.

## Process-Level Handlers

```typescript
process.on('unhandledRejection', (reason: unknown): void => {
  logger.fatal({ err: chain(reason) }, 'unhandled rejection');
  throw reason; // Converts it into an uncaught exception; one exit path.
});

process.on('uncaughtException', (err: Error): void => {
  logger.fatal({ err: chain(err) }, 'uncaught exception');
  // Stop accepting work, let in-flight requests finish, then exit non-zero.
  server.close((): void => process.exit(1));
  setTimeout((): void => process.exit(1), 10_000).unref();
});
```

> ⚠️ These handlers are for **logging and exiting**, not for recovery. Continuing after an
> uncaught exception leaves half-applied state — an open transaction, a released lock — and the
> next request sees it.

The same shape covers `SIGTERM`, which is what an orchestrator sends before it stops a container.
Close the server, drain the connection pool, exit 0.

## Retries That Do Not Amplify

A retry is a load multiplier. Three rules keep it from turning a slow dependency into an outage:

1. **Retry only idempotent, transient failures** — timeouts, connection resets, 429, 503. Never
   a 400 or a 409.
2. **Exponential backoff with jitter**, so clients that failed together do not return together.
3. **A cap on attempts and a circuit breaker**, so a dead dependency is not hammered.

```typescript
async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i === attempts - 1 || !isTransient(err)) throw err;
      const base = 2 ** i * 100;
      await sleep(base + Math.random() * base); // Full jitter.
    }
  }
  throw new Error('unreachable');
}
```

## Common Mistakes

**❌ `catch` that logs and continues**

```typescript
try { await saveOrder(o); } catch (e) { logger.error(e); } // Client gets 200
```

**✅ Translate and rethrow**

```typescript
try { await saveOrder(o); } catch (e) { throw new UpstreamError('orders', e); }
```

**❌ Sending `err.message` on a 500.** It is written for you, not for the caller, and it
regularly contains a hostname, a query, or a path.

**❌ `process.exit()` immediately in a signal handler.** In-flight requests are cut mid-response.
Close the server first, with a timeout as the backstop.

## 🔑 Key Takeaways

- Operational errors are answered; programmer errors are logged and the process restarts.
- One typed error base with `status`, `code` and `expose` removes error handling from every route.
- Use `cause` to keep the original error, and log the whole chain.
- Process-level handlers exist to log and exit, never to recover.
- Retries need idempotency, jittered backoff, and a cap, or they amplify the outage.

## Interview Questions

**Q: Should you keep the process alive after an `uncaughtException`?**

No. By definition you do not know what state the process is in — a transaction may be open, a
lock held, a cache half-written. Log with full context, stop accepting new connections, let
in-flight work finish briefly, and exit non-zero so the supervisor starts a clean process.

**Q: How do you stop one error handler from leaking internals?**

Decide exposure at throw time, not at response time. Every error carries an `expose` flag; the
handler sends the message only when it is true and a fixed generic string otherwise. Unrecognised
errors default to 500 and generic, so a new throw site is safe by default rather than by review.

**Q: Why add jitter to retry backoff?**

Because without it every client that failed at the same moment retries at the same moment. The
dependency sees a synchronised wave of traffic that repeats, decaying slowly, which is exactly
the shape that keeps a recovering service down. Jitter spreads the retries across the window.

## What to Read Next

- [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) — the one error shape a client can parse
- [Chapter ?? — The Event Loop and Async Node](#ch-event-loop-async) — where an unhandled rejection comes from
