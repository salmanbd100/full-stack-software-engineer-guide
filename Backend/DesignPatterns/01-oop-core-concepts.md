---
title: OOP Core Concepts in TypeScript
part: 1
chapter: 0
slug: oop-core-concepts
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-29
tags: [oop, typescript, encapsulation, inheritance, polymorphism, abstraction]
in_book: true
---

# OOP Core Concepts in TypeScript {#ch-oop-core-concepts}

> Explain the four pillars in terms of what they cost, and say which of them TypeScript gives you without a class.

**In this chapter:** objects as state plus behaviour · encapsulation and real privacy · inheritance and `super` · polymorphism through interfaces · abstraction and where the line goes

## 💡 The Core Idea

Object-oriented programming is one answer to a single question: **where does state live, and who is
allowed to change it?** Procedural code answers "anywhere, and anyone", which works until the codebase
has forty engineers in it. An object answers "here, and only these methods" — and everything else in
this chapter follows from that.

The four pillars follow from that answer. What scores in an interview is not the definitions but
knowing which pillar TypeScript enforces at compile time, which at runtime, and where each costs more
than it gives.

## Objects Are State Plus the Rules About It

A class is a template; an object is one instance of it, with its own copy of the state.

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

The rule "a title is never empty" lives beside the field it constrains, so no caller can break it, and
the audit trail cannot be forgotten because the only way to change the title also records the change.

## Encapsulation: What `private` Actually Means

Encapsulation is not "using getters". It is choosing a small surface and refusing to widen it.

| Modifier | Enforced by | Visible to |
| --- | --- | --- |
| `public` (default) | — | Everyone |
| `protected` | The compiler | The class and its subclasses |
| `private` | **The compiler only** | The class |
| `#field` | **The JavaScript runtime** | The class, at runtime too |

That third row is the interview question.

Given a class with `private token` and `#secret`, `(s as any).token` reaches the first at runtime;
`s.#secret` is a `SyntaxError` that no cast defeats.

Use `private` for ordinary design boundaries, where the compiler is the audience. Use `#` when the
value must not leak even to deliberately misbehaving code — credentials, keys, anything a plugin or a
third-party script might reach.

> ⚠️ **A getter and setter for every field is not encapsulation.** If every private field has a public
> pair, the object is a bag of data with more code. A setter earns its place when it validates,
> normalises or records — not when it assigns.

## Inheritance: Useful, and Easy to Overuse

`extends` gives a subclass everything the parent has, and `super` reaches the parent's version.

```typescript
abstract class Notification {
  constructor(protected readonly recipient: string) {}

  // The shared sequence. Subclasses fill in the one step that differs.
  async send(body: string): Promise<void> {
    this.validate(body);
    await this.deliver(body);
  }

  protected validate(body: string): void {
    if (body.length === 0) throw new Error('Empty notification');
  }

  protected abstract deliver(body: string): Promise<void>;
}

class SmsNotification extends Notification {
  protected validate(body: string): void {
    super.validate(body); // keep the parent rule, then add the channel's own
    if (body.length > 160) throw new Error('SMS body too long');
  }

  protected async deliver(body: string): Promise<void> {
    await smsGateway.send(this.recipient, body);
  }
}
```

**Inheritance is the right tool when the relationship is genuinely "is a"**, the shared behaviour is
stable, and the hierarchy is one or two levels deep. It is the wrong tool the moment you find yourself
overriding a method to do nothing, or adding a fourth level. The next chapter is about what to reach
for instead.

## Polymorphism: One Call Site, Several Implementations

Polymorphism is the pillar that removes conditionals. The caller depends on a shape rather than a
concrete type, so adding an implementation does not edit the caller.

```typescript
interface Exporter {
  render(rows: readonly Row[]): Promise<Buffer>;
}

// Adding an exporter adds a file. It does not touch this function.
async function exportReport(rows: readonly Row[], exporter: Exporter): Promise<Buffer> {
  return exporter.render(rows);
}
```

TypeScript gives you three forms, and knowing they are all the same idea is the senior answer:

| Form | Mechanism | Resolved |
| --- | --- | --- |
| **Subtype** | An interface or base class with several implementations | At runtime |
| **Parametric** | Generics — `Repository<T>` works for any `T` | At compile time |
| **Structural** | Any object with the right shape satisfies the type | At compile time |

The third surprises people arriving from Java or C#. TypeScript does not require `implements`: an
object literal with a matching shape *is* an `Exporter`. `implements` is a checked annotation for your
benefit, not a condition of substitutability.

## Abstraction: Abstract Class or Interface

Abstraction is deciding what the caller is allowed to know. The choice is more constrained than it looks.

| | Interface | Abstract class |
| --- | --- | --- |
| **Carries implementation and state** | No | Yes |
| **How many per type** | Many | One |
| **Exists at runtime** | No — erased | Yes |

The default is an interface. Reach for an abstract class when implementations share real behaviour —
the `Notification` example shares `send` and the validation rule, which an interface cannot express. If
subclasses share nothing but a name, the abstract class is a hierarchy pretending to be reuse.

> ⚠️ **An abstraction that has exactly one implementation is not an abstraction.** It is indirection,
> and it costs a jump every time someone reads the code. Wait for the second implementation, unless
> the interface exists specifically to make testing possible.

## Common Mistakes

❌ **Anaemic objects.** A class of public fields with a separate service that manipulates them is
procedural code with class syntax.
✅ Put the rule next to the state it constrains, so an invalid object cannot be constructed.

❌ **Deep hierarchies.** Three levels in, nobody can answer "where does this method actually run?"
✅ One or two levels, and composition past that — see the next chapter.

❌ **`instanceof` chains in place of polymorphism.** The chain is edited for every new type.
✅ Put the varying behaviour on the type, or use a discriminated union with an exhaustiveness check.

## 🔑 Key Takeaways

- An object exists to put state and the rules about that state in the same place; every pillar is a consequence of that.
- TypeScript's `private` is a compile-time check that any cast defeats; `#field` is enforced by the runtime.
- Inheritance is for genuine "is a" relationships one or two levels deep; anything more usually wants composition.
- Prefer an interface until several implementations share real behaviour, and treat a one-implementation abstraction as indirection.

## Interview Questions

**Q: What is the difference between `private` and `#` in a TypeScript class?**

`private` is enforced by the compiler and erased in the emitted JavaScript, so a cast to `any` or a
dynamic property read reaches the field at runtime. `#` is a JavaScript private field, enforced by the
runtime, and accessing it from outside is a syntax error. Use `private` for design boundaries and `#`
when the value must not leak even to deliberately hostile code.

**Q: TypeScript is structurally typed. What does that change about polymorphism?**

Substitutability depends on shape, not on declaration. Any object with the right members satisfies an
interface, whether or not it says `implements`. That makes test doubles and adapters cheap — you can
satisfy a dependency with an object literal — but it also means two unrelated types with the same
shape are interchangeable, which occasionally hides a real bug. A branded type is the escape hatch
when you need nominal behaviour.

**Q: When would you choose an abstract class over an interface?**

When the implementations genuinely share code, not just a contract. The template-method shape — a
fixed sequence of steps with one step left abstract — is the clearest case, because an interface
cannot express the shared sequence. If there is no shared implementation, the interface is lighter and
does not consume the single inheritance slot.

## What to Read Next

- [Chapter ?? — Composition over Inheritance](#ch-composition-over-inheritance) — what to do when the hierarchy stops helping
- [Chapter ?? — SOLID Principles](#ch-solid-principles) — the rules that explain when each pillar pays off
- [Chapter ?? — Design Patterns in TypeScript](#ch-design-patterns-in-typescript) — the recurring shapes these concepts build
