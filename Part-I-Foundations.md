---
title: Part I — Foundations
part: 1
chapter: 0
slug: part-foundations
level: intermediate
reading_time: 3
updated: 2026-09-24
tags: [javascript, typescript, oop, design-patterns]
in_book: true
---

# Part I — Foundations

Every senior interview loop still opens here, but the bar has moved. An AI assistant now answers the
surface version of these questions instantly. Explaining what a closure is no longer scores. Explaining
why a stale closure broke a `setInterval` callback does. This part teaches the layer beneath the
definition: what the runtime does, in what order, and what it costs. It comes first because Parts
III, IV and VII all depend on it.

The three sections build on each other. JavaScript is the machine: how it stores values, where names
resolve, and when a callback actually runs. TypeScript describes that machine. These chapters treat
its type system as a tool that makes illegal states impossible to write, not as annotation. Design
patterns are what the first two look like once forty engineers work in the same codebase.

## Sections

| Section                                                    | Chapters | What it covers                                                     |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [JavaScript Foundations](#ch-frontend-javascript-index)    | 6        | The object model, closures, `this`, promises and errors, the event loop |
| [TypeScript](#ch-frontend-typescript-index)                | 6        | Types, generics, narrowing, utility types, scale                   |
| [OOP and Design Patterns](#ch-backend-design-patterns-index) | 3      | OOP and composition, SOLID, the patterns that survive in TypeScript |

## What Interviewers Probe For

The senior signal for this part is **can reason about the runtime, not just recite the API.** Three
questions run through all three sections, and each section index adds its own.

- **Can you predict output order?** A `setTimeout`, a resolved promise and a synchronous log. It is the
  most reliable filter in the language round. It tests one thing: whether you know the microtask
  queue empties completely before the next macrotask (a timer or I/O callback) runs.
- **Do types describe the domain or decorate it?** `status: string` and
  `status: "draft" | "published"` compile to the same code. To the next person who touches the file,
  they mean very different things.
- **Can you name the trade-off you took?** Inheritance for two shared methods, a singleton for
  convenience, an enum where a union would do. Each is defensible; none is free.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "What logs first?" | Recites "microtasks first" | Names the queue each callback lands in, and why the microtask queue drains completely before the next timer |
| "Why generics here?" | "So it works with any type" | Which relationship between the input and the output the generic is there to preserve |
| "Class or function?" | Picks by habit | Names what the class owns that a closure would not, and what it costs at the test boundary |

## Reading Order

Straight through. The other two sections depend on the JavaScript one. The TypeScript chapters
assume you know what a prototype is, and the pattern chapters assume both.

**Interview sprint:** start with JavaScript 02, 03, 05 and 06: closures, `this`, promise composition
and the event loop. Then read TypeScript 03 and 05 for generics and the advanced type operators. Finish
with Design Patterns 02 for SOLID. Those seven chapters cover most of what a language round asks.

**Skip on a second pass:** the pattern catalogue in Design Patterns 03 is a reference. Read it once,
then come back to it by name when an interviewer uses one.

> ⚠️ **Design patterns sit in `Backend/` for historical reasons, not conceptual ones.** They are Part I
> content: language-level design, in TypeScript, with no server in sight. The directory is where the
> files live. The part is where they belong.
