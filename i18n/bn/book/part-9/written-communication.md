---
sourceHash: "23657afb2d3235960005cb53fc29ff80ad043994d71c95e7095eb8ae92f5d009"
title: "লিখিত Communication"
translatedAt: "2026-10-13T03:09:18.517Z"
model: "claude-opus-5-5 (Claude Code)"
---

# লিখিত Communication {#ch-written-communication}

> যে document-গুলো দিয়ে একজন senior engineer-কে বিচার করা হয়, সেগুলো লিখুন — pull request, decision record, runbook, আর সেই note যা time zone পেরিয়ে একটি সিদ্ধান্তের জট খোলে।

**এই অধ্যায়ে:** একটি document কোথায় থাকা উচিত · pull request আর review comment · decision record · runbook · asynchronous-ভাবে সিদ্ধান্ত নেওয়া

## 💡 মূল ধারণা

আপনার কাজের মধ্যে লেখাই একমাত্র অংশ, যা আপনি ঘুমিয়ে থাকলেও কাজ করে যায়। Senior স্তরে আপনার প্রভাবের বেশিরভাগই
এভাবেই পৌঁছায়। একটি design meeting-এ ছয়জনকে রাজি করায়। সেই একই design লিখে রাখলে তা পরের বছর যে team যোগ দেবে,
তাদেরও রাজি করায়।

ব্যর্থতা প্রায় কখনোই লেখার মান নিয়ে নয়। সেটা হলো **লেখাটা ভুল জায়গায় রাখা**: deploy-এর পদ্ধতি chat thread-এ,
একটি সিদ্ধান্ত কারও স্মৃতিতে, একটি API contract wiki-র table-এ।

| বিষয়বস্তু                        | সঠিক জায়গা                        | ❌ ভুল জায়গা              |
| ------------------------------ | --------------------------------- | -------------------------- |
| কীভাবে deploy করতে হয়                  | Repository-তে একটি runbook        | 2022 সালের একটি wiki page      |
| আমরা কেন এই database বেছেছি     | Repository-তে একটি decision record | কারও স্মৃতি          |
| একটি incident-এর timeline           | Post-mortem document           | একটি chat thread              |
| API contract               | OpenAPI spec                   | Wiki-র একটি table          |
| Team-এর নিয়ম আর on-call প্রক্রিয়া | Team handbook                  | মুখে মুখে চলে আসা রীতি           |

> **Technical documentation সেই code-এর সঙ্গেই থাকে, যেটার কথা সে বলে।** আলাদা system-এর একটি page ধীরে ধীরে
> পুরোনো হয়ে যায়, কারণ সেটা update করা একটি আলাদা কাজ, যা কারও মনে থাকে না।

⚠️ Chat-এ দেওয়া একটি উত্তর তাদের কাছে অদৃশ্য, যারা সেখানে ছিল না। একই প্রশ্ন দ্বিতীয়বার এলে উত্তরটা একটি document-এ
রাখুন, আর chat-এ সেটার link দিয়ে reply করুন।

## Pull Request

একটি pull request-এর description একটি deadline-ওয়ালা প্ররোচনামূলক document। Reviewer-এর হাতে পনেরো মিনিট, আর আপনি
তাঁর নিজের কাজের সঙ্গে প্রতিযোগিতা করছেন।

```text
## Summary
Server-render the reporting dashboard. Closes #482.

## Why
Reports take 4–11s to paint client-side; it is the top complaint in
user interviews. First paint should not wait for the dataset.

## Key decision
Streamed SSR over a client-side worker: the worker fixes jank but not
first paint. Trade-off — the reporting service now carries render load.

## Testing
Chrome, Firefox, Safari. Added a streaming integration test.

## Impact
Bundle −140KB · LCP 5.2s → 1.4s on the p75 report

## For reviewers
Is `ReportShell` the right seam, or should the boundary be per-widget?
```

দৈর্ঘ্য পার্থক্য গড়ে না। এই জিনিসগুলো গড়ে: এমন একটি title যা বলে কী বদলেছে, "misc fixes" নয়। **কেন**, সঙ্গে বাদ
দেওয়া বিকল্পটা, diff-কে গদ্যে আবার বলা নয়। যেকোনো UI পরিবর্তনের জন্য আগে ও পরের screenshot। মোটামুটি 400 line-এর
নিচে। আর যে একটি জিনিস আপনি খুঁটিয়ে দেখাতে চান, সেটা, যাতে ঝুঁকি কোথায় তা reviewer-কে আন্দাজ করতে না হয়।

## Review Comment

প্রতিটি comment-এ থাকে একটি severity (এটা কতটা গুরুত্বপূর্ণ), সমস্যাটা, আর একটি পরামর্শ। Severity থাকলে author-রা
একটি বানানের note-কে blocker হিসেবে ধরেন না।

```text
Blocking — SQL injection

User input is interpolated into the query string, so any input can
execute SQL. Use a parameterised query:

    await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

```text
Non-blocking — consider useMemo

This filter runs on every render. Over ~500 items it will jank on
low-end devices. Not blocking at current sizes, but worth a ticket.
```

**Feedback নেওয়াও একই দক্ষতা, শুধু উল্টো দিক থেকে।** তিনটি সাড়াতেই প্রায় সবকিছু হয়ে যায়। মেনে নিন আর বলুন কী
বদলালেন ("ভালো ধরেছেন, এখন parameterise করা")। যুক্তিটা জিজ্ঞেস করুন ("চিন্তাটা কি allocation নিয়ে, নাকি
readability?")। অথবা কারণ দেখিয়ে দ্বিমত করুন, আর আলোচনা করার প্রস্তাব দিন।

⚠️ "এটা ঠিকঠাক কাজ করে" আর "আমার মনে হয় না এটা কোনো সমস্যা" আলোচনা শেষ করে দেয়, মীমাংসা না করেই। হয় আপত্তির
উত্তর দেওয়া হয়, নয়তো code বদলায়। বেরোনোর পথ এই দুটিই।

## Architecture Decision Record

দীর্ঘদিন চলা একটি codebase-এ এটাই সবচেয়ে মূল্যবান document, আর সবচেয়ে অবহেলিত। একটি ADR ছোট, একবার লেখা হয়, আর
**কখনো edit করা হয় না**। সিদ্ধান্ত বদলালে একটি নতুন record সেটার জায়গা নেয় (supersede করে)।

```text
# ADR-014: Server-side rendering for the reporting dashboard

Status: Accepted — 2026-08-14
Deciders: platform team

## Context
Reports take 4–11s to render client-side because the dataset is large
and the filters are combinatorial. Time to first meaningful paint is
the complaint in every user interview.

## Decision
Render report pages on the server and stream the result.

## Consequences
Positive: first paint no longer waits for the dataset; filter state is
shareable as a URL.
Negative: the reporting service now needs capacity for render load.
Accepted risk: streaming makes error handling harder. We accept a
full-page error for now and revisit if it appears in support volume.

## Alternatives considered
Client-side with a worker — rejected; fixes jank, not first paint.
Precomputed reports — rejected; filters are user-defined.
```

মূল্যটা সিদ্ধান্তে নয়। মূল্যটা **প্রেক্ষাপট** আর **বিকল্পগুলোতে**। দুই বছর পরে প্রশ্ন সবসময় একটিই: "ওরা কি X-এর কথা
জানত?" আর একটি ADR ত্রিশ সেকেন্ডে তার উত্তর দেয়। যে team একটি সিদ্ধান্ত নতুন করে ভাবতে পারে, আর যে team শুধু সেটা
উত্তরাধিকার হিসেবে পায়, তাদের পার্থক্য এটাই।

## Runbook

রাত 3টায় এই document-টাই সবচেয়ে জরুরি, আর এটাকে সম্পূর্ণ আলাদা মানদণ্ডে বিচার করা হয়।

| শর্ত                          | কেন                                          |
| ------------------------------------ | -------------------------------------------- |
| হুবহু, copy-paste করা যায় এমন command        | চাপের মধ্যে কারও বানিয়ে নেওয়া উচিত নয়        |
| প্রতিটি action-এর পরে একটি যাচাইয়ের ধাপ | "কীভাবে বুঝব কাজ হয়েছে?"-এর উত্তর দেয়            |
| প্রতিটি action-এর জন্য একটি rollback            | প্রতিটি ধাপ ফিরিয়ে নেওয়া যেতে হবে               |
| একটি "শেষবার test করা হয়েছে" তারিখ                  | আসল runbook-কে কাল্পনিক runbook থেকে আলাদা করে |
| Alert থেকেই সরাসরি link করা          | খুঁজতে হয় না, কয়েক সেকেন্ডে পাওয়া যায়     |

> ⚠️ **Test না করা runbook কোনো runbook না থাকার চেয়েও খারাপ,** কারণ মানুষ সেটার ওপর ভরসা করে। ইচ্ছাকৃতভাবে আপনার
> runbook-গুলো test করুন, আর ওপরে তারিখটা লিখে দিন।

## Asynchronous-ভাবে সিদ্ধান্ত নেওয়া

বেশিরভাগ team একাধিক time zone জুড়ে থাকে, তাই লেখার মান ঠিক করে আপনি কত দ্রুত deliver করবেন। একটি pattern একটি
সিদ্ধান্তকে এক সপ্তাহ আটকে থাকা থেকে বাঁচায়: একটি স্পষ্ট deadline, সঙ্গে একটি ঘোষিত default।

```text
Decision needed by Thursday 17:00 UTC — cache layer for the reporting replica

Context: reporting queries are causing p99 spikes on the primary.

Options
  A) Read replica, ~£380/mo — current load with headroom
  B) Smaller replica, ~£190/mo — about 70% utilised at peak
  C) Serverless tier — variable cost, better for spiky load

Recommendation: B. Reporting load is predictable and we can resize online.

Objections by Thursday 17:00 UTC, otherwise I proceed with B.
```

সিদ্ধান্তের সারকথা আগে রাখুন, তারপর সিদ্ধান্তটা, deadline, আর পাঠকের যে প্রেক্ষাপট জানা নেই সেটা। Direct message-এর
চেয়ে public channel বেছে নিন। DM-এ উত্তর একজনকে একবার সাহায্য করে। Channel-এ সেটা পরে যে-ই খুঁজবে, সবাইকে সাহায্য করে।

একটি বড় প্রস্তাব, যেমন একটি RFC বা design document, একই কাঠামোর বড় রূপ। এতে থাকে একটি সারাংশ, সমস্যাটা,
প্রস্তাবটা, আর বিকল্পগুলো, সঙ্গে প্রত্যেকটি কেন বাদ দেওয়া হলো তার কারণ। তারপর আসে ঝুঁকি আর সেগুলো কমানোর উপায়,
সাফল্যের metric, আর সেই খোলা প্রশ্নগুলো যার উত্তর আপনি সত্যিই চান। বিকল্পের অংশ খালি থাকলে সেটা প্রস্তাব নয়। সেটা
একটি ঘোষণা।

## 🔑 মূল শিক্ষা

- বেশিরভাগ documentation-এর ব্যর্থতা ভুল জায়গায় রাখা, খারাপ লেখা নয়। Technical doc থাকে code-এর সঙ্গে।
- একটি pull request-এর description কেন তা ব্যাখ্যা করে, আর বাদ দেওয়া বিকল্পের নাম বলে।
- প্রতিটি review comment-এ একটি severity থাকে, নইলে author-রা প্রতিটি note-কে blocker ধরে নেন।
- একটি ADR-এর মূল্য তার প্রেক্ষাপট আর বাদ দেওয়া বিকল্পে, সিদ্ধান্তে নয়।
- একটি asynchronous সিদ্ধান্তের জন্য একটি deadline আর একটি ঘোষিত default লাগে, নইলে সেটা এক সপ্তাহ অপেক্ষা করে।

## Interview-এর প্রশ্ন

**Q: কী একটি pull request-কে review করা সহজ করে?**

প্রথমে আকার: মোটামুটি 400 line-এর নিচে, কারণ এর বেশি হলে review-এর মান ভেঙে পড়ে, reviewer যে-ই হোন। তারপর এমন
একটি description, যা reviewer-কে *কেন* জানায় আর যে অংশ নিয়ে আপনি সবচেয়ে কম নিশ্চিত সেটা দেখিয়ে দেয়। কোথায় দেখতে
হবে জানলে reviewer-রা বেশি defect খুঁজে পান, আর সেটা জানানো author-এর কাজ।

**Q: আপনার team-এ কোনো ADR নেই। Process চাপিয়ে না দিয়ে কীভাবে চালু করবেন?**

একটি লিখুন, পরের যে সিদ্ধান্ত আসবে তার জন্য, আর যে pull request সেটা implement করে সেখান থেকে link দিন। কেউ একটি
template গ্রহণ করে না। মানুষ গ্রহণ করে এমন জিনিস, যা তাদের একটি প্রশ্নের উত্তর দিয়েছে। দ্বিতীয়বার কেউ "এটা এরকম
কেন?" জিজ্ঞেস করলে আর আপনি একটি link paste করলে, যুক্তি না দিয়েই আপনার যুক্তি প্রতিষ্ঠিত হয়ে যায়।

**Q: কখন লিখে রাখাটা ভুল সিদ্ধান্ত?**

যখন সিদ্ধান্তটা সস্তা আর ফিরিয়ে নেওয়া যায়। একটি document-এর রক্ষণাবেক্ষণের খরচ আছে, আর একটি পুরোনো document
কোনো document না থাকার চেয়েও খারাপ। যে বাছাই এক বিকেলেই খুশিমনে আবার করা যায়, তার record লাগে না। Record রাখুন সেই
সিদ্ধান্তগুলোর জন্য, যেগুলো নতুন করে ভাবা ব্যয়বহুল।

**Q: লিখিতভাবে একজন reviewer-এর সঙ্গে দ্বিমত কীভাবে করবেন, যাতে ব্যাপারটা বেড়ে না যায়?**

যুক্তি দিন, বিকল্পটার খরচ কী তা বলুন, আর কথা বলার প্রস্তাব দিন। প্রস্তাবটাই গুরুত্বপূর্ণ। এটা বোঝায় যে আপনি শেষ
comment-টা নিজের করে জিততে চাইছেন না। লিখিতভাবে দুই round-এর বেশি লাগলে মাধ্যমটাই ভুল, আর উত্তর হলো পনেরো মিনিটের
একটি call।

## এরপর কী পড়বেন

- [Chapter ?? — ব্যাখ্যা করা ও জোরে জোরে ভাবা](#ch-thinking-aloud) — একই দক্ষতার মৌখিক রূপ
- [Chapter ?? — কাজের ধরন ও Engineering Culture](#ch-engineering-culture) — যে review আর on-call চর্চার কাজে এই document-গুলো লাগে
- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — pull request ঘিরে খুঁটিনাটি প্রক্রিয়া
