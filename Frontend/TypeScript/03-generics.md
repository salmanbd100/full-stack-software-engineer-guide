---
title: TypeScript Generics
part: 1
chapter: 0
slug: generics
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-31
tags: [frontend, typescript, generics]
in_book: true
---

# TypeScript Generics {#ch-generics}

> Write a function once and keep the caller's exact type all the way through it.

**In this chapter:** generic functions · generic interfaces · constraints with `extends` · inference · when a generic is overkill

## 💡 The Core Idea

A generic is a **relationship** between types, not a placeholder for "any type". `T[] → T` says the
element type coming out is the element type that went in. That relationship is the whole value: the
caller's concrete type survives the call, so `first([1, 2])` is `number | undefined` rather than
`any`. If a type parameter appears only once in a signature, it is expressing no relationship — and
is almost certainly the wrong tool.

## How It Works

```typescript
// ❌ `any` loses the type on the way through
function firstAny(arr: any[]): any {
  return arr[0];
}
firstAny([1, 2]).toUpperCase(); // compiles; crashes

// ✅ the generic ties output to input
function first<T>(arr: readonly T[]): T | undefined {
  return arr[0];
}
first([1, 2]).toUpperCase(); // ❌ number has no toUpperCase — caught
```

Two or more parameters express a relationship between several positions:

```typescript
function mapArray<T, U>(arr: readonly T[], transform: (item: T) => U): U[] {
  return arr.map(transform);
}

const names = mapArray(users, (u) => u.name); // string[] — U inferred from the callback
```

### Generic interfaces and classes

```typescript
interface Repository<T> {
  findById(id: number): Promise<T | null>;
  create(data: Omit<T, 'id'>): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
}

class UserRepository implements Repository<User> {} // T is fixed once, for every member
```

Naming the parameter once at the interface makes every member consistent — `create` cannot accidentally
take a different entity from `findById`.

### Constraints

`extends` narrows what a type parameter may be, which is what lets you actually use the value inside:

```typescript
// without the constraint, `item.name` would not compile
function logName<T extends { name: string }>(item: T): void {
  console.log(item.name);
}
```

`keyof` is the constraint that matters most in day-to-day code, because it makes property access
type-safe:

```typescript
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: 'Alice' };
getProperty(user, 'name'); // string
getProperty(user, 'nope'); // ❌ not a key of user
```

Note the return type: `T[K]`, an **indexed access type**, not a union of all value types. That is why
`getProperty(user, 'id')` is `number` and not `number | string`.

### Defaults

```typescript
interface FormField<T = string> {
  value: T;
  touched: boolean;
}

const email: FormField = { value: '', touched: false }; // T = string
const age: FormField<number> = { value: 0, touched: false };
```

### Inference

TypeScript infers type arguments from the call, so you rarely write them. Supply one explicitly when
there is nothing to infer from — a return-position-only parameter:

```typescript
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const user = await fetchJson<User>('/api/users/1'); // nothing in the args reveals T
```

That signature is honest about only one thing — it does **not** validate that the body is a `User`.
`fetchJson<T>` is an assertion dressed as a generic; pair it with a runtime schema check at any
boundary you do not control.

## When to Use It

| Scenario                                         | Reach for                     | Why                                              |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------ |
| The return type depends on an argument's type     | A generic function            | The relationship is the point                    |
| A container or wrapper reused across entities     | A generic interface or class  | One declaration keeps every member consistent    |
| Property access by key                            | `K extends keyof T`, returning `T[K]` | Typos fail; the exact value type comes back |
| Several functions taking the same shape           | A plain `interface` parameter | No relationship to express — a generic adds noise |
| Untyped external data                             | `unknown` plus validation     | A generic here only asserts, it does not check   |

**A `Result` type is the common case worth memorising:**

```typescript
type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, value: await fn() };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}
```

## Common Mistakes

**❌ A type parameter used once.** It relates nothing to nothing:

```typescript
function log<T>(value: T): void {} // ❌ identical to (value: unknown): void
```

**❌ Constraining with `any`.** `<T extends any>` constrains nothing; either leave it unconstrained or
constrain it to the shape you actually use.

**❌ Reaching for a generic instead of a union.** If the function handles exactly three known types,
`string | number | Date` says so plainly. A generic implies it works for anything.

**❌ Treating `fetchJson<User>()` as validation.** The type argument tells the compiler what to
assume; nothing checks the payload. This is the most common way a "fully typed" codebase still throws
`undefined is not an object` in production.

**❌ Over-parameterising.** Four type parameters on one function means the signature is doing too
much. Split it, or accept a concrete type.

> ⚠️ Generics are erased at compile time. There is no way to branch on `T` at runtime, no `new T()`,
> and no `typeof T`. Anything that must exist at runtime has to be passed as a value.

## 🔑 Key Takeaways

- A generic expresses a relationship between types; a parameter used once expresses nothing.
- `extends` is what makes a type parameter usable inside the function body.
- `K extends keyof T` returning `T[K]` is the type-safe property-access pattern.
- Type arguments are inferred from arguments — write them only where nothing infers.
- A generic return type is an assertion, not validation; check external data at runtime.

## Interview Questions

**Q: How do you constrain a generic, and why would you need to?**

With `extends`. Without a constraint the compiler knows nothing about `T`, so you cannot read a
property or call a method on it. `T extends { id: number }` allows `item.id`;
`K extends keyof T` restricts a key argument to keys that exist.

**Q: When is a generic the wrong tool?**

When the type parameter appears once, which means it expresses no relationship and `unknown` would do.
When the set of types is small and known, where a union is clearer. And when the real need is runtime
validation — a generic return type only tells the compiler what to assume.

**Q: What does `function getProperty<T, K extends keyof T>(obj: T, key: K): T[K]` buy over `(obj: object, key: string): unknown`?**

Two things. A key that does not exist on the object fails to compile rather than returning
`undefined` at runtime. And the return type is the exact type of that property, so no cast or
narrowing is needed at the call site.

## What to Read Next

- [Chapter ?? — Utility Types](#ch-utility-types) — the generics the standard library already gives you
- [Chapter ?? — Advanced Types](#ch-advanced-types) — conditional and mapped types built on constraints
- [Chapter ?? — Type Guards](#ch-type-guards) — validating what a generic only assumes
