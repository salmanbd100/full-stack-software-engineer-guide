---
title: Part V — Node.js
part: 5
chapter: 1
slug: backend-nodejs-index
level: intermediate
reading_time: 2
updated: 2026-09-24
tags: [nodejs, event-loop, streams, performance, scaling]
in_book: true
---

# Part V — Node.js

Node is the runtime a frontend-heavy engineer is most likely to be asked to reason about at depth,
because it is the one place where the language you already know meets a genuinely different
execution model. The questions are not about APIs. They are about what happens to nine hundred other
requests while yours is parsing a large JSON body.

This section covers the runtime's mechanics and its error path, then how to use more than one core,
and last the framework most services are written in.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [The Node.js Event Loop, Async and Errors](#ch-event-loop-async) | How does one thread serve thousands of connections, and which failures do you restart for? |
| 02 | [Node.js Performance, Streams and Scaling](#ch-nodejs-performance) | Where did the 400 ms go, how do you move data you cannot hold in memory, and do you need more loops? |
| 03 | [Express, Hono and Edge Runtimes](#ch-express) | A long-lived Node server, or Web-standard handlers that run at the edge? |

Chapter 03 was its own *Node Frameworks* section until #100. NestJS and the module system left the book
in the same cut.

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

01 first, always — every later chapter assumes it. 02 and 03 are independent of each other.

**Interview sprint:** 01 → 03 → 02.
