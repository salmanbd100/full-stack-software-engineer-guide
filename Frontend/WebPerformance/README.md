---
title: Part IV — Web Performance
part: 4
chapter: 0
slug: frontend-web-performance-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-28
tags: [performance, core-web-vitals, inp, bundles, caching]
in_book: true
---

# Part IV — Web Performance

Performance is the clearest example of what Part IV is about: it is not a feature, it is a budget
somebody is held to. This section covers the three metrics that get measured in public, the loading
strategies that move them, and — the part most material skips — how to know whether a change helped
real users rather than your laptop.

One correction up front, because a lot of published material still has it wrong. **INP replaced FID**
as a Core Web Vital in March 2024. FID measured the delay before the first interaction was handled
and almost every site passed it. INP measures the full latency of every interaction, to the next
paint, and takes the worst. Sites that comfortably passed FID routinely fail INP. If a candidate
still says FID in 2026, that dates them.

## Chapters

| #  | Chapter                                                              | What it answers                                                |
| -- | -------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Core Web Vitals](./01-core-web-vitals.md)                           | Which fix moves which metric?                                  |
| 02 | [Lazy Loading](./02-lazy-loading.md)                                 | How do you defer without pushing your largest paint out?       |
| 03 | [Code Splitting](./03-code-splitting.md)                             | How do you ship this route's code and nothing else?            |
| 04 | [Frontend Caching Strategies](./04-caching-strategies.md)            | At which layer, and how does each entry become wrong?          |
| 05 | [Image Optimisation](./05-image-optimization.md)                     | What is the smallest image that still looks right?             |
| 06 | [Bundle Optimisation](./06-bundle-optimization.md)                   | What is actually in your bundle?                               |
| 07 | [Performance Monitoring](./07-performance-monitoring.md)             | What are real users experiencing, not your dev machine?        |
| 08 | [Rendering Optimisation](./08-rendering-optimization.md)             | How do you keep interactions inside the frame budget?          |

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
  question each one answers.

## Reading Order

01 first, always — it defines the metrics the other seven chapters are trying to move. Then 02, 03
and 05, which are the highest-leverage loading fixes. 07 is the chapter that makes the rest
verifiable; do not leave it out.

**Interview sprint:** 01 → 03 → 08 → 07. The metrics, the loading lever, the interaction lever, and
how you prove any of it worked.
