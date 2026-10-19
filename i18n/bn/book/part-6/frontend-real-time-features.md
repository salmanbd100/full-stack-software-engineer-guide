---
sourceHash: "1d842b4810837758bfbf78468d6021ae44449d1bcd31db7487ab26ed12d33a0e"
title: "Frontend-এ Real-Time Feature"
translatedAt: "2026-10-19T07:55:02.800Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Frontend-এ Real-Time Feature {#ch-frontend-real-time-features}

> এমন client বানান, যা connection কেটে গেলেও টিকে থাকে, আর নিজে কী জানে সে বিষয়ে সত্যি কথা বলে।

**এই অধ্যায়ে:** browser-এর দুটি API · backoff আর jitter দিয়ে reconnection · হারানো message ফেরত আনা · live data render করা · UI-র কাছে user-এর যা পাওনা

## 💡 মূল ধারণা

Real-time feature-এর কঠিন দিক message পাওয়া নয়। কঠিন হলো connection ভাঙলে কী হয়। আর connection ভাঙবেই:
প্রতিটি deploy-এ, প্রতিটি সুড়ঙ্গে, প্রতিটি ট্রেনে।

যে client শুধু socket দিয়েই বদলের খবর পায়, একটা frame হারালেই তার জানা ভুল হয়ে যায়। আর সেটা client টেরও পায় না।
**Connection-কে দেখুন কম latency-র একটা ইঙ্গিত হিসেবে, আর সত্যের উৎস হিসেবে ধরুন HTTP-কে।** যে client একটা REST
endpoint থেকে নিজের state আবার গড়ে নিতে পারে, সেই client যেকোনো disconnection সামলে নেয়।

কোন transport ব্যবহার করবেন, সেটা design-এর সিদ্ধান্ত, আর তা আলোচনা করা হয়েছে [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues)-এ।
এই অধ্যায় ধরে নেয় যে সিদ্ধান্তটা নেওয়া হয়ে গেছে, আর client-টা বানায়।

## কীভাবে কাজ করে

Browser-এ দুটি API আছে, আর দুটি আপনার হয়ে সমান পরিমাণ কাজ করে না।

**`WebSocket` — দুই দিকেই চলে, আর reconnection আপনাকেই বানাতে হয়:**

```typescript
const socket = new WebSocket("wss://api.example.com/chat");

socket.onopen = () => socket.send(JSON.stringify({ type: "join", roomId }));
socket.onmessage = (event: MessageEvent<string>) => {
  const { type, payload } = JSON.parse(event.data) as { type: string; payload: unknown };
  dispatch(type, payload);
};
socket.onclose = (event: CloseEvent) => scheduleReconnect(event.code);
```

**`EventSource` — এক দিকে চলে, আর reconnect নিজেই করে নেয়:**

```typescript
const source = new EventSource("/api/events"); // sends `Last-Event-ID` on reconnect

source.onmessage = (event: MessageEvent<string>) => {
  apply(JSON.parse(event.data) as FeedEvent);
};
source.onerror = () => {
  // The browser is already retrying. Only close if you want to stop.
};
```

SSE (Server-Sent Events, `EventSource`-এর পেছনের protocol) server-এ খুব কম কিছু চায়। Server তিনটি response
header পাঠায়: `Content-Type: text/event-stream`, `Cache-Control: no-cache` আর `Connection: keep-alive`। তারপর
event লেখে `id:` আর `data:` line হিসেবে। Browser `id` থেকে আবার চালায়, তাই সবসময় একটা পাঠাবেন।

## কখন ব্যবহার করবেন

Transport-এর সিদ্ধান্ত আগেই হয়ে যায়। *Client* যা ঠিক করে, তা হলো stream-কে কতটা বিশ্বাস করা হবে:

| UI যা দেখায় | Client-এর strategy | কেন |
| ------------ | --------------- | --- |
| Chat, comment, presence | Optimistic-ভাবে যোগ করুন, acknowledgement এলে মিলিয়ে নিন | Latency-ই পুরো feature; rollback সস্তা |
| দাম, metric, dashboard | শেষ জানা value দেখান, সঙ্গে পুরনো হওয়ার একটা চিহ্ন | আত্মবিশ্বাসের সঙ্গে দেখানো ভুল সংখ্যা, "পুরনো" লেখা সংখ্যার চেয়ে খারাপ |
| Order status, payment-এর অবস্থা | শুধু push-কে বিশ্বাস করবেন না; push এলেই আবার fetch করুন | Latency-র চেয়ে সঠিকতা জরুরি; push শুধু reload করার ইশারা |
| Collaborative document | CRDT বা server-এর সাজানো operation, last-write-wins কখনোই নয় | Offline-এ করা দুটি edit-ই টিকে থাকতে হবে |

## Backoff আর jitter দিয়ে reconnection

প্রতিটি client-কেই reconnect করতে হয়। পরীক্ষা হয় *ভদ্রভাবে* reconnect করা নিয়ে।

```typescript
interface ReconnectState {
  attempt: number;
}

function nextDelayMs({ attempt }: ReconnectState): number {
  const base = Math.min(1_000 * 2 ** attempt, 30_000); // exponential, capped at 30 s
  return base * (0.5 + Math.random() * 0.5);           // ✅ jitter: spread the herd
}
```

> ⚠️ **Jitter না থাকলে সব client একই সময়সূচিতে reconnect করে।** একটা pod restart তখন হুড়োহুড়ি হয়ে দাঁড়ায়, আর
> সদ্য চালু হওয়া pod-টাকেই মাটিতে মিশিয়ে দেয়। এলোমেলো ভাবটা সাজসজ্জা নয়। পাঁচ সেকেন্ডের একটা ঝাঁকুনি আর একের পর
> এক outage-এর মধ্যে পার্থক্য এটাই।

কাজের client আর demo-কে আলাদা করে তিনটি খুঁটিনাটি:

- **সীমা দিন delay-এ, চেষ্টার সংখ্যায় নয়।** পাঁচবার চেষ্টা করে যে client হাল ছেড়ে দেয়, এক ঘণ্টা laptop বন্ধ
  রাখা যেকোনো user-এর জন্য সেটা অকেজো। সর্বোচ্চ delay-এ পৌঁছে চেষ্টা চালিয়ে যান।
- **Delay reset করুন open *সফল* হলে**, চেষ্টা করার সময় নয়। নইলে বারবার ওঠানামা করা connection কখনো পিছিয়ে আসে না।
- **Tab লুকানো থাকলে থামুন।** `document.visibilityState` দিয়ে background tab-এর জন্য চেষ্টা বন্ধ রাখা যায়, আর
  tab ফিরলেই reconnect করা যায়। পুরো সময় চলতে থাকা timer-এর চেয়ে এটা সস্তা, আর দ্রুতও।

## হারানো message ফেরত আনা

Reconnection transport ফিরিয়ে আনে। আপনি না থাকার সময় যে message এসেছিল, সেগুলো ফেরায় না। এই ফাঁকটা পূরণ করুন
data layer-এ, HTTP দিয়ে:

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

দুটি বৈশিষ্ট্য এটাকে নিরাপদ করে। `apply`-কে **idempotent** হতে হবে, কারণ catch-up fetch আর live stream
একে অন্যের ওপর পড়বে, ফলে একই event দুবার আসবে। আর `lastEventId` এগোয় কেবল event apply হওয়ার পরে। তাই apply
করার মাঝখানে crash হলে event-টা বাদ পড়ে না, আবার চলে।

SSE-তে একই ব্যবস্থা বিনা পরিশ্রমে পাওয়া যায়: reconnect করার সময় browser `Last-Event-ID` পাঠায়, আর server সেখান
থেকে আবার শুরু করে।

## Live data render করা

Connection একটা side effect, যার একটা আয়ু আছে। Effect hook ঠিক এই কাজের জন্যই।

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

বেশিরভাগ hook যে তিনটি জিনিস ভুল করে, এই hook সেগুলো ঠিক করে। Cleanup-এর সময় **connection বন্ধ করে**। **Buffer-এর
একটা সীমা রাখে**, যাতে ব্যস্ত একটা room state-কে সীমাহীনভাবে বাড়াতে না পারে। আর **`connected` বাইরে দেয়**, যাতে
UI সেটা জানাতে পারে। Connection-এর অবস্থা দেখানো বাড়তি ঘষামাজা নয়। যে dashboard চুপচাপ update হওয়া বন্ধ করে
দিয়েছে, সেটা user-কে ভুল পথে নিয়ে যায়।

**ঘন ঘন আসা stream-এর জন্য client-এও throttling লাগে।** সেকেন্ডে 50টা message আসা price feed-এর জন্য সেকেন্ডে
50টা render দরকার নেই। আসা message buffer-এ জমান, আর animation frame-এ বা নির্দিষ্ট বিরতিতে একবারে ঢেলে দিন।
User কোনো পার্থক্য দেখবেন না, আর main thread-এর হাঁসফাঁস থেমে যাবে।

## সাধারণ ভুল

❌ **N-বার reconnect চেষ্টার পর হাল ছেড়ে দেওয়া।** User laptop বন্ধ করে ফিরে এসে মরা একটা page পান।
✅ সীমা দেওয়া, jitter-ওয়ালা বিরতিতে অনির্দিষ্টকাল চেষ্টা করুন।

❌ **Reconnect করে ধরে নেওয়া যে সব মিলে গেছে।** আপনি না থাকার সময় পাঠানো সবকিছুই হাতছাড়া হয়েছে।
✅ শেষ apply করা event id থেকে আবার fetch করুন, তারপর stream আবার চালু করুন।

❌ **Connection-এর অবস্থা চোখে পড়ে না।** জমে যাওয়া dashboard দেখতে শান্ত একটা dashboard-এর মতোই।
✅ Connecting, live আর stale — তিনটি অবস্থা স্পষ্ট করে দেখান।

❌ **Client state-এর কোনো সীমা নেই।** ব্যস্ত room-এ অনেকক্ষণ খোলা tab বাড়তে বাড়তে আটকে যায়।
✅ Buffer-এর সীমা দিন আর পুরনোগুলো সরান, server-এর মতো client-এও।

❌ **Unmount-এর সময় connection খোলা রেখে দেওয়া।** Route বদলাতে বদলাতে নিঃশব্দে socket জমতে থাকে।
✅ Effect cleanup-এ বন্ধ করুন, আর key দিন stream-কে যা দিয়ে চেনা যায় তা দিয়ে।

## 🔑 মূল শিক্ষা

- Connection বয়ে আনে গতি; সত্য বয়ে আনে HTTP। তাই প্রতিটি client-কে একটা REST endpoint থেকে নিজের state আবার গড়তে পারতে হবে।
- Reconnection-এ লাগে jitter-সহ exponential backoff, চেষ্টার কোনো সীমা ছাড়া। Reset হবে কেবল সফল open-এ।
- Catch up মানে শেষ apply করা event id থেকে আবার fetch করা। এটা কাজ করে কেবল event apply করা idempotent হলে।
- Connection-এর অবস্থা UI-তে দেখাতে হবে — live দেখতে অথচ পুরনো view, স্পষ্টভাবে ভাঙা view-এর চেয়েও খারাপ।
- Render-এর হার আর client buffer, দুটিরই সীমা দিন। অনেকক্ষণ খোলা tab মানে একটা memory leak, যা শুধু ব্যস্ত একটা room-এর অপেক্ষায়।

## Interview-এর প্রশ্ন

**Q: 30 সেকেন্ড offline থাকার পর একটা client reconnect করল। হারানো অংশটা client কীভাবে ধরে ফেলে?**

Socket দিয়ে নয়। Client শেষ যে event id apply করেছে, সেটা মনে রাখে। Reconnect করে সেই id-র পরের সবকিছুর জন্য
একটা REST endpoint call করে, তারপর live event আবার চালু করে। Catch-up আর live stream একে অন্যের ওপর পড়ে, তাই
apply করা idempotent হতেই হবে। Socket শুধু জিনিসটা দ্রুত করে। যে client প্রতিটি message পৌঁছে দেওয়ার জন্য
transport-এর ওপর ভরসা করে, শেষে সেটা চুপচাপ অমিল অবস্থায় পড়ে থাকে।

**Q: Reconnection-এ jitter লাগে কেন?**

কারণ তা না হলে সব client একসঙ্গে reconnect করে। একটা pod restart একই মুহূর্তে হাজার হাজার connection ফেলে দেয়।
সবাই একই backoff curve মানলে তারা ঢেউয়ের মতো ফেরে, আর বদলি pod-টাকে মাটিতে মিশিয়ে দেয়। প্রতিটি client-এর জন্য
এলোমেলো একটা delay ফেরার সময়টাকে পুরো সময়সীমা জুড়ে ছড়িয়ে দেয়। একের পর এক outage-এর আশঙ্কা তখন ছোট একটা
ঝাঁকুনিতে নেমে আসে।

**Q: Connection কেটে গেলে UI-র কাছে user-এর কী পাওনা?**

সৎ একটা অবস্থা। তিনটি অবস্থা দেখান (connecting, live আর stale), আর যেকোনো সংখ্যার পাশে একটা timestamp। যে
ব্যর্থতা নিয়ে আমি চিন্তিত, সেটা হলো এমন dashboard, যা বিশ মিনিট আগে update পাওয়া বন্ধ করেছে অথচ এখনো
আত্মবিশ্বাসের সঙ্গে সংখ্যা দেখাচ্ছে। কেউ না কেউ সেই সংখ্যা দেখে সিদ্ধান্ত নেবেন। "শেষ update 20 মিনিট আগে"
দেখাতে কোনো খরচ নেই, আর সেটাই এই বিপদ ঠেকায়।

**Q: Live feed যাতে page-টাকে ধীর করে না দেয়, তা কীভাবে নিশ্চিত করবেন?**

দুটি সীমা দিয়ে। Render throttle করুন: message buffer-এ জমান, আর নির্দিষ্ট বিরতিতে বা animation frame-এ ঢেলে দিন,
কারণ সেকেন্ডে পঞ্চাশটা update কেউ দেখে না। আর পুরনো event সরিয়ে client buffer-এর সীমা রাখুন। নইলে ব্যস্ত room-এ
খোলা রেখে যাওয়া tab বাড়তে বাড়তে আটকে যায়। দুটিই demo-তে ঠিকঠাক দেখায়, আর আসল traffic-এ এক ঘণ্টা পরে ভেঙে পড়ে।

**Q: কখন client-এ socket একেবারেই ব্যবহার করবেন না?**

যখন client শুধু শোনে। `EventSource` আমাকে বিনা পরিশ্রমে automatic reconnection আর `Last-Event-ID` replay দেয়। এটা
চলে সাধারণ HTTP-র ওপর, যা প্রতিটি proxy আগে থেকেই সামলাতে জানে। মানে অনেকখানি code আমাকে লিখতে বা test করতে
হয় না। Raw `WebSocket` আমি নেব কেবল তখনই, যখন client-কে সত্যিই ঘন ঘন message পাঠাতে হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Queue, Async কাজ ও WebSocket](#ch-message-queues) — transport বাছাই, আর ওই connection-গুলো ধরে রাখার খরচ
- [Chapter ?? — Real-Time ও Streaming API](#ch-realtime-streaming) — client যে server-এর সঙ্গে কথা বলে: authentication, room, backpressure
