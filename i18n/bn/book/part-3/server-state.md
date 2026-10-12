---
sourceHash: "c0a35ae00d56da264025fdb0228317f83f96ed98358010ac11e443b8c2fa0611"
title: "TanStack Query দিয়ে Server State"
translatedAt: "2026-10-12T07:52:58.335Z"
model: "claude-opus-5-5 (Claude Code)"
---

# TanStack Query দিয়ে Server State {#ch-server-state}

> Fetch করা data-কে একটি স্পষ্ট staleness policy-সহ cache হিসেবে দেখুন, আর নতুন করে assign না করে invalidate করুন।

**এই অধ্যায়ে:** cache-এর ঠিকানা হিসেবে query key · `staleTime` বনাম `gcTime` · invalidation · optimistic update আর rollback · server rendering ছবিটা কোথায় বদলায়

## 💡 মূল ধারণা

একটি query cache হলো একটি **key** থেকে একটি **value আর দুটো ঘড়ি**-র map।

Key হলো data-র ঠিকানা। প্রথম ঘড়ি ঠিক করে value কখন *stale*: এতটা পুরোনো যে পরের যে component এটা চাইবে, সে
একটি background refetch চালু করবে। দ্বিতীয়টি ঠিক করে value কখন *garbage*: এতক্ষণ ব্যবহার হয়নি যে library এটাকে
memory থেকে ফেলে দিতে পারে।

Library বাকি যা করে, সবই এই কাঠামো থেকে আসে: deduplication, retry, window focus-এ refetch, optimistic update।
কাঠামোটা শিখুন, API এমনিতেই বোঝা যাবে। আগে API শিখলে data কেন আবার fetch হলো, সেটা নিয়ে এক বছর বিভ্রান্ত থাকবেন।

> ⚠️ **যা বদলাতে থাকে:** TanStack Query v5, v4-এর এত কিছুর নাম বদলেছে যে search result-গুলো আর মেলে না। `cacheTime`
> এখন `gcTime`, `isLoading` এখন `isPending`, আর key অবশ্যই array হতে হবে। পরের v5 release-গুলো mutation
> callback-এর argument-এর নাম আবার বদলেছে। টেকসই model হলো key, staleness ঘড়ি, garbage ঘড়ি, invalidation। কোনো
> example copy করার আগে, এগুলোসহ, আপনার `package.json`-এ version দেখে নিন।

## কীভাবে কাজ করে

### দুটো ঘড়ি

| | `staleTime` | `gcTime` |
| --- | --- | --- |
| **Default** | `0` — সঙ্গে সঙ্গে stale | 5 মিনিট |
| **যে প্রশ্নের উত্তর দেয়** | Refetch না করে কি এটা দিতে পারি? | এটা কি ভুলে যেতে পারি? |
| **যতক্ষণ বহাল থাকে** | Cache করা data দেওয়া হয়, কোনো request নেই | কোনো subscriber না থাকলেও data রাখা হয় |
| **মেয়াদ শেষ হলে** | পরের mount, focus বা reconnect-এ background refetch | Entry memory থেকে সরানো হয় |

Default `staleTime: 0` মানুষকে অবাক করে। Data আসার মুহূর্তেই stale, তাই একটি component mount করলেই refetch হয়।
এটা ইচ্ছাকৃত: default-এ fresh। প্রতিটি query-তে আপনি এমন একটি সংখ্যা দিয়ে opt out করেন, যেটার পক্ষে যুক্তি দিতে
পারেন।

**Data নিজে কত দ্রুত বদলায়, তা দেখে এটা ঠিক করা:**

```typescript
// A currency rate changes constantly.
useQuery({ queryKey: ['rates'], queryFn: fetchRates, staleTime: 10_000 });

// A country list changes approximately never.
useQuery({ queryKey: ['countries'], queryFn: fetchCountries, staleTime: Infinity });
```

Invalidate করা query-র `staleTime` যা-ই হোক, সেটা stale। তাই লম্বা window কখনো আপনার স্পষ্টভাবে চাওয়া refresh
আটকায় না।

### Query key হলো cache-এর ঠিকানা

Key হলো array, আর library এদের **prefix** দিয়ে মেলায়। এই একটি তথ্যই পুরো invalidation design চালায়।

```typescript
['todos']                              // the list
['todos', { status: 'done', page: 2 }] // one filtered page of it
['todos', todoId]                      // one item
```

`invalidateQueries({ queryKey: ['todos'] })` তিনটিকেই মেলায়, কারণ প্রতিটি `todos` দিয়ে শুরু। Key-গুলো **সাধারণ
থেকে নির্দিষ্ট** ক্রমে সাজান, তাহলে invalidation search-and-replace না হয়ে একটি design সিদ্ধান্ত হয়ে যায়।

Response বদলায় এমন প্রতিটি value key-তে থাকতে হবে। ক্লাসিক bug হলো এমন একটি request-এর key `['todos']`, যেটা
একটি closure থেকে `page` variable পড়ে। Page দুই cache-এ page এক-কে overwrite করে, আর কোনো component-ই জানে না।

**একটি key factory এদের সৎ রাখে:**

```typescript
export const todoKeys = {
  all: ['todos'] as const,
  list: (filters: TodoFilters) => [...todoKeys.all, 'list', filters] as const,
  detail: (id: string) => [...todoKeys.all, 'detail', id] as const,
};
```

`as const` গুরুত্বপূর্ণ। এটা key-গুলোকে literal type দেয়, তাই call site-এ একটি typo হয় type error, নিঃশব্দ cache
miss নয়।

### Mutation, আর কেন assign না করে invalidate করবেন

একটি write-এর পরে cache ভুল। এটা ঠিক করার দুটো উপায় আছে, আর দুটো এক নয়।

**Invalidate:** প্রভাবিত key-গুলোকে stale চিহ্নিত করুন, আর library-কে refetch করতে দিন। Server source of truth
থাকে, তাই derived field, হিসাব করা total আর একই সময়ে অন্য user-দের পরিবর্তন — সব ঠিকঠাক ফিরে আসে।

**সরাসরি লিখুন** `setQueryData` দিয়ে। এটা দ্রুত, কিন্তু সঠিক শুধু তখনই, যখন আপনি server-এর result হুবহু তৈরি
করতে পারেন। Server যে field হিসাব করে (একটি slug, একটি timestamp, একটি total), অন্য কিছু refetch না করা পর্যন্ত
সেটা ভুল থাকে।

**Default-এ invalidate করুন:**

```typescript
const queryClient = useQueryClient();

const { mutate } = useMutation({
  mutationFn: (input: NewTodo) => createTodo(input),
  onSettled: () => queryClient.invalidateQueries({ queryKey: todoKeys.all }),
});
```

`onSuccess` নয়, `onSettled`, যাতে failure-এর পরেও cache মিলিয়ে নেওয়া হয়।

### Optimistic update আর rollback

একটি optimistic update প্রত্যাশিত result সঙ্গে সঙ্গে লিখে দেয়, আর request ব্যর্থ হলে সেটা ফিরিয়ে নেয়। এর তিনটি
ধাপ। যেকোনো একটি বাদ দিলে flicker বা ভুল value পাবেন:

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

`cancelQueries` call-টাই সেই ধাপ, যেটা সবাই ভুলে যায়। এটা ছাড়া, আগে থেকেই চলতে থাকা একটি refetch mutation-এর
আগের data ফেরত দেয়, আর নিঃশব্দে optimistic write-টি উল্টে দেয়।

Optimism রাখুন এমন action-এর জন্য, যেগুলো প্রায় সবসময় সফল হয় আর যেগুলো ফিরিয়ে নেওয়া সস্তা: একটি toggle, একটি
like, একটি reorder। Payment-এর জন্য কখনো নয়।

### Server rendering যেখানে এটা বদলায়

যখন একটি route server-এ fetch করে result নিচে পাঠায়, তখন সেই data-র কোনো client cache-ই লাগে না। যার এখনো লাগে:

| আচরণ | এখনো client cache লাগে? |
| --------- | -------------------------- |
| Server data থেকে একবার render | না |
| Focus-এ refetch, poll, বা subscribe | হ্যাঁ |
| Mutate করে জায়গাতেই update | হ্যাঁ |
| Client-side-এ infinite scroll বা paginate | হ্যাঁ |
| দূরের component-গুলোর মধ্যে একটি fetch share করা | হ্যাঁ |

যে pattern দুটোকে মেলায়: server-এ fetch করুন, সেই result দিয়ে cache hydrate করুন (seed করুন), আর client-কে দায়িত্ব
নিতে দিন। প্রথম paint-এ কোনো request লাগে না, আর এরপর সবকিছু স্বাভাবিকভাবে চলে। Framework-এর দিকটা দেখতে
[Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching) দেখুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Query cache ব্যবহার করবেন? |
| --------- | ------------------ |
| একটি component-এর বাইরে যেকোনো client-side fetching | **হ্যাঁ** |
| কয়েকটি সম্পর্কহীন জায়গায় পড়া data | **হ্যাঁ** — শুধু deduplication-ই এর দাম তুলে দেয় |
| যে mutation সঙ্গে সঙ্গে দেখাতে হবে | **হ্যাঁ** |
| একটি fetch, একটি component, কোনো refetch নেই | না — একটি server component বা একটি effect-ই যথেষ্ট |
| Socket দিয়ে push করা live data | আংশিক — cache-কে store হিসেবে, socket-কে writer হিসেবে ব্যবহার করুন |

## সাধারণ ভুল

**❌ Query key থেকে একটি variable বাদ দেওয়া।**
✅ Request-এর প্রতিটি input key-তে থাকবে। নইলে দুটো আলাদা request একটি cache entry share করে, আর একে অপরকে
overwrite করে।

**❌ Edit করার জন্য query result-কে local state-এ copy করা।**
✅ সেই fork invalidation track করা বন্ধ করে দেয়। Cache করা value রাখুন, আর শুধু pending edit-গুলো আলাদা রাখুন।

**❌ "Request কমাতে" লম্বা `staleTime` set করা, তারপর stale data-কে bug হিসেবে report করা।**
✅ `staleTime` হলো freshness নিয়ে একটি প্রতিশ্রুতি। Data কতটা stale হতে পারে, তা দেখে এটা set করুন, আর যখন জানেন
data বদলেছে, তখন স্পষ্টভাবে invalidate করুন।

**❌ দ্রুত মনে হয় বলে প্রতিটি mutation-এর পরে `setQueryData` ব্যবহার করা।**
✅ আপনি server-এর write logic client-এ নতুন করে লিখছেন। Response হুবহু তৈরি করতে না পারলে invalidate করুন।

**❌ `cancelQueries` ছাড়া optimistic update।**
✅ চলতে থাকা একটি refetch আপনার optimistic write-এর পরে এসে পৌঁছায় আর সেটা উল্টে দেয়। Bug-টি একবার আসে, একবার
যায়, তাই এটা খুঁজে পাওয়া ব্যয়বহুল।

## 🔑 মূল শিক্ষা

- একটি query cache হলো একটি key, একটি staleness ঘড়ি আর একটি garbage ঘড়ি। বাকি সব এখান থেকেই আসে।
- Key হলো prefix দিয়ে মেলানো array, তাই key-এর কাঠামোই invalidation design।
- Request-এর প্রতিটি input তার key-তে থাকতে হবে।
- Mutation-এর পরে default-এ invalidate করুন। Cache-এ সরাসরি লিখুন শুধু তখনই, যখন server-কে হুবহু তৈরি করতে পারেন।
- Optimistic update-এর তিনটি ধাপ লাগে: cancel, snapshot ও write, reconcile। Cancel-টাই মানুষ বাদ দেয়।

## Interview-এর প্রশ্ন

**Q: `staleTime` আর `gcTime`-এর মধ্যে পার্থক্য কী?**

`staleTime` হলো background refetch ছাড়া cache করা data কতক্ষণ দেওয়া যাবে। `gcTime` হলো কিছুই ব্যবহার না করার পরে
একটি entry কতক্ষণ memory-তে থাকে। একটি freshness নিয়ন্ত্রণ করে, অন্যটি memory। এরা স্বাধীন। Data stale হয়েও cache-এ
থাকতে পারে, বা fresh হয়েও collect হওয়ার মুখে থাকতে পারে, কারণ শেষ subscriber unmount হয়ে গেছে।

**Q: একটি বড় application-এ query key আপনি কীভাবে সাজান?**

সাধারণ থেকে নির্দিষ্ট, array-তে, প্রতিটি feature-এর জন্য একটি key factory-র পেছনে। Prefix matching থাকায়
`['todos']` এর নিচের প্রতিটি list আর detail invalidate করে। তাই key-এর কাঠামো দিয়েই আপনি ঠিক করেন একটি mutation কী
refresh করবে। `as const`-সহ factory call site-গুলোকে type-checked রাখে। এতে এমন typo ধরা পড়ে, যেগুলো নইলে নিঃশব্দ
cache miss হতো।

**Q: একটি optimistic update ধাপে ধাপে বুঝিয়ে বলুন।**

প্রভাবিত key-গুলোর চলতে থাকা query cancel করুন, আর বর্তমান data-র snapshot নিন। প্রত্যাশিত result cache-এ লিখুন,
আর snapshot-টি return করুন। Request ব্যর্থ হলে snapshot ফিরিয়ে আনুন। যা-ই হোক, settle হলে invalidate করুন, যাতে
server এটা মিলিয়ে নেয়। আগে cancel করা অপরিহার্য। নইলে আগে থেকে চলতে থাকা একটি refetch optimistic value-কে
overwrite করে।

**Q: Server component যখন data fetch করে, তখনো কি client query cache লাগে?**

প্রথম render-এর জন্য প্রায়ই লাগে না। এরপর client যা কিছু চালায়, তার জন্য এখনো একটি লাগে: focus-এ refetch,
polling, optimistic update-সহ mutation, infinite scroll, বা দূরের component-গুলোর মধ্যে একটি fetch share করা। প্রচলিত
pattern হলো server-এ fetch করা, সেই result দিয়ে cache hydrate করা, আর client-কে দায়িত্ব নিতে দেওয়া।

## এরপর কী পড়বেন

- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — এই category আদৌ কেন আলাদা
- [Chapter ?? — Client State ও Signal](#ch-client-state) — cache server data নিয়ে নেওয়ার পরে যা বাকি থাকে
- [Chapter ?? — Caching](#ch-caching) — একই ধারণা, এক layer নিচে, server-এ
