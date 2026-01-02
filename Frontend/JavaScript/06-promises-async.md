# Promises & Async/Await

## Understanding Asynchronous JavaScript

**Promises** represent the eventual completion (or failure) of an asynchronous operation and its resulting value. They revolutionized JavaScript async programming by solving "callback hell" and providing a standardized way to handle async operations. **Async/await** is syntactic sugar built on top of promises, making asynchronous code look and behave more like synchronous code while maintaining non-blocking behavior.

## Why Promises Matter

**Interview Perspective:**
- One of the top 3 most tested JavaScript concepts
- Required knowledge for modern JavaScript development
- Tests understanding of asynchronous flow and the event loop
- Gateway to advanced patterns (Promise.all, Promise.race, etc.)

**Real-World Importance:**
- **API Calls**: Almost all modern APIs return promises
- **Framework Integration**: React, Vue, Angular all use promises extensively
- **Error Handling**: Standardized async error management
- **Composition**: Chain and combine async operations cleanly

## Promise States & Lifecycle

```
                    ┌──────────┐
                    │ PENDING  │ Initial state
                    └────┬─────┘
                         │
            ┌────────────┴────────────┐
            ↓                         ↓
      ┌─────────┐               ┌──────────┐
      │FULFILLED│ Success       │ REJECTED │ Failure
      └─────────┘               └──────────┘
      (resolved)                (error)
            ↓                         ↓
        .then()                   .catch()
```

### Promise State Characteristics

| State | Description | Settled? | Can Transition? | Result |
|-------|-------------|----------|-----------------|--------|
| **Pending** | Initial, operation ongoing | No | Yes | None yet |
| **Fulfilled** | Operation succeeded | Yes | No | Value available |
| **Rejected** | Operation failed | Yes | No | Error reason available |

### Key Points
- **Three States**: pending → fulfilled OR rejected (once settled, immutable)
- **Eager Execution**: Promises start executing immediately upon creation (not lazy)
- **Async/await**: Syntactic sugar that makes async code look synchronous
- **Error Handling**: `.catch()` for promise chains, `try/catch` for async/await
- **Chaining**: `.then()` returns a new promise, enabling clean composition
- **Async functions**: Always return a promise (automatically wraps non-promise returns)

---

## Example 1: Promise Basics

### 💡 **Creating and Consuming Promises**

Promises represent asynchronous operations that will eventually complete or fail.

**Promise Lifecycle:**

```
Create Promise
    ↓
Executor runs immediately (eager!)
    ↓
Async operation starts
    ↓
Operation completes
    ↓
Call resolve(value) OR reject(error)
    ↓
Promise settles (fulfilled or rejected)
    ↓
.then() or .catch() handlers execute
    ↓
.finally() runs (if present)
```

**Key Characteristics:**

**1. Eager Execution:**
```javascript
const promise = new Promise((resolve, reject) => {
    console.log('Executing!'); // ← Runs immediately
    setTimeout(() => resolve('Done'), 1000);
});
// "Executing!" logged right away, NOT when .then() is called
```

**2. Promise Constructor:**
```javascript
new Promise((resolve, reject) => {
    // resolve(value) → fulfills promise
    // reject(error) → rejects promise
});
```

**3. Chaining with .then():**
- Each `.then()` returns a **new promise**
- Return value becomes next `.then()`'s input
- Enables clean, linear async flow

**4. Error Handling:**
- `.catch()` handles any rejection in the chain
- Acts like a `try/catch` for async code

**5. Cleanup with .finally():**
- Runs regardless of success or failure
- Perfect for cleanup operations

**Promise Method Returns:**

| Method | Returns | Purpose |
|--------|---------|---------|
| `.then(callback)` | New promise | Handle success, chain operations |
| `.catch(callback)` | New promise | Handle errors |
| `.finally(callback)` | New promise | Cleanup (always runs) |

**Chaining Example:**

```javascript
fetchUser(1)
    .then(user => {
        console.log('Got user:', user.name);
        return fetchPosts(user.id); // ← Returns new promise
    })
    .then(posts => {
        console.log('Got posts:', posts.length);
        return posts[0]; // ← Returns value (auto-wrapped in promise)
    })
    .then(firstPost => {
        console.log('First post:', firstPost.title);
    })
    .catch(error => {
        console.error('Error anywhere in chain:', error);
    })
    .finally(() => {
        console.log('Cleanup code here');
    });
```

**Value Transformation:**

Each `.then()` can transform the value:
```javascript
Promise.resolve(5)
    .then(n => n * 2)        // 10
    .then(n => n + 3)        // 13
    .then(n => `Result: ${n}`) // "Result: 13"
    .then(str => console.log(str));
```

**Solving Callback Hell:**

**Before (Callback Hell):**
```javascript
getData(function(a) {
    getMoreData(a, function(b) {
        getMoreData(b, function(c) {
            getMoreData(c, function(d) {
                console.log(d); // 😱 Pyramid of doom
            });
        });
    });
});
```

**After (Promise Chain):**
```javascript
getData()
    .then(a => getMoreData(a))
    .then(b => getMoreData(b))
    .then(c => getMoreData(c))
    .then(d => console.log(d)); // ✅ Clean and linear
```

**Why Promises Are Better:**

| Callback Hell | Promises |
|--------------|----------|
| Nested indentation | Flat, chainable |
| Error handling scattered | Centralized `.catch()` |
| Hard to read | Linear flow |
| Difficult to compose | Easy composition |

**Critical Insight:**
> Promises execute **immediately** when created, not when `.then()` is called. This "eager" behavior differs from lazy evaluation in some languages.

```javascript
// Creating a promise
const myPromise = new Promise((resolve, reject) => {
    const success = true;

    setTimeout(() => {
        if (success) {
            resolve('Operation successful!');
        } else {
            reject('Operation failed!');
        }
    }, 1000);
});

// Consuming the promise
myPromise
    .then(result => {
        console.log(result); // "Operation successful!"
        return 'Next step';
    })
    .then(result => {
        console.log(result); // "Next step"
    })
    .catch(error => {
        console.error(error);
    })
    .finally(() => {
        console.log('Cleanup or final operations');
    });
```

### Promise States:
1. **Pending**: Initial state, neither fulfilled nor rejected
2. **Fulfilled**: Operation completed successfully
3. **Rejected**: Operation failed

---

## Example 2: Async/Await Syntax

### 💡 **Async/Await - Syntactic Sugar for Promises**

Async/await makes asynchronous code look and behave like synchronous code.

**How It Works:**

**The `async` Keyword:**
- Makes function **always** return a promise
- Automatically wraps return values in `Promise.resolve()`

```javascript
async function example() {
    return 42;
}
// Same as:
function example() {
    return Promise.resolve(42);
}
```

**The `await` Keyword:**
- **Pauses** async function execution
- Waits for promise to resolve
- Returns the resolved value
- Can only be used inside `async` functions

```javascript
async function example() {
    const result = await fetchData(); // Pauses here until promise resolves
    console.log(result); // Uses resolved value
}
```

**Key Transformations:**

**Promise Chain → Async/Await:**

```javascript
// Promise Chain (nested, harder to read)
function getUser() {
    return fetchUser(1)
        .then(user => {
            return fetchPosts(user.id);
        })
        .then(posts => {
            return posts[0];
        })
        .catch(error => {
            console.error(error);
        });
}

// Async/Await (linear, easier to read ✅)
async function getUser() {
    try {
        const user = await fetchUser(1);
        const posts = await fetchPosts(user.id);
        return posts[0];
    } catch (error) {
        console.error(error);
    }
}
```

**Benefits of Async/Await:**

| Feature | Promises | Async/Await |
|---------|----------|-------------|
| **Syntax** | `.then()` chains | Linear, looks synchronous |
| **Error Handling** | `.catch()` | `try/catch` (familiar) |
| **Debugging** | Complex stack traces | Clear stack traces |
| **Readability** | Can be nested | Top-to-bottom |
| **Control Flow** | Chaining only | `if/else`, `loops`, etc. |

**Error Handling:**

```javascript
// With Promises
fetchData()
    .then(data => processData(data))
    .catch(error => console.error(error));

// With Async/Await (more familiar ✅)
async function handleData() {
    try {
        const data = await fetchData();
        const result = await processData(data);
        return result;
    } catch (error) {
        console.error(error);
        throw error; // Re-throw if needed
    }
}
```

**Control Flow Advantages:**

**Conditional Logic:**
```javascript
async function getUser(id) {
    const user = await fetchUser(id);

    if (user.isPremium) {
        const premiumData = await fetchPremiumData(user.id);
        return { ...user, ...premiumData };
    }

    return user;
}
```

**Loops:**
```javascript
async function processItems(items) {
    for (const item of items) {
        await processItem(item); // Sequential processing
    }
}
```

**Important: await Doesn't Block the Event Loop:**

```javascript
async function task1() {
    console.log('Task 1 start');
    await delay(1000); // Pauses this function, NOT JavaScript
    console.log('Task 1 end');
}

async function task2() {
    console.log('Task 2 start');
    await delay(500);
    console.log('Task 2 end');
}

task1();
task2();

// Output:
// Task 1 start
// Task 2 start
// Task 2 end (after 500ms)
// Task 1 end (after 1000ms)
```

**Common Patterns:**

**Sequential vs Parallel:**

```javascript
// ❌ Sequential (slower - waits for each)
async function sequential() {
    const user = await fetchUser();     // 1s
    const posts = await fetchPosts();   // 1s
    const comments = await fetchComments(); // 1s
    // Total: 3 seconds
}

// ✅ Parallel (faster - runs simultaneously)
async function parallel() {
    const [user, posts, comments] = await Promise.all([
        fetchUser(),
        fetchPosts(),
        fetchComments()
    ]);
    // Total: 1 second (longest operation)
}
```

**When to Use Each:**

| Use Case | Use This |
|----------|---------|
| Simple async operations | `async/await` ✅ |
| Multiple independent operations | `Promise.all()` + `await` |
| Need fine control over promise handling | Promise chains |
| Working with existing promise APIs | `async/await` wrapper |
| Debugging async code | `async/await` (clearer) |

**Key Insight:**
> `await` only pauses the **async function**, not the entire JavaScript engine. Other code continues executing on the event loop - async/await is non-blocking despite looking synchronous!

```javascript
// Function returns a promise
function fetchUserData(userId) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (userId) {
                resolve({ id: userId, name: 'John Doe', email: 'john@example.com' });
            } else {
                reject('User ID is required');
            }
        }, 1000);
    });
}

// Using async/await
async function getUserInfo(userId) {
    try {
        console.log('Fetching user...');
        const user = await fetchUserData(userId);
        console.log('User:', user);
        return user;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    } finally {
        console.log('Fetch attempt completed');
    }
}

// Calling async function
getUserInfo(123)
    .then(user => console.log('Got user:', user.name))
    .catch(error => console.error('Failed:', error));

// Key points:
// - async keyword makes function return a promise
// - await pauses execution until promise resolves
// - Can use try/catch for error handling
// - finally block runs regardless of success/failure
```

---

## Example 3: Multiple Promises

**Handling Multiple Async Operations** - When you have multiple independent async operations, running them in parallel is much faster than sequential execution. Promise.all() takes an array of promises and resolves when all complete, returning an array of results - but if any reject, the entire operation rejects (fail-fast behavior). Promise.allSettled() waits for all promises regardless of outcome, returning status and value/reason for each - ideal when some failures are acceptable. Promise.race() resolves/rejects as soon as the first promise settles - useful for timeouts or redundant requests. Promise.any() resolves when the first promise resolves, ignoring rejections - good for fallback strategies. Choosing the right method depends on whether you need all results, can tolerate failures, or want the fastest response.

**Handling Multiple Async Operations** - Demonstrates Promise.all for parallel execution, Promise.allSettled for resilient handling, Promise.race for fastest response, and sequential patterns.

```javascript
// Simulated API calls
function fetchUser() {
    return new Promise(resolve => {
        setTimeout(() => resolve({ name: 'Alice', id: 1 }), 1000);
    });
}

function fetchPosts(userId) {
    return new Promise(resolve => {
        setTimeout(() => resolve(['Post 1', 'Post 2', 'Post 3']), 800);
    });
}

function fetchComments(postId) {
    return new Promise(resolve => {
        setTimeout(() => resolve(['Comment 1', 'Comment 2']), 600);
    });
}

// Method 1: Promise.all (parallel execution, all must succeed)
async function loadAllData() {
    try {
        const [user, posts, comments] = await Promise.all([
            fetchUser(),
            fetchPosts(1),
            fetchComments(1)
        ]);

        console.log('User:', user);
        console.log('Posts:', posts);
        console.log('Comments:', comments);
    } catch (error) {
        console.error('One or more promises failed:', error);
    }
}

// Method 2: Promise.allSettled (all complete, regardless of success/failure)
async function loadAllDataSafe() {
    const results = await Promise.allSettled([
        fetchUser(),
        fetchPosts(1),
        fetchComments(1)
    ]);

    results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
            console.log(`Promise ${index} succeeded:`, result.value);
        } else {
            console.log(`Promise ${index} failed:`, result.reason);
        }
    });
}

// Method 3: Promise.race (first to complete wins)
async function loadFirstAvailable() {
    const result = await Promise.race([
        fetchUser(),
        fetchPosts(1),
        fetchComments(1)
    ]);

    console.log('First result:', result); // Comments (fastest)
}

// Method 4: Sequential execution (when order matters)
async function loadSequentially() {
    const user = await fetchUser();
    console.log('Got user:', user);

    const posts = await fetchPosts(user.id);
    console.log('Got posts:', posts);

    const comments = await fetchComments(posts[0]);
    console.log('Got comments:', comments);
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting to Return Promise

**Missing Return Statement** - Common mistake of not returning promises from functions, causing callers to lose the promise chain.

```javascript
// WRONG
function getData() {
    fetch('https://api.example.com/data')
        .then(response => response.json());
    // Doesn't return the promise!
}

const result = getData(); // undefined

// CORRECT
function getData() {
    return fetch('https://api.example.com/data')
        .then(response => response.json());
}

getData().then(data => console.log(data));
```

### Pitfall 2: Not Handling Errors

**Unhandled Promise Rejections** - Shows importance of error handling in promises using catch() or try/catch with async/await to prevent silent failures.

```javascript
// WRONG - unhandled promise rejection
fetch('https://api.example.com/data')
    .then(response => response.json())
    .then(data => console.log(data));
// If request fails, error is not caught

// CORRECT
fetch('https://api.example.com/data')
    .then(response => {
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    .then(data => console.log(data))
    .catch(error => console.error('Fetch error:', error));

// BETTER - with async/await
async function fetchData() {
    try {
        const response = await fetch('https://api.example.com/data');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        throw error; // Re-throw if caller should handle it
    }
}
```

### Pitfall 3: Sequential Instead of Parallel

**Performance Anti-pattern** - Demonstrates the performance cost of awaiting independent operations sequentially versus executing them in parallel with Promise.all.

```javascript
// WRONG - Sequential (slow)
async function loadData() {
    const user = await fetchUser();      // Waits 1s
    const posts = await fetchPosts();    // Then waits 1s
    const comments = await fetchComments(); // Then waits 1s
    // Total: ~3 seconds
    return { user, posts, comments };
}

// CORRECT - Parallel (fast)
async function loadDataFast() {
    const [user, posts, comments] = await Promise.all([
        fetchUser(),      // All start together
        fetchPosts(),     //
        fetchComments()   //
    ]);
    // Total: ~1 second (time of slowest)
    return { user, posts, comments };
}
```

### Pitfall 4: Mixing Promises and Async/Await

**Inconsistent Async Patterns** - Shows why mixing promise chains with async/await leads to confusing code, recommending consistent style.

```javascript
// CONFUSING - Mixing styles
async function mixedStyle() {
    const user = await fetchUser();
    return fetchPosts(user.id)
        .then(posts => {
            return posts.map(post => post.title);
        }); // Unnecessary .then(), could use await
}

// BETTER - Consistent style
async function consistentStyle() {
    const user = await fetchUser();
    const posts = await fetchPosts(user.id);
    return posts.map(post => post.title);
}
```

---

## Best Practices

### 1. Always Handle Errors

**Robust Error Handling Pattern** - Comprehensive error handling with HTTP status checks, structured responses, and proper error propagation.

```javascript
// Good error handling pattern
async function robustFetch(url) {
    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return { success: true, data };

    } catch (error) {
        console.error('Fetch failed:', error);
        return { success: false, error: error.message };
    }
}

// Usage
const result = await robustFetch('https://api.example.com/data');
if (result.success) {
    console.log(result.data);
} else {
    console.error(result.error);
}
```

### 2. Use Promise.all for Independent Operations

**Parallel Execution Optimization** - Uses Promise.all to run independent async operations concurrently, significantly improving performance.

```javascript
// Good: Parallel execution
async function loadDashboard() {
    const start = Date.now();

    const [userData, notifications, analytics] = await Promise.all([
        fetchUserData(),
        fetchNotifications(),
        fetchAnalytics()
    ]);

    console.log(`Loaded in ${Date.now() - start}ms`);

    return { userData, notifications, analytics };
}
```

### 3. Retry Logic for Failed Requests

**Automatic Retry with Exponential Backoff** - Implements retry logic with increasing delays between attempts, handling transient failures gracefully.

```javascript
async function fetchWithRetry(url, options = {}, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.ok) {
                return await response.json();
            }

            // If not last retry, wait before retrying
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        } catch (error) {
            if (i === retries - 1) {
                throw error;
            }
            console.log(`Retry ${i + 1}/${retries}...`);
        }
    }

    throw new Error(`Failed after ${retries} retries`);
}

// Usage
try {
    const data = await fetchWithRetry('https://api.example.com/data');
    console.log(data);
} catch (error) {
    console.error('All retries failed:', error);
}
```

---

## Real-world Scenarios

### Scenario 1: Fetch with Timeout

**Request Timeout Implementation** - Uses Promise.race to add timeout functionality to fetch requests, preventing indefinite hangs.

```javascript
function fetchWithTimeout(url, timeout = 5000) {
    return Promise.race([
        fetch(url),
        new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Request timeout')), timeout)
        )
    ]);
}

// Usage
async function loadData() {
    try {
        const response = await fetchWithTimeout('https://api.example.com/data', 3000);
        const data = await response.json();
        return data;
    } catch (error) {
        if (error.message === 'Request timeout') {
            console.error('Request took too long');
        } else {
            console.error('Request failed:', error);
        }
    }
}
```

### Scenario 2: Batching Requests

**Batch Processing Pattern** - Processes multiple URLs in controlled batches to avoid overwhelming servers or hitting rate limits.

```javascript
async function batchFetch(urls, batchSize = 3) {
    const results = [];

    // Process URLs in batches
    for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchResults = await Promise.all(
            batch.map(url => fetch(url).then(r => r.json()))
        );
        results.push(...batchResults);

        console.log(`Processed batch ${Math.floor(i / batchSize) + 1}`);
    }

    return results;
}

// Usage: Fetch 10 URLs, 3 at a time
const urls = Array.from({ length: 10 }, (_, i) =>
    `https://api.example.com/item/${i}`
);

const data = await batchFetch(urls, 3);
```

### Scenario 3: Promise-based Event Emitter

**Async Event Handling** - Creates an event emitter that waits for all async event handlers to complete before resolving.

```javascript
class AsyncEventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
    }

    async emit(event, data) {
        if (!this.listeners[event]) return;

        const promises = this.listeners[event].map(callback =>
            Promise.resolve(callback(data))
        );

        return await Promise.all(promises);
    }
}

// Usage
const emitter = new AsyncEventEmitter();

emitter.on('data', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 100));
    console.log('Handler 1:', data);
});

emitter.on('data', async (data) => {
    await new Promise(resolve => setTimeout(resolve, 50));
    console.log('Handler 2:', data);
});

await emitter.emit('data', { message: 'Hello' });
console.log('All handlers completed');
```

---

## External Resources

- [MDN: Promise](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)
- [MDN: async/await](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await)
- [JavaScript.info: Promises](https://javascript.info/promise-basics)
- [JavaScript.info: Async/await](https://javascript.info/async-await)

---

[← Back to JavaScript](./README.md) | [Next: Event Loop →](./07-event-loop.md)
