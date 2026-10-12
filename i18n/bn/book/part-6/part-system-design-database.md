---
sourceHash: "1afd2e4b0a0d095895f9a38dbb7559aaa31a300ab86ab26d51822b31c5f53e09"
title: "Part VI — বড় পরিসরে Data"
translatedAt: "2026-10-12T12:26:47.257Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — বড় পরিসরে Data

বেশিরভাগ system design আসলে ঠিক হয় data layer-এ। আপনি যে store বাছেন, তা ঠিক করে কোন query সস্তা। Shard key
ঠিক করে কোনটা আদৌ সম্ভব। Isolation level ঠিক করে, request একই সময়ে চললে কী ভুল হতে পারে। তিনটিই পরে বদলাতে
ব্যয়বহুল, তাই interviewer-রা একটি round-এর অনেকটা সময় এখানে কাটান।

এই section বিষয়টির **distributed** অর্ধেক। Schema design, indexing, query plan আর দৈনন্দিন SQL Part V-এর
অংশ। এই section সেগুলো জানা ধরে নেয়, আর পুনরাবৃত্তি করে না।

## অধ্যায়গুলো

| #  | অধ্যায় | যে প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore) | কোন ধরনের store, আর copy-গুলো একমত না হলে একজন reader কী দেখতে পায়? |
| 02 | [বড় পরিসরে Sharding ও Transaction](#ch-sharding) | কোন shard key-র জন্য আফসোস করবেন না, আর machine-এর এপার-ওপারে কী ভেঙে যায়? |

## Interviewer-রা যা যাচাই করেন

- **আপনি কি access pattern থেকে বাছাই করেন?** "Relational, কারণ query নানা রকম আর টাকার ব্যাপার জড়িত" একটি
  কারণ। "NoSQL, কারণ এটা scale করে" কোনো কারণ নয়।
- **Replication কী দেয় না, তা কি জানেন?** Replica availability দেয়, backup নয়, আর নকশা অনুযায়ীই এরা stale
  data ফেরত দেয়।
- **আপনি কি একটি shard key-র পক্ষে যুক্তি দিতে পারেন?** Cardinality, সাধারণ query-টি এটা বহন করে কি না, এটা
  immutable কি না, আর এক কোটি follower-ওয়ালা account-টির কী হয়।
- **আপনি কি distributed transaction-এর দিকে হাত বাড়ান?** Senior উত্তর হলো, এমনভাবে সাজানো যাতে এটা লাগেই না।

## পড়ার ক্রম

01 → 02, ক্রম অনুযায়ী। এ দুটো data ছড়ানোর দুই উপায়: copy করা, বা ভাগ করা। 02-এর দ্বিতীয় অর্ধেক দেখায়,
একই সময়ের write দুটোর ওপর কী প্রভাব ফেলে।

**Interview sprint:** 02। এই section থেকে সবচেয়ে বেশি যে দুটো প্রশ্ন আসে, তা হলো shard key আর lost update।

> ⚠️ **Schema design, indexing আর query optimisation Part V-এ আছে**, implementation-এর গভীরতায়। CAP আর
> consistency pattern আছে [Chapter ?? — Reliability, Consistency ও CAP](#ch-consistency-and-cap)-এ।
> এই section শুধু সেই data নিয়ে, যা আর একটি machine-এ ধরে না।
