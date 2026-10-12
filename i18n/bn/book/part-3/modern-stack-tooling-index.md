---
sourceHash: "59218ea37337a4474885a8b60f029fb69909d59a92dceafd0b59bff7165b60e8"
title: "Tooling"
translatedAt: "2026-10-12T12:14:24.276Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Tooling

Build tooling আর বিশেষজ্ঞের বিষয় নেই, এটা এখন প্রাথমিক সাক্ষরতা। সাম্প্রতিক developer survey-গুলোতে প্রায় সবাই
যে bundler ব্যবহার করেন, সেটা Vite, আর হাতে লেখা Webpack configuration এখন বিরল। Ecosystem নিয়ে সবচেয়ে সাধারণ
অভিযোগ এখন জটিলতা নিজেই। এতে interview কী জিজ্ঞেস করে, সেটা বদলে যায়। আপনার `webpack.config.js` কেউ দেখতে চায় না।
তাঁরা জানতে চান, build ধীর আর কেউ কারণ জানে না — এমন অবস্থায় আপনি বোঝেন কি না একটি bundler আসলে কী করে।

পাঁচটি অধ্যায়। অধ্যায় 01 সেই mechanism, যা বাকি প্রতিটি অধ্যায় ধরে নেয়। অধ্যায় 02 এই প্রজন্মের tool-গুলো দেখে,
আর কেন এগুলো Rust-এ নতুন করে লেখা হলো। অধ্যায় 03–05 দেখায় tooling কেমন হয়, যখন একটি codebase-এ অনেকগুলো package,
অনেকগুলো team আর একটি CI bill থাকে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                          | কোন প্রশ্নের উত্তর দেয়                                                  |
| -- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Module ও Bundling](#ch-modules-and-bundling)                                 | একটি bundler আসলে কী করে, আর ওই import-টি কেন টিকে গেল? |
| 02 | [Vite, Rust Bundler ও Dev Loop](#ch-vite-and-the-dev-loop)                | Dev server কেন তাৎক্ষণিক অথচ build নয়, আর Rust কী ঠিক করল? |
| 03 | [Monorepo](#ch-monorepos)                                                       | একটি task graph কী এনে দেয়, আর কখন একটি repository খারাপ?    |
| 04 | [বড় পরিসরে Type-Checking ও Linting](#ch-type-checking-and-linting)              | Codebase বাড়ার সাথে সাথে `tsc` আর CI কীভাবে দ্রুত রাখবেন?         |
| 05 | [Styling Strategy](#ch-styling-strategy)                                          | Utility নাকি scoped file, আর একটি runtime library-র খরচ কত?  |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, tooling নিয়ে দুটো প্রশ্ন:

- **"CI-তে 22 মিনিট লাগে। প্রথমে কী করবেন?"** মাপুন, তারপর cache করুন, তারপর ভাগ করুন। শক্তিশালী উত্তর task graph
  নিয়ে কথা বলে, আর একটি পরিবর্তন আসলে কী কী প্রভাবিত করে তা নিয়ে, বড় runner কেনা নিয়ে নয়। Part VIII-এর Docker layer
  caching-এর যুক্তিও এটাই, শুধু অন্য একটি tree-তে প্রয়োগ করা।
- **"ওই dependency-টি client bundle-এ কেন ঢুকে গেল?"** Tree shaking (অব্যবহৃত code বাদ দেওয়া)-এর জন্য লাগে static
  import, `package.json`-এ সৎ side-effect flag, আর shake করার মতো একটি ESM build। যে candidate একটি bundle analysis
  পড়ে দোষী barrel file-টির নাম বলতে পারেন, তিনি সত্যিই এ কাজ করেছেন।

## পড়ার ক্রম

আগে 01 পড়ুন। এটাই mechanism, আর এটা ছাড়া 02 অর্থহীন। তারপর 02।

অধ্যায় 03 আর 04 একে অপরের ওপর নির্ভর করে না। বড় প্রতিষ্ঠানে এগুলোর গুরুত্ব সবচেয়ে বেশি। Dependency-র ওপর
supply-chain নিয়ন্ত্রণ আছে Part VIII-এর pipeline security অধ্যায়ে।

অধ্যায় 05-ও স্বাধীন, আর এটা React-এ ফিরে যায়। Server Component-এর সীমানা styling-এর সিদ্ধান্তকে সীমিত করে, তাই এটা
React section-এর পরে পড়ুন, আগে নয়।

**Interview sprint:** 01 → 02। এরপরের সবকিছু কাজের জ্ঞান।
