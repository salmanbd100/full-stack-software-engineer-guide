# Breadth-First Search (BFS) Pattern

## What is BFS? (In Simple Words)

Imagine you're at a **concert** trying to find your friend in a crowded venue. You have two strategies:

**BFS Strategy (Breadth-First):**
"I'll check ALL people in the first row first, then ALL people in the second row, then the third row, and so on."

Think of it like **ripples in water** when you throw a stone:
1. The ripple starts from where the stone hit (starting point)
2. It spreads outward in circular waves
3. Each wave reaches points that are the same distance from the center
4. Wave 1 (distance 1), then Wave 2 (distance 2), then Wave 3 (distance 3)...

### Real-World Analogy: Fire Spreading

Imagine a **forest fire** starting from a single tree:

```
Initial state (minute 0):
. . . . .
. . F . .    F = Fire
. . . . .    . = Tree
. . . . .

After minute 1 (fire spreads to neighbors):
. . F . .
. F F F .    Fire spreads to 4 neighbors simultaneously!
. . F . .    All at distance 1 from origin

After minute 2 (fire spreads outward):
. F F F .
F F F F F    Fire reaches ALL trees at distance 2
. F F F .    Before moving to distance 3

After minute 3:
F F F F F
F F F F F    All trees caught fire
F F F F F
```

**Key insight:** Fire spreads **level by level** (distance by distance), just like BFS explores level by level!

### Another Analogy: Finding the Shortest Path at an Airport

You're at an airport trying to find the nearest coffee shop:

```
You → Gate A → Gate B → Gate C
      ↓        ↓
    Shop1?   Shop2?   Shop3?

BFS Approach:
1. Check Gate A first (distance 1)
   - Found Shop1! → Return "1 gate away"
   - This is GUARANTEED to be the closest!

Why? Because BFS checks ALL gates at distance 1 before
checking gates at distance 2!
```

**DFS would be:** Walk down Gate A's entire hallway, explore every corner, then come back and try Gate B. You might find a shop after walking very far, even though there was a closer one!

**BFS guarantees:** If there's a shop at distance 1, you'll find it before exploring distance 2.

---

## Pattern Overview

**Breadth-First Search (BFS)** is a graph/tree traversal algorithm that explores nodes level by level. It visits all nodes at depth d before visiting nodes at depth d+1, using a queue data structure.

### When to Use
- Finding shortest path in unweighted graphs
- Level-order tree traversal
- Finding minimum steps/moves
- Finding all nodes at distance k
- Web crawling, social network analysis

### Key Characteristics
- Explores level by level (breadth before depth)
- Uses queue data structure (FIFO - First In, First Out)
- Guaranteed to find shortest path in unweighted graphs
- Space complexity: O(w) where w is maximum width

### Pattern Identification
Look for this pattern when you see:
- "Shortest path" in unweighted graph
- "Minimum number of moves/steps"
- "Level order traversal"
- "Nodes at distance k"
- "Binary tree right side view"
- "Rotting oranges"
- "Minimum depth"
- "Nearest/closest"

---

## BFS Visualization: How It Works

### Visual Example: Exploring a Tree Level by Level

```
Tree:       1
          /   \
         2     3
        / \   / \
       4   5 6   7

BFS Exploration Order: 1 → 2 → 3 → 4 → 5 → 6 → 7

Step-by-step with Queue:

Initial: Queue = [1]

Step 1: Process level 0
  Dequeue 1 → [1]
  Add children of 1: Queue = [2, 3]

Step 2: Process level 1 (all of it!)
  Dequeue 2 → [1, 2]
  Add children of 2: Queue = [3, 4, 5]

  Dequeue 3 → [1, 2, 3]
  Add children of 3: Queue = [4, 5, 6, 7]

Step 3: Process level 2 (all of it!)
  Dequeue 4 → [1, 2, 3, 4]
  No children

  Dequeue 5 → [1, 2, 3, 4, 5]
  No children

  Dequeue 6 → [1, 2, 3, 4, 5, 6]
  No children

  Dequeue 7 → [1, 2, 3, 4, 5, 6, 7]
  No children

Queue is empty, done!

KEY INSIGHT: We processed ALL nodes at each level before
moving to the next level!

Level 0: [1]
Level 1: [2, 3]
Level 2: [4, 5, 6, 7]
```

### The Queue Concept (FIFO - First In, First Out)

```
Think of a queue as a LINE at a coffee shop:
- First person in line is served first
- New customers join the back of the line

BFS Queue Evolution:

Start: [1]           → "1 is first in line"
       ↓
Serve 1, add kids:
       [2, 3]        → "1 served, 2 and 3 join back"
       ↓
Serve 2, add kids:
       [3, 4, 5]     → "2 served, 4 and 5 join back"
       ↓
Serve 3, add kids:
       [4, 5, 6, 7]  → "3 served, 6 and 7 join back"
       ↓
Serve 4 (no kids):
       [5, 6, 7]
       ↓
Serve 5, 6, 7...
       []            → "Queue empty, everyone served!"
```

---

## BFS vs DFS: The Critical Difference

### Visual Comparison

```
Tree:       1
          /   \
         2     3
        /     / \
       4     5   6

BFS (Level by Level):
Visit order: 1 → 2 → 3 → 4 → 5 → 6

"Explore ALL nodes at current distance before
going farther away"

Level 0: 1
Level 1: 2, 3
Level 2: 4, 5, 6

DFS (Deep First):
Visit order: 1 → 2 → 4 → (back) → 3 → 5 → 6

"Go as deep as possible in one branch, then
backtrack and try another"
```

### When to Use Which?

| Scenario | BFS | DFS | Why? |
|----------|-----|-----|------|
| Shortest path in unweighted graph | ✅ Yes | ❌ No | BFS finds closest first |
| Is there ANY path? | ❌ | ✅ Yes | DFS is faster, less memory |
| Find ALL paths | ❌ | ✅ Yes | DFS explores all possibilities |
| Minimum moves/steps | ✅ Yes | ❌ No | BFS guarantees minimum |
| Level-wise operations | ✅ Yes | ❌ | BFS processes by level |
| Tree is very wide | ❌ | ✅ Yes | DFS uses less memory |
| Tree is very deep | ✅ Yes | ❌ | BFS avoids stack overflow |
| Nodes at exact distance K | ✅ Yes | ❌ | BFS tracks distance naturally |

### Memory Comparison

```
Tree:           1
            /       \
           2         3
          / \       / \
         4   5     6   7
        /\   /\   /\   /\
       8 9 10 11 12 13 14 15

BFS Queue (level 3): [8, 9, 10, 11, 12, 13, 14, 15]
Memory: 8 nodes (width of last level)

DFS Stack (going deep): [1, 2, 4, 8]
Memory: 4 nodes (height of tree)

For this tree:
- BFS: O(8) = O(2^3) = O(width)
- DFS: O(4) = O(log n) = O(height)

Trade-off:
- Wide tree → DFS wins (less memory)
- Deep tree → BFS wins (avoids stack overflow)
- Need shortest path → BFS wins (always!)
```

---

## Example 1: Binary Tree Right Side View (JavaScript)

### Problem
Given the root of a binary tree, imagine yourself standing on the right side of it. Return the values of the nodes you can see ordered from top to bottom (rightmost node at each level).

**LeetCode**: [199. Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/)

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
 * Get right side view of binary tree using BFS
 * @param {TreeNode} root - Root of binary tree
 * @return {number[]} - Values visible from right side
 */
function rightSideView(root) {
    if (root === null) return [];

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const levelSize = queue.length;

        // Process all nodes at current level
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();

            // The last node at each level is visible from right
            if (i === levelSize - 1) {
                result.push(node.val);
            }

            // Add children for next level (left to right)
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }

    return result;
}

/**
 * Alternative: DFS approach with level tracking
 * @param {TreeNode} root
 * @return {number[]}
 */
function rightSideViewDFS(root) {
    const result = [];

    function dfs(node, level) {
        if (node === null) return;

        // First node we see at this level is the rightmost
        // (because we traverse right before left)
        if (level === result.length) {
            result.push(node.val);
        }

        // Visit right before left to get rightmost first
        dfs(node.right, level + 1);
        dfs(node.left, level + 1);
    }

    dfs(root, 0);
    return result;
}

// Helper function
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
//       1
//      / \
//     2   3
//      \   \
//       5   4
const root1 = createTree([1, 2, 3, null, 5, null, 4]);
console.log(rightSideView(root1));     // Output: [1, 3, 4]
console.log(rightSideViewDFS(root1));  // Output: [1, 3, 4]
// Explanation: From right side, you see 1, 3, 4

//     1
//    / \
//   2   3
const root2 = createTree([1, 2, 3]);
console.log(rightSideView(root2));     // Output: [1, 3]

const root3 = createTree([1]);
console.log(rightSideView(root3));     // Output: [1]
```

### Detailed Code Walkthrough: BFS Right Side View

```javascript
function rightSideView(root) {
    // STEP 1: Handle edge case
    if (root === null) return [];

    const result = [];   // Stores rightmost node at each level
    const queue = [root]; // BFS queue, start with root

    // STEP 2: Process level by level
    while (queue.length > 0) {
        // KEY INSIGHT: Capture level size BEFORE processing
        const levelSize = queue.length;
        // This tells us how many nodes are at current level

        // STEP 3: Process EXACTLY levelSize nodes (one level)
        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();  // FIFO: first node in queue

            // STEP 4: Is this the LAST node of the level?
            if (i === levelSize - 1) {
                result.push(node.val);  // YES! Add to result
                // Last node in level = rightmost visible node
            }

            // STEP 5: Add children for next level
            // (We process left to right, so rightmost is processed last)
            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
        // After loop: entire level processed, queue has next level
    }

    return result;
}
```

**Visual Trace:**

```
Tree:      1
         /   \
        2     3
         \     \
          5     4

Initial: queue = [1], result = []

--- Level 0 ---
levelSize = 1
  i=0: node = 1
    i (0) === levelSize-1 (0)? YES!
    result = [1]
    Add children: queue = [2, 3]

--- Level 1 ---
levelSize = 2
  i=0: node = 2
    i (0) === levelSize-1 (1)? NO
    Add children: queue = [3, 5]

  i=1: node = 3
    i (1) === levelSize-1 (1)? YES!
    result = [1, 3]
    Add children: queue = [5, 4]

--- Level 2 ---
levelSize = 2
  i=0: node = 5
    i (0) === levelSize-1 (1)? NO
    No children

  i=1: node = 4
    i (1) === levelSize-1 (1)? YES!
    result = [1, 3, 4]
    No children

queue = [], done!

Final: [1, 3, 4]
```

---

## Example 2: Rotting Oranges (Python) - Multi-Source BFS

### Problem
You are given an m x n grid where each cell can have one of three values:
- 0 representing an empty cell
- 1 representing a fresh orange
- 2 representing a rotten orange

Every minute, any fresh orange that is 4-directionally adjacent to a rotten orange becomes rotten. Return the minimum number of minutes that must elapse until no cell has a fresh orange. If impossible, return -1.

**LeetCode**: [994. Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)

### Solution

```python
from typing import List
from collections import deque

class Solution:
    def orangesRotting(self, grid: List[List[str]]) -> int:
        """
        Find minimum minutes for all oranges to rot using BFS

        Args:
            grid: m x n grid with 0 (empty), 1 (fresh), 2 (rotten)

        Returns:
            Minimum minutes, or -1 if impossible
        """
        rows, cols = len(grid), len(grid[0])
        queue = deque()
        fresh_count = 0

        # Step 1: Find all rotten oranges and count fresh ones
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] == 2:
                    queue.append((r, c, 0))  # (row, col, time)
                elif grid[r][c] == 1:
                    fresh_count += 1

        # Edge case: no fresh oranges
        if fresh_count == 0:
            return 0

        # Step 2: BFS from all rotten oranges simultaneously
        directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]  # right, down, left, up
        max_time = 0

        while queue:
            r, c, time = queue.popleft()
            max_time = max(max_time, time)

            # Check all 4 adjacent cells
            for dr, dc in directions:
                nr, nc = r + dr, c + dc

                # If adjacent cell is a fresh orange
                if (0 <= nr < rows and 0 <= nc < cols and
                    grid[nr][nc] == 1):
                    # Make it rotten
                    grid[nr][nc] = 2
                    fresh_count -= 1
                    # Add to queue with incremented time
                    queue.append((nr, nc, time + 1))

        # Step 3: Check if all fresh oranges became rotten
        return max_time if fresh_count == 0 else -1

# Example usage
solution = Solution()

# Example 1
grid1 = [
    [2, 1, 1],
    [1, 1, 0],
    [0, 1, 1]
]
print(solution.orangesRotting(grid1))  # Output: 4
# Explanation:
# Minute 0: [2,1,1],[1,1,0],[0,1,1]
# Minute 1: [2,2,1],[2,1,0],[0,1,1]
# Minute 2: [2,2,2],[2,2,0],[0,1,1]
# Minute 3: [2,2,2],[2,2,0],[0,2,1]
# Minute 4: [2,2,2],[2,2,0],[0,2,2]

# Example 2
grid2 = [
    [2, 1, 1],
    [0, 1, 1],
    [1, 0, 1]
]
print(solution.orangesRotting(grid2))  # Output: -1
# Explanation: Bottom left orange can never rot

# Example 3
grid3 = [[0, 2]]
print(solution.orangesRotting(grid3))  # Output: 0
# Explanation: No fresh oranges
```

### Detailed Explanation: Multi-Source BFS

**What is Multi-Source BFS?**

Instead of starting BFS from ONE source, we start from MULTIPLE sources simultaneously!

```
Think of it like multiple forest fires starting at the same time:

Fire 1:    Fire 2:
  F          F
```

Both fires spread outward at the same rate, as if they're one big fire!

**Why Multi-Source?**

In "Rotting Oranges", ALL rotten oranges rot their neighbors simultaneously. It's not one-by-one!

```python
def orangesRotting(self, grid: List[List[int]]) -> int:
    # PHASE 1: Setup - Find ALL starting points
    rows, cols = len(grid), len(grid[0])
    queue = deque()
    fresh_count = 0

    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == 2:
                # Found a rotten orange - it's a starting point!
                queue.append((r, c, 0))  # Start at time 0
            elif grid[r][c] == 1:
                fresh_count += 1  # Track fresh oranges

    # EDGE CASE: Already all rotten (or no oranges)
    if fresh_count == 0:
        return 0

    # PHASE 2: Multi-source BFS
    # Process all starting points (rotten oranges) level by level
    directions = [(0, 1), (1, 0), (0, -1), (-1, 0)]
    max_time = 0

    while queue:
        r, c, time = queue.popleft()  # Get next rotten orange
        max_time = max(max_time, time)  # Track highest time

        # Try to rot all 4 neighbors
        for dr, dc in directions:
            nr, nc = r + dr, c + dc

            # Is neighbor a fresh orange?
            if (0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 1):
                grid[nr][nc] = 2  # Rot it!
                fresh_count -= 1   # One less fresh orange
                queue.append((nr, nc, time + 1))  # Will rot ITS neighbors at time+1

    # PHASE 3: Verify all oranges are rotten
    return max_time if fresh_count == 0 else -1
```

### Visual Trace: Multi-Source BFS

```
Initial Grid:
2 1 1
1 1 0
0 1 1

Phase 1: Find starting points
  queue = [(0,0,0)]  ← Only one rotten orange
  fresh_count = 6

Minute 0: Process (0,0,0)
  Check (0,1): fresh! → rot it, add (0,1,1)
  Check (1,0): fresh! → rot it, add (1,0,1)

  Grid after minute 0:
  2 2 1
  2 1 0
  0 1 1

  queue = [(0,1,1), (1,0,1)]
  fresh_count = 4

Minute 1: Process (0,1,1) and (1,0,1)
  From (0,1): rot (0,2) → add (0,2,2)
  From (1,0): rot (1,1) → add (1,1,2)

  Grid after minute 1:
  2 2 2
  2 2 0
  0 1 1

  queue = [(0,2,2), (1,1,2)]
  fresh_count = 2

Minute 2: Process (0,2,2) and (1,1,2)
  From (0,2): no fresh neighbors
  From (1,1): rot (2,1) → add (2,1,3)

  Grid after minute 2:
  2 2 2
  2 2 0
  0 2 1

  queue = [(2,1,3)]
  fresh_count = 1

Minute 3: Process (2,1,3)
  From (2,1): rot (2,2) → add (2,2,4)

  Grid after minute 3:
  2 2 2
  2 2 0
  0 2 2

  queue = [(2,2,4)]
  fresh_count = 0

Minute 4: Process (2,2,4)
  From (2,2): no fresh neighbors

  queue = []
  fresh_count = 0

Result: max_time = 4, all oranges rotten ✓

Return: 4
```

**Key insight about Multi-Source BFS:**
- We add ALL starting points to queue at time 0
- They all spread simultaneously
- Each "wave" of rotting happens at the same time level

---

## Example 3: Shortest Path in Maze (Conceptual)

### The Problem

Find the shortest path from 'S' (start) to 'E' (end) in a maze:

```
Grid:
S . . #
# . # .
. . . E

S = Start, E = End, . = Open, # = Wall
```

### Why BFS is Perfect for This

```
BFS explores distance by distance:

Distance 0: [S]
Distance 1: [right of S]
Distance 2: [2 steps from S]
...

As soon as we reach E, we KNOW it's the shortest path!
```

### Visual Trace

```
Initial:
S . . #
# . # .
. . . E

Distance 0: Start at S
  Queue: [(0,0,0)]  (row, col, distance)

Distance 1: Explore neighbors of S
  Right (0,1): Open! → Queue: [(0,1,1)]

  S 1 . #
  # . # .
  . . . E

Distance 2: Explore neighbors of (0,1)
  Right (0,2): Open! → Queue: [(0,2,2)]

  S 1 2 #
  # . # .
  . . . E

Distance 3: Explore neighbors of (0,2)
  Down (1,2): Wall! Skip
  Right (0,3): Wall! Skip
  Back to (0,1), down (1,1): Open!

  S 1 2 #
  # 3 # .
  . . . E

Distance 4: Continue...
  S 1 2 #
  # 3 # .
  . 4 . E

Distance 5:
  S 1 2 #
  # 3 # .
  . 4 5 E

Distance 6:
  S 1 2 #
  # 3 # .
  . 4 5 6

Found E at distance 6! DONE!

This is GUARANTEED to be the shortest path!
```

---

## Time & Space Complexity

### Example 1: Right Side View
- **Time Complexity**: O(n) - Visit each node once
- **Space Complexity**: O(w) - Queue size (w = max width of tree)
  - For a complete binary tree, w = n/2 (last level)
  - For a skewed tree, w = 1

### Example 2: Rotting Oranges
- **Time Complexity**: O(m × n) - Visit each cell at most once
- **Space Complexity**: O(m × n) - Queue can contain all cells in worst case
  - Worst case: All cells are rotten oranges at start

### General BFS Complexity

**For Graphs:**
- **Time**: O(V + E) where V = vertices, E = edges
- **Space**: O(V) for the queue

**For Grids:**
- **Time**: O(rows × cols)
- **Space**: O(rows × cols)

---

## Common Variations

1. **Level Order Problems**
   - LeetCode: [102. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)
   - LeetCode: [199. Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/)
   - LeetCode: [637. Average of Levels in Binary Tree](https://leetcode.com/problems/average-of-levels-in-binary-tree/)
   - LeetCode: [515. Find Largest Value in Each Tree Row](https://leetcode.com/problems/find-largest-value-in-each-tree-row/)

2. **Shortest Path**
   - LeetCode: [111. Minimum Depth of Binary Tree](https://leetcode.com/problems/minimum-depth-of-binary-tree/)
   - LeetCode: [127. Word Ladder](https://leetcode.com/problems/word-ladder/)
   - LeetCode: [1091. Shortest Path in Binary Matrix](https://leetcode.com/problems/shortest-path-in-binary-matrix/)

3. **Grid BFS**
   - LeetCode: [994. Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)
   - LeetCode: [542. 01 Matrix](https://leetcode.com/problems/01-matrix/)
   - LeetCode: [1293. Shortest Path in a Grid with Obstacles Elimination](https://leetcode.com/problems/shortest-path-in-a-grid-with-obstacles-elimination/)

4. **Multi-source BFS**
   - LeetCode: [1162. As Far from Land as Possible](https://leetcode.com/problems/as-far-from-land-as-possible/)
   - LeetCode: [286. Walls and Gates](https://leetcode.com/problems/walls-and-gates/)

---

## Practice Problems

### Easy
1. [111. Minimum Depth of Binary Tree](https://leetcode.com/problems/minimum-depth-of-binary-tree/)
2. [993. Cousins in Binary Tree](https://leetcode.com/problems/cousins-in-binary-tree/)
3. [637. Average of Levels in Binary Tree](https://leetcode.com/problems/average-of-levels-in-binary-tree/)

### Medium
4. [102. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)
5. [199. Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/)
6. [994. Rotting Oranges](https://leetcode.com/problems/rotting-oranges/)
7. [542. 01 Matrix](https://leetcode.com/problems/01-matrix/)
8. [1091. Shortest Path in Binary Matrix](https://leetcode.com/problems/shortest-path-in-binary-matrix/)
9. [1162. As Far from Land as Possible](https://leetcode.com/problems/as-far-from-land-as-possible/)
10. [863. All Nodes Distance K in Binary Tree](https://leetcode.com/problems/all-nodes-distance-k-in-binary-tree/)

### Hard
11. [127. Word Ladder](https://leetcode.com/problems/word-ladder/)
12. [301. Remove Invalid Parentheses](https://leetcode.com/problems/remove-invalid-parentheses/)

---

## Common Pitfalls (Mistakes to Avoid)

### 1. Not Capturing Level Size Before Loop

**WRONG:**
```javascript
while (queue.length > 0) {
    // BUG: Using queue.length directly in loop condition!
    for (let i = 0; i < queue.length; i++) {
        const node = queue.shift();
        // Add children...
    }
}
```

**Problem:** `queue.length` changes as you add children, so the loop never terminates properly!

**RIGHT:**
```javascript
while (queue.length > 0) {
    const levelSize = queue.length;  // SNAPSHOT the size!

    for (let i = 0; i < levelSize; i++) {
        const node = queue.shift();
        // Add children...
    }
}
```

---

### 2. Forgetting to Mark Visited in Grid BFS

**WRONG:**
```python
def bfs(grid, start):
    queue = deque([start])

    while queue:
        r, c = queue.popleft()

        # BUG: Not marking as visited!
        # Will revisit same cell infinitely!

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if is_valid(nr, nc):
                queue.append((nr, nc))
```

**Problem:** You'll add the same cell to queue over and over!

**RIGHT:**
```python
def bfs(grid, start):
    queue = deque([start])
    visited = set([start])  # Or mark in grid

    while queue:
        r, c = queue.popleft()

        for dr, dc in directions:
            nr, nc = r + dr, c + dc
            if is_valid(nr, nc) and (nr, nc) not in visited:
                visited.add((nr, nc))  # Mark BEFORE adding to queue!
                queue.append((nr, nc))
```

**Key:** Mark visited WHEN YOU ADD to queue, not when you process!

---

### 3. Using Stack Instead of Queue

**WRONG (This is DFS, not BFS!):**
```javascript
const stack = [root];  // Stack (LIFO)

while (stack.length > 0) {
    const node = stack.pop();  // POP from end = DFS!
    // ...
}
```

**RIGHT:**
```javascript
const queue = [root];  // Queue (FIFO)

while (queue.length > 0) {
    const node = queue.shift();  // SHIFT from front = BFS!
    // ...
}
```

**Remember:**
- **Queue (FIFO)** = BFS (level by level)
- **Stack (LIFO)** = DFS (deep first)

---

### 4. Not Handling Empty Input

**WRONG:**
```javascript
function rightSideView(root) {
    const queue = [root];  // BUG: If root is null, queue = [null]!

    while (queue.length > 0) {
        // Will try to access null.left, null.right → ERROR!
    }
}
```

**RIGHT:**
```javascript
function rightSideView(root) {
    if (root === null) return [];  // Check FIRST!

    const queue = [root];
    // Now we know root is valid
}
```

---

### 5. Multi-Source BFS: Adding Sources One by One

**WRONG:**
```python
# BUG: Adding rotten oranges one at a time!
for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 2:
            queue.append((r, c, 0))
            # Process this orange immediately → WRONG!
            bfs(queue, ...)  # This processes them sequentially, not simultaneously!
```

**RIGHT:**
```python
# Add ALL sources first, THEN start BFS
queue = deque()

for r in range(rows):
    for c in range(cols):
        if grid[r][c] == 2:
            queue.append((r, c, 0))  # Just add, don't process yet

# NOW start BFS with all sources
while queue:
    # All sources spread simultaneously!
```

---

## Frequently Asked Questions (FAQ)

### Q1: Why does BFS guarantee the shortest path?

**Answer:**

BFS explores nodes in order of increasing distance from the source:

```
Distance 0: [Start]
Distance 1: [All nodes 1 step away]
Distance 2: [All nodes 2 steps away]
Distance 3: [All nodes 3 steps away]
...

When we first reach the target, we KNOW it's at the minimum distance!
```

**Example:**
```
Graph:  S → A → B → T
        ↓       ↓
        C ------→ D → T

BFS from S:
  Distance 0: S
  Distance 1: A, C
  Distance 2: B, D
  Distance 3: T (from B)

First time we reach T is at distance 3 → Shortest path!

DFS might find: S → C → D → T (distance 3) or S → A → B → T (distance 3)
But it might explore the long path first, then backtrack
BFS ALWAYS finds shortest first!
```

---

### Q2: When should I use BFS instead of DFS?

**Answer:**

**Use BFS when:**
1. Finding SHORTEST path (unweighted graph)
2. "Minimum moves/steps" problems
3. "Nearest/closest" problems
4. Processing level by level
5. Tree is very deep (avoid recursion stack overflow)

**Use DFS when:**
1. Finding ANY path (not necessarily shortest)
2. Exploring ALL possible paths
3. Tree/graph is very wide (BFS would use too much memory)
4. Backtracking problems
5. Checking connectivity

**Example Questions:**

| Question | Use BFS or DFS? |
|----------|-----------------|
| "What's the shortest path from A to B?" | BFS |
| "Is there ANY path from A to B?" | DFS (faster) |
| "Find ALL paths from A to B" | DFS |
| "Minimum steps to reach target" | BFS |
| "Solve a maze (any solution)" | DFS |
| "Solve a maze (shortest path)" | BFS |

---

### Q3: How do I track the actual path in BFS, not just the distance?

**Answer:**

**Approach 1: Store parent pointers**

```javascript
function shortestPath(graph, start, end) {
    const queue = [start];
    const visited = new Set([start]);
    const parent = new Map();  // Track where we came from

    parent.set(start, null);

    while (queue.length > 0) {
        const node = queue.shift();

        if (node === end) {
            // Reconstruct path by following parent pointers
            const path = [];
            let current = end;

            while (current !== null) {
                path.unshift(current);
                current = parent.get(current);
            }

            return path;
        }

        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                parent.set(neighbor, node);  // Remember where we came from!
                queue.push(neighbor);
            }
        }
    }

    return null;  // No path found
}
```

**Approach 2: Store path with each node**

```javascript
function shortestPath(grid, start, end) {
    const queue = [[start, [start]]];  // [position, path_to_position]
    const visited = new Set([start]);

    while (queue.length > 0) {
        const [current, path] = queue.shift();

        if (current === end) {
            return path;  // Found it!
        }

        for (const neighbor of getNeighbors(current)) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, [...path, neighbor]]);
                // Append neighbor to current path
            }
        }
    }

    return null;
}
```

**Trade-off:**
- Approach 1: Less memory (stores one parent per node)
- Approach 2: More memory (stores entire path), but path is readily available

---

### Q4: What is Multi-Source BFS and when do I use it?

**Answer:**

**Multi-Source BFS** starts BFS from MULTIPLE sources simultaneously instead of one.

**When to use:**
- Multiple starting points that spread/process at the same rate
- "Nearest X from any Y" problems
- Spreading processes (fire, disease, etc.)

**Examples:**
1. **Rotting Oranges:** All rotten oranges rot neighbors simultaneously
2. **Walls and Gates:** Find distance to NEAREST gate from each room
3. **Forest Fire:** Multiple fires spreading at once

**How it works:**
```python
# Normal BFS (single source)
queue = [start]

# Multi-source BFS (multiple sources)
queue = [source1, source2, source3, ...]  # Add ALL sources at start

# Then run normal BFS!
# All sources spread "together" level by level
```

**Visual:**
```
Multi-source BFS:
  S1  .  S2    ← Two sources
  .   .  .
  .   .  .

Minute 1:
  S1  1  S2    ← Both spread
  1   .  1
  .   .  .

Minute 2:
  S1  1  S2
  1   2  1     ← Continue spreading simultaneously
  2   .  2
```

---

### Q5: Can I do BFS recursively?

**Answer:** **Technically yes, but it's very awkward and NOT recommended.**

BFS is naturally iterative (uses queue). Recursion is natural for DFS (uses stack/call stack).

**Awkward recursive BFS:**
```javascript
function bfs(queue, visited, result) {
    if (queue.length === 0) return;  // Base case

    const node = queue.shift();
    result.push(node.val);

    // Add children
    if (node.left && !visited.has(node.left)) {
        visited.add(node.left);
        queue.push(node.left);
    }
    if (node.right && !visited.has(node.right)) {
        visited.add(node.right);
        queue.push(node.right);
    }

    bfs(queue, visited, result);  // Recurse
}
```

**Why it's awkward:**
- No benefit over iterative
- Wastes stack space
- Harder to read

**Recommendation:** Always use iterative BFS with a queue. It's cleaner and more efficient!

---

### Q6: How do I handle visited tracking in grid BFS?

**Answer:**

**Option 1: Modify the grid**
```python
grid[r][c] = -1  # Mark as visited
```
Pros: No extra space
Cons: Destroys original grid

**Option 2: Separate visited set**
```python
visited = set()
visited.add((r, c))
```
Pros: Preserves grid
Cons: O(m×n) extra space

**Option 3: Mark when adding to queue (not when processing!)**
```python
# GOOD: Mark when adding
if (nr, nc) not in visited:
    visited.add((nr, nc))  # Mark NOW!
    queue.append((nr, nc))

# BAD: Mark when processing
(r, c) = queue.popleft()
visited.add((r, c))  # Too late! Might have been added multiple times
```

**Why mark when adding?**
- Prevents adding same cell multiple times to queue
- More efficient (avoids duplicate processing)

---

### Q7: What's the difference between BFS in trees vs graphs?

**Answer:**

**Trees:**
- No cycles (can't revisit parent)
- Don't need visited tracking
- Can go left/right without worrying about loops

```javascript
// Tree BFS - no visited needed
while (queue.length > 0) {
    const node = queue.shift();
    if (node.left) queue.push(node.left);
    if (node.right) queue.push(node.right);
}
```

**Graphs:**
- Have cycles (can revisit nodes)
- MUST track visited to avoid infinite loops
- Need to check before adding neighbors

```javascript
// Graph BFS - visited required!
const visited = new Set([start]);

while (queue.length > 0) {
    const node = queue.shift();

    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            visited.add(neighbor);  // Critical!
            queue.push(neighbor);
        }
    }
}
```

---

## Pro Tips for Interviews

### Tip 1: Mention the Shortest Path Guarantee

```
Interviewer: "Find the path from A to B"

You: "Do we need the SHORTEST path, or just ANY path?
- If shortest: I'll use BFS (guaranteed shortest in unweighted graph)
- If any: I could use DFS (faster, uses less memory)"
```

This shows you understand the trade-offs!

---

### Tip 2: Explain the Queue (FIFO) Concept

When coding BFS:

```javascript
const queue = [root];  // You say: "Using queue for level-by-level traversal"

while (queue.length > 0) {
    const node = queue.shift();  // You say: "Shift removes from front (FIFO)"
    // ...
    queue.push(child);  // You say: "Push adds to back, so children process after current level"
}
```

Explaining FIFO shows you understand why BFS works!

---

### Tip 3: Always Capture Level Size

```javascript
while (queue.length > 0) {
    const levelSize = queue.length;  // You say: "Snapshot the level size"

    // You say: "This loop processes exactly ONE level"
    for (let i = 0; i < levelSize; i++) {
        // ...
    }
    // You say: "After this loop, queue contains only next level"
}
```

---

### Tip 4: Visualize with a Simple Example

Draw on the whiteboard:

```
"Let me trace through a simple example..."

Tree:   1
       / \
      2   3

Queue evolution:
[1]       → Process 1
[2, 3]    → Process 2, then 3
[]        → Done!

Level 0: [1]
Level 1: [2, 3]
```

Interviewers love seeing you visualize!

---

### Tip 5: Mention Multi-Source BFS for Grid Problems

```
You: "This is a multi-source BFS problem since we have multiple
starting points (rotten oranges). I'll add ALL rotten oranges
to the queue initially, so they spread simultaneously."
```

---

### Tip 6: Explain Visited Tracking

```
You: "For grids, I'll use a visited set to avoid revisiting cells.
I'll mark cells as visited WHEN I ADD them to the queue, not when
I process them, to avoid adding duplicates."
```

---

### Tip 7: Know the Complexity

Be ready to discuss:

```
Interviewer: "What's the space complexity?"

You: "BFS uses O(w) space where w is the maximum width.
- For a complete binary tree, that's O(n/2) ≈ O(n) at the last level
- For a skewed tree, it's O(1)
- For grids, worst case is O(rows × cols) if all cells are in queue

DFS would use O(h) space where h is height, which could be better
for wide graphs but worse for deep graphs."
```

---

## Pattern Recognition Guide

### When to Think "BFS"?

#### Definite Signals:
1. "Shortest path" → 99% BFS (if unweighted)
2. "Minimum steps/moves" → BFS
3. "Level order" → BFS
4. "Nearest" or "closest" → BFS
5. "Distance K" → BFS

#### Strong Hints:
1. Grid problems with spreading (fire, disease, etc.) → BFS
2. "Right side view" or "level-wise" → BFS
3. "Minimum depth" → BFS
4. "All nodes at distance X" → BFS
5. Multiple sources spreading simultaneously → Multi-source BFS

#### Problem Patterns:

**Pattern 1: Shortest Path**
```
Problem: "Find shortest path in unweighted graph"
Solution: Standard BFS
```

**Pattern 2: Level-Wise Processing**
```
Problem: "Find rightmost node at each level"
Solution: BFS, track level size
```

**Pattern 3: Multi-Source Spreading**
```
Problem: "Multiple fires spreading simultaneously"
Solution: Multi-source BFS (add all sources to queue first)
```

**Pattern 4: Minimum Distance**
```
Problem: "Find minimum steps to reach target"
Solution: BFS with distance tracking
```

---

## Key Takeaways

### Core Concepts
1. **Level by level**: BFS explores all nodes at distance D before distance D+1
2. **Queue (FIFO)**: Essential data structure for BFS
3. **Shortest path guarantee**: In unweighted graphs, BFS finds shortest path
4. **Space vs DFS**: O(w) width vs DFS's O(h) height

### Implementation Patterns
5. **Capture level size**: `levelSize = queue.length` before loop
6. **Mark visited early**: When adding to queue, not when processing
7. **Multi-source**: Add all sources to queue before starting BFS
8. **Track distance**: Include distance/time in queue items when needed

### Common Applications
9. **Level order traversal**: Process tree level by level
10. **Shortest path**: Unweighted graphs, grids, mazes
11. **Spreading simulation**: Disease, fire, rotting
12. **Nearest neighbor**: Find closest target from any source

### Interview Tips
13. **Compare with DFS**: Always know when to use which
14. **Visualize**: Draw the queue evolution
15. **Explain FIFO**: Show why queue order matters
16. **Handle edge cases**: Empty input, no path exists

### Performance
17. **Time**: O(V + E) for graphs, O(m×n) for grids
18. **Space**: O(w) where w is maximum width
19. **Better than DFS for**: Shortest path, wide graphs
20. **Worse than DFS for**: Deep graphs, memory constrained

---

## Beginner's Quick Reference

### BFS Template

**For Trees (Level Order):**
```javascript
function bfs(root) {
    if (!root) return [];

    const queue = [root];
    const result = [];

    while (queue.length > 0) {
        const levelSize = queue.length;

        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();  // FIFO!
            result.push(node.val);

            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }

    return result;
}
```

**For Grids (Shortest Path):**
```python
from collections import deque

def bfs(grid, start, end):
    queue = deque([start])
    visited = set([start])

    while queue:
        r, c = queue.popleft()  # FIFO!

        if (r, c) == end:
            return True  # Found!

        for dr, dc in [(0,1), (1,0), (0,-1), (-1,0)]:
            nr, nc = r + dr, c + dc

            if is_valid(nr, nc) and (nr, nc) not in visited:
                visited.add((nr, nc))  # Mark when adding!
                queue.append((nr, nc))

    return False
```

### Mental Model (Simple!)

**BFS = "Ripples in water"**

Think of it as:
- 🌊 Waves spreading outward from a stone splash
- 🏢 Searching floor by floor in a building
- 🔥 Fire spreading outward from a starting point
- 👥 Spreading news to friends (each person tells their friends, who tell their friends...)

### Common Mistakes Checklist

Before submitting BFS solution:
- [ ] Used queue (shift from front), not stack (pop from back)
- [ ] Captured `levelSize = queue.length` before inner loop
- [ ] Marked visited when ADDING to queue, not when processing
- [ ] Handled empty input (null root, empty grid)
- [ ] For grids: checked bounds before adding to queue
- [ ] For multi-source: added ALL sources before starting BFS

---

## Final Thoughts for Beginners

BFS is like exploring a building floor by floor - you check everything on floor 1 before going to floor 2. This natural "level by level" exploration makes it perfect for finding the shortest path!

**Start here:**
1. Master basic tree level-order traversal
2. Understand why queue (FIFO) is essential
3. Practice shortest path in grids
4. Learn multi-source BFS
5. Combine with distance tracking

**Remember:** BFS = **Breadth** (wide) first, not **Depth** (deep) first. If you find yourself going deep into one branch, that's DFS, not BFS!

The magic of BFS is that it GUARANTEES the shortest path in unweighted graphs. When you hear "shortest" or "minimum", think BFS!

Happy coding!

---

[← Previous: Depth-First Search](./12-depth-first-search.md) | [Back to Index](./README.md) | [Next: Backtracking →](./14-backtracking.md)
