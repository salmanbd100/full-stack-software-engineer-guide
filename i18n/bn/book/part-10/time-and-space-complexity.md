---
sourceHash: "3d801f33640432d286d996a769b8d940864680684a0b3f4ff9b7a2c07a3107d9"
title: "Time ও Space Complexity"
translatedAt: "2026-10-13T03:12:04.681Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Time ও Space Complexity {#ch-time-and-space-complexity}

> যে code দেখছেন, তার complexity বের করুন, আর প্রশ্নের constraint-কে সেই লক্ষ্য হিসেবে পড়ুন, যা আপনাকে ছুঁতে হবে।

**এই অধ্যায়ে:** যে growth rate-গুলো গুরুত্বপূর্ণ · constraint পড়া · loop আর recursion বিশ্লেষণ · call stack-সহ space · যে পাঁচটি ভুলে নম্বর কাটে

## 💡 মূল ধারণা

Big O কোনো পরিমাপ নয়। এটা **growth** নিয়ে একটি দাবি — input বড় হলে কাজের কী হয়। Constant আর lower-order term
বাদ পড়ে যায়, কারণ `n` বড় হওয়ার অনেক আগেই সেগুলোর গুরুত্ব ফুরিয়ে যায়। এজন্যই `O(3n² + 500n)` আসলে শুধু `O(n²)`।

Interview-এ এর ব্যবহার তত্ত্বের চেয়ে সংকীর্ণ। আপনি bound প্রমাণ করছেন না। আপনি দুটো কাজ করছেন: আপনার code-এর খরচ
কত তা বলা, আর খেয়াল করা যে প্রশ্নে ছাপা constraint আগেই বলে দিয়েছে কত খরচ চলবে।

> `n ≤ 10⁵`-এর একটি constraint সাজসজ্জা নয়। এটা `O(n²)` বাদ দেয় আর `O(n log n)` রেখে দেয়। কিছু লেখার আগেই এটা
> মুখে বলা অভিজ্ঞ শোনানোর একক সবচেয়ে দ্রুত উপায়।

## কীভাবে কাজ করে

### যে growth rate-গুলো জানা দরকার

| n         | O(1) | O(log n) | O(n)      | O(n log n) | O(n²) | O(2ⁿ)     |
| --------- | ---- | -------- | --------- | ---------- | ----- | --------- |
| 10        | 1    | 3        | 10        | 30         | 100   | 1,024     |
| 1,000     | 1    | 10       | 1,000     | 9,966      | 10⁶   | অনেক বড় |
| 1,000,000 | 1    | 20       | 1,000,000 | ~2×10⁷     | 10¹²  | অনেক বড় |

দশ লাখের row-টাই মনে রাখার মতো। `O(n log n)` মোটামুটি `O(n)`-এর বিশ গুণ কাজ, আর স্বচ্ছন্দেই চলে। `O(n²)` হলো এক
trillion operation, আর শেষ হয় না।

### Constraint পড়া

Judge আর online platform-গুলো প্রতি সেকেন্ডে মোটামুটি 10⁸টি সাধারণ operation চালায়। সেখান থেকে উল্টো দিকে হিসাব করলে
constraint নিজেই উত্তর দিয়ে দেয়:

| Constraint      | লক্ষ্য complexity      | সাধারণত এর মানে           |
| --------------- | ---------------------- | --------------------------------- |
| `n ≤ 12`        | `O(n!)`                | Permutation, brute force চলবে |
| `n ≤ 25`        | `O(2ⁿ)`                | Subset, backtracking             |
| `n ≤ 500`       | `O(n³)`                | তিন স্তরের loop, বা interval DP       |
| `n ≤ 5,000`     | `O(n²)`                | Two-dimensional DP, সব জোড়া     |
| `n ≤ 10⁵`       | `O(n log n)` বা `O(n)` | Sort, heap, sliding window        |
| `n ≤ 10⁹`       | `O(log n)` বা `O(1)`   | Binary search, বা গণিত           |

⚠️ Constraint লক্ষ্যটা বলে, pattern নয়। `n ≤ 10⁵` ষোলোটি pattern-কে মোটামুটি ছয়টিতে নামিয়ে আনে। তবুও এটা আপনাকে
এমন একটি পদ্ধতিতে দশ মিনিট নষ্ট করা থেকে বাঁচায়, যেটা কখনোই pass করত না।

### Code বিশ্লেষণ

তিনটি নিয়মে প্রায় সবকিছু হয়ে যায়।

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

ওই snippet-এর ফাঁদ শেষ line-এ। `a` আর `b` আলাদা input, তাই উত্তর `O(n × m)`, `O(n²)` নয়, আর অবশ্যই `O(n)` নয়।
Lower-order term বাদ দেবেন শুধু তখনই, যখন সেটা **একই** variable: `O(n² + n)` হলো `O(n²)`, কিন্তু `O(n + m)` যেমন
আছে তেমনই থাকে।

**প্রতিবার অর্ধেক করা loop logarithmic:**

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

### Space মানে শুধু আপনার allocate করা array নয়

Space complexity input-এর সঙ্গে বাড়ে এমন প্রতিটি byte গোনে — call stack-সহ।

```typescript
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}
// Time: O(n)
// Space: O(n) — n stack frames are live at the deepest point, even though nothing is allocated
```

Recursion-এর গভীরতাই candidate-রা ভুলে যান। একটি tree-তে depth-first search হলো `O(h)` space, যেখানে `h` হলো
উচ্চতা; একটি degenerate tree-তে সেটা `O(n)`। Recursive binary search হলো `O(log n)` space, আর ওপরের loop-টি `O(1)`।

> ⚠️ Output সাধারণত গোনা হয় না। কোনো প্রশ্ন যদি সব `n!` permutation চায়, উত্তর হলো `O(n!)` output আর `O(n)`
> auxiliary space। **Auxiliary** শব্দটা বললে পার্থক্যটা স্পষ্ট হয়ে যায়।

### যে recurrence-গুলো চেনা দরকার

| আকৃতি                        | Recurrence               | Complexity   | উদাহরণ         |
| ---------------------------- | ------------------------ | ------------ | --------------- |
| একটি recursive call, `n − 1`  | `T(n) = T(n−1) + O(1)`   | `O(n)`       | Factorial       |
| দুটো call, `n − 1`           | `T(n) = 2T(n−1) + O(1)`  | `O(2ⁿ)`      | Naive Fibonacci |
| দুটো call, অর্ধেক, linear join | `T(n) = 2T(n/2) + O(n)`  | `O(n log n)` | Merge sort      |
| একটি call, অর্ধেক               | `T(n) = T(n/2) + O(1)`   | `O(log n)`   | Binary search   |

## কখন ব্যবহার করবেন

প্রতিটি solution-এর একটি complexity আছে। এই table যে সিদ্ধান্ত চালায়, তা হলো একটি কাজ করা brute force হাতে আসার পর
কোন optimisation বেছে নেবেন।

| Brute force দেখতে যেমন            | কী ব্যবহার করবেন            | খরচ হয়ে যায়  | আপনি দেন              |
| --------------------------------- | -------------------- | ------------- | -------------------- |
| একটি value খুঁজতে nested loop  | Hash map বা set      | `O(n)`        | `O(n)` space         |
| জোড়া খুঁজতে nested loop         | Sort + two pointers  | `O(n log n)`  | Input-এর ক্রম          |
| প্রতিটি window নতুন করে হিসাব করা          | Sliding window       | `O(n)`        | কিছুই না              |
| বারবার range sum               | Prefix sum           | `O(1)` query  | `O(n)` space         |
| একই array-তে বারবার খোঁজা | Sort + binary search | `O(log n)`    | শুরুতে `O(n log n)` |
| Subproblem বারবার হিসাব করা recursion | Memoisation বা DP    | `O(n)`–`O(n²)`| `O(n)`–`O(n²)` space |

লেনদেনটা প্রায় সবসময় একই: **সময় কিনতে memory খরচ করুন**। এটাকে উন্নতি হিসেবে নয়, একটি লেনদেন হিসেবে বলুন, কারণ
মাঝে মাঝে interviewer বরং `O(1)`-space উত্তরটা চান।

## সাধারণ ভুল

**একটি built-in-কে বিনা খরচের ধরে নেওয়া:**

```typescript
function normalise(arr: number[]): void {
  // ❌ "One line, so O(1)"
  for (let i = 0; i < arr.length; i++) {
    arr.sort();            // O(n log n) per call
  }
}
// Actual: O(n² log n)
```

`sort()` হলো `O(n log n)`। `slice()`, `includes()`, `indexOf()`, `map()` আর spread সবই `O(n)`। এগুলোর যেকোনোটার
চারপাশে একটি `for` loop আসলে ছদ্মবেশে একটি nested loop।

**Average case-কে এমনভাবে বলা, যেন সেটাই একমাত্র case:**

```typescript
// ❌ "Hash lookups are O(1), so this is O(n)"
// ✅ "O(n) average. Worst case is O(n²) if every key collides — fine to assume average here."
```

**Call stack ভুলে যাওয়া:**

```typescript
// ❌ "O(1) space — I never allocate an array"
function sumTo(n: number): number {
  return n <= 0 ? 0 : n + sumTo(n - 1);   // O(n) space in stack frames
}
```

**দুটো আলাদা variable-কে এক করে ফেলা:**

```typescript
// ❌ O(n × m) reported as O(n) "after dropping lower terms"
// ✅ Only collapse the same variable: O(n² + n) → O(n²). O(n + m) stays O(n + m).
```

**একটি amortised operation-এর ব্যয়বহুল case-টা গোনা:**

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

\* amortised · † যে node আগে থেকেই হাতে আছে, সেখানে · ‡ average case, worst-এ `O(n)` · `m` = key-এর দৈর্ঘ্য

**Sorting:**

| Algorithm  | Average      | Worst        | Space      | Stable | কখন ব্যবহার করবেন                     |
| ---------- | ------------ | ------------ | ---------- | ------ | ---------------------------- |
| Merge sort | `O(n log n)` | `O(n log n)` | `O(n)`     | ✅     | Stability গুরুত্বপূর্ণ হলে            |
| Quick sort | `O(n log n)` | `O(n²)`      | `O(log n)` | ❌     | In-place, সাধারণ কাজে    |
| Heap sort  | `O(n log n)` | `O(n log n)` | `O(1)`     | ❌     | Memory কম থাকলে              |
| Counting   | `O(n + k)`   | `O(n + k)`   | `O(k)`     | ✅     | Integer-এর পরিসর `k` ছোট হলে      |

Interview-এ language-এর built-in sort ব্যবহার করুন আর সেটাকে `O(n log n)` বলুন। V8 Timsort ব্যবহার করে, যা stable আর
worst case-এ `O(n log n)`। প্রশ্নটা যদি sort নিয়েই হয়, শুধু তখনই নিজে হাতে sort লিখুন।

## 🔑 মূল শিক্ষা

- Big O growth বর্ণনা করে, তাই constant আর lower-order term বাদ যায় — কিন্তু শুধু একই variable-এর মধ্যে।
- প্রশ্নে `n`-এর ওপর constraint লক্ষ্য complexity বলে দেয়; পদ্ধতি বাছার আগে সেটা পড়ুন।
- Nested loop গুণ হয়, পরপর loop যোগ হয়, আর প্রতিবার অর্ধেক করা loop হলো `O(log n)`।
- Space complexity-তে recursion-এর call stack-ও আছে, শুধু আপনার allocate করা data নয়।
- এখানকার প্রায় প্রতিটি optimisation একই লেনদেন: কম pass-এর বিনিময়ে বাড়তি memory।

## Interview-এর প্রশ্ন

**Q: আপনার solution-এর time আর space complexity কত, আর আপনি কীভাবে জানেন?**

প্রধান operation-টার নাম বলুন, আর `n`-এর তুলনায় সেটা কতবার চলে তা বলুন। তারপর এমন প্রতিটি structure-এর নাম বলুন,
যার আকার `n`-এর সঙ্গে বাড়ে, call stack-সহ। "Array-র ওপর একটি pass, আর একটি map যাতে সর্বোচ্চ `n`-টি key থাকে, তাই
`O(n)` time আর `O(n)` space।" কোন অংশ প্রধান, সেটা বলা অক্ষরটার চেয়ে বেশি গুরুত্বপূর্ণ।

**Q: Constraint বলছে `n ≤ 10⁵`। সমস্যাটা পড়ার আগেই এটা আপনাকে কী বলে?**

যে `O(n²)` বাদ — এক হাজার কোটি operation time out হবে — আর উদ্দিষ্ট উত্তর `O(n log n)` বা তার চেয়ে ভালো। এতে বিকল্প
নেমে আসে sorting, একটি heap, binary search, একটি hash map, বা একটি window-সহ linear scan-এ। এটা প্রশ্নকর্তার
ইচ্ছাকৃতভাবে রেখে যাওয়া একটি hint।

**Q: `O(1)` কি সবসময় `O(n)`-এর চেয়ে দ্রুত?**

না। Big O বর্ণনা করে `n` বাড়লে আচরণ কেমন হয়, কোনো নির্দিষ্ট আকারে runtime কত নয়। ব্যয়বহুল hash-ওয়ালা একটি hash
lookup দশটি element-এর linear scan-এর কাছে হারতে পারে, আর খারাপ bound থাকা সত্ত্বেও বাস্তবে quick sort সাধারণত merge
sort-কে হারায়। ছোট বা স্থির `n`-এর ক্ষেত্রে হিসাব কষে বের না করে মেপে দেখুন।

**Q: কখন আপনি ইচ্ছা করে ধীর complexity বেছে নেবেন?**

যখন memory-ই আসল সীমাবদ্ধতা, অথবা যখন জানা আছে input ছোট। Memory-সীমিত একটি device-এ একটি `O(n²)` in-place pass
এমন `O(n)` solution-কে হারায়, যার input-এর সমান আকারের একটি hash map লাগে। যে বিচারবুদ্ধি দেখাতে হবে, তা হলো
complexity একটি অক্ষ, পুরো সিদ্ধান্ত নয়।

**Q: একটি dynamic array-তে append করা `O(1)` কেন, যখন মাঝে মাঝে সবকিছু copy করতে হয়?**

কারণ copy এত কম ঘটে যে গড়ে মিলিয়ে যায়। Array দ্বিগুণ হয়, তাই reallocation মোটামুটি `log n` বার ঘটে, আর `n`-টি
append জুড়ে মোট copy `2n`-এর কম। এটাই amortised analysis: পুরো sequence জুড়ে প্রতি operation-এ `O(1)`, যদিও
একটি আলাদা call `O(n)`।

## এরপর কী পড়বেন

- [Chapter ?? — Prefix Sum](#ch-prefix-sum) — প্রথম pattern, যা `O(1)` query-র বিনিময়ে `O(n)` space দেয়
- [Chapter ?? — Two Pointers](#ch-two-pointers) — sorted input কীভাবে একটি nested loop-কে একটি pass-এ পরিণত করে
- [Chapter ?? — Dynamic Programming](#ch-dynamic-programming) — exponential থেকে polynomial-এ লাফটা কোথা থেকে আসে
