---
sourceHash: "8ab1d1239cf68f22f318d1e88868eeea4ed7bc630e6018c5e00d747bbe4f0425"
title: "Part III — আধুনিক Frontend Stack"
translatedAt: "2026-10-17T01:05:39.049Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part III — আধুনিক Frontend Stack

এই বই যে কারণে লেখা, সেটা এই অংশ। আর পুরো অংশটা দাঁড়িয়ে একটি দাবির ওপর। **Framework একটি implementation-এর খুঁটিনাটি মাত্র।
আসল architecture হলো rendering model আর state model।** যে engineer শুধু React চালাতে পারেন, তিনি loop-এর প্রথম প্রশ্নের উত্তর
দেন। এর চেয়ে দক্ষ engineer বলতে পারেন server/client boundary কোথায় বসে, আর কেন একটি route stream হয় অথচ পরেরটা হয় না।
কোনো data চার ধরনের state-এর কোনটায় পড়ে, সেটাও বলতে পারেন। সেই engineer পরের প্রতিটি প্রশ্নের উত্তর দেন, React-এ, Svelte-এ,
আর এরপর যা-ই আসুক তাতে।

তাই অংশটা ইচ্ছে করেই দুই ভাগে ভাগ করা। `React/`, `NextJS/` আর `Svelte/` শেখায় সেই tool-গুলো, যার নাম 2026–27-এর job
description-এ সত্যিই থাকে। `Rendering/`, `StateManagement/` আর `Tooling/` শেখায় এদের নিচের model। React 20 এলে এর তিনটি
অংশ নতুন করে লিখতে হবে, বাকি তিনটি লাগবে না।

## অংশগুলো

| অংশ | অধ্যায় | কী নিয়ে |
| --- | ------ | ------- |
| [React](#ch-modern-stack-react-index) | 9 | Model, hook, server/client boundary, concurrency, Actions |
| [Next.js](#ch-modern-stack-nextjs-index) | 7 | App Router, caching, Server Actions, PPR, runtime, auth, BFF |
| [Svelte](#ch-modern-stack-svelte-index) | 3 | Rune, snippet, SvelteKit-এর loading আর form |
| [Rendering](#ch-modern-stack-rendering-index) | 5 | CSR থেকে PPR, hydration-এর খরচ, streaming, প্রতিটি route-এর জন্য বাছাই, SEO |
| [State Management](#ch-modern-stack-state-management-index) | 5 | Server, client, form আর URL state — একটি নয়, চারটি আলাদা সমস্যা |
| [Tooling](#ch-modern-stack-tooling-index) | 5 | Module, Vite, Rust প্রজন্ম, monorepo, linting, styling |

Framework তিনটি, শুধুই তিনটি। Vue আর Angular আসে তুলনার table-এ, যেখানে কোনো tradeoff আরও স্পষ্ট করে, কিন্তু কখনো আলাদা
অধ্যায় হিসেবে নয় (দেখুন `BOOK-SPEC.md` § 6)। Svelte নিজের জায়গা দুইভাবে অর্জন করেছে। জরিপে আসা framework-গুলোর মধ্যে Svelte 5-এর
retention rate সবচেয়ে বেশি, আর SvelteKit ব্যবহারের দিক থেকে দ্বিতীয় meta-framework। তা ছাড়া লেখক নিজে রোজ এই stack-এই ship
করেন।

> ⚠️ **যা বদলাতে থাকে — বইয়ের সবচেয়ে দ্রুত পুরনো হওয়া অংশ এটাই।** এটা লেখা React 19, Next.js 16 আর Svelte 5 ধরে। Next.js-এ
> caching-এর নিয়ম 15-এ বদলেছে, 16-এ আবার বদলেছে, আর React Compiler বদলে দিয়েছে memoisation কিসের জন্য। টেকসই নীতিগুলো আছে
> `Rendering/`, `StateManagement/` আর `Tooling/`-এ: rendering প্রতিটি route-এর আলাদা সিদ্ধান্ত, state-এর ধরন আছে, আর bundler একটি
> graph resolve করে। এই page-এর প্রতিটি API-র নামের চেয়ে এগুলো বেশিদিন টিকবে।

## Interviewer-রা যা যাচাই করেন

এই অংশে senior হওয়ার লক্ষণ হলো **প্রতিটি route-এর জন্য rendering strategy বেছে নেওয়া আর তার পক্ষে যুক্তি দিতে পারা, আর
framework-কে implementation-এর খুঁটিনাটি হিসেবে দেখা।** ছয়টি অংশ জুড়েই চারটি প্রশ্ন ঘুরে ফিরে আসে।

- **Boundary কোথায়, আর কী পার হয়?** Server Component বনাম Client Component হলো 2026–27-এর frontend-এর *আসল* প্রশ্ন। যে candidate
  বলতে পারেন না একটি function কেন এই boundary পেরিয়ে serialise হয় না, তিনি কোনো App Router application ship করেননি।
- **এই component কেন re-render হচ্ছে?** "`memo` যোগ করুন" নয়। উত্তরে থাকবে কোন state বদলেছে, কোন identity ভেঙেছে, আর React
  Compiler আসার পরে memoisation যোগ করা আদৌ আপনার কাজ ছিল কি না।
- **এটা কোন ধরনের state?** Server state, client state, form state আর URL state চারটি আলাদা সমস্যা, চারটি আলাদা tool। Redux-এ
  cache রাখা হলো সেই ক্লাসিক লক্ষণ।
- **কী ব্যবহার না করার সিদ্ধান্ত নিয়েছিলেন?** Library-র দিকে হাত বাড়ানোর চেয়ে platform, `useState` বা একটি static route বেছে
  নেওয়া বেশি জোরালো উত্তর। যাচাই করা হচ্ছে আসলে জটিলতা।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ----------- | -------------- |
| "এটা ধীর কেন?" | "আমি `memo` আর `useCallback` যোগ করেছি" | "Parent প্রতিটি render-এ object-টা নতুন করে বানায়, তাই identity ভেঙে যায় — আর compiler আসার পর থেকে সেই memoisation যোগ করা আমার কাজই নয়" |
| "এই data কোথায় থাকে?" | "Redux-এ, যাতে সবাই হাতের কাছে পায়" | "এটা server state, তাই এর জায়গা query cache-এ; Redux-এ রাখলে একটি দ্বিতীয় copy হবে, যা পুরনো হয়ে যায়" |
| "কোন rendering strategy?" | "Server-side rendering, SEO-র জন্য ভালো" | "Marketing route-এর জন্য static, dashboard-এর জন্য stream করা server rendering, editor-এর জন্য client — প্রতিটি route আলাদা, প্রতিটির কারণ বলে দেওয়া" |

## পড়ার ক্রম

আগে পড়ুন [Chapter ?? — Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum), তারপর আপনার framework, তারপর
বাকিটা। এই ক্রম ইচ্ছে করেই। Rendering spectrum আপনাকে যে শব্দভান্ডার দেয় (hydration, streaming, island, PPR), React আর Next.js-এর
অধ্যায়গুলো সেটা জানা আছে বলেই ধরে নেয়। এরপর React, তারপর Next.js, এটাই নির্ভরতার ক্রম। Svelte যেকোনো জায়গা থেকে আলাদা করে পড়া
যায়।

State Management আর Tooling তিনটি framework-এর কোনোটার ওপর নির্ভর করে না, যেকোনো সময় পড়া যায়।
[Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) দৈর্ঘ্যের তুলনায় এই অংশের যেকোনো অধ্যায়ের চেয়ে বেশি কাজে দেয়।

**Interview sprint:** এই দশটি অধ্যায়ে আছে server/client boundary, effect-এর ফাঁদ, Actions, caching, PPR আর server state। System
design round-এর আগে frontend-heavy senior loop যা জিজ্ঞেস করে, তার বেশিরভাগ এগুলোতেই ধরা পড়ে।

- [Chapter ?? — Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)
- [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)
- [Chapter ?? — useEffect, আর কখন এটা ব্যবহার করবেন না](#ch-when-not-to-use-effect)
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components)
- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms)
- [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)
- [Chapter ?? — Next.js-এ Rendering](#ch-rendering-in-nextjs)
- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state)
- [Chapter ?? — TanStack Query দিয়ে Server State](#ch-server-state)
