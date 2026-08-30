---
title: Top K Elements
part: 10
chapter: 0
slug: top-k-elements
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-30
tags: [dsa, heap, priority-queue, top-k]
in_book: true
---

# Top K Elements {#ch-top-k-elements}

> Keep only `k` candidates in a heap, so the cost drops from `O(n log n)` to `O(n log k)` and streaming input works.

**In this chapter:** why a **min**-heap gives you the `k` **largest** · a heap in TypeScript, since the language has none · top-k by frequency · when quickselect or bucket sort beats a heap · the streaming case that only a heap handles

## 💡 The Core Idea

The obvious answer to "the 5 largest of a million numbers" is to sort and take five. That does
`O(n log n)` work to produce five values, and it needs the whole input in memory at once.

A heap of size `k` does better. Hold the best `k` seen so far; for each new element, compare it against
the **worst** of those `k` and swap if it wins. The rest of the input is never ordered at all.

The counterintuitive part is the heap's direction. For the `k` **largest**, use a **min**-heap. The
smallest of your `k` keepers sits at the root, which is exactly the element a newcomer has to beat — and
exactly the one to evict. A max-heap would put your best element where you need your worst.

> **The rule:** `k` largest → min-heap. `k` smallest → max-heap. The heap root is always the candidate
> most at risk of eviction.

## How It Works

### A heap, because TypeScript has none

JavaScript ships no priority queue. Interviewers usually let you assume one, but say so out loud rather
than silently using an API that does not exist. A comparator-driven binary heap is about twenty-five
lines:

```typescript
class Heap<T> {
  private items: T[] = [];

  // Returns negative when `a` should sit above `b`
  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(value: T): void {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.items[i], this.items[parent]) >= 0) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;                 // move the last leaf to the root, then sink it
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) smallest = left;
        if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) smallest = right;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }
}
// push: O(log n), pop: O(log n), peek: O(1)
```

The array-as-tree trick is worth knowing: for index `i`, children live at `2i + 1` and `2i + 2`, and the
parent at `(i - 1) >> 1`. No node objects, no pointers.

### The `k` largest

```typescript
function findKthLargest(nums: number[], k: number): number {
  const heap = new Heap<number>((a, b) => a - b);   // min-heap: smallest at the root

  for (const value of nums) {
    heap.push(value);
    if (heap.size > k) heap.pop();   // evict the smallest keeper, never the largest
  }
  return heap.peek()!;   // the root of a k-sized min-heap is the kth largest
}
// Time: O(n log k), Space: O(k)  — sorting is O(n log n) and O(n)
```

Two properties fall out of the size cap. The root is the `k`th largest by definition, because exactly
`k − 1` elements sit above it. And memory is `O(k)`, not `O(n)`, so the input never has to be held at
all — which is the whole reason this pattern exists.

### Top `k` by frequency

Two steps: count, then run the same heap over the counts.

```typescript
function topKFrequent(nums: number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  // Compare on frequency, so the least frequent keeper sits at the root
  const heap = new Heap<[number, number]>((a, b) => a[1] - b[1]);

  for (const entry of counts) {
    heap.push(entry);
    if (heap.size > k) heap.pop();
  }

  const result: number[] = [];
  while (heap.size > 0) result.unshift(heap.pop()![0]);   // pop gives ascending, so prepend
  return result;
}
// Time: O(n + m log k) where m is the number of distinct values, Space: O(m)
```

Note the complexity honestly: the map is `O(m)` space whatever you do, so the heap's `O(k)` saving
applies to the second phase only. The `O(n)` count is unavoidable.

### When a heap is not the fastest answer

| Situation                                        | Better tool        | Cost                              |
| ------------------------------------------------ | ------------------ | --------------------------------- |
| One-off `k`th largest, whole array in memory      | Quickselect        | `O(n)` average, `O(n²)` worst      |
| Top `k` by frequency, counts bounded by `n`       | Bucket sort        | `O(n)` guaranteed                  |
| Input arrives as a stream, or `n` does not fit    | Heap of size `k`   | `O(n log k)`, `O(k)` space         |
| `k` is close to `n`                               | Just sort          | `O(n log n)` and simpler to read   |
| `k = 1`                                           | A single scan      | `O(n)`, `O(1)`                     |
| Repeated queries as data changes                  | Heap, kept live    | `O(log k)` per update              |

Bucket sort is the answer interviewers are fishing for on Top K Frequent Elements. A frequency can
never exceed `n`, so index an array of `n + 1` buckets by count and read it from the top:

```typescript
function topKFrequentBuckets(nums: number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, count] of counts) buckets[count].push(value);

  const result: number[] = [];
  for (let count = buckets.length - 1; count >= 0 && result.length < k; count--) {
    for (const value of buckets[count]) {
      result.push(value);
      if (result.length === k) return result;
    }
  }
  return result;
}
// Time: O(n), Space: O(n)
```

⚠️ Quickselect's `O(n)` is an average, not a guarantee, and its worst case is `O(n²)` on adversarial
input. It also reorders the array. Name both costs before offering it as the optimal solution.

## When to Use It

| Signal in the question                                | Reach for            | Why                                       |
| ----------------------------------------------------- | -------------------- | ----------------------------------------- |
| "`k` largest", "`k` most frequent", "`k` closest"      | Heap of size `k`     | The defining case                          |
| "…from a stream" or "as elements arrive"              | Heap, kept live      | Nothing else handles unbounded input       |
| "Median of a stream"                                  | **Two** heaps        | A max-heap for the low half, min for the high |
| "Merge `k` sorted lists"                              | Heap of `k` heads    | The next output is always one of `k`        |
| The `k`th **smallest** element                        | Max-heap of size `k` | Mirror the rule                            |
| The full sorted order is needed anyway                | Sort                 | The heap saves nothing                     |

Find Median from Data Stream is the variation worth practising, because the two-heap answer is not
obvious and it comes up often. Keep the smaller half in a max-heap and the larger half in a min-heap,
rebalance so the sizes differ by at most one, and the median is one or both roots.

## Common Mistakes

**Using a max-heap for the `k` largest:**

```typescript
// ❌ max-heap, then pop k times — O(n) to build plus O(k log n), and O(n) space
// ✅ min-heap capped at k — O(n log k) and O(k) space
```

Both are correct. Only one of them still works when the input is a stream.

**Letting the heap grow past `k`:**

```typescript
// ❌ push everything, then pop until size === k
// ✅ if (heap.size > k) heap.pop();   // inside the loop — this is where the log k comes from
```

**Comparing the wrong field:**

```typescript
// ❌ new Heap<[number, number]>((a, b) => a[0] - b[0]);   // orders by value, not frequency
// ✅ (a, b) => a[1] - b[1];
```

**Reading `pop()` order as the answer order:**

```typescript
// ❌ while (heap.size) result.push(heap.pop()![0]);   // ascending — reversed from what was asked
// ✅ unshift, or push then reverse
```

**Not handling `k` larger than the input:**

```typescript
// ❌ heap.peek()! after fewer than k pushes returns the minimum, silently wrong
// ✅ clamp k, or return early — check the constraints for whether it is guaranteed
```

**Claiming `O(n log k)` beats `O(n log n)` when `k ≈ n`:**

```typescript
// ❌ "the heap is always faster"
// ✅ it is faster when k is much smaller than n; at k = n they are the same, and sorting is simpler
```

## Problems to Practise

| #   | Problem                          | Difficulty | What it drills                                   |
| --- | -------------------------------- | ---------- | ------------------------------------------------ |
| 703 | Kth Largest Element in a Stream  | Easy       | Why the size cap is the whole pattern             |
| 215 | Kth Largest Element in an Array  | Medium     | Min-heap of size `k`, then quickselect            |
| 347 | Top K Frequent Elements          | Medium     | Count then heap, and the bucket-sort alternative  |
| 973 | K Closest Points to Origin       | Medium     | A comparator on a derived key                     |
| 658 | Find K Closest Elements          | Medium     | Binary search beats the heap here                 |
| 692 | Top K Frequent Words             | Medium     | Tie-breaking inside the comparator                |
| 23  | Merge k Sorted Lists             | Hard       | A heap of `k` list heads                          |
| 295 | Find Median from Data Stream     | Hard       | Two heaps, and the rebalancing invariant          |

Solve 215 twice — once with a heap and once with quickselect — then 347 twice, heap and buckets. Being
able to give two solutions with honest complexities is what the question is actually testing.

## 🔑 Key Takeaways

- A heap capped at `k` costs `O(n log k)` time and `O(k)` space, against `O(n log n)` and `O(n)` for sorting.
- Use a **min**-heap for the `k` largest: the root is the weakest keeper, which is what you compare and evict.
- The size cap is the pattern — pop inside the loop, not after it.
- JavaScript has no built-in heap, so know the array-as-tree layout: children at `2i + 1` and `2i + 2`.
- Quickselect is faster on average for a one-off query; only a heap handles a stream.

## Interview Questions

**Q: Why a min-heap for the `k` largest? It sounds backwards.**

Because the element you keep checking is the *worst* of your current keepers. A min-heap puts that at
the root, so comparing a newcomer and evicting the loser are both `O(1)` to reach and `O(log k)` to fix.
With a max-heap the root is your best element, and finding the smallest keeper would cost `O(k)` every
step.

**Q: What is the actual saving over sorting?**

Time drops from `O(n log n)` to `O(n log k)`, which matters when `k` is much smaller than `n` — the five
largest of a million. The bigger win is space: `O(k)` instead of `O(n)`, which means the input never has
to be held in memory, so the same code works on a stream. At `k ≈ n` the two are equivalent and sorting
is the clearer code.

**Q: When would you use quickselect instead?**

For a single `k`th-largest query on an array that is already in memory and may be reordered. It is
`O(n)` on average by partitioning around a pivot and recursing into one side only. The costs to state
are the `O(n²)` worst case on adversarial input, which random pivot selection makes unlikely but not
impossible, and the fact that it mutates the input.

**Q: How do you find the median of a stream?**

Two heaps: a max-heap for the lower half and a min-heap for the upper half, kept within one element of
the same size. Each insert goes to one side and then rebalances by moving a root across, so the median
is the larger heap's root, or the average of both roots when sizes are equal. Insert is `O(log n)` and
reading the median is `O(1)`.

**Q: Top K Frequent Elements in guaranteed linear time — how?**

Bucket sort. A frequency cannot exceed `n`, so allocate `n + 1` buckets, put each distinct value in the
bucket matching its count, then read buckets from the highest down until you have `k` values. That is
`O(n)` time and `O(n)` space, with no comparisons at all — it works because the key range is bounded by
the input size.

## What to Read Next

- [Chapter ?? — Monotonic Stack](#ch-monotonic-stack) — the other way to answer "largest so far" in one pass
- [Chapter ?? — Modified Binary Search](#ch-modified-binary-search) — why Find K Closest Elements does not want a heap
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — where `O(n log k)` sits against `O(n log n)` in practice
