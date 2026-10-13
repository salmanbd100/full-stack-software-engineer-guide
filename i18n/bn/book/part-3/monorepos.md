---
sourceHash: "0f39cd9056def51f6bb472e532759d3c6cec77296189baa07b3e43773e67f385"
title: "Monorepo"
translatedAt: "2026-10-12T07:54:13.871Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Monorepo {#ch-monorepos}

> Task graph declare করে, ঠিক input-গুলো hash করে, আর শুধু যা বদলেছে তা চালিয়ে একটি বড় repository build করা সস্তা করুন।

**এই অধ্যায়ে:** দুটি graph · workspace জোড়া লাগানো · cache key-তে কী যায় · environment variable-এর ফাঁদ · শুধু affected অংশ চালানো · publish করা

## 💡 মূল ধারণা

Monorepo ব্যবহার করবেন কি না, সেটা একটি coordination-এর প্রশ্ন, আর
[Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) সেটার উত্তর দেয়। এই অধ্যায়
শুরু হয় এক ধাপ পরে: আপনার একটি আছে, আর সমস্যা হলো এখন সবকিছু একটি pipeline ভাগ করে নেয়।

Task graph ছাড়া একটি monorepo প্রতিটি পরিবর্তনে সবকিছু চালায়। বারোটি package, একটি commit শুধু একটি README ছুঁয়েছে,
আর continuous integration বারোটিই build আর test করে। এটা আলাদা আলাদা repository-র চেয়ে নিশ্চিতভাবে খারাপ। এ কারণেই
"আমরা monorepo চেষ্টা করেছিলাম, খুব ধীর ছিল" এত পরিচিত গল্প।

সমাধান হলো এমন একটি build system, যেটা দুটি প্রশ্নের উত্তর দিতে পারে: **কোনটা কোনটার আগে চলতে হবে**, আর **ঠিক এই
কাজটা কি আগেই করা হয়েছে?** এই অধ্যায়ের বাকিটা এই দুটি প্রশ্ন নিয়েই।

> ⚠️ **যা বদলাতে থাকে:** configuration-এর নামগুলো বদলাতেই থাকে। Turborepo 2 `pipeline`-এর নাম বদলে `tasks` করেছে,
> `outputMode`-কে করেছে `outputLogs`, `dotEnv` key-গুলো বাদ দিয়েছে, আর cache directory সরিয়েছে। Nx-ও প্রায় একই
> হারে তার project configuration-এর রূপ বদলায়। দুটি tool-ই একই টেকসই নীতি মেনে চলে। Cache আপনার declare করা
> input-গুলোর ওপর content-addressed: এর key হলো সেগুলোর একটি hash। তাই যে cache-এ hit হওয়ার কথা, সেখানে miss হলে
> বুঝবেন একটি input declare করা হয়নি।

## কীভাবে কাজ করে

### একটি নয়, দুটি graph

| Graph | Edge | যে প্রশ্নের উত্তর দেয় |
| ----- | ----- | ------- |
| **Package graph** | `packages/ui` নির্ভর করে `packages/tokens`-এর ওপর | এটা বদলালে কী কী প্রভাবিত হয়? |
| **Task graph** | `web#build` নির্ভর করে `ui#build`-এর ওপর | এগুলো কোন ক্রমে চলতে পারে? |

Package graph আসে `package.json` file থেকে। Task graph আপনি declare করেন। দুটি সম্পর্কিত, কিন্তু অভিন্ন নয়:
`test` upstream `build`-এর ওপর নির্ভর করতে পারে, upstream `test`-এর ওপর নির্ভর না করেই।

**এটা declare করা:**

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

`^` prefix মানে "এই package-এর **dependency**-গুলোতে একই task"। এটাই ক্রমটাকে topological করে: dependency-গুলো
build হয় সেগুলো ব্যবহার করা package-এর আগে। Caret ছাড়া এর মানে একই package-এর একটি task। File-এর অন্য যেকোনো কিছুর
চেয়ে মানুষ এই একটি অক্ষরই বেশি ভুল পড়ে।

`dev`-এর ওপর `cache: false` আর `persistent: true` ঠিক যা বলে, তা-ই বোঝায়। একটি watch process কোনো cache করার মতো
artefact তৈরি করে না, আর কখনো শেষ হয় না।

### Workspace জোড়া লাগানো

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Internal dependency workspace protocol ব্যবহার করে। এটা local package-এ resolve হয়, আর registry-তে fallback করতে
অস্বীকার করে:

```json
{ "dependencies": { "@acme/ui": "workspace:*" } }
```

এই অস্বীকারটাই আসল কথা। এটা না থাকলে package-এর নামে একটি typo চুপচাপ registry থেকে অচেনা কারও package install করে
ফেলে। Dependency-confusion attack এভাবেই কাজ করে, অন্তত একটি উপায়ে।

### Cache key-তে কী যায়

একটি task-এর cache key হলো এমন সবকিছুর একটি hash, যা এর output বদলাতে পারে:

| Input | Default-এ অন্তর্ভুক্ত |
| ----- | ------------------- |
| Package-এর source file | হ্যাঁ |
| Task-এর নিজস্ব configuration | হ্যাঁ |
| এর dependency-গুলোর output-এর hash | হ্যাঁ |
| Declare করা environment variable | শুধু যেগুলো `env`-এ তালিকাভুক্ত |
| Lockfile | হ্যাঁ |
| Environment-এর বাকি সবকিছু | **না** |

Hit হলে tool রেকর্ড করা output আর log আবার চালিয়ে দেখায়, আর task কখনো চলেই না। Miss হলে task চলে আর রেকর্ড হয়।
একটি shared **remote cache** এটাকে বিভিন্ন machine-এ ছড়িয়ে দেয়, আর আসল লাভ এটাই। একজন সহকর্মীর laptop-এ একবার build
হওয়া একটি task continuous integration-এ cache hit হয়।

### Environment variable-এর ফাঁদ

এটা সেই monorepo bug, যেটা production পর্যন্ত পৌঁছায়। তাই এর জন্য আলাদা section।

ধরুন একটি environment variable একটি build-এর output বদলায়, কিন্তু cache key-তে **নেই**। তাহলে একটি staging build
একটি production build-এর cache থেকে serve হতে পারে। এবার ধরুন একটি variable output **বদলায় না**, কিন্তু key-তে
*আছে*। তাহলে প্রতিটি machine-এর hash আলাদা হয়, আর কখনো কিছু hit হয় না।

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

`env` মানে "এটা output বদলায়, hash করো"। `passThroughEnv` মানে "task-এর এটা লাগে, কিন্তু key-কে প্রভাবিত করা চলবে
না"। Credential ওখানেই যায়: এগুলো machine ভেদে বদলায়, কিন্তু artefact কখনো বদলায় না।

### শুধু যা বদলেছে তা চালানো

Affected-only execution একটি base reference-এর সাথে তুলনা করে, আর বদলানো package আর সেগুলোর downstream-এর সবকিছুর
জন্য task চালায়:

```bash
turbo run build test --filter='...[origin/main]'
```

এর সাথে caching যোগ করুন, তাহলে একটি বড় repository-ও ছোট মনে হয়। একটি leaf package-এর পরিবর্তন শুধু সেই leaf
package-কেই test করে। Design system-এর পরিবর্তন তার প্রতিটি ব্যবহারকারীকে test করে। এটা ঠিকঠাক হয়, আর কাউকে কোনো
তালিকা রক্ষণাবেক্ষণ করতে হয় না।

### যেখানে hit হওয়ার কথা, সেখানে cache কেন miss করে

| লক্ষণ | কারণ |
| ------- | ----- |
| সবসময় miss, সব জায়গায় | Output-এ অনির্দিষ্ট কিছু — একটি timestamp, একটি build ID, একটি random hash |
| Continuous integration-এ সবসময় miss, local-এ hit | `env`-এ এমন একটি environment variable, যেটা runner ভেদে আলাদা |
| Hit, কিন্তু output পুরোনো | Task যে file পড়ে, সেটা `inputs`-এ নেই — সাধারণত package-এর বাইরের configuration |
| যে environment-গুলো আলাদা হওয়ার কথা, সেগুলোর মধ্যে hit | Output বদলায় এমন একটি variable `env`-এ নেই |

তৃতীয় সারিটাই বিপজ্জনক। একটি undeclared input থাকলে, কিছু বদলালেও tool বিশ্বাস করে যে কিছুই বদলায়নি। সে পুরো
আত্মবিশ্বাসের সাথে একটি পুরোনো artefact serve করে।

### Monorepo থেকে publish করা

Package-গুলো repository-র বাইরে ব্যবহার হলে versioning একটি সিদ্ধান্তের বিষয় হয়ে দাঁড়ায়:

| পদ্ধতি | আচরণ | কার জন্য উপযুক্ত |
| -------- | --------- | ------ |
| **Fixed** | প্রতিটি package একসাথে একই version-এ যায় | একটি suite হিসেবে release হওয়া একটি design system |
| **Independent** | প্রতিটি package নিজের পরিবর্তন অনুযায়ী version পায় | এক repository-তে সম্পর্কহীন library |

প্রচলিত tooling প্রতিটি pull request-এ একটি changelog entry সংগ্রহ করে। তারপর version bump হিসাব করে, আর merge হলে
publish করে। লাভটা হলো: পরিবর্তনটা কোন ধরনের, তা ঠিক করেন লেখক নিজে, review-এর সময়। Release যিনি চালান, তাঁকে
অনুমান করতে হয় না।

## কখন ব্যবহার করবেন

| পরিস্থিতি | পরামর্শ |
| --------- | -------- |
| আগে থেকেই monorepo, কিন্তু task graph নেই | এখন যত কাজ আছে, তার মধ্যে এটাই সবচেয়ে মূল্যবান। এখান থেকে শুরু করুন |
| মোটামুটি পাঁচটির কম package | শুধু workspace-ই যথেষ্ট হতে পারে; পুরো run কষ্ট দিলে task runner যোগ করুন |
| Continuous integration ধীর | অন্য কিছুর আগে affected-only আর remote caching |
| আদৌ monorepo রাখবেন কি না, সেই সিদ্ধান্ত | [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) |
| আলাদাভাবে deploy হওয়া frontend | সেটা একটি ভিন্ন সমস্যা — দেখুন [Chapter ?? — Micro-Frontend](#ch-micro-frontends) |

## সাধারণ ভুল

**❌ একটি monorepo, যার একটিমাত্র pipeline সবকিছু চালায়।**
✅ আপনি খরচটা নিয়েছেন আর লাভটা ফেলে রেখেছেন। দ্বিতীয় package যোগ করার আগেই task graph declare করুন।

**❌ `dependsOn`-এ `^` দিতে ভুলে যাওয়া।**
✅ `["build"]` মানে একই package। `["^build"]` মানে এর dependency-গুলো। Caret ছাড়া topology মানা হয় না, আর build-গুলো
একে অপরের সাথে race করে।

**❌ `env`-এ credential রাখা।**
✅ এগুলো machine ভেদে আলাদা, তাই প্রতিটি hash আলাদা হয় আর কখনো কিছু hit হয় না। `passThroughEnv` ব্যবহার করুন।

**❌ এমন একটি file পড়া, যেটা task input হিসেবে declare করেনি।**
✅ File-টি বদলালে cache সেটা টের পাবে না, আর একটি পুরোনো artefact serve করবে। Shared configuration `inputs`-এ declare
করুন।

**❌ পুনরুৎপাদন করা যায় না এমন output — একটি build timestamp, ভেতরে বসানো একটি random identifier।**
✅ প্রতিটি run miss হয়, আর cache শুধু সাজসজ্জা। আগে output-কে deterministic করুন।

## 🔑 মূল শিক্ষা

- একটি monorepo-র task graph লাগে। এটা ছাড়া এটা আলাদা আলাদা repository-র চেয়ে নিশ্চিতভাবে খারাপ।
- Package graph আসে dependency থেকে। Task graph আপনি declare করেন, আর `^` সেটাকে topological করে।
- একটি cache key hash করে source, configuration, dependency-র output, lockfile, আর শুধু আপনার তালিকাভুক্ত environment variable।
- `env` key বদলায়, `passThroughEnv` বদলায় না। Credential-এর জায়গা দ্বিতীয়টিতে।
- Undeclared input পুরোনো cache hit ঘটায়, আর এই failure-টাই production পর্যন্ত পৌঁছায়।

## Interview-এর প্রশ্ন

**Q: শুধু workspace যা দেয় না, একটি task graph আপনাকে তা কী দেয়?**

Workspace package-গুলোকে local-ভাবে একে অপরের সাথে resolve করায়। ক্রম বা পুনরাবৃত্তি নিয়ে এরা কিছুই বলে না। Task
graph declare করে যে একটি package-এর build তার dependency-গুলোর build-এর ওপর নির্ভর করে। তাই runner topological
ক্রমে schedule করতে পারে, আর যা কিছু স্বাধীন তা parallel-এ চালাতে পারে। যে task-এর input আগের একটি run-এর সাথে মেলে,
সেটা বাদও দিতে পারে। এটা ছাড়া একটি monorepo প্রতিটি পরিবর্তনে সবকিছু চালায়।

**Q: একটি task-এর cache key কীভাবে হিসাব হয়, আর কী সেটা ভাঙে?**

এটা hash করে package-এর source file, task-এর configuration, dependency-গুলোর output-এর hash, lockfile, আর আপনার
স্পষ্টভাবে declare করা environment variable। এটা দুই দিকে ভাঙে। অনির্দিষ্ট output, যেমন একটি timestamp বা একটি random
identifier, মানে কখনো hit হবে না। একটি undeclared input মানে একটি পুরোনো hit: tool নিশ্চিত যে কিছুই বদলায়নি, আর সে ভুল।

**Q: একটি staging deployment production configuration নিয়ে বেরিয়েছে। একটি build cache কীভাবে এটা ঘটায়?**

যে variable environment বেছে নেয়, সেটা task-এর `env` তালিকায় ছিল না। তাই দুটি build-এর hash একই হয়েছে, আর cache
staging-কে production-এর artefact serve করেছে। Output বদলায় এমন যেকোনো কিছু cache key-তে থাকতে হবে। যা বদলায় না,
বিশেষ করে credential, সেটা key-কে প্রভাবিত না করে pass through হওয়া উচিত।

**Q: কখন monorepo ভুল পছন্দ?**

যখন team-গুলোর সত্যিই স্বাধীন release-এর ছন্দ দরকার, বা project ভেদে access সীমাবদ্ধ রাখতে হয়। অথবা যখন affected-only
continuous integration আর একটি build cache-এর দায়িত্ব নেওয়ার সময় কারও নেই। শেষেরটাই veto। সেই tooling ছাড়া একটি
monorepo-তে সব coupling আছে, কিন্তু কোনো গতি নেই।

## এরপর কী পড়বেন

- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — যে সিদ্ধান্ত আপনি নিয়ে ফেলেছেন বলে এই অধ্যায় ধরে নেয়
- [Chapter ?? — CI/CD-র মূল কথা](#ch-cicd-fundamentals) — affected-only run আর remote cache কোথায় যুক্ত হয়
