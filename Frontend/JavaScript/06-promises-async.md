# Promises and Async/Await {#ch-promises-and-async-await}

> Compose asynchronous work without nesting it, and handle the failure path as deliberately as the success path.

**In this chapter:** the three promise states · chaining and flattening · `async`/`await` · `all`, `allSettled`, `race` and `any` · the errors that get swallowed

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

```text
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

```text
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
```typescript
const promise = new Promise<string>((resolve, reject): void => {
  console.log('Executing!'); // ← Runs immediately
  setTimeout((): void => resolve('Done'), 1000);
});
// "Executing!" is logged right away, not when .then() is called.
// A promise is not lazy — constructing it starts the work
```

**2. Promise Constructor:**
```typescript
new Promise<string>((resolve, reject): void => {
  // resolve(value) → fulfilled
  // reject(error)  → rejected
  // The type argument is what resolve() accepts and what await returns
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

```typescript
interface User {
  id: number;
  name: string;
}

interface Post {
  id: number;
  title: string;
}

fetchUser(1)
  .then((user: User): Promise<Post[]> => {
    console.log('Got user:', user.name);
    return fetchPosts(user.id); // ← Returning a promise flattens the chain
  })
  .then((posts: Post[]): Post => {
    console.log('Got posts:', posts.length);
    return posts[0]; // ← A plain value is wrapped for you
  })
  .then((firstPost: Post): void => {
    console.log('First post:', firstPost.title);
  })
  .catch((error: unknown): void => {
    // One catch covers every step above it
    console.error('Error anywhere in chain:', error);
  })
  .finally((): void => {
    console.log('Cleanup code here');
  });
```

**Value Transformation:**

Each `.then()` can transform the value:
```typescript
// Each .then's return type becomes the next one's input type
Promise.resolve(5)
  .then((n: number): number => n * 2) // 10
  .then((n: number): number => n + 3) // 13
  .then((n: number): string => `Result: ${n}`) // "Result: 13"
  .then((str: string): void => console.log(str));
```

**Solving Callback Hell:**

**Before (Callback Hell):**
```typescript
// ❌ The pyramid of doom. Note there is nowhere sensible to put error handling
getData(function (a: string): void {
  getMoreData(a, function (b: string): void {
    getMoreData(b, function (c: string): void {
      getMoreData(c, function (d: string): void {
        console.log(d);
      });
    });
  });
});
```

**After (Promise Chain):**
```typescript
// ✅ Same work, one level deep
getData()
  .then((a: string): Promise<string> => getMoreData(a))
  .then((b: string): Promise<string> => getMoreData(b))
  .then((c: string): Promise<string> => getMoreData(c))
  .then((d: string): void => console.log(d));
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

```typescript
// Creating a promise
const myPromise = new Promise<string>((resolve, reject): void => {
  const success = true;

  setTimeout((): void => {
    if (success) {
      resolve('Operation successful!');
    } else {
      // Reject with an Error, not a string — a string has no stack trace
      reject(new Error('Operation failed!'));
    }
  }, 1000);
});

// Consuming it
myPromise
  .then((result: string): string => {
    console.log(result); // "Operation successful!"
    return 'Next step';
  })
  .then((result: string): void => {
    console.log(result); // "Next step"
  })
  .catch((error: unknown): void => {
    console.error(error);
  })
  .finally((): void => {
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

```typescript
// `async` does one thing to the return type: it wraps it in a Promise
async function example(): Promise<number> {
  return 42;
}

// Identical to
function exampleEquivalent(): Promise<number> {
  return Promise.resolve(42);
}
```

**The `await` Keyword:**
- **Pauses** async function execution
- Waits for promise to resolve
- Returns the resolved value
- Can only be used inside `async` functions

```typescript
async function example(): Promise<void> {
  // `await` unwraps Promise<T> to T. It suspends this function, not the thread
  const result: string = await fetchData();
  console.log(result);
}
```

**Key Transformations:**

**Promise Chain → Async/Await:**

```typescript
// ❌ Promise chain — readable, but the types drift out of sight
function getUserChained(): Promise<Post | undefined> {
  return fetchUser(1)
    .then((user: User): Promise<Post[]> => fetchPosts(user.id))
    .then((posts: Post[]): Post => posts[0])
    .catch((error: unknown): undefined => {
      console.error(error);
      return undefined;
    });
}

// ✅ Async/await — linear, and each intermediate value has a name and a type
async function getUser(): Promise<Post | undefined> {
  try {
    const user: User = await fetchUser(1);
    const posts: Post[] = await fetchPosts(user.id);
    return posts[0];
  } catch (error: unknown) {
    console.error(error);
    return undefined;
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

```typescript
// With promises
fetchData()
  .then((data: string): Promise<string> => processData(data))
  .catch((error: unknown): void => console.error(error));

// ✅ With async/await — ordinary try/catch, which also catches synchronous
// throws inside the function
async function handleData(): Promise<string> {
  try {
    const data: string = await fetchData();
    return await processData(data);
  } catch (error: unknown) {
    console.error(error);
    throw error; // Re-throw so the caller still sees the failure
  }
}
```

**Control Flow Advantages:**

**Conditional Logic:**
```typescript
interface PremiumUser extends User {
  isPremium: boolean;
  tier: string;
}

async function getUser(id: number): Promise<User | PremiumUser> {
  const user = await fetchUser(id);

  // Conditional awaiting reads like ordinary control flow
  if (user.isPremium) {
    const premiumData = await fetchPremiumData(user.id);
    return { ...user, ...premiumData };
  }

  return user;
}
```

**Loops:**
```typescript
async function processItems<T>(items: readonly T[]): Promise<void> {
  for (const item of items) {
    // Sequential on purpose — use this when each step depends on the last,
    // or when you must not hammer the far end
    await processItem(item);
  }
}
```

**Important: await Doesn't Block the Event Loop:**

```typescript
async function task1(): Promise<void> {
  console.log('Task 1 start');
  await delay(1000); // Suspends this function, not the runtime
  console.log('Task 1 end');
}

async function task2(): Promise<void> {
  console.log('Task 2 start');
  await delay(500);
  console.log('Task 2 end');
}

void task1();
void task2();

// Output:
// Task 1 start
// Task 2 start
// Task 2 end   (after 500ms)
// Task 1 end   (after 1000ms)
```

**Common Patterns:**

**Sequential vs Parallel:**

```typescript
// ❌ Sequential — three independent requests waiting on each other
async function sequential(): Promise<void> {
  const user = await fetchUser(); // 1s
  const posts = await fetchPosts(); // 1s
  const comments = await fetchComments(); // 1s
  // Total: 3 seconds
}

// ✅ Parallel — Promise.all preserves the tuple types, so destructuring is typed
async function parallel(): Promise<void> {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(),
    fetchComments(),
  ]);
  // Total: 1 second, the slowest of the three
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

```typescript
interface UserData {
  id: number;
  name: string;
  email: string;
}

function fetchUserData(userId: number): Promise<UserData> {
  return new Promise<UserData>((resolve, reject): void => {
    setTimeout((): void => {
      if (userId) {
        resolve({ id: userId, name: 'John Doe', email: 'john@example.com' });
      } else {
        reject(new Error('User ID is required'));
      }
    }, 1000);
  });
}

async function getUserInfo(userId: number): Promise<UserData> {
  try {
    console.log('Fetching user...');
    const user: UserData = await fetchUserData(userId);
    return user;
  } catch (error: unknown) {
    console.error('Error:', error);
    throw error;
  } finally {
    // Runs on both paths, including the throw above
    console.log('Fetch attempt completed');
  }
}

getUserInfo(123)
  .then((user: UserData): void => console.log('Got user:', user.name))
  .catch((error: unknown): void => console.error('Failed:', error));

// - `async` makes the function return a promise
// - `await` suspends the function until the promise settles
// - try/catch works exactly as it does for synchronous code
// - `finally` runs whether the function returned or threw
```

---

## Example 3: Multiple Promises

**Handling Multiple Async Operations** - When you have multiple independent async operations, running them in parallel is much faster than sequential execution. Promise.all() takes an array of promises and resolves when all complete, returning an array of results - but if any reject, the entire operation rejects (fail-fast behavior). Promise.allSettled() waits for all promises regardless of outcome, returning status and value/reason for each - ideal when some failures are acceptable. Promise.race() resolves/rejects as soon as the first promise settles - useful for timeouts or redundant requests. Promise.any() resolves when the first promise resolves, ignoring rejections - good for fallback strategies. Choosing the right method depends on whether you need all results, can tolerate failures, or want the fastest response.

**Handling Multiple Async Operations** - Demonstrates Promise.all for parallel execution, Promise.allSettled for resilient handling, Promise.race for fastest response, and sequential patterns.

```typescript
interface Account {
  id: number;
  name: string;
}

function fetchUser(): Promise<Account> {
  return new Promise<Account>((resolve): void => {
    setTimeout((): void => resolve({ name: 'Alice', id: 1 }), 1000);
  });
}

function fetchPosts(userId: number): Promise<string[]> {
  return new Promise<string[]>((resolve): void => {
    setTimeout((): void => resolve(['Post 1', 'Post 2', 'Post 3']), 800);
  });
}

function fetchComments(postId: string | number): Promise<string[]> {
  return new Promise<string[]>((resolve): void => {
    setTimeout((): void => resolve(['Comment 1', 'Comment 2']), 600);
  });
}

// 1. Promise.all — parallel, and one rejection fails the whole thing
async function loadAllData(): Promise<void> {
  try {
    const [user, posts, comments] = await Promise.all([
      fetchUser(),
      fetchPosts(1),
      fetchComments(1),
    ]);
    console.log('User:', user, 'Posts:', posts, 'Comments:', comments);
  } catch (error: unknown) {
    console.error('One or more promises failed:', error);
  }
}

// 2. Promise.allSettled — every result comes back, success or failure.
// The result is a discriminated union, so `status` narrows it
async function loadAllDataSafe(): Promise<void> {
  const results = await Promise.allSettled([fetchUser(), fetchPosts(1), fetchComments(1)]);

  results.forEach((result, index: number): void => {
    if (result.status === 'fulfilled') {
      console.log(`Promise ${index} succeeded:`, result.value);
    } else {
      console.log(`Promise ${index} failed:`, result.reason);
    }
  });
}

// 3. Promise.race — first to *settle* wins, including first to reject
async function loadFirstAvailable(): Promise<void> {
  const result = await Promise.race([fetchUser(), fetchPosts(1), fetchComments(1)]);
  console.log('First result:', result); // Comments, at 600ms
}

// 4. Sequential — when each step genuinely needs the one before it
async function loadSequentially(): Promise<void> {
  const user: Account = await fetchUser();
  const posts: string[] = await fetchPosts(user.id);
  const comments: string[] = await fetchComments(posts[0]);
  console.log(user, posts, comments);
}
```

---

## Common Pitfalls

### Pitfall 1: Forgetting to Return Promise

**Missing Return Statement** - Common mistake of not returning promises from functions, causing callers to lose the promise chain.

```typescript
// ❌ The promise is created and then dropped. The caller gets undefined, and
// a rejection becomes an unhandled rejection
function getDataWrong(): void {
  fetch('https://api.example.com/data').then((response: Response) => response.json());
}

// ✅ Return it
function getData(): Promise<unknown> {
  return fetch('https://api.example.com/data').then((response: Response) => response.json());
}

void getData().then((data: unknown): void => console.log(data));
```

### Pitfall 2: Not Handling Errors

**Unhandled Promise Rejections** - Shows importance of error handling in promises using catch() or try/catch with async/await to prevent silent failures.

```typescript
// ❌ No catch — a failure becomes an unhandled rejection
fetch('https://api.example.com/data')
  .then((response: Response) => response.json())
  .then((data: unknown): void => console.log(data));

// ✅ Note the ok check: fetch only rejects on a network failure, so a 500
// resolves happily and would otherwise sail through as valid data
fetch('https://api.example.com/data')
  .then((response: Response) => {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return response.json();
  })
  .then((data: unknown): void => console.log(data))
  .catch((error: unknown): void => console.error('Fetch error:', error));

// ✅ Better — the same thing, linear
async function fetchData(): Promise<unknown> {
  try {
    const response: Response = await fetch('https://api.example.com/data');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error: unknown) {
    console.error('Fetch error:', error);
    throw error; // Re-throw so the caller can decide
  }
}
```

### Pitfall 3: Sequential Instead of Parallel

**Performance Anti-pattern** - Demonstrates the performance cost of awaiting independent operations sequentially versus executing them in parallel with Promise.all.

```typescript
interface Dashboard {
  user: Account;
  posts: string[];
  comments: string[];
}

// ❌ Sequential, though nothing here depends on anything else
async function loadData(): Promise<Dashboard> {
  const user = await fetchUser(); // 1s
  const posts = await fetchPosts(1); // then 1s
  const comments = await fetchComments(1); // then 1s
  return { user, posts, comments }; // ~3 seconds
}

// ✅ Parallel — all three start before any is awaited
async function loadDataFast(): Promise<Dashboard> {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),
    fetchPosts(1),
    fetchComments(1),
  ]);
  return { user, posts, comments }; // ~1 second
}
```

### Pitfall 4: Mixing Promises and Async/Await

**Inconsistent Async Patterns** - Shows why mixing promise chains with async/await leads to confusing code, recommending consistent style.

```typescript
// ❌ Two styles in four lines
async function mixedStyle(): Promise<string[]> {
  const user: Account = await fetchUser();
  return fetchPosts(user.id).then((posts: string[]): string[] => posts.map((p: string): string => p));
}

// ✅ Pick one and stay in it
async function consistentStyle(): Promise<string[]> {
  const user: Account = await fetchUser();
  const posts: string[] = await fetchPosts(user.id);
  return posts.map((post: string): string => post);
}
```

---

## Best Practices

### 1. Always Handle Errors

**Robust Error Handling Pattern** - Comprehensive error handling with HTTP status checks, structured responses, and proper error propagation.

```typescript
// A discriminated union beats a `success` boolean with optional fields:
// checking `.ok` narrows the type, so the wrong branch will not compile
type Result<T> = { ok: true; data: T } | { ok: false; error: string };

async function robustFetch<T>(url: string): Promise<Result<T>> {
  try {
    const response: Response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return { ok: true, data: (await response.json()) as T };
  } catch (error: unknown) {
    console.error('Fetch failed:', error);
    // `error` is `unknown`, so narrow before touching `.message`
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const result = await robustFetch<Account>('https://api.example.com/data');
if (result.ok) {
  console.log(result.data); // `data` exists only on this branch
} else {
  console.error(result.error);
}
```

### 2. Use Promise.all for Independent Operations

**Parallel Execution Optimization** - Uses Promise.all to run independent async operations concurrently, significantly improving performance.

```typescript
async function loadDashboard(): Promise<Dashboard> {
  const start: number = Date.now();

  const [userData, notifications, analytics] = await Promise.all([
    fetchUser(),
    fetchPosts(1),
    fetchComments(1),
  ]);

  console.log(`Loaded in ${Date.now() - start}ms`);

  return { user: userData, posts: notifications, comments: analytics };
}
```

### 3. Retry Logic for Failed Requests

**Automatic Retry with Exponential Backoff** - Implements retry logic with increasing delays between attempts, handling transient failures gracefully.

```typescript
async function fetchWithRetry<T>(url: string, options: RequestInit = {}, retries = 3): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      const response: Response = await fetch(url, options);
      if (response.ok) {
        return (await response.json()) as T;
      }

      // Back off between attempts — 1s, 2s, 3s
      if (i < retries - 1) {
        await new Promise<void>((resolve): void => {
          setTimeout(resolve, 1000 * (i + 1));
        });
      }
    } catch (error: unknown) {
      if (i === retries - 1) throw error;
      console.log(`Retry ${i + 1}/${retries}…`);
    }
  }

  throw new Error(`Failed after ${retries} retries`);
}

try {
  const data = await fetchWithRetry<Account>('https://api.example.com/data');
  console.log(data);
} catch (error: unknown) {
  console.error('All retries failed:', error);
}
```

---

## Real-world Scenarios

### Scenario 1: Fetch with Timeout

**Request Timeout Implementation** - Uses Promise.race to add timeout functionality to fetch requests, preventing indefinite hangs.

```typescript
// Promise.race against a timer. The losing promise is not cancelled — the
// request still completes, its result is simply ignored. Use AbortController
// when you need the request itself to stop
function fetchWithTimeout(url: string, timeout = 5000): Promise<Response> {
  return Promise.race([
    fetch(url),
    new Promise<never>((_, reject): void => {
      setTimeout((): void => reject(new Error('Request timeout')), timeout);
    }),
  ]);
}

async function loadData(): Promise<unknown> {
  try {
    const response: Response = await fetchWithTimeout('https://api.example.com/data', 3000);
    return await response.json();
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'Request timeout') {
      console.error('Request took too long');
    } else {
      console.error('Request failed:', error);
    }
    return undefined;
  }
}
```

### Scenario 2: Batching Requests

**Batch Processing Pattern** - Processes multiple URLs in controlled batches to avoid overwhelming servers or hitting rate limits.

```typescript
// Promise.all with 500 URLs opens 500 connections. Batching bounds the
// concurrency without giving up parallelism entirely
async function batchFetch<T>(urls: readonly string[], batchSize = 3): Promise<T[]> {
  const results: T[] = [];

  for (let i = 0; i < urls.length; i += batchSize) {
    const batch: readonly string[] = urls.slice(i, i + batchSize);
    const batchResults: T[] = await Promise.all(
      batch.map((url: string): Promise<T> => fetch(url).then((r: Response) => r.json() as Promise<T>)),
    );
    results.push(...batchResults);
  }

  return results;
}

const urls: string[] = Array.from(
  { length: 10 },
  (_, i: number): string => `https://api.example.com/item/${i}`,
);

const data = await batchFetch<Account>(urls, 3);
```

### Scenario 3: Promise-based Event Emitter

**Async Event Handling** - Creates an event emitter that waits for all async event handlers to complete before resolving.

```typescript
type Listener<T> = (data: T) => void | Promise<void>;

class AsyncEventEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Listener<never>[]>();

  on<K extends keyof Events>(event: K, callback: Listener<Events[K]>): void {
    const existing = this.listeners.get(event) ?? [];
    existing.push(callback as Listener<never>);
    this.listeners.set(event, existing);
  }

  // Promise.resolve() normalises handlers that are synchronous, so callers
  // do not have to care which kind they registered
  async emit<K extends keyof Events>(event: K, data: Events[K]): Promise<void> {
    const handlers = this.listeners.get(event);
    if (handlers === undefined) return;

    await Promise.all(
      handlers.map((callback): Promise<void> => Promise.resolve((callback as Listener<Events[K]>)(data))),
    );
  }
}

const emitter = new AsyncEventEmitter<{ data: { message: string } }>();

emitter.on('data', async (data): Promise<void> => {
  await new Promise<void>((resolve): void => {
    setTimeout(resolve, 100);
  });
  console.log('Handler 1:', data);
});

emitter.on('data', async (data): Promise<void> => {
  await new Promise<void>((resolve): void => {
    setTimeout(resolve, 50);
  });
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
