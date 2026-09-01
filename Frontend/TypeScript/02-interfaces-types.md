---
title: Interfaces and Type Aliases
part: 1
chapter: 0
slug: interfaces-types
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-31
tags: [frontend, typescript, interfaces, types]
in_book: true
---

# Interfaces and Type Aliases {#ch-interfaces-types}

> Pick between `interface` and `type` on the two grounds that actually differ, not on preference.

**In this chapter:** declaration merging · unions and primitives · extending vs intersecting · optional vs `undefined`

## 💡 The Core Idea

`interface` and `type` overlap almost completely for object shapes. Two things genuinely differ:
**only `interface` merges** when declared twice, and **only `type` can name something that is not an
object** — a union, a primitive, a tuple, a function signature. Every other difference people cite is
either style or a version-old detail. Decide on those two, and stop arguing.

## How It Works

```typescript
interface User {
  id: number;
  name: string;
  role: 'admin' | 'user';
  avatar?: string; // may be absent entirely
  readonly createdAt: Date; // assignable at creation, never after
}
```

`readonly` and `?` are the two modifiers that carry real weight: `readonly` stops later assignment,
`?` makes the key optional. Both are compile-time only.

### What only `type` can do

```typescript
type ID = string | number; // a union
type Status = 'pending' | 'active'; // literal union
type Pagination = [page: number, limit: number]; // a tuple
type Middleware = (req: Request, next: () => void) => void; // a call signature
type Admin = User & { permissions: string[] }; // an intersection
```

### What only `interface` can do

```typescript
// Two declarations of one name merge. This is how you add a field to a
// third-party type you do not own — Express's Request, for example
interface Request {
  user?: User;
}
interface Request {
  requestId: string;
}
// Request now has both
```

Declaration merging is a feature at a library boundary and a hazard inside your own code, where two
files silently contributing to one type is a debugging problem. A duplicate `type` is an error, which
in your own code is usually what you want.

| Capability                        | `interface` | `type` |
| --------------------------------- | ----------- | ------ |
| Object shape                       | ✅           | ✅      |
| Union, primitive, tuple            | ❌           | ✅      |
| Mapped and conditional types       | ❌           | ✅      |
| Declaration merging                | ✅           | ❌      |
| `extends`                          | ✅           | Via `&` |
| `implements` on a class            | ✅           | ✅      |

### Extending versus intersecting

`interface Product extends BaseEntity` and `type Product = BaseEntity & { … }` reach the same shape by
different routes. `extends` checks compatibility as it goes, so a
conflicting property is an error at the declaration. `&` does not — a conflict silently produces a
member of type `never`, which then fails at the assignment instead. That makes `extends` the better
error message, and it is the reason to prefer it for object shapes.

### Discriminated unions

The most valuable pattern in the language: a union whose members share a literal-typed field, which
the compiler uses to narrow.

```typescript
type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function render(state: RequestState<User>): string {
  if (state.status === 'success') return state.data.name; // `data` exists only here
  if (state.status === 'error') return state.error; // `error` exists only here
  return 'Loading…';
}
```

This is strictly better than an object with optional fields — `{ data?: T; error?: string }` allows
both, or neither, and the compiler cannot tell you which state you are in.

### Optional versus `| undefined`

```typescript
interface A {
  age?: number; // the key may be missing
}
interface B {
  age: number | undefined; // the key must be present; the value may be undefined
}

const a: A = {}; // ✅
const b: B = {}; // ❌ Property 'age' is missing
const b2: B = { age: undefined }; // ✅
```

Use `?` for genuinely optional data. Use `| undefined` when the caller must acknowledge the field —
a patch object where "not sent" and "sent as empty" mean different things.
`exactOptionalPropertyTypes` tightens this further by stopping `?` fields accepting an explicit
`undefined`.

## When to Use It

| Scenario                                       | Reach for                       | Why                                              |
| ---------------------------------------------- | ------------------------------- | ------------------------------------------------ |
| An object shape, especially one others extend    | `interface`                     | Better errors on conflict; merges for library augmentation |
| A union, tuple, primitive alias or function type | `type`                          | `interface` cannot express them                  |
| Mutually exclusive states                        | A discriminated union of `type`s | The compiler proves which fields exist          |
| Adding a field to a third-party type             | `interface` declaration merging  | The only mechanism that works                   |
| A derived shape — omit, pick, partial            | `type` with utility types        | Stays in step with the source type              |

**Deriving inputs from the model rather than restating them:**

```typescript
type CreateUserInput = Omit<User, 'id' | 'createdAt'> & { password: string };
type UpdateUserInput = Partial<CreateUserInput>;
```

## Common Mistakes

**❌ Modelling state with optional fields.** `{ loading?: boolean; data?: T; error?: string }` permits
eight combinations, most of them meaningless. A discriminated union permits exactly the states that
exist.

**❌ Using an index signature to avoid naming keys.** `{ [key: string]: string }` gives up every
autocomplete and typo check on that object. `Record<'submit' | 'cancel', string>` keeps them.

**❌ Assuming an interface catches an extra property.** Excess-property checking applies only to a
fresh object literal. Assign through a variable first and the extra field passes unnoticed:

```typescript
const input = { id: 1, name: 'a', typo: true };
const user: User = input; // ✅ compiles — no literal, no excess check
```

**❌ Reaching for `&` on object shapes out of habit.** A conflicting property becomes `never` and the
error surfaces far from the declaration. `extends` reports it where you wrote it.

**❌ Merging your own interfaces by accident.** Two files declaring `interface Config` in the same
scope quietly become one type. If that was not deliberate, use `type`, which errors instead.

## 🔑 Key Takeaways

- Only `interface` merges across declarations; only `type` can name a union, tuple, primitive or function.
- Prefer `extends` over `&` for object shapes — conflicts are reported at the declaration.
- A discriminated union lets the compiler prove which fields exist in each state.
- `?` means the key may be absent; `| undefined` means the key is required and its value may not be set.
- Excess-property checking only fires on fresh object literals, not on assignment through a variable.

## Interview Questions

**Q: When would you use `interface` over `type`?**

For object shapes, especially ones other code extends or a library consumer augments — `extends` gives
clearer conflict errors, and declaration merging is the only way to add a field to a third-party type.
`type` for anything that is not an object shape: unions, tuples, function signatures, mapped and
conditional types.

**Q: What is a discriminated union and why prefer it to optional fields?**

A union whose members share a field with distinct literal types, which TypeScript uses to narrow.
Optional fields describe the union of every combination, so the compiler cannot rule out
`{ loading: true, error: 'x' }`. The discriminated form makes impossible states unrepresentable, and
narrowing gives you the right fields in each branch with no casting.

**Q: Why did TypeScript not catch this extra property?**

Excess-property checking is a special case that only applies to object literals assigned directly to a
typed target. Assigning through an intermediate variable makes it a normal structural compatibility
check, and extra properties are compatible. Annotate at the point of creation to keep the check.

## What to Read Next

- [Chapter ?? — Generics](#ch-generics) — making these shapes reusable across types
- [Chapter ?? — Utility Types](#ch-utility-types) — `Omit`, `Pick` and `Partial` in depth
- [Chapter ?? — Type Guards](#ch-type-guards) — narrowing a discriminated union at a boundary
