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

## Example 1: Maximum Sum Subarray of Size K (JavaScript)

### Problem
Given an array of integers and a number k, find the maximum sum of any contiguous subarray of size k.

**Similar to**: [643. Maximum Average Subarray I](https://leetcode.com/problems/maximum-average-subarray-i/)

### Solution

```javascript
/**
 * Find maximum sum of subarray of size k using sliding window
 * @param {number[]} nums - Array of integers
 * @param {number} k - Subarray size
 * @return {number} - Maximum sum of subarray of size k
 */
function maxSumSubarray(nums, k) {
    // Edge case: if array is smaller than k
    if (nums.length < k) {
        return null;
    }

    // Calculate sum of first window
    let windowSum = 0;
    for (let i = 0; i < k; i++) {
        windowSum += nums[i];
    }

    let maxSum = windowSum;

    // Slide the window through the array
    // Add new element from right, remove old element from left
    for (let i = k; i < nums.length; i++) {
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
function findMaxAverage(nums, k) {
    let sum = 0;

    // Calculate first window sum
    for (let i = 0; i < k; i++) {
        sum += nums[i];
    }

    let maxSum = sum;

    // Slide window
    for (let i = k; i < nums.length; i++) {
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

```javascript
// Initial state
nums = [2, 1, 5, 1, 3, 2]
k = 3

// Step 1: Calculate first window sum (indices 0, 1, 2)
windowSum = 0
for (let i = 0; i < 3; i++) {
    windowSum += nums[i]
}
// i=0: windowSum = 0 + 2 = 2
// i=1: windowSum = 2 + 1 = 3
// i=2: windowSum = 3 + 5 = 8
// After loop: windowSum = 8

maxSum = 8  // Initialize with first window

// Step 2: Start sliding from index 3
// i=3: nums[i]=1, nums[i-k]=nums[0]=2
windowSum = 8 + 1 - 2 = 7
maxSum = max(8, 7) = 8  // No update

// i=4: nums[i]=3, nums[i-k]=nums[1]=1
windowSum = 7 + 3 - 1 = 9
maxSum = max(8, 9) = 9  // Update! New maximum

// i=5: nums[i]=2, nums[i-k]=nums[2]=5
windowSum = 9 + 2 - 5 = 6
maxSum = max(9, 6) = 9  // No update

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

## Example 2: Longest Substring Without Repeating Characters (Python)

### Problem
Given a string `s`, find the length of the longest substring without repeating characters.

**LeetCode**: [3. Longest Substring Without Repeating Characters](https://leetcode.com/problems/longest-substring-without-repeating-characters/)

### Solution

```python
class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        """
        Find length of longest substring without repeating characters
        using dynamic sliding window

        Args:
            s: Input string

        Returns:
            Length of longest substring without repeating characters
        """
        # HashMap to store character and its most recent index
        char_index = {}

        max_length = 0
        window_start = 0

        # Expand window by moving window_end
        for window_end in range(len(s)):
            current_char = s[window_end]

            # If character is already in window, shrink window from left
            if current_char in char_index:
                # Move window_start to position after the duplicate
                # But only if it's within current window
                window_start = max(window_start, char_index[current_char] + 1)

            # Update character's index
            char_index[current_char] = window_end

            # Calculate current window size and update max
            current_length = window_end - window_start + 1
            max_length = max(max_length, current_length)

        return max_length

# Example usage
solution = Solution()

# Example 1
print(solution.lengthOfLongestSubstring("abcabcbb"))  # Output: 3
# Explanation: "abc" is the longest substring without repeating characters

# Example 2
print(solution.lengthOfLongestSubstring("bbbbb"))     # Output: 1
# Explanation: "b" is the longest substring

# Example 3
print(solution.lengthOfLongestSubstring("pwwkew"))    # Output: 3
# Explanation: "wke" is the longest substring

# Example 4
print(solution.lengthOfLongestSubstring(""))          # Output: 0
# Explanation: Empty string

# Example 5
print(solution.lengthOfLongestSubstring("abba"))      # Output: 2
# Explanation: "ab" or "ba" is the longest substring
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

```python
s = "abcabcbb"
char_index = {}  # Stores: {character: last_seen_index}
max_length = 0
window_start = 0

# window_end = 0, current_char = 'a'
char_index = {'a': 0}
window_start = 0  # 'a' not in dict, no change
current_length = 0 - 0 + 1 = 1
max_length = 1

# window_end = 1, current_char = 'b'
char_index = {'a': 0, 'b': 1}
window_start = 0  # 'b' not in dict, no change
current_length = 1 - 0 + 1 = 2
max_length = 2

# window_end = 2, current_char = 'c'
char_index = {'a': 0, 'b': 1, 'c': 2}
window_start = 0  # 'c' not in dict, no change
current_length = 2 - 0 + 1 = 3
max_length = 3  # Window: "abc"

# window_end = 3, current_char = 'a'
# 'a' IS in dict at index 0!
window_start = max(0, 0 + 1) = 1  # Jump past first 'a'
char_index = {'a': 3, 'b': 1, 'c': 2}  # Update 'a' position
current_length = 3 - 1 + 1 = 3
max_length = 3  # Window: "bca"

# window_end = 4, current_char = 'b'
# 'b' IS in dict at index 1!
window_start = max(1, 1 + 1) = 2  # Jump past first 'b'
char_index = {'a': 3, 'b': 4, 'c': 2}
current_length = 4 - 2 + 1 = 3
max_length = 3  # Window: "cab"

# window_end = 5, current_char = 'c'
# 'c' IS in dict at index 2!
window_start = max(2, 2 + 1) = 3  # Jump past first 'c'
char_index = {'a': 3, 'b': 4, 'c': 5}
current_length = 5 - 3 + 1 = 3
max_length = 3  # Window: "abc"

# window_end = 6, current_char = 'b'
# 'b' IS in dict at index 4!
window_start = max(3, 4 + 1) = 5  # Jump past previous 'b'
char_index = {'a': 3, 'b': 6, 'c': 5}
current_length = 6 - 5 + 1 = 2
max_length = 3  # Window: "cb"

# window_end = 7, current_char = 'b'
# 'b' IS in dict at index 6!
window_start = max(5, 6 + 1) = 7  # Jump past previous 'b'
char_index = {'a': 3, 'b': 7, 'c': 5}
current_length = 7 - 7 + 1 = 1
max_length = 3  # Window: "b"

# Return max_length = 3
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

```javascript
// ❌ WRONG
let windowSize = window_end - window_start;  // Missing +1!

// ✅ CORRECT
let windowSize = window_end - window_start + 1;
```

**Why?** If start=2 and end=4, the window contains indices [2,3,4] = 3 elements, not 2!

---

### 2. Forgetting to Update the HashMap
**Problem**: Not updating character positions in dynamic window problems

```python
# ❌ WRONG
if current_char in char_index:
    window_start = char_index[current_char] + 1
# Forgot to update char_index[current_char]!

# ✅ CORRECT
if current_char in char_index:
    window_start = max(window_start, char_index[current_char] + 1)
char_index[current_char] = window_end  # Always update!
```

---

### 3. Moving Window Start Backward
**Problem**: Not using `max()` when updating window_start

```python
# ❌ WRONG - Can move backward!
window_start = char_index[current_char] + 1

# ✅ CORRECT - Never move backward
window_start = max(window_start, char_index[current_char] + 1)
```

**Example**: In string "abba", when you hit the second 'a', you've already moved past it!

---

### 4. Not Initializing the First Window Correctly
**Problem**: Starting to slide before calculating the first window

```javascript
// ❌ WRONG
let windowSum = 0;
for (let i = 0; i < nums.length; i++) {
    windowSum += nums[i];
    if (i >= k) windowSum -= nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
}

// ✅ CORRECT
let windowSum = 0;
// First, build initial window
for (let i = 0; i < k; i++) {
    windowSum += nums[i];
}
let maxSum = windowSum;
// Then start sliding
for (let i = k; i < nums.length; i++) {
    windowSum = windowSum + nums[i] - nums[i - k];
    maxSum = Math.max(maxSum, windowSum);
}
```

---

### 5. Confusing Fixed vs Dynamic Windows
**Problem**: Using fixed window logic for dynamic window problems (or vice versa)

```javascript
// Fixed window: Window size is ALWAYS k
for (let i = k; i < nums.length; i++) {
    // Add one, remove one - size stays k
}

// Dynamic window: Window size changes based on conditions
while (window_end < s.length) {
    // Add to window
    window_end++;

    // Shrink while invalid
    while (isInvalid) {
        window_start++;
    }
}
```

---

### 6. Not Handling Edge Cases
**Problem**: Forgetting to check if array/string is too small

```javascript
// ❌ WRONG - Will crash if nums.length < k
function maxSumSubarray(nums, k) {
    let windowSum = 0;
    for (let i = 0; i < k; i++) {
        windowSum += nums[i];  // Error if i >= nums.length!
    }
}

// ✅ CORRECT
function maxSumSubarray(nums, k) {
    if (nums.length < k) return null;  // or -Infinity, or throw error
    // ... rest of code
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

```javascript
// Method 1: Calculate size from indices
let length = window_end - window_start + 1;

// Method 2: Track size explicitly
let size = 0;
// Add element: size++
// Remove element: size--
```

Method 1 is less error-prone because you can't forget to increment/decrement.

---

### Q5: Can sliding window solve non-contiguous problems?

**A:** No! Sliding window ONLY works for **contiguous** subarrays/substrings.

```javascript
// ✅ Sliding window works
"Find max sum of 3 consecutive elements"

// ❌ Sliding window DOESN'T work
"Find max sum of any 3 elements" (can skip elements)
```

For non-contiguous, use other patterns (dynamic programming, greedy, etc.)

---

### Q6: What if I need to track multiple conditions?

**A:** Use multiple data structures! Common pattern:

```javascript
let charCount = {};      // Track character frequencies
let distinctChars = 0;   // Track count of distinct characters
let maxLength = 0;       // Track result

// Expand window
charCount[char] = (charCount[char] || 0) + 1;
if (charCount[char] === 1) distinctChars++;

// Shrink when needed
while (distinctChars > k) {
    charCount[leftChar]--;
    if (charCount[leftChar] === 0) distinctChars--;
    window_start++;
}
```

---

### Q7: How do I debug my sliding window code?

**A:** Add console logs to visualize the window:

```javascript
console.log(`Window: [${window_start}, ${window_end}]`);
console.log(`Current substring: "${s.substring(window_start, window_end + 1)}"`);
console.log(`Window data:`, charCount);
console.log('---');
```

This helps you see exactly what's in the window at each step!

---

## 💡 Pro Tips

### Tip 1: Use a Template for Dynamic Windows

Most dynamic window problems follow this structure:

```javascript
function slidingWindowTemplate(s, condition) {
    let window_start = 0;
    let result = 0;  // or Infinity for minimum
    let windowData = {};  // HashMap/Set/etc for tracking

    for (let window_end = 0; window_end < s.length; window_end++) {
        // 1. Add element to window
        let rightChar = s[window_end];
        // Update windowData

        // 2. Shrink window while invalid
        while (/* window is invalid */) {
            let leftChar = s[window_start];
            // Update windowData
            window_start++;
        }

        // 3. Update result
        result = Math.max(result, window_end - window_start + 1);
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

```javascript
// Step 1: Brute force (works but slow)
for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
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
```javascript
// Empty input
if (!s || s.length === 0) return 0;

// k larger than input
if (k > s.length) return -1;

// k is 0 or negative
if (k <= 0) return 0;
```

---

### Tip 5: Use Meaningful Variable Names

```javascript
// ❌ Avoid single letters (hard to debug)
let l = 0, r = 0, m = 0;

// ✅ Use descriptive names
let window_start = 0;
let window_end = 0;
let max_length = 0;
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
```javascript
// Window spans from index i to j (inclusive)
let window_size = j - i + 1;

// Why +1? Because indices are zero-based!
// Example: indices 2 to 4 → elements at [2, 3, 4] → 3 elements
```

---

### Tip 8: Use `max(window_start, newStart)` for Safety

When updating window_start, always use max to prevent moving backward:

```javascript
// Prevents window_start from ever decreasing
window_start = Math.max(window_start, char_index[char] + 1);
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
