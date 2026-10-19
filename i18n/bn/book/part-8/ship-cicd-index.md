---
sourceHash: "d3fa11a33897a38c274d97abbe07be3341b6120f187ae59fb0dd3fd0ce731a01"
title: "Continuous Integration ও Delivery"
translatedAt: "2026-10-19T07:53:15.908Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Continuous Integration ও Delivery

Team-এর আসল engineering standard থাকে pipeline-এ। Testing আর review নিয়ে wiki যা-ই বলুক, বাস্তবে চালু থাকে pipeline
যা চাপিয়ে দেয়। Senior candidate-দের এ নিয়ে প্রশ্ন করা হয়, কারণ pipeline-এর মালিক হওয়া মানে দ্রুত ship করা আর নিরাপদে
ship করার মধ্যে ভারসাম্যের দায়িত্ব নেওয়া।

তিনটি অধ্যায়, কাজ যে ক্রমে হয় সেই ক্রমে। প্রথমে সেই নীতিগুলো, যা যেকোনো tool-এ টিকে থাকে। তারপর pipeline যে image বানায়।
শেষে সেই tool, যা বেশিরভাগ team ব্যবহার করে, আর credential কীভাবে তার কাছে পৌঁছায় অথচ তার ভেতরে জমা থাকে না।
এরপর artefact-টার কী হয়, সেটা `Deployment/` অংশের বিষয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------ | -------------------- |
| 01 | [CI/CD-র মূল কথা](#ch-cicd-fundamentals) | Pipeline কীসের জন্য, আর দশ মিনিটের নিচে রাখবেন কীভাবে? |
| 02 | [Container Image: Build ও Hardening](#ch-docker-fundamentals) | ছোট image কীভাবে পাবেন, যা দ্রুত rebuild হয় আর root হিসেবে চলে না? |
| 03 | [GitHub Actions ও Pipeline Security](#ch-github-actions) | এমন workflow কীভাবে লিখবেন, যাতে কোনো দীর্ঘমেয়াদি credential নেই? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর পাতার part-স্তরের লক্ষণগুলোর ওপর, pipeline নিয়ে তিনটি প্রশ্ন:

- **Test না মুছে ধীর pipeline-কে দ্রুত করতে পারেন?** Caching, parallel job, আর দামি check শুধু সেখানে চালানো, যেখানে
  সেগুলো কোনো সিদ্ধান্ত বদলায়। "Flaky test-গুলো বাদ দিন" ভুল উত্তর।
- **Layer caching বোঝেন?** "Image build হতে নয় মিনিট লাগে, অথচ বদল শুধু এক line code।" উত্তরটা `COPY`-এর ক্রম নিয়ে।
- **Build থেকে secret বাইরে যায় কীভাবে?** Fork থেকে আসা pull request দিয়ে, বদলানো যায় এমন action tag দিয়ে, কিংবা
  দীর্ঘমেয়াদি key দিয়ে। প্রতিটির নির্দিষ্ট সমাধান আছে।

## পড়ার ক্রম

আগে 01, কারণ বাকি দুটি এর শব্দ ব্যবহার করে। তারপর 02 আর 03 যেকোনো ক্রমে। Interview-এ সবচেয়ে বেশি আসার সম্ভাবনা
অধ্যায় 03-এর।
