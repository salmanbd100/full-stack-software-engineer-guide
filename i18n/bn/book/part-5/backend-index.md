---
sourceHash: "2b923ad161f5c5f85a03fb01bd3158964027f8cd1d62ad35e7d1438ad76ca981"
title: "Part V — Frontend Engineer-দের জন্য Backend"
translatedAt: "2026-10-17T13:59:11.327Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — Frontend Engineer-দের জন্য Backend

এই বই frontend-heavy, কিন্তু শুধু frontend নিয়ে নয়। Part V-এর পরিধি ঠিক হয় একটি প্রশ্ন দিয়ে: **একজন frontend-heavy
full stack engineer-কে আসলে কী জিজ্ঞেস করা হয়, আর তিনি আসলে কী বানান?** উত্তর হলো Node-এর event loop আর Express।
REST, GraphQL আর typed contract। আর এতটুকু SQL, যাতে schema design করতে পারেন আর query plan পড়তে পারেন। JWT নাকি
session, সেই প্রশ্ন, আর streaming endpoint। 2023-এর তুলনায় streaming এখন অনেক বেশি জরুরি, কারণ Part VII-এর AI
feature-গুলো default হিসেবেই stream করে।

পুরো backend career এক part-এ ধরানো হয়নি। Message broker-এর কোনো section নেই, distributed transaction-এর কোনো
অধ্যায় নেই, service mesh-ও নেই। ওগুলো অন্য পাঠকের জন্য। এখানে আছে সেই অংশটুকু, যেটা frontend engineer নিজে সামলান
বা যা নিয়ে backend team-এর সঙ্গে দর-কষাকষি করেন। আর আছে ঠিক ততটা গভীরে, যতটা senior interview-এ খোঁচানো হয়।

## Section-গুলো

| Section | অধ্যায় | কী নিয়ে |
| ------- | -------- | -------------- |
| [Node.js](#ch-backend-nodejs-index) | 3 | Event loop আর error, performance আর stream, Express আর edge runtime |
| [API Design](#ch-backend-api-index) | 5 | REST আর versioning, GraphQL আর tRPC, rate limiting, real-time, service-এর testing |
| [SQL ও Relational Data](#ch-part-sql-and-relational-data) | 3 | Schema design, index, plan আর ORM, transaction |
| [NoSQL ও Caching](#ch-backend-nosql-index) | 1 | Non-relational store বাছাই: document আর Redis |
| [Security](#ch-backend-security-index) | 3 | Credential, session, CORS আর CSRF, OAuth আর authorisation, validation |

`Backend/DesignPatterns/`-ও এই tree-তেই থাকে, তবে সেটা **Part I**-এর অংশ। Pattern হলো ভাষার বিষয়, backend-এর নয়।
তাই `scripts/lib/book.ts` এগুলোকে Part I-এ রাখে।

## Interviewer-রা যা যাচাই করেন

এই part-এ senior-এর লক্ষণ হলো: **এমন API design করেন, যা frontend সত্যিই ভালোভাবে ব্যবহার করতে পারে, আর জানেন query
কেন ধীর।** দুটি অংশই জরুরি, অথচ বেশিরভাগ candidate-এর থাকে একটি:

- **এমন endpoint বানাতে পারেন কি, যার চারপাশে client-কে ঘুরপথ খুঁজতে হবে না?** দরকারের বেশি data আনা, বারবার round-trip,
  আর নতুন row ঢুকলেই ভেঙে পড়া pagination, এগুলো সবই API design-এর ব্যর্থতা। আর সবগুলোর ধাক্কা লাগে frontend-এ।
  আপনি নিজে এর ভুক্তভোগী ছিলেন। এখানে সেটাই আপনার সুবিধা, কাজে লাগান।
- **Event loop-কে একটি সীমা হিসেবে বোঝেন কি?** Thread একটিই। বড় body-র JSON synchronous ভাবে parse করলে process-এর
  বাকি সব request আটকে যায়। Node-এর এই প্রশ্ন দিয়েই বোঝা যায়, কে service চালিয়েছেন আর কে শুধু লিখেছেন।
- **Query plan পড়তে পারেন কি?** মুখস্থ থেকে optimise করা নয়। Plan পড়ে সমস্যার line-টা আঙুল দিয়ে দেখানো। অনুমান
  করার আগে `EXPLAIN ANALYZE` চালালেই এর বেশিরভাগ উত্তর পেয়ে যান।
- **Token কোথায় থাকে, আর কেন?** Auth নিয়ে সবচেয়ে বেশি আসে session নাকি JWT, এই প্রশ্ন। উত্তরটা পছন্দের ব্যাপার
  নয়, একটি trade-off: revocation বনাম scale।

**একই প্রশ্নে mid আর senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "REST নাকি GraphQL?" | "GraphQL, ওটা বেশি flexible" | "Client কয়টি, তাদের data-র দরকার কতটা আলাদা, schema-র মালিক কে, আর HTTP caching-এর কী হবে" |
| "এই endpoint ধীর" | "একটা index যোগ করুন" | "আগে `EXPLAIN ANALYZE`। এই যে plan-এর এই line-টাই সমস্যা" |
| "Session নাকি JWT?" | "JWT, ওটা stateless" | "Stateless হলে scale করে, কিন্তু revoke করা যায় না। সিদ্ধান্ত হয় এই trade-off দিয়েই, আর refresh-token rotation দিয়ে তার কিছুটা ফেরত পাওয়া যায়" |

## পড়ার ক্রম

`NodeJS/` → `API/` → `SQL/` → `Security/`। বিষয়গুলো এই ক্রমেই একটির ওপর আরেকটি দাঁড়ায়। Full stack interview-এর
loop-ও মোটামুটি এই ক্রমে প্রশ্ন করে। `NoSQL/` আলাদা, তাই যখন দরকার তখন পড়ুন।

**Interview sprint:** `NodeJS/01` (event loop), `NodeJS/03` (Express), `API/01` (REST) আর `API/02` (GraphQL),
`SQL/02` (index), `Security/01` (credential আর session)। Frontend-heavy full stack interview-এ backend নিয়ে যা
জিজ্ঞেস করা হয়, তার বেশিরভাগই আছে এই ছয়টিতে।
