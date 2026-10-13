---
sourceHash: "9d74fe6a061e2048e60a33019a0044cc5c40465d720ce5197354664d3b6394b5"
title: "Part I — ভিত্তি"
translatedAt: "2026-10-13T11:51:01.843Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — ভিত্তি

প্রতিটি senior interview loop এখনো এখান থেকেই শুরু হয়, তবে মাপকাঠি বদলে গেছে। এই প্রশ্নগুলোর ওপর-ওপর উত্তর এখন AI
assistant মুহূর্তে দিয়ে দেয়। Closure কী, সেটা বুঝিয়ে বললে আর নম্বর আসে না। নম্বর আসে যখন বলতে পারেন, একটি stale
closure কেন `setInterval` callback ভেঙে দিল। এই part শেখায় সংজ্ঞার নিচের স্তরটা: runtime কী করে, কোন ক্রমে করে, আর
তার দাম কী। Part III, IV আর VII সবই এর ওপর দাঁড়িয়ে, তাই এটা সবার আগে।

তিনটি section একটি আরেকটির ওপর গড়া। JavaScript হলো যন্ত্রটা: value কীভাবে রাখা হয়, নাম কোথায় খুঁজে পাওয়া যায়,
আর callback আসলে কখন চলে। TypeScript সেই যন্ত্রের বর্ণনা দেয়। এই অধ্যায়গুলো এর type system-কে শুধু annotation
হিসেবে দেখে না, দেখে এমন একটি tool হিসেবে, যেটা ভুল state লেখাই অসম্ভব করে দেয়। আর design pattern হলো চল্লিশজন
engineer একই codebase-এ কাজ করলে প্রথম দুটি যে চেহারা নেয়।

## Section

| Section                                                    | অধ্যায় | কী আছে                                                     |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [JavaScript-এর ভিত্তি](#ch-frontend-javascript-index)    | 6        | Object model, closure, `this`, promise আর error, event loop |
| [TypeScript](#ch-frontend-typescript-index)                | 6        | Type, generic, narrowing, utility type, বড় codebase-এ TypeScript |
| [OOP ও Design Pattern](#ch-backend-design-patterns-index) | 3      | OOP আর composition, SOLID, TypeScript-এ যে pattern-গুলো এখনো কাজের |

## Interviewer-রা যা যাচাই করেন

এই part-এ senior হওয়ার লক্ষণ হলো **শুধু API মুখস্থ বলা নয়, runtime নিয়ে যুক্তি দিয়ে ভাবতে পারা।** তিনটি প্রশ্ন তিনটি
section জুড়েই চলে, আর প্রতিটি section-এর সূচি নিজের কিছু প্রশ্ন যোগ করে।

- **Output কোন ক্রমে আসবে, আগে থেকে বলতে পারেন?** একটি `setTimeout`, একটি resolved promise আর একটি synchronous log।
  Language round-এ ছাঁটাইয়ের সবচেয়ে নির্ভরযোগ্য প্রশ্ন এটাই। এটা একটি জিনিসই যাচাই করে: পরের macrotask (timer বা I/O
  callback) চলার আগে microtask queue যে পুরো খালি হয়ে যায়, সেটা আপনি জানেন কি না।
- **Type কি domain-টাকে বর্ণনা করছে, নাকি শুধু সাজাচ্ছে?** `status: string` আর
  `status: "draft" | "published"` compile হয়ে একই code হয়। কিন্তু পরে যিনি file-টা খুলবেন, তাঁর কাছে দুটির মানে একেবারে
  আলাদা।
- **কোন trade-off নিয়েছেন, তার নাম বলতে পারেন?** দুটি shared method-এর জন্য inheritance, সুবিধার জন্য singleton,
  union দিয়েই চলত এমন জায়গায় enum। প্রতিটির পক্ষে যুক্তি দেওয়া যায়, কিন্তু কোনোটাই বিনা দামে আসে না।

**একই প্রশ্নে mid আর senior-এর উত্তর:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "কোনটা আগে log হবে?" | "Microtask আগে", মুখস্থ বলে দেন | প্রতিটি callback কোন queue-তে যায় তা বলেন, আর পরের timer-এর আগে microtask queue কেন পুরো খালি হয় তাও বলেন |
| "এখানে generic কেন?" | "যাতে যেকোনো type-এ চলে" | Input আর output-এর মধ্যে কোন সম্পর্ক ধরে রাখতে generic-টা আছে, সেটা বলেন |
| "Class না function?" | অভ্যাস থেকে বেছে নেন | Class এমন কী নিজের কাছে রাখে যা closure রাখত না, আর test-এর boundary-তে তার দাম কী, সেটা বলেন |

## পড়ার ক্রম

শুরু থেকে শেষ পর্যন্ত, পরপর। বাকি দুটি section JavaScript section-এর ওপর নির্ভর করে। TypeScript-এর অধ্যায়গুলো ধরে
নেয় আপনি prototype কী জানেন, আর pattern-এর অধ্যায়গুলো ধরে নেয় দুটিই জানেন।

**Interview sprint:** শুরু করুন JavaScript 02, 03, 05 আর 06 দিয়ে: closure, `this`, promise জোড়া লাগানো আর event loop।
তারপর generic আর advanced type operator-এর জন্য TypeScript 03 আর 05। শেষে SOLID-এর জন্য Design Patterns 02। Language
round-এ যা জিজ্ঞেস করে, তার বেশিরভাগ এই সাতটি অধ্যায়েই।

**দ্বিতীয়বার পড়ার সময় বাদ দিন:** Design Patterns 03-এর pattern-তালিকা আসলে reference। একবার পড়ে নিন। পরে interviewer
কোনো pattern-এর নাম নিলে সেই নাম ধরে ফিরে আসুন।

> ⚠️ **Design pattern `Backend/`-এ আছে পুরনো ইতিহাসের কারণে, বিষয়ের কারণে নয়।** এগুলো আসলে Part I-এর জিনিস:
> language-এর স্তরের design, TypeScript-এ, কোথাও কোনো server নেই। Directory হলো file-গুলো যেখানে রাখা। আর part হলো
> যেখানে এগুলোর আসল জায়গা।
