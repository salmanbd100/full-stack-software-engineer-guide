---
sourceHash: "c736066c381b4006b3b43c6802d88ad0eca4fe7013d3e656d6cca98de3edc391"
title: "Observer API"
translatedAt: "2026-10-14T04:53:25.225Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Observer API {#ch-observer-apis}

> Scroll আর resize handler-এর জায়গায় চারটি browser API ব্যবহার করুন, যারা সেকেন্ডে ষাটবার জিজ্ঞেস না করে নিজেরাই জানায় কখন কী ঘটল।

**এই অধ্যায়ে:** polling কেন সবসময়ই ভুল ছিল · IntersectionObserver · ResizeObserver · MutationObserver · PerformanceObserver · clean-up-এর নিয়ম

## 💡 মূল ধারণা

কোনো element কখন viewport-এ ঢুকল, মাপ বদলাল, বা নতুন child পেল, browser তা আগে থেকেই জানে। Observer আসার আগে তা জানার
একমাত্র উপায় ছিল জিজ্ঞেস করা। আপনি লিখতেন প্রতি frame-এ চলা একটা `scroll` listener, ঝড়ের মতো fire হওয়া একটা `resize`
listener, বা DOM পরীক্ষা করা একটা `setInterval`। এর সবই চলে main thread-এ। আর ভেতরের কাজ সাধারণত geometry পড়ে, তাতে
উত্তর দেওয়ার আগে browser-কে layout শেষ করতে বাধ্য হতে হয়।

Observer ব্যাপারটা উল্টে দেয়। আপনি একবার আগ্রহ জানিয়ে রাখেন, আর জিনিসটা সত্যিই ঘটলে browser আপনাকে call করে। যে মাপ
সে আগেই হিসাব করে রেখেছিল, সেটাই হাতে দেয়, তাই আপনার কোনো কাজ layout করতে বাধ্য করে না।

> Observer scroll handler-এর সুন্দর syntax নয়। পার্থক্যটা হলো, browser আগেই যে geometry হিসাব করে রেখেছে তা পড়া,
> আর আপনাকে উত্তর দিতে তাকে দিয়ে আবার geometry হিসাব করানো।

## কীভাবে কাজ করে

চারটি observer, একই আকার। Callback দিয়ে বানান, target-এর ওপর `observe` call করেন, আর কাজ শেষে `disconnect`।

| Observer | কী জানায় | কীসের জায়গা নেয় |
| -------- | --------- | -------- |
| `IntersectionObserver` | কোনো element viewport বা ancestor-এ ঢুকল বা বেরোল | `scroll` + `getBoundingClientRect()` |
| `ResizeObserver` | Element-এর নিজের box-এর মাপ বদলাল | `resize` + প্রতিটি element আলাদা করে মাপা |
| `MutationObserver` | কোনো node-এর নিচের DOM বদলাল | Polling, বা method patch করা |
| `PerformanceObserver` | একটা performance entry record হলো | Timer দিয়ে `performance.getEntries()` পড়া |

### IntersectionObserver

Interview-এ সবচেয়ে বেশি গুরুত্ব এটারই। Lazy loading, infinite scroll, sticky header-এর state আর impression tracking,
সবই আসলে একই সমস্যা।

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

Element-এর কতটা দেখা গেলে চলবে, তা ঠিক করে `threshold`। `0` মানে এক pixel, `1` মানে পুরোটা, আর একটা array দিলে প্রতিটি
সীমা পেরোনোর সময় call হয়। `root`-এর default viewport, আর এটা scroll হয় এমন যেকোনো ancestor হতে পারে।

### ResizeObserver

এটা প্রতিটি element-এর আলাদা মাপ দেয়, যা window-এর `resize` পারে না। একটা panel খুলেছে বলে sidebar-এর চওড়া বদলাতে
পারে, অথচ window-এর কোনো event-ই হয়নি।

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

> ⚠️ **`ResizeObserver` callback-এর ভেতরে DOM-এ লিখলে loop হতে পারে।** Observer যে মাপ দেখছে, callback সেটাই বদলালে
> সে আবার fire হয়। Browser চক্রটা ধরে ফেলে, আটকে না গিয়ে log করে
> `ResizeObserver loop completed with undelivered notifications`। এই message-কে console থেকে ছেঁকে ফেলার মতো কোলাহল
> ভাববেন না, এটা আপনার callback-এর bug।

### MutationObserver

এটা সেই DOM-এর জন্য, যা আপনার নিয়ন্ত্রণে নেই। যেমন third-party widget, rich-text editor, বা extension-এর ঢুকিয়ে দেওয়া
content। নিজের component-এর ভেতরে উত্তর হলো state। সেখানে mutation observer লাগলে বুঝবেন কোথাও গোলমাল হয়েছে।

### PerformanceObserver

Core Web Vitals পড়ার একমাত্র ঠিক উপায় এটা, কারণ পাতা load হওয়ার পরেও metric বদলায়। বড় element দেখা দিলে LCP (largest
contentful paint) update হয়। CLS (cumulative layout shift) পাতা hidden হওয়া পর্যন্ত যোগ হতেই থাকে। `load`-এর সময় নেওয়া
snapshot এর কিছুই মাপে না।

```typescript
// `buffered: true` delivers entries recorded before this observer existed.
new PerformanceObserver((list: PerformanceObserverEntryList) => {
  for (const entry of list.getEntries()) {
    report({ metric: entry.entryType, value: entry.startTime });
  }
}).observe({ type: "largest-contentful-paint", buffered: true });
```

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | কেন |
| --------- | --------- | --- |
| Lazy loading, infinite scroll, impression | `IntersectionObserver` | Scroll handler নেই, জোর করে layout-ও নেই |
| এমন component, যা নিজের মাপে আবার আঁকে | `ResizeObserver` | Window হয়তো কখনো বদলায়ই না |
| এমন layout, যার শুধু মাপ দেখে নিজেকে *style* দিতে হবে | Container query | একদম JavaScript ছাড়া — Part II-এর CSS অধ্যায় দেখুন |
| Third-party DOM-এ সাড়া দেওয়া | `MutationObserver` | ওই বদলগুলো আর কেউ দেখতে পায় না |
| আসল user-দের performance মাপা | `PerformanceObserver` | Value চূড়ান্ত হয় পরে |

**যেখানে native বিকল্প আছে, সেটাই নিন:** image আর iframe-এ `loading="lazy"`, screen-এর বাইরের rendering কাজের জন্য
`content-visibility: auto`, আর CSS `position: sticky`। প্রতিটি একটা observer-এর জায়গা পুরোপুরি নেয়, আর platform-এর
version সবসময় আপনারটার চেয়ে সস্তা।

## সাধারণ ভুল

**❌ কখনো disconnect না করা।** Observer তার target-গুলোর reference ধরে রাখে, আর তার callback ধরে রাখে closure-এ যা কিছু
আছে। তাই যে component observe করে কিন্তু কখনো disconnect করে না, সে তার পুরো scope leak করে। Teardown-এ disconnect
করুন: `useEffect`-এর cleanup, `onDestroy`, বা `disconnectedCallback`।

```typescript
// The cleanup is the API contract, not an optimisation.
const io = new IntersectionObserver(onIntersect);
io.observe(el);
return () => io.disconnect();
```

**❌ প্রতিটি element-এর জন্য একটা observer।** একটিমাত্র observer instance হাজার হাজার target সামলায়, আর তাদের entry-গুলো
এক callback-এ জড়ো করে দেয়। হাজারটা instance মানে হাজারটা callback আর হাজারটা allocation।

**❌ Callback-এর ভেতরে geometry পড়া।** `entry.boundingClientRect` আর `entry.contentBoxSize` আগেই মাপা আছে। Callback-এর
ভেতরে target-এর ওপর `getBoundingClientRect()` call করলে নতুন করে layout হয়, আর পুরো সুবিধাটাই নষ্ট হয়।

**❌ ধরে নেওয়া যে callback rendering-এর সঙ্গে ক্রম মেনে fire হয়।** কিছু observer callback দেয় microtask হিসেবে, কিছু
দেয় frame-এর সীমায়। তাই এক callback-এ লেখা DOM পরের frame-এর আগে অন্য observer-এর কাছে না-ও পৌঁছাতে পারে। এদের দিয়ে
synchronous শিকল বানাবেন না।

## 🔑 মূল শিক্ষা

- Observer প্রশ্নটা উল্টে দেয়: প্রতি frame-এ আপনি জিজ্ঞেস করেন না, কিছু ঘটলে browser নিজেই জানায়।
- Entry আসে আগে থেকে হিসাব করা মাপসহ, তাই সেগুলো পড়লে layout হয় না। Callback-এর ভেতরে
  `getBoundingClientRect()` call করলে হয়।
- একটি observer instance অনেক target সামলায়, আর প্রতিটি observer teardown-এ disconnect করতেই হবে, নইলে leak হয়।
- `ResizeObserver` window নয়, element দেখে, আর ঠিক এই ক্ষেত্রটা `resize` listener কখনো ধরতে পারে না।
- যেখানে platform-এর জিনিস আছে, সেটাই নিন। `loading="lazy"`, `content-visibility`, container query আর
  `position: sticky` প্রত্যেকে observer-এর দরকারটাই সরিয়ে দেয়।

## Interview-এর প্রশ্ন

**Q: একই কাজ করা scroll listener-এর চেয়ে `IntersectionObserver` দ্রুত কেন?**

দুটি কারণে। প্রথমত, scroll handler প্রতিটি scroll event-এ main thread-এ চলে, কোনো সীমা পেরোক বা না পেরোক। দ্বিতীয়ত,
সেটা সাধারণত `getBoundingClientRect()` call করে, যা উত্তর দেওয়ার আগে browser-কে layout শেষ করতে বাধ্য করে। Observer
যেখানে পারে, intersection-এর পরীক্ষা main thread-এর বাইরে করে, আর আগেই হিসাব করা geometry হাতে দেয়। Handler rendering-এর
সঙ্গে পাল্লা দেয়; observer-কে rendering নিজেই খবর দেয়।

**Q: কখন container query-র বদলে `ResizeObserver` ব্যবহার করবেন?**

যখন CSS ছাড়া অন্য কিছুর সংখ্যাটা দরকার। Container query কোনো JavaScript ছাড়াই নির্দিষ্ট চওড়ায় component-কে নতুন style
দিতে পারে, আর layout বদলের জন্য সেটাই ঠিক জিনিস। কিন্তু কিছু code-এর আসল মাপটা লাগে। Canvas chart-কে নতুন pixel মাপে
আবার render করতে হয়, আর virtualised list-কে আবার হিসাব করতে হয় কয়টি row আঁটবে। সেটা `ResizeObserver`-এর কাজ।

**Q: Observer disconnect করতে ভুলে গেলে কী ভাঙে?**

Observer প্রতিটি observe করা element-এর reference রাখে। Callback রাখে তার closure-এর সবকিছুর reference, সাধারণত
component-এর state আর props। ফলে unmount হওয়া component আর সে যে DOM দেখছিল, সবই নাগালে থেকে যায়, আর প্রতিটি mount-এ
leak বাড়ে। এই leak সহজেই দেখানো যায়। একটা route একশোবার mount আর unmount করুন, আর heap snapshot-এ detached node-এর
সংখ্যা বাড়তে দেখুন।

**Q: Core Web Vitals সংগ্রহের ঠিক উপায় কেন `PerformanceObserver`?**

কারণ পাতা load হওয়ার সময় value-গুলো চূড়ান্ত নয়। বড় element এলে largest contentful paint বদলাতে পারে, আর layout shift
পাতা hidden হওয়া পর্যন্ত যোগ হতেই থাকে। `load`-এর সময় `performance.getEntries()` পড়লে পাওয়া যায় একটা আগাম আন্দাজ।
`buffered: true` দিলে observer তার জন্মের আগে record হওয়া entry-ও পায়, আর update পেতে থাকে। এজন্যই field-এর সব library
এর ওপরেই তৈরি।

## এরপর কী পড়বেন

- [Chapter ?? — Container Query ও Cascade Layer](#ch-container-queries-and-layers) — সাড়া শুধু styling হলে CSS-এর উত্তর
- [Chapter ?? — Production-এ মাপা](#ch-measuring-in-production) — entry হাতে পাওয়ার পর সেগুলো দিয়ে কী করবেন
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — API নয়, performance-এর কৌশল হিসেবে lazy loading
