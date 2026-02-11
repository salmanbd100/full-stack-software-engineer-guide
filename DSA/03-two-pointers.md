# Two Pointers Pattern

## 🎓 What is Two Pointers? (In Simple Words)

Imagine you and a friend are searching for a specific pair of books on a shelf. Instead of one person checking every possible combination (which takes forever!), you both start from opposite ends and work your way toward each other. That's exactly what the Two Pointers pattern does!

**Simple Definition:** Two Pointers is a technique where we use two "markers" (pointers) to traverse through an array or list, either moving towards each other or in the same direction. This eliminates the need for nested loops and makes our code faster.

## 🌍 Real-World Analogy

Think of a **number guessing game**:
- You're thinking of a sum: **15**
- You have sorted numbers: [1, 3, 5, 7, 9, 11, 13]
- Two players, Alice and Bob:
  - Alice starts at the **left** (1)
  - Bob starts at the **right** (13)
  - They add their numbers: 1 + 13 = 14 (too small!)
  - Alice moves right → 3 + 13 = 16 (too big!)
  - Bob moves left → 3 + 11 = 14 (too small!)
  - Alice moves right → 5 + 11 = 16 (too big!)
  - Bob moves left → 5 + 9 = 14 (too small!)
  - Alice moves right → 7 + 9 = 16 (too big!)
  - Bob moves left → 7 + 7 = 14... oops they met!

This smart movement eliminates tons of combinations without checking them!

---

## Pattern Overview

The **Two Pointers** pattern uses two pointers to iterate through a data structure (usually an array or linked list) in a coordinated way. The pointers can move towards each other, in the same direction, or at different speeds.

### When to Use
- Working with sorted arrays or linked lists
- Finding pairs or triplets with specific properties
- Removing duplicates in-place
- Palindrome problems
- Partitioning arrays

### Key Characteristics
- Two pointers start at different positions (start/end, or both at start)
- Pointers move based on certain conditions
- Often eliminates the need for nested loops
- Reduces time complexity from O(n²) to O(n)

### Pattern Identification
Look for this pattern when you see:
- "Find a pair that sums to target"
- "Remove duplicates from sorted array"
- "Check if string is a palindrome"
- "Sort array with 0s, 1s, and 2s"
- Problems involving sorted arrays

---

## 📚 How It Works (Visual Explanation)

### Converging Pointers (Moving Towards Each Other)

**Scenario:** Find two numbers that sum to 9 in a sorted array

```
Array: [2, 7, 11, 15]
Target: 9

Step 1: Initialize pointers
        L              R
Array: [2,  7,  11,  15]
        ↑               ↑
      left            right

Current sum: 2 + 15 = 17
17 > 9 → Too big! Move right pointer left

────────────────────────────────────────

Step 2: Move right pointer
        L          R
Array: [2,  7,  11,  15]
        ↑       ↑
      left    right

Current sum: 2 + 11 = 13
13 > 9 → Still too big! Move right pointer left

────────────────────────────────────────

Step 3: Move right pointer
        L      R
Array: [2,  7,  11,  15]
        ↑   ↑
      left right

Current sum: 2 + 7 = 9
9 = 9 → FOUND! ✓

Answer: indices [0, 1] (or [1, 2] if 1-indexed)
```

### Same Direction Pointers (Moving Together)

**Scenario:** Remove duplicates from sorted array [1, 1, 2, 2, 3]

```
Step 1: Both start at beginning
        S  F
Array: [1, 1, 2, 2, 3]
        ↑  ↑
      slow fast

slow = unique element pointer
fast = exploring pointer

────────────────────────────────────────

Step 2: fast finds duplicate
        S     F
Array: [1, 1, 2, 2, 3]
        ↑     ↑
      slow  fast

arr[fast] ≠ arr[slow] → Found new unique!
Move slow, copy value

────────────────────────────────────────

Step 3: Copy unique element
           S     F
Array: [1, 2, 2, 2, 3]
           ↑     ↑
         slow  fast

Continue until fast reaches end...

────────────────────────────────────────

Final: All unique elements at front
           S        F
Array: [1, 2, 3, 2, 3]
           ↑        ↑
         slow     fast

Return slow + 1 = 3 (length of unique portion)
```

### Why Two Pointers is Fast

**Without Two Pointers (Brute Force - O(n²)):**
```
For each element (i):
    For each other element (j):
        Check if arr[i] + arr[j] = target

Total comparisons: n × (n-1) / 2
For n=1000: ~500,000 comparisons!
```

**With Two Pointers (O(n)):**
```
Start at both ends
Move pointers based on sum
Each element checked at most once

Total comparisons: n
For n=1000: ~1,000 comparisons!
```

**Speed improvement: 500× faster!**

---

## Example 1: Two Sum II - Sorted Array (TypeScript)

### Problem
Given a **1-indexed** array of integers `numbers` that is already sorted in non-decreasing order, find two numbers such that they add up to a specific `target` number. Return the indices of the two numbers (1-indexed).

**LeetCode**: [167. Two Sum II - Input Array Is Sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/)

### Solution

```typescript
/**
 * Find two numbers that add up to target using two pointers
 * @param numbers - Sorted array of integers
 * @param target - Target sum
 * @returns 1-indexed positions of the two numbers
 */
function twoSum(numbers: number[], target: number): number[] {
    // Initialize two pointers
    let left: number = 0;                    // Start pointer at beginning
    let right: number = numbers.length - 1;  // End pointer at end

    while (left < right) {
        const currentSum: number = numbers[left] + numbers[right];

        if (currentSum === target) {
            // Found the pair! Return 1-indexed positions
            return [left + 1, right + 1];
        } else if (currentSum < target) {
            // Sum is too small, move left pointer right to increase sum
            left++;
        } else {
            // Sum is too large, move right pointer left to decrease sum
            right--;
        }
    }

    // No solution found (problem guarantees a solution exists)
    return [];
}

// Example usage
console.log(twoSum([2, 7, 11, 15], 9));     // Output: [1, 2]
// Explanation: numbers[0] + numbers[1] = 2 + 7 = 9

console.log(twoSum([2, 3, 4], 6));          // Output: [1, 3]
// Explanation: numbers[0] + numbers[2] = 2 + 4 = 6

console.log(twoSum([-1, 0], -1));           // Output: [1, 2]
// Explanation: numbers[0] + numbers[1] = -1 + 0 = -1
```

### 🔍 Detailed Line-by-Line Explanation

#### Initialization
```typescript
let left: number = 0;                    // Start pointer at beginning
let right: number = numbers.length - 1;  // End pointer at end
```

**Why start at opposite ends?**
- The array is **sorted** (this is crucial!)
- Smallest values are on the left
- Largest values are on the right
- By starting at extremes, we can intelligently adjust the sum

**Example:**
```
numbers = [2, 7, 11, 15], target = 9

Initial state:
        L               R
       [2,  7,  11,  15]
        ↑               ↑
    smallest       largest
```

#### The Main Loop
```typescript
while (left < right) {
```

**Why `left < right`?**
- We need TWO different numbers
- When `left === right`, they're pointing to the same number
- When `left > right`, they've crossed (already checked everything)

#### Calculating Current Sum
```typescript
const currentSum: number = numbers[left] + numbers[right];
```

**Example step-by-step:**
```
Iteration 1:
left = 0, right = 3
numbers[0] = 2, numbers[3] = 15
currentSum = 2 + 15 = 17
```

#### Decision Logic (The Smart Part!)
```typescript
if (currentSum === target) {
    return [left + 1, right + 1];
```

**If we found it:** Return indices as 1-indexed (add 1 to each)

```typescript
} else if (currentSum < target) {
    left++;
```

**If sum is too small:**
- We need a BIGGER sum
- Array is sorted → moving left pointer RIGHT gives us a bigger number
- Example: [2, 7, 11, 15], if sum is too small, use 7 instead of 2

**Visual:**
```
Current: 2 + 11 = 13 (too small, target = 18)
         ↑       ↑
        left   right

Move left right to get bigger number:
Next:    7 + 11 = 18 ✓
         ↑       ↑
        left   right
```

```typescript
} else {
    right--;
```

**If sum is too big:**
- We need a SMALLER sum
- Array is sorted → moving right pointer LEFT gives us a smaller number
- Example: [2, 7, 11, 15], if sum is too big, use 11 instead of 15

**Visual:**
```
Current: 7 + 15 = 22 (too big, target = 18)
         ↑       ↑
        left   right

Move right left to get smaller number:
Next:    7 + 11 = 18 ✓
         ↑       ↑
        left   right
```

#### Complete Walkthrough Example

**Input:** `numbers = [2, 7, 11, 15]`, `target = 9`

```
Step 1:
        L               R
       [2,  7,  11,  15]
        ↑               ↑
   left=0          right=3

currentSum = 2 + 15 = 17
17 > 9 → too big, move right left
right--

────────────────────────────────────────

Step 2:
        L           R
       [2,  7,  11,  15]
        ↑           ↑
   left=0      right=2

currentSum = 2 + 11 = 13
13 > 9 → still too big, move right left
right--

────────────────────────────────────────

Step 3:
        L       R
       [2,  7,  11,  15]
        ↑       ↑
   left=0  right=1

currentSum = 2 + 7 = 9
9 = 9 → FOUND! ✓

Return [1, 2] (1-indexed)
```

### Explanation Summary
1. **Setup**: Place one pointer at the start (`left`) and one at the end (`right`)
2. **Calculate sum**: Add values at both pointers
3. **Decision**:
   - If sum equals target → Found! Return indices
   - If sum < target → Need larger sum, move `left` pointer right
   - If sum > target → Need smaller sum, move `right` pointer left
4. **Why it works**: Array is sorted, so moving pointers strategically adjusts the sum
5. **Time saved**: No need to check all pairs (O(n²)), just one pass (O(n))

---

## Example 2: Container With Most Water (TypeScript)

### Problem
Given `n` non-negative integers `height` where each represents a point at coordinate `(i, height[i])`, find two lines that together with the x-axis form a container that holds the most water.

**LeetCode**: [11. Container With Most Water](https://leetcode.com/problems/container-with-most-water/)

### Solution

```typescript
/**
 * Find maximum water area using two pointers
 * @param height - Array of non-negative integers representing heights
 * @returns Maximum area of water that can be contained
 */
function maxArea(height: number[]): number {
    // Initialize pointers at both ends
    let left: number = 0;
    let right: number = height.length - 1;
    let maxAreaValue: number = 0;

    while (left < right) {
        // Calculate width between pointers
        const width: number = right - left;

        // Area is limited by the shorter line
        // Area = width × min(height[left], height[right])
        const currentArea: number = width * Math.min(height[left], height[right]);

        // Update maximum area
        maxAreaValue = Math.max(maxAreaValue, currentArea);

        // Move the pointer pointing to shorter line
        // This is the key insight: moving the shorter line might find a taller one
        // Moving the taller line will only decrease area (width decreases, height can't increase)
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }

    return maxAreaValue;
}

// Example usage

// Example 1
const height1: number[] = [1, 8, 6, 2, 5, 4, 8, 3, 7];
console.log(maxArea(height1));  // Output: 49
// Explanation: Lines at index 1 (height=8) and index 8 (height=7)
// Area = 7 × min(8, 7) = 49

// Example 2
const height2: number[] = [1, 1];
console.log(maxArea(height2));  // Output: 1
// Explanation: Only two lines, area = 1 × min(1, 1) = 1

// Example 3
const height3: number[] = [4, 3, 2, 1, 4];
console.log(maxArea(height3));  // Output: 16
// Explanation: Lines at index 0 and 4 (both height=4)
// Area = 4 × min(4, 4) = 16
```

### 🔍 Detailed Line-by-Line Explanation

#### Initialization
```typescript
let left: number = 0;
let right: number = height.length - 1;
let maxAreaValue: number = 0;
```

**Setup:**
- `left`: Start at leftmost line
- `right`: Start at rightmost line
- `max_area`: Track the maximum area found so far

**Why start at extremes?**
- We begin with the WIDEST possible container
- As we move pointers inward, width decreases
- We need to find taller lines to compensate for lost width

#### The Main Loop
```typescript
while (left < right) {
```

Same as before - we need two different lines to form a container

#### Area Calculation
```typescript
const width: number = right - left;
const currentArea: number = width * Math.min(height[left], height[right]);
```

**The Water Container Physics:**

Think of it like a real container:
```
height[left] = 8        height[right] = 7

      8                       7
      █                       █
      █                       █
      █   ~~~~~~~~~~~~~~~     █
      █   ~~~water~~~~~~~     █
      █   ~~~~~~~~~~~~~~~     █
      █   ~~~~~~~~~~~~~~~     █
      █   ~~~~~~~~~~~~~~~     █
      ▼                       ▼
     left                   right

Water level = min(8, 7) = 7 (limited by shorter line!)
Width = right - left
Area = 7 × width
```

**Why minimum height?**
Water would spill over the shorter side! You can't fill higher than the shorter line.

**Example:**
```
height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
         ↑                          ↑
       left=0                    right=8

width = 8 - 0 = 8
height[0] = 1, height[8] = 7
Water level = min(1, 7) = 1 (limited by the 1!)

      8           8
      █           █   7
      █   6       █   █
      █   █   5   █   █
      █   █   █ 4 █ 3 █
      █   █ 2 █ █ █ █ █
  ~~~ █ ~~█~█~█~█~█~█~█ ~~~
    1 █   █   █   █   █   (water level = 1)
      ▼               ▼
    left=0         right=8

current_area = 8 × 1 = 8
```

#### Update Maximum Area
```typescript
maxAreaValue = Math.max(maxAreaValue, currentArea);
```

Simple - keep track of the best (largest) area we've found so far

#### The Greedy Decision (Most Important Part!)
```typescript
if (height[left] < height[right]) {
    left++;
} else {
    right--;
}
```

**The Strategy:**
- Always move the pointer pointing to the SHORTER line
- This is a greedy choice that might seem counterintuitive at first!

**Why move the shorter line?**

Let's think about both options:

**Option 1: Move the TALLER line**
```
Current:
      8           7
      █           █
      █           █
      █   ~~~~~   █
      ▼           ▼
    left        right

If we move the taller line (height=8):
      8       7   ?
      █       █   █
      █       █   █
      █   ~~~ █   █
              ▼   ▼
            right new_right

Width DECREASED (guaranteed)
Height = min(7, ?) ≤ 7 (can't be better than 7)
Result: Area can ONLY decrease or stay same!
```

**Option 2: Move the SHORTER line**
```
Current:
      8           7
      █           █
      █           █
      █   ~~~~~   █
      ▼           ▼
    left        right

If we move the shorter line (height=7):
      8   ?       7
      █   █
      █   █
      █   █
      ▼   ▼
    left new_left

Width DECREASED (guaranteed)
Height = min(8, ?)
If ? > 7: Area MIGHT increase! (taller line compensates for lost width)
If ? ≤ 7: Area decreases
Result: There's HOPE for improvement!
```

**Concrete Example:**
```
height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
           ↑                       ↑
         left=0                right=8
         h=1                    h=7

Current: width=8, min_height=1, area=8

Should we move left or right?
- height[left]=1 < height[right]=7
- Move the SHORTER one (left)

After moving left:
height = [1, 8, 6, 2, 5, 4, 8, 3, 7]
              ↑                    ↑
            left=1             right=8
            h=8                 h=7

New: width=7, min_height=7, area=49
WOW! Area increased from 8 to 49! ✓
```

#### Complete Walkthrough Example

**Input:** `height = [1, 8, 6, 2, 5, 4, 8, 3, 7]`

```
Step 1: L=0, R=8
      8           8   7
      █           █   █
      █   6   5   █   █
      █   █   █ 4 █ 3 █
      █   █ 2 █ █ █ █ █
  ~~~ █ ~~█~█~█~█~█~█~█ ~~~
    1 █
      ↑               ↑

width=8, min(1,7)=1, area=8
height[0]=1 < height[8]=7 → move left++
max_area = 8

────────────────────────────────────────

Step 2: L=1, R=8
      8           8   7
      █   ~~~~~~~ █   █
      █   6 ~~~~~ █   █
      █   █   5   █   █
      █   █   █ 4 █ 3 █
      █   █ 2 █ █ █ █ █
      █   █   █   █   █
      ↑               ↑

width=7, min(8,7)=7, area=49
height[1]=8 > height[8]=7 → move right--
max_area = 49 (updated!)

────────────────────────────────────────

Step 3: L=1, R=7
      8           8
      █           █
      █   6   5   █
      █   █   █ 4 █ 3
      █   █ 2 █ █ █ ~~~
      █   █   █   █ ~~~
      █   █   █   █ ~~~
      ↑           ↑

width=6, min(8,3)=3, area=18
height[1]=8 > height[7]=3 → move right--
max_area = 49 (no change)

...continue until left meets right...

Final max_area = 49
```

### Explanation Summary
1. **Setup**: Start with widest possible container (left=0, right=n-1)
2. **Area calculation**: `width × min(left_height, right_height)`
3. **Key insight**: Area is limited by the shorter line (water physics!)
4. **Greedy approach**:
   - Always move the pointer pointing to the shorter line
   - Why? Moving the taller line can't increase area (width decreases, and min height can't increase)
   - Moving the shorter line might find a taller line, potentially increasing area
5. **Termination**: When pointers meet, we've checked all possibilities

---

## Time & Space Complexity

### Example 1: Two Sum II
- **Time Complexity**: O(n) - Single pass with two pointers
- **Space Complexity**: O(1) - Only using two pointer variables

### Example 2: Container With Most Water
- **Time Complexity**: O(n) - Single pass through array
- **Space Complexity**: O(1) - Constant extra space

---

## Common Variations

1. **Opposite Direction (Converging Pointers)**
   - Start from both ends, move towards each other
   - Used in: Two Sum II, Container With Most Water, Valid Palindrome
   - LeetCode: [125. Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)

2. **Same Direction (Fast & Slow - different from Fast & Slow Pointers pattern)**
   - Both pointers start at the beginning, move at different rates
   - Used in: Remove duplicates, Move zeros
   - LeetCode: [26. Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/)

3. **Three Pointers**
   - Extension to three pointers for triplet problems
   - LeetCode: [15. 3Sum](https://leetcode.com/problems/3sum/)

4. **Partition Pattern**
   - Partition array based on condition (Dutch National Flag)
   - LeetCode: [75. Sort Colors](https://leetcode.com/problems/sort-colors/)

5. **Sliding Window Variant**
   - Dynamic window size using two pointers
   - LeetCode: [3. Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)

---

## Practice Problems

### Easy
1. [167. Two Sum II - Input Array Is Sorted](https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/)
2. [125. Valid Palindrome](https://leetcode.com/problems/valid-palindrome/)
3. [26. Remove Duplicates from Sorted Array](https://leetcode.com/problems/remove-duplicates-from-sorted-array/)
4. [283. Move Zeroes](https://leetcode.com/problems/move-zeroes/)

### Medium
5. [11. Container With Most Water](https://leetcode.com/problems/container-with-most-water/)
6. [15. 3Sum](https://leetcode.com/problems/3sum/)
7. [16. 3Sum Closest](https://leetcode.com/problems/3sum-closest/)
8. [75. Sort Colors](https://leetcode.com/problems/sort-colors/)
9. [80. Remove Duplicates from Sorted Array II](https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/)

### Hard
10. [42. Trapping Rain Water](https://leetcode.com/problems/trapping-rain-water/)

---

## ⚠️ Common Pitfalls & How to Avoid Them

### 1. Using Two Pointers on Unsorted Arrays (When It Requires Sorted)

```typescript
// ❌ WRONG - Two Sum with two pointers on UNSORTED array
function twoSum(nums: number[], target: number): number[] {
    let left: number = 0, right: number = nums.length - 1;
    while (left < right) {
        const sum: number = nums[left] + nums[right];
        if (sum === target) return [left, right];
        else if (sum < target) left++;
        else right--;
    }
    return [];
}

// This ONLY works if array is sorted!
// nums = [3, 2, 4], target = 6
// Will MISS the answer [2, 4] at indices 1 and 2!

// ✓ CORRECT - Either sort first OR use a different approach
function twoSumUnsorted(nums: number[], target: number): number[] {
    const map: Map<number, number> = new Map();
    for (let i: number = 0; i < nums.length; i++) {
        if (map.has(target - nums[i])) {
            return [map.get(target - nums[i])!, i];
        }
        map.set(nums[i], i);
    }
    return [];
}
```

### 2. Not Checking Pointer Boundaries

```typescript
// ❌ WRONG - Infinite loop possible
function isPalindrome(s: string): boolean {
    let left: number = 0, right: number = s.length - 1;
    while (true) {  // No exit condition!
        if (s[left] !== s[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}

// ✓ CORRECT - Always check boundaries
function isPalindromeCorrect(s: string): boolean {
    let left: number = 0, right: number = s.length - 1;
    while (left < right) {  // Proper termination
        if (s[left] !== s[right]) {
            return false;
        }
        left++;
        right--;
    }
    return true;
}
```

### 3. Moving Both Pointers When You Should Move One

```typescript
// ❌ WRONG - Container With Most Water
function maxAreaWrong(height: number[]): number {
    let left: number = 0, right: number = height.length - 1;
    let max: number = 0;

    while (left < right) {
        max = Math.max(max, (right - left) * Math.min(height[left], height[right]));
        // Moving BOTH pointers - WRONG!
        left++;
        right--;
    }
    return max;
}
// This skips many potential solutions!

// ✓ CORRECT - Move only the shorter line
function maxAreaCorrect(height: number[]): number {
    let left: number = 0, right: number = height.length - 1;
    let max: number = 0;

    while (left < right) {
        max = Math.max(max, (right - left) * Math.min(height[left], height[right]));
        // Move only the pointer pointing to shorter line
        if (height[left] < height[right]) {
            left++;
        } else {
            right--;
        }
    }
    return max;
}
```

### 4. Forgetting to Handle Duplicates

```typescript
// ❌ WRONG - 3Sum with duplicates
function threeSumWrong(nums: number[]): number[][] {
    nums.sort((a, b) => a - b);
    const result: number[][] = [];

    for (let i: number = 0; i < nums.length; i++) {
        let left: number = i + 1, right: number = nums.length - 1;
        while (left < right) {
            const total: number = nums[i] + nums[left] + nums[right];
            if (total === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                left++;  // This will create duplicate triplets!
                right--;
            } else if (total < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}

// ✓ CORRECT - Skip duplicates
function threeSumCorrect(nums: number[]): number[][] {
    nums.sort((a, b) => a - b);
    const result: number[][] = [];

    for (let i: number = 0; i < nums.length; i++) {
        // Skip duplicate i values
        if (i > 0 && nums[i] === nums[i - 1]) {
            continue;
        }

        let left: number = i + 1, right: number = nums.length - 1;
        while (left < right) {
            const total: number = nums[i] + nums[left] + nums[right];
            if (total === 0) {
                result.push([nums[i], nums[left], nums[right]]);
                // Skip duplicate left values
                while (left < right && nums[left] === nums[left + 1]) {
                    left++;
                }
                // Skip duplicate right values
                while (left < right && nums[right] === nums[right - 1]) {
                    right--;
                }
                left++;
                right--;
            } else if (total < 0) {
                left++;
            } else {
                right--;
            }
        }
    }
    return result;
}
```

### 5. Using Wrong Pointer Type for the Problem

```typescript
// Problem: Remove duplicates from sorted array IN-PLACE

// ❌ WRONG - Using opposite-direction pointers
function removeDuplicatesWrong(nums: number[]): void {
    let left: number = 0, right: number = nums.length - 1;
    while (left < right) {
        // This doesn't work - we need same-direction pointers!
        if (nums[left] === nums[right]) {
            right--;
        }
        left++;
    }
}

// ✓ CORRECT - Same-direction (slow-fast) pointers
function removeDuplicatesCorrect(nums: number[]): number {
    if (nums.length === 0) return 0;

    let slow: number = 0;  // Position of last unique element
    for (let fast: number = 1; fast < nums.length; fast++) {
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
    }
    return slow + 1;
}
```

### 6. Off-by-One Errors in Same-Direction Pointers

```typescript
// ❌ WRONG - Starting fast pointer at wrong position
function removeDuplicatesOffByOne(nums: number[]): number {
    let slow: number = 0;
    let fast: number = 0;  // WRONG! Both at same position initially

    while (fast < nums.length) {
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
        fast++;
    }
    return slow + 1;
}

// This creates off-by-one errors

// ✓ CORRECT - Start fast one ahead
function removeDuplicatesFixed(nums: number[]): number {
    if (nums.length === 0) {
        return 0;
    }

    let slow: number = 0;
    let fast: number = 1;  // Start fast one ahead of slow

    while (fast < nums.length) {
        if (nums[fast] !== nums[slow]) {
            slow++;
            nums[slow] = nums[fast];
        }
        fast++;
    }
    return slow + 1;
}
```

---

## 🤔 Frequently Asked Questions

### Q1: How do I know which type of two pointers to use?

**A:** It depends on the problem type:

| Problem Type | Pointer Type | When to Use |
|-------------|-------------|-------------|
| **Opposite Direction** | Start from both ends | Sorted array, finding pairs/sums, palindromes |
| **Same Direction (Slow/Fast)** | Both start from beginning | In-place modifications, removing duplicates, partitioning |
| **Three Pointers** | One fixed + two moving | Finding triplets, Dutch National Flag |

**Quick decision tree:**
```
Is the array sorted?
├─ Yes → Likely opposite-direction pointers
│  └─ Finding pairs? → Opposite direction
│  └─ In-place removal? → Same direction
│
└─ No → Either sort first OR use same-direction
   └─ Partitioning? → Same direction or three pointers
```

### Q2: Can two pointers work with unsorted arrays?

**A:** It depends!

**YES for these cases:**
- **In-place operations**: Remove duplicates, move zeros, partition
- **Same-direction pointers**: Don't rely on sorted order
- **Example:**
  ```typescript
  // Move all zeros to end (unsorted array is fine!)
  function moveZeros(nums: number[]): void {
      let slow: number = 0;  // Position for next non-zero
      for (let fast: number = 0; fast < nums.length; fast++) {
          if (nums[fast] !== 0) {
              [nums[slow], nums[fast]] = [nums[fast], nums[slow]];
              slow++;
          }
      }
  }
  ```

**NO for these cases:**
- **Finding pairs with target sum**: Requires sorted array
- **3Sum, 4Sum**: Need sorting first
- **Container with most water**: Logic depends on sorted property

### Q3: What's the difference between Two Pointers and Sliding Window?

**A:** They're related but different!

| Aspect | Two Pointers | Sliding Window |
|--------|-------------|----------------|
| **Purpose** | Find pairs, modify in-place, validate | Find optimal subarray/substring |
| **Window size** | Not a window concept | Expandable or fixed-size window |
| **Movement** | Based on conditions | Systematic expansion/contraction |
| **Problems** | Two Sum, Palindrome | Longest substring, max sum subarray |

**Example showing the difference:**
```typescript
// TWO POINTERS - Two Sum (finding pair)
function twoSumPointers(nums: number[], target: number): number[] | undefined {
    let left: number = 0, right: number = nums.length - 1;
    while (left < right) {
        const sum: number = nums[left] + nums[right];
        if (sum === target) return [left, right];
        else if (sum < target) left++;
        else right--;
    }
}

// SLIDING WINDOW - Max sum of k consecutive elements
function maxSumWindow(nums: number[], k: number): number {
    let windowSum: number = 0, maxSumValue: number = 0;

    // Build initial window
    for (let i: number = 0; i < k; i++) {
        windowSum += nums[i];
    }
    maxSumValue = windowSum;

    // Slide the window
    for (let i: number = k; i < nums.length; i++) {
        windowSum += nums[i] - nums[i - k];  // Slide: add new, remove old
        maxSumValue = Math.max(maxSumValue, windowSum);
    }
    return maxSumValue;
}
```

### Q4: Why does Container With Most Water work? How do we know we're not missing the optimal answer?

**A:** This is the MOST common confusion! Let's prove it.

**The Greedy Proof:**

When we move the shorter line, we're guaranteed not to miss the optimal solution. Here's why:

```
Consider any configuration:
        H               h
        █               █
        █   ~~~~~~~~~   █
        ▼               ▼
      tall            short
      (left)         (right)

Where H > h (left is taller than right)
```

**Claim:** We should move the right pointer (shorter line)

**Proof by contradiction:**
1. Suppose the optimal solution includes the right pointer at this position
2. For optimal solution, we'd need a different left pointer
3. But any different left pointer:
   - If moved left: Width increases, but height still limited by h → Area = (W+x) × h
   - Current area with taller left: Area = W × h
   - Best we can do is find taller h, but we're moving right anyway to explore that!
4. By moving the shorter line, we explore all possibilities where a taller line could compensate for lost width
5. If we moved the taller line, we'd be constrained by the shorter one anyway

**Visual Proof:**
```
height = [8, 5, 6, 7]

Current: L=0(h=8), R=3(h=7)
      8           7
      █   ~~~~~   █
      █   ~~~~~   █
      █   ~~~~~   █
      ▼           ▼

If optimal uses R=3, could we do better with different L?
Try L=1: Area = 2 × min(5, 7) = 10
Try L=2: Area = 1 × min(6, 7) = 6
Current: Area = 3 × min(8, 7) = 21 ← Best!

So moving the shorter line (R) is correct!
```

### Q5: How do I handle edge cases with two pointers?

**A:** Check these common edge cases:

```typescript
function twoPointerTemplate(arr: number[], target: number): number[] {
    // Edge case 1: Empty array
    if (arr.length === 0) return [];

    // Edge case 2: Single element
    if (arr.length === 1) {
        // Handle based on problem
        return arr[0] === target ? [0] : [];
    }

    let left: number = 0, right: number = arr.length - 1;

    while (left < right) {
        // Edge case 3: Check boundaries before accessing
        if (left >= arr.length || right < 0) break;

        const current: number = arr[left] + arr[right];

        if (current === target) {
            return [left, right];
        } else if (current < target) {
            left++;
        } else {
            right--;
        }
    }

    // Edge case 4: No solution found
    return [];
}

// Edge cases to test:
// - Empty array: []
// - Single element: [1]
// - Two elements: [1, 2]
// - All same elements: [5, 5, 5, 5]
// - Target not found: [1, 2, 3], target = 10
// - Multiple solutions: [1, 2, 3, 4], target = 5 → [1,4] or [2,3]
```

### Q6: When should I choose two pointers over a HashMap?

**A:** Consider both approaches:

**Use Two Pointers when:**
- ✓ Array is sorted (or can be sorted)
- ✓ Need O(1) space (hash map uses O(n))
- ✓ Need to find ALL pairs (not just one)
- ✓ In-place modifications required

**Use HashMap when:**
- ✓ Array is unsorted and can't be sorted
- ✓ Need O(1) lookup time
- ✓ Only need to find one pair
- ✓ Working with indices (sorting would lose original indices)

**Example comparison:**
```typescript
// Array: [3, 2, 4], target = 6

// HashMap approach - Works with unsorted, returns original indices
function twoSumHashMap(nums: number[], target: number): number[] {
    const map: Map<number, number> = new Map();
    for (let i: number = 0; i < nums.length; i++) {
        if (map.has(target - nums[i])) {
            return [map.get(target - nums[i])!, i];  // Original indices
        }
        map.set(nums[i], i);
    }
    return [];
}
// Result: [1, 2] (original indices)
// Time: O(n), Space: O(n)

// Two Pointers - Requires sorting, loses original indices
function twoSumWithSort(nums: number[], target: number): number[] {
    nums.sort((a, b) => a - b);  // [2, 3, 4]
    let left: number = 0, right: number = nums.length - 1;
    while (left < right) {
        const sum: number = nums[left] + nums[right];
        if (sum === target) return [left, right];  // NEW indices after sort
        else if (sum < target) left++;
        else right--;
    }
    return [];
}
// Result: [0, 2] (indices after sorting, not original!)
// Time: O(n log n), Space: O(1)
```

---

## 💡 Pro Tips for Interviews

### 1. **State Your Assumptions Early**
```
"I see this is a sorted array, so I'm thinking two pointers would be optimal here.
This will give us O(n) time complexity instead of O(n²) with nested loops."
```

### 2. **Draw the Pointer Movement**
Always visualize on the whiteboard:
```
Initial:  L               R
         [2,  7,  11,  15]
          ↑               ↑

Step 1:  L           R
         [2,  7,  11,  15]
          ↑           ↑

...
```

### 3. **Explain the Greedy Choice**
For Container With Most Water:
```
"I'm moving the shorter line because:
1. Width always decreases as pointers move inward
2. Moving the taller line can't help (still limited by shorter line)
3. Moving the shorter line might find a taller line to compensate"
```

### 4. **Mention Time-Space Tradeoff**
```
"Two pointers gives us O(n) time and O(1) space.
Alternatively, we could use a hash map for O(n) time but O(n) space.
Since the array is sorted, two pointers is more space-efficient."
```

### 5. **Test with Edge Cases Out Loud**
```
"Let me verify this works with edge cases:
- Empty array: Returns immediately ✓
- Single element: Can't form pair ✓
- Two elements: Works correctly ✓
- Duplicates: Let me trace through... ✓"
```

### 6. **Know When NOT to Use Two Pointers**
```
"If the array wasn't sorted and we needed to preserve original indices,
I'd use a hash map instead. But since it's sorted and we only need
the values, two pointers is optimal."
```

### 7. **Common Interview Follow-ups (Be Ready!)**
- "What if the array isn't sorted?" → Mention sorting or hash map
- "What if we need 3 numbers instead of 2?" → Extend to 3 pointers
- "How do you handle duplicates?" → Explain skipping logic
- "Can you do it in-place?" → Two pointers is already in-place!

---

## 🎯 How to Recognize Two Pointers Problems

### Strong Indicators (Use Two Pointers!)

✓ **Keywords in problem:**
- "sorted array"
- "find a pair"
- "remove duplicates **in-place**"
- "palindrome"
- "partition"
- "two elements that sum to..."

✓ **Problem characteristics:**
- Array or string traversal
- Need O(1) extra space
- Comparing elements at different positions
- Optimization involves avoiding nested loops

✓ **Classic problem types:**
- Two Sum (sorted array)
- Valid Palindrome
- Container With Most Water
- Remove Duplicates from Sorted Array
- Move Zeros
- Sort Colors (Dutch National Flag)
- Trapping Rain Water

### Examples:

**Strong YES for Two Pointers:**
```
Problem: "Given a SORTED array, find two numbers that sum to target"
Indicators: ✓ Sorted ✓ Two numbers ✓ Pair
Solution: Opposite-direction two pointers
```

```
Problem: "Remove duplicates from sorted array IN-PLACE"
Indicators: ✓ Sorted ✓ In-place ✓ Linear scan
Solution: Same-direction two pointers (slow/fast)
```

```
Problem: "Check if string is palindrome"
Indicators: ✓ Compare from both ends ✓ Symmetric check
Solution: Opposite-direction two pointers
```

**Maybe/No for Two Pointers:**
```
Problem: "Find two numbers that sum to target in UNSORTED array"
Indicator: ✗ Unsorted
Solution: Hash map is better (preserves original indices)
```

```
Problem: "Find maximum sum of subarray"
Indicator: ✗ Not about pairs, about range
Solution: Sliding window or Kadane's algorithm
```

```
Problem: "Find duplicate in array"
Indicator: ✗ No pair relationship
Solution: Hash set or cycle detection (fast/slow pointers for linked list)
```

### Decision Flow:

```
Is array/string sorted?
├─ YES
│  ├─ Finding pairs/triplets? → Opposite-direction two pointers
│  ├─ In-place modification? → Same-direction two pointers
│  └─ Palindrome check? → Opposite-direction two pointers
│
└─ NO
   ├─ Can you sort it? (and sorting doesn't break the problem)
   │  └─ YES → Sort first, then use two pointers
   │  └─ NO → Use different approach (hash map, sliding window, etc.)
   │
   └─ In-place operations (move zeros, partition)?
      └─ YES → Same-direction two pointers (doesn't need sorting)
```

---

## Key Takeaways

1. **When array is sorted**: Two pointers is often the optimal approach
2. **Opposite direction**: Start from both ends when looking for pairs/sums
3. **Same direction**: Use when modifying array in-place or removing elements
4. **Greedy decisions**: Move pointers based on which movement could improve the answer
5. **Space efficiency**: Usually O(1) space, making it very efficient
6. **From O(n²) to O(n)**: Eliminates need for nested loops in many scenarios

[← Previous: Prefix Sum](./02-prefix-sum.md) | [Back to Index](./README.md) | [Next: Sliding Window →](./04-sliding-window.md)
