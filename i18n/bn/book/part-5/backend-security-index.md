---
sourceHash: "8264171cd9f3ad63a6fcb9225bd413b634db00f1ab6330645b7706ad4e388dd4"
title: "Part V — Backend Security"
translatedAt: "2026-10-17T14:04:27.909Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — Backend Security

Backend-এর যে অংশ নিয়ে frontend engineer-এর মতামত সবচেয়ে বেশি আশা করা হয়, অথচ ঠিকমতো শেখানো হয় সবচেয়ে কম, সেটা
security। প্রশ্নগুলো খুব কমই cryptography নিয়ে হয়। প্রশ্ন হয়: কোন check কোথায় বসবে, browser নিজে থেকে কী করে, আর কোন
প্রতিরক্ষা কোন আক্রমণ আটকায়।

এই section-এর ক্রম ইচ্ছে করেই এমন: আগে প্রমাণ করুন কেউ কে, তারপর ঠিক করুন সে কী করতে পারবে, তারপর আটকান যাতে
request নিজেই ক্ষতিকর না হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) | Session কি revoke করা যায়, আর CORS কেন CSRF আটকায় না? |
| 02 | [OAuth, OIDC ও Authorisation](#ch-oauth) | প্রতিটি redirect কী রক্ষা করছে, আর এই user কি *এই* object-এর মালিক? |
| 03 | [Input Validation ও Injection](#ch-backend-input-validation) | Data কোথায় গিয়ে code হয়ে যায়? |

## Interviewer-রা যা যাচাই করেন

- **Session নাকি JWT, আর কেন।** লেনদেনটা statelessness বনাম revocation। যে candidate JWT-কে "বেশি নিরাপদ" বলেন, তিনি
  বিষয়টা নিয়ে ভাবেননি।
- **Broken object-level authorisation।** URL-এ একটি id বদলে অন্য কারও data পড়ে ফেলা — production API-তে বাস্তবে সবচেয়ে
  বেশি পাওয়া vulnerability এটাই।
- **CORS আদৌ কিছু রক্ষা করে কি না।** CORS browser-এর একটি নিয়ম শিথিল করে, আর browser সেটা মানায় response-এর ওপর, আপনার
  handler চলে যাওয়ার পরে। পরের প্রশ্নে জানতে চাওয়া হয়, CORS কেন CSRF আটকাতে পারে না তার তিনটি কারণ।
- **Escaping-এর চেয়ে parameterisation কেন ভালো।** Value কখনো statement-এর অংশ হয় না।
- **Token কোথায় রাখা হয়।** `localStorage` একটি XSS-কে স্থায়ী account takeover বানিয়ে দেয়।

## পড়ার ক্রম

01 → 02 authentication আর authorisation শুরু থেকে শেষ পর্যন্ত দেখায়। আসল bug-গুলো থাকে 02-এর দ্বিতীয় অর্ধেকে। 03 আলাদাভাবে
পড়া যায়।

**Interview sprint:** 01 → 02। Credential design, CORS আর CSRF-এর পার্থক্য, আর object-level authorisation প্রায় প্রতিটি
senior loop-এ আসে।
