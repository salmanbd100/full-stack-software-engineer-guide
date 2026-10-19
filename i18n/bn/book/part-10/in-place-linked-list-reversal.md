---
sourceHash: "f5f6908d818f3f3eb84892a485dff5fc7abd50494b2eaee2fcb0991b70069541"
title: "In-Place Linked List Reversal"
translatedAt: "2026-10-19T10:27:55.390Z"
model: "claude-opus-5-5 (Claude Code)"
---

# In-Place Linked List Reversal {#ch-in-place-linked-list-reversal}

> List-এর ওপর দিয়ে হাঁটতে হাঁটতেই তার `next` pointer-গুলো নতুন করে জুড়ুন। Allocate হবে শুধু তিনটি local variable।

**এই অধ্যায়ে:** তিন-pointer-এর loop · তিনটি line-এর ক্রম কেন বদলানো যায় না · dummy head দিয়ে sublist উল্টানো · head insertion variant · যে ভুলে list-এর লেজ হারিয়ে যায়

## 💡 মূল ধারণা

List উল্টানো মানে নতুন list বানানো নয়। মানে list-এর ওপর দিয়ে একবার হাঁটা, আর প্রতিটি
`next` pointer-কে ঘুরিয়ে পেছনের দিকে মুখ করানো। ঝামেলা একটিই: যে pointer আপনি এখনই overwrite করতে যাচ্ছেন,
সেটাই বলে দিচ্ছে এরপর কোথায় যেতে হবে। তাই আগে সেটা সরিয়ে রাখুন।

পুরো pattern চলে তিনটি variable দিয়ে: `prev` (পেছনের ইতিমধ্যে উল্টানো অংশ), `current` (যে node এখন নতুন করে
জোড়া হচ্ছে), আর একটি অস্থায়ী `next` (সামনের এখনো না-উল্টানো অংশ)।

> এই pattern আলাদা প্রশ্ন হিসেবে যত না আসে, তার চেয়ে অনেক বেশি আসে অন্য প্রশ্নের *একটি ধাপ* হিসেবে।
> Palindrome Linked List, Reorder List আর Reverse Nodes in k-Group, তিনটিই list-এর অর্ধেক বা কোনো টুকরো উল্টে
> তারপর বাকি কাজ করে।

## কীভাবে কাজ করে

### তিন-pointer-এর loop

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

`prev` `null` দিয়ে শুরু হয় শুধু initialise করার জন্য নয়। আসল head-কে শেষে
`null`-এর দিকেই point করতে হবে, কারণ সেটাই হতে যাচ্ছে লেজ। `prev`-কে `head` দিয়ে শুরু করলে node নিজের
দিকেই point করে, আর loop অনন্তকাল চলে।

**তিনটি assignment-এর ক্রম বাঁধা:**

| Line                    | ক্রম বদলালে…                                            |
| ----------------------- | --------------------------------------------------------------- |
| `const next = current.next` | এটা বাদ দিলে পরের line-এই list-এর বাকি অংশ হারিয়ে যায়, কারণ ওটার একমাত্র reference আর নেই |
| `current.next = prev`   | এটা `prev = current`-এর পরে করলে node নিজের দিকেই point করে |
| `prev = current`        | নতুন করে জোড়ার আগে এটা করলে `prev` আর `current` একই node হয়ে যায় |

তিনটি line, সঠিক ক্রম একটিই। Interviewer-রা এটা জানেন, আর এজন্যই প্রশ্নটা warm-up হিসেবে এখনো টিকে আছে।

### Sublist উল্টানো

Reverse Linked List II আপনাকে দেয় `left` আর `right`, 1 থেকে গোনা position হিসেবে। দেখতে যতটা সহজ, আসলে ততটা
নয়, দুটি কারণে। `left`-এর **আগের** node-টাকে উল্টানো sublist-এর নতুন head-এর সঙ্গে আবার জুড়তে হয়। আর `left`
1 হতে পারে, তখন তার আগে কোনো node-ই নেই।

Head-এর সামনে একটি dummy node বসালে এই special case পুরোপুরি উধাও হয়ে যায়।

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

এটা তিন-pointer-এর loop নয়, এটা **head insertion**। প্রতি pass-এ
`current`-এর ঠিক পরের node-টা তুলে নিয়ে সরাসরি `prev`-এর পরে বসানো হয়। `[1,2,3,4,5]`-এ `left = 2, right = 4` হলে:

```text
1 → 2 → 3 → 4 → 5     prev = 1, current = 2
1 → 3 → 2 → 4 → 5     lifted 3
1 → 4 → 3 → 2 → 5     lifted 4
```

Range-এর বাইরের node-গুলোতে হাতই পড়ে না, আর `current` নিজে থেকেই sublist-এর লেজ হয়ে যায়।
`dummy.next` return করার কারণেই `left = 1`-এ কাজ হয়, কারণ আসল `head` তখন পেছনে সরে গেছে।

### কোন variant লিখবেন

| প্রশ্নের ধাঁচ                          | কী ব্যবহার করবেন                          | কেন                                              |
| --------------------------------------- | ---------------------------- | ------------------------------------------------ |
| পুরো list উল্টানো                  | তিন-pointer-এর loop           | সবচেয়ে ছোট সঠিক code                            |
| `left…right` position উল্টানো          | Dummy + head insertion       | এক pass, আর `left = 1`-এর জন্য কোনো special case লাগে না   |
| `k`-টি করে group-এ উল্টানো                | আগে সামনে `k` গুনুন, তারপর block উল্টান, তারপর recursion বা loop | নতুন করে জোড়ার আগেই গোনা শেষ করতে হবে |
| পাশাপাশি জোড়া swap করা                     | Dummy + head insertion, `k = 2` | সাধারণ case-টাই এখানে ছোট হয়ে আসে              |
| List-কে তার উল্টো রূপের সঙ্গে মেলানো      | শুধু দ্বিতীয় অর্ধেক উল্টান  | পুরো list উল্টালে আসলটাই হারিয়ে যায়      |

⚠️ Recursion দিয়ে তিন line-এই list উল্টানো যায়, কিন্তু তাতে `O(n)` stack space লাগে। Constraint যদি বলে
`O(1)` space, তাহলে recursive উত্তর তা পূরণ করে না। Interviewer বলার আগেই, লেখার আগে নিজে এটা বলুন।

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

**Sublist উল্টাতে গিয়ে dummy node-এর কথা ভুলে যাওয়া:**

```typescript
// ❌ walking to prev = head and reversing from head.next — breaks when left === 1
// ✅ const dummy = { val: 0, next: head }; and return dummy.next
```

**`k`-টি node বাকি আছে কিনা না দেখেই group উল্টানো:**

```typescript
// ❌ reverse blindly — LC 25 requires a trailing group of fewer than k to stay in order
// ✅ walk k ahead first; if you hit null, return the block untouched
```

**এমন list বদলে ফেলা, যেটা caller-এর এখনো দরকার:**

```typescript
// ❌ in-place reversal is destructive; the original order is unrecoverable without reversing back
// ✅ if the caller keeps a reference to the old head, reverse a copy or restore afterwards
```

## অনুশীলনের জন্য Problem

| #   | Problem                     | কঠিনতা | কী অনুশীলন হয়                                    |
| --- | --------------------------- | ---------- | ------------------------------------------------- |
| 206 | Reverse Linked List         | Easy       | তিন-pointer-এর loop, আর `prev` return করা      |
| 234 | Palindrome Linked List      | Easy       | List-এর অর্ধেক উল্টানো, বাকি অর্ধেক অক্ষত রাখা   |
| 92  | Reverse Linked List II      | Medium     | Dummy node আর head insertion                 |
| 24  | Swap Nodes in Pairs         | Medium     | একই insertion, `k = 2` দিয়ে                   |
| 61  | Rotate List                 | Medium     | নতুন লেজ খুঁজে বের করা, উল্টানো একদমই নয়        |
| 143 | Reorder List                | Medium     | মাঝখান, উল্টানো, তারপর দুটি list পালা করে জোড়া      |
| 2   | Add Two Numbers             | Medium     | List কেন প্রায়ই আগে থেকেই উল্টো করে রাখা থাকে       |
| 25  | Reverse Nodes in k-Group    | Hard       | নতুন করে জোড়ার আগে গোনা, আর অসম্পূর্ণ লেজ    |

Line-এর ক্রম হাতে না আসা পর্যন্ত 206 মুখস্থ থেকে লিখুন, তারপর সোজা 92-এ যান। Table-এর বাকি সবকিছু এই দুটির
একটি, শুধু সঙ্গে কিছু হিসাব-নিকাশ যোগ হয়েছে।

## 🔑 মূল শিক্ষা

- তিনটি variable — `prev`, `current`, আর সরিয়ে রাখা `next` — এক pass-এ, `O(1)` space-এ list উল্টে দেয়।
- সরিয়ে রাখা, নতুন করে জোড়া, এগোনো: এই ক্রম রুচির ব্যাপার নয়। বাকি দুটি ক্রমে data হারায়।
- `prev` `null` দিয়ে শুরু হয়, কারণ পুরনো head-ই হয় নতুন লেজ। আর return করবেন `prev`-কেই।
- Head-এর সামনে একটি dummy node বসালে "range যদি position 1 থেকে শুরু হয়" ধরনের সব special case উধাও।
- Recursive version ছোট, কিন্তু `O(n)` stack লাগে। তাই স্পষ্ট `O(1)` space-এর constraint থাকলে এটা চলে না।

## Interview-এর প্রশ্ন

**Q: তিনটি assignment কেন ঠিক ওই ক্রমেই হতে হবে, ধাপে ধাপে বুঝিয়ে বলুন।**

না-উল্টানো বাকি অংশের একমাত্র reference হলো `current.next`, তাই overwrite করার আগে সেটা copy করে রাখতে হয়।
নতুন করে জোড়ার সময় `prev`-কে আগের node-এর দিকেই point করে থাকতে হয়। আগে ওটাকে এগিয়ে দিলে
`current.next = prev` node-কে নিজের দিকেই point করাবে। ফলে valid ক্রম থাকে ঠিক একটিই: সরিয়ে রাখা, নতুন করে
জোড়া, এগোনো।

**Q: `head` না দিয়ে `prev` return করবেন কেন?**

Loop থামে যখন `current` হয় `null`, মানে শেষের এক ধাপ পরে। তাই `prev` হলো শেষ যে আসল node দেখা হয়েছে, আর
উল্টানোর পর সেটাই list-এর সামনে। `head` তখনও আসল প্রথম node-কেই ধরে আছে, যেটা এখন লেজ, আর তার next হলো `null`।

**Q: Reverse Linked List II-তে dummy node আসলে কী এনে দেয়?**

এটা নিশ্চিত করে যে উল্টানো অংশের আগে সবসময় কোনো node আছে। এটা না থাকলে `left = 1` হলে জোড়ার মতো কোনো node
থাকে না। তখন আলাদা branch লাগে, যেটা update করে `head`-কে, `prev.next`-কে নয়। Dummy থাকলে দুই case-ই একই
code, আর head বদলেছে কিনা না জেনেই `dummy.next` return করা যায়।

**Q: কখন recursive version পছন্দ করবেন?**

যখন list ছোট আর তার আকারের সীমা জানা, আর memory-র চেয়ে পড়তে সহজ হওয়াটা বেশি জরুরি। অথবা যখন problem-টা
স্বভাবতই recursive, যেমন k-group-এ উল্টানো, যেখানে প্রতিটি group-এর recursion পরের group-এর head ফেরত দেয়।
Interview-এর whiteboard-এ এটাকে সুন্দর বিকল্প হিসেবে বলুন, তারপর `O(n)` stack-এর খরচটা উল্লেখ করুন, আর জিজ্ঞেস
করুন সেটা চলবে কিনা।

**Q: শেষের অসম্পূর্ণ group না ভেঙে `k`-টি করে group-এ কীভাবে উল্টাবেন?**

কোনো block উল্টানোর আগে `k`-টি node সামনে হেঁটে দেখুন। তার আগেই `null` এলে বুঝবেন `k`-এর কম বাকি আছে, আর
block-টা যেমন আছে তেমনই ফেরত যায়। এই যাচাইয়ের পরেই শুধু ঠিক
`k`-টি node-এর ওপর তিন-pointer-এর loop চালান। তারপর আগের block-এর লেজ নতুন block-এর head-এর সঙ্গে জুড়ুন। আর
পরের কাজ শুরু করুন সেই node থেকে, যেখান থেকে block-টা শুরু হয়েছিল, কারণ সেটাই এখন তার লেজ।

## এরপর কী পড়বেন

- [Chapter ?? — Fast ও Slow Pointer](#ch-fast-and-slow-pointers) — Palindrome Linked List যে মাঝখান থেকে উল্টায়, সেটা কীভাবে খুঁজবেন
- [Chapter ?? — Two Pointers](#ch-two-pointers) — structure যখন index দিয়ে ধরা যায় এমন array, তখন একই ধারণা
- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — linked structure-এ recursion কোথায় সত্যিই তার stack-এর দাম তোলে
