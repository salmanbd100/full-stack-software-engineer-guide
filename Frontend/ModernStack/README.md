---
title: Part III — The Modern Frontend Stack
part: 3
chapter: 0
slug: part-modern-frontend-stack
level: advanced # beginner | intermediate | advanced
reading_time: 4
updated: 2026-09-03
tags: [react, nextjs, svelte, rendering, state, tooling]
in_book: true
---

# Part III — The Modern Frontend Stack

This is the part the book exists for, and it rests on one claim: **the framework is an implementation
detail; the rendering model and the state model are the architecture.** An engineer who can only drive
React answers the first question in a loop. An engineer who can say where the server/client boundary
sits, why one route streams and the next one does not, and which of the four kinds of state a piece of
data belongs to answers every question after it — in React, in Svelte, and in whatever ships next.

So the part is split in half on purpose. `React/`, `NextJS/` and `Svelte/` teach the tools that 2026–27
job descriptions actually name. `Rendering/`, `StateManagement/` and `Tooling/` teach the models
underneath them. When React 20 lands, three of these sections need revising and three do not.

## Sections

| Section                                          | Chapters | What it covers                                                       |
| ------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| [React](./React/README.md)                       | 12       | The model, hooks, the server/client boundary, concurrency, Actions   |
| [Next.js](./NextJS/README.md)                    | 10       | App Router, caching, Server Actions, PPR, the edge, migration        |
| [Svelte](./Svelte/README.md)                     | 6        | Runes, signals against the virtual DOM, SvelteKit loading and forms  |
| [Rendering](./Rendering/README.md)               | 6        | CSR to PPR, hydration cost, streaming, choosing per route            |
| [State Management](./StateManagement/README.md)  | 6        | Server, client, form and URL state — four problems, not one          |
| [Tooling](./Tooling/README.md)                   | 6        | Modules, Vite, the Rust generation, monorepos, package management    |

Three frameworks, and only three. Vue and Angular appear in comparison tables where they sharpen a
tradeoff, never as chapters — see `BOOK-SPEC.md` § 6. Svelte earns its slot twice over: Svelte 5 has the
highest retention rate of any framework surveyed, SvelteKit is the second most-used meta-framework, and
it is the stack this author ships on daily.

> ⚠️ **Moving target — this is the fastest-ageing part of the book.** It is written against React 19,
> Next.js 16 and Svelte 5. Caching semantics in Next.js changed in 15 and again in 16; the React
> Compiler changed what memoisation is for. The durable principles are the ones in `Rendering/`,
> `StateManagement/` and `Tooling/`: rendering is a per-route decision, state has categories, and a
> bundler resolves a graph. Those outlive every API name on this page.

## What Interviewers Probe For

The senior signal for this part is **picks a rendering strategy per route and can defend it, and treats
the framework as an implementation detail.** Four questions run through all six sections.

- **Where is the boundary, and what crosses it?** Server Components versus Client Components is *the*
  2026–27 frontend question. A candidate who cannot say why a function will not serialise across it has
  not shipped an App Router application.
- **Why is this component re-rendering?** Not "add `memo`". The answer names the state that changed, the
  identity that broke, and — since the React Compiler — whether memoisation was ever yours to add.
- **Which kind of state is this?** Server state, client state, form state and URL state are four
  different problems with four different tools. Putting a cache in Redux is the classic tell.
- **What did you choose not to use?** Reaching for the platform, for `useState`, or for a static route
  is a stronger answer than reaching for a library. Complexity is the thing being tested.

## Reading Order

`Rendering/01` first, then your framework, then the rest. That order is deliberate: the rendering
spectrum gives you the vocabulary — hydration, streaming, islands, PPR — that the React and Next.js
chapters then assume. After that, `React/` → `NextJS/` reads in dependency order, and `Svelte/` reads
cold from anywhere.

`StateManagement/` and `Tooling/` are independent of all three frameworks and can be read at any point.
`StateManagement/01` is the highest-leverage chapter in the part for its length.

**Interview sprint:** `Rendering/01`, `04` · `React/03`, `05`, `08` · `NextJS/02`, `04` ·
`StateManagement/01`–`02`. That is the server/client boundary, the effect trap, Actions, caching, PPR
and server state — which between them cover most of what a frontend-heavy senior loop asks before the
system design round.

> ⚠️ **Being written now.** The chapter tables in each section index are the plan, not a directory
> listing — improvements #33–41 write them, and the titles link once each file lands. `Rendering/` and
> `StateManagement/` also absorb two chapters currently staged in `Archive/salvage/frontend/`.
