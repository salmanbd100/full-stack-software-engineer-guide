---
title: Part I — JavaScript Foundations
part: 1
chapter: 0
slug: frontend-javascript-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [javascript, closures, prototypes, event-loop, async]
in_book: true
---

# Part I — JavaScript Foundations

Every senior loop still opens here, and the bar moved for one specific reason: an assistant answers
the surface version of these questions instantly. Explaining *what* a closure is no longer scores.
Explaining why a stale closure ate your `setInterval` callback does. This section teaches the layer
beneath the definition — what the runtime does, in what order, and what it costs.

The section splits in two. Chapters 01–05 are the language's object model: how values are stored,
where names resolve, and what `class` compiles down to. Chapters 06–10 are the runtime: the loop that
schedules your callbacks, the methods you reach for a hundred times a day, and how to fail honestly.

## Chapters

| #  | Chapter                                                                | What it answers                                             |
| -- | ---------------------------------------------------------------------- | ----------------------------------------------------------- |
| 01 | [Data Types and Variables](./01-data-types-variables.md)               | Which values copy, which share, and which comparisons lie?  |
| 02 | [Functions and Scope](./02-functions-scope.md)                         | Where does a variable live, and for how long?               |
| 03 | [Closures](./03-closures.md)                                           | Why does this callback still see the old value?             |
| 04 | [The `this` Keyword](./04-this-keyword.md)                             | What is `this`, working from the call site alone?           |
| 05 | [Prototypes and Inheritance](./05-prototypes-inheritance.md)           | What is `class` actually doing underneath?                  |
| 06 | [Promises and Async/Await](./06-promises-async.md)                     | How do you compose async work without nesting it?           |
| 07 | [The Event Loop](./07-event-loop.md)                                   | In what exact order will this code log?                     |
| 08 | [ES2015 and Later Features](./08-es6-features.md)                      | What did each modern form replace, and why does that matter?|
| 09 | [Array and Object Methods](./09-array-object-methods.md)               | Which of these mutates the thing you passed in?             |
| 10 | [Error Handling](./10-error-handling.md)                               | How do you fail in a way that is recoverable and loggable?  |

## What Interviewers Probe For

The senior signal for this part is **can reason about the runtime, not just recite the API.** Four
questions carry most of the weight:

- **Can you predict output order?** The event loop question — a `setTimeout`, a resolved promise and
  a synchronous log — is the single most reliable filter in the round. It is not a trivia question.
  It tests whether you know that the microtask queue drains completely before the next macrotask.
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
