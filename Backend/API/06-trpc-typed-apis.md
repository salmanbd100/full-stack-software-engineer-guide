---
title: tRPC and Typed APIs
part: 5
chapter: 0
slug: trpc
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-07
tags: [trpc, typescript, api, type-safety, contracts, backend]
in_book: true
---

# tRPC and Typed APIs {#ch-trpc}

> Get one source of truth for the API contract, and know exactly which problem that solves and which it does not.

**In this chapter:** inference instead of generation · a router, a context, a procedure · what type safety does not check · versioning without a version number · when a schema beats inference

## 💡 The Core Idea

Every typed-API approach exists to remove the same failure: **the server changed and the client did
not notice.** The three ways to do it differ in where the truth lives.

| Approach | Source of truth | Client types come from |
| -------- | --------------- | ---------------------- |
| Hand-written types | Nothing. Two copies that drift | A person keeping them in step |
| Schema-first — OpenAPI, GraphQL | A schema file | A code generator, run in the pipeline |
| **Inference-first — tRPC** | The server's own TypeScript | The compiler, immediately |

tRPC's claim is that if both ends are TypeScript in one repository, a schema is a redundant middle
step. The client imports the server's **type** — never its code — and any change to a procedure is a
type error at the call site the moment you save the file.

The important limit is right there in that sentence. It works when both ends are TypeScript and can
see each other's types. Outside that, it is the wrong tool, and saying so is what separates a
considered answer from enthusiasm.

## How It Works

### One router, one exported type

```typescript
// server/trpc.ts — context first, because procedures are typed against it
import { initTRPC, TRPCError } from "@trpc/server";

export interface Context {
  user: { id: string; role: "admin" | "member" } | null;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Middleware narrows the context type, so `ctx.user` is non-null downstream.
export const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return opts.next({ ctx: { user: opts.ctx.user } });
});
```

```typescript
// server/routers/orders.ts
import { z } from "zod";

export const ordersRouter = router({
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async (opts) => {
      // opts.input is typed and validated; opts.ctx.user is non-null.
      return orders.find(opts.input.id, opts.ctx.user.id);
    }),

  create: protectedProcedure
    .input(z.object({ sku: z.string(), quantity: z.number().int().positive() }))
    .mutation(async (opts) => orders.create(opts.input, opts.ctx.user.id)),
});

export const appRouter = router({ orders: ordersRouter });
export type AppRouter = typeof appRouter; // the entire contract, as one type
```

Three things are doing work in that snippet. `.input()` takes a schema, so validation and the input
type come from the same declaration — there is no way to type an input without validating it.
`protectedProcedure` narrows `ctx`, so authorisation is expressed in the type rather than as a runtime
check the handler might forget. And `AppRouter` is a type, not a value, so importing it into the
client bundles nothing.

### The client is the type, applied

```typescript
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/routers/orders"; // type-only import

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});

// Autocompleted, and a compile error if `byId` loses its `id` input.
const order = await client.orders.byId.query({ id });
```

`httpBatchLink` collects calls made in the same tick into one HTTP request. That matters for the usual
client pattern of several components each asking for what they need: without batching it is a request
per component, which is the waterfall that
[Chapter ?? — GraphQL](#ch-graphql) also exists to solve.

### What the types do not check

This is the honest section, and the one interviews probe.

| tRPC catches | tRPC does not catch |
| ------------ | ------------------- |
| A renamed or removed procedure | A **deployed** server older than the client's types |
| A changed input or output shape | A semantic change — same shape, different meaning |
| A missing required field | Whether the caller is allowed the data (that is authorisation) |
| A wrong primitive type | Anything about a non-TypeScript caller |

The first row is the one that bites in production. Type safety is checked at **build** time against
the types in your working tree. If the client is deployed before the server, or a mobile app pinned to
last month's build is still in the wild, the compiler has already agreed to something the running
server does not do. Atomic deploys — one repository, one pipeline — are a precondition of the
guarantee, not a nice-to-have.

### Versioning without version numbers

Because there is no published schema, tRPC's answer to
[Chapter ?? — API Versioning and Contracts](#ch-versioning) is different: **you do not version, you
migrate.** Add the new field as optional, ship both, migrate call sites, delete the old one — and the
compiler lists every call site for you.

```typescript
// Step 1 — add alongside. Both procedures work, so nothing breaks on deploy.
export const ordersRouter = router({
  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async (opts) => orders.find(opts.input.id, opts.ctx.user.id)),

  // Step 2 — migrate call sites to this one; the compiler enumerates them.
  // Step 3 — delete `byId`. The build fails if anything still calls it.
  byIdWithLines: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async (opts) => orders.findWithLines(opts.input.id, opts.ctx.user.id)),
});
```

That works precisely because the callers are in the same repository. A public API has callers you
cannot compile, so it needs a real version number and a real deprecation window.

> ⚠️ **Moving target:** tRPC 11 changed the procedure options object and the React Query integration
> moved to TanStack Query's own package. The durable principle is that the server's type is the
> contract and the client imports it type-only. Check the current adapter and query-integration names
> before wiring one up.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| One repository, TypeScript both ends, one team deploying together | tRPC | The lowest-ceremony end-to-end guarantee available |
| A Next.js app with its own backend | tRPC or route handlers | Both ends already share a build — see [Chapter ?? — Route Handlers and the BFF](#ch-route-handlers-and-the-bff) |
| A public or partner API | REST + OpenAPI | Callers you cannot compile need a published, versioned schema |
| Mobile clients, or any non-TypeScript consumer | REST or GraphQL | The inference guarantee does not reach them |
| Many clients with different data needs, one graph | GraphQL | Field selection is the actual requirement |
| Separately deployed client and server | REST, or tRPC with a pinned contract package | Atomic deploys are what make inference safe |
| Web-standard HTTP endpoints, still typed | Hono's `hc` | Same guarantee, plain URLs — [Chapter ?? — Edge Runtimes and Hono](#ch-edge-runtimes) |

## Common Mistakes

❌ **Importing the router value instead of its type.** `import { appRouter }` pulls the database
client and every server dependency into the browser bundle.
✅ `import type { AppRouter }` — always type-only.

❌ **Treating a validated input as an authorised one.** `.input()` proves the shape, and nothing else.
✅ Check ownership and permissions in the procedure — see [Chapter ?? — Authorisation](#ch-authorisation).

❌ **Exposing tRPC to third parties because it is already built.** They get an undocumented,
unversioned RPC surface whose types they cannot consume.
✅ Publish REST or GraphQL for external callers; keep tRPC internal.

❌ **One flat router with ninety procedures.** Autocomplete becomes useless and the type gets slow to
check.
✅ Nest routers per domain, as `appRouter` does above.

❌ **Assuming the type check means the deployed server agrees.** It checks your working tree, not
production.
✅ Deploy client and server together, or pin the contract and treat drift as a real risk.

## 🔑 Key Takeaways

- tRPC replaces a generated schema with direct type inference, so the server's TypeScript is the contract.
- `.input()` supplies validation and the input type from one schema declaration.
- Middleware that narrows the context is how authentication becomes a type rather than a forgotten check.
- The guarantee holds at build time and assumes client and server deploy together.
- Anything with external or non-TypeScript callers needs a published schema instead.

## Interview Questions

**Q: What does tRPC give you that a generated OpenAPI client does not?**

Immediacy and one fewer artefact. Renaming a procedure is a red squiggle at every call site before you
have saved the file, with no generator to run and no generated directory that can be stale or
committed wrong. What you give up is the published schema — and that schema is exactly what a
non-TypeScript or third-party consumer needs, so the trade is only worth it inside one repository.

**Q: Is a tRPC API type-safe in production?**

It is type-safe at build time against the types in the repository. In production the guarantee holds
only as long as the deployed server matches the types the client was compiled against, so it depends
on client and server shipping together. A client released ahead of its server compiles cleanly and
fails at runtime, which is the failure mode worth naming.

**Q: Would you use tRPC for a mobile app's backend?**

No. The inference only reaches TypeScript callers, and a mobile client is both a different language
and independently released — so you would be relying on atomic deploys that cannot happen. REST with
a published schema, or GraphQL if the clients genuinely need different field sets.

**Q: How do you make a breaking change to a tRPC procedure?**

Add the replacement alongside the original, migrate the call sites — the compiler enumerates them —
then delete the original and let the build prove nothing calls it. There is no version number because
every caller is in the same repository and can be recompiled, which is the same reason the approach
does not work for a public API.

## What to Read Next

- [Chapter ?? — API Versioning and Contracts](#ch-versioning) — what you need instead once callers are outside your repository
- [Chapter ?? — GraphQL](#ch-graphql) — the other answer to over-fetching and client-driven data needs
- [Chapter ?? — Edge Runtimes and Hono](#ch-edge-runtimes) — the same typed-client idea over plain HTTP
