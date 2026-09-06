---
title: Middleware and the Edge
part: 3
chapter: 0
slug: nextjs-middleware-and-the-edge
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-06
tags: [nextjs, middleware, proxy, edge, auth, personalisation]
in_book: true
---

# Middleware and the Edge {#ch-nextjs-middleware-and-the-edge}

> Decide what genuinely has to happen before routing, keep it cheap, and stop treating the request layer as your authorisation layer.

**In this chapter:** the rename to `proxy` · matchers and cost · redirects, rewrites and personalisation · why auth checks here are optimistic · edge against origin

## 💡 The Core Idea

Middleware is code that runs **before Next.js decides which route to render**, on every request that
matches its pattern. It sees the URL, the headers and the cookies, and it can redirect, rewrite, or add a
header and continue.

That position makes it powerful and expensive in the same breath. It is the only place you can change
where a request goes before anything renders, and it is the one piece of code that runs on *every* match
— including the requests that would otherwise have been served straight from a CDN. Work put here is
work multiplied by traffic.

> The useful question is not "can this go in middleware" — almost anything can. It is "does this have to
> happen before the router, for every single request?" Very little does.

> ⚠️ **Moving target:** Next.js 16 renamed `middleware.ts` to `proxy.ts` and the exported `middleware`
> function to `proxy`, to make the network-boundary role explicit. `proxy` runs on the **Node.js runtime
> only** — the runtime is not configurable, and code that needs the edge runtime must stay in
> `middleware.ts` for now. The durable principle is that this layer is a routing decision made before
> rendering, and it should stay small.

## How It Works

### The file

```typescript
// proxy.ts — at the project root
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest): NextResponse {
  const locale = request.cookies.get("locale")?.value ?? "en";
  return NextResponse.rewrite(new URL(`/${locale}${request.nextUrl.pathname}`, request.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

The `matcher` is the cost control, and the most consequential line in the file. Without one, the function
runs for every asset request as well as every page. Match the narrowest set of paths that need the
behaviour, and exclude static output explicitly.

| Old name (≤ 15)                | New name (16)             |
| ------------------------------ | ------------------------- |
| `middleware.ts`                | `proxy.ts`                |
| `export function middleware`   | `export function proxy`   |
| `skipMiddlewareUrlNormalize`   | `skipProxyUrlNormalize`   |

### What it is good at

| Task                            | Why it belongs here                                      |
| ------------------------------- | -------------------------------------------------------- |
| Redirects and URL normalisation  | The route never has to exist                             |
| Locale and region rewrites       | Decided from a header before any render                  |
| A/B bucketing                    | The bucket must be chosen before the response is selected |
| Adding a request header          | Downstream code reads it as ordinary request data         |
| A presence check on a cookie     | Cheap, and it saves rendering a page nobody may see       |

That last row is deliberately worded. **A presence check, not a session verification.**

### Auth here is optimistic, and only optimistic

The pattern that fails review is the one where middleware is the only thing standing between a user and
data they should not see.

```typescript
// ✅ Optimistic: is there a session cookie at all? Cheap, and correct as a redirect.
export function proxy(request: NextRequest): NextResponse | undefined {
  const hasSession = request.cookies.has("session");
  if (!hasSession && request.nextUrl.pathname.startsWith("/dashboard")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}
```

Three reasons this cannot be the real check. The cookie's presence says nothing about its validity.
Middleware does not run for every path that can reach your data — a Server Action or a Route Handler
called directly may not match the pattern. And verifying a session properly means a database or token
round trip, on every request, in the hottest code path you have.

**The real check belongs where the data is read**: in the Server Component, the Server Action, or a data
access layer both of them call. Middleware is the redirect that saves a wasted render;
[Chapter ?? — Server Actions](#ch-server-actions) has the mutation half of the same rule.

### Personalisation without going dynamic

Middleware's quiet advantage is that it can vary the *route* without making the route dynamic. Reading a
country header in middleware and rewriting to `/uk/pricing` keeps both `/uk/pricing` and `/us/pricing`
fully prerendered — where reading that header inside the page would have made the page dynamic for
everyone. This is the trick worth remembering from
[Chapter ?? — Rendering in Next.js](#ch-rendering-in-nextjs).

> ⚠️ Do not use `NextResponse.next({ headers })` to send headers onward to the client. Those headers go
> to the browser, not to your route, and can override what the framework expects. To pass a value
> downstream, set it on the **request** headers.

### Edge against origin

The edge runtime is a smaller JavaScript runtime that runs in many locations close to users. It is not
a faster version of Node.js; it is a different set of tradeoffs.

| Dimension        | Edge                                    | Node.js origin                        |
| ---------------- | --------------------------------------- | ------------------------------------- |
| Cold start        | Very small                              | Larger, and warm most of the time      |
| Distance to user  | Close                                   | One or a few regions                   |
| Distance to data  | Usually far — the database has one home | Usually co-located                     |
| API surface       | Web APIs only — no `fs`, limited crypto | Everything, and every npm package      |
| Best at           | Header and cookie decisions, redirects  | Rendering, database work, heavy logic  |

The failure mode is putting a data-reading route at the edge when the database lives in one region. Every
query then crosses a continent, and a function that started 20 ms sooner finishes 200 ms later. **Latency
to the user is only half the number; latency to the data is the other half.** Node.js is the right
default, and the edge is a decision you make for a specific reason. Cold-start behaviour and regional
placement vary by host, so check what your platform actually does rather than assuming.

## When to Use It

| Situation                                       | Where it belongs                                |
| ----------------------------------------------- | ----------------------------------------------- |
| Redirect signed-out users away from `/dashboard` | Middleware — an optimistic cookie check         |
| Confirm the user may read this record            | The Server Component or action that reads it    |
| Serve `/pricing` per country, still prerendered  | Middleware rewrite                              |
| Bucket users into an experiment                  | Middleware, with the bucket set as a cookie     |
| Rate limiting by IP                              | Middleware, or the platform's own firewall      |
| Anything requiring a database read               | Not middleware                                  |
| Rewriting a legacy URL scheme                    | Middleware, or static redirects in the config   |

## Common Mistakes

**❌ Treating middleware as the authorisation layer.** It runs before routing, not before every data
access, and a cookie's presence is not a valid session. Check where the data is read.

**❌ No matcher, or a matcher that catches static assets.** The function then runs for every image and
every chunk. The cost is invisible in development and obvious in the bill.

**❌ A database or token-introspection call in middleware.** It is on the critical path of every matched
request. If a check is expensive, it belongs where it can be cached or where it runs once per render.

**❌ Choosing the edge for speed alone.** Closer to the user is further from the data. Measure the whole
request, not the cold start.

**❌ Forwarding headers with `NextResponse.next({ headers })`.** They reach the browser rather than your
route, and can conflict with framework-set headers.

**❌ Assuming the edge runtime is still available under `proxy`.** In Next.js 16 it is not — `proxy` is
Node.js only, and route segment `runtime` config in that file is an error.

## 🔑 Key Takeaways

- Middleware runs before routing on every matched request, which makes the `matcher` the most important line in the file.
- In Next.js 16 the file is `proxy.ts`, the export is `proxy`, and it runs on Node.js only.
- Auth in this layer is an optimistic redirect; the real check belongs where the data is read.
- Rewriting by header personalises a route without making it dynamic.
- The edge is closer to users and further from your data — choose it for a stated reason, not by default.

## Interview Questions

**Q: Why is checking authentication in middleware not enough?**

Because it answers a weaker question than the one that matters. A cookie being present does not mean the
session is valid, middleware does not necessarily run for every path that reaches your data, and
verifying a token properly is too expensive to do on every request. It is a good redirect — it saves
rendering a page the user cannot use — and a bad access control decision, which belongs next to the query.

**Q: What does the `matcher` actually change?**

Which requests pay for the function. Without one, middleware runs for every request including static
assets, so a cheap function multiplied by asset traffic becomes a real cost and a real latency floor.
With a narrow matcher it runs only on the paths whose routing genuinely needs a decision.

**Q: When is the edge runtime the wrong choice?**

When the work needs your data. Edge functions run close to users and far from a database that lives in
one region, so a query issued from the edge crosses the distance the function just saved, twice. Add the
limited API surface — no filesystem, restricted crypto, many npm packages unavailable — and Node.js is
the sensible default for anything that renders or reads.

**Q: How would you serve different pricing pages by country without giving up prerendering?**

Rewrite in middleware. Read the country from a request header there and rewrite to `/uk/pricing` or
`/us/pricing`, both of which stay fully prerendered and CDN-servable. Reading that header inside the page
instead would make the page dynamic for every visitor, trading a static shell for a value that only picks
between two static outcomes.

## What to Read Next

- [Chapter ?? — Rendering in Next.js](#ch-rendering-in-nextjs) — why a rewrite keeps a route prerendered
- [Chapter ?? — Server Actions](#ch-server-actions) — the other place authorisation is commonly skipped
- [Chapter ?? — Frontend Authentication](#ch-frontend-authentication) — sessions, tokens and where each is verified
