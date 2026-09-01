---
title: TypeScript Type Guards
part: 1
chapter: 0
slug: type-guards
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-31
tags: [frontend, typescript, type, guards]
in_book: true
---

# TypeScript Type Guards {#ch-type-guards}

> Narrow a wide type safely, and get a compile error when you forget a case.

**In this chapter:** `typeof` and `instanceof` · the `in` operator · `value is T` predicates · discriminated unions · exhaustiveness with `never`

## 💡 The Core Idea

A type guard is a **runtime** check the compiler understands. That pairing is the whole point:
`typeof value === 'string'` is a real check that survives compilation, and TypeScript uses it to
narrow the type inside the branch. It is the only honest way to move from a wide type — `unknown`, a
union, an API payload — to a specific one, because it is the only way that actually verifies anything.
An `as` assertion narrows the type and checks nothing.

## How It Works

| Guard                     | Narrows                                      | Reach for it when                      |
| ------------------------- | -------------------------------------------- | -------------------------------------- |
| `typeof x === 'string'`   | Primitives                                    | Unions of primitives                  |
| `x instanceof Error`      | Class instances, `Date`, `Error`, `Array`      | Error handling, class hierarchies      |
| `'permissions' in user`   | Object shapes by key presence                  | Unions without a discriminant          |
| `x.kind === 'circle'`     | Discriminated unions                           | Any union you control the shape of     |
| `isUser(x)` returning `x is User` | Anything                              | Boundaries, and reusable checks         |

### `typeof`, and the `null` trap

```typescript
function format(value: string | number): string {
  if (typeof value === 'string') return value.toUpperCase(); // string here
  return value.toFixed(2); // number here
}
```

`typeof null` is `'object'`, so a `null` slips into any object branch:

```typescript
if (typeof value === 'object') { /* ❌ null reaches here */ }
if (value !== null && typeof value === 'object') { /* ✅ */ }
```

### `instanceof`

The most common use is error handling, because a `catch` binding is `unknown`:

```typescript
function describe(err: unknown): string {
  if (err instanceof ApiError) return `API ${err.statusCode}: ${err.message}`;
  if (err instanceof Error) return err.message; // ApiError is also an Error, so order matters
  return 'Unknown error';
}
```

> ⚠️ `instanceof` compares prototype chains, so it fails across realms — a `Date` from an iframe or a
> Node worker is not `instanceof` your `Date`. It also fails for a class extending a built-in when
> compiled to ES5 without an explicit `Object.setPrototypeOf`.

### `in`

`if ('permissions' in user)` narrows a union by key presence, and inside the branch
`user.permissions` is available. Useful where you cannot add a discriminant — a third-party union, for
example. A discriminant is better where you own the type.

### Type predicates

A function returning `value is T` becomes a reusable guard. This is how you validate an external
payload once and narrow everywhere:

```typescript
function isUser(value: unknown): value is User {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.name === 'string';
}

const raw: unknown = await fetchJson('/api/users/1');
if (!isUser(raw)) throw new Error('Unexpected response shape');
raw.name; // User
```

The predicate is a **promise you make to the compiler**, not one it checks. A guard whose body is
wrong is as unsafe as a cast — write the body to match the type exactly, or use a schema library that
derives both from one declaration.

**Predicates are also what makes `filter` narrow:**

```typescript
const items: (User | null)[] = [/* … */];

const stillMaybe = items.filter((i) => i !== null); // ❌ (User | null)[]

function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}
const users: User[] = items.filter(isNotNull); // ✅
```

### Discriminated unions and exhaustiveness

```tsx
type RequestState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

function render(state: RequestState<User>): JSX.Element {
  switch (state.status) {
    case 'loading':
      return <Spinner />;
    case 'success':
      return <UserCard user={state.data} />; // `data` exists only here
    case 'error':
      return <ErrorBanner message={state.error} />;
    default: {
      // Add a fourth state and this line fails to compile
      const exhaustive: never = state;
      return exhaustive;
    }
  }
}
```

The `never` assignment in `default` is the highest-value four lines in this chapter: it converts
"someone added a case and forgot to handle it" from a production bug into a build failure.

## When to Use It

| Scenario                                        | Reach for                        | Why                                              |
| ----------------------------------------------- | -------------------------------- | ------------------------------------------------ |
| A union of primitives                            | `typeof`                         | Direct, and the compiler knows it                |
| A `catch` binding                                | `instanceof`, most specific first | The binding is `unknown`; nothing else narrows it |
| An API response, `localStorage`, `postMessage`    | A predicate, or a schema library  | The shape is a runtime fact                      |
| A union you designed                              | A literal discriminant field      | Enables `switch` narrowing and exhaustiveness    |
| Filtering nulls out of an array                   | A generic `value is T` predicate  | Plain `filter` does not narrow                   |

## Common Mistakes

**❌ Using `as` where you meant a check.** `data as User` silences the compiler and verifies nothing.
Every runtime shape bug in a "fully typed" codebase starts here.

**❌ Checking `typeof x === 'object'` before ruling out `null`.**

**❌ Writing a predicate whose body does not match its claim.** `return typeof v === 'object'` inside
an `is User` guard claims far more than it checks, and the compiler believes it.

**❌ Ordering `instanceof` checks from general to specific.** `err instanceof Error` first means the
`ApiError` branch is dead code.

**❌ Expecting narrowing to survive a callback.** TypeScript discards narrowing across a function
boundary because the value could change in between:

```typescript
if (user.avatar !== undefined) {
  setTimeout(() => load(user.avatar)); // ❌ possibly undefined again
}
const avatar = user.avatar; // ✅ capture in a const first
```

## 🔑 Key Takeaways

- A type guard is a runtime check the compiler understands; an `as` assertion is neither.
- `typeof null` is `'object'`, so rule out `null` before narrowing to an object.
- A `value is T` predicate is a promise you make, not one the compiler verifies — write the body to match.
- Plain `filter` does not narrow; a predicate does.
- A `never` assignment in `default` turns an unhandled union member into a compile error.

## Interview Questions

**Q: What is a type predicate, and what is its main risk?**

A function whose return type is `value is T`. When it returns `true`, the compiler narrows the argument
in the calling branch. The risk is that the compiler trusts the signature without checking the body, so
an incomplete check gives you the same false confidence as a cast — which is why generated guards from
a schema are safer than hand-written ones.

**Q: How does exhaustiveness checking work?**

Narrowing removes handled members from a union, so in the `default` branch the value's type is the
union of everything unhandled. Assigning it to `never` succeeds only when nothing is left. Add a member
and the assignment fails to compile at that line, pointing directly at the switch that needs updating.

**Q: Why does narrowing not survive into a callback?**

Because the compiler cannot prove the value has not changed between the check and the callback running
— another function could reassign the property. Capturing the narrowed value in a `const` fixes it,
since a `const` cannot be reassigned and the narrowing holds.

## What to Read Next

- [Chapter ?? — Interfaces and Type Aliases](#ch-interfaces-types) — designing unions worth narrowing
- [Chapter ?? — Advanced Types](#ch-advanced-types) — conditional types, the type-level form of a branch
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — schema validation at a real boundary
