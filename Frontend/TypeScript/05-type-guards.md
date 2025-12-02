# TypeScript Type Guards

## Table of Contents
- [What are Type Guards?](#what-are-type-guards)
- [typeof Type Guards](#typeof-type-guards)
- [instanceof Type Guards](#instanceof-type-guards)
- [in Operator Type Guards](#in-operator-type-guards)
- [Custom Type Guards](#custom-type-guards)
- [Discriminated Unions](#discriminated-unions)
- [Exhaustiveness Checking](#exhaustiveness-checking)
- [Narrowing Techniques](#narrowing-techniques)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## What are Type Guards?

Type guards are expressions that perform runtime checks to narrow down types within a conditional block. They help TypeScript understand the exact type of a value, enabling type-safe operations.

### Why Type Guards?

**Type Guard Benefits** - Demonstrates the problem without type guards (compile errors) and the solution with type guards (safe runtime type checking for union types).

```typescript
// Without type guard
function processValue(value: string | number) {
  // Error: Property 'toUpperCase' does not exist on type 'string | number'
  return value.toUpperCase();
}

// With type guard
function processValue(value: string | number) {
  if (typeof value === "string") {
    return value.toUpperCase(); // OK - TypeScript knows it's a string
  }
  return value.toFixed(2); // OK - TypeScript knows it's a number
}
```

**Benefits:**
- Type safety at runtime
- Better IDE autocomplete
- Prevents runtime errors
- Self-documenting code

---

## typeof Type Guards

The `typeof` operator checks primitive types at runtime.

### Basic typeof Guards

**typeof Operator for Primitives** - Runtime type checking using typeof operator. TypeScript narrows types automatically within conditional blocks based on typeof checks.

```typescript
function processValue(value: string | number | boolean) {
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // value is string
  } else if (typeof value === "number") {
    console.log(value.toFixed(2)); // value is number
  } else {
    console.log(value ? "yes" : "no"); // value is boolean
  }
}

// Multiple checks
function formatValue(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number") {
    return value.toString();
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  return "unknown";
}
```

### typeof Limitations

**typeof Quirks and Solutions** - typeof has limitations: returns "object" for arrays and null. Use Array.isArray() for arrays and strict equality for null checks.

```typescript
// typeof returns "object" for arrays and null
typeof [1, 2, 3] === "object"; // true
typeof null === "object"; // true (JavaScript quirk)
typeof { name: "Alice" } === "object"; // true

// Better way to check arrays
function isArray(value: unknown): value is Array<any> {
  return Array.isArray(value);
}

// Better way to check null
function isNull(value: unknown): value is null {
  return value === null;
}
```

### Valid typeof Values

**typeof Return Values** - Complete list of possible typeof return values. Useful for type-safe typeof comparisons and exhaustive type checking.

```typescript
type TypeofValues =
  | "string"
  | "number"
  | "boolean"
  | "symbol"
  | "undefined"
  | "object"
  | "function"
  | "bigint";

function getType(value: unknown): TypeofValues {
  return typeof value;
}
```

---

## instanceof Type Guards

The `instanceof` operator checks if an object is an instance of a class or constructor function.

### Basic instanceof Guards

**instanceof Operator for Classes** - Checks if an object is an instance of a class. TypeScript automatically narrows to the specific class type in conditional blocks.

```typescript
class Dog {
  bark() {
    console.log("Woof!");
  }
}

class Cat {
  meow() {
    console.log("Meow!");
  }
}

function makeSound(animal: Dog | Cat) {
  if (animal instanceof Dog) {
    animal.bark(); // TypeScript knows it's a Dog
  } else {
    animal.meow(); // TypeScript knows it's a Cat
  }
}

const dog = new Dog();
const cat = new Cat();

makeSound(dog); // "Woof!"
makeSound(cat); // "Meow!"
```

### instanceof with Built-in Types

**instanceof with Built-in Objects** - Works with built-in types like Date, RegExp, Error, and Array. Essential for safe error handling and type-specific operations.

```typescript
function processValue(value: Date | RegExp | Error) {
  if (value instanceof Date) {
    console.log(value.toISOString()); // Date methods
  } else if (value instanceof RegExp) {
    console.log(value.test("hello")); // RegExp methods
  } else {
    console.log(value.message); // Error methods
  }
}

// Array check
function processArray(value: unknown) {
  if (value instanceof Array) {
    value.forEach((item) => console.log(item)); // Array methods
  }
}

// Error handling
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message); // Safe to access message
    console.log(error.stack);
  } else {
    console.log("Unknown error:", error);
  }
}
```

### instanceof with Inheritance

**instanceof with Class Hierarchies** - instanceof checks the entire prototype chain, so it works with inheritance. Subclass instances are also instances of their parent class.

```typescript
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Dog extends Animal {
  bark() {
    console.log(`${this.name} barks`);
  }
}

class Cat extends Animal {
  meow() {
    console.log(`${this.name} meows`);
  }
}

function processAnimal(animal: Animal) {
  console.log(animal.name); // Always available

  if (animal instanceof Dog) {
    animal.bark(); // Dog-specific method
  } else if (animal instanceof Cat) {
    animal.meow(); // Cat-specific method
  }
}
```

---

## in Operator Type Guards

The `in` operator checks if a property exists in an object.

### Basic in Guards

**in Operator for Property Checks** - Checks if a property exists in an object at runtime. TypeScript uses this to narrow union types based on unique properties.

```typescript
interface Car {
  drive(): void;
  wheels: number;
}

interface Boat {
  sail(): void;
  anchors: number;
}

function operate(vehicle: Car | Boat) {
  if ("drive" in vehicle) {
    vehicle.drive(); // TypeScript knows it's a Car
    console.log(vehicle.wheels);
  } else {
    vehicle.sail(); // TypeScript knows it's a Boat
    console.log(vehicle.anchors);
  }
}
```

### in with Optional Properties

**in Operator with Optional Fields** - Be careful: 'in' returns true even if the property value is undefined. Combine with additional undefined checks for safety.

```typescript
interface User {
  name: string;
  email: string;
  age?: number;
}

function printUserInfo(user: User) {
  console.log(`Name: ${user.name}`);
  console.log(`Email: ${user.email}`);

  // Check optional property
  if ("age" in user && user.age !== undefined) {
    console.log(`Age: ${user.age}`);
  }
}
```

### in with Index Signatures

**in Operator with Dynamic Keys** - Works with index signatures and dynamic property access. Useful for safe dictionary/map operations and API response handling.

```typescript
interface Dictionary {
  [key: string]: string | number;
}

function getValue(dict: Dictionary, key: string) {
  if (key in dict) {
    return dict[key]; // Safe access
  }
  return undefined;
}

// Complex example
interface ApiResponse {
  data?: { id: number; name: string };
  error?: string;
}

function handleResponse(response: ApiResponse) {
  if ("error" in response && response.error) {
    console.error("Error:", response.error);
  } else if ("data" in response && response.data) {
    console.log("Data:", response.data);
  }
}
```

---

## Custom Type Guards

Custom type guards use the `is` predicate to create user-defined type checks.

### Basic Custom Type Guard

**Custom Type Guard with 'is' Predicate** - User-defined type guards using 'value is Type' syntax. Return boolean to tell TypeScript the type when true.

```typescript
// Type predicate: value is Type
function isString(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: unknown) {
  if (isString(value)) {
    console.log(value.toUpperCase()); // TypeScript knows it's string
  }
}
```

### Interface Type Guards

**Type Guards for Interfaces** - Check for unique properties to distinguish between interface types. Essential for working with similar interfaces that differ in specific properties.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface Admin {
  id: number;
  name: string;
  email: string;
  permissions: string[];
}

// Custom type guard
function isAdmin(user: User | Admin): user is Admin {
  return "permissions" in user;
}

function grantAccess(user: User | Admin) {
  if (isAdmin(user)) {
    console.log("Admin permissions:", user.permissions);
  } else {
    console.log("Regular user:", user.name);
  }
}
```

### Complex Type Guards

**Generic Type Guards** - Type guards can work with generic types. Check discriminant properties to narrow generic union types safely.

```typescript
interface Success<T> {
  success: true;
  data: T;
}

interface Failure {
  success: false;
  error: string;
}

type Result<T> = Success<T> | Failure;

// Type guard for success
function isSuccess<T>(result: Result<T>): result is Success<T> {
  return result.success === true;
}

// Usage
function handleResult(result: Result<{ name: string }>) {
  if (isSuccess(result)) {
    console.log("Success:", result.data.name); // Safe access to data
  } else {
    console.log("Error:", result.error); // Safe access to error
  }
}
```

### Array Type Guards

**Type Guards for Array Element Types** - Combine Array.isArray() with every() to validate all elements. Ensures type safety for arrays with specific element types.

```typescript
function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => typeof item === "number");
}

function processArray(arr: unknown) {
  if (isStringArray(arr)) {
    arr.forEach((str) => console.log(str.toUpperCase()));
  } else if (isNumberArray(arr)) {
    arr.forEach((num) => console.log(num.toFixed(2)));
  }
}
```

### Nullable Type Guards

**Generic Null/Undefined Guards** - Reusable type guards for filtering null and undefined. Essential for array.filter() operations and optional chaining.

```typescript
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

function isNotUndefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Usage
const values: (string | null | undefined)[] = ["hello", null, "world", undefined];
const definedValues = values.filter(isDefined); // string[]
```

---

## Discriminated Unions

Discriminated unions (tagged unions) use a common property to distinguish between types.

### Basic Discriminated Union

**Discriminated Unions (Tagged Unions)** - Use a common literal property (discriminant) to distinguish between union members. TypeScript narrows types based on the discriminant in switch statements.

```typescript
interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

interface Rectangle {
  kind: "rectangle";
  width: number;
  height: number;
}

type Shape = Circle | Square | Rectangle;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    case "rectangle":
      return shape.width * shape.height;
  }
}
```

### API Response with Discriminated Union

**Async State Pattern** - Common pattern for managing loading, success, and error states. Each state has unique properties accessible only in that state's branch.

```typescript
interface LoadingState {
  status: "loading";
}

interface SuccessState<T> {
  status: "success";
  data: T;
}

interface ErrorState {
  status: "error";
  error: string;
}

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

function handleState(state: AsyncState<{ name: string }>) {
  switch (state.status) {
    case "loading":
      console.log("Loading...");
      break;
    case "success":
      console.log("Data:", state.data.name);
      break;
    case "error":
      console.log("Error:", state.error);
      break;
  }
}
```

### Complex Discriminated Union

**Payment Method Pattern** - Real-world example with multiple payment types. Each payment method has type-specific properties that are safely accessible after type narrowing.

```typescript
interface BankAccount {
  type: "bank";
  accountNumber: string;
  balance: number;
}

interface CreditCard {
  type: "credit";
  cardNumber: string;
  limit: number;
}

interface PayPal {
  type: "paypal";
  email: string;
}

type PaymentMethod = BankAccount | CreditCard | PayPal;

function processPayment(method: PaymentMethod, amount: number) {
  switch (method.type) {
    case "bank":
      console.log(`Deducting $${amount} from account ${method.accountNumber}`);
      console.log(`New balance: $${method.balance - amount}`);
      break;
    case "credit":
      console.log(`Charging $${amount} to card ${method.cardNumber}`);
      console.log(`Remaining limit: $${method.limit - amount}`);
      break;
    case "paypal":
      console.log(`Processing $${amount} via PayPal (${method.email})`);
      break;
  }
}
```

---

## Exhaustiveness Checking

Exhaustiveness checking ensures all possible cases are handled in discriminated unions.

### Using never Type

**Exhaustiveness Checking with never** - Assigns remaining cases to never type. If all cases aren't handled, TypeScript throws compile error, preventing bugs from missing cases.

```typescript
type Status = "idle" | "loading" | "success" | "error";

function handleStatus(status: Status): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading...";
    case "success":
      return "Success!";
    case "error":
      return "Error!";
    default:
      // Exhaustiveness check
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
}

// If we add a new status, TypeScript will error
type Status2 = "idle" | "loading" | "success" | "error" | "cancelled";

function handleStatus2(status: Status2): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading...";
    case "success":
      return "Success!";
    case "error":
      return "Error!";
    default:
      // Error: Type 'string' is not assignable to type 'never'
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
}
```

### Helper Function

**assertNever Helper** - Throws runtime error for unhandled cases while providing compile-time exhaustiveness checking. Useful for detecting missing switch cases.

```typescript
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

interface Circle {
  kind: "circle";
  radius: number;
}

interface Square {
  kind: "square";
  sideLength: number;
}

type Shape = Circle | Square;

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.sideLength ** 2;
    default:
      return assertNever(shape); // Compile error if not exhaustive
  }
}
```

---

## Narrowing Techniques

### Truthiness Narrowing

**Truthiness-Based Type Narrowing** - TypeScript narrows types based on truthy/falsy checks. Be careful: 0 and empty string are falsy but valid values.

```typescript
function printLength(value: string | null | undefined) {
  // Truthiness check
  if (value) {
    console.log(value.length); // value is string
  } else {
    console.log("No value");
  }
}

// Be careful with falsy values
function printValue(value: string | number) {
  if (value) {
    console.log(value); // 0 and "" are falsy!
  }
}

// Better approach
function printValue2(value: string | number) {
  if (value !== null && value !== undefined) {
    console.log(value);
  }
}
```

### Equality Narrowing

**Equality-Based Type Narrowing** - When comparing two values with ===, TypeScript infers they must be the same type. Useful for narrowing union types.

```typescript
function compare(x: string | number, y: string | boolean) {
  if (x === y) {
    // x and y are both string
    x.toUpperCase();
    y.toUpperCase();
  } else {
    console.log(x); // string | number
    console.log(y); // string | boolean
  }
}

// Null/undefined checks
function processValue(value: string | null | undefined) {
  if (value === null) {
    console.log("null");
  } else if (value === undefined) {
    console.log("undefined");
  } else {
    console.log(value.toUpperCase()); // string
  }
}
```

### Control Flow Analysis

**Control Flow-Based Narrowing** - TypeScript tracks types through code paths. Early returns and type checks narrow remaining possibilities in subsequent code.

```typescript
function processValue(value: string | number | null) {
  if (value === null) {
    return; // Early return
  }

  // TypeScript knows value is string | number here
  if (typeof value === "string") {
    console.log(value.toUpperCase());
    return;
  }

  // TypeScript knows value is number here
  console.log(value.toFixed(2));
}
```

### Type Predicates in Filter

**Type Guards with Array.filter()** - Regular filter doesn't narrow types, but type predicate functions do. Essential for filtering null/undefined from arrays.

```typescript
interface User {
  id: number;
  name: string;
}

const users: (User | null)[] = [
  { id: 1, name: "Alice" },
  null,
  { id: 2, name: "Bob" },
  null,
];

// Without type guard
const validUsers1 = users.filter((user) => user !== null);
// Type: (User | null)[] - still includes null!

// With type guard
function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

const validUsers2 = users.filter(isNotNull);
// Type: User[] - null removed!
```

---

## Common Pitfalls

### Pitfall 1: Not Returning Boolean

**Missing Return Statement** - Type guards must return boolean. Forgetting the return statement causes the guard to always return undefined (falsy), breaking type narrowing.

```typescript
// Wrong - doesn't return boolean
function isString(value: unknown): value is string {
  typeof value === "string"; // Missing return!
}

// Correct
function isString(value: unknown): value is string {
  return typeof value === "string";
}
```

### Pitfall 2: Incorrect Type Predicate

**Mismatched Type Predicate** - Type predicate must match the actual check. Lying to TypeScript about types causes runtime errors despite passing type checks.

```typescript
// Wrong - predicate doesn't match implementation
function isString(value: unknown): value is number {
  return typeof value === "string"; // Says number but checks string
}

// Correct
function isString(value: unknown): value is string {
  return typeof value === "string";
}
```

### Pitfall 3: Forgetting to Handle All Cases

```typescript
type Status = "idle" | "loading" | "success" | "error";

// Wrong - missing cases
function handleStatus(status: Status): string {
  if (status === "idle") return "Idle";
  if (status === "loading") return "Loading";
  // Missing success and error cases!
  return "Unknown"; // Default is dangerous
}

// Correct - exhaustive check
function handleStatus2(status: Status): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
}
```

### Pitfall 4: Using typeof with Objects

```typescript
// Wrong - typeof returns "object" for arrays and null
function isArray(value: unknown): value is Array<any> {
  return typeof value === "object"; // Includes null and objects!
}

// Correct
function isArray(value: unknown): value is Array<any> {
  return Array.isArray(value);
}
```

---

## Interview Questions

### Q1: What's the difference between typeof and instanceof?

**Answer:**
- `typeof`: Checks primitive types, returns a string
- `instanceof`: Checks if object is instance of a class/constructor

```typescript
// typeof - primitive types
typeof "hello" === "string"; // true
typeof 42 === "number"; // true
typeof true === "boolean"; // true

// instanceof - objects and classes
class Dog {}
const dog = new Dog();
dog instanceof Dog; // true

[] instanceof Array; // true
new Date() instanceof Date; // true

// typeof limitations
typeof [] === "object"; // true (not "array")
typeof null === "object"; // true (JavaScript quirk)
```

**When to use:**
- `typeof`: Primitives (string, number, boolean, etc.)
- `instanceof`: Classes, built-in objects (Date, Array, Error, etc.)

---

### Q2: Create a custom type guard for an interface

**Answer:**
```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Custom type guard
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

// Usage
function processData(data: unknown) {
  if (isUser(data)) {
    console.log(data.id); // Safe access
    console.log(data.name);
    console.log(data.email);
  } else {
    console.log("Not a valid user");
  }
}

// Test
processData({ id: 1, name: "Alice", email: "alice@example.com" }); // Valid
processData({ id: 1, name: "Bob" }); // Invalid - missing email
processData("not a user"); // Invalid
```

---

### Q3: What are discriminated unions and why are they useful?

**Answer:**
Discriminated unions use a common property (discriminant) to distinguish between types. They're useful for type-safe state management and API responses.

```typescript
interface LoadingState {
  status: "loading";
}

interface SuccessState {
  status: "success";
  data: string;
}

interface ErrorState {
  status: "error";
  error: string;
}

type State = LoadingState | SuccessState | ErrorState;

function render(state: State) {
  // TypeScript narrows type based on status
  switch (state.status) {
    case "loading":
      return "Loading...";
    case "success":
      return `Data: ${state.data}`; // Safe - knows it's SuccessState
    case "error":
      return `Error: ${state.error}`; // Safe - knows it's ErrorState
  }
}

// Benefits:
// 1. Type safety - no runtime errors
// 2. Exhaustiveness checking - compiler ensures all cases handled
// 3. Better autocomplete in IDE
// 4. Self-documenting code
```

---

### Q4: How do you implement exhaustiveness checking?

**Answer:**
```typescript
type Status = "idle" | "loading" | "success" | "error";

function handleStatus(status: Status): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      // Exhaustiveness check with never
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
}

// If we add a new status, TypeScript will error
type NewStatus = "idle" | "loading" | "success" | "error" | "cancelled";

function handleNewStatus(status: NewStatus): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "success":
      return "Success";
    case "error":
      return "Error";
    // Missing "cancelled" case
    default:
      // Error: Type 'string' is not assignable to type 'never'
      const exhaustiveCheck: never = status;
      return exhaustiveCheck;
  }
}

// Helper function approach
function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${value}`);
}

function handleWithHelper(status: Status): string {
  switch (status) {
    case "idle":
      return "Idle";
    case "loading":
      return "Loading";
    case "success":
      return "Success";
    case "error":
      return "Error";
    default:
      return assertNever(status);
  }
}
```

---

### Q5: What's the difference between `value is Type` and returning boolean?

**Answer:**
```typescript
// Regular boolean function
function isStringBoolean(value: unknown): boolean {
  return typeof value === "string";
}

// Type predicate function
function isStringPredicate(value: unknown): value is string {
  return typeof value === "string";
}

function processValue(value: unknown) {
  // With boolean - no type narrowing
  if (isStringBoolean(value)) {
    value.toUpperCase(); // Error - value is still unknown
  }

  // With type predicate - type narrowing works!
  if (isStringPredicate(value)) {
    value.toUpperCase(); // OK - value is string
  }
}

// Key difference:
// - boolean: Just returns true/false, doesn't affect type
// - value is Type: Tells TypeScript to narrow the type when true
```

**When to use:**
- `boolean`: Simple checks that don't need type narrowing
- `value is Type`: When you want TypeScript to narrow the type

---

### Q6: How do you use the 'in' operator for type guards?

**Answer:**
```typescript
interface Car {
  drive(): void;
  wheels: number;
}

interface Boat {
  sail(): void;
  anchors: number;
}

type Vehicle = Car | Boat;

function operate(vehicle: Vehicle) {
  // Using 'in' operator
  if ("drive" in vehicle) {
    vehicle.drive(); // TypeScript knows it's Car
    console.log(vehicle.wheels);
  } else {
    vehicle.sail(); // TypeScript knows it's Boat
    console.log(vehicle.anchors);
  }
}

// Complex example with optional properties
interface User {
  name: string;
  email?: string;
  phone?: string;
}

function getContactInfo(user: User): string {
  let info = `Name: ${user.name}`;

  if ("email" in user && user.email) {
    info += `\nEmail: ${user.email}`;
  }

  if ("phone" in user && user.phone) {
    info += `\nPhone: ${user.phone}`;
  }

  return info;
}

// Note: 'in' checks if property exists, even if undefined
const user = { name: "Alice", email: undefined };
"email" in user; // true (property exists)
user.email; // undefined (but property exists)
```

---

## Key Takeaways

1. **Type guards** narrow types within conditional blocks
2. **typeof** for primitive types (string, number, boolean, etc.)
3. **instanceof** for classes and built-in objects
4. **in operator** checks property existence in objects
5. **Custom type guards** use `value is Type` predicate
6. **Discriminated unions** use common property for type narrowing
7. **Exhaustiveness checking** with `never` ensures all cases handled
8. **Control flow analysis** TypeScript tracks types through code paths

---

## Best Practices

1. **Prefer type guards over type assertions**
```typescript
// Bad - unsafe
const value = input as string;

// Good - safe
if (typeof input === "string") {
  const value = input; // Proven to be string
}
```

2. **Use discriminated unions for complex states**
```typescript
// Good pattern
type State =
  | { status: "loading" }
  | { status: "success"; data: string }
  | { status: "error"; error: string };
```

3. **Always use exhaustiveness checking**
```typescript
// Always include default case with never
default:
  const exhaustiveCheck: never = value;
  return exhaustiveCheck;
```

4. **Create reusable type guard utilities**
```typescript
function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

const items = [1, null, 2, undefined, 3];
const defined = items.filter(isDefined); // number[]
```

---

## Next Steps

- [Advanced Types](./06-advanced-types.md)
- [Utility Types](./04-utility-types.md)
- [React TypeScript](./08-react-typescript.md)

---

[← Back to TypeScript](./README.md)
