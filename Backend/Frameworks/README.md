---
title: Part V — Node Frameworks
part: 5
chapter: 0
slug: backend-frameworks-index
level: intermediate
reading_time: 2
updated: 2026-09-07
tags: [express, nestjs, hono, edge, frameworks, backend]
in_book: true
---

# Part V — Node Frameworks

`NodeJS/` is the runtime and `API/` is the contract. This section is the layer between them: the thing
that turns a socket into a handler, and the choice you are asked to defend when someone says "why
Express?"

Three chapters, and they are deliberately three points on one axis — **how much structure the
framework imposes, and what it assumes about the runtime.** Express imposes almost none and assumes
Node. NestJS imposes a lot and assumes Node. Hono imposes little and assumes Web standards, which is
what lets it leave Node entirely. Knowing where a framework sits on that axis is most of the interview
answer; the API details are the easy half.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Express](#ch-express) | What is actually happening between the socket and the handler? |
| 02 | [NestJS](#ch-nestjs) | What does a dependency-injection container buy, and when is it overhead? |
| 03 | [Edge Runtimes and Hono](#ch-edge-runtimes) | Which Node APIs disappear at the edge, and when is moving there a win? |

Fastify appears in the comparison tables and does not get a chapter. Its argument — schema-driven
routes and faster serialisation — is a throughput optimisation rather than a different model, and
interviews for frontend-heavy roles ask about the model.

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow.** In this section it narrows to three questions:

- **Can you defend the framework choice on team size rather than taste?** "NestJS is more
  professional" scores nothing. "Five teams, a service with a five-year horizon, and enforced module
  boundaries are worth the decorators" scores well.
- **Do you know where the request pipeline puts each concern?** Ordering bugs — a body parser below a
  route, a guard that trusts an unvalidated body — are the most common real failures in both
  frameworks, and both come from not holding the order in your head.
- **Can you name a constraint rather than a benefit?** The edge answer that scores is the one about
  the database hop getting longer, not the one about cold starts getting shorter.

## Reading Order

01 → 02 → 03. Chapter 01 sets the baseline both others are argued against, and 02 and 03 are each
independently readable once you have it.

**Interview sprint:** 01, then the "When to Use It" table in 02 and the latency diagram in 03. Those
three cover the framework-choice question in every form it gets asked.
