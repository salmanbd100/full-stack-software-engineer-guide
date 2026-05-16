# Real-Time Features

## 💡 **Concept**

Real-time features keep the client in sync with the server without the user requesting an update. The right technology depends on whether communication needs to be bidirectional and how frequently data changes.

**How to answer in an interview:** "I'd ask two questions: does the client need to send messages to the server, and how frequently do updates arrive? If bidirectional and frequent — WebSocket. If server-to-client only — SSE. If infrequent (every few minutes) — polling is simpler and sufficient."

---

## Technology Comparison

| Protocol | Direction | Use Case | Overhead |
|----------|-----------|---------|---------|
| **WebSocket** | Bidirectional | Chat, collaboration, gaming | Medium |
| **SSE** | Server → Client | Notifications, live feeds | Low |
| **Long Polling** | Server → Client | Fallback, legacy browsers | High |

---

## WebSocket

Persistent full-duplex TCP connection. Low latency; both sides send messages freely.

```typescript
class WebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private readonly maxAttempts = 5;
  private listeners = new Map<string, ((data: unknown) => void)[]>();

  connect(url: string): void {
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      console.log("WebSocket connected");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      const { type, payload } = JSON.parse(event.data as string);
      this.listeners.get(type)?.forEach((cb) => cb(payload));
    };

    this.ws.onclose = () => this.reconnect(url);
    this.ws.onerror = (err) => console.error("WebSocket error", err);
  }

  private reconnect(url: string): void {
    if (this.reconnectAttempts >= this.maxAttempts) return;
    this.reconnectAttempts++;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30_000); // exponential backoff
    setTimeout(() => this.connect(url), delay);
  }

  send(type: string, payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
    }
  }

  on(type: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type)!.push(callback);
  }
}
```

**React hook:**

```typescript
function useChatRoom(roomId: string) {
  const [messages, setMessages] = React.useState<Message[]>([]);
  const wsRef = React.useRef(new WebSocketClient());

  React.useEffect(() => {
    const ws = wsRef.current;
    ws.connect(`wss://api.example.com/chat/${roomId}`);
    ws.on("message", (msg) =>
      setMessages((prev) => [...prev, msg as Message])
    );
    return () => ws.send("leave", { roomId });
  }, [roomId]);

  const sendMessage = (text: string) =>
    wsRef.current.send("message", { roomId, text });

  return { messages, sendMessage };
}
```

---

## Server-Sent Events (SSE)

Unidirectional server-push over HTTP. Simpler than WebSocket for one-way data.

```typescript
// Server (Node.js/Express)
import express from "express";
const app = express();

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const sendEvent = (data: object) =>
    res.write(`data: ${JSON.stringify(data)}\n\n`);

  const interval = setInterval(() => {
    sendEvent({ type: "heartbeat", timestamp: Date.now() });
  }, 30_000);

  req.on("close", () => clearInterval(interval));
});

// Client
function useLiveFeed() {
  const [events, setEvents] = React.useState<FeedEvent[]>([]);

  React.useEffect(() => {
    const source = new EventSource("/api/events");
    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as FeedEvent;
      setEvents((prev) => [data, ...prev].slice(0, 100)); // keep last 100
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, []);

  return events;
}
```

---

## Choosing the Right Protocol

```
Need bidirectional? (client sends to server)
  YES → WebSocket
  NO  →
        Updates > every 5 seconds? → SSE
        Updates < every 5 seconds? → Polling (simpler, stateless)
```

| Feature | WebSocket | SSE | Polling |
|---------|-----------|-----|---------|
| Bidirectional | ✅ | ❌ | ❌ |
| Auto-reconnect | Manual | ✅ Built-in | N/A |
| HTTP/2 support | Separate conn | ✅ Multiplexed | ✅ |
| Firewall-friendly | ⚠️ | ✅ | ✅ |

---

## Scaling Considerations

WebSocket connections are stateful — every connection must reach the same server instance.

```
Client A ──┐
Client B ──┤→ Load Balancer → Server 1 ──┐
Client C ──┘                              ├→ Redis Pub/Sub → Server 2 → Client D
                                          └→ Server 3 → Client E
```

Use Redis Pub/Sub (or a message broker like SQS) so any server can broadcast to any client regardless of which server holds the connection.

---

## Common Mistakes

❌ **No reconnection logic** — a brief network blip permanently disconnects users  
❌ **WebSocket for infrequent updates** — polling is simpler and sufficient for < 1 update/minute  
❌ **No heartbeat** — dead connections aren't detected without a ping/pong mechanism  
❌ **Stateful WebSocket servers behind a round-robin load balancer** — clients reconnect to different servers; use sticky sessions or Pub/Sub

**Key insight:**

> Always implement exponential backoff reconnection. Without it, a brief server restart causes all clients to hammer the server simultaneously — the "thundering herd" problem.

---
[← Back to SystemDesign](../README.md)
