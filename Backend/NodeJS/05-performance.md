# Performance Optimization

## Overview

Optimizing Node.js applications is essential for handling high traffic, reducing latency, and minimizing resource usage. This guide covers profiling, monitoring, and optimization techniques.

## Profiling & Monitoring

### Built-in Profiler

```javascript
// Start with --prof flag
// node --prof app.js

// Generate readable output
// node --prof-process isolate-0xnnnnnnnnnnnn-v8.log > processed.txt

// Inspect the output for hot functions

// Using inspector
// node --inspect app.js
// Open chrome://inspect in Chrome
```

### Performance Hooks

```javascript
const { performance, PerformanceObserver } = require('perf_hooks');

// Mark specific points
performance.mark('start-query');
await database.query('SELECT * FROM users');
performance.mark('end-query');

// Measure duration
performance.measure('query-duration', 'start-query', 'end-query');

// Observe measurements
const obs = new PerformanceObserver((items) => {
  items.getEntries().forEach((entry) => {
    console.log(`${entry.name}: ${entry.duration}ms`);
  });
});
obs.observe({ entryTypes: ['measure'] });

// Event Loop monitoring
setInterval(() => {
  const utilization = performance.eventLoopUtilization();
  console.log('Event loop utilization:', utilization.utilization);

  if (utilization.utilization > 0.9) {
    console.warn('High event loop utilization!');
  }
}, 5000);
```

### Memory Profiling

```javascript
// Check memory usage
console.log(process.memoryUsage());
/* Output:
{
  rss: 24576000,        // Resident Set Size
  heapTotal: 6537216,   // V8 heap size
  heapUsed: 4392568,    // Used heap
  external: 1025880,    // C++ objects
  arrayBuffers: 17382   // ArrayBuffer/SharedArrayBuffer
}
*/

// Take heap snapshot
const v8 = require('v8');
const fs = require('fs');

function takeHeapSnapshot() {
  const snapshot = v8.writeHeapSnapshot();
  console.log('Heap snapshot written to', snapshot);
}

// Memory leak detection
const memwatch = require('@airbnb/node-memwatch');

memwatch.on('leak', (info) => {
  console.error('Memory leak detected:', info);
});

memwatch.on('stats', (stats) => {
  console.log('GC stats:', stats);
});
```

## CPU Optimization

### Avoid Blocking the Event Loop

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

// GOOD: Use worker threads
const { Worker } = require('worker_threads');

app.get('/fib/:n', (req, res) => {
  const worker = new Worker('./fibonacci-worker.js', {
    workerData: parseInt(req.params.n)
  });

  worker.on('message', (result) => {
    res.json({ result });
  });

  worker.on('error', (err) => {
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

// GOOD: Break work into chunks
async function processLargeArray(array) {
  const chunkSize = 1000;

  for (let i = 0; i < array.length; i += chunkSize) {
    const chunk = array.slice(i, i + chunkSize);
    await processChunk(chunk);

    // Give event loop a chance
    await new Promise(resolve => setImmediate(resolve));
  }
}
```

### Caching & Memoization

```javascript
// Simple memoization
function memoize(fn) {
  const cache = new Map();

  return function(...args) {
    const key = JSON.stringify(args);

    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const expensiveOperation = memoize((n) => {
  // Expensive calculation
  return n * n;
});

// LRU Cache
class LRUCache {
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  get(key) {
    if (!this.cache.has(key)) return null;

    const value = this.cache.get(key);
    // Move to end (most recent)
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      // Remove oldest (first item)
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, value);
  }
}

// Application-level caching
const cache = new Map();
const CACHE_TTL = 60000; // 1 minute

async function getUserWithCache(userId) {
  const cacheKey = `user:${userId}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const user = await database.getUser(userId);

  cache.set(cacheKey, {
    data: user,
    timestamp: Date.now()
  });

  return user;
}
```

### Optimize Regular Expressions

```javascript
// BAD: Recreates regex on each call
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// GOOD: Reuse compiled regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  return EMAIL_REGEX.test(email);
}

// Avoid catastrophic backtracking
// BAD: Can cause ReDoS
const badRegex = /^(a+)+$/;

// GOOD: Linear time
const goodRegex = /^a+$/;
```

## Memory Optimization

### Avoid Memory Leaks

```javascript
// 1. Clear timers
class BadComponent {
  constructor() {
    setInterval(() => {
      this.doSomething();
    }, 1000); // LEAK: Never cleared
  }
}

class GoodComponent {
  constructor() {
    this.interval = setInterval(() => {
      this.doSomething();
    }, 1000);
  }

  destroy() {
    clearInterval(this.interval); // Clean up
  }
}

// 2. Remove event listeners
const events = require('events');
const emitter = new events.EventEmitter();

function badListener() {
  emitter.on('event', () => {}); // LEAK: Never removed
}

function goodListener() {
  const handler = () => {};
  emitter.on('event', handler);

  return () => {
    emitter.removeListener('event', handler); // Clean up
  };
}

// 3. Avoid global variables
// BAD
global.cache = new Map(); // LEAK: Never cleared

// GOOD
class CacheManager {
  constructor() {
    this.cache = new Map();
  }

  clear() {
    this.cache.clear();
  }
}

// 4. Close database connections
async function badQuery() {
  const connection = await pool.getConnection();
  const results = await connection.query('SELECT * FROM users');
  return results; // LEAK: Connection not returned
}

async function goodQuery() {
  const connection = await pool.getConnection();
  try {
    const results = await connection.query('SELECT * FROM users');
    return results;
  } finally {
    connection.release(); // Always release
  }
}
```

### Efficient Data Structures

```javascript
// Use appropriate data structures
// Array: Ordered list, fast iteration
// Set: Unique values, fast lookup
// Map: Key-value pairs, fast lookup

// BAD: Array for lookups
const userIds = [1, 2, 3, 4, 5, ...]; // 10,000 items
if (userIds.includes(targetId)) {} // O(n)

// GOOD: Set for lookups
const userIds = new Set([1, 2, 3, 4, 5, ...]); // 10,000 items
if (userIds.has(targetId)) {} // O(1)

// BAD: Object for counting
const count = {};
array.forEach(item => {
  count[item] = (count[item] || 0) + 1;
});

// GOOD: Map for counting
const count = new Map();
array.forEach(item => {
  count.set(item, (count.get(item) || 0) + 1);
});

// Buffer pooling
const { Buffer } = require('buffer');

class BufferPool {
  constructor(bufferSize, poolSize) {
    this.bufferSize = bufferSize;
    this.pool = [];

    for (let i = 0; i < poolSize; i++) {
      this.pool.push(Buffer.allocUnsafe(bufferSize));
    }
  }

  acquire() {
    return this.pool.pop() || Buffer.allocUnsafe(this.bufferSize);
  }

  release(buffer) {
    if (this.pool.length < 100) {
      this.pool.push(buffer);
    }
  }
}
```

## Database Optimization

### Connection Pooling

```javascript
const mysql = require('mysql2/promise');

// Without pooling (BAD)
async function badQuery() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'mydb'
  }); // New connection each time!

  const results = await connection.query('SELECT * FROM users');
  await connection.end();
  return results;
}

// With pooling (GOOD)
const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  database: 'mydb',
  connectionLimit: 10, // Max concurrent connections
  waitForConnections: true,
  queueLimit: 0
});

async function goodQuery() {
  const connection = await pool.getConnection();
  try {
    const results = await connection.query('SELECT * FROM users');
    return results;
  } finally {
    connection.release();
  }
}
```

### Query Optimization

```javascript
// BAD: N+1 query problem
async function getUsersWithPosts() {
  const users = await User.find();

  for (const user of users) {
    user.posts = await Post.find({ userId: user.id }); // N queries!
  }

  return users;
}

// GOOD: Single query with JOIN
async function getUsersWithPosts() {
  return await User.find()
    .populate('posts'); // Or use SQL JOIN
}

// BAD: Fetching unnecessary data
const users = await User.find().select('*'); // Gets all columns

// GOOD: Select only needed fields
const users = await User.find().select('id name email');

// BAD: No pagination
const users = await User.find(); // Could return millions!

// GOOD: Paginate results
const users = await User.find()
  .limit(20)
  .skip(page * 20);

// Use indexes
// CREATE INDEX idx_user_email ON users(email);
// CREATE INDEX idx_post_user_created ON posts(user_id, created_at DESC);
```

## Network Optimization

### Compression

```javascript
const express = require('express');
const compression = require('compression');

const app = express();

// Compress responses
app.use(compression({
  level: 6, // Compression level (0-9)
  threshold: 1024, // Only compress if > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Stream large responses
const fs = require('fs');

app.get('/large-file', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Encoding', 'gzip');

  fs.createReadStream('large-file.json')
    .pipe(zlib.createGzip())
    .pipe(res);
});
```

### HTTP/2 & Keep-Alive

```javascript
const http2 = require('http2');
const fs = require('fs');

// HTTP/2 server
const server = http2.createSecureServer({
  key: fs.readFileSync('server.key'),
  cert: fs.readFileSync('server.crt')
});

server.on('stream', (stream, headers) => {
  stream.respond({
    'content-type': 'text/html',
    ':status': 200
  });
  stream.end('<h1>Hello HTTP/2!</h1>');
});

// Keep-Alive for HTTP/1.1
const http = require('http');
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 30000,
  maxSockets: 50
});

const options = {
  hostname: 'api.example.com',
  port: 80,
  path: '/data',
  agent: keepAliveAgent
};
```

## Async Optimization

### Parallel vs Sequential

```javascript
// Sequential (slower)
async function sequential() {
  const user = await fetchUser();       // 100ms
  const posts = await fetchPosts();     // 100ms
  const comments = await fetchComments(); // 100ms
  // Total: 300ms
}

// Parallel (faster)
async function parallel() {
  const [user, posts, comments] = await Promise.all([
    fetchUser(),       // \
    fetchPosts(),      //  } All run in parallel
    fetchComments()    // /
  ]);
  // Total: ~100ms (slowest operation)
}

// Conditional parallel
async function conditional() {
  const user = await fetchUser(); // Need this first

  const [posts, comments] = await Promise.all([
    fetchPosts(user.id),      // Depends on user
    fetchComments(user.id)    // Depends on user
  ]);
}

// Limit concurrency
async function limitedConcurrency(items, limit) {
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
```

## V8 Optimization Tips

### Avoid Deoptimization

```javascript
// Keep functions monomorphic (same types)
// BAD: Polymorphic function
function add(a, b) {
  return a + b; // Sometimes numbers, sometimes strings
}

add(1, 2);       // Number addition
add('a', 'b');   // String concatenation - DEOPTIMIZED!

// GOOD: Monomorphic functions
function addNumbers(a, b) {
  return a + b; // Always numbers
}

function concatenateStrings(a, b) {
  return a + b; // Always strings
}

// Keep object shapes consistent
// BAD: Different shapes
const obj1 = { a: 1, b: 2 };
const obj2 = { b: 2, a: 1 }; // Different property order!

// GOOD: Same shape
const obj1 = { a: 1, b: 2 };
const obj2 = { a: 3, b: 4 };

// Don't delete properties
// BAD
const obj = { a: 1, b: 2 };
delete obj.b; // DEOPTIMIZES!

// GOOD
const obj = { a: 1, b: 2 };
obj.b = undefined; // Better

// Or use Map for dynamic properties
const map = new Map();
map.set('a', 1);
map.delete('a'); // OK with Map
```

## Benchmarking

```javascript
// Simple benchmark
console.time('operation');
for (let i = 0; i < 1000000; i++) {
  doOperation();
}
console.timeEnd('operation');

// More accurate benchmarking
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();

suite
  .add('Array#push', () => {
    const arr = [];
    arr.push(1);
  })
  .add('Array[length]', () => {
    const arr = [];
    arr[arr.length] = 1;
  })
  .on('cycle', (event) => {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('Fastest is ' + this.filter('fastest').map('name'));
  })
  .run({ async: true });
```

## Production Monitoring

```javascript
// Application metrics
const client = require('prom-client');

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code']
});

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    httpRequestDuration
      .labels(req.method, req.route?.path || req.path, res.statusCode)
      .observe(duration);
  });

  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  const health = {
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpu: process.cpuUsage()
  };

  res.json(health);
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', client.register.contentType);
  res.end(await client.register.metrics());
});
```

## Summary

**Key Takeaways:**
- Profile before optimizing - measure, don't guess
- Avoid blocking the event loop
- Use worker threads for CPU-intensive tasks
- Implement caching at multiple levels
- Use connection pooling for databases
- Optimize database queries (indexes, JOINs, pagination)
- Enable compression for responses
- Monitor memory usage to detect leaks
- Run operations in parallel when possible
- Keep V8 optimized (monomorphic functions, stable object shapes)

## Related Topics
- [Event Loop & Async Programming](./01-event-loop-async.md)
- [Streams & Buffers](./02-streams-buffers.md)
- [Clustering & Scalability](./08-clustering.md)

## Resources
- [Node.js Performance](https://nodejs.org/en/docs/guides/simple-profiling/)
- [V8 Optimization Killers](https://github.com/petkaantonov/bluebird/wiki/Optimization-killers)
- [Node.js Best Practices](https://github.com/goldbergyoni/nodebestpractices)
