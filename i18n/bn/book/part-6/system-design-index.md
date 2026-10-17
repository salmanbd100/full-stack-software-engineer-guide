---
sourceHash: "1622238b4e88d1b2d1939ffe65ba0196bf9d1c079c77bf0eddb3dff03b5efcd4"
title: "Part VI — System Design"
translatedAt: "2026-10-17T13:59:04.845Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — System Design

বেশিরভাগ senior candidate এই round-এই হারেন, অথচ প্রস্তুতি নেন সবচেয়ে কম। Part VI আগে শব্দভাণ্ডার শেখায়, তারপর
component-গুলো। শেষে আসে সেই দুই ধরনের round, যা একজন frontend-heavy engineer-এর সামনে পড়ে: backend ধাঁচের একটি
case study, আর frontend ধাঁচের একটি।

এই ভারসাম্যটা জরুরি। System design-এর প্রচলিত লেখা পুরোটাই backend নিয়ে: URL ছোট করা, feed design করা, database
shard করা। কিন্তু এই বইয়ের পাঠককে collaborative editor, infinite feed, কিংবা পঞ্চাশটি live widget-ওয়ালা
dashboard-ও design করতে বলা হয়। সেই round-গুলোর নিজস্ব শব্দভাণ্ডার আছে, আর তা থাকে `Frontend/`-এ।

## অংশগুলো

| অংশ | অধ্যায় | কী নিয়ে |
| --- | ------ | ------- |
| [Fundamentals](#ch-part-system-design-fundamentals) | 4 | Round চালানো, estimation, scaling আর latency, reliability আর consistency |
| [Building Block](#ch-part-system-design-building-blocks) | 6 | Load balancer, cache, CDN, queue আর socket, boundary আর gateway, resilience |
| [বড় পরিসরে Data](#ch-part-system-design-database) | 2 | Store বেছে নেওয়া আর replicate করা, sharding আর transaction |
| [Frontend System Design](#ch-part-frontend-system-design) | 3 | Real-time client, offline-first, authentication |
| [Case Study](#ch-part-system-design-case-studies) | 3 | পুরো করে দেখানো উত্তর: একটি backend ধাঁচের, দুটি frontend ধাঁচের |

## RADIO Framework

এখানকার প্রতিটি case study একই পাঁচটি ধাপ মেনে চলে। কারণ interviewer উত্তরের মতোই পদ্ধতিকেও নম্বর দেন।

| ধাপ | কী করবেন | সময় |
| --- | ------- | ---- |
| **R**equirements | Functional, non-functional, আর scale-এর সংখ্যাগুলো | 8–10 min |
| **A**rchitecture | Box আর arrow, একই স্তরের detail-এ | 10–12 min |
| **D**ata model | মূল entity, তাদের key, আর প্রতিটির পেছনের store | 6–8 min |
| **I**nterface | তিন-চারটি operation, যে parameter-গুলো আসলে গুরুত্বপূর্ণ সেগুলোসহ | 4–6 min |
| **O**ptimisations | Scale করার উপায়গুলো, আর প্রতিটির দাম | 10–15 min |

পুরো ধাপে ধাপে বিবরণ আছে [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)-এ।

## Interviewer-রা যা যাচাই করেন

এই part-এ senior হওয়ার লক্ষণ হলো **round-টা নিজে চালানো: requirement পরিষ্কার করা, assumption বলে দেওয়া, trade-off-এর
পক্ষে যুক্তি দেওয়া।** খেয়াল করুন, তালিকায় কী নেই: "সঠিক" architecture-এ পৌঁছানো। দুটি অভ্যাসই কাজটা করে দেয়। প্রথমত,
assumption-গুলো জোরে বলুন, যাতে interviewer সহজেই শুধরে দিতে পারেন। দ্বিতীয়ত, estimate করুন। প্রতি সেকেন্ডে কতটি
query, বছরে কত storage, কত bandwidth: এই সংখ্যাগুলোই একটি diagram-কে design বানায়।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ----------- | -------------- |
| "একটি feed design করুন" | প্রথম মিনিটেই box আঁকা শুরু করেন | কিছু আঁকার আগে জিজ্ঞেস করেন: "User কতজন, read আর write-এর অনুপাত কত, আর feed কি সময়ের ক্রমে, নাকি ranked?" |
| "এটা cache করবেন?" | "হ্যাঁ, Redis দিয়ে" | "হ্যাঁ। Invalidation কোন ঘটনায় হবে, কতটা stale data চলবে, আর cache cold থাকলে কী হবে, সেটাও বলছি" |
| "কোন database?" | "Postgres, ওটা নির্ভরযোগ্য" | আগে access pattern, তারপর পছন্দ। সঙ্গে এটাও যে pattern আলাদা হলে উত্তর কী হতো |

## পড়ার ক্রম

আগে Fundamentals, তারপর Building Blocks। এরপর পথ ভাগ হয়, কোন round আশা করছেন তা দেখে। Frontend-heavy পাঠক এরপর
Frontend System Design পড়ুন, আর Data at Scale-কে গভীরে যাওয়ার অংশ হিসেবে নিন। শেষে case study দিয়ে অনুশীলন করুন:
জোরে বলে, timer চালিয়ে।

**Interview sprint:** [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)
(framework আর দুই ধরনের round), [Chapter ?? — Back-of-Envelope Estimation](#ch-back-of-envelope-estimation),
Building Blocks-এর প্রথম চারটি অধ্যায়, তারপর দুটি case study শুরু থেকে শেষ পর্যন্ত।

> ⚠️ **System design-এর কিছু বিষয় বইয়ের অন্য জায়গায় আছে।** Authorisation, encryption at rest আর SSRF আছে Part V-এর
> security অধ্যায়ে। Deployment আর distributed tracing আছে Part VIII-এ। এই part-এ রাখা হয়েছে শুধু সেটুকু, যা design
> round-এ আসলে আঁকতে বলা হয়।
