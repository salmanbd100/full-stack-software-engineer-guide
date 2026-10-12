---
sourceHash: "af367f50a7bba1b0b0ef51c8923dba45c08ae09fd644aa6d0af47d1f8842959b"
title: "Part II — Browser Platform"
translatedAt: "2026-10-12T07:52:12.967Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — Browser Platform

Framework হলো platform-এর ওপরের একটা স্তর। যে engineer platform বাদ দিয়ে গেছেন, তিনি একসময় একটা সীমায় আটকে
যান। Interview-তে এটা স্পষ্ট ধরা পড়ে: প্রতিটি উত্তর শুরু হয় একটা library-র নাম দিয়ে। এই part সেই নিচের স্তরটা।
এখানে আছে সেই markup, যাকে browser অর্থ দেয়, আর browser যে storage দেয়। এখানে আছে accessibility tree (page-এর
সেই model, যা assistive technology পড়ে)। আপনি এটা নিয়ে ভাবুন বা না ভাবুন, browser এটা বানায়ই। আর আছে, browser
এমন একটা locale পেলে কী করে, যা সে আগে কখনো দেখেনি।

দুটো বিষয় তাদের line সংখ্যার চেয়ে অনেক বেশি গুরুত্বপূর্ণ। **Accessibility** আইনি বাধ্যবাধকতা, থাকলে ভালো এমন
কিছু নয়। European Accessibility Act জুন 2025 থেকে কার্যকর হয়েছে। EU-এর ভোক্তাদের সেবা দেয় এমন যেকোনো
company-র ওপর এটা খাটে, company-টি যেখানেই থাকুক। Frontend system design round-গুলোও একটা বিষয়ে একমত।
Accessibility আর internationalisation — এই দুটো topic-ই সবচেয়ে নির্ভরযোগ্যভাবে একজন সিনিয়র candidate-কে একজন
mid-level candidate থেকে আলাদা করে। দুটোই অন্য জায়গায় খুব খারাপভাবে শেখানো হয়, তাই আলাদা হয়ে ওঠার এটা একটা সস্তা
উপায়।

## Section-গুলো

| Section                                                         | অধ্যায় | কী কভার করে                                                  |
| ---------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| [HTML ও CSS](#ch-frontend-html-css-index)                     | 4        | Browser যে semantics-এর ভিত্তিতে কাজ করে, আর আধুনিক layout primitive |
| [Browser API](#ch-frontend-browser-apis-index)                 | 6        | Storage ও IndexedDB, cookie, observer, worker, service worker ও offline, `Intl` আর right-to-left |
| [Accessibility](#ch-frontend-accessibility-index)               | 5        | আইন, accessibility tree, ARIA, focus, form              |

## Interviewer-রা যা যাচাই করেন

এই part-এর সিনিয়র সংকেত হলো **library-র আগে platform-এর দিকে হাত বাড়ানো।** তিনটি প্রশ্ন তিনটি section জুড়েই
চলে, আর প্রতিটি section-এর index নিজের প্রশ্ন যোগ করে।

- **Browser এখানে আগে থেকেই কী করে?** একটা `<dialog>`, একটা `<details>`, একটা native form validation
  message। এদের প্রতিটিই এমন একটা component, যেটা কেউ বানাতে যাচ্ছিলেন — focus management আর keyboard
  behaviour সহ।
- **এটা কার জন্য ব্যবহারের অযোগ্য, আর আপনি সেটা কীভাবে জানেন?** "এটা কি accessible" নয়, কারণ সেই প্রশ্ন একটা
  "হ্যাঁ" ডেকে আনে। সিনিয়র উত্তর একজন user, একটা mechanism আর একটা check-এর নাম বলে। যেমন: শুধু keyboard
  ব্যবহার করেন এমন একজন user, একটা focus trap, আর CI-তে একটা axe run, যেটা এটা ধরে ফেলত।
- **ধরে নেওয়া কথাটা ভেঙে গেলে কী হয়?** Storage ভরে গেছে, locale Arabic, network নেই, অথবা German-এ string
  40% লম্বা। প্রতিটির জন্য test-এ এক line-এর পরিবর্তন, আর layout-এর নতুন design।

**একই প্রশ্নে mid আর সিনিয়র:**

| প্রশ্ন | Mid উত্তর | সিনিয়র উত্তর |
| ----- | ---------- | ------------- |
| "এটা কীভাবে store করবেন?" | "localStorage" | Size limit-এর কথা বলেন, বলেন যে এটা synchronous আর main thread block করে, আর কখন IndexedDB তার জটিলতার দাম দেয় |
| "এটা কি accessible?" | "এতে ARIA label আছে" | কোন native element-এ কোনো label-ই লাগত না, আর `role="button"` এমন কী প্রতিশ্রুতি দেয় যা একটা `<div>` পূরণ করে না |
| "এটা কীভাবে translate করবেন?" | "String-গুলো একটা JSON file-এ রাখুন" | Plural category, locale অনুযায়ী formatting, আর সেই layout যা translation-এর আগেই ভেঙে যায় |

## পড়ার ক্রম

আগে HTML ও CSS পড়ুন, কারণ accessibility section সেটা জানা আছে বলে ধরে নেয়। এরপর বাকি দুটো section স্বাধীন,
যেকোনো ক্রমে পড়তে পারেন।

**Interview sprint:** HTML ও CSS 01 · Browser API 01, 02 আর 06 · Accessibility 02 আর 03। ছয়টা অধ্যায়, আর
platform নিয়ে যে প্রশ্নগুলো সত্যিই জিজ্ঞেস করা হয়, সেগুলো এতেই আছে।

**Role-এ নাম থাকলে পুরোটা পড়ুন:** সরকারি খাত, banking বা EU-মুখী product-এর জন্য accessibility section শুরু
থেকে শেষ পর্যন্ত পড়ুন। ওই loop-গুলো এ নিয়ে ঠিকমতো প্রশ্ন করে।

> ⚠️ **Storage ইচ্ছা করেই দুবার এসেছে।** Mechanics (quota, eviction, `SameSite`) এখানে।
> *Performance* strategy হিসেবে caching, তার budget আর measurement সহ, আছে Part IV-এ।
