---
sourceHash: "f8b460b19ddf50a6157196581843380c224884d9ab6d8445833760d98b61f1d9"
title: "Part IV — Frontend Testing"
translatedAt: "2026-10-17T14:02:21.145Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — Frontend Testing

Vitest-এর API জানার জন্য কাউকে চাকরি দেওয়া হয় না। Interview-এ যাচাই হয় বিচারবুদ্ধি: কোনটা test করার মতো, কোন
স্তরে, আর একটি test implementation সম্পর্কে কতটুকু জানতে পারবে। এই section সাজানো হয়েছে সেই প্রশ্ন ঘিরেই।
Framework-এর অংশটা ইচ্ছে করেই ছোট রাখা হয়েছে। আসল আলোচনাটা করতে যতটুকু শব্দভান্ডার লাগে, ততটুকুই।

পুরো section-এর মূল সুতো হলো coupling। যে test ভেতরের state সম্পর্কে জানে, সেটা প্রতিটি refactor-এ ভাঙে। তাতে
team suite-টাকে অবিশ্বাস করতে শেখে। আর যে test user-এর মতো করে interface চালায়, সেটা নিচের সবকিছু নতুন করে লেখা
হলেও টিকে থাকে। এখানকার প্রায় প্রতিটি পরামর্শ এই একটি ধারণা থেকেই আসে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Testing Strategy](#ch-testing-strategy) | কী test করবেন, কোন স্তরে, আর তার খরচ কত? |
| 02 | [Test লেখা: Vitest ও React Testing Library](#ch-vitest) | কোন query, আর mock কোথায় করবেন, যাতে একটি refactor-এ একশোটি test না ভাঙে? |
| 03 | [Frontend Integration Testing](#ch-frontend-integration-testing) | নকল network-এর বিপরীতে পুরো একটি flow কীভাবে test করবেন? |
| 04 | [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) | কোন browser test তার runtime-এর দাম তোলে, আর যে failure assertion দিয়ে প্রকাশ করা যায় না, তার কী হবে? |
| 05 | [Accessibility Testing](#ch-testing-accessibility) | CI-তে কী gate করা যায়, আর কী হাতে করতে হয়? |

Accessibility testing-এর জন্য বইয়ে একটিই জায়গা, অধ্যায় 05। পদ্ধতি, CI gate আর হাতে করা দুটি pass, সবই সেখানে।
তাই অন্য অধ্যায়গুলো নতুন করে না বলে সেখানেই পাঠিয়ে দেয়।

## Interviewer-রা যা যাচাই করেন

একটি test suite তিনটি budget খরচ করে: runtime, maintenance আর বিশ্বাস।

- **Test boundary কোথায় টানবেন?** সবচেয়ে শক্ত উত্তরে mock-এর জায়গা হিসেবে network-এর নাম আসে, আর তার ওপরের
  সবকিছু একসঙ্গে test হয়। Child component mock করা সাধারণত লক্ষণ যে boundary ভুল জায়গায় বসেছে।
- **Flaky test কীভাবে সামলান?** Quarantine করে ঠিক করা, retry দিয়ে ভুলে যাওয়া নয়। যে candidate সঙ্গে সঙ্গে retry
  count-এর কথা তোলেন, তিনি আসলে বলে দিলেন তাঁর suite দেখতে কেমন।
- **Component testing কোথায় থামে, আর end-to-end কোথায় শুরু?** উত্তরটা flow কত লম্বা তা নিয়ে নয়, কোনটা আসল তা
  নিয়ে। jsdom (যে নকল DOM-এ বেশিরভাগ unit test চলে) কোনো layout হিসাব করে না।
- **আপনার coverage-এর সংখ্যাটা কীসের জন্য?** Senior-এর সৎ উত্তর: coverage untested file খুঁজে দেয়, untested
  behaviour নয়। Target মোটামুটি 80%-এর ওপরে গেলে সংখ্যা পূরণের জন্য লেখা test আসতে শুরু করে।
- **কখন আগে test লেখেন না?** TDD একটি tool, ধর্মবিশ্বাস নয়। Exploratory কাজ, spike code আর UI layout হলো সৎ
  ব্যতিক্রম। এটা খোলাখুলি বললে অভিজ্ঞতা বোঝায়, আলস্য নয়।

## পড়ার ক্রম

আগে 01 পড়ুন। এতে সেই স্তরগুলো ঠিক হয়, বাকি সবকিছু যেগুলোর কথা বলে। তারপর পড়ুন 02 আর 03, কারণ frontend testing-এর
বেশিরভাগ আসলে সেখানেই হয়। 04 আর 05 হলো বিচারবুদ্ধির অধ্যায়, একটানা পড়লেই ভালো।

**Interview sprint:** 01 → 02 → 04। স্তর ভাগের প্রশ্ন, query-র অগ্রাধিকারের প্রশ্ন, আর কোন end-to-end test তার
জায়গা পাওয়ার যোগ্য তা জানা — যা জিজ্ঞেস করা হয়, তার বেশিরভাগ এতেই ঢাকা পড়ে।
