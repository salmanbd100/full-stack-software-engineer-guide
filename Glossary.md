---
title: Glossary
part: 0
chapter: 98
slug: glossary
level: beginner # beginner | intermediate | advanced
reading_time: 15
updated: 2026-09-08
tags: [back-matter, reference]
in_book: true
---

# Glossary {#ch-glossary}

> Look up a term in one line, then go to the chapter that owns it.

**In this glossary:** the terms a reader is most likely to arrive without · one sentence each · a chapter reference where one chapter owns the idea

Terms are alphabetical. Where a chapter is named, that chapter is the definitive treatment — the line
here is a reminder, not a substitute. **Part VII's vocabulary is over-represented on purpose**: it is
the newest material in the book and the part most readers meet cold.

## A

**ABAC** — Attribute-based access control: permissions decided by attributes of the user, resource and context rather than by a fixed role. [Authorisation](#ch-authorisation)

**AbortController** — The browser's cancellation primitive; its `signal` is passed to `fetch` and other APIs so a request can be aborted. [Modern JavaScript](#ch-modern-javascript)

**Accessibility tree** — The structure assistive technology reads, derived from the DOM plus roles, names and states. [The Accessibility Tree](#ch-accessibility-tree)

**Agent** — A system that decides which tools to call and in what order, rather than following a fixed script. [What an Agent Actually Is](#ch-what-an-agent-actually-is)

**Alerting** — Notifying a human that a service-level objective is at risk; distinct from monitoring, which only records. [Alerting and On-Call](#ch-alerting)

**ARIA** — Accessible Rich Internet Applications: attributes that add semantics HTML cannot express. The first rule is not to use it. [ARIA, and When Not to Use It](#ch-aria)

**Artefact** — The single build output promoted unchanged through every environment. Rebuilding per stage means testing something you did not ship. [CI/CD Fundamentals](#ch-cicd-fundamentals)

**AVIF** — An image format at roughly half the size of JPEG for the same visible quality, needing a fallback. [Asset Delivery](#ch-asset-delivery)

## B

**Backpressure** — Slowing a producer when a consumer cannot keep up, rather than buffering without limit. [Streams and Buffers](#ch-streams-buffers)

**BFF** — Backend for frontend: a thin server owned by the frontend team that shapes upstream data for one client. [Route Handlers and the BFF](#ch-route-handlers-and-the-bff)

**Blue-green deployment** — Running two production environments and switching traffic between them, so rollback is a switch rather than a redeploy. [Deployment Strategies](#ch-deployment-strategies)

**Brotli** — A compression algorithm about 5% better than gzip on text, and the default on every major CDN. [Bundles, Budgets and Third Parties](#ch-bundle-optimisation)

## C

**Cache invalidation** — Deciding when a cached entry has become wrong. The hard half of caching. [Frontend Caching Strategies](#ch-frontend-caching-strategies)

**CAP theorem** — Under a network partition a distributed store can preserve consistency or availability, not both. [Consistency and CAP](#ch-consistency-and-cap)

**CDN** — A network of edge servers that serve cached responses close to the user. [Content Delivery Networks](#ch-cdn)

**Chunk** — One output file from a bundler, produced by a split point such as a route or a dynamic import. [Loading and Code Splitting](#ch-loading-and-code-splitting)

**Chunking** — Splitting source documents into retrievable pieces before embedding them. Chunk boundaries decide what retrieval can find. [Ingestion and Chunking](#ch-ingestion-and-chunking)

**CLS** — Cumulative Layout Shift: how much visible content moves unexpectedly. Good is under 0.1. [Core Web Vitals](#ch-core-web-vitals)

**Closure** — A function plus the variables it captured from where it was defined. [Closures](#ch-closures)

**Code splitting** — Emitting several bundles so a page loads only the code it needs. [Loading and Code Splitting](#ch-loading-and-code-splitting)

**Content hash** — A hash of a file's contents placed in its filename, which is what makes a year-long cache safe. [Frontend Caching Strategies](#ch-frontend-caching-strategies)

**Context engineering** — Deciding what goes into a model's context window, in what order, within a token budget. [Context Engineering](#ch-context-engineering)

**Context window** — The maximum tokens a model can attend to in one request, covering prompt and output together. [How LLMs Behave](#ch-how-llms-behave)

**Contract testing** — Checking that a consumer's expectations of an API still match what the provider returns. [Visual and Contract Testing](#ch-visual-and-contract-testing)

**CORS** — Cross-origin resource sharing: the response headers that let a browser expose a cross-origin response to script. [CORS and CSRF](#ch-cors-csrf)

**Cosine similarity** — The similarity measure between two embedding vectors, based on the angle between them. [Embeddings and Similarity](#ch-embeddings-and-similarity)

**CSP** — Content Security Policy: a header restricting which sources a page may load or execute. [Content Security Policy](#ch-csp-headers)

**CSR** — Client-side rendering: the server sends a shell and the browser builds the page. [The Rendering Spectrum](#ch-rendering-spectrum)

**CSRF** — Cross-site request forgery: another site causing an authenticated request from the user's browser. [CORS and CSRF](#ch-cors-csrf)

**Cursor pagination** — Paging by an opaque pointer to the last row seen, which does not skip or duplicate rows under concurrent writes.

## D

**Debounce** — Running a handler only after events stop arriving. For cases where only the last value matters. [Rendering and Streaming](#ch-rendering-and-streaming)

**Declarative rollback** — Reverting by redeploying a known-good artefact rather than by undoing changes. Data migrations are the part that does not roll back. [Deployment Strategies](#ch-deployment-strategies)

**Design system** — Tokens plus a component library plus the contract governing their versioning. [Design Systems at Scale](#ch-design-systems-at-scale)

**Design token** — A named design decision — a colour, a spacing step — that themes and components consume. [Design Systems at Scale](#ch-design-systems-at-scale)

**Discriminated union** — A union of object types sharing a literal field, which lets the compiler narrow exhaustively. [TypeScript Type Guards](#ch-type-guards)

**DORA metrics** — Deployment frequency, lead time for changes, change failure rate and time to restore. [Ways of Working](#ch-ways-of-working)

## E

**Edge runtime** — A lightweight isolate running Web-standard APIs in many regions; no filesystem, no raw TCP. [Edge Runtimes and Hono](#ch-edge-runtimes)

**Embedding** — A vector representation of text whose geometry encodes meaning, so similar text sits close together. [Embeddings and Similarity](#ch-embeddings-and-similarity)

**ETag** — A fingerprint of a response body that lets a server answer "unchanged" with a 304 and no payload. [Frontend Caching Strategies](#ch-frontend-caching-strategies)

**Eval** — A repeatable test of model output against a fixed dataset, producing a number you can compare across changes. [Evals](#ch-evals)

**Eventual consistency** — Replicas converge on the same value given time, but a read may return a stale one. [Replication](#ch-replication)

## F

**Fake** — A working but simplified stand-in for a dependency, such as an in-memory store. [Testing Strategy](#ch-testing-strategy)

**Feature flag** — A runtime switch that separates deploying code from releasing behaviour. [Feature Flags](#ch-feature-flags)

**Few-shot prompting** — Including worked examples in the prompt so the model infers the pattern. [Prompting as Engineering](#ch-prompting-as-engineering)

**FOIT / FOUT** — Flash of invisible text and flash of unstyled text: the two ways a late web font can fail. [Asset Delivery](#ch-asset-delivery)

**Function calling** — See **tool calling**.

## G

**Golden set** — A fixed, curated set of inputs with known-good outputs, used as the baseline for evals. [Evals](#ch-evals)

**Grounding** — Supplying retrieved source material so an answer can be checked against something. [Retrieval](#ch-retrieval)

**Guardrail** — A check on model input or output that blocks or rewrites it before it reaches a user or a tool. [Guardrails and Safety](#ch-guardrails-and-safety)

## H

**Hallucination** — Confident output unsupported by the model's inputs. A retrieval or eval problem before it is a prompting one. [How LLMs Behave](#ch-how-llms-behave)

**Hoisting (bundler)** — Flattening dependencies into a shared folder, which is how a phantom dependency becomes importable. [Package Management](#ch-package-management)

**Hydration** — Attaching event handlers and state to server-rendered HTML. Main-thread work proportional to the tree. [Hydration and Its Costs](#ch-hydration-and-its-costs)

**Hybrid search** — Combining vector similarity with keyword search, because each finds what the other misses. [Retrieval](#ch-retrieval)

## I

**Idempotency** — A request that can be retried without changing the result beyond the first application. [REST API Best Practices](#ch-rest-best-practices)

**Immutable (cache)** — A `Cache-Control` directive telling the browser a URL's content will never change, so it need not revalidate. [Frontend Caching Strategies](#ch-frontend-caching-strategies)

**INP** — Interaction to Next Paint: how long from an interaction to the next painted frame, across all interactions. Replaced FID in 2024. [Core Web Vitals](#ch-core-web-vitals)

**IntersectionObserver** — A browser API reporting when an element approaches the viewport, far cheaper than a scroll listener. [Loading and Code Splitting](#ch-loading-and-code-splitting)

**Isolate** — A fresh JavaScript context inside an already-running runtime; the reason edge cold starts are near-zero. [Edge Runtimes and Hono](#ch-edge-runtimes)

**ISR** — Incremental static regeneration: serving a static page and rebuilding it in the background after a set interval. [Rendering in Next.js](#ch-rendering-in-nextjs)

## J

**JWT** — JSON Web Token: a signed, self-describing token. Stateless and therefore hard to revoke. [Credentials, Sessions and Tokens](#ch-credentials-and-sessions)

## L

**LCP** — Largest Contentful Paint: when the largest visible element finished rendering. Good is under 2.5 seconds. [Core Web Vitals](#ch-core-web-vitals)

**LLM-as-judge** — Using a model to score another model's output against a rubric, calibrated against human labels. [Evals](#ch-evals)

**Long task** — Main-thread work over 50 ms, which the browser cannot interrupt and which therefore delays interaction. [Rendering and Streaming](#ch-rendering-and-streaming)

## M

**MCP** — Model Context Protocol: a standard interface for exposing tools and data to a model client. [Model Context Protocol](#ch-model-context-protocol)

**Memoisation** — Caching a computation or a component render against its inputs. A targeted fix, not a default. [Performance and the React Compiler](#ch-react-performance-and-the-compiler)

**Micro-frontend** — Splitting one application into independently deployable pieces composed at runtime. Solves an organisational problem, not a technical one. [Micro-Frontends](#ch-micro-frontends)

**Middleware** — A function in an ordered pipeline that may modify a request, respond, or pass it on. [Express](#ch-express)

**Monorepo** — One repository holding several packages, with a task graph and caching to keep builds affordable. [Monorepos](#ch-monorepos)

**Mutation testing** — Introducing small changes to code and checking whether any test fails; the metric coverage is mistaken for. [Visual and Contract Testing](#ch-visual-and-contract-testing)

## N

**N+1 query** — One query per row of a previous result, instead of one query for all of them. The standard GraphQL failure. [GraphQL](#ch-graphql)

**Nullish coalescing** — `??`, which falls back only on `null` or `undefined`, unlike `||`. [Modern JavaScript](#ch-modern-javascript)

## O

**OAuth 2.1** — A delegation framework: a user authorises an application to act on their behalf without sharing a password. [OAuth 2.1 and OpenID Connect](#ch-oauth)

**OIDC** — OpenID Connect: an identity layer on OAuth, and the source of the short-lived tokens a pipeline should use instead of static keys. [OAuth 2.1 and OpenID Connect](#ch-oauth)

**Optimistic update** — Applying a change in the UI before the server confirms it, with a defined rollback. [Server State](#ch-server-state)

## P

**Partial prerendering** — Serving a static shell immediately and streaming the dynamic parts into it. [Rendering in Next.js](#ch-rendering-in-nextjs)

**Peer dependency** — A dependency the consumer must provide, used to keep a singleton such as React single. [Package Management](#ch-package-management)

**Phantom dependency** — A package importable at runtime without being declared, because hoisting put it in scope. [Package Management](#ch-package-management)

**Prefetch** — Fetching a resource during idle time at lowest priority, for a navigation that will probably happen. [Loading and Code Splitting](#ch-loading-and-code-splitting)

**Preload** — Fetching a resource the current page needs at high priority, because the parser would find it late. [Loading and Code Splitting](#ch-loading-and-code-splitting)

**Progressive enhancement** — Building so the core function works without JavaScript, then improving it where available. [Actions and Forms](#ch-react-actions-and-forms)

**Prompt injection** — Untrusted text in a model's context changing its behaviour. The discipline's defining vulnerability. [Prompt Injection](#ch-prompt-injection)

## Q

**Query plan** — The database's chosen strategy for a query. Reading one beats guessing at indexes. [Indexes and Query Plans](#ch-indexes)

**Quorum** — The number of replicas that must acknowledge a read or write for it to count. [Replication](#ch-replication)

## R

**RADIO** — Requirements, Architecture, Data model, Interface, Optimisations: the structure of a design round. [Driving the Design Round](#ch-driving-the-round)

**RAG** — Retrieval-augmented generation: retrieving relevant source text and putting it in the prompt. [When RAG, When Fine-Tune, When Neither](#ch-when-rag-when-fine-tune-when-neither)

**RBAC** — Role-based access control: permissions attached to roles, and roles to users. [Authorisation](#ch-authorisation)

**Reranking** — Reordering retrieved candidates with a more expensive, more accurate model before they reach the prompt. [Retrieval](#ch-retrieval)

**RSC** — React Server Components: components that render on the server and ship no JavaScript for themselves. [Server and Client Components](#ch-server-components-vs-client-components)

**RUM** — Real user monitoring: performance data collected from actual visits, as opposed to a lab run. [Measuring in Production](#ch-measuring-in-production)

**Runes** — Svelte 5's explicit reactivity primitives, replacing compiler-inferred reactive statements. [Svelte Runes](#ch-svelte-runes)

## S

**`satisfies`** — A TypeScript operator that checks a value against a type without widening it, keeping literal types. [TypeScript at Scale](#ch-typescript-at-scale)

**Semantic versioning** — `major.minor.patch`, where a major signals a breaking change. A promise, not a guarantee. [Dependencies and Upgrades](#ch-dependencies-and-upgrades)

**Server Action** — A function marked to run on the server, callable from client code as if it were local. [Server Actions and Mutations](#ch-server-actions)

**Service worker** — A programmable proxy between a page and the network, and the one cache layer you cannot purge from the server. [Service Workers](#ch-service-workers)

**Sharding** — Splitting one dataset across independent stores by a key, trading joins for capacity. [Sharding](#ch-sharding)

**Signal** — A reactive value that tracks its own dependents, so an update recomputes only what read it. [Signals and the Next Model](#ch-signals-and-the-next-model)

**SLO** — Service level objective: a target for an indicator over a window, such as 99.5% crash-free sessions. [Measuring in Production](#ch-measuring-in-production)

**Source map** — A mapping from built output back to source, required to make a minified production stack trace readable. [Measuring in Production](#ch-measuring-in-production)

**SSE** — Server-sent events: a one-way stream of typed events over HTTP, with resumability. [Real-Time and Streaming APIs](#ch-realtime-streaming)

**SSG** — Static site generation: rendering to HTML at build time. [The Rendering Spectrum](#ch-rendering-spectrum)

**SSR** — Server-side rendering: rendering to HTML per request. [The Rendering Spectrum](#ch-rendering-spectrum)

**STAR** — Situation, Task, Action, Result: the structure of a behavioural answer. [The STAR Framework](#ch-star-framework)

**Stale-while-revalidate** — Serving a cached value immediately and refreshing it in the background. [Frontend Caching Strategies](#ch-frontend-caching-strategies)

**Streaming** — Sending a response in pieces as they become ready, so the first bytes paint before the slowest data resolves. [Streaming HTML](#ch-streaming-html)

**Structured output** — Constraining a model to emit data matching a schema, rather than prose to be parsed. [Structured Output](#ch-structured-output)

**Stub** — A test double returning canned data, with no assertion about how it was called. [Testing Strategy](#ch-testing-strategy)

**Suspense** — A React boundary that renders a fallback while a child is waiting, and the mechanism streaming uses. [Suspense and Streaming](#ch-suspense-and-streaming)

## T

**Temperature** — A sampling parameter controlling output randomness; near zero for extraction, higher for generation. [Choosing a Model](#ch-choosing-a-model)

**Throttle** — Running a handler at most once per interval. For cases where a steady sample matters. [Rendering and Streaming](#ch-rendering-and-streaming)

**Token** — The unit a model reads and bills in: a few characters, not a word. [How LLMs Behave](#ch-how-llms-behave)

**Tool calling** — A model returning a request to invoke a named function with arguments, which your code executes. [Tool Calling](#ch-tool-calling)

**Tree shaking** — Removing exports that are imported but never used, which needs ES modules and no import-time side effects. [Bundles, Budgets and Third Parties](#ch-bundle-optimisation)

**tRPC** — A way to derive a typed client directly from a TypeScript server's own types, with no schema. [tRPC and Typed APIs](#ch-trpc)

## V

**Vector store** — A database indexed for nearest-neighbour search over embeddings. [Vector Stores](#ch-vector-stores)

**`verbatimModuleSyntax`** — A TypeScript flag requiring `import type` for type-only imports, so erasure is explicit in the source. [TypeScript at Scale](#ch-typescript-at-scale)

**Virtualisation** — Rendering only the visible rows of a long list and faking the rest with a spacer. [Rendering and Streaming](#ch-rendering-and-streaming)

**Visual regression** — Comparing rendered screenshots against a baseline, for failures no assertion can express. [Visual and Contract Testing](#ch-visual-and-contract-testing)

## W

**Web Vitals** — Google's three user-centred metrics: LCP, INP and CLS, judged at the 75th percentile of real visits. [Core Web Vitals](#ch-core-web-vitals)

**WebSocket** — A persistent two-way connection established by upgrading an HTTP request, which discards the HTTP request middleware you relied on. [Real-Time and Streaming APIs](#ch-realtime-streaming)

**Workspace protocol** — A dependency specifier resolving to a package in the same repository rather than to the registry. [Monorepos](#ch-monorepos)

## Z

**Zero-shot prompting** — Asking for the task with instructions but no worked examples. [Prompting as Engineering](#ch-prompting-as-engineering)
