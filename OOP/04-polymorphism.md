[← README](./README.md) | [← 03 Inheritance](./03-inheritance.md) | [Next: 05 Abstraction →](./05-abstraction.md)

---

# Polymorphism

## "Many Forms" — Same Interface, Different Behavior

**Polymorphism** is the ability for different objects to respond to the **same method call** with **different behavior**. It is the most powerful of the four OOP pillars because it enables you to write flexible, extensible code that doesn't need to know the concrete type it's working with.

### The USB Port Analogy

Think of a USB-A port on your computer:

```
        ┌──────────────────────────┐
        │      USB-A Port          │
        │   (Same Interface)       │
        └────────┬─────────────────┘
                 │
    ┌────────────┼────────────┬────────────┐
    ▼            ▼            ▼            ▼
  Mouse       Keyboard    Flash Drive   Charger
  (click)     (keypress)  (storage)     (power)
```

- The computer doesn't need to know **which specific device** is plugged in
- It just uses the **USB interface** — same port, different devices
- Each device **handles the connection differently** behind the scenes

> **Key Insight:**
> Polymorphism lets you write code that depends on **abstractions** (the USB port), not **concrete implementations** (the specific device). This is the foundation of extensible software.

---

## Table of Contents

1. [What is Polymorphism](#1--what-is-polymorphism)
2. [Method Overriding (Runtime Polymorphism)](#2--method-overriding-runtime-polymorphism)
3. [Interfaces and Type Contracts](#3--interfaces-and-type-contracts)
4. [Generics as Parametric Polymorphism](#4--generics-as-parametric-polymorphism)
5. [Duck Typing in TypeScript](#5--duck-typing-in-typescript)
6. [Before/After: Eliminating Conditionals](#6--beforeafter-eliminating-conditionals)
7. [Common Mistakes](#7--common-mistakes)
8. [Key Interview Questions](#8--key-interview-questions)

---

## 1. 💡 What is Polymorphism

The word comes from Greek: **poly** (many) + **morph** (forms). In programming, it means a **single interface** can represent **different underlying types**.

**Three Forms of Polymorphism:**

| Form | Mechanism | When Resolved | TypeScript Example |
|------|-----------|---------------|-------------------|
| **Subtype (Runtime)** | Method overriding via inheritance | Runtime | `class Dog extends Animal` |
| **Ad-hoc (Overloading)** | Function overloads | Compile-time | `function add(a: string): string` |
| **Parametric (Generics)** | Type parameters | Compile-time | `Array<T>`, `Repository<T>` |

**Why It Matters:**

1. **Open/Closed Principle** — Add new behavior without modifying existing code
2. **Decoupling** — Code depends on interfaces, not implementations
3. **Testability** — Swap real services with mocks easily
4. **Extensibility** — New types "plug in" to existing systems

---

## 2. 💡 Method Overriding (Runtime Polymorphism)

A child class provides its **own implementation** of a method defined in its parent class. The correct method is determined **at runtime** based on the actual object type.

**How It Works:**

```
        processPayment(amount)
              │
    ┌─────────┼──────────┐
    ▼         ▼          ▼
  Stripe    PayPal    Square
  (API A)   (API B)   (API C)

Same method call → different implementations
```

**Payment Processor Example:**

```typescript
abstract class PaymentProcessor {
  abstract processPayment(amount: number): Promise<string>;

  // Shared logic stays in the parent
  validateAmount(amount: number): boolean {
    return amount > 0 && amount <= 100_000;
  }
}

class StripeProcessor extends PaymentProcessor {
  async processPayment(amount: number): Promise<string> {
    // Stripe-specific API call
    console.log(`Charging $${amount} via Stripe API`);
    return `stripe_txn_${Date.now()}`;
  }
}

class PayPalProcessor extends PaymentProcessor {
  async processPayment(amount: number): Promise<string> {
    // PayPal-specific API call
    console.log(`Charging $${amount} via PayPal API`);
    return `paypal_txn_${Date.now()}`;
  }
}

class SquareProcessor extends PaymentProcessor {
  async processPayment(amount: number): Promise<string> {
    // Square-specific API call
    console.log(`Charging $${amount} via Square API`);
    return `square_txn_${Date.now()}`;
  }
}
```

**Polymorphic Usage — the caller doesn't know (or care) which processor it is:**

```typescript
// Time: O(1) per call — polymorphic dispatch is constant time
async function checkout(processor: PaymentProcessor, amount: number): Promise<void> {
  if (!processor.validateAmount(amount)) {
    throw new Error("Invalid amount");
  }
  const txnId = await processor.processPayment(amount); // Polymorphic call
  console.log(`Transaction complete: ${txnId}`);
}

// Same function, different behaviors
await checkout(new StripeProcessor(), 99.99);
await checkout(new PayPalProcessor(), 49.99);
await checkout(new SquareProcessor(), 29.99);
```

> **Key Insight:**
> The `checkout` function is **closed for modification** but **open for extension**. Adding a new payment provider (e.g., `CryptoProcessor`) requires zero changes to `checkout`.

---

## 3. 💡 Interfaces and Type Contracts

Interfaces define a **contract** — a set of methods that implementing classes must provide. Unlike abstract classes, interfaces carry no implementation, only shape.

**Notification Service Example:**

```typescript
interface Notifier {
  send(to: string, message: string): Promise<boolean>;
  getDeliveryStatus(messageId: string): Promise<string>;
}

class EmailNotifier implements Notifier {
  async send(to: string, message: string): Promise<boolean> {
    console.log(`Sending email to ${to}: ${message}`);
    // SMTP logic here
    return true;
  }

  async getDeliveryStatus(messageId: string): Promise<string> {
    return "delivered";
  }
}

class SMSNotifier implements Notifier {
  async send(to: string, message: string): Promise<boolean> {
    console.log(`Sending SMS to ${to}: ${message}`);
    // Twilio API logic here
    return true;
  }

  async getDeliveryStatus(messageId: string): Promise<string> {
    return "sent";
  }
}

class PushNotifier implements Notifier {
  async send(to: string, message: string): Promise<boolean> {
    console.log(`Sending push notification to ${to}: ${message}`);
    // Firebase Cloud Messaging logic here
    return true;
  }

  async getDeliveryStatus(messageId: string): Promise<string> {
    return "received";
  }
}
```

**Polymorphic Dispatch Over Multiple Notifiers:**

```typescript
class NotificationService {
  constructor(private notifiers: Notifier[]) {}

  async notifyAll(to: string, message: string): Promise<void> {
    const results = await Promise.all(
      this.notifiers.map((notifier) => notifier.send(to, message))
    );
    console.log(`Sent via ${results.filter(Boolean).length} channels`);
  }
}

// Plug in any combination — no if/else needed
const service = new NotificationService([
  new EmailNotifier(),
  new SMSNotifier(),
  new PushNotifier(),
]);

await service.notifyAll("user@example.com", "Your order shipped!");
```

**Interface vs Abstract Class (Brief Comparison):**

| Feature | Interface | Abstract Class |
|---------|-----------|---------------|
| **Implementation** | No method bodies | Can have shared logic |
| **Multiple** | Class can implement many | Class extends only one |
| **Fields** | Shape only | Can have initialized fields |
| **Constructor** | None | Can have constructor |
| **Use When** | Defining a contract | Sharing code + enforcing contract |

> ⚠️ **Note:** A deeper comparison is covered in [05 Abstraction](./05-abstraction.md).

---

## 4. 💡 Generics as Parametric Polymorphism

Generics let you write code that works with **any type** while preserving **type safety**. The type is provided as a parameter — hence "parametric" polymorphism.

**Generics vs `any` vs Union Types:**

| Approach | Type Safety | Flexibility | Example |
|----------|------------|------------|---------|
| **`any`** | ❌ None — disables type checking | ✅ Works with anything | `function get(id: any): any` |
| **Union Types** | ✅ Safe for known types | ❌ Limited to listed types | `function get(id: string \| number)` |
| **Generics** | ✅ Full type safety | ✅ Works with any type | `function get<T>(id: T): T` |

**Generic Repository Example:**

```typescript
interface Entity {
  id: string;
  createdAt: Date;
}

interface Repository<T extends Entity> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  create(data: Omit<T, "id" | "createdAt">): Promise<T>;
  update(id: string, data: Partial<T>): Promise<T>;
  delete(id: string): Promise<boolean>;
}

// Concrete entity types
interface User extends Entity {
  name: string;
  email: string;
}

interface Product extends Entity {
  title: string;
  price: number;
}

// One implementation works for ANY entity type
class InMemoryRepository<T extends Entity> implements Repository<T> {
  private items: Map<string, T> = new Map();

  async findById(id: string): Promise<T | null> {
    return this.items.get(id) ?? null;
  }

  async findAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  async create(data: Omit<T, "id" | "createdAt">): Promise<T> {
    const entity = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
    } as T;
    this.items.set(entity.id, entity);
    return entity;
  }

  async update(id: string, data: Partial<T>): Promise<T> {
    const existing = this.items.get(id);
    if (!existing) throw new Error(`Entity ${id} not found`);
    const updated = { ...existing, ...data } as T;
    this.items.set(id, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return this.items.delete(id);
  }
}
```

**Usage — same class, different types, full type safety:**

```typescript
const userRepo = new InMemoryRepository<User>();
const productRepo = new InMemoryRepository<Product>();

// TypeScript knows the exact types
const user = await userRepo.create({ name: "Alice", email: "alice@test.com" });
// user is typed as User — name and email are auto-completed

const product = await productRepo.create({ title: "Widget", price: 29.99 });
// product is typed as Product — title and price are auto-completed

// ❌ This would be a compile error:
// await userRepo.create({ title: "Wrong", price: 10 });
// Error: 'title' does not exist in type Omit<User, "id" | "createdAt">
```

> **Key Insight:**
> Generics give you the flexibility of `any` with the safety of explicit types. Use them whenever you write a utility that should work across multiple types.

---

## 5. 💡 Duck Typing in TypeScript

TypeScript uses **structural typing** — if an object has the right shape, it satisfies the type, regardless of its class or explicit `implements` declaration.

> "If it looks like a duck, swims like a duck, and quacks like a duck — then it's a duck."

**How Structural Typing Works:**

```typescript
interface Loggable {
  log(message: string): void;
}

// This class NEVER says "implements Loggable"
class ConsoleLogger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }
}

// But it works! Structural match is enough.
function doWork(logger: Loggable): void {
  logger.log("Work started");
}

doWork(new ConsoleLogger()); // ✅ Works — ConsoleLogger has a matching .log() method
```

**Even plain objects qualify:**

```typescript
// No class needed at all
doWork({
  log: (message: string) => console.log(message),
}); // ✅ Works — the object literal matches the Loggable shape
```

**Structural vs Nominal Typing:**

| Feature | Structural (TypeScript) | Nominal (Java/C#) |
|---------|------------------------|-------------------|
| **Match by** | Shape (properties + methods) | Explicit declaration (`implements`) |
| **Flexibility** | ✅ Very flexible | ❌ Rigid |
| **Accidental matches** | ⚠️ Possible | ✅ Prevented |
| **Boilerplate** | ✅ Minimal | ❌ More verbose |

> **Key Insight:**
> TypeScript's structural typing makes polymorphism effortless — you don't need class hierarchies or explicit `implements` to satisfy an interface. This is especially powerful for testing, where plain mock objects "just work."

---

## 6. 💡 Before/After: Eliminating Conditionals

The most common sign you need polymorphism: a growing `if/else` or `switch` statement that checks types.

**❌ Before (Problem) — Giant Switch Statement:**

```typescript
// Every new payment type means modifying this function
function processPayment(type: string, amount: number): string {
  switch (type) {
    case "stripe":
      // 20 lines of Stripe-specific logic
      console.log(`Stripe: charging $${amount}`);
      return `stripe_${Date.now()}`;
    case "paypal":
      // 20 lines of PayPal-specific logic
      console.log(`PayPal: charging $${amount}`);
      return `paypal_${Date.now()}`;
    case "square":
      // 20 lines of Square-specific logic
      console.log(`Square: charging $${amount}`);
      return `square_${Date.now()}`;
    default:
      throw new Error(`Unknown payment type: ${type}`);
  }
}
```

**Problems:**

- ❌ **Violates Open/Closed Principle** — must modify function to add new types
- ❌ **Single Responsibility** — one function knows about every payment provider
- ❌ **Untestable** — can't test one provider without loading all of them
- ❌ **Scales poorly** — grows linearly with each new provider

**✅ After (Solution) — Polymorphic Dispatch:**

```typescript
interface PaymentProcessor {
  processPayment(amount: number): string;
}

class StripeProcessor implements PaymentProcessor {
  processPayment(amount: number): string {
    console.log(`Stripe: charging $${amount}`);
    return `stripe_${Date.now()}`;
  }
}

class PayPalProcessor implements PaymentProcessor {
  processPayment(amount: number): string {
    console.log(`PayPal: charging $${amount}`);
    return `paypal_${Date.now()}`;
  }
}

// Adding a new processor = adding a new class. Zero changes to existing code.
class CryptoProcessor implements PaymentProcessor {
  processPayment(amount: number): string {
    console.log(`Crypto: charging $${amount}`);
    return `crypto_${Date.now()}`;
  }
}

// Caller is completely decoupled
function checkout(processor: PaymentProcessor, amount: number): string {
  return processor.processPayment(amount);
}
```

**Benefits:**

- ✅ **Open/Closed** — add new processors without touching existing code
- ✅ **Single Responsibility** — each class owns its own logic
- ✅ **Testable** — test each processor in isolation
- ✅ **Scales infinitely** — new types are new classes, not new branches

---

## 7. ⚠️ Common Mistakes

### Mistake 1: Using `any` Instead of Generics

**❌ Bad — loses all type information:**

```typescript
function firstElement(arr: any[]): any {
  return arr[0];
}

const result = firstElement([1, 2, 3]);
// result is `any` — no autocomplete, no type checking
```

**✅ Good — preserves the type:**

```typescript
function firstElement<T>(arr: T[]): T | undefined {
  return arr[0];
}

const result = firstElement([1, 2, 3]);
// result is `number | undefined` — full type safety
```

---

### Mistake 2: Checking `instanceof` Everywhere

**❌ Bad — manually dispatching by type:**

```typescript
function getSound(animal: Animal): string {
  if (animal instanceof Dog) return "Woof";
  if (animal instanceof Cat) return "Meow";
  if (animal instanceof Duck) return "Quack";
  return "Unknown";
}
```

**✅ Good — let polymorphism do the work:**

```typescript
abstract class Animal {
  abstract getSound(): string;
}

class Dog extends Animal {
  getSound(): string { return "Woof"; }
}

class Cat extends Animal {
  getSound(): string { return "Meow"; }
}

// No instanceof, no if/else — just call the method
function printSound(animal: Animal): void {
  console.log(animal.getSound()); // Polymorphic dispatch
}
```

---

### Mistake 3: Not Leveraging Structural Typing

**❌ Bad — forcing unnecessary class hierarchies:**

```typescript
interface Serializable {
  toJSON(): string;
}

// Don't force everything into a class just to satisfy an interface
class UserDTO implements Serializable {
  constructor(public name: string) {}
  toJSON(): string {
    return JSON.stringify({ name: this.name });
  }
}
```

**✅ Good — use plain objects when a class adds no value:**

```typescript
interface Serializable {
  toJSON(): string;
}

// A plain object with the right shape works perfectly
const userDTO: Serializable = {
  toJSON() {
    return JSON.stringify({ name: "Alice" });
  },
};
```

---

## 8. 💡 Key Interview Questions

**Q1: What is polymorphism? Give a real-world example.**

> Polymorphism means "many forms" — the ability for different objects to respond to the same method call with different behavior. Example: a `PaymentProcessor` interface where `StripeProcessor`, `PayPalProcessor`, and `SquareProcessor` each implement `processPayment()` differently. The caller doesn't need to know which processor it's using.

**Q2: What is the difference between runtime and compile-time polymorphism?**

| Aspect | Runtime (Subtype) | Compile-time (Overloading/Generics) |
|--------|-------------------|-------------------------------------|
| **When resolved** | At execution | During compilation |
| **Mechanism** | Method overriding, virtual dispatch | Function overloads, generics |
| **Flexibility** | Object type can change at runtime | Types fixed at compile time |
| **Example** | `animal.speak()` calls Dog or Cat version | `Array<number>` vs `Array<string>` |

**Q3: How does polymorphism support the Open/Closed Principle?**

> Code that depends on an interface (e.g., `PaymentProcessor`) is **closed for modification** — you never change it. But it is **open for extension** — you add new implementations (e.g., `CryptoProcessor`) without touching existing code.

**Q4: What is structural typing and how does it relate to polymorphism?**

> TypeScript uses structural typing — an object satisfies a type if it has the right shape, regardless of explicit `implements` declarations. This means any object with a matching `.send()` method satisfies a `Notifier` interface, enabling polymorphism without class hierarchies.

**Q5: When would you use generics over union types?**

> Use generics when the **relationship between input and output types** matters. `function identity<T>(x: T): T` guarantees the output matches the input. A union type `string | number` loses that relationship. Generics also scale to unlimited types, while unions must list every type explicitly.

**Q6: How do you eliminate `switch` statements using polymorphism?**

> Replace each `case` with a class that implements a shared interface. Instead of switching on a type string, pass the correct object and call the method directly. This moves the branching logic from a central function into individual classes, making the system extensible and testable.

---

[← README](./README.md) | [← 03 Inheritance](./03-inheritance.md) | [Next: 05 Abstraction →](./05-abstraction.md)
