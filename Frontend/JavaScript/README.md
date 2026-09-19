---
title: Part I — JavaScript Foundations
part: 1
chapter: 1
slug: frontend-javascript-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [javascript, closures, prototypes, event-loop, async]
in_book: true
---

# Part I — JavaScript Foundations

The section splits in two. Chapters 01–05 are the language's object model: how values are stored,
where names resolve, and what `class` compiles down to. Chapters 06–10 are the runtime: the loop that
schedules your callbacks, the methods you reach for a hundred times a day, and how to fail honestly.

## Chapters

| #  | Chapter                                                                | What it answers                                              |
| -- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Data Types and Variables](#ch-data-types-variables)                   | Which values copy, which share, and which comparisons lie?   |
| 02 | [Functions and Scope](#ch-functions-scope)                             | Where does a variable live, and for how long?                |
| 03 | [Closures](#ch-closures)                                               | Why does this callback still see the old value?              |
| 04 | [The `this` Keyword](#ch-this-keyword)                                 | What is `this`, working from the call site alone?            |
| 05 | [Prototypes and Inheritance](#ch-prototypes-inheritance)               | What is `class` actually doing underneath?                   |
| 06 | [Promises and Async/Await](#ch-promises-async)                         | How do you compose async work without nesting it?            |
| 07 | [The Event Loop](#ch-event-loop)                                       | In what exact order will this code log?                      |
| 08 | [Array and Object Methods](#ch-array-object-methods)                   | Which of these mutates the thing you passed in?              |
| 09 | [Error Handling](#ch-javascript-error-handling)                        | How do you fail in a way that is recoverable and loggable?   |
| 10 | [Modern JavaScript](#ch-modern-javascript)                             | Which additions since ES2020 replace something in your code? |

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

Straight through. Chapters 02 and 03 are a pair — closures make no sense without scope — and
chapters 06 and 07 are the same. Do not skip 07 because you have seen the diagram before.

**Interview sprint:** 03 → 04 → 07 → 06. Closures, `this`, the event loop and promise composition
account for the majority of what gets asked in the language round.
