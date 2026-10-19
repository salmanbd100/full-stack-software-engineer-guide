---
sourceHash: "4fc0086b4a0638ff43a31477cacb8506e132b7dfb4e4a217b1e07d68361a3a3f"
title: "Problem Solving, চ্যালেঞ্জ ও ব্যর্থতা"
translatedAt: "2026-10-19T10:25:51.057Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Problem Solving, চ্যালেঞ্জ ও ব্যর্থতা {#ch-problem-solving}

> বীরত্বের গল্প নয়, পদ্ধতি দেখান। আর প্রমাণ করুন, আপনার ব্যর্থতা শুধু মন খারাপ করেনি, কোনো system বদলে দিয়েছে।

**এই অধ্যায়ে:** এই category আসলে কী মাপে · debugging-এর গল্প বলার ধরন · দুটি পূর্ণ উত্তর · ব্যর্থতার গল্পে কী থাকতেই হবে · চাপের মধ্যে কাজ · যে লক্ষণে বিপদ

## 💡 মূল ধারণা

দেখতে দুটি category মনে হলেও এগুলো আসলে একটিই। "কোন কঠিন সমস্যার সমাধান করেছিলেন, বলুন" আর "কখন ব্যর্থ হয়েছিলেন,
বলুন", দুটিই জানতে চায় আপনার কোনো **পদ্ধতি** আছে কি না। পদ্ধতি মানে এমন কিছু, যা আগে কখনো দেখেননি এমন সমস্যাতেও
আপনি আবার করবেন। প্রথম প্রশ্ন চায়, পদ্ধতিটা কাজ করার গল্প। দ্বিতীয়টা চায়, কাজ না করার পরের গল্প।

দুটিতেই ফাঁদ একই। Candidate গল্পটা বলেন ঘটনার পর ঘটনা সাজিয়ে। ফলে interviewer বুঝতে পারেন না, ফলটা এসেছিল বিচারবুদ্ধি
থেকে, নাকি ভাগ্য থেকে।

> সময়ের ক্রম নয়, সিদ্ধান্তগুলো বলুন। "তারপর হঠাৎ চোখে পড়ল…" হলো ভাগ্য। "Log দেখে বুঝলাম সমস্যাটা নির্দিষ্ট region-এ,
> তাই file parser-এর দিকে তাকানো বন্ধ করলাম", এটা পদ্ধতি।

## কীভাবে কাজ করে

Bug যা-ই হোক, ভালো debugging-এর উত্তরে একই চারটি ধাপ থাকে।

| ধাপ            | আপনি যা বলেন                                       | যা প্রমাণ হয়                              |
| --------------- | -------------------------------------------------- | ------------------------------------------- |
| **পর্যবেক্ষণ**     | Signal-টা কী, আর সেটা কোন সম্ভাবনা বাদ দিল                   | আন্দাজের আগে আপনি তথ্য জোগাড় করেন                  |
| **অনুমান** | দুই-তিনটি সম্ভাব্য কারণ, কোনটা যাচাই করা সবচেয়ে সস্তা সেই ক্রমে | প্রথম আইডিয়াটা আপনি আঁকড়ে ধরে থাকেন না    |
| **যাচাই**        | সেই একটি পরীক্ষা, যা সম্ভাবনাগুলোকে আলাদা করল              | আপনি এমন পরীক্ষা সাজাতে পারেন, যা সত্যিই পার্থক্য করে        |
| **প্রতিরোধ**     | এই ধরনের bug এখন কীসে ধরা পড়ে                  | উত্তরের senior অর্ধেক                |

চতুর্থ ধাপটাই candidate-রা বাদ দেন, আর ওটাই স্তরগুলোকে আলাদা করে। Bug সারানো তো কাজেরই অংশ। পরের বার ওই পুরো ধরনের bug
যেন চোখে পড়ে, সেই ব্যবস্থা করাতেই seniority দেখা যায়।

**Five whys (প্রতিটি উত্তরে আবার "কেন?" জিজ্ঞেস করা) ঠিকমতো চালালে শেষে পৌঁছায় কোনো process-এ, code-এর কোনো line-এ নয়:**

```text
Why did the service crash?          → Memory overflow
Why did memory overflow?            → Unbounded cache
Why was the cache unbounded?        → No eviction policy set
Why was no policy set?              → The default was assumed to have one
Root cause: no config validation in the deploy pipeline
```

খেয়াল করুন, উত্তরটা হলো "আমাদের pipeline এটা যাচাই করে না", "কেউ ভুলে গিয়েছিল" নয়। মূল কারণের দায় যদি কোনো মানুষের
ঘাড়ে চাপানো যায়, তাহলে আপনি খুব তাড়াতাড়ি থেমে গেছেন। যা পেয়েছেন, তা শুধু উপসর্গ।

## দুটি পূর্ণ উত্তর

### কঠিন bug

**প্রশ্ন:** "Debug করতে কষ্ট হয়েছিল, এমন একটি সমস্যার কথা বলুন।"

```text
SITUATION: We shipped CSV upload for enterprise customers. Within a day,
roughly 15% of uploads failed — the same file would work for one customer
and fail for another, and it never reproduced in staging.

TASK: Find out why identical input produced different outcomes, with a
generic error message as the only signal.

ACTION: The logs had nothing useful, so I looked at what the failing
accounts had in common rather than what the files had in common. Every
failure was outside North America. That killed the two hypotheses I
started with — encoding and date parsing — because neither is regional
in that way. Latency was the third, and it was the cheapest to test: I
reproduced it through a VPN in twenty minutes. Upload and parse ran
synchronously inside one request against a 30-second API timeout, so the
variable was the customer's round-trip time, not their data. I moved the
upload straight to S3 from the browser and made parsing a background job.

RESULT: Success rate went from 85% to 99.7%, and perceived time from 45
seconds to 8. The part I would keep is the prevention: we added response-
time monitoring split by region, because the reason this took two days was
that every dashboard we had averaged the world together.
```

### ব্যর্থতা

**প্রশ্ন:** "আপনি কখন ব্যর্থ হয়েছিলেন, বলুন।"

```text
SITUATION: Second year in, I was given my first solo project — rebuilding
the internal tool the support team used for tickets. Three months.

TASK: Requirements, design, build, ship. Target was 30% off ticket
resolution time.

ACTION: I got this wrong in three ways and they compounded. I assumed I
understood the requirements because I had watched the team use the old
tool. I chose a stack I wanted to learn rather than the one the team
could maintain. And I worked alone for six weeks because I wanted the
demo to be impressive. When I did demo in week ten, the support team
told me it was missing the bulk-actions they lived in all day.

RESULT: The project was shelved and restarted by someone else. It cost
about £30k and the support team kept the old tool for another four
months. What changed afterwards was specific, not attitudinal: I now
demo in week one with something unusable, because the only purpose of
the first demo is to be wrong cheaply. On the next project that caught
a wrong assumption about permissions in the first fortnight.
```

⚠️ ব্যর্থতার উত্তরটা তিনটি ভুলের নাম বলে, আর কোনোটাকেই নরম করে না। অস্পষ্ট একটি ভুল, তারপর লম্বা ঘুরে দাঁড়ানোর গল্প,
শুনলে মহড়া দেওয়া মনে হয়। নির্দিষ্ট তিনটি ভুল শুনলে মনে হয়, মানুষটা সত্যিই ব্যাপারটা নিয়ে ভেবেছেন।

## ব্যর্থতার গল্পে যা থাকতেই হবে

| উপাদান                      | কেন এতে নম্বর ওঠে                                                    |
| ---------------------------- | ------------------------------------------------------------------- |
| সত্যিকারের ক্ষতি                  | টাকা, সময়, কোনো customer, কারও পুরো একটি quarter। ক্ষতি না থাকলে ব্যর্থতাও নেই     |
| কারণ হিসেবে আপনার সিদ্ধান্ত   | "Requirement বদলে গিয়েছিল" আসলে অন্য কারও গল্প             |
| System-এ বদল             | এখন কী এই ব্যর্থতাকে অসম্ভব করে, অন্তত চোখে পড়ার মতো করে          |
| বদলটা যে টিকেছে, তার প্রমাণ    | "পরের project-এ এটা X ধরে ফেলেছিল"। নইলে এটা শুধুই ভালো উদ্দেশ্য |

তিন ধরনের গল্প এড়িয়ে চলুন। ছদ্মবেশী গুণ ("আমি code quality নিয়ে একটু বেশিই ভাবি")। ঘুরিয়ে-পেঁচিয়ে অন্যকে দোষ দেওয়া
("এক সহকর্মীকে ভরসা করেছিলাম, তিনি ডুবিয়েছেন")। আর এত ছোট ব্যর্থতা, যা থেকে কিছুই শেখার নেই।

## চাপের মধ্যে কাজ

চাপ নিয়ে প্রশ্নটা আসলে **triage** নিয়ে: কোনটা আগে সামলাবেন, সেটা ঠিক করা। উত্তরে অগ্রাধিকার ঠিক করার স্পষ্ট নিয়ম
লাগে। নিয়ম না থাকলে উত্তরটা শুধু মানসিক চাপের বর্ণনা।

| যখন সবকিছুই জরুরি            | নিয়ম                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| Production-এ প্রভাব পড়ছে               | আগে রক্তক্ষরণ থামান, বোঝার কাজ পরে। রোগ নির্ণয়ের আগে প্রশমন |
| একসঙ্গে দুটি incident                | কোনটার ক্ষতি এখনো বাড়ছে, সেই ক্রমে সাজান, severity দেখে নয়   |
| Deadline টিকবে না               | যেদিন জানলেন সেদিনই বলুন, deadline-এর দিন নয়             |
| সবকিছুই "P1"                   | জিজ্ঞেস করুন, প্রতিটি এক দিন পিছোলে কী ভাঙে। একটি অন্তত টিকে যায়  |

শান্ত থাকাটা লক্ষণ নয়। লক্ষণ হলো, হাতে চলতে থাকা জিনিসের সংখ্যা আপনি কমিয়েছেন।

## সাধারণ ভুল

| ❌ ভুল                                            | ✅ সমাধান                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| "মনে হলো X হতে পারে, তাই বদলে দিলাম"              | কোন প্রমাণ X-এর দিকে ইঙ্গিত করল, সেটা বলুন। আন্দাজ করে মিলিয়ে দেখাকে আন্দাজ হিসেবেই ধরা হয়      |
| সিদ্ধান্ত না বলে সময়ের ক্রম বলা              | প্রতিটি ধাপের সঙ্গে একটি "কারণ"। পুরো উত্তর এটুকুই                      |
| সমাধানেই উত্তর থামিয়ে দেওয়া                          | প্রতিরোধের কথা যোগ করুন। এই category-র অর্ধেক নম্বর ওই একটি বাক্যে  |
| এমন ব্যর্থতা, যার ক্ষতি মাপা যায় না                       | অন্য ব্যর্থতা বাছুন। অল্পের জন্য বেঁচে যাওয়া ঘটনায় interviewer নম্বর দিতে পারেন না          |
| মূল কারণ একজন মানুষ                              | Process-এ না পৌঁছানো পর্যন্ত "কেন" জিজ্ঞেস করতে থাকুন। কৌশলটার উদ্দেশ্যই এটা  |
| "চাপ ছিল, কিন্তু আমি শান্ত ছিলাম"                    | কী কী ছেঁটে ফেলেছিলেন, সেটা বলুন। Triage ছাড়া শান্ত থাকা কোনো কিছুরই প্রমাণ নয়     |

## 🔑 মূল শিক্ষা

- কঠিন সমস্যা আর ব্যর্থতা, দুই প্রশ্নই যাচাই করে আপনার এমন পদ্ধতি আছে কি না, যা বারবার খাটানো যায়।
- চারটি ধাপ: পর্যবেক্ষণ, অনুমান, যাচাই, প্রতিরোধ। প্রতিরোধই senior বলে মনে হয়।
- যে মূল কারণ কোনো মানুষকে দোষ দেয়, সেটা আসলে উপসর্গ। Process-এ না পৌঁছানো পর্যন্ত "কেন" জিজ্ঞেস করতে থাকুন।
- ব্যর্থতার গল্পে লাগে সত্যিকারের ক্ষতি, কারণ হিসেবে আপনার সিদ্ধান্ত, আর সমাধান যে টিকেছে তার প্রমাণ।
- চাপের মধ্যে নম্বর ওঠে triage-এ: তালিকা থেকে কী সরালেন, কতটা শান্ত শোনালেন তা নয়।

## Interview-এর প্রশ্ন

**Q: আপনার সবচেয়ে কঠিন technical সমস্যাটা যদি তেমন চমকপ্রদ না হয়?**

তবু সেটাই বলুন, আর পদ্ধতিটা নির্দিষ্ট করে বলুন। ভালোভাবে বলা cache-invalidation bug খারাপভাবে বলা distributed-systems-এর
গল্পের চেয়ে বেশি নম্বর পায়। কারণ interviewer শুধু তাতেই নম্বর দিতে পারেন, যা তিনি অনুসরণ করতে পারেন। যে scale আপনার
ছিল না, তার দাবি প্রথম follow-up প্রশ্নেই ভেঙে পড়ে।

**Q: আপনাকে ব্যর্থতার কথা জিজ্ঞেস করা হলো, আর আপনার সত্যিকারের প্রতিটি ব্যর্থতায় অন্য কারও দোষও কিছুটা ছিল। কী বলবেন?**

নিজের অংশটুকুর দায় নিন, আর শুধু সেটুকুই বলুন। যেমন: "API contract কোনো খবর না দিয়ে বদলে গিয়েছিল। আমি contract test
ছাড়াই সেটার ওপর ভরসা করে বানিয়েছিলাম, আর test যোগ করা আমারই কাজ ছিল।" এতে দুই দিকেই সৎ থাকা হয়, আর উত্তরের সময়টা
অন্য পক্ষের পেছনে খরচ হয় না।

**Q: Debugging থামানোই কখন সঠিক উত্তর?**

যখন চালিয়ে যাওয়ার খরচ workaround-এর চেয়ে বেশি, আর workaround-এর খরচ কত তা আপনি বলতে পারেন। সময়ের চাপে senior engineer-রা
মূল কারণ খুঁজে বের করার চেয়ে বরং ticket জুড়ে দিয়ে প্রশমন ship করেন বেশি। এ কথা বলা দুর্বলতা নয়, শক্তি, যতক্ষণ বলে দেন
কী পিছিয়ে রাখলেন।

**Q: "যে ঝুঁকি কাজে লাগেনি", এমন গল্প বেপরোয়া না শুনিয়ে বলবেন কীভাবে?**

দেখান যে ঝুঁকি নেওয়ার আগেই সেটা সীমিত করা ছিল: ধাপে ধাপে rollout, flag, rollback-এর পরিকল্পনা, আর এমন metric যা ব্যর্থ
হচ্ছে কি না জানিয়ে দেবে। তখন গল্পটা হয়ে যায় সীমিত একটি পরীক্ষার, যার ফল নেতিবাচক এসেছে। Engineering-এ এটা স্বাভাবিক
ফল, বিচারবুদ্ধির গাফিলতি নয়।

## এরপর কী পড়বেন

- [Chapter ?? — STAR Framework ও Story Bank](#ch-star-framework) — গড়ন আর সময়ের হিসাব
- [Chapter ?? — Leadership, প্রভাব ও না বলা](#ch-leadership-teamwork) — behavioural loop-এর বাকি অর্ধেক
- [Chapter ?? — কাজের ধরন ও Engineering Culture](#ch-engineering-culture) — blameless post-mortem, মানে এই অধ্যায়টাই নিয়মিত অভ্যাস হিসেবে
