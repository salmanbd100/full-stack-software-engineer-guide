---
title: Technical Communication
part: 9
chapter: 0
slug: technical-communication
level: intermediate # beginner | intermediate | advanced
reading_time: 11
updated: 2026-09-02
tags: [communication, explaining, trade-offs, audience, register]
in_book: true
---

# Technical Communication {#ch-technical-communication}

> Explain code, an architecture and a trade-off out loud, in the order a listener needs them.

**In this chapter:** the three-question rule · explaining code and architecture · framing a trade-off · pitching to the audience in front of you · the mistakes that lose a room

## 💡 The Core Idea

Every technical explanation answers three questions in this order: **what** are you doing, **why** this
approach, and **what does it cost**. Candidates who lose a room almost always answer them in the wrong
order — mechanism first, purpose eventually, cost never.

The order is not stylistic. A listener cannot evaluate a mechanism they do not yet have a purpose for,
so everything you say before the purpose has to be re-heard afterwards. Say what it is for, then how it
works, then what you gave up.

> "I use `map` to transform the array" is a description. "I use `map` rather than `forEach` because it
> returns a new array, which keeps the reducer pure and testable" is an explanation. Only the second is
> being scored.

## How It Works

**Explaining code — attach a because to every choice.** Two or three of them in a five-minute
explanation is enough; the point is to prove the choices were choices.

| Say                              | Not                        |
| -------------------------------- | -------------------------- |
| "I chose X over Y because…"       | "I used X"                  |
| "This trades space for time by…"  | "It's fast"                 |
| "The alternative would be…, but…" | Silence about alternatives  |
| "O(n) — one pass, and we need every element anyway" | "It's efficient" |

**Explaining architecture — five beats, thirty seconds each to start.**

```text
1. What it does, in one sentence
2. The components and what each owns
3. How a request flows through them
4. Why the two or three decisions that mattered went that way
5. What you considered and rejected
```

Beat five is the one that reads as senior. An architecture with no rejected options sounds like the
only architecture you know.

**Explaining a trade-off — state the options, then commit.** Interviewers penalise fence-sitting far
more than they penalise a defensible wrong choice:

| Option                  | Gives you                | Costs you                              | Fits                        |
| ----------------------- | ------------------------ | -------------------------------------- | --------------------------- |
| Redux Toolkit           | Devtools, a large ecosystem | Boilerplate, another mental model     | Large teams, complex state  |
| Zustand                 | A minimal API             | Smaller ecosystem                      | Small to medium apps        |
| Context + `useReducer`  | No dependency             | Re-renders on frequent updates         | Auth, theme, locale         |

Then: "For this app I would take Zustand, because the state is small and the team is three people —
Redux's structure is worth its cost at fifteen, not at three."

**Explaining performance — four lines, all with numbers.**

```text
Problem:       Dashboard TTI 4.0s, bounce rate 30%
Investigation: DevTools — an 800KB blocking bundle, 500+ renders per keystroke
Change:        Route-level code splitting, then a stable prop reference
Impact:        TTI 1.6s, bounce 12%
```

A performance story without a before and an after is an opinion.

## Pitch It at the Room

The same explanation fails or lands depending on who is listening. Three registers cover almost every
audience you will face.

| Audience            | Lead with              | Depth                          | What loses them                 |
| ------------------- | ---------------------- | ------------------------------ | ------------------------------- |
| **Executives**      | The business outcome    | One layer, then stop            | Mechanism before impact         |
| **Technical peers** | The design decision     | As deep as they take it         | Explaining things they know     |
| **Non-technical partners** | What changes for the user | An analogy, then one detail | Unexplained acronyms       |

For executives, use **BLUF** — bottom line up front. Conclusion, then two supporting facts, then what
you need from them. For a complex written case, the same shape scaled up is the **pyramid principle**:
the answer first, grouped arguments beneath it, detail beneath those.

**Defining an acronym costs four words and buys the rest of the answer:**

| ❌ Loses the room                                     | ✅ Keeps it                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------------- |
| "We use SSR with ISR and set OST on the CDN"            | "We render on the server, and refresh those pages in the background rather than rebuilding the site" |

⚠️ Rooms differ in how much directness they expect, and it is worth knowing before you walk in. US
interviewers generally read "I led the migration" as ownership; some European and Asian teams read the
same sentence as overclaiming and expect the team named alongside you. The fix is not to change what you
did — it is to say **both**: what you decided, and who did it with you.

## Common Mistakes

| ❌ Mistake                                     | ✅ Fix                                                                       |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| Starting with the implementation                | One sentence on what it is for, then the mechanism                            |
| Jargon stacked on jargon                        | Define each acronym on first use, in four words                               |
| Five minutes without pausing                    | "Does this level work, or should I go deeper on the caching?" every two or three minutes |
| Bluffing a gap                                   | "I have not worked with GraphQL internals. What I have done is use it to cut over-fetching — useful?" |
| Listing options and never choosing               | Commit, then name the condition that would change your mind                   |
| A performance claim with no numbers               | Before, after, and the tool you measured with                                 |
| The same depth for every audience                | Pick the register first; it changes the first sentence, not just the detail    |

## 🔑 Key Takeaways

- Purpose, then mechanism, then cost — a listener cannot evaluate a mechanism with no purpose attached.
- Attach a "because" to two or three choices in any explanation; that is where judgement becomes audible.
- An architecture with no rejected alternatives sounds like the only one you know.
- Commit to an option and name what would change your mind; fence-sitting scores worse than being wrong.
- Register is chosen before the first sentence — executives get the outcome, peers get the decision.

## Interview Questions

**Q: How do you explain a technical trade-off to a product manager who wants both options?**

Convert both options into things they already price — time, risk and reversibility. "Option A ships in
a week and locks the data model; option B takes three and does not. If we are wrong about the model,
A costs a month to undo." That is a decision they can make. A latency table is not.

**Q: The interviewer clearly disagrees with your design mid-explanation. What do you do?**

Stop and get the objection out loud: "You look unconvinced about the cache — is it the invalidation?"
Then either address it or concede it explicitly. Talking over visible disagreement is the single fastest
way to lose a design round, because everything after it is being weighed against an objection you never
answered.

**Q: When should you deliberately not simplify?**

When your audience is the person who will maintain it. Simplifying for a peer reads as condescension
and hides the detail they need to catch your mistake. Ask once — "how much of this system do you already
know?" — and pitch from the answer.

**Q: How do you talk about work that was genuinely a team effort without either overclaiming or disappearing?**

Split the sentence. Name the decision that was yours and the execution that was shared: "I chose to
extract notifications first; Priya and Sam did the extraction while I did the reference implementation."
It is more precise than either "I" or "we", and precision is what "we" costs you.

## What to Read Next

- [Chapter ?? — Thinking Aloud](#ch-thinking-aloud) — the same discipline while you are still deciding
- [Chapter ?? — Written Communication](#ch-written-communication) — the written forms of these explanations
- [Chapter ?? — Driving the Design Round](#ch-driving-the-round) — this ordering rule applied to a whiteboard
