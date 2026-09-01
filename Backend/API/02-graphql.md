---
title: GraphQL
part: 5
chapter: 0
slug: graphql
level: advanced
reading_time: 10
updated: 2026-09-01
tags: [api, graphql, dataloader, schema, backend]
in_book: true
---

# GraphQL {#ch-graphql}

> Let the client choose the response shape without handing it a way to take your database down.

**In this chapter:** the schema as contract · the resolver chain · N+1 and DataLoader · auth at the field level · protecting a public endpoint

## 💡 The Core Idea

REST decides the response shape on the server. GraphQL moves that decision to the client: one
endpoint, one request, and the client names exactly the fields it wants. That removes both
over-fetching and the round-trip waterfall a nested REST design forces.

Everything hard about GraphQL follows from the same move. Once the client picks the shape, the
server can no longer predict the cost of a request, cache it by URL, or reason about which rows a
query will touch. You trade the server's control for the client's flexibility, and then you spend
engineering effort buying some of that control back.

## How It Works

### The schema is the contract

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
  posts(first: Int = 10, after: String): PostConnection!
}

type Mutation {
  createPost(input: CreatePostInput!): CreatePostPayload!
}
```

Two conventions carry most of the value:

- **`!` means non-null, and it is a promise you must keep.** If a non-null field resolves to
  `null`, GraphQL nulls the nearest nullable ancestor — so one broken field can blank an entire
  branch of the response. Make a field non-null only when it genuinely cannot be absent.
- **Every mutation takes a single `input` and returns a payload type.** That lets you add fields
  to either side later without a breaking change.

### The resolver chain

A resolver runs per field, and receives the parent's return value.

```typescript
interface Context { userId: string | null; loaders: Loaders }

const resolvers = {
  Query: {
    user: (_: unknown, args: { id: string }, ctx: Context): Promise<User | null> =>
      ctx.loaders.user.load(args.id),
  },
  User: {
    // `parent` is whatever Query.user returned. Fields with no resolver
    // fall back to reading the property of the same name off `parent`.
    posts: (parent: User, args: { first: number }, ctx: Context): Promise<Post[]> =>
      ctx.loaders.postsByAuthor.load({ authorId: parent.id, first: args.first }),
  },
};
```

Resolution is **depth-first and lazy**: a field's resolver runs only if the query asked for it.
That is what makes a recursive schema safe and what makes the next problem inevitable.

### N+1 is the default, not an edge case

`{ posts(first: 50) { author { name } } }` calls `Post.author` fifty times. Fifty queries.

`DataLoader` fixes it by batching every `load()` call made in the same tick into one call, and
memoising within the request.

```typescript
import DataLoader from 'dataloader';

export function createLoaders(db: Db) {
  return {
    user: new DataLoader<string, User | null>(async (ids: readonly string[]) => {
      const rows = await db.users.findMany({ where: { id: { in: [...ids] } } });
      const byId = new Map(rows.map((r) => [r.id, r]));
      // Must return one entry per key, in the same order. Missing → null, never a gap.
      return ids.map((id) => byId.get(id) ?? null);
    }),
  };
}
```

> ⚠️ Create loaders **per request**, in the context factory. A module-level loader caches across
> users, which serves one tenant's data to another — the most serious bug in GraphQL codebases.

## Authentication and Authorisation

There is no route to guard, so authentication happens once when the context is built, and
authorisation happens per field.

```typescript
const server = new ApolloServer<Context>({ schema });

await startStandaloneServer(server, {
  context: async ({ req }): Promise<Context> => ({
    userId: await verifyToken(req.headers.authorization),
    loaders: createLoaders(db), // Fresh per request.
  }),
});
```

```typescript
const resolvers = {
  User: {
    // Field-level check: anyone can read a name, only the owner reads the email.
    email: (parent: User, _: unknown, ctx: Context): string | null =>
      ctx.userId === parent.id ? parent.email : null,
  },
};
```

Put the check in the resolver for the field that exposes the data, not in the top-level query.
The same `User` type is reachable through `Query.user`, `Post.author` and a dozen other paths; a
check on one entry point protects none of the others.

## Protecting the Endpoint

A public GraphQL endpoint is a query interpreter you have exposed to the internet. Four controls,
all of them mandatory:

| Control | Stops | How |
| ------- | ----- | --- |
| **Depth limit** | `{ author { posts { author { posts … } } } }` | Reject beyond ~7 levels |
| **Complexity limit** | A wide, shallow query fetching a million rows | Cost per field × multipliers, capped per request |
| **Persisted queries** | Arbitrary queries entirely | Client sends a hash; server holds the allowlist |
| **Disable introspection in production** | Free schema map for an attacker | Config flag |

Rate limiting by request count is nearly useless here, because one request can cost a thousand
times another. Limit on **computed complexity**, not on requests — see
[Chapter ?? — Rate Limiting](#ch-rate-limiting).

Errors need the same care. GraphQL returns HTTP 200 with an `errors` array, and by default the
array contains stack traces. Mask them and put a stable machine-readable `code` in `extensions`:

Supply a `formatError` hook: log the original, replace an `INTERNAL_SERVER_ERROR` message with a
generic string, and let validation and authentication errors through unchanged. The stable
`extensions.code` is what clients should switch on, never the message text.

## When to Use It

| Scenario | Choose | Why |
| -------- | ------ | --- |
| One or two rich clients, deeply nested data | GraphQL | The waterfall collapses into one request |
| Many unknown public clients, cacheable reads | REST | HTTP caching and universal tooling |
| Mobile client on a slow network | GraphQL | Payload is exactly what the screen needs |
| File upload, binary, or streaming download | REST | GraphQL has no good answer |
| Small internal API, both ends typed | tRPC or REST | GraphQL's machinery is not repaid |

The honest summary: GraphQL removes over-fetching and adds an operational burden — caching,
cost limiting, schema governance. It pays off when client teams outnumber server teams.

## Common Mistakes

**❌ A `Query` field that returns everything.** `allUsers: [User!]!` with no pagination is a table
scan a client can trigger. Use a connection type with `first` and `after`, capped server-side.

**❌ Resolvers that call the database directly.** Every one becomes an N+1 the first time it
appears under a list field. Route all reads through loaders.

**❌ Marking every field non-null.** One failure then nulls a whole branch. Non-null is a promise
about the data, not a style preference.

**❌ Treating HTTP 200 as success.** A GraphQL response can be 200 with `data: null` and an error
array. Clients must check `errors`, and monitoring must too, or failures look like traffic.

## 🔑 Key Takeaways

- The client picking the shape is the benefit and the source of every operational problem.
- Resolution is lazy and per field, so a field's own resolver is the only safe place for its authorisation check.
- N+1 is GraphQL's default behaviour; DataLoader, created per request, is the fix.
- A public endpoint needs depth limits, complexity limits and persisted queries before it needs anything else.
- GraphQL returns 200 on failure — clients and dashboards that read only the status code are blind.

## Interview Questions

**Q: What is the N+1 problem in GraphQL and why is it structural?**

Each field resolves independently, so a list of N parents runs the child resolver N times, once
per parent, with no shared context. It is structural because lazy per-field resolution is the
feature. DataLoader collects the `load()` calls made in one tick, issues a single batched query,
and memoises per request.

**Q: A DataLoader is returning the wrong user's data. What went wrong?**

Almost certainly a loader created once at module scope instead of per request. Its memoisation
cache then spans users, so the second caller gets the first caller's row. Loaders belong in the
per-request context factory, which also gives them the correct request-scoped lifetime.

**Q: How do you rate limit GraphQL?**

Not by request count — one query can be a thousand times more expensive than another. Assign a
static cost to each field, multiply by pagination arguments, and reject any query whose computed
cost exceeds a per-caller budget. Depth limits handle the recursive case, and persisted queries
remove the problem entirely by allowlisting the operations.

## What to Read Next

- [Chapter ?? — REST API Best Practices](#ch-rest-best-practices) — the model GraphQL is reacting against
- [Chapter ?? — API Versioning and Contracts](#ch-versioning) — evolving a schema without a version number
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — why complexity, not request count, is the unit here
