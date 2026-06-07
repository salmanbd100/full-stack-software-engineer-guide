# Problem-Solving Communication

Master "thinking out loud" during coding interviews to show how you approach problems.

## Core Principle

Interviewers evaluate **how you think**, not just the final solution. A clear
O(n²) explanation beats a silent O(n) solution every time.

---

## The Think-Aloud Framework

### Phase 1: Before Writing Code (5 min)

**Step 1 — Understand the problem**
```
"Let me make sure I understand. We're given a sorted array of integers
and need to find two numbers that sum to a target. Should I return
indices or the values?"
```

**Step 2 — Work through an example**
```
"Input: [2, 7, 11, 15], target = 9
Output: [0, 1] because 2 + 7 = 9

Edge cases I'm thinking about:
- Empty array → return null?
- No valid pair → return null?
- Duplicate elements?"
```

**Step 3 — Compare approaches out loud**
```
"Two main approaches:

Brute force: nested loops, check every pair
- Time: O(n²), Space: O(1)
- Simple but slow for large inputs

Hash map: store seen numbers, check complement
- Time: O(n), Space: O(n)
- One pass, much better for large n

Given we want optimal time, I'll go with the hash map approach.
Does that sound good?"
```

**Step 4 — Outline the algorithm**
```
"My plan:
1. Create an empty hash map
2. For each number, calculate complement = target - num
3. If complement is in the map → return [map[complement], current index]
4. Else add current number to the map
5. If no pair found, return null

Let me trace through: [2, 7, 11], target = 9
- i=0, num=2: complement=7, map empty → add {2:0}
- i=1, num=7: complement=2, found! → return [0, 1] ✓

I'll code this now."
```

---

### Phase 2: While Coding (15–20 min)

**Narrate each section as you write it:**

```typescript
function twoSum(nums: number[], target: number): number[] | null {
  // Hash map: value → index for O(1) lookup
  const seen = new Map<number, number>();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    // Check if we've already seen the complement
    if (seen.has(complement)) {
      return [seen.get(complement)!, i];
    }

    // Haven't found it yet — store current number
    seen.set(nums[i], i);
  }

  return null; // No valid pair
}
```

**What to say while writing:**
```
"I'm creating a Map to store values we've already seen.
For each number I calculate the complement — that's what we need
to pair with it to reach the target.
If the complement is already in the map, we found our answer.
Otherwise I store this number for future lookups."
```

**When uncertain about syntax:**
```
"I'm not sure if it's map.has() or map.contains() in TypeScript.
I believe it's has() — I'll go with that.
[continues writing]
Actually I should also verify the complement isn't the same index
as the current number. Let me double-check the constraint..."
```

---

### Phase 3: After Coding — Test and Analyze

**Trace through the example:**
```
"Let me verify with [2, 7, 11, 15], target = 9:
- i=0, num=2: complement=7, map={}, add 2→0
- i=1, num=7: complement=2, found in map → return [0, 1] ✓"
```

**Test edge cases:**
```
"Edge cases:
- Empty array []: loop never runs → return null ✓
- No solution [1, 2, 3], target=10: returns null ✓
- Negative numbers [-3, 4], target=1: complement = 1-(-3) = 4, works ✓"
```

**State complexity:**
```
"Time: O(n) — one pass, each map operation is O(1)
Space: O(n) — worst case, store all n elements in the map
This is optimal — we must check each element at least once."
```

---

## Handling Common Situations

### When You're Stuck

**❌ Wrong:** Silence for 5 minutes

**✅ Right:**
```
"I'm stuck on this edge case. Let me think through a few options:
Option 1: Add a special check at the start — handles it but adds logic
Option 2: Incorporate it into the main loop — cleaner but trickier

Let me trace through the edge case with my current code first...
[walks through] Ah, I see the issue. When X happens, the code fails
because Y. I can fix this by..."
```

**When truly stuck — ask for help:**
```
"I'm considering a few approaches but I'm not sure which direction to
take. Could you give me a hint about whether I should focus on
optimizing time or space here?"
```

### When the Interviewer Gives a Hint

```
Interviewer: "Think about whether there's a more efficient approach
for large datasets..."

You: "Right — my current approach is O(n²). You're pointing me toward
something faster... for large data, I should think about O(1) lookup
structures. A hash map would reduce this to O(n) overall.

Let me revise my approach: [explains optimization]

Is that more along the lines of what you were thinking?"
```

---

## Key Phrases

**Starting:**
- "Let me make sure I understand the problem..."
- "I'm thinking of two main approaches..."
- "Let me work through an example first..."

**Explaining Approach:**
- "I'll use [data structure] because..."
- "This gives us O(n) time since..."
- "The trade-off is [space/time/complexity]..."

**While Coding:**
- "I'm creating this variable to..."
- "This check handles the edge case where..."
- "Let me add a comment to clarify this..."

**When Stuck:**
- "Let me think through this step by step..."
- "I'm not immediately seeing the optimal solution, but here's my reasoning..."
- "Could you give me a hint about which direction to explore?"

**Testing:**
- "Let me trace through with the input..."
- "Edge case to check: what if the input is empty?"
- "This should return X — let me verify..."

**Finishing:**
- "Time: O(n), Space: O(n) — optimal because we must visit each element."
- "Are there any edge cases you'd like me to test?"

---

## Complexity Analysis — Quick Reference

**Always state complexity after writing your solution.**

```typescript
// Two Sum with hash map
// Time: O(n) — one pass, each map op is O(1)
// Space: O(n) — store up to n elements

// Binary Search
// Time: O(log n) — halve the search space each step
// Space: O(1) — no extra allocation

// Recursive tree traversal
// Time: O(n) — visit each node once
// Space: O(h) — call stack depth = tree height
//   Balanced: O(log n), Skewed: O(n)
```

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Silence while coding | Narrate every decision — even trivial ones |
| Diving into code immediately | Ask questions, discuss approach first |
| Ignoring hints from interviewer | Acknowledge and adapt: "Good point, let me reconsider..." |
| No complexity analysis | Always state time and space after finishing |
| Saying "I'm done" without testing | Always walk through an example and edge cases |

---

> **Remember:** "Think every single step out loud" is not optional — it's the whole point of a coding interview.

---

**Related:** [Technical Communication](./01-technical-communication.md) | [Active Listening](./09-active-listening.md) | [System Design Communication](./04-system-design-communication.md)
