---
sourceHash: "9a13ec28733900e8a7912687f07b0269e1526c24a7219d08952813496de1f355"
title: "Input Validation ও Injection"
translatedAt: "2026-10-17T14:06:21.753Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Input Validation ও Injection {#ch-backend-input-validation}

> Boundary-তে schema দিয়ে validate করুন, আর data-কে কখনো code-এর সঙ্গে না মিশিয়ে injection-এর প্রতিটি শ্রেণি বন্ধ করুন।

**এই অধ্যায়ে:** validation বনাম sanitisation · allowlist · Zod দিয়ে schema validation · SQL আর NoSQL injection · command injection আর path traversal · file upload আর SSRF

## 💡 মূল ধারণা

Injection-এর প্রতিটি vulnerability আসলে একই bug, শুধু আলাদা পোশাকে — SQL, NoSQL, command, path বা template, যা-ই হোক।
**Data জোড়া দেওয়া হয়েছে এমন একটি string-এ, যাকে অন্য কিছু code হিসেবে পড়ে।** Interpreter বুঝতে পারে না কোনটা আপনার
উদ্দেশ্য আর কোনটা attacker-এর। String যখন interpreter-এর হাতে পৌঁছায়, তখন দুটি দেখতে হুবহু এক।

তাই আসল প্রতিরক্ষা মাত্র দুটি, আর দুটিই আসলে একই প্রতিরক্ষা, শুধু আলাদা layer-এ:

1. **Instruction কখনো string জোড়া দিয়ে বানাবেন না।** Data পাঠান এমন একটি পথে, যা interpreter আলাদা করে রাখে: bound
   parameter, argument array, structured query object।
2. **Boundary-তে validate করুন** এমন একটি schema-র সঙ্গে মিলিয়ে, যা বলে আপনি কী নেবেন। তাহলে অপ্রত্যাশিত যেকোনো কিছু কোনো
   interpreter-এর কাছে পৌঁছানোর আগেই বাতিল হয়ে যায়।

Validation প্রথম সারির প্রতিরক্ষা, আর parameterisation হলো নিশ্চয়তা। একটি আরেকটির জায়গা নিতে পারে না।

## Validation বনাম Sanitisation

| | Validation | Sanitisation |
| --- | ---------- | ------------ |
| কী করে | নিয়মের সঙ্গে না মেলা input বাতিল করে | Input বদলে দিয়ে নিরাপদ করে |
| ফল | 400, সঙ্গে কারণ | বদলে যাওয়া data |
| কোনটা বাছবেন | ✅ প্রায় সবসময় | শুধু যেখানে rich input নিতেই হয় — HTML |

বাতিল করাকেই আগে বাছুন। Sanitisation চুপচাপ user-এর পাঠানো জিনিস বদলে দেয়। এতে bug-এর কারণ খুঁজে পাওয়া কঠিন হয়, আর
"নিরাপদ" মানে কী, তা নিয়ে আপনাকে আন্দাজ করতে হয়।

**Allowlist, কখনো blocklist নয়।** Blocklist-এ থাকে কী কী খারাপ, আর attacker-এর দরকার শুধু এমন একটি জিনিস, যা আপনার
মাথায় আসেনি।

```typescript
// ❌ Blocklist: a guessing game you cannot win
if (input.includes('<script>')) throw new Error('nope'); // <ScRiPt>, <img onerror=…>, …

// ✅ Allowlist: define what is acceptable, reject everything else
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(80);
```

## Boundary-তে Schema Validation

প্রতিটি endpoint-এর জন্য একটি schema, আর handler-এর কোনো logic চলার আগেই সেটা validate হয়। Zod-ই বেশি ব্যবহার হয়, কারণ
TypeScript type-টাও আসে একই declaration থেকে।

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

সবচেয়ে জরুরি line হলো `.strict()`। এটা না থাকলে request `{ role: 'admin' }` বা `{ isVerified: true }` বয়ে নিয়ে আসতে
পারে এমন একটি object-এ, যা আপনি spread করে database write-এ দিচ্ছেন। একে বলে **mass assignment**। Request body কখনো
model-এ spread করবেন না। Field-গুলোর নাম ধরে ধরে লিখুন।

## SQL Injection

```typescript
// ❌ Concatenation. Input `1 OR 1=1 --` returns every row.
const rows = await db.query(`SELECT * FROM users WHERE id = ${req.params.id}`);

// ✅ Parameterised. The driver sends query and values separately; the value
// is never parsed as SQL, so quoting and escaping are irrelevant.
const rows = await db.query('SELECT * FROM users WHERE id = $1', [req.params.id]);
```

Parameterisation মানে escaping নয়। Value যায় statement-এর বাইরে দিয়ে, তাই attacker-এর ভেঙে বেরোনোর মতো কোনো string-ই
থাকে না। ORM বা query builder default হিসেবেই parameterise করে, আর security-র দিক থেকে এটা সত্যিকারের লাভ। কিন্তু
`prisma.$queryRawUnsafe` আর তার মতো অন্যগুলো সেই সুরক্ষা থেকে আবার বেরিয়ে আসে।

### যা parameterise করা যায় না

Table বা column-এর নামের মতো identifier statement-এরই অংশ, value নয়। Sort-এর দিকও তাই। সেখানে placeholder বসানো যায় না,
তাই একমাত্র নিরাপদ পথ allowlist।

```typescript
const SORTABLE = { createdAt: 'created_at', total: 'total', status: 'status' } as const;

function orderBy(field: string, dir: string): string {
  const column = SORTABLE[field as keyof typeof SORTABLE];
  if (!column) throw new AppError('Invalid sort field', 400, 'invalid_sort');
  // The direction comes from a fixed pair, never from the request string.
  return `ORDER BY ${column} ${dir === 'asc' ? 'ASC' : 'DESC'}`;
}
```

আরেকটি ক্ষেত্র `LIKE` pattern। Value parameterise করা থাকে, কিন্তু তার ভেতরের `%` আর `_` wildcard। Input যদি হুবহু
অক্ষর হিসেবে ধরার কথা হয়, তাহলে bind করার আগে এগুলো escape করুন।

**Defence in depth**: application-এর database user-কে শুধু ততটুকু privilege দিন, যতটুকু তার লাগে। মানে `DROP` নয়,
`CREATE` নয়, আর যে table কখনো পড়ে না তাতে কোনো access নয়। তাহলে injection সফল হলেও ক্ষতি অনেক কম হয়।

## NoSQL, Command আর Path Injection

**NoSQL injection** কাজ করে object দিয়ে, string দিয়ে নয়। `qs` parser (Express 4-এর default) `?filter[$ne]=null`-কে
বানিয়ে দেয় `{ $ne: null }`, আর JSON body-ও এমন একটি object বয়ে আনতে পারে। ফলে query-র হাতে এসে পড়ে একটি operator।

```typescript
// ❌ req.body.password may be the object { $ne: null }, matching any user
await users.findOne({ email: req.body.email, password: req.body.password });

// ✅ Validate the type before it reaches the driver
const Login = z.object({ email: z.string().email(), password: z.string().min(8) });
```

`z.string()` object বাতিল করে দেয়, আর পুরো সমাধান এটুকুই। Mongoose schema অনুযায়ী cast করে, তাই এর অনেকটাই আটকায়।
কিন্তু raw driver আটকায় না।

**Command injection** আসে shell থেকে।

```typescript
// ❌ exec runs a shell: filename `a.jpg; rm -rf /` executes both
exec(`convert ${filename} out.png`);

// ✅ spawn with an argument array — no shell, so no metacharacters
spawn('convert', [filename, 'out.png']);
```

**Path traversal** আসে filename-কে বিশ্বাস করা থেকে।

```typescript
const UPLOADS = '/var/app/uploads';

function safePath(name: string): string {
  // Strip any directory component, then resolve and verify containment.
  const resolved = path.resolve(UPLOADS, path.basename(name));
  if (!resolved.startsWith(UPLOADS + path.sep)) throw new AppError('Invalid path', 400, 'invalid_path');
  return resolved;
}
```

সব platform-এ শুধু `path.basename` যথেষ্ট নয়, আর শুধু `startsWith`-কে হারিয়ে দেয় `/var/app/uploads-evil`। দুটিই ব্যবহার
করুন, এই ক্রমে।

> ⚠️ এই পরিবারের JavaScript-এর নিজস্ব সদস্য হলো **prototype pollution**। `__proto__`-ওয়ালা একটি JSON body কাঁচা হাতে লেখা
> deep-merge দিয়ে কোনো object-এ মেশালে `Object.prototype`-এ property যোগ হয়ে যেতে পারে, আর পুরো application-এর আচরণ
> বদলে যায়। Attacker-এর বানানো shape-এর map-এর জন্য `Object.create(null)` ব্যবহার করুন, validation-এর সময় `__proto__`,
> `constructor` আর `prototype` key বাতিল করুন, আর কখনো নিজে হাতে deep merge লিখবেন না।

## File আর বাইরের URL

**File upload** validate করতে হবে content দেখে, নাম দেখে নয়।

| Check | কেন |
| ----- | --- |
| Size-এর সীমা, middleware-এ | 5 GB-এর upload আপনার code চলার আগেই denial of service |
| Magic byte, extension বা `Content-Type` নয় | দুটিই attacker-এর দেওয়া |
| নিজেদের বানানো filename | User-এর দেওয়া নাম অবিশ্বস্ত, আর অন্য file-এর নামের সঙ্গে মিলে যেতে পারে |
| Web root-এর বাইরে রাখা, handler দিয়ে serve করা | নইলে store করা `.html` বা `.svg` আপনার origin-এ একটি XSS |
| Download-এ `Content-Disposition: attachment` আর `nosniff` | Browser-কে file-টা render করতে দেয় না |

**Server-side request forgery** মানে এমন একটি URL validate করা, যা আপনি fetch করতে যাচ্ছেন। User-এর দেওয়া URL তাক করতে
পারে `169.254.169.254`-এ (cloud metadata endpoint), বা এমন কোনো internal service-এ, যা network-এ অবস্থান দেখেই বিশ্বাস করে।

Check করতে হবে **resolve হওয়া address**-এর ওপর, hostname-এর ওপর নয়। URL parse করুন, আর `http:` ও `https:` ছাড়া অন্য যেকোনো
protocol বাতিল করুন। Hostname নিজে resolve করুন, private আর link-local range বাতিল করুন, আর সেই নির্দিষ্ট address-এই connect
করুন। নইলে দ্বিতীয় DNS lookup একটি internal address ফেরত দিতে পারে (DNS rebinding)।

Redirect অনুসরণ করাও বন্ধ রাখুন, অথবা প্রতিটি hop-এ আবার validate করুন। যে public URL `127.0.0.1`-এ redirect করে, সেটা
শুরুতে একবারের check-কে হারিয়ে দেয়।

## 🔑 মূল শিক্ষা

- প্রতিটি injection মানে data জোড়া দেওয়া হয়েছে এমন কিছুতে, যা অন্য একটি interpreter code হিসেবে parse করে।
- Value parameterise করুন, identifier allowlist করুন। বিকল্প শুধু এই দুটি, আর এতেই সব ঢাকা পড়ে।
- Boundary-তে `.strict()` schema দিয়ে validate করুন। এটা না থাকলে mass assignment এমন field সেট করে, যা আপনি কখনো খোলেননি।
- Argument array-সহ `spawn`-এ কোনো shell নেই, তাই command injection-এর থাকার কোনো জায়গাই নেই।
- SSRF আটকাতে DNS resolve হওয়ার পরে address ধরে validate করতে হয়, আর প্রতিটি redirect-এ একই check।

## Interview-এর প্রশ্ন

**Q: Escaping-এর চেয়ে parameterisation কেন বেশি নিরাপদ?**

কারণ value কখনো statement-এর অংশ হয় না। Driver query-র লেখা আর value আলাদা পথে পাঠায়, তাই database statement একবারই
parse করে, আর value-তে যা-ই থাকুক সেটাকে data হিসেবেই ধরে। Escaping একটি string-এর ভেতরের metacharacter নিষ্ক্রিয় করার
চেষ্টা করে। সেটা নির্ভর করে character set, quoting mode আর প্রতিটি edge case ঠিকঠাক ধরার ওপর।

**Q: একটি endpoint parameterised, তবু injectable। কীভাবে?**

প্রায় নিশ্চিতভাবেই একটি identifier: sort column, table-এর নাম, বা sort-এর দিক statement-এ সরাসরি বসানো হয়েছে, কারণ সেখানে
placeholder চলে না। সমাধান হলো একটি allowlist, যা request-এর value-কে জানা-নিরাপদ column-এর নামে map করে। আর sort-এর দিক
request থেকে না নিয়ে নির্দিষ্ট দুটি বিকল্পের একটি থেকে বেছে নেওয়া হয়।

**Q: SQL string-ই যদি না থাকে, NoSQL injection কাজ করে কীভাবে?**

Operator object দিয়ে। `qs`-এর মতো query parser `filter[$ne]=null`-কে বানিয়ে দেয় `{ $ne: null }`। তখন `req.query` থেকে
বানানো query যেখানে value আশা করছিল, সেখানে পায় একটি operator, আর `{ password: { $ne: null } }` প্রতিটি user-এর সঙ্গে মিলে
যায়। Driver-এ পৌঁছানোর আগে field-টা string কি না যাচাই করলেই ফুটোটা বন্ধ হয়।

**Q: শুধু validation কি যথেষ্ট?**

না, আর validation-কে নিশ্চয়তা ভাবাটাই ভুল। Validation প্রথম সারির প্রতিরক্ষা: স্পষ্টতই ভুল shape আগেভাগে বাতিল করে, আর কাজের
একটি error দেয়। নিশ্চয়তা হলো data কখনো code হয় না: parameterised statement, argument array, allowlist করা identifier।
নিখুঁত schema-ওয়ালা service-এও একটি জোড়া দেওয়া query থাকলে সেটা injectable।

## এরপর কী পড়বেন

- [Chapter ?? — OAuth, OIDC ও Authorisation](#ch-oauth) — shape-কে বিশ্বাস করার পরে, কে কাজটা করতে পারবে তা যাচাই করা
- [Chapter ?? — SQL-এর মূল কথা ও Schema Design](#ch-sql-fundamentals) — যে statement-গুলো parameterise করা হচ্ছে
- [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices) — একই schema, প্রকাশিত contract হিসেবে আবার ব্যবহার
