---
sourceHash: "83eda17e7a186dd4d25899851bcb708a6eeb9b461360fb7b892eb2e1bbbf4f14"
title: "লেখক পরিচিতি"
translatedAt: "2026-10-19T10:28:51.839Z"
model: "claude-opus-5-5 (Claude Code)"
---

# লেখক পরিচিতি {#ch-about-the-author}

> বইটা কে লিখেছেন, রোজ আসলে কী বানান, আর বইয়ের গড়ন কেন এমন।

**এই অধ্যায়ে:** পটভূমি · রোজকার stack · বইটা কেন frontend-heavy · যোগাযোগ

## 💡 মূল ধারণা

**Salman Rahman** একজন senior frontend engineer, অভিজ্ঞতা নয় বছরের। রোজকার কাজ SvelteKit, Svelte 5 runes আর
TypeScript-এ, পাশে Sanity studio। বাকি সব কাজে React, Next.js, Node.js, Express আর GraphQL। এই বইয়ের গড়ন
ঠিক করেছে যে বিষয়গুলোতে বিশেষ দক্ষতা, সেগুলো হলো enterprise-scale architecture, WCAG accessibility, web
performance আর state management।

এই পটভূমি থেকেই দুটি সিদ্ধান্ত এসেছে, যা পড়তে গিয়ে আপনার চোখে পড়বে।

**বইটা কেন frontend-heavy।** লেখক নিজে যে role-এ কাজ করেন, বইটা সেই role-এর জন্যই লেখা। এমন একজন, যিনি পুরো
frontend-এর দায়িত্ব নেন। Backend-এ, system design round-এ, আর এখন AI feature-এও যাঁকে বিশ্বাসযোগ্য হতে হয়,
অথচ এর কোনোটারই specialist সাজার ভান করতে হয় না। Part V-এর পরিধি ঠিক হয়েছে একটি প্রশ্ন দিয়ে: *এমন
engineer-কে আসলে কী জিজ্ঞেস করা হয়, আর আসলে কী বানাতে হয়*। Backend-এর কোনো curriculum কী কী পড়ায়,
সেটা দিয়ে নয়।

**তিনটি framework-এর একটি কেন Svelte।** সংখ্যার হিসেবেও Svelte জায়গাটা পায়। বছরের পর বছর developer-satisfaction
survey-তে Svelte শীর্ষে বা তার কাছাকাছি থেকেছে। তবে বইয়ে এটা আছে আসল কারণে: এটা লেখকের রোজকার stack। তাই এই
অংশের লেখাতেই সবচেয়ে বেশি হাতে-কলমে অভিজ্ঞতা আছে। যে framework দিয়ে সোমবার ship করবেন, সেটা নিয়ে লেখা আর
শুধু docs পড়ে চেনা framework নিয়ে লেখা পড়তে আলাদা লাগে।

AI UX-এর অধ্যায়গুলো আছে ঠিক উল্টো দিক থেকে একই কারণে। AI engineering-এর বই লেখেন backend আর machine-learning-এর
লোকেরা। তাই interface-এর স্তর, মানে latency, generative UI, citation আর trust, model refuse করলে বা time out হলে
কী হবে, সেই অধ্যায়টাই সেসব বইয়ে বরাবর সবচেয়ে দুর্বল। এখানে সেটা লিখেছেন একজন frontend engineer। ওই বইগুলোর
তুলনায় এই বই আসলে এই একটি সুবিধাই দাবি করে।

## বইটা কীভাবে তৈরি হয়

পুরো manuscript খোলাখুলি রাখা হয় markdown অধ্যায়ের একটি repository হিসেবে। ছোট TypeScript toolchain
সেটা থেকে PDF আর EPUB বানায়। Ship হওয়ার আগে প্রতিটি অধ্যায় একটি লিখিত standard-এর সঙ্গে মিলিয়ে দেখা হয়: ছয়টি
block, code শুধু TypeScript-এ, 150–400 line, আর এমন cross-reference যা web-এ যেমন কাজ করে, ছাপা বইয়েও তেমনই
ঠিক জায়গায় পৌঁছায়।

## এরপর কী পড়বেন

- [Chapter ?? — ভূমিকা](#ch-preface) — বইয়ে কী আছে, আর পড়ার তিনটি উপায়
- [Chapter ?? — আরও পড়ার জন্য](#ch-further-reading) — এরপর কোথায় যাবেন
