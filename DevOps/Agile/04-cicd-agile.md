---
title: CI/CD in Agile
part: 8
chapter: 0
slug: cicd-agile
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-08-04
tags: [devops, agile, cicd]
in_book: false
---

# CI/CD in Agile

Agile promises frequent delivery. CI/CD is what makes the promise real. The link between them is the concept that separates modern delivery from release-train thinking: **deploy is not release**.

## Deploy vs Release

The single most important distinction in this topic.

| | **Deploy** | **Release** |
|---|-----------|------------|
| **What it is** | Moving code to an environment | Exposing behaviour to users |
| **Owned by** | Engineering | Product |
| **Risk** | Technical | Business |
| **Reversal** | Roll back | ✅ Toggle a flag |
| **Frequency** | Many times a day | Whenever the business chooses |

```
❌ Coupled: deploy = release
   → every deploy is a business event
   → deploys become rare, large, and frightening
   → release coordination meetings

✅ Decoupled with feature flags:
   deploy continuously (dark)  →  release on a business decision
   → deploys are boring
   → releases are reversible in seconds
```

> Feature flags are what let a team merge to `main` daily and still ship a feature on the day marketing chose. This is the mechanism that makes trunk-based development compatible with product planning.

## Why Trunk-Based Development

Long-lived feature branches are structurally incompatible with continuous integration.

```
Trunk-based (works with CI):
main ──●──●──●──●──●──●──●──
        \ /  \ /  \ /
     branches under 1 day

Long-lived branches (fights CI):
main ──●─────────────────●──
        \               /
         ●──●──●──●──●──   3 weeks — the merge is a project
```

| | Short-Lived | Long-Lived |
|---|------------|-----------|
| **Merge conflicts** | Small, frequent, trivial | 🔴 Large, rare, painful |
| **Integration risk** | Continuous, tiny | Deferred, enormous |
| **CI signal** | Tests what will ship | Tests a stale combination |
| **Code review size** | Reviewable | ⚠️ Rubber-stamped |

⚠️ **A branch that lives three weeks is not integrated**, however green its own CI is — the tests ran against a `main` that no longer exists.

✅ Merge incomplete work behind a flag rather than holding it on a branch. Incomplete-but-integrated beats complete-but-isolated.

## Feature Flags

```typescript
interface FlagContext {
  userId: string;
  tenantId: string;
  environment: "dev" | "staging" | "production";
}

interface FlagClient {
  isEnabled(key: string, ctx: FlagContext): Promise<boolean>;
}

// The new pricing engine ships disabled, then rolls out gradually
async function calculateTotal(
  order: Order,
  ctx: FlagContext,
  flags: FlagClient,
): Promise<Money> {
  if (await flags.isEnabled("pricing-engine-v2", ctx)) {
    return pricingV2.total(order);
  }
  return pricingV1.total(order); // fallback stays until v2 is proven
}
```

**Four kinds of flag, with very different lifespans:**

| Type | Purpose | Lifespan |
|------|---------|----------|
| **Release** | Hide unfinished work | ✅ Days to weeks — then delete |
| **Experiment** | A/B test | Duration of the experiment |
| **Operational** | Kill switch, load shedding | Long-lived, deliberately |
| **Permission** | Entitlement by plan or tenant | Permanent — this is config, not a flag |

🔴 **Flag debt is real.** Every flag doubles the notional number of code paths. Twenty stale release flags means a codebase nobody can reason about and combinations no test covers.

| Practice | Why |
|----------|-----|
| Create every release flag with a **removal ticket** | Cleanup is planned, not hoped for |
| Set an expiry date; alert when passed | Makes staleness visible |
| Cap the number of active release flags | Forces cleanup before new work |
| Never nest release flags | Combinatorial explosion |

## Small Batches

The mathematical reason small changes are safer.

```
One release with 50 changes:
  → something breaks
  → 50 candidates to investigate
  → rollback reverts 49 working changes
  → mean time to recovery: hours

50 releases with 1 change each:
  → something breaks
  → 1 candidate — the change you just made
  → rollback reverts only that
  → mean time to recovery: minutes
```

| Batch Size | Risk per Deploy | Diagnosis | Rollback Cost |
|-----------|----------------|-----------|--------------|
| **Large** | High | 🔴 Hard | Reverts good work too |
| **Small** | Low | ✅ Trivial | Precise |

> This is why the DORA research finds speed and stability correlate positively rather than trading off. Frequent deployment forces small batches, and small batches are inherently safer.

## The Feedback Loop

Agile is a feedback system. CI/CD determines its cycle time.

```
Idea → Build → Deploy → Measure → Learn → Idea
                  ↑                  ↓
              CI/CD sets       observability
             this duration     sets this quality
```

| Loop | Target | Consequence If Slow |
|------|--------|--------------------|
| Local build and test | Seconds | Developers stop running tests |
| PR pipeline | ✅ Under 10 minutes | Batching, context switching |
| Merge to production | Under 1 hour | Feedback arrives too late to act on |
| Production signal to team | Minutes | Users find bugs before you do |

🔴 **The ten-minute rule for pull request feedback is not arbitrary.** Beyond that, developers switch tasks, lose context, and start batching commits — which recreates large batches and undoes the benefit.

## Release Strategies and Product Decisions

Deployment strategy is a product conversation as much as a technical one.

| Strategy | Product Value |
|----------|--------------|
| **Blue/green** | Instant, complete rollback |
| **Canary** | ✅ Real user validation with limited exposure |
| **Progressive rollout by flag** | ✅ Target internal → beta → 10% → all |
| **Dark launch** | Run new code, discard output — validates performance safely |
| **Shadow traffic** | Mirror production requests to the new version |

✨ **Dark launching is underused.** Deploy the new pricing engine, run it on every real request, log the result, and discard it — comparing against the old engine. You validate correctness and performance under genuine production load with zero user risk.

## Definition of Done

Where Agile and CI/CD meet most concretely.

```markdown
## Definition of Done
- [ ] Merged to main (branch lived less than 1 day)
- [ ] All automated checks green
- [ ] Deployed to production (flag off if incomplete)
- [ ] Feature flag has an owner and a removal date
- [ ] Dashboards and alerts cover the new behaviour
- [ ] Rollback verified — not assumed
- [ ] Documentation updated in the same PR
```

🔴 If "done" means "waiting for the release train", the team is producing inventory. Undeployed completed work is the most expensive form of waste in software: paid for, not earning, and accumulating merge risk.

## Anti-Patterns

| Anti-Pattern | Why It Hurts |
|-------------|-------------|
| **Release trains for everything** | Couples unrelated changes; one bad change blocks all |
| **Code freeze before a release** | Batches change, making the release riskier |
| **Manual QA gate on every change** | Becomes the bottleneck; encourages batching |
| **Sprint ends with a big-bang deploy** | Mini-waterfall with Agile vocabulary |
| **Flags never removed** | Untestable combinatorial paths |
| **No Friday deploys as policy** | ⚠️ Treats the symptom — fix the rollback path |
| **Deploy requires a change advisory board** | Weekly cadence ceiling regardless of pipeline quality |

⚠️ **Code freezes are counterproductive.** They batch up changes so the post-freeze release is larger and riskier — the opposite of the intent. The DORA research finds change advisory boards correlate with *worse* stability, because they slow feedback without catching defects.

## Interview Q&A

**Q: What is the difference between deploy and release, and why does it matter?**

Deploying moves code to an environment; releasing exposes behaviour to users. When they are coupled, every deployment is a business event, which makes deployments rare, large, and frightening — and that in turn makes them genuinely risky, so the caution is self-justifying. Decoupling them with feature flags means engineering can deploy continuously with the new code inactive, and product can turn the feature on whenever they choose, for whichever users they choose. The practical consequences are large: deploys become unremarkable because they change nothing user-visible, releases become reversible in seconds by toggling a flag rather than by rolling back a deployment, and a team can merge to main daily while still launching on the date marketing picked. This is the mechanism that makes trunk-based development compatible with product planning.

**Q: Why are short-lived branches important for continuous integration?**

Because a long-lived branch is by definition not integrated, no matter how green its own pipeline is — the tests ran against a version of main that no longer exists, so the CI signal is about a combination that will never ship. Integration risk does not disappear while a branch is open; it accumulates and is paid all at once at merge time, which is why a three-week branch produces a merge that is effectively its own project. Short branches invert that: conflicts are small, frequent, and trivial, and code review stays small enough that reviewers actually read it rather than rubber-stamping a two-thousand-line diff. The objection is usually that a feature is not finished, and the answer is feature flags — merge the incomplete work with the flag off, so it stays integrated and continuously tested while remaining invisible to users.

**Q: What are the risks of feature flags?**

Flag debt. Every active flag notionally doubles the number of code paths, so twenty stale release flags produce a combinatorial space no test suite covers and no engineer can reason about, and eventually someone changes behaviour under a flag combination nobody knew existed. The discipline is to distinguish flag types by intended lifespan: release flags hide unfinished work and should live days or weeks then be deleted; operational flags like kill switches are deliberately permanent; and entitlement flags controlling what a plan includes are really configuration rather than flags. For release flags specifically, I would create each one with a removal ticket and an expiry date, alert when the date passes, and cap the number active at once so cleanup happens before new work starts. Never nesting release flags matters too, because that is where the combinatorial problem becomes unmanageable.

**Q: Your organization has a code freeze before every quarterly release. What is your view?**

That it is counterproductive and achieves the opposite of its intent. A freeze batches up all the changes that would otherwise have shipped incrementally, so the release after the freeze is larger than it would have been — and a larger batch is harder to test, harder to diagnose when something breaks, and more expensive to roll back because reverting takes out dozens of unrelated working changes. The freeze reduces the number of deployment events while increasing the risk of each one. The DORA research points the same way, finding that change advisory boards and heavyweight approval processes correlate with worse stability rather than better, because they delay feedback without reliably catching defects. The better answer is to make each change small and independently reversible, invest in automated verification and canary deployment with automatic rollback, and let the deployment be routine.

**Q: What is dark launching?**

Deploying new code that runs on real production traffic while its output is discarded, so you can validate it without any user impact. For example, when replacing a pricing engine, you deploy the new implementation, call it on every real request alongside the existing one, log both results, compare them, and serve only the old result. That gives you correctness validation against genuine production inputs — including the strange edge cases no test fixture contains — plus real performance and load characteristics, at zero risk. It is particularly valuable for replacing a critical component where a staging environment cannot reproduce the input distribution or the traffic volume. Once the comparison shows agreement and the latency is acceptable, switching over is a flag change rather than a leap of faith.

---

[← DevOps Culture](./03-devops-culture.md) | [Index](./README.md) | [Jira & Workflow →](./05-jira.md)
