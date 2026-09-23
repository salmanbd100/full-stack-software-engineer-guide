---
title: IndexedDB
part: 2
chapter: 9
slug: indexeddb
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [frontend, browser, apis, indexeddb]
in_book: true
---

# IndexedDB {#ch-indexeddb}

> Store structured data past the 5MB wall, and survive a schema change without losing it.

**In this chapter:** when it beats Web Storage · object stores and transactions · versioning and migrations · indexes and queries · the `idb` wrapper

## 💡 The Core Idea

IndexedDB is a transactional, object-based, asynchronous database that lives in the browser under the
same-origin policy. It stores whole JavaScript objects — including `Blob`s and `File`s — rather than
strings, it indexes their properties, and it holds hundreds of megabytes where web storage holds five.

The asynchrony is the design, not an inconvenience. Browser storage is on disk, and a synchronous disk
read on the main thread freezes rendering and input, so every operation returns a request object and
answers later. Everything awkward about the raw API follows from that one decision, and everything the
`idb` wrapper does is hide it.

## How It Works

### The vocabulary

| Term | Meaning |
|------|---------|
| **Database** | Named container, has a numeric `version` |
| **Object store** | Like a table — holds objects of one kind |
| **Key** | Unique ID per record. Can auto-increment or come from a `keyPath` |
| **Index** | Secondary lookup on a property (`by-email`, `by-date`) |
| **Transaction** | Scope for reads/writes. `readonly` or `readwrite` |
| **Cursor** | Iterator over many records, one at a time |

Schema changes — a new store, a new index — require a **version upgrade**, and they run inside an
`onupgradeneeded` handler. There is nowhere else they are allowed to happen.

### Opening and migrating

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

The raw API is event-based and verbose, which is why almost nobody uses it directly. The `idb` wrapper
below is what production code looks like.

### Reading and writing inside a transaction

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

### Indexes and queries

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

### The `idb` wrapper

[`idb`](https://github.com/jakearchibald/idb) gives you the same API behind promises and TypeScript
generics.

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

Knowing both APIs is fine for an interview, but naming `idb` unprompted signals that you have shipped
with IndexedDB rather than read about it.

## When to Use It

| | localStorage | sessionStorage | IndexedDB | Cache API |
|--|--------------|----------------|-----------|-----------|
| **API** | Sync | Sync | Async | Async |
| **Size** | ~5 MB | ~5 MB | 100s of MB+ | 100s of MB+ |
| **Data types** | Strings | Strings | Objects, Blobs | `Request` / `Response` |
| **Queries** | Manual | Manual | Indexed | URL keys |
| **Use for** | Small prefs | Tab-local draft | App data, offline records | HTTP responses (PWA) |

The **Cache API** is purpose-built for HTTP responses and is what a service worker reaches for. For
arbitrary structured data, IndexedDB is the right tool. The typical cases that justify it: an offline
notes or email client, a PWA asset cache, a dashboard holding a large customer dataset, and a mobile
web application expected to work with no network at all.

## Common Mistakes

**❌ `await`ing something that is not IndexedDB inside a transaction.** The transaction commits when
its event-loop turn ends, so a `fetch` in the middle closes it and the next call throws. Group the
IndexedDB calls together and await once, at the end.

**❌ Changing the schema outside `onupgradeneeded`.** `createObjectStore` anywhere else throws. A new
store or index means a version bump, every time.

**❌ Expecting the raw API to reject.** Errors fire `onerror` rather than rejecting a promise, so an
unhandled failure is silent. With `idb`, ordinary promise rejection works and this stops being true.

**❌ Assuming a key exists.** There are no string keys by default — specify a `keyPath` to extract one
from the object, or `autoIncrement: true`.

**❌ Treating storage as permanent.** Private browsing may keep everything in memory or refuse writes,
and the browser evicts under pressure. `navigator.storage.persist()` is a request, not a guarantee.

## 🔑 Key Takeaways

- IndexedDB is asynchronous because synchronous disk access on the main thread would freeze the page —
  every awkward part of the API follows from that.
- A transaction commits when its event-loop turn ends, so awaiting unrelated work inside one loses it.
- Schema changes happen only inside `onupgradeneeded`, and only on a version bump.
- Reach for it past roughly 5 MB, for binary data, for indexed queries, or when a read is big enough
  to cost a frame.
- Use `idb` in real code, and know the raw API well enough to explain what it is hiding.

## Interview Questions

**Q: When would you choose IndexedDB over `localStorage`?**

When you need any of: more than ~5 MB, structured queries on object fields, Blob/File storage, or non-blocking access in a hot path. `localStorage` is fine for a handful of small strings; everything bigger or richer belongs in IndexedDB.

**Q: Why is IndexedDB asynchronous?**

To keep the main thread responsive. Browser storage lives on disk, and synchronous disk I/O on the UI thread freezes rendering and input. IndexedDB returns request objects that fire `onsuccess` / `onerror`, so reads and writes never block animations or scroll.

**Q: How do schema migrations work?**

Each database has a version number. When you call `indexedDB.open(name, newVersion)` with a higher number than what's installed, the browser fires `onupgradeneeded`. **All schema changes** — creating/deleting stores, adding indexes — must happen inside that handler. After it returns, you're at the new version.

**Q: What is a transaction in IndexedDB?**

A scope for one or more operations on one or more stores, opened as `readonly` or `readwrite`. Operations inside commit together, or roll back together if any fails. The transaction commits automatically when its event-loop turn ends — so you can't `await` unrelated work in the middle without losing it.

**Q: How would you implement an offline-first feature?**

1. **IndexedDB** holds local data + a pending-mutations queue.
2. UI reads/writes from IndexedDB first (fast, works offline).
3. A **service worker** intercepts requests; when offline, it returns cached responses from the Cache API.
4. On reconnect (via `online` event or **Background Sync**), the worker drains the mutation queue and replays it against the server.

**Q: What is the size limit?**

It depends. Browsers grant per-origin quotas relative to total disk free space — often around 60% of free space split among all origins, capped per origin. Use `navigator.storage.estimate()` to read the current quota, and `navigator.storage.persist()` to ask for the data not to be evicted.

## What to Read Next

- [Chapter ?? — Web Storage APIs](#ch-storage-apis) — the smaller, synchronous store this one replaces
- [Chapter ?? — Service Workers](#ch-service-workers) — the other half of an offline-first feature
- [Chapter ?? — Caching and Offline](#ch-caching-and-offline) — the Cache API, and which data belongs
  in which store
