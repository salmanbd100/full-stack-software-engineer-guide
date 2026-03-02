# Encapsulation

[← README](./README.md) | [← 01 OOP Fundamentals](./01-oop-fundamentals.md)

---

## Understanding Encapsulation

Encapsulation is one of the four pillars of Object-Oriented Programming. It is the practice of **bundling data and the methods that operate on that data** into a single unit (a class), while **restricting direct access** to some of the object's internals.

### Why This Matters for Interviews

1. **Design quality** — encapsulation is the foundation of maintainable, bug-resistant code
2. **API design** — interviewers assess whether you can design clean public interfaces
3. **TypeScript depth** — access modifiers are a frequent TypeScript interview topic
4. **Real-world patterns** — every production codebase relies on encapsulation for data integrity

---

## 💡 **The ATM Analogy**

Think of an **ATM machine**:

```
┌─────────────────────────────────────────────┐
│                  ATM Machine                 │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │        PUBLIC INTERFACE              │    │
│  │   [Screen]  [Keypad]  [Card Slot]   │    │
│  │   [Cash Dispenser]  [Receipt]       │    │
│  └──────────────────────────────────────┘    │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │        PRIVATE INTERNALS             │    │
│  │   🔒 Vault with cash                │    │
│  │   🔒 Cash counting mechanism        │    │
│  │   🔒 Security system                │    │
│  │   🔒 Network connection to bank     │    │
│  │   🔒 Transaction processing logic   │    │
│  └──────────────────────────────────────┘    │
│                                              │
└─────────────────────────────────────────────┘
```

You interact through **buttons and a screen** (the public interface), but the vault, cash counting, and security systems are **hidden** (private internals). You cannot directly access the cash — you **must** go through the interface.

> **Key Insight:**
> Encapsulation is not just about hiding data — it is about exposing a **controlled interface** that guarantees the internal state remains valid.

---

## 💡 **What is Encapsulation?**

Encapsulation combines two related ideas:

1. **Bundling** — grouping data (properties) and behavior (methods) into a single class
2. **Access control** — restricting who can read or modify the internal state

**Core Goals:**

| Goal | Description |
|------|-------------|
| **Data Integrity** | Prevent invalid state (e.g., negative balance) |
| **Information Hiding** | Expose only what consumers need |
| **Loose Coupling** | Internal changes don't break external code |
| **Clear API** | Public interface documents how to use the class |

---

## 💡 **Access Modifiers in TypeScript**

TypeScript provides four levels of access control:

### Access Modifier Scope Diagram

```
┌──────────────────────────────────────────────────────┐
│  OUTSIDE CODE (other classes, functions, modules)     │
│                                                       │
│   Can access: public                                  │
│   ──────────────────────────────────────────────      │
│  ┌────────────────────────────────────────────┐       │
│  │  SUBCLASS (extends the class)              │       │
│  │                                            │       │
│  │   Can access: public, protected            │       │
│  │   ──────────────────────────────────────   │       │
│  │  ┌──────────────────────────────────────┐  │       │
│  │  │  CLASS ITSELF                        │  │       │
│  │  │                                      │  │       │
│  │  │   Can access: public, protected,     │  │       │
│  │  │               private, readonly      │  │       │
│  │  │                                      │  │       │
│  │  └──────────────────────────────────────┘  │       │
│  └────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────┘
```

### Comparison Table

| Modifier | Within Class | Subclass | Outside | Reassignable |
|----------|:----------:|:--------:|:-------:|:------------:|
| **`public`** | ✅ | ✅ | ✅ | ✅ |
| **`private`** | ✅ | ❌ | ❌ | ✅ (internally) |
| **`protected`** | ✅ | ✅ | ❌ | ✅ (internally) |
| **`readonly`** | ✅ | ✅ | ✅ | ❌ (set once) |

### Access Modifier Examples

**`public` — accessible everywhere (default):**

```typescript
class User {
  public name: string; // "public" is optional — it's the default

  constructor(name: string) {
    this.name = name;
  }
}

const user = new User("Alice");
console.log(user.name); // ✅ "Alice"
user.name = "Bob";       // ✅ Allowed
```

**`private` — only within the class:**

```typescript
class Vault {
  private secretCode: string;

  constructor(code: string) {
    this.secretCode = code;
  }

  public verifyCode(input: string): boolean {
    return input === this.secretCode; // ✅ Access within class
  }
}

const vault = new Vault("1234");
vault.verifyCode("1234"); // ✅ true
// vault.secretCode;      // ❌ Error: Property 'secretCode' is private
```

**`protected` — within class and subclasses:**

```typescript
class Animal {
  protected sound: string;

  constructor(sound: string) {
    this.sound = sound;
  }
}

class Dog extends Animal {
  public bark(): string {
    return this.sound; // ✅ Access in subclass
  }
}

const dog = new Dog("Woof");
dog.bark();        // ✅ "Woof"
// dog.sound;      // ❌ Error: Property 'sound' is protected
```

**`readonly` — set once, never changed:**

```typescript
class Config {
  readonly apiUrl: string;
  readonly maxRetries: number;

  constructor(url: string, retries: number) {
    this.apiUrl = url;          // ✅ Set in constructor
    this.maxRetries = retries;  // ✅ Set in constructor
  }
}

const config = new Config("https://api.example.com", 3);
console.log(config.apiUrl); // ✅ "https://api.example.com"
// config.apiUrl = "other";  // ❌ Error: Cannot assign to 'apiUrl' because it is a read-only property
```

---

## 💡 **Getters and Setters**

Getters and setters let you define **computed properties** and **validation logic** while keeping a clean property-access syntax.

**How They Work:**

```
obj.property        →  calls the getter (get property())
obj.property = val  →  calls the setter (set property(val))
```

**Basic Example:**

```typescript
class Circle {
  private _radius: number;

  constructor(radius: number) {
    this._radius = radius;
  }

  // Getter — computed property
  get area(): number {
    return Math.PI * this._radius ** 2;
  }

  // Getter with validation on set
  get radius(): number {
    return this._radius;
  }

  set radius(value: number) {
    if (value <= 0) {
      throw new Error("Radius must be positive");
    }
    this._radius = value;
  }
}

const circle = new Circle(5);
console.log(circle.radius); // 5 — calls getter
console.log(circle.area);   // 78.54 — computed on access
circle.radius = 10;         // ✅ calls setter with validation
// circle.radius = -1;      // ❌ throws Error: "Radius must be positive"
```

> **Key Insight:**
> Getters and setters let external code use clean property syntax (`obj.value`) while the class internally maintains full control over reads and writes.

---

## 💡 **Before / After: Why Encapsulation Matters**

### ❌ Before (No Encapsulation)

```typescript
class BankAccount {
  balance: number;
  owner: string;

  constructor(owner: string, balance: number) {
    this.owner = owner;
    this.balance = balance;
  }
}

const account = new BankAccount("Alice", 1000);

// Anyone can do anything — no protection
account.balance = -5000;   // 💥 Negative balance? No error.
account.balance = NaN;     // 💥 Not a number? No error.
account.owner = "";        // 💥 Empty owner? No error.
```

**Problems:**
- ❌ No validation — balance can be set to any value including negative or `NaN`
- ❌ No business rules — withdrawals beyond the balance go unchecked
- ❌ No audit trail — changes happen silently with no logging
- ❌ Fragile — every consumer must remember to validate before setting

### ✅ After (With Encapsulation)

```typescript
class BankAccount {
  private _balance: number;
  private readonly _owner: string;
  private _transactions: string[] = [];

  constructor(owner: string, initialDeposit: number) {
    if (!owner.trim()) {
      throw new Error("Owner name is required");
    }
    if (initialDeposit < 0) {
      throw new Error("Initial deposit cannot be negative");
    }
    this._owner = owner;
    this._balance = initialDeposit;
    this.logTransaction("OPEN", initialDeposit);
  }

  // Public read-only access
  get balance(): number {
    return this._balance;
  }

  get owner(): string {
    return this._owner;
  }

  // Controlled operations with validation
  public deposit(amount: number): void {
    if (amount <= 0) {
      throw new Error("Deposit amount must be positive");
    }
    this._balance += amount;
    this.logTransaction("DEPOSIT", amount);
  }

  public withdraw(amount: number): void {
    if (amount <= 0) {
      throw new Error("Withdrawal amount must be positive");
    }
    if (amount > this._balance) {
      throw new Error("Insufficient funds");
    }
    this._balance -= amount;
    this.logTransaction("WITHDRAW", amount);
  }

  public getStatement(): string[] {
    return [...this._transactions]; // Return a copy, not the original
  }

  // Private helper — hidden from outside
  private logTransaction(type: string, amount: number): void {
    const entry = `[${new Date().toISOString()}] ${type}: $${amount} | Balance: $${this._balance}`;
    this._transactions.push(entry);
  }
}

const account = new BankAccount("Alice", 1000);
account.deposit(500);       // ✅ Balance: 1500
account.withdraw(200);      // ✅ Balance: 1300
// account.balance = -5000; // ❌ Error: Cannot set — no setter defined
// account.withdraw(9999);  // ❌ Error: Insufficient funds
```

**Benefits:**
- ✅ Balance can never be set to an invalid value
- ✅ Business rules (sufficient funds) are enforced automatically
- ✅ Transaction history is maintained internally
- ✅ Owner name is immutable after construction
- ✅ External code uses a clean, safe API

---

## 💡 **Real-World Example: UserService**

A service class that hides validation and internal logic behind a public API:

```typescript
interface UserData {
  id: string;
  email: string;
  name: string;
}

class UserService {
  private users: Map<string, UserData> = new Map();
  private readonly emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  // Public API — clean and simple
  public createUser(email: string, name: string): UserData {
    this.validateEmail(email);
    this.validateName(name);
    this.ensureUniqueEmail(email);

    const user: UserData = {
      id: this.generateId(),
      email: email.toLowerCase().trim(),
      name: name.trim(),
    };

    this.users.set(user.id, user);
    return { ...user }; // Return a copy
  }

  public getUserById(id: string): UserData | undefined {
    const user = this.users.get(id);
    return user ? { ...user } : undefined; // Return a copy
  }

  // Private internals — hidden from consumers
  private validateEmail(email: string): void {
    if (!this.emailRegex.test(email)) {
      throw new Error(`Invalid email: ${email}`);
    }
  }

  private validateName(name: string): void {
    if (!name.trim() || name.trim().length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
  }

  private ensureUniqueEmail(email: string): void {
    const normalized = email.toLowerCase().trim();
    for (const user of this.users.values()) {
      if (user.email === normalized) {
        throw new Error("Email already registered");
      }
    }
  }

  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
```

> **Key Insight:**
> The consumer of `UserService` only sees `createUser()` and `getUserById()`. All validation, ID generation, and storage details are hidden — and can change without breaking any external code.

---

## 💡 **Real-World Example: Configuration Class**

Using `readonly` to create immutable configuration objects:

```typescript
class AppConfig {
  readonly port: number;
  readonly databaseUrl: string;
  readonly environment: "development" | "staging" | "production";
  readonly maxConnections: number;

  private static instance: AppConfig | null = null;

  private constructor(env: Record<string, string>) {
    this.port = parseInt(env.PORT || "3000", 10);
    this.databaseUrl = env.DATABASE_URL || "localhost:5432";
    this.environment = this.parseEnv(env.NODE_ENV);
    this.maxConnections = parseInt(env.MAX_CONNECTIONS || "10", 10);
  }

  // Singleton pattern — only one config instance
  public static getInstance(env: Record<string, string> = {}): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig(env);
    }
    return AppConfig.instance;
  }

  private parseEnv(value?: string): "development" | "staging" | "production" {
    if (value === "production" || value === "staging") {
      return value;
    }
    return "development";
  }
}

const config = AppConfig.getInstance({ PORT: "8080", NODE_ENV: "production" });
console.log(config.port);        // ✅ 8080
console.log(config.environment); // ✅ "production"
// config.port = 9090;           // ❌ Error: Cannot assign to 'port' — readonly
// new AppConfig({});             // ❌ Error: Constructor is private
```

---

## ⚠️ **Common Mistakes**

### 1. Exposing Internal References

❌ **Bad — returning the original array:**

```typescript
class Team {
  private members: string[] = [];

  addMember(name: string): void {
    this.members.push(name);
  }

  getMembers(): string[] {
    return this.members; // 💥 Returns the internal array directly
  }
}

const team = new Team();
team.addMember("Alice");
const members = team.getMembers();
members.push("HACKER"); // 💥 Mutates the private array from outside!
```

✅ **Good — returning a copy:**

```typescript
getMembers(): string[] {
  return [...this.members]; // Return a shallow copy
}
```

### 2. Overly Permissive Access

❌ **Bad — everything is public by default:**

```typescript
class OrderProcessor {
  public db: Database;            // 💥 Exposing internal dependency
  public validateOrder(): void {} // 💥 Validation should be internal
  public calculateTax(): number { return 0; } // 💥 Internal logic exposed
  public processOrder(): void {}  // ✅ This one should be public
}
```

✅ **Good — minimal public surface:**

```typescript
class OrderProcessor {
  private db: Database;
  private validateOrder(): void {}
  private calculateTax(): number { return 0; }
  public processOrder(): void {}  // Only expose what consumers need
}
```

### 3. Using `private` for Fields That Subclasses Need

❌ **Bad — subclass cannot access parent's field:**

```typescript
class Shape {
  private color: string; // 💥 Subclasses can't access this

  constructor(color: string) {
    this.color = color;
  }
}

class Circle extends Shape {
  describe(): string {
    return this.color; // ❌ Error: 'color' is private
  }
}
```

✅ **Good — use `protected` when subclasses need access:**

```typescript
class Shape {
  protected color: string; // ✅ Subclasses can access

  constructor(color: string) {
    this.color = color;
  }
}

class Circle extends Shape {
  describe(): string {
    return this.color; // ✅ Works
  }
}
```

### 4. Forgetting That TypeScript Access Modifiers Are Compile-Time Only

⚠️ **Important:**

```typescript
class Secret {
  private password = "hunter2";
}

const s = new Secret();
// s.password              // ❌ TypeScript compiler error
// (s as any).password     // ⚠️ "hunter2" — still accessible at runtime!
```

> TypeScript access modifiers are **erased at compile time**. They do not provide runtime security. For true runtime privacy, use JavaScript's native `#private` fields.

---

## 💡 **TypeScript `private` vs JavaScript `#private`**

| Feature | TypeScript `private` | JavaScript `#private` |
|---------|--------------------|-----------------------|
| **Enforcement** | Compile-time only | Runtime enforcement |
| **Bypass with `as any`** | ✅ Yes | ❌ No |
| **Works in plain JS** | ❌ No | ✅ Yes |
| **Reflection access** | Accessible | Truly hidden |
| **Recommended for** | Most TypeScript projects | Security-sensitive code |

```typescript
class Example {
  private tsPrivate = "compile-time only";
  #jsPrivate = "runtime enforced";

  public reveal(): string {
    return `${this.tsPrivate} | ${this.#jsPrivate}`;
  }
}
```

---

## 💡 **Key Interview Questions**

1. **What is encapsulation and why is it important?**
   - Bundling data + behavior, controlling access to protect internal state and expose a clean API.

2. **What is the difference between `private` and `protected` in TypeScript?**
   - `private` is accessible only within the declaring class. `protected` is also accessible in subclasses.

3. **How do getters and setters support encapsulation?**
   - They allow computed properties and validation logic while maintaining clean property-access syntax.

4. **Are TypeScript access modifiers enforced at runtime?**
   - No. They are compile-time only. Use `#private` fields for runtime enforcement.

5. **What is information hiding and how does it differ from encapsulation?**
   - Information hiding is the principle of exposing only what is necessary. Encapsulation is the mechanism (classes, access modifiers) that implements it.

6. **How do you prevent external code from mutating internal arrays or objects?**
   - Return copies (spread operator, `Array.from()`, `structuredClone()`) instead of direct references.

7. **When would you use `readonly` vs a getter with no setter?**
   - `readonly` for simple immutable values set in the constructor. Getter-only for computed or derived values.

8. **Design a class that demonstrates proper encapsulation.**
   - Show private fields, validated setters, defensive copies, and a minimal public API (like the `BankAccount` example above).

---

[← 01 OOP Fundamentals](./01-oop-fundamentals.md) | [Next: 03 Inheritance →](./03-inheritance.md)
