# Push Notifications API

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

```
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

```javascript
// From Service Worker
self.registration.showNotification('New Message', {
  body: 'You have a new message from Alice',
  icon: '/images/icon.png',
  badge: '/images/badge.png',
  tag: 'message',
  requireInteraction: true,
  actions: [
    { action: 'open', title: 'Open' },
    { action: 'close', title: 'Close' }
  ],
  data: { userId: 123, messageId: 456 }
});
```

---

### 💡 **Notification Events**

| Event | When Fired | Use For |
|-------|------------|---------|
| `push` | Message received | Show notification |
| `notificationclick` | User clicks notification | Navigate to content |
| `notificationclose` | User dismisses | Track dismissals |

```javascript
// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Focus existing window or open new
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow('/');
    })
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

```javascript
// Or programmatically (Node.js)
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();

console.log('Public:', vapidKeys.publicKey);
console.log('Private:', vapidKeys.privateKey);
```

---

### 💡 **Server Configuration**

```javascript
// server.js
const webpush = require('web-push');

webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);
```

---

### 💡 **Client Usage**

```javascript
// Get public key and subscribe
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  // Get public key from server
  const response = await fetch('/api/vapid-public-key');
  const { publicKey } = await response.json();

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });

  return subscription;
}

// Helper: Convert base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
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

```javascript
async function requestNotificationPermission() {
  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
}
```

---

### 💡 **Step 2: Subscribe**

```javascript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    const response = await fetch('/api/vapid-public-key');
    const { publicKey } = await response.json();

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey)
    });
  }

  return subscription;
}
```

---

### 💡 **Step 3: Send to Server**

```javascript
async function sendSubscriptionToServer(subscription) {
  await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: subscription.toJSON() })
  });
}
```

---

### 💡 **Complete Setup**

```javascript
async function setupPushNotifications() {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return;

    const subscription = await subscribeToPush();
    await sendSubscriptionToServer(subscription);

    console.log('Push notifications ready');
  } catch (error) {
    console.error('Setup failed:', error);
  }
}
```

---

## Service Worker Push Events

### 💡 **Handling Push Events**

```javascript
self.addEventListener('push', event => {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { body: event.data.text() };
    }
  }

  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icon.png',
    badge: data.badge || '/badge.png',
    tag: data.tag || 'notification',
    data: data.data || {}
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'App', options)
  );
});
```

---

### 💡 **Routing by Message Type**

```javascript
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();

  const handlers = {
    chat: handleChatNotification,
    alert: handleAlertNotification,
    update: handleUpdateNotification
  };

  const handler = handlers[data.type] || handleDefaultNotification;
  event.waitUntil(handler(data));
});

async function handleChatNotification(data) {
  return self.registration.showNotification(`Message from ${data.senderName}`, {
    body: data.message,
    icon: data.senderPhoto,
    tag: `chat-${data.senderId}`,
    requireInteraction: true
  });
}
```

---

## Notification Actions

### 💡 **Defining Actions**

```javascript
const options = {
  body: 'New message from Alice',
  actions: [
    { action: 'reply', title: 'Reply' },
    { action: 'dismiss', title: 'Dismiss' }
  ],
  data: { conversationId: 123 }
};
```

---

### 💡 **Handling Actions**

```javascript
self.addEventListener('notificationclick', event => {
  event.notification.close();

  const data = event.notification.data;

  switch (event.action) {
    case 'reply':
      event.waitUntil(
        clients.openWindow(`/chat/${data.conversationId}?reply=true`)
      );
      break;

    case 'dismiss':
      // Just close (already done above)
      break;

    default:
      // Click on notification body
      event.waitUntil(clients.openWindow('/'));
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

```javascript
async function requestPermissionContextually() {
  if (Notification.permission !== 'default') {
    return Notification.permission === 'granted';
  }

  // Show explanation first
  const userWants = await showExplanationDialog();

  if (userWants) {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}

function showExplanationDialog() {
  return new Promise(resolve => {
    const dialog = document.createElement('div');
    dialog.className = 'permission-dialog';
    dialog.innerHTML = `
      <h2>Stay Connected</h2>
      <p>Get real-time updates about messages and events</p>
      <button class="allow">Enable</button>
      <button class="skip">Not Now</button>
    `;

    dialog.querySelector('.allow').onclick = () => {
      dialog.remove();
      resolve(true);
    };
    dialog.querySelector('.skip').onclick = () => {
      dialog.remove();
      resolve(false);
    };

    document.body.appendChild(dialog);
  });
}
```

---

## Server-Side Implementation

### 💡 **Node.js with web-push**

```javascript
const express = require('express');
const webpush = require('web-push');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configure VAPID
webpush.setVapidDetails(
  'mailto:admin@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Store subscriptions (use real DB in production)
const subscriptions = new Map();

// Get VAPID public key
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY });
});

// Subscribe
app.post('/api/notifications/subscribe', (req, res) => {
  const { subscription } = req.body;
  const id = `sub-${Date.now()}`;
  subscriptions.set(id, subscription);
  res.json({ success: true, id });
});

// Send notification
app.post('/api/notifications/send', async (req, res) => {
  const { message } = req.body;

  const payload = JSON.stringify({
    title: message.title,
    body: message.body,
    icon: message.icon || '/icon.png'
  });

  const results = [];

  for (const [id, subscription] of subscriptions) {
    try {
      await webpush.sendNotification(subscription, payload);
      results.push({ id, status: 'sent' });
    } catch (error) {
      if (error.statusCode === 410) {
        // Subscription expired
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

```javascript
async function sendWithExpiry(subscription, payload) {
  try {
    await webpush.sendNotification(subscription, payload);
  } catch (error) {
    if (error.statusCode === 410) {
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

```javascript
// Check subscription status
async function debugSubscription() {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  console.log('Subscription:', subscription);
}

// Test notification display
async function testNotification() {
  const registration = await navigator.serviceWorker.ready;
  registration.showNotification('Test', {
    body: 'This is a test notification',
    tag: 'test'
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

```javascript
const pushSupported = () => {
  return 'serviceWorker' in navigator &&
         'PushManager' in window &&
         'Notification' in window;
};
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
