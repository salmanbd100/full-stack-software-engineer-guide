---
sourceHash: "adce5dc32e64efe5f336eb866600c20799c71291766e28ce985b22aa619acddf"
title: "Credential, Session, CORS ও CSRF"
translatedAt: "2026-10-17T14:04:28.126Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Credential, Session, CORS ও CSRF {#ch-credentials-and-sessions}

> Password নিরাপদে store করুন, session আর token-এর মধ্যে একটি স্পষ্ট কারণ দেখিয়ে বাছুন, আর যে cookie সেটা বয়ে নেয় তাকে রক্ষা করুন।

**এই অধ্যায়ে:** password hash করা · session বনাম JWT · refresh token, আর সেটা কোথায় থাকে · CSRF কীভাবে cookie-র পিঠে চড়ে · CORS কেন প্রতিরক্ষা নয়

## 💡 মূল ধারণা

Authentication আসলে দুটি সমস্যা: **user কে তা প্রমাণ করা**, একবার, আর পরের প্রতিটি request-এ **সেটা মনে রাখা**।
Password আপনি কখনো store করেন না — শুধু ধীর, একমুখী একটি hash রাখেন। Session বা token আপনি issue করেন, আর design-এর
প্রশ্ন হলো পরে সেটা revoke করতে পারবেন কি না।

Credential একবার cookie হয়ে গেলে browser নিজে থেকেই সেটা পাঠায়। **CSRF** হলো সেই আক্রমণ, যা ওই cookie-র পিঠে চড়ে।
**CORS** হলো browser-এর সেই নিয়ম, যাকে মানুষ এর বিরুদ্ধে প্রতিরক্ষা ভেবে ভুল করে। দুটি আসলে উল্টো জিনিস: আপনার response
কে *পড়তে* পারবে, তা ঠিক করে CORS। আর আপনার write কে *ঘটাতে* পারবে, সেটা CSRF-এর প্রশ্ন।

> ⚠️ **যা বদলাতে থাকে:** hardware যত দ্রুত হয়, hashing-এর প্রস্তাবিত algorithm আর তার setting তত ওপরে ওঠে। হালনাগাদ
> সংখ্যা থাকে OWASP-এর cheat sheet-এ, বইয়ে নয়। টেকসই নীতি: attacker-এর GPU-র কাছে hash-কে ধীর থাকতেই হবে, তাই নিয়মিত
> setting বাড়ান।

## কীভাবে কাজ করে

### Password store করা

এমন একটি function-এর value store করুন, যা ইচ্ছে করেই ধীর আর যাকে উল্টানো যায় না। সাধারণ কাজের hash এখানে ব্যর্থ। একটি
GPU সেকেন্ডে কয়েকশো কোটি SHA-256 hash হিসাব করে, তাই ফাঁস হওয়া একটি table কয়েক মিনিটেই ভেঙে ফেলা যায়।

| Algorithm | রায় | মন্তব্য |
| --------- | ------- | ----- |
| **Argon2id** | ✅ প্রথম পছন্দ | Memory-hard, তাই GPU তার সুবিধা হারায় |
| **bcrypt** | ✅ এখনও ঠিক আছে | ভালোভাবে বোঝা, কিন্তু 72 byte-এর পরে input চুপচাপ কেটে ফেলে |
| SHA-256, MD5, SHA-1 | ❌ কখনোই না | Design অনুযায়ীই দ্রুত — পুরো সমস্যা এটাই |

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

Setting-গুলো hash string-এর ভেতরেই থাকে। তাই setting বাড়িয়ে প্রতিটি user-এর পরের login-এ আবার hash করে নিতে পারেন।

### Login endpoint

**কোন account আছে, তা ফাঁস না করে login:**

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

Login-এ rate limit দিন account আর source IP দুটির ওপরই ([Chapter ?? — Rate Limiting](#ch-rate-limiting))।

### Session বনাম JWT

**Session** state রাখে server-এ, আর client-কে দেয় একটি অস্বচ্ছ id, মানে random একটি key। Revoke করা মানে শুধু delete।
**JWT** state রাখে signed একটি token-এর ভেতরে, তাই কিছু খুঁজতে হয় না, আবার revoke করতে চাইলে মোছার মতোও কিছু নেই। JWT
"বেশি নিরাপদ" নয়। এটা **stateless**, যা scale এনে দেয়, আর বিনিময়ে revocation কেড়ে নেয়।

> ⚠️ **JWT-তে কখনো গোপন কিছু রাখবেন না।** Payload হলো base64url — encoding, encryption নয়।

**Sign আর verify:**

```typescript
const opts = { issuer: 'api.example.com', audience: 'app.example.com' };
const token = jwt.sign({ sub: user.id, role: user.role }, SECRET, { expiresIn: '15m', ...opts });

// Pin the algorithm and check issuer and audience. All three are security-critical.
const claims = jwt.verify(token, SECRET, { algorithms: ['HS256'], ...opts }) as Claims;
```

`algorithms` নির্দিষ্ট করে দিলে `alg: none` আর algorithm confusion আটকায়। দুটিই token-এর নিজের header-কে বিশ্বাস করে, অথচ
সেই header attacker-এর হাতে।

### Refresh token

ছোট মেয়াদের access token ফাঁস হলে ক্ষতি সীমিত থাকে। স্পর্শকাতর হলো দীর্ঘ মেয়াদের refresh token।

**Reuse ধরে ফেলার ব্যবস্থাসহ rotation:**

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

শুধু hash store করুন, তাহলে database ফাঁস হলেও কোনো চালু session হাতে চলে যায় না। প্রতিবার ব্যবহারে rotate করুন। একবার
ব্যবহার হওয়া token আবার ফিরে এলে বুঝবেন একটি পুরনো copy বাইরে ঘুরছে, তাই পুরো family revoke করুন।

### Credential কোথায় থাকে

| জায়গা | XSS | CSRF | রায় |
| -------- | --- | ---- | ------- |
| `localStorage` | ❌ যেকোনো script পড়তে পারে | ✅ নিজে থেকে পাঠানো হয় না | ❌ এড়িয়ে চলুন |
| JavaScript variable | ⚠️ Reload করলে হারিয়ে যায় | ✅ | ✅ শুধু access token-এর জন্য |
| `HttpOnly` cookie | ✅ Script পড়তে পারে না | ❌ নিজে থেকে পাঠানো হয় | ✅ CSRF প্রতিরক্ষার সঙ্গে |

`localStorage`-এ রাখলে একটি XSS bug মানে account takeover, যা bug ঠিক করার পরেও টিকে থাকে। `HttpOnly` cookie এর বদলে
আনে CSRF, যার পুরো প্রতিরক্ষা আছে। Cookie-র attribute-গুলো আছে [Chapter ?? — Cookie ও SameSite](#ch-cookies-same-site)-এ।

### CSRF কীভাবে cookie-র পিঠে চড়ে

`bank.example.com`-এ login করা একজন user `evil.com`-এ যান। সেই page নিজে থেকেই `bank.example.com/transfer`-এ একটি form
submit করে, browser cookie জুড়ে দেয়, আর transfer হয়ে যায়। Attacker কখনো response পড়ে না, আর তার দরকারও ছিল না।
**Credential নিজে থেকে পাঠানো হয়।** `Authorization` header-এর token নিজে থেকে যায় না। এ কারণেই header token থেকে cookie-তে
সরলে CSRF ফিরে আসে।

**প্রথম প্রতিরক্ষা `SameSite=Lax`:** cross-site `POST`-এর সঙ্গে আর cookie যায় না। কিন্তু কোনো `GET` state বদলালে এটা কাজ
করে না। তাই [Chapter ?? — REST Best Practice ও Versioning](#ch-rest-best-practices)-এর "`GET` কখনো write করে না"
নিয়মটা আসলে একটি security control।

**দ্বিতীয় প্রতিরক্ষা এমন একটি token, যা attacker পড়তে পারে না।** Server পড়া যায় এমন একটি cookie-তে random একটি value
সেট করে, আর client সেটা একটি header-এ ফেরত পাঠায়। Cross-site page browser-কে দিয়ে cookie পাঠাতে পারে, কিন্তু same-origin
policy-র কারণে value-টা পড়ে header বানাতে পারে না।

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

Origin মানে **scheme + host + port**। Same-origin policy `evil.com`-কে আপনার response *পড়তে* দেয় না, আর CORS দিয়ে আপনার
server বিশ্বস্ত origin-এর জন্য সেই নিয়ম শিথিল করে। Browser এটা মানায় response-এর ওপর: request সাধারণত চলেই যায়, তারপর
উত্তরটা লুকিয়ে রাখা হয়। তাই "CORS error"-এর পাশেই এমন একটি row থাকতে পারে, যা লেখা হয়ে গেছে। JSON body থাকলে আগে একটি
preflight `OPTIONS` request যায়, তাই `maxAge` সেট করুন।

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

`Vary: Origin` পাঠান, নইলে CDN এক origin-এর header আরেক origin-কে দিয়ে দেয়। Credential-সহ `Allow-Origin: *` browser
ফিরিয়ে দেয়, কিন্তু request-এর `Origin` হুবহু ফেরত পাঠানোও একই ফুটো। আর সেটা browser মেনে নেয়।

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন | কেন |
| --------- | ------ | --- |
| একটি web app, একটি backend | **`HttpOnly` cookie-তে session** + `SameSite=Lax` | সহজ, revoke করা যায়, scale-এর কোনো সমস্যা নেই |
| অনেক service, যারা নিজেরা issue করেনি এমন token verify করে | `RS256`-সহ JWT | Shared session store লাগে না |
| সঙ্গে সঙ্গে revoke করা কড়া শর্ত | Session, অথবা JWT আর একটি `jti` denylist | শুধু JWT revoke করা যায় না |
| Frontend আর API আলাদা origin-এ | হুবহু মেলানো allowlist-সহ CORS | কখনো `Origin` ফেরত পাঠাবেন না |

## 🔑 মূল শিক্ষা

- Password hashing-কে ইচ্ছে করেই ধীর আর setting বদলানোর যোগ্য হতে হবে, আর এখনকার প্রথম পছন্দ Argon2id।
- Session বনাম JWT-র লেনদেন statelessness বনাম revocation, security-র কোনো ফারাক নয়।
- Refresh token hash করে store করুন, প্রতিবার ব্যবহারে rotate করুন, আর reuse ধরা পড়লে পুরো family revoke করুন।
- Cookie নিজে থেকে পাঠানো হয়, তাই cookie-ভিত্তিক session-এ `SameSite` লাগে, আর যেখানে তাতে কুলায় না সেখানে CSRF token।
- CORS CSRF আটকাতে পারে না, কারণ request তো চলেই যায়, আর attacker-এর response-এর দরকারই নেই।

## Interview-এর প্রশ্ন

**Q: Session নাকি JWT?**

Session, যদি না statelessness সত্যিই দরকার হয়: একটি lookup-এর খরচ সহজেই বহন করা যায়, আর revoke মানে শুধু delete। JWT তখন
কাজে লাগে, যখন কয়েকটি service এমন token verify করে যা তারা নিজেরা issue করেনি, অথবা কোনো cookie jar নেই।

**Q: JWT কীভাবে revoke করবেন?**

কঠোরভাবে বললে, পারবেন না। Access token-এর মেয়াদ ছোট রাখুন, আর server-এর দিকের refresh token revoke করুন। তাহলে একটি
access token-এর মেয়াদের মধ্যেই session শেষ হয়। সঙ্গে সঙ্গে revoke চাইলে Redis-এ একটি `jti` denylist রাখুন, আর মেনে নিন
যে lookup আবার ফিরে এল।

**Q: CORS কি আপনার API রক্ষা করে?**

না। CORS server-কে দিয়ে একটি cross-origin script-কে response পড়ার অনুমতি দেওয়ায়, আর browser সেটা মানায় request চলে যাওয়ার
পরে। Browser নয় এমন client এটা উপেক্ষা করে, আর cross-site form post যেভাবেই হোক লিখে ফেলে। API রক্ষা করে authentication আর
authorisation।

**Q: `SameSite=Lax` সেট করা আছে। তবু কি CSRF token লাগবে?**

প্রায়ই লাগে না। মূল প্রতিরক্ষা `Lax`। Token যোগ করুন যদি কোনো `GET` state বদলায়, কোনো cookie-কে `SameSite=None` রাখতেই হয়,
বা অবিশ্বস্ত কোনো sibling subdomain cookie সেট করতে পারে। তখন token-গুলো session-এর সঙ্গে sign করে বেঁধে দিন।

## এরপর কী পড়বেন

- [Chapter ?? — OAuth, OIDC ও Authorisation](#ch-oauth) — login-এর দায়িত্ব identity provider-কে দেওয়া, তারপর কে কী করতে পারবে তা ঠিক করা
- [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) — যে আক্রমণ `localStorage`-এর token-কে মারাত্মক করে তোলে
