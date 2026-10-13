---
sourceHash: "0533534a127bc2c3338b9ae27c0127597fb56f311e7731c79c00fa22374d5d68"
title: "Memory, State ও দীর্ঘ সময়ের কাজ"
translatedAt: "2026-10-12T12:29:48.792Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Memory, State ও দীর্ঘ সময়ের কাজ {#ch-durability-and-long-running-work}

> একটি agent-এর যে তথ্যগুলো দরকার, সেগুলো এমন জায়গায় রাখুন যেখানে window সেগুলো হারাতে পারে না। আর একটি দীর্ঘ run-কে crash-এর পরেও টিকিয়ে রাখুন, একই কাজের জন্য দুবার টাকা না দিয়ে।

**এই অধ্যায়ে:** তিন ধরনের memory · summarise করার আগে tool output সরিয়ে ফেলা · conversation-এর বাইরে একটি working state · checkpoint আর idempotent effect · pause হিসেবে approval

## 💡 মূল ধারণা

Model stateless: দুটি call-এর মাঝে সে কিছুই মনে রাখে না। প্রতিটি memory আসলে এমন কিছু, যা আপনার code আবার
window-এ ঢুকিয়ে দিয়েছে। তাই memory হলো **storage আর selection-এর একটি সমস্যা, যার দায় আপনার।** এর তিনটি অংশ,
যেগুলো মানুষ গুলিয়ে ফেলে: এই turn-এ model কী দেখছে, compaction-এর পরে কী টিকে থাকে, আর পরের সপ্তাহেও কী সত্য থাকবে।

দীর্ঘ run একটি চতুর্থ সমস্যা যোগ করে: crash-এর পরে কী টিকে থাকে। চল্লিশ মিনিট চলা একটি agent loop একটি HTTP
request-এর ভেতরে থাকতে পারে না। Deploy, timeout আর crash — সবই এটাকে থামিয়ে দেয়। আর হারানো প্রতিটি step ছিল
টাকা দিয়ে কেনা একটি model call। তাই একটি long-running agent হলো **একটি durable workflow, যেটা ঘটনাক্রমে একটি model call করে।**

> Conversation একটি cache, database নয়। Durability-র একক হলো step। একটি step শেষ হলে তার result টিকে থাকতেই হবে।
> শেষ না হলে, সেটা আবার চালানো নিরাপদ হতে হবে।

## কীভাবে কাজ করে

### তিন ধরন, তিন আয়ু

| ধরন | কোথায় থাকে | আয়ু | খরচ |
| --- | --- | --- | --- |
| **Working context** | Window | এই request | Token, প্রতিটি step-এ |
| **Session state** | আপনার store, প্রতি turn-এ আবার load হয় | Task বা conversation | Storage, সাথে selection logic |
| **Long-term memory** | একটি database বা index | Session পেরিয়ে | Storage, সাথে retrieval আর staleness |

"এটা ভুলে গেছে" ধরনের বেশিরভাগ bug আসলে মাঝের row-টি না থাকা। দশ step আগে তথ্যটি window-এ ছিল। Compaction
(history ছোট করে window-এ আঁটানো) সেটা ফেলে দিয়েছে, আর অন্য কিছু সেটা ধরে রাখেনি।

### Tool output window খেয়ে ফেলে

একটি agent-এ history **বেশিরভাগই tool output**: file-এর content, search result, API response। Documentation
assistant docs-এর পুরো page পড়ে। Step 8-এ পৌঁছাতে tool result হতে পারে 94,000 token, যেখানে message মাত্র 6,000।
বেশিরভাগই একবার পড়া হয়েছে, আর কখনো ব্যবহার হয়নি। তাই **পুরোনো tool result সরিয়ে ফেলাই জায়গা ফেরত পাওয়ার সবচেয়ে
সস্তা উপায়।** এতে কোনো model call লাগে না। একটি marker রেখে দিন, যাতে দরকার হলে model result-টি আবার fetch করে,
step-টি কখনো ঘটেনি বলে ধরে না নেয়।

**পুরোনো tool result সরানো, পেছনে একটি marker রেখে**

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

Conversation ছোট করতেই হলে সবচেয়ে সস্তাটা দিয়ে শুরু করুন: আগে tool result সরান (বিনা খরচে), তারপর পুরোনো turn
summarise করুন (একটি model call, আর কোনটা জরুরি ছিল তা একটি model ঠিক করে)। Truncate করা বিনা খরচের, কিন্তু চুপচাপ
তথ্য হারায়। পুরো table আছে [Chapter ?? — Context Engineering](#ch-context-engineering)-এ।

> ⚠️ Summarisation এমনভাবে জিনিস হারায়, যা আপনি পরীক্ষা করে দেখতে পারেন না। চেনা ব্যর্থতায় agent প্রথম message-এর
> একটি constraint ভুলে যায়, যেমন "billing service-এ হাত দেবেন না"। Step 12-এর একটি summary ঠিক করেছে, এটা আর
> প্রাসঙ্গিক নয়। Constraint-গুলো summary-র বাইরে pin করে রাখুন।

### এমন একটি working state, যা window হারাতে পারে না

Conversation-কে source of truth ভাবা বন্ধ করুন। Loop-এর পাশে একটি ছোট, structured state রাখুন। Agent কাজ করার
সাথে সাথে এটা update করুন, আর প্রতিটি turn-এ আবার inject করুন।

**যে state compaction আর restart-এর পরেও টিকে থাকে**

```typescript
interface AgentState {
  readonly goal: string;
  readonly constraints: string[];        // pinned; never summarised away
  readonly findings: Record<string, string>;
  readonly completed: string[];
  readonly failed: { step: string; reason: string }[];
}
```

এর খরচ কয়েকশো token। Constraint compaction-এর পরেও টিকে থাকে। শেষ হওয়া কাজ আবার করা হয় না। ব্যর্থতাগুলো চোখের
সামনে থাকে, তাই agent সেগুলো আবার চেষ্টা করা বন্ধ করে। আর এটা structured বলে disk-এ save করা যায়।

### Long-term memory

Session পেরিয়ে memory মানে আলাদা একটি corpus-এর ওপর retrieval।
[Chapter ?? — Embedding, Vector Store ও Retrieval](#ch-retrieval) দেখুন। কঠিন সমস্যা হলো **সময়ের সাথে
পরস্পরবিরোধী তথ্য।** মার্চে store করা "user dark mode পছন্দ করেন" জুনে ভুল হতে পারে, আর store সেটা বুঝতে পারে না।
প্রতিটি memory-তে timestamp দিন, সাম্প্রতিকগুলোকে অগ্রাধিকার দিন, আর নতুন তথ্যকে পুরোনোটার জায়গা নিতে দিন। Memory
ব্যক্তিগত data-ও বটে। কখনো secret বা token store করবেন না, memory-কে একটি time-to-live দিন, আর এদের user id দিয়ে
store-এ scope করুন, prompt-এ নয়।

### প্রতিটি step-এর পরে persist করুন

**একটি checkpoint, পরের step শুরু হওয়ার আগেই লেখা**

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

এখন একটি crash-এর খরচ বড়জোর একটি step। Resume শেষ checkpoint পড়ে। এটা শুরু থেকে replay করে না, কারণ একটি
model step deterministic নয়। Budget-ও checkpoint-এ থাকে। Process memory-তে রাখলে প্রতিটি restart-এ এটা reset হয়ে
যেত, আর একটি crash-loop সীমাহীন bill-এ পরিণত হতো।

### Duplicate effect-ই কঠিন অংশ

একটি read আবার চেষ্টা করা বিনা খরচের। `sendEmail` আবার চেষ্টা করলে দ্বিতীয় একটি email যায়। "Tool চলেছে" আর
"checkpoint লেখা হয়েছে"-এর মাঝখানে crash হলে ঠিক এটাই ঘটে। সমাধান হলো একটি idempotency key — এমন একটি id, যা দিয়ে
receiver একই কাজের পুনরাবৃত্তি উপেক্ষা করতে পারে। এটা `runId` আর step থেকে derive করুন, কারণ retry-তে নতুন key
দিলে পুরো উদ্দেশ্যটাই ব্যর্থ হয়।

| পদ্ধতি | কীভাবে | কোথায় খাটে |
| --- | --- | --- |
| **Idempotency key** | `${runId}:${step}:${toolName}` downstream-এ পাঠানো হয় | যে কোনো API, যা এটা support করে |
| **Write-ahead intent** | "X call করতে যাচ্ছি" record করুন; resume-এ দেখুন সেটা ঘটেছে কি না | যেসব system-এ idempotency support নেই |
| **Design করেই বাদ দিন** | `incrementCounter()`-এর বদলে `setStatus('sent')` | সবসময়, যেখানে সম্ভব |

### তিন স্তরে retry

1. **Tool।** সাময়িক ব্যর্থতা backoff আর একই idempotency key দিয়ে আবার চেষ্টা করুন।
2. **Model।** Tool যদি সত্যিই down থাকে, ব্যর্থতাটা একটি observation হিসেবে ফেরত দিন, যেমন "search index পাওয়া
   যাচ্ছে না"। তখন model অন্য পথ নিতে পারে, বা সৎভাবে থেমে যেতে পারে।
3. **Run।** কিছুই কাজ না করলে checkpoint রেখে fail করুন, যাতে retry নতুন করে শুরু না করে resume করে।

মাঝের স্তরটাই মানুষ বাদ দেয়। এটা না থাকলে একটি run একটি ভাঙা tool-এর পেছনে তার পুরো budget পুড়িয়ে ফেলে।

### Human approval একটি pause, prompt নয়

একটি destructive action-এর approval gate একটি run-কে কয়েকদিন স্থগিত রাখতে পারে। এটা একটি state, blocking call নয়।

**কেউ approve না করা পর্যন্ত run স্থগিত রাখা**

```typescript
if (tool.destructive) {
  await checkpoints.put({ ...run, status: 'awaiting-approval', pending: call });
  await notify(run.owner, call);
  return;                                   // the process exits; nothing is held open
}
// resumed later by an approval webhook, which loads the checkpoint and continues
```

কিছুই খোলা রাখা হয় না, তাই অপেক্ষার সময় একটি deploy কোনো ক্ষতি করে না। Approval-এর সাথে `runId` আর step থাকে,
তাই দুবার click করা button একই step-এ গিয়ে পৌঁছায়, action দুবার চালাতে পারে না। Approval-কে একটি timeout দিন, যাতে
একটি run এক সপ্তাহ পরে এমন এক পৃথিবীতে resume না করে, যেটা ততদিনে বদলে গেছে।

> ⚠️ **যা বদলাতে থাকে:** durable execution framework — যেমন hosted workflow runtime, queue-backed scheduler আর
> agent platform — দ্রুত বদলায়, আর এই ধারণাগুলোকে ভিন্ন ভিন্ন নামে ডাকে। Framework যেটাই হোক, যাচাই করুন যে এটা
> প্রতিটি step checkpoint করে, effect-গুলোকে idempotent key দেয়, আর approval-কে একটি suspended state হিসেবে দেখে।

## কখন ব্যবহার করবেন

| পরিস্থিতি | Mechanism |
| --- | --- |
| দশ step পরে window ভরে গেছে | আগে পুরোনো tool result সরান |
| Constraint কখনো হারানো চলবে না | প্রতিটি turn-এ inject করা structured state |
| পরের সপ্তাহে তথ্য লাগবে | Timestamp আর expiry সহ long-term store |
| 5 min বা তার বেশি সময়ের run, বা scheduled run | Checkpoint করা workflow, idempotent tool, resume করা যায় |
| যে কোনো destructive tool | Approval gate, সময় যতই লাগুক |

## সাধারণ ভুল

**❌ Conversation-কে durable storage হিসেবে ব্যবহার করা**

> এটা compact হয়, truncate হয়, আর restart-এ হারিয়ে যায়। যা কিছু জরুরি, তা এর বাইরে থাকে।

**✅ Goal আর constraint একটি structured state-এ pin করুন**

> এদের খরচ কয়েকশো token, আর এদের হারালে সবচেয়ে খারাপ ব্যর্থতাগুলো ঘটে।

**❌ একটি দীর্ঘ agent-কে HTTP request-এর ভেতরে চালানো, বা approval-এর জন্য খোলা রেখে দেওয়া**

> প্রথম deploy-ই এটাকে মেরে ফেলে, আর শেষ হওয়া প্রতিটি step-এর জন্য দুবার টাকা দিতে হয়।

**✅ প্রতিটি step checkpoint করুন, budget persist করুন, আর অপেক্ষার সময় exit করুন**

> একটি resume-এর খরচ বড়জোর একটি step, আর একটি crash-loop আপনার বেছে নেওয়া budget-এ গিয়ে থামে।

## 🔑 মূল শিক্ষা

- Model stateless, তাই প্রতিটি memory এমন কিছু, যা আপনার code আবার জোগায়। এতে memory হয়ে ওঠে একটি storage সমস্যা, যার দায় আপনার।
- Tool output একটি agent-এর window ভরিয়ে ফেলে, তাই কিছু summarise করার আগে সেটা সরিয়ে ফেলুন।
- Goal আর constraint একটি ছোট structured state-এ pin করুন, কারণ summary চুপচাপ এগুলো ফেলে দেয়।
- একটি long-running agent হলো একটি durable workflow: প্রতিটি step checkpoint করুন, আর তার সাথে budget-ও persist করুন।
- Idempotency key run আর step থেকে derive করুন, আর human approval-কে একটি suspended state হিসেবে model করুন।

## Interview-এর প্রশ্ন

**Q: আপনার agent প্রথম message-এর একটি constraint ভুলে গেছে। কী ভুল হয়েছিল?**

Compaction। পরের একটি step-এর summary ঠিক করেছে, constraint-টি আর প্রাসঙ্গিক নয়, আর কোনো কিছুই error দেয়নি।
আরও ভালো summariser এর সমাধান নয়। আমি goal আর constraint একটি structured state-এ রাখি, আর প্রতিটি turn-এ inject
করি। এর খরচ কয়েকশো token, আর এতে এই ব্যর্থতাটাই আর থাকে না।

**Q: দশ step পরে একটি agent-এর window ভরে যায়। Summarise করবেন, নাকি আগে অন্য কিছু?**

আগে অন্য কিছু: পুরোনো tool result সরিয়ে ফেলা। Window-এর বেশিরভাগই tool output, যা একবার পড়া হয়েছে আর কখনো
ব্যবহার হয়নি। এটা সরাতে কোনো model call লাগে না। Summarise করতে একটি call লাগে, আর কোনটা জরুরি ছিল তা একটি
model-কে ঠিক করতে দেওয়া হয়। আমি একটি marker রেখে দিই, যাতে agent জানে যে সে result-টি আবার fetch করতে পারে।

**Q: একটি retry যাতে দুটি email না পাঠায়, সেটা কীভাবে আটকাবেন?**

Run id, step number আর tool name দিয়ে তৈরি একটি idempotency key দিয়ে। Downstream-এ এটা retry-কে একটি no-op-এ পরিণত
করে। Key-টি derive করতে হবে, generate নয়, কারণ retry-তে নতুন key দিলে উদ্দেশ্যটাই ব্যর্থ হয়। Downstream-এ idempotency
support না থাকলে আমি আগে intent record করি, আর resume-এ দেখি সেটা ঘটেছে কি না।

**Q: একটি destructive step-এর জন্য human approval কীভাবে implement করবেন?**

একটি state change হিসেবে, blocking wait হিসেবে নয়। Run pending call-সহ "approval-এর অপেক্ষায়" হিসেবে checkpoint
করে, owner-কে জানায়, আর process exit করে। একটি webhook checkpoint load করে resume করে। তাই অপেক্ষার সময় একটি deploy
কোনো ক্ষতি করে না, আর duplicate approval action দুবার চালাতে পারে না। Approval-এর মেয়াদও শেষ হয়।

## এরপর কী পড়বেন

- [Chapter ?? — Context Engineering](#ch-context-engineering) — যে budget-এর বিপরীতে এই mechanism-গুলো জায়গা ভাগ করে
- [Chapter ?? — Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is) — যখন একসাথে কয়েকটি loop চলছে, তখন durability
- [Chapter ?? — Observability ও Cost Engineering](#ch-observability) — চল্লিশ মিনিটের একটি run আসলে কী করেছে, তা পড়া
