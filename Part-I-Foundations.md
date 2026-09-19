---
title: Part I — Foundations
part: 1
chapter: 0
slug: part-foundations
level: intermediate
reading_time: 3
updated: 2026-09-19
tags: [javascript, typescript, oop, design-patterns]
in_book: true
---

# Part I — Foundations

Every senior loop still opens here, and the bar moved for one specific reason: an assistant answers the
surface version of these questions instantly. Explaining what a closure is no longer scores. Explaining
why a stale closure ate a `setInterval` callback does. This part teaches the layer beneath the
definition — what the runtime does, in what order, and what it costs — and it comes first because Parts
III, IV and VII all quietly depend on it.

The three sections build on each other. JavaScript is the machine: how values are stored, where names
resolve, and when a callback actually runs. TypeScript is the description of that machine, and the
chapters treat its type system as a tool for making illegal states unrepresentable rather than as
annotation. Design patterns are what the first two look like once a codebase has forty engineers in it.

## Sections

| Section                                                    | Chapters | What it covers                                                     |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [JavaScript Foundations](#ch-frontend-javascript-index)    | 10       | The object model, closures, `this`, the event loop, error handling |
| [TypeScript](#ch-frontend-typescript-index)                | 8        | Types, generics, narrowing, utility types, scale                   |
| [OOP and Design Patterns](#ch-backend-design-patterns-index) | 5      | SOLID, composition, the patterns that survive in TypeScript        |

## What Interviewers Probe For

The senior signal for this part is **can reason about the runtime, not just recite the API.** Three
questions run through all three sections; each section index adds its own.

- **Can you predict output order?** A `setTimeout`, a resolved promise and a synchronous log. It is the
  single most reliable filter in the language round, and it tests one thing: whether you know the
  microtask queue drains completely before the next macrotask runs.
- **Do types describe the domain or decorate it?** `status: string` and
  `status: "draft" | "published"` compile identically and mean entirely different things to the next
  person to touch the file.
- **Can you name the trade-off you took?** Inheritance for two shared methods, a singleton for
  convenience, an enum where a union would do. Each is defensible; none is free.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "What logs first?" | Recites "microtasks first" | Names the queue each callback lands in, and why the microtask queue drains completely before the next timer |
| "Why generics here?" | "So it works with any type" | Which relationship between the input and the output the generic is there to preserve |
| "Class or function?" | Picks by habit | Names what the class owns that a closure would not, and what it costs at the test boundary |

## Reading Order

Straight through. The JavaScript section is the dependency for the other two: the TypeScript chapters
assume you know what a prototype is, and the pattern chapters assume both.

**Interview sprint:** JavaScript 03, 04, 06 and 07 — closures, `this`, promise composition and the event
loop — then TypeScript 03 and 06 for generics and the advanced type operators, then Design Patterns 03
for SOLID. That is the majority of what gets asked in a language round, in seven chapters.

**Skip on a second pass:** the pattern catalogue in Design Patterns 04 is a reference. Read it once,
then come back to it by name when an interviewer uses one.

> ⚠️ **Design patterns sit in `Backend/` for historical reasons, not conceptual ones.** They are Part I
> content: language-level design, in TypeScript, with no server in sight. The directory is where the
> files live; the part is where they belong.
