---
sourceHash: "c1355996dec00223938f242dc3927b18fd9dacee6f3fb31846bef7d8dea4c97d"
title: "Part VI — Case Study"
translatedAt: "2026-10-12T12:24:37.903Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — Case Study

তিনটি সম্পূর্ণ round: একটি backend ধাঁচের, দুটি frontend ধাঁচের। প্রতিটি আলাদা একটি **ধরনের** সমস্যা, আলাদা
কোনো product নয়। Interviewer একশোটা product-এর যেকোনোটা চাইতে পারেন। কিন্তু সেগুলোর নিচে আছে মাত্র এক ডজনের
মতো ধরন।

এগুলো timer চালিয়ে জোরে জোরে বলে পড়ুন। যে case study আপনি শুধু পড়েছেন, তার দাম খুবই কম। যে case study আপনি
চল্লিশ মিনিট ধরে মুখে বলে শেষ করেছেন, তার দাম পুরো অংশটার সমান।

## অধ্যায়গুলো

| #  | অধ্যায় | যে ধরনটা শেখায় |
| -- | ------- | -------------------- |
| 01 | [একটি URL Shortener Design করুন](#ch-design-url-shortener) | কোনো coordination ছাড়া key তৈরি করুন; বিপুল পরিমাণ read cache থেকে serve করুন |
| 02 | [একটি Collaborative Document Editor Design করুন](#ch-design-collaborative-editor) | Lock ছাড়া convergence — CRDT, offline merge, shared undo |
| 03 | [একটি Infinite Feed Design করুন](#ch-design-infinite-feed) | দুটি budget — কত byte fetch হলো, আর কতগুলো DOM node রাখা হলো |

বাকিগুলো যে ধরনগুলোতে গিয়ে দাঁড়ায়, এই তিনটি সেগুলো cover করে: একটি read-heavy key–value service, এমন shared
state যাকে converge করতেই হবে, আর একটি render budget-ওয়ালা client।

প্রতিটি অধ্যায় তার `How It Works` অংশের ভেতরে RADIO মেনে চলে: requirement, architecture, data model, interface,
optimisation। Framework-টি নিজে আছে [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)-এ।
একটি ধরন এই অংশে নেই: retrieval-ভিত্তিক AI product, যেটা "একটি RAG system design করুন" হিসেবে জিজ্ঞেস করা হয়।
সেটা করা হয়েছে [Chapter ?? — Interview-এ AI](#ch-ai-in-interviews)-এ।

## Interviewer-রা যা যাচাই করেন

- **আঁকার আগে কি scope ঠিক করেন?** এখানকার প্রতিটি অধ্যায় requirement-এর ধাপে জোরে বলে দেয় কী বাদ দিল।
  এটা ইচ্ছাকৃত।
- **আসল মজার সিদ্ধান্তে কি পৌঁছান?** প্রতিটি design-এ একটি করে আছে: key generation, merge rule, render budget।
  যে round কখনো সেখানে পৌঁছায় না, তার score খারাপ হয়, diagram যত গোছানোই হোক।
- **আপনার design কী পারে না, সেটা কি বলতে পারেন?** Tombstone যা কখনো যায় না, footer যেটা infinite feed-এর কারণে
  আর পৌঁছানো যায় না। কোনো সীমা নেই এমন ভান করার চেয়ে সীমার নাম বলা অনেক শক্তিশালী।

## পড়ার ক্রম

আগে 01 পড়ুন। এটা সবচেয়ে ছোট সম্পূর্ণ round, আর structure-টা স্বয়ংক্রিয় না হওয়া পর্যন্ত এটাই rehearse করবেন।
তারপর 02 আর 03, যেকোনো ক্রমে। এরা একে অপরের ওপর নির্ভর করে না।

**Interview sprint:** 01, আর 02–03-এর মধ্যে যেটা role-এর সবচেয়ে কাছাকাছি, জোরে বলে, প্রতিটি 45 মিনিটের timer-এ।

> ⚠️ **তিনটি study, ইচ্ছা করেই।** পরিচিত prompt-গুলো (news feed, chat, ticketing, একটি live dashboard) এই তিনটির
> শেখানো ধরনগুলোই আবার ব্যবহার করে। এই তিনটি স্বয়ংক্রিয় মনে হওয়ার পর একই structure দিয়ে ওগুলো rehearse করুন।
