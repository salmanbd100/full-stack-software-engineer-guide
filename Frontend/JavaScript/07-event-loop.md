---
title: The Event Loop
part: 1
chapter: 0
slug: event-loop
level: intermediate # beginner | intermediate | advanced
reading_time: 14
updated: 2026-08-28
tags: [frontend, javascript, event, loop]
in_book: true
---

# The Event Loop {#ch-the-event-loop}

> Predict the exact order a piece of asynchronous code will log, and say why.

**In this chapter:** the call stack · the task and microtask queues · why microtasks starve tasks · `setTimeout(fn, 0)` · rendering and the frame budget

## Understanding JavaScript's Concurrency Model

The **Event Loop** is the mechanism that allows JavaScript to perform non-blocking operations despite being single-threaded. It's the secret behind JavaScript's ability to handle thousands of concurrent operations in a browser or Node.js without creating new threads.

### Why the Event Loop Matters

**For Interviews:**
- Explains how JavaScript handles asynchronous operations
- Common interview question: "How does JavaScript handle concurrency?"
- Essential for understanding timing issues and race conditions
- Distinguishes junior from senior developers

**For Development:**
- **Performance**: Understanding it prevents UI freezing
- **Debugging**: Explains why console.log order might surprise you
- **Architecture**: Guides decisions on when to use promises vs callbacks
- **Optimization**: Helps identify and fix performance bottlenecks

### The Core Architecture

```text
┌───────────────────────────┐
│      Call Stack           │ ← Executes synchronous code
│  (LIFO - Last In First Out)│
└───────────────────────────┘
            ↓
┌───────────────────────────┐
│    Microtask Queue        │ ← Promises, queueMicrotask
│   (Higher Priority)       │
└───────────────────────────┘
            ↓
┌───────────────────────────┐
│    Macrotask Queue        │ ← setTimeout, setInterval, I/O
│   (Lower Priority)        │
└───────────────────────────┘
            ↑
    ┌───────────────┐
    │  Event Loop   │ ← Continuously monitors and moves tasks
    └───────────────┘
```

### Key Points
- **Single-Threaded**: JavaScript runs one piece of code at a time
- **Non-Blocking**: Async operations don't halt execution
- **Call Stack**: Executes all synchronous code first (LIFO)
- **Web APIs**: Browser/Node.js handles async operations (timers, fetch, etc.)
- **Microtasks** (High Priority): Promises, queueMicrotask, MutationObserver
- **Macrotasks** (Standard Priority): setTimeout, setInterval, setImmediate (Node), I/O
- **Event Loop**: Monitors stack → processes ALL microtasks → processes ONE macrotask → repeat

---

## Example 1: Event Loop Execution Order

### 💡 **Execution Order: Sync → Microtasks → Macrotasks**

Understanding the event loop's execution priority is crucial for predicting async code behavior.

**The Execution Order (Priority):**

```text
1. ⚡ Synchronous Code     (Highest Priority)
   ↓
2. 🔹 ALL Microtasks      (High Priority)
   ↓
3. 🔸 ONE Macrotask        (Standard Priority)
   ↓
4. 🎨 Render (if needed)
   ↓
   Repeat from step 2
```

**Detailed Breakdown:**

**Phase 1: Synchronous Execution**
- All synchronous code runs first
- Executes top-to-bottom
- Added to call stack immediately
- Completes before any async code

**Phase 2: Microtask Queue**
- Process **ALL** pending microtasks
- Includes:
  - Promise `.then()` / `.catch()` / `.finally()`
  - `queueMicrotask()`
  - `MutationObserver` callbacks
- Must finish before moving to macrotasks

**Phase 3: Macrotask Queue**
- Process **ONE** macrotask
- Includes:
  - `setTimeout()` / `setInterval()`
  - `setImmediate()` (Node.js)
  - I/O operations
  - UI rendering events
- Then back to Phase 2 (check microtasks again)

**Why This Order Matters:**

**Example:**
```typescript
console.log('1. Script start'); // Synchronous

setTimeout((): void => {
  console.log('2. setTimeout'); // Task (macrotask)
}, 0);

void Promise.resolve().then((): void => {
  console.log('3. Promise'); // Microtask
});

console.log('4. Script end'); // Synchronous

// Output:
// 1. Script start    ← all synchronous code first
// 4. Script end
// 3. Promise         ← then the whole microtask queue
// 2. setTimeout      ← then one task
```

**Step-by-Step Execution:**

1. **Execute Sync Code:**
   - Log "1. Script start"
   - Schedule setTimeout (add to macrotask queue)
   - Schedule Promise (add to microtask queue)
   - Log "4. Script end"

2. **Call Stack Empty → Check Microtasks:**
   - Execute Promise callback
   - Log "3. Promise"

3. **Microtasks Done → Process ONE Macrotask:**
   - Execute setTimeout callback
   - Log "2. setTimeout"

**Common Gotcha:**

```typescript
setTimeout((): void => console.log('timeout'), 0);
void Promise.resolve().then((): void => console.log('promise'));

// Always: promise, then timeout — the 0ms is irrelevant. The microtask queue
// is drained completely before the next task is picked up
```

**Why setTimeout(0) Isn't Immediate:**

| Misconception | Reality |
|--------------|---------|
| `setTimeout(..., 0)` runs immediately | ❌ Goes to macrotask queue |
| Must wait for | ✅ All sync code + ALL microtasks |
| Minimum delay | ~4ms (browser throttling) |

**Priority Summary:**

| Priority | Type | Examples |
|----------|------|----------|
| **Highest** | Synchronous | Regular code |
| **High** | Microtasks | Promises, queueMicrotask |
| **Standard** | Macrotasks | setTimeout, I/O |

**Key Insight:**
> Microtasks **always** run before macrotasks, even if a macrotask was scheduled first. This is why Promise callbacks execute before setTimeout, regardless of delay.

```typescript
console.log('1. Script start');

setTimeout((): void => {
  console.log('2. setTimeout');
}, 0);

void Promise.resolve().then((): void => {
  console.log('3. Promise');
});

console.log('4. Script end');

// Output:
// 1. Script start
// 4. Script end
// 3. Promise
// 2. setTimeout
```

**Execution Order:**
1. Synchronous code runs first (console.log 1, 4)
2. Microtasks run (Promise)
3. Macrotasks run (setTimeout)

---

## Example 2: Call Stack and Queues

**Call Stack Visualization** - Shows how the call stack processes synchronous code, then the event loop moves tasks from queues to the stack.

```typescript
function first(): void {
  console.log('First');
  second();
  console.log('First again');
}

function second(): void {
  console.log('Second');
}

setTimeout((): void => console.log('Timeout'), 0);
void Promise.resolve().then((): void => console.log('Promise'));

first();

// Output:
// First
// Second
// First again
// Promise
// Timeout

// What the stack does, step by step:
//  1. first() pushed
//  2. console.log('First')
//  3. second() pushed
//  4. console.log('Second')
//  5. second() popped
//  6. console.log('First again')
//  7. first() popped
//  8. stack empty → drain the microtask queue
//  9. run the Promise callback
// 10. take one task from the task queue
// 11. run the setTimeout callback
```

---

## Example 3: Microtasks vs Macrotasks

**Task Queue Priority** - The distinction between microtasks and macrotasks is fundamental to understanding JavaScript's async behavior. Microtasks (promises, queueMicrotask, MutationObserver) get priority over macrotasks (setTimeout, setInterval, I/O, UI rendering). After each macrotask, the event loop processes ALL pending microtasks before moving to the next macrotask. This means a flood of promises can actually starve setTimeout callbacks, preventing them from running. Understanding this priority system explains seemingly strange async behavior and is a common interview topic. The key insight: microtasks run between macrotasks, ensuring promise chains complete before timers execute.

```typescript
// Tasks — one per tick of the loop
setTimeout((): void => console.log('setTimeout 1'), 0);
setInterval((): void => console.log('setInterval'), 1000);
// setImmediate is Node.js only

// Microtasks — the entire queue drains between tasks
void Promise.resolve().then((): void => console.log('Promise 1'));
queueMicrotask((): void => console.log('queueMicrotask'));

// A microtask that schedules a task
void Promise.resolve().then((): void => {
  console.log('Promise 2');
  setTimeout((): void => console.log('setTimeout 2'), 0);
});

// A task that schedules a microtask — the microtask runs before the next task
setTimeout((): void => {
  console.log('setTimeout 3');
  void Promise.resolve().then((): void => console.log('Promise 3'));
}, 0);

// Output:
// Promise 1
// queueMicrotask
// Promise 2
// setTimeout 1
// setTimeout 3
// Promise 3      ← queued by a task, drained before the next one
// setTimeout 2
```

---

## Common Pitfalls

### Pitfall 1: setTimeout(fn, 0) is not immediate

**setTimeout Zero Delay Myth** - Shows that setTimeout(fn, 0) doesn't execute immediately - it's queued as a macrotask after all microtasks complete.

```typescript
console.log('Start');

// `0` means "as soon as possible", not "now". It joins the task queue
setTimeout((): void => {
  console.log('Timeout');
}, 0);

void Promise.resolve().then((): void => {
  console.log('Promise');
});

console.log('End');

// Output: Start, End, Promise, Timeout
```

### Pitfall 2: Blocking the Event Loop

**Blocking vs Non-blocking Code** - Demonstrates how synchronous blocking operations freeze the UI, and how to break work into async chunks to keep the event loop responsive.

```typescript
// ❌ Blocks the loop. Nothing else runs — no rendering, no input, no timers
function blockingOperation(): void {
  const start: number = Date.now();
  while (Date.now() - start < 3000) {
    // Three seconds of a frozen tab
  }
  console.log('Done');
}

blockingOperation();

// ✅ Yields. The loop is free for three seconds
async function nonBlockingOperation(): Promise<void> {
  await new Promise<void>((resolve): void => {
    setTimeout(resolve, 3000);
  });
  console.log('Done');
}

void nonBlockingOperation();
```

---

## Best Practices

### 1. Use Microtasks for High Priority Work

**Task Priority Strategy** - Use microtasks (queueMicrotask/Promises) for high-priority work that should run before rendering, macrotasks for lower priority.

```typescript
// High priority — a microtask runs before the browser gets a chance to paint
queueMicrotask((): void => {
  updateUI();
});

// Lower priority — a task yields first, so a paint can happen in between
setTimeout((): void => {
  analytics.track();
}, 0);
```

### 2. Avoid Long-Running Synchronous Code

**Chunking Large Operations** - Breaks expensive operations into smaller chunks with async breaks, preventing UI freezing and maintaining responsiveness.

```typescript
// ❌ One long task. At 100,000 items this is a dropped frame budget
function processLargeArray<T, R>(arr: readonly T[], expensiveOperation: (item: T) => R): R[] {
  return arr.map(expensiveOperation);
}

// ✅ Chunked, yielding between chunks so input and rendering get a turn
async function processLargeArrayAsync<T, R>(
  arr: readonly T[],
  expensiveOperation: (item: T) => R,
  chunkSize = 100,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk: readonly T[] = arr.slice(i, i + chunkSize);
    results.push(...chunk.map(expensiveOperation));

    // Yield. A microtask would not do — it has to be a task
    await new Promise<void>((resolve): void => {
      setTimeout(resolve, 0);
    });
  }

  return results;
}
```

---

## Real-world Scenarios

### Scenario 1: React State Updates

**React State Update Timing** - Shows how React batches state updates and when values are available in different phases of the event loop.

```tsx
// React 19. `count` is a const captured by this render's closure, so nothing
// inside the handler can ever see the new value — including the callbacks,
// which close over the same binding
function Component(): JSX.Element {
  const [count, setCount] = useState<number>(0);

  const handleClick = (): void => {
    console.log('1. Click handler start');

    setCount(count + 1); // Schedules a re-render; does not assign

    console.log('2. Count:', count); // Still this render's value

    setTimeout((): void => {
      console.log('3. Timeout count:', count); // Still this render's value
    }, 0);

    void Promise.resolve().then((): void => {
      console.log('4. Promise count:', count); // Still this render's value
    });

    console.log('5. Click handler end');
  };

  // 1. Click handler start
  // 2. Count: 0
  // 5. Click handler end
  // 4. Promise count: 0   ← microtask
  // (React re-renders with count = 1)
  // 3. Timeout count: 0   ← task, but the same stale closure
  return <button onClick={handleClick}>{count}</button>;
}
```

---

## External Resources

- [MDN: Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
- [JavaScript.info: Event Loop](https://javascript.info/event-loop)
- [Loupe: Event Loop Visualizer](http://latentflip.com/loupe/)

---

[← Back to JavaScript](./README.md) | [Next: ES6+ Features →](./08-es6-features.md)
