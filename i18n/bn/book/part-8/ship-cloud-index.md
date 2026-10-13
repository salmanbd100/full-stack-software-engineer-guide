---
sourceHash: "a9fe7f2fdc9dcfa2d29243c08183ddfd6abe6d92d3d63d04f010cba4fa35d7cd"
title: "Cloud-এর প্রয়োজনীয় বিষয়"
translatedAt: "2026-10-13T03:02:06.387Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Cloud-এর প্রয়োজনীয় বিষয়

Cloud আলাদা আলাদা হয়, কিন্তু মৌলিক উপাদানগুলো একই। প্রতিটি provider আপনাকে তিনটি জিনিস দেয়: server ছাড়া code
চালানোর একটি জায়গা, file রাখার একটি জায়গা যেটা disk নয়, আর এমন কিছু যা সেই file-গুলো user-এর কাছাকাছি cache করে।
একজন frontend-heavy full stack engineer এই তিনটি সারাক্ষণ ব্যবহার করেন, আর প্রায় অন্য কিছুই না।

প্রতিটি অধ্যায় আগে নীতিটা বলে, কোনো brand-এর নাম ছাড়া। তারপর product-গুলোর নাম বলে। AWS সবচেয়ে বেশি আসে, কারণ
বেশিরভাগ interview panel ধরে নেয় আপনি সেটাই জানেন। যেখানে frontend-এর ক্ষেত্রে পার্থক্য আছে, সেখানে Vercel আর
Cloudflare আসে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                | কোন প্রশ্নের উত্তর দেয়                                            |
| -- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Cloud-এর মূল কথা, Storage ও Delivery](#ch-cloud-fundamentals)    | Security-র কোন অর্ধেক আপনার দায়িত্ব, আর user-এর file কীভাবে store ও serve করবেন? |
| 02 | [Serverless Function](#ch-serverless-functions)                      | Deploy আর handler-এর মাঝে কী ঘটে, আর একটি cold start-এর খরচ কত? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, cloud নিয়ে দুটি প্রশ্ন:

- **আপনি কি নীতিকে product থেকে আলাদা করতে পারেন?** "User-এর upload করা file কীভাবে serve করবেন?" — এর উত্তরে
  চাওয়া হয় object storage, একটি presigned URL আর সামনে একটি cache। Bucket setting-এর তালিকা চাওয়া হয় না।
- **আপনি কি জানেন একটি cold start-এর খরচ কত?** Bundle size, connection reuse, আর load হঠাৎ হঠাৎ বাড়ে নাকি স্থির
  থাকে — এগুলোর প্রতিটিই উত্তর বদলে দেয়।

## পড়ার ক্রম

শব্দগুলোর জন্য আগে 01 পড়ুন: region, managed-service-এর সিঁড়ি আর দায়িত্বের সীমারেখা। তারপর 02 পড়ুন।
