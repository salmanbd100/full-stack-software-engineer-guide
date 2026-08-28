---
title: Part VI — Microservices
part: 6
chapter: 0
slug: part-microservices
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [system-design, microservices, resilience, observability]
in_book: true
---

# Part VI — Microservices

A frontend-heavy full stack engineer rarely owns a service mesh, but is asked about one constantly —
because the shape of the backend decides what the frontend has to cope with. Chatty services become
waterfall requests. Independent deploys become version skew in the browser. A missing circuit breaker
becomes a spinner that never resolves.

That is the angle this section takes: microservices as a set of tradeoffs whose costs land partly on
the client, not as an architecture to advocate for.

## Chapters

| #  | Chapter                                                          | What it answers                                              |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Microservices Architecture](./01-architecture.md)                | When is the coordination cost worth paying?                   |
| 02 | [Service Discovery](./02-service-discovery.md)                    | How does a service find the one it needs?                     |
| 03 | [API Gateway Pattern](./03-api-gateway.md)                        | What belongs at the edge, and what does not?                  |
| 04 | [Service Communication](./04-communication.md)                    | Synchronous or event-driven — what does this call need?       |
| 05 | [Data Management](./05-data-management.md)                        | Who owns the data when there is no shared database?           |
| 06 | [Deployment Strategies](./06-deployment.md)                       | Blue-green, canary or rolling — and how do you get back?      |
| 07 | [Monitoring and Observability](./07-monitoring.md)                | How do you trace one user's request across nine services?     |
| 08 | [Resilience Patterns](./08-resilience.md)                         | How does one slow service avoid taking down the rest?         |

## What Interviewers Probe For

- **Do you know when *not* to?** The strongest answer to "would you use microservices here" is
  usually no, with a reason. A monolith with clean module boundaries beats a distributed one.
- **Can you talk about data ownership?** Splitting services is easy; splitting the database is the
  hard part, and it is where most real migrations stall. Sagas, eventual consistency and the outbox
  pattern are the vocabulary here.
- **What happens when a dependency is slow?** Not down — *slow*. Timeouts, bulkheads and circuit
  breakers exist for this case, and it is the one candidates forget.
- **How do you debug it?** A distributed system without correlation IDs and distributed tracing is
  not debuggable, and saying so unprompted signals someone who has been on call.

## Reading Order

01 → 04 → 05 is the argument: why split, how the pieces talk, and what happens to the data. 08 is the
chapter most worth internalising, because resilience questions come up in frontend rounds too.

**Interview sprint:** 01 → 05 → 08.
