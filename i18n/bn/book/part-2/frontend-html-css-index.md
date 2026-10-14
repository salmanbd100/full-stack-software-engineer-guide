---
sourceHash: "eb56d04899b1e08fcb1084a43ea44d78e712cfea96b6476738fed54dbcf40c8f"
title: "Part II — HTML ও CSS"
translatedAt: "2026-10-14T04:47:28.685Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — HTML ও CSS

প্রতিটি framework যে platform-এর ওপর দাঁড়িয়ে, এটা সেই স্তর। যে engineer এটা এড়িয়ে গেছেন, interview-এ তিনি
দেয়ালে ঠেকেন। প্রশ্ন যখনই state ছেড়ে document নিয়ে হতে শুরু করে, তখনই সেটা ধরা পড়ে। Focus ring উধাও হলো কেন?
Modal কেন screen reader-কে আটকে ফেলে? Cascade কেন এমন rule বেছে নিল, যা আপনি আশা করেননি? এই অংশ markup আর
styling-কে syntax হিসেবে দেখে না, দেখে engineering-এর সিদ্ধান্ত হিসেবে, যার ফল আছে।

অংশটা ইচ্ছে করেই ছোট। Interviewer-রা ধরে নেন senior candidate layout-এর কলকবজা জানেন: box model, flexbox, grid,
breakpoint আর keyframe। এগুলো মুখস্থ বলতে প্রায় কখনোই বলা হয় না। তাঁরা খোঁজেন সেই জায়গাগুলো, যার আইনি বা
architecture-এর ফল আছে। কোন element বেছে নিয়েছেন? Mouse ছাড়া পাতাটা চলে? 2023-এর পর আসা কোন feature এমন
workaround-এর জায়গা নিয়েছে, যা আপনি এখনো বয়ে বেড়াচ্ছেন?

**Accessibility আগে এখানে তৃতীয় অধ্যায় ছিল, এখন সেটা নিজেই একটা অংশ**, পাঁচটি অধ্যায় নিয়ে,
[Part II — Accessibility](#ch-frontend-accessibility-index)-এ। এই অংশ থেকে সেটা বড় হয়ে বেরিয়ে গেছে ঠিক সেই
কারণে, যে কারণে সেটা পড়ার মতো। European Accessibility Act কার্যকর হয়েছে June 2025-এ, তাই accessibility এখন
নির্দিষ্ট standard-সহ একটা আইনি বাধ্যবাধকতা। Frontend round-এ senior candidate-কে mid-level থেকে সবচেয়ে
নির্ভরযোগ্যভাবে আলাদা করে যে দুটি বিষয়, internationalisation-এর পাশাপাশি এটাও তার একটি।

## অধ্যায়গুলো

| #  | অধ্যায়                                        | কোন প্রশ্নের উত্তর দেয়                                       |
| -- | ---------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Semantic HTML](#ch-semantic-html)             | কোন element, আর সেটা বেছে নিলে বিনা খরচে কী পাওয়া যায়?          |
| 02 | [Advanced CSS](#ch-advanced-css)               | 2023-এর পর কী এসেছে, আর প্রতিটি feature কীসের জায়গা নিয়েছে?    |
| 03 | [Container Query ও Cascade Layer](#ch-container-queries-and-layers) | Component তার জায়গা অনুযায়ী কীভাবে বদলায়, আর সংঘাতে কে জেতে? |
| 04 | [Animation ও View Transition](#ch-animation-and-view-transitions) | কোন property animate করা বিনা খরচের, আর দুটি state কে ধরে রাখে? |

## Interviewer-রা যা যাচাই করেন

এই part-এ senior-এর লক্ষণ হলো **library-র দিকে হাত বাড়ানোর আগে platform-এর দিকে তাকানো।** Round-এ সেটা দেখা
যায় এভাবে:

- **Accessibility কি গোড়া থেকেই আছে, নাকি পরে জোড়া দেওয়া?** যে candidate প্রথমেই `role` আর `aria-label` নেন,
  তাঁর উত্তর খারাপ। প্রথম ঠিক পদক্ষেপ হলো এমন element বেছে নেওয়া, যার semantics আগে থেকেই আছে। এই যুক্তির বাকিটা
  আছে [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)-এ।
- **Cascade কি এতটা জানেন যে debug করতে পারবেন?** মানে specificity, inheritance আর cascade layer। এটাও জানা, কেন
  utility class-এ `!important` একটা design সিদ্ধান্ত, জোড়াতালি নয়। পরীক্ষাটা হলো ভুল style হওয়া কিছুর একটা
  screenshot, আর প্রশ্ন: "কেন?"
- **হালনাগাদ আছেন?** Container query, `:has()`, cascade layer, subgrid আর `oklch()` প্রত্যেকে একটা করে
  workaround-এর জায়গা নিয়েছে। কোন workaround-এর জায়গা নিয়েছে, তার নাম বলতে পারলেই নম্বর।
- **Layout কীসে trigger হয়, বোঝেন?** `width` animate করা আর `transform` animate করা দেখতে এক, কিন্তু খরচ একদম আলাদা।
  Part IV-এর performance-এর আলোচনা শুরু হয় এখান থেকেই।

**একই প্রশ্নে mid আর senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "এটাকে accessible করুন" | `role` আর `aria-label` যোগ করেন | এমন element বেছে নেন যার semantics আগে থেকেই আছে, আর ARIA দেন শুধু HTML যা বলতে পারে না তার জন্য |
| "এখানে style ভুল কেন?" | "`!important` দিয়ে দিই" | আগে specificity, তারপর inheritance, তারপর কোন cascade layer জিতল — আর `!important` হলে সেটা ঘোষিত design সিদ্ধান্ত |
| "এই animation আটকে আটকে চলে কেন?" | "`will-change` লাগবে" | `width` animate করলে প্রতি frame-এ layout হয়; `transform` তা ছাড়াই composite হয় |

## পড়ার ক্রম

টানা পড়ে যান। প্রতিটি অধ্যায় স্বাধীন, আগে কিছু না পড়েই পড়া যায়। তারপর যান
[Part II — Accessibility](#ch-frontend-accessibility-index)-এ। এই অংশের document-এর দিকটা সেখানেই চলতে থাকে,
আর senior interview-এর জন্য সেটাই বেশি দামি পড়া।

**Interview sprint:** 01, তারপর accessibility অংশ। Framework-এ যাওয়ার আগে frontend interview document নিয়ে যা
জিজ্ঞেস করে, তার বেশিরভাগই semantics আর accessibility-তে পড়ে। Chapter 02-এ এক ঘণ্টা দেওয়া পোষায় শুধু তখন, যখন
role-এ CSS-এর নাম স্পষ্ট করে বলা আছে।
