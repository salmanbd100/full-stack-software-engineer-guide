---
title: Trust and Correctness UX
part: 7
chapter: 0
slug: trust-and-correctness-ux
level: advanced
reading_time: 10
updated: 2026-09-07
tags: [ai, ux, citations, trust, undo, confidence, review]
in_book: true
---

# Trust and Correctness UX {#ch-trust-and-correctness-ux}

> Design an interface for a system that is usually right, occasionally wrong, and equally confident either way.

**In this chapter:** calibrating trust rather than maximising it · citations that verify · why confidence scores mislead · edit-before-accept · undo as the primary control · attribution

## 💡 The Core Idea

The instinct is to make the AI feature feel trustworthy. That is the wrong target. **The goal is
calibrated trust — the user believing it in roughly the proportion it is right.** Over-trust means wrong
answers ship unchecked; under-trust means nobody uses the feature. Both are design failures, and
over-trust is the expensive one.

The difficulty is that a model's confidence carries no information about its correctness. Prose is fluent
whether the underlying fact was retrieved or invented, and users read fluency as competence — a habit
built over a lifetime of reading text written by people who knew things.

So the interface has to supply the signal the text does not: **where this came from, and how easily can
you check it.**

> Do not ask the user to trust the answer. Give them a two-second way to verify it.

## How It Works

### Citations that can be checked

A citation is only worth something if it is verifiable and verified.

| ❌ Weak | ✅ Strong |
| --- | --- |
| "According to the documentation…" | An inline link to the exact retrieved passage |
| A source list at the end | A citation attached to the specific claim |
| A link to a document | A link to the section, with the quoted text visible on hover |
| A citation the model composed | A citation resolved from a retrieved chunk id |

The last row is a correctness control, not a UX nicety. If the model emits a chunk id and your server
resolves it, a fabricated citation cannot render — the id was never retrieved. That check costs nothing
and catches the most damaging failure a grounded assistant has.

Placement matters too. A citation next to the sentence it supports gets checked; a source list at the
bottom gets ignored, and its presence increases trust without increasing verification. That is the worst
combination available: the appearance of rigour with none of the substance.

### Confidence scores usually mislead

Showing "87% confident" reads as a measurement. Unless it is calibrated — meaning that across many
answers, the ones marked 87% are right about 87% of the time — it is a number the model generated, and
models are not well calibrated at reporting their own reliability.

| Instead of a score | Show |
| --- | --- |
| "87% confident" | The sources it used, or a note that it found none |
| "Low confidence" | "I could not find this in the documentation" |
| A progress-bar meter | Whether the claim is grounded in a retrieved passage |

**Grounding is the honest proxy.** "This came from three retrieved passages" and "this came from the
model's own knowledge" are two states you can determine programmatically, and they tell the user
something true.

### Edit before accept

Any output that writes somewhere — a draft reply, a generated field, a code change — should pass through
the user before it lands.

```text
Generate  →  Show as an editable draft  →  User edits  →  Explicit accept  →  Apply
```

**The three-step version, and the step that must not be skipped is the explicit accept.**

Auto-applying is where AI features lose users permanently. One silent wrong edit costs more trust than
twenty good suggestions build, because the user now has to check everything — which is more work than
doing it themselves.

| Consequence of a wrong output | Pattern |
| --- | --- |
| Trivial and visible | Apply, with undo |
| Costly or hard to notice | Draft, review, explicit accept |
| Irreversible | Explicit confirmation naming what will happen |
| Affects other people | Review, always |

### Undo is the primary control

Undo does more for adoption than accuracy improvements do, because it changes what a mistake costs. A
user who knows they can undo will try the feature; a user who does not will avoid it, and no accuracy
number changes that calculation.

- **Make it visible at the moment of application**, not buried in a menu.
- **Undo the whole operation**, not the last keystroke of it.
- **Keep the previous version.** "Restore the earlier draft" is stronger than a single-step undo.
- If something genuinely cannot be undone, **say so before it happens**, not after.

### Attribution and honesty

Users should know when they are reading generated content, and increasingly regulation requires it. But
the design goal is not a disclaimer.

| ❌ Disclaimer theatre | ✅ Useful honesty |
| --- | --- |
| "AI can make mistakes" under every message | A citation next to the claim |
| A modal accepted once and forgotten | Visible marking on generated content that persists |
| Hedging language in every answer | Plain answers, plus "not found in the docs" when true |

A blanket warning shifts responsibility to the user without helping them. It is read once and never
again, and it is worse than nothing because it feels like a control has been added.

> ⚠️ Hedging every sentence ("it appears that", "you may wish to") destroys the signal. If everything is
> hedged, the genuinely uncertain answer looks exactly like the confident one.

## When to Use It

| Output | Trust design |
| --- | --- |
| Grounded answer from your docs | Inline citations resolved from chunk ids |
| Summary of a long document | Link each point to its location in the source |
| A generated draft | Edit-before-accept, always |
| Extracted form fields | Fill optimistically, mark as generated, keep undo |
| An answer the corpus does not cover | Say so; do not answer from general knowledge silently |

## Common Mistakes

**❌ Showing a confidence percentage**

> It reads as a measurement and is not calibrated. Show grounding instead.

**❌ Auto-applying generated changes**

> One silent wrong edit costs more trust than twenty good suggestions build.

**❌ A source list at the end of the answer**

> It raises trust without enabling verification, which is precisely backwards.

**✅ Resolve citations from retrieved chunk ids**

> A fabricated citation then cannot render at all, and the user gets a link that lands on the exact
> passage.

## 🔑 Key Takeaways

- The goal is calibrated trust, not maximum trust; over-trust is the expensive failure.
- A citation attached to the claim gets checked; a source list at the end raises trust without enabling verification.
- Confidence scores read as measurements and are not calibrated — show grounding, which is verifiable.
- Anything that writes should be a draft with an explicit accept; auto-applying is where features lose users.
- Undo does more for adoption than accuracy does, because it changes what a mistake costs.

## Interview Questions

**Q: How do you show the user the answer might be wrong?**

By making it cheap to check rather than by telling them. Citations attached to the specific claim, linking
to the exact retrieved passage, so verification is a click. Grounding stated honestly — this came from
the documentation, or this did not. And an explicit "I could not find that" when retrieval returned
nothing, instead of a fluent answer from general knowledge. A disclaimer under every message does none of
that; it shifts responsibility without giving anyone a way to act.

**Q: Why not show a confidence score?**

Because it looks like a measurement and is not one. Unless the number is calibrated — answers marked 80%
being right about 80% of the time, verified over many cases — it is a value the model produced, and
models are poor at reporting their own reliability. Worse, a precise-looking number increases trust more
than a vague one, so an uncalibrated score actively pushes users towards over-trust.

**Q: When would you auto-apply a generated change?**

Only when a wrong result is both trivial and immediately visible, and undo is right there. Anything
costly, hard to notice, irreversible, or affecting other people goes through a draft with an explicit
accept. The asymmetry is what decides it: one silent wrong edit makes the user start checking every
output, which is more work than not using the feature, and that is a permanent loss.

**Q: What does a good citation look like?**

Inline, next to the claim it supports, linking to the exact passage rather than the document, with the
quoted text visible without navigating away. And resolved from a retrieved chunk id server-side rather
than composed by the model — which means a hallucinated citation cannot render at all, since the id was
never retrieved. A list of sources at the end fails on every one of those points while still making the
answer feel better sourced.

**Q: How do you avoid the interface becoming a wall of hedging?**

By putting the uncertainty in structure rather than in the prose. Answer plainly, attach citations, and
reserve explicit "I do not know" for cases where retrieval genuinely found nothing. If every sentence is
hedged, the hedge stops carrying information — the genuinely uncertain answer reads exactly like the
confident one, which is the opposite of calibration.

## What to Read Next

- [Chapter ?? — Failure States](#ch-failure-states) — designing the refusal this chapter keeps recommending
- [Chapter ?? — Generative UI](#ch-generative-ui) — the citation block, and why it carries an id
- [Chapter ?? — Guardrails and Safety](#ch-guardrails-and-safety) — verifying citations programmatically
