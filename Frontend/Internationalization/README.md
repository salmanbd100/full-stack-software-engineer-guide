---
title: Part II — Internationalisation
part: 2
chapter: 0
slug: frontend-internationalization-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-09-01
tags: [i18n, l10n, intl, rtl, formatting]
in_book: true
---

# Part II — Internationalisation

Research on frontend system design rounds is consistent that accessibility and internationalisation
are the two topics that most reliably separate a senior candidate from a mid-level one. Both are
under-taught, which makes this short section cheap differentiation. It is also the section most
readers underestimate, because "extract the strings" sounds like the whole job and is roughly a tenth
of it.

The platform does far more of this than most engineers know. `Intl` handles dates, numbers, currency,
relative time, plural rules and list formatting natively, in every evergreen browser. A large part of
this section is about not shipping a library for work the browser already does.

## Chapters

| #  | Chapter                                                          | What it answers                                                |
| -- | ---------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Internationalisation Fundamentals](./01-i18n-fundamentals.md)   | What belongs in a translation file, and what does not?         |
| 02 | [Pluralisation](./02-pluralization.md)                           | How do you handle six plural forms without hard-coding one?    |
| 03 | [Date and Number Formatting](./03-date-number-formatting.md)     | How much of this does `Intl` already do for you?               |
| 04 | [Right-to-Left Support](./04-rtl-support.md)                     | How do you mirror a layout without a second stylesheet?        |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.**
Internationalisation is where that is most literally true:

- **Do you know why string concatenation breaks translation?** Word order differs between languages,
  so a sentence assembled from fragments cannot be translated correctly. Interpolation with named
  placeholders is the fix, and knowing *why* is the answer.
- **Can you handle plurals properly?** English has two forms, Arabic has six, Japanese has one.
  `Intl.PluralRules` exists precisely because `count === 1` is wrong in most of the world.
- **Is your CSS direction-agnostic?** `margin-inline-start` instead of `margin-left` means RTL
  support is close to free. Retrofitting it later is a full pass over the stylesheet.
- **What happens to your layout when the text gets 40% longer?** German and Finnish do this routinely.
  A design that only works at English string lengths is a bug the candidate should have anticipated.
- **Where do the translations load from?** Shipping every locale in the main bundle is the default
  mistake. Splitting by locale and loading one is the fix, and it interacts with rendering strategy —
  a server-rendered page can pick the locale before any JavaScript runs.
- **Which locale do you trust?** The `Accept-Language` header, the URL, and a stored user preference
  disagree regularly. Naming a precedence order, and keeping the locale in the URL so a link is
  shareable, is the senior answer.

## Reading Order

Straight through — the section is short and each chapter builds on the last. Chapter 04 is the one to
read before starting any new project, because it is far cheaper to do first than to retrofit.

**Interview sprint:** 01 → 03. The message-format question and the "you probably do not need a
library" answer between them cover most of what gets asked.
