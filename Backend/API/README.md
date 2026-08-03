# API Design

## Overview

An API is a promise. Once someone integrates against it, the shape of your responses is a dependency you can't refactor away — so API interviews are really design interviews wearing HTTP clothing.

This module covers the six areas that come up in almost every senior backend interview.

**What you'll cover:**

- REST conventions, idempotency, and pagination that survives scale
- GraphQL: what it fixes, and the N+1 and query-cost problems it creates
- Versioning, deprecation, and how to actually turn an old version off
- Rate limiting algorithms and distributed enforcement
- Documentation that can't drift from the code
- Real-time transports — WebSockets, SSE, and when to use neither

> **The one idea that ties it together:** design for the client you can't control. Assume every caller will retry, page forever, ask for too much, and stay on your old version for a year. The patterns in this module are all answers to that assumption.

## Topics

| #   | Topic                                                    | Core idea                                                  |
| --- | -------------------------------------------------------- | ---------------------------------------------------------- |
| 01  | [REST Best Practices](./01-rest-best-practices.md)        | Resources + HTTP methods; idempotency and cursor pagination |
| 02  | [GraphQL](./02-graphql.md)                                | One typed endpoint; DataLoader and query budgets            |
| 03  | [Versioning](./03-versioning.md)                          | Additive change first; measure before you delete            |
| 04  | [Rate Limiting](./04-rate-limiting.md)                    | Token bucket, atomic in Redis, keyed on identity            |
| 05  | [Documentation](./05-documentation.md)                    | One schema drives validation, types, and docs               |
| 06  | [WebSockets](./06-websockets.md)                          | Stateful connections; the socket is a hint, HTTP is truth   |

## How the Pieces Fit

```
        Design the contract          (01 REST or 02 GraphQL)
                  │
                  ▼
        Publish it, machine-readable (05 — spec generated, CI-checked)
                  │
                  ▼
        Protect it                   (04 — cost-based limits per identity)
                  │
                  ▼
        Evolve it                    (03 — additive, deprecate, sunset)
                  │
                  ▼
        Add push only if needed      (06 — SSE first, WebSocket if bidirectional)
```

Each step assumes the client will do the wrong thing. That's the point.

## Suggested Study Path

**Day 1 — REST fundamentals.** Read 01. You should be able to justify a resource layout, name the idempotent methods and say *why* it matters for retries, and write keyset pagination from memory.

**Day 2 — GraphQL.** Read 02. Be able to explain N+1 and DataLoader without notes, and say where authorization has to live when there's only one route.

**Day 3 — Evolution.** Read 03. Practise classifying changes as breaking or not — including the two that fool people, new enum values and changed defaults.

**Day 4 — Protection.** Read 04. Know why fixed window fails at boundaries, and why the Redis decision has to be atomic.

**Day 5 — Contract and real-time.** Read 05 and 06. For docs, the answer is always "generate from one schema, fail CI on drift". For real-time, be ready to argue *against* WebSockets.

## Interview Focus

The highest-value answers, in rough order of how often they're asked:

1. **`PUT` vs `PATCH`, and which methods are idempotent** — then why retries depend on it
2. **Pagination at scale** — offset vs cursor, and what breaks with `OFFSET 1000000`
3. **N+1 in GraphQL** — DataLoader, and why loaders are per-request
4. **REST vs GraphQL** — a tradeoff, not a winner
5. **Rate limiting across many servers** — Redis, atomicity, fail open or closed
6. **Versioning strategy** — path versioning, and how you sunset without breaking people
7. **WebSockets vs SSE** — and how a client recovers messages it missed

**Interview tip:** state the failure mode before the solution. "A client times out and retries, so the payment is charged twice — that's why I add an idempotency key" lands far better than naming the header.

## Pre-Ship API Checklist

**Contract:**

- [ ] Resources are plural nouns; verbs live in the HTTP method
- [ ] Correct status codes — never `200` with `success: false`
- [ ] One error shape everywhere, with a `traceId`
- [ ] OpenAPI (or GraphQL schema) generated from the same schema that validates requests
- [ ] Spec drift and breaking changes fail CI

**Protection:**

- [ ] `limit` capped server-side; sort and filter fields allowlisted
- [ ] Rate limits keyed on API key or user id, weighted by cost
- [ ] Strict separate limits on auth endpoints
- [ ] Authorization checks the *object*, not just the route
- [ ] Request body size limits set explicitly

**Evolution:**

- [ ] `/v1` in the path from the first deploy
- [ ] Usage metrics per version **and** per client
- [ ] `Deprecation`, `Sunset`, and `Link` headers on deprecated versions
- [ ] Changelog with dated removals and a migration guide

**Reliability:**

- [ ] `Idempotency-Key` on non-idempotent writes that matter
- [ ] Long operations return `202` plus a job resource
- [ ] Real-time clients can rebuild state over HTTP after a disconnect

## Resources

- [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) — the actual rules for methods and status codes
- [RFC 9457 — Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) — the standard error shape
- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html) — go to the source, not a tutorial
- [GraphQL Best Practices](https://graphql.org/learn/best-practices/) — official guidance
- [Stripe API Reference](https://docs.stripe.com/api) — the reference standard for REST design and docs
- [Google API Design Guide](https://cloud.google.com/apis/design) — opinionated resource modelling

## Related Topics

- **[Security](../Security/README.md)** — JWT, OAuth, CORS/CSRF, validation, headers
- **[NodeJS](../NodeJS/README.md)** — the runtime constraints behind every choice here
- **[NoSQL](../NoSQL/README.md)** — the query patterns your pagination depends on
- **[DesignPatterns](../DesignPatterns/README.md)** — layering the code behind the endpoint

---

**Difficulty:** Intermediate → Advanced · **Interview frequency:** Very High

Start with [01-rest-best-practices.md](./01-rest-best-practices.md).
