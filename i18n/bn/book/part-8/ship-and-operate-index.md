---
sourceHash: "6d3c23e3c3223b7e942a5ee2621cb0a2cd523bb071ba85364a0a280991795583"
title: "Part VIII — Ship ও Operate"
translatedAt: "2026-10-19T07:53:15.451Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VIII — Ship ও Operate

এই part-এর সবকিছু ঘটে code লেখা শেষ হওয়ার পরে। আপনি শিখবেন ভয় না পেয়ে branch করতে আর হারানো কাজ ফিরিয়ে আনতে।
শিখবেন pipeline যে image ship করে, সেটা কীভাবে বানাতে হয়। Build-এর ভেতরে credential রাখবেন না। চালু service যে
signal পাঠায়, সেটা পড়তে পারবেন। আর release-এ গোলমাল হলে আগের অবস্থায় ফিরিয়ে আনতে পারবেন। Frontend-heavy engineer
ship করেন, নজর রাখেন, দরকার হলে roll back করেন। Platform তিনি চালান না। তাই cluster, Terraform আর Linux administration
এই বইয়ে নেই, `BOOK-SPEC.md` § 6 অনুযায়ী।

## অংশগুলো

| অংশ | অধ্যায় | কী নিয়ে |
| --- | ------ | ------- |
| [Git দিয়ে Version Control](#ch-ship-git-index) | 2 | Object model, recovery, branching, monorepo না polyrepo |
| [CI/CD](#ch-ship-cicd-index) | 3 | Pipeline design, container image, GitHub Actions আর তার security |
| [Observability](#ch-ship-observability-index) | 2 | SLO, metrics আর cardinality, কোন alert-এর জন্য মানুষকে ঘুম থেকে তোলা চলে |
| [Cloud-এর প্রয়োজনীয় বিষয়](#ch-ship-cloud-index) | 2 | Region, identity, object storage আর CDN, serverless |
| [Deployment](#ch-ship-deployment-index) | 2 | Immutable artefact, preview, deploy strategy, rollback, feature flag |

## Interviewer-রা যা যাচাই করেন

এই part-এ senior হওয়ার লক্ষণ হলো **change-টা production পর্যন্ত নিজের দায়িত্বে নেওয়া, ফেরার পথসহ।** প্রতিটি অংশ
জুড়ে দুটি প্রশ্ন ঘুরে ফিরে আসে। প্রতিটি অংশের index নিজের প্রশ্নও যোগ করে।

- **যে জায়গায় log in করতে পারেন না, সেখানে debug করবেন কীভাবে?** Shell ছাড়া distroless image, cold start হওয়া
  function, average-এর আড়ালে লুকানো p99। System চালানো আর system বানানো দুটি আলাদা দক্ষতা।
- **Credential আসে কোথা থেকে?** Repository secret-এ রাখা দীর্ঘমেয়াদি cloud key এখনো সবচেয়ে বেশি ধরা পড়া সমস্যা।
  প্রত্যাশিত উত্তর হলো স্বল্পমেয়াদি OIDC token।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ----------- | -------------- |
| "Deploy করেন কীভাবে?" | "Pipeline প্রতিটি environment-এর জন্য build করে deploy করে" | "একবার build করুন, তারপর সেই artefact-টাই promote করুন। প্রতিটি stage-এ নতুন build মানে staging অন্য জিনিস test করেছে" |
| "Roll back করেন কীভাবে?" | "Deploy-টা roll back করে দিই" | "Code roll back হয়। কিন্তু drop করা column, consume হয়ে যাওয়া message আর পাঠানো email ফেরে না। আমাদের system-এ এর কোনগুলো আছে, সেটা বলছি" |
| "Production-এ কিছু একটা ভেঙেছে" | "Log দেখব" | "আগে route ধরে p99 দেখব, কারণ average এটা লুকিয়ে ফেলে। তারপর ধীর path-এর trace, তারপর log" |

## পড়ার ক্রম

প্রথমে Git, তারপর CI/CD, তারপর Deployment, এই ক্রমেই। প্রতিটি অংশ আগেরটার শব্দ ব্যবহার করে। আর immutable artefact-এর
model (build-এর পরে artefact আর কখনো বদলানো হয় না) আছে
[Chapter ?? — Platform Deploy ও Preview Environment](#ch-platform-deploys)-এ। এই model বুঝলেই rollback আর feature
flag-এর যুক্তি পরিষ্কার হয়। Observability আর Cloud নিজের পায়ে দাঁড়ানো, যেকোনো সময় পড়া যায়।

**Interview sprint:**

- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow)
- [Chapter ?? — Container Image: Build ও Hardening](#ch-docker-fundamentals)
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions)
- [Chapter ?? — Platform Deploy ও Preview Environment](#ch-platform-deploys)
- [Chapter ?? — Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies)
- [Chapter ?? — Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)
- [Chapter ?? — Cloud-এর মূল কথা, Storage ও Delivery](#ch-cloud-fundamentals)

> ⚠️ **Terraform, Linux administration, Kubernetes operations আর AWS-এর গভীর আলোচনা এই বইয়ের বিষয় নয়।**
> Frontend-heavy engineer ship করেন, নজর রাখেন আর roll back করেন। ওগুলো platform team-এর জন্য লেখা বইয়ের কাজ।
