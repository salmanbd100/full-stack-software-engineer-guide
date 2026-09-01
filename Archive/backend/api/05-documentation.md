---
title: API Documentation
part: 5
chapter: 0
slug: api-documentation
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-28
tags: [backend, api, documentation]
in_book: true
---

# API Documentation {#ch-api-documentation}

> Keep the docs true by generating them from the thing that is already the contract.

**In this chapter:** what documentation must contain · OpenAPI · code-first vs spec-first · one source of truth · catching drift in CI

## Overview

Documentation is part of the API, not a chore that follows it. If the contract isn't written down, every consumer reverse-engineers it from responses — and then depends on behaviour you never promised.

The only documentation question that matters in an interview is **how do you stop it drifting from the code?** Everyone has read good docs. Fewer people have kept them true for two years.

> **The answer, in one line:** one machine-readable schema, checked in CI, that both validates requests and generates the docs. Prose that a human maintains separately is prose that will be wrong by next quarter.

## Table of Contents

- [What Documentation Must Contain](#what-documentation-must-contain)
- [OpenAPI: The Standard](#openapi-the-standard)
- [Code-First vs Spec-First](#code-first-vs-spec-first)
- [One Source of Truth](#one-source-of-truth)
- [Serving the Docs](#serving-the-docs)
- [Preventing Drift in CI](#preventing-drift-in-ci)
- [Documenting Change](#documenting-change)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## What Documentation Must Contain

Ranked by how often its absence causes a support ticket:

| Section | Why it matters |
| ------- | -------------- |
| **Auth** — how to get a credential, how to send it, how it expires | Blocks the very first call |
| **A working example per endpoint** — real request, real response | What developers actually read |
| **Errors** — every status, the error shape, what each code means | Half of integration work is failure handling |
| **Pagination, filtering, sorting** | Nobody guesses your cursor format |
| **Rate limits** — the numbers, the headers, the retry advice | Discovered at 429, which is too late |
| **Field semantics** — units, timezone, currency, nullability | `amount: 1000` — cents or dollars? |
| **Changelog and deprecations** | The only way a consumer plans work |
| **A quickstart** — first successful call in under five minutes | Drives adoption more than anything else |

❌ **Useless:**

```text
GET /users — returns users.
```

✅ **Useful:** the request with headers, the exact response body, the failure cases, and the meaning of every field that isn't self-evident.

> ✨ **Document the things a schema can't express.** Types tell a reader `expiresAt` is a string. Only prose tells them it's UTC, that it's exclusive, and that a null means "never expires". That's where handwritten docs earn their keep — not in re-listing fields.

## OpenAPI: The Standard

[OpenAPI](https://spec.openapis.org/oas/latest.html) (formerly Swagger) describes a REST API as a machine-readable document. That machine-readability is the whole point:

- ✅ Interactive docs — Swagger UI, Redoc, Scalar
- ✅ Generated client SDKs in many languages
- ✅ Generated server stubs and mock servers
- ✅ Contract tests that assert responses match the spec
- ✅ Linting for consistency (Spectral)

**3.1 is the version to use.** It aligns with JSON Schema 2020-12, which means the same schema can drive validation *and* documentation. Naming that in an interview shows you've looked at the spec this decade.

```yaml
openapi: 3.1.0
info:
  title: Orders API
  version: 1.4.0
paths:
  /orders/{id}:
    get:
      summary: Fetch a single order
      security: [{ bearerAuth: [] }]
      parameters:
        - { in: path, name: id, required: true, schema: { type: string } }
      responses:
        "200":
          description: The order
          content:
            application/json:
              schema: { $ref: "#/components/schemas/Order" }
        "404":
          description: No order with that id
```

Writing that by hand for 60 endpoints is exactly how docs rot. Generate it.

## Code-First vs Spec-First

| | **Code-first** (generate spec from code) | **Spec-first** (write spec, generate types) |
| --- | --- | --- |
| Source of truth | The implementation | The contract document |
| Drift risk | ✅ Low — spec follows the code | ⚠️ Real — code can ignore the spec |
| Design quality | ⚠️ API shape leaks implementation details | ✅ Forces you to design before building |
| Parallel work | ❌ Clients wait for the server | ✅ Clients mock from the spec on day one |
| Best for | Internal services, one team | Public APIs, multiple teams, mobile clients |

**Recommendation:** spec-first when the API crosses a team boundary, code-first inside a single service. And whichever you pick, the runtime must validate against the same schema — otherwise "the spec" is just a document, and documents lie.

## One Source of Truth

The strongest setup in TypeScript: define each schema once with Zod, use it for runtime validation, static types, *and* the OpenAPI document.

```typescript
import { z } from "zod";
import {
  extendZodWithOpenApi,
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z); // adds .openapi() metadata to Zod schemas

const registry = new OpenAPIRegistry();

// ── The one definition ────────────────────────────────────────────
const OrderSchema = z
  .object({
    id: z.string().uuid().openapi({ example: "7c9e6679-7425-40de-944b-e07fc1f90ae7" }),
    // ✅ Put the ambiguous bits in the description — a type can't carry them.
    total: z.number().int().openapi({
      description: "Order total in the smallest currency unit (cents).",
      example: 4999,
    }),
    currency: z.string().length(3).openapi({ example: "GBP" }),
    status: z.enum(["pending", "shipped", "cancelled"]),
    createdAt: z.string().datetime().openapi({ description: "UTC, ISO 8601." }),
  })
  .openapi("Order"); // becomes #/components/schemas/Order

export type Order = z.infer<typeof OrderSchema>; // static type, free

registry.registerPath({
  method: "get",
  path: "/orders/{id}",
  summary: "Fetch a single order",
  tags: ["Orders"],
  request: { params: z.object({ id: z.string().uuid() }) },
  responses: {
    200: {
      description: "The order.",
      content: { "application/json": { schema: OrderSchema } },
    },
    404: { description: "No order with that id." },
  },
});

// ── The generated document ────────────────────────────────────────
export function buildOpenApiDocument() {
  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: "3.1.0",
    info: { title: "Orders API", version: "1.4.0" },
    servers: [{ url: "https://api.example.com/v1" }],
  });
}
```

Now use the *same* schema in the handler:

```typescript
// The validator and the docs cannot disagree — they're the same object.
app.get("/orders/:id", async (req, res) => {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const order = await service.findById(id);
  if (!order) return res.status(404).json({ title: "Not found", status: 404 });
  res.json(OrderSchema.parse(order)); // ⚠️ in dev/test — see below
});
```

> ⚠️ **Parsing responses catches drift immediately** but costs CPU on every request and can turn a serialization bug into a 500. Run it in development and tests, and in production either sample it or log the mismatch instead of throwing.

## Serving the Docs

```typescript
import swaggerUi from "swagger-ui-express";

const document = buildOpenApiDocument();

// Machine-readable — SDK generators and contract tests consume this.
app.get("/openapi.json", (_req, res) => res.json(document));

// Human-readable.
app.use("/docs", swaggerUi.serve, swaggerUi.setup(document));
```

| Renderer | Strength |
| -------- | -------- |
| **Swagger UI** | Try-it-out console; the familiar default |
| **Redoc** | Best reading experience for a large API |
| **Scalar** | Modern UI, generates client snippets |

> 🔴 **Interactive docs on a production endpoint need a decision, not a default.** For a public API, publish freely — the endpoints are public anyway. For an internal one, put `/docs` behind auth. And never let the try-it-out console point at production data with a pre-filled admin token.

## Preventing Drift in CI

Three checks, each cheap, that together make stale docs a build failure.

**1. The committed spec must match the code.**

```bash
# Regenerate and diff. Fails if someone changed a route without regenerating.
npm run generate:openapi
git diff --exit-code openapi.json
```

**2. The spec must be valid and consistent.** [Spectral](https://stoplight.io/open-source/spectral) lints style rules — every operation has a summary, every error response is documented, naming is consistent.

```bash
npx @stoplight/spectral-cli lint openapi.json --fail-severity warn
```

**3. Real responses must match the spec.** This is the check that catches genuine lies.

```typescript
import { buildOpenApiDocument } from "../src/openapi";
import request from "supertest";

const document = buildOpenApiDocument();

it("GET /orders/:id matches its documented 200 schema", async () => {
  const res = await request(app).get(`/orders/${seeded.id}`).set("Authorization", token);

  expect(res.status).toBe(200);
  // Validate the live payload against the schema in the spec.
  expect(res.body).toMatchSchema(
    document.paths!["/orders/{id}"].get!.responses["200"].content["application/json"].schema,
  );
});
```

> ✨ **Breaking-change detection is the highest-value check.** Tools like `oasdiff` compare the spec on your branch against the released one and fail the build on a removed field or a tightened type. It turns "is this breaking?" from a judgement call in review into a machine answer. Pairs directly with [Versioning](./03-versioning.md).

## Documenting Change

A changelog aimed at consumers, not a git log.

```text
## 2026-08-01 — v2.3.0

### Added
- `GET /orders` accepts `status` filter.
- `Order.refundedAt` (nullable) on all order responses.

### Deprecated
- `Order.amount` — use `Order.total` (an object with `amount` and `currency`).
  Removal: 2027-02-01. See the migration guide.

### Fixed
- `GET /orders` returned 500 instead of 400 for an invalid cursor.
```

**Rules that make a changelog usable:**

- ✅ Dated, newest first, grouped Added / Changed / Deprecated / Removed / Fixed.
- ✅ Every deprecation names its replacement **and** its removal date.
- ✅ Behaviour changes count as changes — a new default sort belongs here.
- ❌ No commit hashes, no internal refactors, no ticket numbers without context.

**Mark deprecation in the spec too**, so tooling and generated SDKs surface it:

```yaml
Order:
  properties:
    amount:
      type: integer
      deprecated: true
      description: "Deprecated — use `total`. Removed after 2027-02-01."
```

## Interview Questions

**Q1: How do you keep documentation in sync with the code?**

Generate it from the same schema the code validates against. I define request and response schemas once — Zod in a TypeScript service — derive both the runtime validator and the OpenAPI document from it, then enforce three CI checks: the committed spec matches a fresh generation, the spec lints clean, and live responses validate against the documented schemas. Docs that are hand-maintained alongside code always drift; the fix is structural, not disciplinary.

**Q2: Code-first or spec-first?**

Spec-first when the API crosses a team boundary — it forces design before implementation and lets client teams mock from the spec instead of waiting. Code-first inside a single service, where the drift risk of writing a document nobody enforces is the bigger problem. Either way the runtime must validate against the same schema, or the spec is just a wish.

**Q3: What does good documentation include beyond endpoint listings?**

The parts a schema can't express: authentication end to end, error semantics for every status, pagination mechanics, rate limits with their headers, and field semantics — units, timezone, nullability, whether a range is inclusive. Plus a quickstart that gets someone to a successful call in five minutes, and a changelog they can plan against. A generated field list without those is a type definition, not documentation.

**Q4: OpenAPI's downsides?**

It's verbose, so hand-writing it invites drift; generation is essentially mandatory. Generated SDKs are often unidiomatic. It models request/response REST well and streaming, webhooks, and long-running jobs awkwardly — 3.1 added webhook support, which helps. And it says nothing about semantics: a spec can be perfectly valid and still not tell you the timezone.

**Q5: Do GraphQL APIs need this?**

The schema *is* the machine-readable contract, and introspection gives you the type explorer for free — so you skip OpenAPI. What you still owe consumers is everything introspection can't carry: which queries are expensive, the cost limits, deprecation timelines with `@deprecated`, and auth semantics per field. Introspection is usually disabled in production, so you also need a published schema artifact.

**Q6: How do you document a breaking change?**

Announce it in the changelog with the old and new shapes side by side and a dated removal timeline. Mark the old field `deprecated` in the spec so generated SDKs warn. Publish a migration guide with concrete before/after examples, and link to it from the `Deprecation` and `Sunset` response headers. Then verify with usage metrics that people actually migrated before removing anything.

**Q7: Should docs be versioned?**

Yes — docs ship with the code that implements them, and every supported version needs its docs live simultaneously. A consumer still on v1 needs v1's docs while v2's exist. I keep the spec in the repo, tag it with releases, and publish one docs site per supported version.

## Summary

**Checklist:**

- [ ] One schema drives validation, static types, and the spec
- [ ] OpenAPI 3.1, generated — never hand-maintained
- [ ] `/openapi.json` served for tooling; a rendered UI for humans
- [ ] CI fails if the committed spec differs from a fresh generation
- [ ] CI lints the spec (every operation summarised, errors documented)
- [ ] Contract tests validate live responses against documented schemas
- [ ] Breaking-change diff against the released spec in CI
- [ ] Auth, errors, pagination, and rate limits documented in prose
- [ ] Units, timezones, and nullability spelled out per field
- [ ] Changelog with dated deprecations and removal dates
- [ ] Docs versioned and published per supported API version

**Best practices:**

1. **Generate what a machine can, write what only a human can** — types from schema, semantics from prose.
2. **Make drift a build failure** — good intentions don't survive a deadline.
3. **Lead with a working example** — nobody reads a field table first.
4. **Version docs with code** — every supported version stays published.

---

[← Rate Limiting](./04-rate-limiting.md) | [API Index](./README.md) | [WebSockets →](./06-websockets.md)
