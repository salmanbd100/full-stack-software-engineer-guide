---
sourceHash: "6f7aff1112c380ac7910912e79bfd6a1db0feb5921052c568ea6708e049c0295"
title: "Frontend Architecture"
translatedAt: "2026-10-12T12:16:50.291Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Frontend Architecture

Part III হলো একটি frontend কীভাবে বানাবেন। এই section হলো, frontend যখন বড় আর পুরোনো, আর এতে এত মানুষ কাজ করেন যে
একটি standup-এ আঁটে না, তখন কী বদলায়। এখানকার প্রতিটি অধ্যায় একটি **সীমানা** নিয়ে। সেটা layer-গুলোর মাঝে, team-গুলোর
মাঝে, বা shared UI আর তা ব্যবহার করা feature-গুলোর মাঝে বসে। শেষটি বসে একটি assistant যা তৈরি করে আর যা codebase-এ
ঢোকে, তার মাঝে। প্রতিটি অধ্যায় এটাও জিজ্ঞেস করে, সীমানাটি একবার তৈরি হলে তা maintain করার খরচ কত।

এই অধ্যায়গুলো performance, security আর testing-এর পাশে বসে, কারণ চারটিই একই প্রশ্নের উত্তর দেয়: বড় পরিসরে কী ভাঙে,
আর ভাঙার আগে আপনি কী ব্যবস্থা নেন? যে অধ্যায়গুলো codebase সাজানো নিয়ে নয়, **একটি design round চালানো** নিয়ে, সেগুলো
Part VI-তে।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Frontend Architecture Pattern](#ch-frontend-architecture-patterns) | সীমানাগুলো কোথায় যায়, আর কোনগুলো বলবৎ করার যোগ্য? |
| 02 | [Micro-Frontend](#ch-micro-frontends) | Deploy-এর স্বাধীনতা কখন coordination-এর খরচের যোগ্য? |
| 03 | [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale) | চল্লিশটি team কীভাবে component share করে, আর পাঁচ বছরের পুরোনো একটি frontend কীভাবে upgrade করার মতো থাকে? |
| 04 | [AI-এর লেখা Code Review](#ch-reviewing-ai-generated-code) | Generate করা code-এ এমন কোন ত্রুটি থাকে, যা মানুষের লেখা code-এ থাকে না? |

Monorepo বনাম polyrepo-র সিদ্ধান্ত এই set-এর চতুর্থ সীমানা, কিন্তু এর জায়গা অন্যখানে।
[Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) এই বাছাই নিয়ে যুক্তি দেয়।
[Chapter ?? — Monorepo](#ch-monorepos) সেই task graph আর caching দেখায়, যেগুলো একটি monorepo-কে কাজের উপযোগী করে।

## Interviewer-রা যা যাচাই করেন

Part-স্তরের signal এখানে তিনটি অভ্যাস হিসেবে দেখা দেয়:

- **বলবৎ করার mechanism-এর নাম বলা।** তিনটি layer যে কেউ আঁকতে পারে। পরের প্রশ্নটা হলো, একটি component-কে সরাসরি
  API client import করা থেকে কী আটকায়। উত্তর হতে হবে একটি lint rule বা একটি build graph, code review-এর কোনো
  convention নয়।
- **ভারী pattern-টি ফিরিয়ে দেওয়া।** Micro-frontend আর clean architecture frontend কাজে সবচেয়ে বেশি অতিরিক্ত প্রয়োগ
  হওয়া দুটো ধারণা। প্রত্যেকটি কোন সমস্যা সমাধান করে, বলুন, তারপর নিশ্চিত করুন interviewer-এর scenario-তে সেই সমস্যা
  নেই। এগুলো গ্রহণ করার চেয়ে এতে বেশি নম্বর পাওয়া যায়।
- **একটি migration path থাকা।** বিদ্যমান একটি codebase-এ আনা সীমানার জন্য ধাপে ধাপে ঢোকার একটি পথ লাগে। "আমরা এটা
  নতুন করে লিখব" — এই উত্তরেই আলোচনা শেষ হয়ে যায়।

## পড়ার ক্রম

01 → 02 → 03 → 04। অধ্যায় 01 সেই শব্দভান্ডার ঠিক করে, যেটা বাকিগুলো ধরে নেয়। এটা এটাও বলে, ভারী pattern-গুলোর কোনগুলো
আপনি বাদ দিতে পারেন। অধ্যায় 04 একাই পড়া যায়।

**Interview sprint:** 01, তারপর 02-এর "কখন ব্যবহার করবেন" table, তারপর 04। একটি senior frontend loop আসলে যে
architecture-এর প্রশ্ন করে, এগুলো সেগুলো cover করে। 04-এর প্রশ্নগুলোর উত্তর বেশিরভাগ candidate-এর কাছে থাকে না।
