---
title: Part V — Backend Testing
part: 5
chapter: 0
slug: part-backend-testing
level: intermediate
reading_time: 2
updated: 2026-09-01
tags: [testing, integration, nodejs, backend]
in_book: true
---

# Part V — Backend Testing

Two chapters, deliberately. The discipline of testing — the pyramid, arrange-act-assert, the
vocabulary of test doubles, when TDD helps, how to stop a suite going flaky — is covered in
[Part IV](../../Frontend/Testing/README.md) and applies unchanged on the server. Repeating it here
would be duplication rather than depth.

What is genuinely different on a backend is the shape of the pyramid and the nature of the
dependencies. Most of a service's behaviour lives in its integration with a database and an HTTP
boundary, not in its pure functions, so the weight shifts downward and the isolation problem becomes
the thing that decides whether the suite is usable.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Testing a Node Service](./01-unit-testing.md) | What is worth unit testing, and what tests only your mocks? |
| 02 | [Integration Testing a Service](./02-integration.md) | How do you use a real database and stay fast? |

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

01 then 02. Both are short, and 02 is where the value is.

**Interview sprint:** 02, plus Part IV's testing fundamentals chapter.
