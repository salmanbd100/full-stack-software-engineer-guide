---
title: Web Storage APIs
part: 2
chapter: 7
slug: storage-apis
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-19
tags: [frontend, browser, apis, storage]
in_book: true
---

# Web Storage APIs {#ch-storage-apis}

> Choose between localStorage and sessionStorage deliberately, and know why neither should hold a token.

**In this chapter:** localStorage vs sessionStorage · serialising objects · cross-tab `storage` events · quota errors · why not for auth

## 💡 The Core Idea

Web storage is a synchronous, same-origin, string-only key-value cache with **no security boundary and
no guarantee of survival**. Every one of those five words is a constraint that decides what belongs in
it: synchronous means a large read blocks the frame, string-only means everything is serialised,
same-origin means another site cannot read it but any script on *your* page can, and no guarantee means
the browser may evict it under pressure.

Treat everything in it as disposable. If losing the value would break the application, or leaking it
would matter, it belongs somewhere else.

```typescript
localStorage.setItem("theme", "dark");
const theme: string | null = localStorage.getItem("theme"); // "dark"
```

> ⚠️ **Moving target:** browsers now partition storage by top-level site, so the same origin embedded in
> two different parent sites sees two different stores — and eviction rules under storage pressure differ
> per browser and keep changing. The durable principle is the one above: a same-origin string cache with
> no security boundary and no promise of persistence.

## How It Works

### The two stores

| Feature | `localStorage` | `sessionStorage` |
| ------- | -------------- | ---------------- |
| **Lifetime** | Until cleared explicitly | Until the tab is closed |
| **Scope** | Shared across tabs of the same origin | One tab only |
| **Cross-tab events** | ✅ Fires `storage` | ❌ No |
| **Size** | ~5–10 MB per origin | ~5–10 MB per origin |

Both objects share the same five methods, and the important detail is the return type.

```typescript
localStorage.setItem("key", "value");
const value: string | null = localStorage.getItem("key"); // null if missing
localStorage.removeItem("key");
localStorage.clear(); // everything for this origin
const count: number = localStorage.length;
const firstKey: string | null = localStorage.key(0);
```

`getItem` returns `null` for a missing key, values are always strings — booleans and numbers are
coerced on the way in — and nothing in the store is trustworthy, because DevTools can edit all of it.

### Storing anything that is not a string

```typescript
interface UserPrefs {
  theme: "light" | "dark";
  fontSize: number;
}

function savePrefs(prefs: UserPrefs): void {
  localStorage.setItem("prefs", JSON.stringify(prefs));
}

function loadPrefs(): UserPrefs | null {
  const raw = localStorage.getItem("prefs");
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as UserPrefs;
  } catch {
    return null; // Corrupt, or hand-edited
  }
}
```

The `try`/`catch` is not defensive padding. A user or an old version of your own application can leave
invalid JSON behind, and an uncaught parse error at start-up takes the whole page with it.

### Cross-tab sync

A `localStorage` write fires a `storage` event in **other tabs** of the same origin. It does not fire
in the tab that made the change, which is the detail interviewers ask about.

```typescript
window.addEventListener("storage", (e: StorageEvent) => {
  if (e.key === "theme") {
    document.documentElement.dataset.theme = e.newValue ?? "light";
  }
});
```

That covers theme sync, logging out every tab at once, and "you have a new message" pings. For
messaging that also reaches the sending tab, `BroadcastChannel` is the simpler tool.

### Quota, and storage that is not there at all

Most browsers cap web storage at roughly 5–10 MB per origin, and going over throws
`QuotaExceededError`. Private browsing can disable storage entirely, so a probe is the only reliable
availability check.

```typescript
function safeSet(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    if (e instanceof DOMException && e.name === "QuotaExceededError") {
      cleanupOldEntries();
      return false;
    }
    throw e;
  }
}

function isStorageAvailable(): boolean {
  try {
    const probe = "__probe__";
    localStorage.setItem(probe, probe);
    localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}
```

For real numbers rather than a guess, `StorageManager` reports usage across IndexedDB, the Cache API
and web storage together.

```typescript
const { usage, quota } = await navigator.storage.estimate(); // bytes
```

## When to Use It

| Need | Pick | Why |
| ---- | ---- | --- |
| Theme, language, "remember me" preference | `localStorage` | Small, disposable, wanted in every tab |
| Form draft for the current tab | `sessionStorage` | Two tabs filling the same form must not collide |
| Wizard or multi-step flow state | `sessionStorage` | The flow dies with the tab, and so should its state |
| More than ~5 MB, or queries, or binary data | IndexedDB | Asynchronous, indexed, stores `Blob`s |
| Tokens, personal data, anything sensitive | **Neither** | Use an `HttpOnly` cookie — see below |

Two patterns come up often enough to be worth having ready. A typed wrapper removes the `JSON.parse`
ceremony from call sites, and a TTL adds the expiry the API does not have.

```typescript
class TypedStorage<T> {
  constructor(private readonly key: string, private readonly storage: Storage = localStorage) {}

  get(): T | null {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set(value: T): void {
    this.storage.setItem(this.key, JSON.stringify(value));
  }

  remove(): void {
    this.storage.removeItem(this.key);
  }
}

interface Wrapped<T> {
  value: T;
  expiresAt: number;
}

function setWithTTL<T>(key: string, value: T, ttlMs: number): void {
  const wrapped: Wrapped<T> = { value, expiresAt: Date.now() + ttlMs };
  localStorage.setItem(key, JSON.stringify(wrapped));
}

function getWithTTL<T>(key: string): T | null {
  const raw = localStorage.getItem(key);
  if (raw === null) return null;
  const { value, expiresAt } = JSON.parse(raw) as Wrapped<T>;
  if (Date.now() > expiresAt) {
    localStorage.removeItem(key);
    return null;
  }
  return value;
}
```

## Common Mistakes

**❌ Putting a token in `localStorage`.** Anything there is readable by every script on the page,
including a third-party dependency that gets compromised tomorrow.

```typescript
// ❌ One injected script exfiltrates this
localStorage.setItem("authToken", "eyJhbGci...");

// ✅ The server sets a cookie JavaScript cannot read
// Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Strict
```

Three things are wrong with the first line at once: an XSS reads it directly, it sits as plain text in
the user's profile on disk, and it has no expiry, so a forgotten token lives forever.

**❌ Reading or writing in a hot path.** The API is synchronous, so a large `JSON.parse` during scroll
or animation lands on the main thread and shows up as a dropped frame.

**❌ Trusting what comes back.** The store is user-editable. Validate a shape you depend on, the same
way you would validate a server response.

**❌ Assuming the writing tab hears its own `storage` event.** It does not, and a UI that relies on it
updates everywhere except where the user is looking.

## 🔑 Key Takeaways

- Web storage is a synchronous, same-origin, string-only cache with no security boundary and no promise
  of persistence.
- `localStorage` outlives the tab and is shared across tabs; `sessionStorage` dies with the tab and is
  isolated to it.
- `JSON.parse` on stored data always needs a `try`/`catch` — the store is editable and old versions
  leave debris.
- The `storage` event reaches every tab except the one that wrote the value.
- If leaking the value would matter, it does not belong here. `HttpOnly` cookies are the answer for
  session tokens.

## Interview Questions

**Q: What is the difference between `localStorage` and `sessionStorage`?**

Both are key-value stores scoped to the origin. `localStorage` persists until something clears it and
is shared across every tab of that origin. `sessionStorage` is wiped when the tab closes and is
isolated to that one tab, which is what makes it right for a form draft. Only `localStorage` fires the
`storage` event, so only it can drive cross-tab sync.

**Q: Why should a JWT not go in `localStorage`?**

Because every script on the page can read it, including a compromised third-party dependency, so a
single XSS exfiltrates the session. An `HttpOnly` cookie is not reachable from JavaScript at all, which
means it survives an XSS that `localStorage` would not. The trade is that cookies bring CSRF into scope,
which `SameSite` and a token pattern handle.

**Q: How do you sync state across tabs?**

Write to `localStorage` in one tab and listen for `storage` in the others, remembering that the writing
tab never hears its own event — so it has to apply the change locally as well. For two-way messaging
between same-origin contexts, `BroadcastChannel` does the same job without using storage as a bus.

**Q: What happens when you hit the quota, and how would you find out before you do?**

`setItem` throws a `QuotaExceededError`, so writes that can grow need a `try`/`catch` and a cleanup
pass — least-recently-used, a TTL sweep, or dropping a key prefix — before retrying.
`navigator.storage.estimate()` reports usage and quota across IndexedDB, the Cache API and web storage,
which is how you find out ahead of the failure rather than during it.

**Q: When would you choose IndexedDB instead?**

When any one of four things is true: more than a few megabytes, structured queries or indexes, binary
data such as a `Blob`, or a read large enough that doing it synchronously would cost a frame.
`localStorage` is right for a handful of small strings and wrong for everything past that.

## What to Read Next

- [Chapter ?? — IndexedDB](#ch-indexeddb) — the asynchronous, indexed store to graduate to
- [Chapter ?? — Cookies and SameSite](#ch-cookies-same-site) — where session tokens belong, and what
  `SameSite` actually protects
- [Chapter ?? — XSS Prevention](#ch-xss-prevention) — the attack that makes the token rule matter
