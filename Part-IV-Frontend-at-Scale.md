---
title: Part IV — Frontend at Scale
part: 4
chapter: 0
slug: part-frontend-at-scale
level: advanced
reading_time: 3
updated: 2026-09-19
tags: [architecture, performance, security, testing, micro-frontends]
in_book: true
---

# Part IV — Frontend at Scale

Part III is how to build it. Part IV is how to build it when there are forty engineers, four years of
history, and a performance budget someone will be held to. The difference is not difficulty — it is that
every decision now has a migration path attached, and the cost of getting one wrong is paid by a team
rather than by you.

That shapes what the four sections argue. Architecture is about boundaries you can still move in a year.
Performance is about budgets, because a number nobody owns is a number that drifts — including **INP**,
which replaced FID in 2024 and which a lot of published material still gets wrong. Security is the
browser's threat model rather than a checklist. Testing is about which layer earns each test, given that
the suite is a cost paid on every commit forever.

One chapter here barely exists in print anywhere: **reviewing AI-generated code**. It is the review skill
the job now needs — catching the generated object literal that quietly defeats memoisation, or the ARIA
attribute that is syntactically valid and semantically wrong.

## Sections

| Section                                                     | Chapters | What it covers                                                      |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| [Frontend Architecture](#ch-frontend-architecture-index)     | 5        | Patterns, micro-frontends, design systems, upgrades, reviewing AI code |
| [Web Performance](#ch-frontend-web-performance-index)        | 7        | Core Web Vitals, loading, budgets, caching, delivery, measurement    |
| [Frontend Security](#ch-frontend-security-index)             | 4        | XSS, CSP, security headers, input handling on the client            |
| [Frontend Testing](#ch-frontend-testing-index)               | 7        | Strategy, Vitest, RTL, integration, Playwright, TDD, visual          |

## What Interviewers Probe For

The senior signal for this part is **thinks in budgets, boundaries and migration paths rather than
features.** Three questions run through all four sections; each section index adds its own.

- **What is the number, and who owns it?** "The site feels slow" is not a problem statement. A p75 INP of
  340 ms on the search route, owned by the team that ships search, is.
- **How do you get out of this decision?** Micro-frontends, a design system, a state library, a test
  framework — every one of them is easy to adopt and expensive to leave. The senior answer names the exit
  before the entrance.
- **Where does the untrusted string go?** Not "do you sanitise input" — where the value crosses from data
  into markup, into a URL, into a style. That boundary is the whole of client-side security.

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
Seven chapters, and Testing 01 is the one that changes how the rest of the answers sound.

**Read in full before a system design round:** the performance section. Frontend system design questions
are performance questions with a diagram attached.

> ⚠️ **Caching appears in three parts and that is deliberate.** Browser storage mechanics are Part II.
> The CDN and the cache headers are here. Server-side and database caching is Part VI. Each answers a
> different question about the same word.
