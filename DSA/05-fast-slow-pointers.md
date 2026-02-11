# Fast & Slow Pointers Pattern

## What is Fast & Slow Pointers? (In Simple Words)

Imagine you're at a race track watching two runners:
- A **tortoise** (slow runner) who takes 1 step at a time
- A **hare** (fast runner) who takes 2 steps at a time

**The Magic**: If the track is circular (has a cycle), the hare will eventually catch up to the tortoise and lap them. But if the track has a finish line (no cycle), the hare will simply reach the end first.

This simple concept is incredibly powerful in programming! Instead of runners, we use "pointers" (references to positions in data), and instead of a track, we have data structures like linked lists.

### Real-World Analogy

Think of it like two friends walking around a city:
- Friend A (slow) walks at normal speed
- Friend B (fast) walks twice as fast

**Scenario 1 - Circular path**: If they're walking around a circular park, Friend B will eventually come around and meet Friend A from behind.

**Scenario 2 - Straight street**: If they're walking down a street that ends, Friend B will reach the end first while Friend A is still in the middle.

### Why Is This Useful?

Instead of marking every building they pass (which requires memory), they can figure out if the path loops just by walking! This saves memory and is elegant.

---

## Pattern Overview

The **Fast & Slow Pointers** pattern (also known as the **Tortoise and Hare** algorithm) uses two pointers that move through a data structure at different speeds. This pattern is particularly useful for detecting cycles and finding middle elements in linked lists.

### When to Use
- Detecting cycles in linked lists
- Finding the middle of a linked list
- Finding the start of a cycle
- Checking if a linked list is a palindrome
- Finding the k-th element from the end

### Key Characteristics
- Two pointers move at different speeds (slow moves 1 step, fast moves 2 steps)
- If there's a cycle, fast and slow pointers will eventually meet
- Slow pointer will be at middle when fast reaches end
- Space efficient: O(1) space instead of O(n) with hash sets

### Pattern Identification
Look for this pattern when you see:
- "Detect cycle in a linked list"
- "Find the middle of a linked list"
- "Find the start of the cycle"
- "Check if linked list is palindrome"
- Problems involving linked lists without random access

---

## Visual Diagrams: How Fast Catches Slow

### Scenario 1: Detecting a Cycle

```
Initial State:
List: 1 → 2 → 3 → 4 → 5
            ↑         ↓
            ← ← ← ← ←
Both pointers start at head (node 1)
S = Slow pointer
F = Fast pointer

Step 0:
1 → 2 → 3 → 4 → 5
SF        ↑     ↓
          ← ← ← ←
S = 1, F = 1

Step 1 (Slow moves 1, Fast moves 2):
1 → 2 → 3 → 4 → 5
    S       F ↑   ↓
            ← ← ← ←
S = 2, F = 3

Step 2:
1 → 2 → 3 → 4 → 5
        S   ↑   F ↓
            ← ← ← ←
S = 3, F = 5

Step 3:
1 → 2 → 3 → 4 → 5
            S F ↑ ↓
                ← ←
S = 4, F = 2 (wrapped around)

Step 4:
1 → 2 → 3 → 4 → 5
        F       S ↑ ↓
                ← ← ←
S = 5, F = 4

Step 5:
1 → 2 → 3 → 4 → 5
            ↑   S ↓
            F ← ← ←
S = 2, F = 2

CYCLE DETECTED! Pointers meet at node 2
```

### Scenario 2: Finding Middle (No Cycle)

```
Odd-length list: 1 → 2 → 3 → 4 → 5 → null

Step 0:
1 → 2 → 3 → 4 → 5 → null
SF
S = 1, F = 1

Step 1 (Slow +1, Fast +2):
1 → 2 → 3 → 4 → 5 → null
    S       F
S = 2, F = 3

Step 2:
1 → 2 → 3 → 4 → 5 → null
        S           F
S = 3, F = 5

Step 3:
Fast.next = null, STOP!
S = 3 is the MIDDLE node
```

```
Even-length list: 1 → 2 → 3 → 4 → 5 → 6 → null

Step 0:
1 → 2 → 3 → 4 → 5 → 6 → null
SF
S = 1, F = 1

Step 1:
1 → 2 → 3 → 4 → 5 → 6 → null
    S       F
S = 2, F = 3

Step 2:
1 → 2 → 3 → 4 → 5 → 6 → null
        S           F
S = 3, F = 5

Step 3:
1 → 2 → 3 → 4 → 5 → 6 → null
            S           F
S = 4, F = null (reached end)

STOP! S = 4 is the SECOND MIDDLE node
(When even length, we return the second middle)
```

### Why Fast Always Catches Slow in a Cycle

Think of it mathematically:
```
In a cycle of length C:
- Distance between pointers reduces by 1 each step
- Slow moves forward 1, Fast moves forward 2
- Net effect: Fast gains 1 position on Slow per iteration
- Eventually, the gap closes to 0 (they meet)

Example with cycle length 5:
Gap = 5 → 4 → 3 → 2 → 1 → 0 (MEET!)
```

---

## Example 1: Linked List Cycle Detection (TypeScript)

### Problem
Given the head of a linked list, determine if the linked list has a cycle in it. Return `true` if there is a cycle, otherwise return `false`.

**LeetCode**: [141. Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)

### Solution

```typescript
/**
 * Definition for singly-linked list node
 */
class ListNode {
    val: number;
    next: ListNode | null;

    constructor(val: number) {
        this.val = val;
        this.next = null;
    }
}

/**
 * Detect if linked list has a cycle using fast & slow pointers
 * @param head - Head of the linked list
 * @returns True if cycle exists, false otherwise
 */
function hasCycle(head: ListNode | null): boolean {
    // Edge case: empty list or single node
    if (!head || !head.next) {
        return false;
    }

    // Initialize slow and fast pointers
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;

    // Move pointers until fast reaches end or they meet
    while (fast && fast.next) {
        slow = slow!.next;       // Move slow pointer 1 step
        fast = fast.next.next;   // Move fast pointer 2 steps

        // If pointers meet, cycle exists
        if (slow === fast) {
            return true;
        }
    }

    // Fast pointer reached end, no cycle
    return false;
}

// Example usage
// Example 1: List with cycle [3,2,0,-4] where -4 points back to node with value 2
const node1: ListNode = new ListNode(3);
const node2: ListNode = new ListNode(2);
const node3: ListNode = new ListNode(0);
const node4: ListNode = new ListNode(-4);

node1.next = node2;
node2.next = node3;
node3.next = node4;
node4.next = node2;  // Creates cycle

console.log(hasCycle(node1));  // Output: true

// Example 2: List without cycle [1,2]
const nodeA: ListNode = new ListNode(1);
const nodeB: ListNode = new ListNode(2);
nodeA.next = nodeB;

console.log(hasCycle(nodeA));  // Output: false

// Example 3: Single node with cycle [1] pointing to itself
const single: ListNode = new ListNode(1);
single.next = single;

console.log(hasCycle(single)); // Output: true
```

### Detailed Code Explanation (Line by Line)

Let's break down the `hasCycle` function:

```typescript
function hasCycle(head: ListNode | null): boolean {
    // STEP 1: Handle edge cases
    if (!head || !head.next) {
        return false;
    }
    // Why? If list is empty (no head) or has only 1 node (no next),
    // there can't be a cycle. A cycle needs at least 2 nodes where
    // one points back to another.
```

```typescript
    // STEP 2: Initialize pointers
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;
    // Both start at the same position (the head of the list)
    // Think: Both runners start at the same starting line
```

```typescript
    // STEP 3: The main loop - move pointers at different speeds
    while (fast && fast.next) {
        // Why this condition?
        // - Check 'fast' exists (not null)
        // - Check 'fast.next' exists (so fast.next.next won't error)
        // If either is null, we've reached the end (no cycle)
```

```typescript
        slow = slow!.next;       // Slow takes 1 step
        fast = fast.next.next;   // Fast takes 2 steps

        // Visualization:
        // Before: slow→A, fast→A
        // After:  slow→B, fast→C (if B→C exists)
```

```typescript
        // STEP 4: Check if they meet
        if (slow === fast) {
            return true;
        }
        // In TypeScript, === checks if both pointers reference
        // the SAME node object (same memory location)
        // Not just same value!
    }
```

```typescript
    // STEP 5: Fast reached the end
    return false;
    // If we exit the loop, fast reached null (end of list)
    // This means no cycle exists
}
```

### Why It Works (The Math Behind It)

**Case 1: No Cycle**
- Fast pointer moves at 2x speed
- It will reach the end (`null`) before slow pointer
- Loop terminates, return `false`
- Simple!

**Case 2: Cycle Exists**
- Both pointers eventually enter the cycle
- Inside the cycle, think of it as a circular track
- Distance between pointers = D
- Each iteration: slow moves +1, fast moves +2
- Net effect: fast gets 1 step closer to slow
- D decreases by 1 each iteration: D → D-1 → D-2 → ... → 0
- When D = 0, they meet!

**Example with numbers:**
```
Cycle length = 5 nodes
Initial gap = 3 nodes

Iteration 1: gap = 3 - 1 = 2
Iteration 2: gap = 2 - 1 = 1
Iteration 3: gap = 1 - 1 = 0 (MEET!)
```

### Time Advantage

**Fast & Slow Pointer Approach:**
- Time: O(n) - visit each node at most once
- Space: O(1) - only 2 pointer variables

**Alternative HashSet Approach:**
```typescript
// This works but uses more space
function hasCycleHashSet(head: ListNode | null): boolean {
    const visited = new Set<ListNode>();
    let current: ListNode | null = head;

    while (current) {
        if (visited.has(current)) {
            return true;  // Found cycle
        }
        visited.add(current);
        current = current.next;
    }
    return false;
}
// Time: O(n) - still visit each node once
// Space: O(n) - store all nodes in Set
```

Fast & Slow is better because it saves memory!

### Finding Cycle Start Point (Advanced)

This is a brilliant extension of the basic algorithm!

```typescript
/**
 * Find the node where cycle begins
 * @param head - Head of the linked list
 * @returns Node where cycle begins, or null if no cycle
 */
function detectCycle(head: ListNode | null): ListNode | null {
    if (!head || !head.next) return null;

    let slow: ListNode | null = head;
    let fast: ListNode | null = head;

    // PHASE 1: Detect if cycle exists (same as before)
    while (fast && fast.next) {
        slow = slow!.next;
        fast = fast.next.next;

        if (slow === fast) {
            // Cycle detected! Now find the start

            // PHASE 2: Find cycle start (the magic!)
            slow = head;  // Reset slow to head

            // Move both pointers ONE step at a time
            // (now they move at same speed!)
            while (slow !== fast) {
                slow = slow!.next;  // 1 step
                fast = fast!.next;  // 1 step (not 2!)
            }

            return slow;  // This is the start of the cycle
        }
    }

    return null;  // No cycle
}
```

**Why This Works (The Mathematical Proof):**

```
Let:
- L = distance from head to cycle start
- C = cycle length
- K = distance from cycle start to meeting point

When they meet:
- Slow traveled: L + K
- Fast traveled: L + K + nC (where n = number of complete cycles)

Since fast moves 2x speed:
2(L + K) = L + K + nC
2L + 2K = L + K + nC
L + K = nC
L = nC - K

This means:
Distance from head to cycle start = Distance from meeting point to cycle start

So if we:
1. Reset slow to head
2. Move both at same speed
3. They'll meet at cycle start!
```

**Visual Example:**
```
List: 1 → 2 → 3 → 4 → 5 → 6
               ↑           ↓
               ← ← ← ← ← ←

L = 2 (head to node 3)
C = 4 (cycle length: 3→4→5→6→3)
They meet at node 5

Distance from head to start (3) = 2
Distance from meeting point (5) to start (3) = 2
(going 5→6→3)

Move both 1 step at a time:
slow: 1 → 2 → 3
fast: 5 → 6 → 3

They meet at 3, the cycle start!
```

---

## Example 2: Middle of the Linked List (TypeScript)

### Problem
Given the head of a singly linked list, return the middle node. If there are two middle nodes, return the second middle node.

**LeetCode**: [876. Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/)

### Solution

```typescript
/**
 * Definition for singly-linked list node
 */
class ListNode {
    val: number;
    next: ListNode | null;

    constructor(val: number = 0, next: ListNode | null = null) {
        this.val = val;
        this.next = next;
    }
}

/**
 * Find middle node using fast & slow pointers
 * @param head - Head of the linked list
 * @returns Middle node (second middle if even number of nodes)
 */
function middleNode(head: ListNode | null): ListNode | null {
    // Initialize both pointers at head
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;

    // Move fast pointer 2x speed of slow pointer
    // When fast reaches end, slow will be at middle
    while (fast && fast.next) {
        slow = slow!.next;        // Move 1 step
        fast = fast.next.next;    // Move 2 steps
    }

    // Slow pointer is now at middle
    return slow;
}

// Helper function to create linked list from array of values
function createLinkedList(values: number[]): ListNode | null {
    if (values.length === 0) {
        return null;
    }

    const head: ListNode = new ListNode(values[0]);
    let current: ListNode = head;

    for (let i = 1; i < values.length; i++) {
        current.next = new ListNode(values[i]);
        current = current.next;
    }

    return head;
}

// Helper function to print linked list from a given node
function printFromNode(node: ListNode | null): number[] {
    const result: number[] = [];
    while (node) {
        result.push(node.val);
        node = node.next;
    }
    return result;
}

// Example 1: Odd number of nodes [1,2,3,4,5]
const head1: ListNode | null = createLinkedList([1, 2, 3, 4, 5]);
const middle1: ListNode | null = middleNode(head1);
console.log(printFromNode(middle1));  // Output: [3, 4, 5]
// Explanation: Middle node is 3

// Example 2: Even number of nodes [1,2,3,4,5,6]
const head2: ListNode | null = createLinkedList([1, 2, 3, 4, 5, 6]);
const middle2: ListNode | null = middleNode(head2);
console.log(printFromNode(middle2));  // Output: [4, 5, 6]
// Explanation: Two middle nodes (3 and 4), return second middle

// Example 3: Two nodes [1,2]
const head3: ListNode | null = createLinkedList([1, 2]);
const middle3: ListNode | null = middleNode(head3);
console.log(printFromNode(middle3));  // Output: [2]

// Example 4: Single node [1]
const head4: ListNode | null = createLinkedList([1]);
const middle4: ListNode | null = middleNode(head4);
console.log(printFromNode(middle4));  // Output: [1]
```

### Detailed Code Explanation

Let's understand the middle-finding algorithm step by step:

```typescript
function middleNode(head: ListNode | null): ListNode | null {
    // STEP 1: Initialize both pointers at head
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;
    // Think: Both runners start at the same starting line
```

```typescript
    // STEP 2: Move pointers at different speeds
    while (fast && fast.next) {
        // Condition check:
        // - 'fast' exists (not null)
        // - 'fast.next' exists (so we can do fast.next.next)
        //
        // When does this fail?
        // - Odd length: fast.next becomes null
        // - Even length: fast becomes null
```

```typescript
        slow = slow!.next;        // Slow moves 1 step
        fast = fast.next.next;    // Fast moves 2 steps
        // For every 1 step slow takes, fast takes 2 steps
        // This 2:1 ratio is the key!
```

```typescript
    // STEP 3: Return slow pointer
    return slow;
    // When loop exits, slow is at the middle!
}
```

### Why It Works (The Math)

**Speed relationship**: Fast moves 2 steps for every 1 step slow moves

**When fast reaches end**:
- Total nodes = n
- Fast traveled n steps (or n-1 for even)
- Slow traveled n/2 steps
- Slow is at position n/2 = middle!

**Odd length list** (e.g., 1→2→3→4→5):
```
Length = 5, Middle = position 3

Initial: slow=1, fast=1
Step 1:  slow=2, fast=3
Step 2:  slow=3, fast=5
Step 3:  fast.next=None, STOP → slow=3 (middle)

Slow moved 2 times = 5/2 = middle position
```

**Even length list** (e.g., 1→2→3→4→5→6):
```
Length = 6, Middle = position 3 or 4 (we return 4)

Initial: slow=1, fast=1
Step 1:  slow=2, fast=3
Step 2:  slow=3, fast=5
Step 3:  slow=4, fast=None, STOP → slow=4 (second middle)

Slow moved 3 times = 6/2 = second middle
```

### Key Insight

Think of it as a race where:
- When fast finishes the entire track (reaches end)
- Slow has only finished half the track (is at middle)

This is because fast runs at 2x speed!

---

## Time & Space Complexity

### Example 1: Cycle Detection
- **Time Complexity**: O(n) - In worst case, visit all nodes once
- **Space Complexity**: O(1) - Only two pointer variables

### Example 2: Middle Node
- **Time Complexity**: O(n) - Traverse list once (n/2 steps for slow pointer)
- **Space Complexity**: O(1) - Only two pointer variables

---

## Common Variations

1. **Cycle Detection**
   - Detect if cycle exists
   - LeetCode: [141. Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)

2. **Find Cycle Start**
   - Find where the cycle begins
   - LeetCode: [142. Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)

3. **Middle of Linked List**
   - Find middle node
   - LeetCode: [876. Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/)

4. **Palindrome Linked List**
   - Check if linked list is palindrome (find middle, reverse second half, compare)
   - LeetCode: [234. Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/)

5. **Happy Number**
   - Detect cycle in number transformation
   - LeetCode: [202. Happy Number](https://leetcode.com/problems/happy-number/)

6. **Reorder List**
   - Find middle, reverse second half, merge alternately
   - LeetCode: [143. Reorder List](https://leetcode.com/problems/reorder-list/)

---

## Practice Problems

### Easy
1. [141. Linked List Cycle](https://leetcode.com/problems/linked-list-cycle/)
2. [876. Middle of the Linked List](https://leetcode.com/problems/middle-of-the-linked-list/)
3. [202. Happy Number](https://leetcode.com/problems/happy-number/)

### Medium
4. [142. Linked List Cycle II](https://leetcode.com/problems/linked-list-cycle-ii/)
5. [234. Palindrome Linked List](https://leetcode.com/problems/palindrome-linked-list/)
6. [143. Reorder List](https://leetcode.com/problems/reorder-list/)
7. [287. Find the Duplicate Number](https://leetcode.com/problems/find-the-duplicate-number/)

### Hard
8. [457. Circular Array Loop](https://leetcode.com/problems/circular-array-loop/)

---

## Common Pitfalls (Mistakes to Avoid)

### 1. Forgetting Null Checks

**WRONG:**
```typescript
function hasCycle(head: ListNode | null): boolean {
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;

    while (fast) {  // BUG: Missing fast.next check
        slow = slow!.next;
        fast = fast.next!.next;  // ERROR! fast.next might be null
        // ...
    }
    return false;
}
```

**RIGHT:**
```typescript
function hasCycle(head: ListNode | null): boolean {
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;

    while (fast && fast.next) {  // Check both!
        slow = slow!.next;
        fast = fast.next.next;
        // ...
    }
    return false;
}
```

**Why?** If `fast.next` is null, then `fast.next.next` will throw an error!

---

### 2. Comparing Values Instead of References

**WRONG:**
```typescript
if (slow!.val === fast!.val) {  // BUG: Comparing values
    return true;
}
```

**RIGHT:**
```typescript
if (slow === fast) {  // Correct: Comparing references
    return true;
}
```

**Why?** Two different nodes can have the same value. We need to check if they're the SAME node (same memory location).

---

### 3. Moving Pointers in Wrong Order

**WRONG:**
```typescript
if (slow === fast) {  // BUG: Check before moving
    return true;
}
slow = slow!.next;
fast = fast!.next!.next;
```

This will detect a cycle at the start when both are at head!

**RIGHT:**
```typescript
slow = slow!.next;
fast = fast!.next!.next;

if (slow === fast) {  // Check after moving
    return true;
}
```

---

### 4. Not Handling Edge Cases

**WRONG:**
```typescript
function hasCycle(head: ListNode | null): boolean {
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;
    // What if head is null? ERROR!
    // ...
    return false;
}
```

**RIGHT:**
```typescript
function hasCycle(head: ListNode | null): boolean {
    if (!head || !head.next) {  // Handle edge cases
        return false;
    }
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;
    // ...
    return false;
}
```

**Edge cases to consider:**
- Empty list (head = null)
- Single node (head.next = null)
- Single node pointing to itself

---

### 5. Wrong Speed Ratio

**WRONG:**
```typescript
slow = slow!.next;      // 1 step
fast = fast!.next;      // 1 step (should be 2!)
```

This defeats the purpose! Both move at same speed, won't catch cycle efficiently.

**RIGHT:**
```typescript
slow = slow!.next;       // 1 step
fast = fast!.next!.next; // 2 steps
```

---

## Frequently Asked Questions (FAQ)

### Q1: Why do we use 2x speed? Why not 3x or 4x?

**Answer:**
- 2x speed is optimal for cycle detection
- With 3x or higher, fast might "jump over" slow in the cycle
- Example: Cycle length = 3, gap = 1
  - 2x speed: gap goes 1 → 0 (meet!)
  - 3x speed: gap goes 1 → -1 (fast jumps past slow, might miss!)
- 2x guarantees they'll meet (proven mathematically)

---

### Q2: Will fast and slow always meet at the same point in the cycle?

**Answer:** No! The meeting point depends on:
- Where the cycle starts
- Length of the cycle
- Distance from head to cycle start

But they WILL always meet somewhere inside the cycle.

---

### Q3: Can I start fast ahead of slow?

**Answer:**
- For cycle detection: No, they must start at the same position
- Starting fast ahead breaks the algorithm
- The mathematical proof requires they start together

---

### Q4: Does this work for arrays with cycle detection?

**Answer:** Yes! Same concept applies.

**Example:** Find duplicate in array [1,3,4,2,2]
```typescript
function findDuplicate(nums: number[]): number {
    let slow: number = nums[0];
    let fast: number = nums[0];

    do {
        slow = nums[slow];           // 1 step
        fast = nums[nums[fast]];     // 2 steps
    } while (slow !== fast);

    // Find entrance to cycle (duplicate number)
    slow = nums[0];
    while (slow !== fast) {
        slow = nums[slow];
        fast = nums[fast];
    }
    return slow;
}
```

---

### Q5: What if there are multiple cycles?

**Answer:**
- In a singly linked list, there can only be ONE cycle
- Each node has only one `next` pointer
- Multiple cycles require multiple outgoing edges (not possible in singly linked list)

---

### Q6: Can slow and fast start from different positions?

**Answer:**
- They CAN, but the algorithm changes
- Standard approach: both start at head
- Variations exist for specific problems (e.g., finding k-th from end)

---

### Q7: Why return second middle for even-length lists?

**Answer:**
- It's a convention, not a requirement
- Some problems want first middle, some want second
- Our algorithm returns second middle
- To get first middle: add condition `while (fast.next && fast.next.next)`

**Example:**
```typescript
// Second middle (current algorithm)
while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
}
// List [1,2,3,4] → returns 3

// First middle (modified)
while (fast!.next && fast!.next.next) {
    slow = slow!.next;
    fast = fast!.next.next;
}
// List [1,2,3,4] → returns 2
```

---

## Pro Tips for Interviews

### Tip 1: Always Start with Edge Cases
```typescript
// Template to follow
function solution(head: ListNode | null): ListNode | null {
    // 1. Handle edge cases first
    if (!head || !head.next) {
        return null; /* appropriate value */
    }

    // 2. Initialize pointers
    let slow: ListNode | null = head;
    let fast: ListNode | null = head;

    // 3. Main logic
    // ...
    return slow;
}
```

---

### Tip 2: Explain the Tortoise and Hare Analogy

In interviews, say:
> "I'll use the fast and slow pointer technique, also called the tortoise and hare algorithm. It's like having two runners on a track - if the track loops, the faster runner will eventually lap the slower one."

This shows you understand the concept deeply!

---

### Tip 3: Verbalize Your Null Checks

While coding, say:
> "I need to check both `fast` and `fast.next` because if `fast.next` is null, accessing `fast.next.next` would cause an error."

Interviewers love hearing your thought process!

---

### Tip 4: Mention Space Complexity Advantage

Always highlight:
> "This approach uses O(1) extra space, which is better than using a HashSet that would require O(n) space."

This shows you think about optimization!

---

### Tip 5: Know Common Variations

Be ready to adapt for:
- Finding cycle start (reset slow to head after meeting)
- Finding middle (just return slow when fast reaches end)
- Palindrome check (find middle, reverse second half, compare)
- K-th from end (give fast a k-node head start)

---

### Tip 6: Test with These Cases

Always test your solution with:
```typescript
// 1. Empty list
hasCycle(null) // → false

// 2. Single node, no cycle
hasCycle(1→null) // → false

// 3. Single node, self cycle
hasCycle(1→1) // → true

// 4. Two nodes, no cycle
hasCycle(1→2→null) // → false

// 5. Two nodes, cycle
hasCycle(1→2→1) // → true

// 6. Larger list with cycle
hasCycle(1→2→3→4→5→3) // → true

// 7. Larger list, no cycle
hasCycle(1→2→3→4→5→null) // → false
```

---

### Tip 7: Draw Diagrams

During interviews, sketch the pointers moving:
```
Step 0: [S,F]→2→3→4→5→3 (S=slow, F=fast)
Step 1: 1→[S]→3→[F]→5→3
Step 2: 1→2→[S]→4→[F,wrap]→3
Step 3: 1→2→3→[S,F] ← MEET!
```

Visual aids help both you and the interviewer!

---

## Pattern Recognition Guide

### When to Think "Fast & Slow Pointers"?

Look for these keywords in the problem:

#### Definite Signals:
1. "Detect cycle in linked list" → 99% Fast & Slow
2. "Find middle of linked list" → 99% Fast & Slow
3. "Cycle in a sequence" → 90% Fast & Slow
4. "Linked list" + "O(1) space" → High probability

#### Strong Hints:
1. "Is there a loop?" → Cycle detection
2. "Find the start of..." → Cycle start variation
3. "Palindrome" + "linked list" → Middle + reverse
4. "Reorder list" → Middle + reverse + merge
5. "K-th from end" → Fast gets k head start

#### Problem Patterns:

**Pattern 1: Pure Cycle Detection**
```
Problem: Does linked list have a cycle?
Solution: Basic fast & slow, check if they meet
```

**Pattern 2: Cycle Start**
```
Problem: Where does the cycle begin?
Solution: Meet → reset slow → move both 1 step → meet at start
```

**Pattern 3: Middle Finding**
```
Problem: Find middle node
Solution: When fast reaches end, slow is at middle
```

**Pattern 4: Palindrome Check**
```
Problem: Is linked list a palindrome?
Solution: Find middle → reverse second half → compare
```

**Pattern 5: K-th From End**
```
Problem: Find k-th node from end
Solution: Fast starts k nodes ahead → move together → when fast ends, slow is at k-th from end
```

---

### Problem Type Checklist

Use this mental checklist:

```
Does the problem involve:
☐ Linked list? (+2 points)
☐ Detecting something cyclic? (+3 points)
☐ Finding middle/median? (+2 points)
☐ O(1) space constraint? (+2 points)
☐ Need to traverse at different speeds? (+3 points)

Score:
7-10 points: Definitely fast & slow pointers
4-6 points: Likely fast & slow, consider it
0-3 points: Probably a different pattern
```

---

### Anti-Patterns (When NOT to Use)

DON'T use fast & slow if:

1. **Need to track all elements**
   - Example: "Return all nodes in the cycle"
   - Better: Use HashSet to track visited nodes

2. **Need multiple pointers at different positions**
   - Example: "Three sum problem"
   - Better: Use multiple pointers pattern

3. **Array with random access**
   - Example: "Find middle of array"
   - Better: Just use `arr[arr.length / 2]`

4. **Need to modify structure while traversing**
   - Example: "Delete nodes while finding middle"
   - Better: Two-pass approach

---

## Key Takeaways

### Core Concepts
1. **Two speeds, one goal**: Slow moves 1 step, fast moves 2 steps - this ratio is crucial
2. **Space efficient**: O(1) space compared to O(n) HashSet approach
3. **Cycle detection**: Fast will eventually meet slow if cycle exists (guaranteed!)
4. **Middle finding**: When fast reaches end, slow is at middle position
5. **Mathematical foundation**: Floyd's Cycle Detection algorithm has rigorous mathematical proof

### Technical Points
6. **Always check null**: Check both `fast` and `fast.next` before moving fast pointer
7. **Reference equality**: Use `===` to compare nodes, not `.val` (same object, not same value)
8. **Move before checking**: Move pointers first, then check if they meet
9. **Handle edge cases**: Empty list, single node, single node with self-cycle
10. **2x is optimal**: Using 3x or higher speed can miss cycles (fast jumps over slow)

### Problem-Solving Strategy
11. **Pattern recognition**: Look for "cycle", "middle", "O(1) space", "linked list" keywords
12. **Know variations**: Cycle start, palindrome check, k-th from end all use this pattern
13. **Draw diagrams**: Visual representation helps in interviews and debugging
14. **Test thoroughly**: Test with empty, single node, two nodes, cycle, no cycle cases
15. **Beyond linked lists**: Works for any sequence (arrays with indices, number transformations)

### Interview Success
16. **Explain the analogy**: Use tortoise and hare story to demonstrate understanding
17. **Mention space advantage**: Always highlight O(1) space vs HashSet's O(n)
18. **Verbalize thought process**: Explain why you check `fast.next` before accessing `fast.next.next`
19. **Know the math**: Understand why distance from head equals distance from meeting point
20. **Practice variations**: Don't just memorize - understand how to adapt the pattern

---

## Beginner's Quick Reference

### The 3 Core Uses

**1. Cycle Detection**
```typescript
while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;  // Cycle found!
}
return false;  // No cycle
```

**2. Find Middle**
```typescript
while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
}
return slow;  // Slow is at middle
```

**3. Find Cycle Start**
```typescript
// Phase 1: Detect cycle
while (fast && fast.next) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) break;
}
if (!fast || !fast.next) return null;  // No cycle

// Phase 2: Find start
slow = head;
while (slow !== fast) {
    slow = slow!.next;
    fast = fast!.next;
}
return slow;  // Cycle start
```

### Mental Model (Simple!)

Think of it as a race:
- **Slow** = turtle, takes 1 step
- **Fast** = rabbit, takes 2 steps

**On a circular track:** Rabbit will eventually lap turtle
**On a straight path:** Rabbit reaches end first, turtle is in middle

### Common Mistakes Checklist

Before submitting, verify:
- [ ] Checked both `fast` AND `fast.next` in loop condition
- [ ] Compared pointers with `===`, not values with `.val`
- [ ] Handled edge cases (null, single node)
- [ ] Moved pointers BEFORE checking if they meet
- [ ] Fast takes 2 steps (not 1, not 3)

### When to Use This Pattern?

**YES, use it:**
- Linked list + cycle detection
- Linked list + find middle
- Linked list + O(1) space requirement
- Sequence with cycles (arrays as graphs)

**NO, don't use it:**
- Arrays with random access (just use index)
- Need to track all visited nodes
- Multiple separate cycles
- Tree traversal (use DFS/BFS instead)

---

## Final Thoughts for Beginners

The Fast & Slow Pointers pattern is like a superpower for linked list problems. Once you understand the core concept (two pointers moving at different speeds), you can solve many problems that seem impossible at first.

**Start here:**
1. Master basic cycle detection (LeetCode 141)
2. Practice finding middle (LeetCode 876)
3. Learn cycle start (LeetCode 142)
4. Then tackle variations (palindrome, reorder, etc.)

**Remember:** The pattern is simple, but the applications are powerful. Don't rush - take time to understand WHY it works, not just HOW to code it. Draw diagrams, trace through examples, and explain it to someone else. That's when it truly clicks!

Happy coding!

---

[← Previous: Sliding Window](./03-sliding-window.md) | [Back to Index](./README.md) | [Next: In-place Reversal →](./05-linkedlist-in-place-reversal.md)
