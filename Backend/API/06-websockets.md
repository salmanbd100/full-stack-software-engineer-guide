---
title: WebSockets
part: 5
chapter: 0
slug: api-websockets
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-31
tags: [backend, api, websockets]
in_book: true
---

# WebSockets {#ch-websockets}

> Run a socket server that authenticates, authorises and survives contact with real clients.

**In this chapter:** what the upgrade skips · a typed server · authenticating a socket · rooms and broadcast · the Redis adapter · backpressure and dead connections

## 💡 The Core Idea

A WebSocket is one TCP connection that stays open, carrying messages in both directions with about two bytes of framing per message. The server can speak first — which HTTP cannot do at all.

The cost is that you trade stateless for stateful. Every connection pins a client to one process, so load balancing, deploys and scaling all get harder.

This chapter is the **server side**: how to build one correctly. The prior question — whether this feature needs a socket at all, or whether SSE or polling is enough — is a design decision, and it belongs to [Chapter ?? — Real-Time Communication](#ch-realtime-communication). Read that first if the protocol is still open.

## How It Works

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

After `101` the connection is no longer speaking HTTP. Two consequences come up constantly:

- **Cookies are sent on the handshake**, and the browser does **not** apply CORS to WebSockets. A malicious page can open a socket to your server carrying the user's cookies, so the server must check `Origin` itself.
- **Middleware does not run.** Your Express auth, rate limiter, validator and logger sit on the HTTP path. The upgraded socket bypasses all of it, so every one of those concerns has to be rebuilt on the socket layer.

Use `wss://` always. Plain `ws://` gets mangled by intercepting proxies and is trivially readable.

## When to Use It

| Situation | Build a socket server? |
| --------- | ---------------------- |
| Clients send frequent messages — chat, cursors, gameplay | **Yes** |
| Server pushes, client only listens | No — SSE is plain HTTP and costs far less to operate |
| "Fresh within ~30 seconds" is acceptable | No — poll |
| Tens of thousands of concurrent connections and a small team | Consider buying it — Ably, Pusher, AWS API Gateway WebSockets |

## A Typed Server

Socket.IO over raw `ws` buys reconnection, rooms, acknowledgements and a polling fallback. Type the events, or you lose every guarantee at the boundary.

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
    // Not the same as CORS on your REST API — browsers don't enforce it here.
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

    // Authorise per message — joining a room once is not standing permission.
    if (!(await canPost(socket.data.userId, room))) {
      return socket.emit("error", { code: "FORBIDDEN", message: "Not a member" });
    }

    const saved = await messages.create({ room, body, userId: socket.data.userId });
    io.to(room).emit("message", { ...saved, at: saved.createdAt.toISOString() });
    ack(saved.id); // acknowledgement — the client knows it persisted
  });
});
```

> ⚠️ **A WebSocket message is untrusted input, exactly like an HTTP body.** It skipped your validation middleware, so validate and authorise inside every handler. Auth checked at connect and never again is the most common real-world WebSocket vulnerability.

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

A token in `auth` also sidesteps the `Origin` problem entirely: nothing is sent automatically, so a hostile page has no credential to replay.

## Rooms and Targeted Broadcast

A room is a set of socket ids on one server. It is the right abstraction for "everyone watching document 42".

```typescript
socket.join(`room:${roomId}`);             // this socket joins
socket.join(`user:${socket.data.userId}`); // every device of one user

io.to(`room:${roomId}`).emit("message", payload);   // everyone in the room
socket.to(`room:${roomId}`).emit("presence", p);    // everyone *except* the sender
io.to(`user:${userId}`).emit("presence", p);        // all of one user's tabs
```

The `user:<id>` room is the pattern to remember. People have three tabs and a phone. Addressing a user, not a socket, is what makes notifications behave correctly.

## Broadcasting Across Instances

One instance holds its own sockets and knows nothing about the others, so a broadcast from pod 1 never reaches the half of the room sitting on pod 2. [Chapter ?? — Real-Time Communication](#ch-realtime-communication) covers why the topology behaves that way and what it costs. The wiring is small:

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

Two things the adapter does **not** give you. Redis Pub/Sub is fire-and-forget, so durability has to come from your database. And sticky sessions are still required if you allow the HTTP long-polling fallback, because those separate requests must land on the same pod.

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

**Rate limit per socket too** — one connection can send thousands of messages a second. Reuse the token bucket from [Chapter ?? — Rate Limiting](#ch-rate-limiting), keyed on `socket.data.userId` rather than an IP.

## Common Mistakes

❌ **Authorising once, at connect.** A client that joined a room legitimately may have lost access since.
✅ Check permission inside every handler, on every message.

❌ **Putting the token in the query string.** It lands in access logs, proxy logs and browser history.
✅ Send it in the handshake `auth` payload.

❌ **Trusting the payload shape because it came over your own socket.** Nothing validated it.
✅ Parse every inbound message with a schema before touching it.

❌ **Broadcasting from one pod and calling it done.** It works in development, where there is one pod.
✅ Add a pub/sub adapter before the second instance exists, not after.

❌ **Treating the socket as the delivery guarantee.** Every deploy drops every connection.
✅ Persist to the database and let clients recover the gap over HTTP.

## 🔑 Key Takeaways

- The upgrade bypasses every piece of HTTP middleware, so validation, authorisation, rate limiting and logging all have to be rebuilt on the socket.
- Authenticate on the handshake, then revalidate periodically — a long-lived connection outlives a short-lived token.
- Rooms should address a user, not a socket, because people have several devices open at once.
- A pub/sub adapter makes broadcast correct across instances but adds no durability; the database still owns that.
- A client that cannot keep up is an unbounded memory leak, so watch the outbound buffer and coalesce high-frequency data.

## Interview Questions

**Q: Do you validate WebSocket messages?**

Yes, every one. The upgrade bypasses all HTTP middleware, so nothing has validated the payload, checked a rate limit or authorised the action. Authorisation also has to be per message rather than per connection, because a client that joined a room legitimately may have lost access since. Auth-at-connect-only is the classic WebSocket vulnerability.

**Q: How do you authenticate a socket, and what goes wrong?**

A token in the handshake `auth` payload, verified in middleware before the connection is accepted — not in a query string, which lands in logs. Two things go wrong. The connection outlives the token, so you need periodic revalidation and a disconnect. And browsers do not apply CORS to WebSockets, so a cookie-authenticated socket can be opened from any origin; a token sidesteps that because nothing is sent automatically.

**Q: How do you make a broadcast reach every client across ten pods?**

A pub/sub adapter — Redis for Socket.IO — so every pod receives every broadcast and delivers it to its own sockets. Sticky sessions are still needed if the long-polling fallback is enabled. The adapter does not give durability, since Redis Pub/Sub is fire-and-forget, and every message fans out to every pod whether or not it holds a relevant socket, which stops scaling somewhere in the low dozens.

**Q: What happens when a client cannot keep up?**

Its outbound messages queue in your process, which is an unbounded memory leak. I watch `bufferedAmount` and either drop the slow client or coalesce — keeping only the newest value per key and flushing on an interval, which is what a price feed actually wants. Separately, heartbeats are needed to reap connections that died without sending a close frame.

**Q: When would you not build this yourself?**

Past a few tens of thousands of concurrent connections, or on a team without operational capacity for stateful infrastructure. A managed service removes connection scaling, fan-out sharding and deploy draining as things you own. The tradeoff is per-connection cost and a vendor in the hot path of your most latency-sensitive feature, so I would want the message volume forecast before committing either way.

## What to Read Next

- [Chapter ?? — Real-Time Communication](#ch-realtime-communication) — whether this feature needs a socket at all, and how the connection topology scales
- [Chapter ?? — Frontend Real-Time Features](#ch-frontend-real-time-features) — the client half: reconnection, backoff with jitter, and recovering missed messages
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the token bucket this chapter reuses per socket
