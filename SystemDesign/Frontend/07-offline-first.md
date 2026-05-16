# Offline-First Architecture

## 💡 **Concept**

Offline-first applications treat the network as an enhancement, not a requirement. The app reads from a local cache and syncs when connectivity is available. This improves perceived performance even when online — local reads are instant.

**How to answer in an interview:** "I'd implement offline-first with a service worker for caching static assets and network-first strategies for API calls. For data, I'd use IndexedDB as a local store and sync to the server when online, handling conflicts with a last-write-wins or CRDT strategy depending on the requirements."

---

## Service Workers

A service worker is a JavaScript file that runs in a background thread. It intercepts all network requests and can respond from cache — enabling offline capability.

```typescript
// src/sw.ts — Service Worker
const STATIC_CACHE = "static-v1";
const API_CACHE = "api-v1";

const STATIC_ASSETS = ["/", "/index.html", "/styles/main.css", "/scripts/app.js"];

self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== API_CACHE)
          .map((k) => caches.delete(k))    // evict old cache versions
      )
    )
  );
});

self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstStrategy(request));
  } else {
    event.respondWith(cacheFirstStrategy(request));
  }
});
```

---

## Caching Strategies

| Strategy | Algorithm | Use For |
|----------|-----------|---------|
| **Cache First** | Cache → Network on miss | Static assets (JS, CSS, images) |
| **Network First** | Network → Cache on failure | API calls, fresh data |
| **Stale While Revalidate** | Cache immediately + refresh in background | Frequently-changing UI data |

```typescript
async function cacheFirstStrategy(request: Request): Promise<Response> {
  const cached = await caches.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  const cache = await caches.open(STATIC_CACHE);
  cache.put(request, response.clone());
  return response;
}

async function networkFirstStrategy(request: Request): Promise<Response> {
  try {
    const response = await fetch(request);
    const cache = await caches.open(API_CACHE);
    cache.put(request, response.clone());
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ error: "offline" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

---

## Service Worker Registration

```typescript
// Register in main app entry point
async function registerServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    registration.addEventListener("updatefound", () => {
      const newWorker = registration.installing;
      newWorker?.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          showUpdateBanner();    // prompt user to refresh
        }
      });
    });
  } catch (err) {
    console.error("Service worker registration failed", err);
  }
}
```

---

## IndexedDB for Local Storage

Use IndexedDB for structured offline data. It's async, supports transactions, and handles large datasets.

```typescript
const DB_NAME = "app-offline";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("todos")) {
        db.createObjectStore("todos", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function saveOffline(todo: Todo): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("todos", "readwrite");
    tx.objectStore("todos").put({ ...todo, syncPending: true });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
```

---

## Background Sync

Queue writes when offline. Sync automatically when connectivity returns.

```typescript
// Register a sync tag when saving offline
async function saveTodoWithSync(todo: Todo): Promise<void> {
  await saveOffline(todo);           // write to IndexedDB immediately
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register("sync-todos");  // schedule background sync
}

// Service worker handles the sync event
self.addEventListener("sync", (event: SyncEvent) => {
  if (event.tag === "sync-todos") {
    event.waitUntil(syncPendingTodos());
  }
});

async function syncPendingTodos(): Promise<void> {
  const db = await openDB();
  const pending = await getAllPending(db);   // todos where syncPending === true
  for (const todo of pending) {
    await fetch("/api/todos", { method: "POST", body: JSON.stringify(todo) });
    await markSynced(db, todo.id);
  }
}
```

---

## Conflict Resolution

When offline edits and server changes both occur, you need a resolution strategy.

| Strategy | How | When |
|----------|-----|------|
| **Last Write Wins** | Latest `updatedAt` timestamp wins | Simple data, low risk |
| **Server Wins** | Discard local changes | Read-mostly data |
| **Client Wins** | Override server | Offline-first inputs |
| **CRDT** | Merge without conflict by design | Collaborative editing |

```typescript
interface SyncPayload {
  id: string;
  data: unknown;
  clientUpdatedAt: number;   // client-side timestamp
  serverUpdatedAt?: number;  // returned from server
}

async function syncWithConflictResolution(payload: SyncPayload): Promise<void> {
  const response = await fetch(`/api/sync/${payload.id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
    headers: { "Content-Type": "application/json" },
  });

  if (response.status === 409) {
    const serverVersion = await response.json();
    // Last-write-wins: compare timestamps
    if (payload.clientUpdatedAt > serverVersion.updatedAt) {
      await forceUpdate(payload);
    } else {
      await applyServerVersion(serverVersion);
    }
  }
}
```

---

## Common Mistakes

❌ **No update notification** — users run stale service worker code indefinitely without a "refresh" prompt  
❌ **Caching POST requests** — never cache mutating requests; only GET  
❌ **No cache versioning** — old caches serve stale assets after deployment  
❌ **Ignoring conflict resolution** — concurrent offline edits corrupt data silently

**Key insight:**

> Even if offline-first isn't required, a cache-first service worker for static assets makes your app load faster for every user on every visit — it's a free performance win.

---
[← Back to SystemDesign](../README.md)
