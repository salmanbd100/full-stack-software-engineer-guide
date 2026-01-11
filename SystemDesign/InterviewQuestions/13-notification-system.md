# Design Notification System (Push/Email/SMS/In-App)

## Problem Statement

Design a scalable, reliable notification system that supports multiple delivery channels (push notifications, email, SMS, in-app) with user preferences, rate limiting, priority queuing, and analytics. The system should handle billions of notifications per day without losing messages.

**Examples**: Facebook notifications, Uber ride updates, Amazon order confirmations, Slack mentions

## Requirements

### Functional Requirements

**Core Features:**
1. ✅ **Multi-Channel Delivery**: Push (iOS/Android), Email, SMS, In-app
2. ✅ **User Preferences**: Per-channel opt-in/opt-out, notification types
3. ✅ **Priority Levels**: Critical (immediate), High (5 min), Normal (batched)
4. ✅ **Templates**: Reusable notification templates with variables
5. ✅ **Scheduling**: Send at specific time or delay
6. ✅ **Notification History**: Track sent notifications
7. ✅ **Read Receipts**: Track delivery and open rates
8. ✅ **Aggregation**: Group similar notifications (e.g., "5 people liked your post")

**Out of Scope** (Nice to Have):
- ❌ Rich media notifications (images, videos)
- ❌ Interactive notifications (action buttons)
- ❌ A/B testing framework
- ❌ Localization/i18n

### Non-Functional Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| **Reliability** | 99.9% delivery | No lost notifications |
| **Latency** | < 5s for critical | Real-time alerts matter |
| **Throughput** | 100K notif/sec | Handle traffic spikes |
| **Availability** | 99.99% | Always operational |
| **Idempotency** | No duplicates | Same notification not sent twice |

## Capacity Estimation

### 💡 **Traffic Estimates**

**Assumptions:**
```
Total users: 500 million
Daily Active Users (DAU): 100 million (20%)
Notifications per user per day: 10
Total notifications per day: 1 billion
Notifications per second (avg): 11,600/sec
Peak traffic: 5x average = 58,000 notif/sec
```

**Channel Distribution:**
```
Push notifications: 60% = 600M/day = 6,960/sec
Email: 25% = 250M/day = 2,900/sec
SMS: 5% = 50M/day = 580/sec
In-app: 10% = 100M/day = 1,160/sec
```

### 💡 **Storage Estimates**

**Notification Metadata:**
```
Average notification size: 1 KB (user_id, type, content, metadata)
Daily storage: 1B × 1 KB = 1 TB/day
Yearly storage: 365 TB/year
Keep history for 30 days: ~30 TB
```

**User Preferences:**
```
Users: 500M
Preferences per user: 500 bytes (channel settings, notification types)
Total: 250 GB (easily fits in memory/cache)
```

### 💡 **Cost Estimates**

**Third-Party Services:**
```
Push (FCM/APNS): Free
Email (SendGrid): $0.0006/email × 250M = $150,000/day
SMS (Twilio): $0.01/SMS × 50M = $500,000/day
Total: ~$650K/day = ~$20M/month
```

## High-Level Design

### Architecture Overview

```
                         ┌─────────────────────┐
                         │   Client/Services   │
                         │  (Trigger Events)   │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Notification API  │
                         │  (REST/GraphQL)     │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Notification Core  │
                         │  - Validation       │
                         │  - Preferences      │
                         │  - Rate Limiting    │
                         │  - Deduplication    │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │      Kafka          │
                         │  (Message Queue)    │
                         └──────────┬──────────┘
                                    │
                ┌───────────────────┼───────────────────┐
                │                   │                   │
                ▼                   ▼                   ▼
      ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
      │ Push Worker  │    │ Email Worker │    │  SMS Worker  │
      │   (FCM/APNS) │    │  (SendGrid)  │    │   (Twilio)   │
      └──────────────┘    └──────────────┘    └──────────────┘
                │                   │                   │
                └───────────────────┼───────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │  Analytics Service  │
                         │  - Delivery status  │
                         │  - Open rates       │
                         └─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │    PostgreSQL       │
                         │  (Notification Log) │
                         └─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │       Redis         │
                         │  - Preferences      │
                         │  - Rate limits      │
                         │  - Deduplication    │
                         └─────────────────────┘
```

### 💡 **Key Components**

| Component | Technology | Purpose | Scale |
|-----------|-----------|---------|-------|
| **Notification API** | Node.js, Go | Entry point for notification requests | 100 servers |
| **Notification Core** | Java, Go | Business logic, validation, routing | 200 servers |
| **Message Queue** | Apache Kafka | Async processing, buffer | 20 brokers |
| **Push Workers** | Node.js + FCM/APNS | Deliver push notifications | 50 workers |
| **Email Workers** | Python + SendGrid API | Send emails | 20 workers |
| **SMS Workers** | Go + Twilio API | Send SMS | 10 workers |
| **In-App Workers** | WebSocket | Real-time in-app notifications | 50 servers |
| **Database** | PostgreSQL | Notification history, templates | Primary + replicas |
| **Cache** | Redis | User preferences, rate limits | 20 nodes |
| **Analytics** | ClickHouse | Delivery tracking, analytics | 10 nodes |

## Detailed Design

### 💡 **Notification Flow (End-to-End)**

**Step-by-Step Process:**

```javascript
// 1. Service triggers notification
async function triggerNotification(userId, eventType, data) {
  // Event: "order_confirmed", "new_message", "price_drop", etc.

  const notification = {
    user_id: userId,
    event_type: eventType,
    data: data,
    timestamp: Date.now(),
    request_id: generateUUID(), // For deduplication
  };

  // Send to Notification API
  await fetch('https://notifications.example.com/api/send', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer token' },
    body: JSON.stringify(notification),
  });
}

// Example: Order service triggers notification
await triggerNotification('user123', 'order_confirmed', {
  order_id: 'order456',
  amount: 99.99,
  delivery_time: '2 hours',
});
```

**2. Notification Core Processing:**

```javascript
class NotificationService {
  async processNotification(request) {
    const { user_id, event_type, data, request_id } = request;

    // Step 1: Deduplication check
    const isDuplicate = await this.checkDuplicates(request_id);
    if (isDuplicate) {
      console.log('Duplicate notification, skipping');
      return { status: 'duplicate' };
    }

    // Step 2: Get user preferences
    const preferences = await this.getUserPreferences(user_id);
    if (!preferences.enabled[event_type]) {
      console.log('User opted out of this notification type');
      return { status: 'opted_out' };
    }

    // Step 3: Check rate limits
    const rateLimitOk = await this.checkRateLimit(user_id, event_type);
    if (!rateLimitOk) {
      console.log('Rate limit exceeded');
      return { status: 'rate_limited' };
    }

    // Step 4: Determine channels based on preferences
    const channels = this.selectChannels(preferences, event_type);
    // Returns: ['push', 'email'] or ['sms'] depending on user settings

    // Step 5: Get notification template
    const template = await this.getTemplate(event_type);

    // Step 6: Render notification content for each channel
    const notifications = [];
    for (const channel of channels) {
      const content = this.renderTemplate(template, channel, data);
      notifications.push({
        notification_id: generateUUID(),
        user_id: user_id,
        channel: channel,
        content: content,
        priority: this.getPriority(event_type), // 'critical', 'high', 'normal'
        scheduled_at: Date.now(),
      });
    }

    // Step 7: Publish to Kafka (channel-specific topics)
    for (const notif of notifications) {
      await kafka.send({
        topic: `notifications-${notif.channel}`, // notifications-push, notifications-email
        key: user_id,
        value: JSON.stringify(notif),
      });
    }

    // Step 8: Mark as processed (deduplication)
    await redis.setex(`notif:${request_id}`, 3600, 'processed');

    // Step 9: Log to database (async)
    await this.logNotification(notifications);

    return { status: 'sent', notification_ids: notifications.map(n => n.notification_id) };
  }

  selectChannels(preferences, eventType) {
    const channels = [];

    // Critical events: Always send push if enabled
    if (eventType === 'fraud_alert' && preferences.channels.push) {
      channels.push('push');
    }

    // Regular events: Follow user preferences
    if (preferences.channels.push && preferences.event_types[eventType]?.push) {
      channels.push('push');
    }
    if (preferences.channels.email && preferences.event_types[eventType]?.email) {
      channels.push('email');
    }
    if (preferences.channels.sms && preferences.event_types[eventType]?.sms) {
      channels.push('sms');
    }

    return channels;
  }

  getPriority(eventType) {
    const criticalEvents = ['fraud_alert', 'security_breach', 'payment_failed'];
    const highEvents = ['order_confirmed', 'delivery_started', 'new_message'];

    if (criticalEvents.includes(eventType)) return 'critical';
    if (highEvents.includes(eventType)) return 'high';
    return 'normal';
  }
}
```

### 💡 **Channel Workers**

**Push Notification Worker (FCM/APNS):**

```javascript
class PushWorker {
  constructor() {
    this.fcm = initializeFCM(); // Firebase Cloud Messaging
    this.apns = initializeAPNS(); // Apple Push Notification Service
    this.consumer = createKafkaConsumer('notifications-push');
  }

  async start() {
    this.consumer.on('message', async (message) => {
      const notification = JSON.parse(message.value);
      await this.sendPush(notification);
    });
  }

  async sendPush(notification) {
    const { user_id, content, notification_id, priority } = notification;

    // Get user's device tokens
    const devices = await db.user_devices.find({ user_id: user_id });

    for (const device of devices) {
      try {
        if (device.platform === 'ios') {
          await this.sendAPNS(device.token, content, priority);
        } else if (device.platform === 'android') {
          await this.sendFCM(device.token, content, priority);
        }

        // Log success
        await this.updateStatus(notification_id, device.device_id, 'delivered');
      } catch (error) {
        console.error(`Failed to send push to ${device.device_id}:`, error);

        // Retry logic with exponential backoff
        if (error.code === 'UNAVAILABLE') {
          await this.retryPush(notification, device, retryCount = 1);
        } else if (error.code === 'INVALID_TOKEN') {
          // Device token expired, remove from database
          await db.user_devices.deleteOne({ device_id: device.device_id });
        }

        await this.updateStatus(notification_id, device.device_id, 'failed', error.message);
      }
    }
  }

  async sendFCM(token, content, priority) {
    const message = {
      token: token,
      notification: {
        title: content.title,
        body: content.body,
      },
      data: content.data,
      android: {
        priority: priority === 'critical' ? 'high' : 'normal',
        ttl: 86400, // 24 hours
      },
    };

    return await this.fcm.send(message);
  }

  async sendAPNS(token, content, priority) {
    const notification = {
      aps: {
        alert: {
          title: content.title,
          body: content.body,
        },
        sound: 'default',
        badge: 1,
        'thread-id': content.thread_id, // For grouping
        'content-available': 1,
      },
      data: content.data,
    };

    const options = {
      priority: priority === 'critical' ? 10 : 5,
      expiration: Math.floor(Date.now() / 1000) + 86400, // 24h TTL
    };

    return await this.apns.send(notification, token, options);
  }

  async retryPush(notification, device, retryCount) {
    const MAX_RETRIES = 3;
    if (retryCount > MAX_RETRIES) {
      console.log('Max retries reached, giving up');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, retryCount), 60000); // Max 60s
    setTimeout(async () => {
      try {
        if (device.platform === 'ios') {
          await this.sendAPNS(device.token, notification.content, notification.priority);
        } else {
          await this.sendFCM(device.token, notification.content, notification.priority);
        }
        await this.updateStatus(notification.notification_id, device.device_id, 'delivered');
      } catch (error) {
        await this.retryPush(notification, device, retryCount + 1);
      }
    }, delay);
  }
}
```

**Email Worker:**

```javascript
class EmailWorker {
  constructor() {
    this.sendgrid = initializeSendGrid(process.env.SENDGRID_API_KEY);
    this.consumer = createKafkaConsumer('notifications-email');
  }

  async start() {
    this.consumer.on('message', async (message) => {
      const notification = JSON.parse(message.value);
      await this.sendEmail(notification);
    });
  }

  async sendEmail(notification) {
    const { user_id, content, notification_id } = notification;

    // Get user email
    const user = await db.users.findOne({ user_id: user_id });
    if (!user || !user.email) {
      console.log('User email not found');
      return;
    }

    const email = {
      to: user.email,
      from: 'notifications@example.com',
      subject: content.subject,
      html: content.html_body,
      text: content.text_body, // Fallback for non-HTML clients
      tracking_settings: {
        click_tracking: { enable: true },
        open_tracking: { enable: true },
      },
      custom_args: {
        notification_id: notification_id,
        user_id: user_id,
      },
    };

    try {
      const response = await this.sendgrid.send(email);
      await this.updateStatus(notification_id, 'delivered', {
        message_id: response.message_id,
      });
    } catch (error) {
      console.error('Failed to send email:', error);

      // Retry for transient errors
      if (error.code >= 500) {
        await this.retryEmail(notification, retryCount = 1);
      }

      await this.updateStatus(notification_id, 'failed', error.message);
    }
  }

  async retryEmail(notification, retryCount) {
    const MAX_RETRIES = 5;
    if (retryCount > MAX_RETRIES) return;

    const delay = Math.min(5000 * Math.pow(2, retryCount), 300000); // Max 5 min
    setTimeout(async () => {
      await this.sendEmail(notification);
    }, delay);
  }
}
```

**SMS Worker:**

```javascript
class SMSWorker {
  constructor() {
    this.twilio = initializeTwilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.consumer = createKafkaConsumer('notifications-sms');
  }

  async start() {
    this.consumer.on('message', async (message) => {
      const notification = JSON.parse(message.value);
      await this.sendSMS(notification);
    });
  }

  async sendSMS(notification) {
    const { user_id, content, notification_id } = notification;

    // Get user phone number
    const user = await db.users.findOne({ user_id: user_id });
    if (!user || !user.phone_number) {
      console.log('User phone number not found');
      return;
    }

    try {
      const message = await this.twilio.messages.create({
        body: content.text,
        to: user.phone_number,
        from: process.env.TWILIO_PHONE_NUMBER,
        statusCallback: `https://api.example.com/sms/status/${notification_id}`,
      });

      await this.updateStatus(notification_id, 'sent', {
        message_sid: message.sid,
      });
    } catch (error) {
      console.error('Failed to send SMS:', error);

      // Don't retry SMS - too expensive and user may be annoyed
      await this.updateStatus(notification_id, 'failed', error.message);
    }
  }
}
```

### 💡 **User Preferences Management**

**Preference Schema:**

```javascript
// User preferences stored in Redis + PostgreSQL
{
  user_id: "user123",
  channels: {
    push: true,
    email: true,
    sms: false,
    in_app: true
  },
  event_types: {
    "order_confirmed": {
      push: true,
      email: true,
      sms: false
    },
    "price_drop": {
      push: true,
      email: false,
      sms: false
    },
    "new_message": {
      push: true,
      email: false,
      sms: false,
      in_app: true
    },
    "marketing": {
      push: false,
      email: true,
      sms: false
    }
  },
  quiet_hours: {
    enabled: true,
    start: "22:00",
    end: "08:00",
    timezone: "America/New_York"
  },
  frequency_caps: {
    "marketing": {
      max_per_day: 2,
      max_per_week: 5
    }
  }
}
```

**API Endpoints:**

```javascript
// Get user preferences
app.get('/api/users/:userId/preferences', async (req, res) => {
  const { userId } = req.params;

  // Try cache first
  const cached = await redis.get(`preferences:${userId}`);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // Fetch from database
  const preferences = await db.user_preferences.findOne({ user_id: userId });

  // Cache for 1 hour
  await redis.setex(`preferences:${userId}`, 3600, JSON.stringify(preferences));

  res.json(preferences);
});

// Update preferences
app.put('/api/users/:userId/preferences', async (req, res) => {
  const { userId } = req.params;
  const updates = req.body;

  // Validate updates
  if (!validatePreferences(updates)) {
    return res.status(400).json({ error: 'Invalid preferences' });
  }

  // Update database
  await db.user_preferences.updateOne(
    { user_id: userId },
    { $set: updates },
    { upsert: true }
  );

  // Invalidate cache
  await redis.del(`preferences:${userId}`);

  res.json({ status: 'updated' });
});

// Unsubscribe from all (one-click unsubscribe)
app.post('/api/unsubscribe/:token', async (req, res) => {
  const { token } = req.params;

  // Decode token to get user_id and channel
  const { user_id, channel } = decodeToken(token);

  await db.user_preferences.updateOne(
    { user_id: user_id },
    { $set: { [`channels.${channel}`]: false } }
  );

  await redis.del(`preferences:${user_id}`);

  res.send('You have been unsubscribed successfully.');
});
```

### 💡 **Rate Limiting**

**Per-User Rate Limiting:**

```javascript
async function checkRateLimit(userId, eventType) {
  const key = `rate_limit:${userId}:${eventType}`;

  // Get user's frequency cap for this event type
  const preferences = await getUserPreferences(userId);
  const cap = preferences.frequency_caps?.[eventType];

  if (!cap) {
    return true; // No rate limit configured
  }

  // Check daily limit
  const dailyKey = `${key}:${getDate()}`;
  const dailyCount = await redis.incr(dailyKey);

  if (dailyCount === 1) {
    await redis.expire(dailyKey, 86400); // 24 hours
  }

  if (dailyCount > cap.max_per_day) {
    console.log('Daily rate limit exceeded');
    return false;
  }

  // Check weekly limit
  const weeklyKey = `${key}:week:${getWeek()}`;
  const weeklyCount = await redis.incr(weeklyKey);

  if (weeklyCount === 1) {
    await redis.expire(weeklyKey, 604800); // 7 days
  }

  if (weeklyCount > cap.max_per_week) {
    console.log('Weekly rate limit exceeded');
    return false;
  }

  return true;
}

// Helper functions
function getDate() {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

function getWeek() {
  const date = new Date();
  const year = date.getFullYear();
  const week = Math.ceil((date - new Date(year, 0, 1)) / 604800000);
  return `${year}-W${week}`;
}
```

**Quiet Hours:**

```javascript
async function checkQuietHours(userId) {
  const preferences = await getUserPreferences(userId);

  if (!preferences.quiet_hours?.enabled) {
    return true; // Quiet hours not enabled
  }

  const { start, end, timezone } = preferences.quiet_hours;

  // Get user's local time
  const userTime = new Date().toLocaleString('en-US', { timeZone: timezone });
  const currentHour = new Date(userTime).getHours();
  const currentMinutes = new Date(userTime).getMinutes();
  const currentTime = currentHour * 60 + currentMinutes;

  const [startHour, startMin] = start.split(':').map(Number);
  const [endHour, endMin] = end.split(':').map(Number);
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;

  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime < startTime && currentTime >= endTime;
  }

  return currentTime < startTime || currentTime >= endTime;
}
```

### 💡 **Notification Aggregation**

**Problem**: User receives 50 "like" notifications → spam

**Solution**: Aggregate similar notifications

```javascript
class NotificationAggregator {
  constructor() {
    this.aggregationWindow = 300000; // 5 minutes
  }

  async aggregate(notification) {
    const { user_id, event_type, data } = notification;

    // Check if there are pending notifications of same type
    const key = `pending:${user_id}:${event_type}`;
    const pending = await redis.get(key);

    if (!pending) {
      // First notification of this type, start aggregation window
      await redis.setex(key, this.aggregationWindow / 1000, JSON.stringify([notification]));

      // Schedule aggregated send
      setTimeout(() => {
        this.sendAggregated(user_id, event_type);
      }, this.aggregationWindow);
    } else {
      // Add to pending notifications
      const notifications = JSON.parse(pending);
      notifications.push(notification);
      await redis.setex(key, this.aggregationWindow / 1000, JSON.stringify(notifications));
    }
  }

  async sendAggregated(userId, eventType) {
    const key = `pending:${userId}:${eventType}`;
    const pending = await redis.get(key);

    if (!pending) return;

    const notifications = JSON.parse(pending);

    // Generate aggregated message
    let message;
    if (eventType === 'post_liked') {
      const count = notifications.length;
      const names = notifications.slice(0, 3).map(n => n.data.liker_name);

      if (count === 1) {
        message = `${names[0]} liked your post`;
      } else if (count === 2) {
        message = `${names[0]} and ${names[1]} liked your post`;
      } else {
        message = `${names[0]}, ${names[1]}, and ${count - 2} others liked your post`;
      }
    }

    // Send aggregated notification
    await this.sendNotification({
      user_id: userId,
      event_type: eventType,
      content: { title: 'Activity', body: message },
      aggregated_count: notifications.length,
    });

    // Clear pending
    await redis.del(key);
  }
}
```

### 💡 **Deduplication**

**Prevent duplicate notifications:**

```javascript
async function checkDuplicate(requestId) {
  const key = `notif:${requestId}`;
  const exists = await redis.get(key);

  if (exists) {
    return true; // Duplicate
  }

  // Mark as processed (TTL: 1 hour)
  await redis.setex(key, 3600, 'processed');
  return false;
}

// Alternative: Content-based deduplication
async function checkContentDuplicate(userId, eventType, content) {
  const hash = crypto.createHash('sha256')
    .update(`${userId}:${eventType}:${JSON.stringify(content)}`)
    .digest('hex');

  const key = `content_hash:${hash}`;
  const exists = await redis.get(key);

  if (exists) {
    return true; // Duplicate content
  }

  // Don't send same content within 1 hour
  await redis.setex(key, 3600, 'sent');
  return false;
}
```

## Database Schema

### 💡 **PostgreSQL (Notification History)**

```sql
-- Notifications table
CREATE TABLE notifications (
  notification_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  channel VARCHAR(20) NOT NULL, -- 'push', 'email', 'sms', 'in_app'
  priority VARCHAR(20) NOT NULL, -- 'critical', 'high', 'normal'
  content JSONB NOT NULL,
  status VARCHAR(20) NOT NULL, -- 'sent', 'delivered', 'failed', 'read'
  created_at TIMESTAMP DEFAULT NOW(),
  delivered_at TIMESTAMP,
  read_at TIMESTAMP,
  error_message TEXT,
  metadata JSONB,
  INDEX idx_user_created (user_id, created_at DESC),
  INDEX idx_status_created (status, created_at DESC)
);

-- User preferences
CREATE TABLE user_preferences (
  user_id UUID PRIMARY KEY,
  channels JSONB NOT NULL, -- { push: true, email: true, sms: false }
  event_types JSONB NOT NULL, -- { order_confirmed: { push: true, email: true } }
  quiet_hours JSONB,
  frequency_caps JSONB,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Notification templates
CREATE TABLE notification_templates (
  template_id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL UNIQUE,
  channels JSONB NOT NULL, -- { push: {...}, email: {...}, sms: {...} }
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example template
{
  "event_type": "order_confirmed",
  "channels": {
    "push": {
      "title": "Order Confirmed",
      "body": "Your order #{{order_id}} has been confirmed. Delivery in {{delivery_time}}."
    },
    "email": {
      "subject": "Order #{{order_id}} Confirmed",
      "html_body": "<h1>Thank you for your order!</h1><p>Order #{{order_id}} will be delivered in {{delivery_time}}.</p>",
      "text_body": "Thank you for your order! Order #{{order_id}} will be delivered in {{delivery_time}}."
    },
    "sms": {
      "text": "Order #{{order_id}} confirmed. Delivery: {{delivery_time}}."
    }
  }
}

-- User devices (for push notifications)
CREATE TABLE user_devices (
  device_id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  platform VARCHAR(20) NOT NULL, -- 'ios', 'android', 'web'
  device_token TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_active TIMESTAMP DEFAULT NOW(),
  INDEX idx_user (user_id)
);
```

### 💡 **Redis (Cache & Rate Limiting)**

```
# User preferences cache
preferences:{user_id} → JSON (TTL: 1 hour)

# Rate limiting
rate_limit:{user_id}:{event_type}:{date} → count (TTL: 24 hours)
rate_limit:{user_id}:{event_type}:week:{week} → count (TTL: 7 days)

# Deduplication
notif:{request_id} → "processed" (TTL: 1 hour)
content_hash:{hash} → "sent" (TTL: 1 hour)

# Aggregation
pending:{user_id}:{event_type} → [notifications] (TTL: 5 minutes)

# Quiet hours check (cache result)
quiet_hours:{user_id} → boolean (TTL: 15 minutes)
```

### 💡 **ClickHouse (Analytics)**

```sql
-- Notification analytics table (optimized for time-series queries)
CREATE TABLE notification_analytics (
  notification_id UUID,
  user_id UUID,
  event_type String,
  channel String,
  status String,
  created_at DateTime,
  delivered_at DateTime,
  read_at DateTime,
  country String,
  device_type String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (event_type, created_at);

-- Query: Daily delivery rate by channel
SELECT
  channel,
  toDate(created_at) AS date,
  COUNT(*) AS sent,
  countIf(status = 'delivered') AS delivered,
  (delivered / sent) * 100 AS delivery_rate
FROM notification_analytics
WHERE created_at >= now() - INTERVAL 7 DAY
GROUP BY channel, date
ORDER BY date DESC;

-- Query: Open rate by event type
SELECT
  event_type,
  COUNT(*) AS sent,
  countIf(status = 'read') AS opened,
  (opened / sent) * 100 AS open_rate
FROM notification_analytics
WHERE channel = 'email'
  AND created_at >= now() - INTERVAL 30 DAY
GROUP BY event_type
ORDER BY open_rate DESC;
```

## API Design

### 💡 **REST API Endpoints**

**Send Notification:**
```http
POST /api/notifications/send
Authorization: Bearer {api_key}
Content-Type: application/json

{
  "user_id": "user123",
  "event_type": "order_confirmed",
  "data": {
    "order_id": "order456",
    "amount": 99.99,
    "delivery_time": "2 hours"
  },
  "priority": "high",
  "request_id": "uuid" // For idempotency
}

Response:
{
  "status": "sent",
  "notification_ids": ["notif123", "notif456"]
}
```

**Get User Notifications (In-App):**
```http
GET /api/users/{user_id}/notifications?limit=20&before={timestamp}
Authorization: Bearer {token}

Response:
{
  "notifications": [
    {
      "notification_id": "notif123",
      "event_type": "order_confirmed",
      "content": {
        "title": "Order Confirmed",
        "body": "Your order #456 has been confirmed."
      },
      "created_at": 1700000000000,
      "read": false
    }
  ],
  "has_more": true
}
```

**Mark as Read:**
```http
PUT /api/notifications/{notification_id}/read
Authorization: Bearer {token}

Response:
{
  "status": "updated"
}
```

**Update Preferences:**
```http
PUT /api/users/{user_id}/preferences
Authorization: Bearer {token}
Content-Type: application/json

{
  "channels": {
    "push": true,
    "email": false
  },
  "event_types": {
    "marketing": {
      "push": false,
      "email": false
    }
  }
}

Response:
{
  "status": "updated"
}
```

## Deep Dives

### 💡 **Priority Queue System**

**Problem**: Critical notifications (fraud alert) should be sent immediately, marketing can wait

**Solution: Multiple Kafka Topics with Priority**

```javascript
// Priority-based topic routing
function getKafkaTopic(channel, priority) {
  const topicMap = {
    'critical': `notifications-${channel}-critical`,
    'high': `notifications-${channel}-high`,
    'normal': `notifications-${channel}-normal`,
  };
  return topicMap[priority] || topicMap['normal'];
}

// Workers consume critical topics first
class PrioritizedWorker {
  constructor(channel) {
    this.channel = channel;
    this.consumers = {
      critical: createKafkaConsumer(`notifications-${channel}-critical`),
      high: createKafkaConsumer(`notifications-${channel}-high`),
      normal: createKafkaConsumer(`notifications-${channel}-normal`),
    };
  }

  async start() {
    // Process critical first
    this.consumers.critical.on('message', async (msg) => {
      await this.process(JSON.parse(msg.value));
    });

    // Then high
    this.consumers.high.on('message', async (msg) => {
      await this.process(JSON.parse(msg.value));
    });

    // Finally normal (with batching for efficiency)
    const normalBatch = [];
    this.consumers.normal.on('message', async (msg) => {
      normalBatch.push(JSON.parse(msg.value));

      if (normalBatch.length >= 100) {
        await this.processBatch(normalBatch);
        normalBatch.length = 0;
      }
    });
  }
}
```

### 💡 **Delivery Tracking & Analytics**

**Track delivery and engagement:**

```javascript
// Webhook handler for delivery status (from FCM, SendGrid, Twilio)
app.post('/webhooks/delivery/:channel', async (req, res) => {
  const { channel } = req.params;
  const event = req.body;

  switch (channel) {
    case 'fcm':
      // FCM sends delivery receipts
      if (event.event_type === 'delivered') {
        await updateNotificationStatus(event.notification_id, 'delivered');
      } else if (event.event_type === 'clicked') {
        await updateNotificationStatus(event.notification_id, 'read');
      }
      break;

    case 'sendgrid':
      // SendGrid tracking events
      if (event.event === 'delivered') {
        await updateNotificationStatus(event.notification_id, 'delivered');
      } else if (event.event === 'open') {
        await updateNotificationStatus(event.notification_id, 'read');
      } else if (event.event === 'click') {
        await trackNotificationClick(event.notification_id, event.url);
      }
      break;

    case 'twilio':
      // Twilio status callback
      if (event.MessageStatus === 'delivered') {
        await updateNotificationStatus(event.notification_id, 'delivered');
      } else if (event.MessageStatus === 'failed') {
        await updateNotificationStatus(event.notification_id, 'failed', event.ErrorMessage);
      }
      break;
  }

  res.sendStatus(200);
});

// Analytics aggregation
async function generateDailyReport() {
  const today = new Date().toISOString().split('T')[0];

  const stats = await db.notifications.aggregate([
    { $match: { created_at: { $gte: new Date(today) } } },
    {
      $group: {
        _id: { channel: '$channel', event_type: '$event_type' },
        sent: { $sum: 1 },
        delivered: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        read: { $sum: { $cond: [{ $eq: ['$status', 'read'] }, 1, 0] } },
        failed: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
      },
    },
  ]);

  // Send to ClickHouse for long-term analytics
  for (const stat of stats) {
    await clickhouse.insert('notification_daily_stats', {
      date: today,
      channel: stat._id.channel,
      event_type: stat._id.event_type,
      sent: stat.sent,
      delivered: stat.delivered,
      read: stat.read,
      failed: stat.failed,
      delivery_rate: (stat.delivered / stat.sent) * 100,
      read_rate: (stat.read / stat.delivered) * 100,
    });
  }
}
```

## Trade-offs & Bottlenecks

### 💡 **Key Trade-offs**

| Decision | Chosen Approach | Alternative | Rationale |
|----------|----------------|-------------|-----------|
| **Third-Party vs In-House** | Third-party (FCM, SendGrid, Twilio) | Build custom | Faster time-to-market, better deliverability |
| **Real-time vs Batching** | Hybrid (critical = real-time, marketing = batch) | All real-time | Reduce costs and API rate limits |
| **Storage Duration** | 30 days | 1 year | Balance storage costs with usefulness |
| **Delivery Guarantee** | At-least-once | Exactly-once | Simpler, acceptable duplicates |
| **Aggregation** | 5-minute window | Real-time | Reduce spam, better UX |

### 💡 **Potential Bottlenecks**

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| **Kafka** | Topic partitions | Partition by user_id, scale brokers |
| **Workers** | Third-party API rate limits | Batch requests, add more workers |
| **Database** | Write throughput | PostgreSQL → Cassandra for high writes |
| **Preferences** | Database reads | Cache in Redis (99% hit rate) |
| **Third-party outage** | Single provider failure | Multi-provider fallback (SendGrid → AWS SES) |

### 💡 **Failure Scenarios**

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **Kafka Down** | Notifications queued | Kafka replication (RF=3), fallback to SQS |
| **Worker Crash** | Delayed delivery | Auto-restart, horizontal scaling |
| **FCM/APNS Down** | Push failures | Retry with exponential backoff, fallback to in-app |
| **Database Down** | Can't log history | Use replicas, eventual consistency OK |
| **Rate Limit Hit** | Throttled by provider | Batch requests, multiple API keys |

## Interview Discussion Points

**Q: How do you ensure no notification is lost?**

A: We implement multiple layers of reliability:
1. **Kafka Persistence**: Messages stored durably with replication (RF=3)
2. **Worker Retries**: Exponential backoff for transient failures (3-5 retries)
3. **Dead Letter Queue**: Failed notifications go to DLQ for manual review
4. **Status Tracking**: Every notification has delivery status in database
5. **Monitoring**: Alerts on failure rate > 1%

**Q: How do you handle third-party API rate limits?**

A: Multiple strategies:
1. **Batching**: Group notifications into batches (e.g., SendGrid allows 1000 emails/request)
2. **Multiple API Keys**: Rotate between keys to increase limit
3. **Prioritization**: Send critical notifications immediately, batch marketing
4. **Backpressure**: If hitting limits, slow down non-critical notifications
5. **Fallback Providers**: Switch to AWS SES if SendGrid is rate-limited

**Q: How would you add A/B testing for notifications?**

A: Implement experiment framework:
1. **Variant Assignment**: Hash user_id to assign to control/treatment groups
2. **Template Variants**: Store multiple templates per event_type
3. **Tracking**: Log which variant was sent, track engagement metrics
4. **Analysis**: Compare open rates, click rates, conversion rates
5. **Winner Selection**: Promote winning variant after statistical significance

**Q: How do you prevent notification spam?**

A:
1. **User Preferences**: Granular opt-in/opt-out controls
2. **Rate Limiting**: Cap notifications per day/week by type
3. **Quiet Hours**: Respect user's sleep schedule
4. **Aggregation**: Combine similar notifications (e.g., "5 likes" instead of 5 separate)
5. **Smart Delivery**: Don't notify if user already saw the content

**Q: How do you scale to support 1 million notifications per second?**

A:
1. **Horizontal Scaling**: Add more Kafka brokers and workers (stateless)
2. **Partitioning**: Partition by user_id for even distribution
3. **Caching**: Cache user preferences in Redis (avoid DB lookups)
4. **Async Processing**: Everything is async via Kafka
5. **Geographic Distribution**: Deploy in multiple regions

## Follow-up Enhancements

**Additional Features:**

1. **Rich Notifications**: Images, videos, action buttons
2. **Personalization**: ML-based content optimization per user
3. **Smart Timing**: Send notifications when user is most likely to engage
4. **Interactive Actions**: "Reply", "Mark as done" from notification
5. **Channel Fallback**: If push fails, try SMS
6. **Notification Inbox**: Persistent in-app notification center
7. **Digest Emails**: Daily/weekly summary instead of real-time
8. **Multi-language**: i18n support with user's preferred language

**Monitoring & Observability:**

- **Metrics**: Delivery rate, open rate, click-through rate, latency
- **Alerts**: Failure rate > 1%, latency > 10s, third-party outages
- **Dashboards**: Real-time Grafana dashboard with channel health
- **Logging**: ELK stack for debugging failed notifications
- **Tracing**: Jaeger for end-to-end latency tracking

## Summary

**Key Architectural Decisions:**

1. ✅ **Multi-Channel Support**: Push, Email, SMS, In-app via separate workers
2. ✅ **Kafka for Async**: Decouple notification generation from delivery
3. ✅ **Third-Party Providers**: FCM/APNS (push), SendGrid (email), Twilio (SMS)
4. ✅ **User Preferences**: Granular control per channel and event type
5. ✅ **Priority Queues**: Critical → High → Normal with separate Kafka topics
6. ✅ **Rate Limiting**: Per-user caps to prevent spam
7. ✅ **Aggregation**: Combine similar notifications within 5-minute window

**Scale:**
- 1B notifications/day (11,600/sec average, 58,000/sec peak)
- 500M users with preferences
- 30 TB notification history (30 days retention)
- < 5s latency for critical notifications

**Trade-offs:**
- Third-party providers (fast) vs in-house (control)
- At-least-once delivery (duplicates possible)
- 30-day retention (storage cost vs usefulness)
- Batching normal priority (efficiency vs real-time)

---
[← Back to SystemDesign](../README.md)
