---
sourceHash: "f7be0042af0ae0fcfa4237077296f8f0e25be40bb9df9a7fc95aeeef7592b60d"
title: "Integration"
translatedAt: "2026-10-12T12:25:41.355Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Integration

এই section-টাই আপনি সোমবার কাজে গিয়ে ব্যবহার করবেন। একটি TypeScript application-এ model ঢোকানো নিয়ে পাঁচটি
অধ্যায়: call, stream, schema, tool আর protocol।

পুরো section-এর মূল সুর: **একটি model call হলো একটি ধীর, দামি service-এ network call, যা মাঝে মাঝে ভুল shape
ফেরত দেয়।** Timeout, retry আর boundary-তে validation — সবই এখনো খাটে। নতুন failure হলো, এটা HTTP 200 ফেরত দিতে দিতেই
fail করে।

## অধ্যায়গুলো

| #  | অধ্যায় | কী প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [TypeScript থেকে LLM Call করা](#ch-calling-an-llm-from-typescript) | Timeout আর error যখন সত্যিকারের, তখন production-এর একটি call দেখতে কেমন? |
| 02 | [Streaming Response](#ch-streaming-responses) | একটি token browser-এ কীভাবে পৌঁছায়, আর cancellation কোথায় থাকা উচিত? |
| 03 | [Structured Output](#ch-structured-output) | ভরসা করা যায় এমন JSON কীভাবে পাবেন, আর না পেলে কী করবেন? |
| 04 | [Tool Calling ও Tool Surface](#ch-tool-calling) | Call loop কী, আর কী থাকলে model একটি tool ঠিকভাবে ব্যবহার করে? |
| 05 | [MCP (Model Context Protocol)](#ch-model-context-protocol) | এটা কী standardise করে, আর কখন একটি server বানানো সার্থক? |

## চলমান Project

**Documentation assistant** এখানে একটি চলমান application হয়ে ওঠে। শেষ অধ্যায়ে পৌঁছে এটা browser-এ শুরু থেকে শেষ
পর্যন্ত প্রশ্নের উত্তর দেয় — খারাপভাবে, কিন্তু সত্যি সত্যি।

| অধ্যায় | Assistant-এ কী যোগ করে |
| ------- | ----------------------------- |
| 01 | একটি `/ask` route, versioned prompt-সহ, পাঠকের ধৈর্যের চেয়ে ছোট একটি timeout, আর typed error |
| 02 | Browser-এ streaming, আর উত্তরের মাঝপথে পাঠক চলে গেলে cancellation |
| 03 | একটি reply schema — prose, আর যে passage-গুলো cite করে তাদের id — boundary-তে validate করা |
| 04 | দুটি tool, `search_docs` আর `get_page`, আর এমন একটি `search_docs`, যা কিছুই ফেরত না দিয়ে বলে "match নেই, এই term-গুলো চেষ্টা করুন" |
| 05 | একই `search_docs` MCP-র ওপর দিয়ে, যাতে এটা editor-এর ভেতরেও কাজ করে |

যে shape-টা ঠিক করতে হবে, সেটা 03। Paste করা text নয়, passage id — এটাই পরে citation, guardrail আর generative UI
সম্ভব করে।

**এই section-এর শেষে** assistant cite করা উত্তর stream করে, আর প্রায়ই ভুল করে। Search তখনো একটি keyword query,
আর কিছুই মাপা হয় না। `RAG/` এর প্রথম অর্ধেক ঠিক করে, `Production/` দ্বিতীয় অর্ধেক।

## Interviewer-রা যা যাচাই করেন

- **"Request ঝুলে আছে। প্রথমে কী ভাঙে?"** যার কোনো timeout নেই। Default HTTP timeout সাধারণত user-এর ধৈর্যের চেয়ে
  দশ গুণ লম্বা।
- **"Model একটি field বাদ দিয়ে JSON ফেরত দিয়েছে। এখন কী?"** Boundary-তে validate করুন, তারপর ভেবেচিন্তে বেছে নিন:
  repair call, fallback, নাকি failure-টা দেখানো। "Schema তো এটা guarantee করে" — ভুল উত্তর।
- **"আপনার agent বারবার ভুল tool call করছে।"** Description-গুলো পড়ুন। দুটি tool-এর description একটির ওপর আরেকটি
  পড়লে, বা একটি tool খালি result ফেরত দিলে, বেশিরভাগ tool-use bug হয়।

## পড়ার ক্রম

01 → 02 → 03 ক্রমানুসারে। 04 নির্ভর করে 03-এর ওপর, কারণ একটি tool call হলো চারপাশে একটি loop-সহ structured output।
05 নির্ভর করে 04-এর ওপর।

**Interview sprint:** 03 আর 04। প্রায় প্রতিটি applied AI interview-এ এগুলো আসে।

> ⚠️ **Version-stamped.** এই অধ্যায়গুলো **AI SDK 7** আর **MCP revision
> 2025-11-25**-এর ভিত্তিতে লেখা। প্রতিটি অধ্যায় যে API দেখায়, তার নিচের টেকসই নীতিটির নাম বলে দেয়।
