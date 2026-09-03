---
title: Svelte
part: 3
chapter: 0
slug: modern-stack-svelte-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [svelte, sveltekit, runes, signals, forms]
in_book: true
---

# Svelte

Six chapters on the framework with the highest retention rate of any surveyed, and the second most-used
meta-framework behind Next.js. Svelte earns its place here for a reason beyond popularity: it makes a
different bet from React on the same problem, and holding both models at once is what turns framework
knowledge into architecture knowledge. React re-runs your component and diffs the result. Svelte 5
compiles your component so that only the parts touching changed state ever run again.

Chapters 01–03 are the language and the component model. Chapters 04–06 are SvelteKit — routing, data
loading, forms, and what an adapter decides on your behalf at deploy time.

Written against **Svelte 5** and current SvelteKit. This is the author's daily stack, which is why the
gotchas here are the ones that cost real hours rather than the ones in the release notes.

## Chapters

| #  | Chapter                       | What it answers                                                    |
| -- | ----------------------------- | ------------------------------------------------------------------ |
| 01 | Svelte 5 and the runes model  | What do `$state`, `$derived`, `$effect` and `$props` actually do?  |
| 02 | Reactivity compared           | Signals, virtual DOM or fine-grained — what does each one cost?    |
| 03 | Components and snippets       | How do you pass markup into a component now that slots are gone?   |
| 04 | SvelteKit routing and loading | Which `load` runs where, and what can you stream from it?          |
| 05 | SvelteKit form actions        | How does this form work with JavaScript switched off?              |
| 06 | Adapters and deployment       | What does the adapter decide, and when does prerendering break?    |

> ⚠️ **Being written.** Improvement #38 fills this table; the titles link as each chapter lands.

## What Interviewers Probe For

Two Svelte-specific questions, on top of the part-level signals in the Part III opener:

- **"Signals or a virtual DOM — what is the tradeoff?"** Fine-grained reactivity skips the diff and
  updates the exact node, at the cost of a compiler and a smaller ecosystem. The answer that scores names
  the cost, not just the win, and notes that React has looked at signals and declined them so far.
- **"How does this form behave before hydration?"** SvelteKit form actions are a real HTML form post
  first and an enhanced fetch second. Progressive enhancement is not a nostalgia argument — it is what
  keeps the checkout working on the request that arrives before your bundle does.

## Reading Order

01 → 02 → 03, then 04 → 06. Chapter 02 is the one to read even if you never write Svelte: the
comparison table in it is the fastest way to be able to defend a framework choice in a system design
round. Chapter 05 pairs directly with the Next.js Server Actions chapter — same problem, two answers.

**Interview sprint:** 01 → 02. Everything else is job knowledge rather than interview knowledge unless
the role names SvelteKit.
