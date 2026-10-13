---
sourceHash: "8feb8b734218de3f9ca53bd0eb1676e1e9a856eeae46d24eab243abb779074e0"
title: "XSS প্রতিরোধ ও অবিশ্বস্ত Input"
translatedAt: "2026-10-12T12:14:54.202Z"
model: "claude-opus-5-5 (Claude Code)"
---

# XSS প্রতিরোধ ও অবিশ্বস্ত Input {#ch-xss-prevention}

> ঠিক সেই জায়গাটা খুঁজে বের করুন, যেখানে একটি অবিশ্বস্ত string markup, URL, script বা style হয়ে যায়, আর সেখানে তাকে data হিসেবেই রাখুন।

**এই অধ্যায়ে:** তিন ধরনের XSS · যে চার জায়গায় একটি string code হয়ে যায় · rich HTML sanitise করা আর React কোথায় থামে · যে input শুধু browser দেখে · client check বনাম আসল control

## 💡 মূল ধারণা

**Cross-Site Scripting (XSS)** একজন attacker-কে অন্য একজন user-এর browser-এ নিজের JavaScript চালাতে দেয়। Script-টি
চলে victim-এর session নিয়ে। এটা page পড়তে পারে, user হয়ে request পাঠাতে পারে, বা user যা দেখেন তা বদলে দিতে পারে।

মূল কারণ সবসময় একই। **একটি অবিশ্বস্ত string data থেকে পার হয়ে এমন কিছুতে ঢোকে, যেটা browser interpret করে**:
markup, একটি URL, একটি script, বা একটি style। প্রতিরোধ মানে প্রতিটি পারাপারে একটি প্রশ্ন করা: _এখানে browser এই
string দিয়ে কী করে?_ String-টি কোথা থেকে এসেছে, তার চেয়ে বেশি গুরুত্বপূর্ণ সেটা কোথায় গিয়ে পড়ে।

## কীভাবে কাজ করে

### তিনটি ধরন

| ধরন          | Payload কোথায় থাকে                      | উদাহরণ trigger                    |
| ------------- | -------------------------------------------- | ---------------------------------- |
| **Reflected** | Request-এ, response-এ আবার ফেরত আসে  | Phishing email-এ বানানো একটি link |
| **Stored**    | আপনার database-এ save করা, অনেক user-কে serve করা | একটি ক্ষতিকর blog comment           |
| **DOM-based** | কখনো server-এ পৌঁছায় না                     | `innerHTML = location.hash`        |

Stored প্রতিটি visitor-এর জন্য চলে, কোনো link-এ click করতে হয় না। DOM-based ধরা সবচেয়ে কঠিন: payload কখনো
server log-এ বা WAF (web application firewall)-এ দেখা যায় না।

### চারটি পারাপার

**প্রতিটি পারাপারের নিজস্ব defence লাগে, কারণ browser-এর আলাদা আলাদা অংশ প্রতিটিকে parse করে।**

| পারাপার   | নিরাপদ default                            | যখন এড়ানো যায় না               |
| ---------- | --------------------------------------- | -------------------------------------- |
| **Markup** | `textContent`, JSX text                 | DOMPurify দিয়ে sanitise করুন                |
| **URL**    | `encodeURIComponent` দিয়ে বানান         | Scheme allowlist করুন, বা শুধু path নিন  |
| **Script** | String থেকে কখনো code বানাবেন না           | Embed করা JSON-এ `<`, `>`, `&` escape করুন  |
| **Style**  | User input CSS-এর বাইরে রাখুন              | একটি নির্দিষ্ট class name-এর set-এ map করুন      |

## যেখানে একটি String Markup হয়ে যায়

Bug শুরু হয় এমন একটি **source** থেকে, যেটা attacker নিয়ন্ত্রণ করে। এটা গিয়ে পড়ে একটি **sink**-এ, অর্থাৎ এমন একটি
API, যেটা HTML parse করে: `innerHTML`, `outerHTML`, `insertAdjacentHTML` বা `document.write`।

**ক্লাসিক DOM-based bug, আর তার সমাধান:**

```typescript
const name: string = new URLSearchParams(location.search).get("name") ?? "";
const el = document.querySelector("#hello")!;
el.innerHTML = `Hi, ${name}!`; // ❌ ?name=<img src=x onerror=alert(1)> runs
el.textContent = `Hi, ${name}!`; // ✅ treated as text, never parsed
```

### যে rich HTML আপনি লেখেননি

একটি CMS body-কে HTML হিসেবেই render হতে হবে, তাই encoding একে ভেঙে ফেলবে। আপনার লাগবে **sanitisation**: HTML
parse করে, যা কিছু চলতে পারে তা ফেলে দেওয়া। DOMPurify-ই standard। Upload করা SVG-ও এখানে পড়ে, কারণ একটি SVG
script বহন করতে পারে। Upload দেখান `<img>` দিয়ে, কখনো DOM-এ text হিসেবে পড়ে নয়।

**একটি allowlist দিয়ে sanitise করুন:**

```typescript
import DOMPurify from "dompurify";

const clean: string = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
// <img src=x onerror=alert(1)> loses its onerror; <script> is removed
```

> ⚠️ **শুধু save-এর সময় নয়, render-এর সময় sanitise করুন।** Data আপনার database-এ পৌঁছায় import, অন্য endpoint
> আর পুরনো row-এর মধ্য দিয়ে। শুধু render path-ই সবটা দেখে।

### React কোথায় আপনাকে রক্ষা করা বন্ধ করে

JSX text হিসেবে render হওয়া প্রতিটি value React escape করে। এতে বেশিরভাগ markup পারাপার cover হয়, কিন্তু এগুলো নয়।

**Escape hatch-গুলো:**

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

`dangerouslySetInnerHTML` escaping এড়িয়ে যায়, তাই আগে sanitise করুন। User input থেকে আসা একটি URL-এর scheme
allowlist করতে হবে। তৃতীয় অন্ধ জায়গা হলো অজানা props spread করা (`{...userControlled}`), যাতে attacker
attribute বেছে নিতে পারে।

## যেখানে একটি String URL বা Script হয়ে যায়

**URL।** `href` বা `location`-এ একটি `javascript:` URL আসলে code। Query string থেকে নেওয়া একটি পূর্ণ URL হলো একটি
**open redirect**। আপনার domain একটি phishing page-কে নিজের নাম ধার দেয়। Link filter এটা পার করে দেয়, কারণ প্রথম
hop সত্যিই আপনার site।

**URL নয়, একটি path নিন:**

```typescript
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

location.href = safeNext(new URLSearchParams(location.search).get("next"));
```

`//evil.com` protocol-relative, তাই এটাও reject হয়। অন্য origin লাগলে hostname-এর একটি allowlist রাখুন।

**Script।** String দিয়ে `eval`, `new Function` আর `setTimeout` data-কে code-এ পরিণত করে, তাই string এগুলো থেকে দূরে
রাখুন। সূক্ষ্ম ক্ষেত্রটা হলো hydration-এর জন্য page-এ serialise করা state। একজন attacker একটি JSON string-এর ভেতর
থেকে `</script>` দিয়ে tag বন্ধ করে দিতে পারে।

**HTML-এ embed করার আগে JSON escape করুন:**

```typescript
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&]/g, (c: string) => `\\u00${c.charCodeAt(0).toString(16)}`);
}

const html: string = `<script>window.__STATE__ = ${safeJson(state)};</script>`;
```

## যে Input শুধু Browser দেখে

একটি iframe থেকে আসা `postMessage` বা `location.hash`-এর একটি value কখনো আপনার server-এ পৌঁছায় না। Review করার মতো
কোনো server handler নেই, তাই check হতে পারে একমাত্র browser-এই।

**একটি `postMessage` handler-এর দুটি check লাগে:**

```typescript
window.addEventListener("message", (event: MessageEvent) => {
  if (event.origin !== "https://widgets.example.com") return; // 1. exact sender
  // 2. exact shape — the sender is not your code
  const parsed = widgetMessageSchema.safeParse(event.data);
  if (!parsed.success) return;
  applyWidgetUpdate(parsed.data);
});
```

Origin-কে একটি হুবহু string-এর সাথে তুলনা করুন: `includes("example.com")` পার হয়ে যায় `example.com.attacker.net`-এর
জন্যও। পাঠানোর সময় target origin-এর নাম দিন। `postMessage(data, "*")` চলে যায় যে page frame-টি ধরে আছে, তার কাছে।

## Client Check বনাম আসল Control

Browser-এ validation হলো user experience। যে কেউ `curl` দিয়ে API call করতে পারে, তাই server enforce করে, আর client
শুধু দ্রুত feedback দেয়।

**Form আর endpoint-এর জন্য একটি schema:**

```typescript
import { z } from "zod";

export const contactSchema = z.object({
  email: z.email(),
  message: z.string().min(10).max(2000),
});

const parsed = contactSchema.safeParse(req.body); // on the server, this is the gate
if (!parsed.success) res.status(400).json(parsed.error.issues);
```

Form তার resolver-এর মধ্য দিয়ে একই schema ব্যবহার করে, তাই limit-গুলো আলাদা হয়ে যেতে পারে না। File check-ও একইভাবে
কাজ করে। `file.type` extension দেখে করা একটি অনুমান, তাই server তবুও size আর magic byte check করে।

## কখন ব্যবহার করবেন

| অবিশ্বস্ত input                               | বেছে নিন                         | কেন                                     |
| --------------------------------------- | ------------------------------ | --------------------------------------- |
| CMS বা editor থেকে আসল HTML          | Allowlist দিয়ে sanitise করা   | Encoding markup নষ্ট করে দেবে       |
| একটি URL বা redirect target                | Scheme allowlist, বা শুধু path | Encoding `javascript:` থামায় না    |
| Page-এ পড়া একটি message বা fragment  | হুবহু origin check আর একটি schema | কোনো server এটা কখনো দেখবে না             |

**Backstop layer-গুলো।** একটি **Content Security Policy** inject করা script চলতে দেয় না। **Trusted Types**
`innerHTML`-কে সাধারণ string reject করায়, তাই প্রতিটি sanitiser call একটি policy-র মধ্য দিয়ে যায় (2026 পর্যন্ত শুধু
Chromium-এ)। একটি **`HttpOnly`** session cookie মানে, যে script চলেও যায়, সে token পড়তে পারে না।

## সাধারণ ভুল

❌ **ঢোকার সময় input filter করা, আর বেরোনোর সময় তাকে বিশ্বাস করা।**
✅ যেখানে string ব্যবহার হয়, সেখানে encode বা sanitise করুন। শুধু সেই জায়গাটাই context জানে।

❌ **iframe-টি আপনার, তাই `event.data`-কে বিশ্বাস করা।** যে কেউ আপনার page frame করে তাতে post করতে পারে।
✅ হুবহু origin check করুন, তারপর payload একটি schema-র বিপরীতে parse করুন।

## 🔑 মূল শিক্ষা

- XSS ঘটে যেখানে একটি অবিশ্বস্ত string পার হয়ে markup, URL, script বা style-এ ঢোকে, আর প্রতিটি পারাপারের নিজস্ব defence লাগে।
- `textContent` আর JSX text নিরাপদ। `innerHTML`, `dangerouslySetInnerHTML`, `javascript:` URL আর spread props নয়।
- এড়ানো যায় না এমন HTML render-এর সময় DOMPurify দিয়ে sanitise করুন, আর যেকোনো redirect-এর জন্য পূর্ণ URL নয়, একটি path নিন।
- `postMessage` payload আর URL fragment কখনো server-এ পৌঁছায় না, তাই browser-কেই হুবহু origin আর shape check করতে হবে।
- Client validation হলো user experience। একটি schema share করুন, যাতে server-এর check — আসল control — এর থেকে আলাদা হয়ে না যায়।

## Interview-এর প্রশ্ন

**Q: Encoding নাকি sanitisation — কখন কোনটা ব্যবহার করবেন?**

Encoding বিশেষ character-কে text-এ পরিণত করে (`<` হয়ে যায় `&lt;`)। Plain text হিসেবে দেখানো যেকোনো কিছুর জন্য এটা
ব্যবহার করুন। Sanitisation HTML parse করে, আর যা চলতে পারে তা সরিয়ে দেয়। এটা শুধু আসল HTML-এর জন্য ব্যবহার করুন,
যেমন CMS content, একটি allowlist সহ।

**Q: React কীভাবে XSS প্রতিরোধ করে, আর কোথায় এটা যথেষ্ট নয়?**

JSX text হিসেবে render হওয়া প্রতিটি value React escape করে। এটা `dangerouslySetInnerHTML`, `href` বা `src`-এ user-এর
URL, বা spread props রক্ষা করে না। সমাধান: sanitise করুন, scheme allowlist করুন, আর যা আপনি বানাননি তা কখনো spread
করবেন না।

**Q: একজন সহকর্মী একটি analytics widget-এর জন্য একটি `postMessage` listener যোগ করেছেন। Review-তে আপনি কী check করবেন?**

`event.data` ছোঁয়ার আগে handler `event.origin`-কে একটি হুবহু origin-এর সাথে তুলনা করে কি না। Payload destructure
না করে একটি schema-র বিপরীতে parse করা হয় কি না। আর পাঠানোর দিক `postMessage(data, "*")` ব্যবহার করে না তো, যেটা
frame ধরে থাকা যেকোনো page-এ broadcast করে।

**Q: আপনার team প্রতিটি `innerHTML` ঠিক না করে CSP-র ওপর ভরসা করতে চায়। আপনি কি রাজি হবেন?**

না। CSP হলো দ্বিতীয় layer। একটি encoding ফসকে গেলে এটা inject করা code চলতে দেয় না, কিন্তু `'unsafe-inline'` বা
একটি বড় allowlist দিয়ে একে সহজেই দুর্বল করা যায়। Sink-গুলো ঠিক করুন, তারপর CSP আর Trusted Types যোগ করুন, যাতে
একটি ভুলই মারাত্মক না হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Content Security Policy ও Security Header](#ch-content-security-policy) — যে layer একটি সফল injection-এর ক্ষতি সীমিত করে
- [Chapter ?? — Input Validation ও Injection](#ch-backend-input-validation) — shared schema-র server-এর অর্ধেক, যেখানে stored XSS থামানো হয়
- [Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) — কেন একটি `HttpOnly` cookie একটি সফল injection-এর ক্ষতি সীমিত করে, আর অন্য cross-origin boundary-টি
