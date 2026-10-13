---
sourceHash: "d3fa11a33897a38c274d97abbe07be3341b6120f187ae59fb0dd3fd0ce731a01"
title: "Continuous Integration ও Delivery"
translatedAt: "2026-10-13T03:03:40.598Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Continuous Integration ও Delivery

একটি team-এর আসল engineering মান থাকে pipeline-এ। Testing আর review নিয়ে wiki যা-ই বলুক, সত্যিকারে যা চালু
করা হয় সেটা pipeline। Senior candidate-দের এটা নিয়ে প্রশ্ন করা হয়, কারণ একটি pipeline-এর দায়িত্ব নেওয়া মানে দ্রুত
ship করা আর নিরাপদে ship করার মধ্যের trade-off-এর দায়িত্ব নেওয়া।

তিনটি অধ্যায়, কাজ যে ক্রমে ঘটে সেই ক্রমে। প্রথমে সেই নীতিগুলো, যেগুলো যেকোনো tool-এ টিকে থাকে। তারপর pipeline
যে image build করে। শেষে সেই একটি tool, যেটা বেশিরভাগ team ব্যবহার করে, আর credential কীভাবে তাতে পৌঁছায় তাতে
জমা না থেকে। এরপর artefact-এর কী হয়, সেটা `Deployment/` section-এর বিষয়।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                  | কোন প্রশ্নের উত্তর দেয়                                               |
| -- | --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| 01 | [CI/CD-র মূল কথা](#ch-cicd-fundamentals)                               | Pipeline কীসের জন্য, আর সেটা দশ মিনিটের নিচে কীভাবে রাখবেন? |
| 02 | [Container Image: Build ও Hardening](#ch-docker-fundamentals)          | ছোট একটি image কীভাবে পাবেন, যেটা দ্রুত rebuild হয় আর root হিসেবে চলে না? |
| 03 | [GitHub Actions ও Pipeline Security](#ch-github-actions)              | এমন workflow কীভাবে লিখবেন, যেটা কোনো দীর্ঘমেয়াদি credential রাখে না?   |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, pipeline নিয়ে তিনটি প্রশ্ন:

- **Test মুছে না দিয়ে একটি ধীর pipeline-কে দ্রুত করতে পারেন?** Caching, parallel job, আর দামি check-গুলো শুধু
  সেখানেই চালানো, যেখানে সেগুলো কোনো সিদ্ধান্ত বদলায়। "Flaky-গুলো skip করুন" ভুল উত্তর।
- **Layer caching বোঝেন?** "Image build হতে নয় মিনিট লাগে, আর একমাত্র পরিবর্তন ছিল code-এর একটি line।" উত্তরটা
  `COPY`-এর ক্রম নিয়ে।
- **একটি build থেকে secret কীভাবে বেরিয়ে যায়?** একটি fork-এর pull request, একটি mutable action tag বা একটি
  দীর্ঘমেয়াদি key দিয়ে। প্রতিটির একটি নির্দিষ্ট সমাধান আছে।

## পড়ার ক্রম

আগে 01, কারণ বাকি দুটো এর শব্দ ব্যবহার করে। তারপর 02 আর 03, যেকোনো ক্রমে। Interview-এ সবচেয়ে বেশি আসার সম্ভাবনা
অধ্যায় 03-এর।
