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

Almost every process argument comes down to one variable: **batch size**. Large batches are harder to
review, test and roll back, and they hide which change caused the problem. Small batches are the
opposite on every count. That is why speed and stability are not a trade-off: shipping more often makes
you more stable, because each change is small enough to reason about.

Culture has its own through-line. Every good practice has a counterfeit that looks the same from
outside. Handing a team the pager without the authority to fix what pages them looks like ownership and
is a cost transfer. A post-mortem that concludes "human error" looks like analysis and is blame with
better vocabulary. A practice works when **the people expected to act have both the authority and the
capacity to act.**

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

Most teams run a hybrid and call it Scrum, and saying so is a better answer than defending a textbook.
Scrum struggles on any team with operational load, because an incident does not respect a sprint
boundary. Teams that make it work reserve twenty to thirty per cent of capacity for unplanned work, and
treat that number as a measurement: if the reserve is always blown, the number was wrong.

**Work in progress is the lever.** If you take one process idea into an interview, take this one:

```text
Six items started, two finished  →  four items ageing, nothing shippable
Two items started, two finished  →  work leaves the system
```

Starting more work does not finish more work. It adds context switching, ages every item, and delays
the feedback that tells you the first item was wrong. A WIP limit forces the question "what is blocking
the thing we already started?" before anyone picks up something new.

> ⚠️ **A WIP limit that is never hit is not a limit.** It should hurt often enough that the team swarms
> on a blocked item rather than routing around it.

Two more ideas keep batches small. **Deploy is not release**: code reaches production many times a
day, and a feature flag decides when users see it, which is what makes trunk-based development
workable — see [Chapter ?? — Deployment Strategies, Rollback and Feature Flags](#ch-deployment-strategies).
And **story points** are a relative sizing tool for one team; they are not hours, they do not compare
across teams, and converting them to a delivery date is where most of the damage comes from.

### The four DORA metrics

These are the numbers a senior candidate is expected to know by name.

| Metric | Measures | Type | Elite |
| --- | --- | --- | --- |
| **Deployment frequency** | How often you ship to production | Speed | On demand |
| **Lead time for changes** | First commit → serving traffic | Speed | Under an hour |
| **Change failure rate** | Share of deploys causing degradation | Stability | Under 15% |
| **Time to restore service** | Detection → user impact resolved | Stability | Under an hour |

A fifth was added later — **reliability**, meaning service-level objective attainment. Naming it shows
your knowledge is current. The error-budget rule that goes with it lives in
[Chapter ?? — Metrics, Dashboards and Alerting](#ch-metrics-and-dashboards).

**Read them in pairs, never alone:**

| Pattern | What it actually says |
| --- | --- |
| High frequency, high failure rate | Shipping fast without enough verification |
| Low frequency, low failure rate | Usually a heavy approval process, not quality |
| Low lead time, slow restore | No rollback path |
| High frequency, low failure, slow restore | An observability gap — you cannot find the problem |

The second row fools people. Rare releases are enormous releases, so each failure is severe; the rate
only looks healthy because the denominator is tiny.

**Lead time is the most gamed of the four.** Measuring from pull request open to merge leaves out the
two slowest parts of the pipeline: how long the work waited before anyone started it, and how long the
merged change waited to deploy. Other common cheats are counting staging deploys and counting only
declared incidents as failures.

### Ownership and blameless post-mortems

**You build it, you run it** is the most consequential cultural change a team can make. Nothing improves
observability faster than the authors carrying the pager — they add the logging because they debug it
at 3am. But the transfer only works with four things attached: authority to change the system, protected
capacity for reliability work, tested runbooks, and a rotation deep enough to be humane.

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
prevents the next hundred occurrences; retraining one person prevents none. The reframe is to ask what
made the action look correct at the time, what information the person had, and where the safeguard you
assumed existed actually was. Blameless is not consequence-free — deliberately bypassing controls is a
performance conversation — but that case is rare.

**Psychological safety** is the strongest single predictor of team performance in the research, and the
easiest thing to claim without having. It is present when someone says "I don't understand this" in a
design review, and when "I broke it" arrives fast and without hedging. The clearest signal is how a
senior engineer behaves when wrong in public: "good catch, I was wrong" teaches the room that being
wrong is cheap.

### Code review that finds defects

Review is the highest-leverage practice a team has, and most teams spend it on the wrong things. In
order: is it correct, is it safe, will we understand it in a year, and does it share knowledge. Style
comes last and should be automated.

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

A healthy rotation has at least six people (four is the floor), a shift no more often than every six
weeks, payment or time back, authority to fix causes, and pages that are both urgent and actionable. A
rotation of three is a spiral: one holiday puts the rest on call half the time, someone leaves, and it
gets shallower.

Queueing theory applies to people. A system at 100% utilisation has unbounded wait times, so a team
planned to full capacity cannot absorb an incident or a sick day without something slipping. **Plan to
about 80%.** And watch for **hero culture** — rewarding the person who fixes things at 2am removes the
incentive to make 2am fixes unnecessary, and creates a bus factor of one.

## Questions That Reveal the Culture

Every loop ends with "do you have any questions for us?" Treat it as the one round where you are the
interviewer. Ask about **behaviour**, not values: "do you have a good culture?" gets an advert; "when
did you last miss a date, and what happened?" gets the truth.

| Ask this                                                          | Because it tests                              |
| ----------------------------------------------------------------- | --------------------------------------------- |
| "Walk me through your last incident and what changed after it"     | Whether post-mortems produce structural fixes  |
| "How long does a one-line change take to reach production?"        | Lead time, honestly measured                   |
| "How deep is the on-call rotation, and how many pages last week?"  | Whether the pager is sustainable               |
| "What did a new joiner ship in their first week?"                  | Onboarding, and whether the docs work          |
| "What would you change if you had a free quarter?"                 | What the interviewer privately knows           |

No specific incident coming to mind, "it depends on the release train", and turnover mentioned casually
as normal are all warning signs. Leave pay and start dates to the recruiter.

## Common Mistakes

❌ **Attaching delivery metrics to individuals.** Cycle-time targets produce split tickets;
deployment-frequency targets produce trivial deploys.
✅ DORA measures the *system* — the pipeline, the architecture, the approval process.

❌ **Comparing velocity between teams.** Points are calibrated inside one team.
✅ Compare a team to its own trend, and use cycle-time percentiles (p50, p85) for a forecast.

❌ **"Everyone owns it."** Diffused responsibility is the same as nobody owning it.
✅ A named owning team per service, an escalation path, and a shared *ability* to act.

## 🔑 Key Takeaways

- Batch size is the variable under most process arguments: small changes are easier to review, test, roll back and diagnose.
- Limiting work in progress finishes more work than starting more work does.
- The four DORA metrics measure the delivery system, read in pairs; attaching them to individuals corrupts them at once.
- Ownership means authority and capacity to fix, not only the pager, and a post-mortem that ends at "human error" has stopped one step early.
- Smaller pull requests improve review more than better reviewers do, and a team planned to 100% capacity cannot absorb what is certain to arrive.

## Interview Questions

**Q: Your team runs two-week sprints but keeps missing the goal because of incidents. What do you change?**

Measure how much capacity unplanned work really takes over a few sprints, then reserve that share
explicitly. If the number is large and stable, the team should move to a flow model with a WIP limit —
the commitment is the part that keeps failing, not the work.

**Q: Which DORA metric would you look at first on joining a team, and why?**

Lead time, measured honestly from first commit to serving traffic. It exposes the queues nobody talks
about — how long work waits before it starts, and how long a merged change waits to deploy — and it is
the one a struggling team is most surprised by.

**Q: A director asks you to report deployment frequency per engineer. What do you say?**

That the number will improve and the system will not. Per-person delivery metrics reward splitting work
and punish helping others. I would offer team-level trends against the team's own history, and
cycle-time percentiles if what they need is a forecast.

**Q: Tell me about an incident you were involved in and what changed afterwards.**

Prepare one where the fix was structural. State what broke and the user impact in a sentence, then spend
the time on what the system allowed — a missing confirmation, a permission broader than the task, an
alert that fired too late — and the change that made the class of failure impossible. If the action was
"be more careful", the story is not finished.

**Q: How would you improve a team's code review culture?**

Start with pull request size, because a 900-line review is not a review. Then automate style, mark
non-blocking comments as optional, and treat review as scheduled work. Review latency is usually the
largest part of lead time, which makes this an argument you can win with data.

## What to Read Next

- [Chapter ?? — Problem Solving, Challenges and Failure](#ch-problem-solving) — the failure story these practices produce
- [Chapter ?? — GitHub Actions and Pipeline Security](#ch-github-actions) — the pipeline the lead-time number is really measuring
- [Chapter ?? — Written Communication](#ch-written-communication) — decision records, runbooks and handovers
