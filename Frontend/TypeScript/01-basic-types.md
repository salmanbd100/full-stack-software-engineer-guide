# TypeScript Basic Types

## Table of Contents
- [Why TypeScript?](#why-typescript)
- [Primitive Types](#primitive-types)
- [Type Annotations vs Inference](#type-annotations-vs-inference)
- [Special Types](#special-types)
- [Arrays and Tuples](#arrays-and-tuples)
- [Functions](#functions)
- [Interview Questions](#interview-questions)

---

## Why TypeScript?

TypeScript adds types to JavaScript. It catches bugs **before** your code runs, not after.

```typescript
// JavaScript — no error until runtime
function getUser(id) {
  return fetch(`/api/users/${id}`);
}
getUser(undefined); // Oops — runtime bug

// TypeScript — error caught at compile time
function getUser(id: number): Promise<Response> {
  return fetch(`/api/users/${id}`);
}
getUser(undefined); // ❌ Error: Argument of type 'undefined' is not assignable to type 'number'
```

---

## Primitive Types

| Type | Example | Notes |
|------|---------|-------|
| `string` | `"Alice"`, `` `Hello ${name}` `` | Text values |
| `number` | `42`, `3.14` | All numbers, including floats |
| `boolean` | `true`, `false` | Only true or false |
| `null` | `null` | Intentional absence of value |
| `undefined` | `undefined` | Variable not yet assigned |

```typescript
// Realistic example: user profile
let username: string = "alice_dev";
let age: number = 28;
let isPremium: boolean = true;
let lastLogin: Date | null = null; // hasn't logged in yet
```

> `null` and `undefined` are different. Use `null` when you intentionally set "no value". Use `undefined` for something that hasn't been set yet.

---

## Type Annotations vs Inference

TypeScript can **infer** types automatically. You don't always need to write them.

```typescript
// ✅ Let TypeScript infer — cleaner
let count = 0;         // inferred: number
let name = "Alice";    // inferred: string
let active = true;     // inferred: boolean

// ✅ Add annotation when the type isn't obvious
let userId: string | number = getUserId(); // could be either
let status: "pending" | "active" | "inactive" = "pending"; // literal union

// ❌ Over-annotating obvious types
let message: string = "Hello"; // redundant — TypeScript already knows
```

**Rule of thumb:** Let TypeScript infer when the value makes the type obvious. Be explicit for function parameters, return types, and union types.

---

## Special Types

### 💡 **any vs unknown**

Both allow "any value" but `unknown` is **safe** — you must check the type before using it.

```typescript
// ❌ any — skips all type checking
let data: any = fetchFromApi();
data.user.name.toUpperCase(); // No error — but crashes if data is null

// ✅ unknown — forces you to check first
let data: unknown = fetchFromApi();

if (typeof data === "object" && data !== null && "user" in data) {
  console.log(data); // Safe access
}
```

| | `any` | `unknown` |
|--|-------|-----------|
| Type checking | Disabled | Required before use |
| Safe? | ❌ No | ✅ Yes |
| Use when | Migrating JS code | Receiving external data |

### 💡 **void vs never**

```typescript
// void — function returns nothing (or undefined)
function logError(message: string): void {
  console.error(message);
}

// never — function NEVER returns (throws or loops forever)
function throwError(message: string): never {
  throw new Error(message);
}

// Practical use: exhaustive switch
type Status = "active" | "inactive" | "banned";

function handleStatus(status: Status): string {
  switch (status) {
    case "active": return "Welcome back!";
    case "inactive": return "Account paused";
    case "banned": return "Access denied";
    default:
      const _exhausted: never = status; // TypeScript errors if you miss a case
      return _exhausted;
  }
}
```

---

## Arrays and Tuples

```typescript
// Arrays — all elements same type
const userIds: number[] = [1, 2, 3];
const tags: string[] = ["typescript", "react", "node"];
const mixed: (string | number)[] = [1, "two", 3]; // union element type

// Tuple — fixed length, specific types per position
type Coordinate = [number, number];
const point: Coordinate = [40.7128, -74.0060]; // NYC lat/lng

// Named tuples (TypeScript 4.0+) — more readable
type PaginationResult = [data: unknown[], total: number, page: number];
const result: PaginationResult = [users, 150, 2];
const [data, total, page] = result; // destructure
```

```typescript
// Real-world: CSV row parsing
function parseUserRow(row: string): [id: number, name: string, email: string] {
  const [id, name, email] = row.split(",");
  return [parseInt(id), name, email];
}

const [userId, userName, userEmail] = parseUserRow("1,Alice,alice@dev.com");
```

---

## Functions

```typescript
// Always type parameters and return values in exported/public functions
function createUser(name: string, email: string, role: "admin" | "user" = "user"): User {
  return { id: Date.now(), name, email, role };
}

// Optional parameters
function greet(name: string, greeting?: string): string {
  return `${greeting ?? "Hello"}, ${name}!`;
}

// Rest parameters
function mergeConfigs(...configs: Partial<Config>[]): Config {
  return Object.assign({}, ...configs);
}

// Function type alias — useful for callbacks and props
type EventHandler<T = void> = (event: T) => void;
type AsyncFn<T> = () => Promise<T>;
```

---

## Interview Questions

### Q: What's the difference between `any` and `unknown`?

`any` turns off type checking — you can call any method and TypeScript won't complain. `unknown` is safer: TypeScript won't let you use the value until you prove what type it is with a type guard.

```typescript
let a: any = "hello";
a.toFixed(); // No error — but crashes at runtime!

let u: unknown = "hello";
u.toUpperCase(); // ❌ Error
if (typeof u === "string") u.toUpperCase(); // ✅ OK
```

### Q: What's the difference between `void` and `never`?

`void` means a function returns `undefined` (or nothing). `never` means the function **never reaches the end** — it always throws or loops forever.

### Q: When should you use explicit type annotations vs letting TypeScript infer?

Infer for local variables with obvious types (`let count = 0`). Use explicit annotations for function parameters, public API return types, and union types that TypeScript can't guess (`let id: string | number`).

---

[← Back to TypeScript](./README.md) | [Next: Interfaces & Types →](./02-interfaces-types.md)
