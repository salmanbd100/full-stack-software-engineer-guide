---
title: Part II — HTML and CSS
part: 2
chapter: 0
slug: frontend-html-css-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [html, css, layout, accessibility, responsive]
in_book: true
---

# Part II — HTML and CSS

The platform layer that every framework sits on top of. Engineers who skipped it hit a ceiling that
shows up in interviews as soon as the question stops being about state and starts being about the
document — why the focus ring vanished, why the modal traps a screen reader, why the layout collapses
at 320 pixels. This section covers markup and styling as engineering decisions with consequences, not
as syntax.

Two chapters here punch well above their weight. **Accessibility** has been a legal requirement across
the EU since the European Accessibility Act became enforceable in June 2025, and it is one of the two
topics that most reliably separate a senior candidate from a mid-level one in a frontend round.
**Responsive design** is the other, because the answer everyone gives is "media queries" and the
answer that scores is about intrinsic sizing.

## Chapters

| #  | Chapter                                                | What it answers                                                        |
| -- | ------------------------------------------------------ | ---------------------------------------------------------------------- |
| 01 | [Semantic HTML](./01-semantic-html.md)                 | Which element, and what do you get free by choosing it?                |
| 02 | [CSS Fundamentals](./02-css-fundamentals.md)           | Which rule wins, and why is the box that size?                         |
| 03 | [Flexbox](./03-flexbox.md)                             | Which axis is each property actually talking about?                    |
| 04 | [CSS Grid](./04-grid.md)                               | How do you build structure that survives unplanned content?            |
| 05 | [Responsive Design](./05-responsive-design.md)         | How do you adapt without a breakpoint per device?                      |
| 06 | [CSS Animations](./06-css-animations.md)               | Why does `transition: all` cost you frames?                            |
| 07 | [Accessibility](./07-accessibility.md)                 | How do you pass a keyboard, a screen reader and a legal audit?         |
| 08 | [Advanced CSS](./08-advanced-css.md)                   | What shipped since 2023, and what did each feature replace?            |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** In a
round, that shows up as:

- **Do you know the cascade well enough to debug it?** Specificity, inheritance, the cascade layers,
  and why `!important` on a utility class is a design decision rather than a hack. The test is a
  screenshot of something styled wrongly and the question "why?"
- **Is accessibility structural or bolted on?** A candidate who reaches for `role` and `aria-label`
  first has answered badly. The right first move is picking the element that already has the
  semantics. ARIA is what you use when no element fits.
- **Can you lay something out without guessing?** Flexbox versus Grid is a one-line answer — content-
  driven in one dimension against structure-driven in two — and interviewers ask it to see whether
  you have a rule or a habit.
- **Do you understand what triggers layout?** Animating `width` and animating `transform` look the
  same and cost completely different amounts. This is where Part IV's performance material starts.

## Reading Order

Straight through. Chapters 03 and 04 are a pair and read best together. Chapter 07 is the one to read
twice — it is the highest-leverage chapter in the section for a senior interview.

**Interview sprint:** 01 → 02 → 07 → 05. Semantics, the cascade, accessibility and responsive
strategy cover most of what a frontend loop asks before it moves on to frameworks.
