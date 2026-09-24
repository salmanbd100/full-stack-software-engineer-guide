# Book Specification

> **This is the contract.** Every later decision — what to write, what to cut, what to archive — gets
> checked against this file. If a change contradicts the spec, either the change is wrong or the spec
> needs amending in the decision log at the bottom. Nothing gets changed silently.
>
> **Status:** Locked · **Version:** 1.9 · **Date:** 2026-09-24
> **Companion:** [IMPROVEMENT-PLAN.md](./IMPROVEMENT-PLAN.md) — Phase 9, which cuts the manuscript to the 940-page edition.

---

## 1. Identity

| Field         | Value                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------- |
| **Title**     | The Senior Full Stack Handbook                                                                 |
| **Subtitle**  | Frontend-heavy engineering for 2027 — fundamentals, the modern stack, system design, and AI     |
| **Author**    | Salman Rahman                                                                                  |
| **Edition**   | First (2027)                                                                                   |
| **Length**    | **38,600-line budget** in Parts I–IX · **~940 pages** at 42.8 lines per typeset page — decision #21. The manuscript measured 56,376 lines and 1,370 pages on 2026-09-23, before the cut |
| **Trim**      | **A4, 210 × 297 mm** · text block 156 × 251 mm, mirrored margins 26/28 inner/outer, 22/24 top/bottom — decision #18 |
| **Typefaces** | **Source Serif 4** body · **Source Sans 3** display · **Source Code Pro** code, vendored in `assets/fonts/` — decision #18 |
| **Language**  | British English (`colour`, `behaviour`, `organise`, `optimise`)                                |
| **Code**      | TypeScript only                                                                                |
| **Formats**   | PDF · EPUB · free web companion                                                                |
| **Sold on**   | **Leanpub**, in progress — decision #17                                                        |
| **Companion** | **VitePress**, generated from this manuscript: front and back matter, plus one sample chapter per part |
| **Book 2**    | *DSA Patterns* — sixteen algorithm patterns, built as its own PDF and EPUB with its own question index. The retail title is unchanged; the subtitle names it **Book 2** — decisions #6, #20, #23 |

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
**Budget:** 3,600 lines · ~19 chapters

Every senior interview still opens here, and research on 2026 loops is blunt about why the bar moved:
the questions have not changed in five years, but the depth expected has, **because an AI assistant can
answer the surface version instantly**. Explaining what a closure is no longer scores. Explaining why a
stale closure ate your `setInterval` callback does. This part exists to give the reader the layer beneath
the definition — and it comes first because Parts III, IV and VII all quietly depend on it.

**Senior signal:** can reason about the runtime, not just recite the API.

---

### Part II — The Browser Platform

**Covers:** HTML and CSS · Browser APIs and storage · Accessibility · Internationalisation · PWA
**Budget:** 3,800 lines · ~18 chapters

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
**Budget:** 8,400 lines · ~40 chapters — the largest part in the book, by design

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
**Budget:** 4,000 lines · ~19 chapters

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
**Budget:** 4,000 lines · ~19 chapters (down from 14,506 lines / 53 files, then 6,500 before decision #21)

The book is frontend-heavy, not frontend-only. This part is scoped by a single question: **what does a
frontend-heavy full stack engineer actually get asked and actually build?** That is Node's event loop,
REST and GraphQL and typed APIs, enough SQL to design a schema and read a query plan, JWT versus sessions,
and streaming endpoints — which matter far more now than they did in 2023, because Part VII's features
stream. It is not a backend career in a box, and it does not pretend to be.

**Senior signal:** designs an API the frontend can actually consume well, and knows why the query is slow.

---

### Part VI — System Design

**Covers:** Fundamentals · Building blocks · Frontend system design · Ten case studies
**Budget:** 4,400 lines · ~20 chapters

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
**Budget:** 5,200 lines · ~23 chapters

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
**Budget:** 3,400 lines · ~13 chapters

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
**Budget:** 1,800 lines · ~9 chapters

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

| Part                          | Chapters | Budget      | Share     |
| ----------------------------- | -------- | ----------- | --------- |
| I — Foundations               | ~19      | 3,600       | 9.3%      |
| II — Browser Platform         | ~18      | 3,800       | 9.8%      |
| **III — Modern Stack** 🆕     | ~40      | **8,400**   | **21.8%** |
| IV — Frontend at Scale        | ~19      | 4,000       | 10.4%     |
| V — Backend                   | ~19      | 4,000       | 10.4%     |
| VI — System Design            | ~20      | 4,400       | 11.4%     |
| **VII — AI Engineering** 🆕   | ~23      | 5,200       | 13.5%     |
| VIII — Ship and Operate       | ~13      | 3,400       | 8.8%      |
| IX — Human Layer              | ~9       | 1,800       | 4.7%      |
| **Total (the book)**          | **~180** | **38,600**  | **100%**  |
| Appendix — DSA (companion)    | 16       | 5,600       | separate  |

These are the **940-page edition's** budgets — decision #21. They replace the 57,200-line set the book
was written against, which produced 56,376 lines and 1,370 pages. Every part is over its new ceiling on
the day this table is saved, by **17,776 lines** in total; items #96–#104 of the improvement plan cut
that number to 0, one part at a time, and `.lint-baseline.json` records it falling.

Budgets are **ceilings, not allocations**. A part that comes in under does not hand its surplus to another
part — the book just gets shorter, which is always a win. The DSA appendix sits outside the total because
it ships as a separate volume — **Book 2**, decision #23 — with its own 5,600-line ceiling. It measured
4,618 lines on 2026-09-23 and none of the cut items touch it.

**The sums that have to hold:**

| Check                          | Value                                                    | Rule            |
| ------------------------------ | -------------------------------------------------------- | --------------- |
| Parts I–IX total               | 38,600                                                    | ≤ 60,000        |
| **Frontend spine (I–IV)**      | 19,800 of 38,600 = **51.3%**                              | **≥ 50%**       |
| Part III as a share            | 8,400 = **21.8%**                                         | Largest part    |
| Average chapter length         | 38,600 ÷ 180 = **214 lines**                              | Within 150–400  |

> **What "frontend-heavy" means, quantified:** Parts I–IV — language foundations, the browser platform,
> the modern stack, and frontend at scale — are **half the book**, and Part III alone is larger
> than any other single part. Backend, system design, AI, and operations together take the rest.
> Any restructuring that breaks either rule breaks the spec.

⚠️ **The cut is uneven on purpose, and the spine is why.** Parts I–IV lose 31% of their lines and Parts
V–IX lose 37%, which lifts the spine from the 50.03% measured at #85 to 51.3% at budget. At budget that
is **1,000 lines of headroom** — Parts V–IX may total at most what Parts I–IV total. It is headroom at the
ceilings, not in the tree: a cut that takes Parts I–IV well *under* their budgets while Parts V–IX land
*on* theirs spends it, which is exactly how #77 found the spine at 48.4%. Every cut item re-runs
`pnpm book:pages` and stops if the spine line goes red.

**The page count.** `pnpm book:pages` reads the typeset PDF and reports the real rate: **42.8** markdown
lines per page since #87's calibration. 38,600 part lines, plus 315 of front matter, plus roughly 1,500
of back matter once the generated question index shrinks with the chapter count, is about 40,400 lines —
**roughly 940 pages**, down from the 1,370 measured on 2026-09-23. Fewer chapters also means fewer
part-opening pages, so the real number should land slightly under. Improvement #114 measures it, and
the edition is not called 940 pages until it has.

If the page count has to come down further, the order of cuts is fixed: Part VIII first, then Part IX,
then Part VI case studies — never Parts III or VII.

🔴 **Decision #13's 700-page ceiling is still not reachable.** #87 proved the print design has no slack
left to give: on A4 the text block is already about **85 characters a line**, so every further page has
to come out of the manuscript. 700 pages would need roughly 10,000 more lines out of a 38,600-line book —
a whole part's worth, and a different book. See decisions #19 and #21.

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
| 1 | **TypeScript only** for code examples. Allowed non-code fences: `bash`, `json`, `yaml`, `css`, `html`, `text`, `mermaid`, `tsx`, the component-template languages `svelte`, and the schema/config languages `sql`, `graphql`, `prisma`, `dockerfile`, `nginx`, `http`. A general-purpose language opts out one fence at a time, with a stated reason — see the marker in `scripts/lint-docs.ts` |
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
| 2 | Every part inside its § 5 budget — 38,600 lines in total                      | `scripts/lint-docs.ts`       |
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
| 13| 2026-09-03 | **Hard ceiling of 700 pages** replaces § 1's 850–1,050 | An external constraint on the edition, not an editorial preference. It is a *page* budget, and § 1 and § 5 both express the budget in *lines* against an unmeasured 55-lines-per-page rate. #5's real build measured 36. Recording the cap here rather than rewriting the line budgets keeps the two decisions separate: this row fixes the target, **#77** measures the rate and reconciles the arithmetic. The fixed cut order in § 5 — Part VIII, then Part IX, then Part VI case studies, never Parts III or VII — is what the cap will be paid for out of |
| 14| 2026-09-03 | **`Frontend/CSSArchitecture/` archived entire; 5 of 8 `Frontend/HtmlCss/` chapters archived** — 2,077 lines out of Part II | Improvement #31f. Two findings drove it. First, **duplication**: `CSSArchitecture/04-design-systems.md` and `SystemDesign/Frontend/08-design-systems.md` are near-verbatim — same topic, same "forty teams" framing, same subtopic list — a plain non-negotiable #7 violation, and design tokens had a third home in `HtmlCss/08-advanced-css.md`. Second, **audience**: CSS layout mechanics — the box model, flexbox, grid, breakpoints, keyframes — are assumed knowledge for a staff candidate and are not asked to be recited. What is probed is the part with a legal or architectural consequence, so `01-semantic-html`, `07-accessibility` and `08-advanced-css` were kept and renumbered 01–03. Corroborating evidence: **all nine archived chapters had zero inbound cross-references**, while the three keepers had 2, 5 and 4 — the archived set was orphaned. The three surviving `CSSArchitecture` arguments (methodologies, utility-first vs component-first, CSS-in-JS runtime cost) are **archived rather than staged under `salvage/`**, because no Part III item names a styling chapter; #41's `Tooling/` table has none. If that argument is wanted in the book, it needs a new item — see #31f's note. Accepted cost: the spine breach recorded in § 5 |
| 15| 2026-09-06 | Non-negotiable #1's fence allow-list gains **`svelte`**, on the same footing as `html` and `css` | Improvement #38. A `.svelte` file is a **component template with no TypeScript form** — its markup, its `{#snippet}` blocks and its `{@render}` tags are compiler syntax, and the only part of it that *is* TypeScript already sits inside `<script lang="ts">`. This is decision **10** applied to a language the original list did not anticipate, not a relaxation: general-purpose languages still opt out one fence at a time. The alternative considered and rejected was the entry-11 marker, which would have meant an identical `lint-allow-fence` comment above all **17** `svelte` fences in `Frontend/ModernStack/Svelte/`, and more with every future Svelte chapter — turning a deliberate per-fence exception into boilerplate and hiding the genuine JavaScript opt-outs in `Frontend/JavaScript/`. `tsx` is the precedent for a component syntax being allowed outright. § 10's "relaxing the TypeScript-only rule" bar is not engaged |
| 16| 2026-09-19 | **Part I raised 5,000 → 5,100 and Part IV 5,500 → 5,600**, to pay for the part openers those two parts never had | Improvement #76. Every part of this book is required by `write-topic-docs` to open on a part opener, and six parts had one because their content sits under a single directory whose README became it. Parts I, II, IV and IX have no such directory — their content spans two or more top-level directories — so they opened on a **section index** instead, and a reader arriving at Part I landed on JavaScript. #76 wrote the four missing openers at the root, placed by front-matter `part:`. Part II absorbed its opener inside its existing budget and Part IX was brought under by trimming, but Parts I and IV had 4 and 0 lines of headroom. The alternative considered and rejected was trimming ~95 lines of teaching prose out of 46 finished chapters to pay for two navigation pages — a bad trade, and one that would have been made against a number rather than against the writing. **The amendment moves the spine the right way:** Parts I–IV go from exactly 50.0% to 50.2%, which reduces rather than adds to the breach recorded below. The increase is +200 lines against a 700-page ceiling, roughly four pages. Before amending, **the duplication the new openers created was removed first**: the part-level "senior signal" sentence was being restated in all nine section indexes of the three parts, and `Frontend/JavaScript/README.md` opened on a paragraph the new Part I opener now carries verbatim — 60 lines came back that way |
| 17| 2026-09-19 | **Leanpub for the book, a generated VitePress companion for the marketing** | Improvement #78, and the option the item already recommended. Leanpub pays while the book is still being written, which matters for an edition dated 2027 and 84 items into a 93-item plan; Gumroad and self-hosting both require the book to be finished before the first sale. The companion is **generated, never written**: `scripts/build-site.ts` reads the same `loadBook` the PDF build uses, so a chapter edit reaches the site on the next run and the two cannot drift. What it publishes is the marketing decision — the front matter, **every back-matter page including all 988 interview questions**, every part opener and section index, and **one sample chapter per part**, named by slug in `SAMPLE_CHAPTERS` with a build-time guard that fails if a rename orphans one. The remaining 236 chapters are the product. A cross-reference to an unpublished chapter loses its link and keeps its title, so the site never ships a dead link to a page that exists only on paper |

| 18| 2026-09-23 | **Trim, typefaces and the page rate recorded in § 1 — all three measured; chapters no longer forced onto a right-hand page** | Improvement #77, which existed to replace three assumptions with three measurements. **The rate:** § 5 assumed ~55 markdown lines per typeset page; `pnpm book:pages` reads the finished PDF and reports **40.6**, so every page figure derived from it was optimistic by a third. The book is **1,513 pages**. **The trim:** A4, 210 × 297 mm. Chosen because decision #17 sells the edition on Leanpub, which delivers a download rather than a print run, and A4 is the most page-efficient of the realistic options. The alternative the improvement plan assumed — Crown Quarto 189 × 246 mm, credited with "recovering ~180 pages" — is arithmetically backwards: the same margins on a smaller leaf give a 135 mm text block instead of 156 mm, 31% less area per page, so it **costs** several hundred pages. That error is corrected at the item. **The typefaces:** the three OFL families #79 vendored, now named in the spec rather than only in `scripts/tex/typography.tex`. **And one change to the book itself:** `openany`, because the class opened every chapter on a recto and that cost **182 completely blank pages** out of 1,690 — 11% of the edition, spent on a convention that a chapter still satisfies by starting a fresh page. Parts keep their recto openings, which is ten leaves rather than 182 |
| 19| 2026-09-23 | **The 700-page ceiling is recorded as unreachable rather than met: the edition is 1,370 pages, and the design's remaining slack was worth 5%, not 40%** | Improvement #87. § 5 estimated that tighter leading, a wider text block and a smaller body size would recover "roughly 40%, landing near 900". Spent, it recovered **5%** — from 40.6 to **42.8** markdown lines per typeset page. The estimate was wrong for a geometric reason worth writing down: a page has vertical slack and horizontal slack, and on A4 only one of them can be spent. The text block is 156mm at 10pt, which is already about **85 characters a line** against the 66–80 a reader tracks comfortably, so widening the measure or shrinking the type would have bought pages by making the book harder to read. #87 therefore took the vertical slack only — leading 13.2pt → 12.8pt, head and foot margins 22/24mm → 20/21mm, paragraph spacing 0.30em → 0.22em, block spacing 9pt → 7.5pt, code and table leading each down half a point — and left the measure and the 10pt body untouched. **Decision #13 stands as an aspiration for a second edition, not as a constraint this one meets.** Reaching 700 pages needs roughly 28,000 lines removed, which § 5 has said since #77 is a different book and an editorial decision rather than a calibration one. Two side effects are recorded with it: `\tokBlockSkip` could not be changed at all until a latent bug was fixed — `-0.4\tokBlockSkip` expanded to `-0.4 9pt` and TeX had been silently reading it as **-0.49pt** rather than the intended -3.6pt, so the token now also exists as a length register — and the DSA appendix leaving the volume at #86 took 96 pages with it |
| 20| 2026-09-23 | **The DSA appendix is built as its own volume, which the spec has claimed since v1.0** | Improvement #86. § 5 has always excluded the appendix from the book's line budget "because it ships as a companion", and § 1 billed it as one, but `scripts/lib/book.ts` mapped it to part 10 and it bound into the same PDF — 101 of the 1,513 pages measured at #77. The collector now takes a `--volume`, `pnpm book:companion` builds the appendix as its own PDF and EPUB from its own metadata file with its own retail identifier, and **a cross-reference that points at the other volume keeps its title and loses its link**, with the volume named in brackets. That last rule is #78's own treatment of a chapter the site does not publish, applied to print; there were 17 such references, all in the front and back matter, and without it the handbook would have shipped 17 cross-references resolving to "(p. ??)" |
| 21| 2026-09-24 | **The 940-page edition: part budgets cut from 57,200 to 38,600 lines**, every part reduced, the spine raised to 51.3% | Improvement #95, opening Phase 9. The finished manuscript measured **1,370 pages** — about 2.5 kg in print, too long to read before an interview, and with no obvious place to start. The rule for what stays is narrow: a senior frontend or full stack interviewer asks about it, a frontend-heavy engineer owns it, it explains *why* rather than listing options, and no other chapter already teaches it. Chapters are merged or moved to `Archive/`, never deleted — decision #9. **Why 940 and not 700:** decision #13's ceiling needs roughly 10,000 more lines out, which means dropping a whole part, and #87 proved the print design has no slack left to pay for it (decision #19). 940 is a book a reader can hold and finish, and 430 pages lighter than what exists. **Why the cut is uneven:** Parts V–IX take 37% and Parts I–IV 31%, so the spine rises from 50.03% to 51.3% and gains the 1,000-line margin it has never had; Part III stays largest at 21.8%. The fixed cut order is honoured — Part VIII takes the deepest proportional cut (38%). Decision #13 stays in the log as the aspiration it already was |
| 22| 2026-09-24 | **A plain-English pass, part by part, replaces the cover-to-cover voice pass of old improvement #92** | Improvement #95. § 3 has always asked for short sentences, everyday words and active voice, and half of this book's readers do not speak English as a first language — but measured prose runs **18.5–21.5 words a sentence**, with 1,317 sentences over 32 words across the nine parts. Old #92 was dropped rather than finished because it would have edited prose that the cut was about to archive. Its replacement is items **#105–#113**, one part each, run **after** the cut, against the 15–20 word target. The idea stays senior; only the sentences carrying it get shorter. The 32-word count is a pointer, not a quota |
| 23| 2026-09-24 | **The DSA companion stays a product, as Book 2.** Decisions #6 and #20 stand. A proposal to retire it, drafted into Phase 9 as improvement #95a, was **rejected by the owner the same day** | The case for retiring it: the split between the two volumes was never finished. The handbook's `Interview-Question-Index.md` still lists **87 DSA questions** linking to anchors that exist only in the companion, so the handbook ships 87 dead links, and the companion ships with no index at all. Retiring the volume would have fixed that by deleting the product. The case that won: the reader still has to pass the coding round, which is decision #6's reason and has not changed, and #86 has already built the second volume. So **#95a now finishes the split instead** — one question index per volume, and a check that a cross-reference resolves inside its own volume. Book 2 keeps its own 5,600-line ceiling outside the 38,600 total, so it does not affect the 940-page target |
---

**Next:** improvement **#2** — extend `write-topic-docs` into the book chapter standard. No new chapter
gets written before that lands.
