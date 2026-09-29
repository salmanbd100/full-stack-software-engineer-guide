---
title: Frontend Real-Time Features
part: 6
chapter: 17
slug: frontend-real-time-features
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-31
tags: [system-design, frontend, realtime, websockets, reconnection]
in_book: true
---

# Frontend Real-Time Features {#ch-frontend-real-time-features}

> Build a client that survives a dropped connection and tells the truth about what it knows.

**In this chapter:** the two browser APIs · reconnection with backoff and jitter · recovering missed messages · rendering live data · what the UI owes the user

## 💡 The Core Idea

The hard part of a real-time feature is not receiving messages. It is what happens when the connection breaks. It will break, on every deploy, in every tunnel, on every train.

A client that only learns about changes through the socket is always one dropped frame away from being wrong. And it does not know it. **Treat the connection as a low-latency hint and HTTP as the source of truth.** A client that can rebuild its state from a REST endpoint tolerates any disconnection.

Which transport to use is a design decision covered in [Chapter ?? — Queues, Async Work and WebSockets](#ch-message-queues). This chapter assumes that call is made and builds the client.

## How It Works

The browser has two APIs, and they do not do the same amount of work for you.

**`WebSocket` — bidirectional, and reconnection is yours to build:**

```typescript
const socket = new WebSocket("wss://api.example.com/chat");

socket.onopen = () => socket.send(JSON.stringify({ type: "join", roomId }));
socket.onmessage = (event: MessageEvent<string>) => {
  const { type, payload } = JSON.parse(event.data) as { type: string; payload: unknown };
  dispatch(type, payload);
};
socket.onclose = (event: CloseEvent) => scheduleReconnect(event.code);
```

**`EventSource` — one-directional, and it reconnects for you:**

```typescript
const source = new EventSource("/api/events"); // sends `Last-Event-ID` on reconnect

source.onmessage = (event: MessageEvent<string>) => {
  apply(JSON.parse(event.data) as FeedEvent);
};
source.onerror = () => {
  // The browser is already retrying. Only close if you want to stop.
};
```

SSE (Server-Sent Events, the protocol behind `EventSource`) needs little on the server. It sends three response headers: `Content-Type: text/event-stream`, `Cache-Control: no-cache` and `Connection: keep-alive`. It then writes events as `id:` and `data:` lines. The browser replays from the `id`, so always send one.

## When to Use It

The transport decision is upstream. What the *client* decides is how much it trusts the stream:

| The UI shows | Client strategy | Why |
| ------------ | --------------- | --- |
| Chat, comments, presence | Optimistic append, reconcile on acknowledgement | Latency is the whole feature; a rollback is cheap |
| Prices, metrics, dashboards | Render last-known value, plus a staleness indicator | A wrong number shown confidently is worse than a stale one labelled |
| Order status, payment state | Never trust the push alone; refetch on receipt | Correctness beats latency; the push is only a cue to reload |
| Collaborative documents | CRDT or server-ordered operations, never last-write-wins | Two offline edits must both survive |

## Reconnection with Backoff and Jitter

Every client must reconnect. Reconnecting *politely* is the part that gets tested.

```typescript
interface ReconnectState {
  attempt: number;
}

function nextDelayMs({ attempt }: ReconnectState): number {
  const base = Math.min(1_000 * 2 ** attempt, 30_000); // exponential, capped at 30 s
  return base * (0.5 + Math.random() * 0.5);           // ✅ jitter: spread the herd
}
```

> ⚠️ **Without jitter every client reconnects on the same schedule.** A pod restart becomes a stampede that flattens the pod that just came up. The randomness is not decoration. It is the difference between a five-second blip and a rolling outage.

Three details that separate a working client from a demo:

- **Cap the delay, not the attempts.** A client that gives up after five tries is broken for anyone who closed their laptop for an hour. Keep retrying at the ceiling.
- **Reset the delay on a *successful* open**, not on the attempt. Otherwise a flapping connection never backs off.
- **Pause while the tab is hidden.** `document.visibilityState` lets you stop retrying for a background tab and reconnect as soon as it returns. That is cheaper and faster than a timer that ran the whole time.

## Recovering Missed Messages

Reconnection restores the transport. It does not restore the messages that arrived while you were gone. Close that gap in the data layer, over HTTP:

```typescript
let lastEventId: string | null = null;

socket.addEventListener("open", async () => {
  // ✅ Fetch what was missed over plain HTTP — durable, paginated, cacheable.
  const res = await fetch(`/api/rooms/${roomId}/events?after=${lastEventId ?? ""}`);
  for (const event of (await res.json()) as FeedEvent[]) apply(event);
});

socket.addEventListener("message", (event: MessageEvent<string>) => {
  const parsed = JSON.parse(event.data) as FeedEvent;
  apply(parsed);
  lastEventId = parsed.id; // only advance after applying
});
```

Two properties make this safe. `apply` must be **idempotent**, because the catch-up fetch and the live stream will overlap and deliver the same event twice. And `lastEventId` moves forward only after the event is applied, so a crash mid-apply replays the event instead of skipping it.

With SSE you get the same mechanism for free: the browser sends `Last-Event-ID` on reconnect and the server resumes from it.

## Rendering Live Data

The connection is a side effect with a lifetime. That is exactly what an effect hook is for.

```typescript
function useLiveFeed(roomId: string): { events: FeedEvent[]; connected: boolean } {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource(`/api/rooms/${roomId}/stream`);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false); // browser retries on its own
    source.onmessage = (event: MessageEvent<string>) => {
      const parsed = JSON.parse(event.data) as FeedEvent;
      setEvents((prev) => [parsed, ...prev].slice(0, 100)); // bound the buffer
    };

    return () => source.close(); // ✅ closed on unmount and on roomId change
  }, [roomId]);

  return { events, connected };
}
```

This hook gets three things right that most do not. It **closes the connection on cleanup**. It **bounds the buffer**, so a busy room cannot grow state without limit. And it **exposes `connected`**, so the UI can say so. Showing connection state is not polish. A dashboard that silently stopped updating misleads the user.

**High-frequency streams need throttling in the client too.** A price feed at 50 messages a second does not need 50 renders a second. Buffer incoming messages and flush them on an animation frame or a fixed interval. The user cannot see the difference, and the main thread stops thrashing.

## Common Mistakes

❌ **Giving up after N reconnect attempts.** The user closes a laptop and comes back to a dead page.
✅ Retry indefinitely at a capped, jittered interval.

❌ **Reconnecting and assuming you are in sync.** You missed everything sent while you were away.
✅ Refetch from the last applied event id, then resume the stream.

❌ **No visible connection state.** A frozen dashboard looks identical to a calm one.
✅ Show connecting, live and stale states explicitly.

❌ **Unbounded client state.** A long-lived tab in a busy room grows until it stalls.
✅ Cap the buffer and evict, in the client as well as the server.

❌ **Leaving the connection open on unmount.** Route changes accumulate sockets silently.
✅ Close it in the effect cleanup, keyed on whatever identifies the stream.

## 🔑 Key Takeaways

- The connection carries latency; HTTP carries truth, so every client must be able to rebuild its state from a REST endpoint.
- Reconnection needs exponential backoff with jitter and no attempt ceiling, reset only on a successful open.
- Catching up means refetching from the last applied event id, and it only works if applying an event is idempotent.
- Connection state belongs in the UI — a stale view that looks live is worse than an obviously broken one.
- Bound both the render rate and the client buffer; a long-lived tab is a memory leak waiting for a busy room.

## Interview Questions

**Q: A client reconnects after 30 seconds offline. How does it catch up?**

Not through the socket. The client tracks the last event id it applied, and on reconnect it calls a REST endpoint for everything after that id, then resumes live events. Applying has to be idempotent because the catch-up and the live stream overlap. The socket only makes things faster. Clients that rely on the transport to deliver every message end up silently out of sync.

**Q: Why does reconnection need jitter?**

Because every client reconnects at once otherwise. A pod restart drops thousands of connections at the same moment. If they all use the same backoff curve, they return in waves and flatten the replacement pod. A random delay per client spreads the return over the window. A possible rolling outage becomes a brief blip.

**Q: What does the UI owe the user when the connection drops?**

An honest state. Show three states (connecting, live and stale) and a timestamp on anything numeric. The failure I care about is a dashboard that stopped receiving updates twenty minutes ago and still shows confident numbers. Someone will make a decision on them. Showing "last updated 20 minutes ago" costs nothing and prevents that.

**Q: How do you keep a live feed from degrading the page?**

Two limits. Throttle rendering: buffer messages and flush on an interval or animation frame, since nobody sees fifty updates a second. And bound the client buffer by evicting old events. Otherwise a tab left open on a busy room grows until it stalls. Both look fine in a demo and fail after an hour of real traffic.

**Q: When would you not use a socket in the client at all?**

When the client only listens. `EventSource` gives me automatic reconnection and `Last-Event-ID` replay for free. It runs over plain HTTP that every proxy already handles. That is a lot of code I do not have to write or test. I would only take on a raw `WebSocket` when the client genuinely needs to send frequent messages.

## What to Read Next

- [Chapter ?? — Queues, Async Work and WebSockets](#ch-message-queues) — choosing the transport, and what holding those connections costs
- [Chapter ?? — Real-Time and Streaming APIs](#ch-realtime-streaming) — the server the client is talking to: authentication, rooms, backpressure
