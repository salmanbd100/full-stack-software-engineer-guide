---
title: XSS Prevention and Untrusted Input
part: 4
chapter: 12
slug: xss-prevention
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-24
tags: [frontend, security, xss, prevention, input, validation, postmessage]
in_book: true
---

# XSS Prevention and Untrusted Input {#ch-xss-prevention}

> Find the exact point where an untrusted string becomes markup, a URL, a script or a style, and make it stay data there.

**In this chapter:** the three kinds of XSS · the four places a string turns into code · sanitising rich HTML and where React stops · the inputs only the browser sees · client checks versus the real control

## 💡 The Core Idea

**Cross-Site Scripting (XSS)** lets an attacker run their JavaScript in another user's browser. The script
runs with the victim's session. It can read the page, send requests as the user, or change what they see.

The root cause is always the same. **An untrusted string crosses from data into something the browser
interprets** — markup, a URL, a script, or a style. Prevention is one question asked at each crossing:
_what does the browser do with this string here?_ Where the string came from matters less than where
it lands.

## How It Works

### The three types

| Type          | Where the payload lives                      | Example trigger                    |
| ------------- | -------------------------------------------- | ---------------------------------- |
| **Reflected** | In the request, echoed back in the response  | A crafted link in a phishing email |
| **Stored**    | Saved in your database, served to many users | A malicious blog comment           |
| **DOM-based** | Never reaches the server                     | `innerHTML = location.hash`        |

Stored runs for every visitor with no link to click. DOM-based is the hardest to catch: the payload
never appears in a server log or a WAF.

### The four crossings

**Each crossing needs its own defence, because each is parsed by a different part of the browser.**

| Crossing   | Safe default                            | When you cannot avoid it               |
| ---------- | --------------------------------------- | -------------------------------------- |
| **Markup** | `textContent`, JSX text                 | Sanitise with DOMPurify                |
| **URL**    | Build with `encodeURIComponent`         | Allowlist the scheme or accept a path  |
| **Script** | Never build code from strings           | Escape `<`, `>`, `&` in embedded JSON  |
| **Style**  | Keep user input out of CSS              | Map to a fixed set of class names      |

## Where a String Becomes Markup

The bug is a **source** the attacker controls flowing into a **sink** that parses HTML: `innerHTML`,
`outerHTML`, `insertAdjacentHTML` or `document.write`.

**The classic DOM-based bug, and its fix:**

```typescript
const name: string = new URLSearchParams(location.search).get("name") ?? "";
const el = document.querySelector("#hello")!;
el.innerHTML = `Hi, ${name}!`; // ❌ ?name=<img src=x onerror=alert(1)> runs
el.textContent = `Hi, ${name}!`; // ✅ treated as text, never parsed
```

### Rich HTML you did not write

A CMS body must render as HTML, so encoding would break it. You need **sanitisation**: parse the HTML
and strip anything that can run. DOMPurify is the standard. Uploaded SVG belongs here too, since an SVG
can carry script: show uploads with `<img>`, never as text read into the DOM.

**Sanitise with an allowlist:**

```typescript
import DOMPurify from "dompurify";

const clean: string = DOMPurify.sanitize(dirty, {
  ALLOWED_TAGS: ["p", "b", "i", "em", "strong", "a", "ul", "ol", "li"],
  ALLOWED_ATTR: ["href", "title"],
});
// <img src=x onerror=alert(1)> loses its onerror; <script> is removed
```

> ⚠️ **Sanitise at render time, not only on save.** Data reaches your database through imports, other
> endpoints and old rows. Only the render path sees all of it.

### Where React stops protecting you

React escapes every value rendered as JSX text. That covers most markup crossings, but not these.

**The escape hatches:**

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

`dangerouslySetInnerHTML` bypasses escaping, so sanitise first. A URL from user input needs its scheme
allowlisted. The third blind spot is spreading unknown props (`{...userControlled}`), which lets an
attacker choose the attribute.

## Where a String Becomes a URL or a Script

**URLs.** A `javascript:` URL in `href` or `location` is code. A full URL from a query string is an
**open redirect**: your domain lends its name to a phishing page, and link filters pass it because the
first hop really is your site.

**Accept a path, not a URL:**

```typescript
function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/";
  return raw;
}

location.href = safeNext(new URLSearchParams(location.search).get("next"));
```

`//evil.com` is protocol-relative, so it is rejected too. If you need other origins, keep an allowlist
of hostnames.

**Scripts.** `eval`, `new Function` and `setTimeout` with a string turn data into code, so keep strings
out of them. The subtle case is state serialised into the page for hydration. An attacker can close the
tag with `</script>` from inside a JSON string.

**Escape JSON before embedding it in HTML:**

```typescript
function safeJson(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&]/g, (c: string) => `\\u00${c.charCodeAt(0).toString(16)}`);
}

const html: string = `<script>window.__STATE__ = ${safeJson(state)};</script>`;
```

## Inputs Only the Browser Sees

A `postMessage` from an iframe or a value in `location.hash` never reaches your server. No server
handler exists to review, so the browser is the only place a check can happen.

**A `postMessage` handler needs two checks:**

```typescript
window.addEventListener("message", (event: MessageEvent) => {
  if (event.origin !== "https://widgets.example.com") return; // 1. exact sender
  // 2. exact shape — the sender is not your code
  const parsed = widgetMessageSchema.safeParse(event.data);
  if (!parsed.success) return;
  applyWidgetUpdate(parsed.data);
});
```

Compare the origin to an exact string: `includes("example.com")` passes for `example.com.attacker.net`.
When you send, name the target origin; `postMessage(data, "*")` goes to whatever page holds the frame.

## Client Checks Versus the Real Control

Validation in the browser is user experience. Anyone can call the API with `curl`, so the server
enforces and the client only gives fast feedback.

**One schema for the form and the endpoint:**

```typescript
import { z } from "zod";

export const contactSchema = z.object({
  email: z.email(),
  message: z.string().min(10).max(2000),
});

const parsed = contactSchema.safeParse(req.body); // on the server, this is the gate
if (!parsed.success) res.status(400).json(parsed.error.issues);
```

The form uses it through its resolver, so the limits cannot drift. File checks are the same: `file.type`
is a guess from the extension, so the server still checks size and magic bytes.

## When to Use It

| Untrusted input                               | Choose                         | Why                                     |
| --------------------------------------- | ------------------------------ | --------------------------------------- |
| Real HTML from a CMS or editor          | Sanitising with an allowlist   | Encoding would destroy the markup       |
| A URL or redirect target                | Allowlist scheme, or path only | Encoding does not stop `javascript:`    |
| A message or fragment read in the page  | Exact origin check and a schema | No server will ever see it             |

**The backstop layers.** A **Content Security Policy** stops injected script running. **Trusted Types**
makes `innerHTML` reject plain strings, so every sanitiser call goes through one policy (Chromium-only as
of 2026). An **`HttpOnly`** session cookie means a script that does run cannot read the token.

## Common Mistakes

❌ **Filtering input on the way in and trusting it on the way out.**
✅ Encode or sanitise where the string is used. Only that point knows the context.

❌ **Trusting `event.data` because the iframe is yours.** Anyone can frame your page and post to it.
✅ Check the exact origin, then parse the payload against a schema.

## 🔑 Key Takeaways

- XSS happens where an untrusted string crosses into markup, a URL, a script or a style, and each crossing needs its own defence.
- `textContent` and JSX text are safe; `innerHTML`, `dangerouslySetInnerHTML`, `javascript:` URLs and spread props are not.
- Sanitise unavoidable HTML with DOMPurify at render time, and accept a path rather than a full URL for any redirect.
- `postMessage` payloads and URL fragments never reach the server, so the browser must check the exact origin and the shape.
- Client validation is user experience; share one schema so the server's check, which is the real control, cannot drift from it.

## Interview Questions

**Q: Encoding or sanitisation — when do you use each?**

Encoding turns special characters into text (`<` becomes `&lt;`), for anything shown as plain text.
Sanitisation parses HTML and removes what can run. Use it only for real HTML, such as CMS content, with
an allowlist.

**Q: How does React prevent XSS, and where does it fall short?**

React escapes every value rendered as JSX text. It does not protect `dangerouslySetInnerHTML`, user URLs
in `href` or `src`, or spread props. The fixes: sanitise, allowlist the scheme, never spread what you did
not build.

**Q: A colleague adds a `postMessage` listener for an analytics widget. What do you check in review?**

That the handler compares `event.origin` to one exact origin before touching `event.data`. That the
payload is parsed against a schema, not destructured. And that the sending side does not use
`postMessage(data, "*")`, which broadcasts to whatever page holds the frame.

**Q: Your team wants to rely on CSP instead of fixing every `innerHTML`. Would you agree?**

No. CSP is the second layer. It stops injected code running when encoding is missed once, but it is easy
to weaken with `'unsafe-inline'` or a broad allowlist. Fix the sinks, then add CSP and Trusted Types so
a single mistake is not fatal.

## What to Read Next

- [Chapter ?? — Content Security Policy and Security Headers](#ch-content-security-policy) — the layer that limits a successful injection
- [Chapter ?? — Backend Input Validation](#ch-backend-input-validation) — the server half of the shared schema, where stored XSS is stopped
- [Chapter ?? — Credentials, Sessions, CORS and CSRF](#ch-credentials-and-sessions) — why an `HttpOnly` cookie limits a successful injection, and the other cross-origin boundary
