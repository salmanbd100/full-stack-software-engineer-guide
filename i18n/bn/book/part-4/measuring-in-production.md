---
sourceHash: "03b1ac4b294b4893ae9b43f1660c849457e55504c3150facd8b4e5a8943c81be"
title: "Production-এ মাপা"
translatedAt: "2026-10-17T13:59:03.690Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Production-এ মাপা {#ch-measuring-in-production}

> এমন field data সংগ্রহ করুন, যা দিয়ে performance আর error debug করা যায়। তবে user-এর data vendor-এর কাছে পাঠিয়ে দেবেন না, আর noise-এ ডুবেও যাবেন না।

**এই অধ্যায়ে:** field বনাম lab, আর দুটির কোনটি কী দেখতে পায় না · `web-vitals` আর attribution · error যে চার জায়গা দিয়ে আপনার কাছে আসে · যে context থাকলে bug ঠিক হয় · redaction আর sampling · frontend-এর SLO হিসেবে crash-free session

## 💡 মূল ধারণা

Performance tracking আর error tracking আসলে একই যন্ত্র। দুটিই উত্তর দেয় "সত্যিকারের user-দের সঙ্গে আসলে কী
হয়েছিল"। দুটিই browser-এ সংগ্রহ হয়, আর পাঠানো হয় এমন কোনো জায়গায়, যা আপনি বানাননি। আর একই তিনটি field
ছাড়া দুটিই অকেজো: **কোন release, কোন user, কোন page**।

দুটিকে এক অধ্যায়ে রাখার কারণ, আকর্ষণীয় failure-গুলো একটির সঙ্গে আরেকটি জড়ানো। Deploy-এর পরে INP-এর spike আর
unhandled rejection-এর spike আসলে একই incident, দুবার বর্ণনা করা। দুটিকে আলাদা করে wire করলে পাবেন দুটি
dashboard, যেগুলো কেউ কখনো মিলিয়ে দেখে না।

অস্বস্তির দিকটা হলো, এই সব data browser ছেড়ে বেরিয়ে যায়। Session replay মানে কেউ আপনার product ব্যবহার করছে,
তার একটি recording। এটাকে privacy-র নয়, শুধু technical সিদ্ধান্ত ভাবলে একদিন দেখবেন vendor-এর database-এ card
number জমে আছে।

## কীভাবে কাজ করে

### Field আর lab আলাদা প্রশ্নের উত্তর দেয়

| | Field (সত্যিকারের user) | Lab (script দিয়ে চালানো load) |
| --- | --- | --- |
| যা জানায় | সমস্যা আছে কি না, আর কার জন্য | কেন আছে, waterfall আর trace সহ |
| Device আর network | User-দের যা আছে | আপনার বেছে নেওয়া একটি profile |
| INP মাপা যায় | হ্যাঁ | না — কেউ তো interact করছে না |
| CI-তে কাজে লাগে | না — traffic লাগে | হ্যাঁ, আর gate করার মতো যথেষ্ট deterministic |

দুটিই লাগবে, আর ভাগটা পরিষ্কার: **lab data pull request-কে gate করে, field data বলে কোন কাজটা ধরবেন।** যে team-এর
কাছে শুধু lab data আছে, তারা একটি simulated profile-এর জন্য optimise করে। যাদের কাছে শুধু field data, তারা জানে
site ধীর, কিন্তু কেন, সেটা বলতে পারে না।

একটিই কঠিন পার্থক্য আছে, সেটা INP। Lab run-এ কোনো interaction হয় না, তাই Lighthouse তার জায়গায় Total
Blocking Time দেখায়। ফলে INP ঠিক করতে field data *লাগবেই*।
[Chapter ?? — Core Web Vitals](#ch-core-web-vitals) দেখুন।

### Vitals সংগ্রহ, আর attribution build

```typescript
import { onCLS, onINP, onLCP, onTTFB, type Metric } from "web-vitals";

function report(metric: Metric): void {
  const { name, value, rating } = metric;
  const body = JSON.stringify({ name, value, rating, release: __APP_VERSION__, route: location.pathname });
  // sendBeacon survives the unload that finalises CLS and INP.
  navigator.sendBeacon?.("/api/vitals", body) ??
    fetch("/api/vitals", { body, method: "POST", keepalive: true });
}

[onLCP, onINP, onCLS, onTTFB].forEach((collect) => collect(report));
```

> ⚠️ **`onFID` আর নেই।** FID 2024-এ অবসরে গেছে, library থেকেও সরানো হয়েছে। যে code বা লেখা এখনও এটা ব্যবহার
> করে, সেটা শুধু একটি metric-এর নামে নয়, আরও অনেক দিক দিয়েই পুরনো।

শুধু value দেখে জানবেন সমস্যা আছে। **Attribution build** বলে দেয় সমস্যাটা কোথায়:

```typescript
import { onINP, onLCP } from "web-vitals/attribution";

onLCP((m) => report({ ...m, element: m.attribution.target }));
onINP((m) => report({ ...m, target: m.attribution.interactionTarget }));
```

এতে "p75 INP 480 ms" হয়ে যায় "p75 INP 480 ms, reports table-এর filter dropdown-এ"। শুরু থেকেই attribution
সংগ্রহ করুন। পরে যোগ করলে data-র জন্য আরও এক সপ্তাহ বসে থাকতে হবে।

Vitals যা ধরে না, তার জন্য `PerformanceObserver` browser-এর নিজের timeline-এ নজর রাখে:

```typescript
// Long tasks are the direct cause of poor INP — over 50 ms cannot be interrupted.
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) report({ name: "longtask", value: entry.duration });
  }
}).observe({ type: "longtask", buffered: true });
```

### যে চার জায়গা দিয়ে error আপনার কাছে আসতে পারে

একটিও বাদ পড়লে পুরো এক ধরনের failure চোখের আড়ালে থেকে যায়।

| উৎস | যা ধরে | এটা না থাকলে যা দেখা যায় না |
| ------ | ------- | -------------------- |
| Framework-এর error boundary | Render আর commit-এর সময় throw | প্রতিটি render crash |
| `window.onerror` | Handler, timer আর third-party code-এর uncaught error | Handler আর vendor script-এর failure |
| `unhandledrejection` | যে promise reject হয়েছে, অথচ `.catch()` নেই | ব্যর্থ `fetch` call-এর বেশিরভাগ |
| নিজে capture করা | যে error handle করেছেন, তবু জানতে চান | Retry আর degraded mode — যেগুলো চুপচাপ ঘটে |

```typescript
window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
  const { reason } = event;
  const stack = reason instanceof Error ? reason.stack : undefined;
  navigator.sendBeacon("/api/errors", JSON.stringify({
    kind: "rejection", message: String(reason), stack,
    release: __APP_VERSION__, route: location.pathname,
  }));
});
```

`unhandledrejection`-এর কথাই team-রা ভুলে যায়, অথচ আসল failure-এর বেশিরভাগ এখানেই এসে পড়ে। `try` ছাড়া
`await fetch` লিখলে error নয়, rejection তৈরি হয়, তাই `window.onerror` কখনো চলেই না। Render-এর সময়ের দিকটার জন্য
[Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) দেখুন।

### যে context ঠিক করে দেয় bug-টা fix হবে কি না

এগুলো ছাড়া error report শুধু একটি string, যা কেউ একজন close করে দেয়।

| Field | কেন জরুরি |
| ----- | -------------- |
| **Release version** | এটা নতুন কি না, বোঝা যায়। না থাকলে প্রতিটি deploy-এ আপনার baseline নতুন করে শুরু হয় |
| **প্রতিটি release-এর সঙ্গে upload করা source map** | Minified stack পড়া যায় না। Source map private রাখুন, CDN-এ public করে রাখবেন না |
| **Component stack** | JavaScript stack যখন পারে না, তখন tree-র কোথায় failure, সেটা দেখায় |
| **Breadcrumb** | শেষ কয়েকটি click, navigation আর request — reproduction-এর সবচেয়ে কাছাকাছি জিনিস |
| **User identifier** | "1,200 event"-কে বানিয়ে দেয় "তিনজন user, যার একজন retry loop-এ আটকে" |
| **Browser আর device** | Long tail-এর বেশিরভাগ error একটি engine বা একটি পুরনো version-এর |

**Identifier, পরিচয় নয়।** আক্রান্ত মানুষ গুনতে `user.id`-ই যথেষ্ট। Error service-এ নাম আর email address রাখলে
সেটা personal data, যার হিসাব এখন আপনাকে দিতে হবে।

### বেরিয়ে যাওয়ার আগে, browser-এই redact করুন

ভালো সব client-এ একটি before-send hook থাকে। সেটা ব্যবহার করুন, কারণ data তখনো আপনার হাতে, এটাই শেষ সুযোগ।
`/token|password|secret|authorization|email|card/i`-এর সঙ্গে মেলে এমন সব query parameter আর header ফেলে দিন।
**অসাবধানে data ফাঁস হওয়ার সবচেয়ে সাধারণ পথ হলো query string**। কারণ token প্রায়ই URL-এ চলে যায়, আর সেখান থেকে
error report-এ।

> ⚠️ **Session replay ডিফল্টে mask করে রাখুন, আর জেনে-বুঝে unmask করুন।** Allow-list ব্যর্থ হলেও নিরাপদ থাকে।
> Deny-list ব্যর্থ হয় প্রথম যেদিন কেউ নতুন form field যোগ করে। আগে থেকে না আটকালে checkout-এর replay card-এর
> input ধরে ফেলবে। আর "আমরা এটা deny-list-এ যোগ করে দেব" কোনো পরিকল্পনা নয়।

### Sampling, কারণ দুই ধরনের budget-ই সীমিত

Error service টাকা নেয় প্রতিটি event-এর জন্য, আর একজন মানুষ triage করে প্রতিটি issue ধরে।

| Signal | Rate | কেন |
| ------ | ---- | --- |
| Error | 100% | এগুলো কম ঘটে, আর কম ঘটা error-টাই আকর্ষণীয় |
| Performance trace | 1–10% | অবিরাম আসে আর খরচ বেশি; statistics-এর হিসাবে একটি sample-ই যথেষ্ট |
| Session replay, সব session | ~1% | Storage আর privacy-র খরচ |
| Session replay, যে session-এ error হয়েছে | 100% | আপনি আসলে শুধু সেই session-টাই চান, যেটা ভেঙেছে |

বেশিরভাগ noise আপনার code থেকে আসে না। আসে browser extension-এর ঢোকানো script, bot traffic, আর `ResizeObserver
loop completed with undelivered notifications` থেকে, যেটা সাধারণত ক্ষতিকর নয়। Triage-এ না করে client-এই filter
করুন। যে event-এর stack-এ আপনার নিজের origin-এর একটিও frame নেই, সেটা ফেলে দিন।

### Event-এর সংখ্যায় নয়, user-এর ওপর প্রভাবে alert দিন

Retry loop-এ আটকে থাকা একজন user থেকে 500 event-এর spike কোনো incident নয়। পাঁচজন user checkout করতে না
পারলে, সেটা incident।

| Indicator | Target | Window |
| --------- | ------ | ------ |
| কোনো fatal error ছাড়া session | 99.5% | 24 h |
| Checkout শুরু → শেষ | 97% | 1 h |
| p75 LCP 2.5 s-এর নিচে | 90% | 24 h |

**Frontend-এ সবার আগে যে metric ধরবেন, সেটা crash-free session**, কারণ এটা traffic দিয়ে normalise করা। শুধু error
গুনলে ব্যস্ত দিনে সংখ্যাটা লাফিয়ে ওঠে, আর growth-এর আড়ালে regression লুকিয়ে যায়। Rate-এ এর কোনোটাই হয় না।
Alerting-এর নিয়মকানুন [Chapter ?? — Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)-এ আছে, আর
এখানেও সেগুলো হুবহু খাটে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | কেন |
| --------- | --------- | --- |
| "Site কি ধীর?" | Field data, device অনুযায়ী ভাগ করে | আপনার laptop 75th percentile নয় |
| "এই page ধীর কেন?" | Lab run — trace আর waterfall | Deterministic, খুঁটিয়ে দেখা যায় |
| INP খারাপ, কিন্তু কোথায় তা জানা নেই | Attribution build | কোন element-এ interaction, তার নাম বলে দেয় |
| এমন regression, যা শুধু CI-তে দেখা যায় | Lab, pipeline-এর ভেতরে | Pull request-কে এর ওপর gate করুন |
| এমন crash, যা কেউ reproduce করতে পারছে না | Breadcrumb, আর সেই session-এর replay | Repro-র সবচেয়ে কাছের জিনিস |
| এরপর কী fix করবেন, সেই সিদ্ধান্ত | কতজন user আক্রান্ত, event-এর সংখ্যা নয় | পরিমাণ নয়, প্রভাব |

## সাধারণ ভুল

❌ **Attribution ছাড়া vitals সংগ্রহ করা।** সমস্যা আছে জানবেন, কিন্তু কোথায় তা জানবেন না।
✅ প্রথম দিন থেকেই attribution build ব্যবহার করুন।

❌ **`unhandledrejection` listener না রাখা।** ব্যর্থ `fetch` call-এর বেশিরভাগই তখন চুপচাপ থাকে।
✅ Window-এর দুটি listener-ই রাখুন, সঙ্গে framework boundary আর নিজে capture করা।

❌ **Report-এ release version না থাকা।** প্রতিটি deploy-এ baseline নতুন করে শুরু হয়, আর কিছুই কখনো "নতুন" থাকে না।
✅ Release-এর ছাপ দিন, আর মিলিয়ে source map upload করুন।

❌ **ডিফল্টে unmask করা session replay।** প্রথম যে form যোগ করবেন, সেটাই data ফাঁস করবে।
✅ সব mask করুন, নির্দিষ্ট field জেনে-বুঝে unmask করুন।

❌ **Error-এর সংখ্যায় alert দেওয়া।** সংখ্যাটা যতটা health দেখায়, ততটাই traffic দেখায়।
✅ Crash-free session আর completion rate-এ alert দিন।

## 🔑 মূল শিক্ষা

- Lab data pull request-কে gate করে, আর field data বলে কোন কাজটা ধরবেন। INP শুধু field-এই আছে।
- খারাপ metric-কে একটি নির্দিষ্ট element বা interaction-এর নামে নিয়ে আসে attribution build।
- পুরো error coverage-এর জন্য চারটি capture point লাগে, আর সাধারণত বাদ পড়ে `unhandledrejection`।
- Release version আর upload করা source map থাকলেই কেবল minified production stack কোনো কাজে লাগে।
- শুরু করার মতো frontend SLO (service-level objective) হলো crash-free session, কারণ rate traffic-এর সঙ্গে ওঠানামা করে না।

## Interview-এর প্রশ্ন

**Q: Lighthouse site-কে 95 দিচ্ছে, অথচ user-রা বলছেন site ধীর। কে ঠিক?**

User-রা। Lighthouse হলো একটি device profile-এ script দিয়ে চালানো একটিমাত্র load। Lighthouse INP মাপতেই পারে না, কারণ
page-এর সঙ্গে কেউ interact করছে না। বাস্তবতা দেখায় 75th percentile-এর field data। সাধারণত সেখানে দেখা যায়, সমস্যা
load-এ নয়, মাঝারি দামের phone-এ responsiveness-এ। Lab run তবু কাজের, তবে রায় দেওয়ার জন্য নয়, কারণ খোঁজার জন্য।

**Q: Error report triage করার যোগ্য হতে হলে তাতে কী থাকতে হবে?**

Release version, upload করা source map থেকে পড়ার মতো stack, route, আর একটি user identifier। Identifier থাকলে
event নয়, আক্রান্ত মানুষ গোনা যায়। পারলে breadcrumb যোগ করুন: throw-এর আগের click আর request-গুলোই reproduction-এর
সবচেয়ে কাছের জিনিস। বিশেষ করে release version না থাকলে বুঝতে পারবেন না, এটা নতুন regression, নাকি মাসের পর মাস
ধরে ব্যর্থ হয়ে চলা কিছু।

**Q: এখানে privacy-র ঝুঁকি কী, আর তা নিয়ে কী করবেন?**

যা কিছু সংগ্রহ করা হয়, সব browser ছেড়ে third party-র কাছে যায়। আর session replay মানে কেউ আপনার product ব্যবহার
করছে, তার recording। প্রথমত, before-send hook-এ redact করুন, যাতে শেষ সিদ্ধান্তটা আপনার দিকেই হয়। Replay-র input
ডিফল্টে mask করুন, নির্দিষ্ট field জেনে-বুঝে unmask করুন। নাম বা email নয়, একটি opaque user id পাঠান। আর
সংবেদনশীল query parameter ফেলে দিন: অসাবধানে data ফাঁসের সবচেয়ে সাধারণ পথ URL-এর ভেতরের token।

## এরপর কী পড়বেন

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — এই অধ্যায় যে metric-গুলো সংগ্রহ করে, আর প্রতিটি সংখ্যার মানে কী
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — lab-এর দিকের gate, যেটা এই field data দিয়ে calibrate করা উচিত
- [Chapter ?? — Observability ও Cost Engineering](#ch-observability) — একই নিয়মকানুন, server-এর দিকে
