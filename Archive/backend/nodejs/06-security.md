---
title: Node.js Security
part: 5
chapter: 0
slug: nodejs-security
level: advanced # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [backend, nodejs, security]
in_book: true
---

# Node.js Security {#ch-node-security}

> Close the injection paths specific to a Node service, including the ones JavaScript invents.

**In this chapter:** NoSQL injection · command injection · path traversal · prototype pollution · supply chain · secrets handling

## 💡 Scope of This Topic

The cross-cutting web security topics — JWT, OAuth, password hashing, CORS, CSRF, SQL injection, security headers — live in the [**Security module**](../Security/README.md) and apply to any backend.

This page covers what is specific to **running JavaScript on a server**: injection paths unique to Node, the npm supply chain, secrets, and process hardening.

| Looking for | Go to |
| --- | --- |
| JWT, OAuth, sessions | [Security 01–02](../Security/01-jwt.md) |
| Password hashing | [Security 03](../Security/03-passwords.md) |
| CORS and CSRF | [Security 05](../Security/05-cors-csrf.md) |
| Validation, SQL injection, headers | [Security 06–08](../Security/06-validation.md) |

---

## NoSQL Injection

SQL injection needs string concatenation. **NoSQL injection needs only a JSON body**, because Express parses `{"$gt": ""}` into an object and MongoDB treats it as an operator.

```typescript
// ❌ Attacker posts { "username": { "$gt": "" }, "password": { "$gt": "" } }
//    → matches the first user in the collection, no password needed
const user = await User.findOne({
  username: req.body.username,
  password: req.body.password,
});
```

**Fix: assert the type before it reaches the query.**

```typescript
import { z } from "zod";

const LoginSchema = z.object({
  username: z.string().min(1).max(64),   // an object now fails to parse
  password: z.string().min(8),
});

const { username, password } = LoginSchema.parse(req.body);

const user = await User.findOne({ username });   // guaranteed a string
if (!user || !(await verifyPassword(password, user.passwordHash))) {
  return res.status(401).json({ error: "Invalid credentials" });
}
```

> ✨ The general rule: **parse into a known shape at the boundary**. A validated string can't become a query operator.

---

## Command Injection

```typescript
// 🔴 ?host=example.com;rm -rf / — exec spawns a SHELL, so ; and | are honoured
exec(`ping -c 3 ${req.query.host}`, cb);
```

**`execFile` takes an argument array and no shell**, so there is nothing to escape:

```typescript
import { execFile } from "node:child_process";

if (!/^[a-zA-Z0-9.-]{1,253}$/.test(host)) {
  return res.status(400).json({ error: "Invalid host" });
}

execFile("ping", ["-c", "3", host], (err, stdout) => { /* ... */ });
```

| Function     | Shell? | Safe with user input                  |
| ------------ | ------ | ------------------------------------- |
| `exec`       | ✅ Yes | 🔴 Never                              |
| `execFile`   | ❌ No  | ✅ With a validated allowlist         |
| `spawn`      | ❌ No  | ✅ Unless you pass `shell: true`      |

> Best answer: don't shell out at all. Use a library. See [Child Processes](./07-child-processes.md).

---

## Path Traversal

```typescript
// 🔴 ?file=../../../../etc/passwd
res.sendFile(path.join("/var/data", req.query.file as string));
```

`path.join` normalises `..` — it does not stop it. **Resolve, then verify the result is still inside the root:**

```typescript
import path from "node:path";

const ROOT = path.resolve("/var/data");
const target = path.resolve(ROOT, req.query.file as string);

if (!target.startsWith(ROOT + path.sep)) {
  return res.status(403).json({ error: "Forbidden" });
}
```

✨ Safer still: never accept a path. Accept an ID and look the path up yourself.

---

## Prototype Pollution

A JavaScript-specific class of bug. If user input can set a key named `__proto__`, it changes `Object.prototype` for the **entire process**.

```typescript
// ❌ A naive deep merge on { "__proto__": { "isAdmin": true } }
merge({}, req.body);

({} as any).isAdmin;   // 🔴 true — every object in the process is now admin
```

**Defences:**

```typescript
// 1. Reject the dangerous keys
const FORBIDDEN = new Set(["__proto__", "constructor", "prototype"]);

// 2. Use a prototype-less object for user-keyed maps
const safe = Object.create(null);

// 3. Freeze the prototype at startup
Object.freeze(Object.prototype);

// 4. Best — validate into a fixed schema; unknown keys never survive
const Body = z.object({ name: z.string() }).strict();
```

⚠️ `JSON.parse` itself is safe. The risk is what you do next — deep merges, `lodash.set`-style paths, and `Object.assign` over untrusted keys.

---

## Supply Chain

Your app is mostly other people's code. A typical install pulls in over a thousand transitive packages, each of which can run scripts.

```bash
npm audit --audit-level=high     # in CI, fail the build
npm ci                           # honour the lockfile exactly — never `npm install` in CI
npm install --ignore-scripts     # block install-time code execution
```

| Risk | Mitigation |
| --- | --- |
| Known CVE in a dependency | `npm audit` in CI + Dependabot |
| Malicious `postinstall` | `--ignore-scripts`, `minimumReleaseAge` |
| Typosquatting | Review new dependency names carefully |
| Non-reproducible builds | Commit the lockfile, use `npm ci` |

> ✨ **Delay adoption of brand-new versions.** Most malicious releases are caught within hours. npm's `minimumReleaseAge` setting refuses packages published in the last N minutes, which defuses most compromised-maintainer attacks for free.

⚠️ **`npm audit fix --force` installs breaking major versions.** Never run it unattended in CI.

---

## Secrets

🔴 **Never commit a `.env`.** Once a secret reaches git history, it is compromised — rotate it, don't just delete the file.

```typescript
// ✅ Validate config at startup — fail loudly, not on first use at 3am
const Env = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  NODE_ENV: z.enum(["development", "test", "production"]),
});

export const env = Env.parse(process.env);
```

In production, prefer a secrets manager (AWS Secrets Manager, Vault) over environment variables — env vars leak into crash dumps, child processes, and logs.

**Keep secrets out of logs.** Structured loggers can redact by path:

```typescript
import pino from "pino";

const logger = pino({
  redact: ["req.headers.authorization", "req.headers.cookie", "*.password", "*.token"],
});
```

⚠️ `console.log(req.body)` on a login route writes plaintext passwords to your log aggregator. This is one of the most common real-world leaks.

---

## Rate Limiting

Protects against brute force, credential stuffing, and scraping.

```typescript
import rateLimit from "express-rate-limit";

app.use("/api", rateLimit({ windowMs: 60_000, limit: 100 }));

// Auth endpoints need to be far stricter
app.use("/api/login", rateLimit({
  windowMs: 15 * 60_000,
  limit: 5,
  skipSuccessfulRequests: true,   // only failed attempts count
}));
```

⚠️ **Behind a proxy, set `app.set("trust proxy", 1)`** — otherwise every request appears to come from the load balancer's IP and you rate-limit all users as one.

> In-memory counters reset on restart and aren't shared between instances. Use a Redis store in production.

---

## Process Hardening

```dockerfile
USER node                        # ✅ never run as root
```

```typescript
app.disable("x-powered-by");     // don't advertise Express

app.use(express.json({ limit: "100kb" }));   // cap body size — default is 100kb, keep it small
```

**Node's permission model** (stable since v22) restricts what the process can touch, which limits the blast radius of a compromised dependency:

```bash
node --permission --allow-fs-read=./config --allow-net app.js
```

---

## Interview Q&A

**Q: How is NoSQL injection different from SQL injection?**
A: SQL injection needs string concatenation, so parameterized queries end it. NoSQL injection needs no concatenation at all — the attacker sends a JSON object where you expected a string, and the driver faithfully turns `{"$gt": ""}` into a query operator. The fix is type validation at the boundary, not escaping.

**Q: What is prototype pollution and why is it Node-specific?**
A: It exploits JavaScript's prototype chain. Setting `__proto__` through an unsafe deep merge or path-set modifies `Object.prototype`, so every object in the process inherits the attacker's property — often escalating to auth bypass when code checks `user.isAdmin`. It's JavaScript-specific because no other mainstream server language has a mutable shared prototype.

**Q: How do you secure the npm supply chain?**
A: Commit lockfiles and use `npm ci` for reproducible installs; run `npm audit` at a failing threshold in CI; use `--ignore-scripts` so install hooks can't execute; and delay adopting brand-new releases, since most malicious publishes are pulled within hours. Fewer dependencies is the underrated control.

**Q: `exec` vs `execFile` vs `spawn`?**
A: `exec` runs the command through a shell, so any user-controlled substring can inject with `;` or `|`. `execFile` and `spawn` take an argument array and no shell, so arguments can't become commands. Use `execFile` with an allowlist-validated input, and never pass `shell: true` with user data.

**Q: Where should secrets live?**
A: Not in code, not in the image, and ideally not in environment variables. A secrets manager gives you rotation, audit logs, and per-service access. Env vars are acceptable as a step up from files but leak into crash dumps and child processes. Validate all config at startup so a missing secret fails on boot rather than on first request.

---

## Best Practices

✅ Validate request bodies into a strict schema at the boundary
✅ Use `execFile`/`spawn` without a shell; validate against an allowlist
✅ Resolve file paths and verify they stay inside the root
✅ Run `npm ci` and `npm audit` in CI; commit lockfiles
✅ Redact tokens, passwords, and cookies in your logger
✅ Rate-limit auth endpoints separately and far harder
✅ Run as a non-root user; disable `x-powered-by`; cap body size
❌ Don't pass user input to `exec`
❌ Don't deep-merge untrusted objects
❌ Don't commit `.env` — and rotate anything that ever was committed

---

[← Previous: Performance](./05-performance.md) | [Next: Child Processes →](./07-child-processes.md)
