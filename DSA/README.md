---
title: Appendix — DSA Patterns
part: 10
chapter: 0
slug: dsa-index
level: intermediate # beginner | intermediate | advanced
reading_time: 3
updated: 2026-08-28
tags: [dsa, algorithms, patterns, leetcode, complexity]
in_book: true
---

# Appendix — DSA Patterns

Sixteen patterns, kept because the reader still has to pass the round, and demoted to an appendix
because pattern recognition is not what this book is about. Nothing here will make you a better
engineer. It will make you faster at the forty-five minutes that stand between you and the parts of
the job the other nine parts cover.

The organising claim is that almost every algorithm question in a hiring loop is one of a small
number of shapes wearing a costume. The work is recognising the shape, not inventing the algorithm.
Each chapter is built for that: what the pattern is, the signal in the question that gives it away,
one template worth memorising, two worked examples, the complexity, and a curated problem list.

## Chapters

| #  | Pattern                                                                    | The signal in the question                                   |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Time and Space Complexity](./01-time-space-complexity.md)                 | Any constraint on `n` — it tells you the target complexity   |
| 02 | [Prefix Sum](./02-prefix-sum.md)                                           | Repeated range queries over a fixed array                    |
| 03 | [Two Pointers](./03-two-pointers.md)                                       | A sorted array, and a pair or triplet to find                |
| 04 | [Sliding Window](./04-sliding-window.md)                                   | "Longest" or "shortest" contiguous subarray                  |
| 05 | [Fast and Slow Pointers](./05-fast-slow-pointers.md)                       | A cycle, a midpoint, or constant extra space required        |
| 06 | [In-Place Linked List Reversal](./06-linkedlist-in-place-reversal.md)      | Reverse a list or a section, allocating nothing              |
| 07 | [Monotonic Stack](./07-monotonic-stack.md)                                 | "Next greater" or "next smaller" for every element           |
| 08 | [Top K Elements](./08-top-k-elements.md)                                   | K largest or most frequent, without sorting everything       |
| 09 | [Overlapping Intervals](./09-overlapping-intervals.md)                     | Any input that is a list of start and end pairs              |
| 10 | [Modified Binary Search](./10-modified-binary-search.md)                   | Sorted-but-rotated, or searching an answer space             |
| 11 | [Binary Tree Traversal](./11-binary-tree-traversal.md)                     | The order the problem needs is the traversal it wants        |
| 12 | [Depth-First Search](./12-depth-first-search.md)                           | Explore to the depth — paths, islands, connectivity          |
| 13 | [Breadth-First Search](./13-breadth-first-search.md)                       | Shortest path in an unweighted graph, or level by level      |
| 14 | [Backtracking](./14-backtracking.md)                                       | Permutations, combinations, "all possible" anything          |
| 15 | [Dynamic Programming](./15-dynamic-programming.md)                         | Overlapping subproblems and an optimal-substructure smell    |
| 16 | [Graph Algorithms](./16-graph-algorithms.md)                               | Nodes and edges, weighted paths, ordering with dependencies  |

## What Interviewers Probe For

There is no senior signal for this appendix in `BOOK-SPEC.md`, because the round is not scored the way
the rest of the book is. What is being watched:

- **Do you clarify before you code?** Input range, duplicates, empty input, and whether the array is
  sorted. Thirty seconds here changes which pattern you reach for.
- **Can you state the complexity, and the target?** A constraint of `n ≤ 10⁵` rules out `O(n²)` and
  says so out loud. Reading the constraint as a hint is the fastest way to look experienced.
- **Do you narrate the approach before typing?** Interviewers score the method. A stated plan that
  turns out wrong is recoverable; silent code that turns out wrong is not.
- **Can you test your own solution?** Walking one example and one edge case through the finished code,
  unprompted, closes the round well and catches roughly half of all off-by-one errors.

## Reading Order

01 first — the complexity chapter is the one that makes the others legible. Then straight through:
02 to 10 are array, string and pointer patterns; 11 to 16 are trees and graphs, and get progressively
harder. Do not skip 03 and 04; they underpin more questions than any other pair here.

**Interview sprint:** 01 → 03 → 04 → 13 → 15. Complexity, two pointers, sliding window, BFS and
dynamic programming between them cover the majority of what gets asked.

> ⚠️ **This appendix ships as a companion volume, not bound into the book.** It is also the most
> over-length material in the repository — chapters run from 666 to 2,023 lines against a 400-line
> limit, because they currently include full solution sets. Improvement #27 trims each to
> pattern recognition, one template, two worked examples and a linked problem table.
