---
sourceHash: "4cdadd0d62a576ef3f575fcb2b8e8330afbbb49abdc122641a7427c54ad8f46c"
title: "Part I — TypeScript"
translatedAt: "2026-10-12T07:47:03.473Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — TypeScript

অন্য যেকোনো বিষয়ের চেয়ে TypeScript দ্রুত একজন senior candidate-কে mid-level থেকে আলাদা করে। Mid-level-এর উত্তর
হলো "আমি type যোগ করি"। Senior-এর উত্তর হলো "আমি এমন type যোগ করি, যাতে ভুল state প্রকাশ করাই অসম্ভব হয়, আর বাকিটা
inference-এর হাতে ছেড়ে দিই।" এই section type system-কে একটি design tool হিসেবে দেখে: কী model করবেন, কী derive
করবেন, আর কোথায় চালাকি আর নিজের দাম তোলে না।

অধ্যায় 01–03 হলো প্রতিদিনের type system: annotate, model, reuse। অধ্যায় 04–05-এ আছে narrowing আর derived type,
যেখান থেকে type আসল bug ধরতে শুরু করে। এর সবকিছু React-এ (props, hook, context, generic component) প্রয়োগ করা
আছে [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale)-এ। সেই অধ্যায়টি Part III-এ বাকি
React অধ্যায়গুলোর সঙ্গে রাখা আছে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                              | কোন প্রশ্নের উত্তর দেয়                                            |
| -- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [TypeScript-এর Basic Type, Literal ও Enum](#ch-basic-types)          | `any`, `unknown` আর `never`-এর খরচ কী, আর `enum` কেন নয়?          |
| 02 | [Interface ও Type Alias](#ch-interfaces-types)                      | আসলে কোন দুটি জায়গায় এদের পার্থক্য?                                 |
| 03 | [TypeScript Generics](#ch-generics)                                 | Caller-এর হুবহু type-টি শেষ পর্যন্ত কীভাবে ধরে রাখবেন?              |
| 04 | [TypeScript Type Guard](#ch-type-guards)                            | কোনো case ভুলে গেলে কীভাবে একটি compile error পাবেন?               |
| 05 | [TypeScript-এর Advanced ও Utility Type](#ch-advanced-types)          | দুটি type আলাদা করে রক্ষণাবেক্ষণ না করে কীভাবে একটি derive করবেন, আর কখন সেটা আর দাম তোলে না? |
| 06 | [বড় পরিসরে TypeScript](#ch-typescript-at-scale)                     | একটি পুরনো codebase-কে কীভাবে `strict`-এ আনবেন, আর কখন type-এর খরচ বেশি হয়ে যায়? |

## Interviewer-রা যা যাচাই করেন

Part-স্তরের সংকেতই, কিন্তু compile-time-এর একটি মোচড় সহ। বাস্তবে সেটা দেখতে এরকম:

- **Type কোথায় থামে, আপনি কি জানেন?** Runtime-এ TypeScript মুছে যায়। যে candidate একটি `as` cast দিয়ে একটি API
  response validate করে সেটাকে type-safe বলেন, তিনি প্রশ্নটার উত্তর খারাপভাবে দিয়েছেন। পরের প্রশ্ন সবসময় হয়
  "server অন্য কিছু পাঠালে কী হবে?"
- **আপনি কি ঠিকভাবে narrow করতে পারেন?** Discriminated union, সঙ্গে একটি `never` default-ওয়ালা exhaustive
  `switch` — interviewer-রা এই pattern-টাই শুনতে চান। এটা ভবিষ্যতের একটি bug-কে build failure-এ বদলে দেয়।
- **আপনি কি সঠিক কারণে generic ব্যবহার করেন?** যে generic signature-এ একবারই আসে, সেটা সাধারণত বাড়তি ধাপসহ একটি
  `any`। যে generic একটি argument-কে return type-এর সঙ্গে জোড়ে, সেটা আসল কাজ করছে।
- **কখন থামতে হবে, আপনি কি জানেন?** Conditional আর mapped type দিয়ে প্রায় সবকিছুই প্রকাশ করা যায়। কিন্তু যে
  type team-এর কেউ পড়তে পারে না, সেটা একটি বোঝা। খরচটা নাম ধরে বলাই উত্তরের senior অংশ।

## পড়ার ক্রম

শুরু থেকে শেষ পর্যন্ত পড়ুন, তবে আপনি যদি রোজ TypeScript লেখেন, তাহলে 02 চোখ বুলিয়ে নিন। অধ্যায় 04-এ ধীরে পড়ুন,
কারণ narrowing-ই বাকি সবকিছুকে কাজের করে তোলে।

**Interview sprint:** 03 → 04 → 05, তারপর Part III-এর React অধ্যায়। Generics, narrowing, derived type আর একটি
component-কে type করা — একসঙ্গে এগুলো একটি frontend-ভারী interview loop-এর প্রায় প্রতিটি TypeScript প্রশ্ন কভার
করে।
