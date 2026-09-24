---
title: Part IV — Frontend Testing
part: 4
chapter: 14
slug: frontend-testing-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-24
tags: [testing, vitest, react-testing-library, playwright, visual-regression, accessibility]
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

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Testing Strategy](#ch-testing-strategy) | What do you test, at which layer, and what does it cost? |
| 02 | [Writing the Tests: Vitest and React Testing Library](#ch-vitest) | Which query, and where do you mock, so a refactor does not break a hundred tests? |
| 03 | [Frontend Integration Testing](#ch-frontend-integration-testing) | How do you test a whole flow against a faked network? |
| 04 | [End-to-End, Visual and Contract Testing with Playwright](#ch-end-to-end-testing) | Which browser tests earn their runtime, and what about failures an assertion cannot express? |
| 05 | [Testing Accessibility](#ch-testing-accessibility) | What can be gated in CI, and what has to be done by hand? |

Chapter 05 moved here from Part II's accessibility section at #97. It owns the method, the CI gate and
the two manual passes, so the other chapters here point at it rather than restate it.

## What Interviewers Probe For

A test suite is the part-level budget made concrete — of runtime, of maintenance, and of trust.

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
  and UI layout are the honest exceptions, and saying so reads as experience rather than laziness.

## Reading Order

01 first — it sets the layers everything else refers to. Then 02 and 03, which are where most
frontend testing actually happens. 04 and 05 are the judgement chapters and read well in one sitting.

**Interview sprint:** 01 → 02 → 04. The layering question, the query-priority question, and knowing
which end-to-end tests earn their place cover most of what gets asked.
