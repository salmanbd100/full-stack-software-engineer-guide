# TypeScript Generics

## Table of Contents
- [What are Generics?](#what-are-generics)
- [Generic Functions](#generic-functions)
- [Generic Interfaces](#generic-interfaces)
- [Generic Constraints](#generic-constraints)
- [Real-World Patterns](#real-world-patterns)
- [Interview Questions](#interview-questions)

---

## What are Generics?

Generics let you write code that works with **any type** while keeping type safety. Think of `T` as a placeholder — you fill it in when you use the function or class.

```typescript
// ❌ Without generics — either duplicate code or lose type safety
function firstItem(arr: any[]): any {
  return arr[0];
}

const id = firstItem([1, 2, 3]);
id.toUpperCase(); // No error — but crashes at runtime!

// ✅ With generics — works with any type, stays safe
function firstItem<T>(arr: T[]): T | undefined {
  return arr[0];
}

const id = firstItem([1, 2, 3]);    // id: number | undefined
const name = firstItem(["Alice"]);  // name: string | undefined
id.toUpperCase();   // ❌ Error: number has no toUpperCase
name.toUpperCase(); // ✅ OK
```

---

## Generic Functions

```typescript
// Single type parameter
function identity<T>(value: T): T {
  return value;
}

// Multiple type parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const entry = pair("userId", 42); // [string, number]
const coords = pair(40.71, -74.00); // [number, number]

// Generic arrow function
const toArray = <T>(item: T): T[] => [item];
```

### Generic Higher-Order Functions

```typescript
function mapArray<T, U>(arr: T[], transform: (item: T) => U): U[] {
  return arr.map(transform);
}

const userNames = mapArray(users, (u) => u.name);   // string[]
const userIds = mapArray(users, (u) => u.id);       // number[]

function filterArray<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate);
}

const activeUsers = filterArray(users, (u) => u.active); // User[]
```

---

## Generic Interfaces

```typescript
// Generic API response
interface ApiResponse<T> {
  data: T;
  success: boolean;
  message: string;
  timestamp: string;
}

type UserResponse = ApiResponse<User>;
type UsersResponse = ApiResponse<User[]>;
type DeleteResponse = ApiResponse<{ deleted: boolean }>;

// Generic repository (common backend pattern)
interface Repository<T> {
  findById(id: number): Promise<T | null>;
  findAll(filters?: Partial<T>): Promise<T[]>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}

class UserRepository implements Repository<User> {
  async findById(id: number): Promise<User | null> {
    return db.users.findOne({ id });
  }
  // ... implement other methods
}
```

---

## Generic Constraints

### `extends` — require specific properties

```typescript
// T must have a name property
function logName<T extends { name: string }>(item: T): void {
  console.log(item.name);
}

logName({ name: "Alice", age: 28 }); // ✅
logName(42); // ❌ Error: number has no 'name' property
```

### `keyof` — type-safe property access

```typescript
// K must be a key that exists on T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: 1, name: "Alice", email: "alice@dev.com" };

const name = getProperty(user, "name");    // string
const id = getProperty(user, "id");        // number
const foo = getProperty(user, "foo");      // ❌ Error: 'foo' is not a key of user
```

### Default type parameters

```typescript
// T defaults to string if not specified
interface FormField<T = string> {
  value: T;
  error?: string;
  touched: boolean;
}

const emailField: FormField = { value: "", touched: false };          // T = string
const ageField: FormField<number> = { value: 0, touched: false };     // T = number
const termsField: FormField<boolean> = { value: false, touched: false }; // T = boolean
```

---

## Real-World Patterns

### Type-Safe Fetch Wrapper

```typescript
async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  return res.json() as Promise<T>;
}

// Usage — type inferred from the generic
const user = await fetchJson<User>("/api/users/1");           // User
const users = await fetchJson<User[]>("/api/users");          // User[]
const post = await fetchJson<Post>("/api/posts/42");          // Post
```

### Generic State Manager

```typescript
interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

function createInitialState<T>(): AsyncState<T> {
  return { data: null, loading: false, error: null };
}

const userState = createInitialState<User>();    // AsyncState<User>
const postsState = createInitialState<Post[]>(); // AsyncState<Post[]>
```

### Generic Error Handler

```typescript
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    const value = await fn();
    return { ok: true, value };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

const result = await safeAsync(() => fetchJson<User>("/api/users/1"));

if (result.ok) {
  console.log(result.value.name); // ✅ User
} else {
  console.error(result.error.message); // ✅ Error
}
```

---

## Interview Questions

### Q: What's the difference between `T` and `any`?

`any` turns off type checking — TypeScript won't catch errors. `T` is a **placeholder** that preserves type information through the function, so errors are caught at compile time.

```typescript
function echo<T>(val: T): T { return val; }

const s = echo("hello");
s.toFixed(); // ❌ Error — TypeScript knows s is string, not number
```

### Q: How do you constrain a generic type?

Use `extends`. This ensures `T` has certain properties before you use them.

```typescript
function sortByKey<T extends Record<string, string | number>>(
  arr: T[],
  key: keyof T
): T[] {
  return [...arr].sort((a, b) => (a[key] > b[key] ? 1 : -1));
}

sortByKey(users, "name"); // ✅ OK
sortByKey(users, "foo");  // ❌ Error: 'foo' not a key of User
```

### Q: When should you use generics?

Use generics when you want a function or class to work with **multiple types** while keeping each type's information. Common cases: utility functions, API wrappers, data structures (stacks, queues), React hooks.

---

[← Interfaces & Types](./02-interfaces-types.md) | [Next: Utility Types →](./04-utility-types.md)
