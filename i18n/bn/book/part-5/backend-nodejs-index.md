---
sourceHash: "2faf7036be367d7e8ae51437a99dcf6e00d2541091f9ecf03e30e8fabc808753"
title: "Part V — Node.js"
translatedAt: "2026-10-12T12:16:32.830Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — Node.js

Frontend-heavy একজন engineer-কে যে runtime নিয়ে সবচেয়ে গভীরভাবে জিজ্ঞেস করার সম্ভাবনা বেশি, সেটা Node। এখানে আপনার
আগে থেকে জানা ভাষা একটি সত্যিই ভিন্ন execution model-এর মুখোমুখি হয়। প্রশ্নগুলো API নিয়ে নয়। প্রশ্নগুলো হলো, আপনার
request যখন বড় একটি JSON body parse করছে, তখন বাকি নশো request-এর কী হয়।

এই section দেখায় runtime কীভাবে কাজ করে আর error কীভাবে সামলায়। তারপর দেখায় কীভাবে একাধিক core ব্যবহার করতে হয়। শেষে
আসে সেই framework, যেটা দিয়ে বেশিরভাগ service লেখা হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Node.js Event Loop, Async ও Error](#ch-event-loop-async) | একটি thread কীভাবে হাজার হাজার connection সামলায়, আর কোন failure-এ restart করবেন? |
| 02 | [Node.js Performance, Stream ও Scaling](#ch-nodejs-performance) | 400 ms কোথায় গেল, যে data memory-তে ধরে রাখা যায় না তা কীভাবে সরাবেন, আর আপনার কি আরও loop লাগবে? |
| 03 | [Express, Hono ও Edge Runtime](#ch-express) | একটি দীর্ঘজীবী Node server, নাকি edge-এ চলা Web-standard handler? |

## Interviewer-রা যা যাচাই করেন

- **Microtask-এর ক্রম।** `setTimeout` বনাম `setImmediate` বনাম `process.nextTick`। নির্ভরযোগ্য উত্তরটা মুখস্থ output
  আওড়ায় না, loop-এর phase-গুলোর নাম বলে।
- **Blocking দেখতে কেমন।** পুরো পরীক্ষাটা হলো একটি line দেখিয়ে বলা, "এটা বাকি প্রতিটি request আটকে দেয়"।
- **Backpressure।** `write()`-এর return value উপেক্ষা করলে সীমাহীন memory leak হয়। বেশিরভাগ candidate-কে কখনো এটা
  জানতে হয়নি, তাই interviewer-রা জিজ্ঞেস করেন।
- **Operational বনাম programmer error।** Uncaught exception-এর পরে process বাঁচিয়ে রাখবেন কি না, আর কেন রাখা উচিত নয়।
- **Statelessness।** Clustering চালু করলে in-memory session, counter আর cron job ভেঙে যায়। কেউ জিজ্ঞেস না করতেই এই
  list-টা বলতে পারা একটি জোরালো signal।

## পড়ার ক্রম

সবসময় আগে 01 পড়ুন, কারণ পরের প্রতিটি অধ্যায় সেটা ধরে নেয়। 02 আর 03 একে অপরের ওপর নির্ভর করে না।

**Interview sprint:** 01 → 03 → 02।
