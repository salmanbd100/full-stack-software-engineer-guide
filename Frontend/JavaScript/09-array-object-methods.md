---
title: Array and Object Methods
part: 1
chapter: 0
slug: array-object-methods
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, javascript, arrays, objects, functional]
in_book: true
---

# Array and Object Methods {#ch-array-object-methods}

> Pick the method that says what you mean, and know which ones mutate the thing you passed in.

**In this chapter:** `map`, `filter`, `reduce` · finding and testing · flattening · which methods mutate · `Object.entries`, `keys` and `values`

## 💡 The Core Idea

Choosing an array method is a way of stating intent. `map` says "same length, different values";
`filter` says "fewer items, unchanged"; `reduce` says "one value out of many". A reader who knows the
vocabulary knows the shape of the result before reading the callback — which a `for` loop never tells
them. The one thing you must memorise alongside the vocabulary is the short list of methods that
mutate in place.

## How It Works

| Method       | Returns                  | Mutates? | Says                            |
| ------------ | ------------------------ | -------- | ------------------------------- |
| `map`        | New array, same length   | No       | Transform every element          |
| `filter`     | New array, ≤ length      | No       | Keep the ones that match         |
| `reduce`     | One value of any shape   | No       | Fold the list into a result      |
| `flatMap`    | New array, any length    | No       | Map, then flatten one level      |
| `find`       | Element or `undefined`   | No       | The first match                  |
| `findIndex`  | Index or `-1`            | No       | Where the first match is         |
| `some`       | Boolean                  | No       | Does any match — short-circuits  |
| `every`      | Boolean                  | No       | Do all match — short-circuits    |
| `slice`      | New array                | No       | A copied portion                 |
| `forEach`    | `undefined`              | No       | Side effects only                |
| **`sort`**   | The **same** array       | **Yes**  | Reorder in place                 |
| **`reverse`** | The **same** array      | **Yes**  | Reverse in place                 |
| **`splice`** | The removed elements     | **Yes**  | Insert or remove at an index     |
| **`push`/`pop`/`shift`/`unshift`** | Length or element | **Yes** | Add or remove at an end |

Four of those mutate. `sort`, `reverse` and `splice` are the ones that surprise people, because they
look like the non-mutating methods around them. ES2023 added `toSorted`, `toReversed` and
`toSpliced`, which return copies — use them where available, or `[...arr].sort()` where not.

### The three transformations

```typescript
interface Order {
  id: number;
  total: number;
  status: 'paid' | 'pending';
}

const totals: number[] = orders.map((o: Order): number => o.total);
const paid: Order[] = orders.filter((o: Order): boolean => o.status === 'paid');

// reduce: the initial value fixes the accumulator's type — always pass one
const sum: number = orders.reduce((acc: number, o: Order): number => acc + o.total, 0);

// reduce is also how you group, which `map` and `filter` cannot express
const byStatus: Record<string, Order[]> = orders.reduce<Record<string, Order[]>>((acc, o) => {
  (acc[o.status] ??= []).push(o);
  return acc;
}, {});
```

`Object.groupBy` (ES2024) does that last one directly, and reads better when grouping is all you need.

### Finding and testing

```typescript
users.find((u) => u.id === 2); // User | undefined — the compiler forces you to handle the miss
users.findIndex((u) => u.id === 2); // number — check `=== -1`, never truthiness: index 0 is falsy

list.includes(NaN); // true  — SameValueZero
list.indexOf(NaN); // -1    — strict equality, so NaN never matches itself

numbers.some((n) => n < 0); // stops at the first true
numbers.every((n) => n > 0); // stops at the first false; `true` for an empty array
```

### Flattening and building

```typescript
[1, [2, [3]]].flat(); // depth 1 by default
[1, [2, [3]]].flat(Infinity); // fully flat
words.flatMap((w: string): string[] => w.split('')); // map + flat(1), one pass

Array.from('hello'); // takes iterables *and* array-likes; spread takes only iterables
Array.from({ length: 5 }, (_, i: number): number => i + 1); // [1,2,3,4,5] — the idiomatic range
```

### Object methods

```typescript
Object.keys(user); // string[]
Object.values(user); // the value types
Object.entries(user); // [key, value] pairs — the iteration form

// entries → transform → fromEntries is the object equivalent of map/filter
const withoutSecret = Object.fromEntries(
  Object.entries(user).filter(([key]: [string, unknown]): boolean => key !== 'password'),
);
```

All three skip inherited and symbol-keyed properties, which is what makes them safe where `for...in`
is not.

| Task                          | Use                                | Not                                       |
| ----------------------------- | ---------------------------------- | ----------------------------------------- |
| Shallow copy or merge          | `{ ...a, ...b }`                   | `Object.assign(a, b)` — mutates `a`       |
| Own-property check             | `Object.hasOwn(obj, key)`          | `obj.hasOwnProperty(key)` — breaks on null-prototype objects |
| Any-property check             | `key in obj`                       | —                                         |
| Prevent all changes            | `Object.freeze(obj)` — shallow      | —                                         |

## When to Use It

| Scenario                                    | Reach for              | Why                                              |
| ------------------------------------------- | ---------------------- | ------------------------------------------------ |
| One output per input                         | `map`                  | The length is guaranteed, so the reader knows the shape |
| A single aggregate, or a grouping            | `reduce`, `Object.groupBy` | Nothing else can change the container type   |
| The first match, where a miss is normal      | `find`                 | Returns `T \| undefined`, so the miss is typed    |
| Early exit from a loop, or `await` per item   | `for...of`             | `forEach` cannot `break` and does not await      |
| Deduplicating                                | `[...new Set(list)]`   | O(n), and says what it means                     |

## Common Mistakes

**❌ `sort` without a comparator on numbers.** The default converts to strings:

```typescript
[10, 5, 40, 1000, 1].sort(); // ❌ [1, 10, 1000, 40, 5]
[10, 5, 40, 1000, 1].sort((a, b) => a - b); // ✅ [1, 5, 10, 40, 1000]
```

**❌ Sorting a prop you did not mean to reorder.** `sort` mutates, so
`const sorted = items.sort(...)` reorders `items` too — including React props and store state.
Copy first: `[...items].sort(...)` or `items.toSorted(...)`.

**❌ Confusing `slice` with `splice`.** One letter apart, opposite behaviour: `slice` copies, `splice`
mutates and returns what it removed.

**❌ `await` inside `forEach`.** The callback returns a promise that `forEach` discards, so the loop
finishes before any of the work does:

```typescript
items.forEach(async (i) => { await save(i); }); // ❌ returns immediately
for (const i of items) await save(i); // ✅ sequential
await Promise.all(items.map((i) => save(i))); // ✅ parallel
```

**❌ `reduce` with no initial value.** On an empty array it throws, and on a non-empty one the first
element becomes the accumulator — which is rarely the type you wanted.

**❌ Reaching for `reduce` where `map` or `filter` fits.** A `reduce` that builds an array of the same
length is a `map` written obscurely.

> ⚠️ `Object.freeze` is shallow. `freeze(state)` leaves `state.user` fully mutable. There is no
> built-in deep freeze; recurse yourself, or rely on `readonly` types at compile time.

## 🔑 Key Takeaways

- `sort`, `reverse`, `splice` and the `push` family mutate in place; everything else returns a new array.
- The method you pick tells the reader the shape of the result before they read the callback.
- `sort`'s default comparator stringifies, so numbers need `(a, b) => a - b`.
- `find` returns `undefined` and `findIndex` returns `-1` — check the index against `-1`, not truthiness.
- `forEach` cannot break early and does not await, so use `for...of` or `Promise.all` for async work.

## Interview Questions

**Q: What is the difference between `map` and `forEach`?**

`map` returns a new array of the same length built from the callback's return values; `forEach`
returns `undefined` and exists only for side effects. Using `map` and discarding the result allocates
an array for nothing, and using `forEach` where you want a result means pushing into an array by hand.

**Q: How would you remove duplicates from an array of objects by `id`?**

A `Set` deduplicates by identity, which does not help for objects, so key by the field instead:
`[...new Map(items.map((i) => [i.id, i])).values()]`. That keeps the last occurrence in O(n); reverse
the input first if you want the first.

**Q: When is `reduce` the wrong choice?**

Whenever a named method says it more clearly. `reduce` returning an array of the same length is a
`map`; returning a subset is a `filter`; returning a boolean is `some` or `every`. Keep `reduce` for
the cases that genuinely change the container — a sum, a lookup table, a grouped object.

## What to Read Next

- [Chapter ?? — Data Types and Variables](#ch-data-types-variables) — why an in-place sort changes your caller's array
- [Chapter ?? — ES2015 and Later Features](#ch-es6-features) — spread, `Map` and `Set` alongside these methods
- [Chapter ?? — Promises and Async/Await](#ch-promises-async) — the right way to iterate asynchronously
