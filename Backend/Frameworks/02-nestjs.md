---
title: NestJS
part: 5
chapter: 0
slug: nestjs
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [nestjs, dependency-injection, modules, backend, node]
in_book: true
---

# NestJS {#ch-nestjs}

> Explain what dependency injection actually buys a Node service, and where NestJS's structure earns its cost.

**In this chapter:** the container as the core idea · modules and providers · the request pipeline · what injection does for tests · when the structure is overhead

## 💡 The Core Idea

NestJS is Express (or Fastify) with a **dependency-injection container** bolted to the front and a
module system that decides what each part of the app is allowed to see.

The container is the whole point. In Express, a service that needs a database client imports it — so
the import graph is the wiring, and swapping the client in a test means intercepting the module
system. In NestJS a class **declares** what it needs in its constructor, and the container supplies
it. Nothing imports a concrete dependency, so nothing has to be intercepted to replace one.

The cost is a layer of indirection and a lot of decorators. Whether that trade pays depends almost
entirely on how many people work in the codebase, which is the answer an interviewer is after.

> ⚠️ **Moving target:** NestJS ships a major roughly yearly and each one moves something structural —
> the underlying Express or Fastify major, the decorator metadata story, the TypeScript baseline. The
> durable principle is the container: a class declares its dependencies and never constructs them, and
> that idea predates NestJS by twenty years.

## How It Works

### A module is a visibility boundary

A module declares what it owns and what it lets out. Anything not exported is private to the module,
and that is enforced at boot — not by convention.

```typescript
import { Module } from "@nestjs/common";

@Module({
  imports: [DatabaseModule], // what this module may use
  controllers: [OrdersController], // HTTP surface
  providers: [OrdersService, PricingService], // injectable classes, private by default
  exports: [OrdersService], // the only thing other modules can inject
})
export class OrdersModule {}
```

`PricingService` cannot be injected from outside `OrdersModule` because it is not exported. That is
the same boundary discipline as
[Chapter ?? — Frontend Architecture Patterns](#ch-frontend-architecture-patterns), moved to the server
and checked by the framework instead of by a lint rule.

### Providers declare their dependencies, and never construct them

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";

@Injectable()
export class OrdersService {
  // The container resolves both by type at boot. No imports of concrete instances.
  constructor(
    private readonly db: DatabaseClient,
    private readonly pricing: PricingService,
  ) {}

  async findOne(id: string): Promise<Order> {
    const order = await this.db.orders.findUnique({ where: { id } });
    if (!order) throw new NotFoundException(`order ${id}`);
    return order;
  }
}
```

Resolution is by **token**, and the token defaults to the class. When the dependency is an interface
rather than a class — the case that makes injection worth having — you name the token yourself:

```typescript
// The service depends on the interface; the module decides which implementation satisfies it.
export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");

@Module({
  providers: [{ provide: PAYMENT_GATEWAY, useClass: StripeGateway }],
})
export class PaymentsModule {}
```

Swap `useClass` for a sandbox implementation in staging, or `useValue` for a fake in a test, and no
consumer changes.

### The request pipeline has five named slots

Express gives you one concept — middleware. NestJS splits it into five, each with a defined position,
and the order is a standard interview question. A request travels down this table and back out through
the interceptors, which wrap the handler on both sides.

| Slot | Answers | Example |
| ---- | ------- | ------- |
| **Middleware** | Anything framework-agnostic | Request id, raw-body capture |
| **Guard** | May this caller proceed? | Roles, scopes, tenancy |
| **Interceptor** | What wraps the call, before and after? | Timing, caching, response mapping |
| **Pipe** | Is the input valid and the right type? | Schema validation, `ParseIntPipe` |
| **Exception filter** | How does a thrown error become a response? | The single error shape |

Guards run **before** pipes. So a guard sees the raw, unvalidated request — which means a guard must
never trust a body field, only the token and the route.

### Injection is what makes the tests cheap

This is the concrete payoff, and it is the strongest argument for the framework.

```typescript
import { Test } from "@nestjs/testing";

const moduleRef = await Test.createTestingModule({
  providers: [
    OrdersService,
    // Substitute the real client for a fake. No module mocking, no import interception.
    { provide: DatabaseClient, useValue: fakeDb },
  ],
}).compile();

const service = moduleRef.get(OrdersService);
```

Compare that to mocking a module in a test file: the fake is declared where it is used, it is typed
against the real interface, and nothing depends on the runtime's module resolution. That is the same
argument as [Chapter ?? — Testing a Node Service](#ch-testing-node-services) makes for plain constructor
injection — NestJS just makes it the default rather than a discipline.

## When to Use It

| Situation | Verdict |
| --------- | ------- |
| Several teams, 5+ domains, a service expected to live for years | ✅ The case it was built for |
| A team that already knows Angular's idioms | ✅ Same decorators, same container, near-zero ramp |
| Many cross-cutting concerns — authorisation, auditing, multi-tenancy | ✅ Guards and interceptors are exactly this |
| A backend-for-frontend with a dozen endpoints | ❌ Express. The structure has nothing to organise |
| An edge or worker runtime | ❌ Needs Node — [Chapter ?? — Edge Runtimes and Hono](#ch-edge-runtimes) |
| A team that has never used decorators or DI | ⚠️ Real ramp-up cost. Budget it honestly |

## Common Mistakes

❌ **Trusting the request body in a guard.** Guards run before pipes, so the body is unvalidated.
✅ Guards decide on the token and the route; validation happens in a pipe.

❌ **One giant `AppModule`.** Everything is a provider of everything, so the module system enforces no
boundary at all.
✅ A module per domain, exporting only its service.

❌ **Business logic in the controller.** The controller then cannot be tested without HTTP, and the
logic cannot be reused by a job or a queue consumer.
✅ Controllers translate HTTP to a service call and back. Nothing else.

❌ **Request-scoped providers by default.** A request-scoped provider forces everything that injects
it to be instantiated per request, which is a measurable throughput cost.
✅ Default to singleton scope; use request scope only where per-request state genuinely lives.

❌ **Choosing NestJS for a small service because it is "more professional".** The decorators and
modules are overhead until there is something to organise.
✅ Pick it for the size of the team and the lifetime of the service, not for the look of the code.

## 🔑 Key Takeaways

- NestJS is a dependency-injection container plus a module system on top of an HTTP framework.
- A module's `exports` list is an enforced visibility boundary, not documentation.
- Depending on a token rather than a concrete class is what makes implementations swappable.
- The pipeline order is middleware, guards, interceptors, pipes, handler, filters — and guards see unvalidated input.
- The structure pays off with team size and service lifetime, and is pure overhead below that.

## Interview Questions

**Q: What does dependency injection actually give you that importing a module does not?**

Substitution without touching the module system. When a class receives its database client through the
constructor, a test provides a fake by passing a different object, and staging provides a different
implementation by changing one provider entry. With direct imports the import graph *is* the wiring,
so replacing anything means intercepting module resolution — which is fragile and has to be repeated
in every test file.

**Q: A guard needs to check that the user owns the order in the request body. Is that fine?**

No, because guards run before pipes, so the body has not been validated or transformed yet. Ownership
checks that depend on request data belong in the service, where the input is already validated and the
record has been loaded. Guards should decide on the token, the roles and the route — things that do
not require trusting the payload.

**Q: When is NestJS the wrong choice?**

When there is nothing for the structure to organise. A backend-for-frontend with a dozen endpoints
gets decorators, modules and a container in exchange for organising almost nothing, and every new
contributor pays the ramp-up. It is also wrong when the deployment target is not Node, since it
assumes Node's HTTP layer.

**Q: What is the cost of the abstraction?**

Indirection at debug time — the stack trace runs through the container rather than from caller to
callee — and a real learning curve for anyone who has not used decorator-based DI. There is also a
startup cost as the container resolves the graph, which matters if the service is deployed as a
short-lived function.

## What to Read Next

- [Chapter ?? — Express](#ch-express) — the pipeline NestJS wraps, and the baseline it is compared against
- [Chapter ?? — Testing a Node Service](#ch-testing-node-services) — why constructor injection is the testing argument
- [Chapter ?? — Authorisation](#ch-authorisation) — the models a guard is enforcing
