# Error Handling

Proper error handling separates production-ready code from prototypes. It's the difference between applications that crash mysteriously and those that gracefully recover, log issues, and provide helpful feedback. Understanding error handling demonstrates mature software engineering practices.

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

```
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

```javascript
try {
    // Code that might throw errors
} catch (error) {
    // Handle the error
} finally {
    // Cleanup (always runs)
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

```
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

```javascript
try {
    throw new Error('Something went wrong');
} catch (error) {
    console.log(error.name);    // "Error"
    console.log(error.message); // "Something went wrong"
    console.log(error.stack);   // Full stack trace
}
```

**Finally Block Guarantees:**

**Scenario 1: Success**
```javascript
try {
    return 'success';
} finally {
    console.log('Cleanup'); // Still runs before return!
}
// Output: "Cleanup", then returns "success"
```

**Scenario 2: Error**
```javascript
try {
    throw new Error('fail');
} catch (e) {
    return 'handled';
} finally {
    console.log('Cleanup'); // Still runs!
}
```

**Scenario 3: Early Return**
```javascript
try {
    if (condition) return early;
    doWork();
} finally {
    cleanup(); // Runs even with early return!
}
```

**Common Use Cases:**

**1. Resource Cleanup:**
```javascript
function readFile(filename) {
    let file;
    try {
        file = openFile(filename);
        return file.read();
    } catch (error) {
        console.error('Read failed:', error);
        return null;
    } finally {
        if (file) file.close(); // Always close file
    }
}
```

**2. Database Connections:**
```javascript
async function queryDatabase() {
    let connection;
    try {
        connection = await db.connect();
        return await connection.query('SELECT * FROM users');
    } catch (error) {
        console.error('Query failed:', error);
        throw error;
    } finally {
        if (connection) await connection.close(); // Always close
    }
}
```

**3. Loading States:**
```javascript
async function fetchData() {
    setLoading(true);
    try {
        const data = await api.fetch();
        setData(data);
    } catch (error) {
        setError(error);
    } finally {
        setLoading(false); // Always reset loading state
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
```javascript
const data = JSON.parse(invalidJSON); // 💥 Crash!
```

**To Handled Errors:**
```javascript
try {
    const data = JSON.parse(invalidJSON);
    processData(data);
} catch (error) {
    console.error('Parse failed:', error.message);
    return { error: 'Invalid JSON' }; // Graceful degradation
}
```

**Key Insight:**
> The `finally` block is the **only** guaranteed cleanup mechanism in JavaScript. It executes even if `try` or `catch` contains `return`, `throw`, or `break` statements - making it perfect for releasing resources.

```javascript
try {
    // Code that might throw an error
    const result = riskyOperation();
    console.log(result);
} catch (error) {
    // Handle the error
    console.error('Something went wrong:', error.message);
} finally {
    // Always executes (optional)
    console.log('Cleanup code here');
}
```

**Practical Example**

**Safe JSON Parsing** - Wraps risky operations like JSON.parse in try/catch, returning structured success/error objects instead of throwing.

```javascript
function parseJSON(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return { success: true, data };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

const result1 = parseJSON('{"name": "Alice"}');
console.log(result1); // { success: true, data: { name: 'Alice' } }

const result2 = parseJSON('invalid json');
console.log(result2); // { success: false, error: '...' }
```

**Finally Block**

**Resource Cleanup** - Finally block ensures cleanup code (like closing files) always executes, regardless of success or error.

```javascript
function readFile(filename) {
    let file;

    try {
        file = openFile(filename);
        const data = file.read();
        return data;
    } catch (error) {
        console.error('Error reading file:', error);
        return null;
    } finally {
        // Always close file, even if error occurred
        if (file) {
            file.close();
        }
    }
}
```

### 2. Throwing Errors

**throw Statement**

### 💡 **Throwing Custom Errors**

How to signal exceptional conditions that callers should handle.

**The Basics:**

**Syntax:**
```javascript
throw new Error('Error message');
```

**What Happens:**
```
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
```javascript
throw 'Error!';           // String
throw 404;                // Number
throw { message: 'Bad' }; // Plain object
```

**Problems:**
- No stack trace
- Hard to debug
- Can't determine error type

**✅ Good (Error Objects):**
```javascript
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
```javascript
throw new Error('Error'); // What error?
throw new Error('Bad input'); // Which input? What's wrong?
```

**✅ Specific and Actionable:**
```javascript
throw new Error('User ID must be a positive integer, got: ' + userId);
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
```javascript
function divide(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
        throw new TypeError('Arguments must be numbers');
    }
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}
```

**Return for Expected Failures:**
```javascript
function findUser(id) {
    const user = database.find(id);
    if (!user) {
        return null; // Expected - user might not exist
    }
    return user;
}
```

**API Design Pattern:**

```javascript
// ❌ Poor API - throws for expected case
function getConfig(key) {
    if (!config[key]) {
        throw new Error('Config not found'); // Expected case!
    }
    return config[key];
}

// ✅ Better API - return for expected, throw for exceptional
function getConfig(key) {
    if (typeof key !== 'string') {
        throw new TypeError('Key must be string'); // Exceptional
    }
    return config[key] || null; // Expected
}
```

**Error Propagation:**

**Stack Unwinding:**
```javascript
function level3() {
    throw new Error('Error at level 3');
}

function level2() {
    level3(); // Error propagates up
}

function level1() {
    try {
        level2();
    } catch (error) {
        console.error('Caught:', error.message);
        // Stack trace shows: level3 → level2 → level1
    }
}
```

**Re-throwing:**
```javascript
function processData(data) {
    try {
        return riskyOperation(data);
    } catch (error) {
        console.error('Operation failed:', error);
        throw error; // Re-throw for caller to handle
    }
}
```

**Creating Informative Errors:**

```javascript
function validateAge(age) {
    if (typeof age !== 'number') {
        throw new TypeError(
            `Age must be a number, got ${typeof age}`
        );
    }
    if (age < 0) {
        throw new RangeError(
            `Age cannot be negative, got ${age}`
        );
    }
    if (age < 18) {
        throw new Error(
            `Must be 18 or older, got ${age}`
        );
    }
    return true;
}
```

**Key Insight:**
> Use `throw` for **exceptional conditions** (contract violations, impossible states) and `return` for **expected failures** (not found, validation). This creates clearer APIs where errors truly mean something went wrong, not just "this is an alternative path."

```javascript
function divide(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

try {
    const result = divide(10, 0);
} catch (error) {
    console.error(error.message); // "Division by zero"
}
```

**Custom Error Messages**

**Specific Error Types** - Uses built-in error types (TypeError, RangeError) for specific error conditions, making errors more descriptive.

```javascript
function validateAge(age) {
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
    validateAge('25');
} catch (error) {
    console.error(error.name);    // "TypeError"
    console.error(error.message); // "Age must be a number"
}
```

### 3. Error Types

**Built-in Error Types**

**JavaScript Error Hierarchy** - JavaScript provides specific error types for different failure categories, making errors more descriptive than generic Error. TypeError indicates wrong types (calling non-function, accessing null properties), ReferenceError means undefined variables, RangeError signals out-of-bounds values, SyntaxError catches parsing errors, and URIError handles malformed URIs. Using specific error types helps callers distinguish error categories and handle them appropriately - you might retry RangeErrors but not TypeErrors. Creating custom error classes (extending Error) enables application-specific error hierarchies, allowing fine-grained error handling based on error type.

```javascript
// Error - Generic error
throw new Error('Something went wrong');

// SyntaxError - Invalid syntax
// eval('const x ='); // SyntaxError

// ReferenceError - Invalid reference
try {
    console.log(undefinedVariable);
} catch (error) {
    console.log(error instanceof ReferenceError); // true
}

// TypeError - Wrong type
try {
    null.toString();
} catch (error) {
    console.log(error instanceof TypeError); // true
}

// RangeError - Number out of range
try {
    const arr = new Array(-1);
} catch (error) {
    console.log(error instanceof RangeError); // true
}

// URIError - URI handling error
try {
    decodeURIComponent('%');
} catch (error) {
    console.log(error instanceof URIError); // true
}
```

### 4. Custom Error Classes

**Creating Custom Errors** - Extends Error class to create domain-specific error types with custom properties and methods.

```javascript
// Custom error class
class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'ValidationError';
    }
}

class NetworkError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'NetworkError';
        this.statusCode = statusCode;
    }
}

// Usage
function validateUser(user) {
    if (!user.name) {
        throw new ValidationError('Name is required');
    }

    if (!user.email) {
        throw new ValidationError('Email is required');
    }

    return true;
}

try {
    validateUser({ name: 'Alice' });
} catch (error) {
    if (error instanceof ValidationError) {
        console.error('Validation failed:', error.message);
    } else {
        console.error('Unknown error:', error);
    }
}
```

**More Advanced Custom Errors**

**Rich Error Objects** - Custom error classes with additional context (statusCode, endpoint, timestamp) and serialization methods.

```javascript
class APIError extends Error {
    constructor(message, statusCode, endpoint) {
        super(message);
        this.name = 'APIError';
        this.statusCode = statusCode;
        this.endpoint = endpoint;
        this.timestamp = new Date();
    }

    toJSON() {
        return {
            name: this.name,
            message: this.message,
            statusCode: this.statusCode,
            endpoint: this.endpoint,
            timestamp: this.timestamp
        };
    }
}

async function fetchUser(id) {
    const response = await fetch(`/api/users/${id}`);

    if (!response.ok) {
        throw new APIError(
            'Failed to fetch user',
            response.status,
            `/api/users/${id}`
        );
    }

    return response.json();
}

try {
    const user = await fetchUser(123);
} catch (error) {
    if (error instanceof APIError) {
        console.error(error.toJSON());
    }
}
```

### 5. Async Error Handling

**Promises**

**Promise Error Handling** - Handles promise rejections with catch() method, throwing errors for HTTP failures and re-throwing when needed.

```javascript
function fetchData() {
    return fetch('/api/data')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log(data);
            return data;
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            throw error; // Re-throw if needed
        });
}
```

**Async/Await**

**Async Error Handling with Try/Catch** - Uses try/catch blocks with async/await for cleaner error handling than promise chains.

```javascript
async function fetchUser(id) {
    try {
        const response = await fetch(`/api/users/${id}`);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const user = await response.json();
        return user;

    } catch (error) {
        console.error('Error fetching user:', error);

        // Return default or re-throw
        return null;
    }
}

// Multiple async operations
async function loadDashboard() {
    try {
        const [user, posts, comments] = await Promise.all([
            fetchUser(1),
            fetchPosts(),
            fetchComments()
        ]);

        return { user, posts, comments };

    } catch (error) {
        console.error('Error loading dashboard:', error);
        throw error;
    }
}
```

**Promise.allSettled() - Handle Multiple Promises**

**Resilient Parallel Operations** - Promise.allSettled waits for all promises to settle (resolve or reject), handling mixed success/failure gracefully.

```javascript
async function fetchMultipleUsers(ids) {
    const promises = ids.map(id => fetchUser(id));

    const results = await Promise.allSettled(promises);

    const successful = results
        .filter(r => r.status === 'fulfilled')
        .map(r => r.value);

    const failed = results
        .filter(r => r.status === 'rejected')
        .map(r => r.reason);

    return { successful, failed };
}

const { successful, failed } = await fetchMultipleUsers([1, 2, 3]);
console.log(`Loaded ${successful.length} users`);
console.log(`Failed to load ${failed.length} users`);
```

### 6. Error Boundaries (React)

**React Error Boundaries** - React component that catches JavaScript errors in child component tree, displaying fallback UI and logging errors.

```javascript
// React Error Boundary Component
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('Error caught by boundary:', error, errorInfo);
        // Log to error reporting service
        logErrorToService(error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div>
                    <h1>Something went wrong</h1>
                    <p>{this.state.error.message}</p>
                </div>
            );
        }

        return this.props.children;
    }
}

// Usage
function App() {
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

```javascript
// return - normal flow control
function divide1(a, b) {
    if (b === 0) {
        return null; // Caller needs to check
    }
    return a / b;
}

const result1 = divide1(10, 0);
if (result1 === null) {
    console.log('Error');
}

// throw - exceptional flow control
function divide2(a, b) {
    if (b === 0) {
        throw new Error('Division by zero');
    }
    return a / b;
}

try {
    const result2 = divide2(10, 0);
} catch (error) {
    console.error(error.message);
}
```

### Q2: How do you handle errors in async code?

**Answer: Three approaches**

**Async Error Handling Patterns** - Three ways to handle async errors: catch() with promises, try/catch with async/await, or wrapper functions.

```javascript
// 1. .catch() with promises
fetch('/api/data')
    .then(res => res.json())
    .catch(error => console.error(error));

// 2. try/catch with async/await
async function fetchData() {
    try {
        const res = await fetch('/api/data');
        const data = await res.json();
        return data;
    } catch (error) {
        console.error(error);
        return null;
    }
}

// 3. Higher-order function wrapper
const asyncHandler = (fn) => {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };
};

const fetchUser = asyncHandler(async (id) => {
    const res = await fetch(`/api/users/${id}`);
    return res.json();
});
```

### Q3: What happens if you don't catch an error?

**Answer:**

**Unhandled Errors** - Uncaught errors crash programs; uncaught promise rejections can be caught with global handlers.

```javascript
// Uncaught error crashes the program
function riskyOperation() {
    throw new Error('Oops!');
}

// This will crash
// riskyOperation();

// In async code, uncaught promise rejections
async function asyncRisky() {
    throw new Error('Async error');
}

// Without await/catch, this creates unhandled rejection
asyncRisky();

// Global handlers
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection:', reason);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled rejection:', event.reason);
});
```

## 💡 Practical Examples

### Example 1: Retry Logic

**Automatic Retry with Backoff** - Retries failed operations with exponential backoff delays, handling transient failures gracefully.

```javascript
async function fetchWithRetry(url, maxRetries = 3) {
    let lastError;

    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            return await response.json();

        } catch (error) {
            lastError = error;
            console.log(`Attempt ${i + 1} failed, retrying...`);

            // Wait before retry (exponential backoff)
            await new Promise(resolve =>
                setTimeout(resolve, 1000 * Math.pow(2, i))
            );
        }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError.message}`);
}

// Usage
try {
    const data = await fetchWithRetry('/api/data');
    console.log(data);
} catch (error) {
    console.error('All retries failed:', error);
}
```

### Example 2: Input Validation

**Validation with Custom Errors** - Uses custom ValidationError for input validation, providing clear error messages for each validation rule.

```javascript
class Validator {
    static validateEmail(email) {
        if (!email) {
            throw new ValidationError('Email is required');
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new ValidationError('Invalid email format');
        }

        return true;
    }

    static validatePassword(password) {
        if (!password) {
            throw new ValidationError('Password is required');
        }

        if (password.length < 8) {
            throw new ValidationError('Password must be at least 8 characters');
        }

        if (!/[A-Z]/.test(password)) {
            throw new ValidationError('Password must contain uppercase letter');
        }

        if (!/[0-9]/.test(password)) {
            throw new ValidationError('Password must contain number');
        }

        return true;
    }
}

// Usage
function registerUser(email, password) {
    try {
        Validator.validateEmail(email);
        Validator.validatePassword(password);

        // Proceed with registration
        console.log('Validation passed');

    } catch (error) {
        if (error instanceof ValidationError) {
            console.error('Validation error:', error.message);
            return { success: false, error: error.message };
        }
        throw error;
    }
}
```

### Example 3: Graceful Degradation

**Fallback Strategy** - Implements fallback chain (API → Cache → Default) for resilient data fetching with graceful degradation.

```javascript
class DataService {
    async getData() {
        try {
            // Try primary source
            return await this.fetchFromAPI();
        } catch (apiError) {
            console.warn('API failed, trying cache:', apiError.message);

            try {
                // Fallback to cache
                return await this.fetchFromCache();
            } catch (cacheError) {
                console.warn('Cache failed, using default:', cacheError.message);

                // Final fallback
                return this.getDefaultData();
            }
        }
    }

    async fetchFromAPI() {
        const response = await fetch('/api/data');
        if (!response.ok) throw new Error('API error');
        return response.json();
    }

    async fetchFromCache() {
        const cached = localStorage.getItem('data');
        if (!cached) throw new Error('No cache');
        return JSON.parse(cached);
    }

    getDefaultData() {
        return { message: 'Default data' };
    }
}

const service = new DataService();
const data = await service.getData();
console.log(data);
```

## 🚨 Common Pitfalls

### 1. Swallowing Errors

**Silent Failures** - Empty catch blocks hide errors; always log or handle errors appropriately to maintain visibility.

```javascript
// Bad: Silent failure
try {
    riskyOperation();
} catch (error) {
    // Empty catch - error is lost!
}

// Good: Log or handle
try {
    riskyOperation();
} catch (error) {
    console.error('Error:', error);
    // Or send to logging service
}
```

### 2. Not Re-throwing When Needed

**Error Propagation** - Log errors locally but re-throw when callers need to handle them, maintaining error flow through the call stack.

```javascript
// Bad: Error not propagated
async function processData() {
    try {
        const data = await fetchData();
        return data;
    } catch (error) {
        console.error(error);
        // Caller thinks everything is fine!
    }
}

// Good: Re-throw after logging
async function processDataCorrect() {
    try {
        const data = await fetchData();
        return data;
    } catch (error) {
        console.error('Error in processData:', error);
        throw error; // Let caller handle
    }
}
```

### 3. Forgetting Async Error Handling

**Unhandled Promise Rejections** - Always handle async function rejections with catch() or try/catch to prevent unhandled rejection warnings.

```javascript
// Bad: Unhandled promise rejection
async function badAsync() {
    throw new Error('Oops');
}

badAsync(); // Unhandled rejection!

// Good: Handle it
badAsync().catch(error => console.error(error));

// Or with try/catch
(async () => {
    try {
        await badAsync();
    } catch (error) {
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
