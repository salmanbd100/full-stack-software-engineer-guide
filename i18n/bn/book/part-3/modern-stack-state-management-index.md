---
sourceHash: "ae163a1599f3268e87195087264479e8d506f93b734e9e57ff57f833d501e30a"
title: "State Management"
translatedAt: "2026-10-12T12:11:09.590Z"
model: "claude-opus-5-5 (Claude Code)"
---

# State Management

ক্ষেত্রটা বদলেছে, আর interview-ও তার সঙ্গে বদলেছে। "আপনি কোন state library ব্যবহার করেন?" ছিল 2019-এর প্রশ্ন,
যার উত্তর এক শব্দে। 2026–27-এর প্রশ্ন হলো **এটা কোন ধরনের state?** Server state, client state, form state আর URL
state চারটি আলাদা সমস্যা। যে tool এর একটি ভালোভাবে সমাধান করে, সেটা বাকিগুলো খারাপভাবে সমাধান করে।

পাঁচটি অধ্যায়। অধ্যায় 01 ভাগগুলো ঠিক করে, আর অধ্যায় 02–05 একেকটি করে নেয়। অধ্যায় 03 signal-ও দেখে, যেদিকে
model-টি এগোচ্ছে। Redux আর default নয়। Download-এ Zustand একে ছাড়িয়ে গেছে, আর server state-এর মালিক TanStack
Query। তবে অধ্যায়গুলো যুক্তি দেয় সমস্যা থেকে, download থেকে নয়।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                    | কোন প্রশ্নের উত্তর দেয়                                          |
| -- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [চার ধরনের State](#ch-four-kinds-of-state)                                | Server, client, form নাকি URL — এটা কোনটা, আর প্রশ্নটা কেন করবেন? |
| 02 | [TanStack Query দিয়ে Server State](#ch-server-state)                      | নিজে একটি cache না লিখে কীভাবে cache, invalidate আর refetch করবেন? |
| 03 | [Client State ও Signal](#ch-client-state)                                 | Zustand, Jotai, Context নাকি signal — আর কখন `useState` এখনো জেতে? |
| 04 | [Form State](#ch-form-state)                                              | Server-ও যখন validate করে, তখন validation কোথায় থাকে?           |
| 05 | [State হিসেবে URL](#ch-url-as-state)                                       | Refresh, back button আর paste করা link-এর পরেও কী টিকে থাকা উচিত? |

## Interviewer-রা যা যাচাই করেন

Part III-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, state নিয়ে দুটো প্রশ্ন:

- **"এই data কোথায় থাকে?"** Server data একটি client store-এ রাখা চিরাচরিত ভুল, আর দামি ভুল। আপনি হাতে একটি cache
  লিখেছেন, যার কোনো staleness policy নেই, deduplication নেই, invalidation নেই। যে উত্তর নম্বর পায়, সেটা একে একটি
  cache-এর সমস্যা বলে চিহ্নিত করে, store-এর সমস্যা নয়।
- **"কোন state URL-এ থাকা উচিত?"** এমন যেকোনো কিছু, যা একজন user share করতে, bookmark করতে বা back button দিয়ে
  ফিরে পেতে চাইবেন: filter, tab, pagination, একটি table-এর খোলা row। যে candidate-রা কখনো URL-এর কথা ভাবেন না,
  তাঁরা এমন dashboard বানান যার link কেউ দিতে পারে না। আর enterprise reviewer-রা এটা খেয়াল করেন।

## পড়ার ক্রম

আগে 01 পড়ুন। বাকি চারটি অধ্যায় এর কাঠামোই ব্যবহার করে, আর দৈর্ঘ্যের তুলনায় Part III-এ এটাই সবচেয়ে কাজের অধ্যায়।
তারপর আপনার সামনে যে সমস্যা, সেই অধ্যায় পড়ুন। অধ্যায় 02–05 একটি আরেকটির ওপর নির্ভর করে না।

অধ্যায় 03-এর signal-এর অংশটি Svelte 5 runes অধ্যায়ের সঙ্গে জোড়া। সেটার পরে এটা পড়ুন।

**Interview-এর তাড়াহুড়োয়:** 01 → 02। চারটি ভাগ আর server-state caching মিলে, একটি senior round state নিয়ে যা
জিজ্ঞেস করে তার বেশিরভাগই ঢেকে দেয়।
