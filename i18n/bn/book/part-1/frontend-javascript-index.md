---
sourceHash: "3205eb0d3ba1d7d259fa9e04923fb66b5d571b862761b9f9587604d2926cec9b"
title: "Part I — JavaScript-এর ভিত্তি"
translatedAt: "2026-10-13T11:51:02.070Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — JavaScript-এর ভিত্তি

এই section দুই ভাগে ভাগ করা। অধ্যায় 01–04 language-এর object model নিয়ে: value কীভাবে রাখা হয়, নাম কোথায় খুঁজে পাওয়া
যায়, আর `class` compile হয়ে আসলে কী হয়। অধ্যায় 05–06 runtime নিয়ে: async কাজ কীভাবে জোড়া লাগে আর কীভাবে fail করে,
আর যে loop আপনার callback-গুলোর সময় ঠিক করে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                | কোন প্রশ্নের উত্তর দেয়                                              |
| -- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Data Type, Variable ও Built-in](#ch-data-types-variables)        | কোন value copy হয়, কোনটা share হয়, আর কোন method মূল জিনিসটাই বদলে দেয়? |
| 02 | [Scope ও Closure](#ch-closures)                                     | Variable কোথায় থাকে, আর এই callback এখনো পুরনো value কেন দেখছে? |
| 03 | [`this` Keyword](#ch-this-keyword)                                 | শুধু call site দেখে `this` কী, সেটা কীভাবে বলবেন?            |
| 04 | [Prototype ও Inheritance](#ch-prototypes-inheritance)               | `class` ভেতরে ভেতরে আসলে কী করছে?                   |
| 05 | [Promise, Async/Await ও Error](#ch-promises-async)                 | Async কাজ কীভাবে জোড়া লাগাবেন, আর এমনভাবে fail করাবেন যাতে সামলে ওঠা যায়? |
| 06 | [Event Loop](#ch-event-loop)                                       | এই code ঠিক কোন ক্রমে log করবে?                      |

## Interviewer-রা যা যাচাই করেন

Part-এর সাধারণ লক্ষণের বাইরে, এই section-এ বেশিরভাগ ভার তিনটি প্রশ্নের ওপর:

- **Closure আসলে কী ধরে রাখে, জানেন?** সংজ্ঞা নয়, তার ফল। ধরে রাখা reference কোন variable-এর দিকে দেখায়? কখন সেটা
  একটি object-কে memory-তে আটকে রাখে? `var`-ওয়ালা loop-এর bug ঠিক ওই সংখ্যাটাই কেন দেয়?
- **শুধু call site দেখে `this` বুঝিয়ে বলতে পারেন?** চারটি নিয়ম, অগ্রাধিকারের ক্রমে, এমন code-এ খাটাতে হবে যা আপনি প্রথমবার
  দেখছেন। কিছু candidate "arrow function-এর `this` থাকে না" মুখস্থ করে ওখানেই থেমে গেছেন। Method আলাদা করে বের করে
  আনার প্রথম উদাহরণেই তাঁরা ধরা পড়েন।
- **Error-কে কি design-এর সিদ্ধান্ত হিসেবে দেখেন?** Code review-এ তিনটি চেনা ভুল ধরা পড়ে: rejection চুপচাপ গিলে ফেলা,
  string throw করা, আর `await`-এর ওপারে গিয়ে stack হারিয়ে ফেলা। কোন failure থেকে সামলে ওঠা যায় আর কোনটায় process
  crash করাই উচিত, সেটা জানা seniority-র একটি চিহ্ন।

## পড়ার ক্রম

শুরু থেকে পরপর। অধ্যায় 05 আর 06 একটি জোড়া, কারণ promise-এর callback চলে সেখানেই, যেখানে event loop সেটাকে বসায়। Diagram
আগে দেখেছেন বলে 06 বাদ দেবেন না।

**Interview sprint:** 02 → 03 → 06 → 05। Language round-এ যা জিজ্ঞেস করে, তার বেশিরভাগই closure, `this`, event loop আর
promise জোড়া লাগানো।
