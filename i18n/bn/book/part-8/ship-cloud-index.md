---
sourceHash: "a9fe7f2fdc9dcfa2d29243c08183ddfd6abe6d92d3d63d04f010cba4fa35d7cd"
title: "Cloud-এর প্রয়োজনীয় বিষয়"
translatedAt: "2026-10-19T07:55:18.949Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Cloud-এর প্রয়োজনীয় বিষয়

Cloud আলাদা আলাদা, কিন্তু মৌলিক উপাদানগুলো একই। প্রতিটি provider আপনাকে তিনটি জিনিস দেয়: server ছাড়া code চালানোর
একটি জায়গা, disk নয় এমন একটি জায়গা যেখানে file রাখা যায়, আর এমন কিছু যা সেই file-গুলো user-এর কাছাকাছি cache
করে রাখে। একজন frontend-heavy full stack engineer এই তিনটি সারাক্ষণ ব্যবহার করেন, বাকি প্রায় কিছুই না।

প্রতিটি অধ্যায় আগে নীতিটা বলে, কোনো brand-এর নাম ছাড়া। তারপর product-গুলোর নাম আসে। AWS আসে সবচেয়ে বেশি, কারণ
বেশিরভাগ interview panel ধরে নেয় আপনি AWS জানেন। যেখানে frontend-এর জন্য ব্যাপারটা আলাদা, সেখানে Vercel আর
Cloudflare আসে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                | কোন প্রশ্নের উত্তর দেয়                                            |
| -- | --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 01 | [Cloud-এর মূল কথা, Storage ও Delivery](#ch-cloud-fundamentals)          | Security-র কোন অর্ধেক আপনার দায়িত্ব, আর user-এর file কীভাবে রাখবেন ও serve করবেন? |
| 02 | [Serverless Function](#ch-serverless-functions)                       | Deploy থেকে handler পর্যন্ত মাঝে কী ঘটে, আর একটি cold start-এর দাম কত? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের signal-গুলোর ওপর, cloud নিয়ে দুটি প্রশ্ন:

- **নীতি আর product আলাদা করতে পারেন?** "User-এর upload কীভাবে serve করবেন?" প্রশ্নে চাওয়া হয় object storage,
  একটি presigned URL আর সামনে একটি cache। Bucket-এর setting-এর তালিকা কেউ চায় না।
- **একটি cold start-এর দাম কত, জানেন?** Bundle-এর আকার, connection আবার ব্যবহার করা, আর load হঠাৎ হঠাৎ বাড়ে নাকি
  স্থির থাকে, এই সবকিছুই উত্তর বদলে দেয়।

## পড়ার ক্রম

শব্দগুলোর জন্য আগে 01 পড়ুন: region, managed service-এর মই আর দায়িত্বের সীমারেখা। তারপর 02।
