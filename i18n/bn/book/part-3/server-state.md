---
sourceHash: "c0a35ae00d56da264025fdb0228317f83f96ed98358010ac11e443b8c2fa0611"
title: "TanStack Query দিয়ে Server State"
translatedAt: "2026-10-17T01:39:29.277Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TanStack Query দিয়ে Server State {#ch-server-state}

> Fetch করা data-কে স্পষ্ট staleness policy-সহ একটি cache হিসেবে দেখুন। আর নতুন value বসিয়ে না দিয়ে invalidate করুন।

**এই অধ্যায়ে:** cache-এর ঠিকানা হিসেবে query key · `staleTime` বনাম `gcTime` · invalidation · optimistic update আর rollback · server rendering ছবিটা কোথায় বদলে দেয়

## 💡 মূল ধারণা

Query cache হলো একটি map: একটি **key** থেকে একটি **value আর দুটি ঘড়ি**।

Key হলো data-র ঠিকানা। প্রথম ঘড়ি ঠিক করে value কখন *stale*: এতটাই পুরনো যে পরের যে component এটা চাইবে, তার জন্য
background-এ আবার fetch হওয়া উচিত। দ্বিতীয় ঘড়ি ঠিক করে value কখন *garbage*: এতক্ষণ কেউ ব্যবহার করেনি যে library
এটা memory থেকে ফেলে দিতে পারে।

Library-র বাকি সব কাজ এই কাঠামো থেকেই আসে: deduplication, retry, window focus-এ refetch, optimistic update।
কাঠামোটা বুঝলে API এমনিই পরিষ্কার হয়ে যায়। আগে API শিখলে এক বছর ধরে মাথা চুলকাবেন, data কেন আবার fetch হলো।

> ⚠️ **যা বদলাতে থাকে:** TanStack Query v5 v4-এর এত কিছুর নাম বদলেছে যে search result-ই ভুল দিকে নিয়ে যায়।
> `cacheTime` এখন `gcTime`, `isLoading` এখন `isPending`, আর key-কে array হতেই হবে। v5-এর পরের release-গুলো mutation
> callback-এর argument-এর নাম আবার বদলেছে। টেকসই model হলো key, staleness-এর ঘড়ি, garbage-এর ঘড়ি আর invalidation।
> কোনো উদাহরণ copy করার আগে, এগুলো সহ, আপনার `package.json`-এ version দেখে নিন।

## কীভাবে কাজ করে

### দুটি ঘড়ি

| | `staleTime` | `gcTime` |
| --- | --- | --- |
| **Default** | `0` — সঙ্গে সঙ্গেই stale | 5 মিনিট |
| **কোন প্রশ্নের উত্তর দেয়** | আবার fetch না করে কি এটা দেওয়া যায়? | এটা কি ভুলে যাওয়া যায়? |
| **যতক্ষণ বহাল** | Cache-এর data দেওয়া হয়, কোনো request যায় না | কোনো subscriber না থাকলেও data রাখা হয় |
| **মেয়াদ শেষ হলে** | পরের mount, focus বা reconnect-এ background refetch | Entry memory থেকে মুছে যায় |

Default `staleTime: 0` অনেককে অবাক করে। Data পৌঁছানোর মুহূর্তেই stale, তাই component mount হলেই refetch হয়। এটা
ইচ্ছে করেই করা: default-ভাবে টাটকা। প্রতিটি query-তে আলাদা করে এ থেকে বেরোতে পারেন, এমন একটি সংখ্যা দিয়ে যার পক্ষে
যুক্তি দিতে পারবেন।

**Data নিজে কত দ্রুত বদলায়, সেটা দেখে ঠিক করা:**

```typescript
// A currency rate changes constantly.
useQuery({ queryKey: ['rates'], queryFn: fetchRates, staleTime: 10_000 });

// A country list changes approximately never.
useQuery({ queryKey: ['countries'], queryFn: fetchCountries, staleTime: Infinity });
```

Invalidate করা query-র `staleTime` যা-ই হোক, সেটা stale। তাই লম্বা window থাকলেও আপনি নিজে যে refresh চেয়েছেন,
সেটা কখনো আটকায় না।

### Query key-ই cache-এর ঠিকানা

Key হলো array, আর library এদের মেলায় **prefix** দিয়ে। পুরো invalidation-এর design এই একটি তথ্যের ওপর দাঁড়িয়ে।

```typescript
['todos']                              // the list
['todos', { status: 'done', page: 2 }] // one filtered page of it
['todos', todoId]                      // one item
```

`invalidateQueries({ queryKey: ['todos'] })` তিনটির সঙ্গেই মেলে, কারণ প্রতিটি শুরু হয় `todos` দিয়ে। Key সাজান
**সাধারণ থেকে নির্দিষ্টের দিকে**, তাহলে invalidation হয়ে যায় design-এর সিদ্ধান্ত, search-and-replace নয়।

Response বদলায় এমন প্রতিটি value key-তে থাকতে হবে। চিরচেনা bug হলো: request closure থেকে একটি `page` variable
পড়ছে, অথচ key শুধু `['todos']`। Cache-এ page দুই page এক-কে মুছে দেয়, আর কোনো component টেরও পায় না।

**Key factory এদের সৎ রাখে:**

```typescript
export const todoKeys = {
  all: ['todos'] as const,
  list: (filters: TodoFilters) => [...todoKeys.all, 'list', filters] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};
```

`as const` জরুরি। এতে key-গুলো literal type পায়, তাই call site-এ বানান ভুল হলে সেটা type error হয়, চুপচাপ cache
miss নয়।

### Mutation, আর কেন value বসানোর বদলে invalidate করবেন

Write-এর পরে cache ভুল। ঠিক করার দুটি উপায় আছে, আর দুটি এক জিনিস নয়।

**Invalidate:** প্রভাবিত key-গুলোকে stale চিহ্নিত করুন, আর library-কে refetch করতে দিন। সত্যের উৎস server-ই থাকে,
তাই derived field, হিসাব করা total, আর একই সময়ে অন্য user-দের করা বদল, সবই ঠিকঠাক ফিরে আসে।

**সরাসরি লেখা**, `setQueryData` দিয়ে। এটা দ্রুত, কিন্তু ঠিক থাকে শুধু তখন, যখন server-এর result হুবহু বানাতে
পারেন। Server যে field হিসাব করে (slug, timestamp, total), অন্য কিছু refetch না করা পর্যন্ত সেটা ভুলই থাকে।

**Default-ভাবে invalidate করুন:**

```typescript
const queryClient = useQueryClient();

const { mutate } = useMutation({
  mutationFn: (input: NewTodo) => createTodo(input),
  onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
});
```

`onSuccess` নয়, `onSettled`, যাতে failure-এর পরেও cache মিলিয়ে নেওয়া হয়।

### Optimistic update আর rollback

Optimistic update প্রত্যাশিত result সঙ্গে সঙ্গে লিখে দেয়, আর request fail করলে সেটা ফিরিয়ে নেয়। এতে তিনটি ধাপ।
যেকোনো একটি বাদ দিলে হয় flicker দেখবেন, নয়তো ভুল value:

```typescript
useMutation({
  mutationFn: toggleTodo,
  onMutate: async (todoId: string) => {
    // 1. Stop in-flight refetches — one could land after the optimistic write and undo it.
    await queryClient.cancelQueries({ queryKey: todoKeys.all });

    // 2. Snapshot for rollback, then write the expected result.
    const previous = queryClient.getQueryData<Todo[]>(todoKeys.all);
    queryClient.setQueryData<Todo[]>(todoKeys.all, (old = []) =>
      old.map((t) => (t.id === todoId ? { ...t, done: !t.done } : t)),
    );

    return { previous }; // handed to onError as the third argument
  },
  onError: (_error, _todoId, rollback) => {
    queryClient.setQueryData(todoKeys.all, rollback?.previous);
  },
  // 3. Reconcile with the server either way.
  onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
});
```

`cancelQueries` call-ই সেই ধাপ, যেটা সবাই ভুলে যায়। এটা না থাকলে আগে থেকে চলতে থাকা একটি refetch mutation-এর আগের
data নিয়ে ফেরে, আর চুপচাপ optimistic write-টা উল্টে দেয়।

Optimistic update রাখুন এমন কাজের জন্য, যা প্রায় সবসময় সফল হয় আর ফিরিয়ে নেওয়া সস্তা: toggle, like, reorder।
Payment-এর জন্য কখনো নয়।

### Server rendering এখানে কী বদলায়

কোনো route যখন server-এ fetch করে result নিচে পাঠিয়ে দেয়, সেই data-র কোনো client cache-ই লাগে না। যার এখনও লাগে:

| আচরণ | এখনও client cache লাগে? |
| ---- | --------------------- |
| Server-এর data থেকে একবার render | না |
| Focus-এ refetch, poll বা subscribe | হ্যাঁ |
| Mutate করে জায়গায় update | হ্যাঁ |
| Client-এ infinite scroll বা pagination | হ্যাঁ |
| দূরের কয়েকটি component-এ একটি fetch share করা | হ্যাঁ |

দুটি মেলানোর pattern হলো: server-এ fetch করুন, সেই result দিয়ে cache hydrate করুন (মানে আগেভাগে ভরে দিন), তারপর
client-কে দায়িত্ব নিতে দিন। প্রথম paint-এ কোনো request লাগে না, আর তারপর সবকিছু স্বাভাবিকভাবে চলে। Framework-এর দিকটা
দেখুন [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Query cache নেবেন? |
| --------- | ----------------- |
| একটি component-এর বাইরে যেকোনো client-side fetching | **হ্যাঁ** |
| পরস্পর সম্পর্কহীন কয়েকটি জায়গায় পড়া data | **হ্যাঁ** — শুধু deduplication-এই খরচ উঠে আসে |
| এমন mutation, যার ফল সঙ্গে সঙ্গে দেখাতে হবে | **হ্যাঁ** |
| একটি fetch, একটি component, কোনো refetch নেই | না — server component বা একটি effect-ই যথেষ্ট |
| Socket দিয়ে push হওয়া live data | আংশিক — cache-কে store হিসেবে, socket-কে writer হিসেবে ব্যবহার করুন |

## সাধারণ ভুল

**❌ Query key থেকে একটি variable বাদ দেওয়া।**
✅ Request-এর প্রতিটি input key-তে থাকবে। নইলে দুটি আলাদা request একটি cache entry ভাগ করে নেয়, আর একটি আরেকটিকে
মুছে দেয়।

**❌ Edit করার জন্য query result local state-এ copy করা।**
✅ সেই copy আর invalidation-এর খবর রাখে না। Cache-এর value রাখুন, আর আলাদা করে রাখুন শুধু বাকি থাকা edit-গুলো।

**❌ "Request কমাতে" লম্বা `staleTime` বসিয়ে, পরে পুরনো data-কে bug বলে report করা।**
✅ `staleTime` হলো data কতটা টাটকা থাকবে তার প্রতিশ্রুতি। Data কতটা পুরনো হলে চলে তা দেখে এটা ঠিক করুন, আর বদলেছে
জানলে নিজেই invalidate করুন।

**❌ দ্রুত মনে হয় বলে প্রতিটি mutation-এর পরে `setQueryData` ব্যবহার করা।**
✅ এতে আপনি server-এর write logic client-এ আবার লিখছেন। Response হুবহু বানাতে না পারলে invalidate করুন।

**❌ `cancelQueries` ছাড়া optimistic update।**
✅ চলতে থাকা একটি refetch আপনার optimistic write-এর পরে এসে পৌঁছায় আর সেটা উল্টে দেয়। Bug-টা একবার আসে, একবার
যায়, তাই খুঁজে বের করা খুব খরুচে।

## 🔑 মূল শিক্ষা

- Query cache মানে একটি key, staleness-এর একটি ঘড়ি আর garbage-এর একটি ঘড়ি। বাকি সব এখান থেকেই আসে।
- Key হলো array, মেলানো হয় prefix দিয়ে, তাই key-এর কাঠামোই invalidation-এর design।
- Request-এর প্রতিটি input তার key-তে থাকতে হবে।
- Mutation-এর পরে default-ভাবে invalidate করুন। Cache-এ সরাসরি লিখুন শুধু তখন, যখন server-এর result হুবহু বানাতে পারেন।
- Optimistic update-এ তিনটি ধাপ: cancel, snapshot নিয়ে লেখা, তারপর মিলিয়ে নেওয়া। মানুষ বাদ দেয় cancel-এর ধাপটাই।

## Interview-এর প্রশ্ন

**Q: `staleTime` আর `gcTime`-এর পার্থক্য কী?**

`staleTime` হলো background refetch ছাড়া cache-এর data কতক্ষণ দেওয়া যাবে। `gcTime` হলো কেউ ব্যবহার না করার পরে
একটি entry কতক্ষণ memory-তে থাকবে। একটি টাটকা থাকা নিয়ন্ত্রণ করে, অন্যটি memory। দুটি একে অপরের ওপর নির্ভর করে না।
Data stale হয়েও cache-এ থাকতে পারে, আবার টাটকা হয়েও মুছে যাওয়ার মুখে থাকতে পারে, কারণ শেষ subscriber unmount হয়ে
গেছে।

**Q: বড় application-এ query key কীভাবে সাজান?**

সাধারণ থেকে নির্দিষ্টের দিকে, array-তে, প্রতিটি feature-এর জন্য একটি key factory-র পেছনে। Prefix দিয়ে মেলানোর ফলে
`['todos']` তার নিচের প্রতিটি list আর detail invalidate করে। তাই key-এর কাঠামো দিয়েই ঠিক হয় একটি mutation কী কী
refresh করবে। `as const`-সহ factory call site-গুলোকে type-check-এর মধ্যে রাখে। এতে এমন বানান ভুল ধরা পড়ে, যা নইলে
চুপচাপ cache miss হয়ে থাকত।

**Q: একটি optimistic update ধাপে ধাপে বুঝিয়ে বলুন।**

প্রভাবিত key-গুলোর চলতে থাকা query cancel করুন, আর বর্তমান data-র snapshot নিন। প্রত্যাশিত result cache-এ লিখুন,
আর snapshot-টা return করুন। Request fail করলে snapshot ফিরিয়ে আনুন। যা-ই হোক, settle হলে invalidate করুন, যাতে
server মিলিয়ে দেয়। আগে cancel করাটা অপরিহার্য। নইলে আগে থেকে চলতে থাকা একটি refetch optimistic value-টা মুছে দেয়।

**Q: Server component-ই যখন data fetch করছে, তখনও কি client query cache লাগে?**

প্রথম render-এর জন্য প্রায়ই লাগে না। কিন্তু এরপর client যা চালায়, তার জন্য এখনও লাগে: focus-এ refetch, polling,
optimistic update-সহ mutation, infinite scroll, কিংবা দূরের কয়েকটি component-এ একটি fetch share করা। প্রচলিত
pattern হলো server-এ fetch করা, সেই result দিয়ে cache hydrate করা, তারপর client-কে দায়িত্ব নিতে দেওয়া।

## এরপর কী পড়বেন

- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — এই ধরনটা আদৌ আলাদা কেন
- [Chapter ?? — Client State ও Signal](#ch-client-state) — server-এর data cache নিয়ে নেওয়ার পরে যা বাকি থাকে
- [Chapter ?? — Caching](#ch-caching) — একই ধারণা, এক স্তর নিচে, server-এ
