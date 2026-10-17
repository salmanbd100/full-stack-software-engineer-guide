---
sourceHash: "0f39cd9056def51f6bb472e532759d3c6cec77296189baa07b3e43773e67f385"
title: "Monorepo"
translatedAt: "2026-10-17T01:38:37.342Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Monorepo {#ch-monorepos}

> Task graph ঘোষণা করে, ঠিক input-গুলো hash করে, আর শুধু যা বদলেছে তা চালিয়ে বড় repository-কে build করার জন্য সস্তা বানান।

**এই অধ্যায়ে:** দুটি graph · workspace জোড়া লাগানো · cache key-তে কী যায় · environment variable-এর ফাঁদ · শুধু affected অংশ চালানো · publish করা

## 💡 মূল ধারণা

Monorepo রাখবেন কি না, সেটা team-এর সমন্বয়ের প্রশ্ন, আর তার উত্তর আছে
[Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow)-এ। এই অধ্যায় শুরু হয় এক ধাপ
পরে: monorepo আপনার আছে, আর সমস্যা হলো এখন সবকিছু একই pipeline ভাগ করে নেয়।

Task graph ছাড়া monorepo প্রতিটি পরিবর্তনে সবকিছু চালায়। বারোটি package, একটি commit শুধু একটি README ছুঁয়েছে, অথচ
continuous integration বারোটিই build আর test করে। আলাদা আলাদা repository-র চেয়ে এটা সোজাসুজি খারাপ। "আমরা
monorepo চেষ্টা করেছিলাম, খুব ধীর ছিল" গল্পটা এত শোনা যায় এ কারণেই।

সমাধান এমন একটি build system, যেটা দুটি প্রশ্নের উত্তর দিতে পারে: **কোনটার আগে কোনটা চালাতে হবে**, আর **ঠিক এই
কাজটা কি আগেই করা হয়ে গেছে?** অধ্যায়ের বাকিটা এই দুটি প্রশ্ন নিয়েই।

> ⚠️ **যা বদলাতে থাকে:** configuration-এর নামগুলো বদলাতেই থাকে। Turborepo 2 `pipeline`-এর নাম বদলে `tasks` আর
> `outputMode`-এর নাম বদলে `outputLogs` করেছে, `dotEnv` key-গুলো বাদ দিয়েছে, আর cache directory সরিয়ে নিয়েছে।
> Nx-ও প্রায় সমান ঘন ঘন তার project configuration নতুন করে সাজায়। দুটি tool-ই একই টেকসই নীতি মেনে চলে। Cache
> content-addressed, আপনার ঘোষণা করা input-এর ওপর: তার key হলো সেগুলোর hash। তাই hit হওয়ার কথা অথচ miss হচ্ছে,
> মানে কোনো একটি input ঘোষণা করা হয়নি।

## কীভাবে কাজ করে

### একটি নয়, দুটি graph

| Graph | Edge | যে প্রশ্নের উত্তর দেয় |
| ----- | ----- | ------- |
| **Package graph** | `packages/ui` নির্ভর করে `packages/tokens`-এর ওপর | এটা বদলালে কী কী affected হয়? |
| **Task graph** | `web#build` নির্ভর করে `ui#build`-এর ওপর | এগুলো কোন ক্রমে চালানো যায়? |

Package graph আসে `package.json` file থেকে। Task graph ঘোষণা করেন আপনি। দুটি সম্পর্কিত, কিন্তু এক নয়: `test`
upstream-এর `build`-এর ওপর নির্ভর করতে পারে, upstream-এর `test`-এর ওপর নির্ভর না করেই।

**ঘোষণা করা:**

```json
{
  "$schema": "https://turborepo.dev/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

`^` prefix মানে "এই package-এর **dependency**-গুলোতে একই task"। এতে ক্রমটা topological হয়: যে package যাদের
ব্যবহার করে, তাদের build আগে হয়। Caret না থাকলে মানে হয় একই package-এর একটি task। এই file-এ মানুষ সবচেয়ে বেশি
ভুল পড়ে এই একটি অক্ষরই।

`dev`-এ `cache: false` আর `persistent: true` ঠিক যা বলে, তাই বোঝায়। Watch process cache করার মতো কোনো artefact
তৈরি করে না, আর কখনো থামে না।

### Workspace জোড়া লাগানো

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Internal dependency-তে workspace protocol ব্যবহার হয়। এটা local package-এ resolve করে, আর registry-তে ফিরে যেতে
রাজি হয় না:

```json
{ "dependencies": { "@acme/ui": "workspace:*" } }
```

এই রাজি না হওয়াটাই আসল কথা। এটা না থাকলে package-এর নামে একটি typo হলেই চুপচাপ registry থেকে অচেনা কারও package
install হয়ে যায়। Dependency-confusion attack এভাবেই কাজ করে।

### Cache key-তে কী যায়

Task-এর cache key হলো এমন সবকিছুর hash, যা তার output বদলে দিতে পারে:

| Input | Default-ভাবে ধরা হয় |
| ----- | ------------------- |
| Package-এর source file | হ্যাঁ |
| Task-এর নিজের configuration | হ্যাঁ |
| Dependency-গুলোর output-এর hash | হ্যাঁ |
| ঘোষণা করা environment variable | কেবল `env`-এ যেগুলোর নাম আছে |
| Lockfile | হ্যাঁ |
| Environment-এর বাকি সবকিছু | **না** |

Hit হলে tool রেকর্ড করা output আর log আবার চালিয়ে দেয়, task-টা আর চলেই না। Miss হলে চলে, আর রেকর্ড করে রাখে।
Shared **remote cache** এটাকে কয়েকটি machine জুড়ে ছড়িয়ে দেয়, আর আসল লাভ সেখানেই। সহকর্মীর laptop-এ একবার build
হওয়া task continuous integration-এ cache hit হয়।

### Environment variable-এর ফাঁদ

এই monorepo bug-টা production পর্যন্ত পৌঁছায়, তাই এর জন্য আলাদা section।

ধরুন একটি environment variable build-এর output বদলায়, কিন্তু cache key-তে **নেই**। তাহলে staging build serve হতে
পারে production build-এর cache থেকে। এবার ধরুন একটি variable output বদলায় **না**, অথচ key-তে *আছে*। তাহলে প্রতিটি
machine-এর hash আলাদা, আর কখনোই কিছু hit হয় না।

দুটি setting এই দুই ক্ষেত্রকে আলাদা করে:

```json
{
  "tasks": {
    "build": {
      "env": ["NEXT_PUBLIC_API_URL"],
      "passThroughEnv": ["AWS_SECRET_ACCESS_KEY"]
    }
  }
}
```

`env` মানে "এটা output বদলায়, hash করো"। `passThroughEnv` মানে "task-এর এটা লাগে, কিন্তু key-তে এর প্রভাব পড়া চলবে
না"। Credential যায় এখানে: machine অনুযায়ী বদলায়, কিন্তু artefact কখনো বদলায় না।

### শুধু যা বদলেছে তা চালানো

Affected-only execution একটি base reference-এর সঙ্গে তুলনা করে, আর task চালায় বদলানো package-গুলোর জন্য, সঙ্গে
তাদের downstream-এর সবকিছুর জন্য:

```bash
turbo run build test --filter='...[origin/main]'
```

এর সঙ্গে caching যোগ করুন, বড় repository-কেও ছোট মনে হবে। একটি leaf package বদলালে test হয় শুধু সেই leaf package।
Design system বদলালে test হয় সেটা যা যা ব্যবহার করে, তার সবকিছু। এটা নির্ভুলভাবে হয়, আর কাউকে কোনো তালিকা
রক্ষণাবেক্ষণ করতে হয় না।

### যেখানে miss হওয়ার কথা নয়, সেখানে কেন miss হয়

| লক্ষণ | কারণ |
| ------- | ----- |
| সবসময় miss, সব জায়গায় | Output-এ nondeterministic কিছু আছে — timestamp, build ID, random hash |
| Continuous integration-এ সবসময় miss, local-এ hit | `env`-এ এমন environment variable, যেটা runner অনুযায়ী আলাদা |
| Hit হয়, কিন্তু output পুরনো | Task যে file পড়ে সেটা `inputs`-এ নেই — সাধারণত package-এর বাইরের configuration |
| যে environment-গুলো আলাদা হওয়ার কথা, সেখানেও hit | Output বদলায় এমন একটি variable `env`-এ নেই |

তৃতীয় row-টাই বিপজ্জনক। Input ঘোষণা করা না থাকলে কিছু বদলালেও tool মনে করে কিছুই বদলায়নি। তারপর পুরো আত্মবিশ্বাস
নিয়ে পুরনো artefact serve করে।

### Monorepo থেকে publish করা

Package যদি repository-র বাইরে ব্যবহার হয়, তাহলে versioning একটি সিদ্ধান্তের বিষয় হয়ে দাঁড়ায়:

| পদ্ধতি | আচরণ | কোথায় মানায় |
| -------- | --------- | ------ |
| **Fixed** | সব package একসঙ্গে একই version-এ যায় | Suite হিসেবে release হওয়া design system |
| **Independent** | প্রতিটি package নিজের পরিবর্তন অনুযায়ী version পায় | একই repository-তে সম্পর্কহীন কয়েকটি library |

প্রচলিত tooling প্রতিটি pull request থেকে একটি করে changelog entry জমা করে। তারপর version কতটা বাড়বে তা হিসাব করে,
আর merge হলে publish করে। লাভটা হলো: পরিবর্তনটা কোন ধরনের, তা author নিজে ঠিক করেন, review-এর সময়েই। যিনি release
চালান, তাঁকে আন্দাজ করতে হয় না।

## কখন ব্যবহার করবেন

| পরিস্থিতি | পরামর্শ |
| --------- | -------- |
| Monorepo আছে, কিন্তু task graph নেই | এর চেয়ে বেশি লাভের কাজ আর নেই। এখান থেকে শুরু করুন |
| মোটামুটি পাঁচটির কম package | শুধু workspace-ই হয়তো যথেষ্ট; পুরোটা চালাতে কষ্ট হলে তখন task runner যোগ করুন |
| Continuous integration ধীর | সবার আগে affected-only আর remote caching |
| আদৌ monorepo রাখবেন কি না, সেই সিদ্ধান্ত | [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) |
| আলাদাভাবে deploy হওয়া frontend | সেটা অন্য সমস্যা — দেখুন [Chapter ?? — Micro-Frontend](#ch-micro-frontends) |

## সাধারণ ভুল

**❌ এমন monorepo, যার একটিমাত্র pipeline সবকিছু চালায়।**
✅ খরচটা নিয়েছেন, লাভটা ফেলে রেখেছেন। দ্বিতীয় package যোগ করার আগেই task graph ঘোষণা করুন।

**❌ `dependsOn`-এ `^` দিতে ভুলে যাওয়া।**
✅ `["build"]` মানে একই package। `["^build"]` মানে তার dependency-গুলো। Caret না থাকলে topological ক্রম মানা হয় না,
আর build-গুলো একে অপরের সঙ্গে দৌড়ে পাল্লা দেয়।

**❌ Credential `env`-এ রাখা।**
✅ এগুলো machine অনুযায়ী আলাদা, তাই প্রতিটি hash আলাদা হয়, আর কখনো কিছু hit হয় না। `passThroughEnv` ব্যবহার করুন।

**❌ Task এমন file পড়ছে, যেটা input হিসেবে ঘোষণা করা হয়নি।**
✅ File-টা বদলালেও cache টের পাবে না, আর পুরনো artefact serve করবে। Shared configuration ঘোষণা করুন
`inputs`-এ।

**❌ এমন output, যা আবার একই রকম তৈরি হয় না — build timestamp, ভেতরে বসানো random identifier।**
✅ প্রতিটি run miss হয়, আর cache থাকে শুধু সাজসজ্জা হয়ে। আগে output deterministic করুন।

## 🔑 মূল শিক্ষা

- Monorepo-র task graph লাগে। এটা ছাড়া monorepo আলাদা repository-র চেয়ে সোজাসুজি খারাপ।
- Package graph আসে dependency থেকে। Task graph ঘোষণা করেন আপনি, আর `^` সেটাকে topological করে।
- Cache key hash করে source, configuration, dependency-র output, lockfile, আর কেবল আপনার তালিকাভুক্ত environment variable।
- `env` key বদলায়, `passThroughEnv` বদলায় না। Credential-এর জায়গা দ্বিতীয়টিতে।
- ঘোষণা না করা input থেকে পুরনো cache hit হয়, আর এই ব্যর্থতাই production পর্যন্ত পৌঁছায়।

## Interview-এর প্রশ্ন

**Q: শুধু workspace যা দেয় না, task graph তার বাইরে কী দেয়?**

Workspace package-গুলোকে local-ভাবে একে অপরের সঙ্গে resolve করায়। ক্রম বা পুনরাবৃত্তি নিয়ে এটা কিছুই বলে না।
Task graph ঘোষণা করে যে একটি package-এর build তার dependency-গুলোর build-এর ওপর নির্ভর করে। ফলে runner
topological ক্রমে schedule করতে পারে, আর স্বাধীন সবকিছু parallel-এ চালাতে পারে। যে task-এর input আগের কোনো
run-এর সঙ্গে মেলে, সেটা বাদও দিতে পারে। এটা ছাড়া monorepo প্রতিটি পরিবর্তনে সবকিছু চালায়।

**Q: Task-এর cache key কীভাবে হিসাব হয়, আর কীসে সেটা ভাঙে?**

এটা hash করে package-এর source file, task-এর configuration, dependency-গুলোর output-এর hash, lockfile, আর আপনার
স্পষ্টভাবে ঘোষণা করা environment variable। ভাঙে দুই দিকে। Nondeterministic output, যেমন timestamp বা random
identifier, থাকলে কখনো hit হয় না। আর ঘোষণা না করা input থাকলে হয় পুরনো hit: tool নিশ্চিত যে কিছু বদলায়নি, অথচ
সেটা ভুল।

**Q: একটি staging deployment production configuration নিয়ে বেরিয়েছে। Build cache কীভাবে এটা ঘটায়?**

যে variable environment বাছাই করে, সেটা task-এর `env` তালিকায় ছিল না। তাই দুটি build-এর hash একই হয়েছে, আর cache
staging-কে production-এর artefact দিয়েছে। যা কিছু output বদলায়, তা অবশ্যই cache key-তে থাকতে হবে। আর যা বদলায় না,
বিশেষ করে credential, তা key-তে কোনো প্রভাব না ফেলে pass through হওয়া উচিত।

**Q: Monorepo কখন ভুল পছন্দ?**

যখন team-গুলোর সত্যিই আলাদা release cadence দরকার, অথবা project ধরে ধরে access সীমিত রাখতে হয়। অথবা যখন
affected-only continuous integration আর build cache-এর দায়িত্ব নেওয়ার সময় কারও নেই। শেষেরটাই আসল veto। সেই tooling
ছাড়া monorepo-তে coupling-এর সবটাই থাকে, speed-এর কিছুই থাকে না।

## এরপর কী পড়বেন

- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — এই অধ্যায় ধরে নেয় যে সিদ্ধান্তটা আপনি নিয়ে ফেলেছেন
- [Chapter ?? — CI/CD-র মূল কথা](#ch-cicd-fundamentals) — affected-only run আর remote cache যেখানে এসে যুক্ত হয়
