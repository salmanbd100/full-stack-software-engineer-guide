---
title: Collaboration & Knowledge Sharing
part: 8
chapter: 0
slug: collaboration
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-28
tags: [devops, agile, collaboration]
in_book: false
---

# Collaboration & Knowledge Sharing

Collaboration tooling is not the interesting part. The interesting part is **where knowledge lives and whether it survives people leaving**.

## The Real Problem

```
❌ Knowledge in people's heads:

  "Ask Priya, she set up the pipeline"
       ↓
  Priya is on holiday / leaves / forgets
       ↓
  🔴 The team cannot operate its own system
```

| Symptom | Underlying Failure |
|---------|-------------------|
| One person must approve every deploy | Bus factor of one |
| "Ask X" is the answer to routine questions | Undocumented process |
| Onboarding takes three months | No written system |
| The same question every fortnight | Answer is in chat, not in docs |
| Nobody knows why a resource exists | No decision record |

> The measure of good knowledge sharing is simple: **could the team operate normally if any one person were unavailable for a month?**

## Choosing the Right Medium

Mismatching the medium to the content is the most common failure.

| Content | Right Home | ❌ Wrong Home |
|---------|-----------|--------------|
| How to deploy | Repo README / runbook | Confluence page from 2022 |
| Why we chose EKS over ECS | ✅ ADR in the repo | Someone's memory |
| Incident timeline | Postmortem document | Slack thread |
| Terraform module reference | Generated (terraform-docs) | Hand-written wiki |
| Team norms and on-call process | Team handbook | Verbal tradition |
| A quick question | Chat | ⚠️ Chat, then lost forever |
| API contract | OpenAPI spec | Wiki table |

✅ **Rule: technical documentation lives with the code it describes.** A wiki page in a separate system drifts because updating it is a separate action nobody remembers.

⚠️ **The chat problem:** answers given in chat are invisible to everyone who was not present and to everyone who joins later. When the same question arrives twice, the answer belongs in a document, and the chat reply should be a link to it.

## Architecture Decision Records

The highest-value document type for infrastructure work, and the most neglected.

```markdown
# ADR-014: Use EKS rather than ECS for container orchestration

**Status:** Accepted · **Date:** 2026-03-11
**Deciders:** platform team, backend leads

## Context
We need container orchestration for 14 services. The team has no
Kubernetes production experience. Two services need custom autoscaling
based on queue depth. We expect to add a service mesh within a year.

## Decision
Use Amazon EKS with managed node groups and Karpenter.

## Consequences

### Positive
- Portable across clouds and on-premises if required
- Large ecosystem: Karpenter, External Secrets, service mesh options
- Custom autoscaling via KEDA is well supported

### Negative
- Steeper learning curve; ~3 months to team competence
- Control plane cost (~$73/month per cluster) that ECS does not have
- We own upgrade cycles — roughly every 4 months

### Accepted risks
- If the team cannot reach competence in 6 months, revisit
- Requires a dedicated platform owner

## Alternatives considered
- **ECS + Fargate** — simpler and cheaper, but no mature service mesh
  option and custom autoscaling would be bespoke
- **Nomad** — smaller ecosystem, harder to hire for
```

**Why ADRs matter more than other documentation:**

| Question | Without an ADR |
|----------|---------------|
| Why is it built this way? | ⚠️ Guesswork; often assumed to be a mistake |
| Was X considered? | Nobody knows; it gets re-litigated |
| Is this constraint still true? | Cannot tell — no context recorded |
| Can we change it now? | Unknown risk, so nothing changes |

🔴 **Undocumented decisions get reversed by people who do not know the constraints**, and then re-reversed when the original problem reappears. An ADR converts a decision into an asset.

✅ Keep them in the repository, numbered, immutable. Supersede rather than edit — the history of *changed* thinking is valuable.

## Runbooks

The document that matters most at 3am.

| Requirement | Why |
|------------|-----|
| Exact commands, copy-pasteable | No improvising under pressure |
| A verification step after each action | "How do I know it worked?" |
| A rollback for each action | Every step must be reversible |
| **"Last tested" date** | ✅ Distinguishes real from theoretical |
| What it does **not** cover | Prevents misapplication |
| Linked from the alert itself | Found in seconds, not searched for |

✨ **Link the runbook in the alert payload.** A responder should never have to search a wiki while an outage is running.

```yaml
# Prometheus alert with the runbook attached
annotations:
  summary: "Checkout API p99 latency above SLO"
  description: "p99 is {{ $value }}s, SLO is 0.8s"
  runbook_url: "https://github.com/acme/platform/blob/main/runbooks/checkout-latency.md"
```

⚠️ An untested runbook is worse than none, because it is trusted. Test them during game days, and record the date.

## Practices That Actually Spread Knowledge

| Practice | Effect | Cost |
|----------|--------|------|
| **Code review** | ✅ Highest — continuous, everyone participates | Built in |
| **Pair / ensemble programming** | ✅ Very high for complex work | High |
| **Rotating on-call** | ✅ Forces operational understanding | Built in |
| **Rotating support role** | Everyone sees the real questions | Low |
| **Internal tech talks** | Broad awareness | Medium |
| **Incident reviews open to all** | Cross-team learning | Low |
| **Documentation in the same PR** | Docs stay current | ✅ Very low |

> Rotating on-call is the most underrated knowledge-sharing mechanism. Nothing teaches a system faster than being responsible for it while it misbehaves.

## Writing for an Async, Distributed Team

Most enterprise teams span time zones. Writing quality becomes a delivery bottleneck.

| ✅ Do | ❌ Don't |
|------|---------|
| Lead with the conclusion | Build to it over four paragraphs |
| State the decision needed and by when | "Thoughts?" |
| Include the context a reader lacks | Assume they saw yesterday's thread |
| Write in threads, not walls | Fragment across ten messages |
| Use a channel, not a direct message | 🔴 Hide the answer from everyone else |

🔴 **Direct messages are where organizational knowledge goes to die.** An answer given in a DM helps one person once; the same answer in a public channel is searchable by everyone forever. Default to public.

**A decision request that works asynchronously:**

```
**Decision needed by Thursday: RDS instance class for the reporting replica**

Context: reporting queries are causing p99 spikes on the primary.
Options:
  A) db.r6g.xlarge read replica — ~$380/mo, handles current load with headroom
  B) db.r6g.large — ~$190/mo, ~70% utilization at current peak
  C) Aurora Serverless v2 — variable cost, better for spiky reporting

Recommendation: B. Reporting load is predictable and we can resize online.

Objections by Thursday 17:00 UTC, otherwise I'll proceed with B.
```

✅ The "silence means agreement, by this time" pattern is what keeps async decisions from stalling for a week.

## Onboarding as a Test of Documentation

| Signal | Meaning |
|--------|---------|
| New engineer ships on day 1–2 | ✅ Excellent — the paved road works |
| First week | Good |
| First month | ⚠️ Significant undocumented knowledge |
| Three months | 🔴 The system exists mostly in people's heads |

✅ **The best onboarding practice: have the newest person update the onboarding documentation as they go.** They are the only one who can see what is missing, and it converts confusion into a permanent fix.

## Interview Q&A

**Q: How do you make sure knowledge is not concentrated in one person?**

I would use the practices that spread knowledge as a side effect of normal work, rather than relying on documentation drives that never happen. Code review is the highest-value one because it is continuous and everyone participates. Rotating on-call is the most underrated, since nothing teaches you a system faster than being responsible for it while it misbehaves, and it forces the runbooks to be real. A rotating support role exposes everyone to the questions other teams actually ask. Then for the things those do not cover, architecture decision records capture why the system is the way it is, which is the knowledge that disappears most completely when someone leaves. The test I would apply is whether the team could operate normally if any one person were unavailable for a month — if the answer involves waiting for them to come back, that is a concrete risk to fix rather than an abstract concern.

**Q: What is an ADR and why do you value them?**

An architecture decision record is a short document capturing a decision, the context that drove it, the consequences accepted, and the alternatives considered and rejected. I value them because the context is the part that vanishes fastest and matters most. Without it, a future engineer sees an unusual choice, assumes it was a mistake, and reverses it — then hits the original problem and reverses back, having spent a quarter rediscovering something that was already known. ADRs also stop decisions being re-litigated, because "was X considered?" has a written answer, and they make it possible to tell whether a constraint still holds. Practically I keep them in the repository, numbered and immutable, and supersede rather than edit, since the history of how the thinking changed is itself useful. The negative consequences and accepted risks sections are the ones people skip and the ones that turn out to be most valuable.

**Q: Where should technical documentation live?**

With the code it describes, in the repository, because proximity is what prevents drift. A wiki page in a separate system requires a separate deliberate action to update, which nobody remembers, so it degrades until it is misleading — and misleading documentation is worse than none because it is trusted. Documentation in the repo can be required in the same pull request as the change, reviewed alongside it, and versioned with it, so an old commit has the documentation that matched it. I would go further for reference material and generate it: terraform-docs for module inputs and outputs, OpenAPI for API contracts, so those cannot be wrong. What legitimately belongs in a wiki is the organizational layer — team norms, on-call process, onboarding — which changes slowly and is not tied to a specific codebase.

**Q: Why do you discourage answering questions in direct messages?**

Because it converts reusable knowledge into a private, unsearchable exchange that helps one person once. The same answer in a public channel is visible to everyone present, searchable by everyone who joins later, and often prompts a correction or an addition from someone who knows more. Direct messages also concentrate load on whoever is known to have the answer, since there is no way for anyone else to pick it up, which is exactly the bus-factor problem. The habit I would encourage is defaulting to a public channel and treating a repeated question as a signal that the answer belongs in a document — at which point the chat reply becomes a link, which is faster for everyone including the person answering. Genuinely sensitive topics are the exception, but they are a small minority of what ends up in DMs.

**Q: How long should it take a new engineer to ship their first change?**

Ideally the first day or two, and I treat that as a measurement of the platform rather than of the person. Shipping on day one means the paved road works: repository setup is documented, the local environment is reproducible, the pipeline is self-service, and permissions arrive without a week of tickets. If it takes a month, there is significant undocumented knowledge and a lot of manual gatekeeping; if it takes three months, the system exists mostly in people's heads and every hire pays that cost again. The most effective practice I have used is having the newest person update the onboarding documentation as they go, because they are the only one who can still see what is missing — everyone else has internalised the gaps. That turns each onboarding into a permanent improvement rather than a repeated cost.

---

[← Jira & Workflow](./05-jira.md) | [Index](./README.md) | [Metrics & KPIs →](./07-metrics.md)
