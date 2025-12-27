# Monotonic Stack Pattern

## What is Monotonic Stack? (In Simple Words)

Imagine you're standing in a line at a theme park, and you want to know: **"Who is the next taller person behind me?"**

A **Monotonic Stack** is like organizing this line in a special way where:
- People (or numbers) are arranged in **order by height** (or value)
- When a taller person arrives, shorter people in front get their "answer" and leave the line
- The line always stays organized in increasing or decreasing order

**Real-World Analogy: The Building View Problem**

Think of standing on buildings of different heights and looking right. You can only see the first building taller than yours - that's your "next greater element!"

```
Buildings:  [3, 7, 2, 5, 8, 1]
             ↓  ↓  ↓  ↓  ↓  ↓
Standing on 3 → Can see 7 (next taller)
Standing on 7 → Can see 8 (next taller)
Standing on 2 → Can see 5 (next taller)
Standing on 5 → Can see 8 (next taller)
Standing on 8 → Can't see any (tallest)
Standing on 1 → Can't see any (no taller ahead)
```

The monotonic stack helps us answer **"What's the next taller/shorter element?"** efficiently!

---

## Pattern Overview

A **Monotonic Stack** is a stack data structure that maintains elements in either strictly increasing or strictly decreasing order. This pattern is particularly useful for finding the next greater/smaller element or solving problems involving histograms and temperatures.

### When to Use
- Finding next greater or smaller element
- Finding previous greater or smaller element
- Problems involving ranges or spans
- Histogram-based problems
- Temperature or stock span problems

### Key Characteristics
- Stack maintains monotonic order (increasing or decreasing)
- Elements are popped when they violate the monotonic property
- Each element is pushed and popped at most once → O(n) time
- Often used with indices rather than values

### Pattern Identification
Look for this pattern when you see:
- "Next greater element"
- "Next smaller element"
- "Largest rectangle in histogram"
- "Daily temperatures" or "stock span"
- "Buildings you can see"
- Problems where you need to find nearest larger/smaller values

---

## How to Recognize When to Use Monotonic Stack

**Ask yourself these questions:**

1. Do I need to find the **next/previous greater/smaller** element?
2. Am I looking at elements to the **left or right** to find something bigger/smaller?
3. Does the problem mention **temperatures, stock prices, heights, or buildings**?
4. Do I need to find **ranges or spans** where certain conditions hold?

If you answered **YES** to any of these, try monotonic stack!

**Quick Recognition Checklist:**

| Problem Type | Keywords to Look For | Stack Type |
|-------------|---------------------|------------|
| Next Greater Element | "next greater", "warmer day" | Decreasing Stack |
| Next Smaller Element | "next smaller", "lower height" | Increasing Stack |
| Previous Greater Element | "previous greater", "before" | Decreasing Stack (iterate left) |
| Previous Smaller Element | "previous smaller", "before" | Increasing Stack (iterate left) |
| Histogram/Rectangle | "rectangle", "area", "histogram" | Increasing Stack |

---

## Visual Understanding: Stack State Changes

Let's visualize how a monotonic decreasing stack works with a simple example:

**Example**: Find next greater element for `[2, 1, 4, 3]`

```
Step-by-step visualization:
═══════════════════════════════════════════════════════════════

Step 1: Process 2
━━━━━━━━━━━━━━━━━━
Current: 2
Stack: empty
Action: Push 2 (no comparison needed)

Stack State:
┌───┐
│ 2 │ ← top
└───┘
Result: []

═══════════════════════════════════════════════════════════════

Step 2: Process 1
━━━━━━━━━━━━━━━━━━
Current: 1
Stack top: 2
Compare: 1 < 2 (maintain decreasing order)
Action: Push 1

Stack State:
┌───┐
│ 1 │ ← top (smaller values on top)
├───┤
│ 2 │
└───┘
Result: []

═══════════════════════════════════════════════════════════════

Step 3: Process 4
━━━━━━━━━━━━━━━━━━
Current: 4
Stack top: 1
Compare: 4 > 1 → VIOLATION! Pop and record answer

Pop 1: Next greater for 1 is 4 ✓
Stack top: 2
Compare: 4 > 2 → VIOLATION! Pop and record answer

Pop 2: Next greater for 2 is 4 ✓
Stack: empty
Action: Push 4

Stack State:
┌───┐
│ 4 │ ← top
└───┘
Result: [2→4, 1→4]

═══════════════════════════════════════════════════════════════

Step 4: Process 3
━━━━━━━━━━━━━━━━━━
Current: 3
Stack top: 4
Compare: 3 < 4 (maintain decreasing order)
Action: Push 3

Stack State:
┌───┐
│ 3 │ ← top
├───┤
│ 4 │
└───┘
Result: [2→4, 1→4, 3→-1, 4→-1]

Final Answer: [4, 4, -1, -1]
```

**Key Observations:**

1. Stack maintains **decreasing order** from bottom to top
2. When we find a **larger element**, we **pop smaller elements** and record their answer
3. Elements remaining in stack have **no next greater element** (answer = -1)
4. Each element is **pushed once** and **popped once** → O(n) time!

---

## Monotonic Increasing vs Decreasing Stack

**Visual Comparison:**

```
MONOTONIC DECREASING STACK (for "Next Greater Element")
═══════════════════════════════════════════════════════

Array: [3, 7, 2, 5]

When at 7:                When at 5:
┌───┐                    ┌───┐
│ 3 │ ← pop! 7 > 3       │ 2 │ ← pop! 5 > 2
└───┘                    └───┘
                         ┌───┐
Push 7 →                 │ 7 │
┌───┐                    ├───┤
│ 7 │                    │ 5 │ ← push after popping
└───┘                    └───┘

Rule: Pop when current > stack.top()
Result: Values DECREASE from bottom to top
Use: Find NEXT GREATER element


MONOTONIC INCREASING STACK (for "Next Smaller Element")
═══════════════════════════════════════════════════════

Array: [7, 3, 5, 2]

When at 3:                When at 2:
┌───┐                    ┌───┐
│ 7 │ ← pop! 3 < 7       │ 5 │ ← pop! 2 < 5
└───┘                    └───┘
                         ┌───┐
Push 3 →                 │ 3 │
┌───┐                    ├───┤
│ 3 │                    │ 2 │ ← push after popping
└───┘                    └───┘

Rule: Pop when current < stack.top()
Result: Values INCREASE from bottom to top
Use: Find NEXT SMALLER element
```

---

## Example 1: Daily Temperatures (JavaScript)

### Problem
Given an array of integers `temperatures` representing daily temperatures, return an array `answer` such that `answer[i]` is the number of days you have to wait after the `i`-th day to get a warmer temperature. If there is no future day for which this is possible, keep `answer[i] == 0` instead.

**LeetCode**: [739. Daily Temperatures](https://leetcode.com/problems/daily-temperatures/)

### Solution

```javascript
/**
 * Find number of days until warmer temperature using monotonic stack
 * @param {number[]} temperatures - Array of daily temperatures
 * @return {number[]} - Days to wait for warmer temperature
 */
function dailyTemperatures(temperatures) {
    const n = temperatures.length;
    const answer = new Array(n).fill(0);  // Initialize with 0s
    const stack = [];  // Monotonic decreasing stack (stores indices)

    // Traverse through each day
    for (let i = 0; i < n; i++) {
        // While current temperature is warmer than temperature at stack top
        // We found the answer for the day at stack top
        while (stack.length > 0 && temperatures[i] > temperatures[stack[stack.length - 1]]) {
            const prevIndex = stack.pop();
            answer[prevIndex] = i - prevIndex;  // Calculate days difference
        }

        // Push current day's index to stack
        stack.push(i);
    }

    // Remaining indices in stack have no warmer day (already initialized to 0)
    return answer;
}

// Example usage
console.log(dailyTemperatures([73, 74, 75, 71, 69, 72, 76, 73]));
// Output: [1, 1, 4, 2, 1, 1, 0, 0]
// Explanation:
// Day 0 (73°): Next warmer is day 1 (74°) → wait 1 day
// Day 1 (74°): Next warmer is day 2 (75°) → wait 1 day
// Day 2 (75°): Next warmer is day 6 (76°) → wait 4 days
// Day 3 (71°): Next warmer is day 5 (72°) → wait 2 days
// Day 4 (69°): Next warmer is day 5 (72°) → wait 1 day
// Day 5 (72°): Next warmer is day 6 (76°) → wait 1 day
// Day 6 (76°): No warmer day → 0
// Day 7 (73°): No warmer day → 0

console.log(dailyTemperatures([30, 40, 50, 60]));
// Output: [1, 1, 1, 0]

console.log(dailyTemperatures([30, 60, 90]));
// Output: [1, 1, 0]
```

### Explanation

**How the monotonic stack works**:

```
temperatures = [73, 74, 75, 71, 69, 72, 76, 73]
stack = [] (stores indices)

i=0 (73): stack is empty → push 0
  stack = [0]

i=1 (74): 74 > temperatures[0]=73
  Pop 0, answer[0] = 1 - 0 = 1
  Push 1
  stack = [1]

i=2 (75): 75 > temperatures[1]=74
  Pop 1, answer[1] = 2 - 1 = 1
  Push 2
  stack = [2]

i=3 (71): 71 < temperatures[2]=75
  No popping needed
  Push 3
  stack = [2, 3]

i=4 (69): 69 < temperatures[3]=71
  No popping needed
  Push 4
  stack = [2, 3, 4]

i=5 (72): 72 > temperatures[4]=69, 72 > temperatures[3]=71, 72 < temperatures[2]=75
  Pop 4, answer[4] = 5 - 4 = 1
  Pop 3, answer[3] = 5 - 3 = 2
  Push 5
  stack = [2, 5]

i=6 (76): 76 > temperatures[5]=72, 76 > temperatures[2]=75
  Pop 5, answer[5] = 6 - 5 = 1
  Pop 2, answer[2] = 6 - 2 = 4
  Push 6
  stack = [6]

i=7 (73): 73 < temperatures[6]=76
  Push 7
  stack = [6, 7]

Final: answer = [1, 1, 4, 2, 1, 1, 0, 0]
```

**Key insights**:
1. Stack stores **indices**, not values
2. Stack is **monotonic decreasing** (temperatures at indices are decreasing)
3. When we find a warmer day, we resolve all cooler days in the stack
4. Each element pushed and popped exactly once → O(n) time

### Detailed Walkthrough with Visual Diagrams

Let's walk through a smaller example step-by-step: `temperatures = [73, 74, 75, 71]`

```
Initial State:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
temperatures: [73, 74, 75, 71]
answer:       [ 0,  0,  0,  0]  (initialize with zeros)
stack:        []
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 1: i=0, temp=73
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Array:  [73*, 74, 75, 71]
         ↑
Question: Is 73 warmer than any previous day?
Answer: Stack is empty, no previous days

Action: Push index 0 to stack

Stack visualization:
┌──────────┐
│ 0 (73°) │ ← top
└──────────┘

answer: [0, 0, 0, 0]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 2: i=1, temp=74
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Array:  [73, 74*, 75, 71]
             ↑
Question: Is 74 warmer than any previous day?
Check: 74 > 73? YES!

Action: Pop index 0 from stack
        Day 0 (73°) found its warmer day!
        answer[0] = 1 - 0 = 1 day

Stack before:         Stack after:
┌──────────┐         ┌──────────┐
│ 0 (73°) │  pop!    │ 1 (74°) │ ← top
└──────────┘         └──────────┘

answer: [1, 0, 0, 0]
         ↑ updated!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 3: i=2, temp=75
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Array:  [73, 74, 75*, 71]
                 ↑
Question: Is 75 warmer than any previous day?
Check: 75 > 74? YES!

Action: Pop index 1 from stack
        Day 1 (74°) found its warmer day!
        answer[1] = 2 - 1 = 1 day

Stack before:         Stack after:
┌──────────┐         ┌──────────┐
│ 1 (74°) │  pop!    │ 2 (75°) │ ← top
└──────────┘         └──────────┘

answer: [1, 1, 0, 0]
            ↑ updated!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


STEP 4: i=3, temp=71
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Array:  [73, 74, 75, 71*]
                     ↑
Question: Is 71 warmer than any previous day?
Check: 71 > 75? NO!

Action: Just push index 3 to stack (no popping)

Stack before:         Stack after:
┌──────────┐         ┌──────────┐
│ 2 (75°) │          │ 3 (71°) │ ← top
└──────────┘         ├──────────┤
                     │ 2 (75°) │
                     └──────────┘

answer: [1, 1, 0, 0]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


FINAL STATE:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
No more elements to process.

Stack still has: [2, 3]
These days never found a warmer day → answer stays 0

Final answer: [1, 1, 0, 0]

Explanation:
- Day 0 (73°): Wait 1 day for 74°
- Day 1 (74°): Wait 1 day for 75°
- Day 2 (75°): No warmer day ahead → 0
- Day 3 (71°): No warmer day ahead → 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Why This Works:**

1. **Stack stores indices** (not temperatures) so we can calculate the distance
2. **Stack maintains decreasing temperatures** from bottom to top
3. **When we find a warmer day**, we pop all cooler days and give them their answer
4. **Elements that never get popped** means no warmer day exists (answer = 0)

**Time Complexity Analysis:**

- Each element is pushed **exactly once**
- Each element is popped **at most once**
- Total operations: 2n (push + pop)
- **Time: O(n)**

---

## Example 2: Next Greater Element I (Python)

### Problem
The next greater element of some element `x` in an array is the first greater element to its right. Given two arrays `nums1` and `nums2` where `nums1` is a subset of `nums2`, find all the next greater elements for `nums1`'s elements in `nums2`.

**LeetCode**: [496. Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/)

### Solution

```python
from typing import List

class Solution:
    def nextGreaterElement(self, nums1: List[int], nums2: List[int]) -> List[int]:
        """
        Find next greater element using monotonic stack

        Args:
            nums1: Query array (subset of nums2)
            nums2: Main array

        Returns:
            Array where each element is the next greater element from nums2
        """
        # HashMap to store next greater element for each number
        next_greater = {}

        # Monotonic decreasing stack
        stack = []

        # Process nums2 to find next greater element for each number
        for num in nums2:
            # While stack is not empty and current num is greater than stack top
            while stack and num > stack[-1]:
                # Current num is the next greater element for stack top
                smaller = stack.pop()
                next_greater[smaller] = num

            # Push current number to stack
            stack.append(num)

        # Remaining elements in stack have no next greater element
        while stack:
            next_greater[stack.pop()] = -1

        # Build result array for nums1
        result = []
        for num in nums1:
            result.append(next_greater[num])

        return result

# Example usage
solution = Solution()

# Example 1
nums1 = [4, 1, 2]
nums2 = [1, 3, 4, 2]
print(solution.nextGreaterElement(nums1, nums2))  # Output: [-1, 3, -1]
# Explanation:
# For 4: No greater element → -1
# For 1: Next greater is 3
# For 2: No greater element → -1

# Example 2
nums1 = [2, 4]
nums2 = [1, 2, 3, 4]
print(solution.nextGreaterElement(nums1, nums2))  # Output: [3, -1]
# Explanation:
# For 2: Next greater is 3
# For 4: No greater element → -1

# Example 3
nums1 = [1, 3, 5, 2, 4]
nums2 = [6, 5, 4, 3, 2, 1, 7]
print(solution.nextGreaterElement(nums1, nums2))  # Output: [7, 7, 7, 7, 7]
# Explanation: For all numbers, 7 is the next greater element
```

### Explanation

**Algorithm Flow**:

1. **Build HashMap**: Process `nums2` to create a mapping of each number to its next greater element
2. **Monotonic Stack**: Maintain stack of elements waiting to find their next greater element
3. **Query**: For each number in `nums1`, look up its next greater element in the map

**Visual Example** for `nums2 = [1, 3, 4, 2]`:

```
num=1: stack = [] → push 1
  stack = [1]

num=3: 3 > 1
  Pop 1, next_greater[1] = 3
  Push 3
  stack = [3]

num=4: 4 > 3
  Pop 3, next_greater[3] = 4
  Push 4
  stack = [4]

num=2: 2 < 4
  Push 2
  stack = [4, 2]

End: Remaining in stack have no next greater
  next_greater[4] = -1
  next_greater[2] = -1

HashMap: {1: 3, 3: 4, 4: -1, 2: -1}
```

---

## Time & Space Complexity

### Example 1: Daily Temperatures
- **Time Complexity**: O(n) - Each element pushed and popped once
- **Space Complexity**: O(n) - Stack can contain all elements in worst case

### Example 2: Next Greater Element
- **Time Complexity**: O(n + m) where n = len(nums2), m = len(nums1)
- **Space Complexity**: O(n) - HashMap and stack

---

## Common Variations

1. **Next Greater Element**
   - Find next greater element for each element
   - LeetCode: [496. Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/)
   - LeetCode: [503. Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/) (Circular)

2. **Previous Smaller Element**
   - Find previous smaller element
   - Use monotonic increasing stack

3. **Largest Rectangle in Histogram**
   - Find largest rectangular area in histogram
   - LeetCode: [84. Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/)

4. **Trapping Rain Water**
   - Calculate trapped rainwater
   - LeetCode: [42. Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)

5. **Remove K Digits**
   - Remove k digits to make smallest number
   - LeetCode: [402. Remove K Digits](https://leetcode.com/problems/remove-k-digits/)

6. **Stock Span Problem**
   - Calculate span of stock prices
   - LeetCode: [901. Online Stock Span](https://leetcode.com/problems/online-stock-span/)

---

## Practice Problems

### Easy
1. [496. Next Greater Element I](https://leetcode.com/problems/next-greater-element-i/)

### Medium
2. [739. Daily Temperatures](https://leetcode.com/problems/daily-temperatures/)
3. [503. Next Greater Element II](https://leetcode.com/problems/next-greater-element-ii/)
4. [901. Online Stock Span](https://leetcode.com/problems/online-stock-span/)
5. [402. Remove K Digits](https://leetcode.com/problems/remove-k-digits/)
6. [1019. Next Greater Node In Linked List](https://leetcode.com/problems/next-greater-node-in-linked-list/)

### Hard
7. [84. Largest Rectangle in Histogram](https://leetcode.com/problems/largest-rectangle-in-histogram/)
8. [42. Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)
9. [85. Maximal Rectangle](https://leetcode.com/problems/maximal-rectangle/)

---

## Key Takeaways

1. **Monotonic property**: Stack maintains increasing or decreasing order
2. **Store indices**: Usually store indices, not values, for calculating distances
3. **O(n) efficiency**: Each element pushed and popped at most once
4. **Two types**:
   - **Decreasing stack**: Find next greater element
   - **Increasing stack**: Find next smaller element
5. **Pattern template**:
   ```
   while stack not empty and current violates monotonic property:
       pop and process
   push current
   ```
6. **Common use cases**: Next/previous greater/smaller, histogram problems, span problems

[← Previous: In-place Reversal](./05-linkedlist-in-place-reversal.md) | [Back to Index](./README.md) | [Next: Top K Elements →](./07-top-k-elements.md)
