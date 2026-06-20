# Frontend Testing — Interview Prep

Testing is a core skill for senior frontend roles. Interviewers want proof you can write reliable, maintainable code and reason about quality. This guide covers every test type you'll be asked about, with **TypeScript** examples and **Vitest** as the runner.

> **Why Vitest, not Jest?** Vitest is the modern default for Vite/React/Vue/Svelte projects — faster, native TypeScript and ESM, and Jest-compatible API. Mocking uses `vi` instead of `jest`. Everything you know from Jest transfers.

## 🎯 What Interviewers Look For

- ✅ Knowing **which test type** fits which problem
- ✅ Testing **behavior**, not implementation details
- ✅ Writing **isolated, non-flaky** tests
- ✅ Mocking the **network**, not your own code
- ✅ Understanding coverage limits and real quality signals

## 📚 Topics

| #   | File                                                       | Focus |
| --- | ---------------------------------------------------------- | ----- |
| 01  | [Testing Fundamentals](./01-testing-fundamentals.md)       | All test types, pyramid vs trophy, AAA, test doubles, coverage |
| 02  | [Vitest Basics](./02-vitest-basics.md)                     | Config, matchers, mocking (`vi`), fake timers, snapshots |
| 03  | [React Testing Library](./03-react-testing-library.md)     | Queries, `userEvent`, async, hooks, custom render |
| 04  | [Integration Testing](./04-integration-testing.md)         | Component + state + network with MSW |
| 05  | [E2E Testing](./05-e2e-testing.md)                          | Playwright, Page Object Model, auth state, CI |
| 06  | [Test-Driven Development](./06-test-driven-development.md)  | Red-Green-Refactor, BDD |
| 07  | [Specialized Testing](./07-specialized-testing.md)         | Snapshot, visual regression, a11y, performance, contract, mutation |
| 08  | [Best Practices](./08-best-practices.md)                    | Organization, isolation, flaky tests, anti-patterns |

## 🧭 The Types of Testing at a Glance

**Functional levels** (what the code does):

```
Unit  →  Component  →  Integration  →  E2E
fast, isolated                       slow, full app
```

**Specialized types** (a specific quality): snapshot, visual regression, accessibility, performance, contract, mutation, smoke, regression. See [01](./01-testing-fundamentals.md#the-types-of-testing) and [07](./07-specialized-testing.md).

## 🛠️ The Modern Stack

| Job                    | Tool |
| ---------------------- | ---- |
| Test runner            | **Vitest** |
| Component testing       | **React Testing Library** + `@testing-library/user-event` |
| DOM matchers           | `@testing-library/jest-dom` |
| Network mocking        | **MSW** (Mock Service Worker) |
| E2E                    | **Playwright** (or Cypress) |
| Visual regression      | Playwright screenshots, Percy, Chromatic |
| Accessibility          | `axe` |
| Performance            | Lighthouse CI |
| Mutation testing       | Stryker |

## 🗺️ Suggested Order

1. **Fundamentals** (01) — the vocabulary every other file builds on
2. **Vitest** (02) — the runner and its API
3. **RTL** (03) → **Integration** (04) — the day-to-day of frontend testing
4. **E2E** (05) — critical user journeys
5. **TDD** (06), **Specialized** (07), **Best Practices** (08) — depth and polish

## 💡 The One Rule to Remember

> "The more your tests resemble the way your software is used, the more confidence they can give you." — Testing Library

---

[← Back to Frontend](../README.md)
