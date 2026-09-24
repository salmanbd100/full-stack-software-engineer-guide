---
title: Cookies and SameSite
part: 2
chapter: 8
slug: cookies-same-site
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-24
tags: [frontend, browser, apis, cookies, same]
in_book: true
---

# Cookies and SameSite {#ch-cookies-same-site}

> Set a cookie an attacker cannot read or replay, and explain each attribute you chose.

**In this chapter:** cookie attributes · `SameSite` Strict, Lax and None · how SameSite blunts CSRF · cookies vs localStorage for auth

## 💡 The Core Idea

A cookie is a small piece of data the server tells the browser to keep, and the browser then attaches
it to **every matching request without being asked**. That one behaviour explains both halves of the
chapter: it is why cookies carry sessions, and it is why cross-site request forgery exists at all. An
attacker who cannot read your cookie can still cause it to be sent.

So every attribute on a `Set-Cookie` line is an answer to the same question — *when should the browser
send this?* `HttpOnly` answers "never to JavaScript", `Secure` answers "never in clear text", and
`SameSite` answers "never from someone else's page". Choosing them deliberately is the whole skill.

```text
# Server response
Set-Cookie: sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict

# Every later request to the same origin
Cookie: sessionId=abc123
```

Cookies are small — about 4 KB — and travel with every request, so they are a session mechanism rather
than a storage mechanism. Data that is not needed on the server belongs in web storage.

> ⚠️ **Moving target:** third-party cookie policy has moved more than any other part of this chapter.
> Safari and Firefox block third-party cookies by default; Chrome announced a phase-out, delayed it
> twice and then abandoned the default deprecation, leaving `Partitioned` (CHIPS) and the Storage Access
> API as the sanctioned ways to keep an embedded flow working. The durable principle is that the
> attributes below are stable and the *permission to set a cookie in a third-party context* is not, so
> never build a login flow that depends on one.

## How It Works

### The attributes

| Attribute | What It Does |
|-----------|--------------|
| `Path=/` | URL prefix where the cookie is sent (default: current path) |
| `Domain=example.com` | Send to this domain and all subdomains. Omit it to limit to the exact host. |
| `Max-Age=3600` | Lifetime in seconds (preferred over `Expires`) |
| `Expires=<date>` | Absolute expiry date. No `Max-Age`/`Expires` = session cookie (dies with browser). |
| `Secure` | Only sent over HTTPS |
| `HttpOnly` | **Not** accessible from `document.cookie` — the single biggest defence against XSS token theft |
| `SameSite=Strict\|Lax\|None` | Controls cross-site sending (see below) |

**Defaults to know:**

- Modern browsers treat a cookie with **no `SameSite`** as `SameSite=Lax`.
- `SameSite=None` **requires** `Secure`, or the cookie is rejected.
- `HttpOnly` can only be set by the server — not from JavaScript.

### `SameSite`: Strict, Lax and None

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

### CSRF, and how `SameSite` blunts it

**Cross-site request forgery** happens because cookies are sent automatically. An attacker tricks a logged-in user into making a request from another site:

```html
<!-- On attacker.com — runs while the victim is logged in to bank.com -->
<form method="POST" action="https://bank.com/transfer" id="f">
  <input name="amount" value="1000">
  <input name="to" value="attacker">
</form>
<script>f.submit();</script>
```

Without `SameSite`, the browser sends the bank's session cookie and the transfer goes through.

**`SameSite` is the first defence:**

- `SameSite=Lax` blocks cross-site POST → kills the form-submit attack
- `SameSite=Strict` blocks all cross-site sends

**Add a CSRF token for defence in depth:**

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

### Reading and writing from JavaScript

`document.cookie` is famously awkward: a read returns one long string to parse, and a write is a full
attribute line. `HttpOnly` cannot be set from it, by design — which is the point.

```typescript
document.cookie = "theme=dark; Path=/; Max-Age=31536000; SameSite=Lax"; // write
document.cookie = "theme=; Path=/; Max-Age=0"; // delete, by expiring it
```

## When to Use It

| Concern | HttpOnly Cookie | localStorage |
|---------|----------------|--------------|
| **XSS reads token** | ❌ Not possible (JS can't access) | ✅ Trivial |
| **CSRF** | ✅ Possible — mitigate with `SameSite` + tokens | ❌ Not possible (must be sent manually) |
| **Sent with every request** | ✅ Automatic | ❌ Manual via header |
| **Cross-domain SSO** | Works (with `SameSite=None; Secure`) | Awkward |

**The interview-ready answer:** XSS is far more common than CSRF, and HttpOnly cookies neutralize it. Use HttpOnly cookies for the session, and protect against CSRF with `SameSite=Lax` plus a token.

### The split-token pattern

The answer most interviewers are listening for: a long-lived refresh token in an `HttpOnly` cookie,
and a short-lived access token in memory.

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

### Consent

Under GDPR and CCPA, only **strictly necessary** cookies — the session, the CSRF token, a load-balancer
cookie — may be set before the user agrees. Preferences, analytics and marketing cookies need opt-in
consent first. The banner offers Accept, Reject and Customise with nothing pre-ticked, and the scripts
behind it load only after the choice.

## Common Mistakes

**❌ Setting `SameSite=None` to make something work.** It is the value that switches the protection
off, and it is only correct when the cookie genuinely has to travel in a third-party context. Reaching
for it because a request "was not sending the cookie" removes the CSRF defence for every request.

**❌ Omitting `Secure` alongside `SameSite=None`.** The browser rejects the cookie outright, which
usually surfaces as an authentication bug rather than as a cookie bug.

**❌ Setting `Domain=example.com` by reflex.** It widens the cookie to every subdomain, including any
one an attacker manages to get a foothold on. Omit `Domain` unless a subdomain really needs the cookie.

**❌ Treating the cookie as the whole CSRF defence.** `SameSite=Lax` blocks the cross-site POST, and it
is a browser behaviour — an old browser, or a same-site subdomain under attacker control, still gets
through. The double-submit token is the second layer, not an alternative.

**❌ Loading analytics before consent and asking afterwards.** A pre-ticked box is not consent, and
neither is a banner that has already run the script behind it.

## 🔑 Key Takeaways

- The browser attaches a cookie to every matching request automatically, which is what makes cookies
  work for sessions and what makes CSRF possible.
- `HttpOnly` is the attribute that matters most for a session cookie: it is what an XSS cannot defeat.
- `SameSite=Lax` is the modern default and the right answer for most applications; `Strict` breaks the
  click-a-link-in-an-email flow; `None` requires `Secure` and switches the protection off.
- Split the credential: refresh token in an `HttpOnly` cookie, access token in memory, so an XSS gets
  at most a short-lived value.
- Only strictly necessary cookies may be set before consent, and a pre-ticked box is not consent.

## Interview Questions

**Q: Walk me through `SameSite=Strict` versus `Lax` versus `None`.**

- **`Strict`** — only sent on same-site requests. Most secure, breaks cross-site UX (a link from email won't carry the session).
- **`Lax`** — same-site + top-level GET navigation. The modern browser default. Good balance for normal apps.
- **`None`** — sent on every request, including cross-site iframes and AJAX. Required for embedded third-party flows. Must be paired with `Secure`.

**Q: Why is `HttpOnly` more important than `Secure` for an auth cookie?**

`HttpOnly` blocks JavaScript from reading the cookie, which kills XSS-based token theft — the most common web attack. `Secure` only protects against an attacker on the network path, which HTTPS already largely solves. You want both, but `HttpOnly` is the bigger win.

**Q: How does `SameSite` prevent CSRF?**

CSRF relies on the browser auto-sending the user's session cookie when an attacker's page triggers a request to your site. `SameSite=Lax` blocks cross-site POST/PUT/DELETE, which is where CSRF lives. The attacker's request reaches your server without the cookie, so the user looks logged out and the action fails.

**Q: Why not store the JWT in `localStorage`?**

`localStorage` is readable by any script on the page. A single XSS — even from a compromised npm dependency — can read and exfiltrate the token. HttpOnly cookies are invisible to JavaScript, so the same XSS can call your APIs (because the browser auto-sends the cookie), but **cannot steal the long-lived credential** itself.

**Q: How would you do auth across `app.example.com` and `api.example.com`?**

Set the cookie with `Domain=example.com` so both subdomains receive it. Use `SameSite=Lax` (or `Strict` if you don't need cross-site flows) and `Secure`. If `api.example.com` is on a totally different registrable domain, you need `SameSite=None; Secure` and CORS with `credentials: "include"`.

## What to Read Next

- [Chapter ?? — Web Storage and IndexedDB](#ch-storage-apis) — the alternative, and why it loses this argument
- [Chapter ?? — CORS and CSRF](#ch-cors-csrf) — the server half of the forgery defence
- [Chapter ?? — Security Headers](#ch-security-headers) — the other headers that close a category
  before an attack starts
