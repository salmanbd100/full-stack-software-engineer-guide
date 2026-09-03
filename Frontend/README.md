---
title: Frontend
part: 2
chapter: 0
slug: frontend-domain-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [frontend, index]
in_book: false
---

# Frontend

`Frontend/` is not one part of the book. It carries **three**, because the split that matters to a
senior reader is not "frontend vs backend" — it is *language*, *platform*, and *scale*.

| Part | What it is | Directories here |
| ---- | ---------- | ---------------- |
| **I — Foundations** | The language, underneath the definition | [`JavaScript/`](./JavaScript/README.md) · [`TypeScript/`](./TypeScript/README.md) |
| **II — The Browser Platform** | What the platform gives you before any framework does | [`HtmlCss/`](./HtmlCss/README.md) · [`BrowserAPIs/`](./BrowserAPIs/) · [`PWA/`](./PWA/README.md) · [`Internationalization/`](./Internationalization/) |
| **III — The Modern Frontend Stack** | React, Next.js and Svelte, plus the models underneath them | [`ModernStack/`](./ModernStack/README.md) |
| **IV — Frontend at Scale** | Forty engineers, four years of history, a performance budget | [`WebPerformance/`](./WebPerformance/) · [`Security/`](./Security/) · [`Testing/`](./Testing/) |

**Part III — The Modern Frontend Stack** is the largest part in the book at 12,000 lines, and it was
the single biggest gap in this repository. [`ModernStack/`](./ModernStack/README.md) now exists with its
six section indexes — React, Next.js, Svelte, Rendering, State Management, Tooling — and the chapters
themselves are being written by improvements #33–43.

> ⚠️ Two directories referenced by older versions of this file — `./React/` and `./NextJs/` — never
> existed. They were an aspiration, not a link, and the material they promised lives under
> `ModernStack/` instead. Nothing here promises a directory that is not on the table above.

---

## Part I — Foundations

Every senior loop still opens here, and the bar moved for a specific reason: an assistant answers the
surface version of these questions instantly, so explaining *what* a closure is no longer scores.
Explaining why a stale closure ate your `setInterval` callback does.

- **[JavaScript](./JavaScript/README.md)** — data types and coercion, functions and scope, closures,
  `this`, prototypes, promises and async/await, the event loop, ES2015+, array and object methods,
  error handling
- **[TypeScript](./TypeScript/README.md)** — types and interfaces, generics, utility types, type
  guards and narrowing

**Senior signal:** can reason about the runtime, not just recite the API.

## Part II — The Browser Platform

Frameworks are a layer over the platform, and engineers who skipped the platform hit a ceiling that
shows in interviews. Two topics here punch well above their weight for this reader: **accessibility**,
which has been a legal requirement across the EU since the European Accessibility Act became
enforceable in June 2025, and **internationalisation**. Both are chronically under-taught elsewhere,
which makes them cheap differentiation.

- **[HTML and CSS](./HtmlCss/README.md)** — semantic markup, accessibility, and the CSS that shipped
  since 2023. Layout mechanics are archived; see that section's opener for why
- **[Browser APIs](./BrowserAPIs/)** — storage, workers, observers, networking
- **[PWA](./PWA/README.md)** — service workers, manifests, offline patterns, background sync, push
- **[Internationalization](./Internationalization/)** — locale, formatting, bidirectional text

**Senior signal:** reaches for the platform before reaching for a library.

## Part III — The Modern Frontend Stack

The part the book exists for, and the one the 2026–27 senior loop is built on. It is deliberately split
in half: three sections teach today's tools, three teach the models underneath them, so half the part
survives the next major release of anything.

- **[Modern Stack](./ModernStack/README.md)** — the part opener, and the argument that the framework is
  an implementation detail while the rendering model and the state model are the architecture
- **[React](./ModernStack/React/README.md)** · **[Next.js](./ModernStack/NextJS/README.md)** ·
  **[Svelte](./ModernStack/Svelte/README.md)** — the three frameworks, and only these three
- **[Rendering](./ModernStack/Rendering/README.md)** ·
  **[State Management](./ModernStack/StateManagement/README.md)** ·
  **[Tooling](./ModernStack/Tooling/README.md)** — framework-agnostic by design

**Senior signal:** picks a rendering strategy per route and can defend it.

## Part IV — Frontend at Scale

Part III is how to build it. Part IV is how to build it when it is large, old, and someone is held to
a performance budget.

- **[Web Performance](./WebPerformance/)** — Core Web Vitals including **INP**, which replaced FID and
  which a lot of published material still gets wrong; loading strategy, bundles, caching
- **[Security](./Security/)** — XSS, Content Security Policy, headers, and the browser-only inputs.
  The browser-side half of the security spine; the server-side half — tokens, authorisation, CSRF
  defence, injection — lives in [`Backend/Security/`](../Backend/Security/)
- **[Testing](./Testing/)** — unit, component and end-to-end, and what each layer is actually for

**Senior signal:** thinks in budgets, boundaries and migration paths rather than features.

---

## Reading Order

Straight down the table: I → II → III → IV. Each part assumes the one above it.

**Interview sprint:** Part I in full, then `HtmlCss/` and `WebPerformance/`. Those three cover the
majority of what a frontend-heavy senior loop actually asks before the system design round.

For frontend **system design** — architecture, rendering strategy, micro-frontends, design systems —
see [`SystemDesign/Frontend/`](../SystemDesign/Frontend/README.md), which is Part VI.

## Related

- [System Design](../SystemDesign/README.md) — Part VI
- [Backend](../Backend/README.md) — Part V
- [DSA](../DSA/README.md) — the companion volume
