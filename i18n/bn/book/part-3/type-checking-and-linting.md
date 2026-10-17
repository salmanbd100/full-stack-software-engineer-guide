---
sourceHash: "e3f08fa2c99e0736677b041e7121f0caaceb9af3931465d68aea6e60ea5fa56f"
title: "বড় পরিসরে Type-Checking ও Linting"
translatedAt: "2026-10-17T01:40:34.221Z"
model: "claude-opus-5-5 (Claude Code)"
---

# বড় পরিসরে Type-Checking ও Linting {#ch-type-checking-and-linting}

> মানুষ যে তিনটি কাজ এক করে চালায়, সেগুলো আলাদা করুন, আর পুরো program জুড়ে চলা কাজটাকে critical path থেকে সরিয়ে রাখুন।

**এই অধ্যায়ে:** তিনটি কাজ, তিন রকম খরচ · project reference · `skipLibCheck` · type-aware rule আর তার খরচ · Biome আর Oxlint · merge আটকায় কী

## 💡 মূল ধারণা

"Code quality" নামের নিচে তিনটি আলাদা কাজ একসঙ্গে বাঁধা থাকে। অথচ তাদের খরচে আকাশ-পাতাল তফাত।

**Formatting** syntactic। একটি file পড়ে, বাকি সব উপেক্ষা করে, আর মুহূর্তেই শেষ হয়।

**Linting** হলো pattern মেলানো। বেশিরভাগ rule একটি file পড়ে আর দ্রুত শেষ হয়। অল্প কিছু rule-এর পুরো program লাগে,
আর সেগুলোর খরচ type-checking-এর সমান।

**Type-checking** semantic, আর পুরো program জুড়ে চলে। একটি call valid কি না জানতে হলে, সেটা যত type ছোঁয়, সবগুলো
transitively resolve করতে হয়। এটা file ধরে ধরে করা যায় না, আবার বাদও দেওয়া যায় না।
[Chapter ?? — Vite, Rust Bundler ও Dev Loop](#ch-vite-and-the-dev-loop)-এ যেমন বলা হয়েছে, bundler type যাচাই না
করেই মুছে ফেলে।

প্রায় প্রতিটি ধীর pipeline-এ এই তিনটির একটি এমন কাজ করে, যা আসলে আরেকটির। নয়তো পুরো program-এর কাজটা দরকারের চেয়ে
বেশিবার চলে।

> ⚠️ **যা বদলাতে থাকে:** এই অধ্যায়ের দুই অংশই native ভাষার দিকে যাচ্ছে। July 2026-এ বেরোনো TypeScript 7 হলো Go-তে
> port করা compiler। এটা প্রায় দশ গুণ দ্রুত check করে, আংশিকভাবে কয়েকটি checker আলাদা thread-এ চালিয়ে। Rust
> linter-গুলো এখনো তাদের না থাকা type-aware rule যোগ করছে। আপনার version কী support করে, দেখে নিন। টেকসই অংশটা হলো
> খরচের model: implementation যে-ই লিখুক, পুরো program জুড়ে চলা কাজ দামি।

## কীভাবে কাজ করে

### Type-checking কেন parallel হয় না

Linter হাজারটা file আটটি core-এ ভাগ করে দিতে পারে। Type-checker সেটা পরিষ্কারভাবে পারে না। File A check করতে হলে
A যা কিছু import করে, তার সবগুলোর resolve হওয়া type লাগে। এই প্রয়োজনগুলো মিলে সেই একই graph তৈরি হয়, যেটা ধরে
bundler হাঁটে। TypeScript 7 checker-গুলো parallel-এ চালায় ঠিকই, কিন্তু প্রতিটি checker-কে যে shared import ছোঁয়,
সেগুলো আবার resolve করতে হয়। তাই linter-এর তুলনায় বেশি core থেকে লাভ কম।

হাতে তিনটি lever আছে, গুরুত্বের ক্রমে।

**`skipLibCheck: true`।** এটা না থাকলে compiler `node_modules`-এর প্রতিটি `.d.ts` file check করে: হাজার হাজার
declaration, যেগুলো আপনি লেখেননি আর ঠিকও করতে পারবেন না। প্রায় প্রতিটি আসল project এটা চালু রাখে।

**`incremental: true`।** Compiler একটি `.tsbuildinfo` file লেখে, যেখানে থাকে কী কী check হয়েছে। পরের run-এ
শুধু বদলানো অংশ আবার check হয়। Continuous integration-এ ওই file cache করুন, নইলে লাভটা থাকে শুধু developer-দের
machine-এ।

**Project reference।** আসল scaling-এর কৌশল এটাই, আর বেশিরভাগ team কখনো এটা ব্যবহার করে না।

### Project reference, আর কেন এটা কাঠামো বদলে দেয়

সাধারণত একটি application check করা মানে, সেটা যত package import করে, সবগুলোর source আবার check করা। Project
reference এটা বদলে দেয়। প্রতিটি project একবার compile হয়ে `.d.ts` **declaration file** তৈরি করে। Downstream
project-গুলো source-এর বদলে সেই declaration পড়ে।

```json
// packages/web/tsconfig.json
{
  "compilerOptions": { "composite": true, "declaration": true },
  "references": [{ "path": "../ui" }, { "path": "../types" }]
}
```

এরপর `tsc --build` reference graph ধরে হাঁটে, আর dependency-র ক্রমে প্রতিটি project একবার করে check করে। যে project-এর
build info এখনো valid, সেটা বাদ দেয়, আর স্বাধীন project-গুলো parallel-এ চালাতে পারে।

খরচটা সত্যিকারের। Reference করা প্রতিটি project-এ `composite: true` লাগে, আর declaration emit করতে হয়। Downstream-এর
কোনো কিছুর সঙ্গে circular reference-ও আর রাখা যায় না। এই শেষ নিয়মটা দেখতে ঝামেলা মনে হলেও সাধারণত আসলে সুবিধা।
এতে package-এর boundary-গুলো acyclic হতে বাধ্য হয়, যেটা এমনিতেই হওয়া উচিত ছিল। কাজের একক তখন repository নয়,
package। [Chapter ?? — Monorepo](#ch-monorepos)-এর task graph build-এর ক্ষেত্রে ঠিক এই বদলটাই আনে।

### দুই ধরনের lint rule

| | Syntactic rule | Type-aware rule |
| --- | --- | --- |
| **কী পড়ে** | একটি file-এর syntax tree | পুরো type graph |
| **উদাহরণ** | অব্যবহৃত variable, import-এর ক্রম, hook-এর dependency array | Floating promise, unsafe `any` ছড়িয়ে পড়া, অপ্রয়োজনীয় conditional |
| **খরচ** | প্রতি file-এ কয়েক millisecond, parallel | Type-checking-এর সমান দামি, আরেকবার |
| **Parallel হয়** | হ্যাঁ | না |

"Linting-এ আট মিনিট লাগে কেন", তার উত্তর এই table। Type-aware preset চালু করলে linter-কে দ্বিতীয় একটি পূর্ণ type
program তৈরি করতে হয়। মানে আপনি এখন দুবার type-check করছেন।

বাস্তবে কাজের ব্যবস্থাটা হলো ভাগ করে নেওয়া:

- **দ্রুত একটি Rust linter — Biome বা Oxlint — প্রতিটি file-এ, প্রতিটি commit-এ।** Syntactic rule, অব্যবহৃত code,
  import-এর পরিচ্ছন্নতা, framework-এর rule। Pre-commit hook হওয়ার মতো দ্রুত।
- **ছোট, ভেবেচিন্তে বাছা কিছু type-aware rule**, continuous integration-এ type check-এর পাশাপাশি একবার চালানো।
  পুরো preset চালু না করে সেগুলো বাছুন, যেগুলো আসল bug ধরে। Await না করা promise এর সবচেয়ে বড় উদাহরণ।

### Formatting আর linting এক নয়

কোনো lint rule whitespace নিয়ে হওয়া উচিত নয়। Formatting deterministic, আর machine নিজেই ঠিক করতে পারে, তাই এটা কখনো
মানুষের কাছে পৌঁছানো বা build fail করানো উচিত নয়:

| কোথায় | কী করবেন |
| ----- | ---------- |
| Editor | Save করলেই format |
| Pre-commit | Stage করা file format করুন |
| Continuous integration | যাচাই করুন, আর ঠিক করার হুবহু command দিয়ে fail করুন — অথবা ঠিক করে push করুন |
| Code review | কখনো না। ফাঁকা line নিয়ে comment মানে process-এর ব্যর্থতা |

Biome formatting আর linting এক binary-তেই করে। এতে দুটি tool-এর মাঝের configuration-এর জোড়টা আর থাকে না, যেটা নিয়ে
এক দশক ধরে তর্ক চলেছে।

### Merge আটকায় কী

সবকিছুকে block করতে হবে না। কাজের একটি default:

| Check | Merge আটকায় | কেন |
| ----- | -------------- | --- |
| Formatting | হ্যাঁ, নিজে থেকেই ঠিক হয় | খরচ নেই, আর diff-এর গোলমাল ঠেকায় |
| দ্রুত lint rule | হ্যাঁ | কয়েক সেকেন্ড লাগে, আসল ভুল ধরে |
| Affected project-এ `tsc --build` | **হ্যাঁ** | আর কিছুই type যাচাই করে না |
| Type-aware lint rule | হ্যাঁ, যদি set ছোট হয় | নইলে type-check দ্বিগুণ হয়ে যায় |
| পুরো repository-র type check | রাতে | Affected-only run থেকে যে অমিল জমে, তা ধরে |
| Dependency আর licence audit | রাতে, শুধু alert | এটা pull request-এর author-এর সমস্যা নয় |

বাস্তবে দুটি নিয়ম বড় পার্থক্য গড়ে দেয়। **প্রতিটি check নিজের আলাদা job-এ চালান**, যাতে pipeline লাল হলে "build
failed" না বলে আসল সমস্যার নাম বলে। আর **এগুলো শুধু affected package-এ চালান**, পুরোটার sweep রাখুন schedule-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | যা করবেন |
| --------- | -- |
| একটি application, কয়েকশো file | `skipLibCheck` সহ `tsc --noEmit`। আর কিছু লাগে না |
| Shared package সহ monorepo | Project reference আর `tsc --build` |
| Lint-এ কয়েক মিনিট লাগে | Syntactic আর type-aware আলাদা করুন; প্রথমটা Rust linter-এ সরান |
| নতুন repository শুরু | Formatting আর দ্রুত rule-এর জন্য Biome, সঙ্গে ছোট একটি type-aware set |
| আগে থেকে থাকা বড় ESLint configuration | আগে syntactic rule-গুলো migrate করুন; কঠিন অংশ type-aware-গুলো |

## সাধারণ ভুল

**❌ Build সবুজ মানেই type ঠিক আছে, এমন ভরসা করা।**
✅ Bundler type মুছে ফেলেছে। যাচাই করেছে একমাত্র `tsc`।

**❌ শুনতে পুঙ্খানুপুঙ্খ লাগে বলে পুরো type-aware lint preset চালু করা।**
✅ সবচেয়ে দামি check দ্বিগুণ করেছেন, এমন rule পাওয়ার জন্য যেগুলো কেউ পড়ে না। যেগুলো bug ধরে, সেগুলো বাছুন।

**❌ Continuous integration-এ `--fix` চালিয়ে ফলাফল commit করা।**
✅ তাহলে pipeline নিজেই code লিখছে। Local-এ চালানোর command দিয়ে fail করুন, অথবা শুধু formatting ঠিক করুন, আলাদা
ধাপে।

**❌ কড়াকড়ির জন্য `skipLibCheck` বন্ধ করা।**
✅ এখন এমন dependency-র type error-এ আটকে থাকবেন, যেগুলো আপনি edit করতে পারেন না।

**❌ দুই run-এর মাঝে `.tsbuildinfo` cache না করা।**
✅ Incremental checking তাহলে কিছুই করছে না। প্রতিটি run একেবারে শূন্য থেকে শুরু হয়।

**❌ Pull request-এ formatting review করা।**
✅ এটা automate করুন। Whitespace-এ মানুষের মনোযোগ খরচ করা একটি brace সোজা করার সবচেয়ে দামি উপায়।

## 🔑 মূল শিক্ষা

- Formatting, linting আর type-checking-এর খরচ আলাদা। তিনটিকে এক ভাবলে pipeline ধীর হয়।
- Type-checking পুরো program জুড়ে চলে, ভাগ করা যায় না। Lever হলো `skipLibCheck`, incremental build আর project reference।
- Project reference source-এর বদলে declaration file পড়ে, ফলে check করার একক হয়ে যায় package।
- Type-aware lint rule-এর খরচ আরেকটি পূর্ণ type-check। Preset হিসেবে নয়, ভেবেচিন্তে চালু করুন।
- `tsc` ছাড়া আর কিছুই type যাচাই করে না, তাই merge আটকানোর দায়িত্ব এর।

## Interview-এর প্রশ্ন

**Q: Linting যেভাবে parallel করা যায়, type-checking সেভাবে করা যায় না কেন?**

কারণ একটি file check করতে হলে সেটা যা কিছু import করে, transitively তার সবগুলোর resolve হওয়া type লাগে। এটা
dependency graph-এর ওপর পুরো program জুড়ে analysis, file ধরে ধরে একটি pass নয়। Parallel করতে হলে graph-টাকে ঘোষণা
করা boundary সহ কয়েকটি project-এ কাটুন। তাহলে প্রতিটি project একবার check হয়, আর downstream project-গুলো source-এর
বদলে তার declaration file পড়ে।

**Q: বড় TypeScript codebase-এ project reference কীভাবে গতি বাড়ায়?**

প্রতিটি project compile হয়ে `.d.ts` file তৈরি করে, আর নিজের build info রেকর্ড করে রাখে। যারা ব্যবহার করে, তারা source
আবার check না করে ওই declaration-এর বিপরীতে type-check করে। ফলে compiler না বদলানো project পুরোপুরি বাদ দেয়, আর
স্বাধীন project-গুলো parallel-এ চালায়। দাম হলো `composite: true`, declaration emit করা, আর acyclic package graph,
যেটা বেশিরভাগ codebase-এর এমনিতেই থাকা উচিত।

**Q: Continuous integration-এ linting-এ আট মিনিট লাগছে। প্রথমে কী দেখবেন?**

Type-aware rule চালু আছে কি না। ওগুলো পূর্ণ একটি type program তৈরি করে, মানে linter পুরো repository দ্বিতীয়বার
type-check করছে। Configuration ভাগ করুন। Syntactic rule সবকিছুর ওপর দ্রুত একটি Rust linter-এ চালান। ছোট, ভেবেচিন্তে
বাছা type-aware rule-এর set চালান একবার, type check-এর পাশাপাশি। তারপর দেখুন lint সব package-এ নয়, শুধু affected
package-এ চলছে কি না।

**Q: কী merge আটকাবে, আর কী আটকাবে না?**

Formatting, দ্রুত lint rule আর affected package-এ type check আটকাবে। এগুলো সস্তা, আর আসল সমস্যা ধরে। পুরো repository-র
type check, dependency audit আর licence scan চলবে schedule-এ, আর কাউকে alert দেবে। এগুলো এমন কারণে fail করে, যেটা
pull request-এর author ঘটাননি আর ঠিকও করতে পারবেন না।

## এরপর কী পড়বেন

- [Chapter ?? — Monorepo](#ch-monorepos) — এই check-গুলোর জন্যই affected-only run আর caching
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — যে type pattern-গুলো check হচ্ছে
- [Chapter ?? — CI/CD-র মূল কথা](#ch-cicd-fundamentals) — pipeline-এ এই gate-গুলো কোথায় বসে
