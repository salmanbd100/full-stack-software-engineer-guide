---
sourceHash: "f1a2c77daa2759a3d1b9553a414ea932957820d1ac60cde9714541bbf0a3a6c9"
title: "Graph Algorithm"
translatedAt: "2026-10-13T03:14:20.425Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Graph Algorithm {#ch-graph-algorithms}

> একটি graph নিয়ে চারটি প্রশ্ন করার আছে, আর সেগুলোর উত্তর দেয় চারটি algorithm।

**এই অধ্যায়ে:** representation বেছে নেওয়া · in-degree দিয়ে topological sort, আর বিনা খরচে যে cycle এটা ধরে ফেলে · Dijkstra, আর কেন এর heap লাগে · দুটি optimisation-সহ Union-Find · কোনো code লেখার আগে যে property-গুলো পরিষ্কার করে নিতে হয়

## 💡 মূল ধারণা

একটি graph হলো node আর edge, আর এটা প্রায় কোনো constraint-ই নয় — এ কারণেই "এটা একটি graph problem" বলা এখনো
উত্তর নয়। সমস্যাটাকে সরু করে চারটি property। প্রথম কাজই হলো এগুলো নিয়ে প্রশ্ন করা:

| জিজ্ঞেস করুন                        | কারণ                                                       |
| -------------------------- | ------------------------------------------------------------- |
| **Directed** নাকি undirected? | দুটির মধ্যে cycle detection পুরোপুরি আলাদা             |
| **Weighted** নাকি unweighted? | Unweighted shortest path হলো BFS; weighted-এর জন্য Dijkstra লাগে       |
| **Connected**, নাকি component-এ ভাগ করা? | হয়তো প্রতিটি unvisited node থেকে traversal শুরু করতে হবে |
| এতে কি **cycle** থাকতে পারে?   | ঠিক করে visited set ঐচ্ছিক নাকি অপরিহার্য          |

Traversal নিজে অন্য জায়গায় আছে — [Chapter ?? — Depth-First Search](#ch-depth-first-search) আর
[Chapter ?? — Breadth-First Search](#ch-breadth-first-search)। এই অধ্যায়ে আছে সেগুলোর ওপর তৈরি তিনটি algorithm,
সাথে সেই structure, যেটা traversal-কে পুরোপুরি সরিয়ে দেয়।

> বেশিরভাগ graph প্রশ্ন চারটি shape-এর একটি: **dependency মেনে জিনিস সাজানো** (topological sort),
> **সবচেয়ে সস্তা route** (Dijkstra), **এই দুটি কি connected** (Union-Find), অথবা **explore করা** (DFS/BFS)।

## কীভাবে কাজ করে

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

| Representation       | Space      | "Edge আছে কি?" | একটি node-এর neighbour-গুলো ঘোরা | কখন ব্যবহার করবেন                       |
| -------------------- | ---------- | ------------------- | --------------------------- | ------------------------------ |
| **Adjacency list**   | `O(V + E)` | `O(degree)`         | `O(degree)`                 | প্রায় সবসময় — graph সাধারণত sparse |
| **Adjacency matrix** | `O(V²)`    | `O(1)`              | `O(V)`                      | Dense graph, অথবা constant-time-এ edge খোঁজা |
| **Edge list**        | `O(E)`     | `O(E)`              | `O(E)`                      | শুধু input format হিসেবে; কাজ শুরুর আগে রূপান্তর করুন |

না করার কারণ না থাকলে adjacency list বানান। Undirected graph-এ দ্বিতীয় `push` ভুলে যাওয়াই setup-এর সবচেয়ে
সাধারণ bug। এতে এমন একটি graph তৈরি হয়, যার অর্ধেক চুপচাপ হারিয়ে গেছে।

### In-degree দিয়ে topological sort

এমন একটি ক্রম, যেখানে প্রতিটি node তার ওপর নির্ভর করা সবকিছুর আগে আসে। Kahn's algorithm হলো in-degree-এর ওপর
BFS। এর কাজের property হলো **এটা বিনা খরচে cycle ধরে ফেলে**: যদি `V`টির কম node বেরিয়ে আসে, বাকিগুলো একটি
cycle-এ আছে।

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

DFS বিকল্পটি তিনটি state ব্যবহার করে — unvisited, বর্তমান stack-এ আছে, পুরোপুরি explore করা হয়ে গেছে। Recursion
return করার সময় node push করে, তারপর উল্টে দিয়ে এটা ক্রম তৈরি করে। Kahn's ঠিকভাবে লেখা সহজ, আর বাড়তি হিসাব
ছাড়াই cycle check দেয়। তাই জিজ্ঞেস না করলে এটাকেই বেছে নিন।

⚠️ Edge-এর দিক ধরে না নিয়ে problem statement থেকে পড়ুন। Course Schedule pair দেয় `[course, prerequisite]` হিসেবে,
যেটা আপনি যে edge store করতে চান তার উল্টো।

### Dijkstra — weight-সহ সবচেয়ে সস্তা route

BFS সবচেয়ে কম edge খুঁজে বের করে। যখন edge-এর খরচ থাকে, তখন সবচেয়ে কম মানেই সবচেয়ে সস্তা নয়। তাই frontier-কে
পৌঁছানোর ক্রমে নয়, জমা হওয়া খরচের ক্রমে process করতে হবে। মানে queue-এর বদলে একটি min-heap।

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

`cost > distance[node]` line-টাই একটি বাস্তব implementation-এর পুরো কৌশল। Binary heap-এ কোনো decrease-key
operation নেই। তাই একটি entry update করার বদলে আপনি দ্বিতীয় একটি push করেন, আর পুরোনো copy-টা ওপরে উঠে এলে বাদ
দেন। এই check ছাড়াও algorithm শেষ হয়, কিন্তু settle হয়ে যাওয়া node আবার process করে।

Dijkstra-র সঠিকতা একটি assumption-এর ওপর দাঁড়িয়ে: **কোনো negative edge weight নেই।** একটি negative edge পরে কোনো
settle হয়ে যাওয়া node-কে আরও সস্তা করে দিতে পারে। তাতে "একবার pop হলে চূড়ান্ত" নিশ্চয়তা ভেঙে যায়। Negative weight-এর
জন্য Bellman-Ford লাগে, `O(V × E)`, যেটা negative cycle-ও ধরে।

### Union-Find — traversal ছাড়া connectivity

যখন প্রশ্নটা শুধু "এই দুটি কি একই group-এ", তখন traversal দরকারের চেয়ে বেশি যন্ত্রপাতি। Union-Find প্রতিটি
group-এর জন্য একটি representative রাখে, আর প্রায় constant time-এ উত্তর দেয়।

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

দুটি optimisation-ই লাগে। Path compression ছাড়া `find` এমন একটি chain ধরে হাঁটে, যেটা `O(n)` লম্বা হতে পারে।
Union by rank ছাড়া chain-গুলো প্রথম জায়গাতেই তৈরি হয়। দুটি মিলে inverse-Ackermann bound দেয়, যেটা memory-তে আঁটে
এমন যেকোনো input-এর জন্য 5-এর নিচে।

`union`-এর return value-ই Redundant Connection-কে তিন line-এর problem বানায়: প্রথম যে edge `false` return করে,
সেটাই একটি cycle বন্ধ করছে।

### কোন algorithm

| প্রশ্ন যা চায়                                      | ব্যবহার করুন                      | খরচ                 |
| ------------------------------------------------------ | ------------------------ | -------------------- |
| Dependency মেনে একটি ক্রম                       | Topological sort (Kahn's) | `O(V + E)`            |
| একটি **directed** graph-এ cycle আছে কি না               | Kahn's, অথবা তিন state-সহ DFS | `O(V + E)`     |
| একটি **undirected** graph-এ cycle আছে কি না            | Union-Find, অথবা parent track করা DFS | `O(E α(V))` |
| একটি destination পর্যন্ত সবচেয়ে কম edge                          | BFS                      | `O(V + E)`            |
| সবচেয়ে সস্তা route, non-negative weight                   | Dijkstra                 | `O((V + E) log V)`     |
| সবচেয়ে সস্তা route, negative weight চলবে               | Bellman-Ford             | `O(V × E)`             |
| **সব** pair-এর মধ্যে সবচেয়ে সস্তা route                  | Floyd-Warshall           | `O(V³)`                |
| কতগুলো connected component                          | প্রতিটি unvisited node থেকে DFS, অথবা Union-Find | `O(V + E)` |
| এই দুটি কি connected — edge আসতে থাকার সাথে বারবার জিজ্ঞেস করা | Union-Find            | প্রতি query-তে `O(α(n))`    |

**Undirected** graph-এ cycle detection-এর row-টাই সবচেয়ে বেশি ভুল হয়। সেখানে আগে visit করা node-এ পৌঁছানো
cycle নয় — প্রতিটি edge দুই দিকেই চলে, তাই আপনি যে node থেকে এইমাত্র এলেন সেটা সবসময় দেখবেন। হয় parent track করে
সেটা উপেক্ষা করুন, নয়তো Union-Find ব্যবহার করুন, যেখানে `false` return করা একটি `union` দ্ব্যর্থহীন।

## সাধারণ ভুল

**এক দিকের edge দিয়ে undirected graph বানানো:**

```typescript
// ❌ graph.get(from)!.push(to);                       // half the edges are missing
// ✅ push both directions when the graph is undirected
```

**Edge-এর দিক উল্টো পড়া:**

```typescript
// ❌ graph.get(course)!.push(prereq)   // LC 207 gives [course, prereq]; the edge runs the other way
// ✅ graph.get(prereq)!.push(course); inDegree[course]++;
```

**Directed-cycle detection-এ একটিমাত্র visited flag:**

```typescript
// ❌ a single Set reports a cycle whenever two paths reach the same finished node
// ✅ three states: unvisited, on the current recursion stack, fully explored
```

**Undirected graph-এ আবার visit করাকে cycle ধরা:**

```typescript
// ❌ every edge looks like a cycle, because you can always walk back to the parent
// ✅ skip the node you arrived from, or use Union-Find
```

**Negative weight-সহ Dijkstra:**

```typescript
// ❌ a negative edge can improve an already-settled node — the guarantee is gone
// ✅ Bellman-Ford, which also reports negative cycles
```

**Dijkstra-য় stale-entry check বাদ দেওয়া:**

```typescript
// ❌ processing every heap entry — settled nodes get reprocessed
// ✅ if (cost > distance[node]) continue;
```

**শুধু একটি optimisation-সহ Union-Find:**

```typescript
// ❌ path compression without union by rank, or the reverse — find degrades toward O(n)
// ✅ both, for the effectively-constant amortised bound
```

**বিচ্ছিন্ন component-এর কথা ভুলে যাওয়া:**

```typescript
// ❌ one traversal from node 0 — anything unreachable from it is never visited
// ✅ loop over every node and launch a traversal from each unvisited one
```

## অনুশীলনের জন্য Problem

| #   | Problem                                                   | কঠিনতা | কী অনুশীলন করায়                                  |
| --- | --------------------------------------------------------- | ---------- | ----------------------------------------------- |
| 207 | Course Schedule                                           | Medium     | In-degree, আর বিনা খরচে cycle check         |
| 210 | Course Schedule II                                        | Medium     | একই algorithm, যেটা ক্রমটা return করে           |
| 133 | Clone Graph                                               | Medium     | একটি `Map`, যেটা একই সাথে visited set আর output           |
| 323 | Number of Connected Components in an Undirected Graph      | Medium     | প্রতিটি unvisited node থেকে DFS, অথবা Union-Find            |
| 684 | Redundant Connection                                      | Medium     | প্রথম যে `union` false return করে                |
| 261 | Graph Valid Tree                                          | Medium     | Connected **আর** acyclic, `V - 1`টি edge-সহ     |
| 743 | Network Delay Time                                        | Medium     | Dijkstra, আর stale entry বাদ দেওয়া               |
| 787 | Cheapest Flights Within K Stops                           | Medium     | কেন hop limit সাধারণ Dijkstra-কে অপর্যাপ্ত করে দেয় |
| 269 | Alien Dictionary                                          | Hard       | Sort করার আগে edge-গুলো বের করা           |

207, তারপর 210 করুন — একই code, একটি boolean return করে আর একটি ক্রম। তারপর 743, আর ঠিক তার পরেই 787। কারণ hop
constraint-ই দেখায় আপনি বুঝেছেন Dijkstra কেন কাজ করে।

## 🔑 মূল শিক্ষা

- আগে চারটি property পরিষ্কার করুন: directed, weighted, connected, cyclic। এগুলোই আপনার হয়ে algorithm বেছে দেয়।
- Adjacency list বানান, আর graph undirected হলে **দুই** দিকেই push করুন।
- Kahn's algorithm একই pass-এ topological order দেয় আর cycle ধরে — output ছোট হলে মানে cycle আছে।
- Dijkstra BFS-এর queue-কে min-heap দিয়ে বদলায়, আর non-negative weight চায়। Negative edge মানে Bellman-Ford।
- Union-Find কার্যত constant time-এ connectivity-র উত্তর দেয়, কিন্তু এর path compression আর union by rank **দুটিই** লাগে।

## Interview-এর প্রশ্ন

**Q: কোনো graph code লেখার আগে কী জিজ্ঞেস করেন?**

Graph-টি directed কি না, edge-গুলো weighted কি না, এটা connected হওয়ার নিশ্চয়তা আছে কি না, আর cycle থাকতে পারে কি
না। প্রতিটি উত্তর কিছু algorithm বাদ দেয়: unweighted আর shortest path মানে BFS, weighted মানে Dijkstra, dependency
ক্রম মানে topological sort। আর "connected?" ঠিক করে traversal শুধু একটি node থেকে নয়, প্রতিটি node থেকে শুরু করতে
হবে কি না।

**Q: Kahn's algorithm কীভাবে cycle ধরে?**

এটা শুধু সেই node-গুলোকে enqueue করে, যাদের in-degree শূন্যে পৌঁছেছে — মানে প্রতিটি prerequisite পূরণ হয়েছে।
একটি cycle-এর ভেতরের node-এর সবসময় অন্তত একটি পূরণ না-হওয়া prerequisite থাকে — একই cycle-এর অন্য একটি node।
তাই এর in-degree কখনো শূন্যে পৌঁছায় না, আর এটা কখনো enqueue হয় না। Output-এ যদি `V`টির কম node থাকে, বাদ পড়া
node-গুলো অন্তত একটি cycle তৈরি করে।

**Q: BFS-এর শুধু queue লাগে, Dijkstra-র কেন heap লাগে?**

BFS-এর নিশ্চয়তা আসে edge সংখ্যার ক্রমে node process করা থেকে। প্রতিটি edge-এর খরচ সমান হলে একটি FIFO queue এটা
বিনা খরচে দেয়। Weight থাকলে পৌঁছানোর ক্রম আর খরচের ক্রম আলাদা হয়ে যায় — তিনটি সস্তা edge একটি দামি edge-কে হারাতে
পারে। তাই frontier-কে সবচেয়ে সস্তাটা আগে, এভাবে process করতে হয়, আর min-heap ঠিক এটাই দেয়। `log V` factor
সেখান থেকেই আসে।

**Q: Negative edge weight-এ Dijkstra কেন ভেঙে যায়?**

এর মূল invariant হলো, একবার একটি node pop হলে তার distance চূড়ান্ত। এটা খাটে কারণ পরের প্রতিটি ধাপ শুধু
non-negative খরচ যোগ করে। একটি negative edge পরে একটি settle হয়ে যাওয়া node-কে আরও সস্তা করে দিতে পারে। তখন
invariant ভেঙে যায়, আর উত্তর ভুল হতে পারে। Bellman-Ford সব edge `V - 1` বার relax করে এটা সামলায়, `O(V × E)`-তে।
আর এর পরের কোনো relaxation যদি তখনো কিছু উন্নত করে, সেটা প্রমাণ করে একটি negative cycle আছে।

**Q: কখন DFS বা BFS-এর বদলে Union-Find ব্যবহার করবেন?**

যখন প্রশ্নটা পুরোপুরি connectivity নিয়ে, আর edge ধীরে ধীরে আসে: "এই দুটি কি connected", "কোন edge একটি cycle তৈরি
করে", "এখন কতগুলো group"। Union-Find আবার traverse না করে প্রতিটির উত্তর কার্যত constant time-এ দেয়, যেখানে DFS-এ
প্রতি query-তে `O(V + E)` খরচ হতো। যখন path, distance বা একটি ক্রম দরকার, তখন DFS-ই ঠিক tool — Union-Find group
চেনে, route নয়।

**Q: Undirected graph-এ cycle detection কেন আলাদা?**

Directed graph-এ একটি cycle হলো এমন node-এ একটি back edge, যেটা এখনো recursion stack-এ আছে। Undirected graph-এ
প্রতিটি edge দুই দিকেই চলা যায়, তাই আপনি যে node থেকে এইমাত্র এলেন সেটা সবসময় পাবেন — সেটা cycle নয়। আপনাকে
parent-কে স্পষ্টভাবে বাদ দিতে হবে, নয়তো Union-Find ব্যবহার করতে হবে। সেখানে আগে থেকেই একই set-এ থাকা দুটি node-এর
মধ্যে একটি edge কোনো দ্ব্যর্থতা ছাড়াই cycle।

**Q: সাধারণ Dijkstra কেন Cheapest Flights Within K Stops solve করে না?**

কারণ state এখন আর শুধু node নয়। Hop limit থাকলে অনেক stop-এর পর সস্তায় একটি শহরে পৌঁছানো কম stop-এ দামি পথে
পৌঁছানোর চেয়ে খারাপ হতে পারে। তাই "একবার settle হলে চূড়ান্ত" নিয়মটা শুধু node-এর ওপর খাটে না। সমাধান হলো state-কে
`(city, stops used)` বানানো — অথবা Bellman-Ford ব্যবহার করা, যার `k`টি relaxation round স্বাভাবিকভাবেই `k`টি hop-এর
সাথে মেলে।

## এরপর কী পড়বেন

- [Chapter ?? — Breadth-First Search](#ch-breadth-first-search) — unweighted shortest path, যার সাধারণ রূপ হলো Dijkstra
- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — topological sort-এর বিকল্প রূপের নিচে থাকা traversal
- [Chapter ?? — Top K Element](#ch-top-k-elements) — যে min-heap-এর ওপর Dijkstra চলে
