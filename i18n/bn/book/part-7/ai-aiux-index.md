---
sourceHash: "c56986c8a6a26976ceaf10757d6eb9b1876d9de7533f489ad04f52f19acbb371"
title: "AIUX"
translatedAt: "2026-10-19T08:02:01.634Z"
model: "claude-opus-5-5 (Claude Code)"
---

# AIUX

Interface-এর স্তর নিয়ে দুটি অধ্যায়। এই section ভালোভাবে লিখতে পারেন শুধু frontend-heavy একজন লেখক। বেশিরভাগ AI বই
লেখেন backend আর ML-এর মানুষেরা, তাই সাধারণত এই অংশটাই তাঁদের সবচেয়ে দুর্বল।

পুরো section-এর মূল সুর: **AI feature-ই প্রথম product surface, যেখানে ধীর, ভুল আর refuse করা স্বাভাবিক অবস্থা,
bug নয়।** Perceived performance আর error boundary নিয়ে আপনি যা জানেন, তা এখনো খাটে। কিন্তু loading state চলে কয়েক
সেকেন্ড, উত্তর আসে টুকরো টুকরো, আর "আত্মবিশ্বাসী অথচ ভুল" এমন একটি অবস্থা, যেটা UI-কে দেখাতেই হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Latency ও Generative UI](#ch-generative-ui) | প্রথম token কেন সবচেয়ে গুরুত্বপূর্ণ, আর model-এর output থেকে component নিরাপদে render করবেন কীভাবে? |
| 02 | [বিশ্বাস, নির্ভুলতা ও Failure State](#ch-trust-and-correctness-ux) | Screen কীভাবে দেখায় উত্তরটা কোথা থেকে এলো, আর refusal বা অর্ধেক উত্তর এলে কী করে? |

## চলমান Project

শেষ section, আর বাকিগুলো ব্যবহার করার মতো কি না, সেটা এটাই ঠিক করে।

| অধ্যায় | Assistant-এ কী যোগ হয় |
| ------- | ----------------------------- |
| 01 | প্রথম token-এর একটি লক্ষ্য, spinner-এর বদলে চোখে দেখা যায় এমন retrieval ধাপ, আর allow-list থেকে render করা citation chip |
| 02 | Source-এ নিয়ে যাওয়া citation, accept করার আগে edit আর undo, আর failure-এর screen: "docs-এ নেই", continue করার ব্যবস্থাসহ কেটে যাওয়া উত্তর, এমন rate limit যেটা আগে stream হওয়া অংশটুকু রেখে দেয় |

**অংশের শেষে** documentation assistant মাপা একটি pipeline থেকে citation-সহ উত্তর stream করে। নিজের corpus-এর বাইরের
প্রশ্নে সৎভাবে refuse করে, আর প্রতি প্রশ্নে খরচ কত, সেটা জানা থাকে। Model বন্ধ থাকলে সাধারণ docs index-এ ফিরে যায়। AI
round-এ একটি প্রশ্নই আসলে গুরুত্বপূর্ণ, আর এটা তারই উত্তর: আপনি কি এমন কিছু সত্যিই ship করেছেন?

## Interviewer-রা যা যাচাই করেন

- **"Model-এর আট সেকেন্ড লাগে। User কী দেখবেন?"** Spinner নয়। Streaming থাকলে আট সেকেন্ডের অপেক্ষা হয়ে যায়
  400 ms-এ প্রথম token।
- **"Model-এর output-এ render করার মতো একটি component আছে। ঝুঁকি কী?"** Model-এর output অবিশ্বস্ত input।
  Component আর props-এর allow-list থেকে render করুন, কখনো সাধারণ কোনো interpreter দিয়ে নয়।
- **"উত্তরটা ভুল হতে পারে, এটা কীভাবে দেখাবেন?"** Source-এ নিয়ে যাওয়া citation, accept করার আগে edit, আর undo।
  Confidence score এমন নিখুঁততার ইঙ্গিত দেয়, যেটা system-এর নেই।
- **"Stream-এর মাঝপথে rate limit লেগেছে। এখন কী?"** অর্ধেক উত্তরটা রেখে দিন, কী হয়েছে বলুন, আর retry সহজ করে দিন।

## পড়ার ক্রম

01 → 02। অধ্যায় 01 ধরে নেয় Prompt Injection অধ্যায়ের security boundary আপনার জানা, তাই পারলে সেটা আগে পড়ুন।

**Interview sprint:** দুটিই। Latency আর failure-এর design নিয়ে frontend-heavy candidate যা বলতে পারেন, loop-এর আর
কেউ তা বলবেন না।
