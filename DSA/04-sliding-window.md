---
title: Sliding Window
part: 10
chapter: 0
slug: sliding-window
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-30
tags: [dsa, sliding, window]
in_book: true
---

# Sliding Window {#ch-sliding-window}

> Keep a contiguous span and its running state, so each element is added once and removed once.

**In this chapter:** the fixed window · the expand-and-shrink template · why the total work is still `O(n)` · the state that lives inside the window · the questions that look like a window and are not

## 💡 The Core Idea

A brute force over subarrays recomputes overlapping work. Windows of size 3 over `[a, b, c, d]` are
`abc` then `bcd`, and the middle two elements get summed twice. A sliding window keeps the state of
the current span and edits it: subtract what left, add what arrived.

Phone screen-time reporting is the everyday version. Nobody re-adds seven days to show a rolling
weekly total — they drop the day that fell out of range and add today.

> Each index enters the window once and leaves at most once, so the two pointers make at most `2n`
> moves in total. That is why a loop that visibly contains another loop is still `O(n)`.

## How It Works

### Fixed window

When the question gives you the size, build the first window, then edit it once per step.

```typescript
// Largest sum of any k consecutive elements
function maxSumSubarray(nums: number[], k: number): number | null {
  if (nums.length < k) return null;

  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];   // the first window, built once

  let best = windowSum;
  for (let end = k; end < nums.length; end++) {
    windowSum += nums[end] - nums[end - k];           // one in, one out — O(1) per step
    best = Math.max(best, windowSum);
  }
  return best;
}
// Time: O(n), Space: O(1)  — the naive version is O(n × k)
```

### Dynamic window

When the size is whatever the constraint allows, the window grows on every iteration and shrinks only
while it is invalid. This template covers most of the family:

```typescript
function longestValidWindow(s: string): number {
  const state = new Map<string, number>();          // whatever "valid" needs to be decided
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    state.set(s[end], (state.get(s[end]) ?? 0) + 1);  // 1. expand

    while (/* the window is invalid */ state.size > 2) {   // 2. shrink until it is valid again
      const leaving = s[start];
      const next = state.get(leaving)! - 1;
      next === 0 ? state.delete(leaving) : state.set(leaving, next);
      start++;
    }

    best = Math.max(best, end - start + 1);          // 3. record, only while valid
  }
  return best;
}
// Time: O(n), Space: O(k) where k is the number of distinct values held
```

The `while` is not a nested loop in the complexity sense. `start` never moves backwards and never
passes `end`, so across the whole run it advances at most `n` times.

**The canonical instance — longest substring with no repeated character:**

```typescript
function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>();   // character → the index it last appeared at
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    const previous = lastSeen.get(ch);
    // Only jump forward. A stale index from before the window must not drag start back.
    if (previous !== undefined) start = Math.max(start, previous + 1);

    lastSeen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
}
// Time: O(n), Space: O(min(n, alphabet))
```

⚠️ `Math.max(start, previous + 1)` is the line this problem is really testing. On `"abba"`, when the
second `a` arrives the map still holds `a → 0`, and without the guard `start` jumps back to 1 and the
answer becomes 3 instead of 2.

### What "state" means

The window is not the point; the state you keep about it is. Choosing it is most of the work.

| Question asks for                       | Keep                                       | Valid when                  |
| --------------------------------------- | ------------------------------------------ | --------------------------- |
| Max sum of `k` elements                 | A running sum                              | Always — the size is fixed  |
| Longest run with no repeats             | `char → last index`                        | No duplicate inside         |
| At most `k` distinct characters         | `char → count`, plus `map.size`            | `size ≤ k`                  |
| Contains all of another string          | `need` counts plus a `missing` counter     | `missing === 0`             |
| Longest run after `k` replacements      | `char → count` plus the max count seen     | `length − maxCount ≤ k`     |

## When to Use It

| Signal                                                   | Reach for      | Why                                        |
| -------------------------------------------------------- | -------------- | ------------------------------------------ |
| "Longest" or "shortest" **contiguous** span              | Sliding window | The span is the answer                     |
| "Subarray of size `k`"                                   | Fixed window   | Size is given, state is `O(1)`             |
| "Contains" or "permutation of" over a substring          | Dynamic window | Validity is a counter comparison           |
| Values can be **negative** and the target is a sum       | Prefix sum     | Shrinking no longer lowers the sum         |
| Order does not matter — subsequence, not subarray        | Sorting or DP  | A window is contiguous by definition       |
| Pair from opposite ends of a sorted array                | Two pointers   | Nothing between the pointers is being kept |

The negatives row is the one that catches people. Growing a window of positive numbers only ever
raises the sum, which is what makes "shrink when too big" a valid move. Allow negatives and that
monotonicity is gone — see [Chapter ?? — Prefix Sum](#ch-prefix-sum).

## Common Mistakes

**Getting the width wrong:**

```typescript
// ❌ const width = end - start;        // off by one on every window
// ✅ const width = end - start + 1;    // inclusive on both ends
```

**Letting the left pointer move backwards:**

```typescript
// ❌ start = lastSeen.get(ch)! + 1;
// ✅ start = Math.max(start, lastSeen.get(ch)! + 1);
```

**Recording the answer while the window is invalid:**

```typescript
// ❌ best = Math.max(best, end - start + 1);   // written before the shrink loop
// ✅ shrink first, then record — a "longest valid" answer must come from a valid window
```

For a **minimum** window the order flips: shrink while the window is still valid, and record inside
the shrink loop, because the smallest valid window is the one just before it breaks.

**Removing from the state without deleting the key:**

```typescript
// ❌ counts.set(leaving, counts.get(leaving)! - 1);   // leaves a 0, so map.size stays wrong
// ✅ delete the key when the count hits 0, if size is what validity is measured on
```

**Reaching for a window when the elements are not contiguous:**

```typescript
// ❌ "Longest increasing subsequence" is not a window problem — a subsequence has gaps
```

## Problems to Practise

| #    | Problem                                          | Difficulty | What it drills                      |
| ---- | ------------------------------------------------ | ---------- | ----------------------------------- |
| 643  | Maximum Average Subarray I                       | Easy       | The fixed-window edit               |
| 1456 | Maximum Number of Vowels in a Substring          | Easy       | Fixed window with a counter         |
| 3    | Longest Substring Without Repeating Characters   | Medium     | The last-index jump                 |
| 1004 | Max Consecutive Ones III                         | Medium     | Validity as a budget                |
| 424  | Longest Repeating Character Replacement          | Medium     | `length − maxCount ≤ k`             |
| 567  | Permutation in String                            | Medium     | Fixed window plus counter matching  |
| 438  | Find All Anagrams in a String                    | Medium     | The same shape, collecting results  |
| 76   | Minimum Window Substring                         | Hard       | Shrink-while-valid, and a `missing` counter |

Write 3 and 76 in the same sitting. One maximises and records after shrinking, the other minimises
and records during — that contrast is the whole template.

## 🔑 Key Takeaways

- A sliding window turns `O(n × k)` or `O(n²)` subarray scans into `O(n)` by editing state instead of rebuilding it.
- The inner `while` does not make it quadratic, because the left pointer only moves forward and only `n` times.
- Window width is `end - start + 1`; forgetting the `+ 1` is the most common bug in the pattern.
- Maximum problems record after shrinking back to valid; minimum problems record while still valid.
- The pattern needs contiguity, and a sum-based window needs non-negative values.

## Interview Questions

**Q: There is a `while` loop inside the `for` loop. Why is this `O(n)` and not `O(n²)`?**

Because the two pointers only move forward and neither exceeds `n`. `end` advances exactly `n` times
and `start` at most `n` times across the entire run, so the total work is bounded by `2n`. This is
amortised analysis — one iteration can shrink a lot, but the sum over all iterations cannot.

**Q: How do you decide what to store for the window?**

Ask what makes the window invalid, then store the smallest thing that answers it in `O(1)`. "No
repeats" needs last-seen indices; "at most `k` distinct" needs counts and a size; "contains all of
`t`" needs the required counts plus a single counter of how many are still missing. If checking
validity costs `O(n)`, the state is wrong.

**Q: Why does a sliding window fail on an array with negative numbers?**

The pattern relies on the sum rising as the window grows and falling as it shrinks. Negative values
break that, so "the sum is too big, drop from the left" is no longer sound — dropping could raise it.
Those questions want a prefix sum with a hash map instead.

**Q: When is a fixed window the wrong choice even though the problem names a size?**

When the size describes a constraint rather than the answer — "the longest substring with at most `k`
distinct characters" mentions `k` but the window is dynamic. The test is whether every valid answer
has the same length.

**Q: How does Minimum Window Substring differ from the usual template?**

It inverts the loop. You expand until the window is valid, then shrink while it stays valid,
recording the best length inside the shrink loop. A `missing` counter that drops to zero keeps the
validity check `O(1)` rather than comparing two maps on every step.

## What to Read Next

- [Chapter ?? — Two Pointers](#ch-two-pointers) — the same two indices when the span between them carries no state
- [Chapter ?? — Prefix Sum](#ch-prefix-sum) — the tool for the same questions once negative values appear
- [Chapter ?? — Monotonic Stack](#ch-monotonic-stack) — what "sliding window maximum" actually needs
