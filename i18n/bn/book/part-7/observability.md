---
sourceHash: "a9a65e6626bb2ef754a1d16effc410310613609d16cc720f92677b71bb227246"
title: "Observability ও Cost Engineering"
translatedAt: "2026-10-19T08:02:00.914Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Observability ও Cost Engineering {#ch-observability}

> প্রতিটি request-এর এতটুকু record রাখুন, যাতে এক সপ্তাহ পরেও সমস্যাটা ধরা যায়। তারপর সেই একই trace দিয়ে খুঁজে বের করুন টাকা কোথায় যাচ্ছে, আর quality না হারিয়ে খরচ কমান।

**এই অধ্যায়ে:** span tree আর প্রতিটি span কী record করে · চারটি metric · কী কখনো log করা যাবে না · token কোথায় যায় · খরচ কমানোর উপায়, ক্রম অনুযায়ী

## 💡 মূল ধারণা

সাধারণ service debug করা মানে stack trace পড়া। Code একটি পথ ধরে চলেছে, আর trace দেখায় কোন branch-এ গেছে।
**AI feature-এ এমন কোনো trace নেই, কারণ সিদ্ধান্তগুলো আপনার code-এ নেওয়া হয়নি।** কোন chunk ফেরত এলো, model
কোন tool বাছল, prompt-এ কী ছিল, এর কিছুই source-এ লেখা নেই।

তাই ঘটনার পরে কোনো request আবার গড়ে তোলার একমাত্র উপায় trace। খরচও মাপা হয় এখানেই। বেশিরভাগ web team-এর জন্য
AI feature-ই প্রথম জিনিস, যেখানে **প্রতিবার বাড়তি ব্যবহারের খরচ চোখে দেখা যায়**। একটি page view-এর খরচ এক পেনির
ভগ্নাংশ। Documentation assistant-কে একটি প্রশ্ন করলেই কয়েক পেনি খরচ হতে পারে, আর বেশি কথা বলা কোনো user-এর
পেছনে দিনে কয়েক পাউন্ড।

প্রতি request-এ token, cache hit rate আর প্রতি user-এর খরচ, সবই থাকে একই span-গুলোতে। আগে trace বানান। তাহলে
খরচের কাজ মানে শুধু হাতে থাকা সংখ্যা পড়া।

## কীভাবে কাজ করে

**Documentation assistant-এর একটি request, trace হিসেবে**

```text
request  (4.2 s · £0.019)
├── retrieve        (310 ms · 5 chunks · top score 0.81)
├── assemble        (2 ms  · 6,400 tokens · 1,100 cached)
├── model call      (3.6 s · TTFT 380 ms · in 6,400 out 420 · stop)
└── validate        (1 ms  · schema ok)
```

প্রতি request-এ একটি trace, প্রতি ধাপে একটি span (trace-এর ভেতরে সময় মাপা একটি ধাপ), আর প্রতিটি স্তরে token
আর খরচ। "Request-এ চার সেকেন্ড লেগেছে" শুনলে লোকে আন্দাজ করতে বসে। "Retrieval-এ 310 ms আর model-এ 3.6 s
লেগেছে" শুনলে আলোচনা সেখানেই শেষ। খরচও একইভাবে কাজ করে। Span tree দামি ধাপটার নাম বলে দেয়, আর প্রায়ই সেটা
লোকে যেটা ভাবে সেটা নয়। Cardinality আর sampling সাধারণ চর্চা, সেগুলো শেখানো হয়েছে
[Chapter ?? — Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals)-এ।

### প্রতিটি span কী record করে

| Span | Record |
| --- | --- |
| **Request** | Trace id, ছদ্মনামের user id, feature, মোট latency, মোট খরচ, ফলাফল |
| **Retrieval** | Query, chunk id, score, filter, কতগুলো ফেরত এলো |
| **Assembly** | অংশ ধরে token-এর সংখ্যা, cache-read token, কী কেটে বাদ গেছে |
| **Model call** | Model আর version, প্রথম token আসতে সময়, input আর output token, finish reason |
| **Output** | Schema validation-এর ফল, guardrail-এর সিদ্ধান্ত, refusal flag |

তিনটি field সবচেয়ে জরুরি, আর প্রায়ই এগুলোই বাদ পড়ে। **Chunk id** থাকলে একটি query-তেই retrieval bug আর
generation bug আলাদা করা যায়। Prefix-এর caching বন্ধ হয়ে গেছে কি না, সেটা দেখার একমাত্র উপায় **cache-read
token**। **Model version** থাকলে quality-র ধীরে ধীরে সরে যাওয়াকে provider-এর দিকের কোনো পরিবর্তনের সঙ্গে মেলানো যায়।

**Model-call span, type হিসেবে**

```typescript
interface LlmSpan {
  readonly traceId: string;
  readonly userId: string;             // pseudonymous — cost per user is a group-by on this
  readonly model: string;              // include the version, not just the family
  readonly inputTokens: number;
  readonly cachedInputTokens: number;
  readonly outputTokens: number;
  readonly ttftMs: number;
  readonly finishReason: string;
  readonly promptHash: string;         // which prompt version — the first question in every incident
  readonly retrievedChunkIds: string[];
}
```

### চারটি metric

| Metric | কী দেখবেন | কারণ |
| --- | --- | --- |
| **প্রথম token আসতে সময়** | p50 আর p95 | User আসলে এই সংখ্যাটাই টের পান |
| **প্রতি request-এর খরচ** | p50, p95, p99 আর মোট | একমাত্র ধরনের feature, যার প্রতিবার ব্যবহারের খরচ চোখে পড়ে |
| **Cache hit rate** | প্রবণতা | চুপচাপ কমে যাওয়াই খরচ হঠাৎ বাড়ার সাধারণ কারণ |
| **Quality-র proxy** | Refusal, schema failure আর খালি retrieval-এর হার | সস্তা signal, user অভিযোগ করার আগেই নড়ে ওঠে |

### কী কখনো log করা যাবে না

Prompt আর completion-এ থাকে user যা টাইপ করেছেন তা-ই। প্রায়ই সেটা ব্যক্তিগত তথ্য, কখনো কখনো credential।
Log call-এর আগেই key আর ব্যক্তিগত তথ্যের পরিচিত pattern redact করুন। Chunk-এর text নয়, chunk id log করুন। তাতে
diagnose করার বেশিরভাগ সুবিধা থেকে যায়, অথচ ঝুঁকি আর storage-এর bill দুটিই অনেক কম।

Volume বেশি হলে পুরো log রাখার খরচ model call-এর চেয়েও বেশি হতে পারে। **প্রতিটি request-এর metadata** রাখুন,
আর **পুরো content রাখুন একটি sample-এ**, সঙ্গে প্রতিটি failure আর refusal। Content রাখুন ত্রিশ দিন, সংখ্যা এক বছর।

> ⚠️ Prompt আর completion-এর log হলো data protection-এর একটি ঝুঁকির জায়গা। এর জন্য retention period, access
> control আর মুছে ফেলার ব্যবস্থা লাগে, আর regulated পরিবেশে লাগে আইনি ভিত্তি।

### Token কোথায় যায়

Documentation assistant-এর একটি সাধারণ request, assembly span থেকে পড়া:

| অংশ | Token | ভাগ |
| --- | --- | --- |
| System prompt আর tool definition | 1,200 | 15% |
| Retrieve করা chunk (k=5) | 4,000 | 50% |
| কথোপকথনের history | 2,400 | 30% |
| User-এর প্রশ্ন | 60 | <1% |
| **Output** | 400 | 5% |

Output token-এর দাম input-এর কয়েক গুণ, কিন্তু সংখ্যায় এগুলো দশ থেকে বিশ গুণ কম। **Bill-এর বেশিরভাগটাই
সাধারণত input**, আর input-ই ঠিক সেই জিনিস যেটা আপনার assembly code নিয়ন্ত্রণ করে। উত্তর ছোট করা সবচেয়ে চোখে পড়ার
মতো উপায়, কিন্তু খুব কমই কাজের।

### খরচ কমানোর উপায়, quality যতটা হারায় তার তুলনায় সাশ্রয় ধরে সাজানো

| # | উপায় | সাধারণ সাশ্রয় | Quality-র খরচ |
| --- | --- | --- | --- |
| 1 | স্থির prefix-এ **prompt caching** | Input খরচের 40–80% | নেই |
| 2 | **সহজ কাজ ছোট model-এ পাঠান** | সেই কাজগুলোতে 60–90% | নেই, যদি eval করা থাকে |
| 3 | **কম কিন্তু ভালো chunk retrieve করুন** | Input-এর 20–40% | সাধারণত quality বাড়ে |
| 4 | **Interactive নয় এমন সব batch করুন** | সেই traffic-এ ~50% | নেই; শুধু latency |
| 5 | **মূল model নামিয়ে দিন** | অনেক | সত্যিকারের, আর সব জায়গায় |

তালিকা ধরে ওপর থেকে নিচে নামুন। এক থেকে তিন নম্বর row-তে quality-র কোনো খরচ নেই, আর সাধারণত পাঁচ নম্বরের
চেয়ে বেশি সাশ্রয় হয়।

**Prompt caching।** Provider-রা request-এর prefix cache করে রাখে, আর সেটা পড়তে স্বাভাবিক দামের একটি ভগ্নাংশ
নেয়। পুরো কৌশলটা ক্রমের ওপর দাঁড়িয়ে: যা স্থির তা আগে, যা বদলায় তা শেষে।

**Prefix-কে cache-যোগ্য রাখার মতো assembly-র ক্রম**

```typescript
declare const SYSTEM_PROMPT: string, retrievedContext: string, question: string;
declare const TOOL_DEFINITIONS: unknown[], history: { role: 'user' | 'assistant'; content: string }[];

const request = {
  instructions: SYSTEM_PROMPT,     // identical every request — cached
  tools: TOOL_DEFINITIONS,         // identical — cached
  messages: [
    ...history,                    // grows by appending, so the prefix survives
    { role: 'user', content: `${retrievedContext}\n\n${question}` }, // volatile — last
  ],
};
```

সামনের দিকে কোনো byte বদলালে তার পরের সবকিছু invalidate হয়ে যায়। System prompt-এ একটি timestamp, একটি
request id, বা এলোমেলো ক্রমের tool list থাকলেই hit rate শূন্যে নেমে যায়, অথচ কোনো error হয় না। **সাজানো দেখে
নয়, span-এ cache-read token-এর সংখ্যা দেখে যাচাই করুন।**

**Routing আর cascade।** Intent classification আর schema-বাঁধা extraction ছোট model-এ ভালোই চলে। Frontier
model রাখুন খোলামেলা reasoning আর লম্বা tool chain-এর জন্য। **Cascade** আগে সস্তা model চালায়, ফল যাচাই করে, আর
ব্যর্থ হলে ওপরের model-এ পাঠায়। আগে escalation rate মাপুন। প্রতিটি escalate হওয়া request দুটি call-এর দাম দেয়
আর দুটির জন্যই অপেক্ষা করে। তাই হার বেশি হলে সাশ্রয় খেয়ে ফেলে, আর latency বাড়ায়।

**Batching আর streaming।** Batch API দেরিতে ফল দেওয়ার বিনিময়ে সাধারণত দাম অর্ধেক করে দেয়, তাই রাতের backfill
সেখানেই চালানো উচিত। **Streaming কোনো টাকা বাঁচায় না**, শুধু যদি user ভুল উত্তর মাঝপথে থামিয়ে দেন, তাহলে বাঁচায়।

> ⚠️ **যা বদলাতে থাকে:** দাম, cache কতক্ষণ থাকে আর batch-এর ছাড়, কয়েক সপ্তাহেই বদলে যায়। Reasoning token-এর
> দাম প্রায়ই নেওয়া হয়, অথচ response-এ সেগুলো দেখা যায় না। যেটা টেকে, সেটা হলো ক্রম অনুযায়ী সাজানো তালিকাটা আর
> আপনার নিজের token profile। বই থেকে কখনো দাম quote করবেন না।

**Invoice থেকে নয়, span থেকে হিসাব করা খরচ**

```typescript
interface Price { input: number; cachedInput: number; output: number }  // per token

function costOf(span: LlmSpan, price: Price): number {
  const uncached = span.inputTokens - span.cachedInputTokens;
  return uncached * price.input + span.cachedInputTokens * price.cachedInput + span.outputTokens * price.output;
}
```

এটা `userId` ধরে যোগ করুন, আর গড় নয়, percentile হিসেবে নজর রাখুন। p99 user-এর খরচ median-এর পঞ্চাশ গুণ হতে
পারে। প্রতি user-এর token budget, আর সীমা ছুঁলে ভদ্রভাবে থামানো, bill আর service দুটিকেই রক্ষা করে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | প্রথম পদক্ষেপ |
| --- | --- |
| প্রথম AI feature ship হওয়ার আগে | Trace id, token, খরচ, chunk id — এটুকু ন্যূনতম |
| কোনো deploy ছাড়াই খরচ বেড়েছে | সময়ের সঙ্গে cache hit rate, তারপর assembly-র token সংখ্যা |
| গুটিকয়েক user bill-এর বেশিরভাগ খরচ করছেন | প্রতি user-এর budget আর rate limit |
| User জানাচ্ছেন উত্তর খারাপ হয়েছে | Model version-এর পরিবর্তন, refusal rate, retrieval score-এর প্রবণতা |

## সাধারণ ভুল

**❌ সবার আগে model নামিয়ে দেওয়া**

> Quality-র খরচ সবচেয়ে বেশি যে পরিবর্তনে, সেটাই করা হলো, token কোথায় যাচ্ছে তা মাপার আগেই।

**❌ টের না পেয়েই cache prefix ভেঙে ফেলা**

> সামনের দিকে একটি timestamp বসিয়ে দিলেই প্রতিটি request পুরো দাম দেয়। কিছুই fail করে না। শুধু bill বাড়তে
> থাকে।

**✅ প্রতিটি request-এ chunk id, model version আর cached token log করুন**

> Span-এ এই কয়েকটি field থাকলেই retrieval bug আর generation bug আলাদা হয়ে যায়, আর খরচের যেকোনো প্রশ্নের
> উত্তর দেওয়া যায়।

## 🔑 মূল শিক্ষা

- AI feature-এর সিদ্ধান্তগুলো হয় আপনার code-এর বাইরে, তাই সেগুলো আবার গড়ে তোলার একমাত্র উপায় trace।
- Token, cache hit আর খরচ থাকবে প্রতিটি span-এ, তাতে প্রতি request আর প্রতি user-এর খরচ বের করা একটি query-র ব্যাপার।
- Prompt আর completion-এর log ব্যক্তিগত তথ্য; এর জন্য retention, access control আর মুছে ফেলার ব্যবস্থা লাগে।
- Bill-এর বেশিরভাগ সাধারণত input token, আর quality না হারিয়ে সবচেয়ে বড় সাশ্রয় হলো prompt caching।
- Model নামানোর আগে token profile মাপুন, কারণ সমাধান সাধারণত input-এই থাকে।

## Interview-এর প্রশ্ন

**Q: AI feature-এর জন্য কী log করেন, যা সাধারণ endpoint-এর জন্য করতেন না?**

সিদ্ধান্তের input-গুলো, কারণ সেগুলো code-এ নেই। Retrieve করা chunk id আর score, request-এর token কীভাবে ভাগ
হয়েছে, cache-read token, model version, prompt version, finish reason আর খরচ। Runtime-এ তৈরি হওয়া context দেখে
model branch বেছেছে, তাই record না রাখলে এর কিছুই আর ফেরত পাওয়া যায় না।

**Q: কোনো deploy ছাড়াই খরচ দ্বিগুণ হয়েছে। আগে কোথায় দেখবেন?**

Cache hit rate। Prefix-এর caching বন্ধ হয়ে যাওয়াই সবচেয়ে সাধারণ কারণ, আর তার জন্য একটি বসানো timestamp বা ক্রম
বদলানো tool list-ই যথেষ্ট। এরপর দেখব জোড়া লাগানো request-এর token সংখ্যা, কারণ corpus বাড়লে retrieve করা
context-ও বাড়ে। এই দুটি বাদ না দেওয়া পর্যন্ত model-এ হাত দেব না, কারণ model নামালে সব জায়গায় quality কমে।

**Q: সস্তা model দিয়ে cascade কখন ভালো?**

যখন সস্তা model সাধারণত সফল হয়, আর নির্ভরযোগ্য একটি check আছে, যেমন schema validation। আগে escalation rate
মাপুন। প্রতিটি escalation দুটি call-এর দাম দেয়। তাই cascade টাকা বাঁচায় ততক্ষণই, যতক্ষণ সস্তা call-এর খরচ এড়ানো
শক্তিশালী-model call-গুলোর চেয়ে কম। হার মোটামুটি বিশ শতাংশের নিচে থাকলে সাশ্রয় অনেক।

## এরপর কী পড়বেন

- [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) — sample করা trace দিয়ে কী করবেন
- [Chapter ?? — Context Engineering](#ch-context-engineering) — যে assembly-র ক্রমে caching কাজ করে
- [Chapter ?? — LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave) — প্রতিটি কাজের জন্য model বাছাই, routing যার ওপর নির্ভর করে
