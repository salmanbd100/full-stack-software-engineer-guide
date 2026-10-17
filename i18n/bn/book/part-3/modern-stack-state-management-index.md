---
sourceHash: "ae163a1599f3268e87195087264479e8d506f93b734e9e57ff57f833d501e30a"
title: "State Management"
translatedAt: "2026-10-17T01:40:36.362Z"
model: "claude-opus-5-5 (Claude Code)"
---

# State Management

ক্ষেত্রটা বদলে গেছে, সঙ্গে interview-ও। "কোন state library ব্যবহার করেন?" ছিল 2019-এর প্রশ্ন, যার উত্তর এক শব্দে
হয়ে যেত। 2026–27-এর প্রশ্ন হলো **এটা কোন ধরনের state?** Server state, client state, form state আর URL state চারটি
আলাদা সমস্যা। যে tool এদের একটি ভালোভাবে সমাধান করে, বাকিগুলো সেটা দিয়ে খারাপভাবেই সামলানো হয়।

এখানে পাঁচটি অধ্যায়। অধ্যায় 01 ধরনগুলো ঠিক করে দেয়, আর 02–05 একেকটি করে ধরন নিয়ে কথা বলে। অধ্যায় 03 signal-ও
দেখে, model যেদিকে যাচ্ছে। Redux আর default নয়। Download-এ Zustand ওকে ছাড়িয়ে গেছে, আর server state এখন TanStack
Query-র দখলে। তবে অধ্যায়গুলো যুক্তি দেয় সমস্যা থেকে, download-এর সংখ্যা থেকে নয়।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                     | কোন প্রশ্নের উত্তর দেয়                                           |
| -- | --------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [চার ধরনের State](#ch-four-kinds-of-state)                                  | Server, client, form নাকি URL — এটা কোনটা, আর প্রশ্নটা কেন করবেন? |
| 02 | [TanStack Query দিয়ে Server State](#ch-server-state)                       | নিজে cache না লিখে কীভাবে cache, invalidate আর refetch করবেন?     |
| 03 | [Client State ও Signal](#ch-client-state)                                  | Zustand, Jotai, Context নাকি signal — আর কখন এখনও `useState`-ই জেতে? |
| 04 | [Form State](#ch-form-state)                                                | Server-ও যখন validate করে, তখন validation কোথায় থাকবে?          |
| 05 | [State হিসেবে URL](#ch-url-as-state)                                            | Refresh, back button আর paste করা link-এর পরেও কী টিকে থাকা উচিত? |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, state নিয়ে দুটি প্রশ্ন:

- **"এই data কোথায় থাকে?"** Server-এর data client store-এ রাখা চিরচেনা ভুল, আর দামি ভুল। এতে আপনি নিজে হাতে এমন
  একটি cache লিখে ফেলেছেন, যার কোনো staleness policy নেই, deduplication নেই, invalidation-ও নেই। যে উত্তর নম্বর
  পায়, সেটা একে store-এর সমস্যা নয়, cache-এর সমস্যা হিসেবে চিনতে পারে।
- **"কোন state URL-এ থাকা উচিত?"** User যা share করতে, bookmark করতে বা back button দিয়ে ফিরে পেতে চাইবেন, সবই:
  filter, tab, pagination, table-এর খোলা row। যে candidate কখনো URL-এর কথা ভাবেন না, তাঁরা এমন dashboard বানান
  যার link কেউ দিতে পারে না। আর enterprise reviewer-রা এটা ঠিকই খেয়াল করেন।

## পড়ার ক্রম

আগে 01 পড়ুন। বাকি চারটি অধ্যায় এর কাঠামোই ব্যবহার করে, আর আকারের তুলনায় Part III-এর সবচেয়ে কাজের অধ্যায় এটাই।
তারপর আপনার সামনে যে সমস্যা, সেই অধ্যায়টা পড়ুন। অধ্যায় 02–05 একটি আরেকটির ওপর নির্ভর করে না।

অধ্যায় 03-এর signal-এর অংশটা Svelte 5 runes অধ্যায়ের সঙ্গে জোড়া। ওটার পরে পড়ুন।

**Interview sprint:** 01 → 02। চারটি ধরন আর server-state caching মিলিয়ে senior round-এ state নিয়ে যা জিজ্ঞেস করা হয়,
তার বেশিরভাগই ঢাকা পড়ে।
