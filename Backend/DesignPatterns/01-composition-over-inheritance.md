---
title: OOP and Composition over Inheritance
part: 1
chapter: 16
slug: composition-over-inheritance
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-24
tags: [oop, encapsulation, polymorphism, composition, dependency-injection, typescript]
in_book: true
---

# OOP and Composition over Inheritance {#ch-composition-over-inheritance}

> Explain the four pillars by what they cost, say why a hierarchy stops working at the fourth level, and show the shapes that replace it.

**In this chapter:** state plus the rules about it · `private` vs `#` · structural polymorphism · what deep hierarchies cost · has-a, dependency injection and higher-order functions

## 💡 The Core Idea

Object-oriented programming answers one question: **where does state live, and who may change it?**
An object answers "here, and only through these methods". Encapsulation, inheritance, polymorphism
and abstraction all follow from that answer.

Inheritance is the pillar that goes wrong. It couples a subclass to everything its ancestors do,
including the parts it never wanted. Composition couples an object only to the interfaces it asks
for. "Prefer composition" is not about taste. It is about which changes stay safe.

## How It Works

### Objects are state plus the rules about it

```typescript
class Report {
  private readonly audit: { at: Date; action: string }[] = [];

  // Parameter properties declare and assign a field in one place
  constructor(
    public readonly id: string,
    private title: string,
  ) {}

  rename(next: string, by: string): void {
    if (next.trim().length === 0) throw new Error('Title cannot be empty');
    this.title = next;
    this.audit.push({ at: new Date(), action: `renamed by ${by}` });
  }
}
```

The rule "a title is never empty" sits beside the field it protects, so no caller can break it. The
audit trail cannot be forgotten, because the only way to change the title also records the change.

### What `private` actually means

| Modifier           | Enforced by                | Visible to                   |
| ------------------ | -------------------------- | ---------------------------- |
| `public` (default) | —                          | Everyone                     |
| `protected`        | The compiler               | The class and its subclasses |
| `private`          | **The compiler only**      | The class                    |
| `#field`           | **The JavaScript runtime** | The class, at runtime too    |

That third row is the interview question. `(s as any).token` reaches a `private` field at runtime.
`s.#secret` is a `SyntaxError` that no cast defeats. Use `private` for ordinary design boundaries, and
`#` when a value must not leak even to misbehaving code — a token a third-party script could reach.

> ⚠️ **A getter and setter for every field is not encapsulation.** If every private field has a public
> pair, the object is a bag of data with more code. A setter earns its place when it validates,
> normalises or records.

### Polymorphism removes conditionals

The caller depends on a shape, not a concrete type, so a new implementation does not edit the caller.
TypeScript is **structural**: any object with the right members satisfies an interface, with or
without `implements`.

| Form           | Mechanism                                        | Resolved        |
| -------------- | ------------------------------------------------ | --------------- |
| **Subtype**    | An interface with several implementations        | At runtime      |
| **Parametric** | Generics — `Repository<T>` works for any `T`     | At compile time |
| **Structural** | Any object with the right shape fits the type    | At compile time |

Prefer an interface for abstraction. Reach for an abstract class only when implementations share real
behaviour — a fixed sequence of steps with one step left open, the **template method**.

### What a deep hierarchy costs

```typescript
// ❌ Four levels, and the fourth has to break the contract
class Employee { work(): void {} }
class Manager extends Employee { approve(): void {} }
class RegionalManager extends Manager { setBudget(): void {} }

class ContractRegionalManager extends RegionalManager {
  approve(): never {
    throw new Error('Contractors cannot approve'); // any code holding a Manager can now throw
  }
}
```

That override breaks the Liskov substitution principle: code holding a `Manager` can fail for reasons
it cannot see.

| Cost                             | What it looks like                                                         |
| -------------------------------- | -------------------------------------------------------------------------- |
| **Fragile base class**           | A change in `Employee` breaks classes its author has never opened          |
| **Behaviour is hard to find**    | "Where does `work` actually run?" needs four files                         |
| **One axis only**                | A class has one parent, so role × contract × region needs a class per mix  |

### Has-a instead of is-a

Composition models each axis as its own value and gives the object the ones it needs.

```typescript
interface ApprovalRights {
  canApprove(amount: number): boolean;
}

class Staff {
  constructor(
    public readonly name: string,
    private readonly approval: ApprovalRights,
    private readonly budget?: { limit: number },
  ) {}

  approve(amount: number): boolean {
    return this.approval.canApprove(amount) && amount <= (this.budget?.limit ?? 0);
  }
}

const contractor = new Staff('Priya', { canApprove: () => false }); // any mix, no class per mix
```

The behaviour is now a value. You can swap it at runtime, test it alone, and reuse it — three things a
superclass cannot offer.

### Dependency injection is composition with a rule

A class declares the collaborators it needs and is handed them, instead of building them.

```typescript
class ReportService {
  // Depends on two interfaces — not on Postgres, and not on the system clock
  constructor(
    private readonly store: ReportStore,
    private readonly clock: Clock,
  ) {}

  async isStale(id: string): Promise<boolean> {
    const report = await this.store.findById(id);
    if (report === null) return false;
    return this.clock.now().getTime() - report.updatedAt.getTime() > 86_400_000;
  }
}
```

Testing is the whole argument. If `ReportService` built its own database client and called
`new Date()`, testing "is a report stale after a day?" would need a database and a time machine. With
both injected, the test is two object literals — no class and no mocking library.

For stateless cross-cutting concerns, a **higher-order function** is composition too:
`withAuth(withLogging(getReport))` wraps a handler twice. That is the decorator pattern with no classes.

> ⚠️ **Injecting everything is its own smell.** A constructor with nine dependencies is telling you the
> class does nine things. Fix the class, not the wiring.

## When to Use It

| Situation                                        | Choose                        | Why                                               |
| ------------------------------------------------ | ----------------------------- | ------------------------------------------------- |
| Genuine "is a", stable, one or two levels        | Inheritance                   | The shared code is real and unlikely to fork      |
| A fixed algorithm with one varying step          | Inheritance (template method) | The sequence itself is the shared thing           |
| Behaviour varies on more than one axis           | Composition                   | Single inheritance cannot express two axes        |
| Swappable behaviour, or isolated tests           | Composition and injection     | Swap a field; pass a collaborator in              |
| A subclass would override a method to do nothing | Composition                   | That override is a Liskov violation waiting to be found |

Framework base classes and error hierarchies — `class NotFoundError extends HttpError` — are
reasonable inheritance. The rule: inheritance answers "these things share behaviour", never "these
things share some fields".

## Common Mistakes

❌ **Anaemic objects.** Public fields plus a separate service that changes them is procedural code
with class syntax.
✅ Put the rule next to the state it protects, so an invalid object cannot be built.

❌ **Inheriting to reuse a helper method.** The subclass now carries the parent's whole surface.
✅ Move the helper into a module or an injected collaborator.

❌ **An interface for everything, straight away.** One implementation behind an interface is
indirection.
✅ Add the interface at the second implementation, or when it is what makes the test possible.

❌ **A service locator instead of injection.** A class that calls `container.get('db')` hides its
dependencies again.
✅ Take the dependency as a constructor parameter, so the signature documents it.

## 🔑 Key Takeaways

- An object puts state and the rules about that state in one place; every pillar follows from that.
- TypeScript's `private` is a compile-time check that a cast defeats; `#field` is enforced by the runtime.
- TypeScript is structural, so any object with the right shape satisfies an interface — which makes test doubles cheap.
- A hierarchy breaks when behaviour varies on more than one axis, because a class has exactly one parent.
- Dependency injection is composition applied to collaborators, and its payoff is a unit you can test without infrastructure.

## Interview Questions

**Q: What is the difference between `private` and `#` in a TypeScript class?**

`private` is enforced by the compiler and erased from the JavaScript, so a cast to `any` reaches the
field at runtime. `#` is a JavaScript private field, enforced by the runtime, and reading it from
outside is a syntax error. Use `private` for design boundaries and `#` when the value must not leak.

**Q: "Favour composition over inheritance" — why?**

Inheritance couples you to everything the ancestors do, when usually you wanted one piece of
behaviour. Composition names that piece, makes it swappable, and keeps each part testable alone.
Inheritance still wins for a genuine "is a" whose shared code is a stable algorithm.

**Q: Show me a case where inheritance is the right call.**

A template method: a fixed sequence where one step varies — validate, then deliver, where only
delivery differs per channel. The shared thing is the *sequence*, which an interface cannot express
and composition would repeat in every implementation. Error hierarchies are the other honest case.

**Q: TypeScript is structurally typed. What does that change?**

Substitutability depends on shape, not declaration. Test doubles and adapters become cheap, because an
object literal can satisfy a dependency. But two unrelated types with the same shape are also
interchangeable, which can hide a real bug. A branded type is the escape hatch when you need nominal
behaviour.

## What to Read Next

- [Chapter ?? — SOLID Principles](#ch-solid-principles) — dependency inversion and Liskov, stated as rules
- [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript) — strategy and decorator, which are composition with names
- [Chapter ?? — Service Boundaries and the API Gateway](#ch-service-boundaries) — the same idea at the scale of a system
