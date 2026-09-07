---
title: Frontend Architecture
part: 4
chapter: 0
slug: frontend-architecture-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-07
tags: [architecture, boundaries, micro-frontends, design-systems]
in_book: true
---

# Frontend Architecture

Part III is how to build a frontend. This section is what changes when the frontend is large, old, and
worked on by more people than fit in one standup. Every chapter here is about a **boundary** — between
layers, between teams, or between the shared UI vocabulary and the features that consume it — and about
what each boundary costs to maintain once it exists.

These chapters were frontend system design material until improvement #42. They read better here,
next to performance, security and testing, because all four answer the same question: what breaks at
scale, and what do you put in place before it does. `SystemDesign/Frontend/` keeps the chapters that
are genuinely about **driving a design round** rather than about structuring a codebase.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Frontend Architecture Patterns](#ch-frontend-architecture-patterns) | Where do the boundaries go, and which ones are worth enforcing? |
| 02 | [Micro-Frontends](#ch-micro-frontends) | When is deploy independence worth the coordination cost? |
| 03 | [Design Systems at Scale](#ch-design-systems-at-scale) | How do forty teams share components without freezing the design? |

Two more chapters are scheduled here by improvement #55 — monorepo versus polyrepo frontends, and
managing dependencies and upgrades.

## What Interviewers Probe For

The senior signal for Part IV is **thinks in budgets, boundaries and migration paths rather than
features.** In this section that shows up as three habits:

- **Naming the enforcement mechanism.** Anyone can draw three layers. The follow-up question is what
  stops a component importing the API client directly, and the answer has to be a lint rule or a build
  graph, not a code review convention.
- **Turning down the heavier pattern.** Micro-frontends and clean architecture are the two most
  frequently over-applied ideas in frontend work. Saying which problem each solves — and confirming
  the interviewer's scenario does not have that problem — scores higher than adopting them.
- **Having a migration path.** A boundary introduced into an existing codebase needs an incremental
  route in. "We would rewrite it" is the answer that ends the conversation.

## Reading Order

01 → 02 → 03. Chapter 01 sets up the vocabulary the other two assume, and it is also the one that says
which of the heavier patterns you are allowed to skip.

**Interview sprint:** 01, then the "When to Use It" table in 02. Those two cover the architecture
questions a senior frontend loop actually asks.
