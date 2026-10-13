---
sourceHash: "a9a65e6626bb2ef754a1d16effc410310613609d16cc720f92677b71bb227246"
title: "Observability ও Cost Engineering"
translatedAt: "2026-10-13T03:02:52.856Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Observability ও Cost Engineering {#ch-observability}

> প্রতিটি request-এর এতটুকু record রাখুন, যাতে এক সপ্তাহ পরেও সেটা diagnose করা যায়। তারপর সেই একই trace দিয়ে খুঁজে বের করুন টাকা কোথায় যাচ্ছে, আর quality না হারিয়ে সেটা কমান।

**এই অধ্যায়ে:** span tree আর প্রতিটি span কী record করে · চারটি metric · কী কখনোই log করা যাবে না · token-গুলো কোথায় যায় · খরচ কমানোর lever, ক্রম অনুযায়ী

## 💡 মূল ধারণা

একটি সাধারণ service debug করা মানে একটি stack trace পড়া। Code একটি পথ ধরেছিল, আর trace দেখায় কোন branch।
**একটি AI feature-এর এমন কোনো trace নেই, কারণ সিদ্ধান্তগুলো আপনার code-এ নেওয়া হয়নি।** এর কোনোটাই source-এ
নেই: কোন chunk ফিরে এসেছিল, model কোন tool বেছেছিল, prompt-এ কী ছিল।

তাই ঘটনার পরে একটি request আবার গড়ে তোলার একমাত্র উপায় হলো trace। খরচও মাপা হয় এখানেই। বেশিরভাগ web team-এর
জন্য AI feature-ই প্রথম জিনিস, যেখানে **প্রতিটি বাড়তি ব্যবহারের একটি দৃশ্যমান খরচ আছে**। একটি page view-এর খরচ
এক পয়সারও ভগ্নাংশ। Documentation assistant-কে একটি প্রশ্ন করতে কয়েক পেনি লাগতে পারে, আর একজন বেশি কথা বলা user
দিনে কয়েক পাউন্ড খরচ করাতে পারেন।

প্রতি request-এ token, cache hit rate আর প্রতি user-এর খরচ, সবই একই span-এ থাকে। আগে trace তৈরি করুন। তখন খরচ
নিয়ে কাজ মানে শুধু এমন সংখ্যা পড়া, যেগুলো আপনার হাতে আগে থেকেই আছে।

## কীভাবে কাজ করে

**Documentation assistant-এর একটি request, একটি trace হিসেবে**

```text
request  (4.2 s · £0.019)
├── retrieve        (310 ms · 5 chunks · top score 0.81)
├── assemble        (2 ms  · 6,400 tokens · 1,100 cached)
├── model call      (3.6 s · TTFT 380 ms · in 6,400 out 420 · stop)
└── validate        (1 ms  · schema ok)
```

প্রতি request-এ একটি trace, প্রতিটি ধাপে একটি span (trace-এর ভেতরে সময় মাপা একটি ধাপ), আর প্রতিটি স্তরে token ও
খরচ। "Request-টি চার সেকেন্ড নিয়েছে" শুনলে মানুষ আন্দাজ করতে শুরু করে। "Retrieval নিয়েছে 310 ms আর model নিয়েছে
3.6 s" শুনলে আলোচনা সেখানেই শেষ। খরচও একইভাবে কাজ করে। Span tree দামি ধাপটির নাম বলে দেয়, আর প্রায়ই সেটা মানুষ
যেটা ভাবে সেটা নয়। Cardinality আর sampling সাধারণ চর্চা, শেখানো হয়েছে
[Chapter ?? — Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals)-এ।

### প্রতিটি span কী record করে

| Span | যা record করে |
| --- | --- |
| **Request** | Trace id, ছদ্মনামের user id, feature, মোট latency, মোট খরচ, ফলাফল |
| **Retrieval** | Query, chunk id, score, filter, কতগুলো ফিরেছে |
| **Assembly** | প্রতিটি অংশের token সংখ্যা, cache-read token, কী কেটে বাদ দেওয়া হয়েছে |
| **Model call** | Model আর তার version, first token পর্যন্ত সময়, input আর output token, finish reason |
| **Output** | Schema validation-এর ফল, guardrail-এর সিদ্ধান্ত, refusal flag |

তিনটি field সবচেয়ে গুরুত্বপূর্ণ, আর প্রায়ই এগুলোই থাকে না। **Chunk id** একটি query-তেই retrieval bug-কে generation
bug থেকে আলাদা করে। **Cache-read token** দেখার একমাত্র উপায় যে একটি prefix cache হওয়া বন্ধ করেছে। **Model
version** দিয়ে quality-র পতনকে provider-এর দিকের কোনো পরিবর্তনের সাথে মেলাতে পারেন।

**Model-call span, একটি type হিসেবে**

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
| **Time to first token** | p50 আর p95 | User আসলে এই সংখ্যাটাই টের পান |
| **প্রতি request-এ খরচ** | p50, p95, p99 আর মোট | এটাই একমাত্র feature class, যার প্রতিটি বাড়তি ব্যবহারের খরচ চোখে পড়ে |
| **Cache hit rate** | Trend | নীরবে কমে যাওয়াই খরচ হঠাৎ বাড়ার সাধারণ কারণ |
| **Quality-র প্রতিনিধি সংকেত** | Refusal, schema failure আর খালি retrieval-এর হার | সস্তা সংকেত, যেগুলো user অভিযোগ করার আগেই নড়ে |

### কী কখনোই log করা যাবে না

Prompt আর completion-এ user যা টাইপ করেছেন তা-ই থাকে। সেটা প্রায়ই personal data, আর কখনো কখনো একটি credential।
Log call-এর আগেই key আর পরিচিত personal-data pattern redact করুন। Chunk-এর text নয়, chunk id log করুন। এতে
diagnose করার বেশিরভাগ সুবিধা থাকে, অথচ ঝুঁকি আর storage-এর bill থাকে অনেক কম।

বেশি volume-এ পুরো log রাখার খরচ model call-এর চেয়েও বেশি হতে পারে। **প্রতিটি request-এ metadata** রাখুন, আর
**একটি sample-এ পুরো content**, সাথে প্রতিটি failure আর refusal। Content রাখুন ত্রিশ দিন, সংখ্যা এক বছর।

> ⚠️ Prompt আর completion-এর log একটি data-protection-এর ঝুঁকির জায়গা। এগুলোর একটি retention period, access
> control আর মুছে ফেলার একটি পথ দরকার, আর regulated পরিবেশে একটি আইনি ভিত্তিও।

### Token-গুলো কোথায় যায়

Documentation assistant-এর একটি সাধারণ request, assembly span থেকে পড়া:

| অংশ | Token | ভাগ |
| --- | --- | --- |
| System prompt আর tool definition | 1,200 | 15% |
| Retrieve করা chunk (k=5) | 4,000 | 50% |
| Conversation history | 2,400 | 30% |
| User-এর প্রশ্ন | 60 | <1% |
| **Output** | 400 | 5% |

Output token-এর দাম input-এর কয়েক গুণ, কিন্তু সংখ্যায় এগুলো দশ থেকে বিশ গুণ কম। **সাধারণত bill-এর বেশিরভাগই
input**, আর input ঠিক সেটাই, যা আপনার assembly code নিয়ন্ত্রণ করে। উত্তর ছোট করা স্পষ্ট পদক্ষেপ, কিন্তু খুব কমই
কাজে দেয়।

### Lever-গুলো, যত quality হারায় তার তুলনায় সাশ্রয় অনুযায়ী সাজানো

| # | Lever | সাধারণ সাশ্রয় | Quality-র খরচ |
| --- | --- | --- | --- |
| 1 | স্থির prefix-এ **prompt caching** | Input খরচের 40–80% | নেই |
| 2 | **সহজ কাজ ছোট model-এ পাঠান** | ওই কাজগুলোতে 60–90% | নেই, যদি evaluate করা হয় |
| 3 | **কম কিন্তু ভালো chunk retrieve করুন** | Input-এর 20–40% | সাধারণত quality বাড়ায় |
| 4 | **Interactive নয় এমন সবকিছু batch করুন** | ওই traffic-এ ~50% | নেই; শুধু latency |
| 5 | **মূল model নামিয়ে দিন** | অনেক | আসল, আর সবখানে |

ওপর থেকে নিচে কাজ করুন। এক থেকে তিন নম্বর সারি কোনো quality হারায় না, আর সাধারণত পাঁচ নম্বরের চেয়ে বেশি বাঁচায়।

**Prompt caching।** Provider-রা একটি request-এর prefix cache করে, আর সেটা পড়ার জন্য স্বাভাবিক দামের একটি ভগ্নাংশ
নেয়। পুরো mechanism-টাই ক্রমের ওপর: স্থির জিনিস আগে, বদলানো জিনিস শেষে।

**এমন assembly ক্রম, যেটা prefix-কে cache করার মতো রাখে**

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

সামনের দিকে যেকোনো একটি byte বদলালে তার পরের সবকিছু invalidate হয়ে যায়। System prompt-এ একটি timestamp, একটি
request id, বা অস্থির ক্রমে থাকা একটি tool list hit rate-কে শূন্যে নামিয়ে দেয়, আর কোনো error আসে না। **সাজানোটা
নয়, span-এ cache-read token-এর সংখ্যা যাচাই করুন।**

**Routing আর cascade।** Intent classification আর schema-বাঁধা extraction ছোট model-এ ভালোই চলে। Frontier
model রেখে দিন খোলামেলা reasoning আর লম্বা tool chain-এর জন্য। একটি **cascade** সস্তা model চালায়, ফলাফল যাচাই করে,
আর ব্যর্থ হলে ওপরের model-এ পাঠায়। আগে escalation rate মাপুন। ওপরে পাঠানো প্রতিটি request দুটি call-এর দামই দেয়
আর দুটির জন্যই অপেক্ষা করে। তাই হার বেশি হলে সাশ্রয় খেয়ে ফেলে, আর latency বাড়ায়।

**Batching আর streaming।** Batch API সাধারণত দেরিতে পাওয়া ফলাফলের জন্য দাম অর্ধেক করে দেয়, তাই রাতের backfill
সেখানেই যায়। **Streaming কোনো টাকা বাঁচায় না**, শুধু তখন ছাড়া, যখন একজন user একটি ভুল উত্তর আগেভাগে থামিয়ে দেন।

> ⚠️ **যা বদলাতে থাকে:** দাম, cache-এর আয়ু আর batch discount কয়েক সপ্তাহের মধ্যে বদলায়। Reasoning token-এর
> প্রায়ই bill হয়, কিন্তু response-এ সেগুলো লুকানো থাকে। টেকসই অংশ হলো ক্রম অনুযায়ী সাজানো তালিকা আর আপনার নিজের
> token profile। কখনোই বই থেকে কোনো দাম উদ্ধৃত করবেন না।

**খরচ হিসাব করা হয় span থেকে, invoice থেকে নয়**

```typescript
interface Price { input: number; cachedInput: number; output: number }  // per token

function costOf(span: LlmSpan, price: Price): number {
  const uncached = span.inputTokens - span.cachedInputTokens;
  return uncached * price.input + span.cachedInputTokens * price.cachedInput + span.outputTokens * price.output;
}
```

এটা `userId` অনুযায়ী যোগ করুন, আর গড় নয়, percentile হিসেবে track করুন। p99 user-এর খরচ median-এর পঞ্চাশ গুণ হতে
পারে। ভদ্রভাবে সীমা টানা একটি per-user token budget bill আর service, দুটিকেই রক্ষা করে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | প্রথম পদক্ষেপ |
| --- | --- |
| প্রথম AI feature ship হওয়ার আগে | Trace id, token, খরচ, chunk id — ন্যূনতম এটুকু |
| কোনো deploy ছাড়াই খরচ বেড়েছে | সময়ের সাথে cache hit rate, তারপর assembly-র token সংখ্যা |
| অল্প কয়েকজন user-ই bill-এর বেশিরভাগ | Per-user budget আর rate limit |
| User-রা খারাপ উত্তরের কথা জানাচ্ছেন | Model version-এর পরিবর্তন, refusal rate, retrieval score-এর trend |

## সাধারণ ভুল

**❌ সবার আগে model নামিয়ে দেওয়া**

> সবচেয়ে বেশি quality-র খরচের পরিবর্তন, token কোথায় যাচ্ছে তা মাপার আগেই করা।

**❌ টের না পেয়ে cache prefix ভেঙে ফেলা**

> সামনের দিকে interpolate করা একটি timestamp, আর প্রতিটি request পুরো দাম দেয়। কিছুই fail করে না। Bill শুধু
> বাড়তে থাকে।

**✅ প্রতিটি request-এ chunk id, model version আর cache হওয়া token log করুন**

> একটি span-এ কয়েকটি field retrieval bug-কে generation bug থেকে আলাদা করে, আর খরচের প্রতিটি প্রশ্নের উত্তর
> দেওয়া সম্ভব করে।

## 🔑 মূল শিক্ষা

- একটি AI feature-এর সিদ্ধান্তগুলো আপনার code-এর বাইরে হয়, তাই সেগুলো আবার গড়ার একমাত্র উপায় একটি trace।
- Token, cache hit আর খরচ প্রতিটি span-এ থাকা উচিত। তাতে প্রতি request আর প্রতি user-এর খরচ একটি query মাত্র।
- Prompt আর completion-এর log personal data। এগুলোর retention, access control আর মুছে ফেলার পথ দরকার।
- সাধারণত bill-এর বেশিরভাগই input token, আর quality না হারিয়ে সবচেয়ে বড় সাশ্রয় হলো prompt caching।
- Model নামানোর আগে token profile মাপুন, কারণ সমাধান সাধারণত input-এই থাকে।

## Interview-এর প্রশ্ন

**Q: একটি AI feature-এর জন্য আপনি কী log করেন, যা একটি সাধারণ endpoint-এর জন্য করতেন না?**

সিদ্ধান্তের input-গুলো, কারণ সেগুলো code-এ নেই। Retrieve করা chunk id আর score, request-এর token-এর গঠন,
cache-read token, model version, prompt version, finish reason আর খরচ। Runtime-এ তৈরি হওয়া একটি context থেকে
একটি model branch বেছেছিল। তাই record না করা থাকলে এর কোনোটাই ফিরে পাওয়া যায় না।

**Q: কোনো deploy ছাড়াই খরচ দ্বিগুণ হয়েছে। প্রথমে কোথায় দেখবেন?**

Cache hit rate। সবচেয়ে সাধারণ কারণ হলো একটি prefix, যেটা cache হওয়া বন্ধ করেছে। Interpolate করা একটি timestamp
বা নতুন ক্রমে সাজানো একটি tool list-ই এর জন্য যথেষ্ট। এরপর assemble করা token সংখ্যা, কারণ corpus বাড়ার সাথে
retrieve করা context-ও বাড়ে। এই দুটি বাদ না দেওয়া পর্যন্ত আমি model-এ হাত দেব না, কারণ downgrade সবখানে quality-র
দাম নেয়।

**Q: সস্তা model-এর cascade কখন ভালো ধারণা?**

যখন সস্তা model সাধারণত সফল হয়, আর একটি নির্ভরযোগ্য যাচাই আছে, যেমন schema validation। আগে escalation rate
মাপুন। প্রতিটি escalation দুটি call-এরই দাম দেয়। তাই cascade টাকা বাঁচায় শুধু ততক্ষণ, যতক্ষণ সস্তা call-গুলোর
খরচ এড়ানো strong-model call-গুলোর চেয়ে কম। মোটামুটি বিশ শতাংশের নিচে এটা বড় সাশ্রয়।

## এরপর কী পড়বেন

- [Chapter ?? — Eval, Retrieval Metric ও Error Analysis](#ch-evals) — sample করা trace দিয়ে কী করবেন
- [Chapter ?? — Context Engineering](#ch-context-engineering) — যে assembly ক্রম caching-কে কাজ করায়
- [Chapter ?? — LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave) — প্রতিটি কাজের জন্য model বাছাই, যার ওপর routing নির্ভর করে
