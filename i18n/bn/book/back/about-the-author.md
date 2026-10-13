---
sourceHash: "83eda17e7a186dd4d25899851bcb708a6eeb9b461360fb7b892eb2e1bbbf4f14"
title: "লেখক পরিচিতি"
translatedAt: "2026-10-13T03:12:55.730Z"
model: "claude-opus-5-5 (Claude Code)"
---

# লেখক পরিচিতি {#ch-about-the-author}

> কে লিখেছেন, তিনি আসলে কী তৈরি করেন, আর বইটি কেন এই রূপ পেয়েছে।

**এই অধ্যায়ে:** পটভূমি · প্রতিদিনের stack · বইটি কেন frontend-heavy · যোগাযোগ

## 💡 মূল ধারণা

**Salman Rahman** নয় বছরের অভিজ্ঞতাসম্পন্ন একজন senior frontend engineer। প্রতিদিনের কাজ SvelteKit, Svelte 5
runes আর TypeScript-এ, পাশে একটি Sanity studio। আর বাকি সবকিছুতে React, Next.js, Node.js, Express আর GraphQL।
এই বইকে যে বিশেষ দক্ষতাগুলো রূপ দিয়েছে, সেগুলো হলো enterprise-scale architecture, WCAG accessibility, web
performance আর state management।

এই পটভূমির কারণেই দুটি সিদ্ধান্ত পাঠকের চোখে পড়বে।

**বইটি কেন frontend-heavy।** বইটি লেখা হয়েছে সেই role-এর জন্য, যেটা লেখক নিজে করেন। এমন একজন, যিনি frontend-এর
পুরোটার দায়িত্ব নেন। তাঁর কাছে আশা করা হয়, backend-এ, system design round-এ, আর এখন AI feature-এও তিনি
বিশ্বাসযোগ্য হবেন। কিন্তু এর কোনোটিরই specialist হওয়ার ভান না করে। Part V-এর পরিধি ঠিক হয়েছে একটি প্রশ্ন দিয়ে:
*এই engineer-কে আসলে কী জিজ্ঞেস করা হয়, আর তিনি আসলে কী তৈরি করেন*। একটি backend curriculum কী কভার করত,
তা দিয়ে নয়।

**তিনটি framework-এর একটি কেন Svelte।** সংখ্যার হিসাবেই Svelte জায়গাটা পায়। বছরের পর বছর developer-satisfaction
survey-তে Svelte শীর্ষে বা তার কাছাকাছি থেকেছে। কিন্তু বইতে এটা আছে কারণ এটা লেখকের প্রতিদিনের stack। ওই অংশটাই
এই বইয়ের সবচেয়ে হাতে-কলমে লেখা অংশ। যে framework দিয়ে আপনি সোমবারে ship করেন, তাকে নিয়ে লেখা আর যেটার শুধু
docs পড়েছেন, তাকে নিয়ে লেখা — দুটি পড়তে আলাদা লাগে।

AI UX অধ্যায়গুলোও একই কারণে আছে, শুধু উল্টো দিক থেকে। AI engineering-এর বই লেখেন backend আর machine-learning-এর
মানুষেরা। তাই interface layer — latency, generative UI, citation আর trust, model refuse করলে বা time out হলে
unhappy path — সবসময় তাঁদের সবচেয়ে দুর্বল অধ্যায়। এখানে সেটা লিখেছেন একজন frontend engineer। তাঁদের তুলনায় এই বই
শুধু এই একটি সত্যিকারের সুবিধাই দাবি করে।

## এই বই কীভাবে তৈরি হয়

Manuscript-টি খোলাখুলিভাবে রাখা হয়, markdown অধ্যায়ের একটি repository হিসেবে। একটি ছোট TypeScript toolchain সেটা
থেকে PDF আর EPUB build করে। Ship করার আগে প্রতিটি অধ্যায় একটি লিখিত standard-এর সঙ্গে মিলিয়ে দেখা হয়: ছয়টি
block, শুধু TypeScript code, 150–400 line, আর এমন cross-reference যা web-এর মতো print-এও ঠিকঠাক resolve হয়।

## এরপর কী পড়বেন

- [Chapter ?? — ভূমিকা](#ch-preface) — বইটি কী কভার করে, আর এটা পড়ার তিনটি উপায়
- [Chapter ?? — আরও পড়ার জন্য](#ch-further-reading) — এরপর কোথায় যাবেন
