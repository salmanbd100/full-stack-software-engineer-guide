---
title: TypeScript Utility Types
part: 1
chapter: 0
slug: utility-types
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-08-31
tags: [frontend, typescript, utility, types]
in_book: true
---

# TypeScript Utility Types {#ch-utility-types}

> Derive a type from an existing one instead of maintaining two that drift apart.

**In this chapter:** `Partial`, `Required`, `Readonly` · `Pick` and `Omit` · `Record` · `ReturnType` and `Parameters` · `Exclude` and `Extract`

## 💡 The Core Idea

Every type you hand-write twice is a type that will disagree with itself eventually. Utility types
make one declaration the source of truth and derive the rest — the create input, the update patch, the
public view. Add a field to the model and every derived type follows; forget to handle it somewhere and
the build tells you. That is the entire argument, and it is why these matter more than their
one-line definitions suggest.

## How It Works

Assume one model throughout:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  bio?: string;
}
```

### Property modifiers

| Utility        | Effect                        | Typical use                              |
| -------------- | ----------------------------- | ---------------------------------------- |
| `Partial<T>`   | Every property optional        | A PATCH body, a config override           |
| `Required<T>`  | Every property required        | Config after defaults have been applied   |
| `Readonly<T>`  | Every property `readonly`      | Frozen configuration, reducer state       |

```typescript
async function updateUser(id: number, changes: Partial<User>): Promise<User> {
  return fetchJson(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(changes) });
}
```

All three are **shallow**. `Readonly<T>` protects the top level and nothing below it; there is no
built-in deep variant.

### Selecting a shape

```typescript
// keep a few
type PublicUser = Pick<User, 'id' | 'name' | 'email'>;

// remove a few
type CreateUserInput = Omit<User, 'id' | 'passwordHash'> & { password: string };
type UpdateUserInput = Partial<CreateUserInput>;
```

| Use        | When                                       | Fails how                                            |
| ---------- | ------------------------------------------ | ---------------------------------------------------- |
| `Pick`     | The list to keep is shorter                 | A key that does not exist is an error                |
| `Omit`     | The list to remove is shorter               | A key that does not exist is **silently ignored**    |

That asymmetry matters. `Omit<User, 'pasword'>` compiles happily and quietly omits nothing, so a
renamed field leaves a hole. `Pick` catches the same typo immediately — a reason to prefer it for
anything security-sensitive, like stripping `passwordHash`.

### `Record`

```typescript
type Status = 'pending' | 'shipped' | 'delivered';

// Every member of the union must appear — add a status and this fails to compile
const labels: Record<Status, string> = {
  pending: 'Waiting for payment',
  shipped: 'On the way',
  delivered: 'Delivered',
};

const cache: Record<number, User> = {}; // an open-ended map
```

`Record` over a literal union is an exhaustiveness check you get for free. `Record<string, T>` is the
opposite — an index signature that gives up key checking entirely.

### Extracting from functions

```typescript
function getAuthPayload() {
  return { userId: 1, role: 'admin' as const, expiresAt: new Date() };
}

type AuthPayload = ReturnType<typeof getAuthPayload>;
type Args = Parameters<typeof createPost>; // a labelled tuple

async function fetchUser(id: number): Promise<User> { /* … */ }
type Fetched = Awaited<ReturnType<typeof fetchUser>>; // User, not Promise<User>
```

`typeof` in a type position is the bridge from a value to its type. `ReturnType` and `Parameters`
without it is the commonest beginner error here.

**A typed wrapper needs no signature of its own:**

```typescript
function loggedCreatePost(...args: Parameters<typeof createPost>): ReturnType<typeof createPost> {
  return createPost(...args);
}
```

### Filtering unions

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

type Mutating = Exclude<HttpMethod, 'GET'>; // 'POST' | 'PUT' | 'DELETE'
type Safe = Extract<HttpMethod, 'GET' | 'HEAD'>; // 'GET'
type Definite = NonNullable<User | null | undefined>; // User
```

`Exclude` and `Extract` operate on **union members**, while `Omit` and `Pick` operate on **object
keys**. Reaching for the wrong pair is the most common mix-up in this chapter.

### Composing

```typescript
type PublicProfile = Readonly<Omit<User, 'passwordHash'>>;
type SelfUpdate = Partial<Pick<User, 'name' | 'bio'>>;
type AdminUpdate = Partial<Omit<User, 'id' | 'passwordHash'>>;
```

## When to Use It

| Scenario                                       | Reach for                        | Why                                            |
| ---------------------------------------------- | -------------------------------- | ---------------------------------------------- |
| A PATCH endpoint body                           | `Partial<Model>`                 | Every field optional, none invented            |
| An API view that must not leak a field           | `Pick<Model, …>`                 | A typo in the key list fails the build         |
| A lookup that must cover every union member      | `Record<Union, V>`               | Missing a member is a compile error            |
| Reusing a function's shape in a wrapper          | `Parameters` and `ReturnType`    | The wrapper cannot drift from the original     |
| Narrowing an existing union                      | `Exclude` / `Extract`            | Stays correct when the union gains a member    |

## Common Mistakes

**❌ Trusting `Omit` to catch a typo.** It accepts keys that do not exist. Prefer `Pick` where the
consequence of a miss is a leaked field, or constrain it:
`Omit<User, Extract<keyof User, 'passwordHash'>>`.

**❌ Forgetting `typeof`.** `ReturnType<getAuthPayload>` is an error; the argument must be a *type*, so
it is `ReturnType<typeof getAuthPayload>`.

**❌ Expecting `Readonly` or `Partial` to go deep.** They apply to the top level only.
`Readonly<Config>` leaves `config.db.host` writable.

**❌ Using `Exclude` on object keys.** `Exclude<User, 'id'>` does nothing useful — `User` is not a
union. `Omit<User, 'id'>` is the key-level operation.

**❌ `Record<string, T>` as the default map type.** It permits every string key, so typos in reads
return `undefined` silently. Use a literal union when the keys are known.

> ⚠️ `Partial<T>` on an update object hides a real ambiguity: `{ bio: undefined }` and `{}` are
> different intentions — "clear the field" versus "leave it alone" — and `Partial` types them the same.
> Model the distinction explicitly if the API cares.

## 🔑 Key Takeaways

- Deriving types from one model is what stops the create, update and view shapes drifting apart.
- `Pick` rejects a key that does not exist; `Omit` ignores it — prefer `Pick` where a miss leaks data.
- `Record` over a literal union is a free exhaustiveness check; over `string` it is an index signature.
- `ReturnType`, `Parameters` and `Awaited` need `typeof` to turn a function value into a type.
- `Exclude`/`Extract` filter union members; `Omit`/`Pick` filter object keys.

## Interview Questions

**Q: What is the difference between `Pick` and `Omit`, beyond direction?**

`Pick` constrains its keys to `keyof T`, so a misspelling is a compile error. `Omit` accepts any key,
so a misspelling silently omits nothing. Direction decides which is shorter to write; that asymmetry
decides which is safer when the consequence is exposing a field you meant to strip.

**Q: When would you not use `Partial` for an update type?**

When "field absent" and "field explicitly cleared" must be distinguished — `Partial` collapses them.
Also when some fields are genuinely required in an update, such as a version for optimistic locking:
`Partial<Pick<T, …>> & { version: number }` states that, and `Partial<T>` does not.

**Q: Why prefer `Record<Status, string>` to `Record<string, string>` for a label map?**

The literal union forces every status to have a label, so adding a status breaks the build at the map
rather than rendering `undefined`. `Record<string, string>` accepts any key, so a typo in either the
definition or the lookup passes silently.

## What to Read Next

- [Chapter ?? — Advanced Types](#ch-advanced-types) — how these utilities are implemented, with mapped and conditional types
- [Chapter ?? — Interfaces and Type Aliases](#ch-interfaces-types) — the models you derive from
- [Chapter ?? — Generics](#ch-generics) — the mechanism every utility type is built on
