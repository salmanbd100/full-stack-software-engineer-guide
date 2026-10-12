---
sourceHash: "9854400dfefa6490d8f4a4507b51c4130676e1c1281fa51f71a4f4a58600a9f5"
title: "React"
translatedAt: "2026-10-12T07:52:10.340Z"
model: "claude-opus-5-5 (Claude Code)"
---

# React

নয়টি অধ্যায়, তিনটি দলে। অধ্যায় 01–04 হলো model: state বদলালে React কী করে, আর কেন বেশিরভাগ hook bug আসলে
closure bug। অধ্যায় 05–07 concurrent যুগ নিয়ে: Server Component, Suspense আর Action। 2026–27-এর senior interview
এখানেই। অধ্যায় 08–09-এ আছে feature কাজ করার পর production-এ যা লাগে: React Compiler-এর অধীনে performance, আর বড়
পরিসরে type। React component testing আছে Part IV-এ, বাকি testing-এর সাথে।

এই section **React 19** ধরে লেখা। কিছু নিয়ম React 19-এর চেয়ে পুরনো, আর এর পরেও টিকে থাকবে:
key পরিচয় দেয়, effect synchronise করে, props নিচের দিকে যায়। অধ্যায়ে এমন কোনো নিয়ম এলে সেটা বলা আছে, কারণ কোনো
framework-এর পরিবর্তন এগুলো কেড়ে নিতে পারে না।

## অধ্যায়গুলো

| #  | অধ্যায়                                | কোন প্রশ্নের উত্তর দেয়                                                    |
| -- | -------------------------------------- | ------------------------------------------------------------------ |
| 01 | [React-এর Mental Model](#ch-react-mental-model) | `setState` আর screen-এর মাঝখানে কী ঘটে, আর key কেন গুরুত্বপূর্ণ |
| 02 | [Hook-এর গভীরে](#ch-react-hooks-in-depth) | নিয়মগুলো কেন আছে, আর একটি stale closure আসলে কী capture করে       |
| 03 | [`useEffect`, আর কখন এটা ব্যবহার করবেন না](#ch-when-not-to-use-effect) | এই effect-গুলোর কোনগুলো derived state হওয়া উচিত ছিল? |
| 04 | [Component Composition Pattern](#ch-react-composition-patterns) | নিয়ন্ত্রণ না ছেড়ে কীভাবে একটি API দিয়ে দেবেন? |
| 05 | [Server Component ও Client Component](#ch-server-components-vs-client-components) | Boundary কোথায়, আর কী সেটা পার হতে পারে? |
| 06 | [Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) | অর্ধেক page কীভাবে আসে, আর একটি subtree throw করলে user কী দেখে? |
| 07 | [Action ও Form](#ch-react-actions-and-forms) | Client-side fetch handler ছাড়া একটি mutation কীভাবে কাজ করে?      |
| 08 | [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) | কম কাজ করা, নাকি কাজটা schedule করা — এই slowdown-এর কোনটা দরকার? |
| 09 | [বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) | `any` ছাড়া props, ref, context আর state-এর type কীভাবে দেবেন? |

`Frontend/TypeScript`-এর React অধ্যায় এখন অধ্যায় 09-এ থাকে। এটা copy না হয়ে এখানে সরে এসেছে। এর সাথে যোগ হয়েছে
সেই অংশগুলো, যেগুলো শুধু বড় পরিসরে গুরুত্ব পায়: async state-এর জন্য union, generic component, আর server/client
boundary যে typing-এর নিয়ম ঠিক করে দেয়।

## Interviewer-রা যা যাচাই করেন

Part III-এর opener-এর part-level signal-গুলোর ওপর, React-এর নিজস্ব দুটি প্রশ্ন:

- **"এই component কেন re-render হচ্ছে?"** দুর্বল উত্তর `memo`-র দিকে হাত বাড়ায়। শক্ত উত্তর বলে কোন
  state বদলেছে আর কোন prop-এর identity ভেঙেছে। React Compiler-এর যুগে এটা এটাও জিজ্ঞেস করে যে memoisation আদৌ
  developer-এর কাজ ছিল কি না। এই একটি প্রশ্নই আলাদা করে দেয় কে একটি React application profile করেছেন, আর কে শুধু
  profiling নিয়ে পড়েছেন।
- **"ওই function-টি একটি Client Component-এ পাঠাতে পারবেন না কেন?"** যে props server/client
  boundary পার হয়, সেগুলো RSC payload-এ serialise হয়, আর একটি function-এর কোনো serialised রূপ নেই। যে candidate
  এটা বলেন, তারপর ব্যতিক্রম হিসেবে Server Action-এর নাম নেন, তিনি boundary বুঝেছেন। তিনি শুধু error message মুখস্থ
  করেননি।

## পড়ার ক্রম

01 → 04 ক্রমানুসারে পড়ুন, কারণ প্রতিটি আগেরটার ওপর দাঁড়ায়। অধ্যায় 03 দুবার পড়ুন। Code review round-এ অপ্রয়োজনীয়
effect হলো সবচেয়ে সাধারণ senior red flag, আর সমাধান সাধারণত সেগুলো মুছে ফেলা।

05 → 07-ও ক্রমানুসারে পড়ুন, আর এগুলো 01–04 জানা ধরে নেয়। সময় কম থাকলে 05 বাদ দেওয়া যাবে না, আর 07 ঠিক তার
পরেই। অধ্যায় 08 আর 09 স্বাধীন, 05 শেষ হলে যেকোনো ক্রমে পড়া যায়।

**Interview sprint:** 01 → 03 → 05 → 07 → 08।
