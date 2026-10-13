---
sourceHash: "03b1ac4b294b4893ae9b43f1660c849457e55504c3150facd8b4e5a8943c81be"
title: "Production-এ মাপা"
translatedAt: "2026-10-12T12:13:55.183Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Production-এ মাপা {#ch-measuring-in-production}

> এমন field data সংগ্রহ করুন, যা দিয়ে performance আর error debug করা যায় — user-এর data vendor-এর কাছে না পাঠিয়ে, আর noise-এ না ডুবে।

**এই অধ্যায়ে:** field বনাম lab, আর কোনটা কী দেখতে পায় না · `web-vitals` আর attribution · error আপনার কাছে পৌঁছানোর চারটি পথ · যে context একটি bug ঠিক করায় · redaction আর sampling · frontend SLO হিসেবে crash-free session

## 💡 মূল ধারণা

Performance আর error tracking আসলে একই যন্ত্র। দুটিই উত্তর দেয় "আসল user-দের সাথে আসলে কী ঘটেছে"। দুটিই browser-এ
সংগ্রহ হয়, আর এমন কিছুতে পাঠানো হয় যেটা আপনি বানাননি। আর একই তিনটি field ছাড়া দুটিই অকেজো: **কোন release, কোন
user, কোন page**।

দুটি এক অধ্যায়ে, কারণ আকর্ষণীয় failure-গুলো একে অপরের সাথে জড়ানো। Deploy-এর পর INP-তে spike আর unhandled
rejection-এ spike আসলে একই incident, দুবার বর্ণনা করা। দুটি আলাদাভাবে wire করলে আপনি পান দুটি dashboard, যেগুলো
কেউ মিলিয়ে দেখে না।

অস্বস্তিকর অর্ধেকটা হলো, এই সব data browser ছেড়ে চলে যায়। Session replay মানে কেউ আপনার product ব্যবহার করছে, তার
একটি recording। একে privacy-র সিদ্ধান্ত না ভেবে শুধু technical সিদ্ধান্ত ভাবলে, শেষে card number গিয়ে পড়ে একটি
vendor-এর database-এ।

## কীভাবে কাজ করে

### Field আর lab আলাদা প্রশ্নের উত্তর দেয়

| | Field (আসল user) | Lab (একটি scripted load) |
| --- | --- | --- |
| যা জানায় | আপনার সমস্যা আছে কি না, আর কার জন্য | কেন, একটি waterfall আর trace সহ |
| Device আর network | User-দের যা আছে | আপনার বেছে নেওয়া একটি profile |
| INP মাপতে পারে | হ্যাঁ | না — কেউ interact করছে না |
| CI-তে কাজের | না — traffic লাগে | হ্যাঁ, আর gate করার মতো যথেষ্ট deterministic |

আপনার দুটিই লাগবে, আর ভাগটা পরিষ্কার: **lab data pull request gate করে, field data বলে কী নিয়ে কাজ করবেন।** যে
team-এর শুধু lab data আছে, সে একটি simulated profile-এর জন্য optimise করে। যে team-এর শুধু field data আছে, সে জানে
site slow, কিন্তু কেন তা বলতে পারে না।

একমাত্র কঠিন পার্থক্য INP। Lab run-এ কোনো interaction নেই, তাই Lighthouse এর বদলে Total Blocking Time দেখায়। তাই
INP ঠিক করতে field data *লাগবেই*। দেখুন [Chapter ?? — Core Web Vitals](#ch-core-web-vitals)।

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

> ⚠️ **`onFID` আর নেই।** FID 2024-এ অবসরে গেছে, আর library থেকে সরিয়ে ফেলা হয়েছে। যে code বা article এটা
> ব্যবহার করে, সেটা শুধু একটি metric-এর নামের চেয়ে বেশি পুরনো।

শুধু একটি value বলে যে সমস্যা আছে। **Attribution build** বলে কোথায়:

```typescript
import { onINP, onLCP } from "web-vitals/attribution";

onLCP((m) => report({ ...m, element: m.attribution.target }));
onINP((m) => report({ ...m, target: m.attribution.interactionTarget }));
```

এতে "p75 INP 480 ms" হয়ে যায় "p75 INP 480 ms, reports table-এর filter dropdown-এ"। শুরু থেকেই attribution
সংগ্রহ করুন। পরে যোগ করলে data-র জন্য আরও এক সপ্তাহ অপেক্ষা করতে হয়।

Vitals যা cover করে না, তার জন্য `PerformanceObserver` browser-এর নিজের timeline দেখে:

```typescript
// Long tasks are the direct cause of poor INP — over 50 ms cannot be interrupted.
new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.duration > 50) report({ name: "longtask", value: entry.duration });
  }
}).observe({ type: "longtask", buffered: true });
```

### Error আপনার কাছে পৌঁছানোর চারটি পথ

যেকোনো একটি বাদ দিলে, একটি পুরো শ্রেণির failure অদৃশ্য হয়ে যায়।

| উৎস | যা ধরে | এটা ছাড়া যা অদৃশ্য |
| ------ | ------- | -------------------- |
| Framework error boundary | Render আর commit-এর সময় throw | প্রতিটি render crash |
| `window.onerror` | Handler, timer, third-party code-এ uncaught error | Handler আর vendor script-এর failure |
| `unhandledrejection` | `.catch()` ছাড়া reject হওয়া promise | বেশিরভাগ ব্যর্থ `fetch` call |
| Explicit capture | Handle করা error, যেগুলোর কথা তবুও জানতে চান | Retry আর degraded mode — চুপচাপ থাকা failure-গুলো |

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

`unhandledrejection`-ই সেটা, যেটা team-রা ভুলে যায়, আর বেশিরভাগ আসল failure সেখানেই পড়ে। `try` ছাড়া একটি `await fetch`
একটি rejection তৈরি করে, error নয়, তাই `window.onerror` কখনো fire করে না। Render-এর সময়ের অর্ধেকটার জন্য দেখুন
[Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming)।

### যে context ঠিক করে একটি bug ঠিক হবে কি না

এগুলো ছাড়া একটি error report শুধু একটি string, যেটা কেউ একজন close করে দেয়।

| Field | কেন গুরুত্বপূর্ণ |
| ----- | -------------- |
| **Release version** | এটা নতুন কি না। এটা ছাড়া প্রতিটি deploy আপনার baseline reset করে দেয় |
| **Source map, প্রতি release-এ upload করা** | Minified stack পড়া যায় না। এগুলো private রাখুন, CDN-এ public নয় |
| **Component stack** | JavaScript stack যখন পারে না, তখন tree-তে failure-টা খুঁজে দেয় |
| **Breadcrumb** | শেষ কয়েকটি click, navigation আর request — reproduction-এর সবচেয়ে কাছের জিনিস |
| **একটি user identifier** | "1,200 event"-কে বানায় "তিনজন user, একজন retry loop-এ আটকে" |
| **Browser আর device** | Long tail-এর বেশিরভাগ error একটি engine বা একটি পুরনো version-এর |

**একটি identifier, পরিচয় নয়।** ক্ষতিগ্রস্ত মানুষ গোনার জন্য `user.id`-ই যথেষ্ট। Error service-এ একটি নাম আর একটি email
address মানে personal data, যার হিসাব এখন আপনাকে দিতে হবে।

### Browser ছাড়ার আগেই, browser-এ redact করুন

প্রতিটি সিরিয়াস client একটি before-send hook দেয়। এটা ব্যবহার করুন: data তখনও আপনার, এমন শেষ জায়গা এটাই।
`/token|password|secret|authorization|email|card/i`-এর সাথে মেলে এমন যেকোনো query parameter বা header সরিয়ে ফেলুন।
**Query string-ই সবচেয়ে সাধারণ অনিচ্ছাকৃত leak**, কারণ token প্রায়ই URL-এ চলে যায়, তারপর error report-এ।

> ⚠️ **Session replay default-ভাবে mask করুন, আর জেনেবুঝে unmask করুন।** একটি allow-list নিরাপদ দিকে ব্যর্থ হয়।
> একটি deny-list ব্যর্থ হয় প্রথম যেদিন কেউ একটি form field যোগ করে। Checkout-এর একটি replay card input capture করে,
> যদি না আপনি আগে থেকে থামিয়ে রাখেন। আর "আমরা এটা deny-list-এ যোগ করব" কোনো plan নয়।

### Sampling, কারণ দুটি budget-ই সীমিত

একটি error service প্রতি event-এ bill করে, আর একজন মানুষ প্রতি issue ধরে triage করে।

| Signal | Rate | কেন |
| ------ | ---- | --- |
| Error | 100% | এগুলো বিরল, আর বিরলটাই আকর্ষণীয় |
| Performance trace | 1–10% | নিরবচ্ছিন্ন আর ব্যয়বহুল; একটি sample statistically যথেষ্ট |
| Session replay, সব session | ~1% | Storage আর privacy-র খরচ |
| Session replay, error থাকা session | 100% | আপনি আসলে চান শুধু সেই session, যেটা ভেঙেছে |

বেশিরভাগ noise আপনার code-এর নয়: script inject করা browser extension, bot traffic, আর `ResizeObserver
loop completed with undelivered notifications`, যেটা সাধারণত ক্ষতিকর নয়। Triage-এ নয়, client-এই filter করুন,
আর যে event-এর stack-এ আপনার নিজের origin-এর একটি frame-ও নেই, সেটা বাদ দিন।

### Event count নয়, user-এর ওপর প্রভাব দেখে alert করুন

Retry loop-এ আটকে থাকা একজন user-এর 500 event-এর spike কোনো incident নয়। পাঁচজন user checkout করতে পারছে না —
সেটা incident।

| Indicator | Target | Window |
| --------- | ------ | ------ |
| কোনো fatal error ছাড়া session | 99.5% | 24 h |
| Checkout শুরু → সম্পন্ন | 97% | 1 h |
| p75 LCP 2.5 s-এর নিচে | 90% | 24 h |

**সবার আগে যে frontend metric ধরবেন, তা হলো crash-free session**, কারণ এটা traffic দিয়ে normalise করে। একটি কাঁচা
error count ব্যস্ত দিনে spike করে, আর growth-এর আড়ালে একটি regression লুকিয়ে ফেলে। একটি rate এর কোনোটাই করে না।
Alerting-এর নিয়মকানুন [Chapter ?? — Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)-এ আছে, আর এখানেও
তা হুবহু খাটে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | কেন |
| --------- | --------- | --- |
| "Site কি slow?" | Field data, device অনুযায়ী ভাগ করা | আপনার laptop 75th percentile নয় |
| "এই page কেন slow?" | একটি lab run — trace আর waterfall | Deterministic, আর খুঁটিয়ে দেখা যায় |
| খারাপ INP, কিন্তু কোথায় তা জানা নেই | Attribution build | Interaction target-এর নাম বলে দেয় |
| এমন regression, যেটা শুধু CI-তে দেখা যায় | Lab, pipeline-এ | এটা দিয়ে pull request gate করুন |
| এমন crash, যেটা কেউ reproduce করতে পারে না | Breadcrumb, আর সেই session-এর replay | Repro-র সবচেয়ে কাছের জিনিস |
| এরপর কী ঠিক করবেন, তা ঠিক করা | ক্ষতিগ্রস্ত user-এর সংখ্যা, event count নয় | পরিমাণ নয়, প্রভাব |

## সাধারণ ভুল

❌ **Attribution ছাড়া vitals সংগ্রহ করা।** আপনি জানেন সমস্যা আছে, কিন্তু কোথায় তা জানেন না।
✅ প্রথম দিন থেকেই attribution build ব্যবহার করুন।

❌ **কোনো `unhandledrejection` listener নেই।** বেশিরভাগ ব্যর্থ `fetch` call চুপচাপ থাকে।
✅ দুটি window listener-ই রাখুন, সাথে framework boundary আর explicit capture।

❌ **Report-এ কোনো release version নেই।** প্রতিটি deploy baseline reset করে, আর কিছুই কখনো "নতুন" হয় না।
✅ Release stamp করুন, আর মিলিয়ে source map upload করুন।

❌ **Session replay default-ভাবে unmasked।** প্রথম যে form যোগ করবেন, সেটাই leak করবে।
✅ সবকিছু mask করুন, নির্দিষ্ট field জেনেবুঝে unmask করুন।

❌ **Error count দেখে alert করা।** এটা যতটা health track করে, ততটাই traffic track করে।
✅ Crash-free session আর completion rate দেখে alert করুন।

## 🔑 মূল শিক্ষা

- Lab data pull request gate করে, আর field data বলে কী নিয়ে কাজ করবেন। INP শুধু field-এই থাকে।
- Attribution build-ই একটি খারাপ metric-কে একটি নির্দিষ্ট element বা interaction-এ পরিণত করে।
- পুরো error coverage-এর জন্য চারটি capture point লাগে, আর সাধারণত `unhandledrejection`-টাই বাদ পড়ে।
- Release version আর upload করা source map-ই একটি minified production stack-কে আদৌ কাজের বানায়।
- শুরু করার frontend SLO (service-level objective) হলো crash-free session, কারণ একটি rate traffic-এর সাথে নড়ে না।

## Interview-এর প্রশ্ন

**Q: Lighthouse site-কে 95 দিচ্ছে, আর user-রা বলছে site slow। কে ঠিক?**

User-রা। Lighthouse হলো একটি device profile-এ একটি scripted load। এটা INP মাপতেই পারে না, কারণ কেউ page-এর সাথে
interact করে না। 75th percentile-এর field data বাস্তবতা বর্ণনা করে। সাধারণত এটা দেখাবে যে সমস্যাটা load নয়, বরং
mid-range phone-এ responsiveness। Lab run তবুও কাজের, কিন্তু রায় দেওয়ার জন্য নয়, diagnosis-এর জন্য।

**Q: একটি error report triage করার মতো হতে হলে তাতে কী থাকা দরকার?**

Release version, upload করা source map থেকে পড়ার মতো একটি stack, route, আর একটি user identifier। Identifier দিয়ে আপনি
event নয়, ক্ষতিগ্রস্ত মানুষ গুনতে পারেন। পারলে breadcrumb যোগ করুন: throw-এর আগের click আর request-গুলোই reproduction-এর
সবচেয়ে কাছের জিনিস। বিশেষ করে release version ছাড়া, আপনি একটি নতুন regression আর মাসের পর মাস ধরে fail করতে থাকা
কিছুর পার্থক্য বুঝতে পারবেন না।

**Q: এখানে privacy-র ঝুঁকি কী, আর এ নিয়ে আপনি কী করেন?**

যা কিছু সংগ্রহ হয়, সব browser ছেড়ে একটি third party-র কাছে যায়, আর session replay হলো কেউ আপনার product ব্যবহার করছে,
তার recording। প্রথমত, একটি before-send hook-এ redact করুন, যাতে শেষ সিদ্ধান্তটা আপনার দিকেই হয়। Replay input
default-ভাবে mask করুন, আর নির্দিষ্ট field জেনেবুঝে unmask করুন। নাম বা email নয়, একটি opaque user id পাঠান। আর
sensitive query parameter সরিয়ে ফেলুন: URL-এ token-ই সবচেয়ে সাধারণ অনিচ্ছাকৃত leak।

## এরপর কী পড়বেন

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — এই অধ্যায় যে metric-গুলো সংগ্রহ করে, আর প্রতিটি সংখ্যার মানে
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — lab-এর দিকের gate, যেটা এই field data দিয়ে calibrate করা উচিত
- [Chapter ?? — Observability ও Cost Engineering](#ch-observability) — একই নিয়মকানুন, server-এর দিকে
