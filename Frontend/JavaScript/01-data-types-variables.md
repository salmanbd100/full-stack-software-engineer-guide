---
title: Data Types, Variables and Built-ins
part: 1
chapter: 2
slug: data-types-variables
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-24
tags: [frontend, javascript, data, types, variables, arrays, objects]
in_book: true
---

# Data Types, Variables and Built-ins {#ch-data-types-variables}

> Predict what a value will do before you run it — which types copy, which share, which comparisons lie, and which built-in methods mutate.

**In this chapter:** primitives vs references · coercion, `??` and equality · `var`, `let` and `const` · `Map`, `Set` and copies · the array methods that mutate

## 💡 The Core Idea

JavaScript has two kinds of value, and the split explains most type bugs. A **primitive** is the
value itself: assign it and you get a copy. A **reference type** is an address: assign it and both
names point at the same object. Why `===` surprises you, why a spread is not a deep copy, why
`const` does not mean immutable, and why `sort` can reorder a React prop — all of it follows from
that one distinction.

## How It Works

| Aspect         | Primitives                                                            | Reference types               |
| -------------- | --------------------------------------------------------------------- | ----------------------------- |
| **Types**      | `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` | `Object`, `Array`, `Function` |
| **Assignment** | Copies the value                                                      | Copies the address            |
| **Mutability** | Immutable — you can only reassign the variable                        | Mutable in place              |
| **Comparison** | Compares values                                                       | Compares identity             |

**Assignment copies a value, or copies an address:**

```typescript
let a: number = 10;
let b: number = a; // copies the value
b = 20; // a is still 10

const obj1: { name: string } = { name: 'Alice' };
const obj2 = obj1; // copies the address
obj2.name = 'Bob'; // obj1.name is 'Bob' too — one object, two names
```

> ⚠️ Arrays are objects. `const copy = original` gives you a second name for one array, not a
> second array. This is the most common source of accidental mutation in React state.

### Coercion and equality

When operands have different types, JavaScript converts them. `+` prefers strings if either side is
one. Every other arithmetic operator prefers numbers.

<!-- lint-allow-fence: javascript — the subject is implicit coercion; TypeScript rejects `'5' - 3` and `5 == '5'`, which is exactly what this fence has to show -->
```javascript
'5' + 3; // '53'   — one side is a string, so both become strings
'5' - 3; // 2      — `-` has no string meaning, so both become numbers
5 == '5'; // true   — `==` coerces first
5 === '5'; // false  — `===` compares type and value
null == undefined; // true
```

Six values are falsy: `0`, `''`, `null`, `undefined`, `NaN`, `false`. **Everything else is truthy**,
including `'0'`, `[]` and `{}`. That is why `count || 10` is a bug when `0` is a real count. Use
`count ?? 10` instead: `??` (ES2020) falls back only on `null` and `undefined`.

### The three declaration forms

| Form    | Scope    | Before declaration                     | Reassign | Use it                |
| ------- | -------- | -------------------------------------- | -------- | --------------------- |
| `var`   | Function | `undefined` (hoisted)                  | ✅        | ❌ Never — legacy      |
| `let`   | Block    | ❌ `ReferenceError` (temporal dead zone) | ✅        | Only when reassigning |
| `const` | Block    | ❌ `ReferenceError`                     | ❌        | ✅ Default             |

`const` freezes the **binding**, not the value. `const user = {...}; user.name = 'Bob'` is legal.
For a truly immutable object you need `Object.freeze` — which is shallow — or a `readonly` type.

### Keyed collections

An object turns every key into a string. A `Map` keeps the key you gave it.

```typescript
const cache = new Map<object, string>(); // any value as a key, insertion order, a real `.size`
const unique: string[] = [...new Set(['a', 'b', 'a'])]; // unique values, O(1) membership
```

| Need                           | `Object`                        | `Map`                         |
| ------------------------------ | ------------------------------- | ----------------------------- |
| Keys that are not strings      | ❌ Turned into strings           | ✅ Any value, objects included |
| Frequent add and delete        | Slower                          | ✅ Built for it                |
| Keys that come from user input | ❌ Can collide with `__proto__`  | ✅ No prototype chain to hit   |

`WeakMap` holds its keys weakly. An entry disappears once nothing else references its key, so it is
the right store for metadata attached to a DOM node.

### Array methods, and the ones that mutate

The method you pick tells the reader the shape of the result before they read the callback. `map`
means "same length, new values". `filter` means "fewer items". `reduce` means "one value out of many".

| Method                          | Returns                | Mutates? |
| ------------------------------- | ---------------------- | -------- |
| `map`, `filter`, `flatMap`, `slice` | A new array        | No       |
| `reduce`                        | One value of any shape | No       |
| `find` / `findIndex`            | Element or `undefined` / index or `-1` | No |
| `some` / `every`                | Boolean, short-circuits | No      |
| **`sort`, `reverse`, `splice`** | The **same** array     | **Yes**  |
| **`push`, `pop`, `shift`, `unshift`** | Length or element | **Yes** |

`sort`, `reverse` and `splice` surprise people because they look like the safe methods around them.
ES2023 added copying versions: `toSorted`, `toReversed`, `toSpliced`, and `with(index, value)` to
replace one item.

**Transform, filter, fold, group:**

```typescript
interface Order {
  id: number;
  total: number;
  status: 'paid' | 'pending';
}

const paid: Order[] = orders.filter((o) => o.status === 'paid');
const sum: number = orders.reduce((acc: number, o: Order) => acc + o.total, 0); // always pass the initial value
const byStatus = Object.groupBy(orders, (o: Order) => o.status); // ES2024 — replaces a grouping reduce
const next: Order[] = orders.with(0, { ...orders[0], status: 'paid' }); // a new array, one item replaced
```

For objects, `Object.entries` → transform → `Object.fromEntries` is the equivalent of `map` and
`filter`. All the `Object.keys` family skip inherited properties, which `for...in` does not.

## When to Use It

Copying is where the value model earns its keep. Pick by how deep the change goes.

| Scenario                                  | Reach for                         | Why                                                  |
| ----------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Change one top-level field                | `{ ...obj, field: next }`         | Cheapest; nested objects stay shared, which is fine  |
| Change a nested field                     | Spread at every level you touch   | Structural sharing keeps the rest referentially equal |
| Snapshot arbitrary data (`Date`, `Map`)   | `structuredClone(obj)`            | Native, handles cycles; throws on functions          |
| Reorder a list you do not own             | `toSorted()`                      | The original is untouched by construction            |
| Early exit, or `await` per item           | `for...of`                        | `forEach` cannot `break` and does not await          |
| Deduplicate primitives                    | `[...new Set(list)]`              | O(n), and says what it means                         |

**Immutable update, nested — spread every level on the path:**

```typescript
interface AppState {
  user: { name: string; age: number };
  settings: { theme: 'light' | 'dark' };
}

const nextState: AppState = {
  ...state,
  user: { ...state.user, age: 31 }, // `settings` is reused by reference
};
```

## Common Mistakes

**❌ Mutating an argument the caller still owns:**

```typescript
function addItem<T>(arr: T[], item: T): T[] {
  arr.push(item); // the caller's array changed
  return arr;
}
```

**✅ Take `readonly` and return a new array — the type now enforces it:**

```typescript
function addItem<T>(arr: readonly T[], item: T): T[] {
  return [...arr, item];
}
```

**❌ Treating a spread as a deep copy.** `{ ...original }` copies one level. `copy.b.c = 3` changes
`original.b.c` too, because `b` was never copied.

**❌ `sort` on numbers without a comparator.** The default turns values into strings:

```typescript
[10, 5, 40, 1000].sort(); // ❌ [10, 1000, 40, 5]
[10, 5, 40, 1000].toSorted((a, b) => a - b); // ✅ [5, 10, 40, 1000], and the original is untouched
```

**❌ `await` inside `forEach`.** `forEach` throws away the promise each callback returns, so the loop
ends before the work does. Use `for...of` for sequential work, or `await Promise.all(items.map(save))`
for parallel work.

**❌ Checking for an object before checking for `null`.** `typeof null === 'object'`, so `null` falls
into the object branch and the next property access throws. Check `value === null` first.

**❌ Using `==` out of habit.** The one defensible use is `value == null`, which catches `null` and
`undefined` together. Everywhere else, use `===`.

## 🔑 Key Takeaways

- Primitives assign by value; objects, arrays and functions assign by address.
- `const` stops reassignment of the binding and nothing else — the object stays mutable.
- Only six values are falsy, so a default for a number or a string belongs behind `??`, not `||`.
- `sort`, `reverse`, `splice` and the `push` family mutate; `toSorted` and `with` are the copying versions.
- Spread copies one level. Anything deeper needs `structuredClone` or a spread per level.

## Interview Questions

**Q: Why does changing a property through one variable affect another variable?**

Both variables hold the same address, not the same data. Assignment copied the reference, so there is
one object with two names. An independent object needs an explicit copy — a spread for a flat object,
`structuredClone` for a nested one.

**Q: `const arr = [1, 2]; arr.push(3);` — why is that legal?**

`const` constrains the binding, not the value. `push` changes the array the binding points at, and the
binding itself never changes. `arr = []` would be the error.

**Q: What is the difference between `map` and `forEach`?**

`map` returns a new array of the same length, built from the callback's return values. `forEach`
returns `undefined` and exists only for side effects. Calling `map` and ignoring the result allocates
an array for nothing, and neither of them can be awaited per item.

**Q: How would you remove duplicates from an array of objects by `id`?**

A `Set` compares objects by identity, so it does not help here. Key by the field instead:
`[...new Map(items.map((i) => [i.id, i])).values()]`. That keeps the last occurrence in O(n).

**Q: When is `reduce` the wrong choice?**

Whenever a named method says it more clearly. A `reduce` that returns an array of the same length is a
`map`, one that returns a subset is a `filter`, and one that returns a boolean is `some` or `every`.
Keep `reduce` for real changes of shape — a sum or a lookup table — and prefer `Object.groupBy` for
grouping.

## What to Read Next

- [Chapter ?? — Scope and Closures](#ch-closures) — where `let` and `const` bindings live and die
- [Chapter ?? — TypeScript Basic Types, Literals and Enums](#ch-basic-types) — the same value model with a compiler checking it
- [Chapter ?? — Promises, Async/Await and Errors](#ch-promises-async) — the right way to iterate asynchronously
