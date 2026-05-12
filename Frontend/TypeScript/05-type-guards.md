# TypeScript Type Guards

## Table of Contents
- [What are Type Guards?](#what-are-type-guards)
- [typeof Guards](#typeof-guards)
- [instanceof Guards](#instanceof-guards)
- [in Operator](#in-operator)
- [Custom Type Guards](#custom-type-guards)
- [Discriminated Unions](#discriminated-unions)
- [Exhaustiveness Checking](#exhaustiveness-checking)
- [Interview Questions](#interview-questions)

---

## What are Type Guards?

A type guard is a check that tells TypeScript "inside this block, I know for sure what type this is."

```typescript
// Without type guard — TypeScript won't let you call string methods
function format(value: string | number): string {
  return value.toUpperCase(); // ❌ Error: toUpperCase doesn't exist on number
}

// With type guard — TypeScript narrows the type inside each branch
function format(value: string | number): string {
  if (typeof value === "string") {
    return value.toUpperCase(); // ✅ value is string here
  }
  return value.toFixed(2); // ✅ value is number here
}
```

---

## typeof Guards

Use for **primitive types**: `string`, `number`, `boolean`, `function`, `undefined`.

```typescript
function processInput(input: string | number | boolean | null): string {
  if (input === null) return "null";
  if (typeof input === "string") return input.trim();
  if (typeof input === "number") return input.toLocaleString();
  return input ? "yes" : "no";
}
```

⚠️ **Watch out:** `typeof null === "object"` — this is a JavaScript quirk. Always check `=== null` separately before checking `typeof`.

```typescript
// ❌ Buggy
if (typeof value === "object") { /* includes null! */ }

// ✅ Safe
if (value !== null && typeof value === "object") { /* real object */ }
```

---

## instanceof Guards

Use for **class instances** and built-in objects like `Date`, `Error`, `Array`.

```typescript
// Safe error handling — the most common use of instanceof
async function fetchData(url: string) {
  try {
    const res = await fetch(url);
    return await res.json();
  } catch (err) {
    if (err instanceof Error) {
      console.error("Fetch failed:", err.message); // ✅ Safe to access .message
    } else {
      console.error("Unknown error:", err);
    }
  }
}

// With class hierarchies
class ApiError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

class ValidationError extends Error {
  constructor(public fields: string[], message: string) {
    super(message);
  }
}

function handleError(err: unknown) {
  if (err instanceof ApiError) {
    return `API Error ${err.statusCode}: ${err.message}`;
  }
  if (err instanceof ValidationError) {
    return `Validation failed on: ${err.fields.join(", ")}`;
  }
  if (err instanceof Error) {
    return err.message;
  }
  return "Unknown error";
}
```

---

## in Operator

Use to check if a **property exists** on an object. Good for distinguishing between interfaces.

```typescript
interface AdminUser {
  id: number;
  name: string;
  permissions: string[]; // only admin has this
}

interface RegularUser {
  id: number;
  name: string;
}

type AnyUser = AdminUser | RegularUser;

function getAccess(user: AnyUser): string {
  if ("permissions" in user) {
    return `Admin with ${user.permissions.length} permissions`; // user is AdminUser
  }
  return "Regular user"; // user is RegularUser
}
```

---

## Custom Type Guards

A custom type guard is a function that returns `value is SomeType`. TypeScript uses the return value to narrow the type.

```typescript
// Basic pattern
function isString(value: unknown): value is string {
  return typeof value === "string";
}

// Validate an API response matches expected shape
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "name" in value &&
    "email" in value &&
    typeof (value as User).id === "number" &&
    typeof (value as User).name === "string" &&
    typeof (value as User).email === "string"
  );
}

const raw = await fetchJson("/api/users/1");
if (isUser(raw)) {
  console.log(raw.name); // ✅ TypeScript knows this is a User
} else {
  throw new Error("Unexpected response shape");
}
```

### Type Guard in Array Filter

Regular `filter` does NOT narrow types. A type guard function does.

```typescript
const items: (User | null)[] = [...];

// ❌ Type is still (User | null)[] — filter doesn't narrow
const notNull = items.filter(item => item !== null);

// ✅ Type is User[] — type guard narrows correctly
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const users = items.filter(isNotNull); // User[]
```

---

## Discriminated Unions

A discriminated union is a union where each member has a shared property with a **unique literal value**. TypeScript uses that property to know which type you're in.

```typescript
// Async request state — very common in React apps
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };

function renderUser(state: RequestState<User>) {
  switch (state.status) {
    case "idle":
      return <p>Press a button to load</p>;
    case "loading":
      return <Spinner />;
    case "success":
      return <UserCard user={state.data} />;  // ✅ data is User here
    case "error":
      return <ErrorBanner message={state.error} />; // ✅ error is string here
  }
}
```

```typescript
// Payment methods — each has different required fields
type PaymentMethod =
  | { type: "card"; cardNumber: string; cvv: string }
  | { type: "bank"; accountNumber: string; routingNumber: string }
  | { type: "paypal"; email: string };

function processPayment(method: PaymentMethod, amount: number) {
  switch (method.type) {
    case "card":
      chargeCard(method.cardNumber, method.cvv, amount); // ✅ cardNumber exists
      break;
    case "bank":
      transferBank(method.accountNumber, amount);        // ✅ accountNumber exists
      break;
    case "paypal":
      payViaPaypal(method.email, amount);               // ✅ email exists
      break;
  }
}
```

---

## Exhaustiveness Checking

TypeScript can verify you've handled **every case** in a union. Use `never` in the `default` branch.

```typescript
type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

function getStatusLabel(status: OrderStatus): string {
  switch (status) {
    case "pending":      return "Awaiting payment";
    case "processing":   return "Being prepared";
    case "shipped":      return "On the way";
    case "delivered":    return "Delivered";
    case "cancelled":    return "Order cancelled";
    default:
      const _exhaustive: never = status;
      // If you add "returned" to OrderStatus without handling it,
      // TypeScript will error here — not at runtime.
      throw new Error(`Unhandled status: ${_exhaustive}`);
  }
}
```

---

## Interview Questions

### Q: What's the difference between `typeof` and `instanceof`?

`typeof` checks **primitive types** (string, number, boolean, etc.). `instanceof` checks if an object is an **instance of a class**.

```typescript
typeof "hello" === "string";      // true
typeof 42 === "number";           // true
typeof null === "object";         // true (quirk — always check null first)

new Date() instanceof Date;       // true
new Error() instanceof Error;     // true
[] instanceof Array;              // true
```

### Q: What is a type predicate?

A function with return type `value is SomeType`. It's a custom type guard. When it returns `true`, TypeScript narrows the type inside the `if` block.

```typescript
function isError(value: unknown): value is Error {
  return value instanceof Error;
}
```

### Q: What are discriminated unions good for?

They model **mutually exclusive states** in a type-safe way. Common examples: request loading/success/error, payment method variations, different notification types. TypeScript ensures you handle all cases.

---

[← Utility Types](./04-utility-types.md) | [Next: Advanced Types →](./06-advanced-types.md)
