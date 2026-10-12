---
sourceHash: "e112f7809e490ba5f59dd82b1be187108f569208fc30f5197ff7169a42a43d5d"
title: "Part IV — Frontend Security"
translatedAt: "2026-10-12T12:14:53.977Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — Frontend Security

এটা বইয়ের security মেরুদণ্ডের browser-এর অর্ধেক। দুটি অধ্যায়ে আছে সেই attack-গুলো, যেগুলো একজন user-এর browser-এ
আপনার origin-এর বিরুদ্ধে চলে, আর platform-এর সেই feature-গুলো, যেগুলো এদের থামায়। Server-এর অর্ধেক (token, session,
authorisation, transport, database-এ injection) আছে [Part V — Backend Security](#ch-backend-security-index)-এ।

মূল ধারণা: browser security হলো একটি নির্দিষ্ট ক্রমে সাজানো defence in depth। Output encoding বেশিরভাগ cross-site
scripting থামায়। Encoding কোনোটা ফসকে গেলে Content Security Policy (CSP) আপনাকে বাঁচায়। Security header কেউ চেষ্টা
করার আগেই পুরো এক ধরনের attack বন্ধ করে দেয়। যে candidate শুধু একটি layer-এর নাম বলেন, তিনি আসলে একটি single point of
failure বর্ণনা করেছেন।

## অধ্যায়গুলো

| #  | অধ্যায় | যে প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) | আপনার framework ঠিক কোথায় আপনাকে রক্ষা করা বন্ধ করে, আর কোন input কখনো server-এ পৌঁছায় না? |
| 02 | [Content Security Policy ও Security Header](#ch-content-security-policy) | এমন policy কীভাবে লিখবেন, যেটা একটি সফল injection-এর পরেও টিকে থাকে, আর বাকিটা কোন header বন্ধ করে? |

## Interviewer-রা যা যাচাই করেন

Security-তে "boundary" শব্দটা আক্ষরিক। প্রতিটি প্রশ্নই একটি trust boundary নিয়ে:

- **আপনি কি context অনুযায়ী XSS ব্যাখ্যা করতে পারেন?** HTML text, একটি attribute, একটি URL আর একটি script block —
  প্রতিটির আলাদা encoding লাগে। "আমি input escape করি" একটি mid-level উত্তর। Senior উত্তর output-এর জায়গায় encode করে,
  যে context-এ লিখছেন সেই context-এর জন্য।
- **আপনি কি জানেন React-এর সুরক্ষা কোথায় শেষ হয়?** JSX text children escape করে। এটা
  `dangerouslySetInnerHTML`, `href`, `style`, বা third-party widget-এর render করা কিছুই escape করে না। জিজ্ঞেস করার
  আগেই এগুলোর নাম বলা একটি শক্তিশালী signal।
- **আপনি কি site না ভেঙে একটি CSP roll out করতে পারেন?** প্রথমে `Content-Security-Policy-Report-Only`, violation
  সংগ্রহ করুন, তারপর enforce করুন। যে candidate সত্যিই একটি ship করেছেন, তিনি সবসময় এটা বলেন।
- **কোন input কখনো আপনার server-এ পৌঁছায় না?** একটি `postMessage` payload, `location.hash` থেকে পড়া একটি value,
  একটি `?next=` redirect target। Review করার মতো কোনো server handler নেই, তাই check থাকতে পারে একমাত্র browser-এই।
  অধ্যায় 01 এই পার্থক্য দিয়েই শেষ হয়।

## পড়ার ক্রম

আগে 01 পড়ুন। এতে আছে attack, আর trust boundary-র input-এর দিক। 02 হলো header layer, আর সেই layer কীসের বিরুদ্ধে
রক্ষা করে তা জানার পর এটা সবচেয়ে ভালো বোঝা যায়।

**Interview sprint:** 01 → 02। প্রায় প্রতিটি senior frontend loop-এ cross-site scripting, CSP আর header set নিয়ে নাম
ধরে প্রশ্ন আসে। CSRF (cross-site request forgery)-ও ঠিক ততবারই আসে। এর উত্তর আছে
[Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)-এ, কারণ এর defence server-এ configure করা হয়।
