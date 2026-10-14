---
sourceHash: "1b91bb3473c5c8b7d5a0ecb8c7a0acbb18f699960f046ba3db18ad3cc2efb6ac"
title: "Part I — OOP ও Design Pattern"
translatedAt: "2026-10-14T04:32:56.190Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — OOP ও Design Pattern

Object orientation শব্দভাণ্ডারের পরীক্ষা নয়, pattern-ও নয়। Senior কাউকে encapsulation-এর সংজ্ঞা দিতে বা
Gang of Four মুখস্থ বলতে বলা হয় না। Interviewer-রা জিজ্ঞেস করেন তার নিচের প্রশ্নটা: *এই conditional শুধু বড়ই
হচ্ছে, এখন কী করব*, কিংবা *ওই hierarchy-টা কেন আর সামলানো যাচ্ছে না*। আর আপনি যে structure প্রস্তাব করছেন, তার
খরচটা নিজের মুখে বলতে পারছেন কিনা, সেটাও শুনতে চান।

পুরো অংশ জুড়ে একটা সতর্কবার্তা আছে: **TypeScript, Java নয়।** এখানে বেশ কয়েকটি classic pattern ছোট হতে হতে
একটি function, একটি module বা একটি union type-এ এসে দাঁড়ায়। Structural typing-ও (মানে type মেলানো হয় shape
দেখে, নাম দেখে নয়) polymorphism-এর খরচ বদলে দেয়। যেখানে এমনটা ঘটে, অধ্যায়গুলো সেটা সোজাসুজি বলে। এক line-এর
কাজকে class hierarchy-র পোশাক পরানো হয় না।

## অধ্যায়গুলো

| #  | অধ্যায়                                                              | কোন প্রশ্নের উত্তর দেয়                                          |
| -- | -------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) | `private` আসলে কী আটকায়, আর চতুর্থ স্তরে গিয়ে hierarchy কেন ভেঙে পড়ে? |
| 02 | [SOLID নীতি](#ch-solid-principles)                                   | পাঁচটি নীতি কোথায় কাজে আসে, আর তাদের দাম কত?                   |
| 03 | [TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript)     | Closure আর module আছে এমন ভাষায় কোন pattern-গুলো টিকে থাকে?       |

## Interviewer-রা যা যাচাই করেন

বিশেষ করে pattern-এর বেলায়: *অভ্যাসবশে structure বসিয়ে না দিয়ে, কেন বসাচ্ছেন তার যুক্তি দিতে পারেন কিনা*।

- **Pattern-এর আগে সমস্যাটার নাম বলতে পারেন?** "এখানে আমি strategy ব্যবহার করব" দুর্বল উত্তর। জোরালো উত্তর
  হলো: "নতুন payment provider যোগ করলেই এই switch-এ একটি করে branch বাড়বে, আর প্রতিটি branch একই function-এ হাত
  দেবে।" Pattern হলো উত্তরের দ্বিতীয় অর্ধেক, প্রথম নয়।
- **`private` আসলে কী করে, জানেন?** TypeScript-এর `private` compiler মুছে ফেলে, আর একটা cast দিয়ে সোজা তার
  ভেতরে ঢুকে পড়া যায়। `#field` আটকায় JavaScript runtime নিজে। যে candidate এই পার্থক্য জানেন, তিনি সাধারণত
  সত্যিকারের কোনো সমস্যা debug করেছেন।
- **TypeScript-এর নিজস্ব রূপটা জানেন?** Strategy প্রায়ই একটা `Record<Kind, Handler>`। Singleton সাধারণত একটা
  module। Observer প্রায়ই একটা `EventTarget`। ভাষায় যে ব্যবস্থা আগে থেকেই আছে, তার জন্য class hierarchy টেনে আনা
  দেখেই বোঝা যায় candidate mid-level।
- **SOLID-এর বিপক্ষে যুক্তি দিতে পারেন?** আক্ষরিক অর্থে মানলে interface segregation এক method-এর ডজনখানেক
  interface তৈরি করে, যা কেউ পড়ে না। Senior-এর উত্তর নীতিটা খাটায় সেখানে, যেখানে churn (মানে ঘন ঘন বদল) সত্যিই
  হয়। আর অন্য জায়গায় কেন খাটানো হয়নি, সেটাও বলে।

## পড়ার ক্রম

শুরু থেকে শেষ পর্যন্ত টানা। 01-এ object model আর তার সীমা, 02 সেই সীমা থেকে নিয়ম বানায়, আর 03-এ সেই
নিয়ম থেকে বারবার যে আকারগুলো তৈরি হয়। পুরো service-কে স্তরে স্তরে সাজানোর কথা আছে Part VI-এর
[Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries)-এ।

**Interview sprint:** 02 → 01। SOLID নাম ধরেই জিজ্ঞেস করা হয়, আর "এটাকে কীভাবে refactor করবেন" ধরনের বেশিরভাগ
প্রশ্নের পেছনে থাকে composition বনাম inheritance।
