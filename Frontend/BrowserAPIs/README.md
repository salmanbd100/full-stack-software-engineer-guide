# Browser APIs

Client-side storage, cookies, and permissions — the parts of the browser that every senior frontend engineer is expected to know cold.

## What's Inside

| # | Topic | Why It Matters |
|---|-------|----------------|
| [01](./01-storage-apis.md) | **Storage APIs** — `localStorage` & `sessionStorage` | Synchronous key-value store; the default for small prefs. Comes up in every frontend interview. |
| [02](./02-cookies-same-site.md) | **Cookies & SameSite** | The right place for auth. Understanding `HttpOnly`, `SameSite`, and CSRF is non-negotiable for senior roles. |
| [03](./03-indexeddb.md) | **IndexedDB** | Large, async, transactional storage. Powers offline-first apps and PWAs. |
| [04](./04-browser-permissions.md) | **Browser Permissions** | Geolocation, notifications, camera/mic, clipboard — and the UX of asking for them. |

---

## Choosing Storage

A common interview prompt: _"Where would you put X?"_

| Data | Pick | Why |
|------|------|-----|
| Theme, language, last-viewed tab | `localStorage` | Small, persistent, synchronous access is fine |
| Multi-step wizard state | `sessionStorage` | Per-tab, cleared on close — exactly the lifetime you want |
| Auth / refresh tokens | **HttpOnly cookie** | JavaScript can't read it; survives XSS |
| Offline records, drafts, queues | **IndexedDB** | Large, async, indexed, transactional |
| Cached HTTP responses (PWA) | **Cache API** (in a Service Worker) | Built for `Request`/`Response` pairs |
| In-flight UI state, derived data | React / store / memory | No persistence needed |

---

## Security Cheat Sheet

| Risk | Defense |
|------|---------|
| **XSS reading tokens** | Never store credentials in `localStorage`/`sessionStorage`. Use `HttpOnly` cookies. |
| **CSRF** | `SameSite=Lax` (or `Strict`) + a CSRF token on state-changing requests. |
| **Man-in-the-middle** | Always set `Secure` on cookies. HTTPS everywhere. |
| **Stale tokens** | Short-lived access tokens in memory; long-lived refresh in `HttpOnly` cookie. |
| **Permission abuse** | Ask on user gesture only; explain in UI before triggering the native prompt. |

---

## Study Plan

**Weekend 1 — Storage fundamentals**
- Read 01-storage-apis.md and 03-indexeddb.md
- Build a notes app: drafts in `sessionStorage`, saved notes in IndexedDB

**Weekend 2 — Auth & cookies**
- Read 02-cookies-same-site.md
- Implement the split-token pattern (HttpOnly refresh cookie + in-memory access token)
- Explain SameSite=Lax vs Strict vs None out loud — that's the question

**Weekend 3 — Permissions UX**
- Read 04-browser-permissions.md
- Build a "find places near me" button with full permission states + fallback

---

## Quick Reference

```typescript
// localStorage
localStorage.setItem("k", JSON.stringify(value));
const value = JSON.parse(localStorage.getItem("k") ?? "null");

// Cookie (HttpOnly is server-only)
document.cookie = "theme=dark; Path=/; Max-Age=31536000; SameSite=Lax";

// IndexedDB (with idb library)
const db = await openDB("app", 1, { upgrade(db) { db.createObjectStore("notes", { keyPath: "id", autoIncrement: true }); } });
await db.add("notes", { title, body });

// Permissions
const status = await navigator.permissions.query({ name: "geolocation" });
if (status.state !== "denied") navigator.geolocation.getCurrentPosition(onOk, onErr);
```

---

[← Frontend](../README.md)
