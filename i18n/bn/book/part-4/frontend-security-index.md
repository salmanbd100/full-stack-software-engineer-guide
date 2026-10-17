---
sourceHash: "e112f7809e490ba5f59dd82b1be187108f569208fc30f5197ff7169a42a43d5d"
title: "Part IV — Frontend Security"
translatedAt: "2026-10-17T14:00:08.260Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Part IV — Frontend Security

বইয়ের security অংশের browser-এর দিকটা এখানে। দুটি অধ্যায়ে আছে সেই attack-গুলো, যেগুলো user-এর browser-এ বসে
আপনার origin-এর বিরুদ্ধে চলে, আর platform-এর সেই feature-গুলো, যেগুলো এদের থামায়। Server-এর দিকটা (token,
session, authorisation, transport, database-এ injection) আছে
[Part V — Backend Security](#ch-backend-security-index)-এ।

মূল কথা হলো, browser security মানে কয়েক স্তরের প্রতিরক্ষা, আর স্তরগুলোর একটি নির্দিষ্ট ক্রম আছে। Output encoding
বেশিরভাগ cross-site scripting থামায়। Encoding কোথাও ফসকে গেলে বাঁচায় Content Security Policy (CSP)। আর
security header কেউ চেষ্টা করার আগেই পুরো এক এক ধরনের attack-এর পথ বন্ধ করে দেয়। যে candidate শুধু একটি স্তরের
কথা বলেন, তিনি আসলে একটি single point of failure বর্ণনা করলেন।

## অধ্যায়গুলো

| #  | অধ্যায় | কোন প্রশ্নের উত্তর দেয় |
| -- | ------- | --------------- |
| 01 | [XSS প্রতিরোধ ও অবিশ্বস্ত Input](#ch-xss-prevention) | আপনার framework ঠিক কোথায় গিয়ে আপনাকে আর রক্ষা করে না, আর কোন input কখনো server পর্যন্ত পৌঁছায় না? |
| 02 | [Content Security Policy ও Security Header](#ch-content-security-policy) | কীভাবে এমন policy লিখবেন, যা injection সফল হলেও টিকে থাকে, আর বাকি পথ কোন header বন্ধ করে? |

## Interviewer-রা যা যাচাই করেন

Security-তে "boundary" শব্দটা আক্ষরিক অর্থেই। প্রতিটি প্রশ্ন আসলে একটি trust boundary নিয়ে:

- **Context ধরে XSS বোঝাতে পারেন?** HTML text, attribute, URL আর script block, প্রতিটির জন্য আলাদা encoding লাগে।
  "আমি input escape করি" হলো mid-level-এর উত্তর। Senior-এর উত্তর হলো, output-এর জায়গায় encode করা, আর যে context-এ
  লিখছেন, সেই context-এর মতো করে।
- **React-এর সুরক্ষা কোথায় শেষ হয়, জানেন?** JSX text children escape করে। কিন্তু
  `dangerouslySetInnerHTML`, `href`, `style`, বা third-party widget-এর render করা কিছুই escape করে না। জিজ্ঞেস করার
  আগেই এগুলোর নাম বলতে পারলে সেটা শক্ত signal।
- **Site না ভেঙে CSP চালু করতে পারেন?** আগে `Content-Security-Policy-Report-Only`, তারপর violation সংগ্রহ, তারপর
  enforce। যিনি সত্যিই একটি CSP ship করেছেন, তিনি সবসময় এটা বলেন।
- **কোন input কখনো আপনার server-এ পৌঁছায় না?** `postMessage`-এর payload, `location.hash` থেকে পড়া value,
  `?next=` redirect-এর target। Review করার মতো কোনো server handler নেই, তাই check রাখার একমাত্র জায়গা browser।
  অধ্যায় 01 শেষ হয় এই পার্থক্য দিয়েই।

## পড়ার ক্রম

আগে 01 পড়ুন। এতে আছে attack, আর trust boundary-র input-এর দিকটা। 02 হলো header-এর স্তর। সেই স্তর কীসের বিরুদ্ধে
রক্ষা করে, তা জানা থাকলে 02 পড়তে সবচেয়ে ভালো লাগে।

**Interview sprint:** 01 → 02। প্রায় প্রতিটি senior frontend loop-এ cross-site scripting, CSP আর header-গুলোর নাম
ধরে প্রশ্ন আসে। CSRF (cross-site request forgery)-ও প্রায় ততবারই আসে। তার উত্তর আছে
[Chapter ?? — Credential, Session, CORS ও CSRF](#ch-credentials-and-sessions)-এ, কারণ এর প্রতিরক্ষা configure করা হয় server-এ।
