---
sourceHash: "69070ac2c60d6ff9e86a7e78862f2af2c2b4e849779749b593243a7e259bf70c"
title: "শব্দকোষ"
translatedAt: "2026-10-13T03:15:53.645Z"
model: "claude-opus-5-5 (Claude Code)"
---

# শব্দকোষ {#ch-glossary}

> এক line-এ একটি term দেখে নিন, তারপর যে অধ্যায়ে সেটার মূল আলোচনা, সেখানে যান।

**এই শব্দকোষে:** যে term-গুলো না জেনেই পাঠকের এখানে আসার সম্ভাবনা সবচেয়ে বেশি · প্রতিটির জন্য এক বাক্য · যেখানে একটি অধ্যায় ধারণাটির মালিক, সেখানে সেই অধ্যায়ের reference

Term-গুলো বর্ণানুক্রমে সাজানো। যেখানে একটি অধ্যায়ের নাম দেওয়া আছে, সেই অধ্যায়টাই চূড়ান্ত আলোচনা — এখানকার line
শুধু মনে করিয়ে দেয়, বিকল্প নয়। **Part VII-এর শব্দভান্ডার ইচ্ছা করেই বেশি রাখা হয়েছে**: এটা বইয়ের সবচেয়ে নতুন
বিষয়, আর বেশিরভাগ পাঠক এই part-এ কোনো প্রস্তুতি ছাড়াই আসেন।

## A

**ABAC** — Attribute-based access control: নির্দিষ্ট role দিয়ে নয়, user, resource আর context-এর attribute দিয়ে permission ঠিক করা। [OAuth, OIDC ও Authorisation](#ch-oauth)

**AbortController** — Browser-এর cancellation primitive। এর `signal` `fetch` আর অন্য API-তে পাঠানো হয়, যাতে একটি request abort করা যায়। [Promise, Async/Await ও Error](#ch-promises-async)

**Accessibility tree** — যে structure assistive technology পড়ে। এটা তৈরি হয় DOM থেকে, সাথে role, name আর state মিলিয়ে। [Accessibility Tree](#ch-accessibility-tree)

**Agent** — এমন একটি system, যেটা নির্দিষ্ট script মেনে না চলে নিজেই ঠিক করে কোন tool কোন ক্রমে call করবে। [Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is)

**Alerting** — একজন মানুষকে জানানো যে একটি service-level objective ঝুঁকিতে আছে। Monitoring থেকে আলাদা, যেটা শুধু record করে। [Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)

**ARIA** — Accessible Rich Internet Applications: এমন attribute, যেগুলো HTML যা প্রকাশ করতে পারে না সেই semantics যোগ করে। প্রথম নিয়ম হলো এটা ব্যবহার না করা। [ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)

**Artefact** — একটিমাত্র build output, যেটা কোনো বদল ছাড়াই প্রতিটি environment-এ promote করা হয়। প্রতিটি stage-এ আবার build করা মানে এমন কিছু test করা, যেটা আপনি ship করেননি। [CI/CD-র মূল কথা](#ch-cicd-fundamentals)

**AVIF** — একটি image format, যেটা একই দৃশ্যমান quality-তে JPEG-এর প্রায় অর্ধেক size-এর। এর একটি fallback লাগে। [Caching ও Asset Delivery](#ch-asset-delivery)

## B

**Backpressure** — Consumer তাল রাখতে না পারলে সীমাহীন buffer না করে producer-কে ধীর করে দেওয়া। [Node.js Performance, Stream ও Scaling](#ch-nodejs-performance)

**BFF** — Backend for frontend: frontend team-এর মালিকানাধীন একটি পাতলা server, যেটা একটি client-এর জন্য upstream data সাজিয়ে দেয়। [Route Handler ও BFF](#ch-route-handlers-and-the-bff)

**Blue-green deployment** — দুটি production environment চালিয়ে রাখা আর তাদের মধ্যে traffic বদলানো, যাতে rollback হয় একটি switch, redeploy নয়। [Deployment Strategies](#ch-deployment-strategies)

**Brotli** — একটি compression algorithm, যেটা text-এ gzip-এর চেয়ে প্রায় 5% ভালো, আর প্রতিটি বড় CDN-এ default। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

## C

**Cache invalidation** — একটি cache করা entry কখন ভুল হয়ে গেছে, তা ঠিক করা। Caching-এর কঠিন অর্ধেক। [Caching ও Asset Delivery](#ch-asset-delivery)

**CAP theorem** — Network partition-এর সময় একটি distributed store consistency অথবা availability রক্ষা করতে পারে, দুটো একসাথে নয়। [Reliability, Consistency ও CAP](#ch-consistency-and-cap)

**CDN** — Edge server-এর একটি network, যেটা user-এর কাছাকাছি থেকে cache করা response দেয়। [Content Delivery Networks](#ch-cdn)

**Chunk** — একটি bundler-এর একটি output file, যেটা route বা dynamic import-এর মতো একটি split point থেকে তৈরি হয়। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Chunking** — Embed করার আগে source document-গুলোকে retrieve করার মতো টুকরোয় ভাগ করা। Chunk-এর সীমানাই ঠিক করে retrieval কী খুঁজে পাবে। [Ingestion ও Chunking](#ch-ingestion-and-chunking)

**CLS** — Cumulative Layout Shift: দৃশ্যমান content কতটা অপ্রত্যাশিতভাবে সরে যায়। 0.1-এর নিচে হলে ভালো। [Core Web Vitals](#ch-core-web-vitals)

**Closure** — একটি function, সাথে সেই variable-গুলো, যেগুলো এটা যেখানে define হয়েছে সেখান থেকে capture করেছে। [Scope ও Closure](#ch-closures)

**Code splitting** — কয়েকটি bundle তৈরি করা, যাতে একটি page শুধু তার দরকারি code load করে। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Content hash** — একটি file-এর content-এর hash, যেটা তার filename-এ বসানো হয়। এটাই এক বছরের cache-কে নিরাপদ করে। [Caching ও Asset Delivery](#ch-asset-delivery)

**Context engineering** — একটি token budget-এর মধ্যে model-এর context window-এ কী যাবে, কোন ক্রমে যাবে, তা ঠিক করা। [Context Engineering](#ch-context-engineering)

**Context window** — একটি request-এ model সর্বোচ্চ যতগুলো token দেখতে পারে, prompt আর output মিলিয়ে। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Contract testing** — একটি API নিয়ে consumer-এর প্রত্যাশা এখনো provider যা return করে তার সাথে মেলে কি না, তা যাচাই করা। [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)

**CORS** — Cross-origin resource sharing: সেই response header-গুলো, যেগুলো browser-কে একটি cross-origin response script-এর কাছে খুলে দেওয়ার অনুমতি দেয়। [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)

**Cosine similarity** — দুটি embedding vector-এর মধ্যে similarity-র মাপ, তাদের মধ্যের কোণের ওপর ভিত্তি করে। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**CSP** — Content Security Policy: একটি header, যেটা সীমিত করে একটি page কোন কোন source থেকে load বা execute করতে পারবে। [Content Security Policy ও Security Header](#ch-content-security-policy)

**CSR** — Client-side rendering: server একটি shell পাঠায়, আর browser page তৈরি করে। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**CSRF** — Cross-site request forgery: অন্য একটি site user-এর browser থেকে একটি authenticated request পাঠিয়ে দেয়। [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)

**Cursor pagination** — শেষ দেখা row-এর একটি opaque pointer দিয়ে paging করা। একসাথে write চলার সময়েও এটা কোনো row বাদ দেয় না বা দুবার দেখায় না।

## D

**Debounce** — Event আসা থামার পরেই শুধু একটি handler চালানো। যেখানে শুধু শেষ value-টা গুরুত্বপূর্ণ, সেখানে। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Declarative rollback** — পরিবর্তনগুলো undo করে নয়, একটি পরিচিত ভালো artefact আবার deploy করে আগের অবস্থায় ফেরা। Data migration হলো সেই অংশ, যেটা roll back হয় না। [Deployment Strategies](#ch-deployment-strategies)

**Design system** — Token, সাথে একটি component library, সাথে তাদের versioning নিয়ন্ত্রণ করা contract। [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)

**Design token** — একটি নাম দেওয়া design সিদ্ধান্ত — একটি রং, spacing-এর একটি ধাপ — যেটা theme আর component ব্যবহার করে। [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)

**Discriminated union** — Object type-এর একটি union, যাদের একটি literal field একই। এতে compiler পুরোপুরি narrow করতে পারে। [TypeScript Type Guard](#ch-type-guards)

**DORA metrics** — Deployment frequency, lead time for changes, change failure rate আর time to restore। [কাজের ধরন ও Engineering Culture](#ch-engineering-culture)

## E

**Edge runtime** — একটি হালকা isolate, যেটা অনেক region-এ Web-standard API চালায়। কোনো filesystem নেই, raw TCP নেই। [Express, Hono ও Edge Runtime](#ch-express)

**Embedding** — Text-এর একটি vector রূপ, যার জ্যামিতি অর্থ ধরে রাখে। তাই একই রকম text কাছাকাছি থাকে। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**ETag** — একটি response body-র fingerprint, যেটা দিয়ে server কোনো payload ছাড়াই একটি 304 দিয়ে "বদলায়নি" উত্তর দিতে পারে। [Caching ও Asset Delivery](#ch-asset-delivery)

**Eval** — একটি নির্দিষ্ট dataset-এর ওপর model output-এর পুনরাবৃত্তিযোগ্য test, যেটা এমন একটি সংখ্যা দেয় যা পরিবর্তনের আগে-পরে তুলনা করা যায়। [Eval, Retrieval Metric ও Error Analysis](#ch-evals)

**Eventual consistency** — সময় পেলে replica-গুলো একই value-তে মিলে যায়, কিন্তু একটি read পুরোনো value return করতে পারে। [Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore)

## F

**Fake** — একটি dependency-র কাজ করা কিন্তু সরল বিকল্প, যেমন একটি in-memory store। [Testing Strategy](#ch-testing-strategy)

**Feature flag** — একটি runtime switch, যেটা code deploy করা আর behaviour release করাকে আলাদা করে। [Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies)

**Few-shot prompting** — Prompt-এ সমাধান করা কয়েকটি উদাহরণ দেওয়া, যাতে model pattern-টা ধরে নেয়। [Engineering হিসেবে Prompting](#ch-prompting-as-engineering)

**FOIT / FOUT** — Flash of invisible text আর flash of unstyled text: দেরিতে আসা একটি web font যে দুইভাবে ব্যর্থ হতে পারে। [Caching ও Asset Delivery](#ch-asset-delivery)

**Function calling** — **tool calling** দেখুন।

## G

**Golden set** — জানা ভালো output-সহ input-এর একটি নির্দিষ্ট, বাছাই করা set, যেটা eval-এর baseline হিসেবে ব্যবহার হয়। [Eval, Retrieval Metric ও Error Analysis](#ch-evals)

**Grounding** — Retrieve করা source material দেওয়া, যাতে একটি উত্তর কোনো কিছুর সাথে মিলিয়ে যাচাই করা যায়। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**Guardrail** — Model-এর input বা output-এর ওপর একটি check, যেটা user বা tool-এর কাছে পৌঁছানোর আগে সেটা আটকায় বা নতুন করে লেখে। [Guardrail ও Safety](#ch-guardrails-and-safety)

## H

**Hallucination** — আত্মবিশ্বাসী output, যার পক্ষে model-এর input-এ কোনো ভিত্তি নেই। এটা prompting-এর সমস্যা হওয়ার আগে retrieval বা eval-এর সমস্যা। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Hydration** — Server-render করা HTML-এ event handler আর state জুড়ে দেওয়া। Tree-এর আকারের অনুপাতে main-thread-এর কাজ। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**Hybrid search** — Vector similarity-র সাথে keyword search মেলানো, কারণ একটি যা পায় না, অন্যটি সেটা পায়। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

## I

**Idempotency** — এমন একটি request, যেটা আবার পাঠালে প্রথমবারের পরে ফলাফল আর বদলায় না। [REST Best Practice ও Versioning](#ch-rest-best-practices)

**Immutable (cache)** — একটি `Cache-Control` directive, যেটা browser-কে জানায় একটি URL-এর content কখনো বদলাবে না, তাই revalidate করার দরকার নেই। [Caching ও Asset Delivery](#ch-asset-delivery)

**INP** — Interaction to Next Paint: সব interaction মিলিয়ে, একটি interaction থেকে পরের paint হওয়া frame পর্যন্ত কত সময় লাগে। 2024-এ FID-এর জায়গা নিয়েছে। [Core Web Vitals](#ch-core-web-vitals)

**IntersectionObserver** — একটি browser API, যেটা জানায় কখন একটি element viewport-এর কাছে আসছে। Scroll listener-এর চেয়ে অনেক সস্তা। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Isolate** — আগে থেকে চলা একটি runtime-এর ভেতরে একটি নতুন JavaScript context। Edge-এর cold start প্রায় শূন্য হওয়ার কারণ এটাই। [Express, Hono ও Edge Runtime](#ch-express)

**ISR** — Incremental static regeneration: একটি static page দেওয়া, আর নির্দিষ্ট সময় পর পর background-এ সেটা আবার build করা। [Next.js-এ Rendering](#ch-rendering-in-nextjs)

## J

**JWT** — JSON Web Token: একটি signed, নিজের বর্ণনা নিজেই বহন করা token। Stateless, আর সে কারণেই revoke করা কঠিন। [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)

## L

**LCP** — Largest Contentful Paint: সবচেয়ে বড় দৃশ্যমান element-এর render কখন শেষ হলো। 2.5 সেকেন্ডের নিচে হলে ভালো। [Core Web Vitals](#ch-core-web-vitals)

**LLM-as-judge** — একটি rubric ধরে অন্য একটি model-এর output-কে score দিতে একটি model ব্যবহার করা, মানুষের দেওয়া label-এর সাথে calibrate করে। [Eval, Retrieval Metric ও Error Analysis](#ch-evals)

**Long task** — 50 ms-এর বেশি main-thread-এর কাজ, যেটা browser থামাতে পারে না, আর তাই interaction দেরি করিয়ে দেয়। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

## M

**MCP** — Model Context Protocol: একটি model client-এর কাছে tool আর data খুলে দেওয়ার একটি standard interface। [Model Context Protocol](#ch-model-context-protocol)

**Memoisation** — একটি computation বা একটি component render তার input অনুযায়ী cache করা। একটি নির্দিষ্ট সমাধান, default নয়। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Micro-frontend** — একটি application-কে আলাদাভাবে deploy করা যায় এমন টুকরোয় ভাগ করা, যেগুলো runtime-এ জোড়া লাগে। এটা একটি organisational সমস্যার সমাধান, technical সমস্যার নয়। [Micro-Frontend](#ch-micro-frontends)

**Middleware** — একটি ক্রমানুসারী pipeline-এর একটি function, যেটা একটি request বদলাতে পারে, respond করতে পারে, বা সামনে পাঠিয়ে দিতে পারে। [Express, Hono ও Edge Runtime](#ch-express)

**Monorepo** — কয়েকটি package রাখা একটি repository, সাথে একটি task graph আর caching, যাতে build-এর খরচ সাধ্যের মধ্যে থাকে। [Monorepo](#ch-monorepos)

**Mutation testing** — Code-এ ছোট ছোট পরিবর্তন এনে দেখা কোনো test fail করে কি না। Coverage-কে ভুল করে যে metric মনে করা হয়, আসলে সেটা এটা। [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)

## N

**N+1 query** — সবগুলোর জন্য একটি query-র বদলে আগের result-এর প্রতিটি row-এর জন্য একটি করে query। GraphQL-এর প্রচলিত ব্যর্থতা। [GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)

**Nullish coalescing** — `??`, যেটা `||`-এর মতো নয়, শুধু `null` বা `undefined`-এ fallback করে। [Data Type, Variable ও Built-in](#ch-data-types-variables)

## O

**OAuth 2.1** — একটি delegation framework: একজন user password share না করেই একটি application-কে তার হয়ে কাজ করার অনুমতি দেন। [OAuth, OIDC ও Authorisation](#ch-oauth)

**OIDC** — OpenID Connect: OAuth-এর ওপর একটি identity layer, আর সেই স্বল্পস্থায়ী token-এর উৎস, যেগুলো একটি pipeline-এর static key-এর বদলে ব্যবহার করা উচিত। [OAuth, OIDC ও Authorisation](#ch-oauth)

**Optimistic update** — Server নিশ্চিত করার আগেই UI-তে একটি পরিবর্তন দেখিয়ে দেওয়া, একটি নির্দিষ্ট rollback-সহ। [Server State](#ch-server-state)

## P

**Partial prerendering** — সাথে সাথে একটি static shell দেওয়া, আর dynamic অংশগুলো তার ভেতরে stream করা। [Next.js-এ Rendering](#ch-rendering-in-nextjs)

**Prefetch** — সম্ভবত ঘটবে এমন একটি navigation-এর জন্য idle সময়ে সবচেয়ে কম priority-তে একটি resource fetch করা। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Preload** — বর্তমান page-এর দরকারি একটি resource বেশি priority-তে fetch করা, কারণ parser সেটা দেরিতে খুঁজে পেত। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Progressive enhancement** — এমনভাবে তৈরি করা যাতে মূল কাজ JavaScript ছাড়াই চলে, তারপর যেখানে পাওয়া যায় সেখানে সেটা উন্নত করা। [Action ও Form](#ch-react-actions-and-forms)

**Prompt injection** — Model-এর context-এ থাকা অবিশ্বস্ত text তার আচরণ বদলে দেওয়া। এই ক্ষেত্রের সবচেয়ে বৈশিষ্ট্যপূর্ণ vulnerability। [Prompt Injection](#ch-prompt-injection)

## Q

**Query plan** — একটি query-র জন্য database-এর বেছে নেওয়া কৌশল। Index নিয়ে আন্দাজ করার চেয়ে একটি plan পড়া ভালো। [Index, Query Plan, ORM ও Migration](#ch-indexes)

**Quorum** — একটি read বা write গণ্য হতে হলে যতগুলো replica-কে acknowledge করতে হয়, সেই সংখ্যা। [Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore)

## R

**RADIO** — Requirements, Architecture, Data model, Interface, Optimisations: একটি design round-এর structure। [Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)

**RAG** — Retrieval-augmented generation: প্রাসঙ্গিক source text retrieve করে prompt-এ বসানো। [কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither)

**RBAC** — Role-based access control: permission জোড়া থাকে role-এর সাথে, আর role জোড়া থাকে user-এর সাথে। [OAuth, OIDC ও Authorisation](#ch-oauth)

**Reranking** — Retrieve করা candidate-গুলো prompt-এ পৌঁছানোর আগে একটি বেশি দামি, বেশি নির্ভুল model দিয়ে নতুন করে সাজানো। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**RSC** — React Server Components: যে component-গুলো server-এ render হয় আর নিজেদের জন্য কোনো JavaScript ship করে না। [Server Component ও Client Component](#ch-server-components-vs-client-components)

**RUM** — Real user monitoring: lab run-এর বিপরীতে, আসল visit থেকে সংগ্রহ করা performance data। [Production-এ মাপা](#ch-measuring-in-production)

**Runes** — Svelte 5-এর explicit reactivity primitive, যেগুলো compiler-এর অনুমান করা reactive statement-এর জায়গা নিয়েছে। [Runes Model, Component ও Snippet](#ch-svelte-runes)

## S

**`satisfies`** — একটি TypeScript operator, যেটা একটি value-কে widen না করে একটি type-এর সাথে মিলিয়ে দেখে, literal type ধরে রেখে। [বড় পরিসরে TypeScript](#ch-typescript-at-scale)

**Semantic versioning** — `major.minor.patch`, যেখানে major মানে একটি breaking change। এটা একটি প্রতিশ্রুতি, নিশ্চয়তা নয়। [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)

**Server Action** — Server-এ চলার জন্য চিহ্নিত একটি function, যেটা client code থেকে এমনভাবে call করা যায় যেন সেটা local। [Server Actions and Mutations](#ch-server-actions)

**Service worker** — একটি page আর network-এর মাঝে একটি programmable proxy, আর এমন একমাত্র cache layer, যেটা server থেকে purge করা যায় না। [Service Worker, Caching ও Offline](#ch-service-workers)

**Sharding** — একটি key দিয়ে একটি dataset-কে কয়েকটি স্বাধীন store-এ ভাগ করা। Capacity-র বিনিময়ে join ছেড়ে দেওয়া। [বড় পরিসরে Sharding ও Transaction](#ch-sharding)

**Signal** — একটি reactive value, যেটা নিজের dependent-দের track করে, তাই একটি update শুধু যারা এটা পড়েছে তাদেরই আবার হিসাব করে। [Client State ও Signal](#ch-client-state)

**SLO** — Service level objective: একটি সময়সীমার মধ্যে একটি indicator-এর লক্ষ্য, যেমন 99.5% crash-free session। [Production-এ মাপা](#ch-measuring-in-production)

**Source map** — Build করা output থেকে source-এ ফেরার একটি mapping। একটি minified production stack trace পড়ার মতো করতে এটা লাগে। [Production-এ মাপা](#ch-measuring-in-production)

**SSE** — Server-sent events: HTTP-র ওপর typed event-এর একমুখী stream, resume করার সুবিধাসহ। [Real-Time ও Streaming API](#ch-realtime-streaming)

**SSG** — Static site generation: build time-এ HTML-এ render করা। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**SSR** — Server-side rendering: প্রতিটি request-এ HTML-এ render করা। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**STAR** — Situation, Task, Action, Result: একটি behavioural উত্তরের structure। [The STAR Framework](#ch-star-framework)

**Stale-while-revalidate** — সাথে সাথে একটি cache করা value দেওয়া, আর background-এ সেটা refresh করা। [Caching ও Asset Delivery](#ch-asset-delivery)

**Streaming** — একটি response তৈরি হতে থাকার সাথে সাথে টুকরো টুকরো পাঠানো, যাতে সবচেয়ে ধীর data resolve হওয়ার আগেই প্রথম byte-গুলো paint হয়। [Streaming HTML](#ch-streaming-html)

**Structured output** — Parse করার মতো লেখার বদলে model-কে একটি schema মেনে data দিতে বাধ্য করা। [Structured Output](#ch-structured-output)

**Stub** — একটি test double, যেটা আগে থেকে ঠিক করা data return করে, কীভাবে call হলো তা নিয়ে কোনো assertion ছাড়াই। [Testing Strategy](#ch-testing-strategy)

**Suspense** — একটি React boundary, যেটা কোনো child অপেক্ষায় থাকার সময় একটি fallback render করে। Streaming এই mechanism-ই ব্যবহার করে। [Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming)

## T

**Temperature** — একটি sampling parameter, যেটা output কতটা এলোমেলো হবে তা নিয়ন্ত্রণ করে। Extraction-এর জন্য শূন্যের কাছাকাছি, generation-এর জন্য বেশি। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Throttle** — একটি নির্দিষ্ট সময়ে একটি handler বড়জোর একবার চালানো। যেখানে নিয়মিত একটি sample গুরুত্বপূর্ণ, সেখানে। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Token** — যে একক ধরে model পড়ে আর bill করে: কয়েকটি character, একটি শব্দ নয়। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Tool calling** — Model একটি নাম দেওয়া function argument-সহ invoke করার একটি request return করে, আর আপনার code সেটা execute করে। [Tool Calling ও Tool Surface](#ch-tool-calling)

**Tree shaking** — Import করা কিন্তু কখনো ব্যবহার না হওয়া export সরিয়ে ফেলা। এর জন্য ES module লাগে, আর import-এর সময় কোনো side effect থাকা চলবে না। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**tRPC** — কোনো schema ছাড়াই একটি TypeScript server-এর নিজস্ব type থেকে সরাসরি একটি typed client বের করার উপায়। [GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)

## V

**Vector store** — Embedding-এর ওপর nearest-neighbour search-এর জন্য index করা একটি database। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**`verbatimModuleSyntax`** — একটি TypeScript flag, যেটা শুধু-type import-এর জন্য `import type` বাধ্যতামূলক করে, যাতে erasure source-এই স্পষ্ট থাকে। [বড় পরিসরে TypeScript](#ch-typescript-at-scale)

**Virtualisation** — একটি লম্বা list-এর শুধু দৃশ্যমান row-গুলো render করা, আর বাকিগুলো একটি spacer দিয়ে ভান করা। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Visual regression** — Render করা screenshot একটি baseline-এর সাথে তুলনা করা, এমন ব্যর্থতার জন্য যেটা কোনো assertion প্রকাশ করতে পারে না। [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)

## W

**Web Vitals** — Google-এর তিনটি user-কেন্দ্রিক metric: LCP, INP আর CLS, আসল visit-এর 75th percentile-এ বিচার করা। [Core Web Vitals](#ch-core-web-vitals)

**WebSocket** — একটি HTTP request upgrade করে তৈরি একটি স্থায়ী দুইমুখী connection। এতে আপনি যে HTTP request middleware-এর ওপর ভরসা করতেন, সেটা বাদ পড়ে যায়। [Real-Time ও Streaming API](#ch-realtime-streaming)

**Workspace protocol** — একটি dependency specifier, যেটা registry-তে নয়, একই repository-র একটি package-এ resolve হয়। [Monorepo](#ch-monorepos)

## Z

**Zero-shot prompting** — কোনো সমাধান করা উদাহরণ ছাড়া, শুধু নির্দেশনা দিয়ে কাজটা চাওয়া। [Engineering হিসেবে Prompting](#ch-prompting-as-engineering)
