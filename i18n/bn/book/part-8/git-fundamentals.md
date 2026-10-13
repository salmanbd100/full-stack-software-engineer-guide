---
sourceHash: "4746bd5f964749356b9c896157cfe24fbc05031db389886e541f572dece2b14b"
title: "Git-এর মূল কথা ও Recovery"
translatedAt: "2026-10-13T03:04:53.371Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Git-এর মূল কথা ও Recovery {#ch-git-fundamentals}

> একটি Git command চালানোর আগেই আন্দাজ করুন সেটা আপনার history-র কী করবে, আর হারিয়ে গেছে ভাবা যেকোনো commit ফিরিয়ে আনুন।

**এই অধ্যায়ে:** snapshot হিসেবে commit · তিনটি tree · merge বনাম rebase · undo করার উপায়গুলো · reflog, bisect আর ফাঁস হয়ে যাওয়া secret

## 💡 মূল ধারণা

একটি commit হলো **পুরো project-এর একটি snapshot**, সঙ্গে তার আগের commit-এর দিকে একটি pointer। এটা কোনো diff
নয়। Git আপনাকে diff দেখায়, কারণ সেটা পড়া সহজ। কিন্তু সে file-এর সম্পূর্ণ tree জমা রাখে। Parent pointer ধরে
snapshot-গুলো জুড়ে দিলেই একটি graph পাওয়া যায়। প্রতিটি Git command হয় সেই graph-এ কিছু যোগ করে, তার চারপাশে
একটি label সরায়, নয়তো সেটা পড়ে।

Branch হলো এমনই একটি label: চল্লিশটি hex character রাখা একটি file। Branch তৈরি করা সস্তা, কারণ copy করার কিছু
নেই। একটি branch delete করলে একটি নাম ফেলে দেওয়া হয়, কোনো কাজ নয়।

Git খুব কমই কিছু delete করে। কোনো label আর একটি commit-এর দিকে point না করলে সেটা আর দেখা যায় না। তবু সেটা
object database-এ থেকে যায়, যতক্ষণ না garbage collection (অব্যবহৃত object-এর Git-এর পরিষ্কার-পর্ব) সেটা সরিয়ে
দেয়। Default হিসেবে reflog একটি হারানো commit তিরিশ দিন নিরাপদে রাখে। এই অধ্যায়ের প্রতিটি recovery tool একটিই
কৌশল ব্যবহার করে: যে commit-এর দিকে কিছুই point করে না তার hash খুঁজে বের করুন, আর আবার তার দিকে একটি label
point করান।

> "আমার কাজ হারিয়ে গেছে" প্রায় সবসময়ই মানে "আমার কাজের নামটা হারিয়ে গেছে।" নামগুলো reflog-এর মনে থাকে।

## কীভাবে কাজ করে

যেকোনো মুহূর্তে তিনটি জায়গায় আপনার file-এর একটি করে version থাকে। Git এদের বলে **তিনটি tree**।

| Tree             | অন্য নাম           | কী রাখে                                          |
| ---------------- | ----------------- | ----------------------------------------------- |
| **Working tree** | working directory | যে file-গুলো আপনি এই মুহূর্তে edit করছেন            |
| **Index**        | staging area      | আপনার পরের commit-এ ঠিক যে content থাকবে           |
| **HEAD**         | current commit    | আপনার বর্তমান branch-এর মাথায় থাকা snapshot        |

**একটি change কীভাবে এদের মধ্য দিয়ে যায়:**

```text
Working tree  ──git add──▶  Index  ──git commit──▶  HEAD  ──git push──▶  remote
```

বেশিরভাগ মানুষ index এড়িয়ে যান, কিন্তু Git শেখার আসল মূল্য এখানেই। এটা দিয়ে আপনি যা বদলেছেন তার একটি অংশ
commit করতে পারেন। তাই আপনার বিকেলটা গোছানো না হলেও একটি commit মানে একটি যৌক্তিক change। `git add -p` প্রতিটি
hunk (বদলানো line-এর একটি block) ধরে ধরে যায়, আর এই commit-এ কী যাবে তা বেছে নিতে দেয়। `git commit
--amend` শেষ commit-টি নতুন করে লেখে। Push করার আগে এটা নিরাপদ। Push করার পরে এটা বাকি সবার history নতুন করে
লেখে।

### Merge আর Rebase Graph-এর সঙ্গে আলাদা আলাদা কাজ করে

দুটিই একটি branch-এর কাজ আরেকটিতে নিয়ে আসে। পার্থক্য হলো, কাজ শেষে graph-টি দেখতে কেমন হয়।

| দিক                    | Merge                          | Rebase                                    |
| ----------------------- | ------------------------------ | ----------------------------------------- |
| **তৈরি হওয়া commit**     | একটি বাড়তি merge commit         | Replay করা প্রতিটি commit-এর নতুন copy       |
| **আসল commit-গুলো**     | যেমন ছিল ঠিক তেমনই থাকে          | বদলে যায় — নতুন hash, নতুন parent          |
| **History-র আকার**      | শাখাওয়ালা, যা ঘটেছে তা দেখায়      | সরলরৈখিক, একটি গোছানো গল্প দেখায়            |
| **Shared কাজে নিরাপদ**  | ✅ হ্যাঁ                         | ❌ না — অন্যদের কাছে পুরোনো commit উধাও হয়ে যায় |

Rebase একটি rewrite। শুধু আপনার নিজের branch-এ এটা ঠিক আছে, আর যে branch একজন সহকর্মী pull করেছেন সেখানে
ধ্বংসাত্মক।

Conflict কোনো error নয়। এর মানে দুটি commit একই line বদলেছে, আর Git আন্দাজ করবে না। File-টি edit করুন, "resolved"
বোঝাতে সেটা stage করুন, আর commit করুন। অথবা ফিরে যেতে `git merge --abort` চালান।

### Remote

`origin/main`-এর মতো একটি remote-tracking branch হলো একটি local label। শেষবার আপনি যখন remote-এর সঙ্গে কথা
বলেছিলেন, তখন সেটা কোথায় ছিল, এটা তা লিখে রাখে। এটা `fetch`-এ সরে, কখনো নিজে থেকে নয়।

| Command                       | কী করে                                                     | কখন ব্যবহার করবেন                |
| ----------------------------- | --------------------------------------------------------- | -------------------------------- |
| `git fetch`                   | `origin/*` update করে, আর কিছু ছোঁয় না                    | লাফ দেওয়ার আগে দেখে নিতে চান      |
| `git pull`                    | `fetch`, তারপর আপনার branch-এ `merge`                       | যা আসছে তাতে আপনার ভরসা আছে      |
| `git pull --rebase`           | `fetch`, তারপর ওপরে আপনার commit-গুলো replay                 | কোনো merge commit চান না          |
| `git push --force-with-lease` | Remote-কে overwrite করে শুধু যদি সেটা আপনার শেষ fetch-এর সঙ্গে মেলে | নিজের push করা branch নতুন করে লেখা |

> ⚠️ শুধু `--force` remote-এ কী আছে তা দেখে না। সহকর্মীরা এভাবেই commit হারান।
> আপনার শেষ fetch-এর পরে কেউ push করে থাকলে `--force-with-lease` রাজি হয় না। Shared branch-এ এর কোনোটাই কখনো
> ব্যবহার করবেন না।

## কখন ব্যবহার করবেন

চারটি tool চারটি আলাদা জিনিস undo করে। ভুলটা বেছে নিলেই কাজ উধাও হয়।

| আপনি চান                              | ব্যবহার করুন                    | History নতুন করে লেখে? |
| ------------------------------------ | ------------------------------ | ------------------ |
| একটি file-এর edit ফেলে দিতে            | `git restore file.ts`          | না                 |
| একটি file-কে index থেকে বের করে আনতে   | `git restore --staged file.ts` | না                 |
| যে commit কেউ pull করেননি তা undo করতে | `git reset`                    | হ্যাঁ              |
| ইতিমধ্যে push করা একটি commit undo করতে | `git revert`                   | না — একটি commit যোগ করে |

**তিনটি reset mode, যাদের পার্থক্য শুধু reset কতদূর পৌঁছায় তাতে:**

| Mode                | HEAD সরায় | Index     | Working tree | কীসের জন্য ব্যবহার করবেন              |
| ------------------- | ---------- | --------- | ------------ | ---------------------------------- |
| `--soft`            | হ্যাঁ       | অপরিবর্তিত | অপরিবর্তিত    | একই কাজ অন্যভাবে আবার commit করতে   |
| `--mixed` (default) | হ্যাঁ       | Reset     | অপরিবর্তিত    | সবকিছু unstage করতে, code রেখে       |
| `--hard`            | হ্যাঁ       | Reset     | Reset        | Code-ও ফেলে দিতে                    |

`git reset --hard` একমাত্র mode, যেটা commit না করা কাজ ধ্বংস করে। Commit না করা কাজ কখনো object database-এ
ছিলই না। তাই এটাই একমাত্র জিনিস, যেটা Git আপনার জন্য ফিরিয়ে আনতে পারে না।

## Recovery-র Tool

নিচের প্রতিটি tool হয় আপনার হারানো একটি hash খুঁজে বের করে, নয়তো যে commit এখনো আপনার নিজের, সেগুলো নতুন করে লেখে।

### Reflog হলো একটি Local Undo Log

Git `HEAD`-এর আর প্রতিটি branch label-এর প্রতিটি নড়াচড়া লিখে রাখে। Reset, rebase, checkout, merge আর branch
delete — সবই একটি entry রেখে যায়, নড়াচড়ার আগের hash সহ।

**Sample output, একটি খারাপ reset পড়া:**

```text
abc1234 HEAD@{0}: reset: moving to HEAD~3
9f3e0a1 HEAD@{1}: commit: feat(billing): add proration
5c7b221 HEAD@{2}: commit: test(billing): cover mid-cycle upgrade
```

`HEAD@{1}` হলো reset-এর আগে আপনি যেখানে ছিলেন। তাই `git reset --hard HEAD@{1}` তিনটি commit ফিরিয়ে আনে। Delete
করা branch-ও একইভাবে কাজ করে।

**একটি delete করা branch তার শেষ commit থেকে আবার তৈরি করা:**

```bash
git reflog | grep feature-billing
git switch -c feature-billing 9f3e0a1
```

Reflog প্রতিটি clone-এর নিজস্ব, আর কখনো push হয় না। যে commit শুধু এমন একটি machine-এ ছিল যেটা এখন আর আপনার
কাছে নেই, সেটা সত্যিই হারিয়ে গেছে।

### Interactive Rebase আর Cherry-Pick

"wip" আর "typo" commit-এ ভরা একটি branch সৎ, কিন্তু পড়ার অযোগ্য। `git rebase -i HEAD~5` শেষ পাঁচটির একটি তালিকা
খোলে। প্রতিটি line-এ একটি শব্দ বদলে আপনি সেগুলোকে অল্প কয়েকটি commit-এ পরিণত করেন, যেগুলো আপনার কাজ বর্ণনা করে।

**Todo list, edit করার পরে:**

```text
pick   a1b2c3d feat(auth): add OAuth callback route
fixup  d4e5f6a wip
fixup  b7c8d9e typo
reword f0a1b2c test(auth): add callback tests
drop   c3d4e5f debug logging
```

`squash` আর `fixup` দুটিই একটি commit-কে তার ওপরেরটির মধ্যে ভাঁজ করে দেয়। `fixup` তার message ফেলে দেয়। Rebase
edit-এর জায়গা থেকে পরের প্রতিটি commit নতুন করে লেখে। তাই pull request খোলার আগেই এটা করুন।

`git cherry-pick <hash>` ছোট tool। এটা একটি commit-কে আপনি যে branch-এ আছেন তাতে copy করে, নতুন একটি hash সহ।
`main`-এর বাকি সবকিছু সঙ্গে না এনে একটি release branch-এ একটিমাত্র fix বসাতে এটা ব্যবহার করুন।

### Bisect ভাঙানো Commit-টি O(log n)-এ খুঁজে পায়

Feature-টি `v2.4.0`-এ কাজ করত আর `main`-এ ভাঙা, মাঝে 300টি commit। Bisect মাঝখানের commit-টি checkout করে, আর
আপনি বলেন good নাকি bad। তারপর সে range-টি অর্ধেক করে। এতে 300-এর বদলে প্রায় নয়টি ধাপ লাগে।

**Automated রূপ, যেটা বিশ মিনিটের একটি loop-কে একটি command-এ পরিণত করে:**

```bash
git bisect start HEAD v2.4.0
git bisect run pnpm vitest run src/billing   # exit 0 = good, non-zero = bad
git bisect reset                             # Back to where you started
```

Exit code 125 সেটাই, যেটা মানুষ খেয়াল করেন না। এটা bisect-কে বলে, যে commit test করা যায় না সেটা skip করতে। এটা
ছাড়া, compile না হওয়া একটি commit "bad" হিসেবে চিহ্নিত হয়, আর bisect ভুল change-কে দোষ দেয়।

### History থেকে একটি Secret বের করা

নতুন একটি commit-এ file-টি delete করলে কিছুই হয় না। Blob (জমা রাখা file content) যে commit সেটা যোগ করেছিল, তা
থেকে এখনো পৌঁছানো যায়, আর যে কেউ সেটা `git show` করতে পারেন। আপনাকে history নতুন করে লিখতে হবে।

**প্রতিটি commit থেকে file-টি সরানো:**

```bash
# git-filter-repo is the maintained tool; git filter-branch is deprecated
git filter-repo --path config/prod.env --invert-paths
git remote add origin <url>   # filter-repo removes origin as a safety measure
git push --force --all && git push --force --tags   # Every hash after the file changes
```

তারপর এই ধাপগুলো এই ক্রমেই করুন। ক্রমটাই পুরো উত্তর।

1. **সবার আগে credential-টি rotate করুন।** ধরে নিন সেটা কেউ পড়েছে। History নতুন করে লিখলে গতকাল কে repository
   clone করেছে, সে সম্পর্কে কিছুই প্রমাণ হয় না।
2. History নতুন করে লিখুন আর প্রতিটি branch আর tag force-push করুন।
3. প্রত্যেক collaborator-কে আবার clone করতে বলুন। তাঁদের পুরোনো clone-এ secret-টি এখনো আছে, আর সেটা আবার push
   হয়ে ফিরে আসবে।
4. Pipeline-এ একটি secret scanner যোগ করুন, যাতে এটা আর না ঘটে।

> ⚠️ একটি hosted platform-এ fork আর cache করা pull request view rewrite-এর পরেও টিকে থাকতে পারে। নিশ্চিতভাবে কাজ
> করে এমন একমাত্র ধাপ হলো rotation।

## সাধারণ ভুল

**❌ ভুল — push করা commit-এ `reset`-এর দিকে হাত বাড়ানো:**

```bash
git reset --hard HEAD~2
git push --force              # Everyone who pulled now has commits that no longer exist upstream
```

**✅ ঠিক — পেছনের দিকে নয়, সামনের দিকে undo করুন:**

```bash
git revert HEAD~2..HEAD       # Two new commits that reverse the two bad ones
git push                      # No force, nobody's clone breaks
```

Shared history নতুন করে লিখলে খরচটা বাকি প্রতিটি clone-এর ঘাড়ে চাপে। Revert করলে ভুলটা দেখা যায়। সেটা সৎ, আর
তার কোনো খরচ নেই।

**❌ ভুল — flaky suite দিয়ে bisect করা:**

```bash
git bisect run pnpm test      # "bad" sometimes means "unlucky"
```

**✅ ঠিক — একটি deterministic check দিয়ে bisect করুন:**

```bash
git bisect run pnpm vitest run src/billing/prorate.test.ts
```

Bisect একটি binary search। একটি ভুল উত্তর এটাকে ভুল অর্ধেকে পাঠিয়ে দেয়। তারপর সে পুরো আত্মবিশ্বাসের সঙ্গে ভুল
commit-টি report করে।

## 🔑 মূল শিক্ষা

- একটি commit হলো একটি পূর্ণ snapshot আর একটি parent pointer, আর একটি branch হলো একটি commit hash রাখা একটি file।
- Commit delete হয় না, পৌঁছানোর অযোগ্য হয়ে যায়। তাই recovery মানে reflog-এ hash খুঁজে বের করে তার দিকে একটি label point করানো।
- Merge যে commit নিয়ে আসে সেগুলো রেখে দেয়, কিন্তু rebase সেগুলো বদলে ফেলে। এজন্যই shared কোনো কিছুতে rebase নিরাপদ নয়।
- যে history কেউ দেখেননি তার জন্য `reset`, আর যে history push হয়ে গেছে তার জন্য `revert` ব্যবহার করুন।
- Commit হয়ে যাওয়া একটি secret সরানো শুরু হয় সেটা rotate করে। History rewrite দ্বিতীয় ধাপ, সমাধান নয়।

## Interview-এর প্রশ্ন

**Q: `git fetch` আর `git pull`-এর মধ্যে পার্থক্য কী?**

`fetch` আপনার remote-tracking branch-গুলো update করে থেমে যায়, তাই আপনার working tree-তে কিছুই বদলায় না। `pull`
হলো `fetch`-এর পরে একটি merge, অথবা `--rebase` দিলে একটি rebase। কীভাবে integrate করবেন তা ঠিক করার আগে
`git log origin/main` পড়তে চাইলে আগে fetch করুন।

**Q: আপনি একটি branch delete করে ফেলেছেন, বা কেউ তার ওপর force-push করেছেন। কীভাবে ফিরিয়ে আনবেন?**

`git reflog`-এ পুরোনো মাথাটা খুঁজুন, আর `git switch -c <name> <hash>` দিয়ে label-টি আবার তৈরি করুন। দরকার হলে
তারপর সেটা আবার push করুন। Commit-গুলো কখনো সরানো হয়নি। শুধু নামটা সরানো হয়েছিল। তারপর `--force-with-lease`-এর
কথা বলুন, যেটা force-push-টি করতে দিত না।

**Q: `git reset`-এর তিনটি mode আসলে কী বদলায়?**

তিনটিই branch label সরায়। `--soft` সেখানেই থামে, তাই কাজটা staged থাকে। `--mixed` index-ও খালি করে, আর `--hard`
working tree-ও overwrite করে। এজন্য শুধু এটাই ধ্বংসাত্মক।

**Q: কখন আপনি rebase বা interactive rebase ব্যবহার করবেন না?**

যে branch অন্য কেউ pull করেছেন, তার যেকোনোটিতে, আর `main`-এ কখনোই নয়। Rebase নতুন hash সহ নতুন commit তৈরি করে।
তাই যাঁর কাছে আসলগুলো আছে, তিনি একটি আলাদা হয়ে যাওয়া history পান। একটি shared branch অগোছালো হলে, তার বদলে
merge-এর সময় squash করুন।

**Q: কোন commit একটি regression এনেছে, সেটা কীভাবে খুঁজবেন, বুঝিয়ে বলুন।**

একটি জানা ভালো tag আর ভাঙা `HEAD` চিহ্নিত করুন। তারপর `git bisect run`-কে একটি deterministic test চালাতে দিন।
এতে প্রায় log₂(n) ধাপ লাগে, তাই 300টি commit প্রায় নয় ধাপে মীমাংসা হয়। Check-টিকে ঠিক এই bug-এর জন্যই fail করতে
হবে, আর যে commit build হয় না তার জন্য 125 দিয়ে exit করতে হবে।

**Q: ছয় মাস আগে একটি secret commit হয়েছিল। আপনার ধাপগুলো কী?**

সবার আগে credential-টি rotate করি। এর মধ্যে repository clone হয়েছে, আর কোনো rewrite সেই copy-গুলোর কাছে পৌঁছাতে
পারে না। তারপর `git filter-repo` দিয়ে history নতুন করে লিখি, প্রতিটি branch আর tag force-push করি, আর
collaborator-দের আবার clone করতে বলি। শেষে pipeline-এ secret scanning যোগ করি, যাতে পরেরটা merge-এর আগেই ধরা পড়ে।

## এরপর কী পড়বেন

- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — এই command-গুলো কীভাবে
  একটি team-এর মেনে চলার মতো policy-তে পরিণত হয়
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions) — সেই pipeline, যেখানে secret scanning একটি ফাঁস
  history-তে পৌঁছানোর আগেই ধরে ফেলে
