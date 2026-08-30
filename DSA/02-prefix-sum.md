---
title: Prefix Sum
part: 10
chapter: 0
slug: prefix-sum
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-30
tags: [dsa, prefix, sum]
in_book: true
---

# Prefix Sum {#ch-prefix-sum}

> Answer any range-sum question in constant time by paying for one pass up front.

**In this chapter:** the running total · the range formula · the hash-map variant that counts subarrays · when a prefix sum is the wrong tool

## 💡 The Core Idea

A prefix sum array stores the running total at every position. Once you have it, the sum of any
range is one subtraction instead of a loop, because the sum from `i` to `j` is "everything up to `j`"
minus "everything before `i`".

The bank statement is the honest analogy. Daily deposits are `[100, 50, 200, 150]`; the balance
column is `[100, 150, 350, 500]`. Nobody re-adds the deposits to answer "how much went in between
day 2 and day 4" — they subtract two balances.

> The pattern is a trade: `O(n)` time and `O(n)` space, once, to turn every later query from `O(n)`
> into `O(1)`. It only pays if there is more than one query, or if the query is hiding inside a loop.

## How It Works

### Build it with a leading zero

```typescript
function buildPrefix(nums: number[]): number[] {
  // Length n + 1. prefix[i] is the sum of the first i elements, so prefix[0] = 0.
  const prefix: number[] = new Array<number>(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  return prefix;
}
// Time: O(n), Space: O(n)
```

The extra slot at the front is not a stylistic choice. With it, the range formula has no special
case:

```text
sum(left … right) = prefix[right + 1] - prefix[left]
```

Without it you need `left === 0 ? prefix[right] : prefix[right] - prefix[left - 1]`, and that branch
is where off-by-one bugs live.

**A worked query on `[3, 1, 4, 2, 5, 1]`:**

| Index      | 0   | 1   | 2   | 3   | 4   | 5   | 6   |
| ---------- | --- | --- | --- | --- | --- | --- | --- |
| `nums`     | 3   | 1   | 4   | 2   | 5   | 1   | —   |
| `prefix`   | 0   | 3   | 4   | 8   | 10  | 15  | 16  |

Sum of indices 2 to 4 is `prefix[5] - prefix[2]` = `15 - 4` = `11`, which is `4 + 2 + 5`. One
subtraction, no loop.

### The version that never builds an array

Half of the interview questions in this family do not want range queries at all. They want a count,
and they only need the running total plus a map of totals seen so far.

```typescript
// How many subarrays sum to exactly k?
function subarraySum(nums: number[], k: number): number {
  // seen[s] = how many prefixes so far had sum s. The 0 entry stands for the empty prefix.
  const seen = new Map<number, number>([[0, 1]]);
  let running = 0;
  let count = 0;

  for (const num of nums) {
    running += num;
    // A subarray ending here sums to k when some earlier prefix equalled running - k.
    count += seen.get(running - k) ?? 0;
    seen.set(running, (seen.get(running) ?? 0) + 1);
  }
  return count;
}
// Time: O(n), Space: O(n)
```

The rearrangement is the whole trick. `sum(i…j) = k` is the same statement as
`prefix[j] − prefix[i] = k`, which is the same as `prefix[i] = prefix[j] − k`. So at each position
you are not searching for a subarray, you are looking up a number you have already seen.

⚠️ The map counts **frequencies**, not presence. `[1, -1, 1, -1, 1]` with `k = 0` has four answers,
and a `Set` finds one of them. Seeding it with `[0, 1]` is what makes a subarray starting at index 0
count at all.

### Related shapes

| Variant             | Change                                              | Answers                          |
| ------------------- | --------------------------------------------------- | -------------------------------- |
| Prefix product      | Multiply instead of add, and keep a suffix pass too | Product of array except self     |
| 2D prefix sum       | `p[i][j]` = sum of the rectangle from the origin    | Submatrix sums in `O(1)`         |
| Difference array    | Store deltas, prefix-sum at the end                 | Many range updates, one read     |
| Prefix modulo       | Store `running % k` in the map                      | Subarray sum divisible by `k`    |

## When to Use It

| Situation                                    | Use                   | Why                                        |
| -------------------------------------------- | --------------------- | ------------------------------------------ |
| Many range sums, array never changes         | Prefix sum            | `O(1)` per query after one pass            |
| Count subarrays hitting a target sum         | Running sum + map     | Turns an `O(n²)` scan into one pass        |
| Many range updates, then read once           | Difference array      | Update is `O(1)`; one prefix pass at the end |
| Array is updated between queries             | Fenwick / segment tree | Prefix sum would need a full rebuild each time |
| Range **max** or **min**, not sum            | Sparse table, or monotonic stack | Max does not have an inverse, so subtraction is meaningless |
| One query, total                             | Just loop             | Preprocessing costs more than it saves     |

The last two rows are the ones worth stating out loud. Subtraction works because addition has an
inverse; that is the actual precondition for the pattern, and `max` fails it.

## Common Mistakes

**Dropping the leading zero and then patching it:**

```typescript
// ❌ prefix[i] = sum of the first i + 1 elements, so every query needs a branch
function sumRangeBranchy(prefix: number[], left: number, right: number): number {
  return left === 0 ? prefix[right] : prefix[right] - prefix[left - 1];
}

// ✅ One extra slot at the front removes the branch entirely
function sumRange(prefix: number[], left: number, right: number): number {
  return prefix[right + 1] - prefix[left];
}
```

**Assuming positive numbers:**

```typescript
// ❌ Sliding window on [1, -1, 1] with target 1 — shrinking is meaningless when values can go down
// ✅ Prefix sum with a map handles negatives; a window does not
```

This is the split that decides the pattern. Negative values break the monotonicity a sliding window
depends on, so a question that mentions negatives is telling you to use a prefix sum.

**Forgetting the `0 → 1` seed in the map:**

```typescript
// ❌ new Map<number, number>()      → misses every subarray that starts at index 0
// ✅ new Map<number, number>([[0, 1]])
```

**Rebuilding after every update:**

```typescript
// ❌ nums[3] = 9; prefix = buildPrefix(nums);   // O(n) per update — O(n·q) overall
// ✅ q updates mixed with q queries is a Fenwick tree: O(log n) each
```

## Problems to Practise

| #    | Problem                                | Difficulty | What it drills                        |
| ---- | -------------------------------------- | ---------- | ------------------------------------- |
| 1480 | Running Sum of 1d Array                | Easy       | The build loop, nothing else          |
| 303  | Range Sum Query — Immutable            | Easy       | The leading zero and the range formula |
| 724  | Find Pivot Index                       | Easy       | Prefix against suffix in one pass     |
| 560  | Subarray Sum Equals K                  | Medium     | The map variant — the canonical one   |
| 523  | Continuous Subarray Sum                | Medium     | Prefix modulo                         |
| 238  | Product of Array Except Self           | Medium     | Prefix and suffix, no division        |
| 304  | Range Sum Query 2D — Immutable         | Medium     | Inclusion–exclusion in two dimensions |
| 1074 | Number of Submatrices That Sum to Target | Hard     | 2D collapsed onto the 1D map trick    |

Solve 560 until the rearrangement is automatic. Roughly half of the medium questions in this family
are that problem with different wording.

## 🔑 Key Takeaways

- A prefix sum turns repeated range queries from `O(n)` each into `O(1)` each, after one `O(n)` pass.
- Give the array a leading zero so `sum(left…right) = prefix[right+1] - prefix[left]` has no special case.
- Counting subarrays needs no array at all — a running total and a frequency map do it in one pass.
- The pattern works because addition has an inverse, which is why it does not extend to `max` or `min`.
- Negative numbers rule out a sliding window and point straight at a prefix sum.

## Interview Questions

**Q: Why does the prefix array have `n + 1` entries?**

So that `prefix[0]` can mean "the sum of nothing". That makes the range formula uniform for every
`left`, including zero, and removes the branch where off-by-one errors usually appear. It costs one
extra integer.

**Q: How does "count subarrays summing to k" become a hash-map problem?**

Rearrange the definition. `sum(i…j) = k` means `prefix[j] − prefix[i] = k`, so
`prefix[i] = prefix[j] − k`. Walking the array once and keeping a frequency map of prefix sums seen
so far turns each position into a single lookup, giving `O(n)` instead of `O(n²)`.

**Q: When would you not use a prefix sum?**

When the array changes between queries, because every update invalidates the whole suffix of the
prefix array — that is a Fenwick or segment tree instead. Also when the query is a range maximum,
since subtraction cannot undo a `max`.

**Q: The array is all positive and the question asks for a subarray summing to `k`. What changes?**

A sliding window becomes available and is better: `O(1)` space instead of `O(n)`, because with only
positive values the running sum increases as the window grows, so shrinking from the left is a valid
move. State that the positivity is what unlocks it, and that the map version still works if you would
rather write one solution for both cases.

## What to Read Next

- [Chapter ?? — Sliding Window](#ch-sliding-window) — the `O(1)`-space alternative when every value is positive
- [Chapter ?? — Two Pointers](#ch-two-pointers) — the other way a sorted or monotonic input removes a loop
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — why trading `O(n)` space for `O(1)` queries is usually right
