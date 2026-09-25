---
title: Leadership, Influence and Saying No
part: 9
chapter: 3
slug: leadership-teamwork
level: advanced # beginner | intermediate | advanced
reading_time: 13
updated: 2026-09-25
tags: [behavioral, leadership, conflict, influence, scope, feedback, stakeholders]
in_book: true
---

# Leadership, Influence and Saying No {#ch-leadership-teamwork}

> Show that people follow your technical judgement, disagree without spending the relationship, and turn a refusal into a trade the other person can choose.

**In this chapter:** leading without authority · interest, not position · the trade instead of the refusal · two worked answers · escalating and the flat no · feedback and bad news

## 💡 The Core Idea

Every question in this category is the same question: **when you and another person wanted different
things, what happened?** Leadership questions ask it about a team. Conflict questions ask it about one
person. "Tell me about a time you pushed back" asks it about someone who owns a decision you think is
wrong.

The interviewer does not need the project's history. They need the moment two positions met, what you
did about it, and whether the other person would work with you again.

Pushing back is the version candidates most often misread. They hear a question about assertiveness.
It is a question about whether **you make costs visible to the person who owns the decision.** "No, we
can't do that in three weeks" is a refusal, and it moves the argument to whether you are right. "We can
do it in three weeks without the audit trail, or in five with it — which do you want?" is a **trade**,
and it moves the decision to the person whose decision it is.

> Senior candidates are not scored on being right. They are scored on how they behaved while being right,
> and on what they did the times they were not.

## How It Works

Most senior engineers lead without a reporting line. Nobody has to do what you say, so the only tools
are the ones that survive being refused.

| Instead of      | You have             | What the answer sounds like                                        |
| --------------- | -------------------- | ------------------------------------------------------------------ |
| Authority       | A stated criterion   | "We agreed on the criteria before anyone presented an option"       |
| Escalation      | Evidence             | "I spiked both approaches for a day rather than arguing about them" |
| Being the lead  | Being the first user | "I migrated my own service first so the cost was measurable"        |
| Consensus       | Commitment           | "Two people still preferred Redux, and both shipped Context happily" |

**Consensus is not the target.** Consensus means everyone agrees, which usually means the decision was
too small to matter. What you want is **commitment** — people who lost the argument still doing the work
properly, because the process was fair even though the outcome was not theirs.

### Interest, not position

The move that unlocks most disagreements is separating what someone asks for from what they need.

| Position                | The interest underneath                | What that opens up                             |
| ----------------------- | -------------------------------------- | ---------------------------------------------- |
| "We must use MongoDB"   | Schema flexibility for a model in flux | JSONB columns, a schemaless table, or Mongo     |
| "This can't slip"       | A commitment already made externally   | A reduced scope that honours the commitment     |
| "Rewrite it"            | The code is unsafe to change           | Tests and seams first, rewrite later or never   |

Ask "what would this need to do for you?" and the argument usually stops being about the technology.

### The trade instead of the refusal

| Instead of | Say | Why it works |
| ---------- | --- | ------------ |
| "That's not possible in the time" | "Here are two versions and what each costs" | A decision instead of a wall |
| "That's tech debt, we should fix it first" | "This adds about a day per feature; here is the quarter's cost" | A number they can weigh against their own |
| "That's a bad idea" | "What does this need to achieve? There may be a cheaper way" | Separates the goal from the implementation |
| "We don't have capacity" | "Taking this means X slips. Is that the trade you want?" | Names what is given up |

The rule under all four: **you do not own the priority, you own the estimate and the risk.**

Time, scope and quality are the three levers people call negotiable. Time is usually fixed by a
contract, a regulation or a conference. Quality can be borrowed for weeks, never for months. **Scope is
the one that really moves**, so the skill is splitting a request into something shippable. "The
reporting dashboard by the 30th" does not move as a unit. "The three charts the regulator asks for by
the 30th, and the query builder next sprint" usually does.

> ⚠️ Borrowing quality is a legitimate move only with a stated repayment date, in writing. "We skip the
> migration tests to hit the 30th, and I add them in the first week of February" is a trade. The same
> sentence without the second half is how a codebase gets its reputation.

## Two Worked Answers

### Disagreeing with someone senior

**Question:** "Tell me about a time you disagreed with your manager."

```text
SITUATION: My engineering manager wanted a third-party analytics SDK
added to the checkout flow before Black Friday.

TASK: I thought the risk was wrong for that week, and he had already
told the business it was happening.

ACTION: I did not argue about the SDK. I asked what the decision was
for, and the answer was attribution data for the campaign spend — which
we could get from server-side events we already emitted. So I brought a
proposal rather than an objection: server-side attribution before Black
Friday, the client SDK in December behind a flag. I put the checkout
bundle-size and third-party-error numbers in the doc, so the risk was a
figure, not my opinion.

RESULT: We shipped server-side attribution in four days. The SDK went
in during December and added 90ms to first input delay — which we could
measure calmly instead of on the busiest day of the year.
```

### The deadline that cannot move

**Question:** "Tell me about a time you pushed back on a deadline."

```text
SITUATION: A public-sector client had a launch date fixed by a funding
deadline. Six weeks out, the remaining work was about nine weeks.

TASK: I owned the frontend estimate, the one everyone assumed had slack.

ACTION: I split the remaining scope into what the funding conditions
required and what had been added because it seemed useful — four of the
eleven screens. I put both lists on one page with an estimate against
each, and took it to the client's product lead rather than my own
manager, because the decision was theirs. Two options: required scope on
the date, or everything three weeks late. I said which one I would pick,
and that I would support either.

RESULT: They took the reduced scope and we hit the date. Two of the four
deferred screens were never asked for again. The one-page document
became how that client ran its next two releases.
```

Neither answer has a villain — an unreasonable other party is scored as a story about you. Both put the
reasoning in the Action. And the second says what happened to the deferred work, which is the evidence
the trade was real rather than a quiet way of dropping things.

## When the Decision Goes Against You

**Disagreeing about value, not cost.** When you think a feature will not be used, you are not
negotiating cost — you are disagreeing about value, which is not your call. The move that works is
**making the experiment cheaper rather than winning the argument**: "let us build the three-day version
behind a flag for 10% of users." You have stopped defending a prediction and started proposing a way to
find out.

**Disagree and commit, visibly.** Say once, clearly, what you think and why — in writing, with the risk
quantified, so the trade-off can be recovered later. Then build it properly and do not reopen it in
standups. An engineer who half-builds something to prove a point is the outcome interviewers probe for.

**Escalate without going around someone.** Escalation reads as mature or political depending on one
thing: whether the person you escalate past knew you were going to.

```text
Raise it with them directly, once, with the specifics
    ↓  unresolved
Tell them you are taking it up, and what you will say
    ↓
Escalate — with their position represented fairly
```

The middle step is the whole answer. Most candidates skip from step one to step three.

**The three cases where a flat no is correct.** Almost everything is a trade. These are not:

| Case | Why there is no trade |
| ---- | --------------------- |
| **Legal or regulatory** | Consent handling or an accessibility obligation is not a scope decision — see [Chapter ?? — Why Accessibility, and the Law](#ch-accessibility-and-the-law) |
| **Safety or user harm** | A data exposure has no version that is 60% shipped |
| **Something you would have to misrepresent** | If holding the line needs the record to be wrong, the answer is no |

State these as constraints, not opinions, put them in writing, and escalate straight away. A legal
requirement framed as a preference gets traded away by someone who did not know it was fixed.

## Feedback and Bad News

**Feedback uses SBI** — situation, behaviour, impact — and never mentions the person's character: "In
last week's payment PR, the variables were named x, tmp and data1, and it took me two hours to follow
the flow." Then stop and ask: "What is your thinking when you name things?" The answer is often something you did
not know — here, that the team had never written its naming conventions down.

**Bad news uses BLUF** — bottom line up front. Lead with it ("we cannot ship this for the conference"),
state what broke and what you missed, bring two or three options with a recommendation, and say who
tells whom by when. Bad news delivered this way **builds** trust, because it proves you will say it next
time too.

## Common Mistakes

| ❌ Mistake                                             | ✅ Fix                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------- |
| "I single-handedly saved the project"                   | "I led a team that delivered it" — then be specific about your part            |
| "I dropped it to keep the peace"                        | Name the conversation you had. Avoidance is scored as a missing skill           |
| A no with no alternative                                | Two options and a recommendation, always                                        |
| "We don't have capacity"                                | Name what specifically slips, and let them choose                               |
| Escalating without telling the person first             | Raise it directly, say you are taking it up, represent their position fairly    |
| Describing the other person's personality               | Describe the positions. "We disagreed on the approach", not "he was difficult"  |
| A conflict story with no ending                         | End on what the relationship looks like now. That is the actual question        |

## 🔑 Key Takeaways

- Every question in this category asks what happened when two people wanted different things.
- Without authority, the tools are agreed criteria, evidence, and going first yourself — and the target is commitment, not consensus.
- Pushing back means making costs visible to the decision's owner; you own the estimate and the risk, not the priority.
- Scope is the lever that really moves, so splitting the request into something shippable is the work.
- Escalation is mature only if you told the person first, and legal, safety and integrity issues are constraints, not trades.

## Interview Questions

**Q: How do you know when to compromise and when to hold the line?**

Hold the line on anything you would have to defend in an incident review — data loss, security, a
legal obligation, an irreversible migration. Compromise on everything reversible, which is most things.
Saying it that way shows you have a rule rather than a temperament.

**Q: What if the conflict never got resolved?**

Say so. "We never agreed; he still thinks the abstraction was premature. We shipped mine because it was
my service, and I asked him to review the interface so his concern was recorded." Unresolved
disagreements are normal at senior level, and pretending otherwise is less believable.

**Q: How do you get technical debt prioritised when nobody wants to fund it?**

Convert it into the currency the decision is made in. "The auth module is a mess" competes with
nothing; "every feature touching auth takes a day longer, and four of next quarter's six touch it"
competes with the roadmap. If it still loses, that is a legitimate outcome — someone else's numbers were
bigger.

**Q: You think a feature is a waste of effort and you have been told to build it. What do you do?**

Say once what I think and why, and ask what evidence would change my mind. Then try to make being wrong
cheap — the three-day version behind a flag for a slice of users — so the disagreement becomes something
we can settle. If the full build is still the decision, I build it properly.

**Q: When is mentoring the wrong thing to offer?**

When the problem is not skill. Someone missing deadlines because their tasks have no clear success
criteria does not need a mentor; they need the task rewritten. Reaching for mentoring by reflex shows
you have not diagnosed the cause.

## What to Read Next

- [Chapter ?? — The STAR Framework and the Story Bank](#ch-star-framework) — the structure these answers use
- [Chapter ?? — Problem Solving, Challenges and Failure](#ch-problem-solving) — the other half of the behavioural loop
- [Chapter ?? — Written Communication](#ch-written-communication) — the one-page document that makes a trade decidable
