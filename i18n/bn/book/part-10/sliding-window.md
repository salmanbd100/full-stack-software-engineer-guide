---
sourceHash: "158cfeeba077ea5a0161620852e1daa5321c93371c7b18dca71ad12c69b57897"
title: "Sliding Window"
translatedAt: "2026-10-13T03:09:52.232Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Sliding Window {#ch-sliding-window}

> একটি contiguous span আর তার running state ধরে রাখুন, যাতে প্রতিটি element একবার যোগ হয় আর একবার বাদ পড়ে।

**এই অধ্যায়ে:** fixed window · expand-and-shrink template · মোট কাজ কেন তবুও `O(n)` · window-এর ভেতরে যে state থাকে · যে প্রশ্নগুলো window-এর মতো দেখায়, কিন্তু আসলে নয়

## 💡 মূল ধারণা

Subarray-এর ওপর brute force একই overlapping কাজ বারবার হিসাব করে। `[a, b, c, d]`-এর ওপর size 3-এর window হলো
`abc`, তারপর `bcd`, আর মাঝের দুটি element দুবার যোগ হয়। Sliding window বর্তমান span-এর state ধরে রাখে আর সেটাকে
edit করে: যা বেরিয়ে গেল তা বিয়োগ করুন, যা এল তা যোগ করুন।

Phone-এর screen-time রিপোর্ট এর দৈনন্দিন রূপ। চলমান সাপ্তাহিক total দেখাতে কেউ সাত দিন আবার যোগ করে না — range
থেকে যে দিনটি বেরিয়ে গেছে সেটা বাদ দেয়, আর আজকেরটা যোগ করে।

> প্রতিটি index window-এ একবার ঢোকে আর বড়জোর একবার বেরোয়, তাই দুটি pointer মিলিয়ে বড়জোর `2n`-টি পদক্ষেপ নেয়।
> এ কারণেই যে loop-এর ভেতরে স্পষ্টতই আরেকটি loop আছে, সেটাও `O(n)`।

## কীভাবে কাজ করে

### Fixed window

প্রশ্ন যখন size বলে দেয়, প্রথম window বানান, তারপর প্রতি ধাপে একবার edit করুন।

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

Size যখন constraint যতটা দেয় ততটাই, তখন window প্রতিটি iteration-এ বড় হয়, আর ছোট হয় শুধু যতক্ষণ সেটা invalid।
এই template এই পরিবারের বেশিরভাগটাই ধরে:

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

Complexity-র অর্থে `while` কোনো nested loop নয়। `start` কখনো পেছনে যায় না আর কখনো `end`-কে পেরোয় না, তাই পুরো
run জুড়ে এটা বড়জোর `n` বার এগোয়।

**আদর্শ উদাহরণ — কোনো character পুনরাবৃত্তি ছাড়া দীর্ঘতম substring:**

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

⚠️ এই problem আসলে যে line-টি যাচাই করে, সেটা `Math.max(start, previous + 1)`। `"abba"`-তে দ্বিতীয় `a` যখন আসে,
map-এ তখনও `a → 0` আছে। Guard না থাকলে `start` পিছিয়ে 1-এ চলে যায়, আর উত্তর 2-এর বদলে 3 হয়।

### "State" বলতে কী বোঝায়

Window নিজে মূল কথা নয়; এর সম্পর্কে আপনি যে state রাখেন, সেটাই। সেটা বেছে নেওয়াই বেশিরভাগ কাজ।

| প্রশ্ন যা চায়                       | যা রাখবেন                                       | Valid যখন                  |
| --------------------------------------- | ------------------------------------------ | --------------------------- |
| `k`-টি element-এর সর্বোচ্চ sum                 | একটি running sum                              | সবসময় — size স্থির  |
| পুনরাবৃত্তি ছাড়া দীর্ঘতম run             | `char → last index`                        | ভেতরে কোনো duplicate নেই         |
| বড়জোর `k`-টি আলাদা character         | `char → count`, সাথে `map.size`            | `size ≤ k`                  |
| আরেকটি string-এর সবকিছু ধারণ করে          | `need` count, সাথে একটি `missing` counter     | `missing === 0`             |
| `k`-টি replacement-এর পর দীর্ঘতম run      | `char → count`, সাথে দেখা সর্বোচ্চ count     | `length − maxCount ≤ k`     |

## কখন ব্যবহার করবেন

| সংকেত                                                   | কী ব্যবহার করবেন      | কেন                                        |
| -------------------------------------------------------- | -------------- | ------------------------------------------ |
| "দীর্ঘতম" বা "ক্ষুদ্রতম" **contiguous** span              | Sliding window | Span-টিই উত্তর                     |
| "Size `k`-এর subarray"                                   | Fixed window   | Size দেওয়া আছে, state `O(1)`             |
| একটি substring-এর ওপর "ধারণ করে" বা "এর permutation"          | Dynamic window | Validity একটি counter-এর তুলনা           |
| Value **negative** হতে পারে আর target একটি sum       | Prefix sum     | ছোট করলে sum আর কমে না         |
| Order গুরুত্বপূর্ণ নয় — subsequence, subarray নয়        | Sorting বা DP  | সংজ্ঞা অনুযায়ীই window contiguous       |
| Sorted array-এর দুই প্রান্ত থেকে একটি pair                | Two pointers   | Pointer-দের মাঝে কিছুই ধরে রাখা হচ্ছে না |

Negative-এর row-টিতেই মানুষ ধরা পড়ে। Positive সংখ্যার একটি window বড় করলে sum শুধু বাড়েই, আর এটাই "বেশি বড় হলে
ছোট করো"-কে একটি বৈধ পদক্ষেপ বানায়। Negative আসতে দিলে সেই monotonicity হারিয়ে যায় — দেখুন
[Chapter ?? — Prefix Sum](#ch-prefix-sum)।

## সাধারণ ভুল

**Width ভুল হিসাব করা:**

```typescript
// ❌ const width = end - start;        // off by one on every window
// ✅ const width = end - start + 1;    // inclusive on both ends
```

**বাঁ pointer-কে পেছনে যেতে দেওয়া:**

```typescript
// ❌ start = lastSeen.get(ch)! + 1;
// ✅ start = Math.max(start, lastSeen.get(ch)! + 1);
```

**Window invalid থাকা অবস্থায় উত্তর রেকর্ড করা:**

```typescript
// ❌ best = Math.max(best, end - start + 1);   // written before the shrink loop
// ✅ shrink first, then record — a "longest valid" answer must come from a valid window
```

একটি **minimum** window-এর ক্ষেত্রে ক্রম উল্টে যায়: window যতক্ষণ valid থাকে ততক্ষণ ছোট করুন, আর রেকর্ড করুন
shrink loop-এর ভেতরেই। কারণ সবচেয়ে ছোট valid window হলো ভেঙে যাওয়ার ঠিক আগেরটা।

**Key delete না করে state থেকে বাদ দেওয়া:**

```typescript
// ❌ counts.set(leaving, counts.get(leaving)! - 1);   // leaves a 0, so map.size stays wrong
// ✅ delete the key when the count hits 0, if size is what validity is measured on
```

**Element contiguous না হলেও window ব্যবহার করা:**

```typescript
// ❌ "Longest increasing subsequence" is not a window problem — a subsequence has gaps
```

## অনুশীলনের জন্য Problem

| #    | Problem                                          | Difficulty | যা অনুশীলন করায়                      |
| ---- | ------------------------------------------------ | ---------- | ----------------------------------- |
| 643  | Maximum Average Subarray I                       | Easy       | Fixed-window edit               |
| 1456 | Maximum Number of Vowels in a Substring          | Easy       | Counter সহ fixed window         |
| 3    | Longest Substring Without Repeating Characters   | Medium     | Last-index-এ লাফ                 |
| 1004 | Max Consecutive Ones III                         | Medium     | Budget হিসেবে validity                |
| 424  | Longest Repeating Character Replacement          | Medium     | `length − maxCount ≤ k`             |
| 567  | Permutation in String                            | Medium     | Fixed window, সাথে counter মেলানো  |
| 438  | Find All Anagrams in a String                    | Medium     | একই গড়ন, ফলাফল জমিয়ে  |
| 76   | Minimum Window Substring                         | Hard       | Valid থাকা পর্যন্ত shrink, আর একটি `missing` counter |

3 আর 76 এক বসায় লিখুন। একটি maximise করে আর shrink-এর পরে রেকর্ড করে, অন্যটি minimise করে আর shrink-এর
সময় রেকর্ড করে — এই বৈপরীত্যটাই পুরো template।

## 🔑 মূল শিক্ষা

- Sliding window state আবার না বানিয়ে edit করে, ফলে `O(n × k)` বা `O(n²)` subarray scan-কে `O(n)`-এ নামিয়ে আনে।
- ভেতরের `while` একে quadratic করে না, কারণ বাঁ pointer শুধু সামনে যায়, আর শুধু `n` বার।
- Window-এর width হলো `end - start + 1`; `+ 1` ভুলে যাওয়াই এই pattern-এর সবচেয়ে সাধারণ bug।
- Maximum problem আবার valid অবস্থায় ছোট হওয়ার পর রেকর্ড করে; minimum problem valid থাকা অবস্থাতেই রেকর্ড করে।
- Pattern-টির contiguity লাগে, আর sum-ভিত্তিক window-এর লাগে non-negative value।

## Interview-এর প্রশ্ন

**Q: `for` loop-এর ভেতরে একটি `while` loop আছে। তাহলে এটা `O(n²)` না হয়ে `O(n)` কেন?**

কারণ দুটি pointer শুধু সামনে যায়, আর কোনোটিই `n` ছাড়ায় না। পুরো run জুড়ে `end` ঠিক `n` বার এগোয়, আর `start`
বড়জোর `n` বার, তাই মোট কাজ `2n` দিয়ে সীমাবদ্ধ। এটা amortised analysis — একটি iteration অনেকখানি ছোট করতে পারে,
কিন্তু সব iteration-এর যোগফল পারে না।

**Q: Window-এর জন্য কী store করবেন, তা কীভাবে ঠিক করেন?**

জিজ্ঞেস করুন window-কে কী invalid করে। তারপর `O(1)`-এ সেই প্রশ্নের উত্তর দেয় এমন সবচেয়ে ছোট জিনিসটা store করুন।
"পুনরাবৃত্তি নেই"-এর লাগে শেষ দেখা index; "বড়জোর `k`-টি আলাদা"-র লাগে count আর একটি size; "`t`-এর সবকিছু ধারণ
করে"-র লাগে প্রয়োজনীয় count, সাথে এখনো কতগুলো বাকি তার একটি counter। Validity যাচাই করতে `O(n)` লাগলে state
ভুল।

**Q: Negative সংখ্যাসহ array-তে sliding window কেন ব্যর্থ হয়?**

Pattern-টি নির্ভর করে এর ওপর যে window বড় হলে sum বাড়ে আর ছোট হলে কমে। Negative value সেটা ভেঙে দেয়, তাই "sum
বেশি বড়, বাঁ দিক থেকে বাদ দাও" আর সঠিক থাকে না — বাদ দিলে sum বেড়েও যেতে পারে। ওই প্রশ্নগুলো চায় hash map সহ
একটি prefix sum।

**Q: Problem একটি size বললেও কখন fixed window ভুল পছন্দ?**

যখন size উত্তরটা বোঝায় না, একটি constraint বোঝায় — "বড়জোর `k`-টি আলাদা character সহ দীর্ঘতম substring"-এ `k`
আছে, কিন্তু window dynamic। যাচাইটা হলো: প্রতিটি valid উত্তরের দৈর্ঘ্য কি একই?

**Q: Minimum Window Substring সাধারণ template থেকে কীভাবে আলাদা?**

এটা loop-কে উল্টে দেয়। Window valid না হওয়া পর্যন্ত বড় করুন, তারপর যতক্ষণ valid থাকে ততক্ষণ ছোট করুন, আর
সবচেয়ে ভালো দৈর্ঘ্য রেকর্ড করুন shrink loop-এর ভেতরে। শূন্যে নেমে আসা একটি `missing` counter validity check-কে
`O(1)` রাখে, প্রতি ধাপে দুটি map তুলনা করতে হয় না।

## এরপর কী পড়বেন

- [Chapter ?? — Two Pointers](#ch-two-pointers) — একই দুটি index, যখন তাদের মাঝের span কোনো state বহন করে না
- [Chapter ?? — Prefix Sum](#ch-prefix-sum) — negative value এলে একই প্রশ্নগুলোর tool
- [Chapter ?? — Monotonic Stack](#ch-monotonic-stack) — "sliding window maximum"-এর আসলে যা লাগে
