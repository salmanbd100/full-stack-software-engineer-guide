# IndexedDB

## Table of Contents
- [What It Is](#what-it-is)
- [When to Reach for IndexedDB](#when-to-reach-for-indexeddb)
- [Core Concepts](#core-concepts)
- [Raw API: Open and Migrate](#raw-api-open-and-migrate)
- [CRUD in a Transaction](#crud-in-a-transaction)
- [Indexes & Queries](#indexes--queries)
- [The `idb` Library (What You'll Actually Use)](#the-idb-library-what-youll-actually-use)
- [IndexedDB vs Other Storage](#indexeddb-vs-other-storage)
- [Common Pitfalls](#common-pitfalls)
- [Interview Questions](#interview-questions)

---

## What It Is

**IndexedDB** is a **transactional, object-based, asynchronous** database in the browser. It stores JavaScript objects (including Blobs and Files) under the same-origin policy.

**Key properties:**

- **Asynchronous** — every operation returns a request; UI never blocks
- **Transactional** — operations group into transactions (ACID-style within the page)
- **Object-store based** — closer to MongoDB than SQL; keys map to whole objects
- **Indexes** — fast lookups on object properties
- **Large** — typically tens to hundreds of MB; up to gigabytes on some browsers

---

## When to Reach for IndexedDB

| Use IndexedDB when… | Stick with localStorage when… |
|----------------------|--------------------------------|
| > 5 MB of data | < 5 MB of small strings |
| Storing Blobs / Files | Storing flags or prefs |
| You need indexed queries | A single lookup is enough |
| Offline-first / PWA cache | One-off settings |
| Background sync queue | — |

**Typical interview-grade examples:** offline email/notes app, PWA asset cache, large customer dashboard data, mobile web app working without network.

---

## Core Concepts

| Term | Meaning |
|------|---------|
| **Database** | Named container, has a numeric `version` |
| **Object store** | Like a table — holds objects of one kind |
| **Key** | Unique ID per record. Can auto-increment or come from a `keyPath` |
| **Index** | Secondary lookup on a property (`by-email`, `by-date`) |
| **Transaction** | Scope for reads/writes. `readonly` or `readwrite` |
| **Cursor** | Iterator over many records, one at a time |

> Schema changes (new stores, new indexes) require a **version upgrade**. They run inside an `onupgradeneeded` handler.

---

## Raw API: Open and Migrate

```typescript
interface Note {
  id: number;
  title: string;
  body: string;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("notes-app", 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("notes")) {
        const store = db.createObjectStore("notes", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("by-updatedAt", "updatedAt");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
```

> The raw API is event-based and verbose — that's why almost everyone wraps it. We'll show the `idb` library further down.

---

## CRUD in a Transaction

Every read or write goes through a transaction. The transaction commits **automatically** when its scope finishes; you cannot `await` between operations on the same transaction without losing it.

```typescript
async function addNote(db: IDBDatabase, note: Omit<Note, "id">): Promise<number> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readwrite");
    const store = tx.objectStore("notes");
    const req = store.add(note);

    req.onsuccess = () => resolve(req.result as number);
    tx.onerror = () => reject(tx.error);
  });
}

async function getNote(db: IDBDatabase, id: number): Promise<Note | undefined> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const req = tx.objectStore("notes").get(id);
    req.onsuccess = () => resolve(req.result as Note | undefined);
    req.onerror = () => reject(req.error);
  });
}
```

> ⚠️ Don't `await` a `fetch()` in the middle of a transaction — the transaction will close before your next IndexedDB call runs.

---

## Indexes & Queries

Indexes let you look up by something other than the primary key.

```typescript
function recentNotes(db: IDBDatabase, since: number): Promise<Note[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction("notes", "readonly");
    const index = tx.objectStore("notes").index("by-updatedAt");
    const range = IDBKeyRange.lowerBound(since);
    const req = index.getAll(range);

    req.onsuccess = () => resolve(req.result as Note[]);
    req.onerror = () => reject(req.error);
  });
}
```

**Common `IDBKeyRange` patterns:**

| Need | Range |
|------|-------|
| Exact match | `IDBKeyRange.only(value)` |
| `>= x` | `IDBKeyRange.lowerBound(x)` |
| `<= x` | `IDBKeyRange.upperBound(x)` |
| `x ≤ k ≤ y` | `IDBKeyRange.bound(x, y)` |

For very large result sets, use a **cursor** instead of `getAll` to stream records.

---

## The `idb` Library (What You'll Actually Use)

Jake Archibald's [`idb`](https://github.com/jakearchibald/idb) gives you the same API behind promises and TypeScript generics. This is what production code looks like.

```typescript
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface NotesDB extends DBSchema {
  notes: {
    key: number;
    value: Note;
    indexes: { "by-updatedAt": number };
  };
}

async function getDB(): Promise<IDBPDatabase<NotesDB>> {
  return openDB<NotesDB>("notes-app", 1, {
    upgrade(db) {
      const store = db.createObjectStore("notes", {
        keyPath: "id",
        autoIncrement: true,
      });
      store.createIndex("by-updatedAt", "updatedAt");
    },
  });
}

// Usage — clean, typed, awaitable
const db = await getDB();
const id = await db.add("notes", { title: "Hi", body: "...", updatedAt: Date.now() });
const note = await db.get("notes", id);              // typed as Note | undefined
const recent = await db.getAllFromIndex("notes", "by-updatedAt", IDBKeyRange.lowerBound(Date.now() - 86400_000));
await db.put("notes", { ...note!, body: "edited", updatedAt: Date.now() });
await db.delete("notes", id);
```

> For interviews: knowing both APIs is fine — but **mentioning `idb`** signals that you've actually shipped with IndexedDB.

---

## IndexedDB vs Other Storage

| | localStorage | sessionStorage | IndexedDB | Cache API |
|--|--------------|----------------|-----------|-----------|
| **API** | Sync | Sync | Async | Async |
| **Size** | ~5 MB | ~5 MB | 100s of MB+ | 100s of MB+ |
| **Data types** | Strings | Strings | Objects, Blobs | `Request` / `Response` |
| **Queries** | Manual | Manual | Indexed | URL keys |
| **Use for** | Small prefs | Tab-local draft | App data, offline records | HTTP responses (PWA) |

> The **Cache API** is purpose-built for caching HTTP responses (used by service workers). For arbitrary structured data, IndexedDB is the right tool.

---

## Common Pitfalls

- **Transactions die on `await` to non-IndexedDB code.** Wrap all the IndexedDB calls together, then `await` once at the end.
- **`onupgradeneeded` is the only place to change schema.** Trying to `createObjectStore` outside it throws.
- **Errors don't reject — they fire `onerror`.** When using the raw API, attach handlers; with `idb`, normal promise rejection works.
- **No string keys by default.** Specify `keyPath` (auto-extract from object) or `autoIncrement: true`.
- **Private/Incognito mode** may store in memory only (data lost on close) or refuse writes entirely.
- **Storage can be evicted.** Use `navigator.storage.persist()` to request that your data isn't auto-cleared under pressure.

---

## Interview Questions

### Q: When would you choose IndexedDB over `localStorage`?

When you need any of: more than ~5 MB, structured queries on object fields, Blob/File storage, or non-blocking access in a hot path. `localStorage` is fine for a handful of small strings; everything bigger or richer belongs in IndexedDB.

### Q: Why is IndexedDB asynchronous?

To keep the main thread responsive. Browser storage lives on disk, and synchronous disk I/O on the UI thread freezes rendering and input. IndexedDB returns request objects that fire `onsuccess` / `onerror`, so reads and writes never block animations or scroll.

### Q: How do schema migrations work?

Each database has a version number. When you call `indexedDB.open(name, newVersion)` with a higher number than what's installed, the browser fires `onupgradeneeded`. **All schema changes** — creating/deleting stores, adding indexes — must happen inside that handler. After it returns, you're at the new version.

### Q: What is a transaction in IndexedDB?

A scope for one or more operations on one or more stores, opened as `readonly` or `readwrite`. Operations inside commit together, or roll back together if any fails. The transaction commits automatically when its event-loop turn ends — so you can't `await` unrelated work in the middle without losing it.

### Q: How would you implement an offline-first feature?

1. **IndexedDB** holds local data + a pending-mutations queue.
2. UI reads/writes from IndexedDB first (fast, works offline).
3. A **service worker** intercepts requests; when offline, it returns cached responses from the Cache API.
4. On reconnect (via `online` event or **Background Sync**), the worker drains the mutation queue and replays it against the server.

### Q: What's the size limit?

It depends. Browsers grant per-origin quotas relative to total disk free space — often around 60% of free space split among all origins, capped per origin. Use `navigator.storage.estimate()` to read the current quota, and `navigator.storage.persist()` to ask for the data not to be evicted.

---

[← Previous: Cookies & SameSite](./02-cookies-same-site.md) | [Next: Browser Permissions →](./04-browser-permissions.md)
