# API Versioning

## Overview

API versioning is the practice of managing changes to an API in a backward-compatible way, allowing multiple versions to coexist. This enables you to evolve your API without breaking existing clients.

**Key Principle:** Never break existing clients. When you need to make breaking changes, create a new version.

---

## 🎯 Why Version Your API?

### Breaking vs Non-Breaking Changes

**Non-Breaking Changes (No version bump needed):**
- Adding new endpoints
- Adding optional query parameters
- Adding new fields to responses (clients ignore unknown fields)
- Making required fields optional
- Adding new optional request body fields

**Breaking Changes (Require new version):**
- Removing or renaming endpoints
- Removing or renaming fields in responses
- Changing field types (string → number)
- Making optional fields required
- Changing authentication mechanisms
- Changing HTTP methods for endpoints
- Changing response status codes
- Modifying error response formats

---

## 📐 Versioning Strategies

### 1. URL Path Versioning (Most Common)

**Format:** `/api/v1/resource`, `/api/v2/resource`

**JavaScript (Express):**
```javascript
const express = require('express');
const app = express();

// Version 1
const v1Router = express.Router();

v1Router.get('/users', (req, res) => {
  res.json([
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ]);
});

v1Router.get('/users/:id', (req, res) => {
  res.json({ id: req.params.id, name: 'John' });
});

app.use('/api/v1', v1Router);

// Version 2 - Breaking change: added email field
const v2Router = express.Router();

v2Router.get('/users', (req, res) => {
  res.json([
    { id: 1, name: 'John', email: 'john@example.com' },
    { id: 2, name: 'Jane', email: 'jane@example.com' },
  ]);
});

v2Router.get('/users/:id', (req, res) => {
  res.json({
    id: req.params.id,
    name: 'John',
    email: 'john@example.com',
  });
});

app.use('/api/v2', v2Router);

app.listen(3000);
```

**Python (FastAPI):**
```python
from fastapi import FastAPI, APIRouter
from pydantic import BaseModel

app = FastAPI()

# Version 1 Models
class UserV1(BaseModel):
    id: int
    name: str

# Version 2 Models (with email)
class UserV2(BaseModel):
    id: int
    name: str
    email: str

# V1 Router
v1_router = APIRouter(prefix="/api/v1")

@v1_router.get("/users", response_model=list[UserV1])
async def get_users_v1():
    return [
        {"id": 1, "name": "John"},
        {"id": 2, "name": "Jane"}
    ]

@v1_router.get("/users/{user_id}", response_model=UserV1)
async def get_user_v1(user_id: int):
    return {"id": user_id, "name": "John"}

# V2 Router
v2_router = APIRouter(prefix="/api/v2")

@v2_router.get("/users", response_model=list[UserV2])
async def get_users_v2():
    return [
        {"id": 1, "name": "John", "email": "john@example.com"},
        {"id": 2, "name": "Jane", "email": "jane@example.com"}
    ]

@v2_router.get("/users/{user_id}", response_model=UserV2)
async def get_user_v2(user_id: int):
    return {"id": user_id, "name": "John", "email": "john@example.com"}

app.include_router(v1_router)
app.include_router(v2_router)
```

**Pros:**
- ✅ Very clear and explicit
- ✅ Easy to implement
- ✅ Visible in URL (easy to debug)
- ✅ Works with all HTTP methods
- ✅ Cacheable

**Cons:**
- ❌ Clutters URLs
- ❌ Version is coupled to all endpoints

**Use When:** Building public APIs, RESTful services, or when simplicity is key.

---

### 2. Header Versioning (API-Version Header)

**Format:** `API-Version: 1` or `API-Version: 2`

**JavaScript:**
```javascript
app.use('/api/users', (req, res) => {
  const version = req.headers['api-version'] || '1';

  if (version === '1') {
    // V1 logic
    return res.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ]);
  }

  if (version === '2') {
    // V2 logic
    return res.json([
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
    ]);
  }

  return res.status(400).json({ error: 'Unsupported API version' });
});

// Or using middleware
const versionMiddleware = (req, res, next) => {
  const version = req.headers['api-version'] || '1';
  req.apiVersion = version;
  next();
};

app.use(versionMiddleware);

app.get('/api/users', (req, res) => {
  if (req.apiVersion === '1') {
    return res.json(getUsersV1());
  }
  if (req.apiVersion === '2') {
    return res.json(getUsersV2());
  }
  res.status(400).json({ error: 'Unsupported version' });
});
```

**Python:**
```python
from fastapi import FastAPI, Header, HTTPException

app = FastAPI()

@app.get("/api/users")
async def get_users(api_version: str = Header("1", alias="API-Version")):
    if api_version == "1":
        return [
            {"id": 1, "name": "John"},
            {"id": 2, "name": "Jane"}
        ]
    elif api_version == "2":
        return [
            {"id": 1, "name": "John", "email": "john@example.com"},
            {"id": 2, "name": "Jane", "email": "jane@example.com"}
        ]
    else:
        raise HTTPException(status_code=400, detail="Unsupported API version")
```

**Pros:**
- ✅ Clean URLs
- ✅ Follows HTTP standards
- ✅ Version not tied to URL

**Cons:**
- ❌ Less discoverable
- ❌ Harder to test (need to set headers)
- ❌ Not visible in browser address bar

**Use When:** Building internal APIs or when URL cleanliness is important.

---

### 3. Accept Header Versioning (Content Negotiation)

**Format:** `Accept: application/vnd.myapi.v1+json`

**JavaScript:**
```javascript
app.get('/api/users', (req, res) => {
  const accept = req.headers['accept'] || '';

  if (accept.includes('vnd.myapi.v1+json')) {
    return res
      .set('Content-Type', 'application/vnd.myapi.v1+json')
      .json([
        { id: 1, name: 'John' },
        { id: 2, name: 'Jane' },
      ]);
  }

  if (accept.includes('vnd.myapi.v2+json')) {
    return res
      .set('Content-Type', 'application/vnd.myapi.v2+json')
      .json([
        { id: 1, name: 'John', email: 'john@example.com' },
        { id: 2, name: 'Jane', email: 'jane@example.com' },
      ]);
  }

  // Default to v1
  return res.json([
    { id: 1, name: 'John' },
    { id: 2, name: 'Jane' },
  ]);
});
```

**Python:**
```python
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse

app = FastAPI()

@app.get("/api/users")
async def get_users(request: Request):
    accept = request.headers.get("accept", "")

    if "vnd.myapi.v1+json" in accept:
        return JSONResponse(
            content=[
                {"id": 1, "name": "John"},
                {"id": 2, "name": "Jane"}
            ],
            headers={"Content-Type": "application/vnd.myapi.v1+json"}
        )

    if "vnd.myapi.v2+json" in accept:
        return JSONResponse(
            content=[
                {"id": 1, "name": "John", "email": "john@example.com"},
                {"id": 2, "name": "Jane", "email": "jane@example.com"}
            ],
            headers={"Content-Type": "application/vnd.myapi.v2+json"}
        )

    # Default to v1
    return [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]
```

**Pros:**
- ✅ RESTful (uses HTTP content negotiation)
- ✅ Clean URLs
- ✅ Follows REST principles strictly

**Cons:**
- ❌ Complex to implement
- ❌ Not intuitive for developers
- ❌ Hard to test

**Use When:** Building strict RESTful APIs or when following REST principles is critical.

---

### 4. Query Parameter Versioning

**Format:** `/api/users?version=1` or `/api/users?v=1`

**JavaScript:**
```javascript
app.get('/api/users', (req, res) => {
  const version = req.query.version || req.query.v || '1';

  if (version === '1') {
    return res.json([
      { id: 1, name: 'John' },
      { id: 2, name: 'Jane' },
    ]);
  }

  if (version === '2') {
    return res.json([
      { id: 1, name: 'John', email: 'john@example.com' },
      { id: 2, name: 'Jane', email: 'jane@example.com' },
    ]);
  }

  return res.status(400).json({ error: 'Unsupported version' });
});
```

**Python:**
```python
@app.get("/api/users")
async def get_users(version: str = "1", v: str = None):
    api_version = v or version

    if api_version == "1":
        return [{"id": 1, "name": "John"}, {"id": 2, "name": "Jane"}]
    elif api_version == "2":
        return [
            {"id": 1, "name": "John", "email": "john@example.com"},
            {"id": 2, "name": "Jane", "email": "jane@example.com"}
        ]
    else:
        raise HTTPException(status_code=400, detail="Unsupported version")
```

**Pros:**
- ✅ Simple to implement
- ✅ Easy to test
- ✅ Visible and optional

**Cons:**
- ❌ Clutters query string
- ❌ Version mixed with other parameters
- ❌ Can conflict with caching

**Use When:** Quick prototyping or internal tools.

---

## 🏗️ Advanced Versioning Patterns

### 1. Shared Logic with Version-Specific Handlers

**JavaScript:**
```javascript
// Shared business logic
class UserService {
  async getAllUsers() {
    return await User.find(); // Returns all fields
  }

  async getUserById(id) {
    return await User.findById(id);
  }
}

// Version-specific transformers
class UserTransformerV1 {
  static transform(user) {
    return {
      id: user._id,
      name: user.name,
    };
  }

  static transformMany(users) {
    return users.map(this.transform);
  }
}

class UserTransformerV2 {
  static transform(user) {
    return {
      id: user._id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
  }

  static transformMany(users) {
    return users.map(this.transform);
  }
}

// V1 Routes
const v1Router = express.Router();
const userService = new UserService();

v1Router.get('/users', async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(UserTransformerV1.transformMany(users));
});

v1Router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(UserTransformerV1.transform(user));
});

// V2 Routes
const v2Router = express.Router();

v2Router.get('/users', async (req, res) => {
  const users = await userService.getAllUsers();
  res.json(UserTransformerV2.transformMany(users));
});

v2Router.get('/users/:id', async (req, res) => {
  const user = await userService.getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(UserTransformerV2.transform(user));
});

app.use('/api/v1', v1Router);
app.use('/api/v2', v2Router);
```

**Benefits:**
- ✅ DRY (Don't Repeat Yourself) - business logic shared
- ✅ Easy to add new versions
- ✅ Testable transformers
- ✅ Clear separation of concerns

---

### 2. Version Middleware Pattern

**JavaScript:**
```javascript
// Version extractor middleware
const extractVersion = (req, res, next) => {
  // Try multiple sources
  const pathVersion = req.path.match(/\/v(\d+)\//)?.[1];
  const headerVersion = req.headers['api-version'];
  const queryVersion = req.query.version;

  req.apiVersion = pathVersion || headerVersion || queryVersion || '1';
  next();
};

// Version validator middleware
const validateVersion = (supportedVersions) => {
  return (req, res, next) => {
    if (!supportedVersions.includes(req.apiVersion)) {
      return res.status(400).json({
        error: 'Unsupported API version',
        supported: supportedVersions,
        requested: req.apiVersion,
      });
    }
    next();
  };
};

// Version-specific route handling
const versionedHandler = (handlers) => {
  return (req, res, next) => {
    const handler = handlers[req.apiVersion] || handlers['default'];

    if (!handler) {
      return res.status(400).json({ error: 'No handler for this version' });
    }

    return handler(req, res, next);
  };
};

// Usage
app.use(extractVersion);
app.use(validateVersion(['1', '2', '3']));

app.get(
  '/api/users',
  versionedHandler({
    '1': async (req, res) => {
      const users = await User.find().select('id name');
      res.json(users);
    },
    '2': async (req, res) => {
      const users = await User.find().select('id name email');
      res.json(users);
    },
    '3': async (req, res) => {
      const users = await User.find().select('id name email phone createdAt');
      res.json({ users, version: '3' });
    },
  })
);
```

---

### 3. Version Deprecation Strategy

**JavaScript:**
```javascript
// Deprecation middleware
const deprecationWarning = (deprecatedVersion, sunsetDate) => {
  return (req, res, next) => {
    if (req.apiVersion === deprecatedVersion) {
      res.set({
        'X-API-Warn': `API version ${deprecatedVersion} is deprecated`,
        'X-API-Deprecation-Date': sunsetDate,
        'X-API-Deprecation-Info': 'https://api.example.com/docs/migration',
        'Sunset': sunsetDate, // RFC 8594
      });
    }
    next();
  };
};

// Usage
app.use('/api/v1', deprecationWarning('1', '2025-12-31'));
app.use('/api/v1', v1Router);

// Example response headers:
// X-API-Warn: API version 1 is deprecated
// X-API-Deprecation-Date: 2025-12-31
// Sunset: Sat, 31 Dec 2025 23:59:59 GMT
```

**Python:**
```python
from datetime import datetime
from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
import functools

def deprecated(sunset_date: str, info_url: str):
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            response = await func(*args, **kwargs)

            if isinstance(response, Response):
                response.headers["X-API-Warn"] = f"This endpoint is deprecated"
                response.headers["X-API-Deprecation-Date"] = sunset_date
                response.headers["X-API-Deprecation-Info"] = info_url
                response.headers["Sunset"] = sunset_date

            return response
        return wrapper
    return decorator

@app.get("/api/v1/users")
@deprecated(
    sunset_date="2025-12-31",
    info_url="https://api.example.com/docs/migration"
)
async def get_users_v1():
    return [{"id": 1, "name": "John"}]
```

---

## 📊 Versioning Best Practices

### 1. Start with Versioning from Day One

```javascript
// ✅ GOOD: Version from the start
app.use('/api/v1/users', usersRouter);

// ❌ BAD: No version
app.use('/api/users', usersRouter);
// Now you're stuck - adding v1 later is a breaking change!
```

### 2. Major Versions Only

```
✅ GOOD:
/api/v1/users
/api/v2/users
/api/v3/users

❌ BAD:
/api/v1.2.3/users
/api/v1.5/users
```

**Why:** Minor/patch versions shouldn't break clients. Only major versions indicate breaking changes.

### 3. Support at Least 2 Versions Simultaneously

```javascript
// Support v1 and v2 concurrently
app.use('/api/v1', v1Router); // Deprecated
app.use('/api/v2', v2Router); // Current
app.use('/api/v3', v3Router); // Beta/Preview
```

### 4. Document Migration Path

```markdown
## Migration Guide: V1 → V2

### Breaking Changes

1. **User endpoint response structure changed**
   - V1: `{ id, name }`
   - V2: `{ id, fullName, email }`

2. **Field renamed**
   - `name` → `fullName`

3. **New required field**
   - `email` is now required

### Migration Steps

1. Update client to use `/api/v2` endpoints
2. Handle new `fullName` field (previously `name`)
3. Provide `email` in POST requests

### Code Examples

// V1
GET /api/v1/users/123
{ "id": 123, "name": "John Doe" }

// V2
GET /api/v2/users/123
{ "id": 123, "fullName": "John Doe", "email": "john@example.com" }
```

### 5. Deprecation Timeline

```
Week 0:  Launch V2, announce V1 deprecation
Week 4:  Add deprecation headers to V1 responses
Week 12: Send email reminders to V1 API consumers
Week 20: Final warning - 1 month to sunset
Week 24: Sunset V1 (stop accepting requests)
```

### 6. Monitor Version Usage

```javascript
// Track version usage
const versionMetrics = require('./metrics');

app.use((req, res, next) => {
  versionMetrics.increment(`api.version.${req.apiVersion}.requests`);
  next();
});

// Alert when V1 usage drops below 5% → safe to deprecate
```

---

## 🎤 Common Interview Questions

### Q1: What versioning strategy would you recommend for a public REST API?

**Answer:**

**URL Path Versioning** (`/api/v1/users`, `/api/v2/users`) is recommended for public APIs because:

1. **Discoverability:** Version is visible in the URL
2. **Simplicity:** Easy for developers to understand and use
3. **Testing:** Simple to test different versions (just change URL)
4. **Documentation:** Clear in API docs
5. **Caching:** Works well with HTTP caching
6. **Industry Standard:** Used by Stripe, Twitter, GitHub, etc.

**Implementation Approach:**
- Use Express Router or FastAPI APIRouter to separate versions
- Share business logic, version-specific transformers for responses
- Support 2-3 versions concurrently (deprecated, current, beta)
- Provide clear migration guides

**Example:**
```javascript
// Shared service
class OrderService {
  async getOrders() { /* ... */ }
}

// V1 transformer
class OrderTransformerV1 {
  static transform(order) {
    return { id: order.id, amount: order.total };
  }
}

// V2 transformer (breaking change: amount → total with currency)
class OrderTransformerV2 {
  static transform(order) {
    return {
      id: order.id,
      total: {
        amount: order.total,
        currency: order.currency
      }
    };
  }
}
```

### Q2: How do you handle backward compatibility when changing an API?

**Answer:**

**Strategy depends on the type of change:**

**1. Non-Breaking Changes (No version bump):**
```javascript
// ✅ Adding optional fields
// V1
{ "id": 1, "name": "John" }

// V1 with new optional field (clients ignore it)
{ "id": 1, "name": "John", "age": 30 }

// ✅ Adding new endpoints
GET /api/v1/users/123/preferences  // New endpoint, doesn't break existing
```

**2. Breaking Changes (New version required):**
```javascript
// ❌ Renaming fields
// V1: { "name": "John" }
// V2: { "fullName": "John" }  // Breaking!

// ❌ Changing types
// V1: { "price": "19.99" }  // string
// V2: { "price": 19.99 }    // number - Breaking!

// ❌ Removing fields
// V1: { "id": 1, "name": "John", "age": 30 }
// V2: { "id": 1, "name": "John" }  // Removed age - Breaking!
```

**3. Gradual Migration Pattern:**
```javascript
// V1: Old structure
GET /api/v1/users/123
{ "id": 123, "name": "John" }

// V1.5: Support both fields temporarily
GET /api/v1/users/123
{
  "id": 123,
  "name": "John",        // Deprecated
  "fullName": "John"     // New field
}

// V2: Only new structure
GET /api/v2/users/123
{ "id": 123, "fullName": "John" }
```

**4. Use Feature Flags for Gradual Rollout:**
```javascript
app.get('/api/v2/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);

  // Feature flag for gradual rollout
  if (req.headers['x-enable-beta-features'] === 'true') {
    return res.json({
      ...user,
      newFeature: computeNewFeature(user)
    });
  }

  return res.json(user);
});
```

### Q3: When would you NOT version your API?

**Answer:**

**Don't version when:**

1. **Internal microservices communication** (use contracts/schemas instead)
   - GraphQL or gRPC with schema evolution
   - Contract testing with Pact
   - Backward-compatible Protobuf changes

2. **Rapid prototyping** (pre-production)
   - MVP/alpha phase
   - No external consumers yet

3. **Real-time APIs** (WebSocket, SSE)
   - Version handshake at connection time
   - Not per-message

4. **GraphQL APIs**
   - Schema evolution instead of versioning
   - Deprecate fields with `@deprecated` directive

```graphql
type User {
  id: ID!
  name: String @deprecated(reason: "Use fullName instead")
  fullName: String
}
```

### Q4: How would you sunset an old API version?

**Answer:**

**6-Step Process:**

**1. Announce Deprecation (Week 0)**
```javascript
// Add to docs, blog post, email
"V1 deprecated on 2024-12-01. Sunset on 2025-06-01."
```

**2. Add Deprecation Headers (Week 4)**
```javascript
app.use('/api/v1', (req, res, next) => {
  res.set({
    'X-API-Deprecation': 'true',
    'X-API-Sunset-Date': '2025-06-01',
    'X-API-Migration-Guide': 'https://api.example.com/docs/v1-to-v2',
    'Sunset': 'Sat, 01 Jun 2025 00:00:00 GMT'  // RFC 8594
  });
  next();
});
```

**3. Monitor Usage (Ongoing)**
```javascript
// Track V1 usage
const metrics = require('./metrics');

app.use('/api/v1', (req, res, next) => {
  metrics.increment('api.v1.requests', {
    endpoint: req.path,
    client: req.headers['user-agent']
  });
  next();
});

// Alert when large consumers still on V1
```

**4. Contact Heavy Users (Week 12)**
```
Identify top 10 consumers of V1 API
Send personalized emails with migration help
Offer migration support/consultation
```

**5. Return 410 Gone for New Requests (Week 20)**
```javascript
// 1 month before sunset: reject NEW API keys on V1
app.use('/api/v1', (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  const keyCreatedAt = await getApiKeyCreatedAt(apiKey);

  if (keyCreatedAt > new Date('2025-05-01')) {
    return res.status(410).json({
      error: 'API version 1 is no longer available for new users',
      message: 'Please use /api/v2',
      migrationGuide: 'https://api.example.com/docs/v1-to-v2'
    });
  }

  next();
});
```

**6. Full Sunset (Week 24)**
```javascript
// Return 410 Gone for all V1 requests
app.use('/api/v1', (req, res) => {
  res.status(410).json({
    error: 'API version 1 has been sunset',
    sunsetDate: '2025-06-01',
    replacement: 'Please use /api/v2',
    migrationGuide: 'https://api.example.com/docs/v1-to-v2'
  });
});
```

**Best Practices:**
- ✅ Give 6-12 months notice for public APIs
- ✅ Provide clear migration guides
- ✅ Monitor and reach out to heavy users
- ✅ Use standard HTTP headers (Sunset: RFC 8594)
- ✅ Return 410 Gone (not 404) for sunset endpoints

---

## ✅ Key Takeaways

1. **Start versioning from day one** - `/api/v1` not `/api`
2. **URL path versioning is most common** - clear, simple, industry standard
3. **Only version on breaking changes** - adding optional fields doesn't need new version
4. **Support 2-3 versions concurrently** - give users time to migrate
5. **Use transformers to share logic** - DRY principle, business logic separate from versioning
6. **Document breaking changes clearly** - provide migration guides
7. **Deprecate gradually** - headers, monitoring, communication, sunset
8. **Use 410 Gone for sunset APIs** - not 404 Not Found

---

[← Back: GraphQL](./02-graphql.md) | [Next: Rate Limiting →](./04-rate-limiting.md)
