---
sourceHash: "0533534a127bc2c3338b9ae27c0127597fb56f311e7731c79c00fa22374d5d68"
title: "Memory, State ও দীর্ঘ সময়ের কাজ"
translatedAt: "2026-10-19T08:00:12.593Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Memory, State ও দীর্ঘ সময়ের কাজ {#ch-durability-and-long-running-work}

> Agent-এর যে তথ্যগুলো লাগে, সেগুলো এমন জায়গায় রাখুন যেখানে window সেগুলো হারাতে পারে না, আর লম্বা run-কে এমনভাবে বানান যাতে crash হলেও টিকে থাকে, আর একই কাজের দাম দুবার দিতে না হয়।

**এই অধ্যায়ে:** তিন ধরনের memory · সারাংশ করার আগে tool output সরানো · conversation-এর বাইরে একটি working state · checkpoint আর idempotent effect · অপেক্ষা হিসেবে approval

## 💡 মূল ধারণা

Model stateless: দুটি call-এর মাঝে কিছুই মনে রাখে না। যেকোনো memory আসলে এমন কিছু, যা আপনার code আবার window-এ
বসিয়ে দিয়েছে। তাই memory হলো **storage আর বাছাইয়ের একটি সমস্যা, যার দায় আপনার।** এর তিনটি অংশ, যা লোকে গুলিয়ে
ফেলে: এই turn-এ model কী দেখছে, compaction পেরিয়ে কী টিকে থাকে, আর আগামী সপ্তাহেও কী সত্যি থাকবে।

লম্বা run চতুর্থ একটি সমস্যা যোগ করে: crash পেরিয়ে কী টিকে থাকে। চল্লিশ মিনিট ধরে চলা agent loop একটি HTTP
request-এর ভেতরে বাঁচতে পারে না। Deploy, timeout আর crash, যেকোনোটাই সেটা শেষ করে দেয়, আর প্রতিটি হারানো step ছিল
টাকা দিয়ে কেনা একটি model call। তাই দীর্ঘ সময় চলা agent হলো **এমন একটি durable workflow, যা ঘটনাচক্রে model call করে।**

> Conversation একটি cache, database নয়। Durability-র একক হলো step। কোনো step শেষ হলে তার ফল টিকে থাকতেই হবে।
> শেষ না হলে সেটা আবার চালানো নিরাপদ হতে হবে।

## কীভাবে কাজ করে

### তিন ধরন, তিন রকম আয়ু

| ধরন | কোথায় থাকে | আয়ু | খরচ |
| --- | --- | --- | --- |
| **Working context** | Window-এ | এই request পর্যন্ত | Token, প্রতিটি step-এ |
| **Session state** | আপনার store-এ, প্রতি turn-এ আবার load হয় | Task বা conversation পর্যন্ত | Storage, সঙ্গে বাছাইয়ের logic |
| **Long-term memory** | একটি database বা index-এ | Session পেরিয়েও | Storage, সঙ্গে retrieval আর বাসি হওয়ার ঝামেলা |

"ভুলে গেছে" ধরনের বেশিরভাগ bug আসলে মাঝের row-টার অভাব। তথ্যটা দশ step আগে window-এ ছিল। Compaction (history ছোট
করে এঁটে দেওয়া) সেটা ফেলে দিয়েছে, আর অন্য কোথাও সেটা ধরা ছিল না।

### Tool output window খেয়ে ফেলে

Agent-এ history-র **বেশিরভাগটাই tool output**: file-এর content, search result, API response। Documentation assistant
docs-এর পুরো page পড়ে। Step 8-এ পৌঁছাতে পৌঁছাতে tool result হতে পারে 94,000 token, যেখানে message মাত্র 6,000।
বেশিরভাগটা একবার পড়া হয়েছে, আর কখনো কাজে লাগেনি। তাই **জায়গা ফেরত পাওয়ার সবচেয়ে সস্তা উপায় হলো পুরনো tool result
সরিয়ে ফেলা।** এতে কোনো model call লাগে না। একটি চিহ্ন রেখে দিন, যাতে দরকার হলে model ফলাফলটা আবার আনে, step-টা
কখনো হয়ইনি ধরে না নেয়।

**বাসি tool result সরানো, পেছনে একটি চিহ্ন রেখে**

```typescript
function clearStaleToolResults(messages: Message[], keepRecent = 3): Message[] {
  const cutoff = messages.length - keepRecent * 2;
  return messages.map((m, i) =>
    m.role === 'tool' && i < cutoff
      ? { ...m, content: `[cleared: ${summarise(m)} — call the tool again if needed]` }
      : m,
  );
}
```

Conversation ছোট করতেই হলে সবচেয়ে সস্তাটা আগে নিন: আগে tool result সরান (বিনামূল্যে), তারপর পুরনো turn-এর সারাংশ
করুন (একটি model call লাগে, আর কী গুরুত্বপূর্ণ ছিল তা ঠিক করে একটি model)। কেটে ছেঁটে ফেলা বিনামূল্যে, কিন্তু তাতে
চুপচাপ তথ্য হারায়। পুরো table আছে [Chapter ?? — Context Engineering](#ch-context-engineering)-এ।

> ⚠️ সারাংশ করলে জিনিস এমনভাবে হারায়, যা আপনি খুলে দেখতে পারেন না। চেনা ব্যর্থতাটা হলো, agent প্রথম message-এর
> কোনো শর্ত ভুলে যায়, যেমন "billing service-এ হাত দেবে না"। Step 12-এর একটি সারাংশ ধরে নিয়েছিল ওটা আর প্রাসঙ্গিক নয়।
> শর্তগুলো সারাংশের বাইরে আটকে রাখুন।

### এমন working state, যা window হারাতে পারে না

Conversation-কে সত্যের উৎস ভাবা বন্ধ করুন। Loop-এর পাশে ছোট, গোছানো একটি state রাখুন। Agent কাজ করতে করতে সেটা
update করুন, আর প্রতিটি turn-এ আবার inject করুন।

**যে state compaction আর restart পেরিয়ে টিকে থাকে**

```typescript
interface AgentState {
  readonly goal: string;
  readonly constraints: string[];        // pinned; never summarised away
  readonly findings: Record<string, string>;
  readonly completed: string[];
  readonly failed: { step: string; reason: string }[];
}
```

খরচ কয়েকশো token। শর্তগুলো compaction পেরিয়ে টিকে থাকে। শেষ হওয়া কাজ আর দ্বিতীয়বার হয় না। ব্যর্থতাগুলো চোখের সামনে
থাকে, তাই agent সেগুলো বারবার চেষ্টা করা বন্ধ করে। আর state-টা গোছানো বলে disk-এ save করা যায়।

### Long-term memory

Session পেরিয়ে memory হলো অন্য একটি corpus-এর ওপর retrieval। দেখুন
[Chapter ?? — Embedding, Vector Store ও Retrieval](#ch-retrieval)। কঠিন সমস্যাটা হলো **সময়ের সঙ্গে স্ববিরোধ।**
মার্চে রাখা "user dark mode পছন্দ করেন" জুনে ভুল হতে পারে, আর store তা বুঝতে পারে না। প্রতিটি memory-তে timestamp
দিন, নতুনগুলোকে আগে রাখুন, আর নতুন তথ্য এলে পুরনোটা সরিয়ে দিন। Memory আবার ব্যক্তিগত data-ও। কখনো secret বা token
রাখবেন না, memory-কে একটি time-to-live দিন, আর user id দিয়ে সীমা টানুন store-এ, prompt-এ নয়।

### প্রতিটি step-এর পরে persist করুন

**পরের step শুরুর আগেই লেখা একটি checkpoint**

```typescript
interface Checkpoint {
  readonly runId: string;
  readonly step: number;
  readonly messages: Message[];      // the conversation so far
  readonly state: AgentState;        // goal, constraints, findings
  readonly status: 'running' | 'awaiting-approval' | 'done' | 'failed';
  readonly spentTokens: number;
}

async function step(run: Checkpoint): Promise<Checkpoint> {
  const res = await model.generate({ messages: run.messages, tools });
  const results = await Promise.all(res.toolCalls.map((c) => dispatch(c, run.runId)));
  const next = advance(run, res, results);
  await checkpoints.put(next);        // durable before anything else observes it
  return next;
}
```

এখন crash হলে বড়জোর একটি step হারায়। Resume করলে শেষ checkpoint পড়া হয়। শুরু থেকে আবার চালানো হয় না, কারণ model-এর
step deterministic নয়। Budget-ও থাকে checkpoint-এ। Process memory-তে রাখলে প্রতিটি restart-এ সেটা শূন্য হয়ে যেত, আর
crash-loop হয়ে দাঁড়াত সীমাহীন bill।

### কঠিন অংশ হলো একই effect দুবার হওয়া

একটি read আবার চেষ্টা করায় কোনো খরচ নেই। কিন্তু `sendEmail` আবার চালালে দ্বিতীয় একটি email চলে যায়। "Tool চলেছে"
আর "checkpoint লেখা হয়েছে"-এর মাঝখানে crash হলে ঠিক এটাই ঘটে। সমাধান হলো idempotency key, মানে এমন একটি id, যা
দেখে গ্রাহক পুনরাবৃত্তি উপেক্ষা করতে পারে। Key-টা বানান `runId` আর step থেকে, কারণ retry-তে নতুন key দিলে পুরো
ব্যবস্থাটাই অকেজো হয়ে যায়।

| পদ্ধতি | কীভাবে | কোথায় মানায় |
| --- | --- | --- |
| **Idempotency key** | `${runId}:${step}:${toolName}` পরের system-এ পাঠানো | যে API এটা support করে |
| **Write-ahead intent** | "X call করতে যাচ্ছি" লিখে রাখা; resume-এর সময় দেখা সেটা হয়েছিল কি না | যে system-এ idempotency-র support নেই |
| **Design করেই এড়ানো** | `setStatus('sent')` লিখুন, `incrementCounter()` নয় | সবসময়, যেখানে সম্ভব |

### তিন স্তরে retry

1. **Tool।** সাময়িক ব্যর্থতায় backoff দিয়ে, একই idempotency key নিয়ে আবার চেষ্টা করুন।
2. **Model।** Tool সত্যিই বন্ধ থাকলে ব্যর্থতাটা একটি observation হিসেবে ফেরত দিন, যেমন "search index পাওয়া যাচ্ছে
   না"। তাহলে model অন্য পথ নিতে পারে, কিংবা সততার সঙ্গে থেমে যেতে পারে।
3. **Run।** কিছুই কাজ না করলে checkpoint রেখে fail করুন, যাতে retry নতুন করে শুরু না করে, যেখানে থেমেছিল সেখান থেকে চলে।

মাঝের স্তরটাই লোকে বাদ দেয়। এটা না থাকলে একটি run একটিমাত্র ভাঙা tool-এর পেছনে তার পুরো budget পুড়িয়ে ফেলে।

### মানুষের approval একটি বিরতি, prompt নয়

ধ্বংসাত্মক কোনো কাজের ওপর approval gate একটি run-কে কয়েক দিন থামিয়ে রাখতে পারে। সেটা একটি state, blocking call নয়।

**কেউ approve না করা পর্যন্ত run স্থগিত রাখা**

```typescript
if (tool.destructive) {
  await checkpoints.put({ ...run, status: 'awaiting-approval', pending: call });
  await notify(run.owner, call);
  return;                                   // the process exits; nothing is held open
}
// resumed later by an approval webhook, which loads the checkpoint and continues
```

কিছুই খোলা ধরে রাখা হয় না, তাই অপেক্ষার মধ্যে deploy হলেও ক্ষতি নেই। Approval-এর সঙ্গে থাকে `runId` আর step, তাই
বোতামে দুবার click পড়লেও সেটা একই step-এ গিয়ে মেলে, কাজটা দুবার চলতে পারে না। Approval-কে একটি timeout দিন, যাতে
কোনো run এক সপ্তাহ পরে এমন অবস্থায় আবার চালু না হয়, যেখানে দুনিয়া অনেক এগিয়ে গেছে।

> ⚠️ **যা বদলাতে থাকে:** durable execution framework, যেমন hosted workflow runtime, queue-নির্ভর scheduler আর agent
> platform, দ্রুত বদলায়, আর এই ধারণাগুলোকে আলাদা আলাদা নামে ডাকে। Framework যা-ই হোক, দেখে নিন সেটা প্রতিটি step-এ
> checkpoint করে কি না, effect-কে idempotent key দেয় কি না, আর approval-কে স্থগিত state হিসেবে ধরে কি না।

## কখন ব্যবহার করবেন

| পরিস্থিতি | ব্যবস্থা |
| --- | --- |
| দশ step-এর পরে window ভরে গেছে | আগে পুরনো tool result সরান |
| শর্ত কখনোই হারানো চলবে না | প্রতি turn-এ inject করা গোছানো state |
| আগামী সপ্তাহেও তথ্য লাগবে | Timestamp আর মেয়াদসহ long-term store |
| 5 মিনিট বা তার বেশি সময়ের run, কিংবা schedule করা | Checkpoint করা workflow, idempotent tool, resume করা যায় |
| যেকোনো ধ্বংসাত্মক tool | Approval gate, সময় যতই লাগুক |

## সাধারণ ভুল

**❌ Conversation-কে durable storage ভাবা**

> এটা compact হয়, ছেঁটে ফেলা হয়, আর restart-এ হারিয়ে যায়। যা কিছু গুরুত্বপূর্ণ, তা থাকে এর বাইরে।

**✅ লক্ষ্য আর শর্তগুলো একটি গোছানো state-এ আটকে রাখুন**

> খরচ কয়েকশো token, আর এগুলো হারালেই সবচেয়ে খারাপ ব্যর্থতাগুলো হয়।

**❌ HTTP request-এর ভেতরে লম্বা agent চালানো, কিংবা approval-এর জন্য সেটা খোলা ধরে রাখা**

> প্রথম deploy-ই সেটা মেরে ফেলে, আর শেষ হওয়া প্রতিটি step-এর দাম দুবার দিতে হয়।

**✅ প্রতিটি step-এ checkpoint করুন, budget persist করুন, আর অপেক্ষার সময় process থেকে বেরিয়ে যান**

> Resume-এ বড়জোর একটি step-এর খরচ, আর crash-loop থামে আপনার বেছে নেওয়া budget-এ।

## 🔑 মূল শিক্ষা

- Model stateless, তাই যেকোনো memory আপনার code-কে আবার জোগাতে হয়। ফলে memory হলো storage-এর সমস্যা, যার দায় আপনার।
- Tool output agent-এর window ভরিয়ে ফেলে, তাই কোনো কিছুর সারাংশ করার আগে সেটা সরান।
- লক্ষ্য আর শর্ত ছোট একটি গোছানো state-এ আটকে রাখুন, কারণ সারাংশ চুপচাপ সেগুলো ফেলে দেয়।
- দীর্ঘ সময় চলা agent হলো durable workflow: প্রতিটি step-এ checkpoint করুন, আর তার সঙ্গে budget-ও persist করুন।
- Idempotency key বানান run আর step থেকে, আর মানুষের approval-কে স্থগিত state হিসেবে ধরুন।

## Interview-এর প্রশ্ন

**Q: আপনার agent প্রথম message-এর একটি শর্ত ভুলে গেছে। কী ভুল হয়েছিল?**

Compaction। পরের কোনো step-এর সারাংশ ধরে নিয়েছিল শর্তটা আর প্রাসঙ্গিক নয়, আর কিছুই error দেখায়নি। ভালো summariser
এর সমাধান নয়। আমি লক্ষ্য আর শর্তগুলো একটি গোছানো state-এ রাখি, আর প্রতিটি turn-এ inject করি। তাতে খরচ কয়েকশো token,
আর এই ধরনের ব্যর্থতা পুরোপুরি দূর হয়।

**Q: দশ step-এর পরে agent-এর window ভরে যায়। সারাংশ করবেন, নাকি আগে অন্য কিছু?**

আগে অন্য কিছু: পুরনো tool result সরিয়ে ফেলা। Window-এর বেশিরভাগটাই এমন tool output, যা একবার পড়া হয়েছে, তারপর আর কখনো
কাজে লাগেনি। এটা সরাতে কোনো model call লাগে না। সারাংশ করতে একটি call লাগে, আর কী গুরুত্বপূর্ণ ছিল তা ঠিক করার ভার
পড়ে একটি model-এর ওপর। আমি একটি চিহ্ন রেখে দিই, যাতে agent জানে ফলাফলটা আবার আনা যায়।

**Q: Retry যাতে দুটি email না পাঠায়, তা কীভাবে ঠেকাবেন?**

Run id, step নম্বর আর tool-এর নাম দিয়ে বানানো একটি idempotency key দিয়ে। পরের system-এ এটা retry-কে no-op বানিয়ে দেয়।
Key-টা generate নয়, derive করতে হবে, কারণ retry-তে নতুন key দিলে পুরো ব্যবস্থাটাই অকেজো হয়ে যায়। পরের system-এ
idempotency-র support না থাকলে আমি আগে intent লিখে রাখি, আর resume-এর সময় দেখি কাজটা হয়েছিল কি না।

**Q: ধ্বংসাত্মক একটি step-এর জন্য মানুষের approval কীভাবে implement করবেন?**

State-এর বদল হিসেবে, blocking অপেক্ষা হিসেবে নয়। Run বাকি থাকা call-সহ "approval-এর অপেক্ষায়" হিসেবে checkpoint হয়,
owner-কে জানায়, আর process বেরিয়ে যায়। একটি webhook checkpoint load করে আবার চালু করে। ফলে অপেক্ষার মধ্যে deploy হলেও
ক্ষতি নেই, আর একই approval দুবার এলেও কাজটা দুবার চলতে পারে না। Approval-এর একটি মেয়াদও থাকে।

## এরপর কী পড়বেন

- [Chapter ?? — Context Engineering](#ch-context-engineering) — এই ব্যবস্থাগুলো যে budget ভাগ করে নেয়
- [Chapter ?? — Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is) — কয়েকটি loop একসঙ্গে চললে durability
- [Chapter ?? — Observability ও Cost Engineering](#ch-observability) — চল্লিশ মিনিটের একটি run আসলে কী করেছে, তা পড়া
