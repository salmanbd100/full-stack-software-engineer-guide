---
sourceHash: "f2f0bce35eb0fa17b457ca881121a3765f26df637ae60a4dd0472b0b4eb372ac"
title: "Meta-Framework বাছাই"
translatedAt: "2026-10-12T12:10:47.732Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Meta-Framework বাছাই {#ch-choosing-a-meta-framework}

> যে চারটি বৈশিষ্ট্যে framework-গুলো আসলেই আলাদা, সেগুলো দিয়ে framework বাছাইয়ের পক্ষে যুক্তি দিন, আর জানুন কোনগুলো নিয়ে পরে মত বদলানো যায়।

**এই অধ্যায়ে:** একটি meta-framework কীসের জন্য · যে চারটি দিকে পার্থক্য · 2027-এর candidate-রা · কী আসলেই ফেরানো যায় · migration-এর খরচ · interview-এ কীভাবে উত্তর দেবেন

## 💡 মূল ধারণা

[Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) প্রতিটি route-কে একটি
rendering strategy দেয়। এই অধ্যায় তার এক ধাপ ওপরে। Framework ঠিক করে কোন কোন strategy পাওয়া যাবে, code কোথায়
চলবে, আর উত্তরের কতটা আপনার জন্য আগেই ঠিক করা আছে।

প্রায় প্রতিটি গুরুতর candidate একটি server-এ HTML render করতে পারে। এদের আলাদা করে **router, data-loading
model আর deployment target**। একটি meta-framework আসলে এগুলোই দেয়। আর codebase যতদিন বাঁচে, ততদিন এগুলো
আপনার সঙ্গে থাকে।

> Framework benchmark দেখে বাছাই করা হয় না। বাছাই করা হয় এটা দেখে যে কোন সিদ্ধান্তগুলো আপনি framework-কে দিয়ে
> নিতে চান, আর কোনগুলো নিজের হাতে রাখতে চান।

## কীভাবে কাজ করে

চারটি দিক গুরুত্বপূর্ণ। বাকি সব (bundler, styling, testing) পরে বদলানো যায়, তাই সিদ্ধান্তের ভার সেগুলোর ওপর
থাকা উচিত নয়।

| দিক | প্রশ্ন | পরে বদলানো কেন কঠিন |
| ---- | ------------ | ------------------------------ |
| **Rendering default** | Server-first নাকি client-first? | এটা ঠিক করে প্রতিটি component-এর code কোথায় চলবে, আর উল্টাতে গেলে প্রতিটি file ছুঁতে হয় |
| **Data loading** | একটি route-এর data কোথা থেকে আসে? | এই pattern প্রতিটি route-এ থাকে; app-এ এটাই সবচেয়ে বেশি পুনরাবৃত্ত code |
| **Deployment target** | Output-এর কোন runtime লাগে? | এটা hosting-কে বেঁধে দেয়, আর hosting বেঁধে দেয় budget আর compliance |
| **Escape hatch** | Model-এর সীমায় পৌঁছালে কী হয়? | এর মুখোমুখি হবেন সবচেয়ে কঠিন feature-এ, আঠারো মাস পরে |

### Candidate-রা

প্রতিটি row-এ একটি version আছে, কারণ এখানকার প্রতিটি row গত দুই বছরে বদলেছে।

| Framework | Rendering default | Data loading | কীসের জন্য সবচেয়ে ভালো |
| --------- | ----------------- | ------------ | -------- |
| **Next.js 16 (App Router)** | Server Components — server-first | `async` component, তারপর write-এর জন্য Server Actions | এমন product application, যেখানে page-এর বেশিরভাগ server-rendered আর team React জানে |
| **React Router 7 / Remix-ধাঁচ** | Client routing সহ server rendering | Route loader আর action, প্রতিটি route-এ একটি করে | যে team web platform-এর form model আর একটি স্পষ্ট data boundary চায় |
| **SvelteKit 2** | Server rendering, client hydration | `load` function, আর write-এর জন্য form action | ছোট bundle, কম framework-আনুষ্ঠানিকতা, আর যে team authoring model-কে মূল্য দেয় |
| **Astro 5** | Static, ইচ্ছামতো island সহ | Build বা request-এর সময় component-level fetching | Content-নির্ভর site, যেখানে interactivity-র কিছু island আছে |

সৎ সারকথা: **একটি application-এর জন্য Next.js আর SvelteKit দুটিই ঠিক উত্তর, আর team-ই সমতা ভাঙে। একটি content
site-এর জন্য Astro একটি আলাদা, আর সাধারণত ভালো, tool।**

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

দুটিই server-এ fetch করে। পার্থক্য হলো **waterfall (যে request-গুলো একটি আরেকটির জন্য অপেক্ষা করে) কোথায় তৈরি
হতে পারে**। Component-level fetching co-location সহজ করে, আর ভুল করে nested waterfall তৈরি করাও সহজ করে।
Route-level loading request-এর তালিকাকে স্পষ্ট করে, আর default-এ parallel রাখে। দাম হলো, একটি component নিজের
data নিজে চাইতে পারে না।

Interview-এ এই tradeoff-টির নামই বলতে হবে। এটা রুচির ব্যাপার নয়। এটা ঠিক করে production-এ একটি ধীর page দেখতে
কেমন হয়, আর সেটা ঠিক করতে আপনি কোথায় যাবেন।

> ⚠️ **যা বদলাতে থাকে:** App Router-এর caching semantics Next.js 15-এ বদলেছে, আর 16-এ আবার। React Router v7-এ
> Remix-কে নিজের মধ্যে নিয়ে নিয়েছে, আর SvelteKit-এর adapter host-দের সঙ্গে সঙ্গে বদলায়। টিকে থাকা প্রশ্নটা
> বদলায় না: data কোথা থেকে আসে, code কোথায় চলে, আর framework-এর সহজ পথ ছেড়ে বেরোতে হলে framework কী করে।

## কখন ব্যবহার করবেন

**যা আপনি আসলেই ফেরাতে পারেন**, তাই সিদ্ধান্তে এর প্রাধান্য থাকা উচিত নয়:

| সিদ্ধান্ত | ফেরানো যায়? | বদলানোর খরচ |
| -------- | ----------- | -------------- |
| Styling পদ্ধতি | ✅ | একটি codemod আর একটি sprint |
| Bundler | ✅ | Configuration, application code নয় |
| Component library | আংশিক | যান্ত্রিক কাজ, কিন্তু সব জায়গায় |
| Data-loading pattern | ❌ | প্রতিটি route |
| Server-first নাকি client-first | ❌ | কার্যত পুরোটা আবার লেখা |
| Hosting target | আংশিক | একটি adapter, যদি না runtime-নির্দিষ্ট API ব্যবহার করে থাকেন |

**Framework-এর প্রশ্নের আগে যে প্রশ্নগুলো করবেন:**

- Team আগে থেকে কী জানে? যে framework-এ কেউ কখনো ship করেনি, সেটা এক quarter-এর velocity খেয়ে ফেলে। সেটা
  সাধারণত candidate-দের মধ্যে যেকোনো পার্থক্যের চেয়ে বড়।
- একটি crawler-এর জন্য এটাকে কী render করতে হবে, আর JavaScript ছাড়া একজন user-এর জন্য কী render করতে হবে?
- এটাকে কোথায় চলতে হবে: আপনার নিজের infrastructure-এ, একটি vendor-এ, নাকি যেকোনো জায়গায়?
- কোন framework পাঁচ বছর পরেও এমন একটি প্রতিষ্ঠান maintain করবে, যার নাম আপনি বলতে পারেন?

### Migration-এর প্রশ্ন

কেউ ফাঁকা পাতায় framework বাছাই করে না। সবাই বাছাই করে পেছনে একটি চালু application নিয়ে। দুটি পথ কাজ করে।
প্রথমটি **route ধরে ধরে strangle করা**: একটি proxy-র পেছনে নতুন framework কিছু path serve করে, আর পুরোনোটি বাকিগুলো।
দ্বিতীয়টি **component ধরে ধরে strangle করা**: shared অংশগুলো custom element হিসেবে ship হয়, যা দুটি stack-ই
mount করতে পারে। একটি switchover তারিখ ধরে parallel rewrite কাজ করে না।

## সাধারণ ভুল

**❌ Benchmark দেখে বাছাই করা।** Framework benchmark-এর পার্থক্যের চেয়ে আপনার image, font আর third-party script
অনেক বেশি গুরুত্বপূর্ণ। শুধু framework-এর hydration overhead-এর কারণে কোনো site কখনো ধীর হয়নি।

**❌ Hiring দেখে বাছাই করা।** "React developer hire করা সহজ" — কথাটা সত্যি। কিন্তু এটা সাধারণত গত দশকের যুক্তি,
সামনের দশকের নয়। এটাকে মাপুন এই বিচারে যে team আগে থেকেই বিকল্পটিতে ship করছে কি না।

**❌ একটি feature-এর জন্য একটি framework গ্রহণ করা।** Partial prerendering, server action বা resumability — কোনোটাই
একটি codebase সরানোর কারণ নয়। জিজ্ঞেস করুন, তিন বছরে feature-টির মূল্য কত engineer-month।

**❌ Escape hatch উপেক্ষা করা।** সময়ের সঙ্গে প্রতিটি application-এর এমন কিছু লাগে, যার পরিকল্পনা framework করেনি:
একটি দীর্ঘ সময় চলা request, একটি websocket, একটি legacy endpoint, একটি খুব নির্দিষ্ট cache header। বাছাই করার
*আগে* পড়ুন, প্রতিটি candidate এটা কীভাবে সামলায়। কষ্টটা ঠিক এখানেই আসে।

## 🔑 মূল শিক্ষা

- একটি meta-framework দেয় একটি router, একটি data-loading model আর একটি deployment target। বাকিগুলো বদলানো যায়,
  আর সিদ্ধান্তের ভার সেগুলোর ওপর থাকা উচিত নয়।
- Rendering model-গুলো কাছাকাছি চলে এসেছে, তাই আসল পার্থক্য data loading-এ। Component-level fetching co-locate করে,
  আর waterfall-এর ঝুঁকি আনে। Route-level loading স্পষ্ট, আর default-এ parallel।
- Server-first বনাম client-first, আর data-loading pattern — এই দুটি সিদ্ধান্ত সস্তায় ফেরানো যায় না।
- Application-এর জন্য Next.js আর SvelteKit দুটিরই পক্ষে যুক্তি দেওয়া যায়, আর team-ই সমতা ভাঙে। Content-নির্ভর
  site-এর জন্য Astro একটি আলাদা tool।
- Migration সফল হয় route ধরে ধরে বা component ধরে ধরে strangle করে, আর ব্যর্থ হয় parallel rewrite হিসেবে।

## Interview-এর প্রশ্ন

**Q: আপনি একটি নতুন product application শুরু করছেন। Next.js নাকি SvelteKit?**

দুটিই কাজ করে, তাই উত্তরটা হতে হবে team আর সীমাবদ্ধতা নিয়ে, framework নিয়ে নয়। যা আসলে আলাদা, তার নাম বলুন:
data-loading model, deployment-এর গল্প, আর যে ecosystem আপনার লাগবে তার আকার। তারপর বলুন কোনটা আপনার সিদ্ধান্ত
ঠিক করবে। Team যদি React-এ ship করে থাকে আর product-এর একটি বড় third-party ecosystem লাগে, তাহলে Next.js। Team
যদি ছোট runtime আর কম framework-আনুষ্ঠানিকতাকে মূল্য দেয়, আর SvelteKit-এর অভিজ্ঞতা থাকে, তাহলে SvelteKit। যে
উত্তর দাবি করে একটি সোজাসুজি ভালো, সেটা প্রশ্নটাই বোঝেনি।

**Q: সেই বাছাইয়ের কোন অংশগুলো আপনি পরে ফেরাতে পারবেন?**

Styling, bundler আর বেশিরভাগ library একটি codemod-এর দামে ফেরানো যায়। Data-loading pattern যায় না, কারণ সেটা
প্রতিটি route-এ লেখা থাকে। Server-first বনাম client-first-ও যায় না, কারণ সেটা ঠিক করে প্রতিটি component-এর code
কোথায় চলবে। Hosting মাঝামাঝি। সাধারণত একটি adapter-এই কাজ হয়ে যায়, যদি না আপনি runtime-নির্দিষ্ট API ব্যবহার
করে থাকেন। এ কারণেই সেগুলো একটি পাতলা module-এর পেছনে রাখা উচিত।

**Q: পাঁচ বছরের পুরোনো একটি client-rendered application-কে কীভাবে একটি server-first framework-এ migrate করবেন?**

Route ধরে ধরে, একটি proxy-র পেছনে। নতুন framework একটি path-এর মালিক, পুরোনো application বাকি সবকিছুর, আর দুটি
স্বাধীনভাবে ship হয়। শুরু করুন কম ঝুঁকির, বেশি মূল্যের একটি route দিয়ে — সাধারণত একটি marketing বা detail page,
যেখানে SEO বা LCP-র লাভ সত্যিকারের। Shared component এমন এক জায়গায় রাখুন, যা দুটি stack-ই ব্যবহার করতে পারে।
আমি একটি switchover তারিখ ধরে parallel rewrite করতাম না। সেটা চলার সময় feature-এর কাজ থামে না, আর দুটি version
আলাদা দিকে সরে যায়।

**Q: কখন একটি meta-framework পুরোপুরি ভুল বাছাই?**

যখন যা তৈরি হচ্ছে সেটা একটি site নয়। একটি embedded widget, login-এর পেছনে এমন একটি internal tool যার SEO বা
first-paint budget নেই, বা একটি desktop application shell — এরা সবাই framework-এর সীমাবদ্ধতার দাম দেয়, কিন্তু তার
মূল্য খুব কমই পায়। Router সহ একটি সাধারণ client-rendered build-এ যন্ত্রপাতি কম, আর এটা যা, সে বিষয়ে সৎ।

## এরপর কী পড়বেন

- [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route) — framework ঠিক হয়ে যাওয়ার পরে, এক ধাপ নিচে একই সিদ্ধান্ত
- [Chapter ?? — Edge বনাম Origin Rendering](#ch-edge-vs-origin-rendering) — deployment-এর দিকটা বিস্তারিত
- [Chapter ?? — Micro-Frontend](#ch-micro-frontends) — যখন একটি framework বাছাই সবার কাজে আসে না, তখন কী করবেন
