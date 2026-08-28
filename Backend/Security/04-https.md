---
title: HTTPS and TLS
part: 5
chapter: 0
slug: https
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-28
tags: [backend, security, https]
in_book: true
---

# HTTPS and TLS {#ch-https-and-tls}

> Explain what the handshake establishes, and where in your stack TLS actually terminates.

**In this chapter:** the handshake · certificates and the chain of trust · TLS 1.3 · terminating at the edge vs the origin · HSTS

## Overview

**HTTPS is HTTP inside a TLS tunnel.** TLS does three jobs at once:

| Job                 | What it means                                     |
| ------------------- | ------------------------------------------------- |
| **Encryption**      | Nobody on the network can read the traffic        |
| **Integrity**       | Nobody can modify it without being detected       |
| **Authentication**  | You're talking to the real server, not an impostor |

Encryption alone isn't enough. Without the certificate proving identity, you could be encrypting perfectly — to an attacker.

> **What HTTPS does not hide:** the domain you're visiting (via DNS and SNI), the size and timing of requests, and your IP address.

## Table of Contents

- [The TLS Handshake](#the-tls-handshake)
- [Certificates and the Chain of Trust](#certificates-and-the-chain-of-trust)
- [TLS Versions and Configuration](#tls-versions-and-configuration)
- [Where TLS Terminates](#where-tls-terminates)
- [HTTPS in Node.js](#https-in-nodejs)
- [HSTS: Forcing HTTPS](#hsts-forcing-https)
- [Interview Questions](#interview-questions)

## The TLS Handshake

```text
Client                                          Server
  │                                                │
  │  1. ClientHello                                │
  │     (TLS versions, cipher suites, key share)   │
  ├───────────────────────────────────────────────▶│
  │                                                │
  │  2. ServerHello + certificate chain            │
  │     (chosen cipher, server key share)          │
  ◀───────────────────────────────────────────────┤
  │                                                │
  │  3. Client verifies the certificate            │
  │     (signature chain, hostname, expiry)        │
  │                                                │
  │  4. Both derive the same session key           │
  │     (ECDHE — the key is never transmitted)     │
  │                                                │
  │  5. Encrypted application data                 │
  ├═══════════════════════════════════════════════▶│
  ◀═══════════════════════════════════════════════┤
```

**The key insight:** TLS uses **asymmetric** cryptography (slow) only to agree on a **symmetric** session key (fast). All the actual data is encrypted symmetrically.

**TLS 1.3 does this in one round trip** instead of two, so connections are noticeably faster than TLS 1.2.

### Forward secrecy

With **ECDHE** key exchange, both sides derive a fresh session key that is never sent over the wire and is discarded afterwards.

> ✅ If the server's private key is stolen next year, **past** recorded traffic still can't be decrypted. That's forward secrecy — and it's why static RSA key exchange was removed in TLS 1.3.

## Certificates and the Chain of Trust

A certificate binds a **domain name** to a **public key**, signed by someone the browser already trusts.

```text
Root CA (in the OS/browser trust store)
    │  signs
    ▼
Intermediate CA
    │  signs
    ▼
Your certificate  (example.com)
```

The browser walks up this chain. If it reaches a trusted root and every signature is valid, the certificate is accepted.

**What the browser checks:**

- ✅ Signature chains to a trusted root
- ✅ The hostname matches the Subject Alternative Name (SAN)
- ✅ Current date is between `notBefore` and `notAfter`
- ✅ The certificate isn't revoked (OCSP stapling / CRL)

**Certificate types:**

| Type       | Validates                 | Issued in   | Use for                     |
| ---------- | ------------------------- | ----------- | --------------------------- |
| **DV**     | Domain control only       | Minutes     | Almost everything           |
| **OV**     | Domain + organization     | Days        | Corporate sites             |
| **EV**     | Extended legal checks     | Weeks       | Rarely worth it now         |
| **Wildcard** | `*.example.com`         | Minutes     | Many subdomains, one cert   |

> ⚠️ **A wildcard cert is one private key for every subdomain.** If one server is compromised, every subdomain is. Prefer separate certs (automated via ACME) for anything sensitive.

**Let's Encrypt** issues free DV certificates valid for 90 days. The short life is intentional — it forces automation, and automated renewal is more reliable than a calendar reminder.

```bash
# Issue and auto-renew for Nginx; Certbot installs a renewal timer
sudo certbot --nginx -d example.com -d www.example.com
sudo certbot renew --dry-run
```

## TLS Versions and Configuration

| Version     | Status         | Notes                                |
| ----------- | -------------- | ------------------------------------ |
| SSL 2.0/3.0 | ❌ Broken      | POODLE; disabled everywhere          |
| TLS 1.0/1.1 | ❌ Deprecated  | Removed by browsers in 2020          |
| **TLS 1.2** | ✅ Secure      | Minimum acceptable today             |
| **TLS 1.3** | ✅ Best        | Faster, weak ciphers removed by design |

> **Interview note:** "SSL" is the dead protocol; TLS replaced it in 1999. People still say "SSL certificate" out of habit — the certificate itself is the same either way.

**A good baseline (Nginx):**

```nginx
ssl_protocols TLSv1.2 TLSv1.3;
ssl_prefer_server_ciphers off;         # TLS 1.3 ciphers are all strong
ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:...;
ssl_session_cache shared:SSL:10m;      # cheaper resumed handshakes
ssl_stapling on;                       # OCSP stapling — faster revocation check
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains" always;
```

**What "strong cipher" means in practice:** ECDHE for key exchange (forward secrecy) and an AEAD cipher such as AES-GCM or ChaCha20-Poly1305 (encryption + integrity in one step).

## Where TLS Terminates

In real deployments, your Node.js process usually does **not** handle TLS.

```text
Internet ──TLS──▶ Load balancer / CDN ──plain HTTP──▶ Node.js app
                  (certificate lives here)              (private network)
```

**Why terminate at the edge:**

- ✅ Certificate renewal happens in one place
- ✅ The expensive handshake is offloaded from your app
- ✅ Your app code stays simple

**What this changes in your app:**

```typescript
// Behind a proxy, req.protocol is "http" unless you trust the proxy headers.
app.set("trust proxy", 1); // trust the first proxy hop

app.use((req, res, next) => {
  // Now req.secure and req.ip reflect X-Forwarded-Proto / X-Forwarded-For
  if (!req.secure) {
    res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    return;
  }
  next();
});
```

> 🔴 **Only set `trust proxy` when you're actually behind a proxy you control.** Otherwise a client can forge `X-Forwarded-For` and defeat your IP-based rate limiting.

## HTTPS in Node.js

Useful for local development and for services that talk directly to each other.

```typescript
import https from "node:https";
import fs from "node:fs";
import express from "express";

const app = express();

const server = https.createServer(
  {
    key: fs.readFileSync("/etc/ssl/private/key.pem"),
    cert: fs.readFileSync("/etc/ssl/certs/fullchain.pem"), // full chain, not just leaf
    minVersion: "TLSv1.2",
  },
  app,
);

server.listen(443);
```

> ⚠️ Use the **full chain** file. If you serve only the leaf certificate, browsers may still work (they cache intermediates) while mobile apps and API clients fail — a classic "works for me" bug.

**For local development**, self-signed certificates trigger browser warnings. `mkcert` creates a local CA your machine trusts, so `https://localhost` works cleanly:

```bash
mkcert -install
mkcert localhost 127.0.0.1
```

## HSTS: Forcing HTTPS

An HTTP → HTTPS redirect leaves one unprotected request. That first request can be hijacked (SSL stripping).

**HSTS** tells the browser: for this domain, never use HTTP again.

```typescript
import helmet from "helmet";

app.use(
  helmet({
    strictTransportSecurity: {
      maxAge: 63072000, // 2 years, in seconds
      includeSubDomains: true,
      preload: true,
    },
  }),
);
// Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

After the first successful HTTPS visit, the browser upgrades every later request itself — no redirect, no exposed hop.

> 🔴 **HSTS is hard to undo.** With `includeSubDomains`, every subdomain must serve valid HTTPS. Adding your domain to the browser preload list is close to permanent. Start with a short `max-age`, confirm everything works, then raise it.

## Interview Questions

**Q1: What does HTTPS actually protect?**

Three things: confidentiality (traffic is encrypted), integrity (tampering is detected), and server identity (the certificate proves you reached the right host). It does not hide which domain you visited, your IP, or traffic size and timing.

**Q2: Walk me through the TLS handshake.**

The client sends supported versions, cipher suites, and a key share. The server picks a cipher, returns its certificate chain and its key share. The client verifies the chain up to a trusted root and checks the hostname and expiry. Both sides derive the same symmetric session key using ECDHE — it's never transmitted — and all further traffic is encrypted with it. TLS 1.3 does this in one round trip.

**Q3: Why does TLS use both asymmetric and symmetric cryptography?**

Asymmetric crypto solves key distribution but is slow. Symmetric crypto is fast but needs a shared key. TLS uses asymmetric operations only during the handshake to authenticate the server and agree on a session key, then switches to symmetric encryption for the data.

**Q4: What is forward secrecy?**

With ephemeral key exchange (ECDHE), each session key is derived fresh and never sent over the network. If the server's long-term private key later leaks, previously recorded sessions still can't be decrypted. TLS 1.3 requires it.

**Q5: How does a browser decide a certificate is trustworthy?**

It verifies the signature chain up to a root CA in its trust store, checks the hostname against the certificate's SAN entries, checks the validity dates, and checks revocation (usually via OCSP stapling). Any failure produces a warning.

**Q6: What is HSTS and why does it matter?**

A response header telling the browser to use HTTPS for this domain for a set duration. It closes the SSL-stripping window where the initial plain-HTTP request could be intercepted before the redirect. It's hard to reverse, so raise `max-age` gradually.

**Q7: Where should TLS terminate?**

Usually at a load balancer or CDN. That centralizes certificate management, offloads handshake cost, and keeps app code simple. The app then needs `trust proxy` set so it reads the real protocol and client IP from forwarded headers — and only when it truly is behind a trusted proxy.

## Summary

**Checklist:**

- [ ] TLS 1.2 minimum; TLS 1.3 enabled
- [ ] Certificate auto-renewed (ACME/Certbot), monitored for expiry
- [ ] Full chain served, not just the leaf certificate
- [ ] ECDHE key exchange + AEAD ciphers (AES-GCM / ChaCha20)
- [ ] HTTP redirects to HTTPS with a 301
- [ ] HSTS with a long `max-age`, after verifying subdomains
- [ ] OCSP stapling enabled
- [ ] `Secure` flag on every cookie
- [ ] No mixed content — all assets over HTTPS
- [ ] Configuration graded on SSL Labs (aim for A/A+)

**Best practices:**

1. **Automate renewal** — expired certificates cause more outages than attacks.
2. **Terminate at the edge**, then trust proxy headers deliberately.
3. **HSTS gradually** — it's a one-way door.
4. **Encryption without identity is worthless** — the certificate is the point.

---

[← Password Security](./03-passwords.md) | [Next: CORS & CSRF →](./05-cors-csrf.md)
