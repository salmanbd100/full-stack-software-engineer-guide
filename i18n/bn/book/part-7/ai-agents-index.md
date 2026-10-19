---
sourceHash: "bb56fa9aca410b855151718ee255069f7c0170d82d40280d3ebc6cc4f26d80e2"
title: "Agent"
translatedAt: "2026-10-19T08:00:30.885Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Agent

দুটি অধ্যায়, যা শব্দটার রহস্য অনেকটা কাটিয়ে দেয়। Agent আসলে একটি loop: model একটি tool বাছে, tool চলে, ফলাফল
আবার window-এ ফেরে, আর model আবার বাছে, যতক্ষণ না থামে। Backend engineer-এর চোখে এটা একটি state machine, যার
transition function হলো একটি language model।

পুরো section-এর মূল কথা হলো, **tool surface-ই product।** Agent কাজ করবে কি না, তা model-এর ওপর যতটা নির্ভর
করে, তার চেয়ে বেশি নির্ভর করে tool-গুলোর নাম আর বর্ণনা কেমন, আর তাদের error কী বলে, তার ওপর। এটা শেখানো হয়েছে
[Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling)-এ। এই section তার ওপরেই দাঁড়িয়ে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is) | Loop-টা কী, কোথায় থামে, আর কখন একটি agent-ই সোজাসুজি ভালো? |
| 02 | [Memory, State ও দীর্ঘ সময়ের কাজ](#ch-durability-and-long-running-work) | একটি turn, একটি session, একটি deploy পেরিয়ে কী টিকে থাকে, আর তার token খরচ কত? |

## চলমান Project

**Documentation assistant** এখন ভালো উত্তর দেয়। এই section জিজ্ঞেস করে, এটা কি কিছু *করবেও*? Product-এর
বেশিরভাগ অংশের জন্য সৎ উত্তর হলো, না।

| অধ্যায় | Assistant-এ কী যোগ হয় |
| ------- | ----------------------------- |
| 01 | Scope-এর সিদ্ধান্ত: Q&A থাকে দুই ধাপের workflow হয়েই, loop পায় শুধু doc triage। Multi-agent version ইচ্ছে করেই বানানো হয়নি |
| 02 | Session memory — সাম্প্রতিক turn হুবহু, পুরনোগুলো সংক্ষেপে — আর রাতের re-embed একটি durable job হিসেবে |

**এই section শেষে** assistant-এ থাকে একটিমাত্র সীমিত agent, যার আছে step cap, token budget আর read-only tool।
বাকি সব workflow। এর কোনোটার খরচ কত, বা কত বার ঠিক উত্তর দেয়, assistant এখনো তা বলতে পারে না। সেটা
`Production/`-এর কাজ।

## Interviewer-রা যা যাচাই করেন

- **"আপনার agent loop-এ আটকে গেছে। Debug করুন।"** Prompt বদলানোর আগে trace পড়ুন। সাধারণ কারণগুলো হলো: খালি
  tool result, যা model-এর কাছে ব্যর্থতার মতো দেখায়; দুটি tool, যাদের কাজ একটি আরেকটির ওপর পড়ে; আর এমন কোনো
  থামার শর্ত না থাকা, যা model পূরণ করতে পারে।
- **"Production data মুছে ফেলা থেকে এটাকে আটকাবেন কীভাবে?"** ধ্বংসাত্মক tool-এ approval gate, least privilege,
  আর এমন tool surface, যা দিয়ে বিপজ্জনক কাজটা প্রকাশই করা যায় না। "আমরা ওকে না করে দিয়েছি" কোনো control নয়।
- **"কখন তিনটি agent-এর চেয়ে একটি agent ভালো?"** শুরুতে প্রায় সবসময়। Multi-agent দেয় parallel context। তার দাম
  coordination, আর debug করা অনেক কঠিন হয়ে যায়। আগে single agent মাপুন।

## পড়ার ক্রম

আগে `Integration/`-এর tool-calling অধ্যায়টা পড়ুন, তারপর 01 → 02।

**Interview sprint:** 01। Loop আর তার থামার শর্ত দিয়েই senior স্তরের বেশিরভাগ agent-প্রশ্নের উত্তর হয়ে যায়।
