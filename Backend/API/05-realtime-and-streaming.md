---
title: Real-Time and Streaming APIs
part: 5
chapter: 0
slug: realtime-streaming
level: advanced
reading_time: 11
updated: 2026-09-01
tags: [api, websockets, sse, streaming, realtime, backend]
in_book: true
---

# Real-Time and Streaming APIs {#ch-realtime-streaming}

> Push to a client over the right transport, and rebuild on the socket every guarantee the HTTP
> middleware used to give you.

**In this chapter:** SSE and HTTP streaming · what the upgrade skips · a typed, validated socket server · handshake auth and revalidation · broadcast across instances · backpressure

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

## Server-Sent Events and HTTP Streaming

Before reaching for a socket, check whether one direction is enough. **SSE** is a long-lived HTTP
response of `text/event-stream`, and the browser's `EventSource` handles reconnection and
last-event-id replay for you. It is plain HTTP, so your auth middleware, rate limiter and logging
all still apply — the single biggest operational advantage over WebSockets.

```typescript
app.get("/events", requireAuth, async (req, res) => {
  res.set({
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform", // no-transform stops proxies buffering
    Connection: "keep-alive",
  });
  res.flushHeaders();

  // The client resumes with Last-Event-ID, so a gap is recoverable without a separate call.
  const since = req.header("Last-Event-ID");
  const unsubscribe = bus.subscribe(req.user.id, since, (event: Event): void => {
    res.write(`id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
  });

  const keepAlive = setInterval((): void => res.write(": ping\n\n"), 15_000);
  req.on("close", (): void => { clearInterval(keepAlive); unsubscribe(); });
});
```

Two traps. Over HTTP/1.1 a browser allows six connections per origin and an SSE stream occupies
one for its whole life; on HTTP/2 that limit is gone. And any proxy that buffers will hold your
events until its buffer fills, which is why `no-transform` and the periodic comment ping are not
optional.

**Streaming a token-by-token response** — the shape an AI feature needs — is the same mechanism
with a simpler contract: keep the response open and write chunks as they are produced. Choose SSE
when the client needs typed events and resumability, and a plain chunked response when it only
needs the text.

## A Typed Server

Socket.IO over raw `ws` buys reconnection, rooms, acknowledgements and a polling fallback. Type the events, or you lose every guarantee at the boundary.

```typescript
// ── Event contracts, shared with the client ───────────────────────
interface ServerToClient {
  message: (payload: { id: string; room: string; body: string; at: string }) => void;
  error: (payload: { code: string; message: string }) => void;
}
interface ClientToServer {
  send: (payload: { room: string; body: string }, ack: (id: string) => void) => void;
}
interface SocketData { userId: string } // set by the auth middleware below

const io = new Server<ClientToServer, ServerToClient, Record<string, never>, SocketData>(server, {
  // Not the same as CORS on your REST API — browsers don't enforce it here.
  cors: { origin: ["https://app.example.com"], credentials: true },
  maxHttpBufferSize: 1e5, // 100 KB per message; the default 1 MB is generous
});

const SendPayload = z.object({
  room: z.string().regex(/^[a-z0-9-]{3,40}$/),
  body: z.string().min(1).max(2000),
});

io.on("connection", (socket) => {
  socket.on("send", async (raw, ack) => {
    const parsed = SendPayload.safeParse(raw); // Nothing else validated this.
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
    ack(saved.id); // Acknowledgement — the client knows it persisted.
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

The fix is a periodic check on an interval — revalidate the session, emit a `SESSION_EXPIRED`
error and call `socket.disconnect(true)` when it fails — cleared on `disconnect` so the timer does
not outlive the socket.

A token in `auth` also sidesteps the `Origin` problem entirely: nothing is sent automatically, so a hostile page has no credential to replay.

## Rooms and Targeted Broadcast

A room is a set of socket ids on one server. It is the right abstraction for "everyone watching document 42".

`socket.join()` adds a socket to a room. Join two: `room:<id>` for the document or channel, and
`user:<id>` for every device of one user. Then `io.to(room).emit()` reaches everyone,
`socket.to(room).emit()` reaches everyone except the sender, and `io.to(`user:${id}`).emit()`
reaches all of one user's tabs.

The `user:<id>` room is the pattern to remember. People have three tabs and a phone. Addressing a user, not a socket, is what makes notifications behave correctly.

## Broadcasting Across Instances

One instance holds its own sockets and knows nothing about the others, so a broadcast from pod 1 never reaches the half of the room sitting on pod 2. [Chapter ?? — Real-Time Communication](#ch-realtime-communication) covers why the topology behaves that way and what it costs. The wiring is small:

```typescript
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

The pattern with raw `ws` is a set of live sockets: mark a socket alive on `pong`, and every 30
seconds terminate any socket still unmarked from the previous round before pinging again.

**Rate limit per socket too** — one connection can send thousands of messages a second. Reuse the token bucket from [Chapter ?? — Rate Limiting](#ch-rate-limiting), keyed on `socket.data.userId` rather than an IP.

## Common Mistakes

❌ **Authorising once, at connect.** A client that joined a room legitimately may have lost access since.
✅ Check permission inside every handler, on every message.

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

**Q: When would you not build a socket server at all?**

When the traffic is one-directional — SSE keeps your HTTP middleware, auth and logging, and the
browser handles reconnection for you. When "fresh within thirty seconds" is acceptable, polling is
cheaper to operate than anything stateful. And past a few tens of thousands of concurrent
connections on a small team, a managed service removes fan-out sharding and deploy draining as
things you own.

## What to Read Next

- [Chapter ?? — Real-Time Communication](#ch-realtime-communication) — whether this feature needs a socket at all, and how the connection topology scales
- [Chapter ?? — Frontend Real-Time Features](#ch-frontend-real-time-features) — the client half: reconnection, backoff with jitter, and recovering missed messages
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — the token bucket this chapter reuses per socket
