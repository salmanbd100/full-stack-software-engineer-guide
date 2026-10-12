---
sourceHash: "1b91bb3473c5c8b7d5a0ecb8c7a0acbb18f699960f046ba3db18ad3cc2efb6ac"
title: "Part I — OOP ও Design Pattern"
translatedAt: "2026-10-12T07:45:11.197Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — OOP ও Design Pattern

Object orientation কোনো শব্দভান্ডারের পরীক্ষা নয়, pattern-ও নয়। কোনো senior-কে encapsulation-এর সংজ্ঞা দিতে বা
Gang of Four মুখস্থ বলতে বলা হয় না। Interviewer-রা এর নিচের প্রশ্নটা করেন: *এই conditional-টা শুধু বাড়ছেই, এখন কী
করব*, অথবা *ওই hierarchy-টা কেন আর maintain করা যাচ্ছে না*। আপনি যে structure প্রস্তাব করছেন, তার খরচটা আপনি
বলতে পারেন কি না, সেটাও তাঁরা শুনতে চান।

পুরো section জুড়ে একটা সতর্কবার্তা আছে: **TypeScript, Java নয়।** এখানে বেশ কিছু classic pattern ছোট হয়ে একটা
function, একটা module বা একটা union type-এ পরিণত হয়। Structural typing (type মেলানো হয় আকার দেখে, নাম দেখে নয়)
polymorphism-এর খরচও বদলে দেয়। যেখানে এটা সত্যি, অধ্যায়টি সেটা স্পষ্ট বলে। এক লাইনের কোডকে class hierarchy-র
পোশাক পরায় না।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                    | কোন প্রশ্নের উত্তর দেয়                                          |
| -- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [OOP ও Inheritance-এর বদলে Composition](#ch-composition-over-inheritance) | `private` আসলে কী নিশ্চিত করে, আর চতুর্থ স্তরে গিয়ে hierarchy কেন ভেঙে পড়ে? |
| 02 | [SOLID নীতি](#ch-solid-principles)                                         | পাঁচটি নীতি কোথায় কাজে লাগে, আর তার খরচ কী?                     |
| 03 | [TypeScript-এ Design Pattern](#ch-design-patterns-in-typescript)          | যে ভাষায় closure আর module আছে, সেখানে কোন pattern-গুলো টিকে থাকে? |

## Interviewer-রা যা যাচাই করেন

বিশেষ করে pattern-এর ক্ষেত্রে: *অভ্যাসবশে একটা structure বসিয়ে না দিয়ে, সেটার পক্ষে যুক্তি দিতে পারেন কি না*।

- **Pattern-এর আগে সমস্যাটার নাম বলতে পারেন?** "এখানে আমি একটা strategy ব্যবহার করব" — এটা দুর্বল উত্তর। এর
  চেয়ে ভালো: "প্রতিবার নতুন payment provider যোগ করলে এই switch-এ একটা করে branch বাড়বে, আর প্রতিটা branch একই
  function-এ হাত দেয়।" Pattern হলো উত্তরের দ্বিতীয় অর্ধেক, প্রথম অর্ধেক নয়।
- **`private` আসলে কী করে, জানেন?** Compiler TypeScript-এর `private` মুছে ফেলে, আর একটা cast সোজা এর ভেতরে
  পৌঁছে যায়। `#field` নিশ্চিত করে JavaScript runtime। যে candidate-রা পার্থক্যটা জানেন, তাঁরা সাধারণত বাস্তব
  কিছু debug করেছেন।
- **TypeScript-এর নিজস্ব রূপটা জানেন?** একটা strategy প্রায়ই একটা `Record<Kind, Handler>`। একটা singleton
  সাধারণত একটা module। একটা observer প্রায়ই একটা `EventTarget`। ভাষায় mechanism আগে থেকেই থাকলেও class hierarchy-র
  দিকে হাত বাড়ানো — এটা mid-level-এর লক্ষণ।
- **SOLID-এর বিপক্ষে যুক্তি দিতে পারেন?** আক্ষরিকভাবে প্রয়োগ করলে interface segregation এক ডজন এক-method-এর
  interface তৈরি করে, যেগুলো কেউ পড়ে না। Senior উত্তর নীতিটা সেখানেই প্রয়োগ করে, যেখানে churn (ঘন ঘন পরিবর্তন)
  সত্যিই ঘটে। অন্য জায়গায় নীতিটা কেন বাদ দেওয়া হলো, সেটাও বলে।

## পড়ার ক্রম

শুরু থেকে শেষ পর্যন্ত। 01 হলো object model আর তার সীমা। 02 সেই সীমাগুলোকে নিয়মে পরিণত করে। আর 03 হলো সেই
নিয়মগুলো থেকে বারবার যে আকারগুলো তৈরি হয়। পুরো একটা service-কে layer-এ ভাগ করার বিষয়টা আছে Part VI-এর
[Chapter ?? — Service Boundary ও API Gateway](#ch-service-boundaries)-এ।

**Interview sprint:** 02 → 01। SOLID নাম ধরেই জিজ্ঞেস করা হয়। আর "এটা কীভাবে refactor করবেন" ধরনের বেশিরভাগ
প্রশ্নের পেছনে আসল প্রশ্ন হলো composition বনাম inheritance।
