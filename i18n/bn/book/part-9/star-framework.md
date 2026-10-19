---
sourceHash: "3b51499fbd00b46cce9c64ead2fc1a8dd36029e3bd360f5d795ab9dd93dc5ad9"
title: "STAR Framework ও Story Bank"
translatedAt: "2026-10-19T10:31:20.060Z"
model: "claude-opus-5-5 (Claude Code)"
---

# STAR Framework ও Story Bank {#ch-star-framework}

> Behavioural উত্তর এমনভাবে সাজান, যাতে interviewer তিন মিনিটের মধ্যে action আর result দুটিই শুনতে পান।

**এই অধ্যায়ে:** চারটি অংশ আর তাদের সময়ের হিসাব · একটি পূর্ণ উত্তর · ব্যর্থতার গল্প কেন আলাদা · coverage grid · যে ভুলগুলোর দামে offer হাতছাড়া হয়

## 💡 মূল ধারণা

Interviewer গল্পটাকে নম্বর দিচ্ছেন না। নম্বর দিচ্ছেন গল্পের ভেতরের প্রমাণকে: আপনি কী সিদ্ধান্ত নিলেন, কেন নিলেন,
আর তার ফলে কী বদলাল। STAR (situation, task, action, result) আসলে শুধু সেই ক্রম, যেটা সেই প্রমাণকে এমন জায়গায়
বসায়, যেখানে শ্রোতা শুনতে পান।

বেশির ভাগ candidate ব্যাপারটা উল্টো করে ফেলেন। নব্বই সেকেন্ড পটভূমিতে, ত্রিশ সেকেন্ড নিজের কাজে, তারপর result-এ
পৌঁছানোর আগেই সময় শেষ। পটভূমিই উত্তরের সবচেয়ে কম দামি অংশ, অথচ সময় চলে যায় সেখানেই।

## কীভাবে কাজ করে

চারটি অংশ, এই ক্রমে, প্রতিটির জন্য বাঁধা সময়। সময়ের এই হিসাবটাই পুরো কৌশল। শুধু acronym-টা মুখস্থ করে কোনো
লাভ নেই।

| অংশ          | ভাগ   | ~সময় | এখানে কী থাকবে                                       | যেভাবে ভুল হয়                              |
| ------------- | ------- | ----- | ------------------------------------------------------- | ----------------------------------------- |
| **Situation** | 15–20%  | ~20 s | কোথায়, কখন, আর business-এর কাছে কেন জরুরি ছিল         | পুরো quarter-এর কাহিনি শোনানো                |
| **Task**      | 10–15%  | ~15 s | আপনার ভূমিকা, আপনার লক্ষ্য, আর কোন বাধা কাজটা কঠিন করেছিল   | Team-এর লক্ষ্য বলা, নিজেরটা নয়     |
| **Action**    | 50–60%  | ~60 s | **আপনি** কী করলেন, আর প্রতিটি ধাপ কেন বেছে নিলেন            | যুক্তি ছাড়া শুধু ধাপের তালিকা |
| **Result**    | 15–20%  | ~25 s | একটি সংখ্যা, তারপর আপনি কী শিখলেন                          | "ভালোই হয়েছিল"                            |

**মোট: দুই থেকে তিন মিনিট।** চার মিনিট পেরোলে শ্রোতা আর নম্বর দেন না, শুধু সহ্য করেন।

Seniority দেখা যায় Action অংশে, কারণ শুধু এখানেই আপনি কোনো বাছাইয়ের ব্যাখ্যা দেন। "আমি একটি index যোগ করেছিলাম",
এটা mid-level। Senior বলেন: "Profiler দেখাল 4 কোটি row-এর একটি table-এ sequential scan হচ্ছে। তাই result cache না
করে আমি covering index যোগ করলাম। Query-টা তো আগে থেকেই ঠিক ছিল, আর সত্যের দ্বিতীয় কোনো উৎস আমি তৈরি করতে চাইনি।"

## একটি পূর্ণ উত্তর

**প্রশ্ন:** "এমন একটি সময়ের কথা বলুন, যখন আপনি কোনো project-এর নেতৃত্ব দিয়েছিলেন।"

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

Result-এ আগে আসে একটি সংখ্যা, তারপর এমন কিছু যা project শেষ হওয়ার পরেও টিকে ছিল, তারপর নির্দিষ্ট একটি শিক্ষা।

## ব্যর্থতার গল্প আলাদা

"আপনি কখন ব্যর্থ হয়েছিলেন, বলুন" প্রশ্নটা বিনয়ের পরীক্ষা নয়। এটা দেখে, আপনি system সারান, নাকি শুধু একেকটা
incident সামলান।

যে উত্তর "আমি rollback করলাম আর দুঃখপ্রকাশ করলাম"-এ থেমে যায়, সেটা শুধু incident-এর বর্ণনা। নম্বর পায় সেই উত্তর,
যেটা এরপর বলে, ব্যাপারটা আবার ঘটা কীসে বন্ধ হলো:

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

⚠️ এমন ব্যর্থতা বানাবেন না, যেটা আসলে ছদ্মবেশী গুণ। "আমি code quality নিয়ে একটু বেশিই ভাবি", এ কথা interviewer-রা
সপ্তাহে কয়েকবার শোনেন। আর এটাকে তাঁরা প্রশ্ন এড়িয়ে যাওয়া হিসেবেই ধরেন।

## Story Bank গড়ে তোলা

পুরো একটি loop-এর জন্য দশ থেকে বারোটি গল্পই যথেষ্ট। কারণ জোরটা কোথায় দিচ্ছেন বদলালে একটি গল্পই কয়েকটি প্রশ্নের
উত্তর দেয়। একটি migration project হতে পারে technical চ্যালেঞ্জের গল্প, leadership-এর গল্প, কিংবা বদলের সঙ্গে মানিয়ে
নেওয়ার গল্প। নির্ভর করে কোন অংশটা আপনি বিস্তারিত বলছেন তার ওপর।

প্রতিটি গল্পের জন্য চারটি জিনিস লিখে রাখুন, এর বাইরে কিছু নয়:

```text
Title:      Dashboard performance push
Tags:       leadership, technical, mentoring
Numbers:    3 engineers, 8 weeks, 4.5s → 1.6s, bounce 30% → 12%
Answers:    led a project · influenced without authority · improved a product
```

সংখ্যার line-টাই ঠিকমতো তৈরি করে রাখার জিনিস। চাপের মধ্যে গল্পের গড়নটা মনে থাকবে, metric-টা ভুলে যাবেন। অথচ
interviewer লিখে নেন ওই metric-টাই।

## Coverage Grid

বারোটি গল্পের আটটিই যদি আসলে একই গল্প হয়, তাহলে বারোটি দিয়ে কোনো লাভ নেই। Interviewer ধরে ফেলার আগে grid-ই এটা
ধরিয়ে দেয়। পাশে, ওপর থেকে নিচে, নিজের project-গুলো লিখুন। ওপরে, বাঁ থেকে ডানে, competency category, মানে যে
skill-গুলোর ওপর নম্বর দেওয়া হচ্ছে। তারপর সেই ঘরগুলো ভরান, যেগুলোর পক্ষে সত্যিকারের উদাহরণ আছে।

| Project                       | Leadership                       | চ্যালেঞ্জ                        | Conflict                     | ব্যর্থতা                          |
| ----------------------------- | -------------------------------- | -------------------------------- | ---------------------------- | -------------------------------- |
| **Dashboard performance**     | 3 জন engineer-কে 8 সপ্তাহ নেতৃত্ব      | 4.5s load, backend-এর জন্য কোনো বাজেট নেই     | Team চাইছিল state library  | —                                |
| **Checkout নতুন করে বানানো**          | —                                | 6 সপ্তাহে PCI compliance        | PM চাইছিলেন deadline না নড়ুক  | Safari-তে ভাঙল, 3 ঘণ্টার order গেল  |
| **Design system চালু করা**     | ক্ষমতা ছাড়াই 4টি team-কে রাজি করানো | নির্দেশ ছাড়াই সবাইকে দিয়ে গ্রহণ করানো       | দুটি team token নিতে রাজি হয়নি | প্রথম version ship হয়েছিল version ছাড়া |

**ফাঁকা ঘরগুলোই grid-এর আসল ফল।** ফাঁকা column মানে এমন একটি প্রশ্ন, যার উত্তর আপনার কাছে নেই। ভরা row মানে একটি
project-ই loop-এর অনেক বেশি ভার টানছে। দুটিই এক সন্ধ্যা বসে ভাবলে ঠিক করা যায়। Interview-এর ঘরে বসে কোনোটাই যায় না।

বেশির ভাগ loop পাঁচটি category-তেই ঢাকা পড়ে। Interviewer-রা একেকজন একেকভাবে প্রশ্ন করেন, তাই শব্দ নয়, category-টা
চিনে রাখুন:

| Category       | এর নিচের আসল প্রশ্ন                          | সাধারণত যেভাবে জিজ্ঞেস করা হয়                                     |
| -------------- | --------------------------------------------------- | ----------------------------------------------------- |
| **Leadership** | মানুষ কি আপনার technical বিচার মেনে চলে?           | Project-এর নেতৃত্ব · কাউকে mentor করা · অজনপ্রিয় সিদ্ধান্ত নেওয়া |
| **চ্যালেঞ্জ**  | সমস্যা সত্যিই কঠিন হলে আপনি কী করেন?   | জটিল bug · আঁটসাঁট deadline · অসম্পূর্ণ তথ্য |
| **Conflict**   | দ্বিমত করেও কাজের সম্পর্ক টিকিয়ে রাখতে পারেন?  | Manager-এর সঙ্গে দ্বিমত · কঠিন stakeholder      |
| **ব্যর্থতা**    | System সারান, নাকি incident?                 | কখন ব্যর্থ হয়েছিলেন · আপনার সবচেয়ে বড় ভুল              |
| **Impact**     | আপনার কারণে কী বদলেছে, নাম ধরে বলতে পারেন?            | যে কাজ নিয়ে সবচেয়ে গর্ব · প্রত্যাশার চেয়ে বেশি করা                 |

## কখন ব্যবহার করবেন

STAR খাটে অতীত নিয়ে প্রশ্নে। বাকি সব কিছুতে খাটে না, আর জোর করে খাটাতে গেলে ধরা পড়ে যান।

| প্রশ্ন                              | কী ব্যবহার করবেন            | কেন                                                   |
| ----------------------------------------- | -------------- | ----------------------------------------------------- |
| "এমন একটি সময়ের কথা বলুন, যখন…"               | STAR           | অতীতের কোনো আচরণের প্রমাণ চাইছে          |
| "যে project নিয়ে আপনি গর্বিত, সেটার কথা বলুন"      | STAR           | একই গড়ন, একটু নরম ভাষায়                             |
| "Code review কীভাবে করেন?"        | পদ্ধতি       | আগে আপনার সাধারণ অভ্যাস চায়, তারপর একটি উদাহরণ       |
| "Release ভেঙে গেলে কী করতেন?"   | পদ্ধতি       | কাল্পনিক প্রশ্ন, Situation বলার কিছু নেই            |
| "এখানে কাজ করতে চান কেন?"           | কোনোটাই নয়        | এখানে গল্প বললে মনে হয় মহড়া দেওয়া পাশ কাটানো                |

## সাধারণ ভুল

| ❌ ভুল                                              | ✅ সমাধান                                                                       |
| ------------------------------------------------------- | ---------------------------------------------------------------------------- |
| চার-পাঁচ মিনিট ধরে গল্প                            | Timer ধরে অনুশীলন করুন। আগে Situation ছাঁটুন, বাড়তি মেদ সবসময় ওখানেই     |
| "আমরা ঠিক করলাম", "আমরা বানালাম", "আমরা ship করলাম"                   | **আপনি** কী করলেন, সেটা বলুন। Team-কে কৃতিত্ব দিন একবার, Result-এ, তারপর এগিয়ে যান         |
| যুক্তি ছাড়া শুধু action-এর তালিকা                          | অন্তত দুটি ধাপের সঙ্গে "কারণ" জুড়ে দিন। Seniority ওখানেই দেখা যায়        |
| সংখ্যা ছাড়া result                                   | মাপা যায় এমন যেকোনো কিছু: latency, error rate, review-এর সময়, বাঁচানো ঘণ্টা, লোকবল |
| Result-এ শেষ করা                                      | শেষ করুন শিক্ষা দিয়ে। শুধু এই অংশটাই বলে, এখন হলে আপনি আরও ভালো করতেন   |

## 🔑 মূল শিক্ষা

- সময়ের হিসাবটাই কৌশল। Action আর Result মিলে উত্তরের তিন-চতুর্থাংশ।
- Seniority দেখা যায় Action অংশে, আর তখনই, যখন প্রতিটি ধাপ কেন বাছলেন তা ব্যাখ্যা করেন।
- ব্যর্থতার গল্পে নম্বর ওঠে system-এর স্থায়ী সমাধানে। দুঃখপ্রকাশ বা rollback-এ নয়।
- Grid-এর ফাঁকা ঘরগুলোই তার ফল। এই ঘরগুলোই বলে দেয়, কোন প্রশ্নের উত্তর আপনি এখনো দিতে পারেন না।
- প্রতিটি গল্প শেষ হয় আগে একটি সংখ্যায়, তারপর একটি শিক্ষায়, এই ক্রমে।

## Interview-এর প্রশ্ন

**Q: উত্তর লম্বা হয়ে যাচ্ছে, interviewer অস্থির হয়ে উঠছেন। কী করবেন?**

সোজা Result-এ চলে যান। বলুন, "ফলাফল ছিল X। কীভাবে সেখানে পৌঁছলাম, দরকার হলে সেটা আবার বলতে পারি।" তাতে প্রমাণটা
পৌঁছে যায়, আর কতটা গভীরে যাবেন সেটা ওঁরাই ঠিক করতে পারেন। Action-এর মাঝখানে কথা হারিয়ে ফেললে উত্তরে নম্বর
পাওয়ার মতো কিছুই থাকে না।

**Q: প্রশ্নটা এমন পরিস্থিতি নিয়ে, যেখানে আপনি সত্যিই কখনো পড়েননি। এখন কী?**

সেটাই বলুন, তারপর সবচেয়ে কাছের সত্যিকারের অভিজ্ঞতাটা দিন: "আমার অধীনে সরাসরি কেউ কখনো ছিলেন না। তবে দুজন নতুন
সহকর্মীর onboarding-এর পুরো দায়িত্ব আমার ছিল, এর চেয়ে কাছের অভিজ্ঞতা আমার নেই। এটা কি কাজে লাগবে?" বানানো
অভিজ্ঞতা follow-up প্রশ্নে ধরা পড়ে যায়। আর follow-up প্রশ্ন সবসময় আসে।

**Q: উত্তর বাকি সব দিক থেকে ঠিক, তবু "আমরা" বললে ক্ষতি হয় কেন?**

কারণ interviewer নম্বর দিচ্ছেন একজন মানুষকে, আর "আমরা" লুকিয়ে ফেলে কোন অংশটা আপনার ছিল। সাধারণত এটা আসে
বিনয় থেকে নয়, সততা থেকে: কাজটা সত্যিই ভাগ করে করা হয়েছিল। তাই সমাধান নিজের ভাগ বাড়িয়ে বলা নয়, বরং নির্দিষ্ট
করে বলা। কী আপনি ঠিক করেছিলেন আর কী আপনি লিখেছিলেন, সেটা বলুন। Team-এর অংশ আলাদা করে বলুন।

**Q: কখন ইচ্ছে করেই STAR ব্যবহার করবেন না?**

পদ্ধতি নিয়ে প্রশ্নে আর কাল্পনিক প্রশ্নে, যেমন "X কীভাবে করেন" বা "Y হলে কী করতেন"। এগুলো আগে আপনার সাধারণ অভ্যাসটা
জানতে চায়, দরকার হলে পরে ছোট একটি উদাহরণ দিয়ে। কাল্পনিক প্রশ্নের শুরুতে "একবার কী হয়েছিল বলি" মানে এমন প্রশ্নের
উত্তর দেওয়া, যেটা কেউ জিজ্ঞেসই করেননি।

## এরপর কী পড়বেন

- [Chapter ?? — Problem Solving, চ্যালেঞ্জ ও ব্যর্থতা](#ch-problem-solving) — সবচেয়ে কঠিন দুটি category, বিস্তারিতভাবে
- [Chapter ?? — Leadership, প্রভাব ও না বলা](#ch-leadership-teamwork) — যে category-গুলো grid-এ সাধারণত সবচেয়ে পাতলা থাকে
- [Chapter ?? — ব্যাখ্যা করা ও জোরে জোরে ভাবা](#ch-thinking-aloud) — behavioural round-এর বাইরেও বলার একই শৃঙ্খলা
