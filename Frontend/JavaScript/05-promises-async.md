---
title: Promises, Async/Await and Errors
part: 1
chapter: 6
slug: promises-async
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-24
tags: [frontend, javascript, promises, async, errors]
in_book: true
---

# Promises, Async/Await and Errors {#ch-promises-async}

> Compose asynchronous work without nesting it, and handle the failure path as deliberately as the success path.

**In this chapter:** promise states and chaining · `async`/`await` · `all`, `allSettled`, `race` and `any` · throw or return a typed result · custom errors and unhandled rejections

## 💡 The Core Idea

A promise is a container for a value that does not exist yet. It has three states — pending,
fulfilled, rejected — and once it settles it is **immutable**. `async`/`await` adds no new power. It
lets you write promise code as ordinary statements, with `try`/`catch` for the failure path.

The failure path is where the real design sits. An **expected** failure — an empty form field, a
missing record — is part of the function's contract, so return it in the type. An **exceptional**
failure — the database is gone, an invariant is broken — should be thrown. Most bad error handling
treats one of those as the other.

## How It Works

```text
pending ──resolve(value)──> fulfilled  (settled, immutable)
   │
   └─────reject(reason)───> rejected   (settled, immutable)
```

A promise is **eager**. The executor runs the moment you call `new Promise`, not when you attach a
handler. Constructing a promise starts the work whether anyone is listening or not.

### Chaining flattens

Every `.then` returns a **new** promise. Returning a promise from a handler adopts it instead of
nesting it, which turns the callback pyramid into a flat list. One `.catch` at the end handles a
rejection from any earlier step.

```typescript
fetchUser(1)
  .then((user: User): Promise<Post[]> => fetchPosts(user.id)) // adopted, not nested
  .then((posts: Post[]): Post => posts[0]) // a plain value is wrapped for you
  .catch((error: unknown): void => console.error(error)) // covers every step above
  .finally((): void => console.log('cleanup'));
```

### `async` and `await`

`async` wraps the return value in a promise. `await` unwraps one, and suspends **that function only**
— the event loop keeps running everything else. `finally` runs on every exit path, which makes it the
place for cleanup.

```typescript
async function saveRecord(record: Draft): Promise<Saved | null> {
  try {
    return await save(record);
  } catch (error: unknown) {
    // `unknown` is correct — a `throw` can carry any value
    if (error instanceof ValidationError) return null; // expected: handled here
    throw error; // not ours to handle
  } finally {
    setSaving(false); // runs on all three paths above
  }
}
```

### Combinators

| Combinator           | Settles when              | On a rejection                  | Use for                            |
| -------------------- | ------------------------- | ------------------------------- | ---------------------------------- |
| `Promise.all`        | All fulfil                | Rejects immediately (fail-fast) | Independent work you need all of   |
| `Promise.allSettled` | All settle                | Reports it per entry            | Work where partial failure is fine |
| `Promise.race`       | The first to **settle**   | Rejects if that one rejected    | Timeouts                           |
| `Promise.any`        | The first to **fulfil**   | Rejects only if all reject      | Fallbacks across mirrors           |

```typescript
// `all` keeps tuple types, so destructuring is fully typed
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts(1)]);

// `allSettled` returns a discriminated union — `status` narrows it
for (const result of await Promise.allSettled([fetchUser(1), fetchPosts(1)])) {
  if (result.status === 'fulfilled') console.log(result.value);
  else console.error(result.reason);
}
```

`race` does not cancel the loser. For a request that must actually stop, pass a signal:
`AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)])` combines the caller's cancellation
with a deadline in one line.

### Throw, or return a typed result

| Approach              | Suits                                  | Cost                                              |
| --------------------- | -------------------------------------- | ------------------------------------------------- |
| `throw` / reject      | Broken invariants, unrecoverable state | Invisible in the signature; easy to forget to catch |
| Return a typed result | Failures the caller must handle        | Every call site does the check                    |

**A typed result makes an expected failure impossible to ignore:**

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response: Response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`); // fetch does not reject on a 500
    return { ok: true, data: (await response.json()) as T };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
```

Checking `.ok` narrows the union, so reading `.data` on the failure branch will not compile.

### Custom errors, and keeping the cause

A custom class lets a caller tell "the input was wrong" from "the network was down" without matching
on message strings. `cause` (ES2022) keeps the original error when you re-throw with a better message.

```typescript
class APIError extends Error {
  constructor(message: string, readonly statusCode: number, options?: ErrorOptions) {
    super(message, options);
    this.name = 'APIError';
  }
}

try {
  await saveOrder(order);
} catch (err: unknown) {
  throw new APIError(`Could not save order ${order.id}`, 500, { cause: err }); // the stack survives
}
```

`JSON.stringify(new Error('x'))` gives `'{}'`, because `name`, `message` and `stack` are not
enumerable. Add a `toJSON` method, or your logs record nothing.

### Unhandled rejections

`try`/`catch` around an `await` catches a rejection like a synchronous throw. It does **not** catch a
rejection from a promise you never awaited. That rejection becomes an **unhandled rejection**:
`window.onunhandledrejection` in the browser, a process event in Node.js — where it crashes the process
by default. Wire both to your monitoring.

## When to Use It

| Scenario                                      | Reach for                         | Why                                               |
| --------------------------------------------- | --------------------------------- | ------------------------------------------------- |
| Steps where each needs the previous result    | Sequential `await`                | The dependency is real                            |
| Independent requests, all required            | `Promise.all`                     | Total time is the slowest, not the sum            |
| Dashboard panels that can fail independently  | `Promise.allSettled`              | One dead endpoint should not blank the page       |
| Hundreds of URLs                              | `Promise.all` over fixed batches  | Bounds concurrency without going serial           |
| Invalid user input at a boundary              | A typed result                    | Expected; the caller must render a message        |
| A broken invariant deep in the code           | `throw`                           | No sensible local recovery                        |

## Common Mistakes

**❌ Awaiting independent work in sequence.** Three one-second requests take three seconds:

```typescript
const user = await fetchUser(); // 1s
const posts = await fetchPosts(); // then 1s
```

**✅ Start them all, then await once:**

```typescript
const [user, posts] = await Promise.all([fetchUser(), fetchPosts()]);
```

**❌ Catching and returning nothing.** A `catch` that logs and carries on tells the caller the work
succeeded. Recover fully, turn the failure into a value the signature declares, or re-throw.

**❌ Trusting `fetch` to reject on an HTTP error.** It rejects only on a network failure. Check
`response.ok` yourself, or a 500 body becomes your data.

**❌ Throwing or rejecting with a string.** It has no stack trace and breaks `error instanceof Error`
at every catch site. Throw an `Error`.

> ⚠️ Never `await` inside `finally` unless you are certain it cannot reject. A throw from `finally`
> replaces the original error, and you lose the failure you were trying to report.

## 🔑 Key Takeaways

- A promise settles once and is then immutable; the executor runs eagerly on construction.
- `.then` always returns a new promise, and `await` suspends only its own function, never the event loop.
- `Promise.all` is fail-fast; `allSettled` reports every outcome; `race` does not cancel the loser.
- Throw for broken invariants, and put expected failures in the return type so the caller cannot skip them.
- A promise you do not await escapes the surrounding `try` and becomes an unhandled rejection.

## Interview Questions

**Q: What is the difference between `Promise.all` and `Promise.allSettled`?**

`all` rejects as soon as any input rejects, and discards the results that did succeed. Use it when you
need every result or none. `allSettled` never rejects. It resolves with a status record per input,
which suits independent work where partial success is useful, like a dashboard.

**Q: When would you return an error instead of throwing one?**

When the failure is an expected outcome the caller must handle — invalid input, a missing record, a
declined payment. A return type makes it visible in the signature and checked by the compiler.
Throwing suits truly exceptional cases, where a check at every call site would be noise.

**Q: Why is `catch (e) { console.error(e); }` usually a bug?**

It turns a failure into a silent success. The caller gets `undefined` where it expected a value, and
the real symptom appears somewhere unrelated. A catch block should recover, translate, or re-throw.

**Q: When would you deliberately await in a loop rather than use `Promise.all`?**

When each iteration depends on the previous one, when the remote end rate-limits, when the order of
side effects matters, or when the list is large enough to open thousands of sockets at once. Batching
is the middle ground.

## What to Read Next

- [Chapter ?? — The Event Loop](#ch-event-loop) — why a settled promise resumes before a `setTimeout`
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — stopping bad input before it becomes an error
- [Chapter ?? — Monitoring Fundamentals](#ch-monitoring-fundamentals) — what to do with the errors you log
