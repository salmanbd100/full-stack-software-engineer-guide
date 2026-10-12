---
sourceHash: "1739a3bdc7f374ae49f63fe44346d75b914bf7be49364e30fe739ef610777433"
title: "Part VI — System Design-এর মূল কথা"
translatedAt: "2026-10-12T12:23:11.455Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part VI — System Design-এর মূল কথা

Part VI-এর বাকি সবকিছু এই section-টি ধরে নিয়ে এগোয়। এতে আছে সেই ধারণাগুলো, যেগুলোতে একটি design round বারবার ফিরে
আসে, আপনাকে যা-ই বানাতে বলা হোক। পঁয়তাল্লিশ মিনিট কীভাবে চালাবেন? মাথার ভেতরে একটি system-এর আকার কীভাবে আন্দাজ
করবেন? Scaling-এর দাম কী, আর সময়টা কোথায় যায়? Availability কী এনে দেয়, আর আপনার data-র copy-গুলো একমত না হলে আপনি
কী ছেড়ে দেন?

অধ্যায় 01 দুবার পড়ার মতো। একটি design round যতটা technical অনুশীলন, ততটাই একটি পারফরম্যান্স। এর framework-ই একজন
দক্ষ engineer-কে এলোমেলো কথা বলা থেকে থামায়।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [Design Round চালানো, Backend ও Frontend](#ch-driving-the-round) | Round যে ধরনেরই হোক, পঁয়তাল্লিশ মিনিট কীভাবে চালাবেন? |
| 02 | [Back-of-Envelope Estimation](#ch-back-of-envelope-estimation) | কেউ বানানোর আগে, মোটামুটি এটা কত বড়? |
| 03 | [Scalability, Latency ও Throughput](#ch-scalability) | এই bottleneck-এর জন্য কোন lever লাগবে, আর সময়টা কোথায় যায়? |
| 04 | [Reliability, Consistency ও CAP](#ch-consistency-and-cap) | "Three nines" কী এনে দেয়, আর কোন read পুরনো হতে পারে? |

## Interviewer-রা যা যাচাই করেন

Part VI-এর senior সংকেত হলো **round-টি নিজে চালানো — requirement স্পষ্ট করা, assumption বলা, tradeoff-এর পক্ষে
যুক্তি দেওয়া।** ওই চারটির তিনটিই ঠিক হয় Fundamentals-এ:

- **Design করার আগে কি আপনি প্রশ্ন করে স্পষ্ট করেন?** প্রথম পাঁচ মিনিটে এটাই সবচেয়ে জোরালো সংকেত। Read/write
  ratio, scale, latency budget আর consistency-র প্রয়োজন জিজ্ঞেস করুন। যে candidate সাথে সাথে আঁকতে শুরু করেন, তিনি
  এমন নম্বর হারিয়ে ফেলেছেন, যা ফিরে পাওয়া কঠিন।
- **আপনি কি জোরে বলে estimate করতে পারেন?** নিখুঁতভাবে নয়, কিন্তু বিশ্বাসযোগ্যভাবে, আর হিসাবটা দেখিয়ে। "দশ লাখ
  daily user, প্রত্যেকে দশটি action, তাই গড়ে মোটামুটি সেকেন্ডে একশো write, আর peak-এ তিনশো" — হিসাব ছাড়া একটি সঠিক
  সংখ্যার চেয়ে এর দাম বেশি।
- **আপনি কি tradeoff-এর নাম বলেন, নাকি শুধু বাছাইটা?** Design round-এর প্রতিটি উত্তরই একটি লেনদেন। আপনি কী ছেড়ে
  দিলেন, সেটা বলাই একটি senior উত্তরকে একটি শুধু আত্মবিশ্বাসী উত্তর থেকে আলাদা করে।
- **CAP কি একটি slogan, নাকি একটি tool?** মুখস্থ "CP or AP" আওড়ানো খারাপ শোনায়। Whiteboard-এর system-এ এটা
  প্রয়োগ করা, একবারে একটি feature ধরে, ভালো শোনায়।

## পড়ার ক্রম

01 আর 02 হলো interview-এর কারিগরি দিক। Round-এর আগের দিন এগুলো আবার দেখুন। 03 optimisation ধাপের শব্দভান্ডার তৈরি
করে। 04 সবচেয়ে কঠিন, আর সবচেয়ে বেশি পরীক্ষা করা হয়। এটা এক বসায় পড়ুন।

**Interview sprint:** আগে 01 → 02, তারপর 03 আর 04।
