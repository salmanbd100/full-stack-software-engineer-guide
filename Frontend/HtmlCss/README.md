---
title: Part II — HTML and CSS
part: 2
chapter: 0
slug: frontend-html-css-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [html, css, accessibility, semantics]
in_book: true
---

# Part II — HTML and CSS

The platform layer that every framework sits on top of. Engineers who skipped it hit a ceiling that
shows up in interviews as soon as the question stops being about state and starts being about the
document — why the focus ring vanished, why the modal traps a screen reader, why the cascade picked the
rule you did not expect. This section covers markup and styling as engineering decisions with
consequences, not as syntax.

It is deliberately short. Layout mechanics — the box model, flexbox, grid, breakpoints, keyframes — are
the part of CSS a senior candidate is assumed to have and is almost never asked to recite. What gets
probed is the part with a legal or architectural consequence: which element you chose, whether the page
works without a mouse, and which of the features that shipped since 2023 replaced a workaround you are
still carrying. The archived layout chapters are in `Archive/htmlcss/` if they are ever wanted back.

**Accessibility used to be the third chapter here and is now a section of its own** — six chapters, in
[`Accessibility/`](../Accessibility/README.md). It outgrew this section for the reason it is
worth reading: since the European Accessibility Act became enforceable in June 2025 it is a legal
requirement with a named standard, and it is one of the two topics — with internationalisation — that most
reliably separate a senior candidate from a mid-level one in a frontend round.

## Chapters

| #  | Chapter                                        | What it answers                                                |
| -- | ---------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Semantic HTML](./01-semantic-html.md)         | Which element, and what do you get free by choosing it?        |
| 02 | [Advanced CSS](./02-advanced-css.md)           | What shipped since 2023, and what did each feature replace?    |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** In a
round, that shows up as:

- **Is accessibility structural or bolted on?** A candidate who reaches for `role` and `aria-label`
  first has answered badly. The right first move is picking the element that already has the
  semantics — the rest of that argument is [Chapter ?? — ARIA, and When Not to Use It](#ch-aria).
- **Do you know the cascade well enough to debug it?** Specificity, inheritance, cascade layers, and
  why `!important` on a utility class is a design decision rather than a hack. The test is a
  screenshot of something styled wrongly and the question "why?"
- **Have you kept up?** Container queries, `:has()`, cascade layers, subgrid and `oklch()` each replaced
  a workaround. Naming the workaround they replaced is the answer that scores.
- **Do you understand what triggers layout?** Animating `width` and animating `transform` look the same
  and cost completely different amounts. This is where Part IV's performance material starts.

## Reading Order

Straight through — both chapters are independent and each reads cold. Then go to
[`Accessibility/`](../Accessibility/README.md), which is where the document half of this section continues
and is the higher-leverage read for a senior interview.

**Interview sprint:** 01, then the accessibility section. Semantics and accessibility cover most of what a
frontend loop asks about the document before it moves on to frameworks. Chapter 02 is worth an hour only
if the role names CSS explicitly.
