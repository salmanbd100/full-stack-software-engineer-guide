---
sourceHash: "2faf7036be367d7e8ae51437a99dcf6e00d2541091f9ecf03e30e8fabc808753"
title: "Part V — Node.js"
translatedAt: "2026-10-17T13:59:11.540Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — Node.js

Frontend-heavy engineer-কে সবচেয়ে গভীরে যে runtime নিয়ে প্রশ্ন করা হতে পারে, সেটা Node। এখানে আপনার চেনা ভাষা
একেবারে আলাদা এক execution model-এর মুখোমুখি হয়। প্রশ্নগুলো API নিয়ে নয়। প্রশ্ন হলো, আপনার request যখন বড় একটি
JSON body parse করছে, তখন বাকি নয়শো request-এর কী হচ্ছে।

এই section প্রথমে দেখায় runtime কীভাবে চলে আর error কীভাবে সামলায়। তারপর দেখায় একাধিক core কীভাবে কাজে লাগাবেন।
শেষে আসে সেই framework, যাতে বেশিরভাগ service লেখা হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Node.js Event Loop, Async ও Error](#ch-event-loop-async) | একটি thread হাজার হাজার connection কীভাবে সামলায়, আর কোন failure-এ process restart করবেন? |
| 02 | [Node.js Performance, Stream ও Scaling](#ch-nodejs-performance) | 400 ms গেল কোথায়, যে data memory-তে ধরে না সেটা কীভাবে সরাবেন, আর একাধিক loop কি লাগবে? |
| 03 | [Express, Hono ও Edge Runtime](#ch-express) | দীর্ঘক্ষণ চলা Node server, নাকি edge-এ চলা Web-standard handler? |

## Interviewer-রা যা যাচাই করেন

- **Microtask-এর ক্রম।** `setTimeout` বনাম `setImmediate` বনাম `process.nextTick`। ভরসাযোগ্য উত্তর মুখস্থ output
  বলে না, loop-এর phase-গুলোর নাম ধরে ব্যাখ্যা করে।
- **Blocking দেখতে কেমন।** পুরো পরীক্ষাটাই হলো একটি line দেখিয়ে বলা, "এটা বাকি সব request আটকে দেয়"।
- **Backpressure।** `write()`-এর return value উপেক্ষা করলে এমন memory leak হয়, যার কোনো সীমা নেই। বেশিরভাগ
  candidate-কে কখনো এটা জানতে হয়নি, তাই interviewer-রা জিজ্ঞেস করেন।
- **Operational error বনাম programmer error।** Uncaught exception-এর পরে process চালু রাখবেন কি না, আর কেন রাখা
  উচিত নয়।
- **Statelessness।** Clustering চালু করলেই in-memory session, counter আর cron job ভেঙে যায়। কেউ না বলতেই এই তালিকা
  বলতে পারলে সেটা জোরালো লক্ষণ।

## পড়ার ক্রম

সবসময় আগে 01 পড়ুন, কারণ পরের প্রতিটি অধ্যায় ধরে নেয় সেটা আপনি জানেন। 02 আর 03 একটি আরেকটির ওপর নির্ভর করে না।

**Interview sprint:** 01 → 03 → 02।
