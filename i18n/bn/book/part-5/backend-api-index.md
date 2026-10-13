---
sourceHash: "5eeb9d46220839ca2fe762b1c7173096de823c1ff9396249916e051fce64a8cc"
title: "Part V — API Design"
translatedAt: "2026-10-12T12:19:06.258Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — API Design

এই section নিয়ে কড়া মতামত রাখার সবচেয়ে বেশি অধিকার একজন frontend engineer-এর। আপনি বছরের পর বছর এখানে অন্যদের
নেওয়া সিদ্ধান্ত ব্যবহার করে এসেছেন। Client-এর দিকের প্রতিটি অস্বস্তিকর workaround শুরু হয়েছিল একটি API design-এর
সিদ্ধান্ত থেকে: পরপর তিনটি request-এর waterfall, যে pagination একটি row বাদ দিয়ে যায়, যে field কখনো `null` আর
কখনো একেবারেই থাকে না।

প্রথমে এটা contract-টি নিয়ে কথা বলে। তারপর দেখায়, কী একটি কাজ করা endpoint-কে production-এ টিকে থাকার মতো করে
তোলে: client না ভেঙে সেটা বদলানো, একজন caller আপনার কতটা খরচ করাতে পারে তার সীমা টানা, আর client চায়নি এমন data
push করা।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [REST Best Practice ও Versioning](#ch-rest-best-practices) | Docs পড়ার আগেই কি অন্য একজন engineer এই API আন্দাজ করতে পারেন, আর এই পরিবর্তন কি breaking? |
| 02 | [GraphQL, tRPC ও Typed API বাছাই](#ch-graphql) | Contract কোথায় থাকে, আর resolver chain যাতে আপনার database গলিয়ে না ফেলে, তা কীভাবে থামাবেন? |
| 03 | [Rate Limiting](#ch-rate-limiting) | কোন algorithm, আর সেটা প্রতিটি instance জুড়ে কীভাবে কাজ করে? |
| 04 | [Real-Time ও Streaming API](#ch-realtime-streaming) | SSE নাকি একটি socket, আর upgrade করলে কী হারায়? |
| 05 | [Node Service Testing](#ch-testing-node-services) | কী unit test করার মতো, আর একটি আসল database ব্যবহার করেও কীভাবে দ্রুত থাকবেন? |

অধ্যায় 05-এ আছে শুধু একটি Node service-এর নিজস্ব বিষয়গুলো। Testing-এর নিয়মকানুন নিজেই Part IV-তে।

## Interviewer-রা যা যাচাই করেন

এই part-এর senior সংকেত হলো **এমন API design করা, যেটা frontend সত্যিই ভালোভাবে ব্যবহার করতে পারে, আর query কেন
ধীর তা জানা।** API-র অংশটা দেখা যায় এভাবে:

- **আপনি কি আপনার status code-গুলোর পক্ষে যুক্তি দিতে পারেন?** 401 বনাম 403, 404 বনাম 403, আর failure body-তে কী
  থাকে। শুনতে খুঁতখুঁতে লাগে। কিন্তু কেউ API design করেছেন, নাকি শুধু ব্যবহার করেছেন, তা বোঝার এটাই সবচেয়ে দ্রুত
  উপায়।
- **GraphQL-এর N+1 সমস্যা জানেন?** প্রতিটি parent row-এর জন্য আলাদাভাবে resolve হওয়া একটি nested field হলো
  চিরচেনা failure। এরপর প্রত্যাশিত উত্তর হলো DataLoader-এর নাম বলা, বা সাধারণভাবে batching।
- **আপনি কীভাবে paginate করেন?** একসাথে write চলার সময় offset pagination row duplicate করে আর বাদ দেয়। Cursor
  pagination তা করে না। কেন, সেটা জানাই আসল প্রশ্ন।
- **REST নাকি GraphQL — কীসের ভিত্তিতে?** ভালো উত্তর client-এর বৈচিত্র্য, over-fetching, caching আর schema-র
  মালিকানার কথা বলে। "GraphQL বেশি flexible" বললে হয় না।
- **কোথায় rate-limit করেন?** In-process counter দুটি instance হওয়ার মুহূর্তেই ভেঙে যায়।
- **আপনার typed API কি production-এ type-safe?** TypeScript build-এর সময় inference যাচাই করে, আপনার working tree-র
  বিপরীতে। ভালো উত্তর সেই failure-এর নাম বলে, যেখানে deploy করা server client-এর চেয়ে পিছিয়ে থাকে।

## পড়ার ক্রম

আগে 01 পড়ুন। বাকি section যে শব্দগুলো ব্যবহার করে, সেগুলো এটাই ঠিক করে দেয়। তারপর 02 পড়ুন। শেষের তিনটি
operational বা পরিস্থিতিনির্ভর, তাই দরকার না হওয়া পর্যন্ত অপেক্ষা করতে পারে।

**Interview sprint:** 01 → 02 → 03.
