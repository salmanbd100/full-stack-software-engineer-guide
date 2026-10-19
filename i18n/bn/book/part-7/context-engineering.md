---
sourceHash: "8c834c5af1bdb2793dd798e6490ec8b704f5b5ea0c5617ea4e9cd6a07bdcd693"
title: "Context Engineering"
translatedAt: "2026-10-19T07:56:53.282Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Context Engineering {#ch-context-engineering}

> প্রতিটি request-এ সীমিত, ক্রম মেনে চলা, দামি window-টায় কী থাকবে, আর কী বাদ পড়বে, তা ঠিক করুন।

**এই অধ্যায়ে:** প্রশ্নটা নতুন করে দেখা · budget হিসেবে window · ক্রমই কেন বিল ঠিক করে · কী কাটবেন আর কীভাবে · বেশি context মানেই ভালো নয়

## 💡 মূল ধারণা

Prompt engineering জিজ্ঞেস করে, *model-কে কী বলব*। Context engineering জিজ্ঞেস করে সেই প্রশ্ন, যেটা production-এ আসলে
উত্তর ঠিক করে দেয়। **এই request-এ window-এ কী আছে, কোন ক্রমে, আর সেটা কী সরিয়ে দিয়েছে?** *Window* মানে একটি request-এ
model যা কিছু পড়ে, তার সবটা।

প্রশ্নটা বদলেছে কারণ কাজটাই বদলে গেছে। 2023-এর একটি feature হাতে লেখা একটি prompt পাঠাত। 2026-এর feature request
বানায় system prompt, tool definition, conversation history, retrieve করা কয়েকটি document আর user message জুড়ে।
এর বেশিরভাগটাই code runtime-এ বাছে, এমন বিপুল উপাদান থেকে, যার সবটা কখনোই আঁটবে না। কেউ এটা হাতে লেখে না। প্রতিটি
request-এ কিছু একটা সিদ্ধান্ত নেয়, আর system-এ সবচেয়ে বেশি প্রভাব সেই সিদ্ধান্ত নেওয়া component-টারই।

> Model-এর memory-র সমস্যা নেই। সমস্যা আপনার জোড়া লাগানোর ধাপে: জায়গা ভাগ করার।

## কীভাবে কাজ করে

### Window হলো পাঁচ দাবিদারের একটি budget

একটি সংখ্যার মধ্যেই সব: instruction, tool schema, history, retrieve করা context আর উত্তর। উত্তরের বরাদ্দ হয় সবার
শেষে, তাই চাপটা পড়ে ওটার ওপরই। কলকবজা আছে
[Chapter ?? — LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)-এ।

Provider-এর কাছে গিয়ে limit আবিষ্কার না করে, budget-টা স্পষ্ট করে হিসাব করুন:

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

আসল খুঁটিনাটি হলো output-এর জায়গা **আগে** তুলে রাখা। Assembler আগে window ভরে ফেলে তারপর উত্তর চাইলে কাটা উত্তর আসে।
আর আসে ঠিক সেই অবস্থায়, যখন উত্তরটা সবচেয়ে জরুরি: লম্বা conversation, অনেক retrieval।

Provider-এর নিজের token counter দিয়ে গুনুন। Character দেখে আন্দাজ করলে JSON আর code-এ হিসাব তিনগুণ সরে যায়। নিরাপদ
একটি request বাতিল হয়ে যাওয়ার জন্য এটুকুই যথেষ্ট।

### ক্রমই বিল ঠিক করে

Caching হলো **prefix match**। Provider request-এর শুরু থেকে একটি breakpoint পর্যন্ত cache করে। ওই prefix-এর যেকোনো
জায়গায় একটি byte বদলালে তার পরের সবকিছু অচল হয়ে যায়। তাই ক্রমের নিয়মটা যান্ত্রিক।

```text
Stable and reusable  →  ...  →  volatile and per-request
```

| জায়গা | কী থাকে | কেন ওখানে |
| --- | --- | --- |
| শুরুতে | Tool definition, system instruction | প্রতিটি request-এ হুবহু এক, cache থাকে এখানেই |
| মাঝে | অনেকক্ষণ ধরে চলা conversation history | শেষে যোগ হয়ে বাড়ে, তাই prefix টিকে থাকে |
| শেষে | Retrieve করা document, user-এর প্রশ্ন | প্রতিটি request-এ আলাদা, তাই সামনে বসানো চলবে না |

Prompt-এর শুরুর দিকে একটি timestamp, request id বা এলোমেলো ক্রমের JSON key থাকলেই hit rate চুপচাপ শূন্যে নেমে যায়।
কোনো error হয় না। শুধু বিল বাড়ে। সাজানোটা কাজ করেছে ধরে না নিয়ে, provider যে cache-read token-এর হিসাব ফেরত দেয়
সেটা পড়ে যাচাই করুন:

```typescript
const { usage } = await generateText({ model: MODEL, instructions: STABLE, messages });
usage.inputTokenDetails?.cacheReadTokens; // zero across repeats means a silent invalidator
```

### বেশি context মানেই ভালো নয়

Window বড় হলেই সেটা ভরতে হবে, এমন নয়। আর কেন নয়, সেটা মাপা যায়। অপ্রাসঙ্গিক উপাদান যোগ করলে model-এর নির্ভুলতা কমে।
লম্বা context-এর **মাঝখানের** উপাদানও model দুই প্রান্তের উপাদানের চেয়ে কম নির্ভরযোগ্যভাবে কাজে লাগায়। ভালো করে বাছা
দশটি paragraph সেই একশোটির চেয়ে ভালো, যার মধ্যে ওই দশটিও আছে।

তাই retrieval system-এ আসল সীমা window-এর মাপ নয়, retrieval-এর মান। আর "উত্তরটা ভুল ছিল" শুনলে সঠিক প্রতিক্রিয়া হলো,
prompt-এ হাত দেওয়ার আগে দেখা কী retrieve হয়েছিল।

> ⚠️ দশ লাখ token-এর window একটি ধারণক্ষমতা, নির্দেশ নয়। ভরে ফেললে প্রতিটি request-এ latency আর টাকা খরচ হয়, আর সাধারণত
> নির্ভুলতাও কমে।

### কী কাটবেন, আর কাটার তিনটি উপায়

একসময় history আর আঁটে না। উপায় তিনটি, আর একটির জায়গায় আরেকটি চলে না।

| উপায় | কী করে | খরচ | কখন ব্যবহার করবেন |
| --- | --- | --- | --- |
| **Truncation** | সবচেয়ে পুরনো turn ফেলে দেয় | চুপচাপ তথ্য হারায় | এমন chat, যেখানে দূরের কোনো কিছুর ওপর নির্ভরতা নেই |
| **Summarisation / compaction** | পুরনো turn-এর জায়গায় একটি summary বসায় | একটি model call; detail হারায়, আর কী হারাবে তা বাছে model | লম্বা conversation, যেখানে আগের সিদ্ধান্তের উল্লেখ আসে |
| **Tool result মুছে ফেলা** | ভারী tool output সরায়, turn-গুলো রাখে | কিছুই না, যদি result-টা আর না লাগে | Agent, যাদের history-র বেশিরভাগই tool output |

Team-রা তৃতীয়টাই মিস করে, অথচ এটাই সবচেয়ে সস্তা। Agent loop-এ window-এর বেশিরভাগ জুড়ে থাকে এমন tool output, যা
একবার পড়া হয়েছে আর কখনো কাজে লাগেনি। ওগুলো মুছলে conversation-এর গড়ন ঠিক থাকে, আর জায়গার বেশিরভাগটা ফেরত আসে। কোনো
summarisation call লাগে না, আর কী জরুরি ছিল তা কোনো model-কে ঠিক করতে হয় না।

> ⚠️ **যা বদলাতে থাকে:** server-side compaction আর context-editing API এখনো provider-দের beta। এগুলো এসেছে সেই AI SDK
> 7-এর পরে, যা ধরে এই অংশ লেখা। এদের নাম, trigger আর beta flag release থেকে release-এ বদলায়। টেকসই নীতি হলো ওপরের
> table: তিনটি আলাদা উপায়, তিনটি আলাদা খরচ। Call লেখার আগে এখনকার API মিলিয়ে নিন।

### Retrieval মানে context বাছাই

Retrieval system হলো একটি database জোড়া context engineering system। Chunk-এর মাপ ঠিক করে window-এর টুকরোগুলো কত
সূক্ষ্ম হবে। *k*, মানে কয়টি chunk ফেরত আসবে, ঠিক করে budget-এর কতটা retrieval নেবে। Reranking ঠিক করে কোন প্রার্থী
জায়গা পাওয়ার যোগ্য। তিনটিই search-এর সিদ্ধান্ত হওয়ার আগে budget-এর সিদ্ধান্ত। Part VII-এর `RAG/` section এগুলো ঠিকঠাক
করা নিয়েই।

## কখন ব্যবহার করবেন

| লক্ষণ | যে lever টানবেন | এটা নয় |
| --- | --- | --- |
| Load-এর মধ্যে উত্তর কাটা পড়ে | জোড়া লাগানোর আগে output token তুলে রাখুন | বড় model |
| Traffic-এর চেয়ে দ্রুত খরচ বাড়ছে | Cache prefix ঠিক করুন, cache-read token দেখুন | সস্তা model |
| লম্বা conversation আগের তথ্য ভুলে যায় | Truncation নয়, compaction | বড় window |
| Agent দশ ধাপেই window ভরে ফেলে | পুরনো tool result মুছে ফেলুন | প্রতিটি turn summarise করা |
| Source যত বাড়ে, উত্তর তত খারাপ হয় | কম, কিন্তু ভালো chunk retrieve করুন | আরও বেশি retrieve করা |

## সাধারণ ভুল

**❌ System prompt-এর একদম ওপরে timestamp বসানো**

> `You are a support agent. The current time is ${new Date().toISOString()}.`

প্রতিটি request-এ prefix বদলায়, তাই কিছুই cache হয় না, আর প্রতিটি call পুরো দাম দেয়। Model-এর সময়টা জানা দরকার হলে
ওটা শেষে বসান, শেষ cache breakpoint-এর পরে।

**❌ জায়গা আছে বলেই window ভরে ফেলা**

অপ্রাসঙ্গিক context-এ latency, খরচ আর error rate, সবই বাড়ে। প্রশ্নটা কখনোই "আঁটবে কি না" নয়। প্রশ্নটা হলো, "এটা কি
জায়গাটা পাওয়ার যোগ্য?"

**✅ অন্য কিছু ঢোকানোর আগে output-এর বরাদ্দ তুলে রাখুন**

> যত বড় উত্তরের জন্য সর্বোচ্চ টাকা দিতে রাজি, budget থেকে আগে সেটা বাদ দিন। বাকি সবকিছু যা থাকে তার জন্য লড়ুক। তাহলে
> উত্তর আর কাটা পড়ে না।

## 🔑 মূল শিক্ষা

- Context engineering হলো জায়গা ভাগের সমস্যা: এই request-এ window-এ কী আছে, কোন ক্রমে, আর সেটা কী সরিয়ে দিয়েছে।
- অন্য কিছু ঢোকানোর আগে output-এর বরাদ্দ তুলে রাখুন, নইলে কাটা পড়বে উত্তরটাই।
- Caching হলো prefix match, তাই স্থির জিনিস আগে আর বদলাতে থাকা জিনিস শেষে। Cache-read token দেখে যাচাই করুন।
- Truncation, compaction আর tool result মুছে ফেলা তিনটি আলাদা উপায়, খরচও তিন রকম।
- অপ্রাসঙ্গিক context যোগ করলে উত্তরের মান মাপার মতো কমে। বড় window একটি ধারণক্ষমতা, নির্দেশ নয়।

## Interview-এর প্রশ্ন

**Q: Context engineering কী, আর prompt engineering থেকে এটা আলাদা কীভাবে?**

Prompt engineering সেই শব্দগুলো নিয়ে, যা আপনি সরাসরি নিয়ন্ত্রণ করেন। Context engineering প্রতিটি request-এ চলা জোড়া
লাগানোর ধাপটা নিয়ে। কোন document-গুলো retrieve হলো? History-র কতটা টিকল? সবকিছু কোন ক্রমে বসল, আর উত্তরের জন্য কত
token বাকি রইল? 2026-এর একটি feature-এ window-এর বেশিরভাগটা কেউ হাতে লেখে না, code বাছে। তাই quality আর খরচ দুটিই
থাকে বাছাইয়ের logic-এ।

**Q: Traffic বদলায়নি, deploy-ও হয়নি, অথচ প্রতি request-এর খরচ দ্বিগুণ। কোথায় খুঁজবেন?**

আগে cache-read token-এর হিসাবে। সাধারণ কারণ হলো, যে prefix আগে cache হতো, এখন আর হয় না। এমন হতে প্রায় কিছুই লাগে না:
একটি timestamp, একটি request id, tool list-এর ক্রম বদলানো, বা system prompt-এ কোনো variable বসতে শুরু করা। দ্বিতীয়
জায়গা হলো retrieve করা context, যা corpus বাড়ার সঙ্গে সঙ্গে চুপচাপ বেড়েছে। কারণ *k* স্থির ছিল, chunk-এর মাপ ছিল না।

**Q: একটি conversation window ছাড়িয়ে যেতে চলেছে। কী করবেন?**

সেটা নির্ভর করে conversation-টা কী ধরনের, তার ওপর। শুরুর কিছুর উল্লেখ যদি পরে না আসে, সবচেয়ে পুরনো turn-গুলো ফেলে দিন।
আগের সিদ্ধান্ত জরুরি হলে সেগুলো compact করে summary বানান, আর মেনে নিন যে কী রাখা হবে তা একটি model বেছেছে। Agent হলে
আগে পুরনো tool result মুছুন। সাধারণত window-এর বেশিরভাগই ওগুলো, মুছতে কোনো খরচ নেই, আর গড়নও ঠিক থাকে। বড় model-এর
দিকে হাত বাড়ানো মানে দামি উপায়ে সিদ্ধান্তটা এড়িয়ে যাওয়া।

**Q: দশ লাখ token-এর window থাকলে কি retrieval-এর মান আর জরুরি নয়?**

না, বরং কেন জরুরি সেই কারণটা উল্টে যায়। প্রশ্নটা আর আঁটানো নিয়ে থাকে না, হয়ে যায় মনোযোগ আর খরচ নিয়ে। অপ্রাসঙ্গিক উপাদান
যোগ হলে নির্ভুলতা কমে। মাঝখানটা কম নির্ভরযোগ্যভাবে কাজে লাগে। আর প্রতিটি request-এ প্রতিটি token-এর দাম দিতে হয়। বড়
window কী সম্ভব তার সীমা বাড়ায়, আবার অসাবধান হওয়ার দামও বাড়ায়।

**Q: Request পাঠানোর আগে নির্ভরযোগ্যভাবে token গুনবেন কীভাবে?**

Provider-এর token-counting endpoint দিয়ে। ওটা নির্ভুল, আর বিনা পয়সায়। Character দেখে আন্দাজ করলে JSON, code আর
non-Latin text-এ হিসাব তিনগুণ সরে যায়। আর অন্য model-এর জন্য train করা client-side tokenizer বাড়তি ধাপসহ আন্দাজ
ছাড়া কিছু নয়। Request-কে আঁটতেই হলে আন্দাজ না করে মাপুন।

## এরপর কী পড়বেন

- [Chapter ?? — LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave) — token আর window-এর যে কলকবজা ধরে এই অধ্যায় জায়গা ভাগ করে
- [Chapter ?? — Embedding, Vector Store ও Retrieval](#ch-retrieval) — কোন document window-এ জায়গা পাওয়ার যোগ্য, তা বাছা
- [Chapter ?? — Observability ও Cost Engineering](#ch-observability) — caching, batching আর token-এর বিলের বাকিটা
