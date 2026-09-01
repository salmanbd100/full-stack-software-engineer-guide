---
title: TypeScript Advanced Types
part: 1
chapter: 0
slug: advanced-types
level: advanced # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-31
tags: [frontend, typescript, advanced, types]
in_book: true
---

# TypeScript Advanced Types {#ch-advanced-types}

> Compute types from other types, and know when that power stops paying for itself.

**In this chapter:** unions and intersections · template literal types · conditional types and `infer` · mapped types · `as const`

## 💡 The Core Idea

TypeScript's type system is a small functional language of its own: it has values (types), branches
(conditional types), iteration (mapped types) and pattern matching (`infer`). Everything in this
chapter is a program that runs at compile time and produces a type. The judgement worth developing
alongside the syntax is **when to stop** — a type that takes ten minutes to read costs more than the
bug it prevents.

## How It Works

### Unions and intersections

`|` means one of; `&` means all of.

```typescript
type ID = string | number;
type BaseEntity = { createdAt: Date } & { deletedAt: Date | null };
```

An intersection with a conflicting property produces `never` for that property, so the type is
uninhabitable and the error appears at the assignment rather than the declaration:

```typescript
type C = { id: string } & { id: number };
const c: C = { id: '1' }; // ❌ id is never
```

For object shapes, `interface … extends` reports the same conflict where you wrote it. Use `&` for
composing type aliases, not as a habit.

### Template literal types

String types built from patterns — which turns stringly-typed APIs into checked ones:

```typescript
type EventName = 'click' | 'focus' | 'blur';
type Handler = `on${Capitalize<EventName>}`; // 'onClick' | 'onFocus' | 'onBlur'

type Resource = 'users' | 'posts';
type Route = `/${Resource}` | `/${Resource}/:id`;
```

Combinations multiply, so two unions of four members produce sixteen types. That is fine; four unions
of ten members produce ten thousand and the compiler will tell you so.

**A typed event bus is the pattern worth remembering:**

```typescript
type AppEvents = {
  'user:login': { userId: number };
  'order:placed': { orderId: string; total: number };
};

function emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {}

emit('user:login', { userId: 1 }); // ✅
emit('user:login', { userId: '1' }); // ❌ wrong payload for this event
```

### Conditional types and `infer`

`T extends U ? X : Y` is a branch. `infer` captures a type from the pattern being matched.

```typescript
type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;
type E1 = ArrayElement<User[]>; // User

type Unpacked<T> = T extends Promise<infer U> ? U : T;
type P1 = Unpacked<Promise<string>>; // string
```

This is how the standard utilities are built:
`type ReturnType<T> = T extends (...args: never[]) => infer R ? R : never`.

Conditional types **distribute** over a naked type parameter, which is the behaviour that surprises
people: `ArrayElement<string[] | number[]>` is `string | number`, because the condition is applied to
each member separately. Wrapping the parameter in a tuple — `[T] extends [U]` — switches distribution
off.

### Mapped types

Iterate over the keys of a type and transform each one:

```typescript
type Stringified<T> = { [K in keyof T]: string };

// Per-field form state — a real use, not a toy
type FormFields<T> = {
  [K in keyof T]: { value: T[K]; dirty: boolean; error?: string };
};
```

Key remapping (TypeScript 4.1 and later) rewrites the key itself, which is how you generate a derived
API surface:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
// Getters<{ name: string }> is { getName: () => string }
```

`Partial`, `Readonly` and `Pick` are all one-line mapped types — knowing that is what lets you write
the variant the standard library does not have, such as a deep `Readonly`.

### `as const`

Stops widening, and marks everything `readonly`:

```typescript
const config = { method: 'GET', timeout: 5000 } as const;
// { readonly method: 'GET'; readonly timeout: 5000 }

// Deriving a union from a runtime array — one source of truth for both
const ROLES = ['admin', 'user', 'guest'] as const;
type Role = (typeof ROLES)[number]; // 'admin' | 'user' | 'guest'

const HttpStatus = { OK: 200, NotFound: 404 } as const;
type StatusCode = (typeof HttpStatus)[keyof typeof HttpStatus]; // 200 | 404
```

That last pattern is the modern replacement for `enum`: one object that exists at runtime, and a union
type derived from it, with no separate declaration to keep in step.

## When to Use It

| Scenario                                          | Reach for                          | Why                                            |
| ------------------------------------------------- | ---------------------------------- | ---------------------------------------------- |
| A list of values needed at runtime **and** as a type | `as const` plus `(typeof x)[number]` | One declaration, no drift                  |
| Event names, route paths, i18n keys                | Template literal types             | Turns a string typo into a compile error        |
| The same transformation across every field         | A mapped type                       | One rule instead of a hand-written twin type   |
| Extracting a type from inside another               | A conditional type with `infer`     | The only mechanism that can pattern-match      |
| A shape used in exactly one place                   | Write it out longhand               | A computed type costs reader time forever      |

## Common Mistakes

**❌ Reaching for a conditional type where an overload is clearer.** A function whose return type
depends on an argument is usually better expressed as two overloads than as a conditional type the
caller cannot read in an error message.

**❌ Forgetting that conditional types distribute.** `NonNullable<T>` works precisely *because* it
distributes; a check you meant to apply to the whole union will silently apply per member. Use
`[T] extends [U]` when you want the union treated as one thing.

**❌ Using `&` to extend an interface.** Conflicts become `never` and surface far from the declaration.
`extends` reports them immediately.

**❌ Treating `as const` as deep immutability.** It is compile-time only, and does not freeze the
object at runtime. `Object.freeze` does that, one level deep.

**❌ Building a type so clever it cannot be read.** A five-line conditional type with three `infer`
positions is a maintenance liability. If the alternative is a small amount of duplication, take the
duplication.

> ⚠️ Deeply recursive types hit the compiler's instantiation limit and slow every build and editor
> keystroke in the project. If `tsc --generateTrace` points at one of your helpers, simplify it rather
> than raising limits.

## 🔑 Key Takeaways

- The type system is a compile-time language: conditional types branch, mapped types iterate, `infer` pattern-matches.
- Conditional types distribute over naked type parameters — wrap in a tuple to stop it.
- An intersection with conflicting properties yields `never`, so prefer `extends` for object shapes.
- `as const` plus `(typeof x)[number]` derives a union from a runtime array, replacing `enum`.
- Cleverness has an ongoing cost in build time and readability; duplication is sometimes the cheaper option.

## Interview Questions

**Q: What does `infer` do?**

It captures a type from within a conditional type's pattern, binding it to a name usable in the true
branch. `T extends Promise<infer U> ? U : T` matches any promise and gives back its resolved type.
`ReturnType`, `Parameters` and `Awaited` are all built from it.

**Q: What is distribution in conditional types, and when does it bite?**

When the checked type is a naked type parameter and the argument is a union, the condition is applied
to each member and the results are unioned. That is what makes `Exclude` and `NonNullable` work. It
bites when you intended a single check on the whole union — `[T] extends [U]` disables it.

**Q: Why prefer `as const` objects over `enum`?**

A numeric `enum` allows any number to be assigned to it and emits a runtime object with reverse
mappings; `const enum` cannot be used across module boundaries in some build setups. An `as const`
object is plain JavaScript, tree-shakes, and derives an exact literal union — one declaration serving
both the runtime and the type layer.

## What to Read Next

- [Chapter ?? — Utility Types](#ch-utility-types) — the standard mapped and conditional types
- [Chapter ?? — Enums and Literal Types](#ch-enums-literals) — why `as const` usually wins
- [Chapter ?? — Generics](#ch-generics) — the constraints these computations rely on
