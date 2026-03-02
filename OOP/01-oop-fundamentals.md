# OOP Fundamentals

[← Back to OOP README](./README.md)

---

## Table of Contents

- [The Blueprint Analogy](#the-blueprint-analogy)
- [Classes and Objects](#classes-and-objects)
- [Properties and Methods](#properties-and-methods)
- [Constructors](#constructors)
- [Static vs Instance Members](#static-vs-instance-members)
- [The `this` Keyword in Classes](#the-this-keyword-in-classes)
- [Before/After: Procedural vs OOP](#beforeafter-procedural-vs-oop)
- [Real-World Examples](#real-world-examples)
- [Key Interview Questions](#key-interview-questions)

---

## The Blueprint Analogy

### 💡 **A Class is a Blueprint, an Object is the House**

Think of a **class** as an architect's blueprint and an **object** as an actual house built from it.

```
  Blueprint (Class)                 Houses (Objects)
  +--------------------+        +--------------------+
  |  House             |        |  house1            |
  |  -------------     |--new-->|  color: "blue"     |
  |  color: string     |        |  rooms: 3          |
  |  rooms: number     |        +--------------------+
  |                    |        +--------------------+
  |  paint()           |--new-->|  house2            |
  |  addRoom()         |        |  color: "red"      |
  +--------------------+        |  rooms: 5          |
                                +--------------------+
```

**Key Insight:**
> One blueprint can produce many houses. Each house has its own state (color, rooms) but shares the same structure and capabilities defined by the blueprint.

| Concept | Blueprint (Class) | House (Object) |
|---------|-------------------|----------------|
| **What it is** | A template / definition | A concrete instance |
| **Exists in memory?** | As a definition | As allocated memory |
| **How many?** | One per type | Many per class |
| **Holds data?** | Defines shape of data | Holds actual values |
| **Created with** | `class` keyword | `new` keyword |

---

## Classes and Objects

### 💡 **Classes Define Structure, Objects Hold State**

A **class** declares the shape and behavior. An **object** is a living instance with real data.

**Class Declaration:**

```typescript
class Car {
  brand: string;
  speed: number;

  constructor(brand: string, speed: number) {
    this.brand = brand;
    this.speed = speed;
  }

  accelerate(): void {
    this.speed += 10;
    console.log(`${this.brand} is now going ${this.speed} km/h`);
  }
}
```

**Creating Instances with `new`:**

```typescript
const tesla = new Car("Tesla", 0);   // Object 1
const bmw = new Car("BMW", 0);       // Object 2

tesla.accelerate(); // "Tesla is now going 10 km/h"
bmw.accelerate();   // "BMW is now going 10 km/h"
```

**Instantiation Flow:**

```
  class Car { ... }
        |
        v
  new Car("Tesla", 0)
        |
        v
  +-----------------------+
  | 1. Allocate memory    |
  | 2. Run constructor()  |
  | 3. Bind `this`        |
  | 4. Return object      |
  +-----------------------+
        |
        v
  tesla --> { brand: "Tesla", speed: 0 }
```

⚠️ **Common Mistake:** Forgetting `new` — in strict mode this throws an error; without it, `this` may refer to the global object.

---

## Properties and Methods

### 💡 **Properties Store Data, Methods Define Behavior**

**Instance Properties:**

```typescript
class Product {
  name: string;
  price: number;
  inStock: boolean;

  constructor(name: string, price: number) {
    this.name = name;
    this.price = price;
    this.inStock = true; // Default value
  }
}
```

**Methods:**

```typescript
class Product {
  name: string;
  price: number;

  constructor(name: string, price: number) {
    this.name = name;
    this.price = price;
  }

  // Instance method
  applyDiscount(percent: number): void {
    this.price -= this.price * (percent / 100);
  }

  // Method returning a value
  getSummary(): string {
    return `${this.name} — $${this.price.toFixed(2)}`;
  }
}
```

### 💡 **TypeScript Parameter Properties Shorthand**

TypeScript provides a powerful shorthand that declares and assigns properties directly in the constructor signature.

**❌ Before (Verbose):**

```typescript
class User {
  name: string;
  email: string;
  age: number;

  constructor(name: string, email: string, age: number) {
    this.name = name;
    this.email = email;
    this.age = age;
  }
}
```

**✅ After (Parameter Properties):**

```typescript
class User {
  constructor(
    public name: string,
    public email: string,
    public age: number
  ) {}
  // Properties are declared AND assigned automatically
}
```

**How It Works:**

1. Add an access modifier (`public`, `private`, `protected`, or `readonly`) before the parameter
2. TypeScript auto-generates the property declaration and assignment
3. Result is identical — less boilerplate

**Key Insight:**
> Parameter properties are one of the most loved TypeScript features. They eliminate repetitive property declarations and assignments, cutting class boilerplate by up to 60%.

---

## Constructors

### 💡 **The Constructor Runs Once When an Object is Created**

The constructor is a special method called automatically during instantiation. It sets up the initial state of the object.

**Key Characteristics:**

1. **Called exactly once** per object — at creation time via `new`
2. **Cannot be called directly** — only through `new ClassName()`
3. **Should not return a value** — `new` implicitly returns `this`
4. **Used for initialization** — set properties, validate input, establish connections

**Constructor Initialization Patterns:**

```typescript
class DatabaseConnection {
  private connection: string;
  private isConnected: boolean;
  readonly createdAt: Date;

  constructor(
    private host: string,
    private port: number,
    private database: string
  ) {
    // Validation
    if (port < 0 || port > 65535) {
      throw new Error("Invalid port number");
    }

    // Derived state
    this.connection = `${host}:${port}/${database}`;
    this.isConnected = false;
    this.createdAt = new Date();
  }

  connect(): void {
    console.log(`Connecting to ${this.connection}...`);
    this.isConnected = true;
  }
}

const db = new DatabaseConnection("localhost", 5432, "myapp");
db.connect(); // "Connecting to localhost:5432/myapp..."
```

**What Belongs in a Constructor:**

| ✅ Good | ❌ Avoid |
|---------|---------|
| Setting properties | Heavy computation |
| Input validation | API calls or I/O |
| Default values | Complex async operations |
| Simple derived state | Side effects with external systems |

**Key Insight:**
> Keep constructors lightweight. If initialization requires async work (database connect, API fetch), expose a separate `init()` or `connect()` method instead.

---

## Static vs Instance Members

### 💡 **Static Belongs to the Class, Instance Belongs to the Object**

**Instance members** are unique per object. **Static members** are shared across all instances and accessed on the class itself.

```
  Class: MathHelper
  +------------------------------+
  |  static PI = 3.14159         | <-- Shared (one copy)
  |  static square(n) { ... }    | <-- Called on class
  +------------------------------+
  |  instance1    |  instance2   |
  |  value: 5     |  value: 10   | <-- Unique per object
  |  double()     |  double()    | <-- Called on object
  +------------------------------+
```

**Comparison Table:**

| Feature | Static | Instance |
|---------|--------|----------|
| **Belongs to** | The class itself | Each object |
| **Accessed via** | `ClassName.member` | `object.member` |
| **Uses `this`?** | No (no instance context) | Yes |
| **Memory** | One copy total | One copy per instance |
| **Use case** | Utilities, constants, factories | Object-specific state/behavior |

**Static Members:**

```typescript
class MathHelper {
  static PI = 3.14159;

  static square(n: number): number {
    return n * n;
  }

  static circleArea(radius: number): number {
    return MathHelper.PI * MathHelper.square(radius);
  }
}

// Access on the class — no `new` needed
console.log(MathHelper.PI);            // 3.14159
console.log(MathHelper.square(5));     // 25
console.log(MathHelper.circleArea(3)); // 28.274...
```

**Instance Members:**

```typescript
class Counter {
  private count: number = 0;

  increment(): void {
    this.count++;
  }

  getCount(): number {
    return this.count;
  }
}

const a = new Counter();
const b = new Counter();
a.increment();
a.increment();

console.log(a.getCount()); // 2
console.log(b.getCount()); // 0 — separate state
```

**When to Use Each:**

- ✅ **Static** — utility functions, constants, factory methods, counters shared across instances
- ✅ **Instance** — object-specific state, behavior that depends on `this`
- ❌ **Static** — anything that needs per-object data
- ❌ **Instance** — pure helper functions with no dependency on object state

---

## The `this` Keyword in Classes

### 💡 **`this` Refers to the Current Object Instance**

Inside a class method, `this` points to the object that called the method. But context can be lost depending on how the method is invoked.

**How `this` Works:**

```typescript
class Greeter {
  constructor(private name: string) {}

  greet(): void {
    console.log(`Hello, I'm ${this.name}`);
  }
}

const g = new Greeter("Alice");
g.greet(); // "Hello, I'm Alice" — `this` = g
```

**⚠️ The Classic `this` Pitfall:**

```typescript
class Timer {
  seconds: number = 0;

  start(): void {
    // ❌ Regular function — `this` is lost in callback
    setInterval(function () {
      this.seconds++; // `this` is NOT the Timer instance
      console.log(this.seconds); // NaN or error
    }, 1000);
  }
}
```

**✅ Fix 1: Arrow Function (Recommended)**

```typescript
class Timer {
  seconds: number = 0;

  start(): void {
    // ✅ Arrow function captures `this` from enclosing scope
    setInterval(() => {
      this.seconds++;
      console.log(this.seconds); // Works correctly
    }, 1000);
  }
}
```

**✅ Fix 2: Arrow Function as Class Property**

```typescript
class Button {
  label: string = "Click me";

  // Arrow function property — `this` is always bound
  handleClick = (): void => {
    console.log(`${this.label} was clicked`);
  };
}

const btn = new Button();
const handler = btn.handleClick;
handler(); // "Click me was clicked" — `this` is preserved
```

**Decision Table:**

| Scenario | Use | Why |
|----------|-----|-----|
| Normal class method | Regular method | Standard behavior, efficient |
| Callback or event handler | Arrow function | Preserves `this` context |
| Method passed as reference | Arrow class property | Binds `this` at creation |
| Need dynamic `this` | Regular method + `.bind()` | Explicit binding |

**Key Insight:**
> In TypeScript classes, prefer arrow function class properties for methods that will be passed as callbacks (event handlers, Promise `.then()`, `setTimeout`). For normal methods called on the object directly, regular methods are fine and more memory-efficient.

---

## Before/After: Procedural vs OOP

### 💡 **From Scattered Functions to Organized Classes**

**❌ Before (Procedural Approach):**

```typescript
// Data and functions are scattered
interface UserData {
  name: string;
  email: string;
  loginCount: number;
}

function createUser(name: string, email: string): UserData {
  return { name, email, loginCount: 0 };
}

function login(user: UserData): void {
  user.loginCount++;
  console.log(`${user.name} logged in (${user.loginCount} times)`);
}

function getUserInfo(user: UserData): string {
  return `${user.name} <${user.email}>`;
}

// Usage — data is separate from behavior
const user = createUser("Alice", "alice@mail.com");
login(user);
console.log(getUserInfo(user));
```

**Problems:**
- Data and behavior are decoupled — hard to track which functions work on which data
- No encapsulation — anyone can modify `loginCount` directly
- Difficult to extend — adding new user types means scattered `if` checks

**✅ After (OOP Approach):**

```typescript
class User {
  private loginCount: number = 0;

  constructor(
    private name: string,
    private email: string
  ) {}

  login(): void {
    this.loginCount++;
    console.log(`${this.name} logged in (${this.loginCount} times)`);
  }

  getInfo(): string {
    return `${this.name} <${this.email}>`;
  }
}

// Usage — data and behavior live together
const user = new User("Alice", "alice@mail.com");
user.login();
console.log(user.getInfo());
```

**Benefits:**
- ✅ Data and behavior are encapsulated together
- ✅ `loginCount` is private — can't be modified externally
- ✅ Easy to extend with inheritance or composition
- ✅ Clear API — methods define what you can do with a User

---

## Real-World Examples

### 1. User Model

```typescript
class User {
  private lastLogin: Date | null = null;

  constructor(
    public readonly id: string,
    private name: string,
    private email: string,
    private role: "admin" | "user" | "guest" = "user"
  ) {}

  login(): void {
    this.lastLogin = new Date();
    console.log(`${this.name} logged in at ${this.lastLogin.toISOString()}`);
  }

  isAdmin(): boolean {
    return this.role === "admin";
  }

  getProfile(): { name: string; email: string; role: string } {
    return {
      name: this.name,
      email: this.email,
      role: this.role,
    };
  }
}

const admin = new User("u-001", "Alice", "alice@co.com", "admin");
admin.login();
console.log(admin.isAdmin()); // true
```

### 2. Logger Service (Static Usage)

```typescript
class Logger {
  private static instance: Logger;
  private logs: string[] = [];

  private constructor() {} // Prevent direct instantiation

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  static log(message: string): void {
    const logger = Logger.getInstance();
    const entry = `[${new Date().toISOString()}] ${message}`;
    logger.logs.push(entry);
    console.log(entry);
  }

  static getLogs(): string[] {
    return Logger.getInstance().logs;
  }
}

Logger.log("App started");       // [2026-03-02T...] App started
Logger.log("User logged in");    // [2026-03-02T...] User logged in
console.log(Logger.getLogs());   // Array of all log entries
```

### 3. Database Connection Class

```typescript
class DatabaseConnection {
  private isConnected: boolean = false;
  readonly createdAt: Date = new Date();

  constructor(
    private readonly host: string,
    private readonly port: number,
    private readonly dbName: string
  ) {
    if (!host || port <= 0) {
      throw new Error("Invalid connection parameters");
    }
  }

  async connect(): Promise<void> {
    console.log(`Connecting to ${this.host}:${this.port}/${this.dbName}...`);
    // Simulate async connection
    this.isConnected = true;
    console.log("Connected successfully");
  }

  async disconnect(): Promise<void> {
    if (!this.isConnected) {
      console.warn("Already disconnected");
      return;
    }
    this.isConnected = false;
    console.log("Disconnected");
  }

  getStatus(): { connected: boolean; uptime: number } {
    return {
      connected: this.isConnected,
      uptime: Date.now() - this.createdAt.getTime(),
    };
  }
}

const db = new DatabaseConnection("localhost", 5432, "myapp");
await db.connect();
console.log(db.getStatus()); // { connected: true, uptime: ... }
```

---

## Key Interview Questions

1. **What is the difference between a class and an object?**
   - A class is a template/blueprint; an object is a concrete instance with actual data.

2. **What does the `new` keyword do?**
   - Allocates memory, creates an empty object, sets its prototype, runs the constructor with `this` bound to the new object, and returns the object.

3. **When would you use static methods over instance methods?**
   - Static methods for utility functions, factory patterns, and operations that don't depend on instance state. Instance methods for behavior tied to a specific object's data.

4. **How does `this` behave differently in arrow functions vs regular methods?**
   - Arrow functions capture `this` from the enclosing lexical scope at definition time. Regular methods resolve `this` based on how they are called (the object before the dot).

5. **What are TypeScript parameter properties?**
   - A shorthand where adding an access modifier (`public`, `private`, `protected`, `readonly`) to a constructor parameter automatically declares and initializes the corresponding class property.

6. **What are the four pillars of OOP?**
   - Encapsulation, Abstraction, Inheritance, and Polymorphism. *(Covered in detail in the following files.)*

---

[← Back to OOP README](./README.md) | [Next: Encapsulation →](./02-encapsulation.md)
