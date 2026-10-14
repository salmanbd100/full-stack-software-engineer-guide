---
sourceHash: "af367f50a7bba1b0b0ef51c8923dba45c08ae09fd644aa6d0af47d1f8842959b"
title: "Part II — Browser Platform"
translatedAt: "2026-10-14T04:47:28.439Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — Browser Platform

Framework হলো platform-এর ওপর একটা স্তর। যে engineer platform-টা এড়িয়ে গেছেন, তিনি একসময় দেয়ালে ঠেকেন, আর
interview-এ সেটা স্পষ্ট ধরা পড়ে: প্রতিটি উত্তর শুরু হয় কোনো library-র নাম দিয়ে। এই part সেই নিচের স্তরটা নিয়ে।
এখানে আছে সেই markup, যাকে browser অর্থ দেয়, আর browser যে storage দেয় সেটা। আছে accessibility tree-ও (পাতার যে
model assistive technology পড়ে), যেটা browser বানায়ই, আপনি তা নিয়ে ভাবুন বা না-ই ভাবুন। আর আছে, browser কখনো
দেখেনি এমন locale পেলে কী করে।

দুটি বিষয়ের গুরুত্ব তাদের line-সংখ্যার চেয়ে অনেক বেশি। **Accessibility** আইনি বাধ্যবাধকতা, বাড়তি সৌজন্য নয়।
European Accessibility Act কার্যকর হয়েছে June 2025-এ। EU-র ভোক্তাদের সেবা দেয় এমন যেকোনো company-র ওপর এটা খাটে,
company যেখানেই থাকুক। Frontend system design round-গুলোও একটা ব্যাপারে একমত। Senior candidate-কে mid-level থেকে
সবচেয়ে নির্ভরযোগ্যভাবে আলাদা করে দুটি বিষয়: accessibility আর internationalisation। অন্য জায়গায় দুটিই খুব কম
শেখানো হয়, তাই আলাদা হয়ে ওঠার এটা একটা সস্তা উপায়।

## অংশগুলো

| অংশ                                                             | অধ্যায় | কী নিয়ে                                                        |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| [HTML ও CSS](#ch-frontend-html-css-index)                       | 4        | যে semantics দেখে browser কাজ করে, আর আধুনিক layout-এর মূল উপাদান |
| [Browser API](#ch-frontend-browser-apis-index)                  | 6        | Storage আর IndexedDB, cookie, observer, worker, service worker আর offline, `Intl` আর right-to-left |
| [Accessibility](#ch-frontend-accessibility-index)               | 5        | আইন, accessibility tree, ARIA, focus, form                       |

## Interviewer-রা যা যাচাই করেন

এই part-এ senior-এর লক্ষণ হলো **library-র দিকে হাত বাড়ানোর আগে platform-এর দিকে তাকানো।** তিনটি প্রশ্ন তিনটি
অংশ জুড়েই চলে; প্রতিটি অংশের index নিজের প্রশ্নও যোগ করে।

- **Browser এখানে আগে থেকেই কী করে দেয়?** একটা `<dialog>`, একটা `<details>`, form validation-এর native message।
  এগুলোর প্রতিটিই এমন component, যা কেউ বানাতে যাচ্ছিলেন, আর এদের সঙ্গে focus management আর keyboard-এর আচরণও
  আগে থেকেই আছে।
- **কার কাছে এটা অচল, আর আপনি জানলেন কীভাবে?** "এটা কি accessible" প্রশ্ন নয়, কারণ তার উত্তরে সবাই হ্যাঁ বলে।
  Senior-এর উত্তরে থাকে একজন user, একটা কারণ আর একটা check। যেমন: শুধু keyboard ব্যবহার করেন এমন একজন user, একটা
  focus trap, আর CI-তে axe চালানো, যেটা সমস্যাটা ধরে ফেলত।
- **ধরে নেওয়া কথাটা ভেঙে গেলে কী হয়?** Storage ভরে গেছে, locale আরবি, network নেই, বা German-এ string 40% লম্বা।
  প্রতিটির জন্য test-এ বদল এক line-এর, কিন্তু layout নতুন করে ডিজাইন করতে হয়।

**একই প্রশ্নে mid আর senior:**

| প্রশ্ন | Mid-এর উত্তর | Senior-এর উত্তর |
| ----- | ---------- | ------------- |
| "এটা কোথায় রাখবেন?" | "localStorage" | Size limit কত, এটা synchronous আর main thread আটকে দেয়, আর কখন IndexedDB-র জটিলতা পোষায়, সেটা বলেন |
| "এটা কি accessible?" | "ARIA label দেওয়া আছে" | কোন native element নিলে কিছুই লাগত না, আর `role="button"` এমন কী কথা দেয় যা একটা `<div>` রাখে না |
| "এটা অনুবাদ করবেন কীভাবে?" | "String-গুলো একটা JSON file-এ রাখব" | Plural category, locale বুঝে formatting, আর অনুবাদের আগেই যে layout ভেঙে যায় |

## পড়ার ক্রম

আগে HTML ও CSS পড়ুন, কারণ accessibility অংশ সেটা জানা আছে ধরে নেয়। তারপর বাকি দুটি অংশ স্বাধীন, যেকোনো ক্রমে
পড়তে পারেন।

**Interview sprint:** HTML ও CSS 01 · Browser API 01, 02 আর 06 · Accessibility 02 আর 03। ছয়টি অধ্যায়, আর
platform নিয়ে আসলে যা জিজ্ঞেস করা হয়, তার সবই এতে আছে।

**Role-এ নাম থাকলে পুরোটা পড়ুন:** সরকারি খাত, banking বা EU-মুখী product হলে accessibility অংশ শুরু থেকে শেষ
পর্যন্ত পড়ুন। ওই interview-গুলোতে এ নিয়ে ভালোমতোই প্রশ্ন হয়।

> ⚠️ **Storage দুবার এসেছে ইচ্ছে করেই।** কলকবজা (quota, eviction, `SameSite`) এখানে। আর *performance*-এর
> কৌশল হিসেবে caching, তার budget আর মাপজোখসহ, আছে Part IV-এ।
