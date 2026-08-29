---
title: Ways of Working
part: 9
chapter: 0
slug: ways-of-working
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-29
tags: [agile, scrum, kanban, dora, metrics, delivery]
in_book: true
---

# Ways of Working {#ch-ways-of-working}

> Talk about how your team delivers in terms an interviewer can score: batch size, flow, and the four numbers that predict both speed and stability.

**In this chapter:** Scrum and Kanban without the ceremony · work in progress · deploy versus release · the DORA metrics · error budgets · the metrics that get abused

## 💡 The Core Idea

Almost every process argument reduces to one variable: **batch size**. Large batches are harder to
review, harder to test, harder to roll back, and they hide which change caused the problem. Small
batches are the opposite on every count.

That is why the research finding that surprises people — speed and stability are not a trade-off — is
not really a surprise. Shipping more often makes you more stable, because each change is small enough
to reason about. Everything below is a mechanism for keeping batches small and finding out quickly
when one goes wrong.

Interviewers do not want a recital of Scrum events. They want to hear that you know what the events
are *for*, and what you would change when they stop working.

## Scrum, Kanban, and What Actually Differs

| | Scrum | Kanban |
| --- | --- | --- |
| **Cadence** | Fixed sprints, usually two weeks | Continuous flow |
| **Commitment** | A sprint goal agreed up front | Pull the next item when capacity frees |
| **Change mid-cycle** | Disruptive by design | Expected |
| **Core limit** | Sprint capacity | Explicit work-in-progress limit |
| **Suits** | Feature work with a plannable shape | Support, platform, and on-call-heavy teams |

The honest summary is that most teams run a hybrid and call it Scrum. That is fine, and saying so is a
better answer than defending a textbook. What matters is whether the team has a way to stop taking on
new work when it is already saturated.

**Where Scrum genuinely struggles** is any team carrying operational load. A sprint commitment assumes
predictable capacity, and an incident does not respect a sprint boundary. Teams that make it work
usually reserve a fixed share of capacity — twenty to thirty per cent — for unplanned work, and treat
the reserve as a measurement rather than a guess: if it is consistently blown, the number was wrong.

## Work in Progress Is the Lever

If you take one idea from process into an interview, take this one.

```text
Six items started, two finished  →  four items are aging, nothing is shippable
Two items started, two finished  →  work leaves the system
```

Starting more work does not finish more work. It adds context switching, it ages every item, and it
delays the feedback that tells you the first item was wrong. A WIP limit forces the question _"what is
blocking the thing we already started?"_ before anyone picks up something new.

> ⚠️ **A WIP limit that is never hit is not a limit.** It should be uncomfortable often enough that the
> team has to swarm on a blocked item rather than route around it.

Estimation follows the same logic. Story points are a relative sizing tool for one team's own planning.
They are not hours, they do not compare across teams, and converting them to a delivery date is where
most of the damage in this area comes from.

## Deploy Is Not Release

The single most useful distinction in delivery, and the one that lets a team ship daily without
shipping half-finished features to users.

| | Deploy | Release |
| --- | --- | --- |
| **What it is** | Code reaches production | Users can see the behaviour |
| **Owned by** | The team, automatically | Product, deliberately |
| **Frequency** | Many times a day | Whenever the feature is ready |
| **Reversed by** | Rollback | Turning a flag off |

Separating them is what makes trunk-based development workable. Everyone merges to `main` frequently,
incomplete work sits behind a flag, and long-lived branches — with their painful merges and their weeks
of unintegrated risk — stop being necessary.

```typescript
// The flag is the release boundary; the deploy already happened.
if (await flags.isEnabled("checkout-v2", { userId })) {
  return renderCheckoutV2();
}
return renderCheckoutV1();
```

> ⚠️ **Flags are debt with an expiry date.** A flag that outlives its rollout doubles the paths through
> the code and nobody remembers which side is live. Delete the branch and the flag together, and put
> the removal in the same backlog as the feature.

## The Four DORA Metrics

These are the numbers a senior candidate is expected to know by name.

| Metric | Measures | Type |
| --- | --- | --- |
| **Deployment frequency** | How often you ship to production | Speed |
| **Lead time for changes** | Commit → serving traffic | Speed |
| **Change failure rate** | Share of deploys causing degradation | Stability |
| **Time to restore service** | Detection → user impact resolved | Stability |

| | Elite | High | Medium | Low |
| --- | --- | --- | --- | --- |
| **Deployment frequency** | On demand | Daily–weekly | Weekly–monthly | Monthly or less |
| **Lead time** | Under 1 hour | 1 day–1 week | 1 week–1 month | Over 1 month |
| **Change failure rate** | Under 15% | Under 20% | Under 30% | Over 30% |
| **Time to restore** | Under 1 hour | Under 1 day | Under 1 week | Over 1 week |

A fifth was added later — **reliability**, which in practice means service-level objective attainment.
Naming it signals that your knowledge is current rather than from a 2019 slide deck.

**Read them in pairs, never alone:**

| Pattern | What it actually says |
| --- | --- |
| High frequency, high failure rate | Shipping fast without adequate verification |
| Low frequency, low failure rate | Usually a heavyweight approval process, not quality |
| Low lead time, high restore time | No rollback path |
| High frequency, low failure, slow restore | An observability gap — you cannot find the problem |

That second row is the one that fools people. Rare releases are enormous releases, so each failure is
severe; the failure *rate* only looks healthy because the denominator is tiny.

## Measuring Honestly

| Metric | Measure from | The common cheat |
| --- | --- | --- |
| Deployment frequency | Production deploys only | Counting staging deploys |
| Lead time | First commit → serving traffic | Pull request open → merge |
| Change failure rate | Deploys needing a fix, rollback or patch | Only counting declared incidents |
| Time to restore | Detection → user impact resolved | Stopping the clock at merge |

Lead time is the most gamed of the four. Measuring from pull request open to merge excludes the two
slowest parts of the pipeline: how long the work waited before anyone started it, and how long the
merged change waited to be deployed.

**Error budgets** are the operational counterpart. An SLI is the measurement, an SLO is your internal
target, and the error budget is what is left: an SLO of 99.9% over thirty days allows roughly
43 minutes of failure. While budget remains, ship. When it is gone, reliability work wins. The point is
not the arithmetic — it is that the team agreed the rule before the argument, so the trade-off is
settled by data rather than by whoever is most senior in the room.

> ⚠️ **Set the SLO tighter than the SLA.** If the internal target equals the contractual promise, then
> missing your own target means you have already breached the contract.

## Common Mistakes

❌ **Attaching delivery metrics to individual performance.** Cycle-time targets produce artificially
split tickets; deployment-frequency targets produce trivial deploys. Worse, they punish the engineer
who spent a day unblocking a colleague.
✅ DORA measures the *system* — the pipeline, the architecture, the approval process. A poor score is a
statement about those, not about the people.

❌ **Treating a coverage number as the goal.** Set 90% and you get tests that execute code and assert
nothing. Goodhart's law is not a theory here; it is a prediction.
✅ Use coverage to find untested areas, and judge the tests by whether they fail when the behaviour breaks.

❌ **Comparing velocity between teams.** Points are calibrated inside one team and mean nothing outside it.
✅ Compare a team to its own trend, and use cycle-time distribution — p50 and p85 — when you need a forecast.

## 🔑 Key Takeaways

- Batch size is the variable underneath most process arguments: small changes are easier to review, test, roll back and diagnose.
- Limiting work in progress finishes more work than starting more work does, because it forces the team to unblock what it already has.
- Deploy and release are separate events, and separating them with feature flags is what makes daily deploys compatible with unfinished features.
- The four DORA metrics measure the delivery system, read in pairs; attaching them to individuals corrupts them immediately.
- An error budget converts the ship-or-stabilise argument into a rule the team agreed before it mattered.

## Interview Questions

**Q: Your team runs two-week sprints but keeps missing the sprint goal because of incidents. What do you change?**

I would first measure how much capacity unplanned work actually consumes over a few sprints, then
reserve that share explicitly rather than committing to it and losing it. If the number is large and
stable, that is evidence the team should move to a flow model with a WIP limit instead of sprint
commitments — the commitment is the part that keeps failing, not the work.

**Q: How do you ship to production daily when a feature takes three weeks to build?**

By separating deploy from release. The work merges to `main` continuously behind a feature flag, so it
is deployed but not visible, and the team keeps the benefits of small integrations without exposing
half a feature. The discipline that makes it work is deleting the flag when the rollout finishes.

**Q: Which of the four DORA metrics would you look at first on joining a team, and why?**

Lead time, measured honestly from first commit to serving traffic, because it is the one that exposes
the queues nobody talks about — how long work waits before it starts, and how long a merged change
waits to deploy. It also tends to be the metric a struggling team is most surprised by.

**Q: A director asks you to report deployment frequency per engineer. What do you say?**

That the number will improve and the system will not. Per-person delivery metrics reward splitting work
and punish helping others, and DORA was designed to measure a delivery system rather than the people in
it. I would offer team-level trends against the team's own history, and cycle-time distribution if what
they actually need is a forecast.

**Q: When is Scrum the wrong choice?**

When capacity is not predictable enough to commit — platform teams, support-heavy teams, anything with
a live on-call rotation. A sprint commitment assumes you know what the next two weeks hold, and an
incident does not check the calendar. Those teams do better with a WIP-limited flow and a service-level
target than with a sprint goal they will renegotiate every Wednesday.

## What to Read Next

- [Chapter ?? — Engineering Culture](#ch-engineering-culture) — the practices that decide whether these numbers can improve
- [Chapter ?? — Pipeline Security](#ch-cicd-security) — the pipeline the lead-time number is really measuring
- [Chapter ?? — Written Communication](#ch-written-communication) — decision records, runbooks, and writing for people in another timezone
