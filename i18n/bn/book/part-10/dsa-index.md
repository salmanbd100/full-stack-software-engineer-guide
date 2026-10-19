---
sourceHash: "c5bb242396a3d66dfffd353c5a6ad91bc6c49504827b1874cfca9ff0f7ac4403"
title: "পরিশিষ্ট — DSA Pattern"
translatedAt: "2026-10-19T10:27:54.098Z"
model: "claude-opus-5-5 (Claude Code)"
---

# পরিশিষ্ট — DSA Pattern

এখানে ষোলোটি pattern আছে। রেখে দেওয়া হয়েছে, কারণ round-টা পাঠককে এখনো pass করতে হয়। আবার পরিশিষ্টে
সরিয়েও রাখা হয়েছে, কারণ pattern চেনা এই বইয়ের আসল বিষয় নয়। এখানকার কিছুই আপনাকে ভালো engineer বানাবে না।
তবে ওই পঁয়তাল্লিশ মিনিট আপনি দ্রুত পার হতে পারবেন। আর ওই পঁয়তাল্লিশ মিনিট পার হলেই আসল কাজ, যার কথা বাকি
নয়টি part-এ বলা আছে।

পুরো পরিশিষ্টের দাবি একটিই: hiring loop-এর প্রায় সব algorithm প্রশ্ন আসলে হাতে-গোনা কয়েকটি ধাঁচের একটি, শুধু
পোশাক বদলে আসে। আপনার কাজ ধাঁচটা চেনা, নতুন algorithm আবিষ্কার করা নয়। প্রতিটি অধ্যায় সেভাবেই সাজানো:
pattern-টা কী, প্রশ্নের কোন সংকেত দেখে সেটা ধরা যায়, মুখস্থ রাখার মতো একটি template, দুটি করা উদাহরণ,
complexity, আর বাছাই করা problem-এর তালিকা।

## অধ্যায়গুলো

| #  | Pattern | প্রশ্নের যে সংকেতে চেনা যায় |
| -- | ------- | --------------------------- |
| 01 | [Time ও Space Complexity](#ch-time-and-space-complexity) | `n`-এর ওপর যেকোনো constraint — কোন complexity লাগবে, সেটা ওখানেই বলা থাকে |
| 02 | [Prefix Sum](#ch-prefix-sum) | একই array-এর ওপর বারবার range query |
| 03 | [Two Pointers](#ch-two-pointers) | Sorted array, আর খুঁজতে হবে একজোড়া বা তিনটি সংখ্যা |
| 04 | [Sliding Window](#ch-sliding-window) | "সবচেয়ে লম্বা" বা "সবচেয়ে ছোট" contiguous subarray |
| 05 | [Fast ও Slow Pointer](#ch-fast-and-slow-pointers) | Cycle, মাঝের বিন্দু, বা বাড়তি জায়গা শুধু constant |
| 06 | [In-Place Linked List Reversal](#ch-in-place-linked-list-reversal) | পুরো list বা তার কোনো অংশ উল্টাতে হবে, নতুন কিছু allocate না করে |
| 07 | [Monotonic Stack](#ch-monotonic-stack) | প্রতিটি element-এর "next greater" বা "next smaller" |
| 08 | [Top K Element](#ch-top-k-elements) | সবচেয়ে বড় বা সবচেয়ে বেশিবার আসা K-টি, সব sort না করে |
| 09 | [Overlapping Interval](#ch-overlapping-intervals) | Input যদি start আর end-এর জোড়ার তালিকা হয় |
| 10 | [Modified Binary Search](#ch-modified-binary-search) | Sorted কিন্তু rotated, অথবা answer space-এ খোঁজা |
| 11 | [Binary Tree Traversal](#ch-binary-tree-traversal) | Problem যে ক্রম চায়, সেটাই তার traversal |
| 12 | [Depth-First Search](#ch-depth-first-search) | গভীর পর্যন্ত খুঁজে দেখা — path, island, connectivity |
| 13 | [Breadth-First Search](#ch-breadth-first-search) | Unweighted graph-এ shortest path, অথবা level ধরে ধরে |
| 14 | [Backtracking](#ch-backtracking) | Permutation, combination, "সম্ভাব্য সব" কিছু |
| 15 | [Dynamic Programming](#ch-dynamic-programming) | Overlapping subproblem, আর optimal substructure-এর গন্ধ |
| 16 | [Graph Algorithm](#ch-graph-algorithms) | Node আর edge, weighted path, dependency মেনে ক্রম সাজানো |

## Interviewer-রা যা যাচাই করেন

এই পরিশিষ্টের জন্য `BOOK-SPEC.md`-এ কোনো senior signal নেই। কারণ এই round বইয়ের বাকি অংশের মতো করে নম্বর পায়
না। Interviewer যা খেয়াল করেন:

- **Code লেখার আগে প্রশ্ন করে সব পরিষ্কার করে নেন কি?** Input-এর range, duplicate আছে কিনা, input খালি হতে
  পারে কিনা, array sorted কিনা। এখানে ত্রিশ সেকেন্ড খরচ করলে কোন pattern ধরবেন, সেটাই বদলে যায়।
- **Complexity বলতে পারেন, আর কোন complexity লাগবে সেটা?** `n ≤ 10⁵` constraint থাকলে `O(n²)` বাদ, আর সেটা
  মুখে বলুন। Constraint-কে hint হিসেবে পড়াই অভিজ্ঞ দেখানোর সবচেয়ে দ্রুত উপায়।
- **Type করার আগে পদ্ধতিটা মুখে বলেন?** Interviewer পদ্ধতিকেই নম্বর দেন। মুখে বলা plan ভুল হলে সামলে নেওয়া
  যায়। চুপচাপ লেখা code ভুল হলে আর যায় না।
- **নিজের solution নিজে test করতে পারেন?** শেষ হওয়া code-এর ভেতর দিয়ে একটি সাধারণ উদাহরণ আর একটি edge case
  চালিয়ে দেখান, কেউ না বললেও। এতে round ভালোভাবে শেষ হয়, আর off-by-one ভুলের প্রায় অর্ধেক ধরা পড়ে।

**একই প্রশ্নে mid আর senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| `n ≤ 10⁵` দেওয়া আছে | Nested loop লিখে আশায় থাকেন | "এতে `O(n²)` বাদ, তাই এটা hash map, নয়তো sorted array-এ two-pointer pass" |
| Problem হাতে পেলেন | Type করা শুরু করেন | Duplicate, খালি input আর sorted কিনা জেনে নেন, তারপর type করার আগে plan বলেন |
| Solution শেষ | "এটা কাজ করার কথা" | কেউ না বললেও code-এর ভেতর দিয়ে একটি সাধারণ case আর একটি edge case চালিয়ে দেখান |

## পড়ার ক্রম

আগে 01 পড়ুন। Complexity-র অধ্যায়টা পড়া থাকলে বাকিগুলো বোঝা সহজ হয়। তারপর পরপর পড়ে যান: 02 থেকে 10 হলো
array, string আর pointer-এর pattern। 11 থেকে 16 হলো tree আর graph, আর এগুলো ধাপে ধাপে কঠিন হয়। 03 আর 04 বাদ
দেবেন না। এখানকার অন্য যেকোনো জোড়ার চেয়ে এই দুটি অধ্যায়ের ওপর বেশি প্রশ্ন দাঁড়িয়ে থাকে।

**Interview sprint:** 01 → 03 → 04 → 13 → 15। Complexity, two pointers, sliding window, BFS আর dynamic
programming মিলে যা জিজ্ঞেস করা হয় তার বেশিরভাগই ঢেকে দেয়।

> ⚠️ **প্রতিটি অধ্যায় চিনতে শেখায়, সব solution দেয় না।** আপনি পাবেন pattern-এর সংকেত, সেটা কীভাবে কাজ করে,
> সাধারণ ভুল, আর বাছাই করা problem-এর table। Problem-গুলো নিজে solve করুন। চাপের মধ্যে pattern চিনতে পারাটাই
> সেই দক্ষতা, যা এই round যাচাই করে।
