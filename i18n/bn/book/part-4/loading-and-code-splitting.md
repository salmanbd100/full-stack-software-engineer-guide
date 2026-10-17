---
sourceHash: "18b9a150e70a68cf60be11f922b3a0f039102f0ff2bb115928034137f638f0a6"
title: "Loading, Code Splitting ও Bundle Budget"
translatedAt: "2026-10-17T01:40:52.236Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Loading, Code Splitting ও Bundle Budget {#ch-loading-and-code-splitting}

> কম byte পাঠান, বাকিটা পাঠান ঠিক দরকারের আগে, আর CI-তে একটি gate বসান, যাতে সাশ্রয়টা টিকে থাকে।

**এই অধ্যায়ে:** পিছিয়ে দিলে খরচ সরে যায় · route আর component splitting · prefetch বনাম preload · কী tree shaking আটকে দেয় · build ফেল করানো budget · third-party script

## 💡 মূল ধারণা

Page দ্রুত load করানোর উপায় মাত্র দুটি: **কম byte পাঠানো, অথবা পরে পাঠানো।**

পরে পাঠানোই code splitting। এটা কাজ করে, কারণ app যা ship করে তার বেশিরভাগই এক session-এ কখনো ব্যবহার হয় না। কিন্তু
পিছিয়ে দিলে খরচ সরে যায়, মুছে যায় না। আলাদা করা route তবুও একটি request। শুধু boot-এর সময় না হয়ে click-এর সময় হয়।
তাই দক্ষতাটা হলো জোর দিয়ে পিছিয়ে দেওয়া, তারপর user-এর ইচ্ছার প্রথম লক্ষণেই load করা, user অপেক্ষা শুরু করার আগে।

কম byte পাঠানোর কাজ একবার করলেই শেষ হয় না। Bundle size হলো **একটি ratchet, যা শুধু এক দিকে ঘোরে**। Optimisation-এর এক
সপ্তাহে 400 kB কমে, আর পরের quarter-এ 500 kB ফিরে আসে। টিকে থাকে শুধু মালিকসহ একটি budget আর একটি CI gate। আর ওজনের
বড় একটি অংশ third-party script, যাকে আপনি শুধু নিয়ন্ত্রণে রাখতে পারেন।

## কীভাবে কাজ করে

### Image: একটি attribute, আর একটি কাজ যা কখনো করবেন না

**Fold-এর নিচে lazy, hero-র জন্য eager:**

```html
<img src="chart.png" alt="Emissions by quarter" loading="lazy" width="800" height="600" />
<img src="hero.avif" alt="Dashboard" loading="eager" fetchpriority="high" width="1200" height="600" />
```

> ⚠️ **LCP image কখনো lazy-load করবেন না।** Hero-তে `loading="lazy"` দিলে metric ঠিক যে resource-এর অপেক্ষায়, সেটাই
> পিছিয়ে যায়। নিজের হাতে performance খারাপ করার সবচেয়ে সাধারণ উদাহরণ এটাই।

দুটিতেই `width` আর `height` রাখুন। Box-এর জায়গা না রেখে image পিছিয়ে দিলে load-এর সমস্যা বদলে হয়ে যায় layout-shift-এর
সমস্যা। দেখুন [Chapter ?? — Core Web Vitals](#ch-core-web-vitals)।

### Route-ই ভাগ করার স্বাভাবিক জায়গা

বেশিরভাগ user অল্প কয়েকটি route-এ যান। Route ধরে split করলে সবচেয়ে কম খাটুনিতে সবচেয়ে বড় লাভ।

**Route-এর স্তরে একটি Suspense boundary:**

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

File-based routing এটা আপনার হয়ে করে দেয়। **Component** split করুন (chart library, editor, map) শুধু তখন, যখন সেটা বড়
আর শর্তসাপেক্ষ: কোনো tab, modal বা permission-এর পেছনে।

**প্রতিটি lazy boundary-র একটি error boundary লাগে।** Chunk request ব্যর্থ হতে পারে। হয়তো deploy-এ file-এর নাম বদলে
গেছে, বা network কেটে গেছে। Boundary না থাকলে tree কোনো ব্যাখ্যা ছাড়াই unmount হয়ে যায়। Retry-এর pattern দেখুন
[Chapter ?? — Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming)-এ।

### Vendor chunk-এর ব্যাপারটা size নয়, cache কতদিন টেকে

Library code আর app code আলাদা করলে মোট byte কমে না। বদলায় **user-দের কত ঘন ঘন এগুলো আবার download করতে হয়।** App code
প্রতিটি deploy-এ বদলায়। Dependency বদলায় বছরে কয়েকবার। আলাদা রাখলে একটি release ছোট একটি file invalidate করে, বড়টা নয়।
দেখুন [Chapter ?? — Caching ও Asset Delivery](#ch-asset-delivery)। তবে বেশি ভাগ করবেন না। ত্রিশটি ছোট chunk round trip
আর খারাপ compression-এ যা খরচ করায়, তা সাশ্রয়ের চেয়ে বেশি।

### Prefetch, preload, আর ইচ্ছা দেখে preload

| Hint | কখন fetch করে | Priority | কীসের জন্য |
| ---- | ------- | -------- | --- |
| `preload` | এখনই, সমান্তরালে | বেশি | **এই** page-এর দরকারি এমন কিছু, যা parser দেরিতে খুঁজে পায় |
| `prefetch` | অবসর সময়ে | সবচেয়ে কম | এমন কিছু, যা **পরের** page-এর সম্ভবত লাগবে |
| `preconnect` | শুধু connection | — | এমন third-party origin, যেখানে শিগগিরই request যাবে |

প্রতিটি route prefetch করবেন না। Phone-এ অবসর সময়ের request-ও বর্তমান page-এর সঙ্গে প্রতিযোগিতা করে। মনে রাখার মতো
pattern হলো **ইচ্ছা দেখে preload**। Hover আর focus আসে click-এর কয়েকশো millisecond আগে, আর সাধারণত সেটুকুই যথেষ্ট।

**Hover আর focus-এ chunk warm করে রাখুন:**

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

### Tree shaking, আর যে তিনটি জিনিস একে আটকে দেয়

Tree shaking বাদ দেয় সেই export-গুলো, যা আপনি কখনো ব্যবহার করেন না। কিন্তু বাদ দেওয়া নিরাপদ, তা প্রমাণ করতে হয়। তাই module
graph আড়াল করে এমন যেকোনো কিছু tree shaking বন্ধ করে দেয়।

| শর্ত | কী এটা ভাঙে |
| ----------- | -------------- |
| ES module | CommonJS build — `require` dynamic, তাই কোনো কিছু অব্যবহৃত বলে প্রমাণ করা যায় না |
| Production build | Development build এটা করে না |
| Import-এর সময় কোনো side effect নয় | যে module import হওয়ার সময় global বদলায়, তাকে বাদ দেওয়া যায় না |

**Import-এর ধরন আসলে size-এর সিদ্ধান্ত — একই function, খরচ পঁয়ত্রিশ গুণ:**

```typescript
import _ from "lodash"; // ❌ the whole CommonJS build, around 70 kB
import { debounce } from "lodash-es"; // ✅ the ES module build, around 2 kB
```

Optimise করার আগে `rollup-plugin-visualizer`-এর treemap পড়ুন, **compressed** size ধরে। Minification আর Brotli মিলে
JavaScript-এর 80–90% কমিয়ে দেয়, তাই raw size বিভ্রান্ত করে। প্রায়ই একটি dependency bundle-এর এক-তৃতীয়াংশ নিয়ে বসে থাকে,
আর সেটা খুব কমই আপনার আন্দাজ করা dependency।

### Budget তখনই budget, যখন সেটা build ফেল করায়

Document-এ লেখা একটি সংখ্যা শুধু একটি ইচ্ছা। Budget-এর দুটি জিনিস লাগে: **একজন মালিক**, যিনি ঠিক করেন সংখ্যাটা কখন সরবে,
আর **একটি CI gate**, যা build ফেল করায়। দুই ধরনের gate দুই ধরনের regression ধরে।

**প্রতিটি entry point-এর asset size — দ্রুত, প্রতিটি pull request-এ চলে:**

```json
{
  "size-limit": [
    { "path": "dist/assets/index-*.js", "limit": "170 kB" },
    { "path": "dist/assets/react-vendor-*.js", "limit": "45 kB" }
  ]
}
```

দ্বিতীয় gate হলো **metric budget**। Lighthouse CI একটি preview deploy-এর ওপর চলে, আর LCP 2,500 ms বা blocking time 300 ms
পেরোলে ফেল করে। Size limit ধরে কেউ যোগ করা একটি dependency। Metric budget ধরে জিনিস *কীভাবে* load হয় তার বদল, যেমন
একটি script, যা render-blocking হয়ে গেছে।

| নিয়ম | কেন |
| ---- | --- |
| Limit রাখুন আজকের সংখ্যার ঠিক ওপরে | যে budget শুরু থেকেই লাল, এক সপ্তাহের মধ্যে সেটা বন্ধ করে দেওয়া হয় |
| Build ফেল করান, শুধু warning দেবেন না | Log-এ একটি warning কোনো budget নয় |
| Pull request-এ পার্থক্যটা post করুন | "+14 kB" দেখে review-এ প্রশ্ন ওঠে; লাল ক্রস দেখে লোকে শুধু আবার চালায় |

> ⚠️ **যা বদলাতে থাকে:** Lighthouse assertion-এর নাম, bundle-size action আর CDN compression-এর default, সবই বদলায়। টেকসই
> নীতি হলো দুটি gate: **প্রতিটি pull request-এ একটি নির্ধারিত size check, আর সত্যিকারের deploy করা load-এর ওপর একটি metric
> check।** Copy করার আগে config-এর এখনকার format দেখে নিন।

### যে byte আপনার নিয়ন্ত্রণে নেই

Commercial page-এ analytics, tag manager, chat widget আর consent tool প্রায়ই JavaScript-এর বেশিরভাগ জুড়ে থাকে। Tag manager
tree-shake করা যায় না। তবে নিয়ন্ত্রণে রাখা যায়।

| নিয়ন্ত্রণ | যা আটকায় |
| ------- | ---------------- |
| প্রতিটি নতুন tag-এর একজন মালিক আর একটি review | Tag manager-এর review ছাড়া deploy-এর পথ হয়ে যাওয়া |
| প্রতিটি script-এর একটি কারণ আর মেয়াদ শেষের তারিখ | এমন script, যার কথা কারো মনে নেই, অথচ বছরের পর বছর load হচ্ছে |
| Idle সময়ে বা interaction-এর পরে load, head-এ কখনো নয় | Vendor-এর কারণে আপনার first paint আটকে যাওয়া |
| Third-party byte-এর জন্য budget-এ আলাদা একটি line | First-party সাশ্রয় দিয়ে চুপচাপ vendor-এর বৃদ্ধির দাম মেটানো |

Tag manager হলো **code review ছাড়া একটি production deploy**। Marketing কোনো pull request ছাড়াই প্রতিটি user-এর কাছে যেকোনো
JavaScript ship করতে পারে। Container-এর বদলকে release হিসেবে দেখুন, মালিক আর rollback-সহ। নইলে আপনার budget শুধুই
পরামর্শ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী করবেন | কেন |
| --------- | -- | --- |
| এমন route, যেখানে বেশিরভাগ user কখনো যান না | Split করুন | সবচেয়ে কম খাটুনিতে সবচেয়ে বড় লাভ |
| Tab বা modal-এর পেছনে 300 kB-এর library | Error boundary-সহ split করুন | বড় আর শর্তসাপেক্ষ, আদর্শ উদাহরণ |
| Fold-এর নিচে 5 kB-এর component | যেমন আছে রাখুন | Request-এর খরচ byte-এর চেয়ে বেশি |
| First paint-এর দরকারি যেকোনো কিছু | কখনো পিছিয়ে দেবেন না | Critical path-এ একটি round trip বেড়ে যায় |
| প্রতিটি release-এ size একটু একটু বাড়ছে | মালিকসহ CI-তে একটি size limit | Team বদলালেও টিকে থাকে, এমন একমাত্র সমাধান |
| গত quarter-এ যোগ হওয়া একটি vendor script | মালিক, মেয়াদ, আর পিছিয়ে দিন | বেশিরভাগ commercial page এখানেই হারে |

## সাধারণ ভুল

❌ **Error boundary ছাড়া lazy boundary।** Chunk request ব্যর্থ হলে tree চুপচাপ unmount হয়ে যায়।
✅ প্রতিটি boundary মুড়ে দিন, এমন fallback দিয়ে যাতে retry করার সুযোগ থাকে।

❌ **সবকিছু split করা, বা প্রতিটি route prefetch করা।** Request বাড়ে, compression খারাপ হয়, আর বর্তমান page-এর bandwidth
চুরি যায়।
✅ আগে route ধরে split করুন, তারপর বড় শর্তসাপেক্ষ component; prefetch করুন পরের এক-দুটি ধাপ।

❌ **যে budget শুধু warning দেয়, বা শুরু থেকেই লাল।** Log কেউ পড়ে না, আর লাল gate বন্ধ করে দেওয়া হয়।
✅ Build ফেল করান, আর limit রাখুন আজকের ঠিক ওপরে। তারপর ইচ্ছে করে, ধাপে ধাপে সেটা কমান।

## 🔑 মূল শিক্ষা

- পিছিয়ে দিলে খরচ মুছে যায় না, সরে যায়। তাই প্রতিটি split-এর সঙ্গে ইচ্ছার প্রথম লক্ষণেই load করার ব্যবস্থা রাখুন।
- সবচেয়ে বেশি লাভ route splitting-এ। Component splitting লাভ দেয় শুধু তখন, যখন code বড় আর শর্তসাপেক্ষ।
- Tree shaking-এর জন্য লাগে ES module, production build, আর import-এর সময় কোনো side effect না থাকা। সিদ্ধান্ত নিন শুধু compressed size দেখে।
- Budget টেকে শুধু মালিক আর CI gate থাকলে: প্রতিটি pull request-এ size check, আর সত্যিকারের load-এ metric check।
- Page-এর JavaScript-এর বেশিরভাগই প্রায়ই third-party script, আর এর হাতল মাত্র তিনটি: মালিকানা, মেয়াদ আর পিছিয়ে দেওয়া।

## Interview-এর প্রশ্ন

**Q: Code splitting কি শুধু দেরিটা click-এর সময়ে সরিয়ে দেয় না?**

দেয়, আর এজন্যই splitting কৌশলের অর্ধেক মাত্র। বাকি অর্ধেক হলো ইচ্ছার প্রথম সংকেতেই chunk warm করে রাখা। Hover বা focus
সাধারণত click-এর কয়েকশো millisecond আগে আসে। ফলে শুরুর bundle ছোট থাকে, আর user কোনো অপেক্ষা টের পান না।

**Q: একটি library থেকে একটি function import করলেন, আর bundle 70 kB বেড়ে গেল। কী হয়েছে?**

প্রায় নিশ্চিতভাবে CommonJS build থেকে default import। `require` dynamic, তাই bundler library-র কোনো অংশই অব্যবহৃত বলে
প্রমাণ করতে পারে না, আর পুরোটাই রেখে দেয়। সমাধান হলো ES module build থেকে named import। Import-এর ধরন আসলে size-এর
সিদ্ধান্ত, style-এর নয়।

**Q: এক বছর ধরে bundle size আবার বেড়ে যাওয়া কীভাবে আটকাবেন?**

Budget-কে একজন মালিক দিন, আর প্রতিটি entry point-এ এমন size limit দিন, যা build ফেল করায়, আজকের সংখ্যার ঠিক ওপরে।
প্রতিটি pull request-এ size-এর বদলটা post করুন। "+14 kB" দেখে review-এ প্রশ্ন ওঠে; লাল ক্রস দেখে লোকে আবার চালায়। এর সঙ্গে
preview deploy-এ একটি metric budget রাখুন, কারণ size check দেখতে পায় না কোন script render-blocking হয়ে গেছে।

**Q: একটি page 2 MB JavaScript ship করে, যার অর্ধেক third-party। কোথা থেকে শুরু করবেন?**

First-party অর্ধেকটা splitting আর refactoring-এর কাজ। Third-party অর্ধেকটা নিয়ন্ত্রণের কাজ। প্রতিটি script-এর নাম দেওয়া
একজন মালিক আর একটি কারণ থাকবে। যার দাবিদার নেই, সেটা বাদ, আর কোনো vendor-এর কিছু head-এ load হবে না। Third-party byte-কে
budget-এ আলাদা line দিন, নইলে first-party-র পরিশ্রম চুপচাপ vendor-এর বৃদ্ধির খরচ জোগাবে।

## এরপর কী পড়বেন

- [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) — loading-এর এই সিদ্ধান্তগুলো যে metric নড়ায়
- [Chapter ?? — Production-এ মাপা](#ch-measuring-in-production) — যে field data দেখে metric budget ঠিক করা উচিত
- [Chapter ?? — Vite, Rust Bundler ও Dev Loop](#ch-vite-and-the-dev-loop) — chunk আর tree shaking-এর পেছনের build tooling
