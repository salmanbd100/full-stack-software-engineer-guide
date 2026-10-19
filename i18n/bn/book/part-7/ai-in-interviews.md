---
sourceHash: "f906c6931364894fd909048e7dda627191189a5d13039d477acffb1c353aa85b"
title: "Interview-এ AI"
translatedAt: "2026-10-19T08:02:02.354Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Interview-এ AI {#ch-ai-in-interviews}

> Senior loop-এ AI নিয়ে যে চারটি প্রশ্ন সত্যিই আসে, সেগুলোর হাল ধরুন, আর প্রতিটি প্রশ্ন শেষ করে দেওয়ার মতো সংখ্যাটার নাম বলুন।

**এই অধ্যায়ে:** চারটি ধাঁচ · RAG round-এর হাল ধরা · "কাজ করছে কীভাবে জানেন"-এর উত্তর · loop-এ আটকে থাকা agent জোরে জোরে ভেবে debug করা · version বদলের ধাক্কা সামলানো

## 💡 মূল ধারণা

AI round transformer নিয়ে কোনো quiz নয়। এখানে যাচাই হয় **আপনি ব্যর্থতাটা কোথায় খুঁজে বের করতে পারেন, আর তার সঙ্গে
একটি সংখ্যা জুড়ে দিতে পারেন কি না।** এই অধ্যায়ের প্রতিটি প্রশ্নের দুটি রূপ আছে। একটি শুনতে জ্ঞানের প্রশ্ন। অন্যটা
আসলে মাপজোখের প্রশ্ন, আর interviewer নম্বর দেন সেই দ্বিতীয়টাতেই।

> এই অংশের senior signal একটি বাক্যে: **ভালো করার আগে মাপুন।** কী মাপবেন সেটা বলুন, আর কী বদলাবেন সেটা বলার আগেই বলুন।

## কীভাবে কাজ করে

### চারটি ধাঁচ

Senior loop-এ AI নিয়ে প্রায় প্রতিটি প্রশ্ন এই চারটির কোনো একটি, বা তারই অন্য ভাষায় বলা রূপ।

| প্রশ্ন | আসলে কী যাচাই হচ্ছে | কোথায় ভুল হয় |
| --- | --- | --- |
| "একটি RAG system design করুন" | Retrieval-কেই আপনি product হিসেবে দেখেন কি না | সোজা vector database-এ লাফ দেওয়া |
| "এই feature কীভাবে evaluate করবেন" | আপনার হাতে কখনো কোনো সংখ্যা ছিল কি না | "আমরা output-গুলো দেখেছিলাম" |
| "আপনার agent loop-এ আটকে আছে — debug করুন" | আপনি trace পড়েন কি না | System prompt নতুন করে লেখা |
| "Model-এর version বদলালে কী ভাঙে" | Model-কে dependency হিসেবে দেখেন কি না | "আমরা সবচেয়ে নতুনটা ব্যবহার করি" |

### প্রথম round — "একটি RAG system design করুন"

এটা system design round, শুধু ভেতরে একটি retrieval engine আছে। অন্য যেকোনো design round-এর মতোই হাল ধরুন: আগে
requirement, tradeoff স্পষ্ট করে বলা, সঙ্গে সংখ্যা। দেখুন
[Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)।

| পর্ব | কী করবেন | কেন নম্বর পায় |
| --- | --- | --- |
| প্রথম পাঁচ মিনিট | Corpus নিয়ে প্রশ্ন করুন: আকার, format, কত ঘন ঘন বদলায়, কে প্রশ্ন করে, ভুল উত্তরের দাম কত | পরের প্রতিটি সিদ্ধান্ত এগুলো থেকেই আসে |
| Ingestion | Chunking-এর কৌশল, আর প্রতিটি chunk কী metadata বয়ে নেয় | Quality-র সর্বোচ্চ সীমা ঠিক করে chunking |
| Retrieval | Hybrid search, `k`, reranking, আর যে filter result-কে user-এর scope-এ বেঁধে রাখে | নম্বর দেওয়া হচ্ছে এই অংশেই |
| উত্তরের পথ | Grounding-এর নিয়ম, citation, আর কিছুই না মিললে কী হয় | খালি retrieval স্বাভাবিক traffic |
| মাপজোখ | Golden set, retrieval hit rate, আর CI gate | বেশিরভাগ candidate এই অর্ধেকটা বাদ দেন |
| খরচ | প্রতি প্রশ্নে token, cache hit rate, প্রত্যাশিত volume-এ দাম | AI feature-এর প্রতিবার ব্যবহারের খরচ চোখে দেখা যায় |

দুটি প্রশ্নের উত্তর architecture-কে বাকি সবকিছুর চেয়ে বেশি বদলায়। **Corpus কত ঘন ঘন বদলায়**, সেটা ঠিক করে re-embedding
রাতের একটি job হবে, নাকি write path-এ একটি queue। **ভুল উত্তরের দাম কত**, সেটা ঠিক করে confidence কম থাকলে feature আদৌ
উত্তর দেবে কি না।

তারপর শেষ করুন মাপজোখ দিয়ে, component দিয়ে নয়। যে উত্তর শেষ হয় golden set, কোন hit rate-এ gate বসাবেন আর প্রতি
প্রশ্নের খরচ দিয়ে, সেটা vector store-এ থেমে যাওয়া উত্তরকে হারিয়ে দেয়। দেখুন
[Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals)। চালু কোনো product-এ "AI যোগ করতে" বললে প্রথম সৎ
প্রশ্ন হলো, retrieval আদৌ দরকার কি না। এর পেছনের সিদ্ধান্তটা আছে
[Chapter ?? — কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither)-এ।

### দ্বিতীয় round — "এই feature কীভাবে evaluate করবেন"

উত্তরের তিনটি অংশ, এই ক্রমে: **একটি golden set, প্রতিটি ব্যর্থতার ধরনের জন্য একটি metric, আর CI-তে একটি gate।**

- **Golden set**: পঞ্চাশ থেকে কয়েকশো আসল প্রশ্ন, যাদের ভালো উত্তর জানা, code-এর পাশেই version করা। Case-গুলো কোথা
  থেকে এলো সেটা বলুন: production trace থেকে, কল্পনা থেকে নয়।
- **প্রতিটি ব্যর্থতার ধরনের জন্য একটি metric**, কারণ এরা আলাদা আলাদা ব্যর্থ হয়। Retrieval hit rate, উত্তরের সঠিকতা আর
  citation-এর বৈধতা তিনটি আলাদা সংখ্যা, আর প্রথমটা কমলে যা দেখায়, তৃতীয়টা কমলে তার সঙ্গে কোনো মিল নেই।
- **একটি gate**, যাতে pass rate কমিয়ে দেওয়া prompt পরিবর্তন ship হতে না পারে।

Judge model-এর কথা তুললে (যে model অন্য model-এর output grade করে), সঙ্গে সঙ্গে বলুন সেটা কীভাবে যাচাই করবেন। একটি
sample হাতে grade করুন, আর কতটা মেলে মাপুন। যাচাই না করা judge মানে দশমিক বসানো একটি মতামত।
[Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals)-এ পুরো কাঠামোটা আছে।

### তৃতীয় round — "আপনার agent loop-এ আটকে আছে, debug করুন"

Trace চান। শুধু এই চাওয়াটাই আসল কথার বেশিরভাগ। হাতের কাছে trace না থাকলে বলুন তাতে কী দেখতে চাইবেন: ধাপের index,
tool-এর নাম, argument আর result।

**যে trace দেখলে দশ সেকেন্ডেই প্রশ্নটা শেষ:**

```text
step 3  search_docs({ q: "refund policy" })  →  []
step 4  search_docs({ q: "refund policy" })  →  []
step 5  search_docs({ q: "refund policy" })  →  []
```

একই argument, একই result, model-এর কাছে নতুন কোনো তথ্য পৌঁছাচ্ছে না। এটা reasoning-এর ব্যর্থতা নয়। Tool "কিছু মেলেনি,
এর বদলে এই শব্দগুলো দিয়ে চেষ্টা করুন" বলতে পারে না, তাই খালি array-কে মনে হয় সাময়িক error, যেটা আবার চেষ্টা করার মতো।
তারপর নিচের ক্রমে জোরে জোরে কারণটা সরু করে আনুন। রোগ নির্ণয় মুখে বলে যাওয়া নিজেই আলাদা একটি দক্ষতা:
[Chapter ?? — ব্যাখ্যা করা ও জোরে জোরে ভাবা](#ch-thinking-aloud) সেটা শেখায়।

| জিজ্ঞেস করুন | হ্যাঁ হলে কারণ | সমাধান |
| --- | --- | --- |
| একই tool, একই argument, বারবার? | এমন result, যেটা model ব্যর্থতা থেকে আলাদা করতে পারে না | স্পষ্ট "কিছু মেলেনি" ফেরত দিন, সঙ্গে একটি ইঙ্গিত |
| দুটি tool, দুটিই খাটতে পারে? | একটির description আরেকটির ওপর পড়ছে | দুটি মিলিয়ে দিন, বা সীমারেখা স্পষ্ট করুন |
| প্রতিটি কাজেই step cap পর্যন্ত চলে? | পূরণ করা যায় এমন কোনো থামার শর্ত নেই | Goal-এ কাজ শেষ হওয়ার শর্ত লিখে দিন |
| শুধু লম্বা কাজেই loop হয়? | Context বড় হতে হতে শুরুর state বাইরে ঠেলে দিচ্ছে | Summary করুন, বা state window-এর বাইরে রাখুন |

সীমাগুলোর নামও বলুন: step cap, token budget, আর দুটির ওপরই alert। থামতে না পারা loop যেমন bug, তেমনই খরচের incident।
মূল বিষয়বস্তু আছে [Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling)-এ।

### চতুর্থ round — "Model-এর version বদলালে কী ভাঙে"

যে কাঠামোতে জেতা যায়: **model id হলো critical path-এ থাকা একটি dependency।** Pin করা version মানে lockfile-এর একটি entry।
যে alias সবচেয়ে নতুন যা আছে তাতেই resolve হয়, সেটা মানে provider-এর সময়সূচিতে review ছাড়া একটি deploy।

তারপর বলুন কী কী সরে যায়: structured output আর tool-calling-এর format, refusal-এর সীমা, আর প্রতি token-এর দাম। Id
বদলালে prompt cache-ও cold হয়ে যায়, তাই একই quality-র upgrade-ও latency budget ভেঙে দিতে পারে।

**Upgrade থেকে কী বেরিয়ে আসে, আর তার মধ্যে আটকে দেওয়ার মতো অংশ শুধু কোনটা:**

```typescript
interface UpgradeReport {
  readonly from: string;                 // the pinned id in production
  readonly to: string;                   // the candidate
  readonly passRate: { from: number; to: number };
  readonly costPerQuestion: { from: number; to: number };
  readonly p95LatencyMs: { from: number; to: number };
  /** Cases that passed on `from` and fail on `to`. The only list that blocks a release. */
  readonly regressions: readonly string[];
}
```

তিনটি সংখ্যা একসঙ্গে নড়ে, আর রায় দেয় regression-এর তালিকা। যে upgrade pass rate দুই point বাড়ায় আর দাম দ্বিগুণ করে, সেটা
অন্য কারও নেওয়ার মতো সিদ্ধান্ত। সেটা মুখে বলে দেওয়াই senior উত্তর।

> ⚠️ **যা বদলাতে থাকে:** provider SDK, model id আর দাম, সবই কয়েক মাস পরপর বদলায়, তাই মুখস্থ করা কোনো model-এর নাম এই
> বইয়ের চেয়ে বেশিদিন টিকবে না। টেকসই নীতি ওপরেরটাই। Version একটি dependency, আর eval suite তার regression test।

## কখন ব্যবহার করবেন

| প্রশ্নটা শুনতে যেমন | আসলে যা জানতে চাইছে | পড়ুন |
| --- | --- | --- |
| "আমাদের docs-এর ওপর একটি chatbot design করুন" | Retrieval-এর quality আর তার মাপজোখ | [Chapter ?? — Embedding, Vector Store ও Retrieval](#ch-retrieval) |
| "এটা যাতে hallucinate না করে, কীভাবে আটকাবেন" | Grounding, citation আর refusal | [Chapter ?? — বিশ্বাস, নির্ভুলতা ও Failure State](#ch-trust-and-correctness-ux) |
| "এটা সস্তা করবেন কীভাবে" | Caching, routing আর token-এর হিসাব | [Chapter ?? — Observability ও Cost Engineering](#ch-observability) |
| "এটা ship করা কি নিরাপদ" | Prompt injection আর tool-এর permission | [Chapter ?? — Prompt Injection](#ch-prompt-injection) |

## সাধারণ ভুল

**❌ সবার আগে prompt-এ হাত দেওয়া**

> Prompt বদলানো সবচেয়ে সস্তা চেষ্টা, আর ফলের সঙ্গে মেলানো সবচেয়ে কঠিন। কিছু বদলানোর আগে ব্যর্থতাটা কোথায় খুঁজে বের করুন
> (retrieval, tool, নাকি generation)।

**✅ আগে রোগ নির্ণয়, তারপর সমাধান দিয়ে উত্তর দেওয়া**

> "ভুল chunk ফেরত এসেছে" আর "ঠিক chunk ফেরত এসেছে কিন্তু উত্তর সেটা উপেক্ষা করেছে", এ দুটি আলাদা bug, যাদের সমাধানও আলাদা।
> দুটিকে আলাদা করাটাই উত্তর।

**❌ খরচ নিয়ে কোনো উত্তর না থাকা**

> বহু বছরের মধ্যে এই প্রথম এমন ধরনের feature, যার প্রতি user-এর বাড়তি খরচ চোখে দেখা যায়। তাই "খরচ নিয়ে ভাবিনি" বললে senior
> round খারাপভাবে শেষ হয়।

## 🔑 মূল শিক্ষা

- AI interview-এর প্রতিটি প্রশ্ন আসলে মাপজোখের প্রশ্ন, শুধু জ্ঞানের প্রশ্নের পোশাক পরা। তাই architecture-এর আগে বলুন কোন
  সংখ্যায় gate বসাবেন।
- সমাধানের আগে রোগ নির্ণয় দিয়ে উত্তর দিন: retrieval, tool, নাকি generation, তারপর কী বদলাবেন।
- যে RAG design vector store-এ থেমে যায়, সেটা অসম্পূর্ণ; শেষ হওয়া উচিত golden set আর প্রতি প্রশ্নের খরচে।
- Agent গোলমাল করলে trace চান, আর শুধু tool-এর নাম নয়, argument-গুলো পড়ুন।
- Model version হলো pin করা dependency, আর eval suite সেই regression test, যেটা তার upgrade-এ gate বসায়।

## Interview-এর প্রশ্ন

**Q: Production-এ একটি agent loop-এ আটকে আছে। ধাপে ধাপে বলুন।**

Prompt-এ হাত দেওয়ার আগে trace পড়ি। ধরা যাক একই tool একই argument দিয়ে call হচ্ছে। তাহলে tool এমন কিছু ফেরত দিচ্ছে, যেটা
model সাময়িক ব্যর্থতা থেকে আলাদা করতে পারে না, সাধারণত একটি খালি array। সমাধান হলো এমন return value, যেটা "কিছু মেলেনি"
বলে আর পরের একটি শব্দ সাজেস্ট করে। Call আলাদা হলেও run যদি কখনো শেষ না হয়, তাহলে পূরণ করা যায় এমন থামার শর্ত নেই, আর
goal-এ কাজ শেষ হওয়ার শর্ত লাগবে। এমন দুটি tool আছে কি না দেখব, যাদের description একটি আরেকটির ওপর পড়ে। আর নিশ্চিত হব
step cap আর token budget আছে, দুটির ওপরই alert-সহ।

**Q: আপনি যে model ব্যবহার করছেন, provider ত্রিশ দিনের মধ্যে সেটা deprecate করবে। কী হবে?**

এটা critical path-এ একটি dependency upgrade, তাই অন্য যেকোনো upgrade-এর মতো একই process-এর মধ্য দিয়ে যায়। একটি branch-এ
নতুন id pin করি, দুটির ওপরই golden set চালাই, আর pass rate, প্রতি প্রশ্নের খরচ আর p95 latency তুলনা করি। আগে pass করত, এখন
fail করছে, এমন case-গুলোই আটকে দেওয়ার তালিকা। বাকিটা দাম আর গতি নিয়ে বিচার-বিবেচনার ব্যাপার। আমার ধারণা, আগে সরে যাবে
output আর tool-calling-এর format, আর নতুন id-তে prompt cache থাকবে cold। তাতে quality-র তর্ক শুরু হওয়ার আগেই latency-র
চেহারা বদলে যায়।

**Q: কখন একজন product manager-কে বলবেন AI feature বানাবেন না?**

তিনটি ক্ষেত্রে। কাজটা deterministic, আর একটি query দিয়েই উত্তর মেলে। ভুল উত্তরের দাম দ্রুত উত্তরের লাভের চেয়ে বেশি। অথবা
output ঠিক ছিল কি না বোঝার কোনো উপায় নেই। আসল বাধা শেষেরটাই। যে feature কেউ evaluate করতে পারে না, সেটা কেউ ভালোও
করতে পারে না, তাই প্রতিটি model পরিবর্তনে চুপচাপ খারাপ হতে থাকে। যে সাধারণ assistant কেউ grade করতে পারে না, তার চেয়ে
মাপা যায় এমন pass rate-সহ নির্দিষ্ট scope-এর একটি assistant ship করাই আমার পছন্দ।

## এরপর কী পড়বেন

- [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) — golden set আর CI gate, এর বেশিরভাগ উত্তর যার ওপর নির্ভর করে
- [Chapter ?? — কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither) — প্রথম round-এর পেছনের সিদ্ধান্ত
- [Chapter ?? — Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is) — তৃতীয় round যে loop debug করে
