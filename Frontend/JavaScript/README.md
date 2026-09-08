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
| 08 | [Array and Object Methods](./08-array-object-methods.md)               | Which of these mutates the thing you passed in?             |
| 09 | [Error Handling](./09-error-handling.md)                               | How do you fail in a way that is recoverable and loggable?  |
| 10 | [Modern JavaScript](./10-modern-js.md)                                 | Which additions since ES2020 replace something in your code?|

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

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "What logs first?" | Guesses, or recites "microtasks first" | Names the queue each callback lands in and why the microtask queue drains completely first |
| "What is a closure?" | The definition | What it captures, when that keeps an object alive, and why the `var`-in-a-loop bug prints what it prints |
| "What is `this` here?" | "Arrow functions don't have `this`" | The four rules in precedence order, applied to the call site in front of them |

## Reading Order

Straight through. Chapters 02 and 03 are a pair — closures make no sense without scope — and
chapters 06 and 07 are the same. Do not skip 07 because you have seen the diagram before.

**Interview sprint:** 03 → 04 → 07 → 06. Closures, `this`, the event loop and promise composition
account for the majority of what gets asked in the language round.
