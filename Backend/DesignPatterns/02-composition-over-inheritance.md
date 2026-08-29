---
title: Composition over Inheritance
part: 1
chapter: 0
slug: composition-over-inheritance
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-29
tags: [oop, composition, dependency-injection, mixins, typescript]
in_book: true
---

# Composition over Inheritance {#ch-composition-over-inheritance}

> Say why the hierarchy stops working at the fourth level, and show the three shapes that replace it.

**In this chapter:** what deep hierarchies cost · has-a instead of is-a · dependency injection · mixins · when inheritance is still right

## 💡 The Core Idea

Inheritance couples a subclass to everything its ancestors do, including the parts it never wanted.
Composition couples an object only to the interfaces it asks for. The advice to prefer composition is
not aesthetic — it is about which changes are safe.

The tell is always the same. A hierarchy is fine while every subclass genuinely needs everything above
it. It breaks the first time someone overrides a method to do nothing, or adds a class whose only job
is to sit between two others. At that point the hierarchy is modelling the code's history rather than
the problem.

## What a Deep Hierarchy Costs

```typescript
// ❌ Four levels, and the fourth one has to break the contract.
class Employee { work(): void {} }
class Manager extends Employee { approve(): void {} }
class RegionalManager extends Manager { setBudget(): void {} }

class ContractRegionalManager extends RegionalManager {
  // Contractors cannot approve. The only way out is to break the base class's promise.
  approve(): never {
    throw new Error("Contractors cannot approve");
  }
}
```

That override is a Liskov violation, and it is not a style problem: any code holding a `Manager` can
now throw for reasons it cannot see. Three specific costs follow from a hierarchy like this.

| Cost | What it looks like in practice |
| --- | --- |
| **Fragile base class** | A change in `Employee` breaks classes its author has never opened |
| **Behaviour is hard to locate** | "Where does `work` actually run?" needs four files |
| **One axis only** | A class inherits from one parent, so a second dimension needs a combinatorial explosion of subclasses |

That last one is the killer in real systems. Employees vary by role *and* by contract type *and* by
region. Modelling three independent axes with single inheritance needs a class per combination.

## Has-a Instead of Is-a

Composition models each axis as its own thing and gives the object the ones it needs.

```typescript
interface ApprovalRights {
  canApprove(amount: number): boolean;
}

interface BudgetControl {
  limit: number;
}

const noApproval: ApprovalRights = { canApprove: () => false };
const managerApproval: ApprovalRights = { canApprove: (amount) => amount <= 10_000 };

class Staff {
  constructor(
    public readonly name: string,
    private readonly approval: ApprovalRights,
    private readonly budget?: BudgetControl,
  ) {}

  approve(amount: number): boolean {
    return this.approval.canApprove(amount) && amount <= (this.budget?.limit ?? 0);
  }
}

// Any combination, without a class per combination.
const contractor = new Staff("Priya", noApproval);
const regional = new Staff("Tom", managerApproval, { limit: 50_000 });
```

The behaviour is now a value. It can be swapped at runtime, tested on its own, and reused by anything
that needs it — three things a superclass cannot offer.

## Dependency Injection Is Composition with a Rule

Dependency injection is composition applied to a class's collaborators: the class declares what it
needs and is handed it, rather than constructing it.

```typescript
interface ReportStore {
  findById(id: string): Promise<Report | null>;
}

interface Clock {
  now(): Date;
}

class ReportService {
  // The service depends on two interfaces, not on Postgres and not on the system clock.
  constructor(
    private readonly store: ReportStore,
    private readonly clock: Clock,
  ) {}

  async isStale(id: string): Promise<boolean> {
    const report = await this.store.findById(id);
    if (!report) return false;
    return this.clock.now().getTime() - report.updatedAt.getTime() > 86_400_000;
  }
}
```

The testing consequence is the whole argument. If `ReportService` constructed its own database client
and called `new Date()`, testing "is a report stale after a day?" would need a database and a way to
travel in time. With both injected, the test is two object literals — and because TypeScript is
structurally typed, those literals need no class and no mocking library.

> ⚠️ **Injecting everything is its own smell.** A constructor with nine dependencies is telling you the
> class does nine things. Fix the class, not the wiring.

## Mixins and Functions

Two lighter shapes cover most of what people reach for multiple inheritance to do.

**A mixin** adds behaviour to a class without a hierarchy:

```typescript
type Constructor<T = {}> = new (...args: any[]) => T;

function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    readonly createdAt = new Date();
  };
}

class Document {}
class TrackedDocument extends Timestamped(Document) {}
```

Mixins are worth knowing, and worth reaching for rarely — the types get awkward and the resulting
class is hard to search for. In most codebases a field holding a collaborator is clearer.

**A higher-order function** is composition for behaviour that has no state:

```typescript
type Handler = (req: Request) => Promise<Response>;

const withLogging = (next: Handler): Handler => async (req) => {
  const started = performance.now();
  const res = await next(req);
  logger.info({ path: req.url, ms: performance.now() - started });
  return res;
};

const withAuth = (next: Handler): Handler => async (req) =>
  req.headers.get("authorization") ? next(req) : new Response(null, { status: 401 });

const handler = withAuth(withLogging(getReport));
```

This is the decorator pattern with no classes in it, and it is how most TypeScript codebases actually
layer cross-cutting behaviour.

## When to Use It

| Situation | Choose | Why |
| --- | --- | --- |
| Genuine "is a", stable, one or two levels | Inheritance | The shared code is real and unlikely to fork |
| A fixed algorithm with one varying step | Inheritance (template method) | The sequence itself is the shared thing |
| Behaviour varies on more than one axis | Composition | Single inheritance cannot express two axes |
| The behaviour should change at runtime | Composition | You can swap a field; you cannot swap a superclass |
| You need to test the unit in isolation | Composition | Collaborators arrive as arguments |
| A subclass would override a method to do nothing | Composition | That override is a Liskov violation waiting to be found |

Inheritance is not banned. Framework base classes, abstract classes with a genuine template method,
and error hierarchies (`class NotFoundError extends HttpError`) are all reasonable. The rule is that
inheritance should be the answer to "these things share behaviour", never to "these things share
some fields".

## Common Mistakes

❌ **Inheriting to reuse a helper method.** The subclass now carries the parent's entire surface.
✅ Extract the helper into a module or an injected collaborator.

❌ **Interfaces for everything, immediately.** One implementation and an interface is indirection.
✅ Introduce the interface at the second implementation, or when it is what makes the test possible.

❌ **A service locator instead of injection.** A class that calls `container.get("db")` still hides its
dependencies; the constructor no longer tells you what it needs.
✅ Take the dependency as a parameter, so the type signature is the documentation.

## 🔑 Key Takeaways

- Inheritance couples a subclass to everything above it; composition couples an object only to the interfaces it asks for.
- The hierarchy breaks when behaviour varies on more than one axis, because a class has exactly one parent.
- Dependency injection is composition applied to collaborators, and its real payoff is that the unit becomes testable without infrastructure.
- Structural typing makes composition cheap in TypeScript: a test double is an object literal, not a class.
- Keep inheritance for genuine "is a" relationships, framework base classes, and template methods — and stop at two levels.

## Interview Questions

**Q: "Favour composition over inheritance" — why?**

Because inheritance couples you to everything the ancestors do, and most of the time you wanted one
piece of behaviour rather than the whole surface. Composition names the piece, makes it swappable at
runtime, and keeps each part independently testable. Inheritance still wins where the relationship is
genuinely "is a" and the shared code is a stable algorithm.

**Q: Show me a case where inheritance is the right call.**

A template method: a fixed sequence of steps where one step varies — validate, then deliver, where
only delivery differs per channel. The shared thing is the *sequence*, which an interface cannot
express and composition would duplicate in every implementation. Framework base classes and error
hierarchies are the other two honest cases.

**Q: What is the practical difference dependency injection makes?**

Testability, mainly. A class that constructs its own database client cannot be tested without one; a
class that takes a `ReportStore` can be tested with an object literal. It also makes the dependencies
visible in the constructor signature, which is the part a service locator throws away.

**Q: When is composition the wrong choice?**

When it produces indirection with no second implementation — an interface, a factory and a wiring
module to reach one class. And when the collaborator count grows past a handful, because that usually
means the class has too many responsibilities and the fix is to split it rather than to inject more.

## What to Read Next

- [Chapter ?? — SOLID Principles](#ch-solid-principles) — dependency inversion and Liskov, stated as rules
- [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript) — strategy and decorator, which are composition with names
- [Chapter ?? — Architectural Patterns](#ch-architectural-patterns) — the same idea at the scale of a service
