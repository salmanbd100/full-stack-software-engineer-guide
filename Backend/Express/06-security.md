# Security

## Overview

Security is paramount in web applications. Understanding common vulnerabilities and how to prevent them is essential for backend developers. This topic is frequently covered in interviews, especially for mid to senior-level positions.

## Common Security Vulnerabilities (OWASP Top 10)

### 1. Injection Attacks

**SQL Injection**
```javascript
// ❌ Bad: Vulnerable to SQL injection
app.get('/users/:id', (req, res) => {
  const query = `SELECT * FROM users WHERE id = ${req.params.id}`;
  db.query(query); // Dangerous!
});

// ✅ Good: Use parameterized queries
app.get('/users/:id', (req, res) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [req.params.id]); // Safe
});

// ✅ Good: Use ORM (prevents SQL injection)
app.get('/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  res.json(user);
});
```

**NoSQL Injection**
```javascript
// ❌ Bad: Vulnerable to NoSQL injection
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email, password }); // Dangerous!
});

// Attack: POST { "email": {"$ne": null}, "password": {"$ne": null} }

// ✅ Good: Validate and sanitize input
const { body } = require('express-validator');

app.post('/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isString().trim()
  ],
  async (req, res) => {
    const { email, password } = req.body;

    // Additional type checking
    if (typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: 'Invalid input' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token...
  }
);
```

### 2. Cross-Site Scripting (XSS)

**Preventing XSS**
```javascript
const xss = require('xss');
const DOMPurify = require('isomorphic-dompurify');

// Sanitize user input
app.post('/posts', async (req, res) => {
  const { title, content } = req.body;

  // Option 1: Use xss library
  const sanitizedContent = xss(content);

  // Option 2: Use DOMPurify
  const cleanContent = DOMPurify.sanitize(content);

  const post = await Post.create({
    title,
    content: cleanContent
  });

  res.status(201).json(post);
});

// Set Content Security Policy header
const helmet = require('helmet');

app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
  }
}));
```

### 3. Cross-Site Request Forgery (CSRF)

**CSRF Protection**
```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Send CSRF token to client
app.get('/form', (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Verify CSRF token (automatic with middleware)
app.post('/transfer', (req, res) => {
  // Process transfer
  // CSRF token is automatically verified
});

// For APIs using JWT, CSRF is less of a concern
// if tokens are stored in localStorage (not cookies)
```

### 4. Insecure Authentication

**Strong Password Requirements**
```javascript
const passwordValidator = require('password-validator');

const schema = new passwordValidator();
schema
  .is().min(8)
  .is().max(100)
  .has().uppercase()
  .has().lowercase()
  .has().digits()
  .has().symbols()
  .has().not().spaces();

app.post('/register', (req, res) => {
  const { password } = req.body;

  if (!schema.validate(password)) {
    return res.status(400).json({
      error: 'Password must be 8+ characters with uppercase, lowercase, number, and symbol'
    });
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);
  // Create user...
});
```

**Account Lockout**
```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', loginLimiter, async (req, res) => {
  // Login logic...
});
```

## Security Headers

### Using Helmet

```javascript
const helmet = require('helmet');

// Use all default security headers
app.use(helmet());

// Or configure individually
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "trusted-cdn.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  frameguard: {
    action: 'deny'
  },
  noSniff: true,
  xssFilter: true
}));
```

### Important Security Headers

```javascript
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // HSTS - Force HTTPS
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' trusted-cdn.com"
  );

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Permissions Policy
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );

  next();
});
```

## CORS (Cross-Origin Resource Sharing)

### Configuring CORS

```javascript
const cors = require('cors');

// Allow all origins (development only)
app.use(cors());

// Specific origin
app.use(cors({
  origin: 'https://example.com'
}));

// Multiple origins
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400 // 24 hours
}));

// Dynamic origin checking
app.use(cors({
  origin: (origin, callback) => {
    const whitelist = process.env.CORS_WHITELIST.split(',');

    if (!origin || whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
```

## Rate Limiting

### Basic Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Global rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many authentication attempts'
});

app.post('/api/login', authLimiter, loginHandler);
app.post('/api/register', authLimiter, registerHandler);
```

### Advanced Rate Limiting with Redis

```javascript
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const redisClient = redis.createClient({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
});

const limiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rate_limit:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use(limiter);
```

## Input Validation & Sanitization

### Using Joi

```javascript
const Joi = require('joi');

const userSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  name: Joi.string().trim().min(2).max(50).required(),
  age: Joi.number().integer().min(18).max(120)
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
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

  req.body = value;
  next();
};

app.post('/api/users', validate(userSchema), createUser);
```

### Using Express-Validator

```javascript
const { body, validationResult } = require('express-validator');

app.post('/api/users',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email'),

    body('password')
      .isLength({ min: 8 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
      .withMessage('Password must contain uppercase, lowercase, number, and symbol'),

    body('name')
      .trim()
      .escape()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be 2-50 characters'),

    body('age')
      .optional()
      .isInt({ min: 18, max: 120 })
      .toInt()
  ],
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        errors: errors.array()
      });
    }

    next();
  },
  createUser
);
```

## Secure File Uploads

### File Upload Security

```javascript
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Whitelist allowed file types
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and GIF are allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 5
  }
});

app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  res.json({
    message: 'File uploaded successfully',
    filename: req.file.filename
  });
});
```

## Environment Variables & Secrets

### Using dotenv Securely

```javascript
require('dotenv').config();

// Never commit .env to version control
// Add .env to .gitignore

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'PORT'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Use strong, random secrets
// Generate JWT secret: require('crypto').randomBytes(64).toString('hex')
const JWT_SECRET = process.env.JWT_SECRET;
if (JWT_SECRET.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters');
}
```

## HTTPS & SSL/TLS

### Enforcing HTTPS

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// HSTS Header
app.use(helmet.hsts({
  maxAge: 31536000,
  includeSubDomains: true,
  preload: true
}));
```

### Setting up HTTPS Server

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem')
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

## Preventing Brute Force Attacks

### Exponential Backoff

```javascript
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Slow down responses after threshold
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 5, // Allow 5 requests per window without delay
  delayMs: 500, // Add 500ms delay per request above threshold
});

app.post('/api/login', speedLimiter, loginHandler);
```

## Security Checklist

### Production Security Checklist

```javascript
// ✅ Use HTTPS in production
// ✅ Set security headers (use Helmet)
// ✅ Implement CORS properly
// ✅ Rate limit all endpoints
// ✅ Validate and sanitize all input
// ✅ Hash passwords with bcrypt (cost factor 10+)
// ✅ Use environment variables for secrets
// ✅ Implement proper error handling
// ✅ Don't expose stack traces in production
// ✅ Keep dependencies updated
// ✅ Use parameterized queries (prevent SQL injection)
// ✅ Implement authentication & authorization
// ✅ Enable CSRF protection for cookie-based auth
// ✅ Set secure cookie flags (httpOnly, secure, sameSite)
// ✅ Implement logging and monitoring
// ✅ Regular security audits (npm audit)
// ✅ Use Content Security Policy
// ✅ Disable unnecessary HTTP methods
// ✅ Remove unnecessary dependencies
```

## Dependency Security

### Regular Audits

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities automatically
npm audit fix

# Force fix (may introduce breaking changes)
npm audit fix --force

# Check for outdated packages
npm outdated

# Update packages
npm update
```

### Using Snyk

```bash
# Install Snyk
npm install -g snyk

# Authenticate
snyk auth

# Test for vulnerabilities
snyk test

# Monitor project
snyk monitor
```

## Interview Questions

### Q1: What is XSS and how do you prevent it?

**Answer:**
Cross-Site Scripting (XSS) is injecting malicious scripts into web pages. Prevention:
- Sanitize user input
- Use Content Security Policy headers
- Escape output
- Use secure libraries (DOMPurify, xss)

### Q2: What is SQL Injection and how do you prevent it?

**Answer:**
SQL Injection is inserting malicious SQL code. Prevention:
- Use parameterized queries
- Use ORM/ODM
- Validate and sanitize input
- Principle of least privilege for DB user

### Q3: What security headers should you set?

**Answer:**
Essential headers:
- X-Frame-Options (prevent clickjacking)
- X-Content-Type-Options (prevent MIME sniffing)
- Strict-Transport-Security (force HTTPS)
- Content-Security-Policy (XSS protection)
- X-XSS-Protection

Use Helmet.js to set them all.

### Q4: How do you securely store passwords?

**Answer:**
- Never store plain text
- Use bcrypt/argon2 for hashing
- Use salt (bcrypt does automatically)
- Use high cost factor (10-12 for bcrypt)

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

### Q5: What is CORS and why is it important?

**Answer:**
CORS (Cross-Origin Resource Sharing) controls which origins can access your API. Important for:
- Preventing unauthorized access
- Security by restricting origins
- Allowing legitimate cross-origin requests

## Best Practices

### ✅ Do's

1. **Always use HTTPS in production**
2. **Set security headers with Helmet**
3. **Validate and sanitize all input**
4. **Hash passwords with bcrypt**
5. **Use environment variables for secrets**
6. **Implement rate limiting**
7. **Keep dependencies updated**
8. **Use parameterized queries**

### ❌ Don'ts

1. **Don't store passwords in plain text**
2. **Don't expose stack traces in production**
3. **Don't trust user input**
4. **Don't commit secrets to version control**
5. **Don't use weak JWT secrets**
6. **Don't allow unlimited file uploads**
7. **Don't ignore security warnings**

## Summary

- Security is paramount in web applications
- Prevent common vulnerabilities (XSS, SQL injection, CSRF)
- Use Helmet for security headers
- Implement proper CORS configuration
- Rate limit all endpoints
- Validate and sanitize all input
- Hash passwords with bcrypt
- Use HTTPS in production
- Keep dependencies updated
- Regular security audits

---

[← Previous: REST API Design](./05-rest-api.md) | [Next: File Handling →](./07-file-handling.md)
