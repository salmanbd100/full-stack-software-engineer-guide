---
title: Part IV — Web Performance
part: 4
chapter: 0
slug: frontend-web-performance-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-08
tags: [performance, core-web-vitals, inp, bundles, caching, budgets, rum]
in_book: true
---

# Part IV — Web Performance

Performance is the clearest example of what Part IV is about: it is not a feature, it is a budget
somebody is held to. This section covers the three metrics that get measured in public, the loading
strategies that move them, and — the part most material skips — how to know whether a change helped
real users rather than your laptop. An AI feature answers to a second budget, first token rather than
largest paint: [Chapter ?? — Designing for Latency](#ch-designing-for-latency).

One correction up front, because much published material still has it wrong. **INP replaced FID** as a
Core Web Vital in March 2024. FID measured the delay before the first interaction was handled and almost
every site passed it; INP measures every interaction all the way to paint and takes the worst. Sites that
passed FID comfortably routinely fail INP, and a candidate still saying FID in 2026 dates themselves.

## Chapters

| #  | Chapter                                                                        | What it answers                                                |
| -- | ------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 01 | [Core Web Vitals](./01-core-web-vitals.md)                                     | Which fix moves which metric?                                  |
| 02 | [Loading and Code Splitting](./02-loading-and-code-splitting.md)               | How do you defer without pushing your largest paint out?       |
| 03 | [Bundles, Budgets and Third Parties](./03-bundles-budgets-and-third-parties.md) | What is in your bundle, and what stops it growing back?        |
| 04 | [Frontend Caching Strategies](./04-caching-strategies.md)                      | At which layer, and how does each entry become wrong?          |
| 05 | [Asset Delivery](./05-asset-delivery.md)                                       | What does the page look like before images, fonts and CSS land? |
| 06 | [Rendering and Streaming](./06-rendering-and-streaming.md)                     | How do you keep interactions inside the frame budget?          |
| 07 | [Measuring in Production](./07-measuring-in-production.md)                     | What are real users experiencing, and what broke for them?     |

## What Interviewers Probe For

The senior signal for this part is **thinks in budgets, boundaries and migration paths rather than
features.** Performance is where that is measured literally:

- **Do you measure before you change anything?** The strongest answers start with field data and a
  profile, not with a list of optimisations. "I would code-split" as an opening move is a guess.
- **Can you name what moves LCP?** It is usually the hero image or a render-blocking request, and it
  is almost never JavaScript execution. Candidates who reach for bundle size first have not debugged
  a real LCP problem.
- **Do you know why INP is harder than FID?** Because it measures every interaction all the way to
  paint, so a long task anywhere in the session can fail you. This is the current version of the
  question and it filters well.
- **Lab or field?** Lighthouse gives you a repeatable score on one synthetic device. The Chrome User
  Experience Report tells you what your users actually got. A senior answer uses both and says which
  question each one answers — and knows a lab run cannot measure INP at all.
- **What stops the bundle growing back?** A budget that fails the build, not an optimisation week. The
  candidates who have lived through this answer with a CI gate and a delta comment on the pull request.

## Reading Order

01 first, always — it defines the metrics the other six chapters are trying to move. Then 02 and 05,
which are the highest-leverage loading fixes, and 03 for the gate that keeps them fixed. 07 is what
makes all of it verifiable, and it is not optional in production.

**Interview sprint:** 01 → 02 → 06 → 07. The metrics, the loading lever, the interaction lever, and
how you prove any of it worked.
