---
sourceHash: "db621a7eac77dc7d43ff91b2b12a2d65c83e3dba9abef7a33023ba755443b00f"
title: "Node.js Performance, Stream ও Scaling"
translatedAt: "2026-10-12T12:18:04.974Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Node.js Performance, Stream ও Scaling {#ch-nodejs-performance}

> একটি profile দিয়ে আসল bottleneck খুঁজুন, stream দিয়ে memory সমান রাখুন, আর ঠিক করুন সমাধানটা একটি দ্রুততর loop, নাকি আরও কয়েকটি loop।

**এই অধ্যায়ে:** যে metric-গুলোতে alert রাখা উচিত · সময় আসলে কোথায় যায় · stream আর backpressure · worker thread বনাম replica · fork করলে কী ভাঙে

## 💡 মূল ধারণা

Node-এর performance কাজের একটি নির্দিষ্ট ক্রম আছে। **মাপুন, সবচেয়ে ধীর জিনিসটা খুঁজুন, সেটা ঠিক করুন, আবার মাপুন।**
স্বজ্ঞা থেকে আসা উত্তর প্রায় সবসময়ই ভুল। Engineer-রা তাদের JavaScript tune করেন, তারপর profile দেখায় 5 ms JavaScript আর
index ছাড়া একটি database-এর জন্য 400 ms অপেক্ষা। Node একটি সমন্বয়ের layer। এর latency-র বেশিরভাগটাই সেই জিনিসের, যাকে
এটা call করেছে।

Memory-ও একই যুক্তি মানে। পুরো payload ধরে রাখলে চলমান প্রতিটি request-এর জন্য memory খরচ হয়। **Streaming** data-কে chunk
ধরে ধরে সামলায়, তাই payload বাড়লেও memory সমান থাকে।

Scaling হলো এক ধাপ ওপরে একই প্রশ্ন। একটি process একটি core-এ JavaScript চালায়। **Worker thread CPU কাজকে main thread
থেকে সরিয়ে নেয়**, আর **replica server-এর আরও কপি চালায়**। এরা আলাদা সমস্যার সমাধান করে। ভুলটা বাছলে একটির বদলে চারটি
আটকে থাকা event loop পাবেন।

## কীভাবে কাজ করে

### সঠিক সংখ্যাটা মাপুন

| Metric | কী বলে | ফাঁদ |
| ------ | ---- | ---- |
| **p50 latency** | সাধারণ request | Tail-কে পুরোপুরি লুকিয়ে ফেলে |
| **p99 latency** | সবচেয়ে খারাপ 1% — যেখানে user-রা চলে যায় | স্থির হতে পর্যাপ্ত volume লাগে |
| **Event loop delay** | Loop আটকে আছে কি না | Node-এর health-এর একক সেরা signal |
| **RSS** | Process-এর মোট memory | Heap-এর বাইরের buffer-ও ধরে |
| **Heap used** | V8 object | Restart-এর পরেও বাড়তে থাকা মানে leak |

Event loop delay-তে alert রাখুন। মোটামুটি 50 ms-এর ওপরে database tuning কোনো কাজে আসে না। Request-গুলো আপনার নিজের code-এর
পেছনে queue-তে দাঁড়িয়ে আছে।

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

Bottleneck খুঁজতে তিনটি tool এই ক্রমে ব্যবহার করুন। `node --cpu-prof` থেকে একটি **flame graph**, Chrome DevTools-এ খুললে,
দেখায় CPU কোথায় গেছে। Load-এর আগে আর পরে নেওয়া **এক জোড়া heap snapshot** দেখায় কী বেড়েছে। **Slow-query log** দেখায়
database কী করেছে। উত্তরটা সাধারণত তৃতীয়টিতেই থাকে।

### সময় আসলে কোথায় যায়

| 400 ms-এর একটি request-এ খরচ | ভাগ | সমাধান |
| ------------------------ | ----- | --- |
| Index ছাড়া বা N+1 query | 60–80% | Index, batch, বা join |
| বড় একটি response serialise করা | 5–15% | Paginate করুন, কম column select করুন, বা stream করুন |
| Connection reuse ছাড়া বাইরের HTTP | 5–15% | Keep-alive agent |
| আপনার JavaScript | 5%-এর কম | সাধারণত সমস্যা এটা নয় |

N+1-ই সবচেয়ে প্রচলিত একক defect। Loop-এর ভেতরে প্রতিটি post-এর জন্য একটি lookup মানে 1 + N round trip। একটি batched
query-তে লাগে দুটি, page size যা-ই হোক।

**Author lookup batch করা:**

```typescript
const posts = await db.posts.findMany({ take: 20 });
const authors = await db.users.findMany({
  where: { id: { in: [...new Set(posts.map((p) => p.authorId))] } },
});
const byId = new Map(authors.map((a) => [a.id, a]));
```

Node-এর `fetch` connection reuse করে, কিন্তু অলস একটি connection মোটামুটি 4 সেকেন্ড পরে বন্ধ করে দেয়। তখন পরের call-কে নতুন
করে TCP আর TLS handshake-এর দাম দিতে হয়, একটি region জুড়ে 30–80 ms। `undici`-এর call
`setGlobalDispatcher(new Agent({ keepAliveTimeout: 30_000 }))` connection-কে আরও বেশিক্ষণ খোলা রাখে।

Leak সাধারণত আসে সীমাহীন `Map` cache থেকে, প্রতিটি request-এ যোগ করা listener থেকে, বা একটি closure ধরে রাখা timer থেকে।
স্বাভাবিক বৃদ্ধি একসময় থেমে যায়। Leak সরলরেখায় বাড়তেই থাকে।

## Stream আর Backpressure

একটি buffered response একটি byte পাঠানোর আগে পুরো body memory-তে ধরে রাখে। দশজন user প্রত্যেকে 200 MB-এর একটি export
download করলে 2 GB লাগে। 64 KB-এর chunk-এ stream করলে সেই দশজনের লাগে মোটামুটি 1 MB। টিকে থাকা container আর scheduler-এর
মেরে ফেলা container-এর পার্থক্য এটাই।

Streaming time to first byte-ও কমায়। Server কাজ করতে থাকা অবস্থাতেই client পড়া শুরু করে। এ কারণেই একটি LLM response token
ধরে ধরে stream হয়: পূর্ণ উত্তরের জন্য কেউ দশ সেকেন্ড অপেক্ষা করে না।

| ধরন | দিক | উদাহরণ |
| ---- | --------- | ------- |
| **Readable** | একটি source থেকে বাইরে | File read, HTTP request, database cursor |
| **Writable** | একটি sink-এর ভেতরে | File write, HTTP response |
| **Transform** | দুই দিকেই, জোড়া লাগানো | gzip, CSV encoder, JSON-lines parser |

**Backpressure** হলো sink-এর source-কে থামতে বলা। একটি readable সাধারণত writable-এর গ্রহণ করার চেয়ে দ্রুত তৈরি করতে পারে।
Sink-এর buffer ভরে গেলে `write()` `false` return করে। আবার লেখার আগে আপনাকে `'drain'`-এর জন্য অপেক্ষা করতেই হবে।

**হাতে লেখা version, যাতে mechanism-টা দেখা যায়:**

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

ওই return value উপেক্ষা করলে buffer সীমাহীনভাবে বাড়ে। Stream যে memory সমস্যা সমাধান করার জন্য, সেটাকেই আপনি ফিরিয়ে
এনেছেন।

**`pipeline` দিয়ে বড় একটি export stream করা:**

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

`pipe()` backpressure সামলায় কিন্তু error সামলায় না, তাই একটি failed sink source-কে leak করে। `node:stream/promises`-এর
`pipeline` যেকোনো failure-এ পুরো chain destroy করে। এটাই সঠিক default।

> ⚠️ Chunk-এর সীমানা আপনার record মানে না। একটি UTF-8 character বা একটি JSON line দুটি chunk-এ ভাগ হয়ে যেতে পারে। Text
> stream-এ `setEncoding('utf8')` call করুন, আর একটি transform দিয়ে অসম্পূর্ণ শেষ line-টা পরের chunk-এ নিয়ে যান, আর যা বাকি
> থাকে তা `_flush`-এ parse করুন।

## একাধিক Core ব্যবহার করা

| Tool | কীসের জন্য | খরচ |
| ---- | ------- | ---- |
| `worker_threads` | CPU-bound JavaScript — parsing, hashing, image-এর কাজ | ~2 ms start, প্রতিটি ~5 MB |
| `child_process.spawn` | `ffmpeg`-এর মতো একটি external binary — user input-সহ কখনো `exec` নয় | ~30 ms start |
| `cluster` | এক host-এ আরও বেশি concurrent request | প্রতিটি worker-এর জন্য একটি পূর্ণ process |
| Container replica | আরও বেশি concurrent request, orchestrated | প্রতিটির জন্য একটি container |

**Worker-গুলো pool করুন।** প্রতিটি request-এ একটি করে spawn করলে, মোটামুটি 50 ms-এর কম যেকোনো কাজের চেয়ে খরচ বেশি পড়ে।
`piscina`-এর মতো একটি library `availableParallelism() - 1` মাপের একটি নির্দিষ্ট pool দেয়, সাথে একটি queue।

### Fork করলে কী ভাঙে

`cluster.fork()` চার line-এর ব্যাপার। আসল কাজ হলো state-এর audit। প্রতিটি worker-এর নিজের memory আছে, তাই একটি variable-এ
রাখা যেকোনো কিছু এখন per-worker আর অসঙ্গত।

| কী ভাঙে | কেন | সমাধান |
| ------ | --- | --- |
| In-memory session | Request 2 অন্য worker-এ গিয়ে পড়ে | Redis, বা একটি signed cookie |
| In-memory rate limit counter | প্রতিটি worker একটি ভগ্নাংশ গোনে | Redis-এ shared counter |
| `setInterval` cron job | প্রতি tick-এ N বার চলে | একটি scheduler, বা একটি lock |
| WebSocket room | একটি broadcast শুধু এক worker-এর client-দের কাছে পৌঁছায় | Redis pub/sub adapter |

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী বেছে নেবেন |
| --------- | ------ |
| Event loop delay বেশি, request কম | Worker thread pool — loop-টাই bottleneck |
| Event loop অলস, একটি core যত request সামলায় তার চেয়ে বেশি | আরও process |
| Kubernetes বা একটি serverless platform | Container replica — platform আগে থেকেই এটা করে |
| কয়েক MB বা কয়েক সেকেন্ডের বেশি export, download বা LLM response | Stream করুন |
| ছোট JSON body, বা এমন data যেটা পুরোটা একসাথে validate করতে হবে | Buffer করুন — খারাপ একটি chunk পাঠানোর পরে আর ফেরানো যায় না |

একটি orchestrator-এর অধীনে প্রতিটি container-এ একটি process চালান। তার ভেতরে clustering সাধারণত অপ্রয়োজনীয়।

## সাধারণ ভুল

**❌ Query দেখার আগে JavaScript optimise করা।** ✅ সিদ্ধান্ত নিক profile, স্বজ্ঞা নয়।

**❌ একটি গড়ের ওপর ভরসা করা।** ✅ p99 দেখুন। 40 ms-এর p50 আর 4 s-এর p99 মানে একটি ভাঙা service, যেটা dashboard-এ সুস্থ
দেখায়।

**❌ Stream-এ client disconnect-এর কোনো পাহারা না থাকা।** ✅ `res.on('close')`-এ abort করুন। নইলে browser চলে যাওয়ার পরেও
source পড়তে থাকে।

## 🔑 মূল শিক্ষা

- আগে মাপুন, কারণ bottleneck আপনার JavaScript-এর চেয়ে database-এ থাকে অনেক বেশি বার।
- Event loop delay হলো Node-নির্দিষ্ট একমাত্র metric, যেটাতে alert রাখা উচিত।
- Payload বাড়লেও streaming memory সমান রাখে, আর backpressure-ই একটি দ্রুত source-কে একটি ধীর sink ভাসিয়ে দিতে দেয় না।
- Worker thread আটকে থাকা loop ঠিক করে আর replica ঠিক করে throughput, তাই একটি আরেকটির বিকল্প নয়।
- Fork করলে memory-তে রাখা প্রতিটি state একটি correctness bug হয়ে যায়, তাই session, counter আর cron job audit করুন।

## Interview-এর প্রশ্ন

**Q: একটি service-এর p99 হলো 3 s, অথচ p50 হলো 30 ms। কোথায় দেখবেন?**

গড় নয়, tail-এর আকারে। হয় কিছু request একটি ধীর পথে পড়ছে, যেমন একটি অনুপস্থিত index যেটা শুধু বড় customer-দের ক্ষেত্রে
গুরুত্বপূর্ণ। নয়তো CPU কাজ বা garbage collection মাঝে মাঝে loop আটকে দিচ্ছে। Event loop delay আর প্রতিটি endpoint-এর
percentile কয়েক মিনিটেই এই দুটিকে আলাদা করে দেয়।

**Q: Backpressure কী, আর এটা উপেক্ষা করলে কী হয়?**

এটা হলো writable দিকের readable দিককে ধীর হতে বলা। `write()` `false` return করে, আর `'drain'` event সেটা তুলে নেয়। এটা
উপেক্ষা করলে chunk-গুলো sink-এর buffer-এ কোনো ছাদ ছাড়াই জমতে থাকে, যতক্ষণ না process-টা মেরে ফেলা হয়। `pipeline` এটা
আপনার হয়ে সামলায়। হাতে লেখা loop সামলায় না।

**Q: একটি LLM response বা বড় একটি file download পুরোটা একসাথে না পাঠিয়ে stream কেন করবেন?**

দুটি কারণ। Time to first byte কমে যায়, তাই user সঙ্গে সঙ্গেই token বা অগ্রগতি দেখেন। প্রতি request-এ memory পুরো body-র
বদলে একটি chunk-এই থাকে, তাই concurrency সেটাকে গুণ করে না। খরচ হলো, status code পাঠানোর পরেও error আসতে পারে, তাই
client-কে একটি failed stream সামলাতে হবে।

**Q: Worker thread নাকি আরও process — কীভাবে বাছবেন?**

কোনটা saturated তা দিয়ে। আপনার নিজের CPU কাজ যদি loop আটকে দেয়, একটি worker thread সেটা সরিয়ে নেয়, আর একটি process-ই
তখনো যথেষ্ট। Loop যদি অলস থাকে আর একটি core যত request সামলায় তার চেয়ে বেশি থাকে, process যোগ করুন। Blocking handler-এ
process যোগ করলে শুধু আটকে থাকা loop-এর সংখ্যা গুণ হয়।

**Q: যে app একটি process হিসেবে ঠিকঠাক চলছিল, তাতে clustering চালু করলে কী ভাঙে?**

Memory-তে রাখা যেকোনো কিছু। Session আর resolve হয় না, কারণ পরের request অন্য worker-এ গিয়ে পড়ে। Rate limit N গুণ কম গোনে,
`setInterval` job প্রতিটি worker-এ একবার করে চলে, আর broadcast শুধু এক worker-এর client-দের কাছে পৌঁছায়। সেই state Redis
বা একটি database-এ সরিয়ে নিন।

## এরপর কী পড়বেন

- [Chapter ?? — Node.js Event Loop, Async ও Error](#ch-event-loop-async) — "blocking" আসলে কী বোঝায়
- [Chapter ?? — Real-Time ও Streaming API](#ch-realtime-streaming) — HTTP আর WebSocket-এর ওপর streaming
- [Chapter ?? — Index, Query Plan, ORM ও Migration](#ch-indexes) — ধীর query-র পেছনের plan পড়া
