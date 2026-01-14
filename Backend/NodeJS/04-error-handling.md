# Error Handling

## Overview

Proper error handling is crucial for building robust Node.js applications. Understanding error types, handling patterns, and best practices prevents application crashes and improves debugging.

**Why This Matters:**
- Unhandled errors crash the application
- Poor error handling hides bugs
- Good error handling improves user experience
- Proper logging aids debugging in production
- Error types determine handling strategy

**Error Handling Hierarchy:**

| Level | Handling Method | Example |
|-------|----------------|---------|
| **Synchronous** | try/catch | `JSON.parse()` errors |
| **Callbacks** | Error-first pattern | `fs.readFile(path, callback)` |
| **Promises** | `.catch()` or try/catch | `fetch().catch()` |
| **Async/Await** | try/catch | `try { await op() } catch(e) {}` |
| **Global** | Process listeners | `process.on('uncaughtException')` |

## Error Types in Node.js

### 1. Standard JavaScript Errors

```javascript
// SyntaxError
try {
  eval('foo bar');
} catch (err) {
  console.log(err instanceof SyntaxError); // true
  console.log(err.message); // "Unexpected identifier"
}

// ReferenceError
try {
  console.log(undefinedVariable);
} catch (err) {
  console.log(err instanceof ReferenceError); // true
}

// TypeError
try {
  null.f();
} catch (err) {
  console.log(err instanceof TypeError); // true
}

// RangeError
try {
  const arr = new Array(-1);
} catch (err) {
  console.log(err instanceof RangeError); // true
}
```

### 2. System Errors

```javascript
const fs = require('fs');

// ENOENT: No such file or directory
fs.readFile('/nonexistent/file.txt', (err, data) => {
  if (err) {
    console.log(err.code); // 'ENOENT'
    console.log(err.errno); // -2
    console.log(err.syscall); // 'open'
    console.log(err.path); // '/nonexistent/file.txt'
  }
});

// Common system error codes:
// EACCES - Permission denied
// EADDRINUSE - Address already in use
// ECONNREFUSED - Connection refused
// EEXIST - File already exists
// EISDIR - Is a directory
// EMFILE - Too many open files
// ENOENT - No such file or directory
// ENOTDIR - Not a directory
// ENOTEMPTY - Directory not empty
// EPERM - Operation not permitted
// EPIPE - Broken pipe
// ETIMEDOUT - Operation timed out
```

### 3. Custom Errors

```javascript
// Basic custom error
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    Error.captureStackTrace(this, this.constructor);
  }
}

// Advanced custom error with additional properties
class DatabaseError extends Error {
  constructor(message, query, code) {
    super(message);
    this.name = 'DatabaseError';
    this.query = query;
    this.code = code;
    this.timestamp = new Date();
    Error.captureStackTrace(this, this.constructor);
  }
}

// Usage
function validateUser(user) {
  if (!user.email) {
    throw new ValidationError('Email is required');
  }
  if (!user.email.includes('@')) {
    throw new ValidationError('Invalid email format');
  }
}

// HTTP Error classes
class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

class NotFoundError extends HttpError {
  constructor(message = 'Resource not found') {
    super(404, message);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message);
    this.name = 'UnauthorizedError';
  }
}

class ForbiddenError extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message);
    this.name = 'ForbiddenError';
  }
}

class BadRequestError extends HttpError {
  constructor(message = 'Bad request') {
    super(400, message);
    this.name = 'BadRequestError';
  }
}

// Usage in Express
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});
```

## Error Handling Patterns

### 1. Try-Catch (Synchronous)

```javascript
// Basic try-catch
try {
  const data = JSON.parse('invalid json');
} catch (err) {
  console.error('Parse error:', err.message);
}

// With finally
try {
  const file = openFile('data.txt');
  processFile(file);
} catch (err) {
  console.error('Error:', err);
} finally {
  closeFile(file); // Always executes
}

// Nested try-catch
try {
  try {
    riskyOperation();
  } catch (err) {
    // Handle specific error
    if (err.code === 'SPECIFIC_ERROR') {
      handleSpecificError(err);
    } else {
      throw err; // Re-throw for outer catch
    }
  }
} catch (err) {
  // Handle general errors
  console.error('Unhandled error:', err);
}
```

### 2. Error-First Callbacks

```javascript
const fs = require('fs');

// Standard pattern
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) {
    console.error('Error reading file:', err);
    return; // Important: return early
  }
  console.log('File contents:', data);
});

// Multiple operations
fs.readFile('input.txt', 'utf8', (err, data) => {
  if (err) return handleError(err);

  processData(data, (err, processed) => {
    if (err) return handleError(err);

    fs.writeFile('output.txt', processed, err => {
      if (err) return handleError(err);
      console.log('Success!');
    });
  });
});

// Better: Use promises to avoid callback hell
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);

async function processFile() {
  try {
    const data = await readFileAsync('input.txt', 'utf8');
    const processed = await processData(data);
    await writeFileAsync('output.txt', processed);
    console.log('Success!');
  } catch (err) {
    handleError(err);
  }
}
```

### 3. Promise Error Handling

```javascript
// Basic promise error handling
fetch('/api/data')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(err => console.error('Error:', err));

// Chain errors
doSomething()
  .then(result => doSomethingElse(result))
  .then(result => doThirdThing(result))
  .catch(err => {
    // Catches errors from any step
    console.error('Error in chain:', err);
  });

// Handle specific errors
fetch('/api/data')
  .then(response => {
    if (!response.ok) {
      throw new HttpError(response.status, 'Request failed');
    }
    return response.json();
  })
  .catch(err => {
    if (err instanceof HttpError) {
      console.error('HTTP Error:', err.statusCode, err.message);
    } else if (err instanceof TypeError) {
      console.error('Network error:', err);
    } else {
      console.error('Unknown error:', err);
    }
  });

// Multiple promises
Promise.all([
  fetchUsers(),
  fetchPosts(),
  fetchComments()
])
  .then(([users, posts, comments]) => {
    console.log('All data loaded');
  })
  .catch(err => {
    // Fails if ANY promise rejects
    console.error('Failed to load data:', err);
  });

// Handle each promise independently
Promise.allSettled([
  fetchUsers(),
  fetchPosts(),
  fetchComments()
])
  .then(results => {
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Promise ${index} succeeded:`, result.value);
      } else {
        console.error(`Promise ${index} failed:`, result.reason);
      }
    });
  });
```

### 4. Async/Await Error Handling

```javascript
// Basic try-catch with async/await
async function fetchData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return data;
  } catch (err) {
    console.error('Error fetching data:', err);
    throw err; // Re-throw if needed
  }
}

// Multiple operations
async function processUser(userId) {
  try {
    const user = await fetchUser(userId);
    const posts = await fetchPosts(user.id);
    const enriched = await enrichData(posts);
    return enriched;
  } catch (err) {
    if (err instanceof NotFoundError) {
      console.log('User not found');
      return null;
    }
    if (err instanceof DatabaseError) {
      console.error('Database error:', err);
      throw err;
    }
    // Unexpected error
    console.error('Unexpected error:', err);
    throw err;
  }
}

// Parallel operations with error handling
async function fetchAllData() {
  try {
    const [users, posts, comments] = await Promise.all([
      fetchUsers(),
      fetchPosts(),
      fetchComments()
    ]);
    return { users, posts, comments };
  } catch (err) {
    console.error('Failed to fetch all data:', err);
    throw err;
  }
}

// Wrapper for async functions
function asyncHandler(fn) {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      next(err);
    }
  };
}

// Usage in Express
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new NotFoundError('User not found');
  }
  res.json(user);
}));
```

## Error Handling in Express

### Error Middleware

```javascript
const express = require('express');
const app = express();

// Regular route
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      throw new NotFoundError();
    }
    res.json(user);
  } catch (err) {
    next(err); // Pass to error handler
  }
});

// Error handler middleware (must have 4 parameters)
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Send error response
  res.status(err.statusCode || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    }
  });
});

// Centralized error handler
class ErrorHandler {
  static handle(err, req, res, next) {
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    // Log error
    console.error({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      statusCode,
      message,
      stack: err.stack
    });

    // Don't leak error details in production
    const response = {
      error: {
        message: statusCode === 500 && process.env.NODE_ENV === 'production'
          ? 'Internal Server Error'
          : message
      }
    };

    if (process.env.NODE_ENV === 'development') {
      response.error.stack = err.stack;
    }

    res.status(statusCode).json(response);
  }

  static notFound(req, res, next) {
    const err = new NotFoundError(`Cannot ${req.method} ${req.path}`);
    next(err);
  }
}

// Use handlers
app.use(ErrorHandler.notFound); // 404 handler
app.use(ErrorHandler.handle);   // Error handler
```

### Async Error Wrapper

```javascript
// Wrapper function
const asyncHandler = fn => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));

// Class-based wrapper
class AsyncRoute {
  static wrap(fn) {
    return (req, res, next) => {
      fn(req, res, next).catch(next);
    };
  }
}

app.get('/posts', AsyncRoute.wrap(async (req, res) => {
  const posts = await Post.find();
  res.json(posts);
}));
```

## Operational vs Programmer Errors

### 💡 **Key Distinction**

Understanding the difference between these error types is critical for proper error handling strategy.

| Type | Description | How to Handle |
|------|-------------|---------------|
| **Operational Errors** | Expected runtime problems | ✅ Handle gracefully, log, retry |
| **Programmer Errors** | Bugs in code | ❌ Let crash, fix the bug |

### ✅ **Operational Errors**

Expected runtime problems that should be handled gracefully.

```javascript
// Operational errors (expected, handle gracefully)
class OperationalError extends Error {
  constructor(message) {
    super(message);
    this.name = 'OperationalError';
    this.isOperational = true;
  }
}

// Examples of operational errors:
// - Request timeout
// - Network connection failure
// - Invalid user input
// - Database connection error
// - File not found

// Handle operational errors
async function fetchUser(id) {
  try {
    const user = await db.query('SELECT * FROM users WHERE id = ?', [id]);
    if (!user) {
      throw new OperationalError('User not found');
    }
    return user;
  } catch (err) {
    if (err.isOperational) {
      // Log and return graceful response
      console.log('Operational error:', err.message);
      return null;
    }
    // Programmer error, don't handle
    throw err;
  }
}
```

### Programmer Errors

Bugs that should crash the application:

```javascript
// Programmer errors (bugs, should not be caught)
// - Reading property of undefined
// - Calling async function without await
// - Passing string where number expected
// - Logic errors

// DON'T catch programmer errors
try {
  const user = null;
  console.log(user.name); // TypeError - this is a bug!
} catch (err) {
  // This hides the bug!
}

// Let it crash and fix the bug
const user = await fetchUser(id); // Might return null
if (user) {
  console.log(user.name); // Safe
}
```

## Unhandled Errors

### Unhandled Promise Rejections

```javascript
// Global handler for unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise);
  console.error('Reason:', reason);

  // Exit application (recommended)
  process.exit(1);
});

// Always handle promises
Promise.reject(new Error('Oops!'))
  .catch(err => console.error(err));

// Or with async/await
async function example() {
  try {
    await riskyOperation();
  } catch (err) {
    console.error(err);
  }
}
```

### Uncaught Exceptions

```javascript
// Global handler for uncaught exceptions
process.on('uncaughtException', err => {
  console.error('Uncaught Exception:', err);

  // Perform cleanup
  cleanup();

  // Exit (application state is uncertain)
  process.exit(1);
});

// Better: Use domain or cluster to handle crashes
const cluster = require('cluster');

if (cluster.isMaster) {
  cluster.fork();

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
    cluster.fork(); // Restart worker
  });
} else {
  // Worker process
  require('./app');
}
```

## Error Logging

### Logging Best Practices

```javascript
// Simple logger
class Logger {
  static error(message, error) {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'ERROR',
      message,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    };
    console.error(JSON.stringify(log));
  }

  static info(message, metadata = {}) {
    const log = {
      timestamp: new Date().toISOString(),
      level: 'INFO',
      message,
      ...metadata
    };
    console.log(JSON.stringify(log));
  }
}

// Using Winston
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// Usage
logger.error('Database connection failed', {
  error: err.message,
  host: process.env.DB_HOST
});
```

## Best Practices

```javascript
// 1. Always handle errors
async function good() {
  try {
    await riskyOperation();
  } catch (err) {
    console.error('Error:', err);
  }
}

// 2. Don't swallow errors silently
try {
  await operation();
} catch (err) {
  // BAD: Silent failure
}

try {
  await operation();
} catch (err) {
  // GOOD: Log and handle
  logger.error('Operation failed:', err);
  throw err; // Or handle gracefully
}

// 3. Provide context with errors
throw new Error('User not found'); // BAD
throw new NotFoundError(`User ${userId} not found`); // GOOD

// 4. Use custom error classes
class ValidationError extends Error {
  constructor(field, message) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
  }
}

// 5. Clean up resources
async function processFile() {
  const file = await openFile();
  try {
    await processData(file);
  } finally {
    await closeFile(file); // Always clean up
  }
}

// 6. Fail fast
function processUser(user) {
  if (!user) {
    throw new Error('User is required');
  }
  if (!user.id) {
    throw new Error('User ID is required');
  }
  // Continue processing
}

// 7. Don't catch errors you can't handle
try {
  await operation();
} catch (err) {
  if (err.code === 'EXPECTED_ERROR') {
    handleError(err);
  } else {
    throw err; // Re-throw unknown errors
  }
}
```

## Common Interview Questions

### Q1: What's the difference between operational and programmer errors?

**Answer:**
- **Operational errors**: Expected runtime issues (network failure, invalid input, database down). Should be handled gracefully.
- **Programmer errors**: Bugs in the code (undefined variables, logic errors). Should crash the application and be fixed.

### Q2: How do you handle unhandled promise rejections?

```javascript
// Set up global handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  process.exit(1);
});

// Always catch promises
doAsync().catch(err => console.error(err));

// Or use async/await with try-catch
async function example() {
  try {
    await doAsync();
  } catch (err) {
    console.error(err);
  }
}
```

### Q3: How do you create custom error classes?

See the Custom Errors section above for comprehensive examples.

### Q4: How does Express error handling work?

Express error middleware has 4 parameters: `(err, req, res, next)`. Errors are passed via `next(err)` and caught by error middleware at the end of the middleware chain.

## Summary

**Core Concepts:**

1. **Error Types:**
   - ✅ Standard errors: SyntaxError, TypeError, ReferenceError
   - ✅ System errors: ENOENT, EACCES, etc.
   - ✅ Custom errors: Extend Error class
   - ✅ HTTP errors: 400, 401, 404, 500

2. **Handling Patterns:**
   - ✅ Synchronous: try/catch
   - ✅ Callbacks: error-first pattern
   - ✅ Promises: .catch() or try/catch
   - ✅ Async/Await: try/catch (cleanest)

3. **Operational vs Programmer:**
   - ✅ Operational: Handle gracefully (network, DB, validation)
   - ❌ Programmer: Let crash and fix (bugs, logic errors)
   - ⚠️ Don't catch programmer errors - they hide bugs

4. **Best Practices:**
   - ✅ Always handle promise rejections
   - ✅ Use error middleware in Express
   - ✅ Log with context (not just message)
   - ✅ Clean up in finally blocks
   - ✅ Global handlers as safety net

**Key Insights:**
> - Operational errors: handle gracefully. Programmer errors: crash and fix
> - async/await + try/catch is the cleanest error handling pattern
> - Unhandled promise rejections will crash Node.js (as they should)
> - Express error middleware must have 4 parameters: (err, req, res, next)

## Related Topics
- [Event Loop & Async Programming](./01-event-loop-async.md)
- [Express Error Handling](../Express/03-error-handling.md)
- [Testing Error Cases](../Testing/01-unit-testing.md)

## Resources
- [Error Handling in Node.js](https://nodejs.org/en/docs/guides/error-handling/)
- [Node.js Error Handling Best Practices](https://blog.risingstack.com/node-js-error-handling/)
