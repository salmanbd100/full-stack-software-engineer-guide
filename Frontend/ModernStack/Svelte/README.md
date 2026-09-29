---
title: Svelte
part: 3
chapter: 19
slug: modern-stack-svelte-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [svelte, sveltekit, runes, signals, forms]
in_book: true
---

# Svelte

Three chapters on the framework that the most surveyed users want to keep using. It is also the second
most-used meta-framework, behind Next.js. But Svelte is here for more than popularity. It makes a
different bet from React on the same problem. Knowing both models at once turns framework knowledge
into architecture knowledge. React re-runs your component and diffs the result. Svelte 5 compiles your
component so that only the parts that touch changed state ever run again.

Chapter 01 is the language and the component model. Chapters 02–03 are SvelteKit — routing, data
loading and forms.

Written against **Svelte 5** and current SvelteKit. This is the author's daily stack. So the gotchas
here are the ones that cost real hours, not the ones in the release notes.

## Chapters

| #  | Chapter                       | What it answers                                                    |
| -- | ----------------------------- | ------------------------------------------------------------------ |
| 01 | [The Runes Model, Components and Snippets](#ch-svelte-runes) | What do `$state`, `$derived`, `$effect` and `$props` do, and how does markup pass into a component? |
| 02 | [SvelteKit Routing and Loading](#ch-sveltekit-routing-and-loading) | Which `load` runs where, and what can you stream from it? |
| 03 | [SvelteKit Form Actions](#ch-sveltekit-form-actions) | How does this form work with JavaScript switched off? |

## What Interviewers Probe For

Two Svelte-specific questions, on top of the part-level signals in the Part III opener:

- **"Signals or a virtual DOM — what is the tradeoff?"** Fine-grained reactivity skips the diff and
  updates the exact node. The cost is a compiler and a smaller ecosystem. A strong answer names the
  cost, not just the win. It also notes that React has looked at signals and has said no so far.
- **"How does this form behave before hydration?"** SvelteKit form actions are a real HTML form post
  first and an enhanced fetch second. Progressive enhancement is not nostalgia. It keeps the checkout
  working for a request that arrives before your bundle does.

## Reading Order

01, then 02 → 03. Read Chapter 01 even if you never write Svelte. Its comparison with React 19 is the
fastest way to learn to defend a framework choice in a system design round. Chapter 03 pairs with the
Next.js Server Actions chapter: same problem, two answers.

**Interview sprint:** 01. Everything else is job knowledge, not interview knowledge, unless the role
names SvelteKit.
