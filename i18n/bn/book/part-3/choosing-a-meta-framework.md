---
sourceHash: "f2f0bce35eb0fa17b457ca881121a3765f26df637ae60a4dd0472b0b4eb372ac"
title: "Meta-Framework বাছাই"
translatedAt: "2026-10-17T01:37:34.636Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Meta-Framework বাছাই {#ch-choosing-a-meta-framework}

> Framework বাছাইয়ের পক্ষে যুক্তি দিন সেই চারটি বৈশিষ্ট্য দিয়ে, যেগুলোতে সত্যিই পার্থক্য আছে। আর জেনে রাখুন, কোনগুলো নিয়ে পরে মত বদলানো যায়।

**এই অধ্যায়ে:** meta-framework আসলে কীসের জন্য · যে চারটি দিকে পার্থক্য · 2027-এর candidate-রা · কোনটা সত্যিই ফেরানো যায় · migration-এর খরচ · interview-এ কীভাবে উত্তর দেবেন

## 💡 মূল ধারণা

[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) প্রতিটি route-এ একটি
rendering strategy বসায়। এই অধ্যায় তার এক ধাপ ওপরে। কোন কোন strategy হাতে থাকবে, code কোথায় চলবে, আর উত্তরের
কতটা আগে থেকেই আপনার জন্য ঠিক করা আছে, সেটা ঠিক করে framework।

গুরুত্ব দেওয়ার মতো প্রায় সব candidate-ই server-এ HTML render করতে পারে। এদের আলাদা করে **router, data-loading
model আর deployment target**। Meta-framework আসলে এগুলোই দেয়। আর codebase যতদিন বাঁচবে, এগুলো আপনার সঙ্গে
থেকে যাবে।

> Framework benchmark দেখে বাছা হয় না। বাছা হয় এটা দেখে যে কোন সিদ্ধান্তগুলো আপনি framework-এর হাতে ছেড়ে দিতে
> চান, আর কোনগুলো নিজের হাতে রাখতে চান।

## কীভাবে কাজ করে

চারটি দিক গুরুত্বপূর্ণ। বাকি সব (bundler, styling, testing) পরে বদলানো যায়, তাই সিদ্ধান্তের ভার ওগুলোর ওপর
পড়া উচিত নয়।

| দিক | প্রশ্ন | পরে বদলানো কঠিন কেন |
| --- | ----- | ------------------ |
| **Rendering default** | আগে server, নাকি আগে client? | প্রতিটি component-এর code কোথায় চলবে সেটা এখানেই ঠিক হয়, আর উল্টাতে গেলে প্রতিটি file-এ হাত দিতে হয় |
| **Data loading** | Route-এর data কোথা থেকে আসে? | Pattern-টা প্রতিটি route-এ থাকে; app-এ সবচেয়ে বেশিবার লেখা code এটাই |
| **Deployment target** | Output চালাতে কোন runtime লাগে? | এটা hosting-কে বেঁধে দেয়, আর hosting বেঁধে দেয় budget আর compliance |
| **Escape hatch** | Model-এর সীমায় পৌঁছালে কী হয়? | এর মুখোমুখি হবেন সবচেয়ে কঠিন feature-এ, আঠারো মাস পরে |

### Candidate-রা

প্রতিটি সারিতে version লেখা আছে, কারণ গত দুই বছরে এখানকার প্রতিটি সারিই বদলেছে।

| Framework | Rendering default | Data loading | কোথায় সবচেয়ে মানায় |
| --------- | ----------------- | ------------ | ------------------- |
| **Next.js 16 (App Router)** | Server Components — আগে server | `async` component, আর write-এর জন্য Server Actions | এমন product application, যার page-এর বেশিরভাগ server-rendered, আর team React জানে |
| **React Router 7 / Remix-ধাঁচ** | Server rendering, সঙ্গে client routing | Route loader আর action, প্রতিটি route-এ একটি করে | যে team web platform-এর form model আর স্পষ্ট data boundary চায় |
| **SvelteKit 2** | Server rendering, client hydration | `load` function, আর write-এর জন্য form action | ছোট bundle, framework-এর আনুষ্ঠানিকতা কম, আর যে team লেখার ধরনকে গুরুত্ব দেয় |
| **Astro 5** | Static, চাইলে island | Build বা request-এর সময় component-level fetching | Content-প্রধান site, মাঝে মাঝে interactive island |

সৎ সারকথা হলো: **application-এর জন্য Next.js আর SvelteKit দুটিই ঠিক উত্তর, আর শেষ সিদ্ধান্ত দেয় team।
Content site-এর জন্য Astro আলাদা জিনিস, আর সাধারণত সেটাই ভালো।**

### আসল পার্থক্য data loading-এ

Rendering model-গুলো কাছাকাছি চলে এসেছে। Data loading আসেনি।

```tsx
// Next.js App Router: data is fetched inside the component that needs it.
export default async function Invoice({ params }: { params: { id: string } }) {
  const invoice = await getInvoice(params.id); // Runs on the server, ships no JS.
  return <InvoiceView invoice={invoice} />;
}
```

```typescript
// Route-loader style: data is fetched for the route, before the component renders.
export async function loader({ params }: { params: { id: string } }) {
  return { invoice: await getInvoice(params.id) };
}
```

দুটিই server-এ fetch করে। পার্থক্য হলো **waterfall (একটির পর একটির জন্য অপেক্ষা করা request) কোথায় তৈরি হতে
পারে**। Component-level fetching-এ data component-এর পাশে রাখা সহজ, কিন্তু ভুল করে nested waterfall তৈরি করাও
সহজ। Route-level loading-এ কোন request যাবে তা স্পষ্ট, আর default-ভাবেই parallel। এর দাম হলো, component নিজের
data নিজে চাইতে পারে না।

Interview-এ এই tradeoff-টাই নাম ধরে বলতে হবে। এটা রুচির ব্যাপার নয়। Production-এ ধীর page দেখতে কেমন হবে, আর
সারাতে কোথায় যেতে হবে, সেটা এখানেই ঠিক হয়।

> ⚠️ **যা বদলাতে থাকে:** App Router-এর caching-এর নিয়ম Next.js 15-এ বদলেছে, 16-এ আবার বদলেছে। React Router v7-এ
> Remix-কে নিজের ভেতরে নিয়ে নিয়েছে, আর SvelteKit-এর adapter host-দের সঙ্গে সঙ্গে বদলায়। টেকসই প্রশ্নটা বদলায় না:
> data কোথা থেকে আসে, code কোথায় চলে, আর framework-এর সহজ পথ ছেড়ে বেরোতে হলে framework কী করে।

## কখন ব্যবহার করবেন

**যা সত্যিই ফেরানো যায়**, তাই সিদ্ধান্তে এগুলোর প্রাধান্য পাওয়া উচিত নয়:

| সিদ্ধান্ত | ফেরানো যায়? | বদলানোর খরচ |
| ------- | ---------- | ---------- |
| Styling-এর ধরন | ✅ | একটি codemod আর একটি sprint |
| Bundler | ✅ | Configuration, application code নয় |
| Component library | আংশিক | যান্ত্রিক কাজ, কিন্তু সব জায়গায় |
| Data-loading pattern | ❌ | প্রতিটি route |
| আগে server, নাকি আগে client | ❌ | কার্যত নতুন করে লেখা |
| Hosting target | আংশিক | একটি adapter, যদি না runtime-নির্দিষ্ট API ব্যবহার করে থাকেন |

**Framework-এর প্রশ্নের আগে যে প্রশ্নগুলো করবেন:**

- Team আগে থেকে কী জানে? যে framework-এ কেউ কখনো ship করেনি, সেটা এক quarter-এর velocity খেয়ে নেয়। Candidate-দের
  মধ্যে যেকোনো পার্থক্যের চেয়ে সাধারণত এটাই বড়।
- Crawler-এর জন্য কী render করতে হবে, আর JavaScript ছাড়া user-এর জন্য কী render করতে হবে?
- এটা কোথায় চলতে হবে: নিজের infrastructure-এ, একটি vendor-এ, নাকি যেকোনো জায়গায়?
- পাঁচ বছর পরেও কোন framework এমন কোনো প্রতিষ্ঠান maintain করবে, যার নাম আপনি বলতে পারেন?

### Migration-এর প্রশ্ন

কেউই ফাঁকা পাতায় framework বাছে না। পেছনে একটি চালু application নিয়েই বাছে। দুটি পথ কাজ করে। প্রথমটি **route ধরে
strangle করা**: একটি proxy-র পেছনে নতুন framework কিছু path serve করে, আর পুরনোটা বাকিগুলো। দ্বিতীয়টি **component
ধরে strangle করা**: shared অংশগুলো custom element হিসেবে ship হয়, যা দুটি stack-ই mount করতে পারে। একটি switchover
তারিখ ধরে পাশাপাশি নতুন করে লেখা কাজ করে না।

## সাধারণ ভুল

**❌ Benchmark দেখে বাছাই।** Framework-এর benchmark-এর পার্থক্যের চেয়ে আপনার image, font আর third-party script অনেক
বেশি গুরুত্বপূর্ণ। শুধু framework-এর hydration overhead-এর কারণে কারও app কখনো ধীর হয়নি।

**❌ Hiring দেখে বাছাই।** "React developer পাওয়া সহজ", কথাটা সত্যি। কিন্তু এটা সাধারণত গত দশকের যুক্তি, সামনের দশকের
নয়। Team ইতিমধ্যে বিকল্পটায় ship করছে কি না, তার সঙ্গে মিলিয়ে ওজন করুন।

**❌ একটি feature-এর জন্য framework নেওয়া।** Partial prerendering, server action বা resumability, কোনোটাই codebase
সরানোর কারণ নয়। জিজ্ঞেস করুন, তিন বছরে feature-টার দাম কত engineer-month।

**❌ Escape hatch উপেক্ষা করা।** সময়ের সঙ্গে প্রতিটি application-এ এমন কিছু লাগে, যার পরিকল্পনা framework করেনি: দীর্ঘ
সময় চলা request, websocket, legacy endpoint, খুব নির্দিষ্ট cache header। বাছাইয়ের *আগেই* পড়ে দেখুন প্রতিটি candidate
এটা কীভাবে সামলায়। কষ্টটা পড়ে এখানেই।

## 🔑 মূল শিক্ষা

- Meta-framework দেয় একটি router, একটি data-loading model আর একটি deployment target। বাকিটা বদলানো যায়, তাই
  সিদ্ধান্তের ভার ওগুলোর ওপর পড়া উচিত নয়।
- Rendering model-গুলো কাছাকাছি চলে এসেছে, তাই সত্যিকারের পার্থক্য data loading-এ। Component-level fetching data-কে
  পাশে রাখে, কিন্তু waterfall-এর ঝুঁকি আনে। Route-level loading স্পষ্ট, আর default-ভাবেই parallel।
- আগে server না আগে client, আর data-loading pattern, এই দুটি সিদ্ধান্ত সস্তায় ফেরানো যায় না।
- Application-এর জন্য Next.js আর SvelteKit দুটিরই পক্ষে যুক্তি দেওয়া যায়, শেষ সিদ্ধান্ত দেয় team। Content-প্রধান
  site-এর জন্য Astro আলাদা জিনিস।
- Migration সফল হয় route ধরে বা component ধরে strangle করে। পাশাপাশি নতুন করে লিখতে গেলে ব্যর্থ হয়।

## Interview-এর প্রশ্ন

**Q: নতুন একটি product application শুরু করছেন। Next.js, নাকি SvelteKit?**

দুটিই চলে, তাই উত্তর হতে হবে team আর সীমাবদ্ধতা নিয়ে, framework নিয়ে নয়। সত্যিই যেখানে পার্থক্য, সেগুলোর নাম
বলুন: data-loading model, deployment-এর গল্প, কত বড় ecosystem আপনার লাগবে। তারপর বলুন কোনটা আপনার সিদ্ধান্ত ঠিক
করবে। Team React-এ ship করেছে, আর product-এ বড় third-party ecosystem লাগে? তাহলে Next.js। Team ছোট runtime আর
কম আনুষ্ঠানিকতা পছন্দ করে, আর SvelteKit-এর অভিজ্ঞতা আছে? তাহলে SvelteKit। যে উত্তর বলে একটি এমনিতেই ভালো, সে
প্রশ্নটাই বোঝেনি।

**Q: এই সিদ্ধান্তের কোন অংশগুলো পরে ফেরানো যায়?**

Styling, bundler আর বেশিরভাগ library একটি codemod-এর খরচে ফেরানো যায়। Data-loading pattern যায় না, কারণ সেটা
প্রতিটি route-এ লেখা। আগে server না আগে client, সেটাও যায় না, কারণ প্রতিটি component-এর code কোথায় চলবে তা
ওখানেই ঠিক হয়। Hosting মাঝামাঝি। সাধারণত একটি adapter-এই হয়ে যায়, যদি না runtime-নির্দিষ্ট API ব্যবহার করে
থাকেন। এজন্যই ওগুলো একটি পাতলা module-এর পেছনে রাখা উচিত।

**Q: পাঁচ বছরের পুরনো একটি client-rendered application-কে server-first framework-এ কীভাবে migrate করবেন?**

Route ধরে, একটি proxy-র পেছনে। নতুন framework একটি path-এর মালিক, পুরনো application বাকি সবকিছুর, আর দুটি আলাদা
আলাদা ship হয়। শুরু করুন কম ঝুঁকির কিন্তু বেশি মূল্যের একটি route দিয়ে, সাধারণত marketing বা detail page, যেখানে
SEO বা LCP-তে সত্যিকারের লাভ আছে। Shared component এক জায়গায় রাখুন, যাতে দুটি stack-ই ব্যবহার করতে পারে। আমি
switchover তারিখ ধরে পাশাপাশি নতুন করে লিখব না। ততদিন feature-এর কাজ থেমে থাকে না, আর দুটি version আলাদা দিকে
সরে যায়।

**Q: কখন meta-framework একেবারেই ভুল পছন্দ?**

যখন যা বানাচ্ছেন সেটা site-ই নয়। Embedded widget, login-এর পেছনের internal tool যেখানে SEO বা first-paint budget
নেই, কিংবা desktop application-এর shell, সবগুলোই framework-এর সীমাবদ্ধতার দাম দেয়, কিন্তু তার সুবিধা পায় সামান্যই।
Router-সহ সাধারণ client-rendered build-এ যন্ত্রপাতি কম, আর সেটা যা, তা-ই বলে।

## এরপর কী পড়বেন

- [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) — framework ঠিক হওয়ার পরে একই সিদ্ধান্ত, এক ধাপ নিচে
- [Chapter ?? — Edge বনাম Origin Rendering](#ch-edge-vs-origin-rendering) — deployment-এর দিকটা বিস্তারিত
- [Chapter ?? — Micro-Frontend](#ch-micro-frontends) — একটি framework দিয়ে সবার কাজ না চললে কী করবেন
