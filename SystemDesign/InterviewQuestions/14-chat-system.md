# Design Chat System (WhatsApp/Slack/Discord)

## Problem Statement

Design a scalable real-time chat system that supports one-on-one messaging, group chats, online presence, typing indicators, read receipts, and message history. The system should handle billions of messages per day with low latency and high availability.

**Examples**: WhatsApp, Slack, Discord, Facebook Messenger, Telegram

## Requirements

### Functional Requirements

**Core Features:**
1. ✅ **One-on-One Chat**: Direct messaging between two users
2. ✅ **Group Chat**: Multi-user conversations (up to 500 members)
3. ✅ **Online Status**: Show user presence (online, away, offline)
4. ✅ **Typing Indicators**: Show when someone is typing
5. ✅ **Read Receipts**: Show message delivery and read status
6. ✅ **Message History**: Retrieve past conversations
7. ✅ **File Attachments**: Share images, videos, documents
8. ✅ **Multi-Device Sync**: Same account on multiple devices

**Out of Scope** (Nice to Have):
- ❌ End-to-end encryption (Signal protocol)
- ❌ Voice/video calls
- ❌ Message reactions and threads
- ❌ Message search

### Non-Functional Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| **Latency** | < 200ms | Real-time feel |
| **Availability** | 99.99% | 52 min downtime/year |
| **Consistency** | Eventual | Message order matters, but slight delay OK |
| **Scale** | 500M DAU | WhatsApp scale |
| **Throughput** | 300K msg/sec | Peak traffic handling |

## Capacity Estimation

### 💡 **Traffic Estimates**

**Assumptions:**
```
Daily Active Users (DAU): 500 million
Messages per user per day: 50
Total messages per day: 25 billion
Messages per second (avg): 289,000 writes/sec
Peak traffic: 3x average = 867,000 writes/sec
Read:Write ratio: 2:1 = 578,000 reads/sec (message retrieval)
```

### 💡 **Storage Estimates**

**Message Storage:**
```
Average message size: 1 KB (text + metadata)
Daily storage: 25 billion × 1 KB = 25 TB/day
Yearly storage: 25 TB × 365 = 9.1 PB/year
With compression (50%): ~4.5 PB/year

Keep messages for 1 year: ~4.5 PB
```

**Attachment Storage:**
```
10% of messages have attachments
Average attachment size: 500 KB (image)
Daily attachments: 2.5 billion × 500 KB = 1.25 PB/day
Yearly attachments: ~456 PB (use S3 with lifecycle policies)
```

### 💡 **Bandwidth Estimates**

**Incoming:**
```
289K writes/sec × 1 KB = 289 MB/sec ≈ 2.3 Gbps
```

**Outgoing (with fanout for groups):**
```
Average group size: 10 members
Fanout multiplier: 5x (half are 1-on-1)
289K writes × 5 × 1 KB = 1.4 GB/sec ≈ 11.5 Gbps
```

### 💡 **Connection Estimates**

**WebSocket Connections:**
```
Active users at any time: 100 million (20% of DAU)
Connections per user: 2 devices (phone + laptop)
Total WebSocket connections: 200 million
```

**Server Capacity:**
```
Connections per server: 100,000 (C10K problem solved)
WebSocket servers needed: 200M / 100K = 2,000 servers
```

## High-Level Design

### Architecture Overview

```
                         ┌─────────────────┐
                         │   CDN (Images)  │
                         └─────────────────┘
                                 │
┌──────────┐            ┌─────────────────┐
│  Client  │──WebSocket─│  Load Balancer  │
│ (Mobile) │            │   (Layer 4/7)   │
└──────────┘            └─────────────────┘
     │                         │
     │ HTTPS                   │
     │                         ▼
     │              ┌────────────────────────┐
     │              │  WebSocket Servers     │
     │              │  (Stateful, sticky)    │
     │              └────────────────────────┘
     │                         │
     │                         ▼
     │              ┌────────────────────────┐
     └─────────────▶│   REST API Servers     │
                    │   (Stateless)          │
                    └────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │    Redis     │    │    Kafka     │
          │  (Presence,  │    │ (Message     │
          │   Sessions)  │    │  Queue)      │
          └──────────────┘    └──────────────┘
                    │                   │
                    └─────────┬─────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
          ┌──────────────┐    ┌──────────────┐
          │  Cassandra   │    │   MongoDB    │
          │  (Messages)  │    │ (Users, Chat)│
          └──────────────┘    └──────────────┘
                                      │
                                      ▼
                              ┌──────────────┐
                              │      S3      │
                              │ (Attachments)│
                              └──────────────┘
```

### 💡 **Key Components**

| Component | Technology | Purpose | Scale |
|-----------|-----------|---------|-------|
| **WebSocket Servers** | Node.js, Go | Persistent connections, real-time messaging | 2,000 servers |
| **REST API Servers** | Node.js, Java | Message history, user management | 500 servers |
| **Message Queue** | Apache Kafka | Async message processing, delivery | 50 brokers |
| **Message DB** | Cassandra | Message storage (write-heavy, time-series) | 100 nodes |
| **Metadata DB** | MongoDB | Users, groups, relationships | 20 nodes |
| **Cache** | Redis | Presence, sessions, recent messages | 50 nodes |
| **Object Storage** | Amazon S3 | Images, videos, files | Unlimited |
| **CDN** | CloudFront | Serve media files globally | Edge locations |

## Detailed Design

### 💡 **WebSocket Connection Management**

**Why WebSocket?**

| Approach | Latency | Overhead | Real-time | Use Case |
|----------|---------|----------|-----------|----------|
| **HTTP Polling** | High (1-5s) | Very High | ❌ No | Legacy systems |
| **Long Polling** | Medium (1s) | High | ⚠️ Poor | Fallback option |
| **Server-Sent Events** | Low (<200ms) | Medium | ⚠️ One-way | Notifications only |
| **WebSocket** | Very Low (<50ms) | Low | ✅ Yes | Chat systems ✅ |

**Connection Flow:**

```javascript
// Client-side WebSocket connection
class ChatClient {
  constructor(userId, authToken) {
    this.userId = userId;
    this.authToken = authToken;
    this.ws = null;
    this.reconnectAttempts = 0;
  }

  connect() {
    // Connect with sticky session (hash user_id for consistent routing)
    this.ws = new WebSocket(
      `wss://chat.example.com/ws?user_id=${this.userId}&token=${this.authToken}`
    );

    this.ws.onopen = () => {
      console.log('Connected to chat server');
      this.reconnectAttempts = 0;
      this.sendHeartbeat();
    };

    this.ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleMessage(message);
    };

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    this.ws.onclose = () => {
      console.log('Disconnected from chat server');
      this.reconnect();
    };
  }

  sendHeartbeat() {
    // Keep connection alive + update presence
    setInterval(() => {
      if (this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'heartbeat' }));
      }
    }, 30000); // Every 30 seconds
  }

  reconnect() {
    if (this.reconnectAttempts < 10) {
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 60000);
      setTimeout(() => {
        this.reconnectAttempts++;
        this.connect();
      }, delay); // Exponential backoff
    }
  }

  sendMessage(chatId, content) {
    const message = {
      type: 'new_message',
      chat_id: chatId,
      from: this.userId,
      content: content,
      timestamp: Date.now(),
      client_msg_id: `${this.userId}-${Date.now()}`, // For deduplication
    };
    this.ws.send(JSON.stringify(message));
  }

  handleMessage(message) {
    switch (message.type) {
      case 'new_message':
        this.displayMessage(message);
        this.sendAck(message.message_id);
        break;
      case 'typing_indicator':
        this.showTypingIndicator(message.from);
        break;
      case 'read_receipt':
        this.updateMessageStatus(message.message_id, 'read');
        break;
      case 'presence_update':
        this.updateUserStatus(message.user_id, message.status);
        break;
    }
  }

  sendAck(messageId) {
    this.ws.send(JSON.stringify({
      type: 'ack',
      message_id: messageId,
    }));
  }
}
```

**Server-side Connection Manager:**

```javascript
// WebSocket server (Node.js with ws library)
const WebSocket = require('ws');
const Redis = require('ioredis');

class ChatServer {
  constructor() {
    this.wss = new WebSocket.Server({ port: 8080 });
    this.redis = new Redis({ /* cluster config */ });
    this.connections = new Map(); // user_id -> WebSocket connection

    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req);
    });
  }

  async handleConnection(ws, req) {
    // Extract user_id and auth token from query params
    const url = new URL(req.url, 'ws://localhost');
    const userId = url.searchParams.get('user_id');
    const token = url.searchParams.get('token');

    // Authenticate
    const isValid = await this.validateToken(userId, token);
    if (!isValid) {
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Store connection
    this.connections.set(userId, ws);

    // Mark user as online in Redis
    await this.redis.setex(`presence:${userId}`, 90, 'online'); // Expire in 90s

    // Send pending messages
    await this.deliverPendingMessages(userId, ws);

    // Handle messages
    ws.on('message', (data) => {
      this.handleMessage(userId, JSON.parse(data));
    });

    ws.on('close', () => {
      this.connections.delete(userId);
      // Mark as offline after grace period
      setTimeout(async () => {
        if (!this.connections.has(userId)) {
          await this.redis.set(`presence:${userId}`, 'offline');
        }
      }, 10000); // 10s grace period for reconnection
    });
  }

  async handleMessage(userId, message) {
    switch (message.type) {
      case 'new_message':
        await this.processNewMessage(userId, message);
        break;
      case 'heartbeat':
        await this.redis.setex(`presence:${userId}`, 90, 'online');
        break;
      case 'typing_indicator':
        await this.broadcastTyping(userId, message.chat_id);
        break;
      case 'ack':
        await this.markMessageDelivered(message.message_id, userId);
        break;
    }
  }

  async processNewMessage(userId, message) {
    // 1. Deduplication check
    const isDuplicate = await this.redis.get(
      `msg:${message.client_msg_id}`
    );
    if (isDuplicate) return;

    // 2. Generate server-side message ID
    const messageId = await this.generateMessageId();

    // 3. Store message in Cassandra (async)
    await this.storeMessage({
      message_id: messageId,
      chat_id: message.chat_id,
      from: userId,
      content: message.content,
      timestamp: Date.now(),
    });

    // 4. Mark as processed (deduplication)
    await this.redis.setex(`msg:${message.client_msg_id}`, 3600, messageId);

    // 5. Fanout to recipients
    const recipients = await this.getChatRecipients(message.chat_id);
    for (const recipientId of recipients) {
      if (recipientId === userId) continue; // Don't send to sender

      const recipientWs = this.connections.get(recipientId);
      if (recipientWs && recipientWs.readyState === WebSocket.OPEN) {
        // User is online, deliver immediately
        recipientWs.send(JSON.stringify({
          type: 'new_message',
          message_id: messageId,
          chat_id: message.chat_id,
          from: userId,
          content: message.content,
          timestamp: message.timestamp,
        }));
      } else {
        // User is offline, queue for later delivery
        await this.queueMessageForUser(recipientId, messageId);
      }
    }

    // 6. Send acknowledgment to sender
    const senderWs = this.connections.get(userId);
    if (senderWs) {
      senderWs.send(JSON.stringify({
        type: 'ack',
        client_msg_id: message.client_msg_id,
        message_id: messageId,
      }));
    }
  }

  async getChatRecipients(chatId) {
    // For 1-on-1 chat: chat_id = "user1_user2"
    if (chatId.includes('_')) {
      return chatId.split('_');
    }

    // For group chat: fetch from MongoDB
    const group = await db.groups.findOne({ group_id: chatId });
    return group.members;
  }

  async deliverPendingMessages(userId, ws) {
    const pendingMessages = await this.redis.lrange(
      `pending:${userId}`,
      0,
      -1
    );

    for (const msgId of pendingMessages) {
      const message = await this.getMessageById(msgId);
      ws.send(JSON.stringify({
        type: 'new_message',
        ...message,
      }));
    }

    // Clear pending queue
    await this.redis.del(`pending:${userId}`);
  }

  async queueMessageForUser(userId, messageId) {
    await this.redis.rpush(`pending:${userId}`, messageId);
  }
}
```

### 💡 **Message Delivery Guarantees**

**Delivery Levels:**

| Level | Guarantee | Mechanism | Use Case |
|-------|-----------|-----------|----------|
| **At-Most-Once** | May lose messages | Fire and forget | Low priority notifications |
| **At-Least-Once** | No loss, possible duplicates | Retry + ACK | Chat messages ✅ |
| **Exactly-Once** | No loss, no duplicates | Idempotency + 2PC | Financial transactions |

**We use At-Least-Once with client-side deduplication:**

```javascript
// Message delivery with retry
async function sendMessageWithRetry(message) {
  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    try {
      // Send message to Kafka (persisted)
      await kafka.send({
        topic: 'chat-messages',
        messages: [{
          key: message.chat_id,
          value: JSON.stringify(message),
        }],
      });

      // Wait for ACK from recipient
      const ack = await waitForAck(message.message_id, timeout = 5000);
      if (ack) {
        return { status: 'delivered' };
      }

      // No ACK received, retry
      attempt++;
      await sleep(1000 * Math.pow(2, attempt)); // Exponential backoff
    } catch (error) {
      console.error(`Delivery attempt ${attempt} failed:`, error);
      attempt++;
    }
  }

  // After all retries, mark as failed (store for later delivery)
  await redis.rpush(`failed:${message.to}`, message.message_id);
  return { status: 'failed' };
}

// Client-side deduplication
function handleIncomingMessage(message) {
  const isDuplicate = localStorage.getItem(`msg:${message.message_id}`);
  if (isDuplicate) {
    console.log('Duplicate message, ignoring');
    return;
  }

  // Process message
  displayMessage(message);

  // Mark as received (deduplication)
  localStorage.setItem(`msg:${message.message_id}`, 'true');

  // Send ACK
  sendAck(message.message_id);
}
```

### 💡 **Group Chat Optimization**

**Challenge**: Sending a message to 500-member group = 500 writes

**Solution: Fanout on Read (for large groups)**

| Approach | Write Cost | Read Cost | Best For |
|----------|-----------|-----------|----------|
| **Fanout on Write** | High (N writes) | Low (1 read) | Small groups (<50) |
| **Fanout on Read** | Low (1 write) | High (N reads) | Large groups (>50) |
| **Hybrid** | Medium | Medium | Most efficient ✅ |

**Implementation:**

```javascript
const LARGE_GROUP_THRESHOLD = 50;

async function sendGroupMessage(groupId, senderId, content) {
  const group = await db.groups.findOne({ group_id: groupId });
  const memberCount = group.members.length;

  const message = {
    message_id: generateId(),
    group_id: groupId,
    from: senderId,
    content: content,
    timestamp: Date.now(),
  };

  // Store message once in Cassandra
  await cassandra.execute(
    `INSERT INTO messages (message_id, chat_id, from_user, content, timestamp)
     VALUES (?, ?, ?, ?, ?)`,
    [message.message_id, groupId, senderId, content, message.timestamp]
  );

  if (memberCount < LARGE_GROUP_THRESHOLD) {
    // Small group: Fanout on Write
    // Push to each member's inbox for fast reads
    for (const memberId of group.members) {
      if (memberId === senderId) continue;

      // Add to member's inbox (Redis sorted set)
      await redis.zadd(
        `inbox:${memberId}`,
        message.timestamp,
        message.message_id
      );

      // If online, deliver via WebSocket
      const ws = connections.get(memberId);
      if (ws) {
        ws.send(JSON.stringify({ type: 'new_message', ...message }));
      }
    }
  } else {
    // Large group: Fanout on Read
    // Just add message ID to group's timeline
    await redis.zadd(
      `group_timeline:${groupId}`,
      message.timestamp,
      message.message_id
    );

    // Notify online members (lightweight notification)
    for (const memberId of group.members) {
      if (memberId === senderId) continue;

      const ws = connections.get(memberId);
      if (ws) {
        ws.send(JSON.stringify({
          type: 'group_notification',
          group_id: groupId,
          message_count: 1, // Batch notifications
        }));
      }
    }
  }

  return message.message_id;
}

// Fetching group messages (Fanout on Read)
async function getGroupMessages(groupId, userId, limit = 50) {
  const group = await db.groups.findOne({ group_id: groupId });

  if (group.members.length < LARGE_GROUP_THRESHOLD) {
    // Small group: Read from user's inbox (already fanned out)
    const messageIds = await redis.zrevrange(
      `inbox:${userId}`,
      0,
      limit - 1
    );

    const messages = await getMessagesByIds(messageIds);
    return messages.filter(msg => msg.group_id === groupId);
  } else {
    // Large group: Read from group timeline
    const messageIds = await redis.zrevrange(
      `group_timeline:${groupId}`,
      0,
      limit - 1
    );

    return await getMessagesByIds(messageIds);
  }
}
```

### 💡 **Read Receipts**

**Challenge**: Tracking read status for millions of messages

**Solution: Aggregate read status per chat**

```javascript
// When user reads messages
async function markMessagesAsRead(userId, chatId, messageIds) {
  // 1. Update individual message status in Cassandra
  for (const msgId of messageIds) {
    await cassandra.execute(
      `UPDATE messages SET read_by = read_by + ? WHERE message_id = ?`,
      [[userId], msgId]
    );
  }

  // 2. Update "last read" pointer (more efficient)
  const lastMessageId = messageIds[messageIds.length - 1];
  await redis.set(`last_read:${userId}:${chatId}`, lastMessageId);

  // 3. Notify sender (WebSocket)
  const lastMessage = await getMessageById(lastMessageId);
  const senderWs = connections.get(lastMessage.from);
  if (senderWs) {
    senderWs.send(JSON.stringify({
      type: 'read_receipt',
      chat_id: chatId,
      read_by: userId,
      last_read_message_id: lastMessageId,
    }));
  }
}

// Check if message was read
async function isMessageRead(messageId, userId) {
  // Simple approach: Check Cassandra
  const message = await cassandra.execute(
    `SELECT read_by FROM messages WHERE message_id = ?`,
    [messageId]
  );
  return message.read_by.includes(userId);
}

// Optimized: Use "last read" pointer
async function getUnreadCount(userId, chatId) {
  const lastReadMsgId = await redis.get(`last_read:${userId}:${chatId}`);
  if (!lastReadMsgId) {
    // User never read any message
    return await getTotalMessageCount(chatId);
  }

  // Count messages after last read
  const lastReadTimestamp = await getMessageTimestamp(lastReadMsgId);
  const unreadCount = await cassandra.execute(
    `SELECT COUNT(*) FROM messages
     WHERE chat_id = ? AND timestamp > ?`,
    [chatId, lastReadTimestamp]
  );

  return unreadCount;
}
```

### 💡 **Typing Indicators**

**Real-time ephemeral events (don't store)**

```javascript
// Client sends typing event
function onUserTyping(chatId) {
  // Throttle: Only send every 2 seconds
  if (Date.now() - lastTypingEvent < 2000) return;

  ws.send(JSON.stringify({
    type: 'typing_start',
    chat_id: chatId,
  }));

  lastTypingEvent = Date.now();

  // Auto-stop after 5 seconds
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    ws.send(JSON.stringify({
      type: 'typing_stop',
      chat_id: chatId,
    }));
  }, 5000);
}

// Server broadcasts typing indicator
async function handleTypingIndicator(userId, chatId, action) {
  // Don't store, just broadcast to online users
  const recipients = await getChatRecipients(chatId);

  for (const recipientId of recipients) {
    if (recipientId === userId) continue;

    const ws = connections.get(recipientId);
    if (ws) {
      ws.send(JSON.stringify({
        type: action, // 'typing_start' or 'typing_stop'
        chat_id: chatId,
        user_id: userId,
      }));
    }
  }

  // Optional: Store in Redis with TTL for multi-device sync
  if (action === 'typing_start') {
    await redis.setex(`typing:${chatId}:${userId}`, 5, 'true');
  } else {
    await redis.del(`typing:${chatId}:${userId}`);
  }
}

// Client handles typing indicator
function handleTypingIndicator(message) {
  if (message.type === 'typing_start') {
    showTypingIndicator(message.user_id, message.chat_id);
  } else {
    hideTypingIndicator(message.user_id, message.chat_id);
  }
}
```

### 💡 **Online Presence**

**Heartbeat mechanism with Redis:**

```javascript
// Client sends heartbeat every 30 seconds
setInterval(() => {
  ws.send(JSON.stringify({ type: 'heartbeat' }));
}, 30000);

// Server updates presence
async function updatePresence(userId) {
  // Set with 90-second expiry (3x heartbeat interval)
  await redis.setex(`presence:${userId}`, 90, JSON.stringify({
    status: 'online',
    last_seen: Date.now(),
  }));

  // Publish to subscribers (for real-time updates)
  await redis.publish('presence-updates', JSON.stringify({
    user_id: userId,
    status: 'online',
  }));
}

// Background job to mark users offline
setInterval(async () => {
  const allUsers = await db.users.find({}).project({ user_id: 1 });

  for (const user of allUsers) {
    const presence = await redis.get(`presence:${user.user_id}`);
    if (!presence) {
      // Key expired = user offline
      await redis.set(`presence:${user.user_id}`, JSON.stringify({
        status: 'offline',
        last_seen: Date.now(),
      }));

      // Notify subscribers
      await redis.publish('presence-updates', JSON.stringify({
        user_id: user.user_id,
        status: 'offline',
      }));
    }
  }
}, 60000); // Check every minute

// Client subscribes to presence updates
async function subscribeToPresence(userIds) {
  const subscriber = redis.duplicate();
  await subscriber.subscribe('presence-updates');

  subscriber.on('message', (channel, message) => {
    const update = JSON.parse(message);
    if (userIds.includes(update.user_id)) {
      updateUserStatus(update.user_id, update.status);
    }
  });
}
```

### 💡 **File Attachments**

**Flow:**

```
Client → Generate presigned URL → Upload to S3 → Send message with URL
```

**Implementation:**

```javascript
// 1. Client requests upload URL
async function requestFileUpload(fileName, fileType, fileSize) {
  const response = await fetch('/api/files/upload-url', {
    method: 'POST',
    body: JSON.stringify({ file_name: fileName, file_type: fileType, file_size: fileSize }),
  });

  const { upload_url, file_id } = await response.json();
  return { upload_url, file_id };
}

// 2. Server generates presigned URL
app.post('/api/files/upload-url', async (req, res) => {
  const { file_name, file_type, file_size } = req.body;

  // Validate file size (e.g., max 50MB)
  if (file_size > 50 * 1024 * 1024) {
    return res.status(400).json({ error: 'File too large' });
  }

  // Generate unique file ID
  const fileId = generateId();
  const key = `attachments/${fileId}/${file_name}`;

  // Generate presigned URL (expires in 15 minutes)
  const uploadUrl = await s3.getSignedUrl('putObject', {
    Bucket: 'chat-attachments',
    Key: key,
    ContentType: file_type,
    Expires: 900, // 15 minutes
  });

  // Store metadata
  await db.files.insertOne({
    file_id: fileId,
    file_name: file_name,
    file_type: file_type,
    file_size: file_size,
    key: key,
    uploaded_at: null, // Null until upload completes
  });

  res.json({ upload_url: uploadUrl, file_id: fileId });
});

// 3. Client uploads to S3
async function uploadFile(file, uploadUrl) {
  await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  });
}

// 4. Client sends message with file reference
async function sendMessageWithAttachment(chatId, content, fileId) {
  ws.send(JSON.stringify({
    type: 'new_message',
    chat_id: chatId,
    content: content,
    attachment: {
      file_id: fileId,
      type: 'image', // image, video, document
    },
  }));
}

// 5. Server marks upload as complete
async function handleMessageWithAttachment(message) {
  // Mark file as uploaded
  await db.files.updateOne(
    { file_id: message.attachment.file_id },
    { $set: { uploaded_at: Date.now() } }
  );

  // Generate CDN URL for recipients
  const file = await db.files.findOne({ file_id: message.attachment.file_id });
  const cdnUrl = `https://cdn.example.com/${file.key}`;

  // Fanout message with CDN URL
  const recipients = await getChatRecipients(message.chat_id);
  for (const recipientId of recipients) {
    const ws = connections.get(recipientId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'new_message',
        ...message,
        attachment: {
          url: cdnUrl,
          type: file.file_type,
          size: file.file_size,
        },
      }));
    }
  }
}
```

## Database Schema

### 💡 **Cassandra (Messages)**

```sql
-- Messages table (time-series, write-heavy)
CREATE TABLE messages (
  message_id UUID PRIMARY KEY,
  chat_id TEXT,
  from_user UUID,
  content TEXT,
  attachment_id UUID,
  timestamp BIGINT,
  read_by SET<UUID>,
  INDEX(chat_id, timestamp) -- For fetching chat history
);

-- Partition by chat_id for efficient queries
CREATE TABLE messages_by_chat (
  chat_id TEXT,
  timestamp BIGINT,
  message_id UUID,
  from_user UUID,
  content TEXT,
  attachment_id UUID,
  PRIMARY KEY ((chat_id), timestamp, message_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);

-- For fetching unread messages
CREATE TABLE messages_by_user (
  to_user UUID,
  timestamp BIGINT,
  message_id UUID,
  chat_id TEXT,
  from_user UUID,
  is_read BOOLEAN,
  PRIMARY KEY ((to_user), timestamp, message_id)
) WITH CLUSTERING ORDER BY (timestamp DESC);
```

### 💡 **MongoDB (Metadata)**

```javascript
// Users collection
{
  _id: ObjectId,
  user_id: UUID,
  username: String,
  email: String,
  created_at: Date,
  last_seen: Date,
  status: Enum['online', 'away', 'offline']
}

// Chats collection (1-on-1)
{
  _id: ObjectId,
  chat_id: String, // "user1_id:user2_id"
  participants: [UUID, UUID],
  created_at: Date,
  last_message: {
    message_id: UUID,
    content: String,
    timestamp: Date
  },
  unread_count: {
    user1_id: Number,
    user2_id: Number
  }
}

// Groups collection
{
  _id: ObjectId,
  group_id: UUID,
  name: String,
  description: String,
  avatar_url: String,
  members: [UUID],
  admins: [UUID],
  created_by: UUID,
  created_at: Date,
  member_count: Number,
  last_message: {
    message_id: UUID,
    from: UUID,
    content: String,
    timestamp: Date
  }
}

// Files collection
{
  _id: ObjectId,
  file_id: UUID,
  file_name: String,
  file_type: String,
  file_size: Number,
  s3_key: String,
  cdn_url: String,
  uploaded_by: UUID,
  uploaded_at: Date
}
```

### 💡 **Redis (Cache & Presence)**

```
# Online presence (with TTL)
presence:{user_id} → { status: "online", last_seen: timestamp } (TTL: 90s)

# WebSocket session mapping
session:{user_id} → websocket_server_id

# Pending messages (offline users)
pending:{user_id} → [message_id_1, message_id_2, ...]

# Recent messages cache (avoid Cassandra reads)
recent:{chat_id} → [{message}, {message}, ...] (TTL: 1 hour)

# Last read pointer
last_read:{user_id}:{chat_id} → message_id

# Typing indicators (ephemeral)
typing:{chat_id}:{user_id} → "true" (TTL: 5s)

# Deduplication
msg:{client_msg_id} → message_id (TTL: 1 hour)

# Group timeline (for large groups)
group_timeline:{group_id} → sorted set of message_ids (score = timestamp)

# User inbox (for small groups)
inbox:{user_id} → sorted set of message_ids (score = timestamp)
```

## API Design

### 💡 **WebSocket Events (Real-time)**

**Client → Server:**
```javascript
// Send message
{
  "type": "new_message",
  "chat_id": "user1_user2",
  "content": "Hello!",
  "client_msg_id": "unique-id",
  "timestamp": 1700000000000
}

// Typing indicator
{
  "type": "typing_start" | "typing_stop",
  "chat_id": "group123"
}

// Message acknowledgment
{
  "type": "ack",
  "message_id": "uuid"
}

// Heartbeat
{
  "type": "heartbeat"
}
```

**Server → Client:**
```javascript
// New message
{
  "type": "new_message",
  "message_id": "uuid",
  "chat_id": "user1_user2",
  "from": "user1",
  "content": "Hello!",
  "timestamp": 1700000000000,
  "attachment": {
    "url": "https://cdn.example.com/image.jpg",
    "type": "image"
  }
}

// Read receipt
{
  "type": "read_receipt",
  "message_id": "uuid",
  "read_by": "user2"
}

// Typing indicator
{
  "type": "typing_start" | "typing_stop",
  "chat_id": "group123",
  "user_id": "user1"
}

// Presence update
{
  "type": "presence_update",
  "user_id": "user1",
  "status": "online" | "offline" | "away",
  "last_seen": 1700000000000
}
```

### 💡 **REST API Endpoints**

**Message History:**
```http
GET /api/chats/{chat_id}/messages?before={timestamp}&limit=50
Authorization: Bearer {token}

Response:
{
  "messages": [
    {
      "message_id": "uuid",
      "from": "user1",
      "content": "Hello!",
      "timestamp": 1700000000000,
      "is_read": true
    }
  ],
  "has_more": true
}
```

**Create Group:**
```http
POST /api/groups
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Team Chat",
  "description": "Project discussion",
  "members": ["user1", "user2", "user3"]
}

Response:
{
  "group_id": "uuid",
  "name": "Team Chat",
  "created_at": 1700000000000
}
```

**Get User Chats:**
```http
GET /api/users/{user_id}/chats?limit=20
Authorization: Bearer {token}

Response:
{
  "chats": [
    {
      "chat_id": "user1_user2",
      "type": "direct",
      "other_user": {
        "user_id": "user2",
        "username": "john",
        "status": "online"
      },
      "last_message": {
        "content": "See you tomorrow",
        "timestamp": 1700000000000
      },
      "unread_count": 3
    },
    {
      "chat_id": "group123",
      "type": "group",
      "name": "Team Chat",
      "member_count": 5,
      "last_message": {
        "from": "alice",
        "content": "Meeting at 3pm",
        "timestamp": 1700000000000
      },
      "unread_count": 12
    }
  ]
}
```

**File Upload URL:**
```http
POST /api/files/upload-url
Authorization: Bearer {token}
Content-Type: application/json

{
  "file_name": "photo.jpg",
  "file_type": "image/jpeg",
  "file_size": 1048576
}

Response:
{
  "file_id": "uuid",
  "upload_url": "https://s3.amazonaws.com/presigned-url",
  "expires_in": 900
}
```

## Deep Dives

### 💡 **Message Ordering & Consistency**

**Problem**: Messages arrive out of order due to network delays

**Solutions:**

| Approach | Pros | Cons | Use Case |
|----------|------|------|----------|
| **Server Timestamp** | Simple, consistent | Clock skew issues | Most chat systems ✅ |
| **Client Timestamp** | Low latency | Can be manipulated | Not recommended |
| **Lamport Clocks** | Causal ordering | Complex | Distributed systems |
| **Sequence Numbers** | Precise order | Requires coordination | Critical systems |

**Implementation:**

```javascript
// Server assigns timestamp and sequence number
async function assignTimestamp(message) {
  const timestamp = Date.now();
  const sequenceNumber = await redis.incr(`seq:${message.chat_id}`);

  return {
    ...message,
    server_timestamp: timestamp,
    sequence_number: sequenceNumber,
  };
}

// Client sorts by server timestamp + sequence number
function sortMessages(messages) {
  return messages.sort((a, b) => {
    if (a.server_timestamp !== b.server_timestamp) {
      return a.server_timestamp - b.server_timestamp;
    }
    return a.sequence_number - b.sequence_number;
  });
}
```

### 💡 **Multi-Device Sync**

**Challenge**: User has phone + laptop, both should be in sync

**Solution: Device Registry + Message Fanout**

```javascript
// User logs in on new device
async function registerDevice(userId, deviceId, deviceType) {
  await db.user_devices.insertOne({
    user_id: userId,
    device_id: deviceId,
    device_type: deviceType, // 'mobile', 'desktop', 'web'
    registered_at: Date.now(),
    last_active: Date.now(),
  });

  // Store WebSocket connection for this device
  connections.set(`${userId}:${deviceId}`, ws);
}

// Send message to all user's devices
async function sendToAllDevices(userId, message) {
  const devices = await db.user_devices.find({ user_id: userId });

  for (const device of devices) {
    const ws = connections.get(`${userId}:${device.device_id}`);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }
}

// Sync read status across devices
async function syncReadStatus(userId, chatId, messageId) {
  const devices = await db.user_devices.find({ user_id: userId });

  for (const device of devices) {
    const ws = connections.get(`${userId}:${device.device_id}`);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'sync_read',
        chat_id: chatId,
        last_read_message_id: messageId,
      }));
    }
  }
}
```

### 💡 **Spam & Abuse Prevention**

**Rate Limiting:**

```javascript
const rateLimiter = new Map(); // user_id -> { count, resetAt }

function checkRateLimit(userId) {
  const limit = 100; // 100 messages per minute
  const window = 60 * 1000; // 1 minute

  const now = Date.now();
  const userLimit = rateLimiter.get(userId);

  if (!userLimit || now > userLimit.resetAt) {
    rateLimiter.set(userId, { count: 1, resetAt: now + window });
    return true;
  }

  if (userLimit.count >= limit) {
    return false; // Rate limit exceeded
  }

  userLimit.count++;
  return true;
}

// Usage
if (!checkRateLimit(userId)) {
  ws.send(JSON.stringify({
    type: 'error',
    error: 'Rate limit exceeded. Please slow down.',
  }));
  return;
}
```

**Content Moderation:**

```javascript
async function moderateMessage(content) {
  // 1. Check for profanity
  if (containsProfanity(content)) {
    return { allowed: false, reason: 'Inappropriate language' };
  }

  // 2. Check for spam patterns
  if (isSpam(content)) {
    return { allowed: false, reason: 'Spam detected' };
  }

  // 3. Check for links (phishing)
  if (containsSuspiciousLinks(content)) {
    return { allowed: false, reason: 'Suspicious link' };
  }

  // 4. ML-based toxicity detection (async)
  const toxicityScore = await mlModel.predict(content);
  if (toxicityScore > 0.8) {
    return { allowed: false, reason: 'Toxic content' };
  }

  return { allowed: true };
}
```

### 💡 **Message Search**

**Problem**: Searching billions of messages is slow

**Solution: Elasticsearch + Inverted Index**

```javascript
// Index messages in Elasticsearch (async)
async function indexMessage(message) {
  await elasticsearch.index({
    index: 'chat-messages',
    id: message.message_id,
    body: {
      chat_id: message.chat_id,
      from: message.from,
      content: message.content,
      timestamp: message.timestamp,
    },
  });
}

// Search messages
async function searchMessages(userId, query, chatId = null) {
  // Get user's accessible chats
  const accessibleChats = await getUserChats(userId);

  const searchQuery = {
    index: 'chat-messages',
    body: {
      query: {
        bool: {
          must: [
            { match: { content: query } },
            { terms: { chat_id: accessibleChats } }, // Security: only search user's chats
          ],
          ...(chatId && { filter: { term: { chat_id: chatId } } }),
        },
      },
      sort: [{ timestamp: 'desc' }],
      size: 50,
    },
  };

  const result = await elasticsearch.search(searchQuery);
  return result.hits.hits.map(hit => hit._source);
}
```

## Trade-offs & Bottlenecks

### 💡 **Key Trade-offs**

| Decision | Chosen Approach | Alternative | Rationale |
|----------|----------------|-------------|-----------|
| **Communication Protocol** | WebSocket | HTTP Long Polling | Lower latency, true bidirectional |
| **Message Storage** | Cassandra | MongoDB | Write-heavy workload, time-series data |
| **Group Chat** | Hybrid Fanout | Fanout on Write only | Balance write/read costs |
| **Consistency** | Eventual | Strong | Availability over consistency (AP in CAP) |
| **Presence** | Heartbeat (30s) | Real-time | Reduce network overhead |
| **Read Receipts** | Last Read Pointer | Per-message tracking | Reduce storage & queries |

### 💡 **Potential Bottlenecks**

| Component | Bottleneck | Solution |
|-----------|-----------|----------|
| **WebSocket Servers** | Connection limit (C10K) | Use epoll/kqueue, horizontal scaling |
| **Cassandra** | Write throughput | Partition by chat_id, add more nodes |
| **Redis** | Memory limit | Redis Cluster, expire old data |
| **Kafka** | Message ordering | Partition by chat_id (same partition = order) |
| **S3** | Upload latency | Use presigned URLs (direct upload) |
| **Network** | Cross-region latency | Multi-region deployment, CDN |

### 💡 **Failure Scenarios**

| Failure | Impact | Mitigation |
|---------|--------|------------|
| **WebSocket Server Down** | Users disconnected | Auto-reconnect, multiple servers with LB |
| **Cassandra Node Down** | Partial unavailability | Replication factor 3, quorum reads |
| **Redis Down** | Lost presence data | Redis Sentinel, persist to disk |
| **Kafka Partition Down** | Message loss | Replication factor 3, acks=all |
| **Network Partition** | Split brain | Use consensus (Raft/Paxos) |

## Interview Discussion Points

**Q: How do you ensure messages are delivered in order?**

A: We use server-assigned timestamps combined with sequence numbers per chat. When a message arrives at the server, we assign both a timestamp (for rough ordering) and a sequence number (for precise ordering within the same millisecond). Clients sort messages by timestamp first, then sequence number.

For distributed systems, we could use Lamport clocks or vector clocks for causal ordering, but for most chat applications, server timestamps are sufficient since we want to show the order in which the server received messages, not when clients sent them.

**Q: How do you handle a user with multiple devices?**

A: We maintain a device registry that tracks all active devices per user. Each device has its own WebSocket connection. When a message arrives:

1. We fanout to all devices connected for that user
2. We sync read receipts across devices (if user reads on phone, laptop shows as read)
3. We use a "last read" pointer stored in Redis that's shared across devices

For offline devices, we queue messages using `pending:{user_id}` in Redis, and deliver when they reconnect.

**Q: What happens if a WebSocket connection is lost?**

A: We implement reconnection with exponential backoff:
1. Client detects disconnection
2. Attempts to reconnect with delay: 1s, 2s, 4s, 8s, ... up to 60s
3. After reconnecting, client fetches pending messages using `GET /messages?after={last_seen_timestamp}`
4. Server delivers any messages that were queued during disconnection

We also maintain a 10-second grace period before marking a user as offline, which handles brief network hiccups without changing their status.

**Q: How do you handle group chats with 500 members efficiently?**

A: We use a hybrid fanout strategy based on group size:

- **Small groups (<50 members)**: Fanout on Write
  - Pre-compute each member's inbox
  - Fast reads, but expensive writes

- **Large groups (>50 members)**: Fanout on Read
  - Store message once, read from group timeline
  - Cheap writes, but reads require fetching from group timeline

This balances write costs (for large groups) with read performance (for small groups where most conversations happen).

**Q: How do you ensure no message is lost?**

A: We implement at-least-once delivery:

1. **Message Persistence**: Store in Kafka immediately (durable log)
2. **Acknowledgments**: Recipient sends ACK after receiving
3. **Retry Logic**: If no ACK within 5s, retry with exponential backoff
4. **Idempotency**: Client deduplicates using `client_msg_id`
5. **Offline Queue**: Store in Redis `pending:{user_id}` if user is offline

For critical systems, we could implement exactly-once delivery using distributed transactions, but the complexity usually isn't worth it for chat applications.

**Q: How do you scale to 500 million users?**

A: Horizontal scaling at every layer:

1. **WebSocket Servers**: 2,000 servers (100K connections each)
2. **Cassandra Cluster**: Partition by `chat_id`, 100 nodes with RF=3
3. **Redis Cluster**: 50 nodes, partition by `user_id`
4. **Kafka**: 50 brokers, partition by `chat_id` (maintains order)
5. **Load Balancers**: Layer 4 (TCP) with consistent hashing for sticky sessions
6. **Geographic Distribution**: Deploy in multiple regions (US, EU, APAC)

**Q: How do you prevent spam and abuse?**

A:
1. **Rate Limiting**: 100 messages/minute per user (token bucket)
2. **Content Moderation**: ML model for toxicity detection
3. **Profanity Filter**: Blacklist + regex patterns
4. **Link Scanning**: Check URLs against phishing database
5. **Reporting System**: Users can report abuse
6. **Account Suspension**: Automated + manual review

**Q: How would you add end-to-end encryption?**

A: Implement Signal Protocol:
1. Each device has a public/private key pair
2. Messages encrypted with recipient's public key
3. Server only sees encrypted bytes (can't read content)
4. Keys exchanged using Double Ratchet algorithm

Trade-off: Server can't perform search, content moderation, or show notifications with message content.

**Q: How do you optimize for mobile (low bandwidth)?**

A:
1. **Message Compression**: gzip messages before sending
2. **Binary Protocol**: Use Protocol Buffers instead of JSON (30% smaller)
3. **Batching**: Send multiple messages in one packet
4. **Image Compression**: Compress images before upload
5. **Lazy Loading**: Load only recent messages, fetch history on demand
6. **Offline Support**: Cache messages locally, sync when reconnected

## Follow-up Enhancements

**Additional Features:**

1. **Voice/Video Calls**: WebRTC + TURN/STUN servers
2. **Message Reactions**: Store reactions separately, aggregate counts
3. **Message Threads**: Tree structure, parent_message_id
4. **Message Edit/Delete**: Store edit history, tombstone for deletes
5. **Polls & Rich Media**: Support structured message types
6. **Bots & Integrations**: Webhook system for external services
7. **Message Forwarding**: Copy message, link to original
8. **Pinned Messages**: Flag messages as pinned in group

**Monitoring & Observability:**

- **Metrics**: Message delivery latency, connection count, error rate
- **Logging**: ELK stack for centralized logs
- **Tracing**: Jaeger for distributed tracing
- **Alerts**: PagerDuty for critical failures
- **Dashboards**: Grafana for real-time monitoring

## Summary

**Key Architectural Decisions:**

1. ✅ **WebSocket for Real-time**: Bidirectional, low-latency communication
2. ✅ **Cassandra for Messages**: Write-heavy, time-series data, horizontal scaling
3. ✅ **Redis for Presence**: Fast, in-memory, TTL-based expiration
4. ✅ **Kafka for Async Processing**: Message durability, replay capability
5. ✅ **Hybrid Fanout**: Balance write/read costs based on group size
6. ✅ **At-Least-Once Delivery**: Reliability without complexity of exactly-once
7. ✅ **Multi-Region Deployment**: Low latency globally

**Scale:**
- 500M DAU
- 25B messages/day (289K writes/sec, 578K reads/sec)
- 200M concurrent WebSocket connections
- 4.5 PB message storage/year
- < 200ms latency worldwide

**Trade-offs:**
- Availability over consistency (AP in CAP)
- At-least-once delivery (deduplication on client)
- Eventual read receipt propagation
- Message history limited to 1 year

---
[← Back to SystemDesign](../README.md)
