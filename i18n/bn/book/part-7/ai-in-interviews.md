---
sourceHash: "f906c6931364894fd909048e7dda627191189a5d13039d477acffb1c353aa85b"
title: "Interview-এ AI"
translatedAt: "2026-10-13T03:03:39.949Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Interview-এ AI {#ch-ai-in-interviews}

> একটি senior loop আসলে যে চারটি AI প্রশ্ন করে, সেগুলো নিজে চালিয়ে নিন — আর প্রতিটি শেষ করুন সেই সংখ্যা দিয়ে, যেটা প্রশ্নটার নিষ্পত্তি করে।

**এই অধ্যায়ে:** চারটি archetype · RAG round চালানো · "কাজ করছে কীভাবে জানেন"-এর উত্তর · loop করা একটি agent জোরে জোরে debug করা · version change সামলানো

## 💡 মূল ধারণা

AI round transformer নিয়ে কোনো quiz নয়। এটা যাচাই করে, **আপনি একটি failure খুঁজে বের করে তার সঙ্গে একটি সংখ্যা
জুড়তে পারেন কি না।** এই অধ্যায়ের প্রতিটি প্রশ্নের দুটি রূপ আছে। একটি শুনতে জ্ঞানের প্রশ্ন মনে হয়। অন্যটি আসলে
মাপজোখের প্রশ্ন, আর interviewer নম্বর দেন সেই দ্বিতীয়টিতেই।

> এই part-এর senior সংকেত এক বাক্যে: **উন্নতি করার আগে মাপুন।** কী মাপবেন সেটা বলুন, আর সেটা বলুন কী বদলাবেন
> তা বলার আগে।

## কীভাবে কাজ করে

### চারটি archetype

একটি senior loop-এর প্রায় প্রতিটি AI প্রশ্ন এই চারটির একটি, বা তার কোনো একটির অন্য ভাষায় বলা রূপ।

| প্রশ্নটি | আসলে কী যাচাই হচ্ছে | কোথায় ভুল হয় |
| --- | --- | --- |
| "একটি RAG system design করুন" | আপনি retrieval-কেই product হিসেবে দেখেন কি না | সোজা vector database-এ লাফিয়ে পড়া |
| "এই feature-টি কীভাবে evaluate করবেন" | আপনার হাতে কখনো কোনো সংখ্যা ছিল কি না | "আমরা output-গুলো দেখেছিলাম" |
| "আপনার agent loop করছে — debug করুন" | আপনি trace পড়েন কি না | System prompt নতুন করে লেখা |
| "Model-এর version বদলালে কী ভাঙে" | আপনি model-কে dependency হিসেবে দেখেন কি না | "আমরা সবচেয়ে নতুনটা ব্যবহার করি" |

### প্রথম round — "একটি RAG system design করুন"

এটা একটি system design round, যার ভেতরে একটি retrieval engine আছে। অন্য যেকোনো design round-এর মতোই চালান:
আগে requirement, tradeoff স্পষ্ট করে বলা, সংখ্যা জুড়ে দেওয়া।
[Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round) দেখুন।

| ধাপ | কী করবেন | কেন নম্বর পায় |
| --- | --- | --- |
| প্রথম পাঁচ মিনিট | Corpus নিয়ে প্রশ্ন করুন: আকার, format, কত ঘন ঘন বদলায়, কে প্রশ্ন করে, ভুল উত্তরের দাম কত | পরের সব সিদ্ধান্ত এগুলো থেকেই আসে |
| Ingestion | Chunking strategy, আর প্রতিটি chunk কোন metadata বহন করে | Quality-র সর্বোচ্চ সীমা ঠিক করে chunking |
| Retrieval | Hybrid search, `k`, reranking, আর যে filter result-কে user-এর মধ্যে সীমাবদ্ধ রাখে | এই অংশেই নম্বর দেওয়া হচ্ছে |
| Answer path | Grounding-এর নিয়ম, citation, আর কিছু match না করলে কী হয় | খালি retrieval স্বাভাবিক traffic |
| মাপজোখ | Golden set, retrieval hit rate, আর CI gate | যে অর্ধেক বেশিরভাগ candidate বাদ দেন |
| খরচ | প্রতি প্রশ্নে token, cache hit rate, প্রত্যাশিত volume-এ দাম | AI feature-এর marginal cost চোখে দেখা যায় |

দুটি clarifying উত্তর architecture-কে অন্য যেকোনো কিছুর চেয়ে বেশি বদলায়। **Corpus কত ঘন ঘন বদলায়**, সেটা ঠিক
করে re-embedding একটি nightly job হবে, নাকি write path-এ একটি queue। **ভুল উত্তরের দাম কত**, সেটা ঠিক করে
confidence কম থাকলে feature-টি আদৌ উত্তর দিতে পারবে কি না।

তারপর শেষ করুন মাপজোখ দিয়ে, component দিয়ে নয়। যে উত্তর golden set, যে hit rate-এ gate করবেন সেটা, আর প্রতি
প্রশ্নের খরচ দিয়ে শেষ হয়, সেটা vector store-এ থেমে যাওয়া উত্তরকে হারিয়ে দেয়।
[Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) দেখুন। চালু কোনো product-এ "AI যোগ করতে"
বলা হলে, সৎ প্রথম প্রশ্ন হলো retrieval আদৌ দরকার কি না।
[Chapter ?? — কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither) এর পেছনের
সিদ্ধান্ত।

### দ্বিতীয় round — "এই feature-টি কীভাবে evaluate করবেন"

উত্তরের তিনটি অংশ, এই ক্রমে: **একটি golden set, প্রতিটি failure mode-এর জন্য একটি metric, আর CI-তে একটি gate।**

- **Golden set**: পঞ্চাশ থেকে কয়েকশো বাস্তব প্রশ্ন, যাদের সঠিক উত্তর জানা, code-এর পাশে version করা। Case-গুলো
  কোথা থেকে এসেছে বলুন: production trace থেকে, কল্পনা থেকে নয়।
- **প্রতিটি failure mode-এর জন্য একটি metric**, কারণ এরা আলাদা আলাদাভাবে fail করে। Retrieval hit rate, answer
  correctness আর citation validity তিনটি আলাদা সংখ্যা। প্রথমটির পতন তৃতীয়টির পতনের মতো একদমই দেখায় না।
- **একটি gate**, যাতে pass rate কমিয়ে দেওয়া কোনো prompt change ship হতে না পারে।

যদি একটি judge model প্রস্তাব করেন (যে model অন্য model-এর output-কে নম্বর দেয়), সঙ্গে সঙ্গে বলুন সেটাকে কীভাবে
validate করবেন। একটি sample হাতে grade করুন আর মিল কতটা তা মাপুন। Validate না করা judge হলো দশমিক বিন্দুওয়ালা
একটি মতামত। [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals)-এ পুরো কাঠামোটি আছে।

### তৃতীয় round — "আপনার agent loop করছে, debug করুন"

Trace চেয়ে নিন। শুধু এই অনুরোধটাই মূল বিষয়ের বেশিরভাগ। হাতের কাছে trace না থাকলে বলুন তাতে কী দেখতে চাইতেন:
step index, tool-এর নাম, argument, আর result।

**যে trace এই প্রশ্নটা দশ সেকেন্ডে শেষ করে দেয়:**

```text
step 3  search_docs({ q: "refund policy" })  →  []
step 4  search_docs({ q: "refund policy" })  →  []
step 5  search_docs({ q: "refund policy" })  →  []
```

একই argument, একই result, model-এর কাছে নতুন কোনো তথ্য পৌঁছাচ্ছে না। এটা reasoning-এর failure নয়। Tool-টি
"কোনো match নেই, বরং এই term-গুলো চেষ্টা করুন" বলতে পারে না, তাই একটি খালি array model-এর কাছে একটি সাময়িক
error হিসেবে পড়ে, যা আবার চেষ্টা করার মতো। এরপর জোরে জোরে কারণটা সংকুচিত করুন, নিচের ক্রমে। একটি diagnosis
মুখে বলে যাওয়া নিজেই একটি দক্ষতা: [Chapter ?? — ব্যাখ্যা করা ও জোরে জোরে ভাবা](#ch-thinking-aloud) সেটা শেখায়।

| প্রশ্ন করুন | উত্তর হ্যাঁ হলে কারণ | সমাধান |
| --- | --- | --- |
| একই tool, একই argument, বারবার? | এমন একটি result, যেটা model failure থেকে আলাদা করতে পারে না | স্পষ্ট "কোনো match নেই" আর একটি hint return করুন |
| দুটি tool, যাদের দুটিই যুক্তিসঙ্গতভাবে খাটতে পারে? | Description একটি আরেকটির ওপর পড়ছে | দুটি এক করুন, বা boundary স্পষ্ট করুন |
| প্রতিটি task-এ step cap পর্যন্ত চলে? | পূরণ করা যায় এমন কোনো stop condition নেই | Goal-এ completion criterion লিখে দিন |
| শুধু লম্বা task-এ loop করে? | Context বেড়ে গিয়ে শুরুর state বের করে দিচ্ছে | Summarise করুন, বা state window-এর বাইরে রাখুন |

সীমাগুলোর নামও বলুন: একটি step cap, একটি token budget, আর দুটির ওপরই alert। নিয়ন্ত্রণের বাইরে চলে যাওয়া loop
একটি bug, আবার একটি cost incident-ও। [Chapter ?? — Tool Calling ও Tool Surface](#ch-tool-calling) এর
ভিত্তির material।

### চতুর্থ round — "Model-এর version বদলালে কী ভাঙে"

যে framing জেতে: **একটি model id হলো critical path-এ থাকা একটি dependency।** একটি pinned version হলো lockfile-এর
একটি entry। যে alias সবচেয়ে নতুন যা আছে তাতে resolve হয়, সেটা provider-এর সময়সূচিতে হওয়া একটি review-না-করা
deploy।

তারপর বলুন কী drift করে: structured output আর tool-calling-এর format, refusal-এর সীমা, আর প্রতি token-এর দাম।
Id বদলালে prompt cache-ও cold হয়ে যায়। তাই একই quality-র একটি upgrade-ও latency budget ভেঙে দিতে পারে।

**একটি upgrade কী তৈরি করে, আর তার একমাত্র blocking অংশ:**

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

তিনটি সংখ্যা একসঙ্গে নড়ে, আর সিদ্ধান্ত নেয় regression list। যে upgrade pass rate দুই point বাড়ায় আর দাম দ্বিগুণ
করে, সেই সিদ্ধান্ত অন্য কারো নেওয়ার। আর সেটা বলাটাই senior উত্তর।

> ⚠️ **যা বদলাতে থাকে:** provider SDK, model id আর pricing — সবই কয়েক মাস পরপর বদলায়। তাই মুখস্থ করা কোনো model-এর
> নাম এই বইয়ের মেয়াদ পর্যন্ত টিকবে না। টেকসই নীতি ওপরেরটাই। Version একটি dependency, আর eval suite তার
> regression test।

## কখন ব্যবহার করবেন

| প্রশ্নটা যখন শোনায় এমন | আসলে যা জানতে চাইছে | পড়ুন |
| --- | --- | --- |
| "আমাদের doc-এর ওপর একটি chatbot design করুন" | Retrieval-এর quality আর তার মাপজোখ | [Chapter ?? — Embedding, Vector Store ও Retrieval](#ch-retrieval) |
| "এটার hallucination কীভাবে থামাবেন" | Grounding, citation আর refusal | [Chapter ?? — বিশ্বাস, নির্ভুলতা ও Failure State](#ch-trust-and-correctness-ux) |
| "এটা কীভাবে সস্তা করবেন" | Caching, routing আর token-এর হিসাব | [Chapter ?? — Observability ও Cost Engineering](#ch-observability) |
| "এটা ship করা কি নিরাপদ" | Prompt injection আর tool permission | [Chapter ?? — Prompt Injection](#ch-prompt-injection) |

## সাধারণ ভুল

**❌ সবার আগে prompt-এ হাত দেওয়া**

> Prompt change চেষ্টা করা সবচেয়ে সস্তা, আর কোনো result-এর সঙ্গে তার সম্পর্ক খুঁজে পাওয়া সবচেয়ে কঠিন। কিছু
> বদলানোর আগে failure কোথায় তা খুঁজে বের করুন (retrieval, tool, নাকি generation)।

**✅ আগে diagnosis, তারপর fix দিয়ে উত্তর দেওয়া**

> "ভুল chunk ফিরে এসেছে" আর "ঠিক chunk ফিরে এসেছে, কিন্তু উত্তর সেটাকে উপেক্ষা করেছে" — এরা দুটি আলাদা bug,
> দুটির সমাধানও আলাদা। এদের আলাদা করাটাই উত্তর।

**❌ খরচ নিয়ে কোনো উত্তর না থাকা**

> বহু বছরের মধ্যে এটাই প্রথম ধরনের feature, যার প্রতি user-এ বাড়তি খরচ চোখে দেখা যায়। তাই "খরচ নিয়ে আমি ভাবিনি"
> বললে একটি senior round খারাপভাবে শেষ হয়।

## 🔑 মূল শিক্ষা

- প্রতিটি AI interview প্রশ্ন আসলে মাপজোখের প্রশ্ন, যে জ্ঞানের প্রশ্নের পোশাক পরে আছে। তাই architecture-এর আগে
  বলুন কোন সংখ্যায় gate করবেন।
- Fix-এর আগে diagnosis দিয়ে উত্তর দিন: retrieval, tool, নাকি generation, তারপর কী বদলাবেন।
- যে RAG design vector store-এ শেষ হয়, সেটা অসম্পূর্ণ; সেটা শেষ হয় golden set আর প্রতি প্রশ্নের খরচে।
- Agent ঠিকমতো না চললে trace চেয়ে নিন, আর শুধু tool-এর নাম নয়, argument-ও পড়ুন।
- একটি model version হলো একটি pinned dependency, আর eval suite হলো সেই regression test, যেটা তার upgrade-এ gate করে।

## Interview-এর প্রশ্ন

**Q: Production-এ একটি agent loop করছে। পুরো ব্যাপারটা আমাকে বুঝিয়ে বলুন।**

Prompt-এ হাত দেওয়ার আগে আমি trace পড়ি। ধরা যাক একই tool একই argument দিয়ে call হচ্ছে। তাহলে সেটা এমন কিছু
return করছে, যেটা model একটি সাময়িক failure থেকে আলাদা করতে পারে না, সাধারণত একটি খালি array। সমাধান হলো এমন
একটি return value, যেটা "কোনো match নেই" বলে আর পরের একটি term প্রস্তাব করে। যদি call-গুলো আলাদা হয় কিন্তু run
কখনো শেষ না হয়, তাহলে পূরণ করা যায় এমন কোনো stop condition নেই, আর goal-এ একটি completion criterion দরকার। আমি
এমন দুটি tool-ও খুঁজব, যাদের description একটি আরেকটির ওপর পড়ে। আর নিশ্চিত হব যে একটি step cap আর একটি token
budget আছে, দুটির ওপরই alert সহ।

**Q: আপনি যে model-এ আছেন, provider সেটা তিরিশ দিনের মধ্যে deprecate করছে। কী হবে?**

এটা critical path-এ একটি dependency upgrade, তাই এটা অন্য যেকোনোটার মতো একই প্রক্রিয়ার মধ্য দিয়ে যায়। একটি
branch-এ candidate id pin করুন, দুটির ওপরই golden set চালান, আর pass rate, প্রতি প্রশ্নের খরচ আর p95 latency
তুলনা করুন। যে case-গুলো আগে pass করত আর এখন fail করে, সেগুলোই blocking list। বাকিটা দাম আর গতি নিয়ে একটি
বিচারের ব্যাপার। আমি আশা করব output আর tool-calling-এর format আগে drift করবে, আর নতুন id-তে prompt cache cold
থাকবে। এটা quality-র তর্ক শুরু হওয়ার আগেই latency profile বদলে দেয়।

**Q: কখন আপনি একজন product manager-কে একটি AI feature না বানাতে বলবেন?**

তিনটি ক্ষেত্রে। Task-টি deterministic, আর একটি query-ই এর উত্তর দিতে পারত। একটি ভুল উত্তরের দাম একটি দ্রুত
উত্তরের মূল্যের চেয়ে বেশি। অথবা output ঠিক ছিল কি না তা বোঝার কোনো উপায় নেই। শেষ ক্ষেত্রটাই আসল বাধা। যে
feature কেউ evaluate করতে পারে না, সেটার উন্নতিও কেউ করতে পারে না। তাই প্রতিটি model change-এর সঙ্গে সেটা
চুপচাপ খারাপ হতে থাকে। যে general assistant কেউ grade করতে পারে না, তার চেয়ে আমি বরং মাপা যায় এমন pass rate-ওয়ালা
একটি সীমিত assistant ship করব।

## এরপর কী পড়বেন

- [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) — golden set আর CI gate, যার ওপর এই উত্তরগুলোর বেশিরভাগ নির্ভর করে
- [Chapter ?? — কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither) — প্রথম round-এর পেছনের সিদ্ধান্ত
- [Chapter ?? — Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is) — তৃতীয় round যে loop debug করে
