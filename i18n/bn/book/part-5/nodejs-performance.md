---
sourceHash: "db621a7eac77dc7d43ff91b2b12a2d65c83e3dba9abef7a33023ba755443b00f"
title: "Node.js Performance, Stream ও Scaling"
translatedAt: "2026-10-17T14:01:00.922Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Node.js Performance, Stream ও Scaling {#ch-nodejs-performance}

> Profile দিয়ে আসল bottleneck খুঁজে বের করুন, stream দিয়ে memory সমান রাখুন, আর ঠিক করুন সমাধানটা দ্রুততর loop, নাকি আরও কয়েকটি loop।

**এই অধ্যায়ে:** যে metrics-এ alert দেওয়া দরকার · সময় আসলে কোথায় যায় · stream আর backpressure · worker thread বনাম replica · fork করলে কী ভাঙে

## 💡 মূল ধারণা

Node-এর performance-এর কাজ একটি নির্দিষ্ট ক্রমে চলে। **মাপুন, সবচেয়ে ধীর জিনিসটা খুঁজুন, সেটা ঠিক করুন, আবার মাপুন।**
মন যে উত্তর দেয়, তা প্রায় সবসময় ভুল। Engineer-রা JavaScript tune করতে বসেন, তারপর profile দেখায় JavaScript-এ গেছে
5 ms, আর index ছাড়া একটি database-এর অপেক্ষায় 400 ms। Node আসলে একটি সমন্বয়ের স্তর। এর latency-র বেশিরভাগটাই আসে
Node যাকে call করেছে, সেখান থেকে।

Memory-র যুক্তিও একই। পুরো payload ধরে রাখলে চলতি প্রতিটি request-এর জন্য memory খরচ হয়। **Streaming** data-কে chunk
ধরে ধরে সামলায়, তাই payload বড় হলেও memory সমান থাকে।

Scaling হলো এক ধাপ ওপরে একই প্রশ্ন। একটি process একটি core-এ JavaScript চালায়। **Worker thread CPU-র কাজ main thread
থেকে সরিয়ে নেয়**, আর **replica server-এর আরও copy চালায়**। দুটি দুই রকম সমস্যার সমাধান। ভুলটা বেছে নিলে একটির
জায়গায় চারটি আটকে থাকা event loop পাবেন।

## কীভাবে কাজ করে

### ঠিক সংখ্যাটা মাপুন

| Metric | কী বলে | ফাঁদ |
| ------ | ---- | ---- |
| **p50 latency** | সাধারণ request | Tail পুরোপুরি লুকিয়ে ফেলে |
| **p99 latency** | সবচেয়ে খারাপ 1% — যেখানে user চলে যায় | স্থির হতে যথেষ্ট traffic লাগে |
| **Event loop delay** | Loop আটকে আছে কি না | Node-এর health বোঝার সবচেয়ে ভালো একক সংকেত |
| **RSS** | Process-এর মোট memory | Heap-এর বাইরের buffer-ও এতে ধরা |
| **Heap used** | V8-এর object | Restart-এর পরেও বাড়তে থাকলে বুঝবেন leak |

Alert দিন event loop delay-এর ওপর। মোটামুটি 50 ms ছাড়ালে database tune করে আর লাভ নেই। Request-গুলো আপনার নিজের
code-এর পেছনে লাইনে দাঁড়িয়ে আছে।

**Event loop delay report করা:**

```typescript
import { monitorEventLoopDelay } from 'node:perf_hooks';

const histogram = monitorEventLoopDelay({ resolution: 20 });
histogram.enable();

setInterval((): void => {
  metrics.gauge('event_loop.p99_ms', histogram.percentile(99) / 1e6);
  histogram.reset();
}, 10_000).unref();
```

Bottleneck খুঁজতে তিনটি tool এই ক্রমে ব্যবহার করুন। `node --cpu-prof` থেকে পাওয়া **flame graph** Chrome DevTools-এ
খুললে দেখা যায় CPU কোথায় খরচ হলো। Load-এর আগে আর পরে নেওয়া **এক জোড়া heap snapshot** দেখায় কী বেড়েছে। **Slow-query
log** দেখায় database কী করেছে। সাধারণত উত্তরটা থাকে তৃতীয়টিতেই।

### সময় আসলে কোথায় যায়

| 400 ms-এর একটি request-এ খরচ | ভাগ | সমাধান |
| ------------------------ | ----- | --- |
| Index ছাড়া বা N+1 query | 60–80% | Index, batch, বা join |
| বড় response serialise করা | 5–15% | Paginate করুন, কম column select করুন, বা stream করুন |
| Connection reuse ছাড়া বাইরের HTTP call | 5–15% | Keep-alive agent |
| আপনার JavaScript | 5%-এর কম | সাধারণত এটা সমস্যা নয় |

একক defect হিসেবে সবচেয়ে বেশি দেখা যায় N+1। Loop-এর ভেতরে প্রতিটি post-এর জন্য একটি lookup মানে 1 + N round trip।
একটি batch query-তে লাগে দুটি, page যত বড়ই হোক।

**Author lookup batch করা:**

```typescript
const posts = await db.posts.findMany({ take: 20 });
const authors = await db.users.findMany({
  where: { id: { in: [...new Set(posts.map((p) => p.authorId))] } },
});
const byId = new Map(authors.map((a) => [a.id, a]));
```

Node-এর `fetch` connection reuse করে, কিন্তু অলস connection মোটামুটি 4 সেকেন্ড পরে বন্ধ করে দেয়। তখন পরের call-কে
নতুন করে TCP আর TLS handshake করতে হয়, এক region-এর ভেতরে 30–80 ms। `undici`-এর call
`setGlobalDispatcher(new Agent({ keepAliveTimeout: 30_000 }))` connection-গুলো বেশিক্ষণ খোলা রাখে।

Leak সাধারণত আসে সীমাহীন `Map` cache থেকে, প্রতি request-এ যোগ হওয়া listener থেকে, বা closure ধরে রাখা timer থেকে।
স্বাভাবিক বৃদ্ধি এক সময় থেমে যায়। Leak সোজা রেখায় বাড়তেই থাকে।

## Stream আর Backpressure

Buffer করা response একটি byte পাঠানোর আগেই পুরো body memory-তে ধরে রাখে। দশজন user প্রত্যেকে 200 MB-র একটি export
download করলে লাগে 2 GB। 64 KB-র chunk-এ stream করলে ওই দশজনের লাগে মোটামুটি 1 MB। Container টিকে যাবে, নাকি
scheduler সেটা মেরে ফেলবে, তফাতটা এখানেই।

Streaming-এ time to first byte-ও কমে। Server কাজ শেষ করার আগেই client পড়া শুরু করে। এ কারণেই LLM-এর response token
ধরে ধরে stream হয়: পুরো উত্তরের জন্য কেউ দশ সেকেন্ড বসে থাকে না।

| ধরন | দিক | উদাহরণ |
| ---- | --------- | ------- |
| **Readable** | উৎস থেকে বাইরে | File পড়া, HTTP request, database cursor |
| **Writable** | গন্তব্যের ভেতরে | File লেখা, HTTP response |
| **Transform** | দুই দিকেই, জোড়া লাগানো | gzip, CSV encoder, JSON-lines parser |

**Backpressure** মানে গন্তব্য উৎসকে থামতে বলছে। Readable সাধারণত writable যত দ্রুত নিতে পারে, তার চেয়ে দ্রুত data
বানাতে পারে। গন্তব্যের buffer ভরে গেলে `write()` `false` return করে। আবার লেখার আগে আপনাকে `'drain'`-এর জন্য অপেক্ষা
করতে হবে।

**হাতে লেখা version, যাতে কৌশলটা চোখে পড়ে:**

```typescript
async function copy(src: Readable, dst: Writable): Promise<void> {
  for await (const chunk of src) {
    if (!dst.write(chunk)) {
      await once(dst, 'drain'); // Pause the source until the sink catches up.
    }
  }
  dst.end();
}
```

ওই return value উপেক্ষা করলে buffer সীমাহীনভাবে বাড়ে। মানে stream যে memory-র সমস্যা মেটাতে এসেছিল, সেটাই আবার
ফিরিয়ে আনলেন।

**`pipeline` দিয়ে বড় export stream করা:**

```typescript
app.get('/exports/orders.csv', async (req, res) => {
  res.type('text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');

  const controller = new AbortController();
  res.on('close', (): void => controller.abort()); // The user cancelled the download.

  // A cursor, not a full result set — the query never sits in memory.
  const cursor = db.query(new QueryStream('SELECT * FROM orders'));
  await pipeline(cursor, new CsvTransform(), res, { signal: controller.signal });
});
```

`pipe()` backpressure সামলায়, কিন্তু error সামলায় না। ফলে গন্তব্য ব্যর্থ হলে উৎসটা leak হয়ে পড়ে থাকে। `node:stream/promises`
থেকে আসা `pipeline` যেকোনো ব্যর্থতায় পুরো chain ভেঙে দেয়। Default হিসেবে এটাই ঠিক।

> ⚠️ Chunk-এর সীমানা আপনার record মানে না। একটি UTF-8 character বা একটি JSON line দুই chunk-এ ভাগ হয়ে যেতে পারে।
> Text stream-এ `setEncoding('utf8')` call করুন। আর transform দিয়ে অসম্পূর্ণ শেষ line-টা পরের chunk-এ বয়ে নিয়ে যান,
> শেষে যা বাকি থাকে তা `_flush`-এ parse করুন।

## একাধিক Core কাজে লাগানো

| Tool | কীসের জন্য | খরচ |
| ---- | ------- | ---- |
| `worker_threads` | CPU-bound JavaScript — parsing, hashing, image-এর কাজ | চালু হতে ~2 ms, প্রতিটি ~5 MB |
| `child_process.spawn` | `ffmpeg`-এর মতো বাইরের binary — user input দিয়ে কখনো `exec` নয় | চালু হতে ~30 ms |
| `cluster` | একই host-এ আরও বেশি concurrent request | প্রতিটি worker-এর জন্য একটি পূর্ণ process |
| Container replica | আরও বেশি concurrent request, orchestrator দিয়ে চালানো | প্রতিটির জন্য একটি container |

**Worker-দের pool বানান।** মোটামুটি 50 ms-এর কম যেকোনো কাজের জন্য প্রতি request-এ একটি worker তৈরি করার খরচ কাজটার
চেয়েই বেশি। `piscina`-র মতো library একটি নির্দিষ্ট pool দেয়, যার আকার `availableParallelism() - 1`, সঙ্গে একটি queue।

### Fork করলে কী ভাঙে

`cluster.fork()` মাত্র চার line। আসল কাজ হলো state-এর হিসাব নেওয়া। প্রতিটি worker-এর নিজের memory আছে, তাই variable-এ
রাখা সবকিছু এখন worker-প্রতি আলাদা, আর পরস্পরের সঙ্গে মেলে না।

| যা ভাঙে | কেন | সমাধান |
| ------ | --- | --- |
| In-memory session | দ্বিতীয় request পৌঁছায় অন্য worker-এ | Redis, বা signed cookie |
| In-memory rate limit counter | প্রতিটি worker গোনে মোটের একটি ভগ্নাংশ | Redis-এ shared counter |
| `setInterval` cron job | প্রতি tick-এ N বার চলে | একটিই scheduler, বা একটি lock |
| WebSocket room | Broadcast শুধু একটি worker-এর client-দের কাছে পৌঁছায় | Redis pub/sub adapter |

## কখন ব্যবহার করবেন

| পরিস্থিতি | বেছে নিন |
| --------- | ------ |
| Event loop delay বেশি, request কম | Worker thread pool — bottleneck হলো loop নিজেই |
| Event loop অলস, অথচ request এক core-এর সামর্থ্যের বেশি | আরও process |
| Kubernetes বা serverless platform | Container replica — platform আগেই এটা করে |
| কয়েক MB বা কয়েক সেকেন্ডের বেশি export, download বা LLM response | Stream করুন |
| ছোট JSON body, বা এমন data যা পুরোটা একসঙ্গে validate করতে হয় | Buffer করুন — খারাপ chunk একবার পাঠালে আর ফেরানো যায় না |

Orchestrator-এর অধীনে প্রতি container-এ একটি process চালান। তার ভেতরে আবার clustering সাধারণত বাড়তি।

## সাধারণ ভুল

**❌ Query না দেখেই JavaScript optimise করা।** ✅ সিদ্ধান্ত নিক profile, মনের ধারণা নয়।

**❌ Average-এ ভরসা করা।** ✅ p99 দেখুন। p50 40 ms আর p99 4 s মানে service ভাঙা, যদিও dashboard-এ সুস্থ দেখায়।

**❌ Stream-এ client চলে যাওয়ার কোনো পাহারা নেই।** ✅ `res.on('close')`-এ abort করুন। নইলে browser চলে যাওয়ার পরেও
উৎস পড়তেই থাকে।

## 🔑 মূল শিক্ষা

- আগে মাপুন, কারণ bottleneck আপনার JavaScript-এর চেয়ে database-এ থাকে অনেক বেশি বার।
- Node-এর নিজস্ব metrics-এর মধ্যে alert দেওয়ার মতো একটিই আছে: event loop delay।
- Streaming payload বড় হলেও memory সমান রাখে, আর backpressure দ্রুত উৎসকে ধীর গন্তব্য ভাসিয়ে দিতে দেয় না।
- Worker thread আটকে থাকা loop ঠিক করে, replica ঠিক করে throughput। তাই একটি দিয়ে আরেকটির কাজ হয় না।
- Fork করলে memory-তে রাখা প্রতিটি state একটি correctness bug হয়ে যায়। তাই session, counter আর cron job খতিয়ে দেখুন।

## Interview-এর প্রশ্ন

**Q: একটি service-এর p99 3 s, অথচ p50 30 ms। কোথায় খুঁজবেন?**

Average নয়, tail-এর আকার দেখুন। হয় কিছু request ধীর পথে পড়ছে, যেমন এমন একটি missing index, যা শুধু বড় customer-দের
ক্ষেত্রে টের পাওয়া যায়। নয়তো CPU-র কাজ বা garbage collection মাঝে মাঝে loop আটকে দিচ্ছে। Event loop delay আর
endpoint-ভিত্তিক percentile দেখলে কয়েক মিনিটেই দুটিকে আলাদা করা যায়।

**Q: Backpressure কী, আর উপেক্ষা করলে কী হয়?**

Writable দিক readable দিককে ধীরে চলতে বলছে, এটাই backpressure। `write()` `false` return করে, আর `'drain'` event এলে
সেই বাধা ওঠে। উপেক্ষা করলে chunk-গুলো গন্তব্যের buffer-এ জমতেই থাকে, কোনো ছাদ ছাড়া, যতক্ষণ না process মারা পড়ে।
`pipeline` এটা আপনার হয়ে সামলায়। হাতে লেখা loop সামলায় না।

**Q: LLM-এর response বা বড় file download একবারে না পাঠিয়ে stream করবেন কেন?**

দুটি কারণে। Time to first byte কমে, তাই user সঙ্গে সঙ্গে token বা progress দেখেন। আর request-প্রতি memory থাকে একটি
chunk-এর সমান, পুরো body-র নয়, তাই concurrency বাড়লেও memory গুণ হয়ে বাড়ে না। খরচ হলো, status code পাঠানোর পরেও error
আসতে পারে। তাই client-কে ব্যর্থ stream সামলাতে জানতে হবে।

**Q: Worker thread নাকি আরও process — কীভাবে বাছবেন?**

দেখুন কোনটা ভরে গেছে। আপনার নিজের CPU-র কাজ যদি loop আটকায়, worker thread সেটা সরিয়ে নেয়, আর একটি process-ই তখনো
যথেষ্ট। Loop যদি অলস থাকে আর request এক core-এর সামর্থ্যের বেশি হয়, তাহলে process বাড়ান। Blocking handler-ওয়ালা app-এ
process বাড়ালে শুধু আটকে থাকা loop-এর সংখ্যাই বাড়ে।

**Q: এক process-এ ঠিকঠাক চলা app-এ clustering চালু করলে কী ভাঙে?**

Memory-তে রাখা সবকিছু। Session আর খুঁজে পাওয়া যায় না, কারণ পরের request অন্য worker-এ পৌঁছায়। Rate limit N গুণ কম
গোনে, `setInterval` job প্রতিটি worker-এ একবার করে চলে, আর broadcast পৌঁছায় শুধু একটি worker-এর client-দের কাছে। এই
state Redis বা database-এ সরিয়ে নিন।

## এরপর কী পড়বেন

- [Chapter ?? — Node.js Event Loop, Async ও Error](#ch-event-loop-async) — "blocking" আসলে কী বোঝায়
- [Chapter ?? — Real-Time ও Streaming API](#ch-realtime-streaming) — HTTP আর WebSocket দিয়ে streaming
- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — ধীর query-র পেছনের plan পড়া
