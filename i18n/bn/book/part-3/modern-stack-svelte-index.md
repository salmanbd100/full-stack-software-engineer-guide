---
sourceHash: "7698083c090dc0d6e4e7e81c02ea8edd699aca2f414b88794f713a5db9300b01"
title: "Svelte"
translatedAt: "2026-10-17T01:36:36.085Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Svelte

এই তিনটি অধ্যায় সেই framework নিয়ে, যেটা survey-তে সবচেয়ে বেশি user ব্যবহার চালিয়ে যেতে চান। Next.js-এর পরে
এটাই দ্বিতীয় সর্বাধিক ব্যবহৃত meta-framework। তবে Svelte এখানে শুধু জনপ্রিয়তার জন্য নেই। একই সমস্যায় এটা React-এর
থেকে আলাদা বাজি ধরে। দুটি model একসঙ্গে জানা থাকলে framework-এর জ্ঞান architecture-এর জ্ঞান হয়ে ওঠে। React আপনার
component আবার চালায়, তারপর ফলাফল diff করে। Svelte 5 আপনার component এমনভাবে compile করে, যাতে শুধু বদলানো
state ছোঁয়া অংশগুলোই আবার চলে।

অধ্যায় 01 হলো ভাষা আর component model। অধ্যায় 02–03 SvelteKit নিয়ে: routing, data loading আর form।

লেখা হয়েছে **Svelte 5** আর বর্তমান SvelteKit ধরে। এটা লেখকের প্রতিদিনের stack। তাই এখানকার gotcha-গুলো সেগুলোই,
যেগুলোতে সত্যিই ঘণ্টার পর ঘণ্টা গেছে, release notes-এ যা লেখা থাকে সেগুলো নয়।

## অধ্যায়গুলো

| #  | অধ্যায়                         | কোন প্রশ্নের উত্তর দেয়                                              |
| -- | ----------------------------- | ------------------------------------------------------------------ |
| 01 | [Runes Model, Component ও Snippet](#ch-svelte-runes) | `$state`, `$derived`, `$effect` আর `$props` কী করে, আর markup কীভাবে component-এ যায়? |
| 02 | [SvelteKit-এ Routing ও Loading](#ch-sveltekit-routing-and-loading) | কোন `load` কোথায় চলে, আর সেখান থেকে কী stream করা যায়? |
| 03 | [SvelteKit Form Action](#ch-sveltekit-form-actions) | JavaScript বন্ধ থাকলে এই form কীভাবে কাজ করে? |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, Svelte-এর নিজস্ব দুটি প্রশ্ন:

- **"Signal নাকি virtual DOM — tradeoff কী?"** Fine-grained reactivity diff বাদ দিয়ে ঠিক সেই node-টাই update
  করে। দাম হলো একটি compiler আর তুলনায় ছোট ecosystem। ভালো উত্তর শুধু লাভ নয়, দামটাও বলে। সঙ্গে এটাও উল্লেখ
  করে যে React signal নিয়ে ভেবে দেখেছে, আর এখন পর্যন্ত না বলেছে।
- **"Hydration-এর আগে এই form কেমন আচরণ করে?"** SvelteKit form action আগে একটি সত্যিকারের HTML form post, তারপর
  enhance করা fetch। Progressive enhancement পুরনো দিনের স্মৃতিচারণ নয়। আপনার bundle পৌঁছানোর আগেই যে request
  চলে আসে, তার জন্যও checkout চালু রাখে এটা।

## পড়ার ক্রম

আগে 01, তারপর 02 → 03। কখনো Svelte না লিখলেও অধ্যায় 01 পড়ুন। React 19-এর সঙ্গে এর তুলনাটাই system design round-এ
framework-এর পছন্দ defend করতে শেখার সবচেয়ে দ্রুত পথ। অধ্যায় 03 পড়ুন Next.js-এর Server Actions অধ্যায়ের সঙ্গে
মিলিয়ে: একই সমস্যা, দুটি উত্তর।

**Interview sprint:** 01। Role-এ SvelteKit-এর নাম না থাকলে বাকি সবই চাকরির জ্ঞান, interview-এর নয়।
