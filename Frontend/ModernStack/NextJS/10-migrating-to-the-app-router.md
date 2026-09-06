---
title: Migrating Pages to App Router
part: 3
chapter: 0
slug: migrating-to-the-app-router
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [nextjs, migration, app-router, pages-router, incremental-adoption]
in_book: true
---

# Migrating Pages to App Router {#ch-migrating-to-the-app-router}

> Move a live application one route at a time, and know which routes to move last.

**In this chapter:** the two routers side by side · what each Pages API becomes · the order that keeps the site up · the client boundary that eats the schedule · when not to migrate at all

## 💡 The Core Idea

`app/` and `pages/` run in the same application. A request matches one or the other, `app/` wins any
conflict, and nothing forces you to convert a route before you are ready. That is the whole reason this
is a migration rather than a rewrite.

But the file moves are the easy part. The App Router changes **where data is fetched** and **what runs on
the client**, and those two changes are what the work actually consists of. A page whose data came from
`getServerSideProps` and whose interactivity came from hooks does not become an App Router page by being
renamed — it becomes a server component that has to decide, for each piece of itself, which side of the
boundary it lives on.

> ⚠️ **Moving target:** codemods exist for the mechanical parts (`npx @next/codemod@latest`), and the set
> changes with each release — asynchronous request APIs got their own codemod in 15, and 16 adds more.
> Run the codemod for your target version rather than a remembered command. The durable principle is that
> the mechanical rename is automatable and the boundary decision is not.

## How It Works

### The two routers, side by side

```text
app/
  layout.tsx        → the root layout, replaces _app and _document
  dashboard/
    page.tsx        → /dashboard  (App Router)
pages/
  settings.tsx      → /settings   (Pages Router, still serving traffic)
  api/legacy.ts     → /api/legacy (still serving traffic)
```

One seam is worth knowing before you plan anything: **navigation between the two routers is a hard
navigation**. `next/link` does not prefetch across the boundary, and moving from `/dashboard` to
`/settings` reloads the document. Two consequences follow. Client state held above the router is lost at
the crossing, and the routes users move between most should be migrated **together**, not weeks apart.

### What each Pages API becomes

| Pages Router                | App Router                                        |
| --------------------------- | ------------------------------------------------- |
| `pages/_app.tsx`, `_document.tsx` | `app/layout.tsx` — one root layout with `<html>` and `<body>` |
| `getServerSideProps`        | `await` the data in the component; it renders per request |
| `getStaticProps`            | The same `await`, with the fetch cached           |
| `getStaticProps` + `revalidate` | A cached fetch with a lifetime                |
| `getStaticPaths`            | `generateStaticParams`                            |
| `pages/api/*`               | `route.ts` handlers                               |
| `next/head`                 | The `metadata` export or `generateMetadata`       |
| `useRouter` from `next/router` | `useRouter`, `usePathname`, `useSearchParams` from `next/navigation` |
| `router.query`              | `params` and `searchParams` props — both promises |

**Before, in `pages/`:**

```tsx
export async function getServerSideProps({ params }: { params: { id: string } }) {
  const invoice = await getInvoice(params.id);
  return { props: { invoice } };
}

export default function InvoicePage({ invoice }: { invoice: Invoice }) {
  return <InvoiceView invoice={invoice} />;
}
```

**After, in `app/`:**

```tsx
export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const invoice = await getInvoice(id); // fetched where it is used
  return <InvoiceView invoice={invoice} />;
}
```

The shape change is the point. Data no longer arrives at the top of the route and flows down as props —
it is fetched by whichever component needs it, which is what makes streaming and per-component caching
possible. [Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching) covers the caching half.

### The order that keeps the site up

| Step | What                                                       | Why this order                             |
| ---- | ---------------------------------------------------------- | ------------------------------------------ |
| 1    | Add `app/layout.tsx` with the shell from `_app`/`_document` | Required before any App route exists       |
| 2    | Migrate one low-traffic leaf route end to end               | Proves the toolchain, styling and auth      |
| 3    | Move `pages/api/*` to route handlers                        | Independent of pages, low risk              |
| 4    | Migrate clusters of routes users navigate between           | Avoids hard navigations inside a flow      |
| 5    | Migrate the highest-traffic route                           | By now the patterns are settled            |
| 6    | Delete `pages/` and the compatibility shims                 | The migration is not done until this lands |

Step 2 is not a warm-up. The first route is where you discover that your CSS-in-JS library needs a
provider, that the analytics snippet assumed `_document`, and that your session helper reads
`req.cookies`. Discovering that on the checkout page is the failure mode this order exists to prevent.

### The client boundary eats the schedule

Every hook, every event handler, every browser API needs `'use client'`. The trap is that the directive
is **inherited by everything imported below it**, so one badly placed boundary drags a subtree back onto
the client and the migration delivers no benefit at all.

| Symptom                                                | Fix                                                         |
| ------------------------------------------------------ | ----------------------------------------------------------- |
| A page marked `'use client'` at the top                 | Push the directive down to the interactive leaves            |
| A context provider wrapping the whole tree              | Keep the provider client-side, pass server data in as props  |
| A component library with no `'use client'` of its own   | Wrap the import in a thin client module                      |
| A hook needed only for one button                       | Extract the button; leave the rest on the server             |

[Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) has the
rules; this is where they cost money.

### The other reliable surprises

`useRouter` no longer exposes `query` or `pathname` — those are `useParams`, `useSearchParams` and
`usePathname`, and `useSearchParams` puts the component into client rendering unless it sits under a
Suspense boundary. `params` and `searchParams` are promises and must be awaited. And anything that read
raw `req`/`res` objects — session middleware, feature-flag SDKs, older auth libraries — needs a version
that understands `cookies()` and `headers()`.

## When to Use It

| Situation                                        | Do this                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| Large app, active roadmap                        | Migrate incrementally, route cluster at a time  |
| The bundle is dominated by data-fetching code    | Migrate — this is what Server Components remove |
| A small app, few routes, quiet period            | Convert it wholesale in one branch              |
| Heavily interactive, almost no server data       | Low priority — there is little to move          |
| Team has never shipped a Server Component        | Migrate one leaf route first and review it hard |
| The app is in maintenance and ships twice a year | Do not migrate; the cost has nothing to repay it |

The last row is a real answer. The Pages Router is still supported, and a migration with no roadmap
behind it is spending a quarter to arrive where you already were.

## Common Mistakes

**❌ Starting with the most important route.** Every unknown in the migration shows up in the first route
you convert. Make that route one that can be rolled back on a Tuesday afternoon.

**❌ Marking pages `'use client'` to make the errors stop.** It compiles, and it opts the whole subtree out
of the thing you migrated for.

**❌ Splitting a user flow across the two routers.** Each crossing is a full page load and drops client
state. Migrate routes that link to each other in the same batch.

**❌ Treating it as a file move.** The data-fetching model changed. A converted route that still funnels
everything through one top-level fetch has kept the old architecture in new files.

**❌ Leaving `pages/` in place indefinitely.** Two routers means two auth paths, two layout systems and
two mental models for every new engineer. Finish it.

**❌ Forgetting `useSearchParams` needs a Suspense boundary.** Without one, the route falls back to
client-side rendering and the build tells you so in a message that is easy to scroll past.

## 🔑 Key Takeaways

- `app/` and `pages/` coexist, so migration is route-by-route — but crossing between them is a hard navigation.
- The real change is where data is fetched, not where files live.
- Migrate a low-traffic leaf route first; it is where every unknown surfaces.
- `'use client'` is inherited downward, so a boundary placed too high erases the benefit of the whole exercise.
- An application with no active roadmap has nothing to repay the migration cost.

## Interview Questions

**Q: How would you migrate a large Pages Router application that ships weekly?**

Incrementally, because both routers run in the same app and `app/` takes precedence per route. Add the
root layout, convert one low-traffic leaf route end to end to shake out styling, auth and analytics, then
move API routes, then whole clusters of routes that users navigate between. Highest-traffic routes go
last, and the job is only finished when `pages/` is deleted.

**Q: What actually breaks during the migration?**

The client boundary and the request APIs. `'use client'` is inherited by everything imported beneath it,
so one misplaced directive pulls a subtree back to the client and cancels the benefit. Alongside that,
`params`, `searchParams`, `cookies()` and `headers()` are all asynchronous now, and any library that
reached for raw `req`/`res` needs a version that does not.

**Q: Why does the order of routes matter?**

Because navigation between the two routers is a hard navigation, not a client transition. If a checkout
flow has two steps in `app/` and one in `pages/`, users get a full page load mid-flow and lose any state
held above the router. Migrating routes that link to each other together keeps flows on one side of the
seam.

**Q: When would you advise against migrating?**

When there is no roadmap to benefit from it. The Pages Router is still supported, so an application in
maintenance is spending real engineering time to end up where it already is. The same applies to a highly
interactive app with little server data — Server Components pay off by removing data-fetching code from
the bundle, and there is not much there to remove.

## What to Read Next

- [Chapter ?? — App Router Mental Model](#ch-app-router-mental-model) — the model you are migrating to
- [Chapter ?? — Server Components and Client Components](#ch-server-components-vs-client-components) — where the boundary belongs
- [Chapter ?? — Route Handlers and the BFF](#ch-route-handlers-and-the-bff) — what `pages/api` becomes
