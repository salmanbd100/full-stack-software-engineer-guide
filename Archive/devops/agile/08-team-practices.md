---
title: Team Practices
part: 8
chapter: 0
slug: team-practices
level: intermediate # beginner | intermediate | advanced
reading_time: 10
updated: 2026-08-28
tags: [devops, agile, team]
in_book: false
---

# Team Practices

The day-to-day habits that determine whether a team is effective: how code gets reviewed, how work gets shared, and how on-call stays sustainable.

## Code Review

Review is the highest-leverage practice a team has. It catches defects, spreads knowledge, and sets standards — all at once.

**What review is actually for, in priority order:**

| Purpose | Notes |
|---------|-------|
| 1. **Is this correct?** | Logic, edge cases, error handling |
| 2. **Is it safe?** | 🔴 Authorization, secrets, injection, IAM scope |
| 3. **Will we understand it in a year?** | Naming, structure, comments on *why* |
| 4. **Knowledge sharing** | ✅ Often the largest long-term benefit |
| 5. Style | ⚠️ Should be automated, not discussed |

❌ **Do not review formatting.** Prettier, `terraform fmt`, and a linter should make style a non-topic. Every comment about spacing is review capacity not spent on correctness.

**PR size is the dominant variable:**

```
< 200 lines   → ✅ real review, defects found
200–400 lines → declining attention
> 400 lines   → 🔴 "LGTM" — effectively unreviewed
> 1000 lines  → nobody has read it
```

> The most effective way to improve review quality is not better reviewers. It is smaller pull requests.

**Reviewing well:**

| ✅ Do | ❌ Don't |
|------|---------|
| Distinguish blocking from optional ("nit:") | Leave 30 equally-weighted comments |
| Ask questions when unsure | Assert that something is wrong |
| Explain *why*, with a link | "Don't do this" |
| Approve when good enough | Hold out for your personal preference |
| Review promptly — same day | Let it sit for four days |
| Comment on what is good | Only ever criticise |

```
❌ "This is wrong."

✅ "This looks like it could allow a user to read another user's order —
    `findById` doesn't filter by owner. Am I missing a check upstream?
    If not, we'd want `order.userId !== req.user.id → 404`."
```

✨ **Prefix non-blocking comments with `nit:` or `optional:`.** Without that signal, authors treat every comment as mandatory, and review becomes slow and demoralizing.

**Review as a first-class task:**

⚠️ Review latency is usually the largest single component of lead time. If review is invisible work squeezed between other tasks, it queues.

| Practice | Effect |
|----------|--------|
| Review before starting new work | ✅ Clears the queue |
| A team review SLA (for example, 4 working hours) | Makes latency a shared commitment |
| CODEOWNERS for automatic routing | No "who should review this?" |
| Pair on complex changes instead | Review happens as it is written |

## Pair and Ensemble Programming

| Mode | Best For | Cost |
|------|----------|------|
| **Solo** | Well-understood, routine work | Lowest |
| **Pairing** | ✅ Complex work, onboarding, risky changes | ~1.5× time, fewer defects |
| **Ensemble (mob)** | Critical decisions, whole-team learning | High, occasionally worth it |

✅ Pairing is not for everything. Reach for it when the change is risky, the domain is unfamiliar, or you are transferring knowledge — a production migration, a security-sensitive change, or onboarding.

✨ Pairing on an infrastructure change is often cheaper than reviewing it afterwards, because the reviewer would have needed the same context anyway — and a mistake in `terraform apply` is harder to undo than a mistake in application code.

## On-Call

On-call is where a team's engineering quality becomes personally visible. It must be sustainable or it drives attrition.

| Requirement | Minimum |
|------------|---------|
| **Rotation depth** | 🔴 6+ people; 4 is the absolute floor |
| **Frequency** | No more often than every 6 weeks |
| **Compensation** | Payment or time back — not goodwill |
| **Authority to fix causes** | Not just to acknowledge pages |
| **Tested runbooks** | With a "last tested" date |
| **Escalation path** | Clear, and no stigma in using it |
| **Follow-the-sun if global** | Nobody should be routinely woken |

🔴 **A rotation of three people is unsustainable.** One holiday or departure and the others are on call half the time. Attrition then makes it worse, which is a well-documented spiral.

**Alert quality is an on-call obligation:**

| ✅ Should page | ❌ Should not page |
|--------------|------------------|
| Users are affected now | CPU is high |
| An SLO error budget is burning fast | Disk is 70% full |
| A queue is growing unboundedly | A single pod restarted |
| Data loss risk | A non-urgent certificate expires in 30 days |

> Every page must be **actionable and urgent**. If the responder's action is to acknowledge and go back to sleep, it should have been a ticket. See [Alerting & On-Call](../Monitoring/07-alerting.md).

**The handover — a small practice with large value:**

```markdown
## On-call handover — week of 2026-07-27

**Pages:** 3 (2 actionable, 1 noise → alert tuned, PLAT-501)

**Ongoing:**
- checkout-api p99 elevated since Wednesday. Not breaching SLO.
  Suspect the new pricing query. PLAT-498 open with the backend team.

**Watch for:**
- EKS upgrade to 1.30 lands Tuesday. Rollback plan in runbooks/eks-upgrade.md
- Certificate for api.acme.com renews automatically on the 4th — verify it did

**Fixed this week:**
- Tuned the pod-restart alert (was paging on normal rollouts)
```

## Sustainable Pace

| Practice | Why It Matters |
|----------|---------------|
| **Protected improvement capacity** | 🔴 100% feature load means zero improvement, forever |
| **Slack in the schedule** | A fully utilized system has no capacity to absorb variation |
| **No routine crunch** | Sustained overtime reduces output and raises defects |
| **Real recovery after incidents** | Time back after a bad night, not a heroism narrative |
| **Rotate the unpleasant work** | Support, toil, and legacy maintenance shared |

⚠️ **Queueing theory applies to people.** A system at 100% utilization has unbounded wait times. A team planned to 100% of capacity cannot absorb an incident, a sick day, or an urgent request without something slipping — which is why "we planned everything and delivered nothing" is such a common pattern.

✅ Target roughly 80% planned capacity. The remaining 20% is not waste; it is what makes the plan achievable.

## Onboarding

| Milestone | Target |
|-----------|--------|
| Environment running locally | Day 1 |
| First PR merged | ✅ Day 1–2 |
| First production deploy | Week 1 |
| Shadowing on-call | Week 2–3 |
| On the on-call rotation | Month 2 |
| Independent on the domain | Month 3 |

✅ **Have the newest engineer improve the onboarding documentation as they go.** They are the only person who can still see what is missing.

⚠️ Assign a named buddy, not "ask anyone". "Ask anyone" means asking nobody, because a new person will not risk interrupting a stranger.

## Knowledge Transfer Before Someone Leaves

| Action | Timing |
|--------|--------|
| Identify what only they know | ✅ Continuously, not at exit |
| Pair on their areas | Final weeks |
| Write ADRs for undocumented decisions | Final weeks |
| Move them off critical-path work | Immediately on notice |
| Transfer on-call knowledge explicitly | Before the last week |

🔴 The best time to address a bus factor of one is long before anyone resigns. If a departure is a crisis, that was true for months already — the resignation only revealed it.

## Interview Q&A

**Q: What makes code review effective?**

Small pull requests, more than anything else about the reviewer. Below roughly two hundred lines people genuinely read the diff and find defects; above four hundred, attention falls off and you get an approval that means very little. Beyond size, the practices that matter are automating style so review capacity goes on correctness rather than formatting, distinguishing blocking comments from optional preferences so authors are not forced to address thirty equally-weighted notes, explaining why with a link rather than asserting that something is wrong, and asking questions where you are unsure rather than making accusations. Timeliness is the underrated one: review latency is often the largest single component of lead time, so treating review as a first-class task — cleared before starting new work, with a team expectation on turnaround — usually improves delivery more than any pipeline optimization.

**Q: How many people do you need for a sustainable on-call rotation?**

Six or more, with four as an absolute floor. With three people you are on call a third of the time, so one holiday or one departure puts the others on call half the time, and that reliably starts an attrition spiral where each loss makes the remaining rotation worse. Depth is necessary but not sufficient, though. The rotation also needs compensation or time back rather than relying on goodwill, tested runbooks with a recorded last-tested date, a clear escalation path that carries no stigma, and — most importantly — the authority and the capacity to fix the causes of pages rather than just acknowledging them. Being paged repeatedly for something you are not permitted or resourced to fix is what produces learned helplessness and burnout, and that is a management failure rather than a tooling one.

**Q: Why shouldn't a team be planned to 100% of capacity?**

Because queueing theory applies to people as well as to servers: a system at full utilization has unbounded wait times and no ability to absorb variation. A team planned to every available hour cannot handle an incident, a sick day, an urgent security patch, or a request from another team without something slipping — and since all of those are certainties rather than risks, the plan is guaranteed to fail. That produces the familiar pattern where a team commits to a sprint and delivers a third of it, which erodes trust in both directions. Planning to around eighty per cent is not slack in the pejorative sense; it is what makes the remaining eighty per cent actually achievable. It also preserves the capacity for improvement work, without which toil accumulates and velocity declines regardless of how hard anyone works.

**Q: When would you pair rather than review afterwards?**

When the work is risky, the domain is unfamiliar, or knowledge transfer is the goal. Infrastructure changes are a good example: a mistake in `terraform apply` against production is much harder to undo than a mistake in application code, and a reviewer trying to evaluate a complex plan afterwards needs essentially the same context the author had — so acquiring that context together while writing it is often cheaper than acquiring it twice. The same applies to security-sensitive changes and to onboarding, where pairing transfers tacit knowledge that no documentation captures. What I would not do is pair on everything, because routine, well-understood work does not benefit enough to justify roughly one and a half times the effort. Ensemble or mob programming I would reserve for genuinely critical decisions where whole-team understanding is the point.

**Q: How do you deal with a bus factor of one on a critical system?**

By treating it as a current risk rather than waiting for a departure to reveal it. The practices that reduce it are the ones built into normal work: code review on that system so more than one person sees it, rotating on-call so operational knowledge is forced to spread, and pairing on changes in that area. For the knowledge that those do not cover — why the system is built this way, what was tried and rejected, which constraints still hold — architecture decision records are the right instrument, because that context is what disappears most completely when a person leaves. If someone has already resigned, I would move them off critical-path delivery immediately and spend their remaining time on pairing and writing decision records rather than on shipping features, since the features will still be deliverable afterwards and the knowledge will not. The general point is that if a resignation creates a crisis, the crisis existed for months and the resignation merely exposed it.

---

[← Metrics & KPIs](./07-metrics.md) | [Agile Index](./README.md)
