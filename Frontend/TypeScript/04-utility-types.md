# TypeScript Utility Types

## Table of Contents
- [Property Modifiers](#property-modifiers)
- [Shape Selection](#shape-selection)
- [Record — Key-Value Types](#record)
- [Type Extraction](#type-extraction)
- [Union Filtering](#union-filtering)
- [Combining Utilities](#combining-utilities)
- [Interview Questions](#interview-questions)

---

## Property Modifiers

### 💡 `Partial<T>` — Make all properties optional

Most useful for **PATCH/update endpoints** where you only send what changed.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
}

// PATCH /api/users/:id — only send fields you want to update
async function updateUser(id: number, changes: Partial<User>): Promise<User> {
  return fetchJson(`/api/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(changes),
  });
}

updateUser(1, { name: "Bob" });          // ✅ Only update name
updateUser(1, { email: "b@dev.com" });   // ✅ Only update email
```

### 💡 `Required<T>` — Make all properties required

Opposite of `Partial`. Removes all `?` from properties.

```typescript
interface Config {
  apiUrl?: string;
  timeout?: number;
  retries?: number;
}

// After validation, we know all values are present
function startApp(config: Required<Config>): void {
  console.log(`Connecting to ${config.apiUrl}...`);
}
```

### 💡 `Readonly<T>` — Prevent mutations

```typescript
// Config should not change after startup
const appConfig: Readonly<Config> = {
  apiUrl: "https://api.example.com",
  timeout: 5000,
  retries: 3,
};

appConfig.timeout = 10000; // ❌ Error: cannot assign to readonly property
```

---

## Shape Selection

### 💡 `Pick<T, Keys>` — Keep only specific properties

Use when you need a **subset** of a type, like a public view that excludes sensitive fields.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "admin" | "user";
}

// Safe to send to the frontend
type PublicUser = Pick<User, "id" | "name" | "email">;

function toPublicUser(user: User): PublicUser {
  return { id: user.id, name: user.name, email: user.email };
}
```

### 💡 `Omit<T, Keys>` — Remove specific properties

Use when it's easier to say what to **exclude**.

```typescript
// POST /api/users — id is auto-generated, don't send it
type CreateUserInput = Omit<User, "id" | "passwordHash"> & { password: string };

async function createUser(input: CreateUserInput): Promise<User> {
  return fetchJson("/api/users", { method: "POST", body: JSON.stringify(input) });
}
```

| | `Pick` | `Omit` |
|--|--------|--------|
| Use when | Short list of fields to **keep** | Short list of fields to **remove** |
| Example | `Pick<User, "id" \| "name">` | `Omit<User, "password">` |

---

## Record

### 💡 `Record<Keys, Value>` — Typed key-value map

```typescript
// ✅ Status message lookup
type Status = "pending" | "processing" | "shipped" | "delivered";

const statusLabels: Record<Status, string> = {
  pending: "Waiting for payment",
  processing: "Being prepared",
  shipped: "On the way",
  delivered: "Delivered",
};

// ✅ In-memory cache
const userCache: Record<number, User> = {};

function getCachedUser(id: number): User | undefined {
  return userCache[id];
}
```

---

## Type Extraction

### 💡 `ReturnType<T>` — Get what a function returns

```typescript
function getAuthPayload() {
  return {
    userId: 1,
    email: "alice@dev.com",
    role: "admin" as const,
    expiresAt: new Date(),
  };
}

// Don't repeat yourself — extract the type from the function
type AuthPayload = ReturnType<typeof getAuthPayload>;
// { userId: number; email: string; role: "admin"; expiresAt: Date }
```

### 💡 `Awaited<T>` — Unwrap Promise types

```typescript
async function fetchUser(id: number): Promise<User> {
  return fetchJson(`/api/users/${id}`);
}

// Get the resolved type of an async function
type FetchedUser = Awaited<ReturnType<typeof fetchUser>>; // User

// Useful for extracting types from Promise chains
type ResolvedData = Awaited<Promise<{ items: string[]; total: number }>>;
// { items: string[]; total: number }
```

### `Parameters<T>` — Get function parameter types

```typescript
function createPost(title: string, content: string, authorId: number) { /* ... */ }

type CreatePostArgs = Parameters<typeof createPost>;
// [title: string, content: string, authorId: number]

// Useful for typed wrappers
function loggedCreatePost(...args: Parameters<typeof createPost>) {
  console.log("Creating post:", args[0]);
  return createPost(...args);
}
```

---

## Union Filtering

### `NonNullable<T>` — Remove null and undefined

```typescript
type MaybeUser = User | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>; // User

// Useful in array filtering
const users: (User | null)[] = [user1, null, user2, null];
const validUsers: User[] = users.filter((u): u is User => u !== null);
```

### `Extract<T, U>` and `Exclude<T, U>`

```typescript
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

// Keep only the listed types
type SafeMethod = Extract<HttpMethod, "GET" | "POST">;
// "GET" | "POST"

// Remove specific types
type MutatingMethod = Exclude<HttpMethod, "GET">;
// "POST" | "PUT" | "DELETE" | "PATCH"
```

---

## Combining Utilities

Utilities compose. Chain them for precise types.

```typescript
interface UserProfile {
  id: number;
  name: string;
  email: string;
  bio?: string;
  avatar?: string;
  passwordHash: string;
  role: "admin" | "user";
}

// Public profile for API response
type PublicProfile = Readonly<Omit<UserProfile, "passwordHash">>;

// Fields available for self-update
type SelfUpdateInput = Partial<Pick<UserProfile, "name" | "bio" | "avatar">>;

// Admin can update these
type AdminUpdateInput = Partial<Omit<UserProfile, "id" | "passwordHash">>;
```

---

## Interview Questions

### Q: What's the difference between `Pick` and `Omit`?

`Pick` says "only keep these fields". `Omit` says "remove these fields, keep the rest". Use `Pick` when the list to keep is small; use `Omit` when the list to remove is small.

### Q: When would you use `Partial`?

For update (PATCH) operations where not all fields are required. Also for default configs, optional form states, and deep merge utilities.

### Q: How do you get the return type of an async function?

```typescript
async function fetchOrder(id: number): Promise<Order> { /* ... */ }

type Order = Awaited<ReturnType<typeof fetchOrder>>;
```

Use `Awaited` to unwrap the Promise, then `ReturnType` to get the inner type.

---

[← Generics](./03-generics.md) | [Next: Type Guards →](./05-type-guards.md)
