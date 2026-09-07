---
title: Designing the Tool Surface
part: 7
chapter: 0
slug: designing-the-tool-surface
level: advanced
reading_time: 12
updated: 2026-09-07
tags: [ai, agents, tools, api-design, descriptions, errors, typescript]
in_book: true
---

# Designing the Tool Surface {#ch-designing-the-tool-surface}

> Treat the tool set as an API whose only consumer reads English, has no documentation, and cannot ask you a question.

**In this chapter:** the tool surface as product · granularity · descriptions as prompts · parameters the model can fill · errors that teach · what to leave out

## 💡 The Core Idea

Teams tune prompts and switch models for weeks, and the thing that actually decides whether their agent
works is the tool set. **The tool surface is the agent's entire interface to the world, and its
descriptions are the only documentation its user will ever read.**

The user, in this case, is a model that reads your descriptions once, cannot ask a follow-up question,
cannot read your source, and will fill every parameter with something whatever happens. Design for that
consumer and most agent problems disappear. Design an API for humans and paste it in, and you get an
agent that calls the wrong tool with plausible arguments.

> A looping agent is nearly always an agent whose tools lied to it — by returning nothing, by overlapping,
> or by describing themselves inaccurately.

## How It Works

### Granularity

| Too fine | About right | Too coarse |
| --- | --- | --- |
| `openFile`, `seek`, `readBytes`, `close` | `readFile(path)` | `doTheThing(instruction: string)` |
| Ten steps to accomplish one intent | One tool per intent | The model cannot tell what will happen |
| Burns the step budget on plumbing | Composable, verifiable | Unverifiable, unauditable |

The rule that survives contact with reality: **one tool per user-visible intent.** If a person would
describe it as one action — "search the docs", "create a ticket", "check the build" — it is one tool.

Fine-grained tools are the more common mistake and the more expensive one, because every extra call is a
full model round trip with the whole conversation attached. Wrapping a four-call sequence into one tool
often halves the cost of a task and removes three chances to go wrong.

The coarse end fails differently. A single `execute(command)` tool is maximally flexible and impossible
to authorise, audit or bound — you can no longer say what the agent is able to do.

### Descriptions are prompt text

The description is the only signal for *when* a tool applies. Most tool selection bugs are description
bugs.

```typescript
// ❌ Written for a human who can read the source
search: tool({
  description: 'Searches the index.',
  inputSchema: z.object({ q: z.string() }),
});

// ✅ Written for the model that has to choose
searchDocs: tool({
  description:
    'Search the product documentation and return up to 5 passages with their source paths. ' +
    'Use for questions about how the product behaves, its API, or its configuration. ' +
    'Do not use for customer account data — use lookupAccount for that. ' +
    'Returns { found: false } with a hint when nothing matches.',
  inputSchema: z.object({
    query: z.string().describe('Keywords, not a full sentence. Example: "rotate signing key"'),
    section: z.enum(['api', 'guides', 'changelog']).optional()
      .describe('Omit unless the user named a section.'),
  }),
});
```

Four things the second one does and the first does not: it says **what it returns**, it says **when to
use it**, it says **when not to** and names the alternative, and it says what failure looks like. Each of
those removes a specific class of wrong call.

Naming does real work too. `searchDocs` and `lookupAccount` cannot be confused; `search` and `query` can.
**Two tools whose descriptions overlap is the second most common cause of a looping agent** — the model
alternates because neither is clearly right.

### Parameters the model can actually fill

| ❌ Hard to fill | ✅ Easy to fill | Why |
| --- | --- | --- |
| `userId: string` | `email: string` | The model has the email; it does not have your internal id |
| `filters: Record<string, unknown>` | Named optional fields | An open bag invites invention |
| `since: number` (epoch ms) | `since: string` ISO date | The model writes dates, not timestamps |
| `mode: string` | `mode: z.enum([...])` | Enums cannot be invented |
| 12 required parameters | 2 required, the rest optional | Every required field is a chance to fabricate |

The first row is the important one and generalises: **do not require an identifier the model has no way
to know.** Either accept the natural key and resolve it inside the tool, or give the model a lookup tool
that produces the id first.

### Errors and empty results teach the next step

Whatever a tool returns becomes prompt text conditioning the model's next decision. That makes the
failure path part of the design, not an afterthought.

| Returned | The model concludes | Result |
| --- | --- | --- |
| `[]` | Something went wrong, or the query was bad | Retries the same call — a loop |
| `Error: ECONNREFUSED` | Unknown; possibly retryable | Retries, then invents an answer |
| `{ found: false, hint: 'No match for "foo". Try broader keywords.' }` | Nothing matched; rephrase | Rephrases once, then says so |
| `Search is unavailable. Answer from the conversation or say you cannot check.` | This path is closed | Degrades honestly |

Three rules cover it: **say what happened, say whether retrying could help, and say what to do instead.**
That is three sentences of English in a return value, and it prevents more loops than any prompt
engineering.

> ⚠️ Never return a raw exception. Stack traces put file paths and internals into a context window that
> may be logged, shown to a user, or influenced by an attacker who planted the input.

### What to leave out

The strongest control is a tool that does not exist. A tool surface is a capability grant, and every
entry is a permission you are handing to a system that reads untrusted documents.

| Question | If the answer is uncomfortable |
| --- | --- |
| What is the worst thing this tool can do? | Narrow it or remove it |
| Can it be scoped read-only? | Do that; add writes as separate, gated tools |
| Would I let an unreviewed script call this? | That is exactly what you are doing |
| Can a document the agent reads influence its arguments? | Yes, always. Validate them |

Prefer many narrow tools to one general one. `cancelSubscription(accountId)` can be authorised and
audited; `runSql(query)` cannot.

## When to Use It

| Need | Tool shape |
| --- | --- |
| A frequent multi-step sequence | One composite tool — it saves round trips and errors |
| A destructive action | Its own tool, its own permission, an approval gate |
| Reading anything | Read-only tools, freely available |
| An identifier lookup | A separate lookup tool, or accept the natural key |
| Something the model rarely needs | Leave it out; a smaller surface improves selection |

## Common Mistakes

**❌ Exposing your internal API verbatim**

> It was designed for a caller with documentation, types and a colleague to ask. The model has none of
> those.

**❌ Returning an empty array on no results**

> The single most common cause of a looping agent. Say "no match" and say what to try.

**❌ Two tools that could plausibly both apply**

> The model alternates between them. Merge them, or make each description name the other's territory.

**✅ Write descriptions that say when *not* to use the tool**

> Negative guidance disambiguates a surface faster than any amount of positive description, and it is
> what stops the model reaching for the nearest-looking tool.

## 🔑 Key Takeaways

- The tool surface is the agent's product; descriptions are the only documentation its consumer reads.
- One tool per user-visible intent — fine-grained tools burn round trips, coarse ones cannot be authorised.
- Never require an identifier the model cannot know; accept natural keys or provide a lookup tool.
- Error and empty results are prompt text: say what happened, whether to retry, and what to do instead.
- The strongest control is a tool that does not exist — every entry is a capability grant.

## Interview Questions

**Q: How granular should an agent's tools be?**

One tool per intent a person would name. Too fine and the agent spends its step budget on plumbing, with
every extra call being a full model round trip carrying the whole conversation — wrapping a frequent
four-call sequence into one tool often halves the cost. Too coarse, like a single `execute` tool, and I
can no longer authorise or audit anything, because the capability is whatever the argument says.

**Q: What makes a good tool description?**

It is written for a model, not a colleague. It says what the tool does, what it returns, when to use it,
when not to and what to use instead, and what failure looks like. The "when not to" clause does more work
than anything else, because most wrong tool calls are the model reaching for the nearest plausible option
in an ambiguous surface. Parameter descriptions matter for the same reason — they are prompt text with a
field attached.

**Q: Your agent keeps calling the same tool with the same arguments. Why?**

Because the result it got back is indistinguishable from a failure. An empty array or a bare error tells
the model nothing about whether the call was wrong, the data is absent, or the service is down, so
retrying is a reasonable inference. Returning an explicit "no match" plus a hint about what to try
differently fixes this class of loop, and it is a change to a return value rather than to the prompt.

**Q: How do you keep an agent from doing something destructive?**

Mostly by not giving it the capability. The tool surface is a permission grant, so a destructive
operation gets its own narrow tool, its own permission check against the signed-in user, and a human
approval gate — and if it is not needed, it is not exposed. I would also avoid general-purpose tools like
raw SQL or shell execution, because a tool whose effect is determined by its argument cannot be
authorised or audited in any meaningful way.

**Q: Can you just expose your existing REST API as tools?**

You can, and it usually works badly. That API assumes a caller with documentation, types and internal
identifiers, and it returns HTTP errors written for developers. A model has none of that context, so it
fabricates ids, misreads codes, and picks between endpoints whose names distinguish nothing. The surface
needs redesigning for its actual consumer: natural keys, enums, prose descriptions, and errors written as
instructions.

## What to Read Next

- [Chapter ?? — Tool Calling](#ch-tool-calling) — the mechanics underneath this design work
- [Chapter ?? — What an Agent Actually Is](#ch-what-an-agent-actually-is) — the loop these tools drive
- [Chapter ?? — Prompt Injection](#ch-prompt-injection) — why the surface is a security boundary
