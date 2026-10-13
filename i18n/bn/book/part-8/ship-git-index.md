---
sourceHash: "426029f9b52ef2a5658639c53a8d1ad65949c29e3e81dcee9c3384b4698face4"
title: "Git দিয়ে Version Control"
translatedAt: "2026-10-13T03:03:40.383Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Git দিয়ে Version Control

এই part-এ Git হলো সেই tool, যেটা আপনি প্রতিটি কর্মদিবসের প্রতিটি ঘণ্টায় ছোঁন। নড়বড়ে mental model-এর দামও
সবচেয়ে বেশি দিতে হয় এখানেই। Senior রূপটা command-এর একটি লম্বা তালিকা নয়। আপনি জানেন একটি commit আসলে *কী*, তাই
type করার আগেই বলতে পারেন `rebase`, `cherry-pick` আর `reset --hard` কী করবে। আর অন্য কিছু করে ফেললে কীভাবে ফিরে
আসবেন, সেটাও জানেন।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                                 | কোন প্রশ্নের উত্তর দেয়                                         |
| -- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| 01 | [Git-এর মূল কথা ও Recovery](#ch-git-fundamentals)                                      | Commit কী, আর হারিয়ে গেছে ভাবা কাজ কীভাবে ফিরিয়ে আনবেন? |
| 02 | [Branching, Review ও Repository Strategy](#ch-branching-and-review-workflow)          | কোন branching model, কী একটি change-কে review করার উপযোগী করে, আর একটি repository নাকি অনেকগুলো? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, Git নিয়ে দুটো প্রশ্ন:

- **আপনি কি recover করতে পারেন?** "আপনি একজন সহকর্মীর branch-এর ওপর force-push করে ফেলেছেন। এখন কী?" একজন
  senior reflog-এর দিকে হাত বাড়ান, আর ব্যাখ্যা করেন কেন object-গুলো এখনো আছে। Git খুব কমই কিছু delete করে।
- **আপনার branching model-এর পেছনে কি কোনো কারণ আছে?** GitFlow-এর নাম বলার কোনো মূল্য নেই। এটা বলার মূল্য অনেক:
  দীর্ঘজীবী branch merge conflict-কে একটি scheduling সমস্যায় পরিণত করে, আর trunk-based development তার বদলে
  feature flag আর আরও ভালো test নেয়।

## পড়ার ক্রম

01, তারপর 02। অধ্যায় 02 ধরে নেয় আপনি commit graph-টি মনে মনে দেখতে পান, কারণ "squash নাকি rebase merge" প্রশ্নটা
আসলে commit-গুলোর কী হয় তা নিয়ে।
