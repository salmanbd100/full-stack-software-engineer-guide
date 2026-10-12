---
sourceHash: "8ab1d1239cf68f22f318d1e88868eeea4ed7bc630e6018c5e00d747bbe4f0425"
title: "Part III — আধুনিক Frontend Stack"
translatedAt: "2026-10-12T07:52:10.115Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part III — আধুনিক Frontend Stack

এই বইটা আসলে এই part-টার জন্যই লেখা, আর এটা একটি দাবির ওপর দাঁড়িয়ে আছে। **Framework একটি implementation
detail। Rendering model আর state model-ই হলো architecture।** যে engineer শুধু React চালাতে পারেন, তিনি একটি loop-এর
প্রথম প্রশ্নের উত্তর দেন। এর চেয়ে দক্ষ engineer বলতে পারেন server/client boundary কোথায় বসে, আর কেন একটি route
stream করে আর পরেরটা করে না। তিনি এটাও বলতে পারেন, কোনো data চার রকম state-এর কোনটার মধ্যে পড়ে। সেই engineer এরপরের
প্রতিটি প্রশ্নের উত্তর দেন, React-এ, Svelte-এ, আর এরপর যা-ই আসুক তাতে।

তাই part-টা ইচ্ছা করেই দুই ভাগে ভাগ করা। `React/`, `NextJS/` আর `Svelte/` সেই tool-গুলো শেখায়, যেগুলোর নাম 2026–27-এর
job description-এ সত্যিই থাকে। `Rendering/`, `StateManagement/` আর `Tooling/` শেখায় এদের নিচের model-গুলো। React 20 এলে
এর তিনটি section revise করতে হবে, আর তিনটি করতে হবে না।

## Section-গুলো

| Section                                                     | অধ্যায় | কী আছে                                                       |
| ----------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| [React](#ch-modern-stack-react-index)                       | 9        | Model, hook, server/client boundary, concurrency, Action   |
| [Next.js](#ch-modern-stack-nextjs-index)                    | 7        | App Router, caching, Server Action, PPR, runtime, auth, BFF    |
| [Svelte](#ch-modern-stack-svelte-index)                     | 3        | Rune, snippet, SvelteKit-এর loading আর form                         |
| [Rendering](#ch-modern-stack-rendering-index)               | 5        | CSR থেকে PPR, hydration-এর খরচ, streaming, route ধরে বাছাই, SEO       |
| [State Management](#ch-modern-stack-state-management-index) | 5        | Server, client, form আর URL state — একটি নয়, চারটি সমস্যা          |
| [Tooling](#ch-modern-stack-tooling-index)                   | 5        | Module, Vite, Rust প্রজন্ম, monorepo, linting, styling      |

Framework তিনটি, আর শুধু তিনটিই। Vue আর Angular আসে comparison table-এ, যেখানে তারা একটি tradeoff-কে আরও স্পষ্ট করে,
কিন্তু কখনো অধ্যায় হিসেবে নয় (`BOOK-SPEC.md` § 6 দেখুন)। Svelte এই জায়গাটা দুবার অর্জন করেছে। Survey করা সব
framework-এর মধ্যে Svelte 5-এর retention rate সবচেয়ে বেশি, আর SvelteKit দ্বিতীয় সর্বাধিক ব্যবহৃত meta-framework।
লেখক নিজেও প্রতিদিন এই stack-এই কাজ ship করেন।

> ⚠️ **চলমান লক্ষ্য — বইয়ের এই part-টাই সবচেয়ে দ্রুত পুরনো হয়।** এটা React 19,
> Next.js 16 আর Svelte 5 ধরে লেখা। Next.js-এ caching-এর আচরণ 15-এ বদলেছে, 16-এ আবার বদলেছে, আর React
> Compiler বদলে দিয়েছে memoisation কীসের জন্য। টেকসই নীতিগুলো আছে `Rendering/`,
> `StateManagement/` আর `Tooling/`-এ: rendering হলো route ধরে নেওয়া সিদ্ধান্ত, state-এর শ্রেণি আছে, আর একটি
> bundler একটি graph resolve করে। এই পাতার প্রতিটি API-র নামের চেয়ে এগুলো বেশি দিন টেকে।

## Interviewer-রা যা যাচাই করেন

এই part-এর senior signal হলো: **প্রতিটি route-এর জন্য একটি rendering strategy বেছে নেন আর সেটার পক্ষে যুক্তি দিতে
পারেন, আর framework-কে implementation detail হিসেবে দেখেন।** ছয়টি section জুড়েই চারটি প্রশ্ন চলে।

- **Boundary কোথায়, আর কী সেটা পার হয়?** Server Component বনাম Client Component-ই 2026–27-এর *সেই*
  frontend প্রশ্ন। যে candidate বলতে পারেন না কেন একটি function এটা পার হয়ে serialise হবে না, তিনি কোনো App
  Router application ship করেননি।
- **এই component কেন re-render হচ্ছে?** "`memo` যোগ করুন" নয়। উত্তরে থাকে কোন state বদলেছে, কোন
  identity ভেঙেছে, আর React Compiler আসার পর memoisation যোগ করা আদৌ আপনার কাজ ছিল কি না।
- **এটা কোন ধরনের state?** Server state, client state, form state আর URL state চারটি আলাদা সমস্যা, চারটি আলাদা
  tool দিয়ে। Redux-এ একটি cache রাখা হলো ক্লাসিক লক্ষণ।
- **আপনি কী ব্যবহার না করার সিদ্ধান্ত নিয়েছেন?** Library-র দিকে হাত বাড়ানোর চেয়ে platform, `useState` বা একটি
  static route-এর দিকে হাত বাড়ানো বেশি শক্ত উত্তর। আসলে যাচাই হচ্ছে complexity।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid উত্তর | Senior উত্তর |
| ----- | ---------- | ------------- |
| "এটা slow কেন?" | "আমি `memo` আর `useCallback` যোগ করেছি" | "Parent প্রতি render-এ object-টি নতুন করে তৈরি করে, তাই identity ভেঙে যায় — আর compiler আসার পর ওই memoisation যোগ করা আমার কাজ ছিল না" |
| "এই data কোথায় থাকে?" | "Redux-এ, যাতে সবাই এটার নাগাল পায়" | "এটা server state, তাই এর জায়গা query cache-এ; Redux হবে একটি দ্বিতীয় copy, যেটা stale হয়ে যাবে" |
| "কোন rendering strategy?" | "Server-side rendering, SEO-র জন্য এটা ভালো" | "Marketing route-এর জন্য static, dashboard-এর জন্য streamed server-rendering, editor-এর জন্য client — route ধরে ধরে, বলা কারণসহ" |

## পড়ার ক্রম

আগে [Chapter ?? — Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum) পড়ুন,
তারপর আপনার framework, তারপর বাকিটা। এই ক্রম ইচ্ছাকৃত। Rendering spectrum আপনাকে সেই শব্দভান্ডার দেয়
(hydration, streaming, islands, PPR), যেটা React আর Next.js-এর অধ্যায়গুলো ধরে নেয় যে আপনি জানেন। এরপর React, তারপর
Next.js নির্ভরতার ক্রমে পড়া যায়, আর Svelte যেকোনো জায়গা থেকে সরাসরি পড়া যায়।

State Management আর Tooling তিনটি framework-এর কোনোটার ওপরই নির্ভর করে না, যেকোনো সময় পড়া যায়।
[Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state) এই part-এর যেকোনো অধ্যায়ের চেয়ে তার দৈর্ঘ্যের তুলনায়
সবচেয়ে বেশি কাজে দেয়।

**Interview sprint:** এই দশটি অধ্যায় server/client boundary, effect-এর ফাঁদ, Action,
caching, PPR আর server state cover করে। মিলিয়ে, একটি frontend-heavy senior loop system design round-এর আগে যা জিজ্ঞেস
করে, তার বেশিরভাগই এগুলোতে আছে।

- [Chapter ?? — Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)
- [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)
- [Chapter ?? — useEffect, আর কখন এটা ব্যবহার করবেন না](#ch-when-not-to-use-effect)
- [Chapter ?? — Server Component ও Client Component](#ch-server-components-vs-client-components)
- [Chapter ?? — Action ও Form](#ch-react-actions-and-forms)
- [Chapter ?? — Data Fetching ও Caching](#ch-nextjs-data-and-caching)
- [Chapter ?? — Next.js-এ Rendering](#ch-rendering-in-nextjs)
- [Chapter ?? — চার ধরনের State](#ch-four-kinds-of-state)
- [Chapter ?? — TanStack Query দিয়ে Server State](#ch-server-state)
