# Encryption

Encryption protects data from people who shouldn't see it — even if they get the raw bytes. This doc covers the parts that come up in senior interviews: symmetric vs asymmetric, TLS, AES-GCM at rest, KMS and envelope encryption, hashing vs encryption, certificates, and key rotation.

---

## 1. Symmetric vs Asymmetric

### 💡 **Symmetric uses one shared key. Asymmetric uses a public/private pair.**

**Symmetric encryption** (AES) — same key encrypts and decrypts. Fast. Used for bulk data.

**Asymmetric encryption** (RSA, ECC) — public key encrypts, private key decrypts. Slow. Used for key exchange and signatures.

**Comparison:**

| Feature       | Symmetric (AES-GCM)     | Asymmetric (RSA/ECC)             |
| ------------- | ----------------------- | -------------------------------- |
| **Keys**      | One shared key          | Public + private pair            |
| **Speed**     | Very fast               | 100–1000x slower                 |
| **Data size**| Any size                 | Small (key material, signatures) |
| **Use case** | Encrypt files, payloads | TLS handshake, JWT signing       |

**The real-world pattern:**

TLS and most systems use _both_. Asymmetric crypto exchanges a one-time symmetric key. Then symmetric encryption handles the actual data.

```
1. Alice and Bob exchange a session key using RSA/ECDH (slow, one-time)
2. They encrypt the conversation with AES-GCM (fast, bulk)
```

> Asymmetric crypto is rarely used to encrypt data directly. It's used to safely move a symmetric key.

---

## 2. TLS — Encryption in Transit

### 💡 **TLS protects data while it travels between client and server**

Every request between browser, mobile app, and server should go over TLS. Without it, attackers on the same network read everything.

**How a TLS handshake works:**

```
Client → Server: ClientHello (supported ciphers)
Server → Client: ServerHello + certificate (signed public key)
Client: verifies certificate against trusted CAs
Client → Server: encrypted session key (via ECDHE)
Both: derive symmetric keys, switch to encrypted traffic
```

**What TLS gives you:**

- **Confidentiality** — third parties can't read the data.
- **Integrity** — data wasn't tampered with.
- **Authenticity** — the server is who it claims to be.

**Common Mistakes:**

- ❌ Allowing TLS 1.0 or 1.1 — use TLS 1.2 or 1.3 only.
- ❌ Mixed-content pages (HTTPS page loading HTTP scripts).
- ❌ Self-signed certs in production — browsers reject them.
- ❌ Trusting any cert — pin in mobile apps for high-security flows.
- ✅ Force HTTPS via HSTS header.

**HSTS header:**

```typescript
import helmet from "helmet";
app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));
```

> TLS is solved infrastructure. Use a reverse proxy (nginx, ALB, CloudFront) or a managed service to terminate it. Don't hand-roll.

---

## 3. AES-GCM — Encryption at Rest

### 💡 **AES-GCM is the standard for encrypting data you store**

AES-GCM (Galois/Counter Mode) is an authenticated cipher — it encrypts _and_ checks for tampering. If anyone flips a bit, decryption fails.

**Node.js example:**

```typescript
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

interface Encrypted {
  iv: string;       // base64
  ciphertext: string;
  tag: string;
}

function encrypt(plaintext: string, key: Buffer): Encrypted {
  const iv: Buffer = crypto.randomBytes(12); // 96-bit IV for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext: Buffer = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag: Buffer = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    ciphertext: ciphertext.toString("base64"),
    tag: tag.toString("base64"),
  };
}

function decrypt(payload: Encrypted, key: Buffer): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const plaintext: Buffer = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}
```

**Key Rules for AES-GCM:**

- ✅ Use a unique IV (nonce) per encryption — never reuse with the same key.
- ✅ Store IV and tag alongside ciphertext (they aren't secret).
- ❌ Don't use AES-ECB or AES-CBC for new code — no built-in integrity.

> If you find yourself writing custom crypto code beyond calling these APIs, stop and use a higher-level library (e.g. libsodium).

---

## 4. KMS and Envelope Encryption

### 💡 **Don't store encryption keys in your app — use a KMS**

The hardest part of encryption is not the algorithm — it's **key management**. A Key Management Service (AWS KMS, GCP KMS, Azure Key Vault) holds master keys in hardware and never exposes them.

**Envelope encryption pattern:**

```
1. App asks KMS for a Data Encryption Key (DEK)
2. KMS returns:
   - plaintext DEK (use to encrypt the data)
   - encrypted DEK (store alongside data)
3. App encrypts data with plaintext DEK
4. App throws away plaintext DEK
5. To decrypt later: send encrypted DEK to KMS → get plaintext DEK back
```

**Why this works:**

- KMS handles only small operations (encrypt/decrypt DEKs). Cheap and fast.
- The master key never leaves KMS.
- If the database leaks, attackers get encrypted DEKs but can't decrypt them.

**AWS KMS example:**

```typescript
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from "@aws-sdk/client-kms";

const kms = new KMSClient({ region: "us-east-1" });
const KEY_ID = "alias/app-data-key";

async function encryptField(plaintext: string): Promise<{
  ciphertext: string;
  encryptedKey: string;
  iv: string;
  tag: string;
}> {
  const { Plaintext, CiphertextBlob } = await kms.send(
    new GenerateDataKeyCommand({ KeyId: KEY_ID, KeySpec: "AES_256" })
  );

  const dek = Buffer.from(Plaintext!);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", dek, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  dek.fill(0); // wipe plaintext DEK from memory

  return {
    ciphertext: ct.toString("base64"),
    encryptedKey: Buffer.from(CiphertextBlob!).toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
  };
}

async function decryptField(payload: {
  ciphertext: string;
  encryptedKey: string;
  iv: string;
  tag: string;
}): Promise<string> {
  const { Plaintext } = await kms.send(
    new DecryptCommand({
      CiphertextBlob: Buffer.from(payload.encryptedKey, "base64"),
    })
  );

  const dek = Buffer.from(Plaintext!);
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    dek,
    Buffer.from(payload.iv, "base64")
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  const pt = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final(),
  ]);
  dek.fill(0);
  return pt.toString("utf8");
}
```

**When to Use:**

- ✅ Any production system handling PII, payments, health data.
- ✅ Multi-tenant SaaS where each tenant needs its own master key.
- ❌ Prototypes — start simple, add KMS before launch.

> If you store a key in your `.env` file, it's not really protected. Use a KMS.

---

## 5. Hashing vs Encryption

### 💡 **Encryption is reversible. Hashing is one-way.**

Beginners confuse these constantly. Interviews catch it.

| Property        | Encryption                  | Hashing                            |
| --------------- | --------------------------- | ---------------------------------- |
| **Reversible?** | Yes, with the key           | No, never                          |
| **Output size** | Same as input (~)           | Fixed (e.g. 256 bits)              |
| **Use case**    | Protect data you'll read    | Verify integrity, store passwords  |
| **Examples**    | AES-GCM, RSA                | SHA-256, bcrypt, argon2            |

**When to Use:**

- ✅ Encrypt — credit cards, SSNs, anything you need back later.
- ✅ Hash (general) — file integrity, checksums, JWT signatures.
- ✅ Hash (passwords) — use bcrypt or argon2, _not_ SHA-256.

```typescript
import crypto from "node:crypto";

// General-purpose hash (file integrity, ETag, etc.)
function sha256(input: string): string {
  return crypto.createHash("sha256").update(input).digest("hex");
}

// HMAC for signing messages (e.g. webhook verification)
function sign(message: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(message).digest("hex");
}
```

> Passwords get _password hashes_ (bcrypt/argon2). SHA-256 is too fast and not for passwords.

---

## 6. Certificates and the CA Chain

### 💡 **A certificate proves a public key belongs to a domain**

When your browser connects to `bank.com`, the server sends a certificate. The certificate is the bank's public key, signed by a **Certificate Authority (CA)** the browser already trusts.

**Chain of trust:**

```
Root CA (in browser/OS trust store)
  └─ Intermediate CA (signed by root)
       └─ Server cert for bank.com (signed by intermediate)
```

**The browser verifies:**

1. Certificate is signed by a trusted CA.
2. Domain matches the cert's `Subject Alternative Name`.
3. Certificate hasn't expired.
4. Certificate isn't revoked (CRL / OCSP).

**Tools:**

- **Let's Encrypt** — free, automated DV certs.
- **AWS ACM / GCP Managed Certs** — free certs for cloud-hosted apps.
- **mTLS (mutual TLS)** — both client and server present certs. Used in service-to-service auth.

**Common Mistakes:**

- ❌ Letting certs expire — outages.
- ❌ Disabling cert verification "just to make it work" in clients.
- ✅ Automate renewal. Monitor expiry.

---

## 7. Key Rotation

### 💡 **Keys must change on a schedule — design for it from day one**

A key used for years is a key one breach away from disaster. Rotation limits the blast radius.

**Patterns:**

- **TLS certs** — rotate every 90 days (Let's Encrypt default).
- **Signing keys (JWT)** — publish multiple public keys via JWKS, rotate every 6–12 months.
- **KMS data keys** — KMS handles this; enable automatic key rotation.
- **API keys** — give each key a version, allow overlap during cutover.

**JWT signing key rotation:**

```typescript
const keys = {
  "key-2026-q1": { privateKey: "...", publicKey: "..." },
  "key-2026-q2": { privateKey: "...", publicKey: "..." },
};

const ACTIVE_KID = "key-2026-q2";

function signToken(payload: object): string {
  return jwt.sign(payload, keys[ACTIVE_KID].privateKey, {
    algorithm: "RS256",
    keyid: ACTIVE_KID,
  });
}

// Verifier looks up the kid from the token header
function verifyToken(token: string): object {
  return jwt.verify(token, (header, callback) => {
    const key = keys[header.kid as keyof typeof keys];
    callback(null, key?.publicKey);
  }) as object;
}
```

**When You Must Rotate Immediately:**

- A key may have leaked (developer laptop stolen, repo exposed).
- An employee with access leaves.
- A library used for crypto has a known flaw.

> Rotation is a habit, not an emergency response. Build it before you need it.

---

## Quick Decision Guide

| Scenario                            | Use This                       |
| ----------------------------------- | ------------------------------ |
| Browser ↔ server traffic            | TLS 1.3 + HSTS                 |
| Encrypt a field in the database     | AES-GCM + KMS envelope         |
| Encrypt many files in S3            | S3 SSE-KMS                     |
| Sign a JWT                          | RS256/ES256 + rotated keys     |
| Verify webhook came from us         | HMAC-SHA256                    |
| Store user passwords                | bcrypt or argon2 (not encrypt) |
| Service-to-service authentication   | mTLS                           |

---

## Key Takeaways

> **Symmetric is for bulk data. Asymmetric is for key exchange and signatures.**

> **Use AES-GCM for encryption at rest. Never reuse an IV with the same key.**

> **Don't store master keys in your app. Use KMS with envelope encryption.**

> **Hashing is one-way. Encryption is reversible. Passwords need _password hashes_ (bcrypt/argon2).**

> **TLS is solved. Use a managed terminator and enable HSTS.**

> **Key rotation is a feature, not a chore. Design for it from day one.**

---

[← Back to SystemDesign](../README.md)
