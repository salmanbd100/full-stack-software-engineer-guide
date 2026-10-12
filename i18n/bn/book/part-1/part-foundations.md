---
sourceHash: "9d74fe6a061e2048e60a33019a0044cc5c40465d720ce5197354664d3b6394b5"
title: "Part I — ভিত্তি"
translatedAt: "2026-10-12T07:46:55.788Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — ভিত্তি

প্রতিটি সিনিয়র interview loop এখনো এখান থেকেই শুরু হয়, কিন্তু মানদণ্ড সরে গেছে। একটা AI assistant এখন এই
প্রশ্নগুলোর ওপরের স্তরের উত্তর সঙ্গে সঙ্গে দিয়ে দেয়। Closure কী, তা ব্যাখ্যা করে এখন আর নম্বর মেলে না। একটা
stale closure কেন একটা `setInterval` callback ভেঙে দিল, তা ব্যাখ্যা করলে মেলে। এই part সংজ্ঞার নিচের স্তরটা শেখায়:
runtime কী করে, কোন ক্রমে করে, আর তার দাম কী। এটা প্রথমে আসে, কারণ Part III, IV আর VII — তিনটিই এর ওপর নির্ভর
করে।

তিনটি section একটার ওপর আরেকটা দাঁড়িয়ে আছে। JavaScript হলো যন্ত্রটা: সে value কীভাবে রাখে, নামগুলো কোথায়
resolve হয়, আর একটা callback আসলে কখন চলে। TypeScript সেই যন্ত্রের বর্ণনা দেয়। এই অধ্যায়গুলো তার type system-কে
annotation হিসেবে দেখে না। দেখে এমন একটা tool হিসেবে, যা অবৈধ state লেখাই অসম্ভব করে দেয়। Design pattern হলো
চল্লিশজন engineer একই codebase-এ কাজ করলে প্রথম দুটো যেমন দেখায়, তা-ই।

## Section-গুলো

| Section                                                    | অধ্যায় | কী কভার করে                                                      |
| ---------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| [JavaScript-এর ভিত্তি](#ch-frontend-javascript-index)        | 6        | Object model, closure, `this`, promise আর error, event loop |
| [TypeScript](#ch-frontend-typescript-index)                | 6        | Type, generic, narrowing, utility type, বড় পরিসর                   |
| [OOP ও Design Pattern](#ch-backend-design-patterns-index)  | 3        | OOP আর composition, SOLID, TypeScript-এ যে pattern-গুলো টিকে থাকে |

## Interviewer-রা যা যাচাই করেন

এই part-এর সিনিয়র সংকেত হলো **শুধু API মুখস্থ বলা নয়, runtime নিয়ে যুক্তি দিতে পারা।** তিনটি প্রশ্ন তিনটি
section জুড়েই চলে, আর প্রতিটি section-এর index নিজের প্রশ্ন যোগ করে।

- **Output-এর ক্রম আগে থেকে বলতে পারেন?** একটা `setTimeout`, একটা resolved promise আর একটা synchronous log।
  ভাষার round-এ এটাই সবচেয়ে নির্ভরযোগ্য ছাঁকনি। এটা একটা জিনিসই যাচাই করে: আপনি জানেন কি না যে পরের macrotask
  (একটা timer বা I/O callback) চলার আগে microtask queue পুরোপুরি খালি হয়ে যায়।
- **Type কি domain-কে বর্ণনা করে, নাকি শুধু সাজায়?** `status: string` আর
  `status: "draft" | "published"` একই code-এ compile হয়। কিন্তু পরের যে মানুষ file-টা ছোঁবেন, তাঁর কাছে এদের মানে
  একেবারে আলাদা।
- **যে trade-off নিয়েছেন, তার নাম বলতে পারেন?** দুটো shared method-এর জন্য inheritance, সুবিধার জন্য একটা
  singleton, যেখানে একটা union-ই যথেষ্ট সেখানে একটা enum। প্রতিটির পক্ষে যুক্তি দেওয়া যায়; কোনোটাই বিনামূল্যে নয়।

**একই প্রশ্নে mid আর সিনিয়র:**

| প্রশ্ন | Mid উত্তর | সিনিয়র উত্তর |
| ----- | ---------- | ------------- |
| "কোনটা আগে log হয়?" | "আগে microtask" মুখস্থ বলেন | প্রতিটি callback কোন queue-তে গিয়ে পড়ে তার নাম বলেন, আর পরের timer-এর আগে microtask queue কেন পুরোপুরি খালি হয়, তা বলেন |
| "এখানে generic কেন?" | "যাতে যেকোনো type-এর সঙ্গে কাজ করে" | Input আর output-এর মধ্যে কোন সম্পর্কটা রক্ষা করার জন্য generic-টা আছে, তা বলেন |
| "Class নাকি function?" | অভ্যাস থেকে বেছে নেন | Class এমন কী নিজের কাছে রাখে যা একটা closure রাখত না, আর test boundary-তে তার দাম কী, তা বলেন |

## পড়ার ক্রম

সরাসরি, ক্রম অনুযায়ী। বাকি দুটো section JavaScript section-এর ওপর নির্ভর করে। TypeScript-এর অধ্যায়গুলো ধরে
নেয় যে আপনি prototype কী তা জানেন, আর pattern-এর অধ্যায়গুলো দুটোই ধরে নেয়।

**Interview sprint:** শুরু করুন JavaScript 02, 03, 05 আর 06 দিয়ে: closure, `this`, promise composition আর event
loop। তারপর generic আর advanced type operator-এর জন্য TypeScript 03 আর 05 পড়ুন। শেষ করুন SOLID-এর জন্য Design
Patterns 02 দিয়ে। ভাষার round-এ যা জিজ্ঞেস করা হয়, তার বেশিরভাগই এই সাতটা অধ্যায়ে আছে।

**দ্বিতীয়বার পড়ার সময় বাদ দিন:** Design Patterns 03-এর pattern catalogue একটা reference। একবার পড়ুন, তারপর কোনো
interviewer একটার নাম বললে নাম ধরে ফিরে আসুন।

> ⚠️ **Design pattern-গুলো `Backend/`-এ আছে ঐতিহাসিক কারণে, ধারণাগত কারণে নয়।** এগুলো Part I-এর বিষয়: ভাষার
> স্তরের design, TypeScript-এ, কোথাও কোনো server নেই। Directory হলো file-গুলো যেখানে থাকে। Part হলো যেখানে
> এগুলোর আসল জায়গা।
