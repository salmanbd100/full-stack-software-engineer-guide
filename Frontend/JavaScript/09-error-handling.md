---
title: Error Handling
part: 1
chapter: 0
slug: javascript-error-handling
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, javascript, errors, resilience]
in_book: true
---

# Error Handling {#ch-javascript-error-handling}

> Fail in a way that is recoverable, loggable and honest — instead of swallowing the problem.

**In this chapter:** `throw` and custom error classes · `try`/`catch`/`finally` · errors across `async` boundaries · unhandled rejections · what to log and what to show

## 💡 The Core Idea

There are two kinds of failure and they want different mechanisms. An **expected** failure — a form
field is empty, a record is missing — is part of the function's contract, so return it in the type
and make the caller handle it. An **exceptional** failure — the database is gone, an invariant is
broken — is not something the caller can reasonably be asked to check on every line, so throw. Most
bad error handling is one of those two treated as the other.

## How It Works

| Approach                 | Suits                              | Cost                                        |
| ------------------------ | ---------------------------------- | ------------------------------------------- |
| `throw`                  | Broken invariants, unrecoverable state | Invisible in the signature; easy to forget to catch |
| Return a typed result    | Failures the caller must handle     | Every call site does the check              |
| Promise rejection        | The async form of `throw`           | Silent if nobody attaches a handler         |

**A typed result makes an expected failure impossible to ignore:**

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

const result = await loadUser(1);
if (result.ok) console.log(result.data); // `data` exists only on this branch
else console.error(result.error);
```

Checking `.ok` narrows the union, so reading `.data` on the failure branch will not compile — the
compiler enforces what a comment would only ask for.

### `try` / `catch` / `finally`

`finally` runs on every path out of the block, including a `return` inside `try` and a re-throw
inside `catch`. That makes it the right place for cleanup — closing a connection, clearing a loading
flag — and the wrong place for anything that can itself throw.

```typescript
try {
  return await save(record);
} catch (error: unknown) {
  // `error: unknown` is correct — a `throw` can carry any value at all
  if (error instanceof ValidationError) return null;
  throw error; // not ours to handle
} finally {
  setSaving(false); // runs on all three paths above
}
```

### Built-in error types

| Type             | Means                              | Typical source                 |
| ---------------- | ---------------------------------- | ------------------------------ |
| `TypeError`      | A value of the wrong type          | Reading a property of `null`   |
| `ReferenceError` | A name that does not exist         | A typo; the temporal dead zone |
| `SyntaxError`    | Unparseable input                  | `JSON.parse` on malformed text |
| `RangeError`     | A number outside its allowed range | `new Array(-1)`                |

### Custom error classes

A custom class is what lets a caller distinguish "the input was wrong" from "the network was down"
without matching on message strings.

```typescript
class APIError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = 'APIError';
    // Needed under an ES5 target, where extending a built-in breaks the
    // prototype chain and `instanceof` stops working
    Object.setPrototypeOf(this, APIError.prototype);
  }

  // `JSON.stringify(new Error('x'))` is '{}' — name, message and stack are
  // not enumerable. Define toJSON or the log line arrives empty
  toJSON(): Record<string, unknown> {
    return { name: this.name, message: this.message, statusCode: this.statusCode };
  }
}
```

Two details there are worth remembering: `instanceof` needs the explicit `setPrototypeOf` under an
ES5 target, and errors do not serialise without help. Both bite in production, not in development.

### Across an async boundary

`try`/`catch` around an `await` catches a rejection exactly as it catches a synchronous throw. It does
**not** catch a rejection from a promise you never awaited:

```typescript
try {
  void save(record); // ❌ not awaited — the rejection escapes this block
  await save(record); // ✅ caught
} catch (error: unknown) {}
```

An escaped rejection becomes an **unhandled rejection**: `window.onunhandledrejection` in the browser,
a process-level event in Node.js (and since Node 15, a crash by default). Wire both to your monitoring
— they are where the errors you did not plan for surface.

When one failure should not lose the others, `Promise.allSettled` beats `Promise.all`; filter the
results with a `r is PromiseFulfilledResult<User>` predicate so `.value` narrows without a cast.

### The last line of defence in the UI

In React 19 an error boundary is still the one thing with no hooks equivalent — it has to be a class.
Two static-and-instance halves do the work: `getDerivedStateFromError` runs during render and returns
the next state with no side effects, and `componentDidCatch` runs after commit, which is where logging
belongs.

It catches errors thrown during render in the tree below it. It does **not** catch errors in event
handlers, in `setTimeout` callbacks, or in async code — those need their own handling.

## When to Use It

| Scenario                                       | Reach for                       | Why                                              |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| Invalid user input at a boundary                | A typed result, or a validation library | Expected; the caller must render a message |
| A broken invariant deep in the code             | `throw`                         | No sensible local recovery                       |
| A transient network failure                     | Retry with backoff, then throw   | The failure is often not permanent               |
| Several independent requests, partial success ok | `Promise.allSettled`           | One dead endpoint should not blank the page      |
| A render-time crash anywhere in a subtree       | Error boundary                  | Prevents one component taking down the app       |

## Common Mistakes

**❌ Catching and returning nothing.** The caller is told the operation succeeded:

```typescript
try {
  await save(record);
} catch (error: unknown) {
  console.error(error); // ❌ the caller carries on as if it worked
}
```

**✅ Either re-throw, or make the failure part of the return type** — `Promise<Result<T>>` or
`Promise<T | null>`. The signature has to tell the truth.

**❌ Throwing a string.** `throw 'failed'` has no stack trace and breaks `error instanceof Error` at
every catch site. Throw an `Error`.

**❌ `catch (error: any)` to reach `.message`.** Narrow instead:
`error instanceof Error ? error.message : String(error)`.

**❌ Assuming a non-2xx `fetch` rejects.** It does not — only a network failure does. Check
`response.ok` yourself or a 500 body becomes your data.

> ⚠️ Never `await` inside `finally` unless you are certain it cannot reject. A throw from `finally`
> replaces the original error, and you lose the failure you were actually trying to report.

## 🔑 Key Takeaways

- Throw for broken invariants; put expected failures in the return type so the caller cannot skip them.
- `catch (error: unknown)` is correct, because a `throw` can carry any value — narrow before use.
- A promise you do not await escapes the surrounding `try`, and becomes an unhandled rejection.
- Errors do not serialise: add `toJSON`, or your logs record `{}`.
- Error boundaries catch render errors only, never event handlers or async code.

## Interview Questions

**Q: When would you return an error instead of throwing one?**

When the failure is an expected outcome the caller must handle — invalid input, a missing record, a
rejected payment. Encoding it in the return type makes it visible in the signature and checkable by
the compiler. Throwing suits genuinely exceptional cases, where every caller adding a check would be
noise.

**Q: How do you handle errors in async code?**

`try`/`catch` around `await`, which catches rejections the same way it catches synchronous throws. The
trap is a promise created but not awaited — its rejection escapes the block entirely. For independent
work use `Promise.allSettled` so one failure does not discard the successes, and wire up
`unhandledrejection` as a backstop.

**Q: Why is `catch (e) { console.error(e); }` usually a bug?**

Because it converts a failure into a silent success. Control flow continues, the caller gets
`undefined` where it expected a value, and the real symptom appears somewhere unrelated. A catch block
should recover fully, translate the error into a value the signature declares, or re-throw.

## What to Read Next

- [Chapter ?? — Promises and Async/Await](#ch-promises-async) — where rejections come from
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — stopping bad input before it becomes an error
- [Chapter ?? — Monitoring Fundamentals](#ch-monitoring-fundamentals) — what to do with the errors you log
