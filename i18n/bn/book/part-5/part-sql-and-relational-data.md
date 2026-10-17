---
sourceHash: "b4a41b5da7b330d16a4fff98e4c1eaddd420fff4d7ce25247bc319d82c12312c"
title: "Part V — SQL ও Relational Data"
translatedAt: "2026-10-17T14:00:07.960Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — SQL ও Relational Data

এখানে কী থাকবে, তা ঠিক করেছে একটি প্রশ্ন: schema design করতে, query plan পড়তে, আর downtime ছাড়া চালু database
বদলাতে একজন frontend-heavy engineer-এর কী জানা দরকার? Database-এর পুরো course-এর তুলনায় এটা অনেক ছোট তালিকা,
আর interview-এ ঠিক এগুলোই আসে।

পুরো অংশে উদাহরণ হিসেবে Postgres ব্যবহার করা হয়েছে। ধারণাগুলো অন্য database-এও খাটে, syntax-এর বেশিরভাগও।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) | Query-টা লিখতে পারেন কি, আর ভুল data যাতে store-ই না হতে পারে, তা নিশ্চিত করতে পারেন কি? |
| 02 | [Index, Query Plan, ORM ও Migration](#ch-indexes) | এই `WHERE` clause কোন index ব্যবহার করে, আর traffic চলার সময় schema বদলাবেন কীভাবে? |
| 03 | [Transaction ও Concurrency](#ch-sql-transactions) | দুটি request যাতে একে অপরের লেখা মুছে না দেয়, তা কে আটকায়? |

## Interviewer-রা যা যাচাই করেন

Senior হওয়ার সংকেত হলো **query কেন ধীর, তা জানা।** বাস্তবে এর মানে:

- **Clause কোন ক্রমে চলে।** `SELECT`-এর alias কেন `ORDER BY`-তে চলে কিন্তু `WHERE`-এ চলে না, আর `LEFT JOIN`-এর
  outer table-এর filter কেন `ON`-এ লিখতে হয়।
- **Composite index-এর ক্রম।** আগে equality, তারপর sort, তারপর range। "Index তো আছে" অথচ query ধীর — বাস্তবে এর
  সবচেয়ে সাধারণ কারণ এই ক্রম ভুল হওয়া।
- **Isolation level।** `READ COMMITTED`-এ lost update হতে পারে, আর তখন কী করবেন।
- **Zero-downtime migration।** Expand, backfill, deploy, contract। আর কোন DDL statement এমন lock নেয় যে service
  থেমে যায়।
- **`EXPLAIN ANALYZE`।** আসল খবর execution time নয়, বরং আনুমানিক আর আসল row-সংখ্যার মধ্যে বড় ফারাক।

## পড়ার ক্রম

আগে 01। তারপর 02: এই অধ্যায়টাই আপনার query লেখার ধরন বদলে দেয়। 03 পড়ুন যখন concurrency-র সমস্যা সামনে আসে।

**Interview sprint:** 02 → 03 → 01।
