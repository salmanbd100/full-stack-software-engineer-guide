---
sourceHash: "5eeb9d46220839ca2fe762b1c7173096de823c1ff9396249916e051fce64a8cc"
title: "Part V — API Design"
translatedAt: "2026-10-17T13:59:11.759Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — API Design

এই section নিয়ে জোরালো মত রাখার সবচেয়ে বেশি অধিকার frontend engineer-এর। বছরের পর বছর আপনি অন্যের নেওয়া
সিদ্ধান্তগুলোই ব্যবহার করে এসেছেন। Client-এ যত অস্বস্তিকর ঘুরপথ লিখেছেন, প্রতিটির শুরু কোনো API design-এর সিদ্ধান্ত
থেকে: পরপর তিনটি request-এর waterfall, যে pagination একটি row বাদ দিয়ে যায়, যে field কখনো `null` আর কখনো একেবারেই
থাকে না।

প্রথমে আসে contract নিজে। তারপর আসে সেই সব জিনিস, যা চলা endpoint-কে production-এ টিকিয়ে রাখে: client না ভেঙে
endpoint বদলানো, একজন caller আপনার কতটা খরচ করাতে পারবে তার সীমা টানা, আর client না চাইলেও তার কাছে data পাঠানো।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [REST Best Practice ও Versioning](#ch-rest-best-practices) | Docs না পড়েই কি আরেকজন engineer এই API আন্দাজ করতে পারবেন, আর এই বদলটা কি breaking? |
| 02 | [GraphQL, tRPC ও Typed API বাছাই](#ch-graphql) | Contract থাকে কোথায়, আর resolver chain যাতে database গলিয়ে না দেয়, তা কীভাবে আটকাবেন? |
| 03 | [Rate Limiting](#ch-rate-limiting) | কোন algorithm, আর সব instance জুড়ে সেটা কীভাবে কাজ করে? |
| 04 | [Real-Time ও Streaming API](#ch-realtime-streaming) | SSE নাকি socket, আর upgrade করলে কী কী হারান? |
| 05 | [Node Service Testing](#ch-testing-node-services) | কোনটা unit test করার মতো, আর আসল database ব্যবহার করেও কীভাবে দ্রুত থাকবেন? |

অধ্যায় 05-এ আছে শুধু Node service-এর নিজস্ব দিকগুলো। Testing-এর নিয়মকানুন নিজে আছে Part IV-এ।

## Interviewer-রা যা যাচাই করেন

এই part-এ senior-এর লক্ষণ হলো: **এমন API design করেন, যা frontend সত্যিই ভালোভাবে ব্যবহার করতে পারে, আর জানেন query
কেন ধীর।** API-র দিকটা ধরা পড়ে এভাবে:

- **নিজের status code-এর পক্ষে যুক্তি দিতে পারেন কি?** 401 বনাম 403, 404 বনাম 403, আর failure body-তে কী থাকে।
  শুনতে খুঁতখুঁতে লাগে। তবু কেউ API design করেছেন নাকি শুধু ব্যবহার করেছেন, সেটা বোঝার সবচেয়ে দ্রুত উপায় এটাই।
- **GraphQL-এর N+1 সমস্যা জানেন কি?** প্রতিটি parent row-এর জন্য আলাদা করে resolve হওয়া nested field হলো চেনা
  ব্যর্থতা। পরের প্রশ্নে আশা করা হয় DataLoader-এর নাম, বা সাধারণভাবে batching।
- **Pagination কীভাবে করেন?** একসঙ্গে write চলতে থাকলে offset pagination row duplicate করে, row বাদও দেয়। Cursor
  pagination তা করে না। কেন করে না, সেটাই আসল প্রশ্ন।
- **REST নাকি GraphQL, কীসের ভিত্তিতে?** নম্বর পাওয়া উত্তর বলে client কতটা বৈচিত্র্যময়, over-fetching, caching আর
  schema-র মালিকানার কথা। "GraphQL বেশি flexible" বললে নম্বর আসে না।
- **Rate-limit কোথায় করেন?** Process-এর ভেতরের counter ভেঙে যায় যখনই instance দুটি হয়।
- **আপনার typed API কি production-এও type-safe?** TypeScript inference যাচাই করে build-এর সময়, আপনার working tree
  ধরে। নম্বর পাওয়া উত্তর সেই failure-এর নাম বলে, যেখানে deploy হওয়া server client-এর চেয়ে পিছিয়ে থাকে।

## পড়ার ক্রম

আগে 01 পড়ুন। বাকি section যে শব্দগুলো ব্যবহার করে, সেগুলো ওখানেই ঠিক হয়। তারপর 02। শেষের তিনটি operational বা
পরিস্থিতির ওপর নির্ভর করে, তাই দরকার না পড়া পর্যন্ত রেখে দিতে পারেন।

**Interview sprint:** 01 → 02 → 03।
