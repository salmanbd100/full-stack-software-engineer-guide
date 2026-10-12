---
sourceHash: "ffcc1fa92809332f266d567f88970509e8372851ea0b68cc84133a50ee61e845"
title: "Rendering"
translatedAt: "2026-10-12T07:53:36.175Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Rendering

এই section-টাই বইটাকে 2027-এর পরেও টিকিয়ে রাখে। Framework বদলায়। Rendering model বদলায় না। এখানে পাঁচটি অধ্যায়,
আর কোনো অধ্যায়ের শিরোনামে কোনো framework-এর নাম নেই। এগুলো এমন একটি সিদ্ধান্ত নিয়ে, যেটা প্রতিটি senior frontend
engineer-কে নিতে হয় আর তার পক্ষে যুক্তি দিতে হয়: কী কোথায় চলে, আর কখন।

মূল ধারণাটা অধ্যায় 03-এর যুক্তি: **rendering প্রতিটি route-এর সিদ্ধান্ত, পুরো application-এর একটি সিদ্ধান্ত নয়।**
একটি marketing page, logged-in একটি dashboard আর একটি search result-এর তিনটি আলাদা উত্তর। যে codebase এদের একটি
উত্তর দেয়, সে অন্তত দুটোর জন্য ভুল বেছেছে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                      | কোন প্রশ্নের উত্তর দেয়                                               |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)            | CSR, SSR, SSG, ISR, PPR, islands — প্রতিটি কী করে, আর HTML পৌঁছানোর পর browser কী দাম দেয়? |
| 02 | [Streaming HTML](#ch-streaming-html)                                       | একটি response কীভাবে টুকরো টুকরো হয়ে আসে, আর তাতে কী লাভ?          |
| 03 | [প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) | এই route-এর কোন strategy দরকার, একটি crawler-এর কী দরকার, আর কীভাবে এর পক্ষে যুক্তি দেবেন? |
| 04 | [Edge বনাম Origin Rendering](#ch-edge-vs-origin-rendering)                  | এটা কোথায় চলা উচিত, আর কখন edge ভুল উত্তর?                          |
| 05 | [Meta-Framework বাছাই](#ch-choosing-a-meta-framework)                       | Framework আপনার হয়ে কোন সিদ্ধান্তগুলো নেয়, আর কোনগুলো স্থায়ী হয়ে যায়?   |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, rendering নিয়ে দুটো প্রশ্ন:

- **"আপনার LCP 4.2 সেকেন্ড। কোথায় খুঁজবেন?"** একটি ভালো উত্তর metric-গুলোকে আলাদা করে। TTFB হলো server আর network-এর
  সমস্যা। FCP হলো streaming আর blocking resource-এর সমস্যা। LCP সাধারণত একটি image বা একটি font। যে candidate-রা
  "SSR যোগ করুন" বলেন, তাঁরা বোঝেননি কোন সংখ্যাটা নড়েছে।
- **"কখন edge ভুল পছন্দ?"** যখন data সেখানে নেই। Virginia-র একটি database-এর বিপরীতে Sydney-তে render করলে একটি ধীর
  round trip কয়েকটিতে পরিণত হয়। Compute কাছে থাকার চেয়ে data কাছে থাকা বেশি জরুরি। কথাটা জোরে বলাই একটি শক্তিশালী
  senior signal।

## পড়ার ক্রম

সবসময় আগে 01 পড়ুন। এটা সেই শব্দভান্ডার দেয়, যেটা Part III-এর বাকি প্রতিটি অধ্যায় ধরে নেয়, React আর Next.js-এর
অধ্যায়গুলোও। তারপর 02 পড়ুন, যেটা ব্যাখ্যা করে 01-এর strategy-গুলো কীভাবে browser-এ পৌঁছায়। অধ্যায় 03 হলো আসল
প্রাপ্তি, তাই দুটোর পরে এটা পড়ুন।

অধ্যায় 04 আর 05 স্বতন্ত্র। প্রশ্নটা যখন উঠবে, তখন পড়ুন।

**Interview sprint:** 01 → 03। বিশ মিনিট, আর পুরো part-এ যেকোনো জোড়ার চেয়ে এর লাভ সবচেয়ে বেশি।
