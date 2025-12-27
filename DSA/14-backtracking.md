# Backtracking Pattern

## What is Backtracking? (In Simple Words)

Imagine you're in a **corn maze** trying to find the exit. You have a strategy:

**Backtracking Strategy:**
1. Walk down a path
2. If you hit a dead end → **Turn around** (backtrack!)
3. Try a different path
4. Keep exploring until you find the exit

**The key insight:** When you realize a path won't work, you **don't start over from the beginning** - you just go back to the last decision point and try something different!

### Real-World Analogy: Choosing Your Outfit

You're getting ready for a party and need to pick an outfit:

```
Wardrobe:
Shirts: [Red, Blue]
Pants: [Jeans, Khakis]
Shoes: [Sneakers, Boots]

Backtracking Approach:
1. Try: Red shirt + Jeans + Sneakers
   → "Hmm, sneakers with red don't match"
   → BACKTRACK! (Remove sneakers)

2. Try: Red shirt + Jeans + Boots
   → "Perfect! This works!"
   → Add to "Valid Outfits" list

3. BACKTRACK to remove Jeans, try:
   Red shirt + Khakis + Sneakers
   → "This looks good too!"
   → Add to list

4. Keep exploring ALL combinations...
```

**This is backtracking:** Try choices, if they don't work, **undo** and try something else!

### Another Analogy: Sudoku Puzzle

When solving Sudoku:

```
You fill in a number:
  "Let's try 5 here..."

A few moves later:
  "Wait, this creates a conflict! 5 can't work."

BACKTRACK:
  - Erase the 5
  - Try 6 instead
  - Continue from there

You're EXPLORING all possibilities but UNDOING bad choices!
```

---

## Pattern Overview

**Backtracking** is an algorithmic technique that explores all possible solutions by incrementally building candidates and abandoning ("backtracking") those that fail to satisfy constraints. It's essentially a refined brute force approach with pruning.

### When to Use
- Finding all permutations or combinations
- Solving constraint satisfaction problems
- Generating all valid solutions
- N-Queens, Sudoku solver
- Subset problems
- Path finding with constraints

### Key Characteristics
- Explores all possibilities systematically
- Abandons invalid paths early (pruning)
- Uses recursion with state management
- Builds solution incrementally
- Backtracks when constraint violated

### Pattern Identification
Look for this pattern when you see:
- "Find **all** permutations"
- "Generate **all** combinations"
- "Find **all valid** solutions"
- "N-Queens problem"
- "Sudoku solver"
- "Generate parentheses"
- "Word search"
- "Subset sum"
- "Partition problems"

---

## Understanding Backtracking: The Three Steps

Every backtracking problem follows this template:

```
BACKTRACKING TEMPLATE:

1. CHOOSE (make a decision)
   - Pick an option from available choices
   - Add it to current solution

2. EXPLORE (recurse with the choice)
   - Recursively explore what happens with this choice
   - See if it leads to a valid solution

3. UNCHOOSE (backtrack)
   - Remove the choice you just made
   - This "undoes" the choice, letting you try another option
```

### Visual Example: Finding All Subsets of [1, 2]

```
Decision Tree:

                    []
                    |
        +-----------+-----------+
        |                       |
     Choose 1              Don't choose 1
        |                       |
      [1]                      []
        |                       |
    +---+---+               +---+---+
    |       |               |       |
Choose 2  Don't         Choose 2  Don't
    |       |               |       |
  [1,2]   [1]             [2]      []

All subsets: [], [1], [2], [1,2]

At each node:
1. CHOOSE: Add an element (or don't)
2. EXPLORE: Recurse to next element
3. UNCHOOSE: Remove element to try other options
```

---

## The Backtracking Pattern Visualized

### Maze Exploration Example

```
Maze:
S . . #
# . # .
. . . E

S = Start, E = Exit, # = Wall, . = Open

Backtracking exploration:

Step 1: Try going RIGHT
  S → . . #

Step 2: Keep going RIGHT
  S → → . #

Step 3: Hit wall! BACKTRACK
  S → . ← #
        ↑
     (went back)

Step 4: Try going DOWN
  S → .
  ↓
  .

Step 5: Continue exploring...
  Eventually find path to E!

KEY: When you hit a wall (constraint violated),
you DON'T start over - you just go back one step!
```

---

## Example 1: Subsets (JavaScript)

### Problem
Given an integer array `nums` of unique elements, return all possible subsets (the power set). The solution set must not contain duplicate subsets.

**LeetCode**: [78. Subsets](https://leetcode.com/problems/subsets/)

### Solution

```javascript
/**
 * Generate all subsets using backtracking
 * @param {number[]} nums - Array of unique integers
 * @return {number[][]} - All possible subsets
 */
function subsets(nums) {
    const result = [];

    function backtrack(start, currentSubset) {
        // Add current subset to result (deep copy)
        result.push([...currentSubset]);

        // Try adding each remaining number
        for (let i = start; i < nums.length; i++) {
            // CHOOSE: Add nums[i] to current subset
            currentSubset.push(nums[i]);

            // EXPLORE: Recurse with next index
            backtrack(i + 1, currentSubset);

            // UNCHOOSE: Remove nums[i] (backtrack)
            currentSubset.pop();
        }
    }

    backtrack(0, []);
    return result;
}

/**
 * Alternative: Iterative approach
 * @param {number[]} nums
 * @return {number[][]}
 */
function subsetsIterative(nums) {
    const result = [[]];  // Start with empty subset

    for (const num of nums) {
        const size = result.length;
        // For each existing subset, create new subset by adding current num
        for (let i = 0; i < size; i++) {
            result.push([...result[i], num]);
        }
    }

    return result;
}

// Example usage
console.log(subsets([1, 2, 3]));
// Output: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]

console.log(subsets([0]));
// Output: [[], [0]]

console.log(subsetsIterative([1, 2, 3]));
// Output: [[], [1], [2], [1,2], [3], [1,3], [2,3], [1,2,3]]
```

### Detailed Code Walkthrough: Backtracking Subsets

Let's trace through `subsets([1, 2, 3])` step by step:

```javascript
function backtrack(start, currentSubset) {
    // STEP 1: Add current state to result
    result.push([...currentSubset]);
    // Why? Every state is a valid subset!
    // Even the empty set []

    // STEP 2: Try adding each remaining element
    for (let i = start; i < nums.length; i++) {
        // STEP 3: CHOOSE - Add element
        currentSubset.push(nums[i]);
        // Modify the state: "Let's include this element"

        // STEP 4: EXPLORE - Recurse
        backtrack(i + 1, currentSubset);
        // See where this choice leads us

        // STEP 5: UNCHOOSE - Backtrack
        currentSubset.pop();
        // Undo the choice: "Let's try without this element"
    }
}
```

**Complete Execution Trace:**

```
Initial call: backtrack(0, [])

Call Stack Evolution:

backtrack(0, [])
  result = [[]]  ← Add empty set

  i=0: CHOOSE 1
    currentSubset = [1]

    backtrack(1, [1])
      result = [[], [1]]  ← Add [1]

      i=1: CHOOSE 2
        currentSubset = [1, 2]

        backtrack(2, [1,2])
          result = [[], [1], [1,2]]  ← Add [1,2]

          i=2: CHOOSE 3
            currentSubset = [1, 2, 3]

            backtrack(3, [1,2,3])
              result = [[], [1], [1,2], [1,2,3]]  ← Add [1,2,3]
              Loop ends (start=3, nums.length=3)

            UNCHOOSE 3: currentSubset = [1, 2]

          Loop ends

        UNCHOOSE 2: currentSubset = [1]

      i=2: CHOOSE 3
        currentSubset = [1, 3]

        backtrack(3, [1,3])
          result = [[], [1], [1,2], [1,2,3], [1,3]]  ← Add [1,3]
          Loop ends

        UNCHOOSE 3: currentSubset = [1]

      Loop ends

    UNCHOOSE 1: currentSubset = []

  i=1: CHOOSE 2
    currentSubset = [2]

    backtrack(2, [2])
      result = [..., [2]]  ← Add [2]

      i=2: CHOOSE 3
        currentSubset = [2, 3]

        backtrack(3, [2,3])
          result = [..., [2,3]]  ← Add [2,3]

        UNCHOOSE 3: currentSubset = [2]

    UNCHOOSE 2: currentSubset = []

  i=2: CHOOSE 3
    currentSubset = [3]

    backtrack(3, [3])
      result = [..., [3]]  ← Add [3]

    UNCHOOSE 3: currentSubset = []

FINAL result = [[], [1], [1,2], [1,2,3], [1,3], [2], [2,3], [3]]
```

**Visual Decision Tree:**

```
                    []
                    ↓ (add to result)
        +-----------+-----------+
        |           |           |
      [1]          [2]         [3]
        ↓           ↓           ↓
   +----+----+   +--+--+
   |         |   |     |
 [1,2]     [1,3] [2,3]
   ↓
[1,2,3]

Each node is added to result!
Arrows represent "CHOOSE" decisions
Coming back up is "UNCHOOSE" (backtracking)
```

---

## Example 2: Generate Parentheses (Python)

### Problem
Given `n` pairs of parentheses, write a function to generate all combinations of well-formed parentheses.

**LeetCode**: [22. Generate Parentheses](https://leetcode.com/problems/generate-parentheses/)

### Solution

```python
from typing import List

class Solution:
    def generateParenthesis(self, n: int) -> List[str]:
        """
        Generate all valid parentheses combinations using backtracking

        Args:
            n: Number of pairs of parentheses

        Returns:
            List of all valid combinations
        """
        result = []

        def backtrack(current, open_count, close_count):
            """
            Build valid parentheses strings

            Args:
                current: Current string being built
                open_count: Number of '(' added so far
                close_count: Number of ')' added so far
            """
            # Base case: if we've used all parentheses
            if len(current) == 2 * n:
                result.append(current)
                return

            # Choice 1: Add '(' if we haven't used all opening brackets
            if open_count < n:
                # CHOOSE '('
                # EXPLORE
                backtrack(current + '(', open_count + 1, close_count)
                # UNCHOOSE (automatic - string is immutable)

            # Choice 2: Add ')' if it doesn't exceed opening brackets
            if close_count < open_count:
                # CHOOSE ')'
                # EXPLORE
                backtrack(current + ')', open_count, close_count + 1)
                # UNCHOOSE (automatic)

        backtrack('', 0, 0)
        return result

# Example usage
solution = Solution()

# Example 1
print(solution.generateParenthesis(3))
# Output: ["((()))", "(()())", "(())()", "()(())", "()()()"]

# Example 2
print(solution.generateParenthesis(1))
# Output: ["()"]

# Example 3
print(solution.generateParenthesis(2))
# Output: ["(())", "()()"]
```

### Detailed Explanation: Generate Parentheses

**The Constraints (Pruning Rules):**

1. **Can add '('** → Only if we haven't used all `n` opening brackets
2. **Can add ')'** → Only if it doesn't exceed the number of '(' used

These constraints PRUNE invalid paths early!

```python
def backtrack(current, open_count, close_count):
    # BASE CASE: Complete string
    if len(current) == 2 * n:
        result.append(current)  # Found a valid combination!
        return

    # CONSTRAINT 1: Can we add '('?
    if open_count < n:
        # Yes! We haven't used all opening brackets
        backtrack(current + '(', open_count + 1, close_count)

    # CONSTRAINT 2: Can we add ')'?
    if close_count < open_count:
        # Yes! We have more '(' than ')', so adding ')' is valid
        backtrack(current + ')', open_count, close_count + 1)
```

**Why these constraints work:**

```
VALID:   (())
- Open '(' first (open=1, close=0)
- Open another '(' (open=2, close=0)
- Close ')' (open=2, close=1) ← close < open, OK!
- Close ')' (open=2, close=2) ← close < open, OK!

INVALID: ())(
- Open '(' (open=1, close=0)
- Close ')' (open=1, close=1)
- Close ')' (open=1, close=2) ← close > open, INVALID!

The constraint `close_count < open_count` prevents this!
```

### Visual Trace for n=2

```
Call Stack Evolution:

backtrack("", 0, 0)
  len(0) != 4, not done
  open(0) < 2? YES → Add '('

  backtrack("(", 1, 0)
    len(1) != 4, not done
    open(1) < 2? YES → Add '('

    backtrack("((", 2, 0)
      len(2) != 4, not done
      open(2) < 2? NO → Can't add '('
      close(0) < 2? YES → Add ')'

      backtrack("(()", 2, 1)
        len(3) != 4, not done
        open(2) < 2? NO
        close(1) < 2? YES → Add ')'

        backtrack("(())", 2, 2)
          len(4) == 4 → Add "(())" to result! ✓
          return

    close(0) < 1? YES → Add ')'

    backtrack("()", 1, 1)
      len(2) != 4, not done
      open(1) < 2? YES → Add '('

      backtrack("()(", 2, 1)
        len(3) != 4, not done
        open(2) < 2? NO
        close(1) < 2? YES → Add ')'

        backtrack("()()", 2, 2)
          len(4) == 4 → Add "()()" to result! ✓
          return

FINAL result = ["(())", "()()"]
```

**Decision Tree:**

```
                    ""
                    |
                   "("
                   / \
                 /     \
               "(("     "()"
               |         |
             "(()"     "()("
               |         |
            "(())"    "()()"
               ✓         ✓

Key:
- Left branch: Add '('
- Right branch: Add ')'
- ✓ = Valid complete solution
- Constraints prevent invalid branches!
```

---

## Example 3: Permutations (JavaScript)

### Problem
Given an array `nums` of distinct integers, return all possible permutations.

**LeetCode**: [46. Permutations](https://leetcode.com/problems/permutations/)

### Solution

```javascript
/**
 * Generate all permutations using backtracking
 * @param {number[]} nums
 * @return {number[][]}
 */
function permute(nums) {
    const result = [];

    function backtrack(currentPerm, remaining) {
        // Base case: no more elements to add
        if (remaining.length === 0) {
            result.push([...currentPerm]);
            return;
        }

        // Try each remaining element in current position
        for (let i = 0; i < remaining.length; i++) {
            // CHOOSE: Pick remaining[i]
            currentPerm.push(remaining[i]);

            // Create new remaining array without chosen element
            const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i + 1)];

            // EXPLORE: Recurse with chosen element removed
            backtrack(currentPerm, newRemaining);

            // UNCHOOSE: Remove chosen element
            currentPerm.pop();
        }
    }

    backtrack([], nums);
    return result;
}

/**
 * Alternative: Using visited tracking
 * @param {number[]} nums
 * @return {number[][]}
 */
function permuteWithVisited(nums) {
    const result = [];
    const visited = new Set();

    function backtrack(currentPerm) {
        // Base case: permutation is complete
        if (currentPerm.length === nums.length) {
            result.push([...currentPerm]);
            return;
        }

        // Try adding each unvisited number
        for (let i = 0; i < nums.length; i++) {
            if (visited.has(i)) continue;  // Skip if already used

            // CHOOSE
            currentPerm.push(nums[i]);
            visited.add(i);

            // EXPLORE
            backtrack(currentPerm);

            // UNCHOOSE
            currentPerm.pop();
            visited.delete(i);
        }
    }

    backtrack([]);
    return result;
}

// Example usage
console.log(permute([1, 2, 3]));
// Output: [[1,2,3], [1,3,2], [2,1,3], [2,3,1], [3,1,2], [3,2,1]]

console.log(permute([0, 1]));
// Output: [[0,1], [1,0]]
```

### Visual Trace: Permutations of [1, 2, 3]

```
Decision Tree (Choosing positions):

                        []
          /             |             \
        [1]            [2]            [3]
       /   \          /   \          /   \
    [1,2] [1,3]    [2,1] [2,3]    [3,1] [3,2]
      |     |        |     |        |     |
   [1,2,3] [1,3,2] [2,1,3] [2,3,1] [3,1,2] [3,2,1]
      ✓     ✓        ✓      ✓       ✓      ✓

Level 0: Choose first element (3 choices)
Level 1: Choose second element (2 choices)
Level 2: Choose third element (1 choice)

Total: 3! = 6 permutations
```

**Step-by-Step Execution:**

```
backtrack([], [1,2,3])
  remaining.length=3, not done

  i=0: CHOOSE 1
    currentPerm = [1]
    newRemaining = [2, 3]

    backtrack([1], [2,3])
      remaining.length=2, not done

      i=0: CHOOSE 2
        currentPerm = [1, 2]
        newRemaining = [3]

        backtrack([1,2], [3])
          remaining.length=1, not done

          i=0: CHOOSE 3
            currentPerm = [1, 2, 3]
            newRemaining = []

            backtrack([1,2,3], [])
              remaining.length=0 → Add [1,2,3] to result! ✓

            UNCHOOSE 3: currentPerm = [1, 2]

      i=1: CHOOSE 3
        currentPerm = [1, 3]
        newRemaining = [2]

        backtrack([1,3], [2])
          ... eventually adds [1,3,2] ✓

        UNCHOOSE 3: currentPerm = [1]

    UNCHOOSE 1: currentPerm = []

  i=1: CHOOSE 2
    ... (continues for [2,1,3] and [2,3,1])

  i=2: CHOOSE 3
    ... (continues for [3,1,2] and [3,2,1])

FINAL: 6 permutations
```

---

## Time & Space Complexity

### Example 1: Subsets
- **Time Complexity**: O(n × 2^n)
  - 2^n subsets (each element: include or exclude)
  - O(n) to copy each subset
- **Space Complexity**: O(n) - Recursion depth

### Example 2: Generate Parentheses
- **Time Complexity**: O(4^n / √n) - Catalan number
- **Space Complexity**: O(n) - Recursion depth

### Example 3: Permutations
- **Time Complexity**: O(n × n!)
  - n! permutations
  - O(n) to copy each permutation
- **Space Complexity**: O(n) - Recursion depth

---

## Common Variations

1. **Subsets and Combinations**
   - LeetCode: [78. Subsets](https://leetcode.com/problems/subsets/)
   - LeetCode: [90. Subsets II](https://leetcode.com/problems/subsets-ii/) (with duplicates)
   - LeetCode: [77. Combinations](https://leetcode.com/problems/combinations/)
   - LeetCode: [39. Combination Sum](https://leetcode.com/problems/combination-sum/)

2. **Permutations**
   - LeetCode: [46. Permutations](https://leetcode.com/problems/permutations/)
   - LeetCode: [47. Permutations II](https://leetcode.com/problems/permutations-ii/) (with duplicates)
   - LeetCode: [31. Next Permutation](https://leetcode.com/problems/next-permutation/)

3. **Constraint Satisfaction**
   - LeetCode: [22. Generate Parentheses](https://leetcode.com/problems/generate-parentheses/)
   - LeetCode: [51. N-Queens](https://leetcode.com/problems/n-queens/)
   - LeetCode: [37. Sudoku Solver](https://leetcode.com/problems/sudoku-solver/)

4. **String/Array Search**
   - LeetCode: [79. Word Search](https://leetcode.com/problems/word-search/)
   - LeetCode: [212. Word Search II](https://leetcode.com/problems/word-search-ii/)

5. **Partition Problems**
   - LeetCode: [131. Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/)
   - LeetCode: [698. Partition to K Equal Sum Subsets](https://leetcode.com/problems/partition-to-k-equal-sum-subsets/)

---

## Practice Problems

### Easy
1. [78. Subsets](https://leetcode.com/problems/subsets/)
2. [77. Combinations](https://leetcode.com/problems/combinations/)

### Medium
3. [46. Permutations](https://leetcode.com/problems/permutations/)
4. [22. Generate Parentheses](https://leetcode.com/problems/generate-parentheses/)
5. [39. Combination Sum](https://leetcode.com/problems/combination-sum/)
6. [40. Combination Sum II](https://leetcode.com/problems/combination-sum-ii/)
7. [79. Word Search](https://leetcode.com/problems/word-search/)
8. [131. Palindrome Partitioning](https://leetcode.com/problems/palindrome-partitioning/)
9. [17. Letter Combinations of a Phone Number](https://leetcode.com/problems/letter-combinations-of-a-phone-number/)
10. [93. Restore IP Addresses](https://leetcode.com/problems/restore-ip-addresses/)

### Hard
11. [51. N-Queens](https://leetcode.com/problems/n-queens/)
12. [37. Sudoku Solver](https://leetcode.com/problems/sudoku-solver/)
13. [52. N-Queens II](https://leetcode.com/problems/n-queens-ii/)

---

## Common Pitfalls (Mistakes to Avoid)

### 1. Forgetting to Make a Copy When Adding to Result

**WRONG:**
```javascript
function subsets(nums) {
    const result = [];

    function backtrack(start, currentSubset) {
        result.push(currentSubset);  // BUG: Adds reference!

        for (let i = start; i < nums.length; i++) {
            currentSubset.push(nums[i]);
            backtrack(i + 1, currentSubset);
            currentSubset.pop();
        }
    }

    backtrack(0, []);
    return result;
}
```

**Problem:** `currentSubset` is modified throughout, so all references in `result` point to the same array!

**Output:** `[[], [], [], [], [], [], [], []]` - all empty!

**RIGHT:**
```javascript
result.push([...currentSubset]);  // Make a COPY!
```

---

### 2. Not Backtracking (Forgetting to Undo)

**WRONG:**
```javascript
function permute(nums) {
    const result = [];

    function backtrack(currentPerm, remaining) {
        if (remaining.length === 0) {
            result.push([...currentPerm]);
            return;
        }

        for (let i = 0; i < remaining.length; i++) {
            currentPerm.push(remaining[i]);  // CHOOSE
            backtrack(currentPerm, ...);      // EXPLORE
            // BUG: Forgot to UNCHOOSE!
        }
    }

    backtrack([], nums);
    return result;
}
```

**Problem:** Without `pop()`, `currentPerm` keeps growing and never explores other branches correctly!

**RIGHT:**
```javascript
currentPerm.push(remaining[i]);  // CHOOSE
backtrack(...);                   // EXPLORE
currentPerm.pop();                // UNCHOOSE ← Critical!
```

---

### 3. Modifying Loop Variable During Iteration

**WRONG:**
```javascript
for (let i = start; i < nums.length; i++) {
    currentSubset.push(nums[i]);
    backtrack(i, currentSubset);  // BUG: Should be i+1!
    currentSubset.pop();
}
```

**Problem:** Using `i` instead of `i+1` causes infinite recursion! Same index gets processed repeatedly.

**RIGHT:**
```javascript
backtrack(i + 1, currentSubset);  // Move to NEXT index
```

---

### 4. Not Handling Duplicates Correctly

**WRONG (for arrays with duplicates):**
```javascript
function subsetsWithDup(nums) {
    const result = [];

    function backtrack(start, currentSubset) {
        result.push([...currentSubset]);

        for (let i = start; i < nums.length; i++) {
            // BUG: No duplicate check!
            currentSubset.push(nums[i]);
            backtrack(i + 1, currentSubset);
            currentSubset.pop();
        }
    }

    backtrack(0, []);
    return result;
}

// Input: [1, 2, 2]
// Wrong output: [[], [1], [1,2], [1,2,2], [1,2], [2], [2,2], [2]]
//                                       ^^^^^ duplicate!
```

**RIGHT:**
```javascript
function subsetsWithDup(nums) {
    nums.sort();  // Sort first!
    const result = [];

    function backtrack(start, currentSubset) {
        result.push([...currentSubset]);

        for (let i = start; i < nums.length; i++) {
            // Skip duplicates at same level
            if (i > start && nums[i] === nums[i - 1]) continue;

            currentSubset.push(nums[i]);
            backtrack(i + 1, currentSubset);
            currentSubset.pop();
        }
    }

    backtrack(0, []);
    return result;
}
```

**Key:** `i > start` ensures we skip duplicates only at the same recursion level, not across different levels.

---

### 5. Incorrect Base Case

**WRONG:**
```javascript
function generateParenthesis(n) {
    const result = [];

    function backtrack(current, open, close) {
        // BUG: Wrong base case!
        if (open === n && close === n) {
            result.push(current);
            return;
        }

        if (open < n) backtrack(current + '(', open + 1, close);
        if (close < open) backtrack(current + ')', open, close + 1);
    }

    backtrack('', 0, 0);
    return result;
}
```

**Problem:** Base case `open === n && close === n` is correct, but better to use `current.length === 2*n` for clarity.

**BETTER:**
```javascript
if (current.length === 2 * n) {  // Clearer: we've used all parentheses
    result.push(current);
    return;
}
```

---

## Frequently Asked Questions (FAQ)

### Q1: What's the difference between backtracking and DFS?

**Answer:**

**DFS** is a traversal technique: "Explore deep first, then backtrack when stuck"

**Backtracking** is a problem-solving technique that uses DFS: "Try a choice, explore, if it doesn't work, **undo the choice** and try another"

**Key difference:** Backtracking **actively makes and undoes choices**

```javascript
// Pure DFS (just explore)
function dfs(node) {
    visit(node);
    for (child of node.children) {
        dfs(child);
    }
}

// Backtracking (make choices + undo)
function backtrack(state, choices) {
    if (is_solution(state)) {
        save_solution(state);
        return;
    }

    for (choice of choices) {
        make_choice(choice);      // ← CHOOSE
        backtrack(new_state);     // ← EXPLORE (DFS-style)
        undo_choice(choice);      // ← UNCHOOSE (Backtrack)
    }
}
```

**Think of it as:** Backtracking = DFS + Choice Making + Undoing Choices

---

### Q2: How do I know when to use backtracking vs dynamic programming?

**Answer:**

| Criteria | Backtracking | Dynamic Programming |
|----------|--------------|---------------------|
| **Goal** | Find ALL solutions | Find OPTIMAL solution |
| **Keyword** | "All", "Generate" | "Maximum", "Minimum", "Optimal" |
| **Approach** | Explore all paths | Remember subproblems |
| **Example** | All permutations | Longest path |

**Use Backtracking when:**
- "Find **all** permutations"
- "Generate **all** combinations"
- "Find **all valid** solutions"

**Use Dynamic Programming when:**
- "Find the **maximum** sum"
- "Find the **minimum** cost"
- "Find the **longest** substring"

**Example:**
```
Backtracking: "Generate all subsets of [1,2,3]"
→ Need ALL subsets: [], [1], [2], [3], [1,2], etc.

DP: "Find subset with maximum sum"
→ Need ONE optimal answer: [1,2,3] (sum = 6)
```

---

### Q3: Why do we pass `i+1` in the recursive call for subsets?

**Answer:**

```javascript
for (let i = start; i < nums.length; i++) {
    currentSubset.push(nums[i]);
    backtrack(i + 1, currentSubset);  // Why i+1?
    currentSubset.pop();
}
```

**Reason:** To avoid using the same element multiple times!

**Visual:**
```
nums = [1, 2, 3]

If we use i instead of i+1:
  backtrack(0, [])
    i=0: Choose 1
      backtrack(0, [1])  ← BUG: Can choose 1 again!
        i=0: Choose 1 again
          backtrack(0, [1,1])  ← Invalid!

If we use i+1:
  backtrack(0, [])
    i=0: Choose 1
      backtrack(1, [1])  ← Can only choose from [2, 3] onward
        i=1: Choose 2
          backtrack(2, [1,2])  ← Can only choose [3]
```

**i+1 ensures we only look forward, never backward!**

---

### Q4: How do I handle duplicates in backtracking?

**Answer:**

**Step 1: Sort the array** (groups duplicates together)
**Step 2: Skip duplicates at the same recursion level**

```javascript
function subsetsWithDup(nums) {
    nums.sort();  // CRITICAL: Sort first!

    function backtrack(start, currentSubset) {
        result.push([...currentSubset]);

        for (let i = start; i < nums.length; i++) {
            // Skip duplicates at SAME level
            if (i > start && nums[i] === nums[i - 1]) {
                continue;  // Skip this duplicate
            }

            currentSubset.push(nums[i]);
            backtrack(i + 1, currentSubset);
            currentSubset.pop();
        }
    }
}
```

**Why `i > start`?**

```
nums = [1, 2, 2]

At level 0 (start=0):
  i=0: nums[0]=1 → OK, process [1]
  i=1: nums[1]=2 → OK, process [2]
  i=2: nums[2]=2 → i > start (2 > 0) AND nums[2] == nums[1]
       → SKIP! (would create duplicate subset)

At level 1 inside [2] branch (start=1):
  i=1: nums[1]=2 → i == start, PROCESS (first 2 at this level)
  i=2: nums[2]=2 → i > start (2 > 1) AND nums[2] == nums[1]
       → SKIP!

Result: [[], [1], [1,2], [1,2,2], [2], [2,2]]
No duplicates! ✓
```

---

### Q5: How do I debug backtracking problems?

**Answer:**

**Technique 1: Draw the decision tree**

```
Problem: Subsets of [1,2]

Draw tree:
                []
              /    \
            [1]    [2]
             |
           [1,2]

This visualizes all branches you'll explore!
```

**Technique 2: Add print statements**

```javascript
function backtrack(start, currentSubset) {
    console.log(`Level ${start}: currentSubset = [${currentSubset}]`);  // LOG

    result.push([...currentSubset]);

    for (let i = start; i < nums.length; i++) {
        console.log(`  Choosing ${nums[i]}`);  // LOG
        currentSubset.push(nums[i]);
        backtrack(i + 1, currentSubset);
        currentSubset.pop();
        console.log(`  Unchoosing ${nums[i]}`);  // LOG
    }
}
```

**Technique 3: Check the three steps**

```
For each recursive call, verify:
1. CHOOSE: Am I modifying state correctly?
2. EXPLORE: Am I making the recursive call with updated state?
3. UNCHOOSE: Am I undoing the modification?
```

---

### Q6: What's the time complexity of backtracking problems?

**Answer:**

**General formula:** O(branching_factor ^ depth)

**Common complexities:**

| Problem | Complexity | Reason |
|---------|------------|--------|
| Subsets | O(2^n) | Each element: include or exclude (2 choices) |
| Permutations | O(n!) | n choices for first, n-1 for second, etc. |
| Combinations (choose k from n) | O(C(n,k)) | Binomial coefficient |
| Generate Parentheses | O(4^n / √n) | Catalan number |
| N-Queens | O(n!) | Place queen in row 1 (n choices), row 2 (≤n choices), etc. |

**Why multiplied by n sometimes?**

If you copy the result (which is O(n)), multiply by n:
- Subsets: O(n × 2^n)
- Permutations: O(n × n!)

---

### Q7: When should I use a visited set vs modifying the array?

**Answer:**

**Use Visited Set when:**
- You need to preserve the original array
- Multiple elements can be the same value (track by index, not value)
- Grid problems (track (row, col) pairs)

```javascript
const visited = new Set();

for (let i = 0; i < nums.length; i++) {
    if (visited.has(i)) continue;

    visited.add(i);        // Mark
    backtrack(...);
    visited.delete(i);     // Unmark
}
```

**Modify Array when:**
- You're building a "remaining" array
- Space is not a concern
- Want clearer code

```javascript
for (let i = 0; i < remaining.length; i++) {
    const newRemaining = [...remaining.slice(0, i), ...remaining.slice(i+1)];
    backtrack(currentPerm, newRemaining);
}
```

**Trade-off:** Visited set = O(n) extra space, Remaining array = O(n^2) time for slicing

---

## Pro Tips for Interviews

### Tip 1: Always Start with the Template

```
Interviewer: "Generate all combinations..."

You: "This is a backtracking problem. Let me start with the standard template:

function backtrack(state, choices) {
    if (is_solution(state)) {
        add to result
        return
    }

    for (choice in choices) {
        if (is_valid(choice)) {
            make_choice
            backtrack(new_state)
            undo_choice
        }
    }
}

Now let me adapt it to this specific problem..."
```

This shows you have a systematic approach!

---

### Tip 2: Draw the Decision Tree

```
You: "Let me draw the decision tree for a small example..."

[Draw on whiteboard]

                []
              /    \
            [1]    [2]
             |
           [1,2]

You: "At each node, we have choices to make. We explore all
branches depth-first, backtracking when we've explored a branch."
```

Interviewers love visual thinking!

---

### Tip 3: Mention Pruning

```
You: "For efficiency, I'll add pruning conditions to avoid
exploring invalid branches early.

For example, in generating parentheses, if we already have
more ')' than '(', we can stop exploring that branch since
it can never be valid."
```

Shows optimization thinking!

---

### Tip 4: Explain the Three Steps

As you code:

```javascript
for (let i = start; i < nums.length; i++) {
    // You say: "CHOOSE: Add nums[i] to current subset"
    currentSubset.push(nums[i]);

    // You say: "EXPLORE: Recursively explore with this choice"
    backtrack(i + 1, currentSubset);

    // You say: "UNCHOOSE: Backtrack by removing nums[i]"
    currentSubset.pop();
}
```

Narrating the template helps you and the interviewer!

---

### Tip 5: Clarify "All" vs "Optimal"

```
Interviewer: "Find the subsets..."

You: "Just to clarify - do you want ALL subsets, or
the optimal subset based on some criteria?

If ALL, I'll use backtracking to explore all possibilities.
If optimal, dynamic programming might be more appropriate."
```

---

### Tip 6: Don't Forget the Deep Copy

```
You: "Important note - when adding currentSubset to result,
I need to make a deep copy since we're modifying it throughout:

result.push([...currentSubset]);  // NOT result.push(currentSubset)

Otherwise all results will reference the same array."
```

Shows attention to detail!

---

### Tip 7: Mention Time Complexity Upfront

```
You: "Before I start, let me note that backtracking problems
are typically exponential. For subsets, we'll have O(2^n)
branches to explore, since each element can be included or excluded.

This is still better than generating all 2^n subsets blindly,
because we can prune invalid branches early."
```

---

## Pattern Recognition Guide

### When to Think "Backtracking"?

#### Definite Signals:
1. "Find **all** ..." → 95% Backtracking
2. "Generate **all** ..." → Backtracking
3. "How many **valid** ..." → Backtracking (with counting)
4. "Solve puzzle: Sudoku/N-Queens" → Backtracking

#### Strong Hints:
1. "Permutations" → Backtracking
2. "Combinations" → Backtracking
3. "Subsets" → Backtracking
4. "Partition" → Backtracking
5. "Word search" → Backtracking

#### Problem Patterns:

**Pattern 1: All Combinations/Subsets**
```
Problem: "Find all subsets of array"
Solution: Backtracking with include/exclude choices
```

**Pattern 2: Constraint Satisfaction**
```
Problem: "Generate all valid parentheses"
Solution: Backtracking with constraint checking
```

**Pattern 3: Search with Constraints**
```
Problem: "Find word in grid (can't reuse cells)"
Solution: Backtracking with visited tracking
```

**Pattern 4: Puzzle Solving**
```
Problem: "Solve Sudoku"
Solution: Backtracking with row/col/box constraints
```

---

## Key Takeaways

### Core Concepts
1. **Three steps**: CHOOSE → EXPLORE → UNCHOOSE
2. **Explores all possibilities**: Systematically tries all options
3. **Pruning**: Abandons invalid paths early for efficiency
4. **Builds incrementally**: Constructs solution piece by piece

### Implementation Essentials
5. **Deep copy when adding to result**: `result.push([...current])`
6. **Backtrack by undoing**: Always undo after recursion
7. **Base case**: Define when to save solution
8. **Loop through choices**: Try each available option

### Common Applications
9. **Generate all subsets**: Include/exclude each element
10. **Generate all permutations**: Try each element in each position
11. **Constraint satisfaction**: Prune when constraints violated
12. **Grid search**: Explore paths with visited tracking

### Optimization
13. **Add pruning conditions**: Check validity before recursing
14. **Skip duplicates**: Sort + skip same values at same level
15. **Use visited set**: For tracking used elements/positions
16. **Early termination**: Return as soon as constraint fails

### Complexity
17. **Typically exponential**: O(2^n), O(n!), O(C(n,k))
18. **Space = recursion depth**: O(n) for call stack
19. **Better than brute force**: Pruning reduces actual work
20. **Accept the complexity**: Some problems are inherently hard!

---

## Beginner's Quick Reference

### Backtracking Template

```javascript
function backtrack(state, choices) {
    // BASE CASE: Found complete solution?
    if (is_solution(state)) {
        result.push([...state]);  // Deep copy!
        return;
    }

    // RECURSIVE CASE: Try each choice
    for (choice of choices) {
        // Optional: Check if choice is valid
        if (!is_valid(choice)) continue;

        // STEP 1: CHOOSE (make the choice)
        make_choice(choice);

        // STEP 2: EXPLORE (recurse with choice)
        backtrack(new_state, remaining_choices);

        // STEP 3: UNCHOOSE (undo the choice)
        undo_choice(choice);
    }
}
```

### Mental Model (Simple!)

**Backtracking = Maze Exploration**

Think of it as:
- 🌽 Walking through a corn maze - try a path, hit dead end, turn back, try another
- 👔 Trying outfit combinations - try shirt+pants, doesn't work, change pants, try again
- 🧩 Solving a puzzle - place piece, doesn't fit, remove it, try another spot
- 📋 Making decisions - choose option A, see consequences, undo if bad, try option B

### Common Mistakes Checklist

Before submitting backtracking solution:
- [ ] Deep copy when adding to result: `[...currentState]`
- [ ] UNCHOOSE step: Undo the choice after recursion
- [ ] Correct base case: Know when solution is complete
- [ ] Pruning conditions: Check validity before recursing
- [ ] Handle duplicates: Sort + skip duplicates if needed
- [ ] Pass correct index: Use `i+1` to avoid reusing elements

---

## Final Thoughts for Beginners

Backtracking is like being a chess player who thinks ahead: "If I move here, then you'll move there, then I'll move back..." You explore possibilities, and when you see a path won't work, you **back up** and try something else!

**Start here:**
1. Master the three-step template (CHOOSE, EXPLORE, UNCHOOSE)
2. Practice subsets (simplest backtracking problem)
3. Move to permutations
4. Tackle constraint satisfaction (parentheses, N-Queens)
5. Learn to prune early for optimization

**Remember:** The key to backtracking is the **UNCHOOSE** step. You're not just exploring forward - you're actively undoing choices to explore other branches. If you forget to undo, you'll get wrong results!

The pattern is always the same:
1. Make a choice
2. Explore where it leads
3. Undo the choice
4. Try the next option

Once you see this pattern, all backtracking problems become variations of the same theme!

Happy coding!

---

[← Previous: Breadth-First Search](./13-breadth-first-search.md) | [Back to Index](./README.md) | [Next: Dynamic Programming →](./15-dynamic-programming.md)
