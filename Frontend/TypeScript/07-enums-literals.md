---
title: Enums and Literal Types
part: 1
chapter: 0
slug: enums-literals
level: intermediate # beginner | intermediate | advanced
reading_time: 7
updated: 2026-08-31
tags: [frontend, typescript, enums, literals]
in_book: true
---

# Enums and Literal Types {#ch-enums-literals}

> Model a fixed set of values without shipping a runtime object nobody asked for.

**In this chapter:** string literal unions · string enums · `as const` objects · what enums emit · when a numeric enum is still right

## 💡 The Core Idea

There are three ways to say "one of these five values", and they differ in one respect: **what exists
at runtime.** A literal union exists only at compile time and costs nothing. An `as const` object
exists as a plain object you can iterate. An `enum` exists as a generated object with its own rules
about what may be assigned to it. Pick by whether you need the values at runtime — not by which looks
most like the language you came from.

## How It Works

### Literal unions

```typescript
type UserRole = 'admin' | 'user' | 'guest';
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

async function setRole(userId: number, role: UserRole): Promise<void> {
  await fetch(`/api/users/${userId}/role`, { method: 'PATCH', body: JSON.stringify({ role }) });
}

setRole(1, 'admin'); // ✅
setRole(1, 'superuser'); // ❌ not a valid role
```

Zero runtime output, and the values are exactly the strings your API sends — no translation layer.
This is the default for a small fixed set.

### `as const` objects

```typescript
const OrderStatus = {
  Pending: 'pending',
  Shipped: 'shipped',
  Delivered: 'delivered',
} as const;

type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
// 'pending' | 'shipped' | 'delivered'

Object.values(OrderStatus); // ✅ iterable — for a dropdown, a validation list
setStatus('ord_1', OrderStatus.Shipped); // ✅ named access
setStatus('ord_1', 'shipped'); // ✅ the raw string works too
```

One declaration produces both the runtime list and the type, so they cannot drift. Accepting the raw
string matters at a boundary: JSON arrives as `'shipped'`, not as `OrderStatus.Shipped`.

### `enum`

```typescript
enum LogLevel {
  Error = 'ERROR',
  Info = 'INFO',
}

log(LogLevel.Info, 'started'); // ✅
log('INFO', 'started'); // ❌ a string enum is nominal — the raw value is rejected
```

A string enum is **nominally** typed: only its own members are assignable, even when the value is
identical. That is occasionally what you want and usually friction, because every payload crossing a
boundary needs converting.

### The comparison

| Property                    | Literal union | `as const` object | `enum`                 |
| --------------------------- | ------------- | ----------------- | ---------------------- |
| Runtime output               | None          | A plain object    | A generated object     |
| Iterate the values           | ❌             | ✅                 | ✅                      |
| Accepts the raw string       | ✅             | ✅                 | ❌                      |
| Tree-shakes                  | n/a           | ✅                 | ❌ (unless `const enum`) |
| Works with `erasableSyntaxOnly` / plain-JS runtimes | ✅ | ✅            | ❌                      |

That last row is why the direction of travel matters: `enum` is one of the few TypeScript features
that emits code rather than being erased, so it is incompatible with the type-stripping runtimes now
shipping in Node.js and browsers.

### Numeric enums, and where they still fit

```typescript
enum Permission {
  None = 0,
  Read = 1 << 0, // 1
  Write = 1 << 1, // 2
  Delete = 1 << 2, // 4
}

const granted = Permission.Read | Permission.Write; // 3

function has(current: number, required: Permission): boolean {
  return (current & required) === required;
}
```

Bitwise flags are the one case where a numeric enum reads better than the alternatives — the
combination `3` is not a member, and the type is meant to be open. Everywhere else, numeric enums are
the weakest option: a plain number is assignable to one, so `setStatus(99)` compiles.

## When to Use It

| Scenario                                        | Reach for                | Why                                            |
| ----------------------------------------------- | ------------------------ | ---------------------------------------------- |
| A handful of values used only in type positions   | Literal union            | No runtime cost, and matches API strings        |
| Values you must iterate — a dropdown, a validator | `as const` object        | One source of truth for both layers            |
| A large group of related constants                | `as const` object        | Namespaced access without an emitted enum       |
| Bitwise flags                                     | Numeric `enum`           | Combinations are the point; openness is correct |
| A codebase already full of enums                  | Keep the existing style  | Consistency beats a partial migration           |

## Common Mistakes

**❌ Reaching for `enum` because it is familiar.** It is the only option here that emits runtime code,
does not tree-shake, and rejects the raw values your API sends.

**❌ Trusting a numeric enum to validate.** Any number is assignable:

```typescript
enum Status {
  Active = 1,
  Inactive = 2,
}
declare function set(s: Status): void;
set(99); // ✅ compiles — the type is not closed
```

**❌ Declaring the list twice.** A `type Role = 'admin' | 'user'` beside a
`const ROLES = ['admin', 'user']` will diverge. Derive one:
`const ROLES = ['admin', 'user'] as const; type Role = (typeof ROLES)[number];`

**❌ Forgetting `as const`.** Without it, `{ Pending: 'pending' }` has property type `string`, and the
derived union collapses to `string` — silently losing every guarantee.

**❌ Using `const enum` in a library.** It relies on inlining, which breaks under `isolatedModules`
and under bundlers that compile files independently.

> ⚠️ A literal union is erased, so nothing validates a string arriving from JSON, a URL parameter or
> `localStorage`. Check it at the boundary — `ROLES.includes(value)` against an `as const` array is the
> cheapest form.

## 🔑 Key Takeaways

- The three options differ in what exists at runtime; choose on that, not on syntax familiarity.
- A literal union costs nothing and matches the strings your API actually sends.
- `as const` plus `(typeof x)[keyof typeof x]` gives iteration and a type from one declaration.
- String enums are nominal, so raw values are rejected at every boundary.
- Numeric enums accept any number, which makes them unsuitable for validation but right for bitwise flags.

## Interview Questions

**Q: Should you use `enum` in new TypeScript?**

Usually not. It is one of the few features that emits runtime code, it does not tree-shake, its string
form rejects the raw values arriving from an API, and it does not work under type-stripping runtimes.
A literal union covers most needs; an `as const` object covers the rest and gives you iteration.

**Q: How do you derive a type from a runtime array of values?**

`const ROLES = ['admin', 'user'] as const;` then `type Role = (typeof ROLES)[number];`. The `as const`
stops widening so the elements keep their literal types, and the indexed access over `number` produces
their union. One declaration serves the runtime check and the type.

**Q: When would you keep enums in a codebase that has them?**

When they are used consistently and widely. A partial migration leaves two conventions for the same
concept, which costs more in confusion than the enums cost in bundle size. Migrate when a module is
being rewritten anyway, or when the runtime constraint forces it.

## What to Read Next

- [Chapter ?? — Advanced Types](#ch-advanced-types) — the `as const` and indexed-access mechanics in full
- [Chapter ?? — Type Guards](#ch-type-guards) — validating one of these values at a boundary
- [Chapter ?? — Basic Types](#ch-basic-types) — literal types and where widening happens
