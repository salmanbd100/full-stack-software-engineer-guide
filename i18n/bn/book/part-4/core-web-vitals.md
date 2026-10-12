---
sourceHash: "f064d47df6cde10e76445b36fd9d15e25f9f1f38442ad6c0e4e3650278164f1c"
title: "Core Web Vitals"
translatedAt: "2026-10-12T12:17:14.718Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Core Web Vitals {#ch-core-web-vitals}

> তিনটি metric-এর নাম বলুন, প্রতিটিকে কোন সংখ্যায় বিচার করা হয়, আর প্রতিটির জন্য আপনি প্রথমে কী বদলাবেন।

**এই অধ্যায়ে:** 75th percentile-এর নিয়ম · LCP আর element খুঁজে বের করা · INP, যা FID-এর জায়গা নিয়েছে · CLS আর জায়গা আগে থেকে রাখা · field data বনাম lab data · কোন ক্রমে fix করবেন

## 💡 মূল ধারণা

Core Web Vitals তিনটি সংখ্যা। প্রতিটি এমন একটি জিনিসের প্রতিনিধি, যা user অনুভব করেন: **মূল content কি এসেছে, ছুঁলে
page কি সাড়া দিয়েছে, আর আঙুলের নিচে কিছু কি সরে গেছে।**

যে খুঁটিনাটি এগুলোর সাথে আপনার কাজের ধরন বদলে দেয়, তা হলো **75th percentile**। একটি site-কে তার average দিয়ে বা আপনার
laptop দিয়ে বিচার করা হয় না। বিচার করা হয় সত্যিকারের user-দের 75th percentile-এর visit দিয়ে, যেটা ধীর network-এ একটি
মাঝারি মানের phone। তাই যে উন্নতি আপনার traffic-এর দ্রুত অর্ধেককে সাহায্য করে, তা score একটুও নড়ায় না, আর development-এ
যে page তাৎক্ষণিক মনে হয়, সেটা খারাপ score পেতে পারে।

এ কারণেই vitals প্রথমত একটি *field* measurement: সত্যিকারের user-দের browser থেকে আসা data। Lab tool রোগ নির্ণয়ের জন্য।
গোনা হয় field-এর সংখ্যাটিই।

> ⚠️ **যা বদলাতে থাকে:** metric-এর set-টি Google-এর, আর এটা এর মধ্যেই একবার বদলেছে (FID বাদ, INP যোগ)। আরো candidate
> trial-এ আছে, আর threshold-ও বদলায়। টেকসই নীতি হলো acronym-গুলোর নিচের তিনটি প্রশ্ন: content কি এসেছে, ছুঁলে page কি
> সাড়া দিয়েছে, কিছু কি সরে গেছে। এরপর metric-গুলোর নাম যা-ই হোক, সেগুলো এটাই মাপবে, 75th percentile-এ, field-এ।

## কীভাবে কাজ করে

### তিনটি metric আর তাদের threshold

| Metric | যা মাপে | ভালো | খারাপ |
| ------ | -------- | ---- | ---- |
| **LCP** — Largest Contentful Paint | সবচেয়ে বড় দৃশ্যমান element-টি কখন render শেষ করেছে | < 2.5 s | > 4 s |
| **INP** — Interaction to Next Paint | একটি interaction থেকে পরের paint হওয়া frame পর্যন্ত কত সময় | < 200 ms | > 500 ms |
| **CLS** — Cumulative Layout Shift | দৃশ্যমান content অপ্রত্যাশিতভাবে কতটা সরেছে | < 0.1 | > 0.25 |

> ⚠️ **FID আর নেই।** March 2024-এ INP, First Input Delay-এর জায়গা নিয়েছে Core Web Vital হিসেবে, আর September 2024-এ
> FID পুরোপুরি সরিয়ে দেওয়া হয়েছে। প্রকাশিত অনেক লেখা, আর অনেক interviewer-এর নোটে, এখনো FID লেখা। এ বিষয়ে নির্ভুল
> থাকা হালনাগাদ শোনানোর একটি সস্তা উপায়।

পার্থক্যটা সত্যিকারের। FID শুধু মাপত **প্রথম** interaction-এর handler শুরু হওয়ার **আগের delay**। INP **প্রতিটি**
interaction-এর **পুরো যাত্রা** মাপে: input delay, handler চলা, আর browser-এর ফলাফল paint করা। এটা সবচেয়ে খারাপটির কাছাকাছি
report করে। একটি page FID-এ ভালো score পেতে পারত, অথচ তারপর প্রতিটি click-এ আধা সেকেন্ড লাগত, আর অনেক page-এ ঠিক তাই হতো।

### LCP: কিছু optimise করার আগে element খুঁজে বের করুন

LCP কোন element তা না জেনে আপনি LCP ঠিক করতে পারবেন না, আর প্রায়ই সেটা আপনি যেটা ভাবেন সেটা নয়।

```typescript
import { onLCP, type LCPMetric } from "web-vitals/attribution";

onLCP((metric: LCPMetric) => {
  // A CSS selector for the actual element, plus the phase breakdown.
  console.info(metric.value, metric.attribution.target, metric.attribution.resourceLoadDelay);
});
```

তারপর এই ক্রমে কাজ করুন, কারণ প্রতিটি fix-এর ফল আগেরটির চেয়ে কম:

| Fix | সাধারণ প্রভাব |
| --- | -------------- |
| LCP image-কে `fetchpriority="high"` আর সঠিক format ও size দিন | একক সবচেয়ে বড় লাভ |
| LCP resource preload করুন; তার origin-এ `preconnect` করুন | খুঁজে পাওয়ার একটি round trip বাদ দেয় |
| Head থেকে render-blocking CSS আর JavaScript সরান | ধীর connection-এ প্রায়ই কয়েক সেকেন্ড |
| Server বা CDN-এর response time উন্নত করুন | সবকিছুর ভিত্তি উঁচু করে |

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

`fetchpriority="high"` দেখতে যতটা মনে হয়, তার চেয়ে বেশি গুরুত্বপূর্ণ। Default-এ browser image দেরিতে খুঁজে পায় আর সেগুলোকে
কম priority দেয়, তাই একটি hero image এমন script-এর পেছনে queue-তে দাঁড়ায়, যার জন্য তার অপেক্ষা করার দরকারই নেই।

### INP: main thread-ই পুরো গল্প

খারাপ INP মানে user যখন interact করেছেন, main thread তখন ব্যস্ত ছিল। এর জন্য করার মতো কাজ মাত্র তিনটি, আর তিনটিই
thread-কে ফিরিয়ে দেয়।

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
| 50 ms-এর বেশি একটি একক task | ভাগ করে yield করুন, অথবা একটি worker-এ সরান |
| প্রতিটি keystroke বা scroll frame-এ চলা একটি handler | Debounce বা throttle করুন |
| State বদলের পরে একটি বড় synchronous re-render | কী re-render হয় তা সংকীর্ণ করুন, অথবা non-urgent হিসেবে চিহ্নিত করুন |

50 ms সংখ্যাটি মনে রাখুন। এর চেয়ে লম্বা যেকোনো task একটি interaction আটকে রাখতে পারে, আর browser সেটা interrupt করতে
পারে না। Framework-স্তরের রূপের জন্য দেখুন
[Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)।

### CLS: content আসার আগেই জায়গা রেখে দিন

প্রতিটি layout shift-এর কারণ একই: **browser জানত না কোনো কিছু কত বড় হবে।**

```html
<!-- ❌ Content jumps down when the image loads -->
<img src="chart.png" alt="Emissions by quarter" />

<!-- ✅ The box exists from the first frame -->
<img src="chart.png" alt="Emissions by quarter" width="800" height="600" />

<!-- ✅ Or with intrinsic ratio, for a fluid width -->
<img src="chart.png" alt="Emissions by quarter" style="aspect-ratio: 4 / 3; width: 100%" />
```

দেরিতে আসা সবকিছুর জন্য একই নিয়ম খাটে। একটি ad বা embed slot-কে `min-height` দিন। একটি skeleton-কে সেই content-এর
সমান আকারের করুন, যার জায়গা সে নেয়। `font-display: swap`-এর সাথে মেলানো fallback metrics জুড়ে দিন, যাতে web font এলে
text reflow না হয়। [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) এই জোড়াটি ব্যাখ্যা করে।

আর একটি behaviour-এর নিয়ম: user যা পড়ছেন, তার ওপরে কখনো content ঢোকাবেন না। একটি notification banner-এর জায়গা একটি
fixed overlay-এ, flow-এর ভেতরে ঠেলে দেওয়া নয়।

### Field data আর lab data আলাদা প্রশ্নের উত্তর দেয়

| | Field (সত্যিকারের user) | Lab (Lighthouse, একটি synthetic run) |
| --- | --- | --- |
| যা মাপে | আসলে কী ঘটেছে, 75th percentile-এ | একটি device-এ একটি নিয়ন্ত্রিত load |
| যার জন্য ভালো | আপনার কোনো সমস্যা আছে কিনা জানা | কেন, তা খুঁজে বের করা |
| INP মাপতে পারে | হ্যাঁ | না — মাপার মতো কোনো সত্যিকারের interaction নেই |

শেষ row-টিতে মানুষ আটকে যায়। একটি lab run-এ কেউ click করছে না, তাই Lighthouse বিকল্প হিসেবে Total Blocking Time report
করে। **INP শুধু field-এই থাকে।** Real-user measurement চালু না হওয়া পর্যন্ত আপনি এটা ঠিক করতে পারবেন না। দেখুন
[Chapter ?? — Production-এ মাপা](#ch-measuring-in-production)।

## কখন ব্যবহার করবেন

| পরিস্থিতি | আগে যা fix করবেন | কেন |
| --------- | --------- | --- |
| একটি content বা marketing page খারাপ score করছে | LCP: hero image আর render-blocking head | Load-ই প্রধান; interaction কম |
| একটি dashboard বা editor খারাপ score করছে | INP: long task আর re-render-এর খরচ | User অনবরত interact করেন |
| Ad, embed বা দেরিতে load হওয়া banner | CLS: প্রতিটি slot-এর জায়গা রাখুন | জায়গা না রাখা একটি slot একাই metric fail করাতে পারে |
| Lab score ভালো, field score খারাপ | Field-কে বিশ্বাস করুন, আর ভাগ করে দেখুন | আপনার device 75th percentile নয় |
| Field data ছাড়া খারাপ INP | আগে instrument করুন | Lab run-এ INP মাপা যায় না |

## সাধারণ ভুল

❌ **Average optimise করা।** Traffic-এর দ্রুত অর্ধেকের উন্নতি 75th percentile-কে একটুও নড়ায় না।
✅ Field data device আর connection অনুযায়ী ভাগ করুন, আর ধীর অংশটি নিয়ে কাজ করুন।

❌ **FID নিয়ে কথা বলা।** 2024-এ এটা আর Core Web Vital নেই।
✅ INP বলুন, আর FID যা মাপত না, এটা তা কী মাপে বলতে পারুন।

❌ **LCP element আন্দাজ করা।** Team-রা প্রায়ই এমন একটি image optimise করে, যেটা আসলে LCP নয়।
✅ Attribution data থেকে সেটা পড়ুন, তারপর ঠিক সেই element-টি optimise করুন।

❌ **Hero image-এ `loading="lazy"`।** LCP যে resource-এর জন্য অপেক্ষা করছে, এটা ঠিক সেটাকেই পিছিয়ে দেয়।
✅ Eager, সাথে `fetchpriority="high"`। শুধু fold-এর নিচে lazy-load করুন।

❌ **একটি Lighthouse score-কে লক্ষ্য বানিয়ে তাড়া করা।** এটা একটি simulated load, আর এটা INP একেবারেই দেখতে পায় না।
✅ রোগ নির্ণয়ে lab run ব্যবহার করুন, আর বিচার করুন field data দিয়ে।

## 🔑 মূল শিক্ষা

- Core Web Vitals বিচার করা হয় সত্যিকারের user-দের 75th percentile-এ, average বা আপনার নিজের device দিয়ে নয়।
- 2024-এ INP, FID-এর জায়গা নিয়েছে: এটা প্রতিটি interaction শুরু থেকে শেষ পর্যন্ত মাপে, শুধু প্রথম input-এর delay নয়।
- LCP-র কাজ শুরু হয় attribution data থেকে element চিহ্নিত করে, আন্দাজ করে নয়।
- প্রতিটি layout shift আসে জায়গা না রাখা থেকে, তাই দেরিতে আসা content-কে আগেভাগেই তার box দিন।
- Lab run-এ INP মাপা যায় না, তাই এটা ঠিক করার পূর্বশর্ত হলো real-user monitoring।

## Interview-এর প্রশ্ন

**Q: FID-এর জায়গা কী নিয়েছে, আর সেটা কী অন্যভাবে মাপে?**

INP, March 2024 থেকে। FID শুধু মাপত প্রথম interaction-এর handler শুরু হওয়ার আগের delay। একটি page ভালো score পেয়েও প্রথমটির
পরে প্রতিটি click-এ ধীর মনে হতে পারত। INP সব interaction জুড়ে পুরো পথ মাপে (input delay, handler চলা, আর পরের paint), আর
সবচেয়ে খারাপটির কাছাকাছি report করে। একে ফাঁকি দেওয়া অনেক কঠিন, আর page আসলে কেমন লাগে তার অনেক ভালো নির্দেশক।

**Q: একটি page-এর LCP 4.2 সেকেন্ড। আপনার প্রথম এক ঘণ্টা কীভাবে কাটবে, বলুন।**

আন্দাজ না করে field attribution থেকে LCP element চিহ্নিত করুন। প্রায়ই সেটা hero-র বদলে একটি background image বা একটি
headline। তারপর ক্রমটি দেখুন: resource কি দেরিতে খুঁজে পাওয়া যাচ্ছে, script-এর পেছনে queue-তে আছে, নাকি শুধু অনেক বড়?
বেশিরভাগ সময় fix হলো সঠিক format আর size, সাথে `fetchpriority="high"` আর একটি preload। শুধু এরপরেই আমি render-blocking
CSS বা server-এর response time দেখব।

**Q: Lighthouse কেন আপনার INP বলতে পারে না?**

কারণ একটি lab run-এ কোনো user নেই। INP মাপতে সত্যিকারের interaction লাগে, তাই Lighthouse এর বদলে Total Blocking Time report
করে, ব্যস্ত main thread-এর বিকল্প হিসেবে। এ কারণেই INP ঠিক করা শুরু হয় field data চালু করে। এটা ছাড়া আপনি এমন একটি সংখ্যা
optimise করছেন, যা metric-এর সাথে সম্পর্কিত কিন্তু metric নয়।

**Q: আপনার CLS 0.3, আর আপনি প্রতিটি image-এ width আর height set করেছেন। আর কোথায় খুঁজবেন?**

দেরিতে আসা content, যার জন্য কোনো box রাখা নেই: ad আর embed slot, flow-এর ভেতরে ঢোকানো cookie banner, consent modal,
আর বর্তমান scroll position-এর ওপরে যোগ হওয়া যেকোনো কিছু। তারপর web font। আলাদা metrics-এর একটি fallback আসল font swap
হয়ে এলে প্রতিটি line reflow করে। Fix-এর জন্য লাগে `size-adjust` আর মেলানো ascent ও descent, শুধু `font-display: swap` নয়।

## এরপর কী পড়বেন

- [Chapter ?? — Production-এ মাপা](#ch-measuring-in-production) — যে field data থেকে এই সংখ্যাগুলো আসে, তা সংগ্রহ করা
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — LCP আর main-thread-এর কাজের ওপর প্রধান lever
- [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery) — image, font আর CSS, যেগুলো বেশিরভাগ LCP আর CLS সমস্যার কারণ
