---
title: Archive — DSA Solution Sets
part: 0
chapter: 0
slug: archive-dsa-solutions-index
level: intermediate # beginner | intermediate | advanced
reading_time: 2
updated: 2026-08-30
tags: [archive, dsa, algorithms, leetcode]
in_book: false
---

# Archive — DSA Solution Sets

> Archived by improvement **#27**, which trimmed the sixteen DSA pattern chapters from 19,281 lines to
> 4,520 — between 218 and 363 lines each — so the appendix fits its 5,600-line budget.

These are the **originals**, unedited. Each one is the full teaching version of a pattern: every
worked example line-by-line, the long visual walkthroughs, the FAQ sections, and the complete solution
set. `BOOK-SPEC.md` calls that "full solution sets that belong in a linked repository", and this
directory is that repository until one exists separately.

Nothing here is wrong. The appendix now covers each pattern in a fifth of the space — recognise the
pattern, one template, two worked examples, complexity, and a curated problem table — and this is
where the rest went.

## What is here

| File                              | Was   | Now in `DSA/` | Dropped from the chapter                                   |
| --------------------------------- | ----- | ------------- | ---------------------------------------------------------- |
| `01-time-space-complexity.md`     | 1,629 | 262           | Per-complexity code galleries, the interview-dialogue transcripts, the master theorem, string-algorithm tables |
| `02-prefix-sum.md`                | 862   | 218           | The line-by-line constructor walkthrough, the six-question FAQ, the step-by-step trace of `subarraySum` |
| `03-two-pointers.md`              | 1,397 | 242           | Two full ASCII walkthroughs, six pitfalls with before/after pairs, the seven-part "pro tips" section |
| `04-sliding-window.md`            | 907   | 239           | Both step-by-step code traces, the seven-question FAQ, eight tips, the ASCII window diagrams |
| `05-fast-slow-pointers.md`        | 1,275 | 272           | Two long ASCII race-track walkthroughs, the line-by-line code commentary, seven FAQ entries, seven "pro tips", the beginner's quick reference |
| `06-linkedlist-in-place-reversal.md` | 810 | 240           | The three-pointer ASCII dance, the four-level `####` breakdown of each loop line, the full iteration trace, the runnable helper and example harness |
| `07-monotonic-stack.md`           | 665   | 260           | The 90-line stack-state visualisation, the increasing-vs-decreasing gallery, the 126-line Daily Temperatures walkthrough |
| `08-top-k-elements.md`            | 784   | 304           | The heap-structure ASCII diagrams, the line-by-line `bubbleUp`/`bubbleDown` commentary, **a Python solution** that violated the TypeScript-only rule |
| `09-overlapping-intervals.md`     | 820   | 263           | The four-case overlap gallery, two long timeline walkthroughs, the three-concurrent-meetings trace |
| `10-modified-binary-search.md`    | 720   | 312           | Two search-space diagram sets, the "key insight explained simply" repeats, the alternative-approach walkthrough |
| `11-binary-tree-traversal.md`     | 1,825 | 284           | The per-traversal ASCII galleries, three code walkthroughs, four pitfalls with full before/after code, seven FAQ entries, seven tips, the beginner's quick reference |
| `12-depth-first-search.md`        | 1,583 | 327           | Two analogies, the stack-concept section, two code walkthroughs, the island-counting visual trace, seven FAQ entries, seven tips |
| `13-breadth-first-search.md`      | 1,692 | 307           | Two analogies, the queue-concept section, three code walkthroughs, the multi-source visual trace, seven FAQ entries, seven tips |
| `14-backtracking.md`              | 1,544 | 321           | Two analogies, three visual decision-tree traces, three code walkthroughs, five pitfalls in full, seven FAQ entries, seven tips |
| `15-dynamic-programming.md`       | 750   | 294           | Two analogies, two long code walkthroughs, the duplicated top-down/bottom-up explanations |
| `16-graph-algorithms.md`          | 2,022 | 363           | Three analogies, four DFS/BFS templates that duplicated chapters 12–13 entirely, three step-by-step walkthroughs, seven FAQ entries, seven tips, "20 Key Takeaways", a quick-reference card, three mental models |

All sixteen are here. **#27 is complete** — the appendix went 19,281 lines to 4,520 across the
sixteen chapters, against a 5,600-line budget.

## What each chapter kept

The cut was not uniform. What survived is the material that is hard to reconstruct from a problem
statement — the **argument** for why a pattern is correct, not the mechanics of running it:

- The greedy justification in Container With Most Water, and the equivalent for Two Sum II
- Why the sliding window's inner `while` loop is still `O(n)` in total
- The rearrangement that turns "count subarrays summing to `k`" into a hash-map lookup
- The constraint-to-target-complexity table, which was implied across the old chapter but never stated
- The gap-closes-by-one argument for why a fast pointer cannot jump over a slow one
- The `a = (k − 1)(b + c) + c` derivation behind Floyd's cycle-start phase, which is not inventable under pressure
- Why the three assignments in a linked-list reversal have exactly one valid order
- The amortised argument for the monotonic stack's inner `while`, and why the `k`-largest heap must be a **min**-heap
- The exchange argument for why "keep the most non-overlapping intervals" sorts by **end**, not start
- The two distinct binary-search loop shapes, and why mixing them is an infinite loop
- Why inorder on a BST is sorted, and why validating a BST cannot be a local parent-child check
- Why a DFS visited mark has to land on entry rather than on exit, and why directed-cycle detection needs two states
- Why BFS's first arrival is its shortest arrival, and why that guarantee dies with weighted edges
- Why a backtracking result must be a copy, and why the duplicate skip needs `i > start` rather than a bare equality
- The two preconditions for DP stated as a table, and the `[1, 3, 4]` counterexample that kills the greedy answer
- Why Dijkstra's stale-entry check replaces decrease-key, and why cycle detection differs between directed and undirected graphs

What was cut is mostly repetition: the same idea explained as prose, then as ASCII art, then as a
numbered trace, then again in an FAQ.

## The prev/next footers

These files still carry the `[← Previous] | [Back to Index] | [Next →]` footers that improvement #16
regenerated. The Book Chapter Standard forbids them in chapters — the build generates navigation — so
the trimmed versions in `DSA/` drop them, and nothing in `DSA/` carries one any more. All sixteen
originals are now here, so the chain resolves end to end inside this directory. `Archive/` is not
linted, so nothing depends on that either way.

## Getting one back

Reverse the `git mv`, then bring the file up to the Book Chapter Standard — none of these will pass
`lint:docs` as they are, and each is two to five times the 400-line limit. Read
[`../README.md`](../README.md) first; the point of the trim was the budget, so restoring a file means
finding the lines somewhere else.
