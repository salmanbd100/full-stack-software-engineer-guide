---
title: Part I — Design Patterns in TypeScript
part: 1
chapter: 0
slug: backend-design-patterns-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [design-patterns, solid, architecture, typescript, gof]
in_book: true
---

# Part I — Design Patterns in TypeScript

Patterns are not a vocabulary test. Nobody senior is asked to recite the Gang of Four. What gets
asked is the underlying question a pattern answers — *this conditional keeps growing, what do I do
about it* — and whether you can name the cost of the structure you propose. This section covers the
handful of patterns that genuinely appear in TypeScript codebases, plus the principles that explain
why they work.

A warning that runs through the whole section: TypeScript is not Java. Several classic patterns
collapse into a function, a closure or a union type here. Where that is true, the chapter says so
rather than dressing a one-liner in a class hierarchy.

## Chapters

| #  | Chapter                                                          | What it answers                                              |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Creational Patterns](./01-creational-patterns.md)               | What do you do when a constructor call is no longer enough?  |
| 02 | [Structural Patterns](./02-structural-patterns.md)               | How do you add behaviour to code you do not control?         |
| 03 | [Behavioural Patterns](./03-behavioral-patterns.md)              | How do you get branching logic out of a growing conditional? |
| 04 | [Architectural Patterns](./04-architectural-patterns.md)         | Where do the layers of a service go, so a change lands once? |
| 05 | [SOLID Principles](./05-solid-principles.md)                     | Where do the five principles help, and what do they cost?    |

## What Interviewers Probe For

The senior signal for Part I is **can reason about the runtime, not just recite the API** — and for
patterns specifically, it is *can justify a structure rather than apply one by reflex*.

- **Can you name the problem before the pattern?** "I would use a strategy here" is a weaker answer
  than "this switch will gain a branch every time we add a payment provider, and each branch touches
  the same function." The pattern is the second half of the answer, not the first.
- **Do you know the TypeScript-native form?** A strategy is often a `Record<Kind, Handler>`. A
  singleton is usually a module. An observer is frequently an `EventTarget`. Reaching for a class
  hierarchy when the language already has the mechanism is a mid-level tell.
- **Can you argue against SOLID?** Interface segregation applied literally produces a dozen
  one-method interfaces nobody reads. The senior answer applies the principle where churn actually
  happens and says why it was skipped elsewhere.
- **Do you understand dependency inversion in practice?** Not the definition — the testing
  consequence. If the module constructs its own database client, you cannot test it without one.

## Reading Order

Read 05 first if you have never had SOLID explained as anything other than an acronym; it reframes
the four chapters before it. Otherwise straight through — 01 to 03 are the GoF material, 04 is the
service-shaped version of the same ideas.

**Interview sprint:** 05 → 03 → 04. SOLID gets asked by name, behavioural patterns are the ones that
appear in real code, and architectural layering is what a design round expects you to draw.

> ⚠️ **This section is a merge target.** Improvement #26 folds `OOP/` into it, producing a single
> five-chapter section on OOP and patterns. The SOLID chapter here is the one that survives.
