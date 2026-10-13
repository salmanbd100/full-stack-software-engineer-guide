---
sourceHash: "795fcf788c5dcf74415d537b58526aec6ac73908e676e92716f0d4f2aae984d0"
title: "Dynamic Programming"
translatedAt: "2026-10-13T03:14:20.213Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Dynamic Programming {#ch-dynamic-programming}

> প্রতিটি subproblem একবারই solve করুন, উত্তরটি লিখে রাখুন — তাহলে প্রতিটি exponential recursion নেমে আসে polynomial-এ।

**এই অধ্যায়ে:** দুটি পূর্বশর্ত · memoisation বনাম tabulation · যে পাঁচটি প্রশ্ন যেকোনো DP solution ঠিক করে দেয় · যে চারটি state shape বেশিরভাগ interview প্রশ্ন ঢেকে দেয় · array গুটিয়ে `O(1)` space-এ নামানো · কেন DP আর greedy একটি আরেকটির জায়গা নিতে পারে না

## 💡 মূল ধারণা

Dynamic programming হলো এমন recursion, যেটা মনে রাখে। সাধারণ `fib(50)` লাখ লাখ বার `fib(30)` আবার হিসাব করে।
প্রথমবারেই প্রতিটি উত্তর লিখে রাখলে এটা linear হয়ে যায়। পুরো technique এই বদলটুকুই।

দুটি property থাকতেই হবে। Code লেখার আগে দুটোই মুখে বলে যাচাই করে নেওয়া ভালো:

| Property                 | মানে                                                              | কখন খাটে না                                       |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Overlapping subproblems** | একই ছোট প্রশ্ন একাধিকবার আসে               | প্রতিটি branch আলাদা — সেটা সাধারণ recursion  |
| **Optimal substructure** | সেরা উত্তর তৈরি হয় ছোট সংস্করণগুলোর সেরা উত্তর দিয়ে      | একটি স্থানীয়ভাবে সেরা choice পুরোটার জন্য আরও ভালো উত্তর বাদ দিয়ে দিতে পারে |

Overlap না থাকলে memoise করায় memory খরচ হয়, লাভ কিছুই হয় না। Optimal substructure না থাকলে sub-answer জোড়া
দিলে ভুল ফল আসে। যত cache-ই করুন, সেটা ঠিক হয় না।

> DP-র কঠিন অংশ কখনো code নয় — কঠিন অংশ হলো **state**-এর নাম দেওয়া। যখন বলতে পারবেন "`dp[i]` হলো প্রথম `i`টি
> item-এর উত্তর", তখন recurrence সাধারণত এক line-এ নিজেই লেখা হয়ে যায়।

## কীভাবে কাজ করে

### পাঁচটি প্রশ্ন

এগুলোর উত্তর ক্রম অনুযায়ী দিন, তাহলেই solution পেয়ে যাবেন। সরাসরি code-এ চলে গেলেই DP অসম্ভব মনে হয়।

1. **State কী?** একটি subproblem-এর উত্তর কীসের ওপর নির্ভর করে? সেটাই array-এর dimension হয়।
2. **Recurrence কী?** ছোট entry-গুলো থেকে `dp[i]` কীভাবে আসে?
3. **Base case কী?** সবচেয়ে ছোট input, যার উত্তর recursion ছাড়াই দেওয়া যায়।
4. **কোন ক্রমে?** কেউ পড়ার আগে প্রতিটি entry পূরণ হয়ে থাকতে হবে।
5. **উত্তর কোথায়?** প্রায়ই `dp[n]`, কিন্তু কখনো কখনো পুরো table-এর maximum।

### Top-down: memoisation

আগে recursion লিখুন, তারপর একটি cache যোগ করুন। সময়ের চাপে এই version-টাই ব্যবহার করুন, কারণ recurrence code-এই
দেখা যায়।

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

Complexity-র যুক্তিটা সোজাসুজি বলা ভালো: `amount`টি আলাদা subproblem আছে, প্রতিটি একবার করে `coins` পরিমাণ কাজ করে।
Memo ছাড়া একই function হয় `O(coinsᵃᵐᵒᵘⁿᵗ)`।

### Bottom-up: tabulation

একই recurrence, একটি loop-এ সামনের দিকে পূরণ করা। Recursion নেই, তাই stack limit-ও নেই।

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

"অসম্ভব" বোঝাতে `amount + 1` দিয়ে পূরণ করলে `Infinity`-র arithmetic এড়ানো যায়, আর তুলনাও ঠিকঠাক হয়। কারণ কোনো
বৈধ উত্তর `amount`টির বেশি coin হতে পারে না।

| | Top-down | Bottom-up |
| --- | --- | --- |
| **কখন লিখবেন** | যখন fill order-এর চেয়ে recurrence বেশি পরিষ্কার | যখন ক্রমটা স্পষ্ট, অথবা recursion overflow করবে |
| **কী হিসাব করে** | শুধু সেই state-গুলো, যেগুলোতে সত্যিই পৌঁছানো যায় | Table-এর প্রতিটি state |
| **Space** | Memo, সাথে `O(depth)` stack | শুধু table |
| **ঝুঁকি** | গভীর input-এ stack overflow | এমন state পূরণ করা, যেগুলো কেউ কখনো পড়ে না |

দুটোই একই algorithm। যেটাতে recurrence দেখা যায় সেটা লিখুন, তারপর জিজ্ঞেস করলে রূপান্তর করুন।

### Array গুটিয়ে আনা

যখন `dp[i]` শুধু শেষ এক বা দুটি entry পড়ে, তখন array-র দরকারই নেই:

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

একই কমানো দুই dimension-এও খাটে। যে grid DP-র recurrence শুধু আগের row পড়ে, সেটা পুরো table-এর বদলে একটি row
রাখতে পারে। তাতে space `O(m × n)` থেকে `O(n)`-এ নামে। Interviewer-রা এটা follow-up হিসেবে জিজ্ঞেস করেন, তাই
trigger-টা জানুন — **recurrence কত পেছন পর্যন্ত পৌঁছায়?**

### চারটি state shape

প্রায় প্রতিটি interview DP প্রশ্নই এগুলোর একটি।

| Shape           | State                                     | Recurrence যা পড়ে                       | উদাহরণ                                        |
| --------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| **Linear**      | `dp[i]` — প্রথম `i`টি item-এর উত্তর   | আগের নির্দিষ্ট কয়েকটি entry      | Climbing Stairs, House Robber, Coin Change      |
| **Grid**        | `dp[r][c]` — ওই cell-এর উত্তর           | ওপরের cell আর বাঁয়ের cell | Unique Paths, Minimum Path Sum, Edit Distance   |
| **Subsequence** | `dp[i][j]` — দুটি sequence-এর ওপর, অথবা `i`-তে শেষ হওয়া `dp[i]` | শেষ দুটো মেলে কি না       | Longest Common Subsequence, LIS, Palindromes    |
| **Knapsack**    | `dp[i][capacity]`                          | Item-টি নিন, অথবা বাদ দিন              | Partition Equal Subset Sum, Target Sum          |

Shape চিনতে পারলে state পাওয়া যায়, আর state থেকে পাওয়া যায় loop-এর সীমা। একটি line লেখার আগেই কাজের বেশিরভাগ
হয়ে যায়।

## কখন ব্যবহার করবেন

| প্রশ্নে যে signal                                       | কী ব্যবহার করবেন            | কেন                                        |
| ------------------------------------------------------------ | -------------------- | ------------------------------------------ |
| "কত উপায়ে", "সর্বনিম্ন খরচ", "দীর্ঘতম/সর্বোচ্চ …"          | DP                   | Overlap করা choice-এর ওপর গোনা বা optimise করা |
| এমন recursion, যেটা লিখতে পারেন আর যেটা স্পষ্টতই কাজ বারবার করে         | Memoise করুন           | সবচেয়ে সস্তা রূপান্তর            |
| "সম্ভাব্য সব solution", তালিকা করে                             | Backtracking         | Output নিজেই exponential, তাই DP কিছুই বাঁচায় না |
| স্থানীয়ভাবে সেরা choice প্রমাণযোগ্যভাবে নিরাপদ                       | Greedy               | `O(n²)`-এর বদলে `O(n log n)`              |
| Choice-গুলো একটি আরেকটির ওপর নির্ভর করে না                                      | একটিমাত্র pass        | কাজে লাগানোর মতো কোনো subproblem structure নেই          |
| State-এ দুই বা তিনটির বেশি dimension লাগে            | State নিয়ে আবার ভাবুন | সাধারণত এর মানে state ভুল, problem কঠিন নয় |

Greedy-র row-টা গুরুত্বপূর্ণ। Coin `[1, 3, 4]` আর amount 6 দিয়ে Coin Change হলো প্রচলিত counterexample। Greedy
নেয় 4, তারপর 1, তারপর 1 — মোট তিনটি coin। অথচ optimum হলো 3 + 3, দুটি coin। Greedy তখনই ঠিক, যখন আপনি একটি
exchange property-র যুক্তি দিতে পারেন। DP-র সেটা লাগে না। Greedy choice নিরাপদ, এটা প্রমাণ করতে না পারলে DP ব্যবহার
করুন, আর কারণটা বলুন।

## সাধারণ ভুল

**Overlap নেই এমন recursion memoise করা:**

```typescript
// ❌ caching a recursion where every call has unique arguments — pure overhead
// ✅ check that the same subproblem genuinely recurs before adding a cache
```

**ভুল জিনিস দিয়ে memo-র key বানানো:**

```typescript
// ❌ memo.set(index, best)          // when the answer also depends on the remaining capacity
// ✅ key on every varying parameter — `${index},${capacity}` or a 2D array
```

**Base case ভুল করা:**

```typescript
// ❌ dp[0] = 1 for Coin Change   // zero coins make zero, so dp[0] = 0
// ✅ ask what the smallest input's answer actually is, and check it by hand
```

**এমন ক্রমে table পূরণ করা, যেখানে না-লেখা entry পড়া হয়:**

```typescript
// ❌ iterating capacity descending when the recurrence reads dp[capacity - coin]
// ✅ derive the direction from what the recurrence reads, not from habit
```

**যে table-এর সাথে পরে তুলনা করবেন, তাতে `Infinity` ব্যবহার করা:**

```typescript
// ❌ dp[x] = Infinity, then Infinity + 1 propagates and the -1 check gets fragile
// ✅ an impossible-but-finite sentinel such as amount + 1
```

**Recurrence অনুমতি দেওয়ার আগেই array গুটিয়ে আনা:**

```typescript
// ❌ collapsing to one row when the recurrence also reads two rows back
// ✅ keep exactly as many rows as the recurrence reaches
```

**Greedy প্রমাণযোগ্যভাবে ঠিক হলেও DP-তে চলে যাওয়া:**

```typescript
// ❌ O(n²) DP for interval scheduling, which sorting solves in O(n log n)
// ✅ if there is an exchange argument, use it — and say what it is
```

## অনুশীলনের জন্য Problem

| #   | Problem                              | কঠিনতা | কী অনুশীলন করায়                                    |
| --- | ------------------------------------ | ---------- | ------------------------------------------------- |
| 70  | Climbing Stairs                      | Easy       | সবচেয়ে ছোট recurrence, তারপর `O(1)` space |
| 198 | House Robber                         | Medium     | এমন state, যেটা শুধু index নয়, একটি constraint-ও ধারণ করে |
| 322 | Coin Change                          | Medium     | দুই দিক থেকেই, আর কেন greedy ব্যর্থ হয়              |
| 62  | Unique Paths                         | Medium     | Grid DP, আর table গুটিয়ে একটি row-তে আনা          |
| 139 | Word Break                           | Medium     | String prefix-এর ওপর একটি boolean table               |
| 300 | Longest Increasing Subsequence       | Medium     | `O(n²)` DP, তারপর `O(n log n)` patience version |
| 416 | Partition Equal Subset Sum           | Medium     | Knapsack, যেখানে capacity দ্বিতীয় dimension |
| 72  | Edit Distance                        | Hard       | দুই sequence-এর grid DP, আর তিনটি transition    |

70, তারপর 198, তারপর 322 — এই ক্রমে করুন। প্রতিটি ঠিক একটি করে নতুন ধারণা যোগ করে। তারপর 72, যেটা সেই
two-dimensional template, যার variation হলো অন্য বেশিরভাগ কঠিন DP প্রশ্ন।

## 🔑 মূল শিক্ষা

- DP-র জন্য overlapping subproblems **আর** optimal substructure দুটোই লাগে। দুটো না থাকলে এটা ভুল tool।
- আসল কাজ হলো state-এর নাম দেওয়া — `dp[i]`-এর একটি নিখুঁত মানে দাঁড়িয়ে গেলে recurrence নিজেই চলে আসে।
- Memoisation আর tabulation একই algorithm। যেটাতে recurrence দেখা যায়, সেটা বেছে নিন।
- Recurrence যদি শুধু এক বা দুটি entry পেছনে পৌঁছায়, array গুটিয়ে `O(1)` space-এ নামান।
- Greedy দ্রুত, কিন্তু এর জন্য exchange argument লাগে। `[1, 3, 4]` দিয়ে Coin Change দেখায় সেটা না থাকলে কী হয়।

## Interview-এর প্রশ্ন

**Q: DP খাটাতে হলে একটি problem-এর কোন দুটি property থাকতে হবে?**

Overlapping subproblems, যাতে caching বারবার করা কাজ বাঁচায় — overlap না থাকলে আপনি শুধু একটি সাধারণ recursion-এ
memory যোগ করছেন। আর optimal substructure, যাতে পুরোটার সেরা উত্তর তৈরি হয় অংশগুলোর সেরা উত্তর দিয়ে — এটা না থাকলে
জোড়া দেওয়ার ধাপটাই অবৈধ। তখন ভুল recurrence cache করলে ভুল উত্তর শুধু আরও দ্রুত আসে।

**Q: Memoisation নাকি tabulation — কীভাবে বেছে নেবেন?**

যখন fill order-এর চেয়ে recurrence দেখা সহজ, তখন memoisation লিখুন। Interview-এর চাপে বেশিরভাগ সময় সেটাই হয়:
recursion বলুন, একটি cache যোগ করুন, ব্যস। Tabulation-এ যান যখন input এত গভীর যে call stack overflow করবে, অথবা
যখন `O(1)`-space-এর গুটানো version চান, যেটা loop হিসেবে অনেক বেশি স্বাভাবিক। দুটো একই value হিসাব করে।
Memoisation শুধু পৌঁছানো যায় এমন state-এ যায়, আর tabulation পুরো table পূরণ করে।

**Q: State কী হবে, সেটা কীভাবে ঠিক করবেন?**

জিজ্ঞেস করুন একটি subproblem-এর উত্তর কীসের ওপর নির্ভর করে, আর প্রতিটি বদলাতে থাকা পরিমাণকে একটি করে dimension
বানান। উত্তর যদি শুধু কতগুলো item বিবেচনা করেছেন তার ওপর নির্ভর করে, state হলো `dp[i]`। যদি বাকি capacity-র ওপরও
নির্ভর করে, তাহলে `dp[i][capacity]`। চার বা তার বেশি dimension লাগলে সাধারণত বোঝায়, এর ভেতরের কিছু একটা বাকিগুলো
থেকেই বের করা যায়।

**Q: এমন একটি problem দিন, যেখানে greedy ব্যর্থ হয় আর DP সফল হয়, আর কারণটা বলুন।**

Coin `[1, 3, 4]` আর amount 6 দিয়ে Coin Change। Greedy আগে সবচেয়ে বড় coin নেয় — 4, তারপর 1, তারপর 1, মোট তিনটি
coin। অথচ optimum হলো 3 + 3, দুটি coin। Greedy ব্যর্থ হয় কারণ সবচেয়ে বড় coin নেওয়া প্রমাণযোগ্যভাবে নিরাপদ নয়: এটা
এমন একটি বাকি রেখে দিতে পারে, যেটা বাকি denomination-গুলো ভালোভাবে ঢাকতে পারে না। DP প্রতিটি সম্ভাব্য প্রথম coin
বিবেচনা করে আর সেরাটা রাখে, তাই এমন কোনো নিশ্চয়তা তার লাগে না।

**Q: একটি DP solution-কে কীভাবে `O(1)` space-এ নামাবেন?**

দেখুন recurrence কত পেছন পর্যন্ত পৌঁছায়। Climbing Stairs পড়ে `dp[i-1]` আর `dp[i-2]`, তাই দুটি variable-ই যথেষ্ট,
আর array উধাও হয়ে যায়। যে grid DP শুধু ওপরের row পড়ে, সেটা একটি row রাখে, ফলে `O(m × n)` থেকে `O(n)`। বিনিময়ে আপনি
table হারান। তাই প্রশ্নে যদি path-টাও reconstruct করতে বলে — কোন choice-এর sequence optimal ছিল — তাহলে পুরো table
এমনিতেই লাগবে।

**Q: কখন DP-র বদলে backtracking সঠিক উত্তর?**

যখন output নিজেই তালিকা — "যত subset-এর যোগফল 9, সব তালিকা করুন"। কারণ যখন প্রতিটি আলাদা উত্তর এমনিতেই তৈরি করতে হবে,
তখন cache করার মতো কোনো subproblem উত্তর থাকে না। চেনার উপায় হলো প্রশ্নটা একটি তালিকা চাইছে নাকি একটি সংখ্যা।
উপায়গুলো গুনতে বললে DP। উপায়গুলো তালিকা করতে বললে backtracking।

## এরপর কী পড়বেন

- [Chapter ?? — Backtracking](#ch-backtracking) — একই recursion, যখন তালিকাটাই উত্তর
- [Chapter ?? — Overlapping Interval](#ch-overlapping-intervals) — এমন একটি পরিবার, যেখানে greedy প্রমাণযোগ্যভাবে ঠিক
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — Coin Change-এর জন্য কেন `O(n × amount)`-ই বলার মতো bound
