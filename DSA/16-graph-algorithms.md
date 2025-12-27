# Graph Algorithms Pattern

## What are Graph Algorithms? (In Simple Words)

Imagine you're looking at a **subway map**, a **social network like Facebook**, or a **city's road system**. All of these are **graphs** - collections of points (called **nodes** or **vertices**) connected by lines (called **edges**).

**Graph algorithms** are techniques for:
- Finding the best route between two places (shortest path)
- Detecting whether you can get stuck in a loop (cycle detection)
- Figuring out the order to complete tasks with dependencies (topological sort)
- Finding groups of connected friends (connected components)
- Discovering if everyone in a network is reachable (graph traversal)

### Real-World Analogy 1: GPS Navigation 🗺️

Think of **Google Maps** finding the fastest route to work:
- **Cities** = nodes/vertices
- **Roads** = edges
- **Distance/Time** = edge weights
- **Your route** = path through the graph
- **Fastest route** = shortest path algorithm (Dijkstra's)

```
Your House --15min--> Coffee Shop --10min--> Office
     |                                          ↑
     +-------------25min-----------------------+

Shortest path: House → Coffee → Office (25 min)
Direct path: House → Office (25 min)
Both are equal!
```

### Real-World Analogy 2: Course Prerequisites 📚

Think of **college courses** where some require others first:
- **Courses** = nodes
- **"Must take before"** = directed edges
- **Can you graduate?** = no cycles in the graph
- **Order to take courses** = topological sort

```
Math 101 → Math 201 → Math 301
   ↓
Physics 101 → Physics 201

Valid order: Math101, Physics101, Math201, Physics201, Math301
```

### Real-World Analogy 3: Social Network 👥

Think of **Facebook friend connections**:
- **People** = nodes
- **Friendships** = undirected edges
- **Friend groups** = connected components
- **Degrees of separation** = shortest path between people

```
Alice --- Bob --- Charlie
  |               |
  +--- David -----+

Alice's network: {Alice, Bob, Charlie, David}
Alice to Charlie: Alice → Bob → Charlie (2 hops)
```

---

## Pattern Overview

**Graph Algorithms** involve traversing and analyzing graph structures (vertices/nodes connected by edges). Graphs can be directed/undirected, weighted/unweighted, cyclic/acyclic, and represent many real-world problems.

### When to Use
- Network/social network problems
- Path finding (shortest path, all paths)
- Cycle detection
- Topological sorting
- Connected components
- Dependency resolution

### Key Characteristics
- Graph representation: Adjacency list, adjacency matrix, edge list
- Common algorithms: DFS, BFS, Dijkstra, Union-Find
- Can be directed or undirected
- May have weights on edges

### Pattern Identification
Look for this pattern when you see:
- "Find shortest path"
- "Course prerequisites" (topological sort)
- "Network delay time" (weighted shortest path)
- "Detect cycle"
- "Connected components"
- "Clone graph"

---

## Graph Representation: How to Store a Graph

### 1. Adjacency List (Most Common) ⭐

**Best for**: Sparse graphs (few edges)

```javascript
// Example: 0 → 1, 0 → 2, 1 → 2
const graph = {
    0: [1, 2],
    1: [2],
    2: []
};

// Or as array of arrays:
const graph = [
    [1, 2],  // node 0's neighbors
    [2],     // node 1's neighbors
    []       // node 2's neighbors
];

// Weighted graph:
const graph = {
    0: [[1, 5], [2, 3]],  // [neighbor, weight]
    1: [[2, 2]],
    2: []
};
```

**Memory**: O(V + E) where V = vertices, E = edges

### 2. Adjacency Matrix

**Best for**: Dense graphs, fast edge lookup

```javascript
// Same graph: 0 → 1, 0 → 2, 1 → 2
const graph = [
    [0, 1, 1],  // row 0: edges from node 0
    [0, 0, 1],  // row 1: edges from node 1
    [0, 0, 0]   // row 2: edges from node 2
];

// graph[i][j] = 1 means edge from i to j
// graph[i][j] = 0 means no edge

// Weighted graph:
const graph = [
    [0, 5, 3],  // 0→1 weight 5, 0→2 weight 3
    [0, 0, 2],  // 1→2 weight 2
    [0, 0, 0]
];
```

**Memory**: O(V²) - uses lots of space!

### 3. Edge List

**Best for**: Simple iteration over all edges

```javascript
const edges = [
    [0, 1],  // edge from 0 to 1
    [0, 2],  // edge from 0 to 2
    [1, 2]   // edge from 1 to 2
];

// Weighted:
const edges = [
    [0, 1, 5],  // from, to, weight
    [0, 2, 3],
    [1, 2, 2]
];
```

**Memory**: O(E)

---

## Example 1: Course Schedule (JavaScript)

### Problem
There are `numCourses` courses labeled from 0 to numCourses-1. You are given an array `prerequisites` where `prerequisites[i] = [a, b]` indicates you must take course b before course a. Return `true` if you can finish all courses (no cycle in dependency graph).

**LeetCode**: [207. Course Schedule](https://leetcode.com/problems/course-schedule/)

### Solution

```javascript
/**
 * Detect cycle in directed graph using DFS (topological sort approach)
 * @param {number} numCourses - Number of courses
 * @param {number[][]} prerequisites - [course, prerequisite] pairs
 * @return {boolean} - True if can finish all courses
 */
function canFinish(numCourses, prerequisites) {
    // Build adjacency list
    const graph = Array.from({ length: numCourses }, () => []);

    for (const [course, prereq] of prerequisites) {
        graph[prereq].push(course);
    }

    // Track visited states: 0=unvisited, 1=visiting, 2=visited
    const visited = new Array(numCourses).fill(0);

    function hasCycle(course) {
        if (visited[course] === 1) {
            // Currently visiting - found cycle!
            return true;
        }

        if (visited[course] === 2) {
            // Already fully processed
            return false;
        }

        // Mark as visiting
        visited[course] = 1;

        // Check all neighbors
        for (const neighbor of graph[course]) {
            if (hasCycle(neighbor)) {
                return true;
            }
        }

        // Mark as visited (fully processed)
        visited[course] = 2;
        return false;
    }

    // Check each course for cycles
    for (let i = 0; i < numCourses; i++) {
        if (hasCycle(i)) {
            return false;  // Cycle detected
        }
    }

    return true;  // No cycles, can finish all courses
}

/**
 * Alternative: BFS approach (Kahn's algorithm for topological sort)
 * @param {number} numCourses
 * @param {number[][]} prerequisites
 * @return {boolean}
 */
function canFinishBFS(numCourses, prerequisites) {
    // Build graph and indegree count
    const graph = Array.from({ length: numCourses }, () => []);
    const indegree = new Array(numCourses).fill(0);

    for (const [course, prereq] of prerequisites) {
        graph[prereq].push(course);
        indegree[course]++;
    }

    // Start with courses that have no prerequisites
    const queue = [];
    for (let i = 0; i < numCourses; i++) {
        if (indegree[i] === 0) {
            queue.push(i);
        }
    }

    let processed = 0;

    while (queue.length > 0) {
        const course = queue.shift();
        processed++;

        // Remove this course from graph
        for (const neighbor of graph[course]) {
            indegree[neighbor]--;

            // If neighbor has no more prerequisites, add to queue
            if (indegree[neighbor] === 0) {
                queue.push(neighbor);
            }
        }
    }

    // If processed all courses, no cycle exists
    return processed === numCourses;
}

// Example usage
console.log(canFinish(2, [[1, 0]]));  // Output: true
// Explanation: Take course 0, then course 1

console.log(canFinish(2, [[1, 0], [0, 1]]));  // Output: false
// Explanation: Circular dependency

console.log(canFinishBFS(4, [[1, 0], [2, 0], [3, 1], [3, 2]]));  // Output: true
// Explanation: Valid order exists: 0 → 1 → 2 → 3 or 0 → 2 → 1 → 3
```

### Step-by-Step Walkthrough: DFS Cycle Detection

Let's trace through `canFinish(4, [[1,0], [2,0], [3,1], [3,2]])`:

```
Graph visualization:
    0 → 1 → 3
    ↓       ↑
    2 ------+

Adjacency list:
graph = {
    0: [1, 2],
    1: [3],
    2: [3],
    3: []
}

visited = [0, 0, 0, 0]  // All WHITE (unvisited)

Step 1: Start DFS from course 0
  visited[0] = 1  // Mark GRAY (visiting)

  Explore neighbor 1:
    visited[1] = 1  // Mark GRAY

    Explore neighbor 3:
      visited[3] = 1  // Mark GRAY
      No neighbors
      visited[3] = 2  // Mark BLACK (done)

    visited[1] = 2  // Mark BLACK

  Explore neighbor 2:
    visited[2] = 1  // Mark GRAY

    Explore neighbor 3:
      visited[3] === 2  // Already BLACK, skip

    visited[2] = 2  // Mark BLACK

  visited[0] = 2  // Mark BLACK

Step 2: Continue checking courses 1, 2, 3
  All already BLACK (visited[i] === 2), skip

Result: No cycles found, return true!
```

**Why Three States?**

```
WHITE (0) = Haven't visited yet
GRAY (1)  = Currently exploring (in recursion stack)
BLACK (2) = Done exploring

If we encounter a GRAY node → CYCLE!
(We're revisiting a node that's still being explored)
```

### Step-by-Step Walkthrough: Kahn's Algorithm (BFS)

Let's trace through `canFinishBFS(4, [[1,0], [2,0], [3,1], [3,2]])`:

```
Prerequisites: [[1,0], [2,0], [3,1], [3,2]]

Build graph and indegree:
graph = {
    0: [1, 2],
    1: [3],
    2: [3],
    3: []
}

indegree = [0, 1, 1, 2]
           ^  ^  ^  ^
Course:    0  1  2  3
Meaning:   0 has no prereqs
           1 needs 1 prereq (0)
           2 needs 1 prereq (0)
           3 needs 2 prereqs (1 and 2)

Step 1: Initialize queue with courses having indegree 0
queue = [0]
processed = 0

Step 2: Process course 0
  queue.shift() → 0
  processed = 1
  Remove edges: 0→1, 0→2
  indegree = [0, 0, 0, 2]
                 ^  ^
  Add to queue: 1, 2
  queue = [1, 2]

Step 3: Process course 1
  queue.shift() → 1
  processed = 2
  Remove edge: 1→3
  indegree = [0, 0, 0, 1]
                       ^
  queue = [2]

Step 4: Process course 2
  queue.shift() → 2
  processed = 3
  Remove edge: 2→3
  indegree = [0, 0, 0, 0]
                       ^
  Add to queue: 3
  queue = [3]

Step 5: Process course 3
  queue.shift() → 3
  processed = 4
  No neighbors
  queue = []

Step 6: Check result
  processed === numCourses (4 === 4)
  Return true!

Valid order: 0 → 1 → 2 → 3 (or 0 → 2 → 1 → 3)
```

### Explanation

**DFS Cycle Detection**:
```
Three states for each node:
0 (white) = unvisited
1 (gray) = currently visiting (in recursion stack)
2 (black) = fully visited

If we encounter a gray node, we found a cycle!
```

**Visual Example**:
```
Graph: 0 → 1 → 2
       ↓
       3

Prerequisites: [[1,0], [2,1], [3,0]]

DFS from 0:
  Visit 0 (mark gray)
    Visit 1 (mark gray)
      Visit 2 (mark gray)
      2 has no neighbors (mark black)
    1 done (mark black)
    Visit 3 (mark gray)
    3 has no neighbors (mark black)
  0 done (mark black)

No gray nodes revisited → No cycle → Can finish
```

**Kahn's Algorithm (BFS)**:
1. Calculate indegree (incoming edges) for each node
2. Add nodes with indegree 0 to queue
3. Process queue:
   - Remove node and decrease indegree of neighbors
   - Add neighbors with indegree 0 to queue
4. If processed all nodes → no cycle

---

## Example 2: Network Delay Time (Python)

### Problem
You are given a network of `n` nodes labeled 1 to n, and `times`, an array of travel times as directed edges `times[i] = (u, v, w)` where `u` is source, `v` is target, and `w` is the time for signal to travel. Send signal from node `k`. Return minimum time for all nodes to receive signal, or -1 if impossible.

**LeetCode**: [743. Network Delay Time](https://leetcode.com/problems/network-delay-time/)

### Solution

```python
from typing import List
import heapq
from collections import defaultdict

class Solution:
    def networkDelayTime(self, times: List[List[int]], n: int, k: int) -> int:
        """
        Find shortest path to all nodes using Dijkstra's algorithm

        Args:
            times: Directed weighted edges [source, target, time]
            n: Number of nodes (1 to n)
            k: Starting node

        Returns:
            Minimum time for signal to reach all nodes, or -1 if impossible
        """
        # Build adjacency list
        graph = defaultdict(list)
        for u, v, w in times:
            graph[u].append((v, w))  # (neighbor, weight)

        # Dijkstra's algorithm
        min_heap = [(0, k)]  # (time, node)
        visited = set()
        max_time = 0

        while min_heap:
            time, node = heapq.heappop(min_heap)

            # Skip if already visited
            if node in visited:
                continue

            # Mark as visited and update max time
            visited.add(node)
            max_time = max(max_time, time)

            # Explore neighbors
            for neighbor, weight in graph[node]:
                if neighbor not in visited:
                    heapq.heappush(min_heap, (time + weight, neighbor))

        # Check if all nodes were visited
        return max_time if len(visited) == n else -1

    def networkDelayTimeBellmanFord(self, times: List[List[int]], n: int, k: int) -> int:
        """
        Alternative: Bellman-Ford algorithm
        Works with negative weights (though not needed here)
        """
        # Initialize distances
        dist = [float('inf')] * (n + 1)
        dist[k] = 0

        # Relax edges n-1 times
        for _ in range(n - 1):
            for u, v, w in times:
                if dist[u] != float('inf') and dist[u] + w < dist[v]:
                    dist[v] = dist[u] + w

        # Find maximum distance
        max_dist = max(dist[1:])
        return max_dist if max_dist != float('inf') else -1

# Example usage
solution = Solution()

# Example 1
times1 = [[2, 1, 1], [2, 3, 1], [3, 4, 1]]
n1 = 4
k1 = 2
print(solution.networkDelayTime(times1, n1, k1))  # Output: 2
# Explanation:
# Node 2 → Node 1: time 1
# Node 2 → Node 3: time 1
# Node 3 → Node 4: time 1 (total from 2: 2)
# Max time: 2

# Example 2
times2 = [[1, 2, 1]]
n2 = 2
k2 = 1
print(solution.networkDelayTime(times2, n2, k2))  # Output: 1

# Example 3
times3 = [[1, 2, 1]]
n3 = 2
k3 = 2
print(solution.networkDelayTime(times3, n3, k3))  # Output: -1
# Explanation: Node 1 is unreachable from node 2

# Example 4 - Using Bellman-Ford
times4 = [[2, 1, 1], [2, 3, 1], [3, 4, 1]]
n4 = 4
k4 = 2
print(solution.networkDelayTimeBellmanFord(times4, n4, k4))  # Output: 2
```

### Step-by-Step Walkthrough: Dijkstra's Algorithm

Let's trace through `networkDelayTime([[2,1,1], [2,3,1], [3,4,1]], 4, 2)`:

```
Graph visualization:
  2 --1--> 1
  |
  1
  ↓
  3 --1--> 4

Adjacency list:
graph = {
    2: [(1, 1), (3, 1)],
    3: [(4, 1)],
    1: [],
    4: []
}

Initial state:
min_heap = [(0, 2)]  // (time, node)
visited = {}
max_time = 0

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iteration 1: Process node 2 (time=0)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pop: (0, 2)
Not in visited, so continue
visited = {2}
max_time = max(0, 0) = 0

Explore neighbors of 2:
  - Neighbor 1, weight 1:
    Not visited, push (0+1, 1) = (1, 1)
  - Neighbor 3, weight 1:
    Not visited, push (0+1, 3) = (1, 3)

min_heap = [(1, 1), (1, 3)]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iteration 2: Process node 1 (time=1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pop: (1, 1)  // Min heap picks smallest time
Not in visited, so continue
visited = {2, 1}
max_time = max(0, 1) = 1

Explore neighbors of 1:
  - No neighbors

min_heap = [(1, 3)]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iteration 3: Process node 3 (time=1)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pop: (1, 3)
Not in visited, so continue
visited = {2, 1, 3}
max_time = max(1, 1) = 1

Explore neighbors of 3:
  - Neighbor 4, weight 1:
    Not visited, push (1+1, 4) = (2, 4)

min_heap = [(2, 4)]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Iteration 4: Process node 4 (time=2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Pop: (2, 4)
Not in visited, so continue
visited = {2, 1, 3, 4}
max_time = max(1, 2) = 2

Explore neighbors of 4:
  - No neighbors

min_heap = []

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Final result:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

visited has 4 nodes, n = 4
All nodes reached!
Return max_time = 2
```

**Why Use a Min-Heap?**

```
Without min-heap (wrong):
  Process in any order → might not find shortest path

With min-heap (correct):
  Always process closest unvisited node first
  Guarantees we find shortest path to each node

Example:
  If heap has [(5, A), (2, B), (8, C)]
  We process B first (smallest time)
  This ensures we find optimal paths
```

### Explanation

**Dijkstra's Algorithm**:
1. Use min-heap to always process nearest unvisited node
2. Track visited nodes to avoid reprocessing
3. For each node, explore neighbors and update distances
4. Return max time when all nodes visited

**Visual Example**:
```
Graph (k=2):
  2 --1--> 1
  |
  1
  ↓
  3 --1--> 4

Step 1: Start at node 2 (time=0)
  heap = [(0, 2)]
  visited = {}

Step 2: Process node 2
  Visit neighbors: 1 (time=1), 3 (time=1)
  heap = [(1, 1), (1, 3)]
  visited = {2}
  max_time = 0

Step 3: Process node 1 (time=1)
  No unvisited neighbors
  heap = [(1, 3)]
  visited = {2, 1}
  max_time = 1

Step 4: Process node 3 (time=1)
  Visit neighbor: 4 (time=2)
  heap = [(2, 4)]
  visited = {2, 1, 3}
  max_time = 1

Step 5: Process node 4 (time=2)
  No unvisited neighbors
  heap = []
  visited = {2, 1, 3, 4}
  max_time = 2

Result: 2 (all nodes visited, max time is 2)
```

---

## Example 3: Union-Find (Disjoint Set)

### What is Union-Find? (In Simple Words)

Imagine you're at a **party** and want to figure out **friend groups**:
- Initially, everyone is their own group
- When two people become friends, merge their groups
- You can quickly check if two people are in the same group

**Union-Find** efficiently handles:
- **Find**: Which group does this person belong to?
- **Union**: Merge two groups together

### Implementation

```javascript
class UnionFind {
    constructor(n) {
        // Each node is its own parent initially
        this.parent = Array.from({ length: n }, (_, i) => i);

        // Optimization: track tree size for union by rank
        this.rank = new Array(n).fill(1);

        // Track number of connected components
        this.components = n;
    }

    /**
     * Find root parent with path compression
     * @param {number} x - Node to find
     * @return {number} - Root parent
     */
    find(x) {
        // Path compression: make x point directly to root
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    /**
     * Union two sets
     * @param {number} x - First node
     * @param {number} y - Second node
     * @return {boolean} - True if union happened, false if already connected
     */
    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);

        // Already in same set
        if (rootX === rootY) {
            return false;
        }

        // Union by rank: attach smaller tree to larger tree
        if (this.rank[rootX] > this.rank[rootY]) {
            this.parent[rootY] = rootX;
        } else if (this.rank[rootX] < this.rank[rootY]) {
            this.parent[rootX] = rootY;
        } else {
            this.parent[rootY] = rootX;
            this.rank[rootX]++;
        }

        this.components--;
        return true;
    }

    /**
     * Check if two nodes are connected
     * @param {number} x - First node
     * @param {number} y - Second node
     * @return {boolean}
     */
    connected(x, y) {
        return this.find(x) === this.find(y);
    }

    /**
     * Get number of connected components
     * @return {number}
     */
    getComponents() {
        return this.components;
    }
}

// Example: Detect redundant connection
function findRedundantConnection(edges) {
    const n = edges.length;
    const uf = new UnionFind(n + 1);

    for (const [u, v] of edges) {
        // If union returns false, these nodes are already connected
        // This edge creates a cycle!
        if (!uf.union(u, v)) {
            return [u, v];
        }
    }

    return [];
}

// Example usage
console.log(findRedundantConnection([[1,2], [1,3], [2,3]]));
// Output: [2,3]
// Edges [1,2] and [1,3] connect nodes fine
// Edge [2,3] creates a cycle (2 and 3 already connected through 1)

console.log(findRedundantConnection([[1,2], [2,3], [3,4], [1,4], [1,5]]));
// Output: [1,4]
// [1,4] creates a cycle (1 and 4 already connected through 2→3)
```

### Step-by-Step Walkthrough: Union-Find

Let's trace `findRedundantConnection([[1,2], [1,3], [2,3]])`:

```
Initial state (3 nodes):
parent = [0, 1, 2, 3]
         ^  ^  ^  ^
Index:   0  1  2  3
Meaning: 1's parent is 1 (itself)
         2's parent is 2 (itself)
         3's parent is 3 (itself)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Edge 1: [1, 2]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

union(1, 2):
  find(1) → 1 (1's parent is 1)
  find(2) → 2 (2's parent is 2)
  rootX ≠ rootY, so connect them
  parent[2] = 1

parent = [0, 1, 1, 3]
             ^  ^
            1  2
Graph: 1 - 2

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Edge 2: [1, 3]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

union(1, 3):
  find(1) → 1
  find(3) → 3
  rootX ≠ rootY, so connect them
  parent[3] = 1

parent = [0, 1, 1, 1]
             ^  ^  ^
            1  2  3
Graph: 1 - 2
       |
       3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Edge 3: [2, 3]  ⚠️ CYCLE!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

union(2, 3):
  find(2):
    parent[2] = 1, not equal to 2
    So find(1) → 1
    Result: 1

  find(3):
    parent[3] = 1, not equal to 3
    So find(1) → 1
    Result: 1

  rootX === rootY (both are 1)
  Already connected!
  Return false → This edge is redundant!

Return [2, 3] ✓
```

**Why Path Compression?**

```
Before path compression:
  1 → 2 → 3 → 4 → 5
  To find 5's root: traverse 4 nodes

After path compression (first find(5)):
  1 ← 2
  ↑   ↑
  5   3
      ↑
      4

All nodes point directly to root!
Next find(5): only 1 hop!
```

---

## Common Graph Algorithm Templates

### Template 1: DFS (Recursive)

```javascript
function dfs(graph, node, visited) {
    // Mark current node as visited
    visited.add(node);

    // Process current node
    console.log(node);

    // Explore all neighbors
    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}

// Usage
const visited = new Set();
dfs(graph, startNode, visited);
```

### Template 2: DFS (Iterative with Stack)

```javascript
function dfsIterative(graph, start) {
    const visited = new Set();
    const stack = [start];

    while (stack.length > 0) {
        const node = stack.pop();

        if (visited.has(node)) continue;

        visited.add(node);
        console.log(node);

        // Add neighbors to stack
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                stack.push(neighbor);
            }
        }
    }
}
```

### Template 3: BFS (Level-Order)

```javascript
function bfs(graph, start) {
    const visited = new Set([start]);
    const queue = [start];

    while (queue.length > 0) {
        const node = queue.shift();
        console.log(node);

        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
}
```

### Template 4: Dijkstra's Shortest Path

```javascript
function dijkstra(graph, start, n) {
    const distances = new Array(n).fill(Infinity);
    distances[start] = 0;

    const minHeap = [[0, start]];  // [distance, node]
    const visited = new Set();

    while (minHeap.length > 0) {
        const [dist, node] = minHeap.shift();  // In real code, use priority queue

        if (visited.has(node)) continue;
        visited.add(node);

        for (const [neighbor, weight] of graph[node]) {
            const newDist = dist + weight;
            if (newDist < distances[neighbor]) {
                distances[neighbor] = newDist;
                minHeap.push([newDist, neighbor]);
                minHeap.sort((a, b) => a[0] - b[0]);  // Maintain min-heap
            }
        }
    }

    return distances;
}
```

---

## Frequently Asked Questions (FAQs)

### 1. When should I use DFS vs BFS?

**Use DFS when**:
- You need to explore all paths (backtracking)
- Detecting cycles in directed graphs
- Topological sorting
- Finding connected components
- Memory is limited (DFS uses less memory)

**Use BFS when**:
- Finding shortest path (unweighted graph)
- Level-order traversal
- Finding nodes within k distance
- Minimum steps problems

```javascript
// DFS: Goes deep first
Graph:    1
         /  \
        2    3
       / \
      4   5

DFS order: 1 → 2 → 4 → 5 → 3

// BFS: Goes level by level
BFS order: 1 → 2 → 3 → 4 → 5
```

### 2. What's the difference between directed and undirected graphs?

**Directed** (one-way streets):
```javascript
// Edge from A to B doesn't mean B to A
graph = {
    'A': ['B'],
    'B': []
}
// A → B (can't go B → A)
```

**Undirected** (two-way streets):
```javascript
// Edge between A and B goes both ways
graph = {
    'A': ['B'],
    'B': ['A']
}
// A ↔ B (can go either direction)
```

### 3. How do I detect a cycle in a graph?

**Undirected graph** (use parent tracking):
```javascript
function hasCycleUndirected(graph, node, visited, parent) {
    visited.add(node);

    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            if (hasCycleUndirected(graph, neighbor, visited, node)) {
                return true;
            }
        } else if (neighbor !== parent) {
            // Visited neighbor that's not our parent = cycle!
            return true;
        }
    }

    return false;
}
```

**Directed graph** (use three states):
```javascript
function hasCycleDirected(graph, node, visiting, visited) {
    if (visiting.has(node)) return true;  // Cycle!
    if (visited.has(node)) return false;

    visiting.add(node);

    for (const neighbor of graph[node]) {
        if (hasCycleDirected(graph, neighbor, visiting, visited)) {
            return true;
        }
    }

    visiting.delete(node);
    visited.add(node);
    return false;
}
```

### 4. What is topological sort and when do I use it?

**Topological sort** finds a valid ordering of tasks with dependencies.

**Use cases**:
- Course prerequisites
- Build systems (compile order)
- Task scheduling
- Package dependency resolution

**Example**:
```
Courses: A → B → D
         A → C → D

Topological order: A, B, C, D (or A, C, B, D)
Must take A before B or C
Must take B and C before D
```

**Two approaches**:
1. **DFS** (postorder): Add to result after exploring all neighbors
2. **Kahn's algorithm** (BFS): Process nodes with indegree 0

### 5. When should I use Union-Find vs DFS/BFS?

**Use Union-Find when**:
- Dynamic connectivity queries
- Detecting cycles in undirected graphs
- Finding connected components
- Kruskal's MST algorithm

**Use DFS/BFS when**:
- Need to find paths
- Need to explore all nodes
- Directed graphs
- Distance/level information needed

```javascript
// Union-Find: O(α(n)) ≈ O(1) per operation
// Great for: "Are these nodes connected?"

// DFS/BFS: O(V + E) for full traversal
// Great for: "Find path from A to B"
```

### 6. How does Dijkstra's algorithm work?

**Dijkstra's** finds shortest path in **weighted graphs** (no negative weights).

**Key idea**: Always expand the closest unvisited node

```
Graph:    A --5--> B
          |        |
          2        3
          ↓        ↓
          C --1--> D

From A to D:
  A → C → D = 2 + 1 = 3 (shortest)
  A → B → D = 5 + 3 = 8

Dijkstra explores:
1. Start at A (dist=0)
2. Explore C (dist=2) - closest
3. Explore D (dist=3) - next closest
4. Done! (D is our target)
```

### 7. What's the difference between Dijkstra and Bellman-Ford?

| Feature | Dijkstra | Bellman-Ford |
|---------|----------|--------------|
| **Negative weights** | ❌ No | ✅ Yes |
| **Time complexity** | O((V+E) log V) | O(V×E) |
| **Algorithm type** | Greedy | Dynamic Programming |
| **When to use** | Fastest for non-negative | When negatives possible |

```javascript
// Dijkstra: Use min-heap, greedy
// Bellman-Ford: Relax all edges V-1 times

// Example with negative weight:
Graph: A --5--> B
       |        |
       |       -3  (negative!)
       ↓        ↓
       C --1--> D

Dijkstra might fail (assumes greedy is optimal)
Bellman-Ford handles correctly: A → B → D = 5 + (-3) = 2
```

---

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Forgetting to Mark Nodes as Visited ⚠️

**Problem**:
```javascript
// WRONG: Infinite loop!
function dfs(graph, node) {
    console.log(node);
    for (const neighbor of graph[node]) {
        dfs(graph, neighbor);  // No visited check!
    }
}
```

**Fix**:
```javascript
// CORRECT: Track visited nodes
function dfs(graph, node, visited = new Set()) {
    if (visited.has(node)) return;  // ✓ Prevent infinite loop

    visited.add(node);
    console.log(node);

    for (const neighbor of graph[node]) {
        dfs(graph, neighbor, visited);
    }
}
```

**Why it happens**: Graphs can have cycles! Without visited tracking, you'll loop forever.

---

### Pitfall 2: Using DFS for Shortest Path in Unweighted Graphs ⚠️

**Problem**:
```javascript
// WRONG: DFS doesn't guarantee shortest path
function shortestPath(graph, start, end) {
    function dfs(node, path) {
        if (node === end) return path.length;

        let minPath = Infinity;
        for (const neighbor of graph[node]) {
            if (!path.includes(neighbor)) {
                minPath = Math.min(minPath, dfs(neighbor, [...path, neighbor]));
            }
        }
        return minPath;
    }
    return dfs(start, [start]);
}
// This works but is inefficient and complicated!
```

**Fix**:
```javascript
// CORRECT: Use BFS for shortest path in unweighted graphs
function shortestPath(graph, start, end) {
    const queue = [[start, 0]];  // [node, distance]
    const visited = new Set([start]);

    while (queue.length > 0) {
        const [node, dist] = queue.shift();

        if (node === end) return dist;  // ✓ First time we reach = shortest

        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push([neighbor, dist + 1]);
            }
        }
    }
    return -1;
}
```

**Why**: BFS explores level by level, guaranteeing the first path found is shortest.

---

### Pitfall 3: Modifying Graph During Traversal ⚠️

**Problem**:
```javascript
// WRONG: Modifying while iterating
function removeEdges(graph, node) {
    for (const neighbor of graph[node]) {
        graph[node] = graph[node].filter(n => n !== neighbor);  // ⚠️ Bad!
        // Modifying array while iterating causes issues
    }
}
```

**Fix**:
```javascript
// CORRECT: Create copy or clear after iteration
function removeEdges(graph, node) {
    const neighbors = [...graph[node]];  // ✓ Copy first
    for (const neighbor of neighbors) {
        graph[node] = graph[node].filter(n => n !== neighbor);
    }

    // Or simply:
    graph[node] = [];  // ✓ Clear all at once
}
```

---

### Pitfall 4: Not Handling Disconnected Components ⚠️

**Problem**:
```javascript
// WRONG: Only explores from one starting node
function countNodes(graph) {
    const visited = new Set();
    dfs(graph, 0, visited);
    return visited.size;  // ⚠️ Misses disconnected nodes!
}
```

**Fix**:
```javascript
// CORRECT: Explore from all unvisited nodes
function countComponents(graph) {
    const visited = new Set();
    let components = 0;

    for (let node = 0; node < graph.length; node++) {
        if (!visited.has(node)) {
            dfs(graph, node, visited);  // ✓ Explore this component
            components++;
        }
    }

    return components;
}
```

**Example**:
```
Graph: 0 - 1    2 - 3    4
       (component 1) (component 2) (component 3)

Starting only from 0 misses components 2 and 3!
```

---

### Pitfall 5: Wrong Cycle Detection in Undirected Graphs ⚠️

**Problem**:
```javascript
// WRONG: Detects false cycles in undirected graphs
function hasCycle(graph, node, visited) {
    visited.add(node);

    for (const neighbor of graph[node]) {
        if (visited.has(neighbor)) {
            return true;  // ⚠️ Wrong! Could be the parent
        }
        if (hasCycle(graph, neighbor, visited)) {
            return true;
        }
    }
    return false;
}
```

**Why wrong**:
```
Graph: A - B

Starting from A:
  Visit A, then B
  B explores neighbors and finds A
  A is visited → falsely reports cycle!

But there's no cycle, just the edge we came from!
```

**Fix**:
```javascript
// CORRECT: Track parent to avoid false positives
function hasCycle(graph, node, visited, parent = null) {
    visited.add(node);

    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            if (hasCycle(graph, neighbor, visited, node)) {
                return true;
            }
        } else if (neighbor !== parent) {  // ✓ Ignore parent edge
            return true;  // Real cycle!
        }
    }
    return false;
}
```

---

## Pro Tips for Interviews

### Tip 1: Always Clarify Graph Properties First 🎯

**Before coding**, ask:
1. **Directed or undirected?** (Affects how you build adjacency list)
2. **Weighted or unweighted?** (Affects which algorithm to use)
3. **Can have cycles?** (Affects visited tracking)
4. **Connected or disconnected?** (Affects iteration strategy)
5. **Node labels** (0-indexed? 1-indexed? Strings?)

```javascript
// Example: Building adjacency list

// Undirected:
for (const [u, v] of edges) {
    graph[u].push(v);
    graph[v].push(u);  // ✓ Both directions
}

// Directed:
for (const [u, v] of edges) {
    graph[u].push(v);  // ✓ One direction only
}
```

---

### Tip 2: Draw the Graph! 📝

**Always visualize** before coding:

```
Input: [[1,2], [1,3], [2,4]]

Draw it:
    1
   / \
  2   3
 /
4

Now you can see:
- 4 nodes
- Tree structure (no cycles)
- DFS from 1: 1→2→4→3
- BFS from 1: 1→2→3→4
```

---

### Tip 3: Choose Right Data Structure for Graph Representation 🗂️

| Representation | Space | Edge Lookup | Iterate Neighbors | Best For |
|----------------|-------|-------------|-------------------|----------|
| **Adjacency List** | O(V+E) | O(degree) | O(degree) | Sparse graphs |
| **Adjacency Matrix** | O(V²) | O(1) | O(V) | Dense graphs |
| **Edge List** | O(E) | O(E) | O(E) | Simple iteration |

```javascript
// Sparse graph (few edges): Use adjacency list
const graph = {
    0: [1, 2],
    1: [3],
    2: [],
    3: []
};

// Dense graph (many edges): Consider adjacency matrix
const graph = [
    [0, 1, 1, 1],
    [1, 0, 1, 1],
    [1, 1, 0, 1],
    [1, 1, 1, 0]
];
```

**Interview tip**: Start with adjacency list (most common).

---

### Tip 4: Use Helper Data Structures 🛠️

**Common helpers**:
1. **Visited set**: Prevent revisiting
2. **Parent map**: Reconstruct paths
3. **Distance array**: Track shortest distances
4. **Indegree array**: For topological sort

```javascript
// Example: Finding path with parent tracking
function findPath(graph, start, end) {
    const visited = new Set();
    const parent = new Map();
    const queue = [start];

    parent.set(start, null);

    while (queue.length > 0) {
        const node = queue.shift();

        if (node === end) {
            // Reconstruct path using parent map
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
                parent.set(neighbor, node);  // ✓ Track parent
                queue.push(neighbor);
            }
        }
    }

    return null;
}
```

---

### Tip 5: State Your Time and Space Complexity 🎓

**Always analyze** and state complexity:

```javascript
// Example: DFS
function dfs(graph, node, visited) {
    visited.add(node);
    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}

// State clearly:
// Time: O(V + E) - visit each vertex once, explore each edge once
// Space: O(V) - visited set + recursion stack in worst case
```

**Common complexities**:
- DFS/BFS: O(V + E) time, O(V) space
- Dijkstra: O((V + E) log V) time, O(V) space
- Union-Find: O(α(n)) ≈ O(1) per operation
- Topological Sort: O(V + E) time, O(V) space

---

### Tip 6: Handle Edge Cases 🔍

**Common edge cases**:
1. **Empty graph** (no nodes)
2. **Single node** (no edges)
3. **Disconnected components**
4. **Self-loops** (node connects to itself)
5. **Duplicate edges**

```javascript
function bfs(graph, start) {
    // Edge case: empty graph
    if (!graph || graph.length === 0) return [];

    // Edge case: start node doesn't exist
    if (start < 0 || start >= graph.length) return [];

    // Normal case
    const visited = new Set([start]);
    const queue = [start];
    const result = [];

    while (queue.length > 0) {
        const node = queue.shift();
        result.push(node);

        // Edge case: graph[node] might be undefined
        for (const neighbor of (graph[node] || [])) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }

    return result;
}
```

---

### Tip 7: Know When to Use Each Algorithm 🎯

Quick decision tree:

```
Question: "Find shortest path"
    ↓
Weighted graph?
    ├─ No → Use BFS (O(V+E))
    └─ Yes
        ↓
    Has negative weights?
        ├─ No → Use Dijkstra (O((V+E) log V))
        └─ Yes → Use Bellman-Ford (O(V×E))

Question: "Detect cycle"
    ↓
Directed graph?
    ├─ Yes → Use DFS with 3 states (O(V+E))
    └─ No → Use DFS with parent tracking (O(V+E))
              or Union-Find (O(E α(V)))

Question: "Find connected components"
    ↓
Dynamic queries (components change)?
    ├─ Yes → Use Union-Find (O(α(n)) per query)
    └─ No → Use DFS or BFS (O(V+E))

Question: "Order tasks with dependencies"
    ↓
Use Topological Sort:
    - Kahn's algorithm (BFS) - O(V+E)
    - or DFS postorder - O(V+E)
```

---

## Pattern Recognition Guide

### Recognize: Cycle Detection

**Keywords**: "circular dependency", "detect loop", "can complete", "valid order"

**Examples**:
- Course Schedule (can you finish all courses?)
- Redundant Connection (which edge creates a cycle?)

**Solution**: DFS with states or Union-Find

---

### Recognize: Shortest Path

**Keywords**: "minimum steps", "shortest distance", "fastest route", "least cost"

**Examples**:
- Network Delay Time
- Cheapest Flights Within K Stops

**Solution**: BFS (unweighted) or Dijkstra (weighted)

---

### Recognize: Topological Sort

**Keywords**: "order of tasks", "prerequisites", "dependencies", "valid sequence"

**Examples**:
- Course Schedule II (order to take courses)
- Alien Dictionary (order of letters)

**Solution**: Kahn's algorithm (BFS) or DFS postorder

---

### Recognize: Connected Components

**Keywords**: "number of islands", "friend groups", "connected regions", "clusters"

**Examples**:
- Number of Islands
- Number of Provinces

**Solution**: DFS, BFS, or Union-Find

---

### Recognize: Graph Cloning

**Keywords**: "clone", "deep copy", "duplicate graph"

**Examples**:
- Clone Graph

**Solution**: DFS or BFS with hash map

---

## Time & Space Complexity

### Example 1: Course Schedule
- **DFS approach**:
  - Time: O(V + E) - Visit each vertex and edge once
  - Space: O(V + E) - Graph + recursion stack
- **BFS (Kahn's) approach**:
  - Time: O(V + E)
  - Space: O(V + E) - Graph + queue

### Example 2: Network Delay Time
- **Dijkstra's**:
  - Time: O((V + E) log V) - Heap operations
  - Space: O(V + E) - Graph + heap
- **Bellman-Ford**:
  - Time: O(V × E) - Relax all edges V times
  - Space: O(V) - Distance array

### Example 3: Union-Find
- **Time**: O(α(n)) ≈ O(1) per operation (with path compression + union by rank)
- **Space**: O(V) - Parent and rank arrays

---

## Common Variations

1. **Topological Sort**
   - LeetCode: [207. Course Schedule](https://leetcode.com/problems/course-schedule/)
   - LeetCode: [210. Course Schedule II](https://leetcode.com/problems/course-schedule-ii/)

2. **Shortest Path**
   - LeetCode: [743. Network Delay Time](https://leetcode.com/problems/network-delay-time/)
   - LeetCode: [787. Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/)

3. **Union-Find (Disjoint Set)**
   - LeetCode: [200. Number of Islands](https://leetcode.com/problems/number-of-islands/) (alternative solution)
   - LeetCode: [684. Redundant Connection](https://leetcode.com/problems/redundant-connection/)
   - LeetCode: [547. Number of Provinces](https://leetcode.com/problems/number-of-provinces/)

4. **Clone/Copy Graph**
   - LeetCode: [133. Clone Graph](https://leetcode.com/problems/clone-graph/)

---

## Practice Problems

### Medium
1. [207. Course Schedule](https://leetcode.com/problems/course-schedule/)
2. [210. Course Schedule II](https://leetcode.com/problems/course-schedule-ii/)
3. [133. Clone Graph](https://leetcode.com/problems/clone-graph/)
4. [743. Network Delay Time](https://leetcode.com/problems/network-delay-time/)
5. [323. Number of Connected Components in an Undirected Graph](https://leetcode.com/problems/number-of-connected-components-in-an-undirected-graph/)
6. [684. Redundant Connection](https://leetcode.com/problems/redundant-connection/)
7. [261. Graph Valid Tree](https://leetcode.com/problems/graph-valid-tree/)

### Hard
8. [787. Cheapest Flights Within K Stops](https://leetcode.com/problems/cheapest-flights-within-k-stops/)
9. [269. Alien Dictionary](https://leetcode.com/problems/alien-dictionary/)

---

## 20 Key Takeaways

1. **Graph = nodes + edges** - Represents relationships and connections

2. **Adjacency list** - Most common representation, space-efficient for sparse graphs

3. **DFS uses stack** (recursion or explicit), explores depth-first

4. **BFS uses queue**, explores level by level, finds shortest path (unweighted)

5. **Always track visited nodes** - Prevents infinite loops in graphs with cycles

6. **Three states for cycle detection** (directed graphs): WHITE (unvisited), GRAY (visiting), BLACK (visited)

7. **Parent tracking for cycle detection** (undirected graphs) - Ignore the edge we came from

8. **Topological sort** only exists in DAGs (Directed Acyclic Graphs)

9. **Kahn's algorithm** - BFS approach to topological sort using indegree

10. **Dijkstra's algorithm** - Shortest path in weighted graphs (no negative weights)

11. **Use min-heap in Dijkstra** - Always process closest unvisited node

12. **Bellman-Ford** - Works with negative weights but slower than Dijkstra

13. **Union-Find** - Efficient for dynamic connectivity queries

14. **Path compression + union by rank** - Optimizes Union-Find to nearly O(1)

15. **BFS for shortest path** (unweighted), Dijkstra for weighted

16. **Connected components** - Use DFS/BFS or Union-Find

17. **Disconnected graphs** - Iterate through all nodes, not just one starting point

18. **Time: O(V + E)** for most graph traversals (DFS/BFS)

19. **Space: O(V)** for visited set/array in most algorithms

20. **Draw the graph** in interviews - Helps visualize and catch edge cases

---

## Beginner's Quick Reference Card

### When to Use Each Algorithm

```
┌─────────────────────────────────────────────────────────────┐
│ Problem Type          │ Algorithm         │ Complexity      │
├───────────────────────┼───────────────────┼─────────────────┤
│ Shortest path         │ BFS (unweighted)  │ O(V + E)        │
│ (unweighted)          │                   │                 │
├───────────────────────┼───────────────────┼─────────────────┤
│ Shortest path         │ Dijkstra          │ O((V+E) log V)  │
│ (weighted, no neg)    │                   │                 │
├───────────────────────┼───────────────────┼─────────────────┤
│ Shortest path         │ Bellman-Ford      │ O(V × E)        │
│ (negative weights)    │                   │                 │
├───────────────────────┼───────────────────┼─────────────────┤
│ Cycle detection       │ DFS (3 states)    │ O(V + E)        │
│ (directed)            │                   │                 │
├───────────────────────┼───────────────────┼─────────────────┤
│ Cycle detection       │ DFS (parent)      │ O(V + E)        │
│ (undirected)          │ or Union-Find     │ O(E α(V))       │
├───────────────────────┼───────────────────┼─────────────────┤
│ Topological sort      │ Kahn's (BFS) or   │ O(V + E)        │
│                       │ DFS postorder     │                 │
├───────────────────────┼───────────────────┼─────────────────┤
│ Connected components  │ DFS/BFS or        │ O(V + E) or     │
│                       │ Union-Find        │ O(E α(V))       │
└───────────────────────────────────────────────────────────────┘
```

### Essential Code Templates

**1. DFS (Recursive)**
```javascript
function dfs(graph, node, visited) {
    visited.add(node);
    for (const neighbor of graph[node]) {
        if (!visited.has(neighbor)) {
            dfs(graph, neighbor, visited);
        }
    }
}
```

**2. BFS**
```javascript
function bfs(graph, start) {
    const visited = new Set([start]);
    const queue = [start];
    while (queue.length > 0) {
        const node = queue.shift();
        for (const neighbor of graph[node]) {
            if (!visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
}
```

**3. Cycle Detection (Directed)**
```javascript
function hasCycle(graph, node, visiting, visited) {
    if (visiting.has(node)) return true;
    if (visited.has(node)) return false;

    visiting.add(node);
    for (const neighbor of graph[node]) {
        if (hasCycle(graph, neighbor, visiting, visited)) {
            return true;
        }
    }
    visiting.delete(node);
    visited.add(node);
    return false;
}
```

**4. Union-Find**
```javascript
class UnionFind {
    constructor(n) {
        this.parent = Array.from({length: n}, (_, i) => i);
    }

    find(x) {
        if (this.parent[x] !== x) {
            this.parent[x] = this.find(this.parent[x]);
        }
        return this.parent[x];
    }

    union(x, y) {
        const rootX = this.find(x);
        const rootY = this.find(y);
        if (rootX === rootY) return false;
        this.parent[rootY] = rootX;
        return true;
    }
}
```

---

## Mental Models

### Model 1: Map Navigation 🗺️
- **Nodes** = Cities
- **Edges** = Roads
- **Weights** = Distance/Time
- **Shortest path** = GPS route
- **Connected components** = Road networks

### Model 2: Social Network 👥
- **Nodes** = People
- **Edges** = Friendships
- **BFS** = "Friend of a friend"
- **Connected components** = Friend circles
- **Shortest path** = Degrees of separation

### Model 3: Task Dependencies 📋
- **Nodes** = Tasks
- **Directed edges** = "Must do before"
- **Cycle** = Impossible to complete
- **Topological sort** = Valid order
- **Indegree 0** = Can start now

---

[← Previous: Dynamic Programming](./15-dynamic-programming.md) | [Back to Index](./README.md)
