# Error Handling

## Overview

Proper error handling is crucial for building robust Express applications. Understanding how to catch, handle, and respond to errors appropriately is essential for production-ready applications and is frequently tested in interviews.

## Error Handling Basics

### Synchronous Errors

```javascript
app.get('/sync-error', (req, res) => {
  throw new Error('Something went wrong!');
  // Express automatically catches synchronous errors
});
```

### Asynchronous Errors

```javascript
// ❌ Bad: Error won't be caught
app.get('/async-error', async (req, res) => {
  const data = await fetchData(); // If this throws, Express won't catch it
  res.json(data);
});

// ✅ Good: Use try-catch
app.get('/async-error', async (req, res, next) => {
  try {
    const data = await fetchData();
    res.json(data);
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

## Error-Handling Middleware

### Basic Error Handler

```javascript
// Error-handling middleware MUST have 4 parameters
app.use((err, req, res, next) => {
  console.error(err.stack);

  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500
    }
  });
});
```

### Complete Error Handler

```javascript
app.use((err, req, res, next) => {
  // Log error
  console.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Don't expose stack trace in production
  const isDevelopment = process.env.NODE_ENV === 'development';

  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status || 500,
      ...(isDevelopment && { stack: err.stack })
    }
  });
});
```

## Custom Error Classes

### Creating Custom Errors

```javascript
// Base error class
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Specific error classes
class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403);
  }
}

// Export
module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError
};
```

### Using Custom Errors

```javascript
const { NotFoundError, ValidationError } = require('./errors');

app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

app.post('/users', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError('Email and password are required');
    }

    const user = await User.create({ email, password });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
});
```

## Async Error Wrapper

### Creating Async Handler

```javascript
// Wrapper function to catch async errors
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
```

### Alternative: express-async-errors

```javascript
// Install: npm install express-async-errors
require('express-async-errors');

// Now async errors are automatically caught
app.get('/users', async (req, res) => {
  const users = await User.find(); // Errors automatically caught
  res.json(users);
});
```

## Validation Errors

### Using Joi for Validation

```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  name: Joi.string().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  age: Joi.number().integer().min(18)
});

// Validation middleware
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body);

  if (error) {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        details: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message
        }))
      }
    });
  }

  req.body = value; // Use validated value
  next();
};

// Use in routes
app.post('/users', validate(userSchema), asyncHandler(async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
}));
```

### Using Express-Validator

```javascript
const { body, validationResult } = require('express-validator');

app.post('/users',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('name').trim().notEmpty()
  ],
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          errors: errors.array()
        }
      });
    }

    next();
  },
  asyncHandler(async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json(user);
  })
);
```

## Error Handling Strategies

### 1. Centralized Error Handler

```javascript
// errors/errorHandler.js
const errorHandler = (err, req, res, next) => {
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: {
        message: 'Validation failed',
        errors: Object.values(err.errors).map(e => ({
          field: e.path,
          message: e.message
        }))
      }
    });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: {
        message: `Invalid ${err.path}: ${err.value}`
      }
    });
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern)[0];
    return res.status(400).json({
      error: {
        message: `${field} already exists`
      }
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: { message: 'Invalid token' }
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: { message: 'Token expired' }
    });
  }

  // Default error
  const status = err.status || 500;
  const message = err.isOperational
    ? err.message
    : 'Internal server error';

  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    }
  });
};

module.exports = errorHandler;
```

### 2. 404 Handler

```javascript
// Must be placed AFTER all other routes
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      path: req.originalUrl
    }
  });
});

// Or throw error
app.use((req, res, next) => {
  const error = new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`);
  next(error);
});
```

### 3. Unhandled Rejection Handler

```javascript
// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);

  // Close server and exit
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);

  // Close server and exit
  server.close(() => {
    process.exit(1);
  });
});
```

## Production Error Handling

### Environment-Based Errors

```javascript
const sendErrorDev = (err, res) => {
  res.status(err.status || 500).json({
    error: {
      message: err.message,
      status: err.status,
      stack: err.stack,
      error: err
    }
  });
};

const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.status).json({
      error: {
        message: err.message,
        status: err.status
      }
    });
  } else {
    // Programming or unknown error: don't leak details
    console.error('ERROR 💥', err);

    res.status(500).json({
      error: {
        message: 'Something went wrong',
        status: 500
      }
    });
  }
};

const errorHandler = (err, req, res, next) => {
  err.status = err.status || 500;

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    sendErrorProd(err, res);
  }
};

module.exports = errorHandler;
```

### Error Logging

```javascript
const winston = require('winston');

// Configure logger
const logger = winston.createLogger({
  level: 'error',
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

// Error handler with logging
app.use((err, req, res, next) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  res.status(err.status || 500).json({
    error: { message: err.message }
  });
});
```

## Complete Error Handling Example

```javascript
// app.js
const express = require('express');
require('express-async-errors'); // Catch async errors automatically

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(user);
});

app.post('/users', validate(userSchema), async (req, res) => {
  const user = await User.create(req.body);
  res.status(201).json(user);
});

// 404 handler
app.use((req, res, next) => {
  throw new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`);
});

// Error handler
app.use((err, req, res, next) => {
  logger.error(err);

  const status = err.status || 500;
  const message = err.isOperational
    ? err.message
    : 'Internal server error';

  res.status(status).json({
    error: {
      message,
      status,
      ...(process.env.NODE_ENV === 'development' && {
        stack: err.stack
      })
    }
  });
});

// Global error handlers
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

module.exports = app;
```

## Interview Questions

### Q1: What is the difference between error-handling middleware and regular middleware?

**Answer:**
Error-handling middleware has 4 parameters (err, req, res, next) while regular middleware has 3 (req, res, next). Error handlers must be defined after all other middleware and routes.

```javascript
// Regular middleware
app.use((req, res, next) => { next(); });

// Error-handling middleware
app.use((err, req, res, next) => { res.status(500).send(err); });
```

### Q2: How do you handle async errors in Express?

**Answer:**
1. Use try-catch and pass to next()
2. Use async wrapper function
3. Use express-async-errors package

```javascript
// Option 1: try-catch
app.get('/users', async (req, res, next) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    next(error);
  }
});

// Option 2: Wrapper
const asyncHandler = fn => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

app.get('/users', asyncHandler(async (req, res) => {
  const users = await User.find();
  res.json(users);
}));
```

### Q3: How do you create custom error classes?

**Answer:**
```javascript
class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
    this.isOperational = true;
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Not found') {
    super(message, 404);
  }
}
```

### Q4: What are operational vs programming errors?

**Answer:**
- **Operational errors**: Expected errors that can be handled (invalid input, network errors, DB errors)
- **Programming errors**: Bugs in code (null reference, undefined variable)

Operational errors should be handled gracefully. Programming errors usually require fixing the code.

### Q5: How do you handle unhandled promise rejections?

**Answer:**
```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection:', reason);
  server.close(() => process.exit(1));
});
```

## Best Practices

### ✅ Do's

1. **Use custom error classes**
2. **Always use next(err) for async errors**
3. **Log errors appropriately**
4. **Don't expose sensitive info in production**
5. **Use centralized error handler**
6. **Handle unhandled rejections**
7. **Validate user input**
8. **Use proper HTTP status codes**

### ❌ Don'ts

1. **Don't expose stack traces in production**
2. **Don't ignore errors silently**
3. **Don't send HTML error pages in API responses**
4. **Don't forget error handler must have 4 params**
5. **Don't handle all errors with 500 status**

## Summary

- Error-handling middleware has 4 parameters
- Use custom error classes for different error types
- Handle async errors with try-catch or wrapper
- Differentiate between development and production errors
- Log errors for debugging
- Handle unhandled rejections and exceptions
- Use proper HTTP status codes

---

[← Previous: Request & Response](./02-request-response.md) | [Next: Authentication & Authorization →](./04-auth.md)
