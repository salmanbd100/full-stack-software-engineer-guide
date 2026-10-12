---
sourceHash: "dfed18deae7ce6a0cdb15dedf9f8f60961020aadee180ab14a8a19bd34ec7309"
title: "Part II — Browser API"
translatedAt: "2026-10-12T12:09:38.691Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — Browser API

কোনো framework আসার আগেই browser আপনাকে যা দেয়, তা নিয়ে ছয়টি অধ্যায়। এগুলো দেখায় state কোথায় থাকতে পারে,
কাজকে কীভাবে main thread থেকে দূরে রাখবেন, network ছাড়াও কীভাবে কাজ চালিয়ে যাবেন, আর কীভাবে user-এর ভাষায়
কথা বলবেন। Framework-গুলো ইচ্ছা করেই এর বেশিরভাগ আপনার ওপর ছেড়ে দেয়। পরিণতিও আপনার: security, পুরোনো data,
Arabic-এ ভাঙা layout।

সবগুলোর মধ্যে একটি সাধারণ সুতো আছে: এই প্রতিটি API-এর একটি ভুল উত্তর আছে, যেটা প্রায়ই production-এ চলে যায়।
Browser storage ছোট quota-র একটি database নয়। একটি service worker এমন cache নয়, যেটা আপনি purge করতে পারেন। একটি
translation file internationalisation নয়। প্রতিটি অধ্যায় শুরুতেই ভুল উত্তরটির নাম বলে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                  | কোন প্রশ্নের উত্তর দেয়                                                  |
| -- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 01 | [Web Storage ও IndexedDB](#ch-storage-apis)                            | কোন store, কখন IndexedDB তার খরচের যোগ্য, আর কেন কোনোটাই token রাখে না? |
| 02 | [Cookie ও SameSite](#ch-cookies-same-site)                            | কোন attribute একটি cookie পড়া বা replay হওয়া থামায়?           |
| 03 | [Observer API](#ch-observer-apis)                                   | Browser-কে সেকেন্ডে ষাটবার একই প্রশ্ন করা কীভাবে বন্ধ করবেন? |
| 04 | [Web Worker ও Main Thread](#ch-web-workers)                       | Input সামলানো thread থেকে কী সরানো যায়, আর তার খরচ কী? |
| 05 | [Service Worker, Caching ও Offline](#ch-service-workers)              | কোনো tab-কে আটকে না ফেলে একটি worker কীভাবে update করবেন, আর কোন request কোন strategy পায়? |
| 06 | [Internationalisation ও Intl API](#ch-i18n-fundamentals)          | নতুন করে না লিখে কীভাবে আরেকটি ভাষা, plural rule আর right-to-left চালু করবেন? |

## Interviewer-রা যা যাচাই করেন

এই part-এর senior সংকেত হলো **library-র আগে platform-এর দিকে হাত বাড়ানো।** বিশেষ করে এই API-গুলোর জন্য:

- **Access token কোথায় যায়?** Senior loop-এ browser storage নিয়ে এটাই সবচেয়ে সাধারণ প্রশ্ন, আর এর একটি সত্যিকারের
  উত্তর আছে। একটি `HttpOnly` cookie ব্যবহার করুন, কারণ JavaScript যা পড়তে পারে, একটি XSS তার সবই পড়তে পারে।
- **`SameSite=Lax` আসলে কী block করে, আপনি জানেন?** Cross-site POST, top-level GET navigation নয়। এটাকে CSRF-এর
  সম্পূর্ণ সুরক্ষা ভাবা একটি সাধারণ আর দামি ভুল।
- **Origin-এর সীমানা কী?** Storage scheme, host আর port অনুযায়ী ভাগ করা থাকে। "Data হারিয়ে গেছে" ধরনের বেশিরভাগ bug
  এটাই, অথবা storage-এর চাপে eviction।
- **একটি service worker কীভাবে update হয়?** যে fix "ship হয়নি", সেটা প্রায় সবসময় `waiting`-এ আটকে থাকা একটি নতুন
  worker। কেউ জিজ্ঞেস করার আগেই kill switch-এর কথা বলা একটি শক্তিশালী সংকেত।
- **`count === 1` কি যথেষ্ট?** বেশিরভাগ ভাষায় এটা ভুল। Senior উত্তর `Intl`-এর মাধ্যমে locale-কে জিজ্ঞেস করে, আর
  locale-কে URL-এ রাখে।

## পড়ার ক্রম

01 আর 02 আগে পড়ুন, একসঙ্গে। এরা "browser-এ state কোথায় থাকে"-র দুই অর্ধেক।
বাকিগুলো স্বাধীন। 05 পড়া সবচেয়ে ভালো 01-এর পরে, কারণ offline write queue থাকে IndexedDB-তে।

**Interview sprint:** 01 → 02 → 05। Token-এর প্রশ্ন, cookie attribute-এর প্রশ্ন আর service worker update-এর প্রশ্ন —
এই তিনটিই আসলে জিজ্ঞেস করা হয়। Product একাধিক ভাষায় চললে 06 পড়ুন।
