---
title: Part V — Node.js
part: 5
chapter: 0
slug: backend-nodejs-index
level: intermediate
reading_time: 2
updated: 2026-09-01
tags: [nodejs, event-loop, streams, performance, scaling]
in_book: true
---

# Part V — Node.js

Node is the runtime a frontend-heavy engineer is most likely to be asked to reason about at depth,
because it is the one place where the language you already know meets a genuinely different
execution model. The questions are not about APIs. They are about what happens to nine hundred other
requests while yours is parsing a large JSON body.

This section covers the runtime's mechanics, then the two things every production service needs from
it: a single error path, and a way to use more than one core.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [The Event Loop and Async Node](./01-event-loop-async.md) | How does one thread serve thousands of connections? |
| 02 | [Streams and Buffers](./02-streams-buffers.md) | How do you move data you cannot hold in memory? |
| 03 | [The Module System](./03-module-system.md) | Why does this import work and the next one throw? |
| 04 | [Error Handling in Node](./04-error-handling.md) | Which failures do you answer, and which do you restart for? |
| 05 | [Node.js Performance](./05-performance.md) | Where did the 400 ms actually go? |
| 06 | [Scaling a Node Process](./06-scaling-node.md) | Worker threads or replicas, and what breaks when you fork? |

## What Interviewers Probe For

- **Microtask ordering.** `setTimeout` against `setImmediate` against `process.nextTick` — the
  reliable answer names the loop's phases rather than memorising an output.
- **What blocking looks like.** Being able to point at a line and say "that stalls every other
  request" is the whole test.
- **Backpressure.** Streams are asked about because ignoring `write()`'s return value is an
  unbounded memory leak, and most candidates have never had to know.
- **Operational against programmer errors.** Whether you keep the process alive after an uncaught
  exception, and why not.
- **Statelessness.** Turning on clustering breaks in-memory sessions, counters and cron jobs. Naming
  that list unprompted is a strong signal.

## Reading Order

01 first, always — every later chapter assumes it. Then 04, which every service needs. 02, 05 and 06
are independent of each other; 03 can be read whenever an import breaks.

**Interview sprint:** 01 → 04 → 06.
