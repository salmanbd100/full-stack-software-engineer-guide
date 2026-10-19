---
sourceHash: "8b600fcf1e9e1fdb8fd02a9c81a76cc17265fdab186939259063c9e8ae3fa94d"
title: "Engineering হিসেবে Prompting"
translatedAt: "2026-10-19T07:55:45.564Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Engineering হিসেবে Prompting {#ch-prompting-as-engineering}

> Prompt-কে টাইপ করা message হিসেবে দেখবেন না। দেখুন repository-তে রাখা version করা একটি artefact হিসেবে, যার পেছনে একটি test আছে।

**এই অধ্যায়ে:** system আর user-এর ভাগ · আসল কাজটা করে constraint · যে few-shot তার token-এর দাম তোলে · code হিসেবে prompt · eval-এর পেছনে থেকে prompt বদলানো

## 💡 মূল ধারণা

Chat window-এ prompt একটি message। Application-এ prompt একটি **program artefact**। এটা repository-তে থাকে, এর একটি
identifier থাকে, diff-এ দেখা যায়, review হয়। Prompt বদলালে আপনার product-এর আচরণ বদলায়। আর আপনি ছেড়ে দিলে সেই বদল
code review ছাড়াই ship হয়ে যায়।

এই জায়গার প্রায় সব বদভ্যাস আসে chat window-এর অভ্যাস codebase-এ টেনে আনা থেকে। Chat-এ আপনি আবার টাইপ করে করে এগোন,
আর একটি উত্তর পড়ে বিচার করেন। Production-এ আবার টাইপ করার উপায় নেই, প্রতিটি উত্তর পড়ারও উপায় নেই। আর ছয় মাস পরে
যিনি শব্দগুলো বদলাবেন, তিনি আপনি নন।

> Version আর test ছাড়া একটি prompt হলো এমন config change, যার ধাক্কা একটি deploy-এর সমান, অথচ deploy-এর কোনো নিয়ন্ত্রণ
> তাতে নেই।

## কীভাবে কাজ করে

### System বনাম user: একটি চুক্তি আর একটি payload

এই ভাগটা লেখার ধরনের ব্যাপার নয়। **System prompt** হলো আপনার instruction। Request থেকে request-এ এটা একই থাকে, আপনি
লেখেন, cache করা যায়, আর কর্তৃত্বের জায়গা এটাই। **User message** হলো payload। এটা বদলায়, প্রায়ই কোনো মানুষ বা
document-এর কথা থেকে আসে, আর তাই অবিশ্বস্ত।

```typescript
// The instruction is a constant; the payload is the only thing that varies per call.
const result = await generateText({
  model: MODEL,
  instructions: SUPPORT_AGENT_V4, // AI SDK 7: system text goes here, not in messages
  messages: [{ role: "user", content: userQuestion }],
});
```

ভাগটা ভুল হলে দাম দিতে হয় দুবার। বদলাতে থাকা data system prompt-এ বসালে cache করা যায় এমন prefix ভেঙে যায়, ফলে প্রতিটি
request পুরো দাম দেয়। [Chapter ?? — Context Engineering](#ch-context-engineering) দেখুন। তার ওপর model যে রেখা দেখে
কর্তৃত্ব মাপে, সেটাও ঝাপসা হয়ে যায়। Prompt injection-এর ঠিক ওই ফাঁকটাই দরকার।

> ⚠️ **যা বদলাতে থাকে:** AI SDK 7-এ system prompt সরে গেছে আলাদা একটি `instructions` property-তে, আর `messages`-এর ভেতরের
> system message এখন default-এ বাতিল হয়। টেকসই নীতি হলো, instruction আর payload থাকে আলাদা, স্পষ্ট নাম দেওয়া channel-এ।
> লেখার আগে property-র এখনকার নামটা মিলিয়ে নিন।

### আসল কাজটা করে constraint

অস্পষ্ট request এলোমেলোভাবে খারাপ উত্তর দেয় না। এটা দেয় **সবচেয়ে ছোট এমন output, যা শব্দগুলোর শর্ত মেটায়**। এজন্যই
"আমাকে একটি deployment script লিখে দাও" বললে নিয়ম করে hard-coded, অরক্ষিত, এক region-এর একটা কিছু আসে। সমাধান ভদ্রতা
নয়, বিস্তারিত role-play-ও নয়। সমাধান constraint।

| Constraint | যা ঠেকায় |
| --- | --- |
| কোন version চলছে বলে দিন | পুরনো training data থেকে মনে রাখা deprecated syntax |
| Output-এর format হুবহু বলে দিন | এমন গদ্য, যা পরে আপনাকে খুলে খুলে আলাদা করতে হয় |
| "শুধু দেওয়া context ব্যবহার করো" | সাধারণ জ্ঞান থেকে বানানো উত্তর |
| "আন্দাজ না করে সেটা বলে দাও" | বিশ্বাসযোগ্য অথচ বানানো field আর API |
| প্রতিটি call-এ একটিই উদ্দেশ্য | কয়েকটি কাজ একসঙ্গে বাঁধলে সবগুলোরই মান পড়ে যাওয়া |

Team-রা চতুর্থটাই মিস করে, আর প্রভাব সবচেয়ে বেশি ওটারই। Model-এর স্বভাব হলো *কোনো একটা* উত্তর দেওয়া। "আমি জানি না"
বলাকে স্পষ্টভাবে গ্রহণযোগ্য output বানিয়ে দিলে model বানিয়ে বলার চেয়ে ভালো একটি পথ পায়।

### Few-shot: যে example তার token-এর দাম তোলে

*Few-shot* মানে prompt-এ করে দেখানো example রাখা। আপনার নিয়মকানুনের একটি example সেগুলো বর্ণনা করা একটি paragraph-এর
সমান কাজ করে। এর চেয়ে শক্তিশালী কৌশল নেই, আবার এতে বাড়তি খরচ করে ফেলাও সবচেয়ে সহজ। প্রতিটি example মানে প্রতিটি
request-এ বাড়তি token, চিরকাল।

**দুই-তিনটি example, সাধারণ উদাহরণ দেখে নয়, কতটা জায়গা ঢাকে তা দেখে বাছা:**

```typescript
const CLASSIFY = `Classify the support message. Reply with one label only.

Message: "The invoice PDF will not open"        -> billing
Message: "Can you add SSO to the enterprise plan?" -> feature-request
Message: "Getting a 500 on /api/orders since 09:00" -> incident

Labels: billing | feature-request | incident | other
If the message fits none of these, reply: other`;
```

Example-গুলো তিনটি আলাদা label ঢাকে, আর শেষ line-টা সেই ক্ষেত্র সামলায় যা example-গুলো ঢাকে না। একই label-এর দশটি
example-এ খরচ বেশি, শেখায় কম। Instruction-ই যখন pattern-টা পরিষ্কার করে দেয়, তখন few-shot আর লাভ দেয় না। মেপে
দেখুন, কারণ এটা প্রতি request-এর খরচ।

### Output চাওয়ার আগে plan চান

ভেতরে কোনো design-এর সিদ্ধান্ত আছে এমন যেকোনো কাজে ভাবা আর বানানো আলাদা করুন। Model-কে বলুন, কী করতে চায়, কী ধরে
নিয়েছে, আর request-এর কোন অংশ অস্পষ্ট ছিল, তার একটি তালিকা দিতে। তাতে ভুল ধারণাগুলো তিনশো line তাদের ওপর দাঁড়ানোর
আগেই বেরিয়ে আসে। একটি তালিকা শোধরানো একটি codebase শোধরানোর চেয়ে অনেক সস্তা। "কী অস্পষ্ট ছিল" অংশটাই প্রায়ই সবচেয়ে
কাজের output: ওটা বলে দেয় আপনি কী বলতে ভুলে গেছেন।

### Code হিসেবে prompt

অধ্যায়ের নামটা আক্ষরিক অর্থে সত্যি হয় এখানেই।

| অভ্যাস | কেন জরুরি |
| --- | --- |
| Prompt থাকে একটি file-এ, handler-এর ভেতরে inline নয় | Diff, review আর মালিকানা, সবই সম্ভব হয় |
| প্রতিটি prompt-এর একটি **id আর version** থাকে | যাতে trace বলতে পারে কোনটা এই উত্তরটা দিয়েছে |
| প্রতিটি request-এর সঙ্গে version id log হয় | নইলে regression কার দোষে, বলা যায় না |
| বদল যায় eval suite-এর মধ্য দিয়ে | শব্দ বদলানো মানেই আচরণ বদলানো |
| Render হয় typed input-এর একটি function হিসেবে | Escape না করা template একটি injection-এর দরজা |

```typescript
interface Prompt {
  readonly id: string;      // "support-agent"
  readonly version: number; // bump on every wording change
  render(input: SupportContext): string;
}
```

একই ধারণা আরও বড় পরিসরেও খাটে। কোনো নিয়ম repository-র instruction file-এ লিখে রাখুন, যেমন `AGENTS.md`,
`CLAUDE.md`, বা নির্দিষ্ট path-এর জন্য একটি instructions file। তাহলে নিয়মটা প্রতিটি engineer-এর প্রতিটি request-এ
খাটে, চিরকাল। একই নিয়ম chat-এ টাইপ করলে খাটে একবারই।

### নিরাপদে prompt বদলানো

Prompt edit দেখতে বিনা খরচের, আসলে তা নয়। এগুলো সীমাহীন refactor। একটি case ঠিক করতে যোগ করা একটি clause এমন সব
case-এর আচরণ বদলে দেয়, যেগুলো কেউ আবার চালিয়ে দেখেনি।

```text
Change one thing  →  run the suite  →  compare pass rate  →  keep or revert
```

আরও দুটি অভ্যাস কাজে দেয়। Output প্রায় ঠিক হলে পুরো কাজটা আবার না বলে বলুন "শুধু X বদলাও, বাকি সব হুবহু রাখো"।
নতুন করে লিখলে যে অংশগুলো আগেই ঠিক ছিল, সেগুলো ভাঙে। আর খুঁটিনাটি নয়, পুরো পদ্ধতিটাই যখন ভুল, তখন জোড়াতালি না দিয়ে
ভালো constraint নিয়ে নতুন করে শুরু করুন।

## কখন ব্যবহার করবেন

| পরিস্থিতি | কী ব্যবহার করবেন | এর বদলে নয় |
| --- | --- | --- |
| Output-এর আকার ভুল | Schema দিয়ে বাঁধা output | Formatting নিয়ে আরও কথা |
| Output-এর সুর বা নিয়ম ভুল | দুই-তিনটি example | এক paragraph বর্ণনা |
| Model তথ্য বানায় | "শুধু দেওয়া context ব্যবহার করো", সঙ্গে retrieval | আরও কড়া instruction |
| Model API-র argument বানায় | অনিশ্চয়তাকে স্পষ্টভাবে অনুমতি দেওয়া | সাবলীলতার ওপর ভরসা |
| সময়ের সঙ্গে মান সরে যাচ্ছে | একটি eval suite | কয়েকটি output পড়ে দেখা |

## সাধারণ ভুল

**❌ "এটাকে production-ready বানাও। Best practice মেনে চলো।"**

অসংজ্ঞায়িত শব্দ অসংজ্ঞায়িত output দেয়। কার practice, কোন version-এ, কোন constraint-এ? ওই বাক্যের প্রতিটি শব্দের বদলে
একটি নির্দিষ্ট requirement বসানো যেত, আর তাতে ফল বদলে যেত।

**❌ Debug করার সময় নিজের ধারণাটা বলে দেওয়া**

> "আমার মনে হয় connection pool ফুরিয়ে গেছে, ঠিক কি না দেখো?"

Model তাকে দেওয়া framing-এ শক্ত করে আটকে যায়, আর তার পক্ষে যুক্তি খুঁজে বের করে। তাতে diagnosis-এর সাহায্যকারী হয়ে
যায় আপনার পক্ষপাত পাকা করার যন্ত্র। কাঁচা প্রমাণটা paste করুন, আর কী কী বাদ দিয়েছেন তা বলুন। তারপর ক্রম অনুযায়ী
সাজানো hypothesis চান, প্রতিটির সঙ্গে সেই check, যা ওটাকে ভুল প্রমাণ করতে পারে।

**❌ User-এর input system prompt-এ বসানো**

এতে প্রতিটি request-এ cache ভাঙে, আর instruction-এর channel অবিশ্বস্ত channel-এর সঙ্গে মিশে যায়। Payload যায় user
message-এ।

**✅ অনিশ্চয়তাকে স্পষ্টভাবে অনুমতি দিন**

> "কোনো field বা API আছে কি না নিশ্চিত না হলে, আন্দাজ না করে সেটা বলে দাও।" এই একটি বাক্যেই বানানো field মাপার মতো
> কমে যায়। কারণ সন্দেহ স্বীকার করাটা তখন ব্যর্থতা নয়, সঠিক উত্তর।

## 🔑 মূল শিক্ষা

- Application-এ prompt কোনো message নয়। এটা version করা একটি artefact, যার id, diff আর test আছে।
- System prompt একটি স্থির instruction, আর user message অবিশ্বস্ত payload। দুটি মেশালে caching আর নিরাপত্তা দুটিই যায়।
- অস্পষ্ট request শব্দের শর্ত মেটানো সবচেয়ে ছোট output দেয়, তাই ফল আসলে বদলায় constraint দিয়ে।
- পুরো জায়গা ঢাকে এমন দুই-তিনটি example এক paragraph বর্ণনার চেয়ে ভালো, আর প্রতিটি example প্রতি request-এর স্থায়ী খরচ।
- "আমি জানি না" বলার স্পষ্ট অনুমতি দিলে বানানো field মাপার মতো কমে।

## Interview-এর প্রশ্ন

**Q: Chat window-এর prompt আর production-এর prompt-এর মধ্যে তফাত কী?**

মালিকানা আর বদলের নিয়ন্ত্রণ। Production-এর prompt হলো repository-র একটি file, যার id আর version আছে। প্রতিটি
request-এ তার version log হয়, তাই খারাপ উত্তরকে যে শব্দগুলো তৈরি করেছে সেখান পর্যন্ত trace করা যায়। এটা বদলায় শুধু
eval suite-এর মধ্য দিয়ে, কারণ শব্দ বদলালেই product-এর আচরণ বদলায়। Chat-এ আপনি আবার টাইপ করে করে এগোন, আর একটি
উত্তর পড়ে বিচার করেন। জিনিসটা traffic সামলাতে শুরু করলে এর কোনোটাই আর চলে না।

**Q: Instruction user message-এ না রেখে system prompt-এ রাখবেন কেন?**

তিনটি কারণে, আর তিনটিই জরুরি। এটা স্থির prefix, তাই cache হয়, বদলাতে থাকা অংশটা হয় না। Model এই channel-কেই
কর্তৃত্বের জায়গা ধরে, আর prompt injection ঠিক এই boundary-তেই আক্রমণ করে। আর এতে অবিশ্বস্ত payload আপনার
instruction থেকে স্পষ্টভাবে আলাদা থাকে। এটুকু থাকলেই request-টা নিয়ে আদৌ যুক্তি দিয়ে ভাবা যায়।

**Q: Few-shot কখন আর কাজে দেয় না?**

যখন instruction-ই উত্তর ঠিক করে দেয়, কিংবা সব example একই case দেখায়। Example হলো প্রতি request-এর স্থায়ী token।
তাই পরীক্ষাটা হলো, ওগুলো সরিয়ে দিলে eval score বদলায় কি না। না বদলালে ওগুলো শুধুই খরচ। Example প্রতিনিধিত্বমূলক না
হলে ক্ষতিও করে, কারণ model তখন instruction না মেনে example-এর সঙ্গে মেলায়।

**Q: এখন যে case-গুলো কাজ করছে সেগুলো না ভেঙে prompt বদলাবেন কীভাবে?**

একটি জিনিস বদলাব, suite চালাব, pass rate মিলিয়ে দেখব, তারপর রাখব বা ফিরিয়ে নেব। ঝুঁকিটা হলো, prompt edit দেখতে
স্থানীয়, কিন্তু আসলে তা নয়। একটি case ঠিক করতে যোগ করা clause বাকি সব case-এর আচরণ সরিয়ে দেয়। নির্দিষ্ট একসেট input
আর একটি score ছাড়া সেটা চোখেই পড়ে না। Version বাড়িয়ে log করলেই পরে আসা regression-কে তার কারণ পর্যন্ত trace করা যায়।

**Q: একজন সহকর্মী hallucination ঠিক করতে prompt-এ "hallucinate কোরো না" যোগ করতে চান। আপনার মত?**

এতে প্রায় কিছুই হয় না। Model ইচ্ছে করে বানায় না। ওটা সবচেয়ে বিশ্বাসযোগ্য continuation তৈরি করে, আর এর চেয়ে ভালো
কিছু তার হাতে নেই। কাজ করে একটি ভালো বিকল্প আর একটি ছোট দায়িত্ব। Retrieval দিয়ে তথ্যগুলো দিন, শুধু দেওয়া context থেকে
উত্তর দিতে বলুন, আর "আমি জানি না" বলার স্পষ্ট অনুমতি দিন। যে তথ্য আপনি দেননি, সেটা নিয়েও যদি model-কে নির্ভুল হতে
হয়, তাহলে prompting পুরোপুরি ভুল স্তর।

## এরপর কী পড়বেন

- [Chapter ?? — Context Engineering](#ch-context-engineering) — window-এ prompt কোথায় বসে, আর কী সরিয়ে জায়গা নেয়
- [Chapter ?? — Structured Output](#ch-structured-output) — instruction দিয়ে নয়, API-র স্তরেই আকার বেঁধে দেওয়া
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — instruction আর payload-এর channel কেন আলাদা থাকতেই হবে
