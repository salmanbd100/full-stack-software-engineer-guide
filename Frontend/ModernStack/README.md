---
title: Part III — The Modern Frontend Stack
part: 3
chapter: 0
slug: part-modern-frontend-stack
level: advanced # beginner | intermediate | advanced
reading_time: 4
updated: 2026-09-24
tags: [react, nextjs, svelte, rendering, state, tooling]
in_book: true
---

# Part III — The Modern Frontend Stack

This is the part the book exists for, and it rests on one claim. **The framework is an implementation
detail. The rendering model and the state model are the architecture.** An engineer who can only drive
React answers the first question in a loop. A stronger one can say where the server/client boundary
sits and why one route streams and the next does not. They can also say which of four kinds of state
some data belongs to. That engineer answers every question after it, in React, in Svelte, and in whatever ships next.

So the part is split in half on purpose. `React/`, `NextJS/` and `Svelte/` teach the tools that 2026–27
job descriptions actually name. `Rendering/`, `StateManagement/` and `Tooling/` teach the models
underneath them. When React 20 lands, three of these sections need revising and three do not.

## Sections

| Section                                                     | Chapters | What it covers                                                       |
| ----------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| [React](#ch-modern-stack-react-index)                       | 9        | The model, hooks, the server/client boundary, concurrency, Actions   |
| [Next.js](#ch-modern-stack-nextjs-index)                    | 7        | App Router, caching, Server Actions, PPR, runtimes, auth, the BFF    |
| [Svelte](#ch-modern-stack-svelte-index)                     | 3        | Runes, snippets, SvelteKit loading and forms                         |
| [Rendering](#ch-modern-stack-rendering-index)               | 5        | CSR to PPR, hydration cost, streaming, choosing per route, SEO       |
| [State Management](#ch-modern-stack-state-management-index) | 5        | Server, client, form and URL state — four problems, not one          |
| [Tooling](#ch-modern-stack-tooling-index)                   | 5        | Modules, Vite, the Rust generation, monorepos, linting, styling      |

Three frameworks, and only three. Vue and Angular appear in comparison tables where they sharpen a
tradeoff, never as chapters (see `BOOK-SPEC.md` § 6). Svelte earns its slot twice over. Svelte 5 has the
highest retention rate of any framework surveyed, and SvelteKit is the second most-used meta-framework.
It is also the stack this author ships on daily.

> ⚠️ **Moving target — this is the fastest-ageing part of the book.** It is written against React 19,
> Next.js 16 and Svelte 5. Caching semantics in Next.js changed in 15 and again in 16, and the React
> Compiler changed what memoisation is for. The lasting principles are the ones in `Rendering/`,
> `StateManagement/` and `Tooling/`: rendering is a per-route decision, state has categories, and a
> bundler resolves a graph. Those outlive every API name on this page.

## What Interviewers Probe For

The senior signal for this part is **picks a rendering strategy per route and can defend it, and treats
the framework as an implementation detail.** Four questions run through all six sections.

- **Where is the boundary, and what crosses it?** Server Components versus Client Components is *the*
  2026–27 frontend question. A candidate who cannot say why a function will not serialise across it has
  not shipped an App Router application.
- **Why is this component re-rendering?** Not "add `memo`". The answer names the state that changed, the
  identity that broke, and whether memoisation was ever yours to add now that the React Compiler exists.
- **Which kind of state is this?** Server state, client state, form state and URL state are four
  different problems with four different tools. Putting a cache in Redux is the classic tell.
- **What did you choose not to use?** Reaching for the platform, for `useState`, or for a static route
  is a stronger answer than reaching for a library. Complexity is the thing being tested.

**Mid or senior, on the same question:**

| Asked | Mid answer | Senior answer |
| ----- | ---------- | ------------- |
| "Why is this slow?" | "I added `memo` and `useCallback`" | "The parent recreates the object every render, so the identity breaks — and since the compiler, that memoisation was not mine to add" |
| "Where does this data live?" | "In Redux, so everything can reach it" | "It is server state, so it belongs in the query cache; Redux would be a second copy that goes stale" |
| "Which rendering strategy?" | "Server-side rendering, it's better for SEO" | "Static for the marketing routes, streamed server-rendering for the dashboard, client for the editor — per route, for stated reasons" |

## Reading Order

Read [Chapter ?? — The Rendering Spectrum and the Cost of Hydration](#ch-rendering-spectrum) first,
then your framework, then the rest. That order is deliberate. The rendering spectrum gives you the
vocabulary (hydration, streaming, islands, PPR) that the React and Next.js chapters then assume. After
that, React then Next.js reads in dependency order, and Svelte reads cold from anywhere.

State Management and Tooling are independent of all three frameworks and can be read at any point.
[Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state) gives the most value for its length of
any chapter in the part.

**Interview sprint:** these ten chapters cover the server/client boundary, the effect trap, Actions,
caching, PPR and server state. Between them, they cover most of what a frontend-heavy senior loop asks
before the system design round.

- [Chapter ?? — The Rendering Spectrum and the Cost of Hydration](#ch-rendering-spectrum)
- [Chapter ?? — Choosing a Rendering Strategy per Route, with SEO](#ch-choosing-per-route)
- [Chapter ?? — useEffect and When Not to Use It](#ch-when-not-to-use-effect)
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components)
- [Chapter ?? — Actions and Forms](#ch-react-actions-and-forms)
- [Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching)
- [Chapter ?? — Rendering in Next.js](#ch-rendering-in-nextjs)
- [Chapter ?? — The Four Kinds of State](#ch-four-kinds-of-state)
- [Chapter ?? — Server State with TanStack Query](#ch-server-state)
