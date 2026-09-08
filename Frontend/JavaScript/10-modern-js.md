---
title: Modern JavaScript
part: 1
chapter: 0
slug: modern-javascript
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-08
tags: [javascript, es2024, es2025, optional-chaining, iterator-helpers, abortcontroller]
in_book: true
---

# Modern JavaScript {#ch-modern-javascript}

> Recognise the additions since ES2020 that replace a workaround you still see in review, and know what decides whether you can use them.

**In this chapter:** optional chaining and `??` · immutable array methods · reading from the end · iterator helpers and set operations · the async additions · what your baseline allows

## 💡 The Core Idea

JavaScript has shipped a small numbered release every year since ES2015. Nobody memorises the list,
and there is no point trying — but there is a specific, practical skill here: **recognising when a
piece of code is working around something the language now does.** Someone writes `[...items].sort()`
to avoid mutating an array, or `arr[arr.length - 1]`, or a `let resolve` outside a `new Promise`.
Each was correct advice once and is now a longer way to write something built in.

The counterweight is that "the language has it" and "you can use it" are different questions. What
decides the second is your **baseline** — the oldest browser you support and what your build target
transpiles or polyfills — and that is the part to be able to state.

## How It Works

### Optional chaining and nullish coalescing (ES2020)

```typescript
const city = user?.address?.city; // undefined instead of a TypeError
const rendered = user.getName?.(); // called only if the method exists
const port = config.port ?? 5432; // falls back only on null or undefined
```

`??` exists because `||` also replaces `0`, `''` and `false`, which silently turns a legitimate `0`
into a default. `?.` is the one to spend sparingly: where a value should never be absent, it converts
a loud `TypeError` into an `undefined` that fails somewhere unrelated three lines later.

### Immutable array methods (ES2023)

Four methods that return a new array instead of mutating the original. They exist because the
mutating versions were a persistent source of bugs in code that shares state.

```typescript
const scores: number[] = [3, 1, 2];

// ❌ Mutates in place; the copy exists only to protect the original
const sortedOld = [...scores].sort((a, b) => a - b);

// ✅ Returns a new array. The original is untouched by construction
const sorted = scores.toSorted((a, b) => a - b);
const reversed = scores.toReversed();
const patched = scores.with(0, 99); // [99, 1, 2] — replace one index
const spliced = scores.toSpliced(1, 1); // [3, 2] — remove without mutating
```

`with()` is the one worth remembering for list state, where the alternative is
`[...arr.slice(0, i), next, ...arr.slice(i + 1)]`. `toSorted` still sorts lexicographically without a
comparator — the method being new does not make the comparator optional.

### Reading from the end

```typescript
const rows: string[] = ["a", "b", "c"];

rows.at(-1); // "c" — ES2022, and works on strings too
rows[rows.length - 1]; // "c" — the version it replaces

const failures = [{ ok: false }, { ok: true }, { ok: false }];
failures.findLast((r) => !r.ok); // ES2023 — the last match, not the first
```

`at()` matters more than it looks in TypeScript, because it returns `T | undefined` while `arr[i]`
returns `T` unless `noUncheckedIndexedAccess` is on. So `at()` makes the language admit what was
always true — the index may be out of range — and the compiler then makes you handle it.

### Iterator helpers (ES2025) and set operations

Iterator helpers put the array methods on **any** iterator, and they are lazy — nothing runs until
something pulls a value.

```typescript
function* readLines(file: string): Generator<string> {
  /* yields one line at a time */
}

// Nothing is read from disk beyond the first ten matching lines.
const firstTen: string[] = readLines("app.log")
  .filter((line: string) => line.includes("ERROR"))
  .take(10)
  .toArray();
```

The point is not brevity. The array version materialises every line, filters all of them, then
discards all but ten. Laziness is what makes this viable over a large or infinite source, and `take`
is what terminates it.

```typescript
const admins = new Set(["ada", "grace"]);
const active = new Set(["grace", "alan"]);

admins.intersection(active); // Set { "grace" }
admins.difference(active); // Set { "ada" }, and `isSubsetOf` answers the containment question
```

Set operations replace the `[...a].filter(x => b.has(x))` idiom, and they are `O(n)` on the smaller
set rather than on the array you spread.

### The async additions

**Top-level `await`** (ES2022, modules only) removes the immediately-invoked async wrapper, at the cost
that importing the module blocks on the network and every module downstream of it waits — so keep it
for genuine startup configuration. **`Promise.withResolvers()`** (ES2024) replaces the pattern where
the resolve function had to escape the constructor, and the **`AbortSignal`** helpers turn
cancellation from bookkeeping into one line:

```typescript
// ❌ The old shape: a variable assigned inside a callback, awkwardly typed
let resolve!: (v: string) => void;
const promise = new Promise<string>((r) => (resolve = r));

// ✅ One call, all three, properly typed
const { promise, resolve, reject } = Promise.withResolvers<string>();

// A five-second deadline with no timer to clear, combined with the caller's cancellation
const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]);
const res = await fetch(url, { signal });
```

`AbortSignal.any` is what you want in a component: one signal that combines the caller's cancellation
with a deadline, so the request cannot outlive either.

### `Error.cause` (ES2022)

```typescript
try {
  await saveOrder(order);
} catch (err) {
  // The original error is preserved rather than flattened into a string
  throw new Error(`Could not save order ${order.id}`, { cause: err });
}
```

This is the fix for re-throwing with a helpful message and losing the stack that explains the failure.
Reporters read `cause` and render the chain — see [Chapter ?? — Error Handling](#ch-javascript-error-handling).

### What your baseline allows

> ⚠️ **Moving target:** the availability of everything above depends on the oldest engine you support,
> and that moves every quarter. The durable principle is that a language feature is usable when it is
> in your baseline **or** cheaply transpilable, and that syntax and library additions differ: a
> transpiler can rewrite syntax, but a new method needs a polyfill and adds bytes.

| Kind of addition | Example | How a build handles it |
| ---------------- | ------- | ---------------------- |
| **Syntax** | Top-level `await`, optional chaining | Transpiled down; no runtime cost |
| **Library method** | `toSorted`, iterator helpers | Needs a polyfill, which ships bytes |
| **Runtime capability** | `structuredClone`, `AbortSignal.timeout` | Cannot be polyfilled faithfully; feature-detect |

That table is the real answer to "can we use this yet". Check availability across your supported
engines first, because a polyfill is a permanent line in the bundle nobody remembers to remove.

## When to Use It

| Situation | Reach for | Instead of |
| --------- | --------- | ---------- |
| A default that must survive `0` or `''` | `??` | `\|\|`, which treats them as absent |
| Sorting without mutating shared state | `toSorted()` | `[...arr].sort()` |
| Replacing one item in a list | `with(i, next)` | Two `slice` calls and a spread |
| The last element or last match | `at(-1)`, `findLast()` | Index arithmetic |
| Filtering a large or infinite sequence | Iterator helpers | Materialising it as an array first |
| A request that must not outlive a deadline | `AbortSignal.timeout()` | A `setTimeout` plus a manual `abort()` |

## Common Mistakes

❌ **Using `||` for a default on a number or a string.** A legitimate `0` or `''` is replaced.
✅ `??`, which falls back only on `null` and `undefined`.

❌ **Reaching for `?.` everywhere.** `a?.b?.c?.d` hides a broken assumption and defers the failure.
✅ Use it where absence is genuinely expected — an optional API field, a query that may not match.

❌ **Top-level `await` in a widely imported module.** Every importer now waits on that network call.
✅ Keep it for genuine startup configuration, and load the rest lazily.

❌ **Re-throwing without `cause`.** The message survives and the stack that explains it does not.
✅ `new Error(message, { cause: err })`, and let the reporter render the chain.

## 🔑 Key Takeaways

- The yearly cadence means the skill is recognising code that works around something now built in.
- `??` falls back on `null` and `undefined` only, so a legitimate `0` or `''` survives it.
- ES2023's `toSorted`, `toReversed`, `with` and `toSpliced` return new arrays, which shared state needed.
- Iterator helpers are lazy, which is the whole reason to prefer them over an array.
- Whether you can use a feature depends on your baseline, and syntax transpiles while library methods need bytes.

## Interview Questions

**Q: Why did the language add `toSorted` when `sort` already existed?**

Because `sort` mutates, and the workaround — copying the array purely to protect the original — is
easy to forget in exactly the places it matters, like state shared between components. `toSorted`
makes the non-mutating version the shorter one to write, which is the only reliable way to change a
habit. The comparator rules are unchanged.

**Q: What do iterator helpers give you that array methods do not?**

Laziness, and therefore the ability to work over a source you would not want to materialise — a large
file read line by line, a paginated API, an infinite generator. `filter().take(10)` on an iterator
reads only as far as the tenth match; the array version builds the whole collection and discards
nearly all of it. On a small in-memory array there is no real difference.

**Q: When is optional chaining the wrong tool?**

When the value should never be absent. `?.` turns a violated invariant into an `undefined` that
propagates and fails somewhere unrelated, which is harder to debug than the original `TypeError`.
Reserve it for genuinely optional data — an API field that may be missing, a DOM query that may not
match.

## What to Read Next

- [Chapter ?? — Array and Object Methods](#ch-array-object-methods) — where grouping and the immutable methods sit against `reduce`
- [Chapter ?? — Promises and Async/Await](#ch-promises-async) — the cancellation and concurrency model these additions extend
- [Chapter ?? — Dates, Numbers and Currency](#ch-date-number-formatting) — `Intl` and the `Temporal` replacement for `Date`
