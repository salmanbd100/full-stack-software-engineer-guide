---
sourceHash: "39322248d7c1c3a362a339fced35b2ebd639cc3cff48d15a81f1695b3fce8bb7"
title: "Depth-First Search"
translatedAt: "2026-10-13T03:14:56.130Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Depth-First Search {#ch-depth-first-search}

> একটি path যতদূর যায়, ততদূর যান। তারপর পিছিয়ে এসে পরেরটা ধরুন — একটি visited set সাথে রেখে, যাতে কোনো cycle আপনাকে আটকে ফেলতে না পারে।

**এই অধ্যায়ে:** recursive template · কেন graph-এ visited set লাগে আর tree-তে লাগে না · implicit graph হিসেবে grid · recurse করার আগে mark করা · path-টিই track করা · যে recursion depth explicit stack বাধ্য করে

## 💡 মূল ধারণা

Depth-first search একবার পথ ধরলে সেটাতেই লেগে থাকে। আপনি যেখানেই থাকুন, প্রথম অনাবিষ্কৃত neighbour-টি নিন, আর এগোতে
থাকুন যতক্ষণ না পথ ফুরায়। তারপর এক ধাপ পিছিয়ে পরেরটা চেষ্টা করুন। Tree traversal হলো এমন একটি গঠনের ওপর DFS,
যেটায় ঘটনাচক্রে কোনো cycle নেই —
[Chapter ?? — Binary Tree Traversal](#ch-binary-tree-traversal) দেখুন।

গঠনটা সাধারণ graph হয়ে গেলে দুটো জিনিস বদলায়:

- **একটি node-এ দুবার পৌঁছানো যায়**, তাই একটি visited set লাগে, নইলে একই কাজ বারবার হয়।
- **Path ঘুরে আগের জায়গায় ফিরতে পারে**, তাই ওই set ছাড়া recursion কখনো শেষ হয় না।

পার্থক্য পুরোটা এটুকুই। Recursion সেই একই চার line।

> Recursion আপনাকে backtracking বিনামূল্যে দেয় — একটি call থেকে return করা *মানেই* পিছিয়ে আসা। এ কারণেই DFS-এর
> code ছোট, আর এর খরচ কোনো explicit data structure নয়, stack space।

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

**ঢোকার সময়েই mark করুন।** Recursive call-গুলো return করার পরে node mark করলে, mark বসার আগেই একটি cycle আবার
সেখানে ঢুকে পড়ে, আর recursion চিরকাল চলে। DFS-এর সবচেয়ে সাধারণ bug এটাই।

যে complexity বলবেন, সেটা `O(V + E)`: প্রতিটি node-এ একবার ঢোকা হয়, আর প্রতিটি edge তার প্রতিটি প্রান্ত থেকে একবার
দেখা হয়।

### Grid-ও graph

Grid-এর প্রশ্নে খুব কমই "graph" শব্দটা থাকে। কিন্তু একটি cell-এর neighbour হলো তার চারপাশের চারটি cell, আর বাকি কিছুই
বদলায় না। Number of Islands হলো প্রতিটি unvisited land cell-এর জন্য একবার করে DFS চালানো:

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

এই code-এর দুটো অভ্যাস সব জায়গায় খাটে:

- **সব বাতিলের শর্ত ওপরে একটিই guard-এ গুটিয়ে আনুন।** Call-এর জায়গায় bounds check করলে একই শর্তের চারটি copy হয়।
  আর যেটা ভুলে যাবেন, সেটাই throw করবে।
- **Grid-টি mutate করাও একটি বৈধ visited set** — `r,c` key-এর একটি `Set`-এর বদলে `O(1)` space। মুখে বলুন যে
  এটা input নষ্ট করে। আর caller-এর মূল grid দরকার হলে আলাদা একটি `visited` grid-এর প্রস্তাব দিন।

### শুধু উত্তর নয়, path-টিও track করা

"একটি path আছে কি না" — এর জন্য কোনো হিসাব রাখতে হয় না। "Path-টি দিন" — এর জন্য আগে push, পরে pop লাগে।
Backtracking-এর ঠিক একই আকার:

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

`results.push(path)`-এর বদলে `results.push([...path])` কোনো style-এর ব্যাপার নয়। Reference push করলে এমন একটি
array জমা হয়, যেটা `pop()` একটু পরেই খালি করে দেবে। ফলে প্রতিটি result ভুল হয়ে যায়।

### যখন recursion চলবে না

Call stack একটি সত্যিকারের সীমা — V8-এ throw করার আগে মোটামুটি 10⁴ frame। একটি chain-এ 10⁵ node-এর graph overflow
করবে। Explicit stack-এর version crash-এর বদলে heap memory খরচ করে:

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

⚠️ Iterative version-এ একই node stack-এ একাধিকবার থাকতে পারে। তাই visited check push-এর সাথে (বা push-এর বদলে)
**pop-এর সময়েও** করতে হবে। শুধু push-এর আগে check করা ভুল নয়, কিন্তু দুটো মিশিয়ে ফেলা ভুল।

## কখন ব্যবহার করবেন

| প্রশ্নে যে সংকেত থাকে                                     | কী ব্যবহার করবেন       | কেন                                        |
| ---------------------------------------------------------- | --------------- | ------------------------------------------ |
| "…এর মধ্যে কোনো path আছে কি"                                | DFS             | যেকোনো path হলেই চলে, তাই একটিতে লেগে থাকুন          |
| Connected component — island, region, province          | প্রতিটি unvisited cell-এ DFS | প্রতিবার চালু করলে একটি component শেষ হয়  |
| সব root-to-leaf path, বা সব বৈধ configuration         | DFS + backtracking | Path তৈরি হয় নিচে নামার পথে    |
| Directed graph-এ cycle খুঁজে বের করা                         | তিন state-এর DFS | এখনো stack-এ থাকা একটি node-এ back edge মানেই cycle |
| Unweighted graph-এ **shortest** path                    | **BFS**         | DFS একটি path খুঁজে পায়, shortest-টি নয়           |
| উত্তর root-এর কাছে, বা tree খুব গভীর       | BFS             | DFS আগে একটি লম্বা ভুল branch-এ নেমে যেতে পারে    |
| Weighted shortest path                                     | Dijkstra        | সাধারণ DFS বা BFS কোনোটাই weight সামলায় না    |

Cycle detection-ই সবচেয়ে বেশি আসার সম্ভাবনা থাকা রূপভেদ, কারণ Course Schedule একটি প্রচলিত প্রশ্ন। প্রতি node-এ একটি
নয়, দুটো boolean লাগে: বর্তমান recursion stack-এ থাকা node-এর জন্য `visiting`, আর পুরোপুরি explore করা node-এর
জন্য `visited`। একটি `visiting` node-এ পৌঁছানো মানে cycle। একটি `visited` node-এ পৌঁছানো মানে শুধু শেষ হয়ে যাওয়া
একটি subgraph-এ যাওয়ার দ্বিতীয় একটি পথ। একটি flag দুটোকে গুলিয়ে ফেলে, আর এমন cycle report করে যার অস্তিত্বই নেই।
Topological sort এর ওপরেই দাঁড়ায় —
[Chapter ?? — Graph Algorithm](#ch-graph-algorithms) দেখুন।

## সাধারণ ভুল

**Graph-এ কোনো visited set না রাখা:**

```typescript
// ❌ recursing into neighbours with no guard — a cycle means infinite recursion
// ✅ if (visited.has(node)) return; visited.add(node);
```

**Recursive call-এর পরে visited mark করা:**

```typescript
// ❌ for (const n of neighbours) explore(n); visited.add(node);
// ✅ visited.add(node) first — a cycle re-enters before the mark lands
```

**Call-এর জায়গায় bounds check করা:**

```typescript
// ❌ if (r + 1 < rows) sink(r + 1, c);   // four copies, and the missing one throws
// ✅ one guard at the top of sink handles bounds and visited together
```

**Path reference হিসেবে জমা রাখা:**

```typescript
// ❌ results.push(path);        // every result aliases the same array, which pop() empties
// ✅ results.push([...path]);
```

**Path Sum-এ leaf test ভুল করা:**

```typescript
// ❌ if (node.left === null || node.right === null)   // a one-child node is not a leaf
// ✅ if (node.left === null && node.right === null)
```

**Shortest path-এর জন্য DFS ব্যবহার করা:**

```typescript
// ❌ DFS returns the first path it finds, which is rarely the shortest
// ✅ BFS on an unweighted graph; Dijkstra when edges have weights
```

**Directed cycle detection-এ একটিমাত্র visited flag:**

```typescript
// ❌ one Set — reports a cycle whenever two paths reach the same finished node
// ✅ two states: on the current stack, versus fully explored
```

## অনুশীলনের জন্য Problem

| #   | Problem                              | কঠিনতা | যা অনুশীলন করায়                                  |
| --- | ------------------------------------ | ---------- | ----------------------------------------------- |
| 104 | Maximum Depth of Binary Tree         | Easy       | সম্ভাব্য সবচেয়ে ছোট DFS                        |
| 112 | Path Sum                             | Easy       | Leaf test, আর বিয়োগটা               |
| 200 | Number of Islands                    | Medium     | Graph হিসেবে grid, আর grid নিজেই তার visited set |
| 113 | Path Sum II                          | Medium     | আগে push, পরে pop, আর result copy করা   |
| 695 | Max Area of Island                   | Medium     | Recursion থেকে ওপরে একটি value return করা          |
| 133 | Clone Graph                          | Medium     | একটি `Map`, যেটা একসাথে visited আর output    |
| 207 | Course Schedule                      | Medium     | দুই-state-এর cycle detection                        |
| 124 | Binary Tree Maximum Path Sum         | Hard       | একটি value return করা, আর অন্য একটি record করা      |

আগে 200, তারপর 695 করুন — দ্বিতীয়টা হলো প্রথমটাই, শুধু কিছু না দিয়ে একটি count return করে। তারপর 207, যেখানে
দুই-state-এর visited set এড়ানো আর যায় না।

## 🔑 মূল শিক্ষা

- Graph-এ DFS হলো tree traversal আর একটি visited set। Set না থাকলে একটি cycle মানে infinite loop।
- Node visited mark করুন **ঢোকার সময়েই**, recurse করার আগে। নইলে একটি cycle আগেই আবার ঢুকে পড়ে।
- Grid হলো এমন একটি graph, যার neighbour পাশের চারটি cell। একে mutate করাও একটি বৈধ `O(1)` visited set।
- Path record করতে আগে push, পরে pop লাগে। আর result জমা রাখার সময় একটি **copy** লাগে।
- DFS *একটি* path খুঁজে পায়, কখনোই shortest-টি নয় — সেটা BFS-এর কাজ। আর weighted shortest path-এর জন্য Dijkstra লাগে।

## Interview-এর প্রশ্ন

**Q: Tree traversal-এ visited set লাগে না, কিন্তু graph-এ DFS-এর কেন লাগে?**

একটি tree-তে প্রতিটি node-এ যাওয়ার ঠিক একটিই path, আর কোনো cycle নেই। তাই কোনো node-এ দুবার পৌঁছানো যায় না।
সাধারণ graph-এ এর কোনো নিশ্চয়তাই নেই। Visited set না থাকলে একটি diamond আকার কাজ দ্বিগুণ করে, আর একটি cycle
recursion-কে কখনো শেষ হতে দেয় না। Set-টি "সব path explore করুন"-কে "সব node explore করুন"-এ বদলে দেয়। এটাই
complexity-কে `O(V + E)`-তে নামিয়ে আনে।

**Q: ঠিক কোথায় একটি node visited mark করবেন, আর ভুল করলে কী ভাঙে?**

Node-এ ঢোকার সাথে সাথে, তার neighbour-দের ওপর iterate করার আগে। Recursive call return করার পরে mark করলে,
A → B → A cycle-এ A-তে দ্বিতীয় visit ঘটে যখন A তখনো unmarked, আর recursion চিরকাল চলতে থাকে। `visited.has()`
check আর `visited.add()` function-এর প্রথম দুটো line হওয়া উচিত।

**Q: কখন BFS-ই সঠিক পছন্দ?**

যখন প্রশ্নে unweighted graph-এ shortest path বা সবচেয়ে কম step চাওয়া হয় — BFS দূরত্বের ক্রমে node-এ পৌঁছায়, তাই
প্রথমবার যেখানে পৌঁছায়, সেটাই সবচেয়ে ছোট পথ। এছাড়া যখন উত্তর সম্ভবত শুরুর কাছেই, কারণ DFS আগে একটি লম্বা ভুল branch-এ
নেমে যেতে পারে। আর যখন graph এত গভীর যে recursion stack overflow করবে।

**Q: DFS দিয়ে directed graph-এ cycle কীভাবে খুঁজবেন?**

প্রতিটি node-কে তিনটি state দিন: unvisited, বর্তমান recursion stack-এ আছে, আর পুরোপুরি explore করা। বর্তমান stack-এ
থাকা একটি node-এ পৌঁছানো মানে একটি back edge, অর্থাৎ cycle। পুরোপুরি explore করা একটি node-এ পৌঁছানো মানে শুধু
আগেই শেষ করা একটি subgraph-এ ঢোকার দ্বিতীয় পথ, তাতে কোনো সমস্যা নেই। দুটোকে একটি flag-এ মিশিয়ে ফেলাই চিরাচরিত
ভুল উত্তর, যেটা একটি acyclic diamond-এ cycle report করে।

**Q: DFS আর backtracking-এর পার্থক্য কী?**

Backtracking হলো একটি নির্দিষ্ট graph-এর বদলে *candidate solution*-এর একটি space-এর ওপর DFS, দুটো সংযোজন সহ:
ফেরার পথে state আগের অবস্থায় ফিরিয়ে আনা হয়, আর যে branch থেকে বৈধ উত্তর আসা সম্ভব নয়, সেটা সাথে সাথে prune করা
হয়। Path Sum II হলো সীমানার উদাহরণ — একটি সত্যিকারের tree-এর ওপর DFS, কিন্তু push/pop-এর এমন নিয়মে, যে পড়তে
backtracking-এর মতো লাগে।

**Q: Graph-এ একটি chain-এ 10⁵ node আছে। কী বদলায়?**

Recursion call stack overflow করে — V8 মোটামুটি 10⁴ frame পর্যন্ত দেয়। তাই একই algorithm heap-এ একটি explicit stack
দিয়ে লিখতে হয়। Complexity বদলায় না, `O(V + E)`-ই থাকে। শুধু memory কোথায় থাকে, সেটা বদলায়। তখন visited check
pop-এর সময় করতে হয়, কারণ প্রথমবার process হওয়ার আগে একটি node একাধিক neighbour দিয়ে push হতে পারে।

## এরপর কী পড়বেন

- [Chapter ?? — Breadth-First Search](#ch-breadth-first-search) — একই exploration, দূরত্বের ক্রমে সাজানো, আর এটা কেন shortest path খুঁজে পায়
- [Chapter ?? — Backtracking](#ch-backtracking) — candidate solution-এর ওপর DFS, pruning সহ
- [Chapter ?? — Graph Algorithm](#ch-graph-algorithms) — topological sort, যা এই অধ্যায়ের cycle detection-এরই পূর্ণ রূপ
