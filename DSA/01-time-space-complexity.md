# Time & Space Complexity Analysis

## Pattern Overview

Understanding time and space complexity is fundamental to algorithm analysis and technical interviews. Every solution you propose must be analyzed for both time and space efficiency.

**Big O Notation** describes the upper bound of algorithm performance as input size grows.

## 🎯 When to Consider Complexity

- During coding interviews (always state complexity)
- Choosing between multiple solutions
- Optimizing existing code
- Estimating scalability
- Comparing algorithm efficiency

## 📊 Common Time Complexities

> 💡 **Key Concept**: Big O describes how runtime or space grows as input size (n) increases to infinity. We focus on the **dominant term** and ignore constants.

### Understanding Complexity Growth

**Visual Growth Comparison** (Input Size Impact):

| n | O(1) | O(log n) | O(n) | O(n log n) | O(n²) | O(2ⁿ) | O(n!) |
|---|------|----------|------|------------|-------|-------|-------|
| 10 | 1 | 3 | 10 | 30 | 100 | 1,024 | 3,628,800 |
| 100 | 1 | 7 | 100 | 664 | 10,000 | 1.27×10³⁰ | 9.33×10¹⁵⁷ |
| 1,000 | 1 | 10 | 1,000 | 9,966 | 1,000,000 | ∞ | ∞ |
| 1,000,000 | 1 | 20 | 1,000,000 | 19,931,569 | 10¹² | ∞ | ∞ |

**Scalability Guide:**
- ✅ **O(1), O(log n), O(n)**: Scale to millions of elements
- ⚠️ **O(n log n)**: Good for up to millions (sorting)
- ⚠️ **O(n²)**: Acceptable for < 10,000 elements
- ❌ **O(2ⁿ), O(n!)**: Only works for tiny inputs (n < 20)

---

### O(1) - Constant Time
**Performance:** Same time regardless of input size

**Examples:**
- Array access by index
- Hash map get/set operations
- Math operations
- Variable assignment

```typescript
// O(1) - Constant time
function getFirstElement<T>(arr: T[]): T {
  return arr[0]; // Single operation, doesn't depend on array size
}

function hashLookup<K, V>(map: Map<K, V>, key: K): V | undefined {
  return map.get(key); // Hash map lookup is O(1) average case
}
```

---

### O(log n) - Logarithmic Time
**Performance:** Doubles input, adds one operation

**Examples:**
- Binary search
- Balanced tree operations
- Finding in sorted array

```typescript
// O(log n) - Binary search
function binarySearch(arr: number[], target: number): number {
  let left: number = 0;
  let right: number = arr.length - 1;

  while (left <= right) {
    const mid: number = Math.floor((left + right) / 2);

    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }

  return -1;
}

// Time: O(log n) - halves search space each iteration
// Space: O(1) - only uses a few variables
```

**Why O(log n)?**
- Each iteration halves the search space
- n → n/2 → n/4 → n/8 → ... → 1
- Number of steps = log₂(n)

---

### O(n) - Linear Time
**Performance:** Proportional to input size

**Examples:**
- Single loop through array
- Linear search
- Finding min/max in unsorted array

```typescript
// O(n) - Linear time
function findMax(arr: number[]): number {
  let max: number = arr[0];

  // Loop runs n times
  for (let i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      max = arr[i];
    }
  }

  return max;
}

// Time: O(n) - one pass through array
// Space: O(1) - only one variable
```

**Multiple Loops:**
```typescript
// Still O(n) - sequential loops
function processArray(arr: number[]): void {
  // First loop: O(n)
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i]);
  }

  // Second loop: O(n)
  for (let i = 0; i < arr.length; i++) {
    console.log(arr[i] * 2);
  }

  // Total: O(n) + O(n) = O(2n) = O(n)
  // We drop constants in Big O
}
```

---

### O(n log n) - Linearithmic Time
**Performance:** Linear time with logarithmic factor

**Examples:**
- Efficient sorting (Merge Sort, Quick Sort, Heap Sort)
- Divide and conquer algorithms

```typescript
// O(n log n) - Merge Sort
function mergeSort(arr: number[]): number[] {
  if (arr.length <= 1) return arr;

  const mid: number = Math.floor(arr.length / 2);
  const left: number[] = mergeSort(arr.slice(0, mid));   // O(log n) divisions
  const right: number[] = mergeSort(arr.slice(mid));     // O(log n) divisions

  return merge(left, right);                              // O(n) merge
}

function merge(left: number[], right: number[]): number[] {
  const result: number[] = [];
  let i = 0, j = 0;

  while (i < left.length && j < right.length) {
    if (left[i] < right[j]) {
      result.push(left[i++]);
    } else {
      result.push(right[j++]);
    }
  }

  return result.concat(left.slice(i)).concat(right.slice(j));
}

// Time: O(n log n) - log n recursive divisions, n work per level
// Space: O(n) - temporary arrays for merging
```

**Why O(n log n)?**
- Divides array log n times (like binary search)
- Each level does O(n) work (merging)
- Total: O(n) × O(log n) = O(n log n)

---

### O(n²) - Quadratic Time
**Performance:** Nested operations over input

**Examples:**
- Nested loops
- Bubble sort, Selection sort
- Comparing all pairs

```typescript
// O(n²) - Nested loops
function findDuplicates(arr: number[]): number[] {
  const duplicates: number[] = [];

  // Outer loop: n iterations
  for (let i = 0; i < arr.length; i++) {
    // Inner loop: n iterations
    for (let j = i + 1; j < arr.length; j++) {
      if (arr[i] === arr[j] && !duplicates.includes(arr[i])) {
        duplicates.push(arr[i]);
      }
    }
  }

  return duplicates;
}

// Time: O(n²) - nested loops
// Space: O(n) - worst case all are duplicates
```

```typescript
// O(n²) - Bubble Sort
function bubbleSort(arr: number[]): number[] {
  const n: number = arr.length;

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      }
    }
  }

  return arr;
}

// Time: O(n²)
// Space: O(1) - in-place sorting
```

**Optimization:**
```typescript
// O(n) - Better approach using hash set
function findDuplicatesOptimized(arr: number[]): number[] {
  const seen: Set<number> = new Set();
  const duplicates: Set<number> = new Set();

  for (const num of arr) {
    if (seen.has(num)) {
      duplicates.add(num);
    } else {
      seen.add(num);
    }
  }

  return Array.from(duplicates);
}

// Time: O(n) - single pass
// Space: O(n) - using sets
```

---

### O(2ⁿ) - Exponential Time
**Performance:** Doubles with each input increase

**Examples:**
- Recursive Fibonacci (naive)
- Generating all subsets
- Brute force solutions

```typescript
// O(2ⁿ) - Naive Fibonacci
function fibonacci(n: number): number {
  if (n <= 1) return n;

  // Each call makes 2 more calls
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// Time: O(2ⁿ) - exponential branching
// Space: O(n) - recursion depth

// For n=5: Makes 15 function calls
// For n=10: Makes 177 function calls
// For n=20: Makes 21,891 function calls!
```

**Optimization with Memoization:**
```typescript
// O(n) - Optimized with memoization
function fibonacciMemo(n: number, memo: Record<number, number> = {}): number {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];

  memo[n] = fibonacciMemo(n - 1, memo) + fibonacciMemo(n - 2, memo);
  return memo[n];
}

// Time: O(n) - each value calculated once
// Space: O(n) - memo storage + recursion stack
```

---

### O(n!) - Factorial Time
**Performance:** Multiplies for each input

**Examples:**
- Generating all permutations
- Traveling salesman (brute force)
- Combinatorial problems

```typescript
// O(n!) - Generate all permutations
function permutations<T>(arr: T[]): T[][] {
  if (arr.length <= 1) return [arr];

  const result: T[][] = [];

  for (let i = 0; i < arr.length; i++) {
    const current: T = arr[i];
    const remaining: T[] = arr.slice(0, i).concat(arr.slice(i + 1));
    const remainingPerms: T[][] = permutations(remaining);

    for (const perm of remainingPerms) {
      result.push([current, ...perm]);
    }
  }

  return result;
}

// Time: O(n!) - n choices, then n-1, then n-2, ...
// Space: O(n!) - storing all permutations

// For n=5: 120 permutations
// For n=10: 3,628,800 permutations!
```

---

## 📦 Space Complexity Analysis

### O(1) - Constant Space
**Only uses fixed amount of extra space**

```typescript
// O(1) space
function sumArray(arr: number[]): number {
  let sum: number = 0; // Only one variable

  for (const num of arr) {
    sum += num;
  }

  return sum;
}

// Time: O(n)
// Space: O(1) - only 'sum' variable
```

---

### O(n) - Linear Space
**Space grows with input size**

```typescript
// O(n) space - Creating new array
function doubleValues(arr: number[]): number[] {
  const result: number[] = []; // New array of size n

  for (const num of arr) {
    result.push(num * 2);
  }

  return result;
}

// Time: O(n)
// Space: O(n) - result array
```

**Recursion Stack Space:**
```typescript
// O(n) space - Recursion depth
function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// Time: O(n)
// Space: O(n) - call stack stores n function calls
```

---

### O(log n) - Logarithmic Space
**Space for balanced tree or divide-and-conquer**

```typescript
// O(log n) space - Binary search (recursive)
function binarySearchRecursive(
  arr: number[],
  target: number,
  left: number = 0,
  right: number = arr.length - 1
): number {
  if (left > right) return -1;

  const mid: number = Math.floor((left + right) / 2);

  if (arr[mid] === target) return mid;
  if (arr[mid] < target) {
    return binarySearchRecursive(arr, target, mid + 1, right);
  } else {
    return binarySearchRecursive(arr, target, left, mid - 1);
  }
}

// Time: O(log n)
// Space: O(log n) - recursion depth is log n
```

---

## 🎯 Analyzing Complexity: Step-by-Step

### Step 1: Identify Operations
Count how many times key operations execute relative to input size.

```typescript
function example(arr: number[]): number {
  let sum: number = 0;                    // O(1) - single operation

  for (let i = 0; i < arr.length; i++) {   // O(n) - loops n times
    sum += arr[i];                         // O(1) per iteration
  }

  return sum;                              // O(1) - single operation
}

// Total Time: O(1) + O(n) × O(1) + O(1) = O(n)
// Space: O(1) - only 'sum' variable
```

### Step 2: Count Nested Loops
Multiply complexities of nested operations.

```typescript
function exampleNested(arr: number[]): void {
  for (let i = 0; i < arr.length; i++) {        // O(n)
    for (let j = 0; j < arr.length; j++) {      // O(n)
      console.log(arr[i], arr[j]);              // O(1)
    }
  }
}

// Time: O(n) × O(n) × O(1) = O(n²)
```

### Step 3: Sequential Operations
Add complexities of sequential operations.

```typescript
function exampleSequential(arr: number[]): void {
  // First loop
  for (let i = 0; i < arr.length; i++) {     // O(n)
    console.log(arr[i]);
  }

  // Second loop
  for (let i = 0; i < arr.length; i++) {     // O(n)
    console.log(arr[i] * 2);
  }

  // Nested loops
  for (let i = 0; i < arr.length; i++) {     // O(n)
    for (let j = 0; j < arr.length; j++) {   // O(n)
      console.log(arr[i] + arr[j]);
    }
  }
}

// Time: O(n) + O(n) + O(n²) = O(n²)
// Drop lower-order terms, keep dominant term
```

### Step 4: Drop Constants and Lower Terms
Big O cares about growth rate, not exact count.

```typescript
// O(3n² + 5n + 10) → O(n²)
// Drop constants: 3, 5, 10
// Drop lower terms: n compared to n²
// Keep dominant term: n²
```

---

## 📊 Complexity Comparison

### Growth Rates (n = 1000)

| Complexity | Operations | Example |
|------------|-----------|---------|
| O(1) | 1 | Hash lookup |
| O(log n) | ~10 | Binary search |
| O(n) | 1,000 | Linear search |
| O(n log n) | ~10,000 | Merge sort |
| O(n²) | 1,000,000 | Bubble sort |
| O(2ⁿ) | 10³⁰⁰+ | Naive Fibonacci |
| O(n!) | Astronomical | All permutations |

**For n = 1,000,000:**
- O(log n): ~20 operations ✅ Very fast
- O(n): 1,000,000 operations ✅ Fast
- O(n log n): ~20,000,000 operations ✅ Acceptable
- O(n²): 1,000,000,000,000 operations ❌ Too slow

---

## 🔍 Common Interview Scenarios

### Scenario 1: Two Sum Problem

**Brute Force - O(n²):**
```typescript
function twoSumBrute(nums: number[], target: number): number[] {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return [];
}

// Time: O(n²) - nested loops
// Space: O(1) - no extra space
```

**Optimized - O(n):**
```typescript
function twoSum(nums: number[], target: number): number[] {
  const map: Map<number, number> = new Map();

  for (let i = 0; i < nums.length; i++) {
    const complement: number = target - nums[i];

    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }

    map.set(nums[i], i);
  }

  return [];
}

// Time: O(n) - single pass
// Space: O(n) - hash map storage
// Trade-off: Use more space to get better time
```

---

### Scenario 2: Finding Duplicates

**Brute Force - O(n²):**
```typescript
function containsDuplicateBrute(nums: number[]): boolean {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      if (nums[i] === nums[j]) return true;
    }
  }
  return false;
}

// Time: O(n²)
// Space: O(1)
```

**Sort First - O(n log n):**
```typescript
function containsDuplicateSort(nums: number[]): boolean {
  nums.sort((a, b) => a - b);

  for (let i = 1; i < nums.length; i++) {
    if (nums[i] === nums[i - 1]) return true;
  }

  return false;
}

// Time: O(n log n) - sorting dominates
// Space: O(1) or O(n) depending on sort implementation
```

**Hash Set - O(n):**
```typescript
function containsDuplicate(nums: number[]): boolean {
  const seen: Set<number> = new Set();

  for (const num of nums) {
    if (seen.has(num)) return true;
    seen.add(num);
  }

  return false;
}

// Time: O(n) - single pass
// Space: O(n) - set storage
```

---

## 💡 Complexity Optimization Strategies

### Optimization Toolkit: Before & After

| Strategy | Before | After | Space Trade-off | Best For |
|----------|--------|-------|-----------------|----------|
| **Hash Map/Set** | O(n²) | O(n) | O(1) → O(n) | Lookups, duplicates |
| **Sort First** | O(n²) | O(n log n) | O(1) → O(n) | Pair finding, intervals |
| **Two Pointers** | O(n²) | O(n) | O(1) | Sorted arrays, pairs |
| **Sliding Window** | O(n×k) | O(n) | O(1) | Subarray problems |
| **Divide & Conquer** | O(n²) | O(n log n) | O(log n) - O(n) | Sorting, searching |
| **Memoization/DP** | O(2ⁿ) | O(n) - O(n²) | O(n) - O(n²) | Overlapping subproblems |

### 1. Use Hash Maps/Sets
💡 **Pattern**: Trade space for time with O(1) lookups

**❌ Brute Force (O(n²)):**
```typescript
function hasPairWithSumBrute(arr: number[], target: number): boolean {
  for (let i = 0; i < arr.length; i++) {           // O(n)
    for (let j = i + 1; j < arr.length; j++) {     // O(n)
      if (arr[i] + arr[j] === target) return true;
    }
  }
  return false;
}
// Time: O(n²), Space: O(1)
```

**✅ Optimized with Hash Set (O(n)):**
```typescript
function hasPairWithSum(arr: number[], target: number): boolean {
  const seen: Set<number> = new Set();

  for (const num of arr) {                         // O(n)
    if (seen.has(target - num)) return true;       // O(1) lookup!
    seen.add(num);
  }
  return false;
}
// Time: O(n), Space: O(n)
// 🎯 100x faster for n=1000: 1,000,000 → 1,000 operations
```

---

### 2. Sort First
💡 **Pattern**: Preprocessing unlocks better algorithms

**Sort then Binary Search:**
```typescript
function sortThenSearch(arr: number[], target: number): number {
  // Must sort first!
  arr.sort((a, b) => a - b);  // O(n log n)

  let left = 0, right = arr.length - 1;
  while (left <= right) {
    const mid: number = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}
// Time: O(n log n), Space: O(1)
// Worth it if searching multiple times!
```

**When to Sort:**
- ✅ **Multiple searches**: O(n log n) sort + k×O(log n) searches = O(n log n + k log n)
- ✅ **Two pointers pattern**: Enables O(n) algorithms
- ❌ **Single search**: O(n log n) sort worse than O(n) linear search

---

### 3. Two Pointers
💡 **Pattern**: Replace nested loops on sorted data

**❌ Nested Loop (O(n³)):**
```typescript
function threeSumBrute(nums: number[], target: number): number[] {
  for (let i = 0; i < nums.length; i++) {
    for (let j = i + 1; j < nums.length; j++) {
      for (let k = j + 1; k < nums.length; k++) {
        if (nums[i] + nums[j] + nums[k] === target) {
          return [nums[i], nums[j], nums[k]];
        }
      }
    }
  }
  return [];
}
// Time: O(n³), Space: O(1)
```

**✅ Sort + Two Pointers (O(n²)):**
```typescript
function threeSum(nums: number[], target: number): number[] {
  nums.sort((a, b) => a - b);  // O(n log n)

  for (let i = 0; i < nums.length - 2; i++) {
    let left: number = i + 1;
    let right: number = nums.length - 1;

    while (left < right) {  // Two pointers: O(n)
      const sum: number = nums[i] + nums[left] + nums[right];
      if (sum === target) return [nums[i], nums[left], nums[right]];
      if (sum < target) left++;
      else right--;
    }
  }
  return [];
}
// Time: O(n²), Space: O(1)
// Reduced O(n³) → O(n²) by eliminating one loop!
```

---

### 4. Sliding Window
💡 **Pattern**: Reuse calculations instead of recomputing

**❌ Recalculating Every Window (O(n×k)):**
```typescript
function maxSumSubarrayBrute(arr: number[], k: number): number {
  let maxSum: number = -Infinity;

  for (let i = 0; i <= arr.length - k; i++) {     // O(n)
    let sum: number = 0;
    for (let j = i; j < i + k; j++) {             // O(k)
      sum += arr[j];
    }
    maxSum = Math.max(maxSum, sum);
  }
  return maxSum;
}
// Time: O(n×k), Space: O(1)
```

**✅ Sliding Window (O(n)):**
```typescript
function maxSumSubarray(arr: number[], k: number): number {
  let windowSum: number = 0;
  let maxSum: number = 0;

  // Calculate first window
  for (let i = 0; i < k; i++) {
    windowSum += arr[i];
  }
  maxSum = windowSum;

  // Slide window: Remove left, add right
  for (let i = k; i < arr.length; i++) {
    windowSum = windowSum - arr[i - k] + arr[i];  // O(1) update!
    maxSum = Math.max(maxSum, windowSum);
  }
  return maxSum;
}
// Time: O(n), Space: O(1)
// For n=10000, k=100: 1,000,000 → 10,000 operations (100x faster!)
```

---

### 5. Divide and Conquer
💡 **Pattern**: Break into subproblems, combine results

**Why O(n log n)?**
1. **Divide**: Split problem into halves → log n levels
2. **Conquer**: Solve each subproblem
3. **Combine**: Merge results → O(n) work per level
4. **Total**: O(n) work × O(log n) levels = O(n log n)

**Visual Tree (Merge Sort):**
```
              [8,3,5,1,9,2,7,4]           Level 0: n work
              /              \
        [8,3,5,1]          [9,2,7,4]      Level 1: n work
        /      \            /      \
    [8,3]    [5,1]      [9,2]    [7,4]    Level 2: n work
    /  \      /  \      /  \      /  \
  [8] [3]  [5] [1]   [9] [2]   [7] [4]    Level 3: n work

Total Levels: log₂(n) = 3
Work per Level: n = 8
Total: O(n log n) = 8 × 3 = 24 operations
```

---

### 6. Dynamic Programming / Memoization
💡 **Pattern**: Cache results to avoid recomputation

**❌ Naive Recursion (O(2ⁿ)):**
```typescript
function fibonacciNaive(n: number): number {
  if (n <= 1) return n;
  return fibonacciNaive(n - 1) + fibonacciNaive(n - 2);
}

// Call tree for fib(5):
//                fib(5)
//              /        \
//         fib(4)        fib(3)
//        /      \       /     \
//    fib(3)  fib(2) fib(2) fib(1)
//    /   \    /  \   /  \
// fib(2) fib(1) ... ... ...

// fib(3) calculated 2 times
// fib(2) calculated 3 times
// Total calls: 15 for n=5, 177 for n=10!
// Time: O(2ⁿ), Space: O(n) call stack
```

**✅ Memoization (O(n)):**
```typescript
function fibonacciMemoized(
  n: number,
  memo: Record<number, number> = {}
): number {
  if (n <= 1) return n;
  if (memo[n]) return memo[n];  // ✅ Return cached result!

  memo[n] = fibonacciMemoized(n - 1, memo) + fibonacciMemoized(n - 2, memo);
  return memo[n];
}

// Each fib(i) calculated exactly once
// Total calls: 9 for n=5, 19 for n=10
// Time: O(n), Space: O(n)
// 🎯 For n=40: 2,692,537,351 → 79 calls (34 million times faster!)
```

**✅ Bottom-Up DP (O(n) time, O(1) space):**
```typescript
function fibonacciDP(n: number): number {
  if (n <= 1) return n;

  let prev: number = 0, curr: number = 1;
  for (let i = 2; i <= n; i++) {
    [prev, curr] = [curr, prev + curr];
  }
  return curr;
}
// Time: O(n), Space: O(1) - even better!
```

---

### ⚡ Optimization Decision Tree

```
┌─ Need to find/search? ────────────────────┐
│                                            │
│  Sorted?                                   │
│  ├─ Yes → Binary Search O(log n)          │
│  └─ No  → Hash Map O(n)                   │
└────────────────────────────────────────────┘

┌─ Need all pairs/triplets? ────────────────┐
│                                            │
│  Can sort?                                 │
│  ├─ Yes → Sort + Two Pointers O(n²)       │
│  └─ No  → Hash Map O(n) or Brute Force    │
└────────────────────────────────────────────┘

┌─ Subarray/Substring problem? ─────────────┐
│                                            │
│  Fixed size window?                        │
│  ├─ Yes → Sliding Window O(n)             │
│  └─ No  → Two Pointers / Hash Map O(n)    │
└────────────────────────────────────────────┘

┌─ Recursive with repeated calls? ──────────┐
│                                            │
│  Overlapping subproblems?                  │
│  ├─ Yes → Memoization/DP O(n)-O(n²)       │
│  └─ No  → Divide & Conquer O(n log n)     │
└────────────────────────────────────────────┘
```

---

## 🎤 Interview Communication

> 💡 **Interview Tip**: Always state complexity BEFORE you start coding and AFTER you finish. This shows analytical thinking.

### Communication Framework

**Follow this 4-step structure:**

1. **Understand** → Clarify inputs/outputs
2. **Approach** → Explain solution with complexity
3. **Code** → Implement while narrating
4. **Analyze** → State final complexity and trade-offs

---

### ❌ Bad Interview Responses

**Example 1: No Complexity Mentioned**
```
Interviewer: "Find if array has duplicates"
Candidate: "I'll loop through and check each element. Done!"
```
❌ **Why Bad:**
- No complexity analysis
- No consideration of alternatives
- Doesn't show optimization thinking

**Example 2: Vague Complexity**
```
Interviewer: "What's the complexity?"
Candidate: "It's fast, like O(n) or something."
```
❌ **Why Bad:**
- Uncertain ("or something")
- No space complexity mentioned
- No explanation of why

---

### ✅ Good Interview Responses

**Example 1: Complete Analysis**
```
Interviewer: "Find if array has duplicates"

Candidate: "I can think of three approaches:

1. Brute force: Check every pair
   - Time: O(n²), Space: O(1)
   - Simple but too slow for large inputs

2. Sort first: Then check adjacent elements
   - Time: O(n log n), Space: O(1) or O(n) depending on sort
   - Better, but we can do even better

3. Hash set: Track seen values (recommended)
   - Time: O(n), Space: O(n)
   - Single pass, fastest approach
   - Trade-off: Uses extra space

I'll implement approach 3 since it's optimal for time complexity."

[Implements solution]

"Final complexity: O(n) time because we iterate once, O(n) space for
the hash set. This scales well to millions of elements."
```
✅ **Why Good:**
- Considered multiple approaches
- Stated complexity for each
- Explained trade-offs
- Made informed decision
- Confirmed complexity at end

**Example 2: Optimization Discussion**
```
Interviewer: "How would you optimize this O(n²) solution?"

Candidate: "The bottleneck is the nested loop where we check if target - nums[i]
exists in the rest of the array. That inner loop is O(n).

I can optimize by using a hash map to store values we've seen. Hash map lookups
are O(1) average case, so we can eliminate the inner loop entirely.

New approach:
- Single loop: O(n)
- Hash map lookup per iteration: O(1)
- Total time: O(n)
- Space trade-off: O(n) for the hash map

This improves from O(n²) to O(n), which is 1000x faster for n=1000."
```
✅ **Why Good:**
- Identified the bottleneck
- Explained why hash map helps
- Clear before/after complexity
- Quantified improvement
- Acknowledged space trade-off

**Example 3: Considering Constraints**
```
Interviewer: "Find duplicates in an array"

Candidate: "Before choosing an approach, can I ask a few questions?

1. Can I modify the input array?
2. What's the expected size - thousands or millions?
3. Are we memory-constrained?

[After getting answers]

Based on the constraints:
- Input size: Up to 10^6 elements
- Cannot modify input
- Memory available

I'll use a hash set approach: O(n) time, O(n) space. This scales well to
the expected input size and gives us optimal time complexity."
```
✅ **Why Good:**
- Asks clarifying questions
- Chooses approach based on constraints
- Justifies decision
- Shows practical thinking

---

### 📊 Space-Time Tradeoff Table

| Problem | Approach | Time | Space | When to Use |
|---------|----------|------|-------|-------------|
| **Find duplicates** | Brute force | O(n²) | O(1) | Memory critical, small n |
| | Sort first | O(n log n) | O(1)-O(n) | Can modify input |
| | Hash set | O(n) | O(n) | ✅ Best for large n |
| **Two Sum** | Brute force | O(n²) | O(1) | n < 100 |
| | Hash map | O(n) | O(n) | ✅ Standard solution |
| **Binary search** | Linear search | O(n) | O(1) | Unsorted, single search |
| | Sort + binary | O(n log n) | O(1)-O(n) | Multiple searches |
| | Hash map | O(n) | O(n) | ✅ Exact match, many searches |
| **Fibonacci** | Naive recursion | O(2ⁿ) | O(n) | ❌ Never use |
| | Memoization | O(n) | O(n) | Recursive style preferred |
| | Bottom-up DP | O(n) | O(1) | ✅ Most efficient |

**Decision Guide:**
- ✅ **Time critical** → Accept higher space complexity
- ✅ **Space critical** → Accept higher time complexity
- ⚠️ **Both critical** → Look for clever algorithm (e.g., two pointers)

---

### 🎯 Common Complexity Mistakes

#### Mistake 1: Ignoring Hidden Operations

**❌ Wrong Analysis:**
```typescript
function solutionWrong(arr: number[]): void {
  for (let i = 0; i < arr.length; i++) {
    arr.sort();  // "This is just one line, so O(1)"
  }
}
// Claimed: O(n)
```

**✅ Correct Analysis:**
```typescript
function solutionCorrect(arr: number[]): void {
  for (let i = 0; i < arr.length; i++) {     // O(n)
    arr.sort();  // ❌ O(n log n) - NOT O(1)!
  }
}
// Actual: O(n) × O(n log n) = O(n² log n)
```

💡 **Lesson**: Built-in methods have their own complexity!
- `sort()`: O(n log n)
- `slice()`: O(n)
- `includes()`: O(n)
- `map()`, `filter()`: O(n)

---

#### Mistake 2: Confusing Average and Worst Case

**❌ Wrong Statement:**
```
"Hash map lookup is O(1), so my solution is O(n)"
```

**✅ Correct Statement:**
```
"Hash map lookup is O(1) average case, O(n) worst case with collisions.
For interview purposes, we assume average case: O(1).
My solution is O(n) average, O(n²) worst case."
```

💡 **Lesson**: Specify average vs worst case for hash-based structures.

---

#### Mistake 3: Not Counting Space for Recursion

**❌ Wrong Analysis:**
```typescript
function factorialWrong(n: number): number {
  if (n <= 1) return 1;
  return n * factorialWrong(n - 1);
}
// Claimed: O(1) space "because I don't create arrays"
```

**✅ Correct Analysis:**
```typescript
function factorialCorrect(n: number): number {
  if (n <= 1) return 1;
  return n * factorialCorrect(n - 1);
}
// Actual: O(n) space for call stack
// Each recursive call adds a stack frame
```

💡 **Lesson**: Recursion depth counts toward space complexity!

---

#### Mistake 4: Dropping Important Terms

**❌ Wrong Simplification:**
```typescript
function solutionTwoArraysWrong(arr1: number[], arr2: number[]): void {
  for (const x of arr1) {        // O(n)
    for (const y of arr2) {      // O(m)
      console.log(x, y);
    }
  }
}
// Claimed: O(n) "because we drop lower terms"
```

**✅ Correct Analysis:**
```typescript
function solutionTwoArraysCorrect(arr1: number[], arr2: number[]): void {
  for (const x of arr1) {        // O(n)
    for (const y of arr2) {      // O(m)
      console.log(x, y);
    }
  }
}
// Actual: O(n × m)
// Only drop when it's the SAME variable (e.g., O(n² + n) → O(n²))
// Don't drop when different variables (n and m)
```

💡 **Lesson**: Only drop lower-order terms of the SAME variable!
- ✅ `O(n² + n)` → `O(n²)` (same variable)
- ❌ `O(n × m)` → `O(n)` (different variables!)

---

#### Mistake 5: Misunderstanding Amortized Complexity

**❌ Wrong Analysis:**
```typescript
const arr: number[] = [];
for (let i = 0; i < n; i++) {
  arr.push(i);  // "Sometimes O(n) when resizing"
}
// Claimed: O(n²) total
```

**✅ Correct Analysis:**
```typescript
const arrCorrect: number[] = [];
for (let i = 0; i < n; i++) {
  arrCorrect.push(i);  // O(1) amortized
}
// Actual: O(n) total
// Array doubling happens log(n) times: 1→2→4→8→...→n
// Total copies: 1+2+4+...+n/2 = n-1 ≈ O(n)
// Amortized per operation: O(n)/n = O(1)
```

💡 **Lesson**: Some operations are expensive occasionally but cheap on average (amortized analysis).

---

## 📚 Practice Problems

### Complexity-Focused Problem Sets

**🎯 Goal**: Master complexity analysis by solving problems that demonstrate each optimization technique.

---

### Easy Level: Foundation Building

| Problem | Target | Pattern | Key Insight |
|---------|--------|---------|-------------|
| **Two Sum** | O(n²) → O(n) | Hash Map | Trade space for time |
| **Valid Anagram** | O(n log n) → O(n) | Hash Map | Counting > sorting |
| **Contains Duplicate** | O(n²) → O(n) | Hash Set | Set for deduplication |
| **Best Time to Buy Stock** | O(n²) → O(n) | Single Pass | Track min as you go |
| **Merge Sorted Arrays** | O(n log n) → O(n) | Two Pointers | Use sorted property |

**Learning Focus:**
- ✅ Recognize when hash maps eliminate nested loops
- ✅ Understand O(n) vs O(n log n) trade-offs
- ✅ Practice stating complexity before coding

---

### Medium Level: Optimization Techniques

| Problem | Target | Pattern | Key Insight |
|---------|--------|---------|-------------|
| **3Sum** | O(n³) → O(n²) | Sort + Two Pointers | Eliminate one loop |
| **Container With Most Water** | O(n²) → O(n) | Two Pointers | Greedy approach |
| **Longest Substring No Repeats** | O(n²) → O(n) | Sliding Window | Reuse calculations |
| **Product Except Self** | O(n²) → O(n) | Prefix/Suffix | Preprocessing trick |
| **Find Peak Element** | O(n) → O(log n) | Modified Binary Search | Sorted property |
| **Subarray Sum Equals K** | O(n²) → O(n) | Prefix Sum + Hash Map | Cumulative sums |

**Learning Focus:**
- ✅ Master two pointers on sorted arrays
- ✅ Apply sliding window to substring/subarray problems
- ✅ Use prefix sums to avoid recalculation

---

### Hard Level: Advanced Complexity

| Problem | Target | Pattern | Key Insight |
|---------|--------|---------|-------------|
| **Median of Two Sorted Arrays** | O(m+n) → O(log(min(m,n))) | Binary Search | Partition trick |
| **Trapping Rain Water** | O(n²) → O(n) | Two Pointers/Stack | Track max heights |
| **Longest Increasing Subsequence** | O(2ⁿ) → O(n log n) | Binary Search + DP | Patience sorting |
| **Edit Distance** | O(3ⁿ) → O(n×m) | 2D DP | Avoid recursion |
| **Word Ladder** | O(n × 26ⁿ) → O(n × m) | BFS | Graph traversal |

**Learning Focus:**
- ✅ Optimize exponential to polynomial with DP
- ✅ Apply binary search in non-obvious scenarios
- ✅ Understand when to use BFS/DFS

---

### Complexity Patterns by Problem Type

**Array/String Problems:**
```
Brute Force → Hash Map/Set
O(n²) → O(n)

Examples: Two Sum, Contains Duplicate, Valid Anagram
```

**Pair/Triplet Problems:**
```
Nested Loops → Sort + Two Pointers
O(n³) → O(n²) or O(n²) → O(n)

Examples: 3Sum, Container With Most Water
```

**Subarray/Substring:**
```
Recalculation → Sliding Window
O(n×k) → O(n)

Examples: Max Sum Subarray, Longest Substring
```

**Recursive Problems:**
```
Naive Recursion → Memoization/DP
O(2ⁿ) → O(n) or O(n²)

Examples: Fibonacci, Climbing Stairs, Edit Distance
```

**Search Problems:**
```
Linear Search → Binary Search
O(n) → O(log n)

Examples: Search in Rotated Array, Find Peak
```

---

## ✅ Quick Reference Guide

### Time Complexity Hierarchy (Fastest to Slowest)

```
O(1) < O(log n) < O(√n) < O(n) < O(n log n) < O(n²) < O(n³) < O(2ⁿ) < O(n!)
```

**What Each Means:**
- **O(1)**: Array access, hash lookup → ⚡ Instant
- **O(log n)**: Binary search, balanced tree → 📖 Halving
- **O(n)**: Linear search, single loop → 📊 Proportional
- **O(n log n)**: Efficient sorting → 📈 Almost linear
- **O(n²)**: Nested loops → ⚠️ Quadratic
- **O(2ⁿ)**: Naive recursion → ❌ Exponential (avoid!)
- **O(n!)**: All permutations → ❌❌ Factorial (tiny inputs only)

---

### Common Data Structure Operations

**Complete Complexity Table:**

| Data Structure | Access | Search | Insert | Delete | Space | Notes |
|----------------|--------|--------|--------|--------|-------|-------|
| **Array** | O(1) | O(n) | O(n) | O(n) | O(n) | Fast access, slow insert/delete |
| **Dynamic Array** | O(1) | O(n) | O(1)* | O(n) | O(n) | *Amortized for append |
| **Linked List** | O(n) | O(n) | O(1) | O(1) | O(n) | Fast insert/delete at known position |
| **Hash Map** | - | O(1)* | O(1)* | O(1)* | O(n) | *Average case, O(n) worst case |
| **Hash Set** | - | O(1)* | O(1)* | O(1)* | O(n) | Unique elements only |
| **Binary Search Tree** | O(log n)* | O(log n)* | O(log n)* | O(log n)* | O(n) | *Balanced tree, O(n) unbalanced |
| **Heap** | - | O(n) | O(log n) | O(log n) | O(n) | Fast min/max access O(1) |
| **Stack** | - | O(n) | O(1) | O(1) | O(n) | LIFO - Last In First Out |
| **Queue** | - | O(n) | O(1) | O(1) | O(n) | FIFO - First In First Out |
| **Trie** | - | O(m) | O(m) | O(m) | O(n×m) | m = string length, space-heavy |

**When to Use Each:**
- ✅ **Array**: Known size, frequent access by index
- ✅ **Hash Map/Set**: Fast lookups, counting, deduplication
- ✅ **Heap**: Priority queue, find min/max repeatedly
- ✅ **BST**: Sorted data, range queries
- ✅ **Stack**: DFS, parentheses matching, undo operations
- ✅ **Queue**: BFS, task scheduling
- ✅ **Trie**: Prefix matching, autocomplete

---

### Common Algorithm Complexities

**Sorting Algorithms:**

| Algorithm | Time (Best) | Time (Avg) | Time (Worst) | Space | Stable? | When to Use |
|-----------|-------------|------------|--------------|-------|---------|-------------|
| **Bubble Sort** | O(n) | O(n²) | O(n²) | O(1) | ✅ | Never (educational only) |
| **Selection Sort** | O(n²) | O(n²) | O(n²) | O(1) | ❌ | Small arrays (< 10) |
| **Insertion Sort** | O(n) | O(n²) | O(n²) | O(1) | ✅ | Nearly sorted data |
| **Merge Sort** | O(n log n) | O(n log n) | O(n log n) | O(n) | ✅ | Large data, need stability |
| **Quick Sort** | O(n log n) | O(n log n) | O(n²) | O(log n) | ❌ | General purpose (in-place) |
| **Heap Sort** | O(n log n) | O(n log n) | O(n log n) | O(1) | ❌ | Memory constrained |
| **Counting Sort** | O(n+k) | O(n+k) | O(n+k) | O(k) | ✅ | Small integer range (k) |
| **Radix Sort** | O(d×n) | O(d×n) | O(d×n) | O(n+k) | ✅ | Fixed-length integers |

💡 **Default Choice**: Use built-in `sort()` (usually Timsort: O(n log n) worst case, stable)

---

**Search Algorithms:**

| Algorithm | Time | Space | Requirements | Use Case |
|-----------|------|-------|--------------|----------|
| **Linear Search** | O(n) | O(1) | None | Unsorted, small data |
| **Binary Search** | O(log n) | O(1) | Sorted array | Large sorted data |
| **DFS (Depth-First)** | O(V+E) | O(V) | Graph/tree | Path finding, topological sort |
| **BFS (Breadth-First)** | O(V+E) | O(V) | Graph/tree | Shortest path, level order |
| **Dijkstra** | O((V+E) log V) | O(V) | Weighted graph | Shortest path (non-negative) |
| **A* Search** | O(b^d) | O(b^d) | Heuristic function | Pathfinding with heuristic |

---

**String Algorithms:**

| Algorithm | Time | Space | Use Case |
|-----------|------|-------|----------|
| **Naive Pattern Match** | O(n×m) | O(1) | Short patterns |
| **KMP (Knuth-Morris-Pratt)** | O(n+m) | O(m) | Repeated patterns |
| **Rabin-Karp** | O(n+m) avg | O(1) | Multiple pattern matching |
| **Z-Algorithm** | O(n+m) | O(n+m) | Pattern matching variants |

---

### Complexity Analysis Formulas

**Loop Analysis:**

| Code Pattern | Complexity | Example |
|--------------|------------|---------|
| Single loop | O(n) | `for (i = 0; i < n; i++)` |
| Nested loop (same size) | O(n²) | `for i: for j:` |
| Nested loop (different sizes) | O(n×m) | `for i in arr1: for j in arr2:` |
| Halving loop | O(log n) | `while (n > 0) { n /= 2; }` |
| Doubling loop | O(log n) | `for (i = 1; i < n; i *= 2)` |
| Three nested loops | O(n³) | `for i: for j: for k:` |

**Recursion Analysis:**

| Pattern | Recurrence | Complexity | Example |
|---------|------------|------------|---------|
| Linear recursion | T(n) = T(n-1) + O(1) | O(n) | Factorial |
| Binary recursion | T(n) = 2T(n-1) + O(1) | O(2ⁿ) | Naive Fibonacci |
| Divide & conquer | T(n) = 2T(n/2) + O(n) | O(n log n) | Merge sort |
| Master theorem | T(n) = aT(n/b) + O(nᵏ) | Varies | See master theorem |

**Master Theorem Quick Reference:**
```
T(n) = aT(n/b) + O(nᵏ)

If k < log_b(a): O(n^log_b(a))
If k = log_b(a): O(n^k log n)
If k > log_b(a): O(n^k)
```

---

### Big O Calculation Examples

**Example 1: Sequential Loops**
```typescript
for (let i = 0; i < n; i++) { }      // O(n)
for (let i = 0; i < n; i++) { }      // O(n)
for (let i = 0; i < n; i++) {        // O(n)
  for (let j = 0; j < n; j++) { }    // O(n)
}

// Total: O(n) + O(n) + O(n²) = O(n²)  // Keep dominant term
```

**Example 2: Different Variables**
```typescript
for (let i = 0; i < n; i++) {        // O(n)
  for (let j = 0; j < m; j++) {      // O(m)
    for (let k = 0; k < p; k++) { }  // O(p)
  }
}

// Total: O(n × m × p)  // Don't simplify - different variables!
```

**Example 3: Logarithmic**
```typescript
for (let i = n; i > 0; i = Math.floor(i / 2)) { }

// i values: n → n/2 → n/4 → ... → 1
// Number of iterations: log₂(n)
// Total: O(log n)
```

**Example 4: Complex Combination**
```typescript
for (let i = 0; i < n; i++) {           // O(n)
  arr.sort();                            // O(n log n)
  for (let j = 0; j < n; j++) {          // O(n)
    map.get(key);                        // O(1)
  }
}

// Total: O(n) × [O(n log n) + O(n) × O(1)]
//      = O(n) × O(n log n)
//      = O(n² log n)
```

---

## 🎯 Key Takeaways

### Must-Remember Rules

1. ✅ **Always analyze BOTH time AND space complexity**
   - "O(n) time" is incomplete → "O(n) time, O(1) space"

2. ✅ **State complexity BEFORE coding**
   - Shows analytical thinking and planning
   - Prevents implementing suboptimal solutions

3. ✅ **Explain trade-offs between approaches**
   - Time vs space: "O(n²) time, O(1) space" vs "O(n) time, O(n) space"
   - Best/average/worst case distinctions

4. ✅ **Start with brute force, then optimize**
   - Interview pattern: O(n²) → "Can we do better?" → O(n)
   - Show your optimization thinking process

5. ✅ **Master the optimization toolkit**
   - Hash map/set: O(n²) → O(n)
   - Two pointers: O(n²) → O(n)
   - Sliding window: O(n×k) → O(n)
   - Memoization: O(2ⁿ) → O(n)

6. ✅ **Simplify Big O correctly**
   - Drop constants: O(3n) → O(n) ✅
   - Drop lower terms (same variable): O(n² + n) → O(n²) ✅
   - Keep different variables: O(n × m) stays O(n × m) ❌ Don't simplify!

7. ✅ **Assume worst-case unless specified**
   - Hash map: O(1) average, O(n) worst
   - Quick sort: O(n log n) average, O(n²) worst

8. ✅ **Don't forget hidden complexities**
   - Built-in functions have costs: `sort()` = O(n log n), `slice()` = O(n)
   - Recursion uses call stack space: O(depth)

---

### Interview Success Checklist

**Before Coding:**
- [ ] Understand input/output clearly
- [ ] Ask about constraints (size, memory limits)
- [ ] Propose approach with complexity
- [ ] Consider alternatives and trade-offs
- [ ] Get interviewer agreement before coding

**While Coding:**
- [ ] Explain your thinking out loud
- [ ] Mention complexity of key operations
- [ ] Write clean, readable code
- [ ] Test with example cases

**After Coding:**
- [ ] State final time complexity with reasoning
- [ ] State final space complexity with reasoning
- [ ] Discuss optimization possibilities
- [ ] Mention edge cases and assumptions

---

### Common Interview Questions About Complexity

**Q: "What's the time complexity?"**
✅ Good: "O(n) because we iterate through the array once, and each hash map lookup is O(1)"
❌ Bad: "O(n)"

**Q: "Can you optimize this?"**
✅ Good: "The bottleneck is the nested loop doing O(n²) comparisons. I can use a hash map to reduce that to O(n)"
❌ Bad: "Maybe use a faster algorithm?"

**Q: "What if we have limited memory?"**
✅ Good: "We'd trade time for space. Instead of O(n) hash map, we could sort in-place (O(1) space) with O(n log n) time"
❌ Bad: "Then we can't solve it efficiently"

**Q: "Is there a better solution?"**
✅ Good: "This is O(n log n) due to sorting. For O(n), we'd need to avoid sorting and use hash maps, but that requires O(n) space"
❌ Bad: "This is the best I know"

---

## 🔗 Related Patterns

**Next Steps for Mastery:**

1. **[Prefix Sum](./02-prefix-sum.md)** - O(n) preprocessing for O(1) range queries
   - Pattern: Trade upfront computation for fast queries
   - Use case: Sum of subarrays, range queries

2. **[Two Pointers](./03-two-pointers.md)** - O(n) instead of O(n²)
   - Pattern: Eliminate nested loops on sorted data
   - Use case: Pair finding, palindromes, container problems

3. **[Sliding Window](./04-sliding-window.md)** - O(n) for subarray problems
   - Pattern: Reuse calculations by sliding window
   - Use case: Substrings, subarrays with constraints

4. **[Modified Binary Search](./10-modified-binary-search.md)** - O(log n) search
   - Pattern: Halve search space each iteration
   - Use case: Rotated arrays, search in 2D, peak finding

---

## 📖 Final Words

> 💡 **Interview Reality**: In 90% of coding interviews, the difference between candidates comes down to:
> 1. Recognizing which optimization pattern to apply
> 2. Clearly explaining the complexity trade-offs
> 3. Writing clean code that matches the stated complexity
>
> Master these fundamentals, and you'll excel at algorithm interviews!

**Common Interview Progression:**
```
1. Brute Force → State O(n²) or O(2ⁿ)
2. Interviewer: "Can you do better?"
3. Optimized Solution → O(n) or O(n log n)
4. Explain trade-offs → Time vs space
5. Code it → Clean implementation
6. Verify complexity → "This is O(n) because..."
```

**Remember:**
- ✅ Complexity analysis is a SKILL you can practice and master
- ✅ Most problems follow patterns (hash map, two pointers, sliding window, DP)
- ✅ Explaining "why" is as important as getting the right answer
- ✅ Every Big O you state should have a clear reason

**Practice makes perfect. Start with easy problems and work your way up!** 🚀

---

**Last Updated**: January 2025
**Difficulty Level**: Fundamental (required for all levels)
**Estimated Study Time**:
- First pass: 2-3 hours
- Practice problems: 10-15 hours
- Mastery: 30+ hours with varied problems
