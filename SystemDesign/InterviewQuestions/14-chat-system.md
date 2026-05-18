# Design Chat System

## How to Open This Answer

"I'll design a real-time chat system similar to WhatsApp or Slack. Before I dive in, let me confirm whether we're targeting 1-1 chats, group chats, or both — and whether delivery receipts are in scope."

## Problem Statement

Build a real-time messaging system that supports 1-1 and group chats with message ordering, delivery/read receipts, and message history. The system must serve hundreds of millions of daily active users with sub-200 ms latency.

## R — Requirements

### Functional (pick 4-5 that matter most)

- Send and receive messages in real time (1-1 and group, up to 500 members)
- Persist message history; retrieve past conversations with pagination
- Track delivery receipts: sent, delivered, read
- Show online presence and typing indicators
- Support multi-device: same account synced across devices
- Handle offline users: deliver messages when they reconnect

### Non-Functional (pick 3-4)

- **Latency**: Message delivery < 200 ms for online users
- **Ordering**: Messages in a chat appear in the order they were sent
- **Availability**: 99.99% — users expect chat to always work
- **Scale**: 500 M DAU, ~300 K messages/sec at peak

## A — Architecture

### High-Level Diagram

```
Client (mobile/web)
        │  WebSocket (persistent)
        ▼
  WebSocket Gateway (stateful, per-region)
        │
        ▼
  Message Service ──────────────────────────────┐
        │                                        │
        ▼                                        ▼
  Kafka (message stream)               Presence Service
        │                               (Redis pub/sub)
        ▼
  Message Store (Cassandra)
        │
        ▼
  Fan-out Service ──► Push Notification Service
                          (offline users)
```

Each client holds a persistent WebSocket to a gateway node. The gateway is stateless except for the mapping of `userId → connectionId` stored in Redis. When User A sends a message, the Message Service writes it to Cassandra (durable) then publishes to Kafka. The fan-out service reads Kafka, looks up recipients' gateway nodes, and pushes delivery via WebSocket. Offline users receive a push notification instead.

## D — Data Model

```typescript
interface Message {
  chatId: string;               // partition key in Cassandra
  messageId: string;            // ULID — sortable by time
  senderId: string;
  body: string;
  mediaUrl?: string;
  status: "sent" | "delivered" | "read";
  createdAt: string;            // ISO-8601
  clientSeqId: string;          // client-generated; used for dedup
}

interface Chat {
  chatId: string;
  type: "direct" | "group";
  participants: string[];       // userIds
  name?: string;                // group name only
  createdAt: string;
  lastMessageId: string;
  lastMessageAt: string;
}

interface DeliveryReceipt {
  chatId: string;
  messageId: string;
  userId: string;
  status: "delivered" | "read";
  updatedAt: string;
}

interface PresenceRecord {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeenAt: string;
  connectedDevices: string[];   // deviceIds with active WS connections
}
```

## I — Interface (APIs)

```typescript
// WebSocket event: client → server
// Send a message
interface SendMessageEvent {
  type: "send_message";
  chatId: string;
  body: string;
  clientSeqId: string;          // client dedup key
  mediaUrl?: string;
}

// WebSocket event: server → client
// Deliver a message to recipient
interface IncomingMessageEvent {
  type: "message";
  chatId: string;
  messageId: string;
  senderId: string;
  body: string;
  createdAt: string;
}

// WebSocket event: client → server
// Acknowledge delivery or read
interface AckEvent {
  type: "ack";
  chatId: string;
  messageId: string;
  ackType: "delivered" | "read";
}

// REST: GET /v1/chats/:chatId/messages?before=<messageId>&limit=50
// Paginated history (cursor-based)
interface MessageHistoryResponse {
  messages: Message[];
  nextCursor: string | null;    // messageId to pass as `before`
}

// REST: POST /v1/chats
// Create a new chat
interface CreateChatRequest {
  type: "direct" | "group";
  participantIds: string[];
  name?: string;
}
interface CreateChatResponse {
  chatId: string;
  createdAt: string;
}

// REST: GET /v1/users/:userId/presence
interface PresenceResponse {
  userId: string;
  status: "online" | "away" | "offline";
  lastSeenAt: string;
}
```

## O — Optimizations & Trade-offs

### WebSocket vs Polling

| Approach | Latency | Server Cost | Complexity |
|---|---|---|---|
| Short polling (HTTP) | High (1-30 s) | Low | Low |
| Long polling | Medium (1-5 s) | Medium | Medium |
| ✅ WebSocket | < 200 ms | High (stateful) | High |
| SSE | < 200 ms | Medium | Medium (read-only) |

> WebSocket is the right choice for bidirectional, real-time chat. SSE only works for server-to-client flow.

### Message Ordering

Use **ULIDs** (Universally Unique Lexicographically Sortable IDs) as `messageId`. ULIDs embed a millisecond timestamp, so Cassandra sorts messages by ID naturally. No need for a global sequence number, which would be a bottleneck.

❌ Auto-increment IDs break at distributed scale — avoid them.

### Fan-out for Group Chats

| Group Size | Strategy |
|---|---|
| < 100 members | Fan-out on write — push to all active WS connections immediately |
| 100–500 members | Fan-out on write via Kafka; worker pushes in parallel |
| ❌ > 500 members | Fan-out on read — recipients pull on next open |

### Storage Tiers

Messages are write-heavy. Cassandra partitions by `chatId` and sorts by `messageId`. Hot chats (last 7 days) stay in SSD tier. Messages older than 90 days move to S3 (cold storage). See [../Database/cassandra.md](../Database/) for partitioning strategy.

### Presence at Scale

Redis pub/sub handles presence updates. Each WebSocket gateway publishes a heartbeat every 5 s. Presence Service updates a Redis key with a 15 s TTL. If the key expires, the user is offline. This avoids a DB write on every heartbeat.

## Common Follow-up Questions

**Q: How do you guarantee message order across devices?**
A: The ULID in `messageId` encodes the server-assigned timestamp. Clients sort their local message list by `messageId`. The server is the source of truth — client-generated `clientSeqId` is only for dedup, not ordering.

**Q: How do you handle the WebSocket gateway going down?**
A: The `userId → gatewayNode` mapping lives in Redis. When a gateway crashes, clients reconnect automatically. The new gateway registers itself in Redis. In-flight messages are replayed from Kafka (retain 24 h). See [../BuildingBlocks/websockets.md](../BuildingBlocks/).

**Q: How do you store messages efficiently for 500 M users?**
A: Cassandra shards by `chatId`. A single chat's messages stay on the same partition for sequential reads. Cold messages move to S3 after 90 days. Estimate: 300 K msg/s × 1 KB avg = 300 MB/s write throughput — manageable with a 20-node Cassandra cluster.

**Q: How do read receipts work in a group chat?**
A: Each message has a `DeliveryReceipt` row per recipient. The sender's client aggregates receipt status by fetching `GET /v1/chats/:chatId/messages/:messageId/receipts`. Only the last N messages show per-user read status — older messages are considered read.

**Q: How do you handle typing indicators without overloading the server?**
A: The client sends a `typing_start` WebSocket event and then throttles — no more than one event per 3 s. The server broadcasts via Redis pub/sub to other chat members. The indicator auto-hides after 5 s with no new event.

---
[← Back to InterviewQuestions](../README.md)
