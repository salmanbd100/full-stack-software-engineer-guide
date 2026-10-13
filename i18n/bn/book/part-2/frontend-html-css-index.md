---
sourceHash: "eb56d04899b1e08fcb1084a43ea44d78e712cfea96b6476738fed54dbcf40c8f"
title: "Part II — HTML ও CSS"
translatedAt: "2026-10-12T07:52:13.189Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part II — HTML ও CSS

এটা সেই platform-এর স্তর, যার ওপর প্রতিটি framework বসে আছে। যে engineer-রা এটা বাদ দিয়ে গেছেন, তাঁরা
interview-তে একটি সীমায় আটকে যান। প্রশ্ন যখনই state ছেড়ে document নিয়ে হতে শুরু করে, তখনই সেটা ধরা পড়ে।
Focus ring হারিয়ে গেল কেন? Modal কেন একটি screen reader-কে আটকে রাখে? Cascade কেন এমন rule বেছে নিল, যেটা
আপনি আশা করেননি? এই section markup আর styling-কে syntax হিসেবে দেখে না। দেখে পরিণতি আছে এমন engineering
সিদ্ধান্ত হিসেবে।

এটা ইচ্ছা করেই ছোট। Interviewer-রা ধরে নেন একজন সিনিয়র candidate layout-এর mechanics জানেন: box model,
flexbox, grid, breakpoint আর keyframe। এগুলো মুখস্থ বলতে তাঁরা প্রায় কখনোই বলেন না। তাঁরা যাচাই করেন সেই অংশগুলো,
যেগুলোর আইনি বা architecture-গত পরিণতি আছে। আপনি কোন element বেছে নিলেন? Mouse ছাড়া page কাজ করে কি? 2023-এর
পর আসা কোন feature-গুলো এমন workaround-এর জায়গা নিয়েছে, যেটা আপনি এখনো বয়ে বেড়াচ্ছেন?

**Accessibility আগে এখানে তৃতীয় অধ্যায় ছিল, এখন সেটা নিজেই একটি section**, পাঁচটি অধ্যায় নিয়ে,
[Part II — Accessibility](#ch-frontend-accessibility-index)-এ। যে কারণে এটা পড়া দরকার, সেই কারণেই এটা এই section
ছাড়িয়ে বড় হয়ে গেছে। European Accessibility Act জুন 2025 থেকে কার্যকর হয়েছে। তাই accessibility এখন একটি নির্দিষ্ট
standard-সহ আইনি বাধ্যবাধকতা। আর internationalisation-এর সঙ্গে এটা সেই দুটি topic-এর একটি, যেগুলো frontend
round-এ সবচেয়ে নির্ভরযোগ্যভাবে একজন সিনিয়র candidate-কে একজন mid-level candidate থেকে আলাদা করে।

## অধ্যায়গুলো

| #  | অধ্যায়                                        | কোন প্রশ্নের উত্তর দেয়                                                |
| -- | ---------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Semantic HTML](#ch-semantic-html)             | কোন element, আর সেটা বেছে নিলে বিনামূল্যে কী পান?        |
| 02 | [Advanced CSS](#ch-advanced-css)               | 2023-এর পর কী এসেছে, আর প্রতিটি feature কীসের জায়গা নিয়েছে?    |
| 03 | [Container Query ও Cascade Layer](#ch-container-queries-and-layers) | একটি component তার slot অনুযায়ী কীভাবে বদলায়, আর conflict-এ কে জেতে? |
| 04 | [Animation ও View Transition](#ch-animation-and-view-transitions) | কোন property animate করা বিনামূল্যে, আর দুটি state কে ধরে রাখে? |

## Interviewer-রা যা যাচাই করেন

এই part-এর সিনিয়র সংকেত হলো **library-র আগে platform-এর দিকে হাত বাড়ানো।** একটি round-এ সেটা এভাবে
দেখা যায়:

- **Accessibility কি গঠনের অংশ, নাকি পরে জুড়ে দেওয়া?** যে candidate প্রথমেই `role` আর `aria-label`-এর
  দিকে হাত বাড়ান, তিনি খারাপ উত্তর দিয়েছেন। ঠিক প্রথম পদক্ষেপ হলো এমন element বেছে নেওয়া, যার semantics আগে
  থেকেই আছে। এই যুক্তির বাকিটা আছে [Chapter ?? — ARIA, আর কখন এটা ব্যবহার করবেন না](#ch-aria)-এ।
- **Cascade কি এতটা ভালো জানেন যে debug করতে পারবেন?** মানে specificity, inheritance আর cascade layer।
  এর মানে এটাও জানা যে, একটি utility class-এ `!important` কেন একটি design সিদ্ধান্ত, hack নয়। পরীক্ষাটা হলো
  ভুলভাবে style হওয়া কোনো কিছুর একটি screenshot, আর প্রশ্ন "কেন?"
- **আপনি কি সময়ের সঙ্গে তাল রেখেছেন?** Container query, `:has()`, cascade layer, subgrid আর `oklch()` —
  প্রতিটি একটি করে workaround-এর জায়গা নিয়েছে। কোন workaround-এর জায়গা নিয়েছে, সেটার নাম বলাই নম্বর পাওয়া
  উত্তর।
- **কীসে layout trigger হয়, বোঝেন?** `width` animate করা আর `transform` animate করা দেখতে একই রকম, কিন্তু
  খরচ একেবারে আলাদা। Part IV-এর performance-এর বিষয়বস্তু এখান থেকেই শুরু।

**একই প্রশ্নে mid আর সিনিয়র:**

| প্রশ্ন | Mid উত্তর | সিনিয়র উত্তর |
| ----- | ---------- | ------------- |
| "এটাকে accessible করুন" | `role` আর `aria-label` যোগ করেন | যার semantics আগে থেকেই আছে সেই element বেছে নেন, আর ARIA যোগ করেন শুধু সেটুকুর জন্য যা HTML প্রকাশ করতে পারে না |
| "এটা ভুলভাবে style হচ্ছে কেন?" | "আমি `!important` দিয়ে দেব" | প্রথমে specificity, তারপর inheritance, তারপর কোন cascade layer জিতেছে — আর `!important` একটি ঘোষিত design সিদ্ধান্ত হিসেবে |
| "এই animation আটকে আটকে চলছে কেন?" | "এতে `will-change` লাগবে" | `width` animate করলে প্রতিটি frame-এ layout হতে বাধ্য হয়; `transform` সেটা ছাড়াই composite হয় |

## পড়ার ক্রম

শুরু থেকে শেষ পর্যন্ত পড়ুন। প্রতিটি অধ্যায় স্বাধীন, আগে কিছু না পড়েও বোঝা যায়। তারপর
[Part II — Accessibility](#ch-frontend-accessibility-index)-এ যান। এই section-এর document-এর অর্ধেকটা সেখানে
চলতে থাকে, আর সিনিয়র interview-এর জন্য সেটাই বেশি মূল্যবান।

**Interview sprint:** 01, তারপর accessibility section। Framework-এ যাওয়ার আগে একটি frontend loop document নিয়ে
যা জিজ্ঞেস করে, তার বেশিরভাগই semantics আর accessibility-তে আছে। Role-এ CSS-এর নাম স্পষ্টভাবে থাকলে তবেই
অধ্যায় 02-এ এক ঘণ্টা দেওয়া সার্থক।
