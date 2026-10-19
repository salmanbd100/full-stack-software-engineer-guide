---
sourceHash: "b6dfd46e8f7fe1bcc28eb93ceb8677df4824feff0577fe475b26cc251d687b54"
title: "Modified Binary Search"
translatedAt: "2026-10-19T10:26:02.015Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Modified Binary Search {#ch-modified-binary-search}

> প্রতি ধাপে search space অর্ধেক করুন। শুধু sorted array-তে নয়, যেখানেই কোনো হ্যাঁ/না test ঠিক একবার উল্টে যায়, সেখানেই।

**এই অধ্যায়ে:** এমন template, যাতে কখনো এক ঘর এদিক-ওদিক হয় না · rotated array আর sorted-half test · value নয়, boundary খোঁজা · answer space-এর ওপর binary search · যে invariant এগুলোকে একই code বানিয়ে দেয়

## 💡 মূল ধারণা

চেনা binary search-এর জন্য sorted array লাগে। কিন্তু সেটা আরও সাধারণ নিয়মের বিশেষ রূপ মাত্র: মাঝের element-কে
একটি হ্যাঁ/না প্রশ্ন করে যদি বোঝা যায় কোন অর্ধেক বাদ দিতে হবে, তাহলেই binary search চলে।

আনুষ্ঠানিকভাবে বললে, array-কে **predicate-এর সাপেক্ষে monotonic** হতে হবে। মানে কোনো boundary-র আগের সব element
উত্তর দেয় "না", আর সেখান থেকে বাকি সব "হ্যাঁ"। Data sorted হোক, rotated হোক, বা আদৌ array না হোক, সেই boundary খুঁজতে
লাগে `O(log n)` ধাপ।

"Modified" বলতে এই নতুন করে দেখাটাই বোঝায়। Interview-এ যে তিনটি রূপ গুরুত্বপূর্ণ:

| রূপ                  | কোনটা monotonic                                     |
| -------------------------- | ----------------------------------------------------- |
| Rotated sorted array       | দুই অর্ধেকের অন্তত একটি সবসময় ঠিকমতো sorted        |
| প্রথম বা শেষ occurrence   | "এই element কি `≥ target`?" ঠিক একবার উল্টে যায়        |
| Answer space-এ search | "`x` capacity কি যথেষ্ট?" — সম্ভব কিনা, সেটাই monotonic |

> Search space array নয়, **সিদ্ধান্তটা**। এটা চোখে পড়লে "`d` দিনে package পাঠাতে সবচেয়ে কম কত capacity লাগে" প্রশ্নটাও
> binary search হয়ে যায়, যদিও কোথাও কোনো sorted input নেই।

## কীভাবে কাজ করে

### Template

প্রতিবার এভাবেই লিখুন, তাহলে off-by-one ভুল আর হবে না:

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

সঠিকতা টিকে থাকে দুটি খুঁটিনাটির ওপর। Inclusive bound-সহ `low <= high` মানে loop থামে কেবল range সত্যিই খালি হলে। আর
`mid + 1` / `mid - 1` নিশ্চিত করে যে প্রতি ধাপে এগোনো হচ্ছে। দুই element-এর range-এ `low = mid` লিখলে loop আর থামে না।

### Rotated sorted array

Rotation পুরো array-র sorted ভাব ভেঙে দেয়, কিন্তু স্থানীয়ভাবে ভাঙে না। যেকোনো মাঝের বিন্দুতে ভাগ করুন, **অন্তত একটি
অর্ধেক তখনো ঠিকমতো sorted থাকে**। কোনটা, সেটা চিনে নিলেই বলা যায় target সেই অর্ধেকে আছে কিনা।

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

Test হলো `nums[low] <= nums[mid]`, আর এখানে `<=` শুধু দেখানোর জন্য নয়। দুই element-এর range-এ `low` আর
`mid` একই index, তাই strict `<` লিখলে অর্ধেকটা ভুল চেনা হয়।

**Minimum খোঁজাও** একই ভাবনা, শুধু target নেই। মাঝের element-কে ডান প্রান্তের সঙ্গে মেলান। মাঝেরটা বড় হলে rotation-এর
বিন্দু ডানে আছে।

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

⚠️ খেয়াল করুন, loop-এর শর্ত বদলে হয়েছে `low < high`, আর `mid - 1`-এর বদলে `high = mid`। এটা **boundary খোঁজার** রূপ,
ওপরের value খোঁজার template থেকে আলাদা। দুটি মিশিয়ে ফেললে, মানে `low <= high`-এর সঙ্গে `high = mid` লিখলে, loop আর কখনো
থামে না।

### Boundary খোঁজা

"প্রথম কোন অবস্থানে…" আর "শেষ কোন অবস্থানে…" হলো boundary search। সমান element পেয়ে তারপর পাশে পাশে linear scan করে
শর্টকাট নেওয়ার চেষ্টা করবেন না। `[2, 2, 2, 2]`-এ সেটা নেমে যায় `O(n)`-এ।

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

যে invariant মুখে বলবেন: **`low`-এর নিচে সবকিছুর উত্তর না, আর `high` থেকে ওপরে সবকিছুর উত্তর হ্যাঁ।** দুটি যেখানে মেলে,
সেই index-টাই boundary। প্রতিটি boundary problem এই function-ই, শুধু predicate আলাদা।

### Answer space-এর ওপর binary search

প্রশ্ন যখন কোনো সর্বনিম্ন বা সর্বোচ্চ value চায়, আর candidate যাচাই করা সস্তা, তখন array নয়, value-গুলোর ওপর
search করুন।

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

"Speed `x` কি যথেষ্ট দ্রুত" predicate-টা monotonic: `x` চললে তার চেয়ে বড় প্রতিটি speed-ও চলে। পূর্বশর্ত শুধু এই
monotonic হওয়াটুকু। Pile-গুলো কখনো sort করতে হয় না।

## কখন ব্যবহার করবেন

| প্রশ্নে যে ইঙ্গিত থাকে                                      | কী ব্যবহার করবেন                | কেন                                     |
| ----------------------------------------------------------- | ------------------------ | --------------------------------------- |
| Sorted array আর একটি target                                 | চেনা template         | মূল ক্ষেত্র                            |
| "Sorted, কিন্তু rotated"                                        | Sorted-half test         | একটি অর্ধেক সবসময় ঠিকমতো sorted       |
| "প্রথম", "শেষ", "insertion point", "সবচেয়ে ছোট index যেখানে…" | `lowerBound` রূপ        | এখানে boundary খুঁজছেন, সমান element নয়   |
| "সবচেয়ে কম X যাতে…", আর সম্ভব কিনা যাচাই সস্তা       | Answer space-এ search  | Data নয়, predicate monotonic |
| Sorted matrix                                             | একটি সমতল array ধরে নিন, বা কোনো কোণ থেকে হাঁটুন | দুটিই `O(log n)` বা `O(m + n)` |
| Unsorted array, একটিমাত্র query                                | Linear scan              | একবার খোঁজার জন্য sort করতে খরচ বেশি        |
| Unsorted array, অনেক query                                | একবার sort, তারপর প্রতিটির জন্য binary search | Sort-এর খরচ ভাগ হয়ে যায়          |
| Duplicate আর rotated array                              | Binary search, যা নেমে যায় `O(n)`-এ | `[2,2,2,0,2]`-এ মাঝের element কোনো তথ্য দেয় না |

শেষ row-টা সীমা হিসেবে জেনে রাখুন। LC 81-এর worst case সত্যিই `O(n)`। Interview-এ সঠিক উত্তর হলো সেটা বলে দেওয়া,
`O(log n)` দাবি করা নয়।

## সাধারণ ভুল

**যোগ করে মাঝের বিন্দু বের করা:**

```typescript
// ❌ const mid = Math.floor((low + high) / 2);   // overflows in fixed-width languages
// ✅ const mid = low + Math.floor((high - low) / 2);
```

JavaScript-এর number-এ বাস্তবে এটা নিরাপদ, কিন্তু interviewer-রা একে অভ্যাসের লক্ষণ হিসেবে পড়েন। নিরাপদ রূপটাই লিখুন।

**দুই রকম loop মিশিয়ে ফেলা:**

```typescript
// ❌ while (low <= high) { ... high = mid; }   // infinite when low === high
// ✅ value search: while (low <= high), high = mid - 1
// ✅ boundary search: while (low < high),  high = mid
```

**মাঝের element বাদ না দেওয়া:**

```typescript
// ❌ low = mid;      // on a two-element range, mid === low and nothing progresses
// ✅ low = mid + 1;  // mid has been checked
```

**Sorted-half test-এ strict তুলনা:**

```typescript
// ❌ if (nums[low] < nums[mid])    // fails when low === mid on a two-element range
// ✅ if (nums[low] <= nums[mid])
```

**সমান element পাওয়ার পরে পাশে পাশে scan করা:**

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
| 704 | Binary Search                                             | Easy       | Template, যতক্ষণ না হাতে বসে যায়    |
| 35  | Search Insert Position                                    | Easy       | খুঁজে না পেলে কেন `low` return হয়            |
| 33  | Search in Rotated Sorted Array                            | Medium     | Sorted-half test                           |
| 153 | Find Minimum in Rotated Sorted Array                      | Medium     | Boundary loop-এর রূপ                        |
| 34  | Find First and Last Position of Element in Sorted Array    | Medium     | `lowerBound`, দুবার                            |
| 162 | Find Peak Element                                         | Medium     | কোনো sorted input ছাড়াই binary search      |
| 875 | Koko Eating Bananas                                       | Medium     | Answer space-এ search                     |
| 4   | Median of Two Sorted Arrays                               | Hard       | Index নয়, partition-এর ওপর binary search     |

704 আর 34 লিখতে থাকুন, যতক্ষণ না দুই রকম loop মাথায় আলাদা হয়ে বসে। 162 আর 875 প্রমাণ করে যে এই pattern-এর আসল বিষয়
predicate, array নয়।

## 🔑 মূল শিক্ষা

- Binary search-এর জন্য sorted array নয়, monotonic predicate লাগে। "Modified" কথাটার মানে এটাই।
- `low + Math.floor((high - low) / 2)` ব্যবহার করুন, আর যাচাই করা মাঝের element সবসময় `mid ± 1` দিয়ে বাদ দিন।
- Value search হলো `while (low <= high)`, সঙ্গে `high = mid - 1`। Boundary search হলো `while (low < high)`, সঙ্গে `high = mid`। দুটি মেশাবেন না।
- Rotated array-তে অন্তত একটি অর্ধেক ঠিকমতো sorted। সেটা চিনুন `nums[low] <= nums[mid]` দিয়ে।
- "সবচেয়ে কম X যাতে…", সঙ্গে সস্তা যাচাই থাকলে, সেটা answer space-এর ওপর binary search।

## Interview-এর প্রশ্ন

**Q: আপনার loop কোন invariant বজায় রাখে, বলুন।**

Inclusive bound-সহ value search-এ: target থাকলে সেটা সবসময় `[low, high]`-এর ভেতরে থাকে। প্রতিটি branch শুধু সেই
element-গুলো সরায়, যেগুলো target হতে পারে না, আর range খালি হলে loop শেষ হয়। Boundary search-এ: `low`-এর নিচে সবকিছু
predicate-এ ব্যর্থ, আর `high` থেকে ওপরে সবকিছু predicate মেনে চলে। তাই দুটি যেখানে মেলে, সেই index-ই boundary। এটা বলতে
পারাই যুক্তি দিয়ে বের করা সমাধানকে মুখস্থ সমাধান থেকে আলাদা করে।

**Q: `while (low <= high)`-এর সঙ্গে `high = mid` লিখলে loop কেন আর থামে না?**

যখন `low === high`, তখন `mid` দুটির সমান। `high = mid` দিলে কিছুই বদলায় না, শর্ত সত্যিই থেকে যায়, আর loop ঘুরতে থাকে।
Inclusive bound-এর রূপে range ছোট করতেই হবে `mid - 1` বা `mid + 1` দিয়ে। আর
`high = mid` রূপে লাগে exclusive শর্ত `low < high`, যা দুটি মিলে গেলেই loop থেকে বেরিয়ে আসে।

**Q: আগে rotation-এর বিন্দু না খুঁজে rotated sorted array-তে কীভাবে search করবেন?**

প্রতি ধাপে `nums[low]`-কে `nums[mid]`-এর সঙ্গে মেলান, তাতে বোঝা যায় কোন অর্ধেক ঠিকমতো sorted। তারপর দেখুন target সেই
অর্ধেকের জানা range-এর ভেতরে পড়ে কিনা। পড়লে সেখানে খুঁজুন, না পড়লে অন্য অর্ধেকে। আগে pivot খুঁজে নিলেও চলে, তাতে আরেকটি
`O(log n)` pass লাগে, কিন্তু দরকার নেই।

**Q: Rotated array-তে duplicate থাকলে কী ভেঙে যায়?**

Sorted-half test আর কিছু ঠিক করে দিতে পারে না। `[2, 2, 2, 0, 2]`-এ `low`, `mid` আর `high` তিনটিতেই
2 থাকলে কোনো অর্ধেকই বাদ দেওয়া যায় না। তখন একমাত্র সঠিক চাল হলো এক প্রান্ত এক ঘর ছোট করা, আর তাতে worst case হয়ে যায়
`O(n)`। `O(log n)` দাবি না করে এটা স্পষ্ট করে বলুন।

**Q: কোন problem answer space-এর ওপর binary search চায়, কীভাবে চিনবেন?**

দুটি ইঙ্গিত একসঙ্গে থাকে: প্রশ্ন অবস্থান নয়, সর্বনিম্ন বা সর্বোচ্চ কোনো value চায়, আর "value `x` কি চলে?" যাচাই করা
সরাসরি সেরা উত্তর খোঁজার চেয়ে অনেক সস্তা। তারপর নিশ্চিত হয়ে নিন predicate monotonic কিনা: `x` চললে তার চেয়ে বড় (বা
ছোট) প্রতিটি value-ও চলে। Koko Eating Bananas, Split Array Largest Sum আর Capacity To Ship Packages, সবগুলোর চেহারা একই।

**Q: Sorted array-তেও কখন binary search ভুল উত্তর?**

যখন একটি নয়, মেলে এমন সব element দরকার, আর সেগুলো ঘন হয়ে আছে। Boundary খুঁজতে লাগে `O(log n)`, কিন্তু `k`টি ফল পড়তে
তবু লাগে `O(k)`। আরেকটি ক্ষেত্র হলো data যখন disk-এ বা network call-এর ওপারে থাকে। সেখানে `log n`-বার random access-এর খরচ
একবারের টানা scan-এর চেয়েও বেশি হতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — Two Pointers](#ch-two-pointers) — sorted array কাজে লাগানোর অন্য উপায়, `O(n)`-এ
- [Chapter ?? — Overlapping Interval](#ch-overlapping-intervals) — যেখানে এখানে পাওয়া sorted অবস্থানটাই প্রথম ধাপ
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — `O(log n)` পেতে কেন problem নতুন করে সাজানো সার্থক
