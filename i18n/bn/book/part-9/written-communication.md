---
sourceHash: "23657afb2d3235960005cb53fc29ff80ad043994d71c95e7095eb8ae92f5d009"
title: "লিখিত Communication"
translatedAt: "2026-10-19T10:29:27.243Z"
model: "claude-opus-5-5 (Claude Code)"
---

# লিখিত Communication {#ch-written-communication}

> যে document-গুলো দিয়ে একজন senior engineer-কে বিচার করা হয়, সেগুলো লিখুন: pull request, decision record, runbook, আর সেই note, যা ভিন্ন time zone-এর মধ্যে আটকে থাকা সিদ্ধান্তকে এগিয়ে দেয়।

**এই অধ্যায়ে:** কোন document কোথায় থাকবে · pull request আর review comment · decision record · runbook · async-এ সিদ্ধান্ত নেওয়া

## 💡 মূল ধারণা

আপনার কাজের মধ্যে শুধু লেখাই আপনি ঘুমিয়ে থাকার সময়ও কাজ করে যায়। Senior স্তরে আপনার বেশির ভাগ প্রভাব আসে এভাবেই। Meeting-এ
যে design মানুষকে রাজি করায়, সেটা রাজি করায় ছয়জনকে। একই design লিখে রাখলে রাজি করায় সেই team-কেও, যারা আগামী বছর যোগ দেবে।

ব্যর্থতা প্রায় কখনোই লেখার মানের কারণে হয় না। হয় **বিষয়বস্তু ভুল জায়গায় রাখায়**: deploy-এর পদ্ধতি chat thread-এ, সিদ্ধান্ত
কারও স্মৃতিতে, API contract wiki-র table-এ।

| বিষয়বস্তু                        | ঠিক জায়গা                        | ❌ ভুল জায়গা              |
| ------------------------------ | --------------------------------- | -------------------------- |
| কীভাবে deploy করবেন                  | Repository-তে runbook        | 2022 সালের wiki page      |
| এই database কেন বেছেছি     | Repository-তে decision record | কারও স্মৃতি          |
| Incident-এর সময়রেখা           | Post-mortem document           | Chat thread              |
| API contract               | OpenAPI spec                   | Wiki-র table            |
| Team-এর রীতি আর on-call process | Team handbook                  | মুখে মুখে চলে আসা রীতি           |

> **Technical documentation থাকে সেই code-এর সঙ্গে, যার কথা বলে।** আলাদা system-এর page ধীরে ধীরে বাস্তব থেকে সরে যায়,
> কারণ সেটা হালনাগাদ করা আলাদা একটি কাজ, যা কারও মনে থাকে না।

⚠️ Chat-এ দেওয়া উত্তর তাঁদের কারও চোখে পড়ে না, যাঁরা তখন ছিলেন না। একই প্রশ্ন দ্বিতীয়বার এলে উত্তরটা document-এ লিখুন, আর
chat-এ তার link দিয়ে জবাব দিন।

## Pull Request

Pull request-এর description হলো deadline-ওয়ালা একটি রাজি করানোর document। Reviewer-এর হাতে পনেরো মিনিট, আর আপনাকে
পাল্লা দিতে হচ্ছে তাঁর নিজের কাজের সঙ্গে।

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

তফাতটা দৈর্ঘ্যে নয়। তফাত গড়ে এই জিনিসগুলো: এমন title, যা বলে কী বদলাল, "misc fixes" নয়। **কেন**, বাদ দেওয়া বিকল্পসহ,
diff-টাকেই আবার গদ্যে লেখা নয়। UI বদলালে আগে-পরের screenshot। মোটামুটি 400 line-এর কম। আর যে একটি জিনিস আপনি খুঁটিয়ে
দেখাতে চান, সেটা, যাতে reviewer-কে আন্দাজ করতে না হয় ঝুঁকি কোথায়।

## Review Comment

প্রতিটি comment-এ থাকে একটি severity (ব্যাপারটা কতটা গুরুত্বপূর্ণ), সমস্যাটা, আর একটি পরামর্শ। Severity থাকলে author বানানের
ভুল নিয়ে একটি note-কে merge আটকানোর কারণ ভাবেন না।

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

**Feedback নেওয়াও একই দক্ষতা, শুধু উল্টো দিক থেকে।** তিন রকম সাড়াতেই প্রায় সব সামলানো যায়। মেনে নিন আর কী বদলালেন বলুন
("ভালো ধরেছেন, এখন parameterised")। যুক্তিটা জানতে চান ("চিন্তাটা কি allocation নিয়ে, নাকি readability নিয়ে?")। নয়তো কারণ
দেখিয়ে দ্বিমত করুন, আর সামনাসামনি আলাপের প্রস্তাব দিন।

⚠️ "এটা তো ঠিকঠাক কাজ করছে" আর "আমার মনে হয় না এটা কোনো সমস্যা", এ দুটি কথা আলাপ শেষ করে দেয়, মীমাংসা না করেই। হয়
আপত্তির জবাব দেওয়া হয়, নয় code বদলায়। বেরোনোর পথ এই দুটিই।

## Architecture Decision Record

দীর্ঘদিন বেঁচে থাকা codebase-এ এটাই সবচেয়ে দামি document, আর সবচেয়ে অবহেলিতও। ADR ছোট, একবার লেখা হয়, আর **কখনো edit
করা হয় না**। সিদ্ধান্ত বদলালে নতুন একটি record পুরনোটার জায়গা নেয় (supersede করে)।

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

দাম সিদ্ধান্তে নয়, দাম **প্রেক্ষাপট** আর **বিকল্পগুলোতে**। দুই বছর পরে প্রশ্নটা সবসময় হয়, "ওঁরা কি X-এর কথা জানতেন?" আর ADR
এর উত্তর দেয় ত্রিশ সেকেন্ডে। এখানেই তফাত সেই team-এর, যারা কোনো সিদ্ধান্ত নতুন করে ভেবে দেখতে পারে, আর সেই team-এর, যারা
শুধু উত্তরাধিকারসূত্রে বয়ে বেড়ায়।

## Runbook

রাত তিনটায় এই document-টাই সবচেয়ে জরুরি, আর এর বিচারের মাপকাঠি পুরোপুরি আলাদা।

| শর্ত                          | কেন                                          |
| ------------------------------------ | -------------------------------------------- |
| হুবহু, copy-paste করা যায় এমন command        | চাপের মধ্যে কারও তাৎক্ষণিক বুদ্ধি খাটাতে হওয়া উচিত নয়        |
| প্রতিটি কাজের পরে যাচাইয়ের ধাপ | "কাজ করল কি না, বুঝব কীভাবে?"-এর উত্তর দেয়            |
| প্রতিটি কাজের জন্য rollback            | প্রতিটি ধাপ ফেরানো যেতে হবে                            |
| "শেষ কবে test করা হয়েছে", তার তারিখ                  | সত্যিকারের runbook-কে শুধু কাগজের runbook থেকে আলাদা করে |
| Alert থেকেই link করা          | খুঁজতে হয় না, কয়েক সেকেন্ডেই পাওয়া যায়     |

> ⚠️ **Test না করা runbook কোনো runbook না থাকার চেয়েও খারাপ,** কারণ মানুষ সেটায় ভরসা করেন। ইচ্ছে করে runbook test করুন,
> আর তারিখটা একদম ওপরে লিখে রাখুন।

## Async-এ সিদ্ধান্ত নেওয়া

বেশির ভাগ team কয়েকটি time zone জুড়ে ছড়ানো, তাই লেখার মানই ঠিক করে আপনি কত দ্রুত deliver করতে পারবেন। একটি pattern
কোনো সিদ্ধান্তকে এক সপ্তাহ ঝুলে থাকা থেকে বাঁচায়: স্পষ্ট deadline, সঙ্গে আগে থেকে বলে দেওয়া default।

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

আগে উপসংহার, তারপর সিদ্ধান্ত, deadline, আর পাঠকের যে প্রেক্ষাপট জানা নেই সেটা। Direct message-এর বদলে public channel বেছে
নিন। DM-এ উত্তরটা একজনকে একবার সাহায্য করে। Channel-এ সাহায্য করে পরে যে-ই খুঁজবেন, তাঁদের সবাইকে।

লম্বা প্রস্তাব, যেমন RFC বা design document, একই গড়নের বড় রূপ। এতে থাকে সারসংক্ষেপ, সমস্যা, প্রস্তাব, আর বিকল্পগুলো,
প্রতিটি কেন বাদ গেল তার কারণসহ। তারপর আসে ঝুঁকি আর সেগুলো সামলানোর উপায়, সাফল্যের metric, আর যে খোলা প্রশ্নগুলোর উত্তর
আপনি সত্যিই চান। বিকল্পের অংশ ফাঁকা থাকলে সেটা প্রস্তাব নয়, ঘোষণা।

## 🔑 মূল শিক্ষা

- Documentation-এর বেশির ভাগ ব্যর্থতা ভুল জায়গার কারণে, খারাপ লেখার কারণে নয়। Technical doc থাকে code-এর সঙ্গে।
- Pull request-এর description বলে কেন, আর কোন বিকল্প বাদ দিয়েছেন তার নাম বলে।
- প্রতিটি review comment-এ severity থাকে, নইলে author প্রতিটি note-কেই merge আটকানোর কারণ ধরে নেন।
- ADR-এর দাম তার প্রেক্ষাপট আর বাদ দেওয়া বিকল্পে, সিদ্ধান্তে নয়।
- Async সিদ্ধান্তের জন্য লাগে deadline আর আগে থেকে বলা default, নইলে সেটা এক সপ্তাহ ঝুলে থাকে।

## Interview-এর প্রশ্ন

**Q: কী থাকলে একটি pull request review করা সহজ হয়?**

প্রথমে আকার: মোটামুটি 400 line-এর কম, কারণ তার বেশি হলে review-এর মান ভেঙে পড়ে, reviewer যিনিই হোন। তারপর এমন description,
যা reviewer-কে *কেন*-টা বলে, আর দেখিয়ে দেয় কোন অংশ নিয়ে আপনি সবচেয়ে কম নিশ্চিত। কোথায় তাকাতে হবে জানা থাকলে reviewer
বেশি ত্রুটি খুঁজে পান, আর সেটা জানানো author-এর কাজ।

**Q: আপনার team-এ কোনো ADR নেই। Process চাপিয়ে না দিয়ে কীভাবে চালু করবেন?**

পরের যে সিদ্ধান্তটা আসবে, তার জন্য একটি লিখুন, আর যে pull request সেটা বাস্তবায়ন করে, সেখান থেকে link দিন। Template কেউ
গ্রহণ করে না। মানুষ গ্রহণ করে সেই জিনিস, যা তাদের কোনো প্রশ্নের উত্তর দিয়েছে। দ্বিতীয়বার কেউ "এটা এরকম কেন?" জিজ্ঞেস করলে
আর আপনি একটি link paste করলে, তর্কটা না করেই আপনি জিতে গেছেন।

**Q: কখন লিখে রাখাটাই ভুল সিদ্ধান্ত?**

যখন সিদ্ধান্তটা সস্তা আর ফেরানো যায়। Document-এর রক্ষণাবেক্ষণের খরচ আছে, আর পুরনো হয়ে যাওয়া document না থাকার চেয়েও খারাপ।
যে বাছাই আপনি এক বিকেলেই খুশি মনে আবার করতে পারেন, তার record লাগে না। Record রাখুন সেই সিদ্ধান্তের জন্য, যা নতুন করে ভাবা
ব্যয়বহুল।

**Q: লিখিতভাবে reviewer-এর সঙ্গে দ্বিমত করবেন কীভাবে, যাতে ব্যাপারটা বেড়ে না যায়?**

যুক্তিটা দিন, বিকল্পের খরচ কী তা বলুন, আর আলাপের প্রস্তাব দিন। প্রস্তাবটা জরুরি। এতে বোঝা যায়, শেষ comment-টা নিজের
করে জিততে চাইছেন না। লিখে লিখে দুই দফার বেশি গড়ালে মাধ্যমটাই ভুল, তখন উত্তর হলো পনেরো মিনিটের একটি call।

## এরপর কী পড়বেন

- [Chapter ?? — ব্যাখ্যা করা ও জোরে জোরে ভাবা](#ch-thinking-aloud) — একই দক্ষতার মুখের রূপ
- [Chapter ?? — কাজের ধরন ও Engineering Culture](#ch-engineering-culture) — review আর on-call-এর যে অভ্যাসের জন্য এই document-গুলো
- [Chapter ?? — Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) — pull request ঘিরে খুঁটিনাটি কলকবজা
