---
sourceHash: "f8b460b19ddf50a6157196581843380c224884d9ab6d8445833760d98b61f1d9"
title: "Part IV — Frontend Testing"
translatedAt: "2026-10-12T12:16:49.516Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — Frontend Testing

Vitest-এর API জানার জন্য কাউকে hire করা হয় না। Interview-তে যা যাচাই হয় তা হলো বিচারবুদ্ধি: কী test করার মতো,
কোন layer-এ, আর একটি test implementation সম্পর্কে কতটা জানতে পারবে। এই section সেই প্রশ্ন ঘিরেই সাজানো।
Framework-এর অংশ ইচ্ছা করেই পাতলা রাখা। এটা শুধু সেই শব্দভাণ্ডার, যেটা আসল আলোচনাটা করতে আপনার লাগবে।

পুরো section-এর সুতো হলো coupling। যে test internal state সম্পর্কে জানে, সেটা প্রতিটি refactor-এ ভাঙে। এটা team-কে
suite-এর ওপর অবিশ্বাস করতে শেখায়। যে test একজন user-এর মতো করে interface চালায়, সেটা নিচের সবকিছু নতুন করে লেখার
পরেও টিকে থাকে। এখানকার প্রায় প্রতিটি পরামর্শ এই একটি ধারণা থেকেই আসে।

## অধ্যায়গুলো

| #  | অধ্যায় | যে প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Testing Strategy](#ch-testing-strategy) | কী test করবেন, কোন layer-এ, আর তার খরচ কত? |
| 02 | [Test লেখা: Vitest ও React Testing Library](#ch-vitest) | কোন query, আর mock কোথায় করবেন, যাতে একটি refactor একশোটা test না ভাঙে? |
| 03 | [Frontend Integration Testing](#ch-frontend-integration-testing) | একটি নকল network-এর বিপরীতে একটি পুরো flow কীভাবে test করবেন? |
| 04 | [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing) | কোন browser test তাদের runtime-এর দাম ফেরত দেয়, আর যে failure একটি assertion প্রকাশ করতে পারে না, তার কী হবে? |
| 05 | [Accessibility Testing](#ch-testing-accessibility) | CI-তে কী gate করা যায়, আর কী হাতে করতে হয়? |

অধ্যায় 05-ই বইয়ে accessibility test করার একমাত্র জায়গা। Method, CI gate আর দুটি manual pass এর অধীনে, তাই অন্য
অধ্যায়গুলো আবার না বলে এর দিকে ইঙ্গিত করে।

## Interviewer-রা যা যাচাই করেন

একটি test suite তিনটি budget খরচ করে: runtime, maintenance আর trust।

- **Test boundary কোথায় টানেন?** সবচেয়ে শক্তিশালী উত্তর network-কে mock point হিসেবে বলে, আর তার ওপরের সবকিছু
  একসাথে test করে। একটি child component mock করা সাধারণত একটি লক্ষণ যে boundary ভুল জায়গায়।
- **একটি flaky test কীভাবে সামলান?** Quarantine করে ঠিক করা, retry দিয়ে ভুলে যাওয়া নয়। যে candidate সরাসরি একটি
  retry count-এর দিকে হাত বাড়ান, তিনি জানিয়ে দিয়েছেন তাঁর suite দেখতে কেমন।
- **Component testing কোথায় থামে আর end-to-end কোথায় শুরু হয়?** উত্তরটা কী আসল তা নিয়ে, flow কত লম্বা তা নিয়ে নয়।
  jsdom (যে নকল DOM-এ বেশিরভাগ unit test চলে) কোনো layout হিসাব করে না।
- **আপনার coverage-এর সংখ্যা কীসের জন্য?** সৎ senior উত্তর: coverage untested file খুঁজে পায়, untested behaviour নয়।
  মোটামুটি 80%-এর বেশি target সংখ্যা পূরণের জন্য লেখা test কিনতে শুরু করে।
- **কখন আগে test লেখেন না?** TDD একটি যন্ত্র, ধর্মবিশ্বাস নয়। Exploratory কাজ, spike code আর UI layout সৎ
  ব্যতিক্রম। এটা বলা অভিজ্ঞতা হিসেবে পড়া হয়, আলস্য হিসেবে নয়।

## পড়ার ক্রম

আগে 01 পড়ুন। এটা সেই layer-গুলো ঠিক করে, যেগুলোর কথা বাকি সবকিছু বলে। তারপর 02 আর 03 পড়ুন, যেখানে frontend
testing-এর বেশিরভাগটা আসলে ঘটে। 04 আর 05 হলো বিচারবুদ্ধির অধ্যায়, আর এক বসায় ভালো পড়া যায়।

**Interview sprint:** 01 → 02 → 04। Layering-এর প্রশ্ন, query priority-র প্রশ্ন, আর কোন end-to-end test তাদের জায়গা
অর্জন করে তা জানা — এতেই বেশিরভাগ প্রশ্ন cover হয়।
