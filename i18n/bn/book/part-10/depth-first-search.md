---
sourceHash: "39322248d7c1c3a362a339fced35b2ebd639cc3cff48d15a81f1695b3fce8bb7"
title: "Depth-First Search"
translatedAt: "2026-10-19T10:26:09.999Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Depth-First Search {#ch-depth-first-search}

> একটি path ধরে যতদূর যাওয়া যায় যান, তারপর পিছিয়ে এসে পরেরটা ধরুন। সঙ্গে রাখুন visited set, যাতে cycle-এ আটকে না যান।

**এই অধ্যায়ে:** recursive template · graph-এ visited set লাগে কেন, tree-তে লাগে না কেন · grid আসলে লুকোনো graph · recurse করার আগে mark করা · path-টাই মনে রাখা · recursion কত গভীরে গেলে explicit stack লাগে

## 💡 মূল ধারণা

Depth-first search একদিক বেছে নিয়ে সেদিকেই এগোয়। যেখানে আছেন, সেখান থেকে প্রথম যে neighbour এখনো দেখা
হয়নি, সেটা ধরুন। এগোতে থাকুন যতক্ষণ না পথ ফুরায়। তারপর এক ধাপ পিছিয়ে পরের neighbour চেষ্টা করুন। Tree traversal
আসলে DFS-ই, শুধু structure-টায় কোনো cycle নেই। দেখুন
[Chapter ?? — Binary Tree Traversal](#ch-binary-tree-traversal)।

Structure-টা সাধারণ graph হয়ে গেলে দুটি জিনিস বদলায়:

- **একই node-এ দুবার পৌঁছানো যায়।** তাই visited set লাগে, নইলে একই কাজ বারবার হয়।
- **Path ঘুরে আগের জায়গায় ফিরতে পারে।** তাই set না থাকলে recursion কখনো থামে না।

পার্থক্য এটুকুই। Recursion সেই একই চার line।

> Backtracking আপনি recursion থেকে বিনা খরচে পেয়ে যান, কারণ call থেকে return করা *মানেই* পিছিয়ে আসা। এজন্যই
> DFS-এর code এত ছোট। আর এজন্যই এর খরচ আলাদা কোনো data structure নয়, stack space।

## কীভাবে কাজ করে

### Template

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

**Node-এ ঢুকেই mark করুন।** Recursive call-গুলো return করার পরে mark করলে cycle ঘুরে আবার সেই node-এ ঢুকে পড়ে,
mark বসার আগেই। ফলে recursion চলতেই থাকে। DFS-এ সবচেয়ে বেশি হওয়া bug এটাই।

Complexity বলবেন `O(V + E)`: প্রতিটি node-এ একবার ঢোকা হয়, আর প্রতিটি edge দুই প্রান্ত থেকে একবার করে দেখা হয়।

### Grid-ও graph

Grid-এর প্রশ্নে "graph" শব্দটা খুব কমই থাকে। কিন্তু একটি cell-এর neighbour তার চারপাশের চারটি cell, আর বাকি সব
একই রকম। Number of Islands মানে প্রতিটি না-দেখা land cell থেকে একবার করে DFS চালানো:

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

এই code-এর দুটি অভ্যাস অন্য জায়গাতেও কাজে লাগে:

- **বাতিলের সব শর্ত ওপরে একটি guard-এ রাখুন।** Call করার জায়গায় bounds check করলে একই শর্ত চারবার লিখতে হয়।
  আর যেটা লিখতে ভুলে যাবেন, error ঠিক সেখানেই throw হবে।
- **Grid-টাই বদলে দেওয়া visited set হিসেবে পুরোপুরি চলে।** `r,c` key-এর একটি `Set`-এর বদলে space লাগে `O(1)`।
  তবে মুখে বলে দিন যে এতে input নষ্ট হয়। Caller-এর আসল grid দরকার হলে আলাদা `visited` grid রাখার প্রস্তাব দিন।

### শুধু উত্তর নয়, path-টাও মনে রাখা

"Path আছে কি না" জানতে কোনো হিসাব রাখতে হয় না। "Path-টা দিন" বললে লাগে push আগে, pop পরে। Backtracking-এর
গড়নও ঠিক এটাই:

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

`results.push(path)` না লিখে `results.push([...path])` লেখাটা style-এর ব্যাপার নয়। Reference push করলে এমন
array জমা হয়, যেটা `pop()` একটু পরেই খালি করে দেবে। ফলে প্রতিটি result ভুল আসে।

### যখন recursion চলে না

Call stack-এর সীমা সত্যিই আছে। V8-এ মোটামুটি 10⁴ frame-এর পর error throw হয়। 10⁵ node একটানা chain-এ থাকলে
stack overflow হবেই। Explicit stack-এর version crash-এর বদলে heap memory খরচ করে:

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

⚠️ Iterative version-এ একই node stack-এ একাধিকবার থাকতে পারে। তাই visited check করতে হবে **pop করার সময়**,
push-এর সময়ের সঙ্গে অথবা তার বদলে। শুধু push-এর আগে check করা ভুল নয়, কিন্তু দুটি মিশিয়ে ফেলা ভুল।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                        | কী ব্যবহার করবেন   | কেন                                          |
| ---------------------------------------------------------- | --------------- | ------------------------------------------ |
| "…এর মধ্যে কোনো path আছে কি"                                | DFS             | যেকোনো path হলেই চলে, তাই একটি ধরে এগোন       |
| Connected component: island, region, province              | প্রতিটি না-দেখা cell থেকে DFS | প্রতিবার চালালে একটি component শেষ হয় |
| Root থেকে leaf পর্যন্ত সব path, বা সব বৈধ configuration       | DFS + backtracking | নামার পথেই path তৈরি হয়               |
| Directed graph-এ cycle খোঁজা                                 | তিন state-এর DFS | এখনো stack-এ থাকা node-এ back edge মানেই cycle |
| Unweighted graph-এ **সবচেয়ে ছোট** path                       | **BFS**         | DFS কোনো একটি path দেয়, সবচেয়ে ছোটটা নয়            |
| উত্তর root-এর কাছে, বা tree খুব গভীর                         | BFS             | DFS আগে লম্বা কোনো ভুল branch-এ নেমে যেতে পারে |
| Weighted shortest path                                     | Dijkstra        | সাধারণ DFS বা BFS কোনোটাই weight সামলায় না     |

এই রূপগুলোর মধ্যে cycle detection-ই সবচেয়ে বেশি আসে, কারণ Course Schedule খুব চেনা প্রশ্ন। এখানে প্রতিটি node-এ
একটি নয়, দুটি boolean লাগে। `visiting` হলো এখনকার recursion stack-এ থাকা node-এর জন্য, আর `visited` হলো
পুরোপুরি দেখা হয়ে যাওয়া node-এর জন্য। `visiting` node-এ পৌঁছানো মানে cycle। `visited` node-এ পৌঁছানো মানে শুধু
শেষ হয়ে যাওয়া subgraph-এ ঢোকার আরেকটি রাস্তা। একটি flag দিয়ে দুটিকে এক করে ফেললে এমন cycle-ও ধরা পড়ে, যা আসলে
নেই। Topological sort এর ওপরেই দাঁড়ানো। দেখুন
[Chapter ?? — Graph Algorithm](#ch-graph-algorithms)।

## সাধারণ ভুল

**Graph-এ কোনো visited set নেই:**

```typescript
// ❌ recursing into neighbours with no guard — a cycle means infinite recursion
// ✅ if (visited.has(node)) return; visited.add(node);
```

**Recursive call-এর পরে visited mark করা:**

```typescript
// ❌ for (const n of neighbours) explore(n); visited.add(node);
// ✅ visited.add(node) first — a cycle re-enters before the mark lands
```

**Call করার জায়গায় bounds check:**

```typescript
// ❌ if (r + 1 < rows) sink(r + 1, c);   // four copies, and the missing one throws
// ✅ one guard at the top of sink handles bounds and visited together
```

**Path-টা reference হিসেবে রেখে দেওয়া:**

```typescript
// ❌ results.push(path);        // every result aliases the same array, which pop() empties
// ✅ results.push([...path]);
```

**Path Sum-এ leaf-এর test ভুল করা:**

```typescript
// ❌ if (node.left === null || node.right === null)   // a one-child node is not a leaf
// ✅ if (node.left === null && node.right === null)
```

**Shortest path-এর জন্য DFS চালানো:**

```typescript
// ❌ DFS returns the first path it finds, which is rarely the shortest
// ✅ BFS on an unweighted graph; Dijkstra when edges have weights
```

**Directed cycle খুঁজতে একটিমাত্র visited flag:**

```typescript
// ❌ one Set — reports a cycle whenever two paths reach the same finished node
// ✅ two states: on the current stack, versus fully explored
```

## অনুশীলনের জন্য Problem

| #   | Problem                              | কঠিনতা     | কী অনুশীলন হয়                                     |
| --- | ------------------------------------ | ---------- | ----------------------------------------------- |
| 104 | Maximum Depth of Binary Tree         | Easy       | সবচেয়ে ছোট DFS                                    |
| 112 | Path Sum                             | Easy       | Leaf-এর test, আর বিয়োগের কৌশল                     |
| 200 | Number of Islands                    | Medium     | Graph হিসেবে grid, আর grid-ই তার নিজের visited set |
| 113 | Path Sum II                          | Medium     | Push আগে, pop পরে, আর result copy করা             |
| 695 | Max Area of Island                   | Medium     | Recursion থেকে value ওপরে ফেরত পাঠানো              |
| 133 | Clone Graph                          | Medium     | একটি `Map`, যা একসঙ্গে visited আর output দুটিই      |
| 207 | Course Schedule                      | Medium     | দুই state দিয়ে cycle detection                    |
| 124 | Binary Tree Maximum Path Sum         | Hard       | একটি value return করা, অন্যটি আলাদা করে রেকর্ড রাখা  |

আগে 200, তারপর 695। দ্বিতীয়টা আসলে প্রথমটাই, শুধু কিছু না দিয়ে একটি count return করে। তারপর 207। দুই state-এর
visited set ছাড়া যে চলে না, সেটা এখানে এসেই বোঝা যায়।

## 🔑 মূল শিক্ষা

- Graph-এ DFS মানে tree traversal, সঙ্গে একটি visited set। Set না থাকলে cycle মানেই infinite loop।
- Node-কে visited mark করুন **ঢোকার সঙ্গে সঙ্গে**, recurse করার আগে। নইলে cycle ঘুরে আগেই আবার সেখানে ঢুকে পড়ে।
- Grid এমন graph, যার neighbour পাশের চারটি cell। Grid-টাই বদলে দেওয়া বৈধ `O(1)` visited set।
- Path রেকর্ড করতে লাগে push আগে, pop পরে, আর result জমা রাখার সময় একটি **copy**।
- DFS *কোনো একটি* path খুঁজে দেয়, সবচেয়ে ছোটটা কখনো নয়। সেটা BFS-এর কাজ, আর weighted shortest path-এ লাগে Dijkstra।

## Interview-এর প্রশ্ন

**Q: Tree traversal-এ visited set লাগে না, অথচ graph-এ DFS করতে লাগে কেন?**

Tree-তে প্রতিটি node-এ যাওয়ার path ঠিক একটি, আর কোনো cycle নেই। তাই কোনো node-এ দুবার পৌঁছানো যায় না। সাধারণ
graph-এ এর কোনোটারই নিশ্চয়তা নেই। Visited set না থাকলে diamond আকারের অংশে কাজ দুবার হয়, আর cycle-এ recursion
কখনো থামে না। Set থাকলে "সব path ঘুরে দেখা" হয়ে যায় "সব node ঘুরে দেখা"। Complexity `O(V + E)`-এ নামে এ কারণেই।

**Q: ঠিক কোথায় node-কে visited mark করবেন, আর ভুল জায়গায় করলে কী ভাঙে?**

Node-এ ঢোকার সঙ্গে সঙ্গে, তার neighbour-গুলো ঘোরার আগেই। Recursive call return করার পরে mark করলে A → B → A
cycle-এ A-তে দ্বিতীয়বার ঢোকা হয় তখন, যখন A-তে mark পড়েনি। ফলে recursion চিরকাল ঘুরতে থাকে। Function-এর প্রথম
দুই line হওয়া উচিত `visited.has()` check আর `visited.add()`।

**Q: কখন BFS বেছে নেওয়াই ঠিক?**

যখন প্রশ্নে unweighted graph-এ shortest path বা সবচেয়ে কম কয়টি step লাগে, তা জানতে চাওয়া হয়। BFS node-এ পৌঁছায়
দূরত্বের ক্রমে, তাই প্রথমবার যেখানে পৌঁছায়, সেটাই সবচেয়ে ছোট পথ। উত্তর শুরুর কাছাকাছি থাকার সম্ভাবনা থাকলেও
BFS ভালো, কারণ DFS আগে লম্বা কোনো ভুল branch-এ নেমে যেতে পারে। আর graph এত গভীর হলে যে recursion-এ stack
overflow হবে, তখনও।

**Q: DFS দিয়ে directed graph-এ cycle কীভাবে খুঁজবেন?**

প্রতিটি node-কে তিনটি state দিন: এখনো দেখা হয়নি, এখনকার recursion stack-এ আছে, আর পুরোপুরি দেখা শেষ। যে node
এখনকার stack-এ আছে, সেখানে পৌঁছানো মানে back edge, আর back edge মানেই cycle। পুরো দেখা শেষ এমন node-এ পৌঁছানো
মানে শুধু আগেই শেষ করা subgraph-এ ঢোকার আরেকটি রাস্তা, তাতে সমস্যা নেই। এই দুটিকে একটি flag-এ মিশিয়ে ফেলাই
চিরচেনা ভুল উত্তর। তাতে cycle-হীন diamond-এও cycle ধরা পড়ে।

**Q: DFS আর backtracking-এর পার্থক্য কী?**

Backtracking-ও DFS, তবে নির্দিষ্ট কোনো graph-এর ওপর নয়, *সম্ভাব্য সমাধানের* জগতের ওপর। সঙ্গে দুটি জিনিস যোগ হয়।
ফেরার পথে state আগের মতো করে দেওয়া হয়। আর যে branch থেকে বৈধ উত্তর আসতে পারে না, সেটা সঙ্গে সঙ্গে ছেঁটে ফেলা
হয়। Path Sum II দুটির সীমানায় পড়ে: সত্যিকারের tree-র ওপর DFS, কিন্তু push/pop-এর নিয়মের জন্য পড়তে backtracking-এর
মতো লাগে।

**Q: Graph-এ 10⁵ node একটানা chain-এ আছে। কী বদলায়?**

Recursion-এ call stack overflow হয়, কারণ V8 মোটামুটি 10⁴ frame পর্যন্ত চলতে দেয়। তাই একই algorithm heap-এর
ওপর explicit stack দিয়ে লিখতে হয়। Complexity একই থাকে, `O(V + E)`। বদলায় শুধু memory কোথায় থাকে। তখন visited
check করতে হয় pop করার সময়, কারণ প্রথমবার process হওয়ার আগেই একটি node একাধিক neighbour থেকে push হয়ে যেতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — Breadth-First Search](#ch-breadth-first-search) — একই অনুসন্ধান, তবে দূরত্বের ক্রমে, আর সেজন্যই shortest path পাওয়া যায়
- [Chapter ?? — Backtracking](#ch-backtracking) — সম্ভাব্য সমাধানের ওপর DFS, pruning-সহ
- [Chapter ?? — Graph Algorithm](#ch-graph-algorithms) — topological sort, এই অধ্যায়ের cycle detection-এর পূর্ণ রূপ
