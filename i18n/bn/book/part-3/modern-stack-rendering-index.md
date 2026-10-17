---
sourceHash: "ffcc1fa92809332f266d567f88970509e8372851ea0b68cc84133a50ee61e845"
title: "Rendering"
translatedAt: "2026-10-17T01:36:36.302Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Rendering

এই section-এর জন্যই বইটা 2027-এর পরেও কাজে লাগবে। Framework বদলায়, rendering model বদলায় না। এখানে পাঁচটি অধ্যায়,
আর কোনো অধ্যায়ের নামে কোনো framework নেই। বিষয় হলো এমন একটি সিদ্ধান্ত, যা প্রত্যেক senior frontend engineer-কে
নিতে হয় আর defend করতে হয়: কী কোথায় চলবে, আর কখন।

মূল ধারণাটা অধ্যায় 03-এর যুক্তি: **rendering-এর সিদ্ধান্ত হয় প্রতিটি route ধরে, পুরো application ধরে নয়।**
Marketing page, log in করা dashboard আর search result, তিনটির উত্তর তিন রকম। যে codebase তিনটিকেই একই উত্তর দেয়,
সেটা অন্তত দুটির জন্য ভুল বেছেছে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                     | কোন প্রশ্নের উত্তর দেয়                                               |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum) | CSR, SSR, SSG, ISR, PPR, islands — প্রতিটি কী করে, আর HTML পৌঁছানোর পর browser-কে কী দাম দিতে হয়? |
| 02 | [Streaming HTML](#ch-streaming-html)                                       | Response কীভাবে টুকরো টুকরো আসে, আর তাতে লাভ কী?                     |
| 03 | [প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) | এই route-এর কোন strategy লাগবে, crawler-এর কী লাগে, আর সেটা কীভাবে defend করবেন? |
| 04 | [Edge বনাম Origin Rendering](#ch-edge-vs-origin-rendering)               | এটা কোথায় চলা উচিত, আর কখন edge ভুল উত্তর?                          |
| 05 | [Meta-Framework বাছাই](#ch-choosing-a-meta-framework)                 | Framework আপনার হয়ে কোন সিদ্ধান্তগুলো নেয়, আর কোনগুলো আর বদলানো যায় না? |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, rendering নিয়ে দুটি প্রশ্ন:

- **"আপনার LCP 4.2 সেকেন্ড। কোথায় খুঁজবেন?"** ভালো উত্তর metric-গুলো আলাদা করে দেখে। TTFB হলো server আর network-এর
  সমস্যা। FCP হলো streaming আর blocking resource-এর সমস্যা। LCP সাধারণত কোনো image বা font। যে candidate বলেন
  "SSR যোগ করুন", তিনি বোঝেননি কোন সংখ্যাটা বদলেছে।
- **"Edge কখন ভুল পছন্দ?"** যখন data সেখানে নেই। Virginia-র database-এর বিপরীতে Sydney-তে render করলে একটি ধীর
  round trip কয়েকটি হয়ে যায়। Compute কাছে থাকার চেয়ে data কাছে থাকা বেশি জরুরি। এটা মুখে বলতে পারাটাই senior-এর
  জোরালো সংকেত।

## পড়ার ক্রম

সবসময় আগে 01 পড়ুন। Part III-এর বাকি সব অধ্যায় এর শব্দগুলো জানা আছে বলে ধরে নেয়, React আর Next.js-এর অধ্যায়গুলোও।
তারপর পড়ুন 02, যেখানে আছে 01-এর strategy-গুলো কীভাবে browser-এ পৌঁছায়। অধ্যায় 03-এ সব মিলে যায়, তাই সেটা পড়ুন
দুটির পরে।

অধ্যায় 04 আর 05 আলাদাভাবে পড়া যায়। প্রশ্নটা উঠলেই পড়ে নিন।

**Interview sprint:** 01 → 03। বিশ মিনিট লাগে, আর পুরো part-এ এই জোড়াটাই সবচেয়ে বেশি ফল দেয়।
