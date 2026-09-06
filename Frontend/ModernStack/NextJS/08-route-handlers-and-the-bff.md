---
title: Route Handlers and the BFF
part: 3
chapter: 0
slug: route-handlers-and-the-bff
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-06
tags: [nextjs, route-handlers, bff, api, architecture]
in_book: true
---

# Route Handlers and the BFF {#ch-route-handlers-and-the-bff}

> Know which callers an endpoint serves, and you know whether it belongs in your Next.js app at all.

**In this chapter:** what a Route Handler is · when an action is the better tool · the backend-for-frontend pattern · caching a `GET` in Next.js 16 · where Next.js stops being your backend

## 💡 The Core Idea

A Route Handler is a file called `route.ts` that exports functions named after HTTP methods. There is no
framework layer above it: the argument is a `Request`, the return value is a `Response`, and everything
in between is yours.

The interesting question is never whether Next.js *can* serve an API. It can. The question is **who calls
this endpoint**. Code you render can talk to your database directly from a Server Component, and your own
forms can mutate through a Server Action — neither needs a URL. An endpoint earns its existence when the
caller is something you do not control: a webhook, a mobile app, a partner, a `<script>` on someone
else's page.

> ⚠️ **Moving target:** `GET` handler caching has changed twice. Cached by default in Next.js 14,
> uncached by default in 15, and under Cache Components in 16 a `GET` prerenders unless it touches
> runtime data, with `use cache` on a helper replacing `dynamic = 'force-static'`. The durable principle
> is that caching is opt-in and every cached thing needs a key you can invalidate.

## How It Works

### The file

```typescript
// app/api/invoices/[id]/route.ts
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params; // params is a promise from Next.js 15
  const invoice = await getInvoice(id); // the data access layer, with its own auth check
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}
```

`GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` and `OPTIONS` are supported, one export each. The handler
runs in the same environment as a Server Component — `cookies()`, `headers()` and Node APIs all work —
but there is no React DOM, so nothing renders here.

**A `route.ts` and a `page.tsx` cannot share a segment.** Both claim the same URL, and the page loses.
Put endpoints under a path of their own.

### Caching a `GET`

The directive cannot go on the exported handler, so the cached work moves into a helper:

```typescript
// app/api/rates/route.ts
import { cacheLife, cacheTag } from "next/cache";

export async function GET(): Promise<Response> {
  return Response.json(await getRates());
}

async function getRates(): Promise<Rate[]> {
  "use cache";
  cacheTag("rates");
  cacheLife("hours");
  return db.rate.findMany();
}
```

The tag is what makes this maintainable: `revalidateTag("rates")` from the action that changes a rate
invalidates the endpoint without anybody remembering the URL. The mechanics are in
[Chapter ?? — Data Fetching and Caching](#ch-nextjs-data-and-caching).

### Handler, action, or neither

| The caller is…                          | Use                      | Because                                     |
| --------------------------------------- | ------------------------ | ------------------------------------------- |
| A Server Component rendering the page    | Nothing — query directly | A round trip to yourself buys you nothing   |
| A form or button in your own UI          | A Server Action          | Progressive enhancement, no endpoint to name |
| A third-party webhook                    | A Route Handler          | They send a URL a request, not a form        |
| A mobile app or partner integration      | A Route Handler          | A stable contract, versioned and documented |
| A client component polling for updates   | A Route Handler          | It needs a URL and a cache header           |
| A cron or scheduled job                  | A Route Handler          | Triggered by a request from outside         |

The first row is the one candidates get wrong. Writing `fetch('/api/invoices')` inside a Server Component
serialises a call to your own server, through your own network stack, to run a query the component could
have run itself.

### What a backend-for-frontend actually is

A BFF is an API shaped for **one** client, owned by the team that builds that client. It sits between a
user interface and the services behind it, and it earns its place by doing four things:

| Job                  | Example                                                          |
| -------------------- | ---------------------------------------------------------------- |
| Aggregation          | One dashboard call replaces six service calls over a mobile link |
| Credential hiding    | The upstream API key stays on the server, never in the bundle    |
| Response shaping     | Return the twelve fields the screen renders, not the ninety      |
| Protocol translation | gRPC or SOAP upstream, JSON to the browser                       |

Next.js is a good BFF because the code that shapes the response and the code that renders it are in one
repository, reviewed together, deployed together. When the screen needs another field, one pull request
changes both ends.

### And where it stops

The same coupling is the cost. A BFF is a frontend concern deployed on a frontend release cadence, and
work that does not fit that shape should not be pushed into it.

| Signal                                          | What it means                                            |
| ----------------------------------------------- | -------------------------------------------------------- |
| Three clients now consume the endpoint          | It is a product API, not a BFF — give it its own service  |
| Work outlives the request — jobs, retries, queues | Serverless request handlers are the wrong runtime         |
| Long-lived connections: sockets, subscriptions   | Request/response platforms bill and time out badly        |
| Heavy CPU, or a database with its own scaling    | It should scale separately from your page rendering       |
| External consumers need versioning and an SLA    | That is a contract, and contracts need an owner           |

> ⚠️ Every endpoint you add is a public URL. It is not protected by living next to your components:
> validate the body, check the session in the same data access layer your pages use, and rate-limit
> anything unauthenticated.

## When to Use It

| Situation                                        | Choose                                       |
| ------------------------------------------------ | -------------------------------------------- |
| Stripe or GitHub posts you an event              | Route Handler, verifying the signature        |
| Your own form submits a mutation                 | Server Action                                 |
| A React Native app needs the same data           | Route Handler with a versioned path           |
| Server-sent events for a progress bar            | Route Handler returning a stream              |
| A nightly report that takes four minutes         | A worker or queue outside the app             |
| Aggregating three internal services for one page | Server Component, or a Route Handler if the client needs it |

## Common Mistakes

**❌ Calling your own Route Handler from a Server Component.** Import the function instead. The HTTP hop
adds latency, loses type safety, and hides the query from the framework's caching.

**❌ Writing a Route Handler for every form.** Server Actions exist for UI-triggered mutations and work
without JavaScript. Reach for an endpoint when the caller is external.

**❌ Assuming co-location means protection.** The endpoint is as public as any other URL. Same session
check, same validation, same rate limit.

**❌ Putting `route.ts` beside `page.tsx`.** They collide on the same path. Namespace endpoints under
`/api` or a segment of their own.

**❌ Letting the BFF become the product API.** Once other teams depend on it, your frontend release
cadence becomes their outage risk. Split it out at the second consumer, not the fifth.

**❌ Running long jobs in a handler.** Serverless platforms enforce a timeout and bill for wall-clock
time. Enqueue the work and return an id.

## 🔑 Key Takeaways

- A Route Handler is a plain `Request` in, `Response` out — the framework adds routing and nothing else.
- Add an endpoint when the caller is outside your application; otherwise query directly or use a Server Action.
- A BFF aggregates, hides credentials, shapes responses and translates protocols for exactly one client.
- The second independent consumer is the signal to move the endpoint out into its own service.
- `GET` caching is opt-in via a `use cache` helper, and tagging it lets a mutation invalidate it by name.

## Interview Questions

**Q: When should a Next.js application expose a Route Handler at all?**

When the caller is something you do not render. Webhooks, mobile clients, partner integrations, cron
triggers and polling clients all need a URL. Your own pages do not — a Server Component can query the
database directly, and a Server Action handles a mutation from your own UI without an endpoint existing.

**Q: What is a backend-for-frontend, and what does it cost?**

An API shaped for a single client and owned by that client's team. It collapses several upstream calls
into one, keeps credentials server-side, and returns only the fields the screen uses. The cost is
coupling: it ships on the frontend's release cadence and scales with the frontend's traffic, so as soon
as a second independent consumer appears, it is a product API wearing the wrong clothes.

**Q: Route Handler or Server Action for a form submission?**

Server Action. It runs on the server without a public URL you have to name, works before JavaScript
loads because it is a real form submission, and integrates with the router's revalidation. A Route
Handler for the same job means writing the fetch, the serialisation and the error handling by hand, and
leaves you an endpoint to secure.

**Q: When is Next.js the wrong place for backend work?**

When the work does not fit a request. Background jobs, queues, retries, long-lived sockets and heavy
CPU all sit badly on a serverless request handler that is timed and billed by wall-clock time. The other
signal is organisational: once several teams consume the endpoint, it needs versioning, an SLA and an
owner, none of which survive being deployed with the marketing site.

## What to Read Next

- [Chapter ?? — Server Actions](#ch-server-actions) — the mutation path that needs no endpoint
- [Chapter ?? — REST Best Practices](#ch-rest-best-practices) — designing the contract once it is public
- [Chapter ?? — API Gateway Pattern](#ch-api-gateway-pattern) — where a BFF sits among the other edges
