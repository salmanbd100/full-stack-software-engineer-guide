---
title: Input Validation and Injection
part: 5
chapter: 0
slug: backend-input-validation
level: advanced
reading_time: 10
updated: 2026-09-01
tags: [security, validation, zod, sql-injection, ssrf]
in_book: true
---

# Input Validation and Injection {#ch-backend-input-validation}

> Validate at the boundary with a schema, and close every injection class by never mixing data with code.

**In this chapter:** validation against sanitisation · allowlists · schema validation with Zod · SQL and NoSQL injection · command injection and path traversal · file uploads and SSRF

## 💡 The Core Idea

Every injection vulnerability — SQL, NoSQL, command, path, template — is the same bug wearing
different clothes: **data was concatenated into a string that something else interprets as code.**
The interpreter cannot tell your intent from the attacker's, because by the time it sees the string
they are indistinguishable.

There are therefore only two real defences, and they are the same defence at different layers:

1. **Never build the instruction by concatenation.** Pass data through a channel the interpreter
   keeps separate — a bound parameter, an argument array, a structured query object.
2. **Validate at the boundary** against a schema that describes what you accept, so anything
   unexpected is rejected before it reaches any interpreter at all.

Validation is the first line and parameterisation is the guarantee. Neither replaces the other.

## Validation Against Sanitisation

| | Validation | Sanitisation |
| --- | ---------- | ------------ |
| Does | Rejects input that does not match the rules | Modifies input to make it safe |
| Result | 400, with the reason | Altered data |
| Prefer | ✅ Almost always | Only where you must accept rich input — HTML |

Prefer rejection. Sanitisation silently changes what the user sent, which makes bugs hard to
diagnose and leaves you guessing what "safe" means.

**Allowlist, never blocklist.** A blocklist enumerates what is bad, and attackers only need one
thing you did not think of.

```typescript
// ❌ Blocklist: a guessing game you cannot win
if (input.includes('<script>')) throw new Error('nope'); // <ScRiPt>, <img onerror=…>, …

// ✅ Allowlist: define what is acceptable, reject everything else
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
```

## Schema Validation at the Boundary

One schema per endpoint, validated before any handler logic runs. Zod is the common choice because
the TypeScript type comes from the same declaration.

```typescript
const CreateOrder = z.object({
  // Coerce, then constrain — query strings arrive as strings.
  quantity: z.coerce.number().int().positive().max(999),
  sku: z.string().regex(/^[A-Z0-9-]{4,20}$/),
  notes: z.string().max(500).optional(),
  // .strict() rejects unknown keys, which is what blocks mass assignment.
}).strict();

export function validate<T extends z.ZodTypeAny>(schema: T, part: 'body' | 'query' | 'params') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[part]);
    if (!result.success) {
      return void res.status(400).json({
        error: {
          code: 'validation_failed',
          // Return every failed field at once — one per round trip is a bad API.
          fields: result.error.issues.map((i) => ({ field: i.path.join('.'), code: i.code })),
        },
      });
    }
    req[part] = result.data as never; // Parsed and coerced, not the raw input.
    next();
  };
}
```

`.strict()` is the line that matters most. Without it, a request can carry `{ role: 'admin' }` or
`{ isVerified: true }` into an object you spread into a database write — **mass assignment**. Never
spread a request body into a model; name the fields.

## SQL Injection

```typescript
// ❌ Concatenation. Input `1 OR 1=1 --` returns every row.
const rows = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// ✅ Parameterised. The driver sends query and values separately; the value
// is never parsed as SQL, so quoting and escaping are irrelevant.
const rows = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
```

Parameterisation is not escaping. The value travels outside the statement, so there is no string for
an attacker to break out of. An ORM or query builder parameterises by default, which is a real
security benefit — but `prisma.$queryRawUnsafe` and its equivalents opt back out.

### What you cannot parameterise

Identifiers — table names, column names, sort direction — are part of the statement, not values. A
placeholder is not allowed there, so the only safe route is an allowlist.

```typescript
const SORTABLE = { createdAt: 'created_at', total: 'total', status: 'status' } as const;

function orderBy(field: string, dir: string): string {
  const column = SORTABLE[field as keyof typeof SORTABLE];
  if (!column) throw new AppError('Invalid sort field', 400, 'invalid_sort');
  // The direction comes from a fixed pair, never from the request string.
  return `ORDER BY ${column} ${dir === 'asc' ? 'ASC' : 'DESC'}`;
}
```

`LIKE` patterns are the other case: the value is parameterised, but `%` and `_` inside it are
wildcards, so escape them before binding if the input should be literal.

**Defence in depth**: the application's database user should have only the privileges it needs —
no `DROP`, no `CREATE`, no access to tables it never reads. A successful injection then does far
less.

## NoSQL, Command and Path Injection

**NoSQL injection** works through objects rather than strings. Express parses
`?filter[$ne]=null` into `{ $ne: null }`, so a query built from `req.query` receives an operator.

```typescript
// ❌ req.body.password may be the object { $ne: null }, matching any user
await users.findOne({ email: req.body.email, password: req.body.password });

// ✅ Validate the type before it reaches the driver
const Login = z.object({ email: z.string().email(), password: z.string().min(8) });
```

`z.string()` rejecting an object is the whole fix. Mongoose casts by schema and so blocks much of
this, but the raw driver does not.

**Command injection** comes from a shell.

```typescript
// ❌ exec runs a shell: filename `a.jpg; rm -rf /` executes both
exec(`convert ${filename} out.png`);

// ✅ spawn with an argument array — no shell, so no metacharacters
spawn('convert', [filename, 'out.png']);
```

**Path traversal** comes from trusting a filename.

```typescript
const UPLOADS = '/var/app/uploads';

function safePath(name: string): string {
  // Strip any directory component, then resolve and verify containment.
  const resolved = path.resolve(UPLOADS, path.basename(name));
  if (!resolved.startsWith(UPLOADS + path.sep)) throw new AppError('Invalid path', 400, 'invalid_path');
  return resolved;
}
```

`path.basename` alone is not enough on every platform, and `startsWith` alone is defeated by
`/var/app/uploads-evil`. Both, in that order.

> ⚠️ **Prototype pollution** is the JavaScript-specific member of this family. A JSON body
> containing `__proto__` merged into an object with a naive deep-merge can add properties to
> `Object.prototype` and change behaviour application-wide. Use `Object.create(null)` for
> attacker-shaped maps, reject `__proto__`, `constructor` and `prototype` keys during validation,
> and never hand-roll a deep merge.

## Files and Outbound URLs

**File uploads** must be validated on content, not on the name.

| Check | Why |
| ----- | --- |
| Size limit, at the middleware | A 5 GB upload is a denial of service before your code runs |
| Magic bytes, not the extension or `Content-Type` | Both are attacker-supplied |
| A generated filename | The user's name is untrusted and may collide |
| Stored outside the web root, served through a handler | A stored `.html` or `.svg` is otherwise an XSS on your origin |
| `Content-Disposition: attachment` and `nosniff` on download | Stops the browser rendering it |

**Server-side request forgery** is validation of a URL you are about to fetch. A user-supplied URL
can point at `169.254.169.254` — the cloud metadata endpoint — or at an internal service that trusts
network position.

The check has to happen on the **resolved address**, not the hostname: parse the URL, reject any
protocol other than `http:` and `https:`, resolve the hostname yourself, reject private and
link-local ranges, and then connect to that pinned address — otherwise a second DNS lookup can
return an internal one (DNS rebinding).

Also disable redirect following, or validate again at each hop — a public URL that redirects to
`127.0.0.1` defeats a single up-front check.

## 🔑 Key Takeaways

- Every injection is data concatenated into something another interpreter parses as code.
- Parameterise values and allowlist identifiers — those are the only two options, and they cover everything.
- Validate at the boundary with `.strict()` schemas; without it, mass assignment sets fields you never exposed.
- `spawn` with an argument array has no shell, so command injection has nowhere to live.
- SSRF needs address-level validation after DNS resolution, plus the same check on every redirect.

## Interview Questions

**Q: Why is parameterisation safer than escaping?**

Because the value never becomes part of the statement. The driver sends the query text and the
values over separate channels, so the database parses the statement once and treats the value as
data whatever it contains. Escaping tries to neutralise metacharacters inside one string, which
depends on getting the character set, the quoting mode and every edge case right.

**Q: An endpoint is parameterised and still injectable. How?**

Almost certainly an identifier — a sort column, a table name, or a direction interpolated into the
statement, because placeholders are not permitted there. The fix is an allowlist mapping request
values to known-safe column names, with the sort direction chosen from a fixed pair rather than
taken from the request.

**Q: How does NoSQL injection work if there is no SQL string?**

Through operator objects. A query framework parses `filter[$ne]=null` in a query string into
`{ $ne: null }`, and a query built from `req.query` then receives an operator where it expected a
value — `{ password: { $ne: null } }` matches every user. Validating that the field is a string
before it reaches the driver closes it.

**Q: Is validation enough on its own?**

No, and treating it as the guarantee is the mistake. Validation is the first line: it rejects the
obviously wrong shape early and gives a useful error. The guarantee is that data never becomes code
— parameterised statements, argument arrays, allowlisted identifiers. A service with perfect schemas
and one concatenated query is still injectable.

## What to Read Next

- [Chapter ?? — Authorisation](#ch-authorisation) — validating who may act, once you trust the shape
- [Chapter ?? — SQL Fundamentals](#ch-sql-fundamentals) — the statements being parameterised
- [Chapter ?? — API Versioning and Contracts](#ch-versioning) — the same schema, reused as the published contract
