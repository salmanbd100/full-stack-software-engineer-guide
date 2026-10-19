---
sourceHash: "a1b269df5930832f66aed4d536e9bea3248ee8513eda1576e9693f215f23089e"
title: "Embedding, Vector Store ও Retrieval"
translatedAt: "2026-10-19T07:58:04.113Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Embedding, Vector Store ও Retrieval {#ch-retrieval}

> Text-কে vector বানান, সেগুলো রাখুন যে database আপনি আগে থেকেই চালান তাতে, আর খুঁজে বের করুন সেই passage-গুলো, যা প্রশ্নের উত্তর দেয়।

**এই অধ্যায়ে:** vector কী, আর তার score কী বোঝায় · pgvector বনাম আলাদা store · keyword, vector আর hybrid search · reranking আর *k* বাছাই · filter আর query rewriting

## 💡 মূল ধারণা

Embedding text-কে নির্দিষ্ট দৈর্ঘ্যের সংখ্যার একটি তালিকা বানিয়ে দেয়: **space-এর একটি বিন্দু**। কাছাকাছি থাকা মানে
অর্থ কাছাকাছি। "Cancel my subscription" আর "how do I close my account" পাশাপাশি এসে পড়ে, যদিও দুটিতে কোনো
গুরুত্বপূর্ণ শব্দ মেলে না। Keyword search string মেলায়। Embedding search মেলায় অর্থ।

Document বিন্দু হয় একবারই, ingestion-এর সময়। Query বিন্দু হয় প্রতিটি request-এ। Embedding নির্দিষ্ট token-কে
ঝাপসা করে দেয়, যেমন error code বা function-এর নাম, তাই keyword search-এর দরকার এখনো থাকে। **Production-এর
retrieval দুটিই চালায়।** এর কাজ উত্তর দেওয়া নয়, উত্তরটাকে window-এ পৌঁছে দেওয়া, তাও ওপরের দিকে।

## কীভাবে কাজ করে

### Vector একটি বিন্দু, আর আসল ব্যাপার হলো দিক

Vector-এর কোনো একটি সংখ্যা আলাদা করে পড়ে কিছু বোঝা যায় না। অর্থ বহন করে তার **জ্যামিতি**। Cosine similarity দুটি
vector-এর মধ্যের কোণ মাপে, তাদের মাথার দূরত্ব নয়। তাই একই কথা ভিন্ন দৈর্ঘ্যে বলা দুটি document-কেও কাছাকাছি ধরা হয়।

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

**Score-গুলো ক্রম বোঝায়, সম্ভাবনা নয়।** 0.82 score মানে 82% প্রাসঙ্গিক নয়। সম্পর্কহীন text একটি model-এ 0.1-এর
কাছে থাকে, আরেকটিতে 0.7-এর কাছে। অর্থ আছে শুধু **ক্রমের**, তাই ওপরের *k*-টা নিন, কিংবা নিজের label দেওয়া query
দিয়ে threshold মেপে নিন।

### দুই দিকেই একটি model

দুটি model-এর vector তুলনা করা যায় না। তাই query আর document একই model ব্যবহার করে, আর model বদলানো মানে সবকিছু আবার
embed করা। অনেক model একটি input type-ও নেয় (query নাকি document)। উল্টো দিলে চুপচাপ recall কমে যায়। প্রতিটি vector-এর
পাশে model-এর নাম আর version রাখুন।

### Vector কোথায় থাকবে: শুরু করুন Postgres দিয়ে

Vector store একটি query vector-এর সবচেয়ে কাছের *k*-টা vector ফেরত দেয়। বাকি সব, যেমন filter আর namespace, সাধারণ
database-এর কাজ। pgvector vector-কে একটি column type বানিয়ে দেয়, ফলে vector পেয়ে যায় আপনার backup, migration,
access control আর transaction। Documentation assistant তার chunk রাখে সেই Postgres-এই, যা আগে থেকেই চলছে।

**pgvector-এ chunks table, একটি index আর একটি filter করা query**

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

Permission filter, similarity search আর data, তিনটিই থাকে একই engine-এ। Index না থাকলে query প্রতিটি row-এর সঙ্গে
তুলনা করে। সেটা নিখুঁত, আর `O(n)`। **মোটামুটি 100,000 vector-এর নিচে exact search সাধারণত যথেষ্ট**, কয়েক দশ
millisecond-এ। Approximate nearest-neighbour (ANN) index এক কোটি row-এও কয়েক millisecond-এ উত্তর দেয়। বদলে একটু
recall ছাড়তে হয়, সাধারণত আসল প্রতিবেশীদের 1–5%। **HNSW** হলো প্রতিবেশীদের একটি graph। বাড়তে থাকা corpus-এ এটা
মানায়, কিন্তু বানাতে সময় লাগে আর memory লাগে। **IVFFlat** vector-গুলোকে শেখা cluster-এ ভাগ করে। দ্রুত বানানো
যায়, কিন্তু data সরে গেলে মান পড়ে যায়, তাই মাঝে মাঝে rebuild লাগে।

> ⚠️ **Approximate index-এর সঙ্গে বাছাই করা filter মিললেই recall চুপচাপ ধসে পড়ে।** Index যে graph ধরে হাঁটে, সেটা
> সব row-এর ওপর বানানো। Filter-এ যদি অল্প row মেলে, যথেষ্ট match পাওয়ার আগেই search-এর candidate ফুরিয়ে যায়।
> ফল আসে কম বা খারাপ, আর কোনো error-ও দেখায় না। আপনার আসল filter দিয়ে recall পরীক্ষা করুন।

### আলাদা store-এর দাম

আলাদা vector database দেয় কয়েক কোটি vector ছাড়িয়ে যাওয়ার মতো scale, আর managed sharding। দাম হলো দ্বিতীয় একটি
stateful system, যার সঙ্গে প্রথমটার কোনো join বা transaction চলে না। যে খরচ কেউ আগে হিসাব করে না, তা হলো **sync**:
প্রতিটি deletion আর permission-এর বদল তখন distributed operation হয়ে যায়। Sync ব্যর্থ হলে একটি chunk তার মুছে ফেলা
document-এর পরেও টিকে থাকে, আর পুরো আত্মবিশ্বাস নিয়ে user-এর সামনে cite হয়। Storage হলো আরেকটি চমক। 1536-dimension-এর
একটি float32 vector 6 KB, তাই index ছাড়াই দশ লাখ chunk মানে 6 GB। HNSW memory-তে এটা দ্বিগুণ করতে পারে। Dimension কমালে
এটা কমে, যদি আপনার eval বলে recall-এর ক্ষতিটা মেনে নেওয়া যায়।

Assistant-এর **re-embed job** চলে কোনো page বদলালে। সেটা page-এর পুরনো chunk মুছে নতুনগুলো লেখে, একটি transaction-এ।
Embedding model বদলালে একই job প্রতিটি page-এর ওপর চলে, একটি সমান্তরাল index-এ লিখে। দুটি index-কেই একই প্রশ্নে score
করার পরে read নতুনটায় সরে যায়।

> ⚠️ **যা বদলাতে থাকে:** vendor-এর তালিকা দ্রুত পুরনো হয়, আর pgvector ব্যবধান কমিয়েই চলেছে। Quantised (সংকুচিত)
> vector type আর index-এর উন্নতি প্রতি কয়েকটি release-এ আসে। নীতিটা টিকে থাকে: approximate index recall দিয়ে গতি
> কেনে, আর আপনার filter ছাড়া চালানো benchmark এর কোনোটাই মাপে না।

### তিনটি search mode, তিনটি অন্ধ জায়গা

| Mode | যা খুঁজে পায় | যা ফসকায় | খরচ |
| --- | --- | --- | --- |
| **Keyword (BM25)** | হুবহু term, code, নাম, বিরল শব্দ | একই কথা অন্যভাবে বলা, সমার্থক শব্দ | সস্তা, embedding call লাগে না |
| **Vector** | অর্থ, অন্যভাবে বলা কথা, অন্য ভাষা | Identifier, সংখ্যা, negation | প্রতি query-তে একটি embedding call |
| **Hybrid** | দুটিই | সামান্য; দুটির recall-ই পায় | দুটি search, সঙ্গে fusion |

Negation হলো ভুলে যাওয়া অন্ধ জায়গা: "deployments that do **not** use the cache" embed হয় তার উল্টো অর্থের কাছাকাছি।
সংখ্যা আর তারিখও ভালো embed হয় না, তাই সেগুলোর জায়গা metadata filter-এ।

### Hybrid search, আর দুটি তালিকা মেলানো

BM25, মানে keyword ranking-এর প্রচলিত formula, সীমাহীন score দেয়, cosine দেয় না। তাই দুটিকে এক মাপকাঠিতে আনা
ভঙ্গুর। **Reciprocal rank fusion** score-এর বদলে ক্রম ব্যবহার করে, ফলে calibrate করার মতো কিছু থাকে না।

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

যে document দুটি তালিকাতেই ওপরের দিকে, সেটা উঠে যায় এমন document-এর ওপরে, যেটাকে শুধু একটি তালিকা পছন্দ করেছিল।

### Reranking আর *k* বাছাই

Retriever optimise করে **recall**-এর জন্য। Reranker optimise করে **precision**-এর জন্য। Vector search আলাদা আলাদা
হিসাব করা দুটি embedding তুলনা করে, তাই document কখনো query-টা দেখেই না। Cross-encoder reranker query আর passage
**একসঙ্গে** পড়ে, আর জোড়াটাকে score দেয়। এটা অনেক বেশি নিখুঁত, কিন্তু আগে থেকে হিসাব করে রাখা যায় না। এতে
100–400 ms যোগ হয়, সঙ্গে প্রতি document-এ একটি charge। ওপরের পাঁচটিতেই উত্তর থাকলে এটা বাদ দিন।

পরের ধাপে পাঠানো প্রতিটি chunk window-এর জায়গা আর token খায়, আর গোলমাল বাড়ায়। তাই **চওড়া আর সস্তায় retrieve
করুন, সরু করে rerank করুন, পাঠান অল্প**: দুটি top-50 তালিকা মেলান, 20টি rerank করুন, পাঠান 5টি। Assistant rerank
করে `k = 5` পর্যন্ত।

### Filter মানেই access control

User-রা যদি আলাদা আলাদা document দেখতে পান, তাহলে filter-ই **হলো** access control। এটা চলে search-এর ভেতরে, পরে নয়।

**Engine-এর ভেতরে tenant আর role দিয়ে আগে থেকে filter করা**

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

Application code-এ filter করলে দুইভাবে ব্যর্থ হয়। 50টির সবগুলোই যদি লুকানো থাকে, user কিছুই পান না। আর যিনি সেটা
"ঠিক" করতে limit বাড়িয়ে দেন, তিনি ফাঁসের পথ খুলে দেন।

### Query rewriting

User যে শব্দে বলেন, corpus-এ প্রায়ই সেই শব্দ থাকে না। দুটি সমাধান কাজে দেয়:

- **Rewriting** history ব্যবহার করে "আর অন্যটার কী হবে?"-কে নিজে নিজে দাঁড়াতে পারে এমন একটি প্রশ্ন বানিয়ে দেয়। এটা না
  থাকলে follow-up প্রশ্নে ময়লা retrieve হয়। Multi-turn RAG-এর সবচেয়ে সাধারণ bug এটাই।
- **Multi-query expansion** দুই-তিনভাবে প্রশ্নটা লিখে search করে, তারপর ফলগুলো মেলায়। এতে recall বাড়ে।

> ⚠️ দুটিই retrieval শুরুর আগে model-এর কাছে একটি পুরো round trip যোগ করে। Assistant rewrite করে তার ছোট, দ্রুত
> model দিয়ে। আপনার traffic-এ recall-এর লাভটা latency-র দামের যোগ্য কি না, তা মেপে দেখুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Design |
| --- | --- |
| ~100k-এর কম chunk, production-এ Postgres আছে | pgvector, আগে exact search |
| 100k–5M chunk | HNSW সহ pgvector |
| কয়েক কোটি, কিংবা load-এর বড় অংশই vector search | আলাদা store |
| Code আর নামে ভরা technical docs | Hybrid, keyword-এর দিকে বেশি ভার |
| বড় corpus, অস্পষ্ট প্রশ্ন | Hybrid, সঙ্গে reranking |
| Multi-tenant বা role অনুযায়ী সীমিত document | Engine-এর ভেতরে আগে filter, সবসময় |
| কথোপকথনের assistant | Query rewriting, নইলে follow-up ব্যর্থ হয় |

এর কোনো বদল কাজে দিল কি না, জানতে হলে golden set-এ recall@k মাপুন। সেটা আছে
[Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals)-এ।

## সাধারণ ভুল

**❌ Similarity threshold hard-code করা**

> `if (score > 0.75)` এক model, corpus বা query type থেকে আরেকটিতে খাটে না। ওপরের *k*-টা নিন, কিংবা নিজের label
> দেওয়া query দিয়ে cut-off মেপে নিন।

**❌ আবার embed না করেই embedding model বদলানো**

> Store-এ তখন দুটি বেমানান জ্যামিতি থাকে। ফল দেখতে বিশ্বাসযোগ্য, আসলে খারাপ। সবকিছু একটি সমান্তরাল index-এ আবার
> embed করুন, তারপর read সেদিকে সরান।

**❌ Ranking-এর সমস্যা মেটাতে *k* বাড়ানো**

> বেশি chunk মানে বেশি খরচ, বেশি গোলমাল, আর খারাপ উত্তর। তার বদলে rerank করুন।

**✅ প্রতিটি vector-এর সঙ্গে model version, আর প্রতিটি request-এর সঙ্গে retrieve হওয়া chunk log করুন**

> উত্তর ভুল হলে প্রথম প্রশ্ন হলো, ঠিক passage-টা আদৌ retrieve হয়েছিল কি না। এই দুটি record থাকলে সেই প্রশ্নের উত্তর
> পাঁচ মিনিটেই মিলে যায়।

## 🔑 মূল শিক্ষা

- Embedding হলো এমন একটি বিন্দু, যেখানে কাছাকাছি থাকা মানে অর্থ কাছাকাছি। এর similarity score ক্রম বোঝায়, সম্ভাবনা নয়।
- Query আর document-কে একই embedding model ব্যবহার করতে হবে, তাই model বদলানো মানে সমান্তরাল index-এ পুরো re-embed।
- Scale বাধ্য না করা পর্যন্ত vector রাখুন আগে থেকে চালানো database-এ, কারণ দ্বিতীয় store আনে এমন sync pipeline, যা চুপচাপ ব্যর্থ হয়।
- Keyword আর vector search উল্টো ধরনের query-তে ব্যর্থ হয়, তাই দুটিই চালান, ক্রম দিয়ে মেলান, আর চওড়া candidate set rerank করে অল্প কয়েকটিতে নামান।
- Permission filter চলে search engine-এর ভেতরে, আর কথোপকথনের query retrieval-এর আগে নিজে দাঁড়াতে পারে এমন প্রশ্নে rewrite হয়।

## Interview-এর প্রশ্ন

**Q: 0.82 cosine similarity আপনাকে কী বলে?**

বলে যে একই model আর corpus-এ এই জোড়াটা 0.6 score পাওয়া জোড়ার চেয়ে বেশি মিলে যায়, এর বেশি কিছু নয়। এটা সম্ভাবনা
নয়, আর এক model-এর সঙ্গে আরেক model-এর তুলনাও চলে না। সম্পর্কহীন text একটি model-এ 0.7 পেতে পারে, আরেকটিতে 0.1।
যেকোনো নির্দিষ্ট cut-off আসল corpus-এর label দেওয়া উদাহরণ দিয়ে calibrate করতে হয়।

**Q: pgvector, নাকি আলাদা vector database?**

Scale সত্যিই অন্য কিছু না চাওয়া পর্যন্ত pgvector। এতে vector হয়ে যায় এমন database-এর একটি column, যার backup,
migration আর security আমি আগে থেকেই সামলাই। তখন filtering আর similarity একই planner-এর একটি সিদ্ধান্ত হয়ে যায়। আলাদা
store যোগ করে দ্বিতীয় একটি system আর একটি sync pipeline। এর সাধারণ ব্যর্থতা হলো মুছে ফেলা document তবু cite হওয়া।
আমি সরব কয়েক কোটি vector-এ পৌঁছালে, কিংবা vector-এর load যখন transactional traffic-এর ক্ষতি করতে শুরু করবে।

**Q: Vector, keyword, নাকি দুটিই?**

প্রায় প্রতিটি production system-এ দুটিই, কারণ দুটি ব্যর্থ হয় আলাদা query-তে। Vector search অন্যভাবে বলা কথা ধরে,
কিন্তু error code ফসকায়। Keyword search ঠিক উল্টো। আমি score normalise না করে ক্রম দিয়ে মেলাব। খুব ছোট corpus-এ
একটি দিয়েই শুরু করব, যতক্ষণ না eval দেখায় কোন query-গুলো ব্যর্থ হচ্ছে।

**Q: Reranker এমন কী করে, যা retriever পারে না?**

এটা query আর passage একসঙ্গে পড়ে। Vector search আলাদা আলাদা হিসাব করা embedding তুলনা করে। তাতে এটা দ্রুত হয়, আর
আগে থেকে হিসাব করে রাখা যায়, কিন্তু precision সীমিত থাকে। Cross-encoder সরাসরি জোড়াটাকে score দেয়। এটা বেশি নিখুঁত,
কিন্তু কখনো আগে থেকে হিসাব করা যায় না। তাই সস্তায় পঞ্চাশটি retrieve করুন, বিশটি rerank করুন, পাঠান পাঁচটি।

**Q: User যা দেখতে পারেন, retrieval-কে শুধু তার মধ্যে সীমিত রাখবেন কীভাবে?**

Search engine-এর ভেতরে, query-রই অংশ হিসেবে filter করুন। ব্যবহার করুন ingestion-এর সময় প্রতিটি chunk-এ রাখা tenant
আর role field। পরে filter করলে যত চাওয়া হয়েছিল তার চেয়ে কম ফল আসে, আর access control চলে যায় application code-এ,
যেখানে কেউ না কেউ limit বাড়িয়ে দেবেন। Approximate index থাকলে আমি সেই filter-সহ recall-ও পরীক্ষা করব, কারণ বাছাই করা
filter-এই এটা ধসে পড়ে।

## এরপর কী পড়বেন

- [Chapter ?? — Ingestion ও Chunking](#ch-ingestion-and-chunking) — আপনি কী embed করছেন, তা-ই ঠিক করে কী খুঁজে পাবেন
- [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) — recall@k, আর এর কিছু কাজে দিল কি না, তা জানার উপায়
