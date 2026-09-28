---
title: Part I — OOP and Design Patterns
part: 1
chapter: 15
slug: backend-design-patterns-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [design-patterns, solid, architecture, typescript, gof]
in_book: true
---

# Part I — OOP and Design Patterns

Object orientation is not a vocabulary test, and neither are patterns. Nobody senior is asked to
define encapsulation or recite the Gang of Four. Interviewers ask the question underneath: *this
conditional keeps growing, what do I do about it*, or *why did that hierarchy become unmaintainable*.
They also want to hear you name the cost of the structure you propose.

One warning runs through the whole section: **TypeScript is not Java.** Here, several classic
patterns shrink to a function, a module or a union type. Structural typing (matching types by shape,
not by name) also changes what polymorphism costs. Where that is true, the chapter says so. It does
not dress a one-liner in a class hierarchy.

## Chapters

| #  | Chapter                                                              | What it answers                                                  |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [OOP and Composition over Inheritance](#ch-composition-over-inheritance) | What does `private` enforce, and why does the hierarchy break at the fourth level? |
| 02 | [SOLID Principles](#ch-solid-principles)                             | Where do the five principles help, and what do they cost?        |
| 03 | [Design Patterns in TypeScript](#ch-design-patterns-in-typescript)   | Which patterns survive a language that has closures and modules? |

## What Interviewers Probe For

For patterns specifically: *can justify a structure rather than apply one by reflex*.

- **Can you name the problem before the pattern?** "I would use a strategy here" is a weaker answer
  than "this switch will gain a branch every time we add a payment provider, and each branch touches
  the same function." The pattern is the second half of the answer, not the first.
- **Do you know what `private` actually does?** The compiler erases TypeScript's `private`, and a
  cast reaches straight through it. The JavaScript runtime enforces `#field`. Candidates who know
  the difference have usually debugged something real.
- **Do you know the TypeScript-native form?** A strategy is often a `Record<Kind, Handler>`. A
  singleton is usually a module. An observer is often an `EventTarget`. Reaching for a class
  hierarchy when the language already has the mechanism is a mid-level tell.
- **Can you argue against SOLID?** Applied literally, interface segregation produces a dozen
  one-method interfaces nobody reads. The senior answer applies the principle where churn (frequent
  change) actually happens. It also says why the principle was skipped elsewhere.

## Reading Order

Straight through. 01 is the object model and its limits, 02 turns those limits into rules, and 03 is
the recurring shapes those rules produce. Layering a whole service is Part VI's
[Chapter ?? — Service Boundaries and the API Gateway](#ch-service-boundaries).

**Interview sprint:** 02 → 01. SOLID gets asked by name, and composition versus inheritance is the
question behind most "how would you refactor this" prompts.
