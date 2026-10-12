---
sourceHash: "adce5dc32e64efe5f336eb866600c20799c71291766e28ce985b22aa619acddf"
title: "Credential, Session, CORS ও CSRF"
translatedAt: "2026-10-12T12:22:28.354Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Credential, Session, CORS ও CSRF {#ch-credentials-and-sessions}

> একটি password নিরাপদে রাখুন, একটি নির্দিষ্ট কারণ দেখিয়ে session আর token-এর মধ্যে বাছাই করুন, আর যে cookie সেটা বহন করে, তাকে রক্ষা করুন।

**এই অধ্যায়ে:** password hash করা · session বনাম JWT · refresh token আর সেগুলো কোথায় থাকে · CSRF কীভাবে cookie-র পিঠে চড়ে · CORS কেন কোনো defence নয়

## 💡 মূল ধারণা

Authentication দুটো সমস্যা: **user কে, তা প্রমাণ করা**, একবার, আর পরের প্রতিটি request-এ **সেটা মনে রাখা**।
Password আপনি কখনো রাখেন না — রাখেন শুধু একটি ধীর, একমুখী hash। Session বা token আপনি issue করেন, আর design-এর
প্রশ্ন হলো, আপনি এখনো সেটা revoke করতে পারেন কি না।

সেই credential একবার cookie হয়ে গেলে browser নিজে থেকেই সেটা পাঠায়। **CSRF** হলো সেই attack, যেটা ওই cookie-র
পিঠে চড়ে। **CORS** হলো browser-এর সেই নিয়ম, যেটাকে মানুষ এর বিরুদ্ধে একটি defence ভেবে গুলিয়ে ফেলে। এরা একে অপরের
উল্টো: CORS ঠিক করে কে আপনার response *পড়তে* পারবে, CSRF হলো কে আপনার write *ঘটাতে* পারবে, তা নিয়ে।

> ⚠️ **যা বদলাতে থাকে:** hardware যত দ্রুত হয়, recommended hashing algorithm আর তার setting তত বাড়ে। এখনকার
> সংখ্যাগুলো থাকে OWASP-এর cheat sheet-এ, কোনো বইয়ে নয়। টেকসই নীতি: attacker-এর GPU-র সামনে hash-কে ধীরই থাকতে
> হবে, তাই আপনি নিয়মিত সময় ধরে setting বাড়ান।

## কীভাবে কাজ করে

### একটি password রাখা

এমন একটি function-এর value রাখুন, যেটা ইচ্ছা করেই ধীর আর যেটাকে উল্টানো যায় না। General-purpose hash এখানে ব্যর্থ।
একটি GPU সেকেন্ডে কয়েকশো কোটি SHA-256 hash হিসাব করে, তাই একটি leak হওয়া table কয়েক মিনিটেই crack হয়ে যায়।

| Algorithm | রায় | মন্তব্য |
| --------- | ------- | ----- |
| **Argon2id** | ✅ প্রথম পছন্দ | Memory-hard, তাই GPU তার সুবিধা হারায় |
| **bcrypt** | ✅ এখনো ঠিক আছে | ভালোভাবে বোঝা, কিন্তু 72 byte-এ input চুপচাপ কেটে ফেলে |
| SHA-256, MD5, SHA-1 | ❌ কখনো নয় | Design অনুযায়ীই দ্রুত — পুরো সমস্যাটা এটাই |

**Argon2id দিয়ে hash করা:**

```typescript
// OWASP's 2026 baseline. Tune upwards until hashing takes ~250ms on your hardware.
const OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 19_456, // 19 MiB — the memory-hard parameter, the one that matters
  timeCost: 2,
  parallelism: 1,
};

export const hashPassword = (plain: string): Promise<string> => argon2.hash(plain, OPTIONS);
```

Setting-গুলো hash string-এর ভেতরেই থাকে, তাই আপনি সেগুলো বাড়াতে পারেন, আর প্রতিটি user-কে পরের login-এ rehash
করতে পারেন।

### Login endpoint

**কোন account আছে তা leak না করে login:**

```typescript
async function login(email: string, password: string): Promise<Session> {
  const user = await db.users.findUnique({ where: { email: email.toLowerCase() } });

  // Always do the work, even for an unknown email, or timing leaks who is registered.
  const ok = await verifyPassword(user?.passwordHash ?? DUMMY_HASH, password);

  if (!user || !ok) {
    // One message for both cases. "No such user" is an enumeration oracle.
    throw new AppError('Invalid email or password', 401, 'invalid_credentials');
  }

  if (argon2.needsRehash(user.passwordHash, OPTIONS)) {
    await db.users.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(password) } });
  }

  return createSession(user.id);
}
```

Login-এ account আর source IP দুটো ধরেই rate limit করুন ([Chapter ?? — Rate Limiting](#ch-rate-limiting))।

### Session বনাম JWT

একটি **session** server-এ state রাখে, আর client-কে একটি opaque id দেয়, একটি random key। এটা revoke করা মানে একটি
delete। একটি **JWT** state-কে একটি signed token-এ রাখে, তাই কোনো lookup নেই, আর revoke করার জন্য delete করার মতো কিছুও
নেই। JWT "বেশি secure" নয়। এটা **stateless**, যেটা scale এনে দেয়, আর তার দাম revocation।

> ⚠️ **JWT-তে কখনো গোপন কিছু রাখবেন না।** Payload হলো base64url — encoding, encryption নয়।

**Sign আর verify করা:**

```typescript
const opts = { issuer: 'api.example.com', audience: 'app.example.com' };
const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '15m', ...opts });

// Pin the algorithm and check issuer and audience. All three are security-critical.
const claims = jwt.verify(token, SECRET, { algorithms: ['HS256'], ...opts }) as Claims;
```

`algorithms` pin করলে `alg: none` আর algorithm confusion আটকে যায়। দুটোই token-এর নিজের header-কে বিশ্বাস করে,
যেটা attacker-এর নিয়ন্ত্রণে।

### Refresh token

একটি ছোট access token একটি leak-এর ক্ষতি সীমিত রাখে। দীর্ঘস্থায়ী refresh token-টিই হলো সংবেদনশীল।

**Reuse detection সহ rotation:**

```typescript
async function refresh(presented: string): Promise<Tokens> {
  const row = await db.refreshTokens.findUnique({ where: { hash: sha256(presented) } });
  if (!row || row.expiresAt < new Date()) throw new AppError('Invalid token', 401, 'invalid_token');

  if (row.usedAt) {
    // A rotated token presented again means it was stolen. Kill the whole family.
    await db.refreshTokens.deleteMany({ where: { familyId: row.familyId } });
    throw new AppError('Token reuse detected', 401, 'token_reuse');
  }
  await db.refreshTokens.update({ where: { id: row.id }, data: { usedAt: new Date() } });
  return issue(row.userId, row.familyId); // new access token + new refresh token
}
```

শুধু একটি hash রাখুন, যাতে একটি database leak কোনো চালু session তুলে না দেয়। প্রতিটি ব্যবহারে rotate করুন। একটি
ব্যবহৃত token ফিরে এলে বুঝবেন, একটি পুরনো copy বাইরে ঘুরছে, তাই পুরো family revoke করুন।

### Credential কোথায় থাকে

| জায়গা | XSS | CSRF | রায় |
| -------- | --- | ---- | ------- |
| `localStorage` | ❌ যেকোনো script পড়তে পারে | ✅ নিজে থেকে পাঠানো হয় না | ❌ এড়িয়ে চলুন |
| JavaScript variable | ⚠️ Reload-এ হারিয়ে যায় | ✅ | ✅ শুধু access token |
| `HttpOnly` cookie | ✅ Script পড়তে পারে না | ❌ নিজে থেকে পাঠানো হয় | ✅ একটি CSRF defence সহ |

`localStorage` থাকলে, একটি XSS bug এমন একটি account takeover, যেটা fix-এর পরেও টিকে থাকে। একটি `HttpOnly` cookie
সেটার বদলে CSRF নেয়, যার একটি সম্পূর্ণ defence আছে। Cookie-র attribute-গুলো নিজেই আছে
[Chapter ?? — Cookie ও SameSite](#ch-cookies-same-site)-এ।

### CSRF কীভাবে cookie-র পিঠে চড়ে

`bank.example.com`-এ logged in একজন user `evil.com`-এ যান। সেটা নিজে থেকে একটি form submit করে
`bank.example.com/transfer`-এ, browser cookie জুড়ে দেয়, আর transfer হয়ে যায়। Attacker কখনো response পড়ে না, আর
তার দরকারও ছিল না। **Credential নিজে থেকে পাঠানো হয়।** একটি `Authorization` header-এর token হয় না। এই কারণেই header
token থেকে cookie-তে সরে গেলে CSRF ফিরে আসে।

**প্রথম defence হলো `SameSite=Lax`:** একটি cross-site `POST` আর cookie বহন করে না। কোনো `GET` state বদলালে এটা
ব্যর্থ হয়। তাই [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices)-এর
"`GET` never writes" একটি security control।

**দ্বিতীয় defence হলো এমন একটি token, যেটা attacker পড়তে পারে না।** Server একটি পড়া যায় এমন cookie-তে একটি random
value set করে, আর client সেটা একটি header-এ ফেরত পাঠায়। একটি cross-site page browser-কে দিয়ে cookie পাঠাতে পারে,
কিন্তু same-origin policy তাকে header বানানোর জন্য value-টি পড়তে দেয় না।

**Double-submit check:**

```typescript
import crypto from 'node:crypto';
import type { RequestHandler } from 'express';

export const csrf: RequestHandler = (req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const fromCookie = req.cookies.csrf_token as string | undefined; // NOT HttpOnly — the app reads it
  const fromHeader = req.header('X-CSRF-Token');
  const ok = fromCookie && fromHeader && fromCookie.length === fromHeader.length &&
    crypto.timingSafeEqual(Buffer.from(fromCookie), Buffer.from(fromHeader));

  if (!ok) return void res.status(403).json({ error: { code: 'csrf_failed' } });
  next();
};
```

### CORS আসলে কী করে

একটি origin হলো **scheme + host + port**। Same-origin policy `evil.com`-কে আপনার response *পড়া* থেকে আটকায়, আর CORS
হলো সেই উপায়, যেটা দিয়ে আপনার server বিশ্বস্ত origin-গুলোর জন্য এটা শিথিল করে। Browser এটা enforce করে response-এর
ওপর: request সাধারণত চলে যায়, তারপর reply লুকিয়ে ফেলা হয়। তাই একটি "CORS error"-এর পাশেই এমন একটি row থাকতে পারে,
যেটা লেখা হয়ে গেছে। JSON body একটি preflight `OPTIONS` request ঘটায়, তাই `maxAge` set করুন।

**নিরাপদে CORS configure করা:**

```typescript
const ALLOWED = new Set(['https://app.example.com', 'https://admin.example.com']);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin, curl, or server-to-server
    callback(null, ALLOWED.has(origin)); // Exact match — never a regex on the host.
  },
  credentials: true,
  maxAge: 86_400,
}));
```

`Vary: Origin` পাঠান, নাহলে একটি CDN এক origin-এর header অন্য origin-কে serve করে। Credential সহ
`Allow-Origin: *` browser reject করে, কিন্তু request-এর `Origin` প্রতিফলিত করাও একই ফাঁক। ওটা browser মেনে নেয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --------- | ------ | --- |
| একটি web app, একটি backend | **একটি `HttpOnly` cookie-তে session** + `SameSite=Lax` | সহজ, revoke করা যায়, scale-এর কোনো সমস্যা নেই |
| অনেক service এমন token verify করে, যেগুলো তারা issue করেনি | `RS256` সহ JWT | কোনো shared session store নেই |
| তাৎক্ষণিক revocation একটি কঠিন শর্ত | Session, বা JWT সাথে একটি `jti` denylist | শুধু একটি JWT revoke করা যায় না |
| Frontend আর API আলাদা origin-এ | একটি নির্দিষ্ট allowlist সহ CORS | কখনো `Origin` প্রতিফলিত করবেন না |

## 🔑 মূল শিক্ষা

- Password hashing-কে ইচ্ছা করেই ধীর আর tune করার যোগ্য হতে হবে, আর Argon2id এখনকার প্রথম পছন্দ।
- Session বনাম JWT-র লেনদেন হলো statelessness বনাম revocation, security-র কোনো পার্থক্য নয়।
- Refresh token hash করে রাখুন, প্রতিটি ব্যবহারে rotate করুন, আর reuse হলে পুরো family revoke করুন।
- Cookie নিজে থেকে পাঠানো হয়, তাই cookie-ভিত্তিক session-এর `SameSite` লাগে, আর যেখানে সেটা যথেষ্ট নয়, সেখানে একটি CSRF token।
- CORS CSRF আটকাতে পারে না, কারণ request তো চলেই যায়, আর attacker-এর কখনো response-এর দরকার হয় না।

## Interview-এর প্রশ্ন

**Q: Session নাকি JWT?**

Session, যদি না statelessness সত্যিই দরকার হয়: একটি সাশ্রয়ী lookup, আর revocation মানে একটি delete। JWT তখনই তার
জায়গা পায়, যখন কয়েকটি service এমন token verify করে, যেগুলো তারা issue করেনি, বা কোনো cookie jar নেই।

**Q: একটি JWT কীভাবে revoke করবেন?**

কড়াভাবে বললে, পারবেন না। Access token ছোট রাখুন আর server-side refresh token revoke করুন, তাতে একটি access token-এর
আয়ুর মধ্যেই session শেষ হয়। তাৎক্ষণিক revocation-এর জন্য Redis-এ একটি `jti` denylist রাখুন, আর মেনে নিন যে lookup
ফিরে এসেছে।

**Q: CORS কি আপনার API-কে রক্ষা করে?**

না। এটা একটি server-কে একটি cross-origin script-কে response পড়তে দেওয়ার অনুমতি দিতে দেয়, আর browser সেটা enforce
করে request চলে যাওয়ার পরে। Browser নয় এমন client এটাকে উপেক্ষা করে, আর একটি cross-site form post যেভাবেই হোক write
করে ফেলে। API-কে রক্ষা করে authentication আর authorisation।

**Q: `SameSite=Lax` set করা আছে। আপনার কি এখনো CSRF token লাগবে?**

প্রায়ই না। `Lax`-ই মূল defence। Token যোগ করুন যদি কোনো `GET` state বদলায়, কোনো cookie-কে `SameSite=None` হতে
হয়, বা কোনো অবিশ্বস্ত sibling subdomain cookie set করতে পারে। তখন সেগুলো session-এর সাথে sign করুন।

## এরপর কী পড়বেন

- [Chapter ?? — OAuth, OIDC ও Authorisation](#ch-oauth) — login-কে একটি identity provider-এর হাতে দেওয়া, তারপর কে কী করতে পারবে তা ঠিক করা
- [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) — যে attack `localStorage`-এর token-কে মারাত্মক করে তোলে
