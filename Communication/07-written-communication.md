# Written Communication

Master professional writing for pull requests, code reviews, emails, and design documents.

## Pull Request Descriptions

### PR Template

```markdown
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

```markdown
**Blocking:** SQL injection risk

User input is interpolated directly into the query string.
This allows arbitrary SQL execution.

Suggestion — use parameterized queries:
```typescript
await db.query('SELECT * FROM users WHERE id = $1', [userId]);
```
```

```markdown
**Non-blocking:** Consider useMemo for performance

This filter runs on every render. For lists > 500 items, it could
cause jank on low-end devices.

Suggestion:
```typescript
const filtered = useMemo(
  () => items.filter(item => item.active),
  [items]
);
```
Not blocking since current performance is fine — worth tracking as list grows.
```

```markdown
**Nit:** Typo on line 45: "recieve" → "receive"
```

### Receiving Feedback

**✅ Constructive responses:**
```
"Great catch! Updated to use parameterized queries."

"Good point on useMemo. Added it — measured 30% fewer renders for large lists."

"I see the concern. I chose this approach because [reasoning]. Happy to jump
on a quick call if you'd like to discuss the trade-off."
```

**❌ Avoid:**
```
"This works fine."
"I don't think this is a problem."
"Whatever."
```

**When you disagree:**
```
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

### Thank You After Interview

```
Subject: Thank you — Senior Frontend Engineer Interview

Hi Sarah,

Thank you for taking the time to interview me today. I enjoyed learning
about the team's work on the React platform and the performance challenges
you're tackling.

I'm excited about the opportunity to contribute — the problems align well
with my experience improving load times by 60% at my current company.

Please let me know if you need anything else. I look forward to next steps.

Best regards,
Salman Rahman
```

### Following Up

```
Subject: Following up — Senior Frontend Role Application

Hi Sarah,

I hope this finds you well. I wanted to follow up on my interview for the
Senior Frontend Engineer role on December 1st.

I remain very interested in the opportunity. Is there an update on the
timeline for next steps?

Thank you for your time.

Best regards,
Salman Rahman
```

---

## Slack/Chat Communication

### State the Full Question in One Message

**❌ Bad:**
```
"hey"
[pause]
"are you free?"
[pause]
"I have a question about the PR"
```

**✅ Good:**
```
"Hi @john — quick question on PR #123. Should the validation throw an
exception or return an error object? I'm leaning toward throwing since
it's an unexpected state. Thoughts?"
```

### Asking for Help

**❌ Bad:**
```
"My code doesn't work. Help!"
```

**✅ Good:**
```
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

## Design Documents (RFCs)

Use this structure for architecture proposals:

```markdown
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

---

**Related:** [Technical Communication](./01-technical-communication.md) | [Cross-Cultural Communication](./06-cross-cultural-communication.md)
