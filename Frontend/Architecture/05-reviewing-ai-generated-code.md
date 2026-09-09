---
title: Reviewing AI-Generated Code
part: 4
chapter: 0
slug: reviewing-ai-generated-code
level: advanced # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-09
tags: [code-review, ai, react, accessibility, security, quality-gates]
in_book: true
---

# Reviewing AI-Generated Code {#ch-reviewing-ai-generated-code}

> Catch the defects generated code is characteristically prone to — the ones that compile, read well, and are wrong about something only your codebase knows.

**In this chapter:** how generated code fails differently · three defects worth spotting cold · the questions to ask of a generated diff · moving the gate from attention to automation

## 💡 The Core Idea

Human code fails where the author was confused. You can usually see it in the diff: the naming goes
vague, the comments get defensive, the edge case is missing because the author never thought of it.
Review works because confusion leaves marks.

Generated code leaves no marks. A model produces the most likely solution to the prompt it was given,
and that prompt was stripped of almost everything your codebase knows — which components are
memoised, which route is on the critical path, which field the server refuses to trust. So the output
is **locally plausible and globally wrong**: correct syntax, idiomatic shape, confident naming, and a
broken assumption about the one thing that was not in the prompt.

> Review shifts from *"did the author understand this?"* to *"which invariant living outside this file
> did this quietly break?"*

## How It Works

### Where generated code actually fails

The defect classes are stable even as the models improve, because they all come from the same missing
input: context the model never had.

| Defect class | Why a model produces it | What it looks like |
| ------------ | ----------------------- | ------------------ |
| **Reference identity** | Render frequency is invisible in a snippet | A fresh object, array or function literal on every render |
| **Semantically wrong ARIA** | The training corpus is full of ARIA that validates | `role` on an element that already has one; a label on something with no role |
| **Plausible security** | Defensive-looking code is well represented | A regex "sanitiser"; validation that never reaches the field that matters |
| **Invented API surface** | Options that existed in an older major are still in the corpus | A config key that does not exist, or was renamed two releases ago |
| **Tests that cannot fail** | A passing test is the most common test in the corpus | The unit under test is mocked; the assertion restates the mock |
| **Version drift** | Older patterns outnumber newer ones in training data | `getServerSideProps`, class components, `FID` instead of `INP` |

Grep is a real reviewer here: read the hits for `role=`, `aria-`, `dangerouslySetInnerHTML`, `any`,
`as ` and every new lockfile entry first. Six searches, and they catch a large share of that list.

### Defect one — a new reference where something keys on identity

**❌ What arrives, in a pull request titled "add chart to dashboard":**

```tsx
export function Dashboard({ points }: { points: Point[] }) {
  // A new object every render. `Chart` is memoised, so this is the bug.
  return <Chart data={points} options={{ animate: false, legend: "bottom" }} />;
}
```

**✅ What it should be:**

```tsx
// The options never change, so they do not belong inside the render.
const CHART_OPTIONS = { animate: false, legend: "bottom" } as const;

export function Dashboard({ points }: { points: Point[] }) {
  return <Chart data={points} options={CHART_OPTIONS} />;
}
```

`Chart` is wrapped in `React.memo` because someone measured it and it was expensive. The generated
version re-renders it on every keystroke elsewhere in the page, and nothing fails — the chart is just
slow again, six months after it was fixed.

> ⚠️ The React 19 compiler removes much of this class inside the components it compiles, so on a
> fully adopted codebase this diff is harmless. It does not help when the file is not compiled —
> partial adoption is the normal state — when the value is built outside React, or when the consumer
> keys on identity itself, such as a `Map`. The durable question is not "is this tidy" but **"what
> consumes this reference, and does it care that it changed?"**

### Defect two — ARIA that validates and lies

**❌ What arrives:**

```tsx
// Valid ARIA. No keyboard access, no focus, no Enter or Space handling.
<div role="button" aria-label="Delete invoice" onClick={remove} />
```

**✅ What it should be:**

```tsx
<button type="button" onClick={remove}>
  <TrashIcon aria-hidden="true" /> Delete invoice
</button>
```

Every ARIA attribute a model adds is a **claim about behaviour it did not write**. `role="button"`
promises focusability, Enter and Space activation, and a disabled state. A native `<button>` ships all
three; a `<div>` ships none, and the linter is satisfied either way because the markup is legal. The
rule is short: if generated code adds a `role`, ask which native element it is imitating, and why
that element was not used instead.

### Defect three — security theatre

**❌ What arrives:**

```typescript
function sanitise(html: string): string {
  return html.replace(/<script[^>]*>.*?<\/script>/gi, ""); // "Sanitised."
}
```

Onerror handlers, `javascript:` URLs, SVG payloads and nested tags all survive this, and the function
name tells the next reviewer it is safe. Blocklists lose to browsers — use an allowlist sanitiser, or
do not render HTML at all. See [Chapter ?? — XSS Prevention](#ch-xss-prevention).

Name the general form, because it is the class that reaches production most often: **code shaped like
a control that does not implement one.** Validation that checks the body and not the session. A rate
limiter keyed on a header the client sets. A check that only runs on the client.

### The three questions to ask of a generated diff

Asking the author these is faster than reading every line, and it works over chat:

1. **What outside this file does it assume?** Render frequency, the shape of the API response, whether
   a value is trusted. This is where the defect almost always is.
2. **Which parts did you verify, and how?** "I ran it" and "I read the docs for that option" are
   different answers. The second one is what you are looking for on unfamiliar API surface.
3. **What test would have caught this if it were wrong?** If there is no answer, the block is not
   reviewed — it is accepted.

An author who cannot answer the first one has shipped a prompt, not a change — the same line the team
already drew around copied Stack Overflow answers.

### Move the gate from attention to automation

This is the part that belongs to architecture rather than to etiquette. Generated code arrives faster
and in bigger diffs, and reviewer attention does not scale to meet it — past roughly 400 changed
lines, reviewers approve on trust, as
[Chapter ?? — Branching and Review Workflow](#ch-branching-and-review-workflow) sets out. So every
defect class above needs a machine to own it:

| Defect class | The gate that actually holds |
| ------------ | ---------------------------- |
| Reference identity | `eslint-plugin-react-hooks`, and a performance budget in CI |
| ARIA semantics | `eslint-plugin-jsx-a11y` plus an axe run — neither catches a wrong `role`, so keep the manual pass |
| Security | A `dangerouslySetInnerHTML` lint rule, a CSP, and dependency scanning |
| Invented API | `strict` TypeScript, and no `any` or unchecked `as` in the diff |
| Untestable tests | Mutation testing on the modules that matter, or a review habit of breaking the code |
| Version drift | Codemods and a lint rule per deprecated pattern |

None of that is new tooling. What is new is the **ratio**. A team writing most of its code by hand can
run a thin gate and rely on review; a team where half the diff is generated cannot, and the senior
move is to say so before the defect rate proves it.

## When to Use It

| Situation | How to review it | Why |
| --------- | ---------------- | --- |
| A leaf utility with tests you can read | Normal review | Small blast radius, and the test is checkable |
| Anything touching auth, money or migrations | Line by line, as untrusted input | Plausible-looking is exactly the failure mode here |
| A generated test | Read the assertion first, then break the code | A test that cannot fail is worse than no test |
| Generated ARIA or i18n | Manual pass, always | Lint checks syntax; both of these fail on meaning |
| An unfamiliar API or config key | Check it against the docs for your installed version | This is where invented options land |
| A large generated refactor | Send it back to be split | Over 400 lines, nobody is reviewing anything |

> ⚠️ **Moving target:** which model wrote the code, and how good it is, changes every few months. The
> defect classes above move far more slowly, because they come from missing context rather than from
> model quality. The durable principle: **a model is confident in proportion to how common a pattern is
> in its training data, not to how right it is for your codebase.**

## Common Mistakes

❌ **Reviewing it more leniently because the tests pass.** Generated tests and generated code share
the same wrong assumption, so they agree with each other.
✅ Review the assumption, not the agreement. Break the implementation and confirm a test goes red.

❌ **Rejecting a change because it was generated.** Provenance is not a defect, and this position
loses immediately once the team is faster with the tool than without it.
✅ Review the code. Hold it to the standard you hold your own to, which is higher, not different.

❌ **Letting the author say "the AI wrote it" in review.** It shifts ownership to something that
cannot be asked a follow-up question.
✅ The name on the pull request owns every line in it, including the lines nobody typed.

❌ **Trying to hold the line by reading harder.** Attention is the one input that does not scale with
generation speed.
✅ Convert each repeated review comment into a lint rule the first time you write it twice.

## 🔑 Key Takeaways

- Generated code fails where the prompt lacked context, not where the author was confused, so it fails
  without leaving the usual signs.
- The stable defect classes are reference identity, semantically wrong ARIA, security theatre, invented
  API surface, tests that cannot fail, and version drift.
- Every ARIA attribute a model writes is a claim about behaviour it did not implement.
- Ask what the code assumes outside its own file, what the author verified, and which test would have
  caught it being wrong.
- Reviewer attention does not scale with generation speed; each recurring defect has to become a lint
  rule, a type, or a CI check.

## Interview Questions

**Q: What do you look for in a pull request that was mostly written by an assistant?**

The same things as any review, plus the classes that generated code is specifically prone to: a new
reference where something memoises or caches on identity, ARIA that validates but promises behaviour
the code does not implement, and validation that is shaped like a control without being one. Then one
question to the author — what does this assume about the rest of the system? That is where the defect
usually is, because it is what the prompt could not carry.

**Q: A team's velocity is up and their defect rate is up with it. What do you change?**

Not the review standard, which is already the thing that is failing. I would find the two or three
defects that keep recurring and give each one a machine — a lint rule, a stricter type, an axe run, a
performance budget in CI. Review time then goes to the parts a machine cannot judge, which is whether
the change is the right change. The measurement to watch is defects reaching production, not review
comments per pull request.

**Q: When would you not slow down for extra review of generated code?**

When the blast radius is small and the feedback is fast — a leaf utility, a styling change, a
throwaway script — the cost of a careful review exceeds the cost of the bug. I would spend the saved
attention on the auth, payment and data-migration paths instead, where plausible-but-wrong is exactly
the failure mode and nothing downstream will catch it.

## What to Read Next

- [Chapter ?? — Performance and the React Compiler](#ch-react-performance-and-the-compiler) — which reference-identity defects the compiler removes, and which it leaves
- [Chapter ?? — ARIA, and When Not to Use It](#ch-aria) — why a native element beats a correct `role` every time
- [Chapter ?? — Branching and Review Workflow](#ch-branching-and-review-workflow) — the review mechanics this chapter assumes, including why diff size decides review quality
