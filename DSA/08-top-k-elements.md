# Top 'K' Elements Pattern

## What is Top K Elements? (In Simple Words)

Imagine you're organizing a **video game leaderboard** with millions of players, but you only want to display the **top 10 scores**. You don't need to sort all millions of scores - you just need to keep track of the best 10!

This is exactly what the Top K Elements pattern does. Instead of sorting everything (which is slow), we use a smart data structure called a **heap** (think of it as a "smart priority list") that efficiently keeps track of only the K items we care about.

**Real-world examples:**
- Trending topics on Twitter (top 10 hashtags)
- YouTube's "Most Popular Videos" (top 50 videos)
- E-commerce: "Top Rated Products" (top 20 products)
- Music streaming: "Your Top 5 Artists This Year"
- News sites: "Most Read Articles" (top 10 articles)

**The key insight:** Why sort 1 million items when you only need the top 10? Just maintain a collection of your best 10 and keep updating it as you see new items!

---

## Pattern Overview

The **Top 'K' Elements** pattern finds the k largest, smallest, or most frequent elements in a dataset. This pattern typically uses heaps (priority queues) to efficiently maintain and retrieve the top k elements.

### When to Use
- Finding k largest or smallest elements
- Finding k most/least frequent elements
- Finding k closest points to origin
- Streaming data where you need to maintain top k
- Sorting only the first k elements

### Key Characteristics
- Uses Min-Heap for k largest elements (or Max-Heap for k smallest)
- Heap size is maintained at k
- More efficient than full sorting when k << n
- Time complexity: O(n log k) vs O(n log n) for full sort
- Space complexity: O(k) for the heap

### Pattern Identification
Look for this pattern when you see:
- "Find the k largest/smallest elements"
- "K most frequent elements"
- "K closest points"
- "Kth largest element"
- "Top k frequent words"

---

## How to Recognize This Pattern

**Ask yourself these questions:**
1. Do I need only K items (not all items)?
2. Are those K items the "best" by some criteria (largest, smallest, most frequent)?
3. Do I care about ranking or selection, not complete sorting?

If YES to all three - use Top K Elements pattern!

**Example questions:**
- "Find the **3 largest** numbers" - Yes! (K=3, criteria=largest)
- "Find the **5 most frequent** words" - Yes! (K=5, criteria=frequency)
- "**Sort** all elements" - No! (needs all elements, not just K)
- "Find **all** elements greater than X" - No! (needs all, not just K)

---

## Heap Visualizations: Understanding the Magic

### What is a Heap?

A **heap** is like a **smart priority line** where the most important item is always at the front. In a Min-Heap, the smallest value is at the top. In a Max-Heap, the largest value is at the top.

**Think of it like this:**
- **Min-Heap**: Like a "shortest person first" line - the shortest person is always at the front
- **Max-Heap**: Like a "tallest person first" line - the tallest person is always at the front

### Min-Heap Structure (Visual)

```
        1         <- Root (smallest value)
       / \
      3   2       <- Children (larger than parent)
     / \ / \
    5  4 6  7     <- Grandchildren (even larger)

Rules:
- Parent is always ≤ children
- Complete binary tree (fill left to right)
- Root = minimum value
```

### Max-Heap Structure (Visual)

```
        7         <- Root (largest value)
       / \
      5   6       <- Children (smaller than parent)
     / \ / \
    3  1 4  2     <- Grandchildren (even smaller)

Rules:
- Parent is always ≥ children
- Complete binary tree (fill left to right)
- Root = maximum value
```

### Why Use Min-Heap for K Largest? (The Counterintuitive Trick!)

This is the **most confusing part** for beginners! Let's break it down:

**Problem:** Find the 3 largest numbers in `[1, 5, 2, 9, 3, 7, 6]`

**Wrong thinking:** "I want largest, so I use Max-Heap!"
**Right thinking:** "I want to REMOVE smallest of my K items, so I use Min-Heap!"

#### Step-by-Step Visualization

```
Array: [1, 5, 2, 9, 3, 7, 6], K = 3

Step 1: Add 1
MinHeap: [1]
Size: 1 (< K, so keep it)

Step 2: Add 5
MinHeap: [1, 5]
Size: 2 (< K, so keep it)

Step 3: Add 2
MinHeap: [1, 5, 2]
Size: 3 (= K, perfect!)

Step 4: Add 9
MinHeap: [1, 5, 2, 9]
Size: 4 (> K, TOO BIG!)
Remove minimum (1) → MinHeap: [2, 5, 9]
Think: "9 is bigger than 1, so 1 can't be in top 3"

Step 5: Add 3
MinHeap: [2, 5, 9, 3]
Size: 4 (> K)
Remove minimum (2) → MinHeap: [3, 5, 9]

Step 6: Add 7
MinHeap: [3, 5, 9, 7]
Size: 4 (> K)
Remove minimum (3) → MinHeap: [5, 9, 7]

Step 7: Add 6
MinHeap: [5, 9, 7, 6]
Size: 4 (> K)
Remove minimum (5) → MinHeap: [6, 9, 7]

Final Result: [6, 7, 9] - The 3 largest elements!
```

#### The Golden Rule

```
┌────────────────────────────────────────────────────┐
│  Want K LARGEST?  → Use MIN-HEAP (remove smallest) │
│  Want K SMALLEST? → Use MAX-HEAP (remove largest)  │
└────────────────────────────────────────────────────┘
```

**Why?** Because we want to **kick out** the items that don't belong in our top K:
- For top K largest: kick out the smallest
- For top K smallest: kick out the largest

### Array Representation of Heap

Heaps are stored in arrays! This is how the tree structure maps to an array:

```
Tree form:
        1
       / \
      3   2
     / \
    5   4

Array form: [1, 3, 2, 5, 4]
Index:       0  1  2  3  4

Formulas (for index i):
- Parent: Math.floor((i - 1) / 2)
- Left child: 2 * i + 1
- Right child: 2 * i + 2

Example:
- Element at index 1 (value 3):
  - Parent: (1-1)/2 = 0 → value 1 ✓
  - Left child: 2*1+1 = 3 → value 5 ✓
  - Right child: 2*1+2 = 4 → value 4 ✓
```

---

## Example 1: Kth Largest Element in an Array (JavaScript)

### Problem
Given an integer array `nums` and an integer `k`, return the `k`th largest element in the array. Note that it is the `k`th largest element in sorted order, not the `k`th distinct element.

**LeetCode**: [215. Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)

### Solution

```javascript
/**
 * Find kth largest element using Min-Heap
 * @param {number[]} nums - Array of integers
 * @param {number} k - Position of largest element to find
 * @return {number} - Kth largest element
 */
function findKthLargest(nums, k) {
    // Min-Heap implementation using array
    // JavaScript doesn't have built-in heap, so we'll implement one
    class MinHeap {
        constructor() {
            this.heap = [];
        }

        size() {
            return this.heap.length;
        }

        peek() {
            return this.heap[0];
        }

        push(val) {
            this.heap.push(val);
            this.bubbleUp(this.heap.length - 1);
        }

        pop() {
            if (this.size() === 0) return null;
            if (this.size() === 1) return this.heap.pop();

            const min = this.heap[0];
            this.heap[0] = this.heap.pop();
            this.bubbleDown(0);
            return min;
        }

        bubbleUp(index) {
            while (index > 0) {
                const parentIndex = Math.floor((index - 1) / 2);
                if (this.heap[parentIndex] <= this.heap[index]) break;

                [this.heap[parentIndex], this.heap[index]] =
                    [this.heap[index], this.heap[parentIndex]];
                index = parentIndex;
            }
        }

        bubbleDown(index) {
            while (true) {
                let smallest = index;
                const left = 2 * index + 1;
                const right = 2 * index + 2;

                if (left < this.size() && this.heap[left] < this.heap[smallest]) {
                    smallest = left;
                }
                if (right < this.size() && this.heap[right] < this.heap[smallest]) {
                    smallest = right;
                }
                if (smallest === index) break;

                [this.heap[index], this.heap[smallest]] =
                    [this.heap[smallest], this.heap[index]];
                index = smallest;
            }
        }
    }

    // Use min-heap of size k to find k largest elements
    const minHeap = new MinHeap();

    for (const num of nums) {
        minHeap.push(num);

        // Keep heap size at k
        if (minHeap.size() > k) {
            minHeap.pop();  // Remove smallest
        }
    }

    // Root of min-heap is the kth largest element
    return minHeap.peek();
}

// Alternative solution using built-in sort (simpler but less efficient)
function findKthLargestSort(nums, k) {
    nums.sort((a, b) => b - a);  // Sort descending
    return nums[k - 1];
}

// Example usage
console.log(findKthLargest([3, 2, 1, 5, 6, 4], 2));     // Output: 5
// Explanation: Sorted array is [6, 5, 4, 3, 2, 1], 2nd largest is 5

console.log(findKthLargest([3, 2, 3, 1, 2, 4, 5, 5, 6], 4));  // Output: 4
// Explanation: Sorted array is [6, 5, 5, 4, 3, 3, 2, 2, 1], 4th largest is 4

console.log(findKthLargest([1], 1));                    // Output: 1

console.log(findKthLargest([7, 6, 5, 4, 3, 2, 1], 5));  // Output: 3
```

### Detailed Code Explanation (Line by Line)

Let's break down the heap implementation for complete beginners:

#### Understanding the MinHeap Class

```javascript
class MinHeap {
    constructor() {
        this.heap = [];  // We store the heap as an array
    }
```
**What's happening:** We create an empty array to store our heap. Remember, heaps are trees but we store them as arrays!

#### The bubbleUp Function (Adding Elements)

```javascript
bubbleUp(index) {
    while (index > 0) {
        const parentIndex = Math.floor((index - 1) / 2);

        // If parent is smaller, we're done (min-heap property satisfied)
        if (this.heap[parentIndex] <= this.heap[index]) break;

        // Otherwise, swap with parent and continue
        [this.heap[parentIndex], this.heap[index]] =
            [this.heap[index], this.heap[parentIndex]];
        index = parentIndex;
    }
}
```

**Visual Example of bubbleUp:**
```
Initial heap: [1, 3, 2, 5]
Add 0 to the end: [1, 3, 2, 5, 0]

bubbleUp from index 4 (value 0):

Step 1: Compare with parent
        1
       / \
      3   2
     / \
    5   0  <- Start here (index 4)

Parent index: (4-1)/2 = 1 (value 3)
3 > 0, so swap!

Step 2: After swap
        1
       / \
      0   2  <- Now at index 1
     / \
    5   3

Parent index: (1-1)/2 = 0 (value 1)
1 > 0, so swap!

Step 3: After swap
        0  <- Final position (index 0)
       / \
      1   2
     / \
    5   3

Done! 0 is at the root (smallest element)
```

#### The bubbleDown Function (Removing Elements)

```javascript
bubbleDown(index) {
    while (true) {
        let smallest = index;
        const left = 2 * index + 1;   // Left child
        const right = 2 * index + 2;  // Right child

        // Find the smallest among: current, left child, right child
        if (left < this.size() && this.heap[left] < this.heap[smallest]) {
            smallest = left;
        }
        if (right < this.size() && this.heap[right] < this.heap[smallest]) {
            smallest = right;
        }

        // If current is smallest, we're done
        if (smallest === index) break;

        // Otherwise, swap and continue
        [this.heap[index], this.heap[smallest]] =
            [this.heap[smallest], this.heap[index]];
        index = smallest;
    }
}
```

**Visual Example of bubbleDown:**
```
Remove root (pop operation):
Step 1: Remove root and move last element to root
        1              9
       / \            / \
      3   2    →     3   2
     / \            /
    5   9          5

Step 2: bubbleDown from index 0 (value 9)
        9  <- Too big! Swap with smallest child (2)
       / \
      3   2
     /
    5

Step 3: After swap
        2
       / \
      3   9  <- Still too big! Swap with 5
     /
    5

Step 4: After swap
        2
       / \
      3   5
     /
    9    <- Done! All parents ≤ children
```

#### The Main Algorithm

```javascript
const minHeap = new MinHeap();

for (const num of nums) {
    minHeap.push(num);      // Add element to heap

    if (minHeap.size() > k) {
        minHeap.pop();       // Remove smallest if size exceeds k
    }
}

return minHeap.peek();      // Return root (kth largest)
```

**Why this works:**
1. We add each element to the heap
2. If heap gets too big (> k elements), we remove the smallest
3. After processing all elements, heap contains exactly k largest elements
4. The root (smallest in heap) is the kth largest overall!

**Think of it like this:**
- Heap = "VIP section" with only k seats
- New person arrives → add them to VIP
- Too many people? → kick out the "least VIP" person (smallest score)
- After everyone's been checked, the "least VIP" in VIP section = kth best overall!

### Original Explanation

**Why Min-Heap for k largest?**

- We want to keep track of the k largest elements
- Min-heap keeps smallest element at root
- If heap size > k, we remove the smallest (which is not in top k)
- After processing all elements, heap contains k largest elements
- Root of min-heap is the smallest among k largest = kth largest overall

**Visual Example** for `nums = [3, 2, 1, 5, 6, 4], k = 2`:

```
Process 3: heap = [3]
Process 2: heap = [2, 3]
Process 1: heap = [2, 3], size > k, remove 1, heap = [2, 3]
Process 5: heap = [2, 3, 5], size > k, remove 2, heap = [3, 5]
Process 6: heap = [3, 5, 6], size > k, remove 3, heap = [5, 6]
Process 4: heap = [4, 6, 5], size > k, remove 4, heap = [5, 6]

Final heap = [5, 6] → kth largest (k=2) = 5
```

---

## Example 2: Top K Frequent Elements (Python)

### Problem
Given an integer array `nums` and an integer `k`, return the `k` most frequent elements. You may return the answer in any order.

**LeetCode**: [347. Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)

### Solution

```python
from typing import List
from collections import Counter
import heapq

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        """
        Find k most frequent elements using Min-Heap

        Args:
            nums: Array of integers
            k: Number of most frequent elements to return

        Returns:
            List of k most frequent elements
        """
        # Step 1: Count frequency of each element
        freq_map = Counter(nums)

        # Step 2: Use min-heap to keep track of k most frequent elements
        # Heap stores tuples: (frequency, number)
        min_heap = []

        for num, freq in freq_map.items():
            heapq.heappush(min_heap, (freq, num))

            # Keep heap size at k
            if len(min_heap) > k:
                heapq.heappop(min_heap)  # Remove least frequent

        # Step 3: Extract elements from heap
        result = [num for freq, num in min_heap]

        return result

    def topKFrequentBucketSort(self, nums: List[int], k: int) -> List[int]:
        """
        Alternative solution using bucket sort - O(n) time

        Args:
            nums: Array of integers
            k: Number of most frequent elements to return

        Returns:
            List of k most frequent elements
        """
        # Count frequencies
        freq_map = Counter(nums)

        # Create buckets where index represents frequency
        # bucket[i] contains all numbers with frequency i
        buckets = [[] for _ in range(len(nums) + 1)]

        for num, freq in freq_map.items():
            buckets[freq].append(num)

        # Collect k most frequent elements from buckets (right to left)
        result = []
        for i in range(len(buckets) - 1, 0, -1):
            for num in buckets[i]:
                result.append(num)
                if len(result) == k:
                    return result

        return result

# Example usage
solution = Solution()

# Example 1
nums1 = [1, 1, 1, 2, 2, 3]
k1 = 2
print(solution.topKFrequent(nums1, k1))  # Output: [1, 2]
# Explanation: 1 appears 3 times, 2 appears 2 times (most frequent)

# Example 2
nums2 = [1]
k2 = 1
print(solution.topKFrequent(nums2, k2))  # Output: [1]

# Example 3
nums3 = [4, 1, -1, 2, -1, 2, 3]
k3 = 2
print(solution.topKFrequent(nums3, k3))  # Output: [-1, 2] (or [2, -1])
# Explanation: -1 appears 2 times, 2 appears 2 times

# Example 4 - Using bucket sort
nums4 = [1, 1, 1, 2, 2, 3]
k4 = 2
print(solution.topKFrequentBucketSort(nums4, k4))  # Output: [1, 2]
```

### Explanation

**Heap-based Approach**:

1. **Count frequencies**: Use hashmap to count occurrences
2. **Build min-heap**: Store (frequency, element) pairs
3. **Maintain size k**: If heap exceeds k, remove least frequent
4. **Extract result**: Elements in heap are k most frequent

**Visual Example** for `nums = [1,1,1,2,2,3], k = 2`:

```
Frequency map: {1: 3, 2: 2, 3: 1}

Process (3, 1): heap = [(3, 1)]
Process (2, 2): heap = [(2, 2), (3, 1)]
Process (1, 3): heap = [(1, 3), (3, 1), (2, 2)]
                size > k, remove (1, 3)
                heap = [(2, 2), (3, 1)]

Result: [2, 1] (extract elements from heap)
```

**Bucket Sort Approach** (More efficient for this problem):

```
Frequency map: {1: 3, 2: 2, 3: 1}

Buckets:
  bucket[0] = []
  bucket[1] = [3]     (3 appears 1 time)
  bucket[2] = [2]     (2 appears 2 times)
  bucket[3] = [1]     (1 appears 3 times)

Iterate from right: [1] → [2] → k elements collected
Result: [1, 2]
```

---

## Time & Space Complexity

### Example 1: Kth Largest Element
- **Heap approach**:
  - Time Complexity: O(n log k) - Process n elements, each heap operation is O(log k)
  - Space Complexity: O(k) - Heap size
- **Sort approach**:
  - Time Complexity: O(n log n)
  - Space Complexity: O(1) or O(n) depending on sort implementation

### Example 2: Top K Frequent
- **Heap approach**:
  - Time Complexity: O(n log k) - n for counting, n log k for heap operations
  - Space Complexity: O(n) - HashMap + O(k) heap
- **Bucket sort approach**:
  - Time Complexity: O(n)
  - Space Complexity: O(n)

---

## Common Variations

1. **Kth Largest/Smallest Element**
   - LeetCode: [215. Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)
   - LeetCode: [703. Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/)

2. **Top K Frequent Elements**
   - LeetCode: [347. Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
   - LeetCode: [692. Top K Frequent Words](https://leetcode.com/problems/top-k-frequent-words/)

3. **K Closest Points**
   - LeetCode: [973. K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/)

4. **K Pairs with Smallest Sums**
   - LeetCode: [373. Find K Pairs with Smallest Sums](https://leetcode.com/problems/find-k-pairs-with-smallest-sums/)

---

## Practice Problems

### Easy
1. [703. Kth Largest Element in a Stream](https://leetcode.com/problems/kth-largest-element-in-a-stream/)

### Medium
2. [215. Kth Largest Element in an Array](https://leetcode.com/problems/kth-largest-element-in-an-array/)
3. [347. Top K Frequent Elements](https://leetcode.com/problems/top-k-frequent-elements/)
4. [692. Top K Frequent Words](https://leetcode.com/problems/top-k-frequent-words/)
5. [973. K Closest Points to Origin](https://leetcode.com/problems/k-closest-points-to-origin/)
6. [658. Find K Closest Elements](https://leetcode.com/problems/find-k-closest-elements/)
7. [767. Reorganize String](https://leetcode.com/problems/reorganize-string/)

### Hard
8. [295. Find Median from Data Stream](https://leetcode.com/problems/find-median-from-data-stream/)
9. [502. IPO](https://leetcode.com/problems/ipo/)

---

## Key Takeaways

1. **Heap choice**:
   - Min-heap for k largest elements (keep largest k, remove smallest)
   - Max-heap for k smallest elements (keep smallest k, remove largest)

2. **Efficiency**: O(n log k) vs O(n log n) - significant when k << n

3. **Heap size**: Always maintain heap at size k

4. **Python heapq**: Python's heapq is a min-heap by default
   - For max-heap, negate values or use custom comparator

5. **Alternative approaches**: Quickselect (O(n) average), Bucket sort (for frequency problems)

6. **Streaming data**: Particularly useful when data arrives in streams

[← Previous: Monotonic Stack](./06-monotonic-stack.md) | [Back to Index](./README.md) | [Next: Overlapping Intervals →](./08-overlapping-intervals.md)
