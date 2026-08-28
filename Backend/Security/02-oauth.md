# OAuth 2.0 {#ch-oauth-2}

> Walk through the authorisation code flow with PKCE and explain what each redirect is protecting.

**In this chapter:** the four roles · authorisation code with PKCE · the grant types worth knowing · OAuth vs OIDC vs JWT · state and redirect validation

## Overview

**OAuth 2.0** lets a user give one app limited access to their data on another service — without sharing their password.

"Sign in with Google" is the everyday example. Your app never sees the Google password. It receives a token that works only for the scopes the user approved.

> **OAuth is authorization, not authentication.** It answers "what may this app do?" **OpenID Connect (OIDC)** is the thin layer on top that answers "who is this user?"

## Table of Contents

- [The Four Roles](#the-four-roles)
- [Authorization Code Flow with PKCE](#authorization-code-flow-with-pkce)
- [Server Implementation](#server-implementation)
- [Grant Types: Which to Use](#grant-types-which-to-use)
- [OAuth vs OIDC vs JWT](#oauth-vs-oidc-vs-jwt)
- [Security Essentials](#security-essentials)
- [Interview Questions](#interview-questions)

## The Four Roles

| Role                     | Who it is                | Example                       |
| ------------------------ | ------------------------ | ----------------------------- |
| **Resource Owner**       | The user                 | You                           |
| **Client**               | The app wanting access   | A photo printing service      |
| **Authorization Server** | Issues tokens            | Google's OAuth endpoints      |
| **Resource Server**      | Holds the protected data | Google Photos API             |

The authorization server and resource server often belong to the same company, but they are different jobs.

## Authorization Code Flow with PKCE

This is **the** flow to know. It's the recommended default for web apps, SPAs, and mobile apps.

```text
1. User clicks "Sign in with Google"
        │
        ▼
2. Redirect to Google  (client_id, scope, state, code_challenge)
        │
        ▼
3. User logs in and approves the scopes
        │
        ▼
4. Google redirects back:  /callback?code=abc&state=xyz
        │
        ▼
5. Server POSTs code + code_verifier  →  Google   (back channel)
        │
        ▼
6. Google returns access_token (+ refresh_token, id_token)
        │
        ▼
7. Server calls the API with the access token
```

**Why the extra round trip?** The code in step 4 travels through the browser URL, where it can leak into logs and history. It is useless alone — redeeming it needs a client secret or a PKCE verifier, sent server-to-server.

### What PKCE adds

**PKCE** (Proof Key for Code Exchange, said "pixie") stops a stolen authorization code from being redeemed by someone else.

```text
Before redirect:   verifier  = random string
                   challenge = SHA256(verifier)    → sent in step 2

At token exchange: send the raw verifier           → sent in step 5

Server checks:     SHA256(verifier) === challenge  ✅
```

An attacker who intercepts the code never saw the verifier, so the exchange fails.

```typescript
import crypto from "node:crypto";

export function createPkcePair(): { verifier: string; challenge: string } {
  const verifier: string = crypto.randomBytes(32).toString("base64url");
  const challenge: string = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { verifier, challenge };
}
```

> ✨ PKCE was designed for mobile apps that can't hide a secret. It is now recommended for **every** client, including confidential ones.

## Server Implementation

**Step 1 — build the authorization URL:**

```typescript
import crypto from "node:crypto";
import type { Request, Response } from "express";

const AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";

export function startLogin(req: Request, res: Response): void {
  const { verifier, challenge } = createPkcePair();
  const state: string = crypto.randomBytes(16).toString("hex");

  // Both must survive the round trip — session or signed cookie.
  req.session.pkceVerifier = verifier;
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id: process.env.OAUTH_CLIENT_ID!,
    redirect_uri: "https://app.example.com/auth/callback",
    response_type: "code",
    scope: "openid email profile", // ask for the least you need
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  res.redirect(`${AUTH_URL}?${params.toString()}`);
}
```

**Step 2 — handle the callback and exchange the code:**

```typescript
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_in: number;
  token_type: "Bearer";
}

export async function handleCallback(req: Request, res: Response): Promise<void> {
  const { code, state } = req.query as { code?: string; state?: string };

  // ⚠️ CSRF check — reject if state doesn't match what we sent.
  if (!code || !state || state !== req.session.oauthState) {
    res.status(400).json({ error: "Invalid OAuth state" });
    return;
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: "https://app.example.com/auth/callback",
      client_id: process.env.OAUTH_CLIENT_ID!,
      client_secret: process.env.OAUTH_CLIENT_SECRET!, // server-side only
      code_verifier: req.session.pkceVerifier!,
    }),
  });

  if (!response.ok) {
    res.status(401).json({ error: "Token exchange failed" });
    return;
  }

  const tokens = (await response.json()) as TokenResponse;

  // Issue *your own* session now. Don't hand provider tokens to the browser.
  req.session.userId = await upsertUserFromIdToken(tokens.id_token!);
  res.redirect("/dashboard");
}
```

> 🔴 **Never send the provider's access or refresh token to the frontend.** Keep them server-side, keyed by your own session.

**Step 3 — refresh when the access token expires:**

```typescript
export async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: process.env.OAUTH_CLIENT_ID!,
      client_secret: process.env.OAUTH_CLIENT_SECRET!,
    }),
  });

  if (!response.ok) throw new Error("Refresh failed — user must log in again");
  return (await response.json()) as TokenResponse;
}
```

## Grant Types: Which to Use

| Grant                         | Use for                              | Status                      |
| ----------------------------- | ------------------------------------ | --------------------------- |
| **Authorization Code + PKCE** | Web apps, SPAs, mobile               | ✅ The default              |
| **Client Credentials**        | Service-to-service, no user involved | ✅ Correct for machine auth |
| **Refresh Token**             | Getting a new access token           | ✅ Use with rotation        |
| **Device Code**               | TVs, CLIs — typing is awkward        | ✅ Niche but valid          |
| **Implicit**                  | Old SPA workaround                   | ❌ Deprecated               |
| **Resource Owner Password**   | App collects the user's password     | ❌ Deprecated               |

**Why implicit died:** it returned the access token directly in the URL fragment — visible in history, referrers, and logs — with no way to authenticate the client.

**Why the password grant died:** the app sees the user's password, so there is no delegation and no MFA. That defeats the point of OAuth.

```typescript
// Client credentials — no user, one service calling another
const res = await fetch("https://auth.example.com/oauth/token", {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: process.env.SVC_CLIENT_ID!,
    client_secret: process.env.SVC_CLIENT_SECRET!,
    scope: "reports:read",
  }),
});
```

## OAuth vs OIDC vs JWT

People mix these up constantly. Keep them separate:

| Thing         | What it is                       | Answers                     |
| ------------- | -------------------------------- | --------------------------- |
| **OAuth 2.0** | An authorization framework       | "What may this app access?" |
| **OIDC**      | An identity layer built on OAuth | "Who is this user?"         |
| **JWT**       | A token *format*                 | Neither — it's a container  |

- OIDC adds the **`id_token`**: a JWT describing the user (`sub`, `email`, `name`).
- OAuth access tokens *may* be JWTs, or may be opaque random strings. Both are valid.

> **Interview line:** "OAuth alone tells me an app has permission. It doesn't reliably tell me who logged in. For sign-in I use OIDC and validate the `id_token`."

## Security Essentials

**✅ Always validate `state`.** Without it, an attacker can complete a flow in the victim's browser and link their own account to the victim's session (login CSRF).

**✅ Match redirect URIs exactly.** A wildcard or open redirect leaks the authorization code:

```typescript
// ❌ Dangerous — any subdomain takeover steals codes
const allowed = /^https:\/\/.*\.example\.com\//;

// ✅ Exact allowlist
const ALLOWED_REDIRECTS = new Set(["https://app.example.com/auth/callback"]);
```

**✅ Request the smallest scope.** Ask for `email profile`, not `drive.readonly`, unless you truly read files. A leaked token then does less harm.

**✅ Validate the `id_token`.** Check the signature against the provider's JWKS, plus `iss`, `aud`, `exp`, and `nonce`. Never trust a decoded-but-unverified token.

**✅ Store provider tokens encrypted, server-side.** Treat a refresh token like a password.

## Interview Questions

**Q1: What problem does OAuth 2.0 solve?**

It lets a user grant an app limited access to their data on another service without giving up their password. The app gets a scoped, expiring token instead of credentials, and the user can revoke it at any time.

**Q2: Walk me through the authorization code flow.**

The app redirects the user to the authorization server with its client ID, requested scopes, and a random `state`. The user logs in and consents. The server redirects back with a short-lived code. The app's backend then exchanges that code — plus its client secret or PKCE verifier — for tokens over a direct server-to-server call. The code travels through the browser; the tokens never do.

**Q3: What does PKCE add, and why is it needed?**

It binds the authorization code to the client that started the flow. The client sends a hash of a random verifier up front, then the raw verifier at exchange time. An attacker who steals the code from a redirect can't redeem it. It was built for mobile apps that can't keep a secret and is now recommended for all clients.

**Q4: Why is the implicit flow deprecated?**

It returned the access token in the redirect URL fragment, where it leaks into history, logs, and referrer headers, and the client couldn't be authenticated. Authorization code with PKCE gives SPAs the same convenience safely.

**Q5: OAuth vs OpenID Connect?**

OAuth is authorization — permission to access resources. OIDC is a standard layer on top that adds authentication: an `id_token` (a JWT) with verified claims about the user, plus a `/userinfo` endpoint. Using raw OAuth for login is a known anti-pattern.

**Q6: What is the `state` parameter for?**

CSRF protection for the OAuth flow itself. The client generates a random value, stores it in the session, and sends it with the authorization request. On callback it must match. Without it an attacker can force a victim's browser to complete a flow with the attacker's code.

**Q7: Where do you store the tokens you get back?**

Server-side, encrypted, tied to my own session. The browser only ever gets my session cookie or short-lived JWT — never the provider's tokens. A refresh token is as sensitive as a password.

## Summary

**Checklist:**

- [ ] Authorization code + PKCE for every user-facing flow
- [ ] `state` generated per request and validated on callback
- [ ] Redirect URIs matched exactly against an allowlist
- [ ] Client secret only ever on the server
- [ ] Minimum scopes requested
- [ ] `id_token` signature and claims validated against the provider's JWKS
- [ ] Provider tokens stored encrypted, server-side
- [ ] HTTPS on every endpoint in the flow

**Best practices:**

1. **Use a library** — `openid-client` or your provider's SDK. Hand-rolled OAuth is where bugs live.
2. **Least privilege scopes** — smaller ask, smaller blast radius.
3. **OIDC for login**, plain OAuth for API access.
4. **Never trust the browser** with provider tokens.

---

[← JWT Authentication](./01-jwt.md) | [Next: Password Security →](./03-passwords.md)
