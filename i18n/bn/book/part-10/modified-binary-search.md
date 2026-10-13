---
sourceHash: "b6dfd46e8f7fe1bcc28eb93ceb8677df4824feff0577fe475b26cc251d687b54"
title: "Modified Binary Search"
translatedAt: "2026-10-13T03:11:13.330Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Modified Binary Search {#ch-modified-binary-search}

> প্রতি ধাপে search space অর্ধেক করুন — শুধু sorted array-তে নয়, যেখানেই একটি হ্যাঁ/না test ঠিক একবার উল্টে যায়, সেখানেই।

**এই অধ্যায়ে:** যে template কখনো এক ঘর ভুল করে না · rotated array আর sorted-half test · একটি value নয়, একটি boundary খোঁজা · একটি answer space-এর ওপর binary search · যে invariant এদের সবাইকে একই code বানায়

## 💡 মূল ধারণা

Classic binary search-এর জন্য একটি sorted array লাগে। সেটা আরও সাধারণ একটি জিনিসের বিশেষ রূপ: binary search তখনই
কাজ করে, যখন আপনি একটি midpoint-কে হ্যাঁ/না প্রশ্ন করতে পারেন আর জানেন কোন অর্ধেক বাদ দিতে হবে।

আনুষ্ঠানিকভাবে বললে, array-কে **predicate-এর সাপেক্ষে monotonic** হতে হবে — কোনো একটি boundary-র আগের প্রতিটি
element উত্তর দেয় "না", আর সেখান থেকে পরের প্রতিটি element উত্তর দেয় "হ্যাঁ"। সেই boundary খুঁজতে `O(log n)` ধাপ
লাগে, ভেতরের data sorted হোক, rotated হোক, বা আদৌ কোনো array না হোক।

"Modified" মানে এই নতুন দৃষ্টিভঙ্গিটাই। Interview-এ যে তিনটি রূপভেদ গুরুত্বপূর্ণ:

| রূপভেদ                  | কী monotonic                                     |
| -------------------------- | ----------------------------------------------------- |
| Rotated sorted array       | দুই অর্ধেকের একটি সবসময় ঠিকঠাক sorted        |
| প্রথম বা শেষ occurrence   | "এই element কি `≥ target`?" ঠিক একবার উল্টে যায়        |
| Answer space-এ search | "`x` capacity কি যথেষ্ট?" — feasibility monotonic |

> Array search space নয়। Search space হলো **সিদ্ধান্তটা**। এটা একবার দেখতে পেলে, "`d` দিনে package পাঠানোর
> সর্বনিম্ন capacity" একটি binary search হয়ে যায়, যদিও কোথাও কোনো sorted input নেই।

## কীভাবে কাজ করে

### Template

প্রতিবার এভাবে লিখুন, তাহলে off-by-one ভুল আর হবে না:

```typescript
function binarySearch(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length - 1;   // inclusive on both ends

  while (low <= high) {         // <= because low === high is still one unchecked element
    const mid = low + Math.floor((high - low) / 2);   // no overflow, and no bias

    if (nums[mid] === target) return mid;
    if (nums[mid] < target) low = mid + 1;            // discard mid — it has been checked
    else high = mid - 1;
  }
  return -1;   // low is now the insertion point, which LC 35 asks for
}
// Time: O(log n), Space: O(1)
```

দুটি খুঁটিনাটি সঠিকতার দায়িত্ব নেয়। Inclusive bound-সহ `low <= high` মানে loop তখনই বের হয়, যখন range সত্যিই
খালি। আর `mid + 1` / `mid - 1` অগ্রগতি নিশ্চিত করে — দুই element-এর range-এ `low = mid` চিরকাল loop করে।

### Rotated sorted array

Rotation সামগ্রিকভাবে sorted-ভাব ভাঙে, কিন্তু স্থানীয়ভাবে নয়। যেকোনো midpoint-এ ভাগ করুন, **অন্তত একটি অর্ধেক
তখনো ঠিকঠাক sorted** থাকে — কোনটি, তা চিনে নিন, তাহলে target সেখানে আছে কিনা ঠিক করতে পারবেন।

```typescript
function searchRotated(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length - 1;

  while (low <= high) {
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] === target) return mid;

    if (nums[low] <= nums[mid]) {
      // Left half [low..mid] is sorted
      if (nums[low] <= target && target < nums[mid]) high = mid - 1;
      else low = mid + 1;
    } else {
      // Right half [mid..high] is sorted
      if (nums[mid] < target && target <= nums[high]) low = mid + 1;
      else high = mid - 1;
    }
  }
  return -1;
}
// Time: O(log n), Space: O(1)
```

Test হলো `nums[low] <= nums[mid]`, আর `<=` শুধু সাজসজ্জা নয়: দুই element-এর range-এ `low` আর `mid` একই index, আর
strict `<` অর্ধেকটাকে ভুল শ্রেণিতে ফেলত।

**Minimum খোঁজা** একই ধারণা, শুধু target বাদ দিয়ে। Midpoint-কে ডান প্রান্তের সাথে তুলনা করুন — বড় হলে মানে rotation
point ডানে।

```typescript
function findMin(nums: number[]): number {
  let low = 0;
  let high = nums.length - 1;

  while (low < high) {          // < not <=: converge on a single surviving index
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] > nums[high]) low = mid + 1;   // mid cannot be the minimum
    else high = mid;                             // mid might be the minimum — keep it
  }
  return nums[low];
}
// Time: O(log n), Space: O(1)
```

⚠️ খেয়াল করুন, loop-এর শর্ত বদলে `low < high` হয়েছে, আর `mid - 1`-এর বদলে `high = mid`। এটা **boundary খোঁজার**
রূপ, আর এটা ওপরের value খোঁজার template থেকে আলাদা একটি template। দুটি মিশিয়ে ফেললে — `low <= high` সাথে
`high = mid` — infinite loop হয়।

### একটি boundary খোঁজা

"প্রথম অবস্থান যেখানে…" আর "শেষ অবস্থান যেখানে…" হলো boundary search। একটি equality check করে তারপর পাশে
linear scan চালিয়ে শর্টকাট নেওয়ার চেষ্টা করবেন না। `[2, 2, 2, 2]`-এ সেটা নেমে `O(n)` হয়ে যায়।

```typescript
// Smallest index with nums[i] >= target — the lower bound
function lowerBound(nums: number[], target: number): number {
  let low = 0;
  let high = nums.length;   // exclusive: the answer may be "past the end"

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (nums[mid] < target) low = mid + 1;   // mid answers "no", discard it
    else high = mid;                         // mid answers "yes", it is still a candidate
  }
  return low;   // === nums.length when every element is smaller
}

// LC 34 falls straight out of it
function searchRange(nums: number[], target: number): [number, number] {
  const first = lowerBound(nums, target);
  if (first === nums.length || nums[first] !== target) return [-1, -1];
  return [first, lowerBound(nums, target + 1) - 1];
}
// Time: O(log n), Space: O(1)
```

যে invariant মুখে বলতে হবে: **`low`-এর নিচের সবকিছু উত্তর দেয় না, `high` থেকে ওপরের সবকিছু উত্তর দেয় হ্যাঁ।**
দুটি যেখানে মেলে, সেই index-টাই boundary। প্রতিটি boundary problem হলো এই function-টাই, শুধু predicate আলাদা।

### Answer space-এর ওপর binary search

প্রশ্ন যখন একটি minimum বা maximum value চায়, আর একটি candidate যাচাই করা সস্তা, তখন একটি array নয়, value-গুলোর
ওপর search করুন।

```typescript
// LC 875 — the slowest eating speed that finishes all piles within h hours
function minEatingSpeed(piles: number[], h: number): number {
  const hoursNeeded = (speed: number): number =>
    piles.reduce((total, pile) => total + Math.ceil(pile / speed), 0);

  let low = 1;                      // the smallest conceivable answer
  let high = Math.max(...piles);    // the largest useful answer

  while (low < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (hoursNeeded(mid) <= h) high = mid;   // feasible — try slower
    else low = mid + 1;                      // too slow — must go faster
  }
  return low;
}
// Time: O(n log(max pile)), Space: O(1)
```

"`x` speed কি যথেষ্ট দ্রুত" predicate-টি monotonic: `x` কাজ করলে তার চেয়ে বড় প্রতিটি speed-ও কাজ করে। এই
monotonicity-ই একমাত্র পূর্বশর্ত — pile-গুলো কখনো sort করতে হয় না।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                      | কী ব্যবহার করবেন                | কেন                                     |
| ----------------------------------------------------------- | ------------------------ | --------------------------------------- |
| একটি sorted array আর একটি target                                 | Classic template         | মৌলিক ক্ষেত্র                            |
| "Sorted, কিন্তু rotated"                                        | Sorted-half test         | একটি অর্ধেক সবসময় ঠিকঠাক sorted       |
| "First", "last", "insertion point", "smallest index where…" | `lowerBound` রূপ        | Boundary, equality নয়                   |
| সস্তা feasibility check-সহ "সর্বনিম্ন X, যাতে…"       | Answer space-এ search  | Predicate monotonic, data নয় |
| একটি sorted matrix                                             | একটি সমতল array হিসেবে ধরুন, বা একটি কোণ থেকে হাঁটুন | দুটিই `O(log n)` বা `O(m + n)` |
| Unsorted array, একটিমাত্র query                                | Linear scan              | একবার search করতে sort করলে খরচ বেশি        |
| Unsorted array, অনেক query                                | একবার sort, তারপর প্রতিটিতে binary search | Sort-এর খরচ amortise হয়          |
| Duplicate আর একটি rotated array                              | Binary search নেমে `O(n)` হয় | `[2,2,2,0,2]`-এ midpoint কোনো তথ্য দেয় না |

শেষ row-টা একটি সীমা হিসেবে জানা দরকার। LC 81-এর সত্যিকারের একটি `O(n)` worst case আছে। Interview-এ সঠিক উত্তর
হলো সেটা নাম ধরে বলা, `O(log n)` দাবি করা নয়।

## সাধারণ ভুল

**যোগ করে midpoint হিসাব করা:**

```typescript
// ❌ const mid = Math.floor((low + high) / 2);   // overflows in fixed-width languages
// ✅ const mid = low + Math.floor((high - low) / 2);
```

JavaScript-এর number-এ বাস্তবে এটা নিরাপদ, কিন্তু interviewer-রা এটাকে একটি সংকেত হিসেবে পড়েন। নিরাপদ রূপটা লিখুন।

**দুই রকম loop-এর গড়ন মিশিয়ে ফেলা:**

```typescript
// ❌ while (low <= high) { ... high = mid; }   // infinite when low === high
// ✅ value search: while (low <= high), high = mid - 1
// ✅ boundary search: while (low < high),  high = mid
```

**Midpoint বাদ না দেওয়া:**

```typescript
// ❌ low = mid;      // on a two-element range, mid === low and nothing progresses
// ✅ low = mid + 1;  // mid has been checked
```

**Sorted-half test-এ strict তুলনা:**

```typescript
// ❌ if (nums[low] < nums[mid])    // fails when low === mid on a two-element range
// ✅ if (nums[low] <= nums[mid])
```

**সমান একটি element পাওয়ার পর পাশে scan করা:**

```typescript
// ❌ find target, then walk left to the first occurrence — O(n) on [2,2,2,2]
// ✅ two lowerBound calls, both O(log n)
```

**Answer-space search-এ ভুল bound বাছা:**

```typescript
// ❌ low = 0    // speed 0 makes hoursNeeded infinite
// ✅ low = 1, high = the largest value that could ever be needed
```

## অনুশীলনের জন্য Problem

| #   | Problem                                                   | কঠিনতা | যা অনুশীলন করায়                                |
| --- | --------------------------------------------------------- | ---------- | --------------------------------------------- |
| 704 | Binary Search                                             | Easy       | Template, যতক্ষণ না হাতে বসে যায় ততক্ষণ লেখা    |
| 35  | Search Insert Position                                    | Easy       | ব্যর্থ search কেন `low` return করে            |
| 33  | Search in Rotated Sorted Array                            | Medium     | Sorted-half test                           |
| 153 | Find Minimum in Rotated Sorted Array                      | Medium     | Boundary loop-এর গড়ন                        |
| 34  | Find First and Last Position of Element in Sorted Array    | Medium     | `lowerBound`, দুবার                            |
| 162 | Find Peak Element                                         | Medium     | আদৌ কোনো sorted input ছাড়াই binary search      |
| 875 | Koko Eating Bananas                                       | Medium     | Answer space-এ search                     |
| 4   | Median of Two Sorted Arrays                               | Hard       | একটি index নয়, একটি partition-এর ওপর binary search     |

704 আর 34 লিখতে থাকুন, যতক্ষণ না দুই রকম loop-এর গড়ন মাথায় আলাদা হয়ে যায়। 162 আর 875 প্রমাণ করে যে pattern-টা
predicate নিয়ে, array নিয়ে নয়।

## 🔑 মূল শিক্ষা

- Binary search-এর দরকার একটি monotonic predicate, sorted array নয় — এটাই একে "modified" বানায়।
- `low + Math.floor((high - low) / 2)` ব্যবহার করুন, আর পরীক্ষা করা midpoint সবসময় `mid ± 1` দিয়ে বাদ দিন।
- Value search হলো `high = mid - 1`-সহ `while (low <= high)`। Boundary search হলো `high = mid`-সহ `while (low < high)`। দুটি মেশাবেন না।
- Rotated array-তে অন্তত একটি অর্ধেক ঠিকঠাক sorted থাকে। `nums[low] <= nums[mid]` দিয়ে সেটা খুঁজুন।
- সস্তা feasibility check-সহ "সর্বনিম্ন X, যাতে…" হলো answer space-এর ওপর একটি binary search।

## Interview-এর প্রশ্ন

**Q: আপনার loop কোন invariant বজায় রাখে, বলুন।**

Inclusive bound-সহ value search-এর জন্য: target থাকলে, সেটা সবসময় `[low, high]`-এর ভেতরে থাকে। প্রতিটি branch শুধু
সেই element-গুলো সরায়, যেগুলো target হতে পারে না, আর range খালি হলে loop শেষ হয়। Boundary search-এর জন্য: `low`-এর
নিচের সবকিছু predicate-এ ব্যর্থ হয়, আর `high` থেকে ওপরের সবকিছু সেটা মানে। তাই দুটি যেখানে মেলে, সেই index-টাই
boundary। এটা বলতে পারাই যুক্তি দিয়ে বের করা solution-কে মুখস্থ করা solution থেকে আলাদা করে।

**Q: `high = mid`-সহ `while (low <= high)` কেন চিরকাল loop করে?**

যখন `low === high`, তখন `mid` দুটির সমান। `high = mid` set করলে কিছুই বদলায় না, শর্ত সত্যই থাকে, আর loop ঘুরতেই
থাকে। Inclusive-bound রূপে range ছোট করতে হবে `mid - 1` বা `mid + 1` দিয়ে। `high = mid` রূপের দরকার exclusive শর্ত
`low < high`, যেটা দুটি মিলতেই বের হয়ে যায়।

**Q: আগে rotation point না খুঁজে কীভাবে একটি rotated sorted array-তে search করবেন?**

প্রতি ধাপে `nums[low]`-কে `nums[mid]`-এর সাথে তুলনা করে চিনে নিন কোন অর্ধেক ঠিকঠাক sorted। তারপর দেখুন target সেই
অর্ধেকের জানা range-এর ভেতরে পড়ে কিনা: পড়লে সেখানে search করুন, না পড়লে অন্য অর্ধেকে। আগে pivot খোঁজাও কাজ করে,
তাতে আরেকটি `O(log n)` pass খরচ হয়, কিন্তু সেটা দরকার নেই।

**Q: Rotated array-তে duplicate থাকলে কী ভেঙে যায়?**

Sorted-half test আর নিষ্পত্তিমূলক থাকে না। `[2, 2, 2, 0, 2]`-এ `low`, `mid` আর `high` তিনটিই 2 পড়লে, কোনো অর্ধেকই
বাদ দেওয়া যায় না। তাই একমাত্র সঠিক চাল হলো এক প্রান্ত এক ঘর ছোট করা — তাতে worst case হয় `O(n)`। `O(log n)`
দাবি পেশ না করে, এটা স্পষ্ট করে বলুন।

**Q: কোন problem answer space-এর ওপর binary search চায়, কীভাবে চিনবেন?**

দুটি সংকেত একসাথে: প্রশ্নটা একটি অবস্থান নয়, একটি minimum বা maximum value চায়। আর "value `x` কি কাজ করে?" যাচাই
করা সরাসরি optimum খোঁজার চেয়ে অনেক সস্তা। তারপর নিশ্চিত হন predicate-টি monotonic — `x` কাজ করলে তার চেয়ে বড়
(বা ছোট) প্রতিটি value-ও কাজ করে। Koko Eating Bananas, Split Array Largest Sum আর Capacity To Ship Packages — সবগুলোর
গড়ন একই।

**Q: Sorted array-তেও binary search কখন ভুল উত্তর?**

যখন একটি নয়, মিলে যাওয়া প্রতিটি element দরকার, আর মিলগুলো ঘন — boundary খোঁজা `O(log n)`, কিন্তু `k`টি ফলাফল পড়া
তবুও `O(k)`। আর যখন data disk-এ বা একটি network call-এর পেছনে থাকে, যেখানে `log n`টি random access একটি sequential
scan-এর চেয়ে বেশি খরচের হতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — Two Pointers](#ch-two-pointers) — sorted array কাজে লাগানোর অন্য উপায়, `O(n)`-এ
- [Chapter ?? — Overlapping Interval](#ch-overlapping-intervals) — যেখানে এখানে পাওয়া sorted অবস্থানই প্রথম ধাপ
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — কেন `O(log n)`-এর জন্য একটি problem নতুন করে সাজানো সার্থক
