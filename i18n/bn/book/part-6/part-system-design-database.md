---
sourceHash: "1afd2e4b0a0d095895f9a38dbb7559aaa31a300ab86ab26d51822b31c5f53e09"
title: "Part VI — বড় পরিসরে Data"
translatedAt: "2026-10-17T14:03:19.718Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — বড় পরিসরে Data

বেশিরভাগ system design-এর আসল সিদ্ধান্ত হয় data layer-এ। কোন store বেছে নিচ্ছেন, তা ঠিক করে দেয় কোন query সস্তা হবে।
Shard key ঠিক করে দেয় আদৌ কী কী সম্ভব। Isolation level ঠিক করে দেয়, একসঙ্গে অনেক request চললে কী কী ভুল হতে পারে। তিনটিই পরে
বদলানো ব্যয়বহুল, তাই interviewer-রা একটি round-এর অনেকটা সময় এখানেই কাটান।

এই section বিষয়টির **distributed** অর্ধেক। Schema design, indexing, query plan আর রোজকার SQL আছে Part V-এ। এই section
ধরে নেয় আপনি সেগুলো জানেন, আর আবার সেগুলো বলে না।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore) | কোন ধরনের store, আর copy-গুলোর মধ্যে অমিল থাকার সময় reader কী দেখতে পারে? |
| 02 | [বড় পরিসরে Sharding ও Transaction](#ch-sharding) | কোন shard key নিয়ে পরে আফসোস করবেন না, আর machine জুড়ে কী ভেঙে যায়? |

## Interviewer-রা যা যাচাই করেন

- **আপনি কি access pattern দেখে বাছাই করেন?** "Relational, কারণ query নানা রকম আর টাকার ব্যাপার জড়িত" একটি কারণ।
  "NoSQL, কারণ এটা scale করে" কোনো কারণ নয়।
- **Replication কী দেয় না, তা কি জানেন?** Replica মানে availability, backup নয়। আর design অনুযায়ীই replica stale data ফেরত দেয়।
- **আপনি কি একটি shard key-র পক্ষে যুক্তি দিতে পারেন?** Cardinality, সাধারণ query-তে key-টা থাকে কি না, key-টা অপরিবর্তনীয় কি না,
  আর এক কোটি follower-এর account-টার কী হবে।
- **আপনি কি distributed transaction-এর দিকে হাত বাড়ান?** Senior-এর উত্তর হলো এমনভাবে সাজানো, যাতে সেটা লাগেই না।

## পড়ার ক্রম

01 → 02, এই ক্রমে। Data ছড়িয়ে দেওয়ার দুটি উপায় এরা: copy করা, নয়তো ভাগ করা। 02-এর দ্বিতীয় অর্ধেক দেখায়, একসঙ্গে চলা
write দুটি উপায়েরই কী অবস্থা করে।

**Interview sprint:** 02। এই section থেকে সবচেয়ে বেশি জিজ্ঞেস করা হয় দুটি প্রশ্ন: shard key আর lost update।

> ⚠️ **Schema design, indexing আর query optimisation আছে Part V-এ**, implementation-এর গভীরতায়। CAP আর consistency
> pattern আছে [Chapter ?? — Reliability, Consistency ও CAP](#ch-consistency-and-cap)-এ।
> এই section শুধু সেই data নিয়ে, যা আর একটি machine-এ আঁটে না।
