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

SOLID is five design principles from Robert C. Martin, aimed at code that can be changed without fear. They're the most-asked design topic in interviews — usually badly, because reciting the acronym is easy and applying it is not.

The five aren't equally useful. **Dependency Inversion and Single Responsibility change how you write code every day.** Liskov and Interface Segregation are narrower but come up in tricky questions. Open/Closed is the most misquoted of the set.

> **What separates a strong answer:** give the smell, then the fix, then the cost. Every one of these principles can be over-applied into an unreadable maze of one-method interfaces, and saying so is a senior signal.

## The Five, in One Table

| | Principle | One line | The smell it names |
| --- | --- | --- | --- |
| **S** | Single Responsibility | One reason to change | A class two different teams both edit |
| **O** | Open/Closed | Extend without editing | A `switch` that grows every quarter |
| **L** | Liskov Substitution | Subtypes must honour the contract | A subclass that throws where the parent didn't |
| **I** | Interface Segregation | No client forced to depend on what it doesn't use | `throw new Error("not supported")` |
| **D** | Dependency Inversion | Depend on abstractions | `new StripeClient()` inside a business class |

## Single Responsibility (SRP)

> A class should have one, and only one, reason to change.

**"One responsibility" is vague; "one reason to change" is testable.** The sharper phrasing is Martin's own: a module should be answerable to one *actor* — one group of people who can request a change.

```typescript
// ❌ Three actors, three reasons to change, one class.
class UserService {
  async register(email: string, password: string): Promise<void> {
    if (!email.includes("@")) throw new Error("bad email");      // ← product rules
    const hash = await bcrypt.hash(password, 12);
    await this.db.query("INSERT INTO users …", [email, hash]);    // ← DBA / schema
    await sendgrid.send({ to: email, template: "welcome" });      // ← marketing
    console.log(`registered ${email}`);                           // ← ops
  }
}
```

A change to the email template forces a redeploy of the code that hashes passwords. Worse, you cannot test the validation rule without a database and an email provider.

```typescript
// ✅ Each collaborator has one reason to change; the service composes them.
class UserRegistration {
  constructor(
    private readonly users: UserRepository,   // persistence changes here
    private readonly hasher: PasswordHasher,  // crypto policy changes here
    private readonly mailer: EmailSender,     // messaging changes here
  ) {}

  async register(input: RegisterInput): Promise<User> {
    const email = Email.parse(input.email);   // the rule owns its own validation
    const user = await this.users.create({
      email,
      passwordHash: await this.hasher.hash(input.password),
    });
    await this.mailer.sendWelcome(user);      // ← swap provider, this class untouched
    return user;
  }
}
```

⚠️ **The failure mode is the opposite extreme.** `UserEmailValidator`, `UserEmailNormalizer`, `UserEmailComparer` — three classes to handle one string. SRP is about *reasons to change*, not about line count. If two things always change together, they belong together.

## Open/Closed (OCP)

> Open for extension, closed for modification.

**The point isn't "never edit a file".** It's that adding a *new case* shouldn't require editing code that already works and is already tested.

```typescript
// ❌ Every new format edits a function that already works.
function export(data: Row[], format: string): string {
  if (format === "csv") return toCsv(data);
  if (format === "json") return JSON.stringify(data);
  if (format === "xml") return toXml(data);      // added last month
  throw new Error("unsupported");                // and every edit risks the others
}
```

```typescript
// ✅ New formats are added, never edited in.
interface Exporter {
  readonly format: string;
  readonly contentType: string;
  export(data: Row[]): string;
}

const csvExporter: Exporter = {
  format: "csv",
  contentType: "text/csv",
  export: (data) => data.map((r) => Object.values(r).join(",")).join("\n"),
};

class ExportRegistry {
  private readonly exporters = new Map<string, Exporter>();

  register(exporter: Exporter): void {
    this.exporters.set(exporter.format, exporter);
  }

  export(data: Row[], format: string): string {
    const exporter = this.exporters.get(format);
    if (!exporter) throw new UnsupportedFormatError(format);
    return exporter.export(data);
  }
}

// Adding PDF: write one object, register it. Nothing existing is touched.
```

> ⚠️ **This is Strategy, viewed from the principle side.** OCP is the goal; strategy, factory and decorator are the mechanisms. Making that link explicit is a good interview move — see [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript).

⚠️ **A `switch` is not automatically a violation.** If the set of cases is genuinely fixed — the seven HTTP methods, four log levels — a `switch` with an exhaustiveness check is *better* than a registry: the compiler verifies you handled everything. OCP applies to axes that actually vary.

## Liskov Substitution (LSP)

> A subtype must be usable anywhere its base type is expected, without the caller noticing.

This is about **behaviour, not just signatures**. TypeScript checks the types; only you can check the contract.

**The textbook violation:**

```typescript
class Rectangle {
  constructor(protected width: number, protected height: number) {}
  setWidth(w: number): void { this.width = w; }
  setHeight(h: number): void { this.height = h; }
  area(): number { return this.width * this.height; }
}

// ❌ A square "is a" rectangle in geometry, not in code.
class Square extends Rectangle {
  setWidth(w: number): void { this.width = w; this.height = w; }  // side effect!
  setHeight(h: number): void { this.width = h; this.height = h; }
}

// Code that was correct for Rectangle is now wrong.
function stretch(r: Rectangle): void {
  r.setWidth(5);
  r.setHeight(4);
  console.assert(r.area() === 20); // ✅ Rectangle → 20   ❌ Square → 16
}
```

**The realistic version you'll actually hit:**

```typescript
interface Storage {
  write(key: string, data: Buffer): Promise<void>;
  delete(key: string): Promise<void>;
}

// ❌ Narrows the contract — callers that worked now break.
class ReadOnlyArchiveStorage implements Storage {
  async write(): Promise<void> {
    throw new Error("Archive is read-only"); // the base type promised this works
  }
  async delete(): Promise<void> {
    throw new Error("Archive is read-only");
  }
}
```

The fix is not a better error message — it's a better interface. Split reading from writing (that's ISP) so an archive simply isn't a `WritableStorage`.

**The rules a subtype must respect:**

| Rule | Meaning |
| ---- | ------- |
| **Preconditions may not be strengthened** | Don't reject inputs the parent accepted |
| **Postconditions may not be weakened** | Don't return less, or leave invariants broken |
| **Invariants must be preserved** | A `SortedList` subclass may not become unsorted |
| **No new exceptions** | Callers can't handle what they don't know about |

> ⚠️ **The practical takeaway:** most LSP violations are inheritance being used for code reuse rather than for substitutability. When "is-a" holds vocabulary-wise but not behaviour-wise, use composition.

## Interface Segregation (ISP)

> No client should be forced to depend on methods it doesn't use.

```typescript
// ❌ One fat interface; every implementer must fake what it can't do.
interface Repository<T> {
  findById(id: string): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<void>;
  delete(id: string): Promise<void>;
  bulkImport(rows: T[]): Promise<void>;
  streamAll(): AsyncIterable<T>;
}

class AuditLogRepository implements Repository<AuditEntry> {
  async delete(): Promise<void> {
    throw new Error("Audit entries are immutable"); // ❌ also an LSP violation
  }
  // …and four more methods this class has no business having
}
```

```typescript
// ✅ Small interfaces, composed to fit each need.
interface Readable<T> { findById(id: string): Promise<T | null>; }
interface Writable<T> { save(entity: T): Promise<void>; }
interface Deletable { delete(id: string): Promise<void>; }
interface Streamable<T> { streamAll(): AsyncIterable<T>; }

// An audit log is append-only, and now the type says so.
class AuditLogRepository implements Readable<AuditEntry>, Writable<AuditEntry> {}

// Consumers depend only on what they use.
class ReportBuilder {
  constructor(private readonly source: Streamable<AuditEntry>) {} // nothing else
}
```

**Why this matters beyond tidiness:** a consumer that depends on a six-method interface must be updated when any of those six changes, and its tests must stub all six. Narrow interfaces mean narrow test doubles and narrow blast radius.

⚠️ **Don't take it to one method per interface.** Cohesive groups are the goal — an interface that describes a role, not a single call.

## Dependency Inversion (DIP)

> High-level modules should not depend on low-level modules. Both should depend on abstractions.

**This is the one that changes your code the most**, and it's usually explained backwards. The inversion is about *who owns the interface*.

```text
❌ Conventional:  OrderService ──▶ StripeGateway
                  (policy depends on detail — swap the vendor, edit the policy)

✅ Inverted:      OrderService ──▶ PaymentGateway ◀── StripeGateway
                  (both depend on the abstraction, and the domain owns it)
```

```typescript
// The interface is defined by the consumer, in domain language.
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

// The low-level detail conforms to the domain's interface, not the reverse.
class StripeGateway implements PaymentGateway {
  async charge(amountCents: number, token: string) { /* SDK calls here */ }
}
```

**The detail people miss:** `PaymentGateway` lives with `OrderService`, not with the Stripe adapter. That's what makes it an *inversion* — the domain dictates the shape, and vendors adapt. Put the interface in the infrastructure layer and you've just added a file.

**What it buys you:**

- ✅ Unit tests with a plain object, no mocking framework, no network.
- ✅ Vendor swaps touch one adapter and one line of wiring.
- ✅ The domain stays portable across frameworks and runtimes.

> **DIP vs Dependency Injection:** DIP is the principle — depend on an abstraction you own. DI is the delivery mechanism — pass it in. You can inject a concrete class and satisfy DI while completely violating DIP. See [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance).

## When SOLID Goes Wrong

Every principle has an over-applied form, and interviewers notice when you can name them:

| Over-applied as | Result |
| --------------- | ------ |
| SRP → one class per method | Twelve files to follow one request |
| OCP → an abstraction for every axis | Plugin architecture for two cases that never changed |
| LSP → no inheritance ever | Duplication where a base class was correct |
| ISP → one method per interface | Ten interfaces describing one collaborator |
| DIP → an interface per class | Indirection with exactly one implementation, forever |

```typescript
// ❌ An interface with one implementation and no plan for a second
//    is a file you maintain for nothing.
interface UserIdGenerator { generate(): string; }
class UuidUserIdGenerator implements UserIdGenerator { generate() { return randomUUID(); } }
```

**The rule that keeps this honest:** apply a principle when you can name the change it makes cheaper. "We'll need a second payment provider next quarter" is a reason. "It's more SOLID" is not.

## 🔑 Key Takeaways

- Dependency inversion and single responsibility carry most of the day-to-day value; the other three are narrower.
- Single responsibility is about who can request a change, not about how many methods a class has.
- Open/closed is a goal; strategy, factory and decorator are the mechanisms that reach it — a fixed `switch` with an exhaustiveness check is not a violation.
- Liskov is a statement about behaviour, not signatures, so the compiler cannot check it for you.
- Refactor toward these principles at the second case; starting there produces one-method interfaces nobody reads.

## Interview Questions

**Q1: Explain SRP with a real example.**

One reason to change — better framed as one *actor*. A registration method that validates input, hashes a password, writes to the database, and sends a welcome email answers to product, security, the DBA, and marketing, so any of four groups can force a change to it. Splitting it into a repository, a hasher, and a mailer means an email-template change can't break password hashing, and I can test the validation rule with no database.

**Q2: Does OCP mean never modifying code?**

No — it means adding a new *case* shouldn't require editing already-working code. A `switch` over export formats that grows quarterly is the smell; a registry of exporters is the fix. But if the set is genuinely fixed, like HTTP methods, a `switch` with an exhaustiveness check is better than a registry, because the compiler proves you handled every case.

**Q3: Give a Liskov violation you've actually seen.**

A read-only storage implementation whose `write` and `delete` throw. It satisfies the interface, compiles fine, and breaks every caller written against the base contract. The real problem was the interface: reading and writing should have been separate, so a read-only backend simply isn't a writable one. Most LSP violations turn out to be inheritance used for reuse rather than substitutability.

**Q4: How does ISP relate to LSP?**

They're often the same bug seen from two sides. A fat interface forces implementers to stub methods they can't support, and those stubs throw — which is the LSP violation. Splitting the interface removes the need to lie, so both problems disappear at once.

**Q5: What exactly is "inverted" in DIP?**

Ownership of the interface. Normally the high-level module depends on the low-level one, so the vendor's shape dictates your code. Inverted, the domain defines `PaymentGateway` in its own language and the Stripe adapter conforms to it. The abstraction has to live with the consumer — if it sits next to the adapter, you've added a file without inverting anything.

**Q6: DIP or Dependency Injection?**

DIP is the principle, DI is the technique. Injecting a concrete `StripeGateway` through a constructor is DI without DIP — the class still depends on a detail. Depending on an interface you own is DIP; how it arrives is a separate decision, and constructor injection is just the most common answer.

**Q7: Which of the five matters most?**

DIP, because it's what makes code testable and portable, and SRP, because it's what keeps modules small enough to reason about. In day-to-day work those two do most of the load-bearing. ISP and LSP mostly surface as interface-design mistakes, and OCP is best treated as an outcome of the others rather than a target.

**Q8: When would you deliberately ignore SOLID?**

When the change it protects against isn't coming. An interface with one implementation and no second in sight is maintenance cost for an option nobody will exercise, and one class per method turns a single request into a scavenger hunt. I apply a principle when I can name the change it makes cheaper — and if I can't name it, I write the simpler code and refactor when the second case actually arrives.

## What to Read Next

- [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript) — the mechanisms that implement these principles
- [Chapter ?? — Architectural Patterns](#ch-architectural-patterns) — dependency inversion applied to a whole service
- [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance) — where Liskov violations actually come from
