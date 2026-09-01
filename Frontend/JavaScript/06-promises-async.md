---
title: Promises and Async/Await
part: 1
chapter: 0
slug: promises-async
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-31
tags: [frontend, javascript, promises, async]
in_book: true
---

# Promises and Async/Await {#ch-promises-async}

> Compose asynchronous work without nesting it, and handle the failure path as deliberately as the success path.

**In this chapter:** the three promise states · chaining and flattening · `async`/`await` · `all`, `allSettled`, `race` and `any` · the errors that get swallowed

## 💡 The Core Idea

A promise is a container for a value that does not exist yet. It has exactly three states — pending,
fulfilled, rejected — and once it settles it is **immutable**: the value or the reason is fixed
forever. `async`/`await` adds no capability; it is syntax that lets you write promise-consuming code
as ordinary sequential statements, with `try`/`catch` for the failure path.

## How It Works

```text
pending ──resolve(value)──> fulfilled  (settled, immutable)
   │
   └─────reject(reason)───> rejected   (settled, immutable)
```

| State         | Settled? | Read it with          |
| ------------- | -------- | --------------------- |
| **Pending**   | No       | —                     |
| **Fulfilled** | Yes      | `.then`, `await`      |
| **Rejected**  | Yes      | `.catch`, `try`/`catch` |

A promise is **eager**. The executor runs the moment you call `new Promise`, not when you attach a
handler — so constructing a promise starts the work whether anyone is listening or not.

```typescript
const p = new Promise<string>((resolve): void => {
  console.log('running now'); // logs immediately
  setTimeout((): void => resolve('done'), 1000);
});
```

### Chaining flattens

Every `.then` returns a **new** promise. Returning a promise from a handler adopts it rather than
nesting it, which is what turns the callback pyramid into a flat list. Returning a plain value wraps
it automatically.

```typescript
fetchUser(1)
  .then((user: User): Promise<Post[]> => fetchPosts(user.id)) // adopted, not nested
  .then((posts: Post[]): Post => posts[0]) // wrapped for you
  .catch((error: unknown): void => console.error(error)) // covers every step above
  .finally((): void => console.log('cleanup'));
```

One `.catch` at the end handles a rejection from any earlier step, which is the main thing callbacks
could not do.

### `async` and `await`

`async` wraps the return type in a promise. `await` unwraps one, and suspends **that function only**
— the event loop keeps running everything else.

```typescript
async function getFirstPost(): Promise<Post | undefined> {
  try {
    const user: User = await fetchUser(1);
    const posts: Post[] = await fetchPosts(user.id);
    return posts[0];
  } catch (error: unknown) {
    console.error(error);
    throw error; // re-throw, or the caller sees a successful undefined
  }
}
```

Every intermediate value gets a name and a type, `if` and `for` work normally, and stack traces stay
readable. That is the whole argument for `await` over `.then`.

### Combinators

| Combinator            | Settles when                        | On a rejection                  | Use for                              |
| --------------------- | ----------------------------------- | ------------------------------- | ------------------------------------ |
| `Promise.all`         | All fulfil                          | Rejects immediately (fail-fast) | Independent work you need all of     |
| `Promise.allSettled`  | All settle                          | Reports it per entry            | Work where partial failure is fine   |
| `Promise.race`        | The first to **settle**             | Rejects if that one rejected    | Timeouts                             |
| `Promise.any`         | The first to **fulfil**             | Rejects only if all reject      | Fallbacks across mirrors             |

```typescript
// `all` keeps tuple types, so destructuring is fully typed
const [user, posts] = await Promise.all([fetchUser(1), fetchPosts(1)]);

// `allSettled` returns a discriminated union — `status` narrows it
for (const result of await Promise.allSettled([fetchUser(1), fetchPosts(1)])) {
  if (result.status === 'fulfilled') console.log(result.value);
  else console.error(result.reason);
}
```

A timeout is `Promise.race([fetch(url), rejectAfter(ms)])` — but note that the loser is not cancelled.
The request still completes and its result is simply ignored, so use `AbortController` when the request
itself must stop.

## When to Use It

| Scenario                                         | Reach for                     | Why                                          |
| ------------------------------------------------ | ----------------------------- | -------------------------------------------- |
| Steps where each needs the previous result        | Sequential `await`            | The dependency is real; parallelism is impossible |
| Independent requests, all required                | `Promise.all`                 | Total time is the slowest, not the sum       |
| Dashboard panels that can fail independently      | `Promise.allSettled`          | One dead endpoint should not blank the page  |
| Hundreds of URLs                                  | `Promise.all` over fixed-size batches | Bounds concurrency without going serial |

Batching is the middle ground for the last row: loop over fixed-size slices and `Promise.all` each
slice, so concurrency is bounded without going fully serial.

## Common Mistakes

**❌ Awaiting independent work in sequence.** Three one-second requests take three seconds for no
reason:

```typescript
const user = await fetchUser(); // 1s
const posts = await fetchPosts(); // then 1s
const comments = await fetchComments(); // then 1s
```

**✅ Start them all, then await once:**

```typescript
const [user, posts, comments] = await Promise.all([fetchUser(), fetchPosts(), fetchComments()]);
```

**❌ Trusting `fetch` to reject on an HTTP error.** `fetch` rejects only on a network failure. A 500
resolves happily and its body sails through as if it were data:

```typescript
const response: Response = await fetch(url);
if (!response.ok) throw new Error(`HTTP ${response.status}`); // ✅ always check
```

**❌ Creating a promise and not returning it.** The caller receives `undefined`, and a rejection
becomes an unhandled rejection with no stack to trace it to.

**❌ Swallowing an error by catching and returning.** A `catch` that logs and returns `undefined`
reports success to the caller. Either handle it fully — including the caller's contract — or re-throw.

> ⚠️ `catch (error: unknown)` is correct: a `throw` can carry any value. Narrow with
> `error instanceof Error` before reading `.message`.

**A typed result is often better than throwing across a boundary:**

```typescript
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function safeFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response: Response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return { ok: true, data: (await response.json()) as T };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
```

Checking `.ok` narrows the union, so reading `.data` on the failure branch will not compile.

## 🔑 Key Takeaways

- A promise settles once and is then immutable; the executor runs eagerly on construction.
- `.then` always returns a new promise, and returning a promise from a handler adopts rather than nests it.
- `await` suspends only its own function, never the event loop.
- `Promise.all` is fail-fast; `allSettled` reports every outcome; `race` settles on the first result of either kind.
- `fetch` rejects only on network failure — check `response.ok` yourself.

## Interview Questions

**Q: What is the difference between `Promise.all` and `Promise.allSettled`?**

`all` rejects as soon as any input rejects, discarding the results that did succeed — right when you
need every result or none. `allSettled` never rejects; it resolves with a status-and-value record per
input, which suits independent work where partial success is useful, like a dashboard of panels.

**Q: Why is rejecting with a string a problem?**

The rejection value carries no stack trace, so you lose where it came from. It also breaks the
`error instanceof Error` narrowing every catch site relies on, which pushes `String(error)` fallbacks
through the codebase. Reject with an `Error` — or a subclass carrying structured fields.

**Q: When would you deliberately await in a loop rather than use `Promise.all`?**

When each iteration depends on the previous one, when the remote end rate-limits and parallel calls
would be rejected, when order of side effects matters, or when the collection is large enough that
`Promise.all` would open thousands of sockets at once. Batching is the middle ground.

## What to Read Next

- [Chapter ?? — The Event Loop](#ch-event-loop) — why a settled promise resumes before a `setTimeout`
- [Chapter ?? — Error Handling](#ch-javascript-error-handling) — custom errors and unhandled rejections
- [Chapter ?? — Closures](#ch-closures) — how a suspended function keeps its locals alive
