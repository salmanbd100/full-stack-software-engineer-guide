---
title: Part IV — Frontend at Scale
part: 4
chapter: 0
slug: part-frontend-at-scale
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [architecture, performance, security, testing, micro-frontends]
in_book: true
---

# Part IV — Frontend at Scale

Part III is how to build it. Part IV is how to build it with forty engineers, four years of history, and
a performance budget that someone answers for. The difference is not difficulty. Every decision now
comes with a migration path, and a whole team pays for a wrong one, not only you.

That shapes what the four sections argue. Architecture is about boundaries you can still move in a year.
Performance is about budgets, because a number nobody owns drifts. That includes **INP** (how fast the
page responds to input). It replaced FID in 2024, and a lot of published material still gets it wrong.
Security is the browser's threat model, not a checklist. Testing is about which layer earns each test,
because the team pays for the suite on every commit, forever.

One chapter here barely exists in print anywhere: **reviewing AI-generated code**. The job now needs this
review skill. It means catching the generated object literal that quietly breaks memoisation, or the ARIA
attribute that is valid syntax but has the wrong meaning.

## Sections

| Section                                                     | Chapters | What it covers                                                      |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| [Frontend Architecture](#ch-frontend-architecture-index)     | 4        | Patterns, micro-frontends, design systems and upgrades, reviewing AI code |
| [Web Performance](#ch-frontend-web-performance-index)        | 4        | Core Web Vitals, loading and budgets, caching and delivery, measurement |
| [Frontend Security](#ch-frontend-security-index)             | 2        | XSS and untrusted input, CSP and security headers                   |
| [Frontend Testing](#ch-frontend-testing-index)               | 5        | Strategy, Vitest and RTL, integration, Playwright, accessibility    |

## What Interviewers Probe For

The senior signal for this part is **thinks in budgets, boundaries and migration paths rather than
features.** Three questions run through all four sections. Each section index adds its own.

- **What is the number, and who owns it?** "The site feels slow" is not a problem statement. A p75 INP of
  340 ms on the search route, owned by the team that ships search, is.
- **How do you get out of this decision?** Micro-frontends, a design system, a state library, a test
  framework: each one is easy to adopt and expensive to leave. The senior answer names the exit before
  the entrance.
- **Where does the untrusted string go?** The question is not "do you sanitise input". It is where the
  value crosses from data into markup, a URL or a style. That boundary is all of client-side security.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "How do you make it faster?" | "Lazy-load and memoise" | Measures first, names the vital that moved, and says what the budget is now |
| "Would you use micro-frontends?" | "They let teams deploy independently" | The coordination cost, the duplicated runtime, and the two conditions under which it pays |
| "How much should you test?" | "Aim for 80% coverage" | Which failure each layer is there to catch, and why the number is an output rather than a target |

## Reading Order

Architecture first — it sets the vocabulary of boundaries the other three sections use. Performance,
security and testing are independent of each other after that.

**Interview sprint:** Architecture 01 and 02 · Performance 01 and 02 · Security 01 and 02 · Testing 01.
Seven of the fifteen chapters, and Testing 01 is the one that changes how the rest of the answers sound.

**Read in full before a system design round:** the performance section. Frontend system design questions
are performance questions with a diagram attached.

> ⚠️ **Caching appears in three parts and that is deliberate.** Browser storage mechanics are Part II.
> The CDN and the cache headers are here. Server-side and database caching is Part VI. Each answers a
> different question about the same word.
