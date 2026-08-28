# Node.js

## Overview

Node.js interviews rarely ask you to recite APIs. They probe one thing: **do you understand that your code shares a single thread with every other request?**

Almost every senior question traces back to that. Why the event loop stalls, why streams exist, why you fork workers, why an uncaught exception should crash the process — all the same constraint viewed from different angles.

**What you'll cover:**

- How the event loop schedules work, and what starves it
- Streams and buffers for data too large to hold in memory
- CommonJS vs ES Modules, and the seams between them
- Errors: which to handle, which to crash on
- Finding real bottlenecks instead of guessing
- Node-specific security: injection paths, supply chain, secrets
- Escaping the single thread with workers, child processes, and clustering

> **The idea that ties it together:** waiting is free, thinking is not. Node scales to thousands of connections because they're all idle. The moment a request needs real CPU, every other request on that process waits behind it.

## Topics

| #   | Topic                                                    | Core idea                                              |
| --- | -------------------------------------------------------- | ------------------------------------------------------ |
| 01  | [Event Loop & Async](./01-event-loop-async.md)            | Phases, microtasks, and what blocks the loop            |
| 02  | [Streams & Buffers](./02-streams-buffers.md)              | Constant memory via chunks; always `pipeline()`         |
| 03  | [Module System](./03-module-system.md)                    | CJS vs ESM, live bindings, caching, `exports`           |
| 04  | [Error Handling](./04-error-handling.md)                  | Operational → handle; programmer → crash                |
| 05  | [Performance](./05-performance.md)                        | Measure first; loop delay, N+1, caching                 |
| 06  | [Security](./06-security.md)                              | NoSQL/command injection, prototype pollution, npm       |
| 07  | [Child Processes](./07-child-processes.md)                | Worker threads for CPU, child processes for programs    |
| 08  | [Clustering](./08-clustering.md)                          | One process per core; externalise all shared state      |

## How the Pieces Fit

```text
        Single thread, single core          (01)
                    │
      ┌─────────────┴─────────────┐
      ▼                           ▼
  Don't block it              Escape it
  ├─ stream, don't buffer (02)  ├─ worker threads   (07)
  ├─ profile the real cost (05) ├─ child processes  (07)
  └─ crash on bugs, fast   (04) └─ cluster the cores(08)
                    │
                    ▼
        Everything shared moves out
        to Redis / the database      (08)
```

## Suggested Study Path

**Day 1 — The constraint.** Read 01. You should be able to order `setTimeout`, `setImmediate`, `process.nextTick`, and a promise from memory, and explain *why* that order holds. This underpins every other topic.

**Day 2 — Data and modules.** Read 02 and 03. Know why `pipeline()` beats `pipe()`, and what breaks when a chunk splits a record. For modules, know why ESM gives live bindings and CommonJS gives a copy.

**Day 3 — Failure.** Read 04. Practise stating the operational-vs-programmer distinction in one sentence, then defending "let it crash" against the obvious pushback.

**Day 4 — Production.** Read 05 and 06. Be ready to walk through diagnosing a slow endpoint from metrics down to a CPU profile.

**Day 5 — Scale.** Read 07 and 08. Know when clustering does nothing (I/O-bound work) and what silently breaks when one process becomes four.

## Interview Signals

| They ask | They're checking |
| --- | --- |
| "Explain the event loop" | Whether you know phases *and* microtask priority |
| "Is Node single-threaded?" | That you distinguish your JS from libuv's pool |
| "Why is this endpoint slow?" | Whether you measure or guess |
| "Should you catch this error?" | Judgment, not reflexive `try/catch` |
| "How do you use all 8 cores?" | Cluster vs worker vs replica — and the tradeoffs |

## Related Modules

- [Security](../Security/README.md) — JWT, OAuth, CORS/CSRF, headers, validation
- [NoSQL](../NoSQL/README.md) — MongoDB modeling and Redis
- [API](../API/) — REST, GraphQL, rate limiting, WebSockets

---

[← Back to Backend](../README.md)
