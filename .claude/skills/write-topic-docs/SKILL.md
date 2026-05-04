---
name: write-topic-docs
description: Write or edit topic documentation in this interview-prep repo using the project's professional typography and structure rules. Use when the user asks to "write docs", "add a topic", "create a new pattern doc", "document X", "add a markdown for Y", or edits/creates files under Frontend/, Backend/, DSA/, SystemDesign/, DevOps/, OOP/, Behavioral/, or Communication/.
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

## Required Inputs

Before writing, confirm or infer:

1. **Domain** — Frontend, Backend, DSA, SystemDesign, DevOps, OOP, Behavioral, Communication
2. **Topic** — the concept being documented
3. **Audience level** — default: mid–senior engineers (2–7 yrs) prepping for FAANG/MNC interviews
4. **File path** — sequential numbering (`01-topic.md`), lowercase-hyphen names
5. **Language** — **TypeScript only**. Do not write code examples in JavaScript, Python, or any other language.

## Content Format

All topic files must include:

- Pattern/concept explanation
- Code examples in **TypeScript only** (use proper types, interfaces, and generics where they add clarity)
- **Time/space complexity** analysis (DSA/SystemDesign always)
- Practice problems with **LeetCode** links (DSA)
- Common variations and edge cases
- Real-world / interview-relevant framing

### Code Language Rule (MANDATORY)

**All code examples must be TypeScript.** Do not include JavaScript or Python snippets, even for "comparison" or "polyglot" reasons.

- ✅ Use ` ```typescript ` for every code fence
- ✅ Add types on parameters, return values, and non-trivial locals
- ✅ Use `interface` / `type` aliases when modeling data
- ✅ Show generics where they make the example clearer (e.g. `function map<T, U>(...)`)
- ❌ No ` ```javascript `, ` ```js `, ` ```python `, or ` ```py ` fences
- ❌ No untyped function signatures unless the example is specifically about type inference
- ❌ Do not duplicate the same example in two languages

## Core Principles

1. **Simple, beginner-friendly English** — see Language & Tone Rules below; this is non-negotiable
2. **No walls of text** — break dense paragraphs into structured, scannable content
3. **Visual hierarchy** — use headers, bullets, tables, and diagrams
4. **Progressive disclosure** — start simple, then add detail
5. **Practical focus** — always connect theory to real-world use
6. **Interview-oriented** — frame for someone who will be asked this in an interview

## Language & Tone Rules (MANDATORY)

Always write in **simple, beginner-friendly English**. A reader who is new to the topic — or whose first language is not English — should understand every sentence on the first read.

**Do:**
- ✅ Use **short sentences** (aim for 15–20 words max)
- ✅ Use **everyday words** ("use" not "utilize", "show" not "demonstrate", "help" not "facilitate")
- ✅ Use **active voice** ("React updates the DOM" not "the DOM is updated by React")
- ✅ Define a **technical term the first time** you use it, in plain words
- ✅ Use **analogies** to connect new ideas to familiar things
- ✅ Prefer **concrete examples** over abstract description

**Don't:**
- ❌ Long, multi-clause sentences with several commas
- ❌ Jargon stacked on jargon without explanation
- ❌ Latin phrases ("i.e.", "e.g.", "vis-à-vis") — write "for example", "such as", "in other words"
- ❌ Academic or marketing tone ("leverage", "robust", "seamless", "cutting-edge", "paradigm")
- ❌ Passive voice when active works
- ❌ Three-syllable word when a one-syllable word means the same thing

### Quick Word Swaps

| ❌ Avoid | ✅ Use Instead |
|----------|---------------|
| utilize | use |
| facilitate | help |
| leverage | use |
| demonstrate | show |
| subsequent | next / later |
| in order to | to |
| prior to | before |
| approximately | about |
| commence | start |
| terminate | end / stop |
| methodology | method / way |
| functionality | feature / what it does |

### Before / After Tone Example

**❌ Too formal / dense:**
> Closures facilitate the encapsulation of state by leveraging lexical scoping mechanisms, which subsequently enables the creation of private variables.

**✅ Simple and beginner-friendly:**
> A closure lets a function "remember" variables from where it was created. This is how you make private variables in JavaScript.

## Typography Patterns

### ❌ AVOID: Dense Paragraph Style

```markdown
**Concept Name** - Long explanation that continues for 5-6 lines without
breaks, covering multiple points like how it works, why it matters, when
to use it, common pitfalls, and best practices all in one continuous
paragraph that's hard to scan and digest...
```

### ✅ USE: Structured Explanation Style

```markdown
### 💡 **Concept Name**

Brief one-line summary of what this concept is.

**How It Works:**

Clear explanation broken into digestible chunks.

**Key Characteristics:**

1. **First Point:**
   - Detail about first point
   - Why it matters
   - Example scenario

2. **Second Point:**
   - Detail about second point
   - Comparison or contrast
   - When to use

**When to Use:**
- ✅ Good scenario 1
- ✅ Good scenario 2
- ❌ Bad scenario 1
- ❌ Bad scenario 2

**Key Insight:**
> Important takeaway in blockquote format
```

## Visual Elements

### Status Icons (Use Consistently)

- **💡** — Key concept or insight header
- **✅** — Correct approach, good practice, benefit
- **❌** — Wrong approach, bad practice, problem
- **⚠️** — Warning, gotcha, important note
- **🔴** — Critical issue, danger
- **✨** — Tip, enhancement, pro tip

### Comparison Tables

Always use tables for side-by-side comparisons:

```markdown
| Feature | Approach A | Approach B |
|---------|-----------|------------|
| **Performance** | O(n) | O(n²) |
| **Memory** | O(1) | O(n) |
| **Use Case** | Small datasets | Large datasets |
```

### Decision Tables

Help readers choose the right approach:

```markdown
| Scenario | Use This | Why |
|----------|---------|-----|
| Need transformation | `map()` | Returns new array |
| Need filtering | `filter()` | Removes items |
| Need aggregation | `reduce()` | Single value |
```

### Flow Diagrams

Use ASCII art for processes:

```
Step 1: Initial state
    ↓
Step 2: Process
    ↓
Step 3: Result
```

## Explanation Structure

### Before/After Pattern

Show the problem, then the solution:

```markdown
**❌ Before (Problem):**
```typescript
// Problematic code
const doubled: number[] = [];
items.forEach((item: number) => doubled.push(item * 2));
```

**Problems:**
- Issue 1
- Issue 2

**✅ After (Solution):**
```typescript
// Better code
const doubled: number[] = items.map((item: number) => item * 2);
```

**Benefits:**
- Benefit 1
- Benefit 2
```

### Step-by-Step Breakdown

For complex concepts:

```markdown
**How This Works:**

**Step 1: Initial Phase**
- What happens first
- Why it happens

**Step 2: Processing**
- What gets processed
- How it's transformed

**Step 3: Result**
- Final outcome
- What you get
```

### Pros/Cons Lists

For comparing approaches:

```markdown
**Pros:**
- Clear benefit 1
- Clear benefit 2

**Cons:**
- Clear drawback 1
- Clear drawback 2
```

## Section Organization

### Standard Section Flow

```markdown
### Topic Name

### 💡 **Clear One-Sentence Summary**

Brief context paragraph explaining why this matters.

**How It Works:**
[Explanation with visual aids]

**Key Characteristics:**
[Bullet points or numbered list]

**Common Patterns:**
[Code examples with annotations]

**When to Use:**
[Decision guide or use-case list]

**Common Mistakes:**

❌ **Bad Practice:**
[Example and why it's wrong]

✅ **Good Practice:**
[Example and why it's right]

**Key Insight:**
> Important takeaway
```

## Code Examples

### Code Block Headers

Always label what the code demonstrates:

```markdown
**Pattern Name:**
```typescript
// Concise comment explaining the key point
const example: string = 'code here';
```
```

### Inline Annotations

Add comments explaining **why**, not **what**:

```typescript
// ✅ Good - explains why
const doubled: number[] = numbers.map((n: number) => n * 2); // Transform without mutation

// ❌ Bad - explains what (obvious)
const doubled: number[] = numbers.map((n: number) => n * 2); // Maps over numbers
```

### Multiple Examples

Show progression: Basic → Advanced → Real-World.

### Complexity Notation

Always note as inline comments:

```typescript
// Time: O(n), Space: O(1)
```

## Typography Rules

### Headers

- **Main title**: `# Topic Name`
- **Major sections**: `## Section Name`
- **Subsections**: `### Subsection Name`
- **Concept explanations**: `### 💡 **Concept Name**`

### Emphasis

- **Bold** for important terms and labels: `**key term**`
- *Italic* for subtle emphasis or examples: `*like this*`
- `Code font` for code references: `` `functionName()` ``
- > Blockquotes for key insights

### Lists

- **Unordered** for non-sequential items
- **Numbered** for sequential steps
- **Nested** for hierarchy (2-space indent)

## Pattern Selection Guide

| Pattern | Use When |
|---------|----------|
| **💡 Header** | Introducing a new concept |
| **Comparison Table** | Showing differences between approaches |
| **Decision Table** | Helping reader choose an approach |
| **Flow Diagram** | Explaining a process or sequence |
| **Before/After** | Showing problem → solution |
| **Step-by-step** | Breaking down complex processes |
| **Code Examples** | Demonstrating syntax or patterns |
| **Blockquote** | Highlighting key insight or takeaway |

## File Conventions

- **Sequential numbering**: `01-topic.md`, `02-topic.md`
- **Lowercase with hyphens**: `fast-slow-pointers.md`
- **README.md** for directory indexes (table of contents + study plan)
- **PROGRESS.md** for tracking completion (Frontend only)

## Domain-Specific Notes

### Frontend/
- React ecosystem + modern JavaScript focus
- TypeScript integration throughout
- Performance optimization is a key theme

### DSA/
- Pattern-based learning (not exhaustive algorithm coverage)
- Each pattern includes "When to use this pattern"
- Curated LeetCode problems
- Both iterative and recursive solutions where applicable

### SystemDesign/
- **RADIO framework**: Requirements → Architecture → Data model → Interface → Optimizations
- AWS-centric, cloud-native patterns
- Both frontend and backend system design
- Real-world examples (Twitter, Uber, Netflix, etc.)

### Backend/
- Node.js ecosystem focus
- Production-ready patterns
- Security and performance throughout

### DevOps/
- AWS-centric
- Terraform as primary IaC tool
- Includes DevSecOps and AI-enhanced DevOps

## Looking Up Library/Framework Docs

When a topic involves a specific library, framework, SDK, or cloud service (React, Next.js, Express, Tailwind, AWS SDK, etc.), use the **Context7 MCP** (`mcp__plugin_context7_context7__resolve-library-id` then `mcp__plugin_context7_context7__query-docs`) to fetch current documentation before writing. Training data may be stale; Context7 is authoritative for API syntax, configuration, and recent changes.

Skip Context7 for general programming concepts (closures, recursion, algorithm patterns) — those don't need version-specific lookups.

## Gold-Standard Reference Files

Match the structure and quality of these files when writing new content:

- `Frontend/JavaScript/01-data-types-variables.md` — comparison tables
- `Frontend/JavaScript/03-closures.md` — before/after patterns
- `Frontend/JavaScript/04-this-keyword.md` — decision trees
- `Frontend/JavaScript/07-event-loop.md` — flow diagrams
- `Frontend/JavaScript/09-array-object-methods.md` — comprehensive method guides

Read at least one of these before writing to internalize the rhythm.

## External References

Link content to authoritative sources:
- Official docs (MDN, React.dev, AWS docs)
- LeetCode for practice problems
- Personal portfolio: salmanrahman.com
- Specific blogs/articles where relevant

## Quality Checklist

Before finalizing any documentation, verify:

- [ ] **Language is simple and beginner-friendly** (short sentences, everyday words, active voice, no jargon-on-jargon)
- [ ] No paragraph exceeds 3-4 lines without a break
- [ ] Complex concepts have visual aids (tables, diagrams, lists)
- [ ] Code examples have clear headers and inline comments
- [ ] Comparison patterns use ❌/✅ indicators
- [ ] Key insights are in blockquotes
- [ ] Headers use appropriate emoji markers (💡, ⚠️)
- [ ] Tables are used for comparisons and decisions
- [ ] Examples show both wrong and right approaches
- [ ] Each section has clear visual hierarchy
- [ ] Content is scannable (can understand by skimming)
- [ ] Time/space complexity noted (where applicable)
- [ ] Practice/reference links included (where applicable)
- [ ] File name follows `NN-lowercase-hyphen.md` convention
- [ ] Parent README.md updated if a new topic was added

## When Editing Existing Files

1. **Preserve structure** — keep the table of contents and section organization
2. **Update related files** — if changing a README, check if other READMEs reference it
3. **Maintain code quality** — ensure JS/Python examples follow best practices
4. **Keep study plans realistic** — time estimates should be achievable
