---
title: AI in Interviews
part: 7
chapter: 0
slug: ai-in-interviews
level: advanced
reading_time: 9
updated: 2026-09-07
tags: [ai, interview, rag, agents, evals, llm]
in_book: true
---

# AI in Interviews {#ch-ai-in-interviews}

> Drive the four AI questions a senior loop actually asks, and name the number that ends each one.

**In this chapter:** the four archetypes · driving the RAG round · answering "how do you know it works" · debugging a looping agent out loud · surviving a version change

## 💡 The Core Idea

An AI round is not a quiz about transformers. It is a round about **whether you can locate a failure and
attach a number to it.** Every question in this chapter has a version that sounds like knowledge and a
version that is really about measurement, and the second one is what is being scored.

> The senior signal for this part is one sentence: **measure before improving.** Say what you would
> measure, and say it before you say what you would change.

## How It Works

### The four archetypes

Almost every AI question in a senior loop is one of these four, or a rewording of one.

| The question | What is really being tested | Where it goes wrong |
| --- | --- | --- |
| "Design a RAG system" | Whether you treat retrieval as the product | Jumping to a vector database |
| "How would you evaluate this feature" | Whether you have ever had a number | "We looked at the outputs" |
| "Your agent is looping — debug it" | Whether you read traces | Rewriting the system prompt |
| "What breaks when the model changes version" | Whether you treat the model as a dependency | "We use the latest one" |

### Round one — "design a RAG system"

This is a system design round with a retrieval engine inside it, so drive it the way you drive any design
round — requirements first, tradeoffs stated, numbers attached, per
[Chapter ?? — Driving the Design Round](#ch-driving-the-round).

| Phase | What to do | Why it scores |
| --- | --- | --- |
| First five minutes | Ask the corpus questions: size, format, how often it changes, who asks, what a wrong answer costs | Every later decision follows from these |
| Ingestion | Chunking strategy, and what metadata each chunk carries | Chunking decides the ceiling on quality |
| Retrieval | Hybrid search, `k`, reranking, and the filter that scopes results to the user | This is the part being marked |
| Answer path | Grounding rules, citations, and what happens when nothing matches | Empty retrieval is normal traffic |
| Measurement | The golden set, retrieval hit rate, and the CI gate | The half most candidates skip |
| Cost | Tokens per question, cache hit rate, the price at expected volume | AI features have a visible marginal cost |

Two clarifying answers change the architecture more than anything else. **How often the corpus changes**
decides whether re-embedding is a nightly job or a queue on the write path. **What a wrong answer costs**
decides whether the feature may answer at all when confidence is low.

Then finish on measurement rather than on components. The golden set, the hit rate you would gate on and
the cost per question is a different answer from one that stops at the vector store — see
[Chapter ?? — Evaluating Retrieval](#ch-evaluating-retrieval). And asked to "add AI" to an existing
product, the honest first question is whether retrieval is needed at all:
[Chapter ?? — When RAG, When Fine-Tune, When Neither](#ch-when-rag-when-fine-tune-when-neither) is the
decision behind it.

### Round two — "how would you evaluate this feature"

The answer has three parts, in this order: **a golden set, a metric per failure mode, and a gate in CI.**

- **The golden set** — fifty to a few hundred real questions with known-good answers, versioned next to
  the code. Say where the cases came from: production traces, not imagination.
- **A metric per failure mode**, because they fail separately. Retrieval hit rate, answer correctness and
  citation validity are three numbers, and a drop in the first looks nothing like a drop in the third.
- **A gate**, so a prompt change that lowers the pass rate cannot ship.

If you offer a judge model, say in the same breath how it is validated — a sample graded by hand, and
agreement measured. An unvalidated judge is an opinion with a decimal point;
[Chapter ?? — Evals](#ch-evals) has the full shape.

### Round three — "your agent is looping, debug it"

Ask for the trace. That request alone is most of the point, and if there is no trace to hand, say what you
would want in it: the step index, the tool name, the arguments, and the result.

**The trace that ends this question in ten seconds:**

```text
step 3  search_docs({ q: "refund policy" })  →  []
step 4  search_docs({ q: "refund policy" })  →  []
step 5  search_docs({ q: "refund policy" })  →  []
```

Identical arguments, identical result, no new information reaching the model. That is not a reasoning
failure — it is a tool that cannot say "no match, try these terms instead", so an empty array reads as a
transient error worth retrying. Then bisect out loud — narrating a diagnosis is its own skill, and
[Chapter ?? — Listening and Thinking Aloud](#ch-thinking-aloud) is where it is taught — in this order:

| Ask | If yes, the cause is | The fix |
| --- | --- | --- |
| Same tool, same arguments, repeatedly? | A result the model cannot tell apart from a failure | Return an explicit "no match" plus a hint |
| Two tools that could both plausibly apply? | Overlapping descriptions | Merge them, or make the boundary explicit |
| Runs to the step cap on every task? | No satisfiable stop condition | State the completion criterion in the goal |
| Loops only on long tasks? | Context growth pushing early state out | Summarise, or persist state outside the window |

Name the bounds too — a step cap, a token budget, an alert on both — because a runaway loop is a cost
incident as well as a bug. [Chapter ?? — Designing the Tool Surface](#ch-designing-the-tool-surface) is
the underlying material.

### Round four — "what breaks when the model changes version"

The framing that wins is that **a model id is a dependency in the critical path.** A pinned version is a
lockfile entry; an alias resolving to whatever is newest is an unreviewed deploy on the provider's schedule.

Then name what drifts: structured output and tool-calling formats, refusal boundaries, the prompt cache
that invalidates on the id change, and price per token — so a same-quality upgrade can break a latency
budget.

**What an upgrade produces, and the only blocking part of it:**

```typescript
interface UpgradeReport {
  readonly from: string;                 // the pinned id in production
  readonly to: string;                   // the candidate
  readonly passRate: { from: number; to: number };
  readonly costPerQuestion: { from: number; to: number };
  readonly p95LatencyMs: { from: number; to: number };
  /** Cases that passed on `from` and fail on `to`. The only list that blocks a release. */
  readonly regressions: readonly string[];
}
```

Three numbers move together and the regression list decides. An upgrade that raises the pass rate by two
points and doubles the price is a decision for someone else to take, and saying so is the senior answer.

> ⚠️ **Moving target:** provider SDKs, model ids and pricing all change on a scale of months, so no
> memorised model name survives this book. The durable principle is the one above — the version is a
> dependency, and the eval suite is its regression test.

## When to Use It

| When the question sounds like | It is really asking | Read |
| --- | --- | --- |
| "Design a chatbot over our docs" | Retrieval quality and its measurement | [Chapter ?? — Retrieval](#ch-retrieval) |
| "How do you stop it hallucinating" | Grounding, citations and refusal | [Chapter ?? — Trust and Correctness UX](#ch-trust-and-correctness-ux) |
| "How would you make it cheaper" | Caching, routing and token accounting | [Chapter ?? — Cost Engineering](#ch-cost-engineering) |
| "Is this safe to ship" | Prompt injection and tool permissions | [Chapter ?? — Prompt Injection](#ch-prompt-injection) |

## Common Mistakes

**❌ Reaching for the prompt first**

> Prompt changes are the cheapest thing to try and the hardest to attribute. Locate the failure —
> retrieval, tools, or generation — before changing anything.

**✅ Answering with a diagnosis, then a fix**

> "The wrong chunk came back" and "the right chunk came back and the answer ignored it" are two bugs with
> two different fixes. Splitting them is the answer.

**❌ Having no cost answer**

> This is the first feature class in years whose marginal cost per user is visible, so "I have not thought
> about cost" ends a senior round badly.

## 🔑 Key Takeaways

- Every AI interview question is a measurement question wearing a knowledge question's clothes, so state
  the number you would gate on before the architecture.
- Answer with a diagnosis before a fix — retrieval, tools, or generation, then what you would change.
- A RAG design that ends at the vector store is unfinished; it ends at the golden set and the cost per question.
- Ask for the trace when an agent misbehaves, and read the arguments, not just the tool names.
- A model version is a pinned dependency, and the eval suite is the regression test that gates its upgrade.

## Interview Questions

**Q: An agent is looping in production. Walk me through it.**

I read the trace before touching the prompt. If the same tool is called with the same arguments, it is
returning something the model cannot distinguish from a transient failure — usually an empty array — and
the fix is a return value that says "no match" and suggests a next term. If the calls differ but the run
never ends, there is no satisfiable stop condition and the goal needs a completion criterion. I would also
check for two tools whose descriptions overlap, and confirm a step cap and a token budget exist with an
alert on both.

**Q: The provider deprecates the model you are on in thirty days. What happens?**

It is a dependency upgrade in the critical path, so it goes through the same process as any other. Pin the
candidate id on a branch, run the golden set against both, and compare pass rate, cost per question and
p95 latency. Cases that passed before and fail now are the blocking list; the rest is a judgement call
about price and speed. I would expect the output and tool-calling formats to drift first, and the prompt
cache to be cold on the new id, which changes the latency profile before quality enters the argument.

**Q: When would you tell a product manager not to build an AI feature?**

When the task is deterministic and a query would answer it, when a wrong answer costs more than a fast one
is worth, or when there is no way to tell whether the output was right. That last case is the real blocker
— a feature nobody can evaluate cannot be improved, so it degrades quietly with every model change. I would
rather ship a scoped assistant with a measurable pass rate than a general one nobody can grade.

## What to Read Next

- [Chapter ?? — Evals](#ch-evals) — the golden set and the CI gate that most of these answers depend on
- [Chapter ?? — When RAG, When Fine-Tune, When Neither](#ch-when-rag-when-fine-tune-when-neither) — the decision behind round one
- [Chapter ?? — What an Agent Actually Is](#ch-what-an-agent-actually-is) — the loop that round three debugs
