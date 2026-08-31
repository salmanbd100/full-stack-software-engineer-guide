---
title: GraphQL
part: 5
chapter: 0
slug: graphql
level: intermediate # beginner | intermediate | advanced
reading_time: 18
updated: 2026-08-28
tags: [backend, api, graphql]
in_book: true
---

# GraphQL {#ch-graphql}

> Design a schema the frontend can query well, and stop the resolver chain melting your database.

**In this chapter:** the schema and type system · resolvers · the N+1 problem and DataLoader · field-level auth · errors · when REST is still the better call

## Overview

GraphQL replaces many fixed endpoints with one endpoint and a typed schema. The client sends the exact shape of data it wants; the server resolves it field by field.

That solves two real REST problems — **over-fetching** (the endpoint returns 40 fields, the screen needs 4) and **under-fetching** (the screen needs four round trips before it can render).

> **The trade you are making:** you move complexity from the client to the server. The client stops stitching endpoints together; you take on N+1 queries, query-cost limits, and the loss of plain HTTP caching. Interviewers care much more that you can name this trade than that you can recite SDL.

## Table of Contents

- [Schema and Type System](#schema-and-type-system)
- [Resolvers and the Resolver Chain](#resolvers-and-the-resolver-chain)
- [Server Setup](#server-setup)
- [The N+1 Problem and DataLoader](#the-n1-problem-and-dataloader)
- [Auth: Context and Field-Level Checks](#auth-context-and-field-level-checks)
- [Errors](#errors)
- [Pagination (Relay Connections)](#pagination-relay-connections)
- [Protecting the Endpoint](#protecting-the-endpoint)
- [GraphQL vs REST](#graphql-vs-rest)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## Schema and Type System

The schema is the contract. It is checked at query time, so an invalid query never reaches a resolver.

```graphql
type User {
  id: ID!
  name: String!
  email: String!          # sensitive — see field-level auth below
  posts(first: Int): [Post!]!
}

type Post {
  id: ID!
  title: String!
  author: User!
}

input CreatePostInput {   # inputs are their own types, never reuse output types
  title: String!
  body: String!
  tags: [String!] = []
}

type Query {
  me: User
  post(id: ID!): Post
  posts(first: Int = 20, after: String): PostConnection!
}

type Mutation {
  createPost(input: CreatePostInput!): Post!
}
```

**Reading the `!` and `[]`:**

| Notation    | Meaning                                        |
| ----------- | ---------------------------------------------- |
| `String`    | Nullable string                                |
| `String!`   | Never null                                     |
| `[String]`  | Nullable list of nullable strings              |
| `[String!]!` | Never-null list, no null members              |

> ⚠️ **Non-null propagates failure upward.** If a resolver for a `String!` field throws, GraphQL cannot return null there, so it nulls the *parent* — and keeps climbing until it finds a nullable field. One broken leaf can blank out a whole response. Mark a field non-null only when it truly cannot fail.

**Schema design rules worth stating in an interview:**

- ✅ Use `input` types for mutation arguments — one argument, easy to evolve.
- ✅ Return the mutated object, not a boolean, so clients can update their cache.
- ✅ Name mutations `verbNoun`: `createPost`, `publishPost`.
- ✅ Model domain concepts as types (`Money { amount, currency }`), not loose scalars.
- ❌ Don't mirror your database tables — the schema is a product API, not an ORM dump.

## Resolvers and the Resolver Chain

A resolver receives four arguments. Knowing them cold is table stakes.

```typescript
type Resolver<Parent, Args, Result> = (
  parent: Parent,   // the value returned by the parent field's resolver
  args: Args,       // arguments passed to this field
  context: Context, // per-request: auth, loaders, db handles
  info: GraphQLResolveInfo, // the query AST — which fields were requested
) => Promise<Result> | Result;
```

GraphQL resolves **one field at a time, top down**. `posts` runs first, then `author` runs *once per post*. That execution model is exactly where N+1 comes from.

```typescript
interface Context {
  userId: string | null;
  loaders: Loaders;
}

const resolvers = {
  Query: {
    post: (_parent: unknown, { id }: { id: string }, ctx: Context) =>
      ctx.loaders.post.load(id),
  },

  // Field resolver: only runs if the client asked for `Post.author`.
  Post: {
    author: (post: PostRow, _args: unknown, ctx: Context) =>
      ctx.loaders.user.load(post.authorId),
  },
};
```

> ✨ **Sibling fields resolve in parallel; nested fields resolve in sequence.** That's why a deep query is far more expensive than a wide one, and why depth limits matter.

## Server Setup

Apollo Server 5 with Express. Note that the old `apollo-server` package is dead — the current packages are `@apollo/server` plus an integration.

```typescript
// npm i @apollo/server @as-integrations/express5 express graphql cors
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import express from "express";
import http from "node:http";
import cors from "cors";
import { typeDefs, resolvers } from "./schema";

const app = express();
const httpServer = http.createServer(app);

const server = new ApolloServer<Context>({
  typeDefs,
  resolvers,
  // Lets in-flight operations finish on SIGTERM instead of being cut off.
  plugins: [ApolloServerPluginDrainHttpServer({ httpServer })],
  introspection: process.env.NODE_ENV !== "production",
});

await server.start();

app.use(
  "/graphql",
  cors<cors.CorsRequest>({ origin: ["https://app.example.com"], credentials: true }),
  express.json({ limit: "100kb" }), // 🔴 default 50mb is an easy DoS
  expressMiddleware(server, {
    // Runs once per request — build auth and fresh loaders here.
    context: async ({ req }): Promise<Context> => ({
      userId: verifyBearer(req.headers.authorization),
      loaders: createLoaders(), // ✅ new loaders per request, never global
    }),
  }),
);

await new Promise<void>((resolve) => httpServer.listen({ port: 4000 }, resolve));
```

## The N+1 Problem and DataLoader

This is the single most likely GraphQL question you will get.

```graphql
query {
  posts(first: 100) {   # 1 query
    title
    author { name }     # 100 more queries — one per post
  }
}
```

**DataLoader** collects every `.load(id)` call made in the same tick of the event loop, then calls your batch function once with all the keys.

```typescript
import DataLoader from "dataloader";

function createLoaders() {
  return {
    user: new DataLoader<string, UserRow | null>(async (ids) => {
      const rows = await db.users.find({ id: { $in: [...ids] } }).toArray();
      const byId = new Map(rows.map((r) => [r.id, r]));
      // 🔴 The contract: return one entry per key, in the same order.
      return ids.map((id) => byId.get(id) ?? null);
    }),

    // One-to-many needs grouping, not a Map lookup.
    postsByAuthor: new DataLoader<string, PostRow[]>(async (authorIds) => {
      const rows = await db.posts.find({ authorId: { $in: [...authorIds] } }).toArray();
      const grouped = new Map<string, PostRow[]>();
      for (const row of rows) {
        const bucket = grouped.get(row.authorId) ?? [];
        bucket.push(row);
        grouped.set(row.authorId, bucket);
      }
      return authorIds.map((id) => grouped.get(id) ?? []);
    }),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
```

100 queries become 2 — one for posts, one batched `WHERE id IN (…)` for authors.

> 🔴 **Create loaders per request.** A loader caches by key for its lifetime. A module-level loader is a cache that never expires and leaks one user's data into another user's response.

**The alternative:** resolve joins at the top level (`JOIN` or `$lookup`) using `info` to see which fields were requested. Faster, but the resolver has to understand the whole subtree — which is why DataLoader is the default answer.

## Auth: Context and Field-Level Checks

**Authentication once per request, authorization per field.**

```typescript
import { GraphQLError } from "graphql";

const unauthenticated = () =>
  new GraphQLError("Not authenticated", { extensions: { code: "UNAUTHENTICATED", http: { status: 401 } } });

const forbidden = () =>
  new GraphQLError("Forbidden", { extensions: { code: "FORBIDDEN", http: { status: 403 } } });

const resolvers = {
  Query: {
    me: (_p: unknown, _a: unknown, ctx: Context) => {
      if (!ctx.userId) throw unauthenticated();
      return ctx.loaders.user.load(ctx.userId);
    },
  },

  User: {
    // Field-level check: any path that reaches a User must still gate `email`.
    email: (user: UserRow, _a: unknown, ctx: Context) => {
      if (ctx.userId !== user.id) throw forbidden();
      return user.email;
    },
  },
};
```

> ⚠️ **Route-level auth doesn't work in GraphQL.** There is one route. A `User` can be reached through `me`, `post.author`, or `comment.author`, so the check has to live on the *type*, not the entry point. This is the answer that separates people who have run GraphQL in production from people who have read about it.

For anything beyond a few fields, put the rule in the schema with a directive or a library like `graphql-shield`, so the policy is reviewable in one place.

## Errors

GraphQL returns HTTP 200 with an `errors` array. That surprises people, and it's a deliberate part of the design: a partial result is still a result.

```json
{
  "data": { "post": { "title": "Hello", "author": null } },
  "errors": [
    {
      "message": "Forbidden",
      "path": ["post", "author", "email"],
      "extensions": { "code": "FORBIDDEN" }
    }
  ]
}
```

**Two kinds of failure, handled differently:**

| Failure | Where it goes | Example |
| ------- | ------------- | ------- |
| **Unexpected / system** | `errors` array | Database down, bug, auth failure |
| **Expected / business** | The schema itself | "Email already taken", "Card declined" |

Modelling expected failures as types makes them type-safe and impossible for a client to ignore:

```graphql
union CreateUserResult = CreateUserSuccess | EmailTakenError

type CreateUserSuccess { user: User! }
type EmailTakenError { message: String!, suggestedEmail: String! }
```

> 🔴 **Mask internal errors in production.** Apollo returns `INTERNAL_SERVER_ERROR` for unexpected throws, but a stack trace leaking through a custom formatter is a real incident. Log the cause with a request id; return the code.

## Pagination (Relay Connections)

The Relay Connection spec is the convention, and clients like Apollo Client and Relay have caching built around it.

```graphql
type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
}

type PostEdge {
  cursor: String!
  node: Post!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}
```

```typescript
interface PostsArgs {
  first?: number;
  after?: string;
}

const MAX_PAGE = 100;

const postsResolver = async (_p: unknown, { first = 20, after }: PostsArgs) => {
  const limit = Math.min(first, MAX_PAGE); // ✅ never trust `first`
  const rows = await fetchPostsAfter(after, limit + 1); // +1 to detect a next page

  const nodes = rows.slice(0, limit);
  const edges = nodes.map((node) => ({ cursor: encodeCursor(node), node }));

  return {
    edges,
    pageInfo: {
      hasNextPage: rows.length > limit,
      hasPreviousPage: Boolean(after),
      startCursor: edges[0]?.cursor ?? null,
      endCursor: edges.at(-1)?.cursor ?? null,
    },
  };
};
```

The mechanics of keyset cursors are the same as REST — see [Pagination](./01-rest-best-practices.md#pagination). The GraphQL-specific part is that **every list field needs its own limit**, because `posts(first: 100) { comments(first: 100) }` multiplies.

## Protecting the Endpoint

One endpoint that accepts arbitrary nested queries is an open invitation. Four defences, in order of importance:

```typescript
import depthLimit from "graphql-depth-limit";

const server = new ApolloServer({
  typeDefs,
  resolvers,
  validationRules: [depthLimit(7)], // 1. reject absurdly nested queries
  introspection: process.env.NODE_ENV !== "production", // 3. hide the schema map
});
```

| Defence | Why |
| ------- | --- |
| **Depth limit** | Blocks `user { posts { author { posts { … } } } }` recursion bombs |
| **Cost analysis** | Assign a cost per field; reject over a budget. Depth alone misses wide queries |
| **Persisted queries** | Clients send a hash of a pre-approved query — ad-hoc queries become impossible |
| **Rate limit by cost, not requests** | One GraphQL request can be 1000× another. See [Chapter ?? — Rate Limiting](#ch-rate-limiting) |

> ✨ **Persisted queries are the strongest answer.** For a first-party app you already know every query at build time, so registering them removes the entire class of hostile-query attacks and shrinks request payloads.

**Disabling introspection is defence in depth, not security.** Your schema is discoverable by guessing field names, and error messages leak type info. Treat it as removing a convenience for attackers, not as protection.

## GraphQL vs REST

| Dimension | GraphQL | REST |
| --------- | ------- | ---- |
| **Fetching** | One request, exact fields | Multiple endpoints, fixed shapes |
| **Versioning** | Add fields, deprecate old ones | New `/v2` path |
| **HTTP caching** | ❌ `POST` to one URL defeats it | ✅ Free, at every layer |
| **Client caching** | ✅ Strong — normalized by type + id | Manual |
| **File upload** | ❌ Awkward — use signed URLs | ✅ Native multipart |
| **Observability** | Harder — one route, many operations | Per-endpoint metrics for free |
| **Client complexity** | Low | High for relational screens |
| **Server complexity** | High | Low |

**Reach for GraphQL when** many different clients need different shapes of the same relational data — mobile plus web plus partner integrations, or a BFF aggregating several services.

**Stay with REST when** the API is simple CRUD, is public, needs CDN caching, or handles file transfer. Plenty of good architectures use REST for service-to-service traffic and GraphQL only at the client edge.

## Interview Questions

**Q1: What is the N+1 problem and how do you fix it?**

GraphQL resolves fields individually, so a list of 100 posts each asking for `author` triggers 100 author lookups after the 1 posts query. DataLoader fixes it by collecting all `.load()` calls in one event-loop tick and issuing a single batched query, then mapping results back to keys in order. Loaders must be created per request — a shared loader is an unbounded cache that leaks data between users.

**Q2: Why does GraphQL return 200 on errors?**

Because a response can be partially successful. Some fields resolve, others fail, and the `errors` array reports the failures alongside the data that worked, with a `path` pointing at each failed field. Apollo can still map an error to a status code via `extensions.http` for things like auth failures.

**Q3: How do you do authorization in GraphQL?**

Authenticate once in the context function and put the caller's identity there. Then authorize on the *type or field*, not the route — a `User` can be reached from many paths, so the check has to live where the data lives. For a real codebase I'd express those rules as schema directives or a policy layer so they're auditable rather than scattered across resolvers.

**Q4: How do you stop a client from crashing your server with one query?**

Layered: a depth limit for recursion, cost analysis for wide queries, and rate limiting by query cost rather than request count. For a first-party client I'd go further and use persisted queries, so only pre-registered operations execute at all.

**Q5: Does GraphQL need versioning?**

Not in the REST sense. You add fields freely, since clients only receive what they asked for, and you mark old ones `@deprecated(reason: "…")`. The hard part is removal: you need per-field usage analytics to know when the last client stopped asking. Breaking changes are still breaking — the schema just gives you tools to make them rare.

**Q6: What are the caching implications?**

You lose HTTP caching almost entirely, because everything is a `POST` to one URL. You gain strong normalized client caching — Apollo Client and Relay dedupe by `__typename` and `id`, so a user fetched in one query updates everywhere. Server-side you add response caching by operation hash plus DataLoader for per-request dedupe. If free CDN caching is the main requirement, that's an argument for REST.

**Q7: How do you handle file uploads?**

Not through GraphQL, in production. The `multipart` upload spec routes bytes through the API server, which blocks resolvers and burns memory. Instead, a mutation returns a pre-signed S3 URL, the client `PUT`s the file directly to storage, then sends the resulting key back in a normal mutation.

**Q8: Subscriptions or polling?**

Subscriptions run over WebSockets (`graphql-ws`) and are right for genuinely live data — chat, presence, collaborative editing. They cost you stateful connections, which complicates scaling and deployment. For "updates within a few seconds", polling or SSE is far cheaper to operate. Same tradeoff as [Chapter ?? — WebSockets](#ch-websockets).

## Summary

**Checklist:**

- [ ] Inputs are `input` types; mutations return the changed object
- [ ] DataLoader for every relationship, created fresh per request
- [ ] Auth on types and fields, not on the route
- [ ] Expected failures modelled in the schema; unexpected ones masked
- [ ] Every list field paginated with a server-enforced max
- [ ] Depth limit plus cost analysis enabled
- [ ] Introspection off in production; persisted queries for first-party clients
- [ ] `express.json` body limit lowered from the default
- [ ] Non-null (`!`) used deliberately — it propagates failure upward
- [ ] Per-operation metrics and slow-resolver tracing in place

**Best practices:**

1. **Design the schema for the product**, not for your tables.
2. **Assume every relationship is an N+1** until a loader proves otherwise.
3. **Budget queries, don't count them** — one request is not one unit of work.
4. **Deprecate, don't version** — then use field-usage data to finish the job.

---

[← REST Best Practices](./01-rest-best-practices.md) | [API Index](./README.md) | [Versioning →](./03-versioning.md)
