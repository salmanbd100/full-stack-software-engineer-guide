# Content Security Policy (CSP)

## Overview

Content Security Policy (CSP) is a powerful security layer that helps prevent Cross-Site Scripting (XSS), clickjacking, and other code injection attacks. CSP allows you to create an allowlist of trusted sources for content, preventing the browser from loading malicious resources.

## Table of Contents
- [What is CSP](#what-is-csp)
- [CSP Directives](#csp-directives)
- [Basic CSP Implementation](#basic-csp-implementation)
- [Nonce-based CSP](#nonce-based-csp)
- [Hash-based CSP](#hash-based-csp)
- [Strict CSP](#strict-csp)
- [CSP Reporting](#csp-reporting)
- [Common Patterns](#common-patterns)
- [Interview Questions](#interview-questions)

## What is CSP

### How CSP Works

CSP acts as a whitelist mechanism that instructs browsers to only load resources from approved sources, blocking everything else. By defining which domains can serve scripts, styles, and other content, CSP prevents injected malicious code from executing even if XSS vulnerabilities exist.

```javascript
// Without CSP: All scripts execute
<script src="https://evil.com/malware.js"></script> // ✅ Executes
<script>alert('XSS')</script> // ✅ Executes

// With CSP: script-src 'self'
<script src="https://evil.com/malware.js"></script> // ❌ Blocked
<script>alert('XSS')</script> // ❌ Blocked
<script src="/js/app.js"></script> // ✅ Allowed (same origin)
```

### CSP Header Format

CSP policies consist of directives (like script-src, style-src) paired with source lists that define allowed origins. Multiple directives are separated by semicolons, creating a comprehensive security policy delivered via HTTP headers.

```http
Content-Security-Policy: directive-name source-list; another-directive source-list
```

### Simple Example

A basic CSP implementation demonstrates how to restrict resources to the same origin plus specific trusted CDNs. This example blocks inline scripts and third-party resources by default, requiring all content to come from explicitly allowed sources.

```javascript
// Express.js
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' https://cdn.example.com"
  );
  next();
});

// This policy allows:
// - All resources from same origin by default
// - Scripts from same origin + cdn.example.com
// - Blocks everything else
```

## CSP Directives

### Common Directives

CSP provides granular control over different resource types through specialized directives. Each directive governs a specific category of content, from scripts and styles to fonts and frames, enabling fine-tuned security policies.

```javascript
const cspDirectives = {
  // Fetch directives (resource loading)
  'default-src': 'Fallback for other fetch directives',
  'script-src': 'JavaScript sources',
  'style-src': 'CSS sources',
  'img-src': 'Image sources',
  'font-src': 'Font sources',
  'connect-src': 'Fetch, XHR, WebSocket sources',
  'media-src': 'Audio/video sources',
  'object-src': 'Plugin sources (<object>, <embed>)',
  'frame-src': 'iframe sources',
  'worker-src': 'Web Worker, Service Worker sources',
  
  // Document directives
  'base-uri': 'Restricts <base> tag URLs',
  'form-action': 'Form submission URLs',
  
  // Navigation directives
  'frame-ancestors': 'Embedding pages (clickjacking protection)',
  
  // Reporting
  'report-uri': 'CSP violation reporting endpoint',
  'report-to': 'Modern reporting API'
};
```

### Source Values

Source values define which origins are permitted for each directive, ranging from strict (none) to permissive (unsafe-inline). Keywords like 'self' and 'nonce-{random}' provide security without sacrificing functionality, while unsafe-* values should be avoided.

```javascript
const sourceValues = {
  "'none'": 'Block all sources',
  "'self'": 'Same origin only',
  "'unsafe-inline'": 'Allow inline scripts/styles (AVOID)',
  "'unsafe-eval'": 'Allow eval() and similar (AVOID)',
  "'strict-dynamic'": 'Trust scripts loaded by trusted scripts',
  "'nonce-{random}'": 'Allow scripts with matching nonce',
  "'sha256-{hash}'": 'Allow scripts with matching hash',
  'https:': 'Any HTTPS URL',
  'https://example.com': 'Specific domain',
  '*.example.com': 'Subdomain wildcard'
};
```

## Basic CSP Implementation

### Starter CSP

A production-ready starter CSP restricts all resources to same-origin by default while allowing images from HTTPS and data URIs. This baseline provides strong security for static sites and can be incrementally relaxed as needed for specific use cases.

```javascript
// Minimal secure CSP
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', csp);
  next();
});
```

### Express with helmet.js

Helmet.js simplifies CSP configuration with a JavaScript object syntax and sensible defaults. The middleware automatically formats directives into proper CSP headers, reducing errors and improving maintainability for Express applications.

```javascript
const helmet = require('helmet');

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.example.com"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Temporary
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      connectSrc: ["'self'", "https://api.example.com"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  })
);
```

### Next.js Configuration

Next.js CSP configuration uses the headers() function in next.config.js to apply security headers to all routes. The framework's build process requires unsafe-eval and unsafe-inline in development, which should be replaced with nonces in production.

```javascript
// next.config.js
const ContentSecurityPolicy = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
`;

const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: ContentSecurityPolicy.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders
      }
    ];
  }
};
```

## Nonce-based CSP

### What is a Nonce?

A nonce is a cryptographically random string generated per request that whitelists specific inline scripts without allowing all inline code. Scripts with matching nonce attributes execute while all other inline scripts are blocked, providing strong security for dynamic applications.

```javascript
// Nonce: Number used once
// Random value generated per request
// Allows specific inline scripts

// Without nonce: ❌ Blocked
<script>console.log('Hello')</script>

// With nonce: ✅ Allowed
<script nonce="random-value-123">console.log('Hello')</script>
```

### Server-Side Implementation

Server-side nonce implementation generates a unique random value per request, includes it in the CSP header, and makes it available to templates. All legitimate inline scripts receive the nonce attribute, while injected XSS scripts lack the correct nonce and are blocked.

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  // Generate unique nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  
  // Set CSP header with nonce
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic' https:; object-src 'none'; base-uri 'none';`
  );
  
  next();
});

// In template/view
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>CSP Nonce Example</title>
    </head>
    <body>
      <!-- This script is allowed -->
      <script nonce="${res.locals.nonce}">
        console.log('Script with valid nonce');
      </script>
      
      <!-- This script is blocked (no nonce) -->
      <script>
        console.log('Blocked!');
      </script>
      
      <!-- External script with nonce -->
      <script nonce="${res.locals.nonce}" src="/js/app.js"></script>
    </body>
    </html>
  `);
});
```

### React with SSR

Server-side rendering with nonces requires passing the nonce value through the React component tree to dynamically created scripts. The nonce must be embedded in the initial HTML and made available to client-side hydration code for runtime script injection.

```jsx
// server.js
import crypto from 'crypto';
import { renderToString } from 'react-dom/server';

app.get('*', (req, res) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  
  res.setHeader(
    'Content-Security-Policy',
    `script-src 'nonce-${nonce}' 'strict-dynamic'; object-src 'none';`
  );
  
  const html = renderToString(<App nonce={nonce} />);
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <script nonce="${nonce}" src="/bundle.js"></script>
    </head>
    <body>
      <div id="root">${html}</div>
      <script nonce="${nonce}">
        window.__NONCE__ = '${nonce}';
      </script>
    </body>
    </html>
  `);
});
```

### Adding Nonce to Dynamic Scripts

Client-side code that dynamically creates script elements must apply the nonce attribute to comply with CSP. The nonce value from the initial page load should be reused for all runtime-generated scripts to ensure they're whitelisted.

```javascript
// Client-side: Add nonce to dynamically created scripts
const nonce = window.__NONCE__;

const script = document.createElement('script');
script.src = 'https://example.com/analytics.js';
script.nonce = nonce; // Required for CSP
document.head.appendChild(script);
```

## Hash-based CSP

### How Hashing Works

```javascript
// 1. Calculate hash of script content
const script = "console.log('Hello');";
const hash = crypto.createHash('sha256').update(script).digest('base64');

// 2. Add hash to CSP
const csp = `script-src 'sha256-${hash}'`;

// 3. Inline script with exact content
<script>console.log('Hello');</script> // ✅ Allowed

// Different content: ❌ Blocked
<script>console.log('Hi');</script>
```

### Generating Hashes

```javascript
const crypto = require('crypto');

function generateCSPHash(content, algorithm = 'sha256') {
  const hash = crypto
    .createHash(algorithm)
    .update(content, 'utf8')
    .digest('base64');
  
  return `'${algorithm}-${hash}'`;
}

// Example
const scriptContent = "alert('Hello');";
const hash = generateCSPHash(scriptContent);
console.log(hash);
// Output: 'sha256-...'
```

### Build-Time Hash Generation

```javascript
// Webpack plugin example
const crypto = require('crypto');

class CSPHashPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('CSPHashPlugin', (compilation) => {
      compilation.hooks.htmlWebpackPluginAfterHtmlProcessing.tap(
        'CSPHashPlugin',
        (data) => {
          const hashes = [];
          
          // Extract inline scripts
          const scriptRegex = /<script>(.*?)<\/script>/gs;
          let match;
          
          while ((match = scriptRegex.exec(data.html)) !== null) {
            const content = match[1];
            const hash = crypto
              .createHash('sha256')
              .update(content, 'utf8')
              .digest('base64');
            hashes.push(`'sha256-${hash}'`);
          }
          
          // Store hashes for use in CSP header
          data.plugin.options.cspHashes = hashes;
        }
      );
    });
  }
}
```

## Strict CSP

### Recommended Strict CSP

```http
Content-Security-Policy:
  script-src 'nonce-{random}' 'strict-dynamic' https: 'unsafe-inline';
  object-src 'none';
  base-uri 'none';
```

### Why This Works

```javascript
// 1. 'nonce-{random}': Allow scripts with nonce
<script nonce="abc123" src="/app.js"></script> // ✅

// 2. 'strict-dynamic': Trust scripts loaded by trusted scripts
// If /app.js (trusted) loads another script:
const script = document.createElement('script');
script.src = '/dynamic.js';
script.nonce = 'abc123'; // Inherits trust
document.head.appendChild(script); // ✅ Allowed

// 3. https: Fallback for older browsers (ignore 'strict-dynamic')
// 4. 'unsafe-inline': Ignored in modern browsers with nonces
```

### Migration Strategy

```javascript
// Phase 1: Report-only mode
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "script-src 'self'; report-uri /csp-violation-report"
  );
  next();
});

// Phase 2: Enforce on subset of pages
app.get('/secure/*', (req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'self'"
  );
  next();
});

// Phase 3: Full enforcement
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "script-src 'nonce-{random}' 'strict-dynamic'"
  );
  next();
});
```

## CSP Reporting

### Report-URI

```javascript
// Set reporting endpoint
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; report-uri /csp-violation-report"
  );
  next();
});

// Handle violation reports
app.post('/csp-violation-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  const report = req.body['csp-report'];
  
  console.log('CSP Violation:', {
    blockedURI: report['blocked-uri'],
    violatedDirective: report['violated-directive'],
    originalPolicy: report['original-policy'],
    documentURI: report['document-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number']
  });
  
  // Log to monitoring service
  logToMonitoring(report);
  
  res.status(204).end();
});
```

### Report-To (Modern API)

```javascript
// Configure reporting endpoint
app.use((req, res, next) => {
  res.setHeader(
    'Report-To',
    JSON.stringify({
      group: 'csp-endpoint',
      max_age: 86400,
      endpoints: [{ url: 'https://example.com/csp-reports' }]
    })
  );
  
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; report-to csp-endpoint"
  );
  
  next();
});
```

### Violation Report Format

```json
{
  "csp-report": {
    "document-uri": "https://example.com/page",
    "referrer": "https://google.com/",
    "violated-directive": "script-src 'self'",
    "effective-directive": "script-src",
    "original-policy": "script-src 'self'; report-uri /csp-report",
    "disposition": "enforce",
    "blocked-uri": "https://evil.com/malware.js",
    "line-number": 15,
    "column-number": 20,
    "source-file": "https://example.com/page",
    "status-code": 200,
    "script-sample": ""
  }
}
```

## Common Patterns

### SPA (Single Page Application)

```javascript
const csp = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'", // CSS-in-JS
  "img-src 'self' data: https:",
  "font-src 'self'",
  "connect-src 'self' https://api.example.com",
  "frame-src 'none'",
  "object-src 'none'"
].join('; ');
```

### Third-Party Scripts

```javascript
// Analytics, ads, social widgets
const csp = [
  "default-src 'self'",
  "script-src 'self' https://www.google-analytics.com https://www.googletagmanager.com",
  "img-src 'self' https://www.google-analytics.com data:",
  "connect-src 'self' https://www.google-analytics.com",
  "frame-src 'none'"
].join('; ');
```

### Development vs Production

```javascript
const isDev = process.env.NODE_ENV === 'development';

const csp = isDev
  ? [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // HMR needs eval
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' ws: wss:" // WebSocket for HMR
    ].join('; ')
  : [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "connect-src 'self'"
    ].join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', csp);
  next();
});
```

## Interview Questions

**Q1: What is Content Security Policy?**

A: CSP is an HTTP header that defines trusted sources for content, preventing XSS and injection attacks.

**How it works:**
1. Server sends CSP header
2. Browser enforces policy
3. Blocks resources from untrusted sources
4. Reports violations

**Example:**
```http
Content-Security-Policy: script-src 'self' https://cdn.example.com
```
Allows scripts only from same origin and cdn.example.com.

**Q2: What's the difference between 'self' and https: in CSP?**

A:
```javascript
// 'self': Same origin only
script-src 'self'
// https://example.com/script.js ✅
// https://other.com/script.js ❌

// https:: Any HTTPS URL
script-src https:
// https://example.com/script.js ✅
// https://other.com/script.js ✅
// http://example.com/script.js ❌
```

**Q3: Why should you avoid 'unsafe-inline' in CSP?**

A: `'unsafe-inline'` allows inline scripts, defeating CSP's main purpose.

```javascript
// With 'unsafe-inline': XSS possible
script-src 'self' 'unsafe-inline'

// Attacker can inject:
<script>alert('XSS')</script> // ✅ Executes

// Without 'unsafe-inline': XSS blocked
script-src 'self'
<script>alert('XSS')</script> // ❌ Blocked

// Better alternatives:
// 1. Nonces: script-src 'nonce-abc123'
// 2. Hashes: script-src 'sha256-...'
// 3. External files: script-src 'self'
```

**Q4: Explain nonce-based CSP.**

A: Nonce (number used once) is a random value that allows specific inline scripts.

```javascript
// Server generates unique nonce per request
const nonce = crypto.randomBytes(16).toString('base64');

// CSP header includes nonce
Content-Security-Policy: script-src 'nonce-abc123'

// HTML includes nonce on allowed scripts
<script nonce="abc123">console.log('Allowed')</script> // ✅
<script>console.log('Blocked')</script> // ❌
```

**Benefits:**
- Allows inline scripts securely
- Defeats XSS (attacker can't guess nonce)
- No need for external script files

**Q5: What is 'strict-dynamic'?**

A: `'strict-dynamic'` allows scripts loaded by trusted scripts to also be trusted.

```javascript
// CSP with strict-dynamic
script-src 'nonce-abc123' 'strict-dynamic'

// Trusted script (has nonce)
<script nonce="abc123">
  // This script is trusted
  
  // Loading another script
  const script = document.createElement('script');
  script.src = '/dynamic.js';
  document.head.appendChild(script);
  // dynamic.js inherits trust ✅
</script>
```

**Without strict-dynamic**: dynamic.js would be blocked.

**Q6: How do you implement CSP reporting?**

```javascript
// 1. Add report-uri to CSP
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; report-uri /csp-violations"
  );
  next();
});

// 2. Handle violation reports
app.post('/csp-violations', (req, res) => {
  const violation = req.body['csp-report'];
  
  // Log violation
  logger.warn('CSP Violation', {
    blockedURI: violation['blocked-uri'],
    violatedDirective: violation['violated-directive']
  });
  
  res.status(204).end();
});
```

**Q7: What's the difference between CSP and CORS?**

A:
- **CSP**: Controls what resources a page can load
  ```http
  Content-Security-Policy: script-src 'self'
  ```
  Prevents loading scripts from untrusted domains

- **CORS**: Controls which origins can access your API
  ```http
  Access-Control-Allow-Origin: https://trusted.com
  ```
  Prevents other domains from calling your API

**Q8: How do you migrate to strict CSP?**

```javascript
// Step 1: Report-only mode (monitor violations)
Content-Security-Policy-Report-Only: script-src 'nonce-{random}'; report-uri /csp-reports

// Step 2: Fix violations (refactor inline scripts)
// Move inline scripts to external files or add nonces

// Step 3: Enforce on non-critical pages
Content-Security-Policy: script-src 'nonce-{random}'

// Step 4: Full enforcement
Content-Security-Policy: script-src 'nonce-{random}' 'strict-dynamic'
```

**Q9: What CSP directives prevent clickjacking?**

```javascript
// frame-ancestors: Controls who can embed your page
frame-ancestors 'none'  // Can't be embedded at all
frame-ancestors 'self'  // Only same origin
frame-ancestors https://trusted.com  // Specific domains

// Example: Bank website
Content-Security-Policy: frame-ancestors 'none'
// Prevents embedding in iframes (clickjacking protection)
```

**Q10: How do you handle third-party scripts with CSP?**

```javascript
// Option 1: Allowlist specific domains
script-src 'self' https://www.google-analytics.com https://cdn.example.com

// Option 2: Use nonces (if script supports it)
<script nonce="abc123" src="https://analytics.com/script.js"></script>

// Option 3: Use subresource integrity (SRI)
<script
  src="https://cdn.example.com/lib.js"
  integrity="sha384-..."
  crossorigin="anonymous"
></script>

// CSP with SRI
script-src 'self' https://cdn.example.com 'sha384-...'
```

## Summary

**CSP Implementation Checklist:**
- [ ] Start with report-only mode
- [ ] Use nonce-based CSP for inline scripts
- [ ] Avoid 'unsafe-inline' and 'unsafe-eval'
- [ ] Set frame-ancestors to prevent clickjacking
- [ ] Configure violation reporting
- [ ] Test thoroughly before enforcing
- [ ] Use strict-dynamic for dynamic script loading
- [ ] Keep CSP as restrictive as possible

**Recommended Strict CSP:**
```http
Content-Security-Policy:
  script-src 'nonce-{random}' 'strict-dynamic' https: 'unsafe-inline';
  object-src 'none';
  base-uri 'none';
  report-uri /csp-violations;
```

**Benefits:**
- Prevents XSS attacks
- Prevents clickjacking
- Prevents unauthorized resource loading
- Provides defense in depth

**Performance Impact:**
- No runtime performance cost
- Minimal bandwidth overhead (~100-500 bytes)
- May require refactoring inline scripts

---

[← CSRF Protection](./02-csrf-protection.md) | [Next: Security Headers →](./04-secure-headers.md)
