---
sourceHash: "59218ea37337a4474885a8b60f029fb69909d59a92dceafd0b59bff7165b60e8"
title: "Tooling"
translatedAt: "2026-10-17T01:36:40.637Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Tooling

Build tooling এখন আর বিশেষজ্ঞের কাজ নয়, সবার জানার মতো মৌলিক জিনিস। সাম্প্রতিক developer survey-গুলোতে দেখা যায়,
প্রায় সবাই bundler হিসেবে Vite ব্যবহার করে, আর হাতে লেখা Webpack configuration এখন বিরল। Ecosystem নিয়ে সবচেয়ে
বড় অভিযোগ এখন জটিলতা নিজেই। এতে interview-এর প্রশ্নও বদলে গেছে। আপনার `webpack.config.js` কেউ দেখতে চায় না।
তারা জানতে চায়, build ধীর হলে আর কেউ কারণ খুঁজে না পেলে, bundler আসলে কী করছে তা আপনি বোঝেন কি না।

পাঁচটি অধ্যায়। Chapter 01 সেই mechanism, যেটা বাকি সব অধ্যায় ধরে নেয়। Chapter 02-এ আছে এই প্রজন্মের tool-গুলো,
আর কেন সেগুলো Rust-এ নতুন করে লেখা হলো। Chapter 03–05 দেখায় codebase-এ যখন কয়েকটি package, কয়েকটি team আর CI-এর
বিল থাকে, তখন tooling কেমন দাঁড়ায়।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                          | যে প্রশ্নের উত্তর দেয়                                                  |
| -- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Module ও Bundling](#ch-modules-and-bundling)                                 | Bundler আসলে কী করে, আর ওই import-টা বাদ পড়ল না কেন? |
| 02 | [Vite, Rust Bundler ও Dev Loop](#ch-vite-and-the-dev-loop)                | Dev server মুহূর্তেই চালু হয়, অথচ build হয় না কেন, আর Rust কী ঠিক করল? |
| 03 | [Monorepo](#ch-monorepos)                                                       | Task graph থেকে কী পাওয়া যায়, আর কখন একটি repository খারাপ পছন্দ?    |
| 04 | [বড় পরিসরে Type-Checking ও Linting](#ch-type-checking-and-linting)              | Codebase বড় হতে থাকলে `tsc` আর CI দ্রুত রাখবেন কীভাবে?         |
| 05 | [Styling Strategy](#ch-styling-strategy)                                          | Utility নাকি scoped file, আর runtime library-র খরচ কত?  |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুতে যে part-স্তরের signal-গুলো আছে, তার ওপর tooling নিয়ে আরও দুটি প্রশ্ন:

- **"CI-তে 22 মিনিট লাগে। প্রথমে কী করবেন?"** আগে মাপুন, তারপর cache, তারপর ভাগ করুন। ভালো উত্তর বড় runner কেনার
  কথা বলে না। বলে task graph-এর কথা, আর একটি পরিবর্তন আসলে কী কী ছোঁয়, সেই কথা। Part VIII-এর Docker layer
  caching-এর যুক্তিই এটা, শুধু অন্য একটি tree-তে খাটানো।
- **"ওই dependency-টা client bundle-এ ঢুকল কেন?"** Tree shaking (অব্যবহৃত code বাদ দেওয়া) কাজ করতে হলে লাগে static
  import, `package.json`-এ সৎ side-effect flag, আর shake করার মতো একটি ESM build। যে candidate bundle analysis পড়ে
  দোষী barrel file-টার নাম বলতে পারে, সে কাজটা সত্যিই করেছে।

## পড়ার ক্রম

আগে 01। এটাই mechanism, আর এটা ছাড়া 02 বোঝা যায় না। তারপর 02।

Chapter 03 আর 04 একে অপরের ওপর নির্ভর করে না। বড় প্রতিষ্ঠানে এগুলোর গুরুত্ব সবচেয়ে বেশি। Dependency-র
supply-chain নিয়ন্ত্রণ আছে Part VIII-এর pipeline security অধ্যায়ে।

Chapter 05-ও আলাদাভাবে পড়া যায়, তবে এটা React-এর দিকে ফিরে তাকায়। Server Component boundary styling-এর সিদ্ধান্তকে
সীমিত করে, তাই এটা React অংশের পরে পড়ুন, আগে নয়।

**Interview sprint:** 01 → 02। এরপরের সবকিছু চাকরিতে কাজে লাগার জ্ঞান।
