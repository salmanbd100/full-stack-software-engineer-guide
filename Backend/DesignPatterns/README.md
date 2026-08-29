---
title: Part I — OOP and Design Patterns
part: 1
chapter: 0
slug: backend-design-patterns-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-29
tags: [design-patterns, solid, architecture, typescript, gof]
in_book: true
---

# Part I — OOP and Design Patterns

Object orientation is not a vocabulary test, and neither are patterns. Nobody senior is asked to
define encapsulation or recite the Gang of Four. What gets asked is the underlying question — *this
conditional keeps growing, what do I do about it*, *why did that hierarchy become unmaintainable* —
and whether you can name the cost of the structure you propose.

A warning that runs through the whole section: **TypeScript is not Java.** Several classic patterns
collapse into a function, a module or a union type here, and structural typing changes what
polymorphism costs. Where that is true, the chapter says so rather than dressing a one-liner in a
class hierarchy.

This section sits in Part I rather than Part V. Patterns are language material, not backend material;
it lives under `Backend/` only because that is where the files already were, and `scripts/lib/book.ts`
maps it to Part I.

## Chapters

| #  | Chapter                                                              | What it answers                                                  |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [OOP Core Concepts in TypeScript](./01-oop-core-concepts.md)         | Which pillar does the compiler enforce, and which the runtime?   |
| 02 | [Composition over Inheritance](./02-composition-over-inheritance.md) | Why does the hierarchy break at the fourth level?                |
| 03 | [SOLID Principles](./03-solid-principles.md)                         | Where do the five principles help, and what do they cost?        |
| 04 | [Design Patterns in TypeScript](./04-patterns-in-typescript.md)      | Which patterns survive a language that has closures and modules? |
| 05 | [Architectural Patterns](./05-architectural-patterns.md)             | Where do the layers of a service go, so a change lands once?     |

## What Interviewers Probe For

The senior signal for Part I is **can reason about the runtime, not just recite the API** — and for
patterns specifically, it is *can justify a structure rather than apply one by reflex*.

- **Can you name the problem before the pattern?** "I would use a strategy here" is a weaker answer
  than "this switch will gain a branch every time we add a payment provider, and each branch touches
  the same function." The pattern is the second half of the answer, not the first.
- **Do you know what `private` actually does?** TypeScript's `private` is erased at compile time and a
  cast reaches straight through it; `#field` is enforced by the JavaScript runtime. Candidates who
  know the difference have usually debugged something real.
- **Do you know the TypeScript-native form?** A strategy is often a `Record<Kind, Handler>`. A
  singleton is usually a module. An observer is frequently an `EventTarget`. Reaching for a class
  hierarchy when the language already has the mechanism is a mid-level tell.
- **Can you argue against SOLID?** Interface segregation applied literally produces a dozen
  one-method interfaces nobody reads. The senior answer applies the principle where churn actually
  happens and says why it was skipped elsewhere.
- **Do you understand dependency inversion in practice?** Not the definition — the testing
  consequence. If the module constructs its own database client, you cannot test it without one.

## Reading Order

Straight through. 01 and 02 are the object model and its limits, 03 turns those limits into rules, and
04 and 05 are the recurring shapes those rules produce at two different scales.

**Interview sprint:** 03 → 02 → 05. SOLID gets asked by name, composition versus inheritance is the
question behind most "how would you refactor this" prompts, and architectural layering is what a
design round expects you to draw.
