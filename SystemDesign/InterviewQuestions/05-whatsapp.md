# Design WhatsApp

## How to Open This Answer

"I'll design WhatsApp focusing on reliable message delivery, end-to-end encryption, and delivery receipts at scale. Let me confirm — are we including group messaging and media, or starting with 1-1 text messages?"

## Problem Statement

Build a messaging system that delivers text and media messages with end-to-end encryption, guarantees at-least-once delivery, and tracks sent/delivered/read receipts. The system must serve 2 billion users globally with sub-second delivery for online recipients.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Send and receive text messages between two users (1-1 messaging)
- Group messaging (up to 256 members)
- Delivery receipts: sent (✓), delivered (✓✓), read (blue ✓✓)
- Media sharing: images, video, audio, documents
- Offline delivery: store messages until recipient reconnects
- Multi-device: same account on phone and web/desktop

### Non-Functional (pick 3-4)

- **Latency**: < 500 ms delivery for online-to-online messages
- **Reliability**: At-least-once delivery — no message lost
- **Privacy**: End-to-end encrypted; server never reads message content
- **Scale**: 2 B users, ~100 B messages/day, ~1.2 M messages/sec

## A — Architecture

### High-Level Diagram

```
Client A (mobile)                Client B (mobile)
    │                                    │
    │  WebSocket (persistent)            │ WebSocket
    ▼                                    ▼
Chat Server A ──────────────► Chat Server B
    │                                    │
    │                             (B online → push to WS)
    │                             (B offline → store)
    ▼
Message Queue Service (Kafka)
    │
    ├── Message Store (Cassandra) — durable storage
    │
    ├── Receipt Service — tracks ✓ ✓✓ ✓✓ (blue)
    │
    └── Offline Store (Redis TTL) — pending delivery
             │
             ▼
    Push Notification Service
    (APNs / FCM for offline users)
```

Each client holds a persistent WebSocket to a Chat Server. The Chat Server mapping (`userId → server`) is stored in Redis so any server can route to the right node. Messages are written to Kafka and persisted in Cassandra before the server ACKs the sender — this guarantees durability before delivery confirmation. End-to-end encryption means Cassandra stores only ciphertext; only client devices hold keys.

## D — Data Model

```typescript
interface Message {
  messageId: string;               // ULID — sortable by time
  chatId: string;                  // partition key in Cassandra
  senderId: string;
  ciphertext: string;              // E2E encrypted payload (base64)
  mediaRef?: string;               // reference to encrypted media in object store
  messageType: "text" | "image" | "video" | "audio" | "document";
  clientTimestamp: string;         // sender's local time (ISO-8601)
  serverTimestamp: string;         // server-assigned time
  status: "sent" | "delivered" | "read";
}

interface Chat {
  chatId: string;
  type: "direct" | "group";
  participants: string[];          // userIds
  groupName?: string;
  groupAvatarUrl?: string;
  createdAt: string;
  encryptionKeyId: string;         // identifies which key version
}

interface DeliveryReceipt {
  chatId: string;
  messageId: string;
  recipientId: string;
  status: "delivered" | "read";
  timestamp: string;
}

interface E2EKeyBundle {
  userId: string;
  deviceId: string;
  identityKey: string;             // long-term public key
  signedPreKey: string;            // medium-term public key
  oneTimePreKeys: string[];        // single-use keys (Signal protocol)
  registeredAt: string;
}
```

## I — Interface (APIs)

```typescript
// WebSocket event: client → server
// Send a message
interface SendMessageEvent {
  type: "send_message";
  chatId: string;
  recipientId: string;
  ciphertext: string;              // encrypted by sender using recipient's public key
  messageType: "text" | "image" | "video" | "audio" | "document";
  clientMessageId: string;         // client-generated dedup key
  clientTimestamp: string;
}

// WebSocket event: server → client
// Deliver a message to recipient
interface IncomingMessageEvent {
  type: "message";
  chatId: string;
  messageId: string;               // server-assigned ULID
  senderId: string;
  ciphertext: string;
  serverTimestamp: string;
}

// WebSocket event: client → server
// Acknowledge receipt or read
interface AckEvent {
  type: "ack";
  chatId: string;
  messageId: string;
  ackType: "delivered" | "read";
}

// REST: POST /v1/media/upload-url
// Pre-signed URL for encrypted media upload
interface MediaUploadUrlRequest {
  chatId: string;
  fileType: "image/jpeg" | "video/mp4" | "audio/ogg" | "application/pdf";
  encryptedSizeBytes: number;
}
interface MediaUploadUrlResponse {
  uploadUrl: string;               // pre-signed S3 URL
  mediaKey: string;                // reference key to include in message
}

// REST: GET /v1/keys/:userId
// Fetch recipient's public key bundle for E2E encryption
interface KeyBundleResponse {
  userId: string;
  deviceId: string;
  identityKey: string;
  signedPreKey: string;
  oneTimePreKey: string;           // one consumed per session
}

// REST: GET /v1/chats/:chatId/messages?before=<messageId>&limit=30
// Paginated message history
interface MessageHistoryResponse {
  messages: Message[];
  nextCursor: string | null;
}
```

## O — Optimizations & Trade-offs

### Delivery Guarantee: At-Least-Once

| Step | How it works |
|---|---|
| 1. Sender sends message | WebSocket → Chat Server |
| 2. Server writes to Kafka + Cassandra | Durable before ACK |
| 3. Server ACKs sender with `messageId` | Sender shows ✓ |
| 4. Server delivers to recipient WS | Recipient shows ✓✓ |
| 5. Recipient ACKs `delivered` | Server updates receipt |
| 6. Recipient reads message | Sends `read` ACK → sender sees blue ✓✓ |

❌ Never ACK the sender before writing to durable storage. If the server crashes between send and write, the message is lost.

### Offline Message Delivery

```
Recipient offline?
    │
    ├── Store message in Offline Queue (Redis, TTL 30 days)
    │
    └── Send push notification (APNs/FCM)
              │
              ▼
    Recipient comes online
              │
              ▼
    Client reconnects WebSocket → server drains queue
              │
              ▼
    Client ACKs each message → server removes from queue
```

### End-to-End Encryption

WhatsApp uses the **Signal Protocol** (Double Ratchet + X3DH key exchange). The server stores only ciphertext. Key exchange happens client-to-client via the Key Distribution Service.

| Property | How achieved |
|---|---|
| Forward secrecy | New ratchet key per message — past messages safe if key leaked |
| Break-in recovery | Double ratchet generates new keys after compromise |
| ✅ Server blindness | Server holds ciphertext only — cannot read messages |
| ❌ Server-side search | Not possible without decryption |

### Group Messaging at Scale

| Group Size | Strategy |
|---|---|
| 1-1 | Direct delivery to recipient Chat Server |
| 2–50 members | Fan-out on write — server sends to each member's Chat Server |
| 51–256 members | Fan-out via Kafka worker pool; parallel delivery |
| ❌ > 256 members | WhatsApp does not support — by design to limit fan-out cost |

Each group message is encrypted separately for each recipient (sender-side key expansion). This keeps the server from needing any decryption step during fan-out.

### Media Storage

❌ Never store large media in the message queue or Cassandra.
✅ Clients upload encrypted media directly to S3 via a pre-signed URL. The message contains only a `mediaKey` reference. Recipient fetches media separately from S3 (or CDN). Media has a 30-day retention TTL by default.

## Common Follow-up Questions

**Q: How do delivery receipts propagate back to the sender?**
A: When the recipient's client receives a message, it fires an `ack` WebSocket event with `ackType: "delivered"`. The server updates the `DeliveryReceipt` table and routes a receipt event to the sender's Chat Server, which pushes it to the sender's WebSocket connection.

**Q: How do you handle message ordering in a group chat?**
A: The server assigns a `serverTimestamp` (ULID) when the message is persisted. All clients sort by `serverTimestamp`. Clock skew between senders is resolved server-side. See [../BuildingBlocks/message-ordering.md](../BuildingBlocks/).

**Q: What happens when a user switches from phone to WhatsApp Web?**
A: Multi-device uses a secondary device model. The web client registers a separate `deviceId` and gets its own key bundle. The phone acts as the identity anchor. Messages are encrypted separately for each device. The Chat Server fans out to all active devices for that `userId`.

**Q: How do you prevent spam and abuse without reading message content?**
A: WhatsApp uses metadata signals — message frequency, forward count, new contact rates — not content. A high forward count triggers a "forwarded many times" label. Rate limiting blocks bulk senders at the WebSocket layer before messages are processed.

**Q: How does the key distribution service scale?**
A: The Key Distribution Service is read-heavy — every new chat session fetches the recipient's key bundle. Results are cached in a CDN-edge cache with a short TTL (5 min). One-time pre-keys are consumed exactly once: the server removes the used key and the client uploads replacements proactively.

---
[← Back to InterviewQuestions](../README.md)
