---
title: State Management
part: 3
chapter: 29
slug: modern-stack-state-management-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [state, tanstack-query, zustand, forms, url-state, signals]
in_book: true
---

# State Management

The field moved, and the interview moved with it. "Which state library do you use?" was a 2019 question
with a one-word answer. The 2026–27 question is **which kind of state is this?** Server state, client
state, form state and URL state are four different problems. The tool that solves one of them well
solves the others badly.

Five chapters. Chapter 01 sets the categories, and chapters 02–05 take one each. Chapter 03 also looks at
signals, where the model is heading. Redux is not the default any more. Zustand has overtaken it in
downloads, and TanStack Query owns server state. But the chapters argue from the problem, not downloads.

## Chapters

| #  | Chapter                                                                     | What it answers                                                   |
| -- | --------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 01 | [The Four Kinds of State](#ch-four-kinds-of-state)                          | Server, client, form or URL — which one is this, and why ask?    |
| 02 | [Server State with TanStack Query](#ch-server-state)                        | How do you cache, invalidate and refetch without writing a cache? |
| 03 | [Client State and Signals](#ch-client-state)                                | Zustand, Jotai, Context or signals — and when does `useState` still win? |
| 04 | [Form State](#ch-form-state)                                                | Where does validation live when the server validates too?         |
| 05 | [URL as State](#ch-url-as-state)                                            | What should survive a refresh, a back button and a pasted link?   |

## What Interviewers Probe For

Two state questions, on top of the part-level signals in the Part III opener:

- **"Where does this data live?"** Server data put into a client store is the classic mistake, and a
  costly one. You have hand-written a cache with no staleness policy, no deduplication and no
  invalidation. The answer that scores names it as a cache problem, not a store problem.
- **"Which state should be in the URL?"** Anything a user would expect to share, bookmark or reach with
  the back button: filters, tabs, pagination, the open row of a table. Candidates who never think of the
  URL build dashboards that nobody can link to, and enterprise reviewers notice.

## Reading Order

Read 01 first. The other four chapters use its framing, and it is the most useful chapter in Part III
for its length. After that, read the chapter for the problem in front of you. Chapters 02–05 do not
depend on each other.

The signals half of chapter 03 pairs with the Svelte 5 runes chapter. Read it after that one.

**Interview sprint:** 01 → 02. The four categories plus server-state caching cover most of what a
senior round asks about state.
