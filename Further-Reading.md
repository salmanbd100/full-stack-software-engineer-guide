---
title: Further Reading
part: 0
chapter: 100
slug: further-reading
level: intermediate # beginner | intermediate | advanced
reading_time: 8
updated: 2026-09-17
tags: [back-matter, resources]
in_book: true
---

# Further Reading {#ch-further-reading}

> Know which one source to go to next for each part of this book, and why that one and not the other forty.

**In this list:** how to use it · the interview loop · one section per part · the appendix

This book is deliberately not a reference. It stops where the official documentation starts, and this
list is where it hands over. Every entry below was opened and checked in **September 2026**.

## How to Use This List

Three tiers, and the order matters. Most people invert it and wonder why the reading does not stick.

| Tier | What it is | How to use it |
| ---- | ---------- | ------------- |
| **Primary** | The official documentation or specification | Read it when you need the answer. It is correct and it is current. It is also the thing candidates skip |
| **Depth** | One book per part | Read it once, slowly, before the loop starts. It buys the mental model the docs assume you have |
| **Practice** | Question banks and mock interviews | Use it last, to find the gaps. It is a diagnostic, not a syllabus |

Each part below gets a handful of entries, not a bibliography. A list of forty links is a list nobody
opens. If a part has one thing worth reading, it gets one thing.

> ⚠️ **Lists rot faster than chapters.** URLs move, courses are retired, and a "2025 edition" is
> embarrassing by 2028. The durable advice underneath every entry: **go to the vendor's own docs
> first**, and treat anything written by a third party as a summary with a shelf life. Where a link
> here is dead, the project name is still the search term you want.

## The Interview Loop

Cross-part. These are about the interview itself rather than about any one subject.

| Resource | Why this one |
| -------- | ------------ |
| [GreatFrontEnd](https://www.greatfrontend.com/) | The strongest frontend-specific question bank. The [Front End Interview Playbook](https://www.greatfrontend.com/front-end-interview-playbook) is free and is the best single summary of the modern loop's shape |
| [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/) | Free, open source, and honest about what each round actually tests |
| [Tech Interview Handbook](https://www.techinterviewhandbook.org/) | The general-purpose sibling. Read its resume and negotiation sections even if you skip the algorithms |
| [roadmap.sh — Frontend](https://roadmap.sh/frontend) | Not a curriculum. Use it as a checklist to find what you have never touched |

## Part I — Foundations

Language semantics and type systems. The part that ages slowest, so the sources are the oldest.

| Resource | Why this one |
| -------- | ------------ |
| [MDN — JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) | The reference. Its "Language overview" and the guides on closures, prototypes and the event loop are the primary source for Part I |
| [*You Don't Know JS Yet*](https://github.com/getify/You-Dont-Know-JS) — Kyle Simpson | Free online. The depth book for scope, closures and `this` |
| [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | Read the whole thing once. It is short, and most TypeScript confusion is a chapter of it nobody read |
| [Type Challenges](https://github.com/type-challenges/type-challenges) | Practice for conditional and mapped types. The medium set is where a senior candidate should be comfortable |
| [TC39 proposals](https://github.com/tc39/proposals) | What is coming, and at which stage. The only defence against confidently describing a stage 2 proposal as a language feature |
| [Refactoring Guru — Design Patterns](https://refactoring.guru/design-patterns) | Patterns with diagrams and real motivation, not a catalogue of class hierarchies |

## Part II — The Browser Platform

| Resource | Why this one |
| -------- | ------------ |
| [MDN — CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) | Same reason as the JavaScript reference. The layout guides are better than any course |
| [web.dev](https://web.dev/) | Google's platform writing. Uneven in places, but the accessibility and Web Vitals material is the primary source |
| [Baseline](https://web.dev/baseline) | The answer to "can I use this yet" in one word instead of a support matrix. Pair it with [Can I Use](https://caniuse.com/) when you need the detail |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | The normative text. Read the [Understanding](https://www.w3.org/WAI/test-evaluate/) material alongside it — the success criteria alone are hard to apply |
| [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | Patterns with working keyboard behaviour. The first rule of ARIA is in here too |
| [HTML Standard](https://html.spec.whatwg.org/multipage/) | Living, not versioned. Go here when MDN and a blog post disagree |
| [Chrome — Web Platform](https://developer.chrome.com/docs/web-platform) | What shipped in the last few releases, with the reasoning |

## Part III — The Modern Frontend Stack

The fastest-moving part of the book, so the ratio flips: almost all documentation, almost no books.

> ⚠️ **Moving target:** React, Next.js and Svelte all ship breaking changes yearly, and third-party
> tutorials go stale within one major version. The durable principle is that **only the official docs
> are load-bearing here.** Everything else on this list is commentary.

| Resource | Why this one |
| -------- | ------------ |
| [React docs](https://react.dev/) | The rewritten docs are genuinely good. "Escape Hatches" and "You Might Not Need an Effect" are the two pages most senior candidates have not read |
| [Next.js docs](https://nextjs.org/docs) | Read the App Router caching pages against the version you are actually running. They have changed more than once |
| [Svelte docs](https://svelte.dev/docs/svelte/overview) and [SvelteKit docs](https://svelte.dev/docs/kit/introduction) | Runes changed the mental model in Svelte 5. Anything written before it is misleading |
| [Svelte tutorial](https://svelte.dev/tutorial) | The interactive one. An hour here is worth a week of reading about Svelte |
| [TanStack Query](https://tanstack.com/query/latest) | The docs double as the best explanation of server-state caching in general, whatever library you use |
| [Vite](https://vite.dev/) | The build tool most of the ecosystem now assumes. Read the "Why Vite" and dependency pre-bundling pages |
| [GreatFrontEnd — React Interview Playbook](https://www.greatfrontend.com/react-interview-playbook) | Framework-specific interview questions, which the general banks handle badly |
| [State of JS](https://2025.stateofjs.com/) | Adoption and retention numbers. Useful for "why did you choose X" answers, and for noticing what you have stopped hearing about |

## Part IV — Frontend at Scale

| Resource | Why this one |
| -------- | ------------ |
| [web.dev — Web Vitals](https://web.dev/articles/vitals) | The definitions, the thresholds, and what actually moves each metric |
| [Chrome UX Report](https://developer.chrome.com/docs/crux) | Field data, not lab data. The difference between the two is a common interview follow-up |
| [OWASP Top Ten](https://owasp.org/www-project-top-ten/) | The list every security question is drawn from, directly or indirectly |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Where the Top Ten tells you the risk, these tell you the fix. The CSP, XSS prevention and JWT sheets earn their place |
| [Testing Library](https://testing-library.com/) | The guiding principle page is the argument, not just the API |
| [Playwright](https://playwright.dev/) and [Vitest](https://vitest.dev/) | The current default pair. Read Playwright's locators and auto-waiting pages before writing a single test |
| ["Write tests. Not too many. Mostly integration."](https://kentcdodds.com/blog/write-tests) — Kent C. Dodds | Short, and still the clearest statement of the testing trophy argument |

## Part V — Backend for Frontend Engineers

| Resource | Why this one |
| -------- | ------------ |
| [Node.js API docs](https://nodejs.org/docs/latest/api/) | Go straight to the streams, worker threads and `async_hooks` pages. Those are what separates a frontend engineer's Node from a backend engineer's |
| [*Designing Data-Intensive Applications*](https://dataintensive.net/) — Martin Kleppmann | The depth book for Parts V and VI both. If you read one book on this list, read this one |
| [Use The Index, Luke](https://use-the-index-luke.com/) | Free, and the best explanation of why a query is slow that exists anywhere |
| [PostgreSQL docs](https://www.postgresql.org/docs/current/) | Unusually well written for a database manual. The indexes and transaction isolation chapters are the ones to read |
| [Redis docs](https://redis.io/docs/latest/) | For the caching and rate-limiting chapters |
| [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | The actual definition of the status codes and methods that API design arguments turn on |
| [OAuth 2.1](https://oauth.net/2.1/) and [How OpenID Connect Works](https://openid.net/developers/how-connect-works/) | Auth explained by the people who specify it, rather than by an identity vendor selling something |
| [Express](https://expressjs.com/) and [NestJS](https://docs.nestjs.com/) | The two framework docs Part V's examples assume |
| [GraphQL — Learn](https://graphql.org/learn/) | Enough to hold a position on GraphQL versus REST without having shipped either |

## Part VI — System Design

| Resource | Why this one |
| -------- | ------------ |
| [*System Design Interview* vols 1 and 2](https://bytebytego.com/) — Alex Xu | The standard preparation text for the backend-flavoured round. Volume 2 is the harder and more useful half |
| [ByteByteGo](https://bytebytego.com/) | The same author's ongoing writing. The newsletter's diagrams are the fastest way to revise a building block |
| [GreatFrontEnd — Front End System Design Playbook](https://www.greatfrontend.com/front-end-system-design-playbook) | The frontend system design round barely existed five years ago and is badly served elsewhere. This is the best treatment of it |
| [The System Design Primer](https://github.com/donnemartin/system-design-primer) | Free and comprehensive. Use it as a reference for a building block you have never used, not as a reading list |
| [*Designing Data-Intensive Applications*](https://dataintensive.net/) — Martin Kleppmann | Listed twice on purpose. Replication, partitioning and consistency are Part VI's foundation |

## Part VII — AI Engineering

The newest material in the book, and the list most likely to be out of date by the time you read it.

| Resource | Why this one |
| -------- | ------------ |
| [DeepLearning.AI short courses](https://www.deeplearning.ai/short-courses/) | An hour each, free, and built with the vendors. The RAG, evaluation and agent courses map almost one to one onto Part VII |
| [Claude API docs](https://docs.claude.com/) and [OpenAI platform docs](https://platform.openai.com/docs) | Read both. Interviews ask about the shape of the problem, and seeing two APIs solve it differently is what teaches the shape |
| [AI SDK](https://ai-sdk.dev/docs/introduction) | The TypeScript layer Part VII's examples use. Its streaming and tool-calling pages are the practical core |
| [Model Context Protocol](https://modelcontextprotocol.io/) | The tool-connection standard. Know what it is and what problem it removes |
| ["Building effective agents"](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic | Short, vendor-written but unusually unhyped, and the clearest statement of when not to build an agent |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/) | Prompt injection and its relatives, treated as a security problem rather than a curiosity |
| [Ragas](https://docs.ragas.io/) | Retrieval and generation metrics, defined. Useful even if you never run the library |
| [*AI Engineering*](https://huyenchip.com/books/) — Chip Huyen | The depth book for this part. Written for engineers who build with models rather than train them, which is exactly Part VII's scope |

## Part VIII — Ship and Operate

| Resource | Why this one |
| -------- | ------------ |
| [*Pro Git*](https://git-scm.com/book/en/v2) | Free. Chapters 7 and 10 are the ones that turn Git from memorised commands into a model |
| [Docker docs](https://docs.docker.com/) | The build-cache and multi-stage pages specifically. Most container interview questions are image-size questions in disguise |
| [GitHub Actions docs](https://docs.github.com/en/actions) | Whatever your employer runs, this is the best-documented CI system to learn the concepts on |
| [OpenTelemetry](https://opentelemetry.io/docs/) | Vendor-neutral instrumentation. Learn the model here, then apply it to whichever vendor you are given |
| [Google SRE books](https://sre.google/books/) | Free. Read the SLO and alerting chapters; skip the parts about running Google |
| [DORA](https://dora.dev/) | The four metrics, and the research behind the claim that they correlate with delivery performance |

## Part IX — The Human Layer

| Resource | Why this one |
| -------- | ------------ |
| [StaffEng](https://staffeng.com/) — Will Larson | Real stories from people in the role, plus the clearest published description of what staff engineers actually do |
| *The Staff Engineer's Path* — Tanya Reilly (O'Reilly) | The depth book for the scope and influence questions a senior loop asks. No free edition — buy it or borrow it |
| [GreatFrontEnd — Behavioral Interview Playbook](https://www.greatfrontend.com/behavioral-interview-playbook) | Free, and specific to engineering rather than generic careers advice |
| ["Ten Rules for Negotiating a Job Offer"](https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/) — Haseeb Qureshi | Long, and worth every minute. Read it before the first recruiter call, not after the offer |
| [levels.fyi](https://www.levels.fyi/) | Compensation data by level and location. Negotiating without it is negotiating blind |

## Appendix — DSA Patterns

| Resource | Why this one |
| -------- | ------------ |
| [NeetCode](https://neetcode.io/practice) | The curated 150. Pattern-grouped, which is how the appendix is organised and how the skill actually transfers |
| [LeetCode](https://leetcode.com/) | The problem set every chapter in the appendix cites. Use the study plans rather than picking at random |
| [Tech Interview Handbook — Algorithms](https://www.techinterviewhandbook.org/) | The cheatsheets per data structure, for the night before |

## What to Read Next

- [Chapter ?? — Glossary](#ch-glossary) — a term in one line before you go looking for a whole article on it
- [Chapter ?? — About the Author](#ch-about-the-author) — who chose these, and on what basis
