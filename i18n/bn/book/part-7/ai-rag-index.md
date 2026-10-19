---
sourceHash: "d196b26438fe4cb9271c009202d791fff25892adec5105c13fc871a6f7434360"
title: "RAG"
translatedAt: "2026-10-19T08:00:30.647Z"
model: "claude-opus-5-5 (Claude Code)"
---

# RAG

Enterprise-এ LLM দিয়ে যা বানানো হয়, তার মধ্যে সবচেয়ে প্রচলিত pattern হলো retrieval-augmented generation।
এখানে তিনটি অধ্যায়: সিদ্ধান্ত, data ভেতরে ঢোকানোর pipeline, আর data বের করে আনার pipeline। এটা মাপার কাজ আছে
`Production/01`-এ, বাকি সব eval-এর পাশে।

পুরো section-এর মূল কথা একটিই। "Model ভুল উত্তর দিয়েছে" ধরনের বেশিরভাগ bug আসলে model-এর bug নয়। হয় ঠিক
passage-টা retrieve-ই হয়নি, নয়তো সেটা এসেছে এগারো নম্বরে, কিংবা character গুনে কাটা chunker সেটাকে মাঝখান দিয়ে
দুই ভাগ করে ফেলেছে। Retrieval না মাপা পর্যন্ত প্রতিটি fix আন্দাজ ছাড়া কিছু নয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither) | কোনটা কোন সমস্যার সমাধান, আর team-গুলো ভুলটা বাছে কেন? |
| 02 | [Ingestion ও Chunking](#ch-ingestion-and-chunking) | Document-এর অর্থ নষ্ট না করে সেটা ভাগ করবেন কীভাবে? |
| 03 | [Embedding, Vector Store ও Retrieval](#ch-retrieval) | Vector জিনিসটা কী, pgvector কি যথেষ্ট, আর reranking কোথায় তার latency-র দাম তুলে আনে? |

## চলমান Project

**Documentation assistant** এখানে পৌঁছায় keyword query-র ওপর উত্তর stream করতে করতে। এই section সেই search-টা
বদলে দেয়।

| অধ্যায় | Assistant-এ কী যোগ হয় |
| ------- | ----------------------------- |
| 01 | সিদ্ধান্তটা খোলাখুলি বলা: docs প্রতি সপ্তাহে বদলায়, তাই তথ্য থাকবে store-এ, weight-এ নয় |
| 02 | Heading ধরে chunking, আর প্রতিটি chunk-এ page, heading path ও update হওয়ার তারিখ |
| 03 | `pgvector`-এ embedding, re-embed job, আর `k = 5`-এ rerank সহ hybrid retrieval |

**এই section শেষে** retrieval কাজ করে, কিন্তু কেউ সেটা মাপে না। `Production/01` আগে সেটাই বানায়।

## Interviewer-রা যা যাচাই করেন

- **"Assistant ভুল উত্তর দিয়েছে। প্রথমে কোথায় দেখবেন?"** কী retrieve হয়েছিল, সেখানে। Prompt-এ হাত দেওয়ার আগে
  window-এ যাওয়া chunk-গুলো print করুন। বেশিরভাগ candidate এই ধাপটা বাদ দেন।
- **"এর বদলে fine-tune করছেন না কেন?"** Fine-tuning শেখায় ধরন আর আচরণ। তথ্য আসে retrieval থেকে। যে তথ্য প্রতি
  সপ্তাহে বদলায়, তার জায়গা store-এ।
- **"একটি chunk কত বড় হওয়া উচিত?"** পদ্ধতি দিয়ে উত্তর না দিলে এই প্রশ্নটা ফাঁদ। উত্তর হলো: golden set-এর ওপর
  recall মাপুন (নির্দিষ্ট কিছু প্রশ্ন, যাদের ঠিক passage আগে থেকে জানা), আর সংখ্যা হিসেবে নিন recall@5।

## পড়ার ক্রম

আগে 01 পড়ুন। যে সমস্যার pipeline লাগেই না, তার জন্য pipeline বানানো থেকে এটা আপনাকে আটকাবে। তারপর 02 → 03,
pipeline যে ক্রমে বানানো হয় সেই ক্রমে। তারপর `Production/01`।

**Interview sprint:** 01, তারপর `Production/01`-এর retrieval অংশ।
