---
sourceHash: "795fcf788c5dcf74415d537b58526aec6ac73908e676e92716f0d4f2aae984d0"
title: "Dynamic Programming"
translatedAt: "2026-10-19T10:26:10.673Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Dynamic Programming {#ch-dynamic-programming}

> প্রতিটি subproblem একবারই সমাধান করুন, উত্তরটা লিখে রাখুন। তাহলে যেকোনো exponential recursion নেমে আসে polynomial-এ।

**এই অধ্যায়ে:** দুটি পূর্বশর্ত · memoisation বনাম tabulation · যেকোনো DP সমাধান ঠিক করে দেয় যে পাঁচটি প্রশ্ন · interview-এর বেশিরভাগ প্রশ্ন ধরে ফেলে যে চারটি state-এর গড়ন · array গুটিয়ে `O(1)` space-এ নামানো · DP আর greedy কেন একটির জায়গায় আরেকটি বসানো যায় না

## 💡 মূল ধারণা

Dynamic programming হলো এমন recursion, যা মনে রাখে। সাদামাটা `fib(50)` লাখ লাখ বার `fib(30)` নতুন করে হিসাব
করে। প্রতিটি উত্তর প্রথমবারেই লিখে রাখলে খরচ linear হয়ে যায়। পুরো কৌশলটা এই একটি বদল।

দুটি বৈশিষ্ট্য থাকতেই হবে। Code লেখার আগে দুটিই মুখে বলে যাচাই করে নেওয়া ভালো:

| বৈশিষ্ট্য                 | মানে                                                              | কখন খাটে না                                       |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------ |
| **Overlapping subproblems** | একই ছোট প্রশ্ন একাধিকবার আসে                                    | প্রতিটি branch আলাদা, তাহলে সেটা সাধারণ recursion  |
| **Optimal substructure** | পুরো সমস্যার সেরা উত্তর তৈরি হয় ছোট সংস্করণগুলোর সেরা উত্তর দিয়ে     | এক জায়গার সেরা সিদ্ধান্ত পুরোটার আরও ভালো উত্তর আটকে দিতে পারে |

Overlap না থাকলে memoise করায় memory খরচ হয়, লাভ কিছু হয় না। Optimal substructure না থাকলে ছোট উত্তরগুলো জোড়া
দিলে ভুল result আসে, আর যত cache-ই করুন, তা ঠিক হয় না।

> DP-র কঠিন অংশ কখনোই code নয়। কঠিন হলো **state**-এর নাম দেওয়া। একবার যদি বলতে পারেন "`dp[i]` হলো প্রথম `i`
> item-এর উত্তর", তাহলে recurrence সাধারণত এক line-এই নিজে থেকে লেখা হয়ে যায়।

## কীভাবে কাজ করে

### পাঁচটি প্রশ্ন

এগুলোর উত্তর ক্রম অনুযায়ী দিন, সমাধান তৈরি হয়ে যাবে। সরাসরি code-এ ঝাঁপ দিলেই DP অসম্ভব মনে হয়।

1. **State কী?** একটি subproblem-এর উত্তর কীসের ওপর নির্ভর করে? সেটাই হবে array-র dimension।
2. **Recurrence কী?** ছোট entry-গুলো থেকে `dp[i]` কীভাবে আসে?
3. **Base case কোনগুলো?** সবচেয়ে ছোট input, যার উত্তর recurse না করেই দেওয়া যায়।
4. **কোন ক্রমে?** কোনো entry কেউ পড়ার আগেই সেটা ভরা থাকতে হবে।
5. **উত্তর কোথায়?** প্রায়ই `dp[n]`-এ, তবে কখনো কখনো পুরো table-এর maximum-এ।

### Top-down: memoisation

আগে recursion লিখুন, তারপর একটি cache যোগ করুন। সময়ের চাপে এই version-টাই ধরবেন, কারণ recurrence code-এই
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

Complexity-র যুক্তিটা পরিষ্কার করে বলুন: আলাদা subproblem আছে `amount`-টি, আর প্রতিটি একবারই `coins` পরিমাণ কাজ
করে। Memo ছাড়া একই function-এর খরচ `O(coinsᵃᵐᵒᵘⁿᵗ)`।

### Bottom-up: tabulation

একই recurrence, শুধু loop-এ সামনের দিকে ভরা হয়। Recursion নেই, তাই stack-এর সীমাও নেই।

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

"অসম্ভব" বোঝাতে `amount + 1` ভরে রাখলে `Infinity` নিয়ে হিসাব করতে হয় না, আর তুলনাও ঠিক থাকে। কারণ কোনো বৈধ উত্তরে
`amount`-এর বেশি coin লাগতে পারে না।

| | Top-down | Bottom-up |
| --- | --- | --- |
| **কখন লিখবেন** | ভরার ক্রমের চেয়ে recurrence বেশি পরিষ্কার | ক্রম স্পষ্ট, বা recursion-এ overflow হবে |
| **কী হিসাব করে** | শুধু সত্যিই পৌঁছানো যায় এমন state | Table-এর প্রতিটি state |
| **Space** | Memo, সঙ্গে `O(depth)` stack | শুধু table |
| **ঝুঁকি** | গভীর input-এ stack overflow | এমন state ভরা, যা কেউ কখনো পড়ে না |

দুটি একই algorithm। যেটায় recurrence চোখে পড়ে সেটা লিখুন, জিজ্ঞেস করলে অন্যটায় বদলে নিন।

### Array গুটিয়ে আনা

`dp[i]` যদি শুধু শেষ এক বা দুটি entry পড়ে, তাহলে array-র দরকারই নেই:

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

দুই dimension-এও একই কৌশল খাটে। Grid DP-র recurrence যদি শুধু আগের row পড়ে, তাহলে পুরো table না রেখে একটি row
রাখলেই চলে, আর space `O(m × n)` থেকে নেমে আসে `O(n)`-এ। Interviewer-রা এটা follow-up হিসেবে জিজ্ঞেস করেন, তাই
চেনার সংকেতটা জেনে রাখুন: **recurrence কতদূর পেছনে যায়?**

### State-এর চারটি গড়ন

Interview-এর প্রায় প্রতিটি DP প্রশ্ন এগুলোর কোনো একটি।

| গড়ন             | State                                     | Recurrence যা পড়ে                       | উদাহরণ                                        |
| --------------- | ----------------------------------------- | -------------------------------------- | ----------------------------------------------- |
| **Linear**      | `dp[i]`: প্রথম `i` item-এর উত্তর            | আগের নির্দিষ্ট কয়েকটি entry             | Climbing Stairs, House Robber, Coin Change      |
| **Grid**        | `dp[r][c]`: ওই cell-এর উত্তর                | ওপরের cell আর বাঁয়ের cell               | Unique Paths, Minimum Path Sum, Edit Distance   |
| **Subsequence** | `dp[i][j]`: দুটি sequence জুড়ে, বা `i`-তে শেষ হওয়া `dp[i]` | দুই প্রান্ত মেলে কি না       | Longest Common Subsequence, LIS, Palindromes    |
| **Knapsack**    | `dp[i][capacity]`                          | Item-টা নিন, অথবা বাদ দিন              | Partition Equal Subset Sum, Target Sum          |

গড়ন চিনলে state পাওয়া যায়, আর state থেকে পাওয়া যায় loop-এর সীমা। এক line লেখার আগেই কাজের বেশিরভাগটা শেষ।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                          | কী ব্যবহার করবেন        | কেন                                        |
| ------------------------------------------------------------ | -------------------- | ------------------------------------------ |
| "কত উপায়ে", "সবচেয়ে কম খরচ", "সবচেয়ে লম্বা/বড় …"               | DP                   | Overlapping সিদ্ধান্তের ওপর গোনা বা optimise করা |
| এমন recursion, যা লেখা যায় আর স্পষ্টই একই কাজ বারবার করে       | Memoise করুন         | সবচেয়ে সস্তা রূপান্তর                       |
| "সব সম্ভাব্য সমাধান", তালিকা আকারে                             | Backtracking         | Output exponential, তাই DP কিছুই বাঁচায় না   |
| এক জায়গার সেরা সিদ্ধান্ত নিরাপদ, তা প্রমাণ করা যায়               | Greedy               | `O(n²)`-এর বদলে `O(n log n)`                 |
| সিদ্ধান্তগুলো একে অপরের ওপর নির্ভর করে না                       | একবার ঘুরে আসা        | কাজে লাগানোর মতো কোনো subproblem গড়ন নেই    |
| State-এ দুই-তিনটির বেশি dimension লাগছে                       | State নিয়ে আবার ভাবুন  | সাধারণত এর মানে state ভুল, problem কঠিন নয় |

Greedy-র row-টা গুরুত্বপূর্ণ। `[1, 3, 4]` coin আর amount 6 নিয়ে Coin Change হলো চেনা counterexample। Greedy নেয়
4, তারপর 1, তারপর 1, মোট তিনটি coin। অথচ সেরা উত্তর 3 + 3, মাত্র দুটি। Greedy তখনই ঠিক, যখন exchange property
যুক্তি দিয়ে দেখাতে পারেন। DP-র এমন কিছু লাগে না। Greedy সিদ্ধান্ত নিরাপদ বলে প্রমাণ করতে না পারলে DP ব্যবহার
করুন, আর কেন করছেন তা বলুন।

## সাধারণ ভুল

**Overlap নেই এমন recursion memoise করা:**

```typescript
// ❌ caching a recursion where every call has unique arguments — pure overhead
// ✅ check that the same subproblem genuinely recurs before adding a cache
```

**ভুল জিনিসকে memo-র key বানানো:**

```typescript
// ❌ memo.set(index, best)          // when the answer also depends on the remaining capacity
// ✅ key on every varying parameter — `${index},${capacity}` or a 2D array
```

**Base case ভুল করা:**

```typescript
// ❌ dp[0] = 1 for Coin Change   // zero coins make zero, so dp[0] = 0
// ✅ ask what the smallest input's answer actually is, and check it by hand
```

**এমন ক্রমে table ভরা, যাতে এখনো লেখা হয়নি এমন entry পড়া হয়:**

```typescript
// ❌ iterating capacity descending when the recurrence reads dp[capacity - coin]
// ✅ derive the direction from what the recurrence reads, not from habit
```

**যে table-এর সঙ্গে পরে তুলনা করবেন, তাতে `Infinity` রাখা:**

```typescript
// ❌ dp[x] = Infinity, then Infinity + 1 propagates and the -1 check gets fragile
// ✅ an impossible-but-finite sentinel such as amount + 1
```

**Recurrence অনুমতি দেওয়ার আগেই array গুটিয়ে ফেলা:**

```typescript
// ❌ collapsing to one row when the recurrence also reads two rows back
// ✅ keep exactly as many rows as the recurrence reaches
```

**Greedy প্রমাণসহ ঠিক, তবু DP ধরা:**

```typescript
// ❌ O(n²) DP for interval scheduling, which sorting solves in O(n log n)
// ✅ if there is an exchange argument, use it — and say what it is
```

## অনুশীলনের জন্য Problem

| #   | Problem                              | কঠিনতা     | কী অনুশীলন হয়                                      |
| --- | ------------------------------------ | ---------- | ------------------------------------------------- |
| 70  | Climbing Stairs                      | Easy       | সবচেয়ে ছোট recurrence, তারপর `O(1)` space          |
| 198 | House Robber                         | Medium     | এমন state, যা শুধু index নয়, একটি constraint-ও ধরে রাখে |
| 322 | Coin Change                          | Medium     | দুই দিক থেকেই, আর greedy কেন ব্যর্থ হয়              |
| 62  | Unique Paths                         | Medium     | Grid DP, আর table গুটিয়ে একটি row-এ আনা            |
| 139 | Word Break                           | Medium     | String prefix-এর ওপর boolean table                 |
| 300 | Longest Increasing Subsequence       | Medium     | `O(n²)` DP, তারপর `O(n log n)` patience version      |
| 416 | Partition Equal Subset Sum           | Medium     | Knapsack, যেখানে দ্বিতীয় dimension হলো capacity     |
| 72  | Edit Distance                        | Hard       | দুই sequence-এর grid DP, আর তিনটি transition        |

70, তারপর 198, তারপর 322, ঠিক এই ক্রমে করুন। প্রতিটি ঠিক একটি করে নতুন ধারণা যোগ করে। তারপর 72। বেশিরভাগ কঠিন DP
প্রশ্ন আসলে এই দুই dimension-এর template-এরই রকমফের।

## 🔑 মূল শিক্ষা

- DP-র জন্য overlapping subproblem **আর** optimal substructure দুটিই লাগে। একটি না থাকলেও DP ভুল হাতিয়ার।
- আসল কাজ state-এর নাম দেওয়া। `dp[i]`-এর অর্থ একবার স্পষ্ট ভাষায় বলতে পারলে recurrence নিজেই চলে আসে।
- Memoisation আর tabulation একই algorithm। যেটায় recurrence চোখে পড়ে, সেটাই বেছে নিন।
- Recurrence যদি মাত্র এক বা দুটি entry পেছনে যায়, array গুটিয়ে `O(1)` space-এ নামিয়ে আনুন।
- Greedy দ্রুত, কিন্তু তার জন্য exchange argument লাগে। সেটা না থাকলে কী হয়, `[1, 3, 4]` দিয়ে Coin Change তা দেখায়।

## Interview-এর প্রশ্ন

**Q: DP খাটাতে হলে problem-এর কোন দুটি বৈশিষ্ট্য থাকতে হবে?**

প্রথমটা overlapping subproblem, যাতে cache করলে বারবারের কাজ বাঁচে। Overlap না থাকলে আপনি শুধু সাধারণ recursion-এর
সঙ্গে memory জুড়ছেন। দ্বিতীয়টা optimal substructure, যাতে পুরোটার সেরা উত্তর তৈরি হয় অংশগুলোর সেরা উত্তর দিয়ে।
এটা না থাকলে জোড়া দেওয়ার ধাপটাই অবৈধ। তখন ভুল recurrence cache করলে ভুল উত্তর শুধু আরও দ্রুত আসে।

**Q: Memoisation না tabulation, কীভাবে বাছবেন?**

ভরার ক্রমের চেয়ে recurrence দেখা সহজ হলে memoisation লিখুন। Interview-এর চাপে বেশিরভাগ সময় সেটাই হয়: recursion
লিখুন, cache যোগ করুন, কাজ শেষ। Tabulation-এ যান যখন input এত গভীর যে call stack overflow হবে, অথবা যখন
`O(1)`-space-এর গুটানো version চান, যা loop হিসেবে অনেক স্বাভাবিক। দুটিই একই value হিসাব করে। পার্থক্য হলো,
memoisation শুধু পৌঁছানো যায় এমন state-এ যায়, আর tabulation পুরো table ভরে।

**Q: State কী হবে, তা কীভাবে ঠিক করবেন?**

জিজ্ঞেস করুন, একটি subproblem-এর উত্তর কীসের ওপর নির্ভর করে। যা যা বদলায়, তার প্রতিটি একটি করে dimension।
উত্তর যদি শুধু কয়টি item দেখা হয়েছে তার ওপর নির্ভর করে, state হলো `dp[i]`। বাকি capacity-র ওপরও নির্ভর করলে
সেটা `dp[i][capacity]`। State-এ চার বা তার বেশি dimension লাগলে সাধারণত বুঝতে হবে, এর কোনো একটি বাকিগুলো থেকেই বের
করা যায়।

**Q: এমন একটি problem বলুন যেখানে greedy ব্যর্থ হয় আর DP সফল হয়, আর কারণটাও বলুন।**

`[1, 3, 4]` coin আর amount 6 নিয়ে Coin Change। Greedy আগে সবচেয়ে বড় coin নেয়: 4, তারপর 1, তারপর 1, মোট তিনটি
coin। অথচ সেরা উত্তর 3 + 3, দুটি coin। Greedy ব্যর্থ হয় কারণ সবচেয়ে বড় coin নেওয়া নিরাপদ বলে প্রমাণ করা যায় না।
এতে এমন বাকি অংশ থেকে যেতে পারে, যা বাকি coin-গুলো দিয়ে ভালোভাবে পূরণ হয় না। DP প্রতিটি সম্ভাব্য প্রথম coin
বিবেচনা করে সেরাটা রাখে, তাই এমন কোনো নিশ্চয়তার দরকার পড়ে না।

**Q: DP সমাধানকে `O(1)` space-এ কীভাবে নামাবেন?**

দেখুন recurrence কতদূর পেছনে যায়। Climbing Stairs পড়ে `dp[i-1]` আর `dp[i-2]`, তাই দুটি variable-ই যথেষ্ট, array
লাগে না। যে grid DP শুধু ওপরের row পড়ে, সেটা একটি row রাখে, আর `O(m × n)` নেমে আসে `O(n)`-এ। বিনিময়ে table-টা
হারান। তাই প্রশ্নে যদি path-টাও ফিরিয়ে বের করতে বলে, মানে কোন ক্রমের সিদ্ধান্তগুলো সেরা ছিল, তাহলে পুরো table
এমনিতেই লাগবে।

**Q: কখন DP-র বদলে backtracking-ই ঠিক উত্তর?**

যখন output নিজেই তালিকা, যেমন "যোগফল 9 হয় এমন সব subset দিন"। প্রতিটি আলাদা উত্তর যখন এমনিতেই বানাতে হবে, তখন
cache করার মতো কোনো subproblem উত্তর থাকে না। চেনার উপায় হলো, প্রশ্ন তালিকা চায় নাকি সংখ্যা। উপায় গুনতে বললে
DP, উপায়গুলোর তালিকা চাইলে backtracking।

## এরপর কী পড়বেন

- [Chapter ?? — Backtracking](#ch-backtracking) — একই recursion, যখন তালিকাটাই উত্তর
- [Chapter ?? — Overlapping Interval](#ch-overlapping-intervals) — এমন এক পরিবার, যেখানে greedy প্রমাণসহ ঠিক
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — Coin Change-এর জন্য কেন `O(n × amount)`-ই বলার মতো সীমা
