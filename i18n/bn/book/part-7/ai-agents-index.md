---
sourceHash: "bb56fa9aca410b855151718ee255069f7c0170d82d40280d3ebc6cc4f26d80e2"
title: "Agent"
translatedAt: "2026-10-12T12:28:49.806Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Agent

দুটি অধ্যায়, যা শব্দটাকে কম রহস্যময় করে। একটি agent হলো একটি loop: model একটি tool বাছে, tool চলে, result
আবার window-এ ফেরে, আর model থামা পর্যন্ত আবার বাছে। একজন backend engineer-এর কাছে এটা একটি state machine,
যার transition function হলো একটি language model।

পুরো section-এর মূল সুর: **tool surface-ই product।** একটি agent কাজ করবে কি না, তা model-এর ওপর যতটা নির্ভর করে,
তার চেয়ে বেশি নির্ভর করে এর tool-গুলোর নাম আর বর্ণনা কীভাবে দেওয়া, আর তাদের error কী বলে, তার ওপর। এটা শেখানো
হয়েছে [Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling)-এ। এই section তার ওপর দাঁড়িয়ে।

## অধ্যায়গুলো

| #  | অধ্যায় | কী প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is) | Loop কী, এটা কোথায় থামে, আর কখন একটি agent-ই সোজাসুজি ভালো? |
| 02 | [Memory, State ও দীর্ঘ সময়ের কাজ](#ch-durability-and-long-running-work) | একটি turn, একটি session আর একটি deploy পেরিয়ে কী টিকে থাকে — আর কত token খরচে? |

## চলমান Project

**Documentation assistant** এখন ভালো উত্তর দেয়। এই section জিজ্ঞেস করে, এটা কি কিছু *করবেও*? Product-এর
বেশিরভাগ অংশের জন্য সৎ উত্তর হলো না।

| অধ্যায় | Assistant-এ কী যোগ করে |
| ------- | ----------------------------- |
| 01 | Scope-এর সিদ্ধান্ত: Q&A দুই ধাপের workflow-ই থাকে, আর শুধু doc triage একটি loop পায়। Multi-agent version ইচ্ছা করেই বানানো হয় না |
| 02 | Session memory — সাম্প্রতিক turn হুবহু, পুরোনোগুলো summary করে — আর রাতের re-embed একটি durable job হিসেবে |

**এই section-এর শেষে** assistant-এর একটি সীমাবদ্ধ agent থাকে, step cap, token budget আর read-only tool-সহ।
বাকি সব workflow। এর কোনোটার খরচ কত, বা কত ঘন ঘন এটা ঠিক, এখনো তা বলতে পারে না। সেটা `Production/`।

## Interviewer-রা যা যাচাই করেন

- **"আপনার agent loop-এ আটকে আছে। Debug করুন।"** Prompt বদলানোর আগে trace পড়ুন। সাধারণ কারণগুলো হলো: খালি
  tool result যা failure-এর মতো দেখায়, দুটি tool যাদের কাজ একটির ওপর আরেকটি পড়ে, আর এমন কোনো stop condition
  না থাকা, যা model পূরণ করতে পারে।
- **"Production data delete করা থেকে এটাকে কীভাবে থামাবেন?"** Destructive tool-এ approval gate, least privilege,
  আর এমন একটি tool surface, যা বিপজ্জনক operation-টা প্রকাশই করতে পারে না। "আমরা ওকে বারণ করেছি" কোনো control নয়।
- **"কখন তিনটির চেয়ে একটি agent ভালো?"** শুরুতে প্রায় সবসময়। Multi-agent দেয় parallel context। এর দাম
  coordination, আর debugging অনেক কঠিন হয়ে যায়। আগে single agent মাপুন।

## পড়ার ক্রম

আগে `Integration/`-এর tool-calling অধ্যায় পড়ুন, তারপর 01 → 02।

**Interview sprint:** 01। Senior স্তরের বেশিরভাগ agent প্রশ্নের উত্তর দেয় loop আর তার stop condition।
