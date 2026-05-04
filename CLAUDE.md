# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

A **comprehensive interview preparation repository** for software engineering roles at multinational companies. Organized into major domains, each with detailed markdown documentation covering essential topics and concepts.

## Repository Structure

```
interview-preparation/
├── Frontend/          # JavaScript, React, Next.js, TypeScript, HTML/CSS, Testing, WebPerformance
├── Backend/           # Node.js, Express, NestJS, databases, API design, security
├── DSA/               # Data Structures & Algorithms (15 LeetCode patterns)
├── SystemDesign/      # System design interview prep (90+ topics)
├── DevOps/            # AWS, Docker, Kubernetes, Terraform, CI/CD, DevSecOps
├── OOP/               # Object-oriented programming concepts
├── Behavioral/        # Behavioral interview prep
├── Communication/     # Communication skills
└── Salman Rahman Resume.pdf
```

## Key Characteristics

- **Documentation-only** — pure markdown; no executable code, tests, or build processes
- **Target audience** — mid-to-senior engineers (2–7 years) prepping for FAANG/MNC interviews
- **Code examples** — **TypeScript only** for all code samples (enforced by the `write-topic-docs` skill)
- **Progressive difficulty** — beginner → intermediate → advanced tracks

## Writing or Editing Documentation

When the user asks to write, add, edit, or restructure topic documentation, **invoke the `write-topic-docs` skill**. It contains the full style guide: typography rules, section structure, visual elements, code-example conventions, and the quality checklist that all topic files must follow.

Do not write topic content from default style — always go through that skill so output matches the established format.

## Searching the Repository

1. **Check README files first** — they provide comprehensive indexes
2. **Look for pattern keywords** — "Two Pointers", "Sliding Window", "Microservices", etc.
3. **Cross-reference domains** — Frontend/Backend/DevOps concepts often overlap
4. **Use topic numbers** — files are numbered sequentially (`01-`, `02-`, …)

## Library / Framework Lookups

For any topic involving a specific library, framework, SDK, or cloud service (React, Next.js, AWS SDK, Tailwind, Express, etc.), use the **Context7 MCP** to fetch current docs before writing or answering. Training data may be stale.

Skip Context7 for general programming concepts (closures, recursion, algorithm patterns).

## Planned but Not Yet Created

Per the README files, these are roadmapped:
- Most Backend/ content (Node.js, Express, NestJS, databases, testing)
- Most SystemDesign/ content (90+ topics referenced in README)
- Most DevOps/ content (15 sections × 6–12 topics each)

When creating new content, follow the established patterns from Frontend/ and DSA/ via the `write-topic-docs` skill.
