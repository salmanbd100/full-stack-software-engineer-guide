---
title: Frontend Architecture
part: 4
chapter: 1
slug: frontend-architecture-index
level: advanced # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-24
tags: [architecture, boundaries, micro-frontends, design-systems, code-review]
in_book: true
---

# Frontend Architecture

Part III is how to build a frontend. This section is what changes when the frontend is large and old,
and more people work on it than fit in one standup. Every chapter here is about a **boundary**. It sits
between layers, between teams, or between the shared UI and the features that use it. The last one sits
between what an assistant produces and what enters the codebase. Each chapter also asks what that
boundary costs to maintain once it exists.

These chapters sit next to performance, security and testing because all four answer the same
question: what breaks at scale, and what do you put in place before it does? The chapters about
**driving a design round**, not about structuring a codebase, are in Part VI.

## Chapters

| #  | Chapter | What it answers |
| -- | ------- | --------------- |
| 01 | [Frontend Architecture Patterns](#ch-frontend-architecture-patterns) | Where do the boundaries go, and which ones are worth enforcing? |
| 02 | [Micro-Frontends](#ch-micro-frontends) | When is deploy independence worth the coordination cost? |
| 03 | [Design Systems, Dependencies and Upgrades](#ch-design-systems-at-scale) | How do forty teams share components, and how does a five-year-old frontend stay upgradable? |
| 04 | [Reviewing AI-Generated Code](#ch-reviewing-ai-generated-code) | Which defects does generated code have that human code does not? |

The monorepo-versus-polyrepo decision is the fourth boundary in this set, but it lives elsewhere.
[Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) argues the choice.
[Chapter ?? — Monorepos](#ch-monorepos) covers the task graph and caching that make one workable.

## What Interviewers Probe For

The part-level signal shows up here as three habits:

- **Naming the enforcement mechanism.** Anyone can draw three layers. The follow-up question is what
  stops a component importing the API client directly. The answer has to be a lint rule or a build
  graph, not a code review convention.
- **Turning down the heavier pattern.** Micro-frontends and clean architecture are the two most
  over-applied ideas in frontend work. Say which problem each solves, then confirm the interviewer's
  scenario does not have it. That scores higher than adopting them.
- **Having a migration path.** A boundary introduced into an existing codebase needs an incremental
  route in. "We would rewrite it" is the answer that ends the conversation.

## Reading Order

01 → 02 → 03 → 04. Chapter 01 sets up the vocabulary the rest assume. It also says which of the
heavier patterns you can skip. Chapter 04 reads fine on its own.

**Interview sprint:** 01, then the "When to Use It" table in 02, then 04. Those cover the architecture
questions a senior frontend loop actually asks. Most candidates have no answer for the ones in 04.
