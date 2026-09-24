---
title: Rendering
part: 3
chapter: 23
slug: modern-stack-rendering-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [rendering, ssr, ssg, isr, ppr, hydration, streaming, seo]
in_book: true
---

# Rendering

This is the section that makes the book last past 2027. Frameworks change; rendering models do not. Five
chapters, none of which name a framework in the title, covering the decision every senior frontend
engineer is expected to make and defend: what runs where, and when.

The through-line is chapter 03's argument — **rendering is a per-route decision, not a per-application
one.** A marketing page, a logged-in dashboard and a search result have three different answers, and a
codebase that gives them one answer has chosen wrongly for at least two of them.

## Chapters

| #  | Chapter                                                                    | What it answers                                                     |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [The Rendering Spectrum and the Cost of Hydration](#ch-rendering-spectrum) | CSR, SSR, SSG, ISR, PPR, islands — what does each do, and what does the browser pay after the HTML arrives? |
| 02 | [Streaming HTML](#ch-streaming-html)                                       | How does a response arrive in pieces, and what does that buy?       |
| 03 | [Choosing a Rendering Strategy per Route, with SEO](#ch-choosing-per-route) | Which strategy does this route need, what does a crawler need, and how do you defend it? |
| 04 | [Edge Versus Origin Rendering](#ch-edge-vs-origin-rendering)               | Where should this run, and when is the edge the wrong answer?       |
| 05 | [Choosing a Meta-Framework](#ch-choosing-a-meta-framework)                 | Which decisions does the framework make for you, and which stick?   |

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
Next.js ones. Then 02, which explains how the strategies 01 named reach the browser. Chapter 03 is the
payoff and should be read after both.

Chapters 04 and 05 are independent and can be read whenever the question comes up.

**Interview sprint:** 01 → 03. Twenty minutes, and it is the highest return of any pair in the part.
