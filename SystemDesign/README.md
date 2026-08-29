---
title: Part VI — System Design
part: 6
chapter: 0
slug: system-design-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [system-design, radio, case-studies, scalability]
in_book: true
---

# Part VI — System Design

The round that most senior candidates lose, and the one they prepare for least specifically. Part VI
teaches the vocabulary first, then the components, then the two kinds of round a frontend-heavy
engineer actually walks into — a backend-shaped case study, and a frontend one.

The balance correction matters. Classic system design material is entirely backend-shaped: shorten
URLs, design a feed, shard a database. This reader also gets asked to design a collaborative editor,
a typeahead, an infinite feed, a design system for forty teams, or a dashboard with fifty live
widgets. Those rounds have their own vocabulary — rendering strategy, cache invalidation in the
client, optimistic updates, conflict resolution — and `Frontend/` is where it lives.

## Sections

| Section                                                              | Chapters | What it covers                                                    |
| --------------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| [Fundamentals](./Fundamentals/README.md)                             | 8        | The vocabulary, the trade-offs, and the RADIO framework           |
| [Building Blocks](./BuildingBlocks/README.md)                        | 11       | Load balancers, caches, queues, CDNs — the components             |
| [Database](./Database/README.md)                                     | 10       | Sharding, replication, isolation, consistency, modelling          |
| [Frontend System Design](./Frontend/README.md)                       | 13       | The rounds this reader is most likely to face and least ready for |
| [Microservices](./Microservices/README.md)                           | 8        | Boundaries, resilience, observability across services             |
| [Case Studies](./InterviewQuestions/README.md)                       | 20       | Worked answers, cut to ten by improvement #28                     |

## The RADIO Framework

Every case study in this part follows the same five steps, because an interviewer scores the process
as much as the answer.

| Step               | What you do                                             | Time      |
| ------------------ | -------------------------------------------------------- | --------- |
| **R**equirements   | Functional, non-functional, and the scale numbers        | 5–10 min  |
| **A**rchitecture   | The boxes and arrows, at one level of detail             | 10–15 min |
| **D**ata model     | Core entities and their relationships                    | 5–10 min  |
| **I**nterface      | Four to six APIs with request and response shapes        | 5–10 min  |
| **O**ptimisations  | The scaling levers, and what each one costs              | 15–20 min |

The full walkthrough is in `Fundamentals/08-framework.md`.

## What Interviewers Probe For

The senior signal for this part is **drives the round — clarifies requirements, states assumptions,
defends trade-offs.** Note what is not on that list: arriving at the "correct" architecture.

- **Do you ask before you draw?** Candidates who start sketching in the first minute have skipped the
  step the interviewer is scoring hardest. Read volume against write volume changes everything after
  it.
- **Do you state your assumptions out loud?** "I am assuming ten million daily actives and a
  hundred-to-one read-write ratio" lets the interviewer correct you cheaply. Silence does not.
- **Can you defend a trade-off rather than a choice?** Every answer here has a cost. Naming it before
  being asked is the single clearest seniority marker in the round.
- **Can you estimate?** Back-of-the-envelope numbers — queries per second, storage per year,
  bandwidth — are what turn a diagram into a design.

## Reading Order

`Fundamentals/` → `BuildingBlocks/` → then split by the round you expect. Frontend-heavy readers
should go to `Frontend/` next and treat `Database/` and `Microservices/` as depth. Then practise with
the case studies, out loud, against a timer.

**Interview sprint:** `Fundamentals/08` (RADIO), `Fundamentals/07` (estimation),
`BuildingBlocks/01`–`03` (load balancing, caching, CDN), then three case studies end to end.

> ⚠️ Three directories are gone. `Scalability/` and `Infrastructure/` went at #22 and #23, which
> merged what was worth keeping into `Fundamentals/`, `BuildingBlocks/` and `Database/` and archived
> the rest. `Security/` went at #24: authorisation, encryption at rest and SSRF moved into
> `Backend/Security/`, and the directory is now `Archive/systemdesign/security/`.
