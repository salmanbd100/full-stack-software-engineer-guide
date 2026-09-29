---
title: AI in Interviews
part: 7
chapter: 26
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

An AI round is not a quiz about transformers. It tests **whether you can locate a failure and attach a
number to it.** Every question in this chapter has two versions. One sounds like knowledge. The other is
really about measurement, and that second one is what the interviewer scores.

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

This is a system design round with a retrieval engine inside it. Drive it like any design round:
requirements first, tradeoffs stated, numbers attached. See
[Chapter ?? — Driving the Design Round, Backend and Frontend](#ch-driving-the-round).

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

Then finish on measurement, not on components. An answer that ends with the golden set, the hit rate you
would gate on and the cost per question beats one that stops at the vector store. See
[Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals). Asked to "add AI" to an existing
product, the honest first question is whether retrieval is needed at all.
[Chapter ?? — When RAG, When Fine-Tune, When Neither](#ch-when-rag-when-fine-tune-when-neither) is the
decision behind it.

### Round two — "how would you evaluate this feature"

The answer has three parts, in this order: **a golden set, a metric per failure mode, and a gate in CI.**

- **The golden set**: fifty to a few hundred real questions with known-good answers, versioned next to
  the code. Say where the cases came from: production traces, not imagination.
- **A metric per failure mode**, because they fail separately. Retrieval hit rate, answer correctness and
  citation validity are three numbers, and a drop in the first looks nothing like a drop in the third.
- **A gate**, so a prompt change that lowers the pass rate cannot ship.

If you offer a judge model (a model that grades another model's output), say at once how you validate it.
Grade a sample by hand and measure agreement. An unvalidated judge is an opinion with a decimal point.
[Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals) has the full shape.

### Round three — "your agent is looping, debug it"

Ask for the trace. That request alone is most of the point. If there is no trace to hand, say what you
would want in it: the step index, the tool name, the arguments, and the result.

**The trace that ends this question in ten seconds:**

```text
step 3  search_docs({ q: "refund policy" })  →  []
step 4  search_docs({ q: "refund policy" })  →  []
step 5  search_docs({ q: "refund policy" })  →  []
```

Identical arguments, identical result, no new information reaching the model. That is not a reasoning
failure. The tool cannot say "no match, try these terms instead", so an empty array reads as a passing
error worth retrying. Then narrow the cause down out loud, in the order below. Narrating a diagnosis is
its own skill: [Chapter ?? — Explaining and Thinking Aloud](#ch-thinking-aloud) teaches it.

| Ask | If yes, the cause is | The fix |
| --- | --- | --- |
| Same tool, same arguments, repeatedly? | A result the model cannot tell apart from a failure | Return an explicit "no match" plus a hint |
| Two tools that could both plausibly apply? | Overlapping descriptions | Merge them, or make the boundary explicit |
| Runs to the step cap on every task? | No satisfiable stop condition | State the completion criterion in the goal |
| Loops only on long tasks? | Context growth pushing early state out | Summarise, or persist state outside the window |

Name the bounds too: a step cap, a token budget, and an alert on both. A runaway loop is a cost incident
as well as a bug. [Chapter ?? — Tool Calling and the Tool Surface](#ch-tool-calling) is
the underlying material.

### Round four — "what breaks when the model changes version"

The framing that wins: **a model id is a dependency in the critical path.** A pinned version is a lockfile
entry. An alias that resolves to whatever is newest is an unreviewed deploy on the provider's schedule.

Then name what drifts: structured output and tool-calling formats, refusal boundaries, and price per
token. The prompt cache also goes cold on the id change, so an upgrade of the same quality can still
break a latency budget.

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

> ⚠️ **Moving target:** provider SDKs, model ids and pricing all change every few months, so no memorised
> model name survives this book. The lasting principle is the one above. The version is a dependency, and
> the eval suite is its regression test.

## When to Use It

| When the question sounds like | It is really asking | Read |
| --- | --- | --- |
| "Design a chatbot over our docs" | Retrieval quality and its measurement | [Chapter ?? — Embeddings, Vector Stores and Retrieval](#ch-retrieval) |
| "How do you stop it hallucinating" | Grounding, citations and refusal | [Chapter ?? — Trust, Correctness and Failure States](#ch-trust-and-correctness-ux) |
| "How would you make it cheaper" | Caching, routing and token accounting | [Chapter ?? — Observability and Cost Engineering](#ch-observability) |
| "Is this safe to ship" | Prompt injection and tool permissions | [Chapter ?? — Prompt Injection](#ch-prompt-injection) |

## Common Mistakes

**❌ Reaching for the prompt first**

> Prompt changes are the cheapest thing to try and the hardest to trace to a result. Locate the failure
> first (retrieval, tools, or generation) before changing anything.

**✅ Answering with a diagnosis, then a fix**

> "The wrong chunk came back" and "the right chunk came back and the answer ignored it" are two bugs with
> two different fixes. Splitting them is the answer.

**❌ Having no cost answer**

> This is the first kind of feature in years whose extra cost per user is visible. So "I have not thought
> about cost" ends a senior round badly.

## 🔑 Key Takeaways

- Every AI interview question is a measurement question wearing a knowledge question's clothes, so state
  the number you would gate on before the architecture.
- Answer with a diagnosis before a fix: retrieval, tools, or generation, then what you would change.
- A RAG design that ends at the vector store is unfinished; it ends at the golden set and the cost per question.
- Ask for the trace when an agent misbehaves, and read the arguments, not just the tool names.
- A model version is a pinned dependency, and the eval suite is the regression test that gates its upgrade.

## Interview Questions

**Q: An agent is looping in production. Walk me through it.**

I read the trace before touching the prompt. Say the same tool is called with the same arguments. Then it
returns something the model cannot tell apart from a passing failure, usually an empty array. The fix is
a return value that says "no match" and suggests a next term. If the calls differ but the run
never ends, there is no satisfiable stop condition and the goal needs a completion criterion. I would also
check for two tools whose descriptions overlap, and confirm a step cap and a token budget exist with an
alert on both.

**Q: The provider deprecates the model you are on in thirty days. What happens?**

It is a dependency upgrade in the critical path, so it goes through the same process as any other. Pin the
candidate id on a branch, run the golden set against both, and compare pass rate, cost per question and
p95 latency. Cases that passed before and fail now are the blocking list. The rest is a judgement call
about price and speed. I would expect the output and tool-calling formats to drift first, and the prompt
cache to be cold on the new id, which changes the latency profile before quality enters the argument.

**Q: When would you tell a product manager not to build an AI feature?**

There are three cases. The task is deterministic and a query would answer it. A wrong answer costs more
than a fast one is worth. Or there is no way to tell whether the output was right. That last case is the
real blocker. Nobody can improve a feature nobody can evaluate, so it degrades quietly with every model change. I would
rather ship a scoped assistant with a measurable pass rate than a general one nobody can grade.

## What to Read Next

- [Chapter ?? — Evals, Retrieval Metrics and Error Analysis](#ch-evals) — the golden set and the CI gate that most of these answers depend on
- [Chapter ?? — When RAG, When Fine-Tune, When Neither](#ch-when-rag-when-fine-tune-when-neither) — the decision behind round one
- [Chapter ?? — What an Agent Is, and When to Use More Than One](#ch-what-an-agent-actually-is) — the loop that round three debugs
