---
title: Influence, Scope and Saying No
part: 9
chapter: 0
slug: influence-scope-and-saying-no
level: advanced # beginner | intermediate | advanced
reading_time: 10
updated: 2026-09-08
tags: [behavioral, influence, scope, negotiation, stakeholders, seniority]
in_book: true
---

# Influence, Scope and Saying No {#ch-influence-scope-and-saying-no}

> Turn a refusal into a trade the other person can choose, so "no" reads as judgement rather than obstruction.

**In this chapter:** what the question is really testing · the trade instead of the refusal · a worked answer on a fixed deadline · pushing back on a feature you think is wrong · escalating without going around someone · the three cases where a flat no is correct

## 💡 The Core Idea

The most common senior interview question in this area is some form of *"tell me about a time you had
to push back."* Candidates hear it as a question about assertiveness. It is not. It is a question about
whether **you make costs visible to the person who owns the decision.**

That distinction is the whole chapter. "No, we can't do that in three weeks" is a refusal, and it moves
the argument to whether you are right. "We can do that in three weeks with the audit trail cut, or in
five weeks with it — which do you want?" is a **trade**, and it moves the decision to the person whose
decision it actually is. Same information, completely different outcome.

Two failure modes bracket this, and interviewers are screening for both. Saying yes to everything
signals no judgement and produces a team that misses dates. Saying no easily signals no ownership of
the outcome. What they want is somebody who does neither: who converts pressure into an explicit
choice, and then commits to whichever one is chosen.

## How It Works

### Reframe the refusal as a trade

Four phrasings, and the difference between the columns is what gets you the offer.

| Instead of | Say | Why it works |
| ---------- | --- | ------------ |
| "That's not possible in the time" | "Here are two versions and what each costs" | Gives them a decision instead of a wall |
| "That's tech debt, we should fix it first" | "This adds about a day per feature; here is what it costs over the quarter" | A number they can weigh against their own |
| "That's a bad idea" | "What would this need to achieve? There may be a cheaper way to get it" | Separates the goal from the implementation |
| "We don't have capacity" | "Taking this means X slips. Is that the trade you want?" | Names the thing being given up, by name |

The pattern under all four: **you do not own the priority, you own the estimate and the risk.** Stating
the cost accurately is your job. Choosing to pay it is not.

### Scope is the variable that is actually negotiable

Time, scope and quality are the three things people say are negotiable. In practice one of them is.

| Lever | Reality |
| ----- | ------- |
| **Time** | Usually fixed by something outside engineering — a contract, a regulation, a conference |
| **Quality** | Borrowable for weeks, never for months, and the interest compounds silently |
| **Scope** | The one that genuinely moves, and the one people forget to offer |

So the useful skill is being able to **decompose a request into something shippable**. "The reporting
dashboard by the 30th" is not negotiable as a unit; "the three charts the regulator actually asks for
by the 30th, and the custom-query builder in the following sprint" usually is. An engineer who arrives
with that split has done the work the product manager could not.

> ⚠️ Borrowing quality is a legitimate move and it needs a stated repayment date and a written record.
> "We will skip the migration tests to hit the 30th, and I will add them in the first week of
> February" is a trade. The same sentence without the second half is how a codebase gets its reputation.

### A worked answer: the deadline that cannot move

Interviewers want the STAR shape here, and the result has to include what happened to the thing you
traded away — see [Chapter ?? — The STAR Framework and the Story Bank](#ch-star-framework).

> **Situation.** A public-sector client had a launch date fixed by a funding deadline. Six weeks out, the
> remaining work was about nine weeks.
>
> **Task.** I owned the frontend estimate, and it was the one everybody assumed had slack in it.
>
> **Action.** I split the remaining scope into what the funding conditions actually required and what
> had been added because it seemed useful — that second group was four of the eleven screens. I put
> both lists in a one-page document with an estimate against each, and took it to the client's product
> lead rather than to my own manager, because the decision was theirs. I offered two options: the
> required scope on the date, or everything three weeks late. I said explicitly which one I would pick
> and why, and that I would support either.
>
> **Result.** They took the reduced scope, and two of the four deferred screens were never asked for
> again. We hit the date. The document became how that client ran the next two releases, which is the
> part I would not have predicted.

Three things make that answer land. The scope split is **specific** — four of eleven screens, not
"some non-essentials". The decision went to the person who owned it. And the result includes the
deferred work's fate, because that is what proves the trade was real rather than a way of dropping
things quietly.

### Pushing back on a feature you think is wrong

This is the harder version, because you are not negotiating cost — you are disagreeing about value,
which is not your call.

The move that works is **cheapening the experiment rather than winning the argument.** If you think a
feature will not be used, the productive response is not a better argument; it is "let us build the
version that takes three days instead of three weeks, and put it behind a flag for 10% of users." You
have stopped defending a prediction and started proposing a way to find out — and if you are wrong,
you have lost three days.

When that is not available and the decision goes against you, the standard is
**disagree and commit, visibly.** Say once, clearly, what you think and why. Ask what would change
your mind, and answer the same question about yourself. Then build it properly, and do not litigate
it in standups. An engineer who half-builds something to prove a point is the worst outcome for
everyone, and interviewers ask follow-up questions designed to find that person.

### Escalating without going around someone

Escalation reads as either mature or political depending almost entirely on one thing: whether the
person you are escalating past knew you were going to.

```text
Raise it with them directly, once, with the specifics
    ↓  unresolved
Tell them you are taking it up, and what you will say
    ↓
Escalate — with their position represented fairly
```

That middle step is the whole answer. Skipping it is what makes escalation a betrayal rather than a
process, and saying you would take it is a strong signal in an interview because most candidates skip
straight from step one to step three.

### The three cases where a flat no is correct

Almost everything is a trade. Three things are not, and knowing them is part of the signal.

| Case | Why there is no trade |
| ---- | --------------------- |
| **Legal or regulatory** | Shipping without consent handling or an accessibility obligation is not a scope decision — see [Chapter ?? — Why Accessibility, and the Law](#ch-accessibility-and-the-law) |
| **Safety or user harm** | A data exposure or a security hole has no version that is 60% shipped |
| **Something you would have to misrepresent** | If holding the line requires the record to be wrong, the answer is no |

Here the correct move is different: state it as a constraint rather than an opinion, put it in writing,
and escalate immediately rather than negotiating. Framing a legal requirement as a preference is how it
gets traded away by somebody who did not know it was not tradeable.

## When to Use It

| Situation | Do | Why |
| --------- | -- | --- |
| A date you cannot hit | Offer two scoped options and a recommendation | The date is theirs; the estimate is yours |
| A request that arrives mid-sprint | Name what it displaces, by name | Makes the cost concrete rather than a complaint |
| Technical debt you want funded | Convert it to cost per feature per quarter | A number competes with their numbers |
| A feature you think will not be used | Propose the cheap version behind a flag | Replaces a prediction with evidence |
| A decision that went against you | Disagree and commit, visibly | Half-building it is the worst outcome |
| A legal, safety or integrity issue | A flat no, in writing, escalated | There is no partial version |
| Being asked to commit on the spot | "I will come back with two options this afternoon" | An estimate given under pressure is a guess |

## Common Mistakes

❌ **A no with no alternative.** It reads as obstruction, and moves the conversation to whether you are
right rather than to what to do.
✅ Always two options and a recommendation.

❌ **"We don't have capacity."** Nobody can act on it, and it sounds like a complaint.
✅ Name what specifically slips, and let them choose.

❌ **Arguing about the implementation when the disagreement is about the goal.** You will win the
argument and still build the wrong thing.
✅ Ask what the request needs to achieve first.

❌ **Escalating without telling the person first.** Whatever the outcome, you have spent the
relationship.
✅ Raise it directly, say you are taking it up, and represent their position fairly.

❌ **Borrowing quality with no repayment date.** It is indistinguishable from not caring.
✅ State what is being skipped and when it comes back, in writing.

❌ **Disagreeing and then under-delivering.** Interviewers probe for this specifically.
✅ Commit properly, and be the person who makes the chosen option work.

## 🔑 Key Takeaways

- The question is not whether you can say no; it is whether you make costs visible to the person who owns the decision.
- Time is usually fixed and quality only borrowable, so scope is the lever — and decomposing the request is the work.
- Replace a disagreement about value with a cheaper experiment rather than a better argument.
- Escalation is mature or political depending entirely on whether you told the person first.
- Legal, safety and integrity issues have no partial version, so state them as constraints and escalate rather than negotiate.

## Interview Questions

**Q: Tell me about a time you pushed back on a deadline.**

Give the trade, not the refusal. The structure that scores: what the fixed constraint actually was,
how you split the scope into required and added, the two options you put in front of the person who
owned the decision, and which one you recommended. Then a result that says what happened to the
deferred work — if it was never asked for again, say so, because that is the evidence the split was
real rather than a way of quietly dropping things.

**Q: How do you get technical debt prioritised when nobody wants to fund it?**

By converting it into the currency the decision is made in. "The auth module is a mess" competes with
nothing; "every feature touching auth takes about a day longer, and four of the next quarter's six
features touch it" competes directly with the roadmap. If it still loses, that is a legitimate
outcome — the information was there and someone else's numbers were bigger. The failure mode is
having the argument in engineering language and concluding the business does not care about quality.

**Q: You think a feature is a waste of effort and you have been told to build it. What do you do?**

Say once, clearly, what I think and why, and ask what evidence would change my mind. Then try to make
being wrong cheap — the three-day version behind a flag for a slice of users, rather than the
three-week version — because that turns a disagreement about a prediction into something we can
settle. If the full build is still the decision, I build it properly. Half-building something to prove
a point is worse for the product and worse for me.

**Q: When is "no" the whole answer?**

When there is no partial version: a legal or accessibility obligation, a security or privacy exposure,
or anything where holding the line would mean misrepresenting the state of the system. Those three get
stated as constraints rather than opinions, put in writing, and escalated straight away — because the
real risk is that someone who does not know it is non-negotiable trades it away in good faith.

## What to Read Next

- [Chapter ?? — Leadership, Teamwork and Conflict](#ch-leadership-teamwork) — the influence toolkit this chapter points in the other direction
- [Chapter ?? — The STAR Framework and the Story Bank](#ch-star-framework) — the shape the worked answer above uses
- [Chapter ?? — Written Communication](#ch-written-communication) — the one-page document that made the trade decidable
