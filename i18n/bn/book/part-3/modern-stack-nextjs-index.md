---
sourceHash: "eee7a2b1762156cff62f9270b0d6a4652d4471557866c11536ed46d346970077"
title: "Next.js"
translatedAt: "2026-10-17T01:37:21.391Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Next.js

যে framework-এর নাম senior frontend-এর বেশিরভাগ job advert-এ version সহ লেখা থাকে, তাকে নিয়ে সাতটি অধ্যায়।
01–05 অধ্যায় framework নিজেই। এগুলোতে দেখবেন App Router কীভাবে file থেকে route বানায়, data কোথায় fetch আর cache
হয়, আর mutation কীভাবে server-এ চলে। আরও দেখবেন একটি route কীভাবে render হয়, আর তার আগে কোন runtime-এ কী চলে।
06–07 অধ্যায় production নিয়ে: authentication, আর সেই জায়গা যেখানে Next.js আপনার backend হয়ে উঠতে শুরু করে।

লেখা হয়েছে **Next.js 16** ধরে। এখানে কোথাও ধরে নেওয়া হয়নি যে আপনি Vercel-এ আছেন। Platform-এর নাম আসে শুধু যেখানে
খুঁটিনাটি সত্যিই আলাদা, যেমন cold start, regional execution, বা build কোন adapter চালায়।

> ⚠️ **যা বদলাতে থাকে।** Caching-এর নিয়ম বদলেছে Next.js 15-এ, আবার 16-এ। Version 16 আরও
> `middleware.ts`-এর নাম বদলে `proxy.ts` রেখেছে, আর প্রতিটি request API-কে asynchronous করেছে। `use cache`, `cacheLife`
> আর `cacheTag`-কে একটি টেকসই নীতির এ বছরের নাম হিসেবে দেখুন। নীতিটা হলো: caching প্রতিটি request-এ নিজে চালু করতে হয়,
> আর cache করা যেকোনো কিছুর একটি explicit key লাগে, যা দিয়ে আপনি ইচ্ছেমতো invalidate করতে পারেন।

## অধ্যায়গুলো

| #  | অধ্যায়                       | কোন প্রশ্নের উত্তর দেয়                                                  |
| -- | --------------------------- | --------------------------------------------------------------------- |
| 01 | [App Router-এর Mental Model](#ch-app-router-mental-model) | File কীভাবে route হয়, আর navigation-এ কী re-render হয়? |
| 02 | [Data Fetching ও Caching](#ch-nextjs-data-and-caching) | এই request কোথায় যায়, আর উত্তরটা কতক্ষণ বাঁচে? |
| 03 | [Server Action](#ch-server-actions) | API route না লিখে data কীভাবে বদলাবেন — আর নিরাপদে?     |
| 04 | [Next.js-এ Rendering](#ch-rendering-in-nextjs) | Static, dynamic, streaming নাকি partially prerendered — কোনটা, আর কেন? |
| 05 | [Middleware, Runtime ও Deployment](#ch-nextjs-middleware-and-the-edge) | Route-এর আগে কী চলে, কোন runtime-এ, আর self-host করলে cache থাকে কোথায়? |
| 06 | [Auth Pattern](#ch-nextjs-auth-patterns) | Session নাকি token, আর check হয় কোথায়?                            |
| 07 | [Route Handler ও BFF](#ch-route-handlers-and-the-bff) | Next.js কখন আপনার backend, আর কখন সেটা থামা উচিত? |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর পাতায় পুরো part-এর যে লক্ষণগুলো আছে, তার ওপরে Next.js-এর নিজস্ব দুটি প্রশ্ন:

- **"এই page stale কেন?"** উত্তরটা একটি শিকল ধরে এগোয় — fetch, cache entry, revalidation key, আর তার সামনের CDN।
  যাঁরা শুধু default ব্যবহার করেছেন, তাঁরা লক্ষণটা বর্ণনা করেন। যাঁরা content site ship করেছেন, তাঁরা ঠিক কোন
  layer, সেটা বলে দেন।
- **"User-কে সরাসরি ওই Server Action call করতে কী আটকায়?"** কিছুই না। এটা generated নামের একটি public endpoint।
  Authorisation আর validation প্রতিবার action-এর ভেতরেই থাকবে। App Router code-এ সবচেয়ে বেশি পাওয়া security
  সমস্যা হলো এমন Server Action, যাকে বিশ্বাস করা হয়েছে শুধু এজন্য যে সেটা তার component-এর পাশে বসে আছে।

## পড়ার ক্রম

01 → 05 ক্রমানুসারে পড়ুন। 02-এর caching model দিয়েই 04-এর rendering-এর সিদ্ধান্তগুলো বোঝা যায়, আর 03 দুটিই জানা
ধরে নেয়। 06 আর 07 আলাদাভাবে পড়া যায়, যেকোনো ক্রমে।

**Interview sprint:** 01 → 02 → 03 → 04। Interview round-এ প্রশ্ন আসে rendering আর caching নিয়ে। Runtime আর
deployment নিয়ে প্রশ্ন আসে চাকরিতে ঢোকার পরে।
