---
sourceHash: "c5bb242396a3d66dfffd353c5a6ad91bc6c49504827b1874cfca9ff0f7ac4403"
title: "পরিশিষ্ট — DSA Pattern"
translatedAt: "2026-10-13T03:11:13.263Z"
model: "claude-opus-5-5 (Claude Code)"
---

# পরিশিষ্ট — DSA Pattern

ষোলোটি pattern। রাখা হয়েছে, কারণ পাঠককে এখনো round-টা pass করতে হয়। আর পরিশিষ্টে নামানো হয়েছে, কারণ pattern
চেনা এই বইয়ের বিষয় নয়। এখানকার কিছুই আপনাকে ভালো engineer বানাবে না। এটা আপনাকে সেই পঁয়তাল্লিশ মিনিটে দ্রুত
করবে, যা আপনার আর কাজের সেই অংশগুলোর মাঝে দাঁড়িয়ে আছে, যেগুলো বাকি নয়টি part-এ আছে।

মূল দাবিটা হলো: hiring loop-এর প্রায় প্রতিটি algorithm প্রশ্ন অল্প কয়েকটি আকৃতির একটি, শুধু ছদ্মবেশে। কাজটা হলো
আকৃতিটা চেনা, algorithm আবিষ্কার করা নয়। প্রতিটি অধ্যায় সেভাবেই তৈরি: pattern-টি কী, প্রশ্নের কোন signal তা ফাঁস
করে দেয়, মুখস্থ রাখার মতো একটি template, দুটো সমাধান করা উদাহরণ, complexity, আর বাছাই করা সমস্যার একটি তালিকা।

## অধ্যায়গুলো

| #  | Pattern                                                                    | প্রশ্নের মধ্যে signal                                   |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Time ও Space Complexity](#ch-time-and-space-complexity)                 | `n`-এর ওপর যেকোনো constraint — এটা লক্ষ্য complexity বলে দেয়   |
| 02 | [Prefix Sum](#ch-prefix-sum)                                               | একটি স্থির array-র ওপর বারবার range query                    |
| 03 | [Two Pointers](#ch-two-pointers)                                           | একটি sorted array, আর খুঁজতে হবে একটি জোড়া বা ত্রয়ী                |
| 04 | [Sliding Window](#ch-sliding-window)                                       | "সবচেয়ে লম্বা" বা "সবচেয়ে ছোট" contiguous subarray                  |
| 05 | [Fast ও Slow Pointer](#ch-fast-and-slow-pointers)                       | একটি cycle, একটি মাঝের বিন্দু, বা constant extra space-এর শর্ত        |
| 06 | [In-Place Linked List Reversal](#ch-in-place-linked-list-reversal)         | একটি list বা তার একটি অংশ উল্টানো, কিছু allocate না করে              |
| 07 | [Monotonic Stack](#ch-monotonic-stack)                                     | প্রতিটি element-এর জন্য "next greater" বা "next smaller"           |
| 08 | [Top K Element](#ch-top-k-elements)                                       | সবকিছু sort না করে সবচেয়ে বড় বা সবচেয়ে বেশিবার আসা K-টি       |
| 09 | [Overlapping Interval](#ch-overlapping-intervals)                         | যেকোনো input, যা start আর end জোড়ার একটি list              |
| 10 | [Modified Binary Search](#ch-modified-binary-search)                       | Sorted কিন্তু rotated, বা একটি answer space-এ খোঁজা             |
| 11 | [Binary Tree Traversal](#ch-binary-tree-traversal)                         | সমস্যার যে ক্রম দরকার, সেটাই তার চাওয়া traversal        |
| 12 | [Depth-First Search](#ch-depth-first-search)                               | গভীর পর্যন্ত খোঁজা — path, island, connectivity          |
| 13 | [Breadth-First Search](#ch-breadth-first-search)                           | Unweighted graph-এ shortest path, বা level ধরে ধরে      |
| 14 | [Backtracking](#ch-backtracking)                                           | Permutation, combination, "সম্ভাব্য সবকিছু" ধরনের যেকোনো কিছু          |
| 15 | [Dynamic Programming](#ch-dynamic-programming)                             | Overlapping subproblem আর optimal substructure-এর গন্ধ    |
| 16 | [Graph Algorithm](#ch-graph-algorithms)                                   | Node আর edge, weighted path, dependency মেনে ক্রম সাজানো  |

## Interviewer-রা যা যাচাই করেন

`BOOK-SPEC.md`-এ এই পরিশিষ্টের জন্য কোনো senior signal নেই, কারণ এই round-এ বইয়ের বাকি অংশের মতো করে নম্বর দেওয়া
হয় না। যা দেখা হয়:

- **Code লেখার আগে কি আপনি clarify করেন?** Input-এর পরিসর, duplicate, খালি input, আর array-টি sorted কি না। এখানে
  ত্রিশ সেকেন্ড দিলে আপনি কোন pattern বেছে নেবেন তা বদলে যায়।
- **Complexity আর লক্ষ্যটা কি বলতে পারেন?** `n ≤ 10⁵`-এর একটি constraint `O(n²)`-কে বাদ দেয়, আর সেটা মুখে বলুন।
  Constraint-কে hint হিসেবে পড়াই অভিজ্ঞ দেখানোর সবচেয়ে দ্রুত উপায়।
- **Type করার আগে কি পদ্ধতিটা বলেন?** Interviewer-রা পদ্ধতিকে নম্বর দেন। মুখে বলা একটি পরিকল্পনা ভুল হলেও সামলে নেওয়া
  যায়; চুপচাপ লেখা code ভুল হলে যায় না।
- **নিজের solution কি test করতে পারেন?** কেউ না বললেও শেষ করা code-এর মধ্য দিয়ে একটি উদাহরণ আর একটি edge case চালিয়ে
  দেখা round-টা ভালোভাবে শেষ করে, আর মোটামুটি অর্ধেক off-by-one error ধরে ফেলে।

**একই প্রশ্নে, mid নাকি senior:**

| প্রশ্ন | Mid উত্তর | Senior উত্তর |
| ----- | ---------- | ------------- |
| `n ≤ 10⁵` দেওয়া আছে | Nested loop লিখে আশায় থাকেন | "এটা `O(n²)` বাদ দেয়, তাই এটা একটি hash map বা sorted array-তে two-pointer pass" |
| সমস্যাটা হাতে পেলে | Type করা শুরু করেন | Duplicate, খালি input আর sorted কি না তা clarify করেন, তারপর type করার আগে পরিকল্পনা বলেন |
| Solution শেষ হলে | "এটা কাজ করার কথা" | কেউ না বললেও code-এর মধ্য দিয়ে একটি সাধারণ case আর একটি edge case চালিয়ে দেখান |

## পড়ার ক্রম

আগে 01 — complexity অধ্যায়টাই বাকিগুলোকে বোধগম্য করে। তারপর সরাসরি ক্রমানুসারে: 02 থেকে 10 হলো array, string আর
pointer-এর pattern; 11 থেকে 16 হলো tree আর graph, আর ধাপে ধাপে কঠিন হয়। 03 আর 04 বাদ দেবেন না; এখানকার অন্য যেকোনো
জোড়ার চেয়ে এ দুটো বেশি প্রশ্নের ভিত্তি।

**Interview sprint:** 01 → 03 → 04 → 13 → 15। Complexity, two pointers, sliding window, BFS আর dynamic programming
মিলে যা জিজ্ঞেস করা হয় তার বেশিরভাগই ঢেকে দেয়।

> ⚠️ **প্রতিটি অধ্যায় চেনা শেখায়, প্রতিটি solution নয়।** আপনি পাবেন pattern-এর signal, এটা কীভাবে কাজ করে, সাধারণ
> ভুল আর বাছাই করা সমস্যার একটি table। সেই সমস্যাগুলো নিজে সমাধান করুন: সময়ের চাপে pattern চিনতে পারাই সেই দক্ষতা,
> যা round-টি পরীক্ষা করে।
