---
title: Part VI — Frontend System Design
part: 6
chapter: 16
slug: part-frontend-system-design
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [system-design, frontend, realtime, offline, seo, auth]
in_book: true
---

# Part VI — Frontend System Design

This is the section the rest of the internet does not cover, and the one you are most likely to be
interviewed on. A frontend system design round is not a smaller backend round. It has its own limits.
You do not control the runtime, and you cannot trust the network. You also carry a bundle budget, an
accessibility floor, and a rendering strategy you must defend for each route.

How to drive a frontend round is now the second half of [Chapter ?? — Driving the Design Round, Backend and Frontend](#ch-driving-the-round).
It covers RADIO for a client application and where each kind of state lives. Read it first, even if
you skip the rest. A frontend round is scored on how you drive it.

> ⚠️ This section is smaller than it was. Improvement #42 moved out the chapters about **structuring
> a codebase** rather than driving a round. Architecture patterns, micro-frontends and design systems
> now live in `Frontend/Architecture/`. Asset delivery and error tracking live in
> `Frontend/WebPerformance/`. Both are Part IV. Rendering and state management became Part III sections
> at #39 and #40. What stayed is what a frontend design round really opens with.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Frontend Real-Time Features](#ch-frontend-real-time-features) | What happens to the client when the connection drops? |
| 02 | [Offline-First Architecture](#ch-offline-first-architecture) | What happens on a train, and how does it reconcile? |
| 03 | [Frontend Authentication](#ch-frontend-authentication) | Where does the token live, and what can the client be told? |

Two frontend case studies sit next to the backend one in
[Part VI — Case Studies](#ch-part-system-design-case-studies): the collaborative editor and the
infinite feed. Each runs the whole framework end to end. What the crawler sees is Part III's
[Chapter ?? — Choosing a Rendering Strategy per Route, with SEO](#ch-choosing-per-route).

## What Interviewers Probe For

The senior signal is **picks a rendering strategy per route and can defend it; treats the framework
as an implementation detail.** Concretely:

- **Do you design for the network you actually get?** Offline, flaky, and slow are three different
  problems with three different answers. Candidates who only design for "online" reveal a lot.
- **Can you separate server state from client state?** Most state-management debates end once you
  make this split. Candidates who reach for a global store to hold API responses have not made it.
- **Do you budget?** Bundle size, request count, and an interaction latency target. A design with no
  numbers in it is a wish list.
- **Is accessibility in the design or in the follow-up questions?** Bringing up focus management or
  live regions unprompted, in a design round, is a strong senior signal.

## Reading Order

01 → 02 is the spine. They cover the two network problems that set a frontend design answer apart
from a backend one. 03 is the most common follow-up once the happy path is drawn.

**Interview sprint:** `Fundamentals/01`, then 01 here. Those two carry most of what a frontend design
round asks before it starts probing a specific domain.
