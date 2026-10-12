---
sourceHash: "18b9a150e70a68cf60be11f922b3a0f039102f0ff2bb115928034137f638f0a6"
title: "Loading, Code Splitting ও Bundle Budget"
translatedAt: "2026-10-12T12:18:09.617Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Loading, Code Splitting ও Bundle Budget {#ch-loading-and-code-splitting}

> কম byte পাঠান, বাকিটা দরকারের ঠিক আগে পাঠান, আর CI-তে একটি gate বসান যাতে সাশ্রয়টা টিকে থাকে।

**এই অধ্যায়ে:** defer করলে খরচ সরে যায় · route আর component splitting · prefetch বনাম preload · কী tree shaking-কে ব্যর্থ করে · একটি budget যা build fail করায় · third-party script

## 💡 মূল ধারণা

একটি page দ্রুত load করানোর উপায় মাত্র দুটি: **কম byte পাঠান, অথবা পরে পাঠান।**

পরে পাঠানো হলো code splitting। এটা কাজ করে কারণ একটি app যা ship করে, তার বেশিরভাগই একটি session-এ কখনো ব্যবহার হয় না।
কিন্তু defer করলে খরচ সরে যায়; মুছে যায় না। একটি split route তবুও একটি request। শুধু সেটা boot-এর বদলে click-এর সময় ঘটে।
তাই দক্ষতা হলো জোর দিয়ে defer করা, তারপর ইচ্ছার প্রথম লক্ষণেই load করা, user অপেক্ষা শুরু করার আগে।

কম byte পাঠানোর কাজ একবারে শেষ হয় না। Bundle size একটি **ratchet, যা শুধু এক দিকে ঘোরে**। একটি optimisation week 400 kB
কমায়, আর পরের quarter 500 kB ফিরিয়ে আনে। যা টিকে থাকে, তা হলো একজন owner আর একটি CI gate সহ একটি budget। আর ওজনের অনেকটাই
third-party script, যাকে আপনি শুধু নিয়ন্ত্রণ করতে পারেন।

## কীভাবে কাজ করে

### Image: একটি attribute, আর একটি কাজ যা করা চলবে না

**Fold-এর নিচে lazy, hero-র জন্য eager:**

```html
<img src="chart.png" alt="Emissions by quarter" loading="lazy" width="800" height="600" />
<img src="hero.avif" alt="Dashboard" loading="eager" fetchpriority="high" width="1200" height="600" />
```

> ⚠️ **LCP image কখনো lazy-load করবেন না।** Hero-তে `loading="lazy"` ঠিক সেই resource-টিকে পিছিয়ে দেয়, যার জন্য metric
> অপেক্ষা করে। এটা নিজের হাতে তৈরি করা সবচেয়ে সাধারণ performance regression।

দুটোতেই `width` আর `height` রাখুন। Box-এর জায়গা না রেখে একটি image defer করলে load-এর সমস্যা layout-shift-এর সমস্যায়
বদলে যায়। দেখুন [Chapter ?? — Core Web Vitals](#ch-core-web-vitals)।

### Route-ই স্বাভাবিক split point

বেশিরভাগ user হাতে গোনা কয়েকটি route-এ যান। Route ধরে split করলে সবচেয়ে কম কাজে সবচেয়ে বড় লাভ।

**Route-স্তরে একটি Suspense boundary:**

```tsx
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Reports = lazy(() => import("./pages/Reports"));

function App() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Suspense>
  );
}
```

File-based routing এটা আপনার হয়ে করে দেয়। একটি **component** (একটি chart library, একটি editor, একটি map) split করুন শুধু
তখনই, যখন সেটা বড় আর শর্তসাপেক্ষ: একটি tab, একটি modal বা একটি permission-এর পেছনে।

**প্রতিটি lazy boundary-র একটি error boundary লাগে।** একটি chunk request fail করতে পারে। একটি deploy file-এর নাম বদলে দিয়েছে,
অথবা network চলে গেছে। Boundary ছাড়া tree কোনো ব্যাখ্যা ছাড়াই unmount হয়ে যায়। Retry pattern-এর জন্য দেখুন
[Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming)।

### Vendor chunk-এর ব্যাপারটা cache-এর আয়ু, আকার নয়

Library code-কে app code থেকে আলাদা করলে মোট byte কমে না। বদলায় **user-রা কত ঘন ঘন সেগুলো আবার download করেন।** App code
প্রতিটি deploy-এ বদলায়। Dependency বছরে কয়েকবার বদলায়। আলাদা রাখলে একটি release একটি ছোট file invalidate করে, বড় file
নয়। দেখুন [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery)। তবে অতিরিক্ত split করবেন না। ত্রিশটি ছোট chunk
round trip আর খারাপ compression-এ যতটা খরচ করে, ততটা বাঁচায় না।

### Prefetch, preload, আর ইচ্ছা দেখে preload

| Hint | কখন fetch করে | Priority | কীসের জন্য |
| ---- | ------- | -------- | --- |
| `preload` | এখনই, সমান্তরালে | উঁচু | **এই** page-এর দরকারি কিছু, যা parser দেরিতে খুঁজে পায় |
| `prefetch` | অলস সময়ে | সবচেয়ে নিচু | **পরের** page-এর সম্ভবত দরকার হবে এমন কিছু |
| `preconnect` | শুধু connection | — | একটি third-party origin, যেখান থেকে আপনি শিগগিরই request করবেন |

প্রতিটি route prefetch করবেন না। একটি phone-এ অলস সময়ের request-ও বর্তমান page-এর সাথে প্রতিযোগিতা করে। মনে রাখার মতো
pattern হলো **ইচ্ছা দেখে preload**। Hover আর focus click-এর কয়েকশো millisecond আগে আসে, যা সাধারণত যথেষ্ট।

**Hover আর focus-এ chunk গরম করে রাখুন:**

```tsx
const AdminPanel = lazy(() => import("./AdminPanel"));
const warm = (): Promise<unknown> => import("./AdminPanel"); // the second call is a cache hit

function Nav() {
  // onFocus matters as much as onMouseEnter: keyboard users get the same head start.
  return (
    <a href="/admin" onMouseEnter={warm} onFocus={warm}>
      Admin
    </a>
  );
}
```

### Tree shaking, আর যে তিনটি জিনিস একে ব্যর্থ করে

Tree shaking সেই export-গুলো বাদ দেয়, যা আপনি কখনো ব্যবহার করেন না। একে প্রমাণ করতে হয় যে বাদ দেওয়াটা নিরাপদ, তাই যা কিছু
module graph লুকায়, তা একে বন্ধ করে দেয়।

| শর্ত | কী এটা ভাঙে |
| ----------- | -------------- |
| ES module | একটি CommonJS build — `require` dynamic, তাই কোনো কিছু অব্যবহৃত বলে প্রমাণ করা যায় না |
| একটি production build | Development build এটা বাদ দেয় |
| Import-এর সময় কোনো side effect নয় | যে module import হওয়ার সময় global বদলায়, তাকে বাদ দেওয়া যায় না |

**Import-এর ধরন একটি আকারের সিদ্ধান্ত — একই function, পঁয়ত্রিশ গুণ খরচ:**

```typescript
import _ from "lodash"; // ❌ the whole CommonJS build, around 70 kB
import { debounce } from "lodash-es"; // ✅ the ES module build, around 2 kB
```

Optimise করার আগে `rollup-plugin-visualizer` থেকে treemap পড়ুন, **compressed** size ধরে। Minification আর Brotli মিলে
JavaScript-এর 80–90% সরিয়ে দেয়, তাই raw size বিভ্রান্ত করে। প্রায়ই একটি dependency bundle-এর এক-তৃতীয়াংশ নেয়, আর কদাচিৎ
সেটা আপনার আন্দাজ করা dependency।

### Budget তখনই budget, যখন সেটা build fail করায়

একটি document-এ লেখা একটি সংখ্যা শুধু একটি ইচ্ছা। একটি budget-এর দুটি জিনিস লাগে: **একজন owner**, যিনি ঠিক করেন কখন এটা
নড়বে, আর **একটি CI gate**, যা build fail করায়। দুই ধরনের gate আলাদা আলাদা regression ধরে।

**প্রতিটি entry point-এর asset size — দ্রুত, প্রতিটি pull request-এ চলে:**

```json
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "170 kB" },
    { "path": "dist/assets/react-vendor-*.js", "limit": "45 kB" }
  ]
}
```

দ্বিতীয় gate হলো একটি **metric budget**। Lighthouse CI একটি preview deploy-এর ওপর চলে, আর LCP 2,500 ms পার হলে বা blocking
time 300 ms পার হলে fail করে। একটি size limit ধরে কারো যোগ করা একটি dependency। একটি metric budget ধরে জিনিসগুলো *কীভাবে* load
হয় তার পরিবর্তন, যেমন একটি script যা render-blocking হয়ে গেছে।

| নিয়ম | কেন |
| ---- | --- |
| Limit আজকের সংখ্যার ঠিক ওপরে রাখুন | যে budget লাল দিয়ে শুরু হয়, সেটা এক সপ্তাহেই বন্ধ করে দেওয়া হয় |
| Build fail করান, warning দেবেন না | Log-এ একটি warning কোনো budget নয় |
| Pull request-এ পার্থক্যটি post করুন | "+14 kB" review-এ একটি প্রশ্ন তোলে; একটি লাল ক্রস শুধু আবার চালানো হয় |

> ⚠️ **যা বদলাতে থাকে:** Lighthouse assertion-এর নাম, bundle-size action আর CDN compression-এর default — সবই বদলায়। টেকসই
> নীতি হলো দুটি gate: **প্রতিটি pull request-এ একটি নির্ধারিত size check, আর সত্যিকারের deploy করা একটি load-এর ওপর একটি
> metric check।** কপি করার আগে বর্তমান config format যাচাই করুন।

### যে byte আপনার নিয়ন্ত্রণে নেই

একটি commercial page-এ analytics, tag manager, chat widget আর consent tool প্রায়ই JavaScript-এর বেশিরভাগ। একটি tag manager-কে
tree-shake করা যায় না। একে নিয়ন্ত্রণ করা যায়।

| নিয়ন্ত্রণ | যা আটকায় |
| ------- | ---------------- |
| প্রতিটি নতুন tag-এর জন্য একজন owner আর একটি review | Tag manager-এর review-ছাড়া deploy channel হয়ে ওঠা |
| প্রতিটি script-এর একটি কারণ আর একটি মেয়াদ শেষের তারিখ | এমন script, যা কারো মনে নেই, অথচ বছরের পর বছর load হচ্ছে |
| অলস সময়ে বা interaction-এর পরে load, head-এ কখনো নয় | একটি vendor আপনার first paint আটকে দেওয়া |
| Third-party byte-এর জন্য আলাদা একটি budget line | First-party সাশ্রয় চুপচাপ vendor-এর বৃদ্ধির খরচ মেটানো |

একটি tag manager হলো **code review ছাড়া একটি production deploy**। Marketing কোনো pull request ছাড়াই প্রতিটি user-এর কাছে যেকোনো
JavaScript ship করতে পারে। Container-এর পরিবর্তনকে release হিসেবে ধরুন, একজন owner আর একটি rollback সহ। নইলে আপনার budget
শুধু একটি পরামর্শ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | যা করবেন | কেন |
| --------- | -- | --- |
| যে route-এ বেশিরভাগ user কখনো যান না | Split করুন | সবচেয়ে কম কাজে সবচেয়ে বড় লাভ |
| একটি tab বা modal-এর পেছনে 300 kB-এর একটি library | Split করুন, একটি error boundary সহ | বড় আর শর্তসাপেক্ষ — আদর্শ ক্ষেত্র |
| Fold-এর নিচে 5 kB-এর একটি component | রেখে দিন | Request-এর খরচ byte-এর চেয়ে বেশি |
| First paint-এর দরকারি যেকোনো কিছু | কখনো defer করবেন না | Critical path-এ একটি round trip যোগ হয় |
| প্রতিটি release-এ আকার একটু একটু বাড়ছে | CI-তে একটি size limit, একজন owner সহ | একমাত্র fix যা team বদলালেও টিকে থাকে |
| গত quarter-এ যোগ হওয়া একটি vendor script | Owner, মেয়াদ, আর defer করুন | বেশিরভাগ commercial page এখানেই হারে |

## সাধারণ ভুল

❌ **Error boundary ছাড়া একটি lazy boundary।** একটি fail করা chunk request চুপচাপ tree unmount করে দেয়।
✅ প্রতিটি boundary wrap করুন, এমন একটি fallback দিয়ে যা retry করার সুযোগ দেয়।

❌ **সবকিছু split করা, বা প্রতিটি route prefetch করা।** বেশি request, খারাপ compression, আর বর্তমান page থেকে bandwidth
কেড়ে নেওয়া।
✅ আগে route ধরে split করুন, তারপর বড় শর্তসাপেক্ষ component; পরের এক-দুটি ধাপ prefetch করুন।

❌ **এমন budget যা শুধু warning দেয়, বা লাল দিয়ে শুরু হয়।** Log কেউ পড়ে না, আর লাল gate বন্ধ করে দেওয়া হয়।
✅ Build fail করান আর limit আজকের ঠিক ওপরে রাখুন। তারপর ইচ্ছাকৃতভাবে, ধাপে ধাপে কমান।

## 🔑 মূল শিক্ষা

- Defer করলে খরচ মুছে যায় না, সরে যায়, তাই প্রতিটি split-এর সাথে ইচ্ছার প্রথম লক্ষণেই load জুড়ে দিন।
- Route splitting সবচেয়ে মূল্যবান split, আর component splitting তখনই লাভ দেয়, যখন code বড় আর শর্তসাপেক্ষ।
- Tree shaking-এর লাগে ES module, একটি production build আর import-এর সময় কোনো side effect না থাকা, আর সিদ্ধান্ত নেওয়ার মতো
  একমাত্র সংখ্যা compressed size।
- একটি budget টেকে শুধু একজন owner আর একটি CI gate থাকলে: প্রতিটি pull request-এ একটি size check আর সত্যিকারের load-এর ওপর
  একটি metric check।
- Third-party script প্রায়ই page-এর JavaScript-এর বেশিরভাগ, আর একমাত্র lever হলো ownership, মেয়াদ আর defer করা।

## Interview-এর প্রশ্ন

**Q: Code splitting কি শুধু delay-টাকে click-এর সময়ে সরিয়ে দেয় না?**

দেয়, আর এ কারণেই splitting কৌশলের মাত্র অর্ধেক। বাকি অর্ধেক হলো ইচ্ছার প্রথম সংকেতেই chunk গরম করে রাখা। Hover বা focus
সাধারণত click-এর কয়েকশো millisecond আগে আসে। এতে পাওয়া যায় একটি ছোট initial bundle, আর এমন কোনো অপেক্ষা নেই যা user
দেখতে পান।

**Q: আপনি একটি library থেকে একটি function import করলেন আর bundle 70 kB বেড়ে গেল। কী ঘটেছে?**

প্রায় নিশ্চিতভাবে একটি CommonJS build-এর বিপরীতে একটি default import। `require` dynamic, তাই bundler প্রমাণ করতে পারে না
library-র কোনো অংশ অব্যবহৃত, আর পুরোটাই রেখে দেয়। Fix হলো ES module build থেকে একটি named import। Import-এর ধরন একটি আকারের
সিদ্ধান্ত, style-এর নয়।

**Q: এক বছর ধরে bundle size-এর regression কীভাবে আটকাবেন?**

Budget-কে একজন owner দিন, আর প্রতিটি entry point-এর জন্য একটি size limit, যা build fail করায়, আজকের ঠিক ওপরে set করা।
প্রতিটি pull request-এ আকারের পরিবর্তন post করুন। "+14 kB" review-এ একটি প্রশ্ন পায়; একটি লাল ক্রস আবার চালানো হয়। এর সাথে
একটি preview deploy-এ একটি metric budget জুড়ুন, কারণ একটি size check render-blocking হয়ে যাওয়া script দেখতে পায় না।

**Q: একটি page 2 MB JavaScript ship করে, আর তার অর্ধেক third-party। কোথা থেকে শুরু করবেন?**

First-party অর্ধেকটি splitting আর refactoring-এর কাজ। Third-party অর্ধেকটি governance-এর কাজ। প্রতিটি script-এর একজন নির্দিষ্ট
owner আর একটি কারণ থাকে। যার দাবিদার নেই, সেটা বাদ যায়, আর কোনো vendor-এর কিছুই head-এ load হয় না। Third-party byte-কে নিজস্ব
budget line দিন, নইলে first-party পরিশ্রম চুপচাপ vendor-এর বৃদ্ধির খরচ জোগায়।

## এরপর কী পড়বেন

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — loading-এর এই সিদ্ধান্তগুলো যে metric নড়ায়
- [Chapter ?? — Production-এ মাপা](#ch-measuring-in-production) — যে field data-র ভিত্তিতে একটি metric budget ঠিক করা উচিত
- [Chapter ?? — Vite, Rust Bundler ও Dev Loop](#ch-vite-and-the-dev-loop) — chunk আর tree shaking-এর পেছনের build tooling
