# Prefix Sum Pattern

## 🎓 What is Prefix Sum? (In Simple Words)

Imagine you're keeping a running total of your daily expenses. Instead of adding up all expenses from day 1 to day 10 every time someone asks, you write down the **cumulative total** each day. That's exactly what Prefix Sum does!

**Simple Definition:** A Prefix Sum array stores the **running total** at each position. So if you want the sum between any two positions, you just subtract two numbers instead of adding many numbers.

## 🌍 Real-World Analogy

Think of a **bank statement**:
- Original array = Daily deposits: [100, 50, 200, 150]
- Prefix sum array = Account balance: [100, 150, 350, 500]

If you want to know how much you deposited between Day 2 and Day 4, you look at:
- Balance on Day 4: $500
- Balance on Day 1: $100
- Difference: $500 - $100 = $400 deposited between Day 2-4

Same concept! Instead of re-adding [50, 200, 150], you just subtract two numbers.

---

## Pattern Overview

The **Prefix Sum** pattern is a preprocessing technique that creates an auxiliary array where each element at index `i` contains the sum of all elements from index `0` to `i` in the original array. This allows for constant-time range sum queries.

### When to Use
- Multiple range sum queries on a static array
- Finding subarrays with a specific sum
- Problems involving cumulative sums
- When you need to calculate sum of elements between any two indices repeatedly

### When NOT to Use
- Array is frequently modified (insertions/deletions) - Prefix sum would need constant rebuilding
- Only one or two queries - Preprocessing overhead not worth it
- Need product, max, or min (not sum) - Different techniques needed

### Key Characteristics
- Preprocessing: O(n) time to build prefix sum array
- Query: O(1) time for range sum queries
- Space: O(n) for storing prefix sums
- The sum of elements from index `i` to `j` = `prefix[j] - prefix[i-1]`

### Pattern Identification
Look for this pattern when you see:
- "Find sum of elements in range [i, j]"
- "Count subarrays with sum equal to k"
- "Find equilibrium index"
- Multiple queries asking for subarray sums

---

## 📚 How Prefix Sum Works (Visual Explanation)

### Building the Prefix Sum Array

**Original Array:**
```
Index:  0   1   2   3   4   5
Array: [3,  1,  4,  2,  5,  1]
```

**Prefix Sum Array (Running Total):**
```
Index:     0   1   2   3   4    5
Prefix:   [3,  4,  8,  10, 15,  16]
           ↑   ↑   ↑   ↑   ↑    ↑
           3  3+1 4+4 8+2 10+5 15+1

Meaning:
prefix[0] = 3           (sum from index 0 to 0)
prefix[1] = 3+1 = 4     (sum from index 0 to 1)
prefix[2] = 3+1+4 = 8   (sum from index 0 to 2)
prefix[3] = 3+1+4+2 = 10 (sum from index 0 to 3)
...and so on
```

### Using Prefix Sum for Range Queries

**Question:** What's the sum from index 2 to 4?

**Without Prefix Sum (Slow Way):**
```
Sum = arr[2] + arr[3] + arr[4]
    = 4 + 2 + 5
    = 11
Time: O(n) - need to loop through elements
```

**With Prefix Sum (Fast Way):**
```
Sum from index 2 to 4 = prefix[4] - prefix[1]
                       = 15 - 4
                       = 11
Time: O(1) - just one subtraction!

Why this works:
prefix[4] = 3+1+4+2+5 = 15 (sum from 0 to 4)
prefix[1] = 3+1 = 4       (sum from 0 to 1)
Subtract:  4+2+5 = 11      (sum from 2 to 4)
```

**Visual Representation:**
```
Index:  0   1 | 2   3   4 | 5
Array: [3,  1,| 4,  2,  5,| 1]
        ^^^^^ |  ^^^^^^^  |
     prefix[1]| We want   |
       = 4    | this sum  |
              |           |
        ^^^^^^^^^^^^^^^^^
           prefix[4] = 15

Sum from 2 to 4 = 15 - 4 = 11
```

---

## Example 1: Range Sum Query (JavaScript)

### Problem
Given an integer array `nums`, handle multiple queries of the following type:
- Calculate the sum of the elements of nums between indices `left` and `right` (inclusive) where `left <= right`.

**LeetCode**: [303. Range Sum Query - Immutable](https://leetcode.com/problems/range-sum-query-immutable/)

### Solution

```javascript
/**
 * Range Sum Query using Prefix Sum
 * @param {number[]} nums - Input array
 */
class NumArray {
    constructor(nums) {
        // Build prefix sum array
        // prefix[i] = sum of elements from index 0 to i-1
        this.prefix = new Array(nums.length + 1).fill(0);

        for (let i = 0; i < nums.length; i++) {
            this.prefix[i + 1] = this.prefix[i] + nums[i];
        }
    }

    /**
     * Calculate sum between left and right indices
     * @param {number} left - Start index
     * @param {number} right - End index (inclusive)
     * @return {number} Sum of elements in range
     */
    sumRange(left, right) {
        // Sum from left to right = prefix[right+1] - prefix[left]
        return this.prefix[right + 1] - this.prefix[left];
    }
}

// Example usage
const nums = [-2, 0, 3, -5, 2, -1];
const numArray = new NumArray(nums);

console.log(numArray.sumRange(0, 2)); // Output: 1 (sum of -2, 0, 3)
console.log(numArray.sumRange(2, 5)); // Output: -1 (sum of 3, -5, 2, -1)
console.log(numArray.sumRange(0, 5)); // Output: -3 (sum of all elements)
```

### 🔍 Detailed Line-by-Line Explanation

#### Building the Prefix Sum (Constructor)

```javascript
this.prefix = new Array(nums.length + 1).fill(0);
```
**Why size `nums.length + 1`?**
- We create one extra slot at the beginning (prefix[0] = 0)
- This makes calculations easier - no special case for left=0
- Example: If nums has 6 elements, prefix has 7 elements

**Visual Example:**
```
nums:    [-2,  0,  3, -5,  2, -1]  (length = 6)
         ↓    ↓   ↓   ↓   ↓   ↓
prefix: [0,  -2, -2,  1, -4, -2, -3]  (length = 7)
         ↑    ↑   ↑   ↑   ↑   ↑   ↑
       dummy sum sum sum sum sum sum
             0→0 0→1 0→2 0→3 0→4 0→5
```

```javascript
for (let i = 0; i < nums.length; i++) {
    this.prefix[i + 1] = this.prefix[i] + nums[i];
}
```
**Step-by-step construction:**
```
Initial: prefix = [0, 0, 0, 0, 0, 0, 0]

i=0: prefix[1] = prefix[0] + nums[0] = 0 + (-2) = -2
     prefix = [0, -2, 0, 0, 0, 0, 0]

i=1: prefix[2] = prefix[1] + nums[1] = -2 + 0 = -2
     prefix = [0, -2, -2, 0, 0, 0, 0]

i=2: prefix[3] = prefix[2] + nums[2] = -2 + 3 = 1
     prefix = [0, -2, -2, 1, 0, 0, 0]

i=3: prefix[4] = prefix[3] + nums[3] = 1 + (-5) = -4
     prefix = [0, -2, -2, 1, -4, 0, 0]

i=4: prefix[5] = prefix[4] + nums[4] = -4 + 2 = -2
     prefix = [0, -2, -2, 1, -4, -2, 0]

i=5: prefix[6] = prefix[5] + nums[5] = -2 + (-1) = -3
     prefix = [0, -2, -2, 1, -4, -2, -3]

Final prefix array is complete!
```

#### Querying the Sum (sumRange Method)

```javascript
sumRange(left, right) {
    return this.prefix[right + 1] - this.prefix[left];
}
```

**Example Query: sumRange(2, 5)**

```
We want: nums[2] + nums[3] + nums[4] + nums[5]
       = 3 + (-5) + 2 + (-1)
       = -1

Using prefix sum:
prefix[right + 1] = prefix[5 + 1] = prefix[6] = -3
prefix[left]      = prefix[2]     = -2

Sum = -3 - (-2) = -3 + 2 = -1 ✓

Why this works:
prefix[6] = sum of nums[0→5] = -2+0+3+(-5)+2+(-1) = -3
prefix[2] = sum of nums[0→1] = -2+0 = -2
Difference = sum of nums[2→5] = 3+(-5)+2+(-1) = -1
```

**Visual Representation:**
```
Index:     0    1    2    3    4    5
nums:    [-2,   0,   3,  -5,   2,  -1]
                     ↑                ↑
                   left=2          right=5

prefix:  [0,  -2,  -2,   1,  -4,  -2,  -3]
              ↑                          ↑
         prefix[2]=-2              prefix[6]=-3

Sum from 2 to 5 = prefix[6] - prefix[2]
                = -3 - (-2)
                = -1
```

### Explanation
1. **Preprocessing**: Build a prefix sum array where `prefix[i]` stores the sum of elements from index 0 to i-1
2. **Query**: To get sum from index `left` to `right`, we calculate `prefix[right+1] - prefix[left]`
3. **Why it works**:
   - `prefix[right+1]` contains sum from 0 to right
   - `prefix[left]` contains sum from 0 to left-1
   - Subtracting gives us sum from left to right

### ⚠️ Common Mistakes to Avoid

1. **Off-by-one errors:**
   ```javascript
   // ❌ WRONG
   return this.prefix[right] - this.prefix[left-1];  // Can cause issues when left=0

   // ✓ CORRECT
   return this.prefix[right + 1] - this.prefix[left];
   ```

2. **Not using the extra slot:**
   ```javascript
   // ❌ WRONG - Makes code complex
   this.prefix = new Array(nums.length).fill(0);
   // Now you need special handling for left=0

   // ✓ CORRECT - Simpler code
   this.prefix = new Array(nums.length + 1).fill(0);
   ```

3. **Forgetting prefix is cumulative:**
   ```javascript
   // ❌ WRONG
   this.prefix[i] = nums[i];  // This is just copying!

   // ✓ CORRECT
   this.prefix[i + 1] = this.prefix[i] + nums[i];  // Running total
   ```

### 💡 Beginner Tips

1. **Remember the pattern:** `prefix[i]` = sum from start to position `i-1`
2. **The formula:** Sum(left to right) = `prefix[right+1] - prefix[left]`
3. **Why dummy 0?** It eliminates edge cases and simplifies code
4. **Draw it out:** When confused, draw the array and prefix visually

---

## Example 2: Subarray Sum Equals K (Python)

### Problem
Given an array of integers `nums` and an integer `k`, return the total number of subarrays whose sum equals to `k`.

**LeetCode**: [560. Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/)

### Solution

```python
from typing import List
from collections import defaultdict

class Solution:
    def subarraySum(self, nums: List[int], k: int) -> int:
        """
        Count subarrays with sum equal to k using prefix sum + hashmap

        Args:
            nums: List of integers
            k: Target sum

        Returns:
            Count of subarrays with sum equal to k
        """
        # HashMap to store frequency of prefix sums
        prefix_sum_count = defaultdict(int)
        prefix_sum_count[0] = 1  # Empty subarray has sum 0

        current_sum = 0
        count = 0

        for num in nums:
            # Calculate running prefix sum
            current_sum += num

            # Check if (current_sum - k) exists in hashmap
            # If yes, it means there's a subarray ending at current index with sum k
            if (current_sum - k) in prefix_sum_count:
                count += prefix_sum_count[current_sum - k]

            # Add current prefix sum to hashmap
            prefix_sum_count[current_sum] += 1

        return count

# Example usage
solution = Solution()

# Example 1
nums1 = [1, 1, 1]
k1 = 2
print(solution.subarraySum(nums1, k1))  # Output: 2
# Subarrays: [1,1] and [1,1]

# Example 2
nums2 = [1, 2, 3]
k2 = 3
print(solution.subarraySum(nums2, k2))  # Output: 2
# Subarrays: [1,2] and [3]

# Example 3
nums3 = [1, -1, 1, -1, 1]
k3 = 0
print(solution.subarraySum(nums3, k3))  # Output: 4
# Subarrays: [1,-1], [1,-1], [-1,1], [1,-1,1,-1]
```

### 🔍 Detailed Explanation (Step-by-Step)

This problem is **TRICKY** for beginners! Let's break it down very carefully.

#### The Core Idea (In Simple Words)

Imagine you're tracking your daily steps:
```
Day:   1    2    3    4    5
Steps: 100  50  150  100  50

Cumulative steps (prefix sum):
Day 1: 100
Day 2: 100 + 50 = 150
Day 3: 150 + 150 = 300
Day 4: 300 + 100 = 400
Day 5: 400 + 50 = 450
```

**Question:** On which day ranges did you walk exactly 200 steps?

**Answer:**
- Day 1-3: 100 + 50 + 150 = 300 ❌
- Day 2-3: 50 + 150 = 200 ✓
- Day 2-4: 50 + 150 + 100 = 300 ❌
- Day 3-4: 150 + 100 = 250 ❌

**The Math Trick:**
```
If we're at Day 4 (cumulative = 400)
And we want a range that sums to 200
We need to find: Was there a day when cumulative was 200?

400 - 200 = 200
Yes! Day 3 had cumulative = 300... wait, that's not 200

Let me recalculate:
At Day 4: cumulative = 400
Want: sum of 200
Need to find: cumulative - 200 = 400 - 200 = 200

But wait, no day has cumulative 200. Let's check Day 3:
At Day 3: cumulative = 300
Want: sum of 200
Need: 300 - 200 = 100

Yes! Day 1 had cumulative 100!
So range from Day 2 to Day 3 = 200 ✓
```

This is exactly what the algorithm does!

#### The Mathematical Insight

1. **Key Insight**: If `prefix_sum[i] - prefix_sum[j] = k`, then sum of subarray from `j+1` to `i` equals k
2. **Rearranging**: `prefix_sum[j] = prefix_sum[i] - k`
3. **What this means**:
   - At current position `i`, we have `current_sum`
   - We want to find how many previous positions `j` exist where the sum between `j+1` and `i` equals `k`
   - This means: `current_sum - prefix_sum[j] = k`
   - So we look for: `prefix_sum[j] = current_sum - k`

4. **Algorithm**:
   - Maintain a hashmap of prefix sums and their frequencies
   - For each element, check if `(current_sum - k)` exists in the map
   - If exists, add its frequency to the count (these are all valid subarrays ending at current index)

5. **Why hashmap**: Allows O(1) lookup to find how many times we've seen a particular prefix sum

#### Visual Walkthrough with Example

**Input:** `nums = [1, 2, 3, -3, 1, 1, 1]`, `k = 3`

**Let's trace through step-by-step:**

```
Initial state:
prefix_sum_count = {0: 1}  ← Why 0? Empty subarray has sum 0
current_sum = 0
count = 0

────────────────────────────────────────────────────────
Index 0: num = 1
────────────────────────────────────────────────────────
current_sum = 0 + 1 = 1

Check: Is (current_sum - k) in map?
       Is (1 - 3) = -2 in map? NO

Add current_sum to map:
prefix_sum_count = {0: 1, 1: 1}
count = 0

────────────────────────────────────────────────────────
Index 1: num = 2
────────────────────────────────────────────────────────
current_sum = 1 + 2 = 3

Check: Is (current_sum - k) in map?
       Is (3 - 3) = 0 in map? YES! (frequency = 1)
       This means: subarray [1, 2] has sum 3 ✓

count = 0 + 1 = 1

Add current_sum to map:
prefix_sum_count = {0: 1, 1: 1, 3: 1}
count = 1

────────────────────────────────────────────────────────
Index 2: num = 3
────────────────────────────────────────────────────────
current_sum = 3 + 3 = 6

Check: Is (current_sum - k) in map?
       Is (6 - 3) = 3 in map? YES! (frequency = 1)
       This means: subarray [3] has sum 3 ✓

count = 1 + 1 = 2

Add current_sum to map:
prefix_sum_count = {0: 1, 1: 1, 3: 1, 6: 1}
count = 2

────────────────────────────────────────────────────────
Index 3: num = -3
────────────────────────────────────────────────────────
current_sum = 6 + (-3) = 3

Check: Is (current_sum - k) in map?
       Is (3 - 3) = 0 in map? YES! (frequency = 1)
       This means: subarray [1, 2, 3, -3] has sum 3 ✓

count = 2 + 1 = 3

Add current_sum to map:
prefix_sum_count = {0: 1, 1: 1, 3: 2, 6: 1}  ← 3 appears twice now!
count = 3

────────────────────────────────────────────────────────
Index 4: num = 1
────────────────────────────────────────────────────────
current_sum = 3 + 1 = 4

Check: Is (current_sum - k) in map?
       Is (4 - 3) = 1 in map? YES! (frequency = 1)
       This means: subarray [2, 3, -3, 1] has sum 3 ✓

count = 3 + 1 = 4

Add current_sum to map:
prefix_sum_count = {0: 1, 1: 1, 3: 2, 6: 1, 4: 1}
count = 4

────────────────────────────────────────────────────────
...continuing for remaining elements...
────────────────────────────────────────────────────────

Final count = 6
```

**All subarrays with sum = 3:**
1. [1, 2] → indices 0-1
2. [3] → index 2
3. [1, 2, 3, -3] → indices 0-3
4. [2, 3, -3, 1] → indices 1-4
5. [3, -3, 1, 1, 1] → indices 2-6
6. [-3, 1, 1, 1] → indices 3-6

#### Why HashMap is Crucial

**Without HashMap (Brute Force - O(n²)):**
```python
count = 0
for i in range(len(nums)):
    current_sum = 0
    for j in range(i, len(nums)):
        current_sum += nums[j]
        if current_sum == k:
            count += 1
# This checks EVERY possible subarray - SLOW!
```

**With HashMap + Prefix Sum (O(n)):**
```python
# We check each element ONCE
# HashMap gives us O(1) lookup to find matching prefix sums
# Much faster!
```

---

## Time & Space Complexity

### Example 1: Range Sum Query
- **Time Complexity**:
  - Constructor: O(n) - Building prefix sum array
  - sumRange query: O(1) - Simple subtraction
- **Space Complexity**: O(n) - Storing prefix sum array

### Example 2: Subarray Sum Equals K
- **Time Complexity**: O(n) - Single pass through array
- **Space Complexity**: O(n) - HashMap storing prefix sums (worst case all unique)

---

## Common Variations

1. **2D Prefix Sum (Matrix)**
   - Extend to 2D arrays for range sum queries on matrices
   - LeetCode: [304. Range Sum Query 2D - Immutable](https://leetcode.com/problems/range-sum-query-2d-immutable/)

2. **Product Instead of Sum**
   - Track product of elements instead of sum
   - LeetCode: [238. Product of Array Except Self](https://leetcode.com/problems/product-of-array-except-self/)

3. **Equilibrium Index**
   - Find index where left sum equals right sum
   - Use prefix and suffix sums

4. **Continuous Subarray Sum**
   - Check if subarray sum is multiple of k
   - LeetCode: [523. Continuous Subarray Sum](https://leetcode.com/problems/continuous-subarray-sum/)

5. **Maximum Size Subarray Sum Equals K**
   - Find longest subarray with sum k
   - LeetCode: [325. Maximum Size Subarray Sum Equals k](https://leetcode.com/problems/maximum-size-subarray-sum-equals-k/)

---

## Practice Problems

### Easy
1. [303. Range Sum Query - Immutable](https://leetcode.com/problems/range-sum-query-immutable/)
2. [1480. Running Sum of 1d Array](https://leetcode.com/problems/running-sum-of-1d-array/)
3. [724. Find Pivot Index](https://leetcode.com/problems/find-pivot-index/)

### Medium
4. [560. Subarray Sum Equals K](https://leetcode.com/problems/subarray-sum-equals-k/)
5. [523. Continuous Subarray Sum](https://leetcode.com/problems/continuous-subarray-sum/)
6. [304. Range Sum Query 2D - Immutable](https://leetcode.com/problems/range-sum-query-2d-immutable/)
7. [930. Binary Subarrays With Sum](https://leetcode.com/problems/binary-subarrays-with-sum/)

### Hard
8. [1074. Number of Submatrices That Sum to Target](https://leetcode.com/problems/number-of-submatrices-that-sum-to-target/)

---

## ⚠️ Common Pitfalls & How to Avoid Them

### 1. Forgetting the Dummy Zero
```python
# ❌ WRONG - No dummy 0
prefix = [nums[0]]
for i in range(1, len(nums)):
    prefix.append(prefix[-1] + nums[i])
# Now you need special handling for queries starting at index 0!

# ✓ CORRECT - With dummy 0
prefix = [0]
for num in nums:
    prefix.append(prefix[-1] + num)
# Clean, no edge cases!
```

### 2. Off-by-One Errors in Range Queries
```javascript
// ❌ WRONG
sum = prefix[right] - prefix[left - 1];  // What if left = 0? Error!

// ✓ CORRECT
sum = prefix[right + 1] - prefix[left];  // Always works!
```

### 3. Not Handling Negative Numbers
```python
# Prefix sum DOES work with negative numbers!
nums = [1, -2, 3, -4]
prefix = [0, 1, -1, 2, -2]  # Perfectly fine ✓

# The math still works:
# Sum from index 1 to 2 = prefix[3] - prefix[1] = 2 - 1 = 1
# Verify: nums[1] + nums[2] = -2 + 3 = 1 ✓
```

### 4. Modifying Array While Building Prefix Sum
```javascript
// ❌ WRONG - Modifying original array
for (let i = 1; i < nums.length; i++) {
    nums[i] += nums[i - 1];  // Destroys original data!
}

// ✓ CORRECT - Separate prefix array
const prefix = [0];
for (let num of nums) {
    prefix.push(prefix[prefix.length - 1] + num);
}
```

### 5. Forgetting HashMap Initialization for Subarray Sum
```python
# ❌ WRONG - Missing {0: 1}
prefix_sum_count = {}
# This misses subarrays that start from index 0!

# ✓ CORRECT
prefix_sum_count = {0: 1}
# Now subarrays starting from index 0 are counted
```

---

## 🤔 Frequently Asked Questions

### Q1: Why do we need the dummy 0 at prefix[0]?

**A:** It eliminates edge cases and makes the formula work for all ranges.

**Example:**
```
nums = [1, 2, 3]
prefix = [0, 1, 3, 6]
          ↑  dummy

To get sum from index 0 to 2:
prefix[2 + 1] - prefix[0] = 6 - 0 = 6 ✓

Without dummy 0:
prefix = [1, 3, 6]
To get sum from index 0 to 2:
prefix[2] - prefix[???]  ← What do we subtract? Need special case!
```

### Q2: Can I use prefix sum if the array changes frequently?

**A:** No, it's inefficient for frequently changing arrays.

- **Static array** (no changes): ✓ Perfect use case
- **Few changes**: Maybe rebuild prefix array after changes
- **Frequent changes**: ❌ Use a different data structure (like Segment Tree or Fenwick Tree)

### Q3: What's the difference between "prefix sum array" and "running sum"?

**A:** They're the same thing! Different names for the same concept.
- Prefix Sum = Running Sum = Cumulative Sum

### Q4: Can prefix sum work with 2D arrays (matrices)?

**A:** Yes! It's called "2D Prefix Sum" or "Summed Area Table."

**Example:**
```
Original Matrix:       2D Prefix Sum:
1  2  3               1  3  6
4  5  6      →        5  12 21
7  8  9               12 27 45

Each cell contains sum of all cells from (0,0) to (i,j)
```

### Q5: Why use HashMap for "Subarray Sum Equals K"?

**A:** HashMap stores how many times each prefix sum has appeared.

**Why this matters:**
```
nums = [1, 1, 1], k = 2

prefix sums as we go: 0 → 1 → 2 → 3

At index 2 (prefix sum = 3):
Looking for: 3 - 2 = 1
HashMap shows: prefix sum of 1 appeared TWICE (at index 0 and 1)
So there are TWO subarrays ending at index 2 with sum = 2:
- [1, 1] from index 0-1
- [1] + [1] from index 1-2... wait that's wrong

Actually:
- nums[0:2] = [1, 1] ← one way
- nums[1:2] = [1, 1] ← another way

The frequency tells us how many different starting points work!
```

### Q6: When should I NOT use prefix sum?

**A:** Don't use prefix sum when:
1. You need to find **maximum** or **minimum** (use different techniques)
2. You need to find **product** (use prefix product instead)
3. Array changes frequently (rebuilding is expensive)
4. You only have 1-2 queries (not worth preprocessing)
5. You need non-contiguous elements (prefix sum is for contiguous subarrays)

---

## 💡 Pro Tips for Interviews

1. **State the pattern early:** "This looks like a prefix sum problem because..."
2. **Draw it out:** Visualize the prefix array on the whiteboard
3. **Mention trade-offs:** "We use O(n) extra space to get O(1) queries"
4. **Test with negatives:** Always check if your solution handles negative numbers
5. **Edge cases to mention:**
   - Empty array
   - Single element
   - All negatives
   - Target sum is 0
   - Array with zeros

---

## 📝 Quick Reference Template

```javascript
// Building Prefix Sum
function buildPrefixSum(nums) {
    const prefix = [0];
    for (const num of nums) {
        prefix.push(prefix[prefix.length - 1] + num);
    }
    return prefix;
}

// Range Sum Query
function rangeSum(prefix, left, right) {
    return prefix[right + 1] - prefix[left];
}

// Subarray Sum Equals K
function subarraySum(nums, k) {
    const map = new Map([[0, 1]]);
    let sum = 0, count = 0;

    for (const num of nums) {
        sum += num;
        if (map.has(sum - k)) {
            count += map.get(sum - k);
        }
        map.set(sum, (map.get(sum) || 0) + 1);
    }

    return count;
}
```

---

## Key Takeaways

1. **Preprocessing pays off**: Spend O(n) once to enable O(1) queries
2. **Prefix sum + HashMap**: Powerful combination for subarray sum problems
3. **Formula**: `sum(i to j) = prefix[j+1] - prefix[i]` (with dummy 0)
4. **Watch for edge cases**: Empty arrays, single elements, negative numbers
5. **Alternative to nested loops**: Reduces O(n²) solutions to O(n)
6. **The dummy 0 is your friend**: It simplifies everything!
7. **HashMap frequency matters**: For counting subarrays, not just checking existence

---

## 🎯 How to Recognize Prefix Sum Problems

If you see these keywords, think prefix sum:
- ✓ "sum of subarray"
- ✓ "range sum query"
- ✓ "count subarrays with sum k"
- ✓ "equilibrium index"
- ✓ "cumulative sum"
- ✓ "contiguous subarray"

[← Back to Index](./README.md) | [Next: Two Pointers →](./03-two-pointers.md)
