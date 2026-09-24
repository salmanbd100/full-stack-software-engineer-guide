---
title: Part VI — Case Studies
part: 6
chapter: 20
slug: part-system-design-case-studies
level: advanced
reading_time: 2
updated: 2026-09-24
tags: [system-design, case-study, radio, frontend, interview]
in_book: true
---

# Part VI — Case Studies

Three worked rounds — one backend-shaped, two frontend-shaped. Each is a different **shape** of problem
rather than a different product: an interviewer can ask for any of a hundred products, and there are only
about a dozen shapes underneath.

Read them out loud against a timer. A case study you have read is worth very little; a case study you
have talked through for forty minutes is worth the whole section.

## Chapters

| #  | Chapter | The shape it teaches |
| -- | ------- | -------------------- |
| 01 | [Design a URL Shortener](#ch-design-url-shortener) | Mint a key with no coordination; serve enormous reads from cache |
| 02 | [Design a Collaborative Document Editor](#ch-design-collaborative-editor) | Convergence without a lock — CRDTs, offline merge, shared undo |
| 03 | [Design an Infinite Feed](#ch-design-infinite-feed) | Two budgets — bytes fetched and DOM nodes kept |

These three cover the shapes the others reduce to: a read-heavy key–value service, shared state that
must converge, and a client with a render budget.

Each follows RADIO inside its `How It Works` section: requirements, architecture, data model, interface,
optimisations. The framework itself is [Chapter ?? — Driving the Design Round, Backend and Frontend](#ch-driving-the-round), and
the sixth shape this section does not carry — a retrieval-based AI product, asked as "design a RAG system"
— is worked in [Chapter ?? — AI in Interviews](#ch-ai-in-interviews).

## What Interviewers Probe For

- **Do you scope before you draw?** Every chapter here names what it cut, out loud, in the requirements
  step. That is deliberate.
- **Do you reach the interesting decision?** Each design has one — key generation, the merge rule, the
  render budget. A round that never gets there scores badly however tidy the
  diagram is.
- **Can you say what your design cannot do?** Tombstones that never leave, a footer the infinite feed makes
  unreachable. Naming a limit is stronger than pretending there is none.

## Reading Order

01 first — it is the smallest complete round and the one to rehearse until the structure is automatic.
Then 02 and 03 in either order; they are independent.

**Interview sprint:** 01 and whichever of 02–03 is closest to the role, out loud, timed at 45 minutes each.

> ⚠️ Ten studies left this section — six at **#31d**, two at **#43** (news feed, chat system) and two at
> **#101** (Ticketmaster, live dashboard). Each duplicated a shape another chapter teaches or a topic
> Part V now owns. They sit in `Archive/systemdesign/case-studies/` and `Archive/system-design/case-studies/`,
> and still work as extra rehearsal.
