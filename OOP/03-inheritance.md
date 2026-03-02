[← README](./README.md) | [← 02 Encapsulation](./02-encapsulation.md) | [Next: 04 Polymorphism →](./04-polymorphism.md)

---

# 03 - Inheritance

## 🎯 Overview

Inheritance is the OOP mechanism that lets a class **derive from another class**, inheriting its properties and methods while adding or overriding behavior. It models **"is-a" relationships** and is one of the most powerful tools for code reuse — when used correctly.

---

## 💡 **Analogy: The Vehicle Hierarchy**

Think of vehicles:

```
        Vehicle
        (wheels, engine, move())
       /                \
     Car                 Truck
     (doors, honk())     (payload, haul())
    /
ElectricCar
(battery, charge())
```

- A **Car** *is-a* **Vehicle** — it has wheels, an engine, and can move. It adds doors and honking.
- An **ElectricCar** *is-a* **Car** — it has everything a car has, plus a battery and charging.
- Each level **inherits everything above it** and adds its own specialization.

> **Key Insight:**
> Inheritance creates a hierarchy where child classes automatically get all parent behavior, then add or customize what makes them different.

---

## 💡 **What is Inheritance?**

Inheritance establishes an **"is-a" relationship** between classes.

**Core Idea:**

1. **Parent (Base/Super) class** — defines shared behavior
2. **Child (Derived/Sub) class** — inherits parent behavior, adds specialization
3. **Code reuse** — write common logic once, share across descendants

**How It Works:**

```
Parent Class
+-- Properties: shared state
+-- Methods: shared behavior
|
+-- Child Class (extends Parent)
    +-- Inherited properties + new properties
    +-- Inherited methods + new/overridden methods
```

---

## 💡 **The `extends` Keyword**

In TypeScript, use `extends` to create a subclass.

**Basic Example:**

```typescript
class Vehicle {
  constructor(
    public make: string,
    public year: number
  ) {}

  move(): string {
    return `${this.make} is moving`;
  }
}

class Car extends Vehicle {
  constructor(
    make: string,
    year: number,
    public doors: number
  ) {
    super(make, year); // Must call parent constructor
  }

  honk(): string {
    return `${this.make} goes BEEP!`;
  }
}

const myCar = new Car("Toyota", 2024, 4);
myCar.move();  // "Toyota is moving"  ← inherited
myCar.honk();  // "Toyota goes BEEP!" ← own method
```

**What `extends` Does:**

- Copies the parent's prototype chain to the child
- Makes all `public` and `protected` members available to the child
- `private` members exist on the parent but are **not accessible** from the child

---

## 💡 **The `super` Keyword**

`super` is used in two contexts:

| Usage | Purpose | Example |
|-------|---------|---------|
| `super(args)` | Call parent **constructor** | `super(name, age)` |
| `super.method()` | Call parent **method** | `super.move()` |

**Constructor Chaining Example:**

```typescript
class Animal {
  constructor(public name: string) {
    console.log("Animal constructor");
  }
}

class Dog extends Animal {
  constructor(
    name: string,
    public breed: string
  ) {
    super(name); // MUST be called before using `this`
    console.log("Dog constructor");
  }
}

const dog = new Dog("Rex", "Labrador");
// Output:
// "Animal constructor"
// "Dog constructor"
```

**Calling Parent Methods:**

```typescript
class Shape {
  describe(): string {
    return "I am a shape";
  }
}

class Circle extends Shape {
  constructor(public radius: number) {
    super();
  }

  describe(): string {
    const parent = super.describe(); // "I am a shape"
    return `${parent} — specifically a circle with radius ${this.radius}`;
  }
}
```

> ⚠️ **Warning:**
> You **must** call `super()` in a child constructor **before** accessing `this`. TypeScript will throw a compile error if you don't.

---

## 💡 **Method Overriding**

A child class can **replace** a parent method by declaring a method with the same name.

**How It Works:**

```
Parent.greet() --> "Hello from Parent"
     | child overrides
Child.greet()  --> "Hello from Child"
```

**Example:**

```typescript
class Notification {
  send(message: string): string {
    return `Sending: ${message}`;
  }
}

class EmailNotification extends Notification {
  send(message: string): string {
    // Completely replaces parent behavior
    return `Emailing: ${message}`;
  }
}

class SlackNotification extends Notification {
  send(message: string): string {
    const base = super.send(message); // Extend parent behavior
    return `${base} (via Slack)`;
  }
}

const email = new EmailNotification();
email.send("Hello"); // "Emailing: Hello"

const slack = new SlackNotification();
slack.send("Hello"); // "Sending: Hello (via Slack)"
```

### Method Overriding vs Method Hiding

| Aspect | Method Overriding | Method Hiding (static methods) |
|--------|-------------------|-------------------------------|
| **Mechanism** | Child replaces parent instance method | Child defines a static method with the same name |
| **Dispatch** | Runtime (based on object type) | Compile-time (based on reference type) |
| **`super` access** | ✅ Can call `super.method()` | ⚠️ Can call `ParentClass.method()` |
| **Polymorphism** | ✅ Supports polymorphic behavior | ❌ Does not support polymorphism |
| **Common in TS** | ✅ Very common | ❌ Rare, usually a code smell |

---

## 💡 **Constructor Chaining**

When a class hierarchy has multiple levels, constructors flow **top-down** from the root parent to the deepest child.

**Flow:**

```
new ElectricCar("Tesla", 2024, 4, 100)
    |
    v
ElectricCar constructor calls super(make, year, doors)
    |
    v
Car constructor calls super(make, year)
    |
    v
Vehicle constructor sets this.make, this.year
    |
    v
Car constructor sets this.doors
    |
    v
ElectricCar constructor sets this.batteryKWh
```

**Full Example:**

```typescript
class Vehicle {
  constructor(
    public make: string,
    public year: number
  ) {}

  describe(): string {
    return `${this.year} ${this.make}`;
  }
}

class Car extends Vehicle {
  constructor(
    make: string,
    year: number,
    public doors: number
  ) {
    super(make, year);
  }

  describe(): string {
    return `${super.describe()} (${this.doors}-door)`;
  }
}

class ElectricCar extends Car {
  constructor(
    make: string,
    year: number,
    doors: number,
    public batteryKWh: number
  ) {
    super(make, year, doors);
  }

  describe(): string {
    return `${super.describe()} [${this.batteryKWh} kWh battery]`;
  }

  charge(): string {
    return `Charging ${this.make}...`;
  }
}

const tesla = new ElectricCar("Tesla", 2024, 4, 100);
tesla.describe();
// "2024 Tesla (4-door) [100 kWh battery]"
```

---

## 💡 **Inheritance Tree Diagram**

```
            Animal
           /      \
         Dog      Cat
        /    \
  Labrador  Poodle
```

- `Animal` — base class with `name`, `speak()`
- `Dog` — adds `fetch()`, overrides `speak()` → "Woof!"
- `Cat` — adds `purr()`, overrides `speak()` → "Meow!"
- `Labrador` — adds `swim()`, inherits `fetch()` from Dog
- `Poodle` — adds `groom()`, inherits `fetch()` from Dog

> **Key Insight:**
> `Labrador` gets behavior from **three** levels: Animal, Dog, and its own. This is the power — and the danger — of inheritance.

---

## 🌍 **Real-World Examples**

### 1. BaseRepository Pattern

```typescript
class BaseRepository<T extends { id: string }> {
  protected items: Map<string, T> = new Map();

  find(id: string): T | undefined {
    return this.items.get(id);
  }

  findAll(): T[] {
    return Array.from(this.items.values());
  }

  create(item: T): T {
    this.items.set(item.id, item);
    return item;
  }

  update(id: string, data: Partial<T>): T | undefined {
    const existing = this.items.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...data };
    this.items.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

// Specialized repositories inherit CRUD, add domain logic
interface User { id: string; name: string; email: string; }

class UserRepository extends BaseRepository<User> {
  findByEmail(email: string): User | undefined {
    return this.findAll().find(user => user.email === email);
  }
}

interface Product { id: string; title: string; price: number; }

class ProductRepository extends BaseRepository<Product> {
  findByPriceRange(min: number, max: number): Product[] {
    return this.findAll().filter(p => p.price >= min && p.price <= max);
  }
}
```

### 2. Error Hierarchy

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public isOperational: boolean = true
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

class ValidationError extends AppError {
  constructor(
    message: string,
    public fields: string[]
  ) {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 404);
  }
}

class AuthError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

// Usage — clean, consistent error handling
throw new NotFoundError("User", "abc-123");
// → AppError { message: "User with id abc-123 not found", statusCode: 404 }
```

### 3. Express Middleware Chain

```typescript
abstract class BaseMiddleware {
  // Template Method pattern: shared logic + customizable hook
  handle(req: Request, res: Response, next: NextFunction): void {
    try {
      if (this.shouldSkip(req)) {
        return next();
      }
      this.execute(req, res, next);
    } catch (error) {
      next(error);
    }
  }

  protected shouldSkip(_req: Request): boolean {
    return false; // Override in child if needed
  }

  protected abstract execute(
    req: Request, res: Response, next: NextFunction
  ): void;
}

class AuthMiddleware extends BaseMiddleware {
  protected shouldSkip(req: Request): boolean {
    const publicPaths = ["/health", "/login"];
    return publicPaths.includes(req.path);
  }

  protected execute(req: Request, res: Response, next: NextFunction): void {
    const token = req.headers.authorization;
    if (!token) {
      throw new AuthError("No token provided");
    }
    // Verify token logic...
    next();
  }
}

class LoggingMiddleware extends BaseMiddleware {
  protected execute(req: Request, _res: Response, next: NextFunction): void {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
  }
}
```

---

## ❌✅ **Before / After: Why Inheritance Matters**

### ❌ Before (Duplicated Code)

```typescript
class UserService {
  private logger = new Logger();

  findAll(): User[] {
    this.logger.log("Finding all users");
    // ... fetch logic
    return [];
  }

  create(data: CreateUserDto): User {
    this.logger.log("Creating user");
    // ... validation + create logic
    return {} as User;
  }
}

class ProductService {
  private logger = new Logger(); // Duplicated

  findAll(): Product[] {
    this.logger.log("Finding all products"); // Duplicated pattern
    // ... fetch logic
    return [];
  }

  create(data: CreateProductDto): Product {
    this.logger.log("Creating product"); // Duplicated pattern
    // ... validation + create logic
    return {} as Product;
  }
}
```

**Problems:**
- Logger setup duplicated in every service
- Logging pattern copy-pasted
- Changes require updating every service

### ✅ After (Shared Base Class)

```typescript
class BaseService {
  protected logger = new Logger();

  protected log(action: string, entity: string): void {
    this.logger.log(`${action} ${entity}`);
  }
}

class UserService extends BaseService {
  findAll(): User[] {
    this.log("Finding all", "users");
    return [];
  }

  create(data: CreateUserDto): User {
    this.log("Creating", "user");
    return {} as User;
  }
}

class ProductService extends BaseService {
  findAll(): Product[] {
    this.log("Finding all", "products");
    return [];
  }

  create(data: CreateProductDto): Product {
    this.log("Creating", "product");
    return {} as Product;
  }
}
```

**Benefits:**
- ✅ Logger setup in one place
- ✅ Consistent logging pattern
- ✅ Change logging once, all services update

---

## 💡 **When Inheritance Makes Sense**

Use inheritance when:

- ✅ There is a clear **"is-a" relationship** (Dog *is-a* Animal)
- ✅ Child classes share **significant behavior** from the parent
- ✅ The hierarchy is **shallow** (2-3 levels max)
- ✅ You want **polymorphic behavior** (treat children as parent type)
- ✅ The parent class is **stable** and unlikely to change frequently

---

## ⚠️ **When Inheritance Doesn't Make Sense**

Avoid inheritance when:

- ❌ The relationship is **"has-a"** not "is-a" (a Car *has-a* Engine, not *is-a* Engine)
- ❌ The hierarchy goes **deeper than 2-3 levels** (fragile, hard to reason about)
- ❌ You only need **one or two methods** from the parent (use composition instead)
- ❌ Multiple unrelated classes need the same behavior (use mixins or composition)

### The Fragile Base Class Problem

```
  BaseService          <-- Change something here...
      |
  AuthService          <-- ...breaks this...
      |
  AdminAuthService     <-- ...and this...
      |
  SuperAdminService    <-- ...and this.
```

> ⚠️ **Warning:**
> The deeper the hierarchy, the more **fragile** it becomes. A change in the base class can ripple through every descendant in unexpected ways.

---

## Inheritance vs Composition (Quick Comparison)

A full deep-dive lives in [06 - Composition vs Inheritance](./06-composition-vs-inheritance.md). Here is a brief comparison:

| Aspect | Inheritance | Composition |
|--------|------------|-------------|
| **Relationship** | "is-a" | "has-a" |
| **Coupling** | Tight — child depends on parent internals | Loose — depends on interface only |
| **Flexibility** | Fixed at compile time | Swappable at runtime |
| **Reuse** | Entire parent class | Pick specific behaviors |
| **Hierarchy depth** | Becomes fragile at 3+ levels | Flat, no hierarchy needed |
| **When to use** | Clear taxonomies (Error types, Shapes) | Most other cases |

> **Key Insight:**
> The Gang of Four says: **"Favor composition over inheritance."** Use inheritance for clear hierarchies; use composition for everything else.

---

## ⚠️ **Common Pitfalls**

### 1. Forgetting `super()` in Constructor

```typescript
// ❌ TypeScript compiler error
class Child extends Parent {
  constructor(public extra: string) {
    // Missing super() — compile error!
    this.extra = extra;
  }
}

// ✅ Always call super() before using this
class Child extends Parent {
  constructor(public extra: string) {
    super();
    this.extra = extra;
  }
}
```

### 2. Deep Inheritance Chains

```typescript
// ❌ Too deep — fragile and hard to debug
class Base {}
class LevelOne extends Base {}
class LevelTwo extends LevelOne {}
class LevelThree extends LevelTwo {}
class LevelFour extends LevelThree {} // Where does a bug live? Good luck.

// ✅ Keep it shallow — max 2-3 levels
class Base {}
class Specialized extends Base {}
```

### 3. Inheriting for Code Reuse Only

```typescript
// ❌ Dog is NOT a Logger — wrong relationship
class Logger {
  log(msg: string): void { console.log(msg); }
}

class Dog extends Logger {
  bark(): void {
    this.log("Woof!"); // Works, but semantically wrong
  }
}

// ✅ Dog HAS a Logger — correct relationship
class Dog {
  constructor(private logger: Logger) {}

  bark(): void {
    this.logger.log("Woof!");
  }
}
```

---

## 🔑 **Key Interview Questions**

### Q1: What is inheritance and why is it useful?

**Answer:** Inheritance lets a class derive from another class, inheriting its properties and methods. It models "is-a" relationships and enables code reuse. A `Dog` class can extend `Animal` to get shared behavior like `name` and `speak()`, then add dog-specific behavior like `fetch()`.

### Q2: What is the difference between `super()` and `super.method()`?

**Answer:** `super()` calls the **parent constructor** — required in child constructors before accessing `this`. `super.method()` calls a **parent's instance method** — useful when overriding a method but still wanting the parent's behavior.

### Q3: What is method overriding?

**Answer:** When a child class defines a method with the same name as a parent method, the child's version replaces the parent's. The child can optionally call `super.method()` to extend rather than fully replace the parent behavior.

### Q4: What is the fragile base class problem?

**Answer:** When a base class changes, all derived classes can break unexpectedly. The deeper the hierarchy, the worse this gets. This is why we limit inheritance depth to 2-3 levels and favor composition for complex behavior reuse.

### Q5: When should you use inheritance vs composition?

**Answer:** Use inheritance for clear "is-a" relationships with shared behavior (Error hierarchies, Shape types). Use composition for "has-a" relationships or when you need flexibility to swap behaviors at runtime. The rule of thumb: **favor composition over inheritance**.

### Q6: Can TypeScript do multiple inheritance?

**Answer:** No. TypeScript (like Java) supports **single inheritance** — a class can only extend one parent. For combining behaviors from multiple sources, use **interfaces** (for contracts) or **mixins** (for implementation reuse).

---

## 📝 Summary

| Concept | Key Takeaway |
|---------|-------------|
| **`extends`** | Creates parent-child class relationship |
| **`super()`** | Calls parent constructor — required before `this` |
| **`super.method()`** | Calls parent method from an override |
| **Method Overriding** | Child replaces parent behavior, optionally extending it |
| **Constructor Chaining** | Constructors flow top-down through the hierarchy |
| **Shallow Hierarchies** | Keep inheritance to 2-3 levels max |
| **"is-a" Test** | If "Child is-a Parent" sounds wrong, don't use inheritance |

---

[← 02 Encapsulation](./02-encapsulation.md) | [Next: 04 Polymorphism →](./04-polymorphism.md)
