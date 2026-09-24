---
title: Part V — Backend for Frontend Engineers
part: 5
chapter: 0
slug: backend-index
level: intermediate
reading_time: 2
updated: 2026-09-24
tags: [backend, nodejs, frameworks, api, sql, nosql, security]
in_book: true
---

# Part V — Backend for Frontend Engineers

This book is frontend-heavy, not frontend-only. Part V is scoped by a single question: **what does a
frontend-heavy full stack engineer actually get asked, and actually build?** That is Node's event
loop, Express and the frameworks built on it, REST and GraphQL and typed contracts, enough SQL to
design a schema and read a query plan, JWT versus sessions, and streaming endpoints — which matter far more now than they did in 2023, because
the AI features in Part VII stream by default.

It is not a backend career in a box and does not pretend to be. There is no message-broker section,
no distributed-transaction chapter, no service mesh. Those belong to a different reader. What is here
is the surface a frontend engineer owns or negotiates with, at the depth a senior interview probes.

## Sections

| Section | Chapters | What it covers |
| ------- | -------- | -------------- |
| [Node.js](#ch-backend-nodejs-index) | 3 | The event loop and errors, performance and streams, Express and edge runtimes |
| [API Design](#ch-backend-api-index) | 5 | REST and versioning, GraphQL and tRPC, rate limiting, real-time, testing the service |
| [SQL and Relational Data](#ch-part-sql-and-relational-data) | 3 | Schema design, indexes, plans and ORMs, transactions |
| [NoSQL and Caching](#ch-backend-nosql-index) | 1 | Picking a non-relational store: documents and Redis |
| [Security](#ch-backend-security-index) | 3 | Credentials, sessions, CORS and CSRF, OAuth and authorisation, validation |

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

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "REST or GraphQL?" | "GraphQL, it's more flexible" | "How many clients, how different are their data needs, who owns the schema, and what happens to HTTP caching" |
| "This endpoint is slow" | "Add an index" | "`EXPLAIN ANALYZE` first — and here is the line in the plan that is the problem" |
| "Sessions or JWTs?" | "JWTs, they're stateless" | "Stateless scales and cannot be revoked; that trade decides it, and refresh-token rotation is how you buy some of it back" |

## Reading Order

`NodeJS/` → `API/` → `SQL/` → `Security/`. That is the order the material builds in, and it is also
roughly the order a full stack loop asks about it. `NoSQL/` is self-contained and can be read whenever
it is relevant.

**Interview sprint:** `NodeJS/01` (the event loop), `NodeJS/03` (Express), `API/01` (REST) and
`API/02` (GraphQL), `SQL/02` (indexes), `Security/01` (credentials and sessions). Those six carry
most of what a frontend-heavy full stack interview asks on the backend.
