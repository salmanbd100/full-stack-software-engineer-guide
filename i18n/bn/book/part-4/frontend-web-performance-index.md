---
sourceHash: "b36cb4b377a146fae848b7f858843affc42227d941c5e60b93e3790f050513b3"
title: "Part IV — Web Performance"
translatedAt: "2026-10-17T01:34:47.147Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — Web Performance

Part IV আসলে কী নিয়ে, তার সবচেয়ে পরিষ্কার উদাহরণ performance। এটা কোনো feature নয়, এটা একটি budget, যার জন্য কাউকে
জবাবদিহি করতে হয়। এই অংশে আছে সেই তিনটি metric, যা প্রকাশ্যে মাপা হয়, আর সেই loading strategy-গুলো, যা এদের
নড়ায়। আরেকটি জিনিস আছে, যা বেশিরভাগ লেখা বাদ দেয়: কোনো বদল আপনার laptop-এ নয়, সত্যিকারের user-দের কাজে লেগেছে কি
না, তা কীভাবে জানবেন। AI feature-কে আরেকটি budget মানতে হয়, যেখানে largest paint নয়, first token-টাই আসল:
[Chapter ?? — Latency ও Generative UI](#ch-generative-ui)।

শুরুতেই একটি ভুল শুধরে নিই, কারণ প্রকাশিত অনেক লেখায় এটা এখনো ভুল। March 2024-এ Core Web Vital হিসেবে **FID-এর
জায়গায় এসেছে INP**। FID মাপত প্রথম interaction handle হওয়ার আগের দেরিটুকু, আর প্রায় সব site-ই তাতে পাশ করত। INP মাপে
প্রতিটি interaction, একদম paint পর্যন্ত, আর নেয় সবচেয়ে খারাপটা। যে site সহজেই FID পাশ করত, সেটা প্রায়ই INP-তে ফেল
করে। 2027-এ এসেও যে candidate FID বলেন, তাঁকে পুরনো শোনায়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর |
| -- | ------- | --------------- |
| 01 | [Core Web Vitals](#ch-core-web-vitals) | কোন fix কোন metric নড়ায়? |
| 02 | [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting) | Largest paint পিছিয়ে না দিয়ে কাজ পরে করবেন কীভাবে, আর bundle আবার বড় হওয়া কে আটকায়? |
| 03 | [Caching ও Asset Delivery](#ch-asset-delivery) | কোন response কোন cache-এ থাকে, আর image, font আর CSS আসার আগে page দেখতে কেমন? |
| 04 | [Production-এ মাপা](#ch-measuring-in-production) | সত্যিকারের user-রা কী পাচ্ছেন, আর তাঁদের জন্য কী ভেঙেছে? |

## Interviewer-রা যা যাচাই করেন

Part-এর মূল লক্ষণটা এখানে আক্ষরিক অর্থেই মাপা হয়:

- **কিছু বদলানোর আগে কি measure করেন?** সবচেয়ে জোরালো উত্তর শুরু হয় field data আর একটি profile দিয়ে, optimisation-এর
  তালিকা দিয়ে নয়। প্রথম কথাই যদি হয় "আমি code-split করব", তবে সেটা অনুমান।
- **LCP কী নড়ায়, বলতে পারেন?** সাধারণত hero image বা কোনো render-blocking request, আর প্রায় কখনোই JavaScript execution
  নয়। যে candidate প্রথমেই bundle size ধরেন, তিনি সত্যিকারের কোনো LCP সমস্যা debug করেননি।
- **INP কেন FID-এর চেয়ে কঠিন, জানেন?** কারণ INP প্রতিটি interaction মাপে একদম paint পর্যন্ত, তাই session-এর যেকোনো
  জায়গায় একটি long task থাকলেই আপনি ফেল। প্রশ্নটার এখনকার রূপ এটাই, আর এটা দিয়ে candidate ভালোভাবে বাছাই হয়।
- **Lab না field?** Lighthouse একটি simulated device-এ score দেয়। Chrome User Experience Report বলে সত্যিকারের user-রা
  কী পেয়েছেন। Senior উত্তর দুটিই ব্যবহার করে, আর জানে lab run দিয়ে INP মাপাই যায় না।
- **Bundle আবার বড় হওয়া কে আটকায়?** Build ফেল করানো একটি budget, optimisation-এর কোনো সপ্তাহ নয়। যাঁরা এটা নিজে
  সামলেছেন, তাঁরা উত্তর দেন CI gate আর PR-এ size-change comment দিয়ে।

## পড়ার ক্রম

সবসময় আগে 01। বাকি তিনটি অধ্যায় যে metric নড়াতে চায়, সেগুলোর মানে এখানেই বোঝানো হয়। তারপর 02 আর 03: সবচেয়ে বেশি লাভ দেওয়া
loading fix, আর সেগুলো টিকিয়ে রাখার budget gate। 04 দিয়ে আপনি এর সবকিছু যাচাই করেন, আর production-এ এটা বাদ দেওয়ার
উপায় নেই।

**Interview sprint:** 01 → 02 → 04। Metric, loading-এর হাতল, আর কোনোটা কাজ করেছে কি না তার প্রমাণ। Interaction-এর
হাতল, মানে কাজ frame budget-এর মধ্যে রাখা, আছে Part III-এর
[Chapter ?? — Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)-এ।
