---
title: Data Types and Variables
part: 1
chapter: 0
slug: data-types-variables
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [frontend, javascript, data, types, variables]
in_book: true
---

# Data Types and Variables {#ch-data-types-variables}

> Predict what a value will do before you run it — which types copy, which share, and which comparisons lie.

**In this chapter:** primitives vs references · type coercion · `var`, `let` and `const` · shallow vs deep copies · narrowing `unknown`

## 💡 The Core Idea

JavaScript has two kinds of value, and the split explains most type bugs. A **primitive** is the
value itself: assign it and you get a copy. A **reference type** is an address: assign it and both
names point at the same object in memory. Everything else in this chapter — why `===` sometimes
surprises you, why spreading a nested object is not enough, why `const` does not mean immutable —
follows from that one distinction.

## How It Works

| Aspect          | Primitives                                                        | Reference types            |
| --------------- | ----------------------------------------------------------------- | -------------------------- |
| **Types**       | `string`, `number`, `boolean`, `null`, `undefined`, `symbol`, `bigint` | `Object`, `Array`, `Function` |
| **Assignment**  | Copies the value                                                  | Copies the address         |
| **Mutability**  | Immutable — you can only reassign the variable                    | Mutable in place           |
| **Comparison**  | Compares values                                                   | Compares identity          |

**Assignment copies a value, or copies an address:**

```typescript
let a: number = 10;
let b: number = a; // copies the value
b = 20;
console.log(a); // 10 — untouched

interface Person {
  name: string;
}

const obj1: Person = { name: 'Alice' };
const obj2: Person = obj1; // copies the address
obj2.name = 'Bob';
console.log(obj1.name); // 'Bob' — same object
```

> ⚠️ Arrays are objects. `const copy = original` gives you a second name for one array, not a
> second array. This is the single most common source of accidental mutation in React state.

### Coercion and equality

When operands have different types, JavaScript converts them. `+` prefers strings if either side is
one; every other arithmetic operator prefers numbers.

<!-- lint-allow-fence: javascript — the subject is implicit coercion; TypeScript rejects `'5' - 3` and `5 == '5'`, which is exactly what this fence has to show -->
```javascript
'5' + 3; // '53'   — one side is a string, so both become strings
'5' - 3; // 2      — `-` has no string meaning, so both become numbers
true + 1; // 2      — true coerces to 1

5 == '5'; // true   — `==` coerces first
5 === '5'; // false  — `===` compares type and value
null == undefined; // true
null === undefined; // false
```

Six values are falsy: `0`, `''`, `null`, `undefined`, `NaN`, `false`. **Everything else is truthy**,
including `'0'`, `'false'`, `[]` and `{}`.

### The three declaration forms

| Form    | Scope           | Before declaration            | Reassign | Use it              |
| ------- | --------------- | ----------------------------- | -------- | ------------------- |
| `var`   | Function        | `undefined` (hoisted)         | ✅        | ❌ Never — legacy    |
| `let`   | Block           | ❌ `ReferenceError` (temporal dead zone) | ✅        | Only when reassigning |
| `const` | Block           | ❌ `ReferenceError`            | ❌        | ✅ Default           |

```typescript
function varLeaks(): number {
  if (true) {
    var x: number = 20; // no block scope — escapes the `if`
  }
  return x; // 20
}

const person: { name: string } = { name: 'Alice' };
person.name = 'Bob'; // ✅ mutating the object is fine
// person = { name: 'Carol' }; // ❌ reassigning the binding is not
```

`const` freezes the **binding**, not the value. For a genuinely immutable object you need
`Object.freeze` (one level deep) or a `readonly` type in TypeScript.

## When to Use It

Copying is where this knowledge earns its keep. Pick by how deep the change goes.

| Scenario                                 | Reach for                        | Why                                              |
| ---------------------------------------- | -------------------------------- | ------------------------------------------------ |
| Change one top-level field               | `{ ...obj, field: next }`        | Cheapest; nested objects stay shared, which is fine |
| Change a nested field                    | Spread at every level you touch  | Structural sharing keeps the rest referentially equal |
| Snapshot arbitrary data (`Date`, `Map`, `Set`) | `structuredClone(obj)`      | Native, handles cycles; throws on functions      |
| Snapshot plain JSON only                 | `JSON.parse(JSON.stringify(obj))` | Fine when you know it is JSON — silently drops `undefined`, `Date`, `Map` |

**Immutable update, nested — spread every level on the path:**

```typescript
interface AppState {
  user: { name: string; age: number };
  settings: { theme: 'light' | 'dark' };
}

const next: AppState = {
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

**❌ Treating a spread as a deep copy:**

```typescript
const shallow = { ...original };
shallow.b.c = 3; // original.b.c is 3 too — `b` was never copied
```

**❌ Checking for an object before checking for `null`.** `typeof null === 'object'`, so a `null`
falls into the object branch and the next property access throws.

**✅ Order the checks so `null` is handled first:**

```typescript
function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return `array of ${value.length}`;
  if (typeof value === 'object') return `object with ${Object.keys(value).length} keys`;
  return typeof value;
}
```

**❌ Using `==` habitually.** The one defensible use is `value == null`, which catches `null` and
`undefined` in a single check. Everywhere else, `===`.

## 🔑 Key Takeaways

- Primitives assign by value; objects, arrays and functions assign by address.
- `const` prevents reassignment of the binding and nothing else — the object stays mutable.
- Only six values are falsy; `[]`, `{}` and `'0'` are all truthy.
- Spread copies one level. Anything deeper needs `structuredClone` or a spread per level.
- `typeof null` is `'object'`, so narrow `null` before you narrow objects.

## Interview Questions

**Q: Why does changing a property through one variable affect another variable?**

Both variables hold the same address, not the same data. Assignment copied the reference, so there is
one object with two names. Creating an independent object requires an explicit copy — a spread for a
flat object, `structuredClone` for a nested one.

**Q: `const arr = [1, 2]; arr.push(3);` — why is that legal?**

`const` constrains the binding, not the value. `push` mutates the array the binding points at, which
never changes the binding. `arr = []` would be the error.

**Q: When would you deliberately reach for `JSON.parse(JSON.stringify(x))` over `structuredClone`?**

When the data is already known to be JSON-safe and you want the lossy behaviour — for example
stripping `undefined` fields before sending a payload, or dropping non-serialisable extras that
`structuredClone` would either keep or throw on. Otherwise `structuredClone` is the correct default.

## What to Read Next

- [Chapter ?? — Functions and Scope](#ch-functions-scope) — where `let` and `const` bindings live and die
- [Chapter ?? — Array and Object Methods](#ch-array-object-methods) — which built-ins mutate and which return a copy
- [Chapter ?? — Basic Types](#ch-basic-types) — the same value model with a compiler checking it
