---
title: Design Patterns
part: 1
chapter: 0
slug: backend-design-patterns-index
level: intermediate # beginner | intermediate | advanced
reading_time: 5
updated: 2026-08-03
tags: [backend, design, patterns]
in_book: true
---

# Design Patterns

## Overview

Design patterns are names for solutions that keep reappearing. Their real value in an interview isn't the implementation — it's the shared vocabulary: "wrap the repository in a caching decorator" replaces five minutes of explanation.

This module covers the patterns that actually show up in backend TypeScript, plus the SOLID principles that explain *why* they help.

**What you'll cover:**

- Creational — who decides which class gets instantiated
- Structural — how objects wrap and compose each other
- Behavioral — who decides what, and how objects communicate
- Architectural — how a whole service is layered
- SOLID — the principles the patterns are serving

> **The one idea that ties it together:** every pattern buys flexibility along one axis and charges indirection for it. Applying one you can't justify is worse than applying none. The strongest answer always names the change the pattern makes cheaper — and admits when that change isn't coming.

## Topics

| #   | Topic                                                        | Core idea                                                    |
| --- | ------------------------------------------------------------ | ------------------------------------------------------------ |
| 01  | [Creational Patterns](./01-creational-patterns.md)            | Singleton, Factory, Abstract Factory, Builder, Prototype      |
| 02  | [Structural Patterns](./02-structural-patterns.md)            | Adapter, Decorator, Facade, Proxy, Composite, Bridge          |
| 03  | [Behavioral Patterns](./03-behavioral-patterns.md)            | Strategy, Observer, Command, State, Chain, Template Method     |
| 04  | [Architectural Patterns](./04-architectural-patterns.md)      | Repository, Service Layer, DI, Unit of Work, layering          |
| 05  | [SOLID Principles](./05-solid-principles.md)                  | The five principles, and where each over-applies              |

## Interview Frequency

Study in this order — the top group is asked far more than the rest.

| Pattern | Frequency | Why they ask |
| ------- | --------- | ------------ |
| **Dependency Injection / DIP** | ★★★★★ | Reveals whether you can write testable code |
| **Strategy** | ★★★★★ | The cleanest example of replacing a `switch` |
| **Singleton** | ★★★★★ | A trap question — the good answer criticises it |
| **Factory** | ★★★★☆ | Everyone uses one; few can define the variants |
| **Observer** | ★★★★☆ | Leads naturally into events vs queues |
| **Decorator** | ★★★★☆ | Middleware and repository wrappers |
| **Repository / Service Layer** | ★★★★☆ | "How would you structure this service?" |
| **Adapter, Builder, Command** | ★★★☆☆ | Usually as "how does this differ from…" |
| **State, Proxy, Chain** | ★★★☆☆ | State pairs with Strategy; Chain with middleware |
| **Composite, Bridge, Prototype, Template Method** | ★★☆☆☆ | Recognition-level knowledge is enough |

## The Distinctions Interviewers Test

These pairs look alike and are the most common follow-up questions:

| Pair | The difference in one line |
| ---- | -------------------------- |
| **Adapter vs Decorator** | Adapter changes the interface; Decorator keeps it and adds behaviour |
| **Decorator vs Proxy** | Decorator always forwards; Proxy may refuse or defer |
| **Adapter vs Facade** | Adapter fixes a mismatch; Facade hides volume |
| **Factory vs Abstract Factory** | One product vs a matched family |
| **Factory vs Builder** | Which class vs with what configuration |
| **Strategy vs State** | The caller chooses vs the object transitions itself |
| **Strategy vs Template Method** | Composition, swappable at runtime vs inheritance, fixed step order |
| **DIP vs DI** | Depend on an abstraction you own vs how it gets passed in |
| **Bridge vs Adapter** | Planned upfront vs retrofitted |

## What TypeScript Changes

Several GoF patterns exist to work around limitations TypeScript doesn't have.

| Pattern | Classic form | Idiomatic TypeScript |
| ------- | ------------ | -------------------- |
| **Singleton** | Static instance + private constructor | A module-level `export const` |
| **Factory Method** | Abstract creator + subclasses | A function returning an interface |
| **Strategy** | Strategy class hierarchy | A function, or a `Record` of functions |
| **Decorator** | Wrapper class | A higher-order function |
| **Prototype** | `clone()` on every class | Spread, or `structuredClone` |
| **Iterator** | Explicit iterator class | `Symbol.iterator` / generators |

**What survives unchanged:** Builder for fluent construction, Abstract Factory for genuine multi-family swaps, State for real state machines, and everything in the architectural chapter.

> ✨ **Saying which patterns the language absorbed is a stronger signal than implementing all of them.** It shows you've read the code you write, not just the book.

## Suggested Study Path

**Day 1 — Principles first.** Read 05. SOLID explains what the patterns are for, so learning it first makes everything else make sense. Focus on DIP and SRP.

**Day 2 — The daily patterns.** Read the Strategy, Observer, and Decorator sections (02, 03). Be able to write each from memory in under five minutes.

**Day 3 — Creation.** Read 01. Practise the Singleton critique out loud — the question is a trap, and "one instance, injected" is the answer.

**Day 4 — The wrappers.** Read 02 fully. Drill the four-way Adapter / Decorator / Facade / Proxy distinction until it's automatic.

**Day 5 — Architecture.** Read 04. Be ready to whiteboard controller → service → repository and say exactly what belongs in each layer, plus what an anaemic service looks like.

## Anti-Patterns to Name

Knowing the failure mode is as valuable as knowing the pattern:

| Anti-pattern | What it looks like | Fix |
| ------------ | ------------------ | --- |
| **God object** | One service class doing everything | SRP — split by reason to change |
| **Anaemic service layer** | Every method is a one-line passthrough | Move the rules in, or delete the layer |
| **Service locator** | Injecting the DI container itself | Inject the dependency, not the container |
| **Speculative abstraction** | An interface with one implementation, forever | Delete it; add it when the second arrives |
| **Pattern soup** | Four wrappers between the call and the work | Compose at one wiring point; flatten the rest |
| **Leaky repository** | Methods taking SQL fragments | Express the interface in domain terms |

## Resources

- [Refactoring Guru](https://refactoring.guru/design-patterns) — the clearest explanations, with diagrams
- [patterns.dev](https://www.patterns.dev/) — patterns in modern JavaScript and React
- **Design Patterns** — Gamma, Helm, Johnson, Vlissides (the original GoF)
- **Clean Architecture** — Robert C. Martin (the layering rules in chapter 04)
- **Refactoring** — Martin Fowler (the smells the patterns answer)
- **Patterns of Enterprise Application Architecture** — Fowler (Repository, Unit of Work, Service Layer)

## Related Topics

- **[NodeJS](../NodeJS/README.md)** — `EventEmitter` is Observer; streams are Decorator
- **[API](../API/README.md)** — middleware is Chain of Responsibility
- **[Testing](../Testing/)** — DI is what makes unit tests possible
- **[OOP](../../OOP/)** — inheritance, composition, and encapsulation fundamentals

---

**Difficulty:** Intermediate → Advanced · **Interview frequency:** High

Start with [05-solid-principles.md](./05-solid-principles.md) — the principles make the patterns make sense.
