---
sourceHash: "d196b26438fe4cb9271c009202d791fff25892adec5105c13fc871a6f7434360"
title: "RAG"
translatedAt: "2026-10-12T12:28:49.564Z"
model: "claude-opus-5-5 (Claude Code)"
---

# RAG

Retrieval-augmented generation হলো enterprise-এ সবচেয়ে প্রচলিত LLM pattern। তিনটি অধ্যায়: সিদ্ধান্ত,
ভেতরে ঢোকার pipeline, আর বাইরে আসার pipeline। এটা মাপার কাজ থাকে `Production/01`-এ, বাকি সব eval-এর পাশে।

পুরো section-এর মূল সুর: "model ভুল উত্তর দিয়েছে" ধরনের বেশিরভাগ bug আসলে model-এর bug নয়। ঠিক passage-টি
কখনো retrieve-ই হয়নি, বা এগারো নম্বরে rank পেয়েছে, বা অক্ষর গুনে কাটা একটি chunker সেটাকে মাঝখান দিয়ে দুই ভাগ
করেছে। Retrieval মাপা না হওয়া পর্যন্ত প্রতিটি fix একটি আন্দাজ।

## অধ্যায়গুলো

| #  | অধ্যায় | কী প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither) | কোনটা কোন সমস্যার সমাধান করে, আর team-রা কেন ভুলটা বাছে? |
| 02 | [Ingestion ও Chunking](#ch-ingestion-and-chunking) | একটি document-এর অর্থ নষ্ট না করে কীভাবে ভাগ করবেন? |
| 03 | [Embedding, Vector Store ও Retrieval](#ch-retrieval) | Vector কী, pgvector কি যথেষ্ট, আর reranking কোথায় তার latency-র দাম ফেরত দেয়? |

## চলমান Project

**Documentation assistant** এখানে পৌঁছায় একটি keyword query-র ওপর উত্তর stream করতে করতে। এই section সেই
search-কে বদলে দেয়।

| অধ্যায় | Assistant-এ কী যোগ করে |
| ------- | ----------------------------- |
| 01 | সিদ্ধান্তটা খোলাখুলি: docs প্রতি সপ্তাহে বদলায়, তাই তথ্যের জায়গা একটি store, weight নয় |
| 02 | Heading ধরে chunking, প্রতিটি chunk-এ page, heading path আর updated date-সহ |
| 03 | `pgvector`-এ embedding, re-embed job, আর `k = 5`-এ rerank-সহ hybrid retrieval |

**এই section-এর শেষে** retrieval কাজ করে, কিন্তু কিছুই সেটা মাপে না। `Production/01` প্রথমে সেটাই বানায়।

## Interviewer-রা যা যাচাই করেন

- **"Assistant ভুল উত্তর দিয়েছে। প্রথমে কোথায় দেখবেন?"** কী retrieve হয়েছে, সেখানে। Prompt ছোঁয়ার আগে
  window-এ যাওয়া chunk-গুলো print করুন। বেশিরভাগ candidate এটা বাদ দেন।
- **"বরং fine-tune কেন নয়?"** Fine-tuning শেখায় রূপ আর আচরণ; retrieval জোগায় তথ্য। যে তথ্য প্রতি সপ্তাহে
  বদলায়, তার জায়গা একটি store-এ।
- **"একটি chunk কত বড় হওয়া উচিত?"** একটি ফাঁদ, যদি না আপনি একটি পদ্ধতি দিয়ে উত্তর দেন: একটি golden set-এ
  (নির্দিষ্ট প্রশ্ন, যাদের ঠিক passage জানা) recall মাপুন, আর সংখ্যাটা হোক recall@5।

## পড়ার ক্রম

আগে 01 পড়ুন। এটা আপনাকে এমন সমস্যার জন্য pipeline বানানো থেকে থামায়, যার pipeline দরকারই ছিল না। তারপর
02 → 03, pipeline যে ক্রমে বানানো হয়। তারপর `Production/01`।

**Interview sprint:** 01, তারপর `Production/01`-এর retrieval অর্ধেক।
