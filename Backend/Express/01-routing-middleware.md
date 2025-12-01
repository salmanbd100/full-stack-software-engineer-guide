# Routing & Middleware

## Overview

Routing and middleware are the core concepts of Express.js. Understanding how they work together is fundamental to building web applications and RESTful APIs. This is one of the most important topics in Express.js interviews.

## Routing

### What is Routing?

Routing refers to determining how an application responds to a client request to a particular endpoint (URI/path) and HTTP method (GET, POST, etc.).

### Basic Routing

```javascript
const express = require('express');
const app = express();

// Basic route
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// POST request
app.post('/users', (req, res) => {
  res.send('Create a new user');
});

// PUT request
app.put('/users/:id', (req, res) => {
  res.send(`Update user ${req.params.id}`);
});

// DELETE request
app.delete('/users/:id', (req, res) => {
  res.send(`Delete user ${req.params.id}`);
});

app.listen(3000);
```

### Route Parameters

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.send(`User ID: ${userId}`);
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.send(`User ${userId}, Post ${postId}`);
});

// Optional parameters with regex
app.get('/users/:id(\\d+)', (req, res) => {
  // Only matches numeric IDs
  res.send(`User ID: ${req.params.id}`);
});
```

### Query Parameters

```javascript
// URL: /search?q=javascript&page=2
app.get('/search', (req, res) => {
  const { q, page = 1 } = req.query;
  res.json({
    query: q,
    page: parseInt(page),
    results: []
  });
});
```

### Route Methods Chaining

```javascript
app.route('/users/:id')
  .get((req, res) => {
    res.send('Get user');
  })
  .put((req, res) => {
    res.send('Update user');
  })
  .delete((req, res) => {
    res.send('Delete user');
  });
```

## Middleware

### What is Middleware?

Middleware functions are functions that have access to the request object (req), response object (res), and the next middleware function in the application's request-response cycle.

### Middleware Function Structure

```javascript
function middleware(req, res, next) {
  // Do something
  console.log('Time:', Date.now());

  // Call next() to pass control to the next middleware
  next();
}

app.use(middleware);
```

### Types of Middleware

**1. Application-level Middleware**

```javascript
// Executed for every request
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Executed for specific path
app.use('/api', (req, res, next) => {
  console.log('API request');
  next();
});
```

**2. Router-level Middleware**

```javascript
const router = express.Router();

router.use((req, res, next) => {
  console.log('Router middleware');
  next();
});

router.get('/users', (req, res) => {
  res.send('Users list');
});

app.use('/api', router);
```

**3. Built-in Middleware**

```javascript
// Parse JSON bodies
app.use(express.json());

// Parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));
```

**4. Third-party Middleware**

```javascript
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');

// HTTP request logger
app.use(morgan('combined'));

// Enable CORS
app.use(cors());

// Security headers
app.use(helmet());
```

**5. Error-handling Middleware**

```javascript
// Must have 4 parameters
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message,
      status: 500
    }
  });
});
```

### Middleware Execution Order

```javascript
const express = require('express');
const app = express();

// 1. First middleware
app.use((req, res, next) => {
  console.log('1. Global middleware');
  next();
});

// 2. Path-specific middleware
app.use('/api', (req, res, next) => {
  console.log('2. API middleware');
  next();
});

// 3. Route handler
app.get('/api/users', (req, res) => {
  console.log('3. Route handler');
  res.send('Users');
});

// 4. This won't execute if response is sent
app.use((req, res, next) => {
  console.log('4. This won\'t run');
  next();
});
```

## Express Router

### Creating Modular Routes

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();

// Middleware specific to this router
router.use((req, res, next) => {
  console.log('User routes accessed at:', Date.now());
  next();
});

// Define routes
router.get('/', (req, res) => {
  res.json({ message: 'Get all users' });
});

router.get('/:id', (req, res) => {
  res.json({ message: `Get user ${req.params.id}` });
});

router.post('/', (req, res) => {
  res.json({ message: 'Create user' });
});

router.put('/:id', (req, res) => {
  res.json({ message: `Update user ${req.params.id}` });
});

router.delete('/:id', (req, res) => {
  res.json({ message: `Delete user ${req.params.id}` });
});

module.exports = router;
```

```javascript
// app.js
const express = require('express');
const app = express();
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

app.listen(3000);
```

### Nested Routers

```javascript
// routes/api.js
const express = require('express');
const router = express.Router();
const userRoutes = require('./users');
const postRoutes = require('./posts');

router.use('/users', userRoutes);
router.use('/posts', postRoutes);

module.exports = router;
```

```javascript
// app.js
const apiRoutes = require('./routes/api');
app.use('/api/v1', apiRoutes);

// Access: /api/v1/users, /api/v1/posts
```

## Advanced Middleware Patterns

### 1. Request Timing Middleware

```javascript
app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.url} - ${duration}ms`);
  });

  next();
});
```

### 2. Authentication Middleware

```javascript
function authenticate(req, res, next) {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Use in routes
app.get('/api/protected', authenticate, (req, res) => {
  res.json({ message: 'Protected data', user: req.user });
});
```

### 3. Validation Middleware

```javascript
function validateUser(req, res, next) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      error: 'Email and password are required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      error: 'Password must be at least 6 characters'
    });
  }

  next();
}

app.post('/api/register', validateUser, (req, res) => {
  // Create user
});
```

### 4. Conditional Middleware

```javascript
function conditionalMiddleware(condition) {
  return (req, res, next) => {
    if (condition(req)) {
      // Do something
      console.log('Condition met');
    }
    next();
  };
}

app.use(conditionalMiddleware(req => req.method === 'POST'));
```

### 5. Async Middleware Wrapper

```javascript
// Wrapper to handle async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Use with async route handlers
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

## Route Organization Best Practices

### 1. Organized Structure

```
project/
├── routes/
│   ├── index.js        # Main router
│   ├── users.js        # User routes
│   ├── posts.js        # Post routes
│   └── auth.js         # Auth routes
├── middleware/
│   ├── auth.js         # Authentication middleware
│   ├── validate.js     # Validation middleware
│   └── error.js        # Error handling middleware
├── controllers/
│   ├── userController.js
│   └── postController.js
└── app.js
```

### 2. Controller Pattern

```javascript
// controllers/userController.js
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
};
```

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate } = require('../middleware/auth');

router.get('/', userController.getUsers);
router.post('/', authenticate, userController.createUser);

module.exports = router;
```

## Common Patterns

### 1. RESTful Route Organization

```javascript
const express = require('express');
const router = express.Router();

// Resource-based routing
router.get('/users', listUsers);           // GET /users
router.post('/users', createUser);         // POST /users
router.get('/users/:id', getUser);         // GET /users/:id
router.put('/users/:id', updateUser);      // PUT /users/:id
router.delete('/users/:id', deleteUser);   // DELETE /users/:id

// Nested resources
router.get('/users/:userId/posts', getUserPosts);
router.post('/users/:userId/posts', createUserPost);
```

### 2. Versioned APIs

```javascript
// Version 1
const v1Router = require('./routes/v1');
app.use('/api/v1', v1Router);

// Version 2
const v2Router = require('./routes/v2');
app.use('/api/v2', v2Router);
```

### 3. Middleware Stack

```javascript
app.post(
  '/api/users',
  authenticate,           // Check authentication
  authorize('admin'),     // Check authorization
  validate(userSchema),   // Validate request body
  rateLimit,             // Rate limiting
  createUser             // Controller
);
```

## Interview Questions

### Q1: What is the difference between app.use() and app.get()?

**Answer:**
- `app.use()` is for middleware and runs for all HTTP methods
- `app.get()` is for route handlers and runs only for GET requests
- `app.use()` can match path prefixes, while `app.get()` requires exact path match

```javascript
app.use('/api', middleware);  // Matches /api, /api/users, /api/posts
app.get('/api', handler);     // Only matches /api exactly
```

### Q2: What happens if you don't call next() in middleware?

**Answer:**
The request-response cycle stops, and subsequent middleware/routes won't execute. The request will hang unless you send a response.

```javascript
app.use((req, res, next) => {
  console.log('Middleware 1');
  // Forgot to call next() - request hangs!
});

app.get('/', (req, res) => {
  // This won't execute
  res.send('Hello');
});
```

### Q3: How do you handle errors in Express?

**Answer:**
Use error-handling middleware with 4 parameters:

```javascript
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message
    }
  });
});
```

### Q4: What is the difference between req.params and req.query?

**Answer:**
- `req.params` contains route parameters from the URL path
- `req.query` contains query string parameters

```javascript
// URL: /users/123?page=2&limit=10
app.get('/users/:id', (req, res) => {
  console.log(req.params);  // { id: '123' }
  console.log(req.query);   // { page: '2', limit: '10' }
});
```

### Q5: How do you create a 404 handler in Express?

**Answer:**
Place it after all other routes:

```javascript
// All routes above...

// 404 handler (must be last)
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found'
  });
});

// Error handler (must be after 404 handler)
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});
```

## Best Practices

### ✅ Do's

1. **Use Router for modularity**
```javascript
// Good: Organized routes
const userRouter = require('./routes/users');
app.use('/api/users', userRouter);
```

2. **Always call next() or send response**
```javascript
app.use((req, res, next) => {
  doSomething();
  next(); // Always call next or send response
});
```

3. **Use async error wrapper**
```javascript
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

4. **Separate concerns**
```javascript
// Controllers handle business logic
// Middleware handles cross-cutting concerns
// Routes define endpoints
```

### ❌ Don'ts

1. **Don't forget to call next()**
```javascript
// Bad: Request hangs
app.use((req, res, next) => {
  console.log('Log');
  // Forgot next()
});
```

2. **Don't send multiple responses**
```javascript
// Bad: Cannot set headers after they are sent
app.get('/', (req, res) => {
  res.send('First');
  res.send('Second'); // Error!
});
```

3. **Don't use try-catch without async wrapper**
```javascript
// Bad: Unhandled promise rejection
app.get('/users', async (req, res) => {
  const users = await User.find(); // Error not caught
  res.json(users);
});

// Good: Use wrapper or try-catch
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

## Summary

- **Routing** defines how your application responds to client requests
- **Middleware** functions have access to req, res, and next
- **Router** enables modular, mountable route handlers
- **Order matters** - middleware executes in the order it's defined
- **Always call next()** or send a response to avoid hanging requests
- **Error handlers** must have 4 parameters

## Key Takeaways

1. Middleware is the backbone of Express applications
2. Use Router for organizing routes into modules
3. Route parameters (`req.params`) vs query parameters (`req.query`)
4. Error handling middleware has 4 parameters
5. Order of middleware registration matters
6. Controller pattern separates business logic from routes

---

[← Back to Backend](../README.md) | [Next: Request & Response →](./02-request-response.md)
