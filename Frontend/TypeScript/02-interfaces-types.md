# Interfaces & Types

## Table of Contents
- [Interfaces](#interfaces)
- [Type Aliases](#type-aliases)
- [Interface vs Type](#interface-vs-type)
- [Extending and Composing](#extending-and-composing)
- [Real-World Patterns](#real-world-patterns)
- [Interview Questions](#interview-questions)

---

## Interfaces

An interface describes the **shape** of an object. It's a contract — anything that uses the interface must have these properties.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  role: "admin" | "user";
  avatar?: string;       // optional
  readonly createdAt: Date; // cannot be changed after creation
}

const user: User = {
  id: 1,
  name: "Alice",
  email: "alice@dev.com",
  role: "admin",
  createdAt: new Date(),
};

user.name = "Bob";       // ✅ OK
user.createdAt = new Date(); // ❌ Error: readonly
```

### Interface with Methods

```typescript
interface Repository<T> {
  findById(id: number): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, "id">): Promise<T>;
  update(id: number, data: Partial<T>): Promise<T>;
  delete(id: number): Promise<void>;
}
```

### Index Signatures — Dynamic Keys

```typescript
interface TranslationMap {
  [key: string]: string; // any string key → string value
}

const labels: TranslationMap = {
  submit: "Submit",
  cancel: "Cancel",
  loading: "Loading...",
};
```

---

## Type Aliases

Type aliases can represent **anything** — primitives, unions, intersections, tuples, or functions.

```typescript
// Union type — one of several values
type Status = "pending" | "active" | "suspended";
type ID = string | number;

// Object shape (similar to interface)
type Address = {
  street: string;
  city: string;
  country: string;
};

// Intersection — combine multiple types
type UserWithAddress = User & { address: Address };

// Tuple
type Pagination = [page: number, limit: number];

// Function signature
type Middleware = (req: Request, res: Response, next: () => void) => void;
```

---

## Interface vs Type

| Feature | `interface` | `type` |
|---------|-------------|--------|
| Object shapes | ✅ | ✅ |
| Union types | ❌ | ✅ |
| Tuple types | ❌ | ✅ |
| Extend/merge | `extends` keyword | `&` intersection |
| Declaration merging | ✅ (same name = merge) | ❌ (error on duplicate) |
| Implements in classes | ✅ | ✅ |

### Declaration Merging — interfaces only

```typescript
// Useful for extending third-party types (e.g., Express Request)
interface Request {
  user?: User;
}

interface Request {
  requestId: string;
}
// Both declarations merge into one Request type
```

### ✅ Use `interface` for:
- Object shapes you might extend later
- Public API contracts
- Classes that `implement` it

### ✅ Use `type` for:
- Union types: `type Status = "pending" | "done"`
- Intersection types: `type Admin = User & { permissions: string[] }`
- Tuples, function signatures, primitives

---

## Extending and Composing

```typescript
// Interface extends interface
interface BaseEntity {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

interface Product extends BaseEntity {
  name: string;
  price: number;
  stock: number;
}

// Multiple inheritance
interface Post extends BaseEntity {
  title: string;
  content: string;
  authorId: number;
}

// Type intersection — same result
type AuditedProduct = Product & { auditedBy: string };
```

---

## Real-World Patterns

### API Response Types

```typescript
interface ApiResponse<T> {
  data: T;
  message: string;
  success: boolean;
}

interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

// Usage
async function getUsers(): Promise<PaginatedResponse<User>> {
  const res = await fetch("/api/users?page=1&limit=20");
  return res.json();
}
```

### Form Data Types

```typescript
// Separate form state from the DB model
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Create input excludes auto-generated fields
type CreateUserInput = Omit<User, "id" | "createdAt"> & {
  password: string;
};

// Update input makes all fields optional
type UpdateUserInput = Partial<Omit<User, "id" | "createdAt">>;
```

### Discriminated Union for State

```typescript
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

// Type-safe state handling
function renderUser(state: RequestState<User>) {
  if (state.status === "success") {
    return state.data.name; // ✅ TypeScript knows data exists here
  }
  if (state.status === "error") {
    return state.error; // ✅ TypeScript knows error exists here
  }
}
```

---

## Common Pitfall: Optional vs Undefined

```typescript
// ❌ These look similar but behave differently
interface A {
  age?: number; // age can be omitted entirely
}

interface B {
  age: number | undefined; // age MUST be present (even if undefined)
}

const a: A = { name: "Alice" }; // ✅ age omitted — OK
// const b: B = {}; // ❌ Error: age is missing
const b: B = { age: undefined }; // ✅ Must explicitly include it
```

---

## Interview Questions

### Q: When should you use `interface` vs `type`?

Default to `interface` for object shapes. Use `type` for unions, intersections, and tuples.

```typescript
interface User { id: number; name: string; } // object shape → interface
type Status = "active" | "inactive";          // union → type
type AdminUser = User & { permissions: string[] }; // intersection → type
```

### Q: What is declaration merging?

Only interfaces support it. If you declare the same interface twice, TypeScript merges them into one. This is useful for extending third-party types like Express's `Request`.

### Q: What is a discriminated union?

A union where each member has a common property with a unique literal value. TypeScript uses that property to narrow the type.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape) {
  if (s.kind === "circle") return Math.PI * s.radius ** 2;
  return s.side ** 2;
}
```

---

[← Basic Types](./01-basic-types.md) | [Next: Generics →](./03-generics.md)
