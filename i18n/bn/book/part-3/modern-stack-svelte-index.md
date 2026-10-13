---
sourceHash: "7698083c090dc0d6e4e7e81c02ea8edd699aca2f414b88794f713a5db9300b01"
title: "Svelte"
translatedAt: "2026-10-12T07:53:35.950Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Svelte

সেই framework নিয়ে তিনটি অধ্যায়, যেটা survey-তে সবচেয়ে বেশি user ব্যবহার চালিয়ে যেতে চান। Next.js-এর পরে এটা
দ্বিতীয় সবচেয়ে বেশি ব্যবহৃত meta-framework-ও। কিন্তু Svelte এখানে শুধু জনপ্রিয়তার জন্য নয়। একই সমস্যায় এটা React-এর
চেয়ে আলাদা একটি বাজি ধরে। দুটি model একসঙ্গে জানলে framework-এর জ্ঞান architecture-এর জ্ঞানে পরিণত হয়। React আপনার
component আবার চালায় আর ফলাফল diff করে। Svelte 5 আপনার component-কে এমনভাবে compile করে, যাতে শুধু বদলে যাওয়া
state ছোঁয়া অংশগুলোই আবার চলে।

অধ্যায় 01 হলো ভাষা আর component model। অধ্যায় 02–03 হলো SvelteKit — routing, data loading আর form।

**Svelte 5** আর বর্তমান SvelteKit ধরে লেখা। এটা লেখকের প্রতিদিনের stack। তাই এখানকার ফাঁদগুলো সেগুলোই, যেগুলোতে সত্যিই
ঘণ্টার পর ঘণ্টা গেছে, release notes-এর গুলো নয়।

## অধ্যায়গুলো

| #  | অধ্যায়                         | কোন প্রশ্নের উত্তর দেয়                                              |
| -- | ----------------------------- | ------------------------------------------------------------------ |
| 01 | [Runes Model, Component ও Snippet](#ch-svelte-runes) | `$state`, `$derived`, `$effect` আর `$props` কী করে, আর markup কীভাবে একটি component-এ যায়? |
| 02 | [SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) | কোন `load` কোথায় চলে, আর তা থেকে কী stream করা যায়? |
| 03 | [SvelteKit Form Action](#ch-sveltekit-form-actions) | JavaScript বন্ধ থাকলে এই form কীভাবে কাজ করে? |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, Svelte-নির্দিষ্ট দুটি প্রশ্ন:

- **"Signal নাকি virtual DOM — tradeoff কী?"** Fine-grained reactivity diff এড়িয়ে ঠিক সেই node-টাই update করে। দাম
  হলো একটি compiler আর একটি ছোট ecosystem। একটি জোরালো উত্তর শুধু লাভ নয়, দামটাও বলে। সেই সঙ্গে উল্লেখ করে যে
  React signal-এর দিকে তাকিয়েছে, আর এখন পর্যন্ত না বলেছে।
- **"Hydration-এর আগে এই form কেমন আচরণ করে?"** SvelteKit form action প্রথমে একটি আসল HTML form post, তারপর
  একটি enhanced fetch। Progressive enhancement পুরোনো দিনের স্মৃতিচারণ নয়। আপনার bundle পৌঁছানোর আগে আসা একটি
  request-এর জন্যও এটা checkout চালু রাখে।

## পড়ার ক্রম

01, তারপর 02 → 03। আপনি কখনো Svelte না লিখলেও অধ্যায় 01 পড়ুন। React 19-এর সঙ্গে এর তুলনা হলো system design round-এ
একটি framework বাছাইয়ের পক্ষে যুক্তি দিতে শেখার সবচেয়ে দ্রুত উপায়। অধ্যায় 03-এর জোড়া হলো Next.js-এর Server Actions
অধ্যায়: একই সমস্যা, দুটি উত্তর।

**Interview sprint:** 01। Role-এ SvelteKit-এর নাম না থাকলে বাকি সবকিছু চাকরির জ্ঞান, interview-এর জ্ঞান নয়।
