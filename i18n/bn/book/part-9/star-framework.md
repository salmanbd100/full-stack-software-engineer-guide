---
sourceHash: "3b51499fbd00b46cce9c64ead2fc1a8dd36029e3bd360f5d795ab9dd93dc5ad9"
title: "STAR Framework ও Story Bank"
translatedAt: "2026-10-13T03:08:48.348Z"
model: "claude-opus-5-5 (Claude Code)"
---

# STAR Framework ও Story Bank {#ch-star-framework}

> একটি behavioural উত্তর এমনভাবে সাজান, যাতে interviewer তিন মিনিটের কম সময়ে action আর result শুনতে পান।

**এই অধ্যায়ে:** চারটি অংশ আর তাদের সময়ের বাজেট · একটি করে দেখানো উত্তর · ব্যর্থতার গল্প কেন আলাদা · coverage grid · যে ভুলগুলোর দাম offer

## 💡 মূল ধারণা

Interviewer গল্পটাকে নম্বর দিচ্ছেন না। তিনি নম্বর দিচ্ছেন গল্পের ভেতরের প্রমাণকে: আপনি কী সিদ্ধান্ত নিলেন, কেন
নিলেন, আর তার ফলে কী বদলাল। STAR (situation, task, action, result) হলো শুধু সেই ক্রম, যেটা প্রমাণগুলোকে এমন
জায়গায় রাখে যেখানে শ্রোতা সেগুলো শুনতে পান।

বেশিরভাগ candidate এটা উল্টো করেন। তাঁরা নব্বই সেকেন্ড পটভূমিতে খরচ করেন, ত্রিশ সেকেন্ড নিজে কী করেছেন তাতে, আর
result-এ পৌঁছানোর আগেই সময় ফুরিয়ে যায়। পটভূমি উত্তরের সবচেয়ে কম মূল্যবান অংশ, অথচ সময় যায় সেখানেই।

## কীভাবে কাজ করে

চারটি অংশ, ক্রম অনুযায়ী, একটি সময়ের বাজেটসহ। বাজেটটাই পুরো কৌশল। শুধু acronym-টি মুখস্থ করার মতো কিছু নয়।

| অংশ          | ভাগ   | ~সময় | এখানে কী থাকবে                                       | যেভাবে ব্যর্থ হয়                              |
| ------------- | ------- | ----- | ------------------------------------------------------- | ----------------------------------------- |
| **Situation** | 15–20%  | ~20 s | কোথায়, কখন, আর business-এর কাছে কেন এটা গুরুত্বপূর্ণ ছিল         | পুরো quarter-এর বিবরণ দেওয়া                |
| **Task**      | 10–15%  | ~15 s | আপনার ভূমিকা, আপনার লক্ষ্য, যে সীমাবদ্ধতা কাজটাকে কঠিন করেছিল   | আপনার নয়, team-এর লক্ষ্য বর্ণনা করা     |
| **Action**    | 50–60%  | ~60 s | **আপনি** কী করেছিলেন, আর প্রতিটি ধাপ কেন বেছে নিয়েছিলেন            | কারণ ছাড়া শুধু ধাপের একটি তালিকা |
| **Result**    | 15–20%  | ~25 s | একটি সংখ্যা, তারপর আপনি কী শিখলেন                          | "ভালোই হয়েছিল"                            |

**মোট: দুই থেকে তিন মিনিট।** চার মিনিটের পরের সবকিছু শ্রোতা সহ্য করছেন, নম্বর দিচ্ছেন না।

Action অংশেই seniority চোখে পড়ে, কারণ এটাই একমাত্র অংশ যেখানে আপনি একটি বাছাইয়ের ব্যাখ্যা দেন। "আমি একটি index
যোগ করেছিলাম" mid-level। Senior উত্তর এরকম: "Profiler একটি 40 million row-এর table-এ sequential scan দেখাচ্ছিল, তাই
আমি result cache না করে একটি covering index যোগ করেছিলাম। Query আগে থেকেই সঠিক ছিল, আর আমি সত্যের দ্বিতীয় কোনো
উৎস চাইনি।"

## একটি করে দেখানো উত্তর

**প্রশ্ন:** "এমন একটি সময়ের কথা বলুন, যখন আপনি একটি project-এর নেতৃত্ব দিয়েছিলেন।"

```text
SITUATION: Our customer dashboard took 4-5 seconds to load. Bounce rate sat
at 30%, and support tickets about it had grown 50% over two months.

TASK: As the senior frontend engineer I owned the performance work — three
engineers, two months, and no budget to change the backend.

ACTION: A Lighthouse audit gave me three bottlenecks: an 800KB bundle,
re-renders on every keystroke, and four API calls running in sequence.
I sequenced the fixes by cost rather than by size — route-based code
splitting first because it was two days' work for the largest win, then
memoisation, then parallelising the calls behind a caching layer. I chose
not to introduce a state library, which was the team's instinct, because
the re-renders were caused by an unstable prop reference and a library
would have hidden that rather than fixed it.

RESULT: 4.5s to 1.6s, a 64% improvement. Bounce rate fell to 12%. The
audit-then-sequence-by-cost approach became the template the team used for
the next two performance pushes. What I took from it: the profiler names
the bottleneck, but the ordering decision is yours and it is the part
worth defending.
```

Result প্রথমে একটি সংখ্যা দেয়, তারপর এমন কিছু যা project-এর পরেও টিকে ছিল, তারপর একটি নির্দিষ্ট শিক্ষা।

## ব্যর্থতার গল্প আলাদা

"এমন একটি সময়ের কথা বলুন, যখন আপনি ব্যর্থ হয়েছিলেন" বিনয়ের পরীক্ষা নয়। এটা পরীক্ষা করে আপনি system ঠিক করেন,
নাকি শুধু incident ঠিক করেন।

যে উত্তর "আমি rollback করে ক্ষমা চেয়েছিলাম"-এ থেমে যায়, সেটা একটি incident বর্ণনা করে। যে উত্তর নম্বর পায়, সেটা
এগিয়ে গিয়ে বলে কী ঘটনাটাকে আবার ঘটতে দেয়নি:

```text
SITUATION: I shipped a checkout change that broke Safari. We lost roughly
three hours of transactions before we caught it.

TASK: It was my change and my review, and I owned both the fix and the
follow-up.

ACTION: I rolled back in ten minutes, then found the cause — an ES2022
feature our build was not transpiling for Safari. The rollback was the easy
part. What mattered was that nothing had caught it: no cross-browser run in
CI, no browser dimension in our error reporting, and a release process with
no way to disable a feature without a full deploy. I added a BrowserStack
matrix to CI, segmented Sentry by browser, and put the payment UI behind a
flag.

RESULT: No browser-specific production incident in the eighteen months
after. The flag pattern was adopted for every risky release. The lesson I
actually took is that I had treated cross-browser support as something you
remember to do, and remembering does not scale.
```

⚠️ এমন কোনো ব্যর্থতা বানাবেন না, যেটা গোপনে আসলে একটি শক্তি। Interviewer-রা "আমি code quality নিয়ে একটু বেশিই
ভাবি" সপ্তাহে কয়েকবার শোনেন, আর সেটাকে প্রশ্ন এড়িয়ে যাওয়া হিসেবে নম্বর দেন।

## Story Bank তৈরি করা

দশ থেকে বারোটি গল্প একটি পুরো loop-এর জন্য যথেষ্ট, কারণ জোর বদলালে একটি গল্প কয়েকটি প্রশ্নের উত্তর দেয়। একটি
migration project হতে পারে technical চ্যালেঞ্জের গল্প, leadership-এর গল্প, বা পরিবর্তনের সাথে মানিয়ে নেওয়ার গল্প।
নির্ভর করে আপনি কোন অংশটা বিস্তারিত বলছেন তার ওপর।

প্রতিটি গল্পের জন্য চারটি জিনিস লিখে রাখুন, আর কিছু নয়:

```text
Title:      Dashboard performance push
Tags:       leadership, technical, mentoring
Numbers:    3 engineers, 8 weeks, 4.5s → 1.6s, bounce 30% → 12%
Answers:    led a project · influenced without authority · improved a product
```

সংখ্যার line-টাই ঠিকমতো প্রস্তুত করার জিনিস। চাপের মধ্যে আপনার গল্পের কাঠামো মনে থাকবে, metric ভুলে যাবেন। আর
metric-টাই interviewer লিখে রাখেন।

## Coverage Grid

বারোটি গল্প কোনো কাজে আসে না, যদি তার আটটিই একই গল্প হয়। Interviewer ধরার আগেই grid এটা ধরে ফেলে। পাশে আপনার
project-গুলো রাখুন, আর ওপরে competency category-গুলো (যে দক্ষতাগুলোর নম্বর দেওয়া হচ্ছে)। তারপর সেই ঘরগুলো পূরণ
করুন, যেগুলোর পেছনে একটি সত্যিকারের উদাহরণ দিতে পারেন।

| Project                       | Leadership                       | চ্যালেঞ্জ                        | Conflict                     | ব্যর্থতা                          |
| ----------------------------- | -------------------------------- | -------------------------------- | ---------------------------- | -------------------------------- |
| **Dashboard performance**     | 8 সপ্তাহ ধরে 3 জন engineer-কে নেতৃত্ব      | 4.5s load, backend-এর কোনো বাজেট নেই     | Team একটি state library চাইছিল  | —                                |
| **Checkout rebuild**          | —                                | 6 সপ্তাহে PCI compliance        | PM deadline ধরে রাখতে চাইছিলেন  | Safari ভেঙে গেল, 3 ঘণ্টার order  |
| **Design-system rollout**     | ক্ষমতা ছাড়া 4টি team-কে প্রভাবিত করা | কোনো নির্দেশ ছাড়া adoption       | দুটি team token নিতে অস্বীকার করল | প্রথম version version ছাড়াই ship হলো |

**খালি ঘরগুলোই ফলাফল।** একটি খালি column মানে এমন একটি প্রশ্ন, যার উত্তর আপনি দিতে পারবেন না। একটি ভরা row মানে
একটি project loop-এর খুব বেশি ভার বইছে। দুটিই এক সন্ধ্যা ভাবলে ঠিক করা যায়। ঘরের ভেতরে বসে কোনোটাই ঠিক করা যায়
না।

পাঁচটি category বেশিরভাগ loop কভার করে। Interviewer-রা এগুলো ভিন্ন ভিন্নভাবে জিজ্ঞেস করেন, তাই শব্দ নয়, category
শিখুন:

| Category       | এর নিচের আসল প্রশ্ন                          | সাধারণ রূপ                                     |
| -------------- | --------------------------------------------------- | ----------------------------------------------------- |
| **Leadership** | মানুষ কি আপনার technical বিচারবুদ্ধি মেনে চলে?           | একটি project-এর নেতৃত্ব · কাউকে mentor করা · একটি অজনপ্রিয় সিদ্ধান্ত |
| **চ্যালেঞ্জ**  | সমস্যা সত্যিই কঠিন হলে আপনি কী করেন?   | জটিল bug · কম সময়ের deadline · অসম্পূর্ণ তথ্য |
| **Conflict**   | দ্বিমত করেও কাজের সম্পর্ক টিকিয়ে রাখতে পারেন?  | Manager-এর সাথে দ্বিমত · কঠিন stakeholder      |
| **ব্যর্থতা**    | আপনি system ঠিক করেন, নাকি incident?                 | যখন ব্যর্থ হয়েছিলেন · আপনার সবচেয়ে বড় ভুল              |
| **Impact**     | আপনার কারণে কী বদলাল, তা বলতে পারেন?            | সবচেয়ে গর্বের কাজ · প্রত্যাশার চেয়ে বেশি করা                 |

## কখন ব্যবহার করবেন

STAR অতীত নিয়ে প্রশ্নে খাটে। বাকি সবকিছুতে খারাপভাবে খাটে, আর জোর করে খাটালে ধরা পড়ে যান।

| প্রশ্ন                              | কী ব্যবহার করবেন            | কেন                                                   |
| ----------------------------------------- | -------------- | ----------------------------------------------------- |
| "এমন একটি সময়ের কথা বলুন, যখন…"               | STAR           | এটা অতীতের একটি আচরণের প্রমাণ চাইছে          |
| "এমন একটি project-এর কথা বলুন, যেটা নিয়ে আপনি গর্বিত"      | STAR           | একই কাঠামো, নরম ভাষা                             |
| "আপনি code review কীভাবে করেন?"        | একটি পদ্ধতি       | এটা আপনার সাধারণ practice চায়, তারপর একটি উদাহরণ       |
| "একটি release ভেঙে গেলে কী করবেন?"   | একটি পদ্ধতি       | কাল্পনিক — বলার মতো কোনো Situation নেই           |
| "এখানে কেন কাজ করতে চান?"           | কোনোটাই নয়        | এখানে একটি গল্প শোনায় মহড়া দেওয়া পাশ কাটানোর মতো                |

## সাধারণ ভুল

| ❌ ভুল                                              | ✅ সমাধান                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| চার-পাঁচ মিনিটের গল্প                            | Timer ধরে অনুশীলন করুন। আগে Situation কাটুন — বাড়তি অংশ সবসময় ওখানেই     |
| "আমরা ঠিক করলাম", "আমরা বানালাম", "আমরা ship করলাম"                   | **আপনি** কী করেছিলেন, তা বলুন। Team-কে একবার কৃতিত্ব দিন, Result-এ, তারপর এগিয়ে যান         |
| কারণ ছাড়া action-এর তালিকা                          | অন্তত দুটি ধাপে একটি "কারণ" জুড়ে দিন। Seniority সেখানেই দেখা যায়        |
| সংখ্যা ছাড়া result                                   | মাপা যায় এমন যেকোনো কিছু: latency, error rate, review-এর সময়, বাঁচানো ঘণ্টা, headcount |
| Result-এ শেষ করা                                      | শিক্ষা দিয়ে শেষ করুন। এটাই একমাত্র অংশ, যেটা বলে এখন আপনি আরও ভালো করতেন   |

## 🔑 মূল শিক্ষা

- সময়ের বাজেটটাই কৌশল — Action আর Result মিলে উত্তরের তিন-চতুর্থাংশ।
- Seniority দেখা যায় Action অংশে, আর তখনই, যখন প্রতিটি ধাপ কেন বেছে নিলেন তা ব্যাখ্যা করেন।
- ব্যর্থতার গল্পে নম্বর আসে system-স্তরের সমাধান থেকে, ক্ষমা চাওয়া বা rollback থেকে নয়।
- Grid-এর খালি ঘরগুলোই তার ফলাফল — সেগুলো সেই প্রশ্নের নাম বলে, যার উত্তর আপনি এখনো দিতে পারেন না।
- প্রতিটি গল্প শেষ হয় একটি সংখ্যা দিয়ে, তারপর একটি শিক্ষা দিয়ে, এই ক্রমে।

## Interview-এর প্রশ্ন

**Q: আপনার উত্তর লম্বা হয়ে যাচ্ছে, আর interviewer-কে অস্থির দেখাচ্ছে। কী করবেন?**

সরাসরি Result-এ চলে যান। বলুন, "ফলাফল ছিল X, আর কাজে লাগলে আমরা কীভাবে সেখানে পৌঁছালাম তা আবার বলতে পারি"।
এতে প্রমাণটা পৌঁছে যায়, আর কতটা গভীরে যাবেন তা তাঁরা ঠিক করতে পারেন। Action-এর মাঝপথে কথা থামিয়ে দিলে উত্তরে
নম্বর পাওয়ার মতো কিছুই থাকে না।

**Q: প্রশ্নটা এমন একটি পরিস্থিতি নিয়ে, যেখানে আপনি সত্যিই কখনো পড়েননি। এখন কী?**

সেটা বলুন, তারপর সবচেয়ে কাছের সত্যিকারের অভিজ্ঞতাটা দিন: "আমি কখনো direct report manage করিনি। তবে দুজন নতুন
সহকর্মীর onboarding-এর দায়িত্ব আমার ছিল, যেটা এর সবচেয়ে কাছাকাছি। এটা কি কাজে লাগবে?" বানানো অভিজ্ঞতা
follow-up প্রশ্নে ধরা পড়ে, আর follow-up প্রশ্ন সবসময় থাকে।

**Q: অন্য সব দিক দিয়ে সঠিক একটি উত্তরকে "আমরা" কেন ক্ষতি করে?**

কারণ interviewer একজন মানুষকে নম্বর দিচ্ছেন, আর "আমরা" লুকিয়ে ফেলে কোন অংশটা আপনার ছিল। এটা সাধারণত বিনয় নয়,
সততা থেকে আসে: কাজটা সত্যিই ভাগাভাগি করে হয়েছিল। তাই সমাধান বাড়িয়ে দাবি করা নয়, নির্দিষ্ট হওয়া। আপনি কী সিদ্ধান্ত
নিয়েছিলেন আর কী লিখেছিলেন, তা বলুন, আর team-এর অংশ আলাদা করে বলুন।

**Q: কখন ইচ্ছা করেই STAR ব্যবহার করবেন না?**

পদ্ধতির প্রশ্নে আর কাল্পনিক প্রশ্নে, যেমন "X আপনি কীভাবে করেন" বা "Y হলে কী করবেন"। এগুলো আগে আপনার সাধারণ
practice চায়, হয়তো পরে একটি ছোট উদাহরণ দিয়ে সমর্থন করে। একটি কাল্পনিক প্রশ্ন "একটি সময়ের কথা বলি" দিয়ে শুরু করলে
এমন প্রশ্নের উত্তর দেওয়া হয়, যেটা জিজ্ঞেসই করা হয়নি।

## এরপর কী পড়বেন

- [Chapter ?? — Problem Solving, চ্যালেঞ্জ ও ব্যর্থতা](#ch-problem-solving) — সবচেয়ে কঠিন দুটি category, গভীরভাবে
- [Chapter ?? — Leadership, প্রভাব ও না বলা](#ch-leadership-teamwork) — যে category-গুলো grid-এ সাধারণত সবচেয়ে পাতলা থাকে
- [Chapter ?? — ব্যাখ্যা করা ও জোরে জোরে ভাবা](#ch-thinking-aloud) — behavioural round-এর বাইরে উপস্থাপনের একই শৃঙ্খলা
