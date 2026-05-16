# WebSockets & Real-Time Communication

## 💡 **Concept**

WebSocket is a full-duplex, persistent TCP connection between client and server. Either side can push data at any time without the other side requesting it.

**Use WebSockets when:** you need low-latency, bidirectional, server-initiated messages — live chat, collaborative editing, real-time dashboards.

---

## WebSocket vs SSE vs Long Polling

| | WebSocket | Server-Sent Events (SSE) | Long Polling |
|---|---|---|---|
| **Direction** | Bidirectional | Server → Client only | Server → Client (simulated) |
| **Protocol** | WS/WSS (upgraded TCP) | HTTP | HTTP |
| **Connection** | Persistent | Persistent | Re-established per message |
| **Latency** | < 50ms | < 100ms | 200–2000ms |
| **Overhead** | Low (2–10 byte frames) | Low | High (full HTTP headers) |
| **Browser support** | Universal | Universal (no IE) | Universal |
| **Firewall friendly** | Sometimes blocked | Yes | Yes |
| **Best for** | Chat, games, collaborative | Notifications, feeds | Simple push (fallback) |

---

## How WebSockets Work

```
Client                              Server
  │                                    │
  │── HTTP GET /chat (Upgrade: ws) ──▶│
  │                                    │
  │◀─ 101 Switching Protocols ─────────│
  │                                    │
  │◀══════ persistent TCP tunnel ══════│
  │                                    │
  │── send frame ─────────────────────▶│  (client → server)
  │◀─ push frame ──────────────────────│  (server → client, any time)
  │── ping ───────────────────────────▶│
  │◀─ pong ────────────────────────────│  (keepalive)
  │                                    │
  │── close frame ────────────────────▶│
  │◀─ close frame ─────────────────────│
```

**Handshake upgrades HTTP → WebSocket.** After that, frames (not HTTP requests) flow in both directions with minimal overhead.

---

## TypeScript Implementation

```typescript
interface Room {
  id: string;
  clients: Set<WebSocket>;
}

interface IncomingMessage {
  type: 'join' | 'leave' | 'message';
  roomId: string;
  payload?: string;
}

interface OutgoingMessage {
  type: 'message' | 'user_joined' | 'user_left';
  roomId: string;
  payload: string;
  timestamp: number;
}

// Server-side room-based broadcast (Node.js ws library pattern)
class RoomManager {
  private rooms = new Map<string, Room>();

  join(roomId: string, ws: WebSocket): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, { id: roomId, clients: new Set() });
    }
    this.rooms.get(roomId)!.clients.add(ws);
  }

  leave(roomId: string, ws: WebSocket): void {
    this.rooms.get(roomId)?.clients.delete(ws);
  }

  broadcast(roomId: string, msg: OutgoingMessage, exclude?: WebSocket): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const data = JSON.stringify(msg);
    for (const client of room.clients) {
      if (client !== exclude && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    }
  }
}
```

**Client-side reconnection:**

```typescript
function createReconnectingWebSocket(url: string): WebSocket {
  let ws = new WebSocket(url);
  let reconnectDelay = 1000;

  ws.onclose = () => {
    setTimeout(() => {
      ws = createReconnectingWebSocket(url);
      reconnectDelay = Math.min(reconnectDelay * 2, 30_000); // exponential backoff
    }, reconnectDelay);
  };

  ws.onopen = () => { reconnectDelay = 1000; }; // reset on successful connect

  return ws;
}
```

---

## Scaling WebSockets

**The problem:** WebSocket connections are stateful — a client connected to Server A cannot receive a message pushed by Server B.

**Solution: pub/sub broker for cross-server broadcast**

```
Client A ──── Server 1 ─┐
Client B ──── Server 1  │
                         ├── Redis Pub/Sub ──► all servers receive ──► correct client
Client C ──── Server 2 ─┘
Client D ──── Server 2
```

```typescript
// Each server subscribes to a shared Redis channel
// When Server 1 wants to message Client D (on Server 2):
// Server 1 → publishes to Redis → Server 2 receives → pushes to Client D

interface BroadcastEvent {
  roomId: string;
  message: OutgoingMessage;
}

async function publishToRoom(
  redisPublisher: RedisClient,
  event: BroadcastEvent
): Promise<void> {
  await redisPublisher.publish('ws:rooms', JSON.stringify(event));
}
```

**Sticky sessions:** An alternative is routing the same client always to the same server (IP hash or cookie). Simpler to implement but creates uneven load and complicates deploys.

---

## Heartbeat / Ping-Pong

```typescript
const HEARTBEAT_INTERVAL = 30_000; // 30s
const HEARTBEAT_TIMEOUT = 10_000;  // 10s to respond

function attachHeartbeat(ws: WebSocket): void {
  let alive = true;

  const interval = setInterval(() => {
    if (!alive) {
      ws.terminate(); // no pong received — close dead connection
      clearInterval(interval);
      return;
    }
    alive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);

  ws.on('pong', () => { alive = true; });
  ws.on('close', () => clearInterval(interval));
}
```

---

## When to Use

| Scenario | Use |
|---|---|
| Live chat / messaging | WebSocket |
| Real-time dashboard (read-only) | SSE (simpler) |
| Collaborative editing (Google Docs) | WebSocket |
| Push notifications only | SSE or push API |
| Simple event polling (updates every 30s) | Regular HTTP polling |

---

## Common Mistakes

❌ **No reconnection logic** — network blips will drop connections. Implement exponential backoff reconnect.

❌ **Broadcasting on a single server** — works locally but breaks when you scale to multiple servers. Use Redis pub/sub.

❌ **No heartbeat** — TCP connections can appear open while the client is gone (NAT timeout). Detect dead connections with ping/pong.

❌ **Sending large payloads** — WebSocket frames are not designed for large transfers. Use a pre-signed URL for binary files; send the URL over WebSocket.

✅ **Limit connections per server** — a single Node.js process can hold ~50k WebSocket connections before memory becomes a concern.

---

## Real-World Example

An enterprise system monitoring dashboard shows live CPU, memory, and error rates across 50 microservices. Each frontend client opens a WebSocket connection. The backend subscribes to a Prometheus stream, formats metric deltas, and pushes updates every 2 seconds to subscribed clients. Three backend WebSocket servers share a Redis pub/sub channel so any server can push to any client. Heartbeats detect and close 200ms stale connections automatically.

---

## Key Insight

> WebSocket gives you a phone call instead of sending letters. It's powerful — but managing thousands of persistent connections is stateful infrastructure. Design for reconnection and cross-server broadcast from day one.

**Related:** [Notifications](./08-notifications.md) · [Real-Time Frontend](../Frontend/06-real-time.md)

---

[← Back to SystemDesign](../README.md)
