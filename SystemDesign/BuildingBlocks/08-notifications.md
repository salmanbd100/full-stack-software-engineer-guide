# Notifications

## 💡 **Concept**

A notification system delivers alerts, updates, and messages to users across multiple channels — push, email, SMS, in-app. At scale, the key challenges are fan-out (one event → millions of recipients), deduplication, user preferences, and reliable delivery.

**Use a dedicated notification service when:** you send > 10k notifications/day or need to fan out across multiple channels.

---

## Notification Channels

| Channel | Latency | Reliability | Cost | Best for |
|---|---|---|---|---|
| **Push** (APNs, FCM) | < 1s | 90–95% (missed if offline) | Low | Mobile alerts, real-time |
| **Email** (SES, SendGrid) | 1–60s | 99%+ | Low–medium | Transactional, marketing |
| **SMS** (Twilio) | 1–10s | 99%+ | High | OTP, critical alerts |
| **In-app** (WebSocket/SSE) | < 100ms | 100% (if connected) | Low | Activity feeds, live updates |
| **Webhook** | 1–5s | Depends on receiver | Low | Developer integrations |

---

## Architecture

```
Event Source (order placed, @mention, new follower)
  │
  ▼
Notification Service
  ├── Preference Check (channel enabled? quiet hours?)
  ├── Deduplication (same event, same user, within 5 min?)
  └── Fan-out → Queue
                 │
          ┌──────┴───────┬──────────┐
          ▼              ▼          ▼
     Push Worker   Email Worker  SMS Worker
      (FCM/APNs)    (SES)        (Twilio)
          │
     Delivery Tracking → DB (sent, delivered, read)
```

**Fan-out:** for a broadcast to 1M users, the service enqueues 1M jobs. Workers consume them in parallel. Never call FCM or SES synchronously in the request path.

---

## TypeScript Pattern

```typescript
type NotificationChannel = "push" | "email" | "sms" | "in_app";

interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

interface NotificationRequest {
  userId: string;
  event: string;
  payload: NotificationPayload;
  channels: NotificationChannel[];
  deduplicationKey?: string;
}

interface UserPreferences {
  channels: Record<NotificationChannel, boolean>;
  quietHours?: { start: number; end: number }; // UTC hours 0–23
}

class NotificationService {
  constructor(
    private readonly queue: QueueClient,
    private readonly prefs: UserPreferenceRepository,
    private readonly dedup: DeduplicationStore
  ) {}

  async send(req: NotificationRequest): Promise<void> {
    // 1. Deduplicate
    if (req.deduplicationKey) {
      if (await this.dedup.check(req.deduplicationKey)) return;
      await this.dedup.mark(req.deduplicationKey, 300); // 5-min window
    }

    // 2. Filter by user preferences
    const userPrefs = await this.prefs.get(req.userId);
    const enabled = req.channels.filter(ch => userPrefs.channels[ch] !== false);

    // 3. Enqueue one job per channel
    await Promise.all(
      enabled.map(channel =>
        this.queue.enqueue(`notifications:${channel}`, {
          userId: req.userId,
          payload: req.payload,
          event: req.event,
        })
      )
    );
  }
}
```

---

## Fan-Out Patterns

**Small fan-out (< 10k recipients):**
- Service queries recipients and enqueues one job per user inline.

**Large fan-out (> 1M — broadcasts):**
- Service enqueues a single "broadcast" job.
- A fan-out worker batches recipients (1000 at a time) and enqueues individual jobs.

```
Broadcast event
  │
  ▼
Fan-out Worker (batches of 1000)
  ├── Batch 1 → 1000 push jobs → Push Workers
  ├── Batch 2 → 1000 push jobs → Push Workers
  └── Batch N → 1000 push jobs → Push Workers
```

---

## Deduplication

```typescript
interface DeduplicationStore {
  check(key: string): Promise<boolean>;
  mark(key: string, ttlSeconds: number): Promise<void>;
}

// Redis SET NX EX pattern
class RedisDeduplicationStore implements DeduplicationStore {
  async check(key: string): Promise<boolean> {
    return (await this.redis.exists(`dedup:${key}`)) === 1;
  }

  async mark(key: string, ttlSeconds: number): Promise<void> {
    await this.redis.set(`dedup:${key}`, "1", "EX", ttlSeconds);
  }
}

// Key format: "{userId}:{event}:{windowHour}"
// "user123:order_shipped:2024010114" → deduped per hour per user per event
```

---

## Quiet Hours & Preferences

```typescript
function isQuietHours(prefs: UserPreferences, hourUTC: number): boolean {
  if (!prefs.quietHours) return false;
  const { start, end } = prefs.quietHours;
  if (start < end) return hourUTC >= start && hourUTC < end;
  return hourUTC >= start || hourUTC < end; // overnight window
}
```

Always check preferences before dispatching. Allow users to opt out per channel and per notification type.

---

## When to Use Each Channel

| Scenario | Channel |
|---|---|
| Order confirmation | Email (user expects it, high reliability) |
| Flash sale alert to all users | Push + in-app (fan-out queue) |
| OTP / security code | SMS (not push — could be phished) |
| Friend activity, comment reply | In-app + push |
| Weekly digest | Email (scheduled batch) |

---

## Common Mistakes

❌ **Dispatching notifications synchronously in the request path** — a slow FCM call blocks the user response. Always enqueue and return immediately.

❌ **No deduplication** — retry logic causes the same notification to arrive twice. Use idempotency keys.

❌ **Ignoring invalid tokens** — FCM/APNs returns errors for expired device tokens. Clean them up or push volume grows without result.

❌ **No opt-out mechanism** — GDPR and CAN-SPAM require unsubscribe support. Build preference management from day one.

✅ **Track delivery state** — store sent/delivered/read timestamps. Suppress redundant channels if in-app confirms delivery.

---

## Real-World Example

A SaaS platform sends notifications when someone is @mentioned. The mention triggers a job enqueued to SQS. A worker checks the user's preferences (email on, push on, in-app always on), deduplicates within a 5-minute window, and dispatches to three channels in parallel. If the user is currently active in the app (tracked via presence in Redis), the push is suppressed. Delivery status is stored in DynamoDB and displayed as an unread count in the app.

---

## Key Insight

> A notification is a contract with the user. Deliver it reliably, respect preferences, and never send duplicates. The queue and deduplication layer are not optional — they are what make the system trustworthy at scale.

**Related:** [Message Queues](./05-message-queues.md) · [WebSockets](./06-websockets.md) · [Interview: Notification System](../InterviewQuestions/13-notification-system.md)

---

[← Back to SystemDesign](../README.md)
