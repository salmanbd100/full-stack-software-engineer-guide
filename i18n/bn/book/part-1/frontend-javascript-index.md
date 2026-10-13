---
sourceHash: "3205eb0d3ba1d7d259fa9e04923fb66b5d571b862761b9f9587604d2926cec9b"
title: "Part I — JavaScript-এর ভিত্তি"
translatedAt: "2026-10-13T12:09:38.269Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — JavaScript-এর ভিত্তি

এই অংশ দুই ভাগে। অধ্যায় 01–04 ভাষার object model নিয়ে: value কীভাবে রাখা হয়, নাম কোথায় খুঁজে পাওয়া যায়, আর
`class` নিচে নেমে আসলে কী হয়ে যায়। অধ্যায় 05–06 runtime নিয়ে: async কাজ কীভাবে জোড়া লাগে আর কীভাবে ব্যর্থ হয়,
আর যে loop আপনার callback-গুলোর সময় ঠিক করে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                | কোন প্রশ্নের উত্তর দেয়                                              |
| -- | ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [Data Type, Variable ও Built-in](#ch-data-types-variables)        | কোন value copy হয়, কোনটা share হয়, আর কোন method মূল জিনিসটাই বদলে দেয়?    |
| 02 | [Scope ও Closure](#ch-closures)                                     | Variable কোথায় থাকে, আর এই callback এখনো পুরনো value কেন দেখছে? |
| 03 | [`this` Keyword](#ch-this-keyword)                                 | শুধু call site দেখে `this` কী, বলবেন কীভাবে?            |
| 04 | [Prototype ও Inheritance](#ch-prototypes-inheritance)               | `class` ভেতরে ভেতরে আসলে কী করছে?                   |
| 05 | [Promise, Async/Await ও Error](#ch-promises-async)                 | Async কাজ কীভাবে জোড়া লাগাবেন, আর এমনভাবে ব্যর্থ হবেন যাতে সামলে ওঠা যায়? |
| 06 | [Event Loop](#ch-event-loop)                                       | এই code ঠিক কোন ক্রমে log করবে?                      |

## Interviewer-রা যা যাচাই করেন

Part-এর সাধারণ লক্ষণের বাইরে, এই অংশে বেশিরভাগ ভার বহন করে তিনটি প্রশ্ন:

- **Closure কী ধরে রাখে, জানেন?** সংজ্ঞা নয়, তার ফল। ধরে রাখা reference কোন variable-এর দিকে দেখায়? কখন সেটা
  একটি object-কে বাঁচিয়ে রাখে? `var`-ওয়ালা loop-এর bug ঠিক ওই সংখ্যাটাই কেন দেয়?
- **শুধু call site দেখে `this` বোঝাতে পারেন?** চারটি নিয়ম, অগ্রাধিকারের ক্রমে, এমন code-এ প্রয়োগ করা যা আপনি
  প্রথমবার দেখছেন। কিছু candidate "arrow function-এর `this` নেই" মুখস্থ করে ওখানেই থেমে যান। Method আলাদা করে
  বের করে আনার প্রথম উদাহরণেই তাঁরা ধরা পড়েন।
- **Error-কে কি design-এর সিদ্ধান্ত হিসেবে দেখেন?** Code review-এ তিনটি চেনা ভুল ধরা পড়ে: rejection চুপচাপ গিলে
  ফেলা, string throw করা, আর একটি `await` পার হতে গিয়ে stack হারিয়ে ফেলা। কোন ব্যর্থতা সামলে ওঠা যায় আর কোনটায়
  process-টাই crash করা উচিত, এটা জানা senior হওয়ার একটি চিহ্ন।

## পড়ার ক্রম

ক্রম মেনে পড়ুন। অধ্যায় 05 আর 06 একটি জোড়া, কারণ promise-এর callback চলে ঠিক সেখানে, যেখানে event loop তাকে
রাখে। Diagram-টা আগে দেখেছেন বলে 06 বাদ দেবেন না।

**Interview sprint:** 02 → 03 → 06 → 05। Language round-এ যা জিজ্ঞেস করা হয়, তার বেশিরভাগই closure, `this`,
event loop আর promise জোড়া লাগানো।
