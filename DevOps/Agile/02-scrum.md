---
title: Scrum for DevOps
part: 8
chapter: 0
slug: scrum
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-28
tags: [devops, agile, scrum]
in_book: false
---

# Scrum for DevOps

Scrum is the most widely used Agile framework, so you will be asked about it. The DevOps-specific challenge is that Scrum assumes predictable work, and operational work is not.

## The Framework in One Page

**Three accountabilities:**

| Role | Owns | Does **Not** |
|------|------|-------------|
| **Product Owner** | What gets built, and the priority order | Decide how, or assign tasks |
| **Scrum Master** | Making the process work, removing blockers | ❌ Manage people or assign work |
| **Developers** | How the work gets done, and the estimates | Take priority direction mid-sprint |

⚠️ A Scrum Master who assigns tasks and chases status is a project manager with a different title. The role is to coach the team and remove impediments.

**Five events:**

| Event | Duration (2-week sprint) | Purpose |
|-------|-------------------------|---------|
| **Sprint Planning** | ≤ 4 hours | Agree the sprint goal and select work |
| **Daily Scrum** | 15 minutes | ✅ Team coordinates — **not** a status report |
| **Sprint Review** | ≤ 2 hours | Demonstrate working software, get feedback |
| **Retrospective** | ≤ 1.5 hours | ✅ Improve how the team works |
| **Backlog Refinement** | Ongoing | Keep upcoming work ready |

**Three artifacts:**

| Artifact | Commitment |
|----------|-----------|
| Product Backlog | Product Goal |
| Sprint Backlog | Sprint Goal |
| Increment | **Definition of Done** |

## Where Scrum Breaks for DevOps

```
Monday: sprint planned, 34 points committed
Tuesday: production incident — 2 days of firefighting
Wednesday: critical CVE in the base image, all services need rebuilding
Thursday: another team blocked, needs an urgent IAM change
Friday: sprint review — "we completed 11 of 34 points"
```

| Problem | Why |
|---------|-----|
| **Incidents ignore sprints** | Unplanned and unschedulable |
| **Urgent security work** | Cannot wait two weeks |
| **Other teams' dependencies** | Platform teams are interrupt-driven by nature |
| **Ops work is hard to estimate** | "Investigate why nodes restart" has no size |
| **Toil is invisible** | Never appears on the board, consumes capacity |

🔴 The result is chronic under-delivery against commitments, which erodes trust in both directions — the team looks unreliable, and the process looks like fiction.

## Making Scrum Work Anyway

If your organization mandates Scrum, these adaptations genuinely help.

**1. Reserve capacity for unplanned work.**

```
Sprint capacity: 40 points

  Planned feature work:      24 points  (60%)
  Reserved for unplanned:    12 points  (30%)  ← incidents, escalations
  Improvement / debt:         4 points  (10%)  ← protected

✅ If the reserve is unused, pull from the backlog. Never plan to 100%.
```

⚠️ A team that plans to 100% of capacity fails every sprint, because the reserve requirement does not disappear just because it was not budgeted.

**2. Have a rotating support role.**

| Practice | Effect |
|----------|--------|
| One engineer on interrupts each sprint | Protects the rest from context switching |
| That person's capacity is **zero** for sprint work | ✅ Honest accounting |
| Rotate every sprint | Spreads knowledge, prevents burnout |

✅ This is the single most effective adaptation. It converts unpredictable interruption into predictable, budgeted capacity.

**3. Make toil visible.**

Toil is manual, repetitive operational work that scales with usage and adds no lasting value.

```
❌ Invisible: engineers spend 30% of their week on manual releases,
              access requests, and certificate renewals.
              None of it is on the board. Velocity looks bad. Nobody knows why.

✅ Visible: toil is tracked as work items.
            Now you can see it is 30%, and justify automating it.
```

> Google's SRE guidance suggests capping toil at around 50% of time. You cannot manage that limit if the toil is not tracked.

**4. Define "Done" to mean "in production".**

```markdown
## Definition of Done
- [ ] Code reviewed and merged to main
- [ ] Unit and integration tests pass
- [ ] Security scans pass (SAST, SCA, IaC, image)
- [ ] Deployed to production behind a feature flag
- [ ] Dashboards and alerts exist for the new behaviour
- [ ] Runbook updated if operational behaviour changed
- [ ] Documentation updated in the same PR
```

🔴 If "done" means "merged and waiting for the release train", your sprint produces inventory, not value. This is the most important line between Agile theatre and real delivery.

## Sprint Planning for Infrastructure Work

Infrastructure work resists user-story framing. Do not force it.

❌ **Awkward:**

> "As a user, I want the Kubernetes cluster upgraded to 1.30 so that I can experience improved reliability."

✅ **Honest:**

> **Task:** Upgrade EKS from 1.29 to 1.30 across dev, staging, and production.
> **Why:** 1.29 support ends in November; upgrading avoids forced upgrades and unblocks the Gateway API work.
> **Risk:** Deprecated APIs in two services need fixing first.
> **Done when:** All three clusters on 1.30, all workloads healthy, runbook updated.

✅ Keep user stories for user-facing work. For infrastructure, state the outcome, the reason, the risk, and the completion criteria. The point of a story format is shared understanding — if it does not add that, drop it.

**Slicing infrastructure work thin:**

```
❌ One item: "Migrate to EKS"  (3 months, invisible progress)

✅ Sliced, each independently deliverable:
   1. Terraform module for the cluster, applied to dev
   2. One stateless service running on dev EKS
   3. Observability: metrics, logs, and traces flowing
   4. CI/CD deploys to EKS alongside the existing platform
   5. Migrate service A, run both, compare
   6. Migrate remaining services incrementally
   7. Decommission the old platform
```

✅ Each slice delivers something demonstrable and reduces risk. This is more valuable than the sprint ceremony itself.

## Running the Events Well

| Event | ❌ Common Failure | ✅ Better |
|-------|-----------------|----------|
| **Daily Scrum** | Status report to the lead | "What is blocking flow? Who needs help?" |
| **Sprint Review** | Slides about work done | A live demo of working software |
| **Retrospective** | Complaints, no actions | ✅ 1–2 actions with an owner and a date |
| **Planning** | Estimating a fixed scope | Agreeing a goal, then selecting work |
| **Refinement** | Skipped | Small ongoing sessions, not one long meeting |

✨ **The retrospective is the only event that improves the system.** Cancel any other event before that one. A retrospective without owned, dated actions is a venting session.

**A retrospective format that produces action:**

```
1. Review last retro's actions      ← 🔴 do this first, every time
2. What helped? What hindered?
3. Group into themes
4. Vote on ONE thing to change
5. Define the action, the owner, and the date
```

⚠️ Starting with the previous actions is what makes retrospectives credible. If nothing ever happens, people stop contributing honestly.

## Interview Q&A

**Q: How does Scrum work for a DevOps or platform team?**

Not well without adaptation, because Scrum assumes you can predict a fortnight of work and operational work is interrupt-driven. Incidents, urgent security patches, and other teams' escalations all arrive unplanned and cannot wait for the next sprint, so a team that commits to full capacity fails every sprint and loses credibility. The adaptations that actually work are: reserve thirty per cent or so of capacity for unplanned work rather than planning to a hundred per cent; run a rotating support role where one engineer handles interrupts each sprint and is counted as zero capacity for sprint work, which converts unpredictable interruption into budgeted capacity; and track toil as visible work items so the manual operational load is measurable and can justify automation. If I had the choice I would run Kanban with a fortnightly planning and retrospective rhythm instead, since that handles the interrupt-driven reality natively.

**Q: What should the Definition of Done include for infrastructure work?**

Crucially, it should mean "in production", not "merged". If done means the code is on main waiting for a release train, the sprint produces inventory rather than value and the iteration boundary is meaningless. Beyond deployment, for infrastructure and platform work I would include that all security scanning passed — static analysis, dependency, infrastructure-as-code, and image scanning; that observability exists for the new behaviour, meaning dashboards and alerts, because shipping something you cannot see is not finished; that the runbook is updated if operational behaviour changed; and that documentation went in the same pull request, since a follow-up documentation ticket never gets done. The test I apply is whether an on-call engineer who has never seen this change could operate it at three in the morning using only what exists.

**Q: Do infrastructure tasks need to be written as user stories?**

No, and forcing it produces worse communication rather than better. "As a user, I want the Kubernetes cluster upgraded so that I can experience improved reliability" is a contortion that hides the real information. The purpose of the story format is shared understanding of who benefits and why, and where that is genuinely unclear it is useful — but for infrastructure work the useful framing is the outcome, the reason including any deadline such as a version reaching end of support, the risk, and the explicit completion criteria. What does matter, far more than the format, is slicing the work thin. "Migrate to EKS" as one item is three months of invisible progress; broken into a cluster module applied to dev, then one stateless service, then observability, then pipeline integration, then incremental migration, each slice is demonstrable and reduces risk.

**Q: Which Scrum event would you protect if the team was short on time?**

The retrospective, because it is the only event that improves the system rather than executing within it. Planning, the daily scrum, and the review all coordinate work that is already understood; the retrospective is where the team changes how it works, which compounds. That said, protecting it only helps if it produces owned, dated actions — a retrospective that generates a list of complaints and nothing else is a venting session and people rightly stop investing in it. The format detail that makes the difference is starting every retrospective by reviewing the previous one's actions, because that is what makes the exercise credible. If nothing from last time happened, that is itself the most important thing to discuss.

**Q: A team consistently completes 11 of 34 committed points. What is wrong and how do you fix it?**

The commitment is the problem, not the team. Completing a third of committed work sprint after sprint means capacity is being consumed by work that was never planned — incidents, escalations, security patches, and invisible toil — and the plan simply does not acknowledge it. So I would first make that work visible by tracking it, which usually reveals that thirty to fifty per cent of capacity goes to unplanned or operational work. Then I would plan to the real available capacity rather than the theoretical one, reserve explicit space for interrupts, and introduce a rotating support role so the interruption lands on one person instead of fragmenting everybody. I would also check whether estimates are being treated as commitments by people outside the team, because that dynamic causes estimate inflation and destroys trust in both directions. The goal is a plan that is honest, even if the honest number looks smaller.

---

[← Agile Fundamentals](./01-fundamentals.md) | [Index](./README.md) | [DevOps Culture →](./03-devops-culture.md)
