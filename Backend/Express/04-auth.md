# Authentication & Authorization

## Overview

Authentication verifies who you are, while authorization determines what you can do. Implementing secure authentication and authorization is crucial for backend applications and is extensively covered in interviews.

## Authentication vs Authorization

| Authentication | Authorization |
|----------------|---------------|
| Who are you? | What can you do? |
| Login process | Permission check |
| Happens first | Happens after auth |
| JWT, sessions | Roles, permissions |

## JWT Authentication

### What is JWT?

JSON Web Token (JWT) is a compact, URL-safe means of representing claims between two parties. It consists of three parts: Header, Payload, and Signature.

### JWT Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjMiLCJpYXQiOjE2MTYyMzkwMjJ9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c

Header.Payload.Signature
```

### Implementing JWT Authentication

```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// Register user
app.post('/register', asyncHandler(async (req, res) => {
  const { email, password, name } = req.body;

  // Check if user exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ValidationError('Email already registered');
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user
  const user = await User.create({
    email,
    password: hashedPassword,
    name
  });

  // Generate token
  const token = jwt.sign(
    { userId: user._id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.status(201).json({
    message: 'User registered successfully',
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name
    }
  });
}));

// Login
app.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find user
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Check password
  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Generate token
  const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );

  res.json({
    message: 'Login successful',
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    }
  });
}));
```

### Authentication Middleware

```javascript
// middleware/auth.js
const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('../errors');

const authenticate = (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach user to request
    req.user = decoded;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

module.exports = { authenticate };
```

### Using Authentication Middleware

```javascript
const { authenticate } = require('./middleware/auth');

// Protected route
app.get('/profile', authenticate, asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.userId);

  if (!user) {
    throw new NotFoundError('User not found');
  }

  res.json(user);
}));

// Update profile
app.put('/profile', authenticate, asyncHandler(async (req, res) => {
  const { name, bio } = req.body;

  const user = await User.findByIdAndUpdate(
    req.user.userId,
    { name, bio },
    { new: true, runValidators: true }
  );

  res.json(user);
}));
```

## Refresh Tokens

### Why Refresh Tokens?

- Access tokens should be short-lived (15-30 minutes)
- Refresh tokens are long-lived (7-30 days)
- Refresh tokens allow getting new access tokens without re-login

### Implementation

```javascript
const generateTokens = (user) => {
  const accessToken = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { userId: user._id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Login with refresh token
app.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const { accessToken, refreshToken } = generateTokens(user);

  // Store refresh token in database
  user.refreshToken = refreshToken;
  await user.save();

  // Send refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  });

  res.json({
    accessToken,
    user: {
      id: user._id,
      email: user.email,
      name: user.name
    }
  });
}));

// Refresh access token
app.post('/refresh', asyncHandler(async (req, res) => {
  const { refreshToken } = req.cookies;

  if (!refreshToken) {
    throw new UnauthorizedError('No refresh token');
  }

  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

  // Find user and check refresh token
  const user = await User.findById(decoded.userId);
  if (!user || user.refreshToken !== refreshToken) {
    throw new UnauthorizedError('Invalid refresh token');
  }

  // Generate new tokens
  const { accessToken, refreshToken: newRefreshToken } = generateTokens(user);

  // Update refresh token
  user.refreshToken = newRefreshToken;
  await user.save();

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });

  res.json({ accessToken });
}));

// Logout
app.post('/logout', authenticate, asyncHandler(async (req, res) => {
  // Clear refresh token from database
  await User.findByIdAndUpdate(req.user.userId, {
    refreshToken: null
  });

  // Clear cookie
  res.clearCookie('refreshToken');

  res.json({ message: 'Logged out successfully' });
}));
```

## Role-Based Authorization

### Authorization Middleware

```javascript
// middleware/authorize.js
const { ForbiddenError } = require('../errors');

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Not authenticated'));
    }

    const hasRole = allowedRoles.includes(req.user.role);

    if (!hasRole) {
      return next(new ForbiddenError('Insufficient permissions'));
    }

    next();
  };
};

module.exports = { authorize };
```

### Using Authorization

```javascript
const { authenticate } = require('./middleware/auth');
const { authorize } = require('./middleware/authorize');

// Only admins can access
app.get('/admin/users',
  authenticate,
  authorize('admin'),
  asyncHandler(async (req, res) => {
    const users = await User.find();
    res.json(users);
  })
);

// Admins and moderators can access
app.delete('/posts/:id',
  authenticate,
  authorize('admin', 'moderator'),
  asyncHandler(async (req, res) => {
    await Post.findByIdAndDelete(req.params.id);
    res.sendStatus(204);
  })
);

// Owner or admin can update
app.put('/posts/:id',
  authenticate,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);

    if (!post) {
      throw new NotFoundError('Post not found');
    }

    // Check if user is owner or admin
    const isOwner = post.author.toString() === req.user.userId;
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      throw new ForbiddenError('You can only update your own posts');
    }

    Object.assign(post, req.body);
    await post.save();

    res.json(post);
  })
);
```

## Session-Based Authentication

### Using Express-Session

```javascript
const session = require('express-session');
const MongoStore = require('connect-mongo');

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Login
app.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new UnauthorizedError('Invalid credentials');
  }

  const isValidPassword = await bcrypt.compare(password, user.password);
  if (!isValidPassword) {
    throw new UnauthorizedError('Invalid credentials');
  }

  // Store user in session
  req.session.userId = user._id;
  req.session.user = {
    id: user._id,
    email: user.email,
    name: user.name,
    role: user.role
  };

  res.json({
    message: 'Login successful',
    user: req.session.user
  });
}));

// Session auth middleware
const requireSession = (req, res, next) => {
  if (!req.session.userId) {
    return next(new UnauthorizedError('Not authenticated'));
  }
  next();
};

// Protected route
app.get('/profile', requireSession, asyncHandler(async (req, res) => {
  const user = await User.findById(req.session.userId);
  res.json(user);
}));

// Logout
app.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }

    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});
```

## OAuth 2.0 Integration

### Google OAuth with Passport

```javascript
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: '/auth/google/callback'
},
async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user exists
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      // Create new user
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName,
        avatar: profile.photos[0].value
      });
    }

    return done(null, user);
  } catch (error) {
    return done(error, null);
  }
}));

// Routes
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Generate JWT
    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.redirect(`/auth-success?token=${token}`);
  }
);
```

## Password Security

### Hashing Passwords

```javascript
const bcrypt = require('bcrypt');

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};
```

### Password Reset

```javascript
const crypto = require('crypto');

// Request password reset
app.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    // Don't reveal if user exists
    return res.json({ message: 'If email exists, reset link sent' });
  }

  // Generate reset token
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
  await user.save();

  // Send email (pseudocode)
  await sendEmail({
    to: user.email,
    subject: 'Password Reset',
    text: `Reset link: ${process.env.CLIENT_URL}/reset-password/${resetToken}`
  });

  res.json({ message: 'If email exists, reset link sent' });
}));

// Reset password
app.post('/reset-password/:token', asyncHandler(async (req, res) => {
  const { password } = req.body;

  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const user = await User.findOne({
    resetPasswordToken: hashedToken,
    resetPasswordExpires: { $gt: Date.now() }
  });

  if (!user) {
    throw new ValidationError('Invalid or expired reset token');
  }

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ message: 'Password reset successful' });
}));
```

## Interview Questions

### Q1: What is the difference between authentication and authorization?

**Answer:**
- **Authentication**: Verifies identity (who you are) - login process
- **Authorization**: Verifies permissions (what you can do) - access control

### Q2: What is JWT and how does it work?

**Answer:**
JWT (JSON Web Token) is a compact, URL-safe token format. It consists of:
- Header: Algorithm and token type
- Payload: Claims (user data)
- Signature: Verification signature

It's stateless, self-contained, and signed to prevent tampering.

### Q3: What is the difference between session-based and token-based authentication?

**Answer:**
| Session-Based | Token-Based (JWT) |
|---------------|-------------------|
| Stored on server | Stored on client |
| Stateful | Stateless |
| Single server friendly | Microservices friendly |
| Session store required | No server storage |
| Revocation easy | Revocation complex |

### Q4: How do you securely store passwords?

**Answer:**
- Use bcrypt/argon2 for hashing
- Never store plain text passwords
- Use salt (bcrypt does this automatically)
- Use high cost factor (10-12 for bcrypt)

```javascript
const hashedPassword = await bcrypt.hash(password, 10);
```

### Q5: What are refresh tokens and why use them?

**Answer:**
Refresh tokens allow obtaining new access tokens without re-login:
- Access tokens are short-lived (15-30 min)
- Refresh tokens are long-lived (7-30 days)
- Improves security (less exposure of access tokens)
- Better UX (don't need frequent logins)

## Best Practices

### ✅ Do's

1. **Use HTTPS in production**
2. **Hash passwords with bcrypt**
3. **Use environment variables for secrets**
4. **Implement rate limiting on auth endpoints**
5. **Use refresh tokens**
6. **Store tokens in HTTP-only cookies**
7. **Implement proper CORS**
8. **Use strong JWT secrets (256-bit)**

### ❌ Don'ts

1. **Don't store passwords in plain text**
2. **Don't use weak JWT secrets**
3. **Don't store sensitive data in JWT payload**
4. **Don't forget to validate input**
5. **Don't expose user existence in errors**
6. **Don't use localStorage for tokens (XSS risk)**
7. **Don't forget token expiration**

## Summary

**Core Concepts:**

1. **Authentication vs Authorization:**
   - **Authentication**: Who are you? (Login, identity verification)
   - **Authorization**: What can you do? (Permissions, access control)
   - ✅ Authentication comes first, then authorization

2. **JWT (JSON Web Tokens):**
   - ✅ Stateless authentication
   - ✅ Self-contained (payload + signature)
   - ✅ Use refresh tokens for long sessions
   - ⚠️ Don't store sensitive data in payload (it's not encrypted)

3. **Password Security:**
   - ✅ Use bcrypt with saltRounds ≥ 12
   - ❌ Never store plaintext passwords
   - ✅ Implement password strength requirements
   - ✅ Rate limit auth endpoints

4. **Token Storage:**
   - ✅ HTTP-only cookies (best for web)
   - ❌ LocalStorage (vulnerable to XSS)
   - ✅ Implement token refresh mechanism
   - ✅ Set appropriate expiration times

**Key Insights:**
> - JWT is stateless but requires refresh tokens for security
> - bcrypt with 12+ rounds is the standard for password hashing
> - HTTP-only cookies prevent XSS token theft
> - Always rate limit authentication endpoints to prevent brute force

---

[← Previous: Error Handling](./03-error-handling.md) | [Next: REST API Design →](./05-rest-api.md)
