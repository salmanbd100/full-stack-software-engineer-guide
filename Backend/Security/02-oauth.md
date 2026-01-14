# OAuth 2.0

## Overview

**OAuth 2.0** is an authorization framework that enables applications to obtain limited access to user accounts on an HTTP service without exposing user credentials. It's the industry-standard protocol for authorization used by Google, Facebook, GitHub, and most modern APIs.

**Key Principle:** OAuth provides secure delegated access - allowing third-party applications to access user resources without sharing passwords.

---

## 🔑 What is OAuth 2.0?

### 💡 **OAuth 2.0 Fundamentals**

OAuth 2.0 is about **authorization**, not authentication (that's OpenID Connect).

**Core Concept:**
- User wants to use App A
- App A needs access to User's data on App B
- User grants App A limited access without sharing password

**Real-World Example:**
> You want to use a photo printing service. Instead of giving them your Google password, you authorize them to access only your Google Photos through OAuth.

---

## 👥 OAuth Roles

### Key Participants

| Role | Description | Example |
|------|-------------|---------|
| **Resource Owner** | User who owns the data | You (your Google account) |
| **Client** | Application requesting access | Photo printing app |
| **Resource Server** | API serving protected resources | Google Photos API |
| **Authorization Server** | Issues access tokens | Google OAuth server |

---

## 🔄 OAuth 2.0 Flow

### Authorization Code Flow (Most Common)

```
┌─────────────┐                                  ┌──────────────┐
│   Client    │                                  │     User     │
│ Application │                                  │   Browser    │
└─────────────┘                                  └──────────────┘
       │                                                 │
       │ 1. Redirect to authorization server            │
       ├────────────────────────────────────────────────▶
       │    with client_id, redirect_uri, scope         │
       │                                                 │
       │                            ┌────────────────────┤
       │                            │ 2. User authenticates
       │                            │    and grants permission
       │                            └────────────────────▶
       │                                                 │
       │ 3. Redirect back with authorization code       │
       ◀────────────────────────────────────────────────┤
       │                                                 │
       │                                                 │
       │ 4. Exchange code for access token              │
       ├──────────────────────────────────────┐         │
       │    POST /token                        │         │
       │    code + client_secret               │         │
       │                                       │         │
       │ 5. Returns access_token               │         │
       ◀──────────────────────────────────────┘         │
       │                                                 │
       │ 6. Use access_token to call API                │
       ├──────────────────────────────────────┐         │
       │    Authorization: Bearer token        │         │
       │                                       │         │
       │ 7. Returns protected resource         │         │
       ◀──────────────────────────────────────┘         │
```

**Step-by-Step:**

**Step 1: Authorization Request**
```
GET https://oauth-provider.com/oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  scope=read:user read:email&
  state=random_string_for_csrf_protection
```

**Step 2: User Grants Permission**
- User logs into OAuth provider (Google, GitHub, etc.)
- Reviews requested permissions
- Approves or denies access

**Step 3: Authorization Code Returned**
```
GET https://yourapp.com/callback?
  code=AUTHORIZATION_CODE&
  state=random_string_for_csrf_protection
```

**Step 4: Exchange Code for Token**
```bash
POST https://oauth-provider.com/oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
redirect_uri=https://yourapp.com/callback&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET
```

**Step 5: Receive Access Token**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "refresh_token_here",
  "scope": "read:user read:email"
}
```

**Step 6: Access Protected Resources**
```bash
GET https://api.oauth-provider.com/user
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🛠 Implementation (Node.js + Express)

### 1. Setup OAuth Client

```bash
npm install express axios dotenv
```

**Environment Variables (.env):**
```env
# GitHub OAuth Example
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
CALLBACK_URL=http://localhost:3000/auth/github/callback
SESSION_SECRET=your_session_secret
```

### 2. Basic OAuth Implementation

```javascript
const express = require('express');
const axios = require('axios');
require('dotenv').config();

const app = express();

// Store user sessions (use Redis in production)
const sessions = new Map();

// GitHub OAuth URLs
const GITHUB_AUTH_URL = 'https://github.com/login/oauth/authorize';
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const GITHUB_API_URL = 'https://api.github.com';

// Step 1: Redirect to OAuth provider
app.get('/auth/github', (req, res) => {
  // Generate random state for CSRF protection
  const state = Math.random().toString(36).substring(7);

  // Store state in session
  sessions.set('oauth_state', state);

  const authUrl = `${GITHUB_AUTH_URL}?` +
    `client_id=${process.env.GITHUB_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(process.env.CALLBACK_URL)}&` +
    `scope=read:user user:email&` +
    `state=${state}`;

  res.redirect(authUrl);
});

// Step 2 & 3: Handle callback with authorization code
app.get('/auth/github/callback', async (req, res) => {
  const { code, state } = req.query;

  // Verify state to prevent CSRF
  const storedState = sessions.get('oauth_state');
  if (!state || state !== storedState) {
    return res.status(403).json({ error: 'Invalid state parameter' });
  }

  try {
    // Step 4: Exchange code for access token
    const tokenResponse = await axios.post(
      GITHUB_TOKEN_URL,
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.CALLBACK_URL,
      },
      {
        headers: { Accept: 'application/json' },
      }
    );

    const { access_token, token_type, scope } = tokenResponse.data;

    if (!access_token) {
      return res.status(401).json({ error: 'Failed to obtain access token' });
    }

    // Step 5: Use access token to fetch user data
    const userResponse = await axios.get(`${GITHUB_API_URL}/user`, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        Accept: 'application/json',
      },
    });

    const user = userResponse.data;

    // Create session for user
    const sessionId = Math.random().toString(36).substring(7);
    sessions.set(sessionId, {
      userId: user.id,
      username: user.login,
      email: user.email,
      accessToken: access_token,
    });

    // Set session cookie
    res.cookie('sessionId', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Redirect to dashboard or send user data
    res.json({
      message: 'Authentication successful',
      user: {
        id: user.id,
        username: user.login,
        email: user.email,
        avatar: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('OAuth error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Protected route example
app.get('/api/user', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  res.json({
    userId: session.userId,
    username: session.username,
    email: session.email,
  });
});

// Logout
app.post('/auth/logout', (req, res) => {
  const sessionId = req.cookies?.sessionId;
  sessions.delete(sessionId);
  res.clearCookie('sessionId');
  res.json({ message: 'Logged out successfully' });
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

---

## 🔐 Complete OAuth Implementation with Database

### User Model (Mongoose)

```javascript
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  name: String,
  avatar: String,
  oauthProviders: [
    {
      provider: {
        type: String,
        enum: ['github', 'google', 'facebook'],
        required: true,
      },
      providerId: {
        type: String,
        required: true,
      },
      accessToken: String,
      refreshToken: String,
      tokenExpiresAt: Date,
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Find or create user by OAuth provider
userSchema.statics.findOrCreateByOAuth = async function (
  provider,
  profile
) {
  let user = await this.findOne({
    'oauthProviders.provider': provider,
    'oauthProviders.providerId': profile.id,
  });

  if (!user) {
    user = await this.create({
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      oauthProviders: [
        {
          provider,
          providerId: profile.id,
        },
      ],
    });
  }

  return user;
};

module.exports = mongoose.model('User', userSchema);
```

### OAuth Service

```javascript
const axios = require('axios');
const User = require('./models/User');

class OAuthService {
  constructor() {
    this.providers = {
      github: {
        authUrl: 'https://github.com/login/oauth/authorize',
        tokenUrl: 'https://github.com/login/oauth/access_token',
        userUrl: 'https://api.github.com/user',
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        scope: 'read:user user:email',
      },
      google: {
        authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenUrl: 'https://oauth2.googleapis.com/token',
        userUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        scope: 'profile email',
      },
    };
  }

  // Generate authorization URL
  getAuthorizationUrl(provider, callbackUrl, state) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: config.scope,
      state,
    });

    return `${config.authUrl}?${params.toString()}`;
  }

  // Exchange authorization code for access token
  async getAccessToken(provider, code, callbackUrl) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    try {
      const response = await axios.post(
        config.tokenUrl,
        {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: callbackUrl,
          grant_type: 'authorization_code',
        },
        {
          headers: { Accept: 'application/json' },
        }
      );

      return response.data;
    } catch (error) {
      console.error('Token exchange error:', error.response?.data);
      throw new Error('Failed to exchange authorization code');
    }
  }

  // Fetch user profile from OAuth provider
  async getUserProfile(provider, accessToken) {
    const config = this.providers[provider];
    if (!config) {
      throw new Error(`Unknown OAuth provider: ${provider}`);
    }

    try {
      const response = await axios.get(config.userUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      // Normalize user data across providers
      return this.normalizeUserProfile(provider, response.data);
    } catch (error) {
      console.error('User profile error:', error.response?.data);
      throw new Error('Failed to fetch user profile');
    }
  }

  // Normalize user profile data across different providers
  normalizeUserProfile(provider, profile) {
    switch (provider) {
      case 'github':
        return {
          id: profile.id.toString(),
          email: profile.email,
          name: profile.name || profile.login,
          avatar: profile.avatar_url,
        };
      case 'google':
        return {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          avatar: profile.picture,
        };
      default:
        return profile;
    }
  }

  // Complete OAuth flow
  async authenticate(provider, code, callbackUrl) {
    // Exchange code for token
    const tokenData = await this.getAccessToken(provider, code, callbackUrl);
    const { access_token, refresh_token, expires_in } = tokenData;

    // Get user profile
    const profile = await this.getUserProfile(provider, access_token);

    // Find or create user in database
    const user = await User.findOrCreateByOAuth(provider, profile);

    // Update OAuth tokens
    const oauthProvider = user.oauthProviders.find(
      (p) => p.provider === provider
    );

    if (oauthProvider) {
      oauthProvider.accessToken = access_token;
      oauthProvider.refreshToken = refresh_token;
      oauthProvider.tokenExpiresAt = expires_in
        ? new Date(Date.now() + expires_in * 1000)
        : null;
    }

    await user.save();

    return user;
  }
}

module.exports = new OAuthService();
```

### OAuth Routes

```javascript
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const oauthService = require('../services/OAuthService');

// Generate state for CSRF protection
const generateState = () => {
  return Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
};

// Store states temporarily (use Redis in production)
const states = new Map();

// Start OAuth flow
router.get('/auth/:provider', (req, res) => {
  const { provider } = req.params;
  const state = generateState();

  // Store state with 5-minute expiration
  states.set(state, { provider, createdAt: Date.now() });
  setTimeout(() => states.delete(state), 5 * 60 * 1000);

  const callbackUrl = `${req.protocol}://${req.get('host')}/auth/${provider}/callback`;
  const authUrl = oauthService.getAuthorizationUrl(provider, callbackUrl, state);

  res.redirect(authUrl);
});

// OAuth callback
router.get('/auth/:provider/callback', async (req, res) => {
  const { provider } = req.params;
  const { code, state } = req.query;

  // Verify state (CSRF protection)
  const storedState = states.get(state);
  if (!storedState || storedState.provider !== provider) {
    return res.status(403).json({ error: 'Invalid state parameter' });
  }

  // Check state expiration (5 minutes)
  if (Date.now() - storedState.createdAt > 5 * 60 * 1000) {
    states.delete(state);
    return res.status(403).json({ error: 'State expired' });
  }

  states.delete(state);

  try {
    const callbackUrl = `${req.protocol}://${req.get('host')}/auth/${provider}/callback`;

    // Complete OAuth authentication
    const user = await oauthService.authenticate(provider, code, callbackUrl);

    // Generate JWT for session
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Redirect to frontend
    res.redirect(`${process.env.FRONTEND_URL}/dashboard`);
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.redirect(`${process.env.FRONTEND_URL}/login?error=auth_failed`);
  }
});

module.exports = router;
```

---

## 🎯 OAuth 2.0 Grant Types

### 1. Authorization Code Flow

**Use Case:** Server-side web applications

**Characteristics:**
- Most secure
- Uses server-side secret
- Two-step process (code → token)

```javascript
// Step 1: Get authorization code
GET /oauth/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=CALLBACK_URL

// Step 2: Exchange code for token (server-side)
POST /oauth/token
  grant_type=authorization_code&
  code=AUTH_CODE&
  client_secret=SECRET
```

### 2. Implicit Flow (Deprecated)

**Use Case:** ~~Single Page Applications~~ (now deprecated)

**Why Deprecated:**
- Tokens exposed in URL
- No refresh token
- Less secure

**Use Authorization Code + PKCE instead**

### 3. Client Credentials Flow

**Use Case:** Server-to-server communication (no user involved)

```javascript
// Machine-to-machine authentication
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id=CLIENT_ID&
client_secret=CLIENT_SECRET&
scope=api:read api:write
```

**Example:**
```javascript
const axios = require('axios');

async function getServiceToken() {
  const response = await axios.post(
    'https://api.example.com/oauth/token',
    {
      grant_type: 'client_credentials',
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      scope: 'api:read api:write',
    }
  );

  return response.data.access_token;
}

// Use token to call API
async function callAPI() {
  const token = await getServiceToken();

  const response = await axios.get('https://api.example.com/data', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return response.data;
}
```

### 4. Resource Owner Password Credentials (Legacy)

**Use Case:** ⚠️ Only for trusted first-party applications

**Why Avoid:**
- User shares password with client
- Defeats OAuth purpose
- Only use when other flows aren't possible

```javascript
// ❌ Not recommended
POST /oauth/token
  grant_type=password&
  username=user@example.com&
  password=user_password&
  client_id=CLIENT_ID
```

### 5. Authorization Code + PKCE

**Use Case:** Mobile apps and Single Page Applications

**PKCE (Proof Key for Code Exchange):** Prevents authorization code interception

```javascript
// Generate code verifier and challenge
const crypto = require('crypto');

function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

// Step 1: Authorization request with PKCE
const codeVerifier = generateCodeVerifier();
const codeChallenge = generateCodeChallenge(codeVerifier);

// Store code_verifier for later use
sessionStorage.setItem('code_verifier', codeVerifier);

const authUrl = `https://oauth-provider.com/authorize?` +
  `response_type=code&` +
  `client_id=CLIENT_ID&` +
  `redirect_uri=CALLBACK_URL&` +
  `code_challenge=${codeChallenge}&` +
  `code_challenge_method=S256`;

// Step 2: Token request with code_verifier
const response = await axios.post('https://oauth-provider.com/token', {
  grant_type: 'authorization_code',
  code: authorizationCode,
  redirect_uri: CALLBACK_URL,
  client_id: CLIENT_ID,
  code_verifier: codeVerifier,  // Proves you initiated the request
});
```

---

## 🔒 Security Best Practices

### 1. Always Use State Parameter

**Prevent CSRF attacks:**

```javascript
// ✅ GOOD: Generate random state
const state = crypto.randomBytes(16).toString('hex');
sessionStorage.setItem('oauth_state', state);

// Include in authorization request
const authUrl = `${AUTH_URL}?state=${state}&...`;

// Verify in callback
const receivedState = req.query.state;
const expectedState = sessionStorage.getItem('oauth_state');

if (receivedState !== expectedState) {
  throw new Error('CSRF attack detected');
}
```

### 2. Use HTTPS Only

```javascript
// ✅ Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
  return res.redirect('https://' + req.get('host') + req.url);
}
```

### 3. Validate Redirect URIs

```javascript
// ✅ Whitelist allowed redirect URIs
const ALLOWED_REDIRECT_URIS = [
  'https://yourapp.com/auth/callback',
  'https://app.yourapp.com/auth/callback',
];

function validateRedirectUri(uri) {
  return ALLOWED_REDIRECT_URIS.includes(uri);
}

// In authorization endpoint
if (!validateRedirectUri(req.query.redirect_uri)) {
  return res.status(400).json({ error: 'Invalid redirect_uri' });
}
```

### 4. Implement Token Expiration

```javascript
// ✅ Short-lived access tokens
const accessToken = jwt.sign(payload, SECRET, { expiresIn: '1h' });

// ✅ Long-lived refresh tokens
const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '30d' });

// Store refresh token in database for revocation
await TokenModel.create({
  userId: user.id,
  refreshToken,
  expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
});
```

### 5. Rotate Refresh Tokens

```javascript
// ✅ Issue new refresh token on each use
app.post('/oauth/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  // Verify old refresh token
  const decoded = jwt.verify(refresh_token, REFRESH_SECRET);

  // Check if token exists and not used
  const storedToken = await TokenModel.findOne({
    refreshToken: refresh_token,
    used: false,
  });

  if (!storedToken) {
    // Possible token reuse attack - invalidate all tokens for user
    await TokenModel.deleteMany({ userId: decoded.userId });
    return res.status(401).json({ error: 'Invalid refresh token' });
  }

  // Mark old token as used
  storedToken.used = true;
  await storedToken.save();

  // Issue new tokens
  const newAccessToken = jwt.sign(
    { userId: decoded.userId },
    SECRET,
    { expiresIn: '1h' }
  );

  const newRefreshToken = jwt.sign(
    { userId: decoded.userId },
    REFRESH_SECRET,
    { expiresIn: '30d' }
  );

  // Store new refresh token
  await TokenModel.create({
    userId: decoded.userId,
    refreshToken: newRefreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  res.json({
    access_token: newAccessToken,
    refresh_token: newRefreshToken,
  });
});
```

### 6. Limit Scope

```javascript
// ❌ BAD: Requesting too many permissions
scope: 'read:user write:user delete:user admin:org'

// ✅ GOOD: Request only necessary permissions
scope: 'read:user user:email'
```

### 7. Secure Token Storage

```javascript
// ❌ BAD: Store tokens in localStorage
localStorage.setItem('access_token', token);

// ✅ GOOD: Store in httpOnly cookies
res.cookie('access_token', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 3600000,
});
```

---

## 🔄 Token Refresh Implementation

```javascript
const axios = require('axios');

class TokenManager {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
    this.expiresAt = null;
  }

  // Set tokens after OAuth login
  setTokens(accessToken, refreshToken, expiresIn) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.expiresAt = Date.now() + expiresIn * 1000;
  }

  // Check if access token is expired
  isAccessTokenExpired() {
    if (!this.expiresAt) return true;
    return Date.now() >= this.expiresAt - 60000; // Refresh 1 min before expiry
  }

  // Refresh access token
  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post('https://oauth-provider.com/token', {
        grant_type: 'refresh_token',
        refresh_token: this.refreshToken,
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
      });

      const { access_token, refresh_token, expires_in } = response.data;

      this.setTokens(
        access_token,
        refresh_token || this.refreshToken,
        expires_in
      );

      return access_token;
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw new Error('Failed to refresh token');
    }
  }

  // Get valid access token (refresh if needed)
  async getValidAccessToken() {
    if (this.isAccessTokenExpired()) {
      return await this.refreshAccessToken();
    }
    return this.accessToken;
  }

  // Make authenticated API request
  async makeAuthenticatedRequest(url, options = {}) {
    const token = await this.getValidAccessToken();

    return axios({
      url,
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`,
      },
    });
  }
}

// Usage
const tokenManager = new TokenManager();

// After OAuth login
tokenManager.setTokens(accessToken, refreshToken, 3600);

// Make API requests (automatically refreshes if needed)
const userData = await tokenManager.makeAuthenticatedRequest(
  'https://api.example.com/user'
);
```

---

## 📚 OAuth vs JWT vs Sessions

| Feature | OAuth 2.0 | JWT | Sessions |
|---------|-----------|-----|----------|
| **Purpose** | Authorization | Authentication/Authorization | Authentication |
| **Use Case** | Third-party access | Stateless auth | Traditional apps |
| **Tokens** | Access + Refresh | Self-contained | Session ID |
| **Stateless** | No (needs token store) | Yes | No |
| **Revocation** | Yes (revoke tokens) | Hard (needs blacklist) | Easy |
| **Complexity** | High | Medium | Low |
| **Cross-domain** | Excellent | Good | Difficult |

**When to Use Each:**

**OAuth 2.0:**
- ✅ Third-party integrations ("Login with Google")
- ✅ API access delegation
- ✅ Microservices communication
- ✅ Mobile apps

**JWT:**
- ✅ Stateless authentication
- ✅ Single Page Applications
- ✅ Microservices auth
- ✅ Mobile apps

**Sessions:**
- ✅ Traditional server-rendered apps
- ✅ Simple authentication needs
- ✅ Immediate token revocation required

---

## 📚 Interview Questions

### Q1: What is OAuth 2.0 and how does it work?

**Answer:**

OAuth 2.0 is an authorization framework that allows third-party applications to access user resources without exposing credentials. It's about **authorization**, not authentication.

**How it works:**

1. **User Initiates:** Clicks "Login with Google" on your app
2. **Redirect to Provider:** App redirects to Google's authorization server
3. **User Authenticates:** User logs into Google and grants permissions
4. **Authorization Code:** Google redirects back with authorization code
5. **Token Exchange:** App exchanges code for access token (server-side with secret)
6. **Access Resources:** App uses access token to call Google APIs

**Key Components:**
- **Authorization Server:** Issues tokens (Google)
- **Resource Server:** Hosts protected resources (Google Photos API)
- **Client:** Third-party app requesting access
- **Resource Owner:** User who owns the data

**Example:**
```javascript
// Step 1: Redirect to Google
GET https://accounts.google.com/o/oauth2/v2/auth?
  client_id=YOUR_CLIENT_ID&
  redirect_uri=https://yourapp.com/callback&
  response_type=code&
  scope=profile email

// Step 2: User grants permission

// Step 3: Google redirects back
GET https://yourapp.com/callback?code=AUTH_CODE

// Step 4: Exchange code for token
POST https://oauth2.googleapis.com/token
{
  "code": "AUTH_CODE",
  "client_id": "YOUR_CLIENT_ID",
  "client_secret": "SECRET",
  "redirect_uri": "https://yourapp.com/callback",
  "grant_type": "authorization_code"
}

// Step 5: Use access token
GET https://www.googleapis.com/oauth2/v1/userinfo
Authorization: Bearer ACCESS_TOKEN
```

---

### Q2: What's the difference between OAuth 2.0 and OpenID Connect?

**Answer:**

**OAuth 2.0:**
- **Purpose:** Authorization (what can you access?)
- **Gives:** Access token
- **Use case:** Grant limited access to resources
- **Example:** "Let photo app access your Google Photos"

**OpenID Connect (OIDC):**
- **Purpose:** Authentication (who are you?)
- **Gives:** ID token (JWT with user info)
- **Built on:** OAuth 2.0 (adds authentication layer)
- **Use case:** User login/identity verification
- **Example:** "Login with Google" to prove identity

**Key Differences:**

| Feature | OAuth 2.0 | OpenID Connect |
|---------|-----------|----------------|
| **Token Type** | Access Token | ID Token (JWT) + Access Token |
| **Purpose** | Authorization | Authentication |
| **User Info** | No standard way | Standardized (ID token) |
| **Use Case** | API access | User login |

**OpenID Connect = OAuth 2.0 + Authentication Layer**

```javascript
// OAuth 2.0 (authorization)
// Access token - opaque string
{
  "access_token": "ya29.a0AfH6SMBx...",
  "token_type": "Bearer",
  "expires_in": 3600
}

// OpenID Connect (authentication)
// ID token - JWT with user info
{
  "access_token": "ya29.a0AfH6SMBx...",
  "id_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",  // JWT
  "token_type": "Bearer",
  "expires_in": 3600
}

// Decoded ID token
{
  "sub": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "picture": "https://example.com/photo.jpg",
  "iss": "https://accounts.google.com",
  "aud": "your-client-id",
  "exp": 1616239022
}
```

**When to Use:**
- **OAuth 2.0:** Accessing user's resources (photos, emails, calendar)
- **OpenID Connect:** User login/authentication

---

### Q3: Explain the Authorization Code flow vs Implicit flow.

**Answer:**

**Authorization Code Flow (Recommended):**

**How it works:**
1. User redirected to authorization server
2. User grants permission
3. Authorization server redirects back with **code**
4. Client exchanges code for token (server-side with secret)
5. Client uses access token

**Characteristics:**
- ✅ Most secure
- ✅ Token never exposed to browser
- ✅ Uses client secret (server-side)
- ✅ Can issue refresh tokens
- ✅ Two-step process (code → token)

**Use case:** Server-side web applications

```javascript
// Step 1: Get code
GET /oauth/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=https://app.com/callback

// Step 2: Exchange code for token (server-side)
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "client_id": "CLIENT_ID",
  "client_secret": "SECRET"  // Secret used here
}
```

**Implicit Flow (Deprecated):**

**How it works:**
1. User redirected to authorization server
2. User grants permission
3. Authorization server redirects with **access token in URL**

**Characteristics:**
- ❌ Less secure
- ❌ Token exposed in URL/browser history
- ❌ No client secret (client-side only)
- ❌ No refresh tokens
- ❌ One-step process (direct token)

**Use case:** ~~SPAs~~ (deprecated - use Authorization Code + PKCE instead)

```javascript
// Gets token directly in redirect
GET https://app.com/callback#
  access_token=TOKEN&
  token_type=bearer&
  expires_in=3600
```

**Why Implicit Flow is Deprecated:**
1. **URL Exposure:** Token visible in browser history
2. **No Refresh:** Can't refresh tokens securely
3. **XSS Risk:** Token accessible to JavaScript

**Modern Replacement: Authorization Code + PKCE**

**PKCE (Proof Key for Code Exchange):**
- Adds code challenge/verifier
- Prevents code interception
- No client secret needed
- Secure for SPAs and mobile apps

```javascript
// Step 1: Generate PKCE values
const codeVerifier = generateRandomString();
const codeChallenge = sha256(codeVerifier);

// Step 2: Authorization request
GET /oauth/authorize?
  response_type=code&
  code_challenge=CHALLENGE&
  code_challenge_method=S256

// Step 3: Token exchange (proves you started the flow)
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "code_verifier": "VERIFIER"  // Proves ownership
}
```

**Summary:**
- **Authorization Code:** Secure, uses secret, for server-side apps
- **Implicit:** Deprecated, insecure, don't use
- **Authorization Code + PKCE:** Modern replacement for SPAs/mobile

---

### Q4: How do you secure OAuth implementations?

**Answer:**

**1. Always Use State Parameter (CSRF Protection)**

```javascript
// ✅ Generate random state
const state = crypto.randomBytes(16).toString('hex');
sessionStorage.setItem('oauth_state', state);

// Include in auth request
const authUrl = `${AUTH_URL}?state=${state}&...`;

// Verify in callback
if (req.query.state !== sessionStorage.getItem('oauth_state')) {
  throw new Error('CSRF attack detected');
}
```

**2. Validate Redirect URIs**

```javascript
// ✅ Whitelist exact URLs (no wildcards)
const ALLOWED_REDIRECTS = [
  'https://app.example.com/callback',
  'https://app.example.com/auth/google/callback',
];

if (!ALLOWED_REDIRECTS.includes(redirectUri)) {
  return res.status(400).json({ error: 'Invalid redirect_uri' });
}
```

**3. Use HTTPS Only**

```javascript
// ✅ Enforce HTTPS in production
if (process.env.NODE_ENV === 'production' && req.protocol !== 'https') {
  return res.redirect('https://' + req.get('host') + req.url);
}

// ✅ HTTPS-only cookies
res.cookie('token', token, {
  httpOnly: true,
  secure: true,  // HTTPS only
  sameSite: 'strict',
});
```

**4. Short-Lived Access Tokens**

```javascript
// ✅ Access tokens: 15 min to 1 hour
const accessToken = jwt.sign(payload, SECRET, { expiresIn: '15m' });

// ✅ Refresh tokens: 7 to 30 days
const refreshToken = jwt.sign(payload, REFRESH_SECRET, { expiresIn: '7d' });
```

**5. Rotate Refresh Tokens**

```javascript
// ✅ Issue new refresh token on each use
// If old token is reused → revoke all tokens (attack detected)
```

**6. Limit Scope**

```javascript
// ❌ BAD: Request too many permissions
scope: 'read write delete admin'

// ✅ GOOD: Minimum necessary
scope: 'read:user user:email'
```

**7. Secure Token Storage**

```javascript
// ❌ BAD: localStorage (XSS vulnerable)
localStorage.setItem('token', token);

// ✅ GOOD: httpOnly cookies
res.cookie('token', token, {
  httpOnly: true,  // Not accessible by JavaScript
  secure: true,
  sameSite: 'strict',
});
```

**8. Implement Rate Limiting**

```javascript
// ✅ Prevent brute force attacks
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many requests',
});

app.post('/oauth/token', limiter, tokenHandler);
```

**9. Validate Tokens Properly**

```javascript
// ✅ Verify signature, expiration, audience
jwt.verify(token, SECRET, {
  algorithms: ['RS256'],
  issuer: 'https://oauth-provider.com',
  audience: 'your-client-id',
});
```

**10. Monitor for Suspicious Activity**

```javascript
// ✅ Log failed attempts, unusual patterns
logger.warn('Failed OAuth attempt', {
  ip: req.ip,
  userId: userId,
  provider: provider,
  timestamp: Date.now(),
});
```

**Key Takeaways:**
- Always use state parameter
- Validate redirect URIs strictly
- Use HTTPS everywhere
- Implement token rotation
- Limit scopes to minimum needed
- Never store tokens in localStorage

---

### Q5: What is PKCE and why is it important?

**Answer:**

**PKCE (Proof Key for Code Exchange):** Security extension for OAuth 2.0 that prevents authorization code interception attacks.

**The Problem PKCE Solves:**

In mobile apps and SPAs, authorization codes can be intercepted by malicious apps:

```
1. Legitimate app starts OAuth flow
2. Malicious app intercepts authorization code
3. Malicious app exchanges code for token
4. Malicious app gains access to user's resources
```

**How PKCE Works:**

**Step 1: Generate Code Verifier and Challenge**

```javascript
const crypto = require('crypto');

// Generate random code_verifier (43-128 characters)
function generateCodeVerifier() {
  return crypto.randomBytes(32).toString('base64url');
}

// Generate code_challenge from verifier
function generateCodeChallenge(verifier) {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}

// Example
const codeVerifier = generateCodeVerifier();
// "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"

const codeChallenge = generateCodeChallenge(codeVerifier);
// "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
```

**Step 2: Authorization Request (with challenge)**

```javascript
// Client sends code_challenge (not verifier!)
GET /oauth/authorize?
  response_type=code&
  client_id=CLIENT_ID&
  redirect_uri=https://app.com/callback&
  code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM&
  code_challenge_method=S256  // SHA-256 hashing
```

**Step 3: Token Request (with verifier)**

```javascript
// Client sends code_verifier to prove it started the flow
POST /oauth/token
{
  "grant_type": "authorization_code",
  "code": "AUTH_CODE",
  "redirect_uri": "https://app.com/callback",
  "client_id": "CLIENT_ID",
  "code_verifier": "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"
}

// Server verifies: sha256(code_verifier) === code_challenge
```

**Why It's Secure:**

1. **Code Verifier Stays on Client:** Never leaves the device
2. **Code Challenge Public:** Safe to send, can't reverse to verifier
3. **Proof of Ownership:** Only client with verifier can exchange code
4. **Prevents Interception:** Intercepted code is useless without verifier

**Attack Scenario Prevented:**

```
❌ Without PKCE:
1. Malicious app intercepts authorization code
2. Exchanges code for token ✓ (succeeds)
3. Gains unauthorized access

✅ With PKCE:
1. Malicious app intercepts authorization code
2. Tries to exchange code for token
3. Server: "Prove you started this flow (send code_verifier)"
4. Malicious app: Can't - doesn't have verifier
5. Token exchange fails ✓ (attack prevented)
```

**When to Use PKCE:**

✅ **Always use in:**
- Mobile applications (iOS, Android)
- Single Page Applications (SPAs)
- Desktop applications
- Any public client (no client secret)

✅ **Also recommended for:**
- Server-side apps (additional security layer)

**Implementation Example:**

```javascript
// Complete PKCE flow
class PKCEManager {
  constructor() {
    this.codeVerifier = null;
  }

  generateCodeVerifier() {
    this.codeVerifier = crypto.randomBytes(32).toString('base64url');
    return this.codeVerifier;
  }

  generateCodeChallenge(verifier = this.codeVerifier) {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  // Start OAuth flow
  getAuthorizationUrl() {
    const verifier = this.generateCodeVerifier();
    const challenge = this.generateCodeChallenge(verifier);

    // Store verifier for later
    sessionStorage.setItem('code_verifier', verifier);

    return `https://oauth-provider.com/authorize?` +
      `response_type=code&` +
      `client_id=${CLIENT_ID}&` +
      `redirect_uri=${REDIRECT_URI}&` +
      `code_challenge=${challenge}&` +
      `code_challenge_method=S256`;
  }

  // Exchange code for token
  async exchangeCodeForToken(code) {
    const verifier = sessionStorage.getItem('code_verifier');

    const response = await fetch('https://oauth-provider.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        code_verifier: verifier,
      }),
    });

    // Clear verifier after use
    sessionStorage.removeItem('code_verifier');

    return response.json();
  }
}
```

**Summary:**
- PKCE prevents authorization code interception
- Uses code_verifier (secret) + code_challenge (public)
- Essential for mobile apps and SPAs
- No client secret needed
- Simple to implement, major security improvement

---

## ✅ Best Practices Summary

### ✅ Do's

1. **Always use state parameter** for CSRF protection
2. **Validate redirect URIs** strictly (exact match, no wildcards)
3. **Use HTTPS** everywhere in production
4. **Implement PKCE** for mobile and SPAs
5. **Use Authorization Code flow** (not Implicit)
6. **Short-lived access tokens** (15 min to 1 hour)
7. **Rotate refresh tokens** on each use
8. **Limit scopes** to minimum necessary
9. **Store tokens securely** (httpOnly cookies, not localStorage)
10. **Implement rate limiting** on token endpoints
11. **Monitor and log** OAuth events
12. **Validate tokens properly** (signature, expiration, audience)

### ❌ Don'ts

1. **Don't use Implicit flow** (deprecated, insecure)
2. **Don't skip state parameter** (CSRF vulnerability)
3. **Don't use wildcards** in redirect URIs
4. **Don't store tokens** in localStorage (XSS risk)
5. **Don't request unnecessary scopes**
6. **Don't use HTTP** in production
7. **Don't expose client secrets** in client-side code
8. **Don't skip token validation**
9. **Don't trust redirect parameters** without validation
10. **Don't implement OAuth** without HTTPS

---

## 🎯 Summary

- **OAuth 2.0** is an authorization framework, not authentication
- **Key roles:** Resource Owner, Client, Resource Server, Authorization Server
- **Best flow:** Authorization Code + PKCE for most applications
- **Security:** State parameter, HTTPS, token rotation, scope limitation
- **Tokens:** Short-lived access tokens + long-lived refresh tokens
- **PKCE:** Essential for mobile/SPAs, prevents code interception
- **OpenID Connect:** Adds authentication layer on top of OAuth 2.0
- **Best practices:** Validate everything, limit scopes, use HTTPS, rotate tokens

---

[← Back to Backend](../README.md) | [Next: Password Security →](./03-passwords.md)
