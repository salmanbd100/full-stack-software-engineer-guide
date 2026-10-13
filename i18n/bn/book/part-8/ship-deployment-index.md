---
sourceHash: "053d7ad5dd43246e058fa0550e15a410844a802586afa46b1d326a4198c1cbdf"
title: "Deployment"
translatedAt: "2026-10-13T03:09:02.063Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Deployment

Pipeline পরিবর্তনটি build করে। এই section তার পরের ঘটনা নিয়ে: এটা কীভাবে user-দের কাছে পৌঁছায়, কে প্রথম দেখে, আর
কীভাবে এটা ফিরিয়ে আনা যায়। শেষ অংশটাতেই seniority বোঝা যায়। অনেক engineer একটি deployment বর্ণনা করতে পারেন। কম
জনই release বের হওয়ার আগে বলতে পারেন, এর কোন অংশ একটি rollback ফিরিয়ে আনবে না।

দুটো অধ্যায়ই একটি ধারণা মেনে চলে: একটি deployment হলো একটি immutable artefact (একটি build output, যেটা কখনো বদলায়
না), আর একটি domain হলো সেরকম একটির দিকে তাক করা একটি pointer।
Preview environment, instant rollback আর প্রতি-user release — এই সবকিছুই এই model সস্তা করে দেয়।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                             | কোন প্রশ্নের উত্তর দেয়                                              |
| -- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 01 | [Platform Deploy ও Preview Environment](#ch-platform-deploys)                      | একটি deployment promote করলে কী হয়, আর একটি pull request কীভাবে একটি আসল URL পায়? |
| 02 | [Deployment Strategy, Rollback ও Feature Flag](#ch-deployment-strategies)          | আপনি কোন ঝুঁকি কমাচ্ছেন, আর কোন পরিবর্তন ফিরিয়ে আনা যায় না? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, deployment নিয়ে তিনটি প্রশ্ন:

- **Code কোথায় চলে, আর কেন সেখানে?** Edge execution latency-তে লাভ, আর data access-এ ক্ষতি। একটি database-নির্ভর
  route-কে দ্রুত করতে edge-এ সরানো একটি সাধারণ, আত্মবিশ্বাসী ভুল উত্তর।
- **Preview কি production data ব্যবহার করে?** উত্তর হওয়া উচিত না। আসল trade-off-এর আলোচনা হয় পরের প্রশ্নে: একটি
  branched database, একটি seeded ephemeral database, নাকি একটি shared আর ভঙ্গুর database।
- **Deploy বনাম release।** Feature flag, canary আর preview URL একটি প্রশ্নেরই তিনটি উত্তর: সবার আগে একটি ছোট
  দর্শকের সামনে একটি পরিবর্তন কীভাবে আনবেন?

## পড়ার ক্রম

আগে 01 পড়ুন। অধ্যায় 02 সেখানে তৈরি করা immutable-artefact model-এর ওপর নির্ভর করে।
