# TypeScript Utility Types

## Table of Contents
- [Introduction](#introduction)
- [Property Modifiers](#property-modifiers)
- [Type Transformations](#type-transformations)
- [String Manipulation](#string-manipulation)
- [Advanced Utilities](#advanced-utilities)
- [Custom Utility Types](#custom-utility-types)
- [Interview Questions](#interview-questions)

---

## Introduction

TypeScript provides built-in utility types to transform and manipulate existing types. These utilities help create new types from existing ones without duplication.

---

## Property Modifiers

### Partial<T>
Makes all properties optional.

**Partial Utility Type** - Makes all properties of a type optional. Useful for update operations where you only want to modify some properties without requiring all fields.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

type PartialUser = Partial<User>;
// {
//   id?: number;
//   name?: string;
//   email?: string;
//   age?: number;
// }

// Use case: Update functions
function updateUser(id: number, updates: Partial<User>): User {
  const user = getUserById(id);
  return { ...user, ...updates };
}

updateUser(1, { name: "Alice" }); // OK - only update name
updateUser(2, { age: 30, email: "bob@ex.com" }); // OK
```

### Required<T>
Makes all properties required.

**Required Utility Type** - Removes optionality from all properties, making them required. Ensures complete data when optional properties need to become mandatory.

```typescript
interface User {
  id?: number;
  name?: string;
  email?: string;
}

type RequiredUser = Required<User>;
// {
//   id: number;
//   name: string;
//   email: string;
// }

// Use case: Ensure complete data
function createUser(data: Required<User>): User {
  // data must have all properties
  return data;
}

createUser({ id: 1, name: "Alice" }); // Error - missing email
createUser({ id: 1, name: "Alice", email: "a@ex.com" }); // OK
```

### Readonly<T>
Makes all properties readonly.

**Readonly Utility Type** - Adds readonly modifier to all properties, preventing mutations. Essential for immutable data structures and configuration objects.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

type ReadonlyUser = Readonly<User>;
// {
//   readonly id: number;
//   readonly name: string;
//   readonly email: string;
// }

const user: ReadonlyUser = {
  id: 1,
  name: "Alice",
  email: "alice@ex.com"
};

user.name = "Bob"; // Error - readonly property

// Use case: Immutable config
const config: Readonly<{
  apiUrl: string;
  timeout: number;
}> = {
  apiUrl: "https://api.example.com",
  timeout: 5000
};

config.timeout = 3000; // Error
```

---

## Type Transformations

### Pick<T, K>
Creates a type by picking specific properties from T.

**Pick Utility Type** - Selects specific properties from a type to create a new type. Ideal for creating API response types or selecting public properties.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  age: number;
}

type UserPublicInfo = Pick<User, "id" | "name" | "email">;
// {
//   id: number;
//   name: string;
//   email: string;
// }

// Use case: API responses (exclude sensitive data)
function getPublicUserInfo(user: User): UserPublicInfo {
  return {
    id: user.id,
    name: user.name,
    email: user.email
  };
}
```

### Omit<T, K>
Creates a type by omitting specific properties from T.

**Omit Utility Type** - Excludes specific properties from a type. Useful for removing sensitive data like passwords or generated fields like IDs.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

type UserWithoutPassword = Omit<User, "password">;
// {
//   id: number;
//   name: string;
//   email: string;
// }

// Omit multiple properties
type BasicUser = Omit<User, "password" | "email">;
// {
//   id: number;
//   name: string;
// }

// Use case: Form data (exclude generated fields)
type CreateUserInput = Omit<User, "id">;

function createUser(input: CreateUserInput): User {
  return {
    id: Math.random(), // Generated
    ...input
  };
}
```

### Record<K, T>
Creates an object type with keys K and values T.

**Record Utility Type** - Creates an object type with specified keys and uniform value types. Perfect for dictionaries, maps, and lookup tables.

```typescript
// Simple record
type Status = "pending" | "success" | "error";

type StatusMessages = Record<Status, string>;
// {
//   pending: string;
//   success: string;
//   error: string;
// }

const messages: StatusMessages = {
  pending: "Loading...",
  success: "Done!",
  error: "Failed!"
};

// Use case: Dictionary/map
type UserMap = Record<number, User>;

const users: UserMap = {
  1: { id: 1, name: "Alice", email: "a@ex.com", password: "***" },
  2: { id: 2, name: "Bob", email: "b@ex.com", password: "***" }
};

// String keys
type Translations = Record<string, string>;

const en: Translations = {
  hello: "Hello",
  goodbye: "Goodbye"
};
```

### Extract<T, U>
Extracts from T types that are assignable to U.

**Extract Utility Type** - Filters a union type to include only types assignable to U. Useful for narrowing down union types to specific subsets.

```typescript
type Status = "pending" | "success" | "error" | "cancelled";

// Extract specific types
type SuccessOrError = Extract<Status, "success" | "error">;
// "success" | "error"

// Use case: Filter union types
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; size: number }
  | { kind: "triangle"; base: number; height: number };

type CircleShape = Extract<Shape, { kind: "circle" }>;
// { kind: "circle"; radius: number }

// Extract function types
type T = string | number | (() => void);
type FunctionTypes = Extract<T, Function>;
// () => void
```

### Exclude<T, U>
Excludes from T types that are assignable to U.

**Exclude Utility Type** - Filters a union type to remove types assignable to U. Opposite of Extract, useful for removing unwanted types from unions.

```typescript
type Status = "pending" | "success" | "error" | "cancelled";

// Exclude specific types
type ActiveStatus = Exclude<Status, "cancelled">;
// "pending" | "success" | "error"

// Use case: Remove unwanted types
type Primitive = string | number | boolean | null | undefined;
type NonNullablePrimitive = Exclude<Primitive, null | undefined>;
// string | number | boolean

// Exclude multiple types
type T = string | number | boolean;
type StringOrNumber = Exclude<T, boolean>;
// string | number
```

### NonNullable<T>
Excludes null and undefined from T.

**NonNullable Utility Type** - Removes null and undefined from a type. Ensures values are defined, useful for strict null checking and validation functions.

```typescript
type T = string | number | null | undefined;

type NonNullableT = NonNullable<T>;
// string | number

// Use case: Ensure value exists
function processValue<T>(value: T): NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error("Value is required");
  }
  return value;
}

const result = processValue<string | null>("hello"); // string
```

---

## String Manipulation

### Uppercase<T>
Converts string literal type to uppercase.

**Uppercase String Utility** - Transforms string literal types to uppercase. Useful for constant naming conventions and API method normalization.

```typescript
type Greeting = "hello";
type UpperGreeting = Uppercase<Greeting>;
// "HELLO"

// Use case: Constant naming
type HttpMethod = "get" | "post" | "put" | "delete";
type HttpMethodUpper = Uppercase<HttpMethod>;
// "GET" | "POST" | "PUT" | "DELETE"

const method: HttpMethodUpper = "GET"; // OK
```

### Lowercase<T>
Converts string literal type to lowercase.

**Lowercase String Utility** - Transforms string literal types to lowercase. Useful for normalizing user input types or status codes.

```typescript
type Greeting = "HELLO";
type LowerGreeting = Lowercase<Greeting>;
// "hello"

type Status = "PENDING" | "SUCCESS" | "ERROR";
type LowerStatus = Lowercase<Status>;
// "pending" | "success" | "error"
```

### Capitalize<T>
Capitalizes first letter of string literal type.

**Capitalize String Utility** - Capitalizes the first character of string literal types. Useful for property name transformations and display formatting.

```typescript
type Greeting = "hello";
type CapitalizedGreeting = Capitalize<Greeting>;
// "Hello"

// Use case: Property name transformation
type Status = "pending" | "success" | "error";
type StatusCapitalized = Capitalize<Status>;
// "Pending" | "Success" | "Error"
```

### Uncapitalize<T>
Uncapitalizes first letter of string literal type.

**Uncapitalize String Utility** - Lowercases the first character of string literal types. Useful for converting PascalCase to camelCase in type transformations.

```typescript
type Greeting = "Hello";
type UncapitalizedGreeting = Uncapitalize<Greeting>;
// "hello"

type Name = "Alice" | "Bob";
type LowerName = Uncapitalize<Name>;
// "alice" | "bob"
```

---

## Advanced Utilities

### ReturnType<T>
Extracts the return type of a function.

**ReturnType Utility** - Extracts the return type from a function type. Essential for type inference when working with functions whose return types aren't explicitly defined.

```typescript
function getUser() {
  return {
    id: 1,
    name: "Alice",
    email: "alice@ex.com"
  };
}

type User = ReturnType<typeof getUser>;
// {
//   id: number;
//   name: string;
//   email: string;
// }

// Generic function
function createResponse<T>(data: T) {
  return {
    data,
    status: 200,
    timestamp: new Date()
  };
}

type Response = ReturnType<typeof createResponse<string>>;
// {
//   data: string;
//   status: number;
//   timestamp: Date;
// }
```

### Parameters<T>
Extracts the parameter types of a function as a tuple.

**Parameters Utility** - Extracts function parameter types as a tuple. Useful for wrapper functions, decorators, and forwarding function arguments.

```typescript
function createUser(name: string, age: number, email: string) {
  return { name, age, email };
}

type CreateUserParams = Parameters<typeof createUser>;
// [name: string, age: number, email: string]

// Use case: Wrapper functions
function loggedCreateUser(...args: Parameters<typeof createUser>) {
  console.log("Creating user with:", args);
  return createUser(...args);
}

loggedCreateUser("Alice", 25, "a@ex.com");
```

### ConstructorParameters<T>
Extracts constructor parameter types.

**ConstructorParameters Utility** - Extracts constructor parameter types as a tuple. Useful for factory functions and dependency injection patterns.

```typescript
class User {
  constructor(public name: string, public age: number) {}
}

type UserConstructorParams = ConstructorParameters<typeof User>;
// [name: string, age: number]

// Use case: Factory functions
function createUser(...args: ConstructorParameters<typeof User>): User {
  return new User(...args);
}
```

### InstanceType<T>
Extracts the instance type of a constructor function.

**InstanceType Utility** - Extracts the instance type from a constructor function. Useful for generic factories that work with class constructors.

```typescript
class User {
  constructor(public name: string, public age: number) {}
}

type UserInstance = InstanceType<typeof User>;
// User

// Use case: Generic factory
function createInstance<T extends new (...args: any[]) => any>(
  constructor: T,
  ...args: ConstructorParameters<T>
): InstanceType<T> {
  return new constructor(...args);
}

const user = createInstance(User, "Alice", 25);
```

### Awaited<T>
Unwraps Promise types recursively.

**Awaited Utility (TypeScript 4.5+)** - Recursively unwraps Promise types to get the resolved value type. Essential for typing async/await functions and promise chains.

```typescript
type A = Awaited<Promise<string>>;
// string

type B = Awaited<Promise<Promise<number>>>;
// number

type C = Awaited<Promise<string> | number>;
// string | number

// Use case: Async function return types
async function fetchUser() {
  return { id: 1, name: "Alice" };
}

type User = Awaited<ReturnType<typeof fetchUser>>;
// { id: number; name: string; }
```

---

## Custom Utility Types

### DeepPartial
Makes all properties and nested properties optional.

**DeepPartial Custom Utility** - Recursively makes all properties optional, including nested objects. Useful for deeply nested update operations.

```typescript
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

interface User {
  id: number;
  name: string;
  address: {
    street: string;
    city: string;
    country: string;
  };
}

type PartialUser = DeepPartial<User>;
// {
//   id?: number;
//   name?: string;
//   address?: {
//     street?: string;
//     city?: string;
//     country?: string;
//   };
// }
```

### Nullable
Makes type nullable.

**Nullable Custom Utility** - Adds null to a type, creating a union with null. Simple but commonly used pattern for optional values that can be explicitly null.

```typescript
type Nullable<T> = T | null;

type User = {
  id: number;
  name: string;
};

type NullableUser = Nullable<User>;
// User | null

// Nullable properties
type NullableProps<T> = {
  [P in keyof T]: Nullable<T[P]>;
};

type UserWithNullableProps = NullableProps<User>;
// {
//   id: number | null;
//   name: string | null;
// }
```

### ValueOf
Gets all value types from object.

**ValueOf Custom Utility** - Extracts all property value types from an object type as a union. Useful for getting all possible values an object can contain.

```typescript
type ValueOf<T> = T[keyof T];

type Status = {
  pending: "PENDING";
  success: "SUCCESS";
  error: "ERROR";
};

type StatusValue = ValueOf<Status>;
// "PENDING" | "SUCCESS" | "ERROR"

// Use case: Extract property types
type User = {
  id: number;
  name: string;
  active: boolean;
};

type UserValue = ValueOf<User>;
// number | string | boolean
```

### PickByType
Pick properties by their type.

**PickByType Custom Utility** - Selects properties based on their value type. Advanced mapped type using conditional types to filter properties.

```typescript
type PickByType<T, U> = {
  [P in keyof T as T[P] extends U ? P : never]: T[P];
};

type User = {
  id: number;
  name: string;
  age: number;
  email: string;
  active: boolean;
};

type StringProps = PickByType<User, string>;
// {
//   name: string;
//   email: string;
// }

type NumberProps = PickByType<User, number>;
// {
//   id: number;
//   age: number;
// }
```

---

## Interview Questions

### Q1: What's the difference between `Pick` and `Omit`?

**Answer:**
- `Pick`: Selects specific properties to **include**
- `Omit`: Selects specific properties to **exclude**

**Pick vs Omit Comparison** - Pick explicitly includes properties, while Omit explicitly excludes them. Choose based on whether it's easier to list what to keep or what to remove.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
}

// Pick - include only these
type PublicUser = Pick<User, "id" | "name">;
// { id: number; name: string; }

// Omit - exclude these
type UserWithoutPassword = Omit<User, "password">;
// { id: number; name: string; email: string; }
```

---

### Q2: How do you make all properties of an interface optional?

**Answer:**

**Making Properties Optional** - Two approaches: built-in Partial utility or manual mapped type. Partial is preferred for simplicity and readability.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

// Method 1: Partial utility type
type OptionalUser = Partial<User>;

// Method 2: Manual mapped type
type OptionalUser2 = {
  [K in keyof User]?: User[K];
};

// Usage
const user: OptionalUser = {}; // OK
const user2: OptionalUser = { name: "Alice" }; // OK
```

---

### Q3: Create a type that represents a readonly version of User excluding the id

**Answer:**

**Combining Utility Types** - Chain multiple utilities to create complex transformations. Order matters: Omit first removes id, then Readonly makes remaining properties immutable.

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  age: number;
}

type ReadonlyUserWithoutId = Readonly<Omit<User, "id">>;
// {
//   readonly name: string;
//   readonly email: string;
//   readonly age: number;
// }

// Alternative: Combine multiple utilities
type Result = Readonly<Pick<User, "name" | "email" | "age">>;
```

---

### Q4: Extract the return type of an async function

**Answer:**

**Unwrapping Async Return Types** - Combine Awaited and ReturnType to extract the resolved type from async functions. Handles nested Promises automatically.

```typescript
async function fetchUser(id: number) {
  return {
    id,
    name: "Alice",
    email: "alice@ex.com"
  };
}

// Method 1: Awaited + ReturnType
type User = Awaited<ReturnType<typeof fetchUser>>;
// { id: number; name: string; email: string; }

// Method 2: Manual unwrap
type UnwrapPromise<T> = T extends Promise<infer U> ? U : T;
type User2 = UnwrapPromise<ReturnType<typeof fetchUser>>;
```

---

### Q5: Create a Record type for HTTP status codes

**Answer:**

**Record for HTTP Status Codes** - Creates a type-safe mapping of status codes to messages. Ensures all status codes are handled and values match expected structure.

```typescript
// Define status codes
type StatusCode = 200 | 201 | 400 | 404 | 500;

// Create record
type StatusMessages = Record<StatusCode, string>;

const messages: StatusMessages = {
  200: "OK",
  201: "Created",
  400: "Bad Request",
  404: "Not Found",
  500: "Internal Server Error"
};

// Alternative: More specific types
type HttpStatus = Record<StatusCode, {
  message: string;
  description: string;
}>;

const statuses: HttpStatus = {
  200: { message: "OK", description: "Request successful" },
  201: { message: "Created", description: "Resource created" },
  400: { message: "Bad Request", description: "Invalid request" },
  404: { message: "Not Found", description: "Resource not found" },
  500: { message: "Server Error", description: "Internal error" }
};
```

---

## Key Takeaways

1. **Partial/Required** - Modify property optionality
2. **Readonly** - Make properties immutable
3. **Pick/Omit** - Select or exclude properties
4. **Record** - Create object types with specific keys and values
5. **Extract/Exclude** - Filter union types
6. **ReturnType/Parameters** - Extract function type information
7. **String utilities** - Transform string literal types
8. **Combine utilities** - Chain multiple utilities for complex transformations

---

## Common Combinations

**Utility Type Composition** - Common patterns for combining utilities. Order of application affects the final type - experiment to achieve desired results.

```typescript
// Partial + Pick
type PartialUser = Partial<Pick<User, "name" | "email">>;

// Readonly + Omit
type ReadonlyUserWithoutId = Readonly<Omit<User, "id">>;

// Required + Pick
type RequiredCredentials = Required<Pick<User, "email" | "password">>;

// Record + Readonly
type ReadonlyConfig = Readonly<Record<string, string>>;
```

---

## Next Steps

- [Type Guards](./05-type-guards.md)
- [Advanced Types](./06-advanced-types.md)
- [Generics](./03-generics.md)

---

[← Back to TypeScript](./README.md)
