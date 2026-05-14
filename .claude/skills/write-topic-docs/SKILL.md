---
name: write-topic-docs
description: Run this skill BEFORE writing or editing ANY document in this repo — topic files, READMEs, or any markdown under Frontend/, Backend/, DSA/, SystemDesign/, DevOps/, OOP/, Behavioral/, or Communication/. Use when the user asks to "write docs", "add a topic", "edit a file", "create a new pattern doc", "document X", or "add a markdown for Y".
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

1. **Domain** — Frontend, Backend, DSA, SystemDesign, DevOps, OOP, Behavioral, Communication
2. **Topic** — the concept being documented
3. **File path** — sequential numbering (`01-topic.md`), lowercase-hyphen names
4. **Language** — **TypeScript only** for all code examples

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
### 💡 **Concept Name**

Brief one-line summary.

**How It Works:**
Clear explanation in digestible chunks.

**When to Use:**

- ✅ Good scenario
- ❌ Bad scenario

**Key Insight:**

> Important takeaway
```

## Visual Elements

### Status Icons

- **💡** — Key concept or insight header
- **✅** — Correct approach, good practice, benefit
- **❌** — Wrong approach, bad practice, problem
- **⚠️** — Warning, gotcha, important note
- **🔴** — Critical issue, danger
- **✨** — Tip, enhancement, pro tip

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

Use ASCII art for short processes only:

```
Step 1: Initial state
    ↓
Step 2: Process
    ↓
Step 3: Result
```

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

```markdown
### Topic Name

### 💡 **One-Sentence Summary**

Brief context paragraph.

**How It Works:**
[Explanation with visual aids]

**When to Use:**
[Decision guide]

**Common Mistakes:**

❌ **Bad:** [example]
✅ **Good:** [example]

**Key Insight:**

> Important takeaway
```

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

- **Main title**: `# Topic Name`
- **Major sections**: `## Section Name`
- **Subsections**: `### Subsection Name`
- **Concept intro**: `### 💡 **Concept Name**`

### Emphasis

- **Bold** for important terms: `**key term**`
- _Italic_ for subtle emphasis
- `Code font` for code references
- > Blockquotes for key insights

## File Conventions

- **Sequential numbering**: `01-topic.md`, `02-topic.md`
- **Lowercase with hyphens**: `fast-slow-pointers.md`
- **README.md** for directory indexes (concise TOC + study plan)

## Domain-Specific Notes

### Frontend/

- Lead with the JS/TS concept, not the framework
- React, Angular, Svelte, Vue are examples — not the only answer
- Core Web Vitals and WCAG are first-class topics
- Cover browser internals where they actually appear in interviews (event loop, rendering)

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

### DevOps/

- Lead with the concept (immutability, declarative config, observability)
- Docker and CI/CD are daily-use — prioritize these
- AWS is the primary cloud example

### OOP/

- Language-agnostic patterns first (SOLID, design patterns)
- TypeScript for all code

### Behavioral/

- STAR format (Situation, Task, Action, Result)
- Anchor to real enterprise-scale work

### Communication/

- Plain language, short sentences, structured answers

## Library/Framework Lookups

When a topic involves a specific library, SDK, or cloud service (React, Next.js, Express, Tailwind, AWS SDK), use the **Context7 MCP** (`mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`) before writing. Training data may be stale.

Skip Context7 for general programming concepts (closures, recursion, algorithm patterns).

## Quality Checklist

Before finalizing:

- [ ] **Scope is focused** — only common, frequently-used topics covered
- [ ] **File is concise** — 150–400 lines, no filler
- [ ] **Language is simple** — short sentences, everyday words, active voice
- [ ] No paragraph exceeds 3–4 lines without a break
- [ ] Complex concepts have visual aids (tables, diagrams, lists)
- [ ] Code examples have clear headers and inline comments
- [ ] Comparisons use ❌/✅ indicators
- [ ] Key insights in blockquotes
- [ ] Tables used for comparisons and decisions
- [ ] Time/space complexity noted (DSA/SystemDesign)
- [ ] File name follows `NN-lowercase-hyphen.md`
- [ ] Parent README.md updated if a new topic was added

## When Editing Existing Files

1. **Preserve structure** — keep the TOC and section organization
2. **Trim, don't grow** — if content is exhaustive, cut to the common cases
3. **Update related READMEs** if cross-referenced
4. **TypeScript only** — convert any JS/Python examples
