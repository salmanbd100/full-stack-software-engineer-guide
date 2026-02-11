# Modified Binary Search Pattern

## What is Modified Binary Search? (In Simple Words)

Imagine you're looking for a word in a physical dictionary. Instead of starting from page 1 and checking every page, you:
1. Open the dictionary roughly in the middle
2. Check if your word comes before or after the words on that page
3. Throw away half the dictionary (the half that definitely doesn't contain your word)
4. Repeat until you find your word

That's binary search! You're cutting your search space in half with every guess.

**Modified Binary Search** is like using this same "divide and conquer" strategy, but in trickier situations:
- What if someone shuffled parts of the dictionary but kept sections sorted?
- What if you're looking for the first page where a word appears (not just any page)?
- What if the dictionary is arranged in a 2D grid instead of linear pages?

Real-world analogy: Think of looking for a book in a library where:
- **Classic Binary Search**: Books are perfectly arranged A-Z on one shelf
- **Modified Binary Search**: Books got rotated (like a circular shelf that spun), but they're still in alphabetical order, just starting from a different point

### Visual Concept: The Search Space

```
Classic Binary Search (sorted array):
[1, 2, 3, 4, 5, 6, 7, 8, 9]
          ^
    Always cut in middle

Modified Binary Search (rotated array):
[6, 7, 8, 9, 1, 2, 3, 4, 5]
          ^
    Cut in middle, but need to figure out which half is sorted!
```

## Pattern Overview

**Modified Binary Search** adapts the classic binary search algorithm to solve problems beyond finding elements in sorted arrays. It works on sorted or partially sorted data and reduces search space by half in each iteration.

### When to Use
- Searching in rotated sorted arrays
- Finding peak elements
- Searching in 2D matrices
- Finding first/last occurrence
- Finding minimum in rotated sorted array
- Search space reduction problems

### Key Characteristics
- Works on sorted or partially sorted data
- Divides search space in half each iteration
- Time complexity: O(log n)
- Requires identifying how to eliminate half the search space

### Pattern Identification
Look for this pattern when you see:
- "Find in rotated sorted array"
- "Find peak element"
- "Search in 2D matrix"
- "Find first/last occurrence"
- "Find minimum/maximum in rotated array"
- Problems with sorted data or search space

### How to Recognize This Pattern (Beginner Guide)

Ask yourself these questions when you see a problem:

1. **Is the data sorted or partially sorted?**
   - "Sorted array", "rotated sorted array", "ascending/descending"
   - Even if shuffled, is there ORDER somewhere?

2. **Do you need to search efficiently?**
   - Can't afford O(n) time? Need O(log n)?
   - Large dataset where linear search is too slow?

3. **Can you eliminate half the possibilities each step?**
   - Can you look at one element and rule out half the array?
   - Is there a clear "go left" or "go right" decision?

**Red Flags (Don't use binary search if):**
- Data is completely random/unsorted
- You need to examine every element
- Problem requires multiple passes through all elements

**Green Flags (Use modified binary search if):**
- See keywords: "sorted", "rotated", "log n time", "efficiently"
- Answer lies in a sorted or semi-sorted space
- You can make decisions that cut search space

### Visual Pattern Recognition

```
Recognize the pattern:

CLASSIC SORTED           ROTATED SORTED          2D MATRIX (sorted)
[1,2,3,4,5,6,7]         [5,6,7,1,2,3,4]         [1,  4,  7, 11]
                                                  [2,  5,  8, 12]
                                                  [3,  6,  9, 16]
                                                  [10, 13, 14, 17]

All of these can use BINARY SEARCH concepts!
```

---

## Example 1: Search in Rotated Sorted Array (TypeScript)

### Problem
Given a rotated sorted array `nums` (rotated at an unknown pivot) and a target value, return the index of the target if it exists, otherwise return -1. You must write an algorithm with O(log n) runtime complexity.

**LeetCode**: [33. Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)

### Solution

```typescript
/**
 * Search in rotated sorted array using modified binary search
 * @param nums - Rotated sorted array
 * @param target - Target value to find
 * @returns Index of target, or -1 if not found
 */
function search(nums: number[], target: number): number {
    let left: number = 0;
    let right: number = nums.length - 1;

    while (left <= right) {
        const mid: number = Math.floor((left + right) / 2);

        // Found target
        if (nums[mid] === target) {
            return mid;
        }

        // Determine which half is sorted
        // Left half is sorted
        if (nums[left] <= nums[mid]) {
            // Check if target is in sorted left half
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;  // Search left half
            } else {
                left = mid + 1;   // Search right half
            }
        }
        // Right half is sorted
        else {
            // Check if target is in sorted right half
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;   // Search right half
            } else {
                right = mid - 1;  // Search left half
            }
        }
    }

    return -1;  // Target not found
}

// Example usage
console.log(search([4, 5, 6, 7, 0, 1, 2], 0));     // Output: 4
// Explanation: 0 is at index 4

console.log(search([4, 5, 6, 7, 0, 1, 2], 3));     // Output: -1
// Explanation: 3 is not in array

console.log(search([1], 0));                        // Output: -1

console.log(search([1, 3], 3));                     // Output: 1

console.log(search([3, 1], 1));                     // Output: 1
```

### Step-by-Step Code Walkthrough

Let's break down the code line by line for beginners:

```typescript
function search(nums: number[], target: number): number {
    let left: number = 0;                    // Start of search range
    let right: number = nums.length - 1;     // End of search range

    while (left <= right) {          // Keep searching while range is valid
        const mid: number = Math.floor((left + right) / 2);  // Middle point
```

**Why `Math.floor((left + right) / 2)`?**
- This finds the middle index
- `Math.floor` rounds down (so for indices 0-6, mid is 3)
- Alternative: `left + Math.floor((right - left) / 2)` (avoids overflow in some languages)

```typescript
        if (nums[mid] === target) {
            return mid;              // Lucky! Found it right away
        }
```

**First Check**: Did we get lucky and hit the target on our first guess?

```typescript
        if (nums[left] <= nums[mid]) {
            // Left half is sorted: [left...mid]
```

**Critical Insight**: In a rotated array, AT LEAST ONE HALF is always sorted!
- If `nums[left] <= nums[mid]`, the left portion goes up smoothly (sorted)
- Example: `[4,5,6,7,0,1,2]` - left half `[4,5,6,7]` is sorted

```typescript
            if (nums[left] <= target && target < nums[mid]) {
                right = mid - 1;     // Target is in sorted left half
            } else {
                left = mid + 1;      // Target must be in right half
            }
        }
```

**Decision for sorted left half**:
- Is target in the range `[nums[left], nums[mid])`?
- If YES: search left (set `right = mid - 1`)
- If NO: search right (set `left = mid + 1`)

```typescript
        else {
            // Right half is sorted: [mid...right]
            if (nums[mid] < target && target <= nums[right]) {
                left = mid + 1;      // Target is in sorted right half
            } else {
                right = mid - 1;     // Target must be in left half
            }
        }
```

**Decision for sorted right half**:
- Is target in the range `(nums[mid], nums[right]]`?
- If YES: search right (set `left = mid + 1`)
- If NO: search left (set `right = mid - 1`)

### Visual Explanation with Search Space Diagrams

**Example**: `nums = [4,5,6,7,0,1,2], target = 0`

```
Initial State:
┌─────────────────────────────────────┐
│ 4   5   6   7   0   1   2           │  Array
│ ↑           ↑           ↑           │
│ L           M           R           │  L=left, M=mid, R=right
└─────────────────────────────────────┘
Target = 0
```

**Iteration 1:**
```
Array: [4, 5, 6, 7, 0, 1, 2]
        L           M       R
        0           3       6

nums[mid] = 7, target = 0
Is nums[mid] == target? NO

Which half is sorted?
  nums[left]=4 <= nums[mid]=7 → LEFT HALF is sorted [4,5,6,7]

Is target in sorted left half [4,7]?
  Is 4 <= 0 < 7? NO

→ Eliminate left half, search right half

Search Space After:
┌─────────────────────────────────────┐
│ 4   5   6   7 │ 0   1   2           │
│ ╳   ╳   ╳   ╳ │ ↑       ↑           │
│  (eliminated) │ L       R           │
└─────────────────────────────────────┘
```

**Iteration 2:**
```
Array: [4, 5, 6, 7, 0, 1, 2]
                    L   M   R
                    4   5   6

nums[mid] = 1, target = 0
Is nums[mid] == target? NO

Which half is sorted?
  nums[left]=0 <= nums[mid]=1? NO (0 > 1 is FALSE, so right is sorted)
  → RIGHT HALF is sorted [1,2]

Is target in sorted right half [1,2]?
  Is 1 < 0 <= 2? NO

→ Eliminate right half, search left half

Search Space After:
┌─────────────────────────────────────┐
│ 4   5   6   7 │ 0 │ 1   2           │
│ ╳   ╳   ╳   ╳ │ ↑ │ ╳   ╳           │
│  (eliminated) │L/R│(eliminated)     │
└─────────────────────────────────────┘
```

**Iteration 3:**
```
Array: [4, 5, 6, 7, 0, 1, 2]
                    ↑
                   L/M/R
                    4

nums[mid] = 0, target = 0
Is nums[mid] == target? YES!

→ Return index 4
```

### Key Insight Explained Simply

**The Golden Rule**: In a rotated sorted array, when you pick a middle element:
- **At least ONE half will be properly sorted** (increasing order)
- **The other half contains the rotation point** (the break where big numbers become small)

**How to use this:**
1. Check which half is sorted (easy to verify: `left <= mid` or `mid <= right`)
2. Check if your target is in the sorted half (easy to verify: range check)
3. If target is in sorted half → search there
4. If target is NOT in sorted half → must be in the other half

**Visual Aid**: Think of it like a broken escalator
```
Normal Escalator (sorted):      Broken Escalator (rotated):
     7                               4 ← rotation point
     6                               5
     5                               6
     4                               7
     3                               0
     2                               1
     1                               2
     0                               3
     ↑                               ↑
  Bottom                          Bottom

At least one section still goes "up" smoothly!
```

---

## Example 2: Find Minimum in Rotated Sorted Array (TypeScript)

### Problem
Suppose an array of length `n` sorted in ascending order is rotated between 1 and `n` times. Find the minimum element.

**LeetCode**: [153. Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)

### Solution

```typescript
/**
 * Find minimum element in rotated sorted array
 * @param nums - Rotated sorted array with unique elements
 * @returns Minimum element in the array
 */
function findMin(nums: number[]): number {
    let left: number = 0;
    let right: number = nums.length - 1;

    // If array is not rotated (already sorted)
    if (nums[left] < nums[right]) {
        return nums[left];
    }

    while (left < right) {
        const mid: number = Math.floor((left + right) / 2);

        // Check if mid+1 is the minimum
        // (mid is greater than its next element)
        if (mid < nums.length - 1 && nums[mid] > nums[mid + 1]) {
            return nums[mid + 1];
        }

        // Check if mid is the minimum
        // (mid is smaller than its previous element)
        if (mid > 0 && nums[mid] < nums[mid - 1]) {
            return nums[mid];
        }

        // Decide which half to search
        // If left half is sorted, minimum is in right half
        if (nums[left] <= nums[mid]) {
            left = mid + 1;
        }
        // Right half is sorted, minimum is in left half
        else {
            right = mid;
        }
    }

    return nums[left];
}

/**
 * Alternative cleaner approach to find minimum
 * @param nums - Rotated sorted array with unique elements
 * @returns Minimum element in the array
 */
function findMinAlternative(nums: number[]): number {
    let left: number = 0;
    let right: number = nums.length - 1;

    while (left < right) {
        const mid: number = Math.floor((left + right) / 2);

        // If mid element is greater than right element,
        // minimum must be in right half
        if (nums[mid] > nums[right]) {
            left = mid + 1;
        }
        // Otherwise, minimum is in left half (including mid)
        else {
            right = mid;
        }
    }

    return nums[left];
}

// Example usage
// Example 1
const nums1: number[] = [3, 4, 5, 1, 2];
console.log(findMin(nums1));  // Output: 1
// Explanation: Original array was [1,2,3,4,5] rotated 3 times

// Example 2
const nums2: number[] = [4, 5, 6, 7, 0, 1, 2];
console.log(findMin(nums2));  // Output: 0
// Explanation: Original array was [0,1,2,4,5,6,7] rotated 4 times

// Example 3
const nums3: number[] = [11, 13, 15, 17];
console.log(findMin(nums3));  // Output: 11
// Explanation: Array is not rotated (or rotated 0 times)

// Example 4
const nums4: number[] = [2, 1];
console.log(findMin(nums4));  // Output: 1

// Example 5 - Using alternative approach
const nums5: number[] = [3, 4, 5, 1, 2];
console.log(findMinAlternative(nums5));  // Output: 1
```

### Step-by-Step Code Walkthrough (Alternative Approach)

The cleaner approach (`findMinAlternative`) is easier to understand:

```typescript
function findMinAlternative(nums: number[]): number {
    let left: number = 0;
    let right: number = nums.length - 1;

    while (left < right) {  // Note: left < right (not <=)
```

**Why `left < right` instead of `left <= right`?**
- We're finding minimum, not searching for a target
- When `left == right`, we've narrowed down to one element (the answer!)
- No need to check equality because we're shrinking the range

```typescript
        const mid: number = Math.floor((left + right) / 2);
```

**Middle calculation**: Find the midpoint to split the search space

```typescript
        if (nums[mid] > nums[right]) {
            // Minimum MUST be in right half
            left = mid + 1;
        }
```

**Case 1: `nums[mid] > nums[right]`**
- Example: `[4,5,6,7,0,1,2]`, mid=7, right=2
- If middle is BIGGER than right, there's a "break" (rotation) between mid and right
- The minimum is definitely in the right half (where the break is)
- We can skip mid because it's definitely not the minimum

```typescript
        else {
            // nums[mid] <= nums[right]
            // Minimum could be mid OR in left half
            right = mid;
        }
```

**Case 2: `nums[mid] <= nums[right]`**
- Example: `[0,1,2]` or `[6,7,0,1,2]` with mid=1, right=2
- Middle to right is sorted (no break here)
- Minimum must be in left half OR could be mid itself
- Keep mid in range (set `right = mid`, not `mid - 1`)

### Visual Explanation with Search Space

**Example**: `nums = [4,5,6,7,0,1,2]`

```
Initial State - Where is the minimum?
┌─────────────────────────────────────┐
│ 4   5   6   7   0   1   2           │
│ ↑           ↑       *   ↑           │  * = minimum we're looking for
│ L           M           R           │
└─────────────────────────────────────┘

Original sorted: [0,1,2,4,5,6,7]
Rotated 4 times: [4,5,6,7,0,1,2]
                          ↑
                    Inflection point (minimum)
```

**Iteration 1:**
```
Array: [4, 5, 6, 7, 0, 1, 2]
        L           M       R
        0           3       6

nums[mid] = 7, nums[right] = 2

Is 7 > 2? YES
→ There's a rotation/break between mid and right
→ Minimum is in right half

Why? Because if array was sorted, mid would be <= right.
Since mid > right, there's a "drop" somewhere to the right.

Search Space After:
┌─────────────────────────────────────┐
│ 4   5   6   7 │ 0   1   2           │
│ ╳   ╳   ╳   ╳ │ ↑       ↑           │
│  (eliminated) │ L       R           │
└─────────────────────────────────────┘
```

**Iteration 2:**
```
Array: [4, 5, 6, 7, 0, 1, 2]
                    L   M   R
                    4   5   6

nums[mid] = 1, nums[right] = 2

Is 1 > 2? NO
→ From mid to right is sorted [1,2]
→ Minimum could be mid or to the left of mid
→ Keep mid in search range

Search Space After:
┌─────────────────────────────────────┐
│ 4   5   6   7 │ 0   1 │ 2           │
│ ╳   ╳   ╳   ╳ │ ↑   ↑ │ ╳           │
│  (eliminated) │ L   R │(eliminated) │
└─────────────────────────────────────┘
```

**Iteration 3:**
```
Array: [4, 5, 6, 7, 0, 1, 2]
                    L/M R
                    4   5

nums[mid] = 0, nums[right] = 1

Is 0 > 1? NO
→ From mid to right is sorted [0,1]
→ Minimum could be mid
→ Keep mid in search range

Search Space After:
┌─────────────────────────────────────┐
│ 4   5   6   7 │ 0 │ 1   2           │
│ ╳   ╳   ╳   ╳ │L/R│ ╳   ╳           │
│  (eliminated) │   │(eliminated)     │
└─────────────────────────────────────┘

left == right → STOP
Return nums[4] = 0
```

### Key Insight Explained Simply

**The Inflection Point**: The minimum is where the array "breaks"
```
Sorted:  [0, 1, 2, 4, 5, 6, 7]  ← smooth increase

Rotated: [4, 5, 6, 7, 0, 1, 2]  ← breaks here!
                      ↑
                   minimum

Visual Pattern:
     7 ←───┐        Going up...
     6     │
     5     │        Then DROPS!
     4 ←─────rotation point
     2
     1
     0 ← minimum
```

**The Trick**:
- Compare middle with right boundary (not left!)
- If mid > right → rotation is to the right → search right
- If mid <= right → this section is sorted → search left (minimum is earlier)

**Why compare with `right` not `left`?**
```
Example: [4,5,6,7,0,1,2]
          L     M     R

If we compare mid with left:
  nums[mid]=7, nums[left]=4
  7 > 4 (true for both sorted AND rotated!)
  Can't tell which way to go!

If we compare mid with right:
  nums[mid]=7, nums[right]=2
  7 > 2 → CLEARLY rotated to the right!
  Perfect signal!
```

---

## Time & Space Complexity

### Example 1: Search in Rotated Array
- **Time Complexity**: O(log n) - Binary search
- **Space Complexity**: O(1) - Constant space

### Example 2: Find Minimum
- **Time Complexity**: O(log n) - Binary search
- **Space Complexity**: O(1) - Constant space

---

## Common Variations

1. **Search in Rotated Sorted Array**
   - Find target in rotated array
   - LeetCode: [33. Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)
   - LeetCode: [81. Search in Rotated Sorted Array II](https://leetcode.com/problems/search-in-rotated-sorted-array-ii/) (with duplicates)

2. **Find Minimum in Rotated Array**
   - LeetCode: [153. Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)
   - LeetCode: [154. Find Minimum in Rotated Sorted Array II](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array-ii/) (with duplicates)

3. **First and Last Position**
   - Find first and last occurrence of element
   - LeetCode: [34. Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/)

4. **Peak Element**
   - Find peak element in array
   - LeetCode: [162. Find Peak Element](https://leetcode.com/problems/find-peak-element/)

5. **Search 2D Matrix**
   - Search in row and column sorted matrix
   - LeetCode: [74. Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/)
   - LeetCode: [240. Search a 2D Matrix II](https://leetcode.com/problems/search-a-2d-matrix-ii/)

---

## Practice Problems

### Easy
1. [704. Binary Search](https://leetcode.com/problems/binary-search/)
2. [35. Search Insert Position](https://leetcode.com/problems/search-insert-position/)

### Medium
3. [33. Search in Rotated Sorted Array](https://leetcode.com/problems/search-in-rotated-sorted-array/)
4. [153. Find Minimum in Rotated Sorted Array](https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/)
5. [34. Find First and Last Position of Element in Sorted Array](https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/)
6. [162. Find Peak Element](https://leetcode.com/problems/find-peak-element/)
7. [74. Search a 2D Matrix](https://leetcode.com/problems/search-a-2d-matrix/)
8. [240. Search a 2D Matrix II](https://leetcode.com/problems/search-a-2d-matrix-ii/)

### Hard
9. [4. Median of Two Sorted Arrays](https://leetcode.com/problems/median-of-two-sorted-arrays/)

---

## Key Takeaways

1. **Classic binary search**: Foundation for all variations
2. **Identify sorted half**: Key insight for rotated array problems
3. **Invariant**: Maintain property that answer is always in search range
4. **Avoid infinite loops**: Ensure left/right pointers always make progress
5. **Edge cases**: Single element, two elements, not rotated
6. **Template**:
   ```
   while left < right:
       mid = (left + right) // 2
       if condition_to_go_right:
           left = mid + 1
       else:
           right = mid
   ```

[← Previous: Overlapping Intervals](./08-overlapping-intervals.md) | [Back to Index](./README.md) | [Next: Binary Tree Traversal →](./10-binary-tree-traversal.md)
