---
title: Backtracking
part: 10
chapter: 0
slug: backtracking
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-30
tags: [dsa, backtracking, recursion, combinatorics]
in_book: true
---

# Backtracking {#ch-backtracking}

> Choose, recurse, un-choose — and prune the branches that cannot possibly work before you walk them.

**In this chapter:** the three-step template · why the result must be a copy · the `i + 1` that separates subsets from permutations · handling duplicates by sorting and skipping · pruning, which is the only thing that makes it tractable · the complexities you must state up front

## 💡 The Core Idea

Backtracking is depth-first search over a space of *candidate answers* rather than a fixed graph. At each
step you make one choice, explore everything that follows from it, then undo the choice and try the next.

Trying on outfits is the everyday version: put on a shirt, try every pair of trousers with it, take the
shirt off, try the next one. The undo is what makes it backtracking rather than plain recursion — the
state is shared, so it has to be returned to how you found it.

Three lines carry every problem in the family:

```text
choose    → push the option onto the current partial answer
explore   → recurse
un-choose → pop it back off
```

> The difference between backtracking and brute force is **pruning**. N-Queens on an 8×8 board has
> 4,426,165,368 possible placements and 92 solutions. Rejecting a partial board the moment two queens
> attack each other is what turns an impossible search into an instant one.

## How It Works

### Subsets — the template

```typescript
function subsets(nums: number[]): number[][] {
  const results: number[][] = [];
  const current: number[] = [];

  const explore = (start: number): void => {
    results.push([...current]);   // every node in the tree is a valid subset — copy it

    for (let i = start; i < nums.length; i++) {
      current.push(nums[i]);      // choose
      explore(i + 1);             // explore — i + 1 forbids reuse and fixes the order
      current.pop();              // un-choose
    }
  };

  explore(0);
  return results;
}
// Time: O(n × 2ⁿ) — 2ⁿ subsets, each costing O(n) to copy. Space: O(n) excluding the output
```

Two lines deserve attention.

`results.push([...current])` must be a copy. Pushing `current` itself stores a reference to an array that
`pop()` is about to mutate, so every entry in `results` ends up as the same empty array. This is the most
common backtracking bug and it is silent — the code runs, the answer is wrong.

`explore(i + 1)` is where subsets and permutations diverge. Passing `i + 1` means each element is
considered once and only in increasing index order, so `[1, 2]` is generated and `[2, 1]` is not.
Permutations need every unused element available at every position, which is a different loop:

```typescript
function permute(nums: number[]): number[][] {
  const results: number[][] = [];
  const current: number[] = [];
  const used: boolean[] = new Array(nums.length).fill(false);

  const explore = (): void => {
    if (current.length === nums.length) {
      results.push([...current]);   // only complete arrangements count
      return;
    }
    for (let i = 0; i < nums.length; i++) {   // from 0 every time, not from `start`
      if (used[i]) continue;
      used[i] = true;
      current.push(nums[i]);
      explore();
      current.pop();
      used[i] = false;              // undo *both* pieces of state
    }
  };

  explore();
  return results;
}
// Time: O(n × n!), Space: O(n) excluding the output
```

| Question type    | Loop starts at | Recurse with  | Result recorded            |
| ---------------- | -------------- | ------------- | -------------------------- |
| Subsets          | `start`        | `i + 1`       | At every node               |
| Combinations     | `start`        | `i + 1`       | When the size reaches `k`   |
| Permutations     | `0`            | no index, `used[]` instead | When the length reaches `n` |
| Combination Sum (reuse allowed) | `start` | `i`      | When the remainder hits 0   |

That table is the whole family. Getting the wrong row is what makes an answer contain duplicates or miss
arrangements.

### Pruning

Pruning is a `return` placed as early as the constraint allows. Generate Parentheses is the clearest case
— rather than generating all `2ⁿ` strings and filtering the valid ones, it only ever builds valid
prefixes:

```typescript
function generateParenthesis(n: number): string[] {
  const results: string[] = [];

  const explore = (current: string, open: number, close: number): void => {
    if (current.length === 2 * n) {
      results.push(current);
      return;
    }
    // Two prunes: never exceed n opens, never close more than is open
    if (open < n) explore(current + '(', open + 1, close);
    if (close < open) explore(current + ')', open, close + 1);
  };

  explore('', 0, 0);
  return results;
}
// Time: O(4ⁿ / √n) — the nth Catalan number. Space: O(n) of recursion depth
```

`close < open` is the prune. Without it the recursion explores `")("` and every dead branch below it.
With it, no invalid string is ever built, so the work is proportional to the number of *answers* rather
than the number of candidates.

⚠️ Strings are immutable in JavaScript, so `current + '('` allocates a new string each call. That is fine
at these sizes and keeps the code short, but for a long build use an array with push/pop as in the
subsets template.

### Duplicates

When the input can contain repeats, the standard fix is: **sort first, then skip a value equal to its
predecessor at the same level.**

```typescript
function subsetsWithDup(nums: number[]): number[][] {
  const sorted = [...nums].sort((a, b) => a - b);   // equal values become adjacent
  const results: number[][] = [];
  const current: number[] = [];

  const explore = (start: number): void => {
    results.push([...current]);
    for (let i = start; i < sorted.length; i++) {
      // Skip a repeat only when it is a *sibling*, not when it is the first choice at this level
      if (i > start && sorted[i] === sorted[i - 1]) continue;
      current.push(sorted[i]);
      explore(i + 1);
      current.pop();
    }
  };

  explore(0);
  return results;
}
// Time: O(n × 2ⁿ), Space: O(n) excluding the output
```

`i > start` is the load-bearing condition. Skipping every repeat outright would also drop `[2, 2]`, which
is a legitimate subset; the rule is that a duplicate value must not be the *starting* choice of two
sibling branches, because those branches would generate identical trees.

## When to Use It

| Signal in the question                                    | Reach for            | Why                                       |
| --------------------------------------------------------- | -------------------- | ----------------------------------------- |
| "All possible", "every combination", "enumerate"          | Backtracking         | The defining case                          |
| "Generate valid…" with a constraint to check              | Backtracking + pruning | The constraint is the prune             |
| A puzzle to fill in — Sudoku, N-Queens, word grids        | Backtracking         | Place, validate, undo                      |
| **Count** the ways, or the **best** way                   | Dynamic programming  | Enumerating exponentially many answers to count them is waste |
| "Does any solution exist"                                 | Backtracking, returning early | Stop at the first success           |
| The input is large and the output is one number           | Dynamic programming or greedy | Exponential output means exponential time |

The dynamic-programming row is the important one. If the question wants *how many* or *the cheapest*
rather than the list itself, backtracking is the wrong tool — overlapping subproblems get recomputed
instead of memoised. See [Chapter ?? — Dynamic Programming](#ch-dynamic-programming).

State the complexity before writing code. These problems are exponential by nature — `O(2ⁿ)` for subsets,
`O(n!)` for permutations — and saying so up front shows you know the output size is the bound, not the
algorithm being sloppy.

## Common Mistakes

**Storing a reference instead of a copy:**

```typescript
// ❌ results.push(current);       // every entry aliases one array that pop() empties
// ✅ results.push([...current]);
```

**Forgetting to undo:**

```typescript
// ❌ current.push(nums[i]); explore(i + 1);   // the next sibling inherits a dirty state
// ✅ ...explore(i + 1); current.pop();
```

**Undoing only half the state:**

```typescript
// ❌ current.pop();                 // but used[i] is left true, so the element never returns
// ✅ current.pop(); used[i] = false;
```

**Passing `i` when you meant `i + 1`:**

```typescript
// ❌ explore(i);       // allows reuse — correct for Combination Sum, wrong for Subsets
// ✅ explore(i + 1);   // each element considered once
```

**Skipping duplicates unconditionally:**

```typescript
// ❌ if (sorted[i] === sorted[i - 1]) continue;          // loses legitimate results like [2,2]
// ✅ if (i > start && sorted[i] === sorted[i - 1]) continue;
```

**Not sorting before the duplicate skip:**

```typescript
// ❌ the skip compares against the previous *index*, which only works if equals are adjacent
// ✅ sort first
```

**Filtering instead of pruning:**

```typescript
// ❌ generate all 2ⁿ candidates, then keep the valid ones
// ✅ refuse to extend a prefix that already violates the constraint
```

## Problems to Practise

| #   | Problem                                     | Difficulty | What it drills                                  |
| --- | ------------------------------------------- | ---------- | ----------------------------------------------- |
| 78  | Subsets                                     | Medium     | The template, and the copy                       |
| 77  | Combinations                                | Medium     | Recording at a fixed size instead of every node   |
| 46  | Permutations                                | Medium     | `used[]` instead of a start index                 |
| 22  | Generate Parentheses                        | Medium     | Pruning that removes every invalid branch         |
| 39  | Combination Sum                             | Medium     | `explore(i)` for reuse, and pruning on remainder  |
| 90  | Subsets II                                  | Medium     | Sort, then the `i > start` skip                   |
| 79  | Word Search                                 | Medium     | Backtracking on a grid, marking and restoring     |
| 51  | N-Queens                                    | Hard       | Constraint sets that make validation `O(1)`        |

Do 78 then 90 — the second is the first plus the duplicate rule. Then 46 and 39 together: one forbids
reuse, the other requires it, and the difference is a single argument.

## 🔑 Key Takeaways

- Choose, explore, un-choose — the undo is what distinguishes backtracking from plain recursion.
- Always copy the partial answer when recording a result; storing the reference is a silent wrong answer.
- `explore(i + 1)` forbids reuse, `explore(i)` allows it, and permutations need `used[]` instead of an index.
- Handle duplicates by sorting, then skipping a repeat only when `i > start`.
- Pruning is the difference between exponential-in-candidates and exponential-in-answers; state the complexity up front.

## Interview Questions

**Q: What is the difference between backtracking and DFS?**

Backtracking is DFS over a tree of partial candidate solutions rather than an existing graph, with two
additions: shared state is undone as the recursion unwinds, and branches are abandoned as soon as they
cannot lead to a valid answer. Plain DFS on a graph has nothing to undo, because the graph is not being
modified by the traversal.

**Q: Why must you copy the current path when recording a result?**

Because `current` is one array reused across the whole search — `pop()` is about to mutate it. Pushing the
reference stores a pointer, so every result in the output ends up reflecting whatever state `current`
finished in, which is empty. Spreading into a new array snapshots the values at that moment.

**Q: Why does `explore(i + 1)` give subsets and `explore(0)` give permutations?**

`i + 1` means each recursive level may only consider elements after the one just chosen, so every subset
is generated exactly once and always in increasing index order — no rearrangements. Permutations need
every unused element available at every position, so the loop restarts at 0 and a `used` array replaces
the start index. Ordering matters for permutations and does not for subsets, and that is exactly what the
two forms encode.

**Q: How do you handle duplicates in the input?**

Sort so equal values are adjacent, then within a level skip any element equal to its predecessor unless
it is the first choice at that level — the `i > start` condition. That prevents two sibling branches from
starting with the same value and generating identical subtrees, while still allowing a value to be used
twice down a single branch, which is legitimate.

**Q: When would you use dynamic programming instead?**

When the question asks for a count or an optimum rather than the enumeration itself. Backtracking
recomputes overlapping subproblems from scratch, so "how many ways to make 11 from these coins" is
exponential by backtracking and `O(amount × coins)` by DP. The tell is that the output is a single number
rather than a list of answers.

**Q: What is the time complexity of a backtracking solution, and how do you justify it?**

It is the size of the explored tree, which is usually the number of candidate answers times the cost of
recording each: `O(n × 2ⁿ)` for subsets, `O(n × n!)` for permutations, `O(4ⁿ / √n)` for Generate
Parentheses because that is the Catalan number. Pruning cannot change the asymptotic bound when the output
itself is exponential — it changes how close you get to that lower bound, which in practice is the whole
difference.

## What to Read Next

- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — the traversal this pattern is built on
- [Chapter ?? — Dynamic Programming](#ch-dynamic-programming) — where to go when the question counts rather than enumerates
- [Chapter ?? — Time and Space Complexity](#ch-time-and-space-complexity) — how to state an exponential bound without sounding apologetic
