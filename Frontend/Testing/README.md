---
title: Part IV — Frontend Testing
part: 4
chapter: 0
slug: frontend-testing-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-07
tags: [testing, vitest, react-testing-library, playwright, tdd, visual-regression]
in_book: true
---

# Part IV — Frontend Testing

Nobody is hired for knowing the Vitest API. What gets tested in an interview is judgement: what is
worth testing, at which layer, and what a test is allowed to know about the implementation. This
section is organised around that question, and the framework material is deliberately thin — it is
the vocabulary you need to have the real conversation.

The through-line is coupling. A test that knows about internal state breaks on every refactor and
teaches the team to distrust the suite. A test that drives the interface the way a user does survives
rewrites of everything underneath it. Almost every recommendation here follows from that one idea.

## Chapters

| #  | Chapter                                                              | What it answers                                                 |
| -- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| 01 | [Testing Strategy](./01-testing-strategy.md)                         | What do you test, at which layer, and what does it cost?        |
| 02 | [Vitest](./02-vitest.md)                                             | How do you mock at the boundary without leaking into the next test? |
| 03 | [React Testing Library](./03-react-testing-library.md)               | Which query, so a refactor does not break a hundred tests?      |
| 04 | [Frontend Integration Testing](./04-integration-testing.md)          | How do you test a whole flow against a faked network?           |
| 05 | [End-to-End Testing with Playwright](./05-e2e-with-playwright.md)    | Which browser tests earn their runtime, and where does component testing stop? |
| 06 | [Test-Driven Development](./06-test-driven-development.md)           | When does writing the test first genuinely pay?                 |
| 07 | [Visual and Contract Testing](./07-visual-and-contract-testing.md)   | What do you do about failures an assertion cannot express?       |

Accessibility testing has its own chapter in Part II —
[Chapter ?? — Testing Accessibility](#ch-testing-accessibility) owns the method, the CI gate and the
two manual passes. This section deliberately does not restate it.

## What Interviewers Probe For

The senior signal for this part is **thinks in budgets, boundaries and migration paths rather than
features.** A test suite is a budget — of runtime, of maintenance, and of trust.

- **Where do you draw the test boundary?** The strongest answer names the network as the mock point
  and tests everything above it together. Mocking a child component is usually a sign the boundary is
  in the wrong place.
- **How do you handle a flaky test?** Quarantine and fix, not retry and forget. A candidate who
  reaches straight for a retry count has told you what their suite looks like.
- **Where does component testing stop and end-to-end start?** The answer is about what is real —
  jsdom computes no layout — not about how long the flow is.
- **What is your coverage number for?** The honest senior answer is that coverage finds untested
  files, not untested behaviour, and that a target above roughly 80% starts buying tests written to
  satisfy the number.
- **When do you not write the test first?** TDD is a tool, not a creed. Exploratory work, spike code
  and UI layout are the standard honest exceptions, and saying so reads as experience rather than
  laziness.

## Reading Order

01 first — it sets the layers everything else refers to. Then 03 and 04, which are where most
frontend testing actually happens. 02 is reference material you can dip into. 05 to 07 are the
judgement chapters and read well in one sitting.

**Interview sprint:** 01 → 03 → 05. The layering question, the query-priority question, and knowing
which end-to-end tests earn their place cover most of what gets asked.
