---
sourceHash: "dbcc66b1ec6b9cf97681ee2924d085e0128979ec89900915de08b13cbc415ed4"
title: "Prefix Sum"
translatedAt: "2026-10-19T10:27:54.543Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Prefix Sum {#ch-prefix-sum}

> শুরুতে একবার pass-এর দাম দিন, তারপর যেকোনো range-sum প্রশ্নের উত্তর দিন constant time-এ।

**এই অধ্যায়ে:** running total · range-এর formula · subarray গোনার hash-map variant · কখন prefix sum ভুল হাতিয়ার

## 💡 মূল ধারণা

Prefix sum array প্রতিটি position-এ সেখান পর্যন্ত running total রাখে। এটা একবার হাতে থাকলে যেকোনো range-এর sum
বের করতে আর loop লাগে না, একটি বিয়োগই যথেষ্ট। কারণ `i` থেকে `j` পর্যন্ত sum মানে "`j` পর্যন্ত সবকিছু" থেকে
"`i`-এর আগের সবকিছু" বাদ দেওয়া।

ব্যাংক statement-ই এর সবচেয়ে সৎ উদাহরণ। রোজকার জমা `[100, 50, 200, 150]`, আর balance-এর column
`[100, 150, 350, 500]`। "দ্বিতীয় দিন থেকে চতুর্থ দিনের মধ্যে কত জমা হলো" জানতে কেউ জমাগুলো আবার যোগ করে না।
দুটি balance বিয়োগ করে নেয়।

> এই pattern আসলে বিনিময়: একবার `O(n)` time আর `O(n)` space দিয়ে পরের প্রতিটি query `O(n)` থেকে
> `O(1)`-এ নামানো। লাভ হয় তখনই, যখন query একাধিক, অথবা query-টা কোনো loop-এর ভেতরে লুকিয়ে আছে।

## কীভাবে কাজ করে

### শুরুতে একটি শূন্য রেখে বানান

```typescript
function buildPrefix(nums: number[]): number[] {
  // Length n + 1. prefix[i] is the sum of the first i elements, so prefix[0] = 0.
  const prefix: number[] = new Array<number>(nums.length + 1).fill(0);
  for (let i = 0; i < nums.length; i++) {
    prefix[i + 1] = prefix[i] + nums[i];
  }
  return prefix;
}
// Time: O(n), Space: O(n)
```

সামনের বাড়তি ঘরটা রুচির ব্যাপার নয়। এটা থাকলে range-এর formula-তে কোনো special case থাকে না:

```text
sum(left … right) = prefix[right + 1] - prefix[left]
```

এটা না থাকলে লিখতে হয় `left === 0 ? prefix[right] : prefix[right] - prefix[left - 1]`। আর ঠিক ওই branch-এই
off-by-one bug লুকিয়ে থাকে।

**`[3, 1, 4, 2, 5, 1]`-এর ওপর query করে দেখা যাক:**

| Index      | 0   | 1   | 2   | 3   | 4   | 5   | 6   |
| ---------- | --- | --- | --- | --- | --- | --- | --- |
| `nums`     | 3   | 1   | 4   | 2   | 5   | 1   | —   |
| `prefix`   | 0   | 3   | 4   | 8   | 10  | 15  | 16  |

Index 2 থেকে 4-এর sum হলো `prefix[5] - prefix[2]` = `15 - 4` = `11`, যা আসলে `4 + 2 + 5`। একটি বিয়োগ,
কোনো loop নেই।

### যে version-এ array বানাতেই হয় না

এই পরিবারের অর্ধেক interview প্রশ্নে range query লাগেই না। ওগুলো চায় গণনা। তার জন্য লাগে শুধু running
total আর এখন পর্যন্ত দেখা total-গুলোর map।

```typescript
// How many subarrays sum to exactly k?
function subarraySum(nums: number[], k: number): number {
  // seen[s] = how many prefixes so far had sum s. The 0 entry stands for the empty prefix.
  const seen = new Map<number, number>([[0, 1]]);
  let running = 0;
  let count = 0;

  for (const num of nums) {
    running += num;
    // A subarray ending here sums to k when some earlier prefix equalled running - k.
    count += seen.get(running - k) ?? 0;
    seen.set(running, (seen.get(running) ?? 0) + 1);
  }
  return count;
}
// Time: O(n), Space: O(n)
```

পুরো কৌশলটা সমীকরণ উল্টে লেখায়। `sum(i…j) = k` আর
`prefix[j] − prefix[i] = k` একই কথা, আর সেটা আবার `prefix[i] = prefix[j] − k`-এর সমান। তাই প্রতিটি position-এ
আপনি কোনো subarray খুঁজছেন না। আগেই দেখা কোনো সংখ্যা map-এ খুঁজছেন।

⚠️ Map গোনে **কতবার** এসেছে, শুধু আছে কিনা তা নয়। `k = 0` হলে `[1, -1, 1, -1, 1]`-এর উত্তর চারটি, অথচ
`Set` তার মাত্র একটি খুঁজে পায়। আর map-কে `[0, 1]` দিয়ে শুরু করলে তবেই index 0 থেকে শুরু হওয়া subarray গোনায়
আসে।

### কাছাকাছি ধাঁচ

| Variant             | কী বদলায়                                              | কোন প্রশ্নের উত্তর দেয়                          |
| ------------------- | --------------------------------------------------- | -------------------------------- |
| Prefix product      | যোগের বদলে গুণ, আর সঙ্গে একটি suffix pass | Product of array except self     |
| 2D prefix sum       | `p[i][j]` = origin থেকে শুরু হওয়া আয়তক্ষেত্রের sum    | `O(1)`-এ submatrix-এর sum         |
| Difference array    | Delta রাখুন, শেষে prefix sum করুন                 | অনেক range update, একবার পড়া     |
| Prefix modulo       | Map-এ রাখুন `running % k`                      | `k` দিয়ে বিভাজ্য subarray sum    |

## কখন ব্যবহার করবেন

| পরিস্থিতি                                    | কী ব্যবহার করবেন                   | কেন                                        |
| -------------------------------------------- | --------------------- | ------------------------------------------ |
| অনেক range sum, array কখনো বদলায় না         | Prefix sum            | একবার pass-এর পর প্রতি query `O(1)`            |
| Target sum-এ পৌঁছানো subarray গোনা         | Running sum + map     | `O(n²)` scan নেমে আসে একটিমাত্র pass-এ        |
| অনেক range update, তারপর একবার পড়া           | Difference array      | Update `O(1)`; শেষে একবার prefix pass |
| Query-র মাঝে array বদলায়             | Fenwick / segment tree | Prefix sum-কে প্রতিবার পুরোটা নতুন করে বানাতে হতো |
| Sum নয়, range-এর **max** বা **min**            | Sparse table, বা monotonic stack | Max-এর কোনো উল্টো operation নেই, তাই বিয়োগের কোনো মানে হয় না |
| একটিমাত্র query, পুরো total                             | সোজা loop             | আগে থেকে হিসাব করতে যা খরচ, বাঁচে তার চেয়ে কম     |

শেষ দুটি row মুখে বলার মতো। বিয়োগ কাজ করে, কারণ যোগের উল্টো operation আছে। এই pattern-এর আসল শর্ত এটাই,
আর `max` এই শর্ত পূরণ করে না।

## সাধারণ ভুল

**শুরুর শূন্যটা বাদ দিয়ে পরে জোড়াতালি দেওয়া:**

```typescript
// ❌ prefix[i] = sum of the first i + 1 elements, so every query needs a branch
function sumRangeBranchy(prefix: number[], left: number, right: number): number {
  return left === 0 ? prefix[right] : prefix[right] - prefix[left - 1];
}

// ✅ One extra slot at the front removes the branch entirely
function sumRange(prefix: number[], left: number, right: number): number {
  return prefix[right + 1] - prefix[left];
}
```

**ধরে নেওয়া যে সব সংখ্যা positive:**

```typescript
// ❌ Sliding window on [1, -1, 1] with target 1 — shrinking is meaningless when values can go down
// ✅ Prefix sum with a map handles negatives; a window does not
```

Pattern কোনটা হবে, এই ভাগটাই সেটা ঠিক করে। Negative value থাকলে sliding window যে monotonicity-র ওপর দাঁড়িয়ে,
সেটা ভেঙে যায়। তাই প্রশ্নে negative-এর কথা থাকলে বুঝবেন, prefix sum চাওয়া হচ্ছে।

**Map-এ `0 → 1` seed দিতে ভুলে যাওয়া:**

```typescript
// ❌ new Map<number, number>()      → misses every subarray that starts at index 0
// ✅ new Map<number, number>([[0, 1]])
```

**প্রতিটি update-এর পর পুরোটা নতুন করে বানানো:**

```typescript
// ❌ nums[3] = 9; prefix = buildPrefix(nums);   // O(n) per update — O(n·q) overall
// ✅ q updates mixed with q queries is a Fenwick tree: O(log n) each
```

## অনুশীলনের জন্য Problem

| #    | Problem                                | কঠিনতা | কী অনুশীলন হয়                        |
| ---- | -------------------------------------- | ---------- | ------------------------------------- |
| 1480 | Running Sum of 1d Array                | Easy       | শুধু build loop, আর কিছু না          |
| 303  | Range Sum Query — Immutable            | Easy       | শুরুর শূন্য আর range-এর formula |
| 724  | Find Pivot Index                       | Easy       | একই pass-এ prefix বনাম suffix     |
| 560  | Subarray Sum Equals K                  | Medium     | Map variant — সবচেয়ে প্রচলিত রূপ   |
| 523  | Continuous Subarray Sum                | Medium     | Prefix modulo                         |
| 238  | Product of Array Except Self           | Medium     | Prefix আর suffix, ভাগ ছাড়া        |
| 304  | Range Sum Query 2D — Immutable         | Medium     | দুই dimension-এ inclusion–exclusion |
| 1074 | Number of Submatrices That Sum to Target | Hard     | 2D-কে চেপে 1D map-এর কৌশলে আনা    |

560 এতবার solve করুন যে সমীকরণ উল্টানোটা হাতে চলে আসে। এই পরিবারের medium প্রশ্নের মোটামুটি অর্ধেক আসলে ওই একই
problem, শুধু অন্য ভাষায় লেখা।

## 🔑 মূল শিক্ষা

- একবার `O(n)` pass-এর পর prefix sum বারবারের range query-কে প্রতিটি `O(n)` থেকে `O(1)`-এ নামিয়ে আনে।
- Array-র শুরুতে একটি শূন্য দিন, তাহলে `sum(left…right) = prefix[right+1] - prefix[left]`-এ কোনো special case থাকে না।
- Subarray গুনতে array লাগেই না। একটি running total আর একটি frequency map এক pass-এই কাজটা সারে।
- Pattern কাজ করে কারণ যোগের উল্টো operation আছে। এজন্যই এটা `max` বা `min`-এ খাটে না।
- Negative সংখ্যা থাকলে sliding window বাদ, আর ইঙ্গিত সোজা prefix sum-এর দিকে।

## Interview-এর প্রশ্ন

**Q: Prefix array-তে `n + 1`-টি ঘর কেন?**

যাতে `prefix[0]` মানে হয় "কিছুই না-এর sum"। তাহলে শূন্য সহ সব
`left`-এর জন্য range-এর formula একই থাকে, আর যে branch-এ সাধারণত off-by-one ভুল হয়, সেটাই আর থাকে না। খরচ
মাত্র একটি বাড়তি integer।

**Q: "k-এর সমান sum-ওয়ালা subarray গোনা" কীভাবে hash-map problem হয়ে যায়?**

সংজ্ঞাটা উল্টে লিখুন। `sum(i…j) = k` মানে `prefix[j] − prefix[i] = k`, তাই
`prefix[i] = prefix[j] − k`। Array-এর ওপর একবার হাঁটুন, আর এখন পর্যন্ত দেখা prefix sum-গুলোর frequency map রাখুন।
তাহলে প্রতিটি position-এ কাজ একটিমাত্র lookup, আর মোট খরচ `O(n²)`-এর বদলে `O(n)`।

**Q: কখন prefix sum ব্যবহার করবেন না?**

যখন query-র মাঝে array বদলায়। কারণ প্রতিটি update prefix array-এর পেছনের পুরো অংশটাই বাতিল করে দেয়। সেখানে
লাগবে Fenwick বা segment tree। আর query যখন range-এর maximum, তখনও না, কারণ বিয়োগ দিয়ে `max` ফেরানো যায় না।

**Q: Array-এর সব সংখ্যা positive, আর প্রশ্ন চাইছে `k`-এর সমান sum-ওয়ালা subarray। কী বদলায়?**

তখন sliding window ব্যবহার করা যায়, আর সেটাই ভালো: space `O(n)`-এর বদলে `O(1)`। কারণ সব value positive হলে
window বড় হওয়ার সঙ্গে running sum শুধু বাড়ে, তাই বাঁ দিক থেকে window ছোট করা ঠিক পদক্ষেপ। বলুন যে positive
হওয়াটাই এই দরজা খোলে। আর দুই case-এর জন্য একটিই solution লিখতে চাইলে map version তখনও কাজ করে।

## এরপর কী পড়বেন

- [Chapter ?? — Sliding Window](#ch-sliding-window) — সব value positive হলে `O(1)`-space বিকল্প
- [Chapter ?? — Two Pointers](#ch-two-pointers) — sorted বা monotonic input loop বাদ দেওয়ার আরেকটি উপায়
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — `O(n)` space দিয়ে `O(1)` query কেনা কেন সাধারণত ঠিক
