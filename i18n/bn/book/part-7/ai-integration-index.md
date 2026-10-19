---
sourceHash: "f7be0042af0ae0fcfa4237077296f8f0e25be40bb9df9a7fc95aeeef7592b60d"
title: "Integration"
translatedAt: "2026-10-19T07:57:15.280Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Integration

সোমবার কাজে গিয়ে যে section-টা লাগবে, সেটা এই। TypeScript application-এ model আনার পাঁচটি অধ্যায়: call, stream,
schema, tool আর protocol।

পুরো section-এর সুতো হলো: **model call মানে একটি ধীর, দামি service-এ network call, যেটা মাঝে মাঝে ভুল আকারের জিনিস
ফেরত দেয়।** Timeout, retry আর boundary-তে validation, সবই এখানেও খাটে। নতুন failure হলো, এটা HTTP 200 ফেরত দিয়েও fail
করে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------------- |
| 01 | [TypeScript থেকে LLM Call করা](#ch-calling-an-llm-from-typescript) | Timeout আর error যখন সত্যিই ঘটে, তখন production-এর একটি call দেখতে কেমন? |
| 02 | [Streaming Response](#ch-streaming-responses) | একটি token browser-এ পৌঁছায় কীভাবে, আর cancellation-এর জায়গা কোথায়? |
| 03 | [Structured Output](#ch-structured-output) | ভরসা করা যায় এমন JSON কীভাবে পাবেন, আর না পেলে কী করবেন? |
| 04 | [Tool Calling ও Tool Surface](#ch-tool-calling) | Call loop কী, আর কোন গুণে একটি tool model ঠিকভাবে ব্যবহার করে? |
| 05 | [MCP (Model Context Protocol)](#ch-model-context-protocol) | এটা কী standardise করে, আর কখন server বানানো সার্থক? |

## চলমান Project

এখানে এসে **documentation assistant** একটি চালু application হয়ে ওঠে। শেষ অধ্যায় পর্যন্ত গেলে এটা browser-এ শুরু থেকে
শেষ পর্যন্ত প্রশ্নের উত্তর দেয়। খারাপভাবে, কিন্তু সত্যি সত্যিই।

| অধ্যায় | Assistant-এ কী যোগ হয় |
| ------- | --------------------- |
| 01 | একটি `/ask` route, সঙ্গে version করা prompt, পাঠকের ধৈর্যের চেয়ে ছোট একটি timeout, আর typed error |
| 02 | Browser-এ streaming, আর পাঠক উত্তরের মাঝখানে চলে গেলে cancellation |
| 03 | উত্তরের একটি schema, গদ্য আর যে passage-গুলোর উল্লেখ আছে তাদের id, boundary-তে validate করা |
| 04 | দুটি tool, `search_docs` আর `get_page`। আর এমন একটি `search_docs`, যা কিছু না দিয়ে ফেরার বদলে বলে "মিল পাওয়া যায়নি, এই শব্দগুলো দিয়ে চেষ্টা করুন" |
| 05 | MCP-র ওপর সেই একই `search_docs`, যাতে editor-এর ভেতরেও চলে |

সবচেয়ে জরুরি গড়ন 03-এরটা। Paste করা text নয়, passage-এর id থাকলেই পরে citation, guardrail আর generative UI সম্ভব হয়।

**এই section-এর শেষে** assistant উল্লেখসহ উত্তর stream করে, আর প্রায়ই ভুল বলে। Search এখনো keyword query, আর কিছুই মাপা
হচ্ছে না। প্রথম অর্ধেকটা ঠিক করে `RAG/`, দ্বিতীয়টা `Production/`।

## Interviewer-রা যা যাচাই করেন

- **"Request আটকে আছে। আগে কী ভাঙবে?"** যার timeout নেই, সেটা। Default HTTP timeout সাধারণত user-এর ধৈর্যের চেয়ে দশগুণ
  লম্বা।
- **"Model এমন JSON দিল, যাতে একটি field নেই। এবার?"** Boundary-তে validate করুন। তারপর repair call, fallback আর
  failure দেখানোর মধ্যে ভেবেচিন্তে একটি বাছুন। "Schema তো guarantee দেয়" কথাটা ভুল।
- **"আপনার agent বারবার ভুল tool call করছে।"** Description-গুলো পড়ুন। দুটি tool-এর description মিলে গেলে, বা কোনো tool
  খালি result ফেরত দিলে, tool use-এর বেশিরভাগ bug হয়।

## পড়ার ক্রম

01 → 02 → 03, এই ক্রমে। 04 নির্ভর করে 03-এর ওপর, কারণ tool call হলো চারপাশে একটি loop জোড়া structured output। 05
নির্ভর করে 04-এর ওপর।

**Interview sprint:** 03 আর 04। Applied AI-এর প্রায় প্রতিটি interview-এ এ দুটি আসে।

> ⚠️ **Version ধরে লেখা।** এই অধ্যায়গুলো লেখা হয়েছে **AI SDK 7** আর **MCP revision 2025-11-25** ধরে। প্রতিটি অধ্যায়
> যে API দেখায়, তার নিচের টেকসই নীতিটাও বলে দেয়।
