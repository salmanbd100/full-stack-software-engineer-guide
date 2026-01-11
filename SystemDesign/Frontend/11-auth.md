# Authentication and Authorization

## Overview
Authentication verifies user identity (who you are), while authorization determines access permissions (what you can do). Proper implementation is critical for security and user experience.

## Authentication Patterns

Different approaches to user authentication from stateless tokens to session-based systems with varying security trade-offs.

### 💡 **JWT (JSON Web Tokens)**

Stateless authentication using signed tokens.

**JWT Structure:**
```
header.payload.signature

eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.     // Header
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6Ikp... // Payload
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  // Signature
```

### Token-Based Flow

Complete JWT authentication flow with access and refresh tokens for secure stateless authentication.

```javascript
// Login flow
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  const { accessToken, refreshToken } = await response.json();

  // Store tokens
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);

  return { accessToken, refreshToken };
}

// Make authenticated request
async function fetchProtectedData() {
  const token = localStorage.getItem('accessToken');

  const response = await fetch('/api/protected', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  return response.json();
}

// Refresh token when access token expires
async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('refreshToken');

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken })
  });

  const { accessToken } = await response.json();
  localStorage.setItem('accessToken', accessToken);

  return accessToken;
}

// Axios interceptor for automatic token refresh
import axios from 'axios';

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const newToken = await refreshAccessToken();
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

### Session-Based Authentication

Server maintains session state.

```javascript
// Server-side (Express)
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const redis = require('redis');

const redisClient = redis.createClient();

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // Not accessible via JavaScript
    maxAge: 24 * 60 * 60 * 1000,  // 24 hours
    sameSite: 'strict'
  }
}));

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  req.session.userId = user.id;
  res.json({ user: { id: user.id, email: user.email } });
});

// Check authentication middleware
function requireAuth(req, res, next) {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
}

// Protected route
app.get('/api/protected', requireAuth, (req, res) => {
  res.json({ data: 'Protected data' });
});

// Logout
app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ message: 'Logged out' });
});
```

### OAuth 2.0 / Social Login

Third-party authentication using providers like Google, Facebook for simplified user onboarding and security.

```javascript
// OAuth flow with Google
function GoogleLoginButton() {
  const handleGoogleLogin = () => {
    const clientId = 'YOUR_GOOGLE_CLIENT_ID';
    const redirectUri = encodeURIComponent('https://yourapp.com/auth/google/callback');
    const scope = encodeURIComponent('profile email');

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}`;

    window.location.href = authUrl;
  };

  return <button onClick={handleGoogleLogin}>Login with Google</button>;
}

// Handle callback
// /auth/google/callback
async function handleGoogleCallback(code) {
  // Exchange code for tokens
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code,
      client_id: 'YOUR_CLIENT_ID',
      client_secret: 'YOUR_CLIENT_SECRET',
      redirect_uri: 'https://yourapp.com/auth/google/callback',
      grant_type: 'authorization_code'
    })
  });

  const { access_token } = await response.json();

  // Get user info
  const userInfo = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  }).then(r => r.json());

  // Create or update user in your database
  // Generate your own JWT
  const jwt = generateJWT(userInfo);

  return jwt;
}

// Using passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: '/auth/google/callback'
  },
  async (accessToken, refreshToken, profile, done) => {
    // Find or create user
    let user = await User.findOne({ googleId: profile.id });

    if (!user) {
      user = await User.create({
        googleId: profile.id,
        email: profile.emails[0].value,
        name: profile.displayName
      });
    }

    done(null, user);
  }
));
```

## React Authentication

React-specific authentication patterns using Context API and custom hooks for global auth state management.

### Auth Context

Centralized authentication state management using React Context for app-wide user session access.

```jsx
// AuthContext.js
import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is logged in on mount
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('accessToken');

      if (!token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        // Token invalid, try refresh
        await refreshToken();
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) {
      throw new Error('Login failed');
    }

    const { user, accessToken, refreshToken } = await response.json();

    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);

    setUser(user);
    return user;
  };

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });

    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');

    setUser(null);
  };

  const refreshToken = async () => {
    const refreshToken = localStorage.getItem('refreshToken');

    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const { accessToken } = await response.json();
      localStorage.setItem('accessToken', accessToken);
      await checkAuth();
    } else {
      logout();
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

// Protected Route
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : null;
}

// Usage
function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}
```

### Login Component

Complete login form component with form validation, error handling, and navigation after authentication.

```jsx
function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid email or password');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Login</h2>

      {error && <div className="error">{error}</div>}

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />

      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
      />

      <button type="submit">Login</button>
    </form>
  );
}
```

## Authorization

Access control systems determining what authenticated users can do based on roles or attributes.

### Role-Based Access Control (RBAC)

Permission system based on predefined user roles like admin, moderator, or user for simple access control.

```javascript
// User roles
const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  MODERATOR: 'moderator'
};

// Check permissions
function hasPermission(user, permission) {
  const rolePermissions = {
    user: ['read'],
    moderator: ['read', 'write', 'delete_own'],
    admin: ['read', 'write', 'delete', 'admin']
  };

  return rolePermissions[user.role]?.includes(permission);
}

// React component with permission check
function DeleteButton({ post }) {
  const { user } = useAuth();

  const canDelete = user.id === post.authorId || hasPermission(user, 'delete');

  if (!canDelete) return null;

  return <button onClick={() => deletePost(post.id)}>Delete</button>;
}

// Route guard
function AdminRoute({ children }) {
  const { user } = useAuth();

  if (user?.role !== ROLES.ADMIN) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}

// Usage
<Route
  path="/admin"
  element={
    <ProtectedRoute>
      <AdminRoute>
        <AdminPanel />
      </AdminRoute>
    </ProtectedRoute>
  }
/>
```

### Attribute-Based Access Control (ABAC)

Fine-grained permissions based on user attributes, resource properties, and context for complex authorization scenarios.

```javascript
// More granular permissions
function canAccess(user, resource, action) {
  // Check multiple attributes
  const conditions = {
    // User can edit own posts
    editOwnPost: user.id === resource.authorId && action === 'edit',

    // Admin can do anything
    adminAccess: user.role === 'admin',

    // User can view published posts or own drafts
    viewPost: resource.status === 'published' ||
              (resource.status === 'draft' && user.id === resource.authorId),

    // User can delete posts < 24 hours old
    deleteRecent: user.id === resource.authorId &&
                  Date.now() - resource.createdAt < 24 * 60 * 60 * 1000
  };

  return Object.values(conditions).some(condition => condition);
}

// Usage
function PostActions({ post }) {
  const { user } = useAuth();

  return (
    <div>
      {canAccess(user, post, 'edit') && (
        <button onClick={() => editPost(post)}>Edit</button>
      )}

      {canAccess(user, post, 'delete') && (
        <button onClick={() => deletePost(post)}>Delete</button>
      )}
    </div>
  );
}
```

## Security Best Practices

Critical security measures to protect authentication tokens and prevent common vulnerabilities like XSS and CSRF.

### Secure Token Storage

Comparing token storage options from localStorage to httpOnly cookies for balancing convenience and security.

```javascript
// L Bad: Vulnerable to XSS
localStorage.setItem('token', accessToken);

//  Good: HttpOnly cookie (set by server)
// Server sets cookie
res.cookie('token', accessToken, {
  httpOnly: true,    // Not accessible via JavaScript
  secure: true,      // HTTPS only
  sameSite: 'strict',
  maxAge: 15 * 60 * 1000  // 15 minutes
});

// Client automatically sends cookie with requests
fetch('/api/protected', {
  credentials: 'include'  // Include cookies
});

//  Hybrid: Access token in memory, refresh token in HttpOnly cookie
class AuthService {
  constructor() {
    this.accessToken = null;
  }

  async login(email, password) {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ email, password })
    });

    const { accessToken } = await response.json();
    this.accessToken = accessToken;  // In memory only

    // Refresh token in httpOnly cookie
  }

  async makeRequest(url) {
    return fetch(url, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`
      },
      credentials: 'include'  // Send refresh token cookie
    });
  }
}
```

### CSRF Protection

Preventing Cross-Site Request Forgery attacks using CSRF tokens to validate request authenticity.

```javascript
// Server generates CSRF token
app.get('/api/csrf-token', (req, res) => {
  const token = generateCSRFToken();
  req.session.csrfToken = token;
  res.json({ csrfToken: token });
});

// Validate CSRF token
function validateCSRF(req, res, next) {
  const token = req.headers['x-csrf-token'];

  if (token !== req.session.csrfToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

// Client includes CSRF token
async function makeProtectedRequest(url, data) {
  const csrfToken = await fetch('/api/csrf-token')
    .then(r => r.json())
    .then(d => d.csrfToken);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify(data)
  });
}
```

### Password Security

Server-side password hashing with bcrypt and client-side validation for strong password requirements.

```javascript
// Server-side password hashing
const bcrypt = require('bcrypt');

// Hash password on registration
async function registerUser(email, password) {
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const user = await User.create({
    email,
    password: hashedPassword
  });

  return user;
}

// Verify password on login
async function verifyPassword(plainPassword, hashedPassword) {
  return await bcrypt.compare(plainPassword, hashedPassword);
}

// Client-side password validation
function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain number');
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain special character');
  }

  return errors;
}
```

## Multi-Factor Authentication

Adding extra security layer with TOTP-based two-factor authentication using apps like Google Authenticator.

```javascript
// Server generates TOTP secret
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

// Generate secret
app.post('/api/auth/mfa/setup', requireAuth, async (req, res) => {
  const secret = speakeasy.generateSecret({
    name: `MyApp (${req.user.email})`
  });

  // Save secret to user
  await User.updateOne(
    { id: req.user.id },
    { mfaSecret: secret.base32 }
  );

  // Generate QR code
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

  res.json({
    secret: secret.base32,
    qrCode: qrCodeUrl
  });
});

// Verify TOTP token
app.post('/api/auth/mfa/verify', requireAuth, async (req, res) => {
  const { token } = req.body;
  const user = await User.findById(req.user.id);

  const verified = speakeasy.totp.verify({
    secret: user.mfaSecret,
    encoding: 'base32',
    token
  });

  if (verified) {
    await User.updateOne(
      { id: user.id },
      { mfaEnabled: true }
    );

    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Login with MFA
app.post('/api/auth/login', async (req, res) => {
  const { email, password, mfaToken } = req.body;

  const user = await User.findOne({ email });

  if (!user || !await bcrypt.compare(password, user.password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Check if MFA enabled
  if (user.mfaEnabled) {
    if (!mfaToken) {
      return res.status(200).json({ requiresMFA: true });
    }

    const verified = speakeasy.totp.verify({
      secret: user.mfaSecret,
      encoding: 'base32',
      token: mfaToken
    });

    if (!verified) {
      return res.status(401).json({ error: 'Invalid MFA token' });
    }
  }

  // Generate JWT
  const token = generateJWT(user);
  res.json({ token, user });
});
```

## Interview Questions

**Q: What's the difference between authentication and authorization?**

A:
- **Authentication**: Verifies identity (who you are) - login with email/password
- **Authorization**: Determines permissions (what you can do) - admin can delete posts

Example: After logging in (authentication), the system checks if you're an admin (authorization) before allowing you to access admin panel.

**Q: JWT vs Session-based auth - pros and cons?**

A:
**JWT:**
-  Stateless, scalable
-  Works across domains
- L Can't invalidate before expiry
- L Larger payload in requests

**Session:**
-  Can invalidate immediately
-  Smaller payload
- L Requires server-side storage
- L Sticky sessions for load balancing

**Q: Where should you store JWTs on the client?**

A: Options ranked by security:
1. **Best**: Memory + httpOnly cookie for refresh
2. **Good**: httpOnly cookie (vulnerable to CSRF, use token)
3. **Risky**: localStorage (vulnerable to XSS)

Never store sensitive tokens in localStorage if XSS is a concern.

**Q: How do you implement token refresh?**

A: Strategies:
1. **Sliding expiration**: Extend on each request
2. **Refresh token**: Long-lived token to get new access token
3. **Silent refresh**: Background iframe request

```javascript
// Refresh before expiration
setInterval(async () => {
  const newToken = await refreshToken();
  updateToken(newToken);
}, 14 * 60 * 1000);  // Refresh every 14 min (token expires in 15)
```

## Best Practices

**Security:**
- Use HTTPS always
- Store passwords hashed (bcrypt, argon2)
- Implement rate limiting
- Use CSRF tokens
- Validate input
- Use secure, httpOnly cookies
- Implement MFA for sensitive operations

**Tokens:**
- Short-lived access tokens (15 min)
- Long-lived refresh tokens (7 days)
- Rotate refresh tokens
- Blacklist on logout
- Include minimal data in JWT

**User Experience:**
- Remember me functionality
- Password reset flow
- Social login options
- Clear error messages
- Auto-logout on inactivity

## Summary

- JWT enables stateless authentication, sessions require server storage
- Store tokens securely (httpOnly cookies or memory)
- Implement refresh tokens for better security
- RBAC for simple permissions, ABAC for complex scenarios
- Always use HTTPS and protect against XSS/CSRF
- MFA adds extra security layer for sensitive operations

---
[� Back to SystemDesign](../README.md)
