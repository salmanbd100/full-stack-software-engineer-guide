---
title: Written Communication
part: 9
chapter: 0
slug: written-communication
level: intermediate # beginner | intermediate | advanced
reading_time: 9
updated: 2026-08-29
tags: [communication, written]
in_book: true
---

# Written Communication {#ch-written-communication}

> Write a PR description, a review comment and an RFC that people actually read.

**In this chapter:** PR descriptions · review comments that land · professional email · the RFC template · writing for an async team

## Pull Request Descriptions

### PR Template

```text
## Summary
[One-line description of what this PR does]
Closes #[issue number]

## Changes
- Changed X to Y to improve Z
- Added component W for feature V
- Refactored U for better performance/readability

## Why
[What problem does this solve? Why now?]

## Technical Decisions
### [Key Decision]
Chose [approach] over [alternative] because [reasoning].
Trade-off: [what we gave up].

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing: Chrome, Firefox, Safari
- [ ] Test plan: [steps to verify the change works]

## Impact
- Bundle size: ±XKB
- Lighthouse score: before → after
- Load time: before → after

## Questions for Reviewers
1. Is the abstraction appropriate?
2. Should we add more test coverage for [edge case]?
```

### PR Best Practices

**✅ Do:**
- Write a descriptive title (not "misc fixes")
- Explain WHY, not just WHAT
- Include before/after screenshots for UI changes
- Keep PRs focused (< 400 lines when possible)
- Reference the related issue

**❌ Don't:**
- Submit 1000+ line PRs without splitting
- Skip the description
- Use vague titles like "updates" or "small changes"

---

## Code Review Comments

### Giving Feedback

Structure every comment with severity, the issue, and a suggestion.

```text
**Blocking:** SQL injection risk

User input is interpolated directly into the query string.
This allows arbitrary SQL execution.

Suggestion — use parameterized queries:
```typescript
await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```text
```

```text
**Non-blocking:** Consider useMemo for performance

This filter runs on every render. For lists > 500 items, it could
cause jank on low-end devices.

Suggestion:
```typescript
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
);
```text
Not blocking since current performance is fine — worth tracking as list grows.
```

```text
**Nit:** Typo on line 45: "recieve" → "receive"
```

### Receiving Feedback

**✅ Constructive responses:**
```text
"Great catch! Updated to use parameterized queries."

"Good point on useMemo. Added it — measured 30% fewer renders for large lists."

"I see the concern. I chose this approach because [reasoning]. Happy to jump
on a quick call if you'd like to discuss the trade-off."
```

**❌ Avoid:**
```text
"This works fine."
"I don't think this is a problem."
"Whatever."
```

**When you disagree:**
```text
"I appreciate the feedback. My reasoning for the current approach:
1. [Reason 1]
2. [Reason 2]
The alternative would [trade-off]. For our use case I think this is better
because [justification]. Happy to discuss if you see it differently."
```

---

## Professional Emails

### Subject Line Rules

**❌ Vague:**
- "Question"
- "Interview"
- "Help"

**✅ Specific:**
- "Follow-up: Senior Frontend Engineer Interview — Timeline"
- "Thank you: Interview with Sarah on Dec 7"
- "Question about Senior Frontend Role Start Date"

### Interview Follow-Ups

A thank-you note and a follow-up are the same three sentences: what you discussed that you found
interesting, one concrete reason you are a fit, and a specific question about next steps. Anything
longer reads as anxiety. Send the thank-you within a day, and follow up once, about a week after the
stated timeline passes.

---

## Slack/Chat Communication

### State the Full Question in One Message

**❌ Bad:**
```text
"hey"
[pause]
"are you free?"
[pause]
"I have a question about the PR"
```

**✅ Good:**
```text
"Hi @john — quick question on PR #123. Should the validation throw an
exception or return an error object? I'm leaning toward throwing since
it's an unexpected state. Thoughts?"
```

### Asking for Help

**❌ Bad:**
```text
"My code doesn't work. Help!"
```

**✅ Good:**
```text
"Debugging a 'token expired' error on fresh tokens in the auth flow.

What I've tried:
- Verified token generation timestamp
- Checked server time sync
- Reviewed token validation logic (UserService.ts:45)

Has anyone seen this before? Error reproduces consistently on Safari."
```

---

## Code Comments

Write comments that explain **why**, not what.

```typescript
// ❌ Obvious — delete this
// Increment counter
counter++;

// ✅ Explains a hidden constraint
// Increment by 2: odd indices contain metadata, not data
counter += 2;

// ✅ Explains algorithm choice
// Binary search instead of linear — array is guaranteed sorted by timestamp.
// O(log n) vs O(n). Cost: must maintain sorted order on insert (acceptable).
function findEventByTime(events: Event[], targetTime: number): Event | null {
  // ...
}

// ✅ Useful TODO with context
// TODO(salman): Remove this once the new API client migration is complete.
// Tracked in JIRA-1234
```

**Rules:**
- Comments explain **why**, not what
- Include a name and ticket/PR for TODO/FIXME
- Delete outdated comments — they're worse than no comment

---

## Where a Document Lives

Mismatching the medium to the content is the most common documentation failure — more common than
writing badly.

| Content | Right home | ❌ Wrong home |
| --- | --- | --- |
| How to deploy | Runbook in the repository | A wiki page from 2022 |
| Why we chose this database | Decision record in the repository | Someone's memory |
| An incident timeline | The post-mortem document | A chat thread |
| API contract | The OpenAPI spec | A table in a wiki |
| Team norms and on-call process | Team handbook | Verbal tradition |

**The rule: technical documentation lives with the code it describes.** A page in a separate system
drifts, because updating it is a separate action nobody remembers to take.

> ⚠️ **Answers given in chat are invisible to everyone who was not there.** When the same question
> arrives a second time, the answer belongs in a document and the chat reply should be a link to it.

## Architecture Decision Records

The highest-value document type on a long-lived codebase, and the most neglected. An ADR is short, it
is written once, and it is never edited — a decision that changes gets a new record that supersedes it.

```text
# ADR-014: Server-side rendering for the reporting dashboard

Status: Accepted — 2026-08-14
Deciders: platform team

## Context
Reports take 4–11s to render client-side because the dataset is large and the
filters are combinatorial. Time to first meaningful paint is the complaint in
every user interview.

## Decision
Render report pages on the server and stream the result.

## Consequences
Positive: first paint no longer waits for the dataset. Filter state is
shareable as a URL.
Negative: the reporting service now needs enough capacity for render load.
Accepted risk: streaming makes error handling harder; we accept a full-page
error for now and will revisit if it shows up in support volume.

## Alternatives considered
Client-side with a worker — rejected, does not fix first paint.
Precomputed reports — rejected, filters are user-defined.
```

The value is not the decision. It is the *context* and the *alternatives*: two years later, the
question is always "did they know about X?", and an ADR answers it in thirty seconds.

## Runbooks

The document that matters most at 3am, judged by different criteria from everything else you write.

| Requirement | Why |
| --- | --- |
| Exact, copy-pasteable commands | Nobody should improvise under pressure |
| A verification step after each action | "How do I know it worked?" |
| A rollback for each action | Every step has to be reversible |
| A "last tested" date | Separates a real runbook from a theoretical one |
| What it does **not** cover | Prevents misapplication to the wrong incident |
| Linked from the alert itself | Found in seconds, not searched for |

```yaml
annotations:
  summary: "Checkout API p99 latency above SLO"
  description: "p99 is {{ $value }}s, SLO is 0.8s"
  runbook_url: "https://github.com/acme/platform/blob/main/runbooks/checkout-latency.md"
```

> ⚠️ **An untested runbook is worse than no runbook,** because it is trusted. Exercise them
> deliberately and put the date at the top.

## Writing for a Distributed Team

Most enterprise teams span time zones, which makes writing quality a delivery constraint rather than a
soft skill. The pattern that keeps asynchronous decisions from stalling for a week is an explicit
deadline with a stated default.

```text
Decision needed by Thursday 17:00 UTC: cache layer for the reporting replica

Context: reporting queries are causing p99 spikes on the primary.

Options
  A) Read replica, ~£380/mo — handles current load with headroom
  B) Smaller replica, ~£190/mo — about 70% utilised at current peak
  C) Serverless tier — variable cost, better for spiky load

Recommendation: B. Reporting load is predictable and we can resize online.

Objections by Thursday 17:00 UTC, otherwise I proceed with B.
```

Lead with the conclusion, name the decision and the deadline, and include the context the reader
lacks. Default to a public channel over a direct message: the same answer helps one person once in a
direct message, and everyone who searches for it afterwards in a channel.

## Design Documents (RFCs)

Use this structure for architecture proposals:

```text
# RFC: [Feature Name]
Author: [Name] | Date: [Date] | Status: [Draft / In Review / Approved]

## Summary
[2–3 sentence description]

## Problem
[What's broken or missing? What's the user impact?]

## Proposal
[High-level design + key technical decisions]

## Alternatives Considered
### Option A: [Name]
Pros: [...]
Cons: [...]
Rejected because: [...]

## Trade-offs
- [Performance vs Simplicity]: choosing X now, revisit Y when Z
- [Time to Market vs Completeness]: shipping MVP in Phase 1

## Risks & Mitigations
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DB migration fails | Low | High | Rollback plan + staging test |

## Success Metrics
- [Metric 1]: current → target
- [Metric 2]: current → target

## Open Questions
1. [Question requiring team input]
```

---

## Writing Checklist

Before sending anything:
- [ ] Purpose is clear in the first sentence
- [ ] Concise — every sentence earns its place
- [ ] Spell-checked (Grammarly)
- [ ] Active voice ("I implemented" not "it was implemented")
- [ ] Structured with headers/bullets — no walls of text
- [ ] Clear next action or request

## What to Read Next

- [Chapter ?? — Technical Communication](#ch-technical-communication) — the spoken counterpart of the same skill
- [Chapter ?? — Engineering Culture](#ch-engineering-culture) — the review and on-call practices these documents serve
- [Chapter ?? — Cross-Cultural Communication](#ch-cross-cultural-communication) — writing for readers who do not share your defaults
