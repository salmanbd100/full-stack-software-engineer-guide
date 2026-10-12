---
sourceHash: "ef4044ed25c5056127acd2965ff0300b22b8f1faa6023dea0cfb0c94d5f90534"
title: "useEffect, আর কখন এটা ব্যবহার করবেন না"
translatedAt: "2026-10-12T12:08:34.493Z"
model: "claude-opus-5-5 (Claude Code)"
---

# useEffect, আর কখন এটা ব্যবহার করবেন না {#ch-when-not-to-use-effect}

> যে চারটি effect কখনো লেখাই উচিত হয়নি, সেগুলো মুছে ফেলুন। আর বাকিগুলো ঠিক কী synchronise করছে, তা স্পষ্ট করে বলুন।

**এই অধ্যায়ে:** যে একটি প্রশ্ন করতে হবে · derived state · state reset করা · ভুল জায়গায় event logic · যে effect-গুলো থেকে যায়

## 💡 মূল ধারণা

একটি effect-এর কাজ হলো React-কে React-এর **বাইরের** কিছুর সাথে synchronise করা: একটি socket, একটি browser API,
একটি third-party widget, document-এর title। React-এর বাইরের কিছু যদি জড়িত না থাকে, তাহলে effect-টি কিছুই
synchronise করছে না। এটা আসলে একটি render, যেটা প্রথম render-কে ঠিক করতে দ্বিতীয়বার চলে।

React code review round-এ এই বিষয়টিই interviewer-কে সবচেয়ে বেশি কিছু জানিয়ে দেয়। অপ্রয়োজনীয় effect style-এর
সমস্যা নয়। প্রতিটি একটি বাড়তি render যোগ করে, একটি paint যেটা user দেখতে পায়, আর একটি dependency array যেটাকে
চিরকাল ঠিক রাখতে হবে।

> প্রতিটি effect-কে একটি প্রশ্ন করুন: **React-এর বাইরের কোন জিনিসের সাথে আমি তাল মিলিয়ে চলছি?** উত্তর যদি হয়
> "এই একই component-এর অন্য কোনো state", তাহলে effect-টি মুছে ফেলুন।

## কীভাবে কাজ করে

### Derived state আসলে state নয়

একটি value যদি props আর state থেকে হিসাব করা যায়, তাহলে render-এর সময়ই হিসাব করুন। এটা store করা মানে দুটো
source of truth রাখা, যেগুলোকে ভবিষ্যতের কোনো edit একে অপরের থেকে আলাদা করে দিতে পারে।

**❌ একটি total হালনাগাদ রাখার জন্য effect:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const [total, setTotal] = useState<number>(0);

useEffect(() => {
  setTotal(items.reduce((sum: number, i: Item) => sum + i.price, 0));
}, [items]);
```

প্রতিটি পরিবর্তনে দুটো render। আর প্রথম render এমন একটি total paint করে, যেটা list-এর সাথে মেলে না।

**✅ হিসাব করে ফেলুন:**

```tsx
const [items, setItems] = useState<Item[]>([]);
const total: number = items.reduce((sum: number, i: Item) => sum + i.price, 0);
```

হিসাবটা যদি সত্যিই ভারী হয় (আগে measure করুন), তাহলে `useMemo`-তে wrap করুন। সেটাও effect নয়। এটা render-এর
ভেতরেই থাকে, তাই value আর list কখনো অমিল হতে পারে না।

### State reset করার জায়গা `key`

**❌ Record বদলালে field খালি করা:**

```tsx
useEffect(() => {
  setDraft("");
  setDirty(false);
}, [contactId]);
```

Browser আগে পুরোনো value paint করে, তারপর effect সেগুলো খালি করে। নতুন প্রতিটি state এই list-এ হাতে যোগ করতে
হয়।

**✅ React-কে একটি নতুন identity দিন, আর তাকে নতুন করে বানাতে দিন:**

```tsx
<EditForm key={contact.id} contact={contact} />
```

একটি render, কোনো flash নেই। আর পরে যোগ করা state-ও নিজে থেকে reset হয়, কারণ পুরো subtree-টাই নতুন।

### Event logic-এর জায়গা event handler

একটি effect বলতে পারে না সে *কেন* চলল। উত্তর যদি হয় "কারণ user কিছু একটা করেছে", তাহলে code-টির জায়গা সেখানে,
যেখানে সেই কাজটি handle করা হয়েছে।

**❌ একটি purchase, যেটা দুবার fire হয়:**

```tsx
useEffect(() => {
  if (submitted) {
    void postOrder(cart);
    showToast("Order placed");
  }
}, [submitted, cart]);
```

Development-এ Strict Mode-এর অধীনে এটা দুবার চলে। Production-এ যেকোনো remount-এ আবার চলে। State-এ একটি
`submitted` flag প্রায় সবসময়ই একটি লক্ষণ: কেউ অকারণে একটি event handler-কে state machine বানিয়ে ফেলেছে।

**✅ যেখানে ঘটেছে, সেখানেই করুন:**

```tsx
async function handleSubmit(): Promise<void> {
  await postOrder(cart);
  showToast("Order placed");
}
```

পরীক্ষাটা হলো: code-টি কি এজন্য চলা উচিত যে screen কিছু দেখাচ্ছে, নাকি এজন্য যে user কিছু করেছে? দেখানো হলো
effect। করা হলো handler।

### বাইরের data-র জায়গা `useSyncExternalStore`

একটি browser API-কে effect দিয়ে state-এ পড়ার দুটো খরচ আছে। প্রথম render ভুল value দেখায়। আর dependency array
বদলালেই subscription আবার subscribe করে।

**❌ Subscribe করুন, তারপর state-এ copy করুন:**

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

**✅ তার বদলে render-এর সময়ই পড়ুন।** আগের অধ্যায়ের `useOnlineStatus` hook-টি `useSyncExternalStore` দিয়ে
পাঁচ line-এ এটা করে। এটা server-কেও render করার জন্য একটি সঠিক value দেয়।

### যে effect-গুলো থেকে যায়

লক্ষ্য effect মুছে ফেলা নয়। লক্ষ্য হলো সেগুলো মুছে ফেলা, যেগুলো কিছুই synchronise করে না।

| Effect                                              | রাখবেন? | কারণ                                    |
| ---------------------------------------------------- | ----- | ------------------------------------------- |
| বর্তমান room-এর জন্য একটি chat socket connect করা        | ✅    | একটি বাইরের connection, যার সত্যিকারের একটি lifetime আছে |
| `document.title` set করা                             | ✅    | Document React-এর বাইরে               |
| একটি map, chart বা editor library initialise করা          | ✅    | একটি third-party instance, যেটা তৈরি আর ধ্বংস করতে হয় |
| Route বদলালে একটি analytics page view পাঠানো       | ✅    | এর কারণ screen, কোনো click নয়        |
| কোনো framework বা library ছাড়া একটি client component-এ data fetch করা | ⚠️ | কাজ করে, কিন্তু আপনি হাতে একটি cache লিখছেন |

শেষ row-টিই সৎ উত্তর। একটি effect fetch করতে পারে, কিন্তু একা সে deduplicate, cache, retry করতে পারে না, back
button-এর পরে টিকেও থাকতে পারে না। Next.js 16 App Router application-এ fetch-এর জায়গা server। Client-heavy
application-এ এর জায়গা একটি query library।

## কখন ব্যবহার করবেন

| Code-টি চলা উচিত…                       | কোথায় রাখবেন            | ভুল হওয়ার লক্ষণ                        |
| ------------------------------------------- | -------------------- | ----------------------------------------- |
| কারণ একটি value হিসাব করা যায়             | Render body      | দুটো state, যাদের মিলে থাকতেই হবে                |
| কারণ user কিছু একটা করেছে              | Event handler    | একটি boolean flag, যেটা একটি effect নজরে রাখে       |
| কারণ অন্য একটি record দেখানো হচ্ছে   | একটি `key` prop         | `setX("")` call-এর একটি list                |
| কারণ component-টি screen-এ আছে          | `useEffect`          | —                                         |
| কারণ data React-এর বাইরে থাকে            | `useSyncExternalStore` | একটি effect, যেটা একটি value state-এ copy করে |

## সাধারণ ভুল

**❌ Effect-এর chain।** একটি effect state set করে, সেটা দ্বিতীয়টিকে trigger করে, সেটা তৃতীয়টিকে। প্রতিটি link
একটি render, ক্রমটা অন্তর্নিহিত, আর একটি cycle মাত্র এক edit দূরে। **✅ যে event handler পুরো ব্যাপারটা শুরু
করেছে, সেখানেই পরের পুরো state হিসাব করুন।**

**❌ Effect দিয়ে parent-কে জানানো:**

```tsx
useEffect(() => { onChange(value); }, [value, onChange]);
```

Parent পরিবর্তনের খবর পায় এক render দেরিতে। **✅ যে handler `setValue` call করে, সেই handler-এই `onChange`
call করুন**, অথবা state-টি ওপরে তুলে দিন, যাতে parent-ই এর মালিক হয়।

**❌ Double-fire-এর দোষ Strict Mode-এর ঘাড়ে চাপানো।** Development-এ React ইচ্ছা করে প্রতিটি component একবার
remount করে, যাতে cleanup ছাড়া effect-গুলো ধরা পড়ে। যে effect এতে ভেঙে যায়, সেটা production-এও ভাঙা, পরের
remount-এ। Check-টি সরিয়ে না দিয়ে cleanup লিখুন।

> ⚠️ খালি dependency array সহ `useEffect` মানে "একবার চলো" নয়। এর মানে "প্রতি mount-এ একবার চলো", আর React একটি
> component আবার mount করতে পারে। যেটা সত্যিই প্রতি application load-এ একবার ঘটতে হবে, তার জায়গা module scope,
> component-এর বাইরে।

## 🔑 মূল শিক্ষা

- একটি effect React-কে React-এর বাইরের কিছুর সাথে synchronise করে। বাইরের কিছু জড়িত না থাকলে, effect-টি মুছে ফেলুন।
- Props আর state থেকে যা হিসাব করা যায়, তা render-এর সময় হিসাব করা উচিত, store করে synchronise করা নয়।
- নতুন record-এ state reset করা একটি `key` পরিবর্তন, effect-এর ভেতরে setter-এর list নয়।
- যে logic user কিছু করেছে বলে চলে, তার জায়গা সেই event handler, যেটা কাজটি handle করেছে।
- খালি dependency array মানে প্রতি mount-এ একবার, প্রতি application load-এ একবার নয়।

## Interview-এর প্রশ্ন

**Q: একটি logic effect-এ যাবে নাকি event handler-এ, সেটা কীভাবে ঠিক করেন?**

জিজ্ঞেস করুন, এটা কেন চলবে। ধরুন এটা চলে কারণ user নির্দিষ্ট কিছু করেছে, যেমন buy-তে click বা একটি form submit।
তাহলে এর জায়গা সেই handler। একটি effect কারণটা দেখতে পায় না, আর যেকোনো remount-এ আবার চলবে। যদি এটা চলে কারণ
component-টি একটি নির্দিষ্ট state-এ screen-এ আছে, আর এটা React-এর বাইরের কিছু ছোঁয়, তাহলে এটা effect।

**Q: একটি filtered list state-এ রেখে effect-এ update করলে সমস্যা কী?**

এটা একটি দ্বিতীয় source of truth তৈরি করে, যেটা প্রথমটির সাথে অমিল হতে পারে। এর খরচ একটি বাড়তি render-ও, যেখানে
screen এমন একটি filtered list দেখায় যেটা data-র সাথে মেলে না। Render-এর সময় হিসাব করলে দুটো কখনো আলাদা হতে পারে
না। Profiling যদি দেখায় filter-টি সত্যিই ভারী, তাহলে `useMemo` এটাকে render-এর ভেতরেই রাখে, পরে নয়।

**Q: Development-এ আপনার effect দুবার fire হয়। এটা কি bug?**

দুবার fire হওয়াটা bug নয়। এটাই check। Strict Mode প্রতিটি component mount, unmount আর আবার mount করে, যাতে যে
effect-গুলোর cleanup নেই বা অসম্পূর্ণ, সেগুলো ধরা পড়ে। এতে যা ভাঙে, তা production-এ ভাঙবে পরের বার যখন React
subtree-টি remount করবে। সমাধান হলো এমন একটি cleanup, যেটা setup-কে পুরোপুরি উল্টে দেয়, অথবা কাজটিকে effect থেকে
পুরোপুরি সরিয়ে নেওয়া।

**Q: `useEffect`-এ fetch করা কখন এখনো সঠিক উত্তর?**

কদাচিৎ, আর সেটা সরাসরি বলে দেওয়াই ভালো। এক-দুটো request সহ ছোট client-only application-এ এটা কাজ করে। কিন্তু
এটা আপনাকে কোনো deduplication, caching, revalidation দেয় না, আর আপনি নিজে যতটুকু লেখেন তার বাইরে কোনো cancellation-ও
দেয় না। Server-rendered framework-এ fetch-এর জায়গা server। Client-heavy application-এ এর জায়গা এমন একটি query
library, যেটা এই চারটি সমস্যা আগেই সমাধান করেছে।

## এরপর কী পড়বেন

- [Chapter ?? — Hook-এর গভীরে](#ch-react-hooks-in-depth) — যে effect-গুলো audit-এ টিকে যায়, সেগুলো লেখা
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — fetch কোথায় সরে যায়
- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) — server data কেন কখনোই client state ছিল না
