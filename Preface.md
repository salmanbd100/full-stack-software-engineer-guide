---
title: Preface
part: 0
chapter: 1
slug: preface
level: beginner # beginner | intermediate | advanced
reading_time: 9
updated: 2026-09-19
tags: [front-matter]
in_book: true
---

# Preface {#ch-preface}

> Know what this book is, who it is for, and what it refuses to teach — before you spend six weeks on it.

**In this preface:** the gap it fills · who it is for · what it leaves out · the promise every chapter makes · how to trust what is on the page

## Why This Book Exists

The questions in a senior frontend interview have barely changed in five years. The depth expected
has.

The reason is blunt. An assistant sitting in the editor will define a closure, explain the event loop
and name the HTTP verbs faster than you can ask. Reciting those no longer scores, because reciting
them is free. What scores is the layer underneath — why a stale closure ate a `setInterval` callback,
what a long task does to a mid-range Android phone, which verb is safe to retry and why that matters
at three in the morning.

Three kinds of book already sit on this shelf. Each leaves the same gap.

| Genre                           | What it does well           | What it misses                                                  |
| ------------------------------- | --------------------------- | --------------------------------------------------------------- |
| Interview-question compilations | Breadth and recall          | No architecture, no judgement, no *why*                           |
| Framework books                 | Depth on one tool           | Dies with that tool's next major version                          |
| AI engineering books            | RAG, agents, evaluation     | Written by machine-learning people, so the interface layer is thin |

The gap is a senior-level book that treats **the frontend stack** and **AI engineering** as parts of
one job. Since 2025, for this reader, they are. The same engineer defends a rendering strategy in the
morning and ships a streaming model response in the afternoon. No other title covers both at senior
depth for the same person.

## Who It Is For

An engineer with three to eight years behind them, going for a senior or staff frontend or full
stack role.

You write TypeScript daily and have shipped a React app or its equivalent. You know what a hook is,
what a promise is, what REST means. You can build the feature. What you are less sure of is whether
you can **defend the design** when someone senior pushes back.

Four things usually stand between that engineer and the offer:

- Explaining a trade-off under pressure, rather than reciting a definition
- Frontend system design rounds, which most people meet for the first time in the interview itself
- The AI half of the job, which nobody taught them
- Sounding senior rather than sounding experienced — a different thing, and the one that sets the level

There is a second reader, and the book is built for them too: the engineer who is not interviewing at
all, and who needs the honest answer to "should this be a Server Component" on a Tuesday afternoon.
That reader never starts at page one. Every chapter is written to be read cold.

**It is not written for everyone.** Four readers are better served elsewhere, and saying so early
saves them the money.

| Not for                     | Why                                                                  |
| --------------------------- | -------------------------------------------------------------------- |
| Absolute beginners          | The book assumes you can already build things                         |
| Machine-learning engineers  | Part VII builds *with* models. It does not train them                 |
| Dedicated DevOps and SRE    | Part VIII is what a full stack engineer owns, not a platform career   |
| Mobile-native engineers     | The web platform only                                                 |

## What It Will Not Teach

Saying no here is what keeps this to one volume instead of three. Every topic below was considered
and cut on purpose, not forgotten.

| Left out                              | Why                                                               |
| ------------------------------------- | ------------------------------------------------------------------ |
| Terraform and infrastructure as code  | A platform-engineering career, not this reader's job                |
| Linux administration                  | Useful, wrong book                                                  |
| Python and shell automation           | The book is TypeScript only; scripting breaks that rule             |
| Kubernetes operations                 | Past "my service runs in a pod somewhere", this is an SRE skill     |
| Deep cloud service coverage           | Three condensed chapters, not sixteen. Clouds differ; principles do not |
| Cost optimisation as a discipline     | Its own field, with its own books                                   |
| Model training and fine-tuning        | A different profession from building features on top of a model     |
| Mobile and React Native               | The web platform only                                               |
| Vue and Angular                       | Named in comparisons, not taught                                    |
| Company-by-company interview guides   | They age within a quarter                                           |

Three ceilings follow from that list, and they hold everywhere in the book.

- **Three frameworks.** React, Next.js and Svelte. A fourth would turn the book into a survey.
- **One cloud** for the worked examples, with the principle always stated cloud-free first.
- **Fifteen system design case studies** — ten backend, five frontend. More would make it a
  case-study book, which this is not.

## The Promise

> Every chapter answers three questions: **why does this exist**, **when do I reach for it**, and
> **what does it cost me**. Then it gives the version of that answer you can say out loud.

That is the whole book in one sentence, and it is also the test every page had to pass. A section
that answered none of the three was cut rather than kept for completeness.

The third question is the one most material skips. Anything worth using has a cost — a bundle, a
round trip, a migration, an on-call page, a bill. Naming the cost is most of what separates a senior
answer from a confident one.

## What "Frontend-Heavy" Means

It means a number, not a feeling. Parts I to IV — the language, the browser platform, the framework
stack, and what changes when forty engineers share a codebase — are **about half the book**, and
Part III is the largest single part in it.

The rest is scoped by one question: *what does a frontend-heavy full stack engineer actually get
asked and actually build?* That is what decides how much backend, how much system design, how much
operations. Part V is not a backend career in a box and does not pretend to be. Part VIII is not a
platform career. Both are sized to the job this reader holds.

Part VII is the exception, and it is sized to where the job is going rather than where it has been.
Every survey of senior hiring lands on the same three skills — retrieval, agents, and **evaluation**,
with evaluation named repeatedly as the most under-taught of the three.

## How to Trust What Is Here

Technical books rot. These are the rules that decide how fast this one will, and they are worth
knowing before you rely on a page.

| Rule                          | What it means for you                                                              |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Every claim is version-stamped** | "React 19", never "the current version". A claim with no version is a claim you cannot check |
| **TypeScript only**           | One language across nine parts. No sample is a translation of a sample in another language |
| **Chapters stand alone**      | Each one names what it assumes and links the chapter that owns it, so cold reading works |
| **One canonical home**        | No topic is taught twice. Caching lives in one chapter; everything else points at it |
| **Volatile chapters say so**  | Where a tool ships breaking changes yearly, the chapter names the durable principle underneath |

> ⚠️ **The fastest-moving material is in Parts III and VII.** Framework APIs and model SDKs change on
> a yearly cadence, and some of the names in those chapters will move. The durable layer is
> deliberately separated from the tool: the rendering spectrum outlives the framework that implements
> it, and retrieval quality outlives the SDK that calls the embedding endpoint. Where only the
> vendor's own documentation can be trusted, the chapter says so.

Where the book hands over to somewhere else, it says where. The sources worth your time — one per
part, not forty — are in [Chapter ?? — Further Reading](#ch-further-reading).

## A Note on English

A large share of the people this is written for do not have English as a first language. So the
writing rule throughout is short sentences, everyday words, and active voice.

That is not a simplification of the ideas. The ideas stay senior. The sentences carrying them stay
short, because a long sentence is a worse carrier of a hard idea in any language.

One consequence worth flagging: the spelling is British. `Colour`, `behaviour`, `optimise`. Code
identifiers keep whatever spelling the API uses, so `color` stays `color` in a stylesheet.

## What to Read Next

- [Chapter ?? — How to Read This Book](#ch-how-to-read-this-book) — three routes through it, and which chapters each one skips
- [Chapter ?? — Glossary](#ch-glossary) — any term you meet cold, in one line
- [Chapter ?? — About the Author](#ch-about-the-author) — who is making these claims, and on what basis
