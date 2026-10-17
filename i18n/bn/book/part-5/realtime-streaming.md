---
sourceHash: "e787c5b9387ebbbcfb6d0bfc29a1a2e0b1604112ef85bcc0426d378906d0feae"
title: "Real-Time ও Streaming API"
translatedAt: "2026-10-17T14:06:13.449Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Real-Time ও Streaming API {#ch-realtime-streaming}

> ঠিক transport দিয়ে client-এর কাছে push করুন, আর HTTP middleware আগে যে নিশ্চয়তাগুলো দিত, সেগুলো socket-এর ওপর
> আবার গড়ে তুলুন।

**এই অধ্যায়ে:** SSE আর HTTP streaming · upgrade কী কী এড়িয়ে যায় · typed, validated socket server · handshake-এ auth আর পুনর্যাচাই · একাধিক instance জুড়ে broadcast · backpressure

## 💡 মূল ধারণা

WebSocket হলো খোলা থাকা একটি TCP connection, যা দুই দিকেই message বয়ে নেয়, প্রতিটি message-এ framing মাত্র মোটামুটি দুই byte। Server আগে কথা বলতে পারে, যা HTTP-তে একেবারেই সম্ভব নয়।

দামটা হলো, stateless ছেড়ে stateful হওয়া: server এখন প্রতিটি client-এর state ধরে রাখে। প্রতিটি connection একজন client-কে একটি process-এ আটকে দেয়, ফলে load balancing, deploy আর scaling, সবই কঠিন হয়ে যায়।

এই অধ্যায় **server-এর দিক** নিয়ে: কীভাবে ঠিকভাবে বানাবেন। তার আগের প্রশ্নটা design-এর সিদ্ধান্ত। এই feature-এর কি আদৌ socket লাগে, নাকি SSE বা polling-এই চলে? সেটা আছে [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues)-এ। Protocol এখনো ঠিক না হলে আগে সেটা পড়ুন।

## কীভাবে কাজ করে

WebSocket-এর জীবন শুরু হয় একটি HTTP request দিয়ে, যা protocol বদলাতে চায়।

```http
GET /ws HTTP/1.1
Host: api.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13
Origin: https://app.example.com
```

`101`-এর পরে connection আর HTTP-তে কথা বলে না। এর দুটি ফল বারবার সামনে আসে:

- **Cookie handshake-এর সঙ্গে যায়**, অথচ browser WebSocket-এ CORS প্রয়োগ **করে না**। কোনো ক্ষতিকর page user-এর cookie নিয়ে আপনার server-এ socket খুলতে পারে, তাই server-কে নিজেই `Origin` যাচাই করতে হবে।
- **Middleware চলে না।** আপনার Express-এর auth, rate limiter, validator আর logger বসে আছে HTTP-র পথে। Upgrade হওয়া socket এর সবটাই এড়িয়ে যায়, তাই প্রতিটি দায়িত্ব socket-এর স্তরে নতুন করে গড়তে হয়।

সবসময় `wss://` ব্যবহার করুন। মাঝপথের proxy সাধারণ `ws://` ভেঙে দেয়, আর পথে থাকা যে কেউ সেটা পড়তে পারে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Socket server বানাবেন? |
| --------- | ---------------------- |
| Client ঘন ঘন message পাঠায় — chat, cursor, gameplay | **হ্যাঁ** |
| Server push করে, client শুধু শোনে | না — SSE সাধারণ HTTP, আর চালাতে খরচ অনেক কম |
| "মোটামুটি 30 সেকেন্ডের মধ্যে নতুন" হলেই চলে | না — poll করুন |
| হাজার হাজার concurrent connection, অথচ team ছোট | কিনে নেওয়ার কথা ভাবুন — Ably, Pusher, AWS API Gateway WebSockets |

## Server-Sent Events আর HTTP Streaming

Socket-এর দিকে হাত বাড়ানোর আগে দেখুন, এক দিকের যোগাযোগেই চলে কি না। **SSE** হলো `text/event-stream`-এর একটি দীর্ঘজীবী
HTTP response, আর browser-এর `EventSource` আপনার হয়ে reconnection আর last-event-id থেকে replay সামলায়। এটা সাধারণ
HTTP, তাই আপনার auth middleware, rate limiter আর logging সবই খাটে। WebSocket-এর তুলনায় চালানোর দিক থেকে এটাই এর সবচেয়ে
বড় সুবিধা।

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

দুটি ফাঁদ আছে। HTTP/1.1-এ browser প্রতি origin-এ ছয়টি connection দেয়, আর একটি SSE stream সারা জীবন একটি ধরে রাখে।
HTTP/2-এ এই সীমা নেই। আর যেকোনো buffer করা proxy আপনার event আটকে রাখে, যতক্ষণ না তার buffer ভরে। তাই `no-transform`
আর নিয়মিত comment ping ঐচ্ছিক নয়।

**Token ধরে ধরে response stream করা**, যে আকার AI feature-এর দরকার, একই কৌশল, শুধু contract আরও সহজ। Response খোলা
রাখুন, আর server যেমন যেমন chunk বানায়, লিখে দিন। Client-এর typed event আর resumability লাগলে SSE বেছে নিন। শুধু
text লাগলে সাধারণ chunked response। ওই stream-এর client আর product-এর দিক হলো first-token-এর লক্ষ্য, cancellation, আর
connection মরে গেলেও আংশিক উত্তর রেখে দেওয়া। দেখুন
[Chapter ?? — Streaming Response](#ch-streaming-responses)।

## Typed Server

Socket.IO সাধারণ `ws`-এর চেয়ে বেশি দেয়: reconnection, room, acknowledgement আর polling fallback। Event-গুলোর type দিন, নইলে boundary-তে প্রতিটি নিশ্চয়তা হারাবেন।

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

> ⚠️ **WebSocket message অবিশ্বস্ত input, ঠিক HTTP body-র মতো।** এটা আপনার validation middleware এড়িয়ে এসেছে, তাই প্রতিটি handler-এর ভেতরে validate আর authorise করুন। বাস্তবে WebSocket-এর সবচেয়ে চেনা দুর্বলতা হলো, auth যাচাই হয় connect-এর সময় একবার, তারপর আর কখনো নয়।

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

**Token-এর মেয়াদ শেষ হওয়াই সূক্ষ্ম সমস্যা।** Connection যে token দিয়ে খোলা হয়েছিল, তার চেয়ে বেশি দিন বাঁচতে পারে। 15 মিনিটের একটি JWT যদি ছয় ঘণ্টা ধরে socket খোলা রাখে, তাহলে পৌনে ছয় ঘণ্টা unauthenticated access থাকে।

সমাধান হলো নির্দিষ্ট বিরতিতে যাচাই। Session আবার যাচাই করুন, আর ব্যর্থ হলে একটি `SESSION_EXPIRED` error emit করে
`socket.disconnect(true)` call করুন। `disconnect`-এ timer মুছে দিন, যাতে সেটা socket-এর চেয়ে বেশি দিন না বাঁচে।

`auth`-এ token রাখলে `Origin`-এর সমস্যাও পুরোপুরি এড়ানো যায়। Browser নিজে থেকে কিছুই পাঠায় না, তাই শত্রুভাবাপন্ন page-এর হাতে replay করার মতো কোনো credential থাকে না।

## Room আর লক্ষ্য করে Broadcast

Room হলো একটি server-এর কিছু socket id-র set। "Document 42 যারা দেখছেন, সবাই", এর জন্য এটাই ঠিক abstraction।

`socket.join()` একটি socket-কে room-এ যোগ করে। দুটিতে join করান: document বা channel-এর জন্য `room:<id>`, আর একজন
user-এর সব device-এর জন্য `user:<id>`। তারপর `io.to(room).emit()` পৌঁছায় সবার কাছে,
`socket.to(room).emit()` পৌঁছায় পাঠানো জন ছাড়া সবার কাছে, আর `io.to(`user:${id}`).emit()`
পৌঁছায় একজন user-এর সব tab-এ।

মনে রাখার মতো pattern হলো `user:<id>` room। মানুষের তিনটি tab আর একটি phone খোলা থাকে। Socket নয়, user-কে লক্ষ্য করলেই notification ঠিকঠাক আচরণ করে।

## একাধিক Instance জুড়ে Broadcast

একটি instance শুধু নিজের socket-গুলো ধরে রাখে, বাকিদের সম্পর্কে কিছুই জানে না। তাই pod 1 থেকে broadcast করলে room-এর যে অর্ধেক pod 2-তে বসে আছে, তাদের কাছে কখনো পৌঁছায় না। Topology কেন এভাবে আচরণ করে, আর তার খরচ কী, তা আছে [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues)-এ। জোড়া লাগানোর কাজটুকু ছোট:

```typescript
const pubClient = createClient({ url: process.env.REDIS_URL });
const subClient = pubClient.duplicate();
await Promise.all([pubClient.connect(), subClient.connect()]);
io.adapter(createAdapter(pubClient, subClient));

// Now this reaches every matching socket on every pod.
io.to(`room:${roomId}`).emit("message", payload);
```

দুটি জিনিস adapter আপনাকে **দেয় না**। Redis Pub/Sub ছুড়ে দিয়ে ভুলে যায়, তাই durability আসতে হবে আপনার database থেকে। আর HTTP long-polling fallback চালু রাখলে sticky session এখনো লাগে, কারণ সেই আলাদা আলাদা request-গুলোকে একই pod-এ পৌঁছাতে হয়।

## Backpressure আর মরা Connection

**ধীর consumer মানে memory leak।** Client যত দ্রুত পড়তে পারে, তার চেয়ে দ্রুত emit করলে message জমতে থাকে আপনার process-এ।

```typescript
// ws exposes the socket's outbound buffer — drop or disconnect when it grows.
if (ws.bufferedAmount > 1_000_000) {
  ws.close(1013, "Try again later"); // 1013 = Try Again Later
  return;
}
```

ঘন ঘন আসা data-র জন্য **queue না করে একত্র করুন**: প্রতিটি key-এর শুধু সর্বশেষ value রাখুন, আর নির্দিষ্ট বিরতিতে পাঠিয়ে দিন। Live price feed-এর দরকার বর্তমান দাম, ফসকে যাওয়া বারোটি দাম নয়।

**মরা connection ধরতে heartbeat লাগে।** বিদ্যুৎ চলে গেলে client কোনো close frame পাঠায় না, তাই server socket আর তার memory চিরকাল ধরে রাখে। Socket.IO default হিসেবে ping করে (`pingInterval`, `pingTimeout`)। সাধারণ `ws`-এ আপনি নিজে ping frame পাঠান, আর যে socket pong দেয় না, তাকে বাদ দেন।

সাধারণ `ws`-এ pattern হলো জীবিত socket-গুলোর একটি set। `pong` এলে socket-কে জীবিত চিহ্নিত করুন। প্রতি 30 সেকেন্ডে,
আগের দফা থেকে যে socket এখনো চিহ্নহীন, তাকে terminate করুন, তারপর আবার ping করুন।

**Socket-প্রতিও rate limit দিন।** একটি connection সেকেন্ডে হাজার হাজার message পাঠাতে পারে। [Chapter ?? — Rate Limiting](#ch-rate-limiting)-এর token bucket আবার ব্যবহার করুন, তবে IP নয়, `socket.data.userId`-এর ওপর key করে।

## সাধারণ ভুল

❌ **শুধু একবার, connect-এর সময় authorise করা।** যে client বৈধভাবে room-এ ঢুকেছিল, তার access হয়তো এর মধ্যে চলে গেছে।
✅ প্রতিটি handler-এর ভেতরে, প্রতিটি message-এ permission যাচাই করুন।

❌ **এক pod থেকে broadcast করে কাজ শেষ ভাবা।** Development-এ চলে, কারণ সেখানে pod একটিই।
✅ দ্বিতীয় instance আসার আগেই pub/sub adapter যোগ করুন, পরে নয়।

❌ **Socket-কেই delivery-র নিশ্চয়তা ধরে নেওয়া।** প্রতিটি deploy সব connection ফেলে দেয়।
✅ Database-এ persist করুন, আর ফাঁকটুকু client-কে HTTP দিয়ে পুষিয়ে নিতে দিন।

## 🔑 মূল শিক্ষা

- Upgrade HTTP middleware-এর প্রতিটি অংশ এড়িয়ে যায়, তাই validation, authorisation, rate limiting আর logging, সবই socket-এর ওপর নতুন করে গড়তে হয়।
- Handshake-এ authenticate করুন, তারপর নিয়মিত পুনর্যাচাই করুন, কারণ দীর্ঘজীবী connection স্বল্পায়ু token-এর চেয়ে বেশি দিন বাঁচে।
- Room-এর লক্ষ্য হওয়া উচিত user, socket নয়, কারণ মানুষ একসঙ্গে কয়েকটি device খোলা রাখেন।
- Pub/sub adapter একাধিক instance জুড়ে broadcast ঠিক করে, কিন্তু কোনো durability যোগ করে না। সেটা এখনো database-এর দায়িত্ব।
- তাল রাখতে না পারা client মানে সীমাহীন memory leak। তাই outbound buffer-এর ওপর নজর রাখুন, আর ঘন ঘন আসা data একত্র করুন।

## Interview-এর প্রশ্ন

**Q: WebSocket message কি validate করেন?**

হ্যাঁ, প্রতিটি। Upgrade সব HTTP middleware এড়িয়ে যায়, তাই payload কেউ validate করেনি, rate limit কেউ যাচাই করেনি, action-ও কেউ authorise করেনি। Authorisation-ও হতে হবে connection-প্রতি নয়, message-প্রতি, কারণ যে client বৈধভাবে room-এ ঢুকেছিল, তার access হয়তো এর মধ্যে চলে গেছে। শুধু connect-এর সময় auth হলো WebSocket-এর ক্লাসিক দুর্বলতা।

**Q: Socket কীভাবে authenticate করবেন, আর কী কী ভুল হতে পারে?**

Handshake-এর `auth` payload-এ একটি token, যা server connection নেওয়ার আগেই middleware-এ যাচাই হয়। Query string-এ নয়, কারণ সেটা log-এ চলে যায়। দুটি জিনিস ভুল হয়। Connection token-এর চেয়ে বেশি দিন বাঁচে, তাই নিয়মিত পুনর্যাচাই আর disconnect লাগে। আর browser WebSocket-এ CORS প্রয়োগ করে না, তাই যেকোনো origin cookie দিয়ে authenticated socket খুলতে পারে। Token থাকলে সেটা এড়ানো যায়, কারণ browser নিজে থেকে কিছুই পাঠায় না।

**Q: দশটি pod জুড়ে প্রতিটি client-এর কাছে broadcast কীভাবে পৌঁছাবেন?**

একটি pub/sub adapter দিয়ে (Socket.IO-র জন্য Redis), যাতে প্রতিটি pod প্রতিটি broadcast পায়, আর নিজের socket-গুলোতে পৌঁছে দেয়। Long-polling fallback চালু থাকলে sticky session এখনো লাগে। Adapter কোনো durability দেয় না, কারণ Redis Pub/Sub ছুড়ে দিয়ে ভুলে যায়। আর প্রতিটি message প্রতিটি pod-এ ছড়িয়ে পড়ে, সেই pod-এ প্রাসঙ্গিক socket থাকুক বা না থাকুক। কয়েক ডজন pod-এর কাছাকাছি গিয়ে এটা আর scale করে না।

**Q: কখন socket server একেবারেই বানাবেন না?**

যখন traffic এক দিকের। SSE আপনার HTTP middleware, auth আর logging রেখে দেয়, আর browser নিজেই reconnection সামলায়। যখন
"ত্রিশ সেকেন্ডের মধ্যে নতুন" হলেই চলে, তখন stateful যেকোনো কিছুর চেয়ে polling চালানো সস্তা। আর ছোট team-এ কয়েক
হাজার concurrent connection ছাড়িয়ে গেলে managed service নিলে fan-out sharding আর deploy-এর সময় connection খালি করার
দায়িত্ব আর আপনার থাকে না।

## এরপর কী পড়বেন

- [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues) — এই feature-এর আদৌ socket লাগে কি না, আর connection topology কীভাবে scale করে
- [Chapter ?? — Frontend-এ Real-Time Feature](#ch-frontend-real-time-features) — client-এর দিক: reconnection, jitter-সহ backoff, আর ফসকে যাওয়া message ফিরে পাওয়া
- [Chapter ?? — Rate Limiting](#ch-rate-limiting) — এই অধ্যায় socket-প্রতি যে token bucket আবার ব্যবহার করে
