# TypeScript Enums and Literals

## Table of Contents
- [What are Enums?](#what-are-enums)
- [Numeric Enums](#numeric-enums)
- [String Enums](#string-enums)
- [Heterogeneous Enums](#heterogeneous-enums)
- [Const Enums](#const-enums)
- [Literal Types](#literal-types)
- [Enums vs Literal Types](#enums-vs-literal-types)
- [When to Use Each](#when-to-use-each)
- [Best Practices](#best-practices)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## What are Enums?

Enums (enumerations) allow you to define a set of named constants. They make code more readable and maintainable by giving meaningful names to numeric or string values.

### Why Use Enums?

**Problem with Magic Numbers and Enum Solution** - Magic numbers lack context and readability. Enums provide named constants that self-document code intent and enable type safety.

```typescript
// Without enums - magic numbers
function setStatus(status: number) {
  if (status === 0) {
    console.log("Pending");
  } else if (status === 1) {
    console.log("Active");
  } else if (status === 2) {
    console.log("Inactive");
  }
}

setStatus(1); // What does 1 mean?

// With enums - self-documenting
enum Status {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}

function setStatus(status: Status) {
  if (status === Status.Pending) {
    console.log("Pending");
  } else if (status === Status.Active) {
    console.log("Active");
  } else if (status === Status.Inactive) {
    console.log("Inactive");
  }
}

setStatus(Status.Active); // Clear intent
```

**Benefits:**
- Self-documenting code
- Type safety
- Autocomplete support
- Centralized values
- Easier refactoring

---

## Numeric Enums

Numeric enums are the default type of enum in TypeScript.

### Auto-incrementing Enums

**Numeric Enum Auto-increment Behavior** - Numeric enums auto-increment from 0 by default, or from any specified starting value. Subsequent members increment by 1 without explicit values.

```typescript
// Auto-incrementing from 0
enum Direction {
  Up, // 0
  Down, // 1
  Left, // 2
  Right, // 3
}

console.log(Direction.Up); // 0
console.log(Direction.Down); // 1

// Auto-incrementing from custom start
enum Status {
  Pending = 1,
  Active, // 2
  Inactive, // 3
}

console.log(Status.Pending); // 1
console.log(Status.Active); // 2
```

### Explicit Values

**Explicit Numeric Enum Values** - Manually assign meaningful numeric values to enum members. Useful for HTTP status codes, error codes, or any domain-specific numeric constants.

```typescript
// Explicit values
enum HttpStatus {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  Unauthorized = 401,
  NotFound = 404,
  InternalServerError = 500,
}

function handleResponse(status: HttpStatus) {
  switch (status) {
    case HttpStatus.OK:
      console.log("Success");
      break;
    case HttpStatus.NotFound:
      console.log("Resource not found");
      break;
    default:
      console.log("Other status");
  }
}

handleResponse(HttpStatus.OK); // "Success"
```

### Reverse Mapping

**Numeric Enum Reverse Mapping** - Numeric enums create bidirectional mapping: name-to-value and value-to-name. Access member names using numeric values for lookups and debugging.

```typescript
// Numeric enums have reverse mapping
enum Color {
  Red = 1,
  Green = 2,
  Blue = 3,
}

// Forward mapping
console.log(Color.Red); // 1
console.log(Color.Green); // 2

// Reverse mapping
console.log(Color[1]); // "Red"
console.log(Color[2]); // "Green"

// Use in code
function getColorName(value: number): string | undefined {
  return Color[value];
}

console.log(getColorName(1)); // "Red"
console.log(getColorName(99)); // undefined
```

### Computed Values

**Computed Enum Values with Bitwise Operations** - Enum values can be computed using expressions. Bitwise shifts create flag patterns for permissions and options that can be combined with OR and checked with AND.

```typescript
// Computed enum values
enum FileAccess {
  None = 0,
  Read = 1 << 0, // 1
  Write = 1 << 1, // 2
  ReadWrite = Read | Write, // 3
  Execute = 1 << 2, // 4
}

console.log(FileAccess.Read); // 1
console.log(FileAccess.Write); // 2
console.log(FileAccess.ReadWrite); // 3

// Bitwise operations
function hasPermission(current: FileAccess, required: FileAccess): boolean {
  return (current & required) === required;
}

console.log(hasPermission(FileAccess.ReadWrite, FileAccess.Read)); // true
console.log(hasPermission(FileAccess.Read, FileAccess.Write)); // false
```

### Using Numeric Enums

**Numeric Enums in Interfaces and Functions** - Numeric enums provide type safety for interface properties and function parameters. TypeScript accepts both enum members and raw numbers (less safe).

```typescript
enum Priority {
  Low = 1,
  Medium = 2,
  High = 3,
  Critical = 4,
}

interface Task {
  id: number;
  title: string;
  priority: Priority;
}

const task: Task = {
  id: 1,
  title: "Fix bug",
  priority: Priority.High, // Type-safe
};

// Can also use numeric value
const task2: Task = {
  id: 2,
  title: "Add feature",
  priority: 3, // Also valid (but less type-safe)
};

// Function accepting enum
function getPriorityLabel(priority: Priority): string {
  switch (priority) {
    case Priority.Low:
      return "Low";
    case Priority.Medium:
      return "Medium";
    case Priority.High:
      return "High";
    case Priority.Critical:
      return "Critical";
  }
}
```

---

## String Enums

String enums assign string values to each member.

### Basic String Enums

**String Enum Definition and Usage** - String enums assign string values to each member. More debuggable than numeric enums, values appear clearly in runtime and logs. Requires using enum members, not raw strings.

```typescript
// String enum
enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

console.log(Direction.Up); // "UP"
console.log(Direction.Down); // "DOWN"

// Type-safe usage
function move(direction: Direction) {
  console.log(`Moving ${direction}`);
}

move(Direction.Up); // "Moving UP"
// move("UP"); // Error - must use enum member
```

### Meaningful String Values

**String Enums for Logging and API Integration** - String enum values appear directly in logs and API payloads. Use lowercase for API compatibility. Values are self-describing for debugging and monitoring.

```typescript
// String enum with meaningful values
enum LogLevel {
  Error = "ERROR",
  Warning = "WARNING",
  Info = "INFO",
  Debug = "DEBUG",
}

function log(level: LogLevel, message: string) {
  console.log(`[${level}] ${message}`);
}

log(LogLevel.Error, "Something went wrong"); // [ERROR] Something went wrong
log(LogLevel.Info, "Application started"); // [INFO] Application started

// API-friendly values
enum UserRole {
  Admin = "admin",
  User = "user",
  Guest = "guest",
}

// Sent to API as strings
interface User {
  id: number;
  name: string;
  role: UserRole;
}

const user: User = {
  id: 1,
  name: "Alice",
  role: UserRole.Admin, // Sends "admin" to API
};
```

### No Reverse Mapping

**String Enum Limitation: No Reverse Mapping** - Unlike numeric enums, string enums don't support reverse lookup from value to name. Only forward mapping (name to value) is available.

```typescript
// String enums do NOT have reverse mapping
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

console.log(Status.Active); // "ACTIVE"
console.log(Status["ACTIVE"]); // undefined (no reverse mapping)

// Numeric enum has reverse mapping
enum NumericStatus {
  Active = 1,
  Inactive = 2,
}

console.log(NumericStatus.Active); // 1
console.log(NumericStatus[1]); // "Active" (reverse mapping works)
```

### Real-World String Enums

**Practical String Enum Examples** - String enums excel for HTTP methods, environments, and DOM events. Values match actual API/browser strings, providing type safety without transformation.

```typescript
// HTTP methods
enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

function makeRequest(url: string, method: HttpMethod) {
  console.log(`${method} ${url}`);
}

makeRequest("/api/users", HttpMethod.GET);

// Environment types
enum Environment {
  Development = "development",
  Staging = "staging",
  Production = "production",
}

const currentEnv: Environment = Environment.Development;

// Event names
enum EventType {
  Click = "click",
  Focus = "focus",
  Blur = "blur",
  Submit = "submit",
}

function addEventListener(type: EventType, handler: () => void) {
  document.addEventListener(type, handler);
}

addEventListener(EventType.Click, () => console.log("Clicked"));
```

---

## Heterogeneous Enums

Heterogeneous enums mix string and numeric values (not recommended).

### Mixed Enums

**Heterogeneous Enums: Mixing Types (Not Recommended)** - TypeScript allows mixing string and numeric values in one enum. Creates inconsistent behavior and confusing type semantics. Avoid in production code.

```typescript
// Heterogeneous enum (avoid in most cases)
enum Mixed {
  No = 0,
  Yes = "YES",
}

console.log(Mixed.No); // 0
console.log(Mixed.Yes); // "YES"

// Problems with mixed enums
enum Status {
  Active = 1,
  Inactive = 0,
  Pending = "PENDING", // Inconsistent
}

// Confusing and error-prone
// Better to use separate enums or literal types
```

### Why to Avoid

**Better Alternatives to Heterogeneous Enums** - Replace mixed enums with separate typed enums or union literal types. Maintains type consistency and predictable behavior.

```typescript
// Instead of heterogeneous enum
enum Bad {
  None = 0,
  Some = "SOME",
}

// Better: Use separate enums
enum NumericStatus {
  None = 0,
  Active = 1,
}

enum StringStatus {
  Pending = "PENDING",
  Complete = "COMPLETE",
}

// Or use union type
type Status = 0 | "PENDING" | "COMPLETE";
```

---

## Const Enums

Const enums are completely removed during compilation, resulting in more efficient code.

### Basic Const Enums

**Const Enum Compilation and Inlining** - Const enums are completely removed during compilation, with values inlined at usage sites. Regular enums generate JavaScript objects, const enums generate nothing.

```typescript
// Regular enum
enum Direction {
  Up,
  Down,
  Left,
  Right,
}

// Compiles to JavaScript object
// var Direction;
// (function (Direction) {
//   Direction[Direction["Up"] = 0] = "Up";
//   Direction[Direction["Down"] = 1] = "Down";
//   ...
// })(Direction || (Direction = {}));

// Const enum
const enum ConstDirection {
  Up,
  Down,
  Left,
  Right,
}

// Compiles to inline values
const direction = ConstDirection.Up;
// Becomes: const direction = 0;
```

### Performance Benefits

**Zero Runtime Overhead with Const Enums** - Const enum values are inlined at compile time, eliminating runtime objects. Results in smaller bundle size and faster execution compared to regular enums.

```typescript
// Const enum - fully inlined
const enum Color {
  Red,
  Green,
  Blue,
}

let myColor = Color.Red;
// Compiles to: let myColor = 0;

// No runtime object created - more efficient
// Smaller bundle size
```

### Limitations of Const Enums

**Const Enum Restrictions** - Const enums cannot be iterated, accessed dynamically, or used with keyof. No runtime object means no runtime features. Use regular enums when these capabilities are needed.

```typescript
const enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

// ✅ Works
const status = Status.Active;

// ❌ Cannot use computed access
const key = "Active";
const status2 = Status[key]; // Error

// ❌ Cannot iterate
// for (const value in Status) { } // Error

// ❌ Cannot use in type position with keyof
type StatusKey = keyof typeof Status; // Error with const enum

// Regular enum needed for these use cases
enum RegularStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

type RegularKey = keyof typeof RegularStatus; // OK
```

### When to Use Const Enums

**Ideal Use Cases for Const Enums** - Use const enums for direct access patterns where runtime features aren't needed. Perfect for API endpoints, configuration constants, or any values accessed statically.

```typescript
// Use const enum when:
// 1. Values are accessed directly (not computed)
// 2. No need for reverse mapping
// 3. Bundle size is important
// 4. No need to iterate over values

const enum ApiEndpoint {
  Users = "/api/users",
  Posts = "/api/posts",
  Comments = "/api/comments",
}

function fetchData(endpoint: ApiEndpoint) {
  return fetch(endpoint);
}

// Inlined at compile time
fetchData(ApiEndpoint.Users);
// Becomes: fetchData("/api/users");
```

---

## Literal Types

Literal types specify exact values rather than general types.

### String Literal Types

**String Literal Union Types** - Define exact string values using union types. Provides type safety without runtime overhead. More flexible and lightweight than string enums.

```typescript
// String literal type
type Status = "pending" | "active" | "inactive";

let currentStatus: Status = "active"; // OK
// currentStatus = "other"; // Error

// Function with literal types
function setStatus(status: Status) {
  console.log(`Status: ${status}`);
}

setStatus("active"); // OK
// setStatus("invalid"); // Error

// Real-world example
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type ContentType = "application/json" | "text/html" | "text/plain";

interface RequestOptions {
  method: HttpMethod;
  contentType: ContentType;
}
```

### Number Literal Types

**Numeric Literal Union Types** - Restrict values to specific numbers like dice rolls or HTTP status codes. Combines type safety with numeric constants for finite value sets.

```typescript
// Number literal type
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceRoll {
  return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

// HTTP status codes
type SuccessStatus = 200 | 201 | 204;
type ClientErrorStatus = 400 | 401 | 403 | 404;
type ServerErrorStatus = 500 | 502 | 503;

type HttpStatusCode = SuccessStatus | ClientErrorStatus | ServerErrorStatus;

function handleStatus(status: HttpStatusCode) {
  if (status >= 200 && status < 300) {
    console.log("Success");
  } else if (status >= 400 && status < 500) {
    console.log("Client error");
  } else {
    console.log("Server error");
  }
}
```

### Boolean Literal Types

**Boolean Literal Types for Type Discrimination** - Specific true/false literals enable discriminated unions. TypeScript narrows types based on boolean property checks in success/error response patterns.

```typescript
// Boolean literal types (rare but useful)
type AlwaysTrue = true;
type AlwaysFalse = false;

// Useful in discriminated unions
interface SuccessResponse {
  success: true;
  data: string;
}

interface ErrorResponse {
  success: false;
  error: string;
}

type ApiResponse = SuccessResponse | ErrorResponse;

function handleResponse(response: ApiResponse) {
  if (response.success) {
    console.log(response.data); // TypeScript knows it's SuccessResponse
  } else {
    console.log(response.error); // TypeScript knows it's ErrorResponse
  }
}
```

### const Assertions

**Const Assertions for Immutable Literals** - 'as const' converts values to readonly literal types. Objects become deeply readonly, arrays become tuples, primitives become literal types instead of widening.

```typescript
// Without const assertion
const config1 = {
  name: "MyApp",
  port: 3000,
};
// Type: { name: string; port: number; }

// With const assertion
const config2 = {
  name: "MyApp",
  port: 3000,
} as const;
// Type: { readonly name: "MyApp"; readonly port: 3000; }

// Array with const assertion
const colors1 = ["red", "green", "blue"];
// Type: string[]

const colors2 = ["red", "green", "blue"] as const;
// Type: readonly ["red", "green", "blue"]
type Color = typeof colors2[number]; // "red" | "green" | "blue"
```

---

## Enums vs Literal Types

### Comparison

**Enum vs Literal Type Side-by-Side** - Enums require member access (Status.Active), literals accept raw values ("active"). Enums create runtime objects, literals are compile-time only.

```typescript
// Enum approach
enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

function setStatusEnum(status: Status) {
  console.log(status);
}

setStatusEnum(Status.Active);

// Literal type approach
type StatusLiteral = "pending" | "active" | "inactive";

function setStatusLiteral(status: StatusLiteral) {
  console.log(status);
}

setStatusLiteral("active");
```

### Key Differences

**Four Critical Distinctions Between Enums and Literals** - Runtime vs compile-time, nominal vs structural typing, member access requirements, and reverse mapping support differentiate enums from literal types.

```typescript
// 1. Enums create runtime objects
enum Direction {
  Up = "UP",
  Down = "DOWN",
}
// JavaScript code is generated

// Literal types - no runtime code
type DirectionLiteral = "UP" | "DOWN";
// No JavaScript code generated

// 2. Enums enforce using enum members
function moveEnum(dir: Direction) {
  console.log(dir);
}
moveEnum(Direction.Up); // Must use Direction.Up
// moveEnum("UP"); // Error

// Literal types allow direct values
function moveLiteral(dir: DirectionLiteral) {
  console.log(dir);
}
moveLiteral("UP"); // Can use string directly

// 3. Enums are nominal, literals are structural
enum Status1 {
  Active = "ACTIVE",
}
enum Status2 {
  Active = "ACTIVE",
}
// Status1.Active !== Status2.Active (different types)

type Literal1 = "ACTIVE";
type Literal2 = "ACTIVE";
// Literal1 === Literal2 (same type)

// 4. Enums support reverse mapping (numeric only)
enum NumericEnum {
  A = 1,
  B = 2,
}
NumericEnum[1]; // "A" (reverse mapping)

// Literals don't have reverse mapping
type NumericLiteral = 1 | 2;
// No reverse mapping capability
```

### Pros and Cons

**Trade-offs Summary** - Enums offer better developer experience (autocomplete, centralization) at the cost of bundle size. Literals optimize for performance and flexibility with less tooling support.

```typescript
// Enum Pros:
// ✅ Self-documenting with named constants
// ✅ Centralized values
// ✅ Autocomplete support
// ✅ Can iterate over values (regular enums)
// ✅ Reverse mapping (numeric enums)

// Enum Cons:
// ❌ Runtime overhead (except const enums)
// ❌ Larger bundle size
// ❌ Less compatible with plain JavaScript
// ❌ Nominal typing (can be pro or con)

// Literal Type Pros:
// ✅ No runtime overhead
// ✅ Smaller bundle size
// ✅ Works seamlessly with JavaScript
// ✅ Structural typing
// ✅ More flexible

// Literal Type Cons:
// ❌ No reverse mapping
// ❌ No centralized definition (can duplicate)
// ❌ Can't iterate over values
// ❌ Less discoverable
```

---

## When to Use Each

### Use Enums When:

**Enum Use Case Scenarios** - Choose enums for reverse mapping needs, iteration requirements, grouped constants namespacing, or bitwise flag operations. Enums excel at runtime reflection.

```typescript
// 1. You need reverse mapping
enum Color {
  Red = 1,
  Green = 2,
  Blue = 3,
}

function getColorName(value: number): string {
  return Color[value] || "Unknown";
}

// 2. You want to iterate over values
enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

// Get all status values
const allStatuses = Object.values(Status);

// 3. You need a namespace for related constants
enum HttpStatus {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  NotFound = 404,
  InternalServerError = 500,
}

// Clear grouping: HttpStatus.OK, HttpStatus.NotFound

// 4. Working with numeric flags
enum Permission {
  None = 0,
  Read = 1 << 0,
  Write = 1 << 1,
  Delete = 1 << 2,
}

const userPermissions = Permission.Read | Permission.Write;
```

### Use Literal Types When:

**Literal Type Use Case Scenarios** - Choose literals for API integration, bundle size optimization, simple constants, discriminated unions, and framework props. Literals excel at compile-time type safety.

```typescript
// 1. Working with APIs (string values)
type UserRole = "admin" | "user" | "guest";

interface User {
  id: number;
  role: UserRole; // Sent as string to API
}

// 2. Smaller bundle size is important
type Theme = "light" | "dark" | "auto";

// 3. Simple string or number constants
type Direction = "north" | "south" | "east" | "west";
type Priority = 1 | 2 | 3 | 4 | 5;

// 4. Discriminated unions
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; sideLength: number }
  | { kind: "rectangle"; width: number; height: number };

// 5. React/Vue props (better compatibility)
interface ButtonProps {
  variant: "primary" | "secondary" | "danger";
  size: "small" | "medium" | "large";
}
```

### Hybrid Approach

**Combining Enum and Literal Type Benefits** - Define enum for named constants and autocomplete, extract literal type for API compatibility. Enables both enum member usage and raw string values.

```typescript
// Combine benefits of both

// Define enum for named constants
enum StatusEnum {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

// Extract literal type from enum
type Status = `${StatusEnum}`;
// Type: "pending" | "active" | "inactive"

// Use enum in code
const currentStatus: StatusEnum = StatusEnum.Active;

// Use literal type for API
interface ApiUser {
  id: number;
  status: Status; // Accepts string literals
}

// Best of both worlds
const user: ApiUser = {
  id: 1,
  status: StatusEnum.Active, // Enum member works
};

const user2: ApiUser = {
  id: 2,
  status: "active", // String literal also works
};
```

---

## Best Practices

### 1. Prefer String Enums Over Numeric

**Best Practice: String Over Numeric Enums** - String enums provide better debugging experience with meaningful values in logs. Avoid magic numbers in favor of self-documenting strings.

```typescript
// ❌ Less readable
enum Status {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}

// ✅ More readable and debuggable
enum Status {
  Pending = "PENDING",
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}
```

### 2. Use const Enums for Performance

**Best Practice: Const Enums for Direct Access** - Use const enums when values are accessed directly and runtime features aren't needed. Achieves zero-overhead while maintaining type safety.

```typescript
// ✅ For constants accessed directly
const enum Direction {
  Up = "UP",
  Down = "DOWN",
}

const dir = Direction.Up; // Inlined to "UP"

// ❌ Don't use const enum if you need runtime features
// (reverse mapping, iteration, keyof, etc.)
```

### 3. Use Literal Types for Simple Values

**Best Practice: Literals for Simplicity** - Prefer literal types for simple value sets. Avoids unnecessary complexity and bundle overhead when enum features aren't needed.

```typescript
// ✅ Simple, no runtime overhead
type Status = "pending" | "active" | "inactive";

// ❌ Overkill for simple cases
enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}
```

### 4. Create Type from Enum

**Best Practice: Extract Types from Enums** - Generate literal types from enums using template literals for values or keyof for keys. Combines enum benefits with type flexibility.

```typescript
// ✅ Get union type from enum
enum Status {
  Pending = "pending",
  Active = "active",
}

type StatusType = `${Status}`;
// "pending" | "active"

// Or for keys
type StatusKey = keyof typeof Status;
// "Pending" | "Active"
```

### 5. Use Descriptive Names

**Best Practice: Descriptive Enum Names** - Use clear, specific names for enums and members. Avoid abbreviations. Name should convey domain context (OrderStatus, not just Status).

```typescript
// ❌ Unclear
enum S {
  P = "pending",
  A = "active",
}

// ✅ Clear and descriptive
enum OrderStatus {
  Pending = "pending",
  Processing = "processing",
  Shipped = "shipped",
  Delivered = "delivered",
}
```

---

## Common Pitfalls

### Pitfall 1: Enum Numeric Coercion

**Common Pitfall: Numeric Enum Type Unsafety** - Numeric enums accept any number, not just defined values. TypeScript doesn't validate numeric values. Use string enums for stricter type safety.

```typescript
enum Status {
  Pending = 0,
  Active = 1,
}

function setStatus(status: Status) {
  console.log(status);
}

setStatus(Status.Active); // OK
setStatus(1); // OK (but dangerous - any number accepted!)
setStatus(99); // OK (TypeScript doesn't catch this!)

// Solution: Use string enums
enum StringStatus {
  Pending = "PENDING",
  Active = "ACTIVE",
}

function setStringStatus(status: StringStatus) {
  console.log(status);
}

// setStringStatus("PENDING"); // Error - must use enum member
setStringStatus(StringStatus.Pending); // OK
```

### Pitfall 2: Const Enum Limitations

**Common Pitfall: Const Enum Runtime Absence** - Const enums have no runtime object, preventing iteration, dynamic access, or keyof usage. Switch to regular enums when runtime features are required.

```typescript
const enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

// ❌ Cannot iterate
// for (const key in Status) { } // Error

// ❌ Cannot use keyof
// type Key = keyof typeof Status; // Error

// ❌ Cannot use computed access
const key = "Active";
// const value = Status[key]; // Error

// Use regular enum if you need these features
enum RegularStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

type Key = keyof typeof RegularStatus; // OK
```

### Pitfall 3: Forgetting to Export

**Common Pitfall: Module Scope Isolation** - Enums must be exported to use across files. Export enum directly or extract and export as literal type for public API.

```typescript
// ❌ Enum not exported
enum Status {
  Active = "ACTIVE",
}

// Other files can't use it

// ✅ Export enum
export enum Status {
  Active = "ACTIVE",
}

// Or export type
enum InternalStatus {
  Active = "ACTIVE",
}

export type Status = `${InternalStatus}`;
```

### Pitfall 4: Mixing Enum with Literals

**Common Pitfall: Inconsistent Type Patterns** - Mixing enums and literals creates confusion and type complexity. Choose one approach and use consistently throughout the codebase.

```typescript
// ❌ Confusing mix
enum Status {
  Active = "ACTIVE",
}

type ExtendedStatus = Status | "PENDING";

// ✅ Use one approach consistently
enum AllStatus {
  Active = "ACTIVE",
  Pending = "PENDING",
}

// Or
type AllStatusLiteral = "ACTIVE" | "PENDING";
```

---

## Interview Questions

### Q1: What's the difference between numeric and string enums?

**Answer:**

**Numeric vs String Enum Comparison** - Numeric enums support reverse mapping and auto-increment but accept any number. String enums are more debuggable, type-safe, and API-friendly but require explicit values.

```typescript
// Numeric enum
enum NumericStatus {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}

console.log(NumericStatus.Active); // 1
console.log(NumericStatus[1]); // "Active" (reverse mapping)

// String enum
enum StringStatus {
  Pending = "PENDING",
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

console.log(StringStatus.Active); // "ACTIVE"
console.log(StringStatus["ACTIVE"]); // undefined (no reverse mapping)

// Key differences:
// 1. Numeric enums have reverse mapping, string enums don't
// 2. Numeric enums auto-increment, string enums must specify values
// 3. String enums are more readable in debugger/logs
// 4. Numeric enums accept any number (less type-safe)
// 5. String enums are better for APIs

// Recommendation: Prefer string enums for better debugging and type safety
```

---

### Q2: When should you use const enums?

**Answer:**

**Const Enum Decision Criteria** - Use when performance is critical and values are accessed directly without runtime features. Avoid when needing iteration, computed access, or type operations like keyof.

```typescript
// Const enum - fully inlined at compile time
const enum Direction {
  Up = "UP",
  Down = "DOWN",
  Left = "LEFT",
  Right = "RIGHT",
}

const dir = Direction.Up;
// Compiles to: const dir = "UP";

// Use const enums when:
// ✅ Performance/bundle size is critical
// ✅ Values are accessed directly (not computed)
// ✅ No need for reverse mapping
// ✅ No need to iterate over values
// ✅ No need for keyof typeof

// Don't use const enums when:
// ❌ Need to iterate: for (const key in Direction)
// ❌ Need computed access: Direction[key]
// ❌ Need type operations: keyof typeof Direction
// ❌ Working with libraries (const enums can cause issues)

// Example where const enum is perfect:
const enum ApiEndpoint {
  Users = "/api/users",
  Posts = "/api/posts",
}

fetch(ApiEndpoint.Users);
// Compiles to: fetch("/api/users");
// No runtime overhead!
```

---

### Q3: What are the advantages of literal types over enums?

**Answer:**

**Literal Type Advantages Over Enums** - Zero runtime cost, direct value usage, better API/JSON compatibility, template literal integration, smaller bundles, and greater flexibility with mixed unions.

```typescript
// Literal types
type Status = "pending" | "active" | "inactive";

// Advantages:

// 1. No runtime overhead (zero JavaScript generated)
type Theme = "light" | "dark";
// vs
enum ThemeEnum { Light = "light", Dark = "dark" }
// Enum generates JavaScript code

// 2. Can use values directly
function setStatus(status: Status) {
  console.log(status);
}
setStatus("active"); // Direct value - cleaner

// vs enum requires:
setStatus(StatusEnum.Active); // More verbose

// 3. Better for API/JSON
interface User {
  role: "admin" | "user"; // Directly maps to JSON
}

// 4. Works with template literals
type EventName = "click" | "focus";
type EventHandler = `on${Capitalize<EventName>}`;
// "onClick" | "onFocus"

// 5. Smaller bundle size (important for web apps)

// 6. More flexible
type Union = "A" | "B" | 1 | 2; // Mix types easily

// When enums are better:
// - Need reverse mapping
// - Want to iterate values
// - Prefer nominal typing
// - Working with numeric flags
```

---

### Q4: How do you get all values from an enum?

**Answer:**

**Extracting Enum Values and Keys** - Use Object.values() for string enums. Numeric enums need filtering due to reverse mapping. Object.keys() and Object.entries() provide alternatives.

```typescript
// String enum
enum Status {
  Pending = "PENDING",
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}

// Get all values
const statusValues = Object.values(Status);
// ["PENDING", "ACTIVE", "INACTIVE"]

// Get all keys
const statusKeys = Object.keys(Status);
// ["Pending", "Active", "Inactive"]

// Get entries
const statusEntries = Object.entries(Status);
// [["Pending", "PENDING"], ["Active", "ACTIVE"], ...]

// Numeric enum (more complex due to reverse mapping)
enum NumericStatus {
  Pending = 0,
  Active = 1,
  Inactive = 2,
}

// Object.values returns both keys and values
Object.values(NumericStatus);
// [0, 1, 2, "Pending", "Active", "Inactive"]

// Get only numeric values
const numericValues = Object.values(NumericStatus).filter(
  (v) => typeof v === "number"
);
// [0, 1, 2]

// Get only string keys
const numericKeys = Object.values(NumericStatus).filter(
  (v) => typeof v === "string"
);
// ["Pending", "Active", "Inactive"]

// Helper function
function getEnumValues<T extends Record<string, string | number>>(
  enumObj: T
): T[keyof T][] {
  return Object.values(enumObj).filter(
    (v) => typeof v === "string"
  ) as T[keyof T][];
}

const values = getEnumValues(Status);
```

---

### Q5: How do you create a type from enum values?

**Answer:**

**Extracting Types from Enums** - Use template literal types (`${Enum}`) for values or keyof typeof for keys. Enables hybrid approaches combining enum autocomplete with literal type flexibility.

```typescript
// Enum
enum Status {
  Pending = "pending",
  Active = "active",
  Inactive = "inactive",
}

// Method 1: Template literal type
type StatusValue = `${Status}`;
// "pending" | "active" | "inactive"

// Method 2: Indexed access type
type StatusValue2 = Status[keyof typeof Status];
// "pending" | "active" | "inactive"

// Get enum keys
type StatusKey = keyof typeof Status;
// "Pending" | "Active" | "Inactive"

// Practical example
enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
}

// Create literal type from enum
type HttpMethodType = `${HttpMethod}`;

// Use in function
function makeRequest(method: HttpMethodType) {
  console.log(method);
}

// Accepts both enum and literals
makeRequest(HttpMethod.GET); // OK
makeRequest("POST"); // OK (with template literal type)

// Create object type from enum
type MethodHandlers = {
  [K in HttpMethod]: (data: any) => void;
};

// {
//   GET: (data: any) => void;
//   POST: (data: any) => void;
//   PUT: (data: any) => void;
//   DELETE: (data: any) => void;
// }
```

---

### Q6: Should you use enums or literal types in modern TypeScript?

**Answer:**

**Modern TypeScript Recommendation** - Default to literal types for zero overhead and flexibility. Use enums only when specifically needing reverse mapping, iteration, bitwise flags, or large constant groups.

```typescript
// Modern recommendation: Prefer literal types unless you need enum features

// ✅ Use literal types for most cases:
type Status = "pending" | "active" | "inactive";
type Priority = 1 | 2 | 3 | 4 | 5;
type Theme = "light" | "dark" | "auto";

// Advantages:
// - Zero runtime overhead
// - Smaller bundle size
// - Better with APIs/JSON
// - Works seamlessly with JavaScript
// - More flexible

// ✅ Use enums when you need:

// 1. Reverse mapping
enum ErrorCode {
  NotFound = 404,
  ServerError = 500,
}
ErrorCode[404]; // "NotFound"

// 2. Iteration
enum Color {
  Red = "red",
  Blue = "blue",
}
Object.values(Color).forEach((color) => {
  console.log(color);
});

// 3. Bitwise flags
enum Permission {
  Read = 1 << 0,
  Write = 1 << 1,
  Delete = 1 << 2,
}

// 4. Grouped constants
enum HttpStatus {
  OK = 200,
  Created = 201,
  BadRequest = 400,
  // ...many more
}

// Hybrid approach (best of both):
const Status = {
  Pending: "pending",
  Active: "active",
} as const;

type Status = (typeof Status)[keyof typeof Status];
// Behaves like enum but produces literal type
```

---

## Key Takeaways

1. **Numeric enums** auto-increment and support reverse mapping
2. **String enums** are more debuggable and API-friendly
3. **Const enums** are fully inlined for better performance
4. **Literal types** have no runtime overhead and smaller bundles
5. **Enums** provide namespace and nominal typing
6. **Literal types** are more flexible and work better with modern TS
7. Prefer **string enums** over numeric for better type safety
8. Use **const enums** only when you don't need runtime features

---

## Decision Tree

```
Need named constants?
├─ Need reverse mapping? → Enum
├─ Need to iterate values? → Enum
├─ Need bitwise operations? → Numeric Enum
├─ Working with APIs? → Literal Types
├─ Want smallest bundle? → Literal Types
├─ Simple string values? → Literal Types
└─ Many grouped constants? → Enum (preferably string)

Performance critical?
├─ Values accessed directly? → Const Enum
└─ Need runtime features? → Regular Enum

Modern TypeScript project?
→ Default to Literal Types, use Enums when specifically needed
```

---

## Next Steps

- [Type Guards](./05-type-guards.md)
- [Advanced Types](./06-advanced-types.md)
- [React TypeScript](./08-react-typescript.md)

---

[← Back to TypeScript](./README.md)
