---
sourceHash: "4cdadd0d62a576ef3f575fcb2b8e8330afbbb49abdc122641a7427c54ad8f46c"
title: "Part I — TypeScript"
translatedAt: "2026-10-13T12:14:19.756Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part I — TypeScript

Senior candidate আর mid-level candidate-কে আলাদা করতে TypeScript যত দ্রুত পারে, আর কোনো বিষয় তত পারে না। Mid-level-এর
উত্তর: "আমি type যোগ করি।" Senior-এর উত্তর: "আমি এমন type যোগ করি, যাতে ভুল state লেখাই না যায়, বাকিটা inference-কে
করতে দিই।" এই অংশ type system-কে দেখে design-এর একটি tool হিসেবে: কী model করবেন, কী অন্য type থেকে বের করে নেবেন,
আর কোথায় এসে চালাকি আর নিজের দাম তুলতে পারে না।

অধ্যায় 01–03 রোজকার type system: annotate করা, model করা, আবার ব্যবহার করা। অধ্যায় 04–05 narrowing আর অন্য type
থেকে বানানো type নিয়ে, আর এখান থেকেই type সত্যিকারের bug ধরতে শুরু করে। এসব React-এ প্রয়োগ করা (props, hook,
context, generic component) আছে [Chapter ?? — বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale)-এ।
সেই অধ্যায়টা বাকি React অধ্যায়গুলোর সঙ্গে Part III-এ রাখা।

## অধ্যায়গুলো

| #  | অধ্যায়                                                        | কোন প্রশ্নের উত্তর দেয়                                              |
| -- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| 01 | [TypeScript-এর Basic Type, Literal ও Enum](#ch-basic-types) | `any`, `unknown` আর `never`-এর দাম কত, আর `enum` কেন নয়? |
| 02 | [Interface ও Type Alias](#ch-interfaces-types)        | আসলে কোন দুটি জায়গায় এদের তফাত?                 |
| 03 | [TypeScript Generics](#ch-generics)                        | Caller-এর ঠিক type-টা শুরু থেকে শেষ পর্যন্ত কীভাবে ধরে রাখবেন? |
| 04 | [TypeScript Type Guard](#ch-type-guards)                  | কোনো case ভুলে গেলে কীভাবে compile error পাবেন?       |
| 05 | [TypeScript-এর Advanced ও Utility Type](#ch-advanced-types) | দুটি type আলাদা করে না রেখে একটি থেকে আরেকটি কীভাবে বানাবেন, আর কখন সেটা আর লাভ দেয় না? |
| 06 | [বড় পরিসরে TypeScript](#ch-typescript-at-scale)             | পুরনো codebase-কে কীভাবে `strict`-এ আনবেন, আর কখন type-এর দাম বেশি পড়ে যায়? |

## Interviewer-রা যা যাচাই করেন

Part-এর সাধারণ লক্ষণটাই, শুধু compile-time-এর একটু মোচড় দিয়ে। বাস্তবে সেটা দেখতে এমন:

- **Type কোথায় গিয়ে থামে, জানেন?** Runtime-এ TypeScript মুছে যায়। যে candidate একটি `as` cast দিয়ে API-র response
  "যাচাই" করে বলেন এটা type-safe, তিনি প্রশ্নের খারাপ উত্তর দিয়েছেন। পরের প্রশ্ন সবসময় আসে: "server অন্য কিছু
  পাঠালে কী হবে?"
- **ঠিকমতো narrow করতে পারেন?** Discriminated union, সঙ্গে `never` default-ওয়ালা একটি exhaustive `switch`: interviewer-রা
  এই pattern-টাই শুনতে চান। এটা ভবিষ্যতের একটি bug-কে build failure-এ বদলে দেয়।
- **ঠিক কারণে generic ব্যবহার করেন?** যে generic signature-এ মাত্র একবার আসে, সেটা সাধারণত বাড়তি ধাপসহ একটি
  `any`। যে generic একটি argument-কে return type-এর সঙ্গে জোড়ে, সে সত্যিই কাজ করছে।
- **কখন থামতে হয়, জানেন?** Conditional আর mapped type দিয়ে প্রায় সবই বোঝানো যায়। কিন্তু team-এর কেউ পড়তে পারে না,
  এমন type একটি বোঝা। দামটার নাম বলতে পারাই উত্তরের senior অংশ।

## পড়ার ক্রম

ক্রম মেনে পড়ুন, তবে রোজ TypeScript লিখলে 02-তে শুধু চোখ বুলিয়ে নিন। অধ্যায় 04-এ ধীরে পড়ুন, কারণ narrowing-ই বাকি
সবকিছুকে কাজের করে তোলে।

**Interview sprint:** 03 → 04 → 05, তারপর Part III-এর React অধ্যায়। Generic, narrowing, অন্য type থেকে বানানো type,
আর component-এ type দেওয়া: frontend-heavy interview loop-এ TypeScript-এর প্রায় সব প্রশ্ন এগুলো মিলেই ঢেকে ফেলে।
