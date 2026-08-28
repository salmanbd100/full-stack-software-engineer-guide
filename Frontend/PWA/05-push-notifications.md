# Push Notifications {#ch-push-notifications}

> Send a notification to a closed tab, and ask for the permission in a way that does not get you blocked.

**In this chapter:** the Push and Notification APIs · VAPID keys · subscribing · handling `push` in the worker · actions and clicks · expired subscriptions

## Overview

Push Notifications enable real-time engagement between applications and users. The Push API allows web applications to receive messages from a server even when the application is not active. Combined with the Notification API, this creates a system for delivering timely messages directly to users' devices.

---

## Table of Contents

- [Push API Fundamentals](#push-api-fundamentals)
- [Notification API](#notification-api)
- [VAPID Keys](#vapid-keys)
- [Implementation Flow](#implementation-flow)
- [Service Worker Push Events](#service-worker-push-events)
- [Notification Actions](#notification-actions)
- [Permission Handling](#permission-handling)
- [Server-Side Implementation](#server-side-implementation)
- [Testing Push Notifications](#testing-push-notifications)
- [Browser Support](#browser-support)
- [Interview Questions](#interview-questions)

---

## Push API Fundamentals

### 💡 **Three-Party System**

Push notifications involve three main components.

| Component | Role | Responsibility |
|-----------|------|----------------|
| **Client** | User's device | Subscribe, display notifications |
| **Server** | Your application | Send messages via VAPID |
| **Push Service** | Browser vendor (FCM, etc.) | Relay messages reliably |

---

### 💡 **Push Flow**

```text
1. Client requests permission
    ↓
2. Client subscribes to Push Service
    ↓
3. Push Service returns subscription endpoint
    ↓
4. Client sends subscription to your server
    ↓
5. Server stores subscription
    ↓
6. Server sends message to Push Service (with VAPID)
    ↓
7. Push Service delivers to client
    ↓
8. Service Worker fires 'push' event
    ↓
9. Service Worker displays notification
```

---

### 💡 **Push API vs Notification API**

| Feature | Push API | Notification API |
|---------|----------|------------------|
| **Purpose** | Receive messages from server | Display visual notifications |
| **Triggered By** | Server sends message | Application code |
| **Works When** | Browser closed | Browser has permission |
| **Requires** | Server + subscription | User permission only |
| **Runs In** | Service Worker only | Main thread or SW |

**Key Insight:**
> Push API triggers Notification API. Server sends message → Push event fires → Service Worker displays notification using Notification API.

---

## Notification API

### 💡 **Notification Options**

| Property | Type | Purpose |
|----------|------|---------|
| `body` | string | Message content |
| `icon` | URL | Large icon |
| `badge` | URL | Small monochrome icon |
| `tag` | string | Group similar notifications |
| `requireInteraction` | boolean | Stay visible until dismissed |
| `actions` | array | Action buttons |
| `data` | object | Custom data for handlers |

---

### 💡 **Basic Notification**

```typescript
declare const self: ServiceWorkerGlobalScope;

interface MessageData {
  userId: number;
  messageId: number;
}

void self.registration.showNotification('New Message', {
  body: 'You have a new message from Alice',
  icon: '/images/icon.png',
  badge: '/images/badge.png',
  // Same tag replaces the previous notification instead of stacking a second one
  tag: 'message',
  requireInteraction: true,
  actions: [
    { action: 'open', title: 'Open' },
    { action: 'close', title: 'Close' },
  ],
  data: { userId: 123, messageId: 456 } satisfies MessageData,
});
```

---

### 💡 **Notification Events**

| Event | When Fired | Use For |
|-------|------------|---------|
| `push` | Message received | Show notification |
| `notificationclick` | User clicks notification | Navigate to content |
| `notificationclose` | User dismisses | Track dismissals |

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('notificationclick', (event: NotificationEvent): void => {
  event.notification.close();

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window' })
      .then((clientList: readonly WindowClient[]): Promise<WindowClient | null> => {
        // Focus an existing tab rather than opening a duplicate
        for (const client of clientList) {
          if (client.url === '/') return client.focus();
        }
        return self.clients.openWindow('/');
      }),
  );
});
```

---

## VAPID Keys

### 💡 **What are VAPID Keys?**

Voluntary Application Server Identification keys authenticate your server with Push Services.

| Key | Where Used | Security |
|-----|------------|----------|
| **Public Key** | Client-side subscription | Safe to expose |
| **Private Key** | Server-side signing | Keep secret |

**Key Insight:**
> VAPID prevents unauthorized servers from sending notifications to your users. The private key should NEVER be exposed to clients.

---

### 💡 **Generating VAPID Keys**

```bash
# Using web-push library
npx web-push generate-vapid-keys
```

```typescript
// Or programmatically, on the server
import webpush, { type VapidKeys } from 'web-push';

const vapidKeys: VapidKeys = webpush.generateVAPIDKeys();

console.log('Public:', vapidKeys.publicKey);
// The private key never leaves the server and never enters version control
console.log('Private:', vapidKeys.privateKey);
```

---

### 💡 **Server Configuration**

```typescript
// server.ts
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string,
);
```

---

### 💡 **Client Usage**

```typescript
async function subscribeToPush(): Promise<PushSubscription> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;

  const response: Response = await fetch('/api/vapid-public-key');
  const { publicKey } = (await response.json()) as { publicKey: string };

  return registration.pushManager.subscribe({
    // Chrome requires this to be true. A push that shows nothing is not allowed
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}

// The key arrives as URL-safe base64; subscribe() wants raw bytes
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding: string = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64: string = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData: string = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}
```

---

## Implementation Flow

### 💡 **Complete Setup Flow**

| Step | Client | Server |
|------|--------|--------|
| 1 | Request notification permission | — |
| 2 | Subscribe to push | — |
| 3 | Send subscription to server | Store subscription |
| 4 | — | Send notification when needed |
| 5 | Receive push event | — |
| 6 | Display notification | — |

---

### 💡 **Step 1: Request Permission**

```typescript
async function requestNotificationPermission(): Promise<boolean> {
  if (Notification.permission === 'granted') return true;

  // 'denied' is terminal. Asking again does nothing but the browser
  // remembers you tried, and some browsers penalise the origin for it
  if (Notification.permission === 'denied') return false;

  const permission: NotificationPermission = await Notification.requestPermission();
  return permission === 'granted';
}
```

---

### 💡 **Step 2: Subscribe**

```typescript
async function subscribeToPush(): Promise<PushSubscription> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;

  // Reuse the existing subscription — resubscribing invalidates the old endpoint
  const existing: PushSubscription | null = await registration.pushManager.getSubscription();
  if (existing !== null) return existing;

  const response: Response = await fetch('/api/vapid-public-key');
  const { publicKey } = (await response.json()) as { publicKey: string };

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });
}
```

---

### 💡 **Step 3: Send to Server**

```typescript
async function sendSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() }),
  });
}
```

---

### 💡 **Complete Setup**

```typescript
async function setupPushNotifications(): Promise<void> {
  try {
    const hasPermission: boolean = await requestNotificationPermission();
    if (!hasPermission) return;

    const subscription: PushSubscription = await subscribeToPush();
    await sendSubscriptionToServer(subscription);
  } catch (error: unknown) {
    console.error('Setup failed:', error);
  }
}
```

---

## Service Worker Push Events

### 💡 **Handling Push Events**

```typescript
declare const self: ServiceWorkerGlobalScope;

interface PushPayload {
  title?: string;
  body?: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, unknown>;
}

self.addEventListener('push', (event: PushEvent): void => {
  let data: PushPayload = {};

  if (event.data !== null) {
    try {
      data = event.data.json() as PushPayload;
    } catch {
      // A push server may send plain text. Degrade rather than throw
      data = { body: event.data.text() };
    }
  }

  const options: NotificationOptions = {
    body: data.body ?? 'New notification',
    icon: data.icon ?? '/icon.png',
    badge: data.badge ?? '/badge.png',
    tag: data.tag ?? 'notification',
    data: data.data ?? {},
  };

  event.waitUntil(self.registration.showNotification(data.title ?? 'App', options));
});
```

---

### 💡 **Routing by Message Type**

```typescript
declare const self: ServiceWorkerGlobalScope;

interface ChatPush {
  type: 'chat';
  senderId: string;
  senderName: string;
  senderPhoto: string;
  message: string;
}

type TypedPush = ChatPush | { type: 'alert' | 'update'; [key: string]: unknown };
type PushHandler = (data: never) => Promise<void>;

const handlers: Partial<Record<TypedPush['type'], PushHandler>> = {
  chat: handleChatNotification as PushHandler,
  alert: handleAlertNotification as PushHandler,
  update: handleUpdateNotification as PushHandler,
};

self.addEventListener('push', (event: PushEvent): void => {
  if (event.data === null) return;

  const data = event.data.json() as TypedPush;
  const handler: PushHandler = handlers[data.type] ?? (handleDefaultNotification as PushHandler);
  event.waitUntil(handler(data as never));
});

async function handleChatNotification(data: ChatPush): Promise<void> {
  // Tagging per sender collapses a burst of messages into one notification
  await self.registration.showNotification(`Message from ${data.senderName}`, {
    body: data.message,
    icon: data.senderPhoto,
    tag: `chat-${data.senderId}`,
    requireInteraction: true,
  });
}
```

---

## Notification Actions

### 💡 **Defining Actions**

```typescript
const options: NotificationOptions = {
  body: 'New message from Alice',
  // Most platforms show at most two actions. Order them by likely use
  actions: [
    { action: 'reply', title: 'Reply' },
    { action: 'dismiss', title: 'Dismiss' },
  ],
  data: { conversationId: 123 },
};
```

---

### 💡 **Handling Actions**

```typescript
declare const self: ServiceWorkerGlobalScope;

self.addEventListener('notificationclick', (event: NotificationEvent): void => {
  event.notification.close();

  const data = event.notification.data as { conversationId: number };

  switch (event.action) {
    case 'reply':
      event.waitUntil(self.clients.openWindow(`/chat/${data.conversationId}?reply=true`));
      break;

    case 'dismiss':
      // Closing above is the whole action
      break;

    default:
      // Empty action means the body itself was clicked
      event.waitUntil(self.clients.openWindow('/'));
  }
});
```

---

## Permission Handling

### 💡 **Permission States**

| State | Meaning | Can Request? |
|-------|---------|--------------|
| `granted` | User allowed | No (already allowed) |
| `denied` | User blocked | No (blocked) |
| `default` | Not asked yet | Yes |

---

### 💡 **Best Practices**

| Do | Don't |
|----|-------|
| ✅ Ask after user engagement | ❌ Ask immediately on page load |
| ✅ Explain benefit first | ❌ Show browser prompt directly |
| ✅ Respect denial | ❌ Ask repeatedly |
| ✅ Offer alternatives | ❌ Break functionality |

---

### 💡 **Contextual Permission Request**

```typescript
// Ask your own question first. A "Not Now" here is recoverable; a browser-level
// "Block" is not
async function requestPermissionContextually(): Promise<boolean> {
  if (Notification.permission !== 'default') {
    return Notification.permission === 'granted';
  }

  const userWants: boolean = await showExplanationDialog();
  if (!userWants) return false;

  const permission: NotificationPermission = await Notification.requestPermission();
  return permission === 'granted';
}

function showExplanationDialog(): Promise<boolean> {
  return new Promise<boolean>((resolve): void => {
    const dialog: HTMLDivElement = document.createElement('div');
    dialog.className = 'permission-dialog';
    dialog.innerHTML = `
      <h2>Stay Connected</h2>
      <p>Get real-time updates about messages and events</p>
      <button class="allow">Enable</button>
      <button class="skip">Not Now</button>
    `;

    dialog.querySelector<HTMLButtonElement>('.allow')?.addEventListener('click', (): void => {
      dialog.remove();
      resolve(true);
    });
    dialog.querySelector<HTMLButtonElement>('.skip')?.addEventListener('click', (): void => {
      dialog.remove();
      resolve(false);
    });

    document.body.appendChild(dialog);
  });
}
```

---

## Server-Side Implementation

### 💡 **Node.js with web-push**

```typescript
import express, { type Request, type Response } from 'express';
import webpush, { type PushSubscription, type WebPushError } from 'web-push';
import 'dotenv/config';

const app = express();
app.use(express.json());

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY as string,
  process.env.VAPID_PRIVATE_KEY as string,
);

// In-memory for the example. Production stores these against a user id
const subscriptions = new Map<string, PushSubscription>();

interface SendResult {
  id: string;
  status: 'sent' | 'removed' | 'failed';
}

app.get('/api/vapid-public-key', (req: Request, res: Response): void => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

app.post('/api/notifications/subscribe', (req: Request, res: Response): void => {
  const { subscription } = req.body as { subscription: PushSubscription };
  const id = `sub-${Date.now()}`;
  subscriptions.set(id, subscription);
  res.json({ success: true, id });
});

app.post('/api/notifications/send', async (req: Request, res: Response): Promise<void> => {
  const { message } = req.body as { message: { title: string; body: string; icon?: string } };

  const payload: string = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon ?? '/icon.png',
  });

  const results: SendResult[] = [];

  for (const [id, subscription] of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      results.push({ id, status: 'sent' });
    } catch (error: unknown) {
      // 410 Gone is the push service telling you the endpoint is dead. Delete
      // it — retrying a 410 forever is how subscription tables rot
      if ((error as WebPushError).statusCode === 410) {
        subscriptions.delete(id);
        results.push({ id, status: 'removed' });
      } else {
        results.push({ id, status: 'failed' });
      }
    }
  }

  res.json({ results });
});

app.listen(3000);
```

---

### 💡 **Handling Subscription Expiry**

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 200/201 | Success | None |
| 410 Gone | Expired | Remove subscription |
| 429 | Rate limited | Backoff and retry |
| 500+ | Server error | Retry later |

```typescript
async function sendWithExpiry(subscription: PushSubscription, payload: string): Promise<void> {
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error: unknown) {
    if ((error as WebPushError).statusCode === 410) {
      await removeSubscription(subscription.endpoint);
    }
    throw error;
  }
}
```

---

## Testing Push Notifications

### 💡 **Manual Testing Steps**

| Step | How |
|------|-----|
| 1. Register SW | Check Application tab in DevTools |
| 2. Subscribe | Verify subscription in console |
| 3. Send test | POST to /api/notifications/send |
| 4. Verify | Check notification appears |
| 5. Test click | Ensure navigation works |
| 6. Test offline | Send while app closed |

---

### 💡 **DevTools Testing**

```typescript
// Check subscription status
async function debugSubscription(): Promise<void> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
  const subscription: PushSubscription | null = await registration.pushManager.getSubscription();
  console.log('Subscription:', subscription?.endpoint ?? 'none');
}

// Test notification display, without involving a push server
async function testNotification(): Promise<void> {
  const registration: ServiceWorkerRegistration = await navigator.serviceWorker.ready;
  await registration.showNotification('Test', {
    body: 'This is a test notification',
    tag: 'test',
  });
}
```

---

## Browser Support

### 💡 **Support Matrix**

| Browser | Push API | Notification API | Notes |
|---------|----------|------------------|-------|
| **Chrome** | ✅ | ✅ | Full support |
| **Firefox** | ✅ | ✅ | Full support |
| **Edge** | ✅ | ✅ | Full support |
| **Safari** | ✅ (16.4+) | ✅ | Limited, iOS 16.4+ |
| **Opera** | ✅ | ✅ | Same as Chrome |

---

### 💡 **Feature Detection**

```typescript
const pushSupported = (): boolean =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
```

---

## Interview Questions

### 💡 **Question 1: Explain the three-party push system**

| Component | Role | Technology |
|-----------|------|------------|
| **Client** | Subscribe and display | Service Worker, Push Manager |
| **Server** | Send messages | web-push library, VAPID |
| **Push Service** | Relay messages | FCM, APNs (browser-managed) |

**Flow:** Client subscribes → Server stores subscription → Server sends to Push Service → Push Service delivers → Service Worker displays.

---

### 💡 **Question 2: Push API vs Notification API**

| Aspect | Push API | Notification API |
|--------|----------|------------------|
| **What it does** | Receives messages | Shows notifications |
| **When it works** | Even when closed | When app has permission |
| **Scope** | Service Worker only | SW or main thread |

**Together:** Push receives message, Notification displays it.

---

### 💡 **Question 3: Why are VAPID keys important?**

| Purpose | Without VAPID | With VAPID |
|---------|---------------|------------|
| **Authentication** | Anyone could send | Only you can send |
| **Security** | No verification | Signed messages |
| **Trust** | Push service rejects | Push service accepts |

---

### 💡 **Question 4: How to handle subscription expiry?**

| Detection | Response |
|-----------|----------|
| HTTP 410 from Push Service | Remove from database |
| `getSubscription()` returns null | Prompt to resubscribe |
| Periodic cleanup | Verify all subscriptions |

---

### 💡 **Question 5: Permission handling best practices**

| Good | Bad |
|------|-----|
| ✅ Ask after engagement | ❌ Ask on page load |
| ✅ Explain benefit first | ❌ Direct browser prompt |
| ✅ Remember denial | ❌ Repeated prompts |
| ✅ Offer alternatives | ❌ Require for functionality |

---

### 💡 **Question 6: How to avoid irrelevant notifications?**

| Strategy | Implementation |
|----------|----------------|
| **Targeting** | Store user preferences |
| **Frequency** | Rate limit per user |
| **Batching** | Combine multiple events |
| **Quiet hours** | Respect timezone |
| **Relevance** | Filter by user interest |

---

### 💡 **Question 7: Security considerations**

| Risk | Mitigation |
|------|------------|
| Private key exposure | Environment variables only |
| Subscription leak | Treat like auth token |
| Message spoofing | VAPID authentication |
| CSRF attacks | CSRF tokens on endpoints |
| Sensitive data | Encrypt payloads |

---

### 💡 **Question 8: How to test push notifications?**

| Method | Tool |
|--------|------|
| **Manual** | DevTools Application tab |
| **Unit test** | Mock Service Worker APIs |
| **Integration** | Puppeteer/Playwright |
| **E2E** | Real subscription + test server |

---

### 💡 **Question 9: Scaling to millions of users**

| Challenge | Solution |
|-----------|----------|
| Storage | Database with indexing |
| Delivery | Job queues (Redis, Bull) |
| Performance | Async workers |
| Failures | Retry + dead letter queues |
| Cost | Batch messages |

---

### 💡 **Question 10: Subscription lifecycle**

| Phase | Action |
|-------|--------|
| **Create** | `pushManager.subscribe()` |
| **Store** | Send to server |
| **Use** | `webpush.sendNotification()` |
| **Expire** | Handle 410 responses |
| **Cleanup** | Remove from database |

---

## Summary

### 💡 **Quick Reference**

| Concept | Key Point |
|---------|-----------|
| **Push API** | Receives server messages |
| **Notification API** | Displays notifications |
| **VAPID** | Authenticates your server |
| **Subscription** | Unique endpoint per user |
| **Service Worker** | Handles push events |

### 💡 **Best Practices**

| Do | Don't |
|----|-------|
| ✅ Use HTTPS only | ❌ Expose private key |
| ✅ Request permission contextually | ❌ Ask immediately |
| ✅ Handle subscription expiry | ❌ Ignore 410 errors |
| ✅ Rate limit notifications | ❌ Spam users |
| ✅ Provide alternatives | ❌ Require push |
| ✅ Respect quiet hours | ❌ Send at night |

### 💡 **Implementation Checklist**

| Task | Status |
|------|--------|
| Generate VAPID keys | ☐ |
| Configure server with web-push | ☐ |
| Implement subscription endpoint | ☐ |
| Register Service Worker | ☐ |
| Handle permission request | ☐ |
| Subscribe to push | ☐ |
| Handle push events in SW | ☐ |
| Handle notification clicks | ☐ |
| Handle subscription expiry | ☐ |
| Test on multiple devices | ☐ |

---

## Navigation

**Previous:** [04 - Background Sync](./04-background-sync.md)

**Related Topics:**
- Service Workers - Foundation for push
- Background Sync - Reliable data sync
- Offline Patterns - Caching strategies

[Back to PWA Guide](./README.md)
