---
title: TypeScript Basic Types, Literals and Enums
part: 1
chapter: 9
slug: basic-types
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-24
tags: [frontend, typescript, basic, types, literals, enums]
in_book: true
---

# TypeScript Basic Types, Literals and Enums {#ch-basic-types}

> Annotate only where inference cannot reach, know what `any`, `unknown` and `never` each cost you, and model a fixed set of values without shipping a runtime object nobody asked for.

**In this chapter:** annotation vs inference · `any` vs `unknown` vs `never` · arrays, tuples and functions · literal unions vs `as const` vs `enum` · what exists at runtime

## 💡 The Core Idea

TypeScript's type system exists at compile time and disappears at runtime. That one fact explains its
shape. It can prove things about your code before it runs, and nothing once it is running. So good
TypeScript puts types where the compiler cannot work them out — function boundaries and external data
— and stays quiet where inference already knows the answer.

The same fact decides how to model "one of these five values". A literal union exists only at compile
time. An `as const` object is a plain object you can iterate. An `enum` is generated code. Choose by
whether you need the values at runtime.

## How It Works

`number` covers integers and floats alike. `bigint` does not mix with it. `null` means deliberate
absence and `undefined` means not yet set. `strictNullChecks` is what makes those two mean anything:
without it they fit every type, and the compiler cannot catch the commonest runtime error there is.

### Annotation versus inference

```typescript
// ✅ let inference do it — the value states the type
let count = 0; // number
const status = 'pending'; // 'pending', a literal type, because it is const

// ✅ annotate where inference cannot reach
function createUser(name: string, role: 'admin' | 'user' = 'user'): User { /* … */ }
const parsed: unknown = JSON.parse(raw); // external data has no knowable type
```

Annotate **function parameters and exported return types**, and let inference handle locals. A return
annotation on a public function pins the contract, so a change inside the body fails there rather than
at every call site.

### `any`, `unknown`, `never`

|                   | `any`                               | `unknown`               | `never`                              |
| ----------------- | ----------------------------------- | ----------------------- | ------------------------------------ |
| Accepts           | Everything                          | Everything              | Nothing                              |
| You may           | Do anything                         | Nothing until narrowed  | —                                    |
| Means             | "Stop checking"                     | "Checked later"         | "This cannot happen"                 |
| Reach for it when | Migrating JavaScript, under protest | Parsing external data   | Exhaustiveness, functions that throw |

`never` earns its place in the **exhaustiveness check** — the most useful compile-time guard in a
codebase with unions:

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
      // A fourth Status makes this line fail to compile, instead of falling through at runtime
      const exhaustive: never = status;
      return exhaustive;
    }
  }
}
```

### Arrays, tuples and functions

```typescript
const frozen: readonly string[] = ['a']; // no push, no sort, no splice — free, and enforced

// A tuple fixes the length and the type at each position
function parseRow(row: string): [id: number, name: string] {
  const [id, name] = row.split(',');
  return [Number(id), name];
}

type EventHandler<T = void> = (event: T) => void; // a named function type keeps prop signatures readable
```

### Three ways to say "one of these values"

**A literal union costs nothing, and matches the strings your API sends:**

```typescript
type UserRole = 'admin' | 'user' | 'guest';
setRole(1, 'admin'); // ✅
setRole(1, 'superuser'); // ❌ not a valid role
```

**An `as const` object gives you the list and the type from one declaration:**

```typescript
const OrderStatus = {
  Pending: 'pending',
  Shipped: 'shipped',
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus]; // 'pending' | 'shipped'

Object.values(OrderStatus); // ✅ iterable — for a dropdown or a validation list
setStatus('ord_1', 'shipped'); // ✅ the raw string from JSON works too
```

**An `enum` is generated code, and a string enum rejects the raw value:**

```typescript
enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}
log(LogLevel.Info, 'started'); // ✅
log('INFO', 'started'); // ❌ string enums are nominal
```

| Property                                         | Literal union | `as const` object | `enum`                   |
| ------------------------------------------------ | ------------- | ----------------- | ------------------------ |
| Runtime output                                   | None          | A plain object    | A generated object       |
| Iterate the values                               | ❌             | ✅                 | ✅                        |
| Accepts the raw string                           | ✅             | ✅                 | ❌                        |
| Works under type-stripping runtimes              | ✅             | ✅                 | ❌                        |

> ⚠️ **Moving target:** the ecosystem is moving against syntax that emits code. TypeScript 5.8 added
> `erasableSyntaxOnly`, and Node.js strips types rather than compiling them, so `enum` is losing
> support. The durable principle outlives the flags: prefer the form that disappears at build time,
> and pay for a runtime object only when you need to iterate the values.

A numeric enum still fits one case: **bitwise flags**, such as `Permission.Read | Permission.Write`.
There the type is meant to be open. Everywhere else that openness is a bug — any number fits, so
`setStatus(99)` compiles.

## When to Use It

| Scenario                                          | Reach for                      | Why                                                   |
| ------------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| A local whose value states its type               | No annotation                  | Inference is exact and follows the value as it changes |
| A parameter, or an exported return type           | An explicit annotation         | It is the contract; inference would let it drift      |
| A `fetch` body, `JSON.parse`, `postMessage`       | `unknown` plus a type guard    | The shape is a runtime fact, not a compile-time one   |
| A small fixed set used only in type positions     | Literal union                  | No runtime cost, and matches API strings              |
| Values you must iterate                           | `as const` object              | One source of truth for both layers                   |
| A codebase already full of enums                  | Keep the existing style        | Consistency beats a half-finished migration           |

## Common Mistakes

**❌ Using `any` to silence an error.** `any` spreads through every expression it touches, so one
annotation can switch off checking across a whole call path. If you do not know the type, use
`unknown`.

**❌ Widening a literal by accident:**

```typescript
let method = 'GET'; // ❌ inferred as string, so it will not fit 'GET' | 'POST'
const method = 'GET'; // ✅ inferred as 'GET'
```

**❌ Declaring the list twice.** A `type Role = 'admin' | 'user'` beside a separate `ROLES` array
will drift. Derive one from the other:
`const ROLES = ['admin', 'user'] as const; type Role = (typeof ROLES)[number];`

**❌ Forgetting `as const`.** Without it, `{ Pending: 'pending' }` has property type `string`, and the
derived union collapses to `string`.

**❌ Reading a type assertion as a check.** `data as User` tells the compiler to stop arguing. It
verifies nothing. Only a runtime guard establishes the shape.

> ⚠️ Types are erased at build time. There is no `instanceof MyInterface`, and nothing stops a
> wrongly-shaped JSON payload or an invalid role string at the boundary. Validate external input at
> runtime — a schema library, or `ROLES.includes(value)` against an `as const` array.

## 🔑 Key Takeaways

- Types exist only at compile time, so external data always needs a runtime check.
- Annotate function parameters and exported return types; let inference handle locals.
- `any` switches checking off and spreads; `unknown` is the safe container for unvalidated data.
- `never` powers exhaustiveness checks that turn a missed union member into a build failure.
- Prefer a literal union or an `as const` object to `enum`: they disappear at build time and accept raw strings.

## Interview Questions

**Q: What is the difference between `any` and `unknown`?**

Both accept any value. `any` also allows any operation, so it switches type checking off for that
value and everything derived from it. `unknown` allows nothing until you narrow it. At a boundary
that is what you want — the compiler forces the validation you should write anyway.

**Q: TypeScript compiled with no errors. What can still go wrong at runtime?**

Anything crossing a boundary the compiler cannot see: an API returning a different shape,
`localStorage`, `JSON.parse`, a library whose types are wrong, or an `as` assertion that lied. Type
erasure means none of these are checked, which is why validation belongs at the edges.

**Q: Should you use `enum` in new TypeScript?**

Usually not. It emits runtime code, does not tree-shake, its string form rejects raw values from an
API, and it fails under type-stripping runtimes. A literal union covers most needs, and an `as const`
object covers the rest with iteration.

**Q: When would you keep enums in a codebase that has them?**

When they are used consistently and widely. A partial migration leaves two conventions for one
concept, which costs more in confusion than the enums cost in bytes. Migrate when a module is being
rewritten anyway.

## What to Read Next

- [Chapter ?? — Interfaces and Type Aliases](#ch-interfaces-types) — describing object shapes properly
- [Chapter ?? — Type Guards](#ch-type-guards) — how to turn `unknown` into something usable
- [Chapter ?? — Advanced and Utility Types](#ch-advanced-types) — the `as const` and indexed-access mechanics in full
