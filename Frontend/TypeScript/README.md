---
title: Part I — TypeScript
part: 1
chapter: 0
slug: frontend-typescript-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [typescript, generics, narrowing, utility-types, react]
in_book: true
---

# Part I — TypeScript

TypeScript is where a senior candidate separates from a mid-level one fastest, because the mid-level
answer is "I add types" and the senior answer is "I add the type that makes the wrong state
unrepresentable, and I let inference do the rest." This section covers the type system as a design
tool: what to model, what to derive, and where the cleverness stops paying for itself.

Chapters 01–04 are the everyday type system — annotate, model, reuse. Chapters 05–07 are narrowing
and exhaustiveness, which is where types start catching real bugs. Chapter 08 applies all of it to
React, which is where most readers use TypeScript in anger.

## Chapters

| #  | Chapter                                                        | What it answers                                              |
| -- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [TypeScript Basic Types](./01-basic-types.md)                  | What do `any`, `unknown` and `never` each cost you?          |
| 02 | [Interfaces and Type Aliases](./02-interfaces-types.md)        | On what two grounds do they actually differ?                 |
| 03 | [TypeScript Generics](./03-generics.md)                        | How do you keep the caller's exact type all the way through? |
| 04 | [TypeScript Utility Types](./04-utility-types.md)              | How do you derive a type instead of maintaining two?         |
| 05 | [TypeScript Type Guards](./05-type-guards.md)                  | How do you get a compile error when you forget a case?       |
| 06 | [TypeScript Advanced Types](./06-advanced-types.md)            | When does computing types from types stop being worth it?    |
| 07 | [Enums and Literal Types](./07-enums-literals.md)              | How do you model a fixed set without a runtime object?       |
| 08 | [React with TypeScript](./08-react-typescript.md)              | How do you type props and hooks so the compiler earns its keep? |

## What Interviewers Probe For

The senior signal for this part is the same as for the rest of Part I — **can reason about the
runtime, not just recite the API** — with a compile-time twist. What that looks like in practice:

- **Do you know where types stop?** TypeScript erases at runtime. A candidate who validates an API
  response with an `as` cast and calls it type-safe has answered the question badly. The follow-up is
  always "what happens when the server sends something else?"
- **Can you narrow properly?** Discriminated unions plus an exhaustive `switch` with a `never` default
  is the pattern interviewers are listening for. It converts a future bug into a build failure.
- **Do you reach for generics for the right reason?** A generic that appears once in the signature is
  usually an `any` with extra steps. A generic that links an argument to a return type is doing work.
- **Do you know when to stop?** Conditional and mapped types can express almost anything, and a type
  nobody on the team can read is a liability. Naming the cost is the senior part of the answer.
- **`unknown` or `any`?** `any` switches the checker off and spreads silently through every value it
  touches. `unknown` forces a narrowing step at the boundary, which is exactly where you want one.
  Reaching for `unknown` by default on external data is a small, reliable seniority marker.
- **What does `strict` actually turn on?** `strictNullChecks` is the one that matters, and a codebase
  without it has types that quietly lie about every optional value. Knowing that migration is
  incremental — file by file — is the follow-up.

## Reading Order

Straight through, but 02 and 07 are short and can be skimmed if you already write TypeScript daily.
Chapter 05 is the one to slow down on — narrowing is what makes the rest useful.

**Interview sprint:** 03 → 05 → 04 → 08. Generics, narrowing, derived types, and typing a component
between them cover almost every TypeScript question a frontend-heavy loop asks.
