---
sourceHash: "eee7a2b1762156cff62f9270b0d6a4652d4471557866c11536ed46d346970077"
title: "Next.js"
translatedAt: "2026-10-12T07:51:36.943Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Next.js

এই framework নিয়ে সাতটি অধ্যায়। বেশিরভাগ senior frontend job advert এটার নাম version সহ উল্লেখ করে। অধ্যায় 01–05
framework-টি নিজেই। এগুলো দেখায় App Router কীভাবে file-কে route-এ পরিণত করে, data কোথায় fetch আর cache হয়,
আর mutation কীভাবে server-এ চলে। এগুলো আরও দেখায় একটি route কীভাবে render হয়, আর তার আগে কী চলে, কোন runtime-এ।
অধ্যায় 06–07 production নিয়ে: authentication, আর সেই জায়গা যেখানে Next.js আপনার backend হয়ে উঠতে শুরু করে।

লেখা হয়েছে **Next.js 16** ধরে। এখানে কিছুই Vercel ধরে নেয় না। অধ্যায়গুলো platform-এর নাম নেয় শুধু যেখানে
কোনো খুঁটিনাটি সত্যিই আলাদা, যেমন cold start, regional execution, বা কোন adapter build চালায়।

> ⚠️ **যা বদলাতে থাকে।** Caching-এর নিয়ম Next.js 15-এ বদলেছে, 16-এ আবার বদলেছে। Version 16 আরও
> `middleware.ts`-এর নাম বদলে `proxy.ts` করেছে, আর প্রতিটি request API-কে asynchronous করেছে। `use cache`, `cacheLife`
> আর `cacheTag`-কে একটি স্থায়ী নীতির এই বছরের নাম হিসেবে দেখুন। Caching প্রতি request-এ opt-in, আর cache করা
> যেকোনো কিছুর একটি explicit key দরকার, যেটা আপনি ইচ্ছা করে invalidate করতে পারেন।

## অধ্যায়গুলো

| #  | অধ্যায় | যে প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------------- |
| 01 | [App Router-এর Mental Model](#ch-app-router-mental-model) | File কীভাবে route হয়, আর navigation-এ কী re-render হয়? |
| 02 | [Data Fetching ও Caching](#ch-nextjs-data-and-caching) | এই request কোথায় যায়, আর উত্তরটা কতক্ষণ বেঁচে থাকে? |
| 03 | [Server Action](#ch-server-actions) | API route না লিখে কীভাবে data mutate করবেন — আর নিরাপদে? |
| 04 | [Next.js-এ Rendering](#ch-rendering-in-nextjs) | Static, dynamic, streaming নাকি partially prerendered — কোনটা, আর কেন? |
| 05 | [Middleware, Runtime ও Deployment](#ch-nextjs-middleware-and-the-edge) | Route-এর আগে কী চলে, কোন runtime-এ, আর self-host করলে cache কোথায় থাকে? |
| 06 | [Auth Pattern](#ch-nextjs-auth-patterns) | Session নাকি token, আর কোথায় check হয়? |
| 07 | [Route Handler ও BFF](#ch-route-handlers-and-the-bff) | কখন Next.js আপনার backend, আর কখন সেটা হওয়া বন্ধ করা উচিত? |

## Interviewer-রা যা যাচাই করেন

Next.js-এর নিজস্ব দুটি প্রশ্ন, Part III-এর শুরুর পাতায় থাকা part-স্তরের signal-গুলোর ওপরে:

- **"এই page stale কেন?"** উত্তরটা একটা chain ধরে এগোয় — fetch, cache entry, revalidation key, আর তার সামনের
  CDN। যে candidate শুধু default ব্যবহার করেছেন, তিনি লক্ষণ বর্ণনা করেন। যে candidate একটি content site ship
  করেছেন, তিনি layer-টির নাম বলেন।
- **"একজন user-কে সরাসরি ওই Server Action call করা থেকে কী আটকায়?"** কিছুই না। এটা একটা public endpoint, যার
  নাম generate করা। Authorisation আর validation action-এর ভেতরেই থাকবে, প্রতিবার। App Router code-এ সবচেয়ে
  সাধারণ security finding হলো এমন একটি Server Action-কে বিশ্বাস করা, শুধু এই কারণে যে সেটা তার component-এর পাশে বসে আছে।

## পড়ার ক্রম

01 → 05 ক্রমানুসারে পড়ুন। 02-এর caching model 04-এর rendering-এর সিদ্ধান্তগুলো ব্যাখ্যা করে, আর 03 দুটোই ধরে নেয়।
অধ্যায় 06 আর 07 আলাদাভাবে দাঁড়িয়ে থাকে, যেকোনো ক্রমে পড়া যায়।

**Interview sprint:** 01 → 02 → 03 → 04। Round-এ জিজ্ঞেস করা হয় rendering আর caching নিয়ে। Job-এ জিজ্ঞেস করা হয়
runtime আর deployment নিয়ে।
