---
sourceHash: "c736066c381b4006b3b43c6802d88ad0eca4fe7013d3e656d6cca98de3edc391"
title: "Observer API"
translatedAt: "2026-10-12T07:52:55.289Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Observer API {#ch-observer-apis}

> Scroll আর resize handler-এর জায়গায় চারটি browser API ব্যবহার করুন, যেগুলো সেকেন্ডে ষাটবার জিজ্ঞেস না করে কিছু ঘটলে নিজেরাই জানিয়ে দেয়।

**এই অধ্যায়ে:** polling কেন সবসময়ই ভুল ছিল · IntersectionObserver · ResizeObserver · MutationObserver · PerformanceObserver · cleanup-এর নিয়ম

## 💡 মূল ধারণা

একটি element কখন viewport-এ ঢোকে, কখন আকার বদলায়, বা কখন নতুন child পায় — browser সেটা আগে থেকেই জানে। Observer
আসার আগে এটা জানার একমাত্র উপায় ছিল জিজ্ঞেস করা। আপনি একটি `scroll` listener লিখতেন, যেটা প্রতিটি frame-এ চলে।
অথবা একটি `resize` listener, যেটা ঝড়ের মতো fire করে। অথবা একটি `setInterval`, যেটা DOM check করে। এর সবই main
thread-এ চলে। এর ভেতরের কাজ সাধারণত geometry পড়ে, আর সেটা browser-কে উত্তর দেওয়ার আগে layout শেষ করতে বাধ্য করে।

Observer ব্যাপারটা উল্টে দেয়। আপনি একবার আগ্রহ register করেন, আর জিনিসটা সত্যিই ঘটলে browser আপনাকে call করে।
Browser আগেই যে measurement হিসাব করে রেখেছিল, সেটাই আপনাকে দেয়। তাই আপনার কোনো কাজ layout-এ বাধ্য করে না।

> Observer scroll handler-এর একটি সুন্দর syntax নয়। পার্থক্যটা হলো: browser-এর আগেই হিসাব করা geometry পড়া, বনাম
> আপনাকে উত্তর দিতে browser-কে দিয়ে আবার geometry হিসাব করানো।

## কীভাবে কাজ করে

চারটি observer, একই গড়ন। একটি callback দিয়ে construct করুন, target-গুলোর ওপর `observe` call করুন, আর কাজ শেষ হলে
`disconnect` call করুন।

| Observer | আপনাকে জানায় | যার জায়গা নেয় |
| -------- | --------- | -------- |
| `IntersectionObserver` | একটি element একটি viewport বা ancestor-এ ঢুকেছে বা বেরিয়েছে | `scroll` + `getBoundingClientRect()` |
| `ResizeObserver` | একটি element-এর নিজের box-এর আকার বদলেছে | `resize` + প্রতি element-এ measurement |
| `MutationObserver` | একটি node-এর নিচের DOM বদলেছে | Polling, বা method patch করা |
| `PerformanceObserver` | একটি performance entry record হয়েছে | Timer দিয়ে `performance.getEntries()` পড়া |

### IntersectionObserver

Interview-এ সবচেয়ে গুরুত্বপূর্ণ এটাই। Lazy loading, infinite scroll, sticky-header-এর state আর impression tracking —
সবই একই সমস্যা।

```typescript
// `rootMargin` grows the trigger area: start loading 200px before it is visible.
const observer = new IntersectionObserver(
  (entries: IntersectionObserverEntry[]) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      loadImage(entry.target as HTMLImageElement);
      observer.unobserve(entry.target); // Once is enough.
    }
  },
  { rootMargin: "200px", threshold: 0 },
);

document.querySelectorAll("img[data-src]").forEach((img: Element) => observer.observe(img));
```

Element-এর কতটা দেখা যেতে হবে, সেটা `threshold`। `0` মানে এক pixel, `1` মানে পুরোটা, আর একটি array দিলে প্রতিটি
সীমা পার হওয়ার সময় call করা হয়। `root`-এর default হলো viewport, আর এটা যেকোনো scroll করা ancestor হতে পারে।

### ResizeObserver

এটা প্রতি element-এর আকার দেয়, যা window-এর `resize` পারে না। একটি panel খোলায় sidebar-এর width বদলে যেতে পারে,
window-এ কোনো event ছাড়াই।

```typescript
const chart: Element = document.querySelector(".chart")!;

const resize = new ResizeObserver((entries: ResizeObserverEntry[]) => {
  for (const entry of entries) {
    // Already measured by the browser — reading this does not force layout.
    const { inlineSize, blockSize } = entry.contentBoxSize[0];
    redraw(chart, inlineSize, blockSize);
  }
});

resize.observe(chart);
```

> ⚠️ **`ResizeObserver` callback-এর ভেতরে DOM-এ লিখলে loop হতে পারে।** Observer যে আকার দেখছে, callback যদি সেটাই
> বদলায়, তাহলে এটা আবার fire করে। Browser cycle-টি ধরে ফেলে, আর আটকে না গিয়ে
> `ResizeObserver loop completed with undelivered notifications` log করে। এই message-কে আপনার callback-এর bug হিসেবে
> ধরুন, console থেকে ছেঁকে ফেলার মতো noise হিসেবে নয়।

### MutationObserver

যে DOM আপনার নিয়ন্ত্রণে নেই, তার জন্য এটা ব্যবহার করুন। যেমন third-party widget, rich-text editor, বা কোনো extension-এর
inject করা content। আপনার নিজের component-এর ভেতরে উত্তর হলো state। সেখানে mutation observer থাকা মানে কিছু একটা
ভুল হয়েছে।

### PerformanceObserver

Core Web Vitals পড়ার একমাত্র সঠিক উপায় এটাই, কারণ page load হওয়ার পরেও metric-গুলো বদলায়। বড় element আসার সাথে
সাথে LCP (largest contentful paint) update হয়। Page hidden হওয়া পর্যন্ত CLS (cumulative layout shift) যোগ হতেই
থাকে। `load`-এর সময় নেওয়া একটি snapshot এর কিছুই মাপে না।

```typescript
// `buffered: true` delivers entries recorded before this observer existed.
new PerformanceObserver((list: PerformanceObserverEntryList) => {
  for (const entry of list.getEntries()) {
    report({ metric: entry.entryType, value: entry.startTime });
  }
}).observe({ type: "largest-contentful-paint", buffered: true });
```

## কখন ব্যবহার করবেন

| পরিস্থিতি | যেটা ব্যবহার করবেন | কেন |
| --------- | --------- | --- |
| Lazy loading, infinite scroll, impression | `IntersectionObserver` | কোনো scroll handler নেই, কোনো forced layout নেই |
| যে component নিজের আকারে আবার draw হয় | `ResizeObserver` | Window হয়তো কখনো বদলাবেই না |
| যে layout-কে শুধু আকার অনুযায়ী নিজেকে *style* করতে হবে | একটি container query | কোনো JavaScript-ই নেই — Part II-এর CSS অধ্যায় দেখুন |
| Third-party DOM-এ সাড়া দেওয়া | `MutationObserver` | আর কিছুই ওই পরিবর্তনগুলো দেখতে পায় না |
| আসল user-এর performance মাপা | `PerformanceObserver` | Value-গুলো পরে গিয়ে চূড়ান্ত হয় |

**যেখানে আছে, সেখানে native বিকল্পকে প্রাধান্য দিন:** image আর iframe-এ `loading="lazy"`, off-screen rendering-এর
কাজের জন্য `content-visibility: auto`, আর CSS `position: sticky`। প্রতিটিই একটি observer-কে পুরোপুরি সরিয়ে দেয়, আর
platform-এর version সবসময় আপনারটার চেয়ে সস্তা।

## সাধারণ ভুল

**❌ কখনো disconnect না করা।** Observer তার target-গুলোর reference ধরে রাখে, আর তার callback যা কিছু close over করে,
সব ধরে রাখে। তাই যে component observe করে কিন্তু কখনো disconnect করে না, সে তার পুরো scope leak করে। Teardown-এ
disconnect করুন: `useEffect`-এর cleanup, `onDestroy`, বা `disconnectedCallback`।

```typescript
// The cleanup is the API contract, not an optimisation.
const io = new IntersectionObserver(onIntersect);
io.observe(el);
return () => io.disconnect();
```

**❌ প্রতি element-এ একটি করে observer।** একটি observer instance হাজার হাজার target সামলায়, আর তাদের entry-গুলো এক
callback-এ batch করে দেয়। এক হাজার instance মানে এক হাজার callback আর এক হাজার allocation।

**❌ Callback-এর ভেতরে geometry পড়া।** `entry.boundingClientRect` আর `entry.contentBoxSize` আগেই মাপা আছে। Callback-এর
ভেতরে target-এর ওপর `getBoundingClientRect()` call করলে নতুন করে layout হতে বাধ্য হয়, আর পুরো সুবিধাটাই নষ্ট হয়।

**❌ ধরে নেওয়া যে callback rendering-এর সাথে ক্রমানুসারে fire করে।** কিছু observer callback দেয় microtask হিসেবে, আর
কিছু দেয় frame-এর সীমানায়। তাই এক callback-এ লেখা DOM পরের frame-এর আগে অন্য observer-এর কাছে না-ও পৌঁছাতে পারে।
এদের দিয়ে একটি synchronous chain বানাবেন না।

## 🔑 মূল শিক্ষা

- Observer প্রশ্নটা উল্টে দেয়: প্রতিটি frame-এ আপনি জিজ্ঞেস করার বদলে, কিছু ঘটলে browser আপনাকে জানায়।
- Entry আসে আগে থেকে হিসাব করা measurement নিয়ে, তাই সেগুলো পড়লে layout-এ বাধ্য হয় না। Callback-এর ভেতরে
  `getBoundingClientRect()` call করলে হয়।
- একটি observer instance অনেক target সামলায়, আর প্রতিটি observer teardown-এ disconnect করতে হবে, নইলে leak হয়।
- `ResizeObserver` element-কে দেখে, window-কে নয়। এই ক্ষেত্রটা একটি `resize` listener কখনো ধরতে পারে না।
- যেখানে platform-এর উপায় আছে, সেটাকে প্রাধান্য দিন। `loading="lazy"`, `content-visibility`, container query আর
  `position: sticky` — প্রতিটিই observer-এর দরকার সরিয়ে দেয়।

## Interview-এর প্রশ্ন

**Q: একই কাজ করা scroll listener-এর চেয়ে `IntersectionObserver` কেন দ্রুত?**

দুটো কারণ। প্রথমত, scroll handler প্রতিটি scroll event-এ main thread-এ চলে, কোনো সীমা পার হোক বা না হোক। দ্বিতীয়ত,
এটা সাধারণত `getBoundingClientRect()` call করে, যেটা browser-কে উত্তর দেওয়ার আগে layout flush করতে বাধ্য করে।
Observer, browser যেখানে পারে, intersection test-টি main thread-এর বাইরে করে, আর আগেই হিসাব করা geometry দেয়।
Handler rendering-এর সাথে প্রতিযোগিতা করে; observer-কে rendering নিজেই জানায়।

**Q: Container query-র বদলে কখন `ResizeObserver` ব্যবহার করবেন?**

যখন CSS ছাড়া অন্য কিছুর সংখ্যাটা দরকার। একটি container query কোনো JavaScript ছাড়াই নির্দিষ্ট width-এ একটি component-কে
নতুন করে style করতে পারে, আর layout-এর পরিবর্তনের জন্য সেটাই সঠিক tool। কিন্তু কিছু code-এর আসল measurement দরকার।
একটি canvas chart-কে নতুন pixel আকারে আবার render করতে হয়, আর একটি virtualised list-কে আবার হিসাব করতে হয় কতগুলো
row ধরবে। সেটাই `ResizeObserver`।

**Q: Observer disconnect করতে ভুলে গেলে কী ভাঙে?**

Observer প্রতিটি observe করা element-এর reference রাখে। Callback তার closure-এর সবকিছুর reference রাখে, সাধারণত
component-এর state আর props। তাই unmount হওয়া component তখনও reachable থাকে, সাথে যে DOM সে দেখছিল সেটাও, আর প্রতিটি
mount-এ leak বাড়ে। এই leak সহজেই reproduce করা যায়। একটি route একশোবার mount আর unmount করুন, আর heap snapshot-এ
detached node-এর সংখ্যা বাড়তে দেখুন।

**Q: Core Web Vitals সংগ্রহের সঠিক উপায় কেন `PerformanceObserver`?**

কারণ page load হওয়ার সময় value-গুলো চূড়ান্ত নয়। বড় element আসার সাথে সাথে largest contentful paint বদলাতে পারে, আর
page hidden হওয়া পর্যন্ত layout shift যোগ হতেই থাকে। `load`-এর সময় `performance.getEntries()` পড়লে একটি প্রাথমিক
অনুমান ধরা পড়ে। `buffered: true` দিলে observer তার নিজের তৈরি হওয়ার আগে record হওয়া entry-গুলোও পায়, আর update পেতে
থাকে। এ কারণেই field library-গুলো সবই এর ওপর বানানো।

## এরপর কী পড়বেন

- [Chapter ?? — Container Query ও Cascade Layer](#ch-container-queries-and-layers) — CSS-এর উত্তর, যখন সাড়া দেওয়াটা শুধু styling
- [Chapter ?? — Production-এ মাপা](#ch-measuring-in-production) — entry হাতে পাওয়ার পর সেগুলো দিয়ে কী করবেন
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — API হিসেবে নয়, performance-এর কৌশল হিসেবে lazy loading
