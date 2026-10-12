---
sourceHash: "e787c5b9387ebbbcfb6d0bfc29a1a2e0b1604112ef85bcc0426d378906d0feae"
title: "Real-Time ও Streaming API"
translatedAt: "2026-10-12T12:20:03.950Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Real-Time ও Streaming API {#ch-realtime-streaming}

> সঠিক transport দিয়ে client-এ push করুন, আর HTTP middleware আগে যে guarantee-গুলো দিত, সেগুলো socket-এর ওপর
> আবার তৈরি করুন।

**এই অধ্যায়ে:** SSE আর HTTP streaming · upgrade কী কী এড়িয়ে যায় · typed, validated socket server · handshake auth আর revalidation · একাধিক instance জুড়ে broadcast · backpressure

## 💡 মূল ধারণা

WebSocket হলো একটি TCP connection, যেটা খোলা থাকে। এটা দুই দিকেই message বহন করে, প্রতি message-এ মোটামুটি দুই byte framing লাগে। Server আগে কথা বলতে পারে, যেটা HTTP একেবারেই পারে না।

দামটা হলো, আপনি stateless ছেড়ে stateful-এ যাচ্ছেন: server এখন প্রতিটি client-এর state ধরে রাখে। প্রতিটি connection একটি client-কে একটি process-এ আটকে রাখে। ফলে load balancing, deploy আর scaling সবই কঠিন হয়ে যায়।

এই অধ্যায় **server-এর দিক** নিয়ে: কীভাবে একটি socket server সঠিকভাবে বানাবেন। তার আগের প্রশ্নটা একটি design-এর সিদ্ধান্ত। এই feature-এর কি আদৌ socket লাগে, নাকি SSE বা polling-ই যথেষ্ট? সেটা [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues)-এর বিষয়। Protocol এখনো ঠিক না হলে আগে সেটা পড়ুন।

## কীভাবে কাজ করে

WebSocket শুরু হয় একটি HTTP request হিসেবে, যেটা protocol বদলাতে চায়।

```http
GET /ws HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://app.example.com
```

`101`-এর পরে connection আর HTTP-তে কথা বলে না। এর দুটো ফল বারবার সামনে আসে:

- **Handshake-এ cookie পাঠানো হয়**, আর browser WebSocket-এ CORS **প্রয়োগ করে না**। একটি ক্ষতিকর page user-এর cookie নিয়ে আপনার server-এ socket খুলতে পারে। তাই server-কে নিজেই `Origin` যাচাই করতে হবে।
- **Middleware চলে না।** আপনার Express auth, rate limiter, validator আর logger HTTP path-এ বসে আছে। Upgrade হওয়া socket এর সবকিছু এড়িয়ে যায়। তাই এর প্রতিটি দায়িত্ব socket layer-এ আবার তৈরি করতে হয়।

সবসময় `wss://` ব্যবহার করুন। Intercepting proxy সাধারণ `ws://` ভেঙে দেয়, আর path-এ থাকা যে কেউ সেটা পড়তে পারে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Socket server বানাবেন? |
| --------- | ---------------------- |
| Client ঘন ঘন message পাঠায় — chat, cursor, gameplay | **হ্যাঁ** |
| Server push করে, client শুধু শোনে | না — SSE সাধারণ HTTP, আর চালাতে অনেক কম খরচ |
| "মোটামুটি 30 সেকেন্ডের মধ্যে fresh" হলেই চলে | না — poll করুন |
| হাজার হাজার concurrent connection আর ছোট team | কিনে নেওয়ার কথা ভাবুন — Ably, Pusher, AWS API Gateway WebSockets |

## Server-Sent Events আর HTTP Streaming

Socket ধরার আগে দেখুন, এক দিকের যোগাযোগই যথেষ্ট কি না। **SSE** হলো `text/event-stream`-এর একটি দীর্ঘস্থায়ী HTTP
response। Browser-এর `EventSource` আপনার হয়ে reconnection আর last-event-id replay সামলায়। এটা সাধারণ HTTP,
তাই আপনার auth middleware, rate limiter আর logging সবই খাটে। WebSocket-এর তুলনায় চালানোর দিক থেকে এটাই এর
সবচেয়ে বড় সুবিধা।

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

দুটো ফাঁদ আছে। HTTP/1.1-এ browser প্রতি origin-এ ছয়টি connection দেয়, আর একটি SSE stream পুরো জীবন ধরে একটি
দখল করে রাখে। HTTP/2 এই সীমা তুলে দেয়। আর যে proxy buffer করে, সে buffer ভরা না হওয়া পর্যন্ত আপনার event আটকে
রাখে। তাই `no-transform` আর নিয়মিত comment ping ঐচ্ছিক নয়।

**Token-by-token response stream করা**, যে রূপ একটি AI feature-এর লাগে, একই mechanism, শুধু contract-টা আরও
সহজ। Response খোলা রাখুন, আর server যেমন যেমন chunk তৈরি করে, তেমন লিখে দিন। Client-এর typed event আর
resumability লাগলে SSE বেছে নিন। শুধু text লাগলে একটি সাধারণ chunked response বেছে নিন। সেই stream-এর client
আর product-এর অর্ধেক হলো first-token target, cancellation, আর connection মারা গেলে আংশিক উত্তর ধরে রাখা।
[Chapter ?? — Streaming Response](#ch-streaming-responses) দেখুন।

## একটি Typed Server

Socket.IO সাধারণ `ws`-এর চেয়ে বেশি দেয়: reconnection, room, acknowledgement আর একটি polling fallback। Event-গুলো type করুন, না হলে boundary-তে সব guarantee হারাবেন।

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

> ⚠️ **WebSocket message হলো untrusted input, ঠিক একটি HTTP body-র মতো।** এটা আপনার validation middleware এড়িয়ে এসেছে, তাই প্রতিটি handler-এর ভেতরে validate আর authorise করুন। বাস্তবে সবচেয়ে সাধারণ WebSocket vulnerability হলো connect-এর সময় একবার auth যাচাই করে আর কখনো না করা।

## Authentication

Handshake-এর সময়েই authenticate করুন, আর connection তৈরি হওয়ার আগেই reject করুন।

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

**Token expiry হলো সূক্ষ্ম সমস্যা।** একটি connection যে token দিয়ে খোলা হয়েছিল, তার চেয়ে বেশিদিন বাঁচতে পারে। 15 মিনিটের একটি JWT যদি ছয় ঘণ্টা socket খোলা রাখে, তাহলে পৌনে ছয় ঘণ্টা unauthenticated access পাওয়া যায়।

সমাধান হলো একটি interval-এ নিয়মিত যাচাই। Session revalidate করুন, আর সেটা ব্যর্থ হলে একটি
`SESSION_EXPIRED` error emit করে `socket.disconnect(true)` call করুন। `disconnect`-এ timer clear করুন, যাতে
সেটা socket-এর চেয়ে বেশিদিন না বাঁচে।

`auth`-এ রাখা token `Origin` সমস্যাও পুরোপুরি এড়িয়ে যায়। Browser নিজে থেকে কিছু পাঠায় না, তাই একটি শত্রুভাবাপন্ন page-এর কাছে replay করার মতো কোনো credential থাকে না।

## Room আর নির্দিষ্ট লক্ষ্যে Broadcast

Room হলো একটি server-এ থাকা socket id-এর একটি set। "Document 42 যারা দেখছে, তাদের সবাই"-এর জন্য এটাই সঠিক abstraction।

`socket.join()` একটি socket-কে একটি room-এ যোগ করে। দুটোতে join করুন: document বা channel-এর জন্য `room:<id>`, আর
একজন user-এর সব device-এর জন্য `user:<id>`। তারপর `io.to(room).emit()` সবার কাছে পৌঁছায়,
`socket.to(room).emit()` sender ছাড়া সবার কাছে পৌঁছায়, আর `io.to(`user:${id}`).emit()`
একজন user-এর সব tab-এ পৌঁছায়।

`user:<id>` room-ই সেই pattern, যেটা মনে রাখতে হবে। মানুষের তিনটে tab আর একটা phone খোলা থাকে। Socket নয়, user-কে address করাই notification-কে সঠিকভাবে আচরণ করায়।

## একাধিক Instance জুড়ে Broadcast

একটি instance শুধু নিজের socket-গুলো ধরে রাখে, অন্যগুলোর কথা কিছুই জানে না। তাই pod 1 থেকে করা broadcast কখনো room-এর সেই অর্ধেকের কাছে পৌঁছায় না, যারা pod 2-তে বসে আছে। Topology কেন এভাবে আচরণ করে আর এর খরচ কী, তা [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues)-এ আছে। Wiring অল্পই:

```typescript
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

// Now this reaches every matching socket on every pod.
io.to(`room:${roomId}`).emit("message", payload);
```

দুটো জিনিস adapter আপনাকে **দেয় না**। Redis Pub/Sub fire-and-forget, তাই durability আসতে হবে আপনার database থেকে। আর HTTP long-polling fallback চালু রাখলে sticky session এখনো লাগবে, কারণ সেই আলাদা request-গুলোকে একই pod-এ পৌঁছাতে হবে।

## Backpressure আর মৃত Connection

**ধীর consumer মানেই memory leak।** Client যত দ্রুত পড়তে পারে, তার চেয়ে দ্রুত emit করলে message আপনার process-এ queue হয়ে জমে।

```typescript
// ws exposes the socket's outbound buffer — drop or disconnect when it grows.
if (ws.bufferedAmount > 1_000_000) {
  ws.close(1013, "Try again later"); // 1013 = Try Again Later
  return;
}
```

High-frequency data-র জন্য **queue না করে coalesce করুন**: প্রতিটি key-এর শুধু সর্বশেষ value রাখুন, আর একটি interval-এ flush করুন। একটি live price feed-এর কাছে বর্তমান দামটাই দরকারি, আপনি যে বারোটা miss করেছেন সেগুলো নয়।

**মৃত connection-এর জন্য heartbeat লাগে।** যে client-এর power চলে যায়, সে কোনো close frame পাঠায় না। ফলে server socket আর তার memory চিরকাল ধরে রাখে। Socket.IO default-ভাবে ping করে (`pingInterval`, `pingTimeout`)। সাধারণ `ws`-এ আপনি নিজে ping frame পাঠান, আর যে socket pong miss করে তাকে বাদ দেন।

সাধারণ `ws`-এ pattern হলো জীবিত socket-এর একটি set। `pong` এলে socket-কে alive হিসেবে চিহ্নিত করুন। প্রতি 30 সেকেন্ডে,
আগের round থেকে যে socket এখনো চিহ্নহীন, তাকে terminate করুন, তারপর আবার ping করুন।

**প্রতি socket-এও rate limit করুন।** একটি connection সেকেন্ডে হাজার হাজার message পাঠাতে পারে। [Chapter ?? — Rate Limiting](#ch-rate-limiting)-এর token bucket আবার ব্যবহার করুন, IP-র বদলে `socket.data.userId`-কে key করে।

## সাধারণ ভুল

❌ **শুধু একবার, connect-এর সময় authorise করা।** যে client বৈধভাবে একটি room-এ join করেছিল, তার access হয়তো এর মধ্যে চলে গেছে।
✅ প্রতিটি handler-এর ভেতরে, প্রতিটি message-এ permission যাচাই করুন।

❌ **একটি pod থেকে broadcast করে কাজ শেষ ধরে নেওয়া।** Development-এ এটা কাজ করে, কারণ সেখানে একটিই pod।
✅ দ্বিতীয় instance আসার আগেই একটি pub/sub adapter যোগ করুন, পরে নয়।

❌ **Socket-কেই delivery guarantee ধরে নেওয়া।** প্রতিটি deploy সব connection ফেলে দেয়।
✅ Database-এ persist করুন, আর client-দের HTTP দিয়ে ফাঁকটুকু recover করতে দিন।

## 🔑 মূল শিক্ষা

- Upgrade প্রতিটি HTTP middleware এড়িয়ে যায়। তাই validation, authorisation, rate limiting আর logging সবই socket-এ আবার তৈরি করতে হয়।
- Handshake-এ authenticate করুন, তারপর নিয়মিত revalidate করুন, কারণ দীর্ঘস্থায়ী connection স্বল্পস্থায়ী token-এর চেয়ে বেশিদিন বাঁচে।
- Room-এর উচিত user-কে address করা, socket-কে নয়, কারণ মানুষ একসাথে কয়েকটা device খোলা রাখে।
- Pub/sub adapter একাধিক instance জুড়ে broadcast সঠিক করে, কিন্তু কোনো durability যোগ করে না। সেটা এখনো database-এর দায়িত্ব।
- যে client তাল মেলাতে পারে না, সে সীমাহীন memory leak। তাই outbound buffer-এর দিকে নজর রাখুন আর high-frequency data coalesce করুন।

## Interview-এর প্রশ্ন

**Q: আপনি কি WebSocket message validate করেন?**

হ্যাঁ, প্রতিটি। Upgrade সব HTTP middleware এড়িয়ে যায়, তাই কেউ payload validate করেনি, rate limit যাচাই করেনি বা action authorise করেনি। Authorisation-ও connection প্রতি নয়, message প্রতি হতে হবে, কারণ যে client বৈধভাবে একটি room-এ join করেছিল, তার access হয়তো এর মধ্যে চলে গেছে। শুধু connect-এর সময় auth হলো ক্লাসিক WebSocket vulnerability।

**Q: একটি socket কীভাবে authenticate করেন, আর কোথায় ভুল হয়?**

Handshake-এর `auth` payload-এ একটি token, যেটা server connection গ্রহণ করার আগে middleware-এ verify হয়। Query string-এ নয়, কারণ সেটা log-এ চলে যায়। দুটো জিনিস ভুল হয়। Connection token-এর চেয়ে বেশিদিন বাঁচে, তাই নিয়মিত revalidation আর disconnect লাগে। আর browser WebSocket-এ CORS প্রয়োগ করে না, তাই যেকোনো origin একটি cookie-authenticated socket খুলতে পারে। Token এটা এড়িয়ে যায়, কারণ browser নিজে থেকে কিছু পাঠায় না।

**Q: দশটি pod জুড়ে প্রতিটি client-এর কাছে একটি broadcast কীভাবে পৌঁছাবেন?**

একটি pub/sub adapter দিয়ে (Socket.IO-র জন্য Redis), যাতে প্রতিটি pod প্রতিটি broadcast পায় আর নিজের socket-গুলোতে পৌঁছে দেয়। Long-polling fallback চালু থাকলে sticky session এখনো লাগবে। Adapter কোনো durability দেয় না, কারণ Redis Pub/Sub fire-and-forget। আর প্রতিটি message প্রতিটি pod-এ ছড়িয়ে যায়, সেই pod-এ প্রাসঙ্গিক socket থাকুক বা না থাকুক। কয়েক ডজন pod-এর কাছাকাছি গিয়ে এটা আর scale করে না।

**Q: কখন আপনি socket server একেবারেই বানাবেন না?**

যখন traffic এক দিকের। SSE আপনার HTTP middleware, auth আর logging রেখে দেয়, আর browser আপনার হয়ে reconnection
সামলায়। যখন "ত্রিশ সেকেন্ডের মধ্যে fresh" হলেই চলে, তখন যেকোনো stateful জিনিসের চেয়ে polling চালানো সস্তা। আর
ছোট team নিয়ে কয়েক দশ হাজার concurrent connection পেরিয়ে গেলে, একটি managed service fan-out sharding আর
deploy draining-কে আপনার মালিকানা থেকে সরিয়ে দেয়।

## এরপর কী পড়বেন

- [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues) — এই feature-এর আদৌ socket লাগে কি না, আর connection topology কীভাবে scale করে
- [Chapter ?? — Frontend-এ Real-Time Feature](#ch-frontend-real-time-features) — client-এর অর্ধেক: reconnection, jitter-সহ backoff, আর miss হওয়া message recover করা
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — যে token bucket এই অধ্যায় প্রতি socket-এ আবার ব্যবহার করে
