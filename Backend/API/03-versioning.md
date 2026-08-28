# API Versioning {#ch-api-versioning}

> Tell a breaking change from a safe one, and avoid cutting a new version at all.

**In this chapter:** breaking vs non-breaking · where the version goes · additive change instead of a new version · deprecation and sunset · when it is safe to delete

## Overview

Versioning is how you change an API without breaking the clients already using it. The mechanism — a path segment, a header — is the easy part and takes an afternoon.

The hard part is everything after: running two code paths, knowing who still uses the old one, and actually turning it off.

> **The senior framing:** every version you ship is a maintenance contract you cannot cancel unilaterally. So the goal isn't good versioning, it's **needing fewer versions** — design for additive change first, and version only when the change genuinely cannot be additive.

## Table of Contents

- [Breaking vs Non-Breaking Changes](#breaking-vs-non-breaking-changes)
- [Where to Put the Version](#where-to-put-the-version)
- [Implementing Path Versioning](#implementing-path-versioning)
- [Avoiding a New Version](#avoiding-a-new-version)
- [Deprecation and Sunset](#deprecation-and-sunset)
- [Knowing When It's Safe to Delete](#knowing-when-its-safe-to-delete)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Breaking vs Non-Breaking Changes

The whole discipline rests on classifying a change correctly.

| Change | Breaking? | Note |
| ------ | --------- | ---- |
| Add a new endpoint | ✅ Safe | Nobody calls it yet |
| Add an optional request field | ✅ Safe | Old clients omit it |
| Add a response field | ✅ Safe *in theory* | See the warning below |
| Make a required field optional | ✅ Safe | Loosening never breaks a caller |
| Add a new enum value | 🔴 **Breaking** | Clients with a `switch` and no default fall through |
| Rename a field | 🔴 Breaking | Even `name` → `fullName` |
| Change a type | 🔴 Breaking | `"19.99"` → `19.99` breaks parsers |
| Remove a field or endpoint | 🔴 Breaking | Obvious |
| Make an optional field required | 🔴 Breaking | Existing requests start failing |
| Tighten validation | 🔴 Breaking | Previously accepted input now 400s |
| Change a status code or error shape | 🔴 Breaking | Client error handling is coupled to it |
| Change default sort or page size | 🔴 Breaking | Silently changes results — the worst kind |

> ⚠️ **"Adding a field is safe" assumes tolerant clients.** A client with strict schema validation, or one that hashes the whole response, breaks on a new field. Publish tolerant-reader expectations in your docs, and treat additive changes as safe *because you said so up front*.

**The two that catch people out** are new enum values and changed defaults. Both look additive and neither is. Mention either one in an interview and you sound like someone who has broken production before.

## Where to Put the Version

| Strategy | Example | Verdict |
| -------- | ------- | ------- |
| **URL path** | `/v2/users` | ✅ Default choice. Visible in logs, trivial to route and cache, easy to `curl` |
| **Custom header** | `API-Version: 2` | ⚠️ Clean URLs, but invisible in logs and easy for caches to ignore |
| **Accept header** | `Accept: application/vnd.api.v2+json` | ⚠️ Purest REST, worst ergonomics |
| **Date header** | `API-Version: 2026-01-15` | ✅ Excellent for large public APIs (Stripe's model) |
| **Query param** | `/users?v=2` | ❌ Mixes identity with filtering, breaks caches |

**Pick the path unless you have a reason not to.** It is what GitHub, Twilio, and most public APIs do, and "I can see the version in the access log" matters more in an incident than URL aesthetics.

> ✨ **The date-based variant is worth knowing.** Stripe pins each account to the API version current when it signed up, sent as a date. New accounts get the latest; existing ones never break; a single header opts a caller into the new behaviour. It costs a compatibility-transform layer per change, and buys you the ability to ship breaking changes weekly.

🔴 **If you cache behind a CDN and version by header, you must send `Vary: API-Version`.** Otherwise v1 responses get served to v2 clients — a genuinely hard bug to diagnose.

## Implementing Path Versioning

The rule that keeps this maintainable: **version the boundary, never the business logic.** One service, many representations.

```typescript
import express, { Router } from "express";

// ── Domain layer: no version awareness at all ─────────────────────
interface OrderRow {
  id: string;
  total: number;
  currency: string;
  status: "pending" | "shipped" | "cancelled";
  createdAt: Date;
}

class OrderService {
  async findById(id: string): Promise<OrderRow | null> {
    return db.orders.findOne({ id });
  }
}

// ── Presentation layer: one serializer per version ────────────────
interface OrderV1 {
  id: string;
  amount: number; // v1 exposed a bare number
  status: string;
}

interface OrderV2 {
  id: string;
  total: { amount: number; currency: string }; // v2 made money a type
  status: string;
  createdAt: string;
}

const toV1 = (o: OrderRow): OrderV1 => ({ id: o.id, amount: o.total, status: o.status });

const toV2 = (o: OrderRow): OrderV2 => ({
  id: o.id,
  total: { amount: o.total, currency: o.currency },
  status: o.status,
  createdAt: o.createdAt.toISOString(),
});

// ── Routing ───────────────────────────────────────────────────────
const service = new OrderService();

function ordersRouter<T>(serialize: (o: OrderRow) => T): Router {
  const router = Router();
  router.get("/orders/:id", async (req, res) => {
    const order = await service.findById(req.params.id);
    if (!order) return res.status(404).json({ title: "Not found", status: 404 });
    res.json(serialize(order));
  });
  return router;
}

const app = express();
app.use("/v1", ordersRouter(toV1));
app.use("/v2", ordersRouter(toV2));
```

**Why this shape:**

- ✅ A bug fix in `OrderService` fixes both versions at once.
- ✅ Serializers are pure functions — easy to unit test, easy to delete.
- ✅ Adding v3 is one function and one `app.use`.

❌ **The anti-pattern** is copying the whole controller into a `v2/` folder. It works for a week, then a fix lands in one copy and not the other, and now v1 and v2 disagree about what an order is.

> ⚠️ **Version whole APIs, not individual endpoints.** `/v1/users` alongside `/v3/orders` is a matrix nobody can document or reason about. Bump the surface together and keep the mental model simple.

## Avoiding a New Version

Most "we need v2" moments don't. Cheaper options, roughly in order:

**1. Add alongside, don't replace.** Ship the new field, keep writing the old one, and mark it deprecated in the docs.

```typescript
// Transitional response — both fields, both correct.
{
  "name": "Ada Lovelace",      // deprecated, removed in v2
  "fullName": "Ada Lovelace"   // preferred
}
```

**2. Expand and contract.** The safe way to rename anything, including database columns:

```text
1. Write both, read old      ← deploy new code, nothing breaks
2. Backfill                  ← old records get the new field
3. Read new, still write old ← the switch, and it's reversible
4. Stop writing old          ← after clients have migrated
5. Delete old                ← weeks or months later
```

**3. Opt-in flags for genuinely new behaviour.**

```typescript
// Client asks for the new shape explicitly; default stays stable.
const useNewPricing = req.header("X-Features")?.includes("pricing-v2") ?? false;
```

**4. Deprecate a field instead of an API.** Cheaper than a whole version, and GraphQL formalises this with `@deprecated(reason: "…")`. See [GraphQL](./02-graphql.md).

## Deprecation and Sunset

Use the standard HTTP headers ([RFC 8594](https://www.rfc-editor.org/rfc/rfc8594.html) and the `Deprecation` header draft) rather than inventing `X-` names. Tooling understands them.

```typescript
import type { RequestHandler } from "express";

/** Marks a version deprecated and advertises when it stops working. */
function deprecated(sunsetISO: string, guide: string): RequestHandler {
  const sunset = new Date(sunsetISO).toUTCString();

  return (_req, res, next) => {
    res.set({
      Deprecation: "true",
      Sunset: sunset, // RFC 8594 — an HTTP-date, not a bare "2026-06-01"
      Link: `<${guide}>; rel="deprecation"; type="text/html"`,
    });
    next();
  };
}

app.use("/v1", deprecated("2026-12-31T23:59:59Z", "https://docs.example.com/v1-to-v2"));
```

**A realistic timeline for a public API:**

```text
Month 0   Ship v2. Announce v1 deprecation. Publish the migration guide.
Month 1   Deprecation + Sunset headers on every v1 response.
Month 3   Email the top consumers by traffic. Offer help.
Month 6   Block v1 for newly created API keys. Existing keys unaffected.
Month 9   Brownouts — return 410 for one hour, twice, announced in advance.
Month 12  Sunset. 410 Gone, with a link to the guide.
```

> ✨ **Brownouts are the trick that actually works.** Emails get filtered; a one-hour outage produces a support ticket from the team that never read them, while there's still time to migrate. Announce them, keep them short, and never run one on a Friday.

**Return 410 Gone, not 404.** 410 means "this existed and is intentionally gone" — a client can log it and stop retrying. 404 looks like a typo and gets retried forever.

```typescript
app.use("/v1", (_req, res) => {
  res.status(410).json({
    type: "https://docs.example.com/errors/version-sunset",
    title: "API v1 has been sunset",
    status: 410,
    detail: "v1 was retired on 2026-12-31. Use /v2.",
  });
});
```

## Knowing When It's Safe to Delete

You cannot sunset what you cannot measure. Tag every request with its version and its caller.

```typescript
app.use((req, _res, next) => {
  const version = req.path.match(/^\/v(\d+)\//)?.[1] ?? "unversioned";

  metrics.increment("api.request", {
    version,
    route: req.route?.path ?? "unknown",
    clientId: req.apiKeyId ?? "anonymous", // ✅ per-client, or you can't call anyone
  });

  next();
});
```

**What to watch:**

| Signal | Why it matters |
| ------ | -------------- |
| Requests per version | The headline number |
| **Distinct clients** per version | 1000 requests from one dead cron job is not 1000 users |
| Traffic by client | Tells you who to email first |
| Which v1 fields are still read | Field-level usage lets you delete pieces early |
| Last-seen timestamp per client | Finds abandoned integrations |

> 🔴 **Traffic near zero is not the same as zero.** A quarterly batch job shows up as noise for 89 days and a broken customer on the 90th. Check for at least one full business cycle before deleting.

## Interview Questions

**Q1: Which versioning strategy would you choose, and why?**

URL path versioning for a normal public REST API — it's visible in logs and traces, trivial to route in a gateway, and safe with any cache. For a large API that ships breaking changes often, I'd use date-based versions pinned per account, like Stripe: new callers get current behaviour, existing ones never break, and you carry a compatibility-transform layer instead of a fork of the codebase.

**Q2: Which changes need a new version?**

Anything a client can observe and depend on: removing or renaming fields, changing types, tightening validation, changing error shapes or status codes, and changing defaults like page size or sort order. Adding endpoints or optional fields is safe if you've told clients to be tolerant readers. The two people miss are new enum values — a client `switch` with no default falls through — and changed defaults, which break silently.

**Q3: How do you avoid needing v2 at all?**

Additive change plus expand-and-contract. To rename a field I write both and read the old one, backfill, flip reads to the new one, then stop writing the old one once traffic confirms nobody reads it. Every step is independently deployable and reversible. A version is what I reach for when the *shape* of the resource changes, not when a field does.

**Q4: How do you sunset a version?**

Announce it, then serve `Deprecation` and `Sunset` headers with a `Link` to the migration guide on every response. Track usage per client, not just totals, and contact the biggest consumers directly. Block new API keys from the old version, run a couple of announced brownouts, then return `410 Gone`. For a public API the whole thing is 6–12 months.

**Q5: 404 or 410 for a removed version?**

410 Gone. It says the resource existed and was intentionally removed, so a client can log it and stop retrying. A 404 reads like a typo and gets retried indefinitely.

**Q6: How do you avoid duplicated code across versions?**

The domain layer has no idea versions exist. Each version gets a pure serializer function that maps the domain object to that version's response shape, plus a thin router. Bug fixes land once; adding a version is one function. Copying controllers into `v2/` guarantees the two drift apart.

**Q7: Do internal microservices need versioning?**

Not the same way. If you control every caller, you can coordinate a deploy, so schema evolution plus contract tests beats maintaining parallel versions. gRPC/Protobuf gives you additive-by-design field numbering. What you still need is compatibility across a rolling deploy — during a rollout, old and new instances run at once, so each change must be backward-compatible for at least one deploy cycle even with no external clients.

**Q8: Should you version from day one?**

Yes — ship `/v1` even if there's never a v2, because retrofitting a prefix onto a live unversioned API is itself a breaking change. It costs nothing on day one.

## Summary

**Checklist:**

- [ ] `/v1` in the path from the first deploy
- [ ] Version the whole API surface, not individual endpoints
- [ ] Major versions only — no `/v1.2`
- [ ] Domain logic shared; one serializer per version
- [ ] Additive change and expand-and-contract tried before a version bump
- [ ] `Deprecation`, `Sunset`, and `Link` headers on deprecated versions
- [ ] `Vary: API-Version` if versioning by header behind a cache
- [ ] Usage metrics per version **and per client**
- [ ] Migration guide published before deprecation is announced
- [ ] `410 Gone` after sunset, never `404`

**Best practices:**

1. **Fewer versions beats good versioning** — design for additive change.
2. **Version the edge** — serializers change, the domain doesn't.
3. **Measure before you delete** — distinct clients, over a full business cycle.
4. **Brownouts, not just emails** — a short announced outage finds the clients nobody could reach.

---

[← GraphQL](./02-graphql.md) | [API Index](./README.md) | [Rate Limiting →](./04-rate-limiting.md)
