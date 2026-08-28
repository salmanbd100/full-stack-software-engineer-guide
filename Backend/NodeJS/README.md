---
title: Part V — Node.js
part: 5
chapter: 0
slug: backend-nodejs-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [nodejs, event-loop, streams, modules, performance]
in_book: true
---

# Part V — Node.js

One thread runs your JavaScript. Everything in this section follows from that. How thousands of
connections are served by it, what stalls it, how to move work off it, and how to run more than one
of it — those are the four questions, and they are also most of what a senior Node interview asks.

The section deliberately teaches the runtime rather than a framework. Express appears in examples
because it is the most common answer, but nothing here depends on it. A candidate who knows what
`libuv` is doing underneath can pick up any framework in an afternoon; the reverse is not true.

## Chapters

| #  | Chapter                                                            | What it answers                                                 |
| -- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| 01 | [The Node.js Event Loop](./01-event-loop-async.md)                 | How does one thread serve thousands of connections?             |
| 02 | [Streams and Buffers](./02-streams-buffers.md)                     | How do you process a file larger than your memory?              |
| 03 | [The Node.js Module System](./03-module-system.md)                 | Which rules apply where CommonJS and ES modules meet?           |
| 04 | [Node.js Error Handling](./04-error-handling.md)                   | Which failures are recoverable, and which should crash?         |
| 05 | [Node.js Performance](./05-performance.md)                         | Where is the bottleneck actually?                               |
| 06 | [Node.js Security](./06-security.md)                               | Which injection paths does a Node service invent?               |
| 07 | [Child Processes and Worker Threads](./07-child-processes.md)      | How do you move CPU-bound work off the main thread?             |
| 08 | [Clustering and Scaling](./08-clustering.md)                       | What breaks the moment there is more than one process?          |

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow.** For Node specifically, the runtime half:

- **Can you explain the phases?** Timers, pending callbacks, poll, check, close — and where
  `process.nextTick` and promise microtasks sit relative to all of them. This is asked constantly and
  answered vaguely.
- **What blocks the loop?** Synchronous crypto, a large `JSON.parse`, a regular expression with
  catastrophic backtracking, or a tight loop over a big array. Being able to name a real one you hit
  is worth more than the list.
- **When would you reach for a worker thread instead of a child process?** Shared memory and no
  serialisation cost against full isolation. If the answer is "they are basically the same", the
  candidate has used neither.
- **What state cannot survive clustering?** In-memory sessions, in-memory rate limits, in-memory
  caches, and any `setInterval` that assumes it is the only one. This is the question that reveals
  whether someone has actually scaled a Node service horizontally.

## Reading Order

01 first and properly — it is the chapter the other seven refer back to. Then 02 and 04, which are
the two that most affect code you write daily. 07 and 08 are a pair about doing more than one thing
at once, and read best together.

**Interview sprint:** 01 → 04 → 08. The event loop, error strategy and what breaks under clustering
are the three Node questions a senior full stack loop reliably asks.
