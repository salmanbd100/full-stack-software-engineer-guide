---
sourceHash: "d0480eeeac33c78e08545817c955ea258ac9a9905b5a8f2f52fc5eeee0383475"
title: "Styling Strategy"
translatedAt: "2026-10-17T01:40:26.184Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Styling Strategy {#ch-styling-strategy}

> Tailwind-এর প্রশ্নে তর্ক করুন আসল tradeoff নিয়ে, আর জেনে রাখুন Server Component কোন styling পদ্ধতিগুলো বাতিল করে দেয়।

**এই অধ্যায়ে:** প্রতিটি পদ্ধতি যে একটিমাত্র সমস্যার সমাধান করে · naming, utility, scoped file · runtime CSS-in-JS-এর খরচ · server boundary · সিদ্ধান্তের নিয়ম

## 💡 মূল ধারণা

CSS-এর namespace মাত্র একটি, global, আর cascade সুবিধা দেয় তাকেই, যে সবচেয়ে specific selector লেখে। গত পনেরো বছরের
প্রতিটি styling পদ্ধতি এই একটি সত্যেরই জবাব। পার্থক্য শুধু **জবাবটা কে মানতে বাধ্য করে** তাতে: একটি naming
convention, একটি build ধাপ, নাকি ভাষা নিজেই।

কিছু না করলে প্রতিটি team শেষে একই ব্যর্থতায় পৌঁছায়। Cascade-এর লড়াই জিততে selector লম্বা হতে থাকে, আর লড়াই থামাতে
হাজির হয় `!important`। কোনো class মোছার সাহস কারও হয় না, কারণ সেটা কোথায় ব্যবহার হয়েছে কেউ খুঁজে বের করতে পারে না।
নিচের প্রতিটি পদ্ধতি এই ব্যর্থতাকে অসম্ভব করে দেয়, আর প্রতিটি তার দাম নেয় আলাদা জায়গায়।

> তর্কটা সৌন্দর্য নিয়ে নয়। তর্কটা খরচ কোথায় গিয়ে পড়ে তা নিয়ে: markup-এ, stylesheet-এ, bundle-এ, নাকি render-এর
> সময়।

## কীভাবে কাজ করে

তিনটি পরিবার, আর তাদের একটির ওপর এখন এমন একটি কড়া সীমা আছে, যা বাকি দুটির নেই।

| পরিবার | কে মানতে বাধ্য করে | Scoping-এর কৌশল | খরচ যেখানে পড়ে |
| ------ | ----------- | ----------------- | ------------- |
| **Naming convention** — BEM, ITCSS | শৃঙ্খলা আর review | মানুষের মেনে চলা একটি নামকরণের নিয়ম | Review-এ, আর প্রথম যে engineer নিয়মটা উপেক্ষা করে তার ঘাড়ে |
| **Utility-first** — Tailwind CSS 4 | Framework-এর class-এর set | Scope করার কিছুই নেই; প্রতিটি class-এর কাজ একটিই | Markup পড়ার সুবিধায় |
| **Component-scoped** — CSS Modules, vanilla-extract, Emotion | Build, অথবা runtime | প্রতিটি component-এর জন্য একটি hash করা class name | Build ধাপে, আর runtime library হলে প্রতিটি render-এ |

### Naming convention, আর কেন এগুলো পিছিয়ে পড়ল

BEM প্রতিটি class-কে দেয় একটি block, একটি element আর একটি modifier, যেমন `.card__title--featured`। দুটি file-এর
মধ্যে সংঘাত হতে পারে না, আর specificity সমান থাকে। ITCSS stylesheet এমনভাবে সাজায়, যাতে সাধারণ rule আগে load হয়, আর
নির্দিষ্টগুলো পরে। দুটিই কাজ করে, আর দুটিরই একই দুর্বলতা: **এগুলো চুক্তি, কোনো mechanism নয়।** কেউ
`.nav ul li a.active` লিখলে কিছুই fail করে না, তাই বড় team-এ কেউ না কেউ একদিন ঠিকই লেখে।

পুরনো code পড়তে, আর interview-এর একটি উত্তরের জন্য এগুলো এখনো জরুরি। একটি পদ্ধতি cascade-এর সঙ্গে লড়ার *কারণটা*
সরিয়ে দেয়। এই অধ্যায়ের বাকিটা সেই পদ্ধতিগুলো নিয়ে, যেগুলো লড়ার *ক্ষমতাটাই* কেড়ে নেয়।

### Utility-first

একটি utility class একটিই কাজ করে, যেমন `p-4`, `text-sm` বা `flex`। Component বাড়লেও stylesheet আর বাড়ে না, কারণ
component ধরে ধরে CSS লিখতেই হয় না। বদলে বাড়ে markup।

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

Syntax-এর চেয়ে output বেশি জরুরি। `@theme` compile হয়ে `:root`-এ `--color-brand-500` হয়, তাই যেকোনো stylesheet,
যেকোনো component, আর এই page-এর অন্য যেকোনো পদ্ধতি token-গুলো পড়তে পারে। **Custom property হিসেবে design token-ই
সেই জায়গা, যেখানে সব পদ্ধতি এসে মেলে।** Team এরপর যে framework-ই বাছুক, এগুলো টিকে থাকে।

### Component-scoped

CSS Modules build-এর সময় class name hash করে, তাই runtime-এ scoping-এর কোনো খরচ নেই:

```tsx
import styles from "./card.module.css";

export function Card({ title }: { title: string }) {
  // `styles.title` is the literal hashed class by the time this ships.
  return <h2 className={styles.title}>{title}</h2>;
}
```

CSS-in-JS এই ধারণাটাকেই নিয়ে যায় props-নির্ভর style পর্যন্ত। যে ভাগটা জরুরি, তা হলো **CSS কখন তৈরি হয়**। Runtime
library browser-এ component render হওয়ার সময় stylesheet তৈরি করে। Build-time library কিছু ship হওয়ার আগেই হুবহু সেই
stylesheet তৈরি করে ফেলে, আর bundle-এ কোনো library রেখে যায় না।

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

Server Component boundary-ই এই প্রশ্নকে পছন্দের ব্যাপার থেকে বাধ্যবাধকতায় নিয়ে গেছে।

Runtime CSS-in-JS library style তৈরি করে *render চলার সময়*, তাই যেখানেই কোনো styled component render হয়, সেখানে
তার runtime লাগে। React Server Component render হয় server-এ, আর কোনো JavaScript ship করে না। ফলে প্রতিটি styled
component-কে `'use client'` mark করতে হয়, আর তাতে তার পুরো subtree boundary পেরিয়ে client-এ চলে যায়। Page-এর মাত্র
দুই স্তর গভীরে গিয়েই styling library ঠিক করে ফেলেছে app-এর architecture।

| পরিস্থিতি | যা বাছবেন | কেন |
| --------- | ------ | --- |
| React 19 Server Components, বা Next.js App Router | Tailwind, CSS Modules বা vanilla-extract | Runtime নেই, তাই কিছুকেই জোর করে client boundary পার করাতে হয় না |
| অনেক team ব্যবহার করে এমন design system | Custom property হিসেবে token, সঙ্গে CSS Modules | Contract হলো token, framework নয় |
| কড়া performance budget-এর product UI | Utility-first | Stylesheet আর বাড়ে না; রক্ষণাবেক্ষণের মতো কোনো styling layer নেই |
| Client-ভারী SPA-তে সত্যিই dynamic style | Emotion | Props interpolation সরাসরি করা যায়, আর app এমনিতেই JavaScript-নির্ভর |
| আগে থেকে styled-components-এ লেখা codebase | যেমন আছে থাকুন, যদি না profiling অন্য কথা বলে | Migration সত্যিকারের পরিশ্রম, আর library এখনো চলে |

> ⚠️ **যা বদলাতে থাকে:** styled-components 2024-এ maintenance mode-এ গেছে। Tailwind v4-এ CSS-first configuration-এ
> চলে গেছে। সুপারিশ করা zero-runtime library প্রতি এক-দুই বছরে বদলায়। টেকসই নীতিটা বদলায় না: render-এর সময় যে
> কাজ হয়, তা প্রতিটি render-এ হয়, user-এর device-এ। সেই কাজ build time-এ সরিয়ে নেওয়া সবসময় সম্ভব, আর সবসময়
> সস্তা।

### Runtime CSS-in-JS-এর আসল খরচ

তিনটি আলাদা খরচ। Interviewer-রা সাধারণত মাঝেরটা শুনতে চান।

- **Bundle:** একটিও style লেখার আগেই 7–15 KB gzipped।
- **Render:** template parse করা, hash করা, আর rule বসানো। Interpolate করা value বদলায় এমন প্রতিটি re-render-এ এটা
  আবার হয়, আর চলে user-এর device-এ, আপনার নয়।
- **Payload:** server-rendered HTML সংগ্রহ করা `<style>` block বহন করে। Document বাড়ে render হওয়া tree-এর আকারের
  সঙ্গে, design system-এর আকারের সঙ্গে নয়।

## সাধারণ ভুল

**❌ Component-এর body-র ভেতরে styled component define করা।**

```tsx
import styled from "@emotion/styled";

function Panel() {
  // Recreated on every render: the class-name cache is thrown away and React
  // remounts the DOM node, losing focus and scroll position with it.
  const Box = styled.div`padding: 8px;`;
  return <Box />;
}
```

**✅ এটা module scope-এ define করুন**, যেখানে এটা একবারই তৈরি হয়। অথবা যে অংশটা বদলায়, সেটা একটি custom property-তে
সরিয়ে দিন, আর rule-টা static রাখুন।

**❌ "Tailwind বনাম CSS Modules"-কেই পুরো প্রশ্ন ধরে নেওয়া।** দুটিই zero-runtime, আর দুটিই একই token ব্যবহার করে।
একটি team layout-এর জন্য utility আর জটিল component-এর জন্য module ব্যবহার করতে পারে, আর বেশিরভাগ বড় codebase শেষে
সেখানেই পৌঁছায়। যে উত্তর নম্বর পায়, সেটা আগে সীমাবদ্ধতার নাম বলে, তারপর বাছে। সীমাবদ্ধতা হলো server boundary,
performance budget, বা team-এর আকার।

**❌ Design token-এর মালিকানা styling পদ্ধতির হাতে ছেড়ে দেওয়া।** ধরুন brand colour আছে শুধু একটি Tailwind config-এ,
অথবা শুধু একটি TypeScript theme object-এ। তাহলে পরের framework migration মানে পুরোটা নতুন করে লেখা। Token ঘোষণা করুন
custom property হিসেবে, তাহলে এই page-এর প্রতিটি পদ্ধতি সেগুলো পড়তে পারবে।

## 🔑 মূল শিক্ষা

- প্রতিটি styling পদ্ধতি একটিই সমস্যার জবাব দেয়, global namespace। পার্থক্য হলো জবাবটা মানতে বাধ্য করে মানুষ, build,
  নাকি runtime।
- Runtime CSS-in-JS-এর খরচ bundle size, প্রতি render-এর কাজ আর বড় server-rendered document। Build-time library একই
  CSS তৈরি করে, আর পেছনে কিছু রেখে যায় না।
- Runtime styling library tree-এর নিচ পর্যন্ত `'use client'` চাপিয়ে দেয়। এটা styling-এর নয়, architecture-এর
  সিদ্ধান্ত নিয়ে ফেলে।
- Design token-এর জায়গা custom property-তে, framework-এর config-এ নয়, কারণ token framework-এর চেয়ে বেশি দিন
  টেকে।
- Utility-first আর component-scoped CSS পরস্পরের বিপরীত নয়। বড় codebase সাধারণত একই token set-এর ওপর দুটিই
  চালায়।

## Interview-এর প্রশ্ন

**Q: একটি team Next.js App Router project-এ styled-components যোগ করতে চায়। আপনি কী বলবেন?**

বলব যে এটা চলে, কিন্তু এর খরচ styling-এর চেয়ে বেশি। Runtime library render-এর সময় CSS তৈরি করে, তাই প্রতিটি styled
component-এর `'use client'` লাগে। তাতে তার subtree-ও server tree থেকে বেরিয়ে আসে, আর bundle বাড়ে এমন কারণে, যার
সঙ্গে feature-এর কোনো সম্পর্ক নেই। CSS Modules বা vanilla-extract একইভাবে style লেখার সুযোগ দেয়, কোনো runtime ছাড়া।
Codebase যদি আগে থেকেই সব জায়গায় styled-components চালায়, তাহলে সেটা রেখে দেওয়ার পক্ষে যুক্তি আছে। কিন্তু নতুন App
Router project-এ এটা যোগ করার পক্ষে কোনো যুক্তি নেই।

**Q: Utility-first CSS আসলে কোথায় বাঁচায়, আর কোথায় খরচ করায়?**

বাঁচায় নামকরণের কাজ। Component-first CSS-এ দামি অংশটা rule লেখা নয়। দামি হলো প্রতিটি visual variant-এর জন্য একটি নাম
বানানো, আর design বদলাতে থাকলে নামটাকে সত্য রাখা। Utility এই কাজটাই সরিয়ে দেয়, আর component বাড়লেও stylesheet আর
বাড়ে না। খরচ হলো ঘন markup, আর নতুন কাউকে শেখানোর একটি সত্যিকারের ধাপ। তর্কটা রক্ষণাবেক্ষণের খরচ নিয়ে, keystroke
নিয়ে নয়।

**Q: Design token সাধারণত TypeScript object না হয়ে custom property হয় কেন?**

কারণ custom property সব layer একসঙ্গে পড়তে পারে: utility framework, CSS Module, inline style, এমনকি এমন third-party
component, যে আপনার build সম্পর্কে কিছুই জানে না। TypeScript token object পড়তে পারে কেবল সেই code, যেটা সেটা import
করে। তাই bundle-এর বাইরের কোনো কিছুর colour লাগলেই design system দুই ভাগ হয়ে যায়। Custom property runtime-এও বদলায়।
Theming আর dark mode এভাবেই দ্বিতীয় stylesheet ship না করে কাজ করে।

**Q: কখন কোনো styling framework-ই ব্যবহার করবেন না?**

যখন জায়গাটা ছোট আর সীমাবদ্ধতা payload, যেমন marketing page, embedded widget বা email template। Custom property সহ
কয়েকশো line হাতে লেখা CSS byte-এর হিসাবে যেকোনো framework-কে হারায়, আর এর কোনো upgrade path রক্ষণাবেক্ষণ করতে হয় না।
Framework তার জায়গা অর্জন করে তখন, যখন কয়েকজন একই সময়ে style লেখে আর নামকরণ ভেঙে পড়তে শুরু করে।

## এরপর কী পড়বেন

- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components) — যে boundary runtime styling library বাতিল করে দেয়
- [Chapter ?? — Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) — token-এর contract আসলে যেখানে ঠিক হয়
- [Chapter ?? — Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) — আসল build-এ styling library-র খরচ কীভাবে দেখবেন
