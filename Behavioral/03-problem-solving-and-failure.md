---
title: Problem Solving, Challenges and Failure
part: 9
chapter: 0
slug: problem-solving
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-02
tags: [behavioral, problem-solving, failure, debugging, pressure]
in_book: true
---

# Problem Solving, Challenges and Failure {#ch-problem-solving}

> Show a method rather than a hero story, and prove that your failures changed a system rather than a mood.

**In this chapter:** what the category measures · the debugging narrative · two worked answers · what a failure story has to contain · working under pressure · the red flags

## 💡 The Core Idea

These questions look like two categories and are really one. "Tell me about a hard problem you solved"
and "tell me about a time you failed" both ask whether you have a **method** — something you would do
again on a problem you have not seen. The first asks you to describe it working. The second asks you to
describe it after it did not.

The trap in both is the same. A candidate tells the story as a sequence of events, and the interviewer
cannot tell whether the outcome came from judgement or from luck.

> Narrate the decisions, not the timeline. "Then I noticed…" is luck. "The logs told me it was regional,
> so I stopped looking at the file parser" is method.

## How It Works

Every good debugging answer is the same four beats, whatever the bug was.

| Beat            | What you say                                       | What it proves                              |
| --------------- | -------------------------------------------------- | ------------------------------------------- |
| **Observe**     | The signal, and what it ruled out                   | You gather before you guess                  |
| **Hypothesise** | Two or three candidates, ordered by cheapness to test | You are not attached to your first idea    |
| **Test**        | The one experiment that separated them              | You can design a discriminating test        |
| **Prevent**     | What now catches this class of bug                  | The senior half of the answer                |

The fourth beat is the one candidates drop, and it is the one that separates levels. Fixing the bug is
the job. Making the bug's whole class visible next time is the seniority.

**The five whys, run properly, lands on a process rather than a line of code:**

```text
Why did the service crash?          → Memory overflow
Why did memory overflow?            → Unbounded cache
Why was the cache unbounded?        → No eviction policy set
Why was no policy set?              → The default was assumed to have one
Root cause: no config validation in the deploy pipeline
```

Notice the answer is "our pipeline does not check this", not "someone forgot". A root cause you can
blame on a person is a symptom you have stopped early.

## Two Worked Answers

### The hard bug

**Question:** "Describe a difficult issue you debugged."

```text
SITUATION: We shipped CSV upload for enterprise customers. Within a day,
roughly 15% of uploads failed — the same file would work for one customer
and fail for another, and it never reproduced in staging.

TASK: Find out why identical input produced different outcomes, with a
generic error message as the only signal.

ACTION: The logs had nothing useful, so I looked at what the failing
accounts had in common rather than what the files had in common. Every
failure was outside North America. That killed the two hypotheses I
started with — encoding and date parsing — because neither is regional
in that way. Latency was the third, and it was the cheapest to test: I
reproduced it through a VPN in twenty minutes. Upload and parse ran
synchronously inside one request against a 30-second API timeout, so the
variable was the customer's round-trip time, not their data. I moved the
upload straight to S3 from the browser and made parsing a background job.

RESULT: Success rate went from 85% to 99.7%, and perceived time from 45
seconds to 8. The part I would keep is the prevention: we added response-
time monitoring split by region, because the reason this took two days was
that every dashboard we had averaged the world together.
```

### The failure

**Question:** "Tell me about a time you failed."

```text
SITUATION: Second year in, I was given my first solo project — rebuilding
the internal tool the support team used for tickets. Three months.

TASK: Requirements, design, build, ship. Target was 30% off ticket
resolution time.

ACTION: I got this wrong in three ways and they compounded. I assumed I
understood the requirements because I had watched the team use the old
tool. I chose a stack I wanted to learn rather than the one the team
could maintain. And I worked alone for six weeks because I wanted the
demo to be impressive. When I did demo in week ten, the support team
told me it was missing the bulk-actions they lived in all day.

RESULT: The project was shelved and restarted by someone else. It cost
about £30k and the support team kept the old tool for another four
months. What changed afterwards was specific, not attitudinal: I now
demo in week one with something unusable, because the only purpose of
the first demo is to be wrong cheaply. On the next project that caught
a wrong assumption about permissions in the first fortnight.
```

⚠️ The failure answer names three mistakes and does not soften any of them. A single vague mistake with
a long redemption arc reads as rehearsed; three specific ones read as someone who actually thought
about it.

## What a Failure Story Must Contain

| Element                      | Why it is scored                                                    |
| ---------------------------- | ------------------------------------------------------------------- |
| A real cost                  | Money, time, a customer, a person's quarter. No cost, no failure     |
| Your decision as the cause   | "The requirements changed" is a story about someone else             |
| The systemic change          | What now makes this failure impossible, or at least visible          |
| Evidence the change stuck    | "On the next project it caught X" — otherwise it is a good intention |

Three answers to avoid entirely, because interviewers hear them weekly and score them as evasion:

| ❌ The non-answer                          | Why it fails                                                     |
| ------------------------------------------ | ---------------------------------------------------------------- |
| "I care too much about code quality"       | A strength in costume. It answers a question nobody asked         |
| "I trusted a teammate who let me down"     | Blame with extra steps                                            |
| "I once missed a typo in a config"         | Too small to have taught you anything                             |

## Working Under Pressure

The pressure question is really about **triage**, and the answer has to contain an explicit ranking rule
or it is just a description of stress.

| When everything is urgent            | The rule                                                      |
| ------------------------------------ | ------------------------------------------------------------- |
| Production is affected               | Stop the bleeding first, understand later. Mitigation before diagnosis |
| Two incidents at once                | Rank by whether the damage is still growing, not by severity   |
| A deadline cannot hold               | Say so on the day you know, not the day it is due             |
| Everything is "P1"                   | Ask what breaks if each one slips a day. One of them survives  |

Calm is not the signal. The signal is that you reduced the number of things in play.

## Common Mistakes

| ❌ Mistake                                            | ✅ Fix                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------- |
| "I noticed it might be X so I changed it"              | Say what evidence pointed at X. Guess-and-check is scored as guessing      |
| Narrating a timeline instead of decisions              | Every step gets a "because". That is the whole answer                      |
| Stopping the answer at the fix                          | Add the prevention. Half the marks for this category are in that sentence  |
| "I solved it myself without asking anyone"              | Isolation is not a virtue at senior level. Say who you pulled in and why   |
| A failure with no measurable cost                       | Pick a different failure. An interviewer cannot score a near miss          |
| The root cause is a person                              | Keep asking why until it is a process. That is the point of the technique  |
| "It was stressful but I stayed calm"                    | Describe what you cut. Calm without triage is not evidence of anything     |

## 🔑 Key Takeaways

- Hard-problem and failure questions both test whether you have a repeatable method.
- The four beats are observe, hypothesise, test, prevent — and prevent is the one that reads as senior.
- A root cause that blames a person is a symptom; keep asking why until it is a process.
- A failure story needs a real cost, your decision as the cause, and evidence the fix stuck.
- Under pressure the scored signal is triage — what you removed from the list, not how calm you sounded.

## Interview Questions

**Q: What if your hardest technical problem is not that impressive?**

Tell it anyway, and be precise about the method. A well-narrated cache-invalidation bug scores above a
badly narrated distributed-systems story, because the interviewer can only score what they can follow.
Reaching for scale you did not have collapses on the first follow-up question.

**Q: You are asked for a failure and every real one was partly someone else's fault. What do you say?**

Take your part of it and describe only that. "The API contract changed without notice — and I had built
against it without a contract test, which was mine to add" is honest about both halves without spending
the answer on the other party.

**Q: When is the right answer to stop debugging?**

When the cost of continuing exceeds the cost of the workaround, and you can say what the workaround
costs. Senior engineers ship a mitigation with a ticket attached more often than they find root causes
under time pressure, and saying so is a strength if you name what you deferred.

**Q: How do you tell a "risk that did not pay off" story without looking reckless?**

Show the risk was bounded before you took it. A staged rollout, a flag, a rollback plan, and a metric
that would tell you it was failing. Then the story is about a bounded experiment returning a negative
result, which is a normal engineering outcome rather than a lapse in judgement.

## What to Read Next

- [Chapter ?? — The STAR Framework and the Story Bank](#ch-star-framework) — the structure and the time budget
- [Chapter ?? — Leadership, Teamwork and Conflict](#ch-leadership-teamwork) — the other half of the behavioural loop
- [Chapter ?? — Engineering Culture](#ch-engineering-culture) — blameless post-mortems, which is this chapter as a practice
