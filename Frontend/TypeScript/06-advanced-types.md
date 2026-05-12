# TypeScript Advanced Types

## Table of Contents
- [Union Types](#union-types)
- [Intersection Types](#intersection-types)
- [Template Literal Types](#template-literal-types)
- [Conditional Types](#conditional-types)
- [Mapped Types](#mapped-types)
- [as const Assertion](#as-const-assertion)
- [Interview Questions](#interview-questions)

---

## Union Types

A value can be **one of several types**. Use `|` to combine them.

```typescript
// Primitive unions
type ID = string | number;
type Status = "active" | "inactive" | "banned";

// Object unions — narrowing required to access type-specific props
type SearchResult = UserResult | PostResult | CommentResult;

interface UserResult   { kind: "user";    id: number; name: string }
interface PostResult   { kind: "post";    id: number; title: string }
interface CommentResult { kind: "comment"; id: number; body: string }

function renderResult(result: SearchResult) {
  switch (result.kind) {
    case "user":    return result.name;   // ✅ name exists here
    case "post":    return result.title;  // ✅ title exists here
    case "comment": return result.body;   // ✅ body exists here
  }
}
```

### Accepting strings and arrays

```typescript
// Accept single item or array — flexible API design
type OneOrMany<T> = T | T[];

function processIds(ids: OneOrMany<number>): number[] {
  return Array.isArray(ids) ? ids : [ids];
}

processIds(1);         // ✅ → [1]
processIds([1, 2, 3]); // ✅ → [1, 2, 3]
```

---

## Intersection Types

A value must satisfy **all types at once**. Use `&` to combine them.

```typescript
interface HasTimestamps {
  createdAt: Date;
  updatedAt: Date;
}

interface HasSoftDelete {
  deletedAt: Date | null;
}

// All DB entities get timestamps + soft delete
type BaseEntity = HasTimestamps & HasSoftDelete;

interface User extends BaseEntity {
  id: number;
  name: string;
  email: string;
}
// User must have: id, name, email, createdAt, updatedAt, deletedAt

// Merging object shapes at runtime
function mergeOptions<A, B>(defaults: A, overrides: B): A & B {
  return { ...defaults, ...overrides } as A & B;
}
```

⚠️ If two intersected types have the **same property with different types**, that property becomes `never`.

```typescript
type A = { id: string };
type B = { id: number };
type C = A & B;

const c: C = { id: "1" }; // ❌ id is never — can't be both string and number
```

---

## Template Literal Types

Build **string types** from patterns. Great for generating type-safe event names, CSS classes, or API routes.

```typescript
// Basic pattern
type EventName = "click" | "focus" | "blur" | "change";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus" | "onBlur" | "onChange"

// API route patterns
type Resource = "users" | "posts" | "comments";
type CrudRoute = `/${Resource}` | `/${Resource}/:id`;
// "/users" | "/users/:id" | "/posts" | "/posts/:id" | ...

// CSS property pattern
type FlexDirection = "row" | "column";
type FlexWrap = "nowrap" | "wrap";
type FlexFlow = `${FlexDirection} ${FlexWrap}`;
// "row nowrap" | "row wrap" | "column nowrap" | "column wrap"
```

### Real-world: Event emitter with typed events

```typescript
type AppEvents = {
  "user:login": { userId: number; timestamp: Date };
  "user:logout": { userId: number };
  "order:placed": { orderId: string; total: number };
};

function emit<K extends keyof AppEvents>(event: K, payload: AppEvents[K]): void {
  eventBus.emit(event, payload);
}

emit("user:login", { userId: 1, timestamp: new Date() }); // ✅
emit("user:login", { userId: "1" }); // ❌ userId must be number
```

---

## Conditional Types

Select a type based on a condition. Syntax: `T extends U ? X : Y`.

```typescript
// Simple check
type IsArray<T> = T extends any[] ? true : false;

type A = IsArray<string[]>; // true
type B = IsArray<number>;   // false
```

### `infer` — extract types from other types

```typescript
// Extract the element type from an array
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type E1 = ArrayElement<string[]>;   // string
type E2 = ArrayElement<User[]>;     // User
type E3 = ArrayElement<number>;     // never (not an array)

// Extract the resolved value from a Promise
type Unpacked<T> = T extends Promise<infer U> ? U : T;

type P1 = Unpacked<Promise<string>>; // string
type P2 = Unpacked<number>;          // number (unchanged)

// Real use: infer function return from an async function
type AsyncReturn<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;

async function getUser(): Promise<User> { /* ... */ }

type FetchedUser = AsyncReturn<typeof getUser>; // User
```

---

## Mapped Types

Transform every property in a type. The foundation of utility types like `Partial` and `Readonly`.

```typescript
// Make all values a specific type (e.g., stringify for forms)
type Stringified<T> = {
  [K in keyof T]: string;
};

type StringifiedUser = Stringified<User>;
// { id: string; name: string; email: string; role: string }

// Add a "dirty" flag per field (form state tracking)
type FormFields<T> = {
  [K in keyof T]: { value: T[K]; dirty: boolean; error?: string };
};

type UserForm = FormFields<Pick<User, "name" | "email">>;
// {
//   name: { value: string; dirty: boolean; error?: string }
//   email: { value: string; dirty: boolean; error?: string }
// }
```

### Key remapping (TypeScript 4.1+)

```typescript
// Generate getter methods from a type
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<Pick<User, "name" | "email">>;
// { getName: () => string; getEmail: () => string }
```

---

## as const Assertion

`as const` makes TypeScript treat values as **literal types** instead of widening them.

```typescript
// Without as const — types are widened
const config = {
  method: "GET",    // type: string (not "GET")
  timeout: 5000,    // type: number (not 5000)
};

// With as const — types are literal and readonly
const config = {
  method: "GET",
  timeout: 5000,
} as const;
// { readonly method: "GET"; readonly timeout: 5000 }

// Extract union type from an array
const ROLES = ["admin", "user", "guest"] as const;
type Role = typeof ROLES[number]; // "admin" | "user" | "guest"

// Object-based enum pattern (common in modern TS)
const HttpStatus = {
  OK: 200,
  Created: 201,
  NotFound: 404,
  ServerError: 500,
} as const;

type HttpStatusCode = typeof HttpStatus[keyof typeof HttpStatus];
// 200 | 201 | 404 | 500
```

---

## Interview Questions

### Q: What's the difference between union and intersection?

Union (`|`) means "this OR that" — a value can be one of the types. Intersection (`&`) means "this AND that" — a value must satisfy all types.

```typescript
type A = { x: number };
type B = { y: string };

const union: A | B = { x: 1 };           // OK — just A
const inter: A & B = { x: 1, y: "hi" }; // Must have both x AND y
```

### Q: What is `infer` used for?

`infer` lets you **capture a type** inside a conditional type check. It's used in utility types like `ReturnType` and `Awaited`.

```typescript
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

### Q: When would you use template literal types?

When you need to generate many string types from combinations of other string literals. Common uses: event names (`onClick`), API routes (`/users/:id`), CSS properties, and typed internationalization keys.

---

[← Type Guards](./05-type-guards.md) | [Next: Enums & Literals →](./07-enums-literals.md)
