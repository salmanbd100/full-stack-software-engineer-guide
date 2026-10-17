---
sourceHash: "4c7dd64adeba70eca81f349b0175e7ac6ba3d97eb04ab632685059c92340f263"
title: "Content Security Policy ও Security Header"
translatedAt: "2026-10-17T14:01:06.382Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Content Security Policy ও Security Header {#ch-content-security-policy}

> এমন policy লিখুন, যা injection সফল হলেও টিকে থাকে। তার চারপাশে header বসান, আর site না ভেঙে দুটিই চালু করুন।

**এই অধ্যায়ে:** CSP কীভাবে কাজ করে · nonce আর strict-dynamic · report-only দিয়ে চালু করা · HSTS, nosniff আর clickjacking · helmet আর testing

## 💡 মূল ধারণা

**Security header** হলো HTTP response header, যা browser-এর বাড়তি কিছু সুরক্ষা চালু করে। প্রতিটি header browser-এর
এমন একটি ক্ষমতা বন্ধ করে দেয়, যা attacker কাজে লাগাতে পারত। বেশিরভাগের খরচ এক line।

সবচেয়ে বড়টি হলো **Content Security Policy (CSP)**। এটা browser-কে বলে দেয়, কোন কোন source থেকে script, style আর
অন্যান্য content আসতে পারবে। List-এ যা নেই, সব block হয়। CSP হলো **XSS-এর বিরুদ্ধে দ্বিতীয় স্তরের প্রতিরক্ষা**: ধরে
নেয় injection ইতিমধ্যে সফল হয়েছে, আর inject করা script-কে চলতে দেয় না। এটা output encoding-এর পেছনে দাঁড়ায়, তার
জায়গা নেয় না।

> ⚠️ **যা বদলাতে থাকে:** header-এর তালিকা স্থির নয়। `Feature-Policy` হয়ে গেছে `Permissions-Policy`,
> `X-XSS-Protection` একসময় সুপারিশ করা হতো, এখন ক্ষতিকর, আর cross-origin isolation header এসেছে পরে।
> টেকসই নীতি হলো, প্রতিটি header ডিফল্টে একটি ক্ষমতা বন্ধ করে। নতুন যেকোনো header দেখলে জিজ্ঞেস করুন, এটা কী বন্ধ
> করে, আর আপনি যা ship করছেন তার কোনো কিছুর কি এখনও সেটা লাগে।

## CSP কীভাবে কাজ করে

`Content-Security-Policy` header যে page-এ আসে, browser সেই page-এ সেটা enforce করে। Policy হলো
**directive**-এর একটি list, semicolon দিয়ে আলাদা করা, আর প্রতিটি directive-এর সঙ্গে থাকে একটি **source list**।

**`script-src 'self'` কী কী চলতে দেয়:**

```typescript
// <script src="https://evil.com/x.js"></script>  ❌ blocked
// <script>alert(1)</script>                       ❌ blocked (inline)
// <script src="/js/app.js"></script>              ✅ allowed (same origin)
```

সবচেয়ে বড় লাভ হলো inline script block হয়ে যাওয়া। বেশিরভাগ XSS payload inline, যেমন `<script>…</script>` বা
`onerror=` attribute। `'unsafe-inline'` ছাড়া একটি policy ডিফল্টেই এগুলোর সবই block করে।

| Directive         | যা নিয়ন্ত্রণ করে                                        |
| ----------------- | ----------------------------------------------- |
| `default-src`     | যে directive set করা নেই, তার fallback          |
| `script-src`      | Script কোথা থেকে load হতে পারে — সবচেয়ে জরুরি এটাই |
| `frame-ancestors` | কে আপনার page-কে frame-এ embed করতে পারে              |
| `object-src`      | `<object>` আর `<embed>` — `'none'` দিন      |
| `base-uri`        | `<base>` tag — `'none'` বা `'self'` দিন  |

| Source value       | মানে                                         |
| ------------------ | ----------------------------------------------- |
| `'self'`           | শুধু একই origin                                |
| `'nonce-<random>'` | যে script-এ হুবহু এই nonce আছে             |
| `'sha256-<hash>'`  | এই hash-এর সঙ্গে মেলে এমন inline script             |
| `'strict-dynamic'` | আগে থেকেই বিশ্বস্ত কোনো script যে script load করে     |
| `'unsafe-inline'`  | যেকোনো inline script — ❌ এড়িয়ে চলুন                    |

> ⚠️ **`script-src`-এ `'unsafe-inline'` থাকলে CSP-র পুরো উদ্দেশ্যই মাটি।** Inject করা inline script তখন স্বাভাবিকভাবেই
> চলে। এর বদলে nonce বা hash ব্যবহার করুন।

## Nonce আর Strict CSP

কখনো কখনো inline script লাগেই। **Nonce** ("number used once") হলো একটি random value, যা server প্রতিটি request-এর
জন্য নতুন করে বানায়। Browser শুধু সেই inline script চালায়, যাতে মিলে যাওয়া nonce আছে। Inject করা script nonce জানে না,
তাই block হয়। Nonce স্থির হলে বা বারবার একই nonce ব্যবহার হলে কোনো সুরক্ষাই থাকে না।

**Express-এ প্রতি request-এ নতুন nonce:**

```typescript
import crypto from "node:crypto";
import type { Request, Response, NextFunction } from "express";

app.use((_req: Request, res: Response, next: NextFunction) => {
  const nonce: string = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce; // the template puts this on every trusted <script>
  res.setHeader(
    "Content-Security-Policy",
    `script-src 'nonce-${nonce}' 'strict-dynamic' https: 'unsafe-inline'; object-src 'none'; base-uri 'none'`,
  );
  next();
});
```

Domain allowlist সহজেই ভাঙে। একটি CDN-এ হাজার হাজার library থাকে, আর attacker একটিমাত্র দুর্বল entry-র সুযোগ নিতে
পারে। তাই Google এর বদলে এই strict policy-র সুপারিশ করে। `'strict-dynamic'` nonce দেওয়া script-কে আরও script load
করতে দেয়, ফলে বিশ্বাসটা nonce থেকেই ছড়িয়ে পড়ে। `https:` আর `'unsafe-inline'` পুরনো browser-এর জন্য fallback।
Nonce আর `'strict-dynamic'` বোঝে এমন browser দুটিকেই উপেক্ষা করে, তাই এগুলো কোনো ফাঁক তৈরি করে না।

## নিরাপদে CSP চালু করা

Strict CSP চালু থাকা একটি site ভেঙে দিতে পারে। তাই প্রথমে এটা ship করুন `Content-Security-Policy-Report-Only` হিসেবে।
Browser তখন জানায় কী কী block *করত*, কিন্তু আসলে কিছুই block করে না।

**Report-only header আর একটি collector:**

```typescript
app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Content-Security-Policy-Report-Only", "script-src 'self'; report-uri /csp-report");
  next();
});

app.post(
  "/csp-report",
  express.json({ type: ["application/csp-report", "application/json"] }),
  (req: Request, res: Response) => {
    const report = req.body["csp-report"];
    logger.warn("CSP violation", {
      blockedUri: report?.["blocked-uri"],
      directive: report?.["violated-directive"],
    });
    res.status(204).end();
  },
);
```

যতক্ষণ না প্রতিটি report আপনি বুঝতে পারছেন, report-only-তেই থাকুন। তারপর কম ঝুঁকির কয়েকটি page-এ enforce করুন, তারপর সব জায়গায়।

## অন্য Header-গুলো

| Header                      | যা থামায়                            | Value                                  |
| --------------------------- | -------------------------------- | -------------------------------------- |
| `Strict-Transport-Security` | HTTP-তে নামিয়ে আনা, SSL stripping | `max-age=63072000; includeSubDomains`  |
| `X-Content-Type-Options`    | MIME sniffing                    | `nosniff`                              |
| `Referrer-Policy`           | `Referer` দিয়ে URL ফাঁস                     | `strict-origin-when-cross-origin`      |
| `Permissions-Policy`        | অনাকাঙ্ক্ষিত camera, mic, location   | `camera=(), microphone=(), geolocation=()` |
| `X-XSS-Protection`          | এখন কিছুই না — filter-টায় bug ছিল | `0`                                  |

### HSTS

**HSTS** (HTTP Strict Transport Security) HTTPS বাধ্যতামূলক করে। Header সহ একটি HTTPS response পাওয়ার পর browser
পরের প্রতিটি `http://` request নিজেই upgrade করে নেয়। এতে SSL stripping আটকে যায়, যেখানে network-এ বসে থাকা
attacker আপনাকে HTTP-তে নামিয়ে আনে। `includeSubDomains` subdomain-গুলোকেও ঢেকে দেয়। `preload` আপনাকে browser-এর
ভেতরের তালিকায় তুলে দেয়, ফলে প্রথম visit-ও সুরক্ষিত থাকে।

> ⚠️ **HSTS প্রায় এমন একটি দরজা, যা দিয়ে আর ফেরা যায় না।** Browser পুরো `max-age` ধরে এটা cache করে, আর preload
> list থেকে বেরোতে অনেক সময় লাগে। শুরু করুন `max-age=300` দিয়ে। প্রতিটি subdomain ঠিকঠাক HTTPS দিচ্ছে কি না নিশ্চিত হয়ে তারপর বাড়ান।

### এক line-এর Header-গুলো

`nosniff` না থাকলে browser byte দেখে type অনুমান করতে পারে, ফলে upload করা "image" script হিসেবে চলে যেতে পারে।
`Referrer-Policy` থাকলে `/account/12345`-এর মতো URL অন্য site-এ ফাঁস হয় না। `Permissions-Policy` যে feature আপনি
ব্যবহার করেন না, সেগুলো বন্ধ করে দেয়, তাই কোনো compromised ad script camera চাইতে পারে না।

### Clickjacking আর frame-ancestors

**Clickjacking**-এ attacker আপনার page একটি অদৃশ্য `<iframe>`-এ load করে, আর তার ওপর নকল UI বসিয়ে দেয়। User ভাবেন
তিনি attacker-এর button-এ click করছেন, অথচ আসলে click করেন আপনার page-এর "Delete account"-এ।

| লক্ষ্য                   | CSP `frame-ancestors`        | পুরনো `X-Frame-Options` |
| ---------------------- | ---------------------------- | ----------------------- |
| সব framing block করা      | `'none'`                     | `DENY`                  |
| শুধু একই origin       | `'self'`                     | `SAMEORIGIN`            |
| নির্দিষ্ট partner domain  | `'self' https://partner.com` | ❌ support করে না        |

`frame-ancestors` এসেছে `X-Frame-Options`-এর জায়গায়। পুরনো browser-এর জন্য আপাতত দুটিই পাঠান।

## helmet আর Testing

Express-এ **helmet** যুক্তিসঙ্গত default দিয়ে পুরো set-টাই বসিয়ে দেয়। এটা HSTS, `nosniff`, `frame-ancestors`,
একটি baseline CSP, একটি referrer policy আর `X-XSS-Protection: 0` set করে। সঙ্গে `X-Powered-By` লুকিয়ে ফেলে।
হাতে header string না লিখে, যে অংশগুলো আপনার কাছে জরুরি, শুধু সেগুলো customise করুন।

**Custom CSP আর HSTS সহ helmet:**

```typescript
import helmet from "helmet";
import express from "express";

const app = express();
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: { defaultSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"] },
    },
    hsts: { maxAge: 63072000, includeSubDomains: true },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  }),
);
```

Development-এ `contentSecurityPolicy: false` আর `hsts: false` দিন। Hot reload-এর জন্য inline script আর `eval`
লাগে, আর `localhost`-এ HSTS আটকে গেলে তা ছাড়ানো ঝামেলার।

**Header-গুলো test-এ assert করুন, কারণ middleware-এর ক্রম বদলালে কোনো error ছাড়াই এগুলো হারিয়ে যায়:**

```typescript
import request from "supertest";
import { app } from "./app";

it("sets the security headers", async () => {
  const res = await request(app).get("/");
  expect(res.headers["content-security-policy"]).toContain("object-src 'none'");
  expect(res.headers["x-content-type-options"]).toBe("nosniff");
  expect(res.headers["x-powered-by"]).toBeUndefined();
});
```

## 🔑 মূল শিক্ষা

- CSP হলো প্রতিরক্ষার দ্বিতীয় সারি: ধরে নেয় injection সফল হয়েছে, আর script-কে চলতে দেয় না।
- `'unsafe-inline'` policy-কে অকেজো করে দেয়। আর `'strict-dynamic'` সহ প্রতি request-এর nonce domain allowlist-এর চেয়ে বড় পরিসরে ভালো কাজ করে।
- নতুন CSP চালু করুন report-only mode-এ, যা ধরা পড়ে তা ঠিক করুন, তারপরই কেবল enforce করুন।
- HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy` আর `Permissions-Policy` প্রতিটি এক line config-এ একটি করে attack বন্ধ করে।
- Default-এর জন্য helmet ব্যবহার করুন, আর header-গুলো test-এ assert করুন, কারণ middleware-এর ক্রম বদলালে এগুলো চুপচাপ হারিয়ে যায়।

## Interview-এর প্রশ্ন

**Q: `script-src`-এ `'unsafe-inline'` বিপজ্জনক কেন?**

এটা inline script আবার চলতে দেয়, আর বেশিরভাগ XSS payload ঠিক তা-ই। এটা থাকলে inject করা `<script>` স্বাভাবিকভাবে
চলে, আর policy প্রায় কিছুই রক্ষা করে না। এর বদলে nonce বা hash ব্যবহার করুন।

**Q: `'strict-dynamic'` কী, আর কেন ব্যবহার করবেন?**

আগে থেকেই বিশ্বস্ত, nonce দেওয়া কোনো script যে script load করে, এটা সেগুলোকেও বিশ্বাস করে। ফলে domain allowlist
সাজিয়ে রাখার ঝামেলা থাকে না। ওই allowlist সহজেই ভাঙে, কারণ একটি CDN entry-তেই exploit করার মতো library থাকতে পারে।
বিশ্বাসটা আসে nonce থেকে।

**Q: Production না ভেঙে strict CSP কীভাবে deploy করবেন?**

শুরু করুন `Content-Security-Policy-Report-Only` আর একটি reporting endpoint দিয়ে। আসল violation-গুলো পড়ুন, আর
বৈধগুলো ঠিক করুন nonce যোগ করে বা inline code বাইরে সরিয়ে। তারপর enforce করুন, প্রথমে page ধরে ধরে।

**Q: HSTS কীভাবে কাজ করে, আর এর ঝুঁকি কী?**

Header সহ একটি HTTPS response পাওয়ার পর browser পরের সব `http://` request নিজেই upgrade করে, তাতে SSL stripping
আটকে যায়। ঝুঁকি হলো, পুরো `max-age` ধরে এটা আটকে থাকে, আর preload ফেরানো ধীর প্রক্রিয়া। ভালো উত্তর শুরু হয় ছোট
`max-age` দিয়ে, আর আগে প্রতিটি subdomain check করে নেয়।

**Q: একটি team CSP ছাড়াই ship করতে চায়, কারণ CSP বারবার third-party widget ভেঙে দেয়। আপনি কী বলবেন?**

CSP না থাকার খরচ আর widget-টার মূল্য পাশাপাশি রেখে বিচার করুন। CSP না থাকলে যেকোনো XSS bug সরাসরি পুরো script
চালানোর সুযোগ হয়ে যায়। Loader-গুলোতে nonce বসানো বা widget-টাকে iframe-এ sandbox করার সময়টুকু strict policy
report-only-তে রাখুন। পুরো header বাদ না দিয়ে, একটি widget-এর জন্য একটি directive ঢিলে করুন।

## এরপর কী পড়বেন

- [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) — প্রতিরক্ষার প্রথম সারি, যার পেছনে CSP দাঁড়ায়
- [Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) — যে header-গুলো ঠিক করে, কে একটি response পড়তে পারবে
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — এই header-গুলো set করার build step যেখানে থাকে
