# REST API Design

## Overview

REST (Representational State Transfer) is an architectural style for designing networked applications. Understanding REST principles and best practices is essential for backend developers and is frequently tested in interviews.

## REST Principles

### 1. Client-Server Architecture
- Separation of concerns
- Client and server evolve independently
- Scalability through stateless communication

### 2. Stateless
- Each request contains all information needed
- No session state stored on server
- Improves scalability and reliability

### 3. Cacheable
- Responses must define themselves as cacheable or not
- Improves performance and scalability

### 4. Uniform Interface
- Resource identification through URIs
- Resource manipulation through representations
- Self-descriptive messages
- HATEOAS (Hypermedia As The Engine Of Application State)

### 5. Layered System
- Client cannot tell if connected directly to server
- Allows for load balancers, proxies, caching

### 6. Code on Demand (Optional)
- Server can extend client functionality
- JavaScript execution in browser

## HTTP Methods

### CRUD Operations

| HTTP Method | CRUD Operation | Idempotent | Safe |
|-------------|---------------|------------|------|
| GET         | Read          | Yes        | Yes  |
| POST        | Create        | No         | No   |
| PUT         | Update/Replace| Yes        | No   |
| PATCH       | Partial Update| No         | No   |
| DELETE      | Delete        | Yes        | No   |

### Method Usage

```javascript
const express = require('express');
const router = express.Router();

// GET - Retrieve resources
router.get('/users', async (req, res) => {
  const users = await User.find();
  res.json(users);
});

router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// POST - Create resource
router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// PUT - Replace entire resource
router.put('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, overwrite: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// PATCH - Partial update
router.patch('/users/:id', async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { new: true }
  );
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// DELETE - Remove resource
router.delete('/users/:id', async (req, res) => {
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.sendStatus(204);
});

module.exports = router;
```

## Resource Naming

### Best Practices

**✅ Use Nouns, Not Verbs**
```
Good:
GET    /users
GET    /users/123
POST   /users
PUT    /users/123
DELETE /users/123

Bad:
GET    /getUsers
POST   /createUser
POST   /deleteUser/123
```

**✅ Use Plural Nouns**
```
Good:
/users
/posts
/comments

Bad:
/user
/post
/comment
```

**✅ Use Hierarchical Structure**
```
Good:
GET /users/123/posts
GET /users/123/posts/456
GET /posts/456/comments

Bad:
GET /userPosts/123
GET /getPostsForUser/123
```

**✅ Use Kebab-Case**
```
Good:
/blog-posts
/user-profiles
/order-items

Bad:
/blogPosts
/user_profiles
/OrderItems
```

### Common Patterns

```javascript
// Collection and single resource
GET    /users              // Get all users
GET    /users/123          // Get user 123

// Nested resources
GET    /users/123/posts    // Get posts by user 123
GET    /users/123/posts/456// Get post 456 by user 123

// Filtering
GET    /users?role=admin   // Get admin users
GET    /posts?status=published&sort=date

// Pagination
GET    /users?page=2&limit=20

// Searching
GET    /users?search=john

// Sorting
GET    /users?sort=name&order=asc
```

## HTTP Status Codes

### Success Codes (2xx)

```javascript
// 200 OK - Successful GET, PUT, PATCH
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.status(200).json(user);
});

// 201 Created - Successful POST
router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// 204 No Content - Successful DELETE or update without response
router.delete('/users/:id', async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.sendStatus(204);
});
```

### Client Error Codes (4xx)

```javascript
// 400 Bad Request - Invalid data
if (!email || !password) {
  return res.status(400).json({
    error: 'Email and password required'
  });
}

// 401 Unauthorized - Not authenticated
if (!token) {
  return res.status(401).json({
    error: 'Authentication required'
  });
}

// 403 Forbidden - Authenticated but not authorized
if (user.role !== 'admin') {
  return res.status(403).json({
    error: 'Admin access required'
  });
}

// 404 Not Found - Resource doesn't exist
const user = await User.findById(id);
if (!user) {
  return res.status(404).json({
    error: 'User not found'
  });
}

// 409 Conflict - Duplicate resource
const existingUser = await User.findOne({ email });
if (existingUser) {
  return res.status(409).json({
    error: 'Email already exists'
  });
}

// 422 Unprocessable Entity - Validation error
if (password.length < 6) {
  return res.status(422).json({
    error: 'Password must be at least 6 characters'
  });
}

// 429 Too Many Requests - Rate limit exceeded
return res.status(429).json({
  error: 'Too many requests, please try again later'
});
```

### Server Error Codes (5xx)

```javascript
// 500 Internal Server Error
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Internal server error'
  });
});

// 503 Service Unavailable
if (!database.isConnected()) {
  return res.status(503).json({
    error: 'Service temporarily unavailable'
  });
}
```

## Response Format

### Consistent Response Structure

```javascript
// Success responses
{
  "data": {
    "id": 1,
    "name": "John",
    "email": "john@example.com"
  },
  "message": "User created successfully"
}

// Error responses
{
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Email is required"
      }
    ]
  }
}

// Collection responses
{
  "data": [
    { "id": 1, "name": "John" },
    { "id": 2, "name": "Jane" }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

### Implementation

```javascript
// Success response helper
const sendSuccess = (res, data, message, statusCode = 200) => {
  res.status(statusCode).json({
    success: true,
    data,
    message
  });
};

// Error response helper
const sendError = (res, message, statusCode = 500, details = null) => {
  res.status(statusCode).json({
    success: false,
    error: {
      message,
      ...(details && { details })
    }
  });
};

// Usage
router.get('/users', async (req, res) => {
  const users = await User.find();
  sendSuccess(res, users, 'Users retrieved successfully');
});

router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  sendSuccess(res, user, 'User created successfully', 201);
});
```

## Pagination

### Query-Based Pagination

```javascript
router.get('/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const users = await User.find()
    .limit(limit)
    .skip(skip)
    .sort({ createdAt: -1 });

  const total = await User.countDocuments();

  res.json({
    data: users,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1
    }
  });
});
```

### Cursor-Based Pagination

```javascript
router.get('/posts', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const cursor = req.query.cursor;

  const query = cursor
    ? { _id: { $lt: cursor } }
    : {};

  const posts = await Post.find(query)
    .limit(limit + 1)
    .sort({ _id: -1 });

  const hasNextPage = posts.length > limit;
  const data = hasNextPage ? posts.slice(0, -1) : posts;

  res.json({
    data,
    pagination: {
      nextCursor: hasNextPage ? data[data.length - 1]._id : null,
      hasNextPage
    }
  });
});
```

## Filtering and Sorting

### Implementation

```javascript
router.get('/users', async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    status,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  // Build filter
  const filter = {};

  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }

  if (role) filter.role = role;
  if (status) filter.status = status;

  // Build sort
  const sortOptions = {};
  sortOptions[sort] = order === 'asc' ? 1 : -1;

  // Execute query
  const users = await User.find(filter)
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  res.json({
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    },
    filters: { search, role, status, sort, order }
  });
});
```

## Versioning

### URL Versioning

```javascript
// v1 routes
app.use('/api/v1/users', require('./routes/v1/users'));
app.use('/api/v1/posts', require('./routes/v1/posts'));

// v2 routes
app.use('/api/v2/users', require('./routes/v2/users'));
app.use('/api/v2/posts', require('./routes/v2/posts'));
```

### Header Versioning

```javascript
const versionMiddleware = (req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  next();
};

app.use(versionMiddleware);

app.get('/api/users', (req, res) => {
  if (req.apiVersion === 'v2') {
    // v2 logic
  } else {
    // v1 logic
  }
});
```

## HATEOAS

### Hypermedia Links

```javascript
router.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);

  res.json({
    data: user,
    links: {
      self: `/api/users/${user._id}`,
      posts: `/api/users/${user._id}/posts`,
      comments: `/api/users/${user._id}/comments`,
      update: {
        method: 'PUT',
        href: `/api/users/${user._id}`
      },
      delete: {
        method: 'DELETE',
        href: `/api/users/${user._id}`
      }
    }
  });
});
```

## Complete REST API Example

```javascript
// routes/users.js
const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { userSchema, updateUserSchema } = require('../schemas/user');

// List users with pagination, filtering, sorting
router.get('/', async (req, res) => {
  const {
    page = 1,
    limit = 20,
    search,
    role,
    sort = 'createdAt',
    order = 'desc'
  } = req.query;

  const filter = {};
  if (search) {
    filter.$or = [
      { name: new RegExp(search, 'i') },
      { email: new RegExp(search, 'i') }
    ];
  }
  if (role) filter.role = role;

  const sortOptions = { [sort]: order === 'asc' ? 1 : -1 };

  const users = await User.find(filter)
    .select('-password')
    .sort(sortOptions)
    .limit(limit * 1)
    .skip((page - 1) * limit);

  const total = await User.countDocuments(filter);

  res.json({
    data: users,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
});

// Get single user
router.get('/:id', async (req, res) => {
  const user = await User.findById(req.params.id).select('-password');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ data: user });
});

// Create user
router.post('/',
  validate(userSchema),
  async (req, res) => {
    const existingUser = await User.findOne({ email: req.body.email });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    const user = await User.create(req.body);
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      data: userResponse,
      message: 'User created successfully'
    });
  }
);

// Update user
router.put('/:id',
  authenticate,
  validate(updateUserSchema),
  async (req, res) => {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check authorization
    if (user._id.toString() !== req.user.userId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    Object.assign(user, req.body);
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      data: userResponse,
      message: 'User updated successfully'
    });
  }
);

// Delete user
router.delete('/:id',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.sendStatus(204);
  }
);

module.exports = router;
```

## Interview Questions

### Q1: What is REST and what are its principles?

**Answer:**
REST (Representational State Transfer) is an architectural style with these principles:
- Client-Server separation
- Stateless communication
- Cacheable responses
- Uniform interface
- Layered system
- Code on demand (optional)

### Q2: What is the difference between PUT and PATCH?

**Answer:**
- **PUT**: Replaces the entire resource
- **PATCH**: Partial update of specific fields

```javascript
// PUT - Replace entire resource
PUT /users/123
{ "name": "John", "email": "john@example.com", "age": 30 }

// PATCH - Update specific fields
PATCH /users/123
{ "name": "John" }
```

### Q3: What HTTP status code should you use for successful creation?

**Answer:**
201 Created - Indicates successful resource creation

```javascript
router.post('/users', async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});
```

### Q4: How do you implement pagination in REST APIs?

**Answer:**
Use query parameters for page and limit:

```javascript
GET /users?page=2&limit=20

res.json({
  data: users,
  pagination: {
    page: 2,
    limit: 20,
    total: 100,
    totalPages: 5
  }
});
```

### Q5: What is idempotency and which HTTP methods are idempotent?

**Answer:**
Idempotent means making the same request multiple times produces the same result.

Idempotent methods: GET, PUT, DELETE, HEAD, OPTIONS
Non-idempotent: POST, PATCH

## Best Practices

### ✅ Do's

1. **Use nouns for resources, not verbs**
2. **Use HTTP methods correctly**
3. **Return appropriate status codes**
4. **Version your API**
5. **Implement pagination for collections**
6. **Use consistent response format**
7. **Support filtering and sorting**
8. **Document your API**

### ❌ Don'ts

1. **Don't use verbs in URLs**
2. **Don't return 200 for errors**
3. **Don't nest resources too deeply**
4. **Don't forget authentication/authorization**
5. **Don't expose internal implementation**
6. **Don't return all data without pagination**

## Summary

**Core Concepts:**

1. **REST Principles:**
   - ✅ Resource-based (nouns, not verbs)
   - ✅ HTTP methods = actions (GET, POST, PUT, DELETE)
   - ✅ Stateless communication
   - ✅ Standard status codes

2. **URL Design:**
   - ✅ Use nouns: `/users`, `/posts`
   - ❌ Avoid verbs: `/getUsers`, `/createPost`
   - ✅ Hierarchical: `/users/123/posts`
   - ✅ Query params for filters: `?status=active&sort=date`

3. **HTTP Methods:**
   - **GET**: Retrieve (safe, idempotent)
   - **POST**: Create (not idempotent)
   - **PUT**: Replace (idempotent)
   - **PATCH**: Update (not idempotent)
   - **DELETE**: Remove (idempotent)

4. **Best Practices:**
   - ✅ Version your API (`/v1/users`)
   - ✅ Paginate collections (limit, offset)
   - ✅ Filter and sort with query params
   - ✅ Return consistent response format
   - ✅ Use proper status codes (200, 201, 400, 404, 500)

**Key Insights:**
> - RESTful design makes APIs predictable and easy to use
> - Idempotent methods (GET, PUT, DELETE) can be safely retried
> - Pagination is mandatory for scalability - never return all records
> - API versioning prevents breaking changes for existing clients

---

[← Previous: Authentication & Authorization](./04-auth.md) | [Next: Security →](./06-security.md)
