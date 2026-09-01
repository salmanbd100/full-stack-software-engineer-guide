---
title: Part II — CSS Architecture
part: 2
chapter: 0
slug: frontend-cssarchitecture-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-01
tags: [css, tailwind, css-in-js, design-systems, methodologies]
in_book: true
---

# Part II — CSS Architecture

CSS is the only part of a frontend codebase where every file shares one global namespace, and this
section is about what teams do to survive that. It is a short section with one large question behind
it: how do you let forty people add styles without any of them breaking each other's work?

Every answer here is a trade of one cost against another. Scoping buys safety and spends readability.
Utilities buy consistency and spend markup. Runtime CSS-in-JS buys expressiveness and spends
hydration time. The chapters are structured around naming those trades rather than picking a winner,
because the interview question is never "which is best" — it is "why did your team choose that?"

## Chapters

| #  | Chapter                                                          | What it answers                                                  |
| -- | ---------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [CSS Methodologies](./01-css-methodologies.md)                   | How do you name things so a stranger can add a rule safely?      |
| 02 | [Utility-First vs Component-First](./02-utility-vs-component.md) | What is the actual Tailwind trade-off, stripped of preference?   |
| 03 | [CSS-in-JS](./03-css-in-js.md)                                   | What does runtime CSS-in-JS cost at hydration?                   |
| 04 | [Design Systems](./04-design-systems.md)                         | How do forty teams adopt a component library without forking it? |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library** — and
for architecture specifically, *can defend a styling decision at team scale*.

- **Can you argue both sides of Tailwind?** The answer that scores names the real trade: utilities
  make the styles local and the markup noisy, and they only pay off with a shared token scale. An
  answer that is purely taste, in either direction, reads as junior.
- **Do you know what runtime CSS-in-JS costs?** Serialising styles during render is measurable, and
  it interacts badly with Server Components. Knowing why zero-runtime alternatives exist is the point
  of the question, not knowing the library names.
- **How do you delete CSS?** Every large codebase has dead styles. Whether you can describe a method
  for finding and removing them tells the interviewer how long you have lived with a real stylesheet.
- **What is in a design token?** Not the colours — the constraint. A senior answer covers versioning,
  the deprecation path, and what happens when a team needs a value the system does not have.
- **How do you scope styles without a build step?** Cascade layers and `:where()` control specificity
  natively now, and native nesting shipped across evergreen browsers in 2023. A candidate still
  reaching for a preprocessor to solve specificity has not looked at the platform recently.
- **What is your theming mechanism?** Custom properties that cascade, against a build-time swap. The
  first supports runtime switching and user preference; the second is faster and cannot. Naming which
  one the requirement needs is the answer.

## Reading Order

Chapter 01 first; it sets the vocabulary the rest use. Chapter 04 is the one that matters most for a
senior or staff-level conversation.

**Interview sprint:** 02 → 04. The utility-versus-component question and the design-system question
are the two that come up; 01 and 03 are background for answering them well.

> ⚠️ Design systems appear here and in Part IV's architecture material. This chapter is the styling
> half — tokens, theming, distribution. The governance and migration half belongs to Part IV.
