---
title: SOLID Principles
part: 1
chapter: 0
slug: solid-principles
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-08-29
tags: [backend, design, patterns, solid, principles]
in_book: true
---

# SOLID Principles {#ch-solid-principles}

> Apply the five principles where they help, and name the cost when they do not.

**In this chapter:** single responsibility · open/closed · Liskov substitution · interface segregation · dependency inversion

## 💡 The Core Idea

SOLID is five design principles aimed at code that can be changed without fear. It is the most-asked
design topic in interviews and usually the worst answered, because reciting the acronym is easy and
applying it is not. The five are not equally useful: **dependency inversion and single responsibility
change how you write code every day**, Liskov and interface segregation are narrower, and open/closed is
the most misquoted of the set.

> **What separates a strong answer:** the smell, then the fix, then the cost. Every one of these can be
> over-applied into a maze of one-method interfaces, and saying so is the senior signal.

## Single Responsibility (SRP)

> A class should have one, and only one, reason to change.

**"One responsibility" is vague; "one reason to change" is testable.** Sharper still: a module should be
answerable to one *actor* — one group of people who can request a change.

```typescript
// ❌ Three actors, three reasons to change, one class.
async function register(email: string, password: string): Promise<void> {
  if (!email.includes('@')) throw new Error('bad email'); // ← product rules
  const hash = await bcrypt.hash(password, 12);
  await db.query('INSERT INTO users …', [email, hash]); // ← DBA / schema
  await sendgrid.send({ to: email, template: 'welcome' }); // ← marketing
}
```

The fix is three collaborators — a `UserRepository`, a `PasswordHasher`, an `EmailSender` — passed into
a `UserRegistration` class that only composes them. Each has one reason to change, and the validation
rule becomes testable on its own.

⚠️ **The failure mode is the opposite extreme.** `UserEmailValidator`, `UserEmailNormalizer`,
`UserEmailComparer` — three classes for one string. SRP is about reasons to change, not line count. If
two things always change together, they belong together.

## Open/Closed (OCP)

> Open for extension, closed for modification.

**The point is not "never edit a file".** It is that adding a *new case* should not mean editing code
that already works and is already tested.

A function that switches on a `format` string and grows a branch every quarter is the smell: each edit
risks the branches that already work, and the file is re-tested every time.

```typescript
// ✅ New formats are added, never edited in.
interface Exporter {
  readonly format: string;
  export(data: Row[]): string;
}

class ExportRegistry {
  private readonly exporters = new Map<string, Exporter>();

  register(exporter: Exporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  export(data: Row[], format: string): string {
    const exporter = this.exporters.get(format);
    if (exporter === undefined) throw new UnsupportedFormatError(format);
    return exporter.export(data);
  }
}
```

Adding PDF export means writing one object and registering it. Nothing existing is touched.

> ⚠️ **This is Strategy, from the principle side.** OCP is the goal; strategy, factory and decorator are
> the mechanisms — see [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript).

A `switch` is not automatically a violation. Where the set of cases is genuinely fixed — the HTTP
methods, four log levels — a `switch` with an exhaustiveness check beats a registry, because the
compiler verifies you handled everything. OCP applies to axes that actually vary.

## Liskov Substitution (LSP)

> A subtype must be usable anywhere its base type is expected, without the caller noticing.

This is about **behaviour, not signatures**. TypeScript checks the types; only you can check the
contract.

The Rectangle/Square case is the textbook one: a `Square` that keeps its sides equal breaks any caller
that sets width and height independently, even though the types line up. The version you will actually
hit looks like this.

The realistic version: a `Storage` interface promising `write` and `delete`, and a
`ReadOnlyArchiveStorage` that implements both by throwing. It compiles, satisfies the interface, and
breaks every caller written against the base contract.

The fix is not a better error message but a better interface: split reading from writing — that is ISP
— so an archive simply is not a `WritableStorage`.

A subtype may not strengthen preconditions, weaken postconditions, break an invariant, or throw
exceptions the base type never declared. TypeScript checks none of those four.

> ⚠️ Most LSP violations are inheritance used for code reuse rather than substitutability. When "is a"
> holds in vocabulary but not in behaviour, use composition.

## Interface Segregation (ISP)

> No client should be forced to depend on methods it doesn't use.

A six-method `Repository<T>` forces an append-only audit log to implement `delete` — and the only way
to implement it is to throw, which is also an LSP violation.

Split it into `Readable<T>`, `Writable<T>` and `Deletable`, and an audit log declares
`implements Readable<AuditEntry>, Writable<AuditEntry>` — append-only, stated in the type.

**Beyond tidiness:** a consumer depending on a six-method interface must be updated when any of the six
changes, and its tests must stub all six. Narrow interfaces mean narrow test doubles and a narrow blast
radius — but stop at cohesive roles, not one method per interface.

## Dependency Inversion (DIP)

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

**This is the one that changes your code the most**, and it is usually explained backwards: the
inversion is about *who owns the interface*.

```typescript
// Defined by the consumer, in domain language — this is the inversion.
interface PaymentGateway {
  charge(amountCents: number, token: string): Promise<{ id: string }>;
}

// ✅ High-level policy, no vendor anywhere in sight.
class OrderService {
  constructor(private readonly payments: PaymentGateway) {}

  async checkout(order: Order, token: string): Promise<void> {
    const charge = await this.payments.charge(order.totalCents, token);
    order.markPaid(charge.id);
  }
}

// The detail conforms to the domain's interface, not the reverse.
class StripeGateway implements PaymentGateway {} // SDK calls here
```

**The detail people miss:** `PaymentGateway` lives with `OrderService`, not with the Stripe adapter.
That is what makes it an inversion — the domain dictates the shape and vendors adapt. Put the interface
in the infrastructure layer and you have just added a file.

It buys unit tests with a plain object and no network, vendor swaps that touch one adapter and one line
of wiring, and a domain that stays portable across frameworks.

> **DIP is not DI.** DIP is the principle — depend on an abstraction you own. DI is the delivery
> mechanism — pass it in. Injecting a concrete class satisfies DI while violating DIP entirely. See
> [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance).

## When SOLID Goes Wrong

Every principle has an over-applied form, and naming them is what interviewers listen for:

| Over-applied as | Result |
| --------------- | ------ |
| SRP → one class per method | Twelve files to follow one request |
| OCP → an abstraction for every axis | A plugin architecture for two cases that never changed |
| ISP → one method per interface | Ten interfaces describing one collaborator |
| DIP → an interface per class | Indirection with exactly one implementation, forever |

**The rule that keeps this honest:** apply a principle when you can name the change it makes cheaper.
"We need a second payment provider next quarter" is a reason. "It is more SOLID" is not.

## 🔑 Key Takeaways

- Dependency inversion and single responsibility carry most of the day-to-day value; the other three are narrower.
- Single responsibility is about who can request a change, not about how many methods a class has.
- Open/closed is a goal; strategy, factory and decorator are the mechanisms that reach it — a fixed `switch` with an exhaustiveness check is not a violation.
- Refactor toward these principles at the second case; starting there produces one-method interfaces nobody reads.

## Interview Questions

**Q: Explain SRP with a real example.**

One reason to change — better framed as one *actor*. A registration method that validates input, hashes a password, writes to the database, and sends a welcome email answers to product, security, the DBA, and marketing, so any of four groups can force a change to it. Splitting it into a repository, a hasher, and a mailer means an email-template change can't break password hashing, and I can test the validation rule with no database.

**Q: Give a Liskov violation you've actually seen.**

A read-only storage implementation whose `write` and `delete` throw. It satisfies the interface, compiles fine, and breaks every caller written against the base contract. The real problem was the interface: reading and writing should have been separate, so a read-only backend simply isn't a writable one. Most LSP violations turn out to be inheritance used for reuse rather than substitutability.

**Q: When would you deliberately ignore SOLID?**

When the change it protects against isn't coming. An interface with one implementation and no second in sight is maintenance cost for an option nobody will exercise, and one class per method turns a single request into a scavenger hunt. I apply a principle when I can name the change it makes cheaper — and if I can't name it, I write the simpler code and refactor when the second case actually arrives.

## What to Read Next

- [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript) — the mechanisms that implement these principles
- [Chapter ?? — Architectural Patterns](#ch-architectural-patterns) — dependency inversion applied to a whole service
- [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance) — where Liskov violations actually come from
