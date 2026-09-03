---
title: Rendering
part: 3
chapter: 0
slug: modern-stack-rendering-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [rendering, ssr, ssg, isr, ppr, hydration, streaming, seo]
in_book: true
---

# Rendering

This is the section that makes the book last past 2027. Frameworks change; rendering models do not. Six
chapters, none of which name a framework in the title, covering the decision every senior frontend
engineer is expected to make and defend: what runs where, and when.

The through-line is chapter 04's argument — **rendering is a per-route decision, not a per-application
one.** A marketing page, a logged-in dashboard and a search result have three different answers, and a
codebase that gives them one answer has chosen wrongly for at least two of them.

## Chapters

| #  | Chapter                         | What it answers                                                     |
| -- | ------------------------------- | ------------------------------------------------------------------- |
| 01 | The rendering spectrum          | CSR, SSR, SSG, ISR, PPR, islands — what does each actually do?      |
| 02 | Hydration and its costs         | What is the browser paying for after the HTML has arrived?          |
| 03 | Streaming HTML                  | How does a response arrive in pieces, and what does that buy?       |
| 04 | Choosing per route, not per app | Which strategy does this route need, and how do you defend it?      |
| 05 | SEO and rendering               | What does a crawler need, and what genuinely requires server render? |
| 06 | Edge versus origin rendering    | Where should this run, and when is the edge the wrong answer?       |

> ⚠️ **Being written.** Improvement #39 fills this table; the titles link as each chapter lands. It also
> absorbs `SystemDesign/Frontend/03-rendering.md`, staged in `Archive/salvage/frontend/`, which covered
> part of chapters 01 and 04.

## What Interviewers Probe For

Two rendering questions, on top of the part-level signals in the Part III opener:

- **"Your LCP is 4.2 seconds. Where do you look?"** The answer separates the metrics. TTFB is a server
  and network problem; FCP is a streaming and blocking-resource problem; LCP is usually an image or a
  font. Candidates who answer "add SSR" have not understood which number moved.
- **"When is the edge the wrong choice?"** When the data is not there. Rendering in Sydney against a
  database in Virginia turns one slow round trip into several. Data locality beats compute locality, and
  saying so out loud is a strong senior signal.

## Reading Order

01 first, always — it is the vocabulary every other chapter in Part III assumes, including the React and
Next.js ones. Then 02 → 03, which explain the cost of the strategies 01 named. Chapter 04 is the payoff
and should be read after all three.

Chapters 05 and 06 are independent and can be read whenever the question comes up.

**Interview sprint:** 01 → 04. Twenty minutes, and it is the highest return of any pair in the part.
