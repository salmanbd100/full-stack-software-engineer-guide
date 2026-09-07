---
title: Why Accessibility, and the Law
part: 2
chapter: 0
slug: accessibility-and-the-law
level: intermediate
reading_time: 10
updated: 2026-09-07
tags: [accessibility, wcag, eaa, en-301-549, ada, compliance]
in_book: true
---

# Why Accessibility, and the Law {#ch-accessibility-and-the-law}

> Know which rules apply to your product, what conformance level they ask for, and which numbers a design review has to hit.

**In this chapter:** why this is now a legal question · the four laws that reach a web team · WCAG structure and the AA target · what WCAG 2.2 added · the numbers · what the platform already knows about the user

## 💡 The Core Idea

Accessibility used to be argued on ethics and market size, and both arguments are true — roughly one
person in six lives with a disability, and every temporary injury or bright-sunlight moment puts an
able-bodied user in the same position for an afternoon. But since June 2025 the argument in most
European product meetings is shorter: **it is the law, the deadline has passed, and the fine lands on the
company selling into the EU rather than on the country it is based in.**

That changes an engineer's job in one specific way. Accessibility becomes a **requirement with a named
standard and a testable threshold**, like a security control, rather than a quality anyone can trade away
under deadline. The senior skill is knowing which standard applies, what it actually demands, and which of
those demands a code review can catch.

> Nobody is asking you to memorise success criteria. They are asking whether you know what the target
> is, and whether the thing you shipped meets it.

## How It Works

### The four rules that reach a web team

| Instrument | Applies to | Technical standard | Since |
| --- | --- | --- | --- |
| **European Accessibility Act** (Directive (EU) 2019/882) | Private companies selling covered products and services to EU consumers — e-commerce, banking, transport, e-books, telecoms | EN 301 549, which wraps WCAG | Enforceable **28 June 2025** |
| **Web Accessibility Directive** (2016/2102) | EU public sector bodies and their suppliers | EN 301 549 (v3.2.1 is the version currently cited) | 2019–2020 |
| **ADA Title II final rule** (US) | US state and local government, and the vendors they buy from | WCAG 2.1 AA | Compliance dates from **April 2026**, by population size |
| **Section 508** (US) | US federal agencies and their suppliers | WCAG 2.0 AA baseline | 2018 |

Two consequences people miss. **The EAA follows the customer, not the company** — a company in London,
Dhaka or Austin selling to EU consumers is inside its scope. And **enforcement is national**: each member
state sets its own penalties and complaint route, so "what is the fine" has twenty-seven answers and none
of them is the useful question. The useful question is whether the product can pass an audit.

> ⚠️ Procurement bites earlier than regulators do. Enterprise and public-sector buyers ask for an
> accessibility conformance report — a **VPAT**, filled in as an ACR — during the security review. A sales
> cycle stalling on a missing ACR is the most common way an engineering team learns that this is real.

### WCAG, and why AA is the number

The Web Content Accessibility Guidelines are the technical content of every rule in the table. WCAG 2.2
became a W3C Recommendation in **October 2023** and is the current version to build against.

| Principle | Means | Typical failure |
| --- | --- | --- |
| **Perceivable** | Content can be sensed by any user | Missing alternative text, contrast below the ratio |
| **Operable** | The interface works with any input device | Keyboard traps, controls unreachable without a mouse |
| **Understandable** | Behaviour and language are predictable | Unlabelled fields, navigation that moves between pages |
| **Robust** | Assistive technology can interpret the markup | Contradictory ARIA, state that is never announced |

Each principle holds numbered **success criteria** at three conformance levels. **AA is the level that
matters** — it is what every instrument above names. A is the floor and is not sufficient for compliance;
AAA is asked for in specific public-sector contexts and includes criteria that are impossible for some
content types, which is why the W3C itself does not recommend it as a general target.

### What WCAG 2.2 added, and what it dropped

Six new criteria at A and AA, and they are the ones a 2027 interview asks about because they are recent
enough that most codebases fail them.

| Criterion | Level | What it requires |
| --- | --- | --- |
| 2.4.11 Focus Not Obscured (Minimum) | AA | The focused element is not completely hidden by a sticky header or cookie bar |
| 2.5.7 Dragging Movements | AA | Anything draggable has a single-pointer alternative — a Move button, not just drag |
| 2.5.8 Target Size (Minimum) | AA | Interactive targets are at least **24 × 24 CSS px**, or spaced to compensate |
| 3.2.6 Consistent Help | A | Help links sit in the same place on every page that has them |
| 3.3.7 Redundant Entry | A | Information already given in a flow is not asked for again unless it must be |
| 3.3.8 Accessible Authentication (Minimum) | AA | No cognitive test to log in — paste and password managers must work |

WCAG 2.2 also **removed 4.1.1 Parsing.** Duplicate `id` attributes and unclosed tags are no longer a
conformance failure in their own right, because browsers recover from them and the real damage shows up
as a different criterion. Audits written against 2.1 still flag it.

> ⚠️ **Moving target:** WCAG 3.0 has been a working draft for years, is not a Recommendation, and will
> not be one soon — it changes the scoring model rather than the advice. Build against 2.2 AA. The durable
> principle underneath every version is the same: content has to be perceivable, operable, understandable
> and robust through an interface the author does not control.

### The numbers a design review has to hold

These are the criteria that get decided in Figma and then argued about in a pull request, so they are the
ones worth knowing by heart.

| Thing | Requirement | Level |
| --- | --- | --- |
| Body text contrast | 4.5 : 1 against its background | AA (1.4.3) |
| Large text — 18pt, or 14pt bold | 3 : 1 | AA (1.4.3) |
| Icons, borders, focus rings, chart series | 3 : 1 | AA (1.4.11) |
| Interactive target size | 24 × 24 CSS px | AA (2.5.8) |
| Text resize | Usable at 200% zoom, no loss of content | AA (1.4.4) |
| Reflow | No two-dimensional scrolling at 320 CSS px width | AA (1.4.10) |

`#999` on white is about 2.8 : 1 and fails body text — the single most common handoff defect in the
industry. And **colour can never be the only signal**: a red border with no icon or text tells a
colourblind user nothing, which fails 1.4.1 regardless of how strong the contrast is.

### The platform already knows what the user needs

Operating systems expose accessibility preferences, and honouring them is a few lines of CSS. This is the
cheapest accessibility work available and almost nobody does all four.

```css
/* Vestibular disorders — motion can cause nausea, not just annoyance. */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Windows High Contrast and similar modes replace your palette entirely. */
@media (forced-colors: active) {
  .card {
    border: 1px solid CanvasText; /* System colour keyword, not your brand token. */
  }
}

/* The user asked for more contrast; give it to them rather than your brand grey. */
@media (prefers-contrast: more) {
  :root { --text-muted: #1f2937; }
}
```

In forced-colors mode the browser overrides `background-color`, `color` and `border-color`. A component
that carried meaning only in a background gradient becomes blank, which is why an icon or a border is a
correctness decision rather than decoration.

## When to Use It

| Situation | What applies | What to do about it |
| --- | --- | --- |
| Consumer product sold in the EU | EAA, via EN 301 549 and WCAG 2.2 AA | Treat AA as a release requirement, not a backlog theme |
| Selling to a public sector buyer | WAD or Section 508, plus a VPAT request | Produce an ACR before procurement asks |
| US state or local government contract | ADA Title II, WCAG 2.1 AA | Same work; 2.2 AA is a superset |
| Purely internal tool | No instrument, but employment law reaches it | Keyboard and screen reader support at minimum |
| An accessibility "audit" arrives | A criterion-by-criterion report | Triage by criterion and level, not by screenshot |

## Common Mistakes

**❌ Treating an overlay widget as compliance**

> Third-party "accessibility widgets" that inject a toolbar do not fix underlying markup, are routinely
> named in complaints, and cannot make a `div` a button. The remediation is in your code.

**❌ Targeting AAA because it sounds safer**

> AAA includes criteria no product can meet across all content, so an AAA claim is usually a false one.
> AA is what the law asks for; exceed it where it is cheap and say what level you claim.

**❌ Auditing at the end of the project**

> Accessibility defects are mostly structural — the wrong element, the wrong focus order. Finding them
> after the component library is built means rewriting components rather than changing attributes.

**✅ Publishing what you do not support**

> An honest ACR that names two known gaps and a remediation date survives procurement. A perfect one that
> is untrue fails the first real audit.

## 🔑 Key Takeaways

- The European Accessibility Act has been enforceable since 28 June 2025 and follows the customer, so it reaches any company selling to EU consumers.
- WCAG 2.2 AA is the target every instrument names; A is not sufficient and AAA is not achievable as a blanket claim.
- WCAG 2.2 added six criteria at A and AA — focus not obscured, dragging alternatives, 24 × 24 targets, consistent help, no redundant entry, accessible authentication — and removed 4.1.1 Parsing.
- The numbers worth memorising are 4.5 : 1 for text, 3 : 1 for anything non-text, and 24 × 24 CSS px for targets.
- Colour alone can never carry meaning, and forced-colors mode will delete any meaning that lives in a background.

## Interview Questions

**Q: Which accessibility rules apply to a product your company sells across Europe?**

The European Accessibility Act, enforceable since June 2025, because it follows the customer rather than
the company's country of establishment. Its technical content is EN 301 549, which wraps WCAG, so in
practice the target is WCAG 2.2 AA. Enforcement is national, so penalties vary by member state — the
question worth answering internally is whether the product would pass an audit, and the artefact buyers
ask for is a conformance report.

**Q: Why AA rather than A or AAA?**

AA is the level named by the EAA, the Web Accessibility Directive, ADA Title II and Section 508, so it is
the only level with legal meaning for most products. A leaves out contrast and most keyboard requirements,
which is not a usable product. AAA contains criteria that cannot be met across arbitrary content, so
claiming it is usually inaccurate — better to meet AA properly and exceed it where it is cheap.

**Q: What did WCAG 2.2 change?**

Six criteria at A and AA that mostly formalise things good teams already did: the focused element must not
be completely hidden behind a sticky header, anything draggable needs a single-pointer alternative,
targets must be 24 × 24 CSS pixels, help must sit in a consistent place, a flow must not ask twice for the
same information, and login must not require a cognitive test — so paste and password managers have to
work. It also removed the parsing criterion, because browsers recover from malformed markup and the real
failures surface elsewhere.

**Q: A designer's palette uses `#999` for secondary text. What do you say?**

That it is roughly 2.8 : 1 against white and fails 1.4.3, which needs 4.5 : 1 for body text. I would
bring a measured number rather than an opinion, offer the nearest passing value, and check the same
palette for the 3 : 1 non-text cases — icons, input borders, focus rings, chart series — because those
fail quietly and are the ones an audit catches. If the grey is load-bearing for the brand, it can stay for
large display text at 3 : 1.

**Q: When would you not fix an accessibility issue immediately?**

When it is a genuine AAA criterion, or a defect in a surface with a scheduled replacement and no user
route to it, and in both cases I would record it in the conformance report with a date rather than let it
stay invisible. What I would not defer is anything structural — a control that is not a control, a form
field with no label, a keyboard trap — because those get cheaper to fix now and more expensive every
sprint they survive.

## What to Read Next

- [Chapter ?? — The Accessibility Tree](#ch-accessibility-tree) — what assistive technology actually reads
- [Chapter ?? — Testing Accessibility](#ch-testing-accessibility) — how to know whether you meet the bar
- [Chapter ?? — Semantic HTML](#ch-semantic-html) — the markup that satisfies most of these criteria for free
