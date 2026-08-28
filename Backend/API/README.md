---
title: Part V — API Design
part: 5
chapter: 0
slug: backend-api-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [api, rest, graphql, versioning, websockets]
in_book: true
---

# Part V — API Design

This is the section a frontend engineer has the most standing to be opinionated about, because you
have spent years consuming the results of other people's decisions here. Every awkward client-side
workaround — the waterfall of three requests, the pagination that skips a row, the field that is
sometimes `null` and sometimes absent — started as an API design choice.

The section covers the contract itself, then the operational concerns that turn a working endpoint
into one that survives production: versioning without breaking clients, rate limiting that works
across instances, documentation that cannot drift, and the real-time transports.

## Chapters

| #  | Chapter                                                    | What it answers                                                    |
| -- | ---------------------------------------------------------- | ------------------------------------------------------------------ |
| 01 | [REST API Best Practices](./01-rest-best-practices.md)     | Can another engineer guess this API before reading the docs?       |
| 02 | [GraphQL](./02-graphql.md)                                 | How do you stop the resolver chain melting your database?          |
| 03 | [API Versioning](./03-versioning.md)                       | Is this change breaking, and can you avoid a new version entirely? |
| 04 | [Rate Limiting](./04-rate-limiting.md)                     | Which algorithm, and how does it work across every instance?       |
| 05 | [API Documentation](./05-documentation.md)                 | How do you keep docs true without maintaining them?                |
| 06 | [WebSockets](./06-websockets.md)                           | Socket, SSE or polling — and how does it scale past one process?   |

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow.** The API half shows up as:

- **Can you defend your status codes?** 400 against 422, 401 against 403, and what you return in the
  body of a failure. It sounds pedantic and it is the fastest way to tell whether someone has
  designed an API or only consumed one.
- **Do you know the N+1 problem in GraphQL?** A nested field resolved per parent row is the standard
  GraphQL performance failure. Naming DataLoader, or batching generally, is the expected follow-up.
- **How do you paginate?** Offset pagination duplicates and skips rows under concurrent writes.
  Cursor pagination does not. Knowing why is the actual question.
- **REST or GraphQL — on what grounds?** The answer that scores names client diversity, over-fetching
  cost, caching, and who owns the schema. The answer that does not is "GraphQL is more flexible."
- **Where do you rate-limit?** In-process counters break the moment you run two instances. A shared
  store is the answer, and knowing that is the difference between a design and a demo.

## Reading Order

01 first — it is the strongest chapter in the section and sets the vocabulary. Then 02, then 03. The
last three are operational and can be read in any order when they become relevant.

**Interview sprint:** 01 → 02 → 04. REST design, the GraphQL trade-off and the distributed
rate-limiting question are the three that come up reliably.

> ⚠️ WebSockets are documented here **and** in `SystemDesign/BuildingBlocks/`. Improvement #31
> deduplicates the two; expect overlap until it lands.
