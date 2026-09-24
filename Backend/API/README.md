---
title: Part V — API Design
part: 5
chapter: 5
slug: backend-api-index
level: intermediate
reading_time: 2
updated: 2026-09-24
tags: [api, rest, graphql, versioning, realtime, trpc]
in_book: true
---

# Part V — API Design

This is the section a frontend engineer has the most standing to be opinionated about, because you
have spent years consuming other people's decisions here. Every awkward client-side workaround — the
waterfall of three requests, the pagination that skips a row, the field that is sometimes `null` and
sometimes absent — started as an API design choice.

It covers the contract itself, then the operational concerns that turn a working endpoint into one
that survives production: evolving it without breaking clients, limiting what one caller can cost
you, and pushing data the client did not ask for.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [REST Best Practices and Versioning](#ch-rest-best-practices) | Can another engineer guess this API before reading the docs, and is this change breaking? |
| 02 | [GraphQL, tRPC and Typed API Choices](#ch-graphql) | Where does the contract live, and how do you stop the resolver chain melting your database? |
| 03 | [Rate Limiting](#ch-rate-limiting) | Which algorithm, and how does it work across every instance? |
| 04 | [Real-Time and Streaming APIs](#ch-realtime-streaming) | SSE or a socket, and what does the upgrade throw away? |
| 05 | [Testing a Node Service](#ch-testing-node-services) | What is worth unit testing, and how do you use a real database and stay fast? |

Chapter 05 was its own *Testing* section until #100. The testing discipline itself is Part IV.

## What Interviewers Probe For

The senior signal for this part is **designs an API the frontend can actually consume well, and knows
why the query is slow.** The API half shows up as:

- **Can you defend your status codes?** 401 against 403, 404 against 403, and what the failure body
  contains. It sounds pedantic and it is the fastest way to tell whether someone has designed an API
  or only consumed one.
- **Do you know the N+1 problem in GraphQL?** A nested field resolved per parent row is the standard
  failure. Naming DataLoader, or batching generally, is the expected follow-up.
- **How do you paginate?** Offset pagination duplicates and skips rows under concurrent writes;
  cursor pagination does not. Knowing why is the actual question.
- **REST or GraphQL — on what grounds?** A scoring answer names client diversity, over-fetching,
  caching and schema ownership. "GraphQL is more flexible" does not.
- **Where do you rate-limit?** In-process counters break the moment there are two instances.
- **Is your typed API type-safe in production?** Inference is checked at build time against your
  working tree. The scoring answer names the deployed-server-behind-the-client failure.

## Reading Order

01 first — it sets the vocabulary the rest of the section uses. Then 02. The last three are
operational or situational and can wait until they become relevant.

**Interview sprint:** 01 → 02 → 03.
