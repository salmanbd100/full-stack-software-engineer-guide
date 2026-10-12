---
sourceHash: "7494e23d1f021d797535cfe553f53a8c330a2b11c8949d4be9c909aa5eb46695"
title: "Part IV — বড় পরিসরে Frontend"
translatedAt: "2026-10-12T12:16:50.045Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — বড় পরিসরে Frontend

Part III হলো কীভাবে বানাবেন। Part IV হলো কীভাবে বানাবেন চল্লিশজন engineer, চার বছরের ইতিহাস, আর এমন একটি
performance budget নিয়ে, যার জন্য কাউকে জবাবদিহি করতে হয়। পার্থক্যটা কাঠিন্যে নয়। এখন প্রতিটি সিদ্ধান্তের সাথে একটি
migration path আসে, আর ভুল সিদ্ধান্তের দাম শুধু আপনি নন, পুরো একটি team দেয়।

চারটি section কী যুক্তি দেয়, সেটা এখান থেকেই ঠিক হয়। Architecture হলো এমন সীমানা নিয়ে, যেগুলো এক বছর পরেও সরাতে
পারবেন। Performance হলো budget নিয়ে, কারণ যে সংখ্যার কোনো মালিক নেই, সেটা সরে যায়। এর মধ্যে আছে **INP** (input-এ
page কত দ্রুত সাড়া দেয়)। এটা 2024-এ FID-এর জায়গা নিয়েছে, আর প্রকাশিত অনেক লেখা এখনো এটা ভুল বলে। Security হলো
browser-এর threat model, কোনো checklist নয়। Testing হলো কোন layer প্রতিটি test-এর যোগ্য, তা নিয়ে, কারণ team প্রতিটি
commit-এ, চিরকাল, suite-এর দাম দেয়।

এখানে একটি অধ্যায় আছে, যেটা ছাপা অবস্থায় প্রায় কোথাও নেই: **AI-generated code review করা**। কাজটায় এখন এই review-এর
দক্ষতা লাগে। এর মানে, generate করা এমন object literal ধরা, যেটা চুপচাপ memoisation ভেঙে দেয়, বা এমন ARIA attribute,
যার syntax valid কিন্তু অর্থ ভুল।

## Section-গুলো

| Section                                                     | অধ্যায় | কী আছে                                                      |
| ------------------------------------------------------------ | -------- | -------------------------------------------------------------------- |
| [Frontend Architecture](#ch-frontend-architecture-index)     | 4        | Pattern, micro-frontend, design system আর upgrade, AI code review |
| [Web Performance](#ch-frontend-web-performance-index)        | 4        | Core Web Vitals, loading আর budget, caching আর delivery, measurement |
| [Frontend Security](#ch-frontend-security-index)             | 2        | XSS আর untrusted input, CSP আর security header                   |
| [Frontend Testing](#ch-frontend-testing-index)               | 5        | Strategy, Vitest আর RTL, integration, Playwright, accessibility    |

## Interviewer-রা যা যাচাই করেন

এই part-এর senior signal হলো: **feature নয়, budget, সীমানা আর migration path দিয়ে ভাবেন।** চারটি section জুড়েই
তিনটি প্রশ্ন চলে। প্রতিটি section index নিজের প্রশ্নও যোগ করে।

- **সংখ্যাটা কী, আর এর মালিক কে?** "Site-টা ধীর লাগে" কোনো problem statement নয়। Search route-এ 340 ms-এর একটি
  p75 INP, যার মালিক search ship করা team — এটা একটি problem statement।
- **এই সিদ্ধান্ত থেকে কীভাবে বেরোবেন?** Micro-frontend, একটি design system, একটি state library, একটি test
  framework: প্রত্যেকটি গ্রহণ করা সহজ, ছাড়া দামি। Senior উত্তর ঢোকার পথের আগে বেরোনোর পথের নাম বলে।
- **Untrusted string-টি কোথায় যায়?** প্রশ্নটা "আপনি কি input sanitise করেন" নয়। প্রশ্ন হলো value কোথায় data থেকে
  markup, একটি URL বা একটি style-এ পার হয়। ওই সীমানাই client-side security-র পুরোটা।

**একই প্রশ্নে mid বনাম senior:**

| প্রশ্ন | Mid উত্তর | Senior উত্তর |
| ----- | ---------- | ------------- |
| "এটা কীভাবে দ্রুত করবেন?" | "Lazy-load আর memoise করব" | আগে মাপেন, কোন vital সরেছে তার নাম বলেন, আর budget এখন কত তা বলেন |
| "আপনি কি micro-frontend ব্যবহার করবেন?" | "এতে team-গুলো স্বাধীনভাবে deploy করতে পারে" | Coordination-এর খরচ, duplicate runtime, আর যে দুটো শর্তে এটা লাভজনক |
| "কতটা test করা উচিত?" | "80% coverage লক্ষ্য রাখুন" | প্রতিটি layer কোন ব্যর্থতা ধরার জন্য আছে, আর কেন সংখ্যাটা লক্ষ্য নয়, একটি ফলাফল |

## পড়ার ক্রম

আগে Architecture — এটা সীমানার সেই শব্দভান্ডার ঠিক করে, যেটা বাকি তিনটি section ব্যবহার করে। এরপর performance,
security আর testing একে অপরের ওপর নির্ভর করে না।

**Interview sprint:** Architecture 01 আর 02 · Performance 01 আর 02 · Security 01 আর 02 · Testing 01। পনেরোটি অধ্যায়ের
সাতটি, আর Testing 01-ই সেই অধ্যায়, যেটা বাকি উত্তরগুলো শুনতে কেমন লাগে তা বদলে দেয়।

**System design round-এর আগে পুরোটা পড়ুন:** performance section। Frontend system design-এর প্রশ্ন আসলে একটি diagram
জোড়া performance-এর প্রশ্ন।

> ⚠️ **Caching তিনটি part-এ আসে, আর সেটা ইচ্ছাকৃত।** Browser storage-এর mechanics Part II-তে। CDN আর cache header
> এখানে। Server-side আর database caching Part VI-তে। প্রত্যেকটি একই শব্দ নিয়ে আলাদা একটি প্রশ্নের উত্তর দেয়।
