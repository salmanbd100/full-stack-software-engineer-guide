# Cookies & SameSite

## Table of Contents
- [What Cookies Are](#what-cookies-are)
- [Cookie Attributes](#cookie-attributes)
- [SameSite: Strict, Lax, None](#samesite-strict-lax-none)
- [CSRF and How SameSite Helps](#csrf-and-how-samesite-helps)
- [Cookies vs localStorage for Auth](#cookies-vs-localstorage-for-auth)
- [Reading & Writing from JavaScript](#reading--writing-from-javascript)
- [Secure Auth Pattern](#secure-auth-pattern)
- [GDPR / Consent](#gdpr--consent)
- [Interview Questions](#interview-questions)

---

## What Cookies Are

A **cookie** is a small piece of data the server tells the browser to store. The browser then sends it back **automatically** with every matching request.

```
# Server response
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict

# Every later request to the same origin
Cookie: sessionId=abc123
```

The "auto-send" behavior is what makes cookies useful for **sessions** — and what makes them vulnerable to **CSRF**.

> Cookies are small (~4 KB) and travel with every request. Don't use them for general data — they add bandwidth to every call.

---

## Cookie Attributes

| Attribute | What It Does |
|-----------|--------------|
| `Path=/` | URL prefix where the cookie is sent (default: current path) |
| `Domain=example.com` | Send to this domain and all subdomains. Omit it to limit to the exact host. |
| `Max-Age=3600` | Lifetime in seconds (preferred over `Expires`) |
| `Expires=<date>` | Absolute expiry date. No `Max-Age`/`Expires` = session cookie (dies with browser). |
| `Secure` | Only sent over HTTPS |
| `HttpOnly` | **Not** accessible from `document.cookie` — the single biggest defense against XSS token theft |
| `SameSite=Strict\|Lax\|None` | Controls cross-site sending (see below) |

**Defaults to know:**

- Modern browsers treat a cookie with **no `SameSite`** as `SameSite=Lax`.
- `SameSite=None` **requires** `Secure`, or the cookie is rejected.
- `HttpOnly` can only be set by the server — not from JavaScript.

---

## SameSite: Strict, Lax, None

`SameSite` decides whether the browser sends the cookie when the request comes from a different site.

| Value | Same-site request | Top-level navigation from another site | Cross-site AJAX / iframe |
|-------|-------------------|----------------------------------------|--------------------------|
| `Strict` | ✅ Sent | ❌ Not sent | ❌ Not sent |
| `Lax` (default) | ✅ Sent | ✅ Sent (GET only) | ❌ Not sent |
| `None` | ✅ Sent | ✅ Sent | ✅ Sent (requires `Secure`) |

**Which to choose:**

| Scenario | Use |
|----------|-----|
| Session cookie for a normal web app | `Lax` |
| Banking, admin, "destructive" operations | `Strict` |
| Third-party iframe / cross-site auth (SSO) | `None` + `Secure` |

> `Strict` breaks the "click a link in an email, land logged-in" flow — the cookie isn't sent on that first navigation. `Lax` keeps that working while still blocking cross-site POST.

---

## CSRF and How SameSite Helps

**CSRF (Cross-Site Request Forgery)** happens because cookies are sent automatically. An attacker tricks a logged-in user into making a request from another site:

```html
<!-- On attacker.com — runs while the victim is logged in to bank.com -->
<form method="POST" action="https://bank.com/transfer" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>f.submit();</script>
```

Without `SameSite`, the browser sends the bank's session cookie and the transfer goes through.

**SameSite is your first defense:**

- `SameSite=Lax` blocks cross-site POST → kills the form-submit attack
- `SameSite=Strict` blocks all cross-site sends

**Add a CSRF token for defense in depth:**

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

> Reading the CSRF cookie and echoing it in a header is the **double-submit cookie** pattern. The attacker's page can't read your cookie (same-origin policy), so they can't fake the header.

---

## Cookies vs localStorage for Auth

| Concern | HttpOnly Cookie | localStorage |
|---------|----------------|--------------|
| **XSS reads token** | ❌ Not possible (JS can't access) | ✅ Trivial |
| **CSRF** | ✅ Possible — mitigate with `SameSite` + tokens | ❌ Not possible (must be sent manually) |
| **Sent with every request** | ✅ Automatic | ❌ Manual via header |
| **Cross-domain SSO** | Works (with `SameSite=None; Secure`) | Awkward |

**The interview-ready answer:** XSS is far more common than CSRF, and HttpOnly cookies neutralize it. Use HttpOnly cookies for the session, and protect against CSRF with `SameSite=Lax` plus a token.

---

## Reading & Writing from JavaScript

The cookie API is famously awkward — every read parses one big string, every write is a full attribute line.

```typescript
// Write (cannot set HttpOnly from JS)
document.cookie = "theme=dark; Path=/; Max-Age=31536000; SameSite=Lax";

// Read a single cookie
function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

// Delete (set an expired date)
document.cookie = "theme=; Path=/; Max-Age=0";
```

**Modern alternative — the Cookie Store API** (Chrome/Edge, async):

```typescript
await cookieStore.set({ name: "theme", value: "dark", sameSite: "lax" });
const cookie = await cookieStore.get("theme");
```

In production, reach for [`js-cookie`](https://github.com/js-cookie/js-cookie) — it handles encoding for you.

---

## Secure Auth Pattern

A common interview answer is the **split-token** pattern: long-lived refresh token in an HttpOnly cookie, short-lived access token in memory.

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

**Why this works:**

- Access token never touches storage → XSS can grab it from memory only **while the page is open** (limited blast radius).
- Refresh token is HttpOnly → XSS cannot read it at all.
- `SameSite=Strict` on the refresh cookie blocks CSRF on `/auth/refresh`.

---

## GDPR / Consent

Under GDPR (EU) and CCPA (California), you need **opt-in consent** before setting cookies that aren't strictly necessary.

| Category | Needs Consent? | Examples |
|----------|----------------|----------|
| **Strictly necessary** | ❌ No | Session, CSRF token, load balancer |
| **Preferences** | ✅ Yes | Theme, language (if not essential) |
| **Analytics** | ✅ Yes | GA, Mixpanel, Plausible |
| **Marketing** | ✅ Yes | Ad pixels, retargeting |

**Practical rules:**

1. Set only essential cookies on first load.
2. Show a banner with **Accept / Reject / Customize** (no pre-ticked boxes — that's not consent).
3. Persist the choice (in a first-party cookie or `localStorage`) and load other scripts only after consent.
4. Provide a "Cookie settings" link that lets users change their mind.

---

## Interview Questions

### Q: Walk me through SameSite=Strict vs Lax vs None.

- **`Strict`** — only sent on same-site requests. Most secure, breaks cross-site UX (a link from email won't carry the session).
- **`Lax`** — same-site + top-level GET navigation. The modern browser default. Good balance for normal apps.
- **`None`** — sent on every request, including cross-site iframes and AJAX. Required for embedded third-party flows. Must be paired with `Secure`.

### Q: Why is `HttpOnly` more important than `Secure` for auth cookies?

`HttpOnly` blocks JavaScript from reading the cookie, which kills XSS-based token theft — the most common web attack. `Secure` only protects against an attacker on the network path, which HTTPS already largely solves. You want both, but `HttpOnly` is the bigger win.

### Q: How does SameSite prevent CSRF?

CSRF relies on the browser auto-sending the user's session cookie when an attacker's page triggers a request to your site. `SameSite=Lax` blocks cross-site POST/PUT/DELETE, which is where CSRF lives. The attacker's request reaches your server without the cookie, so the user looks logged out and the action fails.

### Q: Why not store the JWT in `localStorage`?

`localStorage` is readable by any script on the page. A single XSS — even from a compromised npm dependency — can read and exfiltrate the token. HttpOnly cookies are invisible to JavaScript, so the same XSS can call your APIs (because the browser auto-sends the cookie), but **cannot steal the long-lived credential** itself.

### Q: How would you do auth across `app.example.com` and `api.example.com`?

Set the cookie with `Domain=example.com` so both subdomains receive it. Use `SameSite=Lax` (or `Strict` if you don't need cross-site flows) and `Secure`. If `api.example.com` is on a totally different registrable domain, you need `SameSite=None; Secure` and CORS with `credentials: "include"`.

### Q: What's the third-party cookie phase-out about?

Browsers (Safari ITP, Firefox ETP, Chrome's stalled Privacy Sandbox) are blocking cookies set by domains other than the one in the URL bar. It mostly affects cross-site ad tracking. For first-party use (your session on your own domain), nothing changes. For embedded third-party features (SSO, payments), use the **Storage Access API** or move to first-party endpoints.

---

[← Previous: Storage APIs](./01-storage-apis.md) | [Next: IndexedDB →](./03-indexeddb.md)
