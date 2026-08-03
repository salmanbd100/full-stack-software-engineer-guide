# REST API Best Practices

## Overview

REST is not a spec you can fail a compliance test against. It is a set of conventions built on HTTP, and the payoff is that other engineers can guess how your API behaves before reading the docs.

Interviewers use REST design as a proxy for something bigger: can you model a domain, and do you understand HTTP well enough to stop reinventing it?

> **The rule underneath all the others:** the URL names a *thing*, the method says what you're *doing to it*. `POST /users/123/deactivate` is a red flag. `PATCH /users/123` with `{ "status": "inactive" }` is the same work, expressed in HTTP.

## Table of Contents

- [Resource-Oriented URLs](#resource-oriented-urls)
- [HTTP Methods and Idempotency](#http-methods-and-idempotency)
- [Status Codes That Matter](#status-codes-that-matter)
- [Error Responses](#error-responses)
- [Filtering, Sorting, and Sparse Fields](#filtering-sorting-and-sparse-fields)
- [Pagination](#pagination)
- [Idempotent POST](#idempotent-post)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Resource-Oriented URLs

| Rule                        | ❌ Bad                            | ✅ Good                       |
| --------------------------- | -------------------------------- | ---------------------------- |
| Nouns, not verbs            | `/getUsers`, `/createUser`       | `GET /users`, `POST /users`  |
| Plural collections          | `/user/123`                      | `/users/123`                 |
| Lowercase with hyphens      | `/orderItems`, `/order_items`    | `/order-items`               |
| Nest only to show ownership | `/users/1/orders/9/items/4/tax`  | `/order-items/4`             |
| No file extensions          | `/users.json`                    | `/users` + `Accept` header   |

**Nesting depth:** stop at two levels. `/users/123/orders` is useful — it means "orders belonging to this user". Deeper than that, the child has its own identity, so give it a top-level route.

```
GET  /users/123/orders          ← scoped list, good
GET  /users/123/orders/9        ← redundant; the order id is already unique
GET  /orders/9                  ← ✅ prefer this
```

**Actions that aren't CRUD** do exist. Search, batch jobs, and state changes don't always map to a verb on a noun. Model them as a resource where you can:

```
POST /users/123/password-resets    ← creates a reset request (a real thing)
POST /orders/9/refunds             ← a refund is a record, not a verb
POST /reports                      ← creates a report job, returns 202
```

> ⚠️ Don't twist the whole design to avoid one pragmatic RPC-style route. One `POST /cache:purge` is better than a fake resource nobody understands. Just be ready to explain the choice.

## HTTP Methods and Idempotency

| Method   | Purpose                        | Safe | Idempotent | Body |
| -------- | ------------------------------ | ---- | ---------- | ---- |
| `GET`    | Read                           | ✅   | ✅         | ❌   |
| `POST`   | Create / non-idempotent action | ❌   | ❌         | ✅   |
| `PUT`    | Replace whole resource         | ❌   | ✅         | ✅   |
| `PATCH`  | Partial update                 | ❌   | ❌ usually | ✅   |
| `DELETE` | Remove                         | ❌   | ✅         | ❌   |

- **Safe** — no state change. A crawler can call it freely.
- **Idempotent** — calling it five times leaves the same state as calling it once. This is what makes retries safe.

**PUT vs PATCH** is the most-asked version of this:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

// PUT — replace. Omitted fields are cleared.
// PUT /users/123  { "name": "Ada", "email": "ada@x.com" }  → phone is gone
async function replaceUser(id: string, body: Omit<User, "id">): Promise<User> {
  return db.users.replaceOne({ id }, { id, ...body });
}

// PATCH — merge. Omitted fields are untouched.
// PATCH /users/123  { "name": "Ada" }  → email and phone unchanged
async function updateUser(id: string, patch: Partial<Omit<User, "id">>): Promise<User> {
  return db.users.updateOne({ id }, { $set: patch });
}
```

> **Why `PATCH` isn't idempotent in general:** a patch of `{ "views": "+1" }` gives a different result every call. A plain `$set` patch *is* idempotent in practice — say that, and say why the spec still can't promise it.

## Status Codes That Matter

You need about a dozen, not sixty.

| Code | Meaning               | Use it when                                            |
| ---- | --------------------- | ------------------------------------------------------ |
| 200  | OK                    | `GET`, `PUT`, `PATCH` succeeded with a body            |
| 201  | Created               | `POST` created something — add a `Location` header      |
| 202  | Accepted              | Queued for async work; nothing exists yet              |
| 204  | No Content            | `DELETE` succeeded, or a write with nothing to return  |
| 400  | Bad Request           | Malformed request or failed validation                 |
| 401  | Unauthorized          | Missing or invalid credentials — really *unauthenticated* |
| 403  | Forbidden             | Authenticated, but not allowed                         |
| 404  | Not Found             | No such resource — also hides existence from a 403 case |
| 409  | Conflict              | Duplicate email, version mismatch, illegal state change |
| 422  | Unprocessable Entity  | Syntax fine, semantics wrong (optional — 400 is fine)  |
| 429  | Too Many Requests     | Rate limited — add `Retry-After`                       |
| 500  | Internal Server Error | Your bug. Never leak the stack trace.                  |
| 503  | Service Unavailable   | Dependency down, or shedding load                      |

❌ **The anti-pattern interviewers listen for:**

```
HTTP 200 OK
{ "success": false, "error": "user not found" }
```

Every cache, proxy, HTTP client, and error dashboard now believes this request succeeded. Retries and circuit breakers go blind.

## Error Responses

Use one shape everywhere, and make it machine-readable. [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) is the standard worth naming in an interview.

```typescript
interface FieldError {
  field: string;
  code: string;    // machine-readable: "too_short", not "must be longer"
  message: string;
}

interface ProblemDetails {
  type: string;      // stable URI identifying the error class
  title: string;     // short human summary
  status: number;    // matches the HTTP status
  detail?: string;   // about this one occurrence
  instance?: string; // the request path
  errors?: FieldError[];
  traceId?: string;  // ties the response to your logs
}
```

**One central Express error handler:**

```typescript
import type { ErrorRequestHandler } from "express";

class AppError extends Error {
  constructor(
    readonly status: number,
    readonly type: string,
    message: string,
    readonly errors?: FieldError[],
  ) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const known = err instanceof AppError;
  const status = known ? err.status : 500;

  // Log the real error server-side; return a safe one to the client.
  if (!known || status >= 500) req.log.error({ err, traceId: req.id });

  const body: ProblemDetails = {
    type: known ? err.type : "about:blank",
    title: known ? err.message : "Internal Server Error",
    status,
    instance: req.originalUrl,
    errors: known ? err.errors : undefined,
    traceId: req.id, // ✅ the most useful field in any support ticket
  };

  res.status(status).json(body);
};
```

> ✨ **Return all validation errors at once.** A form that surfaces one bad field per round-trip is a bad API, not a bad frontend.

## Filtering, Sorting, and Sparse Fields

Query parameters shape a collection. They never identify one.

```
GET /orders?status=shipped&createdAfter=2026-01-01
           &sort=-createdAt,total
           &fields=id,total,status
           &limit=50
```

| Concern       | Convention                     | Notes                                   |
| ------------- | ------------------------------ | --------------------------------------- |
| Filter        | `?status=shipped`              | One param per field; repeat for `IN`    |
| Sort          | `?sort=-createdAt` (`-` = desc) | Allowlist the sortable columns          |
| Sparse fields | `?fields=id,total`             | Cuts payload without a new endpoint     |
| Search        | `?q=laptop`                    | Free text, kept separate from filters   |

```typescript
const SORTABLE = new Set(["createdAt", "total", "status"]);

function parseSort(raw: string | undefined): Record<string, 1 | -1> {
  if (!raw) return { createdAt: -1 };

  return raw.split(",").reduce<Record<string, 1 | -1>>((acc, token) => {
    const desc = token.startsWith("-");
    const field = desc ? token.slice(1) : token;
    // 🔴 Never pass user input into ORDER BY / sort without an allowlist.
    if (SORTABLE.has(field)) acc[field] = desc ? -1 : 1;
    return acc;
  }, {});
}
```

## Pagination

| Strategy | How it works | Use when |
| -------- | ------------ | -------- |
| **Offset** `?page=3&limit=20` | `OFFSET 40 LIMIT 20` | Small datasets, admin screens that need page numbers |
| **Cursor** `?cursor=<opaque>&limit=20` | `WHERE (createdAt, id) < (…)` | Feeds, infinite scroll, large or fast-moving data |

**Offset is the common choice and the wrong one at scale**, for two reasons:

1. `OFFSET 1000000` still makes the database walk and throw away a million rows.
2. If a row is inserted while the user pages, everything shifts — they see item 20 twice and never see item 21.

**Cursor (keyset) pagination fixes both:**

```typescript
interface Page<T> {
  data: T[];
  nextCursor: string | null;
}

// Encode the full sort key, not just the id — ties must break deterministically.
const encode = (o: Order): string =>
  Buffer.from(`${o.createdAt.toISOString()}|${o.id}`).toString("base64url");

async function listOrders(cursor: string | undefined, limit = 20): Promise<Page<Order>> {
  const capped = Math.min(limit, 100); // ✅ always cap a client-supplied limit
  let where: object = {};

  if (cursor) {
    const [createdAt, id] = Buffer.from(cursor, "base64url").toString().split("|");
    // Keyset predicate: strictly "after" the last row of the previous page.
    where = { $or: [{ createdAt: { $lt: createdAt } }, { createdAt, id: { $lt: id } }] };
  }

  // Fetch one extra row to learn whether a next page exists — no COUNT(*) needed.
  const rows: Order[] = await db.orders
    .find(where)
    .sort({ createdAt: -1, id: -1 })
    .limit(capped + 1)
    .toArray();

  const data = rows.slice(0, capped);
  const nextCursor = rows.length > capped ? encode(data[data.length - 1]) : null;

  return { data, nextCursor };
}
```

> ⚠️ **A cursor is opaque.** Clients must not parse it. Base64 is encoding, not security — sign it if it exposes anything sensitive.

**The tradeoff to state out loud:** cursors give up random access. You cannot jump to page 50, and a total count needs a separate (often approximate) query. That's the right trade for a feed and the wrong one for a paginated report.

## Idempotent POST

`POST /payments` is not idempotent, but the network will still time out and the client will still retry. Without protection, the customer is charged twice.

```typescript
import type { RequestHandler } from "express";

export const idempotency: RequestHandler = async (req, res, next) => {
  const key = req.header("Idempotency-Key");
  if (!key) return next();

  // SET NX — only the first request for this key claims the slot.
  const claimed = await redis.set(`idem:${key}`, "in-flight", { NX: true, EX: 86_400 });

  if (!claimed) {
    const stored = await redis.get(`idem:${key}`);
    if (stored === "in-flight") {
      return res.status(409).json({ title: "Request already in progress" });
    }
    return res.status(200).json(JSON.parse(stored!)); // replay the first response
  }

  res.on("finish", async () => {
    if (res.statusCode < 400) {
      await redis.set(`idem:${key}`, JSON.stringify(res.locals.body), { EX: 86_400 });
    } else {
      await redis.del(`idem:${key}`); // a failure should be retryable
    }
  });

  next();
};
```

This is how Stripe's API works. Naming that pattern is a strong senior signal.

## Interview Questions

**Q1: What makes an API RESTful?**

Resources identified by URLs, manipulated with standard HTTP methods, stateless requests, and responses explicit about caching. In practice "RESTful" means using HTTP as designed instead of tunnelling RPC through `POST`. Strict REST also requires HATEOAS — hypermedia links in responses — which almost nobody implements, and it's worth saying so.

**Q2: `PUT` or `PATCH`?**

`PUT` replaces the whole resource, so omitted fields get cleared. `PATCH` merges a partial change. A settings form that submits every field can honestly use `PUT`. A "change email" action should use `PATCH`, so it can't clobber fields the client never loaded.

**Q3: Which methods are idempotent, and why does it matter?**

`GET`, `PUT`, `DELETE`, `HEAD`, and `OPTIONS`. It matters because it decides whether a client, proxy, or load balancer may safely retry after a timeout. `POST` isn't idempotent, so for anything that moves money I accept an `Idempotency-Key` header and dedupe server-side.

**Q4: 401 or 403?**

401 means "I don't know who you are" — missing or expired credentials. 403 means "I know who you are and you still can't do this". One subtlety: for records the caller shouldn't even know exist, return 404 rather than 403, so the API doesn't confirm the resource is there.

**Q5: How do you paginate ten million rows?**

Keyset (cursor) pagination. `OFFSET` degrades linearly because the database still scans the skipped rows, and concurrent inserts cause duplicates and gaps. I encode the last row's sort key plus id into an opaque cursor, filter with a `WHERE (sortKey, id) < (…)` predicate, and fetch `limit + 1` rows to detect the next page without a `COUNT(*)`.

**Q6: Where does the version go?**

`/v1/…` in the path for a public API — visible in logs, trivial to route, easy to cache. Header versioning is cleaner in theory but harder to debug and easier for caches to get wrong. Either way, only version on breaking changes. See [Versioning](./03-versioning.md).

**Q7: How should a slow operation respond?**

`202 Accepted` with a `Location` header pointing at a job resource, then the client polls `GET /jobs/{id}` or waits on a webhook. Holding a connection open for a 30-second export burns a socket, hits proxy timeouts, and leaves the client no way to recover from a dropped connection.

**Q8: How do you keep a REST API secure?**

Authenticate with short-lived tokens, authorize per resource rather than per route, validate every input against a schema, rate limit by identity, and force HTTPS with HSTS. The detail lives in [Security](../Security/README.md) — the API-design part is making sure authorization checks the *object*, not just the endpoint. `GET /orders/9` must verify order 9 belongs to the caller.

## Summary

**Checklist:**

- [ ] URLs are plural nouns; verbs live in the HTTP method
- [ ] Nesting stops at two levels
- [ ] Correct status codes — never `200` with `success: false`
- [ ] One error shape everywhere, with `traceId` and field-level errors
- [ ] All validation errors returned in a single response
- [ ] `limit` capped server-side; sort and filter fields allowlisted
- [ ] Cursor pagination for anything that can grow
- [ ] `Idempotency-Key` on non-idempotent writes that matter
- [ ] Long operations return `202` plus a job resource
- [ ] Authorization checks the object, not just the route

**Best practices:**

1. **Use HTTP, don't wrap it** — methods, statuses, and headers already model most of this.
2. **Consistency beats cleverness** — one predictable convention beats a locally optimal exception.
3. **Design for retries** — assume every client will call twice.
4. **Never leak internals** — log the stack, return a `traceId`.

---

[API Index](./README.md) | [GraphQL →](./02-graphql.md)
