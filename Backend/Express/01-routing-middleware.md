# Express Routing & Middleware

## Overview

**Routing and middleware are the core concepts of Express.js.** Understanding how they work together is fundamental to building web applications and RESTful APIs. Middleware functions form the backbone of Express, handling everything from parsing requests to authentication and error handling.

**Key Principle:** Express is essentially a series of middleware function calls. Each request flows through a pipeline of middleware until a response is sent.

**Request Flow:**
```
Request → Middleware 1 → Middleware 2 → Route Handler → Response
              ↓              ↓              ↓
           Logging      JSON Parser    Business Logic
```

**HTTP Methods Comparison:**

| Method | Purpose | Body | Idempotent | Safe | Use Case |
|--------|---------|------|------------|------|----------|
| **GET** | Read | ❌ No | ✅ Yes | ✅ Yes | Fetch data |
| **POST** | Create | ✅ Yes | ❌ No | ❌ No | Create resource |
| **PUT** | Replace | ✅ Yes | ✅ Yes | ❌ No | Full update |
| **PATCH** | Modify | ✅ Yes | ❌ No | ❌ No | Partial update |
| **DELETE** | Remove | ❌ No | ✅ Yes | ❌ No | Delete resource |

---

## 🛣️ Routing Fundamentals

### What is Routing?

Routing determines how an application responds to a client request to a particular endpoint (URI/path) and HTTP method (GET, POST, PUT, DELETE, etc.).

**Route Definition Structure:**
```javascript
app.METHOD(PATH, HANDLER)
```

### Basic Routing

```javascript
const express = require('express');
const app = express();

// Middleware to parse JSON
app.use(express.json());

// GET - Read resource
app.get('/', (req, res) => {
  res.send('Hello World!');
});

// POST - Create resource
app.post('/users', (req, res) => {
  const user = req.body;
  res.status(201).json({
    message: 'User created',
    user
  });
});

// PUT - Update entire resource
app.put('/users/:id', (req, res) => {
  const { id } = req.params;
  const updatedUser = req.body;
  res.json({
    message: `User ${id} updated`,
    user: updatedUser
  });
});

// PATCH - Partial update
app.patch('/users/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  res.json({
    message: `User ${id} partially updated`,
    updates
  });
});

// DELETE - Remove resource
app.delete('/users/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `User ${id} deleted` });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

---

## 📍 Route Parameters

### URL Parameters (req.params)

```javascript
// Single parameter
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  res.json({ userId, message: `Fetching user ${userId}` });
});

// Multiple parameters
app.get('/users/:userId/posts/:postId', (req, res) => {
  const { userId, postId } = req.params;
  res.json({
    message: `User ${userId}'s post ${postId}`
  });
});

// Optional parameters
app.get('/users/:id?', (req, res) => {
  if (req.params.id) {
    res.json({ message: `User ${req.params.id}` });
  } else {
    res.json({ message: 'All users' });
  }
});
```

### Route Parameter Validation with Regex

```javascript
// Only numeric IDs
app.get('/users/:id(\\d+)', (req, res) => {
  res.json({ userId: req.params.id });
});

// UUID pattern
app.get('/products/:id([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})', (req, res) => {
  res.json({ productId: req.params.id });
});

// Alphanumeric only
app.get('/items/:code([a-zA-Z0-9]+)', (req, res) => {
  res.json({ itemCode: req.params.code });
});
```

### Query Parameters (req.query)

```javascript
// URL: /search?q=javascript&page=2&limit=10
app.get('/search', (req, res) => {
  const {
    q,
    page = 1,
    limit = 20,
    sort = 'createdAt'
  } = req.query;

  res.json({
    query: q,
    page: parseInt(page),
    limit: parseInt(limit),
    sort,
    results: []
  });
});

// Array query parameters
// URL: /filter?tags=javascript&tags=nodejs&tags=express
app.get('/filter', (req, res) => {
  // req.query.tags will be an array
  const tags = Array.isArray(req.query.tags)
    ? req.query.tags
    : [req.query.tags];

  res.json({ tags });
});
```

### Route Method Chaining

```javascript
// Same path, different methods
app.route('/users/:id')
  .get((req, res) => {
    res.json({ message: 'Get user' });
  })
  .put((req, res) => {
    res.json({ message: 'Update user' });
  })
  .delete((req, res) => {
    res.json({ message: 'Delete user' });
  });
```

### Route Matching Patterns

```javascript
// Wildcard matching
app.get('/files/*', (req, res) => {
  const filePath = req.params[0];
  res.json({ filePath });
});

// Multiple paths for same handler
app.get(['/about', '/about-us', '/company'], (req, res) => {
  res.render('about');
});

// Regex patterns
app.get(/.*fly$/, (req, res) => {
  // Matches: butterfly, dragonfly, etc.
  res.send('Pattern matched');
});
```

---

## ⚙️ Middleware Deep Dive

### What is Middleware?

**Middleware functions** have access to:
- **Request object (req)**: Contains HTTP request data
- **Response object (res)**: Used to send HTTP response
- **Next function (next)**: Passes control to next middleware

### Middleware Function Structure

```javascript
function myMiddleware(req, res, next) {
  // 1. Execute code before route handler
  console.log('Request received:', req.method, req.url);

  // 2. Modify request/response objects
  req.requestTime = Date.now();

  // 3. Call next() to continue to next middleware
  next();

  // 4. Code after next() executes after route handler
  console.log('Response sent');
}

app.use(myMiddleware);
```

---

## 📦 Types of Middleware

### 1. Application-Level Middleware

Bound to `app` object using `app.use()` or `app.METHOD()`.

```javascript
// Global middleware - runs for all routes
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Path-specific middleware
app.use('/api', (req, res, next) => {
  console.log('API endpoint accessed');
  req.apiVersion = 'v1';
  next();
});

// Method-specific middleware
app.use('/admin', (req, res, next) => {
  if (req.method === 'POST' || req.method === 'DELETE') {
    // Extra logging for write operations
    console.log('Write operation:', req.method, req.url);
  }
  next();
});
```

### 2. Router-Level Middleware

Works like application-level middleware but bound to `express.Router()`.

```javascript
const router = express.Router();

// Router-specific middleware
router.use((req, res, next) => {
  console.log('Router middleware:', req.url);
  next();
});

// Middleware for specific route
router.use('/users/:id', (req, res, next) => {
  console.log('User ID:', req.params.id);
  next();
});

router.get('/users', (req, res) => {
  res.json({ message: 'Users list' });
});

router.get('/users/:id', (req, res) => {
  res.json({ message: `User ${req.params.id}` });
});

app.use('/api', router);
```

### 3. Built-in Middleware

Express includes several built-in middleware functions.

```javascript
// Parse JSON request bodies
app.use(express.json({ limit: '10mb' }));

// Parse URL-encoded bodies (HTML forms)
app.use(express.urlencoded({
  extended: true,  // Use qs library for parsing
  limit: '10mb'
}));

// Serve static files
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// Serve static with options
app.use(express.static('public', {
  maxAge: '1d',  // Cache for 1 day
  dotfiles: 'deny',  // Don't serve dotfiles
  index: 'index.html'
}));
```

### 4. Third-Party Middleware

Popular middleware from the Express ecosystem.

```javascript
const morgan = require('morgan');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

// HTTP request logger
app.use(morgan('combined'));
// Or custom format
app.use(morgan(':method :url :status :response-time ms'));

// Enable CORS
app.use(cors({
  origin: 'https://example.com',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Security headers
app.use(helmet());

// Compress responses
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests per window
  message: 'Too many requests from this IP'
});
app.use('/api/', limiter);

// Cookie parser
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

### 5. Error-Handling Middleware

**Must have 4 parameters** to be recognized as error handler.

```javascript
// Basic error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: {
      message: err.message,
      status: 500
    }
  });
});

// Advanced error handler
app.use((err, req, res, next) => {
  // Log error
  console.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Determine error status
  const status = err.status || err.statusCode || 500;

  // Send appropriate response
  res.status(status).json({
    error: {
      message: process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : err.message,
      status,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});

// Multiple error handlers for different error types
// Validation errors
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors
    });
  }
  next(err);
});

// Authentication errors
app.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Authentication required'
    });
  }
  next(err);
});

// Catch-all error handler
app.use((err, req, res, next) => {
  res.status(500).json({ error: 'Something went wrong' });
});
```

---

## 🔄 Middleware Execution Flow

### Execution Order Example

```javascript
const express = require('express');
const app = express();

console.log('1. App initialization');

// First middleware - runs for all requests
app.use((req, res, next) => {
  console.log('2. Global middleware START');
  next();
  console.log('7. Global middleware END');
});

// Second middleware - path specific
app.use('/api', (req, res, next) => {
  console.log('3. API middleware START');
  next();
  console.log('6. API middleware END');
});

// Route handler
app.get('/api/users', (req, res) => {
  console.log('4. Route handler START');
  res.json({ message: 'Users' });
  console.log('5. Route handler END (response sent)');
});

// This won't execute if response is already sent
app.use((req, res, next) => {
  console.log('8. This won\'t log for /api/users');
  next();
});

/*
Request to /api/users logs:
1. App initialization
2. Global middleware START
3. API middleware START
4. Route handler START
5. Route handler END (response sent)
6. API middleware END
7. Global middleware END
*/
```

### Middleware Chain with Multiple Handlers

```javascript
// Multiple middleware functions in route
app.get('/profile',
  authenticate,        // 1. Check if user is logged in
  loadUserData,        // 2. Load user data from DB
  checkPermissions,    // 3. Verify user has permission
  (req, res) => {      // 4. Send response
    res.json(req.userData);
  }
);

// Middleware array
const authStack = [authenticate, authorize('admin'), validateRequest];

app.post('/admin/users', authStack, createUser);
```

### Conditional Middleware Execution

```javascript
// Skip middleware based on condition
function conditionalMiddleware(req, res, next) {
  if (req.path === '/public') {
    return next(); // Skip middleware logic
  }

  // Execute middleware logic
  authenticate(req, res, next);
}

app.use(conditionalMiddleware);

// Or using a factory function
function unless(path, middleware) {
  return (req, res, next) => {
    if (req.path === path) {
      return next();
    }
    middleware(req, res, next);
  };
}

app.use(unless('/login', authenticate));
```

---

## 📁 Express Router

### Creating Modular Route Files

**routes/users.js**
```javascript
const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Middleware for this router only
router.use((req, res, next) => {
  console.log('User routes - Time:', Date.now());
  next();
});

// Parameter middleware - runs when :id is present
router.param('id', async (req, res, next, id) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
});

// Routes
router.get('/', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', (req, res) => {
  // req.user is already loaded by param middleware
  res.json(req.user);
});

router.post('/', async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const updated = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    res.json(updated);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

**routes/posts.js**
```javascript
const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const posts = await Post.find()
      .limit(limit)
      .skip((page - 1) * limit)
      .populate('author', 'name email')
      .sort({ createdAt: -1 });

    const total = await Post.countDocuments();

    res.json({
      data: posts,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const post = await Post.create({
      ...req.body,
      author: req.user.userId
    });
    res.status(201).json(post);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
```

**app.js**
```javascript
const express = require('express');
const app = express();
const userRoutes = require('./routes/users');
const postRoutes = require('./routes/posts');

app.use(express.json());

// Mount routers
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  });
});

app.listen(3000);
```

### Nested Routers

```javascript
// routes/api/index.js
const express = require('express');
const router = express.Router();
const userRoutes = require('./users');
const postRoutes = require('./posts');
const commentRoutes = require('./comments');

// API-level middleware
router.use((req, res, next) => {
  res.header('X-API-Version', '1.0');
  next();
});

// Mount sub-routers
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);

module.exports = router;
```

```javascript
// app.js
const apiV1Routes = require('./routes/api');
const apiV2Routes = require('./routes/api/v2');

app.use('/api/v1', apiV1Routes);
app.use('/api/v2', apiV2Routes);

// Access:
// /api/v1/users
// /api/v1/posts
// /api/v2/users
```

---

## 🔐 Common Middleware Patterns

### 1. Request Logging Middleware

```javascript
function requestLogger(req, res, next) {
  const start = Date.now();

  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log({
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('user-agent'),
      ip: req.ip
    });
  });

  next();
}

app.use(requestLogger);
```

### 2. Authentication Middleware

```javascript
const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    res.status(401).json({ error: 'Invalid token' });
  }
}

// Optional authentication
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(); // No auth, continue anyway
  }

  authenticate(req, res, next);
}
```

### 3. Authorization Middleware

```javascript
// Role-based authorization
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden: Insufficient permissions'
      });
    }

    next();
  };
}

// Usage
app.delete('/users/:id',
  authenticate,
  authorize('admin'),
  deleteUser
);

app.post('/posts',
  authenticate,
  authorize('admin', 'editor', 'author'),
  createPost
);

// Resource ownership check
function authorizeOwner(req, res, next) {
  if (req.user.userId !== req.params.userId) {
    return res.status(403).json({
      error: 'You can only access your own resources'
    });
  }
  next();
}
```

### 4. Validation Middleware

```javascript
// Manual validation
function validateUser(req, res, next) {
  const { email, password, name } = req.body;
  const errors = [];

  if (!email || !email.match(/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/)) {
    errors.push('Valid email is required');
  }

  if (!password || password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!name || name.trim().length < 2) {
    errors.push('Name must be at least 2 characters');
  }

  if (errors.length > 0) {
    return res.status(400).json({ errors });
  }

  next();
}

// Using Joi for validation
const Joi = require('joi');

function validate(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      });
    }

    // Replace req.body with validated value
    req.body = value;
    next();
  };
}

// Define schema
const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().min(2).max(50).required(),
  age: Joi.number().integer().min(18).max(120).optional()
});

// Use validation
app.post('/users', validate(userSchema), createUser);
```

### 5. Async Error Handling Wrapper

```javascript
// Wrapper to catch async errors
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Usage
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));

app.post('/users', asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
}));

// Alternative using express-async-handler package
const asyncHandler = require('express-async-handler');

app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new Error('User not found');
  }
  res.json(user);
}));
```

### 6. Request Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// General rate limiter
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,  // Max 100 requests per window
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for authentication
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,  // Max 5 failed attempts
  skipSuccessfulRequests: true,  // Don't count successful requests
  message: 'Too many login attempts, please try again later'
});

app.use('/api/', generalLimiter);
app.post('/auth/login', authLimiter, login);

// Custom rate limiter with Redis
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const client = redis.createClient();

const limiter = rateLimit({
  store: new RedisStore({
    client: client,
    prefix: 'rate-limit:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});
```

### 7. CORS Middleware

```javascript
const cors = require('cors');

// Enable all CORS requests
app.use(cors());

// Specific origin
app.use(cors({
  origin: 'https://example.com',
  credentials: true  // Allow cookies
}));

// Multiple origins
const allowedOrigins = [
  'https://example.com',
  'https://app.example.com',
  'http://localhost:3000'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Route-specific CORS
app.get('/public-api', cors(), (req, res) => {
  res.json({ message: 'Public endpoint' });
});
```

### 8. Request ID Middleware

```javascript
const { v4: uuidv4 } = require('uuid');

function requestId(req, res, next) {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

app.use(requestId);

// Use in logging
app.use((req, res, next) => {
  console.log(`[${req.id}] ${req.method} ${req.url}`);
  next();
});
```

---

## 🏗️ Advanced Patterns

### Controller Pattern

**controllers/userController.js**
```javascript
const User = require('../models/User');

exports.getUsers = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const query = search ? { name: new RegExp(search, 'i') } : {};

    const users = await User.find(query)
      .select('-password')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    res.json({
      data: users,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const user = await User.create(req.body);
    res.status(201).json(user);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
```

**routes/users.js**
```javascript
const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { userSchema, updateUserSchema } = require('../schemas/user');

router.get('/',
  userController.getUsers
);

router.get('/:id',
  userController.getUserById
);

router.post('/',
  authenticate,
  authorize('admin'),
  validate(userSchema),
  userController.createUser
);

router.put('/:id',
  authenticate,
  validate(updateUserSchema),
  userController.updateUser
);

router.delete('/:id',
  authenticate,
  authorize('admin'),
  userController.deleteUser
);

module.exports = router;
```

### Service Layer Pattern

**services/userService.js**
```javascript
const User = require('../models/User');
const bcrypt = require('bcryptjs');

class UserService {
  async findAll(options = {}) {
    const { page = 1, limit = 20, search } = options;
    const query = search ? { name: new RegExp(search, 'i') } : {};

    const users = await User.find(query)
      .select('-password')
      .limit(limit)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(query);

    return {
      users,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / limit)
    };
  }

  async findById(id) {
    const user = await User.findById(id).select('-password');
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  async create(userData) {
    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const user = await User.create({
      ...userData,
      password: hashedPassword
    });

    // Return without password
    const { password, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword;
  }

  async update(id, updates) {
    const user = await User.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async delete(id) {
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }
}

module.exports = new UserService();
```

**controllers/userController.js** (using service)
```javascript
const userService = require('../services/userService');

exports.getUsers = async (req, res, next) => {
  try {
    const result = await userService.findAll(req.query);
    res.json({
      data: result.users,
      meta: {
        page: result.page,
        total: result.total,
        totalPages: result.totalPages
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getUserById = async (req, res, next) => {
  try {
    const user = await userService.findById(req.params.id);
    res.json(user);
  } catch (error) {
    if (error.message === 'User not found') {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
};

// ... other methods using service
```

---

## 📚 Interview Questions

### Q1: What is the difference between app.use() and app.get()?

**Answer:**

**app.use():**
- Used for middleware functions
- Runs for **all HTTP methods** (GET, POST, PUT, DELETE, etc.)
- Matches **path prefixes** (e.g., `/api` matches `/api`, `/api/users`, `/api/posts`)
- Can be used without a path (applies globally)

**app.get():**
- Used for route handlers
- Runs only for **GET requests**
- Requires **exact path match** (e.g., `/api` only matches `/api`)
- Must have a path specified

**Example:**
```javascript
// Middleware - runs for ALL methods on /api and sub-paths
app.use('/api', (req, res, next) => {
  console.log('API middleware');
  next();
});
// Matches: GET /api, POST /api/users, PUT /api/posts/123, etc.

// Route handler - only GET requests, exact path
app.get('/api', (req, res) => {
  res.send('API root');
});
// Only matches: GET /api (not /api/users or POST /api)
```

---

### Q2: What happens if you don't call next() in middleware?

**Answer:**

If you don't call `next()` and don't send a response, the **request will hang** indefinitely until it times out. The request-response cycle stops, and subsequent middleware or route handlers won't execute.

**Example:**
```javascript
app.use((req, res, next) => {
  console.log('Middleware 1');
  // Forgot to call next() or send response
  // Request hangs here!
});

app.get('/', (req, res) => {
  // This never executes
  res.send('Hello');
});
```

**Correct approaches:**
```javascript
// Option 1: Call next() to continue
app.use((req, res, next) => {
  console.log('Middleware 1');
  next();  // Continue to next middleware
});

// Option 2: Send response (ends cycle)
app.use((req, res, next) => {
  if (someCondition) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});
```

---

### Q3: How do you handle errors in Express middleware?

**Answer:**

Express has built-in error handling using **error-handling middleware** with 4 parameters: `(err, req, res, next)`.

**Synchronous errors:**
```javascript
app.get('/users/:id', (req, res) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    throw new Error('User not found');  // Caught by Express
  }
  res.json(user);
});
```

**Asynchronous errors:**
```javascript
// ❌ Won't be caught - promise rejection not handled
app.get('/users', async (req, res) => {
  const users = await User.find();  // If this throws, it's unhandled
  res.json(users);
});

// ✅ Manually catch and pass to next()
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);  // Pass error to error handler
  }
});

// ✅ Use async wrapper
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

**Error handler middleware:**
```javascript
// Must be defined AFTER all routes
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
    }
  });
});
```

---

### Q4: What is the difference between req.params, req.query, and req.body?

**Answer:**

**req.params** - URL path parameters (route parameters)
```javascript
// Route: /users/:id/posts/:postId
// URL: /users/123/posts/456
app.get('/users/:id/posts/:postId', (req, res) => {
  console.log(req.params);  // { id: '123', postId: '456' }
});
```

**req.query** - Query string parameters (after `?` in URL)
```javascript
// URL: /search?q=javascript&page=2&limit=10
app.get('/search', (req, res) => {
  console.log(req.query);
  // { q: 'javascript', page: '2', limit: '10' }
});
```

**req.body** - Request body data (from POST/PUT/PATCH requests)
```javascript
// Requires middleware: app.use(express.json())
// POST /users with body: { "name": "John", "email": "john@example.com" }
app.post('/users', (req, res) => {
  console.log(req.body);
  // { name: 'John', email: 'john@example.com' }
});
```

---

### Q5: How do you create a 404 handler in Express?

**Answer:**

Place a middleware **after all other routes** that catches any unmatched routes.

```javascript
// All routes above...
app.get('/users', getUsers);
app.get('/posts', getPosts);
// etc...

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.url
  });
});

// Error handler - must be after 404 handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    error: err.message
  });
});
```

**Order matters:**
1. Routes (app.get, app.post, etc.)
2. 404 handler (catches unmatched routes)
3. Error handler (catches errors from routes and middleware)

---

### Q6: Explain middleware execution order with an example.

**Answer:**

Middleware executes in the **order it's defined**, and each middleware can run code before and after calling `next()`.

```javascript
app.use((req, res, next) => {
  console.log('1. Before next()');
  next();
  console.log('4. After next()');
});

app.use((req, res, next) => {
  console.log('2. Before next()');
  next();
  console.log('3. After next()');
});

app.get('/', (req, res) => {
  console.log('Route handler');
  res.send('Done');
});

/* Output for GET /:
1. Before next()
2. Before next()
Route handler
3. After next()
4. After next()
*/
```

**Key points:**
- Middleware executes in order of definition
- `next()` passes control to the next middleware
- Code after `next()` executes in reverse order (on the way back)
- If response is sent, subsequent middleware won't execute

---

### Q7: What is router.param() and when would you use it?

**Answer:**

`router.param()` defines **parameter middleware** that runs automatically when a specific parameter is present in the route.

**Use case:** Preload resources, validate IDs, or add data to `req` object before route handler executes.

```javascript
const router = express.Router();

// Runs automatically for any route with :userId parameter
router.param('userId', async (req, res, next, userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    req.user = user;  // Attach to request
    next();
  } catch (error) {
    next(error);
  }
});

// Route handlers can access pre-loaded user
router.get('/users/:userId', (req, res) => {
  // req.user is already loaded
  res.json(req.user);
});

router.put('/users/:userId', (req, res) => {
  // req.user is already loaded
  req.user.name = req.body.name;
  req.user.save();
  res.json(req.user);
});
```

**Benefits:**
- DRY (Don't Repeat Yourself) - load resource once
- Consistent validation across routes
- Cleaner route handlers

---

### Q8: How do you handle async errors in Express?

**Answer:**

Express doesn't catch async errors automatically (before Express 5). You must **manually catch and pass to next()** or use a wrapper.

**Problem:**
```javascript
// ❌ Unhandled promise rejection
app.get('/users', async (req, res) => {
  const users = await User.find();  // If this fails, app crashes
  res.json(users);
});
```

**Solutions:**

**1. Manual try-catch:**
```javascript
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);  // Pass to error handler
  }
});
```

**2. Async wrapper (recommended):**
```javascript
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

**3. Use express-async-handler package:**
```javascript
const asyncHandler = require('express-async-handler');

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

**Note:** Express 5+ will automatically catch async errors.

---

## ✅ Best Practices

### Do's ✅

1. **Use Router for modular routes**
```javascript
// routes/users.js
const router = express.Router();
// Define routes
module.exports = router;

// app.js
app.use('/api/users', require('./routes/users'));
```

2. **Always call next() or send response**
```javascript
app.use((req, res, next) => {
  doSomething();
  next();  // Or res.send() if final middleware
});
```

3. **Use async error wrapper**
```javascript
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
```

4. **Separate concerns (MVC pattern)**
```
Routes → Controllers → Services → Models
```

5. **Define error handler last**
```javascript
// All routes first
app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);  // Last
```

6. **Use middleware for cross-cutting concerns**
```javascript
app.use(logging);
app.use(authentication);
app.use(validation);
```

7. **Validate all inputs**
```javascript
app.post('/users',
  validate(userSchema),  // Validate first
  createUser
);
```

### Don'ts ❌

1. **Don't forget to call next()**
```javascript
// ❌ Bad - request hangs
app.use((req, res, next) => {
  console.log('Log');
  // Missing next()!
});
```

2. **Don't send multiple responses**
```javascript
// ❌ Bad - Error: Can't set headers after they are sent
app.get('/', (req, res) => {
  res.send('First');
  res.send('Second');  // Error!
});
```

3. **Don't ignore async errors**
```javascript
// ❌ Bad - Unhandled rejection
app.get('/users', async (req, res) => {
  const users = await User.find();  // No error handling
  res.json(users);
});

// ✅ Good
app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

4. **Don't define error handler early**
```javascript
// ❌ Bad - Error handler too early
app.use(errorHandler);
app.use('/api', routes);  // Errors here won't be caught

// ✅ Good
app.use('/api', routes);
app.use(errorHandler);  // Last
```

5. **Don't mix business logic in routes**
```javascript
// ❌ Bad - Business logic in route
app.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  await sendEmail(user.email);
  await createProfile(user.id);
  res.json(user);
});

// ✅ Good - Business logic in controller/service
app.post('/users', userController.createUser);
```

---

## 🎯 Summary

**Core Concepts:**

1. **Routing:**
   - ✅ Maps HTTP methods + paths to handlers
   - ✅ Supports params, query strings, regex patterns
   - ✅ Route order matters (first match wins)
   - ✅ Use Express Router for modular routes

2. **Middleware:**
   - ✅ Functions with `(req, res, next)` signature
   - ✅ Execute in definition order (pipeline)
   - ✅ Must call `next()` or send response
   - ✅ Types: Application, Router, Error, Third-party

3. **Error Handling:**
   - ✅ Error middleware has 4 params: `(err, req, res, next)`
   - ✅ Must be defined last
   - ⚠️ Async errors need try-catch or wrapper
   - ✅ Centralized error handler for consistency

4. **Best Practices:**
   - ✅ Separate concerns (MVC pattern)
   - ✅ Use async wrapper for async routes
   - ✅ Validate inputs with middleware
   - ✅ Use Router for modularity
   - ❌ Don't send multiple responses
   - ❌ Don't forget to call next()

**Key Insights:**
> - Express is just middleware functions in sequence
> - Execution order is critical - middleware runs top to bottom
> - Error handlers must have exactly 4 parameters to be recognized
> - Async errors won't be caught without try-catch or wrapper function

---

[← Back to Backend](../README.md) | [Next: Request & Response →](./02-request-response.md)
