---
title: WebSockets
part: 5
chapter: 0
slug: api-websockets
level: intermediate # beginner | intermediate | advanced
reading_time: 16
updated: 2026-08-28
tags: [backend, api, websockets]
in_book: true
---

# WebSockets {#ch-websockets}

> Choose between a socket, SSE and polling on the requirement, then scale it past one process.

**In this chapter:** WebSockets vs SSE vs polling · the handshake · a typed server · authenticating a socket · rooms and broadcast · scaling with a Redis adapter

## Overview

A WebSocket is one TCP connection that stays open, carrying messages in both directions with about two bytes of framing overhead per message. No new handshake, no repeated headers, and the server can speak first.

That last part is the real reason they exist. HTTP has no way for a server to say something unprompted.

> **The cost you are accepting:** you trade stateless for stateful. Every connection pins a client to one process, so load balancing, deploys, and scaling all get harder. The senior answer to "should we use WebSockets?" starts with "does the server actually need to push, and does the client need to talk back?" — because if either answer is no, something simpler wins.

## Table of Contents

- [WebSockets vs SSE vs Polling](#websockets-vs-sse-vs-polling)
- [The Handshake](#the-handshake)
- [A Typed Server](#a-typed-server)
- [Authentication](#authentication)
- [Rooms and Targeted Broadcast](#rooms-and-targeted-broadcast)
- [Scaling Across Instances](#scaling-across-instances)
- [Reconnection and Missed Messages](#reconnection-and-missed-messages)
- [Backpressure and Dead Connections](#backpressure-and-dead-connections)
- [Interview Questions](#interview-questions)
- [Summary](#summary)

## WebSockets vs SSE vs Polling

| | **WebSocket** | **SSE** | **Polling** |
| --- | --- | --- | --- |
| Direction | Bidirectional | Server → client | Client asks |
| Protocol | Own protocol after upgrade | Plain HTTP | Plain HTTP |
| Reconnect | You build it (or use a library) | ✅ Automatic, with `Last-Event-ID` | N/A |
| Works through proxies/CDNs | ⚠️ Often needs config | ✅ It's just HTTP | ✅ |
| Compression, caching, HTTP/2 | ❌ Mostly lost | ✅ Kept | ✅ |
| Server cost | One held connection per client | One held connection per client | Spiky, but stateless |
| Complexity | High | Low | Lowest |

**Decision rule:**

| Need | Use |
| ---- | --- |
| Client sends frequent messages too — chat, cursors, gameplay | **WebSocket** |
| Server pushes, client only listens — notifications, live prices, job progress, LLM token streams | **SSE** |
| "Fresh within ~30 seconds" is fine | **Polling** |
| Rare updates, client may be offline | **Webhook or push notification** |

> ✨ **SSE is the most under-used of the three.** It's one HTTP response that never ends, browsers reconnect automatically and replay from `Last-Event-ID`, and every proxy already understands it. If your feature is "the server tells the client something happened", SSE gets you there with a fraction of the operational burden.

🔴 **The HTTP/2 caveat worth knowing:** SSE over HTTP/1.1 is limited by the ~6-connections-per-origin cap, so several tabs can starve each other. Over HTTP/2 they share one connection and the problem disappears. Mention it and you've shown you've actually deployed this.

## The Handshake

A WebSocket starts life as an HTTP request asking to change protocols.

```http
GET /ws HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://app.example.com
```

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

After `101`, the TCP connection is no longer speaking HTTP. Two consequences that come up constantly:

- **Cookies are sent on the handshake**, so cross-origin WebSockets are exposed to CSRF-style attacks. The browser does **not** apply CORS to WebSockets — the server must check `Origin` itself.
- **Middleware doesn't run.** Your Express auth, rate limiter, and logger sit on the HTTP path. The upgraded socket bypasses all of it, so every one of those concerns has to be rebuilt on the socket layer.

Use `wss://` always. Plain `ws://` gets mangled by intercepting proxies and is trivially readable.

## A Typed Server

Socket.IO over raw `ws` buys reconnection, rooms, acknowledgements, and a polling fallback. Type the events, or you lose every guarantee at the boundary.

```typescript
import { Server } from "socket.io";
import http from "node:http";
import { z } from "zod";

// ── Event contracts, shared with the client ───────────────────────
interface ServerToClient {
  message: (payload: { id: string; room: string; body: string; at: string }) => void;
  presence: (payload: { userId: string; online: boolean }) => void;
  error: (payload: { code: string; message: string }) => void;
}

interface ClientToServer {
  join: (room: string, ack: (ok: boolean) => void) => void;
  send: (payload: { room: string; body: string }, ack: (id: string) => void) => void;
}

interface SocketData {
  userId: string; // set by the auth middleware below
}

const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(
  http.createServer(),
  {
    // 🔴 Not the same as CORS on your REST API — browsers don't enforce it here.
    cors: { origin: ["https://app.example.com"], credentials: true },
    maxHttpBufferSize: 1e5, // 100 KB per message; the default 1 MB is generous
  },
);

// ── Validate every inbound payload ────────────────────────────────
const SendPayload = z.object({
  room: z.string().regex(/^[a-z0-9-]{3,40}$/),
  body: z.string().min(1).max(2000),
});

io.on("connection", (socket) => {
  socket.on("send", async (raw, ack) => {
    const parsed = SendPayload.safeParse(raw);
    if (!parsed.success) {
      return socket.emit("error", { code: "INVALID_PAYLOAD", message: "Bad message" });
    }

    const { room, body } = parsed.data;

    // ⚠️ Authorize per message — joining a room once is not standing permission.
    if (!(await canPost(socket.data.userId, room))) {
      return socket.emit("error", { code: "FORBIDDEN", message: "Not a member" });
    }

    const saved = await messages.create({ room, body, userId: socket.data.userId });
    io.to(room).emit("message", { ...saved, at: saved.createdAt.toISOString() });
    ack(saved.id); // acknowledgement — the client knows it persisted
  });
});
```

> 🔴 **A WebSocket message is untrusted input, exactly like an HTTP body.** It skipped your validation middleware, so validate and authorize inside every handler. This is the most common real-world WebSocket vulnerability: auth checked at connect, then never again.

## Authentication

Authenticate during the handshake and reject before the connection is established.

```typescript
import jwt from "jsonwebtoken";

io.use((socket, next) => {
  // ✅ handshake.auth — not a query string, which lands in access logs.
  const token = socket.handshake.auth?.token as string | undefined;
  if (!token) return next(new Error("UNAUTHENTICATED"));

  try {
    const claims = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    socket.data.userId = claims.sub;
    next();
  } catch {
    next(new Error("UNAUTHENTICATED"));
  }
});
```

**Token expiry is the subtle problem.** A connection can outlive the token that opened it — a 15-minute JWT holding a socket open for six hours means five and three-quarter hours of unauthenticated access.

```typescript
// Re-check periodically and disconnect when the credential dies.
io.on("connection", (socket) => {
  const timer = setInterval(async () => {
    if (!(await stillValid(socket.data.userId))) {
      socket.emit("error", { code: "SESSION_EXPIRED", message: "Reauthenticate" });
      socket.disconnect(true);
    }
  }, 60_000);

  socket.on("disconnect", () => clearInterval(timer));
});
```

**Also check `Origin` yourself.** Browsers don't apply the same-origin policy to WebSockets, so a malicious page can open a socket to your server carrying the user's cookies. Either verify `Origin` on the handshake or use a token in `auth` rather than cookies — the token approach sidesteps the problem entirely.

## Rooms and Targeted Broadcast

A room is just a set of socket ids on that server. It's the right abstraction for "everyone watching document 42".

```typescript
socket.join(`room:${roomId}`);        // this socket joins
socket.join(`user:${socket.data.userId}`); // every device of one user

io.to(`room:${roomId}`).emit("message", payload);   // everyone in the room
socket.to(`room:${roomId}`).emit("presence", p);    // everyone *except* the sender
io.to(`user:${userId}`).emit("presence", p);        // all of one user's tabs
```

> ✨ **The `user:<id>` room is the pattern to remember.** People have three tabs and a phone. Addressing a user, not a socket, is what makes notifications behave correctly.

## Scaling Across Instances

One instance holds its own sockets and knows nothing about the others. Client A on pod 1 emits to a room; pod 2 has half the room's members and never hears about it.

```text
       ┌── pod 1 (A, B)  ← A emits here
LB ────┼── pod 2 (C, D)  ← C and D never receive it
       └── pod 3 (E)
```

**The fix is a broker every pod subscribes to:**

```typescript
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";

const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);

io.adapter(createAdapter(pubClient, subClient));

// Now this reaches every matching socket on every pod.
io.to(`room:${roomId}`).emit("message", payload);
```

| Concern | Detail |
| ------- | ------ |
| **Sticky sessions** | Still required if you allow the HTTP long-polling fallback, because those separate requests must land on the same pod. Pure WebSocket transport doesn't need them — the connection is one TCP stream |
| **Redis Pub/Sub is fire-and-forget** | A pod that's briefly disconnected loses those messages. Durability has to come from your database, not the adapter |
| **Fan-out cost** | Every message goes to every pod, whether or not it holds a relevant socket. Beyond a few dozen pods, look at a sharded adapter or a purpose-built service |
| **Deploys drop everyone** | Rolling a deploy disconnects every socket on each pod. Reconnection must be a first-class client feature, not an afterthought |

**Know when to stop building this.** At tens of thousands of concurrent connections, a managed service (Ably, Pusher, AWS API Gateway WebSockets) removes an entire class of operational work. Saying "I'd buy this rather than run it" is a legitimate senior answer, provided you can explain the tradeoff.

## Reconnection and Missed Messages

Reconnection is table stakes and Socket.IO gives it to you. **Recovering the messages you missed while disconnected is the harder half, and interviewers ask about exactly that.**

```typescript
import { io } from "socket.io-client";

const socket = io("wss://api.example.com", {
  auth: { token },
  reconnection: true,
  reconnectionDelay: 1_000,
  reconnectionDelayMax: 30_000, // exponential backoff, capped
  randomizationFactor: 0.5,     // ✅ jitter — stops a thundering herd after an outage
});
```

🔴 **Without jitter, every client reconnects on the same schedule.** A pod restart becomes a synchronized stampede that knocks over the pod that just came up. The randomization factor is not decoration.

**Then close the gap in the data, not the transport:**

```typescript
// The client remembers the last event it processed.
let lastEventId: string | null = null;

socket.on("connect", async () => {
  // ✅ Fetch what was missed over plain HTTP — durable, paginated, cacheable.
  const missed = await fetch(`/api/rooms/${roomId}/events?after=${lastEventId ?? ""}`);
  for (const event of await missed.json()) apply(event);
});

socket.on("message", (event) => {
  apply(event);
  lastEventId = event.id;
});
```

> **The principle:** treat the socket as a low-latency hint, and HTTP as the source of truth. A client that can rebuild its state from a REST endpoint tolerates any disconnection. A client that only learns about changes through the socket is permanently one dropped frame away from being wrong.

## Backpressure and Dead Connections

**A slow consumer is a memory leak.** If you emit faster than a client can read, messages queue in your process.

```typescript
// ws exposes the socket's outbound buffer — drop or disconnect when it grows.
if (ws.bufferedAmount > 1_000_000) {
  ws.close(1013, "Try again later"); // 1013 = Try Again Later
  return;
}
```

For high-frequency data, **coalesce instead of queueing**: keep only the latest value per key and flush on an interval. A live price feed cares about the current price, not the twelve you missed.

**Dead connections need heartbeats.** A client that loses power sends no close frame, so the server keeps the socket — and its memory — indefinitely. Socket.IO pings by default (`pingInterval`, `pingTimeout`); with raw `ws` you send ping frames and drop sockets that miss a pong.

```typescript
const alive = new WeakSet<WebSocket>();

wss.on("connection", (ws) => {
  alive.add(ws);
  ws.on("pong", () => alive.add(ws));
});

setInterval(() => {
  for (const ws of wss.clients) {
    if (!alive.has(ws)) { ws.terminate(); continue; } // missed the last round
    alive.delete(ws);
    ws.ping();
  }
}, 30_000);
```

**Rate limit per socket too** — one connection can send thousands of messages a second. Reuse the token bucket from [Rate Limiting](./04-rate-limiting.md), keyed on `socket.data.userId`.

## Interview Questions

**Q1: How do WebSockets differ from HTTP?**

A WebSocket begins as an HTTP request with `Upgrade: websocket`; after a `101` the connection stops speaking HTTP and carries framed messages in both directions with a couple of bytes of overhead each. HTTP is one request per response, client-initiated, stateless. The practical consequence is that WebSockets are stateful — a connection belongs to one process — so everything about scaling and deploying gets harder.

**Q2: WebSocket or SSE?**

SSE unless the client needs to send frequent messages. SSE is plain HTTP, so proxies, compression, and HTTP/2 all just work, and browsers reconnect automatically with `Last-Event-ID` replay. WebSockets earn their complexity when traffic is genuinely bidirectional — chat, collaborative cursors, gameplay. Notifications, progress bars, and token streams are one-directional and belong on SSE.

**Q3: How do you scale WebSockets across instances?**

Add a pub/sub adapter — Redis for Socket.IO — so every pod receives every broadcast and delivers it to its own sockets. Sticky sessions are still needed if you allow the long-polling fallback. Two things the adapter does not solve: Redis Pub/Sub is fire-and-forget, so durability must come from the database, and every message fans out to every pod, which stops scaling somewhere in the low dozens. Past that I'd shard or use a managed service.

**Q4: A client reconnects after 30 seconds offline. How does it catch up?**

Not through the socket. The client tracks the last event id it applied, and on reconnect it calls a REST endpoint for everything after that id, then resumes live events. The socket is a latency optimisation; HTTP is the source of truth. Relying on the transport for delivery guarantees is how clients end up silently out of sync.

**Q5: How do you authenticate, and what goes wrong?**

A token in the handshake `auth` payload, verified in middleware before the connection is accepted — not in a query string, which lands in logs. Two things go wrong. First, the connection outlives the token, so you need periodic revalidation and a disconnect. Second, browsers don't apply CORS to WebSockets, so a cookie-authenticated socket can be opened from any origin — check `Origin` yourself, or use a token instead of cookies.

**Q6: What happens when a client can't keep up?**

Its outbound messages queue in your process, which is an unbounded memory leak. I watch `bufferedAmount` and either drop the slow client or coalesce — keeping only the newest value per key and flushing on an interval, which is what a price feed actually wants. Separately, heartbeats are needed to reap connections that died without a close frame.

**Q7: Do you validate WebSocket messages?**

Yes, every one. The upgrade bypasses all HTTP middleware, so nothing has validated the payload, checked a rate limit, or authorized the action. And authorization has to be per message, not per connection — a client that joined a room legitimately may have lost access since. Auth-at-connect-only is the classic WebSocket vulnerability.

**Q8: What breaks on deploy?**

Every connection on a restarting pod drops at once. That's survivable if reconnection has capped exponential backoff *with jitter* — without jitter, all clients return simultaneously and flatten the new pod. Draining helps: stop accepting new connections, tell clients to reconnect, and give them a staggered window before the process exits.

## Summary

**Checklist:**

- [ ] Genuinely bidirectional — otherwise SSE or polling
- [ ] `wss://` only
- [ ] Token in the handshake `auth`, verified in middleware
- [ ] `Origin` verified, or cookies avoided entirely
- [ ] Long-lived connections revalidate the session and disconnect on expiry
- [ ] Every inbound message validated **and** authorized
- [ ] Per-socket rate limiting and a message size cap
- [ ] Typed event contracts shared between client and server
- [ ] Redis adapter (or equivalent) for multi-instance broadcast
- [ ] Durability in the database — not in Pub/Sub
- [ ] Reconnect with capped exponential backoff and jitter
- [ ] Gap recovery over HTTP using a last-event id
- [ ] Heartbeats to reap dead sockets; `bufferedAmount` watched
- [ ] Connection count, message rate, and reconnect rate on a dashboard

**Best practices:**

1. **Prefer the simpler transport** — most "real-time" requirements are SSE or polling.
2. **The socket is a hint, HTTP is the truth** — clients must be able to rebuild state.
3. **Validate and authorize per message** — the upgrade skipped your middleware.
4. **Plan for mass reconnection** — every deploy is a small outage.

---

[← Documentation](./05-documentation.md) | [API Index](./README.md)
