---
title: Part VI — Case Studies
part: 6
chapter: 0
slug: part-system-design-case-studies
level: advanced
reading_time: 2
updated: 2026-09-02
tags: [system-design, case-study, radio, interview]
in_book: true
---

# Part VI — Case Studies

Four worked rounds. Each one is a different **shape** of problem rather than a different product, which
is the point — an interviewer can ask for any of a hundred products, and there are only about a dozen
shapes underneath them.

Read them out loud against a timer. A case study you have read is worth very little; a case study you
have talked through for forty minutes is worth the whole section.

## Chapters

| #  | Chapter                                                | The shape it teaches                                        |
| -- | ------------------------------------------------------ | ------------------------------------------------------------ |
| 01 | [Design a URL Shortener](./01-url-shortener.md)        | Mint a key with no coordination; serve enormous reads from cache |
| 02 | [Design a News Feed](./02-news-feed.md)                | Fan-out on write versus on read, and the celebrity problem   |
| 03 | [Design a Chat System](./03-chat-system.md)            | A stateful edge, message ordering, and offline delivery      |
| 04 | [Design Ticketmaster](./04-ticketmaster.md)            | Contention rather than volume — locking and admission control |

Each follows RADIO inside its `How It Works` section: requirements, architecture, data model, interface,
optimisations. The framework itself is
[Chapter ?? — Driving the Design Round](#ch-driving-the-round).

## What Interviewers Probe For

- **Do you scope before you draw?** Every chapter here names what it cut, out loud, in the requirements
  step. That is deliberate.
- **Do you reach the interesting decision?** Each of these designs has one — key generation, fan-out
  strategy, session routing, admission control. A round that never gets there scores badly however tidy
  the diagram is.
- **Can you say what your design cannot do?** Approximate seat counts, stale feeds, no global message
  order. Naming a limit is stronger than pretending there is none.

## Reading Order

01 first — it is the smallest complete round and the one to rehearse until the structure is automatic.
Then 02, 03 and 04 in any order; they are independent.

**Interview sprint:** 01 and 02 end to end, out loud, timed at 45 minutes each.

> ⚠️ Six studies left this section at **#31d** — rate limiter, typeahead, notification system,
> Instagram, API gateway and distributed cache. Each duplicated a shape another chapter already teaches,
> or a topic Part V now owns; all six are in `Archive/systemdesign/case-studies/` and are still worth
> reading as extra rehearsal. **Five frontend case studies join this section at #43** — a collaborative
> editor, a typeahead component, an infinite feed, a design system for forty teams, and a dashboard with
> fifty live widgets.
