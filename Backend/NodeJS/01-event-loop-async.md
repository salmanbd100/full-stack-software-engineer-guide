# Event Loop & Async Programming

## Overview

The Node.js event loop is the foundation of its non-blocking I/O model. Understanding how it works is crucial for writing efficient backend applications and is one of the most frequently asked topics in Node.js interviews.

## The Event Loop

### 💡 **What is the Event Loop?**

The event loop enables Node.js to perform non-blocking I/O operations despite JavaScript being single-threaded.

**How It Works:**
- Delegates operations to the system kernel whenever possible
- Handles callbacks when operations complete
- Processes events in a continuous loop
- Allows handling thousands of concurrent connections efficiently

**Key Insight:**
> Node.js can handle 10,000+ concurrent connections on a single thread because most operations (I/O, network, timers) are non-blocking and handled by the OS kernel.

### Event Loop Phases

The event loop has 6 main phases, each with a FIFO queue of callbacks:

```
   ┌───────────────────────────┐
┌─>│           timers          │  (setTimeout, setInterval)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │     pending callbacks     │  (I/O callbacks deferred to next iteration)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
│  │       idle, prepare       │  (internal use only)
│  └─────────────┬─────────────┘      ┌───────────────┐
│  ┌─────────────┴─────────────┐      │   incoming:   │
│  │           poll            │<─────┤  connections, │
│  └─────────────┬─────────────┘      │   data, etc.  │
│  ┌─────────────┴─────────────┐      └───────────────┘
│  │           check           │  (setImmediate)
│  └─────────────┬─────────────┘
│  ┌─────────────┴─────────────┐
└──┤      close callbacks      │  (socket.on('close', ...))
   └───────────────────────────┘
```

**Phase Details:**

| Phase | Purpose | Examples |
|-------|---------|----------|
| **1. Timers** | Execute scheduled callbacks | `setTimeout()`, `setInterval()` |
| **2. Pending Callbacks** | I/O callbacks deferred to next iteration | TCP errors, system operations |
| **3. Idle, Prepare** | Internal use only | Used internally by Node.js |
| **4. Poll** | Retrieve and execute I/O callbacks | Most I/O operations, blocking when appropriate |
| **5. Check** | Execute immediate callbacks | `setImmediate()` |
| **6. Close Callbacks** | Handle close events | `socket.on('close')`, cleanup |

**Key Characteristics:**

1. **Timers Phase:**
   - Executes `setTimeout()` and `setInterval()` callbacks
   - **Important:** Timers specify a *threshold*, not exact execution time
   - Actual execution depends on event loop performance

2. **Poll Phase (Most Important):**
   - Retrieves new I/O events
   - Executes I/O-related callbacks
   - Node will block here when appropriate
   - Most application time spent here

3. **Check Phase:**
   - `setImmediate()` callbacks execute here
   - Always runs after poll phase

### Code Example: Event Loop in Action

```javascript
console.log('Start');

setTimeout(() => {
  console.log('Timeout 1');
}, 0);

setImmediate(() => {
  console.log('Immediate 1');
});

Promise.resolve().then(() => {
  console.log('Promise 1');
});

process.nextTick(() => {
  console.log('NextTick 1');
});

console.log('End');

// Output:
// Start
// End
// NextTick 1
// Promise 1
// Timeout 1 (or Immediate 1, order varies in main module)
// Immediate 1 (or Timeout 1)
```

**Execution Order:**
1. Synchronous code runs first (`Start`, `End`)
2. `process.nextTick()` runs before other microtasks
3. Promise microtasks run next
4. Timer callbacks (`setTimeout`)
5. Check phase (`setImmediate`)

## Asynchronous Patterns

Node.js provides three main patterns for handling asynchronous operations, each with different trade-offs.

| Pattern | Introduced | Pros | Cons | Use When |
|---------|-----------|------|------|----------|
| **Callbacks** | Node.js 0.x | Simple, universal support | Callback hell, error handling | Legacy code, simple operations |
| **Promises** | ES6 (2015) | Chainable, better errors | Verbose for multiple operations | Modern async, API calls |
| **Async/Await** | ES2017 | Clean syntax, easy to read | Requires promises | New code, sequential logic |

### 1. ❌ **Callbacks (Legacy Pattern)**

Error-first callback pattern - the traditional Node.js approach.

```javascript
// Error-first callback pattern
const fs = require('fs');

fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return;
  }
  console.log('File content:', data);
});

// Callback Hell (Pyramid of Doom)
getData((err, data) => {
  if (err) return handleError(err);
  processData(data, (err, processed) => {
    if (err) return handleError(err);
    saveData(processed, (err, result) => {
      if (err) return handleError(err);
      console.log('Done:', result);
    });
  });
});
```

**Problems with Callbacks:**
- Callback hell / Pyramid of doom
- Difficult error handling
- Hard to reason about flow
- No return values

### 2. ✅ **Promises**

Promises represent the eventual completion (or failure) of an asynchronous operation.

```javascript
const fs = require('fs').promises;

// Basic Promise
fs.readFile('file.txt', 'utf8')
  .then(data => {
    console.log('File content:', data);
    return processData(data);
  })
  .then(processed => {
    return saveData(processed);
  })
  .then(result => {
    console.log('Done:', result);
  })
  .catch(err => {
    console.error('Error:', err);
  });

// Creating a Promise
function delay(ms) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}

delay(1000).then(() => console.log('1 second passed'));

// Promise.all - Run in parallel
Promise.all([
  fetch('/api/users'),
  fetch('/api/posts'),
  fetch('/api/comments')
])
  .then(([users, posts, comments]) => {
    console.log('All data loaded');
  })
  .catch(err => {
    console.error('One request failed:', err);
  });

// Promise.race - First to complete
Promise.race([
  fetch('/api/data'),
  delay(5000).then(() => Promise.reject(new Error('Timeout')))
])
  .then(data => console.log('Got data:', data))
  .catch(err => console.error('Error or timeout:', err));

// Promise.allSettled - Wait for all, regardless of success/failure
Promise.allSettled([
  Promise.resolve(1),
  Promise.reject('error'),
  Promise.resolve(3)
])
  .then(results => {
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        console.log('Success:', result.value);
      } else {
        console.log('Failed:', result.reason);
      }
    });
  });
```

**Key Promise Methods:**

| Method | Behavior | Use Case |
|--------|----------|----------|
| `Promise.all()` | Waits for all, fails if any fails | Parallel operations, all must succeed |
| `Promise.race()` | Returns first settled promise | Timeout patterns, fastest wins |
| `Promise.allSettled()` | Waits for all, never fails | Parallel operations, handle each result |
| `Promise.any()` | Returns first fulfilled promise | Fallback scenarios, first success wins |

**Key Insight:**
> Use `Promise.all()` for parallel operations where all must succeed. Use `Promise.allSettled()` when you need results from all operations regardless of success/failure.

### 3. ✅ **Async/Await (Modern Approach)**

Syntactic sugar over Promises - makes asynchronous code look synchronous.

```javascript
const fs = require('fs').promises;

// Basic async/await
async function readAndProcess() {
  try {
    const data = await fs.readFile('file.txt', 'utf8');
    const processed = await processData(data);
    const result = await saveData(processed);
    console.log('Done:', result);
    return result;
  } catch (err) {
    console.error('Error:', err);
    throw err;
  }
}

// Sequential vs Parallel execution
async function sequentialExecution() {
  const user = await fetchUser();     // Wait
  const posts = await fetchPosts();   // Wait
  const comments = await fetchComments(); // Wait
  // Total time: sum of all requests
}

async function parallelExecution() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments()
  ]);
  // Total time: slowest request
}

// Error handling patterns
async function withErrorHandling() {
  try {
    const data = await riskyOperation();
    return data;
  } catch (err) {
    if (err.code === 'ENOENT') {
      console.log('File not found');
      return defaultValue;
    }
    throw err; // Re-throw if we can't handle it
  }
}

// Async iteration
async function processItems(items) {
  for (const item of items) {
    await processItem(item); // Sequential
  }
}

async function processItemsParallel(items) {
  await Promise.all(items.map(item => processItem(item))); // Parallel
}

// Top-level await (Node.js 14.8+, ES modules)
// file.mjs
const data = await fetch('/api/data');
console.log(data);
```

## Concurrency Model

### 💡 **Node.js vs Multi-threaded Servers**

Understanding the difference between Node.js's event-driven model and traditional multi-threaded servers is crucial.

**Comparison:**

| Feature | Node.js (Event Loop) | Multi-threaded (e.g., Apache) |
|---------|---------------------|-------------------------------|
| **Model** | Single-threaded, event-driven | One thread per request |
| **Concurrency** | 10,000+ connections | ~500-1,000 connections |
| **Memory per connection** | ~2KB | ~2MB (thread stack) |
| **Context switching** | None | Significant overhead |
| **Best for** | I/O-heavy workloads | CPU-intensive tasks |
| **Scalability** | Vertical + horizontal | Mainly vertical |

```javascript
// Node.js - Single-threaded Event Loop
// Can handle 10,000 concurrent connections efficiently
const http = require('http');

const server = http.createServer((req, res) => {
  // Non-blocking I/O
  fs.readFile('data.json', (err, data) => {
    res.end(data);
  });
  // Event loop continues while waiting for file read
});

// Traditional multi-threaded (conceptual)
// Each connection = new thread
// 10,000 connections = 10,000 threads (memory intensive)
```

**Node.js Advantages:**
- Low memory footprint per connection
- No thread context switching overhead
- Excellent for I/O-heavy workloads

**Node.js Disadvantages:**
- CPU-intensive tasks block the event loop
- Need worker threads or child processes for CPU-heavy work

### ⚠️ **Handling CPU-Intensive Tasks**

CPU-intensive operations block the event loop and hurt performance. Here's how to handle them properly.

**Problem:** CPU-intensive tasks block the event loop, preventing other requests from being processed.

```javascript
// BAD: Blocks event loop
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

app.get('/fib/:n', (req, res) => {
  const result = fibonacci(req.params.n); // BLOCKS!
  res.json({ result });
});

// GOOD: Use Worker Threads
const { Worker } = require('worker_threads');

app.get('/fib/:n', (req, res) => {
  const worker = new Worker('./fibonacci-worker.js', {
    workerData: req.params.n
  });

  worker.on('message', result => {
    res.json({ result });
  });

  worker.on('error', err => {
    res.status(500).json({ error: err.message });
  });
});

// fibonacci-worker.js
const { parentPort, workerData } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

parentPort.postMessage(fibonacci(workerData));
```

## Common Interview Questions

### Q1: Explain the difference between process.nextTick() and setImmediate()

**Short Answer:**
- `process.nextTick()` executes **before** any I/O operations in the current phase
- `setImmediate()` executes in the **check phase** after I/O operations

**Detailed Answer:**

```javascript
// process.nextTick() - Executes before any I/O operations
// setImmediate() - Executes in the check phase

console.log('Start');

setImmediate(() => {
  console.log('Immediate');
});

process.nextTick(() => {
  console.log('NextTick');
});

console.log('End');

// Output:
// Start
// End
// NextTick
// Immediate

// process.nextTick() can cause I/O starvation if used recursively
process.nextTick(function tick() {
  console.log('tick');
  process.nextTick(tick); // Infinite loop, blocks I/O!
});

// setImmediate() is safer for recursive operations
setImmediate(function immediate() {
  console.log('immediate');
  setImmediate(immediate); // Allows I/O between iterations
});
```

**When to Use Each:**

| Scenario | Use | Reason |
|----------|-----|--------|
| Need to execute before I/O | `process.nextTick()` | Runs immediately after current operation |
| General async deferral | `setImmediate()` | Safer, allows I/O between iterations |
| Recursive operations | `setImmediate()` | Prevents I/O starvation |

**Key Insight:**
> `process.nextTick()` can cause I/O starvation if used recursively. Always prefer `setImmediate()` unless you have a specific reason to run before I/O.

---

### Q2: What are Promises and how do they differ from callbacks?

**Short Answer:**
Promises represent the eventual result of an asynchronous operation with better composition and error handling than callbacks.

**Detailed Comparison:**

| Feature | Callbacks | Promises |
|---------|-----------|----------|
| **Error Handling** | Separate error parameter | `.catch()` method |
| **Chaining** | Callback hell / pyramid of doom | Clean `.then()` chains |
| **Composition** | Difficult | `Promise.all()`, `Promise.race()` |
| **Return Values** | Via callback parameters | Returns promise |
| **Async/Await** | Not compatible | Fully compatible |

**Advantages of Promises:**
1. **Better Error Handling:** Single `.catch()` for entire chain
2. **Chaining:** Flat `.then()` chains instead of nested callbacks
3. **Composition:** Built-in methods for parallel operations
4. **Guaranteed Execution:** Always async (even if already resolved)
5. **State Management:** Pending, fulfilled, or rejected states

---

### Q3: How does async/await work under the hood?

**Short Answer:**
`async/await` is syntactic sugar over Promises. An `async` function always returns a Promise, and `await` pauses execution until the Promise resolves.

```javascript
// This async function:
async function fetchData() {
  const response = await fetch('/api/data');
  const data = await response.json();
  return data;
}

// Is syntactic sugar for:
function fetchData() {
  return fetch('/api/data')
    .then(response => response.json())
    .then(data => data);
}
```

**How It Works:**

1. **`async` function declaration:**
   - Wraps return value in a Promise
   - Enables use of `await` keyword inside

2. **`await` keyword:**
   - Pauses function execution
   - Saves execution context
   - Event loop continues with other tasks
   - Resumes when Promise settles

3. **Error handling:**
   - `try/catch` works naturally with async/await
   - Rejected promises throw exceptions

**Key Insight:**
> `async/await` makes asynchronous code read like synchronous code, but it's still non-blocking. The event loop continues processing other requests while `await` is waiting.

---

### Q4: How would you handle multiple async operations?

**Short Answer:**
Choose between sequential (one after another) or concurrent (all at once) execution based on dependencies.

```javascript
// Sequential - one after another
async function sequential() {
  const a = await operation1(); // Wait
  const b = await operation2(); // Wait
  const c = await operation3(); // Wait
  // Total: t1 + t2 + t3
}

// Concurrent - all at once
async function concurrent() {
  const [a, b, c] = await Promise.all([
    operation1(),
    operation2(),
    operation3()
  ]);
  // Total: max(t1, t2, t3)
}

// Conditional concurrent
async function conditional() {
  const a = await operation1();

  // Only run b and c if a succeeds
  const [b, c] = await Promise.all([
    operation2(a),
    operation3(a)
  ]);
}

// With error handling
async function withErrors() {
  const results = await Promise.allSettled([
    operation1(),
    operation2(),
    operation3()
  ]);

  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  return { successful, failed };
}
```

**Comparison:**

| Pattern | Execution Time | When to Use |
|---------|---------------|-------------|
| **Sequential** | t1 + t2 + t3 | Operations depend on previous results |
| **Concurrent** | max(t1, t2, t3) | Independent operations, maximize speed |
| **Conditional Concurrent** | t1 + max(t2, t3) | Some operations depend on others |
| **Error Handling** | max(t1, t2, t3) | Need results from all, even if some fail |

**Key Insight:**
> Use `Promise.all()` for maximum speed when operations are independent. Use sequential `await` only when operations have dependencies.

## Best Practices

### 1. ✅ **Always Handle Promise Rejections**

```javascript
// BAD: Unhandled rejection
async function bad() {
  await riskyOperation(); // If this throws, unhandled rejection!
}

// GOOD: Handle errors
async function good() {
  try {
    await riskyOperation();
  } catch (err) {
    console.error('Error:', err);
  }
}

// Global handler (last resort)
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Application should exit
  process.exit(1);
});
```

### 2. ⚠️ **Avoid Blocking the Event Loop**

```javascript
// BAD: Synchronous operations
const data = fs.readFileSync('large-file.txt'); // BLOCKS!

// GOOD: Asynchronous operations
const data = await fs.promises.readFile('large-file.txt');

// Monitor event loop lag
const start = Date.now();
setInterval(() => {
  const lag = Date.now() - start - 1000;
  if (lag > 100) {
    console.warn('Event loop lag:', lag, 'ms');
  }
}, 1000);
```

### 3. ✅ **Use Appropriate Concurrency Patterns**

```javascript
// Limit concurrent operations
async function processWithLimit(items, limit) {
  const results = [];

  for (let i = 0; i < items.length; i += limit) {
    const batch = items.slice(i, i + limit);
    const batchResults = await Promise.all(
      batch.map(item => processItem(item))
    );
    results.push(...batchResults);
  }

  return results;
}

// Use a library like p-limit for better control
const pLimit = require('p-limit');
const limit = pLimit(3); // Max 3 concurrent

const promises = items.map(item =>
  limit(() => processItem(item))
);

await Promise.all(promises);
```

## Performance Considerations

### Event Loop Monitoring

```javascript
// Check event loop utilization (Node.js 12.19+)
const { performance } = require('perf_hooks');

setInterval(() => {
  const utilization = performance.eventLoopUtilization();
  console.log('Event loop utilization:', utilization.utilization);
}, 5000);

// Measure async operation performance
async function measurePerformance() {
  const start = performance.now();

  await operation();

  const duration = performance.now() - start;
  console.log(`Operation took ${duration}ms`);
}
```

## Summary

**Core Concepts:**

1. **Event Loop:**
   - ✅ Enables non-blocking I/O in single-threaded Node.js
   - ✅ 6 phases: timers → pending callbacks → poll → check → close
   - ✅ Execution order: `process.nextTick()` → microtasks → event loop phases

2. **Asynchronous Patterns:**
   - ❌ Callbacks: Legacy, callback hell, difficult error handling
   - ✅ Promises: Chainable, better errors, composable
   - ✅ Async/Await: Modern, clean syntax, synchronous-looking code

3. **Performance:**
   - ⚠️ Don't block the event loop with CPU-intensive tasks
   - ✅ Use Worker Threads for heavy computation
   - ✅ Run independent operations in parallel with `Promise.all()`
   - ✅ Monitor event loop utilization in production

4. **Error Handling:**
   - ✅ Always handle promise rejections
   - ✅ Use try/catch with async/await
   - ✅ Implement global handlers for unhandled rejections

**Key Insights:**
> - Node.js can handle 10,000+ concurrent connections on a single thread
> - The event loop is what makes Node.js scalable for I/O-heavy workloads
> - `async/await` is preferred for new code - it's cleaner and easier to maintain
> - Always use parallel execution (`Promise.all()`) when operations are independent

## Related Topics
- [Streams & Buffers](./02-streams-buffers.md)
- [Error Handling](./04-error-handling.md)
- [Performance Optimization](./05-performance.md)

## Practice Problems

1. Implement a retry mechanism for failed async operations
2. Create a rate limiter using async/await
3. Build a promise-based queue with concurrency control
4. Implement Promise.all() from scratch
5. Create a timeout wrapper for any Promise

## Resources
- [Node.js Event Loop Documentation](https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick/)
- [JavaScript Promises: An Introduction](https://web.dev/promises/)
- [Async/Await Best Practices](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await)
