---
title: Part VI — Case Studies
part: 6
chapter: 0
slug: part-system-design-case-studies
level: advanced
reading_time: 2
updated: 2026-09-07
tags: [system-design, case-study, radio, frontend, interview]
in_book: true
---

# Part VI — Case Studies

Five worked rounds — two backend-shaped, three frontend-shaped. Each is a different **shape** of problem
rather than a different product: an interviewer can ask for any of a hundred products, and there are only
about a dozen shapes underneath.

Read them out loud against a timer. A case study you have read is worth very little; a case study you
have talked through for forty minutes is worth the whole section.

## Chapters

| #  | Chapter                                                             | The shape it teaches                                          |
| -- | ------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Design a URL Shortener](./01-url-shortener.md)                     | Mint a key with no coordination; serve enormous reads from cache |
| 02 | [Design Ticketmaster](./02-ticketmaster.md)                         | Contention rather than volume — locking and admission control    |
| 03 | [Design a Collaborative Document Editor](./03-collaborative-editor.md) | Convergence without a lock — CRDTs, offline merge, shared undo |
| 04 | [Design an Infinite Feed](./04-infinite-feed.md)                    | Two budgets — bytes fetched and DOM nodes kept                   |
| 05 | [Design a Live Dashboard](./05-live-dashboard.md)                   | Fan-in over one connection, and dropping data to keep frames     |

Each follows RADIO inside its `How It Works` section: requirements, architecture, data model, interface,
optimisations. The framework itself is [Chapter ?? — Driving the Design Round](#ch-driving-the-round), and
the sixth shape this section does not carry — a retrieval-based AI product, asked as "design a RAG system"
— is worked in [Chapter ?? — AI in Interviews](#ch-ai-in-interviews).

## What Interviewers Probe For

- **Do you scope before you draw?** Every chapter here names what it cut, out loud, in the requirements
  step. That is deliberate.
- **Do you reach the interesting decision?** Each design has one — key generation, admission control, the
  merge rule, the render budget, what to drop. A round that never gets there scores badly however tidy the
  diagram is.
- **Can you say what your design cannot do?** Approximate seat counts, tombstones that never leave, updates
  thrown away on purpose. Naming a limit is stronger than pretending there is none.

## Reading Order

01 first — it is the smallest complete round and the one to rehearse until the structure is automatic.
Then 02 for a backend shape, and 03–05 in any order; they are independent.

**Interview sprint:** 01 and whichever of 03–05 is closest to the role, out loud, timed at 45 minutes each.

> ⚠️ Eight backend studies left this section — six at **#31d** and two more at **#43** (news feed, chat
> system). Each duplicated a shape another chapter teaches or a topic Part V now owns; all eight sit in
> `Archive/systemdesign/case-studies/` and still work as extra rehearsal.
