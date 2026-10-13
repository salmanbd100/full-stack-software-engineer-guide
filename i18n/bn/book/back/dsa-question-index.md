---
sourceHash: "d7081aff152179703c0486872995574d07c619461ede507fee3d9edf8d865589"
title: "Interview প্রশ্নের সূচি"
translatedAt: "2026-10-13T03:14:44.705Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Interview প্রশ্নের সূচি {#ch-dsa-question-index}

> বিশ মিনিটে একটি part-এর ওপর নিজেকে যাচাই করুন, আর জেনে নিন কোন অধ্যায়গুলো আসলেই আবার পড়তে হবে।

**এই সূচিতে:** কীভাবে ব্যবহার করবেন · বইয়ের প্রতিটি প্রশ্ন · part আর অধ্যায় অনুযায়ী সাজানো · প্রতিটি অধ্যায়ের link

নিচের প্রতিটি প্রশ্ন নেওয়া হয়েছে Book 2-এর প্রতিটি pattern-এর শেষের **Interview Questions** block থেকে। মোট
**16টি অধ্যায়ে 87টি প্রশ্ন**। উত্তর এখানে আবার দেওয়া হয়নি — সেগুলো অধ্যায়ে আছে। প্রতিটি heading-এর link সেজন্যই।

## কীভাবে ব্যবহার করবেন

আগে জোরে বলে উত্তর দিন, তারপর মিলিয়ে দেখুন। এই দুটোই অর্ধেক অর্ধেক। প্রথমটা বাদ দিলে পাঠক নিজেকে তৈরি মনে করে,
তারপর interview-এর ঘরে গিয়ে আটকে যায়।

1. **জোরে বলে উত্তর দিন, নব্বই সেকেন্ডের মধ্যে।** যা আপনি চিনতে পারেন আর যা আপনি বলতে পারেন — এই দুটোর ফাঁকটাই loop
   মাপে। চুপচাপ পড়লে সেই ফাঁক লুকিয়ে থাকে।
2. **প্রতিটিকে চিহ্নিত করুন: সাবলীল, নড়বড়ে, নাকি ফাঁকা।** তিনটি ভাগই যথেষ্ট। এর চেয়ে সূক্ষ্ম মাপকাঠি মানে কাজ ফেলে রাখা।
3. **শুধু নড়বড়ে আর ফাঁকাগুলোর জন্য অধ্যায় খুলুন।** যা আগেই জানেন তা আবার পড়া, এক সপ্তাহ নষ্ট করার সবচেয়ে আরামদায়ক উপায়।
4. **তিন দিন পর একই part-এ ফিরে আসুন।** প্রথম বাহাত্তর ঘণ্টায় মনে রাখা সবচেয়ে দ্রুত কমে। তাই আসল revision হয়
   দ্বিতীয়বারে।

যে part-এর আশি শতাংশ প্রশ্নের উত্তর জোরে বলতে পারেন, সেটার revision থামাতে পারেন। যেটায় অর্ধেকের কম পান, সেটা
ঠিকভাবে পড়তে হবে, আবার চোখ বুলিয়ে নিলে চলবে না।

> ⚠️ **আপনাকে ঠিক এই প্রশ্নগুলোই করা হবে না।** এগুলো সেই প্রশ্ন, যেগুলোর উত্তর বই দেয় — সেটা আলাদা একটি set। তালিকাটা
> মুখস্থ করা এর ভুল ব্যবহার। প্রতিটি প্রশ্ন একটি ব্যাখ্যা নতুন করে গড়ে তোলার সূত্র। Interview-এ একই প্রশ্ন আসবে অন্য
> শব্দে মোড়ানো অবস্থায়।

## পরিশিষ্ট — DSA Pattern

_16টি অধ্যায়ে 87টি প্রশ্ন।_

- **[Time ও Space Complexity](#ch-time-and-space-complexity)**
  - আপনার solution-এর time আর space complexity কত, আর আপনি কীভাবে জানলেন?
  - Constraint বলছে `n ≤ 10⁵`। Problem পড়ার আগেই এটা আপনাকে কী বলে দেয়?
  - `O(1)` কি সবসময় `O(n)`-এর চেয়ে দ্রুত?
  - কখন আপনি ইচ্ছা করে ধীর complexity বেছে নেবেন?
  - একটি dynamic array-তে append করা `O(1)` কেন, যখন মাঝে মাঝে সবকিছু copy করতে হয়?
- **[Prefix Sum](#ch-prefix-sum)**
  - Prefix array-তে `n + 1`টি entry কেন থাকে?
  - "যোগফল k হয় এমন subarray গোনা" কীভাবে একটি hash-map problem হয়ে যায়?
  - কখন আপনি prefix sum ব্যবহার করবেন না?
  - Array-এর সব সংখ্যা positive, আর প্রশ্ন চাইছে যোগফল `k` এমন একটি subarray। কী বদলায়?
- **[Two Pointers](#ch-two-pointers)**
  - যোগফল খুব ছোট হলে একটি element বাদ দেওয়া নিরাপদ কেন?
  - Container With Most Water-এ ছোট দেয়ালটা কেন সরাবেন?
  - Two pointers আর sliding window-এর পার্থক্য কী?
  - Sorted array-তে কখন আপনি two pointers ব্যবহার করবেন না?
  - 3Sum-এ `Set` ছাড়া duplicate triplet কীভাবে এড়াবেন?
- **[Sliding Window](#ch-sliding-window)**
  - `for` loop-এর ভেতরে একটি `while` loop আছে। তাহলে এটা `O(n²)` না হয়ে `O(n)` কেন?
  - Window-এর জন্য কী store করবেন, তা কীভাবে ঠিক করেন?
  - Negative সংখ্যাওয়ালা array-তে sliding window কেন কাজ করে না?
  - Problem একটি size বলে দিলেও কখন fixed window ভুল পছন্দ?
  - Minimum Window Substring সাধারণ template থেকে কীভাবে আলাদা?
- **[Fast ও Slow Pointer](#ch-fast-and-slow-pointers)**
  - একটি cycle-এর ভেতরে fast pointer কেন সবসময় slow pointer-কে ধরে ফেলে? এটা কি টপকে যেতে পারে?
  - 2:1 কেন, 3:1 নয় কেন?
  - কখন এর বদলে একটি `Set` ব্যবহার করবেন?
  - Find the Duplicate Number কীভাবে একটি cycle problem হয়ে যায়?
  - Input যদি doubly linked list বা tree হয়, তাহলে কী ভেঙে যায়?
- **[In-Place Linked List Reversal](#ch-in-place-linked-list-reversal)**
  - ধাপে ধাপে দেখান, তিনটি assignment কেন ঠিক ওই ক্রমেই হতে হবে।
  - `head` নয়, `prev` return করবেন কেন?
  - Reverse Linked List II-তে dummy node আসলে আপনাকে কী দেয়?
  - কখন recursive version বেশি পছন্দ করবেন?
  - শেষের অসম্পূর্ণ group না ভেঙে `k`-এর group-এ কীভাবে reverse করবেন?
- **[Monotonic Stack](#ch-monotonic-stack)**
  - `for` loop-এর ভেতরে একটি `while` loop আছে। তাহলে এটা `O(n)` কেন?
  - Value-র বদলে index store করবেন কেন?
  - Increasing আর decreasing stack-এর মধ্যে কীভাবে বেছে নেবেন?
  - প্রশ্নে "maximum" থাকলেও কখন monotonic stack ভুল tool?
  - Largest Rectangle in Histogram এই pattern কীভাবে ব্যবহার করে?
- **[Top K Element](#ch-top-k-elements)**
  - সবচেয়ে বড় `k`টির জন্য min-heap কেন? শুনে উল্টো মনে হয়।
  - Sort করার তুলনায় আসল সাশ্রয়টা কী?
  - কখন এর বদলে quickselect ব্যবহার করবেন?
  - একটি stream-এর median কীভাবে বের করবেন?
  - নিশ্চিত linear time-এ Top K Frequent Elements — কীভাবে?
- **[Overlapping Interval](#ch-overlapping-intervals)**
  - প্রথম পদক্ষেপ sort করা কেন, আর এতে আপনার খরচ কত?
  - Overlap-এর শর্তটা বলুন, আর বলুন diagram-এর চারটি case কেন অপ্রয়োজনীয়।
  - Interval merge করে Meeting Rooms II কেন সমাধান করা যায় না?
  - "সবচেয়ে বেশি সংখ্যক non-overlapping interval রাখা"-র greedy কেন end time দিয়ে sort করে?
  - যে interval একটানা আসতে থাকে আর live query করতে হয়, সেগুলো কীভাবে সামলাবেন?
- **[Modified Binary Search](#ch-modified-binary-search)**
  - আপনার loop কোন invariant বজায় রাখে, বলুন।
  - `high = mid` সহ `while (low <= high)` কেন অনন্তকাল loop করে?
  - আগে rotation point না খুঁজে একটি rotated sorted array-তে কীভাবে search করবেন?
  - Rotated array-তে duplicate থাকলে কী ভেঙে যায়?
  - যে problem answer space-এর ওপর binary search চায়, সেটা কীভাবে চিনবেন?
  - Sorted array-তেও কখন binary search ভুল উত্তর?
- **[Binary Tree Traversal](#ch-binary-tree-traversal)**
  - একটি BST-এর inorder traversal কেন sorted output দেয়?
  - একটি tree-এর height বের করতে কোন traversal, আর কেন?
  - Recursion ছাড়া কীভাবে traverse করবেন, আর কখন সেটা গুরুত্বপূর্ণ?
  - Level order আর depth-first-এর space complexity কত, আর কোনটা সস্তা?
  - প্রতিটি node-কে তার দুটো child-এর সঙ্গে তুলনা করে একটি BST validate করা যায় না কেন?
  - শুধু inorder দিয়ে যখন পারা যায় না, preorder কীভাবে একটি tree আবার গড়তে দেয়?
- **[Depth-First Search](#ch-depth-first-search)**
  - Tree traversal-এ visited set লাগে না, কিন্তু graph-এ DFS-এর জন্য লাগে কেন?
  - ঠিক কোথায় একটি node-কে visited হিসেবে চিহ্নিত করবেন, আর ভুল করলে কী ভেঙে যায়?
  - কখন এর বদলে BFS সঠিক পছন্দ?
  - DFS দিয়ে একটি directed graph-এ cycle কীভাবে detect করবেন?
  - DFS আর backtracking-এর পার্থক্য কী?
  - Graph-এ 10⁵টি node একটি chain-এ আছে। কী বদলায়?
- **[Breadth-First Search](#ch-breadth-first-search)**
  - BFS কেন shortest path-এর নিশ্চয়তা দেয়, আর DFS কেন দেয় না?
  - Node-গুলোকে কোথায় visited হিসেবে চিহ্নিত করবেন, আর না করলে কী ভুল হয়?
  - কখন DFS ভালো পছন্দ?
  - Multi-source BFS কী, আর কখন এটা খাটে?
  - শুধু দৈর্ঘ্য নয়, আসল path-টা কীভাবে ফিরে পাবেন?
  - BFS কি recursive-ভাবে লেখা যায়?
- **[Backtracking](#ch-backtracking)**
  - Backtracking আর DFS-এর পার্থক্য কী?
  - একটি result record করার সময় বর্তমান path-টা copy করতে হয় কেন?
  - `explore(i + 1)` কেন subset দেয়, আর `explore(0)` কেন permutation দেয়?
  - Input-এ duplicate থাকলে কীভাবে সামলাবেন?
  - কখন এর বদলে dynamic programming ব্যবহার করবেন?
  - একটি backtracking solution-এর time complexity কত, আর সেটা কীভাবে প্রমাণ করবেন?
- **[Dynamic Programming](#ch-dynamic-programming)**
  - DP খাটার জন্য একটি problem-এর কোন দুটি বৈশিষ্ট্য থাকতেই হবে?
  - Memoisation নাকি tabulation — কীভাবে বেছে নেবেন?
  - State কী হবে, তা কীভাবে ঠিক করেন?
  - এমন একটি problem বলুন, যেখানে greedy ব্যর্থ হয় আর DP সফল হয়, আর বলুন কেন।
  - একটি DP solution-কে কীভাবে `O(1)` space-এ নামিয়ে আনবেন?
  - কখন DP-র বদলে backtracking সঠিক উত্তর?
- **[Graph Algorithm](#ch-graph-algorithms)**
  - কোনো graph code লেখার আগে আপনি কী জিজ্ঞেস করেন?
  - Kahn's algorithm কীভাবে একটি cycle detect করে?
  - BFS-এর শুধু একটি queue লাগে, Dijkstra-র heap লাগে কেন?
  - Negative edge weight-এ Dijkstra কেন ভেঙে যায়?
  - কখন DFS বা BFS-এর বদলে Union-Find ব্যবহার করবেন?
  - Undirected graph-এ cycle detection আলাদা কেন?
  - সাধারণ Dijkstra কেন Cheapest Flights Within K Stops সমাধান করে না?

## এরপর কী পড়বেন

- [Chapter ?? — DSA Pattern](#ch-dsa-index) — ষোলোটি pattern, আর কোন ক্রমে শিখবেন
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — ওপরের প্রতিটি উত্তর যে শব্দভান্ডারে মূল্যায়ন করা হয়
