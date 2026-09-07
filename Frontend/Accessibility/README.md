---
title: Part II — Accessibility
part: 2
chapter: 0
slug: frontend-accessibility-index
level: advanced
reading_time: 3
updated: 2026-09-07
tags: [accessibility, wcag, aria, keyboard, forms, testing]
in_book: true
---

# Part II — Accessibility

Six chapters on the topic that changed status in June 2025. The European Accessibility Act became
enforceable, and accessibility stopped being a quality argument a product manager could defer and became
a requirement with a named standard, a conformance level and an audit. For a senior engineer working on
anything sold into the EU, that makes this one of the two subjects — with internationalisation — where
knowing the detail is worth more than knowing another framework.

The section is built around one claim: **most accessibility work is choosing the right element and
deciding where focus goes.** ARIA is the small remainder, testing is how you find out, and the law is why
anyone is asking. Read in that order and the six chapters are a single argument rather than a checklist.

## Chapters

| #  | Chapter                                                                    | What it answers                                                     |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [Why Accessibility, and the Law](#ch-accessibility-and-the-law)            | Which rules apply, what level do they ask for, and which numbers must a design hit? |
| 02 | [The Accessibility Tree](#ch-accessibility-tree)                           | What does a screen reader actually read, and how is a name computed? |
| 03 | [ARIA, and When Not to Use It](#ch-aria)                                   | When is an attribute the answer, and when is it making things worse? |
| 04 | [Keyboard and Focus Management](#ch-keyboard-and-focus)                     | Can the whole product be used without a mouse, and where does focus go after an action? |
| 05 | [Accessible Forms and Error Messaging](#ch-accessible-forms)                | How does a user who cannot see the form know what went wrong?        |
| 06 | [Testing Accessibility](#ch-testing-accessibility)                         | What can be gated in CI, and what has to be done by hand?            |

## What Interviewers Probe For

The senior signal for this part is **structural rather than remedial — reaches for the element, not the
attribute.**

- **Is accessibility a decision or a fix?** A candidate who answers a custom-dropdown question with
  `role` and `aria-label` has started in the wrong place. The first move is asking whether a `<select>`
  will do, and the second is naming the APG pattern rather than inventing a keyboard model.
- **Do you know what the target is?** WCAG 2.2 AA, because that is the level the European Accessibility
  Act, the Web Accessibility Directive, ADA Title II and Section 508 all name. "We follow best practice"
  is not an answer a procurement review accepts.
- **Where does focus go?** Ask it about a dialog closing, a row being deleted, a failed submit or a
  client-side route change. Four answers, and most candidates have thought about one.
- **What can you not automate?** Naming the ceiling — automated rules catch a third to a half of criteria
  — and then naming the two manual passes is what separates someone who has shipped an accessible product
  from someone who has installed axe.
- **Can you cost it?** A custom combobox is a week of work and a permanent maintenance cost. Saying so in
  the estimate is a senior contribution; discovering it in the sprint is not.

## Reading Order

01 first, because it sets the target every other chapter is measured against, then 02, which is the
mental model the rest depends on — you cannot debug an announcement without reading the tree. Then 04 and
05, which is where most of the daily work is. 03 sits after 02 deliberately: ARIA makes sense once you
know what it is writing into. 06 last, and revisit it whenever a pipeline needs a gate.

**Interview sprint:** 01, 04 and the interview questions in 03. The legal frame, the focus decisions, and
the first rule of ARIA cover most of what a frontend loop asks — and 06's "what can you not automate" is
the follow-up that usually decides the answer.

> ⚠️ This section replaces the single accessibility chapter that used to sit in
> [`HtmlCss/`](../HtmlCss/README.md). Its material is distributed across all six chapters here, so nothing
> was lost — but its old anchor no longer exists, and the three cross-references that used it were
> repointed when this section was created.
