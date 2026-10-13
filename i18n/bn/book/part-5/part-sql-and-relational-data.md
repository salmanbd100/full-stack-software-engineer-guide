---
sourceHash: "b4a41b5da7b330d16a4fff98e4c1eaddd420fff4d7ce25247bc319d82c12312c"
title: "Part V — SQL ও Relational Data"
translatedAt: "2026-10-12T12:21:21.626Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — SQL ও Relational Data

এখানকার পরিধি ঠিক করে একটি প্রশ্ন: একজন frontend-heavy engineer-এর schema design করতে, একটি query plan পড়তে,
আর downtime ছাড়া একটি live database বদলাতে কী জানা দরকার? সেটা একটি database course-এর চেয়ে অনেক ছোট
একটি set, আর এই set-টাই আসলে সামনে আসে।

পুরো অংশ জুড়ে উদাহরণ হিসেবে Postgres ব্যবহার করা হয়েছে। ধারণাগুলো অন্য জায়গাতেও খাটে, আর বেশিরভাগ syntax-ও।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) | আপনি কি query-টি লিখতে পারেন, আর invalid data store করা অসম্ভব করে দিতে পারেন? |
| 02 | [Index, Query Plan, ORM ও Migration](#ch-indexes) | এই `WHERE` clause কোন index ব্যবহার করে, আর traffic চলা অবস্থায় schema কীভাবে বদলাবেন? |
| 03 | [Transaction ও Concurrency](#ch-sql-transactions) | দুটি request-কে একে অপরের ওপর overwrite করা থেকে কী আটকায়? |

## Interviewer-রা যা যাচাই করেন

Senior হওয়ার সংকেত হলো **query কেন ধীর, সেটা জানা।** বাস্তবে:

- **Clause evaluation-এর ক্রম।** একটি `SELECT` alias কেন `ORDER BY`-তে কাজ করে কিন্তু `WHERE`-এ করে না, আর
  একটি `LEFT JOIN`-এর outer table-এর filter কেন `ON`-এ থাকা উচিত।
- **Composite index-এর ক্রম।** আগে equality, তারপর sort, তারপর range। এটা ভুল করাই "index আছে" এমন ধীর
  query-র সবচেয়ে সাধারণ আসল কারণ।
- **Isolation level।** `READ COMMITTED` যে lost update হতে দেয়, আর তা নিয়ে আপনি কী করেন।
- **Zero-downtime migration।** Expand, backfill, deploy, contract। আর কোন DDL statement এমন lock নেয়, যেটা
  service থামিয়ে দেয়।
- **`EXPLAIN ANALYZE`।** Estimated আর actual row-এর মধ্যে বড় ফারাকটাই আসল আবিষ্কার, execution time নয়।

## পড়ার ক্রম

আগে 01। তারপর 02: এই অধ্যায়টাই আপনার query লেখার ধরন বদলে দেয়। Concurrency সামনে এলে 03।

**Interview sprint:** 02 → 03 → 01.
