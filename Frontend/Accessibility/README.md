---
title: Part II — Accessibility
part: 2
chapter: 13
slug: frontend-accessibility-index
level: advanced
reading_time: 3
updated: 2026-09-24
tags: [accessibility, wcag, aria, keyboard, forms]
in_book: true
---

# Part II — Accessibility

Five chapters on the topic that changed status in June 2025. That month the European Accessibility Act
became enforceable. Accessibility stopped being a quality argument a product manager could defer. It
became a requirement with a named standard, a conformance level and an audit. For a senior engineer
working on anything sold into the EU, this is one of two subjects where knowing the detail is worth more
than knowing another framework. The other is internationalisation.

The section is built around one claim: **most accessibility work is choosing the right element and
deciding where focus goes.** ARIA is the small remainder, and the law is why anyone is asking. To find
out whether you got it right, you use the axe gate in CI and two manual passes. Those live in
[Chapter ?? — Testing Accessibility](#ch-testing-accessibility), with the rest of testing in Part IV.

## Chapters

| #  | Chapter                                                                    | What it answers                                                     |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [Why Accessibility, and the Law](#ch-accessibility-and-the-law)            | Which rules apply, what level do they ask for, and which numbers must a design hit? |
| 02 | [The Accessibility Tree](#ch-accessibility-tree)                           | What does a screen reader actually read, and how is a name computed? |
| 03 | [ARIA, and When Not to Use It](#ch-aria)                                   | When is an attribute the answer, and when is it making things worse? |
| 04 | [Keyboard and Focus Management](#ch-keyboard-and-focus)                     | Can the whole product be used without a mouse, and where does focus go after an action? |
| 05 | [Accessible Forms and Error Messaging](#ch-accessible-forms)                | How does a user who cannot see the form know what went wrong?        |

## What Interviewers Probe For

The senior signal for this part is **structural rather than remedial — reaches for the element, not the
attribute.**

- **Is accessibility a decision or a fix?** A candidate who answers a custom-dropdown question with
  `role` and `aria-label` has started in the wrong place. The first move is asking whether a `<select>`
  will do. The second is naming the APG pattern (the W3C's ARIA Authoring Practices Guide) rather than
  inventing a keyboard model.
- **Do you know what the target is?** WCAG 2.2 AA. It is the level that the European Accessibility Act,
  the Web Accessibility Directive, ADA Title II and Section 508 all name. "We follow best practice" is not
  an answer a procurement review accepts.
- **Where does focus go?** Ask it about a dialog closing, a row being deleted, a failed submit or a
  client-side route change. Four answers, and most candidates have thought about one.
- **What can you not automate?** First, name the ceiling: automated rules catch a third to a half of
  criteria. Then name the two manual passes. That separates someone who has shipped an accessible product
  from someone who has installed axe.
- **Can you cost it?** A custom combobox is a week of work and a permanent maintenance cost. Saying so in
  the estimate is a senior contribution. Discovering it in the sprint is not.

## Reading Order

Read 01 first, because it sets the target every other chapter is measured against. Then read 02, the
mental model the rest depends on. You cannot debug an announcement without reading the tree. Then 04 and
05, where most of the daily work is. 03 sits after 02 on purpose: ARIA makes sense once you know what it
writes into.

**Interview sprint:** 01, 04 and the interview questions in 03. The legal frame, the focus decisions, and
the first rule of ARIA cover most of what a frontend loop asks. "What can you not automate?" is the
follow-up that usually decides the answer, and Part IV's testing chapter answers it.
