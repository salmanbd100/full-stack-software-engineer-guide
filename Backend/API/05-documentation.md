# API Documentation

## Overview

API documentation is the technical content that describes how to use and integrate with an API. Good documentation is essential for API adoption, reduces support burden, and improves developer experience.

**Key Principle:** Documentation should be accurate, complete, easy to understand, and always up-to-date.

---

## 🎯 Why Document Your API?

### 1. Developer Experience
- Reduces time to first API call
- Fewer support tickets
- Higher adoption rates
- Better developer satisfaction

### 2. Discoverability
- Helps developers find the right endpoints
- Shows capabilities and limitations
- Examples speed up integration

### 3. Maintenance
- Onboarding new team members
- Understanding legacy code
- Planning API changes

---

## 📐 Documentation Tools & Standards

### 1. OpenAPI/Swagger (Industry Standard)

**OpenAPI Specification (OAS)** is a standard for describing REST APIs in a machine-readable format.

**JavaScript (Express + Swagger):**
```javascript
const express = require('express');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');

const app = express();

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'User API',
      version: '1.0.0',
      description: 'A simple Express User API',
      contact: {
        name: 'API Support',
        email: 'support@example.com',
      },
    },
    servers: [
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server',
      },
      {
        url: 'https://api.example.com/v1',
        description: 'Production server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{
      bearerAuth: [],
    }],
  },
  apis: ['./routes/*.js'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Routes with JSDoc comments
/**
 * @swagger
 * /users:
 *   get:
 *     summary: Get all users
 *     description: Retrieve a list of all users
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Number of users per page
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
app.get('/api/v1/users', async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const users = await User.find().skip((page - 1) * limit).limit(limit);
  const total = await User.countDocuments();

  res.json({
    data: users,
    meta: { page: parseInt(page), limit: parseInt(limit), total },
  });
});

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       required:
 *         - email
 *         - name
 *       properties:
 *         id:
 *           type: string
 *           description: Auto-generated user ID
 *         name:
 *           type: string
 *           description: User's full name
 *         email:
 *           type: string
 *           format: email
 *           description: User's email address
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Account creation timestamp
 *       example:
 *         id: 507f1f77bcf86cd799439011
 *         name: John Doe
 *         email: john@example.com
 *         createdAt: 2024-01-01T00:00:00.000Z
 */

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
app.get('/api/v1/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

app.listen(3000);
```

**Python (FastAPI - Built-in Documentation):**
```python
from fastapi import FastAPI, Query, HTTPException
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="User API",
    description="A simple User API",
    version="1.0.0",
    contact={
        "name": "API Support",
        "email": "support@example.com",
    },
    servers=[
        {"url": "http://localhost:8000", "description": "Development"},
        {"url": "https://api.example.com", "description": "Production"},
    ]
)

# Models automatically generate schema
class User(BaseModel):
    id: str = Field(..., description="Auto-generated user ID")
    name: str = Field(..., min_length=2, max_length=50, description="User's full name")
    email: EmailStr = Field(..., description="User's email address")
    createdAt: datetime = Field(..., description="Account creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "name": "John Doe",
                "email": "john@example.com",
                "createdAt": "2024-01-01T00:00:00.000Z"
            }
        }

class UserListResponse(BaseModel):
    data: List[User]
    meta: dict

@app.get(
    "/api/v1/users",
    response_model=UserListResponse,
    summary="Get all users",
    description="Retrieve a paginated list of all users",
    tags=["Users"],
    responses={
        200: {"description": "List of users"},
        401: {"description": "Unauthorized"},
        500: {"description": "Server error"},
    }
)
async def get_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page")
):
    """
    Get all users with pagination.

    - **page**: Page number (default: 1)
    - **limit**: Number of users per page (default: 20, max: 100)
    """
    # Implementation
    users = await fetch_users(page, limit)
    total = await count_users()

    return {
        "data": users,
        "meta": {"page": page, "limit": limit, "total": total}
    }

@app.get(
    "/api/v1/users/{user_id}",
    response_model=User,
    summary="Get user by ID",
    tags=["Users"],
    responses={
        200: {"description": "User found"},
        404: {"description": "User not found"},
    }
)
async def get_user(user_id: str):
    """Get a specific user by ID"""
    user = await fetch_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

# Auto-generated interactive docs at:
# - /docs (Swagger UI)
# - /redoc (ReDoc)
```

**Benefits of OpenAPI:**
- ✅ Interactive documentation (Swagger UI)
- ✅ Auto-generate client SDKs
- ✅ API testing directly from docs
- ✅ Industry standard
- ✅ Machine-readable

---

### 2. README-Driven Documentation

**Structure:**
```markdown
# API Name

Brief description of what the API does.

## Table of Contents
- [Authentication](#authentication)
- [Rate Limiting](#rate-limiting)
- [Endpoints](#endpoints)
- [Error Handling](#error-handling)
- [Examples](#examples)

## Base URL
```
Production: https://api.example.com/v1
Development: http://localhost:3000/api/v1
```

## Authentication

All requests require authentication via JWT token:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.example.com/v1/users
```

## Rate Limiting

- **Free tier**: 100 requests/hour
- **Pro tier**: 10,000 requests/hour

Rate limit headers:
- `X-RateLimit-Limit`: Max requests
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp

## Endpoints

### Get All Users

```http
GET /users?page=1&limit=20
```

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| page | integer | No | Page number (default: 1) |
| limit | integer | No | Items per page (default: 20) |

**Response (200 OK):**
```json
{
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "name": "John Doe",
      "email": "john@example.com",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

### Create User

```http
POST /users
```

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com"
}
```

**Response (201 Created):**
```json
{
  "id": "507f1f77bcf86cd799439012",
  "name": "Jane Doe",
  "email": "jane@example.com",
  "createdAt": "2024-01-02T00:00:00.000Z"
}
```

## Error Handling

All errors follow this format:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is already taken"
      }
    ]
  }
}
```

**Error Codes:**
- `VALIDATION_ERROR` (422): Invalid input
- `UNAUTHORIZED` (401): Missing or invalid token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMIT_EXCEEDED` (429): Too many requests

## Examples

### JavaScript (Fetch)

```javascript
const response = await fetch('https://api.example.com/v1/users', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
  },
});

const data = await response.json();
console.log(data);
```

### Python (Requests)

```python
import requests

headers = {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
}

response = requests.get('https://api.example.com/v1/users', headers=headers)
data = response.json()
print(data)
```

### cURL

```bash
curl -X GET https://api.example.com/v1/users \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```
```

---

## 📊 Documentation Best Practices

### 1. Always Include Examples

**❌ BAD:**
```
GET /users
Returns list of users
```

**✅ GOOD:**
```http
GET /users?page=1&limit=20
Authorization: Bearer YOUR_TOKEN

Response (200 OK):
{
  "data": [
    { "id": 1, "name": "John", "email": "john@example.com" }
  ],
  "meta": { "page": 1, "limit": 20, "total": 100 }
}
```

### 2. Document All Parameters

```markdown
### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| page | integer | No | 1 | Page number for pagination |
| limit | integer | No | 20 | Items per page (max: 100) |
| sort | string | No | -createdAt | Sort field. Prefix with `-` for desc |
| filter | string | No | - | Filter by status: active, inactive |
```

### 3. Document Error Responses

```markdown
### Responses

**200 OK**
```json
{ "data": [...] }
```

**400 Bad Request**
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Invalid query parameter: limit must be between 1 and 100"
  }
}
```

**401 Unauthorized**
```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

**404 Not Found**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User with ID 123 not found"
  }
}
```
```

### 4. Provide Code Examples in Multiple Languages

```markdown
## Examples

### JavaScript
```javascript
const user = await fetch('/users/123').then(r => r.json());
```

### Python
```python
response = requests.get('/users/123')
user = response.json()
```

### cURL
```bash
curl https://api.example.com/v1/users/123
```
```

### 5. Document Authentication

```markdown
## Authentication

This API uses JWT bearer tokens for authentication.

### Getting a Token

```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 86400
}
```

### Using the Token

Include the token in the Authorization header:

```http
GET /users
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
```

### 6. Keep Documentation Up-to-Date

**Strategies:**
- ✅ Auto-generate from code (OpenAPI, JSDoc)
- ✅ Version docs alongside code
- ✅ Include docs in code review
- ✅ CI/CD checks for doc updates
- ✅ Use type definitions (TypeScript, Pydantic)

---

## 🎤 Common Interview Questions

### Q1: What information should API documentation include?

**Answer:**

**Essential Information:**

1. **Overview & Introduction**
   - What the API does
   - Base URL
   - Version

2. **Authentication**
   - How to get credentials/tokens
   - How to authenticate requests
   - Token expiration and refresh

3. **Endpoints**
   - HTTP method and path
   - Description
   - Parameters (path, query, headers, body)
   - Request examples
   - Response examples (success and error)
   - Status codes

4. **Rate Limiting**
   - Limits per tier
   - Headers returned
   - How to handle rate limits

5. **Error Handling**
   - Error response format
   - Error codes and meanings
   - How to debug errors

6. **Examples**
   - Code samples in multiple languages
   - Common use cases
   - Complete workflows

7. **SDKs & Libraries**
   - Official client libraries
   - Community SDKs
   - Installation instructions

8. **Versioning**
   - Current version
   - Deprecation timeline
   - Migration guides

9. **Changelog**
   - What changed in each version
   - Breaking changes
   - New features

10. **Support**
    - How to get help
    - Community forums
    - Issue tracker

---

### Q2: How do you keep API documentation synchronized with code?

**Answer:**

**Strategies:**

**1. Generate from Code (Best)**
```javascript
// Use annotations/decorators
/**
 * @swagger
 * /users:
 *   get:
 *     description: Get all users
 */
app.get('/users', handler);

// Or use framework features (FastAPI auto-generates docs)
@app.get("/users", response_model=List[User])
async def get_users():
    pass
```

**2. Type Definitions as Source of Truth**
```typescript
// Define types
interface User {
  id: string;
  name: string;
  email: string;
}

// Generate OpenAPI schema from types
// Documentation always matches code
```

**3. CI/CD Validation**
```yaml
# .github/workflows/docs.yml
- name: Validate OpenAPI spec
  run: |
    npm run generate-openapi
    git diff --exit-code openapi.yaml
    # Fails if spec changed but not committed
```

**4. Documentation Tests**
```javascript
// Test that endpoints match documentation
it('should match OpenAPI spec', async () => {
  const response = await request(app).get('/users');
  expect(response).toMatchSchema(openApiSpec.paths['/users'].get);
});
```

**5. Include in Code Review**
- Require docs update with code changes
- Use PR templates: "Did you update docs?"

**Interview Tip:** Emphasize that auto-generation from code is best because documentation can't drift from implementation.

---

### Q3: What are the pros and cons of OpenAPI/Swagger?

**Answer:**

| Aspect | Pros | Cons |
|--------|------|------|
| **Adoption** | ✅ Industry standard | ❌ Learning curve |
| **Tooling** | ✅ Excellent (Swagger UI, ReDoc, code gen) | ❌ Some tools have limitations |
| **Accuracy** | ✅ Machine-readable, can validate | ❌ Manual YAML can drift |
| **Developer Experience** | ✅ Interactive testing | ❌ Verbose for simple APIs |
| **Client SDKs** | ✅ Auto-generate in many languages | ❌ Generated code may not be idiomatic |
| **Maintenance** | ✅ Code annotations keep it synced | ❌ Requires discipline |

**When to Use:**
- ✅ Public APIs
- ✅ Large APIs (many endpoints)
- ✅ Need to generate client SDKs
- ✅ Multiple consumers

**When to Skip:**
- ❌ Internal APIs (simple README sufficient)
- ❌ Very simple APIs (< 5 endpoints)
- ❌ GraphQL APIs (use built-in introspection)

**Interview Tip:** Mention that FastAPI has OpenAPI built-in, making it zero-effort. Express requires more setup.

---

### Q4: How would you document a breaking change in your API?

**Answer:**

**5-Step Process:**

**1. Announce in Changelog**
```markdown
## Version 2.0.0 (2024-06-01)

### ⚠️ BREAKING CHANGES

- **User endpoint response structure changed**
  - Old: `{ id, name }`
  - New: `{ id, fullName, email }`
  - Migration: Replace `name` with `fullName`

- **Authentication now requires API key**
  - Old: No authentication
  - New: `X-API-Key` header required
  - Migration: [Get API key here](/dashboard/api-keys)
```

**2. Add Deprecation Warnings to Docs**
```markdown
## GET /users (v1) - DEPRECATED

⚠️ **This endpoint is deprecated and will be removed on 2024-12-31.**

Use [`GET /api/v2/users`](#get-users-v2) instead.

### Migration Guide
1. Update base URL from `/api/v1` to `/api/v2`
2. Response field `name` renamed to `fullName`
3. Add `X-API-Key` header
```

**3. Provide Side-by-Side Comparison**
```markdown
### V1 (Deprecated)
```http
GET /api/v1/users/123

Response:
{ "id": 123, "name": "John" }
```

### V2 (Current)
```http
GET /api/v2/users/123
X-API-Key: your_key_here

Response:
{ "id": 123, "fullName": "John", "email": "john@example.com" }
```
```

**4. Add Migration Script/Tool**
```markdown
### Automated Migration

We provide a CLI tool to help migrate:

```bash
npm install -g api-migration-tool
api-migration-tool migrate-v1-to-v2 ./src
```
```

**5. Document Timeline**
```markdown
## Deprecation Timeline

- **2024-06-01**: V2 released
- **2024-08-01**: V1 marked deprecated (still works)
- **2024-10-01**: Email reminder to V1 users
- **2024-12-01**: Final warning
- **2024-12-31**: V1 sunset (returns 410 Gone)
```

**Interview Tip:** Mention that breaking changes should be rare, and the migration path should be as smooth as possible.

---

## ✅ Key Takeaways

1. **OpenAPI/Swagger is industry standard** for REST APIs
2. **FastAPI auto-generates docs** from code - zero effort
3. **Express requires manual setup** but swagger-jsdoc helps
4. **Include examples in multiple languages** - JavaScript, Python, cURL
5. **Document errors comprehensively** - all status codes and error formats
6. **Auto-generate from code** when possible to keep docs in sync
7. **Version docs alongside code** - include in CI/CD
8. **Provide interactive documentation** - Swagger UI for testing
9. **Document breaking changes clearly** with migration guides
10. **Keep docs simple** - README may be enough for internal APIs

---

[← Back: Rate Limiting](./04-rate-limiting.md) | [Next: WebSockets →](./06-websockets.md)
