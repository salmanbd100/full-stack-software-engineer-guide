---
sourceHash: "8264171cd9f3ad63a6fcb9225bd413b634db00f1ab6330645b7706ad4e388dd4"
title: "Part V — Backend Security"
translatedAt: "2026-10-12T12:22:28.141Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part V — Backend Security

Backend-এর মধ্যে security হলো সেই অংশ, যেটা নিয়ে একজন frontend engineer-এর মতামত থাকবে বলে সবচেয়ে বেশি আশা করা
হয়, অথচ সবচেয়ে কম ঠিকভাবে শেখানো হয়। প্রশ্নগুলো খুব কমই cryptography নিয়ে হয়। প্রশ্নগুলো হয় একটি check কোথায়
বসবে, browser নিজে থেকে কী করে, আর কোন defence কোন attack থামায়, তা নিয়ে।

এই section ইচ্ছা করেই এই ক্রমে চলে: আগে প্রমাণ করুন কেউ কে, তারপর ঠিক করুন সে কী করতে পারবে, তারপর request-টিকে
নিজেই ক্ষতিকর হওয়া থেকে আটকান।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions) | Session কি revoke করা যায়, আর CORS কেন CSRF আটকায় না? |
| 02 | [OAuth, OIDC ও Authorisation](#ch-oauth) | প্রতিটি redirect কী রক্ষা করছে, আর এই user কি *এই* object-টির মালিক? |
| 03 | [Input Validation ও Injection](#ch-backend-input-validation) | Data কোথায় গিয়ে code হয়ে যায়? |

## Interviewer-রা যা যাচাই করেন

- **Session নাকি JWT, আর কেন।** লেনদেনটা হলো statelessness বনাম revocation। যে candidate JWT-কে "বেশি secure"
  বলেন, তিনি বিষয়টা নিয়ে ভাবেননি।
- **Broken object-level authorisation।** URL-এ একটি id বদলে অন্য কারো data পড়ে ফেলা — production API-তে এটাই
  সবচেয়ে সাধারণ বাস্তব vulnerability।
- **CORS আদৌ কিছু রক্ষা করে কি না।** এটা browser-এর একটি নিয়ম শিথিল করে, আর browser সেটা enforce করে response-এর
  ওপর, আপনার handler চলে যাওয়ার পরে। পরের প্রশ্নে জানতে চাওয়া হয়, এটা CSRF আটকাতে পারে না কেন, তার তিনটি কারণ।
- **Escaping-এর চেয়ে parameterisation কেন ভালো।** Value কখনো statement-এর অংশ হয় না।
- **Token কোথায় রাখা হয়।** `localStorage` একটি XSS-কে একটি স্থায়ী account takeover-এ পরিণত করে।

## পড়ার ক্রম

01 → 02 authentication আর authorisation শুরু থেকে শেষ পর্যন্ত কভার করে। আসল bug-গুলো থাকে 02-এর দ্বিতীয় অর্ধেকে।
03 একাই দাঁড়িয়ে থাকে।

**Interview sprint:** 01 → 02। প্রায় প্রতিটি senior loop-এ credential design, CORS/CSRF-এর পার্থক্য আর
object-level authorisation আসে।
