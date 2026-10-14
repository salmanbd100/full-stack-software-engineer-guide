---
sourceHash: "dfed18deae7ce6a0cdb15dedf9f8f60961020aadee180ab14a8a19bd34ec7309"
title: "Part II — Browser API"
translatedAt: "2026-10-14T04:51:43.987Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — Browser API

কোনো framework আসার আগেই browser আপনাকে যা দেয়, তা নিয়ে ছয়টি অধ্যায়। State কোথায় থাকতে পারে, main thread থেকে কাজ
কীভাবে সরিয়ে রাখবেন, network না থাকলেও কীভাবে কাজ চালিয়ে যাবেন, আর user-এর ভাষায় কীভাবে কথা বলবেন। Framework-গুলো
ইচ্ছে করেই এর বেশিরভাগ আপনার ওপর ছেড়ে দেয়। ফলের দায়ও আপনার: security, পুরনো data, আরবিতে ভাঙা layout।

পুরো অংশের মূল সুর হলো, এই প্রতিটি API-র একটা করে ভুল উত্তর আছে, যা প্রায়ই production-এ চলে যায়। Browser storage
ছোট quota-র database নয়। Service worker এমন cache নয়, যা ইচ্ছেমতো মুছে ফেলা যায়। অনুবাদের file মানেই
internationalisation নয়। প্রতিটি অধ্যায় আগে ভুল উত্তরটার নাম বলে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                  | কোন প্রশ্নের উত্তর দেয়                                          |
| -- | ------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| 01 | [Web Storage ও IndexedDB](#ch-storage-apis)                              | কোন store, কখন IndexedDB-র খরচ পোষায়, আর কেন কোনোটাতেই token রাখা চলে না? |
| 02 | [Cookie ও SameSite](#ch-cookies-same-site)                               | কোন attribute থাকলে cookie পড়া বা আবার পাঠানো যায় না?          |
| 03 | [Observer API](#ch-observer-apis)                                        | Browser-কে সেকেন্ডে ষাটবার একই প্রশ্ন করা কীভাবে থামাবেন?          |
| 04 | [Web Worker ও Main Thread](#ch-web-workers)                              | Input সামলানো thread থেকে কী সরানো যায়, আর তার খরচ কত?          |
| 05 | [Service Worker, Caching ও Offline](#ch-service-workers)                 | কোনো tab আটকে না ফেলে worker কীভাবে update করবেন, আর কোন request কোন strategy পাবে? |
| 06 | [Internationalisation ও Intl API](#ch-i18n-fundamentals)                 | পুরোটা নতুন করে না লিখে কীভাবে আরেকটা ভাষা, plural-এর নিয়ম আর right-to-left ship করবেন? |

## Interviewer-রা যা যাচাই করেন

এই part-এ senior-এর লক্ষণ হলো **library-র দিকে হাত বাড়ানোর আগে platform-এর দিকে তাকানো।** এই API-গুলোর বেলায়
বিশেষ করে:

- **Access token কোথায় যায়?** Senior interview-এ browser storage নিয়ে সবচেয়ে বেশি জিজ্ঞেস করা প্রশ্ন এটাই, আর এর
  একটা সত্যিকারের উত্তর আছে। `HttpOnly` cookie, কারণ JavaScript যা পড়তে পারে, XSS-ও তা পড়তে পারে।
- **`SameSite=Lax` আসলে কী আটকায়, জানেন?** Cross-site POST, top-level GET navigation নয়। একে CSRF-এর পুরো সুরক্ষা
  ভাবা একটা চেনা আর দামি ভুল।
- **Origin-এর সীমা কী?** Storage ভাগ হয় scheme, host আর port ধরে। "Data উধাও হয়ে গেল" ধরনের বেশিরভাগ bug এটাই,
  নয়তো storage-এর চাপে eviction।
- **Service worker কীভাবে update হয়?** "Ship হয়নি" এমন fix প্রায় সবসময়ই `waiting`-এ আটকে থাকা নতুন একটা worker।
  জিজ্ঞেস না করতেই kill switch-এর নাম বলা জোরালো লক্ষণ।
- **`count === 1` কি যথেষ্ট?** বেশিরভাগ ভাষায় এটা ভুল। Senior-এর উত্তর `Intl` দিয়ে locale-কে জিজ্ঞেস করে, আর locale
  রাখে URL-এ।

## পড়ার ক্রম

আগে 01 আর 02 একসঙ্গে পড়ুন। "Browser-এ state কোথায় থাকে" প্রশ্নের দুই অর্ধেক এরাই। বাকিগুলো স্বাধীন। 05 সবচেয়ে
ভালো বোঝা যায় 01-এর পরে, কারণ offline write queue থাকে IndexedDB-তে।

**Interview sprint:** 01 → 02 → 05। Token-এর প্রশ্ন, cookie attribute-এর প্রশ্ন আর service worker update-এর
প্রশ্ন, আসলে জিজ্ঞেস করা হয় এই তিনটিই। Product একাধিক ভাষায় ship হলে 06 পড়ুন।
