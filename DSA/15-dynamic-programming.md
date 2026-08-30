---
title: Dynamic Programming
part: 10
chapter: 0
slug: dynamic-programming
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-30
tags: [dsa, dynamic-programming, memoization, tabulation]
in_book: true
---

# Dynamic Programming {#ch-dynamic-programming}

> Solve each subproblem once, write the answer down, and every exponential recursion collapses to a polynomial one.

**In this chapter:** the two preconditions · memoisation versus tabulation · the five questions that define any DP solution · the four state shapes that cover most interview questions · rolling the array down to `O(1)` space · why DP and greedy are not interchangeable

## 💡 The Core Idea

Dynamic programming is recursion that remembers. Naive `fib(50)` recomputes `fib(30)` millions of times;
writing each answer down the first time makes it linear. The whole technique is that substitution.

Two properties must hold, and both are worth checking out loud before writing code:

| Property                 | Means                                                              | Fails when                                       |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Overlapping subproblems** | The same smaller question comes up more than once               | Every branch is unique — that is plain recursion  |
| **Optimal substructure** | The best answer is built from best answers to smaller versions      | A locally best choice can rule out a better whole |

Without overlap, memoising costs memory and buys nothing. Without optimal substructure, combining
sub-answers gives the wrong result, and no amount of caching fixes it.

> The hard part of DP is never the code — it is naming the **state**. Once you can say "`dp[i]` is the
> answer for the first `i` items", the recurrence usually writes itself in one line.

## How It Works

### The five questions

Answer these in order and you have a solution. Skipping straight to code is what makes DP feel
impossible.

1. **What is the state?** What does one subproblem's answer depend on? That becomes the array's dimensions.
2. **What is the recurrence?** How does `dp[i]` follow from smaller entries?
3. **What are the base cases?** The smallest inputs you can answer without recursing.
4. **What order?** Every entry must be filled before something reads it.
5. **Where is the answer?** Often `dp[n]`, but sometimes the maximum over the whole table.

### Top-down: memoisation

Write the recursion first, then add a cache. This is the version to reach for under time pressure,
because the recurrence is visible in the code.

```typescript
// LC 322 — the fewest coins summing to `amount`, or -1
function coinChangeTopDown(coins: number[], amount: number): number {
  const memo = new Map<number, number>();

  const fewest = (remaining: number): number => {
    if (remaining === 0) return 0;
    if (remaining < 0) return Infinity;      // this branch cannot produce a valid answer
    const cached = memo.get(remaining);
    if (cached !== undefined) return cached;

    let best = Infinity;
    for (const coin of coins) {
      best = Math.min(best, fewest(remaining - coin) + 1);
    }
    memo.set(remaining, best);
    return best;
  };

  const result = fewest(amount);
  return result === Infinity ? -1 : result;
}
// Time: O(amount × coins), Space: O(amount) for the memo plus O(amount) of recursion depth
```

The complexity argument is worth stating plainly: there are `amount` distinct subproblems, each doing
`coins` work once. Without the memo the same function is `O(coinsᵃᵐᵒᵘⁿᵗ)`.

### Bottom-up: tabulation

Same recurrence, filled forwards in a loop. No recursion, so no stack limit.

```typescript
function coinChangeBottomUp(coins: number[], amount: number): number {
  // dp[x] = fewest coins summing to exactly x. amount + 1 is an impossible sentinel
  const dp: number[] = new Array(amount + 1).fill(amount + 1);
  dp[0] = 0;   // zero coins make zero

  for (let target = 1; target <= amount; target++) {
    for (const coin of coins) {
      if (coin <= target) {
        dp[target] = Math.min(dp[target], dp[target - coin] + 1);
      }
    }
  }
  return dp[amount] > amount ? -1 : dp[amount];
}
// Time: O(amount × coins), Space: O(amount)
```

`amount + 1` as the "impossible" filler avoids `Infinity` arithmetic and still compares correctly, since
no valid answer can exceed `amount` coins.

| | Top-down | Bottom-up |
| --- | --- | --- |
| **Write it when** | The recurrence is clearer than the fill order | The order is obvious, or recursion would overflow |
| **Computes** | Only the states actually reachable | Every state in the table |
| **Space** | Memo plus `O(depth)` stack | Table only |
| **Risk** | Stack overflow on deep input | Filling states nothing ever reads |

Both are the same algorithm. Write whichever makes the recurrence visible, then convert if asked.

### Rolling the array

When `dp[i]` reads only the last one or two entries, the array is unnecessary:

```typescript
// LC 70 — the number of ways to climb n stairs taking 1 or 2 at a time
function climbStairs(n: number): number {
  let twoBack = 1;   // dp[0]
  let oneBack = 1;   // dp[1]

  for (let i = 2; i <= n; i++) {
    const current = oneBack + twoBack;   // dp[i] = dp[i-1] + dp[i-2]
    twoBack = oneBack;
    oneBack = current;
  }
  return oneBack;
}
// Time: O(n), Space: O(1)  — down from O(n)
```

The same reduction applies in two dimensions: a grid DP whose recurrence reads only the previous row can
keep one row instead of the whole table, taking `O(m × n)` space to `O(n)`. Interviewers ask for this as
a follow-up, so know the trigger — **how far back does the recurrence reach?**

### The four state shapes

Nearly every interview DP question is one of these.

| Shape           | State                                     | Recurrence reads                       | Examples                                        |
| --------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| **Linear**      | `dp[i]` — answer for the first `i` items   | A fixed number of earlier entries      | Climbing Stairs, House Robber, Coin Change      |
| **Grid**        | `dp[r][c]` — answer at that cell           | The cell above and the cell to the left | Unique Paths, Minimum Path Sum, Edit Distance   |
| **Subsequence** | `dp[i][j]` — over two sequences, or `dp[i]` ending at `i` | Whether the ends match       | Longest Common Subsequence, LIS, Palindromes    |
| **Knapsack**    | `dp[i][capacity]`                          | Take the item, or skip it              | Partition Equal Subset Sum, Target Sum          |

Recognising the shape gives you the state, and the state gives you the loop bounds. That is most of the
work done before a line is written.

## When to Use It

| Signal in the question                                       | Reach for            | Why                                        |
| ------------------------------------------------------------ | -------------------- | ------------------------------------------ |
| "How many ways", "minimum cost", "longest/maximum …"          | DP                   | Counting or optimising over overlapping choices |
| A recursion you can write, that visibly repeats work         | Memoise it           | The cheapest possible conversion            |
| "All possible solutions", listed                             | Backtracking         | The output is exponential, so DP saves nothing |
| A locally best choice is provably safe                       | Greedy               | `O(n log n)` instead of `O(n²)`              |
| Choices are independent                                      | A single pass        | No subproblem structure to exploit          |
| The state needs more than two or three dimensions            | Reconsider the state | Usually a sign the state is wrong, not that the problem is hard |

The greedy row matters. Coin Change with coins `[1, 3, 4]` and amount 6 is the standard
counterexample: greedy takes 4 then 1 then 1 for three coins, while the optimum is 3 + 3 for two. Greedy
is correct only when you can argue an exchange property; DP does not need one. If you cannot prove the
greedy choice is safe, use DP and say why.

## Common Mistakes

**Memoising a recursion with no overlap:**

```typescript
// ❌ caching a recursion where every call has unique arguments — pure overhead
// ✅ check that the same subproblem genuinely recurs before adding a cache
```

**Keying the memo on the wrong thing:**

```typescript
// ❌ memo.set(index, best)          // when the answer also depends on the remaining capacity
// ✅ key on every varying parameter — `${index},${capacity}` or a 2D array
```

**Getting the base case wrong:**

```typescript
// ❌ dp[0] = 1 for Coin Change   // zero coins make zero, so dp[0] = 0
// ✅ ask what the smallest input's answer actually is, and check it by hand
```

**Filling the table in an order that reads unwritten entries:**

```typescript
// ❌ iterating capacity descending when the recurrence reads dp[capacity - coin]
// ✅ derive the direction from what the recurrence reads, not from habit
```

**Using `Infinity` in a table you then compare against:**

```typescript
// ❌ dp[x] = Infinity, then Infinity + 1 propagates and the -1 check gets fragile
// ✅ an impossible-but-finite sentinel such as amount + 1
```

**Rolling the array before the recurrence allows it:**

```typescript
// ❌ collapsing to one row when the recurrence also reads two rows back
// ✅ keep exactly as many rows as the recurrence reaches
```

**Reaching for DP when greedy is provably correct:**

```typescript
// ❌ O(n²) DP for interval scheduling, which sorting solves in O(n log n)
// ✅ if there is an exchange argument, use it — and say what it is
```

## Problems to Practise

| #   | Problem                              | Difficulty | What it drills                                    |
| --- | ------------------------------------ | ---------- | ------------------------------------------------- |
| 70  | Climbing Stairs                      | Easy       | The smallest possible recurrence, then `O(1)` space |
| 198 | House Robber                         | Medium     | A state that encodes a constraint, not just an index |
| 322 | Coin Change                          | Medium     | Both directions, and why greedy fails              |
| 62  | Unique Paths                         | Medium     | Grid DP, and rolling the table to one row          |
| 139 | Word Break                           | Medium     | A boolean table over string prefixes               |
| 300 | Longest Increasing Subsequence       | Medium     | The `O(n²)` DP, then the `O(n log n)` patience version |
| 416 | Partition Equal Subset Sum           | Medium     | Knapsack, with the capacity as the second dimension |
| 72  | Edit Distance                        | Hard       | Two-sequence grid DP, and the three transitions    |

Do 70, then 198, then 322 in that order — each adds exactly one idea. Then 72, which is the two-dimensional
template most other hard DP questions are variations on.

## 🔑 Key Takeaways

- DP needs overlapping subproblems **and** optimal substructure; without both, it is the wrong tool.
- Naming the state is the work — once `dp[i]` has a precise English meaning, the recurrence follows.
- Memoisation and tabulation are the same algorithm; pick whichever makes the recurrence visible.
- If the recurrence reaches back only one or two entries, roll the array down to `O(1)` space.
- Greedy is faster but needs an exchange argument; Coin Change with `[1, 3, 4]` shows what happens without one.

## Interview Questions

**Q: What two properties must a problem have for DP to apply?**

Overlapping subproblems, so that caching saves repeated work — without overlap you are just adding memory
to a plain recursion. And optimal substructure, so that the best answer to the whole is composed of best
answers to its parts — without it the combination step is invalid, and caching a wrong recurrence gives
wrong answers faster.

**Q: Memoisation or tabulation — how do you choose?**

Write memoisation when the recurrence is easier to see than the fill order, which is most of the time
under interview pressure: state the recursion, add a cache, done. Switch to tabulation when the input is
deep enough to overflow the call stack, or when you want the `O(1)`-space rolling version, which is much
more natural as a loop. They compute the same values; memoisation only visits reachable states, while
tabulation fills the whole table.

**Q: How do you decide what the state is?**

Ask what a subproblem's answer depends on, and make each varying quantity one dimension. If the answer
depends only on how many items you have considered, the state is `dp[i]`. If it also depends on remaining
capacity, it is `dp[i][capacity]`. A state needing four or more dimensions is usually a sign that
something in it is derivable from the rest.

**Q: Give a problem where greedy fails and DP succeeds, and say why.**

Coin Change with coins `[1, 3, 4]` and amount 6. Greedy takes the largest coin first — 4, then 1, then 1,
so three coins — while the optimum is 3 + 3, two coins. Greedy fails because taking the largest coin is
not provably safe: it can leave a remainder that the remaining denominations cover badly. DP considers
every first coin and keeps the best, so it needs no such guarantee.

**Q: How do you get a DP solution down to `O(1)` space?**

Look at how far back the recurrence reaches. Climbing Stairs reads `dp[i-1]` and `dp[i-2]`, so two
variables suffice and the array disappears. A grid DP reading only the row above keeps one row, taking
`O(m × n)` to `O(n)`. The trade is that you lose the table, so if the question also asks you to
reconstruct the path — which sequence of choices was optimal — you need the full table anyway.

**Q: When is backtracking the right answer instead of DP?**

When the output itself is the enumeration — "list all subsets that sum to 9" — because there is no
subproblem answer worth caching when every distinct answer must be produced anyway. The tell is whether
the question wants a list or a number. Count the ways and it is DP; list the ways and it is backtracking.

## What to Read Next

- [Chapter ?? — Backtracking](#ch-backtracking) — the same recursion when the enumeration is the answer
- [Chapter ?? — Overlapping Intervals](#ch-overlapping-intervals) — a family where greedy is provably correct
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — why `O(n × amount)` is the bound to quote for Coin Change
