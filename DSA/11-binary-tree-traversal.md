# Binary Tree Traversal Pattern

## What is Binary Tree Traversal? (In Simple Words)

Imagine you're a **tour guide** leading a group through a **family tree museum** with portraits hanging on the walls. The museum has rooms connected in a tree-like structure. The question is: **In what order do you visit the rooms to see all the portraits?**

**Binary Tree Traversal** is simply the process of visiting every node (room) in a tree exactly once, in a specific order. There are different "tour routes" you can take:

1. **Inorder** (Left room → Current room → Right room)
2. **Preorder** (Current room → Left room → Right room)
3. **Postorder** (Left room → Right room → Current room)
4. **Level-order** (Visit all rooms floor by floor)

### Real-World Analogy: Reading a Book

Think of a tree structure like a **table of contents** in a book:

```
Book: "Programming Guide"
│
├── Chapter 1: Basics
│   ├── Section 1.1: Variables
│   └── Section 1.2: Functions
│
└── Chapter 2: Advanced
    ├── Section 2.1: Algorithms
    └── Section 2.2: Data Structures
```

**Different reading orders:**

- **Preorder** (Root → Left → Right): Read chapter titles FIRST, then sections
  - Result: Book, Ch1, 1.1, 1.2, Ch2, 2.1, 2.2
  - Like reading the table of contents top-to-bottom

- **Inorder** (Left → Root → Right): Read left sections, then chapter, then right sections
  - Result: 1.1, Ch1, 1.2, Book, 2.1, Ch2, 2.2
  - Like alphabetical order for some trees

- **Postorder** (Left → Right → Root): Read all sections FIRST, then chapter titles
  - Result: 1.1, 1.2, Ch1, 2.1, 2.2, Ch2, Book
  - Like reading bottom-up

- **Level-order**: Read all chapter titles first, then all sections
  - Result: Book | Ch1, Ch2 | 1.1, 1.2, 2.1, 2.2
  - Like reading the table of contents level by level

---

## Pattern Overview

**Binary Tree Traversal** involves visiting all nodes in a binary tree in a specific order. There are four main traversal types: Inorder, Preorder, Postorder (all DFS-based), and Level-order (BFS-based).

### When to Use
- Processing all nodes in a tree
- Serializing/deserializing trees
- Finding paths or validating tree properties
- Converting tree to array representation
- Tree reconstruction problems

### Key Characteristics
- **Inorder** (Left → Root → Right): Gives sorted order for BST
- **Preorder** (Root → Left → Right): Root processed first, useful for copying trees
- **Postorder** (Left → Right → Root): Children before parent, useful for deletion
- **Level-order** (BFS): Level by level, left to right

### Pattern Identification
Look for this pattern when you see:
- "Traverse a binary tree"
- "Inorder/Preorder/Postorder traversal"
- "Level order traversal"
- "Serialize/deserialize tree"
- "Convert BST to sorted array"

---

## Understanding the Four Traversal Types (Visual Guide)

### The Sample Tree We'll Use

```
        4
      /   \
     2     6
    / \   / \
   1   3 5   7
```

### 1. Inorder Traversal (Left → Root → Right)

**Think of it as:** Reading a book from left to right, smallest to largest

```
Process Order:
Step 1: Go all the way LEFT first
        4
      /
     2
    /
   1   ← START HERE (leftmost)

Step 2: Process node 1
   [1]

Step 3: Go back UP to parent (2), process it
        4
      /
    [2]
    / \
   1   3

Step 4: Go RIGHT from 2 to 3, process it
   [1, 2, 3]

Step 5: Go back UP to root (4), process it
   [1, 2, 3, 4]

Step 6: Go RIGHT to 6's left subtree
        4
          \
           6
          /
         5   ← Process 5
   [1, 2, 3, 4, 5]

Step 7: Process 6
   [1, 2, 3, 4, 5, 6]

Step 8: Go RIGHT to 7, process it
   [1, 2, 3, 4, 5, 6, 7]

FINAL: [1, 2, 3, 4, 5, 6, 7] ← Notice it's SORTED!
```

**Memory Trick:** For Binary Search Trees (BST), Inorder = Sorted Order

---

### 2. Preorder Traversal (Root → Left → Right)

**Think of it as:** Processing the root BEFORE exploring children (like copying a tree structure)

```
Process Order:
        4  ← START: Process root FIRST
      /   \
     2     6
    / \   / \
   1   3 5   7

Step 1: Process root → [4]

Step 2: Go LEFT to 2, process it → [4, 2]
        4
      /
     2  ← Process before its children
    / \
   1   3

Step 3: Go LEFT to 1, process it → [4, 2, 1]

Step 4: Go back UP, go RIGHT to 3, process it → [4, 2, 1, 3]

Step 5: Back to root, go RIGHT to 6, process it → [4, 2, 1, 3, 6]

Step 6: From 6, go LEFT to 5 → [4, 2, 1, 3, 6, 5]

Step 7: From 6, go RIGHT to 7 → [4, 2, 1, 3, 6, 5, 7]

FINAL: [4, 2, 1, 3, 6, 5, 7]
```

**Use Case:** Creating a copy of a tree (process parent before children)

---

### 3. Postorder Traversal (Left → Right → Root)

**Think of it as:** Process children BEFORE parent (like calculating folder sizes - need file sizes first)

```
Process Order:
Step 1: Go all the way LEFT to 1 (it's a leaf, process it)
        4
      /
     2
    /
   1  ← START: Leftmost leaf

   Result: [1]

Step 2: Go back UP to 2, check RIGHT child (3)
        4
      /
     2
    / \
   1   3  ← Process 3

   Result: [1, 3]

Step 3: NOW process 2 (both children done)
   Result: [1, 3, 2]

Step 4: Back to root (4), go RIGHT to 6
        4
          \
           6
          /
         5  ← Process 5

   Result: [1, 3, 2, 5]

Step 5: Process 7 (right child of 6)
   Result: [1, 3, 2, 5, 7]

Step 6: Process 6 (both children done)
   Result: [1, 3, 2, 5, 7, 6]

Step 7: FINALLY process root 4 (everything else done)
   Result: [1, 3, 2, 5, 7, 6, 4]

FINAL: [1, 3, 2, 5, 7, 6, 4]
```

**Use Case:** Deleting a tree (delete children before parent) or calculating subtree sizes

---

### 4. Level-order Traversal (Level by Level, Left to Right)

**Think of it as:** Reading a family tree generation by generation

```
Tree:     4
        /   \
       2     6
      / \   / \
     1   3 5   7

Level 0: [4]
         ↓
Queue: [4]
Process 4, add its children (2, 6)

Level 1: [2, 6]
         ↓
Queue: [2, 6]
Process 2, add children (1, 3)
Process 6, add children (5, 7)

Level 2: [1, 3, 5, 7]
         ↓
Queue: [1, 3, 5, 7]
Process all (leaf nodes, no children)

FINAL: [[4], [2, 6], [1, 3, 5, 7]]
Or flat: [4, 2, 6, 1, 3, 5, 7]
```

**Use Case:** Finding shortest path, level-wise processing, finding nodes at distance K

---

## Comparison Table: When to Use Which Traversal?

| Traversal | Order | Best For | Output Example | Memory Trick |
|-----------|-------|----------|----------------|--------------|
| **Inorder** | L→R→R | Getting sorted values from BST | [1,2,3,4,5,6,7] | "In order" = sorted order |
| **Preorder** | R→L→R | Copying tree structure, prefix notation | [4,2,1,3,6,5,7] | "Pre" = root before kids |
| **Postorder** | L→R→R | Deleting tree, postfix notation, calculating sizes | [1,3,2,5,7,6,4] | "Post" = root after kids |
| **Level-order** | Level by level | Shortest path, BFS problems, level-wise processing | [[4],[2,6],[1,3,5,7]] | "Level" = floor by floor |

---

## Example 1: Binary Tree Inorder Traversal (JavaScript)

### Problem
Given the root of a binary tree, return the inorder traversal of its nodes' values (Left → Root → Right).

**LeetCode**: [94. Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)

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
 * Inorder traversal - Recursive approach
 * @param {TreeNode} root - Root of binary tree
 * @return {number[]} - Inorder traversal values
 */
function inorderTraversal(root) {
    const result = [];

    function traverse(node) {
        if (node === null) return;

        // Left → Root → Right
        traverse(node.left);      // Visit left subtree
        result.push(node.val);    // Process current node
        traverse(node.right);     // Visit right subtree
    }

    traverse(root);
    return result;
}

/**
 * Inorder traversal - Iterative approach using stack
 * @param {TreeNode} root
 * @return {number[]}
 */
function inorderTraversalIterative(root) {
    const result = [];
    const stack = [];
    let current = root;

    while (current !== null || stack.length > 0) {
        // Go to leftmost node
        while (current !== null) {
            stack.push(current);
            current = current.left;
        }

        // Current is null, pop from stack
        current = stack.pop();
        result.push(current.val);    // Process node

        // Move to right subtree
        current = current.right;
    }

    return result;
}

// Helper function to create tree from array (level-order)
function createTree(arr) {
    if (!arr.length) return null;

    const root = new TreeNode(arr[0]);
    const queue = [root];
    let i = 1;

    while (queue.length && i < arr.length) {
        const node = queue.shift();

        if (i < arr.length && arr[i] !== null) {
            node.left = new TreeNode(arr[i]);
            queue.push(node.left);
        }
        i++;

        if (i < arr.length && arr[i] !== null) {
            node.right = new TreeNode(arr[i]);
            queue.push(node.right);
        }
        i++;
    }

    return root;
}

// Example usage
// Tree:     1
//            \
//             2
//            /
//           3
const root1 = createTree([1, null, 2, 3]);
console.log(inorderTraversal(root1));           // Output: [1, 3, 2]
console.log(inorderTraversalIterative(root1));  // Output: [1, 3, 2]

// Tree:       4
//           /   \
//          2     6
//         / \   / \
//        1   3 5   7
const root2 = createTree([4, 2, 6, 1, 3, 5, 7]);
console.log(inorderTraversal(root2));           // Output: [1, 2, 3, 4, 5, 6, 7]
// Note: For BST, inorder gives sorted order!
```

### Detailed Code Walkthrough: Recursive Inorder

Let's trace through the recursive approach step by step:

```javascript
function inorderTraversal(root) {
    const result = [];  // This array will collect all node values

    function traverse(node) {
        // BASE CASE: If node is null, we've reached the end of a branch
        if (node === null) return;

        // STEP 1: Explore LEFT subtree first
        traverse(node.left);
        // Think: "Go as far left as possible"

        // STEP 2: Process CURRENT node (only after left is done!)
        result.push(node.val);
        // Think: "Process myself AFTER all my left descendants"

        // STEP 3: Explore RIGHT subtree last
        traverse(node.right);
        // Think: "Now explore my right side"
    }

    traverse(root);
    return result;
}
```

**Call Stack Visualization for tree [1, null, 2, 3]:**

```
Tree:     1
           \
            2
           /
          3

Call Stack Evolution:

1. traverse(1)
   ├─ traverse(null) ← left child, returns immediately
   ├─ push(1) ← result = [1]
   └─ traverse(2)
       ├─ traverse(3)
       │   ├─ traverse(null) ← left, returns
       │   ├─ push(3) ← result = [1, 3]
       │   └─ traverse(null) ← right, returns
       ├─ push(2) ← result = [1, 3, 2]
       └─ traverse(null) ← right, returns

Final result: [1, 3, 2]
```

### Detailed Code Walkthrough: Iterative Inorder

The iterative version uses a **stack** to simulate the recursion:

```javascript
function inorderTraversalIterative(root) {
    const result = [];
    const stack = [];      // Simulates call stack
    let current = root;

    // Keep going while there are nodes to process
    while (current !== null || stack.length > 0) {

        // PHASE 1: Go to leftmost node
        // Push all left nodes onto stack
        while (current !== null) {
            stack.push(current);     // Save current node
            current = current.left;  // Move left
        }
        // When this loop ends, current is null (found leftmost)

        // PHASE 2: Process node from stack
        current = stack.pop();        // Get the leftmost unprocessed node
        result.push(current.val);     // Process it

        // PHASE 3: Move to right subtree
        current = current.right;      // Explore right side
        // If right is null, outer loop will pop from stack
        // If right exists, inner loop will go left from there
    }

    return result;
}
```

**Step-by-Step for tree [4, 2, 6, 1, 3, 5, 7]:**

```
        4
      /   \
     2     6
    / \   / \
   1   3 5   7

Initial: current = 4, stack = [], result = []

--- Iteration 1 ---
Inner loop: Push 4, 2, 1 (going left)
  current = 4 → push 4, go left
  current = 2 → push 2, go left
  current = 1 → push 1, go left
  current = null → exit inner loop

stack = [4, 2, 1], current = null

Pop 1, process it:
  current = 1, result = [1]
  current = 1.right = null

stack = [4, 2], current = null

--- Iteration 2 ---
Inner loop: current is null, skip

Pop 2, process it:
  current = 2, result = [1, 2]
  current = 2.right = 3

stack = [4], current = 3

--- Iteration 3 ---
Inner loop: Push 3 (going left)
  current = 3 → push 3, go left
  current = null → exit

stack = [4, 3], current = null

Pop 3, process it:
  current = 3, result = [1, 2, 3]
  current = 3.right = null

stack = [4], current = null

--- Iteration 4 ---
Pop 4, process it:
  current = 4, result = [1, 2, 3, 4]
  current = 4.right = 6

stack = [], current = 6

--- Iteration 5 ---
Inner loop: Push 6, 5 (going left)
  current = 6 → push 6, go left
  current = 5 → push 5, go left
  current = null → exit

stack = [6, 5], current = null

Pop 5, process it:
  current = 5, result = [1, 2, 3, 4, 5]
  current = 5.right = null

stack = [6], current = null

--- Iteration 6 ---
Pop 6, process it:
  current = 6, result = [1, 2, 3, 4, 5, 6]
  current = 6.right = 7

stack = [], current = 7

--- Iteration 7 ---
Inner loop: Push 7
  current = 7 → push 7, go left
  current = null → exit

stack = [7], current = null

Pop 7, process it:
  current = 7, result = [1, 2, 3, 4, 5, 6, 7]
  current = 7.right = null

stack = [], current = null

Loop ends (stack empty, current null)
FINAL: [1, 2, 3, 4, 5, 6, 7]
```

---

## Example 2: Preorder and Postorder Traversals (JavaScript)

### Preorder Traversal (Root → Left → Right)

```javascript
/**
 * Preorder traversal - Recursive
 * @param {TreeNode} root
 * @return {number[]}
 */
function preorderTraversal(root) {
    const result = [];

    function traverse(node) {
        if (node === null) return;

        // Root → Left → Right
        result.push(node.val);     // Process root FIRST
        traverse(node.left);       // Then left
        traverse(node.right);      // Then right
    }

    traverse(root);
    return result;
}

/**
 * Preorder traversal - Iterative using stack
 * @param {TreeNode} root
 * @return {number[]}
 */
function preorderTraversalIterative(root) {
    if (root === null) return [];

    const result = [];
    const stack = [root];

    while (stack.length > 0) {
        const node = stack.pop();
        result.push(node.val);     // Process node immediately

        // Push right first, then left (stack is LIFO)
        // So left will be popped first
        if (node.right) stack.push(node.right);
        if (node.left) stack.push(node.left);
    }

    return result;
}

// Example
const tree = createTree([4, 2, 6, 1, 3, 5, 7]);
console.log(preorderTraversal(tree));  // Output: [4, 2, 1, 3, 6, 5, 7]
```

**Why push right before left?** Stack is LIFO (Last In, First Out), so:
- Push right (goes to bottom)
- Push left (goes to top)
- Pop left (processed first) ✓

---

### Postorder Traversal (Left → Right → Root)

```javascript
/**
 * Postorder traversal - Recursive
 * @param {TreeNode} root
 * @return {number[]}
 */
function postorderTraversal(root) {
    const result = [];

    function traverse(node) {
        if (node === null) return;

        // Left → Right → Root
        traverse(node.left);       // Left first
        traverse(node.right);      // Right second
        result.push(node.val);     // Process root LAST
    }

    traverse(root);
    return result;
}

/**
 * Postorder traversal - Iterative using two stacks
 * @param {TreeNode} root
 * @return {number[]}
 */
function postorderTraversalIterative(root) {
    if (root === null) return [];

    const result = [];
    const stack1 = [root];
    const stack2 = [];

    // Stack1: Process in reverse postorder
    while (stack1.length > 0) {
        const node = stack1.pop();
        stack2.push(node);

        // Push left first, then right
        if (node.left) stack1.push(node.left);
        if (node.right) stack1.push(node.right);
    }

    // Stack2 has nodes in reverse postorder
    // Pop to get postorder
    while (stack2.length > 0) {
        result.push(stack2.pop().val);
    }

    return result;
}

// Example
const tree = createTree([4, 2, 6, 1, 3, 5, 7]);
console.log(postorderTraversal(tree));  // Output: [1, 3, 2, 5, 7, 6, 4]
```

**Two-stack trick explanation:**
- Stack1 produces: Root → Right → Left (reverse postorder)
- Stack2 reverses it: Left → Right → Root (postorder)

---

## Example 3: Binary Tree Level Order Traversal (Python)

### Problem
Given the root of a binary tree, return the level order traversal of its nodes' values (from left to right, level by level).

**LeetCode**: [102. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)

### Solution

```python
from typing import Optional, List
from collections import deque

class TreeNode:
    """Definition for a binary tree node"""
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
        """
        Level order traversal using BFS with queue

        Args:
            root: Root of binary tree

        Returns:
            List of lists, each containing nodes at that level
        """
        if not root:
            return []

        result = []
        queue = deque([root])

        while queue:
            level_size = len(queue)  # Number of nodes at current level
            current_level = []

            # Process all nodes at current level
            for _ in range(level_size):
                node = queue.popleft()
                current_level.append(node.val)

                # Add children to queue for next level
                if node.left:
                    queue.append(node.left)
                if node.right:
                    queue.append(node.right)

            result.append(current_level)

        return result

    def levelOrderRecursive(self, root: Optional[TreeNode]) -> List[List[int]]:
        """
        Alternative: Recursive DFS approach with level tracking
        """
        result = []

        def dfs(node, level):
            if not node:
                return

            # Create new level list if this is first node at this level
            if level == len(result):
                result.append([])

            # Add current node to its level
            result[level].append(node.val)

            # Recursively process children at next level
            dfs(node.left, level + 1)
            dfs(node.right, level + 1)

        dfs(root, 0)
        return result

# Helper function to create tree
def create_tree(values):
    """Create binary tree from level-order list"""
    if not values:
        return None

    root = TreeNode(values[0])
    queue = deque([root])
    i = 1

    while queue and i < len(values):
        node = queue.popleft()

        if i < len(values) and values[i] is not None:
            node.left = TreeNode(values[i])
            queue.append(node.left)
        i += 1

        if i < len(values) and values[i] is not None:
            node.right = TreeNode(values[i])
            queue.append(node.right)
        i += 1

    return root

# Example usage
solution = Solution()

# Example 1
#     3
#    / \
#   9  20
#     /  \
#    15   7
root1 = create_tree([3, 9, 20, None, None, 15, 7])
print(solution.levelOrder(root1))
# Output: [[3], [9, 20], [15, 7]]

# Example 2
root2 = create_tree([1])
print(solution.levelOrder(root2))
# Output: [[1]]

# Example 3
root3 = create_tree([])
print(solution.levelOrder(root3))
# Output: []

# Example 4 - Using recursive approach
#       1
#      / \
#     2   3
#    / \
#   4   5
root4 = create_tree([1, 2, 3, 4, 5])
print(solution.levelOrderRecursive(root4))
# Output: [[1], [2, 3], [4, 5]]
```

### Detailed Code Walkthrough: Level Order (BFS)

```python
def levelOrder(self, root: Optional[TreeNode]) -> List[List[int]]:
    # STEP 1: Handle edge case
    if not root:
        return []

    result = []           # Final result: list of levels
    queue = deque([root]) # Queue for BFS (start with root)

    # STEP 2: Process level by level
    while queue:
        # KEY INSIGHT: Snapshot the queue size at START of level
        level_size = len(queue)
        # This tells us how many nodes are at current level

        current_level = []  # Collect nodes for this level

        # STEP 3: Process EXACTLY level_size nodes
        for _ in range(level_size):
            node = queue.popleft()  # Get next node in queue
            current_level.append(node.val)  # Add to current level

            # Add children for NEXT level
            if node.left:
                queue.append(node.left)
            if node.right:
                queue.append(node.right)

        # STEP 4: After processing all nodes at this level, add to result
        result.append(current_level)

    return result
```

**Visual Trace for tree [3, 9, 20, None, None, 15, 7]:**

```
Tree:     3
        /   \
       9    20
           /  \
          15   7

Initial state:
  queue = [3]
  result = []

--- Iteration 1 (Level 0) ---
  level_size = 1 (only node 3)
  current_level = []

  Process node 3:
    current_level = [3]
    Add children: queue = [9, 20]

  result = [[3]]
  queue = [9, 20]

--- Iteration 2 (Level 1) ---
  level_size = 2 (nodes 9 and 20)
  current_level = []

  Process node 9:
    current_level = [9]
    No children, queue stays [20]

  Process node 20:
    current_level = [9, 20]
    Add children: queue = [15, 7]

  result = [[3], [9, 20]]
  queue = [15, 7]

--- Iteration 3 (Level 2) ---
  level_size = 2 (nodes 15 and 7)
  current_level = []

  Process node 15:
    current_level = [15]
    No children

  Process node 7:
    current_level = [15, 7]
    No children

  result = [[3], [9, 20], [15, 7]]
  queue = []

Loop ends (queue empty)
FINAL: [[3], [9, 20], [15, 7]]
```

---

## Time & Space Complexity

### All DFS Traversals (Inorder, Preorder, Postorder)
- **Time Complexity**: O(n) - Visit each node exactly once
- **Space Complexity**:
  - Recursive: O(h) - Call stack depth (h = height of tree)
    - Best case (balanced tree): O(log n)
    - Worst case (skewed tree): O(n)
  - Iterative: O(h) - Stack size (same as recursive)

### Level Order Traversal (BFS)
- **Time Complexity**: O(n) - Visit each node exactly once
- **Space Complexity**: O(w) - Queue size (w = maximum width of tree)
  - Best case (skewed tree): O(1)
  - Worst case (perfect binary tree): O(n/2) ≈ O(n) for last level

**Important difference:** DFS uses O(h) space, BFS uses O(w) space. For balanced trees, h ≈ log n, but w can be n/2 for the last level.

---

## Common Variations

1. **Inorder Traversal** (Left → Root → Right)
   - LeetCode: [94. Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)
   - Use case: Get sorted array from BST

2. **Preorder Traversal** (Root → Left → Right)
   - LeetCode: [144. Binary Tree Preorder Traversal](https://leetcode.com/problems/binary-tree-preorder-traversal/)
   - Use case: Create a copy of tree, serialize tree

3. **Postorder Traversal** (Left → Right → Root)
   - LeetCode: [145. Binary Tree Postorder Traversal](https://leetcode.com/problems/binary-tree-postorder-traversal/)
   - Use case: Delete tree, calculate folder sizes

4. **Level Order Traversal** (BFS)
   - LeetCode: [102. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)
   - LeetCode: [107. Binary Tree Level Order Traversal II](https://leetcode.com/problems/binary-tree-level-order-traversal-ii/) (bottom-up)

5. **Zigzag Level Order**
   - LeetCode: [103. Binary Tree Zigzag Level Order Traversal](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/)

6. **Vertical Order Traversal**
   - LeetCode: [314. Binary Tree Vertical Order Traversal](https://leetcode.com/problems/binary-tree-vertical-order-traversal/)

---

## Practice Problems

### Easy
1. [94. Binary Tree Inorder Traversal](https://leetcode.com/problems/binary-tree-inorder-traversal/)
2. [144. Binary Tree Preorder Traversal](https://leetcode.com/problems/binary-tree-preorder-traversal/)
3. [145. Binary Tree Postorder Traversal](https://leetcode.com/problems/binary-tree-postorder-traversal/)
4. [102. Binary Tree Level Order Traversal](https://leetcode.com/problems/binary-tree-level-order-traversal/)

### Medium
5. [103. Binary Tree Zigzag Level Order Traversal](https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/)
6. [107. Binary Tree Level Order Traversal II](https://leetcode.com/problems/binary-tree-level-order-traversal-ii/)
7. [314. Binary Tree Vertical Order Traversal](https://leetcode.com/problems/binary-tree-vertical-order-traversal/)
8. [199. Binary Tree Right Side View](https://leetcode.com/problems/binary-tree-right-side-view/)
9. [637. Average of Levels in Binary Tree](https://leetcode.com/problems/average-of-levels-in-binary-tree/)
10. [116. Populating Next Right Pointers in Each Node](https://leetcode.com/problems/populating-next-right-pointers-in-each-node/)

---

## Common Pitfalls (Mistakes to Avoid)

### 1. Confusing the Order in Recursive Calls

**WRONG (Trying to do Inorder but got Preorder):**
```javascript
function inorderWrong(root) {
    const result = [];

    function traverse(node) {
        if (node === null) return;

        result.push(node.val);     // BUG: This makes it PREORDER!
        traverse(node.left);
        traverse(node.right);
    }

    traverse(root);
    return result;
}
```

**RIGHT:**
```javascript
function inorderCorrect(root) {
    const result = [];

    function traverse(node) {
        if (node === null) return;

        traverse(node.left);       // Left first
        result.push(node.val);     // Then root (MIDDLE)
        traverse(node.right);      // Then right
    }

    traverse(root);
    return result;
}
```

**Memory trick:** In**order** → process root in the **middle** (between left and right)

---

### 2. Level Order: Not Capturing Level Size

**WRONG:**
```javascript
function levelOrderWrong(root) {
    if (!root) return [];

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const currentLevel = [];

        // BUG: Queue size changes as we add children!
        for (let i = 0; i < queue.length; i++) {  // WRONG!
            const node = queue.shift();
            currentLevel.push(node.val);

            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }

        result.push(currentLevel);
    }

    return result;
}
```

**Why it's wrong:** `queue.length` changes during the loop as we add children, so the loop condition is dynamic and unreliable.

**RIGHT:**
```javascript
function levelOrderCorrect(root) {
    if (!root) return [];

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const levelSize = queue.length;  // Snapshot size BEFORE loop
        const currentLevel = [];

        for (let i = 0; i < levelSize; i++) {  // Use snapshot
            const node = queue.shift();
            currentLevel.push(node.val);

            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }

        result.push(currentLevel);
    }

    return result;
}
```

---

### 3. Iterative Inorder: Forgetting to Check Stack

**WRONG:**
```javascript
function inorderIterativeWrong(root) {
    const result = [];
    const stack = [];
    let current = root;

    while (current !== null) {  // BUG: Only checks current!
        while (current !== null) {
            stack.push(current);
            current = current.left;
        }

        current = stack.pop();
        result.push(current.val);
        current = current.right;
    }

    return result;
}
```

**Problem:** After processing root's right subtree, `current` becomes null, but stack still has nodes!

**RIGHT:**
```javascript
function inorderIterativeCorrect(root) {
    const result = [];
    const stack = [];
    let current = root;

    while (current !== null || stack.length > 0) {  // Check BOTH!
        while (current !== null) {
            stack.push(current);
            current = current.left;
        }

        current = stack.pop();
        result.push(current.val);
        current = current.right;
    }

    return result;
}
```

---

### 4. Preorder Iterative: Wrong Stack Order

**WRONG:**
```javascript
function preorderWrong(root) {
    if (!root) return [];

    const result = [];
    const stack = [root];

    while (stack.length > 0) {
        const node = stack.pop();
        result.push(node.val);

        if (node.left) stack.push(node.left);   // BUG: Left pushed last
        if (node.right) stack.push(node.right); // Right pushed second
    }

    return result;
}
// This will process RIGHT before LEFT (stack is LIFO)!
```

**RIGHT:**
```javascript
function preorderCorrect(root) {
    if (!root) return [];

    const result = [];
    const stack = [root];

    while (stack.length > 0) {
        const node = stack.pop();
        result.push(node.val);

        if (node.right) stack.push(node.right); // Push right FIRST
        if (node.left) stack.push(node.left);   // Push left SECOND
        // Left is on top, gets popped first!
    }

    return result;
}
```

---

## Frequently Asked Questions (FAQ)

### Q1: Why does Inorder traversal of a BST give sorted order?

**Answer:**

By definition of a Binary Search Tree:
- All nodes in LEFT subtree < root
- All nodes in RIGHT subtree > root

Inorder visits: Left → Root → Right

So we visit:
1. All smaller values (left subtree)
2. Current value (root)
3. All larger values (right subtree)

This naturally produces sorted order!

**Example:**
```
BST:    4
      /   \
     2     6
    / \   / \
   1   3 5   7

Left subtree of 4: [1, 2, 3] (all < 4)
Root: 4
Right subtree of 4: [5, 6, 7] (all > 4)

Inorder: [1, 2, 3] + [4] + [5, 6, 7] = [1,2,3,4,5,6,7] ✓ Sorted!
```

---

### Q2: When should I use recursive vs iterative traversal?

**Answer:**

**Use Recursive when:**
- Code simplicity is priority (3 lines vs 15 lines!)
- Tree is not extremely deep (no stack overflow risk)
- Interviewer doesn't explicitly ask for iterative

**Use Iterative when:**
- Very deep trees (avoid stack overflow)
- Interviewer explicitly asks "can you do it without recursion?"
- Need fine-grained control over traversal (e.g., pause and resume)
- Working in languages with limited stack size

**Interview tip:** Learn both! Interviewers often ask:
> "Great, now can you implement it iteratively?"

---

### Q3: How do I remember which stack order for Preorder iterative?

**Answer:**

**Memory trick:** "Right Before Left" (RBL)

- Stack is **LIFO** (Last In, First Out)
- We want to process **Left** before **Right**
- So we push **Right** first (goes to bottom)
- Then push **Left** (goes to top)
- Left gets popped first!

```javascript
// PREORDER: Root → LEFT → Right
if (node.right) stack.push(node.right);  // Right BEFORE
if (node.left) stack.push(node.left);    // Left
```

---

### Q4: What's the difference between DFS and BFS for trees?

**Answer:**

**DFS (Depth-First Search):**
- Uses **stack** (or recursion which uses call stack)
- Goes **deep** into one branch before exploring others
- Space: O(h) where h = height
- Examples: Inorder, Preorder, Postorder

**BFS (Breadth-First Search):**
- Uses **queue**
- Explores **level by level**
- Space: O(w) where w = width
- Example: Level-order traversal

**When to use:**
- **DFS:** Finding paths, checking tree properties, when tree is wide
- **BFS:** Shortest path, level-wise operations, when tree is deep

```
        1
      /   \
     2     3
    / \   / \
   4   5 6   7

DFS (Preorder): [1, 2, 4, 5, 3, 6, 7] (go deep first)
BFS (Level):    [1, 2, 3, 4, 5, 6, 7] (go wide first)
```

---

### Q5: Can I do Level Order traversal without a queue?

**Answer:** Yes! You can use **recursive DFS with level tracking**:

```javascript
function levelOrderDFS(root) {
    const result = [];

    function dfs(node, level) {
        if (!node) return;

        // Create level array if first time at this level
        if (level === result.length) {
            result.push([]);
        }

        // Add current node to its level
        result[level].push(node.val);

        // Explore children at next level
        dfs(node.left, level + 1);
        dfs(node.right, level + 1);
    }

    dfs(root, 0);
    return result;
}
```

**Trade-off:** This is elegant but uses O(h) space instead of O(w).

---

### Q6: What if I need to traverse in reverse level order (bottom to top)?

**Answer:** Two approaches:

**Approach 1:** Normal level order, then reverse result
```javascript
function levelOrderBottom(root) {
    const result = levelOrder(root);  // Get [[1], [2,3], [4,5,6,7]]
    return result.reverse();           // Return [[4,5,6,7], [2,3], [1]]
}
```

**Approach 2:** Add levels to front of result
```javascript
function levelOrderBottom(root) {
    if (!root) return [];

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const levelSize = queue.length;
        const currentLevel = [];

        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();
            currentLevel.push(node.val);

            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }

        result.unshift(currentLevel);  // Add to FRONT!
    }

    return result;
}
```

---

### Q7: How do I traverse only the right side of a tree?

**Answer:** Use level order, but only take the **last node of each level**:

```javascript
function rightSideView(root) {
    if (!root) return [];

    const result = [];
    const queue = [root];

    while (queue.length > 0) {
        const levelSize = queue.length;

        for (let i = 0; i < levelSize; i++) {
            const node = queue.shift();

            // Only add the LAST node of each level
            if (i === levelSize - 1) {
                result.push(node.val);
            }

            if (node.left) queue.push(node.left);
            if (node.right) queue.push(node.right);
        }
    }

    return result;
}

// Tree:     1
//         /   \
//        2     3
//         \
//          5
// Right side view: [1, 3, 5]
```

---

## Pro Tips for Interviews

### Tip 1: Always Ask About Edge Cases

Before coding, clarify:
```
Interviewer: "Implement inorder traversal"

You: "Great! A few quick questions:
- Can the tree be empty? (return [])
- Can the tree have only one node? (return [val])
- Should I use recursive or iterative? (ask preference)
- Do you want me to modify the tree? (usually no)"
```

This shows thoughtfulness and prevents bugs!

---

### Tip 2: Draw the Tree on Whiteboard/Paper

**Always visualize** before coding:

```
"Let me trace through an example first..."

    4
   / \
  2   6
 / \
1   3

Inorder: 1, 2, 3, 4, 6
```

Interviewers love seeing you think through examples!

---

### Tip 3: State the Order Out Loud

When writing traversal code, **say the order out loud**:

```javascript
function inorderTraversal(root) {
    // You say: "Inorder is Left, Root, Right"

    if (!root) return [];

    traverse(root.left);      // "Left"
    result.push(root.val);    // "Root"
    traverse(root.right);     // "Right"
}
```

This prevents mixing up the orders!

---

### Tip 4: Know the Space Complexity Trade-offs

Be ready to discuss:

```
Interviewer: "What's the space complexity?"

You: "For recursive inorder, it's O(h) where h is the height,
due to the call stack.
- Best case (balanced): O(log n)
- Worst case (skewed): O(n)

For level order, it's O(w) where w is max width.
- Could be O(n) for the last level of a complete tree."
```

---

### Tip 5: Mention the BST → Sorted Property

For inorder traversal:

```
Interviewer: "Why use inorder?"

You: "One key property: inorder traversal of a BST
gives us the values in sorted order. This is useful for:
- Validating BST (check if result is sorted)
- Finding kth smallest element
- Converting BST to sorted array"
```

---

### Tip 6: Offer Both Recursive and Iterative

Strong candidates offer both:

```
You: "I'll implement the recursive solution first since
it's cleaner, then show the iterative version if you'd like."

[After recursive solution]

You: "Would you like to see the iterative approach using
a stack? It's more verbose but avoids recursion overhead."
```

---

### Tip 7: Handle Null Checks Gracefully

**Good approach:**
```javascript
function inorderTraversal(root) {
    const result = [];

    function traverse(node) {
        if (node === null) return;  // Handle null at START

        traverse(node.left);
        result.push(node.val);
        traverse(node.right);
    }

    traverse(root);
    return result;
}
```

**Explain:** "I check for null at the beginning of each call to handle leaf nodes' children elegantly."

---

## Pattern Recognition Guide

### When to Think "Tree Traversal"?

Look for these keywords:

#### Definite Signals:
1. "Traverse a binary tree" → 99% Tree Traversal
2. "Inorder/Preorder/Postorder" → 100% Tree Traversal
3. "Level order" → 100% Level Order (BFS)
4. "Visit all nodes" → Tree Traversal

#### Strong Hints:
1. "Get all values from tree" → Likely traversal
2. "Serialize tree" → Preorder or level order
3. "Print tree by levels" → Level order
4. "Convert BST to sorted array" → Inorder
5. "Find leaves" → Any DFS traversal

#### Problem Patterns:

**Pattern 1: Getting Values in Specific Order**
```
Problem: "Return values of BST in ascending order"
Solution: Inorder traversal
Why: Inorder of BST = sorted
```

**Pattern 2: Processing Levels**
```
Problem: "Find average at each level"
Solution: Level order traversal
Why: Need to group nodes by level
```

**Pattern 3: Tree Structure Operations**
```
Problem: "Clone a tree"
Solution: Preorder traversal
Why: Create root before children
```

**Pattern 4: Bottom-Up Calculations**
```
Problem: "Calculate height of each subtree"
Solution: Postorder traversal
Why: Need children's heights before parent
```

---

### Decision Tree: Which Traversal?

```
Start: Need to traverse binary tree?
│
├─ Need sorted values from BST?
│  └─ YES → Inorder
│
├─ Need to process level by level?
│  └─ YES → Level Order (BFS)
│
├─ Need to process parent before children?
│  └─ YES → Preorder
│
├─ Need to process children before parent?
│  └─ YES → Postorder
│
└─ Just need all values in any order?
   └─ Use any DFS (Inorder is default)
```

---

## Key Takeaways

### Core Concepts
1. **Four main types**: Inorder (L→R→R), Preorder (R→L→R), Postorder (L→R→R), Level-order (level by level)
2. **BST property**: Inorder traversal of BST gives sorted array
3. **Use cases matter**: Preorder for copying, Postorder for deletion, Level-order for BFS
4. **Recursion is natural**: Tree structure is recursive, so recursive traversal is elegant

### Technical Points
5. **Space complexity**: O(h) for DFS (height), O(w) for BFS (width)
6. **Iterative needs stack**: For DFS, or queue for BFS
7. **Level-order snapshot**: Capture queue size before loop to process exact level
8. **Preorder stack order**: Push right before left (RBL)

### Implementation Tips
9. **Null checks at start**: Check `if (node === null) return;` at beginning
10. **Both recursive and iterative**: Learn both implementations
11. **Visualize first**: Draw tree and trace through example
12. **Say order out loud**: "Left, Root, Right" while coding

### Interview Success
13. **Know the trade-offs**: Recursive (simple) vs Iterative (no stack overflow)
14. **Mention BST property**: Shows deep understanding
15. **Offer both approaches**: "I can do recursive or iterative, which do you prefer?"
16. **Handle edge cases**: Empty tree, single node, null children

### Real-World Applications
17. **File systems**: Preorder for listing directory structure
18. **Expression trees**: Inorder for infix, Postorder for postfix
19. **DOM traversal**: Level order for rendering by depth
20. **Serialization**: Preorder or level order for saving tree to disk

---

## Beginner's Quick Reference

### The 4 Traversals at a Glance

**1. Inorder (Left → Root → Right)**
```javascript
function inorder(node) {
    if (!node) return;
    inorder(node.left);
    visit(node);           // Process in middle
    inorder(node.right);
}
// BST → Sorted!
```

**2. Preorder (Root → Left → Right)**
```javascript
function preorder(node) {
    if (!node) return;
    visit(node);           // Process first
    preorder(node.left);
    preorder(node.right);
}
// Good for copying tree
```

**3. Postorder (Left → Right → Root)**
```javascript
function postorder(node) {
    if (!node) return;
    postorder(node.left);
    postorder(node.right);
    visit(node);           // Process last
}
// Good for deleting tree
```

**4. Level Order (BFS)**
```javascript
function levelOrder(root) {
    if (!root) return [];
    const queue = [root];
    while (queue.length > 0) {
        const node = queue.shift();
        visit(node);
        if (node.left) queue.push(node.left);
        if (node.right) queue.push(node.right);
    }
}
// Level by level
```

### Mental Model (Simple!)

**Tree traversal = Tour guide problem**
- **Inorder**: Visit left building, current building, right building (alphabetical for BST)
- **Preorder**: Visit current building first, then left and right (tour leaders go first)
- **Postorder**: Visit left and right first, then current (cleanup crews work bottom-up)
- **Level-order**: Visit all buildings floor by floor (elevator tour)

### Common Mistakes Checklist

Before submitting, verify:
- [ ] Null check at start of recursive function
- [ ] Correct order: L-R-R (Inorder), R-L-R (Preorder), L-R-R (Postorder)
- [ ] For level order: captured `levelSize` before loop
- [ ] For iterative preorder: pushed right before left
- [ ] Handled empty tree edge case
- [ ] Used stack for DFS, queue for BFS

### When to Use Which Traversal?

**YES, use Inorder:**
- BST → sorted array
- Validate BST
- Find kth smallest in BST

**YES, use Preorder:**
- Copy/clone tree
- Serialize tree
- Create tree from array

**YES, use Postorder:**
- Delete tree
- Calculate subtree sizes
- Evaluate expression tree

**YES, use Level-order:**
- Find shortest path
- Process by levels
- Right/left side view
- Level-wise calculations

---

## Final Thoughts for Beginners

Tree traversal is one of the most fundamental patterns in computer science. Every tree problem boils down to some form of traversal. Once you master these four basic patterns, you'll see them everywhere:

**Start here:**
1. Master recursive Inorder (simplest)
2. Understand why BST → sorted with Inorder
3. Learn Preorder and Postorder (just move one line!)
4. Practice Level Order (introduces BFS concept)
5. Then learn iterative versions

**Remember:** The pattern is simple - it's just the ORDER that changes. Don't rush - take time to visualize the tree and trace through examples by hand. Draw arrows showing the traversal path. That's when it truly clicks!

Happy coding!

---

[← Previous: Modified Binary Search](./10-modified-binary-search.md) | [Back to Index](./README.md) | [Next: Depth-First Search →](./12-depth-first-search.md)
