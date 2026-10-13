---
sourceHash: "a1b269df5930832f66aed4d536e9bea3248ee8513eda1576e9693f215f23089e"
title: "Embedding, Vector Store ও Retrieval"
translatedAt: "2026-10-13T03:03:57.011Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Embedding, Vector Store ও Retrieval {#ch-retrieval}

> Text-কে vector-এ পরিণত করুন, যে database আগে থেকেই চালাচ্ছেন সেখানেই রাখুন, আর সেই অংশগুলো খুঁজে বের করুন যেগুলো প্রশ্নের উত্তর দেয়।

**এই অধ্যায়ে:** vector কী আর তার score-এর মানে কী · pgvector বনাম একটি dedicated store · keyword, vector আর hybrid search · reranking আর *k* বাছাই · filter আর query rewriting

## 💡 মূল ধারণা

Embedding text-কে সংখ্যার একটি নির্দিষ্ট দৈর্ঘ্যের তালিকায় পরিণত করে: **space-এ একটি বিন্দু**। কাছাকাছি থাকা মানে
অর্থ কাছাকাছি। "Cancel my subscription" আর "how do I close my account" কাছাকাছি গিয়ে পড়ে, যদিও দুটিতে কোনো
গুরুত্বপূর্ণ শব্দ মেলে না। Keyword search string মেলায়। Embedding search অর্থ মেলায়।

Document একবারই বিন্দু হয়, ingestion-এর সময়। Query প্রতিটি request-এ একটি বিন্দু হয়। Embedding নির্দিষ্ট token,
যেমন একটি error code বা function-এর নাম, ঝাপসা করে ফেলে। তাই keyword search এখনো জরুরি। **Production
retrieval দুটিই চালায়।** এর কাজ উত্তর দেওয়া নয়, বরং উত্তরটা window-এ ঢোকানো, ওপরের দিকে rank করে।

## কীভাবে কাজ করে

### Vector একটি বিন্দু, আর আসল ব্যাপার হলো দিক

Vector-এর কোনো একটি সংখ্যার এমন কোনো মানে নেই যেটা আপনি পড়ে বুঝতে পারবেন। মানেটা বহন করে **geometry**।
Cosine similarity দুটি vector-এর মাঝের কোণ মাপে, তাদের মাথার মধ্যে দূরত্ব নয়। তাই একই কথা ভিন্ন দৈর্ঘ্যে বলা
দুটি document-ও কাছাকাছি গণ্য হয়।

**তিনটি phrase embed করে তুলনা করা**

```typescript
import { cosineSimilarity, embedMany } from "ai";

declare const EMBEDDING_MODEL: string;

const { embeddings } = await embedMany({
  model: EMBEDDING_MODEL,
  values: ["cancel my subscription", "how do I close my account", "reset my password"],
});

cosineSimilarity(embeddings[0], embeddings[1]); // ~0.85 — same intent
cosineSimilarity(embeddings[0], embeddings[2]); // ~0.55 — both account admin, different jobs
```

**Score-গুলো rank, probability নয়।** 0.82 score মানে 82% প্রাসঙ্গিক নয়। অপ্রাসঙ্গিক text এক model-এ 0.1-এর কাছে
থাকে, আরেকটায় 0.7-এর কাছে। শুধু **ক্রম**-এরই মানে আছে। তাই ওপরের *k*-টি নিন, অথবা নিজের label করা query দিয়ে
একটি threshold মেপে নিন।

### দুই দিকেই একটি model

দুটি model-এর vector তুলনা করা যায় না। তাই query আর document একই model ব্যবহার করে, আর model বদলানো মানে সবকিছু
re-embed করা। অনেক model একটি input type-ও নেয় (query বা document)। উল্টো দিলে নিঃশব্দে recall কমে যায়।
প্রতিটি vector-এর পাশে model-এর নাম আর version রাখুন।

### Vector কোথায় থাকে: Postgres দিয়ে শুরু করুন

একটি vector store একটি query vector-এর সবচেয়ে কাছের *k*-টি vector ফেরত দেয়। বাকিটা, যেমন filter আর namespace,
সাধারণ database-এর কাজ। pgvector vector-কে একটি column type বানায়, তাই vector আপনার backup, migration, access
control আর transaction সব পেয়ে যায়। Documentation assistant তার chunk-গুলো সেই Postgres-এই রাখে, যেটা সে আগে
থেকেই চালায়।

**pgvector-এ chunk table, একটি index আর একটি filter করা query**

```sql
CREATE TABLE chunks (
  id          bigserial PRIMARY KEY,
  tenant_id   text NOT NULL,
  heading     text,
  content     text NOT NULL,
  embedding   vector(1536)
);

CREATE INDEX ON chunks USING hnsw (embedding vector_cosine_ops);
CREATE INDEX ON chunks (tenant_id);

SELECT id, heading, content
FROM chunks
WHERE tenant_id = $2                    -- filter and vector search in one planner decision
ORDER BY embedding <=> $1               -- the operator picks the distance: cosine
LIMIT 20;
```

Permission filter, similarity search আর data এক engine-এ থাকে। Index না থাকলে query প্রতিটি row-এর সাথে তুলনা করে।
সেটা নিখুঁত, আর `O(n)`। **মোটামুটি 100,000 vector-এর নিচে exact search সাধারণত যথেষ্ট**, কয়েক দশ millisecond-এ।
একটি approximate nearest-neighbour (ANN) index এক কোটি row-এও কয়েক millisecond-এ উত্তর দেয়। এটা সামান্য recall
ছেড়ে দেয়, সাধারণত আসল neighbour-দের 1–5%। **HNSW**, neighbour-দের একটি graph, বাড়তে থাকা corpus-এ মানায়, কিন্তু
বানাতে সময় লাগে আর memory লাগে। **IVFFlat** vector-গুলোকে শেখা cluster-এ ভাগ করে। এটা দ্রুত বানানো যায়, কিন্তু data
বদলালে মান পড়ে যায়, তাই মাঝে মাঝে rebuild লাগে।

> ⚠️ **Approximate index আর একটি selective filter একসাথে থাকলেই recall চুপচাপ ধসে পড়ে।** Index সব row নিয়ে
> বানানো একটি graph ঘুরে দেখে। Filter-এ যদি অল্প row মেলে, যথেষ্ট match পাওয়ার আগেই search-এর candidate ফুরিয়ে
> যায়। এটা কম বা খারাপ result ফেরত দেয়, আর কোনো error জানায় না। আপনার আসল filter দিয়ে recall পরীক্ষা করুন।

### একটি dedicated store-এর খরচ

একটি dedicated vector database কয়েক কোটি vector ছাড়িয়ে scale, আর managed sharding এনে দেয়। খরচ হলো একটি দ্বিতীয়
stateful system, যেখানে দুটির মধ্যে কোনো join বা transaction নেই। যে খরচ কেউ আগে থেকে হিসাব করে না, সেটা **sync**:
প্রতিটি deletion আর permission-এর পরিবর্তন একটি distributed operation হয়ে যায়। Sync ব্যর্থ হলে একটি chunk তার মুছে
ফেলা document-এর পরেও বেঁচে থাকে, আর পুরো আত্মবিশ্বাসের সাথে একজন user-এর কাছে cite হয়। Storage আরেকটি চমক।
একটি 1536-dimension float32 vector 6 KB, তাই দশ লাখ chunk index-এর আগেই 6 GB। HNSW memory-তে এটা দ্বিগুণ করতে
পারে। Dimension কমালে এটা কমে, যদি আপনার eval বলে recall-এর ক্ষতি মেনে নেওয়া যায়।

Assistant-এর **re-embed job** একটি page বদলালে চলে। এটা page-এর পুরোনো chunk মুছে দেয় আর নতুনগুলো লেখে, এক
transaction-এ। Embedding model বদলালে একই job প্রতিটি page-এর ওপর চলে, একটি parallel index-এ। একই প্রশ্নে দুটি
index-এর score নেওয়া হয়ে গেলে read switch করে।

> ⚠️ **যা বদলাতে থাকে:** vendor-এর তালিকা দ্রুত পুরোনো হয়ে যায়, আর pgvector ফারাক কমিয়েই চলেছে। Quantised
> (compressed) vector type আর index-এর উন্নতি প্রতি কয়েকটি release-এ আসে। নীতিটা টিকে থাকে: approximate index
> recall-এর বিনিময়ে গতি কেনে, আর আপনার filter ছাড়া একটি benchmark কোনোটাই মাপে না।

### তিনটি search mode, তিনটি অন্ধ জায়গা

| Mode | যা খুঁজে পায় | যা বাদ পড়ে | খরচ |
| --- | --- | --- | --- |
| **Keyword (BM25)** | নির্দিষ্ট term, code, নাম, বিরল শব্দ | Paraphrase, সমার্থক শব্দ | সস্তা, কোনো embedding call নেই |
| **Vector** | অর্থ, paraphrase, অন্য ভাষা | Identifier, সংখ্যা, negation | প্রতি query-তে একটি embedding call |
| **Hybrid** | দুটিই | সামান্য; দুটির recall-ই পায় | দুটি search আর fusion |

Negation সেই অন্ধ জায়গা, যেটা সবাই ভুলে যায়: "deployments that do **not** use the cache" তার বিপরীতের কাছে
embed হয়। সংখ্যা আর তারিখও খারাপভাবে embed হয়, তাই এদের জায়গা metadata filter-এ।

### Hybrid search, আর দুটি তালিকা মেলানো

BM25, keyword-ranking-এর standard formula, সীমাহীন score দেয়, cosine দেয় না। তাই দুটিকে এক মাপকাঠিতে আনা
ভঙ্গুর। **Reciprocal rank fusion** এর বদলে rank ব্যবহার করে, আর calibrate করার কিছু থাকে না।

**একটি keyword তালিকা আর একটি vector তালিকার ওপর reciprocal rank fusion**

```typescript
declare const q: string;
declare function keywordSearch(query: string, limit: number): Promise<string[]>;
declare function vectorSearch(query: string, limit: number): Promise<string[]>;

function fuse(lists: string[][], k = 60): string[] {
  const score = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => score.set(id, (score.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return [...score].sort((a, b) => b[1] - a[1]).map(([id]) => id);
}

const merged = fuse([await keywordSearch(q, 50), await vectorSearch(q, 50)]).slice(0, 20);
```

যে document-কে দুটি তালিকাই ওপরে rank করে, সে এমন document-এর ওপরে ওঠে যাকে শুধু একটি তালিকা পছন্দ করেছে।

### Reranking আর *k* বাছাই

Retriever **recall**-এর জন্য optimise করে। Reranker **precision**-এর জন্য optimise করে। একটি vector search আলাদাভাবে
হিসাব করা দুটি embedding তুলনা করে, তাই document কখনো query-কে দেখে না। একটি cross-encoder reranker query আর
passage **একসাথে** পড়ে, আর জোড়াটিকে score দেয়। এটা অনেক বেশি নিখুঁত, কিন্তু আগে থেকে হিসাব করে রাখা যায় না। এটা
100–400 ms আর প্রতি document-এ একটি খরচ যোগ করে। ওপরের পাঁচটিতেই উত্তর থাকলে এটা বাদ দিন।

পাঠানো প্রতিটি chunk window-এর জায়গা আর token খরচ করে, আর noise বাড়ায়। তাই **চওড়া আর সস্তায় retrieve করুন,
সরু করে rerank করুন, অল্প পাঠান**: দুটি top-50 তালিকা fuse করুন, 20-টি rerank করুন, 5-টি পাঠান। Assistant
`k = 5`-এ rerank করে।

### Filter-ই access control

User-রা যদি ভিন্ন ভিন্ন document দেখতে পারে, তাহলে filter-**ই** access control। এটা search-এর ভেতরে চলে, পরে নয়।

**Engine-এর ভেতরে tenant আর role দিয়ে pre-filtering**

```typescript
import { embed } from "ai";

declare const index: { query(q: object): Promise<unknown[]> };
declare const userQuery: string;
declare const user: { tenantId: string; roles: string[] };

const { embedding } = await embed({ model: EMBEDDING_MODEL, value: userQuery });
const hits = await index.query({
  vector: embedding,
  topK: 50,
  filter: { tenantId: user.tenantId, visibility: { $in: user.roles } }, // pre-filter, in the engine
});
```

Application code-এ filter করা দুইভাবে ব্যর্থ হয়। সব 50-টিই লুকানো থাকলে user কিছুই পায় না। আর যে এটা "ঠিক" করতে
limit বাড়ায়, সে একটি leak-এর সুযোগ করে দেয়।

### Query rewriting

User-এর শব্দ প্রায়ই corpus-এর শব্দ নয়। দুটি সমাধান কাজে লাগে:

- **Rewriting** history ব্যবহার করে "and what about the other one?"-কে একটি স্বয়ংসম্পূর্ণ প্রশ্নে পরিণত করে।
  এটা ছাড়া follow-up প্রশ্ন noise retrieve করে। Multi-turn RAG-এর সবচেয়ে সাধারণ bug এটাই।
- **Multi-query expansion** দুই-তিনটি ভিন্ন phrasing দিয়ে search করে আর result-গুলো fuse করে, recall কেনে।

> ⚠️ দুটিই retrieval শুরুর আগে একটি পুরো model round trip যোগ করে। Assistant তার ছোট, দ্রুত model দিয়ে rewrite
> করে। আপনার traffic-এ recall-এর লাভ latency-র দাম মেটায় কি না, তা মেপে দেখুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Design |
| --- | --- |
| মোটামুটি 100k chunk-এর নিচে, production-এ Postgres | pgvector, প্রথমে exact search |
| 100k–5M chunk | HNSW-সহ pgvector |
| কয়েক কোটি, বা load-এর বেশিরভাগ vector search | একটি dedicated store |
| Code আর নামে ভরা technical docs | Hybrid, keyword-এর দিকে বেশি ওজন |
| বড় corpus, অস্পষ্ট প্রশ্ন | Hybrid আর reranking |
| Multi-tenant বা role অনুযায়ী সীমিত document | Engine-এ pre-filter, সবসময় |
| Conversational assistant | Query rewriting, নইলে follow-up ব্যর্থ হয় |

এই পরিবর্তনগুলোর কোনোটা কাজে লাগল কি না জানতে, একটি golden set-এ recall@k মাপুন। সেটা
[Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals)।

## সাধারণ ভুল

**❌ একটি similarity threshold hard-code করা**

> `if (score > 0.75)` model, corpus বা query type পেরিয়ে খাটে না। ওপরের *k*-টি নিন, অথবা নিজের label করা query
> দিয়ে cut-off মেপে নিন।

**❌ Re-embed না করে embedding model বদলানো**

> Store-এ এখন দুটি বেমানান geometry। Result বিশ্বাসযোগ্য দেখায়, কিন্তু মান খারাপ। সবকিছু একটি parallel index-এ
> re-embed করুন, তারপর read switch করুন।

**❌ Ranking-এর সমস্যা সারাতে *k* বাড়ানো**

> বেশি chunk মানে বেশি খরচ, বেশি noise আর খারাপ উত্তর। বরং rerank করুন।

**✅ প্রতিটি vector-এর সাথে model version, আর প্রতিটি request-এর সাথে retrieve করা chunk log করুন**

> উত্তর ভুল হলে প্রথম প্রশ্ন হলো, সঠিক অংশটি আদৌ retrieve হয়েছিল কি না। এই দুটি record সেই প্রশ্নকে পাঁচ মিনিটের
> একটি পরীক্ষায় পরিণত করে।

## 🔑 মূল শিক্ষা

- Embedding এমন একটি বিন্দু, যেখানে কাছাকাছি থাকা মানে অর্থ কাছাকাছি। এর similarity score rank, probability নয়।
- Query আর document-কে একই embedding model ব্যবহার করতে হবে। তাই model বদলানো মানে একটি parallel index-এ পুরো re-embed।
- Scale বাধ্য না করা পর্যন্ত vector আগে থেকে চালানো database-এই রাখুন। দ্বিতীয় store একটি sync pipeline আনে, যেটা নিঃশব্দে ব্যর্থ হয়।
- Keyword আর vector search উল্টো ধরনের query-তে ব্যর্থ হয়। তাই দুটিই চালান, rank দিয়ে fuse করুন, আর চওড়া candidate set rerank করে অল্প কয়েকটিতে নামান।
- Permission filter search engine-এর ভেতরে চলে, আর conversational query retrieval-এর আগে স্বয়ংসম্পূর্ণ query-তে rewrite করা হয়।

## Interview-এর প্রশ্ন

**Q: 0.82 cosine similarity আপনাকে কী বলে?**

এটুকুই যে, একই model আর corpus-এ 0.6 score পাওয়া জোড়ার চেয়ে এই জোড়াটি বেশি কাছাকাছি। এর বেশি কিছু নয়। এটা
probability নয়, আর model পেরিয়ে তুলনাও করা যায় না। অপ্রাসঙ্গিক text এক model-এ 0.7, আরেকটায় 0.1 score পেতে
পারে। যেকোনো absolute cut-off আসল corpus-এর label করা উদাহরণ দিয়ে calibrate করতে হবে।

**Q: pgvector, নাকি একটি dedicated vector database?**

Scale সত্যিই অন্য কিছু দাবি না করা পর্যন্ত pgvector। এটা vector-কে এমন একটি database-এর column বানায়, যেটা আমি
আগে থেকেই backup, migrate আর secure করি। তখন filtering আর similarity একটিই planner-এর সিদ্ধান্ত হয়ে যায়। একটি
dedicated store একটি দ্বিতীয় system আর একটি sync pipeline যোগ করে। এর সাধারণ failure হলো একটি মুছে ফেলা document,
যেটা তখনও cite হয়। আমি কয়েক কোটি vector-এ সরে যাব, অথবা যখন vector-এর load transactional traffic-এর ক্ষতি করতে
শুরু করবে।

**Q: Vector, keyword, নাকি দুটিই?**

দুটিই, প্রায় প্রতিটি production system-এ, কারণ এরা ভিন্ন query-তে ব্যর্থ হয়। Vector search paraphrase সামলায় আর
error code মিস করে। Keyword search ঠিক উল্টো। আমি score normalise না করে rank দিয়ে fuse করব। খুব ছোট corpus-এ
আমি একটি দিয়ে শুরু করব, যতক্ষণ না eval দেখায় কোন query ব্যর্থ হচ্ছে।

**Q: Reranker এমন কী করে যা retriever পারে না?**

এটা query আর passage একসাথে পড়ে। একটি vector search আলাদাভাবে হিসাব করা embedding তুলনা করে। এতে এটা দ্রুত হয়
আর আগে থেকে হিসাব করে রাখা যায়, কিন্তু precision সীমিত থাকে। একটি cross-encoder জোড়াটিকে সরাসরি score দেয়।
এটা বেশি নিখুঁত, কিন্তু কখনো আগে থেকে হিসাব করা যায় না। তাই সস্তায় পঞ্চাশটি retrieve করুন, বিশটি rerank করুন,
পাঁচটি পাঠান।

**Q: একজন user যা দেখতে পারে, retrieval-কে তার মধ্যে কীভাবে সীমিত রাখবেন?**

Query-র অংশ হিসেবে search engine-এর ভেতরেই filter করুন, ingestion-এর সময় প্রতিটি chunk-এ রাখা tenant আর role field
দিয়ে। পরে filter করলে যত result চাওয়া হয়েছিল তার চেয়ে কম আসে, আর access control চলে যায় application code-এ,
যেখানে কেউ না কেউ limit বাড়িয়ে দেবে। Approximate index থাকলে আমি সেই filter-সহ recall-ও পরীক্ষা করব, কারণ
selective filter-এই recall ধসে পড়ে।

## এরপর কী পড়বেন

- [Chapter ?? — Ingestion ও Chunking](#ch-ingestion-and-chunking) — আপনি যা embed করেন, সেটাই ঠিক করে আপনি কী খুঁজে পাবেন
- [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) — recall@k, আর এর কোনোটা কাজে লাগল কি না কীভাবে জানবেন
