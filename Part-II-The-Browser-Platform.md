---
title: Part II — The Browser Platform
part: 2
chapter: 0
slug: part-browser-platform
level: intermediate
reading_time: 3
updated: 2026-09-24
tags: [html, css, browser-apis, accessibility, i18n, pwa]
in_book: true
---

# Part II — The Browser Platform

A framework is a layer over the platform. An engineer who skipped the platform hits a ceiling, and it shows
up in interviews as a clear tell: every answer starts with a library name. This part is the layer underneath.
It covers the markup the browser gives meaning to and the storage it offers. It covers the accessibility tree
(the page model that assistive technology reads), which the browser builds whether you think about it or not.
And it covers what the browser does with a locale it has never seen.

Two subjects matter far more than their line count suggests. **Accessibility** is a legal requirement, not a
nice-to-have. The European Accessibility Act became enforceable in June 2025. It applies to any company serving
EU consumers, wherever that company is based. Frontend system design rounds also agree on one thing.
Accessibility and internationalisation are the two topics that most reliably separate a senior candidate from a
mid-level one. Both are badly under-taught elsewhere, so they are a cheap way to stand out.

## Sections

| Section                                                         | Chapters | What it covers                                                  |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| [HTML and CSS](#ch-frontend-html-css-index)                     | 4        | Semantics the browser acts on, and the modern layout primitives |
| [Browser APIs](#ch-frontend-browser-apis-index)                 | 6        | Storage and IndexedDB, cookies, observers, workers, service workers and offline, `Intl` and right-to-left |
| [Accessibility](#ch-frontend-accessibility-index)               | 5        | The law, the accessibility tree, ARIA, focus, forms              |

## What Interviewers Probe For

The senior signal for this part is **reaches for the platform before reaching for a library.** Three
questions run through all three sections; each section index adds its own.

- **What does the browser already do here?** A `<dialog>`, a `<details>`, a native form validation
  message. Every one of them is a component someone was about to build, with focus management and
  keyboard behaviour included.
- **Who is this unusable for, and how do you know?** Not "is it accessible", because that invites a
  yes. The senior answer names a user, a mechanism and a check. For example: a keyboard-only user, a
  focus trap, and an axe run in CI that would have caught it.
- **What happens when the assumption breaks?** Storage is full, the locale is Arabic, the network is gone, or
  the string is 40% longer in German. Each is a one-line change to the test and a redesign of the layout.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "How do you store this?" | "localStorage" | Names the size limit, that it is synchronous and blocks the main thread, and when IndexedDB earns its complexity |
| "Is this accessible?" | "It has ARIA labels" | Which native element would have needed none, and what `role="button"` promises that a `<div>` does not deliver |
| "How do you translate it?" | "Put the strings in a JSON file" | Plural categories, locale-aware formatting, and the layout that breaks before the translation does |

## Reading Order

Read HTML and CSS first, because the accessibility section assumes it. After that, the other two
sections are independent, and you can read them in either order.

**Interview sprint:** HTML and CSS 01 · Browser APIs 01, 02 and 06 · Accessibility 02 and 03. Six
chapters, and they cover the platform questions that actually get asked.

**Read in full if the role names it:** for a public-sector, banking or EU-facing product, read the
accessibility section cover to cover. Those loops ask about it properly.

> ⚠️ **Storage appears twice on purpose.** The mechanics (quota, eviction, `SameSite`) are here.
> Caching as a *performance* strategy, with its budgets and measurements, is in Part IV.
