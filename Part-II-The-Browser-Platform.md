---
title: Part II — The Browser Platform
part: 2
chapter: 0
slug: part-browser-platform
level: intermediate
reading_time: 3
updated: 2026-09-19
tags: [html, css, browser-apis, accessibility, i18n, pwa]
in_book: true
---

# Part II — The Browser Platform

A framework is a layer over the platform, and an engineer who skipped the platform hits a ceiling that
shows up in interviews as a specific tell: every answer starts with a library name. This part is the
layer underneath — the markup the browser gives meaning to, the storage it offers, the accessibility
tree it builds whether you think about it or not, and what it does with a locale it has never seen.

Two of the five sections punch well above their line count for this reader. **Accessibility** is a legal
requirement rather than a nice-to-have: the European Accessibility Act became enforceable in June 2025
and applies to any company serving EU consumers, wherever that company is based. And frontend system
design rounds are consistent on this — accessibility and internationalisation are the two topics that
most reliably separate a senior candidate from a mid-level one, and both are chronically under-taught
elsewhere. That makes them cheap differentiation.

## Sections

| Section                                                         | Chapters | What it covers                                                  |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| [HTML and CSS](#ch-frontend-html-css-index)                     | 2        | Semantics the browser acts on, and the modern layout primitives |
| [Browser APIs](#ch-frontend-browser-apis-index)                 | 4        | Storage, cookies and `SameSite`, IndexedDB, permissions          |
| [Accessibility](#ch-frontend-accessibility-index)               | 6        | The accessibility tree, ARIA, focus, forms, testing              |
| [Internationalisation](#ch-frontend-internationalization-index) | 4        | Message keys, plurals, dates and numbers, right-to-left          |
| [Progressive Web Apps](#ch-frontend-pwa-index)                  | 3        | Service workers, caching and offline, install and push          |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** Three
questions run through all five sections; each section index adds its own.

- **What does the browser already do here?** A `<dialog>`, a `<details>`, a native form validation
  message. Every one of them is a component someone was about to build, with focus management and
  keyboard behaviour included.
- **Who is this unusable for, and how do you know?** Not "is it accessible" — that invites a yes. The
  senior answer names a user, a mechanism and a check: a keyboard-only user, a focus trap, an axe run in
  CI that would have caught it.
- **What happens when the assumption breaks?** Storage full, the locale is Arabic, the network is gone,
  the string is 40% longer in German. Each is a one-line change to the test and a redesign to the layout.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "How do you store this?" | "localStorage" | Names the size limit, that it is synchronous and blocks the main thread, and when IndexedDB earns its complexity |
| "Is this accessible?" | "It has ARIA labels" | Which native element would have needed none, and what `role="button"` promises that a `<div>` does not deliver |
| "How do you translate it?" | "Put the strings in a JSON file" | Plural categories, locale-aware formatting, and the layout that breaks before the translation does |

## Reading Order

HTML and CSS first — the accessibility section assumes it. After that the five sections are independent
and can be read in any order.

**Interview sprint:** HTML and CSS 01 · Browser APIs 01 and 02 · Accessibility 02 and 03 ·
Internationalisation 01. Six chapters, and they cover the platform questions that actually get asked.

**Read in full if the role names it:** the accessibility section is the one to read cover to cover for a
public-sector, banking or EU-facing product. Those loops ask about it properly.

> ⚠️ **Storage appears twice on purpose.** The mechanics — quota, eviction, `SameSite` — are here.
> Caching as a *performance* strategy, with the budgets and the measurements attached, is Part IV.
