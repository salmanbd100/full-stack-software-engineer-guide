---
sourceHash: "4a78790bc76c342cbfa54bc440ba663ba7a730bf77b7a9caccd67e6e086bc139"
title: "Top K Element"
translatedAt: "2026-10-19T10:26:02.488Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Top K Element {#ch-top-k-elements}

> Heap-এ শুধু `k`টি candidate রাখুন। তাতে খরচ `O(n log n)` থেকে নেমে আসে `O(n log k)`-এ, আর streaming input-ও সামলানো যায়।

**এই অধ্যায়ে:** `k`টি **largest** পেতে কেন **min**-heap লাগে · TypeScript-এ heap, কারণ language-টায় কোনো heap নেই · frequency ধরে top-k · কখন quickselect বা bucket sort heap-কে হারায় · streaming-এর ক্ষেত্র, যেটা শুধু heap সামলাতে পারে

## 💡 মূল ধারণা

"দশ লাখ সংখ্যার মধ্যে সবচেয়ে বড় 5টি" চাইলে সহজ উত্তর হলো sort করে পাঁচটি তুলে নেওয়া। কিন্তু তাতে মাত্র পাঁচটি value
পেতে `O(n log n)` কাজ হয়, আর পুরো input একসঙ্গে memory-তে রাখতে হয়।

`k` size-এর heap এর চেয়ে ভালো করে। এ পর্যন্ত দেখা সেরা `k`টি element ধরে রাখুন। নতুন element এলে সেটাকে মেলান ওই `k`টির
মধ্যে **সবচেয়ে দুর্বল**-টার সঙ্গে, আর নতুনটা জিতলে জায়গা বদলে দিন। বাকি input-কে কখনো সাজাতেই হয় না।

উল্টো মনে হয় heap-এর দিকটা। `k`টি **largest**-এর জন্য লাগে **min**-heap। রাখা `k`টির মধ্যে সবচেয়ে ছোটটা বসে থাকে root-এ।
নতুন element-কে ঠিক এটাকেই হারাতে হয়, আর বের করে দিতেও হয় ঠিক এটাকেই। Max-heap হলে root-এ বসত আপনার সেরা element,
অথচ সেখানে আপনার দরকার সবচেয়ে দুর্বলটা।

> **নিয়ম:** `k`টি largest → min-heap। `k`টি smallest → max-heap। Heap-এর root-এ সবসময় সেই candidate, যার বাদ পড়ার
> ঝুঁকি সবচেয়ে বেশি।

## কীভাবে কাজ করে

### Heap, কারণ TypeScript-এ নেই

JavaScript-এ কোনো priority queue আসে না। Interviewer-রা সাধারণত ধরে নিতে দেন যে priority queue আছে। তবে সেটা মুখে বলে নিন,
চুপচাপ এমন API ব্যবহার করবেন না যার অস্তিত্বই নেই। Comparator দিয়ে চলা binary heap লিখতে মোটামুটি পঁচিশ line লাগে:

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

Array-কে tree হিসেবে ব্যবহারের কৌশলটা জেনে রাখুন: index `i` হলে children থাকে `2i + 1` আর `2i + 2`-এ, আর parent থাকে
`(i - 1) >> 1`-এ। কোনো node object লাগে না, pointer-ও না।

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

Size-এর এই সীমা থেকে দুটি গুণ আপনাআপনি আসে। প্রথমত, root সংজ্ঞা অনুযায়ীই `k`-তম largest, কারণ তার ওপরে আছে ঠিক
`k − 1`টি element। দ্বিতীয়ত, memory লাগে `O(k)`, `O(n)` নয়। ফলে input কখনো পুরোটা ধরে রাখতে হয় না, আর এই pattern-এর
অস্তিত্বের কারণই এটা।

### Frequency ধরে top `k`

দুটি ধাপ: আগে গুনুন, তারপর গোনা সংখ্যার ওপর একই heap চালান।

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

Complexity সৎভাবে বলুন। Map যেভাবেই বানান, তাতে `O(m)` space লাগবেই। তাই heap-এর `O(k)` সাশ্রয় খাটে শুধু দ্বিতীয়
ধাপে। `O(n)` গোনা এড়ানোর কোনো উপায় নেই।

### কখন heap সবচেয়ে দ্রুত উত্তর নয়

| পরিস্থিতি                                        | এর চেয়ে ভালো        | খরচ                              |
| ------------------------------------------------ | ------------------ | --------------------------------- |
| একবারের `k`-তম largest, পুরো array memory-তে      | Quickselect        | গড়ে `O(n)`, worst-এ `O(n²)`      |
| Frequency ধরে top `k`, count-এর সীমা `n`       | Bucket sort        | নিশ্চিতভাবে `O(n)`                  |
| Input আসে stream হিসেবে, বা `n` memory-তে ধরে না    | `k` size-এর heap   | `O(n log k)`, `O(k)` space         |
| `k` প্রায় `n`-এর সমান                               | সোজা sort          | `O(n log n)`, আর পড়তেও সহজ   |
| `k = 1`                                           | একটি scan      | `O(n)`, `O(1)`                     |
| Data বদলাতে থাকে, আর বারবার query হয়                  | Heap, সবসময় চালু রাখা    | প্রতি update-এ `O(log k)`              |

Top K Frequent Elements-এ interviewer-রা আসলে bucket sort-এর উত্তরটাই শুনতে চান। কোনো frequency কখনো `n` ছাড়াতে
পারে না। তাই `n + 1`টি bucket-এর array বানিয়ে count দিয়ে index করুন, আর ওপর থেকে পড়ুন:

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

⚠️ Quickselect-এর `O(n)` শুধু গড়, নিশ্চয়তা নয়। ইচ্ছে করে বানানো খারাপ input-এ এর worst case `O(n²)`। তার ওপর
এটা array-র ক্রমও বদলে দেয়। Optimal সমাধান হিসেবে quickselect দেওয়ার আগে দুটি খরচই বলে নিন।

## কখন ব্যবহার করবেন

| প্রশ্নে যে ইঙ্গিত থাকে                                | কী ব্যবহার করবেন            | কেন                                       |
| ----------------------------------------------------- | -------------------- | ----------------------------------------- |
| "`k` largest", "`k` most frequent", "`k` closest"      | `k` size-এর heap     | এটাই এই pattern-এর মূল ক্ষেত্র                  |
| "…stream থেকে" বা "element আসার সঙ্গে সঙ্গে"              | Heap, সবসময় চালু রাখা      | সীমাহীন input আর কিছু সামলাতে পারে না       |
| "Stream-এর median"                                  | **দুটি** heap        | নিচের অর্ধেকের জন্য max-heap, ওপরের অর্ধেকের জন্য min |
| "`k`টি sorted list merge করুন"                              | `k`টি head-এর heap    | পরের output সবসময় ওই `k`টির একটি        |
| `k`-তম **smallest** element                        | `k` size-এর max-heap | নিয়মটা উল্টে নিন                            |
| পুরো sorted ক্রম এমনিতেই লাগবে                | Sort                 | Heap-এ কোনো সাশ্রয় নেই                     |

Find Median from Data Stream-এর রূপটা অনুশীলন করার মতো। কারণ দুই heap-এর উত্তর সহজে মাথায় আসে না, অথচ প্রশ্নটা
প্রায়ই আসে। ছোট অর্ধেক রাখুন max-heap-এ, বড় অর্ধেক min-heap-এ। দুটির size-এর তফাত যেন বড়জোর এক থাকে, সেভাবে
rebalance করুন। তাহলে median হলো একটি root, বা দুটি root-ই।

## সাধারণ ভুল

**`k`টি largest-এর জন্য max-heap ব্যবহার করা:**

```typescript
// ❌ max-heap, then pop k times — O(n) to build plus O(k log n), and O(n) space
// ✅ min-heap capped at k — O(n log k) and O(k) space
```

দুটিই সঠিক। কিন্তু input stream হলে কাজ করে শুধু একটি।

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

**Input-এর চেয়ে বড় `k` সামলাতে ভুলে যাওয়া:**

```typescript
// ❌ heap.peek()! after fewer than k pushes returns the minimum, silently wrong
// ✅ clamp k, or return early — check the constraints for whether it is guaranteed
```

**`k ≈ n` হলেও দাবি করা যে `O(n log k)` জিতছে `O(n log n)`-এর বিরুদ্ধে:**

```typescript
// ❌ "the heap is always faster"
// ✅ it is faster when k is much smaller than n; at k = n they are the same, and sorting is simpler
```

## অনুশীলনের জন্য Problem

| #   | Problem                          | কঠিনতা | যা অনুশীলন করায়                                   |
| --- | -------------------------------- | ---------- | ------------------------------------------------ |
| 703 | Kth Largest Element in a Stream  | Easy       | Size-এর সীমাই কেন পুরো pattern             |
| 215 | Kth Largest Element in an Array  | Medium     | `k` size-এর min-heap, তারপর quickselect            |
| 347 | Top K Frequent Elements          | Medium     | আগে গোনা, তারপর heap, আর bucket-sort বিকল্প  |
| 973 | K Closest Points to Origin       | Medium     | Derived key-এর ওপর comparator                     |
| 658 | Find K Closest Elements          | Medium     | এখানে binary search heap-কে হারায়                 |
| 692 | Top K Frequent Words             | Medium     | Comparator-এর ভেতরে tie ভাঙা                |
| 23  | Merge k Sorted Lists             | Hard       | `k`টি list head-এর heap                          |
| 295 | Find Median from Data Stream     | Hard       | দুটি heap, আর rebalancing invariant          |

215 দুবার করুন, একবার heap দিয়ে, একবার quickselect দিয়ে। তারপর 347 দুবার, heap আর bucket দিয়ে। সৎ complexity-সহ দুটি
সমাধান দিতে পারা, প্রশ্নটা আসলে এটাই যাচাই করে।

## 🔑 মূল শিক্ষা

- `k`-তে আটকে রাখা heap-এ লাগে `O(n log k)` time আর `O(k)` space, আর sort করলে লাগে `O(n log n)` আর `O(n)`।
- `k`টি largest-এর জন্য **min**-heap ব্যবহার করুন: root-এ থাকে সবচেয়ে দুর্বল element, আর তুলনা আর বাদ দেওয়া হয় সেটাকেই।
- Size-এর সীমাই এই pattern। Pop করুন loop-এর ভেতরে, loop শেষ হওয়ার পরে নয়।
- JavaScript-এ built-in heap নেই, তাই array-কে tree হিসেবে সাজানোর layout জেনে রাখুন: children থাকে `2i + 1` আর `2i + 2`-এ।
- একবারের query-তে quickselect গড়ে দ্রুত। কিন্তু stream সামলাতে পারে শুধু heap।

## Interview-এর প্রশ্ন

**Q: `k`টি largest-এর জন্য min-heap কেন? শুনতে তো উল্টো লাগে।**

কারণ বারবার যে element-টা যাচাই করতে হয়, সেটা এখনকার রাখা element-গুলোর মধ্যে *সবচেয়ে দুর্বল*। Min-heap সেটাকেই
root-এ রাখে। তাই নতুন element-এর সঙ্গে তুলনা আর হেরে যাওয়াটাকে বাদ দেওয়া, দুটিতেই পৌঁছাতে লাগে `O(1)`, আর heap
ঠিক করতে লাগে `O(log k)`। Max-heap হলে root-এ থাকে আপনার সেরা element, আর সবচেয়ে ছোটটা খুঁজতে প্রতি ধাপে লাগত `O(k)`।

**Q: Sort করার তুলনায় আসল সাশ্রয়টা কোথায়?**

Time নামে `O(n log n)` থেকে `O(n log k)`-এ। `k` যখন `n`-এর চেয়ে অনেক ছোট, যেমন দশ লাখের মধ্যে সবচেয়ে বড় পাঁচটি, তখন
এটা গুরুত্বপূর্ণ। তবে বড় লাভ space-এ: `O(n)`-এর বদলে `O(k)`। মানে input কখনো memory-তে ধরে রাখতে হয় না, তাই একই code
stream-এর ওপরও চলে। `k ≈ n` হলে দুটি সমান, আর তখন sort-এর code পড়তে বেশি পরিষ্কার।

**Q: কখন বরং quickselect ব্যবহার করবেন?**

যখন `k`-তম largest একবারই চাই, array আগে থেকেই memory-তে আছে, আর তার ক্রম বদলালেও ক্ষতি নেই। একটি pivot ঘিরে
partition করে শুধু এক দিকে recursion চালায় বলে গড়ে লাগে `O(n)`। যে খরচগুলো বলে নিতে হবে: ইচ্ছে করে বানানো খারাপ
input-এ worst case `O(n²)`, যেটা random pivot বাছলে কম সম্ভাব্য হয় কিন্তু অসম্ভব হয় না। আর এটা input-কেই বদলে দেয়।

**Q: Stream-এর median কীভাবে বের করবেন?**

দুটি heap দিয়ে: নিচের অর্ধেকের জন্য max-heap, ওপরের অর্ধেকের জন্য min-heap, আর দুটির size-এর তফাত বড়জোর এক।
প্রতিটি insert যায় এক দিকে, তারপর একটি root অন্য দিকে সরিয়ে rebalance হয়। ফলে median হলো বড় heap-টার root, আর
দুটির size সমান হলে দুই root-এর গড়। Insert-এ লাগে `O(log n)`, median পড়তে `O(1)`।

**Q: Top K Frequent Elements নিশ্চিত linear time-এ কীভাবে করবেন?**

Bucket sort দিয়ে। কোনো frequency `n` ছাড়াতে পারে না। তাই `n + 1`টি bucket বানান, প্রতিটি আলাদা value রাখুন তার
count-এর bucket-এ, তারপর সবচেয়ে ওপরের bucket থেকে নিচে পড়তে থাকুন, যতক্ষণ না `k`টি value হাতে আসে। এতে লাগে `O(n)`
time আর `O(n)` space, কোনো তুলনাই লাগে না। এটা কাজ করে কারণ key-এর পরিসর input-এর size দিয়েই বাঁধা।

## এরপর কী পড়বেন

- [Chapter ?? — Monotonic Stack](#ch-monotonic-stack) — এক pass-এ "এ পর্যন্ত সবচেয়ে বড়" বের করার অন্য উপায়
- [Chapter ?? — Modified Binary Search](#ch-modified-binary-search) — Find K Closest Elements-এ কেন heap চাই না
- [Chapter ?? — Time ও Space Complexity](#ch-time-and-space-complexity) — বাস্তবে `O(n log k)` আর `O(n log n)`-এর তফাত কতটা
