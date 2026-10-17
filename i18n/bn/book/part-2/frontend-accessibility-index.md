---
sourceHash: "7255668e8d88352d44611a3bbb3e71b173a0542aa98648b4add6627dc2e716d4"
title: "Part II — Accessibility"
translatedAt: "2026-10-17T01:00:03.852Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — Accessibility

এই অংশের পাঁচটি অধ্যায় এমন একটি বিষয় নিয়ে, যার অবস্থান বদলে গেছে 2025 সালের জুনে। সেই মাসে European
Accessibility Act কার্যকর হয়। তারপর থেকে accessibility আর গুণমানের এমন কোনো যুক্তি নয়, যা product manager
পিছিয়ে দিতে পারেন। এটা এখন একটি বাধ্যবাধকতা, যার আছে নির্দিষ্ট standard, conformance level আর audit। EU-তে বিক্রি
হয় এমন যেকোনো কিছুতে কাজ করা senior engineer-এর জন্য এটা সেই দুটি বিষয়ের একটি, যেখানে খুঁটিনাটি জানা আরেকটি
framework জানার চেয়ে বেশি দামি। অন্যটি internationalisation।

পুরো অংশটা একটি দাবির ওপর দাঁড়িয়ে: **accessibility-র বেশিরভাগ কাজ হলো ঠিক element বেছে নেওয়া আর focus কোথায় যাবে
তা ঠিক করা।** ARIA হলো বাকি ছোট অংশটুকু, আর আইনই কারণ যে কেউ এসব জিজ্ঞেস করছে। ঠিক করেছেন কি না জানতে লাগে CI-তে axe
gate আর দুটি manual pass। সেগুলো আছে [Chapter ?? — Accessibility Testing](#ch-testing-accessibility)-এ, Part IV-এ testing-এর
বাকি অংশের সঙ্গে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------------- |
| 01 | [Accessibility কেন, আর আইন কী বলে](#ch-accessibility-and-the-law) | কোন নিয়ম প্রযোজ্য, তারা কোন level চায়, আর design-কে কোন সংখ্যাগুলো মানতে হবে? |
| 02 | [Accessibility Tree](#ch-accessibility-tree) | Screen reader আসলে কী পড়ে, আর নাম হিসাব হয় কীভাবে? |
| 03 | [ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria) | কখন একটি attribute-ই উত্তর, আর কখন সেটা ব্যাপারটা আরও খারাপ করে? |
| 04 | [Keyboard ও Focus Management](#ch-keyboard-and-focus) | Mouse ছাড়া কি পুরো product ব্যবহার করা যায়, আর কোনো কাজের পরে focus কোথায় যায়? |
| 05 | [Accessible Form ও Error Message](#ch-accessible-forms) | যে user form দেখতে পান না, তিনি কীভাবে জানবেন কী ভুল হয়েছে? |

## Interviewer-রা যা যাচাই করেন

এই অংশে senior হওয়ার লক্ষণ হলো **জোড়াতালি নয়, গোড়া থেকে ঠিক করা — attribute নয়, element-এর দিকে হাত বাড়ানো।**

- **Accessibility কি একটি সিদ্ধান্ত, নাকি পরে করা মেরামত?** Custom dropdown-এর প্রশ্নে যিনি `role` আর
  `aria-label` দিয়ে উত্তর শুরু করেন, তিনি ভুল জায়গা থেকে শুরু করেছেন। প্রথম কাজ হলো জিজ্ঞেস করা, একটি `<select>`
  দিয়েই চলবে কি না। দ্বিতীয় কাজ হলো নিজে keyboard model বানানোর বদলে APG pattern-এর নাম বলা (W3C-র ARIA
  Authoring Practices Guide)।
- **লক্ষ্যটা কী, আপনি জানেন?** WCAG 2.2 AA। European Accessibility Act, Web Accessibility Directive, ADA Title II
  আর Section 508, সবাই এই level-এরই নাম করে। "আমরা best practice মেনে চলি" এমন উত্তর, যা procurement review মেনে
  নেয় না।
- **Focus কোথায় যায়?** Dialog বন্ধ হলে, একটি row মুছে ফেললে, submit ব্যর্থ হলে, বা client-side route বদলালে, প্রতিটি
  ক্ষেত্রে এই প্রশ্ন করুন। উত্তর চারটি, আর বেশিরভাগ candidate ভেবেছেন মাত্র একটি নিয়ে।
- **কী automate করা যায় না?** আগে সীমাটা বলুন: automated rule মোটামুটি এক-তৃতীয়াংশ থেকে অর্ধেক criterion ধরতে পারে।
  তারপর দুটি manual pass-এর নাম বলুন। এখানেই বোঝা যায় কে সত্যিই accessible product ship করেছেন, আর কে শুধু axe
  install করেছেন।
- **খরচটা হিসাব করতে পারেন?** একটি custom combobox মানে এক সপ্তাহের কাজ আর চিরকালের maintenance খরচ। Estimate-এর
  সময়েই এটা বলা senior-এর অবদান। Sprint-এর মাঝখানে গিয়ে আবিষ্কার করা নয়।

## পড়ার ক্রম

আগে 01 পড়ুন, কারণ বাকি প্রতিটি অধ্যায় যে লক্ষ্যের সঙ্গে মেলানো হয়, সেটা এখানেই ঠিক হয়। তারপর 02, যে mental model-এর
ওপর বাকি সব দাঁড়িয়ে। Tree না পড়ে কোনো announcement debug করা যায় না। এরপর 04 আর 05, যেখানে রোজকার কাজের বেশিরভাগ।
03 ইচ্ছে করেই 02-এর পরে রাখা: ARIA কোথায় লেখে তা জানলে তবেই ARIA বোঝা যায়।

**Interview sprint:** 01, 04, আর 03-এর interview-এর প্রশ্নগুলো। আইনি কাঠামো, focus-এর সিদ্ধান্ত আর ARIA-র প্রথম নিয়ম,
এই তিনটিতেই frontend loop-এর বেশিরভাগ প্রশ্ন ধরা পড়ে। "কী automate করা যায় না?" সাধারণত সেই follow-up, যা উত্তরের
ভাগ্য ঠিক করে, আর Part IV-এর testing অধ্যায় তার উত্তর দেয়।
