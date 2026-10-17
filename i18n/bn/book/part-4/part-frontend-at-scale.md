---
sourceHash: "7494e23d1f021d797535cfe553f53a8c330a2b11c8949d4be9c909aa5eb46695"
title: "Part IV — বড় পরিসরে Frontend"
translatedAt: "2026-10-17T01:34:46.715Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — বড় পরিসরে Frontend

Part III শেখায় কীভাবে বানাতে হয়। Part IV শেখায় সেটাই কীভাবে বানাবেন চল্লিশজন engineer নিয়ে, চার বছরের পুরনো
code-এর ওপর, আর এমন performance budget মেনে, যার জন্য কাউকে জবাব দিতে হয়। পার্থক্যটা কঠিনতায় নয়। এখন প্রতিটি
সিদ্ধান্তের সঙ্গে একটি migration-এর পথ জুড়ে থাকে। আর ভুল সিদ্ধান্তের দাম শুধু আপনি দেন না, পুরো team দেয়।

চারটি অংশের যুক্তিও এখান থেকেই আসে। Architecture হলো এমন boundary, যা এক বছর পরেও সরানো যায়। Performance হলো
budget, কারণ যে সংখ্যার কোনো মালিক নেই, সেটা ধীরে ধীরে খারাপ হতে থাকে। এর মধ্যে আছে **INP** (input পেলে page কত
দ্রুত সাড়া দেয়)। 2024-এ INP এসেছে FID-এর জায়গায়, আর প্রকাশিত অনেক লেখা এখনো এটা ভুল বলে। Security মানে browser-এর
threat model, checklist নয়। Testing-এর প্রশ্ন হলো কোন test কোন layer-এ থাকার যোগ্য, কারণ suite-এর খরচ team প্রতিটি
commit-এ দেয়, চিরকাল।

এখানে একটি অধ্যায় আছে, যার মতো লেখা ছাপা বইয়ে প্রায় নেই: **AI-এর লেখা code review**। কাজটায় এখন এই review-এর
দক্ষতা লাগে। মানে ধরতে পারা, কোথায় generate করা object literal চুপচাপ memoisation ভেঙে দিচ্ছে, কিংবা কোন ARIA
attribute-এর syntax ঠিক, অথচ মানে ভুল।

## অংশগুলো

| অংশ | অধ্যায় | কী নিয়ে |
| --- | ------ | ------- |
| [Frontend Architecture](#ch-frontend-architecture-index) | 4 | Pattern, micro-frontend, design system আর upgrade, AI code review |
| [Web Performance](#ch-frontend-web-performance-index) | 4 | Core Web Vitals, loading আর budget, caching আর delivery, measurement |
| [Frontend Security](#ch-frontend-security-index) | 2 | XSS আর untrusted input, CSP আর security header |
| [Frontend Testing](#ch-frontend-testing-index) | 5 | Strategy, Vitest আর RTL, integration, Playwright, accessibility |

## Interviewer-রা যা যাচাই করেন

এই অংশে senior হওয়ার লক্ষণ হলো **feature নয়, budget, boundary আর migration-এর পথ নিয়ে ভাবা।** চারটি অংশ জুড়েই
তিনটি প্রশ্ন ঘুরে ফিরে আসে। প্রতিটি অংশের index নিজের প্রশ্নও যোগ করে।

- **সংখ্যাটা কত, আর এর মালিক কে?** "Site-টা ধীর লাগে" কোনো problem statement নয়। Search route-এ p75 INP 340 ms, আর
  এর মালিক search ship করা team: এটা problem statement।
- **এই সিদ্ধান্ত থেকে বের হবেন কীভাবে?** Micro-frontend, design system, state library, test framework: প্রতিটিই নেওয়া
  সহজ, ছাড়া ব্যয়বহুল। Senior উত্তর ঢোকার আগেই বের হওয়ার রাস্তা বলে দেয়।
- **Untrusted string-টা কোথায় যায়?** প্রশ্নটা "আপনি input sanitise করেন কি না" নয়। প্রশ্ন হলো value-টা কোথায় data থেকে
  markup, URL বা style-এ ঢুকে পড়ে। Client-side security বলতে পুরোটাই এই boundary।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ----------- | -------------- |
| "এটা দ্রুত করবেন কীভাবে?" | "Lazy-load আর memoise করব" | আগে measure করেন, কোন vital বদলেছে তার নাম বলেন, আর এখন budget কত তা জানান |
| "Micro-frontend ব্যবহার করবেন?" | "এতে team-গুলো আলাদা করে deploy করতে পারে" | Coordination-এর খরচ, দুবার চলা runtime, আর যে দুটি শর্তে এটা লাভজনক হয় |
| "কতটা test করা উচিত?" | "80% coverage-এর লক্ষ্য রাখুন" | প্রতিটি layer কোন failure ধরতে আছে, আর সংখ্যাটা কেন লক্ষ্য নয়, ফলাফল |

## পড়ার ক্রম

আগে Architecture। Boundary নিয়ে যে শব্দগুলো বাকি তিনটি অংশ ব্যবহার করে, সেগুলো এখানেই ঠিক হয়। এরপর Performance,
security আর testing যেকোনো ক্রমে পড়তে পারেন, একটি আরেকটির ওপর নির্ভর করে না।

**Interview sprint:** Architecture 01 আর 02 · Performance 01 আর 02 · Security 01 আর 02 · Testing 01। পনেরোটি
অধ্যায়ের মধ্যে সাতটি। আর বাকি উত্তরগুলো কেমন শোনাবে, তা বদলে দেয় Testing 01।

**System design round-এর আগে পুরোটা পড়ুন:** performance অংশটা। Frontend system design-এর প্রশ্ন আসলে performance-এর
প্রশ্ন, সঙ্গে একটি diagram।

> ⚠️ **Caching তিনটি Part-এ এসেছে, আর সেটা ইচ্ছে করেই।** Browser storage কীভাবে কাজ করে, তা Part II-তে। CDN আর
> cache header এখানে। Server-side আর database caching Part VI-এ। একই শব্দ নিয়ে প্রতিটি আলাদা প্রশ্নের উত্তর দেয়।
