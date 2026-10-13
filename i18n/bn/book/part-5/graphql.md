---
sourceHash: "c1710a7eadccb51cf9d482decd86ac9f74fd02748a626cadbc921fe991392272"
title: "GraphQL, tRPC ও Typed API বাছাই"
translatedAt: "2026-10-12T12:20:54.491Z"
model: "claude-opus-5-5 (Claude Code)"
---

# GraphQL, tRPC ও Typed API বাছাই {#ch-graphql}

> GraphQL, tRPC আর generated client-সহ REST-এর মধ্যে বাছাই করুন, আর প্রতিটি চালাতে কী খরচ হয়, তা জানুন।

**এই অধ্যায়ে:** contract কোথায় থাকে · GraphQL resolver আর N+1 · একটি public graph-কে সুরক্ষা দেওয়া · tRPC inference আর তার সীমা · সিদ্ধান্তের table

## 💡 মূল ধারণা

প্রতিটি typed API আছে একটিই failure থামাতে: **server বদলেছে, আর client টের পায়নি।** পদ্ধতিগুলোর পার্থক্য হলো, সত্যটা
কোথায় থাকে আর কে সেটা পড়তে পারে।

| পদ্ধতি | সত্যের উৎস | Client-এর type আসে কোথা থেকে | কে call করতে পারে |
| -------- | --------------- | ---------------------- | --------------- |
| REST + OpenAPI | একটি published schema file | Pipeline-এর একটি code generator থেকে | যে কেউ, যেকোনো ভাষায় |
| GraphQL | একটি published schema file | একটি code generator থেকে, প্রতি query-তে | যে কেউ, আর তারা field বেছে নেয় |
| tRPC | Server-এর নিজের TypeScript | Compiler থেকে, সঙ্গে সঙ্গে | একই repository-র TypeScript caller |

GraphQL client-কে একটি request-এই ঠিক যে field-গুলো চায়, সেগুলোর নাম বলতে দেয়। এতে over-fetching শেষ হয়, কিন্তু
server আর একটি request-এর খরচ আন্দাজ করতে পারে না, বা URL দিয়ে সেটা cache করতে পারে না। tRPC-র বাজি হলো, একই
repository-র দুই প্রান্তে TypeScript চললে schema একটি অপ্রয়োজনীয় মাঝের ধাপ।

## কীভাবে কাজ করে

### REST আর একটি generated client

যে API-র caller আপনার নিয়ন্ত্রণে নেই, তার default এটাই। আপনি একটি OpenAPI document publish করেন, প্রায়ই server-এর
validation schema থেকে generate করা, আর প্রতিটি client সেখান থেকে তার type generate করে। খরচ একটি বাড়তি artefact:
generator-কে CI-তে চলতে হবে, আর একটি পুরনো generated file একটি নিঃশব্দ bug। লাভ: একটি Swift app, একজন Java partner
আর আপনার নিজের frontend — সবাই একই contract পড়ে।

### GraphQL schema-ই contract

**একটি cycle আর একটি nullable lookup-সহ একটি schema:**

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

**`!` একটি প্রতিশ্রুতি।** একটি non-null field `null`-এ resolve হলে, তার সবচেয়ে কাছের nullable parent-ও null হয়ে যায়।

### Resolver, N+1 আর DataLoader

একটি resolver প্রতিটি field-এর জন্য একবার চলে, শুধু query সেটা চাইলে, আর তার parent-এর value পায়। তাই
`{ posts(first: 50) { author { name } } }` `Post.author`-কে পঞ্চাশবার call করে: default-ভাবে পঞ্চাশটি query।
`DataLoader` একই tick-এর প্রতিটি `load()` একটি call-এ batch করে, আর প্রতি request-এ cache করে।

**একটি batched loader, প্রতিটি request-এর জন্য নতুন করে বানানো:**

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

> ⚠️ Loader বানান **প্রতি request-এ**, context factory-তে। Module level-এর একটি loader user-দের মধ্যে cache করে, আর
> এক tenant-এর data অন্যজনকে দেয়। GraphQL codebase-এ এটাই সবচেয়ে গুরুতর bug।

Authorisation থাকা উচিত সেই field-এ, যেটা data প্রকাশ করে। `User`-এ পৌঁছানো যায় `Query.user`, `Post.author` আর
আরও অনেক পথে। তাই একটি প্রবেশপথে check করলে বাকিগুলোর কোনোটাই সুরক্ষিত হয় না।

### একটি public GraphQL endpoint-কে সুরক্ষা দেওয়া

একটি public GraphQL endpoint হলো internet-এর জন্য খোলা একটি query interpreter। এর তিনটি নিয়ন্ত্রণ দরকার:

| নিয়ন্ত্রণ | যা থামায় | কীভাবে |
| ------- | ----- | --- |
| **Depth limit** | `{ author { posts { author { posts … } } } }` | মোটামুটি 7 স্তরের বেশি হলে reject করুন |
| **Complexity limit** | দশ লাখ row আনা একটি চওড়া, অগভীর query | প্রতি field-এর খরচ × page size, প্রতি request-এ সীমা বাঁধা |
| **Persisted query** | ইচ্ছেমতো query পুরোপুরি | Client একটি hash পাঠায়; server allowlist রাখে |

Request গোনা প্রায় অর্থহীন, কারণ একটি query আরেকটির চেয়ে হাজার গুণ বেশি খরচের হতে পারে। GraphQL failure-এও HTTP 200
return করে। তাই stack trace লুকান, আর client-দের একটি স্থির `extensions.code` দিন।

### tRPC: একটি router, একটি exported type

**একটি context, একটি auth middleware আর একটি router:**

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

`.input()` একটি declaration থেকেই validation আর input type দেয়। `AppRouter` শুধুই একটি type, তাই client-এ এটা import
করলে কিছুই bundle হয় না।

**Client সেই type প্রয়োগ করে:**

```typescript
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/router"; // type-only import

const client = createTRPCClient<AppRouter>({
  links: [httpBatchLink({ url: "/api/trpc" })],
});

// Autocompleted, and a compile error if `byId` loses its `id` input.
const order = await client.orders.byId.query({ id });
```

`httpBatchLink` একই tick-এ করা call-গুলো একটি HTTP request-এ জুড়ে দেয়। এতে কোনো query language ছাড়াই প্রতি-component
waterfall-এর সমাধান হয়।

> ⚠️ **যা বদলাতে থাকে:** tRPC 11 procedure options object বদলেছে, আর পুরনো `@trpc/react-query`-এর পাশে একটি নতুন
> TanStack Query integration, `@trpc/tanstack-react-query`, যোগ করেছে। টেকসই নীতি হলো, server-এর type-ই contract,
> আর client সেটা শুধু type হিসেবে import করে।

### Type যা যাচাই করে না

Typed contract একটি নাম বদলানো procedure, বদলানো shape বা হারানো field ধরে। এটা একটি অর্থগত পরিবর্তন ধরে না, বা
caller data দেখতে পারবে কি না তা-ও না। সবচেয়ে বড় কথা, client-এর type-এর চেয়ে পুরনো একটি **deploy করা** server এটা
ধরে না। tRPC build-এর সময় আপনার working tree যাচাই করে, তাই client আর server-কে একসাথে deploy করতে হবে। এটা
versioning-কেও প্রভাবিত করে: পুরনো procedure-এর পাশে নতুনটি যোগ করুন, compiler যে call site-গুলোর list দেয় সেগুলো
সরান, তারপর পুরনোটি মুছে দিন। একটি public API-র একটি deprecation window লাগে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বাছাই | কেন |
| --------- | ------ | --- |
| একটি repository, দুই প্রান্তে TypeScript, একসাথে deploy | tRPC | সবচেয়ে কম আনুষ্ঠানিকতায় end-to-end নিশ্চয়তা |
| Public বা partner API, cache করা যায় এমন read | REST + OpenAPI | যে caller-দের আপনি compile করতে পারেন না, তাদের একটি published, versioned schema লাগে |
| Mobile বা যেকোনো non-TypeScript client | REST, বা GraphQL | Inference তাদের কাছে পৌঁছায় না, আর তারা নিজেদের সময়সূচিতে release করে |
| ভিন্ন ভিন্ন data চাহিদার অনেক client, গভীর nesting | GraphQL | Field বাছাই করাটাই আসল চাহিদা |

Client team-এর সংখ্যা server team-এর চেয়ে বেশি হলে GraphQL পোষায়। এক team দুই প্রান্তের মালিক হলে tRPC। বাকি সব
জায়গায় generated client-সহ REST নিরাপদ default।

## সাধারণ ভুল

❌ **সরাসরি database call করা একটি GraphQL resolver।** যেকোনো list field-এর নিচে এটা N+1 হয়ে যায়।
✅ প্রতিটি read প্রতি-request loader-এর মধ্য দিয়ে পাঠান।

❌ **tRPC router-এর type-এর বদলে তার value import করা।** `import { appRouter }` database client-কে browser bundle-এ
টেনে আনে।
✅ সবসময় `import type { AppRouter }`।

❌ **আগেই বানানো আছে বলে tRPC third party-দের কাছে খুলে দেওয়া।** তারা পায় একটি unversioned surface।
✅ বাইরের caller-দের জন্য REST বা GraphQL publish করুন, আর tRPC ভেতরে রাখুন।

## 🔑 মূল শিক্ষা

- প্রতিটি typed API একটি প্রশ্নের উত্তর দেয়: contract কোথায় থাকে, আর প্রতিটি caller কি সেটা পড়তে পারে?
- GraphQL client-কে shape বেছে নিতে দেয়, আর সেই বাছাই থেকেই আসে N+1, খরচ নিয়ন্ত্রণ আর caching-এর সমস্যা।
- DataLoader N+1 ঠিক করে, আর এটা প্রতি request-এ বানাতে হবে, নইলে user-দের মধ্যে data leak করে।
- tRPC-র নিশ্চয়তা build-এর সময় খাটে, আর ধরে নেয় client আর server একসাথে deploy হয়।
- বাইরের বা non-TypeScript caller আছে এমন যেকোনো API-র একটি published schema লাগে, তাই REST বা GraphQL।

## Interview-এর প্রশ্ন

**Q: GraphQL-এ N+1 সমস্যা কী, আর এটা কেন কাঠামোগত?**

প্রতিটি field নিজে নিজে resolve হয়, তাই N-টি parent-এর একটি list child resolver-কে N বার চালায়। এটা কাঠামোগত, কারণ
lazy প্রতি-field resolution-টাই feature। DataLoader একটি tick-এর `load()` call-গুলো জড়ো করে একটি batched query চালায়।
এটা প্রতি request-এ বানান, নইলে এর cache user-দের মধ্যে leak করে।

**Q: একটি GraphQL API-তে কীভাবে rate limit করবেন?**

Request-এর সংখ্যা দিয়ে নয়, কারণ একটি query আরেকটির চেয়ে হাজার গুণ বেশি খরচের হতে পারে। প্রতিটি field-কে একটি খরচ দিন,
page size দিয়ে গুণ করুন, আর caller-এর budget ছাড়ানো query reject করুন। Depth limit recursion সামলায়, আর persisted
query ইচ্ছেমতো query পুরোপুরি সরিয়ে দেয়।

**Q: একটি tRPC API কি production-এ type-safe?**

শুধু build-এর সময়, repository-র type-গুলোর বিপরীতে। Server-এর আগে release হওয়া একটি client পরিষ্কারভাবে compile হয়
আর runtime-এ fail করে। তাই নিশ্চয়তাটা নির্ভর করে দুটি একসাথে deploy করার ওপর।

**Q: একটি mobile app, একটি web app আর দুজন partner-এর আপনার API দরকার। GraphQL, tRPC নাকি REST?**

tRPC নয়: এর inference শুধু server-এর সাথে deploy হওয়া TypeScript caller-দের কাছে পৌঁছায়। OpenAPI-সহ REST
partner-দের জন্য মানানসই, আর ভালোভাবে cache হয়। GraphQL তার চালানোর খরচ পোষায় শুধু তখনই, যখন client-দের খুব আলাদা
field set দরকার। অনেক team partner-দের জন্য REST আর নিজেদের web app-এর জন্য tRPC চালায়।

## এরপর কী পড়বেন

- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — আপনার repository-র বাইরের caller-দের জন্য একটি contract publish আর version করা
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — একটি graph-এর একক কেন request-এর সংখ্যা নয়, খরচ
- [Chapter ?? — Route Handler ও BFF](#ch-route-handlers-and-the-bff) — একটি Next.js app-এর typed backend কোথায় থাকে
