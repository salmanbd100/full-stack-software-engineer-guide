---
sourceHash: "c235c2b9b774ba928400283fc749e1241de1770afff4e2468093d881cd65569c"
title: "Part VI — Frontend System Design"
translatedAt: "2026-10-19T07:54:02.303Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — Frontend System Design

Internet-এর বাকি জায়গা এই অংশটা নিয়ে কথা বলে না, অথচ interview-তে এটাই আপনাকে সবচেয়ে বেশি জিজ্ঞেস করা হবে।
Frontend system design round কোনো ছোট আকারের backend round নয়। এর সীমাবদ্ধতা আলাদা। Runtime আপনার হাতে নেই,
আর network-এর ওপর ভরসা করা যায় না। সঙ্গে আছে bundle budget, accessibility-র একটা ন্যূনতম মান, আর প্রতিটি route-এর
জন্য একটা rendering strategy, যার পক্ষে আপনাকে যুক্তি দিতে হবে।

Frontend round কীভাবে চালাবেন, সেটা এখন [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)-এর দ্বিতীয় অর্ধেক।
সেখানে আছে client application-এর জন্য RADIO, আর কোন ধরনের state কোথায় থাকে। বাকিটা বাদ দিলেও ওটা আগে পড়ুন।
Frontend round-এ নম্বর ওঠে আপনি round-টা কীভাবে চালাচ্ছেন, তা দেখে।

> ⚠️ **এই অংশটা round চালানো নিয়ে, codebase সাজানো নিয়ে নয়।** Architecture pattern, micro-frontend আর design
> system আছে Part IV-এর architecture অধ্যায়গুলোতে। Asset delivery আর error tracking আছে তার performance অধ্যায়গুলোতে।
> Rendering আর state management হলো Part III। এখানে আছে সেটুকু, যা দিয়ে frontend design round আসলে শুরু হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Frontend-এ Real-Time Feature](#ch-frontend-real-time-features) | Connection কেটে গেলে client-এর কী হয়? |
| 02 | [Offline-First Architecture](#ch-offline-first-architecture) | ট্রেনে বসে কী হয়, আর পরে সব মেলানো হয় কীভাবে? |
| 03 | [Frontend Authentication](#ch-frontend-authentication) | Token কোথায় থাকে, আর client-কে কতটুকু জানানো যায়? |

Backend case study-র পাশেই [Part VI — Case Study](#ch-part-system-design-case-studies)-এ আছে দুটি frontend
case study: collaborative editor আর infinite feed। প্রতিটিতে পুরো framework শুরু থেকে শেষ পর্যন্ত চালানো হয়েছে।
Crawler কী দেখে, সেটা আছে Part III-এর [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)-এ।

## Interviewer-রা যা যাচাই করেন

Senior হওয়ার লক্ষণ হলো: **প্রতিটি route-এর জন্য rendering strategy বেছে নেন আর তার পক্ষে যুক্তি দিতে পারেন;
framework-কে দেখেন implementation-এর খুঁটিনাটি হিসেবে।** নির্দিষ্ট করে বললে:

- **যে network সত্যিই পাবেন, তার জন্য design করছেন তো?** Offline, অনির্ভরযোগ্য আর ধীর — তিনটি আলাদা সমস্যা, তিনটির
  উত্তরও আলাদা। যে candidate শুধু "online"-এর জন্য design করেন, তিনি নিজের সম্পর্কে অনেক কিছু জানিয়ে দেন।
- **Server state আর client state আলাদা করতে পারেন?** এই ভাগটা করলেই state management-এর বেশিরভাগ তর্ক থেমে যায়।
  যে candidate API response রাখতে global store খোঁজেন, তিনি ভাগটা করেননি।
- **Budget ঠিক করেন?** Bundle size, request-এর সংখ্যা, আর interaction latency-র একটা লক্ষ্য। যে design-এ কোনো
  সংখ্যা নেই, সেটা আসলে ইচ্ছের তালিকা।
- **Accessibility design-এর ভেতরে আছে, নাকি follow-up প্রশ্নে?** Design round-এ কেউ জিজ্ঞেস করার আগেই focus
  management বা live region-এর কথা তোলা senior হওয়ার জোরালো লক্ষণ।

## পড়ার ক্রম

01 → 02 হলো মেরুদণ্ড। Frontend design-এর উত্তরকে backend-এর উত্তর থেকে যে দুটি network সমস্যা আলাদা করে, এই দুটি
অধ্যায় সেগুলো নিয়ে। Happy path আঁকা হয়ে গেলে সবচেয়ে বেশি যে follow-up আসে, সেটা 03।

**Interview sprint:** `Fundamentals/01`, তারপর এখানকার 01। কোনো নির্দিষ্ট domain নিয়ে খোঁচাখুঁচি শুরুর আগে frontend
design round যা জিজ্ঞেস করে, তার বেশিরভাগ এই দুটিতেই আছে।
