---
title: Part VI — Frontend System Design
part: 6
chapter: 0
slug: part-frontend-system-design
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-07
tags: [system-design, frontend, realtime, offline, seo, auth]
in_book: true
---

# Part VI — Frontend System Design

This is the section the rest of the internet does not cover, and the one this reader is most likely
to be interviewed on. A frontend system design round is not a smaller backend round. It asks about a
different set of constraints: a runtime you do not control, a network you cannot trust, a bundle
budget, an accessibility floor, and a rendering strategy that has to be defended per route.

Chapter 01 is the strategy chapter. Read it first even if you skip the rest — a frontend round is
scored on how you drive it, and the shape of a good answer here is genuinely different from the
backend framework in [Fundamentals](../Fundamentals/01-driving-the-round.md).

> ⚠️ This section is smaller than it was. Improvement #42 moved the chapters that were about
> **structuring a codebase** rather than driving a round: architecture patterns, micro-frontends and
> design systems now live in `Frontend/Architecture/`, and asset delivery and error tracking in
> `Frontend/WebPerformance/` — all Part IV. Rendering and state management became Part III sections
> at #39 and #40. What stayed is what a frontend design round actually opens with.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Frontend System Design Strategy](#ch-frontend-system-design-strategy) | How is a frontend round scored differently? |
| 02 | [Frontend Real-Time Features](#ch-frontend-real-time-features) | What happens to the client when the connection drops? |
| 03 | [Offline-First Architecture](#ch-offline-first-architecture) | What happens on a train, and how does it reconcile? |
| 04 | [SEO and Analytics](#ch-seo-and-analytics) | What does the crawler see, and what may you measure? |
| 05 | [Frontend Authentication](#ch-frontend-authentication) | Where does the token live, and what can the client be told? |

Improvement #43 adds four frontend case studies alongside the backend ones in
[Case Studies](../CaseStudies/README.md).

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

01 → 02 → 03 is the spine: how the round works, then the two network problems that separate a
frontend design answer from a backend one. 04 and 05 are the two follow-ups that come up most often
once the happy path is drawn.

**Interview sprint:** 01, then 02. Those two carry most of what a frontend design round asks before
it starts probing a specific domain.
