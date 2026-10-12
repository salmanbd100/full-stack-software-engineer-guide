---
sourceHash: "1622238b4e88d1b2d1939ffe65ba0196bf9d1c079c77bf0eddb3dff03b5efcd4"
title: "Part VI — System Design"
translatedAt: "2026-10-12T12:23:11.241Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — System Design

বেশিরভাগ senior candidate এই round-টাতেই হারেন, আর এটার জন্যই সবচেয়ে কম প্রস্তুতি নেন। Part VI আগে শব্দভান্ডার
শেখায়, তারপর component, তারপর দুই ধরনের round, যেগুলো একজন frontend-heavy engineer-এর সামনে আসে: একটি backend-ধাঁচের
case study, আর একটি frontend-ধাঁচের।

এই ভারসাম্যটা জরুরি। প্রচলিত system design-এর material পুরোটাই backend: URL ছোট করুন, একটি feed design করুন, একটি
database shard করুন। কিন্তু এই পাঠককে একটি collaborative editor, একটি infinite feed, বা পঞ্চাশটি live widget সহ একটি
dashboard-এর কথাও জিজ্ঞেস করা হয়। ওই round-গুলোর নিজস্ব শব্দভান্ডার আছে, আর সেটা থাকে `Frontend/`-এ।

## Section-গুলো

| Section                                              | অধ্যায় | কী কভার করে                                                    |
| ----------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| [Fundamentals](#ch-part-system-design-fundamentals)             | 4        | Round চালানো, estimation, scaling আর latency, reliability আর consistency |
| [Building Block](#ch-part-system-design-building-blocks)        | 6        | Load balancer, cache, CDN, queue আর socket, boundary আর gateway, resilience |
| [বড় পরিসরে Data](#ch-part-system-design-database)                | 2        | একটি store বাছাই আর replicate করা, sharding আর transaction       |
| [Frontend System Design](#ch-part-frontend-system-design)       | 3        | Real-time client, offline-first, authentication                  |
| [Case Study](#ch-part-system-design-case-studies)              | 3        | সমাধান করা উত্তর — একটি backend-ধাঁচের, দুটি frontend-ধাঁচের          |

## RADIO Framework

এখানকার প্রতিটি case study একই পাঁচটি ধাপ মেনে চলে, কারণ interviewer উত্তরের মতোই process-কেও নম্বর দেন।

| ধাপ               | আপনি কী করেন                                             | সময়      |
| ------------------ | -------------------------------------------------------- | --------- |
| **R**equirements   | Functional, non-functional, আর scale-এর সংখ্যাগুলো        | 8–10 min  |
| **A**rchitecture   | Box আর arrow, একটি নির্দিষ্ট স্তরের detail-এ             | 10–12 min |
| **D**ata model     | মূল entity, তাদের key, আর প্রতিটির পেছনের store     | 6–8 min   |
| **I**nterface      | জরুরি parameter সহ তিন-চারটি operation | 4–6 min   |
| **O**ptimisations  | Scaling-এর lever, আর প্রতিটির দাম কী              | 10–15 min |

পুরো walkthrough আছে [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)-এ।

## Interviewer-রা যা যাচাই করেন

এই part-এর senior সংকেত হলো **round-টি নিজে চালানো — requirement স্পষ্ট করা, assumption বলা, trade-off-এর পক্ষে
যুক্তি দেওয়া।** লক্ষ করুন, ওই তালিকায় কী নেই: "সঠিক" architecture-এ পৌঁছানো। দুটো অভ্যাস এটা বয়ে নিয়ে যায়।
প্রথমত, আপনার assumption জোরে বলুন, যাতে interviewer সহজেই আপনাকে শুধরে দিতে পারেন। দ্বিতীয়ত, estimate করুন:
queries per second, বছরে storage আর bandwidth একটি diagram-কে একটি design-এ পরিণত করে।

**একই প্রশ্নে mid নাকি senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "একটি feed design করুন" | প্রথম মিনিটেই box আঁকতে শুরু করেন | কিছু আঁকার আগে: "কতজন user, read-to-write ratio কত, আর feed কি সময়ের ক্রমে নাকি rank করা?" |
| "আপনি কি এটা cache করবেন?" | "হ্যাঁ, Redis দিয়ে" | "হ্যাঁ — আর এই হলো invalidation-এর trigger, কতটা পুরনো data আমরা সহ্য করতে পারি, আর cold cache-এ কী হয়" |
| "কোন database?" | "Postgres, এটা নির্ভরযোগ্য" | আগে access pattern, তারপর বাছাই — আর pattern আলাদা হলে উত্তর কী হতো, সেটাও |

## পড়ার ক্রম

Fundamentals, তারপর Building Blocks, তারপর যে round আশা করছেন, সেই অনুযায়ী ভাগ হয়ে যান। Frontend-heavy পাঠকদের এরপর
Frontend System Design-এ যাওয়া উচিত, আর Data at Scale-কে গভীরতার জন্য রাখা উচিত। তারপর case study দিয়ে অনুশীলন করুন,
জোরে বলে, একটি timer ধরে।

**Interview sprint:** [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)
(framework, দুই ধরনের round-ই), [Chapter ?? — Back-of-Envelope Estimation](#ch-back-of-envelope-estimation),
Building Blocks-এর প্রথম চারটি অধ্যায়, তারপর শুরু থেকে শেষ পর্যন্ত দুটি case study।

> ⚠️ **System design-এর কিছু বিষয় বইয়ের অন্য জায়গায় আছে।** Authorisation, encryption at rest আর SSRF আছে Part V-এর
> security অধ্যায়গুলোতে। Deployment আর distributed tracing আছে Part VIII-এ। এই part শুধু সেটুকু রাখে, যা একটি design
> round আপনাকে সত্যিই আঁকতে বলে।
