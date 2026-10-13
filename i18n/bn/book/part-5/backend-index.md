---
sourceHash: "2b923ad161f5c5f85a03fb01bd3158964027f8cd1d62ad35e7d1438ad76ca981"
title: "Part V — Frontend Engineer-দের জন্য Backend"
translatedAt: "2026-10-12T12:16:32.588Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — Frontend Engineer-দের জন্য Backend

এই বইটা frontend-heavy, শুধু frontend নয়। Part V-এর পরিধি ঠিক করে একটিই প্রশ্ন: **একজন frontend-heavy full stack
engineer-কে আসলে কী জিজ্ঞেস করা হয়, আর তিনি আসলে কী বানান?** উত্তর হলো Node-এর event loop আর Express। REST, GraphQL
আর typed contract, আর একটি schema design করা ও একটি query plan পড়ার মতো যথেষ্ট SQL। JWT বনাম session, আর streaming
endpoint। 2023-এর তুলনায় streaming এখন অনেক বেশি গুরুত্বপূর্ণ, কারণ Part VII-এর AI feature-গুলো default-ভাবেই stream
করে।

এটা এক part-এ পুরো একটি backend career নয়। কোনো message-broker section নেই, distributed-transaction-এর কোনো অধ্যায়
নেই, কোনো service mesh নেই। সেগুলো অন্য পাঠকের জন্য। এখানে যা আছে, তা হলো সেই অংশ যার মালিক একজন frontend engineer,
বা যা নিয়ে তাঁকে দর-কষাকষি করতে হয় — ঠিক সেই গভীরতায়, যতটা একটি senior interview খুঁটিয়ে দেখে।

## Section-গুলো

| Section | অধ্যায় | কী নিয়ে |
| ------- | -------- | -------------- |
| [Node.js](#ch-backend-nodejs-index) | 3 | Event loop আর error, performance আর stream, Express আর edge runtime |
| [API Design](#ch-backend-api-index) | 5 | REST আর versioning, GraphQL আর tRPC, rate limiting, real-time, service-টির testing |
| [SQL ও Relational Data](#ch-part-sql-and-relational-data) | 3 | Schema design, index, plan আর ORM, transaction |
| [NoSQL ও Caching](#ch-backend-nosql-index) | 1 | একটি non-relational store বাছাই: document আর Redis |
| [Security](#ch-backend-security-index) | 3 | Credential, session, CORS আর CSRF, OAuth আর authorisation, validation |

`Backend/DesignPatterns/`-ও এই tree-তে থাকে, কিন্তু এটা **Part I**-এর অংশ। Pattern হলো ভাষার বিষয়, backend-এর বিষয়
নয়, আর `scripts/lib/book.ts` এগুলোকে Part I-এ map করে।

## Interviewer-রা যা যাচাই করেন

এই part-এর senior signal হলো: **এমন API design করেন, যেটা frontend সত্যিই ভালোভাবে ব্যবহার করতে পারে, আর জানেন query কেন
ধীর।** দুটি অর্ধেকই গুরুত্বপূর্ণ, আর candidate-দের সাধারণত একটিই থাকে:

- **এমন একটি endpoint design করতে পারেন, যেটাকে client-এর এড়িয়ে চলতে হবে না?** Over-fetching, বারবার আসা-যাওয়ার
  round-trip, আর এমন pagination যেটা একটি row insert হলে ভেঙে যায় — এগুলো API design-এর ব্যর্থতা। এরা সবাই এসে পড়ে
  frontend-এর ঘাড়ে। আপনি গ্রহীতার দিকে ছিলেন, আর এখানে সেটা একটি সুবিধা — কাজে লাগান।
- **Event loop-কে কি একটি সীমাবদ্ধতা হিসেবে বোঝেন?** একটি thread। বড় একটি body-র synchronous JSON parse process-এর
  বাকি প্রতিটি request আটকে দেয়। Node-এর এই প্রশ্নটাই আলাদা করে তাঁদের, যাঁরা একটি service চালিয়েছেন, তাঁদের থেকে
  যাঁরা শুধু একটি লিখেছেন।
- **একটি query plan পড়তে পারেন?** মুখস্থ থেকে optimise করা নয়। একটি plan পড়ুন, আর যে line-টা সমস্যা, সেটা দেখান।
  অনুমান করার আগে `EXPLAIN ANALYZE` চালালেই এর বেশিরভাগের উত্তর পাওয়া যায়।
- **Token কোথায় থাকে, আর কেন?** Session বনাম JWT হলো সবচেয়ে বেশি জিজ্ঞেস করা auth প্রশ্ন। উত্তরটা একটি trade-off,
  revocation বনাম scale, পছন্দ-অপছন্দ নয়।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "REST নাকি GraphQL?" | "GraphQL, এটা বেশি flexible" | "কতগুলো client, তাদের data-র চাহিদা কতটা আলাদা, schema-র মালিক কে, আর HTTP caching-এর কী হয়" |
| "এই endpoint-টা ধীর" | "একটি index যোগ করুন" | "আগে `EXPLAIN ANALYZE` — আর plan-এর এই line-টাই সমস্যা" |
| "Session নাকি JWT?" | "JWT, এগুলো stateless" | "Stateless scale করে কিন্তু revoke করা যায় না; সিদ্ধান্তটা এই trade-ই নেয়, আর refresh-token rotation দিয়ে তার কিছুটা ফিরে পাওয়া যায়" |

## পড়ার ক্রম

`NodeJS/` → `API/` → `SQL/` → `Security/`। বিষয়গুলো এই ক্রমেই গড়ে ওঠে। মোটামুটি এই ক্রমেই একটি full stack interview
loop এগুলো নিয়ে জিজ্ঞেস করে। `NoSQL/` আলাদা, তাই যখন প্রাসঙ্গিক তখন পড়ুন।

**Interview sprint:** `NodeJS/01` (event loop), `NodeJS/03` (Express), `API/01` (REST) আর `API/02` (GraphQL), `SQL/02`
(index), `Security/01` (credential আর session)। Frontend-heavy full stack interview-এ backend নিয়ে যা জিজ্ঞেস করা হয়,
তার বেশিরভাগই এই ছয়টিতে আছে।
