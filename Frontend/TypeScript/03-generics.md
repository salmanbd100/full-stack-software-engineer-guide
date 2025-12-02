# TypeScript Generics

## Table of Contents
- [What are Generics?](#what-are-generics)
- [Generic Functions](#generic-functions)
- [Generic Interfaces](#generic-interfaces)
- [Generic Classes](#generic-classes)
- [Generic Constraints](#generic-constraints)
- [Advanced Generic Patterns](#advanced-generic-patterns)
- [Interview Questions](#interview-questions)

---

## What are Generics?

Generics allow you to write reusable, type-safe code that works with multiple types while preserving type information.

### Without Generics

**Type-Specific Functions vs any** - Shows the problem: either duplicate code for each type or lose type safety with any. This motivates the need for generics.

```typescript
// Specific to numbers
function identityNumber(arg: number): number {
  return arg;
}

// Specific to strings
function identityString(arg: string): string {
  return arg;
}

// Using any - loses type safety
function identityAny(arg: any): any {
  return arg;
}

let num = identityAny(42);
num.toUpperCase(); // No error, but will crash at runtime!
```

### With Generics

**Generic Type Parameters** - Type parameter T acts as a placeholder that preserves type information. TypeScript infers T from the argument or accepts explicit type specification.

```typescript
// Generic function - works with any type
function identity<T>(arg: T): T {
  return arg;
}

// Type is inferred
let num = identity(42); // T is number
let str = identity("hello"); // T is string

// Type is explicit
let bool = identity<boolean>(true);

// Type safety preserved
num.toUpperCase(); // Error - number doesn't have toUpperCase
str.toUpperCase(); // OK
```

**Key Benefits:**
- Code reusability
- Type safety
- Better IDE support
- Self-documenting code

---

## Generic Functions

### Basic Syntax

**Generic Function Syntax** - Single and multiple type parameters for flexible, type-safe functions. Type parameters are specified in angle brackets <T, U>.

```typescript
// Single type parameter
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

const num = first([1, 2, 3]); // number | undefined
const str = first(["a", "b"]); // string | undefined

// Multiple type parameters
function pair<T, U>(first: T, second: U): [T, U] {
  return [first, second];
}

const p1 = pair(1, "hello"); // [number, string]
const p2 = pair("a", true); // [string, boolean]
```

### Generic Arrow Functions

**Generic Arrow Function Syntax** - Arrow functions support generics with the same syntax. Use intersection types (&) to merge multiple object types.

```typescript
// Arrow function with generic
const identity = <T>(arg: T): T => arg;

// Multiple parameters
const merge = <T, U>(obj1: T, obj2: U): T & U => {
  return { ...obj1, ...obj2 };
};

const result = merge({ name: "Alice" }, { age: 25 });
// result type: { name: string } & { age: number }
```

### Generic Function with Array Methods

**Generic Higher-Order Functions** - Transform arrays while maintaining type safety. Input type T transforms to output type U through the mapping function.

```typescript
// Map function
function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
  return arr.map(fn);
}

const numbers = [1, 2, 3];
const strings = map(numbers, (n) => n.toString());
// strings: string[]

// Filter function
function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate);
}

const evens = filter([1, 2, 3, 4], (n) => n % 2 === 0);
// evens: number[]
```

---

## Generic Interfaces

### Basic Generic Interface

**Generic Interface Definition** - Interfaces with type parameters create reusable contracts. Each instance specifies its own concrete type for T.

```typescript
interface Box<T> {
  value: T;
}

const numberBox: Box<number> = { value: 42 };
const stringBox: Box<string> = { value: "hello" };

// Error
const invalidBox: Box<number> = { value: "hello" };
```

### Generic Interface with Methods

**Generic Repository Pattern** - Common pattern for CRUD operations. Generic type T represents the entity being managed, ensuring type consistency across all methods.

```typescript
interface Repository<T> {
  getAll(): T[];
  getById(id: number): T | undefined;
  create(item: T): T;
  update(id: number, item: T): T;
  delete(id: number): void;
}

interface User {
  id: number;
  name: string;
  email: string;
}

class UserRepository implements Repository<User> {
  private users: User[] = [];

  getAll(): User[] {
    return this.users;
  }

  getById(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  create(user: User): User {
    this.users.push(user);
    return user;
  }

  update(id: number, user: User): User {
    const index = this.users.findIndex((u) => u.id === id);
    this.users[index] = user;
    return user;
  }

  delete(id: number): void {
    this.users = this.users.filter((u) => u.id !== id);
  }
}
```

### Multiple Type Parameters

**Multiple Generic Parameters** - Interfaces can use multiple type parameters for flexible data structures like maps, pairs, or relationships between different types.

```typescript
interface KeyValuePair<K, V> {
  key: K;
  value: V;
}

const pair1: KeyValuePair<string, number> = {
  key: "age",
  value: 25
};

const pair2: KeyValuePair<number, string> = {
  key: 1,
  value: "first"
};

// Generic map
interface Map<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
}
```

---

## Generic Classes

### Basic Generic Class

**Generic Class Implementation** - Generic classes create type-safe data structures. All instance methods automatically use the class's type parameter T.

```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }
}

// Usage
const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop()); // 2

const stringStack = new Stack<string>();
stringStack.push("a");
stringStack.push("b");
console.log(stringStack.pop()); // "b"
```

### Generic Class with Static Methods

**Static Methods in Generic Classes** - Static methods can't use the class type parameter but can define their own. Useful for factory methods and utilities.

```typescript
class DataProcessor<T> {
  constructor(private data: T[]) {}

  // Instance method
  process(fn: (item: T) => T): T[] {
    return this.data.map(fn);
  }

  // Static method - cannot use class type parameter
  static create<U>(data: U[]): DataProcessor<U> {
    return new DataProcessor(data);
  }

  // Static method with its own type parameter
  static merge<U>(arr1: U[], arr2: U[]): U[] {
    return [...arr1, ...arr2];
  }
}

// Create instance
const processor = DataProcessor.create([1, 2, 3]);
const doubled = processor.process((n) => n * 2);

// Use static method
const merged = DataProcessor.merge([1, 2], [3, 4]);
```

---

## Generic Constraints

### extends Keyword

**Generic Constraints with extends** - Limit generic types to those with specific properties or structure. Enables safe property access within generic functions.

```typescript
// Constrain to objects with specific property
interface HasLength {
  length: number;
}

function logLength<T extends HasLength>(arg: T): void {
  console.log(arg.length);
}

logLength("hello"); // OK - string has length
logLength([1, 2, 3]); // OK - array has length
logLength({ length: 10 }); // OK - object has length

logLength(42); // Error - number doesn't have length
```

### Constraining to Specific Types

**Union Type Constraints** - Restrict generics to specific types using union constraints. Also supports class constraints for constructor-based generics.

```typescript
// Must be a number or string
function process<T extends number | string>(value: T): T {
  return value;
}

process(42); // OK
process("hello"); // OK
process(true); // Error

// Must extend a class
class Animal {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
}

class Dog extends Animal {
  bark(): void {
    console.log("Woof!");
  }
}

function createAnimal<T extends Animal>(AnimalClass: new (name: string) => T, name: string): T {
  return new AnimalClass(name);
}

const dog = createAnimal(Dog, "Buddy");
dog.bark(); // OK
```

### Using keyof Constraint

**keyof Constraint for Type-Safe Property Access** - Ensures property keys are valid for the object type. Return type T[K] is inferred from the specific property accessed.

```typescript
// Get property value from object
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = {
  name: "Alice",
  age: 25,
  email: "alice@example.com"
};

const name = getProperty(person, "name"); // string
const age = getProperty(person, "age"); // number

// Error - property doesn't exist
const invalid = getProperty(person, "address");
```

### Multiple Constraints

**Intersection Type Constraints** - Combine multiple constraints using intersection (&). Generic type must satisfy all constraints simultaneously.

```typescript
// Must have both length and toString
interface HasLength {
  length: number;
}

function processItem<T extends HasLength & { toString(): string }>(item: T): string {
  return `${item.toString()} (length: ${item.length})`;
}

processItem("hello"); // OK
processItem([1, 2, 3]); // OK
processItem({ length: 5, toString: () => "custom" }); // OK

processItem(42); // Error - no length property
```

---

## Advanced Generic Patterns

### Generic Type Aliases

**Generic Type Definitions** - Create reusable type patterns with type aliases. Supports object types, function types, and complex transformations.

```typescript
type Container<T> = {
  value: T;
  update: (newValue: T) => void;
};

const numberContainer: Container<number> = {
  value: 42,
  update: (newValue) => {
    numberContainer.value = newValue;
  }
};

// Generic function type
type Transformer<T, U> = (input: T) => U;

const toString: Transformer<number, string> = (n) => n.toString();
const toNumber: Transformer<string, number> = (s) => parseInt(s);
```

### Conditional Types with Generics

**Conditional Type Operators** - Types that depend on conditions like ternary operators. Use infer keyword to extract types from function signatures or complex structures.

```typescript
// If T extends U, return X, else return Y
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// Extract return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function greet(): string {
  return "Hello";
}

type GreetReturn = ReturnType<typeof greet>; // string

// Exclude null and undefined
type NonNullable<T> = T extends null | undefined ? never : T;

type A = NonNullable<string | null>; // string
type B = NonNullable<number | undefined>; // number
```

### Mapped Types with Generics

**Mapped Type Transformations** - Transform all properties of a type programmatically. Use keyof to iterate over properties and apply modifiers like optional (?) or readonly.

```typescript
// Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

interface User {
  id: number;
  name: string;
  email: string;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; }

// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

// Pick specific properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type UserCredentials = Pick<User, "name" | "email">;
// { name: string; email: string; }
```

### Generic Default Parameters

**Default Type Parameters** - Provide fallback types when generic parameters are omitted. Useful for common cases while maintaining flexibility for specific needs.

```typescript
// Default type parameter
interface Container<T = string> {
  value: T;
}

const stringContainer: Container = { value: "hello" }; // T defaults to string
const numberContainer: Container<number> = { value: 42 };

// Multiple defaults
interface Response<T = any, E = Error> {
  data?: T;
  error?: E;
}

const response1: Response = { data: "success" }; // T = any, E = Error
const response2: Response<User> = { data: { id: 1, name: "Alice", email: "a@ex.com" } };
const response3: Response<User, string> = { error: "Failed" };
```

---

## Interview Questions

### Q1: What's the difference between `T` and `any`?

**Answer:**

**Generic vs any Comparison** - Generics preserve type information and catch errors at compile time, while any disables all type checking and allows runtime errors.

```typescript
// any - no type safety
function identityAny(arg: any): any {
  return arg;
}

let result1 = identityAny("hello");
result1.toFixed(); // No error, but crashes at runtime

// Generic T - preserves type information
function identityGeneric<T>(arg: T): T {
  return arg;
}

let result2 = identityGeneric("hello");
result2.toFixed(); // Error - string doesn't have toFixed
```

**Key difference:** Generics preserve type information, `any` loses it.

---

### Q2: Implement a generic function to get the last element of an array

**Answer:**

**Generic Array Access Function** - Returns the last element with proper type inference. Union with undefined handles empty array case safely.

```typescript
function last<T>(arr: T[]): T | undefined {
  return arr[arr.length - 1];
}

// Usage
const num = last([1, 2, 3]); // number | undefined
const str = last(["a", "b", "c"]); // string | undefined

// Alternative with conditional return type
function lastSafe<T>(arr: T[]): T | undefined {
  if (arr.length === 0) return undefined;
  return arr[arr.length - 1];
}
```

---

### Q3: How do you constrain a generic type?

**Answer:**

**Generic Constraints Examples** - Shows two common constraint patterns: property constraints (extends HasLength) and key constraints (extends keyof T) for type-safe operations.

```typescript
// Constraint: T must have length property
interface HasLength {
  length: number;
}

function getLength<T extends HasLength>(arg: T): number {
  return arg.length;
}

getLength("hello"); // OK
getLength([1, 2, 3]); // OK
getLength(42); // Error - number doesn't have length

// Constraint: K must be a key of T
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const person = { name: "Alice", age: 25 };
getProperty(person, "name"); // OK
getProperty(person, "email"); // Error - email not in person
```

---

### Q4: Implement a generic Stack class

**Answer:**

**Complete Generic Stack Implementation** - Full implementation of a type-safe stack data structure with all standard operations: push, pop, peek, isEmpty, size, and clear.

```typescript
class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  size(): number {
    return this.items.length;
  }

  clear(): void {
    this.items = [];
  }
}

// Usage
const numberStack = new Stack<number>();
numberStack.push(1);
numberStack.push(2);
console.log(numberStack.pop()); // 2
```

---

### Q5: Create a generic API response type

**Answer:**

**Generic API Response Pattern** - Real-world pattern for typed HTTP responses. Includes success/error states, status codes, and a handler function that throws on errors.

```typescript
interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  status: number;
  timestamp: Date;
}

interface User {
  id: number;
  name: string;
  email: string;
}

// Success response
const successResponse: ApiResponse<User> = {
  data: { id: 1, name: "Alice", email: "alice@ex.com" },
  error: null,
  status: 200,
  timestamp: new Date()
};

// Error response
const errorResponse: ApiResponse<User> = {
  data: null,
  error: "User not found",
  status: 404,
  timestamp: new Date()
};

// Generic handler function
function handleResponse<T>(response: ApiResponse<T>): T | never {
  if (response.error) {
    throw new Error(response.error);
  }
  if (response.data === null) {
    throw new Error("No data");
  }
  return response.data;
}

const user = handleResponse(successResponse); // User
```

---

## Key Takeaways

1. **Generics provide type safety** while maintaining code reusability
2. **Type parameters** (like `T`) act as placeholders for actual types
3. **Constraints** (`extends`) limit what types can be used
4. **keyof** creates a union of object keys for type-safe property access
5. **Generic classes and interfaces** work with multiple types
6. **Inferred types** - TypeScript often infers generic types automatically
7. **Default type parameters** provide fallback types when none specified

---

## Common Generic Patterns

**Common Generic Use Cases** - Collection of frequently used generic patterns: array operations, property access, async operations, type transformations, and API responses.

```typescript
// 1. Array operations
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// 2. Object property access
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// 3. Promise resolution
function fetchData<T>(url: string): Promise<T> {
  return fetch(url).then((res) => res.json());
}

// 4. Type transformation
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

// 5. API responses
interface Response<T> {
  data: T;
  status: number;
}
```

---

## Next Steps

- [Utility Types](./04-utility-types.md)
- [Type Guards](./05-type-guards.md)
- [Advanced Types](./06-advanced-types.md)

---

[← Back to TypeScript](./README.md)
