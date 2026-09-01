---
title: Part V — Backend for Frontend Engineers
part: 5
chapter: 0
slug: backend-index
level: intermediate
reading_time: 2
updated: 2026-09-01
tags: [backend, nodejs, api, sql, nosql, security]
in_book: true
---

# Part V — Backend for Frontend Engineers

This book is frontend-heavy, not frontend-only. Part V is scoped by a single question: **what does a
frontend-heavy full stack engineer actually get asked, and actually build?** That is Node's event
loop, REST and GraphQL and typed contracts, enough SQL to design a schema and read a query plan, JWT
versus sessions, and streaming endpoints — which matter far more now than they did in 2023, because
the AI features in Part VII stream by default.

It is not a backend career in a box and does not pretend to be. There is no message-broker section,
no distributed-transaction chapter, no service mesh. Those belong to a different reader. What is here
is the surface a frontend engineer owns or negotiates with, at the depth a senior interview probes.

## Sections

| Section | Chapters | What it covers |
| ------- | -------- | -------------- |
| [Node.js](./NodeJS/README.md) | 6 | The event loop, streams, modules, errors, performance, scaling |
| [API Design](./API/README.md) | 5 | REST, GraphQL, versioning and contracts, rate limiting, real-time |
| [SQL and Relational Data](./SQL/README.md) | 5 | Schema design, indexes and plans, transactions, ORMs, migrations |
| [NoSQL and Caching](./NoSQL/README.md) | 4 | Document modelling, aggregation, indexing, Redis |
| [Security](./Security/README.md) | 6 | Sessions and JWTs, OAuth, passwords, authorisation, CORS/CSRF, injection |
| [Testing](./Testing/README.md) | 2 | Backend-specific testing; the discipline itself is Part IV |

`Backend/DesignPatterns/` also lives in this tree, but it belongs to **Part I** — patterns are
language material, not backend material, and `scripts/lib/book.ts` maps it accordingly.

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow.** Both halves matter, and candidates usually have only one:

- **Can you design an endpoint the client will not have to work around?** Over-fetching, chatty
  round-trips, and pagination that breaks when a row is inserted are all API design failures that
  land on the frontend. Having been on the receiving end is an advantage here — use it.
- **Do you understand the event loop as a constraint?** One thread. A synchronous JSON parse of a
  large body blocks every other request on the process. This is the Node question that separates
  people who have run a service from people who have written one.
- **Can you read a query plan?** Not optimise from memory — read one, and point at the line that
  is the problem. Reaching for `EXPLAIN ANALYZE` before guessing answers most of this.
- **Where does the token live and why?** Sessions against JWTs is the most reliably asked auth
  question, and the answer is a trade-off — revocation against scale — not a preference.

## Reading Order

`NodeJS/` → `API/` → `SQL/` → `Security/`. That is the order the material builds in, and it is also
roughly the order a full stack loop asks about it. `NoSQL/` and `Testing/` are self-contained and can
be read whenever they are relevant.

**Interview sprint:** `NodeJS/01` (the event loop), `API/01` (REST) and `API/02` (GraphQL),
`SQL/03` (indexes), `Security/01` (JWT). Those five carry most of what a frontend-heavy full stack
interview asks on the backend.
