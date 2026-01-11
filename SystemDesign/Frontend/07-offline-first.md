# Offline-First Architecture

## Overview
Offline-first applications work seamlessly regardless of network connectivity. They prioritize local data and sync with the server when available, providing a better user experience especially on unreliable networks or mobile devices.

## Core Concepts

### 💡 **Progressive Web Apps (PWA)**

Web applications that use modern web capabilities to provide app-like experiences.

**Key Features:**
- **Installable**: Add to home screen
- **Offline capable**: Work without network
- **Re-engageable**: Push notifications
- **Responsive**: Work on any device
- **Safe**: Served via HTTPS

### 💡 **Service Workers**

**What are Service Workers?**
Service workers are JavaScript files that run in the background, separate from your web page, acting as a programmable network proxy. They intercept network requests and can respond with cached data, enabling offline functionality.

**Key Characteristics:**
- Runs on a separate thread (doesn't block main thread)
- Can intercept and modify network requests
- Has access to Cache API and IndexedDB
- Cannot directly access the DOM
- Requires HTTPS (except localhost)
- Event-driven (install, activate, fetch)

**Service Worker Lifecycle:**
1. **Registration**: Page registers service worker
2. **Installation**: Service worker downloads and installs
3. **Activation**: Service worker takes control
4. **Fetch**: Intercepts network requests
5. **Update**: New version triggers new lifecycle

**Why Service Workers Matter:**
- Enable offline-first experiences
- Dramatically improve performance (instant loads from cache)
- Enable background sync
- Enable push notifications
- Foundation for Progressive Web Apps (PWAs)

**Caching Strategies** (implemented in fetch handler):
1. **Cache First**: Try cache, fallback to network (static assets)
2. **Network First**: Try network, fallback to cache (API calls)
3. **Stale While Revalidate**: Return cache, update in background
4. **Network Only**: Always fetch from network
5. **Cache Only**: Only use cache (offline-only content)

JavaScript that runs in the background, separate from the web page, enabling offline functionality.

```javascript
// sw.js - Service Worker
const CACHE_NAME = 'app-v1';
const urlsToCache = [
  '/',
  '/styles/main.css',
  '/scripts/app.js',
  '/images/logo.png'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return response
        if (response) {
          return response;
        }

        return fetch(event.request).then((response) => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
```

### Registering Service Worker

```javascript
// main.js - Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered:', registration);

        // Check for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              if (confirm('New version available. Reload?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      })
      .catch((error) => {
        console.log('SW registration failed:', error);
      });
  });

  // Handle service worker updates
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}
```

## Caching Strategies

Different caching approaches optimized for various content types, balancing freshness with offline availability.

### 1. Cache First (Cache Falling Back to Network)

Best for static assets that don't change often.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return from cache if available
        if (response) {
          return response;
        }

        // Otherwise fetch from network
        return fetch(event.request);
      })
  );
});
```

### 2. Network First (Network Falling Back to Cache)

Prioritizes fresh data from the network, using cached version only when offline for dynamic content. Best for dynamic content where freshness is important.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Update cache with fresh response
        const responseClone = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseClone);
          });

        return response;
      })
      .catch(() => {
        // Network failed, return from cache
        return caches.match(event.request);
      })
  );
});
```

### 3. Stale While Revalidate

Serves cached content immediately for fast response while simultaneously fetching fresh data in the background. Serve from cache immediately, update cache in background.

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // Update cache with fresh response
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });

        // Return cached response immediately, or wait for network
        return cachedResponse || fetchPromise;
      });
    })
  );
});
```

### 4. Network Only

Never uses cache, always fetching fresh data from network for real-time or sensitive content. Always fetch from network (e.g., analytics).

```javascript
self.addEventListener('fetch', (event) => {
  // Only for analytics endpoints
  if (event.request.url.includes('/analytics')) {
    event.respondWith(fetch(event.request));
  }
});
```

### 5. Cache Only

Serves content exclusively from cache, ignoring network completely for maximum offline reliability. Only serve from cache (pre-cached assets).

```javascript
self.addEventListener('fetch', (event) => {
  event.respondWith(caches.match(event.request));
});
```

## Offline Data Management

Strategies for storing and managing application data locally for offline access and synchronization.

### IndexedDB

Browser-based NoSQL database for storing large amounts of structured data with indexing and transactions.

Low-level API for client-side storage of structured data.

```javascript
// Open database
const openDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MyDatabase', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores
      if (!db.objectStoreNames.contains('todos')) {
        const objectStore = db.createObjectStore('todos', {
          keyPath: 'id',
          autoIncrement: true
        });

        objectStore.createIndex('completed', 'completed', { unique: false });
        objectStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });
};

// Add data
const addTodo = async (todo) => {
  const db = await openDB();
  const transaction = db.transaction(['todos'], 'readwrite');
  const objectStore = transaction.objectStore('todos');

  return new Promise((resolve, reject) => {
    const request = objectStore.add({
      ...todo,
      createdAt: Date.now(),
      synced: false
    });

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Get all data
const getTodos = async () => {
  const db = await openDB();
  const transaction = db.transaction(['todos'], 'readonly');
  const objectStore = transaction.objectStore('todos');

  return new Promise((resolve, reject) => {
    const request = objectStore.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// Update data
const updateTodo = async (id, updates) => {
  const db = await openDB();
  const transaction = db.transaction(['todos'], 'readwrite');
  const objectStore = transaction.objectStore('todos');

  return new Promise((resolve, reject) => {
    const getRequest = objectStore.get(id);

    getRequest.onsuccess = () => {
      const todo = getRequest.result;
      const updatedTodo = { ...todo, ...updates, synced: false };

      const putRequest = objectStore.put(updatedTodo);

      putRequest.onsuccess = () => resolve(updatedTodo);
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Delete data
const deleteTodo = async (id) => {
  const db = await openDB();
  const transaction = db.transaction(['todos'], 'readwrite');
  const objectStore = transaction.objectStore('todos');

  return new Promise((resolve, reject) => {
    const request = objectStore.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
```

### Wrapper Libraries

Higher-level libraries simplifying IndexedDB operations with cleaner APIs and better developer experience.

#### Dexie.js (IndexedDB Wrapper)

```javascript
import Dexie from 'dexie';

const db = new Dexie('MyDatabase');

db.version(1).stores({
  todos: '++id, text, completed, createdAt, synced'
});

// Add
await db.todos.add({
  text: 'Buy groceries',
  completed: false,
  createdAt: Date.now(),
  synced: false
});

// Get all
const todos = await db.todos.toArray();

// Get with filter
const completed = await db.todos
  .where('completed')
  .equals(true)
  .toArray();

// Update
await db.todos.update(id, { completed: true, synced: false });

// Delete
await db.todos.delete(id);

// Bulk operations
await db.todos.bulkAdd([todo1, todo2, todo3]);
```

#### LocalForage (Simple API)

```javascript
import localforage from 'localforage';

// Configure
localforage.config({
  driver: [
    localforage.INDEXEDDB,
    localforage.WEBSQL,
    localforage.LOCALSTORAGE
  ],
  name: 'myApp'
});

// Set item
await localforage.setItem('todos', todos);

// Get item
const todos = await localforage.getItem('todos');

// Remove item
await localforage.removeItem('todos');

// Clear all
await localforage.clear();

// Iterate
await localforage.iterate((value, key) => {
  console.log(key, value);
});
```

## Sync Strategies

Techniques for synchronizing local and remote data to keep offline changes in sync with the server.

### Background Sync

Service Worker API enabling deferred network requests that retry automatically until successful, even after page close.

Defer actions until user has connectivity.

```javascript
// Register sync in service worker
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-todos') {
    event.waitUntil(syncTodos());
  }
});

async function syncTodos() {
  const db = await openDB();
  const transaction = db.transaction(['todos'], 'readwrite');
  const objectStore = transaction.objectStore('todos');

  // Get unsynced todos
  const index = objectStore.index('synced');
  const unsyncedTodos = await getAllFromIndex(index, false);

  // Sync each todo
  for (const todo of unsyncedTodos) {
    try {
      await fetch('/api/todos', {
        method: 'POST',
        body: JSON.stringify(todo),
        headers: { 'Content-Type': 'application/json' }
      });

      // Mark as synced
      await objectStore.put({ ...todo, synced: true });
    } catch (error) {
      console.error('Sync failed:', error);
      // Will retry on next sync event
    }
  }
}

// Client code - register sync
if ('serviceWorker' in navigator && 'sync' in self.registration) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.sync.register('sync-todos');
  });
}
```

### Periodic Background Sync

Sync data at regular intervals.

```javascript
// Register periodic sync
if ('periodicSync' in self.registration) {
  navigator.serviceWorker.ready.then((registration) => {
    registration.periodicSync.register('sync-content', {
      minInterval: 24 * 60 * 60 * 1000  // 24 hours
    });
  });
}

// Service worker
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'sync-content') {
    event.waitUntil(syncContent());
  }
});

async function syncContent() {
  const response = await fetch('/api/content');
  const data = await response.json();

  const cache = await caches.open('content-cache');
  await cache.put('/api/content', new Response(JSON.stringify(data)));
}
```

### Manual Sync

```javascript
// React component with manual sync
function TodoList() {
  const [todos, setTodos] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Load from IndexedDB
    loadTodos();

    // Listen to online/offline events
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadTodos = async () => {
    const todosFromDB = await getTodos();
    setTodos(todosFromDB);
  };

  const handleOnline = () => {
    setIsOnline(true);
    syncTodos();
  };

  const handleOffline = () => {
    setIsOnline(false);
  };

  const syncTodos = async () => {
    setIsSyncing(true);

    try {
      // Get unsynced todos
      const unsyncedTodos = todos.filter(t => !t.synced);

      // Sync with server
      for (const todo of unsyncedTodos) {
        await fetch('/api/todos', {
          method: 'POST',
          body: JSON.stringify(todo),
          headers: { 'Content-Type': 'application/json' }
        });

        // Update local DB
        await updateTodo(todo.id, { synced: true });
      }

      // Reload todos
      await loadTodos();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const addTodo = async (text) => {
    const newTodo = {
      text,
      completed: false,
      createdAt: Date.now(),
      synced: false
    };

    // Add to local DB
    const id = await addTodoToDB(newTodo);

    // Update UI optimistically
    setTodos([...todos, { ...newTodo, id }]);

    // Sync if online
    if (isOnline) {
      try {
        await fetch('/api/todos', {
          method: 'POST',
          body: JSON.stringify(newTodo),
          headers: { 'Content-Type': 'application/json' }
        });

        await updateTodo(id, { synced: true });
      } catch (error) {
        console.error('Failed to sync:', error);
      }
    }
  };

  return (
    <div>
      <div className="sync-status">
        {!isOnline && '� Offline'}
        {isSyncing && '= Syncing...'}
        {isOnline && !isSyncing && ' Synced'}
      </div>

      <TodoInput onAdd={addTodo} />

      <ul>
        {todos.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            className={!todo.synced ? 'unsynced' : ''}
          />
        ))}
      </ul>

      {!isOnline && todos.some(t => !t.synced) && (
        <div className="warning">
          You have unsynced changes. They will sync when you're back online.
        </div>
      )}
    </div>
  );
}
```

## Conflict Resolution

### Last Write Wins

```javascript
async function syncWithLastWriteWins(localData, serverId) {
  const serverData = await fetch(`/api/data/${serverId}`).then(r => r.json());

  if (localData.updatedAt > serverData.updatedAt) {
    // Local is newer, push to server
    await fetch(`/api/data/${serverId}`, {
      method: 'PUT',
      body: JSON.stringify(localData)
    });

    return localData;
  } else {
    // Server is newer, update local
    await updateLocalData(serverId, serverData);
    return serverData;
  }
}
```

### Operational Transform

```javascript
// For collaborative editing
function applyOperation(text, operation) {
  const { position, type, char } = operation;

  if (type === 'insert') {
    return text.slice(0, position) + char + text.slice(position);
  } else if (type === 'delete') {
    return text.slice(0, position) + text.slice(position + 1);
  }

  return text;
}

function transformOperation(op1, op2) {
  // Transform op1 against op2
  if (op1.position < op2.position) {
    return op1;
  } else if (op1.position > op2.position) {
    return {
      ...op1,
      position: op1.position + (op2.type === 'insert' ? 1 : -1)
    };
  } else {
    // Concurrent operations at same position
    // Apply tiebreaker (e.g., client ID)
    return op1;
  }
}
```

### CRDTs (Conflict-free Replicated Data Types)

```javascript
// Using automerge library
import * as Automerge from 'automerge';

// Initialize document
let doc1 = Automerge.from({
  todos: []
});

// Make changes
doc1 = Automerge.change(doc1, 'Add todo', doc => {
  doc.todos.push({
    id: uuid(),
    text: 'Buy groceries',
    completed: false
  });
});

// Another client makes concurrent changes
let doc2 = Automerge.change(doc1, 'Add another todo', doc => {
  doc.todos.push({
    id: uuid(),
    text: 'Walk dog',
    completed: false
  });
});

// Merge changes
const merged = Automerge.merge(doc1, doc2);
// Both todos exist, no conflicts
```

## PWA Manifest

```json
{
  "name": "My Offline App",
  "short_name": "MyApp",
  "description": "An offline-first application",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#2196f3",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

```html
<!-- Include in HTML -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#2196f3">
```

## Interview Questions

**Q: What's the difference between localStorage, sessionStorage, and IndexedDB?**

A:
- **localStorage**: 5-10MB, synchronous, key-value strings, persists forever
- **sessionStorage**: Same as localStorage but cleared when tab closes
- **IndexedDB**: 50MB+, asynchronous, structured data with indexes, persists forever

Use IndexedDB for large amounts of structured data in offline-first apps.

**Q: Explain different caching strategies and when to use each.**

A:
- **Cache First**: Static assets (CSS, JS, images)
- **Network First**: Dynamic content (API responses, user data)
- **Stale While Revalidate**: Balance between performance and freshness
- **Network Only**: Analytics, real-time data
- **Cache Only**: App shell, pre-cached resources

**Q: How do you handle data conflicts in offline-first apps?**

A: Multiple strategies:
1. **Last Write Wins**: Simple, can lose data
2. **Operational Transform**: Complex, good for collaborative editing
3. **CRDTs**: Automatically merge, more complex implementation
4. **Manual Resolution**: Show user conflicts, let them decide

Choice depends on data type and business requirements.

**Q: What are the limitations of service workers?**

A:
- Only works over HTTPS (except localhost)
- Can't access DOM directly
- Can be terminated by browser anytime
- Limited storage
- Not supported in older browsers
- Can't make synchronous requests

## Best Practices

**Service Workers:**
- Cache strategically (don't cache everything)
- Version caches and clean up old ones
- Implement update notification
- Handle errors gracefully
- Test offline functionality

**Data Management:**
- Use IndexedDB for structured data
- Implement data expiration
- Monitor storage usage
- Handle quota exceeded errors
- Sync strategically (batch operations)

**User Experience:**
- Show online/offline status
- Indicate unsynced changes
- Provide offline fallbacks
- Show sync progress
- Handle conflicts gracefully

**Performance:**
- Lazy load service worker
- Minimize cache size
- Use compression
- Implement cache expiration
- Monitor performance metrics

## Summary

- Offline-first improves UX on unreliable networks
- Service workers enable offline functionality
- Multiple caching strategies for different content types
- IndexedDB for client-side data storage
- Background sync for deferred operations
- Conflict resolution strategies vary by use case
- PWAs combine offline capabilities with app-like experience

---
[� Back to SystemDesign](../README.md)
