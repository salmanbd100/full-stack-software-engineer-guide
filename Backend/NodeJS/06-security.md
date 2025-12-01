# Security Best Practices

## Overview

Node.js security is critical for protecting applications from vulnerabilities. This guide covers common security threats and best practices for building secure backend applications.

## Input Validation & Sanitization

### Validate All Input

```javascript
const Joi = require('joi');

// Define validation schema
const userSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  age: Joi.number().integer().min(18).max(120)
});

// Validate input
function validateUser(userData) {
  const { error, value } = userSchema.validate(userData);

  if (error) {
    throw new ValidationError(error.details[0].message);
  }

  return value;
}

// Express middleware
function validateRequest(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);

    if (error) {
      return res.status(400).json({
        error: error.details[0].message
      });
    }

    next();
  };
}

// Usage
app.post('/users', validateRequest(userSchema), async (req, res) => {
  const user = await createUser(req.body);
  res.json(user);
});
```

### Sanitize Input

```javascript
const validator = require('validator');

// Sanitize strings
function sanitizeInput(input) {
  return {
    email: validator.normalizeEmail(input.email),
    name: validator.escape(input.name),
    url: validator.trim(input.url)
  };
}

// SQL injection prevention
const mysql = require('mysql2/promise');

// BAD: String concatenation
const userId = req.params.id;
const query = `SELECT * FROM users WHERE id = ${userId}`; // VULNERABLE!

// GOOD: Parameterized queries
const query = 'SELECT * FROM users WHERE id = ?';
const [users] = await connection.execute(query, [userId]);

// GOOD: Using ORM (Sequelize example)
const user = await User.findOne({
  where: { id: userId } // Automatically parameterized
});
```

## Authentication & Authorization

### Password Security

```javascript
const bcrypt = require('bcrypt');
const crypto = require('crypto');

// Hash passwords
async function hashPassword(password) {
  const saltRounds = 12; // Higher = more secure but slower
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

// Verify passwords
async function verifyPassword(password, hash) {
  const isValid = await bcrypt.compare(password, hash);
  return isValid;
}

// User registration
async function registerUser(userData) {
  // Validate password strength
  if (userData.password.length < 8) {
    throw new Error('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(userData.password)) {
    throw new Error('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(userData.password)) {
    throw new Error('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(userData.password)) {
    throw new Error('Password must contain number');
  }

  // Hash password
  const hashedPassword = await hashPassword(userData.password);

  // Store user
  const user = await User.create({
    ...userData,
    password: hashedPassword
  });

  return user;
}

// Login
async function loginUser(email, password) {
  const user = await User.findOne({ where: { email } });

  if (!user) {
    throw new Error('Invalid credentials');
  }

  const isValid = await verifyPassword(password, user.password);

  if (!isValid) {
    throw new Error('Invalid credentials');
  }

  return user;
}
```

### JWT Authentication

```javascript
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET; // Store in environment

// Generate JWT
function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, {
    expiresIn: '24h',
    issuer: 'your-app',
    audience: 'your-app-users'
  });

  return token;
}

// Verify JWT
function verifyToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('Token expired');
    }
    throw new Error('Invalid token');
  }
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: err.message });
  }
}

// Refresh tokens
const refreshTokens = new Map(); // Use Redis in production

function generateRefreshToken(user) {
  const refreshToken = crypto.randomBytes(40).toString('hex');

  refreshTokens.set(refreshToken, {
    userId: user.id,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  return refreshToken;
}

function refreshAccessToken(refreshToken) {
  const data = refreshTokens.get(refreshToken);

  if (!data || data.expiresAt < Date.now()) {
    throw new Error('Invalid or expired refresh token');
  }

  const user = User.findById(data.userId);
  return generateToken(user);
}
```

### Role-Based Access Control (RBAC)

```javascript
// Define roles and permissions
const ROLES = {
  ADMIN: 'admin',
  USER: 'user',
  MODERATOR: 'moderator'
};

const PERMISSIONS = {
  READ_USERS: 'read:users',
  WRITE_USERS: 'write:users',
  DELETE_USERS: 'delete:users',
  READ_POSTS: 'read:posts',
  WRITE_POSTS: 'write:posts',
  DELETE_POSTS: 'delete:posts'
};

const rolePermissions = {
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.MODERATOR]: [
    PERMISSIONS.READ_USERS,
    PERMISSIONS.READ_POSTS,
    PERMISSIONS.WRITE_POSTS,
    PERMISSIONS.DELETE_POSTS
  ],
  [ROLES.USER]: [
    PERMISSIONS.READ_POSTS,
    PERMISSIONS.WRITE_POSTS
  ]
};

// Authorization middleware
function authorize(...requiredPermissions) {
  return (req, res, next) => {
    const userRole = req.user.role;
    const userPermissions = rolePermissions[userRole] || [];

    const hasPermission = requiredPermissions.every(permission =>
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions'
      });
    }

    next();
  };
}

// Usage
app.delete('/users/:id',
  authenticateToken,
  authorize(PERMISSIONS.DELETE_USERS),
  async (req, res) => {
    await User.destroy({ where: { id: req.params.id } });
    res.json({ message: 'User deleted' });
  }
);
```

## Prevent Common Vulnerabilities

### Cross-Site Scripting (XSS)

```javascript
const helmet = require('helmet');
const express = require('express');

const app = express();

// Use Helmet to set security headers
app.use(helmet());

// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: ["'self'"],
    imgSrc: ["'self'", 'data:', 'https:']
  }
}));

// Escape output
const escapeHtml = (unsafe) => {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// Use template engines that auto-escape
// EJS, Handlebars, Pug all escape by default
```

### Cross-Site Request Forgery (CSRF)

```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

// Add CSRF token to forms
app.get('/form', (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Verify CSRF token
app.post('/process', (req, res) => {
  // Token automatically verified by middleware
  res.send('Success');
});

// For APIs, use custom headers
app.use((req, res, next) => {
  if (req.method === 'GET') {
    return next();
  }

  const token = req.headers['x-csrf-token'];
  if (!token || !validateCsrfToken(token, req.session.csrfSecret)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
});
```

### SQL Injection

Already covered in Input Validation section. Always use parameterized queries!

### NoSQL Injection

```javascript
// BAD: Vulnerable to NoSQL injection
app.post('/login', async (req, res) => {
  const user = await User.findOne({
    username: req.body.username,
    password: req.body.password
  });
  // Attacker can send: { "username": { "$gt": "" }, "password": { "$gt": "" } }
});

// GOOD: Validate and sanitize
app.post('/login', async (req, res) => {
  const { username, password } = req.body;

  // Validate types
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Invalid input' });
  }

  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  res.json({ user });
});
```

### Command Injection

```javascript
const { exec } = require('child_process');

// BAD: Command injection vulnerability
app.get('/ping', (req, res) => {
  const host = req.query.host;
  exec(`ping -c 3 ${host}`, (err, stdout) => {
    res.send(stdout);
  });
  // Attacker can send: ?host=google.com; rm -rf /
});

// GOOD: Validate input and use safer alternatives
const { execFile } = require('child_process');

app.get('/ping', (req, res) => {
  const host = req.query.host;

  // Validate input
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) {
    return res.status(400).json({ error: 'Invalid host' });
  }

  // Use execFile with arguments array
  execFile('ping', ['-c', '3', host], (err, stdout) => {
    if (err) {
      return res.status(500).json({ error: 'Ping failed' });
    }
    res.send(stdout);
  });
});
```

## Secure Dependencies

### Audit Dependencies

```bash
# Check for vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Force fix (may break things)
npm audit fix --force

# Use Snyk
npm install -g snyk
snyk test
snyk wizard
```

### Package.json Security

```json
{
  "scripts": {
    "preinstall": "npx npm-force-resolutions",
    "audit": "npm audit --audit-level=moderate"
  },
  "resolutions": {
    "lodash": "^4.17.21"
  }
}
```

## Environment Variables

### Secure Configuration

```javascript
// Use dotenv for local development
require('dotenv').config();

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
  'API_KEY'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    throw new Error(`Missing required environment variable: ${varName}`);
  }
});

// Type checking
const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  jwtSecret: process.env.JWT_SECRET,
  sessionSecret: process.env.SESSION_SECRET,
  corsOrigin: process.env.CORS_ORIGIN || '*'
};

// Never log secrets
console.log({
  ...config,
  jwtSecret: '***REDACTED***',
  databaseUrl: config.databaseUrl.replace(/:[^:@]+@/, ':***@')
});

module.exports = config;
```

### .env File

```bash
# .env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
JWT_SECRET=your-super-secret-jwt-key-change-in-production
SESSION_SECRET=your-session-secret
CORS_ORIGIN=http://localhost:3000

# NEVER commit .env to git!
# Add to .gitignore:
.env
.env.local
.env.*.local
```

## Rate Limiting

### Basic Rate Limiting

```javascript
const rateLimit = require('express-rate-limit');

// Basic rate limiter
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/', limiter);

// Stricter limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later'
});

app.post('/login', authLimiter, loginHandler);

// Custom rate limiter with Redis
const Redis = require('ioredis');
const redis = new Redis();

async function rateLimitMiddleware(req, res, next) {
  const ip = req.ip;
  const key = `rate_limit:${ip}`;

  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 60); // 1 minute window
  }

  if (current > 100) {
    return res.status(429).json({
      error: 'Rate limit exceeded'
    });
  }

  next();
}
```

## HTTPS & Security Headers

### Force HTTPS

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https' && process.env.NODE_ENV === 'production') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});

// HSTS - HTTP Strict Transport Security
app.use(helmet.hsts({
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
}));
```

### Security Headers

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
}));
```

## Logging & Monitoring

### Secure Logging

```javascript
const winston = require('winston');

// Create logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

// Redact sensitive information
const sensitiveFields = ['password', 'token', 'apiKey', 'secret'];

function redactSensitive(obj) {
  const redacted = { ...obj };

  sensitiveFields.forEach(field => {
    if (redacted[field]) {
      redacted[field] = '***REDACTED***';
    }
  });

  return redacted;
}

// Log requests
app.use((req, res, next) => {
  const logData = {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    body: redactSensitive(req.body)
  };

  logger.info('Request received', logData);
  next();
});

// Log security events
function logSecurityEvent(event, details) {
  logger.warn('Security event', {
    event,
    ...redactSensitive(details),
    timestamp: new Date().toISOString()
  });
}

// Example usage
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await loginUser(email, password);

  if (!user) {
    logSecurityEvent('failed_login', {
      email,
      ip: req.ip
    });
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  logSecurityEvent('successful_login', {
    userId: user.id,
    ip: req.ip
  });

  res.json({ token: generateToken(user) });
});
```

## Summary

**Key Security Practices:**
- Validate and sanitize all input
- Use parameterized queries (prevent SQL injection)
- Hash passwords with bcrypt (salt rounds ≥ 12)
- Use JWT for stateless authentication
- Implement RBAC for authorization
- Set security headers with Helmet
- Enable CORS properly
- Implement rate limiting
- Use HTTPS in production
- Keep dependencies updated
- Never commit secrets to git
- Log security events
- Audit code regularly

## Common Interview Questions

**Q: How do you prevent SQL injection?**
Use parameterized queries or ORMs that automatically escape input.

**Q: How do you store passwords securely?**
Hash with bcrypt (never plain text or reversible encryption). Use salt rounds ≥ 12.

**Q: What's the difference between authentication and authorization?**
- Authentication: Verifying who you are (login)
- Authorization: Verifying what you can do (permissions)

**Q: How do you implement JWT authentication?**
Generate signed tokens with user data, verify on each request, use refresh tokens for long sessions.

## Related Topics
- [Error Handling](./04-error-handling.md)
- [Express Security](../Express/06-security.md)
- [Authentication](../Security/01-jwt.md)

## Resources
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [Helmet.js Documentation](https://helmetjs.github.io/)
