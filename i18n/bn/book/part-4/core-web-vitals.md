---
sourceHash: "f064d47df6cde10e76445b36fd9d15e25f9f1f38442ad6c0e4e3650278164f1c"
title: "Core Web Vitals"
translatedAt: "2026-10-17T01:39:53.487Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Core Web Vitals {#ch-core-web-vitals}

> তিনটি metric-এর নাম বলুন, প্রতিটি কোন সংখ্যায় বিচার হয় তা বলুন, আর প্রতিটির জন্য প্রথমে কী বদলাবেন তা বলুন।

**এই অধ্যায়ে:** 75th percentile-এর নিয়ম · LCP আর element-টা খুঁজে বের করা · INP, যা FID-এর জায়গা নিয়েছে · CLS আর আগে থেকে জায়গা রাখা · field data বনাম lab data · কোনটা কোন ক্রমে ঠিক করবেন

## 💡 মূল ধারণা

Core Web Vitals হলো তিনটি সংখ্যা। প্রতিটি এমন একটি জিনিসের প্রতিনিধি, যা user টের পান: **মূল content কি এসেছে, ছুঁলে
page কি সাড়া দিয়েছে, আর আঙুলের নিচে কিছু কি সরে গেছে।**

যে খুঁটিনাটি এগুলো নিয়ে কাজের ধরন বদলে দেয়, তা হলো **75th percentile**। Site-এর বিচার গড় দিয়ে হয় না, আপনার laptop
দিয়েও না। বিচার হয় সত্যিকারের user-দের 75th percentile-এর visit দিয়ে, আর সেটা হলো ধীর network-এ মাঝারি মানের একটি phone।
তাই যে উন্নতি আপনার traffic-এর দ্রুত অর্ধেককে সাহায্য করে, তাতে score একটুও নড়ে না। আর development-এ যে page মুহূর্তেই
খোলে, তার score-ও খারাপ হতে পারে।

এ কারণেই vitals আগে একটি *field* measurement: সত্যিকারের user-দের browser থেকে আসা data। Lab tool রোগ নির্ণয়ের জন্য।
গোনা হয় field-এর সংখ্যাটাই।

> ⚠️ **যা বদলাতে থাকে:** metric-এর তালিকাটা Google-এর, আর এটা একবার বদলেছেও (FID বাদ, INP যোগ)। আরও কয়েকটি metric
> পরীক্ষায় আছে, threshold-ও বদলায়। টেকসই নীতি হলো acronym-গুলোর নিচের তিনটি প্রশ্ন: content কি এসেছে, ছুঁলে page কি
> সাড়া দিয়েছে, কিছু কি সরে গেছে। পরের metric-গুলোর নাম যা-ই হোক, সেগুলো এগুলোই মাপবে, 75th percentile-এ, field-এ।

## কীভাবে কাজ করে

### তিনটি metric আর তাদের threshold

| Metric | যা মাপে | ভালো | খারাপ |
| ------ | -------- | ---- | ---- |
| **LCP** — Largest Contentful Paint | দেখা যাওয়া সবচেয়ে বড় element-টা কখন render হওয়া শেষ করল | < 2.5 s | > 4 s |
| **INP** — Interaction to Next Paint | Interaction থেকে পরের paint হওয়া frame পর্যন্ত কতক্ষণ | < 200 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | দেখা যাওয়া content কতটা অপ্রত্যাশিতভাবে সরে গেছে | < 0.1 | > 0.25 |

> ⚠️ **FID আর নেই।** March 2024-এ Core Web Vital হিসেবে First Input Delay-এর জায়গায় এসেছে INP, আর September 2024-এ FID
> পুরোপুরি সরিয়ে দেওয়া হয়েছে। প্রকাশিত অনেক লেখা, আর অনেক interviewer-এর notes এখনো FID বলে। এটা নিয়ে নিখুঁত থাকা
> হালনাগাদ শোনানোর একটি সস্তা উপায়।

পার্থক্যটা সত্যিকারের। FID মাপত শুধু **প্রথম** interaction-এর handler শুরু হওয়ার **আগের দেরিটুকু**। INP মাপে **প্রতিটি**
interaction-এর **পুরো যাত্রা**: input-এর দেরি, handler চলা, আর browser-এর ফলাফল paint করা। আর রিপোর্ট করে সবচেয়ে
খারাপটার কাছাকাছি। একটি page FID-এ ভালো score পেতে পারত, অথচ তার পরের প্রতিটি click-এ আধা সেকেন্ড লাগত। অনেক page-এর
অবস্থা ঠিক এমনই ছিল।

### LCP: কিছু optimise করার আগে element-টা খুঁজুন

LCP কোন element, তা না জেনে LCP ঠিক করা যায় না। আর প্রায়ই সেটা আপনার ধরে নেওয়া element নয়।

```typescript
import { onLCP, type LCPMetric } from "web-vitals/attribution";

onLCP((metric: LCPMetric) => {
  // A CSS selector for the actual element, plus the phase breakdown.
  console.info(metric.value, metric.attribution.target, metric.attribution.resourceLoadDelay);
});
```

তারপর এই ক্রমে কাজ করুন, কারণ প্রতিটি fix আগেরটার চেয়ে কম লাভ দেয়:

| Fix | সাধারণত কতটা লাভ |
| --- | -------------- |
| LCP image-কে `fetchpriority="high"` দিন, আর ঠিক format ও size | একক হিসেবে সবচেয়ে বড় লাভ |
| LCP resource preload করুন; তার origin-এ `preconnect` করুন | খুঁজে পাওয়ার একটি round trip বাদ যায় |
| Head থেকে render-blocking CSS আর JavaScript সরান | ধীর connection-এ প্রায়ই কয়েক সেকেন্ড |
| Server বা CDN-এর response time উন্নত করুন | সবকিছুর নিচের সীমা ওপরে ওঠে |

```html
<!-- The LCP image: modern format, right size per viewport, and not queued behind other requests -->
<img
  src="hero.avif"
  srcset="hero-400.avif 400w, hero-800.avif 800w, hero-1200.avif 1200w"
  sizes="(max-width: 600px) 400px, 1200px"
  alt="Quarterly emissions dashboard"
  fetchpriority="high"
/>
```

`fetchpriority="high"` দেখতে যতটা মনে হয়, তার চেয়ে বেশি জরুরি। Default-এ browser image খুঁজে পায় দেরিতে, আর সেগুলোকে
কম priority দেয়। ফলে hero image গিয়ে দাঁড়ায় এমন script-এর পেছনে, যাদের জন্য তার অপেক্ষা করার কথাই নয়।

### INP: পুরো গল্পটাই main thread

খারাপ INP মানে user যখন interact করেছেন, main thread তখন ব্যস্ত ছিল। এ নিয়ে করার মতো জিনিস মাত্র তিনটি, আর তিনটিই
thread-টা ফিরিয়ে দেয়।

```typescript
// ❌ One long task. Every click during it waits.
function reindex(rows: Row[]): void {
  for (const row of rows) expensiveWork(row);
}

// ✅ Yield between chunks so input can be handled.
async function reindex(rows: Row[]): Promise<void> {
  for (let i = 0; i < rows.length; i++) {
    expensiveWork(rows[i]);
    if (i % 100 === 0) await scheduler.yield(); // hand the thread back
  }
}
```

| কারণ | Fix |
| ----- | --- |
| 50 ms-এর বেশি লম্বা একটি task | টুকরো করে yield করুন, অথবা worker-এ সরিয়ে দিন |
| প্রতিটি keystroke বা scroll frame-এ চলা handler | Debounce বা throttle করুন |
| State বদলের পরে বড় একটি synchronous re-render | Re-render-এর পরিধি ছোট করুন, অথবা সেটাকে non-urgent চিহ্নিত করুন |

50 ms সংখ্যাটা মনে রাখুন। এর চেয়ে লম্বা যেকোনো task একটি interaction আটকে রাখতে পারে, আর browser সেটা থামাতে পারে না।
Framework-এর স্তরে এর রূপটা দেখুন
[Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)-এ।

### CLS: content আসার আগেই জায়গা রেখে দিন

প্রতিটি layout shift-এর কারণ একটিই: **কোনো কিছু কত বড় হবে, browser তা জানত না।**

```html
<!-- ❌ Content jumps down when the image loads -->
<img src="chart.png" alt="Emissions by quarter" />

<!-- ✅ The box exists from the first frame -->
<img src="chart.png" alt="Emissions by quarter" width="800" height="600" />

<!-- ✅ Or with intrinsic ratio, for a fluid width -->
<img src="chart.png" alt="Emissions by quarter" style="aspect-ratio: 4 / 3; width: 100%" />
```

দেরিতে আসা সবকিছুর জন্য একই নিয়ম। Ad বা embed-এর slot-কে একটি `min-height` দিন। Skeleton-কে ঠিক সেই content-এর সমান
বানান, যার জায়গায় এটা বসে। `font-display: swap`-এর সঙ্গে মিলিয়ে নেওয়া fallback metric দিন, যাতে web font এলে text আবার
reflow না হয়। এই জোড়াটা নিয়ে আছে [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery)।

আর আচরণের একটি নিয়ম: user যা পড়ছেন, তার ওপরে কখনো content ঢোকাবেন না। Notification banner-এর জায়গা একটি fixed overlay-তে,
flow-এর মধ্যে ঠেলে ঢোকানো নয়।

### Field data আর lab data আলাদা প্রশ্নের উত্তর দেয়

| | Field (সত্যিকারের user) | Lab (Lighthouse, একটি synthetic run) |
| --- | --- | --- |
| যা মাপে | আসলে কী ঘটেছে, 75th percentile-এ | একটি device-এ নিয়ন্ত্রিত একটি load |
| কীসের জন্য ভালো | সমস্যা আছে কি না জানতে | কেন আছে তা খুঁজে বের করতে |
| INP মাপতে পারে | হ্যাঁ | না — মাপার মতো কোনো সত্যিকারের interaction নেই |

শেষ row-টাতেই লোকে আটকায়। Lab run-এ কেউ click করে না, তাই Lighthouse INP-এর বদলে Total Blocking Time দেখায়।
**INP শুধু field-এই থাকে।** Real-user measurement না বসানো পর্যন্ত INP ঠিক করতে পারবেন না। দেখুন
[Chapter ?? — Production-এ মাপা](#ch-measuring-in-production)।

## কখন ব্যবহার করবেন

| পরিস্থিতি | আগে কী ঠিক করবেন | কেন |
| --------- | --------- | --- |
| Content বা marketing page-এর score খারাপ | LCP: hero image আর render-blocking head | Load-ই আসল, interaction সামান্য |
| Dashboard বা editor-এর score খারাপ | INP: long task আর re-render-এর খরচ | User সারাক্ষণ interact করেন |
| Ad, embed বা দেরিতে load হওয়া banner | CLS: প্রতিটি slot-এর জায়গা রাখুন | জায়গা না রাখা একটি slot-ই metric ফেল করাতে পারে |
| Lab score ভালো, field score খারাপ | Field-কে বিশ্বাস করুন, আর ভাগ করে দেখুন | আপনার device 75th percentile নয় |
| INP খারাপ, অথচ field data নেই | আগে instrument করুন | Lab run-এ INP মাপা যায় না |

## সাধারণ ভুল

❌ **গড় নিয়ে optimise করা।** Traffic-এর দ্রুত অর্ধেককে উন্নত করলে 75th percentile একটুও নড়ে না।
✅ Device আর connection ধরে field data ভাগ করুন, আর কাজ করুন ধীর অংশটা নিয়ে।

❌ **FID নিয়ে কথা বলা।** 2024-এ এটা Core Web Vital থাকা বন্ধ হয়েছে।
✅ INP বলুন, আর বলতে পারুন FID যা মাপত না, INP তা কী মাপে।

❌ **LCP element আন্দাজ করা।** Team-গুলো প্রায়ই এমন image optimise করে, যেটা LCP-ই নয়।
✅ Attribution data থেকে element-টা পড়ুন, তারপর শুধু সেটাকেই optimise করুন।

❌ **Hero image-এ `loading="lazy"`।** LCP ঠিক যে resource-এর অপেক্ষায়, এটা সেটাকেই পিছিয়ে দেয়।
✅ Eager রাখুন, সঙ্গে `fetchpriority="high"`। Lazy-load করুন শুধু fold-এর নিচে।

❌ **Lighthouse score-কেই লক্ষ্য বানানো।** এটা একটি simulated load মাত্র, আর INP এটা দেখতেই পায় না।
✅ রোগ নির্ণয়ে lab run ব্যবহার করুন, আর বিচার করুন field data দিয়ে।

## 🔑 মূল শিক্ষা

- Core Web Vitals-এর বিচার হয় সত্যিকারের user-দের 75th percentile-এ, গড়ে বা আপনার নিজের device-এ নয়।
- 2024-এ FID-এর জায়গায় এসেছে INP: এটা শুধু প্রথম input-এর দেরি নয়, প্রতিটি interaction শুরু থেকে শেষ পর্যন্ত মাপে।
- LCP-র কাজ শুরু হয় attribution data থেকে element-টা চিনে নিয়ে, আন্দাজ করে নয়।
- প্রতিটি layout shift আসে জায়গা না রাখা থেকে, তাই দেরিতে আসা content-এর box আগেই দিয়ে রাখুন।
- Lab run-এ INP মাপা যায় না, তাই INP ঠিক করার পূর্বশর্ত হলো real-user monitoring।

## Interview-এর প্রশ্ন

**Q: FID-এর জায়গায় কী এসেছে, আর সেটা কী আলাদাভাবে মাপে?**

INP, March 2024 থেকে। FID মাপত শুধু প্রথম interaction-এর handler শুরু হওয়ার আগের দেরিটুকু। ফলে কোনো page ভালো score
পেয়েও প্রথমটার পরের প্রতিটি click-এ ধীর লাগতে পারত। INP সব interaction জুড়ে পুরো পথটা মাপে (input-এর দেরি, handler চলা,
আর পরের paint), আর রিপোর্ট করে সবচেয়ে খারাপটার কাছাকাছি। এটাকে ফাঁকি দেওয়া অনেক কঠিন, আর page আসলে কেমন লাগে, তার
অনেক ভালো নির্দেশক।

**Q: একটি page-এর LCP 4.2 সেকেন্ড। প্রথম এক ঘণ্টায় কী করবেন, বুঝিয়ে বলুন।**

ধরে না নিয়ে field attribution থেকে LCP element-টা চিনে নেব। প্রায়ই সেটা hero নয়, বরং একটি background image বা একটি
headline। তারপর ক্রমটা দেখব: resource কি দেরিতে খুঁজে পাওয়া যাচ্ছে, script-এর পেছনে লাইনে দাঁড়িয়ে আছে, নাকি শুধুই
বেশি বড়? বেশিরভাগ সময় সমাধান হলো ঠিক format আর size, সঙ্গে `fetchpriority="high"` আর একটি preload। এরপরই শুধু আমি
render-blocking CSS বা server-এর response time দেখব।

**Q: Lighthouse কেন আপনার INP বলতে পারে না?**

কারণ lab run-এ কোনো user নেই। INP মাপতে সত্যিকারের interaction লাগে, তাই Lighthouse তার বদলে Total Blocking Time দেখায়,
ব্যস্ত main thread-এর প্রতিনিধি হিসেবে। এ কারণেই INP ঠিক করা শুরু হয় field data বসানো দিয়ে। Field data ছাড়া আপনি এমন
একটি সংখ্যা optimise করছেন, যা metric-টার সঙ্গে ওঠানামা করে, কিন্তু metric-টা নিজে নয়।

**Q: আপনার CLS 0.3, আর প্রতিটি image-এ width আর height দেওয়া আছে। আর কোথায় খুঁজবেন?**

দেরিতে আসা এমন content-এ, যার জন্য box রাখা নেই: ad আর embed-এর slot, flow-এর মধ্যে ঢোকানো cookie banner, consent modal,
আর বর্তমান scroll position-এর ওপরে যোগ হওয়া যেকোনো কিছু। তারপর web font। আলাদা metric-এর fallback থাকলে আসল font
বদলে আসার সময় প্রতিটি line reflow হয়। সমাধানে লাগে `size-adjust` আর মিলিয়ে নেওয়া ascent ও descent, শুধু
`font-display: swap` নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Production-এ মাপা](#ch-measuring-in-production) — এই সংখ্যাগুলো যে field data থেকে আসে, তা সংগ্রহ করা
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — LCP আর main-thread-এর কাজের ওপর প্রধান হাতল
- [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) — image, font আর CSS, যা থেকে LCP আর CLS-এর বেশিরভাগ সমস্যা আসে
