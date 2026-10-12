---
sourceHash: "1d842b4810837758bfbf78468d6021ae44449d1bcd31db7487ab26ed12d33a0e"
title: "Frontend-এ Real-Time Feature"
translatedAt: "2026-10-12T12:26:38.138Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Frontend-এ Real-Time Feature {#ch-frontend-real-time-features}

> এমন একটি client তৈরি করুন, যেটা connection কেটে গেলেও টিকে থাকে, আর সে কী জানে সে সম্পর্কে সত্য বলে।

**এই অধ্যায়ে:** browser-এর দুটো API · backoff আর jitter-সহ reconnection · হারানো message ফিরে পাওয়া · live data render করা · user-এর জন্য UI-কে কী করতেই হবে

## 💡 মূল ধারণা

একটি real-time feature-এর কঠিন অংশ message পাওয়া নয়। কঠিন অংশ হলো connection ভাঙলে কী হয়। এটা ভাঙবেই — প্রতিটি deploy-এ, প্রতিটি tunnel-এ, প্রতিটি train-এ।

যে client শুধু socket দিয়েই পরিবর্তনের খবর পায়, সে সবসময় একটি হারানো frame দূরে দাঁড়িয়ে আছে ভুল হওয়া থেকে। আর সে সেটা জানেও না। **Connection-কে একটি low-latency ইঙ্গিত হিসেবে দেখুন, আর HTTP-কে source of truth হিসেবে।** যে client একটি REST endpoint থেকে তার state আবার গড়ে তুলতে পারে, সে যেকোনো disconnection সহ্য করে।

কোন transport ব্যবহার করবেন, সেটা একটি design সিদ্ধান্ত, যা [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues)-এ আছে। এই অধ্যায় ধরে নেয় সেই সিদ্ধান্ত নেওয়া হয়ে গেছে, আর client-টি তৈরি করে।

## কীভাবে কাজ করে

Browser-এ দুটো API আছে, আর এরা আপনার হয়ে সমান পরিমাণ কাজ করে না।

**`WebSocket` — bidirectional, আর reconnection আপনাকেই বানাতে হবে:**

```typescript
const socket = new WebSocket("wss://api.example.com/chat");

socket.onopen = () => socket.send(JSON.stringify({ type: "join", roomId }));
socket.onmessage = (event: MessageEvent<string>) => {
  const { type, payload } = JSON.parse(event.data) as { type: string; payload: unknown };
  dispatch(type, payload);
};
socket.onclose = (event: CloseEvent) => scheduleReconnect(event.code);
```

**`EventSource` — একমুখী, আর এটা নিজেই reconnect করে:**

```typescript
const source = new EventSource("/api/events"); // sends `Last-Event-ID` on reconnect

source.onmessage = (event: MessageEvent<string>) => {
  apply(JSON.parse(event.data) as FeedEvent);
};
source.onerror = () => {
  // The browser is already retrying. Only close if you want to stop.
};
```

SSE (Server-Sent Events, `EventSource`-এর পেছনের protocol) server-এ সামান্যই চায়। এটা তিনটি response header পাঠায়: `Content-Type: text/event-stream`, `Cache-Control: no-cache` আর `Connection: keep-alive`। তারপর event লেখে `id:` আর `data:` line হিসেবে। Browser `id` থেকে আবার replay করে, তাই সবসময় একটি পাঠান।

## কখন ব্যবহার করবেন

Transport-এর সিদ্ধান্ত আগের ধাপের। *Client* যা ঠিক করে, তা হলো stream-কে সে কতটা বিশ্বাস করে:

| UI যা দেখায় | Client strategy | কেন |
| ------------ | --------------- | --- |
| Chat, comment, presence | Optimistic append, acknowledgement এলে reconcile | Latency-ই পুরো feature; rollback সস্তা |
| দাম, metric, dashboard | শেষ জানা value render করুন, সাথে একটি staleness indicator | আত্মবিশ্বাসের সাথে দেখানো ভুল সংখ্যা, label করা stale সংখ্যার চেয়ে খারাপ |
| Order status, payment state | শুধু push-এর ওপর কখনো ভরসা নয়; পেলেই refetch | Correctness latency-কে হারায়; push শুধু reload করার একটি সংকেত |
| Collaborative document | CRDT বা server-ordered operation, কখনো last-write-wins নয় | দুটো offline edit-কেই টিকে থাকতে হবে |

## Backoff আর jitter-সহ reconnection

প্রতিটি client-কে reconnect করতেই হবে। *ভদ্রভাবে* reconnect করা — এই অংশটাই যাচাই করা হয়।

```typescript
interface ReconnectState {
  attempt: number;
}

function nextDelayMs({ attempt }: ReconnectState): number {
  const base = Math.min(1_000 * 2 ** attempt, 30_000); // exponential, capped at 30 s
  return base * (0.5 + Math.random() * 0.5);           // ✅ jitter: spread the herd
}
```

> ⚠️ **Jitter ছাড়া প্রতিটি client একই schedule-এ reconnect করে।** একটি pod restart তখন একটি হুড়োহুড়িতে পরিণত হয়, যেটা সদ্য চালু হওয়া pod-টিকে মাটিতে ফেলে দেয়। Randomness সাজসজ্জা নয়। পাঁচ সেকেন্ডের একটি ঝাঁকুনি আর একটি গড়িয়ে চলা outage-এর পার্থক্য এটাই।

তিনটি খুঁটিনাটি, যেগুলো একটি কাজের client-কে একটি demo থেকে আলাদা করে:

- **Delay-এর সীমা দিন, attempt-এর নয়।** পাঁচবার চেষ্টার পর হাল ছেড়ে দেওয়া client তাদের জন্য ভাঙা, যারা এক ঘণ্টার জন্য laptop বন্ধ রেখেছিল। সীমায় পৌঁছে retry চালিয়ে যান।
- **Delay reset করুন একটি *সফল* open-এ**, attempt-এ নয়। নাহলে বারবার ওঠানামা করা connection কখনো back off করে না।
- **Tab লুকানো থাকলে থামুন।** `document.visibilityState` দিয়ে background tab-এর জন্য retry বন্ধ রাখা যায়, আর tab ফিরে এলেই reconnect করা যায়। পুরো সময় চলা একটি timer-এর চেয়ে এটা সস্তা আর দ্রুত।

## হারানো message ফিরে পাওয়া

Reconnection transport ফিরিয়ে আনে। আপনি না থাকার সময় যে message এসেছিল, সেগুলো ফেরায় না। সেই ফাঁক বন্ধ করুন data layer-এ, HTTP দিয়ে:

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

দুটো বৈশিষ্ট্য এটাকে নিরাপদ করে। `apply`-কে হতে হবে **idempotent**, কারণ catch-up fetch আর live stream একে অপরের ওপর পড়বে আর একই event দুবার deliver করবে। আর `lastEventId` সামনে এগোয় শুধু event apply হওয়ার পরে, তাই apply-এর মাঝপথে crash হলে event-টি বাদ না পড়ে আবার replay হয়।

SSE-তে একই mechanism বিনা খরচে পান: browser reconnect-এর সময় `Last-Event-ID` পাঠায়, আর server সেখান থেকে আবার শুরু করে।

## Live data render করা

Connection হলো একটি side effect, যার একটি আয়ু আছে। Effect hook ঠিক এর জন্যই।

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

এই hook তিনটি জিনিস ঠিকভাবে করে, যা বেশিরভাগ hook করে না। এটা **cleanup-এ connection বন্ধ করে**। এটা **buffer-এর সীমা বাঁধে**, তাই একটি ব্যস্ত room সীমাহীনভাবে state বাড়াতে পারে না। আর এটা **`connected` expose করে**, যাতে UI সেটা বলতে পারে। Connection state দেখানো শুধু ঘষামাজা নয়। যে dashboard চুপচাপ update হওয়া বন্ধ করে দিয়েছে, সেটা user-কে বিভ্রান্ত করে।

**High-frequency stream-এর জন্য client-এও throttling লাগে।** সেকেন্ডে 50টি message-এর একটি price feed-এর সেকেন্ডে 50টি render লাগে না। আসা message buffer করুন, আর একটি animation frame-এ বা নির্দিষ্ট interval-এ flush করুন। User পার্থক্য দেখতে পায় না, আর main thread-এর হাঁসফাঁস বন্ধ হয়।

## সাধারণ ভুল

❌ **N-বার reconnect চেষ্টার পর হাল ছেড়ে দেওয়া।** User laptop বন্ধ করে ফিরে এসে একটি মৃত page পান।
✅ একটি সীমাবদ্ধ, jitter-যুক্ত interval-এ অনির্দিষ্টকাল retry করুন।

❌ **Reconnect করে ধরে নেওয়া যে আপনি sync-এ আছেন।** আপনি দূরে থাকার সময় যা পাঠানো হয়েছে, সবই হারিয়েছেন।
✅ শেষ apply করা event id থেকে refetch করুন, তারপর stream আবার শুরু করুন।

❌ **কোনো দৃশ্যমান connection state নেই।** একটি জমে যাওয়া dashboard দেখতে একটি শান্ত dashboard-এর মতোই।
✅ Connecting, live আর stale state স্পষ্টভাবে দেখান।

❌ **সীমাহীন client state।** ব্যস্ত room-এ খোলা একটি দীর্ঘজীবী tab বাড়তে বাড়তে আটকে যায়।
✅ Buffer-এর সীমা দিন আর পুরোনো জিনিস evict করুন, server-এর মতো client-এও।

❌ **Unmount-এর সময় connection খোলা রেখে দেওয়া।** Route বদলের সাথে সাথে চুপচাপ socket জমতে থাকে।
✅ Effect cleanup-এ এটা বন্ধ করুন, stream-কে যা চিহ্নিত করে তার ওপর key করে।

## 🔑 মূল শিক্ষা

- Connection বহন করে latency; HTTP বহন করে সত্য, তাই প্রতিটি client-কে একটি REST endpoint থেকে তার state আবার গড়ে তুলতে পারতে হবে।
- Reconnection-এর জন্য লাগে jitter-সহ exponential backoff, attempt-এর কোনো সীমা ছাড়া, আর reset শুধু একটি সফল open-এ।
- Catch up মানে শেষ apply করা event id থেকে refetch করা, আর এটা কাজ করে শুধু তখন, যখন একটি event apply করা idempotent।
- Connection state-এর জায়গা UI-তে — live দেখতে একটি stale view, স্পষ্টভাবে ভাঙা view-এর চেয়ে খারাপ।
- Render rate আর client buffer দুটোরই সীমা দিন; একটি দীর্ঘজীবী tab হলো ব্যস্ত room-এর অপেক্ষায় থাকা একটি memory leak।

## Interview-এর প্রশ্ন

**Q: একটি client 30 সেকেন্ড offline থাকার পর reconnect করে। সে কীভাবে catch up করে?**

Socket দিয়ে নয়। Client শেষ যে event id apply করেছে সেটা মনে রাখে, আর reconnect-এর সময় একটি REST endpoint-কে সেই id-র পরের সবকিছুর জন্য call করে, তারপর live event আবার শুরু করে। Apply করাকে idempotent হতে হয়, কারণ catch-up আর live stream একে অপরের ওপর পড়ে। Socket শুধু জিনিসগুলো দ্রুত করে। যে client প্রতিটি message deliver করার জন্য transport-এর ওপর নির্ভর করে, সে শেষে চুপচাপ out of sync হয়ে যায়।

**Q: Reconnection-এ jitter কেন লাগে?**

কারণ নাহলে প্রতিটি client একসাথে reconnect করে। একটি pod restart একই মুহূর্তে হাজার হাজার connection ফেলে দেয়। সবাই একই backoff curve ব্যবহার করলে তারা ঢেউয়ে ঢেউয়ে ফেরে আর বদলি pod-টিকে মাটিতে ফেলে দেয়। প্রতিটি client-এর জন্য একটি random delay ফেরাটাকে window জুড়ে ছড়িয়ে দেয়। সম্ভাব্য একটি গড়িয়ে চলা outage হয়ে যায় একটি ক্ষণিকের ঝাঁকুনি।

**Q: Connection কেটে গেলে user-এর জন্য UI-কে কী করতেই হবে?**

একটি সৎ state। তিনটি state দেখান (connecting, live আর stale), আর সংখ্যাসূচক যেকোনো কিছুর পাশে একটি timestamp। আমি যে failure নিয়ে চিন্তা করি, সেটা হলো এমন একটি dashboard, যেটা বিশ মিনিট আগে update পাওয়া বন্ধ করেছে আর এখনো আত্মবিশ্বাসী সংখ্যা দেখাচ্ছে। কেউ সেগুলোর ওপর ভিত্তি করে সিদ্ধান্ত নেবে। "শেষ update 20 মিনিট আগে" দেখাতে কোনো খরচ নেই, আর এটা সেটা ঠেকায়।

**Q: একটি live feed-কে page-এর মান নামিয়ে দেওয়া থেকে কীভাবে আটকাবেন?**

দুটো সীমা। Rendering throttle করুন: message buffer করুন আর একটি interval বা animation frame-এ flush করুন, কারণ সেকেন্ডে পঞ্চাশটি update কেউ দেখে না। আর পুরোনো event evict করে client buffer-এর সীমা দিন। নাহলে ব্যস্ত room-এ খোলা রাখা একটি tab বাড়তে বাড়তে আটকে যায়। দুটোই demo-তে ঠিক দেখায়, আর আসল traffic-এর এক ঘণ্টা পরে fail করে।

**Q: কখন client-এ একেবারেই socket ব্যবহার করবেন না?**

যখন client শুধু শোনে। `EventSource` আমাকে বিনা খরচে automatic reconnection আর `Last-Event-ID` replay দেয়। এটা সাধারণ HTTP-র ওপর চলে, যা প্রতিটি proxy ইতিমধ্যে সামলায়। সেটা অনেকখানি code, যা আমাকে লিখতে বা test করতে হয় না। Raw `WebSocket` আমি নেব শুধু তখন, যখন client-কে সত্যিই ঘন ঘন message পাঠাতে হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues) — transport বাছাই, আর ওই connection-গুলো ধরে রাখার খরচ
- [Chapter ?? — Real-Time ও Streaming API](#ch-realtime-streaming) — client যে server-এর সাথে কথা বলছে: authentication, room, backpressure
