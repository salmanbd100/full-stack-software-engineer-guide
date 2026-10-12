---
sourceHash: "c0f2e5e5e8cd2f4256df17c900ad56f200436f7d2e489b28efb12e61409e2e05"
title: "ভিত্তি"
translatedAt: "2026-10-12T12:27:47.832Z"
model: "claude-opus-5-5 (Claude Code)"
---

# ভিত্তি

যেকোনো SDK-র আগে, mental model-এর তিনটি অধ্যায়। একজন senior engineer-এর attention কীভাবে কাজ করে তা জানার দরকার
নেই। কিন্তু তাঁকে জানতে হবে, একই prompt কেন দুটো আলাদা উত্তর দেয়, আর দশম message কেন প্রথমটার চেয়ে বেশি খরচ করে।
তাঁকে এটাও বুঝতে হবে যে "সবচেয়ে বড় model-টাই নিন" আসলে একটি খরচের সিদ্ধান্ত, যা মানের সিদ্ধান্তের পোশাক পরে আছে।

পুরো অংশের মূল সুতো একটি বাক্য: **একটি model হলো একটি token budget-এর ওপর চলা stateless function।** কেটে যাওয়া
উত্তর, ভুলে যাওয়া instruction, আর কথোপকথনের সাথে বাড়তে থাকা খরচ — সবই এখান থেকে আসে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave) | Output প্রতিবার আলাদা কেন, আর কখন একটি ছোট model জেতে? |
| 02 | [Engineering হিসেবে Prompting](#ch-prompting-as-engineering) | কী একটি prompt-কে এমন artefact বানায়, যার version রাখা হয়, শুধু tweak করার একটি string নয়? |
| 03 | [Context Engineering](#ch-context-engineering) | Window-এ কী যায়, কী কাটা পড়ে, আর কে ঠিক করে? |

## চলমান Project

এখনো কিছুই চলে না। এই section সেই তিনটি সিদ্ধান্ত নেয়, যার ওপর **documentation assistant** দাঁড়িয়ে। প্রতিটি
সিদ্ধান্ত পরে যেকোনো জায়গার চেয়ে এখানে বদলানো সস্তা।

| অধ্যায় | Assistant-এ কী যোগ করে |
| ------- | ----------------------------- |
| 01 | যে token-এর হিসাব সহজ design-টাকে মেরে ফেলে, আর দুটি model: query rewriting-এর জন্য একটি ছোট, উত্তরের জন্য একটি বড় |
| 02 | `prompts/answer.md`, code-এর সাথে version করা, grounding rule-সহ: শুধু দেওয়া passage থেকেই উত্তর দাও |
| 03 | Window budget লিখে রাখা — system prompt, পাঁচটি passage, শেষ কয়েকটি turn — আর আগে কী বাদ পড়ে |

**এই section-এর শেষে** assistant কাগজে-কলমে তৈরি। এখনো কিছুই model call করে না; `Integration/`-এ এটা একটি
application হয়ে ওঠে।

## Interviewer-রা যা যাচাই করেন

- **"Model দ্বিতীয়বার আলাদা উত্তর দিল কেন?"** Sampling। Temperature-এর নাম বলুন, তারপর যে অংশটা আসলে জরুরি সেটা যোগ
  করুন: একটি non-deterministic system equality check দিয়ে test করা যায় না।
- **"Playground-এ কাজ করে, production-এ fail করে। কেন?"** প্রায় সবসময় context: আলাদা system prompt, কাটা পড়া window,
  বা retrieve করা লেখা, যা playground-এ কখনো ছিল না। জোড়া লাগানো request-টা দেখতে চান।
- **"কখন ছোট model ব্যবহার করবেন?"** Routing, extraction, আর hot path-এ থাকা যেকোনো কিছু। কোথায় করবেন *না* (খোলা
  ধরনের reasoning, লম্বা tool use), সেটা বললে এটা পছন্দ নয়, একটি বিচার হয়ে ওঠে।

## পড়ার ক্রম

আগে 01। অংশের বাকিটা এর শব্দভান্ডার ধরে নেয়। 02 আর 03 যেকোনো ক্রমে পড়া যায়।

**Interview sprint:** 01 আর 03। একটি সাধারণ AI প্রশ্ন আসলে যা যাচাই করে, তার বেশিরভাগ এই দুটোতে আছে।
