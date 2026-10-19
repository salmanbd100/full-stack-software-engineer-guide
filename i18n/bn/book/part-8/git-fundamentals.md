---
sourceHash: "4746bd5f964749356b9c896157cfe24fbc05031db389886e541f572dece2b14b"
title: "Git-এর মূল কথা ও Recovery"
translatedAt: "2026-10-19T07:54:29.968Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Git-এর মূল কথা ও Recovery {#ch-git-fundamentals}

> কোনো Git command চালানোর আগেই বলে দিন সেটা আপনার history-র কী করবে। আর যে commit হারিয়ে গেছে ভেবেছিলেন, সেটা ফিরিয়ে আনুন।

**এই অধ্যায়ে:** snapshot হিসেবে commit · তিনটি tree · merge বনাম rebase · undo করার নানা উপায় · reflog, bisect আর ফাঁস হওয়া secret

## 💡 মূল ধারণা

Commit হলো **পুরো project-এর একটি snapshot**, সঙ্গে আগের commit-এর দিকে একটি pointer। এটা diff নয়। Git আপনাকে diff
দেখায়, কারণ diff পড়া সহজ। কিন্তু জমা রাখে file-এর পুরো tree। Parent pointer ধরে snapshot-গুলো জুড়লে একটি graph
পাওয়া যায়। প্রতিটি Git command হয় এই graph-এ কিছু যোগ করে, নয়তো graph-এর ওপর একটি label সরায়, নয়তো graph-টা পড়ে।

Branch হলো এমনই একটি label: একটি file, যাতে চল্লিশটি hex অক্ষর লেখা। Branch বানাতে খরচ প্রায় নেই, কারণ copy করার মতো
কিছু নেই। Branch মুছলে শুধু একটি নাম যায়, কোনো কাজ যায় না।

Git খুব কমই কিছু মুছে ফেলে। কোনো label আর একটি commit-কে না দেখালে commit-টা চোখের আড়ালে চলে যায়। তবু object
database-এ থেকে যায়, যতক্ষণ না garbage collection (অব্যবহৃত object-এর জন্য Git-এর সাফাই) সেটা সরিয়ে দেয়। Default
হিসেবে reflog হারানো commit-কে তিরিশ দিন নিরাপদে রাখে। এই অধ্যায়ের প্রতিটি recovery tool একই কৌশল খাটায়: যে
commit-কে কেউ দেখাচ্ছে না, তার hash খুঁজে বের করুন, তারপর আবার একটি label তার দিকে তাক করুন।

> "আমার কাজ হারিয়ে গেছে" কথাটার মানে প্রায় সবসময় "আমার কাজের নামটা হারিয়ে গেছে"। নামগুলো reflog মনে রাখে।

## কীভাবে কাজ করে

যেকোনো মুহূর্তে আপনার file-এর একটি করে version থাকে তিনটি জায়গায়। Git এদের বলে **তিনটি tree**।

| Tree             | অন্য নাম           | এতে কী থাকে                                     |
| ---------------- | ----------------- | ----------------------------------------------- |
| **Working tree** | working directory | যে file-গুলো আপনি এই মুহূর্তে edit করছেন          |
| **Index**        | staging area      | পরের commit-এ হুবহু যা যাবে                       |
| **HEAD**         | current commit    | বর্তমান branch-এর মাথায় থাকা snapshot             |

**একটি change এদের মধ্য দিয়ে কীভাবে এগোয়:**

```text
Working tree  ──git add──▶  Index  ──git commit──▶  HEAD  ──git push──▶  remote
```

বেশিরভাগ মানুষ index এড়িয়ে যান। অথচ Git শেখার আসল লাভটা এখানেই। যা বদলেছেন তার একটি অংশ commit করা যায়।
ফলে আপনার বিকেলটা এলোমেলো গেলেও প্রতিটি commit-এ থাকে একটিমাত্র যুক্তিসঙ্গত change। `git add -p` প্রতিটি hunk
(বদলানো line-এর একটি block) ধরে ধরে দেখায়, আর আপনি বেছে নেন কোনটা এই commit-এ যাবে। `git commit
--amend` শেষ commit-টা নতুন করে লেখে। Push-এর আগে এটা নিরাপদ। Push-এর পরে করলে বাকি সবার history বদলে যায়।

### Merge আর Rebase graph-এর সঙ্গে আলাদা কাজ করে

দুটিই এক branch-এর কাজ আরেক branch-এ আনে। পার্থক্য হলো কাজ শেষে graph-টা দেখতে কেমন হয়।

| দিক                       | Merge                            | Rebase                                     |
| ------------------------- | -------------------------------- | ------------------------------------------ |
| **নতুন কী commit হয়**      | একটি বাড়তি merge commit           | প্রতিটি commit আবার চালিয়ে নতুন copy          |
| **আসল commit-গুলো**        | যেমন ছিল ঠিক তেমনই থাকে            | বদলে যায়: নতুন hash, নতুন parent             |
| **History-র চেহারা**       | শাখা-প্রশাখা, যা ঘটেছে তা-ই দেখায়    | সোজা এক লাইন, গোছানো একটি গল্প দেখায়         |
| **Shared কাজে নিরাপদ?**    | ✅ হ্যাঁ                           | ❌ না, পুরনো commit-গুলো অন্যদের কাছ থেকে উধাও |

Rebase মানে নতুন করে লেখা। যে branch শুধু আপনার, সেখানে ঠিক আছে। কিন্তু কোনো সহকর্মী যে branch pull করেছেন, সেখানে
এটা ক্ষতি করে।

Conflict কোনো error নয়। এর মানে দুটি commit একই line বদলেছে, আর Git আন্দাজে কিছু বসাবে না। File-টা edit করুন,
"সমাধান হয়েছে" বোঝাতে stage করুন, তারপর commit করুন। অথবা `git merge --abort` চালিয়ে আগের অবস্থায় ফিরে যান।

### Remote

`origin/main`-এর মতো remote-tracking branch আসলে একটি local label। শেষবার remote-এর সঙ্গে কথা বলার সময় remote কোথায়
ছিল, সেটা লিখে রাখে। এটা নড়ে শুধু `fetch` করলে, নিজে থেকে কখনো নয়।

| Command                       | কী করে                                                       | কখন কাজে লাগে                         |
| ----------------------------- | ------------------------------------------------------------ | ------------------------------------- |
| `git fetch`                   | `origin/*` update করে, আর কিছু ছোঁয় না                         | লাফ দেওয়ার আগে একবার দেখে নিতে চান     |
| `git pull`                    | `fetch`, তারপর আপনার branch-এ `merge`                          | যা আসছে তার ওপর ভরসা আছে               |
| `git pull --rebase`           | `fetch`, তারপর আপনার commit-গুলো ওপরে আবার চালায়                | কোনো merge commit চান না               |
| `git push --force-with-lease` | Remote শুধু তখনই overwrite করে, যখন সেটা আপনার শেষ fetch-এর সঙ্গে মেলে | নিজের push করা branch নতুন করে লিখছেন  |

> ⚠️ সাধারণ `--force` remote-এ কী আছে তা দেখে না। সহকর্মীদের commit এভাবেই হারায়।
> শেষ fetch-এর পরে কেউ push করে থাকলে `--force-with-lease` কাজটা করতে রাজি হয় না। Shared branch-এ এ দুটির কোনোটাই ব্যবহার করবেন না।

## কখন ব্যবহার করবেন

চারটি tool চারটি আলাদা জিনিস undo করে। ভুলটা বেছে নিলেই কাজ উধাও হয়।

| আপনি যা চান                              | ব্যবহার করুন                     | History নতুন করে লেখে?       |
| --------------------------------------- | ------------------------------ | --------------------------- |
| কোনো file-এর edit ফেলে দিতে               | `git restore file.ts`          | না                          |
| কোনো file-কে index থেকে আবার বের করতে      | `git restore --staged file.ts` | না                          |
| যে commit কেউ pull করেনি, সেটা undo করতে   | `git reset`                    | হ্যাঁ                        |
| আগেই push করা commit undo করতে            | `git revert`                   | না, একটি নতুন commit যোগ করে |

**Reset-এর তিনটি mode। পার্থক্য শুধু reset কতদূর পৌঁছায়, তাতে:**

| Mode                | HEAD সরায় | Index      | Working tree | কাজে লাগে                              |
| ------------------- | --------- | ---------- | ------------ | ------------------------------------- |
| `--soft`            | হ্যাঁ      | অক্ষত      | অক্ষত        | একই কাজ অন্যভাবে আবার commit করতে       |
| `--mixed` (default) | হ্যাঁ      | Reset হয়  | অক্ষত        | সব unstage করতে, code রেখে দিয়ে        |
| `--hard`            | হ্যাঁ      | Reset হয়  | Reset হয়    | Code-ও ফেলে দিতে                       |

`git reset --hard` একমাত্র mode, যা commit না করা কাজ নষ্ট করে। Commit না করা কাজ কখনো object database-এ যায়নি।
তাই Git এই একটি জিনিসই আপনাকে ফিরিয়ে দিতে পারে না।

## Recovery Tool

নিচের প্রতিটি tool হয় হারানো hash খুঁজে দেয়, নয়তো এখনো আপনার হাতে থাকা commit নতুন করে লেখে।

### Reflog হলো local undo log

`HEAD` আর প্রতিটি branch label যতবার নড়ে, Git ততবার লিখে রাখে। Reset, rebase, checkout, merge, branch মোছা, সবই
একটি করে entry রেখে যায়, তাতে থাকে নড়ার আগের hash।

**নমুনা output, ভুল reset-এর পরে পড়া:**

```text
abc1234 HEAD@{0}: reset: moving to HEAD~3
9f3e0a1 HEAD@{1}: commit: feat(billing): add proration
5c7b221 HEAD@{2}: commit: test(billing): cover mid-cycle upgrade
```

Reset-এর আগে আপনি যেখানে ছিলেন, সেটাই `HEAD@{1}`। তাই `git reset --hard HEAD@{1}` তিনটি commit ফিরিয়ে আনে। মুছে
ফেলা branch-ও একইভাবে ফেরে।

**শেষ commit থেকে মুছে ফেলা branch আবার বানানো:**

```bash
git reflog | grep feature-billing
git switch -c feature-billing 9f3e0a1
```

Reflog প্রতিটি clone-এর নিজস্ব, আর কখনো push হয় না। যে commit শুধু এমন machine-এ ছিল, যেটা আর আপনার কাছে নেই,
সেটা সত্যিই গেছে।

### Interactive Rebase আর Cherry-Pick

"wip" আর "typo" commit-এ ভরা branch সৎ ঠিকই, কিন্তু পড়া যায় না। `git rebase -i HEAD~5` শেষ পাঁচটি commit-এর তালিকা
খোলে। প্রতিটি line-এ একটি শব্দ বদলে আপনি এগুলোকে অল্প কয়েকটি commit-এ গুছিয়ে নেন, যা আপনার কাজটা বুঝিয়ে বলে।

**Edit করা todo তালিকা:**

```text
pick   a1b2c3d feat(auth): add OAuth callback route
fixup  d4e5f6a wip
fixup  b7c8d9e typo
reword f0a1b2c test(auth): add callback tests
drop   c3d4e5f debug logging
```

`squash` আর `fixup` দুটিই একটি commit-কে তার ওপরেরটার সঙ্গে মিশিয়ে দেয়। `fixup` তার message ফেলে দেয়। Edit-এর
জায়গা থেকে পরের প্রতিটি commit rebase নতুন করে লেখে, তাই pull request খোলার আগেই কাজটা সেরে নিন।

`git cherry-pick <hash>` ছোট tool। এটা একটি commit-কে নতুন hash দিয়ে আপনার বর্তমান branch-এ copy করে। পুরো `main`
টেনে না এনে release branch-এ শুধু একটি fix বসাতে এটা ব্যবহার করুন।

### Bisect ভাঙার commit খুঁজে দেয় O(log n)-এ

Feature-টা `v2.4.0`-এ কাজ করত, `main`-এ ভাঙা, আর মাঝখানে 300টি commit। Bisect মাঝের commit checkout করে, আর আপনি
বলেন good না bad। তারপর range-টা অর্ধেক হয়। 300 ধাপের বদলে লাগে মোটামুটি নয়টি।

**Automated version, যা বিশ মিনিটের loop-কে একটি command-এ নামিয়ে আনে:**

```bash
git bisect start HEAD v2.4.0
git bisect run pnpm vitest run src/billing   # exit 0 = good, non-zero = bad
git bisect reset                             # Back to where you started
```

Exit code 125-এর কথাই মানুষ ভুলে যায়। এটা bisect-কে বলে, যে commit test করা যাচ্ছে না, সেটা বাদ দিতে। এটা না থাকলে
compile না হওয়া commit-কে "bad" ধরা হয়, আর bisect ভুল change-কে দোষ দেয়।

### History থেকে secret বের করা

নতুন commit-এ file-টা মুছে দিলে কিছুই হয় না। যে commit file-টা যোগ করেছিল, সেখান থেকে blob (জমা রাখা file-এর
content) এখনো পৌঁছানো যায়, আর যে কেউ `git show` দিয়ে দেখে নিতে পারে। History নতুন করে লিখতেই হবে।

**প্রতিটি commit থেকে file-টা সরানো:**

```bash
# git-filter-repo is the maintained tool; git filter-branch is deprecated
git filter-repo --path config/prod.env --invert-paths
git remote add origin <url>   # filter-repo removes origin as a safety measure
git push --force --all && git push --force --tags   # Every hash after the file changes
```

তারপর এই ধাপগুলো ঠিক এই ক্রমে করুন। পুরো উত্তরটাই এই ক্রমে।

1. **সবার আগে credential rotate করুন।** ধরে নিন কেউ এটা পড়েছে। History নতুন করে লিখলে প্রমাণ হয় না যে গতকাল কেউ
   repository clone করেনি।
2. History নতুন করে লিখুন, তারপর প্রতিটি branch আর tag force-push করুন।
3. প্রত্যেক collaborator-কে আবার clone করতে বলুন। তাঁদের পুরনো clone-এ secret এখনো আছে, আর সেটা আবার push হয়ে ফিরবে।
4. Pipeline-এ secret scanner যোগ করুন, যাতে আর কখনো এমন না হয়।

> ⚠️ Hosted platform-এ fork আর cache করা pull request view rewrite-এর পরেও টিকে থাকতে পারে। নিশ্চিতভাবে কাজ করে
> শুধু rotation।

## সাধারণ ভুল

**❌ ভুল: push করা commit-এর জন্য `reset` ব্যবহার:**

```bash
git reset --hard HEAD~2
git push --force              # Everyone who pulled now has commits that no longer exist upstream
```

**✅ ঠিক: পেছনে না গিয়ে সামনে এগিয়ে undo করুন:**

```bash
git revert HEAD~2..HEAD       # Two new commits that reverse the two bad ones
git push                      # No force, nobody's clone breaks
```

Shared history নতুন করে লিখলে খরচটা চাপে বাকি প্রতিটি clone-এর ঘাড়ে। Revert করলে ভুলটা চোখের সামনেই থাকে। এটা
সৎ, আর এর কোনো খরচ নেই।

**❌ ভুল: flaky suite দিয়ে bisect:**

```bash
git bisect run pnpm test      # "bad" sometimes means "unlucky"
```

**✅ ঠিক: একটি deterministic check দিয়ে bisect:**

```bash
git bisect run pnpm vitest run src/billing/prorate.test.ts
```

Bisect আসলে binary search। একটি ভুল উত্তরেই সেটা ভুল অর্ধেকে চলে যায়। তারপর পুরো আত্মবিশ্বাস নিয়ে ভুল commit-এর
নাম বলে।

## 🔑 মূল শিক্ষা

- Commit হলো পুরো snapshot আর একটি parent pointer। Branch হলো এমন একটি file, যাতে একটি commit hash লেখা।
- Commit মোছে না, শুধু নাগালের বাইরে চলে যায়। তাই recovery মানে reflog-এ hash খুঁজে আবার একটি label তার দিকে তাক করা।
- Merge যে commit আনে সেগুলো রেখে দেয়, rebase সেগুলো বদলে ফেলে। এজন্যই shared কিছুর ওপর rebase নিরাপদ নয়।
- যে history কেউ দেখেনি, তার জন্য `reset`। যে history push হয়ে গেছে, তার জন্য `revert`।
- Commit করা secret সরানোর কাজ শুরু হয় rotate করে। History rewrite দ্বিতীয় ধাপ, সমাধান নয়।

## Interview-এর প্রশ্ন

**Q: `git fetch` আর `git pull`-এর পার্থক্য কী?**

`fetch` আপনার remote-tracking branch update করে থেমে যায়, তাই working tree-তে কিছুই বদলায় না। `pull` মানে `fetch`,
তারপর একটি merge, অথবা `--rebase` দিলে একটি rebase। কীভাবে মেলাবেন ঠিক করার আগে `git log origin/main` পড়ে নিতে চাইলে
আগে fetch করুন।

**Q: আপনি একটি branch মুছে ফেলেছেন, কিংবা কেউ তার ওপর force-push করেছে। এটা ফেরাবেন কীভাবে?**

`git reflog`-এ পুরনো মাথাটা খুঁজুন, আর `git switch -c <name> <hash>` দিয়ে label-টা আবার বানান। দরকার হলে আবার push
করুন। Commit-গুলো কখনো মোছেনি, গিয়েছিল শুধু নামটা। এরপর `--force-with-lease`-এর কথা বলুন, যা force-push-টা আটকে দিত।

**Q: `git reset`-এর তিনটি mode আসলে কী কী বদলায়?**

তিনটিই branch label সরায়। `--soft` সেখানেই থামে, তাই কাজটা staged থেকে যায়। `--mixed` index-ও খালি করে। আর `--hard`
working tree-ও overwrite করে, তাই কাজ নষ্ট করে শুধু এটাই।

**Q: কখন rebase বা interactive rebase ব্যবহার করবেন না?**

যে branch অন্য কেউ pull করেছেন, সেখানে। আর `main`-এ কখনোই না। Rebase নতুন hash দিয়ে নতুন commit বানায়। তাই যাঁর
কাছে আসলগুলো আছে, তাঁর history আলাদা পথে চলে যায়। Shared branch এলোমেলো হলে বরং merge-এর সময় squash করুন।

**Q: কোন commit regression এনেছে, সেটা কীভাবে খুঁজবেন, ধাপে ধাপে বলুন।**

একটি জানা ভালো tag আর ভাঙা `HEAD` চিহ্নিত করুন। তারপর `git bisect run`-কে একটি deterministic test চালাতে দিন। এতে
মোটামুটি log₂(n) ধাপ লাগে, তাই 300টি commit মেটে প্রায় নয় ধাপে। Check-টা ঠিক এই bug-এর জন্যই fail করতে হবে, আর যে
commit build হয় না তার জন্য exit 125 দিতে হবে।

**Q: ছয় মাস আগে একটি secret commit হয়ে গেছে। আপনি কোন ক্রমে কী করবেন?**

সবার আগে credential rotate করবেন। এর মধ্যে repository clone হয়েছে, আর কোনো rewrite সেই copy-গুলোতে পৌঁছাতে পারে না।
তারপর `git filter-repo` দিয়ে history নতুন করে লিখবেন, প্রতিটি branch আর tag force-push করবেন, আর collaborator-দের
আবার clone করতে বলবেন। শেষে pipeline-এ secret scanning যোগ করবেন, যাতে পরেরটা merge-এর আগেই ধরা পড়ে।

## এরপর কী পড়বেন

- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — এই command-গুলো কীভাবে
  এমন নিয়মে দাঁড়ায়, যা পুরো team মেনে চলতে পারে
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — সেই pipeline, যেখানে secret scanning
  ফাঁস হওয়া secret history-তে পৌঁছানোর আগেই ধরে ফেলে
