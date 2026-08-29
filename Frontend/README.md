---
title: Frontend
part: 2
chapter: 0
slug: frontend-domain-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [frontend, index]
in_book: false
---

# Frontend

`Frontend/` is not one part of the book. It carries **three**, because the split that matters to a
senior reader is not "frontend vs backend" — it is *language*, *platform*, and *scale*.

| Part | What it is | Directories here |
| ---- | ---------- | ---------------- |
| **I — Foundations** | The language, underneath the definition | [`JavaScript/`](./JavaScript/README.md) · [`TypeScript/`](./TypeScript/README.md) |
| **II — The Browser Platform** | What the platform gives you before any framework does | [`HtmlCss/`](./HtmlCss/README.md) · [`BrowserAPIs/`](./BrowserAPIs/) · [`PWA/`](./PWA/README.md) · [`Internationalization/`](./Internationalization/) · [`CSSArchitecture/`](./CSSArchitecture/) |
| **IV — Frontend at Scale** | Forty engineers, four years of history, a performance budget | [`WebPerformance/`](./WebPerformance/) · [`Security/`](./Security/) · [`Testing/`](./Testing/) |

**Part III — The Modern Frontend Stack** also belongs to this tree and **does not exist yet**. It is
planned as `Frontend/ModernStack/` — React, Next.js, Svelte, plus framework-agnostic sections on
rendering, state management and tooling. At 12,000 lines it is the largest part in the book, and it is
the single biggest gap in this repository. See improvements #32–43.

> ⚠️ Two directories referenced by older versions of this file — `./React/` and `./NextJs/` — have
> never existed. They were an aspiration, not a link. Nothing else here promises a directory that is
> not on the table above.

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

- **[HTML and CSS](./HtmlCss/README.md)** — semantic markup, the cascade, flexbox, grid, responsive
  design, animations, accessibility, modern CSS
- **[Browser APIs](./BrowserAPIs/)** — storage, workers, observers, networking
- **[PWA](./PWA/README.md)** — service workers, manifests, offline patterns, background sync, push
- **[Internationalization](./Internationalization/)** — locale, formatting, bidirectional text
- **[CSS Architecture](./CSSArchitecture/)** — scaling stylesheets past one team

**Senior signal:** reaches for the platform before reaching for a library.

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

Straight down the table: I → II → (III, when it exists) → IV. Each part assumes the one above it.

**Interview sprint:** Part I in full, then `HtmlCss/` and `WebPerformance/`. Those three cover the
majority of what a frontend-heavy senior loop actually asks before the system design round.

For frontend **system design** — architecture, rendering strategy, micro-frontends, design systems —
see [`SystemDesign/Frontend/`](../SystemDesign/Frontend/README.md), which is Part VI.

## Related

- [System Design](../SystemDesign/README.md) — Part VI
- [Backend](../Backend/README.md) — Part V
- [DSA](../DSA/README.md) — the companion volume
