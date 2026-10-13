---
sourceHash: "4d4c3a2e6f0c8d3564701ea11e2355d475e338fcc4170b9e1a93865494e2714a"
title: "Client State ও Signal"
translatedAt: "2026-10-12T12:12:02.903Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Client State ও Signal {#ch-client-state}

> State-কে মইয়ের ওপরের ধাপে তুলুন শুধু তখনই, যখন কিছু আপনাকে বাধ্য করে। আর আপনার ব্যবহার করা প্রতিটি store-এর ভেতরের signal graph-টি চিনে নিন।

**এই অধ্যায়ে:** চারটি ধাপ · Context কেন সবকিছু re-render করায় · Zustand, Jotai আর Redux · সবার ভিত্তি হিসেবে signal · signal যা ঠিক করে না

## 💡 মূল ধারণা

Server state আর form state নিজেদের library পেয়ে গেলে, বাকি থাকে সামান্যই: একটি theme, একটি খোলা panel, একটি row।

এই অবশিষ্টাংশের জন্য প্রশ্ন কখনো "কোন library" নয়। প্রশ্ন হলো **এই value-কে কতদূর যেতে হবে?** উত্তরটা একে চারটি
ধাপের একটিতে বসায়। প্রথম ধাপের ওপরের প্রতিটি ধাপের খরচ আছে: re-render, indirection, বা দুটিই। নিচ থেকে শুরু করুন,
আর ওপরে উঠুন শুধু তখন, যখন একটি আসল প্রয়োজন আপনাকে বাধ্য করে।

ভেতরে ভেতরে প্রতিটি store একই তিনটি কাজ করে। একটি value ধরে রাখে, কে সেটা পড়ছে তার হিসাব রাখে, আর write হলে তাদের
জানায়। Signal এই pattern-টিকে একটি primitive বানিয়ে দেয়।

## কীভাবে কাজ করে

### চারটি ধাপ

| ধাপ | নাগাল | খরচ | কখন ব্যবহার করবেন |
| ---- | ----- | ---- | -------- |
| **`useState`** | একটি component | কিছু না | Value যেখানে declare করা, সেখানেই ব্যবহার হয় |
| **Parent-এ তুলে দেওয়া** | একটি subtree | Prop drilling | দুটি sibling-এর এটা দরকার, আর parent কাছেই |
| **Context** | একটি subtree, drilling ছাড়া | প্রতিটি consumer re-render হয় | Value কদাচিৎ বদলায় |
| **একটি store** | যেকোনো জায়গা | একটি dependency, আর React-এর বাইরে state | ঘন ঘন update, বা সত্যিকারের global নাগাল |

বেশিরভাগ value কখনো প্রথম ধাপ ছাড়ে না। Interview-এ যে সংকেত দেখা হয়, সেটা হলো একটি value কেন তার ধাপে বসে আছে,
তা বলতে পারা।

### Context পৌঁছে দেয়, জমা রাখে না

Context prop drilling-এর সমাধান করে। এটা একটি subtree-তে একটি value *পৌঁছে দেয়*। এর কোনো subscription model নেই।
তাই provider-এর value-এর identity বদলালে **প্রতিটি consumer re-render হয়**, এমনকি যদি সে বদলানো কিছুই না পড়ে।

নিয়ম: **context ভাগ করুন কত ঘন ঘন বদলায় তা দেখে, কী নিয়ে তা দেখে নয়।** Login-এ বদলানো একটি user আর প্রতিটি
click-এ বদলানো একটি sidebar flag আলাদা provider-এ থাকা উচিত। Context মানায় একটি theme, একটি locale, বা একটি
client-এর handle-এ। ঘন ঘন বদলানো value-তে মানায় না।

### Zustand: একটি store, selector দিয়ে subscription

Zustand state রাখে React-এর বাইরে। প্রতিটি component একটি slice-এ subscribe করে। যে component
`sidebarOpen` select করে, অন্য কোনো field বদলালে সেটা re-render হয় না। Context এটা পারে না।

**একটি typed Zustand store:**

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

> ⚠️ **Zustand 5-এ selector-এর output স্থির হতে হবে।** ধরুন একটি selector প্রতিটি call-এ একটি নতুন object return
> করে, যেমন `(s) => ({ a: s.a, b: s.b })`। এটা বারবার re-render ঘটায়, আর "maximum update depth exceeded" throw
> করতে পারে। প্রতিটি call-এ একটি value select করুন, বা selector-টিকে `zustand/react/shallow` থেকে `useShallow`
> দিয়ে wrap করুন।

### Jotai আর Redux Toolkit

Jotai কাজ করে উল্টো দিক থেকে। আপনি ছোট ছোট atom declare করেন, আর সেগুলো জোড়া লাগান। Derived atom তার dependency
থেকে আবার হিসাব করে। একটি component শুধু সেই atom-গুলোর জন্য re-render হয়, যেগুলো সে পড়ে।

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

Atom মানায় টুকরো টুকরো, অনেক বেশি derived state-এ: একটি editor, একটি canvas, একটি filter panel। ছোট একটি shared
store-এ এরা কম মানায়, কারণ পুরো জিনিসটার গড়ন বিভিন্ন file-এ ছড়িয়ে থাকে।

Redux Toolkit আর default নয়। তিনটি ক্ষেত্রে এটা এখনো জেতে: এমন একটি বড় team, যার একটি বাধ্যতামূলক নিয়ম দরকার;
action log আবার চালিয়ে time-travel debugging; আর একটি সত্যিকারের middleware pipeline। এগুলো না থাকলে boilerplate
এমন একটি খরচ, যার বিনিময়ে সমান কোনো লাভ নেই।

### Signal: প্রতিটি store-এর নিচের primitive

Zustand track করা read-কে বলে selector, আর আপনি সেটা হাতে লেখেন। Jotai container-টিকে বলে atom, আর read আপনার হয়ে
track করে। Svelte 5 একে বলে `$state`, Solid বলে signal, Vue বলে ref। Signal pattern-টিকে স্পষ্ট করে, তিনটি
primitive দিয়ে।

| Primitive | কী ধরে রাখে | কখন আবার হিসাব করে | আপনি আগে থেকে যা ব্যবহার করেন |
| --------- | ----- | ---------- | ------------------------ |
| **Signal** | একটি writable value | কখনো না — আপনি set করেন | `useState`, একটি store field, `$state` |
| **Computed** | একটি derived value | Lazy-ভাবে, একটি dependency বদলানোর পরে | `useMemo`, একটি selector, `$derived` |
| **Effect** | কিছু না | Dependency বদলানোর পরে | `useEffect`, `$effect` |

**গড়নটা, কোনো একটি library-র ওপর নির্ভর না করে:**

```typescript
const price = signal(100);
const quantity = signal(2);
const total = computed(() => price() * quantity()); // reading registers a dependency

effect(() => renderTotal(total())); // renders 200

quantity.set(3); // renders 300 — price was not recomputed, and no tree was diffed
```

Runtime computation-টি **চালিয়ে** dependency খুঁজে পায়। কিছুই declare করা হয় না, তাই কিছু ভুলভাবে declare হওয়ারও
সুযোগ নেই।

দুটি বৈশিষ্ট্য একটি signal library-কে একটি event emitter আর callback-এর একটি `Set`-এর চেয়ে বেশি মূল্যবান করে:

- **Glitch-মুক্ত propagation।** `price` আর `quantity` একসঙ্গে update করুন, আর একটি সরল emitter নতুন `price`-এর
  সঙ্গে পুরোনো `total` দেখাতে পারে। Signal dependency-র ক্রমে evaluate করে, তাই কেউ সেই আধা-update হওয়া state দেখে
  না। হাতে বানানো store এখানে ভুল করে, আর bug-গুলো দেখতে race condition-এর মতো।
- **Lazy, cache করা derivation।** একটি computed নিজেকে dirty চিহ্নিত করে, আর পরের read-এ একবার আবার হিসাব করে। Derive
  করা সস্তা হয়ে যায়, তাই কেউ একটি derived value-কে সত্যের দ্বিতীয় উৎস হিসেবে জমা রাখতে প্রলুব্ধ হয় না।

> ⚠️ **যা বদলাতে থাকে:** একটি TC39 proposal signal-কে JavaScript-এর ভেতরেই যোগ করতে চায়। এটা এখনো প্রাথমিক পর্যায়ে,
> এর API স্থির নয়, আর এটা হয়তো কখনো ship হবে না। আপনার framework-এর primitive ব্যবহার করুন, প্রস্তাবিত গড়ন নয়।
> যে ধারণা টিকে থাকে, সেটা হলো graph: container, track করা read, জানানো write, lazy derivation। এটা প্রতিটি
> implementation-এ খাটে।

React signal গ্রহণ করেনি। Concurrent rendering-কে render বাতিল করে আবার চালাতে হয়, আর যে subscription আগেই DOM-এ
লিখে ফেলেছে, সেটা আবার চালানো যায় না। React তার বদলে একটি memoising compiler ship করেছে।

### Signal যা সমাধান করে না

Signal একটি **client state** primitive। এটা চার ধরনের state-এর একটি ঢাকে।

| ধরন | Signal কি সাহায্য করে? |
| ---- | ---------------- |
| **Client state** | হ্যাঁ — এরা এটাই |
| **Form state** | সামান্য। কঠিন অংশ হলো validation-এর সময় আর submission |
| **URL state** | না। URL নিজেই container; একটি signal শুধু তার প্রতিফলন হতে পারে |
| **Server state** | **না।** কোনো staleness policy নেই, deduplication নেই, retry নেই, invalidation নেই |

### একাধিক ধাপের flow একটি state, পাঁচটি boolean নয়

`isLoading`, `isError`, `isSubmitting` আর `isSuccess` সহ একটি wizard-এর ষোলোটি combination আছে। আসল মাত্র চারটি,
কিন্তু বাকিগুলোতেও পৌঁছানো যায়। তার বদলে একটি status-কে discriminated union হিসেবে রাখুন:

**একটি status, যাতে অসম্ভব combination থাকতেই না পারে:**

```typescript
type Checkout =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'invalid'; message: string } // message exists only here
  | { status: 'success'; orderId: string };
```

যে reducer বর্তমান status-এর ওপর switch করে, সে অর্থহীন event উপেক্ষা করে। তখন `success`-এর পরে দ্বিতীয় একটি
`SUBMIT` কিছুই করে না, মনে রাখার মতো কোনো guard clause ছাড়াই।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বাছাই |
| --------- | ------ |
| দুটি sibling component যে value share করে | সবচেয়ে কাছের parent-এ তুলে দিন |
| Theme, locale, একটি client instance | Context |
| কয়েক ডজন derived value সহ একটি editor | Atom, বা আপনার framework-এর signal |
| একটি বড় team, যারা একটি বাধ্যতামূলক pattern চায় | Redux Toolkit |
| Svelte, Solid বা Vue | Framework-এর signal — এরাই স্বাভাবিক state layer |
| একটি checkout বা onboarding flow | একটি discriminated-union status |
| API থেকে fetch করা যেকোনো কিছু | এর কোনোটাই নয় — [Chapter ?? — TanStack Query দিয়ে Server State](#ch-server-state) দেখুন |

## সাধারণ ভুল

**❌ Derived value জমা রাখা।**
✅ এগুলো derive করুন। জমা রাখা একটি total সত্যের দ্বিতীয় উৎস, যেটা প্রথমটির সঙ্গে একসময় মিলবে না।

**❌ একটি signal-কে আরেকটিতে copy করতে একটি effect ব্যবহার করা।**
✅ এটা ধীর পথে লেখা একটি derived value, যেখানে একটি সময় থাকে যখন দুটি মেলে না। একটি computed ব্যবহার করুন। এটা
[Chapter ?? — useEffect, আর কখন এটা ব্যবহার করবেন না](#ch-when-not-to-use-effect)-এর একই ভুল।

## 🔑 মূল শিক্ষা

- Server, form আর URL state বাদ দেওয়ার পরে যা থাকে, সেটাই client state। এটা সাধারণত ছোট, আর সাধারণত local।
- Context value পৌঁছে দেয়, কিন্তু এর কোনো subscription নেই, তাই প্রতিটি পরিবর্তনে প্রতিটি consumer re-render হয়।
- Zustand subscribe করে প্রতিটি selector ধরে, Jotai প্রতিটি atom ধরে, আর Redux তার জায়গা পায় বড় পরিসরে নিয়ম বজায় রাখার জন্য।
- প্রতিটি store একটি আংশিক signal graph: একটি container, একটি track করা read, আর একটি write যেটা জানায়।
- Signal শুধু client state-এর সমাধান করে। Server data-র এখনো staleness আর invalidation সহ একটি cache দরকার।

## Interview-এর প্রশ্ন

**Q: কখন আপনি একটি state library-র বদলে Context ব্যবহার করবেন?**

এমন value-এর জন্য, যা অনেক জায়গায় পড়া হয় আর কদাচিৎ বদলায়: একটি theme, একটি locale, একটি client-এর handle।
Context-এর কোনো subscription নেই, তাই provider value-এর identity বদলালে প্রতিটি consumer re-render হয়। Login-এ বদলালে
এর কোনো খরচ নেই। প্রতিটি keystroke-এ বদলালে খরচ অনেক।

**Q: একজন React developer যে শব্দগুলো আগে থেকে ব্যবহার করেন, সেগুলো দিয়ে signal কী?**

একটি `useState`, যার read track হয়; একটি `useMemo`, যে নিজের dependency নিজেই জানে; আর একটি `useEffect`, যার
ভুল করার মতো কোনো dependency array নেই। Runtime read দেখে দেখে graph বানায়, আপনার লেখা একটি list-কে বিশ্বাস না করে।

**Q: Glitch কী, আর এটা কেন গুরুত্বপূর্ণ?**

একজন consumer এমন একটি value দেখে, যা পুরোনো আর নতুন input মিশিয়ে derive করা। এটা ঘটে যখন দুটি dependency update
হয়, আর notification-এর ক্রম dependency-র ক্রম নয়। Signal library dependency-র ক্রমে evaluate করে, তাই এটা ঘটতে
পারে না। একটি emitter আর একটি callback list দিয়ে বানানো store-এ সাধারণত পারে।

**Q: Signal কি TanStack Query-র জায়গা নেয়?**

না। একটি signal একটি পরিবর্তন ছড়িয়ে দেয়। Staleness, deduplication, retry, invalidation বা focus-এ refetch নিয়ে এর
কোনো মত নেই। Value যেটাই ধরে রাখুক, server data-র এগুলো সবই দরকার। এ কারণেই প্রতিটি signal ecosystem-এর নিজস্ব
query library আছে।

**Q: আপনার team সব client state Redux-এ নিতে চায়। আপনি কি নেবেন?**

সম্ভবত না। Fetch করা data-র জায়গা একটি query cache, আর বেশিরভাগ value-এর জায়গা `useState`। Redux ঠিক, যখন team-এর
একটি নিয়ম, action replay বা একটি middleware pipeline দরকার। এগুলো না থাকলে এটা এমন boilerplate, যার বিনিময়ে সমান
কোনো লাভ নেই।

## এরপর কী পড়বেন

- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — যে শ্রেণিবিভাগ এই অধ্যায় ধরে নেয়
- [Chapter ?? — Runes Model, Component ও Snippet](#ch-svelte-runes) — একটি framework-এর প্রধান API হিসেবে signal
- [Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) — এই অধ্যায় যে re-render খরচের কথা বারবার বলে
