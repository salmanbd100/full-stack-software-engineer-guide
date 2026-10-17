---
sourceHash: "c270cd4408d96d985e2925145e29e43893fbf7f4789eb9113ad0b2c776b47eb1"
title: "Part V — NoSQL ও Caching"
translatedAt: "2026-10-17T14:03:27.430Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — NoSQL ও Caching

দুটি store নিয়ে একটি অধ্যায়, বাছা হয়েছে কতবার এদের দেখা মেলে তা দেখে। অনেক product codebase-এ MongoDB আছে। আর প্রায়
প্রতিটি production service-এর কোথাও না কোথাও Redis আছে।

পুরো অধ্যায় জুড়ে তুলনা চলে। Document store নিজের গুণেই জানার মতো। তবে সেটা কী ছেড়ে দেয় তা বুঝিয়ে বলতে পারলে বোঝা যায়
যে relational model-ও আপনি বোঝেন।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Non-Relational Store বাছাই: Document ও Redis](#ch-document-databases) | Document model কী এনে দেয়, কোন Redis structure মানায়, আর কখন উত্তর এখনও Postgres? |

Aggregation pipeline আর shard key-এর খুঁটিনাটি ইচ্ছে করেই বাদ রাখা হয়েছে। প্রথমটি MongoDB specialist-এর দক্ষতা।
দ্বিতীয়টির জায়গা এক স্তর ওপরে, [Chapter ?? — Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore)
আর [Chapter ?? — বড় পরিসরে Sharding ও Transaction](#ch-sharding)-এ, যেখানে এগুলো command নয়, সিদ্ধান্ত।

## Interviewer-রা যা যাচাই করেন

- **Embed নাকি reference।** উত্তর আসতে হবে access pattern আর কতটা বাড়তে পারে তার সীমা থেকে, entity diagram থেকে নয়।
  16 MB-এর document সীমা "সীমাহীন"-কে একটি কড়া constraint বানিয়ে দেয়।
- **কী atomic।** একটি document, সবসময়। এর চেয়ে বড় কিছু হলে আলাদা করে transaction লাগে, আর নিয়মিত সেটা লাগা মানে
  modelling-এ গোলমাল আছে।
- **Pub/Sub বনাম Streams।** একটি design অনুযায়ীই message হারায়। অন্যটি হারায় না। Job queue-র জন্য ভুলটা বেছে নেওয়া খুব
  সাধারণ ভুল।
- **Redis কি system of record।** না। আর Redis-এর command জানার চেয়ে এই ব্যাপারে স্পষ্ট থাকা বেশি জরুরি।

## পড়ার ক্রম

একটিই অধ্যায়, আর সেটা interview sprint-এ আছে। সবচেয়ে বেশি আসে দুটি প্রশ্ন: embed নাকি reference, আর কোন Redis structure।
