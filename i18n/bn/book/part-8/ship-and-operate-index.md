---
sourceHash: "6d3c23e3c3223b7e942a5ee2621cb0a2cd523bb071ba85364a0a280991795583"
title: "Part VIII — Ship ও Operate"
translatedAt: "2026-10-13T03:03:40.170Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VIII — Ship ও Operate

এখানকার সবকিছু ঘটে code লেখা হয়ে যাওয়ার পরে। আপনি ভয় ছাড়াই branch করতে আর হারানো কাজ ফিরিয়ে আনতে শিখবেন,
আর pipeline যে image ship করে সেটা build করতে শিখবেন। Credential-কে build-এর বাইরে রাখবেন, একটি live service-এর
পাঠানো সংকেত পড়বেন, আর release গোলমাল করলে সেটা ফিরিয়ে আনবেন। একজন frontend-heavy engineer ship করেন, নজর রাখেন
আর roll back করেন। তিনি platform চালান না। তাই `BOOK-SPEC.md` § 6 অনুযায়ী cluster, Terraform আর Linux
administration এই বইয়ের বিষয় নয়।

## Section-গুলো

| Section                                        | অধ্যায় | কী নিয়ে                                                          |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------- |
| [Git দিয়ে Version Control](#ch-ship-git-index) | 2      | Object model, recovery, branching, monorepo নাকি polyrepo          |
| [CI/CD](#ch-ship-cicd-index)                   | 3      | Pipeline design, container image, GitHub Actions আর তার security    |
| [Observability](#ch-ship-observability-index)  | 2      | SLO, metrics আর cardinality, যে alert-এর জন্য মানুষকে ঘুম থেকে তোলা যায় |
| [Cloud-এর প্রয়োজনীয় বিষয়](#ch-ship-cloud-index) | 2      | Region, identity, object storage আর CDN, serverless                 |
| [Deployment](#ch-ship-deployment-index)        | 2      | Immutable artefact, preview, strategy, rollback, feature flag       |

## Interviewer-রা যা যাচাই করেন

এই part-এর senior সংকেত হলো **change-এর দায়িত্ব production পর্যন্ত নেওয়া, ফেরার পথসহ।** দুটি প্রশ্ন প্রতিটি
section জুড়ে চলে, আর প্রতিটি section index নিজের প্রশ্ন যোগ করে।

- **যেখানে log in করতে পারেন না, সেটা debug করতে পারেন?** Shell ছাড়া একটি distroless image, একটি cold start হওয়া
  function, একটি average-এর পেছনে লুকিয়ে থাকা p99। একটি system চালানো আর বানানো দুটি আলাদা দক্ষতা।
- **Credential কোথা থেকে আসে?** Repository secret-এ রাখা দীর্ঘমেয়াদি cloud key এখনো সবচেয়ে সাধারণ finding।
  প্রত্যাশিত উত্তর হলো স্বল্পমেয়াদি OIDC token।

**একই প্রশ্নে mid আর senior:**

| প্রশ্ন | Mid উত্তর | Senior উত্তর |
| ----- | ---------- | ------------- |
| "আপনি কীভাবে deploy করেন?" | "Pipeline প্রতিটি environment-এর জন্য build আর deploy করে" | "একবার build করুন, artefact-টি promote করুন — প্রতিটি stage-এ নতুন build মানে staging অন্য কিছু test করেছে" |
| "আপনি কীভাবে roll back করেন?" | "আমরা শুধু deploy-টি roll back করি" | "Code roll back হয়; একটি drop করা column, consume হয়ে যাওয়া message আর পাঠানো email হয় না। আমাদের এর কোনগুলো আছে, সেটা এই" |
| "Production-এ কিছু একটি ভেঙেছে" | "আমি log দেখব" | "আগে route অনুযায়ী p99, কারণ average এটা লুকিয়ে রাখে — তারপর slow path-এর trace, তারপর log" |

## পড়ার ক্রম

Git, তারপর CI/CD, তারপর Deployment, এই ক্রমে। প্রতিটি আগেরটির শব্দ ব্যবহার করে। আর
[Chapter ?? — Platform Deploy ও Preview Environment](#ch-platform-deploys)-এর immutable-artefact model (build-এর পরে
artefact কখনো বদলায় না) থেকেই rollback আর feature flag-এর মানে বোঝা যায়। Observability আর Cloud আলাদাভাবে দাঁড়িয়ে
থাকে, যেকোনো জায়গায় পড়া যায়।

**Interview sprint:**

- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow)
- [Chapter ?? — Container Image: Build ও Hardening](#ch-docker-fundamentals)
- [Chapter ?? — GitHub Actions ও Pipeline Security](#ch-github-actions)
- [Chapter ?? — Platform Deploy ও Preview Environment](#ch-platform-deploys)
- [Chapter ?? — Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies)
- [Chapter ?? — Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)
- [Chapter ?? — Cloud-এর মূল কথা, Storage ও Delivery](#ch-cloud-fundamentals)

> ⚠️ **Terraform, Linux administration, Kubernetes operations আর AWS-এর গভীর সফর এই বইয়ের বিষয় নয়।**
> একজন frontend-heavy engineer ship করেন, নজর রাখেন আর roll back করেন; ওগুলো platform team-এর জন্য লেখা বইয়ের
> বিষয়।
