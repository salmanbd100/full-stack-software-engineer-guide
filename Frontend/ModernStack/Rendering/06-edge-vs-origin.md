---
title: Edge Versus Origin Rendering
part: 3
chapter: 0
slug: edge-vs-origin-rendering
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-07
tags: [edge, origin, latency, cold-start, data-locality, rendering]
in_book: true
---

# Edge Versus Origin Rendering {#ch-edge-vs-origin-rendering}

> Put each piece of work at the tier that matches its data dependency, and be able to say when the edge is the wrong answer.

**In this chapter:** the three tiers · the latency arithmetic · what cold starts are still worth · what belongs at the edge · pinning compute to data · the streaming myth

## 💡 The Core Idea

There are three places code can run, and they differ by one property: **how far they are from the data.**

A CDN node is everywhere and has no data. An edge runtime is in dozens of locations and has no data
either — it has whatever it can fetch. An origin region is in one or two places, and the database is
next door.

Moving computation closer to the user only helps when the computation does not need to go somewhere else
to finish. The moment it does, you have moved the work away from its input, and every fetch now pays the
distance you just saved on the request.

That single sentence decides almost every edge question you will be asked.

> ⚠️ **Moving target:** the numbers in the cold-start argument have moved more than any other figure in
> this book. Origin runtimes now reuse warm instances across requests, cache compiled bytecode and serve
> many concurrent invocations from one instance, so the old "edge starts in a millisecond, Node takes two
> seconds" comparison no longer describes production. Re-measure on your own platform. The durable
> principle — **latency to the data usually dominates latency to the user** — has not changed.

## How It Works

### The three tiers

| Tier | Where it runs | Compute | Data access | Right for |
| ---- | ------------- | ------- | ----------- | --------- |
| **CDN cache** | Hundreds of locations | None | None | Anything already rendered |
| **Edge runtime** | Dozens of locations | Web APIs only, small limits | Network only | Decisions about the request |
| **Origin region** | One or a few | Full runtime, npm, long durations | Local, pooled | Rendering, database work |

The tiers are a fallthrough, not a choice: a request hits the CDN, and only what the CDN cannot answer
goes further. The best-performing route is the one that never leaves tier one. **Caching beats placement
every time**, which is why [Chapter ?? — Choosing Per Route, Not Per App](#ch-choosing-per-route) comes
before this chapter.

### The arithmetic

Take a user in Sydney and a database in Virginia — about 200 ms round trip.

**Render at origin (Virginia):**

```text
User → origin:        200 ms
Render, 3 queries:     15 ms   (queries are local, ~2 ms each)
Origin → user:        200 ms
Total:                415 ms
```

**Render at the edge (Sydney):**

```text
User → edge:            5 ms
3 sequential queries:  600 ms   (each crosses the Pacific)
Edge → user:            5 ms
Total:                 610 ms
```

The edge version started 195 ms sooner and finished 195 ms later. Parallelising the queries helps — three
in parallel gives 210 ms and roughly a tie — but any query that depends on a previous result puts the
edge behind again, and most real pages have at least one.

**The rule: multiply your data round trips by the distance to the data. If the product is bigger than the
distance to the user, render at origin.**

### What genuinely belongs at the edge

Work that is O(1), needs no data, and produces a decision rather than a page:

- **Redirects and rewrites** from the path, host or a cookie.
- **Experiment and feature-flag assignment** — read a cookie, pick a bucket, set a header.
- **Geolocation and locale routing** from the request's own metadata.
- **Bot and abuse filtering** before an expensive route is reached.
- **Optimistic authentication gating** — is there a session cookie at all? The real check happens where
  the data is.

The shape is the same in all five: read the request, decide, hand off. No database, no rendering, no
awaiting anything slow. [Chapter ?? — Middleware and the Edge](#ch-nextjs-middleware-and-the-edge) shows
this as one framework implements it.

### Moving the data instead of the compute

If a route genuinely benefits from running close to users, the fix is to bring its data along.

| Technique | What it suits | What it costs |
| --------- | ------------- | ------------- |
| **Read replicas near edge regions** | Read-heavy, tolerant of replication lag | Lag, and a write path that still goes home |
| **Edge key–value or config stores** | Small, slowly-changing values: flags, redirects, routing tables | Eventual consistency; not for user data |
| **Replicated or globally-distributed databases** | Genuinely global products | Cost, and a consistency model you must understand |
| **Cache the render, not the data** | Almost everything else | Staleness, which you were choosing anyway |

The last row is usually the correct one, and it is the answer most candidates skip. A page cached at the
CDN is served from the user's city with no compute anywhere. That beats edge rendering on latency,
availability and cost simultaneously.

### Pinning origin compute to the database

The complement of the same idea: when a route must render per request, put the function in the region
that holds the primary database, not the region nearest the office or the default the platform picked.

Getting this wrong is the most common self-inflicted latency in serverless applications. A function in
Virginia with a database in Frankfurt pays 90 ms per query, forever, on every request.

### Streaming does not require the edge

A persistent myth: that streamed responses need an edge runtime. They do not. Streaming is a property of
the HTTP response, and full origin runtimes stream fine — see
[Chapter ?? — Streaming HTML](#ch-streaming-html).

The myth exists because both features arrived together on one platform. Choosing an edge runtime to get
streaming means giving up npm packages, database drivers and long durations for something you already
had.

## When to Use It

| Work | Put it | Because |
| ---- | ------ | ------- |
| Already-rendered HTML or assets | **CDN** | No compute is the fastest compute |
| Redirect, rewrite, flag assignment, bot filter | **Edge** | Constant time, no data |
| Rendering that reads a database | **Origin, in the data's region** | Round trips dominate |
| Anything needing npm packages or Node APIs | **Origin** | The edge runtime does not have them |
| Long-running or CPU-heavy work | **Origin** | Edge duration limits are strict |
| A globally distributed read-only dataset | **Edge, with a replica or KV store** | The data moved too |

## Common Mistakes

**❌ Choosing the edge for latency without counting the data round trips.**
✅ Do the arithmetic above. One dependent query usually erases the whole gain.

**❌ Putting a real authentication check in edge middleware.**
✅ Verifying a session against a database from the edge adds a cross-continent round trip to *every*
request, including cached ones. Check for the cookie's presence at the edge and verify where the data is.

**❌ Running middleware on every request without a matcher.**
✅ Edge middleware is billed per invocation and runs before the cache. An unmatched middleware adds a
function call to every static asset on the site.

**❌ Letting experiment precomputation explode the cache.**
✅ Flags assigned at the edge often produce a prerendered variant per combination. Four flags across three
locales is twelve copies of every page, most of them cold. Retire finished experiments.

**❌ Assuming "edge" means the same thing on every platform.**
✅ Runtime limits, available APIs, region counts and pricing differ substantially. Verify against your own
platform's documentation rather than a blog post about a different one.

## 🔑 Key Takeaways

- Three tiers: CDN with no compute, edge with no data, origin with both compute and data.
- Latency to the data usually dominates latency to the user; count round trips before moving compute.
- The edge suits constant-time decisions about a request, not rendering that reads a database.
- Caching the rendered output beats edge rendering on latency, cost and availability at once.
- Streaming works on origin runtimes; it is not a reason to choose an edge runtime.

## Interview Questions

**Q: When is the edge the wrong place to render?**

When the render needs data that lives somewhere else. Every query crosses the distance you saved on the
request, and dependent queries multiply it. Rendering in Sydney against a database in Virginia turns one
slow round trip into several. Unless the data has been replicated close by, origin rendering in the
database's region wins.

**Q: Cold starts used to be the argument for edge runtimes. Is that still true?**

Much less so. Origin platforms now reuse warm instances across requests, cache compiled bytecode and run
several concurrent invocations on one instance, so cold starts are rarer and shorter than the numbers
people still quote. It is worth measuring rather than assuming, and it is a weaker reason to accept a
restricted runtime than it was.

**Q: Where would you do authentication in a globally distributed application?**

Two layers. At the edge, a cheap presence check — is there a session cookie, is it well-formed — so
unauthenticated traffic is redirected before it costs anything. The real verification happens in the same
region as the session store or database, because that is the only place it can be done in one local round
trip.

**Q: A route is server-rendered at origin and slow for European users. What are the options, in order?**

Cache it, first — if the HTML is shareable, the CDN serves it from Frankfurt with no compute at all. If it
is genuinely per-request, check that the function runs in the same region as the database, because that
is often the actual bug. Only after both would I look at a read replica in Europe, and moving the render
to the edge is the last option, not the first.

## What to Read Next

- [Chapter ?? — Middleware and the Edge](#ch-nextjs-middleware-and-the-edge) — the same tradeoff inside one framework
- [Chapter ?? — CDN](#ch-cdn) — what tier one does before any of this is reached
- [Chapter ?? — Latency and Throughput](#ch-latency-and-throughput) — the numbers behind the arithmetic
