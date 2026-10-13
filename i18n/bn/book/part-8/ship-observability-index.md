---
sourceHash: "dd3c12a41da62543cc5ccb7b8b9282e3641f43838d592e1dd51d06ad989f6248"
title: "Observability"
translatedAt: "2026-10-12T07:42:38.815Z"
model: "claude-opus-5-5 (Claude Code)"
---

# Observability

Monitoring সেই প্রশ্নগুলোর উত্তর দেয়, যেগুলো আপনি আগে থেকেই ভেবে রেখেছিলেন। Observability হলো রাত দুটায়, যে
প্রশ্নটা আপনি কখনো ভাবেননি, সেটার উত্তর আপনি ইতিমধ্যে সংগ্রহ করা data থেকেই দিতে পারেন কি না। এই পার্থক্যটাই
পুরো section-এর বিষয়। আপনি কোনো system সত্যিই চালিয়েছেন, নাকি শুধু বানিয়েছেন — interviewer সবচেয়ে দ্রুত এটা
ধরতে পারেন এখান থেকেই।

## অধ্যায়গুলো

| #  | অধ্যায়                                                                    | কোন প্রশ্নের উত্তর দেয়                                          |
| -- | ------------------------------------------------------------------------- | -------------------------------------------------------------- |
| 01 | [Monitoring ও Observability-র মূল কথা](#ch-monitoring-fundamentals)       | কী মাপবেন, আর একটি SLO আপনাকে কীসের প্রতিশ্রুতিতে বাঁধে?          |
| 02 | [Metrics, Dashboard ও Alerting](#ch-metrics-and-dashboards)               | Metrics কীভাবে query করবেন, আর কোন alert-এর জন্য একজন মানুষকে ঘুম থেকে তোলা উচিত? |

## Interviewer-রা যা যাচাই করেন

Part VIII-এর শুরুর অধ্যায়ের part-স্তরের সংকেতগুলোর ওপর, observability নিয়ে তিনটি প্রশ্ন:

- **Average নয়, percentile কেন?** 200 ms-এর একটি average নয় সেকেন্ডের একটি p99-কে লুকিয়ে রাখতে পারে। বিভিন্ন
  instance-এর percentile গড় করা যায় না। আগে histogram-এর bucket-গুলো যোগ করুন, তারপর quantile বের করুন।
- **Cardinality কী?** Time series-এর সংখ্যা হলো প্রতিটি label-এর আলাদা আলাদা মানের গুণফল। একটি label-এ user ID
  রাখলেই একটি metrics backend-এর memory ফুরিয়ে যায়।
- **CPU বেশি হলে কি alert দেবেন?** না। ব্যবহারকারী যে লক্ষণ দেখতে পান, তার ওপর page করুন। আর resource metrics
  dashboard-এ রাখুন, সমস্যা খুঁজে বের করার জন্য।

## পড়ার ক্রম

সবসময় আগে 01 পড়ুন। অধ্যায় 02 এর শব্দগুলোই ব্যবহার করে, বিশেষ করে cardinality আর error budget।
