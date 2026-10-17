---
sourceHash: "6f7aff1112c380ac7910912e79bfd6a1db0feb5921052c568ea6708e049c0295"
title: "Frontend Architecture"
translatedAt: "2026-10-17T01:34:46.930Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Frontend Architecture

Part III শেখায় frontend কীভাবে বানাতে হয়। এই অংশ বলে, frontend যখন বড় আর পুরনো হয়ে যায়, আর তাতে এত মানুষ কাজ করে
যে এক standup-এ ধরে না, তখন কী বদলায়। এখানকার প্রতিটি অধ্যায় একটি **boundary** নিয়ে। সেটা হতে পারে layer-এর মাঝে,
team-এর মাঝে, কিংবা shared UI আর সেটা ব্যবহার করা feature-গুলোর মাঝে। শেষেরটা বসে assistant যা লেখে আর যা codebase-এ
ঢোকে, তার মাঝে। প্রতিটি অধ্যায় এটাও জিজ্ঞেস করে: boundary একবার তৈরি হলে তাকে টিকিয়ে রাখতে কত খরচ।

এই অধ্যায়গুলো performance, security আর testing-এর পাশে রাখা, কারণ চারটিই একই প্রশ্নের উত্তর দেয়: বড় পরিসরে কী
ভাঙে, আর ভাঙার আগেই কী ব্যবস্থা নেবেন? যে অধ্যায়গুলো codebase সাজানো নিয়ে নয়, বরং **design round চালানো** নিয়ে,
সেগুলো Part VI-এ।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর |
| -- | ------- | --------------- |
| 01 | [Frontend Architecture Pattern](#ch-frontend-architecture-patterns) | Boundary কোথায় বসবে, আর কোনগুলো enforce করার মতো? |
| 02 | [Micro-Frontend](#ch-micro-frontends) | Deploy-এর স্বাধীনতা কখন coordination-এর খরচের যোগ্য? |
| 03 | [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) | চল্লিশটি team component ভাগ করে নেয় কীভাবে, আর পাঁচ বছরের পুরনো frontend upgrade করার মতো থাকে কীভাবে? |
| 04 | [AI-এর লেখা Code Review](#ch-reviewing-ai-generated-code) | Generate করা code-এ এমন কোন defect থাকে, যা মানুষের লেখা code-এ থাকে না? |

Monorepo না polyrepo, এই সিদ্ধান্তটা এই দলের চতুর্থ boundary, কিন্তু সেটা আছে অন্য জায়গায়।
[Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) এই বাছাইয়ের যুক্তি দেয়।
[Chapter ?? — Monorepo](#ch-monorepos) দেখায় task graph আর caching, যা monorepo-কে চালানোর মতো করে।

## Interviewer-রা যা যাচাই করেন

Part-এর মূল লক্ষণটা এখানে তিনটি অভ্যাস হয়ে দেখা দেয়:

- **Enforce কে করছে, তার নাম বলা।** তিনটি layer যে কেউ আঁকতে পারে। পরের প্রশ্ন হলো, component সরাসরি API client import
  করলে কে আটকাবে। উত্তর হতে হবে lint rule বা build graph, code review-এর কোনো প্রথা নয়।
- **ভারী pattern-টা না বলা।** Frontend-এ সবচেয়ে বেশি অপ্রয়োজনে ব্যবহার হওয়া দুটি ধারণা হলো micro-frontend আর clean
  architecture। প্রতিটি কোন সমস্যা মেটায় বলুন, তারপর দেখিয়ে দিন interviewer-এর scenario-তে সেই সমস্যাটা নেই। এটা
  গ্রহণ করার চেয়ে বেশি নম্বর পায়।
- **Migration-এর পথ থাকা।** পুরনো codebase-এ নতুন boundary আনতে হলে ধাপে ধাপে ঢোকার রাস্তা লাগে। "আমরা আবার লিখে ফেলব"
  বললে আলোচনা ওখানেই শেষ।

## পড়ার ক্রম

01 → 02 → 03 → 04। বাকিরা যে শব্দগুলো জানা ধরে নেয়, সেগুলো ঠিক করে দেয় অধ্যায় 01। কোন ভারী pattern বাদ দিতে পারেন,
তাও বলে দেয়। অধ্যায় 04 আলাদা করেও পড়া যায়।

**Interview sprint:** 01, তারপর 02-এর "কখন ব্যবহার করবেন" table, তারপর 04। Senior frontend loop-এ architecture নিয়ে
যা সত্যিই জিজ্ঞেস করা হয়, তা এতেই ঢেকে যায়। আর 04-এর প্রশ্নগুলোর উত্তর বেশিরভাগ candidate-এর কাছেই থাকে না।
