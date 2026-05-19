# Conflict Resolution

## Overview

Conflict questions test maturity, not whether you avoid disagreement. Senior interviewers want signals that you can challenge ideas, hold a position with data, hear the other side, and keep the relationship intact afterward.

## 📋 Common Questions

### Disagreements
1. Tell me about a time you disagreed with your manager.
2. Describe a technical disagreement with a colleague.
3. Tell me about a time you had to defend your position.
4. How do you handle being wrong in a disagreement?

### Interpersonal
1. Tell me about a time you worked with someone difficult.
2. Describe a conflict you had with a coworker and how you resolved it.
3. Tell me about a time you mediated between two teammates.

### Difficult Conversations
1. Tell me about a time you received unfair criticism.
2. Describe a time you had to give hard feedback.
3. Tell me about a time you felt your work wasn't valued.

## 💡 Sample STAR Answers

### Q1: Tell me about a time you disagreed with your manager

**Situation:**
At a fintech startup, my manager wanted us to ship a new payment feature in 2 weeks to honor a $500K sales commitment. My estimate was 4 weeks if we kept PCI compliance and security testing.

**Task:**
Push back on the timeline without ignoring the business pressure my manager was under.

**Action:**
- Booked a private 1:1 instead of debating it in standup.
- Brought a one-page breakdown: tasks, time estimates, the specific PCI checks I would not cut, and two real industry breaches caused by rushed payment features.
- Acknowledged the business need first, then laid out my concern.
- Proposed three alternatives: (1) phased ship — demo-grade for sales, prod-grade in week 4, (2) reduced scope — core charges in 2 weeks, refunds/recurring later, (3) integrate Stripe and skip the custom build.

**Result:**
- We went with the phased approach. Sales closed the deal on the week-2 demo; production hardened payment shipped in week 4.
- Zero security incidents post-launch.
- My manager later told me the structured pushback made it easier to defend the timeline to leadership.

**Key Takeaway:**
> Disagreeing well = acknowledge the pressure, bring data, and arrive with options — not just objections.

---

### Q2: Tell me about a technical disagreement with a peer

**Situation:**
A senior peer wanted to introduce a new state management library across our React app. I thought we should fix our existing patterns first; the team had no shared mental model yet.

**Task:**
Resolve the disagreement without it becoming a turf war — we were both seen as the React leads.

**Action:**
- Wrote a short doc framing both options against the team's actual pain points (re-renders, prop drilling, debuggability).
- Suggested a 1-week spike: each of us prototyped one feature using our preferred approach.
- Set decision criteria up front — bundle size, learning curve, test coverage — so the result wouldn't hinge on opinion.
- Reviewed both prototypes with the team and let them vote.

**Result:**
- Team picked a hybrid: keep existing patterns for simple state, adopt the new library only for cross-feature state.
- Disagreement turned into a documented decision (ADR) the team could point to later.
- My relationship with the peer strengthened — we ran the same playbook for two more decisions.

**Key Takeaway:**
> Move from positions to evidence. A small spike often ends a long argument.

---

### Q3: Describe a time you had to give hard feedback

**Situation:**
A senior contractor on my team was consistently dismissive in code reviews — short, sarcastic comments that made juniors avoid submitting PRs.

**Task:**
Address the behavior directly without damaging the working relationship.

**Action:**
- Pulled him aside privately, same day after a review that crossed the line.
- Used **SBI** (Situation-Behavior-Impact): named the review, quoted the comment, explained the effect on two juniors (specific examples).
- Asked his perspective — turned out he was frustrated by a separate scope creep issue.
- Agreed on a concrete change: phrase feedback as questions, escalate scope concerns to me directly.

**Result:**
- Tone in his reviews shifted within the week.
- Two juniors told me they felt comfortable submitting PRs again.
- The contractor thanked me later for raising it instead of routing it through his manager.

**Key Takeaway:**
> Direct, specific, private. SBI works because it separates behavior from character.

---

## 🎯 Key Themes to Demonstrate

| Theme | What it signals |
| --- | --- |
| **Respectful directness** | You raise issues, not avoid them |
| **Data over opinion** | You bring evidence, options, and criteria |
| **Active listening** | You can articulate the other side |
| **Relationship preservation** | The person trusts you more, not less, after |
| **Self-awareness** | You can say "I was wrong" |

## 🔧 Useful Frameworks

### SBI Feedback Model

- **Situation:** "In yesterday's PR review…"
- **Behavior:** "…you commented 'this is terrible code'…"
- **Impact:** "…and the author stopped submitting PRs that week."

### Interest-Based Negotiation

Focus on the **interest behind the position**.

- Position: "We must use MongoDB."
- Interest: "I need schema flexibility for an evolving model."
- Solution: any option that meets the interest — Mongo, JSONB columns, schemaless wrapper.

### Difficult Conversation Steps

1. **Prepare** — gather facts, check assumptions.
2. **Listen** — understand their view before sharing yours.
3. **Assert** — state your perspective clearly.
4. **Problem-solve** — collaborate on the path forward.
5. **Follow up** — make sure resolution sticks.

## 🚨 Red Flags to Avoid

❌ **Avoiding the conflict:** "I just dropped it."
✅ **Better:** "I addressed it directly in a 1:1."

❌ **Attacking character:** "They were just difficult."
✅ **Better:** "We had different perspectives on the approach."

❌ **Escalating too fast:** "I went straight to HR."
✅ **Better:** "I tried to resolve it 1:1 first, then escalated when needed."

❌ **Defensiveness:** "I was right, they were wrong."
✅ **Better:** "I listened to their concerns and we found middle ground."

## 📊 Metrics That Land

- **Outcome:** "Adopted a hybrid approach that combined both ideas."
- **Relationship:** "We've shipped four more features together since."
- **Team impact:** "Psychological safety score rose from 6 to 8."
- **Prevention:** "Wrote an ADR template so future disagreements use the same process."

## 🎓 Likely Follow-Ups

1. "How do you know when to compromise vs. stand firm?"
2. "What if the conflict couldn't be resolved?"
3. "How do you handle disagreements with someone senior to you?"
4. "Would you handle it differently now?"

## 🔗 Related Topics

- [STAR Framework](./01-star-framework.md)
- [Communication Skills](./06-communication.md)
- [Leadership & Teamwork](./04-leadership-teamwork.md)
- [Customer & Stakeholder Management](./12-customer-stakeholder.md)

---

[← Back to Behavioral](./README.md) | [Next: Customer & Stakeholder Management →](./12-customer-stakeholder.md)
