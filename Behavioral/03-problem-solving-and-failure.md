---
title: Problem Solving, Challenges and Failure
part: 9
chapter: 4
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

These questions look like two categories but are really one. "Tell me about a hard problem you solved"
and "tell me about a time you failed" both ask whether you have a **method**. A method is something you
would do again on a problem you have not seen. The first question asks you to describe it working. The
second asks you to describe it after it did not.

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
the job. Making the whole class of bug visible next time is what shows seniority.

**The five whys (asking "why?" again at each answer), run properly, lands on a process, not a line of code:**

```text
Why did the service crash?          → Memory overflow
Why did memory overflow?            → Unbounded cache
Why was the cache unbounded?        → No eviction policy set
Why was no policy set?              → The default was assumed to have one
Root cause: no config validation in the deploy pipeline
```

Notice the answer is "our pipeline does not check this", not "someone forgot". If you can blame the
root cause on a person, you stopped too early and found only a symptom.

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

⚠️ The failure answer names three mistakes and does not soften any of them. One vague mistake followed
by a long recovery story sounds rehearsed. Three specific ones sound like someone who actually thought
about it.

## What a Failure Story Must Contain

| Element                      | Why it is scored                                                    |
| ---------------------------- | ------------------------------------------------------------------- |
| A real cost                  | Money, time, a customer, a person's quarter. No cost, no failure     |
| Your decision as the cause   | "The requirements changed" is a story about someone else             |
| The systemic change          | What now makes this failure impossible, or at least visible          |
| Evidence the change stuck    | "On the next project it caught X" — otherwise it is a good intention |

Avoid three shapes. The strength in disguise ("I care too much about code quality"). Blame with extra
steps ("I trusted a teammate who let me down"). And the failure too small to teach anything.

## Working Under Pressure

The pressure question is really about **triage**: deciding what to deal with first. The answer needs a
clear ranking rule. Without one, it is just a description of stress.

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
| A failure with no measurable cost                       | Pick a different failure. An interviewer cannot score a near miss          |
| The root cause is a person                              | Keep asking why until it is a process. That is the point of the technique  |
| "It was stressful but I stayed calm"                    | Describe what you cut. Calm without triage is not evidence of anything     |

## 🔑 Key Takeaways

- Hard-problem and failure questions both test whether you have a repeatable method.
- The four beats are observe, hypothesise, test, prevent. Prevent is the one that reads as senior.
- A root cause that blames a person is a symptom. Keep asking why until it is a process.
- A failure story needs a real cost, your decision as the cause, and evidence the fix stuck.
- Under pressure the scored signal is triage: what you removed from the list, not how calm you sounded.

## Interview Questions

**Q: What if your hardest technical problem is not that impressive?**

Tell it anyway, and be precise about the method. A well-told cache-invalidation bug scores above a
badly told distributed-systems story, because the interviewer can only score what they can follow.
Claiming scale you did not have falls apart at the first follow-up question.

**Q: You are asked for a failure and every real one was partly someone else's fault. What do you say?**

Take your part of it and describe only that. For example: "The API contract changed without notice. I
had built against it without a contract test, and adding one was my job." That is honest about both
halves, and it does not spend the answer on the other party.

**Q: When is the right answer to stop debugging?**

When continuing costs more than the workaround, and you can say what the workaround costs. Under time
pressure, senior engineers more often ship a mitigation with a ticket attached than find the root
cause. Saying so is a strength, as long as you name what you put off.

**Q: How do you tell a "risk that did not pay off" story without looking reckless?**

Show the risk was limited before you took it: a staged rollout, a flag, a rollback plan, and a metric
that would tell you it was failing. Then the story is about a limited experiment that returned a
negative result. That is a normal engineering outcome, not a lapse in judgement.

## What to Read Next

- [Chapter ?? — The STAR Framework and the Story Bank](#ch-star-framework) — the structure and the time budget
- [Chapter ?? — Leadership, Influence and Saying No](#ch-leadership-teamwork) — the other half of the behavioural loop
- [Chapter ?? — Ways of Working and Engineering Culture](#ch-engineering-culture) — blameless post-mortems, which is this chapter as a practice
