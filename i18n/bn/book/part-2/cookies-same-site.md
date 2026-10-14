---
sourceHash: "71bf06c200fb21e1bbac12822fd03a3dded75703aab4e20b6f2ed6a747c46042"
title: "Cookie ও SameSite"
translatedAt: "2026-10-14T04:52:40.611Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Cookie ও SameSite {#ch-cookies-same-site}

> এমন cookie set করুন, যা attacker পড়তেও পারবে না, আবার পাঠাতেও পারবে না। আর প্রতিটি attribute কেন বেছেছেন, তা ব্যাখ্যা করুন।

**এই অধ্যায়ে:** cookie-র attribute · `SameSite` Strict, Lax আর None · SameSite কীভাবে CSRF-কে ভোঁতা করে · auth-এর জন্য cookie বনাম localStorage

## 💡 মূল ধারণা

Cookie হলো ছোট একটুকরো data, যা server browser-কে রেখে দিতে বলে। তারপর browser সেটা **না চাইতেই মিলে যাওয়া প্রতিটি
request-এ** জুড়ে দেয়। এই একটি আচরণ দিয়েই অধ্যায়ের দুটি অর্ধেক ব্যাখ্যা হয়ে যায়। Cookie session বয়ে নিয়ে যায় এই
কারণে, আর cross-site request forgery-র অস্তিত্বও এই কারণেই। যে attacker আপনার cookie পড়তে পারে না, সে-ও browser-কে
দিয়ে সেটা পাঠিয়ে নিতে পারে।

তাই `Set-Cookie` line-এর প্রতিটি attribute একই প্রশ্নের উত্তর দেয়: *browser কখন এটা পাঠাবে?* `HttpOnly`-এর উত্তর
"JavaScript-কে কখনো না", `Secure`-এর উত্তর "খোলা লেখায় কখনো না", আর `SameSite`-এর উত্তর "অন্য কারও পাতা থেকে কখনো
না"। জেনে-বুঝে এগুলো বাছাই করাই পুরো দক্ষতা।

```text
# Server response
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict

# Every later request to the same origin
Cookie: sessionId=abc123
```

Cookie ছোট, প্রায় 4 KB, আর প্রতিটি request-এর সঙ্গে যায়। তাই এটা storage-এর ব্যবস্থা নয়, session-এর ব্যবস্থা। যে
data server-এর লাগে না, তার জায়গা web storage-এ।

> ⚠️ **যা বদলাতে থাকে:** এই অধ্যায়ের অন্য যেকোনো অংশের চেয়ে বেশি বদলেছে third-party cookie-র নীতি। Safari আর Firefox
> default-এ third-party cookie আটকায়। Chrome এগুলো তুলে দেওয়ার ঘোষণা দিয়েছিল, দুবার পিছিয়েছে, তারপর default
> deprecation-টাই বাদ দিয়েছে। Embed করা flow চালু রাখার অনুমোদিত উপায় এখন `Partitioned` (CHIPS) আর Storage Access
> API। টেকসই নীতি হলো, নিচের attribute-গুলো স্থির, কিন্তু *third-party প্রসঙ্গে cookie set করার অনুমতি* স্থির নয়। তাই
> এমন login flow কখনো বানাবেন না, যা এর ওপর নির্ভর করে।

## কীভাবে কাজ করে

### Attribute-গুলো

| Attribute | কী করে |
|-----------|--------------|
| `Path=/` | কোন URL prefix-এ cookie পাঠানো হবে (default: বর্তমান path) |
| `Domain=example.com` | এই domain আর তার সব subdomain-এ পাঠায়। না দিলে শুধু ঠিক ওই host-এ যায়। |
| `Max-Age=3600` | আয়ু, second-এ (`Expires`-এর চেয়ে এটাই ভালো) |
| `Expires=<date>` | মেয়াদ শেষের নির্দিষ্ট তারিখ। `Max-Age`/`Expires` কোনোটাই না থাকলে session cookie (browser বন্ধ হলেই শেষ)। |
| `Secure` | শুধু HTTPS-এ পাঠানো হয় |
| `HttpOnly` | `document.cookie` থেকে **পড়া যায় না** — XSS দিয়ে token চুরির বিরুদ্ধে একক সবচেয়ে বড় সুরক্ষা |
| `SameSite=Strict\|Lax\|None` | Cross-site-এ পাঠানো নিয়ন্ত্রণ করে (নিচে দেখুন) |

**যে default-গুলো জানা দরকার:**

- **`SameSite` ছাড়া** cookie-কে Chromium browser `SameSite=Lax` ধরে। Firefox আর Safari তা ধরে না, তাই সবসময় স্পষ্ট
  করে দিন।
- `SameSite=None` দিলে `Secure` **দিতেই হবে**, নইলে cookie বাতিল হয়ে যায়।
- `HttpOnly` set করতে পারে শুধু server — JavaScript থেকে নয়।

### `SameSite`: Strict, Lax আর None

Request অন্য site থেকে এলে browser cookie পাঠাবে কিনা, তা ঠিক করে `SameSite`।

| Value | Same-site request | অন্য site থেকে top-level navigation | Cross-site AJAX / iframe |
|-------|-------------------|----------------------------------------|--------------------------|
| `Strict` | ✅ যায় | ❌ যায় না | ❌ যায় না |
| `Lax` (Chromium-এর default) | ✅ যায় | ✅ যায় (শুধু GET) | ❌ যায় না |
| `None` | ✅ যায় | ✅ যায় | ✅ যায় (`Secure` লাগে) |

**কোনটা বাছবেন:**

| পরিস্থিতি | কী দেবেন |
|----------|-----|
| সাধারণ web app-এর session cookie | `Lax` |
| Banking, admin, "ধ্বংসাত্মক" operation | `Strict` |
| Third-party iframe / cross-site auth (SSO) | `None` + `Secure` |

> `Strict` থাকলে "email-এর link-এ click করে logged in অবস্থায় পৌঁছানো" flow ভেঙে যায়, কারণ প্রথম navigation-এ browser cookie পাঠায় না। `Lax` সেটা চালু রাখে, আবার cross-site POST-ও আটকায়।

### CSRF, আর `SameSite` কীভাবে একে ভোঁতা করে

**Cross-site request forgery** (CSRF) ঘটে কারণ browser নিজে থেকেই cookie পাঠায়। Attacker logged-in একজন user-কে ভুলিয়ে অন্য site থেকে একটা request পাঠিয়ে নেয়:

```html
<!-- On attacker.com — runs while the victim is logged in to bank.com -->
<form method="POST" action="https://bank.com/transfer" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>f.submit();</script>
```

`SameSite` না থাকলে browser bank-এর session cookie পাঠিয়ে দেয়, আর টাকা পাঠানো হয়ে যায়।

**প্রথম সুরক্ষা `SameSite`:**

- `SameSite=Lax` cross-site POST আটকায় → form submit-এর attack শেষ
- `SameSite=Strict` cross-site-এ সব পাঠানো আটকায়

**স্তরে স্তরে সুরক্ষার জন্য একটা CSRF token যোগ করুন:**

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

> CSRF cookie পড়ে সেটা header-এ আবার পাঠানোকে বলে **double-submit cookie** pattern। Same-origin policy attacker-এর পাতাকে আপনার cookie পড়তে দেয় না, তাই সে header নকল করতে পারে না।

### JavaScript থেকে পড়া আর লেখা

`document.cookie` বিখ্যাতভাবেই অসুবিধাজনক। পড়লে পাওয়া যায় একটা লম্বা string, যা parse করতে হয়, আর লিখতে হয় পুরো
একটা attribute line। এখান থেকে `HttpOnly` set করা যায় না। এটা design অনুযায়ীই, আর আসল কথাও সেটাই।

```typescript
document.cookie = "theme=dark; Path=/; Max-Age=31536000; SameSite=Lax"; // write
document.cookie = "theme=; Path=/; Max-Age=0"; // delete, by expiring it
```

## কখন ব্যবহার করবেন

| বিষয় | HttpOnly Cookie | localStorage |
|---------|----------------|--------------|
| **XSS token পড়ে ফেলে** | ❌ সম্ভব নয় (JS পড়তে পারে না) | ✅ খুবই সহজ |
| **CSRF** | ✅ সম্ভব — `SameSite` + token দিয়ে ঠেকান | ❌ সম্ভব নয় (হাতে পাঠাতে হয়) |
| **প্রতিটি request-এর সঙ্গে যায়** | ✅ নিজে থেকেই | ❌ Header দিয়ে হাতে |
| **Cross-domain SSO** | চলে (`SameSite=None; Secure` সহ) | ঝামেলার |

**Interview-এর জন্য তৈরি উত্তর:** CSRF-এর চেয়ে XSS অনেক বেশি ঘটে, আর HttpOnly cookie একে অকেজো করে দেয়। Session-এর জন্য HttpOnly cookie নিন, আর CSRF ঠেকান `SameSite=Lax` আর একটা token দিয়ে।

### Split-token pattern

বেশিরভাগ interviewer এই উত্তরটাই শোনার অপেক্ষায় থাকেন। দীর্ঘ মেয়াদের refresh token রাখুন একটা `HttpOnly` cookie-তে,
আর অল্প মেয়াদের access token রাখুন memory-তে।

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

- Access token কখনো storage ছোঁয় না। XSS এটা memory থেকে নিতে পারে শুধু **পাতা খোলা থাকা অবস্থায়**, তাই ক্ষতি সীমিত থাকে।
- Refresh token HttpOnly → XSS একে পড়তেই পারে না।
- Refresh cookie-তে `SameSite=Strict` থাকায় `/auth/refresh`-এ CSRF আটকে যায়।

### সম্মতি

GDPR আর CCPA অনুযায়ী user রাজি হওয়ার আগে শুধু **একেবারে অপরিহার্য** cookie set করা যায়। যেমন session, CSRF token
আর load balancer-এর cookie। পছন্দ, analytics আর marketing-এর cookie-র জন্য আগে opt-in সম্মতি লাগে। Banner-এ থাকে
Accept, Reject আর Customise, কোনো কিছুতে আগে থেকে টিক দেওয়া থাকে না। আর তার পেছনের script load হয় শুধু বাছাইয়ের পরে।

## সাধারণ ভুল

**❌ কিছু একটা চালু করতে `SameSite=None` দেওয়া।** এই value সুরক্ষাটাই বন্ধ করে দেয়। এটা ঠিক শুধু তখন, যখন cookie-কে
সত্যিই third-party প্রসঙ্গে যেতে হয়। কোনো request "cookie পাঠাচ্ছিল না" বলে এটা দিলে, প্রতিটি request থেকে CSRF-এর
সুরক্ষা সরিয়ে ফেলেন।

**❌ `SameSite=None`-এর সঙ্গে `Secure` না দেওয়া।** Browser cookie-টা সরাসরি বাতিল করে দেয়। এটা সাধারণত cookie-র bug
হিসেবে নয়, authentication-এর bug হিসেবে দেখা দেয়।

**❌ অভ্যাসবশে `Domain=example.com` দেওয়া।** এতে cookie ছড়িয়ে পড়ে প্রতিটি subdomain-এ, attacker যেটায় পা রাখতে পেরেছে
সেটাতেও। কোনো subdomain-এর সত্যিই cookie-টা না লাগলে `Domain` দেবেন না।

**❌ Cookie-কেই CSRF-এর পুরো সুরক্ষা ভাবা।** `SameSite=Lax` cross-site POST আটকায়, কিন্তু এটা browser-এর আচরণ। পুরনো
browser, বা attacker-এর দখলে থাকা same-site subdomain, এখনো ঢুকে পড়ে। Double-submit token দ্বিতীয় স্তর, বিকল্প নয়।

**❌ সম্মতির আগেই analytics load করে পরে জিজ্ঞেস করা।** আগে থেকে টিক দেওয়া box সম্মতি নয়, যে banner পেছনের script
আগেই চালিয়ে দিয়েছে সেটাও নয়।

## 🔑 মূল শিক্ষা

- Browser মিলে যাওয়া প্রতিটি request-এ নিজে থেকেই cookie জুড়ে দেয়। এজন্যই session-এ cookie কাজ করে, আবার এজন্যই
  CSRF সম্ভব।
- Session cookie-র জন্য সবচেয়ে জরুরি attribute `HttpOnly`, কারণ XSS একে হারাতে পারে না।
- বেশিরভাগ application-এর ঠিক উত্তর `SameSite=Lax`। Default-এ এটা খাটায় শুধু Chromium, তাই স্পষ্ট করে দিন।
  `Strict` email-এর link-এ click করার flow ভেঙে দেয়। `None`-এর জন্য `Secure` লাগে, আর এটা সুরক্ষা বন্ধ করে দেয়।
- Credential ভাগ করুন: refresh token `HttpOnly` cookie-তে, access token memory-তে। তাহলে XSS বড়জোর একটা অল্প
  মেয়াদের value পায়।
- সম্মতির আগে set করা যায় শুধু একেবারে অপরিহার্য cookie, আর আগে থেকে টিক দেওয়া box সম্মতি নয়।

## Interview-এর প্রশ্ন

**Q: `SameSite=Strict`, `Lax` আর `None` বুঝিয়ে বলুন।**

- **`Strict`**: যায় শুধু same-site request-এ। সবচেয়ে নিরাপদ, কিন্তু cross-site UX ভেঙে দেয়, কারণ email থেকে আসা link session বয়ে আনে না।
- **`Lax`**: same-site request, সঙ্গে top-level GET navigation। Chromium-এর default, আর সাধারণ app-এর জন্য ভালো ভারসাম্য।
- **`None`**: প্রতিটি request-এ যায়, cross-site iframe আর AJAX-সহ। Embed করা third-party flow-এর জন্য দরকার। সঙ্গে `Secure` দিতেই হবে।

**Q: Auth cookie-র জন্য `Secure`-এর চেয়ে `HttpOnly` কেন বেশি জরুরি?**

`HttpOnly` JavaScript-কে cookie পড়তে দেয় না। তাতে XSS দিয়ে token চুরি থামে, আর web-এ সবচেয়ে বেশি ঘটা attack হলো XSS। `Secure` শুধু network-এর পথে বসে থাকা attacker থেকে রক্ষা করে, যা HTTPS এমনিতেই অনেকটা মিটিয়ে দেয়। দুটিই চান, কিন্তু বড় লাভ `HttpOnly`-তে।

**Q: `SameSite` কীভাবে CSRF ঠেকায়?**

CSRF নির্ভর করে এর ওপর যে, attacker-এর পাতা আপনার site-এ request পাঠালে browser নিজে থেকেই user-এর session cookie পাঠিয়ে দেবে। `SameSite=Lax` cross-site POST, PUT আর DELETE আটকায়, আর CSRF থাকে ঠিক সেখানেই। Attacker-এর request cookie ছাড়াই আপনার server-এ পৌঁছায়। User-কে logged out দেখায়, আর কাজটা ব্যর্থ হয়।

**Q: JWT কেন `localStorage`-এ রাখবেন না?**

পাতার যেকোনো script `localStorage` পড়তে পারে। একটিমাত্র XSS, এমনকি দূষিত হয়ে যাওয়া কোনো npm dependency থেকে এলেও, token পড়ে বাইরে পাঠিয়ে দিতে পারে। HttpOnly cookie JavaScript-এর চোখে অদৃশ্য। সেই XSS তখনো আপনার API call করতে পারে, কারণ browser নিজে থেকেই cookie পাঠায়। কিন্তু দীর্ঘ মেয়াদের credential-টা নিজে **চুরি করতে পারে না**।

**Q: `app.example.com` আর `api.example.com` জুড়ে auth কীভাবে করবেন?**

Cookie set করুন `Domain=example.com` দিয়ে, যাতে দুটি subdomain-ই এটা পায়। `Secure` দিন, আর `SameSite=Lax`, বা cross-site flow না লাগলে `Strict`। API যদি পুরোপুরি আলাদা registrable domain-এ থাকে, তাহলে লাগবে `SameSite=None; Secure`, আর `credentials: "include"` সহ CORS।

## এরপর কী পড়বেন

- [Chapter ?? — Web Storage ও IndexedDB](#ch-storage-apis) — বিকল্পটা, আর এই তর্কে কেন সেটা হারে
- [Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) — জালিয়াতি ঠেকানোর server-এর দিকটা
- [Chapter ?? — Content Security Policy ও Security Header](#ch-content-security-policy) — বাকি header-গুলো, যা attack শুরুর
  আগেই পুরো এক শ্রেণির পথ বন্ধ করে দেয়
