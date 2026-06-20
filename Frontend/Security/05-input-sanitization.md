# Input Validation and Sanitization

## Overview

Two related but different jobs:

- **Validation** — *reject* input that doesn't fit the rules (wrong type, format, or length).
- **Sanitization** — *clean* input so it's safe to use (strip or escape dangerous parts).

You usually need both. Validate to confirm shape; sanitize to neutralize danger. And one rule sits above everything:

> 🔴 **All input is hostile until proven otherwise** — including data from your own previous responses, mobile clients, and partner APIs.

## Table of Contents

- [Client-Side Is UX; Server-Side Is Security](#client-side-is-ux-server-side-is-security)
- [Schema Validation with Zod](#schema-validation-with-zod)
- [Validation vs. Sanitization in Practice](#validation-vs-sanitization-in-practice)
- [SQL Injection: Parameterize, Always](#sql-injection-parameterize-always)
- [Command Injection: Avoid the Shell](#command-injection-avoid-the-shell)
- [File Upload Security](#file-upload-security)
- [Interview Questions](#interview-questions)

## Client-Side Is UX; Server-Side Is Security

Client-side validation gives instant feedback. It provides **zero security** — anyone can skip your UI and call the API directly with `curl`.

| Layer        | Purpose            | Security             | Can be bypassed?     |
| ------------ | ------------------ | -------------------- | -------------------- |
| Client-side  | Fast user feedback | None                 | ✅ Trivially         |
| Server-side  | Real enforcement   | This is the boundary | ❌ It's the gate     |

```typescript
// ❌ The mistake: trusting that the client already validated
app.post("/contact", (req, res) => {
  db.contacts.insert({ email: req.body.email }); // attacker sent raw JSON
});
```

```typescript
// ✅ Validate on the server — the only check that counts
app.post("/contact", (req, res) => {
  const email = req.body.email;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: "Invalid email" });
  }
  db.contacts.insert({ email: email.trim().toLowerCase() });
  res.json({ ok: true });
});
```

## Schema Validation with Zod

Hand-written `if` checks don't scale. A **schema validator** declares the rules once and validates against them. **Zod** is the standard for TypeScript — the schema also produces the static type, so runtime checks and compile-time types never drift apart.

```typescript
import { z } from "zod";

const userSchema = z.object({
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  password: z
    .string()
    .min(8)
    .regex(/[A-Z]/, "needs an uppercase letter")
    .regex(/[0-9]/, "needs a number"),
  website: z.string().url().optional(),
});

// One source of truth: the schema *is* the type
type User = z.infer<typeof userSchema>;

const result = userSchema.safeParse(req.body);
if (!result.success) {
  // result.error.flatten().fieldErrors → per-field messages
}
```

**As reusable Express middleware:**

```typescript
import type { Request, Response, NextFunction } from "express";
import type { ZodSchema } from "zod";

function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.flatten().fieldErrors });
      return;
    }
    req.body = result.data; // typed and trimmed
    next();
  };
}

app.post("/users", validateBody(userSchema), (req, res) => {
  // req.body is valid and typed here
});
```

> ✨ **Same schema, both sides.** Zod runs in the browser too, so you can share one schema between client (UX) and server (security) — for example with React Hook Form's `zodResolver`.

## Validation vs. Sanitization in Practice

Use the right tool for the data's destination.

| Destination               | Approach                       | Tool                       |
| ------------------------- | ------------------------------ | -------------------------- |
| Plain text you display    | Encode on output               | Framework escaping         |
| Rich HTML you must render | Sanitize (strip dangerous tags)| `DOMPurify`                |
| SQL query                 | Parameterize — never concat    | DB driver / ORM            |
| Shell command             | Avoid shell; pass args array   | `execFile`                 |
| Structured fields         | Validate against a schema      | `zod`                      |

**Sanitizing HTML you can't avoid rendering:**

```typescript
import DOMPurify from "dompurify";

const clean: string = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
// <script>, onerror=, javascript: URLs all removed
```

> See [01-xss-prevention.md](./01-xss-prevention.md) for the full encoding-vs-sanitization story.

## SQL Injection: Parameterize, Always

SQL injection happens when user input is **concatenated** into a query string, so input becomes SQL.

```typescript
// ❌ Catastrophic: input becomes part of the query
const q = `SELECT * FROM users WHERE id = ${req.params.id}`;
// id = "1 OR 1=1"  →  returns every user
// id = "1; DROP TABLE users"  →  data loss
```

The fix is **parameterized queries** (prepared statements). The driver sends the query and the data separately, so input is always treated as a value — never as code.

```typescript
// ✅ Parameterized — the '?' is bound to a value, not interpolated
const rows = await db.query("SELECT * FROM users WHERE id = ?", [
  req.params.id,
]);
```

```typescript
// ✅ An ORM parameterizes for you
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const user = await prisma.user.findUnique({
  where: { id: Number(req.params.id) }, // safe, and typed
});
```

> ⚠️ **Validation is not a substitute for parameterization.** Even after checking the input, still parameterize. The two defend against different failure modes.

## Command Injection: Avoid the Shell

The same flaw, with the OS shell. Passing user input through a shell string lets attackers chain commands.

```typescript
import { exec } from "node:child_process";

// ❌ Shell interprets ; && | etc.
exec(`convert ${req.body.file} out.pdf`);
// file = "x.png; rm -rf /"  →  disaster
```

```typescript
import { execFile } from "node:child_process";

// ✅ execFile takes an args array — no shell, no metacharacters
const file: string = req.body.file;
if (!/^[\w.-]+$/.test(file)) {
  throw new Error("invalid filename");
}
execFile("convert", [file, "out.pdf"], (err) => {
  /* ... */
});
```

**Rules:**

- ✅ Prefer `execFile`/`spawn` with an arguments array over `exec`.
- ✅ Allowlist the command and validate every argument.
- ❌ Never build a shell string from user input.

## File Upload Security

Uploads are dangerous because the file's *claimed* type can lie. Defense is layered.

```typescript
import multer from "multer";
import { fileTypeFromFile } from "file-type";
import crypto from "node:crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "application/pdf"]);

const upload = multer({
  dest: "uploads/tmp",
  limits: { fileSize: MAX_SIZE, files: 1 }, // 1. cap size
  fileFilter: (_req, file, cb) => {
    cb(null, ALLOWED.has(file.mimetype)); // 2. quick MIME check
  },
});

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "no file" });

  // 3. Verify REAL type from magic bytes — the claimed type can lie
  const real = await fileTypeFromFile(req.file.path);
  if (!real || !ALLOWED.has(real.mime)) {
    return res.status(400).json({ error: "type mismatch" });
  }

  // 4. Store under a random name — never trust the user's filename
  const name = `${crypto.randomBytes(16).toString("hex")}.${real.ext}`;
  res.json({ ok: true, file: name });
});
```

**The layers, in order:**

1. **Limit size** — stop resource-exhaustion uploads.
2. **Check declared MIME** — cheap first filter.
3. **Check magic bytes** — the real type, since the declared one can lie.
4. **Rename randomly** — block path traversal and overwrites.
5. **Serve with `Content-Disposition: attachment`** and `nosniff` so the browser won't execute it.

## Interview Questions

**Q1: Validation vs. sanitization?**

Validation rejects input that breaks the rules (format, type, length). Sanitization cleans input to make it safe (strip/escape dangerous parts). You generally do both: validate the shape, then sanitize or encode for the destination.

**Q2: Why can't you trust client-side validation?**

It's just UX. Anyone can disable JavaScript, edit the page in DevTools, or call the API directly with `curl`. The server is the only real security boundary, so it must re-validate everything.

**Q3: How do you stop SQL injection?**

Use parameterized queries (prepared statements) or an ORM, so input is sent as a value separate from the query and can never become SQL. Never concatenate user input into a query string — and parameterize even after validating.

**Q4: Why is Zod popular for TypeScript validation?**

The schema doubles as the type via `z.infer`, so runtime validation and compile-time types stay in sync. It runs on client and server, so one schema covers both UX and security. `safeParse` gives structured, per-field errors.

**Q5: How do you validate a file upload securely?**

Layer it: cap the size, check the declared MIME, verify the real type from magic bytes (the declared type can lie), store under a random generated name to prevent traversal/overwrite, and serve as an attachment with `nosniff`.

**Q6: How do you prevent command injection?**

Don't pass user input through a shell string. Use `execFile`/`spawn` with an arguments array so there's no shell to interpret `;`, `|`, or `&&`. Allowlist the command and validate each argument.

## Summary

**Validation checklist:**

- [ ] Validate on the server — always, regardless of client checks
- [ ] Use a schema validator (Zod) over ad-hoc `if` statements
- [ ] Share one schema between client and server where possible
- [ ] Parameterize every SQL query; never concatenate
- [ ] Use `execFile` with an args array, never `exec` with user input
- [ ] Sanitize unavoidable HTML with DOMPurify
- [ ] Validate uploads by size, declared type, and magic bytes

**Core principles:**

1. **All input is hostile** — validate everything, every source.
2. **Server-side is the boundary** — client checks are UX only.
3. **Separate data from code** — parameterized queries, args arrays.
4. **Match the tool to the destination** — encode, sanitize, or parameterize.

---

[Next: Browser APIs →](../BrowserAPIs/README.md) | [← Back to Security](./README.md)
</content>
