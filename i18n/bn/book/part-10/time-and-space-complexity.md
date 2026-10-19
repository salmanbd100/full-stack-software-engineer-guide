---
sourceHash: "3d801f33640432d286d996a769b8d940864680684a0b3f4ff9b7a2c07a3107d9"
title: "Time ও Space Complexity"
translatedAt: "2026-10-19T10:27:54.320Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Time ও Space Complexity {#ch-time-and-space-complexity}

> সামনে থাকা code-এর complexity নিজে বের করুন। আর প্রশ্নে দেওয়া constraint-কে পড়ুন সেই লক্ষ্য হিসেবে, যেটা আপনাকে ছুঁতে হবে।

**এই অধ্যায়ে:** যে growth rate-গুলো আসলে জরুরি · constraint পড়া · loop আর recursion বিশ্লেষণ · call stack সহ space · যে পাঁচটি ভুলে নম্বর কাটে

## 💡 মূল ধারণা

Big O কোনো মাপ নয়। এটা **growth** নিয়ে দাবি: input বড় হলে কাজ কতটা বাড়ে। Constant আর lower-order term
বাদ পড়ে যায়, কারণ `n` বড় হওয়ার অনেক আগেই ওগুলোর আর কোনো গুরুত্ব থাকে না। এজন্যই `O(3n² + 500n)` আসলে শুধু
`O(n²)`।

Interview-এ এর ব্যবহার তত্ত্বের চেয়ে অনেক ছোট। আপনাকে কোনো bound প্রমাণ করতে হবে না। কাজ মাত্র দুটি: আপনার
code-এর খরচ কত, সেটা বলা। আর খেয়াল করা যে প্রশ্নে ছাপা constraint আগেই বলে দিয়েছে খরচ কত পর্যন্ত চলবে।

> `n ≤ 10⁵` constraint সাজানোর জন্য দেওয়া হয়নি। এতে `O(n²)` বাদ পড়ে, থাকে `O(n log n)`। কিছু লেখার আগেই
> এটা মুখে বলুন। অভিজ্ঞ শোনানোর এর চেয়ে দ্রুত উপায় নেই।

## কীভাবে কাজ করে

### যে growth rate-গুলো জানা দরকার

| n         | O(1) | O(log n) | O(n)      | O(n log n) | O(n²) | O(2ⁿ)     |
| --------- | ---- | -------- | --------- | ---------- | ----- | --------- |
| 10        | 1    | 3        | 10        | 30         | 100   | 1,024     |
| 1,000     | 1    | 10       | 1,000     | 9,966      | 10⁶   | অনেক বেশি |
| 1,000,000 | 1    | 20       | 1,000,000 | ~2×10⁷     | 10¹²  | অনেক বেশি |

মনে রাখার মতো row হলো দশ লাখের row-টা। `O(n log n)` মোটামুটি `O(n)`-এর বিশ গুণ কাজ, আর তাতেও আরামে চলে।
`O(n²)` মানে এক লাখ কোটি operation, যা শেষই হয় না।

### Constraint পড়া

Judge আর online platform-গুলো সেকেন্ডে মোটামুটি 10⁸টি সাধারণ operation চালায়। ওখান থেকে উল্টো দিকে হিসাব
করলে constraint নিজেই উত্তর দিয়ে দেয়:

| Constraint      | লক্ষ্য complexity      | সাধারণত এর মানে                    |
| --------------- | ---------------------- | --------------------------------- |
| `n ≤ 12`        | `O(n!)`                | Permutation, brute force-এ চলবে |
| `n ≤ 25`        | `O(2ⁿ)`                | Subset, backtracking             |
| `n ≤ 500`       | `O(n³)`                | তিন স্তরের loop, বা interval DP       |
| `n ≤ 5,000`     | `O(n²)`                | Two-dimensional DP, সব জোড়া     |
| `n ≤ 10⁵`       | `O(n log n)` or `O(n)` | Sort, heap, sliding window        |
| `n ≤ 10⁹`       | `O(log n)` or `O(1)`   | Binary search, অথবা গণিত           |

⚠️ Constraint লক্ষ্যটা বলে, pattern বলে না। `n ≤ 10⁵` ষোলোটি pattern থেকে বাছাই কমিয়ে মোটামুটি ছয়টিতে আনে।
তবু এতে দশ মিনিট বাঁচে, যা নইলে এমন পদ্ধতিতে খরচ হতো, যেটা কোনোদিন pass করত না।

### Code বিশ্লেষণ

প্রায় সবকিছুর জন্য তিনটি নিয়মই যথেষ্ট।

**Nested loop গুণ হয়। পরপর loop যোগ হয়। Constant বাদ যায়।**

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

ওই snippet-এর ফাঁদ শেষ line-এ। `a` আর `b` আলাদা input, তাই উত্তর `O(n × m)`। `O(n²)` নয়, আর `O(n)` তো
নয়ই। Lower-order term তখনই বাদ দেবেন, যখন সেটা **একই** variable-এর: `O(n² + n)` হয় `O(n²)`, কিন্তু
`O(n + m)` যেমন আছে তেমনই থাকে।

**প্রতিবার অর্ধেক হওয়া loop হলো logarithmic:**

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

### Space মানে শুধু allocate করা array নয়

Input-এর সঙ্গে যত byte বাড়ে, space complexity সবগুলোই গোনে। Call stack-ও তার মধ্যে পড়ে।

```typescript
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
// Time: O(n)
// Space: O(n) — n stack frames are live at the deepest point, even though nothing is allocated
```

Candidate-রা সবচেয়ে বেশি ভোলেন recursion-এর depth। Tree-তে depth-first search-এর space `O(h)`, যেখানে
`h` হলো height। Degenerate tree-তে সেটা দাঁড়ায় `O(n)`। Recursive binary search-এর space `O(log n)`,
অথচ ওপরের loop-টা `O(1)`।

> ⚠️ Output সাধারণত গোনা হয় না। প্রশ্নে সব `n!` permutation চাইলে উত্তর হলো `O(n!)` output আর `O(n)`
> auxiliary space। **Auxiliary** শব্দটা বললেই পার্থক্যটা স্পষ্ট হয়ে যায়।

### যে recurrence-গুলো চিনে রাখা দরকার

| ধাঁচ                        | Recurrence               | Complexity   | উদাহরণ         |
| ---------------------------- | ------------------------ | ------------ | --------------- |
| একটি recursive call, `n − 1`  | `T(n) = T(n−1) + O(1)`   | `O(n)`       | Factorial       |
| দুটি call, `n − 1`           | `T(n) = 2T(n−1) + O(1)`  | `O(2ⁿ)`      | Naive Fibonacci |
| দুটি call, অর্ধেক করে, linear join | `T(n) = 2T(n/2) + O(n)`  | `O(n log n)` | Merge sort      |
| একটি call, অর্ধেক করে               | `T(n) = T(n/2) + O(1)`   | `O(log n)`   | Binary search   |

## কখন ব্যবহার করবেন

প্রতিটি solution-এরই complexity আছে। এই table যে সিদ্ধান্তে সাহায্য করে সেটা হলো: চালু brute force হাতে
আসার পর কোন optimisation ধরবেন।

| Brute force দেখতে যেমন            | কী ব্যবহার করবেন            | খরচ দাঁড়ায়  | বিনিময়ে দেন              |
| --------------------------------- | -------------------- | ------------- | -------------------- |
| কোনো value খুঁজতে nested loop  | Hash map বা set      | `O(n)`        | `O(n)` space         |
| জোড়া খুঁজতে nested loop         | Sort + two pointers  | `O(n log n)`  | Input-এর ক্রম          |
| প্রতিটি window নতুন করে হিসাব          | Sliding window       | `O(n)`        | কিছুই না              |
| বারবার range sum               | Prefix sum           | `O(1)` query  | `O(n)` space         |
| একই array-এ বারবার search | Sort + binary search | `O(log n)`    | শুরুতেই `O(n log n)` |
| Recursion একই subproblem বারবার হিসাব করে | Memoisation বা DP    | `O(n)`–`O(n²)`| `O(n)`–`O(n²)` space |

বিনিময়টা প্রায় সবসময় একই: **memory খরচ করে সময় কেনা**। এটাকে উন্নতি হিসেবে নয়, বিনিময় হিসেবেই বলুন। কারণ
মাঝে মাঝে interviewer আসলে `O(1)`-space উত্তরটাই চান।

## সাধারণ ভুল

**Built-in-কে বিনা খরচের ধরে নেওয়া:**

```typescript
function normalise(arr: number[]): void {
  // ❌ "One line, so O(1)"
  for (let i = 0; i < arr.length; i++) {
    arr.sort();            // O(n log n) per call
  }
}
// Actual: O(n² log n)
```

`sort()` হলো `O(n log n)`। `slice()`, `includes()`, `indexOf()`, `map()` আর spread, সবই `O(n)`।
এগুলোর যেকোনোটাকে `for` loop দিয়ে ঘিরলে সেটা আসলে ছদ্মবেশে nested loop।

**Average case-কে একমাত্র case হিসেবে বলা:**

```typescript
// ❌ "Hash lookups are O(1), so this is O(n)"
// ✅ "O(n) average. Worst case is O(n²) if every key collides — fine to assume average here."
```

**Call stack-এর কথা ভুলে যাওয়া:**

```typescript
// ❌ "O(1) space — I never allocate an array"
function sumTo(n: number): number {
  return n <= 0 ? 0 : n + sumTo(n - 1);   // O(n) space in stack frames
}
```

**দুটি আলাদা variable-কে এক করে ফেলা:**

```typescript
// ❌ O(n × m) reported as O(n) "after dropping lower terms"
// ✅ Only collapse the same variable: O(n² + n) → O(n²). O(n + m) stays O(n + m).
```

**Amortised operation-এর দামি case-টাকেই হিসাবে ধরা:**

```typescript
function fill(n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) out.push(i);
  return out;
}
// ❌ "push() sometimes reallocates, so O(n²)"
// ✅ O(n) total. Doubling happens log n times; the copies sum to under 2n, so O(1) amortised each.
```

## Reference Table

**Data structure:**

| Structure           | Access     | Search     | Insert     | Delete     | Space    |
| ------------------- | ---------- | ---------- | ---------- | ---------- | -------- |
| Array               | `O(1)`     | `O(n)`     | `O(n)`     | `O(n)`     | `O(n)`   |
| Dynamic array push  | `O(1)`     | `O(n)`     | `O(1)`\*   | `O(n)`     | `O(n)`   |
| Linked list         | `O(n)`     | `O(n)`     | `O(1)`†    | `O(1)`†    | `O(n)`   |
| Hash map / set      | —          | `O(1)`‡    | `O(1)`‡    | `O(1)`‡    | `O(n)`   |
| Balanced BST        | `O(log n)` | `O(log n)` | `O(log n)` | `O(log n)` | `O(n)`   |
| Heap                | —          | `O(n)`     | `O(log n)` | `O(log n)` | `O(n)`   |
| Trie                | —          | `O(m)`     | `O(m)`     | `O(m)`     | `O(n×m)` |

\* amortised · † যে node আগে থেকেই হাতে আছে, সেখানে · ‡ average case, worst case-এ `O(n)` · `m` = key-এর দৈর্ঘ্য

**Sorting:**

| Algorithm  | Average      | Worst        | Space      | Stable | কখন ব্যবহার করবেন                     |
| ---------- | ------------ | ------------ | ---------- | ------ | ---------------------------- |
| Merge sort | `O(n log n)` | `O(n log n)` | `O(n)`     | ✅     | Stability জরুরি হলে            |
| Quick sort | `O(n log n)` | `O(n²)`      | `O(log n)` | ❌     | In-place, সাধারণ কাজে    |
| Heap sort  | `O(n log n)` | `O(n log n)` | `O(1)`     | ❌     | Memory কম থাকলে              |
| Counting   | `O(n + k)`   | `O(n + k)`   | `O(k)`     | ✅     | Integer-এর range `k` ছোট হলে      |

Interview-এ ভাষার built-in sort ব্যবহার করুন, আর বলুন `O(n log n)`। V8 Timsort ব্যবহার করে, যা stable আর worst
case-এও `O(n log n)`। প্রশ্নটা sort নিয়ে হলে তবেই নিজে হাতে sort লিখবেন।

## 🔑 মূল শিক্ষা

- Big O growth বোঝায়, তাই constant আর lower-order term বাদ যায়। তবে শুধু একই variable-এর মধ্যে।
- প্রশ্নে `n`-এর constraint-ই বলে দেয় লক্ষ্য complexity কত। পদ্ধতি বাছার আগে সেটা পড়ুন।
- Nested loop গুণ হয়, পরপর loop যোগ হয়, আর প্রতিবার অর্ধেক হওয়া loop হলো `O(log n)`।
- Space complexity-তে recursion-এর call stack-ও ধরা হয়, শুধু allocate করা data নয়।
- এখানকার প্রায় সব optimisation একই বিনিময়: বাড়তি memory দিয়ে কম pass কেনা।

## Interview-এর প্রশ্ন

**Q: আপনার solution-এর time আর space complexity কত, আর সেটা কীভাবে জানলেন?**

আগে মূল operation-টার নাম বলুন, আর `n`-এর তুলনায় সেটা কতবার চলে। তারপর বলুন কোন কোন structure-এর আকার `n`-এর
সঙ্গে বাড়ে, call stack সহ। যেমন: "Array-এর ওপর একবার pass, আর একটি map, যাতে বড়জোর `n`-টি key থাকে। তাই
`O(n)` time আর `O(n)` space।" কোন অংশটা প্রধান, সেটা বলা অক্ষরটার চেয়ে বেশি জরুরি।

**Q: Constraint বলছে `n ≤ 10⁵`। Problem পড়ার আগেই এ থেকে কী জানা যায়?**

জানা যায় যে `O(n²)` বাদ, কারণ এক হাজার কোটি operation-এ time out হবে। কাঙ্ক্ষিত উত্তর `O(n log n)` বা তার
চেয়ে ভালো। এতে বাছাই নেমে আসে sorting, heap, binary search, hash map, বা window নিয়ে linear scan-এ। প্রশ্ন যিনি
বানিয়েছেন, তিনি ইচ্ছে করেই এই hint রেখে গেছেন।

**Q: `O(1)` কি সবসময় `O(n)`-এর চেয়ে দ্রুত?**

না। Big O বলে `n` বাড়লে আচরণ কেমন হয়, নির্দিষ্ট কোনো size-এ কতক্ষণ লাগে তা নয়। দামি hash function থাকলে hash
lookup দশটি element-এর linear scan-এর কাছে হেরে যেতে পারে। আবার quick sort-এর bound খারাপ হলেও বাস্তবে সেটা
সাধারণত merge sort-কে হারায়। `n` ছোট বা স্থির হলে হিসাব কষে নয়, মেপে দেখুন।

**Q: কখন জেনে-বুঝে ধীর complexity বেছে নেবেন?**

যখন memory-ই আসল সীমা, অথবা জানা আছে যে input ছোট। Memory কম এমন device-এ `O(n²)` in-place pass জিতে যায় সেই
`O(n)` solution-এর বিরুদ্ধে, যার input-এর সমান বড় hash map লাগে। আপনাকে দেখাতে হবে যে complexity একটি দিক
মাত্র, পুরো সিদ্ধান্ত নয়।

**Q: Dynamic array-এ append করা `O(1)` কেন, যখন মাঝে মাঝে সবকিছু copy করতে হয়?**

কারণ copy এত কম হয় যে গড় করলে খরচ মিলিয়ে যায়। Array প্রতিবার দ্বিগুণ হয়, তাই reallocation হয় মোটামুটি
`log n` বার, আর `n`-টি append-এ সব copy মিলে `2n`-এর কম। এটাই amortised analysis: পুরো sequence ধরে প্রতি
operation-এ `O(1)`, যদিও আলাদা একটি call `O(n)`।

## এরপর কী পড়বেন

- [Chapter ?? — Prefix Sum](#ch-prefix-sum) — প্রথম pattern, যেটা `O(n)` space দিয়ে `O(1)` query কেনে
- [Chapter ?? — Two Pointers](#ch-two-pointers) — sorted input কীভাবে nested loop-কে একটিমাত্র pass-এ নামিয়ে আনে
- [Chapter ?? — Dynamic Programming](#ch-dynamic-programming) — exponential থেকে polynomial-এ লাফটা কোথা থেকে আসে
