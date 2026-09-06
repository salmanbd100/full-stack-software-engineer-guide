---
title: SvelteKit Routing and Loading
part: 3
chapter: 0
slug: sveltekit-routing-and-loading
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [sveltekit, routing, load, streaming, ssr]
in_book: true
---

# SvelteKit Routing and Loading {#ch-sveltekit-routing-and-loading}

> Read a route's filenames and you already know what runs on the server, what runs in the browser, and what runs in both.

**In this chapter:** the `+` files · universal against server `load` · layouts and `await parent()` · streaming a slow promise · invalidating what you loaded

## 💡 The Core Idea

SvelteKit puts two decisions in the filesystem. The **directory** decides the URL. The **filename**
decides where the code runs.

`+page.svelte` is the component. `+page.ts` is data loading that runs on the server for the first request
and in the browser for every navigation after it. `+page.server.ts` is data loading that only ever runs on
the server. That last distinction is the entire security and performance model of a SvelteKit route, and
it is visible in a directory listing.

## How It Works

### The `+` files

| File               | Runs                         | For                                            |
| ------------------ | ---------------------------- | ---------------------------------------------- |
| `+page.svelte`     | Server, then browser         | The component for this route                   |
| `+page.ts`         | Server and browser           | Data that is safe anywhere — a public API call  |
| `+page.server.ts`  | Server only                  | Database queries, secrets, form actions         |
| `+layout.svelte`   | Server, then browser         | Shell shared by this segment and its children   |
| `+layout.server.ts` | Server only                  | Data every child needs — the session, say       |
| `+server.ts`       | Server only                  | An HTTP endpoint, not a page                    |
| `+error.svelte`    | Server, then browser         | The error boundary for this segment             |

Routes nest by directory. `src/routes/(app)/invoices/[id]/+page.svelte` serves `/invoices/123` —
brackets are parameters, and a directory in parentheses is a **group**: it shares a layout without
appearing in the URL. `[[lang]]` is optional, `[...rest]` catches the remainder.

### Universal load against server load

```typescript
// src/routes/invoices/[id]/+page.server.ts
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals }) => {
  const invoice = await db.invoice.findFirst({
    where: { id: params.id, ownerId: locals.user.id },
  });
  if (!invoice) error(404, "Not found");
  return { invoice };
};
```

```typescript
// src/routes/invoices/[id]/+page.ts — runs in the browser too
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ data, fetch }) => {
  const rates = await fetch("/api/rates").then((r) => r.json());
  return { ...data, rates }; // `data` is what the server load returned
};
```

| | `+page.ts` (universal) | `+page.server.ts` (server) |
| --- | --- | --- |
| Runs in the browser | Yes, on client navigation | Never |
| Can read secrets | No — it ships to the client | Yes |
| Can touch the database | No | Yes |
| Return values | Anything, including classes | Serialisable by `devalue`: JSON plus `Date`, `Map`, `Set`, `BigInt`, `RegExp` |
| Can stream promises | No | Yes |

If both exist, the **server load runs first** and its result arrives as `data` in the universal load. The
rule for choosing: anything that would leak a credential or open a database connection goes in
`.server.ts`, and the rest belongs in `+page.ts` so that a client-side navigation can fetch it directly
rather than round-tripping through your server.

### Layout loads and `await parent()`

A layout's `load` runs for every child route beneath it, and its data is merged into `data` for those
children. Children can wait for it:

```typescript
// src/routes/(app)/invoices/+page.server.ts
export const load: PageServerLoad = async ({ parent }) => {
  const { user } = await parent(); // from +layout.server.ts
  return { invoices: await db.invoice.findMany({ where: { ownerId: user.id } }) };
};
```

> ⚠️ `await parent()` is a waterfall. Layout and page loads run **in parallel** by default, and awaiting
> the parent gives that up. Call it as late as possible, after any query that does not depend on it has
> already been started.

### Streaming a slow promise

A server load can return a promise instead of a value. SvelteKit sends the rest of the page immediately
and streams the result when it settles:

```typescript
export const load: PageServerLoad = async ({ params }) => {
  return {
    comments: loadComments(params.slug), // not awaited — streams
    post: await loadPost(params.slug), // awaited — the page needs it
  };
};
```

```svelte
<script lang="ts">
  let { data } = $props();
</script>

<article>{@html data.post.body}</article>

{#await data.comments}
  <p>Loading comments…</p>
{:then comments}
  <CommentList {comments} />
{:catch}
  <p>Comments are unavailable.</p>
{/await}
```

The rule is that the **awaited data gates the response and the unawaited data does not**. Put the shell
of the page behind an `await` and everything slow behind a promise. Include a `{:catch}` — an unhandled
streamed rejection surfaces as an error late, after the page has already rendered.

### Re-running a load

Loads re-run when something they depend on changes. SvelteKit tracks `params`, `url` and any URL fetched
with the supplied `fetch`. For anything else — a custom client, a mutation elsewhere — declare it:

```typescript
export const load: PageServerLoad = async ({ depends }) => {
  depends("app:invoices");
  return { invoices: await db.invoice.findMany() };
};
```

```typescript
import { invalidate, invalidateAll } from "$app/navigation";

await invalidate("app:invoices"); // re-run loads that declared this key
await invalidateAll(); // re-run everything — the blunt instrument
```

Form actions invalidate everything for you by default, which is covered in
[Chapter ?? — SvelteKit Form Actions](#ch-sveltekit-form-actions).

## When to Use It

| The data is                                  | Put it in            |
| -------------------------------------------- | -------------------- |
| A database query                              | `+page.server.ts`    |
| Behind an API key                             | `+page.server.ts`    |
| A public API the browser could call itself    | `+page.ts`           |
| Needed by every route in a section            | `+layout.server.ts`  |
| Slow, and not needed for first paint          | An unawaited promise |
| A JSON endpoint for something outside the app | `+server.ts`         |

## Common Mistakes

**❌ Putting a secret in `+page.ts`.** That file is bundled and shipped. Anything private belongs in a
`.server.ts` file, which the build refuses to send to the client.

**❌ `await parent()` at the top of every load.** It serialises requests that would otherwise run
together. Await it only where the value is genuinely needed.

**❌ Awaiting everything in a server load.** The response cannot start until the slowest query finishes.
Await what the shell needs; stream the rest.

**❌ Streaming without a `{:catch}`.** A rejected promise arrives after the page has rendered, and
without a catch block it becomes an unhandled error rather than a message in the UI.

**❌ Using the global `fetch` inside a load.** The one passed into `load` carries cookies, resolves
relative URLs, and lets SvelteKit track the dependency for invalidation. The global one does none of that.

**❌ Reaching for `invalidateAll()` for everything.** It re-runs every load on the page. `depends` plus a
named key re-runs only the one that changed.

## 🔑 Key Takeaways

- The directory names the URL; the filename decides whether code runs on the server, in the browser, or both.
- `+page.server.ts` is the only place a secret or a database connection belongs, and its return value must survive `devalue` serialisation.
- Layout and page loads run in parallel, so `await parent()` is a deliberate waterfall.
- Returning an unawaited promise from a server load streams it after the page.
- Use the `fetch` given to `load` — it carries cookies and registers the dependency that invalidation needs.

## Interview Questions

**Q: What decides whether data loading happens in `+page.ts` or `+page.server.ts`?**

Whether the code can safely reach the browser. `+page.ts` is bundled and runs on the client for
subsequent navigations, so it cannot hold a secret or open a database connection. `+page.server.ts` never
leaves the server, at the cost of a round trip on every client navigation. If both exist the server load
runs first and its result is handed to the universal one.

**Q: How does streaming work in a SvelteKit load, and what is the tradeoff?**

Return a promise instead of an awaited value. The response starts as soon as the awaited data is ready,
and the promise's result is streamed in afterwards, rendered with `{#await}`. The tradeoff is error
handling and headers: the status code is already sent, so a streamed rejection cannot become a 500 — it
has to be caught in the markup, which is why `{:catch}` is not optional.

**Q: A page is slow because a layout load queries the session. What do you look at?**

Whether the page load is awaiting `parent()` before starting its own work. Layout and page loads run in
parallel by design; `await parent()` converts that into a waterfall. Move the call below any query that
does not need the parent's data, and if the session is needed for the query itself, consider whether the
lookup belongs in `locals` from a hook instead.

**Q: How do you re-run one load after a mutation, without reloading everything?**

Declare a dependency key with `depends('app:invoices')` in the load, then call
`invalidate('app:invoices')` after the mutation. `invalidateAll()` also works but re-runs every load on
the page, which turns one changed list into a full round of queries.

## What to Read Next

- [Chapter ?? — SvelteKit Form Actions](#ch-sveltekit-form-actions) — the mutation half of the same model
- [Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching) — how Next.js answers the same question
- [Chapter ?? — Adapters and Deployment](#ch-sveltekit-adapters-and-deployment) — where these loads actually run
