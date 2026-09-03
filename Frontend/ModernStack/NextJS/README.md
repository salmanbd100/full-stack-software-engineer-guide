---
title: Next.js
part: 3
chapter: 0
slug: modern-stack-nextjs-index
level: advanced # beginner | intermediate | advanced
reading_time: 3
updated: 2026-09-03
tags: [nextjs, app-router, server-actions, ppr, caching, middleware]
in_book: true
---

# Next.js

Ten chapters covering the framework most senior frontend job descriptions name by version. Chapters
01–05 are the framework itself: how the App Router maps files to routes, where data is fetched and
cached, how mutations run on the server, how a route is rendered, and what happens before the route is
reached at all. Chapters 06–10 are production — assets, authentication, the point where Next.js starts
being your backend, deployment, and the migration every long-lived codebase eventually schedules.

Written against **Next.js 16**. Nothing here assumes Vercel: the chapters name the platform only where
a detail genuinely differs, such as cold starts, regional execution, or which adapter runs the build.

> ⚠️ **Moving target.** Caching semantics changed in Next.js 15 and again in 16. Treat `use cache`,
> `cacheLife` and `cacheTag` as this year's spelling of a durable principle: caching is opt-in per
> request, and anything cached needs an explicit key you can invalidate on purpose.

## Chapters

| #  | Chapter                     | What it answers                                                       |
| -- | --------------------------- | --------------------------------------------------------------------- |
| 01 | App Router mental model     | How do files become routes, and what re-renders on navigation?        |
| 02 | Data fetching and caching   | Where does this request go, and how long does the answer live?        |
| 03 | Server Actions              | How do you mutate data without writing an API route — and safely?     |
| 04 | Rendering in Next.js        | Static, dynamic, streaming or partially prerendered — which, and why? |
| 05 | Middleware and the edge     | What can you decide before the route runs, and what should you not?   |
| 06 | Images, fonts and assets    | How do you ship a hero image without paying for it in CLS?            |
| 07 | Auth patterns               | Session or token, and where is it checked?                            |
| 08 | Route handlers and the BFF  | When is Next.js your backend, and when should it stop being one?      |
| 09 | Deployment and runtime      | What changes when you self-host, and what does a preview cost?        |
| 10 | Migrating Pages to App Router | How do you move a live application one route at a time?             |

> ⚠️ **Being written.** Improvements #36–37 fill this table; the titles link as each chapter lands.

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
both. Chapters 06–09 are independent and can be read in any order. Chapter 10 is worth reading even
without a migration to run: incremental adoption under load is a common system design prompt.

**Interview sprint:** 01 → 02 → 03 → 04. Rendering and caching are what the round asks about; assets
and deployment are what the job asks about.
