---
sourceHash: "c235c2b9b774ba928400283fc749e1241de1770afff4e2468093d881cd65569c"
title: "Part VI — Frontend System Design"
translatedAt: "2026-10-12T12:25:49.913Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — Frontend System Design

এই অংশটা internet-এর বাকি জায়গা cover করে না, আর interview-এ এটা নিয়েই প্রশ্ন আসার সম্ভাবনা সবচেয়ে বেশি। Frontend
system design round একটি ছোট backend round নয়। এর নিজস্ব সীমাবদ্ধতা আছে। Runtime আপনার নিয়ন্ত্রণে নেই, আর network-এর
ওপর ভরসা করা যায় না। আপনার কাঁধে আরও আছে একটি bundle budget, accessibility-র একটি ন্যূনতম মান, আর প্রতিটি route-এর
জন্য একটি rendering strategy, যেটা আপনাকে defend করতে হবে।

একটি frontend round কীভাবে চালাবেন, সেটা এখন [Chapter ?? — Design Round চালানো, Backend ও Frontend](#ch-driving-the-round)-এর
দ্বিতীয় অর্ধেক। সেখানে আছে একটি client application-এর জন্য RADIO, আর কোন ধরনের state কোথায় থাকে। বাকিটা বাদ দিলেও
এটা আগে পড়ুন। একটি frontend round-এর নম্বর ঠিক হয় আপনি সেটা কীভাবে চালান তা দিয়ে।

> ⚠️ **এই অংশ একটি round চালানো নিয়ে, codebase সাজানো নিয়ে নয়।** Architecture pattern, micro-frontend আর design
> system আছে Part IV-এর architecture অধ্যায়গুলোতে, আর asset delivery ও error tracking তার performance অধ্যায়গুলোতে।
> Rendering আর state management হলো Part III। এখানে যা আছে, একটি frontend design round সত্যিই তা দিয়েই শুরু হয়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Frontend-এ Real-Time Feature](#ch-frontend-real-time-features) | Connection কেটে গেলে client-এর কী হয়? |
| 02 | [Offline-First Architecture](#ch-offline-first-architecture) | Train-এ বসে কী হয়, আর পরে কীভাবে মিলিয়ে নেয়? |
| 03 | [Frontend Authentication](#ch-frontend-authentication) | Token কোথায় থাকে, আর client-কে কী জানানো যায়? |

দুটি frontend case study backend-এরটির পাশে বসে আছে, [Part VI — Case Study](#ch-part-system-design-case-studies)-এ:
collaborative editor আর infinite feed। প্রতিটি পুরো framework শুরু থেকে শেষ পর্যন্ত চালায়। Crawler কী দেখে, সেটা
Part III-এর [Chapter ?? — প্রতিটি Route-এর জন্য Rendering Strategy বাছাই, SEO সহ](#ch-choosing-per-route)।

## Interviewer-রা যা যাচাই করেন

Senior হওয়ার সংকেত হলো **প্রতিটি route-এর জন্য একটি rendering strategy বাছা আর সেটা defend করতে পারা; framework-কে
একটি implementation detail হিসেবে দেখা।** বাস্তবে:

- **আপনি কি আসলে যে network পান, তার জন্য design করেন?** Offline, অস্থির আর ধীর — তিনটি আলাদা সমস্যা, তিনটির
  উত্তরও আলাদা। যে candidate শুধু "online"-এর জন্য design করেন, তিনি অনেক কিছু প্রকাশ করে ফেলেন।
- **আপনি কি server state আর client state আলাদা করতে পারেন?** এই ভাগটা করলেই বেশিরভাগ state-management বিতর্ক শেষ হয়ে
  যায়। যে candidate API response রাখার জন্য একটি global store ধরেন, তিনি এই ভাগটা করেননি।
- **আপনি কি budget করেন?** Bundle size, request-এর সংখ্যা, আর একটি interaction latency target। যে design-এ কোনো
  সংখ্যা নেই, সেটা একটি ইচ্ছার তালিকা।
- **Accessibility কি design-এ আছে, নাকি পরের প্রশ্নে?** Design round-এ কেউ না জিজ্ঞেস করতেই focus management বা
  live region-এর কথা তোলা একটি শক্তিশালী senior সংকেত।

## পড়ার ক্রম

01 → 02 হলো মেরুদণ্ড। এরা সেই দুটি network সমস্যা cover করে, যেগুলো একটি frontend design উত্তরকে backend-এর উত্তর থেকে
আলাদা করে। Happy path আঁকা হয়ে গেলে সবচেয়ে সাধারণ পরের প্রশ্ন হলো 03।

**Interview sprint:** `Fundamentals/01`, তারপর এখানকার 01। একটি frontend design round কোনো নির্দিষ্ট domain-এ খোঁচাখুঁচি
শুরু করার আগে যা জিজ্ঞেস করে, তার বেশিরভাগই এই দুটিতে আছে।
