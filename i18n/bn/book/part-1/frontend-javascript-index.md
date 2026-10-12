---
sourceHash: "3205eb0d3ba1d7d259fa9e04923fb66b5d571b862761b9f9587604d2926cec9b"
title: "Part I — JavaScript-এর ভিত্তি"
translatedAt: "2026-10-12T07:44:59.521Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — JavaScript-এর ভিত্তি

এই section দুই ভাগে ভাগ করা। অধ্যায় 01–04 ভাষাটির object model নিয়ে: value কীভাবে রাখা হয়, কোনো নাম কোথায়
খুঁজে পাওয়া যায়, আর `class` আসলে কী-তে compile হয়। অধ্যায় 05–06 runtime নিয়ে: async কাজ কীভাবে একসাথে জোড়া
লাগে আর কীভাবে fail করে, আর সেই loop যেটা আপনার callback-গুলোকে schedule করে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                   | কোন প্রশ্নের উত্তর দেয়                                          |
| -- | ------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 01 | [Data Type, Variable ও Built-in](#ch-data-types-variables)               | কোন value copy হয়, কোনটা share হয়, আর কোন method mutate করে?    |
| 02 | [Scope ও Closure](#ch-closures)                                          | একটি variable কোথায় থাকে, আর এই callback এখনো পুরোনো value কেন দেখছে? |
| 03 | [`this` Keyword](#ch-this-keyword)                                       | শুধু call site দেখে বলুন, `this` কী?                             |
| 04 | [Prototype ও Inheritance](#ch-prototypes-inheritance)                    | `class` ভেতরে ভেতরে আসলে কী করছে?                              |
| 05 | [Promise, Async/Await ও Error](#ch-promises-async)                       | Async কাজ কীভাবে জোড়া লাগাবেন, আর এমনভাবে fail করবেন যাতে সামলে ওঠা যায়? |
| 06 | [Event Loop](#ch-event-loop)                                             | এই code ঠিক কোন ক্রমে log করবে?                                |

## Interviewer-রা যা যাচাই করেন

Part-স্তরের সংকেতগুলোর ওপর, এই section-এ তিনটি প্রশ্নই সবচেয়ে বেশি গুরুত্ব পায়:

- **Closure কী capture করে, আপনি কি জানেন?** সংজ্ঞা নয়, তার ফলাফল। Capture করা reference কোন variable-কে
  নির্দেশ করে? কখন সেটা একটি object-কে বাঁচিয়ে রাখে? `var` দিয়ে লেখা loop-এর bug ঠিক ওই সংখ্যাটাই কেন দেয়?
- **Call site দেখে কি `this` ব্যাখ্যা করতে পারেন?** চারটি নিয়ম, অগ্রাধিকারের ক্রমে, এমন code-এ প্রয়োগ করতে হবে যা
  আপনি প্রথমবার দেখছেন। কিছু candidate মুখস্থ করেছেন "arrow function-এর `this` নেই", আর ওখানেই থেমে গেছেন।
  Method আলাদা করে বের করার প্রথম উদাহরণেই তাঁরা ধরা পড়েন।
- **Error-কে কি আপনি design-এর সিদ্ধান্ত হিসেবে দেখেন?** Code review-তে তিনটি সাধারণ ভুল ধরা পড়ে: একটি
  rejection চুপচাপ গিলে ফেলা, একটি string throw করা, আর একটি `await`-এর ওপারে stack হারিয়ে ফেলা। কোন failure
  থেকে সামলে ওঠা যায়, আর কোনটায় process crash করা উচিত — এটা জানা seniority-র একটি চিহ্ন।

## পড়ার ক্রম

শুরু থেকে শেষ পর্যন্ত। অধ্যায় 05 আর 06 একটি জোড়া, কারণ একটি promise-এর callback সেখানেই চলে, যেখানে event loop
সেটাকে রাখে। Diagram আগে দেখেছেন বলে 06 বাদ দেবেন না।

**Interview-এর জন্য দ্রুত প্রস্তুতি:** 02 → 03 → 06 → 05। Language round-এ যা জিজ্ঞেস করা হয়, তার বেশিরভাগই
closure, `this`, event loop আর promise জোড়া লাগানো নিয়ে।
