---
title: GraphQL, tRPC and Typed API Choices
part: 5
chapter: 7
slug: graphql
level: advanced
reading_time: 14
updated: 2026-09-24
tags: [api, graphql, dataloader, schema, trpc, typescript, type-safety, openapi, contracts, backend]
in_book: true
---

# GraphQL, tRPC and Typed API Choices {#ch-graphql}

> Choose between GraphQL, tRPC and REST with a generated client, and know what each one costs to run.

**In this chapter:** where the contract lives · GraphQL resolvers and N+1 · protecting a public graph · tRPC inference and its limits · the decision table

## 💡 The Core Idea

Every typed API exists to stop one failure: **the server changed and the client did not notice.** The
approaches differ in where the truth lives and who can read it.

| Approach | Source of truth | Client types come from | Who can call it |
| -------- | --------------- | ---------------------- | --------------- |
| REST + OpenAPI | A published schema file | A code generator in the pipeline | Anyone, in any language |
| GraphQL | A published schema file | A code generator, per query | Anyone, and they pick the fields |
| tRPC | The server's own TypeScript | The compiler, at once | TypeScript callers in the same repository |

GraphQL also lets the client name exactly the fields it wants, in one request. That ends
over-fetching, but the server can no longer predict a request's cost or cache it by URL. tRPC bets
that, with TypeScript at both ends of one repository, a schema is a redundant middle step.

## How It Works

### REST plus a generated client

The default for any API with callers you do not control. You publish an OpenAPI document, often
generated from the server's validation schemas, and each client generates its types from it. The
cost is one extra artefact: the generator must run in CI, and a stale generated file is a quiet bug.
The gain: a Swift app, a Java partner and your own frontend all read one contract.

### The GraphQL schema is the contract

**A schema with a cycle and a nullable lookup:**

```graphql
type User {
  id: ID!
  name: String!
  posts(first: Int = 10): [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: User!          # Cycles are fine — resolution is lazy
}

type Query {
  user(id: ID!): User    # Nullable: "not found" is a valid answer
}
```

**`!` is a promise.** A non-null field that resolves to `null` nulls its nearest nullable parent.

### Resolvers, N+1 and DataLoader

A resolver runs once per field, only if the query asked for it, and receives its parent's value.
So `{ posts(first: 50) { author { name } } }` calls `Post.author` fifty times: fifty queries, by
default. `DataLoader` batches every `load()` from the same tick into one call and caches per request.

**A batched loader, built fresh for every request:**

```typescript
import DataLoader from 'dataloader';

export function createLoaders(db: Db) {
  return {
    user: new DataLoader<string, User | null>(async (ids: readonly string[]) => {
      const rows = await db.users.findMany({ where: { id: { in: [...ids] } } });
      const byId = new Map(rows.map((r) => [r.id, r]));
      // One entry per key, in the same order. Missing → null, never a gap.
      return ids.map((id) => byId.get(id) ?? null);
    }),
  };
}

const resolvers = {
  Post: {
    author: (parent: Post, _: unknown, ctx: GraphQLContext): Promise<User | null> =>
      ctx.loaders.user.load(parent.authorId),
  },
  User: {
    // Field-level check: only the owner reads the email.
    email: (parent: User, _: unknown, ctx: GraphQLContext): string | null =>
      ctx.userId === parent.id ? parent.email : null,
  },
};
```

> ⚠️ Create loaders **per request**, in the context factory. A loader at module level caches across
> users and serves one tenant's data to another. It is the most serious bug in GraphQL codebases.

Authorisation belongs on the field that exposes the data. `User` is reachable through `Query.user`,
`Post.author` and many other paths, so a check on one entry point protects none of the others.

### Protecting a public GraphQL endpoint

A public GraphQL endpoint is a query interpreter open to the internet. It needs three controls:

| Control | Stops | How |
| ------- | ----- | --- |
| **Depth limit** | `{ author { posts { author { posts … } } } }` | Reject beyond about 7 levels |
| **Complexity limit** | A wide, shallow query fetching a million rows | Cost per field × page size, capped per request |
| **Persisted queries** | Arbitrary queries entirely | The client sends a hash; the server holds the allowlist |

Counting requests is nearly useless, because one query can cost a thousand times another. GraphQL
also returns HTTP 200 on failure, so mask stack traces and give clients a stable `extensions.code`.

### tRPC: one router, one exported type

**A context, an auth middleware and a router:**

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";

export interface Context {
  user: { id: string; role: "admin" | "member" } | null;
}

const t = initTRPC.context<Context>().create();

// Middleware narrows the context type, so `ctx.user` is non-null downstream.
const protectedProcedure = t.procedure.use(async (opts) => {
  if (!opts.ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
  return opts.next({ ctx: { user: opts.ctx.user } });
});

export const appRouter = t.router({
  orders: t.router({
    byId: protectedProcedure
      .input(z.object({ id: z.string().uuid() }))
      .query(async (opts) => orders.find(opts.input.id, opts.ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter; // the whole contract, as one type
```

`.input()` gives validation and the input type from one declaration. `AppRouter` is only a type,
so importing it into the client bundles nothing.

**The client applies that type:**

```typescript
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/router"; // type-only import

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});

// Autocompleted, and a compile error if `byId` loses its `id` input.
const order = await client.orders.byId.query({ id });
```

`httpBatchLink` joins calls made in the same tick into one HTTP request, which solves the
per-component waterfall without a query language.

> ⚠️ **Moving target:** tRPC 11 changed the procedure options object and added a new TanStack Query
> integration, `@trpc/tanstack-react-query`, beside the classic `@trpc/react-query`. The durable
> principle is that the server's type is the contract and the client imports it type-only.

### What the types do not check

Typed contracts catch a renamed procedure, a changed shape or a missing field. They do not catch a
semantic change, or whether the caller may see the data. Above all, they do not catch a **deployed**
server older than the client's types. tRPC checks your working tree at build time, so atomic deploys
are a precondition. They also shape versioning: add the new procedure beside the old one, move the
call sites the compiler lists, then delete the old one. A public API needs a real deprecation window.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| One repository, TypeScript both ends, deployed together | tRPC | The lowest-ceremony end-to-end guarantee |
| Public or partner API, cacheable reads | REST + OpenAPI | Callers you cannot compile need a published, versioned schema |
| Mobile or any non-TypeScript client | REST, or GraphQL | Inference does not reach them, and they release on their own schedule |
| Many clients with different data needs, deep nesting | GraphQL | Field selection is the actual requirement |

GraphQL pays off when client teams outnumber server teams, tRPC when one team owns both ends. REST
with a generated client is the safe default everywhere else.

## Common Mistakes

❌ **A GraphQL resolver that calls the database directly.** It turns N+1 under any list field.
✅ Route every read through a per-request loader.

❌ **Importing the tRPC router value instead of its type.** `import { appRouter }` pulls the database
client into the browser bundle.
✅ `import type { AppRouter }`, always.

❌ **Exposing tRPC to third parties because it is already built.** They get an unversioned surface.
✅ Publish REST or GraphQL for external callers and keep tRPC internal.

## 🔑 Key Takeaways

- Every typed API answers one question: where does the contract live, and can every caller read it?
- GraphQL lets the client pick the shape, and that choice causes N+1, cost control and caching problems.
- DataLoader fixes N+1, and it must be created per request or it leaks data between users.
- tRPC's guarantee holds at build time and assumes the client and server deploy together.
- Any API with external or non-TypeScript callers needs a published schema, so REST or GraphQL.

## Interview Questions

**Q: What is the N+1 problem in GraphQL, and why is it structural?**

Each field resolves on its own, so a list of N parents runs the child resolver N times. It is
structural because lazy per-field resolution is the feature. DataLoader collects the `load()` calls
from one tick and runs one batched query. Create it per request, or its cache leaks between users.

**Q: How do you rate limit a GraphQL API?**

Not by request count, because one query can cost a thousand times another. Give each field a cost,
multiply by page size, and reject a query over the caller's budget. Depth limits handle recursion,
and persisted queries remove arbitrary queries altogether.

**Q: Is a tRPC API type-safe in production?**

Only at build time, against the types in the repository. A client released ahead of its server
compiles cleanly and fails at runtime, so the guarantee depends on deploying both together.

**Q: A mobile app, a web app and two partners need your API. GraphQL, tRPC or REST?**

Not tRPC: its inference reaches only TypeScript callers deployed with the server. REST with OpenAPI
suits the partners and caches well. GraphQL earns its running cost only if the clients need very
different field sets. Many teams run REST for partners and tRPC for their own web app.

## What to Read Next

- [Chapter ?? — REST Best Practices and Versioning](#ch-rest-best-practices) — publishing and versioning a contract for callers outside your repository
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — why cost, not request count, is the unit for a graph
- [Chapter ?? — Route Handlers and the BFF](#ch-route-handlers-and-the-bff) — where a Next.js app's typed backend lives
