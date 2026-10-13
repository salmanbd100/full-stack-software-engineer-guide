---
sourceHash: "7255668e8d88352d44611a3bbb3e71b173a0542aa98648b4add6627dc2e716d4"
title: "Part II — Accessibility"
translatedAt: "2026-10-12T12:10:10.777Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — Accessibility

এমন একটি বিষয় নিয়ে পাঁচটি অধ্যায়, যার অবস্থান June 2025-এ বদলে গেছে। সেই মাসে European Accessibility Act
বলবৎযোগ্য হয়। Accessibility আর এমন কোনো quality-র যুক্তি রইল না, যেটা একজন product manager পিছিয়ে দিতে পারেন।
এটা হয়ে গেল একটি requirement, যার আছে একটি নির্দিষ্ট standard, একটি conformance level আর একটি audit। EU-তে বিক্রি
হওয়া যেকোনো কিছুতে কাজ করা একজন senior engineer-এর জন্য, এটা সেই দুটি বিষয়ের একটি, যেখানে খুঁটিনাটি জানা আরেকটি
framework জানার চেয়ে বেশি মূল্যবান। অন্যটি হলো internationalisation।

পুরো section একটি দাবির ওপর দাঁড়িয়ে: **accessibility-র বেশিরভাগ কাজ হলো সঠিক element বেছে নেওয়া আর focus কোথায় যাবে
তা ঠিক করা।** ARIA হলো ছোট অবশিষ্ট অংশটুকু, আর আইনের কারণেই সবাই প্রশ্নটা তুলছে। আপনি ঠিক করেছেন কি না, তা জানতে
CI-তে axe gate আর দুটি manual pass ব্যবহার করেন। সেগুলো আছে
[Chapter ?? — Accessibility Testing](#ch-testing-accessibility)-এ, Part IV-এর বাকি testing-এর সঙ্গে।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                    | কোন প্রশ্নের উত্তর দেয়                                                     |
| -- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 01 | [Accessibility কেন, আর আইন কী বলে](#ch-accessibility-and-the-law)            | কোন নিয়ম খাটে, সেগুলো কোন level চায়, আর একটি design-কে কোন সংখ্যাগুলো ছুঁতে হবে? |
| 02 | [Accessibility Tree](#ch-accessibility-tree)                           | একটি screen reader আসলে কী পড়ে, আর একটি নাম কীভাবে হিসাব করা হয়? |
| 03 | [ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)                                   | কখন একটি attribute-ই উত্তর, আর কখন সেটা পরিস্থিতি আরও খারাপ করছে? |
| 04 | [Keyboard ও Focus Management](#ch-keyboard-and-focus)                     | পুরো product কি mouse ছাড়া ব্যবহার করা যায়, আর একটি action-এর পর focus কোথায় যায়? |
| 05 | [Accessible Form ও Error Message](#ch-accessible-forms)                | যে user form দেখতে পান না, তিনি কীভাবে জানবেন কী ভুল হয়েছে?        |

## Interviewer-রা যা যাচাই করেন

এই part-এর senior সংকেত হলো **মেরামতি নয়, কাঠামোগত চিন্তা — attribute নয়, element-এর দিকে হাত বাড়ানো।**

- **Accessibility কি একটি সিদ্ধান্ত, নাকি একটি fix?** যে candidate একটি custom dropdown-এর প্রশ্নের উত্তর দেন
  `role` আর `aria-label` দিয়ে, তিনি ভুল জায়গা থেকে শুরু করেছেন। প্রথম পদক্ষেপ হলো জিজ্ঞেস করা, একটি `<select>`
  দিয়ে কাজ চলবে কি না। দ্বিতীয়টি হলো নিজে একটি keyboard model আবিষ্কার না করে APG pattern-এর (W3C-র ARIA
  Authoring Practices Guide) নাম বলা।
- **আপনি কি জানেন target কী?** WCAG 2.2 AA। European Accessibility Act, Web Accessibility Directive, ADA Title II
  আর Section 508 — সবাই এই level-এর নামই বলে। "আমরা best practice মেনে চলি" এমন কোনো উত্তর নয়, যেটা একটি
  procurement review মেনে নেয়।
- **Focus কোথায় যায়?** প্রশ্নটা করুন একটি dialog বন্ধ হওয়া, একটি row delete হওয়া, একটি ব্যর্থ submit বা একটি
  client-side route change নিয়ে। চারটি উত্তর, আর বেশিরভাগ candidate এর একটি নিয়েই ভেবেছেন।
- **কী automate করা যায় না?** প্রথমে সীমাটা বলুন: automated rule এক-তৃতীয়াংশ থেকে অর্ধেক criteria ধরে। তারপর
  দুটি manual pass-এর নাম বলুন। এটাই আলাদা করে দেয়, কে একটি accessible product ship করেছেন, আর কে শুধু axe
  install করেছেন।
- **আপনি কি এর খরচ হিসাব করতে পারেন?** একটি custom combobox মানে এক সপ্তাহের কাজ আর একটি স্থায়ী maintenance খরচ।
  Estimate-এ সেটা বলা একটি senior অবদান। Sprint-এর মাঝে সেটা আবিষ্কার করা নয়।

## পড়ার ক্রম

আগে 01 পড়ুন, কারণ এটা সেই target ঠিক করে, যার সঙ্গে অন্য প্রতিটি অধ্যায় মাপা হয়। তারপর 02 পড়ুন, সেই mental model
যার ওপর বাকি সব নির্ভর করে। Tree না পড়ে আপনি একটি announcement debug করতে পারবেন না। তারপর 04 আর 05, যেখানে
প্রতিদিনের কাজের বেশিরভাগটা। 03 ইচ্ছা করেই 02-এর পরে রাখা: ARIA তখনই অর্থবহ হয়, যখন আপনি জানেন এটা কোথায় লেখে।

**Interview sprint:** 01, 04 আর 03-এর interview-এর প্রশ্নগুলো। আইনি কাঠামো, focus-এর সিদ্ধান্ত আর ARIA-র প্রথম
নিয়ম — এগুলো একটি frontend loop-এ জিজ্ঞেস করা বেশিরভাগ বিষয় ঢেকে দেয়। "কী automate করা যায় না?" হলো সেই follow-up
প্রশ্ন, যেটা সাধারণত উত্তরের ফল ঠিক করে দেয়, আর Part IV-এর testing অধ্যায় এর উত্তর দেয়।
