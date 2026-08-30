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

> Archived by improvement **#27**, which trims the sixteen DSA pattern chapters from 19,353 lines to
> roughly 350 each so the appendix fits its 5,600-line budget.

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

Twelve more land here as the remaining runs of #27 complete.

## What each chapter kept

The cut was not uniform. What survived is the material that is hard to reconstruct from a problem
statement — the **argument** for why a pattern is correct, not the mechanics of running it:

- The greedy justification in Container With Most Water, and the equivalent for Two Sum II
- Why the sliding window's inner `while` loop is still `O(n)` in total
- The rearrangement that turns "count subarrays summing to `k`" into a hash-map lookup
- The constraint-to-target-complexity table, which was implied across the old chapter but never stated

What was cut is mostly repetition: the same idea explained as prose, then as ASCII art, then as a
numbered trace, then again in an FAQ.

## The prev/next footers

These files still carry the `[← Previous] | [Back to Index] | [Next →]` footers that improvement #16
regenerated. The Book Chapter Standard forbids them in chapters — the build generates navigation — so
the trimmed versions in `DSA/` drop them. Inside this directory the chain resolves once all sixteen
originals have arrived; while #27 is mid-run, the links pointing at not-yet-archived files dangle.
`Archive/` is not linted, so nothing fails on it.

## Getting one back

Reverse the `git mv`, then bring the file up to the Book Chapter Standard — none of these will pass
`lint:docs` as they are, and each is two to five times the 400-line limit. Read
[`../README.md`](../README.md) first; the point of the trim was the budget, so restoring a file means
finding the lines somewhere else.
