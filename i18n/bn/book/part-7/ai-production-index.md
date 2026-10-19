---
sourceHash: "37ad1c2037e5167855f790c164a08754ae52b8f7fa340a8b57d62680833221f9"
title: "Production"
translatedAt: "2026-10-19T07:53:37.422Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Production

এই section-টাই বইটাকে আলাদা করে। সময় থাকলে যদি শুধু একটি section পড়েন, এটাই পড়ুন। চারটি অধ্যায়, demo চলতে শুরু
করার পরের কাজ নিয়ে: quality মাপা, request trace করা, খরচ নিয়ন্ত্রণ, আর এমন system রক্ষা করা, যার প্রধান দুর্বলতার
কোনো পূর্ণ সমাধান নেই।

মূল সুরটা হলো **আগে মাপুন, তারপর বদলান।** শুধু যুক্তি দিয়ে কোনো AI feature-কে ভালো করা যায় না। System-টা
non-deterministic, আর একটি case ঠিক করা prompt-এর বদল প্রায়ই অন্য চারটি case ভেঙে দেয়। Suite আর একটি সংখ্যা ছাড়া
কাজটা হয়ে যায় এলোমেলো হাঁটা, যেটাকে অগ্রগতি বলে মনে হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Eval, Retrieval Metric ও Error Analysis](#ch-evals) | Golden set কী, recall@k কী, আর একশো খারাপ উত্তর কীভাবে তিনটি fix-এ নেমে আসে? |
| 02 | [Observability ও Cost Engineering](#ch-observability) | একটি trace দেখতে কেমন, আর কোন lever bill সবচেয়ে বেশি নড়ায়? |
| 03 | [Guardrail ও Safety](#ch-guardrails-and-safety) | কী filter করবেন, আর model যখন উত্তর দিতে অস্বীকার করে তখন কী হয়? |
| 04 | [Prompt Injection](#ch-prompt-injection) | AI security-র প্রধান সমস্যা এটাই কেন, আর আসলে কী কাজে দেয়? |

## চলমান Project

এতদিন **documentation assistant**-কে ভালো করা যেত শুধু তর্ক করে। এই section এটাকে মেপে ভালো করার মতো করে তোলে।

| অধ্যায় | Assistant-এ কী যোগ হয় |
| ------- | ----------------------------- |
| 01 | পঞ্চাশটি প্রশ্নের golden set, যার recall@5 আর answer pass rate CI-তে merge আটকে রাখে, আর এক সপ্তাহের ব্যর্থতা ঠিক করার মতো তিনটি দলে ভাগ করা |
| 02 | প্রতিটি request-এর জন্য একটি span, যাতে token আর latency থাকে, cache করা system prompt, আর প্রতি প্রশ্নের জানা খরচ |
| 03 | Scope-এর বাইরের প্রশ্নে না বলা, প্রতিটি cite করা id সত্যিই আছে কি না তার check, আর tool-গুলো read-only রাখা |
| 04 | Inject করা নির্দেশ বহন করা একটি docs page — যা ক্ষতিহীন, কারণ tool-গুলো কিছু লিখতে পারে না আর citation মেলানো হয় server-এ |

**এই section শেষে** assistant-এর থাকে একটি pass rate, প্রতি প্রশ্নের খরচ, আর স্পষ্ট করে বলা একটি security boundary।
এই part-এর শেষ অধ্যায়ে যা জিজ্ঞেস করা হয়, তার বেশিরভাগই এই তিনটি উত্তর।

## Interviewer-রা যা যাচাই করেন

- **"আপনার বদলে জিনিসটা ভালো হয়েছে, কীভাবে জানলেন?"** Golden set, pass rate, আর merge-এর আগে regression run।
  তারপর set-টা কী কী ধরে না, তা নিয়ে একটি সৎ মন্তব্য।
- **"LLM-as-judge কখন চলে?"** লিখিত rubric আছে এমন graded quality-র জন্য, আর তাও judge-কে মানুষের label-এর সঙ্গে
  মিলিয়ে দেখার পরে। একমাত্র signal হিসেবে কখনোই নয়।
- **"খরচ হচ্ছে forecast-এর চার গুণ। প্রথমে কী করবেন?"** Model বদলানোর আগে token profile মাপুন। সাধারণত দোষী হয়
  cache না করা system prompt, বাড়তে থাকা context, আর সীমাহীন retry loop।
- **"একজন backend engineer-কে prompt injection বুঝিয়ে বলুন।"** Model নির্দেশ আর data আলাদা করতে পারে না, আর
  retrieve করা document হলো অন্য কারও লেখা data। প্রতিরক্ষা হয় কয়েক স্তরে, জাদুর শব্দ ধরার কোনো filter দিয়ে নয়।

## পড়ার ক্রম

আগে 01, আর সেটা দুবার পড়ুন। ওটা ছাড়া এখানকার আর কিছুই কাজে আসে না। System live হওয়া পর্যন্ত 02 অপেক্ষা করতে
পারে। 03 → 04 ক্রম মেনে।

**Interview sprint:** 01 আর 04। Evaluation এমন দক্ষতা, যা সবচেয়ে বেশি চাওয়া হয় আর সবচেয়ে কম শেখানো হয়। Prompt
injection এখন প্রতিটি senior AI loop-এ আসে।
