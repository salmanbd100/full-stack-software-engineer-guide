---
title: Architectural Patterns
part: 1
chapter: 0
slug: architectural-patterns
level: advanced # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-29
tags: [backend, design, patterns, architectural]
in_book: true
---

# Architectural Patterns {#ch-architectural-patterns}

> Draw the layers of a service so a change lands in one place rather than five.

**In this chapter:** the standard layering · repository · service layer · the composition root · unit of work · MVC and its backend variants

## 💡 The Core Idea

GoF patterns organise a few classes. Architectural patterns organise a whole application: where the business rules live, what may import what, and how a request travels from HTTP to the database and back. For a backend interview they matter more than the classic patterns, because "how would you structure this service?" is a question you will actually be asked.

> **The single idea underneath all of them:** dependencies point inward. Controllers know about services, services know about repositories, and the domain knows about nothing. When a rule sits at the centre with no framework or driver imports, it stays testable and portable for years.

## The Standard Layering

A request travels `HTTP → Controller → Service → Repository → Database`, with domain entities and pure
rules in the middle, imported by services and importing nothing themselves.

| Layer | Owns | Must never |
| ----- | ---- | ---------- |
| **Controller** | HTTP shape: status codes, validation, serialisation | Contain business rules or SQL |
| **Service** | The use case, transaction boundary, authorisation | Know about `req` / `res` |
| **Repository** | Queries and mapping rows to entities | Decide *whether* an action is allowed |
| **Domain** | Invariants and calculations | Import a framework or a driver |

⚠️ **The most common failure is the anaemic service** — a service whose methods are one-line passthroughs to a repository. If every service method is `return this.repo.findAll()`, the layer is pure ceremony. Either the business rules belong there and are currently in the controller, or you don't need the layer.

## Repository

Give the rest of the application a collection-like interface for stored objects, so no business code contains a query.

```typescript
// The interface lives with the domain, not with the database code.
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  findPendingOlderThan(date: Date): Promise<Order[]>; // ✅ a domain question
  save(order: Order): Promise<void>;
}

class SqlOrderRepository implements OrderRepository {
  constructor(private readonly db: Pool) {}

  async findById(id: string): Promise<Order | null> {
    const { rows } = await this.db.query('SELECT * FROM orders WHERE id = $1', [id]);
    return rows[0] ? this.toDomain(rows[0]) : null; // rows never escape this class
  }

  /** Mapping is the repository's job — the domain never sees snake_case. */
  private toDomain(row: OrderRow): Order {
    return new Order(row.id, row.status, row.total_cents, new Date(row.created_at));
  }
}
```

The interface earns its place three ways: services become unit-testable against an in-memory implementation with no database, queries live in one file per aggregate rather than scattered across controllers, and swapping Postgres for Mongo touches one class. **Design it around domain questions, not SQL** — `findPendingOlderThan(date)` says something about your business; `query(sql, params)` is a database handle wearing a costume.

> ⚠️ **The leaky-abstraction trap.** The moment a method takes a `WHERE` fragment or returns a driver-specific cursor, the abstraction is gone and you have all the indirection with none of the benefit. Keep the interface expressed in domain terms only.

**The honest counter-argument:** an ORM like Prisma or TypeORM already *is* a repository — typed, mapped, testable. Wrapping it in another repository can be pure duplication. The case for wrapping anyway: complex query logic gets a name and a home, and your services stay free of ORM types. Being able to argue both sides is the senior answer.

## Service Layer

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
    if (!command.actor.can('order:create')) throw new ForbiddenError(); // a business rule

    const order = Order.draft(command.actor.id, command.items);
    order.assertWithinCreditLimit(command.actor.creditLimitCents); // invariants live in the domain

    await this.inventory.reserve(order.items);
    const charge = await this.payments.charge(command.token, order.totalCents);
    order.markPaid(charge.id);
    await this.orders.save(order);

    await this.events.emit('order.placed', { orderId: order.id }); // announced, not performed
    return order;
  }
}
```

The controller shrinks to translation: parse the body with a schema, call the service, hand the result to a presenter, and pass errors to one handler that maps domain errors to status codes.

**The test that proves the layering is right:** you can call `placeOrder` from a queue consumer without touching Express. If you cannot, HTTP has leaked into the business logic.

## The Composition Root

Every layer above depends on interfaces, which leaves one question: who constructs the concrete
classes? The answer should be exactly one place — the composition root — and it should be the only
file that knows a repository is backed by Postgres.

```typescript
// container.ts — the one module that names concrete classes.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const orders = new SqlOrderRepository(pool);
const payments = new StripeGateway(process.env.STRIPE_KEY!);

export const orderService = new OrderService(orders, payments);
```

Manual wiring like this is underrated: no decorators, no reflection, no framework magic, and the compiler catches a missing dependency at the call site. Reach for a container — NestJS, tsyringe, Awilix — when dozens of services need lifetimes managed. The mechanics of injection are in [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance).

> ⚠️ **Injecting the container is not dependency injection.** A class calling `container.get('db')` has
> hidden its dependencies again, and the constructor no longer says what it needs.

## Unit of Work

Treat a set of changes as one atomic transaction, so several repository calls commit or roll back together.

Three sequential repository calls are three separate transactions: if the second throws, the first is already committed and the data is inconsistent.

```typescript
// `run` takes a callback and hands it transaction-scoped repositories.
class PostgresUnitOfWork implements UnitOfWork {
  constructor(private readonly pool: Pool) {}

  async run<T>(work: (repos: Repositories) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      // ✅ Every repository shares the same client, so they share the transaction.
      const result = await work({
        orders: new SqlOrderRepository(client),
        inventory: new SqlInventoryRepository(client),
        ledger: new SqlLedgerRepository(client),
      });
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release(); // never skip this — leaked clients exhaust the pool
    }
  }
}

// Usage — all or nothing.
await uow.run(async ({ orders, ledger }) => {
  await orders.save(order);
  await ledger.record(payment);
});
```

**The detail that makes or breaks it:** every repository in the callback must use the *same* connection. A repository holding its own pool handle silently runs outside the transaction — the classic hand-rolled bug. Prisma's `$transaction` and TypeORM's `EntityManager` do this for you; know the pattern so you can say what those APIs are doing.

> ⚠️ **Transactions don't reach across services.** A rollback cannot un-charge a card or un-send an email. For work spanning multiple systems you need sagas with compensating actions — the distributed-systems answer, not the database one.

## MVC and Its Backend Variants

Classic MVC came from desktop UIs, where the view observes the model directly. A JSON API has no view in that sense, so what you actually build is `Request → Controller → Service → Repository → Entity`, with a presenter turning the entity into the response.

**What is worth remembering from Clean Architecture** is not the diagram but the rule about direction: business rules at the centre, frameworks and HTTP at the edges, dependencies always pointing inward. A domain rule that imports Express is a rule you cannot reuse or test cheaply.

**Presenters matter more than they look.** Returning an entity straight from a controller means a new database column silently becomes a public API field — and one day that column is `password_hash`. An explicit mapping makes the API surface a deliberate choice.

A presenter is a plain object with a `toJson(order)` that names each field it exposes — and omits, say,
`internalNotes`, because the response shape is decided there rather than by the schema.

## 🔑 Key Takeaways

- Dependencies point inward: controllers know services, services know repositories, and the domain imports no framework.
- A repository speaks in domain terms; the moment its interface leaks query fragments, the layer has stopped protecting anything.
- A service whose methods are one-line passthroughs is ceremony — either the rules belong there and are currently in the controller, or the layer should go.
- One composition root names the concrete classes, and nothing else does.
- Never serialise an entity straight to the client; an explicit presenter is what stops a new column becoming a new public field.

## Interview Questions

**Q: Why use a Repository if you already have an ORM?**

The honest answer is that you often shouldn't — Prisma or TypeORM already gives you a typed, mapped data-access layer, and wrapping it adds indirection for nothing. I add a repository when complex query logic deserves a domain name and a single home, or when I want services free of ORM types so they're testable with a plain object. What I never do is let a repository leak query fragments; at that point it's a database handle in disguise.

**Q: What actually belongs in a service?**

The use case: authorization, orchestration across repositories and external gateways, and the transaction boundary. What does *not* belong is HTTP — no `req`, no `res`, no status codes — and no invariant that the entity itself should enforce. The test is whether a queue worker can call the same method with no adaptation.

**Q: How do you know your layering is wrong?**

Passthrough services whose every method just calls one repository method, controllers containing business rules, and repositories deciding whether an action is permitted. Any of those means the layer boundary is decorative. The other tell is needing a running database to unit-test a business rule.

**Q: Is this layering overkill for a small service?**

Sometimes. For a genuinely small CRUD service, controller plus repository with no service layer is honest, and adding empty layers is worse than having none. What I keep regardless of size: no SQL in controllers, a DTO on the way out, and dependencies injected — because those three are what make the code testable, and they cost almost nothing to start with.

## What to Read Next

- [Chapter ?? — SOLID Principles](#ch-solid-principles) — the principle behind "dependencies point inward"
- [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript) — the smaller shapes these layers are built from
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — what the controller layer is actually for
