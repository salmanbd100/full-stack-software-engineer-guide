---
sourceHash: "71bf06c200fb21e1bbac12822fd03a3dded75703aab4e20b6f2ed6a747c46042"
title: "Cookie ও SameSite"
translatedAt: "2026-10-12T07:52:55.065Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Cookie ও SameSite {#ch-cookies-same-site}

> এমন একটি cookie set করুন, যেটা attacker পড়তে বা আবার পাঠাতে পারে না — আর প্রতিটি attribute কেন বেছেছেন, তা ব্যাখ্যা করুন।

**এই অধ্যায়ে:** cookie-এর attribute · `SameSite` Strict, Lax আর None · SameSite কীভাবে CSRF-কে দুর্বল করে · auth-এর জন্য cookie বনাম localStorage

## 💡 মূল ধারণা

Cookie হলো ছোট একটু data, যেটা server browser-কে রেখে দিতে বলে। এরপর browser সেটা **না চাইতেই প্রতিটি মিলে যাওয়া
request-এর সাথে জুড়ে দেয়**। এই একটি আচরণই অধ্যায়ের দুই অর্ধেককে ব্যাখ্যা করে। এ কারণেই cookie session বহন করে।
আবার এ কারণেই cross-site request forgery আদৌ সম্ভব। যে attacker আপনার cookie পড়তে পারে না, সে-ও browser-কে দিয়ে
সেটা পাঠিয়ে নিতে পারে।

তাই `Set-Cookie` line-এর প্রতিটি attribute একই প্রশ্নের উত্তর দেয়: *browser এটা কখন পাঠাবে?* `HttpOnly`-এর উত্তর
"JavaScript-কে কখনো নয়", `Secure`-এর উত্তর "plain text-এ কখনো নয়", আর `SameSite`-এর উত্তর "অন্য কারও page থেকে
কখনো নয়"। এগুলো ভেবেচিন্তে বেছে নেওয়াই পুরো দক্ষতা।

```text
# Server response
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict

# Every later request to the same origin
Cookie: sessionId=abc123
```

Cookie ছোট, প্রায় 4 KB, আর প্রতিটি request-এর সাথে যায়। তাই এটা storage-এর পদ্ধতি নয়, session-এর পদ্ধতি। যে data
server-এর দরকার নেই, সেটার জায়গা web storage-এ।

> ⚠️ **বদলাতে থাকা বিষয়:** এই অধ্যায়ের অন্য যেকোনো অংশের চেয়ে third-party cookie policy বেশি বদলেছে।
> Safari আর Firefox default-ভাবে third-party cookie block করে। Chrome একটি phase-out ঘোষণা করেছিল, দুবার পিছিয়েছে,
> তারপর default deprecation পুরোপুরি বাদ দিয়েছে। Embedded flow চালু রাখার অনুমোদিত উপায় এখন `Partitioned` (CHIPS)
> আর Storage Access API। টেকসই নীতি হলো: নিচের attribute-গুলো স্থির, কিন্তু *third-party context-এ cookie set করার
> অনুমতি* স্থির নয়। তাই এমন login flow কখনো বানাবেন না, যেটা এর ওপর নির্ভর করে।

## কীভাবে কাজ করে

### Attribute-গুলো

| Attribute | কী করে |
|-----------|--------------|
| `Path=/` | যে URL prefix-এ cookie পাঠানো হয় (default: বর্তমান path) |
| `Domain=example.com` | এই domain আর এর সব subdomain-এ পাঠায়। ঠিক ওই host-এ সীমিত রাখতে এটা বাদ দিন। |
| `Max-Age=3600` | সেকেন্ডে আয়ু (`Expires`-এর চেয়ে এটাই ভালো) |
| `Expires=<date>` | নির্দিষ্ট মেয়াদ শেষের তারিখ। `Max-Age`/`Expires` না থাকলে = session cookie (browser বন্ধ হলে শেষ)। |
| `Secure` | শুধু HTTPS-এ পাঠানো হয় |
| `HttpOnly` | `document.cookie` থেকে access করা **যায় না** — XSS দিয়ে token চুরির বিরুদ্ধে সবচেয়ে বড় একক সুরক্ষা |
| `SameSite=Strict\|Lax\|None` | Cross-site-এ পাঠানো নিয়ন্ত্রণ করে (নিচে দেখুন) |

**যে default-গুলো জানা দরকার:**

- Chromium browser **`SameSite` ছাড়া** cookie-কে `SameSite=Lax` হিসেবে ধরে। Firefox আর Safari তা করে না, তাই সবসময়
  স্পষ্টভাবে set করুন।
- `SameSite=None`-এর জন্য `Secure` **বাধ্যতামূলক**, নইলে cookie reject হয়।
- `HttpOnly` শুধু server set করতে পারে — JavaScript থেকে নয়।

### `SameSite`: Strict, Lax আর None

Request অন্য site থেকে এলে browser cookie পাঠাবে কি না, তা `SameSite` ঠিক করে।

| Value | Same-site request | অন্য site থেকে top-level navigation | Cross-site AJAX / iframe |
|-------|-------------------|----------------------------------------|--------------------------|
| `Strict` | ✅ পাঠায় | ❌ পাঠায় না | ❌ পাঠায় না |
| `Lax` (Chromium-এর default) | ✅ পাঠায় | ✅ পাঠায় (শুধু GET) | ❌ পাঠায় না |
| `None` | ✅ পাঠায় | ✅ পাঠায় | ✅ পাঠায় (`Secure` লাগে) |

**কোনটা বেছে নেবেন:**

| পরিস্থিতি | ব্যবহার করুন |
|----------|-----|
| সাধারণ web app-এর session cookie | `Lax` |
| Banking, admin, "destructive" operation | `Strict` |
| Third-party iframe / cross-site auth (SSO) | `None` + `Secure` |

> `Strict` "email-এ link-এ click করুন, logged in অবস্থায় পৌঁছান" flow ভেঙে দেয়, কারণ প্রথম navigation-এ browser cookie পাঠায় না। `Lax` সেটা চালু রাখে, আবার cross-site POST-ও block করে।

### CSRF, আর `SameSite` কীভাবে একে দুর্বল করে

**Cross-site request forgery** (CSRF) ঘটে কারণ browser নিজে থেকেই cookie পাঠায়। Attacker একজন logged-in user-কে ধোঁকা দিয়ে অন্য site থেকে একটি request করিয়ে নেয়:

```html
<!-- On attacker.com — runs while the victim is logged in to bank.com -->
<form method="POST" action="https://bank.com/transfer" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>f.submit();</script>
```

`SameSite` ছাড়া browser bank-এর session cookie পাঠিয়ে দেয়, আর transfer সফল হয়।

**`SameSite` প্রথম সুরক্ষা:**

- `SameSite=Lax` cross-site POST block করে → form-submit attack শেষ
- `SameSite=Strict` সব cross-site পাঠানো block করে

**Defence in depth-এর জন্য একটি CSRF token যোগ করুন:**

```typescript
// Server: issue token tied to the session
res.cookie("csrf", token, { sameSite: "lax", secure: true });

// Client: send it back in a header on state-changing requests
await fetch("/transfer", {
  method: "POST",
  credentials: "include",
  headers: { "X-CSRF-Token": readCookie("csrf") },
  body: JSON.stringify({ amount, to }),
});
```

> CSRF cookie পড়ে সেটা একটি header-এ ফেরত পাঠানোকে বলে **double-submit cookie** pattern। Same-origin policy attacker-এর page-কে আপনার cookie পড়তে দেয় না, তাই সে header নকল করতে পারে না।

### JavaScript থেকে পড়া আর লেখা

`document.cookie` বিখ্যাতভাবেই অসুবিধাজনক। Read করলে একটি লম্বা string ফেরত আসে, যেটা parse করতে হয়। আর write হলো
পুরো একটি attribute line। এটা দিয়ে `HttpOnly` set করা যায় না। এটা ইচ্ছাকৃত, আর আসল কথাও এটাই।

```typescript
document.cookie = "theme=dark; Path=/; Max-Age=31536000; SameSite=Lax"; // write
document.cookie = "theme=; Path=/; Max-Age=0"; // delete, by expiring it
```

## কখন ব্যবহার করবেন

| বিষয় | HttpOnly Cookie | localStorage |
|---------|----------------|--------------|
| **XSS token পড়ে** | ❌ সম্ভব নয় (JS access করতে পারে না) | ✅ খুব সহজ |
| **CSRF** | ✅ সম্ভব — `SameSite` + token দিয়ে কমান | ❌ সম্ভব নয় (হাতে পাঠাতে হয়) |
| **প্রতিটি request-এর সাথে যায়** | ✅ Automatic | ❌ Header দিয়ে হাতে |
| **Cross-domain SSO** | কাজ করে (`SameSite=None; Secure` দিয়ে) | ঝামেলার |

**Interview-এর জন্য তৈরি উত্তর:** XSS, CSRF-এর চেয়ে অনেক বেশি সাধারণ, আর HttpOnly cookie একে অকেজো করে দেয়। Session-এর জন্য HttpOnly cookie ব্যবহার করুন, আর `SameSite=Lax` সাথে একটি token দিয়ে CSRF থেকে রক্ষা করুন।

### Split-token pattern

বেশিরভাগ interviewer এই উত্তরটাই শুনতে চান। দীর্ঘমেয়াদি refresh token রাখুন একটি `HttpOnly` cookie-তে, আর
স্বল্পমেয়াদি access token রাখুন memory-তে।

```typescript
// --- SERVER (Express) ---
app.post("/login", async (req, res) => {
  const user = await authenticate(req.body);
  if (!user) return res.status(401).end();

  const accessToken = signAccess(user);      // 15 min
  const refreshToken = signRefresh(user);    // 7 days

  res.cookie("refresh", refreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/auth",                           // only sent to /auth/*
  });

  res.json({ accessToken });
});

// --- CLIENT ---
let accessToken: string | null = null;

async function api(url: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });

  if (res.status !== 401) return res;

  // Access token expired — refresh and retry
  const r = await fetch("/auth/refresh", { method: "POST", credentials: "include" });
  ({ accessToken } = await r.json());
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${accessToken}` },
  });
}
```

**কেন এটা কাজ করে:**

- Access token কখনো storage ছোঁয় না। XSS এটা memory থেকে নিতে পারে শুধু **page খোলা থাকা অবস্থায়**, যা ক্ষতি সীমিত রাখে।
- Refresh token HttpOnly → XSS এটা একেবারেই পড়তে পারে না।
- Refresh cookie-তে `SameSite=Strict` `/auth/refresh`-এ CSRF block করে।

### Consent

GDPR আর CCPA অনুযায়ী, user রাজি হওয়ার আগে আপনি শুধু **একান্ত প্রয়োজনীয়** cookie set করতে পারেন। যেমন session,
CSRF token আর একটি load-balancer cookie। Preference, analytics আর marketing cookie-র জন্য আগে opt-in consent লাগে।
Banner-এ Accept, Reject আর Customise থাকে, আগে থেকে কিছুই tick করা থাকে না। এর পেছনের script-গুলো load হয় শুধু
user বেছে নেওয়ার পরে।

## সাধারণ ভুল

**❌ কিছু একটা চালু করতে `SameSite=None` set করা।** এই value সুরক্ষাটা বন্ধ করে দেয়। এটা ঠিক শুধু তখনই, যখন cookie-কে
সত্যিই third-party context-এ যেতে হয়। একটি request "cookie পাঠাচ্ছিল না" বলে যদি এটা ব্যবহার করেন, তাহলে প্রতিটি
request থেকে CSRF সুরক্ষা সরিয়ে দিচ্ছেন।

**❌ `SameSite=None`-এর সাথে `Secure` বাদ দেওয়া।** Browser cookie-টি সরাসরি reject করে। এটা সাধারণত cookie bug হিসেবে
নয়, authentication bug হিসেবে ধরা পড়ে।

**❌ অভ্যাসবশত `Domain=example.com` set করা।** এটা cookie-কে প্রতিটি subdomain পর্যন্ত ছড়িয়ে দেয়, attacker যেটায়
পা রাখতে পেরেছে সেটাসহ। কোনো subdomain-এর সত্যিই cookie দরকার না হলে `Domain` বাদ দিন।

**❌ Cookie-কেই পুরো CSRF সুরক্ষা ভাবা।** `SameSite=Lax` cross-site POST block করে, কিন্তু এটা browser-এর আচরণ।
পুরোনো browser, বা attacker-এর নিয়ন্ত্রণে থাকা same-site subdomain, তবুও ঢুকে পড়ে। Double-submit token দ্বিতীয় স্তর,
বিকল্প নয়।

**❌ Consent-এর আগে analytics load করা আর পরে জিজ্ঞেস করা।** আগে থেকে tick করা box consent নয়, আর যে banner এর পেছনের
script আগেই চালিয়ে দিয়েছে, সেটাও নয়।

## 🔑 মূল শিক্ষা

- Browser প্রতিটি মিলে যাওয়া request-এ নিজে থেকেই cookie জুড়ে দেয়। এ কারণে cookie session-এর জন্য কাজ করে, আবার
  এ কারণেই CSRF সম্ভব।
- Session cookie-র জন্য সবচেয়ে গুরুত্বপূর্ণ attribute হলো `HttpOnly`, কারণ XSS একে হারাতে পারে না।
- বেশিরভাগ application-এর জন্য সঠিক উত্তর `SameSite=Lax`। শুধু Chromium এটা default-ভাবে প্রয়োগ করে, তাই স্পষ্টভাবে
  set করুন। `Strict` email-এর link-এ click করার flow ভেঙে দেয়। `None`-এর জন্য `Secure` লাগে, আর এটা সুরক্ষা বন্ধ
  করে দেয়।
- Credential ভাগ করুন: refresh token একটি `HttpOnly` cookie-তে, access token memory-তে। তাহলে XSS বড়জোর একটি
  স্বল্পমেয়াদি value পায়।
- Consent-এর আগে শুধু একান্ত প্রয়োজনীয় cookie set করা যায়, আর আগে থেকে tick করা box consent নয়।

## Interview-এর প্রশ্ন

**Q: `SameSite=Strict` বনাম `Lax` বনাম `None` বুঝিয়ে বলুন।**

- **`Strict`**: শুধু same-site request-এ পাঠানো হয়। সবচেয়ে নিরাপদ, কিন্তু cross-site UX ভেঙে দেয়, কারণ email-এর link session বহন করবে না।
- **`Lax`**: same-site request, সাথে top-level GET navigation। Chromium-এর default, আর সাধারণ app-এর জন্য ভালো ভারসাম্য।
- **`None`**: প্রতিটি request-এ পাঠানো হয়, cross-site iframe আর AJAX-সহ। Embedded third-party flow-এর জন্য দরকার। অবশ্যই `Secure`-এর সাথে জোড়া দিতে হবে।

**Q: Auth cookie-র জন্য `Secure`-এর চেয়ে `HttpOnly` কেন বেশি গুরুত্বপূর্ণ?**

`HttpOnly` JavaScript-কে cookie পড়তে দেয় না। এটা XSS-নির্ভর token চুরি থামায়, আর XSS হলো সবচেয়ে সাধারণ web attack। `Secure` শুধু network path-এ থাকা attacker থেকে রক্ষা করে, যেটা HTTPS এমনিতেই মূলত সমাধান করে দেয়। দুটোই চান, কিন্তু `HttpOnly`-এর লাভ বড়।

**Q: `SameSite` কীভাবে CSRF ঠেকায়?**

CSRF নির্ভর করে এর ওপর যে attacker-এর page আপনার site-এ request trigger করলে browser নিজে থেকেই user-এর session cookie পাঠিয়ে দেয়। `SameSite=Lax` cross-site POST, PUT আর DELETE block করে, আর CSRF ঠিক সেখানেই থাকে। Attacker-এর request cookie ছাড়াই আপনার server-এ পৌঁছায়। User-কে logged out মনে হয়, আর action ব্যর্থ হয়।

**Q: JWT কেন `localStorage`-এ রাখবেন না?**

Page-এর যেকোনো script `localStorage` পড়তে পারে। একটিমাত্র XSS, এমনকি compromised একটি npm dependency থেকে এলেও, token পড়ে বাইরে পাঠিয়ে দিতে পারে। HttpOnly cookie JavaScript-এর কাছে অদৃশ্য। একই XSS তবুও আপনার API call করতে পারে, কারণ browser নিজে থেকেই cookie পাঠায়। কিন্তু দীর্ঘমেয়াদি credential-টি **চুরি করতে পারে না**।

**Q: `app.example.com` আর `api.example.com` জুড়ে auth কীভাবে করবেন?**

Cookie `Domain=example.com` দিয়ে set করুন, যাতে দুটো subdomain-ই এটা পায়। `Secure` ব্যবহার করুন, আর `SameSite=Lax`, বা cross-site flow না লাগলে `Strict`। API যদি সম্পূর্ণ আলাদা registrable domain-এ থাকে, তাহলে `SameSite=None; Secure` আর `credentials: "include"` সহ CORS লাগবে।

## এরপর কী পড়বেন

- [Chapter ?? — Web Storage ও IndexedDB](#ch-storage-apis) — বিকল্পটি, আর কেন এই তর্কে সে হেরে যায়
- [Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) — forgery সুরক্ষার server-এর অর্ধেক
- [Chapter ?? — Content Security Policy ও Security Header](#ch-content-security-policy) — অন্য যে header-গুলো attack শুরু
  হওয়ার আগেই একটি পুরো শ্রেণি বন্ধ করে দেয়
