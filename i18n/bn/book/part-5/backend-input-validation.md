---
sourceHash: "9a13ec28733900e8a7912687f07b0269e1526c24a7219d08952813496de1f355"
title: "Input Validation ও Injection"
translatedAt: "2026-10-12T12:22:28.787Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Input Validation ও Injection {#ch-backend-input-validation}

> Boundary-তে একটি schema দিয়ে validate করুন, আর data-কে কখনো code-এর সাথে না মিশিয়ে প্রতিটি injection-এর ধরন বন্ধ করুন।

**এই অধ্যায়ে:** validation বনাম sanitisation · allowlist · Zod দিয়ে schema validation · SQL আর NoSQL injection · command injection আর path traversal · file upload আর SSRF

## 💡 মূল ধারণা

প্রতিটি injection vulnerability আসলে একই bug, শুধু আলাদা পোশাকে — SQL, NoSQL, command, path বা template, যা-ই
হোক। **Data এমন একটি string-এ জোড়া লাগানো হয়েছে, যেটাকে অন্য কিছু code হিসেবে interpret করে।** Interpreter আপনার
উদ্দেশ্য আর attacker-এর উদ্দেশ্য আলাদা করতে পারে না। যতক্ষণে সে string-টি দেখে, ততক্ষণে দুটো দেখতে একই রকম।

তাই সত্যিকারের defence মাত্র দুটো, আর এরা আসলে আলাদা layer-এ একই defence:

1. **কখনো concatenation দিয়ে instruction বানাবেন না।** Data এমন একটি channel দিয়ে পাঠান, যেটা interpreter আলাদা
   রাখে: একটি bound parameter, একটি argument array, একটি structured query object।
2. **Boundary-তে validate করুন**, এমন একটি schema-র বিপরীতে, যেটা বর্ণনা করে আপনি কী গ্রহণ করেন, যাতে অপ্রত্যাশিত
   যেকোনো কিছু কোনো interpreter-এ পৌঁছানোর আগেই reject হয়ে যায়।

Validation হলো প্রথম সারি, আর parameterisation হলো guarantee। কোনোটাই অন্যটার জায়গা নেয় না।

## Validation বনাম Sanitisation

| | Validation | Sanitisation |
| --- | ---------- | ------------ |
| কী করে | নিয়মের সাথে না মেলা input reject করে | Input-কে নিরাপদ করার জন্য বদলে দেয় |
| ফলাফল | 400, কারণ সহ | বদলে যাওয়া data |
| পছন্দ করুন | ✅ প্রায় সবসময় | শুধু যেখানে rich input নিতেই হবে — HTML |

Reject করাকেই বেছে নিন। Sanitisation user যা পাঠিয়েছেন, তা চুপচাপ বদলে দেয়। এতে bug ধরা কঠিন হয়, আর "নিরাপদ" মানে
কী, তা নিয়ে আপনি আন্দাজের ওপর থাকেন।

**Allowlist, কখনো blocklist নয়।** একটি blocklist খারাপ জিনিসগুলোর তালিকা করে, আর attacker-এর দরকার শুধু এমন একটি
জিনিস, যেটা আপনি ভাবেননি।

```typescript
// ❌ Blocklist: a guessing game you cannot win
if (input.includes('<script>')) throw new Error('nope'); // <ScRiPt>, <img onerror=…>, …

// ✅ Allowlist: define what is acceptable, reject everything else
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
```

## Boundary-তে Schema Validation

প্রতিটি endpoint-এর জন্য একটি schema, যেকোনো handler logic চলার আগেই validate করা। Zod সাধারণ পছন্দ, কারণ
TypeScript type-টি একই declaration থেকে আসে।

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
    res.locals[part] = result.data; // Express 5's req.query is a getter; read parsed input here.
    next();
  };
}
```

`.strict()` হলো সবচেয়ে জরুরি line। এটা না থাকলে একটি request এমন একটি object-এ `{ role: 'admin' }` বা
`{ isVerified: true }` বয়ে আনতে পারে, যেটা আপনি একটি database write-এ spread করেন। এটাই **mass assignment**।
কখনো একটি request body-কে model-এ spread করবেন না। Field-গুলোর নাম ধরে লিখুন।

## SQL Injection

```typescript
// ❌ Concatenation. Input `1 OR 1=1 --` returns every row.
const rows = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// ✅ Parameterised. The driver sends query and values separately; the value
// is never parsed as SQL, so quoting and escaping are irrelevant.
const rows = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
```

Parameterisation মানে escaping নয়। Value statement-এর বাইরে দিয়ে যায়, তাই attacker-এর ভেঙে বেরোনোর মতো কোনো string
থাকে না। একটি ORM বা query builder default-ভাবেই parameterise করে, যেটা security-তে সত্যিকারের লাভ। কিন্তু
`prisma.$queryRawUnsafe` আর তার সমতুল্যগুলো আবার সেটা থেকে বেরিয়ে আসে।

### যা parameterise করা যায় না

Identifier, যেমন table আর column-এর নাম, statement-এরই অংশ, value নয়। Sort direction-ও তাই। সেখানে placeholder
চলে না, তাই একমাত্র নিরাপদ পথ হলো একটি allowlist।

```typescript
const SORTABLE = { createdAt: 'created_at', total: 'total', status: 'status' } as const;

function orderBy(field: string, dir: string): string {
  const column = SORTABLE[field as keyof typeof SORTABLE];
  if (!column) throw new AppError('Invalid sort field', 400, 'invalid_sort');
  // The direction comes from a fixed pair, never from the request string.
  return `ORDER BY ${column} ${dir === 'asc' ? 'ASC' : 'DESC'}`;
}
```

`LIKE` pattern হলো আরেকটি ক্ষেত্র। Value parameterised, কিন্তু তার ভেতরের `%` আর `_` wildcard। Input যদি আক্ষরিক
হওয়ার কথা হয়, তাহলে bind করার আগে এগুলো escape করুন।

**Defence in depth**: application-এর database user-কে শুধু ততটুকু privilege দিন, যতটুকু তার দরকার। মানে কোনো
`DROP` নয়, কোনো `CREATE` নয়, আর যে table সে কখনো পড়ে না, তাতে কোনো access নয়। তখন একটি সফল injection অনেক কম ক্ষতি
করে।

## NoSQL, Command আর Path Injection

**NoSQL injection** কাজ করে object দিয়ে, string দিয়ে নয়। `qs` parser (Express 4-এর default)
`?filter[$ne]=null`-কে `{ $ne: null }`-এ পরিণত করে, আর একটি JSON body-ও এমন একটি বয়ে আনতে পারে, ফলে একটি query একটি
operator পেয়ে যায়।

```typescript
// ❌ req.body.password may be the object { $ne: null }, matching any user
await users.findOne({ email: req.body.email, password: req.body.password });

// ✅ Validate the type before it reaches the driver
const Login = z.object({ email: z.string().email(), password: z.string().min(8) });
```

`z.string()` একটি object reject করে — পুরো সমাধান এটুকুই। Mongoose schema অনুযায়ী cast করে, তাই এর অনেকটাই আটকায়,
কিন্তু raw driver আটকায় না।

**Command injection** আসে একটি shell থেকে।

```typescript
// ❌ exec runs a shell: filename `a.jpg; rm -rf /` executes both
exec(`convert ${filename} out.png`);

// ✅ spawn with an argument array — no shell, so no metacharacters
spawn('convert', [filename, 'out.png']);
```

**Path traversal** আসে একটি filename-কে বিশ্বাস করা থেকে।

```typescript
const UPLOADS = '/var/app/uploads';

function safePath(name: string): string {
  // Strip any directory component, then resolve and verify containment.
  const resolved = path.resolve(UPLOADS, path.basename(name));
  if (!resolved.startsWith(UPLOADS + path.sep)) throw new AppError('Invalid path', 400, 'invalid_path');
  return resolved;
}
```

প্রতিটি platform-এ শুধু `path.basename` যথেষ্ট নয়, আর শুধু `startsWith`-কে হারিয়ে দেয় `/var/app/uploads-evil`।
দুটোই ব্যবহার করুন, এই ক্রমে।

> ⚠️ **Prototype pollution** এই পরিবারের JavaScript-নির্দিষ্ট সদস্য। `__proto__` থাকা একটি JSON body, একটি সরল
> deep-merge দিয়ে একটি object-এ merge হলে, `Object.prototype`-এ property যোগ করতে পারে, আর পুরো application জুড়ে
> আচরণ বদলে দিতে পারে। Attacker-এর আকার দেওয়া map-এর জন্য `Object.create(null)` ব্যবহার করুন, validation-এর সময়
> `__proto__`, `constructor` আর `prototype` key reject করুন, আর কখনো নিজে হাতে deep merge লিখবেন না।

## File আর Outbound URL

**File upload** validate করতে হবে content দেখে, নাম দেখে নয়।

| Check | কেন |
| ----- | --- |
| Size limit, middleware-এ | আপনার code চলার আগেই একটি 5 GB upload একটি denial of service |
| Magic byte, extension বা `Content-Type` নয় | দুটোই attacker দেয় |
| একটি generate করা filename | User-এর দেওয়া নাম অবিশ্বস্ত, আর অন্য নামের সাথে মিলে যেতে পারে |
| Web root-এর বাইরে রাখা, একটি handler দিয়ে serve করা | নাহলে একটি রাখা `.html` বা `.svg` আপনার origin-এ একটি XSS |
| Download-এ `Content-Disposition: attachment` আর `nosniff` | Browser-কে এটা render করা থেকে আটকায় |

**Server-side request forgery** হলো এমন একটি URL-এর validation, যেটা আপনি fetch করতে যাচ্ছেন। User-এর দেওয়া একটি
URL `169.254.169.254`-এর (cloud metadata endpoint) দিকে নির্দেশ করতে পারে, বা এমন একটি internal service-এর দিকে, যেটা
network-এ অবস্থানকে বিশ্বাস করে।

Check-টি হতে হবে **resolve হওয়া address**-এর ওপর, hostname-এর ওপর নয়। URL parse করুন, আর `http:` আর `https:` ছাড়া
অন্য যেকোনো protocol reject করুন। Hostname নিজে resolve করুন, private আর link-local range reject করুন, আর সেই pin করা
address-এ connect করুন। নাহলে একটি দ্বিতীয় DNS lookup একটি internal address return করতে পারে (DNS rebinding)।

Redirect follow করাও বন্ধ করুন, অথবা প্রতিটি hop-এ আবার validate করুন। `127.0.0.1`-এ redirect করা একটি public URL
শুরুতে একবারের check-কে হারিয়ে দেয়।

## 🔑 মূল শিক্ষা

- প্রতিটি injection হলো এমন কিছুতে জোড়া লাগানো data, যেটাকে অন্য একটি interpreter code হিসেবে parse করে।
- Value parameterise করুন, আর identifier allowlist করুন। এই দুটোই একমাত্র উপায়, আর এরা সবকিছু কভার করে।
- Boundary-তে `.strict()` schema দিয়ে validate করুন। এটা না থাকলে mass assignment এমন field set করে, যেগুলো আপনি কখনো expose করেননি।
- Argument array সহ `spawn`-এ কোনো shell নেই, তাই command injection-এর থাকার কোনো জায়গা নেই।
- SSRF-এর জন্য DNS resolution-এর পরে address-স্তরের validation লাগে, সাথে প্রতিটি redirect-এ একই check।

## Interview-এর প্রশ্ন

**Q: Escaping-এর চেয়ে parameterisation কেন বেশি নিরাপদ?**

কারণ value কখনো statement-এর অংশ হয় না। Driver query text আর value আলাদা channel দিয়ে পাঠায়, তাই database statement
একবারই parse করে, আর value-তে যা-ই থাকুক, সেটাকে data হিসেবে দেখে। Escaping একটি string-এর ভেতরে metacharacter
নিষ্ক্রিয় করার চেষ্টা করে, যেটা নির্ভর করে character set, quoting mode আর প্রতিটি edge case ঠিকঠাক হওয়ার ওপর।

**Q: একটি endpoint parameterised, তবুও injectable। কীভাবে?**

প্রায় নিশ্চিতভাবেই একটি identifier: একটি sort column, একটি table-এর নাম, বা একটি direction, যেটা statement-এ
interpolate করা হয়েছে, কারণ সেখানে placeholder চলে না। সমাধান হলো একটি allowlist, যেটা request-এর value-কে জানা
নিরাপদ column-এর নামে map করে, আর sort direction request থেকে না নিয়ে একটি নির্দিষ্ট জোড়া থেকে বেছে নেওয়া হয়।

**Q: কোনো SQL string না থাকলে NoSQL injection কীভাবে কাজ করে?**

Operator object দিয়ে। `qs`-এর মতো একটি query parser `filter[$ne]=null`-কে `{ $ne: null }`-এ পরিণত করে।
তখন `req.query` থেকে বানানো একটি query একটি value-র জায়গায় একটি operator পায়, আর
`{ password: { $ne: null } }` প্রতিটি user-এর সাথে মিলে যায়। Driver-এ পৌঁছানোর আগে field-টি একটি string কি না, তা
validate করলেই এটা বন্ধ হয়।

**Q: শুধু validation কি যথেষ্ট?**

না, আর এটাকে guarantee ধরে নেওয়াটাই ভুল। Validation হলো প্রথম সারি: এটা স্পষ্টতই ভুল আকারকে আগেভাগে reject করে, আর
একটি কাজের error দেয়। Guarantee হলো, data কখনো code হয় না: parameterised statement, argument array, allowlist করা
identifier। নিখুঁত schema আর একটিমাত্র concatenated query থাকা একটি service-ও injectable।

## এরপর কী পড়বেন

- [Chapter ?? — OAuth, OIDC ও Authorisation](#ch-oauth) — আকারকে বিশ্বাস করার পরে, কে কাজ করতে পারবে তা validate করা
- [Chapter ?? — SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) — যে statement-গুলো parameterise করা হচ্ছে
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — একই schema, প্রকাশিত contract হিসেবে আবার ব্যবহার করা
