# Sliding Window Pattern

## 🎓 What is Sliding Window? (In Simple Words)

**Simple Definition**: Imagine you're looking through a small window on a train. As the train moves, you see different scenery pass by, but you can only see what's directly in front of your window at any given moment. The Sliding Window pattern works the same way - it looks at a small "window" of elements in an array or string, then "slides" that window forward to examine different sections efficiently.

**Real-World Analogy**:
Think of checking your phone's screen time for the "last 7 days." Instead of recalculating all 7 days every time a new day arrives, you simply:
1. Remove the oldest day (8 days ago)
2. Add the newest day (today)
3. Calculate the total

This is exactly what the sliding window does - it reuses previous calculations to save time!

**Why is it useful?**
Without sliding window, checking every possible subarray of size 7 in a 365-day year would require doing 365 × 7 = 2,555 calculations. With sliding window, you do just 365 calculations - one per day!

---

## Pattern Overview

The **Sliding Window** pattern is used to perform operations on a specific window size of an array or string. The window "slides" through the data structure by adding new elements on one side and removing elements from the other side, maintaining a contiguous sequence.

### When to Use
- Finding longest/shortest substring with specific conditions
- Finding maximum/minimum sum of subarrays of size k
- Problems involving contiguous sequences
- Optimization problems on strings or arrays

### Key Characteristics
- Maintains a window (contiguous subset) of elements
- Window size can be fixed or dynamic
- Eliminates redundant calculations by reusing previous window data
- Reduces O(n×k) or O(n²) solutions to O(n)

### Pattern Identification
Look for this pattern when you see:
- "Find the longest substring..."
- "Find the maximum sum subarray of size k"
- "Minimum window substring"
- "Find all anagrams in a string"
- Problems involving contiguous elements with constraints

---

## 📚 How It Works (Visual Explanation)

### Fixed Window Sliding (Window size = 3)

Imagine finding the maximum sum of any 3 consecutive numbers in the array `[2, 1, 5, 1, 3, 2]`:

```
Step 1: Initial window (sum = 8)
┌─────────┐
│ 2  1  5 │ 1  3  2
└─────────┘
Sum: 2 + 1 + 5 = 8

Step 2: Slide right (remove 2, add 1)
   ┌─────────┐
 2 │ 1  5  1 │ 3  2
   └─────────┘
Sum: 8 - 2 + 1 = 7

Step 3: Slide right (remove 1, add 3)
      ┌─────────┐
 2  1 │ 5  1  3 │ 2
      └─────────┘
Sum: 7 - 1 + 3 = 9  ← Maximum!

Step 4: Slide right (remove 5, add 2)
         ┌─────────┐
 2  1  5 │ 1  3  2 │
         └─────────┘
Sum: 9 - 5 + 2 = 6
```

**Key Insight**: Instead of recalculating the sum for each window (2+1+5, then 1+5+1, then 5+1+3...), we just subtract the element leaving and add the element entering!

---

### Dynamic Window Expanding/Shrinking

For "longest substring without repeating characters" in string `"abcabcbb"`:

```
Step 1: Start with empty window
│
a  b  c  a  b  c  b  b
start
end
Current: "" → Length: 0

Step 2: Expand window (add 'a')
┌──┐
│a │ b  c  a  b  c  b  b
└──┘
Current: "a" → Length: 1, No duplicates ✓

Step 3: Expand window (add 'b')
┌─────┐
│a  b │ c  a  b  c  b  b
└─────┘
Current: "ab" → Length: 2, No duplicates ✓

Step 4: Expand window (add 'c')
┌────────┐
│a  b  c │ a  b  c  b  b
└────────┘
Current: "abc" → Length: 3, No duplicates ✓

Step 5: Expand window (add 'a') - DUPLICATE FOUND!
┌───────────┐
│a  b  c  a │ b  c  b  b
└───────────┘
Duplicate 'a' detected! Must shrink from left.

Step 6: Shrink window (remove first 'a')
   ┌────────┐
a  │b  c  a │ b  c  b  b
   └────────┘
Current: "bca" → Length: 3, No duplicates ✓

... continues sliding and checking
```

**Key Insight**: The window grows when it's valid (no duplicates), and shrinks when it violates the condition (duplicate found). We track the maximum window size we've seen!

---

## 🎯 How to Recognize Sliding Window Problems

You should think "Sliding Window" when you see these keywords:

| Keyword/Phrase | Why it's Sliding Window |
|----------------|------------------------|
| **"Contiguous subarray/substring"** | Window must be continuous elements |
| **"Of size k"** or **"exactly k"** | Fixed window size |
| **"At most k"** or **"at least k"** | Dynamic window with constraints |
| **"Longest/shortest substring"** | Need to track window size |
| **"Maximum/minimum sum"** | Window optimization problem |
| **"All anagrams/permutations"** | Check patterns in windows |
| **"Without repeating"** | Track unique elements in window |
| **"Consecutive elements"** | Elements must be next to each other |

**Decision Tree**:
```
Is the problem about consecutive elements?
    ├─ No → Not sliding window
    └─ Yes → Is there a size constraint (k) or optimization goal?
              ├─ Fixed size k → Use FIXED sliding window
              └─ Find longest/shortest → Use DYNAMIC sliding window
```

---

## Example 1: Maximum Sum Subarray of Size K (TypeScript)

### Problem
Given an array of integers and a number k, find the maximum sum of any contiguous subarray of size k.

**Similar to**: [643. Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/)

### Solution

```typescript
/**
 * Find maximum sum of subarray of size k using sliding window
 * @param nums - Array of integers
 * @param k - Subarray size
 * @returns Maximum sum of subarray of size k, or null if array is too small
 */
function maxSumSubarray(nums: number[], k: number): number | null {
    // Edge case: if array is smaller than k
    if (nums.length < k) {
        return null;
    }

    // Calculate sum of first window
    let windowSum: number = 0;
    for (let i: number = 0; i < k; i++) {
        windowSum += nums[i];
    }

    let maxSum: number = windowSum;

    // Slide the window through the array
    // Add new element from right, remove old element from left
    for (let i: number = k; i < nums.length; i++) {
        // Slide window: add new element, remove leftmost element
        windowSum = windowSum + nums[i] - nums[i - k];

        // Update maximum sum
        maxSum = Math.max(maxSum, windowSum);
    }

    return maxSum;
}

// Example usage
console.log(maxSumSubarray([2, 1, 5, 1, 3, 2], 3));  // Output: 9
// Explanation: Subarray [5, 1, 3] has maximum sum 9

console.log(maxSumSubarray([2, 3, 4, 1, 5], 2));     // Output: 7
// Explanation: Subarray [3, 4] has maximum sum 7

console.log(maxSumSubarray([1, 4, 2, 10, 23, 3, 1, 0, 20], 4));  // Output: 39
// Explanation: Subarray [4, 2, 10, 23] has maximum sum 39

// Alternative solution with average
function findMaxAverage(nums: number[], k: number): number {
    let sum: number = 0;

    // Calculate first window sum
    for (let i: number = 0; i < k; i++) {
        sum += nums[i];
    }

    let maxSum: number = sum;

    // Slide window
    for (let i: number = k; i < nums.length; i++) {
        sum = sum + nums[i] - nums[i - k];
        maxSum = Math.max(maxSum, sum);
    }

    return maxSum / k;
}

console.log(findMaxAverage([1, 12, -5, -6, 50, 3], 4));  // Output: 12.75
```

### Explanation
1. **Fixed window size**: Window always contains exactly k elements
2. **Initial window**: Calculate sum of first k elements
3. **Sliding**:
   - Add new element entering the window (right side)
   - Subtract element leaving the window (left side)
   - This avoids recalculating the entire sum
4. **Time saved**: Instead of recalculating sum for each window (O(n×k)), we slide in O(n)

### Step-by-Step Code Walkthrough

Let's trace through `maxSumSubarray([2, 1, 5, 1, 3, 2], 3)`:

```typescript
// Initial state
const nums: number[] = [2, 1, 5, 1, 3, 2];
const k: number = 3;

// Step 1: Calculate first window sum (indices 0, 1, 2)
let windowSum: number = 0;
for (let i: number = 0; i < 3; i++) {
    windowSum += nums[i];
}
// i=0: windowSum = 0 + 2 = 2
// i=1: windowSum = 2 + 1 = 3
// i=2: windowSum = 3 + 5 = 8
// After loop: windowSum = 8

let maxSum: number = 8;  // Initialize with first window

// Step 2: Start sliding from index 3
// i=3: nums[i]=1, nums[i-k]=nums[0]=2
windowSum = 8 + 1 - 2;  // = 7
maxSum = Math.max(8, 7);  // = 8, No update

// i=4: nums[i]=3, nums[i-k]=nums[1]=1
windowSum = 7 + 3 - 1;  // = 9
maxSum = Math.max(8, 9);  // = 9, Update! New maximum

// i=5: nums[i]=2, nums[i-k]=nums[2]=5
windowSum = 9 + 2 - 5;  // = 6
maxSum = Math.max(9, 6);  // = 9, No update

// Return maxSum = 9
```

**Visual trace**:
```
[2, 1, 5, 1, 3, 2]
 └──────┘           Window 1: sum=8
    └──────┘        Window 2: sum=7 (remove 2, add 1)
       └──────┘     Window 3: sum=9 (remove 1, add 3) ← MAX
          └──────┘  Window 4: sum=6 (remove 5, add 2)
```

---

## Example 2: Longest Substring Without Repeating Characters (TypeScript)

### Problem
Given a string `s`, find the length of the longest substring without repeating characters.

**LeetCode**: [3. Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)

### Solution

```typescript
/**
 * Find length of longest substring without repeating characters
 * using dynamic sliding window
 *
 * @param s - Input string
 * @returns Length of longest substring without repeating characters
 */
function lengthOfLongestSubstring(s: string): number {
    // HashMap to store character and its most recent index
    const charIndex: Map<string, number> = new Map();

    let maxLength: number = 0;
    let windowStart: number = 0;

    // Expand window by moving windowEnd
    for (let windowEnd: number = 0; windowEnd < s.length; windowEnd++) {
        const currentChar: string = s[windowEnd];

        // If character is already in window, shrink window from left
        if (charIndex.has(currentChar)) {
            // Move windowStart to position after the duplicate
            // But only if it's within current window
            windowStart = Math.max(windowStart, charIndex.get(currentChar)! + 1);
        }

        // Update character's index
        charIndex.set(currentChar, windowEnd);

        // Calculate current window size and update max
        const currentLength: number = windowEnd - windowStart + 1;
        maxLength = Math.max(maxLength, currentLength);
    }

    return maxLength;
}

// Example usage
// Example 1
console.log(lengthOfLongestSubstring("abcabcbb"));  // Output: 3
// Explanation: "abc" is the longest substring without repeating characters

// Example 2
console.log(lengthOfLongestSubstring("bbbbb"));     // Output: 1
// Explanation: "b" is the longest substring

// Example 3
console.log(lengthOfLongestSubstring("pwwkew"));    // Output: 3
// Explanation: "wke" is the longest substring

// Example 4
console.log(lengthOfLongestSubstring(""));          // Output: 0
// Explanation: Empty string

// Example 5
console.log(lengthOfLongestSubstring("abba"));      // Output: 2
// Explanation: "ab" or "ba" is the longest substring
```

### Explanation
1. **Dynamic window**: Window size changes based on constraints (no repeating characters)
2. **HashMap**: Track each character's most recent position
3. **Expand window**: Move `window_end` to include new characters
4. **Shrink window**: When duplicate found, move `window_start` past the previous occurrence
5. **Key insight**: Use `max(window_start, char_index[current_char] + 1)` to ensure we don't move `window_start` backward
6. **Update**: Always update character's index and check for new maximum length

### Step-by-Step Code Walkthrough

Let's trace through `lengthOfLongestSubstring("abcabcbb")`:

```typescript
const s: string = "abcabcbb";
const charIndex: Map<string, number> = new Map();  // Stores: {character: last_seen_index}
let maxLength: number = 0;
let windowStart: number = 0;

// windowEnd = 0, currentChar = 'a'
charIndex.set('a', 0);  // Map { 'a' => 0 }
windowStart = 0;  // 'a' not in map, no change
let currentLength: number = 0 - 0 + 1;  // = 1
maxLength = 1;

// windowEnd = 1, currentChar = 'b'
charIndex.set('b', 1);  // Map { 'a' => 0, 'b' => 1 }
windowStart = 0;  // 'b' not in map, no change
currentLength = 1 - 0 + 1;  // = 2
maxLength = 2;

// windowEnd = 2, currentChar = 'c'
charIndex.set('c', 2);  // Map { 'a' => 0, 'b' => 1, 'c' => 2 }
windowStart = 0;  // 'c' not in map, no change
currentLength = 2 - 0 + 1;  // = 3
maxLength = 3;  // Window: "abc"

// windowEnd = 3, currentChar = 'a'
// 'a' IS in map at index 0!
windowStart = Math.max(0, 0 + 1);  // = 1, Jump past first 'a'
charIndex.set('a', 3);  // Map { 'a' => 3, 'b' => 1, 'c' => 2 }
currentLength = 3 - 1 + 1;  // = 3
maxLength = 3;  // Window: "bca"

// windowEnd = 4, currentChar = 'b'
// 'b' IS in map at index 1!
windowStart = Math.max(1, 1 + 1);  // = 2, Jump past first 'b'
charIndex.set('b', 4);  // Map { 'a' => 3, 'b' => 4, 'c' => 2 }
currentLength = 4 - 2 + 1;  // = 3
maxLength = 3;  // Window: "cab"

// windowEnd = 5, currentChar = 'c'
// 'c' IS in map at index 2!
windowStart = Math.max(2, 2 + 1);  // = 3, Jump past first 'c'
charIndex.set('c', 5);  // Map { 'a' => 3, 'b' => 4, 'c' => 5 }
currentLength = 5 - 3 + 1;  // = 3
maxLength = 3;  // Window: "abc"

// windowEnd = 6, currentChar = 'b'
// 'b' IS in map at index 4!
windowStart = Math.max(3, 4 + 1);  // = 5, Jump past previous 'b'
charIndex.set('b', 6);  // Map { 'a' => 3, 'b' => 6, 'c' => 5 }
currentLength = 6 - 5 + 1;  // = 2
maxLength = 3;  // Window: "cb"

// windowEnd = 7, currentChar = 'b'
// 'b' IS in map at index 6!
windowStart = Math.max(5, 6 + 1);  // = 7, Jump past previous 'b'
charIndex.set('b', 7);  // Map { 'a' => 3, 'b' => 7, 'c' => 5 }
currentLength = 7 - 7 + 1;  // = 1
maxLength = 3;  // Window: "b"

// Return maxLength = 3
```

### Visual Example
```
String: "abcabcbb"
Index:   01234567

Step-by-step windows:
window_start=0, window_end=0: "a" → length=1
window_start=0, window_end=1: "ab" → length=2
window_start=0, window_end=2: "abc" → length=3 ← MAX
window_start=1, window_end=3: "bca" → length=3 (found duplicate 'a')
window_start=2, window_end=4: "cab" → length=3 (found duplicate 'b')
window_start=3, window_end=5: "abc" → length=3 (found duplicate 'c')
window_start=5, window_end=6: "cb" → length=2 (found duplicate 'b')
window_start=7, window_end=7: "b" → length=1 (found duplicate 'b')
```

**Key Detail**: Why `max(window_start, char_index[current_char] + 1)`?
- If we find 'a' at index 5, but window_start is already at 7, we don't move backward!
- Example: In "abba", when we hit the second 'b', we've already moved past the first 'a'

---

## Time & Space Complexity

### Example 1: Maximum Sum Subarray
- **Time Complexity**: O(n) - Single pass through array
- **Space Complexity**: O(1) - Only storing sum variables

### Example 2: Longest Substring
- **Time Complexity**: O(n) - Each character visited at most twice (once by window_end, once by window_start)
- **Space Complexity**: O(min(n, m)) - HashMap stores at most n characters or m (charset size)

---

## Common Variations

1. **Fixed Window Size**
   - Window size remains constant
   - Used in: Max sum subarray of size k, Max average subarray
   - LeetCode: [643. Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/)

2. **Dynamic Window Size**
   - Window grows and shrinks based on constraints
   - Used in: Longest substring without repeating, Minimum window substring
   - LeetCode: [3. Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)

3. **Substring with K Distinct Characters**
   - Find longest substring with at most k distinct characters
   - LeetCode: [340. Longest Substring with At Most K Distinct Characters](https://leetcode.com/problems/longest-substring-with-at-most-k-distinct-characters/)

4. **Minimum Window**
   - Find smallest window containing all required elements
   - LeetCode: [76. Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)

5. **String Anagrams**
   - Find all anagrams in a string
   - LeetCode: [438. Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/)

---

## Practice Problems

### Easy
1. [643. Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/)
2. [1456. Maximum Number of Vowels in a Substring of Given Length](https://leetcode.com/problems/maximum-number-of-vowels-in-a-substring-of-given-length/)

### Medium
3. [3. Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)
4. [438. Find All Anagrams in a String](https://leetcode.com/problems/find-all-anagrams-in-a-string/)
5. [424. Longest Repeating Character Replacement](https://leetcode.com/problems/longest-repeating-character-replacement/)
6. [567. Permutation in String](https://leetcode.com/problems/permutation-in-string/)
7. [1004. Max Consecutive Ones III](https://leetcode.com/problems/max-consecutive-ones-iii/)

### Hard
8. [76. Minimum Window Substring](https://leetcode.com/problems/minimum-window-substring/)
9. [239. Sliding Window Maximum](https://leetcode.com/problems/sliding-window-maximum/)

---

## ⚠️ Common Pitfalls

### 1. Off-by-One Errors with Window Size
**Problem**: Incorrectly calculating window size as `window_end - window_start` instead of `window_end - window_start + 1`

```typescript
// ❌ WRONG
let windowSize: number = window_end - window_start;  // Missing +1!

// ✅ CORRECT
let windowSize: number = window_end - window_start + 1;
```

**Why?** If start=2 and end=4, the window contains indices [2,3,4] = 3 elements, not 2!

---

### 2. Forgetting to Update the HashMap
**Problem**: Not updating character positions in dynamic window problems

```typescript
// ❌ WRONG
if (charIndex.has(currentChar)) {
    windowStart = charIndex.get(currentChar)! + 1;
}
// Forgot to update charIndex!

// ✅ CORRECT
if (charIndex.has(currentChar)) {
    windowStart = Math.max(windowStart, charIndex.get(currentChar)! + 1);
}
charIndex.set(currentChar, windowEnd);  // Always update!
```

---

### 3. Moving Window Start Backward
**Problem**: Not using `max()` when updating window_start

```typescript
// ❌ WRONG - Can move backward!
windowStart = charIndex.get(currentChar)! + 1;

// ✅ CORRECT - Never move backward
windowStart = Math.max(windowStart, charIndex.get(currentChar)! + 1);
```

**Example**: In string "abba", when you hit the second 'a', you've already moved past it!

---

### 4. Not Initializing the First Window Correctly
**Problem**: Starting to slide before calculating the first window

```typescript
// ❌ WRONG
let windowSum: number = 0;
for (let i: number = 0; i < nums.length; i++) {
    windowSum += nums[i];
    if (i >= k) windowSum -= nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
}

// ✅ CORRECT
let windowSum: number = 0;
// First, build initial window
for (let i: number = 0; i < k; i++) {
    windowSum += nums[i];
}
let maxSum: number = windowSum;
// Then start sliding
for (let i: number = k; i < nums.length; i++) {
    windowSum = windowSum + nums[i] - nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
}
```

---

### 5. Confusing Fixed vs Dynamic Windows
**Problem**: Using fixed window logic for dynamic window problems (or vice versa)

```typescript
// Fixed window: Window size is ALWAYS k
for (let i: number = k; i < nums.length; i++) {
    // Add one, remove one - size stays k
}

// Dynamic window: Window size changes based on conditions
while (windowEnd < s.length) {
    // Add to window
    windowEnd++;

    // Shrink while invalid
    while (isInvalid) {
        windowStart++;
    }
}
```

---

### 6. Not Handling Edge Cases
**Problem**: Forgetting to check if array/string is too small

```typescript
// ❌ WRONG - Will crash if nums.length < k
function maxSumSubarray(nums: number[], k: number): number {
    let windowSum: number = 0;
    for (let i: number = 0; i < k; i++) {
        windowSum += nums[i];  // Error if i >= nums.length!
    }
    return windowSum;
}

// ✅ CORRECT
function maxSumSubarray(nums: number[], k: number): number | null {
    if (nums.length < k) return null;  // or -Infinity, or throw error
    // ... rest of code
    return 0;
}
```

---

## 🤔 FAQ (Frequently Asked Questions)

### Q1: When should I use fixed vs dynamic sliding window?

**A:** Use the problem's question to decide:
- **Fixed window**: "Find max sum of subarray of size k", "Average of k elements"
  - The window size is given explicitly
- **Dynamic window**: "Longest substring without repeating", "Smallest window containing..."
  - You need to find the optimal window size

---

### Q2: How do I know when to shrink the window?

**A:** Shrink when the window becomes **invalid** according to the problem's constraints:
- Too many distinct characters: `while (distinct_count > k) { shrink... }`
- Has duplicates: `while (hasDuplicate) { shrink... }`
- Sum too large: `while (sum > target) { shrink... }`

Think: "What makes this window invalid?"

---

### Q3: Should I use a HashMap, Set, or Array for tracking?

**A:** Depends on what you're tracking:
- **HashMap/Object**: When you need positions or counts
  - Example: `{char: last_index}` or `{char: frequency}`
- **Set**: When you only need to know if something exists
  - Example: Checking for duplicates
- **Array**: When dealing with limited character set (like lowercase letters)
  - Example: `frequency[26]` for 'a'-'z'

---

### Q4: Why use `window_end - window_start + 1` and not just track a `size` variable?

**A:** Both work! But using indices is more flexible:

```typescript
// Method 1: Calculate size from indices
let length: number = windowEnd - windowStart + 1;

// Method 2: Track size explicitly
let size: number = 0;
// Add element: size++
// Remove element: size--
```

Method 1 is less error-prone because you can't forget to increment/decrement.

---

### Q5: Can sliding window solve non-contiguous problems?

**A:** No! Sliding window ONLY works for **contiguous** subarrays/substrings.

```typescript
// ✅ Sliding window works
// "Find max sum of 3 consecutive elements"

// ❌ Sliding window DOESN'T work
// "Find max sum of any 3 elements" (can skip elements)
```

For non-contiguous, use other patterns (dynamic programming, greedy, etc.)

---

### Q6: What if I need to track multiple conditions?

**A:** Use multiple data structures! Common pattern:

```typescript
const charCount: Map<string, number> = new Map();  // Track character frequencies
let distinctChars: number = 0;   // Track count of distinct characters
let maxLength: number = 0;       // Track result

// Expand window
charCount.set(char, (charCount.get(char) || 0) + 1);
if (charCount.get(char) === 1) distinctChars++;

// Shrink when needed
while (distinctChars > k) {
    charCount.set(leftChar, charCount.get(leftChar)! - 1);
    if (charCount.get(leftChar) === 0) distinctChars--;
    windowStart++;
}
```

---

### Q7: How do I debug my sliding window code?

**A:** Add console logs to visualize the window:

```typescript
console.log(`Window: [${windowStart}, ${windowEnd}]`);
console.log(`Current substring: "${s.substring(windowStart, windowEnd + 1)}"`);
console.log(`Window data:`, charCount);
console.log('---');
```

This helps you see exactly what's in the window at each step!

---

## 💡 Pro Tips

### Tip 1: Use a Template for Dynamic Windows

Most dynamic window problems follow this structure:

```typescript
function slidingWindowTemplate(s: string, condition: (data: Map<string, number>) => boolean): number {
    let windowStart: number = 0;
    let result: number = 0;  // or Infinity for minimum
    const windowData: Map<string, number> = new Map();  // HashMap/Set/etc for tracking

    for (let windowEnd: number = 0; windowEnd < s.length; windowEnd++) {
        // 1. Add element to window
        const rightChar: string = s[windowEnd];
        // Update windowData

        // 2. Shrink window while invalid
        while (/* window is invalid */ !condition(windowData)) {
            const leftChar: string = s[windowStart];
            // Update windowData
            windowStart++;
        }

        // 3. Update result
        result = Math.max(result, windowEnd - windowStart + 1);
    }

    return result;
}
```

**Customize** the three sections for your specific problem!

---

### Tip 2: Draw It Out First

Before coding, draw the first few steps:
1. What's in the initial window?
2. What happens when you add an element?
3. What triggers shrinking?
4. When do you update the result?

Visualizing prevents logic errors!

---

### Tip 3: Start with Brute Force, Then Optimize

```typescript
// Step 1: Brute force (works but slow)
for (let i: number = 0; i < n; i++) {
    for (let j: number = i; j < n; j++) {
        // Check subarray [i...j]
    }
}
// Time: O(n²) or O(n³)

// Step 2: Recognize it's contiguous → Sliding window!
// Step 3: Convert to O(n) sliding window solution
```

Understanding the brute force helps you see why sliding window is better.

---

### Tip 4: Handle Edge Cases First

Add these checks at the start:
```typescript
// Empty input
if (!s || s.length === 0) return 0;

// k larger than input
if (k > s.length) return -1;

// k is 0 or negative
if (k <= 0) return 0;
```

---

### Tip 5: Use Meaningful Variable Names

```typescript
// ❌ Avoid single letters (hard to debug)
let l: number = 0, r: number = 0, m: number = 0;

// ✅ Use descriptive names
let windowStart: number = 0;
let windowEnd: number = 0;
let maxLength: number = 0;
```

Your future self will thank you!

---

### Tip 6: Remember the "Expand-Shrink-Update" Mantra

For dynamic windows, always follow this order:
1. **Expand**: Add new element to window
2. **Shrink**: Remove elements until window is valid
3. **Update**: Check if this is the best window so far

Don't update result before shrinking - you might record an invalid window!

---

### Tip 7: Practice Window Size Calculation

Master this formula:
```typescript
// Window spans from index i to j (inclusive)
let windowSize: number = j - i + 1;

// Why +1? Because indices are zero-based!
// Example: indices 2 to 4 → elements at [2, 3, 4] → 3 elements
```

---

### Tip 8: Use `max(windowStart, newStart)` for Safety

When updating windowStart, always use max to prevent moving backward:

```typescript
// Prevents windowStart from ever decreasing
windowStart = Math.max(windowStart, charIndex.get(char)! + 1);
```

This handles tricky cases like "abba" automatically!

---

## Key Takeaways

1. **Two types**: Fixed window (constant size) and dynamic window (variable size)
2. **Efficiency**: Avoids redundant recalculation by maintaining running state
3. **HashMap helper**: Often used with hash structures to track elements in window
4. **Template approach**: Expand window → Check constraints → Shrink if needed → Update result
5. **From O(n²) to O(n)**: Eliminates nested loops for many substring/subarray problems
6. **Watch window bounds**: Carefully manage start and end pointers to avoid off-by-one errors

[← Previous: Two Pointers](./02-two-pointers.md) | [Back to Index](./README.md) | [Next: Fast & Slow Pointers →](./04-fast-slow-pointers.md)
