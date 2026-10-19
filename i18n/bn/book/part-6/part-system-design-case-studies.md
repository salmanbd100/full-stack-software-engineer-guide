---
sourceHash: "c1355996dec00223938f242dc3927b18fd9dacee6f3fb31846bef7d8dea4c97d"
title: "Part VI — Case Study"
translatedAt: "2026-10-19T07:54:02.545Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — Case Studies

তিনটি সমাধান করা round: একটি backend ধাঁচের, দুটি frontend ধাঁচের। প্রতিটি আলাদা product নয়, আলাদা **ধাঁচের**
সমস্যা। Interviewer একশোটা product-এর যেকোনোটা চাইতে পারেন, কিন্তু সেগুলোর নিচে ধাঁচ আছে মাত্র এক ডজনের মতো।

Timer চালিয়ে জোরে জোরে পড়ুন। শুধু পড়ে যাওয়া case study-র দাম খুব সামান্য। চল্লিশ মিনিট ধরে মুখে বলে
শেষ করা একটা case study-র দাম পুরো অংশটার সমান।

## অধ্যায়গুলো

| #  | অধ্যায় | যে ধাঁচ শেখায় |
| -- | ------- | -------------------- |
| 01 | [একটি URL Shortener Design করুন](#ch-design-url-shortener) | কোনো coordination ছাড়া key বানানো; বিপুল read cache থেকে দেওয়া |
| 02 | [একটি Collaborative Document Editor Design করুন](#ch-design-collaborative-editor) | Lock ছাড়া সবার এক জায়গায় পৌঁছানো — CRDT, offline merge, shared undo |
| 03 | [একটি Infinite Feed Design করুন](#ch-design-infinite-feed) | দুটি budget — কত byte আনা হলো, আর কতগুলো DOM node রাখা হলো |

বাকি সব সমস্যা শেষ পর্যন্ত এই তিনটি ধাঁচেই নেমে আসে: read-বেশি key–value service, এমন shared state যাকে
শেষে এক জায়গায় মিলতে হবে, আর render budget-ওয়ালা একটা client।

প্রতিটি তার `How It Works` অংশে RADIO মেনে চলে: requirements, architecture, data model, interface,
optimisations। Framework-টা নিজে আছে [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)-এ।
একটা ধাঁচ এই অংশে নেই: retrieval-ভিত্তিক AI product, যা জিজ্ঞেস করা হয় "একটা RAG system design করুন" বলে।
সেটা সমাধান করা আছে [Chapter ?? — Interview-এ AI](#ch-ai-in-interviews)-এ।

## Interviewer-রা যা যাচাই করেন

- **আঁকার আগে scope ঠিক করেন?** এখানকার প্রতিটি অধ্যায় requirements ধাপেই জোরে বলে দেয় কী বাদ দেওয়া হলো।
  এটা ইচ্ছে করেই।
- **আসল সিদ্ধান্তটা পর্যন্ত পৌঁছান?** প্রতিটি design-এ একটা করে আছে: key তৈরি, merge-এর নিয়ম, render budget।
  যে round সেখানে পৌঁছায় না, তার diagram যত পরিপাটিই হোক, নম্বর খারাপ আসে।
- **আপনার design কী পারে না, সেটা বলতে পারেন?** যে tombstone কখনো যায় না, infinite feed যে footer-এ পৌঁছানো
  অসম্ভব করে দেয়। সীমা নেই বলে ভান করার চেয়ে সীমাটা নাম ধরে বলা অনেক জোরালো।

## পড়ার ক্রম

আগে 01 পড়ুন। এটা সবচেয়ে ছোট পূর্ণাঙ্গ round, আর কাঠামোটা মুখস্থ না হওয়া পর্যন্ত এটাই বারবার অভ্যাস করবেন।
তারপর 02 আর 03, যেকোনো ক্রমে। দুটি একে অন্যের ওপর নির্ভর করে না।

**Interview sprint:** 01, আর 02–03-এর মধ্যে যেটা role-এর সবচেয়ে কাছের। জোরে বলে, প্রতিটি 45 মিনিটের timer-এ।

> ⚠️ **তিনটি study, ইচ্ছে করেই।** চেনা প্রশ্নগুলো (news feed, chat, ticketing, live dashboard) এই তিনটির শেখানো
> ধাঁচই আবার ব্যবহার করে। এই তিনটি সহজাত লাগতে শুরু করলে ওগুলোও একই কাঠামোয় অভ্যাস করুন।
