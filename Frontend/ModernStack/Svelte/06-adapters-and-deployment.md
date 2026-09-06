---
title: Adapters and Deployment
part: 3
chapter: 0
slug: sveltekit-adapters-and-deployment
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [sveltekit, adapters, prerendering, ssr, deployment, environment]
in_book: true
---

# Adapters and Deployment {#ch-sveltekit-adapters-and-deployment}

> Keep the rendering decision in your routes and the packaging decision in the adapter, and the two stop fighting.

**In this chapter:** what an adapter actually does · `prerender`, `ssr` and `csr` · why the prerender crawler misses a route · static output and the fallback page · environment variables that are and are not baked in

## 💡 The Core Idea

SvelteKit builds a **host-independent artefact**: a set of routes, some renderable ahead of time, some
needing a server. An adapter is the last build step, and it does one job — repackage that artefact into
the shape one host expects. A long-running Node process. A directory of files. A set of serverless
functions.

The confusion worth clearing up early: **the adapter does not decide how your routes render.** Your page
options do. `adapter-static` cannot make a dynamic route static; it fails the build instead. The adapter
decides where the output goes and what the request handler looks like when it gets there.

## How It Works

### The adapters that matter

| Adapter                 | Produces                            | Choose when                              |
| ----------------------- | ----------------------------------- | ---------------------------------------- |
| `adapter-auto`          | Detects the host at build time      | Prototypes only — pin a real one for production |
| `adapter-node`          | A Node server you run yourself      | Containers, your own infrastructure, long-lived processes |
| `adapter-static`        | HTML, CSS and JS files              | Documentation, marketing, anything with no per-request server work |
| Platform adapters (Vercel, Netlify, Cloudflare) | Functions in that platform's format | You are deploying to that platform    |

```typescript
// svelte.config.js
import adapter from "@sveltejs/adapter-node";

export default {
  kit: { adapter: adapter({ out: "build", precompress: true }) },
};
```

`adapter-auto` is the default in a new project and the right thing to replace first. It resolves a
different adapter depending on where the build runs, which means the build on your machine and the build
in CI can produce different artefacts.

### Page options decide rendering

Three exports, from `+page.ts`, `+page.server.ts`, or a `+layout` file where they become the default for
every route beneath:

| Option              | What it means                                       | Consequence                          |
| ------------------- | --------------------------------------------------- | ------------------------------------ |
| `prerender = true`  | Render at build time, serve the HTML                 | No server work per request           |
| `prerender = 'auto'` | Prerender if reached, otherwise render on demand   | Useful for a partly-known route set  |
| `ssr = false`       | Do not render on the server at all                  | Empty HTML until JavaScript runs     |
| `csr = false`       | Ship no client JavaScript for this route            | No interactivity, no client navigation |

`ssr = false` is the one that gets used casually and should not be. It turns the route into a client-side
application: the first response has no content, so the LCP waits for the bundle and a crawler that does
not execute JavaScript sees nothing. It is the correct answer for a route that genuinely cannot render
without the browser — an editor built on a canvas, a page whose entire content is behind a
device-specific API — and a poor answer for "the data loading was awkward".

`csr = false` is the underused one: a page of pure content ships zero JavaScript and still renders
server-side.

### Prerendering, and why the crawler misses routes

SvelteKit finds pages to prerender by **crawling**. It starts from the non-dynamic routes, renders them,
follows the links it finds, and repeats. A dynamic route only gets prerendered if something already
prerendered links to it.

That is the whole explanation for the error everyone hits — *"the following routes were marked as
prerenderable, but were not prerendered"*. The route was opted in and nothing linked to it. Tell the
build about it directly:

```typescript
// src/routes/blog/[slug]/+page.server.ts
import type { EntryGenerator } from "./$types";

export const prerender = true;

export const entries: EntryGenerator = async () => {
  const posts = await cms.listSlugs(); // the function may be async
  return posts.map((slug) => ({ slug }));
};
```

> ⚠️ A prerendered route cannot read anything request-specific. No cookies, no headers, no per-user data —
> there is no request. If a route needs the session, it is not prerenderable, and marking it so fails the
> build rather than shipping the first visitor's data to everyone.

### A real single-page application

`adapter-static` with a `fallback` produces a genuine SPA: one HTML file serves every unmatched path and
the client router takes over.

```typescript
import adapter from "@sveltejs/adapter-static";

export default {
  kit: {
    adapter: adapter({ fallback: "200.html" }),
    // every route in the app must also be prerenderable or ssr: false
  },
};
```

This is the right shape for an internal tool behind a login, where SEO is irrelevant and the first paint
is a loading state anyway. It is the wrong shape for anything a search engine or a link preview needs to
read.

### Environment variables, and which ones are frozen

SvelteKit has four env modules, and the two axes are what matter:

| Module                   | Read at | Reaches the browser |
| ------------------------ | ------- | ------------------- |
| `$env/static/private`    | Build   | No                  |
| `$env/static/public`     | Build   | Yes                 |
| `$env/dynamic/private`   | Runtime | No                  |
| `$env/dynamic/public`    | Runtime | Yes                 |

`static` imports are **substituted into the bundle at build time**, which enables dead-code elimination
and means the value is fixed in the artefact. `dynamic` reads from the running process, so one build can
be promoted between environments. Only variables with the `PUBLIC_` prefix are allowed in the public
modules, and importing a private one into client-reachable code is a build error rather than a leak.

The same rule as any other framework applies: if you want to build once and deploy to staging and
production, environment-specific values must come from `$env/dynamic/*`.

### Cross-cutting work goes in a hook

```typescript
// src/hooks.server.ts
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
  event.locals.user = await getUser(event.cookies.get("session"));
  return resolve(event);
};
```

`handle` wraps every request, and `event.locals` is how the result reaches every `load` and every action.
It is the right home for session resolution, request logging and locale detection — and, like middleware
anywhere else, the wrong home for the authoritative permission check, which belongs beside the query.

## When to Use It

| Situation                                        | Adapter and options                          |
| ------------------------------------------------ | -------------------------------------------- |
| Docs or marketing site, content from a CMS at build | `adapter-static`, `prerender = true`       |
| Product app with per-user pages                   | `adapter-node` or a platform adapter          |
| Internal tool behind a login, no SEO              | `adapter-static` with a `fallback`            |
| Mixed: static marketing, dynamic dashboard        | A server adapter, `prerender` per route       |
| Deploying into your own Kubernetes or VMs         | `adapter-node` in a container                 |
| One artefact promoted across environments         | Any server adapter, plus `$env/dynamic/*`     |

## Common Mistakes

**❌ Shipping `adapter-auto`.** It picks an adapter from the build environment, so CI and your laptop can
produce different output. Pin the adapter you actually deploy.

**❌ Reaching for `ssr = false` to make an awkward load go away.** It costs the server-rendered first
paint and the crawlable HTML for every visitor.

**❌ Marking a dynamic route `prerender = true` and expecting the crawler to find it.** Give it `entries`,
or link to it from a page that is already prerendered.

**❌ Reading cookies in a prerendered route.** There is no request at build time. This is a build failure,
which is the good outcome.

**❌ Using `$env/static/private` for a value that differs per environment.** It is frozen into the
artefact, so the build cannot be promoted.

**❌ Treating `handle` as the authorisation layer.** It is the right place to resolve the session and the
wrong place to decide access — same rule as middleware in any framework.

## 🔑 Key Takeaways

- Page options decide how a route renders; the adapter only decides how the build is packaged for a host.
- Replace `adapter-auto` before production so every build produces the same artefact.
- Prerendering works by crawling, so a dynamic route needs `entries` or an inbound link from a prerendered page.
- `ssr = false` gives up the server-rendered first paint for everyone — reserve it for routes that truly cannot render without a browser.
- `$env/static/*` is baked into the build and `$env/dynamic/*` is read at runtime; only the latter survives promotion between environments.

## Interview Questions

**Q: What does a SvelteKit adapter actually decide?**

Packaging, not rendering. The build produces a host-independent artefact, and the adapter turns it into a
Node server, a directory of files, or the function format one platform expects. Whether a given route is
prerendered, server-rendered or client-only is set by the `prerender`, `ssr` and `csr` page options — an
adapter that cannot satisfy them fails the build rather than silently changing them.

**Q: A route is marked prerenderable and the build fails saying it was never prerendered. Why?**

Because prerendering discovers pages by crawling from the static routes and following links. A dynamic
route that nothing links to is never reached, so it is marked for prerendering and never produced —
which would leave users with a route that cannot be server-rendered either. The fix is an `entries`
function that lists the parameters, or a link from a page that is already prerendered.

**Q: When is `ssr = false` the right call?**

When the route genuinely cannot be rendered without a browser — something built entirely on canvas or a
device API — or when it is behind a login and SEO is irrelevant. Otherwise the cost is paid by every
visitor: the first response contains no content, so the largest paint waits on the JavaScript bundle and
anything that reads HTML without executing it sees an empty page.

**Q: How do you build once and deploy the same artefact to staging and production?**

Use a server adapter and read environment-specific values from `$env/dynamic/private` rather than
`$env/static/private`. The static modules are substituted at build time, which is good for dead-code
elimination and fatal for promotion, because the staging value is compiled in. Anything the browser needs
carries the `PUBLIC_` prefix and should come from the dynamic public module for the same reason.

## What to Read Next

- [Chapter ?? — SvelteKit Routing and Loading](#ch-sveltekit-routing-and-loading) — the page options in context
- [Chapter ?? — Deployment and Runtime](#ch-nextjs-deployment-and-runtime) — the same problem in Next.js
- [Chapter ?? — Platform Deploys](#ch-platform-deploys) — previews, promotion and rollback around any of this
