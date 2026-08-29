---
title: Backend Input Validation
part: 5
chapter: 0
slug: validation
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-29
tags: [backend, security, validation]
in_book: true
---

# Backend Input Validation {#ch-backend-input-validation}

> Validate at the boundary with an allowlist, so nothing untrusted reaches your business logic.

**In this chapter:** validation vs sanitisation · allowlist over blocklist · schema validation · reusable middleware · sanitising HTML · file uploads · validating URLs against SSRF

## 💡 The Core Idea

Most serious vulnerabilities start the same way: data from outside the system was treated as if it came from inside.

Validation is the boundary where that stops.

> **The rule:** validate on the **server**, at the **edge**, against an **allowlist**, and turn the result into a **typed value**. Client-side validation is a user-experience feature, not security — anyone can send a request with `curl`.

## Validation vs Sanitization

They are different jobs and you usually need both.

| Aspect      | Validation                  | Sanitization                     |
| ----------- | --------------------------- | -------------------------------- |
| **Action**  | Accept or reject            | Transform                        |
| **Output**  | Pass/fail + errors          | A cleaned value                  |
| **Example** | "Is this a valid email?"    | "Strip `<script>` from this HTML" |
| **When**    | At the boundary, first      | Just before use, second          |

**Order matters:** reject what's clearly wrong first, then clean what's left.

> ⚠️ **Sanitizing instead of validating is a trap.** Stripping `<script>` from `<scr<script>ipt>` leaves `<script>`. Rejecting the input outright never has that problem.

## Allowlist, Not Blocklist

| Approach      | Logic                        | Problem                              |
| ------------- | ---------------------------- | ------------------------------------ |
| **Blocklist** | "Reject known-bad values"    | You must predict every attack ever   |
| **Allowlist** | "Accept only known-good"     | Unknown attacks fail by default      |

```typescript
// ❌ Blocklist — endless, and always incomplete
function isSafe(input: string): boolean {
  const bad = ["<script>", "DROP TABLE", "../"];
  return !bad.some((b) => input.includes(b));
}

// ✅ Allowlist — define the shape you accept
const SORT_COLUMNS = ["created_at", "name", "price"] as const;
type SortColumn = (typeof SORT_COLUMNS)[number];

function parseSort(input: string): SortColumn {
  if (!SORT_COLUMNS.includes(input as SortColumn)) {
    throw new Error("Invalid sort column");
  }
  return input as SortColumn;
}
```

That second example matters more than it looks — column and table names **cannot** be parameterized in SQL, so an allowlist is the only safe way to accept them.

## Schema Validation with Zod

Zod validates and infers the TypeScript type from the same definition, so validated data is typed correctly downstream. This is "parse, don't validate": you don't check a value and move on, you turn `unknown` into a known type.

```typescript
import { z } from "zod";

export const CreateUserSchema = z.object({
  email: z.email().max(254),
  password: z.string().min(12).max(128),
  age: z.number().int().min(13).max(120),
  role: z.enum(["user", "editor"]), // ⚠️ note: "admin" is not accepted from input
  website: z.url().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
});

// One source of truth for both runtime checks and static types.
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

**`safeParse` gives you a result object instead of throwing:**

```typescript
const result = CreateUserSchema.safeParse(req.body);

if (!result.success) {
  // result.error.issues → [{ path, code, message }]
  return res.status(400).json({ errors: result.error.issues });
}

// result.data is fully typed as CreateUserInput
await createUser(result.data);
```

> ⚠️ **Mass assignment:** `z.object()` strips unknown keys by default, which is exactly what you want. If a client sends `{ email, password, role: "admin" }` and `role` isn't in your schema — or is limited to safe values — the privilege escalation never happens. Use `.strict()` if you'd rather reject the request than silently drop fields.

**Coercion for query strings**, where everything arrives as text:

```typescript
export const ListQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20), // cap the max!
  search: z.string().trim().max(100).optional(),
});
```

> ✨ **Always cap `limit`.** An uncapped `?limit=1000000` is a free denial-of-service.

## Reusable Validation Middleware

Write it once, apply it to every route.

```typescript
import type { Request, Response, NextFunction, RequestHandler } from "express";
import type { ZodType } from "zod";

type Source = "body" | "query" | "params";

export function validate(schema: ZodType, source: Source = "body"): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      res.status(400).json({
        error: "Validation failed",
        // Map to a shape that's safe to return — don't leak internals.
        details: result.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
      return;
    }

    // Replace the raw input with the parsed, typed, stripped version.
    req[source] = result.data;
    next();
  };
}

app.post("/users", validate(CreateUserSchema), createUserHandler);
app.get("/users", validate(ListQuerySchema, "query"), listUsersHandler);
```

**Validate every input source**, not just the body:

| Source            | Often forgotten | Risk                              |
| ----------------- | --------------- | --------------------------------- |
| Request body      | ❌ No           | Injection, mass assignment        |
| Query parameters  | ⚠️ Sometimes    | Injection, resource exhaustion    |
| Route params      | ✅ Often        | IDOR, path traversal              |
| Headers / cookies | ✅ Very often   | Header injection, session issues  |
| File uploads      | ✅ Very often   | Malware, disk exhaustion          |

## Sanitizing HTML

Sometimes you must accept rich text — a comment editor, a CMS field. You cannot validate your way out of that; you need a sanitizer with a strict allowlist.

```typescript
import createDOMPurify from "dompurify";
import { JSDOM } from "jsdom";

const window = new JSDOM("").window;
const DOMPurify = createDOMPurify(window as unknown as Window);

export function sanitizeRichText(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "title"],
    ALLOWED_URI_REGEXP: /^https?:\/\//i, // blocks javascript: and data: URLs
  });
}
```

**When not to sanitize:** if the value is plain text that will be rendered by React, Vue, or a template engine, the framework escapes it already. Sanitizing it too can corrupt legitimate input like `5 < 10`.

> **Rule of thumb:** escape on **output**, based on the context (HTML, attribute, URL, SQL). Sanitize on **input** only when you're storing markup you intend to render as markup.

## File Upload Validation

Uploads are the most commonly under-validated input.

```typescript
import multer from "multer";
import { fileTypeFromBuffer } from "file-type";

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB — enforced before the disk fills up
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    // The client-declared type is a hint, not proof.
    cb(null, ALLOWED_MIME.has(file.mimetype));
  },
});

export async function verifyRealFileType(buffer: Buffer): Promise<string> {
  // ✅ Check the magic bytes — the actual content, not the declared type.
  const detected = await fileTypeFromBuffer(buffer);
  if (!detected || !ALLOWED_MIME.has(detected.mime)) {
    throw new Error("File content does not match an allowed image type");
  }
  return detected.ext;
}
```

**The five checks that matter:**

- ✅ **Size limit** — enforced by the middleware, before buffering everything
- ✅ **Magic bytes** — `shell.php` renamed to `photo.jpg` fails here
- ✅ **Generated filename** — never use the client's name (`../../etc/passwd`)
- ✅ **Stored outside the web root** — or in object storage, so it can't be executed
- ✅ **Served with `Content-Disposition: attachment`** and `X-Content-Type-Options: nosniff`

```typescript
import crypto from "node:crypto";

// ✅ Discard the user's filename entirely.
const safeName = `${crypto.randomUUID()}.${await verifyRealFileType(buffer)}`;
```

## Common Injection Points

Validation is context-specific. The same string is harmless in one place and dangerous in another.

| Context             | The real fix                                     |
| ------------------- | ------------------------------------------------ |
| **SQL**             | Parameterized queries — see [Chapter ?? — SQL Injection Prevention](#ch-sql-injection-prevention) |
| **NoSQL (MongoDB)** | Reject object-typed values where a string is expected |
| **Shell commands**  | `execFile` with an argument array, never `exec` with a string |
| **File paths**      | Resolve, then confirm the result stays inside the base directory |
| **HTML output**     | Context-aware escaping by the template engine     |

```typescript
// ❌ NoSQL injection: { "email": { "$ne": null } } matches any user
const user = await db.users.findOne({ email: req.body.email });

// ✅ Zod guarantees a string, so the operator object never reaches the driver
const { email } = z.object({ email: z.email() }).parse(req.body);
```

```typescript
import { execFile } from "node:child_process";
import path from "node:path";

// ❌ exec with interpolation — "; rm -rf /" runs
// ✅ execFile: arguments are passed as data, never parsed by a shell
execFile("convert", [inputPath, "-resize", "100x100", outputPath]);

// ✅ Path traversal check — resolve first, then verify containment
const base = "/var/app/uploads";
const target = path.resolve(base, userSuppliedName);
if (!target.startsWith(base + path.sep)) throw new Error("Invalid path");
```

## Validating URLs: Server-Side Request Forgery

One input type deserves its own treatment, because the usual schema check passes it and the damage is
still total. If your server fetches a URL the user supplied — a webhook target, an avatar to import, a
link preview, a PDF render — then the user is choosing what your server connects to.

From inside your network, that reaches things no external attacker can: cloud metadata endpoints holding
instance credentials, internal admin panels, databases bound to a private interface.

```typescript
// ❌ z.url() proves it parses. It does not prove it points outside your network.
const { target } = z.object({ target: z.url() }).parse(req.body);
await fetch(target);
```

The fix is the same allowlist principle applied to the destination, not the string:

```typescript
import dns from "node:dns/promises";
import net from "node:net";

const ALLOWED_PROTOCOLS = new Set(["https:"]);

async function assertSafeUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (!ALLOWED_PROTOCOLS.has(url.protocol)) throw new Error("Protocol not allowed");

  // Resolve first: the hostname is attacker-controlled, the address is what matters.
  const { address } = await dns.lookup(url.hostname);
  const blocked =
    net.isIP(address) === 0 ||
    address.startsWith("127.") ||
    address.startsWith("10.") ||
    address.startsWith("192.168.") ||
    address.startsWith("169.254."); // cloud metadata lives here

  if (blocked) throw new Error("Destination not allowed");
  return url;
}
```

> ⚠️ **Checking the hostname is not enough.** DNS can resolve an attacker's domain to `127.0.0.1`, and it
> can answer differently between your check and your fetch. Where the destination set is knowable — a list
> of approved webhook hosts — allowlist those instead, and send outbound calls through a proxy that
> enforces the rule in one place.

Whichever route you take, disable redirect-following or re-validate every hop: a permitted URL that
redirects to `169.254.169.254` defeats a check that ran only once.

## 🔑 Key Takeaways

- Parse rather than validate: turn `unknown` into a typed value at the edge, and let the rest of the code trust its types.
- Allowlists fail closed, blocklists fail open — accept the shape you know, reject everything else.
- Validation and sanitisation are different jobs: reject what is wrong first, then clean only what you must keep.
- SQL identifiers, sort columns and table names cannot be parameterised, so an allowlist is the only safe way to accept them.
- A URL the user supplies chooses what your server connects to — resolve it, check the address, and re-check on every redirect.

## Interview Questions

**Q1: Why isn't client-side validation enough?**

It only protects users who use your UI. Anyone can send a request directly with `curl`, Postman, or a modified frontend. Client validation is for fast feedback; server validation is the actual control. Do both, but never rely on the client.

**Q2: Validation vs. sanitization?**

Validation checks whether input meets your rules and rejects it if not. Sanitization transforms input to make it safe. Validate first — reject clearly bad data — then sanitize only what you must keep, like user-authored HTML.

**Q3: Why is allowlisting better than blocklisting?**

A blocklist requires you to think of every attack in advance, and encoding tricks or new payloads always slip through. An allowlist defines what's acceptable, so anything unforeseen is rejected by default. It fails closed instead of open.

**Q4: What is mass assignment and how do you prevent it?**

When you pass a request body straight into a model update, a client can set fields you never intended — like `role: "admin"` or `isVerified: true`. Prevent it by validating against an explicit schema that only contains client-settable fields, and using the parsed output rather than the raw body.

**Q5: How do you validate a file upload safely?**

Cap the size at the middleware level, check the magic bytes rather than trusting the declared MIME type or extension, generate a new filename instead of using the client's, store it outside the web root or in object storage, and serve it with `nosniff` and `Content-Disposition: attachment`.

**Q6: Where should validation live in the architecture?**

At the boundary — a middleware or controller layer that turns untrusted input into a typed value before it reaches business logic. Domain code should be able to assume its inputs are already valid. I still keep database constraints as a last line of defense.

**Q7: How do you safely accept a sort column or table name?**

You can't parameterize identifiers in SQL, so I map the input against a hard-coded allowlist of permitted column names and use the matched constant. Never interpolate the raw value, even after "cleaning" it.

## What to Read Next

- [Chapter ?? — SQL Injection Prevention](#ch-sql-injection-prevention) — the injection class this chapter only points at
- [Chapter ?? — Authorisation](#ch-authorisation) — validating the request is not the same as permitting it
- [Chapter ?? — Client-Side Input Handling](#ch-client-side-input-handling) — the other end of the same boundary
