---
sourceHash: "5b5fc4c26d3a89dce2ae6b271bc14d5d4cebf55fa2c5930ccd799f614e2ac557"
title: "Part VI — Building Block"
translatedAt: "2026-10-17T13:59:05.279Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — Building Block

প্রতিটি design round একই ছোট একটি component-এর সেট দিয়ে তৈরি। প্রতিটি component কী দেয়, কী খরচ করায়, আর কোথায়
ভেঙে পড়ে, তা শিখে নিন। তারপর বেশিরভাগ architecture-এর প্রশ্ন দাঁড়ায় একটাই: requirement আসলে কোনগুলোর দাম
দেওয়ার মতো।

এই অংশটা পড়ুন tradeoff বোঝার জন্য, product-এর নাম মনে রাখার জন্য নয়। Redis হোক বা Memcached, cache তো cache-ই।
আসল কথা হলো invalidation strategy আর stampede।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------------- |
| 01 | [Load Balancing](#ch-load-balancing) | L4 না L7, আর কোনো node মারা গেলে ঠিক সেই মুহূর্তে কী হয়? |
| 02 | [Caching](#ch-caching) | কী cache করবেন, কোথায়, আর সেটা stale হয় কীভাবে |
| 03 | [Content Delivery Network](#ch-cdn) | কতটা traffic আপনার origin পর্যন্ত পৌঁছায়ই না? |
| 04 | [Queue, Async কাজ ও WebSocket](#ch-message-queues) | কোন কাজ request path থেকে সরে যায়, আর একটি live connection ধরে রাখতে কত খরচ? |
| 05 | [Service Boundary ও API Gateway](#ch-service-boundaries) | কোথায় ভাগ করবেন, আর edge-এ কী থাকা উচিত? |
| 06 | [Resilience Pattern](#ch-resilience-patterns) | কোনো dependency উত্তর দেওয়া বন্ধ করলে কী হয়? |

## Interviewer-রা যা যাচাই করেন

- **কাজ চলে এমন সবচেয়ে সস্তা component-টা কি বেছে নেন?** যে কাজ একটি database row আর একটি cron job দিয়েই হয়ে যায়,
  তার জন্য message broker প্রস্তাব করা over-engineering-এর একটি পরিচিত লক্ষণ।
- **একটি component-এর দাম বলতে পারেন?** Cache-এর দাম staleness। Queue-এর দাম eventual consistency, সঙ্গে একই
  message দুবার পৌঁছানোর সমস্যা। Gateway-এর দাম একটি বাড়তি hop, আর একটি shared component।
- **Failure mode জানেন?** এখানকার প্রতিটি block-এর এমন একটি failure আছে, যা production-এ দেখা দেয়, tutorial-এ কখনো
  নয়। যেমন যে health check পুরো fleet ফেলে দেয়, cache stampede, retry storm।
- **Business logic কি infrastructure থেকে দূরে রাখেন?** Gateway শুধু route করে, সিদ্ধান্ত নেয় service।

## পড়ার ক্রম

01 → 02 → 03 সেই component, যা প্রায় প্রতিটি round-এ আসে। Request যে ক্রমে এগুলোর মুখোমুখি হয়, সেই ক্রমেই সাজানো।
04-এ আছে request path থেকে কাজ সরানোর দুটি উপায়। 05 আর 06 একসঙ্গে পড়ার মতো। এ দুটি এই অংশের distributed-systems
দিক।

**Interview sprint:** 01, 02 আর 04, তারপর 06।

> ⚠️ **File storage আর monitoring আছে Part VIII-এ**,
> [Chapter ?? — Cloud-এর মূল কথা, Storage ও Delivery](#ch-cloud-fundamentals)-এ আর Observability-র অধ্যায়গুলোতে।
> WebSocket আর API gateway শেখানো হয়েছে সেই অধ্যায়গুলোর ভেতরেই, যেখানে এগুলো ব্যবহার হয়।
