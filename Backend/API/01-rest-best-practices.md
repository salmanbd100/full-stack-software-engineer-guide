---
title: REST API Best Practices
part: 5
chapter: 0
slug: rest-best-practices
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-01
tags: [api, rest, http, backend, idempotency]
in_book: true
---

# REST API Best Practices {#ch-rest-best-practices}

> Design an HTTP API another engineer can guess correctly before reading the docs, and defend every choice in it.

**In this chapter:** resource URLs · methods and idempotency · status codes · one error shape · pagination that survives scale

## 💡 The Core Idea

REST is not a specification you can fail a compliance test against. It is a set of conventions built on
top of HTTP. The payoff is predictability: when the conventions hold, a client can guess how a route
behaves without opening the documentation. Interviewers use REST design as a proxy for something bigger —
can you model a domain, and do you understand HTTP well enough to stop reinventing it?

> The URL names a **thing**. The method says what you are **doing to it**. `POST /users/123/deactivate`
> is a red flag. `PATCH /users/123` with `{ "status": "inactive" }` is the same work, expressed in HTTP.

## How It Works

### Resource-oriented URLs

| Rule                        | ❌ Bad                           | ✅ Good                      |
| --------------------------- | -------------------------------- | ---------------------------- |
| Nouns, not verbs            | `/getUsers`, `/createUser`       | `GET /users`, `POST /users`  |
| Plural collections          | `/user/123`                      | `/users/123`                 |
| Lowercase with hyphens      | `/orderItems`, `/order_items`    | `/order-items`               |
| Nest only to show ownership | `/users/1/orders/9/items/4/tax`  | `/order-items/4`             |
| No file extensions          | `/users.json`                    | `/users` + `Accept` header   |

Stop nesting at two levels. `/users/123/orders` is useful — it means "orders belonging to this user".
Deeper than that, the child has its own identity, so give it a top-level route.

Actions that are not CRUD still model as resources most of the time. A password reset is a request
(`POST /users/123/password-resets`), a refund is a record (`POST /orders/9/refunds`), and a slow export is
a job (`POST /reports`, returning `202`).

> ⚠️ Do not twist a whole design to avoid one pragmatic RPC-style route. One `POST /cache:purge` beats a
> fake resource nobody understands. Just be ready to explain the choice.

### Methods and idempotency

| Method   | Purpose                        | Safe | Idempotent | Body |
| -------- | ------------------------------ | ---- | ---------- | ---- |
| `GET`    | Read                           | ✅   | ✅         | ❌   |
| `POST`   | Create / non-idempotent action | ❌   | ❌         | ✅   |
| `PUT`    | Replace whole resource         | ❌   | ✅         | ✅   |
| `PATCH`  | Partial update                 | ❌   | ❌ usually | ✅   |
| `DELETE` | Remove                         | ❌   | ✅         | ❌   |

**Safe** means no state change — a crawler can call it freely. **Idempotent** means calling it five times
leaves the same state as calling it once. That property is what makes a retry safe.

`PUT` replaces: `PUT /users/123` with `{ "name": "Ada", "email": "ada@x.com" }` clears `phone`.
`PATCH /users/123` with `{ "name": "Ada" }` leaves the other fields alone. Pick by whether the
client loaded the whole resource.

A patch of `{ "views": "+1" }` gives a different result on every call, which is why the specification
cannot promise `PATCH` is idempotent. A plain `$set` patch is idempotent in practice. Say both things.

### Status codes

You need about a dozen, not sixty.

| Code | Meaning               | Use it when                                              |
| ---- | --------------------- | -------------------------------------------------------- |
| 200  | OK                    | `GET`, `PUT`, `PATCH` succeeded with a body               |
| 201  | Created               | `POST` created something — add a `Location` header        |
| 202  | Accepted              | Queued for async work; nothing exists yet                 |
| 204  | No Content            | `DELETE` succeeded, or a write with nothing to return     |
| 400  | Bad Request           | Malformed request or failed validation                    |
| 401  | Unauthorized          | Missing or invalid credentials — really *unauthenticated* |
| 403  | Forbidden             | Authenticated, but not allowed                            |
| 404  | Not Found             | No such resource — also hides existence from a 403 case   |
| 409  | Conflict              | Duplicate email, version mismatch, illegal state change   |
| 429  | Too Many Requests     | Rate limited — add `Retry-After`                          |
| 500  | Internal Server Error | Your bug. Never leak the stack trace                      |
| 503  | Service Unavailable   | Dependency down, or shedding load                         |

## When to Use It

| Scenario                                        | Choose            | Why                                                            |
| ----------------------------------------------- | ----------------- | -------------------------------------------------------------- |
| Public API, many unknown clients                | REST              | Cacheable by default, and every HTTP tool already understands it |
| One frontend that needs varied, nested data     | GraphQL           | The client picks the shape, so round trips collapse             |
| Internal service-to-service calls, typed both ends | gRPC or tRPC    | Contract generated from types; HTTP semantics add little        |
| Server pushes to the client                     | WebSocket or SSE  | REST has no way to send without being asked                     |

Most products end up with REST at the edge and something else behind it. Saying that beats defending
REST for everything.

## Error Responses

Use one shape everywhere and make it machine-readable.
[RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html) is the standard worth naming.

```typescript
interface ProblemDetails {
  type: string;      // stable URI identifying the error class
  title: string;     // short human summary
  status: number;    // matches the HTTP status
  errors?: { field: string; code: string; message: string }[];
  traceId?: string;  // ties the response to your logs
}
```

Build that shape in **one** place```

Build that shape in **one** place — a single Express error handler that turns any thrown error
into `ProblemDetails`, logs the real error server-side, and returns a safe one. The handler itself
is in [Chapter ?? — Error Handling in Node](#ch-nodejs-error-handling); what matters here is that
every route throws and no route formats.

Return **all** validation errors at once. A form that surfaces one bad field per round trip is a bad API,
not a bad frontend.

## Pagination

| Strategy                               | How it works                   | Use when                                             |
| -------------------------------------- | ------------------------------ | ---------------------------------------------------- |
| **Offset** `?page=3&limit=20`          | `OFFSET 40 LIMIT 20`           | Small datasets, admin screens that need page numbers |
| **Cursor** `?cursor=<opaque>&limit=20` | `WHERE (createdAt, id) < (…)`  | Feeds, infinite scroll, large or fast-moving data    |

Offset is the common choice and the wrong one at scale. `OFFSET 1000000` still makes the database walk
and throw away a million rows. Worse, if a row is inserted while the user pages, everything shifts — they
see item 20 twice and never see item 21. Keyset pagination fixes both:

```typescript
interface Page<T> { data: T[]; nextCursor: string | null }

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
  const rows: Order[] = await db.orders.find(where)
    .sort({ createdAt: -1, id: -1 }).limit(capped + 1).toArray();

  const data = rows.slice(0, capped);
  return { data, nextCursor: rows.length > capped ? encode(data[data.length - 1]) : null };
}
```

> ⚠️ A cursor is opaque. Clients must not parse it. Base64 is encoding, not security — sign it if it
> exposes anything sensitive.

State the tradeoff out loud: cursors give up random access. You cannot jump to page 50, and a
total count needs a separate, often approximate, query. That is the right trade for a feed and the
wrong one for a paginated report.

## Idempotent Writes

`POST /payments` is not idempotent, but the network will still time out and the client will still retry.
Without protection the customer is charged twice.

```typescript
export const idempotency: RequestHandler = async (req, res, next) => {
  const key = req.header("Idempotency-Key");
  if (!key) return next();

  // SET NX — only the first request for this key claims the slot.
  const claimed = await redis.set(`idem:${key}`, "in-flight", { NX: true, EX: 86_400 });
  if (!claimed) {
    const stored = await redis.get(`idem:${key}`);
    // Still running? Tell the client to wait. Finished? Replay the stored response.
    return stored === "in-flight"
      ? res.status(409).json({ title: "Request already in progress" })
      : res.status(200).json(JSON.parse(stored!));
  }

  // Store the response on success so a retry replays it; delete on failure so a retry is allowed.
  res.on("finish", () => void (res.statusCode < 400
    ? redis.set(`idem:${key}`, JSON.stringify(res.locals.body), { EX: 86_400 })
    : redis.del(`idem:${key}`)));

  next();
};
```

Stripe's API works this way. Naming the pattern is a strong senior signal.

## Common Mistakes

**❌ Wrong — an error dressed as a success:**

```typescript
// Every cache, proxy, HTTP client and error dashboard now believes this succeeded.
res.status(200).json({ success: false, error: "user not found" });
```

**✅ Right — let the status code carry the outcome:**

```typescript
res.status(404).json({ type: "https://errors.example.com/not-found", title: "User not found", status: 404 });
```

Retries and circuit breakers read the status line, not your body. A `200` on failure blinds all of them.

**❌ Passing user input straight into a sort or filter clause.** `{ [req.query.sort]: -1 }` is both an
injection and a guaranteed table scan. Allowlist every sortable and filterable key — see
[Chapter ?? — Input Validation and Injection](#ch-backend-input-validation).

> ⚠️ Authorisation must check the **object**, not just the route. `GET /orders/9` has to verify that
> order 9 belongs to the caller. A route guard alone lets any authenticated user read every order.

## 🔑 Key Takeaways

- The URL names a resource and the method names the action; a verb in the path means the design slipped.
- Idempotency decides whether a client, proxy or load balancer may safely retry after a timeout.
- One error shape everywhere, carrying a `traceId` and every failed field, costs nothing and saves hours.
- Cursor pagination is the only strategy that survives large tables and concurrent inserts.
- A `200` response with `success: false` breaks every cache, retry and dashboard that reads HTTP.

## Interview Questions

**Q: `PUT` or `PATCH`?**

`PUT` replaces the whole resource, so omitted fields get cleared. `PATCH` merges a partial change. A
settings form that submits every field can honestly use `PUT`. A "change email" action should use `PATCH`,
so it cannot clobber fields the client never loaded.

**Q: Which methods are idempotent, and why does it matter?**

`GET`, `PUT`, `DELETE`, `HEAD` and `OPTIONS`. It matters because it decides whether a retry after a
timeout is safe. `POST` is not idempotent, so for anything that moves money I accept an `Idempotency-Key`
header and deduplicate server-side.

**Q: How do you paginate ten million rows?**

Keyset pagination. `OFFSET` degrades linearly because the database still scans the skipped rows, and
concurrent inserts cause duplicates and gaps. I encode the last row's sort key plus its id into an opaque
cursor, filter with a `WHERE (sortKey, id) < (…)` predicate, and fetch `limit + 1` rows to detect the next
page without a `COUNT(*)`.

## What to Read Next

- [Chapter ?? — GraphQL](#ch-graphql) — what you gain and lose when the client picks the response shape
- [Chapter ?? — API Versioning](#ch-versioning) — how to change a contract other people depend on
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the `429` path, and how to make limits predictable
