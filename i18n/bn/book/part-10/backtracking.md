---
sourceHash: "0c7fae7651e86bd007e7f0a2a76be8c59fb38663690dce83c78449efb77d7213"
title: "Backtracking"
translatedAt: "2026-10-19T10:26:10.444Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Backtracking {#ch-backtracking}

> বেছে নিন, recurse করুন, বাছাই ফিরিয়ে নিন। আর যে branch কোনোভাবেই কাজ করবে না, তাতে হাঁটার আগেই ছেঁটে ফেলুন।

**এই অধ্যায়ে:** তিন ধাপের template · result কেন copy হতেই হবে · যে `i + 1` subset আর permutation-কে আলাদা করে · sort করে আর skip করে duplicate সামলানো · pruning, যা না থাকলে সমস্যাটা সমাধানযোগ্যই থাকে না · যে complexity শুরুতেই বলে দিতে হয়

## 💡 মূল ধারণা

Backtracking হলো depth-first search, তবে নির্দিষ্ট কোনো graph-এর ওপর নয়, *সম্ভাব্য উত্তরের* জগতের ওপর। প্রতিটি
ধাপে আপনি একটি সিদ্ধান্ত নেন। সেই সিদ্ধান্ত থেকে যা যা আসে, সব ঘুরে দেখেন। তারপর সিদ্ধান্তটা ফিরিয়ে নিয়ে পরেরটা
চেষ্টা করেন।

রোজকার উদাহরণ হলো জামা মিলিয়ে দেখা। একটি shirt পরলেন, তার সঙ্গে প্রতিটি প্যান্ট মিলিয়ে দেখলেন, shirt খুলে পরেরটা
পরলেন। এই খুলে ফেলাটাই একে সাধারণ recursion থেকে আলাদা করে backtracking বানায়। State সবার মধ্যে ভাগ করা, তাই
যেমন পেয়েছিলেন, ঠিক তেমন করে ফিরিয়ে দিতে হয়।

এই পরিবারের প্রতিটি problem তিনটি line-এর ওপর দাঁড়িয়ে:

```text
choose    → push the option onto the current partial answer
explore   → recurse
un-choose → pop it back off
```

> Backtracking আর brute force-এর পার্থক্য হলো **pruning**। 8×8 board-এ N-Queens-এর সম্ভাব্য বসানোর উপায়
> 4,426,165,368টি, আর সমাধান মাত্র 92টি। দুটি queen একে অপরকে আক্রমণ করার মুহূর্তেই অসম্পূর্ণ board বাতিল করে
> দিলে অসম্ভব search-ও চোখের পলকে শেষ হয়।

## কীভাবে কাজ করে

### Subset: template

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

দুটি line-এ নজর দেওয়া দরকার।

`results.push([...current])` অবশ্যই copy হতে হবে। `current`-কেই push করলে এমন array-র reference জমা হয়, যেটা
`pop()` একটু পরেই বদলে দেবে। ফলে `results`-এর প্রতিটি entry শেষে একই খালি array হয়ে থাকে। Backtracking-এ এটাই
সবচেয়ে বেশি হওয়া bug, আর এটা নিঃশব্দ: code চলে, কিন্তু উত্তর ভুল।

Subset আর permutation আলাদা হয়ে যায় `explore(i + 1)`-এ এসে। `i + 1` পাঠানো মানে প্রতিটি element একবারই বিবেচনা
হয়, আর শুধু বাড়ন্ত index-এর ক্রমে। তাই `[1, 2]` তৈরি হয়, কিন্তু `[2, 1]` হয় না। Permutation-এ প্রতিটি অবস্থানে
প্রতিটি অব্যবহৃত element হাতের কাছে থাকতে হয়, তাই loop-টা আলাদা:

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

| প্রশ্নের ধরন       | Loop শুরু হয় | Recurse করে যা দিয়ে | Result কখন রাখা হয়         |
| ---------------- | -------------- | ------------- | -------------------------- |
| Subsets          | `start`        | `i + 1`       | প্রতিটি node-এ              |
| Combinations     | `start`        | `i + 1`       | Size `k`-তে পৌঁছালে          |
| Permutations     | `0`            | কোনো index নয়, বদলে `used[]` | দৈর্ঘ্য `n`-এ পৌঁছালে |
| Combination Sum (বারবার ব্যবহার চলে) | `start` | `i`      | বাকি অংশ 0 হলে             |

পুরো পরিবারটা এই table-এই আছে। ভুল row বেছে নিলেই উত্তরে duplicate ঢোকে, বা কোনো সাজানো বাদ পড়ে যায়।

### Pruning

Pruning মানে একটি `return`, যা constraint যত আগে অনুমতি দেয়, তত আগে বসানো। Generate Parentheses সবচেয়ে
পরিষ্কার উদাহরণ। এটা সব `2ⁿ` string বানিয়ে পরে বৈধগুলো ছেঁকে নেয় না। শুরু থেকেই শুধু বৈধ prefix বানায়:

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

এখানে prune হলো `close < open`। এটা না থাকলে recursion `")("` আর তার নিচের প্রতিটি মরা branch ঘুরে দেখে। থাকলে
কোনো অবৈধ string কখনো তৈরিই হয় না। ফলে কাজের পরিমাণ সম্ভাব্য প্রার্থীর সংখ্যার ওপর নয়, *উত্তরের* সংখ্যার ওপর নির্ভর
করে।

⚠️ JavaScript-এ string immutable, তাই প্রতিটি call-এ `current + '('` নতুন string বানায়। এই size-এ সেটা সমস্যা নয়,
আর code-ও ছোট থাকে। তবে লম্বা কিছু বানাতে হলে subset template-এর মতো push/pop-সহ array ব্যবহার করুন।

### Duplicate

Input-এ একই value একাধিকবার থাকতে পারলে চেনা সমাধান হলো: **আগে sort করুন, তারপর একই level-এ আগেরটার সমান
value এলে skip করুন।**

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

পুরো ভার বহন করে `i > start` শর্তটা। সব repeat সোজাসুজি skip করলে `[2, 2]`-ও বাদ পড়ে, অথচ সেটা বৈধ subset। আসল
নিয়ম হলো, একই value পাশাপাশি দুটি branch-এর *শুরুর* সিদ্ধান্ত হতে পারবে না। কারণ সেই দুই branch হুবহু একই tree
বানাবে।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                       | কী ব্যবহার করবেন        | কেন                                       |
| --------------------------------------------------------- | -------------------- | ----------------------------------------- |
| "সব সম্ভাব্য", "প্রতিটি combination", "তালিকা করুন"            | Backtracking         | একদম আদর্শ ক্ষেত্র                         |
| "বৈধ… generate করুন", সঙ্গে যাচাই করার মতো constraint          | Backtracking + pruning | Constraint-টাই prune                    |
| পূরণ করার মতো puzzle: Sudoku, N-Queens, word grid           | Backtracking         | বসান, যাচাই করুন, ফিরিয়ে নিন               |
| কত উপায়ে হয় তা **গোনা**, বা **সবচেয়ে ভালো** উপায়            | Dynamic programming  | শুধু গোনার জন্য exponential সংখ্যক উত্তর তালিকা করা অপচয় |
| "কোনো সমাধান আছে কি"                                      | Backtracking, আগেভাগে return | প্রথম সাফল্যেই থেমে যান           |
| Input বড়, আর output একটিমাত্র সংখ্যা                        | Dynamic programming বা greedy | Output exponential মানে সময়ও exponential |

আসল row হলো dynamic programming-এরটা। প্রশ্ন যদি তালিকাটা না চেয়ে *কতগুলো* বা *সবচেয়ে সস্তা* কোনটা জানতে চায়,
তাহলে backtracking ভুল হাতিয়ার। Overlapping subproblem memoise না হয়ে বারবার নতুন করে হিসাব হয়। দেখুন
[Chapter ?? — Dynamic Programming](#ch-dynamic-programming)।

Code লেখার আগেই complexity বলে দিন। এই problem-গুলো স্বভাবতই exponential: subset-এ `O(2ⁿ)`, permutation-এ
`O(n!)`। শুরুতেই এটা বললে বোঝা যায়, আপনি জানেন সীমাটা ঠিক করছে output-এর size, algorithm-এর ঢিলেমি নয়।

## সাধারণ ভুল

**Copy-র বদলে reference জমা রাখা:**

```typescript
// ❌ results.push(current);       // every entry aliases one array that pop() empties
// ✅ results.push([...current]);
```

**ফিরিয়ে নিতে ভুলে যাওয়া:**

```typescript
// ❌ current.push(nums[i]); explore(i + 1);   // the next sibling inherits a dirty state
// ✅ ...explore(i + 1); current.pop();
```

**State-এর অর্ধেকটা ফিরিয়ে নেওয়া:**

```typescript
// ❌ current.pop();                 // but used[i] is left true, so the element never returns
// ✅ current.pop(); used[i] = false;
```

**যেখানে `i + 1` দেওয়ার কথা, সেখানে `i` দেওয়া:**

```typescript
// ❌ explore(i);       // allows reuse — correct for Combination Sum, wrong for Subsets
// ✅ explore(i + 1);   // each element considered once
```

**কোনো শর্ত ছাড়াই duplicate skip করা:**

```typescript
// ❌ if (sorted[i] === sorted[i - 1]) continue;          // loses legitimate results like [2,2]
// ✅ if (i > start && sorted[i] === sorted[i - 1]) continue;
```

**Duplicate skip করার আগে sort না করা:**

```typescript
// ❌ the skip compares against the previous *index*, which only works if equals are adjacent
// ✅ sort first
```

**Prune না করে পরে ছেঁকে নেওয়া:**

```typescript
// ❌ generate all 2ⁿ candidates, then keep the valid ones
// ✅ refuse to extend a prefix that already violates the constraint
```

## অনুশীলনের জন্য Problem

| #   | Problem                                     | কঠিনতা     | কী অনুশীলন হয়                                     |
| --- | ------------------------------------------- | ---------- | ----------------------------------------------- |
| 78  | Subsets                                     | Medium     | Template, আর copy                                |
| 77  | Combinations                                | Medium     | প্রতিটি node-এ নয়, নির্দিষ্ট size-এ result রাখা    |
| 46  | Permutations                                | Medium     | Start index-এর বদলে `used[]`                      |
| 22  | Generate Parentheses                        | Medium     | এমন pruning, যা প্রতিটি অবৈধ branch সরিয়ে দেয়      |
| 39  | Combination Sum                             | Medium     | বারবার ব্যবহারের জন্য `explore(i)`, আর বাকি অংশ দেখে pruning |
| 90  | Subsets II                                  | Medium     | Sort, তারপর `i > start` skip                      |
| 79  | Word Search                                 | Medium     | Grid-এ backtracking: mark করা আর আগের মতো ফিরিয়ে দেওয়া |
| 51  | N-Queens                                    | Hard       | Constraint set, যাতে যাচাই হয় `O(1)`-এ             |

আগে 78, তারপর 90। দ্বিতীয়টা প্রথমটাই, সঙ্গে duplicate-এর নিয়ম। তারপর 46 আর 39 একসঙ্গে করুন। একটিতে বারবার
ব্যবহার নিষেধ, অন্যটিতে বাধ্যতামূলক, আর পার্থক্য মাত্র একটি argument-এ।

## 🔑 মূল শিক্ষা

- বেছে নিন, ঘুরে দেখুন, বাছাই ফিরিয়ে নিন। এই ফিরিয়ে নেওয়াই backtracking-কে সাধারণ recursion থেকে আলাদা করে।
- Result রাখার সময় সবসময় অসম্পূর্ণ উত্তরের copy নিন। Reference রাখলে উত্তর ভুল হয়, আর কেউ টেরও পায় না।
- `explore(i + 1)` বারবার ব্যবহার আটকায়, `explore(i)` অনুমতি দেয়, আর permutation-এ index-এর বদলে লাগে `used[]`।
- Duplicate সামলাতে sort করুন, তারপর repeat skip করুন শুধু যখন `i > start`।
- Pruning ঠিক করে খরচ প্রার্থীর সংখ্যায় exponential হবে, নাকি উত্তরের সংখ্যায়। Complexity শুরুতেই বলে দিন।

## Interview-এর প্রশ্ন

**Q: Backtracking আর DFS-এর পার্থক্য কী?**

Backtracking হলো DFS, তবে আগে থেকে থাকা কোনো graph-এর ওপর নয়, অসম্পূর্ণ সম্ভাব্য সমাধানের tree-র ওপর। সঙ্গে
দুটি জিনিস যোগ হয়। Recursion গুটিয়ে আসার সময় shared state আগের মতো করে দেওয়া হয়। আর যে branch থেকে বৈধ উত্তর
আসতে পারে না, সেটা সঙ্গে সঙ্গে ছেড়ে দেওয়া হয়। Graph-এর ওপর সাধারণ DFS-এ ফিরিয়ে দেওয়ার কিছু নেই, কারণ traversal
graph-টাকে বদলায় না।

**Q: Result রাখার সময় current path-এর copy নিতেই হবে কেন?**

কারণ পুরো search জুড়ে `current` একটিই array, যা বারবার ব্যবহার হয়, আর `pop()` একটু পরেই সেটা বদলাবে। Reference
push করলে জমা হয় শুধু একটি pointer। ফলে output-এর প্রতিটি result শেষে দেখায় `current` যে অবস্থায় শেষ হয়েছে
সেটাই, মানে খালি। নতুন array-তে spread করলে সেই মুহূর্তের value-গুলোর snapshot থাকে।

**Q: `explore(i + 1)` দিলে subset আসে, আর `explore(0)` দিলে permutation আসে কেন?**

`i + 1` মানে প্রতিটি recursive level শুধু সদ্য বেছে নেওয়া element-এর পরের element-গুলো দেখতে পারে। তাই প্রতিটি
subset ঠিক একবার তৈরি হয়, সবসময় বাড়ন্ত index-এর ক্রমে, কোনো পুনর্বিন্যাস ছাড়াই। Permutation-এ প্রতিটি অবস্থানে
প্রতিটি অব্যবহৃত element হাতের কাছে থাকতে হয়। তাই loop আবার 0 থেকে শুরু হয়, আর start index-এর জায়গা নেয় একটি
`used` array। Permutation-এ ক্রম গুরুত্বপূর্ণ, subset-এ নয়। দুই রূপ ঠিক এই পার্থক্যটাই ধরে রাখে।

**Q: Input-এ duplicate থাকলে কী করবেন?**

Sort করুন, যাতে সমান value পাশাপাশি আসে। তারপর একই level-এ আগেরটার সমান element skip করুন, যদি না সেটা ওই
level-এর প্রথম সিদ্ধান্ত হয়। এটাই `i > start` শর্ত। এতে পাশাপাশি দুটি branch একই value দিয়ে শুরু হয়ে হুবহু একই
subtree বানাতে পারে না। অথচ একটিমাত্র branch ধরে নামতে নামতে একই value দুবার ব্যবহার করা যায়, যা বৈধ।

**Q: কখন বরং dynamic programming ব্যবহার করবেন?**

যখন প্রশ্ন তালিকা না চেয়ে একটি count বা সবচেয়ে ভালো মান চায়। Backtracking overlapping subproblem প্রতিবার
শূন্য থেকে হিসাব করে। তাই "এই coin-গুলো দিয়ে 11 কত উপায়ে বানানো যায়" backtracking-এ exponential, আর DP-তে
`O(amount × coins)`। চেনার উপায় হলো, output উত্তরের তালিকা নয়, একটিমাত্র সংখ্যা।

**Q: Backtracking সমাধানের time complexity কত, আর সেটা কীভাবে justify করবেন?**

যতটা tree ঘুরে দেখা হয়, ততটাই। সাধারণত সেটা সম্ভাব্য উত্তরের সংখ্যা গুণ প্রতিটি রাখার খরচ: subset-এ `O(n × 2ⁿ)`,
permutation-এ `O(n × n!)`, আর Generate Parentheses-এ `O(4ⁿ / √n)`, কারণ সেটা Catalan number। Output নিজেই যখন
exponential, তখন pruning asymptotic সীমা বদলাতে পারে না। Pruning ঠিক করে আপনি সেই নিম্নসীমার কত কাছে যাবেন। আর
বাস্তবে পুরো পার্থক্যটা ওখানেই।

## এরপর কী পড়বেন

- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — যে traversal-এর ওপর এই pattern দাঁড়িয়ে
- [Chapter ?? — Dynamic Programming](#ch-dynamic-programming) — প্রশ্ন যখন তালিকা নয়, গোনা চায়
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — কৈফিয়তের সুর ছাড়া exponential সীমা কীভাবে বলবেন
