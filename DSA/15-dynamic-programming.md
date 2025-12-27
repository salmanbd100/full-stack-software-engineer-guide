# Dynamic Programming Pattern

## What is Dynamic Programming? (In Simple Words)

Imagine you're **calculating Fibonacci numbers** the hard way:

```
fib(5) = fib(4) + fib(3)
       = (fib(3) + fib(2)) + (fib(2) + fib(1))
       = ((fib(2) + fib(1)) + fib(2)) + (fib(2) + fib(1))

Notice: You're calculating fib(2) MULTIPLE times!
```

**Dynamic Programming says:** "Why calculate the same thing over and over? **Remember** the answer!"

### Real-World Analogy: Remembering vs Recalculating

**Without DP (Wasteful):**
```
You: "What's 7 + 5?"
Friend: *counts on fingers* "12"

You: "What's 7 + 5 + 3?"
Friend: *counts 7+5 again on fingers* "wait... 12 + 3 = 15"

You're recalculating 7+5 every time!
```

**With DP (Smart):**
```
You: "What's 7 + 5?"
Friend: *counts on fingers* "12" *writes it down*

You: "What's 7 + 5 + 3?"
Friend: *looks at paper* "I already know 7+5 is 12, so 12+3 = 15"

You saved work by remembering!
```

### Another Analogy: Cooking Multiple Dishes

**Problem:** You're cooking 3 dishes that all need boiled water.

**Naive Approach:**
```
Dish 1: Boil water (10 min) → Cook
Dish 2: Boil water (10 min) → Cook  ← Wasteful!
Dish 3: Boil water (10 min) → Cook  ← Wasteful!

Total: 30 minutes of boiling
```

**DP Approach (Memoization):**
```
Step 1: Boil water ONCE (10 min) → Store in pot
Step 2: Use stored water for Dish 1
Step 3: Use stored water for Dish 2
Step 4: Use stored water for Dish 3

Total: 10 minutes of boiling + reuse!
```

**This is DP:** Solve a subproblem once, **store the result**, and **reuse** it!

---

## Pattern Overview

**Dynamic Programming (DP)** solves complex problems by breaking them into simpler overlapping subproblems and storing results to avoid redundant computation. It combines optimal substructure with memoization or tabulation.

### When to Use
- Optimization problems (min/max)
- Counting problems
- Decision problems (can/cannot)
- Problems with overlapping subproblems
- Finding longest/shortest/most optimal solution

### Key Characteristics
- **Overlapping subproblems**: Same subproblem appears multiple times
- **Optimal substructure**: Optimal solution contains optimal solutions to subproblems
- Two approaches: **Top-down** (memoization) or **Bottom-up** (tabulation)
- Trades space for time
- Often involves 1D or 2D arrays/tables

### Pattern Identification
Look for this pattern when you see:
- "Find **maximum/minimum**..."
- "Count **number of ways**..."
- "**Longest/shortest**..."
- "Can you **reach**..."
- Fibonacci-like recurrence relations
- "**Optimal**" or "**best**" solution

---

## Understanding DP: The Two Approaches

### Top-Down (Memoization)

**Think:** "Solve the big problem, break it into smaller ones, remember answers"

```javascript
function fib(n, memo = {}) {
    // BASE CASE
    if (n <= 1) return n;

    // CHECK MEMO (already solved?)
    if (memo[n]) return memo[n];

    // SOLVE (break into smaller problems)
    memo[n] = fib(n - 1, memo) + fib(n - 2, memo);

    // RETURN
    return memo[n];
}
```

**Analogy:** Like looking up answers in the back of a textbook. If you've solved problem 5 before, you wrote down the answer. Next time you see problem 5, just look it up!

---

### Bottom-Up (Tabulation)

**Think:** "Solve the smallest problems first, build up to the big one"

```javascript
function fib(n) {
    // Handle base cases
    if (n <= 1) return n;

    // CREATE TABLE
    const dp = new Array(n + 1);
    dp[0] = 0;  // Smallest problem
    dp[1] = 1;  // Next smallest

    // BUILD UP (solve small → big)
    for (let i = 2; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }

    // RETURN final answer
    return dp[n];
}
```

**Analogy:** Like climbing stairs. Start at step 0, then step 1, then step 2... Each step uses the previous steps you've already climbed!

---

## Top-Down vs Bottom-Up: Which to Use?

| Aspect | Top-Down (Memoization) | Bottom-Up (Tabulation) |
|--------|------------------------|------------------------|
| **Direction** | Big → Small (recursive) | Small → Big (iterative) |
| **Style** | Recursive + cache | Iterative + array |
| **Space** | O(n) stack + O(n) cache | O(n) array only |
| **Speed** | Slightly slower (function calls) | Slightly faster |
| **Ease** | More intuitive for beginners | Requires planning |
| **When to use** | When not all subproblems are needed | When all subproblems must be solved |

**Rule of thumb:** Start with top-down (easier to think about), optimize to bottom-up if needed!

---

## Example 1: Climbing Stairs (JavaScript)

### Problem
You are climbing a staircase. It takes `n` steps to reach the top. Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

**LeetCode**: [70. Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)

### Solution

```javascript
/**
 * Count ways to climb stairs - Top-down (Memoization)
 * @param {number} n - Number of stairs
 * @return {number} - Number of distinct ways
 */
function climbStairs(n) {
    const memo = new Map();

    function dp(i) {
        // Base cases
        if (i <= 2) return i;

        // Check memo
        if (memo.has(i)) return memo.get(i);

        // Recurrence: ways(i) = ways(i-1) + ways(i-2)
        const result = dp(i - 1) + dp(i - 2);

        // Store in memo
        memo.set(i, result);
        return result;
    }

    return dp(n);
}

/**
 * Bottom-up approach (Tabulation)
 * @param {number} n
 * @return {number}
 */
function climbStairsBottomUp(n) {
    if (n <= 2) return n;

    // dp[i] = number of ways to reach step i
    const dp = new Array(n + 1);
    dp[1] = 1;  // 1 way to reach step 1
    dp[2] = 2;  // 2 ways to reach step 2

    // Build up from smaller subproblems
    for (let i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
    }

    return dp[n];
}

/**
 * Space-optimized approach
 * @param {number} n
 * @return {number}
 */
function climbStairsOptimized(n) {
    if (n <= 2) return n;

    let prev2 = 1;  // dp[i-2]
    let prev1 = 2;  // dp[i-1]

    for (let i = 3; i <= n; i++) {
        const current = prev1 + prev2;
        prev2 = prev1;
        prev1 = current;
    }

    return prev1;
}

// Example usage
console.log(climbStairs(2));           // Output: 2
// Explanation: 1+1 or 2

console.log(climbStairs(3));           // Output: 3
// Explanation: 1+1+1, 1+2, or 2+1

console.log(climbStairsBottomUp(5));   // Output: 8

console.log(climbStairsOptimized(4));  // Output: 5
```

### Detailed Code Walkthrough: Top-Down (Memoization)

```javascript
function climbStairs(n) {
    const memo = new Map();  // MEMOIZATION: Store solved subproblems

    function dp(i) {
        // STEP 1: BASE CASE - Simplest problems
        if (i <= 2) return i;
        // i=1: 1 way [1]
        // i=2: 2 ways [1+1, 2]

        // STEP 2: CHECK MEMO - Already solved?
        if (memo.has(i)) {
            return memo.get(i);  // REUSE! Don't recalculate
        }

        // STEP 3: RECURRENCE - Break into smaller subproblems
        const result = dp(i - 1) + dp(i - 2);
        // To reach step i:
        // - Take 1 step from step i-1 (dp(i-1) ways)
        // - Take 2 steps from step i-2 (dp(i-2) ways)
        // Total = sum of both

        // STEP 4: MEMOIZE - Remember for later
        memo.set(i, result);

        return result;
    }

    return dp(n);
}
```

**Execution Trace for n=5:**

```
Call dp(5):
  i=5, not in memo
  Compute: dp(4) + dp(3)

  Call dp(4):
    i=4, not in memo
    Compute: dp(3) + dp(2)

    Call dp(3):
      i=3, not in memo
      Compute: dp(2) + dp(1)

      Call dp(2): return 2 (base case)
      Call dp(1): return 1 (base case)

      result = 2 + 1 = 3
      memo[3] = 3 ✓
      return 3

    Call dp(2): return 2 (base case)

    result = 3 + 2 = 5
    memo[4] = 5 ✓
    return 5

  Call dp(3): return 3 (from memo!) ← Avoided recalculation!

  result = 5 + 3 = 8
  memo[5] = 8 ✓
  return 8

Final: 8
```

**Key insight:** dp(3) was calculated once and reused! Without memoization, it would be calculated multiple times.

### Detailed Code Walkthrough: Bottom-Up (Tabulation)

```javascript
function climbStairsBottomUp(n) {
    if (n <= 2) return n;

    // STEP 1: CREATE TABLE
    const dp = new Array(n + 1);
    // dp[i] = ways to reach step i

    // STEP 2: BASE CASES (smallest subproblems)
    dp[1] = 1;  // 1 way: [1]
    dp[2] = 2;  // 2 ways: [1+1, 2]

    // STEP 3: BUILD UP (solve small to big)
    for (let i = 3; i <= n; i++) {
        dp[i] = dp[i - 1] + dp[i - 2];
        // Use previously solved subproblems!
    }

    // STEP 4: RETURN final answer
    return dp[n];
}
```

**DP Table for n=5:**

```
i:       1   2   3   4   5
dp[i]:   1   2   3   5   8

Step 3: dp[3] = dp[2] + dp[1] = 2 + 1 = 3
Step 4: dp[4] = dp[3] + dp[2] = 3 + 2 = 5
Step 5: dp[5] = dp[4] + dp[3] = 5 + 3 = 8

Result: 8
```

**Visual Representation:**

```
Ways to reach step 5:

From step 4 (5 ways):          From step 3 (3 ways):
1+1+1+1 → +1 step              1+1+1 → +2 steps
1+1+2   → +1 step              1+2   → +2 steps
1+2+1   → +1 step              2+1   → +2 steps
2+1+1   → +1 step
2+2     → +1 step

Total: 5 + 3 = 8 ways
```

---

## Example 2: Coin Change (Python)

### Problem
You are given an integer array `coins` representing coins of different denominations and an integer `amount` representing a total amount of money. Return the fewest number of coins needed to make up that amount. If impossible, return -1.

**LeetCode**: [322. Coin Change](https://leetcode.com/problems/coin-change/)

### Solution

```python
from typing import List

class Solution:
    def coinChange(self, coins: List[int], amount: int) -> int:
        """
        Find minimum coins needed using bottom-up DP

        Args:
            coins: List of coin denominations
            amount: Target amount

        Returns:
            Minimum number of coins, or -1 if impossible
        """
        # dp[i] = minimum coins needed to make amount i
        dp = [float('inf')] * (amount + 1)
        dp[0] = 0  # 0 coins needed for amount 0

        # For each amount from 1 to target
        for i in range(1, amount + 1):
            # Try each coin
            for coin in coins:
                if coin <= i:
                    # Take coin and add to solution for (i - coin)
                    dp[i] = min(dp[i], dp[i - coin] + 1)

        # Return result, or -1 if impossible
        return dp[amount] if dp[amount] != float('inf') else -1

    def coinChangeTopDown(self, coins: List[int], amount: int) -> int:
        """
        Alternative: Top-down with memoization
        """
        memo = {}

        def dp(remaining):
            # Base cases
            if remaining == 0:
                return 0
            if remaining < 0:
                return float('inf')

            # Check memo
            if remaining in memo:
                return memo[remaining]

            # Try each coin and take minimum
            min_coins = float('inf')
            for coin in coins:
                result = dp(remaining - coin)
                if result != float('inf'):
                    min_coins = min(min_coins, result + 1)

            memo[remaining] = min_coins
            return min_coins

        result = dp(amount)
        return result if result != float('inf') else -1

# Example usage
solution = Solution()

# Example 1
coins1 = [1, 2, 5]
amount1 = 11
print(solution.coinChange(coins1, amount1))  # Output: 3
# Explanation: 11 = 5 + 5 + 1 (3 coins)

# Example 2
coins2 = [2]
amount2 = 3
print(solution.coinChange(coins2, amount2))  # Output: -1
# Explanation: Cannot make 3 with only coin of 2

# Example 3 - Using top-down approach
coins3 = [1, 2, 5]
amount3 = 11
print(solution.coinChangeTopDown(coins3, amount3))  # Output: 3
```

### Detailed Explanation: Bottom-Up Coin Change

```python
def coinChange(self, coins: List[int], amount: int) -> int:
    # STEP 1: INITIALIZE DP TABLE
    dp = [float('inf')] * (amount + 1)
    # dp[i] = minimum coins to make amount i
    # Initialize with infinity (impossible)

    # STEP 2: BASE CASE
    dp[0] = 0  # Need 0 coins to make amount 0

    # STEP 3: BUILD UP (solve for each amount from 1 to target)
    for i in range(1, amount + 1):
        # For current amount i, try each coin

        for coin in coins:
            if coin <= i:
                # CAN use this coin
                # dp[i-coin] = min coins to make (i-coin)
                # dp[i-coin] + 1 = add current coin
                dp[i] = min(dp[i], dp[i - coin] + 1)

    # STEP 4: RETURN RESULT
    return dp[amount] if dp[amount] != float('inf') else -1
```

**DP Table Evolution for coins=[1,2,5], amount=11:**

```
Initial: dp = [0, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞]

For i=1:
  coin=1: dp[1] = min(∞, dp[0]+1) = min(∞, 0+1) = 1
  dp = [0, 1, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞]

For i=2:
  coin=1: dp[2] = min(∞, dp[1]+1) = min(∞, 1+1) = 2
  coin=2: dp[2] = min(2, dp[0]+1) = min(2, 0+1) = 1
  dp = [0, 1, 1, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞]

For i=3:
  coin=1: dp[3] = min(∞, dp[2]+1) = min(∞, 1+1) = 2
  coin=2: dp[3] = min(2, dp[1]+1) = min(2, 1+1) = 2
  dp = [0, 1, 1, 2, ∞, ∞, ∞, ∞, ∞, ∞, ∞, ∞]

For i=5:
  coin=1: dp[5] = min(∞, dp[4]+1) = min(∞, 2+1) = 3
  coin=2: dp[5] = min(3, dp[3]+1) = min(3, 2+1) = 3
  coin=5: dp[5] = min(3, dp[0]+1) = min(3, 0+1) = 1
  dp = [0, 1, 1, 2, 2, 1, ∞, ∞, ∞, ∞, ∞, ∞]

... continuing ...

For i=11:
  coin=1: dp[11] = min(∞, dp[10]+1) = min(∞, 2+1) = 3
  coin=2: dp[11] = min(3, dp[9]+1) = min(3, 3+1) = 3
  coin=5: dp[11] = min(3, dp[6]+1) = min(3, 2+1) = 3
  dp = [0, 1, 1, 2, 2, 1, 2, 2, 3, 3, 2, 3]

Final: dp[11] = 3 (11 = 5 + 5 + 1)
```

**Visual Explanation:**

```
Target: 11
Coins: [1, 2, 5]

Option 1: 11 = 10 + 1
  dp[11] = dp[10] + 1 = 2 + 1 = 3

Option 2: 11 = 9 + 2
  dp[11] = dp[9] + 1 = 3 + 1 = 4

Option 3: 11 = 6 + 5
  dp[11] = dp[6] + 1 = 2 + 1 = 3

Minimum = 3 ✓
```

---

## The DP Decision Framework

### Step 1: Identify if it's a DP Problem

**Ask yourself:**
1. ✅ Can I break this into smaller subproblems?
2. ✅ Do subproblems overlap (solved multiple times)?
3. ✅ Does optimal solution use optimal subproblem solutions?

**If YES to all three → Use DP!**

### Step 2: Define the DP State

**Question:** "What does dp[i] represent?"

**Examples:**
- Climbing Stairs: `dp[i]` = ways to reach step i
- Coin Change: `dp[i]` = min coins to make amount i
- Longest Subsequence: `dp[i]` = length of longest subsequence ending at i

### Step 3: Find the Recurrence Relation

**Question:** "How does dp[i] relate to smaller subproblems?"

**Examples:**
- Climbing Stairs: `dp[i] = dp[i-1] + dp[i-2]`
- Coin Change: `dp[i] = min(dp[i-coin] + 1)` for each coin
- Fibonacci: `dp[i] = dp[i-1] + dp[i-2]`

### Step 4: Identify Base Cases

**Question:** "What are the simplest subproblems I can solve directly?"

**Examples:**
- Climbing Stairs: `dp[1] = 1, dp[2] = 2`
- Coin Change: `dp[0] = 0`
- Fibonacci: `dp[0] = 0, dp[1] = 1`

### Step 5: Determine Computation Order

**Bottom-up:** Solve smallest to largest
**Top-down:** Start from goal, recursively solve smaller

---

## Time & Space Complexity

### Example 1: Climbing Stairs
- **Top-down with memo**:
  - Time: O(n) - Each state computed once
  - Space: O(n) - Memoization + recursion stack
- **Bottom-up**:
  - Time: O(n)
  - Space: O(n) - DP array
- **Optimized**:
  - Time: O(n)
  - Space: O(1) - Only two variables

### Example 2: Coin Change
- **Bottom-up**:
  - Time: O(amount × coins) - For each amount, try each coin
  - Space: O(amount) - DP array
- **Top-down**:
  - Time: O(amount × coins)
  - Space: O(amount) - Memo + recursion stack

---

## Common DP Patterns

### Pattern 1: Linear DP (1D Array)
**Examples:** Climbing Stairs, House Robber, Decode Ways
**Recurrence:** `dp[i]` depends on `dp[i-1]`, `dp[i-2]`, etc.

### Pattern 2: Grid DP (2D Array)
**Examples:** Unique Paths, Minimum Path Sum, Edit Distance
**Recurrence:** `dp[i][j]` depends on `dp[i-1][j]`, `dp[i][j-1]`, etc.

### Pattern 3: Subsequence DP
**Examples:** Longest Increasing Subsequence, Longest Common Subsequence
**Recurrence:** Compare elements, extend previous subsequences

### Pattern 4: Knapsack DP
**Examples:** 0/1 Knapsack, Partition Equal Subset Sum
**Recurrence:** Include/exclude item

---

## Common Variations

1. **1D DP Problems**
   - LeetCode: [70. Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)
   - LeetCode: [198. House Robber](https://leetcode.com/problems/house-robber/)
   - LeetCode: [91. Decode Ways](https://leetcode.com/problems/decode-ways/)

2. **2D DP Problems**
   - LeetCode: [322. Coin Change](https://leetcode.com/problems/coin-change/)
   - LeetCode: [62. Unique Paths](https://leetcode.com/problems/unique-paths/)
   - LeetCode: [72. Edit Distance](https://leetcode.com/problems/edit-distance/)

3. **Subsequence Problems**
   - LeetCode: [300. Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/)
   - LeetCode: [1143. Longest Common Subsequence](https://leetcode.com/problems/longest-common-subsequence/)

4. **Knapsack Problems**
   - LeetCode: [416. Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/)
   - LeetCode: [518. Coin Change 2](https://leetcode.com/problems/coin-change-2/)

---

## Practice Problems

### Easy
1. [70. Climbing Stairs](https://leetcode.com/problems/climbing-stairs/)
2. [746. Min Cost Climbing Stairs](https://leetcode.com/problems/min-cost-climbing-stairs/)
3. [509. Fibonacci Number](https://leetcode.com/problems/fibonacci-number/)

### Medium
4. [322. Coin Change](https://leetcode.com/problems/coin-change/)
5. [198. House Robber](https://leetcode.com/problems/house-robber/)
6. [62. Unique Paths](https://leetcode.com/problems/unique-paths/)
7. [300. Longest Increasing Subsequence](https://leetcode.com/problems/longest-increasing-subsequence/)
8. [139. Word Break](https://leetcode.com/problems/word-break/)
9. [416. Partition Equal Subset Sum](https://leetcode.com/problems/partition-equal-subset-sum/)

### Hard
10. [72. Edit Distance](https://leetcode.com/problems/edit-distance/)
11. [10. Regular Expression Matching](https://leetcode.com/problems/regular-expression-matching/)
12. [123. Best Time to Buy and Sell Stock III](https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/)

---

## Key Takeaways

### Core Concepts
1. **Overlapping subproblems**: Same subproblem solved multiple times
2. **Optimal substructure**: Optimal solution contains optimal subproblem solutions
3. **Memoization**: Cache results to avoid recomputation
4. **Tabulation**: Build solution from smallest subproblems up

### Approaches
5. **Top-down**: Recursive + memoization, more intuitive
6. **Bottom-up**: Iterative + table, more efficient
7. **Space optimization**: Often can reduce to O(1) or O(k)

### Problem-Solving Steps
8. **Identify DP**: Overlapping subproblems + optimal substructure
9. **Define state**: What does dp[i] mean?
10. **Find recurrence**: How does dp[i] relate to smaller problems?
11. **Set base cases**: Simplest problems you can solve directly
12. **Choose approach**: Top-down or bottom-up?

### Common Patterns
13. **Linear DP**: `dp[i]` depends on previous elements
14. **Grid DP**: `dp[i][j]` depends on neighbors
15. **Subsequence**: Compare, extend previous solutions
16. **Knapsack**: Include/exclude decisions

### Implementation Tips
17. **Start simple**: Get brute force working first
18. **Add memoization**: Cache recursive results
19. **Convert to tabulation**: If needed for efficiency
20. **Optimize space**: Reduce dimensions where possible

Happy coding!

---

[← Previous: Backtracking](./14-backtracking.md) | [Back to Index](./README.md) | [Next: Graph Algorithms →](./16-graph-algorithms.md)
