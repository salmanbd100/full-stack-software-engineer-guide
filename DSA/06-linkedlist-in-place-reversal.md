---
title: In-Place Linked List Reversal
part: 10
chapter: 0
slug: in-place-linked-list-reversal
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-30
tags: [dsa, linkedlist, reversal, pointers]
in_book: true
---

# In-Place Linked List Reversal {#ch-in-place-linked-list-reversal}

> Rewire a list's `next` pointers as you walk it, allocating nothing but three local variables.

**In this chapter:** the three-pointer loop · why the order of the three lines cannot change · reversing a sublist with a dummy head · the head-insertion variant · the mistakes that lose the tail

## 💡 The Core Idea

Reversing a list does not mean building a new one. It means walking the list once and turning each
`next` pointer around to face backwards. The only difficulty is that the pointer you are about to
overwrite is the one telling you where to go next — so you save it first.

Three variables carry the whole pattern: `prev` (the reversed part behind you), `current` (the node
being rewired), and a temporary `next` (the not-yet-reversed part ahead).

> The pattern shows up far more often as a *sub-step* than as its own question. Palindrome Linked
> List, Reorder List and Reverse Nodes in k-Group all reverse a half or a chunk and then continue.

## How It Works

### The three-pointer loop

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

`prev` starts as `null` for a reason beyond initialisation: the original head must end up pointing at
`null`, because it is about to become the tail. Starting `prev` at `head` leaves a self-referencing
node and an infinite loop.

**The order of the three assignments is fixed:**

| Line                    | Move it earlier and…                                            |
| ----------------------- | --------------------------------------------------------------- |
| `const next = current.next` | Skipping this loses the rest of the list on the next line — the only reference to it is gone |
| `current.next = prev`   | Doing this after `prev = current` makes the node point at itself |
| `prev = current`        | Doing this before the rewire means `prev` and `current` are the same node |

Three lines, one correct order. Interviewers know this, which is why the question survives as a warm-up.

### Reversing a sublist

Reverse Linked List II gives you `left` and `right` as 1-indexed positions. Two things make it harder
than it looks: the node **before** `left` has to be reattached to the new sublist head, and `left` can
be 1, in which case there is no node before it.

A dummy node in front of the head removes the special case entirely.

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

This is **head insertion**, not the three-pointer loop. Each pass lifts the node sitting after
`current` and re-inserts it directly after `prev`. On `[1,2,3,4,5]` with `left = 2, right = 4`:

```text
1 → 2 → 3 → 4 → 5     prev = 1, current = 2
1 → 3 → 2 → 4 → 5     lifted 3
1 → 4 → 3 → 2 → 5     lifted 4
```

The nodes outside the range are never touched, and `current` ends up as the sublist's tail on its own.
Returning `dummy.next` is what makes `left = 1` work — the original `head` has been pushed back.

### Which variant to write

| Question shape                          | Use                          | Why                                              |
| --------------------------------------- | ---------------------------- | ------------------------------------------------ |
| Reverse the whole list                  | Three-pointer loop           | Shortest correct code                            |
| Reverse positions `left…right`          | Dummy + head insertion       | One pass, and `left = 1` needs no special case   |
| Reverse in groups of `k`                | Count `k` ahead, then reverse the block, then recurse or loop | The count must happen before the rewire |
| Swap adjacent pairs                     | Dummy + head insertion, `k = 2` | The general case collapses to it              |
| Compare a list against its reverse      | Reverse the second half only  | Reversing the whole list loses the original      |

⚠️ Recursion reverses a list in three lines but costs `O(n)` stack space. If the constraint says
`O(1)` space, the recursive answer does not satisfy it — say so before writing it, rather than being
told.

## Common Mistakes

**Losing the rest of the list:**

```typescript
// ❌ current.next = prev;          // the only pointer to the remainder is now gone
//    const next = current.next;   // this reads prev, not the next node
// ✅ save current.next first
```

**Returning `head` instead of `prev`:**

```typescript
// ❌ return head;   // head is the tail now, so the caller gets a one-node list
// ✅ return prev;
```

**Starting `prev` at `head`:**

```typescript
// ❌ let prev = head;    // the first node ends up pointing at itself — infinite loop on traversal
// ✅ let prev = null;
```

**Forgetting the dummy node on a sublist reversal:**

```typescript
// ❌ walking to prev = head and reversing from head.next — breaks when left === 1
// ✅ const dummy = { val: 0, next: head }; and return dummy.next
```

**Reversing a group without checking `k` nodes remain:**

```typescript
// ❌ reverse blindly — LC 25 requires a trailing group of fewer than k to stay in order
// ✅ walk k ahead first; if you hit null, return the block untouched
```

**Mutating a list the caller still needs:**

```typescript
// ❌ in-place reversal is destructive; the original order is unrecoverable without reversing back
// ✅ if the caller keeps a reference to the old head, reverse a copy or restore afterwards
```

## Problems to Practise

| #   | Problem                     | Difficulty | What it drills                                    |
| --- | --------------------------- | ---------- | ------------------------------------------------- |
| 206 | Reverse Linked List         | Easy       | The three-pointer loop, and returning `prev`      |
| 234 | Palindrome Linked List      | Easy       | Reverse half a list, keep the other half intact   |
| 92  | Reverse Linked List II      | Medium     | The dummy node and head insertion                 |
| 24  | Swap Nodes in Pairs         | Medium     | The same insertion with `k = 2`                   |
| 61  | Rotate List                 | Medium     | Finding the new tail, not reversing at all        |
| 143 | Reorder List                | Medium     | Midpoint, reverse, then interleave two lists      |
| 2   | Add Two Numbers             | Medium     | Why lists are often stored reversed already       |
| 25  | Reverse Nodes in k-Group    | Hard       | Counting before rewiring, and the partial tail    |

Write 206 from memory until the line order is automatic, then go straight to 92. Everything else in the
table is one of those two with bookkeeping added.

## 🔑 Key Takeaways

- Three variables — `prev`, `current`, and a saved `next` — reverse a list in one pass and `O(1)` space.
- The save-rewire-advance order is not a style choice; two of the three permutations lose data.
- `prev` starts at `null` because the old head becomes the new tail, and `prev` is what you return.
- A dummy node in front of the head removes every "what if the range starts at position 1" special case.
- The recursive version is shorter but costs `O(n)` stack, so it fails an explicit `O(1)` space constraint.

## Interview Questions

**Q: Walk through why the three assignments have to happen in that order.**

`current.next` is the only reference to the unreversed remainder, so it has to be copied before it is
overwritten. `prev` has to stay pointing at the previous node while the rewire happens, so advancing it
first would make `current.next = prev` a self-reference. That leaves exactly one valid order: save,
rewire, advance.

**Q: Why return `prev` rather than `head`?**

The loop exits when `current` is `null`, which is one step past the end, so `prev` is the last real node
visited — and after reversal that node is the front of the list. `head` still refers to the original
first node, which is now the tail with a `null` next.

**Q: What does the dummy node actually buy you in Reverse Linked List II?**

It guarantees the reversed section has a predecessor. Without it, `left = 1` has no node to reattach
from, so you need a separate branch that updates `head` instead of `prev.next`. The dummy makes both
cases the same code and lets you return `dummy.next` without knowing whether the head changed.

**Q: When would you prefer the recursive version?**

When the list is short and bounded and readability matters more than memory — or when the problem is
naturally recursive, like reversing in k-groups where each group's recursion returns the next group's
head. On an interview whiteboard, mention it as the elegant option, then note the `O(n)` stack cost and
ask whether that is acceptable.

**Q: How would you reverse in groups of `k` without breaking the last partial group?**

Before reversing a block, walk `k` nodes forward. If you reach `null` first, fewer than `k` remain and
the block is returned untouched. Only after that check do you run the three-pointer loop over exactly
`k` nodes, connect the previous block's tail to the new block head, and continue from the node the
block started at, which is now its tail.

## What to Read Next

- [Chapter ?? — Fast and Slow Pointers](#ch-fast-and-slow-pointers) — how to find the midpoint that Palindrome Linked List reverses from
- [Chapter ?? — Two Pointers](#ch-two-pointers) — the same idea when the structure is an indexable array
- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — where recursion on a linked structure does earn its stack
