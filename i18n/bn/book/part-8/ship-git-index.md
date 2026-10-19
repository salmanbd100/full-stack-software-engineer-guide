---
sourceHash: "426029f9b52ef2a5658639c53a8d1ad65949c29e3e81dcee9c3384b4698face4"
title: "Git দিয়ে Version Control"
translatedAt: "2026-10-19T07:53:15.680Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Git দিয়ে Version Control

এই part-এর যে tool আপনি প্রতিটি কাজের দিনের প্রতি ঘণ্টায় ছোঁন, সেটা Git। আবার এখানেই mental model নড়বড়ে হলে
সবচেয়ে বেশি দাম দিতে হয়। Senior হওয়া মানে আরও লম্বা command-এর তালিকা মুখস্থ রাখা নয়। আপনি জানেন commit আসলে
*কী*। তাই `rebase`, `cherry-pick` আর `reset --hard` type করার আগেই বলতে পারেন এগুলো কী করবে। আর অন্য কিছু করে
বসলে কীভাবে ফিরে আসবেন, সেটাও জানেন।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------ | -------------------- |
| 01 | [Git-এর মূল কথা ও Recovery](#ch-git-fundamentals) | Commit কী, আর যে কাজ হারিয়ে গেছে ভেবেছিলেন সেটা ফিরে পাবেন কীভাবে? |
| 02 | [Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow) | কোন branching model, কোন change সহজে review করা যায়, আর একটি repository না অনেকগুলো? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর পাতার part-স্তরের লক্ষণগুলোর ওপর, Git নিয়ে দুটি প্রশ্ন:

- **আপনি কি ফিরিয়ে আনতে পারেন?** "আপনি এক সহকর্মীর branch-এর ওপর force-push করে দিয়েছেন। এখন কী করবেন?" Senior
  engineer সোজা reflog-এ যান, আর বুঝিয়ে বলেন object-গুলো কেন এখনো আছে। Git খুব কমই কিছু মুছে ফেলে।
- **আপনার branching model-এর পেছনে কোনো যুক্তি আছে?** শুধু GitFlow-এর নাম বলার কোনো দাম নেই। দাম আছে এই কথার: দীর্ঘদিন
  বেঁচে থাকা branch merge conflict-কে সময় মেলানোর সমস্যা বানিয়ে ফেলে। আর trunk-based development সেই সমস্যার বদলে
  feature flag আর ভালো test দাবি করে।

## পড়ার ক্রম

আগে 01, তারপর 02। অধ্যায় 02 ধরে নেয় যে commit graph-টা আপনি চোখের সামনে দেখতে পান। কারণ "squash না rebase merge"
আসলে প্রশ্ন হলো commit-গুলোর কী হয়।
