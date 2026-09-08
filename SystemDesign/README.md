---
title: Part VI — System Design
part: 6
chapter: 0
slug: system-design-index
level: advanced
reading_time: 3
updated: 2026-09-02
tags: [system-design, radio, case-studies, scalability]
in_book: true
---

# Part VI — System Design

The round most senior candidates lose, and the one they prepare for least specifically. Part VI teaches
the vocabulary first, then the components, then the two kinds of round a frontend-heavy engineer walks
into — a backend-shaped case study, and a frontend one.

The balance correction matters. Classic system design material is entirely backend-shaped — shorten
URLs, design a feed, shard a database — while this reader also gets asked for a collaborative editor,
an infinite feed, or a dashboard with fifty live widgets. Those rounds have their own vocabulary, and
`Frontend/` is where it lives.

## Sections

| Section                                              | Chapters | What it covers                                                    |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| [Fundamentals](./Fundamentals/README.md)             | 6        | Running the round, estimation, scaling, reliability, consistency  |
| [Building Blocks](./BuildingBlocks/README.md)        | 9        | Load balancers, caches, CDNs, queues, gateways, resilience        |
| [Data at Scale](./Database/README.md)                | 4        | Choosing a store, replication, sharding, transactions             |
| [Frontend System Design](./Frontend/README.md)       | 5        | The rounds this reader is most likely to face and least ready for |
| [Case Studies](./CaseStudies/README.md)              | 5        | Worked answers — two backend-shaped, three frontend-shaped        |

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

The full walkthrough is [Chapter ?? — Driving the Design Round](#ch-driving-the-round).

## What Interviewers Probe For

The senior signal for this part is **drives the round — clarifies requirements, states assumptions,
defends trade-offs.** Note what is not on that list: arriving at the "correct" architecture. Two habits
carry it: saying your assumptions out loud, so the interviewer can correct you cheaply, and being able
to estimate — queries per second, storage per year, bandwidth are what turn a diagram into a design.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "Design a feed" | Starts drawing boxes in the first minute | "How many users, read-to-write ratio, and is the feed chronological or ranked?" before anything is drawn |
| "Would you cache this?" | "Yes, with Redis" | "Yes — and here is the invalidation trigger, the staleness we can tolerate, and what happens on a cold cache" |
| "Which database?" | "Postgres, it's reliable" | Access patterns first, then the choice — and what the answer would have been had the pattern differed |

## Reading Order

`Fundamentals/` → `BuildingBlocks/` → then split by the round you expect. Frontend-heavy readers should
go to `Frontend/` next and treat `Database/` as depth. Then practise with the case studies, out loud,
against a timer.

**Interview sprint:** `Fundamentals/01` (the framework), `Fundamentals/02` (estimation),
`BuildingBlocks/01`–`04`, then two case studies end to end.

> ⚠️ Four directories are gone. `Scalability/` and `Infrastructure/` went at #22 and #23. `Security/`
> went at #24 — authorisation, encryption at rest and SSRF moved into `Backend/Security/`.
> `Microservices/` went at **#31d**: the gateway, service-boundary and resilience chapters are now
> `BuildingBlocks/07`–`09`, and deployment and distributed tracing were archived because Part VIII
> already owns them.
