---
title: Part V — Backend Testing
part: 5
chapter: 0
slug: part-backend-testing
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [testing, tdd, mocking, integration, e2e]
in_book: true
---

# Part V — Backend Testing

Testing questions in a senior interview are rarely about a framework. They are about judgement: what
you choose to test, what you deliberately do not, and how you keep a suite fast enough that people
still run it. This section is organised around that — the three layers of the pyramid first, then the
practices that decide whether a suite stays useful after a year.

TypeScript throughout. The examples use the vocabulary shared by Jest and Vitest, because the ideas
survive the choice and the API does not.

## Chapters

| #  | Chapter                                                | What it answers                                                 |
| -- | ------------------------------------------------------ | ---------------------------------------------------------------- |
| 01 | [Unit Testing](./01-unit-testing.md)                   | What is the unit, and what belongs outside it?                    |
| 02 | [Integration Testing](./02-integration.md)             | Where do the real bugs live, and how do you reach them?           |
| 03 | [End-to-End Testing](./03-e2e.md)                      | How few E2E tests can you get away with?                          |
| 04 | [Test-Driven Development](./04-tdd.md)                 | When does writing the test first actually help?                   |
| 05 | [Mocking and Stubbing](./05-mocking.md)                | What should you mock, and what does mocking cost you?             |
| 06 | [Testing Best Practices](./06-best-practices.md)       | Why does a green suite stop catching regressions?                 |

## What Interviewers Probe For

- **Do you test behaviour or implementation?** A test that breaks when you rename a private method
  was testing the wrong thing. This is the fastest way to tell a senior answer from a junior one.
- **Can you justify the shape of the pyramid?** Not recite it. Say why the integration layer is where
  most of the value sits for a service that mostly moves data between an API and a database.
- **Do you know what mocking costs?** Every mock is a claim about how a dependency behaves, and that
  claim silently rots. A candidate who volunteers this without prompting is signalling experience.
- **What do you do about a flaky test?** The wrong answers are "retry it" and "delete it". The right
  answer starts with finding the shared state.

## Reading Order

01 → 02 → 03 gives you the pyramid bottom-up. 05 and 06 are the two that change how you write tests;
04 is worth reading even if you do not practise TDD, because the interview question is about when it
pays rather than whether you do it.

**Interview sprint:** 01 → 05 → 06.
