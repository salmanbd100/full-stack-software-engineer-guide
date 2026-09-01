---
title: TypeScript Basic Types
part: 1
chapter: 0
slug: basic-types
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-31
tags: [frontend, typescript, basic, types]
in_book: true
---

# TypeScript Basic Types {#ch-basic-types}

> Annotate only where inference cannot reach, and know what `any`, `unknown` and `never` each cost you.

**In this chapter:** primitives · annotation vs inference · `any` vs `unknown` vs `never` · arrays and tuples · typing functions

## 💡 The Core Idea

TypeScript's type system exists at compile time and disappears at runtime. That single fact explains
its shape: it can prove things about your code before it runs, and it can prove nothing once it is
running. Good TypeScript therefore puts types where the compiler cannot work them out for itself —
function boundaries and external data — and stays quiet everywhere inference already knows the answer.

## How It Works

| Type        | Holds                                    | Note                                        |
| ----------- | ---------------------------------------- | ------------------------------------------- |
| `string`    | `'alice'`, `` `hi ${name}` ``            | —                                           |
| `number`    | `42`, `3.14`, `NaN`, `Infinity`          | One type for integers and floats            |
| `boolean`   | `true`, `false`                          | —                                           |
| `bigint`    | `9007199254740993n`                      | Does not mix with `number`                  |
| `null`      | `null`                                   | Deliberate absence                          |
| `undefined` | `undefined`                              | Not yet set                                 |

`strictNullChecks` is what makes `null` and `undefined` mean anything: without it they are assignable
to every type and the compiler cannot catch the commonest runtime error there is. Treat it as
non-optional.

### Annotation versus inference

```typescript
// ✅ let inference do it — the value states the type
let count = 0; // number
const status = 'pending'; // 'pending', a literal type, because it is const

// ✅ annotate where inference cannot reach
function createUser(name: string, role: 'admin' | 'user' = 'user'): User { /* … */ }
const parsed: unknown = JSON.parse(raw); // external data has no knowable type

// ❌ redundant — the compiler already knows
let message: string = 'Hello';
```

Annotate **function parameters and exported return types**; let inference handle locals. A return
annotation on a public function is not redundancy — it pins the contract, so a change inside the body
fails there rather than at every call site.

### `any`, `unknown`, `never`

```typescript
// ❌ any switches the compiler off for this value and everything it flows into
const data: any = await res.json();
data.user.name.toUpperCase(); // compiles; crashes if any link is null

// ✅ unknown accepts anything but permits nothing until you prove the shape
const data: unknown = await res.json();
if (typeof data === 'object' && data !== null && 'user' in data) { /* narrowed */ }
```

|                    | `any`                     | `unknown`                     | `never`                          |
| ------------------ | ------------------------- | ----------------------------- | -------------------------------- |
| Accepts            | Everything                | Everything                    | Nothing                          |
| You may            | Do anything               | Nothing until narrowed        | —                                |
| Means              | "Stop checking"           | "Checked later"               | "This cannot happen"             |
| Reach for it when  | Migrating JavaScript, under protest | Parsing external data | Exhaustiveness, functions that throw |

`never` earns its place in the exhaustiveness check, which is the single most useful compile-time
guard in a codebase with unions:

```typescript
type Status = 'active' | 'inactive' | 'banned';

function label(status: Status): string {
  switch (status) {
    case 'active':
      return 'Welcome back';
    case 'inactive':
      return 'Paused';
    case 'banned':
      return 'Access denied';
    default: {
      // Adding a fourth Status makes this line fail to compile, here,
      // rather than falling through silently at runtime
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
```

### Arrays and tuples

```typescript
const ids: number[] = [1, 2, 3];
const mixed: (string | number)[] = [1, 'two'];
const frozen: readonly string[] = ['a']; // no push, no sort, no splice

// A tuple fixes length and the type at each position
type Coordinate = [lat: number, lng: number]; // named elements, TS 4.0+
const point: Coordinate = [40.7128, -74.006];

// Which is what makes destructuring a returned pair typed
function parseRow(row: string): [id: number, name: string] {
  const [id, name] = row.split(',');
  return [Number(id), name];
}
```

`readonly T[]` is the cheapest immutability guarantee in the language: it costs nothing at runtime and
stops the mutating array methods at compile time.

### Functions

```typescript
function greet(name: string, greeting?: string): string {
  return `${greeting ?? 'Hello'}, ${name}!`;
}

// A named function type is what makes callback and prop signatures readable
type EventHandler<T = void> = (event: T) => void;
type AsyncFn<T> = () => Promise<T>;
```

## When to Use It

| Scenario                                  | Reach for                    | Why                                                |
| ----------------------------------------- | ---------------------------- | -------------------------------------------------- |
| A local whose value states its type        | No annotation                | Inference is exact and stays correct when the value changes |
| A parameter, or an exported return type    | An explicit annotation       | It is the contract; inference would let it drift    |
| A `fetch` body, `JSON.parse`, `postMessage` | `unknown` plus a type guard | The shape is a runtime fact, not a compile-time one |
| A union you must handle completely         | A `never` exhaustiveness check | New members break the build, not production      |
| An array a function must not modify        | `readonly T[]`               | Free, and enforced                                 |

## Common Mistakes

**❌ Using `any` to silence an error.** It does not contain the problem: `any` propagates through
every expression it touches, so one annotation can disable checking across a whole call path. If you
genuinely do not know the type, that is what `unknown` is for.

**❌ Annotating what inference already knows.** `const names: string[] = users.map((u) => u.name)` adds
nothing and will not update when `name` changes type.

**❌ Widening a literal by accident:**

```typescript
let method = 'GET'; // ❌ inferred as string, so it will not fit 'GET' | 'POST'
const method = 'GET'; // ✅ inferred as 'GET'
```

**❌ Confusing `void` and `never`.** `void` means the function returns nothing useful; `never` means
it does not return at all — it throws or loops forever. A function annotated `never` that finishes
normally is a compile error, which is the point.

**❌ Reading a type assertion as a check.** `data as User` tells the compiler to stop arguing; it
verifies nothing. Only a runtime guard actually establishes the shape.

> ⚠️ Types are erased at build time. There is no `instanceof MyInterface`, no reflection over a type,
> and nothing stops a wrongly-shaped JSON payload at the boundary. Validate external input at runtime
> — a schema library, or a hand-written guard.

## 🔑 Key Takeaways

- Types exist only at compile time, so external data always needs a runtime check.
- Annotate function parameters and exported return types; let inference handle locals.
- `any` disables checking and spreads; `unknown` is the safe container for data you have not validated.
- `never` powers exhaustiveness checks that turn a missed union member into a build failure.
- `const` infers a literal type where `let` widens to the primitive.

## Interview Questions

**Q: What is the difference between `any` and `unknown`?**

Both accept any value. `any` also permits any operation, so it switches type checking off for that
value and everything derived from it. `unknown` permits nothing until you narrow it with a type guard,
which is exactly what you want at a boundary — the compiler forces the validation you should be
writing anyway.

**Q: When should you annotate rather than let TypeScript infer?**

At contracts: function parameters, and the return types of anything exported. Inside a function,
inference is more accurate than an annotation and stays correct as the code changes. The other case is
where you want a wider type than the value implies — `let id: string | number = 1`.

**Q: TypeScript compiled with no errors. What can still go wrong at runtime?**

Anything crossing a boundary the compiler cannot see: an API returning a different shape, a
`localStorage` value, `JSON.parse`, a third-party library whose types are wrong, or an `as` assertion
that lied. Type erasure means none of these are checked, which is why validation belongs at the edges.

## What to Read Next

- [Chapter ?? — Interfaces and Type Aliases](#ch-interfaces-types) — describing object shapes properly
- [Chapter ?? — Type Guards](#ch-type-guards) — how to turn `unknown` into something usable
- [Chapter ?? — Data Types and Variables](#ch-data-types-variables) — the runtime values underneath these types
