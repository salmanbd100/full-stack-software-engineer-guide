---
sourceHash: "d0480eeeac33c78e08545817c955ea258ac9a9905b5a8f2f52fc5eeee0383475"
title: "Styling Strategy"
translatedAt: "2026-10-12T12:16:07.818Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Styling Strategy {#ch-styling-strategy}

> Tailwind-এর প্রশ্নে আসল tradeoff দিয়ে যুক্তি দিন, আর জানুন কোন styling পদ্ধতিগুলো একটি Server Component বাতিল করে দেয়।

**এই অধ্যায়ে:** যে একটি সমস্যা প্রতিটি পদ্ধতি সমাধান করে · naming, utility, scoped file · runtime CSS-in-JS-এর খরচ · server-এর সীমানা · সিদ্ধান্তের নিয়ম

## 💡 মূল ধারণা

CSS-এর একটিই global namespace, আর একটি cascade, যেটা পুরস্কার দেয় সবচেয়ে specific selector যে লেখে তাকে। গত পনেরো
বছরের প্রতিটি styling পদ্ধতি এই একটি তথ্যেরই উত্তর। পার্থক্য শুধু **উত্তরটা কে বলবৎ করে**: একটি naming convention,
একটি build step, নাকি language নিজেই।

কিছু না করলে প্রতিটি team একই ব্যর্থতায় পৌঁছায়। Cascade-এর লড়াই জিততে selector লম্বা হতে থাকে, আর সেই লড়াই থামাতে
`!important` হাজির হয়। কেউ একটি class মুছতে সাহস পায় না, কারণ কেউ জানে না এটা কোথায় ব্যবহার হচ্ছে। নিচের প্রতিটি
পদ্ধতি এই ব্যর্থতাকে অসম্ভব করে, আর প্রত্যেকে তার দাম নেয় আলাদা জায়গায়।

> কেউ সৌন্দর্য নিয়ে তর্ক করছে না। তর্কটা হলো খরচ কোথায় পড়বে: markup-এ, stylesheet-এ, bundle-এ, নাকি render-এর
> সময়।

## কীভাবে কাজ করে

তিনটি পরিবার, আর এদের একটির ওপর এখন এমন একটি কঠিন সীমাবদ্ধতা আছে, যা বাকি দুটোর নেই।

| পরিবার | বলবৎ করে | Scoping mechanism | খরচ পড়ে |
| ------ | ----------- | ----------------- | ------------- |
| **Naming convention** — BEM, ITCSS | শৃঙ্খলা আর review | মানুষের মেনে চলা একটি naming নিয়ম | Review-তে, আর প্রথম যে engineer এটা উপেক্ষা করেন তাঁর ওপর |
| **Utility-first** — Tailwind CSS 4 | Framework-এর class set | Scope করার কিছু নেই; class-গুলো এক কাজের | Markup-এর পাঠযোগ্যতায় |
| **Component-scoped** — CSS Modules, vanilla-extract, Emotion | Build, নয়তো runtime | প্রতিটি component-এ একটি hash করা class name | Build step-এ, আর runtime library-র ক্ষেত্রে প্রতিটি render-এ |

### Naming convention, আর কেন এগুলো ম্লান হলো

BEM প্রতিটি class-কে একটি block, একটি element আর একটি modifier দেয়, যেমন `.card__title--featured`। দুটো file
সংঘর্ষে যেতে পারে না, আর specificity সমতল থাকে। ITCSS stylesheet এমনভাবে সাজায়, যাতে সাধারণ rule specific rule-এর
আগে load হয়। দুটোই কাজ করে, আর দুটোর দুর্বলতা একটাই: **এগুলো চুক্তি, mechanism নয়।** কেউ `.nav ul li a.active`
লিখলে কিছুই fail করে না, তাই বড় team-এ কেউ না কেউ একসময় লেখেনই।

পুরোনো code পড়ার জন্য, আর একটি interview উত্তরের জন্য এগুলো এখনো গুরুত্বপূর্ণ। একটি পদ্ধতি cascade-এর সাথে লড়ার
*কারণ* সরিয়ে দেয়। এই অধ্যায়ের বাকিটা সেই পদ্ধতিগুলো নিয়ে, যেগুলো লড়ার *সামর্থ্যই* সরিয়ে দেয়।

### Utility-first

একটি utility class একটি কাজ করে, যেমন `p-4`, `text-sm` বা `flex`। Component-এর সংখ্যার সাথে stylesheet আর বাড়ে না,
কারণ প্রতিটি component-এর জন্য আলাদা CSS লিখতে হয় না। তার বদলে বাড়ে markup।

**Tailwind CSS 4 configuration-কে CSS-এর ভেতরেই নিয়ে এসেছে:**

```css
@import "tailwindcss";

/* Design tokens are declared here and compile to plain custom properties. */
@theme {
  --color-brand-500: oklch(0.62 0.19 259);
  --font-display: "Source Sans 3", sans-serif;
  --breakpoint-3xl: 120rem;
}
```

Syntax-এর চেয়ে output বেশি গুরুত্বপূর্ণ। `@theme` compile হয়ে `:root`-এ `--color-brand-500` হয়, তাই যেকোনো
stylesheet, যেকোনো component আর এই page-এর অন্য যেকোনো পদ্ধতি token-গুলো পড়তে পারে। **Custom property হিসেবে
design token — এখানেই প্রতিটি পদ্ধতি মিলিত হয়।** Team এরপর যে framework-ই বাছুক, এগুলো টিকে থাকে।

### Component-scoped

CSS Modules build-এর সময় class name hash করে, তাই runtime-এ scoping-এর কোনো খরচ নেই:

```tsx
import styles from "./card.module.css";

export function Card({ title }: { title: string }) {
  // `styles.title` is the literal hashed class by the time this ships.
  return <h2 className={styles.title}>{title}</h2>;
}
```

CSS-in-JS এই ধারণাকে সেই style-গুলো পর্যন্ত টেনে নেয়, যেগুলো props-এর ওপর নির্ভর করে। যে ভাগটা গুরুত্বপূর্ণ, তা হলো
**CSS কখন তৈরি হয়**। একটি runtime library browser-এ, component render হওয়ার সময় stylesheet বানায়। একটি build-time
library কিছু ship হওয়ার আগেই হুবহু একই stylesheet তৈরি করে, আর bundle-এ কোনো library রেখে যায় না।

**Build-time, typed token সহ:**

```typescript
// card.css.ts — this file runs during the build, never in the browser.
import { style } from "@vanilla-extract/css";

export const title = style({
  fontSize: "1.25rem",
  color: "var(--color-brand-500)",
  ":hover": { opacity: 0.9 },
});
```

## কখন ব্যবহার করবেন

Server Component-এর সীমানাই এটাকে পছন্দের বিষয় থেকে একটি সীমাবদ্ধতায় পরিণত করেছে।

একটি runtime CSS-in-JS library *render করার সময়* style তৈরি করে, তাই যেখানেই একটি styled component render হয়,
সেখানে এর runtime লাগে। React Server Component server-এ render হয় আর কোনো JavaScript ship করে না। তাই প্রতিটি styled
component-কে `'use client'` চিহ্নিত করতে হয়, আর সেটা তার পুরো subtree-কে সাথে নিয়ে সীমানা পার করায়। একটি page-এর
দুই component গভীরে গিয়েই styling library app-এর architecture ঠিক করে ফেলেছে।

| পরিস্থিতি | বাছুন | কেন |
| --------- | ------ | --- |
| React 19 Server Component, বা Next.js App Router | Tailwind, CSS Modules বা vanilla-extract | কোনো runtime নেই, তাই কিছুই জোর করে client সীমানা পার হয় না |
| অনেক team ব্যবহার করে এমন একটি design system | Custom property হিসেবে token, সাথে CSS Modules | চুক্তিটা token, framework নয় |
| কড়া performance budget-এর product UI | Utility-first | Stylesheet আর বাড়ে না; maintain করার মতো কোনো styling layer নেই |
| Client-heavy একটি SPA-তে সত্যিকারের dynamic style | Emotion | Prop interpolation সরাসরি, আর app ইতিমধ্যেই JavaScript-নির্ভর |
| বিদ্যমান একটি styled-components codebase | থাকুন, যদি না profiling অন্য কথা বলে | Migration আসল কাজ, আর library এখনো চলে |

> ⚠️ **যা বদলাতে থাকে:** styled-components 2024-এ maintenance mode-এ গেছে। Tailwind v4-এ CSS-first
> configuration-এ গেছে। Recommended zero-runtime library প্রতি এক-দুই বছরে বদলায়। টেকসই নীতিটি বদলায় না: render-এর
> সময় করা কাজ প্রতিটি render-এ হয়, user-এর device-এ। সেই কাজ build-এর সময়ে সরানো সবসময় সম্ভব, আর সবসময় সস্তা।

### Runtime CSS-in-JS-এর আসল খরচ

তিনটি আলাদা খরচ। Interviewer-রা সাধারণত মাঝেরটি শুনতে চান।

- **Bundle:** একটিও style লেখার আগেই 7–15 KB gzipped।
- **Render:** template parse করা, hash করা আর rule insert করা। Interpolate করা value বদলায় এমন প্রতিটি re-render-এ
  এটা আবার হয়, আর এটা চলে user-এর device-এ, আপনার নয়।
- **Payload:** server-rendered HTML সংগ্রহ করা `<style>` block বহন করে। Document বাড়ে render করা tree-র আকারের সাথে,
  design system-এর আকারের সাথে নয়।

## সাধারণ ভুল

**❌ একটি component body-র ভেতরে styled component define করা।**

```tsx
import styled from "@emotion/styled";

function Panel() {
  // Recreated on every render: the class-name cache is thrown away and React
  // remounts the DOM node, losing focus and scroll position with it.
  const Box = styled.div`padding: 8px;`;
  return <Box />;
}
```

**✅ এটা module scope-এ define করুন**, যেখানে এটা একবার তৈরি হয়। নয়তো বদলাতে থাকা অংশটি একটি custom property-তে
সরান আর rule-টি static রাখুন।

**❌ "Tailwind বনাম CSS Modules"-কেই পুরো প্রশ্ন ধরে নেওয়া।** দুটোই zero-runtime, আর দুটোই একই token ব্যবহার করে।
একটি team layout-এর জন্য utility আর জটিল একটি component-এর জন্য module ব্যবহার করতে পারে, আর বেশিরভাগ বড় codebase
শেষে সেখানেই পৌঁছায়। যে উত্তর নম্বর পায়, সেটা আগে সীমাবদ্ধতার নাম বলে, তারপর বাছে। সীমাবদ্ধতা হলো server-এর সীমানা,
performance budget বা team-এর আকার।

**❌ Design token-এর মালিকানা styling পদ্ধতিকে দিয়ে দেওয়া।** ধরুন brand-এর রং শুধু একটি Tailwind config-এ আছে, বা
শুধু একটি TypeScript theme object-এ। তাহলে পরের framework migration মানে নতুন করে লেখা। Token-গুলো custom property
হিসেবে declare করুন, তাহলে এই page-এর প্রতিটি পদ্ধতি এগুলো পড়তে পারবে।

## 🔑 মূল শিক্ষা

- প্রতিটি styling পদ্ধতি একটি সমস্যারই উত্তর দেয়, global namespace। পার্থক্য হলো উত্তরটা একজন মানুষ, build নাকি
  runtime বলবৎ করে।
- Runtime CSS-in-JS-এর খরচ হলো bundle size, প্রতি render-এর কাজ আর বড় একটি server-rendered document। Build-time
  library একই CSS তৈরি করে আর পেছনে কিছু রেখে যায় না।
- একটি runtime styling library tree-র নিচে `'use client'` চাপিয়ে দেয়। এটা একটি architecture-এর সিদ্ধান্ত নেয়,
  styling-এর নয়।
- Design token-এর জায়গা custom property-তে, কোনো framework-এর config-এ নয়, কারণ এগুলো framework-এর চেয়ে বেশিদিন
  টেকে।
- Utility-first আর component-scoped CSS পরস্পরবিরোধী নয়। বড় codebase সাধারণত একটি token set-এর ওপর দুটোই চালায়।

## Interview-এর প্রশ্ন

**Q: একটি team একটি Next.js App Router project-এ styled-components যোগ করতে চায়। আপনি কী বলবেন?**

বলব যে এটা কাজ করে, আর এর খরচ styling-এর চেয়ে বেশি। একটি runtime library render-এর সময় CSS তৈরি করে, তাই প্রতিটি
styled component-এর `'use client'` লাগে। সেটা তার subtree-কে সাথে নিয়ে server tree থেকে বের করে আনে, আর bundle বাড়ে
এমন একটি কারণে, যার সাথে feature-এর কোনো সম্পর্ক নেই। CSS Modules বা vanilla-extract কোনো runtime ছাড়াই style লেখার
একই উপায় দেয়। Codebase যদি ইতিমধ্যে সব জায়গায় styled-components চালায়, তাহলে থেকে যাওয়ার পক্ষে যুক্তি আছে। নতুন
একটি App Router project-এ এটা যোগ করার পক্ষে নেই।

**Q: Utility-first CSS আসলে কোথায় আপনার সাশ্রয় করে, আর কোথায় খরচ করায়?**

এটা আপনাকে naming থেকে বাঁচায়। Component-first CSS-এর দামি অংশ rule লেখা নয়। দামি হলো প্রতিটি visual variant-এর
জন্য একটি নাম বানানো, তারপর design বদলানোর সাথে নামটিকে সত্য রাখা। Utility সেই কাজটি সরিয়ে দেয়, আর component-এর
সংখ্যার সাথে stylesheet আর বাড়ে না। খরচ হলো ঘন markup আর onboarding-এর একটি আসল ধাপ। এটা maintenance খরচের তর্ক,
keystroke-এর নয়।

**Q: Design token সাধারণত একটি TypeScript object না হয়ে custom property কেন হয়?**

কারণ প্রতিটি layer একসাথে একটি custom property পড়তে পারে: একটি utility framework, একটি CSS Module, একটি inline style,
আর এমন একটি third-party component, যে আপনার build সম্পর্কে কিছুই জানে না। একটি TypeScript token object শুধু সেই code
পড়তে পারে, যে এটা import করে। তাই bundle-এর বাইরের কিছুর একটি রং দরকার হওয়ামাত্র এটা design system-কে দুই ভাগ করে
ফেলে। Custom property runtime-এও বদলায়। দ্বিতীয় একটি stylesheet ship না করেই theming আর dark mode এভাবেই কাজ করে।

**Q: কখন আপনি কোনো styling framework-ই ব্যবহার করবেন না?**

যখন surface ছোট আর সীমাবদ্ধতা হলো payload, যেমন একটি marketing page, একটি embedded widget বা একটি email template।
Custom property সহ কয়েকশো line হাতে লেখা CSS byte-এর হিসাবে যেকোনো framework-কে হারায়, আর এর maintain করার মতো
কোনো upgrade path নেই। একটি framework নিজের জায়গা অর্জন করে তখন, যখন কয়েকজন একসাথে style লেখেন আর naming ভাঙতে শুরু
করে।

## এরপর কী পড়বেন

- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — যে সীমানা runtime styling library বাতিল করে দেয়
- [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) — token-এর চুক্তি আসলে কোথায় ঠিক হয়
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — একটি আসল build-এ একটি styling library-র খরচ কীভাবে দেখবেন
