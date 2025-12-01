# Testing Express Applications

## Overview

Testing is crucial for building reliable, maintainable applications. Understanding how to write effective tests for Express applications is essential for production-ready code and is frequently covered in interviews.

## Types of Tests

### Test Pyramid

```
        /\
       /E2E\       End-to-End (Few)
      /------\
     /Integration\ Integration (Some)
    /------------\
   /  Unit Tests  \ Unit Tests (Many)
  /----------------\
```

- **Unit Tests**: Test individual functions/modules
- **Integration Tests**: Test API endpoints
- **E2E Tests**: Test complete user flows

## Testing Tools

### Core Libraries

```bash
npm install --save-dev jest supertest
npm install --save-dev @types/jest @types/supertest  # For TypeScript
```

```javascript
// package.json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"]
  }
}
```

## Unit Testing

### Testing Utility Functions

```javascript
// utils/math.js
exports.add = (a, b) => a + b;
exports.multiply = (a, b) => a * b;

// utils/math.test.js
const { add, multiply } = require('./math');

describe('Math utilities', () => {
  describe('add', () => {
    it('should add two numbers correctly', () => {
      expect(add(2, 3)).toBe(5);
      expect(add(-1, 1)).toBe(0);
      expect(add(0, 0)).toBe(0);
    });
  });

  describe('multiply', () => {
    it('should multiply two numbers correctly', () => {
      expect(multiply(2, 3)).toBe(6);
      expect(multiply(-1, 5)).toBe(-5);
      expect(multiply(0, 10)).toBe(0);
    });
  });
});
```

### Testing Middleware

```javascript
// middleware/auth.test.js
const { authenticate } = require('./auth');
const jwt = require('jsonwebtoken');

jest.mock('jsonwebtoken');

describe('authenticate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  it('should call next() with valid token', () => {
    req.headers.authorization = 'Bearer valid-token';
    jwt.verify.mockReturnValue({ userId: '123' });

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ userId: '123' });
  });

  it('should return 401 without token', () => {
    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      error: 'No token provided'
    });
    expect(next).not.toHaveBeenCalled();
  });

  it('should return 401 with invalid token', () => {
    req.headers.authorization = 'Bearer invalid-token';
    jwt.verify.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
```

## Integration Testing

### Testing API Endpoints

```javascript
// app.test.js
const request = require('supertest');
const app = require('./app');
const mongoose = require('mongoose');
const User = require('./models/User');

// Setup and teardown
beforeAll(async () => {
  await mongoose.connect(process.env.TEST_DB_URI);
});

afterAll(async () => {
  await mongoose.connection.close();
});

beforeEach(async () => {
  await User.deleteMany({});
});

describe('User API', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(userData.name);
      expect(response.body.data.email).toBe(userData.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('should return 400 with invalid email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'invalid-email',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(400);

      expect(response.body).toHaveProperty('error');
    });

    it('should return 409 for duplicate email', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      // Create first user
      await request(app)
        .post('/api/users')
        .send(userData);

      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .send(userData)
        .expect(409);

      expect(response.body.error).toContain('already exists');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by id', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword'
      });

      const response = await request(app)
        .get(`/api/users/${user._id}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data.name).toBe(user.name);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = new mongoose.Types.ObjectId();

      await request(app)
        .get(`/api/users/${fakeId}`)
        .expect(404);
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update user with valid token', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword'
      });

      const token = generateToken(user);

      const response = await request(app)
        .put(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Jane Doe' })
        .expect(200);

      expect(response.body.data.name).toBe('Jane Doe');
    });

    it('should return 401 without token', async () => {
      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword'
      });

      await request(app)
        .put(`/api/users/${user._id}`)
        .send({ name: 'Jane Doe' })
        .expect(401);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete user as admin', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@example.com',
        password: 'hashedpassword',
        role: 'admin'
      });

      const user = await User.create({
        name: 'John Doe',
        email: 'john@example.com',
        password: 'hashedpassword'
      });

      const token = generateToken(admin);

      await request(app)
        .delete(`/api/users/${user._id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(204);

      const deletedUser = await User.findById(user._id);
      expect(deletedUser).toBeNull();
    });
  });
});
```

### Testing with Database

```javascript
// Setup test database
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();

  await mongoose.connect(mongoUri);
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

beforeEach(async () => {
  const collections = mongoose.connection.collections;

  for (const key in collections) {
    await collections[key].deleteMany({});
  }
});
```

## Mocking

### Mocking Dependencies

```javascript
// services/emailService.js
exports.sendEmail = async (to, subject, body) => {
  // Email sending logic
};

// controllers/userController.test.js
const { createUser } = require('./userController');
const emailService = require('../services/emailService');

jest.mock('../services/emailService');

describe('User Controller', () => {
  it('should send welcome email on user creation', async () => {
    emailService.sendEmail.mockResolvedValue(true);

    const req = {
      body: {
        name: 'John',
        email: 'john@example.com',
        password: 'password123'
      }
    };
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    await createUser(req, res);

    expect(emailService.sendEmail).toHaveBeenCalledWith(
      'john@example.com',
      'Welcome',
      expect.any(String)
    );
  });
});
```

### Mocking Database

```javascript
const User = require('../models/User');

jest.mock('../models/User');

describe('User Service', () => {
  it('should find user by email', async () => {
    const mockUser = {
      _id: '123',
      name: 'John',
      email: 'john@example.com'
    };

    User.findOne.mockResolvedValue(mockUser);

    const user = await userService.findByEmail('john@example.com');

    expect(User.findOne).toHaveBeenCalledWith({ email: 'john@example.com' });
    expect(user).toEqual(mockUser);
  });

  it('should create user', async () => {
    const userData = {
      name: 'John',
      email: 'john@example.com',
      password: 'hashed'
    };

    User.create.mockResolvedValue({ _id: '123', ...userData });

    const user = await userService.createUser(userData);

    expect(User.create).toHaveBeenCalledWith(userData);
    expect(user).toHaveProperty('_id');
  });
});
```

## Testing Authentication

### Testing Protected Routes

```javascript
describe('Protected Routes', () => {
  let token;
  let user;

  beforeEach(async () => {
    user = await User.create({
      name: 'John',
      email: 'john@example.com',
      password: await bcrypt.hash('password123', 10)
    });

    token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET
    );
  });

  it('should access protected route with valid token', async () => {
    const response = await request(app)
      .get('/api/profile')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.data.email).toBe(user.email);
  });

  it('should reject invalid token', async () => {
    await request(app)
      .get('/api/profile')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should reject missing token', async () => {
    await request(app)
      .get('/api/profile')
      .expect(401);
  });
});
```

## Test Helpers

### Creating Test Utilities

```javascript
// tests/helpers.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.createTestUser = async (data = {}) => {
  const defaultData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    role: 'user'
  };

  return await User.create({ ...defaultData, ...data });
};

exports.generateToken = (user) => {
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

exports.createAuthHeader = (user) => {
  const token = exports.generateToken(user);
  return `Bearer ${token}`;
};

// Usage
const { createTestUser, createAuthHeader } = require('./helpers');

it('should update profile', async () => {
  const user = await createTestUser();

  const response = await request(app)
    .put('/api/profile')
    .set('Authorization', createAuthHeader(user))
    .send({ name: 'Updated Name' })
    .expect(200);

  expect(response.body.data.name).toBe('Updated Name');
});
```

## Test Coverage

### Running Coverage Reports

```bash
npm run test:coverage
```

```javascript
// jest.config.js
module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/index.js'
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

## Testing Error Handling

```javascript
describe('Error Handling', () => {
  it('should handle validation errors', async () => {
    const response = await request(app)
      .post('/api/users')
      .send({ name: 'John' }) // Missing email and password
      .expect(400);

    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('required');
  });

  it('should handle database errors gracefully', async () => {
    // Mock database error
    jest.spyOn(User, 'create').mockRejectedValue(
      new Error('Database connection failed')
    );

    const response = await request(app)
      .post('/api/users')
      .send({
        name: 'John',
        email: 'john@example.com',
        password: 'password123'
      })
      .expect(500);

    expect(response.body.error).toBeDefined();
  });

  it('should handle 404 errors', async () => {
    const response = await request(app)
      .get('/api/nonexistent')
      .expect(404);

    expect(response.body.error).toContain('not found');
  });
});
```

## Testing File Uploads

```javascript
const path = require('path');

describe('File Upload', () => {
  it('should upload image successfully', async () => {
    const user = await createTestUser();
    const token = generateToken(user);

    const response = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', path.join(__dirname, 'fixtures/test-image.jpg'))
      .expect(201);

    expect(response.body).toHaveProperty('filename');
    expect(response.body).toHaveProperty('url');
  });

  it('should reject invalid file type', async () => {
    const user = await createTestUser();
    const token = generateToken(user);

    await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', path.join(__dirname, 'fixtures/test.txt'))
      .expect(400);
  });

  it('should reject file too large', async () => {
    const user = await createTestUser();
    const token = generateToken(user);

    await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('image', path.join(__dirname, 'fixtures/large-image.jpg'))
      .expect(400);
  });
});
```

## Complete Test Suite Example

```javascript
// tests/users.test.js
const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const User = require('../models/User');
const { createTestUser, generateToken } = require('./helpers');

describe('User API', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.TEST_DB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('POST /api/register', () => {
    it('should register new user', async () => {
      const userData = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/register')
        .send(userData)
        .expect(201);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe(userData.email);
      expect(response.body.user).not.toHaveProperty('password');
    });

    it('should validate required fields', async () => {
      await request(app)
        .post('/api/register')
        .send({ name: 'John' })
        .expect(400);
    });

    it('should reject weak password', async () => {
      await request(app)
        .post('/api/register')
        .send({
          name: 'John',
          email: 'john@example.com',
          password: '123'
        })
        .expect(400);
    });
  });

  describe('POST /api/login', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'john@example.com',
        password: await bcrypt.hash('password123', 10)
      });
    });

    it('should login with valid credentials', async () => {
      const response = await request(app)
        .post('/api/login')
        .send({
          email: 'john@example.com',
          password: 'password123'
        })
        .expect(200);

      expect(response.body).toHaveProperty('token');
      expect(response.body.user.email).toBe('john@example.com');
    });

    it('should reject invalid password', async () => {
      await request(app)
        .post('/api/login')
        .send({
          email: 'john@example.com',
          password: 'wrongpassword'
        })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app)
        .post('/api/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        })
        .expect(401);
    });
  });

  describe('GET /api/profile', () => {
    it('should get profile with valid token', async () => {
      const user = await createTestUser();
      const token = generateToken(user);

      const response = await request(app)
        .get('/api/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.data.email).toBe(user.email);
    });

    it('should reject without token', async () => {
      await request(app)
        .get('/api/profile')
        .expect(401);
    });
  });
});
```

## Interview Questions

### Q1: What is the difference between unit tests and integration tests?

**Answer:**
- **Unit tests**: Test individual functions/modules in isolation, fast, many
- **Integration tests**: Test multiple components together (API endpoints), slower, fewer

### Q2: What is Supertest used for?

**Answer:**
Supertest is used for testing HTTP endpoints in Express applications. It allows you to make HTTP requests without starting a server.

```javascript
const response = await request(app)
  .get('/api/users')
  .expect(200);
```

### Q3: How do you mock dependencies in tests?

**Answer:**
Use Jest's mocking:

```javascript
jest.mock('../services/emailService');

emailService.sendEmail.mockResolvedValue(true);
```

### Q4: How do you test protected routes?

**Answer:**
Create a test user, generate a token, and include it in the request:

```javascript
const user = await createTestUser();
const token = generateToken(user);

await request(app)
  .get('/api/profile')
  .set('Authorization', `Bearer ${token}`)
  .expect(200);
```

### Q5: What should you test in an Express application?

**Answer:**
- API endpoints (status codes, response structure)
- Authentication/authorization
- Input validation
- Error handling
- Business logic
- Database interactions
- File uploads

## Best Practices

### ✅ Do's

1. **Write tests before or with code (TDD)**
2. **Test happy paths and edge cases**
3. **Use descriptive test names**
4. **Keep tests isolated and independent**
5. **Use test helpers for common operations**
6. **Mock external dependencies**
7. **Aim for good coverage (80%+)**
8. **Test error scenarios**

### ❌ Don'ts

1. **Don't test implementation details**
2. **Don't skip error testing**
3. **Don't use production database for tests**
4. **Don't write dependent tests**
5. **Don't mock everything**
6. **Don't ignore failing tests**

## Summary

- Write unit tests for functions, integration tests for APIs
- Use Jest for testing framework, Supertest for HTTP testing
- Mock external dependencies to isolate tests
- Test authentication, validation, and error handling
- Use test helpers for common operations
- Aim for good test coverage
- Follow AAA pattern: Arrange, Act, Assert

---

[← Previous: File Handling](./07-file-handling.md) | [Back to Backend →](../README.md)
