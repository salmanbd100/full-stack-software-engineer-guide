---
sourceHash: "dbcc66b1ec6b9cf97681ee2924d085e0128979ec89900915de08b13cbc415ed4"
title: "Prefix Sum"
translatedAt: "2026-10-13T03:08:27.331Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Prefix Sum {#ch-prefix-sum}

> শুরুতে একবার একটি pass-এর খরচ দিন, তারপর যেকোনো range-sum প্রশ্নের উত্তর দিন constant time-এ।

**এই অধ্যায়ে:** running total · range formula · subarray গোনার hash-map variant · কখন prefix sum ভুল tool

## 💡 মূল ধারণা

একটি prefix sum array প্রতিটি position-এ running total রাখে। এটা একবার হাতে থাকলে, যেকোনো range-এর sum একটি
loop নয়, একটি বিয়োগ। কারণ `i` থেকে `j` পর্যন্ত sum মানে "`j` পর্যন্ত সবকিছু" বিয়োগ "`i`-এর আগের সবকিছু"।

সবচেয়ে সৎ উপমা হলো ব্যাংক statement। প্রতিদিনের জমা `[100, 50, 200, 150]`; balance-এর column
`[100, 150, 350, 500]`। "দ্বিতীয় দিন থেকে চতুর্থ দিনের মধ্যে কত জমা হয়েছে", এর উত্তর দিতে কেউ জমাগুলো আবার
যোগ করে না। দুটি balance বিয়োগ করে।

> এই pattern একটি লেনদেন: একবার `O(n)` time আর `O(n)` space খরচ করে পরের প্রতিটি query-কে `O(n)` থেকে
> `O(1)`-এ নামিয়ে আনা। লাভ হয় শুধু তখনই, যখন query একটির বেশি, অথবা query-টি কোনো loop-এর ভেতরে লুকিয়ে আছে।

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

সামনের বাড়তি slot-টি রুচির ব্যাপার নয়। এটা থাকলে range formula-তে কোনো special case থাকে না:

```text
sum(left … right) = prefix[right + 1] - prefix[left]
```

এটা না থাকলে আপনার লাগবে `left === 0 ? prefix[right] : prefix[right] - prefix[left - 1]`, আর off-by-one bug
ঠিক ওই branch-এই থাকে।

**`[3, 1, 4, 2, 5, 1]`-এর ওপর একটি query, হাতে-কলমে:**

| Index      | 0   | 1   | 2   | 3   | 4   | 5   | 6   |
| ---------- | --- | --- | --- | --- | --- | --- | --- |
| `nums`     | 3   | 1   | 4   | 2   | 5   | 1   | —   |
| `prefix`   | 0   | 3   | 4   | 8   | 10  | 15  | 16  |

Index 2 থেকে 4-এর sum হলো `prefix[5] - prefix[2]` = `15 - 4` = `11`, অর্থাৎ `4 + 2 + 5`। একটি বিয়োগ, কোনো
loop নেই।

### যে version কখনো array বানায় না

এই পরিবারের অর্ধেক interview প্রশ্ন আসলে range query চায়ই না। তারা চায় একটি সংখ্যা গুনতে। তার জন্য লাগে শুধু
running total আর এখন পর্যন্ত দেখা total-গুলোর একটি map।

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

পুরো কৌশলটাই এই পুনর্বিন্যাস। `sum(i…j) = k` আর `prefix[j] − prefix[i] = k` একই কথা, আর সেটা
`prefix[i] = prefix[j] − k`-এর সমান। তাই প্রতিটি position-এ আপনি কোনো subarray খুঁজছেন না। আপনি এমন একটি
সংখ্যা lookup করছেন, যা আগেই দেখেছেন।

⚠️ Map-টি **frequency** গোনে, শুধু আছে কি নেই তা নয়। `k = 0` হলে `[1, -1, 1, -1, 1]`-এর উত্তর চারটি, আর একটি
`Set` তার মধ্যে একটিই খুঁজে পায়। Map-কে `[0, 1]` দিয়ে seed করলেই index 0 থেকে শুরু হওয়া subarray আদৌ গোনায়
আসে।

### কাছাকাছি রূপগুলো

| Variant             | পরিবর্তন                                              | যার উত্তর দেয়                          |
| ------------------- | --------------------------------------------------- | -------------------------------- |
| Prefix product      | যোগের বদলে গুণ, সাথে একটি suffix pass-ও রাখুন | Product of array except self     |
| 2D prefix sum       | `p[i][j]` = origin থেকে rectangle-এর sum    | `O(1)`-এ submatrix-এর sum         |
| Difference array    | Delta রাখুন, শেষে prefix-sum করুন                 | অনেক range update, একবার read     |
| Prefix modulo       | Map-এ `running % k` রাখুন                      | `k` দিয়ে বিভাজ্য subarray sum    |

## কখন ব্যবহার করবেন

| পরিস্থিতি                                    | ব্যবহার                   | কেন                                        |
| -------------------------------------------- | --------------------- | ------------------------------------------ |
| অনেক range sum, array কখনো বদলায় না         | Prefix sum            | একটি pass-এর পর প্রতি query `O(1)`            |
| Target sum-এ পৌঁছানো subarray গোনা         | Running sum + map     | একটি `O(n²)` scan-কে একটি pass-এ নামিয়ে আনে        |
| অনেক range update, তারপর একবার read           | Difference array      | Update `O(1)`; শেষে একটি prefix pass |
| Query-গুলোর মাঝে array update হয়             | Fenwick / segment tree | Prefix sum-কে প্রতিবার পুরোটা আবার বানাতে হতো |
| Range-এর **max** বা **min**, sum নয়            | Sparse table, বা monotonic stack | Max-এর কোনো inverse নেই, তাই বিয়োগ অর্থহীন |
| একটি query, পুরো total                             | শুধু loop চালান             | Preprocessing-এর খরচ যা বাঁচায় তার চেয়ে বেশি     |

শেষ দুটি row মুখে বলার মতো। বিয়োগ কাজ করে কারণ যোগের একটি inverse আছে। এটাই pattern-এর আসল শর্ত, আর `max`
সেই শর্ত পূরণ করে না।

## সাধারণ ভুল

**শুরুর শূন্য বাদ দিয়ে পরে তালি দেওয়া:**

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

এই ভাগটাই pattern ঠিক করে দেয়। Negative value সেই monotonicity ভেঙে দেয়, যার ওপর sliding window নির্ভর করে।
তাই যে প্রশ্নে negative-এর কথা আছে, সেটা আপনাকে prefix sum ব্যবহার করতে বলছে।

**Map-এ `0 → 1` seed ভুলে যাওয়া:**

```typescript
// ❌ new Map<number, number>()      → misses every subarray that starts at index 0
// ✅ new Map<number, number>([[0, 1]])
```

**প্রতিটি update-এর পর আবার বানানো:**

```typescript
// ❌ nums[3] = 9; prefix = buildPrefix(nums);   // O(n) per update — O(n·q) overall
// ✅ q updates mixed with q queries is a Fenwick tree: O(log n) each
```

## অনুশীলনের জন্য Problem

| #    | Problem                                | Difficulty | যা অনুশীলন করায়                        |
| ---- | -------------------------------------- | ---------- | ------------------------------------- |
| 1480 | Running Sum of 1d Array                | Easy       | শুধু build loop, আর কিছু নয়          |
| 303  | Range Sum Query — Immutable            | Easy       | শুরুর শূন্য আর range formula |
| 724  | Find Pivot Index                       | Easy       | একটি pass-এ prefix বনাম suffix     |
| 560  | Subarray Sum Equals K                  | Medium     | Map variant — আদর্শ উদাহরণ   |
| 523  | Continuous Subarray Sum                | Medium     | Prefix modulo                         |
| 238  | Product of Array Except Self           | Medium     | Prefix আর suffix, ভাগ ছাড়া        |
| 304  | Range Sum Query 2D — Immutable         | Medium     | দুই dimension-এ inclusion–exclusion |
| 1074 | Number of Submatrices That Sum to Target | Hard     | 2D-কে 1D map-এর কৌশলে নামিয়ে আনা    |

পুনর্বিন্যাসটা স্বয়ংক্রিয় না হওয়া পর্যন্ত 560 solve করুন। এই পরিবারের medium প্রশ্নের মোটামুটি অর্ধেকই ভিন্ন
ভাষায় লেখা ওই একই problem।

## 🔑 মূল শিক্ষা

- একটি `O(n)` pass-এর পর prefix sum বারবারের range query-কে প্রতিটি `O(n)` থেকে প্রতিটি `O(1)`-এ নামিয়ে আনে।
- Array-এর শুরুতে একটি শূন্য রাখুন, যাতে `sum(left…right) = prefix[right+1] - prefix[left]`-এ কোনো special case না থাকে।
- Subarray গুনতে কোনো array-ই লাগে না — একটি running total আর একটি frequency map একটি pass-এই কাজটা করে।
- Pattern-টি কাজ করে কারণ যোগের inverse আছে। এ কারণেই এটা `max` বা `min`-এ খাটে না।
- Negative সংখ্যা sliding window-কে বাদ দেয়, আর সোজা prefix sum-এর দিকে দেখায়।

## Interview-এর প্রশ্ন

**Q: Prefix array-তে `n + 1`-টি entry কেন?**

যাতে `prefix[0]` মানে হতে পারে "কিছুই না-এর sum"। এতে শূন্যসহ প্রতিটি `left`-এর জন্য range formula একই রকম
থাকে, আর যে branch-এ সাধারণত off-by-one error দেখা দেয়, সেটা চলে যায়। খরচ একটি বাড়তি integer।

**Q: "k-তে যোগফল হওয়া subarray গোনা" কীভাবে একটি hash-map problem হয়ে যায়?**

সংজ্ঞাটা পুনর্বিন্যাস করুন। `sum(i…j) = k` মানে `prefix[j] − prefix[i] = k`, তাই
`prefix[i] = prefix[j] − k`। Array-টি একবার হেঁটে, এখন পর্যন্ত দেখা prefix sum-গুলোর একটি frequency map রাখলে
প্রতিটি position একটি lookup-এ পরিণত হয়। ফল `O(n²)`-এর বদলে `O(n)`।

**Q: কখন আপনি prefix sum ব্যবহার করবেন না?**

যখন query-গুলোর মাঝে array বদলায়। কারণ প্রতিটি update prefix array-এর পুরো suffix-কে অকেজো করে দেয় — তখন
লাগে Fenwick বা segment tree। আর যখন query-টি range maximum, কারণ বিয়োগ দিয়ে একটি `max`-কে উল্টানো যায় না।

**Q: Array-এর সব সংখ্যা positive, আর প্রশ্ন চাইছে যোগফল `k` এমন একটি subarray। কী বদলায়?**

তখন sliding window ব্যবহার করা যায়, আর সেটা ভালো: `O(n)`-এর বদলে `O(1)` space। শুধু positive value থাকলে
window বড় হওয়ার সাথে running sum বাড়ে, তাই বাঁ দিক থেকে ছোট করা একটি বৈধ পদক্ষেপ। বলুন যে positivity-ই এটা
সম্ভব করে, আর দুই ক্ষেত্রেই একটি solution লিখতে চাইলে map version তখনও কাজ করে।

## এরপর কী পড়বেন

- [Chapter ?? — Sliding Window](#ch-sliding-window) — সব value positive হলে `O(1)`-space বিকল্প
- [Chapter ?? — Two Pointers](#ch-two-pointers) — sorted বা monotonic input একটি loop সরানোর আরেকটি উপায়
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — `O(1)` query-র জন্য `O(n)` space খরচ করা কেন সাধারণত ঠিক
