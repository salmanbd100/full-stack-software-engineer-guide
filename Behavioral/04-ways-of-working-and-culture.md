---
title: Ways of Working and Engineering Culture
part: 9
chapter: 5
slug: engineering-culture
level: intermediate # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-25
tags: [agile, kanban, dora, metrics, culture, on-call, postmortems, code-review, psychological-safety]
in_book: true
---

# Ways of Working and Engineering Culture {#ch-engineering-culture}

> Describe how your team delivers in terms an interviewer can score, and tell the practices that make a team fast apart from the versions that only look like them.

**In this chapter:** batch size and work in progress · the four DORA metrics, read in pairs · ownership and blameless post-mortems · code review that finds defects · on-call and sustainable pace · the questions that reveal a culture

## 💡 The Core Idea

Almost every process argument comes down to one variable: **batch size**, meaning how much change goes
out at once. Large batches are harder to review, test and roll back, and they hide which change caused
the problem. Small batches are the opposite on every count. So speed and stability are not a trade-off.
Shipping more often makes you more stable, because each change is small enough to reason about.

Culture has its own common thread. Every good practice has a fake version that looks the same from
outside. Handing a team the pager without the authority to fix what pages them looks like ownership. It
is really passing the cost to them. A post-mortem that concludes "human error" looks like analysis. It
is really blame with better vocabulary. A practice works when **the people expected to act have both
the authority and the capacity to act.**

Interviewers do not want a recital of Scrum events. They want to hear that you know what each practice
is *for*, and what you would change when it stops working.

## How It Works

### Scrum, Kanban and work in progress

| | Scrum | Kanban |
| --- | --- | --- |
| **Cadence** | Fixed sprints, usually two weeks | Continuous flow |
| **Commitment** | A sprint goal agreed up front | Pull the next item when capacity frees |
| **Core limit** | Sprint capacity | An explicit work-in-progress (WIP) limit |
| **Suits** | Feature work with a plannable shape | Support, platform and on-call-heavy teams |

Most teams run a hybrid and call it Scrum. Saying so is a better answer than defending a textbook.
Scrum struggles on any team with operational load, because an incident does not respect a sprint
boundary. Teams that make it work reserve twenty to thirty per cent of capacity for unplanned work.
They treat that number as a measurement: if the reserve is always used up, the number was wrong.

**Work in progress is the lever.** If you take one process idea into an interview, take this one:

```text
Six items started, two finished  →  four items ageing, nothing shippable
Two items started, two finished  →  work leaves the system
```

Starting more work does not finish more work. It adds context switching, makes every item wait longer,
and delays the feedback that tells you the first item was wrong. A WIP limit forces the question "what
is blocking the thing we already started?" before anyone picks up something new.

> ⚠️ **A WIP limit that is never hit is not a limit.** It should hurt often enough to change behaviour.
> The team then swarms on a blocked item, working on it together, rather than routing around it.

Two more ideas keep batches small. **Deploy is not release**: code reaches production many times a
day, and a feature flag decides when users see it. That is what makes trunk-based development workable.
See [Chapter ?? — Deployment Strategies, Rollback and Feature Flags](#ch-deployment-strategies).
And **story points** are a relative sizing tool for one team. They are not hours, and they do not
compare across teams. Most of the damage comes from converting them into a delivery date.

### The four DORA metrics

DORA (DevOps Research and Assessment) is a long-running research programme on software delivery. These
are its numbers, and a senior candidate is expected to know them by name.

| Metric | Measures | Type | Elite |
| --- | --- | --- | --- |
| **Deployment frequency** | How often you ship to production | Speed | On demand |
| **Lead time for changes** | First commit → serving traffic | Speed | Under an hour |
| **Change failure rate** | Share of deploys causing degradation | Stability | Under 15% |
| **Time to restore service** | Detection → user impact resolved | Stability | Under an hour |

A fifth was added later: **reliability**, meaning how often you meet your service-level objectives.
Naming it shows your knowledge is current. The error-budget rule that goes with it lives in
[Chapter ?? — Metrics, Dashboards and Alerting](#ch-metrics-and-dashboards).

**Read them in pairs, never alone:**

| Pattern | What it actually says |
| --- | --- |
| High frequency, high failure rate | Shipping fast without enough verification |
| Low frequency, low failure rate | Usually a heavy approval process, not quality |
| Low lead time, slow restore | No rollback path |
| High frequency, low failure, slow restore | An observability gap — you cannot find the problem |

The second row fools people. Rare releases are enormous releases, so each failure is severe. The rate
only looks healthy because the number of deploys is tiny.

**Lead time is the most gamed of the four.** Measuring from pull request open to merge leaves out both
ends of the pipeline. It misses the time from first commit to opening the pull request. It also misses
how long the merged change waited to deploy. Other common cheats are counting staging deploys, and counting only declared
incidents as failures.

### Ownership and blameless post-mortems

**You build it, you run it** is the biggest cultural change a team can make. Nothing improves
observability faster than the authors carrying the pager. They add the logging because they are the
ones debugging at 3am. But the handover only works with four things attached: authority to change the
system, protected capacity for reliability work, tested runbooks, and a rotation deep enough to be humane.

> ⚠️ **Responsibility without authority is not ownership.** A team paged for problems it may not fix
> learns helplessness, and the people who care most leave first.

**Blameless post-mortems** decide whether a team learns from failure or hides it.

| ❌ Blameful | ✅ Blameless |
| --- | --- |
| "Sam dropped the production table" | "A single command could delete production data with no confirmation" |
| Cause: human error | Cause: the system allowed a foreseeable mistake to succeed |
| Action: retraining | Action: require confirmation, restrict the permission, add a recovery path |
| Result: mistakes get hidden | Result: the class of failure is prevented |

If a person could take the action that caused an incident, the system allowed it. Fixing the system
prevents the next hundred cases. Retraining one person prevents none. So ask different questions. What
made the action look correct at the time? What information did the person have? Where was the
safeguard you assumed existed? Blameless does not mean no consequences. Deliberately bypassing controls
is a performance conversation, but that case is rare.

**Psychological safety** means people can admit mistakes and gaps without fear. In the research it is
the strongest single predictor of team performance, and the easiest thing to claim without having. It
is present when someone says "I don't understand this" in a design review. It is present when "I broke
it" arrives fast and without hedging. The clearest signal is how a senior engineer behaves when wrong
in public: "good catch, I was wrong" teaches the room that being wrong is cheap.

### Code review that finds defects

Review is the practice with the biggest payoff a team has, and most teams spend it on the wrong things.
In order: is it correct, is it safe, will we understand it in a year, and does it share knowledge.
Style comes last and should be automated.

**Pull request size dominates everything else:**

```text
under 200 lines  → real review, defects found
200–400 lines    → attention declining
over 400 lines   → "LGTM", effectively unreviewed
```

The best way to improve review quality is not better reviewers. It is smaller pull requests. Mark
non-blocking comments `nit:`, ask rather than assert, and review the same day.

> ⚠️ **Review latency is usually the largest single part of lead time.** Clearing the review queue
> before starting new work, and a team-agreed response time, move the number more than any tool.

### On-call and sustainable pace

A healthy rotation has at least six people, and four is the floor. Each person is on shift no more
often than every six weeks, with payment or time back. They have authority to fix causes, and every
page is both urgent and actionable. A rotation of three is a downward spiral. One holiday puts the other
two on call half the time, someone leaves, and the rotation gets even smaller.

Queueing theory applies to people. A system at 100% utilisation has wait times with no upper limit.
So a team planned to full capacity cannot absorb an incident or a sick day without something slipping.
**Plan to about 80%.** And watch for **hero culture**. Rewarding the person who fixes things at 2am
removes the reason to make 2am fixes unnecessary. It also creates a bus factor of one: one person whose
loss would stop the work.

## Questions That Reveal the Culture

Every loop ends with "do you have any questions for us?" Treat it as the one round where you are the
interviewer. Ask about **behaviour**, not values. "Do you have a good culture?" gets an advert. "When
did you last miss a date, and what happened?" gets the truth.

| Ask this                                                          | Because it tests                              |
| ----------------------------------------------------------------- | --------------------------------------------- |
| "Walk me through your last incident and what changed after it"     | Whether post-mortems produce structural fixes  |
| "How long does a one-line change take to reach production?"        | Lead time, honestly measured                   |
| "How deep is the on-call rotation, and how many pages last week?"  | Whether the pager is sustainable               |
| "What did a new joiner ship in their first week?"                  | Onboarding, and whether the docs work          |
| "What would you change if you had a free quarter?"                 | What the interviewer privately knows           |

Watch for three warning signs: no specific incident comes to mind, "it depends on the release train",
and staff turnover mentioned casually as normal. Leave pay and start dates to the recruiter.

## Common Mistakes

❌ **Attaching delivery metrics to individuals.** Cycle-time targets produce split tickets.
Deployment-frequency targets produce trivial deploys.
✅ DORA measures the *system*: the pipeline, the architecture, the approval process.

❌ **Comparing velocity between teams.** Points are calibrated inside one team.
✅ Compare a team to its own trend, and use cycle-time percentiles (p50, p85) for a forecast.

❌ **"Everyone owns it."** Diffused responsibility is the same as nobody owning it.
✅ A named owning team per service, an escalation path, and a shared *ability* to act.

## 🔑 Key Takeaways

- Batch size is the variable under most process arguments: small changes are easier to review, test, roll back and diagnose.
- Limiting work in progress finishes more work than starting more work does.
- The four DORA metrics measure the delivery system, read in pairs. Attaching them to individuals corrupts them at once.
- Ownership means authority and capacity to fix, not only the pager, and a post-mortem that ends at "human error" has stopped one step early.
- Smaller pull requests improve review more than better reviewers do, and a team planned to 100% capacity cannot absorb what is certain to arrive.

## Interview Questions

**Q: Your team runs two-week sprints but keeps missing the goal because of incidents. What do you change?**

Measure how much capacity unplanned work really takes over a few sprints, then reserve that share
openly. If the number is large and stable, the team should move to a flow model with a WIP limit. The
sprint commitment is the part that keeps failing, not the work.

**Q: Which DORA metric would you look at first on joining a team, and why?**

Lead time, measured honestly from first commit to serving traffic. It exposes the queues nobody talks
about: how long a merged change waits to deploy, and how long review takes. It is also the one a
struggling team is most surprised by.

**Q: A director asks you to report deployment frequency per engineer. What do you say?**

That the number will improve and the system will not. Per-person delivery metrics reward splitting work
and punish helping others. I would offer team-level trends against the team's own history. If what they
need is a forecast, I would add cycle-time percentiles.

**Q: Tell me about an incident you were involved in and what changed afterwards.**

Prepare one where the fix was structural. State what broke and the user impact in one sentence. Spend
the rest of the time on what the system allowed, such as a missing confirmation, a permission broader
than the task, or an alert that fired too late. Then give the change that made that class of failure
impossible. If the action was "be more careful", the story is not finished.

**Q: How would you improve a team's code review culture?**

Start with pull request size, because a 900-line review is not a review. Then automate style, mark
non-blocking comments as optional, and treat review as scheduled work. Review latency is usually the
largest part of lead time, which makes this an argument you can win with data.

## What to Read Next

- [Chapter ?? — Problem Solving, Challenges and Failure](#ch-problem-solving) — the failure story these practices produce
- [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions) — the pipeline the lead-time number is really measuring
- [Chapter ?? — Written Communication](#ch-written-communication) — decision records, runbooks and handovers
