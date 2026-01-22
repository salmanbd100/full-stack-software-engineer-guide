# Background Sync API

## Overview

The Background Sync API enables web applications to defer actions until the user has a stable internet connection. This is a critical PWA feature that allows applications to reliably sync data even when users are temporarily offline. Unlike push notifications that rely on external servers, background sync schedules synchronization tasks that persist across browser sessions.

---

## Table of Contents

- [What is Background Sync](#what-is-background-sync)
- [One-Time Sync](#one-time-sync)
- [Periodic Background Sync](#periodic-background-sync)
- [Use Cases](#use-cases)
- [Implementation Steps](#implementation-steps)
- [Tag-Based Sync](#tag-based-sync)
- [Testing Background Sync](#testing-background-sync)
- [Browser Support](#browser-support)
- [Workbox Integration](#workbox-integration)
- [Error Handling & Retries](#error-handling--retries)
- [Interview Questions](#interview-questions)

---

## What is Background Sync

### 💡 **Core Concept**

Background Sync allows Service Workers to schedule background synchronization tasks. When a sync event is triggered, the Service Worker wakes up and attempts to complete pending tasks.

**How It Works:**

```
User Action (offline)
    ↓
Save to IndexedDB
    ↓
Register sync tag
    ↓
System monitors connection
    ↓
Connection restored
    ↓
Service Worker receives sync event
    ↓
Process queued tasks
```

---

### 💡 **Key Characteristics**

| Feature | Benefit |
|---------|---------|
| **Reliability** | Tasks persist across browser restarts |
| **Automatic Retry** | System retries when connection returns |
| **Deferred Execution** | Work defers until conditions are met |
| **System-Managed** | OS handles retry timing efficiently |
| **Battery Efficient** | No polling required |
| **Guaranteed Delivery** | Data syncs when online |

---

### 💡 **Comparison with Other Approaches**

| Approach | How It Works | Reliability | Battery | Best For |
|----------|--------------|-------------|---------|----------|
| **Polling** | Request server every N seconds | Low | Poor | Real-time needs |
| **WebSockets** | Persistent connection | Medium | Poor | Live updates |
| **Background Sync** | Sync when online | Very High | Good | Offline-first apps |

**Key Insight:**
> Background Sync is the only approach that works across browser restarts. Data queued offline will sync even if the user closes and reopens the browser.

---

## One-Time Sync

### 💡 **What is One-Time Sync?**

Registers a single synchronization task that fires once when connectivity is restored.

**Flow:**

```
1. User performs action (submit form)
2. Network fails
3. Save data to IndexedDB
4. Register sync tag: 'sync-forms'
5. User goes online
6. Service Worker receives sync event
7. Process and send queued data
8. Remove from queue on success
```

---

### 💡 **When to Use One-Time Sync**

| Use For | Avoid For |
|---------|-----------|
| ✅ Form submissions | ❌ Real-time data |
| ✅ Chat messages | ❌ Data that expires quickly |
| ✅ File uploads | ❌ Frequent small updates |
| ✅ Order processing | ❌ Non-critical logging |
| ✅ User actions | ❌ Streaming data |

---

### 💡 **Basic Implementation**

**Client-Side (main.js):**

```javascript
async function submitFormOffline(formData) {
  try {
    // Try to send immediately
    const response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    // Network error - save for background sync
    console.log('Offline - queuing for sync');

    // Save to IndexedDB
    const db = await openDB('app-db', 1);
    await db.add('pending-forms', {
      id: Date.now(),
      data: formData,
      timestamp: new Date().toISOString()
    });

    // Register sync tag
    if ('SyncManager' in window) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-forms');
      return { queued: true, message: 'Will send when online' };
    }
  }
}
```

**Service Worker (sw.js):**

```javascript
self.addEventListener('sync', event => {
  console.log('Sync event:', event.tag);

  if (event.tag === 'sync-forms') {
    event.waitUntil(syncPendingForms());
  }
});

async function syncPendingForms() {
  const db = await openDB('app-db', 1);
  const forms = await db.getAll('pending-forms');

  for (const form of forms) {
    try {
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.data)
      });

      if (response.ok) {
        // Remove from queue
        await db.delete('pending-forms', form.id);
        console.log('Synced:', form.id);
      }
    } catch (error) {
      console.error('Sync failed, will retry:', error);
      throw error; // Rethrow to trigger retry
    }
  }
}
```

---

## Periodic Background Sync

### 💡 **What is Periodic Sync?**

Allows tasks to run periodically (e.g., every 24 hours) even when the app is not open.

| Aspect | One-Time Sync | Periodic Sync |
|--------|---------------|---------------|
| **Trigger** | User action / connectivity | Time interval |
| **Frequency** | Once per registration | Repeating |
| **Use Case** | Forms, messages | Analytics, cache updates |
| **Permission** | No extra permission | Requires permission |
| **Min Interval** | N/A | System-controlled |

---

### 💡 **When to Use Periodic Sync**

| Use For | Why |
|---------|-----|
| ✅ Analytics batch upload | Send collected data daily |
| ✅ Cache updates | Refresh content periodically |
| ✅ News feed refresh | Keep content fresh |
| ✅ Configuration sync | Update app settings |

---

### 💡 **Implementation**

**Client-Side:**

```javascript
async function enablePeriodicSync() {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Periodic sync not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Request permission first
    const status = await navigator.permissions.query({
      name: 'periodic-background-sync'
    });

    if (status.state === 'granted') {
      await registration.periodicSync.register('daily-sync', {
        minInterval: 24 * 60 * 60 * 1000 // 24 hours
      });
      console.log('Periodic sync registered');
    }
  } catch (error) {
    console.error('Failed to register periodic sync:', error);
  }
}
```

**Service Worker:**

```javascript
self.addEventListener('periodicsync', event => {
  console.log('Periodic sync:', event.tag);

  if (event.tag === 'daily-sync') {
    event.waitUntil(performDailySync());
  }
});

async function performDailySync() {
  // Update cache
  const cache = await caches.open('app-cache');
  await cache.add('/api/config');

  // Send analytics
  const analytics = await getStoredAnalytics();
  if (analytics.length > 0) {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      body: JSON.stringify({ events: analytics })
    });
    await clearStoredAnalytics();
  }
}
```

---

## Use Cases

### 💡 **Form Submissions**

| Step | Action |
|------|--------|
| 1 | User fills form |
| 2 | Save to IndexedDB |
| 3 | Try immediate send |
| 4 | On failure, register sync |
| 5 | Show "Will sync when online" |
| 6 | Sync event fires |
| 7 | Send and clear queue |

```javascript
class FormManager {
  async submitForm(formData) {
    await this.saveLocal(formData);

    try {
      const response = await this.sendToServer(formData);
      await this.removeLocal(formData.id);
      return response;
    } catch (error) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-forms');
      return { queued: true };
    }
  }
}
```

---

### 💡 **Chat Messages**

| Status | Meaning |
|--------|---------|
| `pending` | Saved locally, not sent |
| `sent` | Delivered to server |
| `failed` | Permanent failure |

```javascript
class ChatManager {
  async sendMessage(conversationId, text) {
    const message = {
      id: Date.now(),
      conversationId,
      text,
      timestamp: new Date().toISOString(),
      status: 'pending'
    };

    // Save and display immediately
    await this.saveMessage(message);
    this.displayMessage(message);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify(message)
      });

      message.status = 'sent';
      await this.updateMessage(message);
    } catch (error) {
      // Queue for sync
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-messages');
    }
  }
}
```

---

### 💡 **Analytics Events**

Queue analytics offline, batch sync when online.

```javascript
class AnalyticsManager {
  async trackEvent(eventName, data) {
    const event = {
      name: eventName,
      data,
      timestamp: new Date().toISOString()
    };

    // Always queue first
    await this.queueEvent(event);

    // Try non-blocking send
    this.sendBatch().catch(() => {});
  }

  async sendBatch() {
    const events = await this.getQueuedEvents();
    if (events.length === 0) return;

    const response = await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ events })
    });

    if (response.ok) {
      await this.clearEvents(events.map(e => e.id));
    }
  }
}
```

---

## Implementation Steps

### 💡 **Step 1: Register Service Worker**

```javascript
// app.js
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered');
    return registration;
  } catch (error) {
    console.error('Registration failed:', error);
  }
}

document.addEventListener('DOMContentLoaded', registerServiceWorker);
```

---

### 💡 **Step 2: Set Up Sync Handlers**

```javascript
// sw.js
self.addEventListener('sync', event => {
  const handlers = {
    'sync-forms': syncForms,
    'sync-messages': syncMessages,
    'sync-data': syncData
  };

  if (event.tag in handlers) {
    event.waitUntil(handlers[event.tag]());
  }
});

async function syncForms() { /* ... */ }
async function syncMessages() { /* ... */ }
async function syncData() { /* ... */ }
```

---

### 💡 **Step 3: Handle Online/Offline Events**

```javascript
class OfflineHandler {
  constructor() {
    this.online = navigator.onLine;
    window.addEventListener('online', () => this.handleOnline());
    window.addEventListener('offline', () => this.handleOffline());
  }

  handleOffline() {
    this.online = false;
    this.showBanner('You are offline. Changes will sync when online.');
  }

  async handleOnline() {
    this.online = true;
    this.hideBanner();

    // Trigger manual sync
    const registration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-all');
  }

  showBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.textContent = message;
    document.body.appendChild(banner);
  }

  hideBanner() {
    document.querySelector('.offline-banner')?.remove();
  }
}
```

---

## Tag-Based Sync

### 💡 **Organizing Sync Tags**

Use descriptive tags for different sync tasks.

| Tag | Purpose |
|-----|---------|
| `sync-forms` | Form submissions |
| `sync-messages` | Chat messages |
| `sync-photos` | Photo uploads |
| `sync-analytics` | Analytics events |

---

### 💡 **Implementation**

```javascript
// Constants
const SYNC_TAGS = {
  FORMS: 'sync-forms',
  MESSAGES: 'sync-messages',
  PHOTOS: 'sync-photos',
  ANALYTICS: 'sync-analytics'
};

// Register specific tag
async function registerSync(tag) {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register(tag);
}

// Service Worker: Handle all tags
self.addEventListener('sync', event => {
  const handlers = {
    [SYNC_TAGS.FORMS]: syncForms,
    [SYNC_TAGS.MESSAGES]: syncMessages,
    [SYNC_TAGS.PHOTOS]: syncPhotos,
    [SYNC_TAGS.ANALYTICS]: syncAnalytics
  };

  if (event.tag in handlers) {
    event.waitUntil(handlers[event.tag]());
  }
});

// Check pending tags
async function getPendingTags() {
  const registration = await navigator.serviceWorker.ready;
  return await registration.sync.getTags();
}
```

---

## Testing Background Sync

### 💡 **Manual Testing Steps**

| Step | Action |
|------|--------|
| 1 | Open DevTools → Network tab |
| 2 | Check "Offline" checkbox |
| 3 | Perform action (submit form) |
| 4 | Verify data in IndexedDB (Application tab) |
| 5 | Uncheck "Offline" |
| 6 | Check Service Worker console for sync event |
| 7 | Verify data sent to server |

---

### 💡 **DevTools Testing**

```javascript
// Check pending sync tags
async function debugSyncTags() {
  const registration = await navigator.serviceWorker.ready;
  const tags = await registration.sync.getTags();
  console.log('Pending sync tags:', tags);
}

// Manually trigger sync
async function triggerSync(tag) {
  const registration = await navigator.serviceWorker.ready;
  await registration.sync.register(tag);
  console.log(`Sync triggered: ${tag}`);
}
```

---

### 💡 **Automated Testing**

```javascript
describe('Background Sync', () => {
  test('queues data when offline', async () => {
    // Mock fetch to fail
    global.fetch = jest.fn().mockRejectedValue(new Error('Network'));

    // Mock sync registration
    const mockRegister = jest.fn();
    navigator.serviceWorker = {
      ready: Promise.resolve({
        sync: { register: mockRegister }
      })
    };

    // Submit form
    await submitForm({ name: 'test' });

    // Verify sync registered
    expect(mockRegister).toHaveBeenCalledWith('sync-forms');
  });

  test('syncs queued data', async () => {
    // Setup pending data
    const db = await openDB('app-db', 1);
    await db.add('pending-forms', { id: 1, data: { name: 'test' } });

    // Mock successful fetch
    global.fetch = jest.fn().mockResolvedValue({ ok: true });

    // Trigger sync
    await syncPendingForms();

    // Verify data cleared
    const pending = await db.getAll('pending-forms');
    expect(pending).toHaveLength(0);
  });
});
```

---

## Browser Support

### 💡 **Support Matrix**

| Browser | One-Time Sync | Periodic Sync | Notes |
|---------|---------------|---------------|-------|
| **Chrome 49+** | ✅ Yes | ✅ Yes (71+) | Full support |
| **Edge** | ✅ Yes | ✅ Yes | Same as Chrome |
| **Firefox** | ⚠️ Behind flag | ⚠️ Behind flag | Not default |
| **Safari** | ❌ No | ❌ No | No support |
| **Opera** | ✅ Yes | ✅ Yes | Same as Chrome |

---

### 💡 **Feature Detection**

```javascript
const backgroundSyncSupported = () => {
  return 'serviceWorker' in navigator && 'SyncManager' in window;
};

const periodicSyncSupported = () => {
  return 'periodicSync' in ServiceWorkerRegistration.prototype;
};

// Graceful degradation
async function initializeSync() {
  if (backgroundSyncSupported()) {
    console.log('Background sync supported');
  } else {
    console.log('Using fallback: polling');
    startPollingFallback();
  }
}
```

---

### 💡 **Fallback Strategy**

```javascript
class SyncManager {
  async queueAction(action) {
    await this.saveLocal(action);

    if (backgroundSyncSupported()) {
      // Use Background Sync
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-actions');
    } else {
      // Fallback: check online status and retry
      this.startPolling();
    }
  }

  startPolling() {
    setInterval(async () => {
      if (navigator.onLine) {
        await this.syncAll();
      }
    }, 30000); // Every 30 seconds
  }
}
```

---

## Workbox Integration

### 💡 **What Workbox Provides**

| Feature | Manual Implementation | Workbox |
|---------|----------------------|---------|
| Queue requests | Write IndexedDB code | `BackgroundSyncPlugin` |
| Retry logic | Implement manually | Automatic |
| Retention time | Track timestamps | `maxRetentionTime` option |
| Route matching | Custom logic | `registerRoute()` |

---

### 💡 **Basic Workbox Setup**

```javascript
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Create sync queue
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60 // 24 hours in minutes
});

// Apply to routes
registerRoute(
  ({ url }) => url.pathname === '/api/forms',
  new NetworkFirst({
    cacheName: 'forms-cache',
    plugins: [bgSyncPlugin]
  }),
  'POST'
);

registerRoute(
  ({ url }) => url.pathname === '/api/messages',
  new NetworkFirst({
    cacheName: 'messages-cache',
    plugins: [bgSyncPlugin]
  }),
  'POST'
);
```

---

### 💡 **Workbox with Next.js**

```javascript
// next.config.js
const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true
});

module.exports = withPWA({
  // Next.js config
});
```

```javascript
// sw.js (custom service worker)
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

precacheAndRoute(self.__WB_MANIFEST || []);

const bgSyncPlugin = new BackgroundSyncPlugin('sync-queue', {
  maxRetentionTime: 24 * 60
});

registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({
    plugins: [bgSyncPlugin]
  }),
  'POST'
);
```

---

## Error Handling & Retries

### 💡 **Exponential Backoff**

Retry with increasing delays: 1s → 2s → 4s → 8s.

```javascript
async function syncWithRetry(task, maxRetries = 5) {
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await task();
      return; // Success
    } catch (error) {
      if (attempt >= maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }

      console.log(`Attempt ${attempt} failed, waiting ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
      delay *= 2; // Double delay
    }
  }
}
```

---

### 💡 **Error Classification**

| Error Type | Should Retry? | Action |
|------------|---------------|--------|
| Network error | ✅ Yes | Wait and retry |
| 429 Rate Limited | ✅ Yes | Backoff longer |
| 400 Bad Request | ❌ No | Log and remove |
| 500 Server Error | ✅ Yes | Retry |
| 401 Unauthorized | ❌ No | Re-authenticate |

```javascript
function classifyError(error) {
  if (error.name === 'NetworkError') return 'RETRY';
  if (error.status === 429) return 'BACKOFF';
  if (error.status === 400) return 'PERMANENT';
  if (error.status === 500) return 'RETRY';
  if (error.status === 401) return 'AUTH';
  return 'UNKNOWN';
}
```

---

### 💡 **Complete Retry Handler**

```javascript
self.addEventListener('sync', event => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(
      syncWithRetry(async () => {
        const db = await openDB('app-db', 1);
        const forms = await db.getAll('pending-forms');

        for (const form of forms) {
          const response = await fetch('/api/submit', {
            method: 'POST',
            body: JSON.stringify(form.data)
          });

          const errorType = classifyError(response);

          if (response.ok) {
            await db.delete('pending-forms', form.id);
          } else if (errorType === 'PERMANENT') {
            // Remove permanently failed items
            await db.delete('pending-forms', form.id);
            console.error('Permanent failure:', form.id);
          } else {
            // Will retry on next sync
            throw new Error(`HTTP ${response.status}`);
          }
        }
      }, 3)
    );
  }
});
```

---

## Interview Questions

### 💡 **Question 1: What is Background Sync and why is it important?**

| Aspect | Answer |
|--------|--------|
| **Definition** | Web API that defers actions until stable connection |
| **Runs In** | Service Worker |
| **Key Benefit** | Persists across browser restarts |
| **Problem Solved** | Data loss when offline |
| **User Impact** | Seamless offline experience |

**Without Background Sync:**
- User submits form offline → Data lost if browser closes

**With Background Sync:**
- User submits form offline → Data queued → Syncs automatically when online

---

### 💡 **Question 2: One-Time vs Periodic Sync**

| Feature | One-Time Sync | Periodic Sync |
|---------|---------------|---------------|
| **Trigger** | User action / connectivity | Time interval |
| **Frequency** | Once per registration | Repeating |
| **Permission** | None required | User permission |
| **Use Case** | Forms, messages | Analytics, cache updates |
| **Min Interval** | N/A | System-controlled (24h+) |

---

### 💡 **Question 3: How to implement offline-first with Background Sync?**

| Step | Action |
|------|--------|
| 1 | Always save locally first (IndexedDB) |
| 2 | Update UI immediately |
| 3 | Try to sync in background |
| 4 | On failure, register sync tag |
| 5 | Service Worker handles sync event |
| 6 | Process queue when online |
| 7 | Update local state on success |

**Key Pattern:**
```javascript
async function addItem(item) {
  await saveLocal(item);        // Step 1
  renderItem(item);             // Step 2
  try {
    await fetch('/api/items', { method: 'POST', body: JSON.stringify(item) });
  } catch {
    await registration.sync.register('sync-items');  // Step 4
  }
}
```

---

### 💡 **Question 4: How to test Background Sync?**

| Method | Steps |
|--------|-------|
| **DevTools** | Network tab → Offline → Action → Online → Check SW logs |
| **Application Tab** | Check IndexedDB for queued data |
| **Console** | `registration.sync.getTags()` to see pending |
| **Automated** | Mock fetch + verify sync registration |

---

### 💡 **Question 5: How to manage sync tags effectively?**

| Practice | Example |
|----------|---------|
| Use constants | `SYNC_TAGS.FORMS` not `'sync-forms'` |
| Be descriptive | `sync-order-confirmation` not `sync-1` |
| Group by feature | `sync-chat-messages`, `sync-chat-read` |
| Check pending | `getTags()` before registering |

---

### 💡 **Question 6: What are the limitations?**

| Limitation | Workaround |
|------------|------------|
| Limited browser support | Provide polling fallback |
| No timing guarantee | Don't rely for time-critical |
| ~5 min execution limit | Process in batches |
| Can't return to main thread | Use postMessage |
| User can disable | Provide manual sync option |

---

### 💡 **Question 7: How to communicate sync status to users?**

| Status | UI Display |
|--------|------------|
| `pending` | "Saving..." or cloud icon |
| `syncing` | Spinner or progress |
| `synced` | Checkmark |
| `failed` | Warning icon + retry button |

```javascript
// Listen for status updates from Service Worker
navigator.serviceWorker.addEventListener('message', event => {
  if (event.data.type === 'SYNC_STATUS') {
    updateStatusUI(event.data.tag, event.data.status);
  }
});
```

---

### 💡 **Question 8: How to handle sync failures?**

| Strategy | Implementation |
|----------|----------------|
| **Exponential backoff** | 1s → 2s → 4s → 8s |
| **Max retries** | Stop after N attempts |
| **Error classification** | Don't retry 400 errors |
| **User notification** | Show persistent failures |
| **Manual retry** | Provide retry button |

---

### 💡 **Question 9: How to ensure data consistency?**

| Technique | Purpose |
|-----------|---------|
| **Versioning** | Track data versions |
| **Idempotency keys** | Prevent duplicate submissions |
| **Checksums** | Verify data integrity |
| **Conflict resolution** | Last-write-wins or merge |
| **Optimistic locking** | Detect concurrent changes |

```javascript
// Idempotency header
await fetch('/api/sync', {
  method: 'POST',
  headers: {
    'X-Idempotency-Key': `${item.id}-${item.version}`
  },
  body: JSON.stringify(item)
});
```

---

### 💡 **Question 10: Background Sync vs Web Workers**

| Aspect | Background Sync | Web Workers |
|--------|-----------------|-------------|
| **Purpose** | Sync when online | Heavy computation |
| **Runs When** | Even after browser closes | Only while app open |
| **Trigger** | Connectivity / schedule | Application code |
| **Thread** | Service Worker | Dedicated thread |
| **Use Together** | Process in Worker → Sync via Background Sync |

---

## Summary

### 💡 **Quick Reference**

| Concept | Key Point |
|---------|-----------|
| **One-Time Sync** | Fires once when online |
| **Periodic Sync** | Repeats at intervals (24h+) |
| **Sync Tag** | Identifier for task type |
| **waitUntil** | Keeps SW alive during sync |
| **Retry** | Automatic on failure |

### 💡 **Best Practices**

| Do | Don't |
|----|-------|
| ✅ Save locally first | ❌ Rely only on sync |
| ✅ Use descriptive tags | ❌ Use generic tags |
| ✅ Implement retry logic | ❌ Assume success |
| ✅ Show sync status | ❌ Leave user guessing |
| ✅ Provide fallback | ❌ Assume browser support |
| ✅ Handle errors gracefully | ❌ Retry permanent failures |

### 💡 **Offline-First Pattern**

```
User Action
    ↓
Save to IndexedDB
    ↓
Update UI (optimistic)
    ↓
Try Network
    ↓
├── Success → Update local state
└── Failure → Register Background Sync
                    ↓
              Sync when online
                    ↓
              Update local state
```

---

## Navigation

**Previous:** [03 - Offline Patterns](./03-offline-patterns.md)

**Next:** [05 - Push Notifications](./05-push-notifications.md)

**Related Topics:**
- Service Workers - Foundation for sync
- Offline Patterns - Caching strategies
- IndexedDB - Local data storage

[Back to PWA Guide](./README.md)
