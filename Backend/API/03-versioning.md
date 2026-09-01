---
title: API Versioning and Contracts
part: 5
chapter: 0
slug: versioning
level: advanced
reading_time: 9
updated: 2026-09-01
tags: [api, versioning, openapi, contracts, deprecation]
in_book: true
---

# API Versioning and Contracts {#ch-versioning}

> Change an API other teams depend on without breaking them, and make the contract the thing that cannot drift.

**In this chapter:** what actually breaks a client · where the version goes · avoiding a new version · a typed contract with one source of truth · deprecation and deletion

## 💡 The Core Idea

Versioning is a cost, not a feature. Every live version is a code path you maintain, test and
patch. The senior instinct is therefore not "how do I version this" but **"how do I make this
change without a new version"** — and only when that fails, how to introduce one and retire the
old one on a schedule.

That instinct rests on one distinction: additive changes are safe, removals and redefinitions are
not.

## How It Works

### Breaking against non-breaking

| Change | Breaking? | Why |
| ------ | --------- | --- |
| Add an optional response field | ❌ No | A client that ignores it is unaffected |
| Add an optional request field | ❌ No | Existing callers omit it and get the old behaviour |
| Add a new endpoint | ❌ No | Nothing referenced it |
| Remove or rename a field | ✅ Yes | A client reads it today |
| Change a type — `"5"` to `5` | ✅ Yes | Parsers and validators fail |
| Make an optional request field required | ✅ Yes | Existing callers stop validating |
| Add a value to an enum | ⚠️ Usually | A client with a `switch` and no default falls through |
| Tighten validation | ✅ Yes | Requests that worked now 400 |
| Change a default | ✅ Yes | Silent behaviour change, the worst kind |

The two rows people get wrong are the last two. Tightening validation and changing a default both
look like bug fixes and both break callers, silently, in production.

### Where the version goes

| Strategy | Looks like | Verdict |
| -------- | ---------- | ------- |
| **Path** | `/v1/users` | The default. Visible in logs, trivial to route, cacheable |
| **Header** | `Accept: application/vnd.api+json;version=1` | Purer REST; invisible in a log, easy to forget in a `curl` |
| **Query** | `/users?version=1` | Pollutes the cache key and gets dropped by proxies |
| **Per-field** | `?fields=…` with additive-only schema | Best when it works — GraphQL's model |

Use the path unless you have a specific reason not to. Version the **major** number only:
`/v1`, never `/v1.2.3`. Minor and patch changes are by definition non-breaking, so they need no
route.

Route to a version at the edge, and keep the shared logic underneath:

```typescript
// One service layer, two presenters. The version lives in the transform, not the business logic.
app.use('/v1', v1Router); // v1: { name: string }
app.use('/v2', v2Router); // v2: { firstName: string; lastName: string }

const toV1 = (u: User) => ({ id: u.id, name: `${u.firstName} ${u.lastName}` });
const toV2 = (u: User) => ({ id: u.id, firstName: u.firstName, lastName: u.lastName });
```

Duplicating the *service* per version is how a two-version API becomes unmaintainable. Duplicate
only the shape.

### Avoiding a new version

Four techniques cover most changes:

- **Add, do not replace.** Ship `firstName` and `lastName` alongside `name`, populate all three,
  and mark `name` deprecated. No version needed.
- **Default the new behaviour to the old one.** A new `include` parameter that defaults to the
  previous response is additive.
- **Expand, then contract.** Write both fields, migrate clients, delete the old field later. This
  is the same pattern as a zero-downtime database migration.
- **Feature-flag by client.** Opt individual consumers into the new behaviour, verify, then flip
  the default.

## The Contract Is the Deliverable

A version number is worthless if nobody can tell what a version contains. The contract has to be
machine-readable and generated from something that cannot drift from the code.

**One source of truth, three artefacts:**

```typescript
import { z } from 'zod';

// The schema is the single definition. Everything else is derived from it.
export const CreateUser = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  role: z.enum(['viewer', 'editor', 'admin']).default('viewer'),
});

export type CreateUser = z.infer<typeof CreateUser>; // 1. The TypeScript type
```

From that one object you get the runtime validator (2) by calling `CreateUser.parse(req.body)` in
the route, and the OpenAPI schema (3) by converting it at build time. Because all three come from
the same declaration, the documented contract cannot disagree with the enforced one.

```typescript
// Generate the spec at build time and commit it, so a diff shows contract changes in review.
const registry = new OpenAPIRegistry();
registry.registerPath({
  method: 'post',
  path: '/v1/users',
  request: { body: { content: { 'application/json': { schema: CreateUser } } } },
  responses: { 201: { description: 'Created' } },
});
```

> ⚠️ Hand-written OpenAPI is out of date within a sprint. If the spec is not generated from the
> code that runs, it is documentation of intent, not of behaviour.

**Then gate it in CI.** Two checks catch nearly everything:

1. **Drift** — regenerate the spec and fail if it differs from the committed file.
2. **Breaking change** — diff the new spec against the previous release with a tool such as
   `oasdiff`, and fail the build on a breaking diff unless the version was bumped.

That second check is what turns "we agreed not to break clients" into something the pipeline
enforces.

## Deprecation and Deletion

Announce in the response, not only in a changelog. Two standard headers do the work:

```typescript
res.set('Deprecation', 'Sun, 01 Mar 2026 00:00:00 GMT'); // RFC 9745
res.set('Sunset', 'Sun, 01 Sep 2026 00:00:00 GMT');      // RFC 8594
res.set('Link', '</v2/users>; rel="successor-version"');
```

Then log every call to the deprecated path with the caller's identity. That log is the only
reliable answer to "is it safe to delete yet".

```typescript
// Per-consumer usage, so you know who to contact rather than guessing.
metrics.increment('api.deprecated', { version: 'v1', route: req.route.path, client: req.clientId });
```

A workable timeline for an internal API is announce → six months → delete, with the last two
months in **monitor mode**: return the old response but alert on every call. For a public API,
twelve months is the floor. Never delete on the strength of a changelog entry and no telemetry.

## Common Mistakes

**❌ Versioning the whole API for one endpoint's change.** Every consumer has to migrate,
including the ones unaffected. Version at the resource level if the platform allows it.

**❌ Duplicating business logic per version.** The versions drift, and a bug fix lands in one.

**❌ Skipping the deprecation window because "nobody uses v1".** Add the telemetry first; the
answer is regularly a mobile app release from two years ago that cannot be updated.

**❌ Treating an enum addition as additive.** It is additive for the schema and breaking for any
client whose `switch` has no `default`. Document new enum values as breaking unless you know every
consumer.

## 🔑 Key Takeaways

- Additive changes are safe; removals, retypings, tightened validation and changed defaults are not.
- Put the major version in the path, and never a minor or patch number.
- Version the response shape, never the business logic underneath it.
- Generate the OpenAPI spec from the same schema the runtime validates against, and fail CI on drift.
- Deprecation needs `Deprecation`/`Sunset` headers plus per-consumer telemetry; deletion needs the telemetry to be quiet.

## Interview Questions

**Q: How do you add a required field to a request without breaking clients?**

You do not — that is breaking by definition. Add it as optional with a default that reproduces the
current behaviour, measure how many callers send it, then make it required in the next major
version once adoption is complete. If the field genuinely has no safe default, that is the case
for a new version.

**Q: Path, header or query versioning?**

Path, in almost every case: it is visible in access logs, routable at the load balancer, and
cacheable without a `Vary` header. Header versioning is more RESTful in theory but invisible in
debugging and easy to omit. Query versioning fragments the cache key and gets stripped by some
proxies.

**Q: How do you know a version is safe to delete?**

From per-consumer request telemetry on the old routes, not from a changelog. Announce with
`Deprecation` and `Sunset` headers, log every remaining call with the caller's identity, contact
the stragglers, and run a monitor-mode period where the old behaviour still works but every call
alerts. Delete when the counter has been zero for a full cycle of your consumers' release
cadences.

## What to Read Next

- [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) — the conventions a version is preserving
- [Chapter ?? — GraphQL](#ch-graphql) — evolving a schema with deprecation instead of versions
- [Chapter ?? — Database Migrations and ORMs](#ch-orms) — expand-then-contract applied to schema
