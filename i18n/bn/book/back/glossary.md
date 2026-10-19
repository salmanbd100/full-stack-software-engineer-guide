---
sourceHash: "69070ac2c60d6ff9e86a7e78862f2af2c2b4e849779749b593243a7e259bf70c"
title: "শব্দকোষ"
translatedAt: "2026-10-19T10:28:51.412Z"
model: "claude-opus-5-5 (Claude Code)"
---

# শব্দকোষ {#ch-glossary}

> কোনো term এক লাইনে দেখে নিন, তারপর যে অধ্যায়ে সেটা আসলে আলোচিত, সেখানে যান।

**এই শব্দকোষে:** যে term-গুলো না জেনেই পাঠকের এখানে পৌঁছানোর সম্ভাবনা সবচেয়ে বেশি · প্রতিটি এক বাক্যে · কোনো একটি অধ্যায় ধারণাটার মালিক হলে সেই অধ্যায়ের reference

Term-গুলো বর্ণানুক্রমে সাজানো। যেখানে অধ্যায়ের নাম দেওয়া আছে, পুরো আলোচনা সেই অধ্যায়েই। এখানকার লাইনটা
শুধু মনে করিয়ে দেয়, অধ্যায়ের বিকল্প নয়। **Part VII-এর শব্দ ইচ্ছে করেই বেশি রাখা হয়েছে**: এটা বইয়ের সবচেয়ে নতুন
বিষয়, আর বেশিরভাগ পাঠক এই Part-এ আসেন কোনো প্রস্তুতি ছাড়াই।

## A

**ABAC** — Attribute-based access control। কোনো নির্দিষ্ট role দিয়ে নয়, user, resource আর context-এর attribute দেখে permission ঠিক হয়। [OAuth, OIDC ও Authorisation](#ch-oauth)

**AbortController** — Browser-এ কাজ বাতিল করার মৌলিক উপায়। এর `signal` দেওয়া হয় `fetch` আর অন্য API-তে, যাতে request মাঝপথে বাতিল করা যায়। [Promise, Async/Await ও Error](#ch-promises-async)

**Accessibility tree** — Assistive technology যে কাঠামোটা পড়ে। DOM-এর সঙ্গে role, name আর state মিলিয়ে এটা তৈরি হয়। [Accessibility Tree](#ch-accessibility-tree)

**Agent** — এমন system, যা বাঁধা কোনো script মেনে চলে না, বরং নিজেই ঠিক করে কোন tool call করবে আর কোন ক্রমে। [Agent আসলে কী, আর কখন একাধিক Agent লাগে](#ch-what-an-agent-actually-is)

**Alerting** — Service-level objective ঝুঁকিতে পড়লে কোনো মানুষকে জানানো। Monitoring থেকে আলাদা, কারণ monitoring শুধু লিখে রাখে। [Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)

**ARIA** — Accessible Rich Internet Applications। এমন attribute, যা HTML যে অর্থ প্রকাশ করতে পারে না সেটা যোগ করে। প্রথম নিয়ম হলো, এটা ব্যবহার না করা। [ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)

**Artefact** — Build থেকে বের হওয়া একটিমাত্র output, যা কোনো বদল ছাড়াই প্রতিটি environment-এ এগিয়ে যায়। প্রতিটি stage-এ আবার build করলে আপনি এমন জিনিস test করছেন, যা ship করেননি। [CI/CD-র মূল কথা](#ch-cicd-fundamentals)

**AVIF** — Image format। দেখতে একই মানের হলেও JPEG-এর প্রায় অর্ধেক size, তবে fallback লাগে। [Caching ও Asset Delivery](#ch-asset-delivery)

## B

**Backpressure** — Consumer তাল রাখতে না পারলে producer-কে ধীর করা, সীমাহীন buffer না করে। [Node.js Performance, Stream ও Scaling](#ch-nodejs-performance)

**BFF** — Backend for frontend। Frontend team-এর নিজের পাতলা server, যা একটিমাত্র client-এর জন্য upstream data সাজিয়ে দেয়। [Route Handler ও BFF](#ch-route-handlers-and-the-bff)

**Blue-green deployment** — দুটি production environment চালিয়ে রাখা আর traffic এক থেকে আরেকটায় সরানো। ফলে rollback মানে শুধু switch বদলানো, আবার deploy করা নয়। [Deployment Strategies](#ch-deployment-strategies)

**Brotli** — Compression algorithm। Text-এ gzip-এর চেয়ে প্রায় 5% ভালো, আর বড় সব CDN-এ এটাই default। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

## C

**Cache invalidation** — Cache-এ রাখা কোনো entry কখন ভুল হয়ে গেছে, তা ঠিক করা। Caching-এর কঠিন অর্ধেক। [Caching ও Asset Delivery](#ch-asset-delivery)

**CAP theorem** — Network partition হলে distributed store হয় consistency রাখতে পারে, নয়তো availability, দুটি একসঙ্গে নয়। [Reliability, Consistency ও CAP](#ch-consistency-and-cap)

**CDN** — Edge server-এর network, যা user-এর কাছাকাছি থেকে cache করা response দেয়। [Content Delivery Networks](#ch-cdn)

**Chunk** — Bundler-এর একটি output file। Route বা dynamic import-এর মতো কোনো split point থেকে এটা তৈরি হয়। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Chunking** — Embedding করার আগে source document-কে খুঁজে পাওয়ার মতো টুকরোয় ভাগ করা। Retrieval কী খুঁজে পাবে, তা ঠিক করে chunk-এর সীমা কোথায় পড়ল। [Ingestion ও Chunking](#ch-ingestion-and-chunking)

**CLS** — Cumulative Layout Shift। চোখে পড়া content হঠাৎ কতটা সরে যায়। 0.1-এর নিচে থাকলে ভালো। [Core Web Vitals](#ch-core-web-vitals)

**Closure** — একটি function, আর যেখানে সেটা define হয়েছে সেখান থেকে ধরে রাখা variable-গুলো। [Scope ও Closure](#ch-closures)

**Code splitting** — কয়েকটি bundle বানানো, যাতে page শুধু তার দরকারি code-টুকুই load করে। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Content hash** — File-এর content-এর hash, যা file-এর নামে বসানো থাকে। এর জোরেই এক বছরের cache নিরাপদ। [Caching ও Asset Delivery](#ch-asset-delivery)

**Context engineering** — Token budget-এর ভেতরে model-এর context window-এ কী যাবে আর কোন ক্রমে, তা ঠিক করা। [Context Engineering](#ch-context-engineering)

**Context window** — একটি request-এ model সর্বোচ্চ কত token বিবেচনায় নিতে পারে, prompt আর output মিলিয়ে। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Contract testing** — Consumer কোনো API-র কাছে যা আশা করে, provider এখনো সেটাই ফেরত দিচ্ছে কি না, তা যাচাই করা। [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)

**CORS** — Cross-origin resource sharing। যে response header-গুলো থাকলে browser অন্য origin-এর response script-কে দেখতে দেয়। [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)

**Cosine similarity** — দুটি embedding vector কতটা মেলে, তার মাপ। দুটির মাঝের কোণ দিয়ে হিসাব হয়। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**CSP** — Content Security Policy। এমন header, যা ঠিক করে দেয় page কোন কোন উৎস থেকে জিনিস load বা execute করতে পারবে। [Content Security Policy ও Security Header](#ch-content-security-policy)

**CSR** — Client-side rendering। Server শুধু খোলসটা পাঠায়, আর browser page-টা বানায়। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**CSRF** — Cross-site request forgery। অন্য কোনো site user-এর browser থেকে authenticated request পাঠিয়ে দেয়। [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)

**Cursor pagination** — সবশেষে দেখা row-এর অস্বচ্ছ pointer ধরে page করা। একসঙ্গে write চললেও এতে কোনো row বাদ পড়ে না বা দুবার আসে না।

## D

**Debounce** — Event আসা থামলে তবেই handler চালানো। যেখানে শুধু শেষ value-টাই দরকার। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Declarative rollback** — বদলগুলো উল্টে না দিয়ে, আগের ভালো artefact আবার deploy করে ফিরে যাওয়া। Data migration-ই সেই অংশ, যা ফেরানো যায় না। [Deployment Strategies](#ch-deployment-strategies)

**Design system** — Token, তার সঙ্গে component library, আর এদের versioning কীভাবে চলবে সেই চুক্তি। [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)

**Design token** — নাম দেওয়া একটি design সিদ্ধান্ত, যেমন একটি রং বা spacing-এর একটি ধাপ, যা theme আর component ব্যবহার করে। [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)

**Discriminated union** — এমন কয়েকটি object type-এর union, যাদের একটি literal field একই। এতে compiler সব case ধরে narrow করতে পারে। [TypeScript Type Guard](#ch-type-guards)

**DORA metrics** — Deployment frequency, lead time for changes, change failure rate আর time to restore। [কাজের ধরন ও Engineering Culture](#ch-engineering-culture)

## E

**Edge runtime** — হালকা একটি isolate, যা অনেক region-এ Web-standard API চালায়। Filesystem নেই, raw TCP-ও নেই। [Express, Hono ও Edge Runtime](#ch-express)

**Embedding** — Text-এর vector রূপ, যার জ্যামিতিতে অর্থ ধরা থাকে। তাই একই রকম text কাছাকাছি বসে। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**ETag** — Response body-র fingerprint। এতে server কোনো payload ছাড়াই 304 দিয়ে "বদলায়নি" বলতে পারে। [Caching ও Asset Delivery](#ch-asset-delivery)

**Eval** — নির্দিষ্ট dataset-এর ওপর model-এর output-এর বারবার চালানো যায় এমন test। ফল হিসেবে একটি সংখ্যা আসে, যা এক বদল থেকে আরেক বদলে তুলনা করা যায়। [Eval, Retrieval Metric ও Error Analysis](#ch-evals)

**Eventual consistency** — সময় দিলে replica-গুলো একই value-তে পৌঁছায়, কিন্তু মাঝখানে কোনো read পুরনো value দিতে পারে। [Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore)

## F

**Fake** — কোনো dependency-র কাজ চলা কিন্তু সরল বিকল্প, যেমন memory-তে চলা store। [Testing Strategy](#ch-testing-strategy)

**Feature flag** — Runtime-এর switch, যা code deploy করা আর behaviour release করাকে আলাদা করে। [Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies)

**Few-shot prompting** — Prompt-এ কয়েকটি সমাধান করা উদাহরণ দেওয়া, যাতে model নিজেই pattern-টা ধরে ফেলে। [Engineering হিসেবে Prompting](#ch-prompting-as-engineering)

**FOIT / FOUT** — Flash of invisible text আর flash of unstyled text। Web font দেরিতে এলে যে দুইভাবে গোলমাল হয়। [Caching ও Asset Delivery](#ch-asset-delivery)

**Function calling** — **tool calling** দেখুন।

## G

**Golden set** — বাছাই করা নির্দিষ্ট কিছু input, যাদের সঠিক output জানা। Eval-এর baseline হিসেবে ব্যবহার হয়। [Eval, Retrieval Metric ও Error Analysis](#ch-evals)

**Grounding** — খুঁজে আনা source material দেওয়া, যাতে উত্তরটা কোনো কিছুর সঙ্গে মিলিয়ে দেখা যায়। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**Guardrail** — Model-এর input বা output-এর ওপর বসানো check, যা user বা tool-এর কাছে পৌঁছানোর আগেই সেটা আটকায় বা বদলে দেয়। [Guardrail ও Safety](#ch-guardrails-and-safety)

## H

**Hallucination** — আত্মবিশ্বাসী output, যার পক্ষে model-এর input-এ কোনো ভিত্তি নেই। Prompting-এর সমস্যা হওয়ার আগে এটা retrieval বা eval-এর সমস্যা। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Hydration** — Server-এ render হওয়া HTML-এ event handler আর state জুড়ে দেওয়া। Main thread-এ এর খরচ tree যত বড়, তত বেশি। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**Hybrid search** — Vector similarity আর keyword search একসঙ্গে চালানো, কারণ একটি যা মিস করে অন্যটি সেটা খুঁজে পায়। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

## I

**Idempotency** — এমন request, যা বারবার পাঠালেও প্রথমবারের পরে ফল আর বদলায় না। [REST Best Practice ও Versioning](#ch-rest-best-practices)

**Immutable (cache)** — `Cache-Control`-এর directive। Browser-কে জানায়, এই URL-এর content কখনো বদলাবে না, তাই আবার যাচাই করার দরকার নেই। [Caching ও Asset Delivery](#ch-asset-delivery)

**INP** — Interaction to Next Paint। সব interaction ধরে, একটি interaction থেকে পরের frame paint হতে কত সময় লাগে। 2024-এ FID-এর জায়গা নিয়েছে। [Core Web Vitals](#ch-core-web-vitals)

**IntersectionObserver** — Browser-এর API, যা জানায় কোনো element viewport-এর কাছে আসছে। Scroll listener-এর চেয়ে অনেক সস্তা। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Isolate** — আগে থেকেই চলা runtime-এর ভেতরে নতুন JavaScript context। Edge-এ cold start প্রায় শূন্য হওয়ার কারণ এটাই। [Express, Hono ও Edge Runtime](#ch-express)

**ISR** — Incremental static regeneration। Static page দেওয়া হয়, আর নির্দিষ্ট সময় পরপর background-এ সেটা আবার build হয়। [Next.js-এ Rendering](#ch-rendering-in-nextjs)

## J

**JWT** — JSON Web Token। Sign করা, নিজের পরিচয় নিজেই বহন করা token। Stateless, আর এ কারণেই revoke করা কঠিন। [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)

## L

**LCP** — Largest Contentful Paint। চোখে পড়া সবচেয়ে বড় element কখন render শেষ করল। 2.5 সেকেন্ডের নিচে থাকলে ভালো। [Core Web Vitals](#ch-core-web-vitals)

**LLM-as-judge** — Rubric ধরে আরেকটি model-এর output-এ নম্বর দিতে model ব্যবহার করা। মানুষের দেওয়া label-এর সঙ্গে মিলিয়ে এটা calibrate করা হয়। [Eval, Retrieval Metric ও Error Analysis](#ch-evals)

**Long task** — Main thread-এ 50 ms-এর বেশি সময়ের কাজ। Browser এটা থামাতে পারে না, তাই interaction পিছিয়ে যায়। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

## M

**MCP** — Model Context Protocol। Model client-এর কাছে tool আর data খুলে দেওয়ার standard interface। [Model Context Protocol](#ch-model-context-protocol)

**Memoisation** — কোনো হিসাব বা component render-কে তার input ধরে cache করা। নির্দিষ্ট সমস্যার সমাধান, default নয়। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Micro-frontend** — একটি application-কে আলাদা আলাদা deploy করা যায় এমন টুকরোয় ভাগ করা, যেগুলো runtime-এ জোড়া লাগে। এটা সংগঠনের সমস্যা মেটায়, technical সমস্যা নয়। [Micro-Frontend](#ch-micro-frontends)

**Middleware** — ক্রম মেনে চলা pipeline-এর একটি function। Request বদলাতে পারে, নিজেই response দিতে পারে, বা পরের ধাপে পাঠিয়ে দিতে পারে। [Express, Hono ও Edge Runtime](#ch-express)

**Monorepo** — একটি repository-তে কয়েকটি package। Task graph আর caching দিয়ে build-এর খরচ সামলে রাখা হয়। [Monorepo](#ch-monorepos)

**Mutation testing** — Code-এ ছোট ছোট বদল ঢুকিয়ে দেখা কোনো test fail করে কি না। মানুষ coverage-কে যে metric ভাবে, আসলে সেটা এটাই। [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)

## N

**N+1 query** — আগের result-এর সব row-এর জন্য একটি query না চালিয়ে প্রতিটি row-এর জন্য আলাদা query চালানো। GraphQL-এর সবচেয়ে চেনা ব্যর্থতা। [GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)

**Nullish coalescing** — `??`। শুধু `null` বা `undefined` হলে fallback নেয়, `||` এমন নয়। [Data Type, Variable ও Built-in](#ch-data-types-variables)

## O

**OAuth 2.1** — Delegation-এর framework। User password না দিয়েই একটি application-কে নিজের হয়ে কাজ করার অনুমতি দেন। [OAuth, OIDC ও Authorisation](#ch-oauth)

**OIDC** — OpenID Connect। OAuth-এর ওপর identity-র স্তর। Pipeline-এ স্থির key-র বদলে যে স্বল্পমেয়াদি token ব্যবহার করা উচিত, সেটাও এখান থেকেই আসে। [OAuth, OIDC ও Authorisation](#ch-oauth)

**Optimistic update** — Server নিশ্চিত করার আগেই UI-তে বদলটা দেখিয়ে দেওয়া, সঙ্গে ঠিক করা rollback-এর পথ। [Server State](#ch-server-state)

## P

**Partial prerendering** — Static খোলসটা সঙ্গে সঙ্গে দিয়ে দেওয়া, আর dynamic অংশগুলো পরে stream করে তার ভেতরে বসানো। [Next.js-এ Rendering](#ch-rendering-in-nextjs)

**Prefetch** — যে navigation সম্ভবত হবে, তার জন্য অলস সময়ে সবচেয়ে কম priority-তে resource আনা। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Preload** — বর্তমান page-এর দরকারি resource বেশি priority-তে আনা, কারণ parser সেটা দেরিতে খুঁজে পেত। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**Progressive enhancement** — এমনভাবে বানানো, যাতে মূল কাজটা JavaScript ছাড়াই চলে, আর JavaScript থাকলে অভিজ্ঞতা আরও ভালো হয়। [Action ও Form](#ch-react-actions-and-forms)

**Prompt injection** — Model-এর context-এ ঢোকা অবিশ্বস্ত text তার behaviour বদলে দেয়। এই ক্ষেত্রের সংজ্ঞা-নির্ধারক vulnerability। [Prompt Injection](#ch-prompt-injection)

## Q

**Query plan** — Query চালাতে database যে কৌশল বেছে নেয়। Index নিয়ে আন্দাজ করার চেয়ে plan পড়ে দেখা ভালো। [Index, Query Plan, ORM ও Migration](#ch-indexes)

**Quorum** — কোনো read বা write গণনায় আসতে কতগুলো replica-কে সাড়া দিতে হবে, সেই সংখ্যা। [Datastore বাছাই ও তার Replication](#ch-choosing-a-datastore)

## R

**RADIO** — Requirements, Architecture, Data model, Interface, Optimisations। Design round-এর কাঠামো। [Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)

**RAG** — Retrieval-augmented generation। প্রাসঙ্গিক source text খুঁজে এনে prompt-এ বসানো। [কখন RAG, কখন Fine-Tune, কখন কোনোটাই নয়](#ch-when-rag-when-fine-tune-when-neither)

**RBAC** — Role-based access control। Permission জোড়া থাকে role-এর সঙ্গে, আর role জোড়া থাকে user-এর সঙ্গে। [OAuth, OIDC ও Authorisation](#ch-oauth)

**Reranking** — খুঁজে আনা candidate-গুলো prompt-এ যাওয়ার আগে বেশি দামি কিন্তু বেশি নির্ভুল model দিয়ে নতুন করে সাজানো। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**RSC** — React Server Components। যে component server-এ render হয়, আর নিজের জন্য কোনো JavaScript পাঠায় না। [Server Component ও Client Component](#ch-server-components-vs-client-components)

**RUM** — Real user monitoring। Lab-এ চালানো test নয়, আসল visit থেকে জোগাড় করা performance data। [Production-এ মাপা](#ch-measuring-in-production)

**Runes** — Svelte 5-এর explicit reactivity-র মৌলিক উপাদান। Compiler আন্দাজ করে যে reactive statement বের করত, তার জায়গা নিয়েছে। [Runes Model, Component ও Snippet](#ch-svelte-runes)

## S

**`satisfies`** — TypeScript-এর operator। Value-টা কোনো type-এর সঙ্গে মেলে কি না যাচাই করে, কিন্তু type চওড়া করে না, তাই literal type থেকে যায়। [বড় পরিসরে TypeScript](#ch-typescript-at-scale)

**Semantic versioning** — `major.minor.patch`, যেখানে major বদল মানে breaking change। এটা প্রতিশ্রুতি, নিশ্চয়তা নয়। [Design System, Dependency ও Upgrade](#ch-design-systems-at-scale)

**Server Action** — Server-এ চলার জন্য চিহ্নিত function, যা client code থেকে local function-এর মতোই call করা যায়। [Server Actions and Mutations](#ch-server-actions)

**Service worker** — Page আর network-এর মাঝখানে বসা programmable proxy। আর এটাই সেই একমাত্র cache layer, যা server থেকে purge করা যায় না। [Service Worker, Caching ও Offline](#ch-service-workers)

**Sharding** — কোনো key ধরে একটি dataset-কে কয়েকটি স্বাধীন store-এ ভাগ করা। Join ছেড়ে দিয়ে capacity কেনা। [বড় পরিসরে Sharding ও Transaction](#ch-sharding)

**Signal** — এমন reactive value, যা নিজেই জানে কারা তার ওপর নির্ভর করে। তাই update হলে শুধু যারা value-টা পড়েছে, সেগুলোই আবার হিসাব হয়। [Client State ও Signal](#ch-client-state)

**SLO** — Service level objective। নির্দিষ্ট সময়সীমার ভেতরে কোনো indicator-এর লক্ষ্য, যেমন 99.5% crash-free session। [Production-এ মাপা](#ch-measuring-in-production)

**Source map** — Build-এর output থেকে আবার source-এ ফেরার mapping। Production-এর minify করা stack trace পড়তে এটা লাগে। [Production-এ মাপা](#ch-measuring-in-production)

**SSE** — Server-sent events। HTTP-র ওপর typed event-এর একমুখী stream, যা থেমে গেলে আবার শুরু করা যায়। [Real-Time ও Streaming API](#ch-realtime-streaming)

**SSG** — Static site generation। Build-এর সময়েই HTML-এ render করা। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**SSR** — Server-side rendering। প্রতিটি request-এ HTML-এ render করা। [Rendering Spectrum ও Hydration-এর খরচ](#ch-rendering-spectrum)

**STAR** — Situation, Task, Action, Result। Behavioural উত্তরের কাঠামো। [The STAR Framework](#ch-star-framework)

**Stale-while-revalidate** — Cache-এ থাকা value সঙ্গে সঙ্গে দিয়ে দেওয়া, আর background-এ সেটা হালনাগাদ করা। [Caching ও Asset Delivery](#ch-asset-delivery)

**Streaming** — Response-এর টুকরো যেমন তৈরি হয় তেমন পাঠানো। ফলে সবচেয়ে ধীর data আসার আগেই প্রথম byte-গুলো paint হয়ে যায়। [Streaming HTML](#ch-streaming-html)

**Structured output** — Model-কে এমনভাবে বেঁধে দেওয়া, যাতে model parse করার মতো লেখা না দিয়ে schema-র সঙ্গে মেলে এমন data দেয়। [Structured Output](#ch-structured-output)

**Stub** — Test-এর এমন বিকল্প, যা আগে থেকে ঠিক করা data ফেরত দেয়, আর কীভাবে call হলো তা নিয়ে কোনো assertion করে না। [Testing Strategy](#ch-testing-strategy)

**Suspense** — React-এর boundary। ভেতরের child কিছুর অপেক্ষায় থাকলে fallback দেখায়। Streaming এই mechanism দিয়েই চলে। [Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming)

## T

**Temperature** — Sampling-এর parameter, যা output কতটা এলোমেলো হবে তা ঠিক করে। Extraction-এর জন্য প্রায় শূন্য, generation-এর জন্য বেশি। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Throttle** — নির্দিষ্ট সময়ের মধ্যে handler সর্বোচ্চ একবার চালানো। যেখানে নিয়মিত বিরতিতে নমুনা নেওয়াটাই দরকার। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Token** — যে এককে model পড়ে আর বিল করে। একটি শব্দ নয়, কয়েকটি character। [LLM কীভাবে আচরণ করে, আর কোনটা বাছবেন](#ch-how-llms-behave)

**Tool calling** — Model নাম দেওয়া কোনো function argument-সহ চালানোর অনুরোধ ফেরত দেয়, আর আপনার code সেটা চালায়। [Tool Calling ও Tool Surface](#ch-tool-calling)

**Tree shaking** — Import করা হয়েছে কিন্তু কখনো ব্যবহার হয়নি এমন export বাদ দেওয়া। এর জন্য ES module লাগে, আর import-এর সময় কোনো side effect থাকা চলে না। [Loading, Code Splitting ও Bundle Budget](#ch-loading-and-code-splitting)

**tRPC** — TypeScript server-এর নিজের type থেকে সরাসরি typed client বানানোর উপায়, কোনো schema ছাড়াই। [GraphQL, tRPC ও Typed API বাছাই](#ch-graphql)

## V

**Vector store** — Embedding-এর ওপর nearest-neighbour search-এর জন্য index করা database। [Embedding, Vector Store ও Retrieval](#ch-retrieval)

**`verbatimModuleSyntax`** — TypeScript-এর flag। শুধু type-এর import-এ `import type` লিখতেই হয়, ফলে কোনটা মুছে যাবে তা source-এই স্পষ্ট থাকে। [বড় পরিসরে TypeScript](#ch-typescript-at-scale)

**Virtualisation** — লম্বা list-এর শুধু চোখে পড়া row-গুলো render করা, আর বাকিটা spacer দিয়ে ভান করা। [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler)

**Visual regression** — Render হওয়া screenshot-কে baseline-এর সঙ্গে মেলানো। এমন ব্যর্থতার জন্য, যা কোনো assertion দিয়ে প্রকাশ করা যায় না। [Playwright দিয়ে End-to-End, Visual ও Contract Testing](#ch-end-to-end-testing)

## W

**Web Vitals** — User-কেন্দ্রিক Google-এর তিনটি metric: LCP, INP আর CLS। আসল visit-এর 75th percentile ধরে বিচার হয়। [Core Web Vitals](#ch-core-web-vitals)

**WebSocket** — HTTP request upgrade করে তৈরি স্থায়ী, দুইমুখী connection। এতে আপনার ভরসার HTTP request middleware আর কাজে আসে না। [Real-Time ও Streaming API](#ch-realtime-streaming)

**Workspace protocol** — Dependency-র এমন specifier, যা registry-তে না গিয়ে একই repository-র একটি package-এ পৌঁছায়। [Monorepo](#ch-monorepos)

## Z

**Zero-shot prompting** — কোনো সমাধান করা উদাহরণ না দিয়ে, শুধু নির্দেশ দিয়ে কাজটা চাওয়া। [Engineering হিসেবে Prompting](#ch-prompting-as-engineering)
