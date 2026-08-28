---
title: Node.js Error Handling
part: 5
chapter: 0
slug: nodejs-error-handling
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [backend, nodejs, error, handling]
in_book: true
---

# Node.js Error Handling {#ch-node-error-handling}

> Separate an operational failure from a programmer bug, and treat each one differently.

**In this chapter:** operational vs programmer errors · a typed error base · preserving `cause` · narrowing `unknown` · one Express handler · process-level handlers

## 💡 The Distinction Everything Hangs On

There are exactly two kinds of error, and they need opposite responses.

| | **Operational** | **Programmer** |
| --- | --- | --- |
| **What** | The world misbehaved | Your code is wrong |
| **Examples** | Timeout, 404, bad input, DB down | `undefined.name`, wrong argument type |
| **Response** | Handle it — retry, degrade, return 4xx | **Let it crash**, then fix it |

> Catching a bug to keep the process alive leaves you running on corrupted state. Catching a timeout and retrying is correct. Telling them apart is the whole skill.

---

## A Typed Error Base

Tag operational errors so your handler can recognise them.

```typescript
export class AppError extends Error {
  readonly isOperational = true;

  constructor(
    message: string,
    readonly statusCode: number,
    readonly code: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = new.target.name;
    Error.captureStackTrace(this, new.target);  // hide the constructor frame
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404, "NOT_FOUND");
  }
}

export class ValidationError extends AppError {
  constructor(message: string, readonly fields: Record<string, string>) {
    super(message, 400, "VALIDATION_FAILED");
  }
}
```

Anything without `isOperational` is a bug, by definition.

⚠️ **Always subclass `Error`.** Throwing a string or plain object loses the stack trace, and `instanceof` checks stop working.

---

## Preserve the Cause

When you wrap an error, keep the original. The `cause` option is standard and `console.error` prints the whole chain.

```typescript
try {
  await chargeCard(order);
} catch (err) {
  throw new AppError("Payment failed", 502, "PAYMENT_FAILED", { cause: err });
}
```

❌ Without it, you get "Payment failed" and no idea whether it was DNS, a timeout, or a declined card.

---

## Narrowing `unknown`

In TypeScript, `catch` gives you `unknown`. Narrow it before use:

```typescript
function toError(value: unknown): Error {
  if (value instanceof Error) return value;
  return new Error(String(value));
}

try {
  await risky();
} catch (err: unknown) {
  const error = toError(err);
  logger.error({ err: error }, "risky() failed");
}
```

---

## Express: One Handler for Everything

An Express error handler is any middleware with **four** parameters. Register it last.

```typescript
import type { Request, Response, NextFunction } from "express";

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const isOperational = err instanceof AppError;
  const status = isOperational ? err.statusCode : 500;

  logger.error({ err, path: req.path, requestId: req.id }, "request failed");

  res.status(status).json({
    error: {
      // 🔴 Never leak an internal message or stack to the client
      message: isOperational ? err.message : "Internal server error",
      code: isOperational ? err.code : "INTERNAL",
      requestId: req.id,
    },
  });
}
```

> Return a `requestId` on every error. Users can quote it and you can find the exact log line — the cheapest support win available.

### Async routes

Express 4 does **not** catch rejected promises. A thrown error in an `async` handler hangs the request until it times out.

```typescript
// ❌ Express 4 — this rejection is never seen; the client waits forever
app.get("/users", async (req, res) => {
  res.json(await db.users.findAll());
});

// ✅ Wrap it
const wrap = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/users", wrap(async (req, res) => {
  res.json(await db.users.findAll());
}));
```

✨ **Express 5 fixes this** — rejected promises are forwarded to `next()` automatically, so the wrapper is no longer needed.

---

## Process-Level Handlers

These are for **logging and clean shutdown**, not for staying alive.

```typescript
process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal({ err: reason }, "unhandled rejection");
  throw reason;                      // escalate to uncaughtException
});

process.on("uncaughtException", (err: Error) => {
  logger.fatal({ err }, "uncaught exception");
  shutdown(1);                       // log, drain, exit
});
```

🔴 **Never keep serving after an `uncaughtException`.** The stack unwound at an arbitrary point — locks may be held, transactions half-applied, memory inconsistent. Log it, close connections, exit, and let your supervisor restart a clean process.

> "Let it crash" only works if something restarts you. Run under systemd, Kubernetes, or [PM2](./08-clustering.md).

### Graceful shutdown

```typescript
async function shutdown(code: number): Promise<void> {
  server.close();                              // stop accepting new connections
  setTimeout(() => process.exit(code), 10_000).unref();  // hard cap
  await Promise.allSettled([db.close(), redis.quit()]);
  process.exit(code);
}

process.on("SIGTERM", () => shutdown(0));
```

⚠️ The timeout matters. Without it, one stuck connection blocks the exit and your orchestrator sends `SIGKILL` mid-write.

---

## Retries

Retry **transient** failures only — timeouts, 429, 5xx, connection resets. Never retry a 400 or a validation error; it will fail identically every time.

```typescript
async function retry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err)) throw err;              // fail fast on real errors

      const backoff = 2 ** i * 100;
      const jitter = Math.random() * 100;            // spread the retry storm
      await new Promise((r) => setTimeout(r, backoff + jitter));
    }
  }
  throw lastError;
}
```

✨ **Jitter is not optional.** Without it, every client that failed during an outage retries at the same instant and knocks the service over again as it recovers.

⚠️ **Only retry idempotent operations.** Retrying `POST /charge` after a timeout may charge twice — the first call might have succeeded. Send an idempotency key.

---

## Interview Q&A

**Q: Should you catch every error?**
A: No. Catch operational errors you can do something about. Let programmer errors crash — a caught `TypeError` leaves the process in an unknown state, and the bug then shows up somewhere far from its cause. The test is simple: if you can't take a meaningful action in the catch block, don't write one.

**Q: What happens to an unhandled promise rejection?**
A: Since Node 15 it terminates the process, same as an uncaught exception. Before that it was a warning, which hid real bugs. Register a handler to log the reason before you exit, but don't use it to keep running.

**Q: Why does my async Express route hang instead of returning 500?**
A: Express 4 only forwards errors passed to `next()` or thrown synchronously. A rejected promise from an `async` handler is invisible to it, so the response is never sent and the request hangs until timeout. Wrap handlers, or move to Express 5, which handles it natively.

**Q: How do you handle errors across microservices?**
A: Propagate a correlation ID through every hop and include it in logs and error responses, so one identifier reconstructs the whole request path. Return stable machine-readable error codes rather than prose. Add timeouts and a circuit breaker on every outbound call — without them one slow dependency exhausts your connection pool and the failure spreads.

**Q: When is it wrong to retry?**
A: When the operation isn't idempotent, or when the error is permanent. Retrying a 400 wastes time and hides the bug. Retrying a non-idempotent `POST` risks duplicate side effects — use an idempotency key so the server can deduplicate.

---

## Best Practices

✅ Subclass `Error`; mark operational errors with a flag
✅ Pass `{ cause }` when wrapping so the root cause survives
✅ Centralise formatting in one Express error handler, registered last
✅ Return a request ID in every error response
✅ Exponential backoff **with jitter**, transient errors only
✅ Handle `SIGTERM` and drain connections with a hard timeout
❌ Don't swallow errors in an empty `catch`
❌ Don't leak stack traces or internal messages to clients
❌ Don't keep serving traffic after an `uncaughtException`
❌ Don't retry non-idempotent operations without an idempotency key

---

[← Previous: Module System](./03-module-system.md) | [Next: Performance →](./05-performance.md)
