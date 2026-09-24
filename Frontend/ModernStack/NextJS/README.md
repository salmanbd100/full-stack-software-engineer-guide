---
title: Next.js
part: 3
chapter: 11
slug: modern-stack-nextjs-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-24
tags: [nextjs, app-router, server-actions, ppr, caching, middleware]
in_book: true
---

# Next.js

Seven chapters covering the framework most senior frontend job descriptions name by version. Chapters
01–05 are the framework itself: how the App Router maps files to routes, where data is fetched and
cached, how mutations run on the server, how a route is rendered, and what runs before the route and on
which runtime. Chapters 06–07 are production — authentication, and the point where Next.js starts being
your backend.

Written against **Next.js 16**. Nothing here assumes Vercel: the chapters name the platform only where
a detail genuinely differs, such as cold starts, regional execution, or which adapter runs the build.

> ⚠️ **Moving target.** Caching semantics changed in Next.js 15 and again in 16, and 16 also renamed
> `middleware.ts` to `proxy.ts` and made every request API asynchronous. Treat `use cache`, `cacheLife`
> and `cacheTag` as this year's spelling of a durable principle: caching is opt-in per request, and
> anything cached needs an explicit key you can invalidate on purpose.

## Chapters

| #  | Chapter                     | What it answers                                                       |
| -- | --------------------------- | --------------------------------------------------------------------- |
| 01 | [App Router Mental Model](#ch-app-router-mental-model) | How do files become routes, and what re-renders on navigation? |
| 02 | [Data Fetching and Caching](#ch-nextjs-data-and-caching) | Where does this request go, and how long does the answer live? |
| 03 | [Server Actions](#ch-server-actions) | How do you mutate data without writing an API route — and safely?     |
| 04 | [Rendering in Next.js](#ch-rendering-in-nextjs) | Static, dynamic, streaming or partially prerendered — which, and why? |
| 05 | [Middleware, Runtimes and Deployment](#ch-nextjs-middleware-and-the-edge) | What runs before the route, on which runtime, and where does the cache live when you self-host? |
| 06 | [Auth Patterns](#ch-nextjs-auth-patterns) | Session or token, and where is it checked?                            |
| 07 | [Route Handlers and the BFF](#ch-route-handlers-and-the-bff) | When is Next.js your backend, and when should it stop being one? |

## What Interviewers Probe For

Two Next.js-specific questions, on top of the part-level signals in the Part III opener:

- **"Why is this page stale?"** The answer walks a chain — the fetch, the cache entry, the revalidation
  key, and the CDN in front of it. Candidates who have only used the defaults describe the symptom.
  Candidates who have shipped a content site name the layer.
- **"What stops a user calling that Server Action directly?"** Nothing. It is a public endpoint with a
  generated name. Authorisation and validation belong inside the action, every time. Treating a Server
  Action as trusted because it is co-located with the component is the most common security finding in
  App Router code.

## Reading Order

01 → 05 in order — 02's caching model is what makes 04's rendering decisions legible, and 03 assumes
both. Chapters 06 and 07 are independent and can be read in either order.

**Interview sprint:** 01 → 02 → 03 → 04. Rendering and caching are what the round asks about; runtimes
and deployment are what the job asks about.
