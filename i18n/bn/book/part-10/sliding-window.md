---
sourceHash: "158cfeeba077ea5a0161620852e1daa5321c93371c7b18dca71ad12c69b57897"
title: "Sliding Window"
translatedAt: "2026-10-19T10:27:54.970Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Sliding Window {#ch-sliding-window}

> Contiguous অংশ আর তার running state হাতে রাখুন, যাতে প্রতিটি element একবার ঢোকে আর একবার বেরোয়।

**এই অধ্যায়ে:** fixed window · বাড়ানো-আর-ছোট-করার template · মোট কাজ কেন তবু `O(n)` · window-এর ভেতরে যে state থাকে · যে প্রশ্ন দেখতে window-এর মতো, অথচ window নয়

## 💡 মূল ধারণা

Subarray-এর ওপর brute force একই কাজ বারবার হিসাব করে। `[a, b, c, d]`-এ size 3-এর window হলো
`abc`, তারপর `bcd`। মাঝের দুটি element দুবার যোগ হয়। Sliding window বর্তমান অংশের state রেখে দেয়, আর শুধু
সেটা বদলায়: যেটা বেরিয়ে গেল সেটা বাদ, যেটা ঢুকল সেটা যোগ।

Phone-এর screen-time report এর রোজকার উদাহরণ। সাত দিনের চলতি মোট দেখাতে কেউ সাত দিন আবার যোগ করে না। যে দিনটা
range থেকে বেরিয়ে গেল সেটা বাদ দেয়, আর আজকের দিনটা যোগ করে।

> প্রতিটি index window-এ ঢোকে একবার, বেরোয় বড়জোর একবার। তাই দুটি pointer মিলে মোট বড়জোর `2n` পদক্ষেপ নেয়।
> এজন্যই loop-এর ভেতরে স্পষ্ট আরেকটা loop থাকলেও খরচ `O(n)`।

## কীভাবে কাজ করে

### Fixed window

প্রশ্নে size দেওয়া থাকলে প্রথম window-টা বানিয়ে নিন। তারপর প্রতিটি ধাপে একবার করে বদলান।

```typescript
// Largest sum of any k consecutive elements
function maxSumSubarray(nums: number[], k: number): number | null {
  if (nums.length < k) return null;

  let windowSum = 0;
  for (let i = 0; i < k; i++) windowSum += nums[i];   // the first window, built once

  let best = windowSum;
  for (let end = k; end < nums.length; end++) {
    windowSum += nums[end] - nums[end - k];           // one in, one out — O(1) per step
    best = Math.max(best, windowSum);
  }
  return best;
}
// Time: O(n), Space: O(1)  — the naive version is O(n × k)
```

### Dynamic window

Constraint যতটা অনুমতি দেয়, size যখন ততটাই, তখন window প্রতিটি iteration-এ বড় হয়। আর ছোট হয় শুধু ততক্ষণ,
যতক্ষণ সেটা invalid। এই পরিবারের বেশিরভাগ প্রশ্ন এই template-এই চলে:

```typescript
function longestValidWindow(s: string): number {
  const state = new Map<string, number>();          // whatever "valid" needs to be decided
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    state.set(s[end], (state.get(s[end]) ?? 0) + 1);  // 1. expand

    while (/* the window is invalid */ state.size > 2) {   // 2. shrink until it is valid again
      const leaving = s[start];
      const next = state.get(leaving)! - 1;
      next === 0 ? state.delete(leaving) : state.set(leaving, next);
      start++;
    }

    best = Math.max(best, end - start + 1);          // 3. record, only while valid
  }
  return best;
}
// Time: O(n), Space: O(k) where k is the number of distinct values held
```

Complexity-র হিসাবে `while`-টা nested loop নয়। `start` কখনো পেছনে যায় না, আর কখনো `end`-কে ছাড়িয়েও যায় না।
তাই পুরো run-এ সেটা বড়জোর `n` বার এগোয়।

**সবচেয়ে প্রচলিত উদাহরণ — কোনো character পুনরাবৃত্তি ছাড়া সবচেয়ে লম্বা substring:**

```typescript
function lengthOfLongestSubstring(s: string): number {
  const lastSeen = new Map<string, number>();   // character → the index it last appeared at
  let start = 0;
  let best = 0;

  for (let end = 0; end < s.length; end++) {
    const ch = s[end];
    const previous = lastSeen.get(ch);
    // Only jump forward. A stale index from before the window must not drag start back.
    if (previous !== undefined) start = Math.max(start, previous + 1);

    lastSeen.set(ch, end);
    best = Math.max(best, end - start + 1);
  }
  return best;
}
// Time: O(n), Space: O(min(n, alphabet))
```

⚠️ এই problem আসলে যাচাই করে `Math.max(start, previous + 1)` line-টা। `"abba"`-তে দ্বিতীয়
`a` এলে map-এ তখনও `a → 0` আছে। Guard না থাকলে `start` পিছিয়ে 1-এ চলে যায়, আর উত্তর 2-এর বদলে 3 হয়ে যায়।

### "State" মানে কী

Window নিজে আসল ব্যাপার নয়, আসল হলো window সম্পর্কে আপনি যে state রাখছেন। কাজের বড় অংশই সেটা বাছাই করা।

| প্রশ্ন যা চায়                       | কী রাখবেন                                       | কখন valid                  |
| --------------------------------------- | ------------------------------------------ | --------------------------- |
| `k`-টি element-এর সর্বোচ্চ sum                 | Running sum                              | সবসময় — size তো স্থির  |
| পুনরাবৃত্তি ছাড়া সবচেয়ে লম্বা অংশ             | `char → last index`                        | ভেতরে কোনো duplicate নেই         |
| বড়জোর `k`-টি আলাদা character         | `char → count`, সঙ্গে `map.size`            | `size ≤ k`                  |
| আরেকটা string-এর সব character আছে          | `need`-এর count, সঙ্গে একটি `missing` counter     | `missing === 0`             |
| `k`-টি replacement-এর পর সবচেয়ে লম্বা অংশ      | `char → count`, সঙ্গে এখন পর্যন্ত দেখা সর্বোচ্চ count     | `length − maxCount ≤ k`     |

## কখন ব্যবহার করবেন

| সংকেত                                                   | কী ব্যবহার করবেন      | কেন                                        |
| -------------------------------------------------------- | -------------- | ------------------------------------------ |
| "সবচেয়ে লম্বা" বা "সবচেয়ে ছোট" **contiguous** অংশ              | Sliding window | অংশটাই উত্তর                     |
| "Size `k`-এর subarray"                                   | Fixed window   | Size দেওয়া আছে, state `O(1)`             |
| Substring-এর ওপর "contains" বা "permutation of"          | Dynamic window | Valid কিনা, তা একটি counter মিলিয়েই বোঝা যায়           |
| Value **negative** হতে পারে, আর target হলো sum       | Prefix sum     | ছোট করলেও sum আর কমে না         |
| ক্রম জরুরি নয় — subarray নয়, subsequence        | Sorting বা DP  | Window সংজ্ঞা অনুযায়ীই contiguous       |
| Sorted array-এর দুই প্রান্ত থেকে জোড়া                | Two pointers   | দুই pointer-এর মাঝে কিছুই রাখা হচ্ছে না |

Negative-এর row-টাতেই মানুষ ধরা খায়। Positive সংখ্যার window বড় করলে sum শুধু বাড়ে। এজন্যই "খুব বড় হলে ছোট
করো" ঠিক পদক্ষেপ। Negative ঢুকলেই সেই monotonicity আর থাকে না। দেখুন
[Chapter ?? — Prefix Sum](#ch-prefix-sum)।

## সাধারণ ভুল

**Width ভুল হিসাব করা:**

```typescript
// ❌ const width = end - start;        // off by one on every window
// ✅ const width = end - start + 1;    // inclusive on both ends
```

**বাঁ দিকের pointer-কে পেছনে যেতে দেওয়া:**

```typescript
// ❌ start = lastSeen.get(ch)! + 1;
// ✅ start = Math.max(start, lastSeen.get(ch)! + 1);
```

**Window invalid থাকা অবস্থায় উত্তর লিখে রাখা:**

```typescript
// ❌ best = Math.max(best, end - start + 1);   // written before the shrink loop
// ✅ shrink first, then record — a "longest valid" answer must come from a valid window
```

**Minimum** window-এ ক্রম উল্টে যায়: window যতক্ষণ valid, ততক্ষণ ছোট করুন, আর উত্তর লিখুন shrink loop-এর
ভেতরেই। কারণ সবচেয়ে ছোট valid window হলো ভেঙে যাওয়ার ঠিক আগেরটা।

**State থেকে কমিয়ে দেওয়া, কিন্তু key delete না করা:**

```typescript
// ❌ counts.set(leaving, counts.get(leaving)! - 1);   // leaves a 0, so map.size stays wrong
// ✅ delete the key when the count hits 0, if size is what validity is measured on
```

**Element contiguous না হলেও window ধরা:**

```typescript
// ❌ "Longest increasing subsequence" is not a window problem — a subsequence has gaps
```

## অনুশীলনের জন্য Problem

| #    | Problem                                          | কঠিনতা | কী অনুশীলন হয়                      |
| ---- | ------------------------------------------------ | ---------- | ----------------------------------- |
| 643  | Maximum Average Subarray I                       | Easy       | Fixed window বদলানো               |
| 1456 | Maximum Number of Vowels in a Substring          | Easy       | Counter সহ fixed window         |
| 3    | Longest Substring Without Repeating Characters   | Medium     | Last index-এ লাফ                 |
| 1004 | Max Consecutive Ones III                         | Medium     | Budget হিসেবে validity                |
| 424  | Longest Repeating Character Replacement          | Medium     | `length − maxCount ≤ k`             |
| 567  | Permutation in String                            | Medium     | Fixed window আর counter মেলানো  |
| 438  | Find All Anagrams in a String                    | Medium     | একই ধাঁচ, শুধু ফলগুলো জমানো  |
| 76   | Minimum Window Substring                         | Hard       | Valid থাকা পর্যন্ত ছোট করা, আর একটি `missing` counter |

3 আর 76 একই বসায় লিখুন। একটি maximum খোঁজে আর ছোট করার পরে উত্তর লেখে। অন্যটি minimum খোঁজে আর ছোট করার সময়ই
লেখে। এই বৈপরীত্যটাই পুরো template।

## 🔑 মূল শিক্ষা

- Sliding window state নতুন করে না বানিয়ে বদলে নেয়, তাই `O(n × k)` বা `O(n²)` subarray scan নেমে আসে `O(n)`-এ।
- ভেতরের `while` একে quadratic বানায় না, কারণ বাঁ দিকের pointer শুধু সামনে যায়, আর মাত্র `n` বার।
- Window-এর width হলো `end - start + 1`। এই pattern-এ সবচেয়ে বেশি bug হয় `+ 1` ভুলে গিয়ে।
- Maximum-এর problem-এ উত্তর লিখুন আবার valid হওয়া পর্যন্ত ছোট করার পরে। Minimum-এর problem-এ লিখুন valid থাকতেই।
- Pattern-এর জন্য contiguity লাগে, আর sum-ভিত্তিক window-এর জন্য value non-negative হতে হয়।

## Interview-এর প্রশ্ন

**Q: `for` loop-এর ভেতরে একটি `while` loop আছে। তাহলে এটা `O(n²)` না হয়ে `O(n)` কেন?**

কারণ দুটি pointer-ই শুধু সামনে যায়, আর কোনোটাই `n` ছাড়ায় না। পুরো run-এ `end` এগোয় ঠিক `n` বার, আর `start`
বড়জোর `n` বার। তাই মোট কাজ `2n`-এর মধ্যে বাঁধা। এটাই amortised analysis: একটি iteration অনেকখানি ছোট করতে
পারে, কিন্তু সব iteration মিলিয়ে মোট ছোট করা সীমার বাইরে যেতে পারে না।

**Q: Window-এর জন্য কী রাখবেন, সেটা কীভাবে ঠিক করেন?**

আগে নিজেকে জিজ্ঞেস করুন, window invalid হয় কিসে। তারপর এমন সবচেয়ে ছোট জিনিসটা রাখুন, যা `O(1)`-এ সেই প্রশ্নের
উত্তর দেয়। "পুনরাবৃত্তি নেই"-এর জন্য লাগে শেষবার দেখা index। "বড়জোর `k`-টি আলাদা"-র জন্য লাগে count আর size।
"`t`-এর সবকিছু আছে"-র জন্য লাগে দরকারি count, সঙ্গে একটি counter, যেটা বলে আর কতগুলো বাকি। Validity যাচাই করতে
`O(n)` লাগলে বুঝবেন state ভুল বেছেছেন।

**Q: Negative সংখ্যা থাকলে sliding window কেন ব্যর্থ হয়?**

এই pattern ধরে নেয় যে window বড় হলে sum বাড়ে, আর ছোট হলে কমে। Negative value এই নিয়ম ভেঙে দেয়। তখন "sum খুব
বড়, বাঁ দিক থেকে বাদ দাও" আর নির্ভরযোগ্য থাকে না, কারণ বাদ দিলে sum উল্টে বাড়তেও পারে। এমন প্রশ্নে লাগে hash
map সহ prefix sum।

**Q: Problem-এ size বলা থাকলেও কখন fixed window ভুল?**

যখন size উত্তরটা নয়, বরং constraint বোঝায়। যেমন "বড়জোর `k`-টি
আলাদা character-ওয়ালা সবচেয়ে লম্বা substring"-এ `k` আছে, কিন্তু window dynamic। যাচাইয়ের উপায়: সব valid উত্তরের
দৈর্ঘ্য কি একই?

**Q: Minimum Window Substring সাধারণ template থেকে কোথায় আলাদা?**

এতে loop উল্টে যায়। Window valid না হওয়া পর্যন্ত বাড়ান, তারপর যতক্ষণ valid থাকে ততক্ষণ ছোট করুন, আর সেরা
দৈর্ঘ্যটা লিখুন shrink loop-এর ভেতরে। শূন্যে নেমে আসা `missing` counter validity যাচাইকে `O(1)`-এ রাখে।
নইলে প্রতিটি ধাপে দুটি map মেলাতে হতো।

## এরপর কী পড়বেন

- [Chapter ?? — Two Pointers](#ch-two-pointers) — একই দুটি index, যখন মাঝের অংশে কোনো state থাকে না
- [Chapter ?? — Prefix Sum](#ch-prefix-sum) — negative value এলে একই প্রশ্নের হাতিয়ার
- [Chapter ?? — Monotonic Stack](#ch-monotonic-stack) — "sliding window maximum"-এ আসলে কী লাগে
