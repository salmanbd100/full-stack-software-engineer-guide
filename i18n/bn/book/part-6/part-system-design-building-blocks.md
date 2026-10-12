---
sourceHash: "5b5fc4c26d3a89dce2ae6b271bc14d5d4cebf55fa2c5930ccd799f614e2ac557"
title: "Part VI — Building Block"
translatedAt: "2026-10-12T12:23:59.875Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — Building Block

প্রতিটি design round তৈরি হয় component-এর একই ছোট একটি set দিয়ে। প্রতিটি কী দেয়, কী খরচ করায়, আর কোথায় fail করে,
তা শিখুন। তারপর বেশিরভাগ architecture-এর প্রশ্ন দাঁড়ায় একটিতে: requirement আসলে কোনগুলোর দাম মেটায়।

এই অংশটি পড়ুন trade-off-এর জন্য, product-এর নামের জন্য নয়। Cache একটি cache-ই, সেটা Redis হোক বা Memcached।
গুরুত্বপূর্ণ হলো invalidation strategy আর stampede।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Load Balancing](#ch-load-balancing) | L4 নাকি L7, আর একটি node মরে যাওয়ার মুহূর্তে কী হয়? |
| 02 | [Caching](#ch-caching) | কী cache করবেন, কোথায়, আর এটা কীভাবে stale হয় |
| 03 | [Content Delivery Network](#ch-cdn) | কতটা traffic কখনো আপনার origin-এ পৌঁছায় না? |
| 04 | [Queue, Async কাজ ও WebSocket](#ch-message-queues) | কী request path থেকে সরে যায়, আর একটি live connection ধরে রাখার খরচ কত? |
| 05 | [Service Boundary ও API Gateway](#ch-service-boundaries) | কোথায় ভাগ করবেন, আর edge-এ কী থাকা উচিত? |
| 06 | [Resilience Pattern](#ch-resilience-patterns) | একটি dependency উত্তর দেওয়া বন্ধ করলে কী হয়? |

## Interviewer-রা যা যাচাই করেন

- **কাজ করে এমন সবচেয়ে সস্তা component-টা কি আপনি বেছে নেন?** যে কাজ একটি database row আর একটি cron job দিয়েই
  চলে, তার জন্য message broker প্রস্তাব করা over-engineering-এর একটি সাধারণ signal।
- **একটি component-এর খরচ কি আপনি বলতে পারেন?** Cache-এর খরচ staleness। Queue-এর খরচ eventual consistency আর
  duplicate delivery-র সমস্যা। Gateway-র খরচ একটি hop আর একটি shared component।
- **আপনি কি failure mode জানেন?** এখানকার প্রতিটি block-এর এমন একটি আছে, যেটা production-এ দেখা দেয়, tutorial-এ কখনো
  নয়। ভাবুন সেই health check, যেটা পুরো fleet নামিয়ে দেয়, cache stampede, retry storm।
- **আপনি কি business logic infrastructure-এর বাইরে রাখেন?** Gateway route করে; service সিদ্ধান্ত নেয়।

## পড়ার ক্রম

01 → 02 → 03 হলো সেই component-গুলো, যেগুলো প্রায় প্রতিটি round ছুঁয়ে যায়, একটি request যে ক্রমে এদের সাথে দেখা করে
সেই ক্রমে। 04-এ আছে request path থেকে কাজ সরানোর দুটো উপায়। 05 আর 06 একসাথে পড়ার। এরা এই অংশের distributed-systems
অর্ধেক।

**Interview sprint:** 01, 02 আর 04, তারপর 06।

> ⚠️ **File storage আর monitoring আছে Part VIII-এ**,
> [Chapter ?? — Cloud-এর মূল কথা, Storage ও Delivery](#ch-cloud-fundamentals) আর Observability অধ্যায়গুলোতে।
> WebSockets আর API gateway শেখানো হয়েছে সেই অধ্যায়গুলোর ভেতরে, যেগুলো এদের ব্যবহার করে।
