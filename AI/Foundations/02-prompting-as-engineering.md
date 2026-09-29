---
title: Prompting as Engineering
part: 7
chapter: 3
slug: prompting-as-engineering
level: intermediate
reading_time: 11
updated: 2026-09-07
tags: [ai, prompting, system-prompt, few-shot, versioning, evaluation]
in_book: true
---

# Prompting as Engineering {#ch-prompting-as-engineering}

> Treat the prompt as a versioned artefact in your repository with a test behind it, not as a message you type.

**In this chapter:** the system/user split · constraints do the work · few-shot that earns its tokens · prompts as code · changing one behind an eval

## 💡 The Core Idea

In a chat window a prompt is a message. In an application it is a **program artefact**. It lives in the
repository, has an identifier, appears in diffs and gets reviewed. A change to it changes how your product
behaves, and it ships without a code review if you let it.

Almost every bad habit in this area comes from carrying chat-window intuitions into a codebase. In a chat
you iterate by retyping and you judge by reading one answer. In production you cannot retype, you cannot
read every answer, and the person who changes the wording six months from now will not be you.

> A prompt without a version and a test is a config change with the blast radius of a deploy and none of
> the controls.

## How It Works

### System versus user: a contract and a payload

The split is not about style. The **system prompt** is your instruction. It is stable across requests,
written by you, cacheable, and the place where authority lives. The **user message** is the payload. It
varies, it often comes from something a person or a document said, and so it is untrusted.

```typescript
// The instruction is a constant; the payload is the only thing that varies per call.
const result = await generateText({
  model: MODEL,
  instructions: SUPPORT_AGENT_V4, // AI SDK 7: system text goes here, not in messages
  messages: [{ role: "user", content: userQuestion }],
});
```

Getting the split wrong costs twice. Pasting variable data into the system prompt breaks the cacheable
prefix, so every request pays full price. See
[Chapter ?? — Context Engineering](#ch-context-engineering). It also blurs the line the model uses to weigh
authority, and that is the opening prompt injection needs.

> ⚠️ **Moving target:** in AI SDK 7 the system prompt moved to a dedicated `instructions` property and
> system messages inside `messages` are rejected by default. The lasting principle is that instruction and
> payload occupy different, clearly-labelled channels. Confirm the current property name before writing.

### Constraints do the work

A vague request does not produce a bad answer at random. It produces **the shortest output that satisfies
the words**. That is why "write me a deployment script" reliably returns something hard-coded, unguarded
and single-region. The fix is not politeness or elaborate role-play. It is constraint.

| Constraint | What it prevents |
| --- | --- |
| State the versions in play | Deprecated syntax remembered from older training data |
| Name the output format exactly | Prose you then have to unpick |
| "Use only the supplied context" | Answers invented from general knowledge |
| "Say so rather than guessing" | Plausible fabricated fields and APIs |
| One objective per call | Quality dropping across all of several bundled tasks |

The fourth is the one teams miss, and the one with the largest effect. A model's default is to produce
*an* answer. Making "I do not know" an explicitly acceptable output gives it a better option than
inventing one.

### Few-shot: examples that earn their tokens

*Few-shot* means putting worked examples in the prompt. One example of your conventions is worth a
paragraph describing them. It is the strongest technique there is, and also the easiest to overspend on.
Every example is tokens on every request, forever.

**Two or three examples, chosen for coverage rather than typicality:**

```typescript
const CLASSIFY = `Classify the support message. Reply with one label only.

Message: "The invoice PDF will not open"        -> billing
Message: "Can you add SSO to the enterprise plan?" -> feature-request
Message: "Getting a 500 on /api/orders since 09:00" -> incident

Labels: billing | feature-request | incident | other
If the message fits none of these, reply: other`;
```

The examples cover three different labels and the last line handles the case they do not cover. Ten
examples of the same label would cost more and teach less. Few-shot stops paying when the instruction
already makes the pattern clear. Measure it, because it is a per-request cost.

### Ask for the plan before the output

For anything with a design decision inside it, split thinking from producing. Ask the model to list what
it intends to do, what it assumed, and what was ambiguous in the request. That brings wrong assumptions
out before three hundred lines are built on them. Correcting a list is far cheaper than correcting a
codebase. The "what was ambiguous" item is often the most useful output: it tells you what you failed to
specify.

### Prompts as code

This is what makes the chapter's title literal.

| Practice | Why it matters |
| --- | --- |
| The prompt lives in a file, not inline in a handler | It can be diffed, reviewed and owned |
| Every prompt has an **id and a version** | So a trace can say which one produced this answer |
| The version id is logged with every request | Otherwise a regression cannot be attributed |
| Changes go through the eval suite | Wording changes are behavioural changes |
| Rendering is a function of typed inputs | An unescaped template is an injection point |

```typescript
interface Prompt {
  readonly id: string;      // "support-agent"
  readonly version: number; // bump on every wording change
  render(input: SupportContext): string;
}
```

The same idea scales outward. Write a convention into a repository instruction file, such as `AGENTS.md`,
`CLAUDE.md` or a path-scoped instructions file. It then applies to every request by every engineer,
forever. The same convention typed into a chat applies once.

### Changing one safely

Prompt edits look free and are not. They are unbounded refactors. A clause added to fix one case shifts
behaviour on cases nobody reran.

```text
Change one thing  →  run the suite  →  compare pass rate  →  keep or revert
```

Two supporting habits help. When output is nearly right, say "change only X, keep everything else
identical" rather than restating the whole task. A rewrite breaks the parts that were already correct.
And when the approach is wrong, not the details, start again with better constraints instead of patching.

## When to Use It

| Situation | Reach for | Rather than |
| --- | --- | --- |
| Output shape is wrong | Schema-constrained output | More words about formatting |
| Output tone or convention is wrong | Two or three examples | A paragraph of description |
| The model invents facts | "Use only the supplied context", plus retrieval | A sterner instruction |
| The model invents API arguments | Explicitly permitting uncertainty | Trusting the fluency |
| Quality is drifting over time | An eval suite | Reading a few outputs |

## Common Mistakes

**❌ "Make it production-ready. Follow best practices."**

Undefined terms produce undefined output. Whose practices, at which version, with which constraints? You
could replace every word of that sentence with a specific requirement that would change the result.

**❌ Stating your theory when debugging**

> "I think the connection pool is exhausted — confirm?"

Models anchor hard on the framing they are given and will find support for it. That turns a diagnostic
aid into a machine for confirming your bias. Paste the raw evidence and say what you have ruled out. Then
ask for ranked hypotheses, each with the check that would disprove it.

**❌ Interpolating user input into the system prompt**

It breaks the cache on every request and merges the instruction channel with the untrusted one. Payload
goes in the user message.

**✅ Permit uncertainty explicitly**

> "If you are not certain a field or API exists, say so rather than guessing." One sentence gives
> measurably fewer invented fields. It makes admitting doubt the correct response, not a failure.

## 🔑 Key Takeaways

- In an application a prompt is a versioned artefact with an id, a diff and a test — not a message.
- The system prompt is a stable instruction and the user message is untrusted payload; mixing them costs caching and safety.
- Vague requests return the shortest output satisfying the words, so constraints are what actually change the result.
- Two or three covering examples beat a paragraph of description, and every example is a permanent per-request cost.
- Explicitly allowing "I do not know" measurably reduces fabricated fields.

## Interview Questions

**Q: What separates a prompt in a chat window from a prompt in production?**

Ownership and change control. A production prompt is a file in the repository with an id and a version.
Its version is logged on every request, so you can trace a bad answer to the wording that produced it. It
changes only through the eval suite, because a wording edit changes how the product behaves. In a chat
you iterate by retyping and judge by reading one answer. Neither works once the thing is serving traffic.

**Q: Why put instructions in the system prompt rather than the user message?**

Three reasons, and all matter. It is the stable prefix, so it caches and the variable part does not. It
is the channel the model treats as authoritative, which is the boundary prompt injection attacks. And it
keeps the untrusted payload clearly apart from your instruction. That is what lets you reason about the
request at all.

**Q: When does few-shot stop helping?**

When the instruction already decides the answer, or when the examples all show the same case. Examples
are permanent per-request tokens. So the test is whether removing them changes the eval score. If it does
not, they are pure cost. They also hurt when they are unrepresentative, because the model matches the
examples rather than the instruction.

**Q: How do you change a prompt without breaking cases that currently work?**

Change one thing, run the suite, compare the pass rate, keep or revert. The risk is that prompt edits look
local and are not. A clause added to fix one case shifts behaviour across every other case. Without a
fixed set of inputs and a score, you cannot see it. Bumping the version and logging it is what lets you
trace a later regression to its cause.

**Q: A colleague wants to fix a hallucination by adding "do not hallucinate" to the prompt. Your view?**

It does close to nothing. The model is not choosing to invent. It produces the most plausible
continuation and has nothing better on offer. What works is a better option and a smaller job. Supply the
facts through retrieval, tell it to answer only from the supplied context, and explicitly permit "I do
not know". If it must be right about facts you did not supply, prompting is the wrong layer entirely.

## What to Read Next

- [Chapter ?? — Context Engineering](#ch-context-engineering) — where the prompt sits in the window, and what it displaces
- [Chapter ?? — Structured Output](#ch-structured-output) — constraining shape at the API level instead of by instruction
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — why the instruction and payload channels must stay separate
