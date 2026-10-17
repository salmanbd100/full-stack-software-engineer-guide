---
sourceHash: "c1710a7eadccb51cf9d482decd86ac9f74fd02748a626cadbc921fe991392272"
title: "GraphQL, tRPC ও Typed API বাছাই"
translatedAt: "2026-10-17T14:03:37.286Z"
model: "claude-opus-5-5 (Claude Code)"
---

# GraphQL, tRPC ও Typed API বাছাই {#ch-graphql}

> GraphQL, tRPC আর generated client-সহ REST, এর মধ্যে বেছে নিন, আর জানুন প্রতিটি চালাতে কী খরচ।

**এই অধ্যায়ে:** contract কোথায় থাকে · GraphQL resolver আর N+1 · public graph-কে রক্ষা করা · tRPC-র inference আর তার সীমা · সিদ্ধান্তের table

## 💡 মূল ধারণা

প্রতিটি typed API আছে একটিই failure আটকাতে: **server বদলে গেছে, অথচ client টের পায়নি।** পদ্ধতিগুলোর তফাত হলো, সত্যটা
কোথায় থাকে আর কে সেটা পড়তে পারে।

| পদ্ধতি | সত্যের উৎস | Client-এর type কোথা থেকে আসে | কে call করতে পারে |
| -------- | --------------- | ---------------------- | --------------- |
| REST + OpenAPI | Publish করা একটি schema file | Pipeline-এর একটি code generator | যে কেউ, যেকোনো ভাষায় |
| GraphQL | Publish করা একটি schema file | Code generator, প্রতিটি query ধরে | যে কেউ, আর field তাঁরাই বেছে নেন |
| tRPC | Server-এর নিজের TypeScript | Compiler, সঙ্গে সঙ্গে | একই repository-র TypeScript caller |

GraphQL-এ client এক request-এই ঠিক যে field-গুলো চায়, তাদের নাম বলে দিতে পারে। এতে over-fetching শেষ হয়, কিন্তু
server আর আগে থেকে request-এর খরচ আন্দাজ করতে পারে না, URL ধরে cache-ও করতে পারে না। tRPC-র বাজি হলো, একই repository-র
দুই প্রান্তেই TypeScript চললে মাঝখানের schema একটি অপ্রয়োজনীয় ধাপ।

## কীভাবে কাজ করে

### REST আর generated client

যে API-র caller আপনার নিয়ন্ত্রণে নেই, তার জন্য এটাই default। আপনি একটি OpenAPI document publish করেন, যা প্রায়ই
server-এর validation schema থেকে generate হয়, আর প্রতিটি client তা থেকে নিজের type generate করে। খরচ একটি বাড়তি
artefact: generator-কে CI-তে চালাতে হয়, আর পুরনো হয়ে যাওয়া generated file একটি নিঃশব্দ bug। লাভটা হলো, Swift app,
Java-র partner আর আপনার নিজের frontend, সবাই একটিই contract পড়ে।

### GraphQL-এর schema-ই contract

**Cycle আর nullable lookup-সহ একটি schema:**

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

**`!` একটি প্রতিশ্রুতি।** Non-null field `null`-এ resolve হলে সবচেয়ে কাছের nullable parent-টাই null হয়ে যায়।

### Resolver, N+1 আর DataLoader

Resolver প্রতিটি field-এর জন্য একবার চলে, শুধু query সেটা চাইলে, আর parent-এর value হাতে পায়। তাই
`{ posts(first: 50) { author { name } } }` `Post.author`-কে পঞ্চাশবার call করে: default হিসেবে পঞ্চাশটি query।
`DataLoader` একই tick-এর সব `load()` এক call-এ batch করে, আর request-প্রতি cache রাখে।

**Batch করা loader, প্রতিটি request-এর জন্য নতুন করে বানানো:**

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

> ⚠️ Loader বানান **প্রতিটি request-এর জন্য**, context factory-র ভেতরে। Module level-এ রাখা loader user-দের মধ্যে
> cache ভাগ করে, আর এক tenant-এর data আরেক tenant-কে দিয়ে দেয়। GraphQL codebase-এ এর চেয়ে গুরুতর bug নেই।

Authorisation থাকা উচিত সেই field-এ, যা data-টা দেখায়। `User`-এ পৌঁছানো যায় `Query.user`, `Post.author` আর আরও অনেক পথ
দিয়ে। তাই একটি প্রবেশপথে check বসালে বাকিগুলোর কোনোটিই সুরক্ষিত হয় না।

### Public GraphQL endpoint রক্ষা করা

Public GraphQL endpoint মানে internet-এর জন্য খোলা একটি query interpreter। এর তিনটি নিয়ন্ত্রণ লাগে:

| নিয়ন্ত্রণ | যা আটকায় | কীভাবে |
| ------- | ----- | --- |
| **Depth limit** | `{ author { posts { author { posts … } } } }` | মোটামুটি 7 স্তরের বেশি হলে reject করুন |
| **Complexity limit** | চওড়া কিন্তু অগভীর query, যা দশ লাখ row আনে | Field-প্রতি খরচ × page size, request-প্রতি একটি সীমা |
| **Persisted query** | ইচ্ছেমতো query, পুরোপুরি | Client পাঠায় একটি hash, allowlist থাকে server-এর কাছে |

Request গোনা প্রায় অর্থহীন, কারণ একটি query আরেকটির চেয়ে হাজার গুণ বেশি খরচ করাতে পারে। GraphQL failure হলেও HTTP 200
return করে। তাই stack trace লুকিয়ে রাখুন, আর client-দের একটি স্থির `extensions.code` দিন।

### tRPC: একটি router, একটি export করা type

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

`.input()` একটি declaration থেকেই validation আর input type দুটিই দেয়। `AppRouter` শুধুই একটি type, তাই client-এ import
করলে bundle-এ কিছুই যায় না।

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

`httpBatchLink` একই tick-এ হওয়া call-গুলো একটি HTTP request-এ জুড়ে দেয়। এতে কোনো query language ছাড়াই component-প্রতি
waterfall-এর সমস্যা মেটে।

> ⚠️ **যা বদলাতে থাকে:** tRPC 11 procedure-এর options object বদলেছে, আর পুরনো `@trpc/react-query`-এর পাশে নতুন একটি
> TanStack Query integration যোগ করেছে, `@trpc/tanstack-react-query`। টেকসই নীতি হলো, server-এর type-ই contract, আর
> client সেটা শুধু type হিসেবে import করে।

### Type যা যাচাই করে না

Typed contract ধরে ফেলে নাম বদলানো procedure, বদলে যাওয়া shape বা হারানো field। কিন্তু অর্থের বদল ধরে না, caller
data-টা দেখার অধিকারী কি না, তাও ধরে না। সবচেয়ে বড় কথা, client-এর type-এর চেয়ে পুরনো **deploy হওয়া** server ধরে না।
tRPC আপনার working tree যাচাই করে build-এর সময়, তাই client আর server একসঙ্গে deploy করতে হয়। Versioning-ও এতে আকার
পায়: পুরনো procedure-এর পাশে নতুনটা যোগ করুন, compiler যে call site-গুলোর তালিকা দেয় সেগুলো সরান, তারপর পুরনোটা মুছুন।
Public API-র জন্য একটি deprecation window লাগে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --------- | ------ | --- |
| একটি repository, দুই প্রান্তেই TypeScript, একসঙ্গে deploy হয় | tRPC | সবচেয়ে কম আয়োজনে end-to-end নিশ্চয়তা |
| Public বা partner API, cache করা যায় এমন read | REST + OpenAPI | যে caller-দের আপনি compile করতে পারেন না, তাদের publish করা, version করা schema লাগে |
| Mobile, বা TypeScript নয় এমন যেকোনো client | REST, বা GraphQL | Inference তাদের কাছে পৌঁছায় না, আর তারা release করে নিজেদের সময়সূচিতে |
| আলাদা আলাদা data-র দরকার এমন অনেক client, গভীর nesting | GraphQL | Field বেছে নেওয়াটাই এখানে আসল চাহিদা |

Client team-এর সংখ্যা server team-কে ছাড়িয়ে গেলে GraphQL লাভজনক। এক team দুই প্রান্তেরই মালিক হলে tRPC। বাকি সব
জায়গায় generated client-সহ REST নিরাপদ default।

## সাধারণ ভুল

❌ **GraphQL resolver সরাসরি database call করে।** যেকোনো list field-এর নিচে এটা N+1 হয়ে যায়।
✅ প্রতিটি read request-প্রতি loader দিয়ে পাঠান।

❌ **tRPC router-এর type না নিয়ে value import করা।** `import { appRouter }` database client-কে browser bundle-এ টেনে আনে।
✅ সবসময় `import type { AppRouter }`।

❌ **আগেই বানানো আছে বলে tRPC third party-র জন্য খুলে দেওয়া।** তাঁরা পান version ছাড়া একটি surface।
✅ বাইরের caller-দের জন্য REST বা GraphQL publish করুন, আর tRPC ভেতরেই রাখুন।

## 🔑 মূল শিক্ষা

- প্রতিটি typed API একটি প্রশ্নের উত্তর দেয়: contract কোথায় থাকে, আর প্রতিটি caller কি সেটা পড়তে পারে?
- GraphQL-এ shape বেছে নেয় client, আর সেই স্বাধীনতা থেকেই আসে N+1, খরচ নিয়ন্ত্রণ আর caching-এর সমস্যা।
- DataLoader N+1 ঠিক করে, তবে request-প্রতি বানাতে হয়, নইলে user-দের মধ্যে data ফাঁস হয়।
- tRPC-র নিশ্চয়তা build-এর সময় খাটে, আর ধরে নেয় client আর server একসঙ্গে deploy হয়।
- বাইরের বা TypeScript নয় এমন caller থাকলে publish করা schema লাগে, তাই REST বা GraphQL।

## Interview-এর প্রশ্ন

**Q: GraphQL-এ N+1 সমস্যা কী, আর এটা গঠনগত কেন?**

প্রতিটি field নিজে নিজে resolve হয়, তাই N-টি parent-এর তালিকা child resolver-কে N বার চালায়। এটা গঠনগত, কারণ
field-প্রতি lazy resolution-টাই GraphQL-এর feature। DataLoader এক tick-এর `load()` call-গুলো জড়ো করে একটি batch query
চালায়। Request-প্রতি বানাবেন, নইলে এর cache user-দের মধ্যে ফাঁস হয়।

**Q: GraphQL API-তে rate limit কীভাবে করবেন?**

Request গুনে নয়, কারণ একটি query আরেকটির চেয়ে হাজার গুণ বেশি খরচ করাতে পারে। প্রতিটি field-কে একটি খরচ দিন, page size
দিয়ে গুণ করুন, আর caller-এর budget ছাড়ানো query reject করুন। Depth limit recursion সামলায়, আর persisted query ইচ্ছেমতো
query-ই পুরোপুরি বাদ দেয়।

**Q: tRPC API কি production-এ type-safe?**

শুধু build-এর সময়, repository-র type-এর বিপরীতে। Server-এর আগে release হওয়া client ঠিকঠাক compile হয়, কিন্তু runtime-এ
fail করে। তাই নিশ্চয়তাটা নির্ভর করে দুটিকে একসঙ্গে deploy করার ওপর।

**Q: একটি mobile app, একটি web app আর দুটি partner আপনার API চায়। GraphQL, tRPC নাকি REST?**

tRPC নয়: এর inference পৌঁছায় শুধু server-এর সঙ্গে deploy হওয়া TypeScript caller-দের কাছে। OpenAPI-সহ REST partner-দের
জন্য উপযুক্ত, আর ভালো cache হয়। GraphQL চালানোর খরচ সার্থক শুধু তখন, যখন client-দের field-এর চাহিদা একেবারে আলাদা।
অনেক team partner-দের জন্য REST আর নিজেদের web app-এর জন্য tRPC চালায়।

## এরপর কী পড়বেন

- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — repository-র বাইরের caller-দের জন্য contract publish আর version করা
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — graph-এর জন্য একক কেন request-এর সংখ্যা নয়, খরচ
- [Chapter ?? — Route Handler ও BFF](#ch-route-handlers-and-the-bff) — Next.js app-এর typed backend কোথায় থাকে
