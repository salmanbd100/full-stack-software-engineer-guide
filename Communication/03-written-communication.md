---
title: Written Communication
part: 9
chapter: 0
slug: written-communication
level: intermediate # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-02
tags: [communication, written, adr, runbook, code-review, async]
in_book: true
---

# Written Communication {#ch-written-communication}

> Write the documents a senior engineer is judged on — the pull request, the decision record, the runbook, and the note that unblocks a decision across time zones.

**In this chapter:** where a document belongs · pull requests and review comments · decision records · runbooks · deciding asynchronously · comments that earn their place

## 💡 The Core Idea

Writing is the only part of your work that operates while you are asleep, and at senior level most of
your influence arrives that way. A design that persuades in a meeting persuades six people. The same
design written down persuades the team that joins next year.

The failure mode is almost never prose quality. It is **putting the content in the wrong place** — a
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
arrives, the answer belongs in a document and the chat reply should be a link to it.

## Pull Requests

A pull request description is a persuasive document with a deadline. The reviewer has fifteen minutes
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

Five things make the difference, and none of them is length:

| ✅ Do                                             | ❌ Don't                                        |
| ------------------------------------------------- | ----------------------------------------------- |
| A title that says what changed                     | "misc fixes", "updates"                          |
| Explain **why**, and name the rejected alternative | Restate the diff in prose                        |
| Before/after screenshots for any UI change          | Make the reviewer run it to see it               |
| Keep it under ~400 lines                           | Send 1,000 lines and hope                        |
| Name the one thing you want scrutinised            | Leave the reviewer to guess where the risk is    |

## Review Comments

Every comment carries a severity, the problem, and a suggestion. The severity is what stops authors
treating a spelling note as a blocker.

```text
Blocking — SQL injection

User input is interpolated into the query string, so any input can
execute SQL. Use a parameterised query:

    await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```

```text
Non-blocking — consider useMemo

This filter runs on every render. Over ~500 items it will jank on
low-end devices. Not blocking at current list sizes, but worth a
ticket as the list grows.
```

```text
Nit — "recieve" → "receive" on line 45
```

**Receiving feedback well is the same skill inverted.** Three responses cover almost everything: accept
and say what you changed, ask for the reasoning, or disagree with a reason and an offer:

```text
"Good catch — parameterised now."

"I'd like to understand the concern before I change it. Is it the
allocation, or the readability?"

"I chose this because the two callers need different error shapes.
The alternative duplicates the parser. Happy to talk it through if
you still think the duplication is cheaper."
```

⚠️ "This works fine" and "I don't think that's a problem" end the conversation without resolving it.
Either the objection is answered or the code changes — those are the two exits.

## Architecture Decision Records

The highest-value document on a long-lived codebase and the most neglected. An ADR is short, written
once, and **never edited** — a decision that changes gets a new record superseding it.

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
question is always "did they know about X?", and an ADR answers it in thirty seconds — which is the
difference between a team that can revisit a decision and one that can only inherit it.

## Runbooks

The document that matters most at 3am, and the one judged by entirely different criteria.

| Requirement                          | Why                                          |
| ------------------------------------ | -------------------------------------------- |
| Exact, copy-pasteable commands        | Nobody should improvise under pressure        |
| A verification step after each action | Answers "how do I know it worked?"            |
| A rollback for each action            | Every step has to be reversible               |
| A "last tested" date                  | Separates a real runbook from a theoretical one |
| What it does **not** cover            | Stops it being applied to the wrong incident  |
| Linked from the alert itself          | Found in seconds rather than searched for     |

```yaml
annotations:
  summary: "Checkout API p99 latency above SLO"
  description: "p99 is {{ $value }}s, SLO is 0.8s"
  runbook_url: "https://github.com/acme/platform/blob/main/runbooks/checkout-latency.md"
```

> ⚠️ **An untested runbook is worse than no runbook,** because it is trusted. Exercise them
> deliberately and put the date at the top.

## Deciding Asynchronously

Most teams span time zones, which turns writing quality into a delivery constraint. The pattern that
stops a decision stalling for a week is an explicit deadline with a stated default.

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

Conclusion first, then the decision, the deadline, and the context the reader lacks. Default to a public
channel over a direct message: the same answer helps one person once in a DM, and everyone who searches
for it later in a channel.

A longer proposal — an RFC or design document — is the same shape expanded: summary, problem, proposal,
alternatives with the reason each was rejected, risks with mitigations, success metrics, and the open
questions you actually want answered. If the alternatives section is empty, it is not a proposal, it is
an announcement.

## Comments That Earn Their Place

```typescript
// ❌ Restates the code — delete it
// Increment counter
counter++;

// ✅ Explains a constraint the code cannot show
// Step by 2: odd indices hold metadata, not data
counter += 2;

// ✅ Explains why this algorithm, not what it does
// Binary search, not linear: events are guaranteed sorted by timestamp.
// O(log n) vs O(n); cost is maintaining sort order on insert.
function findEventByTime(events: Event[], targetTime: number): Event | null {
  // …
}

// ✅ A TODO someone can act on
// TODO(salman): remove once the new API client migration lands — JIRA-1234
```

An unowned, undated `TODO` is a comment that will outlive the codebase. Put a name and a ticket on it
or delete it.

## 🔑 Key Takeaways

- Most documentation failures are the wrong home, not bad prose; technical docs live with the code.
- A pull request description explains why and names the alternative you rejected.
- Every review comment carries a severity, or authors treat every note as a blocker.
- An ADR is valuable for its context and rejected alternatives, not for the decision itself.
- An asynchronous decision needs a deadline and a stated default, or it waits a week.

## Interview Questions

**Q: What makes a pull request easy to review?**

Size first — under about 400 lines, because review quality collapses past that regardless of the
reviewer. Then a description that gives the reviewer the *why* and points at the part you are least
sure of. Reviewers find more defects when they know where to look, and that is the author's job.

**Q: Your team has no ADRs. How do you introduce them without a process mandate?**

Write one, for the next decision that comes up, and link it from the pull request that implements it.
Nobody adopts a template; people adopt a thing that answered a question for them. The second time
someone asks "why is it like this?" and you paste a link, you have the argument without needing to make it.

**Q: When is writing it down the wrong call?**

When the decision is cheap and reversible. A document has a maintenance cost and a stale document is
worse than none, so a choice you would happily remake in an afternoon does not need a record. Reserve
them for decisions that are expensive to revisit.

**Q: How do you disagree with a reviewer in writing without it escalating?**

Give the reasoning, name what the alternative costs, and offer a conversation. The offer matters — it
signals you are not trying to win by having the last comment. If it takes more than two rounds in
writing, the medium is wrong and a fifteen-minute call is the answer.

## What to Read Next

- [Chapter ?? — Technical Communication](#ch-technical-communication) — the spoken counterpart of the same skill
- [Chapter ?? — Engineering Culture](#ch-engineering-culture) — the review and on-call practices these documents serve
- [Chapter ?? — Branching and Review Workflow](#ch-branching-and-review-workflow) — the mechanics around the pull request
