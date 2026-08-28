# Creational Patterns {#ch-creational-patterns}

> Control how an object gets built when a constructor call is no longer enough.

**In this chapter:** singleton and why it is usually a smell · factory · abstract factory · builder · prototype

## Overview

Creational patterns answer one question: **who decides which class gets instantiated, and when?** Every one of them exists to move a `new` call away from the code that depends on the result.

In TypeScript most of them are smaller than the Gang of Four descriptions suggest. Functions are first class, objects are literals, and modules are singletons already — so the pattern is often three lines, not a class hierarchy.

> **What interviewers are really checking:** can you name the coupling problem the pattern removes? "Factory hides the concrete class from the caller" is an answer. Reciting the UML diagram is not.

## Table of Contents

- [Quick Decision Table](#quick-decision-table)
- [Singleton](#singleton)
- [Factory](#factory)
- [Abstract Factory](#abstract-factory)
- [Builder](#builder)
- [Prototype](#prototype)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Quick Decision Table

| You need | Pattern | In TypeScript, usually |
| -------- | ------- | ---------------------- |
| Exactly one shared instance | **Singleton** | A module-level export |
| To hide which class the caller gets | **Factory** | A function returning an interface |
| Families of objects that must match | **Abstract Factory** | An object of factory functions |
| To build one complex object in steps | **Builder** | Chained methods, or just an options object |
| Copies of an expensive object | **Prototype** | `structuredClone` or a `clone()` method |

## Singleton

### 💡 **Intent**

Guarantee one instance of something and give the whole app a way to reach it.

**The real use case is a resource you must not duplicate:** a database connection pool, a Redis client, a metrics registry. Two pools means twice the connections your database budgeted for.

**In TypeScript, a module is already a singleton.** ES modules are evaluated once and cached, so this is the whole pattern:

```typescript
// db.ts — evaluated once, no matter how many files import it.
import { Pool } from "pg";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});
```

**The classic class form** still shows up in interviews, so know it — and know why lazy initialization matters when construction is expensive:

```typescript
class MetricsRegistry {
  private static instance: MetricsRegistry | null = null;
  private readonly counters = new Map<string, number>();

  // Private constructor blocks `new MetricsRegistry()`.
  private constructor() {}

  static getInstance(): MetricsRegistry {
    // Lazy: nothing is built until someone actually asks.
    MetricsRegistry.instance ??= new MetricsRegistry();
    return MetricsRegistry.instance;
  }

  increment(name: string): void {
    this.counters.set(name, (this.counters.get(name) ?? 0) + 1);
  }
}
```

> ⚠️ **Thread safety is a non-issue in Node.** Single-threaded JavaScript means no double-checked locking, no `volatile`. But say *why*: if the constructor does async work, two callers can still both start it, so you cache the **promise**, not the instance.

```typescript
let connecting: Promise<Client> | null = null;

// ✅ Cache the promise so concurrent callers await the same connection.
export function getClient(): Promise<Client> {
  connecting ??= createClient().connect();
  return connecting;
}
```

**Why it has a bad reputation:**

| Problem | Consequence |
| ------- | ----------- |
| Global mutable state | One test mutates it; the next test fails for no visible reason |
| Hidden dependency | The signature says `getUser(id)`; it secretly needs a database |
| Untestable | You can't substitute a fake without monkey-patching a module |

```typescript
// ❌ The dependency is invisible and unswappable.
class UserService {
  find(id: string) {
    return Database.getInstance().query("SELECT …", [id]);
  }
}

// ✅ Same single instance, injected. Honest signature, trivially faked in tests.
class UserService {
  constructor(private readonly db: Database) {}
  find(id: string) {
    return this.db.query("SELECT …", [id]);
  }
}
```

> **The senior answer:** "one instance" is a lifecycle decision; "globally reachable" is a coupling decision. Keep the first, drop the second — create it once at startup and inject it. That's exactly what a DI container does. See [Dependency Injection](./04-architectural-patterns.md#dependency-injection).

## Factory

### 💡 **Intent**

Let the caller ask for *what it wants* without naming *which class* provides it.

**GoF splits this into Factory Method (subclasses override a creation method) and Simple Factory (one function with a switch).** In TypeScript the function is almost always the right shape — the class hierarchy adds ceremony without adding capability.

```typescript
interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<{ id: string }>;
  refund(chargeId: string): Promise<void>;
}

class StripeGateway implements PaymentGateway { /* … */ }
class AdyenGateway implements PaymentGateway { /* … */ }
class FakeGateway implements PaymentGateway { /* … */ } // used in tests

type GatewayName = "stripe" | "adyen" | "fake";

// The factory is the only place that knows the concrete classes exist.
export function createGateway(name: GatewayName): PaymentGateway {
  switch (name) {
    case "stripe": return new StripeGateway(process.env.STRIPE_KEY!);
    case "adyen":  return new AdyenGateway(process.env.ADYEN_KEY!);
    case "fake":   return new FakeGateway();
    // ✅ `never` makes TS fail the build if a new GatewayName is unhandled.
    default: { const exhaustive: never = name; throw new Error(exhaustive); }
  }
}
```

Callers depend on `PaymentGateway` only. Swapping providers touches one file.

**The registry variant** is what you reach for when the set of types grows or must be extended by plugins:

```typescript
type Factory = () => PaymentGateway;

const registry = new Map<string, Factory>();

export const register = (name: string, make: Factory): void => void registry.set(name, make);

export function create(name: string): PaymentGateway {
  const make = registry.get(name);
  if (!make) throw new Error(`Unknown gateway: ${name}`);
  return make();
}
```

**When *not* to use a factory:** if there's exactly one implementation and no plan for another, `new StripeGateway()` is clearer. A factory over a single class is indirection with no payoff.

## Abstract Factory

### 💡 **Intent**

Create **families of objects that have to be used together**, so a caller can't accidentally mix incompatible ones.

The distinction from a plain factory is the word *family*. A factory makes one kind of thing. An abstract factory makes a matched set.

```typescript
// A Postgres connection and a MySQL query builder must never meet.
interface Connection { query<T>(sql: string, params: unknown[]): Promise<T[]>; }
interface QueryBuilder { quoteIdentifier(name: string): string; limit(n: number, offset: number): string; }
interface Migrator { up(name: string): Promise<void>; }

interface DatabaseFactory {
  createConnection(): Connection;
  createQueryBuilder(): QueryBuilder;
  createMigrator(): Migrator;
}

const postgres: DatabaseFactory = {
  createConnection: () => new PgConnection(),
  createQueryBuilder: () => new PgQueryBuilder(),  // "table"
  createMigrator: () => new PgMigrator(),
};

const mysql: DatabaseFactory = {
  createConnection: () => new MySqlConnection(),
  createQueryBuilder: () => new MySqlQueryBuilder(), // `table`
  createMigrator: () => new MySqlMigrator(),
};

// Client code is written once against the interfaces.
class Repository {
  private readonly conn: Connection;
  private readonly qb: QueryBuilder;

  constructor(factory: DatabaseFactory) {
    this.conn = factory.createConnection();
    this.qb = factory.createQueryBuilder(); // ✅ guaranteed to match the connection
  }
}

const factory = process.env.DB === "mysql" ? mysql : postgres;
```

**Where you meet it in real life:** database drivers, cloud SDK clients per provider, and themed UI kits — anywhere a whole set of pieces must come from the same vendor.

| Pros | Cons |
| ---- | ---- |
| ✅ Impossible to mix families | ❌ Adding a new *product* means changing every factory |
| ✅ Swap the whole set in one line | ❌ Heavy if you only ever ship one family |

> ⚠️ **This is the most over-applied creational pattern.** It pays off when a second family genuinely exists. If you're building the abstraction "in case we switch database", you're paying full price for an option you'll probably never exercise.

## Builder

### 💡 **Intent**

Construct one complex object step by step, so the construction code stays readable and invalid states are impossible.

**The problem it fixes** is the telescoping constructor:

```typescript
// ❌ What is `true, false, true`? Nobody knows without opening the file.
new HttpClient("https://api.x.com", 5000, 3, true, false, true, null);
```

**In TypeScript, an options object solves 90% of this** and needs no pattern at all:

```typescript
// ✅ Self-documenting, order-independent, optional fields are explicit.
interface HttpClientOptions {
  baseUrl: string;
  timeoutMs?: number;
  retries?: number;
  keepAlive?: boolean;
}

new HttpClient({ baseUrl: "https://api.x.com", timeoutMs: 5000, retries: 3 });
```

**Reach for a real builder when construction is genuinely incremental** — you're accumulating parts across several calls, order matters, or you want a fluent DSL:

```typescript
interface Query {
  sql: string;
  params: unknown[];
}

class SelectQueryBuilder {
  private columns: string[] = ["*"];
  private table = "";
  private readonly wheres: string[] = [];
  private readonly params: unknown[] = [];
  private limitValue?: number;

  select(...columns: string[]): this {
    this.columns = columns;
    return this; // returning `this` is what makes chaining work
  }

  from(table: string): this {
    this.table = table;
    return this;
  }

  where(clause: string, value: unknown): this {
    // ✅ Placeholders, never interpolation — the builder enforces safety for every caller.
    this.wheres.push(clause);
    this.params.push(value);
    return this;
  }

  limit(n: number): this {
    this.limitValue = n;
    return this;
  }

  build(): Query {
    if (!this.table) throw new Error("from() is required"); // validate at build time
    let sql = `SELECT ${this.columns.join(", ")} FROM ${this.table}`;
    if (this.wheres.length) sql += ` WHERE ${this.wheres.join(" AND ")}`;
    if (this.limitValue !== undefined) sql += ` LIMIT ${this.limitValue}`;
    return { sql, params: this.params };
  }
}

const { sql, params } = new SelectQueryBuilder()
  .select("id", "email")
  .from("users")
  .where("status = $1", "active")
  .limit(20)
  .build();
```

You've used this pattern already: `knex`, Prisma's fluent API, and `SELECT`-style query builders are all builders.

> 🔴 **Don't reuse a builder instance across builds.** Accumulated state leaks into the next object. Either `reset()` inside `build()` or — better — treat the builder as single-use and construct a new one each time.

**A type-level upgrade worth mentioning:** you can make the compiler enforce required steps.

```typescript
// `build()` only exists on Ready, so it's unreachable until `from()` is called.
class Start {
  from(table: string): Ready {
    return new Ready(table);
  }
}

class Ready {
  constructor(private readonly table: string) {}
  where(clause: string): Ready { /* … */ return this; }
  build(): Query { /* … */ return { sql: "", params: [] }; }
}

new Start().from("users").build(); // ✅ compiles
// new Start().build();            // ❌ Property 'build' does not exist on type 'Start'
```

## Prototype

### 💡 **Intent**

Create a new object by copying an existing one, instead of constructing it from scratch.

**Use it when construction is expensive or the source object's exact class is unknown** — a configured template, a parsed document, a fully-built config you want to vary slightly.

```typescript
interface RequestConfig {
  baseUrl: string;
  headers: Record<string, string>;
  retry: { attempts: number; backoffMs: number };
}

class ApiConfig {
  constructor(readonly config: RequestConfig) {}

  // Each `with*` returns a copy — the original is never mutated.
  with(patch: Partial<RequestConfig>): ApiConfig {
    return new ApiConfig({ ...this.config, ...patch });
  }

  clone(): ApiConfig {
    // structuredClone handles nesting, Dates, Maps, and cycles.
    return new ApiConfig(structuredClone(this.config));
  }
}

const base = new ApiConfig({
  baseUrl: "https://api.example.com",
  headers: { "Content-Type": "application/json" },
  retry: { attempts: 3, backoffMs: 200 },
});

const staging = base.with({ baseUrl: "https://staging.example.com" });
```

**Shallow vs deep is the whole interview question here:**

```typescript
const shallow = { ...base.config };
shallow.retry.attempts = 99;        // 🔴 base.config.retry mutated too — same object
const deep = structuredClone(base.config);
deep.retry.attempts = 99;           // ✅ base untouched
```

| Method | Depth | Watch out for |
| ------ | ----- | ------------- |
| `{ ...obj }` / `Object.assign` | Shallow | Nested objects are shared references |
| `structuredClone(obj)` | Deep | ✅ Handles cycles, `Date`, `Map`, `Set`. Throws on functions and class instances lose their prototype |
| `JSON.parse(JSON.stringify(obj))` | Deep | ❌ Destroys `Date`, `undefined`, `Map`; throws on cycles |
| A hand-written `clone()` | Deep, controlled | Most work, but you decide what's shared vs copied |

> ✨ **The React/immutability connection is worth naming.** Every `{ ...state, count: state.count + 1 }` is Prototype: copy-then-modify instead of mutate. That's why the pattern feels invisible in modern TypeScript — it's the default style, not a special technique.

## Interview Questions

**Q1: How do you implement a singleton in TypeScript, and should you?**

A module-level export — ES modules are evaluated once and cached, so `export const pool = new Pool(…)` *is* a singleton. Whether you should is the more interesting half: "one instance" is a valid lifecycle requirement, but reaching it through a global makes dependencies invisible and tests order-dependent. I create it once at startup and inject it, which keeps the single instance and drops the global coupling.

**Q2: Is singleton thread-safe in Node?**

The instantiation is, because JavaScript runs on one thread — no locking needed. The real hazard is asynchronous construction: two callers can both trigger `connect()` before either finishes. You fix it by caching the promise rather than the resolved instance. Worker threads are separate isolates, so each gets its own copy, which surprises people expecting shared state.

**Q3: Factory vs Abstract Factory?**

A factory produces one kind of product — `createGateway()` returns a `PaymentGateway`. An abstract factory produces a *matched family* — connection, query builder, and migrator that must all come from the same database vendor. Use the second only when mixing families is a real bug you need the type system to prevent; otherwise it's ceremony.

**Q4: Factory or Builder?**

Factory answers "which class", Builder answers "with what configuration". Factory is one call returning a finished object; Builder accumulates state across calls and validates at `build()`. If the object has many optional fields but arrives in one shot, TypeScript's answer is neither — use an options object with defaults.

**Q5: When is Builder actually worth it over an options object?**

When construction is incremental or conditional — you're adding `where` clauses in a loop, or the ergonomics of a chained DSL matter, as in a query builder. An options object is better whenever all inputs are available at once, because it's less code and the compiler already checks required fields.

**Q6: Shallow or deep clone?**

Shallow copies top-level properties and shares every nested reference, so mutating a nested field affects the original. `structuredClone` is the modern deep clone — it handles cycles, `Date`, `Map`, and `Set`, though it throws on functions and drops class prototypes. `JSON.parse(JSON.stringify(…))` is the old trick and it silently destroys `Date`, `undefined`, and `Map`.

**Q7: Which of these patterns are less relevant in TypeScript, and why?**

Singleton, because modules already provide it. Factory Method's class hierarchy, because a function returning an interface does the same job. Prototype as an explicit pattern, because spread-and-override is idiomatic already. What survives unchanged is Builder for fluent construction and Abstract Factory for genuine multi-family swaps — and being able to say *which* patterns the language absorbed is a better signal than being able to implement all five.

## Summary

**Checklist:**

- [ ] Singletons exist for lifecycle reasons, and are injected rather than reached globally
- [ ] Async singletons cache the promise, not the instance
- [ ] Factories return an interface; concrete classes are named in one file
- [ ] Factory `switch` statements end in a `never` exhaustiveness check
- [ ] Abstract Factory used only where a second family really exists
- [ ] Options objects preferred over builders unless construction is incremental
- [ ] Builders validate in `build()` and are not reused across builds
- [ ] Deep copies use `structuredClone`, not `JSON.parse(JSON.stringify(…))`

**Best practices:**

1. **Name the coupling you're removing** — if you can't, you don't need the pattern.
2. **Prefer the language feature** — module, function, options object, spread.
3. **One instance, injected** — the useful half of Singleton without the harmful half.
4. **Don't build for a second implementation that doesn't exist.**

---

[Design Patterns Index](./README.md) | [Structural Patterns →](./02-structural-patterns.md)
