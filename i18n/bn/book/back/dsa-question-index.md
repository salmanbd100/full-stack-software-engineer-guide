---
sourceHash: "d7081aff152179703c0486872995574d07c619461ede507fee3d9edf8d865589"
title: "Interview প্রশ্নের সূচি"
translatedAt: "2026-10-19T10:25:34.440Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Interview প্রশ্নের সূচি {#ch-dsa-question-index}

> বিশ মিনিটে একটি Part-এর ওপর নিজেকে যাচাই করুন, আর বের করুন কোন অধ্যায়গুলো আসলেই আবার পড়তে হবে।

**এই সূচিতে:** কীভাবে ব্যবহার করবেন · বইয়ের প্রতিটি প্রশ্ন · Part আর অধ্যায় ধরে সাজানো · প্রতিটি অধ্যায়ের link

নিচের প্রতিটি প্রশ্ন নেওয়া হয়েছে Book 2-এর প্রতিটি pattern-এর শেষের **Interview-এর প্রশ্ন** অংশ থেকে। মোট
**16টি অধ্যায়ে 87টি প্রশ্ন**। উত্তর এখানে আবার দেওয়া হয়নি। উত্তর আছে অধ্যায়েই, আর প্রতিটি heading-এর link এ
জন্যই।

## কীভাবে ব্যবহার করবেন

আগে জোরে বলে উত্তর দিন, তারপর মিলিয়ে দেখুন। কাজটার এই দুটি অর্ধেক। প্রথমটা বাদ দিলেই মনে হয় আপনি তৈরি,
তারপর interview-এর ঘরে গিয়ে আটকে যান।

1. **জোরে বলে উত্তর দিন, নব্বই সেকেন্ডের মধ্যে।** যা দেখলে চেনেন আর যা মুখে বলতে পারেন, এই দুইয়ের ফাঁকটাই loop
   আসলে মাপে। মনে মনে পড়লে ফাঁকটা লুকিয়ে থাকে।
2. **প্রতিটিকে সাবলীল, নড়বড়ে বা ফাঁকা বলে চিহ্ন দিন।** তিনটি ভাগই যথেষ্ট। এর চেয়ে সূক্ষ্ম মাপকাঠি আসলে কাজ পিছিয়ে
   দেওয়ার অজুহাত।
3. **শুধু নড়বড়ে আর ফাঁকাগুলোর জন্য অধ্যায় খুলুন।** যা আগেই জানেন সেটা আবার পড়া, এক সপ্তাহ নষ্ট করার সবচেয়ে আরামের
   উপায়।
4. **তিন দিন পরে একই Part-এ ফিরে আসুন।** প্রথম বাহাত্তর ঘণ্টায় মনে রাখার ক্ষমতা সবচেয়ে দ্রুত কমে। তাই আসল ঝালাই হয়
   দ্বিতীয়বারে।

যে Part-এর আশি শতাংশ প্রশ্নের উত্তর জোরে বলে দিতে পারেন, সেটা আর ঝালানোর দরকার নেই। যে Part-এ অর্ধেকের কম পান,
সেটা চোখ বুলিয়ে নয়, ঠিকমতো বসে পড়তে হবে।

> ⚠️ **এগুলো সেই প্রশ্ন নয়, যা আপনাকে জিজ্ঞেস করা হবে।** এগুলো সেই প্রশ্ন, যার উত্তর বইটা দেয়, আর দুটি আলাদা
> জিনিস। তালিকাটা মুখস্থ করলে এর ভুল ব্যবহার হবে। প্রতিটি প্রশ্ন একটি ব্যাখ্যা নিজে আবার গড়ে তোলার সূত্র। Interview-এ
> একই প্রশ্ন আসবে অন্য শব্দে মোড়া হয়ে।

## পরিশিষ্ট — DSA Pattern

_16টি অধ্যায়ে 87টি প্রশ্ন।_

- **[Time ও Space Complexity](#ch-time-and-space-complexity)**
  - আপনার সমাধানের time আর space complexity কত, আর সেটা কীভাবে জানলেন?
  - Constraint-এ লেখা `n ≤ 10⁵`। Problem পড়ার আগেই এটা আপনাকে কী বলে দেয়?
  - `O(1)` কি সবসময় `O(n)`-এর চেয়ে দ্রুত?
  - কখন জেনে-বুঝে ধীর complexity বেছে নেবেন?
  - Dynamic array-তে append করা `O(1)` কেন, যখন মাঝে মাঝে পুরোটাই copy করতে হয়?
- **[Prefix Sum](#ch-prefix-sum)**
  - Prefix array-তে `n + 1`টি entry কেন?
  - "k যোগফলের subarray গোনা" কীভাবে hash-map-এর problem হয়ে যায়?
  - কখন prefix sum ব্যবহার করবেন না?
  - Array-র সব সংখ্যা positive, আর প্রশ্ন চাইছে এমন subarray যার যোগফল `k`। কী বদলায়?
- **[Two Pointers](#ch-two-pointers)**
  - যোগফল খুব ছোট হলে একটি element বাদ দেওয়া নিরাপদ কেন?
  - Container With Most Water-এ ছোট দেয়ালটাই কেন সরান?
  - Two pointers আর sliding window-এর পার্থক্য কী?
  - Sorted array-তেও কখন two pointers বেছে নেবেন না?
  - 3Sum-এ `Set` ছাড়া duplicate triplet কীভাবে এড়াবেন?
- **[Sliding Window](#ch-sliding-window)**
  - `for` loop-এর ভেতরে একটি `while` loop আছে। তবু এটা `O(n²)` না হয়ে `O(n)` কেন?
  - Window-র জন্য কী জমিয়ে রাখবেন, তা কীভাবে ঠিক করেন?
  - Negative সংখ্যা থাকা array-তে sliding window কেন কাজ করে না?
  - Problem কোনো size বলে দিলেও কখন fixed window ভুল পছন্দ?
  - Minimum Window Substring সাধারণ template থেকে কোথায় আলাদা?
- **[Fast ও Slow Pointer](#ch-fast-and-slow-pointers)**
  - Cycle-এর ভেতরে fast pointer সবসময় slow pointer-কে ধরে ফেলে কেন? লাফিয়ে পার হয়ে যেতে পারে না?
  - 3:1 নয়, 2:1 কেন?
  - কখন এর বদলে `Set` ব্যবহার করবেন?
  - Find the Duplicate Number কীভাবে cycle-এর problem হয়ে যায়?
  - Input যদি doubly linked list বা tree হয়, কী ভাঙে?
- **[In-Place Linked List Reversal](#ch-in-place-linked-list-reversal)**
  - তিনটি assignment ঠিক ওই ক্রমেই কেন হতে হবে, ধাপে ধাপে দেখান।
  - `head` নয়, `prev` return করেন কেন?
  - Reverse Linked List II-তে dummy node আসলে কী সুবিধা দেয়?
  - কখন recursive version বেশি পছন্দ করবেন?
  - শেষের অসম্পূর্ণ group না ভেঙে `k`-এর group-এ কীভাবে reverse করবেন?
- **[Monotonic Stack](#ch-monotonic-stack)**
  - `for` loop-এর ভেতরে একটি `while` loop আছে। তবু এটা `O(n)` কেন?
  - Value নয়, index জমিয়ে রাখেন কেন?
  - Increasing না decreasing stack, কীভাবে ঠিক করেন?
  - প্রশ্নে "maximum" কথাটা থাকলেও কখন monotonic stack ভুল হাতিয়ার?
  - Largest Rectangle in Histogram এই pattern কীভাবে ব্যবহার করে?
- **[Top K Element](#ch-top-k-elements)**
  - সবচেয়ে বড় `k`টির জন্য min-heap কেন? শুনতে উল্টো লাগে।
  - Sort করার চেয়ে আসল সাশ্রয়টা কোথায়?
  - কখন এর বদলে quickselect ব্যবহার করবেন?
  - একটি stream-এর median কীভাবে বের করবেন?
  - Top K Frequent Elements নিশ্চিতভাবে linear time-এ, কীভাবে?
- **[Overlapping Interval](#ch-overlapping-intervals)**
  - প্রথম চাল কেন sort করা, আর এর খরচ কত?
  - Overlap-এর শর্তটা বলুন, আর diagram-এর চারটি case কেন অপ্রয়োজনীয়, তা বলুন।
  - Interval merge করে Meeting Rooms II কেন সমাধান করা যায় না?
  - "সবচেয়ে বেশি সংখ্যক non-overlapping interval রাখুন"-এর greedy সমাধান কেন end time ধরে sort করে?
  - Interval যদি একটানা আসতে থাকে আর সঙ্গে সঙ্গে query করতে হয়, কীভাবে সামলাবেন?
- **[Modified Binary Search](#ch-modified-binary-search)**
  - আপনার loop কোন invariant ধরে রাখে, বলুন।
  - `high = mid` দিয়ে `while (low <= high)` কেন অনন্তকাল loop করে?
  - Rotation point আগে না খুঁজে rotated sorted array-তে কীভাবে search করবেন?
  - Rotated array-তে duplicate থাকলে কী ভাঙে?
  - কোন problem answer space-এর ওপর binary search চাইছে, তা কীভাবে চেনেন?
  - Sorted array-তেও কখন binary search ভুল উত্তর?
- **[Binary Tree Traversal](#ch-binary-tree-traversal)**
  - BST-র inorder traversal কেন sorted output দেয়?
  - Tree-র height বের করতে কোন traversal, আর কেন?
  - Recursion ছাড়া কীভাবে traverse করবেন, আর কখন সেটা গুরুত্বপূর্ণ?
  - Level order আর depth-first-এর space complexity কত, আর কোনটা সস্তা?
  - প্রতিটি node-কে তার দুটি child-এর সঙ্গে মিলিয়ে BST validate করা যায় না কেন?
  - শুধু inorder দিয়ে যেখানে পারা যায় না, preorder দিয়ে সেখানে tree আবার কীভাবে গড়া যায়?
- **[Depth-First Search](#ch-depth-first-search)**
  - Tree traversal-এ visited set লাগে না, অথচ graph-এ DFS-এর লাগে কেন?
  - ঠিক কোথায় একটি node-কে visited চিহ্ন দেন, আর ভুল জায়গায় দিলে কী ভাঙে?
  - কখন এর বদলে BFS ঠিক পছন্দ?
  - DFS দিয়ে directed graph-এ cycle কীভাবে ধরবেন?
  - DFS আর backtracking-এর পার্থক্য কী?
  - Graph-এ 10⁵টি node একটি chain-এ সাজানো। কী বদলায়?
- **[Breadth-First Search](#ch-breadth-first-search)**
  - BFS কেন shortest path নিশ্চিত করে, আর DFS কেন করে না?
  - Node-কে visited চিহ্ন কোথায় দেন, আর না দিলে কী গোলমাল হয়?
  - কখন DFS ভালো পছন্দ?
  - Multi-source BFS কী, আর কখন খাটে?
  - শুধু দৈর্ঘ্য নয়, আসল path-টা কীভাবে ফিরে পাবেন?
  - BFS কি recursive করে লেখা যায়?
- **[Backtracking](#ch-backtracking)**
  - Backtracking আর DFS-এর পার্থক্য কী?
  - Result রাখার সময় বর্তমান path-এর copy নিতেই হবে কেন?
  - `explore(i + 1)` কেন subset দেয়, আর `explore(0)` কেন permutation দেয়?
  - Input-এ duplicate থাকলে কীভাবে সামলাবেন?
  - কখন এর বদলে dynamic programming ব্যবহার করবেন?
  - Backtracking সমাধানের time complexity কত, আর সেটা কীভাবে প্রমাণ করবেন?
- **[Dynamic Programming](#ch-dynamic-programming)**
  - DP খাটাতে হলে problem-এর কোন দুটি বৈশিষ্ট্য থাকতেই হবে?
  - Memoisation না tabulation, কীভাবে বেছে নেবেন?
  - State কী হবে, তা কীভাবে ঠিক করেন?
  - এমন একটি problem বলুন যেখানে greedy ব্যর্থ হয় কিন্তু DP সফল, আর কেন।
  - DP সমাধানকে কীভাবে `O(1)` space-এ নামিয়ে আনবেন?
  - কখন DP-র বদলে backtracking-ই ঠিক উত্তর?
- **[Graph Algorithm](#ch-graph-algorithms)**
  - Graph-এর কোনো code লেখার আগে কী কী জিজ্ঞেস করেন?
  - Kahn's algorithm কীভাবে cycle ধরে?
  - BFS-এর শুধু queue লাগে, Dijkstra-র heap লাগে কেন?
  - Negative edge weight থাকলে Dijkstra কেন ভেঙে যায়?
  - কখন DFS বা BFS-এর বদলে Union-Find ব্যবহার করবেন?
  - Undirected graph-এ cycle ধরা কেন আলাদা?
  - সাধারণ Dijkstra কেন Cheapest Flights Within K Stops সমাধান করতে পারে না?

## এরপর কী পড়বেন

- [Chapter ?? — DSA Pattern](#ch-dsa-index) — ষোলোটি pattern, আর কোন ক্রমে শিখবেন
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — ওপরের প্রতিটি উত্তর যে ভাষায় মাপা হয়
