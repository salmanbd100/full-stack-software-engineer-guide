---
title: Part I — JavaScript Foundations
part: 1
chapter: 1
slug: frontend-javascript-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [javascript, closures, prototypes, event-loop, async]
in_book: true
---

# Part I — JavaScript Foundations

The section splits in two. Chapters 01–04 are the language's object model: how values are stored,
where names resolve, and what `class` compiles down to. Chapters 05–06 are the runtime: how async work
composes and fails, and the loop that schedules your callbacks.

## Chapters

| #  | Chapter                                                                | What it answers                                              |
| -- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Data Types, Variables and Built-ins](#ch-data-types-variables)        | Which values copy, which share, and which methods mutate?    |
| 02 | [Scope and Closures](#ch-closures)                                     | Where does a variable live, and why does this callback still see the old value? |
| 03 | [The `this` Keyword](#ch-this-keyword)                                 | What is `this`, working from the call site alone?            |
| 04 | [Prototypes and Inheritance](#ch-prototypes-inheritance)               | What is `class` actually doing underneath?                   |
| 05 | [Promises, Async/Await and Errors](#ch-promises-async)                 | How do you compose async work, and fail in a way that is recoverable? |
| 06 | [The Event Loop](#ch-event-loop)                                       | In what exact order will this code log?                      |

## What Interviewers Probe For

Three questions carry most of the weight in this section, on top of the part-level signal:

- **Do you know what a closure captures?** Not the definition. The consequence: which variable the
  captured reference points at, when that keeps an object alive, and why the loop-with-`var` bug
  produces the number it does.
- **Can you explain `this` from the call site?** Four rules, in precedence order, applied to code you
  are seeing for the first time. Candidates who memorised "arrow functions do not have `this`" and
  stopped there get caught by the first method-extraction example.
- **Do you treat errors as a design decision?** Swallowing a rejection, throwing a string, or losing
  the stack across an `await` boundary all show up in code review. Knowing which failures are
  recoverable and which should crash the process is a seniority marker.

## Reading Order

Straight through. Chapters 05 and 06 are a pair — a promise's callback runs where the event loop puts
it. Do not skip 06 because you have seen the diagram before.

**Interview sprint:** 02 → 03 → 06 → 05. Closures, `this`, the event loop and promise composition
account for the majority of what gets asked in the language round.
