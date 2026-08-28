---
title: Part VI — Frontend System Design
part: 6
chapter: 0
slug: part-frontend-system-design
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [system-design, frontend, rendering, state, performance]
in_book: true
---

# Part VI — Frontend System Design

This is the section the rest of the internet does not cover, and the one this reader is most likely
to be interviewed on. A frontend system design round is not a smaller backend round. It asks about a
different set of constraints: a runtime you do not control, a network you cannot trust, a bundle
budget, an accessibility floor, and a rendering strategy that has to be defended per route.

Chapter 00 is the strategy chapter. Read it first even if you skip the rest — a frontend round is
scored on how you drive it, and the shape of a good answer here is genuinely different from the
backend framework in [Fundamentals](../Fundamentals/08-framework.md).

## Chapters

| #  | Chapter                                                          | What it answers                                              |
| -- | ---------------------------------------------------------------- | ------------------------------------------------------------ |
| 00 | [Interview Strategy](./00-interview-strategy.md)                 | How is a frontend round scored differently?                   |
| 01 | [Frontend Architecture Patterns](./01-architecture.md)           | Where do the boundaries go in a large client app?             |
| 02 | [State Management](./02-state-management.md)                     | Server state or client state — which problem is this?         |
| 03 | [Rendering Strategies](./03-rendering.md)                         | SSG, ISR, SSR or CSR, and why per route?                      |
| 04 | [Performance Optimization](./04-performance.md)                  | Which metric is failing, and what actually moves it?          |
| 05 | [Micro-Frontends](./05-micro-frontends.md)                       | When is the coordination cost worth paying?                   |
| 06 | [Real-Time Features](./06-real-time.md)                          | What does live actually mean for this feature?                |
| 07 | [Offline-First Architecture](./07-offline-first.md)              | What happens on a train, and how does it reconcile?           |
| 08 | [Design Systems](./08-design-systems.md)                         | How do forty teams share components without freezing?         |
| 09 | [Asset Management](./09-assets.md)                               | Images, fonts and bundles — what ships, and when?             |
| 10 | [SEO and Analytics](./10-seo-analytics.md)                       | What does the crawler see, and what may you measure?          |
| 11 | [Authentication and Authorization](./11-auth.md)                 | Where does the token live, and what can the client be told?   |
| 12 | [Frontend Monitoring](./12-monitoring.md)                        | How do you know it is broken for users but not for you?       |

## What Interviewers Probe For

The senior signal is **picks a rendering strategy per route and can defend it; treats the framework
as an implementation detail.** Concretely:

- **Do you design for the network you actually get?** Offline, flaky, and slow are three different
  problems with three different answers. Candidates who only design for "online" reveal a lot.
- **Can you separate server state from client state?** Most state-management debates dissolve once
  this distinction is made. Candidates who reach for a global store to hold API responses have not
  made it.
- **Do you budget?** Bundle size, request count, and an interaction latency target. A design with no
  numbers in it is a wish list.
- **Is accessibility in the design or in the follow-up questions?** Bringing up focus management or
  live regions unprompted, in a design round, is a strong senior signal.

## Reading Order

00 → 03 → 02 → 04 is the spine: how the round works, what renders where, where state lives, and how
you make it fast. 05, 07 and 08 are the three that most often appear as the "and now scale it"
follow-up.

**Interview sprint:** 00 → 03 → 04 → 02.
