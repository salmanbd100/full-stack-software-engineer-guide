[← README](./README.md) | [← 04 Polymorphism](./04-polymorphism.md)

---

# 05 - Abstraction

## 🎯 The Big Picture

**Abstraction** is hiding complexity behind a simple interface, exposing only what the consumer needs to know.

> **Analogy:** A car's steering wheel. You turn the wheel (simple interface), but behind it there's a complex system of hydraulics, gears, power steering fluid, and electronic sensors. You don't need to understand the internals to drive. Abstraction hides complexity behind a simple interface.

```
  Driver's View                Under the Hood
+-------------------+      +----------------------------+
|                   |      |  Hydraulic pump            |
|   Steering        |      |  Power steering fluid      |
|   Wheel           |------|  Rack and pinion gears     |
|                   |      |  Electronic sensors        |
|  turn(direction)  |      |  Torque calculations       |
+-------------------+      +----------------------------+
  Simple interface           Complex implementation
```

---

## 💡 **What is Abstraction?**

Abstraction means defining **what** something does without specifying **how** it does it.

**Two Mechanisms in TypeScript:**

1. **Abstract Classes** — partial implementation + contract (abstract methods)
2. **Interfaces** — pure contract, no implementation at all

**Key Principles:**

- Hide internal complexity from consumers
- Expose only the **minimum necessary** API
- Allow implementations to change without breaking consumers
- Enable swapping one implementation for another

---

## 💡 **Abstract Classes in TypeScript**

An abstract class provides a **mix of implemented methods and abstract methods** that subclasses must implement.

**Key Characteristics:**

1. **Cannot be instantiated directly** — only subclasses can be created
2. **Can contain implemented methods** — shared logic lives here
3. **Can contain abstract methods** — subclasses must implement these
4. **Can have state (properties)** — including `private`, `protected`, `public`
5. **Can have a constructor** — called via `super()` in subclasses

```typescript
abstract class DatabaseDriver {
  protected connectionString: string;

  constructor(connectionString: string) {
    this.connectionString = connectionString;
  }

  // ✅ Abstract methods — subclasses MUST implement
  abstract connect(): Promise<void>;
  abstract query(sql: string, params?: unknown[]): Promise<unknown[]>;
  abstract disconnect(): Promise<void>;

  // ✅ Implemented method — shared logic, inherited by all subclasses
  async healthCheck(): Promise<boolean> {
    try {
      await this.connect();
      await this.query("SELECT 1");
      await this.disconnect();
      return true;
    } catch {
      return false;
    }
  }
}

// Concrete implementation — Postgres
class PostgresDriver extends DatabaseDriver {
  private pool: unknown; // pg.Pool in real code

  async connect(): Promise<void> {
    // Postgres-specific connection logic
    console.log(`Connecting to Postgres: ${this.connectionString}`);
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    // Postgres-specific query logic
    console.log(`Postgres query: ${sql}`);
    return [];
  }

  async disconnect(): Promise<void> {
    // Postgres-specific cleanup
    console.log("Disconnecting from Postgres");
  }
}

// Concrete implementation — MongoDB
class MongoDriver extends DatabaseDriver {
  async connect(): Promise<void> {
    console.log(`Connecting to MongoDB: ${this.connectionString}`);
  }

  async query(sql: string, params?: unknown[]): Promise<unknown[]> {
    console.log(`Mongo query: ${sql}`);
    return [];
  }

  async disconnect(): Promise<void> {
    console.log("Disconnecting from MongoDB");
  }
}
```

> **Key Insight:** The `healthCheck()` method is written **once** in the abstract class. Every driver inherits it for free. But each driver provides its own `connect()`, `query()`, and `disconnect()`.

---

## 💡 **Interfaces**

An interface is a **pure contract** — it declares what methods and properties a class must have, but provides **zero implementation**.

```typescript
interface StorageService {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  listFiles(prefix: string): Promise<string[]>;
}

// ✅ S3 implementation
class S3Storage implements StorageService {
  constructor(private bucket: string, private region: string) {}

  async upload(key: string, data: Buffer): Promise<string> {
    // AWS S3 SDK logic
    return `s3://${this.bucket}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    // AWS S3 SDK logic
    return Buffer.from("");
  }

  async delete(key: string): Promise<void> {
    // AWS S3 SDK logic
  }

  async listFiles(prefix: string): Promise<string[]> {
    // AWS S3 SDK logic
    return [];
  }
}

// ✅ Google Cloud Storage implementation
class GCSStorage implements StorageService {
  constructor(private bucket: string) {}

  async upload(key: string, data: Buffer): Promise<string> {
    return `gs://${this.bucket}/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    return Buffer.from("");
  }

  async delete(key: string): Promise<void> {}

  async listFiles(prefix: string): Promise<string[]> {
    return [];
  }
}

// ✅ Azure Blob Storage implementation
class AzureBlobStorage implements StorageService {
  constructor(private container: string) {}

  async upload(key: string, data: Buffer): Promise<string> {
    return `https://${this.container}.blob.core.windows.net/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    return Buffer.from("");
  }

  async delete(key: string): Promise<void> {}

  async listFiles(prefix: string): Promise<string[]> {
    return [];
  }
}
```

**Multiple Interface Implementation:**

```typescript
interface Serializable {
  serialize(): string;
}

interface Cacheable {
  getCacheKey(): string;
  getTTL(): number;
}

// ✅ A class can implement MULTIPLE interfaces
class UserProfile implements Serializable, Cacheable {
  constructor(private id: string, private name: string) {}

  serialize(): string {
    return JSON.stringify({ id: this.id, name: this.name });
  }

  getCacheKey(): string {
    return `user:${this.id}`;
  }

  getTTL(): number {
    return 3600; // 1 hour
  }
}
```

---

## 💡 **Abstract Class vs Interface — THE Comparison**

| Feature | Abstract Class | Interface |
|---------|---------------|-----------|
| **Implementation** | Can have methods with body | No implementation (pure contract) |
| **State** | Can have properties with values | Only declarations |
| **Constructor** | Yes | No |
| **Multiple** | Single inheritance only | Multiple interfaces allowed |
| **Access Modifiers** | `private`, `protected`, `public` | Only `public` (by nature) |
| **When to Use** | Shared code + contract | Pure contract, multiple types |
| **Relationship** | "is-a" (PostgresDriver **is a** DatabaseDriver) | "can-do" (UserProfile **can do** Serializable) |
| **Runtime Existence** | Yes (compiled to JS class) | No (erased at compile time) |

**Decision Guide:**

| Scenario | Use This | Why |
|----------|---------|-----|
| Shared logic across subclasses | **Abstract Class** | Put common code in the base class |
| Need a constructor | **Abstract Class** | Interfaces cannot have constructors |
| Need `private`/`protected` state | **Abstract Class** | Interfaces have no access modifiers |
| Pure API contract | **Interface** | Lightweight, no runtime cost |
| Class needs multiple contracts | **Interface** | TypeScript allows multiple `implements` |
| Describing "shape" of data | **Interface** | `interface User { name: string }` |
| Mix of both | **Both** | Abstract class implements interface |

**Using Both Together:**

```typescript
// Interface defines the contract
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

// Abstract class provides partial implementation
abstract class BaseLogger implements Logger {
  abstract log(message: string): void;
  abstract error(message: string): void;

  // Shared utility
  protected formatMessage(level: string, message: string): string {
    return `[${new Date().toISOString()}] [${level}] ${message}`;
  }
}

// Concrete implementation
class ConsoleLogger extends BaseLogger {
  log(message: string): void {
    console.log(this.formatMessage("INFO", message));
  }

  error(message: string): void {
    console.error(this.formatMessage("ERROR", message));
  }
}
```

---

## 💡 **Template Method Pattern**

An abstract class defines the **skeleton** of an algorithm, and subclasses fill in the specific steps.

```
Abstract Class (DataProcessor)
+--------------------------------+
|  process() <-- template method |
|    1. validate()   <-- abstract|
|    2. transform()  <-- abstract|
|    3. save()       <-- abstract|
|    4. logResult()  <-- concrete|
+--------------------------------+
        |               |
        v               v
  CSVProcessor    JSONProcessor
  (fills steps)   (fills steps)
```

```typescript
abstract class DataProcessor<T> {
  // Template method — defines the skeleton
  async process(input: string): Promise<void> {
    const validated = this.validate(input);
    const transformed = this.transform(validated);
    await this.save(transformed);
    this.logResult(transformed);
  }

  // Abstract steps — subclasses MUST implement
  protected abstract validate(input: string): T;
  protected abstract transform(data: T): T;
  protected abstract save(data: T): Promise<void>;

  // Concrete step — shared across all subclasses
  protected logResult(data: T): void {
    console.log(`Processed successfully: ${JSON.stringify(data)}`);
  }
}

// CSV implementation
class CSVProcessor extends DataProcessor<string[][]> {
  protected validate(input: string): string[][] {
    const rows = input.split("\n").map((row) => row.split(","));
    if (rows.length === 0) throw new Error("Empty CSV");
    return rows;
  }

  protected transform(data: string[][]): string[][] {
    // Remove header, trim whitespace
    return data.slice(1).map((row) => row.map((cell) => cell.trim()));
  }

  protected async save(data: string[][]): Promise<void> {
    console.log(`Saving ${data.length} CSV rows to database`);
  }
}

// JSON implementation
class JSONProcessor extends DataProcessor<Record<string, unknown>> {
  protected validate(input: string): Record<string, unknown> {
    try {
      return JSON.parse(input);
    } catch {
      throw new Error("Invalid JSON");
    }
  }

  protected transform(data: Record<string, unknown>): Record<string, unknown> {
    // Normalize keys to lowercase
    const normalized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data)) {
      normalized[key.toLowerCase()] = value;
    }
    return normalized;
  }

  protected async save(data: Record<string, unknown>): Promise<void> {
    console.log(`Saving JSON document to NoSQL store`);
  }
}
```

> **Key Insight:** The Template Method Pattern is one of the most practical uses of abstract classes. The algorithm's structure is locked in the base class, but the details are deferred to subclasses.

---

## 💡 **Abstraction Layers**

Real applications use **multiple layers** of abstraction. Each layer hides the complexity of the layer below it.

```
Application Code (BusinessService)
        |
        v
[StorageService Interface]  <-- You code against THIS
        |
   +----+------+
   |    |      |
   v    v      v
  S3   GCS   Azure     <-- Implementations hidden
   |    |      |
   v    v      v
  HTTP HTTP  HTTP      <-- Network layer hidden
   |    |      |
   v    v      v
  TCP  TCP   TCP       <-- Transport layer hidden
```

**Example — Layered Architecture:**

```typescript
// Layer 1: Interface (what the app sees)
interface UserRepository {
  findById(id: string): Promise<User | null>;
  save(user: User): Promise<void>;
  delete(id: string): Promise<void>;
}

// Layer 2: Implementation (hidden from the app)
class PostgresUserRepository implements UserRepository {
  constructor(private db: DatabaseDriver) {}

  async findById(id: string): Promise<User | null> {
    const rows = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    return rows.length > 0 ? (rows[0] as User) : null;
  }

  async save(user: User): Promise<void> {
    await this.db.query(
      "INSERT INTO users (id, name, email) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = $2, email = $3",
      [user.id, user.name, user.email]
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.query("DELETE FROM users WHERE id = $1", [id]);
  }
}

// Layer 3: Business logic — knows NOTHING about Postgres
class UserService {
  constructor(private userRepo: UserRepository) {} // ← injected abstraction

  async getUser(id: string): Promise<User> {
    const user = await this.userRepo.findById(id);
    if (!user) throw new Error("User not found");
    return user;
  }
}
```

> **Key Insight:** `UserService` depends on `UserRepository` (the interface), not `PostgresUserRepository` (the implementation). You can swap Postgres for MongoDB without changing the service.

---

## ❌ Before / ✅ After: Why Abstraction Matters

### ❌ **Before: Tightly Coupled to Implementation**

```typescript
// ❌ Directly using AWS S3 SDK everywhere
class ImageUploader {
  private s3 = new AWS.S3({ region: "us-east-1" });

  async upload(file: Buffer, filename: string): Promise<string> {
    await this.s3
      .putObject({
        Bucket: "my-bucket",
        Key: filename,
        Body: file,
      })
      .promise();
    return `https://my-bucket.s3.amazonaws.com/${filename}`;
  }
}

class DocumentUploader {
  private s3 = new AWS.S3({ region: "us-east-1" }); // ❌ Duplicated

  async upload(file: Buffer, filename: string): Promise<string> {
    await this.s3
      .putObject({
        Bucket: "my-docs-bucket",
        Key: filename,
        Body: file,
      })
      .promise();
    return `https://my-docs-bucket.s3.amazonaws.com/${filename}`;
  }
}
```

**Problems:**

- Duplicated S3 logic across every uploader
- Cannot switch to GCS or Azure without rewriting every class
- Cannot unit test without hitting real AWS
- Vendor lock-in

### ✅ **After: Code Against an Abstraction**

```typescript
// ✅ Define the contract
interface StorageService {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}

// ✅ One S3 implementation
class S3Storage implements StorageService {
  constructor(private bucket: string) {}

  async upload(key: string, data: Buffer): Promise<string> {
    // S3 SDK logic in ONE place
    return `https://${this.bucket}.s3.amazonaws.com/${key}`;
  }

  async download(key: string): Promise<Buffer> {
    return Buffer.from("");
  }

  async delete(key: string): Promise<void> {}
}

// ✅ Uploaders depend on the abstraction
class ImageUploader {
  constructor(private storage: StorageService) {} // ← injected

  async upload(file: Buffer, filename: string): Promise<string> {
    return this.storage.upload(`images/${filename}`, file);
  }
}

// ✅ Easy to swap implementations or mock in tests
const uploader = new ImageUploader(new S3Storage("my-bucket"));
// or: new ImageUploader(new GCSStorage("my-bucket"));
// or: new ImageUploader(new MockStorage()); // for tests
```

**Benefits:**

- Single Responsibility — S3 logic in one place
- Open/Closed — add new storage providers without changing existing code
- Testable — inject a mock `StorageService` in unit tests
- No vendor lock-in — swap S3 for GCS in one line

---

## ⚠️ **Common Mistakes**

### ❌ **Mistake 1: Creating Abstractions Too Early (YAGNI)**

```typescript
// ❌ You only have ONE database and no plans to change
// Don't create an abstraction "just in case"
interface DatabaseService { /* ... */ }
class PostgresService implements DatabaseService { /* ... */ }
// Only PostgresService exists — the interface adds complexity for no benefit
```

**Rule of thumb:** Wait until you have **two or more** implementations, or a clear need to swap (e.g., testing, multi-cloud).

### ❌ **Mistake 2: Abstract Class When Interface Is Sufficient**

```typescript
// ❌ No shared logic — should be an interface
abstract class Notifier {
  abstract send(message: string): void;
}

// ✅ Interface is lighter and more flexible
interface Notifier {
  send(message: string): void;
}
```

### ❌ **Mistake 3: Leaky Abstractions**

```typescript
// ❌ Leaking implementation details through the interface
interface StorageService {
  upload(key: string, data: Buffer): Promise<string>;
  getS3Client(): AWS.S3; // ❌ Leaks S3-specific detail
  setBucketPolicy(policy: S3BucketPolicy): void; // ❌ S3-specific
}

// ✅ Keep the interface implementation-agnostic
interface StorageService {
  upload(key: string, data: Buffer): Promise<string>;
  download(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
```

> **Key Insight:** If your abstraction exposes details of a specific implementation, it's a **leaky abstraction**. Consumers should never need to know what's behind the interface.

---

## 🔑 **Key Interview Questions**

### Q1: What is abstraction in OOP?

**Answer:** Abstraction is hiding complex implementation details and exposing only the essential interface. In TypeScript, this is achieved through abstract classes (partial implementation + contract) and interfaces (pure contracts).

### Q2: Abstract class vs interface — when do you use each?

**Answer:**
- **Abstract class** when you have shared implementation logic, need a constructor, or need `protected` state. Represents an "is-a" relationship.
- **Interface** when you need a pure contract, multiple implementation, or describing data shapes. Represents a "can-do" capability.

### Q3: What is the Template Method Pattern?

**Answer:** A behavioral design pattern where an abstract class defines the skeleton of an algorithm in a method (the template method), deferring specific steps to subclasses. The base class controls the order and structure; subclasses provide the details.

### Q4: What is a leaky abstraction?

**Answer:** An abstraction that exposes implementation details to its consumers. For example, a `StorageService` interface with a `getS3Client()` method — it forces consumers to know about S3, defeating the purpose of the abstraction.

### Q5: What is the Dependency Inversion Principle?

**Answer:** High-level modules should depend on abstractions, not on concrete implementations. For example, `UserService` depends on `UserRepository` (interface), not `PostgresUserRepository` (class). This allows swapping implementations without changing business logic.

### Q6: Can you give a real-world example of abstraction?

**Answer:** A payment processing system: define a `PaymentGateway` interface with `charge()` and `refund()`. Implement `StripeGateway`, `PayPalGateway`, `SquareGateway`. The checkout service depends on `PaymentGateway` — you can switch providers or A/B test gateways without touching checkout logic.

---

[← 04 Polymorphism](./04-polymorphism.md) | [Next: 06 Composition vs Inheritance →](./06-composition-vs-inheritance.md)
