---
title: Web Storage and IndexedDB
part: 2
chapter: 7
slug: storage-apis
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-24
tags: [frontend, browser, apis, storage, indexeddb]
in_book: true
---

# Web Storage and IndexedDB {#ch-storage-apis}

> Choose between localStorage, sessionStorage and IndexedDB deliberately, and know why none of them should hold a token.

**In this chapter:** localStorage against sessionStorage · cross-tab `storage` events · quota and eviction · when IndexedDB earns its complexity · transactions and migrations

## 💡 The Core Idea

The browser offers two kinds of general storage. **Web storage** — `localStorage` and `sessionStorage`
— is a small, synchronous, string-only key-value cache. **IndexedDB** is an asynchronous database that
stores whole objects, indexes them, and holds hundreds of megabytes.

Neither is a security boundary. Any script on your page can read both. And neither is guaranteed to
survive: the browser may evict either one under storage pressure. So the rule for both is the same —
if losing the value would break the app, or leaking it would matter, it belongs somewhere else.

```typescript
localStorage.setItem("theme", "dark");
const theme: string | null = localStorage.getItem("theme"); // "dark", or null if missing
```

> ⚠️ **Moving target:** browsers now partition storage by top-level site, so the same origin embedded in
> two different parent sites sees two different stores. Eviction rules also differ per browser and keep
> changing. The durable principle: same-origin storage with no security boundary and no promise that
> it persists.

## How It Works

### The two web storage objects

| Feature | `localStorage` | `sessionStorage` |
| ------- | -------------- | ---------------- |
| **Lifetime** | Until something clears it | Until the tab closes |
| **Scope** | Shared by every tab of the origin | One tab only |
| **Cross-tab events** | ✅ Fires `storage` | ❌ No |
| **Size** | ~5–10 MB per origin | ~5–10 MB per origin |

Values are always strings, so objects go through `JSON`. The parse needs a `try`/`catch`. A user, or
an old version of your own app, can leave invalid JSON behind, and an uncaught parse error at start-up
takes the whole page down.

**A typed wrapper, which removes the ceremony from call sites:**

```typescript
class TypedStorage<T> {
  constructor(private readonly key: string, private readonly storage: Storage = localStorage) {}

  get(): T | null {
    const raw = this.storage.getItem(this.key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null; // Corrupt, or edited by hand in DevTools
    }
  }

  set(value: T): void {
    this.storage.setItem(this.key, JSON.stringify(value));
  }
}
```

### Cross-tab sync

A `localStorage` write fires a `storage` event in the **other** tabs of the same origin. It does not
fire in the tab that made the change. That is the detail interviewers ask about.

```typescript
window.addEventListener("storage", (e: StorageEvent): void => {
  if (e.key === "theme") document.documentElement.dataset.theme = e.newValue ?? "light";
});
```

This covers theme sync and logging out every tab at once. For messages that should also reach the
sending tab, `BroadcastChannel` is the simpler tool.

### Quota and eviction

A write over the quota throws `QuotaExceededError`. Private browsing can disable storage completely,
so a write inside a `try` is the only reliable availability check. `navigator.storage.estimate()`
reports real usage across web storage, IndexedDB and the Cache API together, so you can see the limit
coming. `navigator.storage.persist()` asks the browser not to evict — it is a request, not a promise.

### When IndexedDB earns its complexity

IndexedDB is awkward, and the awkwardness has one cause. Storage lives on disk, and a synchronous disk
read on the main thread freezes rendering and input. So every IndexedDB operation returns a request
and answers later.

| Term | Meaning |
| ---- | ------- |
| **Object store** | Like a table — holds objects of one kind |
| **Key** | Unique ID per record, from a `keyPath` or `autoIncrement` |
| **Index** | A second lookup on a property, such as `by-updatedAt` |
| **Transaction** | A `readonly` or `readwrite` scope that commits or rolls back as one |
| **Version** | A number. Schema changes happen only when it goes up |

Almost nobody uses the raw event-based API in production. The `idb` wrapper puts the same model behind
promises and TypeScript generics.

**Opening, migrating and querying with `idb`:**

```typescript
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface Note {
  id: number;
  title: string;
  updatedAt: number;
}

interface NotesDB extends DBSchema {
  notes: { key: number; value: Note; indexes: { "by-updatedAt": number } };
}

async function getDB(): Promise<IDBPDatabase<NotesDB>> {
  return openDB<NotesDB>("notes-app", 2, {
    // Runs only when the stored version is lower. The only place schema may change.
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore("notes", { keyPath: "id", autoIncrement: true });
      if (oldVersion < 2) db.transaction.objectStore("notes").createIndex("by-updatedAt", "updatedAt");
    },
  });
}

const db = await getDB();
const since: number = Date.now() - 86_400_000;
const recent: Note[] = await db.getAllFromIndex("notes", "by-updatedAt", IDBKeyRange.lowerBound(since));
```

The `oldVersion` checks are the migration pattern. Each step runs once, in order, so a user who skipped
three releases still reaches the current schema.

> ⚠️ A transaction commits when its event-loop turn ends. `await` a `fetch` in the middle of one and
> the transaction closes, so the next IndexedDB call throws. Fetch first, then open the transaction.

## When to Use It

| Need | Pick | Why |
| ---- | ---- | --- |
| Theme, language, a small preference | `localStorage` | Small, disposable, wanted in every tab |
| Form draft or wizard state for this tab | `sessionStorage` | Two tabs filling the same form must not collide |
| More than ~5 MB, queries, or `Blob`s | IndexedDB | Asynchronous, indexed, stores binary data |
| Offline records and a queue of pending writes | IndexedDB | Only it has transactions |
| HTTP responses a service worker replays | Cache API | Keyed by `Request`, returns a `Response` |
| Tokens, personal data, anything sensitive | **None of these** | An `HttpOnly` cookie, which script cannot read |

## Common Mistakes

**❌ Wrong — a token in `localStorage`:**

```typescript
// One injected script sends this to an attacker.
localStorage.setItem("authToken", "eyJhbGci...");
```

**✅ Right — a cookie JavaScript cannot read:**

```typescript
// Set by the server, never by client code:
// Set-Cookie: session=...; HttpOnly; Secure; SameSite=Lax
```

The first line fails three ways. An XSS reads it directly. It sits as plain text on disk. And it has
no expiry, so a forgotten token lives forever.

**❌ Wrong — reading web storage in a hot path.** The API is synchronous. A large `JSON.parse` during
scroll lands on the main thread and shows up as a dropped frame.

**❌ Wrong — changing the schema outside `upgrade`.** `createObjectStore` anywhere else throws. A new
store or index means a version bump, every time.

**❌ Wrong — trusting what comes back.** Users can edit every store in DevTools. Validate any shape you
depend on, as you would a server response.

## 🔑 Key Takeaways

- Web storage and IndexedDB are both readable by every script on the page and both evictable, so neither holds secrets or irreplaceable data.
- `localStorage` is shared across tabs and outlives them; `sessionStorage` is isolated to one tab and dies with it.
- The `storage` event reaches every tab except the one that wrote the value.
- IndexedDB is asynchronous because synchronous disk access would freeze the page, and it earns its cost past ~5 MB, for binary data, for queries, or for offline writes.
- Schema changes happen only inside the upgrade handler, and a transaction closes if you await unrelated work inside it.

## Interview Questions

**Q: What is the difference between `localStorage` and `sessionStorage`?**

Both are key-value stores scoped to the origin. `localStorage` persists until cleared and is shared by
every tab. `sessionStorage` is wiped when the tab closes and belongs to that tab alone, which makes it
right for a form draft. Only `localStorage` fires the `storage` event, so only it drives cross-tab sync.

**Q: Why should a JWT not go in `localStorage`?**

Every script on the page can read it, including a compromised third-party dependency, so one XSS
takes the session. An `HttpOnly` cookie is out of reach of JavaScript. The trade is that cookies bring
CSRF into scope, which `SameSite` and a token pattern handle.

**Q: When would you choose IndexedDB over `localStorage`?**

When any one of four things is true: more than a few megabytes, queries on object fields, binary data
such as a `Blob`, or a read large enough to cost a frame if it ran synchronously. For a handful of
small strings, IndexedDB is complexity with no return.

**Q: How do IndexedDB schema migrations work?**

Each database has a version. Opening it with a higher number fires the upgrade handler, and every
schema change must happen there. Branching on the old version runs each step once and in order, so a
user several releases behind still arrives at the current schema.

**Q: What happens when you hit the quota?**

The write throws `QuotaExceededError`, so any store that can grow needs a `try`/`catch` and a cleanup
pass, such as a TTL sweep or least-recently-used removal. `navigator.storage.estimate()` lets you see
the limit before you reach it, across every store at once.

## What to Read Next

- [Chapter ?? — Cookies and SameSite](#ch-cookies-same-site) — where session tokens belong, and what `SameSite` actually protects
- [Chapter ?? — Service Workers, Caching and Offline](#ch-service-workers) — the Cache API, and the offline write queue that lives in IndexedDB
- [Chapter ?? — XSS Prevention](#ch-xss-prevention) — the attack that makes the token rule matter
