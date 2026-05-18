# Design Notification System

## How to Open This Answer

"I'll design a multi-channel notification system supporting push, email, and SMS at scale. Let me start by clarifying requirements before jumping into the architecture."

## Problem Statement

Build a system that delivers notifications across push (APNs/FCM), email, and SMS channels. It must handle billions of notifications per day with guaranteed delivery, no duplicates, and user-controlled preferences.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Send push notifications via APNs (iOS) and FCM (Android)
- Send email via SMTP providers (SendGrid, SES)
- Send SMS via Twilio or similar gateway
- Respect per-user, per-channel opt-in/opt-out preferences
- Support priority levels: critical (< 5 s), normal (batched)
- Retry failed deliveries with exponential backoff
- Track delivery status (sent, delivered, failed)

### Non-Functional (pick 3-4)

- **Throughput**: 100 K notifications/sec at peak
- **Reliability**: At-least-once delivery; idempotency prevents duplicates
- **Latency**: Critical notifications delivered in < 5 s end-to-end
- **Availability**: 99.99% — notification pipeline must not block core product

## A — Architecture

### High-Level Diagram

```
Producers (services)
        │
        ▼
  API Gateway / Notification Service
        │
        ▼
  ┌─────────────────────────────────┐
  │   Priority Queue (Kafka)        │
  │  [CRITICAL] [HIGH] [NORMAL]     │
  └──────────────┬──────────────────┘
                 │ fan-out
        ┌────────┼────────┐
        ▼        ▼        ▼
  Push Worker  Email    SMS
  (APNs/FCM)  Worker   Worker
        │        │        │
        ▼        ▼        ▼
  APNs / FCM  SendGrid  Twilio
        │
        ▼
  Delivery DB (Cassandra) + Cache (Redis)
```

The Notification Service validates requests and writes to a priority Kafka topic. Separate worker pools consume each channel — this isolates slow SMS gateways from fast push delivery. A Delivery DB tracks idempotency keys so retries never send duplicates. Redis caches user preference lookups to avoid a DB hit on every notification.

## D — Data Model

```typescript
interface UserPreference {
  userId: string;
  channelPreferences: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  mutedCategories: string[]; // e.g. ["marketing", "digest"]
  quietHours: { start: number; end: number } | null; // 0-23 UTC
}

interface NotificationRequest {
  notificationId: string;        // idempotency key (UUID)
  recipientId: string;
  channel: "push" | "email" | "sms";
  priority: "critical" | "high" | "normal";
  templateId: string;
  variables: Record<string, string>;
  scheduledAt?: string;          // ISO-8601; absent = send now
}

interface DeliveryRecord {
  notificationId: string;
  recipientId: string;
  channel: "push" | "email" | "sms";
  status: "queued" | "sent" | "delivered" | "failed";
  attempts: number;
  lastAttemptAt: string;
  errorCode?: string;
}

interface NotificationTemplate {
  templateId: string;
  channel: "push" | "email" | "sms";
  subject?: string;              // email only
  body: string;                  // supports {{variable}} placeholders
  category: string;
}
```

## I — Interface (APIs)

```typescript
// POST /v1/notifications
// Enqueue a single notification
interface SendNotificationRequest {
  recipientId: string;
  channel: "push" | "email" | "sms" | "all";
  priority: "critical" | "high" | "normal";
  templateId: string;
  variables: Record<string, string>;
  idempotencyKey: string;
  scheduledAt?: string;
}
interface SendNotificationResponse {
  notificationId: string;
  status: "queued" | "skipped"; // skipped if user opted out
}

// POST /v1/notifications/batch
// Fan-out to many recipients (e.g. broadcast)
interface BatchNotificationRequest {
  recipientIds: string[];        // max 10 K per call
  channel: "push" | "email" | "sms";
  templateId: string;
  variables: Record<string, string>;
  priority: "high" | "normal";
}
interface BatchNotificationResponse {
  batchId: string;
  accepted: number;
  rejected: number;              // opted-out users
}

// GET /v1/notifications/:notificationId/status
interface DeliveryStatusResponse {
  notificationId: string;
  status: "queued" | "sent" | "delivered" | "failed";
  attempts: number;
  deliveredAt?: string;
}

// PUT /v1/users/:userId/preferences
// Update channel opt-in/opt-out
interface UpdatePreferencesRequest {
  channelPreferences: {
    push?: boolean;
    email?: boolean;
    sms?: boolean;
  };
  mutedCategories?: string[];
}

// GET /v1/users/:userId/notifications?limit=20&cursor=xxx
// Paginated notification history
interface NotificationHistoryResponse {
  items: DeliveryRecord[];
  nextCursor: string | null;
}
```

## O — Optimizations & Trade-offs

### Fan-out at Scale

| Approach | Pro | Con |
|---|---|---|
| Synchronous fan-out | Simple | Blocks sender; timeouts kill batch |
| Kafka per-channel topics | Isolated failures | More infra to manage |
| ✅ Priority queues + workers | Critical path fast; normal batched | Slightly more complex |

> Fan-out must be async. A slow SMS gateway must never delay a critical push notification.

### Idempotency

Workers check the `notificationId` against Redis before sending. If found, skip and return cached status. Cassandra stores the final record after delivery. This prevents duplicates on retry.

### Retry Strategy

| Priority | Max Retries | Backoff |
|---|---|---|
| Critical | 5 | 1 s, 2 s, 4 s, 8 s, 16 s |
| Normal | 3 | 5 min, 15 min, 1 hr |
| ❌ DLQ after all retries | Alert on-call | — |

### Rate Limiting

- Per-user: max 10 non-critical notifications/hour to avoid spam
- Per-provider: respect APNs/Twilio rate limits with a token-bucket per worker

### Provider Fallback

```
Push fails (APNs down)
    → retry on FCM (Android) or in-app (web socket)
Email fails (primary SMTP)
    → failover to secondary provider (SES → SendGrid)
```

❌ Never store plaintext device tokens in the DB — encrypt at rest.

## Common Follow-up Questions

**Q: How do you prevent duplicate notifications on retry?**
A: Every notification has a UUID idempotency key. Workers write a "processing" record to Redis before calling the provider. On retry, the key is already present — skip the send. See [../BuildingBlocks/idempotency.md](../BuildingBlocks/) for the pattern.

**Q: How do you handle a celebrity / high-fan-out event?**
A: Batch fan-out into chunks of 10 K recipients. Each chunk is a separate Kafka message consumed by a worker pool. This avoids a single huge job blocking the queue.

**Q: How do you implement quiet hours?**
A: On dequeue, the worker checks `UserPreference.quietHours` via a Redis cache. Non-critical notifications are re-enqueued with a `scheduledAt` set to the end of quiet hours.

**Q: Push vs in-app — when do you use each?**
A: Push requires an installed app and device token. In-app uses a WebSocket and works when the user is active. Critical alerts use push; activity feeds use in-app.

**Q: How do you track open rates?**
A: Embed a 1×1 tracking pixel (email) or a deep-link callback (push). On click/load, the client calls `POST /v1/notifications/:id/event` with `type: "opened"`.

---
[← Back to InterviewQuestions](../README.md)
