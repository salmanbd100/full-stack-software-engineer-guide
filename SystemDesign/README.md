---
title: Part VI — System Design
part: 6
chapter: 0
slug: system-design-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [system-design, radio, case-studies, scalability]
in_book: true
---

# Part VI — System Design

This is the round most senior candidates lose, and the one they prepare for least. Part VI teaches the
vocabulary first, then the components, then the two kinds of round a frontend-heavy engineer meets: a
backend-shaped case study, and a frontend one.

That balance matters. Classic system design material is all backend: shorten URLs, design a feed, shard
a database. But this reader also gets asked for a collaborative editor, an infinite feed, or a dashboard
with fifty live widgets. Those rounds have their own vocabulary, and `Frontend/` is where it lives.

## Sections

| Section                                              | Chapters | What it covers                                                    |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| [Fundamentals](#ch-part-system-design-fundamentals)             | 4        | Running the round, estimation, scaling and latency, reliability and consistency |
| [Building Blocks](#ch-part-system-design-building-blocks)        | 6        | Load balancers, caches, CDNs, queues and sockets, boundaries and gateways, resilience |
| [Data at Scale](#ch-part-system-design-database)                | 2        | Choosing and replicating a store, sharding and transactions       |
| [Frontend System Design](#ch-part-frontend-system-design)       | 3        | Real-time clients, offline-first, authentication                  |
| [Case Studies](#ch-part-system-design-case-studies)              | 3        | Worked answers — one backend-shaped, two frontend-shaped          |

## The RADIO Framework

Every case study here follows the same five steps, because the interviewer scores the process as much
as the answer.

| Step               | What you do                                             | Time      |
| ------------------ | -------------------------------------------------------- | --------- |
| **R**equirements   | Functional, non-functional, and the scale numbers        | 8–10 min  |
| **A**rchitecture   | The boxes and arrows, at one level of detail             | 10–12 min |
| **D**ata model     | Core entities, their keys, and the store behind each     | 6–8 min   |
| **I**nterface      | Three or four operations with the parameters that matter | 4–6 min   |
| **O**ptimisations  | The scaling levers, and what each one costs              | 10–15 min |

The full walkthrough is [Chapter ?? — Driving the Design Round, Backend and Frontend](#ch-driving-the-round).

## What Interviewers Probe For

The senior signal for this part is **drives the round — clarifies requirements, states assumptions,
defends trade-offs.** Note what is not on that list: arriving at the "correct" architecture. Two habits
carry it. First, say your assumptions out loud, so the interviewer can correct you cheaply. Second,
estimate: queries per second, storage per year and bandwidth turn a diagram into a design.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "Design a feed" | Starts drawing boxes in the first minute | "How many users, read-to-write ratio, and is the feed chronological or ranked?" before anything is drawn |
| "Would you cache this?" | "Yes, with Redis" | "Yes — and here is the invalidation trigger, the staleness we can tolerate, and what happens on a cold cache" |
| "Which database?" | "Postgres, it's reliable" | Access patterns first, then the choice — and what the answer would have been had the pattern differed |

## Reading Order

Fundamentals, then Building Blocks, then split by the round you expect. Frontend-heavy readers should
go to Frontend System Design next and treat Data at Scale as depth. Then practise with the case
studies, out loud, against a timer.

**Interview sprint:** [Chapter ?? — Driving the Design Round, Backend and Frontend](#ch-driving-the-round)
(the framework, both rounds), [Chapter ?? — Back-of-Envelope Estimation](#ch-back-of-envelope-estimation),
the first four Building Blocks chapters, then two case studies end to end.

> ⚠️ **Some system design topics live elsewhere in the book.** Authorisation, encryption at rest and
> SSRF are in Part V's security chapters. Deployment and distributed tracing are in Part VIII. This part
> keeps what a design round actually asks you to draw.
