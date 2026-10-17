# The Senior Full Stack Handbook

**Frontend-heavy engineering for 2027: fundamentals, the modern stack, system design and AI**

**Read it free online: [www.salmanrahman.com/handbook](https://www.salmanrahman.com/handbook/)**
(also in Bangla at [/handbook/bn](https://www.salmanrahman.com/handbook/bn/)).

A book for engineers with 3–8 years' experience going for a senior or staff frontend-heavy full stack
role. It assumes you already write TypeScript and use a framework, and explains the layer under the
definition rather than the definition itself.

Nine parts, 150 chapters and 647 interview questions:

1. Foundations: JavaScript, TypeScript, design patterns
2. The Browser Platform: HTML and CSS, browser APIs, accessibility
3. The Modern Frontend Stack: React, Next.js, Svelte
4. Frontend at Scale: architecture, performance, security, testing
5. Backend for Frontend Engineers: Node.js, APIs, SQL and NoSQL
6. System Design
7. AI Engineering
8. Ship and Operate: Git, CI/CD, observability, deployment
9. The Human Layer: behavioural and communication

A companion volume, **Book 2: DSA Patterns**, covers the coding round in sixteen patterns.

## Three Editions, One Manuscript

| Edition | What it is | Build |
| ------- | ---------- | ----- |
| **PDF** | The print edition, about 900 pages, with typeset diagrams and page-numbered cross-references | `pnpm book:pdf` |
| **EPUB** | The same design in CSS for e-readers, validated with epubcheck | `pnpm book:epub` |
| **Web** | The whole book, free, with an optional reading-progress tracker | `pnpm site:build` |

Book 2 builds separately with `pnpm book:companion`.

## How It Is Built

- **Source:** plain Markdown chapters under `Frontend/`, `Backend/`, `AI/`, `SystemDesign/` and the
  other part folders. `scripts/lib/book.ts` decides what counts as a chapter and in what order, and
  every build and check reads from it.
- **PDF and EPUB:** Pandoc, with Lua filters that turn the chapters' callouts, cross-references and
  Mermaid diagrams into the print design (LaTeX via Tectonic) or EPUB CSS.
- **Web:** `scripts/build-site.ts` generates a VitePress site from the same chapters, served at
  `/handbook` on the portfolio and deployed on Vercel on every push to `main`. Reading progress is
  stored by a Vercel function over Upstash Redis.
- **Checks:** `pnpm lint:docs` enforces the chapter standard, `pnpm check:code-samples` compiles
  every TypeScript sample, and CI runs both alongside the index, version and site-build checks.

```bash
pnpm install
pnpm site:dev     # the web edition, locally
pnpm book:build   # PDF + EPUB into build/ — needs pandoc, tectonic and mermaid-cli
```
