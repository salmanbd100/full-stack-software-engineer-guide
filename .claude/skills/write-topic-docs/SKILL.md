---
name: write-topic-docs
description: Run this skill BEFORE writing or editing ANY document in this repo — chapters, READMEs, or any markdown under Frontend/, Backend/, DSA/, SystemDesign/, DevOps/, OOP/, Behavioral/, or Communication/. This repo is a book manuscript; the Book Chapter Standard in this skill is mandatory. Use when the user asks to "write docs", "add a topic", "add a chapter", "edit a file", "create a new pattern doc", "document X", or "add a markdown for Y".
---

# Write Topic Documentation

Authoritative style guide for creating and editing topic markdown files in this repository. Follow these rules every time documentation is added or modified — they replace any default writing style.

## When to Use This Skill

Trigger this skill when the user asks to:

- Create a new topic file (e.g. `01-prefix-sum.md`, `closures.md`)
- Edit or rewrite an existing topic
- Write a README index for a domain/subdirectory
- Convert dense notes into structured documentation
- Bring a file up to the repo's style standard

## 📖 The Book Chapter Standard (MANDATORY)

> This repository is the manuscript for **The Senior Full Stack Handbook** — see [`BOOK-SPEC.md`](../../../BOOK-SPEC.md).
> Every topic file is a **book chapter**, not a note. It gets bound, printed, and read cold by someone who
> did not read the chapter before it.
>
> - **Canonical example:** [`REFERENCE-CHAPTER.md`](../../../REFERENCE-CHAPTER.md) — when this standard and
>   your instinct disagree, open that file and copy what it does. _(Created by improvement #4.)_
> - **Copy-paste starting point:** [`CHAPTER-TEMPLATE.md`](./CHAPTER-TEMPLATE.md) — start every new chapter
>   by copying this file.

### The Six Blocks

Every chapter has these six blocks, in this order. No reordering, nothing extra between them.

| #   | Block               | Purpose                                             |
| --- | ------------------- | --------------------------------------------------- |
| 1   | Front matter        | Machine-readable ordering and metadata for the build |
| 2   | Opening             | Title, one-sentence promise, what is in the chapter  |
| 3   | Body                | The teaching                                         |
| 4   | Key Takeaways       | 3–5 lines the reader keeps                           |
| 5   | Interview Questions | 3–6 questions with answer shapes                     |
| 6   | What to Read Next   | 2–3 cross-references                                 |

---

#### Block 1 — Front matter

```yaml
---
title: React Server Components
part: 3
chapter: 14
slug: react-server-components
level: advanced # beginner | intermediate | advanced
reading_time: 12
updated: 2026-09-01
tags: [react, rsc, rendering, nextjs]
in_book: true
---
```

- `slug` is lowercase-hyphen and **globally unique** — cross-references depend on it
- `in_book: false` keeps a file in the repo but out of the manuscript
- Do not know the chapter number yet? Use `chapter: 0`. Improvement #70 assigns the real ones

---

#### Block 2 — Opening

```markdown
# React Server Components {#ch-react-server-components}

> Render on the server, ship no JavaScript for it, and know exactly where the boundary sits.

**In this chapter:** the server/client split · what can cross the boundary · `'use client'` · the mistakes that get caught in review
```

| Rule                                                                          | Why                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| H1 text matches front matter `title` **exactly**                              | The build trusts one of them; keep them equal |
| H1 carries `{#ch-<slug>}`                                                     | Every cross-reference in the book targets it  |
| The promise is **one sentence**, in a blockquote, saying what the reader can _do_ | It is the chapter's contract               |
| **In this chapter:** is 3–5 items joined by ` · `, no full stop                | Scannable; sets expectations in one line      |
| ❌ **No hand-written Table of Contents**                                       | The build generates it. Delete existing ones  |
| ❌ **No back-links** like `[← Back to README]`                                 | The build handles navigation                  |

---

#### Block 3 — Body

Standard flow. Add topic-specific sections after `When to Use It`, never before.

```markdown
## 💡 The Core Idea

One paragraph. The mental model, in plain words, before any API name.

## How It Works

The mechanism. Tables and diagrams over prose.

## When to Use It

A decision table — scenario, choice, reason.

## Common Mistakes

❌ / ✅ pairs. The mistake first, the fix second, and why it matters.
```

- **Heading levels `##` and `###` only.** Never `####` — it does not survive typesetting
- Never two headings in a row with no text between them
- Every code block gets a bold label line above it

---

#### Block 4 — Key Takeaways

```markdown
## 🔑 Key Takeaways

- Server Components run once, on the server, and never re-render.
- Only serialisable values cross the boundary — functions and class instances do not.
- `'use client'` marks an entry point, not a file-by-file switch.
```

3–5 bullets. Each is a **complete sentence** that stands alone out of context. No sub-bullets.

---

#### Block 5 — Interview Questions

```markdown
## Interview Questions

**Q: Why can't you pass a function as a prop from a Server Component to a Client Component?**

Props are serialised into the RSC payload and sent over the wire. A function has no serialised form, so
React throws at render. The fix is to pass data down and define the handler inside the Client Component,
or to pass a Server Action, which React serialises as a reference rather than as code.
```

- 3–6 questions
- The answer is the **shape of a good answer in 2–4 sentences**, not a script to memorise
- At least one question must be a judgement call — _"when would you not use this?"_

---

#### Block 6 — What to Read Next

```markdown
## What to Read Next

- [Chapter 15 — Suspense and Streaming](#ch-suspense-and-streaming) — how the payload arrives progressively
- [Chapter 22 — Rendering Strategies](#ch-rendering-strategies) — where RSC sits on the spectrum
```

2–3 links, each with a short reason. This is what makes the book navigable rather than a pile of files.

---

### Cross-References

Relative file paths break in PDF and EPUB. **Chapter bodies never contain one.**

| Need                     | Write                                                             | Never                                              |
| ------------------------ | ----------------------------------------------------------------- | -------------------------------------------------- |
| Point at another chapter | `[Chapter 14 — React Server Components](#ch-react-server-components)` | `[RSC](../ModernStack/React/05-server-components.md)` |
| Chapter number unknown   | `[Chapter ?? — Title](#ch-slug)`                                  | Guessing a number                                   |
| Point at an external doc | A normal absolute URL                                             | —                                                   |

The anchor resolves to a link on the web and to _"see page N"_ in print. It works because every H1 carries
`{#ch-<slug>}`.

---

### Callout Vocabulary (fixed set — nothing else)

| Icon    | Means         | Where                                         | Budget per chapter |
| ------- | ------------- | --------------------------------------------- | ------------------ |
| **💡**  | The core idea | The `## 💡 The Core Idea` heading only         | Exactly 1          |
| **🔑**  | Key takeaway  | The `## 🔑 Key Takeaways` heading only         | Exactly 1          |
| **⚠️**  | Gotcha        | Inline blockquote warnings                     | Max 3              |
| **✅ ❌** | Right / wrong | Tables and before/after pairs — always paired | Unlimited          |

**Retired:** 🔴 ✨ 🎯 📚 🚀 🎨 🔧 💻 🏗️ 🎭 🗣️ 📊 and every other decorative emoji. They typeset badly and
carry no meaning. **No emoji in `##` or `###` headings** except the two fixed ones above.

> Part-opener READMEs may keep a restrained set of section emoji — they are navigation pages, not chapters.

---

### The Moving-Target Callout

Required in any chapter about a tool that ships breaking changes yearly (Next.js caching, the React
Compiler, AI SDKs, bundlers):

```markdown
> ⚠️ **Moving target:** Next.js caching semantics changed in 15 and again in 16. The durable principle is
> that caching is opt-in per request and revalidation needs an explicit key. The API names will move.
```

Always name the **durable principle** underneath. That sentence is what keeps the chapter useful in 2028.

---

### Diagrams

| Shape                                       | Use                                              | Why                                     |
| ------------------------------------------- | ------------------------------------------------ | --------------------------------------- |
| More than 3 nodes, or any branch or cycle   | ` ```mermaid `                                    | ASCII loses alignment when typeset      |
| Linear, 3 steps or fewer                    | ASCII with `↓`                                   | Cheap and prints fine                   |
| Screenshots, images, hand-drawn art         | ❌ Do not                                         | Cannot be maintained or version-controlled |

Stick to `flowchart`, `sequenceDiagram`, and `stateDiagram-v2` — those three render reliably in the PDF
pipeline. Every diagram gets a bold caption line underneath saying what it shows.

---

### Length and Voice

| Rule                | Value                                                                       |
| ------------------- | --------------------------------------------------------------------------- |
| **Chapter length**  | 150–400 lines, **target ~220** (the book budget divides to 221 lines/chapter) |
| **Over 400**        | Split it or cut it. No exceptions                                            |
| **Under 150**       | Merge it — it is a section, not a chapter                                    |
| **Person**          | Second person for instructions, third for mechanism. Never "we"              |
| **Tense**           | Present                                                                      |
| **Voice model**     | `Backend/API/01-rest-best-practices.md` — the strongest voice in the repo    |

---

### Part-Opener READMEs

A different standard. 60–150 lines, front matter with `chapter: 0`.

1. `# Part N — Name`
2. One paragraph: why this part exists and what the reader can do at the end of it
3. Chapter table: `#` · Chapter · What it answers
4. `## What Interviewers Probe For` — lift the **senior signal** for this part from `BOOK-SPEC.md`
5. `## Reading Order` — including which chapters the interview-sprint path can skip

---

### Before You Finish a Chapter

- [ ] Six blocks present, in order
- [ ] Front matter valid, `slug` unique, H1 carries `{#ch-<slug>}`
- [ ] 150–400 lines
- [ ] TypeScript-only code, every sample would compile
- [ ] No hand-written TOC, no back-link, no `####`
- [ ] Only 💡 🔑 ⚠️ ✅ ❌ used, within budget
- [ ] Zero relative file links in the body
- [ ] Version-stamped: "React 19", never "modern React"
- [ ] Moving-target callout present if the topic moves yearly
- [ ] Reads correctly **cold**, without the previous chapter

## Author Profile

**Salman Rahman — Senior Frontend Engineer, 9+ years**

- Full stack: React, TypeScript, Next.js, Node.js, Express, GraphQL, Angular, Svelte
- DevOps: Docker, AWS, CI/CD, LLM integration
- Specializations: enterprise-scale architecture, WCAG accessibility, web performance, state management
- Interview target: Senior/Staff roles at MNCs and enterprise companies

**What this means for ALL content:**

- Write at **senior level** — internals, tradeoffs, and architecture decisions matter
- **Fundamentals over tools** — explain the concept first; name the specific library second
- Use **enterprise scenarios** for examples: dashboards, portals, pipelines, public sector systems
- Every topic should answer: _"Why does this exist? When do I reach for it? What are the tradeoffs?"_

## Scope & Length (MANDATORY)

**Keep docs short. Cover only common, frequently-used topics.** Interview prep is about depth on the things that actually come up — not exhaustive reference material.

**Do:**

- ✅ Focus on the **20% of patterns/APIs that appear in 80% of interviews**
- ✅ Aim for **150–400 lines per topic file** (READMEs can be shorter)
- ✅ Cut anything a senior engineer would already know or rarely use
- ✅ Pick **2–3 strong examples** over 6 mediocre ones
- ✅ One clear "when to use" decision rule per topic

**Don't:**

- ❌ Document every edge case, flag, or rare API
- ❌ Include exhaustive lists when the top 3–5 are enough
- ❌ Repeat the same idea in multiple sections
- ❌ Add historical/deprecated patterns unless they appear in interviews
- ❌ Write a 1000-line "complete reference" — link to official docs instead

> If a section doesn't help someone pass a senior interview, cut it.

## Required Inputs

Before writing, confirm or infer:

1. **Book part** — which of the nine parts in `BOOK-SPEC.md` this belongs to
2. **Domain** — Frontend (incl. ModernStack), **AI**, Backend, SystemDesign, ShipAndOperate, Behavioral,
   Communication, DSA
3. **Topic** — the concept being documented
4. **File path** — sequential numbering (`01-topic.md`), lowercase-hyphen names
5. **Language** — **TypeScript only** for all code examples

> If the topic is on the out-of-scope list in `BOOK-SPEC.md` § 6, **say so and stop.** Do not write it.

## Code Language Rule (MANDATORY)

**All code examples must be TypeScript.** No JavaScript, Python, or other languages — even for comparison.

- ✅ Use ` ```typescript ` for every code fence
- ✅ Add types on parameters, return values, and non-trivial locals
- ✅ Use `interface` / `type` aliases when modeling data
- ✅ Show generics where they clarify the example
- ❌ No ` ```javascript `, ` ```js `, ` ```python ` fences
- ❌ No untyped function signatures (unless demonstrating type inference)
- ❌ Don't duplicate the same example in two languages

## Core Principles

1. **Fundamentals over tools** — explain the concept before naming a library
2. **Simple, beginner-friendly English** — short sentences, everyday words
3. **No walls of text** — break dense paragraphs into scannable chunks
4. **Visual hierarchy** — headers, bullets, tables, diagrams
5. **Practical focus** — connect theory to real interview scenarios
6. **Cover only what matters** — common topics, not exhaustive references

## Language & Tone Rules

Write in **simple, beginner-friendly English**. A reader new to the topic — or whose first language is not English — should understand every sentence on the first read.

**Do:**

- ✅ **Short sentences** (aim for 15–20 words max)
- ✅ **Everyday words** ("use" not "utilize", "show" not "demonstrate")
- ✅ **Active voice** ("React updates the DOM" not "the DOM is updated")
- ✅ Define a technical term the first time you use it, in plain words
- ✅ Use analogies and concrete examples over abstract description

**Don't:**

- ❌ Long, multi-clause sentences with several commas
- ❌ Jargon stacked on jargon without explanation
- ❌ Latin phrases ("i.e.", "e.g.") — write "for example", "such as"
- ❌ Marketing tone ("leverage", "robust", "seamless", "cutting-edge")
- ❌ Passive voice when active works

### Quick Word Swaps

| ❌ Avoid    | ✅ Use Instead         |
| ----------- | ---------------------- |
| utilize     | use                    |
| facilitate  | help                   |
| leverage    | use                    |
| demonstrate | show                   |
| subsequent  | next / later           |
| in order to | to                     |
| prior to    | before                 |
| commence    | start                  |
| terminate   | end / stop             |
| methodology | method / way           |

### Before / After Tone Example

**❌ Too formal:**

> Closures facilitate the encapsulation of state by leveraging lexical scoping mechanisms, which subsequently enables the creation of private variables.

**✅ Simple:**

> A closure lets a function "remember" variables from where it was created. This is how you make private variables in JavaScript.

## Typography Patterns

### ❌ AVOID: Dense Paragraph Style

```markdown
**Concept Name** - Long explanation that continues for 5-6 lines without
breaks, covering multiple points like how it works, why it matters, when
to use it, common pitfalls, and best practices all in one paragraph...
```

### ✅ USE: Structured Style

```markdown
## How It Works

Clear explanation in digestible chunks.

**When to use it:**

| Scenario         | Choose       | Why                   |
| ---------------- | ------------ | --------------------- |
| Good scenario    | This option  | The one-line reason   |
| Wrong scenario   | Other option | The deciding tradeoff |

> The line worth remembering.
```

> Heading text above is illustrative. The **chapter-level** headings are fixed by The Six Blocks —
> do not invent new `##` headings before `## When to Use It`.

## Visual Elements

### Status Icons

> See **Callout Vocabulary** in the Book Chapter Standard above. The fixed set is **💡 🔑 ⚠️ ✅ ❌** and
> nothing else. 🔴 and ✨ are retired.

### Comparison Tables

Use tables for side-by-side comparisons:

```markdown
| Feature         | Approach A     | Approach B     |
| --------------- | -------------- | -------------- |
| **Performance** | O(n)           | O(n²)          |
| **Use Case**    | Small datasets | Large datasets |
```

### Decision Tables

Help readers choose:

```markdown
| Scenario            | Use This   | Why               |
| ------------------- | ---------- | ----------------- |
| Need transformation | `map()`    | Returns new array |
| Need filtering      | `filter()` | Removes items     |
```

### Flow Diagrams

ASCII is allowed **only** for a linear process of 3 steps or fewer:

```
Step 1: Initial state
    ↓
Step 2: Process
    ↓
Step 3: Result
```

Anything with a branch, a cycle, or more than 3 nodes must be Mermaid — see **Diagrams** in the Book
Chapter Standard above.

## Explanation Structure

### Before/After Pattern

````markdown
**❌ Before (Problem):**

```typescript
const doubled: number[] = [];
items.forEach((item: number) => doubled.push(item * 2));
```

**✅ After (Solution):**

```typescript
const doubled: number[] = items.map((item: number) => item * 2);
```
````

### Pros/Cons Lists

```markdown
**Pros:**
- Clear benefit 1
- Clear benefit 2

**Cons:**
- Clear drawback 1
```

## Standard Section Flow

> **Superseded.** Chapter structure is now fixed by **The Six Blocks** in the Book Chapter Standard above.
> Use that, not this. The pattern below survives only as the shape of **Block 3 (Body)**:
>
> `## 💡 The Core Idea` → `## How It Works` → `## When to Use It` → `## Common Mistakes`

## Code Examples

### Code Block Headers

Always label what the code shows:

````markdown
**Pattern Name:**

```typescript
// Concise comment on the key point
const example: string = "code here";
```
````

### Inline Annotations

Comments explain **why**, not **what**:

```typescript
// ✅ Good — explains why
const doubled = numbers.map((n: number) => n * 2); // Avoid mutation
```

### Complexity Notation

Inline comments for DSA/algorithms:

```typescript
// Time: O(n), Space: O(1)
```

## Typography Rules

### Headers

- **Chapter title**: `# Chapter Title {#ch-slug}` — one per file, matching front matter `title`
- **Major sections**: `## Section Name`
- **Subsections**: `### Subsection Name`
- ❌ **Never `####`** — it does not survive typesetting. Split the chapter instead
- ❌ **No emoji in headings** except `## 💡 The Core Idea` and `## 🔑 Key Takeaways`

### Emphasis

- **Bold** for important terms: `**key term**`
- _Italic_ for subtle emphasis
- `Code font` for code references
- > Blockquotes for key insights

## File Conventions

- **Sequential numbering**: `01-topic.md`, `02-topic.md`
- **Lowercase with hyphens**: `fast-slow-pointers.md`
- **No `&` or spaces** in directory names — they break URLs and shell globs
- **README.md** in every content directory — it is the **part opener**, not a TOC (see the Book Chapter
  Standard above)
- The filename number sets reading order **within** a directory; front matter `part` and `chapter` set it
  **within the book**. Keep the two consistent

## Domain-Specific Notes

### Frontend/

- Lead with the JS/TS concept, not the framework
- Core Web Vitals (**INP**, not FID) and WCAG 2.2 are first-class topics
- Cover browser internals where they actually appear in interviews (event loop, rendering)

### Frontend/ModernStack/

- **Three frameworks only:** React, Next.js, Svelte. Vue and Angular appear in comparisons, never as chapters
- The `Rendering/`, `StateManagement/` and `Tooling/` sections are **framework-agnostic by design** —
  they must still read correctly after the next major release of anything
- Always **Context7 MCP first**. This is the fastest-moving content in the book and training data goes stale

### AI/

- For engineers who **build with** models, not who train them. No CUDA, no PyTorch, no maths beyond
  what cosine similarity needs
- TypeScript throughout, like every other part
- Every chapter names what it would **measure** — evals are the through-line of the whole part
- Context7 MCP first for any SDK

### Backend/

- Lead with the architectural concept (REST vs GraphQL, sync vs async)
- Node.js + Express is the primary example stack
- Security and performance always relevant

### DSA/

- Pattern-based learning, not exhaustive algorithm coverage
- Each pattern: "When to use this pattern"
- Curated LeetCode problems only — not every variant

### SystemDesign/

- **RADIO framework**: Requirements → Architecture → Data model → Interface → Optimizations
- Real-world examples: Twitter, Uber, Netflix, Google Docs

### DevOps/ → ShipAndOperate/

- Lead with the concept (immutability, declarative config, observability)
- **Scope is what a frontend-heavy full stack engineer owns:** Git, Docker, CI/CD, observability, deployment
- Terraform, Linux administration, shell/Python scripting, and Kubernetes operations are **out of scope**
  per `BOOK-SPEC.md` — they live in `Archive/`. Do not write new chapters on them
- AWS is the primary cloud example, but state the principle cloud-free first

### OOP/

- Language-agnostic patterns first (SOLID, design patterns)
- TypeScript for all code

### Behavioral/

- STAR format (Situation, Task, Action, Result)
- Anchor to real enterprise-scale work

### Communication/

- Plain language, short sentences, structured answers

## Library/Framework Lookups

When a topic involves a specific library, SDK, or cloud service (React, Next.js, Svelte, Express, Tailwind, an AI SDK), use the **Context7 MCP** (`mcp__context7__resolve-library-id`, then `mcp__context7__query-docs`) before writing. Training data may be stale.

**Mandatory** for every chapter in `Frontend/ModernStack/` and `AI/` — those are the two fastest-moving parts of the book.

Skip Context7 for general programming concepts (closures, recursion, algorithm patterns).

## Quality Checklist

Before finalizing:

**Book standard (blocking — the build or the lint script rejects these):**

- [ ] Six blocks present, in order
- [ ] Front matter valid; `slug` globally unique; H1 carries `{#ch-<slug>}` and matches `title`
- [ ] 150–400 lines
- [ ] TypeScript-only code fences (allow-list: `bash`, `json`, `yaml`, `css`, `html`, `sql`, `mermaid`, `text`, `tsx`)
- [ ] No hand-written TOC, no back-link, no `####`
- [ ] Only 💡 🔑 ⚠️ ✅ ❌, within budget; no emoji in headings beyond the two fixed ones
- [ ] Zero relative file links in the body — cross-references use `#ch-<slug>`
- [ ] Version-stamped: "React 19", never "modern React"
- [ ] Moving-target callout present if the topic moves yearly

**Craft:**

- [ ] **Scope is focused** — only common, frequently-used topics covered
- [ ] **Language is simple** — short sentences, everyday words, active voice
- [ ] No paragraph exceeds 3–4 lines without a break
- [ ] Complex concepts have visual aids (tables, diagrams, lists)
- [ ] Code examples have a bold label line and inline comments explaining _why_
- [ ] Comparisons use ❌/✅ indicators; decisions use tables
- [ ] Time/space complexity noted (DSA/SystemDesign)
- [ ] Parent README (part opener) updated if a chapter was added
- [ ] **Reads correctly cold**, without the chapter before it

## When Editing Existing Files

Most files in this repo predate the Book Chapter Standard. Editing one means **bringing it up to standard**,
not patching around it.

1. **Restructure to the six blocks** — this usually means deleting a hand-written TOC and adding
   Key Takeaways / Interview Questions / What to Read Next
2. **Trim, don't grow** — if content is exhaustive, cut to the common cases. Target ~220 lines
3. **Convert cross-references** from relative paths to `#ch-<slug>` anchors
4. **Strip retired emoji** and heading decoration
5. **TypeScript only** — convert any JS/Python examples
6. **Update the part-opener README** if the chapter's title or order changed
