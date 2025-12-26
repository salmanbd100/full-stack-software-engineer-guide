# Security Headers

## Overview

Security headers are HTTP response headers that instruct browsers to enable additional security protections. Properly configured security headers provide defense-in-depth against various attacks including clickjacking, MIME-sniffing, and man-in-the-middle attacks. Understanding these headers is crucial for production-ready applications.

## Table of Contents
- [Essential Security Headers](#essential-security-headers)
- [Strict-Transport-Security (HSTS)](#strict-transport-security-hsts)
- [X-Content-Type-Options](#x-content-type-options)
- [X-Frame-Options](#x-frame-options)
- [Referrer-Policy](#referrer-policy)
- [Permissions-Policy](#permissions-policy)
- [Implementation with helmet.js](#implementation-with-helmetjs)
- [Testing Security Headers](#testing-security-headers)
- [Interview Questions](#interview-questions)

## Essential Security Headers

### Complete Security Headers Suite

A comprehensive suite of security headers provides layered protection against various attack vectors simultaneously. Each header addresses specific threats, and together they create a robust security posture that complements application-level defenses.

```javascript
const securityHeaders = {
  // Force HTTPS
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
  
  // Prevent MIME sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Clickjacking protection
  'X-Frame-Options': 'DENY',
  
  // XSS protection (legacy)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Control browser features
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  
  // Content Security Policy
  'Content-Security-Policy': "default-src 'self'; script-src 'self'"
};
```

### Express Implementation

Implementing security headers in Express.js requires middleware that sets response headers before sending content to clients. This middleware approach ensures consistent security across all routes without requiring header configuration for each endpoint individually.

```javascript
app.use((req, res, next) => {
  // HSTS
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Clickjacking protection
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=()'
  );
  
  next();
});
```

## Strict-Transport-Security (HSTS)

### What is HSTS?

HTTP Strict Transport Security (HSTS) forces browsers to always use HTTPS connections, preventing downgrade attacks and SSL stripping. After a browser sees the HSTS header once, it automatically upgrades all HTTP requests to HTTPS for the specified duration.

```javascript
// HSTS forces browsers to use HTTPS for all requests

// Without HSTS:
// User types: http://example.com
// Browser connects via HTTP (vulnerable to MITM)
// Server redirects to HTTPS

// With HSTS (after first HTTPS visit):
// User types: http://example.com
// Browser automatically uses HTTPS (no redirect needed)
// Protects against SSL stripping attacks
```

### HSTS Configuration

HSTS configuration defines how long browsers should enforce HTTPS-only connections and whether subdomains are included. The max-age directive specifies duration in seconds, while includeSubDomains extends protection to all subdomains of the current domain.

```javascript
// Basic HSTS
res.setHeader(
  'Strict-Transport-Security',
  'max-age=31536000' // 1 year in seconds
);

// Include subdomains
res.setHeader(
  'Strict-Transport-Security',
  'max-age=31536000; includeSubDomains'
);

// Preload (submit to browser preload lists)
res.setHeader(
  'Strict-Transport-Security',
  'max-age=63072000; includeSubDomains; preload'
);
```

### HSTS Preload

HSTS preload lists are hardcoded in browsers to enforce HTTPS even on first visit, eliminating the bootstrap vulnerability. Submitting to the preload list requires strict requirements including long max-age, subdomain coverage, and permanent HTTPS commitment.

```javascript
// To submit to HSTS preload list (hstspreload.org):
// 1. max-age >= 31536000 (1 year)
// 2. includeSubDomains directive
// 3. preload directive
// 4. Valid SSL certificate
// 5. Redirect HTTP to HTTPS

app.use((req, res, next) => {
  // Redirect HTTP to HTTPS
  if (req.protocol === 'http') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  
  // Set HSTS header
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  
  next();
});
```

### HSTS Considerations

HSTS decisions have long-lasting consequences as browsers cache the policy for the specified duration. Careful planning is required before enabling HSTS, especially with includeSubDomains, as reverting requires waiting for max-age expiration or client cache clearing.

```javascript
const hstsConsiderations = {
  // Pros
  benefits: [
    'Prevents SSL stripping attacks',
    'Forces HTTPS for all requests',
    'Eliminates redirect delay',
    'Improves security and performance'
  ],
  
  // Cons
  risks: [
    'Can lock out HTTP (use long max-age carefully)',
    'Affects all subdomains (if includeSubDomains)',
    'Hard to undo (especially if preloaded)',
    'Requires valid SSL certificate'
  ],
  
  // Best practices
  recommendations: [
    'Start with short max-age (e.g., 300 seconds)',
    'Gradually increase to 1 year',
    'Ensure all content works over HTTPS',
    'Test thoroughly before preloading'
  ]
};
```

## X-Content-Type-Options

### MIME Sniffing Attack

```javascript
// Without X-Content-Type-Options:
// Attacker uploads image.jpg containing JavaScript
// Server: Content-Type: image/jpeg
// Browser: Detects JavaScript, executes it (MIME sniffing)

// With X-Content-Type-Options: nosniff
// Browser: Trusts Content-Type header, renders as image
// JavaScript not executed
```

### Implementation

```javascript
// Express
res.setHeader('X-Content-Type-Options', 'nosniff');

// This prevents browsers from:
// 1. Interpreting non-JS files as JavaScript
// 2. Executing CSS as JavaScript
// 3. Rendering HTML as images
```

### Real-World Example

```javascript
// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  // Set proper Content-Type
  res.setHeader('Content-Type', 'image/jpeg');
  
  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Even if uploaded file contains JavaScript:
  // <script>alert('XSS')</script>
  // Browser won't execute it
  
  res.sendFile(req.file.path);
});
```

## X-Frame-Options

### Clickjacking Protection

```javascript
// Clickjacking attack:
// 1. Attacker embeds your site in invisible iframe
// 2. Overlays fake UI on top
// 3. User thinks they're clicking attacker's site
// 4. Actually clicking your site (e.g., "Delete Account")

// X-Frame-Options prevents embedding
```

### Configuration Options

```javascript
// 1. DENY: Cannot be embedded anywhere
res.setHeader('X-Frame-Options', 'DENY');
// Use for: Banking, admin panels, sensitive operations

// 2. SAMEORIGIN: Can only be embedded by same origin
res.setHeader('X-Frame-Options', 'SAMEORIGIN');
// Use for: Pages that need to embed themselves

// 3. ALLOW-FROM (deprecated, use CSP instead)
res.setHeader('X-Frame-Options', 'ALLOW-FROM https://trusted.com');
// Modern alternative: frame-ancestors in CSP
```

### Modern Alternative: CSP frame-ancestors

```javascript
// X-Frame-Options limitations:
// - Can't allow multiple domains
// - ALLOW-FROM not widely supported

// CSP frame-ancestors is better:
res.setHeader(
  'Content-Security-Policy',
  "frame-ancestors 'none'" // Same as X-Frame-Options: DENY
);

res.setHeader(
  'Content-Security-Policy',
  "frame-ancestors 'self'" // Same as X-Frame-Options: SAMEORIGIN
);

res.setHeader(
  'Content-Security-Policy',
  "frame-ancestors 'self' https://trusted.com https://another-trusted.com"
);

// Best practice: Use both for compatibility
res.setHeader('X-Frame-Options', 'DENY');
res.setHeader('Content-Security-Policy', "frame-ancestors 'none'");
```

## Referrer-Policy

### Referrer Information

```javascript
// When navigating from A to B, Referer header shows A's URL
// Can leak sensitive information:

// User visits: https://bank.com/account/12345
// Clicks link to: https://analytics.com/tracker.js
// Referer sent: https://bank.com/account/12345 (⚠️ leaks account ID)
```

### Policy Values

```javascript
const referrerPolicies = {
  'no-referrer': 'Never send referrer',
  'no-referrer-when-downgrade': 'Send referrer unless HTTPS→HTTP (default)',
  'origin': 'Send only origin (https://example.com)',
  'origin-when-cross-origin': 'Full URL for same-origin, origin for cross-origin',
  'same-origin': 'Send referrer only for same-origin requests',
  'strict-origin': 'Send origin, unless HTTPS→HTTP',
  'strict-origin-when-cross-origin': 'Full URL same-origin, origin cross-origin, none HTTPS→HTTP',
  'unsafe-url': 'Always send full URL (avoid)'
};
```

### Recommended Configuration

```javascript
// Best balance: strict-origin-when-cross-origin
res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

// Behavior:
const examples = {
  // Same-origin: Full URL
  'https://example.com/page1 → https://example.com/page2': 
    'Referer: https://example.com/page1',
  
  // Cross-origin (HTTPS → HTTPS): Origin only
  'https://example.com/page → https://other.com/page':
    'Referer: https://example.com/',
  
  // HTTPS → HTTP: No referrer
  'https://example.com/page → http://other.com/page':
    'Referer: (not sent)'
};
```

### Per-Link Referrer Policy

```html
<!-- Override global policy for specific links -->
<a href="https://external.com" referrerpolicy="no-referrer">
  External Link (no referrer)
</a>

<a href="https://trusted-analytics.com" referrerpolicy="origin">
  Analytics (send origin only)
</a>

<a href="/internal" referrerpolicy="unsafe-url">
  Internal (send full URL)
</a>
```

## Permissions-Policy

### What is Permissions-Policy?

```javascript
// Formerly Feature-Policy
// Controls browser features (camera, microphone, geolocation, etc.)
// Prevents unauthorized access by third-party scripts
```

### Configuration

```javascript
// Deny all features
res.setHeader(
  'Permissions-Policy',
  'geolocation=(), microphone=(), camera=()'
);

// Allow for same origin only
res.setHeader(
  'Permissions-Policy',
  'geolocation=(self), microphone=(self)'
);

// Allow specific domains
res.setHeader(
  'Permissions-Policy',
  'geolocation=(self "https://maps.google.com")'
);
```

### Available Features

```javascript
const permissionsPolicyFeatures = {
  // Media
  camera: 'Camera access',
  microphone: 'Microphone access',
  speaker: 'Speaker selection',
  
  // Location
  geolocation: 'Geolocation API',
  
  // Sensors
  accelerometer: 'Accelerometer',
  gyroscope: 'Gyroscope',
  magnetometer: 'Magnetometer',
  
  // Payment
  payment: 'Payment Request API',
  
  // Display
  fullscreen: 'Fullscreen API',
  'picture-in-picture': 'Picture-in-Picture',
  
  // Other
  usb: 'WebUSB API',
  midi: 'Web MIDI API',
  autoplay: 'Autoplay',
  'encrypted-media': 'EME'
};
```

### Example: Disable Risky Features

```javascript
// E-commerce site that doesn't need device access
res.setHeader(
  'Permissions-Policy',
  'camera=(), microphone=(), geolocation=(), usb=(), payment=(self)'
);

// Only allow payment API for same origin
// Blocks malicious third-party scripts from:
// - Accessing camera/mic
// - Getting location
// - Accessing USB devices
```

## Implementation with helmet.js

### Basic Setup

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
const express = require('express');

const app = express();

// Apply all default protections
app.use(helmet());

// Equivalent to:
app.use(helmet.contentSecurityPolicy());
app.use(helmet.dnsPrefetchControl());
app.use(helmet.frameguard());
app.use(helmet.hidePoweredBy());
app.use(helmet.hsts());
app.use(helmet.ieNoOpen());
app.use(helmet.noSniff());
app.use(helmet.permittedCrossDomainPolicies());
app.use(helmet.referrerPolicy());
app.use(helmet.xssFilter());
```

### Custom Configuration

```javascript
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.example.com"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "https://api.example.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: []
      }
    },
    
    // HSTS
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    
    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    },
    
    // Frame Options
    frameguard: {
      action: 'deny'
    },
    
    // X-Content-Type-Options
    noSniff: true,
    
    // Hide X-Powered-By
    hidePoweredBy: true
  })
);
```

### Production Configuration

```javascript
const isDevelopment = process.env.NODE_ENV === 'development';

app.use(
  helmet({
    contentSecurityPolicy: isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    
    hsts: {
      maxAge: 63072000,
      includeSubDomains: true,
      preload: true
    },
    
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  })
);
```

## Testing Security Headers

### Manual Testing

```bash
# Using curl
curl -I https://example.com

# Check specific header
curl -I https://example.com | grep -i strict-transport-security

# Using httpie
http HEAD https://example.com
```

### Online Tools

```javascript
const securityTestingTools = {
  'securityheaders.com': 'Comprehensive header analysis and grading',
  'Mozilla Observatory': 'Security score and recommendations',
  'SSL Labs': 'HTTPS and TLS configuration testing',
  'CSP Evaluator': 'Content Security Policy validation'
};

// Example: Test your site
// Visit: https://securityheaders.com/?q=https://yoursite.com
```

### Automated Testing

```javascript
// Jest test example
const request = require('supertest');
const app = require('./app');

describe('Security Headers', () => {
  test('should set HSTS header', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['strict-transport-security']).toBeDefined();
    expect(response.headers['strict-transport-security']).toContain('max-age=');
  });
  
  test('should set X-Content-Type-Options', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
  
  test('should set X-Frame-Options', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-frame-options']).toBe('DENY');
  });
  
  test('should set Referrer-Policy', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['referrer-policy']).toBeDefined();
  });
  
  test('should not expose X-Powered-By', async () => {
    const response = await request(app).get('/');
    
    expect(response.headers['x-powered-by']).toBeUndefined();
  });
});
```

## Interview Questions

**Q1: What are the most important security headers?**

A: Essential security headers:

1. **Strict-Transport-Security** (HSTS)
   - Forces HTTPS
   - Prevents SSL stripping

2. **X-Content-Type-Options: nosniff**
   - Prevents MIME sniffing
   - Stops XSS via file uploads

3. **X-Frame-Options: DENY**
   - Prevents clickjacking
   - Stops iframe embedding

4. **Content-Security-Policy**
   - Prevents XSS
   - Controls resource loading

5. **Referrer-Policy**
   - Prevents information leakage
   - Controls referrer sending

**Q2: Explain HSTS and how it works.**

A: HSTS (HTTP Strict Transport Security) forces browsers to use HTTPS.

```javascript
// Header
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// How it works:
// 1. First visit: Browser receives HSTS header over HTTPS
// 2. Browser remembers for max-age seconds
// 3. Future requests: Browser automatically uses HTTPS
// 4. Even if user types http://, browser upgrades to https://

// Benefits:
// - Prevents SSL stripping attacks
// - Eliminates redirect overhead
// - Protects against man-in-the-middle attacks
```

**Q3: What is the purpose of X-Content-Type-Options?**

A: Prevents MIME sniffing attacks.

```javascript
// Without nosniff:
// 1. Attacker uploads image.jpg with JavaScript content
// 2. Server: Content-Type: image/jpeg
// 3. Browser sniffs content, detects JavaScript, executes it
// 4. XSS successful

// With nosniff:
res.setHeader('X-Content-Type-Options', 'nosniff');
// Browser trusts Content-Type header, won't execute
```

**Q4: How does X-Frame-Options prevent clickjacking?**

A: X-Frame-Options prevents pages from being embedded in iframes.

```javascript
// Clickjacking attack:
// <iframe src="https://bank.com/transfer"></iframe>
// Attacker overlays transparent iframe on fake UI
// User clicks, unknowingly transfers money

// X-Frame-Options: DENY
// Browser refuses to render page in iframe
// Attack fails

// Values:
X-Frame-Options: DENY        // Never allow framing
X-Frame-Options: SAMEORIGIN  // Allow same-origin framing only
```

**Q5: What is Referrer-Policy?**

A: Controls how much referrer information is sent with requests.

```javascript
// User on: https://bank.com/account/12345
// Clicks: https://analytics.com/tracker

// Without policy: Full URL leaked
Referer: https://bank.com/account/12345

// With strict-origin-when-cross-origin:
Referer: https://bank.com/  // Origin only

// Policies:
'no-referrer': No referrer sent
'origin': Send origin only
'strict-origin-when-cross-origin': Full URL same-origin, origin cross-origin
```

**Q6: What is Permissions-Policy (Feature-Policy)?**

A: Controls which browser features third-party scripts can access.

```javascript
// Deny camera, mic, geolocation
Permissions-Policy: camera=(), microphone=(), geolocation=()

// Prevents:
// - Malicious ads accessing camera
// - Third-party scripts tracking location
// - Unauthorized feature access

// Allow for same origin only
Permissions-Policy: geolocation=(self)
```

**Q7: How do you test security headers?**

```javascript
// 1. Online tools
// - securityheaders.com
// - Mozilla Observatory

// 2. Command line
curl -I https://example.com | grep -i strict-transport

// 3. Browser DevTools
// Network tab → Headers

// 4. Automated testing
test('should set HSTS', async () => {
  const response = await request(app).get('/');
  expect(response.headers['strict-transport-security']).toBeDefined();
});
```

**Q8: What is the difference between X-Frame-Options and CSP frame-ancestors?**

A:
- **X-Frame-Options**: Older standard, limited
  ```http
  X-Frame-Options: DENY
  ```
  - Can't allow multiple domains
  - ALLOW-FROM not widely supported

- **CSP frame-ancestors**: Modern, flexible
  ```http
  Content-Security-Policy: frame-ancestors 'self' https://trusted.com
  ```
  - Supports multiple domains
  - Better browser support

**Best practice**: Use both for compatibility.

**Q9: How do you configure helmet.js?**

```javascript
const helmet = require('helmet');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "https://cdn.example.com"]
      }
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true
    },
    frameguard: {
      action: 'deny'
    }
  })
);
```

**Q10: Should you use security headers in development?**

A: Partial implementation in development.

```javascript
const isDev = process.env.NODE_ENV === 'development';

app.use(
  helmet({
    // Disable CSP in dev (allows hot reload)
    contentSecurityPolicy: isDev ? false : true,
    
    // Keep other headers in dev
    frameguard: true,
    noSniff: true,
    
    // Disable HSTS in dev (local testing)
    hsts: isDev ? false : {
      maxAge: 31536000,
      includeSubDomains: true
    }
  })
);
```

## Summary

**Security Headers Checklist:**
- [ ] Strict-Transport-Security (HSTS)
- [ ] X-Content-Type-Options: nosniff
- [ ] X-Frame-Options: DENY or SAMEORIGIN
- [ ] Referrer-Policy: strict-origin-when-cross-origin
- [ ] Content-Security-Policy
- [ ] Permissions-Policy
- [ ] Remove X-Powered-By

**Quick Implementation:**
```javascript
const helmet = require('helmet');
app.use(helmet());
```

**Test Your Headers:**
- securityheaders.com
- Mozilla Observatory
- Automated tests

**Best Practices:**
- Use helmet.js for Node.js applications
- Test headers before production deployment
- Monitor CSP violations
- Keep headers updated with security best practices
- Use HTTPS in production

---

[← CSP Headers](./03-csp-headers.md) | [Next: Input Sanitization →](./05-input-sanitization.md)
