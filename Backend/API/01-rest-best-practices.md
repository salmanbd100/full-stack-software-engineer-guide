# REST API Best Practices

## Overview

REST (Representational State Transfer) is an architectural style for designing networked applications. RESTful APIs use HTTP requests to perform CRUD operations.

**Key Principle:** Resources are represented by URLs, and HTTP methods define actions on those resources.

## 🎯 HTTP Methods (CRUD)

### Standard HTTP Methods

| Method | Action | Idempotent | Safe | Body |
|--------|--------|------------|------|------|
| GET | Read/Retrieve | ✅ | ✅ | No |
| POST | Create | ❌ | ❌ | Yes |
| PUT | Update/Replace | ✅ | ❌ | Yes |
| PATCH | Partial Update | ❌ | ❌ | Yes |
| DELETE | Delete | ✅ | ❌ | Optional |

**Idempotent:** Multiple identical requests have the same effect as a single request
**Safe:** Does not modify resources

### Examples

```javascript
// GET - Retrieve resources
GET /api/users              // Get all users
GET /api/users/123          // Get specific user
GET /api/users/123/posts    // Get user's posts

// POST - Create new resource
POST /api/users
Body: { "name": "John", "email": "john@example.com" }

// PUT - Replace entire resource
PUT /api/users/123
Body: { "name": "John Doe", "email": "john@example.com", "age": 30 }

// PATCH - Update specific fields
PATCH /api/users/123
Body: { "email": "newemail@example.com" }

// DELETE - Remove resource
DELETE /api/users/123
```

---

## 📐 URL Design Best Practices

### 1. Use Nouns, Not Verbs

**Why:** HTTP methods already represent the action (GET, POST, PUT, DELETE). URLs should represent resources, not actions.

```
❌ BAD:
GET /getUsers
POST /createUser
PUT /updateUser/123
DELETE /deleteUser/123

✅ GOOD:
GET /users
POST /users
PUT /users/123
DELETE /users/123
```

### 2. Use Plural Nouns

**Why:** Consistency across all endpoints. `/users` works for both collection and individual items.

```
❌ BAD:
GET /user
GET /user/123

✅ GOOD:
GET /users          // Returns array of users
GET /users/123      // Returns single user
```

### 3. Nested Resources (Max 2-3 Levels)

**Best Practice:** Keep nesting shallow. Deep nesting is hard to maintain and understand.

```javascript
// ✅ GOOD: 2-level nesting
GET /users/123/posts          // User's posts
GET /users/123/posts/456      // Specific post by user
POST /users/123/posts         // Create post for user
GET /posts/456/comments       // Post's comments

// ⚠️ ACCEPTABLE: 3-level nesting (use sparingly)
GET /users/123/posts/456/comments

// ❌ BAD: Too deep
GET /users/123/posts/456/comments/789/replies
// Instead, use: GET /comments/789/replies
```

### 4. Keep URLs Lowercase with Hyphens

**Why:** URLs are case-sensitive on some systems. Hyphens are more readable than underscores.

```
❌ BAD:
/getUserProfile
/UserProfile
/user_profile

✅ GOOD:
/user-profile
/api/user-preferences
/search-results
```

### 5. Version Your API

**Why:** Allows backward compatibility while introducing breaking changes.

```
✅ GOOD:
/api/v1/users
/api/v2/users

// Or in header
GET /api/users
Header: Accept: application/vnd.api+json;version=1
```

### 6. Query Parameters for Filtering, Sorting, Pagination

**Filtering:**
```javascript
// Single filter
GET /users?role=admin

// Multiple filters (AND operation)
GET /users?role=admin&status=active&country=US

// Range filters
GET /products?price[gte]=100&price[lte]=500

// Array filters
GET /posts?tags=javascript,nodejs,express
```

**Sorting:**
```javascript
// Single field ascending
GET /users?sort=createdAt

// Single field descending
GET /users?sort=-createdAt

// Multiple fields
GET /users?sort=lastName,firstName
GET /users?sort=-createdAt,name
```

**Pagination:**
```javascript
// Offset-based
GET /users?page=2&limit=20
GET /users?offset=20&limit=20

// Cursor-based (recommended for large datasets)
GET /users?cursor=eyJpZCI6MTIzfQ&limit=20
```

**Combined:**
```javascript
GET /api/v1/users?role=admin&status=active&sort=-createdAt&page=1&limit=10
```

### 7. Use Sub-resources for Relationships

```javascript
// ✅ GOOD: Clear relationship
GET /users/123/orders
GET /authors/456/books
GET /courses/789/students

// ❌ BAD: Unclear relationship
GET /orders?userId=123
```

### 8. Handle Partial Responses

**Why:** Reduce payload size for clients that don't need all fields.

```javascript
// Request specific fields
GET /users/123?fields=id,name,email

// Exclude fields
GET /users/123?exclude=password,ssn
```

---

## 📊 HTTP Status Codes

### Success (2xx)

| Code | Meaning | Use Case |
|------|---------|----------|
| 200 | OK | GET, PUT, PATCH successful |
| 201 | Created | POST successful |
| 204 | No Content | DELETE successful |

### Client Errors (4xx)

| Code | Meaning | Use Case |
|------|---------|----------|
| 400 | Bad Request | Invalid input |
| 401 | Unauthorized | Authentication required |
| 403 | Forbidden | Not authorized |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate email |
| 422 | Unprocessable Entity | Validation errors |
| 429 | Too Many Requests | Rate limit exceeded |

### Server Errors (5xx)

| Code | Meaning | Use Case |
|------|---------|----------|
| 500 | Internal Server Error | Unhandled error |
| 503 | Service Unavailable | Temporary downtime |

---

## 📄 Pagination Patterns

### 1. Offset-Based Pagination (Simple)

**JavaScript (Express + Mongoose):**
```javascript
app.get('/users', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const offset = (page - 1) * limit;

  const users = await User.find()
    .skip(offset)
    .limit(limit);

  const total = await User.countDocuments();
  const totalPages = Math.ceil(total / limit);

  res.json({
    data: users,
    meta: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
    links: {
      self: `/api/users?page=${page}&limit=${limit}`,
      first: `/api/users?page=1&limit=${limit}`,
      last: `/api/users?page=${totalPages}&limit=${limit}`,
      next: page < totalPages ? `/api/users?page=${page + 1}&limit=${limit}` : null,
      prev: page > 1 ? `/api/users?page=${page - 1}&limit=${limit}` : null,
    },
  });
});
```

**Python (FastAPI + SQLAlchemy):**
```python
from fastapi import FastAPI, Query
from sqlalchemy.orm import Session

@app.get("/users")
async def get_users(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    offset = (page - 1) * limit

    # Query with pagination
    users = db.query(User).offset(offset).limit(limit).all()
    total = db.query(User).count()
    total_pages = (total + limit - 1) // limit

    return {
        "data": users,
        "meta": {
            "page": page,
            "limit": limit,
            "total": total,
            "totalPages": total_pages,
            "hasNextPage": page < total_pages,
            "hasPrevPage": page > 1
        },
        "links": {
            "self": f"/api/users?page={page}&limit={limit}",
            "first": f"/api/users?page=1&limit={limit}",
            "last": f"/api/users?page={total_pages}&limit={limit}",
            "next": f"/api/users?page={page + 1}&limit={limit}" if page < total_pages else None,
            "prev": f"/api/users?page={page - 1}&limit={limit}" if page > 1 else None
        }
    }
```

**Pros:**
- Simple to implement
- Easy to understand
- Jump to any page

**Cons:**
- Performance degrades with large offsets (OFFSET 100000 is slow)
- Inconsistent results if data changes between requests
- Not suitable for real-time data

**Time Complexity:** O(n) where n is the offset (skips records)

---

### 2. Cursor-Based Pagination (Recommended for Scale)

**JavaScript:**
```javascript
app.get('/posts', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const cursor = req.query.cursor; // Base64 encoded ID

  let query = Post.find().sort({ createdAt: -1, _id: -1 });

  if (cursor) {
    const decodedCursor = Buffer.from(cursor, 'base64').toString('utf-8');
    const [timestamp, id] = decodedCursor.split('_');

    // Find posts created before this cursor
    query = query.where('createdAt').lte(new Date(timestamp));
    query = query.where('_id').lt(id);
  }

  const posts = await query.limit(limit + 1).exec();
  const hasMore = posts.length > limit;

  if (hasMore) {
    posts.pop(); // Remove extra item
  }

  const nextCursor = hasMore
    ? Buffer.from(`${posts[posts.length - 1].createdAt.toISOString()}_${posts[posts.length - 1]._id}`).toString('base64')
    : null;

  res.json({
    data: posts,
    pageInfo: {
      hasNextPage: hasMore,
      endCursor: nextCursor,
    },
  });
});
```

**Python:**
```python
import base64
from datetime import datetime

@app.get("/posts")
async def get_posts(
    limit: int = Query(20, ge=1, le=100),
    cursor: str = None,
    db: Session = Depends(get_db)
):
    query = db.query(Post).order_by(Post.created_at.desc(), Post.id.desc())

    if cursor:
        # Decode cursor
        decoded = base64.b64decode(cursor).decode('utf-8')
        timestamp, post_id = decoded.split('_')

        # Filter posts created before cursor
        query = query.filter(
            (Post.created_at < datetime.fromisoformat(timestamp)) |
            ((Post.created_at == datetime.fromisoformat(timestamp)) & (Post.id < int(post_id)))
        )

    # Fetch one extra to check if there's more
    posts = query.limit(limit + 1).all()
    has_more = len(posts) > limit

    if has_more:
        posts = posts[:limit]

    # Generate next cursor
    next_cursor = None
    if has_more and posts:
        last_post = posts[-1]
        cursor_data = f"{last_post.created_at.isoformat()}_{last_post.id}"
        next_cursor = base64.b64encode(cursor_data.encode()).decode()

    return {
        "data": posts,
        "pageInfo": {
            "hasNextPage": has_more,
            "endCursor": next_cursor
        }
    }
```

**Pros:**
- Consistent results even if data changes
- Excellent performance at any "page"
- Works well with real-time data

**Cons:**
- Cannot jump to specific page
- More complex to implement
- Cursor must be opaque to clients

**Time Complexity:** O(log n) with proper indexing

---

### 3. Keyset Pagination (ID-based)

**JavaScript:**
```javascript
app.get('/products', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const lastId = req.query.lastId;

  const query = lastId
    ? Product.find({ _id: { $gt: lastId } })
    : Product.find();

  const products = await query
    .sort({ _id: 1 })
    .limit(limit + 1)
    .exec();

  const hasMore = products.length > limit;
  if (hasMore) products.pop();

  res.json({
    data: products,
    pageInfo: {
      hasNextPage: hasMore,
      lastId: products.length > 0 ? products[products.length - 1]._id : null,
    },
  });
});
```

**Pros:**
- Very fast (uses index)
- Simple implementation
- Consistent results

**Cons:**
- Only forward pagination
- Requires sequential ID

---

## 🔒 Security Best Practices

### 1. Authentication with JWT

**JavaScript (Express):**
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Login endpoint
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
    },
  });
});

// Authentication middleware
const authenticate = (req, res, next) => {
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
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Usage
app.get('/api/profile', authenticate, (req, res) => {
  res.json(req.user);
});
```

**Python (FastAPI):**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=24))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception

@app.post("/auth/login")
async def login(email: str, password: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user or not pwd_context.verify(password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"id": str(user.id), "email": user.email})
    return {"token": token, "user": {"id": user.id, "name": user.name}}

@app.get("/api/profile")
async def get_profile(current_user = Depends(get_current_user)):
    return current_user
```

---

### 2. Authorization (Role-Based Access Control)

**JavaScript:**
```javascript
// Authorization middleware
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Usage
app.get('/api/users', authenticate, authorize('admin'), async (req, res) => {
  const users = await User.find();
  res.json(users);
});

app.delete('/api/users/:id', authenticate, authorize('admin', 'moderator'), async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.status(204).send();
});
```

**Python:**
```python
from functools import wraps

def require_roles(*allowed_roles):
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, current_user = Depends(get_current_user), **kwargs):
            if current_user.get("role") not in allowed_roles:
                raise HTTPException(status_code=403, detail="Insufficient permissions")
            return await func(*args, current_user=current_user, **kwargs)
        return wrapper
    return decorator

@app.get("/api/users")
@require_roles("admin")
async def get_all_users(current_user = Depends(get_current_user)):
    return await User.find().to_list()
```

---

### 3. Input Validation

**JavaScript (Express + Joi):**
```javascript
const Joi = require('joi');

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(422).json({ errors });
    }

    next();
  };
};

// Schema
const createUserSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/).required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, and number'
    }),
  age: Joi.number().integer().min(18).max(120).optional(),
});

// Usage
app.post('/users', validate(createUserSchema), async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});
```

**Python (FastAPI + Pydantic):**
```python
from pydantic import BaseModel, EmailStr, Field, validator

class CreateUserRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(..., min_length=8)
    age: int = Field(None, ge=18, le=120)

    @validator('password')
    def validate_password(cls, v):
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.islower() for c in v):
            raise ValueError('Password must contain lowercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v

@app.post("/users", status_code=201)
async def create_user(user_data: CreateUserRequest, db: Session = Depends(get_db)):
    user = User(**user_data.dict())
    db.add(user)
    db.commit()
    return user
```

---

### 4. Prevent Common Vulnerabilities

**SQL Injection Prevention:**
```javascript
// ❌ VULNERABLE
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`;

// ✅ SAFE: Use parameterized queries
const userId = req.params.id;
const query = 'SELECT * FROM users WHERE id = ?';
db.query(query, [userId]);

// ✅ SAFE: Use ORM (Mongoose, Sequelize, Prisma)
const user = await User.findById(userId);
```

**XSS Prevention:**
```javascript
// ❌ VULNERABLE
res.send(`<h1>Welcome ${req.query.name}</h1>`);

// ✅ SAFE: Sanitize input
const sanitizeHtml = require('sanitize-html');
const cleanName = sanitizeHtml(req.query.name);
res.send(`<h1>Welcome ${cleanName}</h1>`);

// ✅ BETTER: Use JSON responses
res.json({ message: `Welcome ${req.query.name}` });
```

**NoSQL Injection Prevention:**
```javascript
// ❌ VULNERABLE
const user = await User.findOne({ email: req.body.email });

// If req.body.email = { $gt: "" }, this returns first user!

// ✅ SAFE: Validate input type
if (typeof req.body.email !== 'string') {
  return res.status(400).json({ error: 'Invalid email format' });
}

// ✅ SAFE: Use Joi/Pydantic validation
```

---

### 5. Rate Limiting & Security Headers

**JavaScript:**
```javascript
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

// Security headers
app.use(helmet());

// Sanitize NoSQL queries
app.use(mongoSanitize());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Stricter limits for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 login attempts per 15 minutes
  skipSuccessfulRequests: true,
});

app.use('/auth/login', authLimiter);
```

**Python:**
```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.get("/api/users")
@limiter.limit("100/15minutes")
async def get_users(request: Request):
    return await User.find().to_list()

@app.post("/auth/login")
@limiter.limit("5/15minutes")
async def login(request: Request, credentials: LoginRequest):
    # Login logic
    pass
```

---

## 🎤 Common Interview Questions

### Q1: What is the difference between PUT and PATCH?

**Answer:**

**PUT:**
- Replaces the entire resource
- Idempotent (multiple identical requests have same effect)
- Requires sending all fields
- Returns 200 OK or 204 No Content

```javascript
// PUT /users/123 - Must send ALL fields
PUT /users/123
{
  "name": "John Doe",
  "email": "john@example.com",
  "age": 30,
  "phone": "123-456-7890"
}
```

**PATCH:**
- Updates specific fields only
- May not be idempotent (depends on implementation)
- Send only fields to update
- Returns 200 OK with updated resource

```javascript
// PATCH /users/123 - Send ONLY changed fields
PATCH /users/123
{
  "email": "newemail@example.com"
}
```

**Interview Tip:** Mention that PATCH is more efficient for partial updates, but PUT is simpler and more predictable due to idempotency.

---

### Q2: How would you design a RESTful API for a blog with users, posts, and comments?

**Answer:**

```javascript
// Users
GET    /api/v1/users              // List all users
GET    /api/v1/users/:id          // Get specific user
POST   /api/v1/users              // Create user
PUT    /api/v1/users/:id          // Update user
DELETE /api/v1/users/:id          // Delete user

// Posts
GET    /api/v1/posts              // List all posts
GET    /api/v1/posts/:id          // Get specific post
POST   /api/v1/posts              // Create post
PUT    /api/v1/posts/:id          // Update post
DELETE /api/v1/posts/:id          // Delete post

// User's posts (relationship)
GET    /api/v1/users/:id/posts    // Get posts by user

// Comments
GET    /api/v1/posts/:id/comments       // Get comments for post
POST   /api/v1/posts/:id/comments       // Create comment on post
PUT    /api/v1/comments/:id             // Update comment
DELETE /api/v1/comments/:id             // Delete comment

// Complex queries
GET    /api/v1/posts?author=123&status=published&sort=-createdAt
GET    /api/v1/posts?tags=javascript,nodejs&page=1&limit=20
```

**Key Points:**
- Use nested routes for relationships (user's posts)
- Keep nesting max 2-3 levels deep
- Use query params for filtering, sorting, pagination
- Version the API (/v1/)

---

### Q3: How do you handle errors in a REST API?

**Answer:**

**1. Use Appropriate HTTP Status Codes:**
```javascript
200 OK              // Success
201 Created         // Resource created
204 No Content      // Success, no response body
400 Bad Request     // Invalid input
401 Unauthorized    // Authentication required
403 Forbidden       // Insufficient permissions
404 Not Found       // Resource doesn't exist
409 Conflict        // Duplicate resource
422 Unprocessable   // Validation errors
429 Too Many Requests // Rate limit exceeded
500 Internal Error  // Server error
503 Service Unavailable // Temporary downtime
```

**2. Consistent Error Response Format:**
```javascript
// Standard error response
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is already taken"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ],
    "timestamp": "2024-12-08T10:00:00Z",
    "path": "/api/users"
  }
}
```

**3. Global Error Handler:**
```javascript
// Express error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: Object.values(err.errors).map(e => ({
          field: e.path,
          message: e.message,
        })),
      },
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: 'Invalid authentication token',
      },
    });
  }

  // Default error
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'Something went wrong',
    },
  });
});
```

---

### Q4: Explain idempotency and which HTTP methods are idempotent.

**Answer:**

**Idempotent:** Multiple identical requests have the same effect as a single request.

**Idempotent Methods:**
- **GET:** Reading data doesn't change it (safe + idempotent)
- **PUT:** Replacing a resource multiple times results in the same state
- **DELETE:** Deleting same resource multiple times has same effect (first deletes, rest return 404 or 204)
- **HEAD, OPTIONS:** Safe operations

**Non-Idempotent Methods:**
- **POST:** Creating a resource multiple times creates multiple resources
- **PATCH:** May not be idempotent (depends on implementation)

**Example:**
```javascript
// Idempotent (PUT)
PUT /users/123 { "name": "John", "age": 30 }
// Calling this 10 times results in same state

// Non-idempotent (POST)
POST /users { "name": "John" }
// Calling this 10 times creates 10 users

// PATCH can be non-idempotent
PATCH /users/123 { "age": { "$inc": 1 } }
// Each call increments age by 1 - NOT idempotent

// PATCH can be idempotent
PATCH /users/123 { "email": "john@example.com" }
// Multiple calls set same email - idempotent
```

**Interview Tip:** Mention that idempotency is crucial for retry logic and handling network failures.

---

### Q5: How would you implement pagination for a large dataset?

**Answer:**

**Three approaches:**

**1. Offset-based (Simple, but slow for large offsets):**
```javascript
GET /posts?page=2&limit=20

// Implementation
const offset = (page - 1) * limit;
const posts = await Post.find().skip(offset).limit(limit);

// ⚠️ Problem: OFFSET 100000 scans 100000 rows - slow!
```

**2. Cursor-based (Recommended for scale):**
```javascript
GET /posts?cursor=eyJpZCI6MTIzfQ&limit=20

// Implementation
const decodedCursor = Buffer.from(cursor, 'base64').toString();
const posts = await Post.find({ _id: { $gt: decodedCursor } })
  .sort({ _id: 1 })
  .limit(limit);

// ✅ Fast: Uses index, no scanning
// ✅ Consistent: Handles real-time data changes
// ❌ Cannot jump to specific page
```

**3. Keyset pagination (Fast, but limited):**
```javascript
GET /posts?lastId=123&limit=20

// Implementation
const posts = await Post.find({ _id: { $gt: lastId } })
  .sort({ _id: 1 })
  .limit(limit);

// ✅ Very fast with indexed ID
// ❌ Only forward pagination
```

**Comparison:**

| Method | Jump to Page | Performance | Use Case |
|--------|--------------|-------------|----------|
| Offset | ✅ Yes | ❌ Slow (large offsets) | Small datasets, admin panels |
| Cursor | ❌ No | ✅ Fast | Infinite scroll, real-time feeds |
| Keyset | ❌ No | ✅ Very fast | Ordered sequential access |

**Interview Tip:** Mention that for APIs with infinite scroll (Twitter, Instagram), cursor-based is preferred. For admin panels with page numbers, offset-based is acceptable.

---

### Q6: What security best practices should you follow when building a REST API?

**Answer:**

**1. Authentication & Authorization:**
- Use JWT or OAuth 2.0
- Always validate tokens
- Implement role-based access control (RBAC)

**2. Input Validation:**
- Validate all input (body, params, query)
- Use schemas (Joi, Pydantic)
- Sanitize data to prevent injection

**3. Rate Limiting:**
```javascript
// Prevent brute force attacks
app.use('/auth/login', rateLimit({ max: 5, windowMs: 15 * 60 * 1000 }));

// Prevent API abuse
app.use('/api', rateLimit({ max: 100, windowMs: 15 * 60 * 1000 }));
```

**4. Security Headers:**
```javascript
app.use(helmet()); // Sets secure HTTP headers

// Specific headers:
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
// X-XSS-Protection: 1; mode=block
// Strict-Transport-Security: max-age=31536000
```

**5. HTTPS Only:**
- Always use HTTPS in production
- Redirect HTTP to HTTPS
- Use HSTS header

**6. CORS Configuration:**
```javascript
// ❌ BAD: Allow all origins
app.use(cors({ origin: '*' }));

// ✅ GOOD: Whitelist specific origins
app.use(cors({
  origin: ['https://myapp.com', 'https://admin.myapp.com'],
  credentials: true,
}));
```

**7. Don't Expose Sensitive Data:**
```javascript
// ❌ BAD: Return password hash
const user = await User.findById(id);
res.json(user);

// ✅ GOOD: Exclude sensitive fields
const user = await User.findById(id).select('-password -__v');
res.json(user);
```

**8. SQL/NoSQL Injection Prevention:**
- Use ORMs or parameterized queries
- Validate input types
- Use mongo-sanitize for NoSQL

---

## ✅ Key Takeaways

1. **Use HTTP methods correctly**: GET (read), POST (create), PUT (replace), PATCH (update), DELETE (delete)
2. **Design URLs with nouns, not verbs**: `/users`, not `/getUsers`
3. **Return appropriate status codes**: 200, 201, 204, 400, 401, 403, 404, 422, 500
4. **Implement pagination**: Cursor-based for scale, offset-based for simplicity
5. **Security first**: Validate input, rate limit, use HTTPS, implement authentication
6. **Version your API**: `/api/v1/` for backward compatibility
7. **Idempotency matters**: PUT and DELETE should be idempotent
8. **Consistent error responses**: Standard format with error codes and details

---

[← Back to Backend](../README.md) | [Next: GraphQL →](./02-graphql.md)
