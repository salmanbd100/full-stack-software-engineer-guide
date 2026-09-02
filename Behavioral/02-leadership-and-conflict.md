---
title: Leadership, Teamwork and Conflict
part: 9
chapter: 0
slug: leadership-teamwork
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-02
tags: [behavioral, leadership, teamwork, conflict, feedback]
in_book: true
---

# Leadership, Teamwork and Conflict {#ch-leadership-teamwork}

> Show that people follow your technical judgement, and that you can disagree without spending the relationship.

**In this chapter:** what these questions actually measure · leading without authority · three worked answers · giving feedback and delivering bad news · the red flags that end the round

## 💡 The Core Idea

Every question in this category is the same question: **when you and another person wanted different
things, what happened?** Leadership questions ask it about a team, conflict questions ask it about one
person, and teamwork questions ask it about you being on the losing side of it.

That framing matters because it tells you what to leave out. The interviewer does not need the project's
history. They need the moment two positions met, what you did about it, and whether the other person
would work with you again.

> Senior candidates are not scored on being right. They are scored on how they behaved while being right,
> and on what they did the times they were not.

## How It Works

Most senior engineers lead without a reporting line. Nobody has to do what you say, which means the only
tools are the ones that survive being refused.

| Instead of      | You have             | What the answer sounds like                                        |
| --------------- | -------------------- | ------------------------------------------------------------------ |
| Authority       | A stated criterion   | "We agreed on the criteria before anyone presented an option"       |
| Escalation      | Evidence             | "I spiked both approaches for a day rather than arguing about them" |
| Being the lead  | Being the first user | "I migrated my own service first so the cost was measurable"        |
| Consensus       | Commitment           | "Two people still preferred Redux, and both shipped Context happily" |

**Consensus is not the target.** Consensus means everyone agrees, which usually means the decision was
too small to matter. What you want is **commitment** — people who lost the argument still doing the work
properly, because the process was fair even though the outcome was not theirs.

## Three Worked Answers

### Leading a project

**Question:** "Tell me about a time you led a team."

```text
SITUATION: We were splitting a monolithic e-commerce platform into
services. Six engineers, two of them in their first year, six months.

TASK: I owned the technical direction and the sequence — which service
came out first and who took it. No line management.

ACTION: I sequenced by blast radius rather than by size, which was the
argument I had to win. The team wanted to start with checkout because it
was the worst code. I chose the notifications service instead: nothing
depended on it, so if the extraction pattern was wrong we would learn
that on a service nobody's revenue touched. I wrote the first extraction
myself as the reference, then paired each junior engineer with a senior
one on the next two. When the shared-database migration stalled, I stopped
the sprint for a day and ran a working session rather than letting three
people debug it separately.

RESULT: Migration finished two weeks early with no downtime, and p95 API
latency fell 40%. Two of the juniors ended up owning services outright.
The notifications-first decision is the part I would defend hardest —
the extraction pattern was wrong, we found out in week two, and it cost
us nothing.
```

Note where the reasoning sits. The Action explains **why** the unpopular sequencing was right, and the
Result admits the pattern was wrong. That combination is what reads as senior.

### The unpopular call

**Question:** "Tell me about a decision your team disagreed with."

```text
SITUATION: Three weeks from a mobile launch, QA found the two most
requested features were the cause of a memory leak that crashed older
Android devices.

TASK: Ship late with everything, or ship on time without the two
features the team had spent a month on. Mine to call.

ACTION: I put the crash data in front of the team before I proposed
anything — session length by device tier, and the estimate to fix
properly, which was four weeks not three. Then I proposed cutting both
features and said plainly that I was the one deciding it. I committed
to two things in the same meeting: the cut features were first in the
next release, and I would take the conversation with the stakeholders
myself rather than letting the team absorb it.

RESULT: We shipped on time and stable. The features landed a month
later on a base that could carry them. What I got wrong was the timing
of the conversation — I had the crash data for two days before I raised
it, because I wanted a recommendation ready. That cost the team two days
they could have used.
```

### Disagreeing with someone senior

**Question:** "Tell me about a time you disagreed with your manager."

```text
SITUATION: My engineering manager wanted a third-party analytics SDK
added to the checkout flow before Black Friday.

TASK: I thought the risk was wrong for that week, and he had already
told the business it was happening.

ACTION: I did not argue about the SDK. I asked what the decision was
actually for, and the answer was attribution data for the campaign
spend — which we could get from server-side events we already emitted.
So I brought a proposal rather than an objection: server-side
attribution before Black Friday, client SDK in December behind a flag.
I put the checkout bundle-size and third-party-error numbers in the
doc so the risk was a figure, not my opinion.

RESULT: We shipped server-side attribution in four days. The SDK went
in during December and, as it turned out, added 90ms to first input
delay — which we could measure calmly instead of on the busiest day of
the year.
```

⚠️ Notice that none of the three answers has a villain. An answer where the other party is
unreasonable is scored as a story about you, and not favourably.

## Interest, Not Position

The move that unlocks most disagreements is separating what someone is asking for from what they need.

| Position                | The interest underneath                | What that opens up                             |
| ----------------------- | -------------------------------------- | ---------------------------------------------- |
| "We must use MongoDB"   | Schema flexibility for a model in flux | JSONB columns, a schemaless table, or Mongo     |
| "This can't slip"       | A commitment already made externally   | A reduced scope that honours the commitment     |
| "Rewrite it"            | The code is unsafe to change           | Tests and seams first, rewrite later or never   |

Ask "what would this need to do for you?" and the argument usually stops being about the technology.

## Feedback and Bad News

Two situations that come up in almost every senior loop, and both have a shape.

**Feedback uses SBI** — situation, behaviour, impact. It works because it never mentions the person's
character:

```text
Situation: "In last week's PR for the payment service…"
Behaviour: "…the variables were named x, tmp and data1, with no
            comments on the two branching functions…"
Impact:    "…and it took me about two hours to follow the flow while
            debugging. Two other reviewers said the same."
```

Then stop and ask. "What is your thinking when you name things?" turns a verdict into a conversation,
and the answer is often something you did not know — in this case that the team had never written its
naming conventions down.

**Bad news uses BLUF** — bottom line up front, then options:

| Step             | What you do                                                | Why                                            |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| Lead with it     | "We cannot ship the feature as designed for the conference" | Burying it costs you the credibility you need   |
| State the fact   | What broke, when you found out, what you missed             | Excuses read as unreliability                   |
| Bring options    | Two or three, with a recommendation                         | The stakeholder's job is deciding, not inventing |
| Own the follow-up | Who tells whom, and by when                                 | The part people remember a month later          |

The counter-intuitive result is that bad news delivered this way **builds** trust, because it proves you
will say it next time too.

## Common Mistakes

| ❌ Mistake                                             | ✅ Fix                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| "I single-handedly saved the project"                   | "I led a team that delivered it" — then be specific about your part            |
| "My teammate messed up, so I fixed it"                  | "I helped a struggling teammate get there" — blame is the loudest red flag     |
| "I reviewed every line of code"                          | "I set up the review process" — the first is micromanagement, not leadership    |
| "I dropped it to keep the peace"                          | Name the conversation you had. Avoidance is scored as a missing skill           |
| "I escalated to my manager"                               | Escalation is fine **after** a direct attempt. Say you tried the 1:1 first      |
| Describing the other person's personality                 | Describe the positions. "We disagreed on the approach", not "he was difficult"  |
| A conflict story with no resolution                        | End on what the relationship looks like now. That is the actual question        |

## 🔑 Key Takeaways

- Every question in this category asks what happened when two people wanted different things.
- Without authority, the tools are agreed criteria, evidence, and going first yourself.
- Aim for commitment rather than consensus — people who lost the argument still doing the work well.
- Separate a position from the interest underneath it and most technical arguments dissolve.
- Feedback is SBI and bad news is BLUF; neither ever comments on the person.

## Interview Questions

**Q: How do you know when to compromise and when to hold the line?**

Hold the line on anything you would have to defend in an incident review — data loss, security,
irreversible migrations. Compromise on everything reversible, which is most things. Saying it that way
shows you have a rule rather than a temperament, and it gives the interviewer a follow-up to probe.

**Q: What if the conflict never got resolved?**

Say so. "We never agreed; he still thinks the abstraction was premature. We shipped mine because it was
my service, and I asked him to review the interface so his concern was at least recorded." Unresolved
disagreements are normal at senior level and pretending otherwise is less believable than the truth.

**Q: You are the most senior engineer but not the lead. The lead makes a call you think is wrong. What now?**

State the disagreement once, in writing, with the risk quantified — then commit fully and visibly. The
written part matters because it makes the trade-off recoverable later without anyone needing to
remember a conversation. Undermining the decision afterwards is the answer that fails the round.

**Q: When is mentoring the wrong thing to offer?**

When the problem is not skill. Someone missing deadlines because their tasks have no clear success
criteria does not need a mentor, they need the task rewritten. Reaching for mentorship reflexively is a
tell that you have not diagnosed the cause.

## What to Read Next

- [Chapter ?? — The STAR Framework and the Story Bank](#ch-star-framework) — the structure these answers use
- [Chapter ?? — Problem Solving, Challenges and Failure](#ch-problem-solving) — the other half of the behavioural loop
- [Chapter ?? — Engineering Culture](#ch-engineering-culture) — the practices that make these conversations routine rather than brave
