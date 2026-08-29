---
title: Engineering Culture
part: 9
chapter: 0
slug: engineering-culture
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-08-29
tags: [culture, on-call, postmortems, code-review, psychological-safety]
in_book: true
---

# Engineering Culture {#ch-engineering-culture}

> Describe the practices that make a team fast without making it fragile — and recognise the versions that only look like them.

**In this chapter:** you build it, you run it · blameless post-mortems · psychological safety · code review that finds defects · sustainable on-call · slack in the schedule

## 💡 The Core Idea

Every practice in this chapter has a plausible-looking counterfeit. Handing a team the pager without
the authority to fix what pages them looks like ownership and is a cost transfer. A post-mortem that
concludes "human error" looks like analysis and is blame with better vocabulary. "Everyone owns the
pipeline" looks like shared ownership and means nobody does.

Interviewers ask about culture because the counterfeits are what most candidates have actually lived
through, and describing the difference is hard to fake. The through-line is simple: a practice works
when the people expected to act have both the authority and the capacity to act.

## You Build It, You Run It

The most consequential cultural change a team can make, and the one with the sharpest failure mode.

| | Separate operations team | The team runs what it built |
| --- | --- | --- |
| **Who is paged** | Someone else | The authors |
| **Feedback on quality** | Slow and filtered | Immediate and personal |
| **Incentive to add logging** | Weak | Strong — you debug it at 3am |
| **Incentive to remove toil** | Someone else's pain | Your own |

Nothing improves observability faster than the authors carrying the pager, because it turns an abstract
quality argument into direct self-interest. But the transfer only works with four things attached:
authority to change the system rather than only to acknowledge alerts, protected capacity for
reliability work, tested runbooks, and a rotation deep enough to be humane.

> ⚠️ **Responsibility without authority is not ownership.** A team paged for problems it is not
> permitted to fix learns helplessness, and the people who care most leave first.

## Blameless Post-Mortems

The practice that decides whether a team learns from failure or hides it.

| ❌ Blameful | ✅ Blameless |
| --- | --- |
| "Sam dropped the production table" | "A single command could delete production data with no confirmation" |
| Cause: human error | Cause: the system allowed a foreseeable mistake to succeed |
| Action: retraining | Action: require confirmation, restrict the permission, add a recovery path |
| Result: mistakes get hidden | Result: the class of failure is prevented |

Almost nobody breaks production deliberately. If a person could take an action that caused an
incident, the system permitted that action — and fixing the system prevents the next hundred
occurrences, where retraining one person prevents none.

**The reframe is four questions:**

| Instead of | Ask |
| --- | --- |
| Who did this? | What made this action look correct at the time? |
| Why did they do that? | What information did they have in front of them? |
| How do we stop them repeating it? | How do we make this outcome impossible? |
| Whose fault is it? | Where was the safeguard we assumed existed? |

> ⚠️ **Blameless is not consequence-free.** Deliberately and repeatedly bypassing controls is a
> performance conversation. That case is rare, and treating ordinary mistakes as misconduct destroys
> the reporting culture the rare case depends on.

## Psychological Safety

The strongest single predictor of team performance in the research, and the easiest thing to claim
without having.

**Present:** someone says "I don't understand this" in a design review · a junior challenges a staff
engineer on a technical call · a concern about a deadline arrives in week one rather than week five ·
"I broke it" arrives fast and without hedging.

**Absent:** silence in the meeting and real opinions in direct messages · nobody admits uncertainty ·
problems surface only once they are undeniable · post-mortems find "process gaps" instead of causes.

The clearest signal is how a senior engineer behaves when they are wrong in public. "Good catch, I was
wrong" teaches the room that being wrong is cheap. Defending the position teaches the room to stay
quiet, and the cost of that lesson is paid later, in incidents nobody flagged.

## Code Review That Finds Defects

Review is the highest-leverage practice a team has, and most teams spend it on the wrong things.

| Priority | What review is for |
| --- | --- |
| 1 | Is it correct? Logic, edge cases, error handling |
| 2 | Is it safe? Authorisation, secrets, injection, permission scope |
| 3 | Will we understand it in a year? Naming, structure, comments on *why* |
| 4 | Knowledge sharing — often the largest long-term benefit |
| 5 | Style — which should be automated, not discussed |

**Pull request size dominates everything else:**

```text
under 200 lines  → real review, defects found
200–400 lines    → attention declining
over 400 lines   → "LGTM", effectively unreviewed
over 1000 lines  → nobody has read it
```

The most effective way to improve review quality is not better reviewers. It is smaller pull requests.

| ✅ Do | ❌ Don't |
| --- | --- |
| Mark non-blocking comments `nit:` or `optional:` | Leave thirty equally weighted comments |
| Ask when unsure | Assert that something is wrong |
| Explain why, with a link | "Don't do this" |
| Approve at good enough | Hold out for your own preference |
| Review the same day | Let it sit for four days |

```text
❌ "This is wrong."

✅ "I think this lets a user read another user's order — findById doesn't filter
   by owner. Am I missing a check upstream? If not, order.userId !== req.user.id
   should 404."
```

> ⚠️ **Review latency is usually the largest single component of lead time.** If review is invisible
> work squeezed between tasks, it queues. Clearing the review queue before starting new work, and a
> team-agreed response time, move the number more than any tooling change.

## On-Call That People Stay For

| Requirement | Minimum that works |
| --- | --- |
| Rotation depth | Six people; four is the floor |
| Frequency | No more often than every six weeks |
| Compensation | Payment or time back, not goodwill |
| Authority | To fix causes, not only to acknowledge pages |
| Runbooks | Tested, with a date on them |
| Escalation | A clear path, and no stigma in using it |

A rotation of three is a spiral: one holiday or departure puts the rest on call half the time,
attrition follows, and the rotation gets shallower.

**Alert quality is part of the deal.** A page must be both urgent and actionable — users affected now,
an error budget burning fast, a queue growing without bound, a risk of data loss. High CPU, a disk at
70%, a single restarted process and a certificate expiring in a month are all tickets. If the
responder's only action is to acknowledge and go back to sleep, the alert was wrong, and fixing it is
on-call work.

## Sustainable Pace

Queueing theory applies to people. A system at 100% utilisation has unbounded wait times, so a team
planned to 100% of capacity cannot absorb an incident, a sick day or an urgent request without
something slipping. Planning to roughly 80% is not slack in the pejorative sense — it is what makes the
other 80% achievable.

| Practice | Why it matters |
| --- | --- |
| Protected improvement capacity | A full feature load means zero improvement, permanently |
| No routine crunch | Sustained overtime lowers output and raises defect rate |
| Real recovery after a bad night | Time back, rather than a heroism narrative |
| Rotate the unpleasant work | Support, toil and legacy maintenance are shared |

> ⚠️ **Hero culture is the most flattering failure mode.** Rewarding the person who fixes things at 2am
> removes the incentive to make 2am fixes unnecessary, and creates a bus factor of one.

## Common Mistakes

❌ **A "DevOps team" that owns deployment.** The same wall as before, with an extra hop.
✅ A platform team that owns the paved road, and product teams that deploy their own work on it.

❌ **"Everyone owns it."** Diffused responsibility, which is indistinguishable from nobody owning it.
✅ A named owning team per service, an escalation path, and shared *ability* to act.

❌ **Tools without the culture.** Kubernetes, a pipeline, and still a release every quarter.
✅ Judge maturity by whether a junior can deploy safely on their second day, not by the tool list.

❌ **Onboarding as documentation review.** New joiners are the only people who can find out whether the
documentation works.
✅ Ship something small on day one or two, and fix the docs at every point they failed.

## 🔑 Key Takeaways

- Ownership means authority and capacity to fix, not only the pager — the version without them is a cost transfer that drives attrition.
- Post-mortems that conclude "human error" have stopped one step early; if a person could do it, the system permitted it.
- The clearest measure of psychological safety is how a senior engineer behaves when publicly wrong.
- Smaller pull requests improve review quality more than better reviewers do, and review latency is usually the biggest slice of lead time.
- Plan to about 80% of capacity, because a team at full utilisation cannot absorb the variation that is certain to arrive.

## Interview Questions

**Q: Tell me about an incident you were involved in and what changed afterwards.**

The answer to prepare is one where the fix was structural. State what broke and the user impact in a
sentence, then spend the time on what the system permitted — a missing confirmation, a permission that
was broader than the task, an alert that fired too late — and on the change that made the class of
failure impossible rather than unlikely. If the action item was "be more careful", the story is not
finished yet.

**Q: What does a blameless post-mortem actually look like in practice?**

A timeline built before any conclusions, written from what people knew at the time rather than what we
know now. Then the four reframing questions: what made the action look correct, what information was
available, how the outcome could be made impossible, and where the safeguard we assumed existed
wasn't. Actions have owners and dates, and "retraining" is not one of them.

**Q: How would you improve a team's code review culture?**

Start with pull request size, because it dominates everything else — a 900-line review is not a review.
Then remove style from the conversation by automating it, make non-blocking comments explicitly
optional so authors stop treating every note as mandatory, and treat review as scheduled work rather
than something squeezed between tasks. Review latency is usually the largest component of lead time,
which makes this an argument you can win with data.

**Q: How do you know whether a team's on-call is healthy?**

Rotation depth, page volume per shift, and what proportion of pages were actionable. Six people and a
handful of actionable pages a week is sustainable. Three people, or a majority of pages that end in
"acknowledge and go back to sleep", is a rotation that will lose someone — and the fix is alert quality
and authority to remove causes, not resilience.

**Q: Your team is planned to full capacity every sprint and keeps missing dates. What is your argument?**

That a system at 100% utilisation has no capacity to absorb variation, and variation is guaranteed —
incidents, sick days, urgent requests. Planning to about 80% is what makes the plan achievable, and I
would bring the evidence: the share of each recent sprint that went to unplanned work, and what slipped
as a result. It is a much easier conversation with the number than without it.

## What to Read Next

- [Chapter ?? — Ways of Working](#ch-ways-of-working) — the delivery metrics these practices move
- [Chapter ?? — Conflict Resolution](#ch-conflict-resolution) — the stories these questions usually want
- [Chapter ?? — Written Communication](#ch-written-communication) — decision records, runbooks, and handovers
