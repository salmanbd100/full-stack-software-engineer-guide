---
sourceHash: "4d4c3a2e6f0c8d3564701ea11e2355d475e338fcc4170b9e1a93865494e2714a"
title: "Client State ও Signal"
translatedAt: "2026-10-17T01:40:35.700Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Client State ও Signal {#ch-client-state}

> কোনো state-কে মইয়ের ওপরের ধাপে তুলুন শুধু তখন, যখন কিছু একটা আপনাকে বাধ্য করে। আর যেকোনো store-এর ভেতরে লুকিয়ে থাকা signal graph-টা চিনে নিন।

**এই অধ্যায়ে:** চারটি ধাপ · Context কেন সবকিছু re-render করে · Zustand, Jotai আর Redux · সবার মূলে থাকা primitive হিসেবে signal · signal যা সমাধান করে না

## 💡 মূল ধারণা

Server state আর form state যখন নিজেদের library পেয়ে যায়, তখন বাকি থাকে সামান্যই: একটি theme, একটি খোলা panel,
একটি row।

এই বাকিটুকুর জন্য প্রশ্ন কখনো "কোন library" নয়। প্রশ্ন হলো **এই value-কে কত দূর যেতে হবে?** উত্তরটাই একে চারটি
ধাপের কোনো একটিতে বসায়। প্রথম ধাপের ওপরের প্রতিটি ধাপের দাম আছে: re-render, ঘুরপথ, কিংবা দুটিই। নিচ থেকে শুরু করুন,
আর ওপরে উঠুন শুধু তখন, যখন সত্যিকারের কোনো প্রয়োজন আপনাকে বাধ্য করে।

ভেতরে ভেতরে প্রতিটি store একই তিনটি কাজ করে। একটি value ধরে রাখে, কে সেটা পড়ছে তার হিসাব রাখে, আর write হলে তাদের
খবর দেয়। Signal এই pattern-টাকেই একটি primitive বানিয়ে দেয়।

## কীভাবে কাজ করে

### চারটি ধাপ

| ধাপ | কত দূর পৌঁছায় | খরচ | কখন ব্যবহার করবেন |
| --- | ------------- | --- | ---------------- |
| **`useState`** | একটি component | নেই | Value যেখানে declare করা, সেখানেই ব্যবহার হয় |
| **Parent-এ তুলে দেওয়া** | একটি subtree | Prop drilling | দুটি sibling-এর এটা লাগে, আর parent কাছেই |
| **Context** | একটি subtree, drilling ছাড়া | প্রতিটি consumer re-render হয় | Value কদাচিৎ বদলায় |
| **Store** | যেকোনো জায়গায় | একটি dependency, আর React-এর বাইরের state | ঘন ঘন update, বা সত্যিই global নাগাল |

বেশিরভাগ value কখনো প্রথম ধাপ ছেড়ে বেরোয় না। Interview-এ যা দেখা হয় তা হলো, একটি value কেন তার ধাপে বসে আছে, সেটা
আপনি বলতে পারেন কি না।

### Context পৌঁছে দেয়, ধরে রাখে না

Context prop drilling-এর সমাধান করে। এটা একটি subtree-তে value *পৌঁছে দেয়*। এর কোনো subscription model নেই। তাই
provider-এর value-এর identity বদলালে **প্রতিটি consumer re-render হয়**, এমনকি যেটা বদলায়নি এমন কিছু পড়লেও।

নিয়মটা হলো: **context ভাগ করুন কত ঘন ঘন বদলায় তা দেখে, কী নিয়ে তা দেখে নয়।** Login-এ বদলানো user আর প্রতিটি click-এ
বদলানো sidebar flag আলাদা provider-এ থাকা উচিত। Context মানায় theme, locale বা কোনো client-এর handle-এর জন্য।
ঘন ঘন বদলানো value-এর জন্য মানায় না।

### Zustand: একটি store, selector দিয়ে subscription

Zustand state রাখে React-এর বাইরে। প্রতিটি component একটি slice-এ subscribe করে। যে component `sidebarOpen` select
করে, অন্য field বদলালে সেটা re-render হয় না। Context এটা পারে না।

**Type-সহ একটি Zustand store:**

```typescript
import { create } from 'zustand';

interface UiStore {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
}

// The curried create<T>()(...) form exists to make TypeScript infer the store correctly.
export const useUiStore = create<UiStore>()((set) => ({
  sidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
}));

// Subscribe to one field. This component ignores every other change.
const open = useUiStore((s) => s.sidebarOpen);
```

> ⚠️ **Zustand 5-এ selector-এর output স্থির হতে হবে।** ধরুন একটি selector প্রতিটি call-এ নতুন object return করে,
> যেমন `(s) => ({ a: s.a, b: s.b })`। এতে বারবার re-render হয়, আর "maximum update depth exceeded" throw করতে পারে।
> প্রতিটি call-এ একটি করে value select করুন, অথবা selector-টা `zustand/react/shallow`-এর `useShallow` দিয়ে মুড়ে দিন।

### Jotai আর Redux Toolkit

Jotai কাজ করে উল্টো দিক থেকে। আপনি ছোট ছোট atom declare করেন, তারপর সেগুলো জোড়া লাগান। Derived atom তার dependency
থেকে আবার হিসাব হয়। Component re-render হয় শুধু সেই atom-গুলোর জন্য, যেগুলো component-টা পড়ে।

**Jotai atom হিসেবে derived state:**

```typescript
import { atom, useAtomValue } from 'jotai';

const filterAtom = atom<string>('');
const itemsAtom = atom<Item[]>([]);

// Recomputed when either dependency changes, and cached until then.
const visibleItemsAtom = atom((get) =>
  get(itemsAtom).filter((item) => item.name.includes(get(filterAtom))),
);

const visible = useAtomValue(visibleItemsAtom);
```

Atom মানায় টুকরো টুকরো, অনেক derive করা state-এ: editor, canvas, filter panel। ছোট shared store-এ ততটা মানায় না,
কারণ পুরো জিনিসটার আকার অনেকগুলো file-এ ছড়িয়ে থাকে।

Redux Toolkit এখন আর default নয়। তবু তিনটি ক্ষেত্রে এটাই জেতে: বড় team, যার একটি বাধ্যতামূলক নিয়ম লাগে; action log
replay করে time-travel debugging; আর সত্যিকারের middleware pipeline। এগুলো না থাকলে boilerplate শুধু খরচ, বদলে
কিছুই পাওয়া যায় না।

### Signal: প্রতিটি store-এর নিচের primitive

Zustand tracked read-কে বলে selector, আর সেটা আপনাকে নিজে লিখতে হয়। Jotai container-কে বলে atom, আর read-এর হিসাব
নিজেই রাখে। Svelte 5 একে বলে `$state`, Solid বলে signal, Vue বলে ref। Signal pattern-টাকে স্পষ্ট করে, তিনটি
primitive দিয়ে।

| Primitive | কী রাখে | কখন আবার হিসাব হয় | যার সঙ্গে আপনি আগেই পরিচিত |
| --------- | ------ | ---------------- | ------------------------ |
| **Signal** | লেখা যায় এমন value | কখনো না — আপনি set করেন | `useState`, store-এর field, `$state` |
| **Computed** | Derived value | অলসভাবে, কোনো dependency বদলানোর পরে | `useMemo`, selector, `$derived` |
| **Effect** | কিছুই না | Dependency বদলানোর পরে | `useEffect`, `$effect` |

**কাঠামোটা, কোনো নির্দিষ্ট library ছাড়া:**

```typescript
const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity()); // reading registers a dependency

effect(() => renderTotal(total())); // renders 200

quantity.set(3); // renders 300 — price was not recomputed, and no tree was diffed
```

Runtime dependency খুঁজে পায় computation-টা **চালিয়ে**। কিছুই declare করা নেই, তাই ভুল করে declare করার সুযোগও নেই।

দুটি বৈশিষ্ট্যের কারণে signal library একটি event emitter আর callback-এর একটি `Set`-এর চেয়ে বেশি দামি:

- **Glitch-মুক্ত propagation।** `price` আর `quantity` একসঙ্গে update করলে সাদামাটা emitter নতুন `price`-এর পাশে
  পুরনো `total` দেখাতে পারে। Signal dependency-র ক্রম মেনে হিসাব করে, তাই কেউ সেই আধা-update হওয়া state দেখে না।
  নিজে হাতে বানানো store এখানে ভুল করে, আর সেই bug-গুলো দেখতে race condition-এর মতো।
- **অলস, cache করা derivation।** Computed নিজেকে dirty চিহ্নিত করে, আর পরের read-এ একবারই আবার হিসাব হয়। Derive করা
  সস্তা হয়ে যায়, তাই কেউ derived value-কে সত্যের দ্বিতীয় উৎস হিসেবে store করার লোভ পায় না।

> ⚠️ **যা বদলাতে থাকে:** TC39-এর একটি proposal JavaScript-এই signal যোগ করতে চায়। এটা এখনও শুরুর দিকে, API স্থির
> নয়, আর হয়তো কখনো ship হবে না। Proposal-এর আকার নয়, আপনার framework-এর primitive ব্যবহার করুন। টেকসই ধারণা হলো
> graph-টা: container, tracked read, খবর দেওয়া write, অলস derivation। প্রতিটি implementation-এ এটাই খাটে।

React signal নেয়নি। Concurrent rendering-কে render মাঝপথে ফেলে দিয়ে আবার চালাতে হয়, আর যে subscription ইতিমধ্যে
DOM-এ লিখে ফেলেছে, তাকে আবার চালানো যায় না। তার বদলে React ship করেছে memoise করা একটি compiler।

### Signal যা সমাধান করে না

Signal একটি **client state** primitive। চার ধরনের state-এর মধ্যে এটা একটিকেই সামলায়।

| ধরন | Signal কি কাজে আসে? |
| --- | ----------------- |
| **Client state** | হ্যাঁ — এটা ঠিক এর জন্যই |
| **Form state** | সামান্য। কঠিন অংশগুলো হলো validation-এর সময় আর submission |
| **URL state** | না। URL নিজেই container; signal শুধু তার প্রতিচ্ছবি রাখতে পারে |
| **Server state** | **না।** Staleness policy নেই, deduplication নেই, retry নেই, invalidation নেই |

### কয়েক ধাপের flow মানে একটি state, পাঁচটি boolean নয়

`isLoading`, `isError`, `isSubmitting` আর `isSuccess` থাকা একটি wizard-এর combination ষোলোটি। আসল মাত্র চারটি, কিন্তু
বাকিগুলোতেও পৌঁছানো সম্ভব। তার বদলে একটি status রাখুন, discriminated union হিসেবে:

**একটি status, তাই অসম্ভব combination তৈরিই হতে পারে না:**

```typescript
type Checkout =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'invalid'; message: string } // message exists only here
  | { status: 'success'; orderId: string };
```

যে reducer বর্তমান status দেখে switch করে, সেটা অর্থহীন event উপেক্ষা করে। ফলে `success`-এর পরে দ্বিতীয় একটি
`SUBMIT` কিছুই করে না, আর মনে রাখার মতো কোনো guard clause-ও লাগে না।

## কখন ব্যবহার করবেন

| পরিস্থিতি | যা বেছে নেবেন |
| --------- | ------------ |
| দুটি sibling component-এর shared value | সবচেয়ে কাছের parent-এ তুলে দিন |
| Theme, locale, কোনো client instance | Context |
| কয়েক ডজন derived value-ওয়ালা editor | Atom, বা আপনার framework-এর signal |
| বড় team, যে একটি বাধ্যতামূলক pattern চায় | Redux Toolkit |
| Svelte, Solid বা Vue | Framework-এর signal — ওটাই সেখানে স্বাভাবিক state layer |
| Checkout বা onboarding flow | Discriminated union হিসেবে একটি status |
| API থেকে fetch করা যেকোনো কিছু | এর কোনোটাই নয় — দেখুন [Chapter ?? — TanStack Query দিয়ে Server State](#ch-server-state) |

## সাধারণ ভুল

**❌ Derived value store করা।**
✅ Derive করুন। Store করা total সত্যের দ্বিতীয় একটি উৎস, যা একসময় প্রথমটার সঙ্গে মিলবে না।

**❌ Effect দিয়ে একটি signal আরেকটিতে copy করা।**
✅ এটা আসলে ধীর পথে লেখা derived value, মাঝে এমন একটি সময় থাকে যখন দুটি মেলে না। Computed ব্যবহার করুন। এটা
[Chapter ?? — useEffect, আর কখন এটা ব্যবহার করবেন না](#ch-when-not-to-use-effect)-এর ভুলটাই।

## 🔑 মূল শিক্ষা

- Server, form আর URL state বাদ দিলে যা থাকে, সেটাই client state। সাধারণত তা ছোট, আর সাধারণত local।
- Context value পৌঁছে দেয়, কিন্তু subscription নেই, তাই প্রতিটি বদলে প্রতিটি consumer re-render হয়।
- Zustand subscribe করে selector ধরে, Jotai atom ধরে, আর বড় পরিসরে নিয়ম চাপানোর জন্য Redux তার জায়গা ধরে রাখে।
- প্রতিটি store আসলে একটি আংশিক signal graph: একটি container, একটি tracked read, আর খবর দেওয়া একটি write।
- Signal শুধু client state সমাধান করে। Server-এর data-র এখনও staleness আর invalidation-সহ cache লাগে।

## Interview-এর প্রশ্ন

**Q: কখন state library-র বদলে Context ব্যবহার করবেন?**

এমন value-র জন্য, যা অনেক জায়গায় পড়া হয় কিন্তু কদাচিৎ বদলায়: theme, locale, কোনো client-এর handle। Context-এর
subscription নেই, তাই provider-এর value-এর identity বদলালে প্রতিটি consumer re-render হয়। Login-এ বদলালে এর কোনো
খরচ নেই, প্রতিটি keystroke-এ বদলালে খরচ অনেক।

**Q: React developer যা আগে থেকেই ব্যবহার করেন, সেই ভাষায় signal কী?**

এমন একটি `useState`, যার read-এর হিসাব রাখা হয়; এমন একটি `useMemo`, যে নিজের dependency নিজেই জানে; আর এমন একটি
`useEffect`, যার dependency array-ই নেই, তাই ভুল করারও কিছু নেই। আপনার লেখা কোনো list-এর ওপর ভরসা না করে runtime
read দেখে দেখে graph বানায়।

**Q: Glitch কী, আর এটা কেন গুরুত্বপূর্ণ?**

কোনো consumer এমন একটি value দেখে, যা পুরনো আর নতুন input মিশিয়ে derive করা। এটা হয় যখন দুটি dependency update হয়,
আর খবর দেওয়ার ক্রম dependency-র ক্রম মানে না। Signal library dependency-র ক্রম মেনে হিসাব করে, তাই এটা হতে পারে না।
Emitter আর callback list দিয়ে বানানো store-এ সাধারণত হতে পারে।

**Q: Signal কি TanStack Query-র জায়গা নিয়ে নেয়?**

না। Signal একটি বদল ছড়িয়ে দেয়, ব্যস। Staleness, deduplication, retry, invalidation বা focus-এ refetch নিয়ে এর কোনো
মত নেই। Value যে-ই ধরে রাখুক, server-এর data-র এগুলো সবই লাগে। এজন্যই প্রতিটি signal ecosystem-এর নিজস্ব query
library আছে।

**Q: আপনার team সব client state Redux-এ সরাতে চায়। আপনি কি রাজি হবেন?**

সম্ভবত না। Fetch করা data-র জায়গা query cache-এ, আর বেশিরভাগ value-র জায়গা `useState`-এ। Redux ঠিক তখন, যখন team-এর
একটি নিয়ম, action replay বা middleware pipeline লাগে। এগুলো না থাকলে এটা শুধু boilerplate, বদলে কিছুই পাওয়া যায় না।

## এরপর কী পড়বেন

- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — এই অধ্যায় যে ভাগ ধরে নিয়ে চলে
- [Chapter ?? — Runes Model, Component ও Snippet](#ch-svelte-runes) — framework-এর প্রধান API হিসেবে signal
- [Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) — এই অধ্যায় বারবার যে re-render-এর খরচের কথা বলে
