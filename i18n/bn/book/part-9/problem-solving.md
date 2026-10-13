---
sourceHash: "4fc0086b4a0638ff43a31477cacb8506e132b7dfb4e4a217b1e07d68361a3a3f"
title: "Problem Solving, চ্যালেঞ্জ ও ব্যর্থতা"
translatedAt: "2026-10-13T03:10:45.755Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Problem Solving, চ্যালেঞ্জ ও ব্যর্থতা {#ch-problem-solving}

> বীরত্বের গল্প নয়, একটি পদ্ধতি দেখান, আর প্রমাণ করুন যে আপনার ব্যর্থতাগুলো একটি মেজাজ নয়, একটি system বদলেছে।

**এই অধ্যায়ে:** এই category কী মাপে · debugging-এর বর্ণনা · দুটি করে দেখানো উত্তর · একটি ব্যর্থতার গল্পে কী থাকতেই হবে · চাপের মধ্যে কাজ করা · বিপদসংকেত

## 💡 মূল ধারণা

এই প্রশ্নগুলোকে দুটি category মনে হয়, কিন্তু আসলে একটিই। "একটি কঠিন সমস্যার কথা বলুন, যেটা আপনি সমাধান করেছিলেন"
আর "এমন একটি সময়ের কথা বলুন, যখন আপনি ব্যর্থ হয়েছিলেন" — দুটিই জানতে চায় আপনার একটি **পদ্ধতি** আছে কি না।
পদ্ধতি এমন কিছু, যা আপনি আগে দেখেননি এমন একটি সমস্যাতেও আবার করবেন। প্রথম প্রশ্ন সেটা কাজ করার সময়ের বর্ণনা
চায়। দ্বিতীয়টি চায়, যখন সেটা কাজ করেনি তার পরের বর্ণনা।

দুটিতেই ফাঁদ একই। Candidate গল্পটা ঘটনার একটি ধারা হিসেবে বলেন, আর interviewer বুঝতে পারেন না ফলাফলটা বিচারবুদ্ধি
থেকে এসেছে, নাকি ভাগ্য থেকে।

> সময়রেখা নয়, সিদ্ধান্তগুলো বর্ণনা করুন। "তারপর আমি খেয়াল করলাম…" হলো ভাগ্য। "Log থেকে বুঝলাম সমস্যাটা regional,
> তাই আমি file parser দেখা বন্ধ করলাম" হলো পদ্ধতি।

## কীভাবে কাজ করে

প্রতিটি ভালো debugging উত্তর একই চারটি ধাপে চলে, bug যা-ই হোক।

| ধাপ            | আপনি যা বলেন                                       | এতে যা প্রমাণ হয়                              |
| --------------- | -------------------------------------------------- | ------------------------------------------- |
| **পর্যবেক্ষণ**     | সংকেতটা, আর সেটা কী বাদ দিল                   | আপনি অনুমানের আগে তথ্য জোগাড় করেন                  |
| **অনুমান** | দুই-তিনটি সম্ভাব্য কারণ, test করা কত সস্তা সেই ক্রমে | আপনি নিজের প্রথম idea-র প্রতি আসক্ত নন    |
| **Test**        | সেই একটি পরীক্ষা, যেটা এগুলোকে আলাদা করল             | আপনি এমন test বানাতে পারেন, যা পার্থক্য ধরে        |
| **প্রতিরোধ**     | এখন কী এই ধরনের bug ধরে ফেলে                  | উত্তরের senior অর্ধেক                |

চতুর্থ ধাপটাই candidate-রা বাদ দেন, আর এটাই স্তরগুলোকে আলাদা করে। Bug ঠিক করা কাজের অংশ। পরের বার পুরো ধরনের bug-কে
দৃশ্যমান করে তোলাই seniority দেখায়।

**Five whys (প্রতিটি উত্তরে আবার "কেন?" জিজ্ঞেস করা), ঠিকমতো চালালে, শেষ হয় একটি প্রক্রিয়ায়, code-এর একটি line-এ নয়:**

```text
Why did the service crash?          → Memory overflow
Why did memory overflow?            → Unbounded cache
Why was the cache unbounded?        → No eviction policy set
Why was no policy set?              → The default was assumed to have one
Root cause: no config validation in the deploy pipeline
```

খেয়াল করুন, উত্তরটা "আমাদের pipeline এটা check করে না", "কেউ ভুলে গিয়েছিল" নয়। মূল কারণের দোষ যদি একজন মানুষের
ঘাড়ে চাপাতে পারেন, তাহলে আপনি খুব তাড়াতাড়ি থেমেছেন, আর শুধু একটি লক্ষণ খুঁজে পেয়েছেন।

## দুটি করে দেখানো উত্তর

### কঠিন bug

**প্রশ্ন:** "এমন একটি কঠিন সমস্যার কথা বলুন, যেটা আপনি debug করেছিলেন।"

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

**প্রশ্ন:** "এমন একটি সময়ের কথা বলুন, যখন আপনি ব্যর্থ হয়েছিলেন।"

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

⚠️ ব্যর্থতার উত্তরটা তিনটি ভুলের নাম বলে, আর কোনোটাকেই নরম করে না। একটি অস্পষ্ট ভুল আর তারপর ঘুরে দাঁড়ানোর লম্বা
গল্প শুনলে মহড়া দেওয়া মনে হয়। তিনটি নির্দিষ্ট ভুল শুনলে মনে হয় এমন কেউ, যিনি সত্যিই বিষয়টা নিয়ে ভেবেছেন।

## একটি ব্যর্থতার গল্পে যা থাকতেই হবে

| উপাদান                      | কেন এতে নম্বর আসে                                                    |
| ---------------------------- | ------------------------------------------------------------------- |
| সত্যিকারের ক্ষতি                  | টাকা, সময়, একজন customer, কারো একটি quarter। ক্ষতি না থাকলে ব্যর্থতাও নেই     |
| কারণ হিসেবে আপনার সিদ্ধান্ত   | "Requirement বদলে গিয়েছিল" অন্য কারো সম্পর্কে একটি গল্প             |
| System-স্তরের পরিবর্তন          | এখন কী এই ব্যর্থতাকে অসম্ভব করে, বা অন্তত দৃশ্যমান করে          |
| পরিবর্তনটা টিকে আছে, তার প্রমাণ    | "পরের project-এ এটা X ধরে ফেলেছিল" — নইলে এটা শুধু একটি ভালো উদ্দেশ্য |

তিনটি রূপ এড়িয়ে চলুন। ছদ্মবেশী শক্তি ("আমি code quality নিয়ে একটু বেশিই ভাবি")। কয়েক ধাপ ঘুরিয়ে দোষারোপ ("আমি
একজন সহকর্মীকে বিশ্বাস করেছিলাম, যিনি আমাকে হতাশ করেছিলেন")। আর এত ছোট ব্যর্থতা, যেটা কিছুই শেখায় না।

## চাপের মধ্যে কাজ করা

চাপের প্রশ্নটা আসলে **triage** নিয়ে: কোনটা আগে সামলাবেন, তা ঠিক করা। উত্তরে ক্রম ঠিক করার একটি স্পষ্ট নিয়ম
লাগে। সেটা না থাকলে উত্তরটা শুধু চাপের একটি বর্ণনা।

| যখন সবকিছুই জরুরি            | নিয়ম                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| Production-এ প্রভাব পড়েছে               | আগে রক্তপাত থামান, পরে বুঝুন। Diagnosis-এর আগে mitigation |
| একসাথে দুটি incident                | Severity দিয়ে নয়, ক্ষতি এখনো বাড়ছে কি না তা দিয়ে ক্রম ঠিক করুন   |
| একটি deadline ধরে রাখা যাবে না                 | যেদিন জানলেন সেদিনই বলুন, যেদিন deadline সেদিন নয়             |
| সবকিছুই "P1"                   | জিজ্ঞেস করুন, প্রতিটি এক দিন পিছালে কী ভাঙে। একটি টিকে যায়  |

শান্ত থাকা সংকেত নয়। সংকেত হলো, আপনি চলমান জিনিসের সংখ্যা কমিয়েছেন।

## সাধারণ ভুল

| ❌ ভুল                                            | ✅ সমাধান                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| "আমি খেয়াল করলাম এটা X হতে পারে, তাই বদলে দিলাম"              | কোন প্রমাণ X-এর দিকে ইঙ্গিত করেছিল, তা বলুন। আন্দাজ করে দেখাকে আন্দাজ হিসেবেই নম্বর দেওয়া হয়      |
| সিদ্ধান্ত নয়, সময়রেখার বর্ণনা              | প্রতিটি ধাপে একটি "কারণ" থাকবে। পুরো উত্তর এটাই                      |
| Fix-এ গিয়ে উত্তর থামিয়ে দেওয়া                          | প্রতিরোধটা যোগ করুন। এই category-র অর্ধেক নম্বর ওই বাক্যে  |
| মাপা যায় এমন ক্ষতি ছাড়া একটি ব্যর্থতা                       | অন্য একটি ব্যর্থতা বেছে নিন। অল্পের জন্য বেঁচে যাওয়াকে interviewer নম্বর দিতে পারেন না          |
| মূল কারণ একজন মানুষ                              | এটা একটি প্রক্রিয়া না হওয়া পর্যন্ত কেন জিজ্ঞেস করতে থাকুন। কৌশলটার উদ্দেশ্যই এটা  |
| "চাপ ছিল, কিন্তু আমি শান্ত ছিলাম"                    | কী বাদ দিয়েছিলেন, তা বলুন। Triage ছাড়া শান্ত থাকা কোনো কিছুরই প্রমাণ নয়     |

## 🔑 মূল শিক্ষা

- কঠিন সমস্যা আর ব্যর্থতার প্রশ্ন দুটিই পরীক্ষা করে, আপনার একটি পুনরাবৃত্তিযোগ্য পদ্ধতি আছে কি না।
- চারটি ধাপ হলো পর্যবেক্ষণ, অনুমান, test, প্রতিরোধ। প্রতিরোধটাই senior বলে মনে হয়।
- যে মূল কারণ একজন মানুষকে দোষ দেয়, সেটা একটি লক্ষণ। প্রক্রিয়া না হওয়া পর্যন্ত কেন জিজ্ঞেস করতে থাকুন।
- একটি ব্যর্থতার গল্পে লাগে সত্যিকারের ক্ষতি, কারণ হিসেবে আপনার সিদ্ধান্ত, আর fix টিকে থাকার প্রমাণ।
- চাপের মধ্যে যে সংকেতে নম্বর আসে, সেটা triage: তালিকা থেকে কী সরালেন, কতটা শান্ত শোনালেন তা নয়।

## Interview-এর প্রশ্ন

**Q: আপনার সবচেয়ে কঠিন technical সমস্যাটা যদি তেমন চমকপ্রদ না হয়?**

তবুও সেটাই বলুন, আর পদ্ধতি নিয়ে নির্দিষ্ট হোন। ভালোভাবে বলা একটি cache-invalidation bug খারাপভাবে বলা একটি
distributed-systems গল্পের চেয়ে বেশি নম্বর পায়, কারণ interviewer শুধু সেটাতেই নম্বর দিতে পারেন, যা তিনি অনুসরণ
করতে পারেন। যে scale আপনার ছিল না, তার দাবি প্রথম follow-up প্রশ্নেই ভেঙে পড়ে।

**Q: আপনাকে একটি ব্যর্থতার কথা জিজ্ঞেস করা হলো, আর প্রতিটি সত্যিকারের ব্যর্থতায় আংশিক দোষ অন্য কারো ছিল। কী বলবেন?**

নিজের অংশটা নিন, আর শুধু সেটাই বর্ণনা করুন। যেমন: "API contract কোনো নোটিশ ছাড়াই বদলে গিয়েছিল। আমি contract
test ছাড়াই সেটার ওপর build করেছিলাম, আর একটি test যোগ করা আমার কাজ ছিল।" এটা দুই অর্ধেক নিয়েই সৎ, আর উত্তরটা অন্য
পক্ষের পেছনে খরচ করে না।

**Q: কখন debugging থামানোই সঠিক উত্তর?**

যখন চালিয়ে যাওয়ার খরচ workaround-এর চেয়ে বেশি, আর workaround-এর খরচ কত তা আপনি বলতে পারেন। সময়ের চাপে senior
engineer-রা মূল কারণ খুঁজে বের করার চেয়ে প্রায়ই একটি ticket জুড়ে দিয়ে একটি mitigation ship করেন। এটা বলা একটি
শক্তি, যতক্ষণ আপনি বলেন কী পিছিয়ে রাখলেন।

**Q: বেপরোয়া না দেখিয়ে কীভাবে "যে ঝুঁকি কাজে দেয়নি" তার গল্প বলবেন?**

দেখান যে ঝুঁকিটা নেওয়ার আগে সীমিত ছিল: একটি ধাপে ধাপে rollout, একটি flag, একটি rollback plan, আর একটি metric যেটা
বলে দিত এটা ব্যর্থ হচ্ছে। তখন গল্পটা হয় একটি সীমিত পরীক্ষা নিয়ে, যেটা নেতিবাচক ফল দিয়েছে। এটা engineering-এর
একটি স্বাভাবিক ফলাফল, বিচারবুদ্ধির ত্রুটি নয়।

## এরপর কী পড়বেন

- [Chapter ?? — STAR Framework ও Story Bank](#ch-star-framework) — কাঠামো আর সময়ের বাজেট
- [Chapter ?? — Leadership, প্রভাব ও না বলা](#ch-leadership-teamwork) — behavioural loop-এর অন্য অর্ধেক
- [Chapter ?? — কাজের ধরন ও Engineering Culture](#ch-engineering-culture) — blameless post-mortem, যেটা এই অধ্যায়েরই practice রূপ
