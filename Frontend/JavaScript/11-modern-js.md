---
title: Modern JavaScript
part: 1
chapter: 0
slug: modern-javascript
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-08
tags: [javascript, es2023, es2024, es2025, iterator-helpers, abortcontroller]
in_book: true
---

# Modern JavaScript {#ch-modern-javascript}

> Recognise the additions since ES2020 that replace a workaround you still see in review, and know what decides whether you can use them.

**In this chapter:** why the yearly cadence changes how you learn the language · immutable array methods · indexing and searching from the end · iterator helpers and set operations · the async additions · what your baseline actually allows

## 💡 The Core Idea

JavaScript has shipped a small numbered release every year since ES2015. Nobody memorises the list,
and there is no point trying — but there is a specific, practical skill here: **recognising when a
piece of code is working around something the language now does.**

That is what this shows up as in review. Someone writes `[...items].sort()` to avoid mutating an
array, or `arr[arr.length - 1]`, or a hand-rolled `groupBy`, or a `let resolve` declared outside a
`new Promise`. Each of those was correct advice at some point and is now a longer way to write
something built in.

The counterweight is that "the language has it" and "you can use it" are different questions. What
decides the second is your **baseline** — the oldest browser you support and what your build target
transpiles or polyfills — and that is the part to be able to state.

## How It Works

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

`with()` is the one worth remembering for React and Svelte work, where replacing a single item in a
list is a constant operation and `[...arr.slice(0, i), next, ...arr.slice(i + 1)]` is the
alternative. All four are also on `TypedArray`, and `toSorted` on strings still sorts
lexicographically — the comparator is not optional just because the method is new.

### Reading from the end

```typescript
const rows: string[] = ["a", "b", "c"];

rows.at(-1); // "c"          — ES2022, and works on strings too
rows[rows.length - 1]; // "c"          — the version it replaces

const failures = [{ ok: false }, { ok: true }, { ok: false }];
failures.findLast((r) => !r.ok); // ES2023 — the last match, not the first
failures.findLastIndex((r) => !r.ok);
```

`at()` matters more than it looks in TypeScript, because it returns `T | undefined` while `arr[i]`
returns `T` unless `noUncheckedIndexedAccess` is on. So `at()` makes the language admit what was
always true — the index may be out of range — and the compiler then makes you handle it.

### `Object.hasOwn` (ES2022)

```typescript
Object.hasOwn(config, "retries"); // replaces Object.prototype.hasOwnProperty.call(config, "retries")
```

This closes a genuinely awkward corner: `config.hasOwnProperty("x")` throws on a null-prototype object
and can be shadowed by a property literally called `hasOwnProperty`, which is why the correct old form
was the unreadable `.call` version. `Object.groupBy` and `Map.groupBy` arrived in the same era and are
covered where they belong, in
[Chapter ?? — Array and Object Methods](#ch-array-object-methods).

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
  .map((line: string) => line.trim())
  .take(10)
  .toArray();
```

The point is not brevity. Doing this with arrays means materialising every line, filtering all of
them, then discarding all but ten. Laziness is what makes it viable over a large or infinite source,
and `take` is what terminates it.

```typescript
const admins = new Set(["ada", "grace"]);
const active = new Set(["grace", "alan"]);

admins.intersection(active); // Set { "grace" }
admins.union(active);
admins.difference(active); // Set { "ada" }
admins.isSubsetOf(active); // false
```

Set operations replace the `[...a].filter(x => b.has(x))` idiom, and they are `O(n)` on the smaller
set rather than on the array you spread.

### The async additions

Three that change how real code is written.

**Top-level `await`** (ES2022, modules only) removes the immediately-invoked async wrapper:

```typescript
// config.ts — a module, so this is legal at the top level
const config = await fetch("/config.json").then((r) => r.json());
export default config;
```

It comes with a cost worth naming: importing that module now blocks on the network, and every module
downstream of it waits. Use it for genuine startup configuration, not for convenience.

**`Promise.withResolvers()`** (ES2024) replaces the pattern where you needed the resolve function
outside the constructor:

```typescript
// ❌ The old shape: two variables assigned inside a callback, typed awkwardly
let resolve!: (v: string) => void;
const promise = new Promise<string>((r) => (resolve = r));

// ✅ One call, all three, properly typed
const { promise, resolve, reject } = Promise.withResolvers<string>();
socket.onmessage = (event) => resolve(event.data);
```

**`AbortController`** is not new, but the signal helpers are, and they turn cancellation from
bookkeeping into one line:

```typescript
// A five-second timeout, with no timer to clear
const res = await fetch(url, { signal: AbortSignal.timeout(5_000) });

// Cancel when the component unmounts OR the timeout fires, whichever is first
const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(5_000)]);
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

This is the fix for the habit of re-throwing with a helpful message and losing the stack that
actually explains the failure. Error reporters read `cause` and render the chain — see
[Chapter ?? — Error Handling](#ch-javascript-error-handling).

### What your baseline allows

> ⚠️ **Moving target:** the availability of everything above depends on the oldest engine you support,
> and that moves every quarter. The durable principle is that a language feature is usable when it is
> in your baseline **or** cheaply transpilable, and that syntax and library additions differ: a
> transpiler can rewrite syntax, but a new method needs a polyfill and adds bytes.

| Kind of addition | Example | How a build handles it |
| ---------------- | ------- | ---------------------- |
| **Syntax** | Top-level `await`, optional chaining | Transpiled down; no runtime cost |
| **Library method** | `toSorted`, `Object.groupBy`, iterator helpers | Needs a polyfill, which ships bytes |
| **Runtime capability** | `structuredClone`, `AbortSignal.timeout` | Cannot be polyfilled faithfully; feature-detect |

That table is the real answer to "can we use this yet". Check whether the feature is widely available
across your supported engines before adding a polyfill, because the polyfill is a permanent line in
the bundle that nobody remembers to remove.

## When to Use It

| Situation | Reach for | Instead of |
| --------- | --------- | ---------- |
| Sorting without mutating shared state | `toSorted()` | `[...arr].sort()` |
| Replacing one item in a list | `with(i, next)` | Two `slice` calls and a spread |
| The last element or last match | `at(-1)`, `findLast()` | Index arithmetic |
| Filtering a large or infinite sequence | Iterator helpers | Materialising it as an array first |
| Comparing two sets of ids | `intersection`, `difference` | Spreading a `Set` and filtering |
| A promise resolved by an event handler | `Promise.withResolvers()` | A `let resolve` outside the constructor |
| A request that must not outlive a deadline | `AbortSignal.timeout()` | A `setTimeout` plus a manual `abort()` |
| Re-throwing with more context | `{ cause: err }` | Interpolating the original into a message |

## Common Mistakes

❌ **Top-level `await` in a widely imported module.** Every importer now waits on that network call.
✅ Keep it for genuine startup configuration, and load the rest lazily.

❌ **Polyfilling a method the whole supported range already has.** Permanent bundle weight for nothing.
✅ Check availability against your actual baseline before adding the polyfill.

❌ **Treating iterator helpers as syntax sugar.** The laziness is the feature, and `take` is what makes
an infinite source terminate.
✅ Reach for them when materialising the sequence is the thing you are avoiding.

❌ **Re-throwing without `cause`.** The message survives and the stack that explains it does not.
✅ `new Error(message, { cause: err })`, and let the reporter render the chain.

## 🔑 Key Takeaways

- The yearly cadence means the skill is recognising code that works around something now built in.
- ES2023's `toSorted`, `toReversed`, `with` and `toSpliced` return new arrays, which is what shared state needed.
- `at(-1)` returns `T | undefined`, so it makes TypeScript admit the index might be out of range.
- Iterator helpers are lazy, which is the whole reason to prefer them over converting to an array.
- Whether you can use a feature depends on your baseline, and syntax transpiles while library methods need bytes.

## Interview Questions

**Q: Why did the language add `toSorted` when `sort` already existed?**

Because `sort` mutates, and the workaround — copying the array first purely to protect the original —
is easy to forget in exactly the places it matters, like state shared between components. `toSorted`
makes the non-mutating version the shorter one to write, which is the only reliable way to change a
habit. The comparator rules are unchanged, so it still sorts lexicographically without one.

**Q: What do iterator helpers give you that array methods do not?**

Laziness, and therefore the ability to work over a source you would not want to materialise — a large
file read line by line, a paginated API, an infinite generator. `filter().map().take(10)` on an
iterator reads only as far as the tenth match, whereas the array version builds the whole collection
first and discards nearly all of it. On a small in-memory array there is no real difference.

**Q: How do you decide whether a new method is safe to use?**

By checking it against the project's stated baseline rather than against "is it standard yet". Then
the second question is what a build can do about a gap: a transpiler can rewrite new *syntax* with no
runtime cost, but a new *method* needs a polyfill that ships bytes permanently, and a runtime
capability like `structuredClone` cannot be polyfilled faithfully at all. So a missing method is a
budget decision and missing syntax usually is not.

## What to Read Next

- [Chapter ?? — Array and Object Methods](#ch-array-object-methods) — where grouping and the immutable methods sit against `reduce`
- [Chapter ?? — Promises and Async/Await](#ch-promises-async) — the cancellation and concurrency model these additions extend
- [Chapter ?? — Dates, Numbers and Currency](#ch-date-number-formatting) — `Intl` and the `Temporal` replacement for `Date`
