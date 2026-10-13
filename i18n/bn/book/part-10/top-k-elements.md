---
sourceHash: "4a78790bc76c342cbfa54bc440ba663ba7a730bf77b7a9caccd67e6e086bc139"
title: "Top K Element"
translatedAt: "2026-10-13T03:10:20.140Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Top K Element {#ch-top-k-elements}

> একটি heap-এ শুধু `k`টি candidate রাখুন। তাতে খরচ `O(n log n)` থেকে নেমে `O(n log k)` হয়, আর streaming input-ও চলে।

**এই অধ্যায়ে:** কেন একটি **min**-heap আপনাকে `k`টি **largest** দেয় · TypeScript-এ একটি heap, কারণ ভাষাটিতে কোনো heap নেই · frequency অনুযায়ী top-k · কখন quickselect বা bucket sort heap-কে হারায় · streaming-এর ক্ষেত্র, যেটা শুধু heap-ই সামলাতে পারে

## 💡 মূল ধারণা

"দশ লাখ সংখ্যার মধ্যে সবচেয়ে বড় 5টি" — এর সহজ উত্তর হলো sort করে পাঁচটি নিয়ে নেওয়া। তাতে পাঁচটি value পেতে
`O(n log n)` কাজ হয়, আর পুরো input একসাথে memory-তে রাখতে হয়।

`k` size-এর একটি heap এর চেয়ে ভালো করে। এখন পর্যন্ত দেখা সেরা `k`টি ধরে রাখুন। প্রতিটি নতুন element-কে সেই `k`টির
মধ্যে **সবচেয়ে দুর্বলটির** সাথে তুলনা করুন, আর নতুনটি জিতলে অদলবদল করুন। Input-এর বাকি অংশ কখনো সাজানোই হয় না।

উল্টো মনে হওয়া অংশটা হলো heap-এর দিক। `k`টি **largest**-এর জন্য **min**-heap ব্যবহার করুন। আপনার `k`জন রক্ষিতের
মধ্যে সবচেয়ে ছোটটি root-এ বসে থাকে। নতুন কাউকে ঠিক এটাকেই হারাতে হবে — আর ঠিক এটাকেই বের করে দিতে হবে। Max-heap
আপনার সেরা element-টিকে সেখানে রাখত, যেখানে আপনার দরকার সবচেয়ে দুর্বলটি।

> **নিয়ম:** `k` largest → min-heap। `k` smallest → max-heap। Heap-এর root সবসময় সেই candidate, যার বাদ পড়ার
> ঝুঁকি সবচেয়ে বেশি।

## কীভাবে কাজ করে

### একটি heap, কারণ TypeScript-এ কোনো heap নেই

JavaScript-এ কোনো priority queue নেই। Interviewer-রা সাধারণত ধরে নিতে দেন যে একটি আছে, কিন্তু সেটা মুখে বলুন। এমন
একটি API চুপচাপ ব্যবহার করবেন না, যার অস্তিত্বই নেই। Comparator দিয়ে চলা একটি binary heap মোটামুটি পঁচিশ line-এর:

```typescript
class Heap<T> {
  private items: T[] = [];

  // Returns negative when `a` should sit above `b`
  constructor(private readonly compare: (a: T, b: T) => number) {}

  get size(): number {
    return this.items.length;
  }

  peek(): T | undefined {
    return this.items[0];
  }

  push(value: T): void {
    this.items.push(value);
    let i = this.items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.compare(this.items[i], this.items[parent]) >= 0) break;
      [this.items[i], this.items[parent]] = [this.items[parent], this.items[i]];
      i = parent;
    }
  }

  pop(): T | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;                 // move the last leaf to the root, then sink it
      let i = 0;
      for (;;) {
        const left = 2 * i + 1;
        const right = left + 1;
        let smallest = i;
        if (left < this.items.length && this.compare(this.items[left], this.items[smallest]) < 0) smallest = left;
        if (right < this.items.length && this.compare(this.items[right], this.items[smallest]) < 0) smallest = right;
        if (smallest === i) break;
        [this.items[i], this.items[smallest]] = [this.items[smallest], this.items[i]];
        i = smallest;
      }
    }
    return top;
  }
}
// push: O(log n), pop: O(log n), peek: O(1)
```

Array-কে tree হিসেবে ব্যবহারের কৌশলটা জানা দরকার: index `i`-এর জন্য child-রা থাকে `2i + 1` আর `2i + 2`-এ, আর
parent থাকে `(i - 1) >> 1`-এ। কোনো node object নেই, কোনো pointer নেই।

### `k`টি largest

```typescript
function findKthLargest(nums: number[], k: number): number {
  const heap = new Heap<number>((a, b) => a - b);   // min-heap: smallest at the root

  for (const value of nums) {
    heap.push(value);
    if (heap.size > k) heap.pop();   // evict the smallest keeper, never the largest
  }
  return heap.peek()!;   // the root of a k-sized min-heap is the kth largest
}
// Time: O(n log k), Space: O(k)  — sorting is O(n log n) and O(n)
```

Size-এর সীমা থেকে দুটো বৈশিষ্ট্য আপনা থেকেই আসে। সংজ্ঞা অনুযায়ীই root হলো `k`তম largest, কারণ ঠিক `k − 1`টি
element তার ওপরে আছে। আর memory `O(k)`, `O(n)` নয়। তাই input কখনো ধরে রাখতেই হয় না — এই pattern-এর অস্তিত্বের
পুরো কারণ এটাই।

### Frequency অনুযায়ী top `k`

দুই ধাপ: গুনুন, তারপর count-গুলোর ওপর একই heap চালান।

```typescript
function topKFrequent(nums: number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  // Compare on frequency, so the least frequent keeper sits at the root
  const heap = new Heap<[number, number]>((a, b) => a[1] - b[1]);

  for (const entry of counts) {
    heap.push(entry);
    if (heap.size > k) heap.pop();
  }

  const result: number[] = [];
  while (heap.size > 0) result.unshift(heap.pop()![0]);   // pop gives ascending, so prepend
  return result;
}
// Time: O(n + m log k) where m is the number of distinct values, Space: O(m)
```

Complexity সৎভাবে বলুন: যা-ই করুন, map-টি `O(m)` space নেবে। তাই heap-এর `O(k)` সাশ্রয় শুধু দ্বিতীয় ধাপে খাটে।
`O(n)` গোনাটা এড়ানো যায় না।

### যখন heap সবচেয়ে দ্রুত উত্তর নয়

| পরিস্থিতি                                        | ভালো tool        | খরচ                              |
| ------------------------------------------------ | ------------------ | --------------------------------- |
| একবারের `k`তম largest, পুরো array memory-তে      | Quickselect        | গড়ে `O(n)`, সবচেয়ে খারাপে `O(n²)`      |
| Frequency অনুযায়ী top `k`, count `n` দিয়ে সীমিত       | Bucket sort        | নিশ্চিতভাবে `O(n)`                  |
| Input stream হিসেবে আসে, বা `n` memory-তে আঁটে না    | `k` size-এর heap   | `O(n log k)`, `O(k)` space         |
| `k` প্রায় `n`-এর কাছাকাছি                               | সরাসরি sort          | `O(n log n)`, আর পড়তে সহজ   |
| `k = 1`                                           | একটি সাধারণ scan      | `O(n)`, `O(1)`                     |
| Data বদলানোর সাথে বারবার query                  | Heap, সবসময় চালু রাখা    | প্রতি update-এ `O(log k)`              |

Top K Frequent Elements-এ interviewer-রা আসলে bucket sort-এর উত্তরটাই খোঁজেন। কোনো frequency কখনো `n` ছাড়াতে
পারে না। তাই count দিয়ে index করা `n + 1`টি bucket-এর একটি array বানান, আর ওপর থেকে পড়ুন:

```typescript
function topKFrequentBuckets(nums: number[], k: number): number[] {
  const counts = new Map<number, number>();
  for (const n of nums) counts.set(n, (counts.get(n) ?? 0) + 1);

  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, count] of counts) buckets[count].push(value);

  const result: number[] = [];
  for (let count = buckets.length - 1; count >= 0 && result.length < k; count--) {
    for (const value of buckets[count]) {
      result.push(value);
      if (result.length === k) return result;
    }
  }
  return result;
}
// Time: O(n), Space: O(n)
```

⚠️ Quickselect-এর `O(n)` একটি গড়, নিশ্চয়তা নয়। শত্রুভাবাপন্ন input-এ এর সবচেয়ে খারাপ ক্ষেত্র `O(n²)`। এটা
array-এর ক্রমও বদলে দেয়। সেরা solution হিসেবে প্রস্তাব করার আগে দুটো খরচই উল্লেখ করুন।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                | কী ব্যবহার করবেন            | কেন                                       |
| ----------------------------------------------------- | -------------------- | ----------------------------------------- |
| "`k` largest", "`k` most frequent", "`k` closest"      | `k` size-এর heap     | সংজ্ঞা দেওয়ার মতো উদাহরণ                          |
| "…একটি stream থেকে" বা "element আসার সাথে সাথে"              | Heap, সবসময় চালু রাখা      | সীমাহীন input আর কিছুই সামলাতে পারে না       |
| "Median of a stream"                                  | **দুটো** heap        | নিচের অর্ধেকের জন্য max-heap, ওপরের জন্য min |
| "Merge `k` sorted lists"                              | `k`টি head-এর heap    | পরের output সবসময় `k`টির একটি        |
| `k`তম **smallest** element                        | `k` size-এর max-heap | নিয়মটা উল্টে দিন                            |
| পুরো sorted ক্রম এমনিতেই দরকার                | Sort                 | Heap কিছুই বাঁচায় না                     |

যে রূপভেদটা অনুশীলন করা দরকার, সেটা Find Median from Data Stream। কারণ দুই-heap-এর উত্তরটা স্পষ্ট নয়, আর প্রশ্নটা
প্রায়ই আসে। ছোট অর্ধেক একটি max-heap-এ রাখুন আর বড় অর্ধেক একটি min-heap-এ। আবার ভারসাম্য আনুন, যাতে size-এর
পার্থক্য বড়জোর এক থাকে। Median হলো একটি বা দুটো root।

## সাধারণ ভুল

**`k`টি largest-এর জন্য max-heap ব্যবহার করা:**

```typescript
// ❌ max-heap, then pop k times — O(n) to build plus O(k log n), and O(n) space
// ✅ min-heap capped at k — O(n log k) and O(k) space
```

দুটোই সঠিক। কিন্তু input একটি stream হলে শুধু একটিই কাজ করে।

**Heap-কে `k` ছাড়িয়ে বাড়তে দেওয়া:**

```typescript
// ❌ push everything, then pop until size === k
// ✅ if (heap.size > k) heap.pop();   // inside the loop — this is where the log k comes from
```

**ভুল field-এর তুলনা করা:**

```typescript
// ❌ new Heap<[number, number]>((a, b) => a[0] - b[0]);   // orders by value, not frequency
// ✅ (a, b) => a[1] - b[1];
```

**`pop()`-এর ক্রমকেই উত্তরের ক্রম ধরে নেওয়া:**

```typescript
// ❌ while (heap.size) result.push(heap.pop()![0]);   // ascending — reversed from what was asked
// ✅ unshift, or push then reverse
```

**`k` input-এর চেয়ে বড় হলে সেটা না সামলানো:**

```typescript
// ❌ heap.peek()! after fewer than k pushes returns the minimum, silently wrong
// ✅ clamp k, or return early — check the constraints for whether it is guaranteed
```

**`k ≈ n` হলেও দাবি করা যে `O(n log k)` `O(n log n)`-কে হারায়:**

```typescript
// ❌ "the heap is always faster"
// ✅ it is faster when k is much smaller than n; at k = n they are the same, and sorting is simpler
```

## অনুশীলনের জন্য Problem

| #   | Problem                          | কঠিনতা | যা অনুশীলন করায়                                   |
| --- | -------------------------------- | ---------- | ------------------------------------------------ |
| 703 | Kth Largest Element in a Stream  | Easy       | কেন size-এর সীমাটাই পুরো pattern             |
| 215 | Kth Largest Element in an Array  | Medium     | `k` size-এর min-heap, তারপর quickselect            |
| 347 | Top K Frequent Elements          | Medium     | আগে গোনা, তারপর heap, আর bucket-sort বিকল্প  |
| 973 | K Closest Points to Origin       | Medium     | Derived key-এর ওপর একটি comparator                     |
| 658 | Find K Closest Elements          | Medium     | এখানে binary search heap-কে হারায়                 |
| 692 | Top K Frequent Words             | Medium     | Comparator-এর ভেতরে টাই ভাঙা                |
| 23  | Merge k Sorted Lists             | Hard       | `k`টি list head-এর একটি heap                          |
| 295 | Find Median from Data Stream     | Hard       | দুটো heap, আর ভারসাম্যের invariant          |

215 দুবার solve করুন — একবার heap দিয়ে, একবার quickselect দিয়ে। তারপর 347 দুবার, heap আর bucket দিয়ে। সৎ
complexity-সহ দুটো solution দিতে পারা — প্রশ্নটা আসলে এটাই যাচাই করে।

## 🔑 মূল শিক্ষা

- `k`-তে সীমিত একটি heap-এর খরচ `O(n log k)` time আর `O(k)` space। Sort করলে লাগে `O(n log n)` আর `O(n)`।
- `k`টি largest-এর জন্য **min**-heap ব্যবহার করুন: root হলো সবচেয়ে দুর্বল রক্ষিত, আর আপনি ঠিক এটারই তুলনা করেন ও বাদ দেন।
- Size-এর সীমাটাই pattern — pop করুন loop-এর ভেতরে, পরে নয়।
- JavaScript-এ built-in heap নেই, তাই array-as-tree layout জেনে রাখুন: child-রা `2i + 1` আর `2i + 2`-এ।
- একবারের query-তে quickselect গড়ে দ্রুততর। Stream শুধু heap-ই সামলাতে পারে।

## Interview-এর প্রশ্ন

**Q: `k`টি largest-এর জন্য min-heap কেন? শুনতে তো উল্টো লাগে।**

কারণ আপনি বারবার যে element-টি পরীক্ষা করেন, সেটা আপনার বর্তমান রক্ষিতদের মধ্যে *সবচেয়ে দুর্বল*। Min-heap সেটাকে
root-এ রাখে। তাই নতুন কারও সাথে তুলনা আর হেরে যাওয়াটিকে বাদ দেওয়া — দুটোতেই পৌঁছাতে `O(1)` আর ঠিক করতে `O(log k)`।
Max-heap-এ root হলো আপনার সেরা element, আর সবচেয়ে ছোট রক্ষিতটি খুঁজতে প্রতি ধাপে `O(k)` খরচ হতো।

**Q: Sort করার তুলনায় আসল সাশ্রয়টা কী?**

Time `O(n log n)` থেকে নেমে `O(n log k)` হয়। এটা কাজে আসে যখন `k` `n`-এর চেয়ে অনেক ছোট — দশ লাখের মধ্যে সবচেয়ে
বড় পাঁচটি। বড় লাভটা space-এ: `O(n)`-এর বদলে `O(k)`। মানে input কখনো memory-তে ধরে রাখতে হয় না, তাই একই code
একটি stream-এও চলে। `k ≈ n` হলে দুটো সমান, আর তখন sort-এর code বেশি পরিষ্কার।

**Q: কখন এর বদলে quickselect ব্যবহার করবেন?**

এমন একটি array-তে একবারের `k`th-largest query-র জন্য, যেটা আগে থেকেই memory-তে আছে আর যার ক্রম বদলালে সমস্যা নেই।
একটি pivot ঘিরে partition করে শুধু এক দিকে recursion চালিয়ে এটা গড়ে `O(n)`। যে খরচগুলো বলতে হবে: শত্রুভাবাপন্ন
input-এ `O(n²)` worst case, যেটা random pivot বাছাই অসম্ভাব্য করে, কিন্তু অসম্ভব করে না। আর এটা input-কে mutate
করে।

**Q: একটি stream-এর median কীভাবে বের করবেন?**

দুটো heap: নিচের অর্ধেকের জন্য একটি max-heap আর ওপরের অর্ধেকের জন্য একটি min-heap, size-এ বড়জোর এক element-এর
পার্থক্য রেখে। প্রতিটি insert এক দিকে যায়, তারপর একটি root অন্য দিকে সরিয়ে ভারসাম্য আনা হয়। তাই median হলো বড়
heap-এর root, অথবা size সমান হলে দুটো root-এর গড়। Insert `O(log n)`, আর median পড়া `O(1)`।

**Q: নিশ্চিত linear time-এ Top K Frequent Elements — কীভাবে?**

Bucket sort। কোনো frequency `n` ছাড়াতে পারে না। তাই `n + 1`টি bucket নিন, প্রতিটি আলাদা value তার count-এর সাথে
মেলে এমন bucket-এ রাখুন। তারপর সবচেয়ে ওপরের bucket থেকে নিচে পড়তে থাকুন, যতক্ষণ না `k`টি value পান। এটা `O(n)`
time আর `O(n)` space, কোনো তুলনা ছাড়াই — এটা কাজ করে কারণ key-এর পরিসর input-এর size দিয়ে সীমিত।

## এরপর কী পড়বেন

- [Chapter ?? — Monotonic Stack](#ch-monotonic-stack) — এক pass-এ "এখন পর্যন্ত largest"-এর উত্তর দেওয়ার অন্য উপায়
- [Chapter ?? — Modified Binary Search](#ch-modified-binary-search) — কেন Find K Closest Elements-এ heap দরকার নেই
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — বাস্তবে `O(n log n)`-এর তুলনায় `O(n log k)` কোথায় দাঁড়ায়
