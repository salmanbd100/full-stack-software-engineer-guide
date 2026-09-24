---
title: Interview Question Index
part: 0
chapter: 101
slug: dsa-question-index
level: intermediate # beginner | intermediate | advanced
reading_time: 5
updated: 2026-09-24
tags: [back-matter, companion, interview, index]
in_book: true
---

# Interview Question Index {#ch-dsa-question-index}

> Test yourself on a part in twenty minutes, and find out which chapters you actually have to reread.

**In this index:** how to use it · every question in the book · grouped by part and chapter · each chapter linked

Every question below is taken from the **Interview Questions** block that closes each pattern in Book 2. There are
**87 of them across 16 chapters**. The answers are not repeated here — they are in the chapter,
which is what the link on each heading is for.

## How to Use It

Answer out loud, then check. Those are the two halves, and skipping the first one is what makes a
reader feel ready and then stall in the room.

1. **Answer it aloud, in under ninety seconds.** The gap between what you recognise and what you can
   say is the whole thing the loop measures, and reading silently hides it.
2. **Mark it fluent, shaky, or blank.** Three buckets is enough. A finer scale is procrastination.
3. **Open the chapter only for the shaky and the blank.** Rereading what you already know is the most
   comfortable way to waste a week.
4. **Come back to the same part three days later.** Recall decays fastest in the first seventy-two
   hours, so the second pass is where the revision actually happens.

A part you can answer at eighty per cent aloud is a part you can stop revising. One that scores below
half is a part to read properly, not to skim again.

> ⚠️ **These are not the questions you will be asked.** They are the questions the book answers, which
> is a different set. Memorising the list would be the wrong use of it. Each one is a prompt to
> reconstruct an explanation, and the interview version will arrive with different words around it.

## Appendix — DSA Patterns

_87 questions across 16 chapters._

- **[Time and Space Complexity](#ch-time-and-space-complexity)**
  - What is the time and space complexity of your solution, and how do you know?
  - The constraint says `n ≤ 10⁵`. What does that tell you before you have read the problem?
  - Is `O(1)` always faster than `O(n)`?
  - When would you deliberately choose the slower complexity?
  - Why is appending to a dynamic array `O(1)` when it sometimes has to copy everything?
- **[Prefix Sum](#ch-prefix-sum)**
  - Why does the prefix array have `n + 1` entries?
  - How does "count subarrays summing to k" become a hash-map problem?
  - When would you not use a prefix sum?
  - The array is all positive and the question asks for a subarray summing to `k`. What changes?
- **[Two Pointers](#ch-two-pointers)**
  - Why is it safe to discard an element when the sum is too small?
  - In Container With Most Water, why move the shorter wall?
  - What is the difference between two pointers and a sliding window?
  - When would you not reach for two pointers on a sorted array?
  - How do you avoid duplicate triplets in 3Sum without a `Set`?
- **[Sliding Window](#ch-sliding-window)**
  - There is a `while` loop inside the `for` loop. Why is this `O(n)` and not `O(n²)`?
  - How do you decide what to store for the window?
  - Why does a sliding window fail on an array with negative numbers?
  - When is a fixed window the wrong choice even though the problem names a size?
  - How does Minimum Window Substring differ from the usual template?
- **[Fast and Slow Pointers](#ch-fast-and-slow-pointers)**
  - Why does the fast pointer always catch the slow one inside a cycle? Could it jump over?
  - Why 2:1 and not 3:1?
  - When would you use a `Set` instead?
  - How does Find the Duplicate Number become a cycle problem?
  - What breaks if the input is a doubly linked list, or a tree?
- **[In-Place Linked List Reversal](#ch-in-place-linked-list-reversal)**
  - Walk through why the three assignments have to happen in that order.
  - Why return `prev` rather than `head`?
  - What does the dummy node actually buy you in Reverse Linked List II?
  - When would you prefer the recursive version?
  - How would you reverse in groups of `k` without breaking the last partial group?
- **[Monotonic Stack](#ch-monotonic-stack)**
  - There is a `while` loop inside the `for` loop. Why is this `O(n)`?
  - Why store indices rather than values?
  - How do you decide between an increasing and a decreasing stack?
  - When is a monotonic stack the wrong tool even though the question mentions "maximum"?
  - How does Largest Rectangle in Histogram use this pattern?
- **[Top K Elements](#ch-top-k-elements)**
  - Why a min-heap for the `k` largest? It sounds backwards.
  - What is the actual saving over sorting?
  - When would you use quickselect instead?
  - How do you find the median of a stream?
  - Top K Frequent Elements in guaranteed linear time — how?
- **[Overlapping Intervals](#ch-overlapping-intervals)**
  - Why is sorting the first move, and what does it cost you?
  - Give the overlap condition, and say why the four diagram cases are unnecessary.
  - Why can't you solve Meeting Rooms II by merging the intervals?
  - Why does the "keep the maximum number of non-overlapping intervals" greedy sort by end time?
  - How would you handle intervals that arrive continuously and must be queried live?
- **[Modified Binary Search](#ch-modified-binary-search)**
  - State the invariant your loop maintains.
  - Why does `while (low <= high)` with `high = mid` loop forever?
  - How do you search a rotated sorted array without finding the rotation point first?
  - What breaks when the rotated array has duplicates?
  - How do you recognise a problem that wants a binary search over the answer space?
  - When is binary search the wrong answer even on a sorted array?
- **[Binary Tree Traversal](#ch-binary-tree-traversal)**
  - Why does inorder traversal of a BST produce sorted output?
  - Which traversal for computing the height of a tree, and why?
  - How do you traverse without recursion, and when does it matter?
  - What is the space complexity of level order versus depth-first, and which is cheaper?
  - Why can't you validate a BST by comparing each node to its two children?
  - How does preorder let you rebuild a tree, when inorder alone cannot?
- **[Depth-First Search](#ch-depth-first-search)**
  - Why does DFS on a graph need a visited set when a tree traversal does not?
  - Where exactly do you mark a node visited, and what breaks if you get it wrong?
  - When is BFS the right choice instead?
  - How do you detect a cycle in a directed graph with DFS?
  - What is the difference between DFS and backtracking?
  - The graph has 10⁵ nodes in a chain. What changes?
- **[Breadth-First Search](#ch-breadth-first-search)**
  - Why does BFS guarantee the shortest path, and why doesn't DFS?
  - Where do you mark nodes visited, and what goes wrong otherwise?
  - When is DFS the better choice?
  - What is multi-source BFS and when does it apply?
  - How do you recover the actual path, not just its length?
  - Can BFS be written recursively?
- **[Backtracking](#ch-backtracking)**
  - What is the difference between backtracking and DFS?
  - Why must you copy the current path when recording a result?
  - Why does `explore(i + 1)` give subsets and `explore(0)` give permutations?
  - How do you handle duplicates in the input?
  - When would you use dynamic programming instead?
  - What is the time complexity of a backtracking solution, and how do you justify it?
- **[Dynamic Programming](#ch-dynamic-programming)**
  - What two properties must a problem have for DP to apply?
  - Memoisation or tabulation — how do you choose?
  - How do you decide what the state is?
  - Give a problem where greedy fails and DP succeeds, and say why.
  - How do you get a DP solution down to `O(1)` space?
  - When is backtracking the right answer instead of DP?
- **[Graph Algorithms](#ch-graph-algorithms)**
  - What do you ask before writing any graph code?
  - How does Kahn's algorithm detect a cycle?
  - Why does Dijkstra need a heap when BFS only needs a queue?
  - What breaks Dijkstra on negative edge weights?
  - When would you use Union-Find rather than DFS or BFS?
  - Why is cycle detection different in undirected graphs?
  - Why doesn't plain Dijkstra solve Cheapest Flights Within K Stops?

## What to Read Next

- [Chapter ?? — DSA Patterns](#ch-dsa-index) — the sixteen patterns, and the order to learn them in
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — the vocabulary every answer above is scored in
