---
sourceHash: "ed34bcd11b78073850f497a11908f6e6db1740095f3b8977d80bbc812a1911ae"
title: "Web Worker ও Main Thread"
translatedAt: "2026-10-12T12:11:04.230Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Web Worker ও Main Thread {#ch-web-workers}

> যে কাজ input আটকে দেয়, সেটাকে input সামলানো thread থেকে সরিয়ে দিন, আর জানুন সীমানা পেরিয়ে data পাঠাতে কত খরচ হয়।

**এই অধ্যায়ে:** আসলে কী block করে · worker model · structured clone আর transferable · Comlink · কখন worker ভুল উত্তর · INP-এর সঙ্গে সম্পর্ক

## 💡 মূল ধারণা

Main thread তিনটি কাজ করে: আপনার JavaScript চালায়, layout আর paint হিসাব করে, আর input-এ সাড়া দেয়।
এটা কাজগুলো করে একটি একটি করে। যে function 300 millisecond চলে, সেটা 300 millisecond ধরে সবকিছু block করে।
একটি tap কিছুই করে না, একটি animation একটি frame আটকে রাখে, আর page ভাঙা মনে হয়। আসলেই ভাঙা।

একটি worker হলো দ্বিতীয় একটি thread, যার নিজস্ব JavaScript engine আছে আর DOM-এ কোনো access নেই। আপনি তাকে একটি
message পাঠান, সে কাজটা করে, আর একটি result ফেরত পাঠায়। Main thread তখন সেই দুটি কাজের জন্য খালি থাকে, যা শুধু
সে-ই করতে পারে: rendering, আর user-কে সাড়া দেওয়া।

> Worker কোনো কিছুকে দ্রুততর করে না। এটা দামি কাজটাকে এমন জায়গায় ঘটায়, যেখানে কেউ অপেক্ষা করছে না।

## কীভাবে কাজ করে

একটি worker হলো আলাদা global scope-সহ একটি আলাদা script। আপনি যা পাঠান, তা ছাড়া কিছুই ভাগ করা হয় না।

**একটি worker চালু করা আর তার সঙ্গে কথা বলা:**

```typescript
// The module worker form — `type: "module"` allows `import` inside the worker.
const worker = new Worker(new URL("./parse.worker.ts", import.meta.url), { type: "module" });

worker.postMessage({ csv: rawText });

worker.onmessage = (event: MessageEvent<{ rows: number }>) => {
  render(event.data.rows);
};
```

```typescript
// parse.worker.ts — no `window`, no `document`, no DOM.
self.onmessage = (event: MessageEvent<{ csv: string }>) => {
  const rows: number = parseCsv(event.data.csv); // Takes 400ms. Nobody is blocked by it.
  self.postMessage({ rows });
};
```

### সীমানা পেরোনোর খরচ

Message ভাগ করা হয় না, copy করা হয়, **structured clone algorithm** দিয়ে (message-এর জন্য browser-এর deep copy)।
সেই copy দুই দিকেই সত্যিকারের কাজ, আর এটা ঘটে main thread-এ। তাই একটি worker-কে 50 MB-এর একটি array পাঠানোর
খরচ, যে হিসাবটা আপনি সরিয়েছেন তার চেয়েও বেশি হতে পারে।

| Mechanism | খরচ | কখন ব্যবহার করবেন |
| --------- | ---- | -------- |
| `postMessage(object)` | পুরো structured clone, দুই দিকেই | ছোট message — parameter আর result |
| Transferable (`ArrayBuffer`, `ImageBitmap`) | প্রায় শূন্য; ownership সরে যায় | বড় binary payload |
| `SharedArrayBuffer` | শূন্য copy, সত্যিকারের shared memory | ভারী সংখ্যাভিত্তিক কাজ, আর শুধু সঠিক COOP/COEP header থাকলে |

**Copy না করে transfer করা:**

```typescript
// The second argument lists what to transfer. `buffer` is unusable here afterwards.
worker.postMessage({ buffer }, [buffer]);
```

Structured clone বেশিরভাগ জিনিস সামলায়: object, array, `Map`, `Set`, `Date`, `ArrayBuffer`, এমনকি cyclic
reference-ও। এটা function, class identity বা DOM node সামলাতে পারে না। একটি class instance পৌঁছায় একটি plain
object হিসেবে, method-গুলো ছাড়া। মানুষ প্রথমে এই ব্যর্থতাতেই পড়ে।

### সহনীয় করে তোলা

Raw `postMessage` একটি function call-কে একটি protocol-এ পরিণত করে: একটি id, একটি message type, একটি listener, আর
pending promise-গুলোর একটি map। Comlink এটাকে একটি proxy-তে মুড়ে দেয়, তাই worker-কে একটি async module-এর মতো দেখায়।

```typescript
import * as Comlink from "comlink";

// The worker's exported API, callable as if it were local.
const api = Comlink.wrap<{ parseCsv(csv: string): number }>(
  new Worker(new URL("./parse.worker.ts", import.meta.url), { type: "module" }),
);

const rows: number = await api.parseCsv(rawText);
```

## কখন ব্যবহার করবেন

পরীক্ষাটা "এটা কি ধীর" নয়, বরং **"এটা কি একটি frame block করে, আর এটা কি DOM ছাড়া চলতে পারে"**।

| কাজ | Worker? | কেন |
| ---- | ------- | --- |
| একটি বড় CSV, JSON বা log file parse করা | ✅ | একটি string-এর ওপর শুধু হিসাব, DOM নেই |
| Image resize, canvas filter, video frame | ✅ | Transferable payload, সত্যিই দামি |
| Search indexing, fuzzy matching, diffing | ✅ | CPU-bound আর interrupt করা যায় |
| Cryptography, compression, WASM workload | ✅ | ক্লাসিক উদাহরণ |
| Data fetch করা | ❌ | `fetch` আগে থেকেই main thread-এর বাইরে; শুধু parsing আপনার দায় |
| DOM ছোঁয় এমন যেকোনো কিছু | ❌ | Worker-এ কোনো DOM নেই |
| ~5ms-এর কম কাজ | ❌ | Message-এর আসা-যাওয়ার খরচ কাজের চেয়ে বেশি |

### INP-এর সঙ্গে সম্পর্ক

INP (Interaction to Next Paint) একটি interaction আর পরের frame-এর মধ্যে সবচেয়ে খারাপ দেরিটা মাপে।
Long task-ই প্রধান কারণ। দুটি fix আসলে একই fix, ভিন্ন মাপে: **yield করুন**, অথবা **সরিয়ে দিন**।
`scheduler.yield()` দিয়ে একটি task ভাগ করলে browser টুকরোগুলোর মাঝে input সামলাতে পারে।
Worker-এ সরালে এটা main thread থেকে পুরোপুরি চলে যায়। কাজ যখন এত বড় যে yield করতে কয়েক ডজন টুকরো লাগবে, তখন
worker ব্যবহার করুন।

> ⚠️ **Worker বিনা খরচের নয়।** প্রতিটি একটি সত্যিকারের thread, নিজস্ব heap-সহ, কিছু করার আগেই কয়েক megabyte।
> প্রতি ধরনের কাজের জন্য একটি তৈরি করুন আর রেখে দিন, অথবা একটি ছোট pool ব্যবহার করুন। প্রতিটি call-এর জন্য
> একটি তৈরি করবেন না।

## সাধারণ ভুল

**❌ এমন কাজ সরানো, যেটা কখনো সমস্যাই ছিল না।** আগে profile করুন। বেশিরভাগ "ধীর" page ধীর rendering, layout
thrash বা একটি 2 MB bundle-এর কারণে, আর worker এর কোনোটাতেই সাহায্য করে না। Trace আপনাকে বলে দেয় long task-টি
আপনার function, নাকি browser-এর layout।

**❌ পুরো object graph পাঠানো।** Worker-এর যা দরকার তা পাঠান, আর caller-এর যা দরকার তা ফেরত দিন।
এমন একটি worker কল্পনা করুন, যেটা পুরো application state পায় আর একটি পুরো copy ফেরত দেয়। এটা main thread-এ দুবার
clone-এর খরচ দেয়, ঠিক সেই thread-এ যেটাকে আপনি রক্ষা করতে চাইছিলেন।

**❌ Class instance টিকে থাকবে বলে আশা করা।** Structured clone data copy করে, prototype নয়। Plain object পাঠান, আর
method দরকার হলে অন্য দিকে আবার object-এ রূপ দিন।

**❌ `terminate()` ভুলে যাওয়া।** একটি worker বেঁচে থাকে যতক্ষণ না তাকে terminate করা হয় বা page unload হয়। যে
component প্রতিটি mount-এ একটি worker তৈরি করে আর কখনো terminate করে না, সে প্রতিবার একটি thread leak করে।

**❌ ধরে নেওয়া যে `SharedArrayBuffer` পাওয়া যাবে।** এর জন্য cross-origin isolation লাগে, যেটা `COOP`
আর `COEP` header দিয়ে চালু হয়। এগুলো চালু করলে third-party embed আর analytics ভেঙে যেতে পারে। এটা code-এর
সিদ্ধান্ত নয়, deployment-এর সিদ্ধান্ত।

## 🔑 মূল শিক্ষা

- Main thread আপনার JavaScript চালায়, layout আর paint করে, আর input সামলায়, একটি একটি করে। তাই একটি লম্বা
  function মানে একটি জমে যাওয়া interface।
- Worker-এর কোনো DOM নেই, তাই এটা শুধু হিসাবের কাজের জন্য উপযুক্ত: parsing, indexing, image আর crypto-র কাজ।
- Message structured-clone করা হয়, যেটা main thread-এ সত্যিকারের সময় খরচ করে। বড় payload-এর জন্য
  `ArrayBuffer` copy না করে transfer করুন।
- সীমানা পেরোনোর সময় class instance তার prototype হারায়, আর function একেবারেই পেরোতে পারে না।
- প্রতিটি worker নিজস্ব heap-সহ একটি thread: pool করুন, আবার ব্যবহার করুন, আর teardown-এ terminate করুন।

## Interview-এর প্রশ্ন

**Q: একটি 20 MB CSV upload করলে একটি table আধা সেকেন্ডের জন্য জমে যায়। Fix-টি ধাপে ধাপে বলুন।**

আগে profile করুন। নিশ্চিত হন যে long task-টি parse, 50,000 row render করা নয়। এদের fix আলাদা, আর ভুলটা করলে একটি
দিন নষ্ট হয়। যদি parse হয়, সেটাকে একটি module worker-এ সরান। File-টি একটি `ArrayBuffer` transferable হিসেবে পাঠান,
যাতে main thread-কে clone-এর খরচ দিতে না হয়। শুধু view-এর যা দরকার তা ফেরত দিন: row-গুলোর দৃশ্যমান page, parse
করা পুরোটা নয়। যদি rendering আসল সমস্যা হয়, table-টি virtualise করুন, আর তখন worker কিছুই বদলায় না।

**Q: Worker-এর সীমানা কী পেরোতে পারে আর কী পারে না?**

Structured clone plain data সামলায়: object, array, `Map`, `Set`, `Date`, typed array, আর cyclic
reference। এটা function বহন করতে পারে না, আর prototype ফেলে দেয়, তাই একটি class instance method ছাড়া plain
object হিসেবে পৌঁছায়। DOM node একেবারেই পেরোতে পারে না। বড় binary data clone না করে transfer করুন।
এতে ownership সরে যায়, আর পাঠানো দিকে buffer-টি আর ব্যবহার করা যায় না।

**Q: কখন একটি ধীর interaction-এর জন্য worker ভুল উত্তর?**

যখন কাজটা ছোট, যখন এটা DOM ছোঁয়, অথবা যখন bottleneck scripting নয়, rendering। প্রায় পাঁচ millisecond-এর কম
হলে আসা-যাওয়ার খরচ কাজের চেয়ে বেশি। আর অনেক "janky" page janky হয় layout thrash বা মাত্রাতিরিক্ত বড় bundle-এর
কারণে। Worker এর কোনোটাতেই সাহায্য করতে পারে না। একটি যোগ করলে শুধু আসল কারণটা একটি জটিলতর architecture-এর পেছনে
লুকিয়ে যায়।

**Q: কাজ worker-এ সরানোর সঙ্গে INP-এর সম্পর্ক কী?**

INP হলো একটি interaction আর তার সাড়া দেওয়া frame-এর মধ্যের দেরি। সাধারণ কারণ হলো main thread আটকে রাখা একটি long
task। Worker task-টিকে ওই thread থেকে পুরোপুরি সরিয়ে দেয়, তাই browser পরের frame-এই interaction সামলায়। ছোট কাজের
জন্য বিকল্প হলো yield করা। এটা একটি long task-কে টুকরো টুকরো করে, আর browser টুকরোগুলোর মাঝে input সামলায়। একই
লক্ষ্য, দুটি মাপ।

## এরপর কী পড়বেন

- [Chapter ?? — Event Loop](#ch-event-loop) — একটি লম্বা function কেন সবকিছু block করে, বিস্তারিতভাবে
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — INP, আর একটি long task সংখ্যাটার কী করে
- [Chapter ?? — Observer API](#ch-observer-apis) — প্রতিটি frame-এ কাজ করা বন্ধ করার অন্য উপায়
