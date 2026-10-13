---
sourceHash: "c56986c8a6a26976ceaf10757d6eb9b1876d9de7533f489ad04f52f19acbb371"
title: "AIUX"
translatedAt: "2026-10-13T03:05:12.104Z"
model: "claude-opus-5-5 (Claude Code)"
---

# AIUX

Interface layer নিয়ে দুটি অধ্যায়। শুধু একজন frontend-heavy লেখকই এই section ভালোভাবে লিখতে পারেন। বেশিরভাগ AI বই
লেখেন backend আর ML-এর মানুষ, তাই সাধারণত এই অংশটাই তাঁদের সবচেয়ে দুর্বল।

পুরো section-এর মূল সুর: **একটি AI feature হলো প্রথম product surface, যেখানে ধীর, ভুল আর প্রত্যাখ্যাত হওয়া স্বাভাবিক
state, bug নয়।** Perceived performance আর error boundary নিয়ে আপনি যা জানেন, তা এখনো খাটে। কিন্তু loading state
চলে কয়েক সেকেন্ড, উত্তর আসে টুকরো টুকরো করে, আর "আত্মবিশ্বাসী অথচ ভুল" এমন একটি state, যেটা UI-কে দেখাতে হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Latency ও Generative UI](#ch-generative-ui) | প্রথম token কেন সবচেয়ে গুরুত্বপূর্ণ, আর model-এর output থেকে নিরাপদে component render করবেন কীভাবে? |
| 02 | [বিশ্বাস, নির্ভুলতা ও Failure State](#ch-trust-and-correctness-ux) | Screen কীভাবে নিজের কাজের হিসাব দেখায়, আর একটি refusal বা অর্ধেক উত্তরে সে কী করে? |

## চলমান Project

শেষ section, আর এটাই ঠিক করে বাকিগুলো ব্যবহার করার মতো কিনা।

| অধ্যায় | Assistant-এ কী যোগ করে |
| ------- | ----------------------------- |
| 01 | First token-এর একটি target, spinner-এর বদলে চোখে দেখা যায় এমন একটি retrieval ধাপ, আর একটি allow-list থেকে render করা citation chip |
| 02 | Source-এ link করা citation, accept করার আগে edit আর undo, আর failure screen-গুলো: "docs-এ নেই", continue action-সহ কেটে যাওয়া একটি উত্তর, এমন একটি rate limit যেটা ইতিমধ্যে stream হওয়া অংশ রেখে দেয় |

**Part-এর শেষে** documentation assistant মাপা একটি pipeline থেকে citation-সহ উত্তর stream করে। নিজের corpus-এর বাইরে
সে সৎভাবে প্রত্যাখ্যান করে, আর প্রতিটি প্রশ্নে তার খরচ জানা। Model বন্ধ থাকলে সে সাধারণ docs index-এ ফিরে যায়। এতে
একটি AI round-এর একমাত্র গুরুত্বপূর্ণ প্রশ্নের উত্তর মেলে: আপনি কি এমন কিছু ship করেছেন?

## Interviewer-রা যা যাচাই করেন

- **"Model আট সেকেন্ড নেয়। User কী দেখেন?"** Spinner নয়। Streaming আট সেকেন্ডের অপেক্ষাকে 400 ms-এ প্রথম
  token-এ পরিণত করে।
- **"Model-এর output-এ render করার মতো একটি component আছে। ঝুঁকি কী?"** Model-এর output অবিশ্বস্ত input।
  Component আর props-এর একটি allow-list থেকে render করুন, কখনোই একটি সাধারণ interpreter দিয়ে নয়।
- **"উত্তর ভুল হতে পারে, এটা কীভাবে দেখান?"** Source-এ link করা citation, accept করার আগে edit আর undo। Confidence
  score এমন নির্ভুলতার ইঙ্গিত দেয়, যেটা system-এর নেই।
- **"Stream-এর মাঝপথে rate limit লেগেছে। এখন কী?"** আংশিক উত্তর রেখে দিন, কী হয়েছে বলুন, আর retry সহজ করুন।

## পড়ার ক্রম

01 → 02। 01 ধরে নেয় যে আপনি Prompt Injection অধ্যায়ের security boundary জানেন, তাই পারলে সেটা আগে পড়ুন।

**Interview sprint:** দুটিই। Latency আর failure-এর design হলো সেই জিনিস, যা একজন frontend-heavy candidate বলতে পারেন,
আর loop-এ অন্য কেউ বলবেন না।
