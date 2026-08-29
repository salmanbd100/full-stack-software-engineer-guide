# Book Specification

> **This is the contract.** Every later decision — what to write, what to cut, what to archive — gets
> checked against this file. If a change contradicts the spec, either the change is wrong or the spec
> needs amending in the decision log at the bottom. Nothing gets changed silently.
>
> **Status:** Locked · **Version:** 1.2 · **Date:** 2026-08-29
> **Companion:** [IMPROVEMENT-PLAN.md](./IMPROVEMENT-PLAN.md) — the 78-item route from repo to manuscript.

---

## 1. Identity

| Field         | Value                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------- |
| **Title**     | The Senior Full Stack Handbook                                                                 |
| **Subtitle**  | Frontend-heavy engineering for 2027 — fundamentals, the modern stack, system design, and AI     |
| **Author**    | Salman Rahman                                                                                  |
| **Edition**   | First (2027)                                                                                   |
| **Length**    | ~57,000 lines of markdown ≈ 850–1,050 print pages (a handbook, not a primer)                   |
| **Language**  | British English (`colour`, `behaviour`, `organise`, `optimise`)                                |
| **Code**      | TypeScript only                                                                                |
| **Formats**   | PDF · EPUB · free web companion                                                                |

**Working shorthand:** _The Handbook_.

---

## 2. The Promise

> Every chapter answers three questions: **why does this exist**, **when do I reach for it**, and
> **what does it cost me**. Then it gives the version of that answer you can say out loud in an interview.

That is the whole book in one sentence. It is also the acceptance test for every page: if a section does
not answer one of those three, it gets cut.

### What makes this book different

There are three kinds of book already on this shelf, and each leaves a gap this one fills.

| Existing genre                   | What it does well            | What it misses                                          |
| -------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Interview-question compilations  | Breadth, recall              | No architecture, no judgement, no _why_                  |
| Framework books (Learn React)    | Depth on one tool            | Dies with the tool's next major version                  |
| AI engineering books             | RAG, agents, evals           | Written by ML people — no frontend, no UX of AI          |

**The gap:** a senior-level book that treats **the modern frontend stack** and **AI engineering** as parts
of the same job, because since 2025 they are. No competing title covers both at senior depth for the same
reader.

---

## 3. The Reader

### Primary reader

An engineer with **3–8 years' experience**, targeting **senior or staff frontend / full stack** roles at
multinational companies.

They already:

- Write JavaScript and TypeScript daily, and have shipped a React app or equivalent
- Know what a hook is, what a promise is, what REST means
- Can build the feature — they are less sure they can **defend the design**

They are stuck on:

- Explaining tradeoffs under pressure instead of reciting definitions
- Frontend system design rounds, which are new to most of them
- The AI half of the job, which no one taught them
- Sounding senior rather than sounding experienced

### Secondary reader

A **working engineer using it as a reference** rather than as interview prep — someone who needs the
honest version of "should this be a Server Component" on a Tuesday afternoon.

### Explicitly not for

| Not for                          | Why                                                          |
| -------------------------------- | ------------------------------------------------------------ |
| Absolute beginners               | The book assumes you can already build things                |
| ML / research engineers          | Part VII builds _with_ models, it does not train them        |
| Dedicated DevOps / SRE           | Part VIII is what a full stack engineer needs, not a platform career |
| Mobile-native engineers          | Web platform only                                            |

### A note on English

A large share of the audience are not native English speakers. The writing rule is **short sentences,
everyday words, active voice** — the same rule as `write-topic-docs`. This is not simplification of the
ideas. The ideas stay senior; the sentences carrying them stay short.

---

## 4. The Nine Parts

Each part below is locked: its scope, its reason for existing, and its line budget.

---

### Part I — Foundations

**Covers:** JavaScript language semantics · TypeScript · OOP and design patterns in TypeScript
**Budget:** 5,000 lines · ~22 chapters

Every senior interview still opens here, and research on 2026 loops is blunt about why the bar moved:
the questions have not changed in five years, but the depth expected has, **because an AI assistant can
answer the surface version instantly**. Explaining what a closure is no longer scores. Explaining why a
stale closure ate your `setInterval` callback does. This part exists to give the reader the layer beneath
the definition — and it comes first because Parts III, IV and VII all quietly depend on it.

**Senior signal:** can reason about the runtime, not just recite the API.

---

### Part II — The Browser Platform

**Covers:** HTML and CSS · Browser APIs and storage · Accessibility · Internationalisation · PWA
**Budget:** 6,000 lines · ~26 chapters

Frameworks are a layer over the platform, and engineers who skipped the platform hit a ceiling that shows
in interviews. Two topics here punch above their weight for this reader specifically. **Accessibility** is
now a legal requirement, not a nice-to-have — the European Accessibility Act became enforceable in June
2025 and applies to any company serving EU consumers regardless of where it is based. And research on
frontend system design rounds is consistent that **accessibility and internationalisation are the two
topics that most reliably separate a senior candidate from a mid-level one**. Both are chronically
under-taught elsewhere. That makes this part cheap differentiation.

**Senior signal:** reaches for the platform before reaching for a library.

---

### Part III — The Modern Frontend Stack 🆕

**Covers:** React · Next.js · Svelte · Rendering models · State management · Build tooling
**Budget:** 12,000 lines · ~46 chapters — the largest part in the book, by design

This is the part the reader bought the book for, and it does not exist in the repository yet. The 2026–27
senior loop is built on it: Server Components versus Client Components, React 19 Actions, the `use` hook,
the React Compiler, and rendering-strategy judgement. One recruiter guide puts it flatly — if you cannot
explain the server/client boundary for a Next.js role, the interview is effectively over before the
system design round starts.

The part is deliberately structured so **half of it outlives its own frameworks**. `React/`, `NextJS/`
and `Svelte/` teach today's tools. `Rendering/`, `StateManagement/` and `Tooling/` teach the models
underneath — the rendering spectrum, the four kinds of state, what a bundler actually does. When React 20
lands, three sections need revising and three do not.

Svelte earns its place on merit and on authenticity: Svelte 5 has the highest retention rate of any
framework surveyed (91% would use it again), SvelteKit is the second most-used meta-framework, and it is
the author's daily stack. That section will be the most lived-in writing in the book.

**Senior signal:** picks a rendering strategy per route and can defend it; treats the framework as an
implementation detail.

---

### Part IV — Frontend at Scale

**Covers:** Frontend architecture · Web performance · Frontend security · Testing
**Budget:** 5,500 lines · ~24 chapters

Part III is how to build it. Part IV is how to build it when there are forty engineers, four years of
history, and a performance budget someone will be held to. Micro-frontends, design systems, dependency
upgrades, Core Web Vitals — including **INP**, which replaced FID and which a lot of published material
still gets wrong. This part also carries a chapter that barely exists in print anywhere yet: **reviewing
AI-generated code**, which means catching the generated object literal that quietly defeats memoisation,
or the ARIA attribute that is syntactically valid and semantically wrong.

**Senior signal:** thinks in budgets, boundaries and migration paths rather than features.

---

### Part V — Backend for Frontend Engineers

**Covers:** Node.js internals · API design · SQL and NoSQL · Auth and security · Backend testing
**Budget:** 6,500 lines · ~30 chapters (down from 14,506 lines / 53 files)

The book is frontend-heavy, not frontend-only. This part is scoped by a single question: **what does a
frontend-heavy full stack engineer actually get asked and actually build?** That is Node's event loop,
REST and GraphQL and typed APIs, enough SQL to design a schema and read a query plan, JWT versus sessions,
and streaming endpoints — which matter far more now than they did in 2023, because Part VII's features
stream. It is not a backend career in a box, and it does not pretend to be.

**Senior signal:** designs an API the frontend can actually consume well, and knows why the query is slow.

---

### Part VI — System Design

**Covers:** Fundamentals · Building blocks · Frontend system design · Ten case studies
**Budget:** 6,500 lines · ~34 chapters

Down from 21,903 lines, because most of that was duplication — load balancing appeared in three places,
caching in three, CDN in three. The bigger correction is balance: the existing twenty case studies are all
backend-shaped, and this reader walks into **frontend** system design rounds. So the case studies are cut
to ten and joined by five frontend ones drawn from what these rounds actually ask — a collaborative
editor (CRDT versus OT, undo in a shared document), a typeahead, an infinite feed, a design system for
forty teams, a dashboard with fifty live widgets.

**Senior signal:** drives the round — clarifies requirements, states assumptions, defends tradeoffs.

---

### Part VII — AI Engineering 🆕

**Covers:** LLM foundations · Integration · RAG · Agents · Production and evals · AI UX
**Budget:** 7,500 lines · ~31 chapters

The reason this is a 2027 book and not a 2024 one.

Every survey of 2026 hiring lands on the same three skills: **RAG, agents, and evaluation** — with
evaluation named repeatedly as the single most under-taught of the three, and asked for by name in nearly
every senior AI job description. This part teaches all three, in TypeScript, for engineers who ship
features rather than train models. No CUDA, no PyTorch, no maths beyond what cosine similarity needs.

The `AIUX/` section is the part no one else can write the same way: designing for latency, generative UI,
citations and trust, and the unhappy path when the model refuses or times out. AI engineering books are
written by backend and ML people, so the interface layer is consistently the weakest chapter in all of
them. Here it is a strength, because the author is a frontend engineer.

One small application — a documentation assistant — threads through the whole part, so the reader finishes
with something built rather than eight disconnected snippets.

**Senior signal:** measures before improving; treats a wrong answer as a retrieval bug or an eval gap,
not as bad luck.

---

### Part VIII — Ship and Operate

**Covers:** Git · Containers · CI/CD · Observability · Cloud · Deployment
**Budget:** 5,500 lines · ~22 chapters

Down from 39,703 lines, which is the single largest cut in the plan — an **86% reduction**. The existing DevOps material is good
and almost entirely aimed at a different reader — Terraform across eleven files, Linux administration,
Python automation scripting, Kubernetes operations. A frontend-heavy full stack engineer needs to branch
and rebase without fear, containerise a service, own a pipeline, read a trace, and ship safely with a
rollback. That is this part. Everything else moves to `Archive/`, intact, in case it ever becomes its own
volume.

**Senior signal:** owns the change all the way to production, including the way back.

---

### Part IX — The Human Layer

**Covers:** Behavioural interviewing · Communication · Ways of working · The AI-era interview loop
**Budget:** 2,500 lines · ~18 chapters

Senior offers are lost here more often than on the whiteboard. Alongside STAR, influence without
authority, ADRs, and blameless post-mortems sits the most current chapter in the book: **how interviews
themselves changed**. Google is adding a code-comprehension round where you read, debug and optimise an
existing codebase with an AI assistant available. Meta lets candidates switch between models mid-interview
and scores on problem solving, code quality, verification and communication. Roughly 38% of US companies
now permit AI in technical interviews and 62% still forbid it — so the reader has to be ready for both
rooms. And the failure mode is documented: candidates who lean on the assistant without demonstrating
their own understanding get rejected.

**Senior signal:** owns the design and uses the tool, rather than the other way round.

---

### Appendix — DSA Patterns

**Covers:** 16 LeetCode patterns
**Budget:** 5,600 lines (down from 19,115)

Kept because the reader still has to pass the round, demoted to an appendix because pattern recognition is
not what this book is about, and cut by 70% because the current files run to 2,006 lines each — full
solution sets that belong in a linked repository. What stays: recognise the pattern, one worked template,
two worked examples, complexity, and a curated problem table.

---

## 5. Budget Summary

| Part                          | Chapters | Budget      | Share    |
| ----------------------------- | -------- | ----------- | -------- |
| I — Foundations               | ~22      | 5,000       | 9%       |
| II — Browser Platform         | ~26      | 6,000       | 11%      |
| **III — Modern Stack** 🆕     | ~46      | **12,000**  | **21%**  |
| IV — Frontend at Scale        | ~24      | 5,500       | 10%      |
| V — Backend                   | ~30      | 6,500       | 11%      |
| VI — System Design            | ~34      | 6,500       | 11%      |
| **VII — AI Engineering** 🆕   | ~31      | 7,500       | 13%      |
| VIII — Ship and Operate       | ~22      | 5,500       | 10%      |
| IX — Human Layer              | ~18      | 2,500       | 4%       |
| **Total (the book)**          | **~253** | **57,000**  | **100%** |
| Appendix — DSA (companion)    | 16       | 5,600       | separate |

Budgets are **ceilings, not allocations**. A part that comes in under does not hand its surplus to another
part — the book just gets shorter, which is always a win. The DSA appendix sits outside the 57,000 because
it ships as a companion (see item #27); if it is bound in, the total becomes ~62,600.

**The sums that have to hold:**

| Check                          | Value                                                    | Rule            |
| ------------------------------ | -------------------------------------------------------- | --------------- |
| Parts I–IX total               | 57,000                                                    | ≤ 60,000        |
| **Frontend spine (I–IV)**      | 28,500 of 57,000 = **50.0%**                              | **≥ 50%**       |
| Part III as a share            | 12,000 = **21%**                                          | Largest part    |
| Average chapter length         | 57,000 ÷ 253 = **225 lines**                              | Within 150–400  |

> **What "frontend-heavy" means, quantified:** Parts I–IV — language foundations, the browser platform,
> the modern stack, and frontend at scale — are **half the book**, and Part III alone is larger
> than any other single part. Backend, system design, AI, and operations together take the rest.
> Any restructuring that breaks either rule breaks the spec.

⚠️ **The spine is now exactly at its floor, and that is a hard constraint on every later amendment.**
Decision #12 raised Part VIII to 5,500 and took Parts I–IV from 51.8% to 50.0% of the book. There is no
headroom left: **any future increase to a Part V–IX budget has to be paid for by an equal decrease
elsewhere outside Parts I–IV**, or the spine drops below 50% and breaks non-negotiable #3. 5,500 is
therefore not a negotiating position for Part VIII — it is the arithmetic maximum that rule allows.

**Reality check on the page count:** at roughly 55 markdown lines per typeset page, 57,000 lines is
**950–1,050 pages**. That is a handbook, and the title says so. If the page count has to come down later,
the order of cuts is fixed: Part VIII first, then Part IX, then Part VI case studies — never Parts III or VII.

---

## 6. Explicitly Out of Scope

Saying no here is what keeps the book at 800 pages instead of 1,800. Each of these has a reason, and each
stays in the repository under `Archive/`.

| Out of scope                      | Why                                                                   |
| --------------------------------- | --------------------------------------------------------------------- |
| **Terraform and IaC**             | Platform-engineering career, not this reader's job                     |
| **Linux administration**          | Same — useful, wrong book                                              |
| **Python and shell automation**   | The book is TypeScript-only; scripting breaks that rule                |
| **Kubernetes operations**         | Beyond "my service runs in a pod somewhere", this is an SRE skill      |
| **Deep AWS service coverage**     | Three condensed chapters, not sixteen. Clouds differ; principles do not |
| **Cost optimisation as a discipline** | FinOps is its own field                                            |
| **Agile ceremonies in depth**     | One chapter in Part IX, not eight files                                 |
| **Model training and fine-tuning**| Part VII builds with models. Training is a different profession        |
| **Mobile and React Native**       | Web platform only                                                      |
| **Vue and Angular**               | Named in comparisons, not taught. Three frameworks is already generous |
| **English-language coaching**     | Personal practice material, not book content                           |
| **Company-by-company interview guides** | Ages within a quarter                                            |

### Deliberate ceilings

- **Three frameworks maximum** (React, Next.js, Svelte). A fourth makes the book a survey.
- **Ten backend case studies, five frontend.** More is a case-study book, which this is not.
- **One cloud** used for examples (AWS), with the principle always stated framework-free first.

---

## 7. Non-Negotiables

These hold for every chapter, with no exceptions and no per-chapter debate.

| # | Rule                                                                                          |
| - | --------------------------------------------------------------------------------------------- |
| 1 | **TypeScript only** for code examples. Allowed non-code fences: `bash`, `json`, `yaml`, `css`, `html`, `text`, `mermaid`, `tsx`, and the schema/config languages `sql`, `graphql`, `prisma`, `dockerfile`, `nginx`, `http`. A general-purpose language opts out one fence at a time, with a stated reason — see the marker in `scripts/lint-docs.ts` |
| 2 | **150–400 lines per chapter.** Over 400 means split it or cut it                                |
| 3 | **Short sentences, everyday words, active voice** — the `write-topic-docs` rule                 |
| 4 | **Concept before tool.** Name the idea, then the library that implements it                     |
| 5 | **Version-stamp every claim.** "React 19", not "modern React"                                   |
| 6 | **Every chapter closes the same way:** Key Takeaways → Interview Questions → What to read next   |
| 7 | **No topic is documented twice.** One canonical home, cross-references everywhere else          |
| 8 | **Cross-references by chapter, not by file path.** Relative links break in PDF and EPUB          |
| 9 | **No marketing tone.** No "leverage", "robust", "seamless", "cutting-edge"                       |
| 10| **Every code sample compiles.** Enforced in CI                                                  |
| 11| **No personal URLs or checklists in chapter bodies.** Those live in the back matter              |
| 12| **Volatile chapters carry a `⚠️ Moving target` callout** naming the durable principle underneath |

---

## 8. Reading Paths

The book has to work three ways. The front matter (item #72) makes these explicit.

| Path                  | Route                                                              | For                        |
| --------------------- | ------------------------------------------------------------------ | -------------------------- |
| **Interview sprint** (6 weeks) | Part I → III → VI → IX, then Appendix                     | Loop starts in a month     |
| **Working reference** | Any chapter, cold, via the index                                   | Tuesday afternoon          |
| **Cover to cover**    | I → IX in order                                                     | Levelling up deliberately  |

The working-reference path is the demanding one, and it is what forces non-negotiables 6, 7 and 8. A
chapter has to stand alone without the reader having read the two before it.

---

## 9. Success Criteria

The edition ships when all of these are true.

| # | Criterion                                                                    | Check                        |
| - | ---------------------------------------------------------------------------- | ---------------------------- |
| 1 | Every part exists with its README part-opener                                 | Manual                       |
| 2 | Total in-book length is 50,000–60,000 lines                                   | `scripts/lint-docs.ts`       |
| 3 | Parts I–IV ≥ 50% of the book, and Part III is the largest single part         | `scripts/lint-docs.ts`       |
| 4 | Zero broken cross-references                                                  | `scripts/lint-docs.ts`       |
| 5 | Zero chapters over 400 lines with `in_book: true`                             | `scripts/lint-docs.ts`       |
| 6 | Every code sample type-checks                                                 | `pnpm check:code-samples`    |
| 7 | Every version-specific claim names its version                                | Editorial pass (#67)         |
| 8 | One voice throughout                                                          | Editorial pass (#76)         |
| 9 | PDF and EPUB build with working TOC, no table or code overflow                | `pnpm book:build`            |
| 10| No topic documented in two places                                             | Editorial pass (#24, #31)    |

---

## 10. Amending This Spec

The spec is locked, not frozen. To change it: add a row to the decision log, state what changed and why,
bump the version, and update any improvement-plan items the change affects.

**Changes that need a very good reason:**

- Dropping Part III or Part VII (they are why the book exists)
- Taking the frontend spine (Parts I–IV) below 50%
- Letting any part grow larger than Part III
- Adding a fourth framework
- Relaxing the TypeScript-only rule
- Raising the total budget above 60,000 lines

---

## 11. Decision Log

| # | Date       | Decision                                                                 | Reasoning                                                                 |
| - | ---------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------- |
| 1 | 2026-08-26 | Spec locked at v1.0                                                      | Improvement plan item #1                                                   |
| 2 | 2026-08-26 | Frontend-heavy quantified as **≥50% across Parts I–IV**, Part III largest | "Frontend-heavy" needs a number or it drifts under pressure. Parts I–IV are the frontend spine: JS/TS, the platform, the stack, and scale |
| 2a| 2026-08-26 | Total budget set at **55,000 lines**, not 45,000                         | The 45,000 figure in the improvement plan was arithmetically wrong — its per-part rows summed to 81,600. Rebuilt bottom-up from chapter counts × ~220 lines |
| 3 | 2026-08-26 | Part III splits into **tool sections and model sections**                | Half the part survives the next major framework release                    |
| 4 | 2026-08-26 | Svelte included; **Vue and Angular excluded**                            | Highest retention of any framework, #2 meta-framework, and the author's daily stack — authenticity the other two would lack |
| 5 | 2026-08-26 | DevOps cut from 39,703 to 3,500 lines (−91%)                             | Aimed at a platform-engineering reader, not this one. Archived, not deleted |
| 6 | 2026-08-26 | DSA demoted to appendix, cut 70%                                         | Reader must pass the round; the book is not about passing that round       |
| 7 | 2026-08-26 | `AIUX/` included in Part VII                                             | The differentiator no competing AI book can write as well                  |
| 8 | 2026-08-26 | AWS chosen as the single cloud for examples                              | Existing content is AWS-based; principles stated cloud-free first          |
| 9 | 2026-08-26 | Nothing deleted — everything cut moves to `Archive/`                     | Preserves optionality for a second volume at zero cost                     |
| 10| 2026-08-28 | Non-negotiable #1's fence allow-list **completed**, not relaxed: added `graphql`, `prisma`, `dockerfile`, `nginx`, `http` | These are declarative schema and configuration languages with **no TypeScript form** — a Dockerfile cannot be written in TypeScript, so the rule as drafted meant deleting the example rather than translating it. `sql`, `yaml` and `css` were already allowed on exactly this footing; the original list was simply incomplete. The TypeScript-only rule for *general-purpose* languages is untouched, and § 10's "relaxing the TypeScript-only rule" bar is not engaged |
| 11| 2026-08-28 | A single fence may opt out of #1 via `<!-- lint-allow-fence: <lang> — reason -->`, with a required reason | Improvement #10. Some chapters teach untyped JavaScript semantics — implicit coercion, dynamic `this`, prototype manipulation — where TypeScript refuses to compile the very thing being shown. 37 fences use it; every one is in `Frontend/JavaScript/01`–`05`. The marker's language must match the fence, so it cannot silently cover a fence that later changes |
| 12| 2026-08-29 | **Part VIII's budget raised from 3,500 / ~18 chapters to 5,500 / ~22** | Item #20's own keep table is this book's contract for what Part VIII contains, and six finished sections cannot fit 3,500 lines. Five were complete at the time of the amendment — Git, Containers, Observability, Cloud, Deployment — at **4,556 lines across 18 chapters**, i.e. 130% of the old budget with CI/CD still to trim. The structural floor consistent with the keep table is 22 chapters; at the book's own average of 221 lines that is 4,862, and the finished sections average 253 because the six mandatory closing blocks cost ~55 lines before any teaching. 5,500 is chosen as the **maximum the frontend-spine rule permits** — 28,500 of 57,000 is exactly 50.0% — not as an estimate of what the part will weigh. The residual ~400 lines belong to the editorial pass (#76), which is where a 25-line-per-chapter trim belongs. Alternative considered and rejected: cutting whole sections from the keep table, which would mean a Part VIII with no Git or no CI/CD |

---

**Next:** improvement **#2** — extend `write-topic-docs` into the book chapter standard. No new chapter
gets written before that lands.
