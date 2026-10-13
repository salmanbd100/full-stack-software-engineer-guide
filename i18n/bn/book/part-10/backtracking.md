---
sourceHash: "0c7fae7651e86bd007e7f0a2a76be8c59fb38663690dce83c78449efb77d7213"
title: "Backtracking"
translatedAt: "2026-10-13T03:15:51.973Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Backtracking {#ch-backtracking}

> বেছে নিন, recurse করুন, বাছাই ফিরিয়ে নিন — আর যে branch কোনোভাবেই কাজ করবে না, সেগুলোতে হাঁটার আগেই prune করুন।

**এই অধ্যায়ে:** তিন ধাপের template · result কেন copy হতে হবে · যে `i + 1` subset-কে permutation থেকে আলাদা করে · sort করে আর skip করে duplicate সামলানো · pruning, যা একমাত্র জিনিস যেটা একে চালানোর যোগ্য করে · যে complexity আগেভাগেই বলতে হবে

## 💡 মূল ধারণা

Backtracking হলো একটি নির্দিষ্ট graph-এর বদলে *candidate উত্তর*-এর একটি space-এর ওপর depth-first search। প্রতিটি
ধাপে আপনি একটি বাছাই করেন, তা থেকে যা যা আসে সব explore করেন, তারপর বাছাইটা ফিরিয়ে নিয়ে পরেরটা চেষ্টা করেন।

পোশাক পরে দেখা হলো এর রোজকার রূপ: একটি শার্ট পরুন, তার সাথে প্রতিটি প্যান্ট চেষ্টা করুন, শার্টটা খুলুন, পরেরটা
চেষ্টা করুন। এই ফিরিয়ে নেওয়াটাই একে সাধারণ recursion থেকে backtracking বানায় — state shared, তাই যেমন পেয়েছিলেন,
ঠিক তেমন অবস্থায় ফিরিয়ে দিতে হয়।

এই পরিবারের প্রতিটি problem তিনটি line-এর ওপর চলে:

```text
choose    → push the option onto the current partial answer
explore   → recurse
un-choose → pop it back off
```

> Backtracking আর brute force-এর পার্থক্য হলো **pruning**। 8×8 board-এ N-Queens-এর সম্ভাব্য placement
> 4,426,165,368টি, আর solution 92টি। দুটি queen একে অপরকে আক্রমণ করার সাথে সাথে একটি আংশিক board বাতিল করাই
> একটি অসম্ভব search-কে মুহূর্তের কাজে পরিণত করে।

## কীভাবে কাজ করে

### Subset — template

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

দুটি line-এ মনোযোগ দেওয়া দরকার।

`results.push([...current])` অবশ্যই একটি copy হতে হবে। `current` নিজেকে push করলে এমন একটি array-এর reference জমা
হয়, যেটা `pop()` একটু পরেই mutate করবে। ফলে `results`-এর প্রতিটি entry শেষে একই খালি array হয়ে যায়। Backtracking-এর
সবচেয়ে সাধারণ bug এটাই, আর এটা নীরব — code চলে, উত্তর ভুল আসে।

`explore(i + 1)` হলো সেই জায়গা, যেখানে subset আর permutation আলাদা হয়ে যায়। `i + 1` পাঠানো মানে প্রতিটি element
একবারই বিবেচনা হয়, আর শুধু বাড়তে থাকা index-এর ক্রমে। তাই `[1, 2]` তৈরি হয়, `[2, 1]` হয় না। Permutation-এ প্রতিটি
position-এ প্রতিটি অব্যবহৃত element পাওয়া যেতে হয়, তাই loop-টা আলাদা:

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

| প্রশ্নের ধরন    | Loop শুরু হয় | Recurse করুন  | Result record হয়            |
| ---------------- | -------------- | ------------- | -------------------------- |
| Subset          | `start`        | `i + 1`       | প্রতিটি node-এ               |
| Combination     | `start`        | `i + 1`       | যখন size `k`-তে পৌঁছায়   |
| Permutation     | `0`            | কোনো index নয়, বদলে `used[]` | যখন দৈর্ঘ্য `n`-এ পৌঁছায় |
| Combination Sum (পুনর্ব্যবহার চলে) | `start` | `i`      | যখন বাকি অংশ 0 হয়   |

পুরো পরিবারটা এই table-এই। ভুল row বেছে নিলেই উত্তরে duplicate আসে, বা কিছু সাজানো বাদ পড়ে যায়।

### Pruning

Pruning হলো একটি `return`, যতটা আগে constraint অনুমতি দেয়, ততটা আগে বসানো। Generate Parentheses এর সবচেয়ে
পরিষ্কার উদাহরণ — সব `2ⁿ`টি string বানিয়ে বৈধগুলো filter করার বদলে, এটা শুধু বৈধ prefix-ই বানায়:

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

`close < open` হলো prune। এটা না থাকলে recursion `")("` আর তার নিচের প্রতিটি মৃত branch explore করে। এটা থাকলে
কোনো অবৈধ string কখনো তৈরিই হয় না। তাই কাজের পরিমাণ candidate-এর সংখ্যার সাথে নয়, *উত্তরের* সংখ্যার সাথে সমানুপাতিক।

⚠️ JavaScript-এ string immutable, তাই `current + '('` প্রতিটি call-এ একটি নতুন string allocate করে। এই size-এ
সেটা ঠিক আছে, আর code ছোট থাকে। কিন্তু লম্বা কিছু বানাতে হলে subset template-এর মতো push/pop সহ একটি array
ব্যবহার করুন।

### Duplicate

Input-এ পুনরাবৃত্তি থাকতে পারলে প্রচলিত সমাধান হলো: **আগে sort করুন, তারপর একই level-এ আগেরটার সমান value skip
করুন।**

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

`i > start` হলো আসল শর্ত। প্রতিটি পুনরাবৃত্তি সরাসরি skip করলে `[2, 2]`-ও বাদ পড়ত, যেটা একটি বৈধ subset। নিয়মটা হলো:
একটি duplicate value দুটি sibling branch-এর *শুরুর* বাছাই হতে পারবে না, কারণ সেই branch-গুলো হুবহু একই tree তৈরি
করত।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                    | কী ব্যবহার করবেন            | কেন                                       |
| --------------------------------------------------------- | -------------------- | ----------------------------------------- |
| "সব সম্ভাব্য", "প্রতিটি combination", "enumerate"          | Backtracking         | সংজ্ঞা দেওয়ার মতো উদাহরণ                          |
| "বৈধ… generate করুন", সাথে check করার মতো একটি constraint              | Backtracking + pruning | Constraint-টাই prune             |
| পূরণ করার মতো একটি ধাঁধা — Sudoku, N-Queens, word grid        | Backtracking         | বসান, যাচাই করুন, ফিরিয়ে নিন                      |
| কতভাবে করা যায় তা **গোনা**, বা **সেরা** উপায়                   | Dynamic programming  | গোনার জন্য exponential সংখ্যক উত্তর enumerate করা অপচয় |
| "কোনো solution আছে কি"                                 | Backtracking, আগেভাগে return করে | প্রথম সাফল্যেই থামুন           |
| Input বড়, আর output একটিমাত্র সংখ্যা           | Dynamic programming বা greedy | Exponential output মানে exponential time |

Dynamic programming-এর row-টাই গুরুত্বপূর্ণ। প্রশ্ন যদি list-টা নয়, বরং *কতগুলো* বা *সবচেয়ে সস্তা*-টা চায়, তাহলে
backtracking ভুল tool — overlapping subproblem memoise না হয়ে বারবার হিসাব হয়।
[Chapter ?? — Dynamic Programming](#ch-dynamic-programming) দেখুন।

Code লেখার আগে complexity বলুন। এই problem-গুলো স্বভাবতই exponential — subset-এর জন্য `O(2ⁿ)`, permutation-এর
জন্য `O(n!)`। শুরুতেই এটা বললে বোঝা যায় যে আপনি জানেন, সীমাটা output-এর size ঠিক করে দিচ্ছে, algorithm-এর
অগোছালোতা নয়।

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

**State-এর মাত্র অর্ধেক ফিরিয়ে নেওয়া:**

```typescript
// ❌ current.pop();                 // but used[i] is left true, so the element never returns
// ✅ current.pop(); used[i] = false;
```

**`i + 1` বোঝাতে গিয়ে `i` পাঠানো:**

```typescript
// ❌ explore(i);       // allows reuse — correct for Combination Sum, wrong for Subsets
// ✅ explore(i + 1);   // each element considered once
```

**শর্ত ছাড়াই duplicate skip করা:**

```typescript
// ❌ if (sorted[i] === sorted[i - 1]) continue;          // loses legitimate results like [2,2]
// ✅ if (i > start && sorted[i] === sorted[i - 1]) continue;
```

**Duplicate skip-এর আগে sort না করা:**

```typescript
// ❌ the skip compares against the previous *index*, which only works if equals are adjacent
// ✅ sort first
```

**Prune না করে filter করা:**

```typescript
// ❌ generate all 2ⁿ candidates, then keep the valid ones
// ✅ refuse to extend a prefix that already violates the constraint
```

## অনুশীলনের জন্য Problem

| #   | Problem                                     | কঠিনতা | যা অনুশীলন করায়                                  |
| --- | ------------------------------------------- | ---------- | ----------------------------------------------- |
| 78  | Subsets                                     | Medium     | Template, আর copy                       |
| 77  | Combinations                                | Medium     | প্রতিটি node-এর বদলে নির্দিষ্ট size-এ record করা   |
| 46  | Permutations                                | Medium     | Start index-এর বদলে `used[]`                 |
| 22  | Generate Parentheses                        | Medium     | এমন pruning, যা প্রতিটি অবৈধ branch সরিয়ে দেয়         |
| 39  | Combination Sum                             | Medium     | পুনর্ব্যবহারের জন্য `explore(i)`, আর বাকি অংশের ওপর pruning  |
| 90  | Subsets II                                  | Medium     | Sort, তারপর `i > start` skip                   |
| 79  | Word Search                                 | Medium     | Grid-এ backtracking, mark করা আর আগের অবস্থায় ফেরানো     |
| 51  | N-Queens                                    | Hard       | এমন constraint set, যা যাচাইকে `O(1)` করে        |

আগে 78, তারপর 90 করুন — দ্বিতীয়টা হলো প্রথমটা আর duplicate-এর নিয়ম। তারপর 46 আর 39 একসাথে: একটি পুনর্ব্যবহার নিষেধ
করে, অন্যটি সেটা দাবি করে, আর পার্থক্যটা মাত্র একটি argument।

## 🔑 মূল শিক্ষা

- বেছে নিন, explore করুন, বাছাই ফিরিয়ে নিন — এই ফিরিয়ে নেওয়াটাই backtracking-কে সাধারণ recursion থেকে আলাদা করে।
- Result record করার সময় সবসময় আংশিক উত্তরের copy নিন। Reference জমা রাখা মানে নীরবে ভুল উত্তর।
- `explore(i + 1)` পুনর্ব্যবহার নিষেধ করে, `explore(i)` অনুমতি দেয়, আর permutation-এ index-এর বদলে `used[]` লাগে।
- Duplicate সামলান sort করে, তারপর পুনরাবৃত্তি skip করুন শুধু যখন `i > start`।
- Pruning-ই candidate-এ exponential আর উত্তরে exponential-এর মধ্যে পার্থক্য। Complexity শুরুতেই বলুন।

## Interview-এর প্রশ্ন

**Q: Backtracking আর DFS-এর পার্থক্য কী?**

Backtracking হলো একটি বিদ্যমান graph-এর বদলে আংশিক candidate solution-এর একটি tree-এর ওপর DFS, দুটি সংযোজন সহ:
recursion গুটিয়ে আসার সময় shared state আগের অবস্থায় ফেরানো হয়, আর যে branch থেকে বৈধ উত্তর আসা সম্ভব নয়, সেটা
সাথে সাথে ছেড়ে দেওয়া হয়। Graph-এ সাধারণ DFS-এ ফেরানোর মতো কিছু নেই, কারণ traversal graph-টিকে বদলায় না।

**Q: Result record করার সময় বর্তমান path-টি কেন copy করতে হয়?**

কারণ `current` পুরো search জুড়ে বারবার ব্যবহার হওয়া একটিই array — `pop()` একটু পরেই একে mutate করবে। Reference
push করলে একটি pointer জমা হয়। তাই output-এর প্রতিটি result শেষে `current` যে অবস্থায় শেষ হয়েছে, সেটাই দেখায় —
অর্থাৎ খালি। একটি নতুন array-তে spread করলে সেই মুহূর্তের value-গুলোর একটি snapshot থাকে।

**Q: `explore(i + 1)` কেন subset দেয়, আর `explore(0)` কেন permutation দেয়?**

`i + 1` মানে প্রতিটি recursive level শুধু সদ্য বেছে নেওয়া element-এর পরের element-গুলোই বিবেচনা করতে পারে। তাই
প্রতিটি subset ঠিক একবার তৈরি হয়, আর সবসময় বাড়তে থাকা index-এর ক্রমে — কোনো পুনর্বিন্যাস নেই। Permutation-এ প্রতিটি
position-এ প্রতিটি অব্যবহৃত element পাওয়া যেতে হয়, তাই loop 0 থেকে আবার শুরু হয়, আর start index-এর জায়গা নেয়
একটি `used` array। Permutation-এ ক্রম গুরুত্বপূর্ণ, subset-এ নয় — দুটি রূপ ঠিক এটাই প্রকাশ করে।

**Q: Input-এ duplicate থাকলে কীভাবে সামলাবেন?**

Sort করুন, যাতে সমান value-গুলো পাশাপাশি থাকে। তারপর একটি level-এর মধ্যে আগেরটার সমান যেকোনো element skip করুন,
যদি না সেটা ওই level-এর প্রথম বাছাই হয় — অর্থাৎ `i > start` শর্ত। এতে দুটি sibling branch একই value দিয়ে শুরু
হয়ে হুবহু একই subtree তৈরি করতে পারে না। আবার একটি branch ধরে নিচে একটি value দুবার ব্যবহার করাও চলে, যেটা বৈধ।

**Q: কখন এর বদলে dynamic programming ব্যবহার করবেন?**

যখন প্রশ্ন enumeration নিজে নয়, বরং একটি count বা optimum চায়। Backtracking overlapping subproblem-গুলো প্রতিবার
শূন্য থেকে হিসাব করে। তাই "এই coin-গুলো দিয়ে 11 বানানোর কত উপায়" backtracking-এ exponential, আর DP-তে
`O(amount × coins)`। চেনার উপায় হলো: output উত্তরের একটি list নয়, একটিমাত্র সংখ্যা।

**Q: একটি backtracking solution-এর time complexity কত, আর কীভাবে যুক্তি দেবেন?**

এটা explore করা tree-এর size, যা সাধারণত candidate উত্তরের সংখ্যা গুণ প্রতিটি record করার খরচ: subset-এর জন্য
`O(n × 2ⁿ)`, permutation-এর জন্য `O(n × n!)`, আর Generate Parentheses-এর জন্য `O(4ⁿ / √n)`, কারণ সেটাই Catalan
number। Output নিজেই exponential হলে pruning asymptotic সীমা বদলাতে পারে না — এটা বদলায় আপনি সেই lower bound-এর
কতটা কাছে পৌঁছান। বাস্তবে পুরো পার্থক্যটা সেখানেই।

## এরপর কী পড়বেন

- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — যে traversal-এর ওপর এই pattern দাঁড়িয়ে আছে
- [Chapter ?? — Dynamic Programming](#ch-dynamic-programming) — যখন প্রশ্ন enumerate নয়, গোনা চায়, তখন কোথায় যাবেন
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — কৈফিয়ত দেওয়ার সুর ছাড়া কীভাবে একটি exponential সীমা বলবেন
