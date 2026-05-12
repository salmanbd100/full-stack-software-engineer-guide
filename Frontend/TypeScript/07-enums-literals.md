# Enums & Literal Types

## Table of Contents
- [String Literal Types](#string-literal-types)
- [String Enums](#string-enums)
- [as const Objects — The Modern Approach](#as-const-objects)
- [When to Use Which](#when-to-use-which)
- [Numeric Enums](#numeric-enums)
- [Interview Questions](#interview-questions)

---

## String Literal Types

The simplest approach. No runtime overhead. Works great with APIs.

```typescript
// User roles
type UserRole = "admin" | "user" | "guest";

// Order status
type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";

// HTTP methods
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

// Theme
type Theme = "light" | "dark" | "system";
```

```typescript
// Usage in a real scenario
interface User {
  id: number;
  name: string;
  role: UserRole;  // type-safe, maps directly to database/API value
}

async function updateUserRole(userId: number, role: UserRole): Promise<void> {
  await fetch(`/api/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role }), // "admin" or "user" or "guest"
  });
}

updateUserRole(1, "admin");    // ✅
updateUserRole(1, "superuser"); // ❌ Error: not a valid role
```

---

## String Enums

Enums group related constants under a **namespace** and show up in autocomplete.

```typescript
enum LogLevel {
  Error = "ERROR",
  Warning = "WARNING",
  Info = "INFO",
  Debug = "DEBUG",
}

function log(level: LogLevel, message: string): void {
  console.log(`[${level}] ${message}`);
}

log(LogLevel.Info, "Server started");   // [INFO] Server started
log(LogLevel.Error, "Connection lost"); // [ERROR] Connection lost

// ⚠️ Enums require using the enum member — raw strings don't work
log("INFO", "test"); // ❌ Error: must use LogLevel.Info
```

### Iterating over enum values

```typescript
enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

// Get all values for a dropdown
const statusOptions = Object.values(Status);
// ["pending", "active", "inactive"]

// Get all keys
const statusKeys = Object.keys(Status) as (keyof typeof Status)[];
// ["Pending", "Active", "Inactive"]
```

---

## as const Objects — The Modern Approach

This pattern gives you the **best of both worlds**: enum-like autocomplete + literal type safety + zero runtime overhead.

```typescript
// Define as a const object
const OrderStatus = {
  Pending: "pending",
  Processing: "processing",
  Shipped: "shipped",
  Delivered: "delivered",
  Cancelled: "cancelled",
} as const;

// Extract the union type from values
type OrderStatus = (typeof OrderStatus)[keyof typeof OrderStatus];
// "pending" | "processing" | "shipped" | "delivered" | "cancelled"

// Usage — accepts both object access and raw strings
function updateStatus(orderId: string, status: OrderStatus): void {
  console.log(`Order ${orderId} → ${status}`);
}

updateStatus("ord_123", OrderStatus.Shipped); // ✅ Object access
updateStatus("ord_123", "shipped");           // ✅ Raw string also works
updateStatus("ord_123", "lost");              // ❌ Error: not a valid status
```

---

## When to Use Which

| Feature | Literal Types | `as const` Object | Enum |
|---------|--------------|-------------------|------|
| Runtime object | ❌ None | ✅ Yes | ✅ Yes |
| Iterate values | ❌ No | ✅ Yes | ✅ Yes |
| Accept raw strings | ✅ Yes | ✅ Yes | ❌ No |
| Autocomplete | ✅ IDEs suggest | ✅ Via object | ✅ Via enum |
| Bundle impact | Zero | Tiny | Small |
| API compatibility | ✅ Great | ✅ Great | ⚠️ Needs `.value` |

### Decision guide

```
Do you need to iterate or loop over all values?
├── Yes → use as const object or enum
└── No → use literal types

Do you want raw strings to be accepted (e.g. from JSON API)?
├── Yes → use literal types or as const object
└── No → use enum (strictly requires enum members)

Is this a large group of related constants (HTTP codes, permission flags)?
├── Yes → use enum or as const object
└── No → literal types are simplest
```

---

## Numeric Enums

Use sparingly. Most useful for **bitwise permission flags** or HTTP status codes.

```typescript
// Bitwise permission flags — one of the best uses for numeric enums
enum Permission {
  None    = 0,
  Read    = 1 << 0, // 1
  Write   = 1 << 1, // 2
  Delete  = 1 << 2, // 4
}

const userPermissions = Permission.Read | Permission.Write; // 3

function hasPermission(user: number, required: Permission): boolean {
  return (user & required) === required;
}

hasPermission(userPermissions, Permission.Read);   // true
hasPermission(userPermissions, Permission.Delete);  // false
```

⚠️ Numeric enums accept **any number**, not just defined values. Use string enums or `as const` when you need strict validation.

---

## Interview Questions

### Q: Should you use enums or literal types in modern TypeScript?

Default to **literal types** for simple string constants — they're zero-overhead and work naturally with JSON APIs. Use **enums** when you need iteration or bitwise flags. Use **`as const` objects** as a middle ground that supports both iteration and raw string values.

### Q: What is the problem with numeric enums?

Numeric enums accept any number, not just the defined values. TypeScript won't catch `setStatus(99)` if `Status` is a numeric enum. String enums or literal types are stricter.

```typescript
enum NumStatus { Active = 1, Inactive = 2 }

function setStatus(s: NumStatus) {}
setStatus(99); // ✅ TypeScript allows this — dangerous!

type StrStatus = "active" | "inactive";
function setStatus2(s: StrStatus) {}
setStatus2("deleted"); // ❌ Error — correctly caught
```

### Q: What does `as const` do?

It tells TypeScript to treat a value as a **read-only literal type** rather than widening it. `const x = "GET"` gives `string`. `const x = "GET" as const` gives `"GET"`.

---

[← Advanced Types](./06-advanced-types.md) | [Next: React TypeScript →](./08-react-typescript.md)
