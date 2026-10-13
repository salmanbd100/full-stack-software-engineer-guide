---
sourceHash: "9d74fe6a061e2048e60a33019a0044cc5c40465d720ce5197354664d3b6394b5"
title: "Part I — ভিত্তি"
translatedAt: "2026-10-13T12:09:38.030Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — ভিত্তি

প্রতিটি senior interview loop এখনো এখান থেকেই শুরু হয়, তবে মানদণ্ড সরে গেছে। এই প্রশ্নগুলোর ওপরের স্তরের উত্তর
এখন AI assistant মুহূর্তেই দিয়ে দেয়। Closure কী, সেটা বুঝিয়ে বললে আর নম্বর আসে না। নম্বর আসে stale closure কেন
একটি `setInterval` callback ভেঙে দিল, সেটা বোঝাতে পারলে। এই part সংজ্ঞার নিচের স্তরটা শেখায়: runtime কী করে,
কোন ক্রমে করে, আর তার দাম কত। Part III, IV আর VII সবই এর ওপর দাঁড়িয়ে, তাই এটা সবার আগে।

তিনটি অংশ একটির ওপর আরেকটি গড়ে ওঠে। JavaScript হলো যন্ত্রটা: value কীভাবে রাখা হয়, নাম কোথায় খুঁজে পাওয়া যায়,
আর callback আসলে কখন চলে। TypeScript সেই যন্ত্রটার বর্ণনা দেয়। এই অধ্যায়গুলো তার type system-কে শুধু টীকা হিসেবে
দেখে না, দেখে এমন একটি tool হিসেবে, যা অবৈধ state লেখাই অসম্ভব করে দেয়। আর চল্লিশজন engineer একই codebase-এ
কাজ করলে প্রথম দুটি যে চেহারা নেয়, সেটাই design pattern।

## অংশগুলো

| অংশ                                                    | অধ্যায় | কী আছে                                                     |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [JavaScript-এর ভিত্তি](#ch-frontend-javascript-index)    | 6        | Object model, closure, `this`, promise আর error, event loop |
| [TypeScript](#ch-frontend-typescript-index)                | 6        | Type, generic, narrowing, utility type, বড় পরিসর                   |
| [OOP ও Design Pattern](#ch-backend-design-patterns-index) | 3      | OOP আর composition, SOLID, TypeScript-এ যে pattern-গুলো টিকে থাকে |

## Interviewer-রা যা যাচাই করেন

এই part-এ senior হওয়ার লক্ষণ হলো **API আওড়ানো নয়, runtime নিয়ে যুক্তি দিয়ে ভাবতে পারা।** তিনটি প্রশ্ন তিনটি অংশ
জুড়েই চলে, আর প্রতিটি অংশের সূচিপাতা নিজের প্রশ্নও যোগ করে।

- **Output কোন ক্রমে আসবে, আগে থেকে বলতে পারেন?** একটি `setTimeout`, একটি resolved promise, আর একটি synchronous
  log। Language round-এ এটাই সবচেয়ে নির্ভরযোগ্য ছাঁকনি। এটা যাচাই করে একটি জিনিস: আপনি জানেন কি না যে পরের
  macrotask (timer বা I/O callback) চলার আগে microtask queue পুরো খালি হয়ে যায়।
- **Type কি domain-টা বর্ণনা করছে, নাকি শুধু সাজিয়ে রাখছে?** `status: string` আর
  `status: "draft" | "published"` compile হয়ে একই code হয়। কিন্তু এরপর যিনি file-টায় হাত দেবেন, তাঁর কাছে দুটির
  মানে একেবারে আলাদা।
- **যে trade-off নিয়েছেন, তার নাম বলতে পারেন?** দুটি shared method-এর জন্য inheritance, সুবিধার জন্য singleton,
  যেখানে union-ই যথেষ্ট সেখানে enum। প্রতিটির পক্ষেই যুক্তি দেওয়া যায়, কিন্তু কোনোটাই বিনা দামে আসে না।

**একই প্রশ্নে mid আর senior-এর তফাত:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "আগে কোনটা log হবে?" | মুখস্থ বলেন "microtask আগে" | প্রতিটি callback কোন queue-তে যায় তা বলেন, আর পরের timer-এর আগে microtask queue কেন পুরো খালি হয় তা বোঝান |
| "এখানে generic কেন?" | "যাতে যেকোনো type-এ চলে" | Input আর output-এর মধ্যে কোন সম্পর্কটা ধরে রাখতে generic-টা আছে, সেটা বলেন |
| "Class না function?" | অভ্যাসমতো একটা বেছে নেন | Class এমন কী নিজের কাছে রাখে যা closure রাখত না, আর test boundary-তে তার দাম কত, সেটা বলেন |

## পড়ার ক্রম

ক্রম মেনে পড়ুন। বাকি দুটি অংশ JavaScript অংশের ওপর নির্ভর করে। TypeScript-এর অধ্যায়গুলো ধরে নেয় যে prototype কী
তা আপনি জানেন, আর pattern-এর অধ্যায়গুলো ধরে নেয় দুটিই জানেন।

**Interview sprint:** শুরু করুন JavaScript 02, 03, 05 আর 06 দিয়ে: closure, `this`, promise জোড়া লাগানো, আর
event loop। তারপর generic আর advanced type operator-এর জন্য TypeScript 03 আর 05। শেষে SOLID-এর জন্য Design
Patterns 02। Language round-এ যা জিজ্ঞেস করা হয়, তার বেশিরভাগই এই সাতটি অধ্যায়ে আছে।

**দ্বিতীয়বার পড়ার সময় বাদ দিন:** Design Patterns 03-এর pattern-এর তালিকাটা reference। একবার পড়ুন, তারপর
interviewer কোনো pattern-এর নাম নিলে সেই নাম ধরে ফিরে আসুন।

> ⚠️ **Design pattern-গুলো `Backend/`-এ আছে পুরনো ইতিহাসের কারণে, বিষয়ের কারণে নয়।** এগুলো Part I-এর জিনিস:
> ভাষার স্তরের design, TypeScript-এ, কোথাও server-এর ছায়াও নেই। Directory-টা শুধু বলে file-গুলো কোথায় রাখা।
> Part বলে এগুলো আসলে কোথায় পড়ে।
