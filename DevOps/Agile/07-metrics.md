---
title: Metrics & KPIs
part: 9
chapter: 0
slug: metrics
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-28
tags: [devops, agile, metrics]
in_book: true
---

# Metrics & KPIs

DORA metrics are the industry standard for measuring delivery performance, and they appear in almost every senior DevOps interview. The important part is knowing what they measure, what they miss, and how they get abused.

## The Four DORA Metrics

| Metric | Measures | Type |
|--------|----------|------|
| **Deployment frequency** | How often you ship to production | Speed |
| **Lead time for changes** | Commit → running in production | Speed |
| **Change failure rate** | % of deploys causing degradation | Stability |
| **Time to restore service** | How long to recover | Stability |

**Performance bands:**

| | Elite | High | Medium | Low |
|---|-------|------|--------|-----|
| **Deployment frequency** | On demand | Daily–weekly | Weekly–monthly | Monthly+ |
| **Lead time** | Under 1 hour | 1 day–1 week | 1 week–1 month | 1+ month |
| **Change failure rate** | Under 15% | Under 20% | Under 30% | Over 30% |
| **Time to restore** | Under 1 hour | Under 1 day | Under 1 week | Over 1 week |

> The central research finding: **speed and stability are not a trade-off.** Elite performers score better on all four. Small, frequent changes are easier to test, review, and roll back — so shipping more often makes you more stable, not less.

✨ **A fifth metric was added later: reliability** — how well the service meets user expectations, which in practice means SLO attainment. Mentioning it signals current knowledge.

## Reading the Metrics Together

Any single metric in isolation is misleading. Read them in pairs.

| Pattern | Diagnosis |
|---------|-----------|
| High frequency, high failure rate | 🔴 Shipping fast without adequate verification |
| Low frequency, low failure rate | ⚠️ Looks safe; usually means slow feedback and painful releases |
| Low lead time, high restore time | No rollback capability |
| High frequency, low failure, high restore time | Observability gap — you cannot find the problem |
| ✅ All four good | Genuine capability |

⚠️ **Low deployment frequency with a low failure rate is the pattern that fools people.** It usually reflects a heavyweight approval process rather than quality: releases are rare, so each is enormous, and when one fails the impact is severe — the failure *rate* just looks fine because the denominator is tiny.

## Measuring Them Honestly

Definitions matter more than dashboards.

| Metric | Measure From | Common Cheat |
|--------|-------------|-------------|
| **Deployment frequency** | Production deploys only | ⚠️ Counting staging deploys |
| **Lead time** | ✅ First commit → serving traffic | Measuring PR-open → merge |
| **Change failure rate** | Deploys needing a fix, rollback, or patch | Only counting declared incidents |
| **Time to restore** | ✅ Detection → user impact resolved | Measuring until the fix is merged |

🔴 **Lead time is the most commonly gamed.** Measuring from pull request open to merge excludes the two slowest parts: how long the work waited before starting, and how long the merged change waited to be deployed. Measure commit to serving traffic, or the number is meaningless.

```
Honest lead time:

first commit ──► PR opened ──► merged ──► deployed ──► serving traffic
├──────────────────── this whole span ────────────────────────┤

Gamed lead time:
             ├─ this bit only ─┤
```

## The Metrics That Get Misused

| Metric | Legitimate Use | ❌ Abuse |
|--------|---------------|---------|
| **Velocity** | Team-internal capacity planning | Comparing teams; performance reviews |
| **Lines of code** | ❌ None | Any use |
| **Commit count** | ❌ None | "Productivity" |
| **PRs merged** | Rough flow signal | Individual ranking |
| **Story points** | Relative sizing within a team | Converting to hours |
| **Code coverage** | Finding untested areas | ✅ A target — produces worthless tests |

🔴 **Goodhart's Law:** when a measure becomes a target, it stops being a good measure.

```
Set a code coverage target of 90%
     ↓
Engineers write tests that execute code and assert nothing
     ↓
Coverage: 91% ✅   Actual defect detection: unchanged
```

⚠️ **Never attach delivery metrics to individual performance.** Cycle time targets produce artificially split tickets. Deployment frequency targets produce trivial deploys. Worse, they punish the engineer who spends a day helping a colleague — which is exactly the behaviour you need.

> DORA metrics measure **the system**, not the people in it. A low score is a statement about the pipeline, the architecture, and the approval process.

## SLIs, SLOs, and Error Budgets

The operational counterpart to DORA. See [Observability Fundamentals](../../ShipAndOperate/Observability/01-fundamentals.md) for depth.

| Term | Definition |
|------|-----------|
| **SLI** | The measurement — "% of requests served under 300ms" |
| **SLO** | Your internal target — "99.9% over 30 days" |
| **SLA** | The contractual promise, with penalties — always looser than the SLO |
| **Error budget** | 100% − SLO. The allowed failure |

```
SLO 99.9% over 30 days
→ error budget = 0.1% = ~43 minutes of failure per month

Budget remaining → ✅ ship features, take risks
Budget exhausted → 🔴 freeze features, work on reliability
```

✅ **The error budget is the mechanism that turns reliability from an argument into a rule.** It gives the team an agreed, data-driven way to decide between shipping and stabilizing, instead of relitigating it every sprint.

⚠️ Always set the SLO tighter than the SLA. If they are equal, breaching your internal target means you have already breached the contract.

## Metrics Worth Tracking Beyond DORA

| Metric | Reveals |
|--------|---------|
| **Cycle time distribution (p50/p85)** | ✅ Forecasting, and the long tail |
| **% of time on toil** | Automation opportunity (target: under 50%) |
| **% of capacity on unplanned work** | Interrupt load, planning realism |
| **Pipeline duration and flakiness** | Whether developers trust and use it |
| **Time to onboard a new engineer** | Documentation and paved-road quality |
| **Cost per unit of business value** | Whether the architecture scales economically |
| **Mean time to remediate by severity** | Whether security findings get fixed |
| **Alert precision** | Whether pages are worth waking for |

✨ **Cost per unit of business value** — per order, per active user, per tenant — is the metric that impresses in senior interviews. A flat number as you grow proves the architecture scales economically; a rising one proves it does not, whatever discounts you negotiated.

## Improving a Bad Score

The interview question is usually "our lead time is three weeks — what do you do?"

**Find the constraint first, do not guess:**

```
Map the actual value stream and measure each wait:

  commit → PR opened          : 2 days   (batching work)
  PR opened → first review    : 4 days   🔴 the constraint
  review → approved           : 1 day
  approved → merged           : 1 hour
  merged → deployed to staging: 3 days   🔴 second constraint
  staging → CAB approval      : 5 days   🔴 third constraint
  approved → production       : 2 hours
```

⚠️ In this example, optimizing the build pipeline would achieve nothing — almost all the time is queueing, not working. This is why value stream mapping precedes tooling work.

| Constraint | Fix |
|-----------|-----|
| Waiting for review | Smaller PRs, review SLA, review as a first-class task |
| Waiting for a manual test cycle | Automate the regression suite |
| Waiting for an approval board | ✅ Replace with automated gates and progressive delivery |
| Waiting for a release window | Decouple deploy from release with flags |
| Waiting for another team | Self-service platform capability |

> Almost always, the answer is queue time rather than work time. Optimizing the parts where people are actively working is optimizing the wrong 10%.

## Interview Q&A

**Q: What are the DORA metrics and why do they matter?**

Deployment frequency and lead time for changes measure speed; change failure rate and time to restore service measure stability. A fifth, reliability, was added later and in practice means SLO attainment. They matter because they are outcome-based — they measure whether the delivery system actually works, unlike vanity metrics such as commit counts or story points, which measure activity. The most important finding from the research is that speed and stability correlate positively rather than trading off: teams that deploy more frequently also have lower change failure rates, because frequent deployment forces small batches and small changes are easier to review, test, and roll back. That single insight is what justifies investing in delivery capability rather than in more approval stages.

**Q: A team deploys once a month with a 5% change failure rate. Is that good?**

It looks good and almost certainly is not, and that pattern is the one that fools people most often. A low failure rate with a low deployment frequency usually reflects a heavyweight approval process rather than genuine quality. Because releases are rare, each one is enormous, so when something does fail the impact is severe and diagnosis is hard — there are dozens of candidate changes and rolling back reverts a lot of working code. The failure rate looks fine largely because the denominator is tiny. The metrics I would want alongside it are time to restore, which is usually poor in these environments, and lead time, which is typically weeks. I would also ask how much completed work is sitting undeployed, because that is inventory the organization has paid for and is not earning from.

**Q: How would you improve a lead time of three weeks?**

By mapping the value stream and measuring where the time actually goes, before changing anything. In my experience the vast majority of it is queue time rather than work time — waiting for a first review, waiting for a manual test cycle, waiting for a change advisory board, waiting for a release window — and optimizing build speed in that situation achieves essentially nothing. Once the constraint is visible, the fixes follow from it: smaller pull requests and a review service-level expectation if review is the bottleneck; automating the regression suite if manual testing is; replacing an approval board with automated gates and progressive delivery, since the research shows those boards correlate with worse stability rather than better; and decoupling deploy from release with feature flags if the wait is for a release window. The discipline is fixing the actual constraint rather than the part that is most enjoyable to optimize.

**Q: Why should DORA metrics never be used in individual performance reviews?**

Because they measure the delivery system, not individuals, and attaching them to people reliably produces gaming rather than improvement. A cycle time target leads to tickets split artificially so each closes quickly. A deployment frequency target leads to trivial deploys that ship nothing. Most damagingly, any individual metric punishes the engineer who spends a day helping a colleague, reviewing someone else's design, or writing documentation — all of which improve the team's throughput while lowering that person's numbers. This is Goodhart's Law: once a measure becomes a target it ceases to be a good measure. Used correctly, a poor DORA score is a statement about the pipeline, the architecture, and the approval process, and the productive response is to fix those rather than to find someone accountable.

**Q: What is an error budget and what makes it useful?**

An error budget is the inverse of your service level objective — if the SLO is 99.9% over thirty days, the budget is 0.1%, or roughly forty-three minutes of failure. What makes it useful is that it converts reliability from a recurring argument into an agreed rule. While budget remains, the team ships features and takes reasonable risks, because the objective is being met and there is room. When the budget is exhausted, feature work pauses and reliability work takes priority. That gives engineering and product a shared, data-driven way to make the trade-off in advance, rather than relitigating it under pressure every sprint — and it also prevents the opposite failure, where a team over-invests in reliability well beyond what users need. The related discipline is setting the SLO tighter than any contractual SLA, so that breaching your internal target is a warning rather than already being a contract breach.

---

[← Collaboration](./06-collaboration.md) | [Index](./README.md) | [Team Practices →](./08-team-practices.md)
