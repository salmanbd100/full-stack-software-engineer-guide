---
sourceHash: "3adbc36a91c8eb97133b69915ea851692f58c0a82f9bc430b94de1b8a164738f"
title: "আরও পড়ার জন্য"
translatedAt: "2026-10-19T10:29:02.193Z"
model: "claude-opus-5-5 (Claude Code)"
---

# আরও পড়ার জন্য {#ch-further-reading}

> বইয়ের প্রতিটি অংশের পর ঠিক কোন একটি উৎসে যাবেন, আর বাকি চল্লিশটা বাদ দিয়ে কেন সেটাই, তা জেনে নিন।

**এই তালিকায়:** কীভাবে ব্যবহার করবেন · interview loop · প্রতিটি Part-এর জন্য একটি করে অংশ · পরিশিষ্ট

এই বই ইচ্ছে করেই reference বই নয়। Official documentation যেখানে শুরু, বইটা সেখানেই থামে। আর এই তালিকা হলো সেই
হাতবদলের জায়গা। নিচের প্রতিটি entry **September 2026**-এ খুলে মিলিয়ে দেখা হয়েছে।

## এই তালিকা কীভাবে ব্যবহার করবেন

তিনটি স্তর, আর ক্রমটা গুরুত্বপূর্ণ। বেশিরভাগ মানুষ ক্রমটা উল্টে ফেলেন, তারপর ভাবেন পড়া কেন মনে থাকে না।

| স্তর | এটা কী | কীভাবে ব্যবহার করবেন |
| ---- | ------ | -------------------- |
| **মূল উৎস** | Official documentation বা specification | উত্তর দরকার হলে এটাই পড়ুন। এটা নির্ভুল, আর হালনাগাদ। Candidate-রা ঠিক এটাই বাদ দেন |
| **গভীরতা** | প্রতিটি Part-এর জন্য একটি বই | Loop শুরুর আগে একবার, ধীরে পড়ুন। Docs ধরে নেয় আপনার মাথায় mental model আছে। এই বই সেটা গড়ে দেয় |
| **অনুশীলন** | প্রশ্নের bank আর mock interview | সবার শেষে, ফাঁক খুঁজে বের করতে। এটা রোগ ধরার পরীক্ষা, পাঠ্যসূচি নয় |

নিচে প্রতিটি Part-এ অল্প কয়েকটি entry আছে, পুরো গ্রন্থতালিকা নয়। চল্লিশটা link-এর তালিকা কেউ খোলে না। কোনো Part-এ
পড়ার মতো জিনিস একটিই থাকলে, সেখানে একটিই আছে।

> ⚠️ **তালিকা অধ্যায়ের চেয়ে দ্রুত পুরনো হয়।** URL সরে যায়, course বন্ধ হয়, আর "2025 edition" 2028 আসতেই লজ্জার
> হয়ে দাঁড়ায়। প্রতিটি entry-র নিচের টেকসই পরামর্শটা হলো: **আগে vendor-এর নিজের docs দেখুন**, আর অন্য কারও লেখাকে
> মেয়াদওয়ালা সারাংশ হিসেবে ধরুন। এখানকার কোনো link মরে গেলেও project-এর নামটাই আপনার search term।

## Interview Loop

সব Part জুড়ে। এগুলো কোনো একটি বিষয় নিয়ে নয়, interview নিজেই এদের বিষয়।

| উৎস | কেন এটা |
| --- | ------- |
| [GreatFrontEnd](https://www.greatfrontend.com/) | Frontend-এর জন্য সবচেয়ে শক্ত প্রশ্নের bank। [Front End Interview Playbook](https://www.greatfrontend.com/front-end-interview-playbook) বিনামূল্যে পাওয়া যায়, আর আজকের loop-এর গড়ন বোঝার জন্য একক সারাংশ হিসেবে এটাই সেরা |
| [Frontend Interview Handbook](https://www.frontendinterviewhandbook.com/) | বিনামূল্যে, open source, আর কোন round আসলে কী যাচাই করে তা নিয়ে সৎ |
| [Tech Interview Handbook](https://www.techinterviewhandbook.org/) | সাধারণ কাজের জন্য এর সহোদর। Algorithm বাদ দিলেও resume আর negotiation-এর অংশটা পড়ুন |
| [roadmap.sh — Frontend](https://roadmap.sh/frontend) | পাঠ্যসূচি নয়। Checklist হিসেবে ব্যবহার করুন, কোন জিনিস কখনো ছুঁয়েও দেখেননি তা খুঁজতে |

## Part I — ভিত্তি

ভাষার semantics আর type system। এই Part সবচেয়ে ধীরে পুরনো হয়, তাই উৎসগুলোও সবচেয়ে পুরনো।

| উৎস | কেন এটা |
| --- | ------- |
| [MDN — JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript) | আসল reference। এর "Language overview" আর closure, prototype ও event loop-এর guide-গুলোই Part I-এর মূল উৎস |
| [*You Don't Know JS Yet*](https://github.com/getify/You-Dont-Know-JS) — Kyle Simpson | Online-এ বিনামূল্যে। Scope, closure আর `this` গভীরে বোঝার বই |
| [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html) | একবার পুরোটা পড়ুন। ছোট বই, আর TypeScript নিয়ে বেশিরভাগ বিভ্রান্তি আসলে এর এমন কোনো অধ্যায়, যা কেউ পড়েনি |
| [Type Challenges](https://github.com/type-challenges/type-challenges) | Conditional আর mapped type-এর অনুশীলন। Medium set-টায় একজন senior candidate-এর স্বচ্ছন্দ থাকা উচিত |
| [TC39 proposals](https://github.com/tc39/proposals) | কী আসছে, আর কোন stage-এ আছে। Stage 2 proposal-কে আত্মবিশ্বাসের সঙ্গে ভাষার feature বলে ফেলা থেকে বাঁচার একমাত্র উপায় |
| [Refactoring Guru — Design Patterns](https://refactoring.guru/design-patterns) | Diagram আর বাস্তব প্রয়োজন দিয়ে pattern বোঝায়। Class hierarchy-র ক্যাটালগ নয় |

## Part II — Browser Platform

| উৎস | কেন এটা |
| --- | ------- |
| [MDN — CSS](https://developer.mozilla.org/en-US/docs/Web/CSS) | JavaScript reference-এর মতো একই কারণে। Layout-এর guide-গুলো যেকোনো course-এর চেয়ে ভালো |
| [web.dev](https://web.dev/) | Platform নিয়ে Google-এর লেখা। জায়গায় জায়গায় মান অসমান, তবে accessibility আর Web Vitals-এর অংশটাই মূল উৎস |
| [Baseline](https://web.dev/baseline) | "এটা কি এখন ব্যবহার করা যায়" প্রশ্নের উত্তর এক কথায়, support matrix ঘাঁটতে হয় না। খুঁটিনাটি লাগলে সঙ্গে [Can I Use](https://caniuse.com/) দেখুন |
| [WCAG 2.2](https://www.w3.org/TR/WCAG22/) | মূল normative লেখা। পাশাপাশি [Understanding](https://www.w3.org/WAI/test-evaluate/)-এর লেখাগুলো পড়ুন। শুধু success criteria দেখে কাজে লাগানো কঠিন |
| [ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/) | Keyboard-এ সত্যিই কাজ করে এমন pattern। ARIA-র প্রথম নিয়মটাও এখানেই আছে |
| [HTML Standard](https://html.spec.whatwg.org/multipage/) | Living standard, version নেই। MDN আর কোনো blog post-এর কথা না মিললে এখানে আসুন |
| [Chrome — Web Platform](https://developer.chrome.com/docs/web-platform) | শেষ কয়েকটি release-এ কী ship হলো, আর কেন |

## Part III — আধুনিক Frontend Stack

বইয়ের সবচেয়ে দ্রুত বদলানো অংশ, তাই অনুপাতটা উল্টে যায়: প্রায় সবই documentation, বই প্রায় নেই।

> ⚠️ **যা বদলাতে থাকে:** React, Next.js আর Svelte প্রতি বছর breaking change ship করে, আর অন্যদের লেখা tutorial একটি
> major version পার হতেই পুরনো হয়ে যায়। টেকসই নীতি হলো, **এখানে ভরসা করা যায় শুধু official docs-এর ওপর।** এই
> তালিকার বাকি সবকিছু মন্তব্য মাত্র।

| উৎস | কেন এটা |
| --- | ------- |
| [React docs](https://react.dev/) | নতুন করে লেখা docs সত্যিই ভালো। "Escape Hatches" আর "You Might Not Need an Effect", এই দুটি page বেশিরভাগ senior candidate পড়েননি |
| [Next.js docs](https://nextjs.org/docs) | App Router-এর caching page-গুলো পড়ুন আপনি আসলে যে version চালাচ্ছেন সেটা মিলিয়ে। এগুলো একাধিকবার বদলেছে |
| [Svelte docs](https://svelte.dev/docs/svelte/overview) আর [SvelteKit docs](https://svelte.dev/docs/kit/introduction) | Svelte 5-এ runes mental model-টাই বদলে দিয়েছে। তার আগের যেকোনো লেখা ভুল পথে নেবে |
| [Svelte tutorial](https://svelte.dev/tutorial) | Interactive tutorial-টা। এখানে এক ঘণ্টা Svelte নিয়ে এক সপ্তাহ পড়ার সমান |
| [TanStack Query](https://tanstack.com/query/latest) | যে library-ই ব্যবহার করুন, server-state caching সাধারণভাবে বোঝার সেরা ব্যাখ্যাও এই docs |
| [Vite](https://vite.dev/) | Ecosystem-এর বেশিরভাগ এখন এই build tool ধরে নেয়। "Why Vite" আর dependency pre-bundling-এর page দুটি পড়ুন |
| [GreatFrontEnd — React Interview Playbook](https://www.greatfrontend.com/react-interview-playbook) | Framework-নির্দিষ্ট interview প্রশ্ন, যেগুলো সাধারণ bank-গুলো ভালোভাবে ধরে না |
| [State of JS](https://2025.stateofjs.com/) | Adoption আর retention-এর সংখ্যা। "X কেন বেছে নিলেন" প্রশ্নের উত্তরে কাজে লাগে, আর কোন জিনিসের কথা আর শোনা যাচ্ছে না সেটা টের পেতেও |

## Part IV — বড় পরিসরে Frontend

| উৎস | কেন এটা |
| --- | ------- |
| [web.dev — Web Vitals](https://web.dev/articles/vitals) | সংজ্ঞা, threshold, আর কোন metric আসলে কীসে নড়ে |
| [Chrome UX Report](https://developer.chrome.com/docs/crux) | Lab data নয়, field data। এই দুইয়ের পার্থক্য interview-এ প্রায়ই follow-up প্রশ্ন হয়ে আসে |
| [OWASP Top Ten](https://owasp.org/www-project-top-ten/) | Security-র প্রতিটি প্রশ্ন সরাসরি বা ঘুরিয়ে এই তালিকা থেকেই আসে |
| [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) | Top Ten বলে ঝুঁকিটা কী, আর এগুলো বলে সমাধানটা কী। CSP, XSS prevention আর JWT-র sheet-গুলো নিজের জায়গা অর্জন করেছে |
| [Testing Library](https://testing-library.com/) | এর guiding principle-এর page-টাই আসল যুক্তি, শুধু API নয় |
| [Playwright](https://playwright.dev/) আর [Vitest](https://vitest.dev/) | এখনকার default জুটি। একটি test লেখার আগেই Playwright-এর locator আর auto-waiting-এর page পড়ে নিন |
| ["Write tests. Not too many. Mostly integration."](https://kentcdodds.com/blog/write-tests) — Kent C. Dodds | ছোট লেখা, আর testing trophy-র যুক্তি এখনো এর চেয়ে পরিষ্কার করে কেউ বলেনি |

## Part V — Frontend Engineer-দের জন্য Backend

| উৎস | কেন এটা |
| --- | ------- |
| [Node.js API docs](https://nodejs.org/docs/latest/api/) | সরাসরি stream, worker thread আর `async_hooks`-এর page-এ যান। একজন frontend engineer-এর Node আর backend engineer-এর Node আলাদা হয় এখানেই |
| [*Designing Data-Intensive Applications*](https://dataintensive.net/) — Martin Kleppmann | Part V আর VI দুটিরই গভীরে যাওয়ার বই। এই তালিকা থেকে একটিই বই পড়লে এটা পড়ুন |
| [Use The Index, Luke](https://use-the-index-luke.com/) | বিনামূল্যে, আর একটি query কেন ধীর, তার এর চেয়ে ভালো ব্যাখ্যা কোথাও নেই |
| [PostgreSQL docs](https://www.postgresql.org/docs/current/) | Database manual হিসেবে অস্বাভাবিক রকম ভালো লেখা। Index আর transaction isolation-এর অধ্যায়গুলো পড়ুন |
| [Redis docs](https://redis.io/docs/latest/) | Caching আর rate-limiting-এর অধ্যায়ের জন্য |
| [RFC 9110 — HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html) | Status code আর method-এর আসল সংজ্ঞা। API design নিয়ে তর্ক এগুলোর ওপরেই ঘোরে |
| [OAuth 2.1](https://oauth.net/2.1/) আর [How OpenID Connect Works](https://openid.net/developers/how-connect-works/) | Auth বুঝিয়েছেন যাঁরা এর specification লেখেন তাঁরাই, কিছু বেচতে চাওয়া কোনো identity vendor নয় |
| [Express](https://expressjs.com/) আর [NestJS](https://docs.nestjs.com/) | Part V-এর উদাহরণগুলো যে দুটি framework-এর docs ধরে নেয় |
| [GraphQL — Learn](https://graphql.org/learn/) | কোনোটাই ship না করেও GraphQL বনাম REST নিয়ে নিজের অবস্থান ধরে রাখার মতো যথেষ্ট |

## Part VI — System Design

| উৎস | কেন এটা |
| --- | ------- |
| [*System Design Interview* vols 1 and 2](https://bytebytego.com/) — Alex Xu | Backend ধাঁচের round-এর প্রস্তুতির standard বই। Volume 2 কঠিনতর, আর বেশি কাজের |
| [ByteByteGo](https://bytebytego.com/) | একই লেখকের চলমান লেখা। কোনো building block ঝালিয়ে নেওয়ার সবচেয়ে দ্রুত উপায় এর newsletter-এর diagram |
| [GreatFrontEnd — Front End System Design Playbook](https://www.greatfrontend.com/front-end-system-design-playbook) | Frontend system design round পাঁচ বছর আগে প্রায় ছিলই না, আর অন্য কোথাও এটা নিয়ে ভালো লেখা কম। এটাই এর সেরা আলোচনা |
| [The System Design Primer](https://github.com/donnemartin/system-design-primer) | বিনামূল্যে, আর সব কিছু ধরে। কখনো ব্যবহার করেননি এমন building block-এর reference হিসেবে ব্যবহার করুন, পড়ার তালিকা হিসেবে নয় |
| [*Designing Data-Intensive Applications*](https://dataintensive.net/) — Martin Kleppmann | ইচ্ছে করেই দুবার রাখা। Replication, partitioning আর consistency-ই Part VI-এর ভিত্তি |

## Part VII — AI Engineering

বইয়ের সবচেয়ে নতুন বিষয়, আর আপনি পড়তে পড়তেই এই তালিকা পুরনো হয়ে যাওয়ার সম্ভাবনা সবচেয়ে বেশি।

| উৎস | কেন এটা |
| --- | ------- |
| [DeepLearning.AI short courses](https://www.deeplearning.ai/short-courses/) | প্রতিটি এক ঘণ্টার, বিনামূল্যে, আর vendor-দের সঙ্গে মিলে বানানো। RAG, evaluation আর agent-এর course-গুলো প্রায় হুবহু Part VII-এর সঙ্গে মেলে |
| [Claude API docs](https://docs.claude.com/) আর [OpenAI platform docs](https://platform.openai.com/docs) | দুটিই পড়ুন। Interview-এ জিজ্ঞেস করা হয় সমস্যার গড়ন নিয়ে, আর দুটি API একই সমস্যা দুইভাবে সমাধান করছে দেখলেই গড়নটা বোঝা যায় |
| [AI SDK](https://ai-sdk.dev/docs/introduction) | Part VII-এর উদাহরণগুলো যে TypeScript layer ব্যবহার করে। এর streaming আর tool-calling-এর page-গুলোই কাজের মূল অংশ |
| [Model Context Protocol](https://modelcontextprotocol.io/) | Tool জোড়ার standard। এটা কী, আর কোন সমস্যা দূর করে, সেটা জানুন |
| ["Building effective agents"](https://www.anthropic.com/engineering/building-effective-agents) — Anthropic | ছোট লেখা, vendor-এর লেখা হলেও অস্বাভাবিক রকম hype-মুক্ত। কখন agent বানানো উচিত নয়, তার সবচেয়ে পরিষ্কার বক্তব্য |
| [OWASP Top 10 for LLM Applications](https://genai.owasp.org/) | Prompt injection আর তার আত্মীয়দের কৌতূহলের বিষয় হিসেবে নয়, security-র সমস্যা হিসেবে দেখে |
| [Ragas](https://docs.ragas.io/) | Retrieval আর generation-এর metric, সংজ্ঞা-সহ। Library-টা কখনো না চালালেও কাজে লাগে |
| [*AI Engineering*](https://huyenchip.com/books/) — Chip Huyen | এই Part-এর গভীরে যাওয়ার বই। যাঁরা model train করেন না, model দিয়ে জিনিস বানান, সেই engineer-দের জন্য লেখা। Part VII-এর পরিধিও ঠিক এটাই |

## Part VIII — Ship ও Operate

| উৎস | কেন এটা |
| --- | ------- |
| [*Pro Git*](https://git-scm.com/book/en/v2) | বিনামূল্যে। অধ্যায় 7 আর 10 পড়লে Git আর মুখস্থ command-এর তালিকা থাকে না, মাথায় একটি model দাঁড়িয়ে যায় |
| [Docker docs](https://docs.docker.com/) | বিশেষ করে build-cache আর multi-stage-এর page। Container নিয়ে বেশিরভাগ interview প্রশ্ন আসলে ছদ্মবেশে image-size-এর প্রশ্ন |
| [GitHub Actions docs](https://docs.github.com/en/actions) | আপনার কোম্পানি যা-ই চালাক, ধারণাগুলো শেখার জন্য সবচেয়ে ভালোভাবে documented CI system এটাই |
| [OpenTelemetry](https://opentelemetry.io/docs/) | কোনো vendor-এর সঙ্গে বাঁধা নয় এমন instrumentation। Model-টা এখানে শিখুন, তারপর যে vendor হাতে পান তাতে কাজে লাগান |
| [Google SRE books](https://sre.google/books/) | বিনামূল্যে। SLO আর alerting-এর অধ্যায়গুলো পড়ুন, Google চালানোর অংশগুলো বাদ দিন |
| [DORA](https://dora.dev/) | চারটি metric, আর এগুলো যে delivery performance-এর সঙ্গে সম্পর্কিত, সেই দাবির পেছনের গবেষণা |

## Part IX — মানুষের স্তর

| উৎস | কেন এটা |
| --- | ------- |
| [StaffEng](https://staffeng.com/) — Will Larson | এই role-এ থাকা মানুষদের বাস্তব গল্প। আর staff engineer আসলে কী করেন, তার সবচেয়ে পরিষ্কার প্রকাশিত বর্ণনা |
| *The Staff Engineer's Path* — Tanya Reilly (O'Reilly) | Senior loop-এ scope আর প্রভাব নিয়ে যে প্রশ্ন আসে, তার গভীরে যাওয়ার বই। বিনামূল্যের কোনো edition নেই, কিনুন বা ধার নিন |
| [GreatFrontEnd — Behavioral Interview Playbook](https://www.greatfrontend.com/behavioral-interview-playbook) | বিনামূল্যে, আর সাধারণ career পরামর্শ নয়, engineering-এর জন্যই লেখা |
| ["Ten Rules for Negotiating a Job Offer"](https://haseebq.com/my-ten-rules-for-negotiating-a-job-offer/) — Haseeb Qureshi | লম্বা লেখা, তবে প্রতিটি মিনিটের দাম আছে। প্রথম recruiter call-এর আগে পড়ুন, offer আসার পরে নয় |
| [levels.fyi](https://www.levels.fyi/) | Level আর location ধরে বেতনের data। এটা ছাড়া negotiate করা মানে চোখ বেঁধে negotiate করা |

## পরিশিষ্ট — DSA Pattern

| উৎস | কেন এটা |
| --- | ------- |
| [NeetCode](https://neetcode.io/practice) | বাছাই করা 150টি problem। Pattern ধরে সাজানো। পরিশিষ্টও এভাবেই সাজানো, আর দক্ষতা আসলে এভাবেই এক problem থেকে আরেক problem-এ যায় |
| [LeetCode](https://leetcode.com/) | পরিশিষ্টের প্রতিটি অধ্যায় যে problem set-এর কথা বলে। এলোমেলো problem না বেছে study plan ধরে এগোন |
| [Tech Interview Handbook — Algorithms](https://www.techinterviewhandbook.org/) | প্রতিটি data structure-এর cheatsheet, interview-এর আগের রাতের জন্য |

## এরপর কী পড়বেন

- [Chapter ?? — শব্দকোষ](#ch-glossary) — পুরো একটি লেখা খুঁজতে যাওয়ার আগে কোনো term এক লাইনে বুঝে নিন
- [Chapter ?? — লেখক পরিচিতি](#ch-about-the-author) — এগুলো কে বেছেছেন, আর কীসের ভিত্তিতে
