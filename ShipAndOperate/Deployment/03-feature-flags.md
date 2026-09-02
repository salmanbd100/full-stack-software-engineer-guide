---
title: Feature Flags
part: 8
chapter: 0
slug: feature-flags
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [deployment, feature-flags, release-management, experimentation, trunk-based]
in_book: true
---

# Feature Flags {#ch-feature-flags}

> Separate the day you deploy code from the day users see it, without turning your codebase into a maze of branches.

**In this chapter:** deploy versus release · the four kinds of flag · evaluating a flag without slowing the page · flag debt · what flags cost you

## 💡 The Core Idea

A feature flag is **a runtime switch that decides which code path a request takes.** Both paths are
deployed. Both are on every server. The flag picks one.

That decouples two things teams usually conflate: **deploying** code, which is an engineering event,
and **releasing** a feature, which is a product one. Once they are separate, an unfinished feature can
sit in `main` for three weeks without a long-lived branch, and a bad feature can be switched off in
seconds by someone who is not on the engineering rota.

The cost is real and it is paid in the codebase: every live flag doubles the paths you have to reason
about and test.

## How It Works

```typescript
interface EvaluationContext {
  userId: string;
  plan: "free" | "pro" | "enterprise";
  country: string;
}

interface FlagClient {
  /** Never throws. On any failure it returns the supplied default. */
  boolean(key: string, defaultValue: boolean, ctx: EvaluationContext): boolean;
}

function checkoutFlow(client: FlagClient, ctx: EvaluationContext): CheckoutFlow {
  // The default is the safe path. If the flag service is unreachable, users get the old flow.
  const useNewFlow: boolean = client.boolean("checkout-rewrite", false, ctx);
  return useNewFlow ? newCheckout(ctx) : legacyCheckout(ctx);
}
```

Two details in that signature carry most of the value:

- **The default is the safe path, and evaluation never throws.** A flag service that goes down should
  cost you a feature, not the site.
- **Evaluation takes a context.** A flag that only answers "on or off" globally cannot do a percentage
  rollout, cannot target internal staff first, and cannot be used for an experiment.

**Where the decision happens changes what the flag can do:**

| Evaluated | Latency | Can target per user? | Watch out for |
| --------- | ------- | -------------------- | ------------- |
| At build time | Zero | ❌ No | It is not a flag, it is a compile-time constant |
| On the server, per request | Zero extra, if rules are cached locally | ✅ Yes | Flag value must be part of the cache key |
| In the browser, after load | A network round trip | ✅ Yes | Layout shift as the page flips path |
| At the edge, before the origin | ~5 ms | ✅ Yes | Rules must be small enough to sit at the edge |

✅ **Evaluate on the server and send HTML that is already correct.** Browser-side evaluation on a
above-the-fold feature produces a visible flip, which is both a poor experience and a Cumulative
Layout Shift regression.

> ⚠️ A cached page plus a per-user flag is a correctness bug. Either include the flag value in the
> cache key, or do not cache the response at all.

## The Four Kinds of Flag

They look identical in code and have completely different lifetimes. Confusing them is how flag debt
starts.

| Kind | Lives for | Who owns it | Example |
| ---- | --------- | ----------- | ------- |
| **Release** | Days to weeks | Engineering | Hide a half-built checkout until it is done |
| **Kill switch** | Permanently | On-call | Disable the recommendations panel when its service is slow |
| **Experiment** | The length of the test | Product or data | A/B test two pricing pages |
| **Permission** | Permanently | Product | Enterprise-only audit log |

The first two are deployment concerns. The last two are product concerns that happen to use the same
mechanism.

**Only release flags are debt.** A kill switch is meant to live forever, and a permission flag is
really an entitlement — treating them as things to clean up leads to deleting exactly the switch you
wanted at 3 a.m.

## When to Use It

| Situation | Choose | Why |
| --------- | ------ | --- |
| A feature spanning several sprints | Release flag on trunk | Avoids a long-lived branch and its merge |
| A risky refactor of existing logic | Release flag plus a canary | Per-user control on top of per-instance |
| A dependency that can fail slowly | Kill switch | The fastest possible mitigation, with no deploy |
| Two designs, and nobody agrees | Experiment flag | Measurement settles it |
| A one-line copy change | ❌ No flag | The flag costs more than the change |
| Anything you would not delete within a quarter | Reconsider — it may be a permission | Entitlements belong in the domain model |

### Flags versus canary deployments

They solve adjacent problems and interviewers like the distinction.

| | Canary deployment | Feature flag |
| - | ----------------- | ------------ |
| **Unit of control** | Server or instance | User or request |
| **Validates** | The build — memory, latency, dependencies | The feature — does it work, do people use it |
| **Rollback** | Shift traffic, or redeploy | Configuration change, seconds |
| **Targeting** | A random share of traffic | Specific users, plans, regions |
| **Cost** | Extra infrastructure | Code complexity and a flag service |

✅ Use both. The canary proves the artefact is healthy; the flag proves the feature is.

## Flag Debt

The failure mode is not the first flag. It is the fortieth, three of which are permanently on, two of
which nobody can name, and one of which is checked inside a loop.

```typescript
// ❌ Nested release flags. Four code paths, two of which nobody has ever run.
if (flags.newCheckout) {
  if (flags.newPaymentProvider) { /* ... */ } else { /* ... */ }
} else {
  if (flags.newPaymentProvider) { /* ... */ } else { /* ... */ }
}

// ✅ One decision, made once, at the edge of the module.
type CheckoutVariant = "legacy" | "rewrite";
const variant: CheckoutVariant = flags.newCheckout ? "rewrite" : "legacy";
```

**What keeps it under control:**

- **Give every release flag an expiry date at creation**, and fail the build when it passes. A warning
  gets ignored; a red build does not.
- **One flag check per request, at the top of the handler.** Not scattered through the call stack —
  that is how you get two halves of one request disagreeing.
- **Never nest release flags.** Two flags is four paths and your tests cover two of them.
- **Removing a flag is a task in the same sprint as shipping the feature**, not a backlog item.

> ⚠️ **Moving target:** flag vendors and their SDKs change shape often, and OpenFeature is the
> vendor-neutral interface most of them now implement. The durable principle: **wrap the vendor behind
> your own narrow interface** so swapping providers is one file, and so tests can supply a plain object.

## Common Mistakes

❌ **The default value is the new behaviour.** The flag service times out and every user gets the
unreleased path.
✅ The default is always the safe, current behaviour.

❌ **Flag state read from the network on every render.**
✅ Fetch the rule set once, cache it, and evaluate locally. Evaluation should be a function call.

❌ **A flag used to hide a schema change.** The flag switches the code path; the column is already
dropped.
✅ Flags control behaviour, not data compatibility. Schema safety is expand/contract, separately.

❌ **Tests run with the default flag values only.**
✅ Test both paths of every live release flag, or you are shipping an untested branch to whoever the
flag turns on.

## 🔑 Key Takeaways

- A feature flag separates deploying code from releasing a feature, which is what makes trunk-based development workable.
- The default value must be the safe path, and evaluation must never throw.
- Release flags are debt with an expiry date; kill switches and permission flags are permanent and should not be cleaned up.
- Evaluate on the server so the first paint is already correct, and include the flag value in any cache key.
- Two nested release flags is four code paths, and your tests cover two of them.

## Interview Questions

**Q: What is the difference between a feature flag and a canary deployment?**

A canary controls which *instances* serve traffic: a share of requests reaches servers running the new
build, which validates that the artefact is healthy — no memory leak, no latency regression, no broken
dependency. A flag controls which *users* see new behaviour, evaluated per request inside code already
deployed everywhere, which validates the feature itself and allows precise targeting such as internal
staff first. Flags roll back faster because turning one off is a configuration change rather than a
deployment. They are complementary, not alternatives.

**Q: Your flag service becomes unreachable during peak traffic. What happens to your site?**

Nothing, if the client was written correctly. Evaluation should be local against a cached rule set, so
a service outage means the rules stop updating rather than the flags stop answering. Every call
supplies a default, and that default is the current safe behaviour, so the worst case is that a
partially rolled-out feature reverts to off. The failure mode to avoid is a synchronous network call
per evaluation with no default, which turns a vendor outage into your outage.

**Q: How do you stop feature flags accumulating?**

Distinguish the kinds first — only release flags are debt. Kill switches and permission flags are
meant to be permanent, and cleaning those up removes the switch you wanted during an incident. For
release flags, set an expiry date when the flag is created and fail the build once it passes, because
a warning is ignored and a red build is not. Then make flag removal part of the same piece of work as
shipping the feature, rather than a backlog ticket that never gets prioritised.

**Q: Where should a flag be evaluated in a server-rendered application, and why does it matter?**

On the server, before the response is generated, so the HTML that arrives is already the correct
variant. Evaluating in the browser after load means the page renders one variant and then flips, which
users see as a flash and Core Web Vitals score as layout shift. The consequence to state is caching:
once a response depends on a per-user flag, the flag value has to be part of the cache key, or the
first user's variant gets served to everyone.

**Q: When is a feature flag the wrong tool?**

When the change is smaller than the flag. A copy fix or a padding change costs more in flag lifecycle
than in risk. When the concern is really an entitlement — enterprise-only features — it belongs in the
domain model where it can be reasoned about and billed against, not in a flag service. And when the
change is to data rather than behaviour, a flag gives false confidence: it can switch which code runs,
but it cannot restore a column the migration already dropped.

## What to Read Next

- [Chapter ?? — Deployment Strategies and Rollback](#ch-deployment-strategies) — the changes a flag cannot switch back
- [Chapter ?? — Deployment Strategies](#ch-deployment-strategies) — canary and blue/green, the per-instance half of the pair
- [Chapter ?? — Platform Deploys and Preview Environments](#ch-platform-deploys) — the other way to show unfinished work to a small audience
