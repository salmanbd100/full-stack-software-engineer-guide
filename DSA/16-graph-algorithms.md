---
title: Graph Algorithms
part: 10
chapter: 0
slug: graph-algorithms
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-30
tags: [dsa, graph, topological-sort, dijkstra, union-find]
in_book: true
---

# Graph Algorithms {#ch-graph-algorithms}

> Four questions to ask about a graph, and the four algorithms that answer them.

**In this chapter:** choosing a representation · topological sort by in-degree, and the cycle it detects for free · Dijkstra and why it needs a heap · Union-Find with both optimisations · the properties to clarify before writing any code

## 💡 The Core Idea

A graph is nodes and edges, and that is almost no constraint at all — which is why "it's a graph problem"
is not yet an answer. What narrows it down is four properties, and asking about them is the first thing to
do:

| Ask                        | Because                                                       |
| -------------------------- | ------------------------------------------------------------- |
| **Directed** or undirected? | Cycle detection differs completely between the two             |
| **Weighted** or unweighted? | Unweighted shortest path is BFS; weighted needs Dijkstra       |
| **Connected**, or components? | You may need to launch the traversal from every unvisited node |
| Can it contain **cycles**?   | Decides whether a visited set is optional or essential          |

Traversal itself is covered elsewhere — [Chapter ?? — Depth-First Search](#ch-depth-first-search) and
[Chapter ?? — Breadth-First Search](#ch-breadth-first-search). This chapter is the three algorithms built
on top of them, plus the structure that replaces traversal entirely.

> Most graph questions are one of four shapes: **order things with dependencies** (topological sort),
> **cheapest route** (Dijkstra), **are these two connected** (Union-Find), or **explore** (DFS/BFS).

## How It Works

### Representation

```typescript
type AdjacencyList = Map<number, number[]>;

function buildGraph(n: number, edges: [number, number][], directed: boolean): AdjacencyList {
  const graph: AdjacencyList = new Map();
  for (let i = 0; i < n; i++) graph.set(i, []);

  for (const [from, to] of edges) {
    graph.get(from)!.push(to);
    if (!directed) graph.get(to)!.push(from);   // undirected means both directions
  }
  return graph;
}
```

| Representation       | Space      | "Is there an edge?" | Iterate a node's neighbours | Use when                       |
| -------------------- | ---------- | ------------------- | --------------------------- | ------------------------------ |
| **Adjacency list**   | `O(V + E)` | `O(degree)`         | `O(degree)`                 | Almost always — graphs are sparse |
| **Adjacency matrix** | `O(V²)`    | `O(1)`              | `O(V)`                      | Dense graphs, or constant-time edge lookups |
| **Edge list**        | `O(E)`     | `O(E)`              | `O(E)`                      | Input format only; convert before working |

Build the adjacency list unless you have a reason not to. Forgetting the second `push` for an undirected
graph is the single most common setup bug, and it produces a graph that is silently half-missing.

### Topological sort by in-degree

An ordering where every node comes before everything that depends on it. Kahn's algorithm is BFS over
in-degrees, and its useful property is that **it detects cycles for free**: if fewer than `V` nodes come
out, the leftovers are in a cycle.

```typescript
// LC 210 — an order in which the courses can be taken, or [] if impossible
function findOrder(numCourses: number, prerequisites: [number, number][]): number[] {
  const graph: AdjacencyList = new Map();
  const inDegree: number[] = new Array(numCourses).fill(0);
  for (let i = 0; i < numCourses; i++) graph.set(i, []);

  for (const [course, prereq] of prerequisites) {
    graph.get(prereq)!.push(course);   // prereq must come first
    inDegree[course]++;
  }

  // Anything with no unmet prerequisites can start now
  const queue: number[] = [];
  for (let i = 0; i < numCourses; i++) if (inDegree[i] === 0) queue.push(i);

  const order: number[] = [];
  for (let head = 0; head < queue.length; head++) {   // index instead of shift()
    const node = queue[head];
    order.push(node);
    for (const next of graph.get(node)!) {
      if (--inDegree[next] === 0) queue.push(next);   // its last prerequisite just cleared
    }
  }

  return order.length === numCourses ? order : [];   // short output means a cycle
}
// Time: O(V + E), Space: O(V + E)
```

The DFS alternative uses three states — unvisited, on the current stack, fully explored — and produces the
order by pushing nodes as their recursion returns, then reversing. Kahn's is easier to get right and gives
the cycle check without extra bookkeeping, so prefer it unless asked.

⚠️ Read the edge direction from the problem statement rather than assuming. Course Schedule gives pairs as
`[course, prerequisite]`, which is the reverse of the edge you want to store.

### Dijkstra — cheapest route with weights

BFS finds the fewest edges. When edges have costs, fewest is not cheapest, so the frontier must be
processed in order of accumulated cost rather than in order of arrival. That means a min-heap instead of a
queue.

```typescript
// `Heap<T>` is the comparator-driven min-heap from the Top K Elements chapter
declare class Heap<T> {
  constructor(compare: (a: T, b: T) => number);
  readonly size: number;
  push(value: T): void;
  pop(): T | undefined;
}

type WeightedGraph = Map<number, [neighbour: number, weight: number][]>;

function dijkstra(graph: WeightedGraph, start: number, n: number): number[] {
  const distance: number[] = new Array(n).fill(Infinity);
  distance[start] = 0;

  const heap = new Heap<[cost: number, node: number]>((a, b) => a[0] - b[0]);
  heap.push([0, start]);

  while (heap.size > 0) {
    const [cost, node] = heap.pop()!;
    if (cost > distance[node]) continue;   // a stale entry — a cheaper route already settled this node

    for (const [neighbour, weight] of graph.get(node) ?? []) {
      const candidate = cost + weight;
      if (candidate < distance[neighbour]) {
        distance[neighbour] = candidate;
        heap.push([candidate, neighbour]);   // no decrease-key: push a duplicate and skip it later
      }
    }
  }
  return distance;
}
// Time: O((V + E) log V), Space: O(V + E)
```

The `cost > distance[node]` line is the whole trick of a practical implementation. Binary heaps have no
decrease-key operation, so instead of updating an entry you push a second one and discard the outdated
copy when it surfaces. Without that check the algorithm still terminates but reprocesses settled nodes.

Dijkstra's correctness rests on one assumption: **no negative edge weights.** A negative edge could make
an already-settled node cheaper later, which breaks the "once popped, final" guarantee. Negative weights
need Bellman-Ford, `O(V × E)`, which also detects negative cycles.

### Union-Find — connectivity without traversal

When the question is only "are these two in the same group", traversal is more machinery than you need.
Union-Find keeps one representative per group and answers in near-constant time.

```typescript
class DisjointSet {
  private parent: number[];
  private rank: number[];   // approximate tree height, used to attach the smaller tree

  constructor(n: number) {
    this.parent = Array.from({ length: n }, (_, i) => i);   // everyone is their own group
    this.rank = new Array(n).fill(0);
  }

  find(x: number): number {
    // Path compression: point every node on the way up straight at the root
    if (this.parent[x] !== x) this.parent[x] = this.find(this.parent[x]);
    return this.parent[x];
  }

  /** Returns false when the two were already connected — which means this edge closes a cycle. */
  union(a: number, b: number): boolean {
    const rootA = this.find(a);
    const rootB = this.find(b);
    if (rootA === rootB) return false;

    // Union by rank: attach the shorter tree under the taller one
    if (this.rank[rootA] < this.rank[rootB]) this.parent[rootA] = rootB;
    else if (this.rank[rootA] > this.rank[rootB]) this.parent[rootB] = rootA;
    else {
      this.parent[rootB] = rootA;
      this.rank[rootA]++;
    }
    return true;
  }
}
// find and union: O(α(n)) amortised — effectively constant. Space: O(n)
```

Both optimisations are needed. Without path compression, `find` walks a chain that can be `O(n)` long;
without union by rank, the chains form in the first place. Together they give the inverse-Ackermann bound,
which is below 5 for any input that fits in memory.

The `union` return value is what makes Redundant Connection a three-line problem: the first edge that
returns `false` is the one closing a cycle.

### Which algorithm

| The question asks                                      | Use                      | Cost                 |
| ------------------------------------------------------ | ------------------------ | -------------------- |
| An order respecting dependencies                       | Topological sort (Kahn's) | `O(V + E)`            |
| Is there a cycle in a **directed** graph               | Kahn's, or DFS with three states | `O(V + E)`     |
| Is there a cycle in an **undirected** graph            | Union-Find, or DFS tracking the parent | `O(E α(V))` |
| Fewest edges to a destination                          | BFS                      | `O(V + E)`            |
| Cheapest route, non-negative weights                   | Dijkstra                 | `O((V + E) log V)`     |
| Cheapest route, negative weights allowed               | Bellman-Ford             | `O(V × E)`             |
| Cheapest routes between **all** pairs                  | Floyd-Warshall           | `O(V³)`                |
| How many connected components                          | DFS per unvisited node, or Union-Find | `O(V + E)` |
| Are these two connected, asked repeatedly as edges arrive | Union-Find            | `O(α(n))` per query    |

Cycle detection in an **undirected** graph is the row most often got wrong. Reaching an already-visited
node is not a cycle there — every edge is bidirectional, so you always see the node you just came from.
Either track the parent and ignore it, or use Union-Find, where a `union` that returns `false` is
unambiguous.

## Common Mistakes

**Building an undirected graph with one edge direction:**

```typescript
// ❌ graph.get(from)!.push(to);                       // half the edges are missing
// ✅ push both directions when the graph is undirected
```

**Reading the edge direction backwards:**

```typescript
// ❌ graph.get(course)!.push(prereq)   // LC 207 gives [course, prereq]; the edge runs the other way
// ✅ graph.get(prereq)!.push(course); inDegree[course]++;
```

**One visited flag for directed-cycle detection:**

```typescript
// ❌ a single Set reports a cycle whenever two paths reach the same finished node
// ✅ three states: unvisited, on the current recursion stack, fully explored
```

**Treating a revisit as a cycle in an undirected graph:**

```typescript
// ❌ every edge looks like a cycle, because you can always walk back to the parent
// ✅ skip the node you arrived from, or use Union-Find
```

**Dijkstra with negative weights:**

```typescript
// ❌ a negative edge can improve an already-settled node — the guarantee is gone
// ✅ Bellman-Ford, which also reports negative cycles
```

**Skipping the stale-entry check in Dijkstra:**

```typescript
// ❌ processing every heap entry — settled nodes get reprocessed
// ✅ if (cost > distance[node]) continue;
```

**Union-Find with only one optimisation:**

```typescript
// ❌ path compression without union by rank, or the reverse — find degrades toward O(n)
// ✅ both, for the effectively-constant amortised bound
```

**Forgetting disconnected components:**

```typescript
// ❌ one traversal from node 0 — anything unreachable from it is never visited
// ✅ loop over every node and launch a traversal from each unvisited one
```

## Problems to Practise

| #   | Problem                                                   | Difficulty | What it drills                                  |
| --- | --------------------------------------------------------- | ---------- | ----------------------------------------------- |
| 207 | Course Schedule                                           | Medium     | In-degrees, and the cycle check for free         |
| 210 | Course Schedule II                                        | Medium     | The same algorithm returning the order           |
| 133 | Clone Graph                                               | Medium     | A `Map` as both visited set and output           |
| 323 | Number of Connected Components in an Undirected Graph      | Medium     | DFS per unvisited node, or Union-Find            |
| 684 | Redundant Connection                                      | Medium     | The first `union` returning false                |
| 261 | Graph Valid Tree                                          | Medium     | Connected **and** acyclic, with `V - 1` edges     |
| 743 | Network Delay Time                                        | Medium     | Dijkstra, and the stale-entry skip               |
| 787 | Cheapest Flights Within K Stops                           | Medium     | Why the hop limit makes plain Dijkstra insufficient |
| 269 | Alien Dictionary                                          | Hard       | Deriving the edges before sorting them           |

Do 207 then 210 — the same code, one returning a boolean and one an order. Then 743, and 787 straight
after, because the hop constraint is what shows you understood why Dijkstra works.

## 🔑 Key Takeaways

- Clarify four properties first: directed, weighted, connected, cyclic. They pick the algorithm for you.
- Build an adjacency list, and push **both** directions when the graph is undirected.
- Kahn's algorithm gives a topological order and detects cycles in the same pass — a short output means a cycle.
- Dijkstra replaces BFS's queue with a min-heap and needs non-negative weights; negative edges mean Bellman-Ford.
- Union-Find answers connectivity in effectively constant time, but needs **both** path compression and union by rank.

## Interview Questions

**Q: What do you ask before writing any graph code?**

Whether the graph is directed, whether the edges are weighted, whether it is guaranteed connected, and
whether cycles are possible. Each answer eliminates algorithms: unweighted plus shortest path is BFS,
weighted is Dijkstra, dependency ordering is a topological sort, and "connected?" decides whether the
traversal must be launched from every node rather than just one.

**Q: How does Kahn's algorithm detect a cycle?**

It only ever enqueues nodes whose in-degree has reached zero, meaning every prerequisite is satisfied. A
node inside a cycle always has at least one unsatisfied prerequisite — another node in the same cycle — so
its in-degree never reaches zero and it is never enqueued. If the output holds fewer than `V` nodes, the
missing ones form at least one cycle.

**Q: Why does Dijkstra need a heap when BFS only needs a queue?**

BFS's guarantee comes from processing nodes in order of edge count, which a FIFO queue produces for free
when every edge costs the same. With weights, arrival order and cost order come apart — three cheap edges
can beat one expensive one — so the frontier has to be processed cheapest-first, which is exactly what a
min-heap gives. That is where the `log V` factor comes from.

**Q: What breaks Dijkstra on negative edge weights?**

Its core invariant is that once a node is popped, its distance is final, which holds because every further
step only adds non-negative cost. A negative edge can make a settled node cheaper later, so the invariant
fails and the answer can be wrong. Bellman-Ford handles it by relaxing all edges `V - 1` times at `O(V × E)`,
and a further relaxation that still improves something proves a negative cycle exists.

**Q: When would you use Union-Find rather than DFS or BFS?**

When the question is purely about connectivity and edges arrive incrementally: "are these two connected",
"which edge creates a cycle", "how many groups now". Union-Find answers each in effectively constant time
without re-traversing, whereas DFS would cost `O(V + E)` per query. DFS remains the right tool when you
need the path, the distances, or an ordering — Union-Find knows groups, not routes.

**Q: Why is cycle detection different in undirected graphs?**

In a directed graph a cycle is a back edge to a node still on the recursion stack. In an undirected graph
every edge is traversable both ways, so you always encounter the node you just came from — that is not a
cycle. You must skip the parent explicitly, or use Union-Find, where an edge between two nodes already in
the same set is a cycle with no ambiguity.

**Q: Why doesn't plain Dijkstra solve Cheapest Flights Within K Stops?**

Because the state is no longer just the node. With a hop limit, arriving at a city cheaply after many
stops can be worse than arriving expensively after few, so the "once settled, final" rule does not hold on
nodes alone. The fix is to make the state `(city, stops used)` — or to use Bellman-Ford, whose `k`
relaxation rounds naturally correspond to `k` hops.

## What to Read Next

- [Chapter ?? — Breadth-First Search](#ch-breadth-first-search) — the unweighted shortest path Dijkstra generalises
- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — the traversal underneath topological sort's alternative form
- [Chapter ?? — Top K Elements](#ch-top-k-elements) — the min-heap Dijkstra runs on
