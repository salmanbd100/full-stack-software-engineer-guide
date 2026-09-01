---
title: Encryption in Transit and at Rest
part: 5
chapter: 0
slug: encryption-in-transit-and-at-rest
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-29
tags: [backend, security, https, tls, encryption, kms]
in_book: true
---

# Encryption in Transit and at Rest {#ch-encryption-in-transit-and-at-rest}

> Explain what the TLS handshake establishes, where it terminates, and who holds the keys to the data you store.

**In this chapter:** the handshake · certificates and the chain of trust · where TLS terminates · HSTS · AES-GCM at rest · KMS and key rotation

## 💡 The Core Idea

**HTTPS is HTTP inside a TLS tunnel.** TLS does three jobs at once:

| Job                 | What it means                                     |
| ------------------- | ------------------------------------------------- |
| **Encryption**      | Nobody on the network can read the traffic        |
| **Integrity**       | Nobody can modify it without being detected       |
| **Authentication**  | You're talking to the real server, not an impostor |

Encryption alone isn't enough. Without the certificate proving identity, you could be encrypting perfectly — to an attacker.

> **What HTTPS does not hide:** the domain you're visiting (via DNS and SNI), the size and timing of requests, and your IP address.

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

> ⚠️ **HSTS is hard to undo.** With `includeSubDomains`, every subdomain must serve valid HTTPS. Adding your domain to the browser preload list is close to permanent. Start with a short `max-age`, confirm everything works, then raise it.

## Encryption at Rest

TLS protects a row while it travels. It does nothing once the row is sitting in a database, a backup, or
an S3 bucket. Most of that is handled for you — managed databases and object stores encrypt their volumes
by default — and for most fields that is the right answer, because whole-disk encryption costs nothing and
protects against a stolen disk.

Field-level encryption is for the columns that would be a breach on their own: national insurance numbers,
health records, bank details. Encrypt those individually, so a leaked database dump is still unreadable.

**AES-256-GCM is the default choice.** GCM is an *authenticated* cipher — it encrypts and detects
tampering, so a flipped bit fails decryption rather than producing plausible garbage.

```typescript
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

interface Encrypted {
  iv: string; // base64 — not secret
  ciphertext: string;
  tag: string; // authentication tag
}

function encrypt(plaintext: string, key: Buffer): Encrypted {
  const iv: Buffer = crypto.randomBytes(12); // 96-bit nonce, fresh every time
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext: Buffer = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return {
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
  };
}

function decrypt(payload: Encrypted, key: Buffer): string {
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
```

> ⚠️ **Never reuse an IV with the same key.** With GCM, two messages sharing a nonce leak the plaintext
> difference and can let an attacker forge the authentication tag. Generate it fresh per encryption and
> store it beside the ciphertext — it does not need to be secret.

Encryption is reversible by design, which is why it is the wrong tool for passwords. A password store must
be one-way; see [Chapter ?? — Password Security](#ch-password-security).

## Key Management and Envelope Encryption

The algorithm is the easy part. The hard part is that a key in your environment variables is a key in your
deploy logs, your process listing, and every developer's laptop that ever ran production config.

A **key management service** — AWS KMS, GCP KMS, Azure Key Vault — holds a master key in hardware and
never hands it out. You send it data to wrap and unwrap instead.

**Envelope encryption** is the pattern that makes this fast:

```text
KMS master key → encrypts a per-record data key → encrypts the record
```

1. Ask the KMS for a data key. It returns the key twice: in plaintext, and encrypted under the master key.
2. Encrypt the record locally with the plaintext data key, then discard it from memory.
3. Store the *encrypted* data key alongside the ciphertext.
4. To read, send the encrypted data key back to the KMS to unwrap.

Bulk encryption stays local and fast; the only secret that ever leaves is a wrapped key that is useless
without the KMS. Rotating the master key then re-wraps data keys rather than re-encrypting every row.

## Rotating Keys

A key used for four years is one breach away from four years of exposure. Rotation limits the blast radius,
and it only works if the system was built expecting more than one key to be valid at a time.

| Key                | Cadence                | Mechanism                                    |
| ------------------ | ---------------------- | -------------------------------------------- |
| **TLS certificate**| 90 days                | ACME automation — already automatic          |
| **JWT signing key**| 6–12 months            | Publish several public keys via JWKS, sign with the newest |
| **KMS data keys**  | Managed                | Enable automatic rotation on the master key  |
| **API keys**       | On demand              | Version each key, allow an overlap window    |

The JWT case is the one that shows up in interviews, because it is where rotation is usually forgotten.
The token carries a `kid` in its header naming which key signed it, so a verifier can accept the old key
and the new key at once:

```typescript
const keys: Record<string, { privateKey: string; publicKey: string }> = {
  "2026-q1": { privateKey: "…", publicKey: "…" },
  "2026-q2": { privateKey: "…", publicKey: "…" },
};

const ACTIVE_KID = "2026-q2";

function signToken(payload: object): string {
  return jwt.sign(payload, keys[ACTIVE_KID].privateKey, {
    algorithm: "RS256",
    keyid: ACTIVE_KID, // verifiers use this to pick the public key
  });
}
```

Rotate immediately, rather than on schedule, when a key may have leaked: a stolen laptop, a secret pushed
to a repository, an engineer with access leaving, or a disclosed flaw in the library that generated it.

## 🔑 Key Takeaways

- TLS gives confidentiality, integrity and server identity at once; without the certificate, encryption only guarantees you reached *someone* privately.
- Terminate TLS at the edge for certificate management and handshake cost, then configure `trust proxy` deliberately so forwarded headers are only believed behind a real proxy.
- HSTS closes the plain-HTTP window that a redirect leaves open, and it is close to irreversible — raise `max-age` gradually.
- Use AES-256-GCM for data at rest, with a fresh IV per encryption, and reserve field-level encryption for the columns that would be a breach on their own.
- Keep master keys in a KMS and use envelope encryption, so rotation re-wraps data keys instead of re-encrypting every row.

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

## What to Read Next

- [Chapter ?? — Security Headers](#ch-security-headers) — HSTS in context with the rest of the header set
- [Chapter ?? — Password Security](#ch-password-security) — why passwords are hashed rather than encrypted
- [Chapter ?? — Pipeline Security](#ch-cicd-security) — where the keys this chapter assumes actually come from
