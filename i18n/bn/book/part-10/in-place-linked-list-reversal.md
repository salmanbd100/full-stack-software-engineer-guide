---
sourceHash: "f5f6908d818f3f3eb84892a485dff5fc7abd50494b2eaee2fcb0991b70069541"
title: "In-Place Linked List Reversal"
translatedAt: "2026-10-13T03:11:24.952Z"
model: "claude-opus-5-5 (Claude Code)"
---

# In-Place Linked List Reversal {#ch-in-place-linked-list-reversal}

> List-এর ওপর দিয়ে হাঁটতে হাঁটতে তার `next` pointer-গুলো নতুন করে জুড়ুন, তিনটি local variable ছাড়া আর কিছু allocate না করে।

**এই অধ্যায়ে:** three-pointer loop · তিনটি line-এর ক্রম কেন বদলানো যায় না · dummy head দিয়ে একটি sublist reverse করা · head-insertion variant · যে ভুলগুলোয় tail হারিয়ে যায়

## 💡 মূল ধারণা

একটি list reverse করা মানে নতুন একটি list বানানো নয়। এর মানে list-এর ওপর দিয়ে একবার হাঁটা, আর প্রতিটি `next`
pointer-কে ঘুরিয়ে পেছনের দিকে মুখ করানো। একমাত্র ঝামেলা হলো, আপনি যে pointer overwrite করতে যাচ্ছেন, সেটাই
আপনাকে বলছে এরপর কোথায় যেতে হবে — তাই আগে সেটা save করুন।

তিনটি variable পুরো pattern বহন করে: `prev` (আপনার পেছনের reverse হয়ে যাওয়া অংশ), `current` (যে node নতুন করে
জোড়া হচ্ছে), আর একটি অস্থায়ী `next` (সামনের এখনো reverse না হওয়া অংশ)।

> এই pattern আলাদা প্রশ্ন হিসেবে যতটা আসে, তার চেয়ে অনেক বেশি আসে একটি *উপ-ধাপ* হিসেবে। Palindrome Linked
> List, Reorder List আর Reverse Nodes in k-Group — সবগুলোই একটি অর্ধেক বা একটি খণ্ড reverse করে, তারপর এগিয়ে যায়।

## কীভাবে কাজ করে

### Three-pointer loop

```typescript
interface ListNode {
  val: number;
  next: ListNode | null;
}

function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null;   // nothing is reversed yet; the old head becomes the new tail
  let current: ListNode | null = head;

  while (current !== null) {
    const next: ListNode | null = current.next;   // 1. save the way forward
    current.next = prev;                          // 2. turn this node around
    prev = current;                               // 3. advance both markers
    current = next;
  }
  return prev;   // current is null, so prev is the last node visited — the new head
}
// Time: O(n), Space: O(1)
```

`prev` `null` দিয়ে শুরু হয় শুধু initialisation-এর জন্য নয়। মূল head-কে শেষে `null`-এর দিকে point করতেই হবে,
কারণ সেটা tail হতে যাচ্ছে। `prev`-কে `head` দিয়ে শুরু করলে একটি node নিজের দিকেই point করে, আর loop অসীম হয়ে
যায়।

**তিনটি assignment-এর ক্রম স্থির:**

| Line                    | এটা আগে সরালে…                                            |
| ----------------------- | --------------------------------------------------------------- |
| `const next = current.next` | এটা বাদ দিলে পরের line-এই list-এর বাকি অংশ হারিয়ে যায় — এর একমাত্র reference আর নেই |
| `current.next = prev`   | `prev = current`-এর পরে করলে node নিজের দিকেই point করে |
| `prev = current`        | Rewire-এর আগে করলে `prev` আর `current` একই node হয়ে যায় |

তিনটি line, একটিই সঠিক ক্রম। Interviewer-রা এটা জানেন, আর এ কারণেই প্রশ্নটি warm-up হিসেবে টিকে আছে।

### একটি sublist reverse করা

Reverse Linked List II আপনাকে `left` আর `right` দেয় 1-indexed position হিসেবে। দুটি জিনিস একে যতটা দেখায় তার চেয়ে
কঠিন করে। `left`-এর **আগের** node-কে নতুন sublist head-এর সাথে আবার জুড়তে হয়। আর `left` 1 হতে পারে, সেক্ষেত্রে
এর আগে কোনো node-ই নেই।

Head-এর সামনে একটি dummy node রাখলে special case-টা পুরোপুরি চলে যায়।

```typescript
function reverseBetween(
  head: ListNode | null,
  left: number,
  right: number,
): ListNode | null {
  if (head === null || left === right) return head;

  const dummy: ListNode = { val: 0, next: head };   // so position 1 has a predecessor

  let prev: ListNode = dummy;
  for (let i = 0; i < left - 1; i++) prev = prev.next!;   // land just before `left`

  // `current` stays put and sinks through the sublist as nodes are lifted out in front of it
  const current: ListNode = prev.next!;

  for (let i = 0; i < right - left; i++) {
    const moved: ListNode = current.next!;
    current.next = moved.next;      // 1. unlink the node after current
    moved.next = prev.next;         // 2. point it at the current sublist head
    prev.next = moved;              // 3. make it the new sublist head
  }

  return dummy.next;   // not `head` — head may no longer be the first node
}
// Time: O(n), Space: O(1)
```

এটা **head insertion**, three-pointer loop নয়। প্রতিটি pass `current`-এর পরে বসা node-টিকে তুলে নেয়, আর সরাসরি
`prev`-এর পরে আবার বসায়। `left = 2, right = 4` সহ `[1,2,3,4,5]`-এ:

```text
1 → 2 → 3 → 4 → 5     prev = 1, current = 2
1 → 3 → 2 → 4 → 5     lifted 3
1 → 4 → 3 → 2 → 5     lifted 4
```

Range-এর বাইরের node-গুলো কখনো ছোঁয়া হয় না, আর `current` নিজে থেকেই sublist-এর tail হয়ে যায়। `dummy.next` return
করাই `left = 1`-কে কাজ করায় — মূল `head` পেছনে সরে গেছে।

### কোন variant লিখবেন

| প্রশ্নের গড়ন                          | ব্যবহার                          | কেন                                              |
| --------------------------------------- | ---------------------------- | ------------------------------------------------ |
| পুরো list reverse করুন                  | Three-pointer loop           | সবচেয়ে ছোট সঠিক code                            |
| `left…right` position reverse করুন          | Dummy + head insertion       | একটি pass, আর `left = 1`-এর কোনো special case লাগে না   |
| `k`-টির group-এ reverse করুন                | সামনে `k`-টি গুনুন, তারপর block reverse করুন, তারপর recurse বা loop | Rewire-এর আগেই গোনা শেষ করতে হবে |
| পাশাপাশি pair swap করুন                     | Dummy + head insertion, `k = 2` | সাধারণ ক্ষেত্রটাই এখানে নেমে আসে              |
| একটি list-কে তার reverse-এর সাথে তুলনা করুন      | শুধু দ্বিতীয় অর্ধেক reverse করুন  | পুরো list reverse করলে মূলটা হারিয়ে যায়      |

⚠️ Recursion তিন line-এ একটি list reverse করে, কিন্তু খরচ `O(n)` stack space। Constraint যদি `O(1)` space বলে,
recursive উত্তর তা পূরণ করে না — কেউ বলে দেওয়ার আগে, লেখার আগেই সেটা বলুন।

## সাধারণ ভুল

**List-এর বাকি অংশ হারিয়ে ফেলা:**

```typescript
// ❌ current.next = prev;          // the only pointer to the remainder is now gone
//    const next = current.next;   // this reads prev, not the next node
// ✅ save current.next first
```

**`prev`-এর বদলে `head` return করা:**

```typescript
// ❌ return head;   // head is the tail now, so the caller gets a one-node list
// ✅ return prev;
```

**`prev`-কে `head` দিয়ে শুরু করা:**

```typescript
// ❌ let prev = head;    // the first node ends up pointing at itself — infinite loop on traversal
// ✅ let prev = null;
```

**Sublist reverse করার সময় dummy node ভুলে যাওয়া:**

```typescript
// ❌ walking to prev = head and reversing from head.next — breaks when left === 1
// ✅ const dummy = { val: 0, next: head }; and return dummy.next
```

**`k`-টি node বাকি আছে কিনা না দেখেই একটি group reverse করা:**

```typescript
// ❌ reverse blindly — LC 25 requires a trailing group of fewer than k to stay in order
// ✅ walk k ahead first; if you hit null, return the block untouched
```

**Caller-এর এখনো দরকার এমন একটি list mutate করা:**

```typescript
// ❌ in-place reversal is destructive; the original order is unrecoverable without reversing back
// ✅ if the caller keeps a reference to the old head, reverse a copy or restore afterwards
```

## অনুশীলনের জন্য Problem

| #   | Problem                     | Difficulty | যা অনুশীলন করায়                                    |
| --- | --------------------------- | ---------- | ------------------------------------------------- |
| 206 | Reverse Linked List         | Easy       | Three-pointer loop, আর `prev` return করা      |
| 234 | Palindrome Linked List      | Easy       | List-এর অর্ধেক reverse করা, বাকি অর্ধেক অক্ষত রাখা   |
| 92  | Reverse Linked List II      | Medium     | Dummy node আর head insertion                 |
| 24  | Swap Nodes in Pairs         | Medium     | `k = 2` দিয়ে একই insertion                   |
| 61  | Rotate List                 | Medium     | নতুন tail খোঁজা, কোনো reverse ছাড়াই        |
| 143 | Reorder List                | Medium     | মাঝখান, reverse, তারপর দুটি list পালাক্রমে জোড়া      |
| 2   | Add Two Numbers             | Medium     | List প্রায়ই কেন আগে থেকেই reverse করে রাখা থাকে       |
| 25  | Reverse Nodes in k-Group    | Hard       | Rewire-এর আগে গোনা, আর অসম্পূর্ণ tail    |

Line-এর ক্রম স্বয়ংক্রিয় না হওয়া পর্যন্ত স্মৃতি থেকে 206 লিখুন, তারপর সোজা 92-এ যান। Table-এর বাকি সবকিছুই ওই
দুটির একটি, সাথে কিছু হিসাব-নিকাশ যোগ করা।

## 🔑 মূল শিক্ষা

- তিনটি variable — `prev`, `current` আর save করা একটি `next` — একটি pass-এ আর `O(1)` space-এ list reverse করে।
- Save-rewire-advance ক্রম রুচির ব্যাপার নয়; তিনটির মধ্যে দুটি বিন্যাসেই data হারায়।
- `prev` `null` দিয়ে শুরু হয় কারণ পুরোনো head নতুন tail হয়, আর return করেন `prev`।
- Head-এর সামনে একটি dummy node "range যদি position 1-এ শুরু হয়"-ধরনের সব special case সরিয়ে দেয়।
- Recursive version ছোট, কিন্তু খরচ `O(n)` stack, তাই স্পষ্ট `O(1)` space constraint-এ এটা ব্যর্থ।

## Interview-এর প্রশ্ন

**Q: তিনটি assignment কেন ঠিক ওই ক্রমেই হতে হবে, ধাপে ধাপে বুঝিয়ে বলুন।**

`current.next` হলো reverse না হওয়া বাকি অংশের একমাত্র reference, তাই overwrite করার আগে এটা copy করতে হবে।
Rewire চলার সময় `prev`-কে আগের node-এর দিকেই point করে থাকতে হবে, তাই আগে এটা এগিয়ে দিলে
`current.next = prev` একটি self-reference হয়ে যাবে। তাহলে বৈধ ক্রম থাকে ঠিক একটিই: save, rewire, advance।

**Q: `head` নয়, `prev` কেন return করবেন?**

Loop বের হয় যখন `current` `null`, অর্থাৎ শেষ প্রান্তের এক ধাপ পরে। তাই `prev` হলো visit করা শেষ আসল node — আর
reverse-এর পর সেই node-টিই list-এর সামনে। `head` তখনও মূল প্রথম node-কে বোঝায়, যা এখন `null` next সহ tail।

**Q: Reverse Linked List II-তে dummy node আসলে কী দেয়?**

এটা নিশ্চিত করে যে reverse হওয়া অংশের একটি পূর্বসূরি আছে। এটা না থাকলে `left = 1`-এর ক্ষেত্রে আবার জোড়ার মতো
কোনো node থাকে না, তাই আপনার একটি আলাদা branch লাগে, যা `prev.next`-এর বদলে `head` update করে। Dummy দুটি
ক্ষেত্রকেই একই code বানায়, আর head বদলেছে কিনা না জেনেই `dummy.next` return করতে দেয়।

**Q: কখন আপনি recursive version পছন্দ করবেন?**

যখন list ছোট আর সীমাবদ্ধ, আর memory-র চেয়ে পড়ার সুবিধা বেশি গুরুত্বপূর্ণ — অথবা যখন problem স্বভাবতই recursive,
যেমন k-group-এ reverse করা, যেখানে প্রতিটি group-এর recursion পরের group-এর head return করে। Interview-এর
whiteboard-এ এটাকে সুন্দর বিকল্প হিসেবে উল্লেখ করুন, তারপর `O(n)` stack-এর খরচটা বলুন আর জিজ্ঞেস করুন সেটা
গ্রহণযোগ্য কিনা।

**Q: শেষের অসম্পূর্ণ group না ভেঙে কীভাবে `k`-টির group-এ reverse করবেন?**

একটি block reverse করার আগে `k`-টি node সামনে হাঁটুন। আগেই `null`-এ পৌঁছালে `k`-এর কম বাকি আছে, আর block-টি
অপরিবর্তিত return হয়। শুধু ওই যাচাইয়ের পরেই ঠিক `k`-টি node-এর ওপর three-pointer loop চালান, আগের block-এর tail-কে
নতুন block-এর head-এর সাথে জুড়ুন, আর যে node থেকে block শুরু হয়েছিল সেখান থেকে চালিয়ে যান — সেটাই এখন তার
tail।

## এরপর কী পড়বেন

- [Chapter ?? — Fast ও Slow Pointer](#ch-fast-and-slow-pointers) — Palindrome Linked List যে মাঝখান থেকে reverse করে, সেটা কীভাবে খুঁজবেন
- [Chapter ?? — Two Pointers](#ch-two-pointers) — structure যখন index করা যায় এমন array, তখন একই ধারণা
- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — linked structure-এ recursion কোথায় সত্যিই তার stack-এর দাম পায়
