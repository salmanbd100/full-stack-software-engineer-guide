---
sourceHash: "f1a2c77daa2759a3d1b9553a414ea932957820d1ac60cde9714541bbf0a3a6c9"
title: "Graph Algorithm"
translatedAt: "2026-10-19T10:25:44.151Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Graph Algorithm {#ch-graph-algorithms}

> Graph নিয়ে চারটি প্রশ্ন করুন। চারটি algorithm সেগুলোর উত্তর দেয়।

**এই অধ্যায়ে:** representation বাছাই · in-degree দিয়ে topological sort, আর বিনা খরচে পাওয়া cycle detection · Dijkstra, আর তার কেন heap লাগে · দুটি optimisation-সহ Union-Find · code লেখার আগে যে বৈশিষ্ট্যগুলো পরিষ্কার করে নিতে হয়

## 💡 মূল ধারণা

Graph মানে node আর edge। এটা প্রায় কোনো বাঁধনই নয়, তাই "এটা graph problem" বললে এখনো উত্তর দেওয়া হয় না। সমস্যাটা
ছোট করে আনে চারটি বৈশিষ্ট্য, আর প্রথম কাজই হলো সেগুলো জিজ্ঞেস করা:

| জিজ্ঞেস করুন                | কারণ                                                       |
| -------------------------- | ------------------------------------------------------------- |
| **Directed** নাকি undirected? | দুটিতে cycle detection পুরোপুরি আলাদা                      |
| **Weighted** নাকি unweighted? | Unweighted shortest path হলো BFS, weighted-এ লাগে Dijkstra  |
| **Connected**, নাকি কয়েকটি component? | হয়তো প্রতিটি না-দেখা node থেকে traversal চালাতে হবে |
| এতে কি **cycle** থাকতে পারে? | এটাই ঠিক করে visited set ঐচ্ছিক, নাকি অপরিহার্য             |

Traversal নিজে অন্য জায়গায় আছে: [Chapter ?? — Depth-First Search](#ch-depth-first-search) আর
[Chapter ?? — Breadth-First Search](#ch-breadth-first-search)। এই অধ্যায়ে আছে সেগুলোর ওপর দাঁড়ানো তিনটি
algorithm, আর এমন একটি structure, যা traversal-এর দরকারই মিটিয়ে দেয়।

> বেশিরভাগ graph প্রশ্ন চারটি গড়নের কোনো একটি: **নির্ভরতা মেনে জিনিস সাজানো** (topological sort), **সবচেয়ে সস্তা
> পথ** (Dijkstra), **এই দুটি কি যুক্ত** (Union-Find), অথবা **ঘুরে দেখা** (DFS/BFS)।

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

| Representation       | Space      | "Edge আছে কি?" | একটি node-এর neighbour ঘোরা | কখন ব্যবহার করবেন                |
| -------------------- | ---------- | ------------------- | --------------------------- | ------------------------------ |
| **Adjacency list**   | `O(V + E)` | `O(degree)`         | `O(degree)`                 | প্রায় সবসময়, কারণ graph সাধারণত sparse |
| **Adjacency matrix** | `O(V²)`    | `O(1)`              | `O(V)`                      | Dense graph, বা constant-time-এ edge খোঁজা লাগলে |
| **Edge list**        | `O(E)`     | `O(E)`              | `O(E)`                      | শুধু input format হিসেবে; কাজের আগে বদলে নিন |

না নেওয়ার কারণ না থাকলে adjacency list বানান। Undirected graph-এ দ্বিতীয় `push` ভুলে যাওয়াই setup-এর সবচেয়ে বেশি
হওয়া bug। এতে graph-এর অর্ধেকটা নিঃশব্দে হারিয়ে যায়।

### In-degree দিয়ে topological sort

এমন একটি ক্রম, যেখানে প্রতিটি node তার ওপর নির্ভরশীল সবকিছুর আগে আসে। Kahn's algorithm হলো in-degree-এর ওপর BFS,
আর এর কাজের বৈশিষ্ট্য হলো **cycle এটা বিনা খরচে ধরে ফেলে**। `V`-এর চেয়ে কম node বের হলে বাকিগুলো cycle-এর ভেতরে আছে।

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

DFS দিয়ে বিকল্প পথে তিনটি state লাগে: না-দেখা, এখনকার stack-এ আছে, আর পুরো দেখা শেষ। Recursion return করার সময়
node push করে, শেষে উল্টে দিলে ক্রম পাওয়া যায়। Kahn's ঠিকঠাক লেখা সহজ, আর বাড়তি হিসাব ছাড়াই cycle check দেয়।
তাই আলাদা করে না বললে Kahn's-ই নিন।

⚠️ Edge-এর দিক ধরে নেবেন না, problem statement থেকে পড়ুন। Course Schedule pair দেয় `[course, prerequisite]`
আকারে, যা আপনি যে edge রাখতে চান তার ঠিক উল্টো।

### Dijkstra: weight থাকলে সবচেয়ে সস্তা পথ

BFS সবচেয়ে কম edge-এর পথ খোঁজে। Edge-এর খরচ থাকলে সবচেয়ে কম মানেই সবচেয়ে সস্তা নয়। তাই frontier process করতে হয়
পৌঁছানোর ক্রমে নয়, জমা খরচের ক্রমে। মানে queue-এর বদলে min-heap।

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

বাস্তবে কাজে লাগার মতো implementation-এর পুরো কৌশল `cost > distance[node]` line-টায়। Binary heap-এ decrease-key
operation নেই। তাই entry update না করে আরেকটি push করা হয়, আর পুরনো copy ওপরে উঠে এলে ফেলে দেওয়া হয়। এই check
না থাকলেও algorithm থামে, কিন্তু যে node-এর হিসাব মিটে গেছে, সেটা আবার process করে।

Dijkstra ঠিক থাকে একটি ধারণার ওপর: **কোনো edge-এর weight negative নয়।** Negative edge থাকলে যে node-এর হিসাব
মিটে গেছে, সেটা পরে আরও সস্তা হয়ে যেতে পারে। তাতে "একবার pop হলে চূড়ান্ত" নিশ্চয়তা ভেঙে যায়। Negative weight-এ
লাগে Bellman-Ford, `O(V × E)`, যা negative cycle-ও ধরে।

### Union-Find: traversal ছাড়াই connectivity

প্রশ্ন যদি শুধু হয় "এই দুটি কি একই দলে", তাহলে traversal দরকারের চেয়ে বেশি যন্ত্রপাতি। Union-Find প্রতিটি দলের
একজন প্রতিনিধি রাখে, আর প্রায় constant time-এ উত্তর দেয়।

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

দুটি optimisation-ই লাগে। Path compression না থাকলে `find`-কে এমন chain ধরে হাঁটতে হয়, যা `O(n)` লম্বা হতে পারে।
Union by rank না থাকলে সেই chain তৈরিই হয়। দুটি একসঙ্গে থাকলে পাওয়া যায় inverse-Ackermann সীমা, যা memory-তে আঁটে
এমন যেকোনো input-এর জন্য 5-এর নিচে।

Redundant Connection-কে তিন line-এর problem বানায় `union`-এর return value। যে প্রথম edge `false` return করে,
সেটাই cycle বন্ধ করছে।

### কোন algorithm

| প্রশ্নে যা জানতে চায়                                      | ব্যবহার করুন               | খরচ                 |
| ------------------------------------------------------ | ------------------------ | -------------------- |
| নির্ভরতা মেনে একটি ক্রম                                  | Topological sort (Kahn's) | `O(V + E)`            |
| **Directed** graph-এ cycle আছে কি                      | Kahn's, বা তিন state-এর DFS | `O(V + E)`     |
| **Undirected** graph-এ cycle আছে কি                    | Union-Find, বা parent মনে রেখে DFS | `O(E α(V))` |
| গন্তব্যে যেতে সবচেয়ে কম edge                             | BFS                      | `O(V + E)`            |
| সবচেয়ে সস্তা পথ, weight negative নয়                      | Dijkstra                 | `O((V + E) log V)`     |
| সবচেয়ে সস্তা পথ, negative weight-ও চলে                    | Bellman-Ford             | `O(V × E)`             |
| **সব** জোড়ার মধ্যে সবচেয়ে সস্তা পথ                        | Floyd-Warshall           | `O(V³)`                |
| কয়টি connected component                                 | প্রতিটি না-দেখা node থেকে DFS, বা Union-Find | `O(V + E)` |
| এই দুটি কি যুক্ত, edge আসতে আসতে বারবার জিজ্ঞেস করা হয়     | Union-Find            | প্রতি query-তে `O(α(n))`    |

সবচেয়ে বেশি ভুল হয় **undirected** graph-এ cycle detection-এর row-টায়। সেখানে আগে দেখা node-এ পৌঁছানো মানে cycle
নয়। প্রতিটি edge দুই দিকেই চলে, তাই যে node থেকে এইমাত্র এসেছেন, সেটা সবসময়ই চোখে পড়ে। হয় parent মনে রেখে
সেটা বাদ দিন, নয়তো Union-Find ব্যবহার করুন। সেখানে `union` যদি `false` return করে, তাতে কোনো দ্ব্যর্থতা নেই।

## সাধারণ ভুল

**Undirected graph বানানো একদিকের edge দিয়ে:**

```typescript
// ❌ graph.get(from)!.push(to);                       // half the edges are missing
// ✅ push both directions when the graph is undirected
```

**Edge-এর দিক উল্টো পড়া:**

```typescript
// ❌ graph.get(course)!.push(prereq)   // LC 207 gives [course, prereq]; the edge runs the other way
// ✅ graph.get(prereq)!.push(course); inDegree[course]++;
```

**Directed cycle খুঁজতে একটিমাত্র visited flag:**

```typescript
// ❌ a single Set reports a cycle whenever two paths reach the same finished node
// ✅ three states: unvisited, on the current recursion stack, fully explored
```

**Undirected graph-এ আবার দেখা node-কে cycle ধরা:**

```typescript
// ❌ every edge looks like a cycle, because you can always walk back to the parent
// ✅ skip the node you arrived from, or use Union-Find
```

**Negative weight-এ Dijkstra:**

```typescript
// ❌ a negative edge can improve an already-settled node — the guarantee is gone
// ✅ Bellman-Ford, which also reports negative cycles
```

**Dijkstra-য় পুরনো entry-র check বাদ দেওয়া:**

```typescript
// ❌ processing every heap entry — settled nodes get reprocessed
// ✅ if (cost > distance[node]) continue;
```

**মাত্র একটি optimisation-সহ Union-Find:**

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

| #   | Problem                                                   | কঠিনতা     | কী অনুশীলন হয়                                     |
| --- | --------------------------------------------------------- | ---------- | ----------------------------------------------- |
| 207 | Course Schedule                                           | Medium     | In-degree, আর বিনা খরচে cycle check               |
| 210 | Course Schedule II                                        | Medium     | একই algorithm, যা ক্রমটা return করে               |
| 133 | Clone Graph                                               | Medium     | একটি `Map`, যা একসঙ্গে visited set আর output      |
| 323 | Number of Connected Components in an Undirected Graph      | Medium     | প্রতিটি না-দেখা node থেকে DFS, বা Union-Find       |
| 684 | Redundant Connection                                      | Medium     | প্রথম যে `union` false return করে                 |
| 261 | Graph Valid Tree                                          | Medium     | Connected **আর** acyclic, edge ঠিক `V - 1`টি      |
| 743 | Network Delay Time                                        | Medium     | Dijkstra, আর পুরনো entry skip করা                  |
| 787 | Cheapest Flights Within K Stops                           | Medium     | Hop-এর সীমা থাকলে সাধারণ Dijkstra কেন যথেষ্ট নয়    |
| 269 | Alien Dictionary                                          | Hard       | Sort করার আগে edge-গুলো বের করা                    |

আগে 207, তারপর 210। একই code, একটি boolean return করে, অন্যটি ক্রম। তারপর 743, আর ঠিক পরেই 787। Hop-এর শর্তটাই
দেখায় Dijkstra কেন কাজ করে তা আপনি সত্যিই বুঝেছেন কি না।

## 🔑 মূল শিক্ষা

- আগে চারটি বৈশিষ্ট্য পরিষ্কার করুন: directed, weighted, connected, cyclic। Algorithm এরাই বেছে দেয়।
- Adjacency list বানান, আর graph undirected হলে **দুই** দিকেই push করুন।
- Kahn's algorithm একই pass-এ topological order দেয় আর cycle ধরে। Output ছোট হলে মানেই cycle আছে।
- Dijkstra BFS-এর queue-এর জায়গায় min-heap বসায়, আর weight negative হলে চলে না। Negative edge থাকলে Bellman-Ford।
- Union-Find কার্যত constant time-এ connectivity-র উত্তর দেয়, কিন্তু path compression আর union by rank **দুটিই** লাগে।

## Interview-এর প্রশ্ন

**Q: Graph-এর code লেখার আগে কী জিজ্ঞেস করবেন?**

Graph directed কি না, edge weighted কি না, connected হওয়ার নিশ্চয়তা আছে কি না, আর cycle থাকতে পারে কি না। প্রতিটি
উত্তর কিছু algorithm বাদ দিয়ে দেয়। Unweighted-এ shortest path মানে BFS, weighted মানে Dijkstra, নির্ভরতার ক্রম মানে
topological sort। আর "connected কি না" ঠিক করে traversal একটি node থেকে চালালেই হবে, নাকি প্রতিটি node থেকে।

**Q: Kahn's algorithm cycle কীভাবে ধরে?**

এটা শুধু সেই node-গুলো enqueue করে, যাদের in-degree শূন্যে নেমেছে, মানে সব prerequisite পূরণ হয়েছে। Cycle-এর
ভেতরের node-এর অন্তত একটি prerequisite সবসময় অপূর্ণ থাকে, আর সেটা একই cycle-এর অন্য কোনো node। তাই তার in-degree
কখনো শূন্য হয় না, আর সেটা কখনো enqueue হয় না। Output-এ `V`-এর চেয়ে কম node থাকলে যেগুলো বাদ পড়েছে, তারা অন্তত
একটি cycle তৈরি করে।

**Q: BFS-এর queue হলেই চলে, অথচ Dijkstra-র heap লাগে কেন?**

BFS-এর নিশ্চয়তা আসে edge-এর সংখ্যার ক্রমে node process করা থেকে। প্রতিটি edge-এর খরচ সমান হলে FIFO queue এই ক্রম
বিনা খরচেই দেয়। Weight থাকলে পৌঁছানোর ক্রম আর খরচের ক্রম আলাদা হয়ে যায়, কারণ তিনটি সস্তা edge একটি দামি edge-কে
হারাতে পারে। তাই frontier process করতে হয় সবচেয়ে সস্তাটা আগে রেখে, আর min-heap ঠিক সেটাই দেয়। `log V` গুণফলটা
আসে এখান থেকেই।

**Q: Negative edge weight থাকলে Dijkstra-র কী ভাঙে?**

এর মূল invariant হলো, কোনো node একবার pop হলে তার distance চূড়ান্ত। এটা খাটে কারণ প্রতিটি পরের ধাপ শুধু
non-negative খরচ যোগ করে। Negative edge থাকলে হিসাব মিটে যাওয়া node পরে আরও সস্তা হয়ে যেতে পারে। তখন invariant
ভেঙে যায়, আর উত্তর ভুল আসতে পারে। Bellman-Ford সব edge `V - 1` বার relax করে এটা সামলায়, খরচ `O(V × E)`। এরপর
আরেকবার relax করলেও যদি কিছু কমে, তাহলে প্রমাণ হয় যে negative cycle আছে।

**Q: কখন DFS বা BFS-এর বদলে Union-Find ব্যবহার করবেন?**

যখন প্রশ্ন শুধু connectivity নিয়ে, আর edge আসে একটু একটু করে: "এই দুটি কি যুক্ত", "কোন edge cycle বানায়", "এখন
কয়টি দল"। Union-Find আবার traversal না করেই প্রতিটির উত্তর দেয় কার্যত constant time-এ। DFS-এ প্রতি query-তে খরচ হতো
`O(V + E)`। তবে path, distance বা কোনো ক্রম লাগলে DFS-ই ঠিক হাতিয়ার। Union-Find দল চেনে, পথ চেনে না।

**Q: Undirected graph-এ cycle detection আলাদা কেন?**

Directed graph-এ cycle মানে এখনো recursion stack-এ থাকা node-এ back edge। Undirected graph-এ প্রতিটি edge দুই দিকেই
চলা যায়। তাই যে node থেকে এইমাত্র এসেছেন, সেটা সবসময়ই সামনে পড়ে, আর সেটা cycle নয়। Parent-কে আলাদা করে skip
করতে হয়। নয়তো Union-Find ব্যবহার করুন। সেখানে আগে থেকেই একই set-এ থাকা দুটি node-এর মধ্যে edge মানেই cycle,
কোনো দ্ব্যর্থতা ছাড়া।

**Q: সাধারণ Dijkstra কেন Cheapest Flights Within K Stops সমাধান করতে পারে না?**

কারণ state এখন আর শুধু node নয়। Hop-এর সীমা থাকলে অনেক stop পেরিয়ে কম খরচে কোনো শহরে পৌঁছানো, কম stop-এ বেশি
খরচে পৌঁছানোর চেয়ে খারাপ হতে পারে। তাই শুধু node ধরে "একবার মিটলে চূড়ান্ত" নিয়ম খাটে না। সমাধান হলো state-কে
`(city, stops used)` বানানো। অথবা Bellman-Ford ব্যবহার করা, যার `k` round-এর relaxation স্বাভাবিকভাবেই `k` hop-এর
সঙ্গে মিলে যায়।

## এরপর কী পড়বেন

- [Chapter ?? — Breadth-First Search](#ch-breadth-first-search) — unweighted shortest path, যাকে Dijkstra সাধারণ রূপ দেয়
- [Chapter ?? — Depth-First Search](#ch-depth-first-search) — topological sort-এর বিকল্প রূপের নিচে যে traversal
- [Chapter ?? — Top K Element](#ch-top-k-elements) — যে min-heap-এর ওপর Dijkstra চলে
