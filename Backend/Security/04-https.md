# HTTPS & SSL/TLS

## Overview

**HTTPS (Hypertext Transfer Protocol Secure)** is the secure version of HTTP, using SSL/TLS encryption to protect data in transit. It's essential for any application handling sensitive information and is now a baseline requirement for modern web applications.

**Key Principle:** Always use HTTPS in production. Unencrypted HTTP exposes all data, including passwords, session tokens, and personal information, to anyone monitoring network traffic.

---

## 🔒 What is HTTPS?

### 💡 **HTTPS = HTTP + TLS**

**HTTPS** encrypts communication between client and server, preventing:
- **Eavesdropping:** Attackers can't read transmitted data
- **Tampering:** Attackers can't modify data in transit
- **Impersonation:** Ensures you're connecting to the real server

**How It Works:**

```
┌──────────┐                    ┌──────────┐
│  Client  │                    │  Server  │
└──────────┘                    └──────────┘
     │                               │
     │  1. Client Hello              │
     ├──────────────────────────────▶│
     │  (Supported cipher suites)    │
     │                               │
     │  2. Server Hello              │
     ◀──────────────────────────────┤
     │  (Selected cipher, cert)      │
     │                               │
     │  3. Key Exchange              │
     ├──────────────────────────────▶│
     │  (Establish session keys)     │
     │                               │
     │  4. Encrypted Communication   │
     ├═══════════════════════════════▶
     ◀═══════════════════════════════┤
```

---

## 🔐 SSL vs TLS

### Version History

| Protocol | Year | Status | Notes |
|----------|------|--------|-------|
| **SSL 1.0** | 1994 | ❌ Never released | Had security flaws |
| **SSL 2.0** | 1995 | ❌ Deprecated | Broken, insecure |
| **SSL 3.0** | 1996 | ❌ Deprecated | POODLE attack (2014) |
| **TLS 1.0** | 1999 | ❌ Deprecated | Weak by modern standards |
| **TLS 1.1** | 2006 | ❌ Deprecated | Lacks modern features |
| **TLS 1.2** | 2008 | ✅ Secure | Widely supported |
| **TLS 1.3** | 2018 | ✅ Best | Faster, more secure |

**Key Insight:**
> "SSL" is often used colloquially, but we actually use **TLS** (Transport Layer Security). Always use TLS 1.2 or TLS 1.3.

---

## 📜 SSL/TLS Certificates

### 💡 **What Are Certificates?**

**SSL/TLS certificates** are digital credentials that:
- Prove server identity
- Enable encryption
- Establish trust

**Certificate Chain:**

```
┌─────────────────────────────┐
│   Root Certificate          │  ← Trusted by browsers
│   (Certificate Authority)    │
└─────────────────────────────┘
             ↓
┌─────────────────────────────┐
│   Intermediate Certificate  │  ← Issued by Root CA
└─────────────────────────────┘
             ↓
┌─────────────────────────────┐
│   Your Server Certificate   │  ← Your website
│   (example.com)             │
└─────────────────────────────┘
```

### Certificate Types

| Type | Validation Level | Cost | Use Case |
|------|------------------|------|----------|
| **Domain Validation (DV)** | Low (domain ownership) | Free-$50 | Blogs, personal sites |
| **Organization Validation (OV)** | Medium (company verification) | $50-$200 | Business websites |
| **Extended Validation (EV)** | High (legal entity verification) | $200-$1000 | E-commerce, banking |

### Free Certificates: Let's Encrypt

**Let's Encrypt** provides free, automated SSL/TLS certificates.

**Features:**
- ✅ Free forever
- ✅ Automated renewal
- ✅ Trusted by all browsers
- ✅ Supports wildcard certificates
- ✅ 90-day validity (auto-renew)

---

## 🚀 Setting Up HTTPS in Node.js

### Basic HTTPS Server

```javascript
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();

// Load SSL certificate
const options = {
  key: fs.readFileSync('path/to/private-key.pem'),
  cert: fs.readFileSync('path/to/certificate.pem'),
  // Optional: Certificate chain
  ca: fs.readFileSync('path/to/ca-bundle.pem'),
};

// Create HTTPS server
const server = https.createServer(options, app);

app.get('/', (req, res) => {
  res.send('Secure HTTPS connection!');
});

server.listen(443, () => {
  console.log('HTTPS server running on port 443');
});
```

### HTTP to HTTPS Redirect

```javascript
const http = require('http');
const https = require('https');
const express = require('express');

const app = express();

// Middleware to redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    // Already HTTPS
    next();
  } else {
    // Redirect to HTTPS
    res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
});

app.get('/', (req, res) => {
  res.send('Secure connection');
});

// HTTP server (port 80) - redirects to HTTPS
http.createServer(app).listen(80, () => {
  console.log('HTTP server on port 80 (redirects to HTTPS)');
});

// HTTPS server (port 443)
const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem'),
};

https.createServer(options, app).listen(443, () => {
  console.log('HTTPS server on port 443');
});
```

---

## 🔧 Let's Encrypt with Certbot

### Installation and Setup

**1. Install Certbot:**

```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot python3-certbot-nginx

# CentOS/RHEL
sudo yum install certbot python3-certbot-nginx

# macOS
brew install certbot
```

**2. Obtain Certificate:**

```bash
# Nginx
sudo certbot --nginx -d example.com -d www.example.com

# Apache
sudo certbot --apache -d example.com -d www.example.com

# Standalone (stops web server temporarily)
sudo certbot certonly --standalone -d example.com

# Webroot (keeps server running)
sudo certbot certonly --webroot -w /var/www/html -d example.com
```

**3. Auto-Renewal:**

```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Certbot automatically adds cron job for renewal
# Check: /etc/cron.d/certbot

# Manual renewal
sudo certbot renew
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name example.com www.example.com;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com www.example.com;

    # SSL Certificate paths (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    # SSL Configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # HSTS (HTTP Strict Transport Security)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Other security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

        # Forward real IP
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 🔐 TLS Configuration Best Practices

### Secure Cipher Suites

```javascript
const https = require('https');
const crypto = require('crypto');

const options = {
  key: fs.readFileSync('private-key.pem'),
  cert: fs.readFileSync('certificate.pem'),

  // Use TLS 1.2 and 1.3 only
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',

  // Strong cipher suites
  ciphers: [
    'ECDHE-ECDSA-AES128-GCM-SHA256',
    'ECDHE-RSA-AES128-GCM-SHA256',
    'ECDHE-ECDSA-AES256-GCM-SHA384',
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-CHACHA20-POLY1305',
    'ECDHE-RSA-CHACHA20-POLY1305',
  ].join(':'),

  // Prefer server cipher order
  honorCipherOrder: true,

  // Enable session resumption
  sessionTimeout: 300,
};

const server = https.createServer(options, app);
```

### HSTS (HTTP Strict Transport Security)

**Force browsers to always use HTTPS:**

```javascript
const helmet = require('helmet');

app.use(
  helmet.hsts({
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true, // Apply to all subdomains
    preload: true, // Include in browser preload list
  })
);

// Manual implementation
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

**Preload HSTS:**

1. Submit to: https://hstspreload.org/
2. Requirements:
   - Valid certificate
   - Redirect from HTTP to HTTPS on same host
   - Serve all subdomains over HTTPS
   - Serve HSTS header on base domain

---

## 🛡️ Security Headers

### Helmet.js - Security Header Middleware

```bash
npm install helmet
```

```javascript
const helmet = require('helmet');
const express = require('express');

const app = express();

// Use all default security headers
app.use(helmet());

// Or configure individually
app.use(
  helmet({
    // Content Security Policy
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },

    // HTTP Strict Transport Security
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },

    // X-Frame-Options
    frameguard: {
      action: 'deny',
    },

    // X-Content-Type-Options
    noSniff: true,

    // Referrer-Policy
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
  })
);

app.get('/', (req, res) => {
  res.send('Secured with Helmet');
});

app.listen(3000);
```

### Manual Security Headers

```javascript
app.use((req, res, next) => {
  // Enforce HTTPS
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );

  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Prevent MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS Protection
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
  );

  next();
});
```

---

## 🔍 Certificate Pinning

### 💡 **What is Certificate Pinning?**

**Certificate pinning** ensures the app only trusts specific certificates, preventing man-in-the-middle attacks even if a CA is compromised.

**Types:**
1. **Certificate Pinning:** Pin exact certificate
2. **Public Key Pinning:** Pin public key (survives certificate renewal)

### Implementation

```javascript
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');

// Expected certificate fingerprint
const EXPECTED_FINGERPRINT = 'AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99';

function verifyPinning(cert) {
  const fingerprint = cert.fingerprint256
    .replace(/:/g, '')
    .toUpperCase();

  const expectedFingerprint = EXPECTED_FINGERPRINT
    .replace(/:/g, '')
    .toUpperCase();

  return fingerprint === expectedFingerprint;
}

// Make request with certificate pinning
const options = {
  hostname: 'api.example.com',
  port: 443,
  path: '/data',
  method: 'GET',

  // Custom certificate verification
  checkServerIdentity: (host, cert) => {
    if (!verifyPinning(cert)) {
      return new Error('Certificate pinning failed');
    }
    return undefined;
  },
};

https.get(options, (res) => {
  console.log('Certificate pinning verified');
  res.on('data', (data) => {
    console.log(data.toString());
  });
});
```

**⚠️ Warning:** Certificate pinning can cause issues if:
- Certificate expires
- Certificate is rotated
- Backup certificates not pinned

**Recommendation:** Use for high-security mobile apps, not web apps.

---

## 🌐 Mixed Content Issues

### 💡 **What is Mixed Content?**

**Mixed content** occurs when HTTPS page loads HTTP resources.

**Types:**

1. **Active Mixed Content (Blocked):**
   - Scripts: `<script src="http://...">`
   - Stylesheets: `<link href="http://...">`
   - XHR/Fetch requests to HTTP

2. **Passive Mixed Content (Warning):**
   - Images: `<img src="http://...">`
   - Audio/Video: `<audio src="http://...">`

### Fixing Mixed Content

**❌ Bad:**
```html
<!-- Hard-coded HTTP -->
<script src="http://example.com/script.js"></script>
<img src="http://example.com/image.jpg">
<link rel="stylesheet" href="http://example.com/style.css">
```

**✅ Good:**
```html
<!-- Protocol-relative URLs -->
<script src="//example.com/script.js"></script>
<img src="//example.com/image.jpg">
<link rel="stylesheet" href="//example.com/style.css">

<!-- Or HTTPS explicitly -->
<script src="https://example.com/script.js"></script>
```

**Content Security Policy:**
```javascript
// Upgrade insecure requests automatically
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', 'upgrade-insecure-requests');
  next();
});
```

---

## 🔧 Testing HTTPS Configuration

### SSL Labs Test

**Test your HTTPS setup:**
- Visit: https://www.ssllabs.com/ssltest/
- Enter your domain
- Get grade (A+, A, B, C, F)
- Review recommendations

**Goal:** A+ rating

### Command Line Testing

```bash
# Check certificate
openssl s_client -connect example.com:443 -servername example.com

# Check certificate expiry
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null | openssl x509 -noout -dates

# Test TLS versions
openssl s_client -connect example.com:443 -tls1_2
openssl s_client -connect example.com:443 -tls1_3

# Check cipher suites
nmap --script ssl-enum-ciphers -p 443 example.com
```

### Node.js Testing

```javascript
const https = require('https');

function testHTTPS(hostname) {
  const options = {
    hostname,
    port: 443,
    path: '/',
    method: 'GET',
    rejectUnauthorized: true, // Verify certificate
  };

  https.get(options, (res) => {
    const cert = res.socket.getPeerCertificate();

    console.log('Certificate Info:');
    console.log('Subject:', cert.subject);
    console.log('Issuer:', cert.issuer);
    console.log('Valid From:', cert.valid_from);
    console.log('Valid To:', cert.valid_to);
    console.log('Protocol:', res.socket.getProtocol());
    console.log('Cipher:', res.socket.getCipher());

    // Check if certificate is valid
    const now = new Date();
    const validFrom = new Date(cert.valid_from);
    const validTo = new Date(cert.valid_to);

    if (now < validFrom || now > validTo) {
      console.error('Certificate is expired or not yet valid');
    } else {
      console.log('Certificate is valid');
    }
  }).on('error', (err) => {
    console.error('HTTPS error:', err.message);
  });
}

testHTTPS('example.com');
```

---

## 📚 Interview Questions

### Q1: What is the difference between HTTP and HTTPS?

**Answer:**

| Feature | HTTP | HTTPS |
|---------|------|-------|
| **Encryption** | ❌ None | ✅ TLS encryption |
| **Port** | 80 | 443 |
| **Data Security** | ❌ Plaintext | ✅ Encrypted |
| **Authentication** | ❌ None | ✅ Certificate verification |
| **SEO** | Lower ranking | Higher ranking |
| **Trust** | No padlock | Padlock icon |
| **Required For** | Public info | Sensitive data, login, payments |

**HTTP (Insecure):**
```
GET /api/login HTTP/1.1
Host: example.com
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "MyPassword123"
}

// ❌ Anyone on network can read this!
```

**HTTPS (Secure):**
```
// All data encrypted with TLS
// Eavesdroppers see only gibberish:
ÆØ∂ƒ˚∆˙©ƒ∆˙©ƒ√∂ƒ˙∆˚ßƒ∂˙...
```

**Why HTTPS is Essential:**

1. **Privacy:** Passwords, personal data protected
2. **Integrity:** Data can't be modified in transit
3. **Authentication:** Verify you're talking to real server
4. **SEO:** Google ranks HTTPS sites higher
5. **Trust:** Users see padlock, feel secure
6. **Compliance:** Required by GDPR, PCI-DSS

**How HTTPS Works:**

```
1. Client: "Hello, I support TLS 1.3"
2. Server: "Hello, here's my certificate"
3. Client: Verifies certificate with CA
4. Client & Server: Negotiate encryption keys
5. All communication encrypted from here
```

**Key Insight:**
> Always use HTTPS in production. Even if no sensitive data, HTTP allows tracking, injection attacks, and appears untrustworthy to users.

---

### Q2: Explain the TLS handshake process.

**Answer:**

**TLS Handshake** establishes secure connection before data transfer.

**Full Handshake (TLS 1.2):**

```
Client                                Server
  │                                      │
  │  1. ClientHello                      │
  ├─────────────────────────────────────▶│
  │  - TLS version                       │
  │  - Cipher suites                     │
  │  - Random bytes                      │
  │                                      │
  │  2. ServerHello                      │
  ◀─────────────────────────────────────┤
  │  - Selected cipher                   │
  │  - Server certificate                │
  │  - Random bytes                      │
  │                                      │
  │  3. Client verifies certificate      │
  │  (Check with CA)                     │
  │                                      │
  │  4. ClientKeyExchange                │
  ├─────────────────────────────────────▶│
  │  - Encrypted premaster secret        │
  │                                      │
  │  5. Both derive session keys         │
  │  (Client & Server compute same key)  │
  │                                      │
  │  6. ChangeCipherSpec                 │
  ├═════════════════════════════════════▶│
  │  7. Finished (encrypted)             │
  ├═════════════════════════════════════▶│
  │                                      │
  │  8. ChangeCipherSpec                 │
  ◀═════════════════════════════════════┤
  │  9. Finished (encrypted)             │
  ◀═════════════════════════════════════┤
  │                                      │
  │  Encrypted Application Data          │
  ├═════════════════════════════════════▶
  ◀═════════════════════════════════════┤
```

**Simplified Handshake (TLS 1.3 - Faster):**

```
Client                    Server
  │                          │
  │  1. ClientHello          │
  │  + Key Share             │
  ├─────────────────────────▶│
  │                          │
  │  2. ServerHello          │
  │  + Key Share             │
  │  + Certificate           │
  │  + Finished              │
  ◀─────────────────────────┤
  │                          │
  │  3. Finished             │
  ├═════════════════════════▶│
  │                          │
  │  Encrypted Data          │
  ├═════════════════════════▶
  ◀═════════════════════════┤
```

**TLS 1.3 Improvements:**
- **1-RTT:** One round-trip instead of two
- **0-RTT:** Session resumption with zero round-trips
- **Faster:** 50% faster than TLS 1.2
- **Simpler:** Removed weak cipher suites
- **More Secure:** Forward secrecy always enabled

**Cipher Suite Example:**
```
TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256
 │    │     │        │      │      │
 │    │     │        │      │      └─ HMAC algorithm
 │    │     │        │      └─ Encryption mode
 │    │     │        └─ Encryption algorithm
 │    │     └─ Authentication
 │    └─ Key exchange
 └─ Protocol
```

**Session Resumption:**

```javascript
// Session ID (TLS 1.2)
// Client sends session ID from previous connection
// Server reuses session keys (no full handshake)

// Session Ticket (TLS 1.2)
// Server sends encrypted session state
// Client presents ticket to resume

// PSK (TLS 1.3)
// Pre-Shared Key for 0-RTT
```

**Key Insight:**
> TLS 1.3 is significantly faster (1-RTT vs 2-RTT) and more secure than TLS 1.2. Always use TLS 1.2+ minimum.

---

### Q3: How do SSL/TLS certificates work?

**Answer:**

**SSL/TLS Certificates** establish server identity and enable encryption.

**What's In a Certificate:**

```
Certificate:
    Subject: CN=example.com
    Issuer: CN=Let's Encrypt Authority
    Validity:
        Not Before: Jan 1 00:00:00 2024
        Not After:  Apr 1 00:00:00 2024
    Public Key: RSA 2048 bit
    Signature Algorithm: SHA256withRSA
    Extensions:
        - Subject Alternative Names: example.com, www.example.com
        - Key Usage: Digital Signature, Key Encipherment
```

**Certificate Chain (Chain of Trust):**

```
┌──────────────────────────────────┐
│   Root CA Certificate            │
│   (Built into browsers)          │
│   Example: DigiCert Root CA      │
└──────────────────────────────────┘
                ↓ Signs
┌──────────────────────────────────┐
│   Intermediate CA Certificate    │
│   (Issued by Root CA)            │
│   Example: DigiCert TLS CA       │
└──────────────────────────────────┘
                ↓ Signs
┌──────────────────────────────────┐
│   Server Certificate             │
│   (Your website)                 │
│   Example: example.com           │
└──────────────────────────────────┘
```

**How Certificates Are Verified:**

**Step 1: Browser receives server certificate**
```
Server sends:
- Server certificate (example.com)
- Intermediate certificate
```

**Step 2: Browser verifies chain**
```javascript
// Pseudo-code
function verifyCertificate(cert, intermediateCert, rootCA) {
  // Check 1: Certificate not expired
  if (currentDate < cert.validFrom || currentDate > cert.validTo) {
    return false; // Expired
  }

  // Check 2: Domain matches
  if (cert.subject !== 'example.com') {
    return false; // Wrong domain
  }

  // Check 3: Intermediate signed by Root
  if (!verifySignature(intermediateCert, rootCA.publicKey)) {
    return false; // Invalid chain
  }

  // Check 4: Server cert signed by Intermediate
  if (!verifySignature(cert, intermediateCert.publicKey)) {
    return false; // Invalid signature
  }

  // Check 5: Certificate not revoked
  if (checkRevocationList(cert)) {
    return false; // Revoked
  }

  return true; // Valid certificate
}
```

**Types of Certificates:**

**1. Domain Validation (DV):**
- **Validation:** Prove domain ownership (email or DNS)
- **Time:** Minutes
- **Cost:** Free (Let's Encrypt)
- **Shows:** Padlock, "Secure"
- **Use:** Blogs, personal sites

**2. Organization Validation (OV):**
- **Validation:** Prove company exists
- **Time:** 1-3 days
- **Cost:** $50-$200/year
- **Shows:** Padlock + Company name (in details)
- **Use:** Business websites

**3. Extended Validation (EV):**
- **Validation:** Extensive company verification
- **Time:** 1-2 weeks
- **Cost:** $200-$1000/year
- **Shows:** Padlock + Company name in address bar (older browsers)
- **Use:** Banking, e-commerce

**Certificate Authorities (CAs):**

Major trusted CAs:
- Let's Encrypt (Free)
- DigiCert
- Sectigo (formerly Comodo)
- GlobalSign
- GoDaddy

**Common Certificate Errors:**

```javascript
// 1. Expired Certificate
// Not After: Jan 1, 2023 (past)
Error: NET::ERR_CERT_DATE_INVALID

// 2. Wrong Domain
// Certificate: api.example.com
// Visiting: www.example.com
Error: NET::ERR_CERT_COMMON_NAME_INVALID

// 3. Self-Signed Certificate
// Not signed by trusted CA
Error: NET::ERR_CERT_AUTHORITY_INVALID

// 4. Revoked Certificate
// Certificate has been revoked by CA
Error: NET::ERR_CERT_REVOKED

// 5. Incomplete Chain
// Missing intermediate certificate
Error: NET::ERR_CERT_AUTHORITY_INVALID
```

**Key Insight:**
> Certificates prove identity + enable encryption. Browser trusts Root CAs → Root signs Intermediate → Intermediate signs your cert. Chain of trust.

---

### Q4: What is HSTS and why is it important?

**Answer:**

**HSTS (HTTP Strict Transport Security)** forces browsers to always use HTTPS.

**The Problem HSTS Solves:**

```javascript
// Scenario without HSTS:
// 1. User types "example.com" (no https://)
// 2. Browser makes HTTP request first
GET http://example.com
// 3. Server redirects to HTTPS
HTTP/1.1 301 Moved Permanently
Location: https://example.com

// ❌ Problem: Initial HTTP request vulnerable to:
// - Man-in-the-middle attack
// - SSL stripping attack
// - Cookie theft
```

**HSTS Header:**

```javascript
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});
```

**Directive Breakdown:**

| Directive | Meaning | Example |
|-----------|---------|---------|
| **max-age** | Duration in seconds | `max-age=31536000` (1 year) |
| **includeSubDomains** | Apply to all subdomains | `includeSubDomains` |
| **preload** | Include in browser preload list | `preload` |

**How HSTS Works:**

```
First Visit (HTTPS):
1. User: GET https://example.com
2. Server: Response + HSTS header
3. Browser: Remembers "always use HTTPS for 1 year"

Subsequent Visits:
1. User types: example.com (no protocol)
2. Browser: Internally rewrites to https://example.com
3. NO HTTP request made - direct HTTPS
4. No opportunity for MITM attack
```

**Timeline:**

```javascript
// Day 1: First visit
GET https://example.com
Response:
  Strict-Transport-Security: max-age=31536000

// Day 2-365: Browser remembers
User types: example.com
Browser internally: https://example.com (no HTTP request)

// Day 366: HSTS expired
Browser will make HTTP request again
```

**Preload List:**

Submit your domain to: https://hstspreload.org/

**Requirements:**
1. Valid HTTPS certificate
2. Redirect all HTTP traffic to HTTPS on same host
3. Serve all subdomains over HTTPS
4. Serve HSTS header with:
   - `max-age` ≥ 31536000 (1 year)
   - `includeSubDomains` directive
   - `preload` directive

**Benefits of Preloading:**
- First visit is secure (no initial HTTP request)
- Hardcoded in browsers (Chrome, Firefox, Safari, etc.)
- Protects even before first visit

**Implementation:**

```javascript
const helmet = require('helmet');

// Using Helmet
app.use(
  helmet.hsts({
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  })
);

// Manual implementation
app.use((req, res, next) => {
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }
  next();
});
```

**Attack Prevented:**

**SSL Stripping Attack (without HSTS):**
```
1. Victim → HTTP request → Attacker → HTTPS → Server
2. Attacker strips HTTPS, forwards as HTTP
3. Victim sees HTTP, credentials stolen
```

**With HSTS:**
```
1. Browser: "Must use HTTPS" (from previous visit)
2. Direct HTTPS connection
3. Attack impossible
```

**Key Insight:**
> HSTS prevents SSL stripping attacks by forcing browsers to always use HTTPS. Set max-age to 1 year and include in preload list for maximum security.

---

### Q5: How do you handle SSL/TLS in production vs development?

**Answer:**

**Development vs Production SSL/TLS:**

| Aspect | Development | Production |
|--------|-------------|------------|
| **Certificate** | Self-signed | CA-signed (Let's Encrypt) |
| **Domain** | localhost | Real domain |
| **Port** | Any (3000, 8080) | 443 (HTTPS) |
| **Renewal** | Manual | Automated |
| **Cost** | Free | Free (Let's Encrypt) |
| **Trust** | Browser warning | Fully trusted |

**Development Setup:**

**Option 1: Self-Signed Certificate**

```bash
# Generate self-signed certificate
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout localhost-key.pem \
  -out localhost-cert.pem \
  -subj "/C=US/ST=State/L=City/O=Dev/CN=localhost"
```

```javascript
const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();

if (process.env.NODE_ENV === 'development') {
  // Development: Self-signed certificate
  const options = {
    key: fs.readFileSync('localhost-key.pem'),
    cert: fs.readFileSync('localhost-cert.pem'),
  };

  https.createServer(options, app).listen(3000, () => {
    console.log('Dev HTTPS server on https://localhost:3000');
    console.log('⚠️  Accept self-signed certificate in browser');
  });
} else {
  // Production: Real certificate
  const options = {
    key: fs.readFileSync('/etc/letsencrypt/live/example.com/privkey.pem'),
    cert: fs.readFileSync('/etc/letsencrypt/live/example.com/fullchain.pem'),
  };

  https.createServer(options, app).listen(443, () => {
    console.log('Production HTTPS server on port 443');
  });
}
```

**Option 2: mkcert (Better for Development)**

```bash
# Install mkcert
brew install mkcert  # macOS
choco install mkcert # Windows

# Create local CA
mkcert -install

# Generate certificate for localhost
mkcert localhost 127.0.0.1 ::1

# Generates:
# - localhost+2.pem (certificate)
# - localhost+2-key.pem (private key)
```

```javascript
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('localhost+2-key.pem'),
  cert: fs.readFileSync('localhost+2.pem'),
};

https.createServer(options, app).listen(3000, () => {
  console.log('Dev HTTPS: https://localhost:3000');
  console.log('✅ Trusted certificate (no browser warning)');
});
```

**Production Setup:**

**Option 1: Let's Encrypt (Recommended)**

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d example.com -d www.example.com

# Auto-renewal (cron job added automatically)
sudo certbot renew --dry-run
```

**Option 2: Reverse Proxy (Nginx handles SSL)**

```javascript
// Node.js app runs on HTTP (port 3000)
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('Hello from Node.js');
});

// Trust proxy (important!)
app.set('trust proxy', true);

app.listen(3000, () => {
  console.log('HTTP server on port 3000');
  console.log('Nginx handles HTTPS termination');
});
```

```nginx
# Nginx configuration
server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Environment-Based Configuration:**

```javascript
const express = require('express');
const http = require('http');
const https = require('https');
const fs = require('fs');

const app = express();

function startServer() {
  if (process.env.NODE_ENV === 'production') {
    // Production: Let's Encrypt certificate
    const options = {
      key: fs.readFileSync(process.env.SSL_KEY_PATH),
      cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };

    https.createServer(options, app).listen(443, () => {
      console.log('Production HTTPS on port 443');
    });

    // Redirect HTTP to HTTPS
    http.createServer((req, res) => {
      res.writeHead(301, { Location: `https://${req.headers.host}${req.url}` });
      res.end();
    }).listen(80);

  } else {
    // Development: HTTP only (or self-signed)
    http.createServer(app).listen(3000, () => {
      console.log('Development HTTP on port 3000');
    });
  }
}

startServer();
```

**Docker Production Setup:**

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY . .

EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
    networks:
      - app-network

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - app
    networks:
      - app-network

networks:
  app-network:
```

**Best Practices:**

**Development:**
- ✅ Use mkcert for trusted local certificates
- ✅ Use `https://localhost:3000` for testing
- ✅ Test mixed content issues early
- ❌ Don't commit certificates to git

**Production:**
- ✅ Use Let's Encrypt (free, automated)
- ✅ Use reverse proxy (Nginx/Cloudflare)
- ✅ Automate certificate renewal
- ✅ Monitor certificate expiry
- ✅ Enable HSTS
- ✅ Use TLS 1.2+ only
- ❌ Don't expose Node.js directly to internet

**Key Insight:**
> Development: mkcert for trusted local certs. Production: Let's Encrypt behind Nginx reverse proxy. Automate renewal, enable HSTS, monitor expiry.

---

## ✅ Best Practices Summary

### ✅ Do's

1. **Always use HTTPS in production** - No exceptions
2. **Use Let's Encrypt** for free, automated certificates
3. **Enable HSTS** with 1-year max-age
4. **Use TLS 1.2 or 1.3** - Disable older versions
5. **Redirect HTTP to HTTPS** with 301 redirect
6. **Use strong cipher suites** - Remove weak ciphers
7. **Automate certificate renewal** - Don't let certs expire
8. **Test with SSL Labs** - Aim for A+ rating
9. **Use security headers** - Helmet.js or manual
10. **Fix mixed content** - All resources over HTTPS
11. **Monitor certificate expiry** - Set alerts 30 days before
12. **Use reverse proxy** - Nginx/Cloudflare for SSL termination

### ❌ Don'ts

1. **Don't use HTTP in production** - Always HTTPS
2. **Don't use SSL 3.0 or TLS 1.0/1.1** - Deprecated
3. **Don't forget to renew certificates** - Automate renewal
4. **Don't use self-signed certs in production** - Use proper CA
5. **Don't expose Node.js directly** - Use reverse proxy
6. **Don't skip HSTS** - Critical security header
7. **Don't allow mixed content** - Breaks HTTPS security
8. **Don't use weak cipher suites** - Remove RC4, MD5
9. **Don't commit private keys** - Keep secrets secure
10. **Don't ignore certificate warnings** - They indicate problems

---

## 🎯 Summary

- **HTTPS = HTTP + TLS** - Encrypts all communication
- **TLS 1.3** is fastest and most secure (use TLS 1.2+ minimum)
- **Let's Encrypt** provides free, automated certificates
- **HSTS** forces browsers to always use HTTPS
- **Certificate chain** establishes trust (Root CA → Intermediate → Server)
- **Always redirect** HTTP to HTTPS (301)
- **Security headers** protect against common attacks (Helmet.js)
- **SSL Labs** test ensures proper configuration
- **Reverse proxy** (Nginx) handles SSL termination in production
- **Automate renewal** to prevent certificate expiry

---

[← Back to Backend](../README.md) | [Next: CORS & CSRF →](./05-cors-csrf.md)
