---
sourceHash: "c270cd4408d96d985e2925145e29e43893fbf7f4789eb9113ad0b2c776b47eb1"
title: "Part V — NoSQL ও Caching"
translatedAt: "2026-10-12T12:21:21.838Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — NoSQL ও Caching

দুটো store নিয়ে একটি অধ্যায়, যেগুলো বেছে নেওয়া হয়েছে কত ঘন ঘন দেখা যায় তা দেখে। অনেক product codebase-এ
MongoDB আছে। প্রায় প্রতিটি production service-এর কোথাও না কোথাও Redis আছে।

অধ্যায়টি পুরো সময় তুলনা করে চলে। একটি document store নিজের গুণেই জানার মতো। আর এটা কী ছেড়ে দেয়, সেটা
ব্যাখ্যা করতে পারাও দেখায় যে আপনি relational model বোঝেন।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Non-Relational Store বাছাই: Document ও Redis](#ch-document-databases) | Document model কী এনে দেয়, কোন Redis structure মানায়, আর কখন Postgres-ই এখনো উত্তর? |

Aggregation pipeline আর shard-key-র খুঁটিনাটি ইচ্ছা করেই বাদ রাখা হয়েছে। প্রথমটি একজন MongoDB
specialist-এর দক্ষতা। দ্বিতীয়টি এক স্তর ওপরের বিষয়, [Chapter ?? — Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore)
আর [Chapter ?? — বড় পরিসরে Sharding ও Transaction](#ch-sharding)-এ, যেখানে এগুলো command নয়, সিদ্ধান্ত।

## Interviewer-রা যা যাচাই করেন

- **Embed নাকি reference।** উত্তর আসতে হবে access pattern আর বৃদ্ধির সীমা থেকে, একটি entity diagram থেকে
  নয়। 16 MB document limit "সীমাহীন"-কে একটি কঠিন constraint বানিয়ে দেয়।
- **কী atomic।** একটি single document, সবসময়। এর চেয়ে বড় কিছুতে একটি explicit transaction লাগে, আর নিয়মিত
  সেগুলো লাগা একটি modelling-এর সংকেত।
- **Pub/Sub বনাম Streams।** একটি design-এর কারণেই message হারায়। অন্যটি হারায় না। Job queue-এর জন্য ভুলটা
  বেছে নেওয়া একটি সাধারণ ভুল।
- **Redis কি system of record।** না, আর এ বিষয়ে পরিষ্কার থাকা এর command জানার চেয়ে বেশি গুরুত্বপূর্ণ।

## পড়ার ক্রম

একটিই অধ্যায়, আর সেটা interview sprint-এ আছে। Embed-নাকি-reference-এর বিচার আর Redis structure বাছাই — এই
দুটোই সবচেয়ে বেশি সামনে আসে।
