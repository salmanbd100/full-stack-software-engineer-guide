# Event Loop

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

```
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

```
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
```javascript
console.log('1. Script start');          // Sync

setTimeout(() => {
    console.log('2. setTimeout');        // Macrotask
}, 0);

Promise.resolve().then(() => {
    console.log('3. Promise');           // Microtask
});

console.log('4. Script end');            // Sync

// Output:
// 1. Script start    ← Sync first
// 4. Script end      ← Sync first
// 3. Promise         ← Microtask second
// 2. setTimeout      ← Macrotask last
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

```javascript
setTimeout(() => console.log('timeout'), 0);
Promise.resolve().then(() => console.log('promise'));

// Always: promise, then timeout
// Even though setTimeout has 0ms delay!
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

```javascript
console.log('1. Script start');

setTimeout(() => {
    console.log('2. setTimeout');
}, 0);

Promise.resolve().then(() => {
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

```javascript
function first() {
    console.log('First');
    second();
    console.log('First again');
}

function second() {
    console.log('Second');
}

setTimeout(() => console.log('Timeout'), 0);

Promise.resolve().then(() => console.log('Promise'));

first();

// Output:
// First
// Second
// First again
// Promise
// Timeout

// Call Stack visualization:
// 1. first() pushed
// 2. console.log('First')
// 3. second() pushed
// 4. console.log('Second')
// 5. second() popped
// 6. console.log('First again')
// 7. first() popped
// 8. Stack empty - check microtask queue
// 9. Execute Promise callback
// 10. Check macrotask queue
// 11. Execute setTimeout callback
```

---

## Example 3: Microtasks vs Macrotasks

**Task Queue Priority** - The distinction between microtasks and macrotasks is fundamental to understanding JavaScript's async behavior. Microtasks (promises, queueMicrotask, MutationObserver) get priority over macrotasks (setTimeout, setInterval, I/O, UI rendering). After each macrotask, the event loop processes ALL pending microtasks before moving to the next macrotask. This means a flood of promises can actually starve setTimeout callbacks, preventing them from running. Understanding this priority system explains seemingly strange async behavior and is a common interview topic. The key insight: microtasks run between macrotasks, ensuring promise chains complete before timers execute.

```javascript
// Macrotasks (Task Queue)
setTimeout(() => console.log('setTimeout 1'), 0);
setInterval(() => console.log('setInterval'), 1000);
// setImmediate (Node.js only)

// Microtasks (Microtask Queue)
Promise.resolve().then(() => console.log('Promise 1'));
queueMicrotask(() => console.log('queueMicrotask'));

// Microtasks always run before macrotasks
Promise.resolve().then(() => {
    console.log('Promise 2');
    setTimeout(() => console.log('setTimeout 2'), 0);
});

setTimeout(() => {
    console.log('setTimeout 3');
    Promise.resolve().then(() => console.log('Promise 3'));
}, 0);

// Output:
// Promise 1
// queueMicrotask
// Promise 2
// setTimeout 1
// setTimeout 3
// Promise 3
// setTimeout 2
```

---

## Common Pitfalls

### Pitfall 1: setTimeout(fn, 0) is not immediate

**setTimeout Zero Delay Myth** - Shows that setTimeout(fn, 0) doesn't execute immediately - it's queued as a macrotask after all microtasks complete.

```javascript
console.log('Start');

setTimeout(() => {
    console.log('Timeout');
}, 0); // Not immediate! Goes to macrotask queue

Promise.resolve().then(() => {
    console.log('Promise');
});

console.log('End');

// Output: Start, End, Promise, Timeout
// setTimeout is delayed until after microtasks
```

### Pitfall 2: Blocking the Event Loop

**Blocking vs Non-blocking Code** - Demonstrates how synchronous blocking operations freeze the UI, and how to break work into async chunks to keep the event loop responsive.

```javascript
// BAD - Blocks event loop
function blockingOperation() {
    const start = Date.now();
    while (Date.now() - start < 3000) {
        // Blocks for 3 seconds
    }
    console.log('Done');
}

// UI freezes, no other code can run
blockingOperation();

// GOOD - Non-blocking with async
async function nonBlockingOperation() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('Done');
}

nonBlockingOperation(); // Doesn't block
```

---

## Best Practices

### 1. Use Microtasks for High Priority Work

**Task Priority Strategy** - Use microtasks (queueMicrotask/Promises) for high-priority work that should run before rendering, macrotasks for lower priority.

```javascript
// High priority - use Promise/queueMicrotask
queueMicrotask(() => {
    updateUI(); // Runs before next render
});

// Lower priority - use setTimeout
setTimeout(() => {
    analytics.track(); // Can wait
}, 0);
```

### 2. Avoid Long-Running Synchronous Code

**Chunking Large Operations** - Breaks expensive operations into smaller chunks with async breaks, preventing UI freezing and maintaining responsiveness.

```javascript
// BAD
function processLargeArray(arr) {
    return arr.map(item => expensiveOperation(item));
}

// GOOD - Split into chunks
async function processLargeArrayAsync(arr, chunkSize = 100) {
    const results = [];

    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        results.push(...chunk.map(expensiveOperation));

        // Yield to event loop
        await new Promise(resolve => setTimeout(resolve, 0));
    }

    return results;
}
```

---

## Real-world Scenarios

### Scenario 1: React State Updates

**React State Update Timing** - Shows how React batches state updates and when values are available in different phases of the event loop.

```javascript
function Component() {
    const [count, setCount] = useState(0);

    const handleClick = () => {
        console.log('1. Click handler start');

        setCount(count + 1); // Batched, not immediate

        console.log('2. Count:', count); // Still old value!

        setTimeout(() => {
            console.log('3. Timeout count:', count); // Updated value
        }, 0);

        Promise.resolve().then(() => {
            console.log('4. Promise count:', count); // Still old value
        });

        console.log('5. Click handler end');
    };

    // Output when clicked:
    // 1. Click handler start
    // 2. Count: 0 (old value)
    // 5. Click handler end
    // 4. Promise count: 0 (old value - microtask)
    // (React re-renders)
    // 3. Timeout count: 1 (new value - macrotask)
}
```

---

## External Resources

- [MDN: Event Loop](https://developer.mozilla.org/en-US/docs/Web/JavaScript/EventLoop)
- [JavaScript.info: Event Loop](https://javascript.info/event-loop)
- [Loupe: Event Loop Visualizer](http://latentflip.com/loupe/)

---

[← Back to JavaScript](./README.md) | [Next: ES6+ Features →](./08-es6-features.md)
