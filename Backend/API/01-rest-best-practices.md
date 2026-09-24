---
title: REST Best Practices and Versioning
part: 5
chapter: 6
slug: rest-best-practices
level: intermediate # beginner | intermediate | advanced
reading_time: 15
updated: 2026-09-24
tags: [api, rest, http, backend, idempotency, versioning, openapi, contracts, deprecation]
in_book: true
---

# REST Best Practices and Versioning {#ch-rest-best-practices}

> Design an HTTP API another engineer can guess correctly before reading the docs, then change it without breaking them.

**In this chapter:** resource URLs · methods and idempotency · status codes and one error shape · pagination that survives scale · changing a contract without breaking clients

## 💡 The Core Idea

REST is not a specification you can fail a compliance test against. It is a set of conventions built on
top of HTTP. The payoff is predictability: when the conventions hold, a client can guess how a route
behaves without opening the documentation. Interviewers use REST design as a proxy for something bigger —
can you model a domain, and do you understand HTTP well enough to stop reinventing it?

> The URL names a **thing**. The method says what you are **doing to it**. `POST /users/123/deactivate`
> is a red flag. `PATCH /users/123` with `{ "status": "inactive" }` is the same work, expressed in HTTP.

Once other teams call your API, its shape is a contract. Every live version is a code path you maintain,
so the senior question is not "how do I version this" but **"how do I ship this without a new version"**.

## How It Works

### Resource-oriented URLs

| Rule                        | ❌ Bad                           | ✅ Good                      |
| --------------------------- | -------------------------------- | ---------------------------- |
| Nouns, not verbs            | `/getUsers`, `/createUser`       | `GET /users`, `POST /users`  |
| Plural collections          | `/user/123`                      | `/users/123`                 |
| Lowercase with hyphens      | `/orderItems`, `/order_items`    | `/order-items`               |
| Nest only to show ownership | `/users/1/orders/9/items/4/tax`  | `/order-items/4`             |

Stop nesting at two levels; deeper than that, the child has its own identity. Actions that are not CRUD
still model as resources most of the time. A password reset is a request (`POST /users/123/password-resets`),
a refund is a record (`POST /orders/9/refunds`), and a slow export is a job (`POST /reports`, returning
`202`). Do not twist a design to avoid one RPC-style route, though. One `POST /cache:purge` beats a fake
resource nobody understands.

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
`PATCH /users/123` with `{ "name": "Ada" }` leaves the other fields alone. A patch of `{ "views": "+1" }`
gives a different result on every call, which is why the specification cannot promise `PATCH` is
idempotent. A plain `$set` patch is idempotent in practice. Say both things.

### Status codes

| Code            | Use it when                                                                 |
| --------------- | --------------------------------------------------------------------------- |
| 200 · 201 · 204 | Success — `201` adds a `Location` header, `204` has nothing to return        |
| 202             | Queued for async work; nothing exists yet                                    |
| 400 · 409       | Failed validation · duplicate, version mismatch or illegal state change      |
| 401 · 403       | Not authenticated · authenticated, but not allowed                           |
| 404             | No such resource — also hides existence from a 403 case                      |
| 429             | Rate limited — add `Retry-After`                                             |
| 500 · 503       | Your bug, never with a stack trace · a dependency is down or you shed load   |

### What breaks a client

| Change                                  | Breaking?  | Why                                                 |
| --------------------------------------- | ---------- | --------------------------------------------------- |
| Add an optional field or a new endpoint | ❌ No      | A client that ignores it is unaffected               |
| Remove, rename or retype a field        | ✅ Yes     | A client reads it today; `"5"` to `5` fails parsers  |
| Make an optional request field required | ✅ Yes     | Existing callers stop validating                    |
| Add a value to an enum                  | ⚠️ Usually | A client `switch` with no `default` falls through    |
| Tighten validation, or change a default | ✅ Yes     | Both look like bug fixes and break callers silently |

## When to Use It

| Scenario                                           | Choose           | Why                                                              |
| -------------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| Public API, many unknown clients                   | REST             | Cacheable by default, and every HTTP tool already understands it |
| One frontend that needs varied, nested data        | GraphQL          | The client picks the shape, so round trips collapse              |
| Internal service-to-service calls, typed both ends | gRPC or tRPC     | Contract generated from types; HTTP semantics add little         |
| Server pushes to the client                        | WebSocket or SSE | REST has no way to send without being asked                      |

## Error Responses

Use one machine-readable shape everywhere: [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457.html).

**The one error shape:**

```typescript
interface ProblemDetails {
  type: string;      // stable URI identifying the error class
  title: string;     // short human summary
  status: number;    // matches the HTTP status
  errors?: { field: string; code: string; message: string }[];
  traceId?: string;  // ties the response to your logs
}
```

Build it in **one** error handler, covered in [Chapter ?? — The Node.js Event Loop, Async and Errors](#ch-event-loop-async).
Every route throws and no route formats. Return **all** validation errors at once. A form that surfaces
one bad field per round trip is a bad API, not a bad frontend.

## Pagination

| Strategy                               | How it works                  | Use when                                             |
| -------------------------------------- | ----------------------------- | ---------------------------------------------------- |
| **Offset** `?page=3&limit=20`          | `OFFSET 40 LIMIT 20`          | Small datasets, admin screens that need page numbers |
| **Cursor** `?cursor=<opaque>&limit=20` | `WHERE (createdAt, id) < (…)` | Feeds, infinite scroll, large or fast-moving data    |

Offset is the common choice and the wrong one at scale. `OFFSET 1000000` still makes the database walk
and throw away a million rows. Worse, if a row is inserted while the user pages, everything shifts — they
see item 20 twice and never see item 21. Keyset pagination fixes both:

**Keyset pagination with an opaque cursor:**

```typescript
// Encode the full sort key, not just the id — ties must break deterministically.
const encode = (o: Order): string =>
  Buffer.from(`${o.createdAt.toISOString()}|${o.id}`).toString("base64url");

async function listOrders(cursor?: string, limit = 20): Promise<{ data: Order[]; nextCursor: string | null }> {
  const capped = Math.min(limit, 100); // ✅ always cap a client-supplied limit
  const [createdAt, id] = cursor ? Buffer.from(cursor, "base64url").toString().split("|") : [];
  const where = cursor ? { $or: [{ createdAt: { $lt: createdAt } }, { createdAt, id: { $lt: id } }] } : {};
  // Fetch one extra row to learn whether a next page exists — no COUNT(*) needed.
  const rows: Order[] = await db.orders.find(where).sort({ createdAt: -1, id: -1 }).limit(capped + 1).toArray();
  const data = rows.slice(0, capped);
  return { data, nextCursor: rows.length > capped ? encode(data[data.length - 1]) : null };
}
```

> ⚠️ A cursor is opaque. Base64 is encoding, not security — sign it if it exposes anything sensitive.

Cursors give up random access: no jumping to page 50, and a total count needs a separate query. That is
the right trade for a feed and the wrong one for a paginated report.

## Idempotent Writes

`POST /payments` is not idempotent, but the network will time out and the client will retry. Without
protection the customer pays twice. The fix, used by Stripe's API, is an `Idempotency-Key` header: one
key per logical operation, claimed with an atomic Redis `SET NX`. A repeat gets `409` while the first
request runs, or a replay of its stored response after. Delete the key on failure, so a retry is allowed.

## Changing the Contract

Try these first. Each one ships a change with no new version:

- **Add, do not replace.** Ship `firstName` and `lastName` alongside `name`, and mark `name` deprecated.
- **Expand, then contract.** Write both fields, migrate clients, delete the old field later — the same
  pattern as a zero-downtime database migration.

When a break is unavoidable, put the **major** version in the path: `/v1/users`, never `/v1.2.3`. It is
visible in logs and routable at the load balancer; a header is purer REST but invisible when you debug.
Version the shape, not the service. `/v1` and `/v2` share one service layer, with two presenters that
map the same `User` to each shape. Duplicating the service per version is how a bug fix lands in only one.

Generate the contract; never write it by hand. Define each request once as a Zod schema, and derive the
TypeScript type, the runtime validator and the OpenAPI spec from it. The documented contract then cannot
disagree with the enforced one. Commit the spec and gate it in CI: fail on **drift** from the committed
file, and on a **breaking diff** against the last release (`oasdiff` does this) unless the major moved.

**Retire a version in the response, not only in a changelog:**

```typescript
res.set("Deprecation", "@1772323200");              // RFC 9745 — 1 Mar 2026
res.set("Sunset", "Tue, 01 Sep 2026 00:00:00 GMT"); // RFC 8594
res.set("Link", '</v2/users>; rel="successor-version"');
```

Then log every call to the old path with the caller's identity — the only reliable answer to "is it safe
to delete yet". Six months suits an internal API; twelve is the floor for a public one.

## Common Mistakes

**❌ Wrong, then ✅ right — an error dressed as a success:**

```typescript
// ❌ Every cache, proxy, retry and error dashboard reads the status line, so this "succeeded".
res.status(200).json({ success: false, error: "user not found" });
// ✅ Let the status code carry the outcome.
res.status(404).json({ type: "https://errors.example.com/not-found", title: "User not found", status: 404 });
```

**❌ Passing user input straight into a sort or filter clause.** `{ [req.query.sort]: -1 }` is both an
injection and a guaranteed table scan. Allowlist every sortable and filterable key — see
[Chapter ?? — Input Validation and Injection](#ch-backend-input-validation).

**❌ Deleting a version because "nobody uses v1".** Add the telemetry first. The answer is often a mobile
app release from two years ago that cannot be updated.

> ⚠️ Authorisation must check the **object**, not just the route. `GET /orders/9` has to verify that
> order 9 belongs to the caller. A route guard alone lets any authenticated user read every order.

## 🔑 Key Takeaways

- The URL names a resource and the method names the action; a verb in the path means the design slipped.
- Idempotency decides whether a client, proxy or load balancer may safely retry after a timeout.
- Cursor pagination is the only strategy that survives large tables and concurrent inserts.
- Additive changes are safe, but removals, retypings, tightened validation and changed defaults all break clients.
- Generate the contract from the schema the runtime validates with, and delete a version only when its telemetry is quiet.

## Interview Questions

**Q: Which methods are idempotent, and why does it matter?**

`GET`, `PUT`, `DELETE`, `HEAD` and `OPTIONS`. It decides whether a retry after a timeout is safe. For a
`POST` that moves money, I accept an `Idempotency-Key` and deduplicate server-side.

**Q: How do you paginate ten million rows?**

Keyset pagination. `OFFSET` still scans every skipped row, and concurrent inserts cause duplicates and
gaps. I encode the last row's sort key and id into an opaque cursor, and fetch `limit + 1` rows.

**Q: How do you add a required request field without breaking clients?**

You do not — that is breaking by definition. Add it as optional with a default that keeps today's
behaviour, measure how many callers send it, then make it required in the next major version.

**Q: When would you not ship a `/v2`?**

Almost always, if the change can be additive. A new version forces every consumer to migrate, even the
unaffected ones, and doubles what you test. A new optional field or expand-then-contract usually does
the job; a version earns its cost only for a true redefinition.

## What to Read Next

- [Chapter ?? — GraphQL, tRPC and Typed API Choices](#ch-graphql) — what you gain when the client picks the shape, and schema evolution without versions
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the `429` path, and how to make limits predictable
- [Chapter ?? — Indexes, Query Plans, ORMs and Migrations](#ch-indexes) — expand-then-contract applied to a schema
