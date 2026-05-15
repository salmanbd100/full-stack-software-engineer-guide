# Common Attacks and Prevention

The OWASP Top 10 covers the attacks that put real systems in the news. Every senior engineer should know each class, recognize it in a code review, and know the standard fix. This file is the interview-grade short version.

## Table of Contents

1. [SQL Injection](#sql-injection)
2. [Cross-Site Scripting (XSS)](#cross-site-scripting-xss)
3. [CSRF (Cross-Site Request Forgery)](#csrf-cross-site-request-forgery)
4. [SSRF (Server-Side Request Forgery)](#ssrf-server-side-request-forgery)
5. [Broken Authentication](#broken-authentication)
6. [Broken Access Control](#broken-access-control)
7. [Security Misconfiguration](#security-misconfiguration)
8. [Vulnerable Dependencies](#vulnerable-dependencies)

---

## SQL Injection

### 💡 **Concatenated SQL lets the user write your query**

The attacker sends input that breaks out of the value and becomes SQL code.

**How It Works:**

A user submits `' OR '1'='1` as their email. The server builds:

```sql
SELECT * FROM users WHERE email = '' OR '1'='1' AND password = 'x'
```

The `OR '1'='1'` is always true. The query returns every user.

**❌ Vulnerable:**

```typescript
// String concatenation — attacker controls the SQL
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;
const rows = await db.query(query);
```

**✅ Mitigation: Parameterized Queries**

```typescript
import { Pool } from "pg";
const pool = new Pool();

// $1 is a placeholder — the driver escapes the value
const result = await pool.query(
  "SELECT * FROM users WHERE email = $1",
  [req.body.email]
);
```

**Rules:**

- ✅ Use parameterized queries or an ORM (Prisma, TypeORM)
- ✅ Apply least-privilege DB roles — the API user should not be able to `DROP TABLE`
- ❌ Never build SQL with template strings, even for "trusted" admin inputs

> If you see `${variable}` inside a SQL string in a code review, fail it. No exceptions.

---

## Cross-Site Scripting (XSS)

### 💡 **Attacker-supplied script runs in the victim's browser**

Three flavors, all with the same root cause: untrusted data rendered as HTML.

| Type      | Attack Path                                | Example                          |
| --------- | ------------------------------------------ | -------------------------------- |
| Stored    | Payload saved in DB, served to every user  | Malicious comment on a post      |
| Reflected | Payload in URL, echoed back in response    | Search query in error page       |
| DOM       | Client-side JS reads input and writes HTML | `el.innerHTML = location.hash`   |

**❌ Vulnerable (DOM XSS):**

```typescript
// Attacker visits ?msg=<img src=x onerror=fetch('/steal?c='+document.cookie)>
const msg: string = new URLSearchParams(location.search).get("msg") ?? "";
document.getElementById("box")!.innerHTML = msg;
```

**✅ Mitigation 1: Use safe APIs**

```typescript
// textContent escapes everything
document.getElementById("box")!.textContent = msg;
```

**✅ Mitigation 2: Sanitize when HTML is required**

```typescript
import DOMPurify from "dompurify";

const dirty: string = userBio;
const clean: string = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["b", "i", "em", "strong", "a"],
  ALLOWED_ATTR: ["href"],
});
document.getElementById("bio")!.innerHTML = clean;
```

**✅ Mitigation 3: Content Security Policy**

```typescript
import helmet from "helmet";

app.use(
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],  // No inline scripts
      objectSrc: ["'none'"],
    },
  })
);
```

> React, Vue, and Angular escape by default. XSS shows up when developers reach for `dangerouslySetInnerHTML`, `v-html`, or `[innerHTML]` without sanitizing.

---

## CSRF (Cross-Site Request Forgery)

### 💡 **The browser sends the user's cookies to your site without the user clicking**

The attacker hosts a page that auto-submits a form to your bank. The user is logged in, so the cookie rides along.

**How It Works:**

```html
<!-- evil.com -->
<form action="https://bank.com/transfer" method="POST">
  <input name="to" value="attacker" />
  <input name="amount" value="10000" />
</form>
<script>document.forms[0].submit()</script>
```

**✅ Mitigation 1: SameSite Cookies**

```typescript
res.cookie("session", token, {
  httpOnly: true,
  secure: true,
  sameSite: "strict", // Or "lax" — never "none" without good reason
});
```

`SameSite=Strict` blocks the cookie on any cross-site request. This kills classic CSRF on its own.

**✅ Mitigation 2: CSRF Token (double-submit)**

```typescript
import csurf from "csurf";

const csrfProtection = csurf({ cookie: true });

app.get("/form", csrfProtection, (req: Request, res: Response): void => {
  res.render("form", { csrfToken: req.csrfToken() });
});

app.post("/transfer", csrfProtection, (req: Request, res: Response): void => {
  // csurf throws if token is missing or wrong
  doTransfer(req.body);
  res.json({ ok: true });
});
```

**When to Use Which:**

- ✅ JSON API with `Bearer` token in `Authorization` header — no CSRF risk
- ✅ Cookie-based sessions — use `SameSite=Strict` + CSRF token
- ❌ Don't rely on `Referer` header — it can be missing or spoofed

> CSRF only works because cookies are sent automatically. JWTs in headers are immune.

---

## SSRF (Server-Side Request Forgery)

### 💡 **The server fetches a URL the attacker chose**

An "image preview" feature accepts a URL and fetches it. The attacker passes `http://169.254.169.254/latest/meta-data/` and steals AWS credentials from the instance metadata service.

**❌ Vulnerable:**

```typescript
app.post("/preview", async (req: Request, res: Response): Promise<void> => {
  const url: string = req.body.url;
  const response = await fetch(url); // Could be internal IP
  res.send(await response.text());
});
```

**✅ Mitigation: URL Allowlist + DNS Resolution Check**

```typescript
import dns from "dns/promises";
import { URL } from "url";

const ALLOWED_HOSTS = new Set(["images.example.com", "cdn.example.com"]);

async function safeFetch(rawUrl: string): Promise<Response> {
  const url = new URL(rawUrl);

  if (url.protocol !== "https:") throw new Error("https only");
  if (!ALLOWED_HOSTS.has(url.hostname)) throw new Error("host not allowed");

  // Block private IP ranges even if DNS rebinds
  const { address } = await dns.lookup(url.hostname);
  if (isPrivateIp(address)) throw new Error("private ip");

  return fetch(url);
}

function isPrivateIp(ip: string): boolean {
  return /^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.|169\.254\.)/.test(ip);
}
```

**Cloud-Specific Mitigation:**

- ✅ AWS: enforce IMDSv2 (requires a session token, blocks naive SSRF)
- ✅ Run egress proxies that block private ranges
- ❌ Don't trust `URL.hostname` alone — attackers use DNS rebinding

> Capital One's 2019 breach was SSRF against an AWS metadata endpoint. 100M records leaked.

---

## Broken Authentication

### 💡 **Login is the most attacked endpoint on the internet**

Common failures: weak passwords, no rate limit on login, predictable password reset tokens, sessions that never expire.

**❌ Common Mistakes:**

- Plaintext or MD5/SHA1 password storage
- No lockout after failed attempts
- Session ID in URL
- Reset tokens that don't expire

**✅ Mitigation:**

```typescript
import bcrypt from "bcrypt";

// Hash on signup
const hash: string = await bcrypt.hash(password, 12);

// Verify on login
const ok: boolean = await bcrypt.compare(submitted, hash);
```

**Login Hardening Checklist:**

| Control                       | Why                            |
| ----------------------------- | ------------------------------ |
| bcrypt / argon2 / scrypt      | Slow hashing resists brute force |
| Rate limit per IP and per user | Stops credential stuffing      |
| MFA (TOTP / WebAuthn)         | Defeats stolen passwords       |
| Short session lifetime        | Limits damage of stolen token  |
| Account lockout with backoff  | Slows automated attacks        |

> Use WebAuthn (passkeys) where you can. They are phishing-proof.

---

## Broken Access Control

### 💡 **Authenticated does not mean authorized**

The most common failure: a user changes the `id` in the URL and sees someone else's data (IDOR — Insecure Direct Object Reference).

**❌ Vulnerable:**

```typescript
app.get("/orders/:id", async (req: Request, res: Response): Promise<void> => {
  const order = await db.orders.findById(req.params.id);
  res.json(order); // Never checks if the order belongs to req.user
});
```

**✅ Mitigation: Always check ownership**

```typescript
app.get("/orders/:id", async (req: AuthedRequest, res: Response): Promise<void> => {
  const order = await db.orders.findById(req.params.id);
  if (!order || order.userId !== req.user!.id) {
    res.status(404).json({ error: "not found" });
    return;
  }
  res.json(order);
});
```

**Rules:**

- ✅ Default deny — every endpoint requires an explicit check
- ✅ Use a policy library (CASL, Oso) for complex rules
- ❌ Never trust hidden form fields or client-side role flags

> Return `404`, not `403`, when an object exists but the user lacks access. It hides which IDs are real.

---

## Security Misconfiguration

### 💡 **The defaults will hurt you**

Production with debug mode on, default admin passwords, S3 buckets open to the world, verbose error pages that leak stack traces.

**❌ Common Mistakes:**

- `NODE_ENV=development` in production
- Directory listings enabled on the web server
- Default credentials on databases, dashboards, admin panels
- CORS set to `*` for cookies
- Stack traces in 500 responses

**✅ Express Hardening:**

```typescript
import helmet from "helmet";
import express, { Request, Response, NextFunction } from "express";

const app = express();

app.disable("x-powered-by"); // Hide Express fingerprint
app.use(helmet());           // Sane security headers

// Generic error handler — never leak stack to the client
app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  console.error(err); // Log full detail server-side
  res.status(500).json({ error: "internal error" });
});
```

**Production Checklist:**

- ✅ `NODE_ENV=production`
- ✅ S3 buckets default-private; use Bucket Policies
- ✅ Database firewall: VPC-only, no public access
- ✅ Scan with `nmap` and AWS Inspector before launch

> Most "hacks" in the news are misconfigured defaults, not zero-days.

---

## Vulnerable Dependencies

### 💡 **You ship every line of every package you import**

A single bad transitive dep (Log4Shell, event-stream, left-pad) can compromise the whole app.

**✅ Mitigation:**

```bash
# Built-in audit
npm audit

# Better, with autofix
npm audit fix

# Continuous scanning
# - Dependabot (GitHub)
# - Snyk
# - GitHub Advanced Security
```

**CI Step:**

```typescript
// package.json
{
  "scripts": {
    "audit:ci": "npm audit --audit-level=high"
  }
}
```

**Rules:**

- ✅ Pin versions with a lockfile (`package-lock.json`)
- ✅ Automate weekly dep updates via Dependabot
- ✅ Vet new packages: downloads, last release date, maintainer count
- ❌ Don't install random packages from a Stack Overflow answer

> Supply-chain attacks are now common. Pin, audit, and prefer well-maintained packages.

---

## Interview Quick-Reference

| Attack             | One-Line Fix                                |
| ------------------ | ------------------------------------------- |
| SQL Injection      | Parameterized queries                       |
| Stored XSS         | DOMPurify + CSP                             |
| CSRF               | `SameSite=Strict` + CSRF token              |
| SSRF               | URL allowlist + IMDSv2                      |
| Broken Auth        | bcrypt + rate limit + MFA                   |
| Broken Access      | Ownership check on every fetch              |
| Misconfiguration   | helmet + disable debug + scan buckets       |
| Vuln Deps          | Dependabot + `npm audit --audit-level=high` |

[← Back to SystemDesign](../README.md)
