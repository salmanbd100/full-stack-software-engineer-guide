---
sourceHash: "4c7dd64adeba70eca81f349b0175e7ac6ba3d97eb04ab632685059c92340f263"
title: "Content Security Policy ও Security Header"
translatedAt: "2026-10-12T12:15:40.687Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Content Security Policy ও Security Header {#ch-content-security-policy}

> এমন একটি policy লিখুন, যেটা একটি সফল injection-এর পরেও টিকে থাকে, তার চারপাশে header-গুলো set করুন, আর site না ভেঙে দুটিই roll out করুন।

**এই অধ্যায়ে:** CSP কীভাবে কাজ করে · nonce আর strict-dynamic · report-only rollout · HSTS, nosniff আর clickjacking · helmet আর testing

## 💡 মূল ধারণা

**Security header** হলো এমন HTTP response header, যেগুলো browser-এর বাড়তি সুরক্ষা চালু করে। প্রতিটি browser-এর এমন একটি
ক্ষমতা সরিয়ে দেয়, যেটা একজন attacker ব্যবহার করতে পারত। বেশিরভাগের খরচ মাত্র এক line।

সবচেয়ে বড়টি হলো **Content Security Policy (CSP)**। এটা browser-কে বলে, কোন কোন source থেকে script, style আর অন্যান্য
content আসতে পারবে। List-এ না থাকা সবকিছু block হয়। CSP হলো **XSS-এর জন্য defence in depth**: এটা ধরে নেয় যে একটি
injection ইতিমধ্যে সফল হয়েছে, আর inject করা script-কে চলতে দেয় না। এটা output encoding-এর পেছনে ব্যাকআপ হিসেবে থাকে।
এর জায়গা নেয় না।

> ⚠️ **যা বদলাতে থাকে:** header-এর set স্থির নয়। `Feature-Policy` হয়ে গেছে `Permissions-Policy`,
> `X-XSS-Protection` recommended থেকে ক্ষতিকর হয়ে গেছে, আর cross-origin isolation header এসেছে পরে।
> টেকসই নীতি হলো, প্রতিটি header default-ভাবে একটি ক্ষমতা বন্ধ করে। যেকোনো নতুন header-এর ক্ষেত্রে জিজ্ঞেস করুন,
> এটা কী বন্ধ করে, আর আপনার ship করা কিছুর কি এখনো সেটা লাগে।

## CSP কীভাবে কাজ করে

Browser সেই page-এ `Content-Security-Policy` header enforce করে। একটি policy হলো **directive**-এর একটি list, প্রতিটির
সাথে একটি **source list**, semicolon দিয়ে আলাদা করা।

**`script-src 'self'` কী অনুমতি দেয়:**

```typescript
// <script src="https://evil.com/x.js"></script>  ❌ blocked
// <script>alert(1)</script>                       ❌ blocked (inline)
// <script src="/js/app.js"></script>              ✅ allowed (same origin)
```

বড় লাভটা হলো inline script block করা। বেশিরভাগ XSS payload inline, যেমন `<script>…</script>` বা একটি `onerror=`
attribute। `'unsafe-inline'` ছাড়া একটি policy default-ভাবে এদের সবাইকে block করে।

| Directive         | যা নিয়ন্ত্রণ করে                                        |
| ----------------- | ----------------------------------------------- |
| `default-src`     | Set না করা যেকোনো directive-এর fallback          |
| `script-src`      | Script কোথা থেকে load হতে পারে — আসল গুরুত্বপূর্ণটা এটাই |
| `frame-ancestors` | কে আপনার page একটি frame-এ embed করতে পারে              |
| `object-src`      | `<object>` আর `<embed>` — `'none'`-এ set করুন      |
| `base-uri`        | `<base>` tag — `'none'` বা `'self'`-এ set করুন  |

| Source value       | মানে                                         |
| ------------------ | ----------------------------------------------- |
| `'self'`           | শুধু same origin                                |
| `'nonce-<random>'` | ঠিক এই nonce বহন করা script            |
| `'sha256-<hash>'`  | এই hash-এর সাথে মেলে এমন একটি inline script             |
| `'strict-dynamic'` | ইতিমধ্যে trusted একটি script-এর load করা script     |
| `'unsafe-inline'`  | যেকোনো inline script — ❌ এড়িয়ে চলুন                    |

> ⚠️ **`script-src`-এ `'unsafe-inline'` CSP-র পুরো উদ্দেশ্যটাই নষ্ট করে।** Inject করা একটি inline script
> স্বাভাবিকভাবেই চলে। এর বদলে একটি nonce বা hash ব্যবহার করুন।

## Nonce আর Strict CSP

কখনো কখনো আপনার একটি inline script লাগে। একটি **nonce** ("number used once") হলো একটি random value, যেটা server
প্রতিটি request-এর জন্য বানায়। Browser শুধু সেই inline script-গুলো চালায়, যেগুলো মিলে যাওয়া nonce বহন করে। Inject করা
script এটা জানে না, তাই block হয়। একটি static বা আবার ব্যবহার করা nonce কোনো সুরক্ষাই দেয় না।

**Express-এ প্রতি request-এ একটি nonce:**

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

Domain allowlist ভঙ্গুর। একটি CDN হাজার হাজার library host করে, আর একজন attacker একটি দুর্বল entry-র অপব্যবহার করতে
পারে। Google এর বদলে এই strict policy recommend করে। `'strict-dynamic'` একটি nonce থাকা script-কে আরও script load
করতে দেয়, তাই trust nonce থেকে প্রবাহিত হয়। `https:` আর `'unsafe-inline'` হলো পুরনো browser-এর জন্য fallback। যে
browser nonce আর `'strict-dynamic'` বোঝে, সে দুটিকেই উপেক্ষা করে, তাই এগুলো কোনো ফাঁক তৈরি করে না।

## নিরাপদে CSP Roll Out করা

একটি strict CSP একটি live site ভেঙে দিতে পারে। প্রথমে এটা `Content-Security-Policy-Report-Only` হিসেবে ship করুন।
Browser report করে সে কী block *করত*, আর কিছুই block করে না।

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

যতক্ষণ না প্রতিটি report আপনি বোঝেন, ততক্ষণ report-only-তে থাকুন। কয়েকটি কম ঝুঁকির page-এ enforce করুন, তারপর সবখানে।

## অন্য Header-গুলো

| Header                      | যা থামায়                            | Value                                  |
| --------------------------- | -------------------------------- | -------------------------------------- |
| `Strict-Transport-Security` | HTTP-তে downgrade, SSL stripping | `max-age=63072000; includeSubDomains`  |
| `X-Content-Type-Options`    | MIME sniffing                    | `nosniff`                              |
| `Referrer-Policy`           | `Referer`-এর মধ্য দিয়ে URL leak      | `strict-origin-when-cross-origin`      |
| `Permissions-Policy`        | অনাকাঙ্ক্ষিত camera, mic, location   | `camera=(), microphone=(), geolocation=()` |
| `X-XSS-Protection`          | এখন কিছুই না — filter-টি buggy ছিল | `0`                                  |

### HSTS

**HSTS** (HTTP Strict Transport Security) HTTPS বাধ্যতামূলক করে। Header সহ একটি HTTPS response-এর পর, browser পরের
প্রতিটি `http://` request নিজেই upgrade করে। এটা SSL stripping block করে, যেখানে network-এ থাকা একজন attacker আপনাকে
HTTP-তে নামিয়ে আনে। `includeSubDomains` subdomain-গুলো cover করে। `preload` আপনাকে browser-এর built-in list-এ তোলে,
তাই browser প্রথম visit-ও রক্ষা করে।

> ⚠️ **HSTS প্রায় একমুখী দরজা।** Browser পুরো `max-age` জুড়ে এটা cache করে, আর preload list থেকে বেরোনো ধীর।
> `max-age=300` দিয়ে শুরু করুন, নিশ্চিত হোন যে প্রতিটি subdomain বৈধ HTTPS serve করে, তারপর বাড়ান।

### এক Line-এর Header-গুলো

`nosniff` ছাড়া browser byte দেখে type অনুমান করতে পারে, তাই একটি "image" upload script হিসেবে চলে যেতে পারে।
`Referrer-Policy` `/account/12345`-এর মতো একটি URL অন্য site-এ leak হওয়া থামায়। `Permissions-Policy` আপনার ব্যবহার না
করা feature বন্ধ করে, তাই একটি compromised ad script camera চাইতে পারে না।

### Clickjacking আর frame-ancestors

**Clickjacking**-এ একজন attacker আপনার page একটি অদৃশ্য `<iframe>`-এ load করে, আর ওপরে নকল UI বসায়। User ভাবেন তিনি
attacker-এর button-এ click করছেন, কিন্তু আসলে click করেন আপনার "Delete account"-এ।

| লক্ষ্য                   | CSP `frame-ancestors`        | পুরনো `X-Frame-Options` |
| ---------------------- | ---------------------------- | ----------------------- |
| সব framing block করা      | `'none'`                     | `DENY`                  |
| শুধু same origin       | `'self'`                     | `SAMEORIGIN`            |
| নির্দিষ্ট partner domain  | `'self' https://partner.com` | ❌ support করে না        |

`frame-ancestors` `X-Frame-Options`-এর জায়গা নেয়। পুরনো browser-এর জন্য আপাতত দুটিই পাঠান।

## helmet আর Testing

Express-এ **helmet** যুক্তিসঙ্গত default দিয়ে পুরো set apply করে। এটা HSTS, `nosniff`, `frame-ancestors`, একটি
baseline CSP, একটি referrer policy আর `X-XSS-Protection: 0` set করে। এটা `X-Powered-By`-ও লুকিয়ে ফেলে। Header string
হাতে না লিখে, যে অংশগুলো আপনার কাছে গুরুত্বপূর্ণ, সেগুলো customise করুন।

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

Development-এ `contentSecurityPolicy: false` আর `hsts: false` দিন। Hot reload-এর inline script আর `eval` লাগে, আর
`localhost`-এ একটি HSTS pin undo করা যন্ত্রণার।

**Header-গুলো নিয়ে assert করুন, কারণ middleware-এর ক্রম বদলালে কোনো error ছাড়াই এগুলো বাদ পড়ে যায়:**

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

- CSP হলো দ্বিতীয় প্রতিরক্ষা রেখা: এটা ধরে নেয় একটি injection সফল হয়েছে, আর script-কে চলতে দেয় না।
- `'unsafe-inline'` policy নষ্ট করে, আর `'strict-dynamic'` সহ প্রতি request-এর nonce একটি domain allowlist-এর চেয়ে ভালো scale করে।
- একটি নতুন CSP report-only mode-এ roll out করুন, যা fire করে তা ঠিক করুন, আর তারপরই enforce করুন।
- HSTS, `nosniff`, `frame-ancestors`, `Referrer-Policy` আর `Permissions-Policy` প্রতিটি এক line config-এর বিনিময়ে একটি attack বন্ধ করে।
- Default-এর জন্য helmet ব্যবহার করুন, আর একটি test-এ header নিয়ে assert করুন, কারণ middleware-এর ক্রম বদলালে এগুলো চুপচাপ সরে যায়।

## Interview-এর প্রশ্ন

**Q: `script-src`-এ `'unsafe-inline'` কেন বিপজ্জনক?**

এটা inline script আবার অনুমতি দেয়, আর বেশিরভাগ XSS payload ঠিক তা-ই। এটা থাকলে inject করা একটি `<script>` স্বাভাবিকভাবেই
চলে, আর policy প্রায় কিছুই রক্ষা করে না। এর বদলে nonce বা hash ব্যবহার করুন।

**Q: `'strict-dynamic'` কী, আর কেন এটা ব্যবহার করবেন?**

ইতিমধ্যে trusted, nonce থাকা একটি script যে script load করে, এটা তাকে trust করে। আপনাকে আর domain allowlist সামলাতে হয় না,
যেগুলো ভঙ্গুর, কারণ একটি CDN entry-ই একটি exploit করার মতো library host করতে পারে। Trust nonce থেকে প্রবাহিত হয়।

**Q: Production না ভেঙে একটি strict CSP কীভাবে deploy করবেন?**

`Content-Security-Policy-Report-Only` আর একটি reporting endpoint দিয়ে শুরু করুন। আসল violation পড়ুন, আর বৈধগুলো ঠিক
করুন nonce যোগ করে বা inline code বাইরে সরিয়ে। তারপর enforce করুন, প্রথমে page ধরে ধরে।

**Q: HSTS কীভাবে কাজ করে, আর ঝুঁকিটা কী?**

Header সহ একটি HTTPS response-এর পর, browser পরের সব `http://` request নিজেই upgrade করে, যেটা SSL stripping block করে।
ঝুঁকি হলো, এটা পুরো `max-age` জুড়ে আটকে থাকে, আর preloading উল্টানো ধীর। একটি শক্তিশালী উত্তর একটি ছোট `max-age` দিয়ে
শুরু করে, আর আগে প্রতিটি subdomain check করে।

**Q: একটি team CSP ছাড়াই ship করতে চায়, কারণ এটা বারবার third-party widget ভেঙে দেয়। আপনি কী বলবেন?**

CSP না থাকার খরচকে widget-এর বিপরীতে মাপুন। এটা ছাড়া যেকোনো XSS bug পূর্ণ script execution-এ পরিণত হয়। Loader-গুলোতে
nonce দেওয়ার বা widget-কে একটি iframe-এ sandbox করার সময়টুকু একটি strict policy report-only-তে রাখুন। পুরো header বাদ না
দিয়ে, একটি widget-এর জন্য একটি directive শিথিল করুন।

## এরপর কী পড়বেন

- [Chapter ?? — XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) — প্রথম প্রতিরক্ষা রেখা, CSP যার ব্যাকআপ
- [Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) — যে header-গুলো ঠিক করে কে একটি response পড়তে পারবে
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — এই header set করা build step-গুলো যেখানে থাকে
