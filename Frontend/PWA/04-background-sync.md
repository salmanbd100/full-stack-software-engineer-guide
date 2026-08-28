---
title: Background Sync
part: 2
chapter: 0
slug: background-sync
level: intermediate # beginner | intermediate | advanced
reading_time: 34
updated: 2026-08-28
tags: [frontend, pwa, background, sync]
in_book: true
---

# Background Sync {#ch-background-sync}

> Accept a write while offline and let the browser deliver it once the connection returns.

**In this chapter:** one-time sync · periodic sync · registering a tag · retry and backoff · classifying failures · what Safari does not support

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

```text
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

```text
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

```typescript
interface PendingForm {
  id: number;
  data: FormPayload;
  timestamp: string;
}

async function submitFormOffline(formData: FormPayload): Promise<unknown> {
  try {
    // Try to send immediately
    const response: Response = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    });

    if (response.ok) return response.json();
  } catch {
    // Network error — save for background sync
    const db = await openDB('app-db', 1);
    await db.add('pending-forms', {
      id: Date.now(),
      data: formData,
      timestamp: new Date().toISOString(),
    } satisfies PendingForm);

    // Register the tag. The browser decides when to fire it
    if ('SyncManager' in window) {
      const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-forms');
      return { queued: true, message: 'Will send when online' };
    }
  }
}
```

**Service Worker (sw.js):**

```typescript
declare const self: ServiceWorkerGlobalScope;

// SyncEvent is not in the DOM lib yet — declare the shape you depend on
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

self.addEventListener('sync', ((event: SyncEvent): void => {
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncPendingForms());
  }
}) as EventListener);

async function syncPendingForms(): Promise<void> {
  const db = await openDB('app-db', 1);
  const forms: PendingForm[] = await db.getAll('pending-forms');

  for (const form of forms) {
    try {
      const response: Response = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form.data),
      });

      if (response.ok) await db.delete('pending-forms', form.id);
    } catch (error: unknown) {
      // Rethrowing is the signal to the browser to retry this tag later.
      // Swallowing the error tells it the sync succeeded
      throw error;
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

```typescript
interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
  getTags(): Promise<string[]>;
}

async function enablePeriodicSync(): Promise<void> {
  if (!('periodicSync' in ServiceWorkerRegistration.prototype)) {
    console.warn('Periodic sync not supported');
    return;
  }

  try {
    const registration = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration & {
      periodicSync: PeriodicSyncManager;
    };

    const status: PermissionStatus = await navigator.permissions.query({
      name: 'periodic-background-sync' as PermissionName,
    });

    if (status.state === 'granted') {
      // minInterval is a floor, not a promise. The browser fires it based on
      // engagement and battery, and may never fire it at all
      await registration.periodicSync.register('daily-sync', {
        minInterval: 24 * 60 * 60 * 1000,
      });
    }
  } catch (error: unknown) {
    console.error('Failed to register periodic sync:', error);
  }
}
```

**Service Worker:**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('periodicsync', ((event: SyncEvent): void => {
  if (event.tag === 'daily-sync') {
    event.waitUntil(performDailySync());
  }
}) as EventListener);

async function performDailySync(): Promise<void> {
  // Refresh cached config
  const cache: Cache = await caches.open('app-cache');
  await cache.add('/api/config');

  // Flush queued analytics in one batch
  const analytics: AnalyticsEvent[] = await getStoredAnalytics();
  if (analytics.length > 0) {
    await fetch('/api/analytics/batch', {
      method: 'POST',
      body: JSON.stringify({ events: analytics }),
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

```typescript
interface SubmitResult {
  queued: boolean;
}

class FormManager {
  // Save first, send second. If the tab dies mid-request the data survives
  async submitForm(formData: FormPayload): Promise<SubmitResult | unknown> {
    await this.saveLocal(formData);

    try {
      const response: unknown = await this.sendToServer(formData);
      await this.removeLocal(formData.id);
      return response;
    } catch {
      const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
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

```typescript
interface ChatMessage {
  id: number;
  conversationId: string;
  text: string;
  timestamp: string;
  status: 'pending' | 'sent' | 'failed';
}

class ChatManager {
  async sendMessage(conversationId: string, text: string): Promise<void> {
    const message: ChatMessage = {
      id: Date.now(),
      conversationId,
      text,
      timestamp: new Date().toISOString(),
      status: 'pending',
    };

    // Save and render immediately — the user should never wait on the network
    await this.saveMessage(message);
    this.displayMessage(message);

    try {
      await fetch('/api/messages', {
        method: 'POST',
        body: JSON.stringify(message),
      });

      await this.updateMessage({ ...message, status: 'sent' });
    } catch {
      const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-messages');
    }
  }
}
```

---

### 💡 **Analytics Events**

Queue analytics offline, batch sync when online.

```typescript
interface AnalyticsEvent {
  id: number;
  name: string;
  data: Record<string, unknown>;
  timestamp: string;
}

class AnalyticsManager {
  async trackEvent(eventName: string, data: Record<string, unknown>): Promise<void> {
    const event: AnalyticsEvent = {
      id: Date.now(),
      name: eventName,
      data,
      timestamp: new Date().toISOString(),
    };

    // Queue first, always. The send is best-effort
    await this.queueEvent(event);
    void this.sendBatch().catch((): void => {});
  }

  async sendBatch(): Promise<void> {
    const events: AnalyticsEvent[] = await this.getQueuedEvents();
    if (events.length === 0) return;

    const response: Response = await fetch('/api/analytics', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });

    if (response.ok) {
      await this.clearEvents(events.map((e: AnalyticsEvent): number => e.id));
    }
  }
}
```

---

## Implementation Steps

### 💡 **Step 1: Register Service Worker**

```typescript
// app.ts
async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!('serviceWorker' in navigator)) {
    console.warn('Service Workers not supported');
    return undefined;
  }

  try {
    return await navigator.serviceWorker.register('/sw.js');
  } catch (error: unknown) {
    console.error('Registration failed:', error);
    return undefined;
  }
}

document.addEventListener('DOMContentLoaded', (): void => {
  void registerServiceWorker();
});
```

---

### 💡 **Step 2: Set Up Sync Handlers**

```typescript
// sw.ts
declare const self: ServiceWorkerGlobalScope;

type SyncHandler = () => Promise<void>;

const handlers: Record<string, SyncHandler> = {
  'sync-forms': syncForms,
  'sync-messages': syncMessages,
  'sync-data': syncData,
};

self.addEventListener('sync', ((event: SyncEvent): void => {
  const handler: SyncHandler | undefined = handlers[event.tag];
  if (handler !== undefined) event.waitUntil(handler());
}) as EventListener);

async function syncForms(): Promise<void> {
  /* ... */
}
async function syncMessages(): Promise<void> {
  /* ... */
}
async function syncData(): Promise<void> {
  /* ... */
}
```

---

### 💡 **Step 3: Handle Online/Offline Events**

```typescript
class OfflineHandler {
  private online: boolean;

  constructor() {
    // navigator.onLine only proves a network interface exists, not that the
    // internet is reachable. Treat it as a hint, not a fact
    this.online = navigator.onLine;
    window.addEventListener('online', (): void => void this.handleOnline());
    window.addEventListener('offline', (): void => this.handleOffline());
  }

  handleOffline(): void {
    this.online = false;
    this.showBanner('You are offline. Changes will sync when online.');
  }

  async handleOnline(): Promise<void> {
    this.online = true;
    this.hideBanner();

    const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
    await registration.sync.register('sync-all');
  }

  showBanner(message: string): void {
    const banner: HTMLDivElement = document.createElement('div');
    banner.className = 'offline-banner';
    banner.textContent = message;
    document.body.appendChild(banner);
  }

  hideBanner(): void {
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

```typescript
declare const self: ServiceWorkerGlobalScope;

// `as const` makes SyncTag a union of the four literals, so a typo is a
// compile error rather than a sync that silently never fires
const SYNC_TAGS = {
  FORMS: 'sync-forms',
  MESSAGES: 'sync-messages',
  PHOTOS: 'sync-photos',
  ANALYTICS: 'sync-analytics',
} as const;

type SyncTag = (typeof SYNC_TAGS)[keyof typeof SYNC_TAGS];

async function registerSync(tag: SyncTag): Promise<void> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
  await registration.sync.register(tag);
}

// In the worker — one handler per tag
const handlers: Record<SyncTag, SyncHandler> = {
  [SYNC_TAGS.FORMS]: syncForms,
  [SYNC_TAGS.MESSAGES]: syncMessages,
  [SYNC_TAGS.PHOTOS]: syncPhotos,
  [SYNC_TAGS.ANALYTICS]: syncAnalytics,
};

self.addEventListener('sync', ((event: SyncEvent): void => {
  const handler: SyncHandler | undefined = handlers[event.tag as SyncTag];
  if (handler !== undefined) event.waitUntil(handler());
}) as EventListener);

async function getPendingTags(): Promise<string[]> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
  return registration.sync.getTags();
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

```typescript
// Check pending sync tags
async function debugSyncTags(): Promise<void> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
  const tags: string[] = await registration.sync.getTags();
  console.log('Pending sync tags:', tags);
}

// Manually trigger sync
async function triggerSync(tag: string): Promise<void> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
  await registration.sync.register(tag);
}
```

---

### 💡 **Automated Testing**

```typescript
describe('Background Sync', (): void => {
  test('queues data when offline', async (): Promise<void> => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Network'));

    const mockRegister = jest.fn();
    Object.defineProperty(navigator, 'serviceWorker', {
      value: { ready: Promise.resolve({ sync: { register: mockRegister } }) },
      configurable: true,
    });

    await submitForm({ name: 'test' });

    expect(mockRegister).toHaveBeenCalledWith('sync-forms');
  });

  test('syncs queued data', async (): Promise<void> => {
    const db = await openDB('app-db', 1);
    await db.add('pending-forms', { id: 1, data: { name: 'test' } });

    global.fetch = jest.fn().mockResolvedValue({ ok: true } as Response);

    await syncPendingForms();

    const pending: PendingForm[] = await db.getAll('pending-forms');
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

```typescript
const backgroundSyncSupported = (): boolean =>
  'serviceWorker' in navigator && 'SyncManager' in window;

const periodicSyncSupported = (): boolean =>
  'periodicSync' in ServiceWorkerRegistration.prototype;

// Safari supports neither, so the fallback is not an edge case
function initializeSync(): void {
  if (!backgroundSyncSupported()) {
    startPollingFallback();
  }
}
```

---

### 💡 **Fallback Strategy**

```typescript
class ActionSyncManager {
  async queueAction(action: QueuedAction): Promise<void> {
    await this.saveLocal(action);

    if (backgroundSyncSupported()) {
      const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-actions');
      return;
    }

    // Fallback — only runs while a tab is open, which is the whole limitation
    this.startPolling();
  }

  startPolling(): void {
    setInterval((): void => {
      if (navigator.onLine) void this.syncAll();
    }, 30_000);
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

```typescript
import { BackgroundSyncPlugin } from 'workbox-background-sync';
import { registerRoute, type RouteMatchCallbackOptions } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';

// Create sync queue
const bgSyncPlugin = new BackgroundSyncPlugin('api-queue', {
  maxRetentionTime: 24 * 60, // minutes — a day-old form submission is usually noise
});

// Apply to routes
registerRoute(
  ({ url }: RouteMatchCallbackOptions): boolean => url.pathname === '/api/forms',
  new NetworkFirst({ cacheName: 'forms-cache', plugins: [bgSyncPlugin] }),
  'POST',
);

registerRoute(
  ({ url }: RouteMatchCallbackOptions): boolean => url.pathname === '/api/messages',
  new NetworkFirst({ cacheName: 'messages-cache', plugins: [bgSyncPlugin] }),
  'POST',
);
```

---

### 💡 **Workbox with Next.js**

```typescript
// next.config.ts
import withPWAInit from 'next-pwa';
import type { NextConfig } from 'next';

const withPWA = withPWAInit({
  dest: 'public',
  register: true,
  skipWaiting: true,
});

const config: NextConfig = {
  // Next.js config
};

export default withPWA(config);
```

```typescript
// sw.ts (custom service worker)
import { precacheAndRoute, type PrecacheEntry } from 'workbox-precaching';
import { registerRoute, type RouteMatchCallbackOptions } from 'workbox-routing';
import { NetworkFirst } from 'workbox-strategies';
import { BackgroundSyncPlugin } from 'workbox-background-sync';

declare const self: ServiceWorkerGlobalScope & { __WB_MANIFEST: (string | PrecacheEntry)[] };

precacheAndRoute(self.__WB_MANIFEST ?? []);

const bgSyncPlugin = new BackgroundSyncPlugin('sync-queue', {
  maxRetentionTime: 24 * 60,
});

registerRoute(
  ({ url }: RouteMatchCallbackOptions): boolean => url.pathname.startsWith('/api/'),
  new NetworkFirst({ plugins: [bgSyncPlugin] }),
  'POST',
);
```

---

## Error Handling & Retries

### 💡 **Exponential Backoff**

Retry with increasing delays: 1s → 2s → 4s → 8s.

```typescript
async function syncWithRetry(task: () => Promise<void>, maxRetries = 5): Promise<void> {
  let delay = 1000;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await task();
      return;
    } catch {
      if (attempt >= maxRetries) {
        throw new Error(`Failed after ${maxRetries} attempts`);
      }

      await new Promise<void>((resolve): void => {
        setTimeout(resolve, delay);
      });
      delay *= 2; // 1s, 2s, 4s, 8s
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

```typescript
type ErrorClass = 'RETRY' | 'BACKOFF' | 'PERMANENT' | 'AUTH' | 'UNKNOWN';

interface ClassifiableError {
  name?: string;
  status?: number;
}

// Retrying a 400 forever is the classic background-sync bug. Classify first
function classifyError(error: ClassifiableError): ErrorClass {
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

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('sync', ((event: SyncEvent): void => {
  if (event.tag !== 'sync-forms') return;

  event.waitUntil(
    syncWithRetry(async (): Promise<void> => {
      const db = await openDB('app-db', 1);
      const forms: PendingForm[] = await db.getAll('pending-forms');

      for (const form of forms) {
        const response: Response = await fetch('/api/submit', {
          method: 'POST',
          body: JSON.stringify(form.data),
        });

        if (response.ok) {
          await db.delete('pending-forms', form.id);
          continue;
        }

        if (classifyError(response) === 'PERMANENT') {
          // A 400 will still be a 400 tomorrow. Drop it rather than retry forever
          await db.delete('pending-forms', form.id);
          continue;
        }

        throw new Error(`HTTP ${response.status}`); // Retry on the next sync
      }
    }, 3),
  );
}) as EventListener);
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
```typescript
async function addItem(item: Item): Promise<void> {
  await saveLocal(item); // 1 — durable before anything else
  renderItem(item); // 2 — optimistic UI
  try {
    await fetch('/api/items', { method: 'POST', body: JSON.stringify(item) });
  } catch {
    await registration.sync.register('sync-items'); // 3 — hand it to the browser
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

```typescript
interface SyncStatusMessage {
  type: 'SYNC_STATUS';
  tag: string;
  status: 'pending' | 'synced' | 'failed';
}

// Listen for status updates from the worker
navigator.serviceWorker.addEventListener('message', (event: MessageEvent<SyncStatusMessage>): void => {
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

```typescript
// A retried sync can arrive twice. The key lets the server discard the duplicate
await fetch('/api/sync', {
  method: 'POST',
  headers: {
    'X-Idempotency-Key': `${item.id}-${item.version}`,
  },
  body: JSON.stringify(item),
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

```text
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
