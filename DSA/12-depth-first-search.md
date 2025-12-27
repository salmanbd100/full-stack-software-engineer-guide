# Depth-First Search (DFS) Pattern

## What is DFS? (In Simple Words)

Imagine you're exploring a **maze** or a **cave system**. You have two strategies:

**DFS Strategy (Depth-First):**
"I'll explore ONE path as deeply as possible until I hit a dead end, then backtrack and try another path."

Think of it like this: You're in a cave with multiple tunnels. Instead of checking a little bit of each tunnel (that would be BFS), you:
1. Pick the first tunnel
2. Walk down it as far as you can go
3. When you hit a dead end, turn around
4. Go back to the last intersection
5. Try the next unexplored tunnel

### Real-World Analogy: Reading a Book with Footnotes

You're reading a book that has footnotes, and those footnotes have their own footnotes:

```
Page 1: "See footnote 1"
  └─ Footnote 1: "For more details, see footnote 2"
      └─ Footnote 2: "This references footnote 3"
          └─ Footnote 3: (finally, no more footnotes!)

DFS Approach:
1. Start reading Page 1
2. See footnote 1, IMMEDIATELY jump to it (go deep!)
3. See footnote 2 from footnote 1, jump to it (go deeper!)
4. See footnote 3, jump to it (go even deeper!)
5. Hit the end, backtrack to footnote 2
6. Finish footnote 2, backtrack to footnote 1
7. Finish footnote 1, backtrack to Page 1
8. Continue reading Page 1

This is DFS - you follow each reference to its deepest point before coming back!
```

### Another Analogy: Exploring a File System

You're looking for a file in your computer's folders:

```
DFS Approach:
Documents/
  ├─ Work/
  │   ├─ Project1/
  │   │   ├─ file1.txt  ← Go all the way down first!
  │   │   └─ file2.txt
  │   └─ Project2/
  │       └─ file3.txt
  └─ Personal/
      └─ Photos/
```

DFS would search: Documents → Work → Project1 → file1.txt → file2.txt → (backtrack) → Project2 → file3.txt → (backtrack) → Personal → Photos

You exhaust each folder completely before moving to the next sibling!

---

## Pattern Overview

**Depth-First Search (DFS)** is a graph/tree traversal algorithm that explores as far as possible along each branch before backtracking. It goes deep into a tree/graph before exploring siblings.

### When to Use
- Tree path problems
- Graph connectivity and cycle detection
- Topological sorting
- Finding all paths
- Maze solving
- Backtracking problems

### Key Characteristics
- Explores depth before breadth
- Uses stack (explicit or implicit via recursion)
- Space complexity: O(h) where h is height/depth
- Can be implemented recursively or iteratively

### Pattern Identification
Look for this pattern when you see:
- "Find all paths"
- "Validate binary search tree"
- "Path sum"
- "Number of islands"
- "Course schedule" (topological sort)
- "Surrounded regions"
- "Maze solving"
- "Explore all possibilities"

---

## DFS Visualization: How It Works

### Visual Example: Exploring a Tree

```
Tree:       1
          /   \
         2     3
        / \     \
       4   5     6

DFS Exploration Order (Preorder): 1 → 2 → 4 → 5 → 3 → 6

Step-by-step:
Step 1: Visit 1 (root)
        [1]
          ↓
         2   3

Step 2: Go LEFT to 2 (go deep!)
        1
        ↓
       [2]   3
       / \
      4   5

Step 3: From 2, go LEFT to 4 (go deeper!)
        1
        ↓
        2     3
        ↓
       [4] 5

Step 4: 4 is a leaf (dead end), backtrack to 2
        1
        ↓
        2     3
       ↑ \
      4   5

Step 5: From 2, go RIGHT to 5
        1
        ↓
        2     3
       / ↓
      4  [5]

Step 6: 5 is a leaf, backtrack to 2, then to 1
        1
        ↑
        2     3
       / \
      4   5

Step 7: From 1, go RIGHT to 3
        1
          ↓
        2  [3]
             \
              6

Step 8: From 3, go RIGHT to 6
        1
          ↓
        2   3
              ↓
             [6]

Step 9: Done! All nodes visited.

Final DFS order: 1 → 2 → 4 → 5 → 3 → 6
```

### The Stack Concept (How DFS Remembers Where to Backtrack)

```
DFS uses a stack to remember where to return:

Visit 1:  Stack: [1]         → "Remember to come back to 1"
Go to 2:  Stack: [1, 2]      → "Remember to come back to 2 after exploring"
Go to 4:  Stack: [1, 2, 4]   → "Remember 4"
4 is leaf, pop: Stack: [1, 2] → "Go back to 2"
Go to 5:  Stack: [1, 2, 5]
5 is leaf, pop: Stack: [1, 2] → "Go back to 2"
2 done, pop: Stack: [1]       → "Go back to 1"
Go to 3:  Stack: [1, 3]
Go to 6:  Stack: [1, 3, 6]
6 is leaf, pop: Stack: [1, 3]
3 done, pop: Stack: [1]
1 done, pop: Stack: []        → "All done!"
```

---

## DFS vs BFS: The Key Difference

### Visual Comparison

```
Tree:       1
          /   \
         2     3
        / \   / \
       4   5 6   7

DFS (go DEEP first):
Order: 1 → 2 → 4 → 5 → 3 → 6 → 7
       root → left branch (ALL of it) → right branch (ALL of it)

BFS (go WIDE first):
Order: 1 → 2 → 3 → 4 → 5 → 6 → 7
       Level 0 → Level 1 (all) → Level 2 (all)
```

### Decision Guide: DFS or BFS?

| Question | DFS | BFS |
|----------|-----|-----|
| Find shortest path in unweighted graph? | ❌ No | ✅ Yes |
| Explore all paths? | ✅ Yes | ❌ No |
| Less memory for deep graphs? | ✅ Yes (O(h)) | ❌ No (O(w)) |
| Tree traversal (inorder, preorder, postorder)? | ✅ Yes | ❌ No |
| Level-wise processing? | ❌ No | ✅ Yes |
| Backtracking problems? | ✅ Yes | ❌ No |

---

## Example 1: Path Sum (JavaScript)

### Problem
Given the root of a binary tree and an integer `targetSum`, return `true` if the tree has a root-to-leaf path such that adding up all the values along the path equals `targetSum`.

**LeetCode**: [112. Path Sum](https://leetcode.com/problems/path-sum/)

### Solution

```javascript
/**
 * Definition for a binary tree node
 */
class TreeNode {
    constructor(val, left = null, right = null) {
        this.val = val;
        this.left = left;
        this.right = right;
    }
}

/**
 * Check if tree has path with given sum using DFS
 * @param {TreeNode} root - Root of binary tree
 * @param {number} targetSum - Target sum to find
 * @return {boolean} - True if path exists
 */
function hasPathSum(root, targetSum) {
    // Base case: empty tree
    if (root === null) {
        return false;
    }

    // Base case: leaf node
    // Check if current path sum equals target
    if (root.left === null && root.right === null) {
        return root.val === targetSum;
    }

    // Recursive case: explore left and right subtrees
    // Subtract current value from target for children
    const remainingSum = targetSum - root.val;

    return hasPathSum(root.left, remainingSum) ||
           hasPathSum(root.right, remainingSum);
}

/**
 * Iterative DFS approach using stack
 * @param {TreeNode} root
 * @param {number} targetSum
 * @return {boolean}
 */
function hasPathSumIterative(root, targetSum) {
    if (root === null) return false;

    // Stack stores [node, currentSum] pairs
    const stack = [[root, root.val]];

    while (stack.length > 0) {
        const [node, currentSum] = stack.pop();

        // Check if it's a leaf node with target sum
        if (node.left === null && node.right === null && currentSum === targetSum) {
            return true;
        }

        // Add right child to stack
        if (node.right !== null) {
            stack.push([node.right, currentSum + node.right.val]);
        }

        // Add left child to stack
        if (node.left !== null) {
            stack.push([node.left, currentSum + node.left.val]);
        }
    }

    return false;
}

// Helper function to create tree
function createTree(values) {
    if (!values || values.length === 0) return null;

    const root = new TreeNode(values[0]);
    const queue = [root];
    let i = 1;

    while (queue.length && i < values.length) {
        const node = queue.shift();

        if (i < values.length && values[i] !== null) {
            node.left = new TreeNode(values[i]);
            queue.push(node.left);
        }
        i++;

        if (i < values.length && values[i] !== null) {
            node.right = new TreeNode(values[i]);
            queue.push(node.right);
        }
        i++;
    }

    return root;
}

// Example usage
//       5
//      / \
//     4   8
//    /   / \
//   11  13  4
//  /  \      \
// 7    2      1
const root1 = createTree([5, 4, 8, 11, null, 13, 4, 7, 2, null, null, null, 1]);
console.log(hasPathSum(root1, 22));  // Output: true
// Path: 5 → 4 → 11 → 2 = 22

console.log(hasPathSum(root1, 26));  // Output: true
// Path: 5 → 8 → 13 = 26

const root2 = createTree([1, 2, 3]);
console.log(hasPathSum(root2, 5));   // Output: false

const root3 = createTree([]);
console.log(hasPathSum(root3, 0));   // Output: false
```

### Detailed Code Walkthrough: Recursive DFS

Let's trace through the recursive solution step-by-step:

```javascript
function hasPathSum(root, targetSum) {
    // STEP 1: Base case - empty node
    if (root === null) {
        return false;
    }
    // Why? If node doesn't exist, it can't contribute to any path

    // STEP 2: Base case - leaf node (dead end)
    if (root.left === null && root.right === null) {
        return root.val === targetSum;
    }
    // Why? At a leaf, we check if the remaining sum equals the leaf's value
    // This is our "destination check"

    // STEP 3: Recursive case - go deeper!
    const remainingSum = targetSum - root.val;
    // Subtract current node's value from target
    // Pass the remainder to children

    // STEP 4: Explore LEFT and RIGHT paths (DFS!)
    return hasPathSum(root.left, remainingSum) ||
           hasPathSum(root.right, remainingSum);
    // If EITHER path works, return true
    // The || operator short-circuits (stops at first true)
}
```

**Call Stack Visualization:**

```
Tree:      5
         /   \
        4     8
       /     / \
      11    13  4
     /  \        \
    7    2        1

Target: 22

Call Stack Evolution:

1. hasPathSum(5, 22)
   ├─ 5 is not leaf, subtract 5: remaining = 17
   ├─ Explore left:  hasPathSum(4, 17)
   │   ├─ 4 is not leaf, subtract 4: remaining = 13
   │   ├─ Explore left:  hasPathSum(11, 13)
   │   │   ├─ 11 is not leaf, subtract 11: remaining = 2
   │   │   ├─ Explore left:  hasPathSum(7, 2)
   │   │   │   ├─ 7 is leaf
   │   │   │   ├─ Check: 7 === 2? NO
   │   │   │   └─ Return false
   │   │   │
   │   │   ├─ Explore right: hasPathSum(2, 2)
   │   │   │   ├─ 2 is leaf
   │   │   │   ├─ Check: 2 === 2? YES!
   │   │   │   └─ Return TRUE ✓
   │   │   │
   │   │   └─ Return true (found path!)
   │   │
   │   └─ Return true (propagate up)
   │
   └─ Return true (propagate to root)

Final result: true
Path found: 5 → 4 → 11 → 2 = 22
```

### Detailed Code Walkthrough: Iterative DFS

The iterative version uses an explicit stack:

```javascript
function hasPathSumIterative(root, targetSum) {
    if (root === null) return false;

    // Stack stores [node, currentSum] pairs
    const stack = [[root, root.val]];
    // Initial state: root node with its value as the current sum

    while (stack.length > 0) {
        const [node, currentSum] = stack.pop();
        // Pop from stack (LIFO - Last In, First Out)
        // This gives us the "deepest" unexplored node

        // Check if we reached a leaf with target sum
        if (node.left === null && node.right === null && currentSum === targetSum) {
            return true;  // Found it!
        }

        // Add children to stack for exploration
        // (We add them only if they exist)

        if (node.right !== null) {
            stack.push([node.right, currentSum + node.right.val]);
            // Add right child with updated sum
        }

        if (node.left !== null) {
            stack.push([node.left, currentSum + node.left.val]);
            // Add left child with updated sum
        }
        // Note: We push right first, then left
        // Since stack is LIFO, left will be explored first
    }

    return false;  // Explored all paths, no match
}
```

**Stack Evolution Example:**

```
Tree:      5
         /   \
        4     8
       /
      11

Target: 20

Initial: stack = [[5, 5]]

Iteration 1:
  Pop [5, 5]
  5 is not leaf
  Push right: [[8, 13]]  (5 + 8)
  Push left:  [[8, 13], [4, 9]]  (5 + 4)

  Stack: [[8, 13], [4, 9]]

Iteration 2:
  Pop [4, 9]  ← Left is explored first (LIFO)
  4 is not leaf
  Push right: none
  Push left:  [[8, 13], [11, 20]]  (9 + 11)

  Stack: [[8, 13], [11, 20]]

Iteration 3:
  Pop [11, 20]
  11 IS leaf
  Check: 20 === 20? YES!

  Return true ✓

Path found: 5 → 4 → 11 = 20
```

---

## Example 2: Number of Islands (Python)

### Problem
Given an `m x n` 2D binary grid which represents a map of '1's (land) and '0's (water), return the number of islands. An island is surrounded by water and is formed by connecting adjacent lands horizontally or vertically.

**LeetCode**: [200. Number of Islands](https://leetcode.com/problems/number-of-islands/)

### Solution

```python
from typing import List

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        """
        Count number of islands using DFS

        Args:
            grid: 2D grid of '1' (land) and '0' (water)

        Returns:
            Number of islands
        """
        if not grid or not grid[0]:
            return 0

        rows, cols = len(grid), len(grid[0])
        islands = 0

        def dfs(r, c):
            """Mark all connected land cells as visited"""
            # Base cases: out of bounds or water or already visited
            if (r < 0 or r >= rows or
                c < 0 or c >= cols or
                grid[r][c] == '0'):
                return

            # Mark current cell as visited (change to '0')
            grid[r][c] = '0'

            # Explore all 4 directions (up, down, left, right)
            dfs(r - 1, c)  # up
            dfs(r + 1, c)  # down
            dfs(r, c - 1)  # left
            dfs(r, c + 1)  # right

        # Iterate through each cell in the grid
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == '1':
                    islands += 1      # Found new island
                    dfs(r, c)         # Mark entire island as visited

        return islands

    def numIslandsIterative(self, grid: List[List[str]]) -> int:
        """
        Alternative: Iterative DFS using stack
        """
        if not grid or not grid[0]:
            return 0

        rows, cols = len(grid), len(grid[0])
        islands = 0

        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == '1':
                    islands += 1

                    # Use stack for iterative DFS
                    stack = [(r, c)]

                    while stack:
                        curr_r, curr_c = stack.pop()

                        # Skip if out of bounds or water
                        if (curr_r < 0 or curr_r >= rows or
                            curr_c < 0 or curr_c >= cols or
                            grid[curr_r][curr_c] == '0'):
                            continue

                        # Mark as visited
                        grid[curr_r][curr_c] = '0'

                        # Add all 4 neighbors to stack
                        stack.append((curr_r - 1, curr_c))  # up
                        stack.append((curr_r + 1, curr_c))  # down
                        stack.append((curr_r, curr_c - 1))  # left
                        stack.append((curr_r, curr_c + 1))  # right

        return islands

# Example usage
solution = Solution()

# Example 1
grid1 = [
    ["1","1","1","1","0"],
    ["1","1","0","1","0"],
    ["1","1","0","0","0"],
    ["0","0","0","0","0"]
]
print(solution.numIslands(grid1))  # Output: 1
# One connected island

# Example 2
grid2 = [
    ["1","1","0","0","0"],
    ["1","1","0","0","0"],
    ["0","0","1","0","0"],
    ["0","0","0","1","1"]
]
print(solution.numIslands(grid2))  # Output: 3
# Three separate islands

# Example 3 - Using iterative approach
grid3 = [
    ["1","0","1"],
    ["0","1","0"],
    ["1","0","1"]
]
print(solution.numIslandsIterative(grid3))  # Output: 5
# Five separate islands (each '1' is isolated)
```

### Detailed Explanation: How Island Counting Works

```python
def numIslands(self, grid: List[List[str]]) -> int:
    # PHASE 1: Setup
    if not grid or not grid[0]:
        return 0

    rows, cols = len(grid), len(grid[0])
    islands = 0

    def dfs(r, c):
        """This function 'floods' an entire island, marking it as visited"""

        # BOUNDARY CHECK: Are we out of bounds or in water?
        if (r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0'):
            return  # Hit boundary or water, stop exploring this direction

        # MARK AS VISITED: Change '1' to '0'
        grid[r][c] = '0'
        # Why? To avoid counting the same island cell twice
        # We "sink" the land as we visit it

        # EXPLORE 4 DIRECTIONS: Go deep in each direction!
        dfs(r - 1, c)  # North (up)
        dfs(r + 1, c)  # South (down)
        dfs(r, c - 1)  # West (left)
        dfs(r, c + 1)  # East (right)
        # Each call goes as deep as possible in that direction

    # PHASE 2: Scan the entire grid
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                # Found unvisited land! Start of a new island
                islands += 1
                dfs(r, c)  # "Flood fill" the entire island
                # After this call, the whole island is marked '0'

    return islands
```

### Visual Trace: Island Counting

```
Initial Grid:
1 1 0 0
1 0 0 1
0 0 1 1

Step 1: Scan (0,0), found '1'
  islands = 1
  DFS from (0,0):

  Visit (0,0) → '0'
  Grid: 0 1 0 0
        1 0 0 1
        0 0 1 1

  Explore UP: out of bounds, return
  Explore DOWN: (1,0) is '1', visit it

  Visit (1,0) → '0'
  Grid: 0 1 0 0
        0 0 0 1
        0 0 1 1

  From (1,0), explore all 4 directions
    UP: (0,0) is now '0', return
    DOWN: (2,0) is '0', return
    LEFT: out of bounds, return
    RIGHT: (1,1) is '0', return

  Back to (0,0), explore RIGHT: (0,1) is '1'

  Visit (0,1) → '0'
  Grid: 0 0 0 0
        0 0 0 1
        0 0 1 1

  (0,1) has no more '1' neighbors
  DFS complete for island 1

Step 2: Continue scan, (0,3) is '0', skip
Step 3: Scan (1,3), found '1'
  islands = 2
  DFS from (1,3):

  Visit (1,3) → '0'
  Grid: 0 0 0 0
        0 0 0 0
        0 0 1 1

  No '1' neighbors, island 2 is just 1 cell

Step 4: Scan (2,2), found '1'
  islands = 3
  DFS from (2,2):

  Visit (2,2) → '0'
  Grid: 0 0 0 0
        0 0 0 0
        0 0 0 1

  Explore RIGHT: (2,3) is '1'

  Visit (2,3) → '0'
  Grid: 0 0 0 0
        0 0 0 0
        0 0 0 0

  DFS complete for island 3

Final: islands = 3
```

---

## Time & Space Complexity

### Example 1: Path Sum
- **Time Complexity**: O(n) - Visit each node once in worst case
- **Space Complexity**:
  - Recursive: O(h) - Recursion depth (h = tree height)
    - Best case (balanced): O(log n)
    - Worst case (skewed): O(n)
  - Iterative: O(h) - Stack size

### Example 2: Number of Islands
- **Time Complexity**: O(m × n) - Visit each cell once
- **Space Complexity**:
  - Recursive: O(m × n) - Worst case recursion depth (entire grid is one island)
  - Iterative: O(m × n) - Stack size in worst case

---

## Common Variations

1. **Path Sum Problems**
   - LeetCode: [112. Path Sum](https://leetcode.com/problems/path-sum/)
   - LeetCode: [113. Path Sum II](https://leetcode.com/problems/path-sum-ii/) (find all paths)
   - LeetCode: [437. Path Sum III](https://leetcode.com/problems/path-sum-iii/) (any path, not just root-to-leaf)

2. **Tree Validation**
   - LeetCode: [98. Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
   - LeetCode: [110. Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/)

3. **Graph Problems**
   - LeetCode: [200. Number of Islands](https://leetcode.com/problems/number-of-islands/)
   - LeetCode: [695. Max Area of Island](https://leetcode.com/problems/max-area-of-island/)
   - LeetCode: [130. Surrounded Regions](https://leetcode.com/problems/surrounded-regions/)
   - LeetCode: [133. Clone Graph](https://leetcode.com/problems/clone-graph/)

4. **Cycle Detection**
   - LeetCode: [207. Course Schedule](https://leetcode.com/problems/course-schedule/)
   - LeetCode: [210. Course Schedule II](https://leetcode.com/problems/course-schedule-ii/)

---

## Practice Problems

### Easy
1. [104. Maximum Depth of Binary Tree](https://leetcode.com/problems/maximum-depth-of-binary-tree/)
2. [112. Path Sum](https://leetcode.com/problems/path-sum/)
3. [110. Balanced Binary Tree](https://leetcode.com/problems/balanced-binary-tree/)
4. [543. Diameter of Binary Tree](https://leetcode.com/problems/diameter-of-binary-tree/)

### Medium
5. [200. Number of Islands](https://leetcode.com/problems/number-of-islands/)
6. [113. Path Sum II](https://leetcode.com/problems/path-sum-ii/)
7. [98. Validate Binary Search Tree](https://leetcode.com/problems/validate-binary-search-tree/)
8. [230. Kth Smallest Element in a BST](https://leetcode.com/problems/kth-smallest-element-in-a-bst/)
9. [695. Max Area of Island](https://leetcode.com/problems/max-area-of-island/)
10. [417. Pacific Atlantic Water Flow](https://leetcode.com/problems/pacific-atlantic-water-flow/)
11. [207. Course Schedule](https://leetcode.com/problems/course-schedule/)

### Hard
12. [297. Serialize and Deserialize Binary Tree](https://leetcode.com/problems/serialize-and-deserialize-binary-tree/)
13. [124. Binary Tree Maximum Path Sum](https://leetcode.com/problems/binary-tree-maximum-path-sum/)

---

## Common Pitfalls (Mistakes to Avoid)

### 1. Forgetting to Mark Visited in Graphs

**WRONG:**
```python
def dfs(r, c):
    if r < 0 or r >= rows or c >= cols or grid[r][c] == '0':
        return

    # BUG: Forgot to mark as visited!
    # This will cause infinite recursion!

    dfs(r-1, c)
    dfs(r+1, c)
    dfs(r, c-1)
    dfs(r, c+1)
```

**RIGHT:**
```python
def dfs(r, c):
    if r < 0 or r >= rows or c >= cols or grid[r][c] == '0':
        return

    grid[r][c] = '0'  # MARK AS VISITED FIRST!

    dfs(r-1, c)
    dfs(r+1, c)
    dfs(r, c-1)
    dfs(r, c+1)
```

**Why it's wrong:** Without marking visited, you'll revisit the same cell infinitely:
```
(0,0) → (0,1) → (0,0) → (0,1) → ... INFINITE LOOP!
```

---

### 2. Checking Visited After Recursive Calls

**WRONG:**
```python
def dfs(r, c):
    # BUG: Check bounds AFTER exploring
    dfs(r-1, c)  # Might go out of bounds!
    dfs(r+1, c)

    if r < 0 or r >= rows:
        return
```

**RIGHT:**
```python
def dfs(r, c):
    # Check bounds BEFORE exploring
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
        return

    grid[r][c] = '0'
    dfs(r-1, c)
    dfs(r+1, c)
```

---

### 3. Not Handling Leaf Nodes Correctly in Path Sum

**WRONG:**
```javascript
function hasPathSum(root, targetSum) {
    if (root === null) return false;

    // BUG: Checking sum at ANY node, not just leaves!
    if (root.val === targetSum) {
        return true;
    }

    const remaining = targetSum - root.val;
    return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}
```

**Problem:** This returns true for internal nodes, not just root-to-leaf paths!

**RIGHT:**
```javascript
function hasPathSum(root, targetSum) {
    if (root === null) return false;

    // Check sum ONLY at leaf nodes
    if (root.left === null && root.right === null) {
        return root.val === targetSum;
    }

    const remaining = targetSum - root.val;
    return hasPathSum(root.left, remaining) || hasPathSum(root.right, remaining);
}
```

---

### 4. Modifying Grid Without Restoring (When You Need Original)

**WRONG (if you need the grid later):**
```python
def numIslands(grid):
    islands = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == '1':
                islands += 1
                dfs(r, c)  # Modifies grid permanently!

    # BUG: grid is now all '0's, can't use it again!
    return islands
```

**RIGHT (if you need to preserve grid):**
```python
def numIslands(grid):
    islands = 0
    visited = set()

    def dfs(r, c):
        if (r, c) in visited or r < 0 or r >= len(grid) or c < 0 or c >= len(grid[0]) or grid[r][c] == '0':
            return

        visited.add((r, c))  # Track in separate set
        dfs(r-1, c)
        dfs(r+1, c)
        dfs(r, c-1)
        dfs(r, c+1)

    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == '1' and (r, c) not in visited:
                islands += 1
                dfs(r, c)

    # Grid is still intact!
    return islands
```

---

## Frequently Asked Questions (FAQ)

### Q1: When should I use DFS instead of BFS?

**Answer:**

**Use DFS when:**
- Finding ALL paths (not just shortest)
- Exploring tree structures (inorder, preorder, postorder)
- Backtracking problems (N-Queens, Sudoku solver)
- Memory is limited and graph is very wide
- Detecting cycles in directed graphs
- Topological sorting

**Use BFS when:**
- Finding SHORTEST path in unweighted graph
- Level-order traversal
- Finding nodes at exact distance K
- Graph is very deep (avoid stack overflow)
- Finding minimum moves/steps

**Example:**
```
Find ANY path from A to B? → DFS (faster, less memory)
Find SHORTEST path from A to B? → BFS (guaranteed shortest)
```

---

### Q2: How do I avoid stack overflow in very deep recursion?

**Answer:**

**Option 1:** Use iterative DFS with explicit stack
```javascript
function dfsIterative(root) {
    const stack = [root];

    while (stack.length > 0) {
        const node = stack.pop();
        // Process node

        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }
}
```

**Option 2:** Increase stack size (language-specific)
- Java: `-Xss` flag
- Python: `sys.setrecursionlimit()`
- JavaScript: Not configurable, use iterative

**Option 3:** Use tail recursion (if language supports)

**Best practice:** For production code with unknown depth, always use iterative or BFS.

---

### Q3: Can DFS find the shortest path?

**Answer:** **Only for trees, not for general graphs.**

**In Trees:** DFS finds the unique path (there's only one path between any two nodes)

**In Graphs:** DFS does NOT guarantee shortest path!

**Example:**
```
Graph:  A -- B
        |    |
        C -- D

DFS from A to D might find: A → C → D (length 2) or A → B → D (length 2)
But it might also explore: A → C → (backtrack) → B → D

BFS from A to D finds: A → B → D or A → C → D (both length 2, guaranteed shortest)
```

For shortest path in graphs, use:
- BFS (unweighted)
- Dijkstra (weighted, non-negative)
- Bellman-Ford (weighted, with negative edges)

---

### Q4: How do I track the actual path in DFS, not just check if it exists?

**Answer:**

**Approach 1: Pass path as parameter**
```javascript
function findPath(root, target, path = []) {
    if (!root) return null;

    path.push(root.val);  // Add current node to path

    if (root.val === target) {
        return [...path];  // Return copy of path
    }

    const leftPath = findPath(root.left, target, path);
    if (leftPath) return leftPath;

    const rightPath = findPath(root.right, target, path);
    if (rightPath) return rightPath;

    path.pop();  // Backtrack - remove current node
    return null;
}
```

**Approach 2: Build path on return**
```javascript
function findPath(root, target) {
    if (!root) return null;

    if (root.val === target) {
        return [root.val];
    }

    const leftPath = findPath(root.left, target);
    if (leftPath) {
        return [root.val, ...leftPath];
    }

    const rightPath = findPath(root.right, target);
    if (rightPath) {
        return [root.val, ...rightPath];
    }

    return null;
}
```

---

### Q5: What's the difference between DFS and backtracking?

**Answer:**

**DFS** is a traversal strategy: "Explore deep first, backtrack when stuck"

**Backtracking** is a problem-solving technique that USES DFS:
"Try a choice, explore deep, if it doesn't work, undo the choice (backtrack) and try another"

**Key difference:**
- DFS: Just explores the graph/tree
- Backtracking: Makes choices, explores consequences, undoes bad choices

**Example:**
```javascript
// Pure DFS (just explore)
function dfs(node) {
    visit(node);
    dfs(node.left);
    dfs(node.right);
}

// Backtracking (make choices)
function backtrack(state, choices) {
    if (is_solution(state)) {
        add_to_results(state);
        return;
    }

    for (choice of choices) {
        make_choice(choice);      // Make a choice
        backtrack(new_state);     // Explore DFS-style
        undo_choice(choice);      // Backtrack - undo the choice
    }
}
```

Backtracking = DFS + Decision making + Undoing decisions

---

### Q6: How do I handle cycles in graphs during DFS?

**Answer:**

Use a **visited set** or **mark visited nodes**:

**Approach 1: Visited Set**
```python
def dfs(node, visited=set()):
    if node in visited:
        return  # Already visited, skip

    visited.add(node)

    for neighbor in graph[node]:
        dfs(neighbor, visited)
```

**Approach 2: Three States (for cycle detection)**
```python
# 0 = unvisited, 1 = visiting, 2 = visited
state = [0] * n

def has_cycle(node):
    if state[node] == 1:
        return True  # Back edge found - cycle!

    if state[node] == 2:
        return False  # Already processed

    state[node] = 1  # Mark as visiting

    for neighbor in graph[node]:
        if has_cycle(neighbor):
            return True

    state[node] = 2  # Mark as visited
    return False
```

---

### Q7: Can I do DFS on a graph represented as adjacency matrix?

**Answer:** Yes! Same concept, different representation.

**Adjacency List DFS:**
```javascript
const graph = {
    'A': ['B', 'C'],
    'B': ['D'],
    'C': ['D'],
    'D': []
};

function dfs(node, visited = new Set()) {
    visited.add(node);
    console.log(node);

    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            dfs(neighbor, visited);
        }
    }
}
```

**Adjacency Matrix DFS:**
```javascript
const matrix = [
    [0, 1, 1, 0],  // A connects to B, C
    [0, 0, 0, 1],  // B connects to D
    [0, 0, 0, 1],  // C connects to D
    [0, 0, 0, 0]   // D connects to nothing
];

function dfs(node, visited = new Set()) {
    visited.add(node);
    console.log(node);

    for (let neighbor = 0; neighbor < matrix.length; neighbor++) {
        if (matrix[node][neighbor] === 1 && !visited.has(neighbor)) {
            dfs(neighbor, visited);
        }
    }
}
```

---

## Pro Tips for Interviews

### Tip 1: Always Mention DFS vs BFS Trade-offs

When asked about graph traversal:

```
Interviewer: "How would you solve this?"

You: "I can use DFS or BFS. Let me think about the trade-offs:
- DFS uses O(h) space (height), BFS uses O(w) space (width)
- If we need shortest path, BFS is better
- If we need to explore all paths or do backtracking, DFS is better
- For this problem, I'll use DFS because..."
```

This shows deep understanding!

---

### Tip 2: Draw the Recursion Tree

Always sketch the recursion on the whiteboard:

```
"Let me draw how DFS explores this tree..."

        1
      /   \
     2     3
    / \
   4   5

DFS order: 1 → 2 → 4 (backtrack) → 5 (backtrack) → 3

[Draw arrows showing the path]
```

Visualizing helps you AND the interviewer follow your logic!

---

### Tip 3: Handle Edge Cases Out Loud

```
You: "Before I code, let me think about edge cases:
- Empty input? Return 0 or false
- Single node? Check if it satisfies condition
- All nodes connected (one island)? Should return 1
- Cycles in graph? Need visited tracking

Let me handle these in my code..."
```

---

### Tip 4: Explain Recursive Base Case

When writing recursive DFS:

```javascript
function dfs(node) {
    // You say: "Base case - if node is null, there's nothing to explore"
    if (node === null) return;

    // You say: "Process current node"
    process(node);

    // You say: "Recursively explore left and right subtrees"
    dfs(node.left);
    dfs(node.right);
}
```

Narrate your logic step-by-step!

---

### Tip 5: Mention Iterative Alternative

After implementing recursive DFS:

```
You: "I implemented the recursive version for clarity, but I can
also do iterative DFS using an explicit stack if you'd like.
That would avoid potential stack overflow for very deep trees."
```

This shows you know multiple approaches!

---

### Tip 6: Be Ready to Compare with BFS

Have this table memorized:

```
             DFS              BFS
Use Case:    All paths        Shortest path
Data Struct: Stack (LIFO)     Queue (FIFO)
Space:       O(height)        O(width)
Order:       Deep first       Level by level
```

---

### Tip 7: Explain the "Why" Behind Visited Tracking

```
You: "I'm marking cells as '0' after visiting them. This serves
two purposes:
1. Prevents infinite loops in the recursion
2. Ensures we don't count the same island cell twice

It's like leaving breadcrumbs so we know where we've been."
```

---

## Pattern Recognition Guide

### When to Think "DFS"?

#### Definite Signals:
1. "Find all paths" → 99% DFS
2. "Explore all possibilities" → DFS
3. "Backtracking" in problem description → DFS
4. "Recursive solution" → Often DFS
5. Tree traversal (inorder, preorder, postorder) → DFS

#### Strong Hints:
1. "Path sum" or "path exists" → DFS
2. "Connected components" → DFS or BFS
3. "Islands" problems → DFS or BFS
4. "Validate tree property" → DFS
5. "Topological sort" → DFS
6. "Cycle detection" → DFS

#### Problem Patterns:

**Pattern 1: Path Finding**
```
Problem: "Find if path exists with sum X"
Solution: DFS, tracking sum as you go
```

**Pattern 2: Island/Region Counting**
```
Problem: "Count number of regions"
Solution: DFS to "flood fill" each region
```

**Pattern 3: Tree Property Validation**
```
Problem: "Is this a valid BST?"
Solution: DFS with constraints
```

**Pattern 4: All Combinations**
```
Problem: "Generate all valid combinations"
Solution: DFS with backtracking
```

---

## Key Takeaways

### Core Concepts
1. **Go deep first**: Explore as far as possible before backtracking
2. **Use stack**: Either implicit (recursion) or explicit (iterative)
3. **Mark visited**: Critical for graphs to avoid infinite loops
4. **Space efficient**: O(h) space vs BFS's O(w) space

### Implementation Choices
5. **Recursive**: Clean, simple, but can stack overflow
6. **Iterative**: Safer for deep structures, uses explicit stack
7. **Visited tracking**: Use Set, modify input, or three-state array

### Common Applications
8. **Tree traversal**: Inorder, preorder, postorder are all DFS
9. **Path problems**: Finding paths, checking path existence
10. **Island counting**: Flood fill using DFS
11. **Cycle detection**: Three-state DFS
12. **Backtracking**: DFS with choice making/undoing

### Interview Tips
13. **Compare with BFS**: Always know trade-offs
14. **Handle edge cases**: Empty input, single node, cycles
15. **Explain base case**: Why recursion stops
16. **Draw diagrams**: Visualize the exploration
17. **Offer both versions**: Recursive and iterative

### Common Mistakes to Avoid
18. **Forgetting visited**: Causes infinite loops
19. **Wrong base case**: Check bounds before recursing
20. **Modifying state**: Be careful when grid/tree should be preserved

---

## Beginner's Quick Reference

### DFS Template (Recursive)

**For Trees:**
```javascript
function dfs(node) {
    if (!node) return;  // Base case

    // Process node
    console.log(node.val);

    // Explore children
    dfs(node.left);
    dfs(node.right);
}
```

**For Graphs (with visited tracking):**
```javascript
function dfs(node, visited = new Set()) {
    if (visited.has(node)) return;

    visited.add(node);
    console.log(node);

    for (const neighbor of graph[node]) {
        dfs(neighbor, visited);
    }
}
```

**For Grids (like islands):**
```python
def dfs(r, c):
    if r < 0 or r >= rows or c < 0 or c >= cols or grid[r][c] == '0':
        return

    grid[r][c] = '0'  # Mark visited

    dfs(r-1, c)  # Up
    dfs(r+1, c)  # Down
    dfs(r, c-1)  # Left
    dfs(r, c+1)  # Right
```

### Mental Model (Simple!)

**DFS = "Explore one tunnel completely before trying another"**

Think of it as:
- 📚 Reading footnotes immediately when you encounter them (go deep!)
- 🌳 Climbing a tree to the leaf before climbing another branch
- 🗺️ Following one path in a maze until you hit a dead end

### Common Mistakes Checklist

Before submitting DFS solution:
- [ ] Checked base case (null/bounds check) BEFORE recursing
- [ ] Marked nodes/cells as visited (for graphs/grids)
- [ ] Handled empty input
- [ ] Used correct data structure (stack for iterative, recursion for recursive)
- [ ] Not confusing DFS with BFS (stack vs queue!)

---

## Final Thoughts for Beginners

DFS is like exploring a cave system - you follow one tunnel to its end before exploring another. It's one of the most fundamental algorithms in computer science and appears in countless problems.

**Start here:**
1. Master recursive DFS on trees (simplest)
2. Understand path sum problems
3. Practice on grids (islands problems)
4. Learn iterative DFS with stack
5. Combine with backtracking for harder problems

**Remember:** DFS is about going DEEP, not WIDE. If you find yourself exploring level by level, that's BFS, not DFS!

Happy coding!

---

[← Previous: Binary Tree Traversal](./11-binary-tree-traversal.md) | [Back to Index](./README.md) | [Next: Breadth-First Search →](./13-breadth-first-search.md)
