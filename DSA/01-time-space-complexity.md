---
title: Time and Space Complexity
part: 10
chapter: 0
slug: time-space-complexity
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-30
tags: [dsa, time, space, complexity]
in_book: true
---

# Time and Space Complexity {#ch-time-and-space-complexity}

> Derive the complexity of code you are looking at, and read the constraint in the question as the target you have to hit.

**In this chapter:** growth rates that matter · reading the constraint · analysing loops and recursion · space including the call stack · the five mistakes that cost marks

## 💡 The Core Idea

Big O is not a measurement. It is a claim about **growth** — what happens to the work as the input
gets bigger. Constants and lower-order terms disappear because they stop mattering long before `n`
gets large. That is why `O(3n² + 500n)` is just `O(n²)`.

The interview use is narrower than the theory. You are not proving bounds. You are doing two things:
saying what your code costs, and noticing that the constraint printed in the question already told
you what it is allowed to cost.

> A constraint of `n ≤ 10⁵` is not decoration. It rules out `O(n²)` and leaves `O(n log n)`. Saying
> that out loud, before you write anything, is the single fastest way to sound experienced.

## How It Works

### The growth rates worth knowing

| n         | O(1) | O(log n) | O(n)      | O(n log n) | O(n²) | O(2ⁿ)     |
| --------- | ---- | -------- | --------- | ---------- | ----- | --------- |
| 10        | 1    | 3        | 10        | 30         | 100   | 1,024     |
| 1,000     | 1    | 10       | 1,000     | 9,966      | 10⁶   | too large |
| 1,000,000 | 1    | 20       | 1,000,000 | ~2×10⁷     | 10¹²  | too large |

The row for a million is the one to remember. `O(n log n)` is roughly twenty times the work of
`O(n)` and stays comfortable. `O(n²)` is a trillion operations and does not finish.

### Reading the constraint

Judges and online platforms run roughly 10⁸ simple operations per second. Work backwards from that
and the constraint hands you the answer:

| Constraint      | Target complexity      | What that usually means           |
| --------------- | ---------------------- | --------------------------------- |
| `n ≤ 12`        | `O(n!)`                | Permutations, brute force is fine |
| `n ≤ 25`        | `O(2ⁿ)`                | Subsets, backtracking             |
| `n ≤ 500`       | `O(n³)`                | Triple loop, or interval DP       |
| `n ≤ 5,000`     | `O(n²)`                | Two-dimensional DP, all pairs     |
| `n ≤ 10⁵`       | `O(n log n)` or `O(n)` | Sort, heap, sliding window        |
| `n ≤ 10⁹`       | `O(log n)` or `O(1)`   | Binary search, or maths           |

⚠️ The constraint tells you the target, not the pattern. `n ≤ 10⁵` narrows sixteen patterns to about
six. It still saves you from spending ten minutes on an approach that was never going to pass.

### Analysing code

Three rules cover almost everything.

**Nested loops multiply. Sequential loops add. Constants go.**

```typescript
function analyse(a: number[], b: number[]): void {
  for (const x of a) console.log(x);        // O(n)
  for (const x of a) console.log(x * 2);    // O(n)      → O(n) + O(n) = O(n)

  for (const x of a) {                      // O(n)
    for (const y of b) console.log(x, y);   //   × O(m)  → O(n × m)
  }
}
// Total: O(n) + O(n × m) = O(n × m)
```

The trap in that snippet is the last line. `a` and `b` are different inputs, so the answer is
`O(n × m)`, not `O(n²)` and definitely not `O(n)`. You only drop a lower-order term when it is the
**same** variable: `O(n² + n)` is `O(n²)`, but `O(n + m)` stays as it is.

**A halving loop is logarithmic:**

```typescript
function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;

  // Each pass throws away half the remaining range: n → n/2 → n/4 → … → 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    arr[mid] < target ? (left = mid + 1) : (right = mid - 1);
  }
  return -1;
}
// Time: O(log n), Space: O(1)
```

### Space is not just the arrays you allocate

Space complexity counts every byte that scales with the input — including the call stack.

```typescript
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
// Time: O(n)
// Space: O(n) — n stack frames are live at the deepest point, even though nothing is allocated
```

Recursion depth is the thing candidates forget. Depth-first search on a tree is `O(h)` space where
`h` is the height; on a degenerate tree that is `O(n)`. Recursive binary search is `O(log n)` space,
while the loop above is `O(1)`.

> ⚠️ The output does not usually count. If a question asks for all `n!` permutations, the answer is
> `O(n!)` output and `O(n)` auxiliary space. Say **auxiliary** and the distinction becomes explicit.

### Recurrences worth recognising

| Shape                        | Recurrence               | Complexity   | Example         |
| ---------------------------- | ------------------------ | ------------ | --------------- |
| One recursive call, `n − 1`  | `T(n) = T(n−1) + O(1)`   | `O(n)`       | Factorial       |
| Two calls, `n − 1`           | `T(n) = 2T(n−1) + O(1)`  | `O(2ⁿ)`      | Naive Fibonacci |
| Two calls, half, linear join | `T(n) = 2T(n/2) + O(n)`  | `O(n log n)` | Merge sort      |
| One call, half               | `T(n) = T(n/2) + O(1)`   | `O(log n)`   | Binary search   |

## When to Use It

Every solution has a complexity. The decision this table drives is which optimisation to reach for
once you have a working brute force.

| Brute force looks like            | Reach for            | Cost becomes  | You pay              |
| --------------------------------- | -------------------- | ------------- | -------------------- |
| Nested loop checking for a value  | Hash map or set      | `O(n)`        | `O(n)` space         |
| Nested loop finding pairs         | Sort + two pointers  | `O(n log n)`  | Input order          |
| Recomputing every window          | Sliding window       | `O(n)`        | Nothing              |
| Repeated range sums               | Prefix sum           | `O(1)` query  | `O(n)` space         |
| Repeated search in the same array | Sort + binary search | `O(log n)`    | `O(n log n)` upfront |
| Recursion recomputing subproblems | Memoisation or DP    | `O(n)`–`O(n²)`| `O(n)`–`O(n²)` space |

The trade is almost always the same: **spend memory to buy time**. State it as a trade rather than
as an improvement, because occasionally the interviewer wants the `O(1)`-space answer instead.

## Common Mistakes

**Treating a built-in as free:**

```typescript
function normalise(arr: number[]): void {
  // ❌ "One line, so O(1)"
  for (let i = 0; i < arr.length; i++) {
    arr.sort();            // O(n log n) per call
  }
}
// Actual: O(n² log n)
```

`sort()` is `O(n log n)`. `slice()`, `includes()`, `indexOf()`, `map()` and spread are all `O(n)`.
A `for` loop wrapped around any of them is a nested loop wearing a costume.

**Quoting the average case as if it were the only case:**

```typescript
// ❌ "Hash lookups are O(1), so this is O(n)"
// ✅ "O(n) average. Worst case is O(n²) if every key collides — fine to assume average here."
```

**Forgetting the call stack:**

```typescript
// ❌ "O(1) space — I never allocate an array"
function sumTo(n: number): number {
  return n <= 0 ? 0 : n + sumTo(n - 1);   // O(n) space in stack frames
}
```

**Collapsing two different variables:**

```typescript
// ❌ O(n × m) reported as O(n) "after dropping lower terms"
// ✅ Only collapse the same variable: O(n² + n) → O(n²). O(n + m) stays O(n + m).
```

**Counting the expensive case of an amortised operation:**

```typescript
function fill(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}
// ❌ "push() sometimes reallocates, so O(n²)"
// ✅ O(n) total. Doubling happens log n times; the copies sum to under 2n, so O(1) amortised each.
```

## Reference Tables

**Data structures:**

| Structure           | Access     | Search     | Insert     | Delete     | Space    |
| ------------------- | ---------- | ---------- | ---------- | ---------- | -------- |
| Array               | `O(1)`     | `O(n)`     | `O(n)`     | `O(n)`     | `O(n)`   |
| Dynamic array push  | `O(1)`     | `O(n)`     | `O(1)`\*   | `O(n)`     | `O(n)`   |
| Linked list         | `O(n)`     | `O(n)`     | `O(1)`†    | `O(1)`†    | `O(n)`   |
| Hash map / set      | —          | `O(1)`‡    | `O(1)`‡    | `O(1)`‡    | `O(n)`   |
| Balanced BST        | `O(log n)` | `O(log n)` | `O(log n)` | `O(log n)` | `O(n)`   |
| Heap                | —          | `O(n)`     | `O(log n)` | `O(log n)` | `O(n)`   |
| Trie                | —          | `O(m)`     | `O(m)`     | `O(m)`     | `O(n×m)` |

\* amortised · † at a node you already hold · ‡ average case, `O(n)` worst · `m` = key length

**Sorting:**

| Algorithm  | Average      | Worst        | Space      | Stable | Use when                     |
| ---------- | ------------ | ------------ | ---------- | ------ | ---------------------------- |
| Merge sort | `O(n log n)` | `O(n log n)` | `O(n)`     | ✅     | Stability matters            |
| Quick sort | `O(n log n)` | `O(n²)`      | `O(log n)` | ❌     | In-place, general purpose    |
| Heap sort  | `O(n log n)` | `O(n log n)` | `O(1)`     | ❌     | Memory is tight              |
| Counting   | `O(n + k)`   | `O(n + k)`   | `O(k)`     | ✅     | Small integer range `k`      |

In an interview, use the language's built-in sort and call it `O(n log n)`. V8 uses Timsort, which is
stable and `O(n log n)` worst case. Only hand-roll a sort if the question is about the sort.

## 🔑 Key Takeaways

- Big O describes growth, so constants and lower-order terms are dropped — but only within the same variable.
- The constraint on `n` in the question states the target complexity; read it before choosing an approach.
- Nested loops multiply, sequential loops add, and a halving loop is `O(log n)`.
- Space complexity includes the recursion call stack, not only the data you allocate.
- Almost every optimisation here is the same trade: extra memory in exchange for fewer passes.

## Interview Questions

**Q: What is the time and space complexity of your solution, and how do you know?**

Name the dominant operation and how many times it runs relative to `n`, then name every structure
whose size grows with `n`, including the call stack. "One pass over the array, and a map that holds
at most `n` keys, so `O(n)` time and `O(n)` space." Saying which part dominates matters more than
the letter itself.

**Q: The constraint says `n ≤ 10⁵`. What does that tell you before you have read the problem?**

That `O(n²)` is out — ten billion operations will time out — and the intended answer is `O(n log n)`
or better. That narrows the field to sorting, a heap, binary search, a hash map, or a linear scan
with a window. It is a hint the setter deliberately left in the question.

**Q: Is `O(1)` always faster than `O(n)`?**

No. Big O describes behaviour as `n` grows, not the runtime at a specific size. A hash lookup with an
expensive hash can lose to a linear scan of ten elements, and quick sort usually beats merge sort in
practice despite the worse bound. For small or fixed `n`, measure rather than derive.

**Q: When would you deliberately choose the slower complexity?**

When memory is the binding constraint, or when the input is known to be small. A `O(n²)` in-place
pass beats an `O(n)` solution that needs a hash map the size of the input on a memory-limited device.
The judgement to show is that complexity is one axis, not the whole decision.

**Q: Why is appending to a dynamic array `O(1)` when it sometimes has to copy everything?**

Because the copy happens rarely enough to average out. The array doubles, so reallocation occurs
about `log n` times and the copies total under `2n` across `n` appends. That is amortised analysis:
`O(1)` per operation over the sequence, even though one individual call is `O(n)`.

## What to Read Next

- [Chapter ?? — Prefix Sum](#ch-prefix-sum) — the first pattern that trades `O(n)` space for `O(1)` queries
- [Chapter ?? — Two Pointers](#ch-two-pointers) — how sorted input turns a nested loop into a single pass
- [Chapter ?? — Dynamic Programming](#ch-dynamic-programming) — where the exponential-to-polynomial jump comes from
