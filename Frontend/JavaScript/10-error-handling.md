---
title: Error Handling
part: 1
chapter: 0
slug: javascript-error-handling
level: intermediate # beginner | intermediate | advanced
reading_time: 40
updated: 2026-08-28
tags: [frontend, javascript, error, handling]
in_book: true
---

# Error Handling {#ch-error-handling}

> Fail in a way that is recoverable, loggable and honest — instead of swallowing the problem.

**In this chapter:** `throw` and custom error classes · `try`/`catch`/`finally` · errors across `async` boundaries · unhandled rejections · what to log and what to show

## Why Error Handling Matters

**Interview Perspective:**
- Tests understanding of defensive programming
- Shows awareness of edge cases and failure modes
- Demonstrates production-mindset vs tutorial-following
- Common question: "How do you handle errors in async code?"

**Real-World Importance:**
- **User Experience**: Graceful degradation vs crashes
- **Debugging**: Proper errors with context speed up troubleshooting
- **Monitoring**: Error tracking services need structured errors
- **Resilience**: Retry logic, fallbacks, circuit breakers

## Error Handling Strategy Pyramid

```text
┌────────────────────────────────┐
│   Prevent (Validation)         │ ← Best: Stop errors before they happen
├────────────────────────────────┤
│   Detect (Try/Catch)           │ ← Catch and handle errors
├────────────────────────────────┤
│   Recover (Retry/Fallback)     │ ← Attempt to recover
├────────────────────────────────┤
│   Report (Logging/Monitoring)  │ ← Track for debugging
└────────────────────────────────┘
```

## Error Handling Approaches

| Approach | When to Use | Example |
|----------|-------------|---------|
| **Return Error** | Expected failures | `return { success: false, error }` |
| **Throw Error** | Exceptional conditions | `throw new Error('Invalid input')` |
| **Callback Error** | Async (Node style) | `callback(error, result)` |
| **Promise Rejection** | Async operations | `Promise.reject(error)` |
| **Try/Catch** | Synchronous errors | `try { } catch(e) { }` |

## 📚 Core Concepts

### 1. Try/Catch/Finally

**Basic Structure**

### 💡 **Try/Catch/Finally Blocks**

JavaScript's structured exception handling mechanism for graceful error recovery.

**The Three Blocks:**

```typescript
try {
  // Code that might throw
} catch (error: unknown) {
  // Handle it. Since TypeScript 4.4 the sane annotation is `unknown`,
  // because anything can be thrown — not just an Error
} finally {
  // Cleanup — always runs
}
```

**How Each Block Works:**

**1. Try Block:**
- Contains potentially failing code
- Execution stops at first error
- Jumps to catch block if error occurs

**2. Catch Block:**
- Receives error object
- Access to `error.message` and `error.stack`
- Handles or logs the error
- Can re-throw if needed

**3. Finally Block:**
- **Always executes** (success or failure)
- Perfect for cleanup operations
- Runs even if try/catch has `return`

**Execution Flow:**

```text
try {
    statement1; ✅ Executes
    statement2; ✅ Executes
    throwError(); ❌ Error thrown!
    statement3; ⏭️ Skipped
}
    ↓
catch (error) {
    handleError(); ✅ Executes
}
    ↓
finally {
    cleanup(); ✅ Always executes
}
```

**Error Object Properties:**

```typescript
try {
  throw new Error('Something went wrong');
} catch (error: unknown) {
  // Narrow before reading any property — this is the whole discipline
  if (error instanceof Error) {
    console.log(error.name); // "Error"
    console.log(error.message); // "Something went wrong"
    console.log(error.stack); // Full stack trace
  }
}
```

**Finally Block Guarantees:**

**Scenario 1: Success**
```typescript
try {
  return 'success';
} finally {
  console.log('Cleanup'); // Runs before the value is returned
}
// Logs "Cleanup", then returns "success"
```

**Scenario 2: Error**
```typescript
try {
  throw new Error('fail');
} catch (e: unknown) {
  return 'handled';
} finally {
  console.log('Cleanup'); // Runs on the catch path too
}
```

**Scenario 3: Early Return**
```typescript
try {
  if (condition) return early;
  doWork();
} finally {
  cleanup(); // Runs on the early return as well
}
```

**Common Use Cases:**

**1. Resource Cleanup:**
```typescript
function readFile(filename: string): string | null {
  let file: FileHandle | undefined;
  try {
    file = openFile(filename);
    return file.read();
  } catch (error: unknown) {
    console.error('Read failed:', error);
    return null;
  } finally {
    // `finally` is where resource release belongs — the catch above returns,
    // and a return does not skip it
    file?.close();
  }
}
```

**2. Database Connections:**
```typescript
async function queryDatabase(): Promise<User[]> {
  let connection: Connection | undefined;
  try {
    connection = await db.connect();
    return await connection.query('SELECT * FROM users');
  } catch (error: unknown) {
    console.error('Query failed:', error);
    throw error;
  } finally {
    // Leaking a connection per failed query exhausts the pool within minutes
    await connection?.close();
  }
}
```

**3. Loading States:**
```typescript
async function fetchData(): Promise<void> {
  setLoading(true);
  try {
    const data: unknown = await api.fetch();
    setData(data);
  } catch (error: unknown) {
    setError(error);
  } finally {
    // Without `finally`, a thrown error leaves the spinner running forever
    setLoading(false);
  }
}
```

**Best Practices:**

| Practice | Why |
|----------|-----|
| **Use finally for cleanup** | Guaranteed execution |
| **Don't swallow errors** | Always log or handle |
| **Re-throw when appropriate** | Let caller handle if needed |
| **Specific error handling** | Check error types |
| **Clean up resources** | Prevent memory leaks |

**The Transformation:**

**From Crashes:**
```typescript
const data: unknown = JSON.parse(invalidJSON); // Throws on bad input
```

**To Handled Errors:**
```typescript
try {
  const data: unknown = JSON.parse(invalidJSON);
  processData(data);
} catch (error: unknown) {
  console.error('Parse failed:', error instanceof Error ? error.message : error);
  return { error: 'Invalid JSON' }; // Degrade rather than crash
}
```

**Key Insight:**
> The `finally` block is the **only** guaranteed cleanup mechanism in JavaScript. It executes even if `try` or `catch` contains `return`, `throw`, or `break` statements - making it perfect for releasing resources.

```typescript
try {
  const result: unknown = riskyOperation();
  console.log(result);
} catch (error: unknown) {
  console.error('Something went wrong:', error instanceof Error ? error.message : error);
} finally {
  console.log('Cleanup code here');
}
```

**Practical Example**

**Safe JSON Parsing** - Wraps risky operations like JSON.parse in try/catch, returning structured success/error objects instead of throwing.

```typescript
// A discriminated union makes the caller check before reading `data` —
// a `success` boolean with two optional fields does not
type ParseResult<T> = { ok: true; data: T } | { ok: false; error: string };

function parseJSON<T>(jsonString: string): ParseResult<T> {
  try {
    return { ok: true, data: JSON.parse(jsonString) as T };
  } catch (error: unknown) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

const result1 = parseJSON<{ name: string }>('{"name": "Alice"}');
if (result1.ok) console.log(result1.data.name); // Only reachable on success

const result2 = parseJSON('invalid json');
console.log(result2); // { ok: false, error: '…' }
```

**Finally Block**

**Resource Cleanup** - Finally block ensures cleanup code (like closing files) always executes, regardless of success or error.

```typescript
function readFileSafely(filename: string): string | null {
  let file: FileHandle | undefined;

  try {
    file = openFile(filename);
    return file.read();
  } catch (error: unknown) {
    console.error('Error reading file:', error);
    return null;
  } finally {
    file?.close();
  }
}
```

### 2. Throwing Errors

**throw Statement**

### 💡 **Throwing Custom Errors**

How to signal exceptional conditions that callers should handle.

**The Basics:**

**Syntax:**
```typescript
throw new Error('Error message');
```

**What Happens:**
```text
throw statement
    ↓
Execution stops immediately
    ↓
Call stack unwinds
    ↓
Searches for catch block
    ↓
Found? → Execute catch
Not found? → Program crashes
```

**Always Throw Error Objects:**

**❌ Bad (Primitives):**
```typescript
// ❌ All three are legal and all three are wrong. None carries a stack trace,
// and `error instanceof Error` is false for every one of them
throw 'Error!'; // String
throw 404; // Number
throw { message: 'Bad' }; // Plain object
```

**Problems:**
- No stack trace
- Hard to debug
- Can't determine error type

**✅ Good (Error Objects):**
```typescript
// ✅ Throw an Error, or a subclass of one
throw new Error('Something went wrong');
throw new TypeError('Expected string');
throw new RangeError('Value out of bounds');
```

**Benefits:**
- ✅ Automatic stack trace
- ✅ Error type information
- ✅ Debugging-friendly
- ✅ Standardized interface

**Error Message Best Practices:**

**❌ Vague:**
```typescript
// ❌ Neither message helps whoever reads the log at 3am
throw new Error('Error');
throw new Error('Bad input');
```

**✅ Specific and Actionable:**
```typescript
// ✅ Say what was expected and what arrived
throw new Error(`User ID must be a positive integer, got: ${userId}`);
throw new Error('Email format invalid: missing @ symbol');
throw new TypeError(`Expected array, got ${typeof value}`);
```

**Good Error Messages:**
1. **Describe what went wrong**
2. **Include the problematic value** (if safe)
3. **Suggest how to fix it** (when possible)
4. **Be specific, not generic**

**When to Throw vs Return:**

| Scenario | Use | Example |
|----------|-----|---------|
| **Exceptional/Unexpected** | `throw` | Invalid arguments, impossible states |
| **Expected failures** | `return` | Item not found, validation failed |
| **Programmer errors** | `throw` | Function misused, contract violated |
| **User errors** | `return` | Invalid form input, missing data |
| **Unrecoverable** | `throw` | System failures, critical errors |
| **Recoverable** | `return` | Retry-able failures, alternatives |

**Examples:**

**Throw for Exceptional Conditions:**
```typescript
// The typeof guard is for values arriving from outside the type system —
// JSON, form input, a third-party callback. Inside typed code it is dead weight
function divide(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}
```

**Return for Expected Failures:**
```typescript
// "Not found" is an expected outcome, so it is a return value, not a throw.
// The `| null` in the signature makes the caller handle it
function findUser(id: number): User | null {
  return database.find(id) ?? null;
}
```

**API Design Pattern:**

```typescript
// ❌ Throwing for a case the caller expects turns normal flow into exceptions
function getConfigBad(key: string): string {
  if (!config[key]) {
    throw new Error('Config not found');
  }
  return config[key];
}

// ✅ Return for the expected, throw for the exceptional
function getConfig(key: string): string | null {
  return config[key] ?? null;
}
```

**Error Propagation:**

**Stack Unwinding:**
```typescript
function level3(): never {
  throw new Error('Error at level 3');
}

function level2(): void {
  level3(); // Nothing to do — the error walks up on its own
}

function level1(): void {
  try {
    level2();
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Caught:', error.message);
      // The stack still shows level3 → level2 → level1
    }
  }
}
```

**Re-throwing:**
```typescript
function processData(data: unknown): unknown {
  try {
    return riskyOperation(data);
  } catch (error: unknown) {
    // Log here for context, then re-throw. Catching to log and *not*
    // re-throwing is how a failure becomes a silent wrong answer
    console.error('Operation failed:', error);
    throw error;
  }
}
```

**Creating Informative Errors:**

```typescript
// The right built-in makes `instanceof` useful to the caller: a RangeError is
// bad data, a TypeError is a bug in the calling code
function validateAge(age: unknown): boolean {
  if (typeof age !== 'number') {
    throw new TypeError(`Age must be a number, got ${typeof age}`);
  }
  if (age < 0) {
    throw new RangeError(`Age cannot be negative, got ${age}`);
  }
  if (age < 18) {
    throw new Error(`Must be 18 or older, got ${age}`);
  }
  return true;
}
```

**Key Insight:**
> Use `throw` for **exceptional conditions** (contract violations, impossible states) and `return` for **expected failures** (not found, validation). This creates clearer APIs where errors truly mean something went wrong, not just "this is an alternative path."

```typescript
function divideChecked(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

try {
  const result: number = divideChecked(10, 0);
} catch (error: unknown) {
  if (error instanceof Error) console.error(error.message); // "Division by zero"
}
```

**Custom Error Messages**

**Specific Error Types** - Uses built-in error types (TypeError, RangeError) for specific error conditions, making errors more descriptive.

```typescript
function checkAge(age: unknown): boolean {
  if (typeof age !== 'number') {
    throw new TypeError('Age must be a number');
  }
  if (age < 0) {
    throw new RangeError('Age cannot be negative');
  }
  if (age < 18) {
    throw new Error('Must be 18 or older');
  }
  return true;
}

try {
  checkAge('25'); // A string, not a number
} catch (error: unknown) {
  if (error instanceof Error) {
    console.error(error.name); // "TypeError"
    console.error(error.message); // "Age must be a number"
  }
}
```

### 3. Error Types

**Built-in Error Types**

**JavaScript Error Hierarchy** - JavaScript provides specific error types for different failure categories, making errors more descriptive than generic Error. TypeError indicates wrong types (calling non-function, accessing null properties), ReferenceError means undefined variables, RangeError signals out-of-bounds values, SyntaxError catches parsing errors, and URIError handles malformed URIs. Using specific error types helps callers distinguish error categories and handle them appropriately - you might retry RangeErrors but not TypeErrors. Creating custom error classes (extending Error) enables application-specific error hierarchies, allowing fine-grained error handling based on error type.

```typescript
// Error — the generic base
throw new Error('Something went wrong');

// SyntaxError — invalid syntax, thrown by JSON.parse and eval
try {
  JSON.parse('{');
} catch (error: unknown) {
  console.log(error instanceof SyntaxError); // true
}

// ReferenceError — a name that does not exist
try {
  console.log(undefinedVariable);
} catch (error: unknown) {
  console.log(error instanceof ReferenceError); // true
}

// TypeError — a value of the wrong type, the most common by far
try {
  (null as unknown as string).toString();
} catch (error: unknown) {
  console.log(error instanceof TypeError); // true
}

// RangeError — a number outside its allowed range
try {
  const arr = new Array(-1);
} catch (error: unknown) {
  console.log(error instanceof RangeError); // true
}

// URIError — malformed URI handling
try {
  decodeURIComponent('%');
} catch (error: unknown) {
  console.log(error instanceof URIError); // true
}
```

### 4. Custom Error Classes

**Creating Custom Errors** - Extends Error class to create domain-specific error types with custom properties and methods.

```typescript
// A custom class is what lets a caller distinguish "the input was wrong" from
// "the network was down" without string-matching the message
class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
    // Needed when targeting ES5: extending a built-in breaks the prototype chain
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

class NetworkError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'NetworkError';
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

function validateUser(user: { name?: string; email?: string }): boolean {
  if (!user.name) throw new ValidationError('Name is required');
  if (!user.email) throw new ValidationError('Email is required');
  return true;
}

try {
  validateUser({ name: 'Alice' });
} catch (error: unknown) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

**More Advanced Custom Errors**

**Rich Error Objects** - Custom error classes with additional context (statusCode, endpoint, timestamp) and serialization methods.

```typescript
interface APIErrorJSON {
  name: string;
  message: string;
  statusCode: number;
  endpoint: string;
  timestamp: string;
}

class APIError extends Error {
  readonly statusCode: number;
  readonly endpoint: string;
  readonly timestamp: Date;

  constructor(message: string, statusCode: number, endpoint: string) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.endpoint = endpoint;
    this.timestamp = new Date();
    Object.setPrototypeOf(this, APIError.prototype);
  }

  // An Error does not serialise usefully by default — JSON.stringify(new
  // Error('x')) is '{}'. Define toJSON so the log gets the context
  toJSON(): APIErrorJSON {
    return {
      name: this.name,
      message: this.message,
      statusCode: this.statusCode,
      endpoint: this.endpoint,
      timestamp: this.timestamp.toISOString(),
    };
  }
}

async function fetchUser(id: number): Promise<unknown> {
  const response: Response = await fetch(`/api/users/${id}`);

  if (!response.ok) {
    throw new APIError('Failed to fetch user', response.status, `/api/users/${id}`);
  }

  return response.json();
}

try {
  const user: unknown = await fetchUser(123);
} catch (error: unknown) {
  if (error instanceof APIError) {
    console.error(error.toJSON());
  }
}
```

### 5. Async Error Handling

**Promises**

**Promise Error Handling** - Handles promise rejections with catch() method, throwing errors for HTTP failures and re-throwing when needed.

```typescript
function fetchDataChained(): Promise<unknown> {
  return fetch('/api/data')
    .then((response: Response) => {
      // fetch only rejects on a network failure, so a 500 arrives here as a
      // resolved response. Check `ok` or the error path never runs
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      return response.json();
    })
    .then((data: unknown): unknown => {
      console.log(data);
      return data;
    })
    .catch((error: unknown): never => {
      console.error('Error fetching data:', error);
      throw error;
    });
}
```

**Async/Await**

**Async Error Handling with Try/Catch** - Uses try/catch blocks with async/await for cleaner error handling than promise chains.

```typescript
async function fetchUserOrNull(id: number): Promise<unknown | null> {
  try {
    const response: Response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    return await response.json();
  } catch (error: unknown) {
    console.error('Error fetching user:', error);
    // Swallowing here is a deliberate choice — the `| null` in the return
    // type is what tells the caller it happened
    return null;
  }
}

// Multiple async operations. Promise.all rejects on the first failure, so
// one bad request loses the other two results
async function loadDashboard(): Promise<{ user: unknown; posts: unknown; comments: unknown }> {
  try {
    const [user, posts, comments] = await Promise.all([
      fetchUserOrNull(1),
      fetchPosts(),
      fetchComments(),
    ]);

    return { user, posts, comments };
  } catch (error: unknown) {
    console.error('Error loading dashboard:', error);
    throw error;
  }
}
```

**Promise.allSettled() - Handle Multiple Promises**

**Resilient Parallel Operations** - Promise.allSettled waits for all promises to settle (resolve or reject), handling mixed success/failure gracefully.

```typescript
// allSettled, not all — one failed user should not lose the other two.
// The type predicate is what lets `.value` and `.reason` narrow correctly
async function fetchMultipleUsers(
  ids: readonly number[],
): Promise<{ successful: unknown[]; failed: unknown[] }> {
  const results = await Promise.allSettled(ids.map((id: number) => fetchUser(id)));

  const successful: unknown[] = results
    .filter((r): r is PromiseFulfilledResult<unknown> => r.status === 'fulfilled')
    .map((r) => r.value);

  const failed: unknown[] = results
    .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
    .map((r) => r.reason);

  return { successful, failed };
}

const { successful, failed } = await fetchMultipleUsers([1, 2, 3]);
console.log(`Loaded ${successful.length} users`);
console.log(`Failed to load ${failed.length} users`);
```

### 6. Error Boundaries (React)

**React Error Boundaries** - React component that catches JavaScript errors in child component tree, displaying fallback UI and logging errors.

```tsx
// React 19. Error boundaries are still the one thing that has no hooks
// equivalent — a class component is required
interface BoundaryProps {
  children: React.ReactNode;
}

interface BoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  constructor(props: BoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Runs during render — return the next state, do no side effects here
  static getDerivedStateFromError(error: Error): BoundaryState {
    return { hasError: true, error };
  }

  // Runs after commit — this is where logging belongs
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    logErrorToService(error, errorInfo);
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div>
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function App(): JSX.Element {
  return (
    <ErrorBoundary>
      <UserProfile />
      <PostsList />
    </ErrorBoundary>
  );
}
```

## 🎯 Common Interview Questions

### Q1: What's the difference between throw and return?

**Answer:**

**throw vs return** - return for normal values (caller checks), throw for exceptional cases (interrupts flow, must be caught).

```typescript
// return — the failure is expected, and the type says so
function divide1(a: number, b: number): number | null {
  if (b === 0) return null;
  return a / b;
}

const result1: number | null = divide1(10, 0);
if (result1 === null) {
  console.log('Error');
}

// throw — the failure is exceptional, and the caller may reasonably not
// handle it at this level
function divide2(a: number, b: number): number {
  if (b === 0) {
    throw new Error('Division by zero');
  }
  return a / b;
}

try {
  const result2: number = divide2(10, 0);
} catch (error: unknown) {
  if (error instanceof Error) console.error(error.message);
}
```

### Q2: How do you handle errors in async code?

**Answer: Three approaches**

**Async Error Handling Patterns** - Three ways to handle async errors: catch() with promises, try/catch with async/await, or wrapper functions.

```typescript
// 1. .catch() on the chain
fetch('/api/data')
  .then((res: Response) => res.json())
  .catch((error: unknown): void => console.error(error));

// 2. try/catch around await
async function fetchDataAwaited(): Promise<unknown> {
  try {
    const res: Response = await fetch('/api/data');
    return await res.json();
  } catch (error: unknown) {
    console.error(error);
    return null;
  }
}

// 3. A wrapper, so the try/catch is written once. `Args extends unknown[]`
// preserves the wrapped function's own signature
const asyncHandler =
  <Args extends unknown[], R>(fn: (...args: Args) => Promise<R>) =>
  async (...args: Args): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error: unknown) {
      console.error(error);
      throw error;
    }
  };

const fetchUserWrapped = asyncHandler(async (id: number): Promise<unknown> => {
  const res: Response = await fetch(`/api/users/${id}`);
  return res.json();
});
```

### Q3: What happens if you don't catch an error?

**Answer:**

**Unhandled Errors** - Uncaught errors crash programs; uncaught promise rejections can be caught with global handlers.

```typescript
function riskyOperation(): never {
  throw new Error('Oops!');
}

async function asyncRisky(): Promise<void> {
  throw new Error('Async error');
}

// ❌ Calling it without awaiting or catching leaves the rejection unhandled.
// Node has crashed the process on this since v15
asyncRisky();

// Last-resort handlers. These are for reporting, not for recovery —
// treat every one that fires as a bug to fix at its source
process.on('unhandledRejection', (reason: unknown): void => {
  console.error('Unhandled Rejection:', reason);
});

window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent): void => {
  console.error('Unhandled rejection:', event.reason);
});
```

## 💡 Practical Examples

### Example 1: Retry Logic

**Automatic Retry with Backoff** - Retries failed operations with exponential backoff delays, handling transient failures gracefully.

```typescript
async function fetchWithRetry<T>(url: string, maxRetries = 3): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response: Response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return (await response.json()) as T;
    } catch (error: unknown) {
      lastError = error;

      // Exponential backoff — 1s, 2s, 4s. Retrying flat-out just adds load
      await new Promise<void>((resolve): void => {
        setTimeout(resolve, 1000 * 2 ** i);
      });
    }
  }

  // `cause` links the wrapper to the original, so the stack is not lost
  throw new Error(`Failed after ${maxRetries} attempts`, { cause: lastError });
}

try {
  const data = await fetchWithRetry<unknown>('/api/data');
  console.log(data);
} catch (error: unknown) {
  console.error('All retries failed:', error);
}
```

### Example 2: Input Validation

**Validation with Custom Errors** - Uses custom ValidationError for input validation, providing clear error messages for each validation rule.

```typescript
class Validator {
  static validateEmail(email: string): boolean {
    if (!email) {
      throw new ValidationError('Email is required');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format');
    }

    return true;
  }

  static validatePassword(password: string): boolean {
    if (!password) {
      throw new ValidationError('Password is required');
    }
    if (password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new ValidationError('Password must contain an uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      throw new ValidationError('Password must contain a number');
    }

    return true;
  }
}

function registerUser(email: string, password: string): { ok: boolean; error?: string } {
  try {
    Validator.validateEmail(email);
    Validator.validatePassword(password);
    return { ok: true };
  } catch (error: unknown) {
    // Handle what you understand; re-throw what you do not. Catching
    // everything here would swallow a genuine bug
    if (error instanceof ValidationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
```

### Example 3: Graceful Degradation

**Fallback Strategy** - Implements fallback chain (API → Cache → Default) for resilient data fetching with graceful degradation.

```typescript
interface Data {
  message: string;
}

// Graceful degradation: network → cache → a default that always works.
// The signature never widens to `| null`, so no caller has to handle a miss
class DataService {
  async getData(): Promise<Data> {
    try {
      return await this.fetchFromAPI();
    } catch (apiError: unknown) {
      console.warn('API failed, trying cache');

      try {
        return await this.fetchFromCache();
      } catch (cacheError: unknown) {
        console.warn('Cache failed, using default');
        return this.getDefaultData();
      }
    }
  }

  async fetchFromAPI(): Promise<Data> {
    const response: Response = await fetch('/api/data');
    if (!response.ok) throw new Error('API error');
    return (await response.json()) as Data;
  }

  async fetchFromCache(): Promise<Data> {
    const cached: string | null = localStorage.getItem('data');
    if (cached === null) throw new Error('No cache');
    return JSON.parse(cached) as Data;
  }

  getDefaultData(): Data {
    return { message: 'Default data' };
  }
}

const service = new DataService();
const data: Data = await service.getData();
console.log(data);
```

## 🚨 Common Pitfalls

### 1. Swallowing Errors

**Silent Failures** - Empty catch blocks hide errors; always log or handle errors appropriately to maintain visibility.

```typescript
// ❌ An empty catch turns a failure into a wrong answer with no trace
try {
  riskyOperation();
} catch (error: unknown) {
  // Nothing. The bug is now invisible
}

// ✅ At minimum, log it
try {
  riskyOperation();
} catch (error: unknown) {
  console.error('Error:', error);
}
```

### 2. Not Re-throwing When Needed

**Error Propagation** - Log errors locally but re-throw when callers need to handle them, maintaining error flow through the call stack.

```typescript
// ❌ The catch swallows the failure and returns undefined, so the caller
// carries on as though it worked
async function processDataBad(): Promise<unknown> {
  try {
    return await fetchData();
  } catch (error: unknown) {
    console.error(error);
  }
}

// ✅ Log for context, then re-throw
async function processDataCorrect(): Promise<unknown> {
  try {
    return await fetchData();
  } catch (error: unknown) {
    console.error('Error in processData:', error);
    throw error;
  }
}
```

### 3. Forgetting Async Error Handling

**Unhandled Promise Rejections** - Always handle async function rejections with catch() or try/catch to prevent unhandled rejection warnings.

```typescript
async function badAsync(): Promise<void> {
  throw new Error('Oops');
}

// ❌ Calling and ignoring the promise. Node exits non-zero on this
badAsync();

// ✅ Attach a handler
void badAsync().catch((error: unknown): void => console.error(error));

// ✅ Or await inside a try/catch
void (async (): Promise<void> => {
  try {
    await badAsync();
  } catch (error: unknown) {
    console.error(error);
  }
})();
```

## 🎓 Best Practices

1. **Be specific with error types** (use custom errors)
2. **Always handle promise rejections**
3. **Log errors with context** (timestamp, user, action)
4. **Don't swallow errors silently**
5. **Validate input early** (fail fast)
6. **Provide helpful error messages**
7. **Use error boundaries in React**
8. **Implement retry logic for transient failures**
9. **Clean up resources in finally blocks**
10. **Monitor and log errors in production**

## 🔗 Related Topics

- [Promises & Async/Await](./06-promises-async.md)
- [Functions & Scope](./02-functions-scope.md)

---

[← Back to JavaScript](./README.md)
