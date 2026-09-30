---
title: Written Communication
part: 9
chapter: 8
slug: written-communication
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-02
tags: [communication, written, adr, runbook, code-review, async]
in_book: true
---

# Written Communication {#ch-written-communication}

> Write the documents a senior engineer is judged on — the pull request, the decision record, the runbook, and the note that unblocks a decision across time zones.

**In this chapter:** where a document belongs · pull requests and review comments · decision records · runbooks · deciding asynchronously

## 💡 The Core Idea

Writing is the only part of your work that keeps working while you are asleep. At senior level, most of
your influence arrives that way. A design that persuades in a meeting persuades six people. The same
design written down persuades the team that joins next year.

The failure mode is almost never prose quality. It is **putting the content in the wrong place**: a
deploy procedure in a chat thread, a decision in someone's memory, an API contract in a wiki table.

| Content                        | Right home                        | ❌ Wrong home              |
| ------------------------------ | --------------------------------- | -------------------------- |
| How to deploy                  | A runbook in the repository        | A wiki page from 2022      |
| Why we chose this database     | A decision record in the repository | Someone's memory          |
| An incident timeline           | The post-mortem document           | A chat thread              |
| The API contract               | The OpenAPI spec                   | A table in a wiki          |
| Team norms and on-call process | The team handbook                  | Verbal tradition           |

> **Technical documentation lives with the code it describes.** A page in a separate system drifts,
> because updating it is a separate action nobody remembers to take.

⚠️ An answer given in chat is invisible to everyone who was not there. The second time a question
arrives, put the answer in a document and reply in chat with a link to it.

## Pull Requests

A pull request description is a persuasive document with a deadline. The reviewer has fifteen minutes,
and you are competing with their own work.

```text
## Summary
Server-render the reporting dashboard. Closes #482.

## Why
Reports take 4–11s to paint client-side; it is the top complaint in
user interviews. First paint should not wait for the dataset.

## Key decision
Streamed SSR over a client-side worker: the worker fixes jank but not
first paint. Trade-off — the reporting service now carries render load.

## Testing
Chrome, Firefox, Safari. Added a streaming integration test.

## Impact
Bundle −140KB · LCP 5.2s → 1.4s on the p75 report

## For reviewers
Is `ReportShell` the right seam, or should the boundary be per-widget?
```

Length is not what makes the difference. These things do: a title that says what changed, not "misc
fixes". The **why**, with the rejected alternative, not the diff restated in prose. Before and after
screenshots for any UI change. Under about 400 lines. And the one thing you want checked closely, so the
reviewer does not have to guess where the risk is.

## Review Comments

Every comment carries a severity (how much it matters), the problem, and a suggestion. The severity
stops authors treating a spelling note as a blocker.

```text
Blocking — SQL injection

User input is interpolated into the query string, so any input can
execute SQL. Use a parameterised query:

    await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

```text
Non-blocking — consider useMemo

This filter runs on every render. Over ~500 items it will jank on
low-end devices. Not blocking at current sizes, but worth a ticket.
```

**Receiving feedback is the same skill in reverse.** Three responses cover almost everything. Accept
and say what you changed ("good catch, parameterised now"). Ask for the reasoning ("is the concern the
allocation, or the readability?"). Or disagree with a reason and an offer to talk it through.

⚠️ "This works fine" and "I don't think that's a problem" end the conversation without resolving it.
Either the objection is answered or the code changes. Those are the only two exits.

## Architecture Decision Records

This is the highest-value document on a long-lived codebase, and the most neglected. An ADR is short,
written once, and **never edited**. When a decision changes, a new record replaces (supersedes) it.

```text
# ADR-014: Server-side rendering for the reporting dashboard

Status: Accepted — 2026-08-14
Deciders: platform team

## Context
Reports take 4–11s to render client-side because the dataset is large
and the filters are combinatorial. Time to first meaningful paint is
the complaint in every user interview.

## Decision
Render report pages on the server and stream the result.

## Consequences
Positive: first paint no longer waits for the dataset; filter state is
shareable as a URL.
Negative: the reporting service now needs capacity for render load.
Accepted risk: streaming makes error handling harder. We accept a
full-page error for now and revisit if it appears in support volume.

## Alternatives considered
Client-side with a worker — rejected; fixes jank, not first paint.
Precomputed reports — rejected; filters are user-defined.
```

The value is not the decision. It is the **context** and the **alternatives**. Two years later the
question is always "did they know about X?", and an ADR answers it in thirty seconds. That is the
difference between a team that can revisit a decision and one that can only inherit it.

## Runbooks

This is the document that matters most at 3am, and it is judged by entirely different criteria.

| Requirement                          | Why                                          |
| ------------------------------------ | -------------------------------------------- |
| Exact, copy-pasteable commands        | Nobody should improvise under pressure        |
| A verification step after each action | Answers "how do I know it worked?"            |
| A rollback for each action            | Every step has to be reversible               |
| A "last tested" date                  | Separates a real runbook from a theoretical one |
| Linked from the alert itself          | Found in seconds rather than searched for     |

> ⚠️ **An untested runbook is worse than no runbook,** because people trust it. Test your runbooks
> on purpose and put the date at the top.

## Deciding Asynchronously

Most teams span time zones, so writing quality limits how fast you deliver. One pattern stops a
decision stalling for a week: an explicit deadline with a stated default.

```text
Decision needed by Thursday 17:00 UTC — cache layer for the reporting replica

Context: reporting queries are causing p99 spikes on the primary.

Options
  A) Read replica, ~£380/mo — current load with headroom
  B) Smaller replica, ~£190/mo — about 70% utilised at peak
  C) Serverless tier — variable cost, better for spiky load

Recommendation: B. Reporting load is predictable and we can resize online.

Objections by Thursday 17:00 UTC, otherwise I proceed with B.
```

Put the conclusion first, then the decision, the deadline, and the context the reader lacks. Prefer a
public channel to a direct message. In a DM the answer helps one person once. In a channel it helps
everyone who searches for it later.

A longer proposal, such as an RFC or design document, is the same shape expanded. It has a summary, the
problem, the proposal, and the alternatives with the reason each was rejected. Then come risks with
mitigations, success metrics, and the open questions you actually want answered. If the alternatives
section is empty, it is not a proposal. It is an announcement.

## 🔑 Key Takeaways

- Most documentation failures are the wrong home, not bad prose. Technical docs live with the code.
- A pull request description explains why and names the alternative you rejected.
- Every review comment carries a severity, or authors treat every note as a blocker.
- An ADR is valuable for its context and rejected alternatives, not for the decision itself.
- An asynchronous decision needs a deadline and a stated default, or it waits a week.

## Interview Questions

**Q: What makes a pull request easy to review?**

Size first: under about 400 lines, because review quality collapses past that, whoever the reviewer
is. Then a description that gives the reviewer the *why* and points at the part you are least sure
of. Reviewers find more defects when they know where to look, and telling them is the author's job.

**Q: Your team has no ADRs. How do you introduce them without a process mandate?**

Write one, for the next decision that comes up, and link it from the pull request that implements it.
Nobody adopts a template. People adopt a thing that answered a question for them. The second time
someone asks "why is it like this?" and you paste a link, you have the argument without needing to make it.

**Q: When is writing it down the wrong call?**

When the decision is cheap and reversible. A document has a maintenance cost, and a stale document is
worse than none. A choice you would happily remake in an afternoon does not need a record. Keep
records for decisions that are expensive to revisit.

**Q: How do you disagree with a reviewer in writing without it escalating?**

Give the reasoning, name what the alternative costs, and offer a conversation. The offer matters. It
signals you are not trying to win by having the last comment. If it takes more than two rounds in
writing, the medium is wrong and a fifteen-minute call is the answer.

## What to Read Next

- [Chapter ?? — Explaining and Thinking Aloud](#ch-thinking-aloud) — the spoken counterpart of the same skill
- [Chapter ?? — Ways of Working and Engineering Culture](#ch-engineering-culture) — the review and on-call practices these documents serve
- [Chapter ?? — Branching, Review and Repository Strategy](#ch-branching-and-review-workflow) — the mechanics around the pull request
