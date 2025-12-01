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
