---
sourceHash: "053d7ad5dd43246e058fa0550e15a410844a802586afa46b1d326a4198c1cbdf"
title: "Deployment"
translatedAt: "2026-10-19T07:55:19.191Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Deployment

Pipeline পরিবর্তনটা build করে। এই section তার পরের ঘটনা নিয়ে: পরিবর্তনটা কীভাবে user-দের কাছে পৌঁছায়, প্রথমে কে
দেখে, আর কীভাবে সেটা ফিরিয়ে আনা যায়। Seniority ধরা পড়ে এই শেষ অংশেই। অনেক engineer-ই একটি deployment-এর বর্ণনা দিতে
পারেন। কিন্তু release বের হওয়ার আগেই বলতে পারেন এর কোন অংশ rollback দিয়ে ফেরানো যাবে না, এমন মানুষ কম।

দুটি অধ্যায়ই একটি ধারণা মেনে চলে: deployment হলো একটি immutable artefact (এমন build output যা কখনো বদলায় না), আর
domain হলো তার একটির দিকে তাক করা pointer।
Preview environment, instant rollback আর user-ভিত্তিক release, সবই এই model-এর কারণে সস্তা হয়ে যায়।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                             | কোন প্রশ্নের উত্তর দেয়                                             |
| -- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 01 | [Platform Deploy ও Preview Environment](#ch-platform-deploys)                      | একটি deployment promote করলে কী হয়, আর একটি pull request কীভাবে আসল URL পায়? |
| 02 | [Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies)          | কোন ঝুঁকিটা আপনি কমাচ্ছেন, আর কোন পরিবর্তন আর ফেরানো যায় না? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের signal-গুলোর ওপর, deployment নিয়ে তিনটি প্রশ্ন:

- **Code কোথায় চলে, আর কেন সেখানে?** Edge-এ চালালে latency-তে লাভ, কিন্তু data-র কাছে পৌঁছাতে ক্ষতি। দ্রুত করার
  জন্য database-নির্ভর একটি route edge-এ সরিয়ে নেওয়া খুব চেনা একটি ভুল উত্তর, যা লোকে আত্মবিশ্বাসের সঙ্গে দেয়।
- **Preview কি production data ব্যবহার করে?** উত্তর হওয়া উচিত না। আসল লাভ-ক্ষতির আলোচনা হয় পরের প্রশ্নে: branch করা
  database, seed করা অস্থায়ী database, নাকি সবার ভাগের একটি ভঙ্গুর database।
- **Deploy বনাম release।** Feature flag, canary আর preview URL একই প্রশ্নের তিনটি উত্তর: সবার সামনে আনার আগে একটি
  পরিবর্তন কীভাবে ছোট একদল মানুষের সামনে আনবেন?

## পড়ার ক্রম

আগে 01 পড়ুন। অধ্যায় 02 সেখানে দাঁড় করানো immutable-artefact model-এর ওপর নির্ভর করে।
