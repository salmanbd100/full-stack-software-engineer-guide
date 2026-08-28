---
title: Password Security
part: 5
chapter: 0
slug: passwords
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-08-28
tags: [backend, security, passwords]
in_book: true
---

# Password Security {#ch-password-security}

> Store a password so that a database leak is not an account leak.

**In this chapter:** argon2 and bcrypt · salting and why it is automatic · register and login · the rules that actually help · reset flows · brute-force protection

## Overview

Assume your database will leak one day. **Password security is about making that leak survivable.**

You never store the password. You store a slow, salted hash of it. When the user logs in, you hash what they typed and compare.

> **Hashing is not encryption.** Encryption is reversible by design — if you can decrypt a password, so can an attacker with your key. Hashing is one-way.

## Table of Contents

- [Choosing a Hashing Algorithm](#choosing-a-hashing-algorithm)
- [Salt and Why It Matters](#salt-and-why-it-matters)
- [Register and Login](#register-and-login)
- [Password Rules That Actually Help](#password-rules-that-actually-help)
- [Password Reset Flow](#password-reset-flow)
- [Brute Force Protection](#brute-force-protection)
- [Interview Questions](#interview-questions)

## Choosing a Hashing Algorithm

The right algorithm is **deliberately slow**. Speed is the attacker's advantage, not yours.

| Algorithm    | Verdict     | Memory-hard | Notes                                     |
| ------------ | ----------- | ----------- | ----------------------------------------- |
| **Argon2id** | ✅ Best     | ✅ Yes      | Password Hashing Competition winner       |
| **bcrypt**   | ✅ Good     | ❌ No       | 25+ years in production, everywhere       |
| **scrypt**   | ✅ Good     | ✅ Yes      | Solid, less common in Node.js             |
| **PBKDF2**   | ⚠️ Acceptable | ❌ No     | Use only when required for compliance     |
| **SHA-256**  | ❌ Never    | ❌ No       | Built for speed — billions of guesses/sec |
| **MD5**      | ❌ Never    | ❌ No       | Broken                                    |

**Why "memory-hard" matters:** bcrypt is slow on a CPU, but a GPU or custom chip can still run many hashes in parallel. Argon2id also demands a lot of RAM per hash, which is expensive to parallelize.

```typescript
import argon2 from "argon2";

// ✅ Recommended defaults — tune so hashing takes ~250–500ms on your hardware
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
} as const;

export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON_OPTIONS);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return argon2.verify(hash, plain); // parameters are read from the hash string
}
```

**bcrypt is still a fine choice**, and it's the most common answer in interviews:

```typescript
import bcrypt from "bcrypt";

const COST_FACTOR = 12; // each +1 doubles the work

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST_FACTOR);
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
```

> ⚠️ **bcrypt truncates at 72 bytes.** Longer passwords are silently cut. If you allow long passphrases, either cap the length or pre-hash with SHA-256 before bcrypt. Argon2 has no such limit.

## Salt and Why It Matters

A **salt** is random data mixed into each password before hashing. It is stored alongside the hash — it is not a secret.

```text
Without salt:  hash("password123") → same hash for every user
                                     → one rainbow table cracks them all

With salt:     hash("password123" + "a9f3...") → unique per user
                                     → the table must be rebuilt per user
```

Both bcrypt and Argon2 generate and embed the salt for you:

```text
$argon2id$v=19$m=19456,t=2,p=1$c29tZXNhbHQ$hashvalue...
 ^algo     ^ver ^parameters      ^salt        ^hash
```

That's why one string is all you store — verification reads the parameters back out of it.

**Pepper** is a second secret, shared across all users, kept outside the database (in a secret manager or HSM):

```typescript
import crypto from "node:crypto";

const PEPPER: string = process.env.PASSWORD_PEPPER!;

function withPepper(plain: string): string {
  return crypto.createHmac("sha256", PEPPER).update(plain).digest("base64");
}

// Hash the peppered value. A stolen DB alone is now not enough to crack.
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(withPepper(plain), ARGON_OPTIONS);
}
```

> ✨ Pepper only helps if the attacker gets the database but **not** the application secrets. Rotating it is painful, so add it deliberately — not by default.

## Register and Login

```typescript
import type { Request, Response } from "express";

export async function register(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };

  const problem: string | null = checkPasswordStrength(password);
  if (problem) {
    res.status(400).json({ error: problem });
    return;
  }

  const passwordHash: string = await hashPassword(password);
  await db.users.insert({ email, passwordHash });

  // Never echo the hash back, not even to admins.
  res.status(201).json({ email });
}
```

The login path has one subtlety worth calling out:

```typescript
export async function login(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email: string; password: string };
  const user = await db.users.findOne({ email });

  // ⚠️ Hash even when the user doesn't exist, so response time doesn't leak
  // whether the email is registered (a timing / user-enumeration attack).
  const hash: string = user?.passwordHash ?? DUMMY_HASH;
  const ok: boolean = await verifyPassword(hash, password);

  if (!user || !ok) {
    // ✅ One generic message for both cases.
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  res.json({ token: signAccessToken({ sub: user.id, role: user.role }) });
}
```

**❌ Bad — leaks which emails exist:**

```typescript
if (!user) return res.status(404).json({ error: "No account with that email" });
if (!ok) return res.status(401).json({ error: "Wrong password" });
```

**✅ Good:** identical status, identical message, similar timing.

### Upgrading hashes over time

Hardware gets faster, so today's cost factor is tomorrow's weak setting. Re-hash on successful login:

```typescript
if (await argon2.needsRehash(user.passwordHash, ARGON_OPTIONS)) {
  // We have the plaintext right here — the only moment we can upgrade it.
  await db.users.update(user.id, { passwordHash: await hashPassword(password) });
}
```

## Password Rules That Actually Help

Modern guidance (NIST SP 800-63B) is the opposite of what most apps do:

| Rule                              | Verdict | Why                                              |
| --------------------------------- | ------- | ------------------------------------------------ |
| Minimum 8 characters (12+ better) | ✅ Do   | Length beats complexity                          |
| Allow up to 64+ characters        | ✅ Do   | Don't block passphrases or password managers     |
| Check against breached-password lists | ✅ Do | Stops the passwords attackers try first        |
| Allow all Unicode and spaces      | ✅ Do   | Arbitrary restrictions push users to weak choices|
| Force upper + lower + digit + symbol | ❌ Don't | Produces `Password1!`, predictable and weak  |
| Force expiry every 90 days        | ❌ Don't | Produces `Summer2024`, then `Summer2025`        |
| Block paste in the password field | ❌ Don't | Breaks password managers                        |

```typescript
const COMMON_PASSWORDS = new Set(["password", "123456", "qwerty", "letmein"]);

export function checkPasswordStrength(password: string): string | null {
  if (password.length < 12) return "Password must be at least 12 characters";
  if (password.length > 128) return "Password is too long";
  if (COMMON_PASSWORDS.has(password.toLowerCase())) return "This password is too common";
  return null;
}
```

> ✨ **Best single upgrade:** check new passwords against the Have I Been Pwned range API. It uses k-anonymity — you send the first 5 characters of the SHA-1 hash, never the password.

## Password Reset Flow

The reset link is a temporary credential. Treat it like one.

```text
1. POST /forgot  { email }
        │
        ▼
2. Always respond "if that account exists, we sent a link"   ← no enumeration
        │
        ▼
3. Generate random token → store SHA-256(token) with 15-min expiry
        │
        ▼
4. Email the raw token as a one-time link
        │
        ▼
5. POST /reset  { token, newPassword }
        │
        ▼
6. Hash the token, look it up, check expiry, then delete it and all sessions
```

```typescript
import crypto from "node:crypto";

export async function requestReset(email: string): Promise<void> {
  const user = await db.users.findOne({ email });
  if (!user) return; // silent — the response is identical either way

  const raw: string = crypto.randomBytes(32).toString("hex");
  const tokenHash: string = crypto.createHash("sha256").update(raw).digest("hex");

  await db.resetTokens.insert({
    userId: user.id,
    tokenHash, // ⚠️ store the hash — a leaked DB shouldn't grant account takeover
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  await sendEmail(email, `https://app.example.com/reset?token=${raw}`);
}

export async function completeReset(raw: string, newPassword: string): Promise<void> {
  const tokenHash = crypto.createHash("sha256").update(raw).digest("hex");
  const record = await db.resetTokens.findOne({ tokenHash });

  if (!record || record.expiresAt < new Date()) throw new Error("Invalid or expired link");

  await db.users.update(record.userId, { passwordHash: await hashPassword(newPassword) });
  await db.resetTokens.deleteByUser(record.userId); // single use
  await db.sessions.deleteByUser(record.userId); // log out everywhere
}
```

## Brute Force Protection

Slow hashing protects a **stolen database**. Rate limiting protects the **live login endpoint**.

```typescript
import rateLimit from "express-rate-limit";

export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5, // per IP per window
  skipSuccessfulRequests: true, // only failures count
  message: { error: "Too many attempts. Try again later." },
});

app.post("/auth/login", loginLimiter, login);
```

**Layer three defenses:**

| Layer               | Stops                                  | Watch out for                        |
| ------------------- | -------------------------------------- | ------------------------------------ |
| **Per-IP limit**    | Simple scripted attacks                | Shared office IPs, NAT               |
| **Per-account lockout** | Targeted guessing on one account   | Becomes a denial-of-service on users |
| **CAPTCHA after N failures** | Bots, credential stuffing     | Adds friction — trigger it late      |

> ⚠️ **Exponential backoff beats hard lockout.** Locking an account for 30 minutes lets an attacker lock out your users on purpose. Increasing delays slow the attacker without a permanent block.

## Interview Questions

**Q1: How do you store passwords?**

Hashed with a slow, salted, adaptive algorithm — Argon2id, or bcrypt with cost 12+. Never plaintext, never encryption (reversible), never a fast hash like SHA-256 or MD5. The salt is generated per user and embedded in the hash string by the library.

**Q2: Why is SHA-256 wrong for passwords?**

It's designed to be fast. A GPU can compute billions of SHA-256 hashes per second, so an offline attack on a leaked database cracks common passwords almost immediately. bcrypt and Argon2 are deliberately slow and tunable, which keeps the attacker's cost high as hardware improves.

**Q3: What is a salt, and does it need to be secret?**

Random data unique per password, mixed in before hashing, so identical passwords produce different hashes. That defeats rainbow tables and means cracking must be done per user. It doesn't need to be secret — it's stored alongside the hash. It only needs to be unique and random.

**Q4: Salt vs. pepper?**

The salt is per-user and stored with the hash. The pepper is a single secret shared across all users and stored outside the database. If only the database leaks, the pepper still blocks cracking. Rotating a pepper is hard, so it's an extra layer, not a replacement for a good algorithm.

**Q5: Why one generic "invalid email or password" message?**

Different messages tell an attacker which emails are registered, which is the first step in credential stuffing. I also hash against a dummy value when the user isn't found, so response timing doesn't leak the same information.

**Q6: How do you build a secure password reset?**

Generate a cryptographically random token, store only its hash with a short expiry (15 minutes), and email the raw value. On use, hash the incoming token, look it up, check expiry, then delete it and invalidate all existing sessions. Respond identically whether or not the account exists.

**Q7: Should passwords expire every 90 days?**

No — NIST dropped that recommendation. Forced rotation leads to predictable variations like `Summer2024` → `Summer2025`. Force a change only when there's evidence of compromise, and instead check new passwords against known-breached lists and offer MFA.

## Summary

**Checklist:**

- [ ] Argon2id (or bcrypt cost 12+) — never a fast hash
- [ ] Cost tuned so a single hash takes 250–500 ms in production
- [ ] Salt generated by the library, embedded in the hash
- [ ] Generic error message and constant-ish timing on login
- [ ] Rate limiting plus exponential backoff on login and reset
- [ ] Reset tokens random, hashed at rest, short-lived, single-use
- [ ] All sessions invalidated after a password change
- [ ] New passwords checked against breached-password lists
- [ ] MFA offered for sensitive accounts

**Best practices:**

1. **Assume the database leaks** — that's what slow hashing is for.
2. **Length over complexity** — allow long passphrases, drop symbol rules.
3. **Never reveal whether an account exists.**
4. **Re-hash on login** when you raise the cost factor.

---

[← OAuth 2.0](./02-oauth.md) | [Next: HTTPS & TLS →](./04-https.md)
