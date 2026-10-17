---
sourceHash: "ef4044ed25c5056127acd2965ff0300b22b8f1faa6023dea0cfb0c94d5f90534"
title: "useEffect, আর কখন এটা ব্যবহার করবেন না"
translatedAt: "2026-10-17T01:10:39.017Z"
model: "claude-opus-5-5 (Claude Code)"
---

# useEffect, আর কখন এটা ব্যবহার করবেন না {#ch-when-not-to-use-effect}

> যে চারটি effect কখনো লেখাই উচিত ছিল না, সেগুলো মুছে ফেলুন। আর বাকিগুলো ঠিক কী sync করছে, তা স্পষ্ট করে বলুন।

**এই অধ্যায়ে:** একটিমাত্র প্রশ্ন · derived state · state reset করা · ভুল জায়গায় event-এর logic · যে effect-গুলো থেকে যায়

## 💡 মূল ধারণা

Effect আছে React-কে React-এর **বাইরের** কিছুর সঙ্গে sync করতে: একটি socket, একটি browser API, third-party widget, document-এর title।
React-এর বাইরের কিছু জড়িত না থাকলে effect কিছুই sync করছে না। সেটা আসলে দ্বিতীয়বার চলা একটি render, যা প্রথমটার ভুল সারাতে আসে।

React code review round-এ interviewer এই বিষয় থেকেই সবচেয়ে বেশি বুঝতে পারেন। অপ্রয়োজনীয় effect style-এর সমস্যা নয়। প্রতিটি
effect যোগ করে একটি বাড়তি render, user-এর চোখে পড়ার মতো একটি paint, আর এমন একটি dependency array, যাকে চিরকাল ঠিক রাখতে হবে।

> প্রতিটি effect-কে একটি প্রশ্ন করুন: **React-এর বাইরের কোন জিনিসের সঙ্গে আমি মিলিয়ে রাখছি?** উত্তর যদি হয় "এই একই component-এর
> অন্য কোনো state", effect-টা মুছে দিন।

## কীভাবে কাজ করে

### Derived state আসলে state নয়

কোনো value props আর state থেকে হিসাব করে বের করা গেলে render-এর সময়েই হিসাব করুন। জমা রাখলে সত্যের দুটি উৎস থাকে, আর ভবিষ্যতের
কোনো edit দুটিকে আলাদা করে দিতে পারে।

**❌ Total হালনাগাদ রাখতে একটি effect:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState<number>(0);

useEffect(() => {
  setTotal(items.reduce((sum: number, i: Item) => sum + i.price, 0));
}, [items]);
```

প্রতিটি বদলে দুটি render, আর প্রথমটা এমন total আঁকে, যা list-এর সঙ্গে মেলে না।

**✅ হিসাব করে নিন:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const total: number = items.reduce((sum: number, i: Item) => sum + i.price, 0);
```

হিসাবটা সত্যিই দামি হলে (আগে মেপে দেখুন) `useMemo` দিয়ে মুড়ে দিন। সেটাও effect নয়। এটা render-এর ভেতরেই থাকে, তাই value আর
list কখনো অমিল হতে পারে না।

### State reset করা `key`-এর কাজ

**❌ Record বদলালে field খালি করা:**

```tsx
useEffect(() => {
  setDraft("");
  setDirty(false);
}, [contactId]);
```

Browser আগে পুরনো value আঁকে, তারপর effect সেগুলো মোছে। আর নতুন প্রতিটি state হাতে করে এই তালিকায় যোগ করতে হয়।

**✅ React-কে নতুন একটি পরিচয় দিন, আর তাকেই আবার বানাতে দিন:**

```tsx
<EditForm key={contact.id} contact={contact} />
```

একটি render, কোনো ঝলক নেই। আর পরে যোগ করা state-ও নিজে থেকেই reset হয়, কারণ পুরো subtree-টাই নতুন।

### Event-এর logic-এর জায়গা event handler

Effect জানতে পারে না, সেটা *কেন* চলল। উত্তর যদি হয় "কারণ user কিছু করেছেন", তাহলে code-এর জায়গা সেখানে, যেখানে সেই কাজটা সামলানো
হয়েছিল।

**❌ যে purchase দুবার চলে:**

```tsx
useEffect(() => {
  if (submitted) {
    void postOrder(cart);
    showToast("Order placed");
  }
}, [submitted, cart]);
```

Development-এ Strict Mode-এর অধীনে এটা দুবার চলে। Production-এ যেকোনো remount-এ আবার চলে। State-এ একটি `submitted` flag প্রায়
সবসময়ই লক্ষণ যে কেউ অকারণে একটি event handler-কে state machine বানিয়ে ফেলেছেন।

**✅ যেখানে ঘটেছে, সেখানেই করুন:**

```tsx
async function handleSubmit(): Promise<void> {
  await postOrder(cart);
  showToast("Order placed");
}
```

যাচাইটা হলো, code চলবে কি screen কিছু দেখাচ্ছে বলে, নাকি user কিছু করেছেন বলে। দেখানো মানে effect। করা মানে handler।

### বাইরের data-র জায়গা `useSyncExternalStore`

Effect দিয়ে browser API-র value state-এ পড়ে আনার খরচ দুটি। প্রথম render ভুল value দেখায়। আর dependency array বদলালেই subscription
নতুন করে subscribe করে।

**❌ Subscribe করে state-এ copy রাখা:**

```tsx
const [isOnline, setIsOnline] = useState<boolean>(true);

useEffect(() => {
  const update = (): void => setIsOnline(navigator.onLine);
  window.addEventListener("online", update);
  window.addEventListener("offline", update);
  return () => {
    window.removeEventListener("online", update);
    window.removeEventListener("offline", update);
  };
}, []);
```

**✅ তার বদলে render-এর সময়েই পড়ুন।** আগের অধ্যায়ের `useOnlineStatus` hook `useSyncExternalStore` দিয়ে পাঁচ line-এ এটাই করে। এতে
server-ও render করার জন্য সঠিক একটি value পায়।

### যে effect-গুলো থেকে যায়

লক্ষ্য effect মুছে ফেলা নয়। লক্ষ্য হলো সেগুলো মোছা, যা কিছুই sync করে না।

| Effect | রাখবেন? | কারণ |
| ------ | ------- | ---- |
| বর্তমান room-এর জন্য chat socket connect করা | ✅ | বাইরের একটি connection, যার সত্যিকারের আয়ুষ্কাল আছে |
| `document.title` বসানো | ✅ | Document React-এর বাইরে |
| Map, chart বা editor library চালু করা | ✅ | Third-party একটি instance, যা বানাতে আর ভাঙতে হয় |
| Route বদলালে analytics-এ page view পাঠানো | ✅ | এর কারণ screen, কোনো click নয় |
| Framework বা library ছাড়া client component-এ data fetch করা | ⚠️ | কাজ করে, তবে আপনি হাতে একটি cache লিখছেন |

শেষ row-টাই সৎ। Effect fetch করতে পারে, কিন্তু একা দুটি একই request এক করতে পারে না, cache করতে পারে না, আবার চেষ্টা করতে পারে না,
back button-ও সামলাতে পারে না। Next.js 16 App Router application-এ fetch-এর জায়গা server-এ। Client-heavy application-এ এর জায়গা
একটি query library-তে।

## কখন ব্যবহার করবেন

| Code চলা উচিত… | কোথায় রাখবেন | ভুল হওয়ার লক্ষণ |
| ------------- | ------------ | -------------- |
| কারণ একটি value হিসাব করে বের করা যায় | Render-এর body-তে | দুটি state, যাদের মিলে থাকতে হবে |
| কারণ user কিছু করেছেন | Event handler-এ | একটি boolean flag, যার ওপর একটি effect নজর রাখে |
| কারণ আলাদা একটি record দেখানো হচ্ছে | একটি `key` prop-এ | একসারি `setX("")` call |
| কারণ component screen-এ আছে | `useEffect`-এ | — |
| কারণ data React-এর বাইরে থাকে | `useSyncExternalStore`-এ | এমন effect, যা একটি value state-এ copy করে |

## সাধারণ ভুল

**❌ Effect-এর শিকল।** একটি effect state বসায়, তাতে দ্বিতীয়টা চলে, তাতে তৃতীয়টা। প্রতিটি কড়া একটি render, ক্রমটা কোথাও লেখা নেই,
আর একটি edit করলেই চক্র তৈরি হতে পারে। **✅ যে event handler শুরুটা করেছে, সেখানেই পরের পুরো state হিসাব করে নিন।**

**❌ Effect দিয়ে parent-কে জানানো:**

```tsx
useEffect(() => { onChange(value); }, [value, onChange]);
```

Parent বদলটা জানতে পারে এক render পরে। **✅ যে handler `setValue` call করে, সেখানেই `onChange` call করুন**, অথবা state ওপরে তুলে দিন,
যাতে parent-ই তার মালিক হয়।

**❌ দুবার চলার দোষ Strict Mode-এর ঘাড়ে চাপানো।** Development-এ React ইচ্ছে করে প্রতিটি component একবার remount করে, যাতে cleanup
ছাড়া effect ধরা পড়ে। এতে যে effect ভাঙে, সেটা production-এও ভাঙা, পরের remount-এই। Check সরিয়ে না দিয়ে cleanup লিখুন।

> ⚠️ ফাঁকা dependency array-সহ `useEffect` মানে "একবার চালাও" নয়। মানে "প্রতিটি mount-এ একবার", আর React একটি component আবার mount
> করতে পারে। Application load হলে যা সত্যিই একবারই হতে হবে, তার জায়গা component-এর বাইরে, module scope-এ।

## 🔑 মূল শিক্ষা

- Effect React-কে React-এর বাইরের কিছুর সঙ্গে sync করে; বাইরের কিছু জড়িত না থাকলে মুছে দিন।
- Props আর state থেকে যা হিসাব করা যায়, তা জমা রেখে sync না করে render-এর সময়েই হিসাব করুন।
- নতুন record-এ state reset করা মানে `key` বদলানো, effect-এর ভেতরে একসারি setter নয়।
- User কিছু করেছেন বলে যে logic চলে, তার জায়গা যে event handler সেটা সামলেছে, সেখানে।
- ফাঁকা dependency array মানে প্রতিটি mount-এ একবার, application load-এ একবার নয়।

## Interview-এর প্রশ্ন

**Q: কোনো logic effect-এ যাবে নাকি event handler-এ, কীভাবে ঠিক করবেন?**

জিজ্ঞেস করুন এটা কেন চলবে। ধরুন এটা চলে কারণ user নির্দিষ্ট কিছু করেছেন, যেমন buy-তে click বা form submit। তাহলে এর জায়গা সেই
handler-এ। Effect কারণটা দেখতে পায় না, আর যেকোনো remount-এ আবার চলবে। আর যদি এটা চলে কারণ component একটি নির্দিষ্ট state-এ screen-এ
আছে, আর এটা React-এর বাইরের কিছুতে হাত দেয়, তাহলে এটা effect।

**Q: Filter করা list state-এ রেখে effect দিয়ে update করায় সমস্যা কী?**

এতে সত্যের দ্বিতীয় একটি উৎস তৈরি হয়, যা প্রথমটার সঙ্গে না মিলতে পারে। একটি বাড়তি render-ও খরচ হয়, যেখানে screen এমন filter করা
list দেখায় যা data-র সঙ্গে মেলে না। Render-এর সময় হিসাব করলে দুটি কখনো আলাদা হতে পারে না। Profile করে যদি দেখা যায় filter সত্যিই
দামি, `useMemo` সেটাকে render-এর পরে নয়, ভেতরেই রাখে।

**Q: Development-এ আপনার effect দুবার চলে। এটা কি bug?**

দুবার চলাটা bug নয়। এটাই যাচাই। Strict Mode প্রতিটি component mount, unmount আর আবার mount করে, যাতে যেসব effect-এর cleanup নেই বা
অসম্পূর্ণ, সেগুলো ধরা পড়ে। এতে যা ভাঙে, React পরেরবার subtree remount করলেই সেটা production-এও ভাঙবে। সমাধান হলো এমন cleanup, যা setup
পুরোপুরি উল্টে দেয়, অথবা কাজটাকেই effect থেকে বের করে আনা।

**Q: কখন `useEffect`-এ fetch করা এখনো ঠিক উত্তর?**

কালেভদ্রে, আর সেটা সোজাসুজি বলে দেওয়াই ভালো। এক-দুটি request-ওয়ালা ছোট, শুধু client-এর application-এ এটা চলে। কিন্তু আপনি নিজে
যা লিখবেন তার বাইরে এতে কোনো deduplication নেই, caching নেই, revalidation নেই, cancellation-ও নেই। Server-rendered framework-এ fetch-এর
জায়গা server-এ। Client-heavy application-এ এর জায়গা এমন একটি query library-তে, যা এই চারটি সমস্যা আগেই মিটিয়ে রেখেছে।

## এরপর কী পড়বেন

- [Chapter ?? — Hook-এর গভীরে](#ch-react-hooks-in-depth) — যে effect-গুলো audit-এ টিকে যায়, সেগুলো লেখা
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — fetch যেখানে সরে যায়
- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — server-এর data কেন কখনোই client state ছিল না
