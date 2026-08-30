---
title: Modified Binary Search
part: 10
chapter: 0
slug: modified-binary-search
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-30
tags: [dsa, binary-search, sorted, rotated]
in_book: true
---

# Modified Binary Search {#ch-modified-binary-search}

> Halve the search space on every step — not just in a sorted array, but anywhere a yes/no test flips exactly once.

**In this chapter:** the template that never goes out by one · rotated arrays and the sorted-half test · finding a boundary rather than a value · binary search over an answer space · the invariant that makes all of them the same code

## 💡 The Core Idea

Classic binary search needs a sorted array. That is a special case of something more general: binary
search works whenever you can ask a yes/no question of a midpoint and know which half to discard.

Formally, the array must be **monotonic with respect to the predicate** — every element before some
boundary answers "no", every element from there on answers "yes". Finding that boundary takes
`O(log n)` steps whether the underlying data is sorted, rotated, or not an array at all.

That reframing is what "modified" means. The three variations that matter in interviews:

| Variation                  | What is monotonic                                     |
| -------------------------- | ----------------------------------------------------- |
| Rotated sorted array       | One of the two halves is always properly sorted        |
| First or last occurrence   | "Is this element `≥ target`?" flips exactly once        |
| Search on the answer space | "Is a capacity of `x` enough?" — feasibility is monotonic |

> The array is not the search space. The **decision** is. Once you see that, "minimum capacity to ship
> packages in `d` days" becomes a binary search even though there is no sorted input anywhere.

## How It Works

### The template

Write it this way every time and the off-by-one errors stop happening:

```typescript
function binarySearch(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length - 1;   // inclusive on both ends

  while (low <= high) {         // <= because low === high is still one unchecked element
    const mid = low + Math.floor((high - low) / 2);   // no overflow, and no bias

    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;            // discard mid — it has been checked
    else high = mid - 1;
  }
  return -1;   // low is now the insertion point, which LC 35 asks for
}
// Time: O(log n), Space: O(1)
```

Two details carry the correctness. `low <= high` with inclusive bounds means the loop only exits when
the range is genuinely empty. And `mid + 1` / `mid - 1` guarantee progress — `low = mid` on a
two-element range loops forever.

### Rotated sorted array

Rotation breaks sortedness globally but not locally. Split at any midpoint and **at least one half is
still properly sorted** — identify which, and you can decide whether the target lies in it.

```typescript
function searchRotated(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] === target) return mid;

    if (nums[low] <= nums[mid]) {
      // Left half [low..mid] is sorted
      if (nums[low] <= target && target < nums[mid]) high = mid - 1;
      else low = mid + 1;
    } else {
      // Right half [mid..high] is sorted
      if (nums[mid] < target && target <= nums[high]) low = mid + 1;
      else high = mid - 1;
    }
  }
  return -1;
}
// Time: O(log n), Space: O(1)
```

`nums[low] <= nums[mid]` is the test, and the `<=` is not cosmetic: on a two-element range `low` and
`mid` are the same index, and a strict `<` would misclassify the half.

**Finding the minimum** is the same idea with the target removed. Compare the midpoint against the
right end — anything greater means the rotation point is to the right.

```typescript
function findMin(nums: number[]): number {
  let low = 0;
  let high = nums.length - 1;

  while (low < high) {          // < not <=: converge on a single surviving index
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] > nums[high]) low = mid + 1;   // mid cannot be the minimum
    else high = mid;                             // mid might be the minimum — keep it
  }
  return nums[low];
}
// Time: O(log n), Space: O(1)
```

⚠️ Note the loop condition changed to `low < high` and `high = mid` rather than `mid - 1`. That is the
**boundary-finding** form, and it is a different template from the value-finding one above. Mixing the
two — `low <= high` with `high = mid` — is an infinite loop.

### Finding a boundary

"First position where…" and "last position where…" are boundary searches. Do not try to shortcut with an
equality check and then a linear scan sideways; on `[2, 2, 2, 2]` that degrades to `O(n)`.

```typescript
// Smallest index with nums[i] >= target — the lower bound
function lowerBound(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length;   // exclusive: the answer may be "past the end"

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] < target) low = mid + 1;   // mid answers "no", discard it
    else high = mid;                         // mid answers "yes", it is still a candidate
  }
  return low;   // === nums.length when every element is smaller
}

// LC 34 falls straight out of it
function searchRange(nums: number[], target: number): [number, number] {
  const first = lowerBound(nums, target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lowerBound(nums, target + 1) - 1];
}
// Time: O(log n), Space: O(1)
```

The invariant to say out loud: **everything below `low` answers no, everything from `high` up answers
yes.** When they meet, that index is the boundary. Every boundary problem is this function with a
different predicate.

### Binary search on the answer space

When the question asks for a minimum or maximum value and checking a candidate is cheap, search the
values rather than an array.

```typescript
// LC 875 — the slowest eating speed that finishes all piles within h hours
function minEatingSpeed(piles: number[], h: number): number {
  const hoursNeeded = (speed: number): number =>
    piles.reduce((total, pile) => total + Math.ceil(pile / speed), 0);

  let low = 1;                      // the smallest conceivable answer
  let high = Math.max(...piles);    // the largest useful answer

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (hoursNeeded(mid) <= h) high = mid;   // feasible — try slower
    else low = mid + 1;                      // too slow — must go faster
  }
  return low;
}
// Time: O(n log(max pile)), Space: O(1)
```

The predicate "is speed `x` fast enough" is monotonic: if `x` works, so does every larger speed. That
monotonicity is the only precondition — the piles never need sorting.

## When to Use It

| Signal in the question                                      | Reach for                | Why                                     |
| ----------------------------------------------------------- | ------------------------ | --------------------------------------- |
| A sorted array and a target                                 | Classic template         | The base case                            |
| "Sorted but rotated"                                        | Sorted-half test         | One half is always properly sorted       |
| "First", "last", "insertion point", "smallest index where…" | `lowerBound` form        | Boundary, not equality                   |
| "Minimum X such that…" with a cheap feasibility check       | Search the answer space  | The predicate is monotonic, not the data |
| A sorted matrix                                             | Treat it as one flat array, or walk from a corner | Both are `O(log n)` or `O(m + n)` |
| Unsorted array, single query                                | Linear scan              | Sorting to search once costs more        |
| Unsorted array, many queries                                | Sort once, then binary search each | The sort amortises          |
| Duplicates and a rotated array                              | Binary search degrading to `O(n)` | `[2,2,2,0,2]` gives no information at the midpoint |

The last row is worth knowing as a limit. LC 81 has a genuine `O(n)` worst case, and the correct answer
in an interview is to name that rather than claim `O(log n)`.

## Common Mistakes

**Computing the midpoint by addition:**

```typescript
// ❌ const mid = Math.floor((low + high) / 2);   // overflows in fixed-width languages
// ✅ const mid = low + Math.floor((high - low) / 2);
```

JavaScript numbers make this safe in practice, but interviewers read it as a tell. Write the safe form.

**Mixing the two loop shapes:**

```typescript
// ❌ while (low <= high) { ... high = mid; }   // infinite when low === high
// ✅ value search: while (low <= high), high = mid - 1
// ✅ boundary search: while (low < high),  high = mid
```

**Not discarding the midpoint:**

```typescript
// ❌ low = mid;      // on a two-element range, mid === low and nothing progresses
// ✅ low = mid + 1;  // mid has been checked
```

**Strict comparison in the sorted-half test:**

```typescript
// ❌ if (nums[low] < nums[mid])    // fails when low === mid on a two-element range
// ✅ if (nums[low] <= nums[mid])
```

**Scanning sideways after finding an equal element:**

```typescript
// ❌ find target, then walk left to the first occurrence — O(n) on [2,2,2,2]
// ✅ two lowerBound calls, both O(log n)
```

**Choosing the wrong bounds for an answer-space search:**

```typescript
// ❌ low = 0    // speed 0 makes hoursNeeded infinite
// ✅ low = 1, high = the largest value that could ever be needed
```

## Problems to Practise

| #   | Problem                                                   | Difficulty | What it drills                                |
| --- | --------------------------------------------------------- | ---------- | --------------------------------------------- |
| 704 | Binary Search                                             | Easy       | The template, written until it is automatic    |
| 35  | Search Insert Position                                    | Easy       | Why the failed search returns `low`            |
| 33  | Search in Rotated Sorted Array                            | Medium     | The sorted-half test                           |
| 153 | Find Minimum in Rotated Sorted Array                      | Medium     | The boundary loop shape                        |
| 34  | Find First and Last Position of Element in Sorted Array    | Medium     | `lowerBound`, twice                            |
| 162 | Find Peak Element                                         | Medium     | Binary search with no sorted input at all      |
| 875 | Koko Eating Bananas                                       | Medium     | Searching the answer space                     |
| 4   | Median of Two Sorted Arrays                               | Hard       | Binary searching a partition, not an index     |

Write 704 and 34 until the two loop shapes are distinct in your head. 162 and 875 are the ones that
prove the pattern is about the predicate, not the array.

## 🔑 Key Takeaways

- Binary search needs a monotonic predicate, not a sorted array — that is what makes it "modified".
- Use `low + Math.floor((high - low) / 2)` and always discard the checked midpoint with `mid ± 1`.
- Value search is `while (low <= high)` with `high = mid - 1`; boundary search is `while (low < high)` with `high = mid`. Do not mix them.
- In a rotated array at least one half is properly sorted; find it with `nums[low] <= nums[mid]`.
- "Minimum X such that…" with a cheap feasibility check is a binary search over the answer space.

## Interview Questions

**Q: State the invariant your loop maintains.**

For a value search with inclusive bounds: the target, if it exists, is always inside `[low, high]`. Every
branch removes only elements that cannot be the target, and the loop ends when the range is empty. For a
boundary search: everything below `low` fails the predicate and everything from `high` up satisfies it,
so when they meet that index is the boundary. Being able to state this is what separates a derived
solution from a memorised one.

**Q: Why does `while (low <= high)` with `high = mid` loop forever?**

When `low === high`, `mid` equals both. Setting `high = mid` changes nothing, the condition stays true,
and the loop spins. The inclusive-bounds form must shrink the range with `mid - 1` or `mid + 1`; the
`high = mid` form needs the exclusive condition `low < high`, which exits as soon as they meet.

**Q: How do you search a rotated sorted array without finding the rotation point first?**

At each step, compare `nums[low]` against `nums[mid]` to identify which half is properly sorted. Then
check whether the target falls inside that half's known range: if it does, search there; if not, search
the other half. Finding the pivot first also works and costs another `O(log n)` pass, but it is not
needed.

**Q: What breaks when the rotated array has duplicates?**

The sorted-half test stops being decisive. On `[2, 2, 2, 0, 2]` with `low`, `mid` and `high` all reading
2, neither half can be ruled out, so the only correct move is to shrink one end by one — which makes the
worst case `O(n)`. Say that explicitly rather than presenting the `O(log n)` claim.

**Q: How do you recognise a problem that wants a binary search over the answer space?**

Two signals together: the question asks for a minimum or maximum value rather than a position, and
checking "does value `x` work?" is much cheaper than finding the optimum directly. Then confirm the
predicate is monotonic — if `x` works, every larger (or smaller) value works too. Koko Eating Bananas,
Split Array Largest Sum, and Capacity To Ship Packages are all the same shape.

**Q: When is binary search the wrong answer even on a sorted array?**

When you need every matching element rather than one, and the matches are dense — finding the boundary
is `O(log n)` but reading `k` results is still `O(k)`. Also when the data is on disk or behind a network
call, where `log n` random accesses can cost more than one sequential scan.

## What to Read Next

- [Chapter ?? — Two Pointers](#ch-two-pointers) — the other way to exploit a sorted array, in `O(n)`
- [Chapter ?? — Overlapping Intervals](#ch-overlapping-intervals) — where the sorted position found here is the first step
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — why `O(log n)` is worth restructuring a problem for
