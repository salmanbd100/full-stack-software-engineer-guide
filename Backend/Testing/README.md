---
title: Part V — Backend Testing
part: 5
chapter: 0
slug: part-backend-testing
level: intermediate
reading_time: 2
updated: 2026-09-08
tags: [testing, integration, nodejs, backend]
in_book: true
---

# Part V — Backend Testing

One chapter, deliberately. The discipline of testing — the pyramid, arrange-act-assert, the
vocabulary of test doubles, when TDD helps, how to stop a suite going flaky — is covered by
[Chapter ?? — Testing Strategy](#ch-testing-strategy) in Part IV and applies unchanged on the
server. Repeating it here would be duplication rather than depth.

What is genuinely different on a backend is the shape of the pyramid and the nature of the
dependencies. Most of a service's behaviour lives in its integration with a database and an HTTP
boundary, not in its pure functions, so the weight shifts downward and the isolation problem becomes
the thing that decides whether the suite is usable.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Testing a Node Service](./01-testing-node-services.md) | What is worth unit testing, and how do you use a real database and stay fast? |

## What Interviewers Probe For

- **What you do *not* test.** Naming controllers-with-a-mocked-database as low value is a stronger
  signal than reciting the pyramid.
- **Injection against module mocking.** Why `vi.mock` is the exception rather than the default.
- **Why not SQLite in place of Postgres.** Different engine, different semantics — the differences
  are what the test exists to catch.
- **Isolation strategy.** Transaction rollback, truncation, or a schema per worker, and the tradeoff
  each carries.
- **A test that passes locally and fails in CI.** The answer is almost always shared state or
  ordering.

## Reading Order

One chapter, read alongside Part IV's testing strategy chapter, which it assumes rather than repeats.

**Interview sprint:** from "Through the real HTTP layer" onwards. The isolation answer separates
candidates who have run an integration suite from candidates who have read about one.
