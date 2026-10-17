---
sourceHash: "ed34bcd11b78073850f497a11908f6e6db1740095f3b8977d80bbc812a1911ae"
title: "Web Worker ও Main Thread"
translatedAt: "2026-10-17T00:56:49.271Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Web Worker ও Main Thread {#ch-web-workers}

> যে কাজ input আটকে দেয়, সেটা input সামলানোর thread থেকে সরিয়ে দিন। আর data এপার-ওপার পাঠাতে কত খরচ, সেটাও জেনে রাখুন।

**এই অধ্যায়ে:** আসলে কী block করে · worker model · structured clone আর transferable · Comlink · কখন worker ভুল সমাধান · INP-এর সঙ্গে সম্পর্ক

## 💡 মূল ধারণা

Main thread-এর কাজ তিনটি: আপনার JavaScript চালানো, layout হিসাব করে paint করা, আর input-এ সাড়া দেওয়া।
এই তিনটি কাজ চলে একটার পর একটা। কোনো function 300 millisecond ধরে চললে বাকি সব 300 millisecond আটকে থাকে।
Tap করলে কিছু হয় না, animation একটি frame-এ থেমে যায়, আর page দেখে মনে হয় ভেঙে গেছে। আসলে ভেঙেই গেছে।

Worker হলো দ্বিতীয় একটি thread। তার নিজের JavaScript engine আছে, কিন্তু DOM-এ হাত দিতে পারে না। আপনি message
পাঠান, worker কাজটা করে result ফেরত পাঠায়। ফলে main thread খালি থাকে সেই দুটি কাজের জন্য, যা শুধু main thread-ই করতে
পারে: render করা আর user-কে সাড়া দেওয়া।

> Worker কোনো কিছু দ্রুত করে না। ভারী কাজটা শুধু এমন জায়গায় সরিয়ে দেয়, যেখানে কেউ তার জন্য অপেক্ষা করে
> বসে নেই।

## কীভাবে কাজ করে

Worker একটি আলাদা script, তার global scope-ও আলাদা। আপনি যা পাঠান, তার বাইরে কিছুই shared নয়।

**Worker চালু করা আর তার সঙ্গে কথা বলা:**

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

### Boundary পার হওয়ার খরচ

Message shared হয় না, copy হয়। Copy হয় **structured clone algorithm** দিয়ে, মানে message-এর জন্য browser-এর
নিজস্ব deep copy। এই copy দুই পাশেই সত্যিকারের কাজ, আর সেটা হয় main thread-এ। তাই worker-এ 50 MB-এর একটি array
পাঠাতে যে খরচ, তা সরিয়ে দেওয়া হিসাবের চেয়েও বেশি হতে পারে।

| পদ্ধতি | খরচ | কখন ব্যবহার করবেন |
| ------ | --- | ---------------- |
| `postMessage(object)` | দুই পাশেই পুরো structured clone | ছোট message — parameter আর result |
| Transferable (`ArrayBuffer`, `ImageBitmap`) | প্রায় শূন্য; ownership সরে যায় | বড় binary payload |
| `SharedArrayBuffer` | কোনো copy নেই, memory সত্যিই shared | ভারী সংখ্যার হিসাব, আর শুধু ঠিক COOP/COEP header থাকলে |

**Copy না করে transfer করা:**

```typescript
// The second argument lists what to transfer. `buffer` is unusable here afterwards.
worker.postMessage({ buffer }, [buffer]);
```

Structured clone বেশিরভাগ জিনিসই সামলায়: object, array, `Map`, `Set`, `Date`, `ArrayBuffer`, এমনকি cyclic
reference-ও। কিন্তু function, class-এর পরিচয় আর DOM node সামলাতে পারে না। Class instance পৌঁছায় সাধারণ object
হয়ে, method-গুলো হারিয়ে। মানুষ প্রথমে এই সমস্যাতেই পড়ে।

### কাজটা সহনীয় করা

সরাসরি `postMessage` দিয়ে কাজ করলে একটি function call পুরো protocol হয়ে যায়: একটি id, message-এর type, একটি
listener, আর অপেক্ষায় থাকা promise-এর একটি map। Comlink এসব একটি proxy-র ভেতরে মুড়ে দেয়, তাই worker-টাকে
একটি async module-এর মতো দেখায়।

```typescript
import * as Comlink from "comlink";

// The worker's exported API, callable as if it were local.
const api = Comlink.wrap<{ parseCsv(csv: string): number }>(
  new Worker(new URL("./parse.worker.ts", import.meta.url), { type: "module" }),
);

const rows: number = await api.parseCsv(rawText);
```

## কখন ব্যবহার করবেন

প্রশ্নটা "এটা কি ধীর" নয়। প্রশ্ন হলো **"এটা কি frame আটকায়, আর DOM ছাড়া কি এটা চলতে পারে"**।

| কাজ | Worker? | কেন |
| --- | ------- | --- |
| বড় CSV, JSON বা log file parse করা | ✅ | String-এর ওপর শুধু হিসাব, DOM লাগে না |
| Image resize, canvas filter, video frame | ✅ | Payload transfer করা যায়, আর কাজটা সত্যিই ভারী |
| Search indexing, fuzzy matching, diffing | ✅ | CPU-bound, আর মাঝপথে থামানো যায় |
| Cryptography, compression, WASM-এর কাজ | ✅ | একদম ক্লাসিক উদাহরণ |
| Data fetch করা | ❌ | `fetch` এমনিতেই main thread-এর বাইরে চলে; আপনার ভাগে শুধু parse করাটা |
| DOM-এ হাত দেয় এমন যেকোনো কাজ | ❌ | Worker-এ DOM নেই |
| ~5ms-এর কম সময়ের কাজ | ❌ | Message-এর আসা-যাওয়াতেই কাজের চেয়ে বেশি খরচ |

### INP-এর সঙ্গে সম্পর্ক

INP (Interaction to Next Paint) মাপে কোনো interaction আর তার পরের frame-এর মধ্যে সবচেয়ে বড় দেরিটা। এর প্রধান
কারণ long task। সমাধান দুটি, আসলে একই সমাধান দুই মাপে: **yield** করুন, নয়তো **সরিয়ে দিন**।
`scheduler.yield()` দিয়ে task ভাগ করলে টুকরোগুলোর ফাঁকে ফাঁকে browser input সামলাতে পারে। Worker-এ সরালে task-টা
main thread থেকে পুরোপুরি চলে যায়। কাজ এত বড় যে yield করতে কয়েক ডজন টুকরো লাগবে, তখন worker নিন।

> ⚠️ **Worker বিনা খরচে আসে না।** প্রতিটি worker সত্যিকারের thread, তার নিজের heap আছে। কিছু করার আগেই কয়েক
> megabyte খরচ। প্রতিটি ধরনের কাজের জন্য একটি করে worker চালু করে রেখে দিন, অথবা ছোট একটি pool রাখুন।
> প্রতিটি call-এ নতুন worker বানাবেন না।

## সাধারণ ভুল

**❌ এমন কাজ সরানো, যেটা কখনো সমস্যাই ছিল না।** আগে profile করুন। বেশিরভাগ "ধীর" page ধীর হয় rendering, layout
thrash বা 2 MB-এর bundle-এর কারণে। এর কোনোটাতেই worker কাজে আসে না। Trace দেখলেই বোঝা যায় long task-টা আপনার
function, নাকি browser-এর layout।

**❌ পুরো object graph পাঠিয়ে দেওয়া।** Worker-এর যতটুকু লাগে ততটুকু পাঠান, caller-এর যতটুকু লাগে ততটুকু ফেরত দিন।
ভাবুন, একটি worker পুরো application state নেয়, আর ফেরত দেয় তার পুরো একটি copy। তাহলে clone-এর খরচ main thread-এ
দুবার দিতে হয়। আর সেটা সেই thread, যাকে বাঁচাতেই আপনি worker এনেছিলেন।

**❌ ধরে নেওয়া যে class instance টিকে থাকবে।** Structured clone data copy করে, prototype নয়। সাধারণ object
পাঠান। Method লাগলে অন্য পাশে গিয়ে আবার object বানিয়ে নিন।

**❌ `terminate()` ভুলে যাওয়া।** Worker বেঁচে থাকে যতক্ষণ না তাকে terminate করা হয় বা page unload হয়। যে
component প্রতিবার mount হলে একটি worker বানায় আর কখনো terminate করে না, তাতে প্রতিবার একটি করে thread leak হয়।

**❌ ধরে নেওয়া যে `SharedArrayBuffer` পাওয়া যাবেই।** এর জন্য cross-origin isolation লাগে, যা চালু হয় `COOP`
আর `COEP` header দিয়ে। এগুলো চালু করলে third-party embed আর analytics ভেঙে যেতে পারে। তাই এটা code-এর নয়,
deployment-এর সিদ্ধান্ত।

## 🔑 মূল শিক্ষা

- Main thread আপনার JavaScript চালায়, layout আর paint করে, আর input সামলায়, একটার পর একটা। তাই একটি লম্বা
  function মানেই জমে যাওয়া interface।
- Worker-এ DOM নেই, তাই শুধু হিসাবের কাজেই worker মানায়: parse করা, indexing, image আর crypto-র কাজ।
- Message structured clone হয়, আর তাতে main thread-এ সত্যিকারের সময় খরচ হয়। বড় payload হলে copy না করে
  `ArrayBuffer` transfer করুন।
- Boundary পার হলে class instance তার prototype হারায়, আর function তো পার হতেই পারে না।
- প্রতিটি worker একটি thread, যার নিজের heap আছে: pool করুন, আবার ব্যবহার করুন, আর teardown-এ terminate করুন।

## Interview-এর প্রশ্ন

**Q: 20 MB-এর একটি CSV upload করলে একটি table আধা second জমে থাকে। সমাধানটা ধাপে ধাপে বলুন।**

আগে profile করুন। নিশ্চিত হোন long task-টা parse করা, 50,000 row render করা নয়। দুটির সমাধান আলাদা, আর ভুলটা
করলে একটি দিন নষ্ট। যদি parse-ই হয়, সেটা একটি module worker-এ সরিয়ে দিন। File-টা `ArrayBuffer` transferable
হিসেবে পাঠান, যাতে main thread-কে clone-এর খরচ দিতে না হয়। ফেরত দিন শুধু view-এর যা লাগে: row-এর দৃশ্যমান page-টা,
পুরো parse করা data নয়। আর আসল সমস্যা যদি rendering হয়, table-টা virtualise করুন। সেখানে worker কিছুই বদলায় না।

**Q: Worker boundary পার হতে পারে কী, আর পারে না কী?**

Structured clone সাধারণ data সামলায়: object, array, `Map`, `Set`, `Date`, typed array, আর cyclic reference। Function
নিতে পারে না, আর prototype ফেলে দেয়। তাই class instance পৌঁছায় method ছাড়া সাধারণ object হয়ে। DOM node একেবারেই পার
হতে পারে না। বড় binary data clone না করে transfer করুন। তাতে ownership সরে যায়, আর পাঠানোর পাশে buffer-টা আর ব্যবহার
করা যায় না।

**Q: ধীর interaction-এর জন্য worker কখন ভুল সমাধান?**

যখন কাজটা ছোট, যখন সেটা DOM-এ হাত দেয়, অথবা যখন আটকে থাকার কারণ scripting নয়, rendering। প্রায় পাঁচ millisecond-এর
কম কাজে আসা-যাওয়ার খরচই কাজের চেয়ে বেশি। আর অনেক "janky" page janky হয় layout thrash বা বিশাল bundle-এর কারণে।
এর কোনোটাতেই worker সাহায্য করতে পারে না। Worker যোগ করলে শুধু আসল কারণটা আরও জটিল architecture-এর আড়ালে চাপা পড়ে।

**Q: Worker-এ কাজ সরানোর সঙ্গে INP-এর সম্পর্ক কী?**

INP হলো কোনো interaction আর তার জবাবে আসা frame-এর মধ্যের দেরি। সাধারণত কারণ হয় main thread আটকে রাখা একটি long task।
Worker সেই task-টা ওই thread থেকে পুরোপুরি সরিয়ে দেয়, ফলে browser পরের frame-এই interaction সামলাতে পারে। ছোট কাজের
জন্য বিকল্প হলো yield করা। তাতে একটি long task টুকরো টুকরো হয়, আর টুকরোগুলোর ফাঁকে browser input সামলায়। লক্ষ্য একই,
শুধু মাপ দুই রকম।

## এরপর কী পড়বেন

- [Chapter ?? — Event Loop](#ch-event-loop) — একটি লম্বা function কেন সবকিছু আটকে দেয়, বিস্তারিত
- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — INP, আর long task সেই সংখ্যার কী করে
- [Chapter ?? — Observer API](#ch-observer-apis) — প্রতিটি frame-এ কাজ না করার আরেকটি উপায়
