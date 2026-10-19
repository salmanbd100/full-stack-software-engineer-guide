---
sourceHash: "c0f2e5e5e8cd2f4256df17c900ad56f200436f7d2e489b28efb12e61409e2e05"
title: "ভিত্তি"
translatedAt: "2026-10-19T07:53:23.564Z"
model: "claude-opus-5-5 (Claude Code)"
---

# ভিত্তি

কোনো SDK ধরার আগে mental model-এর তিনটি অধ্যায়। Attention কীভাবে কাজ করে, একজন senior engineer-এর তা না জানলেও চলে।
কিন্তু একই prompt কেন দুটি আলাদা উত্তর দেয়, আর দশম message কেন প্রথমটার চেয়ে বেশি খরচ করে, তা জানতেই হবে। "সবচেয়ে
বড় model-টা নিয়ে নিন" কথাটা যে আসলে quality-র পোশাক পরা একটি খরচের সিদ্ধান্ত, সেটাও ধরতে পারতে হবে।

পুরো section-এর সুতো একটি বাক্য: **model হলো token budget-এর ওপর চলা একটি stateless function।** কাটা পড়া উত্তর,
ভুলে যাওয়া instruction, আর conversation-এর সঙ্গে বাড়তে থাকা খরচ, সবই এখান থেকে আসে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------------- |
| 01 | [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave) | Output প্রতিবার আলাদা কেন, আর ছোট model কখন জেতে? |
| 02 | [Engineering হিসেবে Prompting](#ch-prompting-as-engineering) | Prompt কখন খেয়ালমতো বদলানো string না থেকে version করা artefact হয়ে যায়? |
| 03 | [Context Engineering](#ch-context-engineering) | Window-এ কী ঢোকে, কী বাদ পড়ে, আর সেটা ঠিক করে কে? |

## চলমান Project

এখনো কিছু চলে না। **Documentation assistant** যে তিনটি সিদ্ধান্তের ওপর দাঁড়িয়ে, এই section সেগুলো নেয়। প্রতিটি
সিদ্ধান্ত পরে যেকোনো জায়গার চেয়ে এখানে বদলানো সস্তা।

| অধ্যায় | Assistant-এ কী যোগ হয় |
| ------- | --------------------- |
| 01 | Token-এর হিসাব, যেটা সবচেয়ে সহজ design-টাকে বাতিল করে দেয়। আর দুটি model: query নতুন করে লেখার জন্য একটি ছোট, উত্তরের জন্য একটি বড় |
| 02 | `prompts/answer.md`, code-এর সঙ্গে version করা, grounding-এর নিয়মসহ: শুধু দেওয়া passage থেকেই উত্তর দেবে |
| 03 | Window-এর budget লিখে রাখা: system prompt, পাঁচটি passage, শেষের কয়েকটি turn। আর আগে কী বাদ পড়বে |

**এই section-এর শেষে** assistant আছে শুধু কাগজে। এখনো কিছুই model call করে না। Application হয়ে ওঠে `Integration/`-এ।

## Interviewer-রা যা যাচাই করেন

- **"দ্বিতীয়বার model আলাদা উত্তর দিল কেন?"** Sampling। Temperature-এর নাম বলুন, তারপর আসল কথাটা যোগ করুন:
  non-deterministic system-কে equality check দিয়ে test করা যায় না।
- **"Playground-এ চলে, production-এ fail করে। কেন?"** প্রায় সবসময় context। হয় system prompt আলাদা, নয় window কাটা
  পড়েছে, নয়তো এমন retrieve করা text এসেছে যা playground কখনো পায়নি। জোড়া লাগানো request-টা দেখতে চান।
- **"ছোট model কখন ব্যবহার করবেন?"** Routing, extraction, আর hot path-এর যেকোনো কাজে। কোথায় *করবেন না* (খোলামেলা
  reasoning, লম্বা tool use), সেটাও বললে উত্তরটা পছন্দ থেকে বিচারবুদ্ধি হয়ে ওঠে।

## পড়ার ক্রম

আগে 01। অংশের বাকিটা এর শব্দভাণ্ডার ধরে নেয়। 02 আর 03 যেকোনো ক্রমে পড়া যায়।

**Interview sprint:** 01 আর 03। সাধারণ একটি AI প্রশ্ন আসলে যা যাচাই করে, তার বেশিরভাগই এ দুটিতে আছে।
