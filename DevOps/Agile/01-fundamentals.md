---
title: Agile Fundamentals
part: 9
chapter: 0
slug: agile-fundamentals
level: beginner # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-04
tags: [devops, agile, fundamentals]
in_book: true
---

# Agile Fundamentals

Agile is a set of principles for delivering software in small increments with fast feedback. For a DevOps engineer, the connection is direct: **Agile creates the demand for frequent delivery, and DevOps makes it possible.**

## The Core Idea

```
❌ Waterfall: one large bet, feedback at the end

  Requirements → Design → Build → Test → Release
  ├──────────────── 12 months ────────────────┤
                                        ↑
                            first real feedback here
                            (too late to change anything)
```

```
✅ Agile: many small bets, feedback continuously

  ├─2wk─┤├─2wk─┤├─2wk─┤├─2wk─┤├─2wk─┤
     ↑      ↑      ↑      ↑      ↑
   feedback at every step, direction can change
```

> The point of short iterations is not speed. It is **reducing the cost of being wrong**.

## The Four Values

The Agile Manifesto states preferences, not prohibitions. The second half of each line matters.

| Prefer | Over | Not a Licence To |
|--------|------|-----------------|
| **Individuals and interactions** | Processes and tools | Abandon process entirely |
| **Working software** | Comprehensive documentation | Write no documentation |
| **Customer collaboration** | Contract negotiation | Ignore contracts |
| **Responding to change** | Following a plan | Stop planning |

⚠️ "We're Agile so we don't document" is the most common misreading. The value says working software is *more* valuable than exhaustive documentation — not that documentation has no value.

**The principles that matter most for DevOps:**

- ✅ Deliver working software frequently — weeks, not months
- ✅ Continuous attention to technical excellence
- ✅ Simplicity — maximizing the work *not* done
- ✅ Sustainable pace, indefinitely
- ✅ Teams reflect and adjust at regular intervals

## Scrum vs Kanban

The two frameworks you will be asked to compare.

| | **Scrum** | **Kanban** |
|---|----------|-----------|
| **Cadence** | Fixed sprints (1–4 weeks) | Continuous flow |
| **Commitment** | A sprint goal | None — pull when free |
| **Limits work by** | Sprint capacity | ✅ Explicit WIP limits |
| **Roles** | Product Owner, Scrum Master, Developers | None prescribed |
| **Change mid-cycle** | ⚠️ Discouraged | ✅ Fine |
| **Key metric** | Velocity | ✅ Cycle time, throughput |
| **Best for** | Feature work with a roadmap | ✅ **Ops, support, unpredictable work** |

🔴 **Scrum fits platform and SRE teams badly.** A two-week sprint commitment collides with incidents, escalations, and urgent security patches — work that cannot wait and cannot be estimated.

✅ **Kanban is usually the right answer for DevOps teams**, because the work is interrupt-driven. Many platform teams run a hybrid: Kanban flow for daily work, plus a fortnightly planning and retrospective rhythm borrowed from Scrum.

**Scrumban — the practical compromise:**

```
Kanban board with WIP limits        ← handles interrupts
+ fortnightly planning              ← keeps direction
+ retrospective                     ← keeps improving
− sprint commitment                 ← removes the part that breaks
```

## WIP Limits — The Most Useful Idea

Limiting work in progress is the single highest-value practice, and the least understood.

```
❌ 5 engineers, 12 items in progress
   → everything is 60% done
   → context switching everywhere
   → nothing ships

✅ 5 engineers, WIP limit of 4 in "In Progress"
   → to start something new, finish something
   → work flows to completion
```

**Little's Law explains why:**

```
Cycle time = Work in progress ÷ Throughput
```

⚠️ Throughput is roughly fixed by team capacity. So **doubling WIP doubles cycle time** without delivering anything faster. Starting more work makes everything later.

✅ WIP limits also surface bottlenecks. If "In Review" is constantly full, review is your constraint — and no amount of starting new work helps.

## Estimation

| Approach | How It Works | Honest Assessment |
|----------|-------------|-------------------|
| **Story points** | Relative size, fibonacci-ish | ⚠️ Works if never converted to hours |
| **T-shirt sizes** | S / M / L / XL | Fine for coarse planning |
| **Ideal days** | Effort in days | ❌ Becomes a deadline |
| **#NoEstimates** | Count items, measure throughput | ✅ Often works better |

> Story points measure **relative complexity**, not time. The moment someone says "a point is half a day", you have reinvented hour estimates with extra ceremony.

✅ For DevOps and platform work, **counting throughput is usually better than estimating**. Historical cycle time gives a more honest forecast than a room full of people guessing.

⚠️ **Velocity is a planning aid, never a performance target.** Measure a team on velocity and it will inflate estimates — the number rises, output does not.

## Where Agile Meets DevOps

They are not the same thing, and interviewers check whether you know the difference.

| | Agile | DevOps |
|---|------|--------|
| **Scope** | How work is planned and prioritized | How work reaches production |
| **Optimizes** | Deciding the right thing to build | Delivering it safely and fast |
| **Boundary** | Traditionally ends at "dev complete" | Spans commit to production and operation |

```
Agile without DevOps:
  ✅ two-week sprints producing "done" work
  ❌ released quarterly in a big batch
  → all the ceremony, none of the benefit
```

🔴 This is a real and common failure. A team can run perfect Scrum and still take three months to get a change into production. Agile creates the demand for frequent delivery; **DevOps supplies the capability**.

> If your sprint ends with work sitting in a release queue, the sprint boundary is fiction. "Done" must mean "in production".

## Common Anti-Patterns

| Anti-Pattern | What It Looks Like |
|-------------|-------------------|
| **Zombie Scrum** | All ceremonies, no working software, no change from retrospectives |
| **Velocity as a target** | Estimates inflate, output flat |
| **Sprint as a mini-waterfall** | Design week 1, code week 2, test on the last day |
| **No definition of done** | "Done" means different things to each person |
| **Ignoring technical debt** | 100% feature capacity until velocity collapses |
| **Scrum Master as a project manager** | Assigns tasks, chases status |
| **Estimates treated as commitments** | Trust erodes on both sides |

⚠️ The clearest test of whether a team is genuinely Agile: **has anything actually changed as a result of the last three retrospectives?** If not, the ceremonies are theatre.

## Interview Q&A

**Q: What is the difference between Agile and DevOps?**

Agile is about how work is planned, prioritized, and broken down so that feedback arrives early and the cost of being wrong stays low. DevOps is about how that work actually reaches production and gets operated — automation, delivery pipelines, monitoring, and shared ownership between development and operations. They are complementary rather than competing, and the common failure is having one without the other: a team can run textbook Scrum with perfect ceremonies and still batch releases quarterly, which delivers none of the benefit because feedback still arrives months late. The way I would put it is that Agile creates the demand for frequent delivery and DevOps supplies the capability. If work is "done" at the end of a sprint but sits in a release queue for six weeks, the sprint boundary is fiction.

**Q: Scrum or Kanban for a platform team?**

Kanban, or a hybrid, because platform and SRE work is interrupt-driven. A sprint commitment assumes you can predict a fortnight of work, and that assumption breaks the first time there is an incident, an urgent security patch, or an escalation from another team — all of which are legitimate work that cannot wait and cannot be estimated in advance. Kanban handles that naturally: work is pulled when capacity frees up, and WIP limits stop the team accumulating twelve half-finished things. What I would keep from Scrum is the fortnightly planning and the retrospective, because without a rhythm for stepping back, a Kanban team drifts into pure reactive work and never does the improvement that would reduce the interrupts. That combination is often called Scrumban and it is what most effective platform teams actually run.

**Q: Why do WIP limits matter?**

Because of Little's Law: cycle time equals work in progress divided by throughput. Throughput is roughly fixed by team capacity, so doubling the amount of work in progress doubles how long each item takes without delivering anything sooner. In practice a team with twelve things in flight has twelve things at sixty per cent complete, constant context switching, and nothing shipping — which feels busy and produces very little. A WIP limit forces the team to finish before starting, so work actually flows to completion. The second benefit is diagnostic: when a column like "In Review" is persistently at its limit, that is your bottleneck made visible, and the correct response is to help clear it rather than to start more work upstream, which only makes the queue longer.

**Q: How should story points be used?**

As a relative measure of complexity within one team, for the purpose of forecasting how much might fit in an iteration — and nothing else. The moment points get converted into hours or days, you have reinvented time estimation with additional ceremony and lost the property that made points useful, which is that they are deliberately fuzzy. They also do not transfer between teams, so comparing one team's velocity to another's is meaningless. And velocity must never be a performance target: measure a team on it and estimates inflate, so the number rises while output stays flat. For DevOps and platform work specifically, I would often skip estimation and simply count throughput and measure cycle time, because historical data forecasts more honestly than a room of people guessing about work that is largely unpredictable.

**Q: How can you tell whether a team is genuinely Agile or just performing the ceremonies?**

I would ask one question: what has changed as a result of the last three retrospectives? If the answer is nothing, the ceremonies are theatre regardless of how well they are run. Then I would look at three concrete things. First, how long it takes a single small change to reach production — if that is measured in weeks, the iteration boundary is not real. Second, whether the team can change direction mid-iteration when new information arrives, or whether the plan is treated as a commitment. Third, whether technical debt and reliability work get capacity, because a team running at a hundred per cent feature load is borrowing against future velocity and will eventually stall. Those three tell you far more than whether the standup happens daily or the board is tidy.

---

[Agile Index](./README.md) | [Scrum for DevOps →](./02-scrum.md)
