---
title: Frontend Real-Time Features
part: 6
chapter: 0
slug: real-time
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

The hard part of a real-time feature is not receiving messages. It is what happens when the connection breaks — because it will, on every deploy, every tunnel, every train.

A client that only learns about changes through the socket is permanently one dropped frame away from being wrong, and it does not know it. **Treat the connection as a low-latency hint and HTTP as the source of truth.** A client that can rebuild its state from a REST endpoint tolerates any disconnection.

Which transport to use is a design decision covered in [Chapter ?? — Real-Time Communication](#ch-realtime-communication). This chapter assumes that call is made and builds the client.

## How It Works

Two browser APIs, and they are not symmetrical in how much they do for you.

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

The server side of SSE is three response headers — `Content-Type: text/event-stream`, `Cache-Control: no-cache`, `Connection: keep-alive` — and events written as `id:` and `data:` lines. The `id` is what the browser replays from, so emit one.

## When to Use It

The transport decision is upstream. What the *client* decides is how much it trusts the stream:

| The UI shows | Client strategy | Why |
| ------------ | --------------- | --- |
| Chat, comments, presence | Optimistic append, reconcile on acknowledgement | Latency is the whole feature; a rollback is cheap |
| Prices, metrics, dashboards | Render last-known value, plus a staleness indicator | A wrong number shown confidently is worse than a stale one labelled |
| Order status, payment state | Never trust the push alone; refetch on receipt | Correctness beats latency; the push is only a cue to reload |
| Collaborative documents | CRDT or server-ordered operations, never last-write-wins | Two offline edits must both survive |

## Reconnection with Backoff and Jitter

Reconnecting is table stakes. Reconnecting *politely* is the part that gets tested.

```typescript
interface ReconnectState {
  attempt: number;
}

function nextDelayMs({ attempt }: ReconnectState): number {
  const base = Math.min(1_000 * 2 ** attempt, 30_000); // exponential, capped at 30 s
  return base * (0.5 + Math.random() * 0.5);           // ✅ jitter: spread the herd
}
```

> ⚠️ **Without jitter every client reconnects on the same schedule.** A pod restart becomes a synchronised stampede that flattens the pod that just came up. The randomisation is not decoration — it is the difference between a five-second blip and a rolling outage.

Three details that separate a working client from a demo:

- **Cap the delay, not the attempts.** A client that gives up after five tries is broken for anyone who closed their laptop for an hour. Keep retrying at the ceiling.
- **Reset the delay on a *successful* open**, not on the attempt. Otherwise a flapping connection never backs off.
- **Pause while the tab is hidden.** `document.visibilityState` lets you stop retrying for a background tab and reconnect immediately when it returns, which is both cheaper and faster than a timer that ran the whole time.

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

Two properties make this safe. `apply` must be **idempotent**, because the catch-up fetch and the live stream will overlap and deliver the same event twice. And `lastEventId` advances only after the event is applied, so a crash mid-apply replays rather than skips.

With SSE you get the same mechanism for free: the browser sends `Last-Event-ID` on reconnect and the server resumes from it.

## Rendering Live Data

The connection is a side effect with a lifetime, which is exactly what an effect hook is for.

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

Three things this hook gets right and most do not: it **closes the connection on cleanup**, it **bounds the buffer** so a busy room cannot grow state without limit, and it **exposes `connected`** so the UI can say so. Surfacing connection state is not polish — a dashboard that silently stopped updating is actively misleading.

**High-frequency streams need throttling in the client too.** A price feed at 50 messages a second does not need 50 renders a second. Buffer incoming messages and flush on an animation frame or a fixed interval; the user cannot perceive the difference and the main thread stops thrashing.

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

Not through the socket. The client tracks the last event id it applied, and on reconnect it calls a REST endpoint for everything after that id, then resumes live events. Applying has to be idempotent because the catch-up and the live stream overlap. The socket is a latency optimisation; relying on the transport for delivery guarantees is how clients end up silently out of sync.

**Q: Why does reconnection need jitter?**

Because every client reconnects at once otherwise. A pod restart drops thousands of connections simultaneously, and if they all use the same backoff curve they return in synchronised waves and flatten the replacement pod. Randomising each delay spreads the return over the window and turns a potential rolling outage into a brief blip.

**Q: What does the UI owe the user when the connection drops?**

An honest state. Three visible states — connecting, live, stale — and a timestamp on anything numeric. The failure mode I care about is a dashboard that stopped receiving updates twenty minutes ago and still renders confident numbers, because someone will make a decision on them. Showing "last updated 20 minutes ago" costs nothing and prevents that.

**Q: How do you keep a live feed from degrading the page?**

Two limits. Throttle rendering — buffer messages and flush on an interval or animation frame, since nobody perceives fifty updates a second. And bound the client buffer, evicting old events, because a tab left open on a busy room otherwise grows until it stalls. Both are things that look fine in a demo and fail after an hour of real traffic.

**Q: When would you not use a socket in the client at all?**

When the client only listens. `EventSource` gives me automatic reconnection and `Last-Event-ID` replay for free, over plain HTTP that every proxy already handles — that is a large amount of code I do not have to write or test. I would only take on a raw `WebSocket` when the client genuinely needs to send frequent messages.

## What to Read Next

- [Chapter ?? — Real-Time Communication](#ch-realtime-communication) — choosing the transport, and what holding those connections costs
- [Chapter ?? — WebSockets](#ch-websockets) — the server the client is talking to: authentication, rooms, backpressure
- [Chapter ?? — Design a Chat System](#ch-design-chat-system) — the same client concerns inside a full design answer
