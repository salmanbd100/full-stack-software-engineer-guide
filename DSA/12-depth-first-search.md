---
title: Depth-First Search
part: 10
chapter: 0
slug: depth-first-search
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-30
tags: [dsa, dfs, graph, grid, recursion]
in_book: true
---

# Depth-First Search {#ch-depth-first-search}

> Follow one path as far as it goes, then back up and take the next one — with a visited set, so a cycle cannot trap you.

**In this chapter:** the recursive template · why a graph needs a visited set and a tree does not · grids as implicit graphs · marking before recursing · tracking the path itself · the recursion depth that forces an explicit stack

## 💡 The Core Idea

Depth-first search commits. From wherever you are, take the first unexplored neighbour and keep going
until you run out, then back up one step and try the next. A tree traversal is DFS on a structure that
happens to have no cycles — see
[Chapter ?? — Binary Tree Traversal](#ch-binary-tree-traversal).

Two things change when the structure becomes a general graph:

- **Nodes can be reached twice**, so you need a visited set or the same work repeats.
- **Paths can loop**, so without that set the recursion never terminates.

That is the entire difference. The recursion is the same four lines.

> Recursion gives you the backtracking for free — returning from a call *is* backing up. This is why DFS
> code is short and why its cost is stack space rather than an explicit data structure.

## How It Works

### The template

```typescript
type Graph = Map<number, number[]>;

function dfs(graph: Graph, start: number): number[] {
  const visited = new Set<number>();
  const order: number[] = [];

  const explore = (node: number): void => {
    if (visited.has(node)) return;   // the guard that makes cycles safe
    visited.add(node);               // mark on entry, never on exit
    order.push(node);

    for (const next of graph.get(node) ?? []) {
      explore(next);
    }
  };

  explore(start);
  return order;
}
// Time: O(V + E) — each node once, each edge once. Space: O(V) for the set plus O(V) worst-case stack
```

**Mark on entry.** Marking a node only after its recursive calls return means a cycle re-enters it
before the mark lands, and the recursion runs forever. This is the single most common DFS bug.

`O(V + E)` is the complexity to state: every node is entered once, and every edge is examined once from
each end.

### Grids are graphs

A grid question rarely says "graph", but a cell's neighbours are the four cells around it and nothing
else changes. Number of Islands is DFS run once per unvisited land cell:

```typescript
function numIslands(grid: string[][]): number {
  if (grid.length === 0) return 0;
  const rows = grid.length;
  const cols = grid[0].length;

  const sink = (r: number, c: number): void => {
    // One guard covering both bounds and "already handled"
    if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== '1') return;

    grid[r][c] = '0';   // the grid itself is the visited set
    sink(r + 1, c);
    sink(r - 1, c);
    sink(r, c + 1);
    sink(r, c - 1);
  };

  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === '1') {
        islands++;   // a new unvisited land cell means a new island
        sink(r, c);  // then erase the whole island so it is counted once
      }
    }
  }
  return islands;
}
// Time: O(rows × cols), Space: O(rows × cols) worst-case stack on a grid that is all land
```

Two habits from this code generalise:

- **Fold every rejection into one guard at the top.** Checking bounds at the call site means four copies
  of the same condition, and the one you forget is the one that throws.
- **Mutating the grid is a legitimate visited set** — `O(1)` space instead of a `Set` of `r,c` keys. Say
  out loud that it destroys the input, and offer a separate `visited` grid if the caller needs the
  original.

### Tracking the path, not just the answer

"Does a path exist" needs no bookkeeping. "Give me the path" needs push-before, pop-after — the same
shape as backtracking:

```typescript
interface TreeNode {
  val: number;
  left: TreeNode | null;
  right: TreeNode | null;
}

function pathSum(root: TreeNode | null, target: number): number[][] {
  const results: number[][] = [];
  const path: number[] = [];

  const walk = (node: TreeNode | null, remaining: number): void => {
    if (node === null) return;

    path.push(node.val);
    remaining -= node.val;

    // A leaf is *both* children null — not one. This is where Path Sum is usually got wrong
    if (node.left === null && node.right === null && remaining === 0) {
      results.push([...path]);   // copy: `path` is about to be mutated
    } else {
      walk(node.left, remaining);
      walk(node.right, remaining);
    }

    path.pop();   // undo on the way out, so a sibling branch starts clean
  };

  walk(root, target);
  return results;
}
// Time: O(n × h) — the copies dominate. Space: O(h)
```

`results.push([...path])` rather than `results.push(path)` is not a style choice. Pushing the reference
stores an array that `pop()` is about to empty, so every result ends up wrong.

### When recursion is not an option

The call stack is a real limit — roughly 10⁴ frames in V8 before it throws. A graph of 10⁵ nodes in a
chain will overflow. The explicit-stack version trades the crash for heap memory:

```typescript
function dfsIterative(graph: Graph, start: number): number[] {
  const visited = new Set<number>();
  const order: number[] = [];
  const stack: number[] = [start];

  while (stack.length > 0) {
    const node = stack.pop()!;
    if (visited.has(node)) continue;   // check on pop — a node can be pushed several times
    visited.add(node);
    order.push(node);

    // Push in reverse to pop in the original neighbour order
    const neighbours = graph.get(node) ?? [];
    for (let i = neighbours.length - 1; i >= 0; i--) stack.push(neighbours[i]);
  }
  return order;
}
// Time: O(V + E), Space: O(V)
```

⚠️ The iterative version can hold the same node on the stack more than once, so the visited check has to
happen **on pop** as well as (or instead of) on push. Checking only before pushing is not wrong, but
mixing the two is.

## When to Use It

| Signal in the question                                     | Reach for       | Why                                        |
| ---------------------------------------------------------- | --------------- | ------------------------------------------ |
| "Does a path exist between…"                                | DFS             | Any path will do, so commit to one          |
| Connected components — islands, regions, provinces          | DFS per unvisited cell | Each launch consumes one component  |
| All root-to-leaf paths, or all valid configurations         | DFS + backtracking | The path is built on the way down    |
| Detect a cycle in a directed graph                         | DFS with three states | A back edge to a node still on the stack is a cycle |
| **Shortest** path in an unweighted graph                    | **BFS**         | DFS finds a path, not the shortest           |
| The answer is near the root, or the tree is very deep       | BFS             | DFS may descend a long wrong branch first    |
| Weighted shortest path                                     | Dijkstra        | Neither plain DFS nor BFS handles weights    |

Cycle detection is the variation most likely to come up, because Course Schedule is a common question.
Two booleans per node are needed, not one: `visiting` for nodes on the current recursion stack and
`visited` for nodes fully explored. Reaching a `visiting` node is a cycle; reaching a `visited` one is
just a second route to a finished subgraph. A single flag conflates the two and reports cycles that do
not exist. Topological sort builds on this — see
[Chapter ?? — Graph Algorithms](#ch-graph-algorithms).

## Common Mistakes

**No visited set on a graph:**

```typescript
// ❌ recursing into neighbours with no guard — a cycle means infinite recursion
// ✅ if (visited.has(node)) return; visited.add(node);
```

**Marking visited after the recursive calls:**

```typescript
// ❌ for (const n of neighbours) explore(n); visited.add(node);
// ✅ visited.add(node) first — a cycle re-enters before the mark lands
```

**Bounds checks at the call site:**

```typescript
// ❌ if (r + 1 < rows) sink(r + 1, c);   // four copies, and the missing one throws
// ✅ one guard at the top of sink handles bounds and visited together
```

**Storing the path by reference:**

```typescript
// ❌ results.push(path);        // every result aliases the same array, which pop() empties
// ✅ results.push([...path]);
```

**Getting the leaf test wrong in Path Sum:**

```typescript
// ❌ if (node.left === null || node.right === null)   // a one-child node is not a leaf
// ✅ if (node.left === null && node.right === null)
```

**Using DFS for a shortest path:**

```typescript
// ❌ DFS returns the first path it finds, which is rarely the shortest
// ✅ BFS on an unweighted graph; Dijkstra when edges have weights
```

**A single visited flag for directed-cycle detection:**

```typescript
// ❌ one Set — reports a cycle whenever two paths reach the same finished node
// ✅ two states: on the current stack, versus fully explored
```

## Problems to Practise

| #   | Problem                              | Difficulty | What it drills                                  |
| --- | ------------------------------------ | ---------- | ----------------------------------------------- |
| 104 | Maximum Depth of Binary Tree         | Easy       | The shortest possible DFS                        |
| 112 | Path Sum                             | Easy       | The leaf test, and the subtraction               |
| 200 | Number of Islands                    | Medium     | Grid as graph, and the grid as its own visited set |
| 113 | Path Sum II                          | Medium     | Push-before, pop-after, and copying the result   |
| 695 | Max Area of Island                   | Medium     | Returning a value up from the recursion          |
| 133 | Clone Graph                          | Medium     | A `Map` doubling as visited and as the output    |
| 207 | Course Schedule                      | Medium     | Two-state cycle detection                        |
| 124 | Binary Tree Maximum Path Sum         | Hard       | Returning one value while recording another      |

Do 200 then 695 — the second is the first returning a count instead of nothing. Then 207, which is where
the two-state visited set becomes unavoidable.

## 🔑 Key Takeaways

- DFS on a graph is a tree traversal plus a visited set; without one, a cycle is an infinite loop.
- Mark a node visited **on entry**, before recursing, or a cycle re-enters it first.
- A grid is a graph whose neighbours are the four adjacent cells; mutating it is a valid `O(1)` visited set.
- Recording a path needs push-before, pop-after, and a **copy** when a result is stored.
- DFS finds *a* path, never the shortest — that is BFS, and weighted shortest paths need Dijkstra.

## Interview Questions

**Q: Why does DFS on a graph need a visited set when a tree traversal does not?**

A tree has exactly one path to each node and no cycles, so no node can be reached twice. A general graph
has neither guarantee: without a visited set, a diamond shape duplicates work and a cycle makes the
recursion never terminate. The set converts "explore all paths" into "explore all nodes", which is what
takes the complexity to `O(V + E)`.

**Q: Where exactly do you mark a node visited, and what breaks if you get it wrong?**

Immediately on entering the node, before iterating its neighbours. If you mark after the recursive calls
return, then in a cycle A → B → A the second visit to A happens while A is still unmarked, and the
recursion repeats forever. The `visited.has()` check and the `visited.add()` should be the first two
lines of the function.

**Q: When is BFS the right choice instead?**

When the question asks for the shortest path or the minimum number of steps in an unweighted graph — BFS
reaches nodes in order of distance, so the first time it arrives is the shortest way. Also when the
answer is likely near the start, since DFS may descend a long wrong branch first, and when the graph is
deep enough that recursion would overflow the stack.

**Q: How do you detect a cycle in a directed graph with DFS?**

Give each node three states: unvisited, on the current recursion stack, and fully explored. Reaching a
node that is on the current stack means a back edge, which is a cycle. Reaching a fully explored node
just means a second route into a subgraph you already finished, which is fine. Collapsing those two into
one flag is the classic wrong answer and reports cycles in an acyclic diamond.

**Q: What is the difference between DFS and backtracking?**

Backtracking is DFS over a space of *candidate solutions* rather than a fixed graph, with two additions:
the state is undone on the way back out, and branches are pruned as soon as they cannot lead to a valid
answer. Path Sum II is the boundary case — DFS over a real tree, but with the push/pop discipline that
makes it read like backtracking.

**Q: The graph has 10⁵ nodes in a chain. What changes?**

Recursion overflows the call stack — V8 allows roughly 10⁴ frames — so the same algorithm has to be
written with an explicit stack on the heap. The complexity is unchanged at `O(V + E)`; only where the
memory lives changes. The visited check then has to happen on pop, because a node can be pushed by
several neighbours before it is first processed.

## What to Read Next

- [Chapter ?? — Breadth-First Search](#ch-breadth-first-search) — the same exploration ordered by distance, and why that finds shortest paths
- [Chapter ?? — Backtracking](#ch-backtracking) — DFS over candidate solutions, with pruning
- [Chapter ?? — Graph Algorithms](#ch-graph-algorithms) — topological sort, which is this chapter's cycle detection finished
