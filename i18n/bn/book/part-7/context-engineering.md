---
sourceHash: "8c834c5af1bdb2793dd798e6490ec8b704f5b5ea0c5617ea4e9cd6a07bdcd693"
title: "Context Engineering"
translatedAt: "2026-10-12T12:25:41.118Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Context Engineering {#ch-context-engineering}

> প্রতিটি request-এ একটি সীমিত, ক্রমানুসারে সাজানো, দামি window-তে কী থাকবে — আর কী বাদ যাবে — তা ঠিক করুন।

**এই অধ্যায়ে:** দৃষ্টিভঙ্গির বদল · window একটি budget · কেন ক্রমই আপনার bill ঠিক করে · কী বাদ দেবেন আর কীভাবে · বেশি context মানেই ভালো নয়

## 💡 মূল ধারণা

Prompt engineering জিজ্ঞেস করে, *model-কে আমি কী বলব*। Context engineering সেই প্রশ্নটা করে, যেটা production-এ
আসলে উত্তর ঠিক করে দেয়। **এই request-এ window-তে কী আছে, কোন ক্রমে আছে, আর সেটা কী ঠেলে বের করে দিয়েছে?**
*Window* হলো এক request-এ model যা কিছু পড়ে, তার সবটা।

দৃষ্টিভঙ্গি বদলেছে, কারণ কাজটাই বদলে গেছে। 2023-এর একটি feature হাতে লেখা একটি prompt পাঠাত। 2026-এর একটি
feature request তৈরি করে একটি system prompt, tool definition, conversation history, কয়েকটি retrieve করা document
আর একটি user message দিয়ে। এর বেশিরভাগই code runtime-এ বেছে নেয়, এমন বিপুল material থেকে যা কখনো পুরোটা ধরবে না।
কেউ এটা হাতে লেখে না। প্রতিটি request-এ কিছু একটা সিদ্ধান্ত নেয়, আর সেই সিদ্ধান্তকারীই system-এর ওপর সবচেয়ে বেশি
প্রভাব ফেলা component।

> Model-এর memory-র সমস্যা নেই। আপনার assembly step-এর বরাদ্দের সমস্যা আছে।

## কীভাবে কাজ করে

### Window একটি budget, যার দাবিদার পাঁচজন

একটিই সংখ্যা সবকিছু ধরে: instruction, tool schema, history, retrieve করা context আর উত্তর। উত্তরের জন্য জায়গা
বরাদ্দ হয় সবার শেষে, তাই চাপটা পড়ে ওটার ওপরেই।
[Chapter ?? — LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)-এ mechanics আছে।

Provider-এর কাছে গিয়ে limit আবিষ্কার না করে, budget-টা স্পষ্টভাবে করুন:

```typescript
interface Budget {
  readonly total: number;      // the model's context limit
  readonly reserveForOutput: number; // subtract this first, always
}

function assemble(b: Budget, parts: { instructions: string; tools: number; history: Message[]; retrieved: Doc[] }) {
  let left = b.total - b.reserveForOutput - count(parts.instructions) - parts.tools;
  const docs = takeWhileFits(parts.retrieved, () => left, 0.4);  // retrieval gets a share
  const history = takeRecentWhileFits(parts.history, () => left); // history gets the rest
  return { docs, history };
}
```

আসল খুঁটিনাটি হলো output-এর জায়গা **আগে** রেখে দেওয়া। যে assembler window ভরে ফেলে তারপর উত্তর চায়, সে
কাটা-পড়া response দেয়। আর এটা ঘটে ঠিক সেই অবস্থায়, যখন উত্তরটা সবচেয়ে জরুরি: লম্বা conversation আর প্রচুর
retrieval।

Provider-এর নিজের token counter দিয়ে গুনুন। Character-ভিত্তিক আন্দাজ JSON আর code-এ তিন গুণ পর্যন্ত ভুল হয়। একটি
নিরাপদ assembly-কে rejected request বানাতে এটুকুই যথেষ্ট।

### ক্রমই আপনার bill ঠিক করে

Caching একটি **prefix match**। Provider request-এর শুরু থেকে একটি breakpoint পর্যন্ত cache করে। সেই prefix-এর
যেকোনো জায়গায় একটি byte বদলালে তার পরের সবকিছু invalid হয়ে যায়। তাই ক্রমের নিয়মটা যান্ত্রিক।

```text
Stable and reusable  →  ...  →  volatile and per-request
```

| অবস্থান | Content | কেন ওখানে |
| --- | --- | --- |
| শুরুতে | Tool definition, system instruction | প্রতিটি request-এ হুবহু এক; cache এখানেই থাকে |
| মাঝে | দীর্ঘস্থায়ী conversation history | Append করে বাড়ে, তাই prefix টিকে থাকে |
| শেষে | Retrieve করা document, user-এর প্রশ্ন | প্রতিটি request-এ আলাদা; সামনে বসানো যাবে না |

Prompt-এর সামনের দিকে একটি timestamp, request id বা এলোমেলো করা JSON key থাকলেই hit rate চুপচাপ শূন্যে নেমে আসে।
কোনো error হয় না। শুধু bill বাড়ে। ধরে নেবেন না যে সাজানোটা কাজ করেছে। Provider যে cache-read token count ফেরত দেয়,
সেটা পড়ে যাচাই করুন:

```typescript
const { usage } = await generateText({ model: MODEL, instructions: STABLE, messages });
usage.inputTokenDetails?.cacheReadTokens; // zero across repeats means a silent invalidator
```

### বেশি context মানেই ভালো নয়

Window বড় হলেই সেটা ভরতে হবে, এমন নয়। আর কেন নয়, তা মাপা যায়। অপ্রাসঙ্গিক material যোগ করলে model-এর accuracy
কমে। লম্বা context-এর **মাঝখানের** material-ও model দুই প্রান্তের material-এর চেয়ে কম নির্ভরযোগ্যভাবে ব্যবহার করে।
ভালোভাবে বাছা দশটি paragraph সেই একশোটির চেয়ে ভালো, যার মধ্যে ওই দশটিও আছে।

তাই retrieval system-এ সীমাবদ্ধতা হলো retrieval-এর মান, window-এর আকার নয়। আর "উত্তর ভুল হয়েছে" শুনলে ঠিক
প্রতিক্রিয়া হলো prompt ছোঁয়ার আগে দেখা, কী retrieve হয়েছিল।

> ⚠️ এক million token-এর window একটি সামর্থ্য, নির্দেশ নয়। এটা ভরলে প্রতিটি request-এ latency আর টাকা খরচ হয়, আর
> সাধারণত accuracy-ও কমে।

### কী বাদ দেবেন, আর বাদ দেওয়ার তিনটি উপায়

একসময় history আর ধরবে না। তিনটি mechanism আছে, আর এগুলো একটির জায়গায় আরেকটি চলে না।

| Mechanism | কী করে | খরচ | কখন ব্যবহার করবেন |
| --- | --- | --- | --- |
| **Truncation** | সবচেয়ে পুরোনো turn ফেলে দেয় | চুপচাপ তথ্য হারায় | এমন chat, যেখানে অনেক আগের কিছুর ওপর নির্ভরতা নেই |
| **Summarisation / compaction** | পুরোনো turn-এর জায়গায় একটি summary বসায় | একটি model call; detail হারায়, আর কী হারাবে তা বাছে একটি model | লম্বা conversation, যা আগের সিদ্ধান্তের কথা টানে |
| **Tool result মুছে ফেলা** | বড় tool output সরায়, turn-গুলো রাখে | কিছুই না, যদি result-টি আর দরকার না থাকে | Agent — এদের history-তে tool output-ই বেশি জায়গা নেয় |

তৃতীয়টাই team-গুলো মিস করে, আর এটাই সবচেয়ে সস্তা, অনেক ব্যবধানে। একটি agent loop-এ window-এর বেশিরভাগ সাধারণত
এমন tool output, যা একবার পড়া হয়েছে আর আর কখনো ব্যবহার হয়নি। এটা মুছলে conversation-এর কাঠামো থাকে, আর বেশিরভাগ
জায়গা ফিরে আসে। কোনো summarisation call লাগে না, আর কী জরুরি ছিল তা কোনো model ঠিক করে না।

> ⚠️ **যা বদলাতে থাকে:** server-side compaction আর context-editing API এখনো provider beta। এগুলো এই part যে AI SDK 7
> surface-এর ভিত্তিতে লেখা, তার পরে এসেছে। এদের নাম, trigger আর beta flag release থেকে release-এ বদলায়। টেকসই নীতি
> হলো ওপরের table: তিনটি আলাদা mechanism, তিনটি আলাদা খরচ। Call লেখার আগে বর্তমান API দেখে নিন।

### Retrieval মানে context বাছাই

একটি retrieval system হলো একটি database জুড়ে দেওয়া context engineering system। Chunk size ঠিক করে window-এর
টুকরোগুলো কত সূক্ষ্ম হবে। *k*, অর্থাৎ ফেরত আসা chunk-এর সংখ্যা, ঠিক করে budget-এর কতটা retrieval নেবে। Reranking
ঠিক করে কোন candidate জায়গা পাওয়ার যোগ্য। তিনটিই search-এর সিদ্ধান্ত হওয়ার আগে budget-এর সিদ্ধান্ত, আর Part VII-এর
`RAG/` section এগুলো ঠিকভাবে করা নিয়েই।

## কখন ব্যবহার করবেন

| লক্ষণ | কোন lever | এটা নয় |
| --- | --- | --- |
| Load-এর সময় উত্তর কেটে যায় | Assemble করার আগে output token রেখে দিন | বড় model |
| Traffic-এর চেয়ে খরচ দ্রুত বাড়ে | Cache prefix ঠিক করুন; cache-read token দেখুন | সস্তা model |
| লম্বা conversation আগের তথ্য হারায় | Compaction, truncation নয় | বড় window |
| একটি agent দশ ধাপে তার window ভরে ফেলে | পুরোনো tool result মুছুন | প্রতিটি turn summarise করা |
| Source যোগ করলে উত্তর খারাপ হয় | কম, কিন্তু ভালো chunk retrieve করুন | আরও বেশি retrieve করা |

## সাধারণ ভুল

**❌ System prompt-এর একেবারে ওপরে একটি timestamp বসানো**

> `You are a support agent. The current time is ${new Date().toISOString()}.`

প্রতিটি request-এ prefix বদলায়, তাই কিছুই cache হয় না, আর প্রতিটি call পুরো দাম দেয়। Model-এর যদি সময় জানা
দরকার হয়, সেটা শেষে রাখুন, শেষ cache breakpoint-এর পরে।

**❌ জায়গা আছে বলেই window ভরে ফেলা**

অপ্রাসঙ্গিক context-এর সঙ্গে latency, খরচ আর error rate — সবই বাড়ে। প্রশ্নটা কখনো "এটা কি ধরবে" নয়। প্রশ্ন হলো
"এটা কি তার জায়গার যোগ্য"।

**✅ অন্য কিছু ভরার আগে output-এর বরাদ্দ রেখে দিন**

> সবচেয়ে বড় যে উত্তরের জন্য আপনি টাকা দিতে রাজি, সেটা আগে budget থেকে বাদ দিন। বাকি সবকিছু যা থাকে তার জন্য
> লড়ে, আর কাটা-পড়া উত্তর বন্ধ হয়ে যায়।

## 🔑 মূল শিক্ষা

- Context engineering একটি বরাদ্দের সমস্যা: এই request-এ window-তে কী আছে, কোন ক্রমে, আর সেটা কী সরিয়ে দিয়েছে।
- অন্য কিছু ভরার আগে output-এর বরাদ্দ রেখে দিন, নইলে কাটা পড়বে উত্তরটাই।
- Caching একটি prefix match, তাই স্থির content আগে আর বদলাতে থাকা content শেষে — cache-read token দিয়ে যাচাই করুন।
- Truncation, compaction আর tool result মুছে ফেলা তিনটি আলাদা mechanism, তিনটি আলাদা খরচ।
- অপ্রাসঙ্গিক context যোগ করলে উত্তরের মান মাপার মতো করে কমে; বড় window একটি সামর্থ্য, নির্দেশ নয়।

## Interview-এর প্রশ্ন

**Q: Context engineering কী, আর এটা prompt engineering থেকে কীভাবে আলাদা?**

Prompt engineering হলো সেই শব্দচয়ন নিয়ে, যা আপনি সরাসরি নিয়ন্ত্রণ করেন। Context engineering হলো সেই assembly step
নিয়ে, যা প্রতিটি request-এ চলে। কোন document retrieve হলো? History-র কতটা টিকে রইল? সবকিছু কোন ক্রমে গেল, আর উত্তরের
জন্য কত token বাকি রইল? 2026-এর একটি feature-এ window-এর বেশিরভাগ code বেছে নেয়, কোনো মানুষ লেখে না। তাই মান আর
খরচ — দুটোই থাকে বাছাইয়ের logic-এ।

**Q: Traffic বদলায়নি, কোনো deploy হয়নি, তবু প্রতি request-এর খরচ দ্বিগুণ হয়ে গেছে। কোথায় দেখবেন?**

প্রথমে cache-read token count-এ। সাধারণ কারণ হলো এমন একটি prefix, যা আগে cache হতো, এখন হয় না। এটা ঢুকতে প্রায়
কিছুই লাগে না: একটি timestamp, একটি request id, নতুন ক্রমে সাজানো tool list, বা এমন একটি system prompt যেটা একটি
variable বসাতে শুরু করেছে। দ্বিতীয় জায়গা হলো retrieve করা context, যা corpus বাড়ার সঙ্গে চুপচাপ বেড়েছে, কারণ *k*
স্থির ছিল কিন্তু chunk size নয়।

**Q: একটি conversation window ছাড়িয়ে যেতে চলেছে। কী করবেন?**

সেটা নির্ভর করে conversation-টা কেমন তার ওপর। শুরুর কিছু যদি পরে আর উল্লেখ না হয়, সবচেয়ে পুরোনো turn ফেলে দিন।
আগের সিদ্ধান্ত যদি জরুরি হয়, সেগুলো compact করে একটি summary বানান, আর মেনে নিন যে কী রাখা হবে তা একটি model বেছেছে।
যদি এটা একটি agent হয়, আগে পুরোনো tool result মুছুন। সাধারণত window-এর বেশিরভাগই এগুলো, মুছতে কোনো খরচ নেই, আর
কাঠামোটা থাকে। বড় model ধরা হলো সিদ্ধান্ত এড়ানোর দামি উপায়।

**Q: এক million token-এর window মানে কি retrieval-এর মান আর গুরুত্বপূর্ণ নয়?**

না, এটা গুরুত্বের কারণটা উল্টে দেয়। প্রশ্নটা আর জায়গায় ধরানোর থাকে না, হয়ে যায় মনোযোগ আর খরচের। অপ্রাসঙ্গিক
material যোগ হলে accuracy কমে। মাঝখানের অংশ কম নির্ভরযোগ্যভাবে ব্যবহার হয়। আর প্রতিটি request-এ প্রতিটি token-এর
দাম দেন আপনি। বড় window যা সম্ভব তার সীমা বাড়ায়, আর অসাবধানতার দামও বাড়ায়।

**Q: Request পাঠানোর আগে token নির্ভরযোগ্যভাবে কীভাবে গুনবেন?**

Provider-এর token-counting endpoint দিয়ে, যা নিখুঁত আর বিনা খরচে। Character-ভিত্তিক আন্দাজ JSON, code আর non-Latin
text-এ তিন গুণ পর্যন্ত ভুল হয়। আর অন্য model-এর ওপর train করা একটি client-side tokenizer বাড়তি ধাপসহ একটি আন্দাজ মাত্র।
Request-কে যদি জায়গায় ধরতেই হয়, আন্দাজ না করে মাপুন।

## এরপর কী পড়বেন

- [Chapter ?? — LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave) — token আর window-এর mechanics, যার ভিত্তিতে এই অধ্যায় বরাদ্দ করে
- [Chapter ?? — Embedding, Vector Store ও Retrieval](#ch-retrieval) — কোন document window-তে জায়গা পাওয়ার যোগ্য, তা বাছাই
- [Chapter ?? — Observability ও Cost Engineering](#ch-observability) — caching, batching আর token bill-এর বাকিটা
