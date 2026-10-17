---
sourceHash: "9854400dfefa6490d8f4a4507b51c4130676e1c1281fa51f71a4f4a58600a9f5"
title: "React"
translatedAt: "2026-10-17T01:05:39.276Z"
model: "claude-opus-5-5 (Claude Code)"
---

# React

নয়টি অধ্যায়, তিনটি দলে। অধ্যায় 01–04 হলো model: state বদলালে React কী করে, আর hook-এর বেশিরভাগ bug কেন আসলে closure-এর
bug। অধ্যায় 05–07 concurrent যুগ নিয়ে: Server Component, Suspense আর Actions। 2026–27-এর senior interview ঘোরে এখানেই। অধ্যায়
08–09 নিয়ে আসে feature কাজ করার পরে production-এ যা লাগে: React Compiler-এর অধীনে performance, আর বড় মাপে type। React
component test করার কথা আছে Part IV-এ, testing-এর বাকি অংশের সঙ্গে।

এই অংশ লেখা **React 19** ধরে। কিছু নিয়ম React 19-এর চেয়ে পুরনো, আর এর পরেও টিকে থাকবে: key পরিচয় দেয়, effect sync করে, props
নিচের দিকে নামে। অধ্যায়ে এমন কোনো নিয়ম এলে সেটা বলে দেওয়া আছে, কারণ framework বদলালেও এগুলো হারায় না।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------------- |
| 01 | [React-এর Mental Model](#ch-react-mental-model) | `setState` থেকে screen পর্যন্ত মাঝখানে কী ঘটে, আর key কেন জরুরি |
| 02 | [Hook-এর গভীরে](#ch-react-hooks-in-depth) | নিয়মগুলো কেন আছে, আর stale closure আসলে কী ধরে রাখে |
| 03 | [`useEffect` and When Not to Use It](#ch-when-not-to-use-effect) | এই effect-গুলোর কোনগুলো আসলে derived state হওয়ার কথা ছিল? |
| 04 | [Component Composition Pattern](#ch-react-composition-patterns) | নিয়ন্ত্রণ না ছেড়ে কীভাবে একটি API অন্যের হাতে দেবেন? |
| 05 | [Server Component ও Client Component](#ch-server-components-vs-client-components) | Boundary কোথায়, আর কী তা পার হতে পারে? |
| 06 | [Suspense, Streaming ও Error Boundary](#ch-suspense-and-streaming) | অর্ধেক page কীভাবে আসে, আর কোনো subtree throw করলে user কী দেখেন? |
| 07 | [Action ও Form](#ch-react-actions-and-forms) | Client-side fetch handler ছাড়া একটি mutation কীভাবে কাজ করে? |
| 08 | [Performance, Transition ও Compiler](#ch-react-performance-and-the-compiler) | কাজ কমানো, নাকি schedule করা — এই ধীরগতির কোনটা লাগবে? |
| 09 | [বড় পরিসরে React ও TypeScript](#ch-react-typescript-at-scale) | `any` ছাড়া props, ref, context আর state-এর type কীভাবে দেবেন? |

`Frontend/TypeScript`-এর React অধ্যায় এখন আছে অধ্যায় 09-এ। Copy না করে সেটা এখানে সরিয়ে আনা হয়েছে। সঙ্গে যোগ হয়েছে সেই অংশগুলো,
যা শুধু বড় মাপে গিয়েই জরুরি: async state-এর জন্য union, generic component, আর server/client boundary যে typing-এর নিয়ম বেঁধে দেয়।

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুতে বলা অংশ-জোড়া লক্ষণগুলোর ওপরে, React-এর নিজস্ব দুটি প্রশ্ন:

- **"এই component কেন re-render হচ্ছে?"** দুর্বল উত্তর `memo`-র দিকে হাত বাড়ায়। জোরালো উত্তর বলে কোন state বদলেছে আর কোন prop-এর
  identity ভেঙেছে। React Compiler-এর যুগে এটাও জিজ্ঞেস করে, memoisation আদৌ কখনো developer-এর কাজ ছিল কি না। এই একটি প্রশ্নেই
  আলাদা হয়ে যান কে সত্যিই কোনো React application profile করেছেন, আর কে শুধু profiling নিয়ে পড়েছেন।
- **"ওই function-টা Client Component-এ পাঠাতে পারবেন না কেন?"** Server/client boundary পার হওয়া props serialise হয়ে RSC
  payload-এ যায়, আর function-এর কোনো serialise করা রূপ নেই। যে candidate এটা বলেন, তারপর ব্যতিক্রম হিসেবে Server Action-এর নাম
  করেন, তিনি boundary-টা বুঝেছেন। শুধু error message মুখস্থ করেননি।

## পড়ার ক্রম

01 → 04 ক্রম মেনে পড়ুন, কারণ প্রতিটি আগেরটার ওপর দাঁড়িয়ে। অধ্যায় 03 দুবার পড়ুন। Code review round-এ senior-দের সবচেয়ে সাধারণ
বিপদসংকেত অপ্রয়োজনীয় effect, আর সমাধান সাধারণত সেগুলো মুছে ফেলা।

05 → 07-ও ক্রম মেনে পড়তে হয়, আর এগুলো ধরে নেয় 01–04 পড়া আছে। সময় কম হলে 05 বাদ দেওয়ার কোনো সুযোগ নেই, আর ঠিক তার পরেই 07।
05 শেষ হলে অধ্যায় 08 আর 09 আলাদা, যেকোনো ক্রমে পড়া যায়।

**Interview sprint:** 01 → 03 → 05 → 07 → 08।
