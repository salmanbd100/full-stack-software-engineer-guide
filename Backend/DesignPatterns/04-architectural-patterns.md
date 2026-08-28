---
title: Architectural Patterns
part: 1
chapter: 0
slug: architectural-patterns
level: advanced # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-28
tags: [backend, design, patterns, architectural]
in_book: true
---

# Architectural Patterns {#ch-architectural-patterns}

> Draw the layers of a service so a change lands in one place rather than five.

**In this chapter:** the standard layering · repository · service layer · dependency injection · unit of work · MVC and its backend variants

## Overview

GoF patterns organise a few classes. Architectural patterns organise a whole application: where the business rules live, what may import what, and how a request travels from HTTP to the database and back.

For a backend interview these matter more than the classic patterns, because "how would you structure this service?" is a question you will actually be asked.

> **The single idea underneath all of them:** dependencies point inward. Controllers know about services, services know about repositories, and the domain knows about nothing. When a rule sits at the centre with no framework or driver imports, it stays testable and portable for years.

## Table of Contents

- [The Standard Layering](#the-standard-layering)
- [Repository](#repository)
- [Service Layer](#service-layer)
- [Dependency Injection](#dependency-injection)
- [Unit of Work](#unit-of-work)
- [MVC and Its Backend Variants](#mvc-and-its-backend-variants)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## The Standard Layering

```text
HTTP request
     │
     ▼
┌──────────────────┐  parse, validate, map to a DTO. No business rules.
│   Controller     │
└────────┬─────────┘
         ▼
┌──────────────────┐  the use case: orchestration, transactions, authorization
│  Service         │
└────────┬─────────┘
         ▼
┌──────────────────┐  persistence only. No business rules.
│  Repository      │
└────────┬─────────┘
         ▼
   Database / external APIs

        Domain entities and pure rules sit in the middle,
        imported by services — importing nothing themselves.
```

| Layer | Owns | Must never |
| ----- | ---- | ---------- |
| **Controller** | HTTP shape: status codes, validation, serialization | Contain business rules or SQL |
| **Service** | The use case, transaction boundary, authorization | Know about `req` / `res` |
| **Repository** | Queries and mapping rows to entities | Decide *whether* an action is allowed |
| **Domain** | Invariants and calculations | Import a framework or a driver |

🔴 **The most common failure is the anaemic service** — a service whose methods are one-line passthroughs to a repository. If every service method is `return this.repo.findAll()`, the layer is pure ceremony. Either the business rules belong there and are currently in the controller, or you don't need the layer.

## Repository

### 💡 **Intent**

Give the rest of the application a collection-like interface for stored objects, so no business code contains a query.

```typescript
// ── The interface lives with the domain, not with the database code ──
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findPendingOlderThan(date: Date): Promise<Order[]>; // ✅ a domain question
  save(order: Order): Promise<void>;
  delete(id: string): Promise<void>;
}

// ── One implementation per data source ────────────────────────────
class SqlOrderRepository implements OrderRepository {
  constructor(private readonly db: Pool) {}

  async findById(id: string): Promise<Order | null> {
    const { rows } = await this.db.query("SELECT * FROM orders WHERE id = $1", [id]);
    return rows[0] ? this.toDomain(rows[0]) : null; // rows never escape this class
  }

  async findPendingOlderThan(date: Date): Promise<Order[]> {
    const { rows } = await this.db.query(
      "SELECT * FROM orders WHERE status = 'pending' AND created_at < $1",
      [date],
    );
    return rows.map((row) => this.toDomain(row));
  }

  async save(order: Order): Promise<void> { /* upsert */ }
  async delete(id: string): Promise<void> { /* … */ }

  /** Mapping is the repository's job — the domain shouldn't know about snake_case. */
  private toDomain(row: OrderRow): Order {
    return new Order(row.id, row.status, row.total_cents, new Date(row.created_at));
  }
}
```

**Why the interface earns its place:**

- ✅ Services are unit-testable with an in-memory implementation — no database, no container.
- ✅ Queries live in one file per aggregate instead of scattered across controllers.
- ✅ Swapping Postgres for Mongo touches one class.

**Design it around domain questions, not around SQL.** `findPendingOlderThan(date)` says something about your business. `query(sql, params)` is a database handle wearing a costume.

> ⚠️ **The leaky-abstraction trap.** The moment a method takes a `WHERE` fragment or returns a driver-specific cursor, the abstraction is gone and you have all the indirection with none of the benefit. Keep the interface expressed in domain terms only.

**The honest counter-argument:** an ORM like Prisma or TypeORM already *is* a repository — typed, mapped, testable. Wrapping it in another repository can be pure duplication. The case for wrapping anyway: complex query logic gets a name and a home, and your services stay free of ORM types. Being able to argue both sides is the senior answer.

## Service Layer

### 💡 **Intent**

Hold the use cases — the operations your application actually offers, independent of how they're triggered.

```typescript
class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly inventory: InventoryRepository,
    private readonly payments: PaymentGateway,
    private readonly events: EventBus,
  ) {}

  /** One use case. Callable from HTTP, a queue worker, or a CLI script. */
  async placeOrder(command: PlaceOrderCommand): Promise<Order> {
    // 1. Authorization — a business rule, not an HTTP concern.
    if (!command.actor.can("order:create")) throw new ForbiddenError();

    // 2. Invariants live in the domain object, not here.
    const order = Order.draft(command.actor.id, command.items);
    order.assertWithinCreditLimit(command.actor.creditLimitCents);

    // 3. Orchestration across several collaborators.
    await this.inventory.reserve(order.items);
    const charge = await this.payments.charge(command.token, order.totalCents);
    order.markPaid(charge.id);

    await this.orders.save(order);

    // 4. Side effects announced, not performed here.
    await this.events.emit("order.placed", { orderId: order.id });
    return order;
  }
}
```

The controller shrinks to translation:

```typescript
app.post("/orders", async (req, res, next) => {
  try {
    const command = PlaceOrderSchema.parse(req.body); // validation is an HTTP concern
    const order = await orderService.placeOrder({ ...command, actor: req.user! });
    res.status(201).json(OrderPresenter.toJson(order)); // serialization too
  } catch (err) {
    next(err); // one error handler maps domain errors to status codes
  }
});
```

**The test that proves the layering is right:** you can call `placeOrder` from a queue consumer without touching Express. If you can't, HTTP has leaked into the business logic.

**Service vs Repository:**

| | Service | Repository |
| --- | --- | --- |
| Answers | "What should happen?" | "Where is the data?" |
| Talks to | Repositories, gateways, other services | One data source |
| Contains | Rules, orchestration, transactions | Queries and mapping |
| Granularity | One method per use case | One class per aggregate |

## Dependency Injection

### 💡 **Intent**

Give an object its collaborators from outside instead of letting it construct them.

```typescript
// ❌ Constructs its own dependencies: untestable, unswappable.
class OrderService {
  private readonly orders = new SqlOrderRepository(globalPool);
  private readonly payments = new StripeGateway(process.env.STRIPE_KEY!);
}

// ✅ Receives them: honest signature, trivially faked.
class OrderService {
  constructor(
    private readonly orders: OrderRepository, // an interface, not a class
    private readonly payments: PaymentGateway,
  ) {}
}
```

**The point isn't the container.** It's that the class declares what it needs and depends on an *interface* — which is Dependency Inversion from [SOLID](./05-solid-principles.md#dependency-inversion-dip).

```typescript
// Testing becomes ordinary code, with no mocking framework.
const fakeOrders: OrderRepository = {
  findById: async () => null,
  findPendingOlderThan: async () => [],
  save: async () => {},
  delete: async () => {},
};

const service = new OrderService(fakeOrders, fakePayments);
```

**Manual wiring at a composition root is enough for most services:**

```typescript
// container.ts — the one place that knows every concrete class.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const orders = new SqlOrderRepository(pool);
const payments = new StripeGateway(process.env.STRIPE_KEY!);

export const orderService = new OrderService(orders, payments, events);
```

> ✨ **Manual wiring is underrated.** No decorators, no reflection, no framework magic — and the compiler catches a missing dependency. Reach for a container (NestJS, tsyringe, Awilix) when you have dozens of services with lifetimes to manage: singleton, per-request, transient.

**Three forms, and when each fits:**

| Form | Use when |
| ---- | -------- |
| **Constructor** | ✅ The default. The object cannot exist half-configured |
| **Method / parameter** | The dependency varies per call — a request-scoped logger |
| **Property setter** | Rarely. Allows a partially-constructed object; avoid |

⚠️ **DI is not a service locator.** Passing a container into a class so it can pull dependencies out reintroduces exactly the hidden coupling DI removes. Inject the dependency, never the container.

## Unit of Work

### 💡 **Intent**

Treat a set of changes as one atomic transaction, so several repository calls commit or roll back together.

**The problem:**

```typescript
// ❌ Three separate transactions. A crash between them leaves inconsistent data.
await orders.save(order);
await inventory.decrement(items);   // if this throws, the order is already saved
await ledger.record(payment);
```

```typescript
interface UnitOfWork {
  /** Runs the callback inside one transaction, with transaction-scoped repositories. */
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}

interface Repositories {
  orders: OrderRepository;
  inventory: InventoryRepository;
  ledger: LedgerRepository;
}

class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      // ✅ Every repository shares the same client — so they share the transaction.
      const result = await work({
        orders: new SqlOrderRepository(client),
        inventory: new SqlInventoryRepository(client),
        ledger: new SqlLedgerRepository(client),
      });
      await client.query("COMMIT");
      return result;
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release(); // 🔴 never skip this — leaked clients exhaust the pool
    }
  }
}

// Usage — all or nothing.
await uow.run(async ({ orders, inventory, ledger }) => {
  await orders.save(order);
  await inventory.decrement(order.items);
  await ledger.record(payment);
});
```

**The detail that makes or breaks it:** every repository in the callback must use the *same* connection. A repository holding its own pool handle silently runs outside the transaction — the classic bug in hand-rolled implementations.

> ⚠️ **Transactions don't reach across services.** A rollback cannot un-charge a card or un-send an email. For work spanning multiple systems you need sagas with compensating actions — the distributed-systems answer, not the database one.

Prisma's `$transaction` and TypeORM's `EntityManager` implement this for you; know the pattern so you can explain what those APIs are doing.

## MVC and Its Backend Variants

Classic MVC came from desktop UIs, where the view observes the model directly. A JSON API has no view in that sense, so what you actually build is:

```text
Request → Controller → Service → Repository → Model/Entity
                          │
                          ▼
                     Presenter / DTO → JSON response
```

| Variant | Where it fits |
| ------- | ------------- |
| **MVC** | Server-rendered pages (Rails, Django, Laravel) |
| **MVVM** | Client frameworks with two-way binding |
| **Layered / Clean / Hexagonal** | The realistic model for a modern API |

**What's worth remembering from Clean Architecture** isn't the diagram — it's the rule about direction. Business rules at the centre; frameworks, drivers, and HTTP at the edges; dependencies always pointing inward. A domain rule that imports Express is a rule you cannot reuse or test cheaply.

**Presenters (DTOs) matter more than they look.** Returning an entity straight from a controller means a new database column silently becomes a public API field — and one day that column is `password_hash`. An explicit mapping makes the API surface a deliberate choice.

```typescript
// The response shape is decided here, not by the database schema.
const OrderPresenter = {
  toJson: (order: Order) => ({
    id: order.id,
    status: order.status,
    total: { amount: order.totalCents, currency: "GBP" },
    // internalNotes deliberately omitted
  }),
};
```

## Interview Questions

**Q1: Why use a Repository if you already have an ORM?**

The honest answer is that you often shouldn't — Prisma or TypeORM already gives you a typed, mapped data-access layer, and wrapping it adds indirection for nothing. I add a repository when complex query logic deserves a domain name and a single home, or when I want services free of ORM types so they're testable with a plain object. What I never do is let a repository leak query fragments; at that point it's a database handle in disguise.

**Q2: What actually belongs in a service?**

The use case: authorization, orchestration across repositories and external gateways, and the transaction boundary. What does *not* belong is HTTP — no `req`, no `res`, no status codes — and no invariant that the entity itself should enforce. The test is whether a queue worker can call the same method with no adaptation.

**Q3: How do you know your layering is wrong?**

Passthrough services whose every method just calls one repository method, controllers containing business rules, and repositories deciding whether an action is permitted. Any of those means the layer boundary is decorative. The other tell is needing a running database to unit-test a business rule.

**Q4: Do you need a DI container?**

Usually not. Manual wiring in a composition root is explicit, type-checked, and has zero framework magic. A container is worth it once you have dozens of services with real lifetime requirements — singleton versus per-request versus transient — which is why NestJS ships one. What matters either way is depending on interfaces and injecting through the constructor; the container is an implementation detail of the wiring.

**Q5: How do you make several repository writes atomic?**

Unit of Work: open one transaction, construct repositories over that same connection, run the work in a callback, then commit or roll back. The subtle failure is a repository holding its own pool connection, so it quietly runs outside the transaction. And transactions stop at the database — for work spanning a payment provider and a database, I need a saga with compensating actions instead.

**Q6: Should a controller return the entity?**

No. An explicit presenter or DTO decides the response shape, so adding a database column doesn't silently expose a field — which is how internal notes and password hashes end up in public APIs. It also lets the API stay stable while the schema changes underneath, which is what makes additive [versioning](../API/03-versioning.md) possible.

**Q7: Is this layering overkill for a small service?**

Sometimes. For a genuinely small CRUD service, controller plus repository with no service layer is honest, and adding empty layers is worse than having none. What I keep regardless of size: no SQL in controllers, a DTO on the way out, and dependencies injected — because those three are what make the code testable, and they cost almost nothing to start with.

## Summary

**Checklist:**

- [ ] Dependencies point inward; the domain imports no framework
- [ ] Controllers only validate, delegate, and serialize
- [ ] Services own authorization, orchestration, and transaction boundaries
- [ ] Services are callable from a queue worker with no HTTP objects
- [ ] Repository interfaces are expressed in domain terms, never query fragments
- [ ] Entities own their invariants — services don't re-implement them
- [ ] Constructor injection against interfaces; container injected nowhere
- [ ] One composition root that knows the concrete classes
- [ ] Multi-write operations share one transaction via Unit of Work
- [ ] Cross-service consistency handled with compensating actions, not transactions
- [ ] Responses shaped by an explicit presenter, never a raw entity

**Best practices:**

1. **Dependencies point inward** — the one rule that survives every framework change.
2. **A layer with no logic is not a layer** — delete it or move the rules into it.
3. **Wire manually until it hurts** — then reach for a container.
4. **Never serialize an entity** — the response shape is a deliberate decision.

---

[← Behavioral Patterns](./03-behavioral-patterns.md) | [Design Patterns Index](./README.md) | [SOLID Principles →](./05-solid-principles.md)
