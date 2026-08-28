---
title: Agile & DevOps Culture - Interview Preparation
part: 9
chapter: 0
slug: devops-agile-index
level: intermediate # beginner | intermediate | advanced
reading_time: 5
updated: 2026-08-28
tags: [devops, agile]
in_book: true
---

# Agile & DevOps Culture - Interview Preparation

The non-technical half of a DevOps interview. These questions separate engineers who have worked in effective teams from those who can only recite frameworks.

**Scope note:** this section covers Agile and team practice **as it affects delivery**. For STAR-format answers about your own experience, see [Behavioral](../../Behavioral/README.md).

## Table of Contents

1. [Agile Fundamentals](./01-fundamentals.md) — manifesto, Scrum vs Kanban, WIP limits, Little's Law
2. [Scrum for DevOps](./02-scrum.md) — why it breaks for platform teams, and the adaptations that work
3. [DevOps Culture](./03-devops-culture.md) — CALMS, you-build-it-you-run-it, blameless postmortems
4. [CI/CD in Agile](./04-cicd-agile.md) — deploy vs release, trunk-based development, feature flags
5. [Jira & Workflow Management](./05-jira.md) — workflow design, flow metrics, pipeline integration
6. [Collaboration & Knowledge Sharing](./06-collaboration.md) — ADRs, runbooks, async writing, bus factor
7. [Metrics & KPIs](./07-metrics.md) — DORA, error budgets, Goodhart's Law, value stream mapping
8. [Team Practices](./08-team-practices.md) — code review, pairing, sustainable on-call, onboarding

## Priority Guide

| Priority | Topics | Why |
|----------|--------|-----|
| 🔴 Critical | 07 Metrics | DORA metrics are asked in almost every senior interview |
| 🔴 Critical | 03 DevOps Culture | Blameless postmortems and shared ownership are guaranteed topics |
| 🔴 Critical | 04 CI/CD in Agile | Deploy vs release is the key conceptual distinction |
| 🟡 High | 01, 02 Agile & Scrum | Scrum vs Kanban for a platform team is a common probe |
| 🟡 High | 08 Team Practices | On-call sustainability and review quality |
| 🟢 Good to know | 05, 06 | Workflow design and knowledge management |

## Top 12 Interview Questions

1. What is the difference between Agile and DevOps?
2. What are the DORA metrics, and why do they matter?
3. A team deploys monthly with a 5% change failure rate. Is that good?
4. How would you improve a lead time of three weeks?
5. What is the difference between deploy and release?
6. Why are long-lived feature branches a problem?
7. What makes a postmortem blameless, and why does it matter practically?
8. Should developers be on call for their own services?
9. Scrum or Kanban for a platform team?
10. Why do WIP limits matter?
11. What is an error budget?
12. Why shouldn't DORA metrics be used in performance reviews?

## The Answers Worth Memorizing

| Question | The Senior Answer |
|----------|------------------|
| **Agile vs DevOps** | Agile creates demand for frequent delivery; DevOps supplies the capability |
| **Speed vs stability** | ❌ Not a trade-off — elite performers score better on **all four** DORA metrics |
| **Why small batches are safer** | 1 change breaks → 1 suspect. 50 changes break → 50 suspects |
| **Monthly deploys, low failure rate** | ⚠️ Tiny denominator. Check time-to-restore and undeployed inventory |
| **Lead time — measure from** | First commit → **serving traffic**. PR-open-to-merge is the gamed version |
| **Where lead time actually goes** | 🔴 Queue time, not work time. Map the value stream first |
| **Deploy vs release** | Deploy moves code; release exposes behaviour. Decouple with flags |
| **Long-lived branches** | Not integrated, however green — tests ran against a `main` that is gone |
| **Little's Law** | Cycle time = WIP ÷ throughput. More WIP = everything later |
| **Blameless** | "The system permitted it", never "Sam was careless" |
| **Why blame is costly** | People hide problems → you lose the information you need |
| **On-call needs** | 6+ people, compensation, **and authority to fix causes** |
| **Error budget** | 100% − SLO. Budget left → ship. Exhausted → stabilize |
| **SLO vs SLA** | SLO must be **tighter** than the SLA, or a miss is already a breach |
| **Goodhart's Law** | A measure that becomes a target stops being a good measure |
| **Individual metrics** | 🔴 Never — punishes helping colleagues, produces gaming |
| **Code review** | Under 200 lines gets read. Over 400 gets "LGTM" |
| **Capacity planning** | ✅ Plan to ~80%. Full utilization = unbounded wait times |
| **Definition of Done** | Must mean **in production**, not merged |
| **"Self-healing"** | Automated remediation of anticipated failures — deterministic |
| **CALMS** | Culture, Automation, Lean, Measurement, Sharing |

## DORA Performance Bands

| | Elite | High | Medium | Low |
|---|-------|------|--------|-----|
| **Deployment frequency** | On demand | Daily–weekly | Weekly–monthly | Monthly+ |
| **Lead time** | Under 1 hour | 1 day–1 week | 1 week–1 month | 1+ month |
| **Change failure rate** | Under 15% | Under 20% | Under 30% | Over 30% |
| **Time to restore** | Under 1 hour | Under 1 day | Under 1 week | Over 1 week |

✨ A fifth metric, **reliability** (SLO attainment), was added later. Mentioning it signals current knowledge.

## Anti-Pattern Cheat Sheet

| Anti-Pattern | Why It Fails |
|-------------|-------------|
| A separate "DevOps team" | 🔴 Rebuilds the wall with an extra hop |
| Zombie Scrum | All ceremonies, nothing changes from retrospectives |
| Velocity as a target | Estimates inflate, output flat |
| Code freeze before release | Batches change — makes the release riskier |
| Change advisory board | Correlates with **worse** stability in the research |
| On-call without authority | Cost transfer, not ownership. Drives attrition |
| Hero culture | Removes the incentive to fix 2am causes; bus factor of one |
| Untracked toil | Capacity vanishes with no explanation |
| Coverage as a target | Tests that execute code and assert nothing |
| "Done" = merged | Board shows inventory, not delivered value |
| Planning to 100% capacity | Guaranteed to fail — no room for the certain interrupts |
| Sub-tasks for everything | Fragments reporting, hides progress |
| Answers in direct messages | Where organizational knowledge goes to die |

## Study Path

**Start here →** [Agile Fundamentals](./01-fundamentals.md)

| Level | Topics | Time |
|-------|--------|------|
| Foundations | 01, 02: frameworks, WIP, Scrum adaptations | 2–3 hours |
| The important half | 03, 04: culture, deploy vs release, flags | 3 hours |
| Measurement | 07: DORA, error budgets, value stream mapping | 2–3 hours |
| Practice | 08: review, pairing, on-call, onboarding | 2 hours |
| Tooling & knowledge | 05, 06: workflow design, ADRs, runbooks | 2 hours |

## Related Topics

- [CI/CD Fundamentals](../../ShipAndOperate/CICD/01-cicd-fundamentals.md) — build once, trunk-based development, DORA
- [Deployment Strategies](../../ShipAndOperate/CICD/03-deployment-strategies.md) — canary, blue/green, progressive delivery
- [Observability Fundamentals](../../ShipAndOperate/Observability/01-fundamentals.md) — SLI, SLO, error budgets in depth
- [Alerting and On-Call](../../ShipAndOperate/Observability/04-alerting.md) — alert design and noise reduction
- [AI for Documentation](../GenAI/03-documentation.md) — drafting runbooks and postmortems safely
