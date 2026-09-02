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
the vocabulary first, then the components, then the two kinds of round a frontend-heavy engineer
actually walks into — a backend-shaped case study, and a frontend one.

The balance correction matters. Classic system design material is entirely backend-shaped: shorten
URLs, design a feed, shard a database. This reader also gets asked to design a collaborative editor, a
typeahead, an infinite feed, a design system for forty teams, or a dashboard with fifty live widgets.
Those rounds have their own vocabulary — rendering strategy, cache invalidation in the client,
optimistic updates, conflict resolution — and `Frontend/` is where it lives.

## Sections

| Section                                              | Chapters | What it covers                                                    |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| [Fundamentals](./Fundamentals/README.md)             | 6        | Running the round, estimation, scaling, reliability, consistency  |
| [Building Blocks](./BuildingBlocks/README.md)        | 9        | Load balancers, caches, CDNs, queues, gateways, resilience        |
| [Data at Scale](./Database/README.md)                | 4        | Choosing a store, replication, sharding, transactions             |
| [Frontend System Design](./Frontend/README.md)       | 13       | The rounds this reader is most likely to face and least ready for |
| [Case Studies](./CaseStudies/README.md)              | 4        | Worked answers — backend today, frontend studies join at #43      |

## The RADIO Framework

Every case study in this part follows the same five steps, because an interviewer scores the process as
much as the answer.

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
defends trade-offs.** Note what is not on that list: arriving at the "correct" architecture.

- **Do you ask before you draw?** Candidates who start sketching in the first minute have skipped the
  step the interviewer is scoring hardest. Read volume against write volume changes everything after it.
- **Do you state your assumptions out loud?** "I am assuming ten million daily actives and a
  hundred-to-one read-write ratio" lets the interviewer correct you cheaply. Silence does not.
- **Can you defend a trade-off rather than a choice?** Every answer here has a cost. Naming it before
  being asked is the clearest seniority marker in the round.
- **Can you estimate?** Queries per second, storage per year, bandwidth — the numbers are what turn a
  diagram into a design.

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
