# CSRF Protection

## Overview

Cross-Site Request Forgery (CSRF) is an attack that tricks authenticated users into performing unwanted actions on a web application. Unlike XSS which exploits user trust in a website, CSRF exploits website trust in the user's browser. Understanding CSRF protection is essential for securing state-changing operations.

## Table of Contents
- [What is CSRF](#what-is-csrf)
- [CSRF Attack Scenarios](#csrf-attack-scenarios)
- [Synchronizer Token Pattern](#synchronizer-token-pattern)
- [Double Submit Cookie](#double-submit-cookie)
- [SameSite Cookie Attribute](#samesite-cookie-attribute)
- [Express.js Implementation](#expressjs-implementation)
- [React Integration](#react-integration)
- [Next.js Protection](#nextjs-protection)
- [Interview Questions](#interview-questions)

## What is CSRF

### How CSRF Works

CSRF attacks exploit the browser's automatic inclusion of cookies with cross-origin requests, allowing malicious sites to make authenticated requests on behalf of logged-in users. The attack succeeds because the server can't distinguish between legitimate user-initiated requests and forged requests from malicious sites.

```javascript
// User is logged into bank.com
// Session cookie: sessionId=abc123

// User visits evil.com which contains:
<form action="https://bank.com/transfer" method="POST" id="hack">
  <input name="to" value="attacker_account">
  <input name="amount" value="10000">
</form>
<script>
  document.getElementById('hack').submit();
</script>

// Browser automatically includes sessionId cookie
// Bank processes transfer because user is authenticated
// Money transferred without user's knowledge
```

### Key Characteristics

CSRF targets state-changing operations (POST, PUT, DELETE) while GET requests should remain safe by design, following REST principles. The attack leverages authenticated sessions without requiring access to the victim's credentials, making it effective even against strong authentication systems.

```javascript
const csrfCharacteristics = {
  // Exploits: Browser's automatic cookie inclusion
  vulnerability: 'Authenticated state without intent verification',
  
  // Targets: State-changing operations
  dangerousOperations: [
    'POST /transfer',
    'DELETE /account',
    'PUT /password',
    'POST /comment'
  ],
  
  // Safe operations (idempotent, no side effects)
  safeOperations: [
    'GET /profile',
    'GET /search',
    'GET /list'
  ]
};
```

## CSRF Attack Scenarios

### Scenario 1: Money Transfer

Financial transactions are prime targets for CSRF attacks, where malicious sites submit hidden forms to initiate unauthorized transfers. Victims unknowingly authorize these transactions simply by visiting the attacker's website while logged into their banking application.

```html
<!-- evil.com -->
<!DOCTYPE html>
<html>
<body>
  <h1>Win a Free iPhone!</h1>
  <img src="cute-cat.jpg" alt="Cat">
  
  <!-- Hidden CSRF attack -->
  <iframe style="display:none" name="csrf"></iframe>
  <form action="https://bank.com/api/transfer" method="POST" target="csrf" id="attack">
    <input type="hidden" name="to" value="attacker@example.com">
    <input type="hidden" name="amount" value="5000">
  </form>
  
  <script>
    document.getElementById('attack').submit();
  </script>
</body>
</html>
```

### Scenario 2: Account Deletion

Even GET requests can be weaponized in CSRF attacks through img tags, demonstrating why state-changing operations should never use GET. This attack vector works through emails, forum posts, or any context where the attacker can inject HTML that the victim's browser renders.

```javascript
// Attacker sends email with image tag
<img src="https://social-network.com/api/account/delete" />

// If user is logged in, account gets deleted
// Browser includes authentication cookie automatically
```

### Scenario 3: Password Change

Password changes are high-value CSRF targets that grant attackers persistent access to accounts. Auto-submitting forms bypass user awareness, changing credentials before the victim realizes their session is being exploited.

```html
<!-- Malicious website -->
<form action="https://example.com/change-password" method="POST">
  <input type="hidden" name="newPassword" value="hacked123">
  <input type="hidden" name="confirmPassword" value="hacked123">
</form>
<script>
  document.forms[0].submit();
</script>
```

## Synchronizer Token Pattern

### How It Works

The Synchronizer Token Pattern defends against CSRF by requiring a secret token that attackers cannot access or predict. Malicious sites can't include the token in forged requests because the Same-Origin Policy prevents them from reading it from the victim's session.

```javascript
// 1. Server generates unique token per session
// 2. Token embedded in form/page
// 3. User submits form with token
// 4. Server validates token
// 5. Token rejected if missing/invalid
```

### Server-Side Implementation

Server-side CSRF protection middleware generates unique tokens per session, validates them on state-changing requests, and rejects requests with missing or invalid tokens. Express.js's csurf middleware automates this process, integrating seamlessly with session management.

```javascript
const express = require('express');
const session = require('express-session');
const csrf = require('csurf');

const app = express();

// Setup session
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: true, // HTTPS only
    sameSite: 'strict'
  }
}));

// CSRF protection middleware
const csrfProtection = csrf({ cookie: false }); // Use session

// Generate token for forms
app.get('/transfer', csrfProtection, (req, res) => {
  res.render('transfer', {
    csrfToken: req.csrfToken()
  });
});

// Validate token on submission
app.post('/transfer', csrfProtection, (req, res) => {
  // If we reach here, token is valid
  const { to, amount } = req.body;
  
  // Process transfer
  processTransfer(req.user.id, to, amount);
  
  res.json({ success: true });
});

// Error handling
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({ error: 'Invalid CSRF token' });
  } else {
    next(err);
  }
});
```

### HTML Form with Token

Traditional HTML forms include CSRF tokens as hidden inputs that submit alongside user data. The server validates this token matches the session, ensuring the request originated from a legitimate form on the application's domain.

```html
<form action="/transfer" method="POST">
  <!-- CSRF token as hidden field -->
  <input type="hidden" name="_csrf" value="<%= csrfToken %>">
  
  <label>
    To: <input type="text" name="to" required>
  </label>
  
  <label>
    Amount: <input type="number" name="amount" required>
  </label>
  
  <button type="submit">Transfer</button>
</form>
```

### AJAX Request with Token

Single-page applications send CSRF tokens in custom headers (X-CSRF-Token) for AJAX requests, as malicious sites cannot set custom headers on cross-origin requests. This approach works with fetch, axios, and other HTTP clients.

```javascript
// Get CSRF token from meta tag
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

// Include in AJAX request
fetch('/api/transfer', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'CSRF-Token': csrfToken
  },
  body: JSON.stringify({
    to: 'recipient@example.com',
    amount: 1000
  })
});
```

## Double Submit Cookie

### How It Works

The Double Submit Cookie pattern stores the CSRF token in both a cookie and request parameter, requiring attackers to both read and write cookies - which Same-Origin Policy prevents. This stateless approach doesn't require server-side session storage, making it scalable for distributed systems.

```javascript
// 1. Server sets CSRF token in cookie
// 2. Client reads cookie and includes token in request
// 3. Server compares cookie value with request value
// 4. Values must match
```

### Implementation

Server implementation generates a random token, sets it as a non-httpOnly cookie (readable by JavaScript), and validates that incoming requests include the same token in a custom header. Malicious sites can't read the cookie to copy the token into their forged requests.

```javascript
const cookieParser = require('cookie-parser');
const crypto = require('crypto');

app.use(cookieParser());

// Generate and set CSRF token
function setCSRFToken(req, res, next) {
  if (!req.cookies.csrfToken) {
    const token = crypto.randomBytes(32).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: false, // Accessible to JavaScript
      secure: true,
      sameSite: 'strict'
    });
  }
  next();
}

// Validate CSRF token
function validateCSRF(req, res, next) {
  const tokenFromCookie = req.cookies.csrfToken;
  const tokenFromHeader = req.headers['x-csrf-token'];
  
  if (!tokenFromCookie || !tokenFromHeader || tokenFromCookie !== tokenFromHeader) {
    return res.status(403).json({ error: 'CSRF token validation failed' });
  }
  
  next();
}

app.use(setCSRFToken);

// Protected route
app.post('/api/data', validateCSRF, (req, res) => {
  res.json({ success: true });
});
```

### Client-Side Usage

Client-side code reads the CSRF token from the cookie and includes it in request headers for all state-changing operations. JavaScript running on the legitimate domain can access the cookie, but cross-origin attackers cannot due to browser security restrictions.

```javascript
// Read CSRF token from cookie
function getCSRFToken() {
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : null;
}

// Include in request
fetch('/api/data', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': getCSRFToken()
  },
  body: JSON.stringify({ data: 'value' })
});
```

## SameSite Cookie Attribute

### SameSite Values

The SameSite cookie attribute provides built-in CSRF protection by controlling when browsers send cookies with cross-site requests. Different values offer varying security-usability trade-offs, from complete cross-site blocking (Strict) to selective sending (Lax) to no protection (None).

```javascript
// 1. Strict: Never sent in cross-site requests
res.cookie('sessionId', token, {
  sameSite: 'strict',
  httpOnly: true,
  secure: true
});

// 2. Lax: Sent on top-level GET navigation
res.cookie('sessionId', token, {
  sameSite: 'lax',
  httpOnly: true,
  secure: true
});

// 3. None: Sent in all requests (requires Secure)
res.cookie('sessionId', token, {
  sameSite: 'none',
  httpOnly: true,
  secure: true
});
```

### Comparison

Understanding SameSite value differences helps choose the right protection level for each application's needs. Strict provides maximum security but may break legitimate flows, Lax balances security and usability for most sites, and None should only be used when cross-site cookies are essential.

```javascript
const sameSiteComparison = {
  strict: {
    description: 'Most secure, never sent cross-site',
    useCases: ['Banking', 'Admin panels', 'Sensitive operations'],
    limitation: 'Breaks legitimate cross-site flows (payment gateways, OAuth)'
  },
  
  lax: {
    description: 'Balanced, sent on top-level navigation',
    useCases: ['E-commerce', 'Social media', 'Most websites'],
    protection: 'Blocks POST, PUT, DELETE from other sites'
  },
  
  none: {
    description: 'No protection, requires HTTPS',
    useCases: ['Embedded widgets', 'Third-party integrations'],
    requirement: 'Must use Secure flag'
  }
};
```

### Example Scenarios

Real-world scenarios demonstrate how SameSite affects user experience and security. Strict mode may require users to re-authenticate after clicking email links, while Lax allows smoother flows while still blocking CSRF POST attacks.

```javascript
// User logged into bank.com with SameSite=Strict

// Scenario 1: Click link from email
// evil.com → bank.com
// Cookie: NOT sent (cross-site request)
// User must log in again

// Scenario 2: CSRF attack form
// evil.com → POST to bank.com/transfer
// Cookie: NOT sent
// Attack fails

// With SameSite=Lax:
// Scenario 1: Click link from email
// Cookie: Sent (top-level navigation)
// User stays logged in

// Scenario 2: CSRF attack form (POST)
// Cookie: NOT sent (not top-level GET)
// Attack fails
```

## Express.js Implementation

### Complete CSRF Protection

```javascript
const express = require('express');
const session = require('express-session');
const csrf = require('csurf');
const helmet = require('helmet');

const app = express();

// Parse cookies and body
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Security headers
app.use(helmet());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// CSRF middleware
const csrfProtection = csrf({ cookie: false });

// Make CSRF token available to all views
app.use(csrfProtection);
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});

// API endpoint with CSRF protection
app.post('/api/transfer', csrfProtection, (req, res) => {
  const { to, amount } = req.body;
  
  // Validate input
  if (!to || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  
  // Process transfer
  try {
    processTransfer(req.session.userId, to, amount);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Transfer failed' });
  }
});

// Error handler
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ 
      error: 'CSRF token validation failed' 
    });
  }
  next(err);
});
```

## React Integration

### Setup with Meta Tag

```jsx
// App.js - Get CSRF token from server
import { useEffect, useState } from 'react';

function App() {
  const [csrfToken, setCSRFToken] = useState('');
  
  useEffect(() => {
    // Get token from meta tag (set by server)
    const token = document.querySelector('meta[name="csrf-token"]')?.content;
    setCSRFToken(token || '');
  }, []);
  
  return (
    <CSRFContext.Provider value={csrfToken}>
      <Router>
        {/* Your app */}
      </Router>
    </CSRFContext.Provider>
  );
}
```

### CSRF Context

```jsx
import { createContext, useContext } from 'react';

const CSRFContext = createContext('');

export function useCSRFToken() {
  return useContext(CSRFContext);
}

export default CSRFContext;
```

### Custom Fetch Hook

```jsx
import { useCSRFToken } from './CSRFContext';

function useSecureFetch() {
  const csrfToken = useCSRFToken();
  
  const secureFetch = async (url, options = {}) => {
    const headers = {
      ...options.headers,
      'CSRF-Token': csrfToken,
      'Content-Type': 'application/json'
    };
    
    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin' // Include cookies
    });
    
    if (response.status === 403) {
      throw new Error('CSRF validation failed');
    }
    
    return response;
  };
  
  return secureFetch;
}

// Usage
function TransferForm() {
  const secureFetch = useSecureFetch();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await secureFetch('/api/transfer', {
        method: 'POST',
        body: JSON.stringify({ to: 'user@example.com', amount: 100 })
      });
      
      const data = await response.json();
      console.log('Success:', data);
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return <form onSubmit={handleSubmit}>{/* Form fields */}</form>;
}
```

### Form Component

```jsx
function SecureForm({ action, method = 'POST', children, onSubmit }) {
  const csrfToken = useCSRFToken();
  
  return (
    <form action={action} method={method} onSubmit={onSubmit}>
      <input type="hidden" name="_csrf" value={csrfToken} />
      {children}
    </form>
  );
}

// Usage
function TransferPage() {
  const handleSubmit = (e) => {
    e.preventDefault();
    // Handle form submission
  };
  
  return (
    <SecureForm action="/api/transfer" onSubmit={handleSubmit}>
      <input type="text" name="to" placeholder="Recipient" />
      <input type="number" name="amount" placeholder="Amount" />
      <button type="submit">Transfer</button>
    </SecureForm>
  );
}
```

## Next.js Protection

### API Routes

```javascript
// pages/api/transfer.js
import { getSession } from 'next-auth/react';
import { validateCSRFToken } from '../../lib/csrf';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  // Check authentication
  const session = await getSession({ req });
  if (!session) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // Validate CSRF token
  const csrfToken = req.headers['x-csrf-token'];
  if (!validateCSRFToken(req, csrfToken)) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  
  // Process request
  const { to, amount } = req.body;
  
  try {
    await processTransfer(session.user.id, to, amount);
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Transfer failed' });
  }
}
```

### Middleware

```javascript
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  const response = NextResponse.next();
  
  // Set SameSite cookie attribute
  response.cookies.set('session', request.cookies.get('session'), {
    httpOnly: true,
    secure: true,
    sameSite: 'lax'
  });
  
  return response;
}
```

## Interview Questions

**Q1: What is CSRF and how does it work?**

A: CSRF (Cross-Site Request Forgery) tricks authenticated users into performing unwanted actions.

**Attack flow:**
1. User logs into bank.com (receives session cookie)
2. User visits evil.com
3. evil.com has hidden form targeting bank.com
4. Form auto-submits
5. Browser includes session cookie (automatic)
6. Bank processes request (user appears authenticated)

**Key insight**: Browsers automatically include cookies, even for requests from other sites.

**Q2: What's the difference between XSS and CSRF?**

A:
```javascript
// XSS: Exploits user trust in a website
// Attacker injects malicious script into trusted site
// Executes in user's browser with site's privileges

// CSRF: Exploits website trust in user's browser
// Attacker tricks user's browser into making requests
// Uses user's existing authentication
```

**Q3: What are the main CSRF protection techniques?**

A:
1. **Synchronizer Token Pattern**
   - Server generates unique token
   - Token embedded in form/request
   - Server validates on submission

2. **Double Submit Cookie**
   - Token in cookie and request body/header
   - Server compares both values

3. **SameSite Cookie Attribute**
   - `SameSite=Strict`: Never sent cross-site
   - `SameSite=Lax`: Only on top-level GET
   - Modern browsers support

4. **Custom Headers**
   - AJAX requests with custom header
   - Cross-site requests can't add custom headers (SOP)

**Q4: Explain the SameSite cookie attribute.**

```javascript
// SameSite=Strict
res.cookie('session', token, { sameSite: 'strict' });
// Cookie NEVER sent on cross-site requests
// Breaks: OAuth redirects, payment gateways
// Best for: Banking, admin panels

// SameSite=Lax (recommended)
res.cookie('session', token, { sameSite: 'lax' });
// Cookie sent on top-level GET navigation
// Blocks: CSRF POST/PUT/DELETE
// Allows: Clicking links from external sites

// SameSite=None
res.cookie('session', token, { sameSite: 'none', secure: true });
// No CSRF protection
// Requires HTTPS (secure flag)
// Use for: Embedded widgets, third-party integrations
```

**Q5: How do you implement CSRF protection in Express?**

```javascript
const csrf = require('csurf');
const csrfProtection = csrf({ cookie: false }); // Use sessions

// Generate token
app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

// Validate token
app.post('/submit', csrfProtection, (req, res) => {
  // Token validated automatically
  // If we reach here, token is valid
});

// Error handling
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).send('CSRF token invalid');
  }
});
```

**Q6: Are GET requests vulnerable to CSRF?**

A: GET requests CAN be vulnerable if they cause state changes.

```javascript
// ❌ Vulnerable: State change via GET
app.get('/delete-account', (req, res) => {
  deleteAccount(req.session.userId);
});

// Attacker: <img src="https://site.com/delete-account">
// Account deleted when image loads

// ✅ Safe: Use POST for state changes
app.post('/delete-account', csrfProtection, (req, res) => {
  deleteAccount(req.session.userId);
});
```

**Best practice**: Use GET only for idempotent, read-only operations.

**Q7: How does double submit cookie work?**

A:
```javascript
// 1. Server sets token in cookie
res.cookie('csrfToken', generateToken(), {
  httpOnly: false, // JavaScript readable
  secure: true,
  sameSite: 'lax'
});

// 2. Client reads cookie and sends in request
const token = document.cookie.match(/csrfToken=([^;]+)/)[1];
fetch('/api/data', {
  headers: { 'X-CSRF-Token': token }
});

// 3. Server compares cookie vs header
if (req.cookies.csrfToken !== req.headers['x-csrf-token']) {
  return res.status(403).send('Invalid CSRF token');
}
```

**Why it works**: Attackers can't read victim's cookies due to Same-Origin Policy.

**Q8: Can CSRF attacks succeed with SameSite=Lax?**

A: No for POST/PUT/DELETE, but yes for GET (if GET causes state changes).

```javascript
// Protected: POST with SameSite=Lax
// evil.com → POST to bank.com/transfer
// Cookie NOT sent (cross-site POST)

// Vulnerable: GET with state change
// evil.com → <img src="bank.com/delete?id=123">
// Cookie IS sent (top-level navigation)

// Solution: Never use GET for state changes
```

**Q9: How do you handle CSRF in AJAX applications?**

```javascript
// 1. Get token from meta tag or API
const token = document.querySelector('meta[name="csrf"]').content;

// 2. Include in all AJAX requests
fetch('/api/data', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(data),
  credentials: 'same-origin' // Include cookies
});

// 3. Or use Axios interceptor
axios.interceptors.request.use(config => {
  config.headers['X-CSRF-Token'] = token;
  return config;
});
```

**Q10: What's the difference between CSRF tokens and JWT?**

A:
- **CSRF Tokens**:
  - Prevent CSRF attacks
  - Short-lived, per-session
  - Stored in session
  - Validated per request

- **JWT (JSON Web Tokens)**:
  - For authentication/authorization
  - Can be long-lived
  - Stateless (no server storage)
  - Contains user data

**Can use both**: JWT for auth + CSRF token for protection.

## Summary

**CSRF Protection Checklist:**
- [ ] Use SameSite=Lax or Strict for session cookies
- [ ] Implement CSRF tokens for state-changing operations
- [ ] Use POST/PUT/DELETE for state changes (never GET)
- [ ] Validate CSRF token on server
- [ ] Set HttpOnly flag on session cookies
- [ ] Require authentication for sensitive operations
- [ ] Use HTTPS in production
- [ ] Implement proper CORS policy

**Best Practices:**
1. **Defense in Depth**: Use multiple techniques (SameSite + CSRF tokens)
2. **State Changes**: Always use POST/PUT/DELETE
3. **Token Rotation**: Generate new token per session
4. **Validation**: Server-side validation is mandatory
5. **Error Handling**: Generic error messages (don't leak token format)

**Common Mistakes:**
- Using GET for state-changing operations
- Storing CSRF token in localStorage (XSS vulnerable)
- Not validating token server-side
- Weak token generation (predictable)
- Missing SameSite attribute on cookies

---

[← XSS Prevention](./01-xss-prevention.md) | [Next: CSP Headers →](./03-csp-headers.md)
