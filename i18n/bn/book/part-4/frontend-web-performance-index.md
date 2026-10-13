---
sourceHash: "b36cb4b377a146fae848b7f858843affc42227d941c5e60b93e3790f050513b3"
title: "Part IV — Web Performance"
translatedAt: "2026-10-12T12:16:18.883Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — Web Performance

Part IV যা নিয়ে, performance তার সবচেয়ে স্পষ্ট উদাহরণ। এটা কোনো feature নয়; এটা একটি budget, যার জন্য কাউকে জবাবদিহি
করতে হয়। এই section তিনটি metric নিয়ে, যেগুলো প্রকাশ্যে মাপা হয়, আর সেই loading strategy নিয়ে, যেগুলো এদের নড়ায়। এতে
সেই অংশটিও আছে, যা বেশিরভাগ লেখা বাদ দিয়ে যায়: একটি পরিবর্তন আপনার laptop-কে নয়, সত্যিকারের user-দের সাহায্য করেছে
কিনা, তা কীভাবে জানবেন। একটি AI feature-কে দ্বিতীয় একটি budget-এর কাছে জবাব দিতে হয়, largest paint নয়, first token:
[Chapter ?? — Latency ও Generative UI](#ch-generative-ui)।

শুরুতেই একটি সংশোধন, কারণ প্রকাশিত অনেক লেখায় এটা এখনো ভুল। March 2024-এ **INP, FID-এর জায়গা নিয়েছে** Core Web
Vital হিসেবে। FID মাপত প্রথম interaction handle হওয়ার আগের delay, আর প্রায় সব site-ই এতে pass করত। INP প্রতিটি
interaction-কে paint পর্যন্ত পুরো পথ মাপে, আর সবচেয়ে খারাপটি নেয়। যেসব site সহজেই FID-এ pass করত, তারা প্রায়ই INP-তে
fail করে, আর 2027-এ এসেও যে candidate FID বলেন, তাঁকে পুরনো শোনায়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Core Web Vitals](#ch-core-web-vitals) | কোন fix কোন metric নড়ায়? |
| 02 | [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) | Largest paint পিছিয়ে না দিয়ে কীভাবে defer করবেন, আর কী bundle-কে আবার বড় হতে দেয় না? |
| 03 | [Caching ও Asset Delivery](#ch-asset-delivery) | কোন response কোন cache-এ থাকে, আর image, font আর CSS আসার আগে page দেখতে কেমন? |
| 04 | [Production-এ মাপা](#ch-measuring-in-production) | সত্যিকারের user-রা কী অভিজ্ঞতা পাচ্ছেন, আর তাঁদের জন্য কী ভেঙেছে? |

## Interviewer-রা যা যাচাই করেন

Performance-এ part-স্তরের সংকেত আক্ষরিক অর্থেই মাপা হয়:

- **কিছু বদলানোর আগে কি আপনি মাপেন?** সবচেয়ে ভালো উত্তরগুলো শুরু হয় field data আর একটি profile দিয়ে, optimisation-এর
  তালিকা দিয়ে নয়। প্রথম পদক্ষেপ হিসেবে "আমি code-split করব" একটি অনুমান।
- **LCP কী নড়ায়, বলতে পারেন?** সাধারণত hero image বা একটি render-blocking request, আর প্রায় কখনোই JavaScript
  execution নয়। যে candidate আগে bundle size ধরেন, তিনি সত্যিকারের কোনো LCP সমস্যা debug করেননি।
- **INP কেন FID-এর চেয়ে কঠিন, জানেন?** কারণ এটা প্রতিটি interaction-কে paint পর্যন্ত পুরো পথ মাপে, তাই session-এর যেকোনো
  জায়গায় একটি long task আপনাকে fail করাতে পারে। এটাই প্রশ্নটির বর্তমান রূপ, আর এটা ভালোভাবে ছাঁকে।
- **Lab নাকি field?** Lighthouse একটি simulated device-কে score দেয়। Chrome User Experience Report বলে সত্যিকারের user-রা
  কী পেয়েছেন। একটি senior উত্তর দুটিই ব্যবহার করে, আর জানে যে একটি lab run INP একেবারেই মাপতে পারে না।
- **কী bundle-কে আবার বড় হতে দেয় না?** এমন একটি budget যা build fail করায়, কোনো optimisation week নয়। যে candidate-রা এর
  মধ্য দিয়ে গেছেন, তাঁরা উত্তর দেন একটি CI gate আর PR-এ একটি size-change comment দিয়ে।

## পড়ার ক্রম

সবসময় আগে 01। এটা সেই metric-গুলো সংজ্ঞায়িত করে, যেগুলো বাকি তিনটি অধ্যায় নড়ানোর চেষ্টা করে। তারপর 02 আর 03: যে loading
fix-গুলো সবচেয়ে বেশি ফল দেয়, আর যে budget gate সেগুলোকে ঠিক রাখে। 04 হলো এর সবকিছু যাচাই করার উপায়, আর production-এ এটা
ঐচ্ছিক নয়।

**Interview sprint:** 01 → 02 → 04। Metric, loading-এর lever, আর এর কোনোটা কাজ করেছে তা কীভাবে প্রমাণ করবেন।
Interaction-এর lever — কাজকে frame budget-এর ভেতরে রাখা — Part III-এর
[Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)।
