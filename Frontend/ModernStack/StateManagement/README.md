---
title: State Management
part: 3
chapter: 0
slug: modern-stack-state-management-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [state, tanstack-query, zustand, forms, url-state, signals]
in_book: true
---

# State Management

The field moved, and the interview moved with it. "Which state library do you use?" was a 2019 question
with a one-word answer. The 2026–27 question is **which kind of state is this?** — because server state,
client state, form state and URL state are four different problems, and the tool that solves one of them
well solves the others badly.

Six chapters. Chapter 01 sets the categories; chapters 02–05 take one each; chapter 06 looks at where
the model is heading. Redux is not the default any more — Zustand has overtaken it in downloads and
TanStack Query owns server state — but the chapters argue from the problem, not the download chart.

## Chapters

| #  | Chapter                          | What it answers                                                   |
| -- | -------------------------------- | ----------------------------------------------------------------- |
| 01 | The four kinds of state          | Server, client, form or URL — which one is this, and why ask?    |
| 02 | Server state with TanStack Query | How do you cache, invalidate and refetch without writing a cache? |
| 03 | Client state                     | Zustand, Jotai, Context — and when does `useState` still win?     |
| 04 | Form state                       | Where does validation live when the server validates too?         |
| 05 | URL as state                     | What should survive a refresh, a back button and a pasted link?   |
| 06 | Signals and the next model       | Why do runes and signals work, and why has React not adopted them? |

> ⚠️ **Being written.** Improvement #40 fills this table; the titles link as each chapter lands. It also
> absorbs `SystemDesign/Frontend/02-state-management.md`, staged in `Archive/salvage/frontend/`.

## What Interviewers Probe For

Two state questions, on top of the part-level signals in the Part III opener:

- **"Where does this data live?"** Server data put into a client store is the classic mistake, and it is
  expensive: you have hand-written a cache with no staleness policy, no deduplication and no
  invalidation. Naming that as a cache problem rather than a store problem is the answer that scores.
- **"Which state should be in the URL?"** Anything a user would reasonably expect to share, bookmark or
  reach with the back button — filters, tabs, pagination, the open row of a table. Candidates who never
  consider the URL build dashboards that cannot be linked to, and enterprise reviewers notice.

## Reading Order

01 first — it is the framing the other five chapters use, and it is the highest-leverage chapter in
Part III for its length. After that, read the chapter matching the problem in front of you; 02–05 are
independent of each other.

Chapter 06 pairs with the Svelte runes chapter and with `Rendering/02`; read it after either.

**Interview sprint:** 01 → 02. The four categories plus server-state caching cover most of what a
senior round asks about state.
