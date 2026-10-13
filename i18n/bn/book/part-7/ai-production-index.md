---
sourceHash: "37ad1c2037e5167855f790c164a08754ae52b8f7fa340a8b57d62680833221f9"
title: "Production"
translatedAt: "2026-10-13T03:05:18.033Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Production

এই section-টাই এই বইকে আলাদা করে। যদি শুধু একটি পড়ার সময় থাকে, তাহলে এটাই আগে পড়ুন। চারটি অধ্যায়, সেই কাজ নিয়ে
যেটা demo কাজ করার পরে শুরু হয়: মান মাপা, request trace করা, খরচ নিয়ন্ত্রণ করা, আর এমন একটি system রক্ষা করা,
যার প্রধান দুর্বলতার কোনো সম্পূর্ণ সমাধান নেই।

পুরো section-এর মূল সুর হলো **আগে মাপুন, তারপর বদলান।** শুধু যুক্তি দিয়ে একটি AI feature-কে ভালো করা যায় না।
System-টি non-deterministic, আর একটি prompt-এর পরিবর্তন একটি case ঠিক করতে গিয়ে প্রায়ই আরও চারটি ভেঙে ফেলে। একটি
suite আর একটি সংখ্যা ছাড়া কাজটা এলোমেলো হাঁটা, যেটাকে অগ্রগতি বলে মনে হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | যে প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Eval, Retrieval Metric ও Error Analysis](#ch-evals) | Golden set কী, recall@k কী, আর একশোটা খারাপ উত্তর কীভাবে তিনটি সমাধানে পরিণত হয়? |
| 02 | [Observability ও Cost Engineering](#ch-observability) | একটি trace দেখতে কেমন, আর কোন lever bill সবচেয়ে বেশি কমায়? |
| 03 | [Guardrail ও Safety](#ch-guardrails-and-safety) | কী filter করবেন, আর model refuse করলে কী হয়? |
| 04 | [Prompt Injection](#ch-prompt-injection) | কেন এটাই AI security-র মূল সমস্যা, আর আসলে কী কাজে দেয়? |

## চলমান Project

এ পর্যন্ত **documentation assistant**-কে শুধু তর্ক দিয়ে ভালো করা যেত। এই section এটাকে মাপজোখ দিয়ে ভালো করার
মতো করে তোলে।

| অধ্যায় | Assistant-এ যা যোগ করে |
| ------- | ----------------------------- |
| 01 | পঞ্চাশটি প্রশ্নের একটি golden set, যেখানে recall@5 আর একটি answer pass rate CI-তে merge আটকায়, আর এক সপ্তাহের failure তিনটি সমাধানযোগ্য দলে ভাগ করা |
| 02 | প্রতি request-এ token আর latency-সহ একটি span, একটি cache করা system prompt, আর প্রতি প্রশ্নে জানা খরচ |
| 03 | Scope-এর বাইরের প্রশ্নে refusal, প্রতিটি cite করা id resolve হয় কি না তার একটি check, আর এমন tool যেগুলো read-only থাকে |
| 04 | Inject করা instruction বহনকারী একটি docs page — ক্ষতিহীন, কারণ tool-গুলো লিখতে পারে না আর citation server-এ resolve হয় |

**এই section-এর শেষে** assistant-এর একটি pass rate, প্রতি প্রশ্নে একটি খরচ আর একটি ঘোষিত security boundary থাকে।
এই part-এর শেষ অধ্যায়ে যা জিজ্ঞেস করা হয়, তার বেশিরভাগই এই তিনটি উত্তর।

## Interviewer-রা যা যাচাই করেন

- **"আপনার পরিবর্তন যে জিনিসটাকে ভালো করেছে, তা কীভাবে জানলেন?"** একটি golden set, একটি pass rate, merge-এর
  আগে একটি regression run। তারপর set-টি কী কভার করে না, তা নিয়ে একটি সৎ মন্তব্য।
- **"LLM-as-judge কখন গ্রহণযোগ্য?"** লিখিত rubric-সহ মাত্রাভিত্তিক গুণের জন্য, যখন judge-কে মানুষের label-এর সাথে
  মিলিয়ে দেখা হয়েছে। কখনোই একমাত্র signal হিসেবে নয়।
- **"খরচ পূর্বাভাসের চারগুণ। প্রথমে কী করবেন?"** Model বদলানোর আগে token profile মাপুন। Cache না করা system
  prompt, বেড়ে যাওয়া context আর সীমাহীন retry loop — সাধারণত এরাই দোষী।
- **"একজন backend engineer-কে prompt injection বুঝিয়ে বলুন।"** Model instruction আর data আলাদা করতে পারে না, আর
  retrieve করা document হলো অন্য কারও লেখা data। প্রতিরক্ষা হলো স্তরে স্তরে, জাদুর শব্দ ধরার একটি filter নয়।

## পড়ার ক্রম

প্রথমে 01, আর দুবার পড়ুন; এটা ছাড়া এখানকার আর কিছুই কাজে আসে না। System live না হওয়া পর্যন্ত 02 অপেক্ষা করতে
পারে। 03 → 04 ক্রম অনুযায়ী।

**Interview sprint:** 01 আর 04। Evaluation সেই skill, যেটা সবচেয়ে বেশি চাওয়া হয় আর সবচেয়ে কম শেখানো হয়। Prompt
injection এখন প্রতিটি senior AI loop-এ আসে।
