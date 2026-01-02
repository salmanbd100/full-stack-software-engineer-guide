# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This is a **comprehensive interview preparation repository** for software engineering roles at multinational companies. The repository is organized into 5 major domains, each with detailed markdown documentation covering essential topics and concepts.

## Repository Structure

```
interview-preparation/
├── Frontend/          # Frontend development topics (JavaScript, React, Next.js, TypeScript, etc.)
├── Backend/           # Backend engineering topics (Node.js, Express, NestJS, databases, etc.)
├── DSA/              # Data Structures & Algorithms (15 LeetCode patterns)
├── SystemDesign/     # System design interview preparation (90+ topics)
├── DevOps/           # DevOps engineering topics (AWS, Docker, Kubernetes, Terraform, etc.)
└── Salman Rahman Resume.pdf
```

### Domain Overview

**Frontend/** - 7 subdirectories covering:
- Core: JavaScript, HTML & CSS
- Frameworks: React, Next.js, TypeScript
- Advanced: Testing, WebPerformance

**Backend/** - Planned curriculum (files not yet created) covering:
- Node.js, Express.js, NestJS
- SQL/NoSQL databases
- API design, security, system design
- DevOps, testing

**DSA/** - 15 markdown files covering essential algorithmic patterns:
- Array/String patterns (Prefix Sum, Two Pointers, Sliding Window)
- Linked List patterns (Fast/Slow Pointers, In-place Reversal)
- Tree/Graph patterns (DFS, BFS, Binary Tree Traversal)
- Advanced patterns (Backtracking, Dynamic Programming, Graph Algorithms)

**SystemDesign/** - Comprehensive guide (files not yet created) covering:
- System design fundamentals (scalability, CAP theorem, calculations)
- Frontend system design (micro-frontends, state management, rendering)
- Backend system design (databases, microservices, APIs)
- Infrastructure (AWS, monitoring, security)
- 20 common interview questions (Twitter, Google Docs, Uber, YouTube, etc.)

**DevOps/** - Comprehensive guide (files not yet created) covering:
- Linux, Git, CI/CD pipelines
- Docker, Kubernetes, AWS EKS
- Terraform, infrastructure as code
- Monitoring, security, DevSecOps
- AI tools for DevOps, Agile practices

## Content Format

All content follows a consistent structure:
- **README.md** in each directory provides an index and study plan
- **Individual topic files** (e.g., `01-prefix-sum.md`) contain:
  - Pattern/concept explanation
  - Code examples in JavaScript and Python
  - Time/space complexity analysis
  - Practice problems with LeetCode links
  - Common variations and edge cases

## Documentation Style Guide

**CRITICAL**: All documentation must follow this professional typography and explanation style for consistency and readability.

### Core Principles

1. **No walls of text** - Break dense paragraphs into structured, scannable content
2. **Visual hierarchy** - Use headers, bullets, tables, and diagrams
3. **Progressive disclosure** - Start simple, then add detail
4. **Practical focus** - Always connect theory to real-world use

### Typography Patterns

#### ❌ AVOID: Dense Paragraph Style

```markdown
**Concept Name** - Long explanation that continues for 5-6 lines without
breaks, covering multiple points like how it works, why it matters, when
to use it, common pitfalls, and best practices all in one continuous
paragraph that's hard to scan and digest...
```

#### ✅ USE: Structured Explanation Style

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

### Visual Elements

#### Status Icons (Use Consistently)

- **💡** - Key concept or insight header
- **✅** - Correct approach, good practice, benefit
- **❌** - Wrong approach, bad practice, problem
- **⚠️** - Warning, gotcha, important note
- **🔴** - Critical issue, danger
- **✨** - Tip, enhancement, pro tip

#### Comparison Tables

Always use tables for side-by-side comparisons:

```markdown
| Feature | Approach A | Approach B |
|---------|-----------|------------|
| **Performance** | O(n) | O(n²) |
| **Memory** | O(1) | O(n) |
| **Use Case** | Small datasets | Large datasets |
```

#### Decision Tables

Help readers choose the right approach:

```markdown
| Scenario | Use This | Why |
|----------|---------|-----|
| Need transformation | `map()` | Returns new array |
| Need filtering | `filter()` | Removes items |
| Need aggregation | `reduce()` | Single value |
```

#### Flow Diagrams

Use ASCII art for processes:

```markdown
```
Step 1: Initial state
    ↓
Step 2: Process
    ↓
Step 3: Result
```
```

### Explanation Structure

#### Before/After Pattern

Show the problem, then the solution:

```markdown
**❌ Before (Problem):**
```javascript
// Problematic code
const bad = items.forEach(item => doubled.push(item * 2));
```

**Problems:**
- Issue 1
- Issue 2

**✅ After (Solution):**
```javascript
// Better code
const good = items.map(item => item * 2);
```

**Benefits:**
- Benefit 1
- Benefit 2
```

#### Step-by-Step Breakdown

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

#### Pros/Cons Lists

For comparing approaches:

```markdown
**Pros:**
- Clear benefit 1
- Clear benefit 2
- Clear benefit 3

**Cons:**
- Clear drawback 1
- Clear drawback 2
- Clear drawback 3
```

### Section Organization

#### Standard Section Flow

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

### Code Examples

#### Code Block Headers

Always label what the code demonstrates:

```markdown
**Pattern Name:**
```javascript
// Concise comment explaining the key point
const example = 'code here';
```
```

#### Inline Annotations

Add comments explaining **why**, not **what**:

```javascript
// ✅ Good - explains why
const doubled = numbers.map(n => n * 2); // Transform without mutation

// ❌ Bad - explains what (obvious)
const doubled = numbers.map(n => n * 2); // Maps over numbers
```

#### Multiple Examples

Show progression:

```markdown
**Basic Example:**
```javascript
// Simple case
```

**Advanced Example:**
```javascript
// Complex case with edge cases
```

**Real-World Example:**
```javascript
// Practical application
```
```

### Typography Rules

#### Headers

- **Main title**: `# Topic Name`
- **Major sections**: `## Section Name`
- **Subsections**: `### Subsection Name`
- **Concept explanations**: `### 💡 **Concept Name**`

#### Emphasis

- **Bold** for important terms and labels: `**key term**`
- *Italic* for subtle emphasis or examples: `*like this*`
- `Code font` for code references: `` `functionName()` ``
- > Blockquotes for key insights

#### Lists

**Unordered lists** for non-sequential items:
```markdown
- Point 1
- Point 2
- Point 3
```

**Numbered lists** for sequential steps:
```markdown
1. First step
2. Second step
3. Third step
```

**Nested lists** for hierarchy:
```markdown
- Main point
  - Sub-point 1
  - Sub-point 2
- Main point 2
```

### Real-World Examples

#### Dense Text (Before)

```markdown
Array Destructuring - Destructuring extracts values from arrays (or
iterables) into variables based on position, dramatically reducing
boilerplate code. It supports advanced patterns: skipping elements with
empty slots, capturing remaining elements with rest syntax (...),
providing defaults for missing values, and even elegant variable swapping
without temporary variables.
```

#### Structured Format (After)

```markdown
### 💡 **Array Destructuring**

Extract values from arrays into variables based on position.

**How It Works:**

```javascript
const [first, second, third] = array;
// Unpacks by position
```

**Key Features:**

1. **Position-Based Extraction:**
   - Order matters
   - Each position maps to a variable

2. **Advanced Patterns:**
   - Skip elements: `[first, , third]`
   - Rest pattern: `[head, ...tail]`
   - Defaults: `[a, b = 0]`
   - Swapping: `[x, y] = [y, x]`

**Perfect For:**
- ✅ React Hooks: `const [count, setCount] = useState(0)`
- ✅ Function returns: `const [x, y] = getCoordinates()`
- ✅ Tuple-like data

**Key Insight:**
> Array destructuring is position-based - order matters. Perfect for
> tuple-like data where position has meaning.
```

### When to Use Each Pattern

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

### Quality Checklist

Before finalizing any documentation, ensure:

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

### Examples to Follow

Reference these files as gold-standard examples:
- `Frontend/JavaScript/01-data-types-variables.md` - Excellent use of comparison tables
- `Frontend/JavaScript/03-closures.md` - Great before/after patterns
- `Frontend/JavaScript/04-this-keyword.md` - Excellent decision trees
- `Frontend/JavaScript/07-event-loop.md` - Perfect flow diagrams
- `Frontend/JavaScript/09-array-object-methods.md` - Comprehensive method guides

## Key Characteristics

### Documentation-Only Repository
- This is **purely documentation** - no executable code, tests, or build processes
- All files are markdown (`.md`) except the resume PDF
- Content is for **learning and reference**, not for running or testing

### Target Audience
- Mid to senior-level engineers (2-7 years experience)
- Preparing for interviews at FAANG/multinational companies
- Focus on practical, interview-ready knowledge

### Content Philosophy
- **Comprehensive but focused** - covers breadth and depth without overwhelming
- **Interview-oriented** - real questions, practical examples, common patterns
- **Multi-language examples** - JavaScript and Python for most code examples
- **Progressive difficulty** - beginner → intermediate → advanced tracks

## Working with This Repository

### When Adding Content
1. **Follow existing patterns**: Match the structure and format of similar files
2. **Include practical examples**: Real code snippets, not just theory
3. **Add complexity analysis**: Always include time/space complexity
4. **Link to practice problems**: Include LeetCode or similar platform links
5. **Use consistent formatting**: Follow markdown conventions in existing files

### When Editing Content
1. **Preserve structure**: Maintain the table of contents and section organization
2. **Update related files**: If changing a README, check if other READMEs reference it
3. **Maintain code quality**: Ensure JavaScript/Python examples follow best practices
4. **Keep study plans realistic**: Time estimates should be achievable

### When Searching
1. **Check README files first**: They provide comprehensive indexes
2. **Look for pattern keywords**: "Two Pointers", "Sliding Window", "Microservices", etc.
3. **Cross-reference domains**: Frontend/Backend/DevOps concepts often overlap
4. **Use topic numbers**: Files are numbered sequentially (01, 02, etc.)

## Domain-Specific Notes

### Frontend/
- Focuses on React ecosystem and modern JavaScript
- TypeScript integration throughout
- Performance optimization is a key theme
- Real-world patterns from production applications

### DSA/
- Pattern-based learning approach (not exhaustive algorithm coverage)
- Each pattern includes "When to use this pattern" section
- LeetCode problems are curated, not comprehensive
- Both iterative and recursive solutions where applicable

### SystemDesign/
- **RADIO framework** emphasized: Requirements → Architecture → Data model → Interface → Optimizations
- Heavy focus on **AWS services** and cloud-native patterns
- Includes both frontend and backend system design
- Real-world examples (Twitter, Uber, Netflix, etc.)

### Backend/
- Node.js ecosystem focus
- Production-ready patterns and best practices
- Security and performance considerations throughout

### DevOps/
- **AWS-centric** approach
- **Terraform** as primary IaC tool
- Includes DevSecOps and AI-enhanced DevOps
- Agile methodology integration

## Important Conventions

### File Naming
- Sequential numbering: `01-topic.md`, `02-topic.md`
- Lowercase with hyphens: `fast-slow-pointers.md`
- README.md for directory indexes
- PROGRESS.md for tracking completion (Frontend only)

### Code Examples
- **JavaScript**: ES6+ syntax, modern patterns
- **Python**: Python 3, clean and readable
- **Comments**: Explain the "why", not the "what"
- **Complexity**: Always noted as `// Time: O(n), Space: O(1)`

### Study Plans
- Organized by weeks and days
- Include specific time allocations
- Beginner → Intermediate → Advanced tracks
- Realistic expectations for working professionals

## External References

All content links to authoritative sources:
- Official documentation (MDN, React.dev, AWS docs)
- LeetCode for practice problems
- Personal portfolio: salmanrahman.com
- Specific blogs and articles where relevant

## Notes for Future Development

Based on the README files, these sections are **planned but not yet created**:
- Most Backend/ content (Node.js, Express, NestJS, databases, testing)
- Most SystemDesign/ content (90+ topics referenced in README)
- Most DevOps/ content (15 sections × 6-12 topics each)

When creating this content, follow the established patterns from Frontend/ and DSA/ directories.
