---
sourceHash: "8b600fcf1e9e1fdb8fd02a9c81a76cc17265fdab186939259063c9e8ae3fa94d"
title: "Engineering হিসেবে Prompting"
translatedAt: "2026-10-12T12:29:48.945Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Engineering হিসেবে Prompting {#ch-prompting-as-engineering}

> Prompt-কে type করা একটি message হিসেবে নয়, আপনার repository-তে test-সহ একটি versioned artefact হিসেবে দেখুন।

**এই অধ্যায়ে:** system/user ভাগ · কাজটা করে constraint · যে few-shot তার token-এর দাম তোলে · code হিসেবে prompt · একটি eval-এর পেছনে prompt বদলানো

## 💡 মূল ধারণা

একটি chat window-এ prompt হলো একটি message। একটি application-এ এটা একটি **program artefact**। এটা repository-তে
থাকে, এর একটি identifier আছে, diff-এ দেখা যায় আর review হয়। এতে পরিবর্তন করলে আপনার product-এর আচরণ বদলায়, আর
আপনি সুযোগ দিলে এটা code review ছাড়াই ship হয়ে যায়।

এই ক্ষেত্রের প্রায় প্রতিটি খারাপ অভ্যাস আসে chat window-এর ধারণা codebase-এ নিয়ে আসা থেকে। Chat-এ আপনি আবার type
করে এগোন, আর একটি উত্তর পড়ে বিচার করেন। Production-এ আপনি আবার type করতে পারেন না, প্রতিটি উত্তর পড়তে পারেন না,
আর ছয় মাস পরে যিনি শব্দগুলো বদলাবেন, তিনি আপনি নন।

> Version আর test ছাড়া একটি prompt হলো এমন একটি config change, যার প্রভাবের পরিধি একটি deploy-এর সমান, কিন্তু
> কোনো নিয়ন্ত্রণ নেই।

## কীভাবে কাজ করে

### System বনাম user: একটি চুক্তি আর একটি payload

এই ভাগ লেখার ধরন নিয়ে নয়। **System prompt** হলো আপনার instruction। এটা request জুড়ে স্থির, আপনার লেখা, cache করা
যায়, আর কর্তৃত্ব থাকে এখানেই। **User message** হলো payload। এটা বদলায়, প্রায়ই কোনো মানুষ বা document যা বলেছে তা
থেকে আসে, আর তাই এটা অবিশ্বস্ত।

```typescript
// The instruction is a constant; the payload is the only thing that varies per call.
const result = await generateText({
  model: MODEL,
  instructions: SUPPORT_AGENT_V4, // AI SDK 7: system text goes here, not in messages
  messages: [{ role: "user", content: userQuestion }],
});
```

ভাগটা ভুল করলে খরচ দুবার। পরিবর্তনশীল data system prompt-এ বসিয়ে দিলে cacheable prefix ভেঙে যায়, তাই প্রতিটি
request পুরো দাম দেয়। [Chapter ?? — Context Engineering](#ch-context-engineering) দেখুন। এটা সেই রেখাটাও ঝাপসা
করে, যা দিয়ে model কর্তৃত্ব মাপে, আর prompt injection-এর ঠিক এই ফাঁকটাই দরকার।

> ⚠️ **যা বদলাতে থাকে:** AI SDK 7-এ system prompt একটি আলাদা `instructions` property-তে সরে গেছে, আর `messages`-এর
> ভেতরের system message default-ভাবে reject হয়। টেকসই নীতি হলো, instruction আর payload আলাদা, স্পষ্টভাবে চিহ্নিত
> channel-এ থাকে। লেখার আগে property-র বর্তমান নাম নিশ্চিত করুন।

### কাজটা করে constraint

একটি অস্পষ্ট request এলোমেলোভাবে খারাপ উত্তর দেয় না। এটা দেয় **সবচেয়ে ছোট output, যা শব্দগুলোকে সন্তুষ্ট করে**।
এই কারণেই "আমাকে একটি deployment script লিখে দাও" নিয়মিতভাবে hard-coded, অরক্ষিত আর single-region কিছু ফেরত দেয়।
সমাধান ভদ্রতা বা বিস্তারিত role-play নয়। সমাধান constraint।

| Constraint | যা আটকায় |
| --- | --- |
| কোন version-গুলো চলছে তা বলে দিন | পুরোনো training data থেকে মনে রাখা deprecated syntax |
| Output format-এর নাম হুবহু বলুন | এমন গদ্য, যা পরে আপনাকে খুলে খুলে আলাদা করতে হয় |
| "শুধু দেওয়া context ব্যবহার করো" | সাধারণ জ্ঞান থেকে বানানো উত্তর |
| "আন্দাজ না করে সেটা বলো" | বিশ্বাসযোগ্য কিন্তু বানানো field আর API |
| প্রতি call-এ একটি উদ্দেশ্য | একসাথে বাঁধা কয়েকটি কাজের প্রতিটিতে মান কমে যাওয়া |

চতুর্থটাই team-গুলো বাদ দেয়, আর এর প্রভাবই সবচেয়ে বড়। Model-এর default হলো *কোনো একটা* উত্তর দেওয়া। "আমি জানি
না"-কে স্পষ্টভাবে গ্রহণযোগ্য output বানালে সে একটি উত্তর বানানোর চেয়ে ভালো একটি বিকল্প পায়।

### Few-shot: যে উদাহরণ তার token-এর দাম তোলে

*Few-shot* মানে prompt-এ করে দেখানো উদাহরণ রাখা। আপনার convention-এর একটি উদাহরণ সেগুলো বর্ণনা করা একটি
paragraph-এর সমান মূল্যবান। এটা সবচেয়ে শক্তিশালী কৌশল, আর এতেই সবচেয়ে সহজে বেশি খরচ হয়ে যায়। প্রতিটি উদাহরণ
প্রতিটি request-এ token, চিরকাল।

**দুটি বা তিনটি উদাহরণ, সাধারণ হওয়ার জন্য নয়, coverage-এর জন্য বাছা:**

```typescript
const CLASSIFY = `Classify the support message. Reply with one label only.

Message: "The invoice PDF will not open"        -> billing
Message: "Can you add SSO to the enterprise plan?" -> feature-request
Message: "Getting a 500 on /api/orders since 09:00" -> incident

Labels: billing | feature-request | incident | other
If the message fits none of these, reply: other`;
```

উদাহরণগুলো তিনটি আলাদা label cover করে, আর শেষ line সেই case সামলায়, যা উদাহরণগুলো cover করে না। একই label-এর দশটি
উদাহরণ বেশি খরচ করত আর কম শেখাত। Instruction নিজেই pattern-টা স্পষ্ট করে দিলে few-shot আর লাভ দেয় না। এটা মাপুন,
কারণ এটা প্রতি request-এর খরচ।

### Output-এর আগে plan চান

যে কাজের ভেতরে কোনো design সিদ্ধান্ত আছে, সেখানে ভাবা আর তৈরি করাকে আলাদা করুন। Model-কে বলুন তালিকা করতে, সে কী
করতে চায়, কী ধরে নিয়েছে, আর request-এ কী অস্পষ্ট ছিল। এতে ভুল ধারণাগুলো তিনশো line-এর কাজ তাদের ওপর দাঁড়ানোর আগেই
বেরিয়ে আসে। একটি codebase ঠিক করার চেয়ে একটি তালিকা ঠিক করা অনেক সস্তা। "কী অস্পষ্ট ছিল" অংশটাই প্রায়ই সবচেয়ে কাজের
output: এটা বলে দেয় আপনি কী নির্দিষ্ট করে বলতে পারেননি।

### Code হিসেবে prompt

এটাই অধ্যায়ের নামকে আক্ষরিক করে তোলে।

| অভ্যাস | কেন জরুরি |
| --- | --- |
| Prompt একটি file-এ থাকে, handler-এর ভেতরে inline নয় | এর diff দেখা যায়, review করা যায়, মালিক ঠিক করা যায় |
| প্রতিটি prompt-এর একটি **id আর version** আছে | যাতে একটি trace বলতে পারে কোনটা এই উত্তর তৈরি করেছে |
| প্রতিটি request-এর সাথে version id log হয় | নইলে একটি regression কার কারণে, তা বলা যায় না |
| পরিবর্তন eval suite-এর ভেতর দিয়ে যায় | শব্দের পরিবর্তন মানে আচরণের পরিবর্তন |
| Rendering হলো typed input-এর একটি function | Escape না করা template একটি injection point |

```typescript
interface Prompt {
  readonly id: string;      // "support-agent"
  readonly version: number; // bump on every wording change
  render(input: SupportContext): string;
}
```

একই ধারণা বাইরের দিকেও বড় হয়। একটি convention repository-র instruction file-এ লিখুন, যেমন `AGENTS.md`,
`CLAUDE.md` বা একটি path-scoped instructions file। তখন এটা প্রতিটি engineer-এর প্রতিটি request-এ খাটে, চিরকাল। একই
convention একটি chat-এ type করলে খাটে একবার।

### নিরাপদে একটি prompt বদলানো

Prompt edit দেখতে বিনামূল্যে মনে হয়, কিন্তু তা নয়। এগুলো সীমাহীন refactor। একটি case ঠিক করতে যোগ করা একটি clause
এমন case-গুলোর আচরণও সরিয়ে দেয়, যেগুলো কেউ আবার চালায়নি।

```text
Change one thing  →  run the suite  →  compare pass rate  →  keep or revert
```

দুটি সহায়ক অভ্যাস কাজে লাগে। Output প্রায় ঠিক হলে পুরো কাজ আবার না বলে বলুন "শুধু X বদলাও, বাকি সব হুবহু রাখো"।
নতুন করে লিখলে যে অংশগুলো আগেই ঠিক ছিল, সেগুলো ভেঙে যায়। আর খুঁটিনাটি নয়, পদ্ধতিটাই ভুল হলে patch না করে আরও ভালো
constraint দিয়ে নতুন করে শুরু করুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | যার বদলে |
| --- | --- | --- |
| Output-এর আকার ভুল | Schema দিয়ে বাঁধা output | Formatting নিয়ে আরও শব্দ |
| Output-এর tone বা convention ভুল | দুটি বা তিনটি উদাহরণ | এক paragraph বর্ণনা |
| Model তথ্য বানায় | "শুধু দেওয়া context ব্যবহার করো", সাথে retrieval | আরও কড়া একটি instruction |
| Model API argument বানায় | অনিশ্চয়তাকে স্পষ্টভাবে অনুমতি দেওয়া | সাবলীলতার ওপর ভরসা |
| সময়ের সাথে মান সরে যাচ্ছে | একটি eval suite | কয়েকটি output পড়া |

## সাধারণ ভুল

**❌ "এটাকে production-ready বানাও। Best practice মেনে চলো।"**

অসংজ্ঞায়িত শব্দ অসংজ্ঞায়িত output দেয়। কার practice, কোন version-এ, কোন constraint-সহ? ওই বাক্যের প্রতিটি শব্দ
আপনি একটি নির্দিষ্ট requirement দিয়ে বদলে দিতে পারতেন, যা ফলাফল বদলে দিত।

**❌ Debug করার সময় নিজের তত্ত্ব বলে দেওয়া**

> "আমার মনে হয় connection pool ফুরিয়ে গেছে — নিশ্চিত করবে?"

Model-কে যে framing দেওয়া হয়, সে তাতে শক্তভাবে আটকে যায়, আর তার পক্ষে সমর্থন খুঁজে বের করে। এতে একটি diagnostic
সহায়ক আপনার পক্ষপাত নিশ্চিত করার যন্ত্রে পরিণত হয়। কাঁচা প্রমাণ paste করুন, আর কী কী বাদ দিয়েছেন তা বলুন। তারপর
ক্রম অনুযায়ী সাজানো hypothesis চান, প্রতিটির সাথে সেই check, যা এটাকে ভুল প্রমাণ করবে।

**❌ User input-কে system prompt-এ interpolate করা**

এটা প্রতিটি request-এ cache ভাঙে, আর instruction channel-কে অবিশ্বস্ত channel-এর সাথে মিশিয়ে দেয়। Payload যায়
user message-এ।

**✅ অনিশ্চয়তাকে স্পষ্টভাবে অনুমতি দিন**

> "কোনো field বা API আছে কি না নিশ্চিত না হলে, আন্দাজ না করে সেটা বলো।" একটি বাক্য মাপার মতো কম বানানো field দেয়।
> এটা সন্দেহ স্বীকার করাকে failure নয়, সঠিক response বানায়।

## 🔑 মূল শিক্ষা

- একটি application-এ prompt হলো id, diff আর test-সহ একটি versioned artefact — message নয়।
- System prompt একটি স্থির instruction, আর user message অবিশ্বস্ত payload; দুটো মেশালে caching আর নিরাপত্তা দুটোই হারান।
- অস্পষ্ট request শব্দগুলোকে সন্তুষ্ট করা সবচেয়ে ছোট output ফেরত দেয়, তাই ফলাফল আসলে বদলায় constraint।
- Coverage দেওয়া দুটি বা তিনটি উদাহরণ এক paragraph বর্ণনাকে হারায়, আর প্রতিটি উদাহরণ প্রতি request-এ একটি স্থায়ী খরচ।
- "আমি জানি না"-কে স্পষ্টভাবে অনুমতি দিলে বানানো field মাপার মতো কমে।

## Interview-এর প্রশ্ন

**Q: Chat window-এর একটি prompt আর production-এর একটি prompt-এর মধ্যে পার্থক্য কী?**

মালিকানা আর পরিবর্তনের নিয়ন্ত্রণ। Production prompt হলো repository-তে একটি file, যার একটি id আর version আছে। এর
version প্রতিটি request-এ log হয়, তাই একটি খারাপ উত্তরকে যে শব্দগুলো তৈরি করেছে, সেখান পর্যন্ত trace করা যায়।
এটা শুধু eval suite-এর ভেতর দিয়েই বদলায়, কারণ শব্দের একটি edit product-এর আচরণ বদলে দেয়। Chat-এ আপনি আবার type
করে এগোন আর একটি উত্তর পড়ে বিচার করেন। জিনিসটা traffic serve করা শুরু করলে কোনোটাই আর কাজ করে না।

**Q: Instruction user message-এ না রেখে system prompt-এ কেন রাখবেন?**

তিনটি কারণ, আর তিনটিই জরুরি। এটা stable prefix, তাই এটা cache হয়, পরিবর্তনশীল অংশটা হয় না। এটা সেই channel, যাকে
model কর্তৃত্বপূর্ণ মনে করে, আর prompt injection ঠিক এই boundary-তেই আক্রমণ করে। আর এটা অবিশ্বস্ত payload-কে আপনার
instruction থেকে স্পষ্টভাবে আলাদা রাখে। এটাই আপনাকে request নিয়ে আদৌ যুক্তি দিতে দেয়।

**Q: Few-shot কখন আর সাহায্য করে না?**

যখন instruction নিজেই উত্তর ঠিক করে দেয়, বা যখন সব উদাহরণ একই case দেখায়। উদাহরণ হলো প্রতি request-এ স্থায়ী token।
তাই পরীক্ষা হলো, এগুলো সরালে eval score বদলায় কি না। না বদলালে এগুলো শুধুই খরচ। এগুলো প্রতিনিধিত্বমূলক না হলে ক্ষতিও
করে, কারণ model instruction নয়, উদাহরণগুলোর সাথে মেলায়।

**Q: এখন কাজ করছে এমন case না ভেঙে একটি prompt কীভাবে বদলাবেন?**

একটি জিনিস বদলান, suite চালান, pass rate তুলনা করুন, রাখুন বা ফিরিয়ে নিন। ঝুঁকি হলো, prompt edit দেখতে স্থানীয় মনে হয়,
কিন্তু তা নয়। একটি case ঠিক করতে যোগ করা একটি clause বাকি প্রতিটি case-এর আচরণ সরিয়ে দেয়। নির্দিষ্ট একটি input set আর
একটি score ছাড়া আপনি সেটা দেখতে পাবেন না। Version বাড়িয়ে log করাই আপনাকে পরের একটি regression-কে তার কারণ পর্যন্ত
trace করতে দেয়।

**Q: একজন সহকর্মী prompt-এ "hallucinate করো না" যোগ করে একটি hallucination ঠিক করতে চান। আপনার মত কী?**

এতে প্রায় কিছুই হয় না। Model বানানোর সিদ্ধান্ত নিচ্ছে না। সে সবচেয়ে বিশ্বাসযোগ্য continuation তৈরি করে, আর তার সামনে
এর চেয়ে ভালো কিছু নেই। যা কাজ করে তা হলো একটি ভালো বিকল্প আর একটি ছোট কাজ। Retrieval দিয়ে তথ্য দিন, তাকে শুধু দেওয়া
context থেকে উত্তর দিতে বলুন, আর স্পষ্টভাবে "আমি জানি না"-র অনুমতি দিন। যে তথ্য আপনি দেননি, সেগুলো নিয়ে যদি তাকে
সঠিক হতেই হয়, তাহলে prompting পুরোপুরি ভুল স্তর।

## এরপর কী পড়বেন

- [Chapter ?? — Context Engineering](#ch-context-engineering) — window-এ prompt কোথায় বসে, আর সে কী সরিয়ে দেয়
- [Chapter ?? — Structured Output](#ch-structured-output) — instruction দিয়ে নয়, API-র স্তরে আকার বেঁধে দেওয়া
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — instruction আর payload channel কেন আলাদা থাকতেই হবে
