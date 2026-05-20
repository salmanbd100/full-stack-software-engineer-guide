# Storage APIs: localStorage & sessionStorage

## Table of Contents
- [What They Are](#what-they-are)
- [localStorage vs sessionStorage](#localstorage-vs-sessionstorage)
- [Core API](#core-api)
- [Storing Objects](#storing-objects)
- [Cross-Tab Sync with Storage Events](#cross-tab-sync-with-storage-events)
- [Quota and Errors](#quota-and-errors)
- [Security: Why Not for Tokens](#security-why-not-for-tokens)
- [Patterns You'll See in Interviews](#patterns-youll-see-in-interviews)
- [Interview Questions](#interview-questions)

---

## What They Are

`localStorage` and `sessionStorage` are simple **key-value stores** built into the browser. Both store **strings only** under the same-origin policy. The API is **synchronous** — calls block the main thread until they finish.

```typescript
localStorage.setItem("theme", "dark");
const theme: string | null = localStorage.getItem("theme"); // "dark"
```

> Because they block the main thread, never read or write large amounts of data in a hot path (scroll, animation, render).

---

## localStorage vs sessionStorage

| Feature | `localStorage` | `sessionStorage` |
|---------|----------------|------------------|
| **Lifetime** | Until manually cleared | Until the tab is closed |
| **Scope** | Shared across tabs of the same origin | One tab only |
| **Cross-tab events** | ✅ Fires `storage` event | ❌ No |
| **Size** | ~5–10 MB per origin | ~5–10 MB per origin |

**When to use which:**

| Need | Pick |
|------|------|
| Theme, language, "remember me" prefs | `localStorage` |
| Form draft for the current tab | `sessionStorage` |
| Wizard / multi-step flow state | `sessionStorage` |
| Anything sensitive (tokens, PII) | **Neither** — use HttpOnly cookies |

---

## Core API

Both objects share the same five methods:

```typescript
localStorage.setItem("key", "value");
const value: string | null = localStorage.getItem("key"); // null if missing
localStorage.removeItem("key");
localStorage.clear(); // remove everything for this origin
const count: number = localStorage.length;
const firstKey: string | null = localStorage.key(0);
```

**Key rules:**

- ✅ `getItem` returns `null` when the key is missing — always handle it
- ✅ Values are **always strings** — booleans and numbers get coerced
- ❌ Don't trust the data — it can be edited from DevTools at any time

---

## Storing Objects

The API only stores strings, so use `JSON.stringify` / `JSON.parse` for everything else.

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
    return null; // Corrupt or hand-edited
  }
}
```

> Always wrap `JSON.parse` in `try/catch`. A user (or a buggy old version of your app) can leave invalid data behind.

---

## Cross-Tab Sync with Storage Events

When `localStorage` changes, **other tabs** of the same origin get a `storage` event. The tab that made the change does **not** fire the event in itself.

```typescript
window.addEventListener("storage", (e: StorageEvent) => {
  if (e.key === "theme") {
    document.documentElement.dataset.theme = e.newValue ?? "light";
  }
});
```

**Use cases:** sync theme, logout across tabs, broadcast "new message" pings.

> For **same-tab + cross-tab** messaging, prefer the `BroadcastChannel` API — it works in both directions.

---

## Quota and Errors

Most browsers cap web storage around **5–10 MB per origin**. Going over throws `QuotaExceededError`.

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
```

**Detect availability** (private/incognito mode can disable storage):

```typescript
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

For accurate quota numbers, use the `StorageManager` API:

```typescript
const { usage, quota } = await navigator.storage.estimate();
// usage and quota are in bytes (covers IndexedDB + Cache + Storage)
```

---

## Security: Why Not for Tokens

Anything in `localStorage` is **readable by any JavaScript running on the page** — including a third-party script that gets compromised.

```typescript
// ❌ Vulnerable to XSS — one bad <script> can exfiltrate this
localStorage.setItem("authToken", "eyJhbGci...");

// ✅ Server sets an HttpOnly cookie — JS cannot read it
// Set-Cookie: authToken=...; HttpOnly; Secure; SameSite=Strict
```

| Risk | Why It Matters |
|------|----------------|
| **XSS** | Any injected script reads `localStorage` directly |
| **No encryption** | Data sits as plain text in the user's profile |
| **No expiration** | Forgotten tokens live forever unless you clear them |

> Rule of thumb: if leaking the value would matter, it does not belong in `localStorage`.

---

## Patterns You'll See in Interviews

### Typed Storage Wrapper

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

const prefs = new TypedStorage<UserPrefs>("prefs");
prefs.set({ theme: "dark", fontSize: 14 });
```

### TTL (Time-to-Live)

`localStorage` has no expiration. Add your own:

```typescript
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
  if (!raw) return null;
  const { value, expiresAt } = JSON.parse(raw) as Wrapped<T>;
  if (Date.now() > expiresAt) {
    localStorage.removeItem(key);
    return null;
  }
  return value;
}
```

---

## Interview Questions

### Q: What's the difference between `localStorage` and `sessionStorage`?

Both are key-value stores scoped to the origin. `localStorage` persists until you clear it and is shared across all tabs of that origin. `sessionStorage` is wiped when the tab closes and is **isolated to that one tab**. Only `localStorage` fires the `storage` event for cross-tab sync.

### Q: Why shouldn't you store JWTs in `localStorage`?

`localStorage` is readable from any JavaScript on the page. A single XSS — even from a third-party dependency — can exfiltrate the token. HttpOnly cookies are inaccessible to JS, so they survive XSS. Use them for session/refresh tokens.

### Q: How do you sync state across tabs?

Write the value to `localStorage` from one tab and listen for the `storage` event in the others. The event fires in **other tabs only**, never the one that made the change. For two-way same-origin messaging, `BroadcastChannel` is simpler.

### Q: What happens when you hit the storage quota?

`setItem` throws `QuotaExceededError`. Wrap writes in `try/catch`, and clean up stale entries (LRU, TTL, or a key prefix sweep) before retrying. Use `navigator.storage.estimate()` to check usage proactively.

### Q: When would you choose IndexedDB over `localStorage`?

When you need: more than ~5 MB, structured queries, indexes, binary data (Blobs), or non-blocking access. `localStorage` is fine for a handful of small string values — for anything bigger or richer, reach for IndexedDB.

---

[← Back to Browser APIs](./README.md) | [Next: Cookies & SameSite →](./02-cookies-same-site.md)
