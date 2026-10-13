---
sourceHash: "3adbc36a91c8eb97133b69915ea851692f58c0a82f9bc430b94de1b8a164738f"
title: "আরও পড়ার জন্য"
translatedAt: "2026-10-13T03:14:44.492Z"
model: "claude-opus-5-5 (Claude Code)"
---

# আরও পড়ার জন্য {#ch-further-reading}

> এই বইয়ের প্রতিটি part-এর পর ঠিক কোন একটি source-এ যাবেন, তা জানুন — আর কেন সেটাই, বাকি চল্লিশটা নয়।

**এই তালিকায়:** কীভাবে ব্যবহার করবেন · interview loop · প্রতিটি part-এর জন্য একটি section · পরিশিষ্ট

এই বই ইচ্ছা করেই reference নয়। Official documentation যেখানে শুরু হয়, বই সেখানে থামে। আর এই তালিকায় বই দায়িত্বটা
হস্তান্তর করে। নিচের প্রতিটি entry **September 2026**-এ খুলে যাচাই করা হয়েছে।

## এই তালিকা কীভাবে ব্যবহার করবেন

তিনটি স্তর, আর ক্রমটা গুরুত্বপূর্ণ। বেশিরভাগ মানুষ ক্রমটা উল্টে ফেলে। তারপর ভাবে, পড়াটা মনে থাকে না কেন।

| স্তর | এটা কী | কীভাবে ব্যবহার করবেন |
| ---- | ---------- | ------------- |
| **Primary** | Official documentation বা specification | উত্তর দরকার হলে পড়ুন। এটা সঠিক, আর এটা হালনাগাদ। Candidate-রা ঠিক এটাই বাদ দেয় |
| **Depth** | প্রতিটি part-এর জন্য একটি বই | Loop শুরুর আগে একবার, ধীরে পড়ুন। Docs ধরে নেয় আপনার একটি mental model আছে। এই বই সেটা দেয় |
| **Practice** | প্রশ্নের bank আর mock interview | সবার শেষে ব্যবহার করুন, ফাঁকগুলো খুঁজে বের করতে। এটা রোগ নির্ণয়ের পরীক্ষা, syllabus নয় |

নিচের প্রতিটি part কয়েকটি entry পায়, পুরো একটি গ্রন্থতালিকা নয়। চল্লিশটা link-এর তালিকা কেউ খোলে না। কোনো part-এ
পড়ার মতো জিনিস একটিই থাকলে, সেটা একটিই পায়।

> ⚠️ **তালিকা অধ্যায়ের চেয়ে দ্রুত পুরোনো হয়।** URL সরে যায়, course বন্ধ হয়ে যায়, আর একটি "2025 edition" 2028 নাগাদ
> লজ্জার বিষয় হয়ে দাঁড়ায়। প্রতিটি entry-র নিচে টেকসই পরামর্শটা হলো: **আগে vendor-এর নিজের docs-এ যান**, আর তৃতীয় পক্ষের
> লেখা যেকোনো কিছুকে মেয়াদওয়ালা সারাংশ হিসেবে দেখুন। এখানের কোনো link মরে গেলেও, project-এর নামটাই আপনার search term।

## Interview Loop

সব part জুড়ে। এগুলো কোনো একটি বিষয় নিয়ে নয়, interview নিজেই এদের বিষয়।

| Resource | কেন এটা |
| -------- | ------------ |
| [GreatFrontEnd](https://www.greatfrontend.com/) | Frontend-এর জন্য সবচেয়ে শক্তিশালী প্রশ্নের bank। [Front End Interview Playbook](https://www.greatfrontend.com/front-end-interview-playbook) বিনামূল্যে পাওয়া যায়। আধুনিক loop দেখতে কেমন, তার সেরা একক সারাংশ এটাই |
| [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/) | বিনামূল্যে, open source, আর প্রতিটি round আসলে কী যাচাই করে সে বিষয়ে সৎ |
| [Tech Interview Handbook](https://www.techinterviewhandbook.org/) | সাধারণ উদ্দেশ্যের সহোদর। Algorithm বাদ দিলেও এর resume আর negotiation অংশ পড়ুন |
| [roadmap.sh — Frontend](https://roadmap.sh/frontend) | Curriculum নয়। Checklist হিসেবে ব্যবহার করুন, যা কখনো ছুঁয়ে দেখেননি তা খুঁজে বের করতে |

## Part I — ভিত্তি

ভাষার semantics আর type system। এই part সবচেয়ে ধীরে পুরোনো হয়, তাই এর source-গুলোও সবচেয়ে পুরোনো।

| Resource | কেন এটা |
| -------- | ------------ |
| [MDN — JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) | আসল reference। এর "Language overview" আর closure, prototype ও event loop-এর guide-গুলো Part I-এর primary source |
| [*You Don't Know JS Yet*](https://github.com/getify/You-Dont-Know-JS) — Kyle Simpson | Online-এ বিনামূল্যে। Scope, closure আর `this`-এর depth বই |
| [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | পুরোটা একবার পড়ুন। এটা ছোট। আর TypeScript নিয়ে বেশিরভাগ বিভ্রান্তি আসলে এর এমন একটি অধ্যায়, যেটা কেউ পড়েনি |
| [Type Challenges](https://github.com/type-challenges/type-challenges) | Conditional আর mapped type-এর অনুশীলন। একজন senior candidate-এর medium set-এ স্বচ্ছন্দ থাকা উচিত |
| [TC39 proposals](https://github.com/tc39/proposals) | কী আসছে, আর কোন stage-এ। Stage 2 proposal-কে আত্মবিশ্বাসের সঙ্গে ভাষার feature বলে ফেলার বিরুদ্ধে একমাত্র রক্ষাকবচ |
| [Refactoring Guru — Design Patterns](https://refactoring.guru/design-patterns) | Diagram আর বাস্তব প্রেক্ষাপটসহ pattern, class hierarchy-র ক্যাটালগ নয় |

## Part II — Browser Platform

| Resource | কেন এটা |
| -------- | ------------ |
| [MDN — CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) | JavaScript reference-এর মতো একই কারণ। এর layout guide-গুলো যেকোনো course-এর চেয়ে ভালো |
| [web.dev](https://web.dev/) | Platform নিয়ে Google-এর লেখা। কিছু জায়গায় মান অসমান, কিন্তু accessibility আর Web Vitals-এর অংশ primary source |
| [Baseline](https://web.dev/baseline) | "এটা কি এখন ব্যবহার করা যায়"-এর উত্তর এক কথায়, support matrix ছাড়াই। খুঁটিনাটি দরকার হলে [Can I Use](https://caniuse.com/)-এর সঙ্গে মিলিয়ে দেখুন |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | মানদণ্ডের মূল লেখা। এর সঙ্গে [Understanding](https://www.w3.org/WAI/test-evaluate/) অংশটাও পড়ুন — শুধু success criteria দিয়ে প্রয়োগ করা কঠিন |
| [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | কাজ করা keyboard behaviour-সহ pattern। ARIA-র প্রথম নিয়মটাও এখানেই আছে |
| [HTML Standard](https://html.spec.whatwg.org/multipage/) | জীবন্ত, version করা নয়। MDN আর কোনো blog post একমত না হলে এখানে আসুন |
| [Chrome — Web Platform](https://developer.chrome.com/docs/web-platform) | শেষ কয়েকটি release-এ কী এসেছে, কারণসহ |

## Part III — আধুনিক Frontend Stack

বইয়ের সবচেয়ে দ্রুত বদলানো part, তাই অনুপাতটা উল্টে যায়: প্রায় সবই documentation, বই প্রায় নেই।

> ⚠️ **যা বদলাতে থাকে:** React, Next.js আর Svelte প্রতি বছর breaking change ship করে। তৃতীয় পক্ষের tutorial একটি
> major version-এর মধ্যেই পুরোনো হয়ে যায়। টেকসই নীতি হলো, **এখানে শুধু official docs-এর ওপরই ভর দেওয়া যায়।** এই
> তালিকার বাকি সব মন্তব্য মাত্র।

| Resource | কেন এটা |
| -------- | ------------ |
| [React docs](https://react.dev/) | নতুন করে লেখা docs সত্যিই ভালো। "Escape Hatches" আর "You Might Not Need an Effect" — এই দুটি page বেশিরভাগ senior candidate পড়েননি |
| [Next.js docs](https://nextjs.org/docs) | App Router-এর caching page-গুলো সেই version মিলিয়ে পড়ুন, যেটা আপনি আসলে চালাচ্ছেন। এগুলো একাধিকবার বদলেছে |
| [Svelte docs](https://svelte.dev/docs/svelte/overview) আর [SvelteKit docs](https://svelte.dev/docs/kit/introduction) | Svelte 5-এ rune mental model বদলে দিয়েছে। এর আগে লেখা যেকোনো কিছু বিভ্রান্তিকর |
| [Svelte tutorial](https://svelte.dev/tutorial) | Interactive tutorial-টি। এখানে এক ঘণ্টা, Svelte নিয়ে এক সপ্তাহ পড়ার সমান |
| [TanStack Query](https://tanstack.com/query/latest) | যে library-ই ব্যবহার করুন, এর docs সাধারণভাবে server-state caching-এর সেরা ব্যাখ্যাও |
| [Vite](https://vite.dev/) | Ecosystem-এর বেশিরভাগ এখন যে build tool ধরে নেয়। "Why Vite" আর dependency pre-bundling page-গুলো পড়ুন |
| [GreatFrontEnd — React Interview Playbook](https://www.greatfrontend.com/react-interview-playbook) | Framework-নির্দিষ্ট interview প্রশ্ন, যা সাধারণ bank-গুলো ভালোভাবে সামলায় না |
| [State of JS](https://2025.stateofjs.com/) | Adoption আর retention-এর সংখ্যা। "আপনি X কেন বেছে নিলেন" ধরনের উত্তরে কাজে লাগে। আর কোন জিনিসের কথা আর শোনা যাচ্ছে না, সেটা খেয়াল করতেও |

## Part IV — বড় পরিসরে Frontend

| Resource | কেন এটা |
| -------- | ------------ |
| [web.dev — Web Vitals](https://web.dev/articles/vitals) | সংজ্ঞা, threshold, আর কোন জিনিস আসলে প্রতিটি metric-কে নড়ায় |
| [Chrome UX Report](https://developer.chrome.com/docs/crux) | Field data, lab data নয়। দুটির পার্থক্য interview-এর একটি সাধারণ follow-up প্রশ্ন |
| [OWASP Top Ten](https://owasp.org/www-project-top-ten/) | প্রতিটি security প্রশ্ন সরাসরি বা পরোক্ষভাবে এই তালিকা থেকেই আসে |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Top Ten ঝুঁকিটা বলে, এগুলো সমাধানটা বলে। CSP, XSS prevention আর JWT sheet-গুলো নিজেদের জায়গা অর্জন করেছে |
| [Testing Library](https://testing-library.com/) | এর guiding principle page-টাই আসল যুক্তি, শুধু API নয় |
| [Playwright](https://playwright.dev/) আর [Vitest](https://vitest.dev/) | বর্তমানের default জুটি। একটি test-ও লেখার আগে Playwright-এর locator আর auto-waiting page পড়ুন |
| ["Write tests. Not too many. Mostly integration."](https://kentcdodds.com/blog/write-tests) — Kent C. Dodds | ছোট, আর testing trophy যুক্তির এখনও সবচেয়ে পরিষ্কার বক্তব্য |

## Part V — Frontend Engineer-দের জন্য Backend

| Resource | কেন এটা |
| -------- | ------------ |
| [Node.js API docs](https://nodejs.org/docs/latest/api/) | সরাসরি stream, worker thread আর `async_hooks` page-এ যান। একজন frontend engineer-এর Node আর একজন backend engineer-এর Node-এর পার্থক্য এগুলোই |
| [*Designing Data-Intensive Applications*](https://dataintensive.net/) — Martin Kleppmann | Part V আর VI দুটিরই depth বই। এই তালিকা থেকে একটি বই পড়লে, এটাই পড়ুন |
| [Use The Index, Luke](https://use-the-index-luke.com/) | বিনামূল্যে। একটি query কেন ধীর, তার সবচেয়ে ভালো ব্যাখ্যা, যেকোনো জায়গার চেয়ে |
| [PostgreSQL docs](https://www.postgresql.org/docs/current/) | Database manual হিসেবে অস্বাভাবিক রকম ভালো লেখা। Index আর transaction isolation-এর অধ্যায়গুলোই পড়ার মতো |
| [Redis docs](https://redis.io/docs/latest/) | Caching আর rate-limiting অধ্যায়ের জন্য |
| [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | Status code আর method-এর আসল সংজ্ঞা, যার ওপর API design-এর তর্কগুলো দাঁড়িয়ে থাকে |
| [OAuth 2.1](https://oauth.net/2.1/) আর [How OpenID Connect Works](https://openid.net/developers/how-connect-works/) | Auth-এর ব্যাখ্যা তাদের কাছ থেকে, যারা এর specification লেখে — কিছু বিক্রি করতে চাওয়া কোনো identity vendor-এর কাছ থেকে নয় |
| [Express](https://expressjs.com/) আর [NestJS](https://docs.nestjs.com/) | Part V-এর উদাহরণগুলো যে দুটি framework-এর docs ধরে নেয় |
| [GraphQL — Learn](https://graphql.org/learn/) | কোনোটাই ship না করেও GraphQL বনাম REST নিয়ে একটি অবস্থান নেওয়ার মতো যথেষ্ট |

## Part VI — System Design

| Resource | কেন এটা |
| -------- | ------------ |
| [*System Design Interview* vols 1 and 2](https://bytebytego.com/) — Alex Xu | Backend-ঘেঁষা round-এর প্রস্তুতির প্রচলিত বই। Volume 2 বেশি কঠিন, আর বেশি কাজের অর্ধেক |
| [ByteByteGo](https://bytebytego.com/) | একই লেখকের চলমান লেখা। একটি building block ঝালিয়ে নেওয়ার দ্রুততম উপায় এর newsletter-এর diagram |
| [GreatFrontEnd — Front End System Design Playbook](https://www.greatfrontend.com/front-end-system-design-playbook) | Frontend system design round পাঁচ বছর আগে প্রায় ছিলই না, আর অন্য জায়গায় এর ভালো আলোচনা নেই। এটাই এর সেরা আলোচনা |
| [The System Design Primer](https://github.com/donnemartin/system-design-primer) | বিনামূল্যে আর ব্যাপক। যে building block কখনো ব্যবহার করেননি, তার reference হিসেবে ব্যবহার করুন, পড়ার তালিকা হিসেবে নয় |
| [*Designing Data-Intensive Applications*](https://dataintensive.net/) — Martin Kleppmann | ইচ্ছা করেই দুবার রাখা। Replication, partitioning আর consistency-ই Part VI-এর ভিত্তি |

## Part VII — AI Engineering

বইয়ের সবচেয়ে নতুন বিষয়, আর আপনি পড়তে পড়তে যে তালিকার পুরোনো হয়ে যাওয়ার সম্ভাবনা সবচেয়ে বেশি।

| Resource | কেন এটা |
| -------- | ------------ |
| [DeepLearning.AI short courses](https://www.deeplearning.ai/short-courses/) | প্রতিটি এক ঘণ্টার, বিনামূল্যে, আর vendor-দের সঙ্গে মিলে তৈরি। RAG, evaluation আর agent course-গুলো প্রায় হুবহু Part VII-এর সঙ্গে মেলে |
| [Claude API docs](https://docs.claude.com/) আর [OpenAI platform docs](https://platform.openai.com/docs) | দুটিই পড়ুন। Interview-এ প্রশ্ন আসে সমস্যার আকার নিয়ে। দুটি API একই সমস্যা আলাদাভাবে সমাধান করছে — এটা দেখাই আকারটা শেখায় |
| [AI SDK](https://ai-sdk.dev/docs/introduction) | Part VII-এর উদাহরণগুলো যে TypeScript layer ব্যবহার করে। এর streaming আর tool-calling page-গুলোই ব্যবহারিক মূল অংশ |
| [Model Context Protocol](https://modelcontextprotocol.io/) | Tool সংযোগের standard। এটা কী, আর কোন সমস্যা দূর করে, তা জানুন |
| ["Building effective agents"](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic | ছোট। Vendor-এর লেখা, কিন্তু অস্বাভাবিক রকম hype-মুক্ত। কখন agent বানানো উচিত নয়, তার সবচেয়ে পরিষ্কার বক্তব্য |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/) | Prompt injection আর তার আত্মীয়রা, কৌতূহলের বিষয় হিসেবে নয়, security সমস্যা হিসেবে |
| [Ragas](https://docs.ragas.io/) | Retrieval আর generation metric-এর সংজ্ঞা। Library-টি কখনো না চালালেও কাজে লাগে |
| [*AI Engineering*](https://huyenchip.com/books/) — Chip Huyen | এই part-এর depth বই। যেসব engineer model train করেন না, model দিয়ে জিনিস বানান, তাদের জন্য লেখা — ঠিক Part VII-এর পরিধি |

## Part VIII — Ship ও Operate

| Resource | কেন এটা |
| -------- | ------------ |
| [*Pro Git*](https://git-scm.com/book/en/v2) | বিনামূল্যে। অধ্যায় 7 আর 10 Git-কে মুখস্থ command থেকে একটি model-এ পরিণত করে |
| [Docker docs](https://docs.docker.com/) | বিশেষ করে build-cache আর multi-stage page-গুলো। Container নিয়ে বেশিরভাগ interview প্রশ্ন আসলে ছদ্মবেশে image-size-এর প্রশ্ন |
| [GitHub Actions docs](https://docs.github.com/en/actions) | আপনার employer যা-ই চালাক, ধারণাগুলো শেখার জন্য এটাই সবচেয়ে ভালোভাবে documented CI system |
| [OpenTelemetry](https://opentelemetry.io/docs/) | Vendor-নিরপেক্ষ instrumentation। Model-টা এখানে শিখুন, তারপর যে vendor হাতে পান তাতে প্রয়োগ করুন |
| [Google SRE books](https://sre.google/books/) | বিনামূল্যে। SLO আর alerting-এর অধ্যায়গুলো পড়ুন। Google চালানোর অংশগুলো বাদ দিন |
| [DORA](https://dora.dev/) | চারটি metric, আর এরা যে delivery performance-এর সঙ্গে সম্পর্কিত — সেই দাবির পেছনের গবেষণা |

## Part IX — মানুষের স্তর

| Resource | কেন এটা |
| -------- | ------------ |
| [StaffEng](https://staffeng.com/) — Will Larson | এই role-এ থাকা মানুষদের বাস্তব গল্প। সঙ্গে staff engineer-রা আসলে কী করেন, তার সবচেয়ে পরিষ্কার প্রকাশিত বর্ণনা |
| *The Staff Engineer's Path* — Tanya Reilly (O'Reilly) | Senior loop scope আর influence নিয়ে যেসব প্রশ্ন করে, তার depth বই। বিনামূল্যের কোনো edition নেই — কিনুন বা ধার করুন |
| [GreatFrontEnd — Behavioral Interview Playbook](https://www.greatfrontend.com/behavioral-interview-playbook) | বিনামূল্যে, আর সাধারণ career পরামর্শ নয়, engineering-নির্দিষ্ট |
| ["Ten Rules for Negotiating a Job Offer"](https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/) — Haseeb Qureshi | লম্বা, আর প্রতিটি মিনিটের মূল্য আছে। Offer পাওয়ার পরে নয়, প্রথম recruiter call-এর আগে পড়ুন |
| [levels.fyi](https://www.levels.fyi/) | Level আর location অনুযায়ী compensation-এর data। এটা ছাড়া negotiate করা মানে অন্ধের মতো negotiate করা |

## পরিশিষ্ট — DSA Pattern

| Resource | কেন এটা |
| -------- | ------------ |
| [NeetCode](https://neetcode.io/practice) | বাছাই করা 150টি। Pattern অনুযায়ী সাজানো — পরিশিষ্টও এভাবেই সাজানো, আর দক্ষতা আসলে এভাবেই কাজে লাগে |
| [LeetCode](https://leetcode.com/) | পরিশিষ্টের প্রতিটি অধ্যায় যে problem set-এর উল্লেখ করে। এলোমেলোভাবে বাছার বদলে study plan ব্যবহার করুন |
| [Tech Interview Handbook — Algorithms](https://www.techinterviewhandbook.org/) | প্রতিটি data structure-এর cheatsheet, আগের রাতের জন্য |

## এরপর কী পড়বেন

- [Chapter ?? — শব্দকোষ](#ch-glossary) — পুরো একটি article খুঁজতে যাওয়ার আগে, এক লাইনে একটি term
- [Chapter ?? — লেখক পরিচিতি](#ch-about-the-author) — এগুলো কে বেছেছে, আর কীসের ভিত্তিতে
