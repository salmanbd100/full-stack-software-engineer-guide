---
sourceHash: "e3f08fa2c99e0736677b041e7121f0caaceb9af3931465d68aea6e60ea5fa56f"
title: "বড় পরিসরে Type-Checking ও Linting"
translatedAt: "2026-10-12T12:15:15.970Z"
model: "claude-opus-5-5 (Claude Code)"
---

# বড় পরিসরে Type-Checking ও Linting {#ch-type-checking-and-linting}

> মানুষ যে তিনটি কাজ একসাথে চালায়, সেগুলো আলাদা করুন, আর whole-program কাজটা critical path থেকে সরিয়ে রাখুন।

**এই অধ্যায়ে:** তিনটি কাজ, তিনটি খরচ · project reference · `skipLibCheck` · type-aware rule আর তার খরচ · Biome আর Oxlint · কী একটি merge আটকায়

## 💡 মূল ধারণা

"Code quality"-র নামে তিনটি আলাদা কাজ একসাথে বাঁধা পড়ে। এদের খরচ একেবারেই আলাদা।

**Formatting** syntactic। এটা একটি file পড়ে, বাকি সব উপেক্ষা করে, আর সাথে সাথে শেষ হয়।

**Linting** হলো pattern matching। বেশিরভাগ rule একটি file পড়ে আর দ্রুত শেষ হয়। অল্প কিছু rule-এর পুরো program
লাগে, আর সেগুলোর খরচ type-checking-এর সমান।

**Type-checking** semantic আর whole-program। এই call-টি valid কি না জানতে, এটা যে type-গুলো ছোঁয় সেগুলোর প্রতিটি
resolve করতে হয়, transitively। একে per-file করা যায় না, আর বাদও দেওয়া যায় না।
[Chapter ?? — Vite, Rust Bundler ও Dev Loop](#ch-vite-and-the-dev-loop) যেমন ব্যাখ্যা করে, bundler type
check না করেই সেগুলো মুছে ফেলে।

প্রায় প্রতিটি ধীর pipeline-এ এই তিনটির একটি এমন কাজ করে, যা অন্যটির। নয়তো whole-program কাজটি দরকারের চেয়ে বেশিবার
চলে।

> ⚠️ **যা বদলাতে থাকে:** এই অধ্যায়ের দুই অংশই native language-এর দিকে যাচ্ছে। July 2026-এ release হওয়া
> TypeScript 7 হলো Go-তে port করা compiler। এটা প্রায় দশ গুণ দ্রুত check করে, আংশিকভাবে আলাদা thread-এ একাধিক
> checker চালিয়ে। Rust linter-গুলো এখনো তাদের না-থাকা type-aware rule-গুলো যোগ করছে। আপনার version কী support
> করে, দেখে নিন। টেকসই অংশটি হলো খরচের model: implementation যে-ই লিখুক, whole-program কাজ দামি।

## কীভাবে কাজ করে

### Type-checking কেন parallel হয় না

একটি linter হাজারটা file আটটি core-এ ভাগ করে দিতে পারে। একটি type-checker এটা পরিষ্কারভাবে পারে না। File A check
করতে A যা যা import করে, তার সবকিছুর resolve করা type লাগে। এই প্রয়োজনগুলো সেই একই graph তৈরি করে, যেটা bundler
হেঁটে দেখে। TypeScript 7 সত্যিই checker-গুলো parallel-এ চালায়, কিন্তু প্রত্যেকটিকে তার ছোঁয়া shared import-গুলো
নিজেই resolve করতে হয়। তাই linter-এর তুলনায় বেশি core দিয়ে লাভ কম হয়।

তিনটি lever আছে, মূল্যের ক্রমে।

**`skipLibCheck: true`।** এটা ছাড়া compiler `node_modules`-এর প্রতিটি `.d.ts` file check করে: হাজার হাজার
declaration, যেগুলো আপনি লেখেননি আর ঠিকও করতে পারবেন না। প্রায় প্রতিটি আসল project এটা চালু রাখে।

**`incremental: true`।** Compiler একটি `.tsbuildinfo` file লেখে, যেখানে থাকে সে কী check করেছে। পরের run তখন
শুধু যা বদলেছে তা আবার check করে। Continuous integration-এ ওই file cache করুন, নইলে লাভটা শুধু developer-দের
machine-এই থাকে।

**Project reference।** আসল scaling mechanism, আর বেশিরভাগ team যেটার দিকে কখনো হাত বাড়ায় না।

### Project reference, আর কেন এরা আকৃতি বদলে দেয়

সাধারণত একটি application check করা মানে, এটা যে package-গুলো import করে, তাদের প্রতিটির source আবার check করা।
Project reference এর জায়গা নেয়। প্রতিটি project একবার compile হয়ে `.d.ts` **declaration file** তৈরি করে।
Downstream project-গুলো source-এর বদলে declaration পড়ে।

```json
// packages/web/tsconfig.json
{
  "compilerOptions": { "composite": true, "declaration": true },
  "references": [{ "path": "../ui" }, { "path": "../types" }]
}
```

এরপর `tsc --build` reference graph হেঁটে প্রতিটি project একবার check করে, dependency-র ক্রমে। যে project-এর build
info এখনো valid, সেটা বাদ দেয়, আর স্বাধীন project-গুলো parallel-এ চালাতে পারে।

খরচটা আসল। প্রতিটি reference করা project-এর `composite: true` লাগে, আর declaration emit করতে হয়। এটা downstream-এর
কোনো কিছুর সাথে আর circular reference রাখতে পারে না। শেষ নিয়মটি সাধারণত একটি সুবিধা, যেটা দেখতে ঝামেলার মতো। এটা
package-এর সীমানাগুলোকে acyclic হতে বাধ্য করে, যেটা আগে থেকেই হওয়া উচিত ছিল। কাজের একক হয়ে যায় package,
repository নয়। [Chapter ?? — Monorepo](#ch-monorepos)-এর task graph build-এর জন্য একই পরিবর্তন আনে।

### দুই ধরনের lint rule

| | Syntactic rule | Type-aware rule |
| --- | --- | --- |
| **পড়ে** | একটি file-এর syntax tree | পুরো type graph |
| **উদাহরণ** | অব্যবহৃত variable, import-এর ক্রম, hook dependency array | Floating promise, অনিরাপদ `any` ছড়িয়ে পড়া, অপ্রয়োজনীয় conditional |
| **খরচ** | প্রতি file-এ কয়েক millisecond, parallel | আবারও type-checking-এর সমান দামি |
| **Parallel হয়** | হ্যাঁ | না |

"Linting-এ আট মিনিট কেন লাগে" — এই table তার উত্তর। একটি type-aware preset linter-কে দিয়ে দ্বিতীয় একটি পূর্ণ type
program বানায়। আপনি এখন দুবার type-check করছেন।

ব্যবহারিক ব্যবস্থাটি হলো ভাগ করা:

- **একটি দ্রুত Rust linter — Biome বা Oxlint — প্রতিটি file-এ, প্রতিটি commit-এ।** Syntactic rule, অব্যবহৃত code,
  import-এর পরিচ্ছন্নতা, framework rule। Pre-commit hook হওয়ার মতো দ্রুত।
- **ছোট, ভেবেচিন্তে বাছা কিছু type-aware rule**, continuous integration-এ type check-এর পাশে একবার চালানো। Preset
  চালু না করে সেগুলো বাছুন, যেগুলো আসল bug ধরে। Await না করা promise সবচেয়ে জোরালো উদাহরণ।

### Formatting linting নয়

কোনো lint rule whitespace নিয়ে হওয়া উচিত নয়। Formatting deterministic আর machine দিয়ে ঠিক করা যায়, তাই এটা কখনো
কোনো মানুষের কাছে পৌঁছানো বা build fail করানো উচিত নয়:

| কোথায় | কী করবেন |
| ----- | ---------- |
| Editor | Save করলেই format |
| Pre-commit | Stage করা file format করুন |
| Continuous integration | Check করুন, আর ঠিক করার হুবহু command দিয়ে fail করুন — নয়তো ঠিক করে push করুন |
| Code review | কখনো না। একটি ফাঁকা line নিয়ে comment মানে process-এর ব্যর্থতা |

Biome একটি binary-তেই formatting আর linting করে। এতে দুটি tool-এর মাঝের configuration-এর জোড়া সরে যায়, যেটা এক
দশক ধরে তর্ক বাধিয়েছে।

### কী একটি merge আটকায়

সবকিছুকে block করতে হবে না। একটি কাজের default:

| Check | Merge block করে | কেন |
| ----- | -------------- | --- |
| Formatting | হ্যাঁ, auto-fix করে | বিনা খরচে, আর diff-এর আবর্জনা ঠেকায় |
| দ্রুত lint rule | হ্যাঁ | কয়েক সেকেন্ড, আসল ভুল ধরে |
| প্রভাবিত project-এ `tsc --build` | **হ্যাঁ** | আর কিছুই type validate করে না |
| Type-aware lint rule | হ্যাঁ, যদি set ছোট হয় | নইলে type-check দ্বিগুণ হয় |
| পুরো repository-র type check | প্রতি রাতে | শুধু প্রভাবিত অংশে চালানোর ফলে জমা হওয়া বিচ্যুতি ধরে |
| Dependency আর licence audit | প্রতি রাতে, শুধু alert | Pull request author-এর সমস্যা নয় |

বাস্তবে দুটি নিয়ম পার্থক্য গড়ে দেয়। **প্রতিটি check নিজস্ব job-এ চালান**, যাতে একটি লাল pipeline "build failed" না
বলে আসল সমস্যাটির নাম বলে। আর **শুধু প্রভাবিত package-এ চালান**, পুরো sweep একটি schedule-এ।

## কখন ব্যবহার করবেন

| পরিস্থিতি | যা করবেন |
| --------- | -- |
| একটি application, কয়েকশো file | `skipLibCheck` সহ `tsc --noEmit`। এর বেশি কিছু লাগে না |
| Shared package সহ একটি monorepo | Project reference আর `tsc --build` |
| Lint-এ কয়েক মিনিট লাগছে | Syntactic আর type-aware আলাদা করুন; প্রথমটি একটি Rust linter-এ সরান |
| নতুন repository শুরু করছেন | Formatting আর দ্রুত rule-এর জন্য Biome, সাথে ছোট একটি type-aware set |
| বিদ্যমান বড় একটি ESLint configuration | আগে syntactic rule-গুলো migrate করুন; type-aware-গুলোই কঠিন অংশ |

## সাধারণ ভুল

**❌ সবুজ build মানেই type ঠিক আছে — এমন বিশ্বাস করা।**
✅ Bundler এগুলো মুছে ফেলেছে। একমাত্র `tsc`-ই check করেছে।

**❌ পুরো type-aware lint preset চালু করা, কারণ শুনতে পুঙ্খানুপুঙ্খ লাগে।**
✅ এমন rule পেতে আপনি সবচেয়ে দামি check দ্বিগুণ করেছেন, যেগুলো কেউ পড়ে না। যেগুলো bug ধরে, সেগুলো বাছুন।

**❌ Continuous integration-এ `--fix` চালিয়ে ফলাফল commit করা।**
✅ এখন pipeline code লিখছে। Local-এ চালানোর command দিয়ে fail করুন, নয়তো শুধু formatting ঠিক করুন, আলাদা একটি
step-এ।

**❌ কঠোরতার জন্য `skipLibCheck` বন্ধ করা।**
✅ এখন আপনি এমন dependency-র type error-এ আটকে আছেন, যেগুলো edit করতে পারবেন না।

**❌ Run-গুলোর মধ্যে `.tsbuildinfo` cache না করা।**
✅ Incremental checking কিছুই করছে না। প্রতিটি run একটি cold run।

**❌ Pull request-এ formatting review করা।**
✅ এটা automate করুন। Whitespace-এ মানুষের মনোযোগ একটি brace সোজা করার সবচেয়ে দামি উপায়।

## 🔑 মূল শিক্ষা

- Formatting, linting আর type-checking-এর খরচ আলাদা। এগুলোকে এক ধরলে pipeline ধীর হয়।
- Type-checking whole-program, আর একে shard করা যায় না। `skipLibCheck`, incremental build আর project reference হলো lever।
- Project reference source-এর বদলে declaration file পড়ে package-কে checking-এর একক বানায়।
- Type-aware lint rule-এর খরচ হলো দ্বিতীয় একটি পূর্ণ type-check। এগুলো ভেবেচিন্তে চালু করুন, preset হিসেবে নয়।
- `tsc` ছাড়া আর কিছুই type validate করে না, তাই এটাকেই merge আটকাতে হবে।

## Interview-এর প্রশ্ন

**Q: Linting যেভাবে parallel করা যায়, type-checking কেন সেভাবে করা যায় না?**

কারণ একটি file check করতে তার import করা সবকিছুর resolve করা type লাগে, transitively। এটা একটি dependency graph-এর
ওপর whole-program analysis, per-file pass নয়। একে parallel করতে, graph-টিকে ঘোষিত সীমানাসহ project-এ কাটুন। তখন
প্রতিটি একবার check হয়, আর downstream project-গুলো এর source-এর বদলে declaration file পড়ে।

**Q: Project reference একটি বড় TypeScript codebase-কে কীভাবে দ্রুত করে?**

প্রতিটি project compile হয়ে `.d.ts` file তৈরি করে আর নিজের build info রেখে দেয়। Consumer-রা source আবার check না
করে ওই declaration-এর বিপরীতে type-check করে। তাই compiler অপরিবর্তিত project পুরোপুরি বাদ দেয়, আর স্বাধীন
project-গুলো parallel-এ চালায়। দাম হলো `composite: true`, emit করা declaration, আর একটি acyclic package graph, যেটা
বেশিরভাগ codebase-এর আগে থেকেই থাকা উচিত।

**Q: Continuous integration-এ linting-এ আট মিনিট লাগে। প্রথমে কী দেখবেন?**

Type-aware rule চালু আছে কি না। এগুলো একটি পূর্ণ type program বানায়, তাই linter repository-টি দ্বিতীয়বার
type-check করছে। Configuration ভাগ করুন। সবকিছুর ওপর একটি দ্রুত Rust linter-এ syntactic rule চালান। ছোট, ভেবেচিন্তে
বাছা type-aware rule-এর set একবার চালান, type check-এর পাশে। তারপর দেখুন lint সব package-এ নয়, শুধু প্রভাবিত
package-এ চলছে কি না।

**Q: কী একটি merge block করা উচিত, আর কী নয়?**

Formatting, দ্রুত lint rule আর প্রভাবিত package-এ type check block করা উচিত। এগুলো সস্তা, আর আসল সমস্যা ধরে।
পুরো repository-র type check, dependency audit আর licence scan একটি schedule-এ চালানো উচিত, আর কাউকে alert করা উচিত।
এগুলো এমন কারণে fail করে, যেটা pull request author ঘটাননি আর ঠিকও করতে পারবেন না।

## এরপর কী পড়বেন

- [Chapter ?? — Monorepo](#ch-monorepos) — এই check-গুলোর জন্যই শুধু প্রভাবিত অংশে চালানো আর caching
- [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) — যে type pattern-গুলো check হচ্ছে
- [Chapter ?? — CI/CD-র মূল কথা](#ch-cicd-fundamentals) — একটি pipeline-এ এই gate-গুলো কোথায় বসে
