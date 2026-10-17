---
sourceHash: "b26069d24af0b30831802f9d6125a63d52f3df04beacc0c64a5572f1e455858a"
title: "Accessibility কেন, আর আইন কী বলে"
translatedAt: "2026-10-17T01:00:04.105Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessibility কেন, আর আইন কী বলে {#ch-accessibility-and-the-law}

> আপনার product-এ কোন নিয়ম খাটে, তারা কোন conformance level চায়, আর design review-কে কোন সংখ্যাগুলো মানতে হবে, তা জেনে নিন।

**এই অধ্যায়ে:** এটা এখন কেন আইনের প্রশ্ন · web team-এর কাছে পৌঁছায় যে চারটি আইন · WCAG-এর কাঠামো আর AA লক্ষ্য · WCAG 2.2 কী যোগ করেছে · সংখ্যাগুলো · platform user সম্পর্কে আগে থেকেই যা জানে

## 💡 মূল ধারণা

আগে accessibility-র পক্ষে যুক্তি দেওয়া হতো নৈতিকতা আর বাজারের আকার দিয়ে, আর দুটি যুক্তিই সত্যি। মোটামুটি প্রতি ছয়জনে
একজন কোনো না কোনো প্রতিবন্ধিতা নিয়ে বাঁচেন। সাময়িক চোট, বা কড়া রোদে এক মুহূর্ত, একজন সুস্থ user-কেও এক বিকেলের জন্য
একই অবস্থায় ফেলে দেয়। তবে 2025 সালের জুন থেকে ইউরোপের বেশিরভাগ product meeting-এ যুক্তিটা আরও ছোট: **এটা আইন, আর
সময়সীমা পেরিয়ে গেছে। জরিমানা হয় সেই company-র, যে EU-তে বিক্রি করে, company-টা যেখানেই থাকুক।**

এতে engineer-এর কাজ একটি নির্দিষ্ট জায়গায় বদলে যায়। Security control-এর মতোই accessibility এখন **নির্দিষ্ট standard আর
যাচাই করা যায় এমন সীমাসহ একটি বাধ্যবাধকতা**। Deadline-এর চাপে কেউ এটা ছেঁটে ফেলতে পারে না। Senior-এর দক্ষতা হলো জানা,
কোন standard খাটে আর সেটা আসলে কী চায়। সঙ্গে এটাও জানা, সেসব চাহিদার কোনগুলো code review-তে ধরা পড়ে।

> কেউ আপনাকে success criterion মুখস্থ করতে বলছে না। জানতে চাইছে, লক্ষ্যটা কী আপনি জানেন কি না, আর আপনার ship করা
> জিনিস সেটা পূরণ করে কি না।

## কীভাবে কাজ করে

### Web team-এর কাছে পৌঁছায় যে চারটি নিয়ম

| আইন | কার ওপর খাটে | Technical standard | কবে থেকে |
| --- | --- | --- | --- |
| **European Accessibility Act** (Directive (EU) 2019/882) | EU-র ভোক্তাদের কাছে আওতাভুক্ত product আর service বিক্রি করে এমন বেসরকারি company — e-commerce, banking, transport, e-book, telecom | EN 301 549, যার ভেতরে WCAG | কার্যকর **28 June 2025** |
| **Web Accessibility Directive** (2016/2102) | EU-র সরকারি প্রতিষ্ঠান আর তাদের supplier | EN 301 549 (এখন যে version উল্লেখ করা হয় তা v3.2.1) | 2019–2020 |
| **ADA Title II final rule** (US) | US-এর অঙ্গরাজ্য আর স্থানীয় সরকার, আর তারা যাদের কাছ থেকে কেনে | WCAG 2.1 AA | **April 2026** থেকে, জনসংখ্যা অনুযায়ী ধাপে ধাপে |
| **Section 508** (US) | US-এর federal agency আর তাদের supplier | WCAG 2.0 AA-ই ভিত্তি | 2018 |

দুটি ফল মানুষ খেয়াল করে না। **EAA company-কে নয়, customer-কে অনুসরণ করে।** লন্ডন, ঢাকা বা অস্টিনের কোনো company
EU-র ভোক্তাদের কাছে বিক্রি করলে সেটাও এর আওতায় পড়ে। আর **প্রয়োগ হয় দেশভিত্তিক**: প্রতিটি সদস্য দেশ নিজের জরিমানা আর
অভিযোগের পথ ঠিক করে। তাই "জরিমানা কত" প্রশ্নের উত্তর সাতাশটি, আর কোনোটাই কাজের প্রশ্ন নয়। কাজের প্রশ্ন হলো, product-টা
audit পাস করবে কি না।

> ⚠️ Regulator-এর আগেই কামড় দেয় procurement। Enterprise আর সরকারি ক্রেতারা security review-এর সময়েই একটি accessibility
> conformance report চায়। Template-এর নাম **VPAT**, আর পূরণ করা report-টা ACR। ACR নেই বলে sales cycle আটকে গেলে, বেশিরভাগ
> engineering team তখনই বোঝে যে ব্যাপারটা সত্যি।

### WCAG, আর AA-ই কেন আসল সংখ্যা

Table-এর প্রতিটি নিয়মের technical অংশ হলো Web Content Accessibility Guidelines। WCAG 2.2 **October 2023**-এ W3C
Recommendation হয়, আর আজ এটাই সেই version, যা ধরে কাজ করতে হবে।

| নীতি | মানে | সাধারণ ব্যর্থতা |
| --- | --- | --- |
| **Perceivable** | যেকোনো user content টের পান | Alternative text নেই, contrast নির্দিষ্ট অনুপাতের নিচে |
| **Operable** | যেকোনো input device দিয়ে interface চলে | Keyboard trap, mouse ছাড়া control-এ পৌঁছানো যায় না |
| **Understandable** | আচরণ আর ভাষা আগে থেকে আন্দাজ করা যায় | Label ছাড়া field, page ভেদে জায়গা বদলানো navigation |
| **Robust** | Assistive technology markup বুঝতে পারে | পরস্পরবিরোধী ARIA, এমন state যা কখনো announce হয় না |

প্রতিটি নীতির ভেতরে আছে নম্বর দেওয়া **success criterion**, তিনটি conformance level-এ ভাগ করা। **গুরুত্ব AA-র**, কারণ
ওপরের প্রতিটি আইন এই level-এরই নাম করে। A হলো একদম নিচের ধাপ, compliance-এর জন্য যথেষ্ট নয়। AAA কিছু সরকারি ক্ষেত্রে
চাওয়া হয়। তবে এতে এমন criterion আছে, যা কিছু ধরনের content-এর পক্ষে মানা অসম্ভব। তাই W3C নিজেই একে সাধারণ লক্ষ্য হিসেবে
সুপারিশ করে না।

### WCAG 2.2 কী যোগ করল, আর কী বাদ দিল

WCAG 2.2 A আর AA level-এ ছয়টি নতুন criterion যোগ করেছে। 2027-এর interview এগুলো নিয়ে জিজ্ঞেস করে, কারণ এগুলো এতই নতুন
যে বেশিরভাগ codebase এগুলোতে ফেল করে।

| Criterion | Level | কী চায় |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Sticky header বা cookie bar focused element-কে পুরোপুরি ঢেকে দেবে না |
| 2.5.7 Dragging Movements | AA | Drag করা যায় এমন সবকিছুর single-pointer বিকল্প থাকবে — শুধু drag নয়, একটি Move button |
| 2.5.8 Target Size (Minimum) | AA | Interactive target অন্তত **24 × 24 CSS px**, নয়তো সেই ঘাটতি পূরণ করার মতো ফাঁক রেখে বসানো |
| 3.2.6 Consistent Help | A | যেসব page-এ help link আছে, সব page-এ সেটা একই জায়গায় থাকবে |
| 3.3.7 Redundant Entry | A | কোনো flow-এ আগে দেওয়া তথ্য আবার চাওয়া যাবে না, একান্ত দরকার না হলে |
| 3.3.8 Accessible Authentication (Minimum) | AA | Login করতে কোনো cognitive test নয় — paste আর password manager কাজ করতেই হবে |

WCAG 2.2 **4.1.1 Parsing বাদও দিয়েছে।** Duplicate `id` attribute আর বন্ধ না করা tag এখন আর নিজে থেকে conformance-এর
ব্যর্থতা নয়। Browser এগুলো সামলে নেয়, আর আসল ক্ষতি ধরা পড়ে অন্য কোনো criterion-এ। তবে 2.1 ধরে লেখা audit এখনো এটা
flag করে।

> ⚠️ **যা বদলাতে থাকে:** WCAG 3.0 বছরের পর বছর working draft হয়ে আছে। এটা Recommendation নয়, শিগগির হবেও না। আর এটা
> পরামর্শ নয়, scoring model বদলায়। কাজ করুন 2.2 AA ধরে। প্রতিটি version-এর নিচে টেকসই নীতি একই: content-কে
> perceivable, operable, understandable আর robust হতে হবে, এমন interface দিয়ে যা লেখকের নিয়ন্ত্রণে নেই।

### Design review-কে যে সংখ্যাগুলো ধরে রাখতে হবে

Team এই criterion-গুলো ঠিক করে Figma-তে, তারপর তা নিয়ে তর্ক করে pull request-এ। মুখস্থ রাখার মতো এগুলোই।

| বিষয় | যা লাগবে | Level |
| --- | --- | --- |
| Body text-এর contrast | Background-এর তুলনায় 4.5 : 1 | AA (1.4.3) |
| বড় লেখা — 18pt, বা 14pt bold | 3 : 1 | AA (1.4.3) |
| Icon, border, focus ring, chart series | 3 : 1 | AA (1.4.11) |
| Interactive target-এর আকার | 24 × 24 CSS px | AA (2.5.8) |
| লেখা বড় করা | 200% zoom-এ ব্যবহার করা যায়, কোনো content হারায় না | AA (1.4.4) |
| Reflow | 320 CSS px width-এ দুই দিকে scroll করতে হয় না | AA (1.4.10) |

সাদার ওপর `#999` প্রায় 2.8 : 1, তাই body text-এ ফেল করে। পুরো industry-তে design handoff-এর সবচেয়ে সাধারণ defect এটাই।
আর **রং কখনো একমাত্র সংকেত হতে পারে না**। Icon বা লেখা ছাড়া লাল border একজন colourblind user-কে কিছুই বলে না। Contrast যত
জোরালোই হোক, এটা 1.4.1-এ ফেল করে।

### User-এর কী লাগে, platform আগে থেকেই জানে

Operating system accessibility-র পছন্দগুলো জানিয়ে দেয়, আর সেগুলো মানতে CSS-এর কয়েকটি line লাগে। এর চেয়ে সস্তা
accessibility-র কাজ আর নেই, অথচ চারটিই করে প্রায় কেউই না।

```css
/* Vestibular disorders — motion can cause nausea, not just annoyance. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Windows High Contrast and similar modes replace your palette entirely. */
@media (forced-colors: active) {
  .card {
    border: 1px solid CanvasText; /* System colour keyword, not your brand token. */
  }
}

/* The user asked for more contrast; give it to them rather than your brand grey. */
@media (prefers-contrast: more) {
  :root { --text-muted: #1f2937; }
}
```

Forced-colors mode-এ browser `background-color`, `color` আর `border-color` নিজের মতো বদলে দেয়। যে component তার অর্থ
বহন করত শুধু background gradient দিয়ে, সেটা ফাঁকা হয়ে যায়। এজন্যই icon বা border সাজসজ্জা নয়, সঠিকতার সিদ্ধান্ত।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী খাটে | কী করবেন |
| --- | --- | --- |
| EU-তে বিক্রি হওয়া consumer product | EAA, EN 301 549 আর WCAG 2.2 AA হয়ে | AA-কে release-এর শর্ত ধরুন, backlog-এর কোনো theme নয় |
| সরকারি ক্রেতার কাছে বিক্রি | WAD বা Section 508, সঙ্গে VPAT চাওয়া | Procurement চাওয়ার আগেই ACR তৈরি রাখুন |
| US-এর অঙ্গরাজ্য বা স্থানীয় সরকারের contract | ADA Title II, WCAG 2.1 AA | একই কাজ; 2.2 AA এর পুরোটাই ধারণ করে |
| শুধু ভেতরের tool | কোনো নির্দিষ্ট আইন নেই, তবে কর্মসংস্থান আইন এখানেও পৌঁছায় | অন্তত keyboard আর screen reader support |
| Accessibility "audit" হাতে এসেছে | Criterion ধরে ধরে একটি report | Screenshot ধরে নয়, criterion আর level ধরে triage করুন |

## সাধারণ ভুল

**❌ Overlay widget-কে compliance ভাবা**

> Third-party "accessibility widget" একটি toolbar বসিয়ে দেয়। নিচের markup এতে ঠিক হয় না, আর একটি `div`-কে এরা button
> বানাতে পারে না। অভিযোগে নিয়মিত এদের নাম আসে। সমাধান আপনার code-এ।

**❌ নিরাপদ শোনায় বলে AAA লক্ষ্য করা**

> AAA-তে এমন criterion আছে, যা কোনো product সব content-এ মানতে পারে না, তাই AAA-র দাবি সাধারণত মিথ্যা। আইন চায় AA।
> যেখানে সস্তায় হয় সেখানে তার বেশি করুন, আর কোন level দাবি করছেন তা স্পষ্ট বলুন।

**❌ Project-এর শেষে গিয়ে audit করা**

> Accessibility-র defect বেশিরভাগই কাঠামোগত: ভুল element, ভুল focus order। Component library বানানো শেষ হওয়ার পরে এগুলো
> ধরা পড়লে শুধু attribute বদলালে হয় না, component নতুন করে লিখতে হয়।

**✅ যা support করেন না, তা প্রকাশ করা**

> যে সৎ ACR দুটি জানা ঘাটতি আর তা ঠিক করার তারিখ বলে দেয়, সেটা procurement পার হয়। যে নিখুঁত ACR সত্যি নয়, সেটা প্রথম
> আসল audit-এই ফেল করে।

## 🔑 মূল শিক্ষা

- European Accessibility Act 28 June 2025 থেকে কার্যকর, আর এটা customer-কে অনুসরণ করে। তাই EU-র ভোক্তাদের কাছে বিক্রি করা যেকোনো company এর আওতায় পড়ে।
- প্রতিটি আইন যে লক্ষ্যের নাম করে তা WCAG 2.2 AA; A যথেষ্ট নয়, আর ঢালাওভাবে AAA দাবি করা সম্ভব নয়।
- WCAG 2.2 A আর AA level-এ ছয়টি criterion যোগ করেছে আর 4.1.1 Parsing বাদ দিয়েছে। ছয়টি হলো focus ঢাকা না পড়া, drag-এর বিকল্প, 24 × 24 target, একই জায়গায় help, একই তথ্য দুবার না চাওয়া, আর accessible authentication।
- মুখস্থ রাখার মতো সংখ্যা: লেখার জন্য 4.5 : 1, লেখা নয় এমন সবকিছুর জন্য 3 : 1, আর target-এর জন্য 24 × 24 CSS px।
- শুধু রং কখনো অর্থ বহন করতে পারে না, আর background-এ থাকা যেকোনো অর্থ forced-colors mode মুছে দেবে।

## Interview-এর প্রশ্ন

**Q: আপনার company পুরো ইউরোপে যে product বিক্রি করে, তাতে accessibility-র কোন নিয়মগুলো খাটে?**

European Accessibility Act, যা 2025 সালের জুন থেকে কার্যকর। এটা company কোন দেশে প্রতিষ্ঠিত তা দেখে না, customer-কে
অনুসরণ করে। এর technical অংশ হলো EN 301 549, যার ভেতরে WCAG। তাই বাস্তবে লক্ষ্য WCAG 2.2 AA। প্রয়োগ হয় দেশভিত্তিক, তাই
জরিমানা সদস্য দেশভেদে আলাদা। ভেতরে যে প্রশ্নের উত্তর খোঁজা দরকার, তা হলো product-টা audit পাস করবে কি না। ক্রেতারা যে
নথি চান, তা একটি conformance report।

**Q: A বা AAA নয়, AA কেন?**

EAA, Web Accessibility Directive, ADA Title II আর Section 508, সবাই AA-র নাম করে। তাই বেশিরভাগ product-এর জন্য আইনি অর্থ
আছে শুধু এই level-এরই। A-তে contrast আর keyboard-এর বেশিরভাগ শর্ত নেই, তাতে ব্যবহারযোগ্য product হয় না। AAA-তে এমন
criterion আছে, যা যেকোনো content-এ কেউ মানতে পারে না, তাই AAA-র দাবি সাধারণত ভুল। তার চেয়ে AA ঠিকভাবে মানুন, আর যেখানে
সস্তায় হয় সেখানে তার বেশি করুন।

**Q: WCAG 2.2 কী বদলেছে?**

A আর AA level-এ ছয়টি criterion যোগ করেছে, যা মূলত ভালো team-গুলো আগে থেকেই যা করত, সেটাকে আনুষ্ঠানিক রূপ দেয়। Sticky
header focused element-কে পুরোপুরি ঢাকতে পারবে না। Drag করা যায় এমন সবকিছুর single-pointer বিকল্প লাগবে। Target হতে হবে
24 × 24 CSS pixel, আর help থাকবে একই জায়গায়। কোনো flow একই তথ্য দুবার চাইবে না। Login-এ কোনো cognitive test লাগবে না, তাই
paste আর password manager কাজ করতেই হবে। আর parsing-এর criterion বাদ দিয়েছে, কারণ browser ভাঙা markup সামলে নেয়।

**Q: একজন designer-এর palette-এ secondary text-এর জন্য `#999`। আপনি কী বলবেন?**

বলব, সাদার ওপর এটা প্রায় 2.8 : 1, তাই 1.4.3-এ ফেল করে, যেখানে body text-এর জন্য 4.5 : 1 লাগে। মতামত নয়, মেপে আনা একটি
সংখ্যা নিয়ে যাব, আর সবচেয়ে কাছের পাস করা value-টা প্রস্তাব করব। তারপর একই palette যাচাই করব লেখা নয় এমন 3 : 1-এর
ক্ষেত্রগুলোর জন্য: icon, input border, focus ring আর chart series। এগুলো চুপচাপ ফেল করে, আর audit সেগুলো ধরে। Brand যদি
এই ধূসরের ওপর নির্ভর করে, বড় display text-এ 3 : 1 হিসেবে সেটা থাকতে পারে।

**Q: কখন accessibility-র কোনো সমস্যা সঙ্গে সঙ্গে ঠিক করবেন না?**

যখন সেটা সত্যিই একটি AAA criterion। অথবা যখন defect-টা এমন অংশে, যার বদলি আসার তারিখ ঠিক হয়ে আছে আর user-এর সেখানে
পৌঁছানোর কোনো পথ নেই। দুই ক্ষেত্রেই সেটা লুকিয়ে না রেখে conformance report-এ একটি তারিখসহ লিখে রাখব। তবে কাঠামোগত কোনো
কিছু পিছিয়ে দেব না: যে control আসলে control নয়, label ছাড়া form field, keyboard trap। এগুলো এখনই ঠিক করা সস্তা, আর যত
sprint টিকে থাকে, খরচ তত বাড়ে।

## এরপর কী পড়বেন

- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — assistive technology আসলে কী পড়ে
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — মান পূরণ করছেন কি না, কীভাবে জানবেন
- [Chapter ?? — Semantic HTML](#ch-semantic-html) — যে markup এর বেশিরভাগ criterion বিনা খরচে পূরণ করে
