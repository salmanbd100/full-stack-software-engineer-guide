---
sourceHash: "8feb8b734218de3f9ca53bd0eb1676e1e9a856eeae46d24eab243abb779074e0"
title: "XSS প্রতিরোধ ও অবিশ্বস্ত Input"
translatedAt: "2026-10-17T14:00:08.493Z"
model: "claude-opus-5-5 (Claude Code)"
---

# XSS প্রতিরোধ ও অবিশ্বস্ত Input {#ch-xss-prevention}

> ঠিক কোন জায়গায় একটি অবিশ্বস্ত string markup, URL, script বা style হয়ে যায়, সেটা খুঁজে বের করুন। তারপর নিশ্চিত করুন, সেখানে string-টা data হয়েই থাকে।

**এই অধ্যায়ে:** XSS-এর তিন ধরন · যে চার জায়গায় string code হয়ে যায় · rich HTML sanitise করা, আর React কোথায় থামে · যে input শুধু browser দেখে · client-এর check বনাম আসল control

## 💡 মূল ধারণা

**Cross-Site Scripting (XSS)** দিয়ে attacker অন্য user-এর browser-এ নিজের JavaScript চালাতে পারে। Script-টা চলে
ভুক্তভোগীর session নিয়ে। তাই page পড়তে পারে, user সেজে request পাঠাতে পারে, বা user যা দেখছেন তা বদলে দিতে পারে।

মূল কারণ সবসময় একই। **একটি অবিশ্বস্ত string data থেকে বেরিয়ে এমন কিছুতে ঢুকে পড়ে, যা browser interpret করে**:
markup, URL, script বা style। প্রতিরোধ মানে প্রতিটি এমন জায়গায় একটিই প্রশ্ন করা: _এখানে browser এই string দিয়ে কী
করবে?_ String-টা কোথা থেকে এল, তার চেয়ে অনেক বেশি জরুরি সেটা গিয়ে পড়ছে কোথায়।

## কীভাবে কাজ করে

### তিন ধরন

| ধরন          | Payload কোথায় থাকে                      | কীভাবে চালু হয়, উদাহরণ                    |
| ------------- | -------------------------------------------- | ---------------------------------- |
| **Reflected** | Request-এ, response-এ আবার ফিরে আসে  | Phishing email-এ বানানো একটি link |
| **Stored**    | আপনার database-এ জমা থাকে, অনেক user-এর কাছে যায় | ক্ষতিকর একটি blog comment           |
| **DOM-based** | কখনো server-এ পৌঁছায় না                     | `innerHTML = location.hash`        |

Stored XSS প্রতিটি visitor-এর জন্য চলে, কাউকে কোনো link-এ click করতে হয় না। DOM-based ধরা সবচেয়ে কঠিন: payload কখনো
server log বা WAF (web application firewall)-এ দেখা দেয় না।

### চারটি সীমানা

**প্রতিটি সীমানার জন্য আলাদা প্রতিরক্ষা লাগে, কারণ প্রতিটি parse করে browser-এর আলাদা একটি অংশ।**

| সীমানা   | নিরাপদ default                            | এড়ানো না গেলে               |
| ---------- | --------------------------------------- | -------------------------------------- |
| **Markup** | `textContent`, JSX text                 | DOMPurify দিয়ে sanitise করুন                |
| **URL**    | `encodeURIComponent` দিয়ে বানান         | Scheme allowlist করুন, অথবা শুধু path নিন  |
| **Script** | String থেকে কখনো code বানাবেন না           | Embed করা JSON-এ `<`, `>`, `&` escape করুন  |
| **Style**  | User input CSS থেকে দূরে রাখুন              | Class name-এর একটি নির্দিষ্ট set-এ map করুন      |

## যেখানে String Markup হয়ে যায়

Bug শুরু হয় এমন একটি **source** থেকে, যা attacker-এর হাতে। সেখান থেকে string গিয়ে পড়ে একটি **sink**-এ, মানে এমন
API-তে, যা HTML parse করে: `innerHTML`, `outerHTML`, `insertAdjacentHTML` বা `document.write`।

**চিরাচরিত DOM-based bug, আর তার fix:**

```typescript
const name: string = new URLSearchParams(location.search).get("name") ?? "";
const el = document.querySelector("#hello")!;
el.innerHTML = `Hi, ${name}!`; // ❌ ?name=<img src=x onerror=alert(1)> runs
el.textContent = `Hi, ${name}!`; // ✅ treated as text, never parsed
```

### যে rich HTML আপনি লেখেননি

CMS-এর body HTML হিসেবেই render হতে হবে, তাই encode করলে সেটা ভেঙে যাবে। এখানে লাগে **sanitisation**: HTML parse
করে, যা কিছু চলতে পারে, সব ফেলে দেওয়া। এর standard হলো DOMPurify। Upload করা SVG-ও এই দলে পড়ে, কারণ SVG-র ভেতরে
script থাকতে পারে। Upload করা file দেখান `<img>` দিয়ে, কখনো text হিসেবে পড়ে DOM-এ বসিয়ে নয়।

**Allowlist দিয়ে sanitise করুন:**

```typescript
import DOMPurify from "dompurify";

const clean: string = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
// <img src=x onerror=alert(1)> loses its onerror; <script> is removed
```

> ⚠️ **শুধু save-এর সময় নয়, render-এর সময়েও sanitise করুন।** Import, অন্য endpoint আর পুরনো row দিয়েও data আপনার
> database-এ ঢোকে। সব data দেখতে পায় শুধু render-এর পথ।

### React কোথায় আর রক্ষা করে না

JSX text হিসেবে render হওয়া প্রতিটি value React escape করে। এতে markup-এর বেশিরভাগ সীমানা ঢাকা পড়ে, কিন্তু এগুলো নয়।

**ফাঁকফোকরগুলো:**

```tsx
import DOMPurify from "dompurify";

function Article({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(html) }} />;
}

function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  const safe: string = /^https?:\/\//i.test(url) ? url : "#";
  return <a href={safe}>{children}</a>;
}
```

`dangerouslySetInnerHTML` escaping এড়িয়ে যায়, তাই আগে sanitise করুন। User input থেকে আসা URL-এর scheme allowlist
করতে হবে। তৃতীয় অন্ধ জায়গা হলো অজানা props spread করা (`{...userControlled}`)। এতে attribute কোনটা হবে, তা
attacker-ই ঠিক করে দিতে পারে।

## যেখানে String URL বা Script হয়ে যায়

**URL।** `href` বা `location`-এ `javascript:` URL মানেই code। Query string থেকে আসা পুরো URL হলো **open
redirect**। আপনার domain তখন একটি phishing page-কে নিজের নাম ধার দেয়। Link filter-ও এটা পার হতে দেয়, কারণ প্রথম
hop সত্যিই আপনার site।

**URL নয়, path নিন:**

```typescript
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

location.href = safeNext(new URLSearchParams(location.search).get("next"));
```

`//evil.com` protocol-relative, তাই এটাও বাতিল হয়। অন্য origin লাগলে hostname-এর একটি allowlist রাখুন।

**Script।** `eval`, `new Function` আর string দেওয়া `setTimeout` data-কে code বানিয়ে দেয়, তাই এগুলোতে string
দেবেন না। সূক্ষ্ম ঘটনাটা হলো hydration-এর জন্য page-এর ভেতরে serialise করা state। JSON string-এর ভেতর থেকেই
attacker `</script>` দিয়ে tag বন্ধ করে দিতে পারে।

**HTML-এ embed করার আগে JSON escape করুন:**

```typescript
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&]/g, (c: string) => `\\u00${c.charCodeAt(0).toString(16)}`);
}

const html: string = `<script>window.__STATE__ = ${safeJson(state)};</script>`;
```

## যে Input শুধু Browser দেখে

Iframe থেকে আসা `postMessage` বা `location.hash`-এর value কখনো আপনার server-এ পৌঁছায় না। Review করার মতো কোনো
server handler নেই, তাই check হতে পারে একমাত্র browser-এ।

**`postMessage` handler-এ দুটি check লাগে:**

```typescript
window.addEventListener("message", (event: MessageEvent) => {
  if (event.origin !== "https://widgets.example.com") return; // 1. exact sender
  // 2. exact shape — the sender is not your code
  const parsed = widgetMessageSchema.safeParse(event.data);
  if (!parsed.success) return;
  applyWidgetUpdate(parsed.data);
});
```

Origin মেলান হুবহু একটি string-এর সঙ্গে: `includes("example.com")` লিখলে `example.com.attacker.net`-ও পার পেয়ে যায়।
পাঠানোর সময় target origin-এর নাম দিন। `postMessage(data, "*")` চলে যায় frame-টা যে page-এর ভেতরে আছে, সেই page-এ,
সেটা যা-ই হোক।

## Client-এর Check বনাম আসল Control

Browser-এ validation হলো user experience-এর ব্যাপার। যে কেউ `curl` দিয়ে API call করতে পারে। তাই নিয়ম enforce করে
server, আর client শুধু দ্রুত feedback দেয়।

**Form আর endpoint-এর জন্য একটিই schema:**

```typescript
import { z } from "zod";

export const contactSchema = z.object({
  email: z.email(),
  message: z.string().min(10).max(2000),
});

const parsed = contactSchema.safeParse(req.body); // on the server, this is the gate
if (!parsed.success) res.status(400).json(parsed.error.issues);
```

Form তার resolver দিয়ে একই schema ব্যবহার করে, তাই দুই দিকের সীমা আলাদা হয়ে যেতে পারে না। File-এর check-ও একইভাবে
কাজ করে। `file.type` extension দেখে করা একটি অনুমান মাত্র, তাই size আর magic bytes server-কে তবু check করতে হয়।

## কখন ব্যবহার করবেন

| অবিশ্বস্ত input                               | বেছে নিন                         | কেন                                     |
| --------------------------------------- | ------------------------------ | --------------------------------------- |
| CMS বা editor থেকে আসা আসল HTML          | Allowlist দিয়ে sanitise করা   | Encode করলে markup নষ্ট হয়ে যাবে       |
| URL বা redirect-এর target                | Scheme allowlist, অথবা শুধু path | Encoding `javascript:` থামায় না    |
| Page-এর ভেতরে পড়া message বা fragment  | হুবহু origin check আর একটি schema | কোনো server এটা কখনো দেখবে না             |

**পেছনের সুরক্ষার স্তর।** **Content Security Policy** inject করা script চলতে দেয় না। **Trusted Types** থাকলে
`innerHTML` সাধারণ string নেয় না, তাই প্রতিটি sanitiser call একটি policy দিয়েই যায় (2026 পর্যন্ত শুধু Chromium-এ)।
আর session cookie **`HttpOnly`** হলে, কোনো script চলে গেলেও token পড়তে পারে না।

## সাধারণ ভুল

❌ **ঢোকার সময় input filter করা, আর বেরোনোর সময় সেটাকে বিশ্বাস করা।**
✅ যেখানে string ব্যবহার হচ্ছে, সেখানেই encode বা sanitise করুন। Context জানে শুধু সেই জায়গাটাই।

❌ **Iframe আপনার নিজের, তাই `event.data`-কে বিশ্বাস করা।** যে কেউ আপনার page frame করে তাতে post করতে পারে।
✅ হুবহু origin check করুন, তারপর payload-টা একটি schema দিয়ে parse করুন।

## 🔑 মূল শিক্ষা

- অবিশ্বস্ত string যেখানে markup, URL, script বা style-এ ঢুকে পড়ে, XSS সেখানেই হয়। আর প্রতিটি সীমানার জন্য আলাদা প্রতিরক্ষা লাগে।
- `textContent` আর JSX text নিরাপদ। `innerHTML`, `dangerouslySetInnerHTML`, `javascript:` URL আর spread করা props নিরাপদ নয়।
- যে HTML এড়ানো যায় না, তা render-এর সময় DOMPurify দিয়ে sanitise করুন। আর যেকোনো redirect-এ পুরো URL নয়, path নিন।
- `postMessage`-এর payload আর URL fragment কখনো server-এ পৌঁছায় না, তাই হুবহু origin আর data-র shape browser-কেই check করতে হবে।
- Client-এর validation হলো user experience। একটিই schema share করুন, যাতে server-এর check, মানে আসল control, এর থেকে সরে যেতে না পারে।

## Interview-এর প্রশ্ন

**Q: Encoding নাকি sanitisation — কোনটা কখন ব্যবহার করবেন?**

Encoding বিশেষ character-গুলোকে text বানিয়ে দেয় (`<` হয়ে যায় `&lt;`)। Plain text হিসেবে যা দেখানো হয়, তার জন্য
এটাই। Sanitisation HTML parse করে, আর যা চলতে পারে তা সরিয়ে দেয়। এটা ব্যবহার করুন শুধু আসল HTML-এর জন্য, যেমন CMS-এর
content, আর allowlist দিয়ে।

**Q: React কীভাবে XSS আটকায়, আর কোথায় ঘাটতি থেকে যায়?**

JSX text হিসেবে render হওয়া প্রতিটি value React escape করে। কিন্তু `dangerouslySetInnerHTML`, `href` বা `src`-এ
user-এর দেওয়া URL, কিংবা spread করা props-কে রক্ষা করে না। সমাধান: sanitise করুন, scheme allowlist করুন, আর যা
আপনি নিজে বানাননি, তা কখনো spread করবেন না।

**Q: একজন সহকর্মী একটি analytics widget-এর জন্য `postMessage` listener যোগ করেছেন। Review-এ কী দেখবেন?**

`event.data` ছোঁয়ার আগে handler `event.origin`-কে হুবহু একটি origin-এর সঙ্গে মেলাচ্ছে কি না। Payload destructure
না করে একটি schema দিয়ে parse করা হচ্ছে কি না। আর পাঠানোর দিকে `postMessage(data, "*")` ব্যবহার হচ্ছে না তো,
কারণ সেটা frame-টা যে page-এই থাকুক, তার কাছেই broadcast করে।

**Q: আপনার team প্রতিটি `innerHTML` ঠিক না করে CSP-র ওপর ভরসা করতে চায়। আপনি কি একমত হবেন?**

না। CSP হলো দ্বিতীয় স্তর। কোথাও encoding ফসকে গেলে inject করা code চলতে দেয় না, কিন্তু `'unsafe-inline'` বা
ঢালাও allowlist দিয়ে একে দুর্বল করে ফেলা সহজ। আগে sink-গুলো ঠিক করুন, তারপর CSP আর Trusted Types যোগ করুন, যাতে
একটি ভুলই সর্বনাশ ডেকে না আনে।

## এরপর কী পড়বেন

- [Chapter ?? — Content Security Policy ও Security Header](#ch-content-security-policy) — যে স্তর সফল injection-এর ক্ষতি সীমিত রাখে
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — shared schema-র server-এর দিক, যেখানে stored XSS থামানো হয়
- [Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) — `HttpOnly` cookie কেন সফল injection-এর ক্ষতি কমায়, আর অন্য cross-origin boundary-টি
