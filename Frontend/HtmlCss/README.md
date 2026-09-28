---
title: Part II — HTML and CSS
part: 2
chapter: 1
slug: frontend-html-css-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [html, css, accessibility, semantics]
in_book: true
---

# Part II — HTML and CSS

This is the platform layer that every framework sits on top of. Engineers who skipped it hit a ceiling
in interviews. It shows up as soon as the question stops being about state and starts being about the
document. Why did the focus ring vanish? Why does the modal trap a screen reader? Why did the cascade
pick the rule you did not expect? This section treats markup and styling as engineering decisions with
consequences, not as syntax.

It is short on purpose. Interviewers assume a senior candidate knows the layout mechanics: the box
model, flexbox, grid, breakpoints and keyframes. They almost never ask you to recite them. They probe
the parts with a legal or architectural consequence. Which element did you choose? Does the page work
without a mouse? Which features shipped since 2023 replaced a workaround you are still carrying? The
archived layout chapters are in `Archive/htmlcss/` if they are ever wanted back.

**Accessibility used to be the third chapter here and is now a section of its own**, with five chapters,
in [Part II — Accessibility](#ch-frontend-accessibility-index). It outgrew this section for the same
reason it is worth reading. The European Accessibility Act became enforceable in June 2025, so accessibility
is now a legal requirement with a named standard. It is also one of the two topics, with internationalisation,
that most reliably separate a senior candidate from a mid-level one in a frontend round.

## Chapters

| #  | Chapter                                        | What it answers                                                |
| -- | ---------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Semantic HTML](#ch-semantic-html)             | Which element, and what do you get free by choosing it?        |
| 02 | [Advanced CSS](#ch-advanced-css)               | What shipped since 2023, and what did each feature replace?    |
| 03 | [Container Queries and Cascade Layers](#ch-container-queries-and-layers) | How does a component respond to its slot, and who wins a conflict? |
| 04 | [Animation and View Transitions](#ch-animation-and-view-transitions) | Which properties are free to animate, and who holds both states? |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** In a
round, that shows up as:

- **Is accessibility structural or bolted on?** A candidate who reaches for `role` and `aria-label`
  first has answered badly. The right first move is to pick the element that already has the
  semantics. The rest of that argument is in [Chapter ?? — ARIA, and When Not to Use It](#ch-aria).
- **Do you know the cascade well enough to debug it?** That means specificity, inheritance and cascade
  layers. It also means knowing why `!important` on a utility class is a design decision, not a hack.
  The test is a screenshot of something styled wrongly and the question "why?"
- **Have you kept up?** Container queries, `:has()`, cascade layers, subgrid and `oklch()` each replaced
  a workaround. Naming the workaround they replaced is the answer that scores.
- **Do you understand what triggers layout?** Animating `width` and animating `transform` look the same
  and cost completely different amounts. This is where Part IV's performance material starts.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "Make this accessible" | Adds `role` and `aria-label` | Picks the element that already has the semantics, and adds ARIA only for what HTML cannot express |
| "Why is this styled wrongly?" | "I'll add `!important`" | Specificity, then inheritance, then which cascade layer won — and `!important` as a stated design decision |
| "Why is this animation janky?" | "It needs `will-change`" | Animating `width` forces layout every frame; `transform` composites without it |

## Reading Order

Read straight through. Each chapter is independent and reads cold. Then go to
[Part II — Accessibility](#ch-frontend-accessibility-index). The document half of this section
continues there, and it is the more valuable read for a senior interview.

**Interview sprint:** 01, then the accessibility section. Semantics and accessibility cover most of what a
frontend loop asks about the document before it moves on to frameworks. Chapter 02 is worth an hour only
if the role names CSS explicitly.
