# TypeScript Advanced Types

## Table of Contents
- [Union Types](#union-types)
- [Intersection Types](#intersection-types)
- [Type Aliases vs Interfaces](#type-aliases-vs-interfaces)
- [Literal Types](#literal-types)
- [Template Literal Types](#template-literal-types)
- [Conditional Types](#conditional-types)
- [Mapped Types](#mapped-types)
- [Index Access Types](#index-access-types)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## Union Types

Union types allow a value to be one of several types using the `|` operator.

### Basic Union Types

**Basic Union Type Syntax** - Union types allow a value to be one of several types using the | operator. TypeScript enforces type safety by preventing assignment of types not in the union.

```typescript
// Simple union
let value: string | number;
value = "hello"; // OK
value = 42; // OK
value = true; // Error

// Function with union parameter
function printId(id: string | number) {
  console.log(`ID: ${id}`);
}

printId(101); // OK
printId("202"); // OK

// Union with multiple types
type Status = "success" | "error" | "loading";
let currentStatus: Status = "loading";
currentStatus = "success"; // OK
currentStatus = "pending"; // Error
```

### Working with Union Types

**Type Narrowing with Union Types** - Union types require type guards to access type-specific methods. Only common methods available on all union members can be used without narrowing.

```typescript
// Need to narrow types before using type-specific methods
function processValue(value: string | number) {
  // Error - toUpperCase doesn't exist on number
  // value.toUpperCase();

  // Type guard needed
  if (typeof value === "string") {
    console.log(value.toUpperCase()); // OK
  } else {
    console.log(value.toFixed(2)); // OK
  }
}

// Common methods work without guards
function formatValue(value: string | number): string {
  return value.toString(); // OK - toString exists on both
}
```

### Union with null and undefined

**Nullable Union Types** - Unions with null/undefined handle optional or absent values. Optional properties (?) are equivalent to union with undefined but differ from explicit null unions.

```typescript
// Nullable types
function greet(name: string | null | undefined) {
  if (name) {
    console.log(`Hello, ${name}`);
  } else {
    console.log("Hello, guest");
  }
}

// Optional vs union with undefined
interface User {
  name: string;
  age?: number; // Same as age: number | undefined
  email: string | null; // Can be string or null
}

const user1: User = { name: "Alice", email: null }; // OK
const user2: User = { name: "Bob", age: 25, email: "bob@ex.com" }; // OK
```

### Union of Object Types

**Discriminated Union Pattern** - Union of object types with a common discriminant property. TypeScript uses the discriminant to narrow types and provide access to type-specific properties.

```typescript
interface Dog {
  type: "dog";
  bark(): void;
  breed: string;
}

interface Cat {
  type: "cat";
  meow(): void;
  indoor: boolean;
}

type Pet = Dog | Cat;

function handlePet(pet: Pet) {
  // Common properties available
  console.log(pet.type);

  // Need type guard for specific properties
  if (pet.type === "dog") {
    pet.bark();
    console.log(pet.breed);
  } else {
    pet.meow();
    console.log(pet.indoor);
  }
}
```

### Arrays with Union Types

**Union Types with Arrays** - Arrays can hold union types as elements, or a type can be a union of array and non-array. Use Array.isArray() to distinguish between single values and arrays.

```typescript
// Array of mixed types
const mixed: (string | number)[] = [1, "two", 3, "four"];

// Array or single value
type StringOrArray = string | string[];

function process(input: StringOrArray) {
  if (Array.isArray(input)) {
    input.forEach((item) => console.log(item));
  } else {
    console.log(input);
  }
}

process("hello"); // OK
process(["hello", "world"]); // OK
```

---

## Intersection Types

Intersection types combine multiple types into one using the `&` operator.

### Basic Intersection Types

**Basic Intersection Type Syntax** - Intersection types combine multiple types using the & operator. The resulting type must have ALL properties from all intersected types.

```typescript
interface Person {
  name: string;
  age: number;
}

interface Employee {
  employeeId: number;
  department: string;
}

// Intersection - has ALL properties
type EmployeePerson = Person & Employee;

const employee: EmployeePerson = {
  name: "Alice",
  age: 30,
  employeeId: 12345,
  department: "Engineering",
};
```

### Intersection with Type Aliases

**Combining Functionalities with Intersection** - Intersection types merge capabilities from multiple type aliases. The result requires implementing all methods and properties from all intersected types.

```typescript
type Printable = {
  print(): void;
};

type Saveable = {
  save(): void;
};

// Combined functionality
type Document = Printable & Saveable;

const doc: Document = {
  print() {
    console.log("Printing...");
  },
  save() {
    console.log("Saving...");
  },
};
```

### Intersection vs Extends

**Intersection vs Interface Extension** - Both intersection (&) and interface extends achieve similar results but with different syntax. Extends is more common for interfaces, while intersection works with any type.

```typescript
// Using intersection
interface A {
  a: string;
}

interface B {
  b: number;
}

type C = A & B;

// Using extends
interface D extends A, B {
  d: boolean;
}

const obj1: C = { a: "hello", b: 42 };
const obj2: D = { a: "hello", b: 42, d: true };
```

### Mixing Intersection and Union

**Combining Union and Intersection Types** - Complex types can mix union and intersection operators. Parentheses control precedence, creating unions of intersections or other combinations.

```typescript
type Admin = {
  role: "admin";
  permissions: string[];
};

type User = {
  role: "user";
  username: string;
};

type Guest = {
  role: "guest";
};

// Union of intersections
type AuthenticatedUser = (Admin | User) & {
  authenticated: true;
  token: string;
};

const admin: AuthenticatedUser = {
  role: "admin",
  permissions: ["read", "write"],
  authenticated: true,
  token: "abc123",
};
```

### Conflicting Properties

**Intersection with Conflicting Property Types** - When intersecting types with same property names but different types, the property becomes never (impossible to satisfy). Avoid conflicts by ensuring compatible property types.

```typescript
// Intersection with conflicting types
interface X {
  value: string;
}

interface Y {
  value: number;
}

// value is never - can't be both string and number
type Z = X & Y;

// This won't work
const z: Z = {
  value: "hello", // Error
};

// Better approach - use union for conflicting properties
interface A {
  name: string;
}

interface B {
  age: number;
}

type Combined = A & B; // OK - no conflicts
```

---

## Type Aliases vs Interfaces

### Type Aliases

**Type Alias Definitions** - Type aliases create reusable names for any type including primitives, unions, objects, and functions. More flexible than interfaces for non-object types.

```typescript
// Basic type alias
type ID = string | number;
type Point = { x: number; y: number };

// Type alias with primitives
type Status = "pending" | "success" | "error";

// Type alias with union
type StringOrNumber = string | number;

// Type alias with function
type MathOperation = (a: number, b: number) => number;

const add: MathOperation = (a, b) => a + b;
```

### Interfaces

**Interface Definitions** - Interfaces define contracts for object shapes with properties and methods. Support inheritance through extends, ideal for object-oriented patterns.

```typescript
// Basic interface
interface User {
  id: number;
  name: string;
  email: string;
}

// Interface with methods
interface Repository {
  getAll(): User[];
  getById(id: number): User | undefined;
}

// Interface extending another
interface Admin extends User {
  permissions: string[];
}
```

### Key Differences

**Interface vs Type Alias Comparison** - Interfaces support declaration merging and are limited to object shapes. Type aliases can represent any type including unions, primitives, and tuples but cannot be merged.

```typescript
// 1. Declaration merging (interfaces only)
interface Window {
  title: string;
}

interface Window {
  width: number;
}

// Window now has both title and width
const win: Window = { title: "My App", width: 1920 };

// Type aliases can't be merged
type Config = { theme: string };
// type Config = { language: string }; // Error: Duplicate identifier

// 2. Extends vs Intersection
interface A {
  a: string;
}

interface B extends A {
  b: number;
}

type C = A & { b: number }; // Similar to B

// 3. Union types (type alias only)
type StringOrNumber = string | number; // OK

// interface StringOrNumber = string | number; // Error

// 4. Primitive types (type alias only)
type ID = string; // OK
// interface ID = string; // Error

// 5. Tuple types (type alias preferred)
type Coordinate = [number, number]; // OK
interface ICoordinate {
  0: number;
  1: number;
  length: 2;
} // Possible but awkward
```

### When to Use Which

**Choosing Between Interface and Type** - Use interfaces for object shapes, classes, and when declaration merging is needed. Use type aliases for unions, primitives, tuples, and complex type transformations.

```typescript
// Use interfaces for:
// - Object shapes
// - Classes
// - When you need declaration merging
interface User {
  id: number;
  name: string;
}

class UserImpl implements User {
  constructor(public id: number, public name: string) {}
}

// Use type aliases for:
// - Unions and intersections
// - Primitive aliases
// - Tuple types
// - Function types
type ID = string | number;
type Status = "pending" | "success" | "error";
type Callback = (data: string) => void;
type Point = [number, number];
```

---

## Literal Types

Literal types allow you to specify exact values a variable can have.

### String Literal Types

**String Literal Type Unions** - String literal types restrict values to specific strings. Useful for defining allowed values like directions, HTTP methods, or status codes.

```typescript
// Single literal
type Direction = "north" | "south" | "east" | "west";

function move(direction: Direction) {
  console.log(`Moving ${direction}`);
}

move("north"); // OK
move("up"); // Error

// Real-world example
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

function makeRequest(url: string, method: HttpMethod) {
  console.log(`${method} ${url}`);
}

makeRequest("/api/users", "GET"); // OK
makeRequest("/api/users", "FETCH"); // Error
```

### Number Literal Types

**Number Literal Type Unions** - Number literals restrict values to specific numbers. Common for dice rolls, HTTP status codes, or other numeric constants with finite valid values.

```typescript
type DiceRoll = 1 | 2 | 3 | 4 | 5 | 6;

function rollDice(): DiceRoll {
  return (Math.floor(Math.random() * 6) + 1) as DiceRoll;
}

// HTTP status codes
type SuccessStatus = 200 | 201 | 204;
type ErrorStatus = 400 | 401 | 403 | 404 | 500;
type HttpStatus = SuccessStatus | ErrorStatus;

function handleResponse(status: HttpStatus) {
  if (status >= 200 && status < 300) {
    console.log("Success");
  } else {
    console.log("Error");
  }
}
```

### Boolean Literal Types

**Boolean Literal Types for Discriminated Unions** - Specific true/false literals enable type discrimination. Commonly used in success/error response patterns to distinguish between outcomes.

```typescript
// Specific boolean value
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

### Literal Type Inference

**Literal Type Inference and Widening** - TypeScript widens let variables to general types but keeps const as literals. Use 'as const' assertion to force literal types and make objects deeply readonly.

```typescript
// Without const - type is widened
let status1 = "pending"; // type: string

// With const - type is literal
const status2 = "pending"; // type: "pending"

// Force literal type
let status3 = "pending" as const; // type: "pending"

// Object literals
const config = {
  method: "GET", // type: string
  timeout: 5000, // type: number
};

const strictConfig = {
  method: "GET",
  timeout: 5000,
} as const; // All properties become readonly literals

// strictConfig type:
// {
//   readonly method: "GET";
//   readonly timeout: 5000;
// }
```

---

## Template Literal Types

Template literal types build new string literal types using template literal syntax.

### Basic Template Literals

**Template Literal Type Syntax** - Template literals create string types from patterns, combining string literals with interpolation. Generates all combinations when used with union types.

```typescript
// Simple template literal type
type Greeting = `Hello, ${string}`;

const greeting1: Greeting = "Hello, World"; // OK
const greeting2: Greeting = "Hi, World"; // Error

// Combining literals
type Direction = "left" | "right" | "top" | "bottom";
type Padding = `padding-${Direction}`;

// Padding type is:
// "padding-left" | "padding-right" | "padding-top" | "padding-bottom"

const padding1: Padding = "padding-left"; // OK
const padding2: Padding = "margin-left"; // Error
```

### Complex Template Literals

**Multi-Part Template Literal Types** - Multiple interpolations create complex patterns. Cartesian product of all union combinations generates comprehensive type coverage for API routes, CSS values, etc.

```typescript
// Multiple interpolations
type HttpMethod = "GET" | "POST";
type ApiVersion = "v1" | "v2";
type Endpoint = `/${ApiVersion}/${string}`;

type ApiUrl = `${HttpMethod} ${Endpoint}`;

// ApiUrl type:
// "GET /v1/${string}" | "GET /v2/${string}" |
// "POST /v1/${string}" | "POST /v2/${string}"

const url1: ApiUrl = "GET /v1/users"; // OK
const url2: ApiUrl = "POST /v2/products"; // OK
const url3: ApiUrl = "DELETE /v1/users"; // Error

// CSS properties
type CssUnit = "px" | "em" | "rem" | "%";
type Size = `${number}${CssUnit}`;

const width: Size = "100px"; // OK
const height: Size = "2.5rem"; // OK
// const margin: Size = "auto"; // Error
```

### Intrinsic String Manipulation Types

**Built-in String Transformation Utilities** - TypeScript provides intrinsic string manipulation types for case conversion. Commonly used with template literals to generate event handlers, method names, or CSS classes.

```typescript
// Built-in utilities
type Uppercase<S extends string> = intrinsic;
type Lowercase<S extends string> = intrinsic;
type Capitalize<S extends string> = intrinsic;
type Uncapitalize<S extends string> = intrinsic;

// Examples
type UpperGreeting = Uppercase<"hello">; // "HELLO"
type LowerGreeting = Lowercase<"HELLO">; // "hello"
type CapitalGreeting = Capitalize<"hello">; // "Hello"
type UncapitalGreeting = Uncapitalize<"Hello">; // "hello"

// Real-world usage
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;

// EventHandler type:
// "onClick" | "onFocus" | "onBlur"

interface Events {
  onClick: () => void;
  onFocus: () => void;
  onBlur: () => void;
}
```

### Practical Examples

**Real-World Template Literal Applications** - Template literals excel at generating API routes, CSS class names, and database column references. Combines type safety with string pattern generation.

```typescript
// API endpoints
type Resource = "users" | "posts" | "comments";
type Action = "list" | "create" | "update" | "delete";
type ApiRoute = `/${Resource}/${Action}`;

// CSS classes
type Color = "red" | "blue" | "green";
type Shade = "light" | "dark";
type ColorClass = `${Color}-${Shade}`;
// "red-light" | "red-dark" | "blue-light" | etc.

// Database columns
type Table = "users" | "posts";
type Column<T extends Table> = T extends "users"
  ? "id" | "name" | "email"
  : "id" | "title" | "content";

type UserColumn = `users.${Column<"users">}`;
// "users.id" | "users.name" | "users.email"
```

---

## Conditional Types

Conditional types select types based on conditions using the `extends` keyword.

### Basic Conditional Types

**Conditional Type Ternary Syntax** - Conditional types use extends keyword with ternary-like syntax (T extends U ? X : Y). Checks if type T is assignable to U, returning X if true, Y if false.

```typescript
// Syntax: T extends U ? X : Y
type IsString<T> = T extends string ? true : false;

type A = IsString<string>; // true
type B = IsString<number>; // false

// Check if type is array
type IsArray<T> = T extends any[] ? true : false;

type C = IsArray<string[]>; // true
type D = IsArray<number>; // false
```

### Conditional Types with infer

**Type Inference with infer Keyword** - infer keyword extracts types from conditional type checks. Captures type information from function returns, array elements, Promise resolutions, or any structural type.

```typescript
// Extract return type
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function greet(): string {
  return "Hello";
}

type GreetReturn = ReturnType<typeof greet>; // string

// Extract array element type
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type E1 = ArrayElement<string[]>; // string
type E2 = ArrayElement<number[]>; // number

// Extract Promise type
type Unpromise<T> = T extends Promise<infer U> ? U : T;

type P1 = Unpromise<Promise<string>>; // string
type P2 = Unpromise<number>; // number
```

### Distributive Conditional Types

**Distribution Over Union Types** - Conditional types automatically distribute over unions, applying the condition to each member separately. Wrap in tuple [T] to prevent distribution and treat union as single type.

```typescript
// Distributes over union types
type ToArray<T> = T extends any ? T[] : never;

type StrOrNum = string | number;
type StrOrNumArray = ToArray<StrOrNum>;
// string[] | number[] (distributed)

// Non-distributive (wrap in tuple)
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type StrOrNumArray2 = ToArrayNonDist<StrOrNum>;
// (string | number)[] (not distributed)
```

### Practical Conditional Types

**Utility Type Implementations** - Conditional types power utility types like NonNullable, function extractors, and recursive transformations. Enable deep readonly, nullability removal, and type filtering.

```typescript
// Remove null and undefined
type NonNullable<T> = T extends null | undefined ? never : T;

type T1 = NonNullable<string | null>; // string
type T2 = NonNullable<number | undefined>; // number

// Extract function types
type FunctionType<T> = T extends (...args: any[]) => any ? T : never;

type F1 = FunctionType<() => void>; // () => void
type F2 = FunctionType<string>; // never

// Deep readonly
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

interface User {
  name: string;
  address: {
    street: string;
    city: string;
  };
}

type ReadonlyUser = DeepReadonly<User>;
// All properties and nested properties are readonly
```

### Nested Conditional Types

**Recursive Conditional Type Navigation** - Nested conditionals with template literals and infer enable type-safe property path navigation. Parses dot-notation paths to extract deeply nested property types.

```typescript
// Get type of nested property
type GetProperty<T, K extends string> = K extends `${infer First}.${infer Rest}`
  ? First extends keyof T
    ? GetProperty<T[First], Rest>
    : never
  : K extends keyof T
  ? T[K]
  : never;

interface User {
  info: {
    name: string;
    age: number;
  };
}

type Name = GetProperty<User, "info.name">; // string
type Age = GetProperty<User, "info.age">; // number
```

---

## Mapped Types

Mapped types create new types by transforming properties of existing types.

### Basic Mapped Types

**Mapped Type Transformations** - Mapped types iterate over keys using [P in keyof T] to transform all properties. Add or remove modifiers like optional (?) or readonly using + and - prefixes.

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

// Make all properties required
type Required<T> = {
  [P in keyof T]-?: T[P];
};

interface Config {
  theme?: string;
  language?: string;
}

type RequiredConfig = Required<Config>;
// { theme: string; language: string; }
```

### Readonly Mapped Types

**Readonly Modifiers in Mapped Types** - Add readonly modifier to prevent mutations, or remove it with -readonly for mutable versions. Useful for immutable data structures and configuration objects.

```typescript
// Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

// Remove readonly
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};
```

### Pick and Omit

**Selective Property Mapping** - Pick selects specific properties by mapping over a subset of keys. Omit excludes properties by combining Exclude and Pick for inverse selection.

```typescript
// Pick specific properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type UserCredentials = Pick<User, "name" | "email">;
// { name: string; email: string; }

// Omit specific properties
type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type UserWithoutId = Omit<User, "id">;
// { name: string; email: string; }
```

### Record Type

**Record Type for Key-Value Mappings** - Creates object types with specified keys and uniform value types. Maps over provided keys K, assigning type T to each, ideal for dictionaries and lookup tables.

```typescript
// Create object type with specific keys
type Record<K extends keyof any, T> = {
  [P in K]: T;
};

type UserRoles = Record<"admin" | "user" | "guest", boolean>;
// { admin: boolean; user: boolean; guest: boolean; }

// Real-world example
type HttpStatusMessages = Record<number, string>;

const statusMessages: HttpStatusMessages = {
  200: "OK",
  404: "Not Found",
  500: "Internal Server Error",
};
```

### Advanced Mapped Types

**Property Type Transformation** - Mapped types can change property types uniformly. Transform all properties to string, add nullability, or apply any type transformation while preserving property names.

```typescript
// Change property types
type Stringify<T> = {
  [P in keyof T]: string;
};

interface Data {
  id: number;
  count: number;
  active: boolean;
}

type StringData = Stringify<Data>;
// { id: string; count: string; active: string; }

// Nullable properties
type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

type NullableUser = Nullable<User>;
// { id: number | null; name: string | null; email: string | null; }
```

### Key Remapping

**Key Remapping in Mapped Types (TypeScript 4.1+)** - Use 'as' clause to rename keys during mapping. Combines with template literals and Exclude to generate getter methods or filter unwanted properties.

```typescript
// Rename keys (TypeScript 4.1+)
type Getters<T> = {
  [P in keyof T as `get${Capitalize<string & P>}`]: () => T[P];
};

interface Person {
  name: string;
  age: number;
}

type PersonGetters = Getters<Person>;
// {
//   getName: () => string;
//   getAge: () => number;
// }

// Filter properties
type RemoveKindField<T> = {
  [P in keyof T as Exclude<P, "kind">]: T[P];
};

interface Circle {
  kind: "circle";
  radius: number;
}

type CircleWithoutKind = RemoveKindField<Circle>;
// { radius: number; }
```

---

## Index Access Types

Index access types allow you to look up specific properties on another type.

### Basic Index Access

**Index Access Type Syntax** - Access property types using bracket notation T["property"]. Returns the type of that property, or union of multiple property types when accessing multiple keys.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

// Get type of specific property
type UserId = User["id"]; // number
type UserName = User["name"]; // string

// Get multiple properties
type UserContact = User["name" | "email"];
// string (union of name and email types)
```

### Array Index Access

**Array Element Type Extraction** - Use [number] to access array element types. With const assertions, extracts union of literal values. Generic pattern works for any readonly array type.

```typescript
// Get element type from array
const colors = ["red", "green", "blue"] as const;
type Color = typeof colors[number];
// "red" | "green" | "blue"

// Generic array element
type ArrayElement<T extends readonly any[]> = T[number];

const numbers = [1, 2, 3] as const;
type Num = ArrayElement<typeof numbers>; // 1 | 2 | 3
```

### Nested Index Access

**Chained Index Access for Nested Types** - Chain bracket notation to access deeply nested property types. Each level of access narrows to the specific nested type at that path.

```typescript
interface Data {
  user: {
    profile: {
      name: string;
      age: number;
    };
  };
}

type ProfileName = Data["user"]["profile"]["name"]; // string
type Profile = Data["user"]["profile"];
// { name: string; age: number; }
```

### Index Access with keyof

**Combined keyof and Index Access** - Use keyof to get all keys, then index access to get union of all value types. Enables generic property getter functions with full type safety.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Get all property types
type UserValue = User[keyof User];
// number | string (union of all value types)

// Function to get any property
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user: User = { id: 1, name: "Alice", email: "alice@ex.com" };
const name = getProperty(user, "name"); // string
const id = getProperty(user, "id"); // number
```

### Conditional Index Access

**Index Access with ReturnType** - Combine index access with ReturnType to extract return types from interface methods. Type-safe way to get return types without invoking functions.

```typescript
// Get function return types
interface Api {
  getUser(): Promise<User>;
  getPosts(): Promise<Post[]>;
  getComments(): Promise<Comment[]>;
}

type ApiReturnType<T extends keyof Api> = ReturnType<Api[T]>;

type UserReturn = ApiReturnType<"getUser">; // Promise<User>
type PostsReturn = ApiReturnType<"getPosts">; // Promise<Post[]>
```

---

## Common Pitfalls

### Pitfall 1: Union vs Intersection Confusion

**Common Misunderstanding** - Union (|) means value can be ONE of the types, not "combine properties". Intersection (&) means value MUST have ALL properties from all types. Understanding this distinction prevents logical errors.

```typescript
// Wrong assumption
type A = { a: string };
type B = { b: number };

// Union - value is A OR B (not both)
type UnionAB = A | B;
const union1: UnionAB = { a: "hello" }; // OK
const union2: UnionAB = { b: 42 }; // OK
const union3: UnionAB = { a: "hello", b: 42 }; // OK (has both)

// Intersection - value must be A AND B (has all properties)
type IntersectionAB = A & B;
const inter1: IntersectionAB = { a: "hello", b: 42 }; // OK
// const inter2: IntersectionAB = { a: "hello" }; // Error - missing b
```

### Pitfall 2: Type vs Interface for Unions

**Syntax Limitation** - Interfaces cannot represent union types, only object shapes. Always use type aliases for union types, primitives, or any non-object type definitions.

```typescript
// Wrong - interfaces can't represent unions
// interface StringOrNumber = string | number; // Error

// Correct - use type alias
type StringOrNumber = string | number; // OK
```

### Pitfall 3: Modifying Literal Types

**Type Widening Issue** - Object literals without 'as const' widen to general types (string instead of "GET"). Use 'as const' assertion to preserve literal types and make properties readonly.

```typescript
// Wrong - type widening
const config = {
  method: "GET", // type: string (not "GET")
};

// Correct - use as const
const config2 = {
  method: "GET",
} as const; // type: { readonly method: "GET" }
```

### Pitfall 4: Optional vs Undefined

**Optional vs Explicit Undefined** - Optional properties (?) can be omitted entirely. Properties typed as 'type | undefined' must be present in the object, even if value is undefined.

```typescript
interface User {
  name: string;
  age?: number; // Can be undefined or omitted
  email: string | undefined; // Must be present, can be undefined
}

const user1: User = { name: "Alice", email: undefined }; // OK
// const user2: User = { name: "Bob" }; // Error - email required
const user3: User = { name: "Charlie", age: 25, email: undefined }; // OK
```

---

## Interview Questions

### Q1: What's the difference between union and intersection types?

**Answer:**

**Union vs Intersection Operators** - Union (|) allows one of several types. Intersection (&) requires all types simultaneously. Union for alternatives, intersection for combinations.

```typescript
// Union (|) - value can be ONE of the types
type Union = string | number;
let union: Union = "hello"; // OK
union = 42; // OK

// Intersection (&) - value must satisfy ALL types
interface A {
  a: string;
}
interface B {
  b: number;
}
type Intersection = A & B;

const value: Intersection = {
  a: "hello",
  b: 42, // Must have both properties
};

// Key difference:
// Union: OR - value is this OR that
// Intersection: AND - value is this AND that
```

---

### Q2: When should you use type alias vs interface?

**Answer:**

**Type vs Interface Decision Guide** - Use interfaces for objects, classes, and extensibility. Use types for unions, primitives, tuples, and complex transformations. Interfaces offer better ergonomics for object-oriented patterns.

```typescript
// Use interface for:
// 1. Object shapes and classes
interface User {
  id: number;
  name: string;
}

// 2. When you need declaration merging
interface Window {
  customProp: string;
}

// 3. Extending other interfaces
interface Admin extends User {
  permissions: string[];
}

// Use type alias for:
// 1. Unions and intersections
type ID = string | number;

// 2. Primitives
type Status = "pending" | "success" | "error";

// 3. Tuples
type Point = [number, number];

// 4. Complex type transformations
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

// Both work for objects, but interfaces are preferred for:
// - Better error messages
// - Slightly better performance
// - More familiar OOP pattern
```

---

### Q3: Explain conditional types with an example

**Answer:**

**Conditional Type Examples** - Demonstrates ternary-like type selection based on extends checks. Shows type checking, infer for extraction, and null removal. Foundation for utility types.

```typescript
// Conditional type syntax: T extends U ? X : Y
// If T extends U, return X, otherwise Y

// Example 1: Check if type is array
type IsArray<T> = T extends any[] ? true : false;

type Test1 = IsArray<string[]>; // true
type Test2 = IsArray<number>; // false

// Example 2: Extract return type with infer
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

function getUser(): { id: number; name: string } {
  return { id: 1, name: "Alice" };
}

type User = ReturnType<typeof getUser>;
// { id: number; name: string }

// Example 3: Remove null/undefined
type NonNullable<T> = T extends null | undefined ? never : T;

type T1 = NonNullable<string | null>; // string
type T2 = NonNullable<number | undefined>; // number

// Real-world use:
// - Type transformations
// - Extracting types from complex structures
// - Building utility types
```

---

### Q4: What are mapped types and how do you use them?

**Answer:**

**Mapped Type Pattern Examples** - Shows common mapped type patterns including Partial, Readonly, Pick, and type transformation. Demonstrates modifier syntax (+/- for optional and readonly).

```typescript
// Mapped types transform properties of existing types

// Example 1: Make all properties optional
type Partial<T> = {
  [P in keyof T]?: T[P];
};

interface User {
  id: number;
  name: string;
}

type PartialUser = Partial<User>;
// { id?: number; name?: string; }

// Example 2: Make all properties readonly
type Readonly<T> = {
  readonly [P in keyof T]: T[P];
};

type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; }

// Example 3: Pick specific properties
type Pick<T, K extends keyof T> = {
  [P in K]: T[P];
};

type UserName = Pick<User, "name">;
// { name: string; }

// Example 4: Transform property types
type Stringify<T> = {
  [P in keyof T]: string;
};

type StringUser = Stringify<User>;
// { id: string; name: string; }

// Modifiers:
// -? : Remove optional
// -readonly : Remove readonly
// +? : Add optional
// +readonly : Add readonly
```

---

### Q5: What are template literal types?

**Answer:**

**Template Literal Type Applications** - Demonstrates template literal syntax for generating type-safe strings. Shows basic patterns, union combinations, case transformations, and practical API/event handler examples.

```typescript
// Template literal types create string literal types using template syntax

// Example 1: Basic template
type Greeting = `Hello, ${string}`;
const g1: Greeting = "Hello, World"; // OK
// const g2: Greeting = "Hi, World"; // Error

// Example 2: Combining literals
type Direction = "left" | "right" | "top" | "bottom";
type Margin = `margin-${Direction}`;

// Margin is:
// "margin-left" | "margin-right" | "margin-top" | "margin-bottom"

// Example 3: Event handlers
type EventName = "click" | "focus" | "blur";
type EventHandler = `on${Capitalize<EventName>}`;

// EventHandler is:
// "onClick" | "onFocus" | "onBlur"

interface Events {
  onClick: () => void;
  onFocus: () => void;
  onBlur: () => void;
}

// Example 4: API routes
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";
type Resource = "users" | "posts";
type ApiRoute = `${HttpMethod} /${Resource}`;

// ApiRoute is:
// "GET /users" | "GET /posts" | "POST /users" | etc.

// Built-in utilities:
// Uppercase<S> - Convert to uppercase
// Lowercase<S> - Convert to lowercase
// Capitalize<S> - Capitalize first letter
// Uncapitalize<S> - Uncapitalize first letter
```

---

### Q6: How do you create a type that picks only function properties?

**Answer:**

**Advanced Mapped and Conditional Type Combination** - Uses mapped types with conditional checks to filter properties by type. Demonstrates function property extraction and its inverse (non-function properties).

```typescript
// Solution using conditional types and mapped types

type FunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? K : never;
}[keyof T];

type FunctionProperties<T> = Pick<T, FunctionPropertyNames<T>>;

// Example
interface User {
  id: number;
  name: string;
  getName(): string;
  setName(name: string): void;
  age: number;
}

type UserFunctions = FunctionProperties<User>;
// {
//   getName: () => string;
//   setName: (name: string) => void;
// }

// Step by step:
// 1. FunctionPropertyNames creates mapped type that returns key if function, never otherwise
// 2. [keyof T] indexes into the type to get union of keys
// 3. Pick selects only those properties from original type

// Alternative: Non-function properties
type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T];

type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

type UserData = NonFunctionProperties<User>;
// { id: number; name: string; age: number; }
```

---

## Key Takeaways

1. **Union types** (`|`) - value can be one of several types
2. **Intersection types** (`&`) - value must satisfy all types
3. **Type aliases** - more flexible, support unions/primitives/tuples
4. **Interfaces** - better for objects, support declaration merging
5. **Literal types** - exact values (string, number, boolean)
6. **Template literals** - create string types from patterns
7. **Conditional types** - select types based on conditions
8. **Mapped types** - transform properties of existing types
9. **Index access** - look up property types from other types

---

## Best Practices

**Best Practice: Interfaces for Objects** - Prefer interfaces for object shapes due to better error messages and extensibility. Reserve type aliases for non-object types.

```typescript
// Good
interface User {
  id: number;
  name: string;
}

// Use type for everything else
type ID = string | number;
```

**Best Practice: Const Assertions** - Use 'as const' to preserve literal types and create deeply readonly objects. Prevents unintended type widening.

```typescript
const config = {
  theme: "dark",
  port: 3000,
} as const;
```

**Best Practice: Union and Intersection Combinations** - Combine operators strategically with parentheses for complex type requirements. Union of intersections or vice versa.

```typescript
type AuthenticatedUser = (Admin | User) & { token: string };
```

**Best Practice: Template Literals for Patterns** - Leverage template literal types for type-safe string patterns in CSS, APIs, or event handlers.

```typescript
type CssClass = `${Color}-${Shade}`;
```

---

## Next Steps

- [Type Guards](./05-type-guards.md)
- [Enums and Literals](./07-enums-literals.md)
- [React TypeScript](./08-react-typescript.md)

---

[← Back to TypeScript](./README.md)
