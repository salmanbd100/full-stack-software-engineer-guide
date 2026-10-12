---
sourceHash: "b26069d24af0b30831802f9d6125a63d52f3df04beacc0c64a5572f1e455858a"
title: "Accessibility কেন, আর আইন কী বলে"
translatedAt: "2026-10-12T07:52:31.792Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Accessibility কেন, আর আইন কী বলে {#ch-accessibility-and-the-law}

> আপনার product-এ কোন নিয়মগুলো খাটে, সেগুলো কোন conformance level চায়, আর design review-কে কোন সংখ্যাগুলো ছুঁতেই হবে, তা জানুন।

**এই অধ্যায়ে:** কেন এটা এখন আইনি প্রশ্ন · web team পর্যন্ত পৌঁছায় এমন চারটি আইন · WCAG-এর গঠন আর AA লক্ষ্য · WCAG 2.2 কী যোগ করেছে · সংখ্যাগুলো · platform user সম্পর্কে আগে থেকেই কী জানে

## 💡 মূল ধারণা

আগে accessibility-র পক্ষে যুক্তি দেওয়া হতো নৈতিকতা আর বাজারের আকার দিয়ে। দুটো যুক্তিই সত্য। মোটামুটি প্রতি
ছয়জনে একজন কোনো না কোনো disability নিয়ে বাঁচেন। সাময়িক চোট, বা কড়া রোদে এক মুহূর্ত, একজন সুস্থ user-কেও
এক বিকেলের জন্য একই অবস্থায় ফেলে দেয়। June 2025 থেকে ইউরোপের বেশিরভাগ product meeting-এ একটা ছোট যুক্তিই
চলে: **এটা আইন, আর deadline পেরিয়ে গেছে। জরিমানা পড়ে সেই company-র ঘাড়ে, যে EU-তে বিক্রি করে, company-টি
যেখানেই থাকুক।**

এতে একজন engineer-এর কাজ একটা নির্দিষ্ট দিকে বদলে যায়। Accessibility হয়ে যায় **একটি নাম-দেওয়া standard আর
test করা যায় এমন threshold-সহ একটি requirement**, ঠিক একটি security control-এর মতো। এটা আর এমন কোনো quality
নয়, যা deadline-এর চাপে যে কেউ ছেড়ে দিতে পারে। Senior দক্ষতা হলো জানা, কোন standard খাটে আর সেটা আসলে কী চায়।
এর মানে এটাও জানা, সেই দাবিগুলোর কোনগুলো একটি code review ধরতে পারে।

> কেউ আপনাকে success criteria মুখস্থ করতে বলছে না। তারা জানতে চায়, লক্ষ্যটা কী তা আপনি জানেন কি না, আর যা
> ship করেছেন সেটা লক্ষ্য পূরণ করে কি না।

## কীভাবে কাজ করে

### Web team পর্যন্ত পৌঁছায় এমন চারটি নিয়ম

| আইন | কাদের ওপর খাটে | Technical standard | কবে থেকে |
| --- | --- | --- | --- |
| **European Accessibility Act** (Directive (EU) 2019/882) | EU-র consumer-দের কাছে আওতাভুক্ত product আর service বিক্রি করা private company — e-commerce, banking, পরিবহন, e-book, telecom | EN 301 549, যা WCAG-কে ধারণ করে | কার্যকর **28 June 2025** থেকে |
| **Web Accessibility Directive** (2016/2102) | EU-র public sector প্রতিষ্ঠান আর তাদের supplier | EN 301 549 (এখন v3.2.1 version-টি উদ্ধৃত হয়) | 2019–2020 |
| **ADA Title II final rule** (US) | US-এর state আর local government, আর যে vendor-দের কাছ থেকে তারা কেনে | WCAG 2.1 AA | Compliance-এর তারিখ **April 2026** থেকে, জনসংখ্যা অনুযায়ী |
| **Section 508** (US) | US federal agency আর তাদের supplier | WCAG 2.0 AA baseline | 2018 |

দুটো ফলাফল মানুষ খেয়াল করে না। **EAA company-কে নয়, customer-কে অনুসরণ করে।** London, Dhaka বা Austin-এর একটি
company, যে EU-র consumer-দের কাছে বিক্রি করে, সে এর আওতার ভেতরে। আর **প্রয়োগ হয় দেশভিত্তিক**: প্রতিটি member
state নিজের জরিমানা আর অভিযোগের পথ ঠিক করে। তাই "জরিমানা কত" প্রশ্নের সাতাশটা উত্তর আছে, আর কোনোটাই কাজের
প্রশ্ন নয়। কাজের প্রশ্ন হলো, product-টি একটি audit পাস করতে পারবে কি না।

> ⚠️ Regulator-দের আগেই procurement কামড় বসায়। Enterprise আর public-sector buyer-রা security review-এর সময়েই
> একটি accessibility conformance report চায়। এর template হলো **VPAT**, আর পূরণ করা report-টি হলো ACR। একটি
> ACR না থাকায় sales cycle আটকে যাওয়া — বেশিরভাগ engineering team এভাবেই শেখে যে ব্যাপারটা সত্যি।

### WCAG, আর কেন AA-ই আসল সংখ্যা

Web Content Accessibility Guidelines হলো table-এর প্রতিটি নিয়মের technical বিষয়বস্তু। WCAG 2.2 **October 2023**-এ
W3C Recommendation হয়েছে, আর এখন build করার জন্য এটাই বর্তমান version।

| নীতি | মানে | সাধারণ ব্যর্থতা |
| --- | --- | --- |
| **Perceivable** | যেকোনো user content অনুভব করতে পারেন | Alternative text নেই, contrast নির্ধারিত ratio-র নিচে |
| **Operable** | Interface যেকোনো input device দিয়ে কাজ করে | Keyboard trap, mouse ছাড়া control-এ পৌঁছানো যায় না |
| **Understandable** | আচরণ আর ভাষা অনুমান করা যায় | Label ছাড়া field, page ভেদে navigation-এর জায়গা বদলায় |
| **Robust** | Assistive technology markup বুঝতে পারে | পরস্পরবিরোধী ARIA, এমন state যা কখনো announce হয় না |

প্রতিটি নীতির ভেতরে তিনটি conformance level-এ নম্বর দেওয়া **success criteria** আছে। **AA-ই সেই level যা গুরুত্বপূর্ণ**,
কারণ ওপরের প্রতিটি আইন এটার নাম করে। A হলো সর্বনিম্ন সীমা, compliance-এর জন্য যথেষ্ট নয়। কিছু public-sector
ক্ষেত্রে AAA চাওয়া হয়। এতে এমন criteria আছে যা কিছু ধরনের content-এর জন্য অসম্ভব, তাই W3C নিজেই একে সাধারণ
লক্ষ্য হিসেবে সুপারিশ করে না।

### WCAG 2.2 কী যোগ করেছে, আর কী বাদ দিয়েছে

WCAG 2.2 A আর AA level-এ ছয়টি নতুন criteria যোগ করেছে। 2027-এর একটি interview এগুলো নিয়ে প্রশ্ন করে, কারণ এগুলো
এতটাই নতুন যে বেশিরভাগ codebase এগুলোতে fail করে।

| Criterion | Level | কী চায় |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Focus পাওয়া element একটি sticky header বা cookie bar-এর নিচে পুরোপুরি ঢাকা পড়ে না |
| 2.5.7 Dragging Movements | AA | Drag করা যায় এমন সবকিছুর একটি single-pointer বিকল্প আছে — শুধু drag নয়, একটি Move button |
| 2.5.8 Target Size (Minimum) | AA | Interactive target অন্তত **24 × 24 CSS px**, অথবা পূরণ করার মতো ফাঁকা জায়গা রেখে বসানো |
| 3.2.6 Consistent Help | A | যে page-গুলোতে help link আছে, প্রতিটিতে সেটা একই জায়গায় থাকে |
| 3.3.7 Redundant Entry | A | একটি flow-তে আগে দেওয়া তথ্য আবার চাওয়া হয় না, একান্ত দরকার না হলে |
| 3.3.8 Accessible Authentication (Minimum) | AA | Login করতে কোনো cognitive test নেই — paste আর password manager কাজ করতেই হবে |

WCAG 2.2 **4.1.1 Parsing বাদও দিয়েছে।** Duplicate `id` attribute আর বন্ধ না করা tag এখন নিজে থেকে আর conformance
failure নয়। Browser এগুলো সামলে নেয়, আর আসল ক্ষতি অন্য একটি criterion-এর অধীনে ধরা পড়ে। 2.1 অনুযায়ী লেখা
audit এখনো এটা flag করে।

> ⚠️ **লক্ষ্য বদলাচ্ছে:** WCAG 3.0 বছরের পর বছর working draft হয়ে আছে। এটা Recommendation নয়, শিগগির হবেও না।
> আর এটা পরামর্শ নয়, scoring model বদলায়। 2.2 AA অনুযায়ী build করুন। প্রতিটি version-এর নিচের টেকসই নীতি একই:
> content-কে perceivable, operable, understandable আর robust হতে হবে, এমন একটি interface-এর মাধ্যমে যা লেখকের
> নিয়ন্ত্রণে নেই।

### যে সংখ্যাগুলো design review-কে ধরে রাখতে হবে

Team-গুলো এই criteria Figma-তে ঠিক করে, তারপর একটি pull request-এ এগুলো নিয়ে তর্ক করে। এগুলোই মুখস্থ রাখার
মতো।

| বিষয় | Requirement | Level |
| --- | --- | --- |
| Body text-এর contrast | Background-এর সাপেক্ষে 4.5 : 1 | AA (1.4.3) |
| বড় text — 18pt, বা 14pt bold | 3 : 1 | AA (1.4.3) |
| Icon, border, focus ring, chart series | 3 : 1 | AA (1.4.11) |
| Interactive target-এর আকার | 24 × 24 CSS px | AA (2.5.8) |
| Text resize | 200% zoom-এ ব্যবহারযোগ্য, কোনো content হারায় না | AA (1.4.4) |
| Reflow | 320 CSS px width-এ দুই দিকে scroll করতে হয় না | AA (1.4.10) |

সাদার ওপর `#999` প্রায় 2.8 : 1, আর body text-এর জন্য fail করে। Industry-তে handoff-এর সবচেয়ে সাধারণ ত্রুটি এটাই।
আর **রং কখনো একমাত্র সংকেত হতে পারে না**। Icon বা text ছাড়া একটি লাল border একজন colourblind user-কে কিছুই
বলে না। Contrast যত ভালোই হোক, এটা 1.4.1-এ fail করে।

### User-এর কী দরকার, platform আগে থেকেই জানে

Operating system accessibility preference expose করে, আর সেগুলো মানতে কয়েক line CSS লাগে। এটাই হাতের কাছে
সবচেয়ে সস্তা accessibility-র কাজ, আর প্রায় কেউই চারটিই করে না।

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

Forced-colors mode-এ browser `background-color`, `color` আর `border-color` override করে। যে component শুধু একটি
background gradient-এ অর্থ বহন করত, সেটা ফাঁকা হয়ে যায়। এজন্যই একটি icon বা border সাজসজ্জা নয়, সঠিকতার
সিদ্ধান্ত।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী খাটে | কী করবেন |
| --- | --- | --- |
| EU-তে বিক্রি হওয়া consumer product | EAA, EN 301 549 আর WCAG 2.2 AA-র মাধ্যমে | AA-কে release requirement হিসেবে ধরুন, backlog-এর theme হিসেবে নয় |
| Public sector buyer-এর কাছে বিক্রি | WAD বা Section 508, সঙ্গে একটি VPAT-এর অনুরোধ | Procurement চাওয়ার আগেই একটি ACR তৈরি রাখুন |
| US state বা local government-এর contract | ADA Title II, WCAG 2.1 AA | একই কাজ; 2.2 AA এর superset |
| পুরোপুরি internal tool | কোনো আইন নেই, তবে কর্মসংস্থান আইন এখানেও পৌঁছায় | অন্তত keyboard আর screen reader support |
| একটি accessibility "audit" এসে পৌঁছায় | Criterion ধরে ধরে একটি report | Criterion আর level অনুযায়ী triage করুন, screenshot অনুযায়ী নয় |

## সাধারণ ভুল

**❌ একটি overlay widget-কে compliance ধরে নেওয়া**

> Third-party "accessibility widget" একটি toolbar ঢুকিয়ে দেয়। এগুলো নিচের markup ঠিক করে না, আর একটি `div`-কে
> button বানাতে পারে না। অভিযোগে নিয়মিত এদের নাম আসে। সমাধান আপনার code-এ।

**❌ নিরাপদ শোনায় বলে AAA-কে লক্ষ্য করা**

> AAA-তে এমন criteria আছে যা কোনো product সব content জুড়ে পূরণ করতে পারে না, তাই AAA-র দাবি সাধারণত মিথ্যা।
> আইন AA চায়। যেখানে সস্তা, সেখানে এর বেশি করুন, আর কোন level দাবি করছেন তা বলে দিন।

**❌ Project-এর শেষে audit করা**

> Accessibility-র ত্রুটি বেশিরভাগই কাঠামোগত: ভুল element, ভুল focus order। Component library বানানোর পরে এগুলো
> খুঁজে পেলে আপনাকে attribute বদলানোর বদলে component নতুন করে লিখতে হবে।

**✅ যা support করেন না, তা প্রকাশ করা**

> যে সৎ ACR দুটো জানা ঘাটতি আর একটি সমাধানের তারিখ উল্লেখ করে, সেটা procurement পার হয়ে যায়। যে নিখুঁত ACR
> সত্য নয়, সেটা প্রথম আসল audit-এই fail করে।

## 🔑 মূল শিক্ষা

- European Accessibility Act 28 June 2025 থেকে কার্যকর, আর এটা customer-কে অনুসরণ করে, তাই EU-র consumer-দের কাছে বিক্রি করা যেকোনো company পর্যন্ত পৌঁছায়।
- প্রতিটি আইন WCAG 2.2 AA-কে লক্ষ্য হিসেবে নাম করে; A যথেষ্ট নয়, আর AAA ঢালাও দাবি হিসেবে অর্জন করা যায় না।
- WCAG 2.2 A আর AA level-এ ছয়টি criteria যোগ করেছে আর 4.1.1 Parsing বাদ দিয়েছে। ছয়টি হলো focus ঢাকা না পড়া, drag-এর বিকল্প, 24 × 24 target, সামঞ্জস্যপূর্ণ help, একই তথ্য দ্বিতীয়বার না চাওয়া আর accessible authentication।
- মুখস্থ রাখার মতো সংখ্যা হলো text-এর জন্য 4.5 : 1, text নয় এমন সবকিছুর জন্য 3 : 1, আর target-এর জন্য 24 × 24 CSS px।
- শুধু রং কখনো অর্থ বহন করতে পারে না, আর forced-colors mode background-এ থাকা যেকোনো অর্থ মুছে দেবে।

## Interview-এর প্রশ্ন

**Q: আপনার company পুরো ইউরোপে যে product বিক্রি করে, তার ওপর কোন accessibility নিয়ম খাটে?**

European Accessibility Act, June 2025 থেকে কার্যকর। এটা company কোন দেশে প্রতিষ্ঠিত তা নয়, customer-কে অনুসরণ
করে। এর technical বিষয়বস্তু হলো EN 301 549, যা WCAG-কে ধারণ করে, তাই বাস্তবে লক্ষ্য হলো WCAG 2.2 AA। প্রয়োগ হয়
দেশভিত্তিক, তাই জরিমানা member state ভেদে আলাদা। ভেতরে যে প্রশ্নের উত্তর দেওয়া দরকার, তা হলো product-টি একটি
audit পাস করবে কি না। Buyer-রা যে নথি চায়, তা হলো একটি conformance report।

**Q: A বা AAA নয়, কেন AA?**

EAA, Web Accessibility Directive, ADA Title II আর Section 508 — সবাই AA-র নাম করে। তাই বেশিরভাগ product-এর জন্য
এটাই একমাত্র level যার আইনি অর্থ আছে। A contrast আর বেশিরভাগ keyboard requirement বাদ দেয়, যা দিয়ে ব্যবহারযোগ্য
product হয় না। AAA-তে এমন criteria আছে যা ইচ্ছামতো content জুড়ে কেউ পূরণ করতে পারে না, তাই AAA-র দাবি সাধারণত
ভুল। ভালো হলো AA ঠিকভাবে পূরণ করা, আর যেখানে সস্তা সেখানে এর বেশি করা।

**Q: WCAG 2.2 কী বদলেছে?**

এটা A আর AA level-এ ছয়টি criteria যোগ করেছে, যেগুলো মূলত ভালো team-গুলো আগে থেকে যা করত তাকেই আনুষ্ঠানিক
রূপ দেয়। একটি sticky header focus পাওয়া element-কে পুরোপুরি ঢেকে দিতে পারবে না। Drag করা যায় এমন সবকিছুর
একটি single-pointer বিকল্প লাগবে। Target হতে হবে 24 × 24 CSS pixel, আর help থাকতে হবে একটি নির্দিষ্ট জায়গায়।
একটি flow একই তথ্য দুবার চাইতে পারবে না। Login-এ কোনো cognitive test লাগবে না, তাই paste আর password manager
কাজ করতেই হবে। এটা parsing criterion-টিও বাদ দিয়েছে, কারণ browser ভুল markup সামলে নেয়।

**Q: একজন designer-এর palette secondary text-এর জন্য `#999` ব্যবহার করে। আপনি কী বলবেন?**

বলব যে সাদার সাপেক্ষে এটা মোটামুটি 2.8 : 1, আর 1.4.3-এ fail করে, যেটা body text-এর জন্য 4.5 : 1 চায়। আমি মতামত
নয়, একটি মাপা সংখ্যা নিয়ে যাব, আর সবচেয়ে কাছের পাস করা value প্রস্তাব করব। তারপর একই palette 3 : 1-এর non-text
ক্ষেত্রগুলোর জন্য যাচাই করব: icon, input border, focus ring আর chart series। এগুলো চুপচাপ fail করে, আর audit এগুলো
ধরে ফেলে। Brand যদি ওই grey-এর ওপর নির্ভর করে, তাহলে বড় display text-এর জন্য 3 : 1-এ এটা থাকতে পারে।

**Q: কখন আপনি একটি accessibility সমস্যা সঙ্গে সঙ্গে ঠিক করবেন না?**

যখন এটা সত্যিকারের একটি AAA criterion। অথবা যখন এটা এমন একটি surface-এর ত্রুটি, যার বদলি নির্ধারিত আছে আর
user-এর সেখানে পৌঁছানোর কোনো পথ নেই। দুই ক্ষেত্রেই আমি এটাকে অদৃশ্য থাকতে না দিয়ে একটি তারিখসহ conformance
report-এ লিখে রাখব। কাঠামোগত কিছুই আমি পিছিয়ে দেব না: এমন control যা আসলে control নয়, label ছাড়া form field,
keyboard trap। এগুলো এখন ঠিক করা সস্তা, আর যত sprint টিকে থাকে, খরচ তত বাড়ে।

## এরপর কী পড়বেন

- [Chapter ?? — Accessibility Tree](#ch-accessibility-tree) — assistive technology আসলে কী পড়ে
- [Chapter ?? — Accessibility Testing](#ch-testing-accessibility) — আপনি মান পূরণ করছেন কি না, কীভাবে জানবেন
- [Chapter ?? — Semantic HTML](#ch-semantic-html) — যে markup এই criteria-র বেশিরভাগ বিনা খরচে পূরণ করে
