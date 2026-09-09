---
title: XSS Prevention
part: 4
chapter: 0
slug: xss-prevention
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-09
tags: [frontend, security, xss, prevention]
in_book: true
---

# XSS Prevention {#ch-xss-prevention}

> Encode for the context you are writing into, and know exactly where your framework stops protecting you.

**In this chapter:** the three kinds of XSS · context-aware encoding · dangerous DOM sinks · sanitising rich HTML · where React's escaping ends · CSP as a backstop

## 💡 The Core Idea

**Cross-Site Scripting (XSS)** lets an attacker run their JavaScript in another user's browser. That script runs with the victim's session. It can steal cookies, read the page, make requests as the user, or change what they see.

The root cause is always the same: **untrusted data ends up in a place the browser treats as code.** Prevention is also one idea: keep data as data — never let it become markup or script.

## The Three Types of XSS

The difference is **where the payload comes from**, not what it does.

| Type             | Where the payload lives                       | Example trigger                          |
| ---------------- | --------------------------------------------- | ---------------------------------------- |
| **Reflected**    | In the request, echoed back in the response   | A crafted link in a phishing email       |
| **Stored**       | Saved in your database, served to many users  | A malicious blog comment                 |
| **DOM-based**    | Never reaches the server — pure client-side   | `innerHTML = location.hash`              |

Stored is the worst of the three. It runs for **every** visitor with no link to click, so one
`<img src=x onerror=...>` in a comment field reaches thousands of users.

## The Core Rule: Context-Aware Output Encoding

The same input is dangerous in different ways depending on **where** you put it. Encode for the **exact context** where the value lands.

| Context           | Example                          | What to do                          |
| ----------------- | -------------------------------- | ----------------------------------- |
| **HTML body**     | `<div>HERE</div>`                | HTML-entity encode `< > & " '`      |
| **HTML attribute**| `<a title="HERE">`               | Encode + always quote the attribute |
| **JavaScript**    | `<script>var x = "HERE"</script>`| JS-string escape, or use JSON       |
| **URL**           | `<a href="/s?q=HERE">`           | `encodeURIComponent`                |
| **CSS**           | `style="width: HERE"`            | Avoid user input in CSS entirely    |

> ⚠️ **Never write your own encoder.** HTML entity encoding turns `<script>` into
> `&lt;script&gt;`, and every framework and template engine already does it correctly for the HTML
> body context. A hand-rolled `replace()` chain will miss a context and be trusted anyway.

### Special case: data inside inline `<script>` (SSR)

When you serialise state into the page for hydration, an attacker can break out of the string with `</script>`. Escape the unsafe characters in the JSON.

```typescript
// ✅ Safe: neutralise <, >, & before embedding JSON in HTML
function safeJson(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}

const html = `<script>window.__STATE__ = ${safeJson(state)};</script>`;
```

## DOM-based XSS and Dangerous Sinks

Here the bug is entirely in your JavaScript. You read from an attacker-controlled **source** and write to a dangerous **sink**.

```typescript
// ❌ Source: URL param  →  Sink: innerHTML
const name: string =
  new URLSearchParams(location.search).get("name") ?? "";

document.querySelector("#hello")!.innerHTML = `Hi, ${name}!`;
// ?name=<img src=x onerror=alert(1)> → script runs
```

**Common sinks to avoid with untrusted data:**

```typescript
el.innerHTML = data;       // HTML injection
el.outerHTML = data;       // HTML injection
el.insertAdjacentHTML("beforeend", data);
document.write(data);      // HTML injection
eval(data);                // code execution
new Function(data);        // code execution
setTimeout(data, 0);       // code execution if data is a string
location.href = data;      // javascript: URLs
```

### ✅ Fix: use safe sinks

```typescript
const el = document.querySelector("#hello")!;

// textContent treats input as text, never as HTML
el.textContent = `Hi, ${name}!`;

// Building nodes is also safe
const div = document.createElement("div");
div.textContent = name; // cannot inject markup
```

> `innerHTML` parses HTML. `textContent` does not. If you do not need HTML, never reach for
> `innerHTML`.

## Sanitising Rich HTML with DOMPurify

Sometimes you **must** render HTML you didn't write — a rich-text editor, a CMS body, markdown output. Encoding would break the formatting. You need **sanitisation**: parse the HTML and strip anything dangerous.

`DOMPurify` is the standard. It removes `<script>`, event handlers like `onerror`, and `javascript:` URLs.

```typescript
import DOMPurify from "dompurify";

const dirty = '<img src=x onerror=alert(1)><p>Hello</p>';
const clean: string = DOMPurify.sanitize(dirty);
// → '<img src="x"><p>Hello</p>'  (onerror stripped)
```

**Allowlist what you actually need** — smaller surface, safer output:

```typescript
const clean: string = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
```

> ⚠️ **Sanitise on output, at render time** — not just on input. Sanitising only on save can be bypassed if data enters your DB another way (imports, other endpoints, old rows).

## How React Protects You (and Where It Doesn't)

React escapes any value rendered as JSX text. This covers most XSS for free.

```typescript
function Greeting({ name }: { name: string }) {
  // Safe: React escapes `name` automatically
  return <h1>Hello, {name}!</h1>;
}
// name = "<script>alert(1)</script>" → rendered as harmless text
```

### The escape hatches that React does **not** protect

```typescript
import DOMPurify from "dompurify";

// 1. dangerouslySetInnerHTML — bypasses escaping. Always sanitise first.
function Article({ html }: { html: string }) {
  const clean = DOMPurify.sanitize(html);
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// 2. javascript: URLs in href/src
function SafeLink({ url, children }: { url: string; children: React.ReactNode }) {
  const safe = /^https?:\/\//i.test(url) ? url : "#";
  return <a href={safe}>{children}</a>;
}
```

**React's three blind spots:**

- ❌ `dangerouslySetInnerHTML` without sanitisation
- ❌ `href` / `src` set to a `javascript:` URL
- ❌ Spreading unknown props onto an element (`{...userControlled}`)

## Defence in Depth: CSP, Trusted Types, HttpOnly

Encoding and sanitisation are your first line. These add backup layers so a single mistake isn't fatal.

**Content Security Policy** — blocks injected scripts from running at all. See [Chapter ?? — Content Security Policy](#ch-content-security-policy).

```typescript
res.setHeader(
  "Content-Security-Policy",
  "default-src 'self'; script-src 'self'; object-src 'none'",
);
// An injected <script>alert(1)</script> is blocked even if it lands in the DOM
```

**Trusted Types** — enforced with `require-trusted-types-for 'script'`, this makes sinks like
`innerHTML` reject plain strings. Assignment throws unless the value came from a policy you registered
with `trustedTypes.createPolicy`, which forces every sanitiser call through one chokepoint. Chromium
only, as of 2026.

**HttpOnly cookies** — a session cookie set with `httpOnly`, `secure` and `sameSite: "strict"` is
invisible to `document.cookie`. Injected script still runs, but it cannot read the session token.

> **Layered thinking:** Encode/sanitise so injection can't happen → CSP so injected code can't run → HttpOnly so a successful script can't grab the session.

## 🔑 Key Takeaways

- XSS is a failure to keep data as data: the fix is context-aware encoding at the point of output, not filtering at the point of input.
- `textContent` is safe, `innerHTML` is not, and the dangerous sinks are a short, learnable list.
- React escapes interpolated values, but `dangerouslySetInnerHTML`, `href`/`src` and injected `<script>` JSON are all outside that guarantee.
- Sanitise unavoidable HTML with DOMPurify at render time, never with a hand-written regex.
- CSP, `HttpOnly` cookies and Trusted Types are the layer that limits the damage when encoding is missed once.

## Interview Questions

**Q: Encoding vs. sanitisation — when do you use each?**

- **Encoding** turns special characters into safe text (`<` → `&lt;`). Use it for plain text you display — names, comments, search terms.
- **Sanitisation** parses HTML and removes dangerous parts. Use it only when you must render real HTML — rich-text or CMS content.

**Q: How does React prevent XSS, and where does it fall short?**

React escapes all JSX text by default. It does **not** protect `dangerouslySetInnerHTML`, `javascript:` URLs in `href`/`src`, or spread props. Sanitise HTML with DOMPurify and validate URLs before using them.

**Q: What is DOM-based XSS and why is it harder to catch?**

It happens when client JS reads an attacker-controlled source (URL, `postMessage`, `localStorage`) and writes it to a dangerous sink (`innerHTML`, `eval`). The payload never reaches the server, so server-side scanners and WAFs never see it. Fix it by using `textContent` and avoiding dangerous sinks.

**Q: Does CSP replace output encoding?**

No. CSP is a **second** layer. Encoding stops injection; CSP stops injected code from running if encoding is missed somewhere. Use both — defense in depth.

## What to Read Next

- [Chapter ?? — Content Security Policy](#ch-content-security-policy) — the layer that limits a successful injection
- [Chapter ?? — Client-Side Input Handling](#ch-client-side-input-handling) — the other browser-side trust boundaries
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — where the stored variant is actually stopped
